from unittest.mock import MagicMock, patch

import pytest
from elt.core.config import PortalConfig
from elt.extract.siope import (
    INDICADORES_POR_GRUPO,
    SiopeError,
    SiopeExtractor,
    codigo_siope,
    codigo_uf,
    extract_and_load_siope,
)

IDS = {"1.1": 24, "1.2": 67, "4.1": 44, "4.2": 45, "4.8": 56, "4.9": 57}


def _resp(content, status=200, ok=True):
    resp = MagicMock()
    resp.status_code = status
    resp.json.return_value = {"status": ok, "message": "ok", "content": content}
    return resp


def _linha(exib, ano=2024, valor=1.5, ente=0, periodo=6):
    return {"codEnte": ente, "numAno": ano, "numPeri": periodo, "codIndi": IDS[exib], "codExib": exib, "valIndi": valor}


def _lista(grupo):
    tipo_valor = "P" if grupo == 1 else "M"
    return [
        {"codGrupIndi": grupo, "codIndi": IDS[c], "codExib": c, "idnTipoValr": tipo_valor, "nomIndi": f"nome {c}"}
        for c in INDICADORES_POR_GRUPO[grupo]
    ]


def _portal():
    return PortalConfig.load("porciuncula_prefeitura")


def _fake_request(linhas_por_grupo, bimestrais_por_grupo=None):
    def fake(self, method, params, body=None):
        if method == "GET":
            return _lista(params["codGrupIndi"])
        bimestral = body["tpPeriodo"] == "B"
        fonte = (bimestrais_por_grupo or {}) if bimestral else linhas_por_grupo
        return self.validar_linhas(
            fonte.get(body["codGrupIndi"], []),
            {c: IDS[c] for c in INDICADORES_POR_GRUPO[body["codGrupIndi"]]},
            body["numAno"],
            tuple(body["numPeri"]),
        )

    return fake


def test_codigo_siope_remove_digito_verificador():
    assert codigo_siope(3304102) == "330410"
    assert codigo_uf(3304102) == 33


def test_codigo_siope_invalido():
    with pytest.raises(SiopeError):
        codigo_siope(123)


def test_extrai_um_registro_por_indicador_com_portal_e_codigo():
    portal = _portal()
    dados = {g: [_linha(c) for c in cs] for g, cs in INDICADORES_POR_GRUPO.items()}
    with patch.object(SiopeExtractor, "_request", _fake_request(dados)):
        rows = SiopeExtractor(min_interval_seconds=0).extrair_portal(portal, [2024])
    assert len(rows) == 6
    assert {r["portal_slug"] for r in rows} == {portal.slug}
    assert {r["codigo_siope"] for r in rows} == {codigo_siope(portal.cod_ibge)}
    assert {r["codigo_indicador"] for r in rows} == set(IDS)


def test_registro_traz_procedencia_do_indicador():
    dados = {g: [_linha(c) for c in cs] for g, cs in INDICADORES_POR_GRUPO.items()}
    with patch.object(SiopeExtractor, "_request", _fake_request(dados)):
        rows = {
            r["codigo_indicador"]: r for r in SiopeExtractor(min_interval_seconds=0).extrair_portal(_portal(), [2024])
        }
    assert rows["1.1"]["unidade"] == "percentual"
    assert rows["4.9"]["unidade"] == "monetario"
    assert rows["4.9"]["nomes_oficiais_indicador"] == "nome 4.9"
    assert {r["tipo_periodo"] for r in rows.values()} == {"anual"}
    assert {r["periodo"] for r in rows.values()} == {6}


def test_resolver_junta_nomes_oficiais_distintos_do_mesmo_codigo():
    itens = _lista(1) + [
        {"codGrupIndi": 1, "codIndi": 24, "codExib": "1.1", "idnTipoValr": "P", "nomIndi": "outro nome"},
        {"codGrupIndi": 1, "codIndi": 24, "codExib": "1.1", "idnTipoValr": "P", "nomIndi": "outro nome"},
    ]
    with patch.object(SiopeExtractor, "_request", return_value=itens):
        meta = SiopeExtractor(min_interval_seconds=0).resolver_indicadores(1, ("1.1", "1.2"))
    assert meta["1.1"]["nomes_oficiais"] == "nome 1.1 | outro nome"
    assert meta["1.1"]["codigo_interno"] == 24


