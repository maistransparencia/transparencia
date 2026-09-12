import gzip
from collections.abc import Sequence
from pathlib import Path
from typing import Any

import pytest
from sqlalchemy import text
from sqlalchemy.engine import Engine

FIXTURE_PATH = Path(__file__).resolve().parents[2] / "packages" / "db" / "tests" / "fixtures" / "schema.sql.gz"

REMEDIATION_MSG = "Execute 'make db/fixture/dump' para sincronizar o fixture de teste."


@pytest.fixture(scope="session")
def setup_fixture_audit(engine: Engine) -> None:
    """Restaura o dump schema.sql.gz no schema isolado fixture_audit para comparação."""
    assert FIXTURE_PATH.exists(), f"Fixture não encontrado em {FIXTURE_PATH}. {REMEDIATION_MSG}"
    assert FIXTURE_PATH.stat().st_size > 0, f"Arquivo de fixture {FIXTURE_PATH} está vazio. {REMEDIATION_MSG}"

    raw_sql = gzip.decompress(FIXTURE_PATH.read_bytes()).decode("utf-8")

    # Remove metacomandos específicos do psql (ex: \restrict, \unrestrict, \connect)
    cleaned_lines = [
        line
        for line in raw_sql.splitlines()
        if not line.strip().startswith(("\\restrict", "\\unrestrict", "\\connect", "\\c "))
    ]
    cleaned_sql = "\n".join(cleaned_lines)

    # Redireciona criações e inserts do schema analytics para fixture_audit
    cleaned_sql = cleaned_sql.replace('"analytics".', "fixture_audit.")
    cleaned_sql = cleaned_sql.replace("analytics.", "fixture_audit.")
    cleaned_sql = cleaned_sql.replace(
        "CREATE SCHEMA IF NOT EXISTS analytics;",
        "CREATE SCHEMA IF NOT EXISTS fixture_audit;",
    )
    cleaned_sql = cleaned_sql.replace(
        "CREATE SCHEMA analytics;",
        "CREATE SCHEMA fixture_audit;",
    )

    with engine.connect() as conn:
        conn.execute(text("DROP SCHEMA IF EXISTS fixture_audit CASCADE;"))
        conn.execute(text("CREATE SCHEMA fixture_audit;"))
        conn.execute(
            text(
                "CREATE OR REPLACE FUNCTION fixture_audit.unaccent(text) "
                "RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$ SELECT public.unaccent($1); $$;"
            )
        )
        conn.execute(
            text(
                "CREATE OR REPLACE FUNCTION fixture_audit.unaccent(regdictionary, text) "
                "RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$ SELECT public.unaccent($1, $2); $$;"
            )
        )
        conn.commit()

        dbapi_conn = conn.connection.dbapi_connection
        assert dbapi_conn is not None
        cursor = dbapi_conn.cursor()
        try:
            cursor.execute(cleaned_sql)
            dbapi_conn.commit()
        finally:
            cursor.close()


def test_fixture_file_exists():
    """Valida existência do arquivo de fixture de teste."""
    assert FIXTURE_PATH.exists(), f"Arquivo de fixture {FIXTURE_PATH} não existe. {REMEDIATION_MSG}"
    assert FIXTURE_PATH.stat().st_size > 0, f"Arquivo de fixture {FIXTURE_PATH} está vazio. {REMEDIATION_MSG}"


@pytest.mark.usefixtures("setup_fixture_audit")
def test_tables_and_views_parity(engine: Engine):
    """Valida que todas as tabelas/views analíticas do dbt (fct_*, dim_*, seed_*)

    possuem correspondência exata no fixture (sem ausentes nem órfãs).
    """
    with engine.connect() as conn:
        dbt_rows = conn.execute(
            text(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'analytics'
                  AND (
                    table_name LIKE 'fct_%'
                    OR table_name LIKE 'dim_%'
                    OR table_name LIKE 'seed_%'
                  )
                ORDER BY table_name;
                """
            )
        ).fetchall()
        dbt_tables = {r[0] for r in dbt_rows}

        fixture_rows = conn.execute(
            text(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'fixture_audit'
                  AND (
                    table_name LIKE 'fct_%'
                    OR table_name LIKE 'dim_%'
                    OR table_name LIKE 'seed_%'
                  )
                ORDER BY table_name;
                """
            )
        ).fetchall()
        fixture_tables = {r[0] for r in fixture_rows}

    missing_in_fixture = sorted(dbt_tables - fixture_tables)
    orphan_in_fixture = sorted(fixture_tables - dbt_tables)

    errors = []
    if missing_in_fixture:
        errors.append(
            f"Tabelas/views dbt ausentes no fixture schema.sql.gz ({len(missing_in_fixture)}):\n  - "
            + "\n  - ".join(missing_in_fixture)
        )
    if orphan_in_fixture:
        errors.append(
            f"Tabelas órfãs presentes no fixture schema.sql.gz mas inexistentes no dbt ({len(orphan_in_fixture)}):\n  - "
            + "\n  - ".join(orphan_in_fixture)
        )

    assert not errors, "\n\n".join(errors) + f"\n\n--> {REMEDIATION_MSG}"


