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

    def insert(portal, fonte, coletado_em, frequencia="diaria", total_linhas=None, resultado=None, erro_codigo=None):
        conn.execute(
            text(
                f"INSERT INTO {_SCHEMA}.registro_coletas "
                "(portal_slug, fonte, coletado_em, frequencia_esperada, total_linhas, resultado, erro_codigo) "
                "VALUES (:p, :f, :c, :q, :t, :r, :e)"
            ),
            {
                "p": portal,
                "f": fonte,
                "c": coletado_em,
                "q": frequencia,
                "t": total_linhas,
                "r": resultado,
                "e": erro_codigo,
            },
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
    assert sources["portal_municipal"] == ("diaria", "sem_registro", None, 0, None)
    assert sources["siope"] == ("mensal", "nao_monitorado", None, 0, None)


def test_latest_collection_wins_and_portals_are_isolated(conn, coleta, portais):
    portal_a, portal_b = portais
    coleta(portal_a, "portal_municipal", "2026-11-09T08:00:00+00:00", total_linhas="50")
    coleta(portal_a, "portal_municipal", "2026-11-10T08:00:00+00:00", total_linhas="0")
    coleta(portal_b, "pncp", "2026-11-01T08:00:00+00:00", "semanal", "9")

    a, b = _by_source(conn, portal_a), _by_source(conn, portal_b)

    assert a["portal_municipal"][1:] == ("monitorado", "2026-11-10 08:00:00", 2, 0)
    assert a["pncp"][1] == "sem_registro"
    assert b["portal_municipal"][1] == "sem_registro"
    assert b["pncp"][1:] == ("monitorado", "2026-11-01 08:00:00", 1, 9)


@pytest.mark.usefixtures("coleta")
def test_catalog_description_and_tolerance_are_passed_through(conn, portais):
    rows = conn.execute(
        text(
            "SELECT fonte, descricao_dados, tolerancia_dias FROM analytics.fct_coletas_por_fonte WHERE portal_slug = :p"
        ),
        {"p": portais[0]},
    ).fetchall()
    by_source = {row[0]: row[1:] for row in rows}

    assert all(descricao for descricao, _ in by_source.values())
    assert by_source["portal_municipal"][1] == 4
    assert {fonte for fonte, (_, tolerancia) in by_source.items() if tolerancia is None} == {"emendas_estaduais"}


@pytest.mark.usefixtures("coleta")
def test_catalog_source_name_and_sphere_are_passed_through(conn, portais):
    rows = conn.execute(
        text(
            "SELECT fonte, nome_fonte, url_fonte, esfera_fonte FROM analytics.fct_coletas_por_fonte WHERE portal_slug = :p"
        ),
        {"p": portais[0]},
    ).fetchall()
    by_source = {row[0]: row[1:] for row in rows}

    assert by_source["pncp"] == ("PNCP", "https://pncp.gov.br", "nacional")
    assert by_source["portal_municipal"] == (None, None, "municipal")
    assert by_source["emendas_estaduais"] == (None, None, "estadual")
    assert all(nome and url for nome, url, esfera in by_source.values() if esfera == "nacional")


def _failure_columns(conn, portal, fonte):
    return conn.execute(
        text(
            "SELECT situacao_monitoramento, (ultima_coleta_em at time zone 'UTC')::text, "
            "(ultima_falha_em at time zone 'UTC')::text, ultimo_erro_codigo, total_coletas "
            "FROM analytics.fct_coletas_por_fonte WHERE portal_slug = :p AND fonte = :f"
        ),
        {"p": portal, "f": fonte},
    ).one()


def test_failure_never_overwrites_last_successful_collection(conn, coleta, portais):
    portal_a, portal_b = portais
    coleta(portal_a, "portal_municipal", "2026-11-09T08:00:00+00:00", total_linhas="50", resultado="sucesso")
    coleta(portal_a, "portal_municipal", "2026-11-10T08:00:00+00:00", resultado="falha", erro_codigo="fonte_fora_do_ar")
    coleta(portal_b, "portal_municipal", "2026-11-10T08:00:00+00:00", total_linhas="7")

    assert _failure_columns(conn, portal_a, "portal_municipal") == (
        "monitorado",
        "2026-11-09 08:00:00",
        "2026-11-10 08:00:00",
        "fonte_fora_do_ar",
        1,
    )
    # Portal B sem falha; registro antigo sem `resultado` conta como sucesso.
    assert _failure_columns(conn, portal_b, "portal_municipal") == (
        "monitorado",
        "2026-11-10 08:00:00",
        None,
        None,
        1,
    )


def test_source_with_only_failures_has_no_record_and_keeps_failure(conn, coleta, portais):
    coleta(portais[0], "pncp", "2026-11-10T08:00:00+00:00", "semanal", resultado="falha", erro_codigo="formato_mudou")

    assert _failure_columns(conn, portais[0], "pncp") == (
        "sem_registro",
        None,
        "2026-11-10 08:00:00",
        "formato_mudou",
        0,
    )


_PERIOD_SOURCES = {"siconfi_msc", "siconfi_rgf", "farmacia_sus"}


def _published_period(conn, portal, fonte):
    return conn.execute(
        text(
            "SELECT periodo_mais_recente_fim::text, granularidade_periodo, defasagem_publicacao_dias "
            "FROM analytics.fct_coletas_por_fonte WHERE portal_slug = :p AND fonte = :f"
        ),
        {"p": portal, "f": fonte},
    ).one()


@pytest.mark.usefixtures("coleta")
def test_published_period_matches_each_source_mart_and_stays_null_elsewhere(conn, portais):
    expected_msc = {
        portal: conn.execute(
            text(
                "SELECT (make_date(ano::int, mes_referencia::int, 1) + interval '1 month - 1 day')::date::text "
                "FROM analytics.fct_saldo_caixa_siconfi WHERE portal_slug = :p "
                "ORDER BY ano DESC, mes_referencia DESC LIMIT 1"
            ),
            {"p": portal},
        ).scalar()
        for portal in portais
    }
    expected_farmacia = {
        portal: conn.execute(
            text(
                "SELECT max(data_posicao_mais_recente)::text FROM analytics.fct_farmacia_estoque WHERE portal_slug = :p"
            ),
            {"p": portal},
        ).scalar()
        for portal in portais
    }

    for portal in portais:
        assert _published_period(conn, portal, "siconfi_msc")[:2] == (
            expected_msc[portal],
            "mes" if expected_msc[portal] else None,
        )
        assert _published_period(conn, portal, "farmacia_sus")[:2] == (
            expected_farmacia[portal],
            "dia" if expected_farmacia[portal] else None,
        )
        granularidade_rgf = _published_period(conn, portal, "siconfi_rgf")[1]
        assert granularidade_rgf in {None, "quadrimestre", "semestre"}

        others = conn.execute(
            text(
                "SELECT count(*) FROM analytics.fct_coletas_por_fonte WHERE portal_slug = :p "
                "AND fonte <> ALL(:fontes) AND (periodo_mais_recente_fim IS NOT NULL "
                "OR granularidade_periodo IS NOT NULL OR defasagem_publicacao_dias IS NOT NULL)"
            ),
            {"p": portal, "fontes": sorted(_PERIOD_SOURCES)},
        ).scalar()
        assert others == 0


@pytest.mark.usefixtures("coleta")
def test_publication_lag_comes_from_catalog_for_period_sources(conn, portais):
    lags = {fonte: _published_period(conn, portais[0], fonte)[2] for fonte in _PERIOD_SOURCES}

    assert lags == {"siconfi_msc": 60, "siconfi_rgf": 45, "farmacia_sus": 7}
