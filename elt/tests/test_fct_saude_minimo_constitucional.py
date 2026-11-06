"""Testes de integração dos marts fct_saude_minimo_constitucional e fct_saude_minimo_conferencia."""

from decimal import Decimal

import pytest
from sqlalchemy import text

_TABELA = "raw_siops.siops_indicadores"
_ANO_FECHADO = 2031
_ANO_SEM_DADO = 2032
_ANO_PARCIAL = 2033
_ANO_CONFERENCIA = 2034
_ANO_DIVERGENTE = 2035
_ANO_LIMITE = 2036
_ANO_UMA_VIA_NULA = 2037
_ANOS = [
    _ANO_FECHADO,
    _ANO_SEM_DADO,
    _ANO_PARCIAL,
    _ANO_CONFERENCIA,
    _ANO_DIVERGENTE,
    _ANO_LIMITE,
    _ANO_UMA_VIA_NULA,
]
_PORTAL = "porciuncula_prefeitura"
_OUTRO_PORTAL = "natividade_prefeitura"

# (portal, ano, periodo, tipo_periodo, via, indicador, unidade, valor)
_LINHAS = [
    (_PORTAL, _ANO_FECHADO, 6, "anual", "tabnet", "3.2", "percentual", "20.18"),
    (_PORTAL, _ANO_FECHADO, 6, "anual", "consulta_ano", "3.2", "percentual", "20.18"),
    (_PORTAL, _ANO_FECHADO, 6, "anual", "tabnet", "2.1", "monetario", "2520.07"),
    (_PORTAL, _ANO_FECHADO, 6, "anual", "consulta_ano", "2.1", "monetario", "2855.86"),
    (_PORTAL, _ANO_FECHADO, 6, "anual", "tabnet", "3.1", "percentual", "33.42"),
    (_PORTAL, _ANO_FECHADO, 6, "anual", "consulta_ano", "3.1", "percentual", "33.42"),
    (
        _PORTAL,
        _ANO_FECHADO,
        6,
        "anual",
        "tabnet",
        "receita_impostos_transferencias_constitucionais",
        "monetario",
        "65750268.45",
    ),
    (_PORTAL, _ANO_FECHADO, 6, "anual", "tabnet", "despesa_recursos_proprios", "monetario", "13266548.87"),
    (_PORTAL, _ANO_FECHADO, 6, "anual", "tabnet", "despesa_total_saude", "monetario", "49372023.59"),
    # 3.2 divergente entre as vias no ano de conferência não decide o mínimo
    (_OUTRO_PORTAL, _ANO_DIVERGENTE, 6, "anual", "tabnet", "3.2", "percentual", "20.00"),
    (_OUTRO_PORTAL, _ANO_DIVERGENTE, 6, "anual", "consulta_ano", "3.2", "percentual", "12.00"),
    # mesmo ano e indicador em outro portal, abaixo do mínimo
    (_OUTRO_PORTAL, _ANO_FECHADO, 6, "anual", "tabnet", "3.2", "percentual", "12.50"),
    (_OUTRO_PORTAL, _ANO_FECHADO, 6, "anual", "consulta_ano", "3.2", "percentual", "12.50"),
    # ano fechado sem transmissão: nulo, nunca zero
    (_PORTAL, _ANO_SEM_DADO, 6, "anual", "tabnet", "3.2", "percentual", None),
    (_PORTAL, _ANO_SEM_DADO, 6, "anual", "consulta_ano", "3.2", "percentual", None),
    # ano em andamento: o bimestre 2 (121,91) não vale, só o mais avançado
    (_PORTAL, _ANO_PARCIAL, 4, "bimestral", "consulta_ano", "3.2", "percentual", "30.83"),
    (_PORTAL, _ANO_PARCIAL, 2, "bimestral", "consulta_ano", "3.2", "percentual", "99.99"),
    # exatamente no mínimo cumpre; um centésimo abaixo não cumpre
    (_PORTAL, _ANO_LIMITE, 6, "anual", "tabnet", "3.2", "percentual", "15.00"),
    (_PORTAL, _ANO_LIMITE, 6, "anual", "consulta_ano", "3.2", "percentual", "15.00"),
    (_OUTRO_PORTAL, _ANO_LIMITE, 6, "anual", "tabnet", "3.2", "percentual", "14.99"),
    (_OUTRO_PORTAL, _ANO_LIMITE, 6, "anual", "consulta_ano", "3.2", "percentual", "14.99"),
    # uma via com valor e a outra sem transmissão: diverge e não decide o mínimo
    (_PORTAL, _ANO_UMA_VIA_NULA, 6, "anual", "tabnet", "3.2", "percentual", "20.00"),
    (_PORTAL, _ANO_UMA_VIA_NULA, 6, "anual", "consulta_ano", "3.2", "percentual", None),
    (_OUTRO_PORTAL, _ANO_UMA_VIA_NULA, 6, "anual", "tabnet", "3.2", "percentual", None),
    (_OUTRO_PORTAL, _ANO_UMA_VIA_NULA, 6, "anual", "consulta_ano", "3.2", "percentual", "20.00"),
    # base da conferência
    (_PORTAL, _ANO_CONFERENCIA, 6, "anual", "tabnet", "3.2", "percentual", "15.00"),
    (
        _PORTAL,
        _ANO_CONFERENCIA,
        6,
        "anual",
        "tabnet",
        "receita_impostos_transferencias_constitucionais",
        "monetario",
        "1000.00",
    ),
    (_PORTAL, _ANO_CONFERENCIA, 6, "anual", "tabnet", "despesa_recursos_proprios", "monetario", "150.00"),
]