@pytest.mark.usefixtures("setup_fixture_audit")
def test_columns_and_data_types_parity(engine: Engine):
    """Valida que todas as colunas e seus respectivos tipos de dados são 100% idênticos

    entre as tabelas geradas pelo dbt e o DDL do fixture.
    """
    with engine.connect() as conn:
        # Colunas dbt
        dbt_rows = conn.execute(
            text(
                """
                SELECT table_name, column_name, data_type, udt_name
                FROM information_schema.columns
                WHERE table_schema = 'analytics'
                  AND (
                    table_name LIKE 'fct_%'
                    OR table_name LIKE 'dim_%'
                    OR table_name LIKE 'seed_%'
                  )
                ORDER BY table_name, ordinal_position;
                """
            )
        ).fetchall()

        # Colunas fixture
        fixture_rows = conn.execute(
            text(
                """
                SELECT table_name, column_name, data_type, udt_name
                FROM information_schema.columns
                WHERE table_schema = 'fixture_audit'
                  AND (
                    table_name LIKE 'fct_%'
                    OR table_name LIKE 'dim_%'
                    OR table_name LIKE 'seed_%'
                  )
                ORDER BY table_name, ordinal_position;
                """
            )
        ).fetchall()

    def _build_col_map(rows: Sequence[Any]) -> dict[str, dict[str, str]]:
        res: dict[str, dict[str, str]] = {}
        for table, col, dtype, udt in rows:
            res.setdefault(table, {})[col] = f"{dtype} ({udt})"
        return res

    dbt_col_map = _build_col_map(dbt_rows)
    fixture_col_map = _build_col_map(fixture_rows)

    common_tables = sorted(set(dbt_col_map.keys()) & set(fixture_col_map.keys()))
    assert common_tables, f"Nenhuma tabela analítica comum encontrada para comparar colunas. {REMEDIATION_MSG}"

    mismatches: list[str] = []

    for table in common_tables:
        dbt_cols = dbt_col_map[table]
        fixture_cols = fixture_col_map[table]

        missing_cols = sorted(set(dbt_cols.keys()) - set(fixture_cols.keys()))
        orphan_cols = sorted(set(fixture_cols.keys()) - set(dbt_cols.keys()))

        if missing_cols:
            mismatches.append(f"Tabela '{table}' está sem as colunas no fixture: {', '.join(missing_cols)}")
        if orphan_cols:
            mismatches.append(f"Tabela '{table}' possui colunas extras no fixture: {', '.join(orphan_cols)}")

        # Checa tipos de dados das colunas presentes em ambos
        for col in sorted(set(dbt_cols.keys()) & set(fixture_cols.keys())):
            dbt_type = dbt_cols[col]
            fixture_type = fixture_cols[col]
            if dbt_type != fixture_type:
                mismatches.append(
                    f"Tabela '{table}', coluna '{col}' com tipo divergente: dbt='{dbt_type}' vs fixture='{fixture_type}'"
                )

    assert not mismatches, (
        f"Divergência de colunas/tipos entre dbt e fixture ({len(mismatches)} ocorrências):\n"
        + "\n".join(f"  - {m}" for m in mismatches)
        + f"\n\n--> {REMEDIATION_MSG}"
    )


@pytest.mark.usefixtures("setup_fixture_audit")
def test_seed_records_parity(engine: Engine):
    """Valida paridade exata de registros nas tabelas de seed (analytics.seed_* vs fixture_audit.seed_*)."""
    with engine.connect() as conn:
        dbt_seed_rows = conn.execute(
            text(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'analytics'
                  AND table_name LIKE 'seed_%'
                ORDER BY table_name;
                """
            )
        ).fetchall()
        dbt_seeds = [r[0] for r in dbt_seed_rows]

        fixture_seed_rows = conn.execute(
            text(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'fixture_audit'
                  AND table_name LIKE 'seed_%'
                ORDER BY table_name;
                """
            )
        ).fetchall()
        fixture_seeds = {r[0] for r in fixture_seed_rows}

        discrepancies: list[str] = []

        for table in dbt_seeds:
            if table not in fixture_seeds:
                discrepancies.append(f"Tabela seed '{table}' não encontrada no fixture restaurado.")
                continue

            # Verifica contagem de linhas
            dbt_count = conn.execute(text(f'SELECT COUNT(*) FROM analytics."{table}"')).scalar()
            fixture_count = conn.execute(text(f'SELECT COUNT(*) FROM fixture_audit."{table}"')).scalar()

            if dbt_count != fixture_count:
                discrepancies.append(
                    f"Tabela seed '{table}' com contagem divergente: dbt={dbt_count} vs fixture={fixture_count}"
                )
                continue

            # Obtém colunas em ordem alfabética para projeção idêntica de ambos os lados do EXCEPT ALL
            col_rows = conn.execute(
                text(
                    """
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_schema = 'analytics' AND table_name = :t
                    ORDER BY column_name;
                    """
                ),
                {"t": table},
            ).fetchall()
            cols_projection = ", ".join(f'"{r[0]}"' for r in col_rows)

            # Verifica se há diferenças no conteúdo dos registros com EXCEPT ALL
            # (dbt EXCEPT ALL fixture) UNION ALL (fixture EXCEPT ALL dbt)
            diff_count = conn.execute(
                text(
                    f"""
                    SELECT COUNT(*) FROM (
                        (SELECT {cols_projection} FROM analytics."{table}"
                         EXCEPT ALL
                         SELECT {cols_projection} FROM fixture_audit."{table}")
                        UNION ALL
                        (SELECT {cols_projection} FROM fixture_audit."{table}"
                         EXCEPT ALL
                         SELECT {cols_projection} FROM analytics."{table}")
                    ) diff
                    """
                )
            ).scalar()

            if diff_count != 0:
                discrepancies.append(
                    f"Tabela seed '{table}' possui {diff_count} registro(s) divergente(s) entre dbt e fixture."
                )

    assert not discrepancies, (
        f"Divergência nos dados de tabelas seed ({len(discrepancies)} tabelas afetadas):\n"
        + "\n".join(f"  - {d}" for d in discrepancies)
        + f"\n\n--> {REMEDIATION_MSG}"
    )
