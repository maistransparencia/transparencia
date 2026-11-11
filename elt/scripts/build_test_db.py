"""Constrói o banco de testes de packages/db a partir do dbt (fonte única de verdade).

Uso: uv run --project elt python elt/scripts/build_test_db.py

Recria os schemas raw e analytics no banco apontado por TEST_DATABASE_URL (padrão: Postgres
efêmero local da porta 5545), cria as tabelas raw vazias a partir dos _sources.yml e
materializa seeds + marts como tabelas. Resultado: tabelas fct_*/dim_* vazias (dados
transacionais vêm de packages/db/tests/fixtures/seed.ts) e seeds estáticos populados.
Local e CI executam exatamente este mesmo script.

O script apaga schemas, então só roda em banco de teste comprovado: host local, porta 5545 e
nenhuma tabela raw com dados. DATABASE_URL é ignorado de propósito, para que um .env com o banco
de desenvolvimento (5544) ou de produção nunca chegue aqui.
"""

import os
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse

import yaml
from sqlalchemy import create_engine, text

_ELT_DIR = Path(__file__).resolve().parent.parent
_DBT_DIR = _ELT_DIR / "transform"
_STAGING_DIR = _DBT_DIR / "models" / "staging"
_DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@localhost:5545/postgres"
_HOSTS_LOCAIS = {"localhost", "127.0.0.1", "::1"}
_PORTA_BANCO_TESTE = 5545


def motivo_recusa_url(database_url: str) -> str | None:
    """Diz por que a URL não é do banco de teste, ou None quando ela é."""
    u = urlparse(database_url)
    if u.hostname not in _HOSTS_LOCAIS:
        return f"host {u.hostname!r} não é local (produção ou banco remoto)"
    if u.port != _PORTA_BANCO_TESTE:
        return f"porta {u.port} não é a do banco de teste ({_PORTA_BANCO_TESTE}); 5544 é o banco de desenvolvimento"
    return None


def tabelas_raw_com_dados(eng) -> list[str]:
    """Lista tabelas raw com linhas. No banco de teste elas são sempre vazias."""
    with eng.connect() as conn:
        tabelas = conn.execute(
            text(
                "SELECT format('%I.%I', schemaname, tablename) FROM pg_tables "
                "WHERE schemaname = 'raw' OR schemaname LIKE 'raw\\_%'"
            )
        ).scalars()
        return [t for t in tabelas if conn.execute(text(f"SELECT EXISTS (SELECT 1 FROM {t})")).scalar()]


def recusar(motivo: str) -> None:
    sys.exit(f"build_test_db: recusado, {motivo}. Este script apaga schemas e só roda no banco de teste.")


def create_raw_schema(eng) -> None:
    """Cria schema raw e tabelas a partir de todos os _sources.yml em staging/ (fonte única de verdade)."""
    sources_files = sorted(_STAGING_DIR.glob("**/_sources.yml"))

    def _sql_type(col: dict) -> str:
        if "data_type" in col:
            return col["data_type"]
        return "integer" if col["name"] == "ano" else "text"

    with eng.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS unaccent"))
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS analytics"))
        conn.execute(
            text(
                "CREATE OR REPLACE FUNCTION analytics.unaccent(text) RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$ SELECT public.unaccent($1); $$"
            )
        )
        conn.execute(
            text(
                "CREATE OR REPLACE FUNCTION analytics.unaccent(regdictionary, text) RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$ SELECT public.unaccent($1, $2); $$"
            )
        )
        for sources_file in sources_files:
            sources = yaml.safe_load(sources_file.read_text())
            for source in (sources or {}).get("sources", []):
                schema_name = source.get("schema", source["name"])
                conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"'))
                for table_def in source.get("tables", []):
                    name = table_def["name"]
                    col_defs_list = table_def.get("columns", [])
                    if not col_defs_list:
                        continue
                    pk_cols = table_def.get("meta", {}).get("primary_key", [])
                    col_sql = ", ".join(f'"{c["name"]}" {_sql_type(c)}' for c in col_defs_list)
                    pk_clause = f", PRIMARY KEY ({', '.join(pk_cols)})" if pk_cols else ""
                    ddl = f'CREATE TABLE IF NOT EXISTS "{schema_name}"."{name}" ({col_sql}{pk_clause})'
                    conn.execute(text(ddl))
        conn.commit()


def run_dbt(database_url: str, *args: str) -> None:
    u = urlparse(database_url)
    venv_dbt = _ELT_DIR / ".venv" / "bin" / "dbt"
    env = {
        **os.environ,
        "DBT_HOST": u.hostname or "",
        "DBT_PORT": str(u.port or 5432),
        "DBT_USER": u.username or "",
        "DBT_PASSWORD": u.password or "",
        "DBT_DBNAME": u.path.lstrip("/"),
        "DBT_ALLOW_EXPERIMENTAL_ADAPTERS": "true",
    }
    subprocess.run(
        [
            str(venv_dbt) if venv_dbt.exists() else "dbt",
            *args,
            "--profiles-dir",
            str(_DBT_DIR),
            "--project-dir",
            str(_DBT_DIR),
        ],
        env=env,
        check=True,
    )


def drop_previous_build(eng) -> None:
    """Remove schemas gerados em builds anteriores para garantir um banco sem resíduos."""
    with eng.connect() as conn:
        schemas = [
            row[0]
            for row in conn.execute(
                text("SELECT nspname FROM pg_namespace WHERE nspname = 'analytics' OR nspname LIKE 'raw\\_%'")
            )
        ]
        for schema in schemas:
            conn.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))
        conn.commit()


def main() -> None:
    database_url = os.environ.get("TEST_DATABASE_URL") or _DEFAULT_DATABASE_URL
    motivo = motivo_recusa_url(database_url)
    if motivo:
        recusar(motivo)
    eng = create_engine(database_url.replace("postgresql://", "postgresql+psycopg2://", 1))
    com_dados = tabelas_raw_com_dados(eng)
    if com_dados:
        recusar(f"há dados em {len(com_dados)} tabela(s) raw, por exemplo {com_dados[0]}")
    drop_previous_build(eng)
    create_raw_schema(eng)
    run_dbt(database_url, "deps")
    run_dbt(database_url, "seed")
    run_dbt(database_url, "run")


if __name__ == "__main__":
    main()
