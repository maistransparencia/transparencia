from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from elt.core.config import PortalConfig
from elt.extract.siops import (
    VIA_CONSULTA_ANO,
    VIA_TABNET,
    SiopsError,
    SiopsExtractor,
    codigo_siops,
    divergencias_entre_vias,
    extrair_siops,
    parse_consulta_ano,
    parse_tabnet,
    validar_faixa,
    vias_incompletas,
)

INCREMENTO = "D.R.Próprios"


def _tabnet(linhas_extras: list[str], total_municipios: int = 1200, rotulo: str = "D.R.Pr&oacute;prios") -> str:
    base = [f'"{100000 + i} Cidade {i}";{1000 + i},50' for i in range(total_municipios)]
    corpo = "\n".join([f'"Munic-BR";"{rotulo}"', *base, *linhas_extras, '"Total";9999,00', "&"])
    return f"<html><body><PRE>\n{corpo}\n</PRE></body></html>"


def _consulta(
    codigo="330410", ano=2024, bimestre=6, indicadores=("2.1", "3.1", "3.2"), valores=None, repetir=None
) -> str:
    valores = valores or {"2.1": "R$ 2.855,86", "3.1": "33,42         %", "3.2": "20,18         %"}
    linhas = "".join(
        f'<tr><td class="td2 tdc linha">{c}</td><td class="td2 caixa">nome</td>'
        f'<td class="tdr caixa">\n  {valores[c]} &nbsp;</td></tr>'
        for c in [*indicadores, *([repetir] if repetir else [])]
    )
    return (
        f"<div>Ano-Base: {ano} - {bimestre}º Bimestre <br>Munic&iacute;pio: X - RJ <br>Código: {codigo}</div>"
        f'<table class="tdexterno">{linhas}</table>'
    )


def test_parse_tabnet_filtra_decodifica_e_trata_indisponivel_como_nulo():
    corpo = _tabnet(['"330410 Porci&uacute;ncula";13266548,87', '"330310 Natividade";...'])
    dados = parse_tabnet(corpo, INCREMENTO)
    assert dados["330410"] == Decimal("13266548.87")
    assert dados["330310"] is None
    assert "Total" not in dados


def test_parse_tabnet_entidade_com_ponto_e_virgula_no_nome_nao_desloca_colunas():
    dados = parse_tabnet(_tabnet(['"330410 Porci&uacute;ncula";13266548,87']), INCREMENTO)
    assert dados["330410"] == Decimal("13266548.87")


@pytest.mark.parametrize(
    "corpo",
    [
        "<html>sem dados</html>",
        _tabnet([], rotulo="Outro indicador"),
        _tabnet([], total_municipios=10),
        _tabnet(['"330410 X";abc']),
        _tabnet(['"sem codigo";1,00']),
        _tabnet(['"330410 A";1,00', '"330410 B";2,00']),
    ],
)
def test_parse_tabnet_formato_inesperado_falha(corpo):
    with pytest.raises(SiopsError):
        parse_tabnet(corpo, INCREMENTO)


def test_parse_consulta_ano_le_percentual_e_monetario():
    dados = parse_consulta_ano(_consulta(), "330410", 2024, 6)
    assert dados == {"2.1": Decimal("2855.86"), "3.1": Decimal("33.42"), "3.2": Decimal("20.18")}


def test_parse_consulta_ano_nao_houve_transmissao_e_sem_dado():
    corpo = '<span>Não houve transmissão de dados do município "X - RJ" selecionado.</span>'
    assert parse_consulta_ano(corpo, "330410", 2026, 6) is None


@pytest.mark.parametrize(
    "corpo",
    [
        "<html>pagina sem tabela</html>",
        _consulta(codigo="330310"),
        _consulta(ano=2023),
        _consulta(bimestre=4),
        _consulta(indicadores=("2.1", "3.2")),
        _consulta(repetir="3.2"),
        _consulta(valores={"2.1": "R$ 1,00", "3.1": "x %", "3.2": "1,00 %"}),
    ],
)
def test_parse_consulta_ano_contrato_quebrado_falha(corpo):
    with pytest.raises(SiopsError):
        parse_consulta_ano(corpo, "330410", 2024, 6)


