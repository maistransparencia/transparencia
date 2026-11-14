"""Base do loader do Fiorilli em raw_fiorilli: schema por tabela, portal_slug na chave e migração idempotente."""

from pathlib import Path
from types import SimpleNamespace

import pytest
from elt.core.config import resolve_key_cols, resolve_raw_schema, tag_rows_with_portal
from elt.load.run import _upsert_raw
from sqlalchemy import text

MIGRATION_SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "migrate_fiorilli_base_para_raw_fiorilli.sql"
MIGRATED_TABLES = [
    "despesas_extra_orcamentaria",
    "despesas_por_exigibilidade",
    "emendas_impositivas",
    "empresas",
    "receita_detalhes",
    "metadata",
]
portal_a = SimpleNamespace(slug="zz_portal_a", provider="fiorilli", raw_schema="raw_zz_portal_a")
portal_b = SimpleNamespace(slug="zz_portal_b", provider="fiorilli", raw_schema="raw_zz_portal_b")


@pytest.mark.parametrize("table", MIGRATED_TABLES)
def test_migrated_table_goes_to_provider_schema_with_portal_slug_in_key(table):
    assert resolve_raw_schema(portal_a, table) == "raw_fiorilli"
    assert resolve_key_cols(portal_a, table, ["ano", "codigo"]) == ["portal_slug", "ano", "codigo"]
    assert tag_rows_with_portal(portal_a, table, [{"ano": "2024"}]) == [{"ano": "2024", "portal_slug": "zz_portal_a"}]


def test_table_not_migrated_stays_in_legacy_schema_without_portal_slug():
    rows = [{"ano": "2024"}]
    assert resolve_raw_schema(portal_a, "licitacoes") == "raw_zz_portal_a"
    assert resolve_key_cols(portal_a, "licitacoes", ["ano", "numero"]) == ["ano", "numero"]
    assert tag_rows_with_portal(portal_a, "licitacoes", rows) is rows


def _load(engine, portal, rows):
    key_cols = resolve_key_cols(portal, "receita_detalhes", ["ano", "empresa", "codigo"])
    return _upsert_raw(
        engine, "raw_fiorilli", "receita_detalhes", tag_rows_with_portal(portal, "receita_detalhes", rows), key_cols
    )


def _valores(engine) -> dict[str, str]:
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT portal_slug, valor FROM raw_fiorilli.receita_detalhes WHERE portal_slug LIKE 'zz\\_%'")
        )
        return {slug: valor for slug, valor in result}


@pytest.fixture
def clean_receita_detalhes(engine):
    def clean():
        with engine.begin() as conn:
            conn.execute(text("DROP TABLE IF EXISTS raw_fiorilli.receita_detalhes"))

    clean()
    yield
    clean()


@pytest.mark.usefixtures("clean_receita_detalhes")
def test_reload_of_one_portal_does_not_touch_the_other(engine):
    row = {"ano": "2024", "empresa": "1", "codigo": "1.1", "valor": "10"}
    _load(engine, portal_a, [row])
    _load(engine, portal_b, [{**row, "valor": "99"}])

    assert _valores(engine) == {"zz_portal_a": "10", "zz_portal_b": "99"}

    _load(engine, portal_a, [{**row, "valor": "11"}])

    assert _valores(engine) == {"zz_portal_a": "11", "zz_portal_b": "99"}


@pytest.fixture
def legacy_schema(engine):
    def drop():
        with engine.begin() as conn:
            conn.execute(text("DROP SCHEMA IF EXISTS raw_zz_legacy CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS raw_fiorilli.receita_detalhes"))
            conn.execute(text("DELETE FROM raw_fiorilli.metadata WHERE portal_slug LIKE 'zz\\_%'"))

    drop()
    with engine.begin() as conn:
        conn.execute(text("CREATE SCHEMA raw_zz_legacy"))
        conn.execute(
            text(
                "CREATE TABLE raw_zz_legacy.receita_detalhes (ano TEXT, empresa TEXT, codigo TEXT, valor TEXT, "
                "PRIMARY KEY (ano, empresa, codigo))"
            )
        )
        conn.execute(
            text(
                "CREATE TABLE raw_zz_legacy.metadata (portal_slug TEXT, key TEXT, value TEXT, "
                "PRIMARY KEY (portal_slug, key))"
            )
        )
        conn.execute(
            text("INSERT INTO raw_zz_legacy.receita_detalhes VALUES ('2024','1','1.1','10'), ('2024','1','1.2','5')")
        )
        conn.execute(text("INSERT INTO raw_zz_legacy.metadata VALUES ('zz_legacy', 'last_extracted_at', '2026-11-01')"))
    yield
    drop()


def _run_migration(engine) -> None:
    connection = engine.raw_connection()
    try:
        connection.cursor().execute(MIGRATION_SCRIPT.read_text(encoding="utf-8"))
        connection.commit()
    finally:
        connection.close()


@pytest.mark.usefixtures("legacy_schema")
def test_migration_derives_slug_from_schema_and_is_idempotent(engine):
    _run_migration(engine)
    _run_migration(engine)

    with engine.connect() as conn:
        receitas = conn.execute(
            text("SELECT portal_slug, count(*), sum(valor::numeric) FROM raw_fiorilli.receita_detalhes GROUP BY 1")
        ).all()
        metadata = conn.execute(text("SELECT portal_slug, key, value FROM raw_fiorilli.metadata")).all()
    assert [tuple(row) for row in receitas] == [("zz_legacy", 2, 15)]
    assert [tuple(row) for row in metadata] == [("zz_legacy", "last_extracted_at", "2026-11-01")]
