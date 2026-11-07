"""Testes de integração do mart fct_saude_producao_sus_metricas."""

import pytest
from sqlalchemy import text

_SCHEMA = "raw_saude_rede"
_TABELAS = ("sia_competencia", "sih_competencia", "populacao_residente")
_MART = "analytics.fct_saude_producao_sus_metricas"


@pytest.fixture
def portal(conn):
    return conn.execute(text("SELECT portal_slug FROM analytics.dim_portais ORDER BY portal_slug LIMIT 1")).scalar()


@pytest.fixture
def raw(conn):
    def limpar():
        for tabela in _TABELAS:
            conn.execute(text(f"DELETE FROM {_SCHEMA}.{tabela}"))
        conn.commit()

    limpar()

    def sia(portal, competencia, total):
        conn.execute(
            text(f"INSERT INTO {_SCHEMA}.sia_competencia VALUES (:p, :c, :t, '2026-11-07')"),
            {"p": portal, "c": str(competencia), "t": str(total)},
        )

    def sih(portal, competencia, total):
        conn.execute(
            text(f"INSERT INTO {_SCHEMA}.sih_competencia VALUES (:p, :c, :t, '2026-11-07')"),
            {"p": portal, "c": str(competencia), "t": str(total)},
        )

    def populacao(portal, ano, total):
        conn.execute(
            text(f"INSERT INTO {_SCHEMA}.populacao_residente VALUES (:p, :a, :t, '2026-11-07')"),
            {"p": portal, "a": str(ano), "t": str(total)},
        )

    yield type("Raw", (), {"sia": sia, "sih": sih, "populacao": populacao})
    limpar()


def _linhas(conn, portal):
    conn.commit()
    resultado = conn.execute(
        text(f"SELECT * FROM {_MART} WHERE portal_slug = :p ORDER BY ano"), {"p": portal}
    ).mappings()
    return {linha["ano"]: linha for linha in resultado}


def test_soma_competencias_do_ano_e_calcula_por_mil_moradores(conn, portal, raw):
    for mes in range(1, 13):
        raw.sia(portal, 202400 + mes, 100)
        raw.sih(portal, 202400 + mes, 5)
    raw.populacao(portal, 2024, 10000)
    linha = _linhas(conn, portal)[2024]
    assert linha["total_procedimentos_ambulatoriais"] == 1200
    assert linha["total_internacoes"] == 60
    assert float(linha["procedimentos_ambulatoriais_por_mil_moradores"]) == 120.0
    assert float(linha["internacoes_por_mil_moradores"]) == 6.0
    assert linha["ano_completo_ambulatorial"] is True
    assert linha["ano_completo_internacoes"] is True
    assert linha["populacao_estimada"] is False


def test_ano_em_curso_fica_incompleto_e_diz_ate_onde_a_fonte_tem_dado(conn, portal, raw):
    raw.sia(portal, 202601, 50)
    raw.sia(portal, 202602, 70)
    raw.populacao(portal, 2025, 1000)
    linha = _linhas(conn, portal)[2026]
    assert linha["competencias_ambulatoriais"] == 2
    assert linha["ultima_competencia_ambulatorial"] == 202602
    assert linha["ano_completo_ambulatorial"] is False
    assert linha["populacao_estimada"] is True
    assert linha["ano_populacao_referencia"] == 2025


def test_sih_sem_retorno_fica_sem_dado_e_nao_zero(conn, portal, raw):
    raw.sia(portal, 202301, 10)
    raw.populacao(portal, 2023, 1000)
    linha = _linhas(conn, portal)[2023]
    assert linha["total_internacoes"] is None
    assert linha["internacoes_por_mil_moradores"] is None
    assert linha["competencias_internacoes"] is None
    assert linha["ano_completo_internacoes"] is False


def test_valor_ilegivel_nao_vira_zero(conn, portal, raw):
    raw.sia(portal, 202301, 10)
    raw.sih(portal, 202301, "")
    raw.populacao(portal, 2023, 1000)
    assert _linhas(conn, portal)[2023]["total_internacoes"] is None


def test_anos_anteriores_a_2021_nao_entram(conn, portal, raw):
    raw.sia(portal, 202012, 10)
    assert 2020 not in _linhas(conn, portal)


def test_sem_populacao_nao_calcula_taxa(conn, portal, raw):
    raw.sia(portal, 202201, 10)
    linha = _linhas(conn, portal)[2022]
    assert linha["procedimentos_ambulatoriais_por_mil_moradores"] is None
    assert linha["total_procedimentos_ambulatoriais"] == 10


def test_competencia_com_total_ilegivel_nao_conta_para_ano_completo(conn, portal, raw):
    for mes in range(1, 12):
        raw.sia(portal, 202400 + mes, 100)
    raw.sia(portal, 202412, "")
    raw.populacao(portal, 2024, 10000)
    linha = _linhas(conn, portal)[2024]
    assert linha["competencias_ambulatoriais"] == 11
    assert linha["ultima_competencia_ambulatorial"] == 202411
    assert linha["total_procedimentos_ambulatoriais"] == 1100
    assert linha["ano_completo_ambulatorial"] is False


def test_ano_so_com_competencias_ilegiveis_fica_sem_dado(conn, portal, raw):
    raw.sih(portal, 202401, "")
    raw.sia(portal, 202401, 10)
    raw.populacao(portal, 2024, 1000)
    linha = _linhas(conn, portal)[2024]
    assert linha["competencias_internacoes"] is None
    assert linha["total_internacoes"] is None
    assert linha["ultima_competencia_internacoes"] is None