def test_validar_faixa_rejeita_percentual_fora_de_0_a_100_e_negativo():
    assert validar_faixa(Decimal("100"), "percentual", "x") == Decimal("100")
    assert validar_faixa(None, "percentual", "x") is None
    with pytest.raises(SiopsError):
        validar_faixa(Decimal("121.91"), "percentual", "x")
    with pytest.raises(SiopsError):
        validar_faixa(Decimal("-1"), "monetario", "x")


def test_codigo_siops_remove_digito_verificador():
    assert codigo_siops(3304102) == "330410"
    with pytest.raises(SiopsError):
        codigo_siops(123)


def test_divergencias_entre_vias_so_aponta_valores_diferentes_nas_duas_vias():
    def linha(via, indicador, valor):
        return {
            "portal_slug": "p",
            "ano": 2024,
            "periodo": 6,
            "via": via,
            "codigo_indicador": indicador,
            "valor": valor,
        }

    linhas = [
        linha(VIA_TABNET, "2.1", Decimal("2520.07")),
        linha(VIA_CONSULTA_ANO, "2.1", Decimal("2599.65")),
        linha(VIA_TABNET, "3.2", Decimal("20.18")),
        linha(VIA_CONSULTA_ANO, "3.2", Decimal("20.18")),
        linha(VIA_TABNET, "3.1", None),
        linha(VIA_CONSULTA_ANO, "3.1", Decimal("33.42")),
    ]
    ((indicador, descricao),) = divergencias_entre_vias(linhas)
    assert indicador == "2.1"
    assert "indicador 2.1" in descricao


def test_vias_incompletas_aponta_so_valor_em_uma_via_e_nao_diverge():
    def linha(via, indicador, valor):
        return {
            "portal_slug": "p",
            "ano": 2024,
            "periodo": 6,
            "via": via,
            "codigo_indicador": indicador,
            "valor": valor,
        }

    linhas = [
        linha(VIA_TABNET, "3.2", Decimal("20.00")),
        linha(VIA_CONSULTA_ANO, "3.2", None),
        linha(VIA_TABNET, "3.1", None),
        linha(VIA_CONSULTA_ANO, "3.1", None),
        linha(VIA_TABNET, "2.1", Decimal("1.00")),
        linha(VIA_CONSULTA_ANO, "2.1", Decimal("1.00")),
    ]
    (descricao,) = vias_incompletas(linhas)
    assert "indicador 3.2" in descricao
    assert divergencias_entre_vias(linhas) == []


def test_tabnet_ainda_nao_publicado_aborta_com_mensagem_clara():
    portal = PortalConfig.load("porciuncula_prefeitura")
    extrator = SiopsExtractor(min_interval_seconds=0)
    with (
        patch.object(extrator, "baixar_tabnet", side_effect=SiopsError("sem tabela")),
        pytest.raises(SiopsError, match="TABNET de 2024 indisponível ou ainda não publicado"),
    ):
        extrator.extrair([portal], [2024])


def _resp(corpo: str, status: int = 200):
    resp = MagicMock()
    resp.status_code = status
    resp.content = corpo.encode("latin1", errors="replace")
    return resp


def test_post_codifica_em_latin1_e_repete_so_em_falha_transitoria():
    extrator = SiopsExtractor(min_interval_seconds=0, max_retries=2)
    with (
        patch("elt.extract.siops.requests.post", side_effect=[_resp("", 503), _resp("ok")]) as post,
        patch("elt.extract.siops.time.sleep"),
    ):
        assert extrator._post("http://x", [("Incremento", "D.R.Próprios")]) == "ok"
    assert post.call_args.kwargs["data"] == b"Incremento=D.R.Pr%F3prios"


def test_post_http_nao_transitorio_falha_sem_repetir():
    extrator = SiopsExtractor(min_interval_seconds=0)
    with patch("elt.extract.siops.requests.post", return_value=_resp("", 404)) as post:
        with pytest.raises(SiopsError):
            extrator._post("http://x", [])
    assert post.call_count == 1


