"""Testes de integração do 13º em fct_pessoal_folha_metricas."""

from decimal import Decimal

import pytest
from sqlalchemy import text

_ANO = 2041
_PORTAL = "porciuncula_prefeitura"
_OUTRO_PORTAL = "natividade_prefeitura"

# (portal, numero, elemento, tpem, descricao, empenhado, pago)
_EMPENHOS = [
    (_PORTAL, "1", "11", "OR", "FOLHA DE PAGAMENTO REFERENTE AO 13º SALÁRIO DE 2041", "1000.00", "800.00"),
    (_PORTAL, "2", "01", "OR", "FOLHA DE APOSENTADOS RELATIVO AO DÉCIMO TERCEIRO", "500.00", "500.00"),
    (_PORTAL, "3", "03", "OR", "FOLHA DE PENSIONISTAS ADIANTAMENTO DE 13 SALARIO", "200.00", "100.00"),
    # encargos patronais sobre o 13º não são 13º pago ao servidor
    (_PORTAL, "4", "13", "OR", "CONTRIBUIÇÃO PREVIDENCIÁRIA REFERENTE AO 13º", "300.00", "300.00"),
    # número solto no texto não é 13º
    (_PORTAL, "5", "04", "OR", "DFD Nº 213, CONTRATAÇÃO TEMPORÁRIA DE PROFISSIONAL", "400.00", "400.00"),
    # anulação não conta
    (_PORTAL, "6", "11", "AN", "ANULAÇÃO DE 13º SALÁRIO", "50.00", "0.00"),
    # outro portal não se mistura
    (_OUTRO_PORTAL, "1", "11", "OR", "ADIANTAMENTO DE 13º SALÁRIO", "7000.00", "7000.00"),
]


def _reconstruir_mart(pg):
    from elt.conftest import _run_dbt

    _run_dbt(pg.url(), "run", "--select", "fct_pessoal_folha_metricas", "--vars", '{"test_mode": true}')


@pytest.fixture
def seed_decimo_terceiro(conn, pg):
    def limpar():
        for portal in (_PORTAL, _OUTRO_PORTAL):
            conn.execute(
                text(f"DELETE FROM raw_{portal}.despesas_gerais WHERE ano = :ano AND empresa = '1'"),
                {"ano": str(_ANO)},
            )
        conn.commit()

    limpar()
    for portal, numero, elemento, tpem, descricao, empenhado, pago in _EMPENHOS:
        conn.execute(
            text(
                f"""
                INSERT INTO raw_{portal}.despesas_gerais
                    (ano, empresa, numero, tpem, elemento, produ, empenhado, liquidado, pago)
                VALUES (:ano, '1', :numero, :tpem, :elemento, :descricao, :empenhado, :pago, :pago)
                """
            ),
            {
                "ano": str(_ANO),
                "numero": numero,
                "tpem": tpem,
                "elemento": elemento,
                "descricao": descricao,
                "empenhado": empenhado,
                "pago": pago,
            },
        )
    conn.commit()
    _reconstruir_mart(pg)
    yield
    limpar()
    _reconstruir_mart(pg)


def _decimo_terceiro(conn, portal: str):
    return conn.execute(
        text(
            """
            SELECT sum(pago_13) AS pago_13, sum(empenhado_bruto_13) AS empenhado_bruto_13
            FROM analytics.fct_pessoal_folha_metricas
            WHERE portal_slug = :portal AND ano = :ano
            """
        ),
        {"portal": portal, "ano": _ANO},
    ).one()


@pytest.mark.usefixtures("seed_decimo_terceiro")
def test_decimo_terceiro_inclui_ativos_aposentados_e_pensionistas(conn):
    linha = _decimo_terceiro(conn, _PORTAL)
    assert linha.pago_13 == Decimal("1400.00")


@pytest.mark.usefixtures("seed_decimo_terceiro")
def test_decimo_terceiro_exclui_encargos_patronais_numero_solto_e_anulacao(conn):
    linha = _decimo_terceiro(conn, _PORTAL)
    assert linha.empenhado_bruto_13 == Decimal("1700.00")


@pytest.mark.usefixtures("seed_decimo_terceiro")
def test_decimo_terceiro_nao_cruza_portais(conn):
    assert _decimo_terceiro(conn, _OUTRO_PORTAL).pago_13 == Decimal("7000.00")