@pytest.fixture
def seed_siops(conn):
    def limpar():
        conn.execute(text(f"DELETE FROM {_TABELA} WHERE ano = ANY(:anos)"), {"anos": _ANOS})
        conn.commit()

    limpar()
    for portal, ano, periodo, tipo, via, indicador, unidade, valor in _LINHAS:
        conn.execute(
            text(
                f"""
                INSERT INTO {_TABELA}
                    (portal_slug, ano, periodo, tipo_periodo, via, codigo_indicador, unidade, valor, coletado_em)
                VALUES (:portal, :ano, :periodo, :tipo, :via, :indicador, :unidade, :valor, now())
                """
            ),
            {
                "portal": portal,
                "ano": ano,
                "periodo": periodo,
                "tipo": tipo,
                "via": via,
                "indicador": indicador,
                "unidade": unidade,
                "valor": valor,
            },
        )
    conn.commit()
    yield
    limpar()


def _linha(conn, portal: str, ano: int, tabela: str = "fct_saude_minimo_constitucional"):
    return conn.execute(
        text(f"SELECT * FROM analytics.{tabela} WHERE portal_slug = :p AND ano = :a"), {"p": portal, "a": ano}
    ).one()


@pytest.mark.usefixtures("seed_siops")
def test_ano_fechado_usa_tabnet_no_3_2_e_consulta_no_2_1_e_3_1(conn):
    linha = _linha(conn, _PORTAL, _ANO_FECHADO)
    assert linha.situacao == "encerrado"
    assert linha.percentual_aplicado_saude == Decimal("20.18")
    assert linha.despesa_saude_por_habitante == Decimal("2855.86")
    assert linha.percentual_transferencias_saude == Decimal("33.42")
    assert linha.receita_impostos_transferencias_constitucionais == Decimal("65750268.45")
    assert linha.despesa_recursos_proprios == Decimal("13266548.87")


@pytest.mark.usefixtures("seed_siops")
def test_minimo_vem_do_seed_e_so_compara_ano_encerrado(conn):
    linha = _linha(conn, _PORTAL, _ANO_FECHADO)
    assert linha.minimo_aplicacao_saude_percentual == Decimal("15.00")
    assert linha.cumpre_minimo is True
    assert _linha(conn, _OUTRO_PORTAL, _ANO_FECHADO).cumpre_minimo is False


