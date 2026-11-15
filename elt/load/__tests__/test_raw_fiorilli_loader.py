"""Base do loader do Fiorilli em raw_fiorilli: schema por tabela, portal_slug na chave e migração idempotente."""

from pathlib import Path
from types import SimpleNamespace

import pytest
from elt.core.config import resolve_key_cols, resolve_raw_schema, tag_rows_with_portal
from elt.load.run import _upsert_raw
from sqlalchemy import text

SCRIPTS_DIR = Path(__file__).resolve().parents[2] / "scripts"
MIGRATION_SCRIPT = SCRIPTS_DIR / "migrate_fiorilli_base_para_raw_fiorilli.sql"
TABLES_MIGRATION_SCRIPT = SCRIPTS_DIR / "migrate_fiorilli_tabelas_para_raw_fiorilli.sql"
portal_a = SimpleNamespace(slug="zz_portal_a", provider="fiorilli")
portal_b = SimpleNamespace(slug="zz_portal_b", provider="fiorilli")


def test_raw_schema_is_per_provider_with_portal_slug_in_key():
    assert resolve_raw_schema(portal_a) == "raw_fiorilli"
    assert resolve_key_cols(["ano", "codigo"]) == ["portal_slug", "ano", "codigo"]
    assert resolve_key_cols(["portal_slug", "key"]) == ["portal_slug", "key"]
    assert tag_rows_with_portal(portal_a, [{"ano": "2024"}]) == [{"ano": "2024", "portal_slug": "zz_portal_a"}]


def _load(engine, portal, rows):
    key_cols = resolve_key_cols(["ano", "empresa", "codigo"])
    return _upsert_raw(engine, "raw_fiorilli", "receita_detalhes", tag_rows_with_portal(portal, rows), key_cols)


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


def _run_migration(engine, script: Path = MIGRATION_SCRIPT) -> None:
    connection = engine.raw_connection()
    try:
        connection.cursor().execute(script.read_text(encoding="utf-8"))
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


@pytest.fixture
def legacy_contratos(engine):
    def drop():
        with engine.begin() as conn:
            conn.execute(text("DROP SCHEMA IF EXISTS raw_zz_legacy CASCADE"))
            conn.execute(text("DELETE FROM raw_fiorilli.contratos WHERE portal_slug LIKE 'zz\\_%'"))
            conn.execute(text("DELETE FROM raw_fiorilli.metadata WHERE portal_slug LIKE 'zz\\_%'"))

    drop()
    with engine.begin() as conn:
        conn.execute(text("CREATE SCHEMA raw_zz_legacy"))
        conn.execute(text("CREATE TABLE raw_zz_legacy.metadata (key TEXT PRIMARY KEY, value TEXT)"))
        conn.execute(
            text(
                "CREATE TABLE raw_zz_legacy.contratos (ano INTEGER, empresa TEXT, numero TEXT, valor TEXT, "
                "PRIMARY KEY (ano, empresa, numero))"
            )
        )
        conn.execute(text("INSERT INTO raw_zz_legacy.contratos VALUES (2024,'1','1','10,50'), (2025,'1','2','5,00')"))
    yield
    drop()


@pytest.mark.usefixtures("legacy_contratos")
def test_tables_migration_is_idempotent_and_keeps_portal_slug_in_key(engine):
    _run_migration(engine, TABLES_MIGRATION_SCRIPT)
    _run_migration(engine, TABLES_MIGRATION_SCRIPT)

    with engine.connect() as conn:
        rows = conn.execute(
            text(
                "SELECT portal_slug, ano, valor FROM raw_fiorilli.contratos WHERE portal_slug = 'zz_legacy' ORDER BY ano"
            )
        ).all()
    assert [tuple(row) for row in rows] == [("zz_legacy", 2024, "10,50"), ("zz_legacy", 2025, "5,00")]


@pytest.mark.usefixtures("legacy_contratos")
def test_tables_migration_aborts_when_destination_diverges_from_source(engine):
    _run_migration(engine, TABLES_MIGRATION_SCRIPT)
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE raw_fiorilli.contratos SET valor = '99,99' WHERE portal_slug = 'zz_legacy' AND ano = 2024")
        )

    with pytest.raises(Exception, match="Paridade falhou"):
        _run_migration(engine, TABLES_MIGRATION_SCRIPT)
