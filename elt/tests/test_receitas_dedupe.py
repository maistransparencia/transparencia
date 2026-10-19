"""Testes de integração do dedupe de receitas orçamentárias em int_receitas_consolidadas."""

from decimal import Decimal

import pytest
from sqlalchemy import text

_ANO = 2030
_EMPRESA = "99"

# (codigo, fontestn, valor): fontestn vazio representa a linha total do código.
_LINHAS = [
    ("1000.00.0.0.00.00", "", "290,00"),
    ("2000.00.0.0.00.00", "", "40,00"),
    # linha total + detalhes iguais
    ("1751.50.0.1.00.00", "", "100,00"),
    ("1751.50.0.1.00.00", "1.540 1070", "100,00"),
    ("1751.50.0.1.00.00", "1.540 1071", "100,00"),
    # detalhe parcial: total maior que o detalhe
    ("1751.60.0.1.00.00", "", "100,00"),
    ("1751.60.0.1.00.00", "1.540 1070", "30,00"),
    # só detalhes
    ("1759.50.0.1.00.00", "1.540 1070", "30,00"),
    ("1759.50.0.1.00.00", "1.540 1071", "20,00"),
    ("2100.50.0.0.00.00", "", "40,00"),
    # total zero com detalhes: os detalhes valem
    ("1759.60.0.1.00.00", "", "0,00"),
    ("1759.60.0.1.00.00", "1.540 1070", "30,00"),
    ("1759.60.0.1.00.00", "1.540 1071", "10,00"),
]

_SQL_FOLHAS = """
    SELECT t.codigo, t.arrecadado
    FROM analytics.fct_receitas t
    WHERE t.portal_slug = :portal_slug AND t.tipo_receita = 'orcamentaria'
      AND t.ano = :ano AND t.empresa_id = :empresa
      AND NOT EXISTS (
        SELECT 1 FROM analytics.fct_receitas t2
        WHERE t2.portal_slug = t.portal_slug AND t2.tipo_receita = t.tipo_receita
          AND t2.ano = t.ano AND t2.empresa_id = t.empresa_id
          AND t2.codigo != t.codigo
          AND t2.codigo LIKE rtrim(t.codigo, '0.') || '%'
          AND length(rtrim(t2.codigo, '0.')) > length(rtrim(t.codigo, '0.'))
      )
"""


PORTAIS = [
    ("porciuncula_prefeitura", "raw_porciuncula_prefeitura"),
    ("natividade_prefeitura", "raw_natividade_prefeitura"),
]


@pytest.fixture(params=PORTAIS, ids=[p[0] for p in PORTAIS])
def portal(request, conn):
    portal_slug, schema = request.param
    conn.execute(
        text(f"DELETE FROM {schema}.receita_orcamentaria WHERE ano = :ano AND empresa = :empresa"),
        {"ano": str(_ANO), "empresa": _EMPRESA},
    )
    for codigo, fontestn, valor in _LINHAS:
        conn.execute(
            text(
                f"""
                INSERT INTO {schema}.receita_orcamentaria
                    (ano, empresa, codigo, fontestn, nome, arrecadado_total, previsao_atualizada)
                VALUES (:ano, :empresa, :codigo, :fontestn, 'Receita sintetica', :valor, '0,00')
                """
            ),
            {"ano": str(_ANO), "empresa": _EMPRESA, "codigo": codigo, "fontestn": fontestn, "valor": valor},
        )
    conn.commit()
    yield portal_slug
    conn.execute(
        text(f"DELETE FROM {schema}.receita_orcamentaria WHERE ano = :ano AND empresa = :empresa"),
        {"ano": str(_ANO), "empresa": _EMPRESA},
    )
    conn.commit()


def _arrecadado(conn, portal_slug: str, codigo: str) -> Decimal:
    return conn.execute(
        text(
            """
            SELECT arrecadado FROM analytics.fct_receitas
            WHERE portal_slug = :portal_slug AND tipo_receita = 'orcamentaria'
              AND ano = :ano AND empresa_id = :empresa AND codigo = :codigo
            """
        ),
        {"ano": _ANO, "empresa": _EMPRESA, "codigo": codigo, "portal_slug": portal_slug},
    ).scalar_one()


def test_linha_total_vence_detalhes_iguais(conn, portal):
    assert _arrecadado(conn, portal, "1751.50.0.1.00.00") == Decimal("100.00")


def test_linha_total_vence_detalhe_parcial(conn, portal):
    assert _arrecadado(conn, portal, "1751.60.0.1.00.00") == Decimal("100.00")


def test_sem_linha_total_soma_detalhes(conn, portal):
    assert _arrecadado(conn, portal, "1759.50.0.1.00.00") == Decimal("50.00")


def test_total_zero_com_detalhes_usa_detalhes(conn, portal):
    assert _arrecadado(conn, portal, "1759.60.0.1.00.00") == Decimal("40.00")


def test_soma_das_folhas_concilia_com_topo(conn, portal):
    folhas = conn.execute(text(_SQL_FOLHAS), {"ano": _ANO, "empresa": _EMPRESA, "portal_slug": portal}).fetchall()
    soma_folhas = sum((linha.arrecadado for linha in folhas), Decimal("0"))
    topo = _arrecadado(conn, portal, "1000.00.0.0.00.00") + _arrecadado(conn, portal, "2000.00.0.0.00.00")
    assert abs(soma_folhas - topo) <= Decimal("0.01")