@pytest.mark.usefixtures("seed_siops")
def test_ano_em_andamento_e_parcial_e_nunca_comparado_com_o_minimo(conn):
    linha = _linha(conn, _PORTAL, _ANO_PARCIAL)
    assert linha.situacao == "parcial"
    assert linha.periodo == 4
    assert linha.percentual_aplicado_saude == Decimal("30.83")
    assert linha.cumpre_minimo is None


@pytest.mark.usefixtures("seed_siops")
def test_sem_transmissao_e_nulo_nunca_zero(conn):
    linha = _linha(conn, _PORTAL, _ANO_SEM_DADO)
    assert linha.situacao == "sem_dado"
    assert linha.percentual_aplicado_saude is None
    assert linha.cumpre_minimo is None


@pytest.mark.usefixtures("seed_siops")
def test_divergencia_entre_vias_fica_exposta_sem_escolha_silenciosa(conn):
    linha = _linha(conn, _PORTAL, _ANO_FECHADO)
    assert linha.divergencia_entre_vias is True
    assert linha.indicadores_divergentes == "despesa_saude_por_habitante"
    assert _linha(conn, _OUTRO_PORTAL, _ANO_FECHADO).divergencia_entre_vias is False
    assert _linha(conn, _PORTAL, _ANO_PARCIAL).divergencia_entre_vias is False


@pytest.mark.usefixtures("seed_siops")
def test_isolamento_entre_portais(conn):
    assert _linha(conn, _PORTAL, _ANO_FECHADO).percentual_aplicado_saude == Decimal("20.18")
    assert _linha(conn, _OUTRO_PORTAL, _ANO_FECHADO).percentual_aplicado_saude == Decimal("12.50")


@pytest.fixture
def seed_receitas_e_despesas(conn):
    """Receita e despesa sintéticas do ano de conferência: 3 linhas de receita contam, 4 não, 1 despesa conta."""
    schema = f"raw_{_PORTAL}"
    receitas = [
        ("1110.00.0.0.00.00", "", "600,00"),  # impostos municipais: conta
        ("1711.51.1.1.00.00", "", "300,00"),  # FPM: conta
        ("1711.51.1.1.00.01", "1.500 0000", "300,00"),  # filha repetida do FPM: não soma em dobro
        ("1721.53.0.1.00.00", "", "50,00"),  # CIDE: fora da base legal
        ("1711.51.2.1.00.00", "", "200,00"),  # FPM cota extraordinária: fora (art. 7º cita só a alínea b)
        ("1729.53.0.1.00.00", "", "100,00"),  # compensação do ICMS: dentro (art. 9º)
        ("1713.00.0.0.00.00", "", "900,00"),  # SUS: fora da base
    ]
    for codigo, fontestn, valor in receitas:
        conn.execute(
            text(
                f"""
                INSERT INTO {schema}.receita_orcamentaria
                    (ano, empresa, codigo, fontestn, nome, arrecadado_total, previsao_atualizada)
                VALUES (:ano, '98', :codigo, :fontestn, 'Receita sintetica', :valor, '0,00')
                """
            ),
            {"ano": str(_ANO_CONFERENCIA), "codigo": codigo, "fontestn": fontestn, "valor": valor},
        )
    despesas = [
        ("1", "10", "Saúde", "Receitas de Impostos e Transf. de Impostos", "180,00"),
        ("2", "10", "Saúde", "SUS - Bloco de Custeio", "700,00"),
        ("3", "12", "Educação", "IMPOSTOS E TRANSF. DE IMPOSTOS", "500,00"),
    ]
    for numero, funcao, funcao_nome, fonte, liquidado in despesas:
        conn.execute(
            text(
                f"""
                INSERT INTO {schema}.despesas_gerais
                    (ano, empresa, numero, funcao, funcaonome, descfonrec, empenhado, liquidado, pago)
                VALUES (:ano, '98', :numero, :funcao, :funcao_nome, :fonte, :valor, :valor, :valor)
                """
            ),
            {
                "ano": _ANO_CONFERENCIA,
                "numero": numero,
                "funcao": funcao,
                "funcao_nome": funcao_nome,
                "fonte": fonte,
                "valor": liquidado,
            },
        )
    conn.commit()
    yield
    conn.execute(
        text(f"DELETE FROM {schema}.receita_orcamentaria WHERE ano = :ano AND empresa = '98'"),
        {"ano": str(_ANO_CONFERENCIA)},
    )
    conn.execute(
        text(f"DELETE FROM {schema}.despesas_gerais WHERE ano = :ano AND empresa = '98'"), {"ano": _ANO_CONFERENCIA}
    )
    conn.commit()


