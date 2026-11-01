"""Testes de integração do mart fct_educacao_siope_metricas."""

from decimal import Decimal

import pytest
from sqlalchemy import text

_TABELA = "raw_siope.siope_indicadores"
_ANO = 2031
_ANO_PARCIAL = 2032
# Caso de referência de Porciúncula conferido pelo contador (investimento por aluno, indicador 4.9)
_REFERENCIA_PORCIUNCULA = {2024: Decimal("16789.15"), 2025: Decimal("16767.14")}

# (portal, ano, periodo, indicador, valor)
_LINHAS = [
    ("porciuncula_prefeitura", _ANO, 6, "4.9", "16789.15"),
    ("porciuncula_prefeitura", _ANO, 6, "4.8", "16789.15"),
    ("porciuncula_prefeitura", _ANO, 6, "1.1", "29.01"),
    ("porciuncula_prefeitura", _ANO, 6, "4.1", None),
    ("porciuncula_prefeitura", _ANO_PARCIAL, 4, "4.9", "5000.00"),
    ("porciuncula_prefeitura", _ANO_PARCIAL, 2, "4.9", "9999.00"),
    ("natividade_prefeitura", _ANO, 6, "4.9", "19463.73"),
]


@pytest.fixture
def seed_siope(conn):
    def limpar():
        conn.execute(text(f"DELETE FROM {_TABELA} WHERE ano IN (:a, :b)"), {"a": _ANO, "b": _ANO_PARCIAL})
        conn.commit()

    limpar()
    for portal, ano, periodo, indicador, valor in _LINHAS:
        conn.execute(
            text(
                f"""
                INSERT INTO {_TABELA}
                    (portal_slug, ano, periodo, tipo_periodo, codigo_indicador, codigo_interno_indicador,
                     unidade, nomes_oficiais_indicador, codigo_siope, valor, coletado_em)
                VALUES (:portal, :ano, :periodo, 'anual', :indicador, 1, 'monetario', 'x', '330000', :valor, now())
                """
            ),
            {"portal": portal, "ano": ano, "periodo": periodo, "indicador": indicador, "valor": valor},
        )
    conn.commit()
    yield
    limpar()


def _linha(conn, portal: str, ano: int):
    return conn.execute(
        text("SELECT * FROM analytics.fct_educacao_siope_metricas WHERE portal_slug = :p AND ano = :a"),
        {"p": portal, "a": ano},
    ).fetchall()


@pytest.mark.usefixtures("seed_siope")
def test_pivota_indicadores_e_mantem_ausente_nulo(conn):
    (linha,) = _linha(conn, "porciuncula_prefeitura", _ANO)
    assert linha.investimento_por_aluno == Decimal("16789.15")
    assert linha.investimento_por_aluno_basica == Decimal("16789.15")
    assert linha.percentual_aplicado_mde == Decimal("29.01")
    assert linha.investimento_por_aluno_infantil is None
    assert linha.investimento_por_aluno_fundamental is None
    assert linha.situacao == "encerrado"


@pytest.mark.usefixtures("seed_siope")
def test_ano_em_andamento_e_parcial_com_periodo_mais_recente(conn):
    (linha,) = _linha(conn, "porciuncula_prefeitura", _ANO_PARCIAL)
    assert linha.situacao == "parcial"
    assert linha.periodo == 4
    assert linha.investimento_por_aluno == Decimal("5000.00")


@pytest.mark.usefixtures("seed_siope")
def test_isolamento_entre_portais(conn):
    (linha,) = _linha(conn, "natividade_prefeitura", _ANO)
    assert linha.investimento_por_aluno == Decimal("19463.73")
    assert linha.percentual_aplicado_mde is None


