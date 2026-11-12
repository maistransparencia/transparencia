#!/usr/bin/env bash
# PreToolUse (Bash): bloqueia comandos que podem apagar o banco de desenvolvimento (5544,
# volume em docker/volumes) ou mexer num banco remoto. Vale para sessões interativas e para o
# bmad-loop. Saída 2 bloqueia o comando e devolve o motivo ao agente.
set -euo pipefail

comando="$(jq -r '.tool_input.command // empty')"
[ -z "$comando" ] && exit 0

bloquear() {
  echo "guard-database: bloqueado. $1 Peça ao usuário para rodar o comando, se for mesmo necessário." >&2
  exit 2
}

contem() { grep -qiE -- "$1" <<<"$comando"; }

# 1. Qualquer URL de Postgres com host que não seja local: produção ou banco remoto.
hosts="$(grep -oiE 'postgres(ql)?(\+[a-z0-9]+)?://[^@[:space:]/]*@\[?[^]:/[:space:]?]+' <<<"$comando" | sed -E 's/.*@\[?//' || true)"
while IFS= read -r host; do
  case "$host" in
    "" | localhost | 127.0.0.1 | ::1) ;;
    *) bloquear "O comando aponta para o banco remoto \"$host\"." ;;
  esac
done <<<"$hosts"
if contem '(PGHOST|DBT_HOST)=' && ! contem '(PGHOST|DBT_HOST)=["'\'']?(localhost|127\.0\.0\.1)'; then
  bloquear "O comando define um host de banco que não é local."
fi
if contem '(--target|-t)[= ]+prod'; then
  bloquear "O comando usa o alvo de produção do dbt."
fi

# 2. Apagar o volume do banco de desenvolvimento ou o próprio banco.
if contem 'docker[- ]compose[^;&|]*down[^;&|]*(-v\b|--volumes)' \
  || contem 'docker[^;&|]*volume[^;&|]*(rm|prune)' \
  || contem 'docker[^;&|]*system[^;&|]*prune[^;&|]*--volumes' \
  || contem 'docker[^;&|]*(rm|kill|stop)[^;&|]*transparencia_postgres([^_]|$)' \
  || contem 'rm[^;&|]*docker/volumes' \
  || contem 'git[^;&|]*clean[^;&|]*-[a-zA-Z]*[xX]' \
  || contem '(^|[^a-z_])dropdb([^a-z_]|$)'; then
  bloquear "O comando pode apagar o banco de desenvolvimento (contêiner transparencia_postgres ou docker/volumes)."
fi

# 3. SQL destrutivo por psql fora do banco de teste (porta 5545 / transparencia_postgres_test).
if contem '(psql|pg_restore)' \
  && contem '(DROP[[:space:]]+(SCHEMA|TABLE|DATABASE|OWNED)|TRUNCATE|DELETE[[:space:]]+FROM|--clean)' \
  && ! contem '(5545|transparencia_postgres_test)'; then
  bloquear "SQL destrutivo fora do banco de teste (5545)."
fi

# 4. Extração e carga gravam no raw do banco de desenvolvimento; só o usuário roda.
if contem 'make[^;&|]*(elt/extract|elt/load|pipeline|db/restore)'; then
  bloquear "Extração e carga de dados raw só rodam pelo usuário."
fi

exit 0