@pytest.mark.usefixtures("seed_siops", "seed_receitas_e_despesas")
def test_conferencia_usa_so_codigos_da_base_e_expoe_a_diferenca_por_ponta(conn):
    linha = _linha(conn, _PORTAL, _ANO_CONFERENCIA, "fct_saude_minimo_conferencia")
    assert linha.receita_base_calculo_proprio == Decimal("1000.00")
    assert linha.despesa_recursos_proprios_calculo_proprio == Decimal("180.00")
    assert linha.percentual_aplicado_saude_calculo_proprio == Decimal("18.00")
    assert linha.percentual_aplicado_saude_siops == Decimal("15.00")
    assert linha.diferenca_receita_base == Decimal("0.00")
    assert linha.diferenca_despesa_recursos_proprios == Decimal("30.00")
    assert linha.diferenca_percentual_pontos == Decimal("3.00")


@pytest.mark.usefixtures("seed_receitas_e_despesas")
def test_conferencia_sem_siops_mantem_o_calculo_proprio_e_deixa_a_diferenca_nula(conn):
    linha = _linha(conn, _PORTAL, _ANO_CONFERENCIA, "fct_saude_minimo_conferencia")
    assert linha.percentual_aplicado_saude_calculo_proprio == Decimal("18.00")
    assert linha.percentual_aplicado_saude_siops is None
    assert linha.diferenca_percentual_pontos is None


@pytest.mark.usefixtures("seed_siops")
def test_minimo_divergente_entre_vias_nao_decide_cumprimento(conn):
    linha = _linha(conn, _OUTRO_PORTAL, _ANO_DIVERGENTE)
    assert linha.situacao == "encerrado"
    assert linha.divergencia_entre_vias is True
    assert linha.cumpre_minimo is None


@pytest.mark.usefixtures("seed_siops")
def test_minimo_exato_cumpre_e_um_centesimo_abaixo_nao_cumpre(conn):
    assert _linha(conn, _PORTAL, _ANO_LIMITE).cumpre_minimo is True
    assert _linha(conn, _OUTRO_PORTAL, _ANO_LIMITE).cumpre_minimo is False


@pytest.mark.usefixtures("seed_siops")
def test_uma_via_sem_valor_diverge_e_nao_decide_o_minimo(conn):
    tabnet_com_valor = _linha(conn, _PORTAL, _ANO_UMA_VIA_NULA)
    assert tabnet_com_valor.situacao == "encerrado"
    assert tabnet_com_valor.divergencia_entre_vias is True
    assert tabnet_com_valor.indicadores_divergentes == "percentual_aplicado_saude"
    assert tabnet_com_valor.cumpre_minimo is None

    consulta_com_valor = _linha(conn, _OUTRO_PORTAL, _ANO_UMA_VIA_NULA)
    assert consulta_com_valor.situacao == "sem_dado"
    assert consulta_com_valor.divergencia_entre_vias is True
    assert consulta_com_valor.cumpre_minimo is None
