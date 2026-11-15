# Roteiro de produção: Story 26.6 (Fiorilli em `raw_fiorilli`)

Só executar com autorização explícita do Julio (Regra 15). Tudo abaixo roda contra o banco de produção; cada passo só começa quando o anterior fecha. `$PROD_URL` é a URL de escrita de produção.

## 0. Pausar as cargas

- Desligar `INGESTION_SCHEDULE_ENABLED` (variável do repositório) para o cron não disparar.
- Não rodar carga manual (nem CSV de receitas) até o passo 7.
- Motivo: a migração usa `ON CONFLICT DO NOTHING`; linha nova gravada em `raw_<portal>` depois dela faz a conferência de hash abortar numa nova execução.

## 1. Backup do raw

```bash
pg_dump "$PROD_URL" -Fc -n 'raw*' -f raw-prod-$(date +%Y%m%d-%H%M%S).dump
ls -lh raw-prod-*.dump
```

## 2. Foto dos marts (antes)

```bash
psql "$PROD_URL" -AtF'|' -f docs/producao-26-6-conferencia-marts.sql > antes.txt
wc -l antes.txt
```

## 3. Migração (aditiva)

```bash
psql "$PROD_URL" -v ON_ERROR_STOP=1 -f elt/scripts/migrate_fiorilli_tabelas_para_raw_fiorilli.sql 2>&1 | grep -E "conferidas|ERROR|COMMIT"
```

- Esperado: uma linha `<portal> / <tabela>: N linhas conferidas` por portal e tabela (15 tabelas) e `COMMIT`.
- Qualquer `ERROR` (inclusive `Paridade falhou`) faz a transação voltar; nada é gravado. Parar e avisar.
- Rodar uma segunda vez deve repetir as mesmas contagens, sem erro.

Contagem extra, para anotar:

```bash
psql "$PROD_URL" -Atc "select 'despesas_gerais', portal_slug, count(*) from raw_fiorilli.despesas_gerais group by 2 order by 2"
```

## 4. Deploy do código

- Merge da branch `feature/epic26-story-26-6` e deploy.
- Depois do deploy, o código novo lê `raw_fiorilli`; o código antigo continua lendo `raw_<portal>` (intacto).

## 5. Seed e dbt

```bash
export DATABASE_URL="$PROD_URL"
make dbt/seed SELECT=seed_fiorilli_pessoal_empresa
make dbt/run
make dbt/test SELECT="stg_fiorilli__*"
```

O seed precisa rodar antes do `dbt run`: o staging de pessoal depende dele.

## 6. Conferência dos marts (depois)

```bash
psql "$PROD_URL" -AtF'|' -f docs/producao-26-6-conferencia-marts.sql > depois.txt
diff antes.txt depois.txt
```

- Esperado: sem diferença, exceto o hash de `fct_despesas` (empate em restos a pagar, funcao/subfuncao/elemento).
- Para `fct_despesas`, o bloco `resumo_fct_despesas` (contagem e somas por portal/fonte) deve ser idêntico.
- Qualquer outra diferença: parar e ir ao passo de reversão.

## 7. Reativar as cargas

- Ligar `INGESTION_SCHEDULE_ENABLED=true`.
- A primeira carga mensal grava em `raw_fiorilli` com `portal_slug` na chave.

## Reversão (se os passos 5 ou 6 falharem)

1. Voltar o deploy para o commit anterior à 26.6. Ele lê `raw_<portal>`, que não foi alterado.
2. Rodar `dbt run` para reconstruir os marts com o código antigo.
3. Manter as cargas pausadas até decidir. As tabelas em `raw_fiorilli` podem ficar; não atrapalham.

## Não fazer nesta story

Apagar `raw_<portal>`, os staging por portal, `MIGRATED_RAW_TABLES` e `raw_schema`: é da 26.4.