def test_resolver_rejeita_tipo_de_valor_desconhecido():
    itens = [{"codGrupIndi": 1, "codIndi": 24, "codExib": "1.1", "idnTipoValr": "X", "nomIndi": "n"}]
    with patch.object(SiopeExtractor, "_request", return_value=itens):
        with pytest.raises(SiopeError, match="inconsistentes"):
            SiopeExtractor(min_interval_seconds=0).resolver_indicadores(1, ("1.1",))


def test_indicador_ausente_aborta():
    dados = {1: [_linha("1.1")], 4: [_linha(c) for c in INDICADORES_POR_GRUPO[4]]}
    with patch.object(SiopeExtractor, "_request", _fake_request(dados)):
        with pytest.raises(SiopeError, match="ausentes"):
            SiopeExtractor(min_interval_seconds=0).extrair_portal(_portal(), [2024])


def test_ano_sem_dados_e_ignorado_com_aviso():
    dados = {g: [_linha(c) for c in cs] for g, cs in INDICADORES_POR_GRUPO.items()}
    with patch.object(SiopeExtractor, "_request", _fake_request(dados)):
        rows = SiopeExtractor(min_interval_seconds=0).extrair_portal(_portal(), [2024, 2099])
    assert {r["ano"] for r in rows} == {2024}


def test_sem_nenhum_dado_aborta():
    dados = {1: [], 4: []}
    with patch.object(SiopeExtractor, "_request", _fake_request(dados)):
        with pytest.raises(SiopeError):
            SiopeExtractor(min_interval_seconds=0).extrair_portal(_portal(), [2024])


def test_linha_duplicada_indica_resposta_agregada():
    with pytest.raises(SiopeError, match="repetido"):
        SiopeExtractor.validar_linhas([_linha("4.9"), _linha("4.9")], {"4.9": 57}, [2024])


def test_linha_fora_do_pedido_ou_sem_campo():
    with pytest.raises(SiopeError):
        SiopeExtractor.validar_linhas([_linha("4.8")], {"4.9": 57}, [2024])
    with pytest.raises(SiopeError):
        SiopeExtractor.validar_linhas([{"numAno": 2024}], {"4.9": 57}, [2024])


def test_valor_nulo_permanece_nulo():
    rows = SiopeExtractor.validar_linhas([_linha("4.9", valor=None)], {"4.9": 57}, [2024])
    assert rows[0]["valIndi"] is None


def test_resposta_html_nao_json_levanta_erro():
    resp = MagicMock()
    resp.status_code = 200
    resp.json.side_effect = ValueError("html")
    with patch("requests.request", return_value=resp) as req:
        with pytest.raises(SiopeError, match="erro 99"):
            SiopeExtractor(min_interval_seconds=0)._request("GET", {})
    assert req.call_count == 1


def test_requisicao_envia_headers_e_corpo_do_municipio_unico():
    portal = _portal()
    chamadas = []

    def fake_request(method, url, params=None, json=None, headers=None, timeout=None):
        chamadas.append((method, params, json, headers))
        if method == "GET":
            return _resp(_lista(params["codGrupIndi"]))
        return _resp([_linha(c) for c in INDICADORES_POR_GRUPO[json["codGrupIndi"]]])

    with patch("requests.request", side_effect=fake_request):
        SiopeExtractor(min_interval_seconds=0).extrair_portal(portal, [2024])
    post = next(c for c in chamadas if c[0] == "POST")
    assert post[2]["codMuni"] == [int(codigo_siope(portal.cod_ibge))]
    assert post[2]["codUF"] == [codigo_uf(portal.cod_ibge)]
    assert "Referer" in post[3] and "User-Agent" in post[3]


def test_retry_em_falha_transitoria():
    with patch("requests.request", side_effect=[_resp([], status=503), _resp([])]), patch("time.sleep"):
        assert SiopeExtractor(min_interval_seconds=0)._request("GET", {}) == []


def test_extract_and_load_sem_db_nao_grava():
    dados = {g: [_linha(c) for c in cs] for g, cs in INDICADORES_POR_GRUPO.items()}
    with patch.object(SiopeExtractor, "_request", _fake_request(dados)):
        assert extract_and_load_siope(_portal(), [2024], db=None, extractor=SiopeExtractor(min_interval_seconds=0)) == 6


def _bimestres(ano, periodos, omitir=()):
    return {
        g: [_linha(c, ano=ano, periodo=p) for p in periodos for c in cs if (c, p) not in omitir]
        for g, cs in INDICADORES_POR_GRUPO.items()
    }