def test_extrair_ano_fechado_grava_as_duas_vias_e_ano_corrente_so_o_bimestre_mais_avancado():
    portal = PortalConfig.load("porciuncula_prefeitura")
    extrator = SiopsExtractor(min_interval_seconds=0)
    ano_corrente = 2026

    def consulta(cod_ibge, ano, periodo):
        if ano < ano_corrente:
            return {"2.1": Decimal("1"), "3.1": Decimal("2"), "3.2": Decimal("20.18")}
        return {"2.1": Decimal("1"), "3.1": Decimal("2"), "3.2": Decimal("30.83")} if periodo == 4 else None

    with (
        patch("elt.extract.siops.date") as data,
        patch.object(SiopsExtractor, "baixar_tabnet", return_value={"330410": Decimal("20.18")}),
        patch.object(SiopsExtractor, "consultar_ano", side_effect=consulta),
    ):
        data.today.return_value.year = ano_corrente
        linhas = extrator.extrair([portal], [2024, ano_corrente])

    fechado = [item for item in linhas if item["ano"] == 2024]
    assert {item["via"] for item in fechado} == {VIA_TABNET, VIA_CONSULTA_ANO}
    assert all(item["tipo_periodo"] == "anual" and item["periodo"] == 6 for item in fechado)
    parcial = [item for item in linhas if item["ano"] == ano_corrente]
    assert {(item["tipo_periodo"], item["periodo"], item["via"]) for item in parcial} == {
        ("bimestral", 4, VIA_CONSULTA_ANO)
    }


def test_extrair_ano_fechado_sem_transmissao_grava_nulo_nunca_zero():
    portal = PortalConfig.load("porciuncula_prefeitura")
    with (
        patch.object(SiopsExtractor, "baixar_tabnet", return_value={"330410": None}),
        patch.object(SiopsExtractor, "consultar_ano", return_value=None),
    ):
        linhas = SiopsExtractor(min_interval_seconds=0).extrair([portal], [2024])
    assert linhas and all(item["valor"] is None for item in linhas)


def test_extrair_municipio_ausente_no_tabnet_falha():
    portal = PortalConfig.load("porciuncula_prefeitura")
    with (
        patch.object(SiopsExtractor, "baixar_tabnet", return_value={"999999": Decimal("1")}),
        patch.object(SiopsExtractor, "consultar_ano", return_value=None),
        pytest.raises(SiopsError),
    ):
        SiopsExtractor(min_interval_seconds=0).extrair([portal], [2024])


def test_extrair_siops_devolve_linhas_do_extrator():
    portal = PortalConfig.load("porciuncula_prefeitura")
    extrator = MagicMock()
    extrator.extrair.return_value = [{"x": 1}, {"x": 2}]
    assert extrair_siops([portal], [2024], extractor=extrator) == [{"x": 1}, {"x": 2}]


def test_extrair_divergencia_do_minimo_entre_vias_falha_e_a_dos_demais_so_avisa():
    portal = PortalConfig.load("porciuncula_prefeitura")

    def consulta(percentual_aplicado, despesa_por_habitante):
        return lambda *_: {
            "2.1": Decimal(despesa_por_habitante),
            "3.1": Decimal("2"),
            "3.2": Decimal(percentual_aplicado),
        }

    def tabnet(self, ano, incremento):
        valores = {"3.2_%R.Próprios_em_Saúde-EC_29": "20.18", "2.1_D.Total_Saúde/Hab": "10"}
        return {"330410": Decimal(valores.get(incremento, "2"))}

    with patch.object(SiopsExtractor, "baixar_tabnet", tabnet):
        with patch.object(SiopsExtractor, "consultar_ano", side_effect=consulta("20.18", "99")):
            linhas = SiopsExtractor(min_interval_seconds=0).extrair([portal], [2024])
        assert linhas
        with patch.object(SiopsExtractor, "consultar_ano", side_effect=consulta("22.00", "10")):
            with pytest.raises(SiopsError, match="mínimo de saúde"):
                SiopsExtractor(min_interval_seconds=0).extrair([portal], [2024])
