"""Testes de integração do 13º em fct_pessoal_folha_metricas."""

from decimal import Decimal

import pytest
from sqlalchemy import text

_ANO = 2041
_PORTAL = "porciuncula_prefeitura"
_OUTRO_PORTAL = "natividade_prefeitura"

# (portal, numero, elemento, tpem, descricao, empenhado, pago, datae)
_EMPENHOS = [
    (
        _PORTAL,
        "1",
        "11",
        "OR",
        "FOLHA DE PAGAMENTO REFERENTE AO 13º SALÁRIO DE 2041",
        "1000.00",
        "800.00",
        "12/08/2041",
    ),
    (_PORTAL, "2", "01", "OR", "FOLHA DE APOSENTADOS RELATIVO AO DÉCIMO TERCEIRO", "500.00", "500.00", "10/06/2041"),
    (_PORTAL, "3", "03", "OR", "FOLHA DE PENSIONISTAS ADIANTAMENTO DE 13 SALARIO", "200.00", "100.00", "15/09/2041"),
    # encargos patronais sobre o 13º não são 13º pago ao servidor
    (_PORTAL, "4", "13", "OR", "CONTRIBUIÇÃO PREVIDENCIÁRIA REFERENTE AO 13º", "300.00", "300.00", "10/06/2041"),
    # número solto no texto não é 13º
    (_PORTAL, "5", "04", "OR", "DFD Nº 213, CONTRATAÇÃO TEMPORÁRIA DE PROFISSIONAL", "400.00", "400.00", "10/06/2041"),
    # sem data do empenho, o mês vem da coluna mes
    (_PORTAL, "7", "11", "OR", "13º SALÁRIO SEM DATA DO EMPENHO", "60.00", "60.00", "", "07"),
    # folha comum mais recente: define até que mês o ano pode ser comparado
    (_PORTAL, "8", "11", "OR", "FOLHA DE PAGAMENTO MENSAL", "900.00", "900.00", "20/11/2041"),
    # anulação não conta
    (_PORTAL, "6", "11", "AN", "ANULAÇÃO DE 13º SALÁRIO", "50.00", "0.00", "10/06/2041"),
    # outro portal não se mistura
    (_OUTRO_PORTAL, "1", "11", "OR", "ADIANTAMENTO DE 13º SALÁRIO", "7000.00", "7000.00", "10/06/2041"),
]


def _reconstruir_mart(pg):
    from elt.conftest import _run_dbt

    _run_dbt(
        pg.url(),
        "run",
        "--select",
        "fct_pessoal_folha_metricas",
        "fct_pessoal_decimo_terceiro_mensal",
        "--vars",
        '{"test_mode": true}',
    )


@pytest.fixture
def seed_decimo_terceiro(conn, pg):
    def limpar():
        for portal in (_PORTAL, _OUTRO_PORTAL):
            conn.execute(
                text(
                    "DELETE FROM raw_fiorilli.despesas_gerais WHERE portal_slug = :portal_slug AND ano = :ano AND empresa = '1'"
                ),
                {"portal_slug": portal, "ano": str(_ANO)},
            )
        conn.commit()

    limpar()
    for portal, numero, elemento, tpem, descricao, empenhado, pago, datae, *resto in _EMPENHOS:
        conn.execute(
            text(
                """
                INSERT INTO raw_fiorilli.despesas_gerais
                    (portal_slug, ano, empresa, numero, tpem, elemento, produ, empenhado, liquidado, pago, datae, mes)
                VALUES (:portal_slug, :ano, '1', :numero, :tpem, :elemento, :descricao, :empenhado, :pago, :pago, :datae, :mes)
                """
            ),
            {
                "portal_slug": portal,
                "ano": str(_ANO),
                "numero": numero,
                "tpem": tpem,
                "elemento": elemento,
                "descricao": descricao,
                "empenhado": empenhado,
                "pago": pago,
                "datae": datae,
                "mes": resto[0] if resto else None,
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
    assert linha.pago_13 == Decimal("1460.00")


@pytest.mark.usefixtures("seed_decimo_terceiro")
def test_decimo_terceiro_exclui_encargos_patronais_numero_solto_e_anulacao(conn):
    linha = _decimo_terceiro(conn, _PORTAL)
    assert linha.empenhado_bruto_13 == Decimal("1760.00")


@pytest.mark.usefixtures("seed_decimo_terceiro")
def test_decimo_terceiro_nao_cruza_portais(conn):
    assert _decimo_terceiro(conn, _OUTRO_PORTAL).pago_13 == Decimal("7000.00")


@pytest.mark.usefixtures("seed_decimo_terceiro")
def test_decimo_terceiro_mensal_divide_ativos_e_inativos_pelo_elemento(conn):
    linhas = conn.execute(
        text(
            """
            SELECT grupo_beneficiario, mes_empenho, pago_13
            FROM analytics.fct_pessoal_decimo_terceiro_mensal
            WHERE portal_slug = :portal AND ano = :ano
            ORDER BY grupo_beneficiario, mes_empenho
            """
        ),
        {"portal": _PORTAL, "ano": _ANO},
    ).all()
    assert [(linha.grupo_beneficiario, linha.mes_empenho, linha.pago_13) for linha in linhas] == [
        ("ativos", 7, Decimal("60.00")),
        ("ativos", 8, Decimal("800.00")),
        ("inativos_pensionistas", 6, Decimal("500.00")),
        ("inativos_pensionistas", 9, Decimal("100.00")),
    ]


@pytest.mark.usefixtures("seed_decimo_terceiro")
def test_decimo_terceiro_mensal_soma_igual_ao_pago_13_do_mart(conn):
    soma = conn.execute(
        text(
            """
            SELECT sum(pago_13) AS pago_13
            FROM analytics.fct_pessoal_decimo_terceiro_mensal
            WHERE portal_slug = :portal AND ano = :ano
            """
        ),
        {"portal": _PORTAL, "ano": _ANO},
    ).scalar_one()
    assert soma == _decimo_terceiro(conn, _PORTAL).pago_13


@pytest.mark.usefixtures("seed_decimo_terceiro")
def test_decimo_terceiro_mensal_ultimo_registro_vem_de_qualquer_despesa(conn):
    meses = (
        conn.execute(
            text(
                """
            SELECT DISTINCT mes_ultimo_registro
            FROM analytics.fct_pessoal_decimo_terceiro_mensal
            WHERE portal_slug = :portal AND ano = :ano
            """
            ),
            {"portal": _PORTAL, "ano": _ANO},
        )
        .scalars()
        .all()
    )
    assert meses == [11]
