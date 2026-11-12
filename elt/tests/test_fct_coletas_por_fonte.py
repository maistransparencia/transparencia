"""Integration tests for the fct_coletas_por_fonte mart."""

import pytest
from sqlalchemy import text

_SCHEMA = "raw_coletas"


@pytest.fixture
def portais(conn):
    slugs = [
        row[0]
        for row in conn.execute(text("SELECT portal_slug FROM analytics.dim_portais ORDER BY portal_slug LIMIT 2"))
    ]
    assert len(slugs) == 2
    return slugs


@pytest.fixture
def coleta(conn):
    def wipe():
        conn.execute(text(f"DELETE FROM {_SCHEMA}.registro_coletas"))
        conn.commit()

    wipe()

    def insert(portal, fonte, coletado_em, frequencia="diaria", total_linhas=None):
        conn.execute(
            text(
                f"INSERT INTO {_SCHEMA}.registro_coletas (portal_slug, fonte, coletado_em, frequencia_esperada, total_linhas) "
                "VALUES (:p, :f, :c, :q, :t)"
            ),
            {"p": portal, "f": fonte, "c": coletado_em, "q": frequencia, "t": total_linhas},
        )

    yield insert
    conn.rollback()
    wipe()


def _by_source(conn, portal):
    rows = conn.execute(
        text(
            "SELECT fonte, frequencia_esperada, situacao_monitoramento, "
            "(ultima_coleta_em at time zone 'UTC')::text, total_coletas, ultima_coleta_total_linhas FROM analytics.fct_coletas_por_fonte WHERE portal_slug = :p"
        ),
        {"p": portal},
    ).fetchall()
    return {row[0]: row[1:] for row in rows}


@pytest.mark.usefixtures("coleta")
def test_every_catalog_source_is_listed_and_unrecorded_is_never_presumed_fresh(conn, portais):
    catalog_size = conn.execute(text("SELECT count(*) FROM seed_fontes_coleta")).scalar()
    sources = _by_source(conn, portais[0])

    assert len(sources) == catalog_size
    assert sources["fiorilli"] == ("diaria", "sem_registro", None, 0, None)
    assert sources["siope"] == ("mensal", "nao_monitorado", None, 0, None)


def test_latest_collection_wins_and_portals_are_isolated(conn, coleta, portais):
    portal_a, portal_b = portais
    coleta(portal_a, "fiorilli", "2026-11-09T08:00:00+00:00", total_linhas="50")
    coleta(portal_a, "fiorilli", "2026-11-10T08:00:00+00:00", total_linhas="0")
    coleta(portal_b, "pncp", "2026-11-01T08:00:00+00:00", "semanal", "9")

    a, b = _by_source(conn, portal_a), _by_source(conn, portal_b)

    assert a["fiorilli"][1:] == ("monitorado", "2026-11-10 08:00:00", 2, 0)
    assert a["pncp"][1] == "sem_registro"
    assert b["fiorilli"][1] == "sem_registro"
    assert b["pncp"][1:] == ("monitorado", "2026-11-01 08:00:00", 1, 9)
