"""Testes de integração do mart fct_educacao_matriculas_metricas."""

import pytest
from sqlalchemy import text

_TABELA = "raw_inep_censo.matriculas_rede_municipal"
_ANO = 2031

# (portal, ano, infantil, fundamental)
_LINHAS = [
    ("porciuncula_prefeitura", _ANO, 668, 1303),
    ("porciuncula_prefeitura", _ANO + 1, 650, 1300),
    ("natividade_prefeitura", _ANO, 400, 834),
]


@pytest.fixture
def seed_matriculas(conn):
    def limpar():
        conn.execute(text(f"DELETE FROM {_TABELA} WHERE ano IN (:a, :b)"), {"a": _ANO, "b": _ANO + 1})
        conn.commit()

    limpar()
    for portal, ano, infantil, fundamental in _LINHAS:
        conn.execute(
            text(
                f"""
                INSERT INTO {_TABELA}
                    (portal_slug, ano, codigo_municipio_ibge, matriculas_educacao_infantil, matriculas_ensino_fundamental,
                     coletado_em)
                VALUES (:portal, :ano, 1, :infantil, :fundamental, now())
                """
            ),
            {"portal": portal, "ano": ano, "infantil": infantil, "fundamental": fundamental},
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
    assert linha.matriculas_educacao_infantil == 668
    assert linha.matriculas_ensino_fundamental == 1303
    assert linha.matriculas_educacao_basica == 1971


@pytest.mark.usefixtures("seed_matriculas")
def test_isolamento_entre_portais_com_o_mesmo_ano(conn):
    (porciuncula,) = _linhas(conn, "porciuncula_prefeitura", _ANO)
    (natividade,) = _linhas(conn, "natividade_prefeitura", _ANO)
    assert porciuncula.matriculas_educacao_basica == 1971
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
