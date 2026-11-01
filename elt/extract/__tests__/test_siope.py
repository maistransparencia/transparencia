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


def _linha(exib, ano=2024, valor=1.5, ente=0):
    return {"codEnte": ente, "numAno": ano, "numPeri": 6, "codIndi": IDS[exib], "codExib": exib, "valIndi": valor}


def _lista(grupo):
    return [
        {"codGrupIndi": grupo, "codIndi": IDS[c], "codExib": c, "nomIndi": "x"} for c in INDICADORES_POR_GRUPO[grupo]
    ]


def _portal():
    return PortalConfig.load("porciuncula_prefeitura")


def _fake_request(linhas_por_grupo):
    def fake(self, method, params, body=None):
        if method == "GET":
            return _lista(params["codGrupIndi"])
        return self.validar_linhas(
            linhas_por_grupo[body["codGrupIndi"]],
            {c: IDS[c] for c in INDICADORES_POR_GRUPO[body["codGrupIndi"]]},
            body["numAno"],
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
