"""Testes de integração do mart fct_educacao_matriculas_metricas."""

import pytest
from sqlalchemy import text

_TABELA = "raw_inep_censo.matriculas_rede_municipal"
_ANO = 2031

# (portal, ano, matriculas, escolas)
_LINHAS = [
    ("porciuncula_prefeitura", _ANO, 2001, 5),
    ("porciuncula_prefeitura", _ANO + 1, 1950, 5),
    ("natividade_prefeitura", _ANO, 1234, 4),
]


@pytest.fixture
def seed_matriculas(conn):
    def limpar():
        conn.execute(text(f"DELETE FROM {_TABELA} WHERE ano IN (:a, :b)"), {"a": _ANO, "b": _ANO + 1})
        conn.commit()

    limpar()
    for portal, ano, matriculas, escolas in _LINHAS:
        conn.execute(
            text(
                f"""
                INSERT INTO {_TABELA}
                    (portal_slug, ano, codigo_municipio_ibge, matriculas_educacao_basica, quantidade_escolas,
                     coletado_em)
                VALUES (:portal, :ano, 1, :matriculas, :escolas, now())
                """
            ),
            {"portal": portal, "ano": ano, "matriculas": matriculas, "escolas": escolas},
        )
    conn.commit()
    yield
    limpar()


def _linhas(conn, portal: str, ano: int):
    return conn.execute(
        text("SELECT * FROM analytics.fct_educacao_matriculas_metricas WHERE portal_slug = :p AND ano = :a"),
        {"p": portal, "a": ano},
    ).fetchall()


@pytest.mark.usefixtures("seed_matriculas")
def test_expoe_matriculas_por_portal_e_ano(conn):
    (linha,) = _linhas(conn, "porciuncula_prefeitura", _ANO)
    assert linha.matriculas_educacao_basica == 2001
    assert linha.quantidade_escolas == 5


@pytest.mark.usefixtures("seed_matriculas")
def test_isolamento_entre_portais_com_o_mesmo_ano(conn):
    (porciuncula,) = _linhas(conn, "porciuncula_prefeitura", _ANO)
    (natividade,) = _linhas(conn, "natividade_prefeitura", _ANO)
    assert porciuncula.matriculas_educacao_basica == 2001
    assert natividade.matriculas_educacao_basica == 1234


@pytest.mark.usefixtures("seed_matriculas")
def test_uma_linha_por_portal_e_ano(conn):
    total, distintos = conn.execute(
        text(
            """
            SELECT count(*), count(DISTINCT (portal_slug, ano))
            FROM analytics.fct_educacao_matriculas_metricas WHERE ano IN (:a, :b)
            """
        ),
        {"a": _ANO, "b": _ANO + 1},
    ).one()
    assert total == distintos == len(_LINHAS)


def test_portal_sem_registro_nao_aparece(conn):
    assert _linhas(conn, "porciuncula_prefeitura", _ANO) == []
