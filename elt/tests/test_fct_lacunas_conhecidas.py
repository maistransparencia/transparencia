"""Integration tests for the fct_lacunas_conhecidas mart."""

from sqlalchemy import text


def _portais(conn):
    return [row[0] for row in conn.execute(text("SELECT portal_slug FROM analytics.dim_portais ORDER BY portal_slug"))]


def test_every_catalog_entry_is_repeated_for_every_portal(conn):
    catalog_size = conn.execute(text("SELECT count(*) FROM seed_lacunas_conhecidas")).scalar()
    for portal in _portais(conn):
        total = conn.execute(
            text("SELECT count(*) FROM analytics.fct_lacunas_conhecidas WHERE portal_slug = :p"), {"p": portal}
        ).scalar()
        assert total == catalog_size


def test_start_year_is_filled_from_configuration_not_hardcoded_in_the_seed(conn):
    texts = [row[0] for row in conn.execute(text("SELECT texto_cidadao FROM analytics.fct_lacunas_conhecidas"))]

    assert texts
    assert not any("{ano_inicial_historico}" in value for value in texts)
    assert any("2021" in value for value in texts)


def test_open_ended_entries_have_no_end_date_and_types_are_known(conn):
    rows = conn.execute(
        text("SELECT DISTINCT tipo, vigencia_fim IS NULL FROM analytics.fct_lacunas_conhecidas")
    ).fetchall()

    assert {row[0] for row in rows} <= {"lacuna", "divergencia"}
    assert all(row[1] for row in rows)