def test_ano_sem_fechamento_grava_bimestre_mais_avancado_completo():
    anuais = {g: [_linha(c, ano=2024) for c in cs] for g, cs in INDICADORES_POR_GRUPO.items()}
    # 4.9 ausente no 1º bimestre e todo o 5º ainda sem linhas, como na API real
    bimestrais = _bimestres(2026, [1, 2, 3, 4], omitir={("4.9", 1)})
    with patch.object(SiopeExtractor, "_request", _fake_request(anuais, bimestrais)):
        rows = SiopeExtractor(min_interval_seconds=0).extrair_portal(_portal(), [2024, 2026])
    anual = [r for r in rows if r["ano"] == 2024]
    parcial = [r for r in rows if r["ano"] == 2026]
    assert {(r["periodo"], r["tipo_periodo"]) for r in anual} == {(6, "anual")}
    assert {(r["periodo"], r["tipo_periodo"]) for r in parcial} == {(4, "bimestral")}
    assert len(parcial) == len(IDS)


def test_bimestre_incompleto_cai_para_o_anterior_completo():
    bimestrais = _bimestres(2026, [2, 3], omitir=set())
    bimestrais[4] = bimestrais[4] + [_linha("4.9", ano=2026, periodo=4)]
    with patch.object(SiopeExtractor, "_request", _fake_request({1: [], 4: []}, bimestrais)):
        rows = SiopeExtractor(min_interval_seconds=0).extrair_portal(_portal(), [2026])
    assert {r["periodo"] for r in rows} == {3}


def test_ano_com_fechamento_ignora_bimestres():
    anuais = {g: [_linha(c, ano=2024) for c in cs] for g, cs in INDICADORES_POR_GRUPO.items()}
    bimestrais = _bimestres(2024, [1, 2, 3])
    with patch.object(SiopeExtractor, "_request", _fake_request(anuais, bimestrais)):
        rows = SiopeExtractor(min_interval_seconds=0).extrair_portal(_portal(), [2024])
    assert {(r["periodo"], r["tipo_periodo"]) for r in rows} == {(6, "anual")}


def test_ano_sem_fechamento_nem_bimestre_completo_e_ignorado():
    anuais = {g: [_linha(c, ano=2024) for c in cs] for g, cs in INDICADORES_POR_GRUPO.items()}
    with patch.object(SiopeExtractor, "_request", _fake_request(anuais, {1: [_linha("1.1", 2026, periodo=1)], 4: []})):
        rows = SiopeExtractor(min_interval_seconds=0).extrair_portal(_portal(), [2024, 2026])
    assert {r["ano"] for r in rows} == {2024}


# Resposta real da API (Porciúncula, consulta bimestral de 2026, coletada em 2026-11-01): bimestres 1 a 4 com
# valor acumulado no ano; 4.9 sem o 1º bimestre; 5º e 6º sem linhas (defasagem de um bimestre ou mais).
RESPOSTA_REAL_PORCIUNCULA_2026 = {
    "4.9": {2: 4836.8, 3: 7804.75, 4: 11325.75},
    "1.1": {1: 23.4, 2: 26.9, 3: 27.58, 4: 26.43},
}


def test_resposta_real_bimestral_grava_o_bimestre_mais_avancado_com_valores_acumulados():
    outros = [c for c in IDS if c not in RESPOSTA_REAL_PORCIUNCULA_2026]
    por_indicador = {
        **RESPOSTA_REAL_PORCIUNCULA_2026,
        **{c: {p: 1.0 for p in range(1, 5)} for c in outros},
    }
    bimestrais = {
        grupo: [
            _linha(c, ano=2026, valor=valor, periodo=periodo)
            for c in codigos
            for periodo, valor in por_indicador[c].items()
        ]
        for grupo, codigos in INDICADORES_POR_GRUPO.items()
    }
    with patch.object(SiopeExtractor, "_request", _fake_request({1: [], 4: []}, bimestrais)):
        rows = SiopeExtractor(min_interval_seconds=0).extrair_portal(_portal(), [2026])
    assert {(r["periodo"], r["tipo_periodo"]) for r in rows} == {(4, "bimestral")}
    valores = {r["codigo_indicador"]: r["valor"] for r in rows}
    assert valores["4.9"] == 11325.75
    assert valores["1.1"] == 26.43