@pytest.mark.parametrize(("ano", "esperado"), _REFERENCIA_PORCIUNCULA.items())
def test_caso_de_referencia_de_porciuncula(conn, ano, esperado):
    conn.execute(text(f"DELETE FROM {_TABELA} WHERE ano = :ano"), {"ano": ano})
    conn.execute(
        text(
            f"""
            INSERT INTO {_TABELA}
                (portal_slug, ano, periodo, tipo_periodo, codigo_indicador, codigo_interno_indicador,
                 unidade, nomes_oficiais_indicador, codigo_siope, valor, coletado_em)
            VALUES ('porciuncula_prefeitura', :ano, 6, 'anual', '4.9', 1, 'monetario', 'x', '330000', :valor, now())
            """
        ),
        {"ano": ano, "valor": esperado},
    )
    conn.commit()
    try:
        (linha,) = _linha(conn, "porciuncula_prefeitura", ano)
        assert linha.investimento_por_aluno == esperado
    finally:
        conn.execute(text(f"DELETE FROM {_TABELA} WHERE ano = :ano"), {"ano": ano})
        conn.commit()


@pytest.mark.usefixtures("seed_siope")
def test_mesmo_codigo_de_indicador_em_dois_portais_nao_se_mistura(conn):
    """Com a mesma chave (ano, período, indicador) em dois portais, cada mart enxerga só o seu valor."""
    (porciuncula,) = _linha(conn, "porciuncula_prefeitura", _ANO)
    (natividade,) = _linha(conn, "natividade_prefeitura", _ANO)
    assert porciuncula.investimento_por_aluno == Decimal("16789.15")
    assert natividade.investimento_por_aluno == Decimal("19463.73")


# Resposta real da API do SIOPE (Porciúncula, 2026, bimestral acumulado, coletada em 2026-11-01)
_ANO_REAL = 2026
_REAL_BIMESTRE_4 = {"4.9": Decimal("11325.75"), "1.1": Decimal("26.43")}


@pytest.fixture
def seed_bimestral_real(conn):
    def limpar():
        conn.execute(text(f"DELETE FROM {_TABELA} WHERE ano = :a"), {"a": _ANO_REAL})
        conn.commit()

    limpar()
    linhas = [(3, "4.9", "7804.75"), (3, "1.1", "27.58"), (4, "4.9", "11325.75"), (4, "1.1", "26.43")]
    for periodo, indicador, valor in linhas:
        conn.execute(
            text(
                f"""
                INSERT INTO {_TABELA}
                    (portal_slug, ano, periodo, tipo_periodo, codigo_indicador, codigo_interno_indicador,
                     unidade, nomes_oficiais_indicador, codigo_siope, valor, coletado_em)
                VALUES ('porciuncula_prefeitura', :ano, :periodo, 'bimestral', :indicador, 1, 'monetario', 'x',
                        '330410', :valor, now())
                """
            ),
            {"ano": _ANO_REAL, "periodo": periodo, "indicador": indicador, "valor": valor},
        )
    conn.commit()
    yield
    limpar()


@pytest.mark.usefixtures("seed_bimestral_real")
def test_ano_corrente_com_dado_real_bimestral_e_parcial(conn):
    (linha,) = _linha(conn, "porciuncula_prefeitura", _ANO_REAL)
    assert (linha.situacao, linha.periodo) == ("parcial", 4)
    assert linha.investimento_por_aluno == _REAL_BIMESTRE_4["4.9"]
    assert linha.percentual_aplicado_mde == _REAL_BIMESTRE_4["1.1"]


@pytest.mark.usefixtures("seed_bimestral_real")
def test_fechamento_substitui_linhas_parciais_antigas(conn):
    conn.execute(
        text(
            f"""
            INSERT INTO {_TABELA}
                (portal_slug, ano, periodo, tipo_periodo, codigo_indicador, codigo_interno_indicador,
                 unidade, nomes_oficiais_indicador, codigo_siope, valor, coletado_em)
            VALUES ('porciuncula_prefeitura', :ano, 6, 'anual', '4.9', 1, 'monetario', 'x', '330410', 16000.00, now())
            """
        ),
        {"ano": _ANO_REAL},
    )
    conn.commit()
    (linha,) = _linha(conn, "porciuncula_prefeitura", _ANO_REAL)
    assert (linha.situacao, linha.periodo, linha.investimento_por_aluno) == ("encerrado", 6, Decimal("16000.00"))
    assert linha.percentual_aplicado_mde is None
