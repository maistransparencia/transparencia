"""Testes de integração do mart fct_saude_rede_por_mil_moradores_metricas."""

import pytest
from sqlalchemy import text

_SCHEMA = "raw_saude_rede"
_TABELAS = ("leitos_competencia", "profissionais_competencia", "populacao_residente")
_MART = "analytics.fct_saude_rede_por_mil_moradores_metricas"


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

    def leito(portal, competencia, tipo, existentes, sus):
        conn.execute(
            text(f"INSERT INTO {_SCHEMA}.leitos_competencia VALUES (:p, :c, :t, :e, :s, '2026-11-07')"),
            {"p": portal, "c": str(competencia), "t": tipo, "e": str(existentes), "s": str(sus)},
        )

    def profissionais(portal, competencia, total, sus):
        conn.execute(
            text(f"INSERT INTO {_SCHEMA}.profissionais_competencia VALUES (:p, :c, :v, :t, :s, '2026-11-07')"),
            {"p": portal, "c": str(competencia), "v": str(total + 5), "t": str(total), "s": str(sus)},
        )

    def populacao(portal, ano, total):
        conn.execute(
            text(f"INSERT INTO {_SCHEMA}.populacao_residente VALUES (:p, :a, :t, '2026-11-07')"),
            {"p": portal, "a": str(ano), "t": str(total)},
        )

    yield type("Raw", (), {"leito": leito, "profissionais": profissionais, "populacao": populacao})
    limpar()


def _linhas(conn, portal):
    conn.commit()
    resultado = conn.execute(
        text(f"SELECT * FROM {_MART} WHERE portal_slug = :p ORDER BY ano"), {"p": portal}
    ).mappings()
    return {linha["ano"]: linha for linha in resultado}


def test_calcula_por_mil_moradores_somando_tipos_de_leito(conn, portal, raw):
    raw.leito(portal, 202412, "espec_clinico", 30, 20)
    raw.leito(portal, 202412, "pediatrico", 10, 10)
    raw.profissionais(portal, 202412, 200, 150)
    raw.populacao(portal, 2024, 10000)
    linha = _linhas(conn, portal)[2024]
    assert linha["total_leitos_existentes"] == 40
    assert float(linha["leitos_existentes_por_mil_moradores"]) == 4.0
    assert float(linha["leitos_sus_por_mil_moradores"]) == 3.0
    assert float(linha["profissionais_por_mil_moradores"]) == 20.0
    assert float(linha["profissionais_sus_por_mil_moradores"]) == 15.0
    assert linha["populacao_estimada"] is False


def test_ano_sem_populacao_usa_ultimo_ano_e_marca_estimativa(conn, portal, raw):
    raw.populacao(portal, 2025, 20000)
    raw.leito(portal, 202605, "pediatrico", 20, 20)
    linha = _linhas(conn, portal)[2026]
    assert linha["ano_populacao_referencia"] == 2025
    assert linha["populacao_estimada"] is True
    assert float(linha["leitos_existentes_por_mil_moradores"]) == 1.0


def test_ano_sem_cnes_fica_sem_dado_e_nao_zero(conn, portal, raw):
    raw.leito(portal, 202312, "pediatrico", 10, 10)
    raw.populacao(portal, 2023, 1000)
    linha = _linhas(conn, portal)[2023]
    assert linha["total_profissionais"] is None
    assert linha["profissionais_por_mil_moradores"] is None


def test_anos_anteriores_a_2021_nao_entram(conn, portal, raw):
    raw.leito(portal, 202012, "pediatrico", 10, 10)
    raw.populacao(portal, 2020, 1000)
    assert 2020 not in _linhas(conn, portal)


def test_sem_populacao_nao_calcula_taxa(conn, portal, raw):
    raw.leito(portal, 202212, "pediatrico", 10, 10)
    linha = _linhas(conn, portal)[2022]
    assert linha["leitos_existentes_por_mil_moradores"] is None
    assert linha["total_leitos_existentes"] == 10


def test_staging_converte_tipo_de_leito_em_snake_case(conn, portal, raw):
    raw.leito(portal, 202412, "2 - ESPEC - CLÍNICO", 1, 1)
    raw.leito(portal, 202412, "6 - OUTRAS ESPECIALIDADES", 1, 1)
    conn.commit()
    tipos = {
        linha[0]
        for linha in conn.execute(
            text("SELECT tipo_leito FROM analytics.stg_saude_rede__leitos_competencia WHERE portal_slug = :p"),
            {"p": portal},
        )
    }
    assert tipos == {"espec_clinico", "outras_especialidades"}


def test_so_a_competencia_mais_recente_do_ano_entra_nos_leitos_e_profissionais(conn, portal, raw):
    raw.leito(portal, 202610, "pediatrico", 10, 10)
    raw.leito(portal, 202611, "pediatrico", 12, 11)
    raw.leito(portal, 202611, "clinico", 8, 4)
    raw.profissionais(portal, 202610, 100, 80)
    raw.profissionais(portal, 202611, 120, 90)
    raw.populacao(portal, 2026, 10000)
    linhas = _linhas(conn, portal)
    conn.commit()
    quantidade = conn.execute(
        text(f"SELECT count(*) FROM {_MART} WHERE portal_slug = :p AND ano = 2026"), {"p": portal}
    ).scalar()
    linha = linhas[2026]
    assert quantidade == 1
    assert (linha["competencia_leitos"], linha["competencia_profissionais"]) == (202611, 202611)
    assert linha["total_leitos_existentes"] == 20
    assert linha["total_leitos_sus"] == 15
    assert linha["total_profissionais"] == 120
    assert float(linha["leitos_existentes_por_mil_moradores"]) == 2.0


def test_ano_com_populacao_e_sem_cnes_gera_linha_sem_dado(conn, portal, raw):
    raw.populacao(portal, 2023, 1000)
    linha = _linhas(conn, portal)[2023]
    assert linha["total_leitos_existentes"] is None
    assert linha["leitos_existentes_por_mil_moradores"] is None
    assert linha["profissionais_por_mil_moradores"] is None
    assert linha["populacao_residente"] == 1000


def test_valor_vazio_no_raw_fica_nulo_e_nao_zero(conn, portal, raw):
    conn.execute(
        text(f"INSERT INTO {_SCHEMA}.leitos_competencia VALUES (:p, '202312', 'pediatrico', '', '', '2026-11-07')"),
        {"p": portal},
    )
    conn.execute(
        text(f"INSERT INTO {_SCHEMA}.profissionais_competencia VALUES (:p, '202312', '5', '', '', '2026-11-07')"),
        {"p": portal},
    )
    raw.populacao(portal, 2023, 1000)
    linha = _linhas(conn, portal)[2023]
    assert linha["total_leitos_existentes"] is None
    assert linha["leitos_existentes_por_mil_moradores"] is None
    assert linha["total_profissionais"] is None
    assert linha["profissionais_por_mil_moradores"] is None
