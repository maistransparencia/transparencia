"""Testes do extrator e do carregador da Farmácia SUS (respostas HTTP mockadas)."""

from unittest.mock import MagicMock, patch

import requests
from elt.extract.farmacia_sus import FarmaciaSusExtractor, codigo_ibge6


def _resposta(corpo, status=200):
    resp = MagicMock()
    resp.status_code = status
    resp.json.return_value = corpo
    return resp


def _sessao(estoque, cnes):
    def get(url, params=None, **_):
        fonte = estoque if "estoque-medicamentos" in url else cnes
        if isinstance(fonte, Exception):
            raise fonte
        if isinstance(fonte, int):
            return _resposta(None, fonte)
        lista = fonte.get("parametros", fonte.get("estabelecimentos", [])) if isinstance(fonte, dict) else fonte
        chave = "parametros" if "estoque-medicamentos" in url else "estabelecimentos"
        return _resposta({chave: lista[params["offset"] : params["offset"] + params["limit"]]})

    sessao = MagicMock()
    sessao.get.side_effect = get
    return sessao


def test_codigo_ibge6_remove_digito_verificador():
    assert codigo_ibge6(3304102) == "330410"
    assert codigo_ibge6("330410") == "330410"


def test_extract_sucesso_mapeia_campos_e_registra_coleta():
    extrator = FarmaciaSusExtractor(min_interval_seconds=0)
    estoque = {
        "parametros": [
            {
                "codigo_cnes": 1234,
                "descricao_produto": "Losartana",
                "numero_lote": "L1",
                "quantidade_estoque": 5,
                "data_posicao_estoque": "2026-10-15",
            },
            {"sem": "nome"},
        ]
    }
    cnes = {
        "estabelecimentos": [
            {
                "co_cnes": "0001234",
                "nome_fantasia": "UBS",
                "endereco_estabelecimento": "Rua A",
                "numero_estabelecimento": "10",
            }
        ]
    }
    with patch("elt.extract.farmacia_sus.requests.Session", return_value=_sessao(estoque, cnes)):
        resultado = extrator.extract("portal_x", 3304102)

    assert resultado["coletas"][0]["status_coleta"] == "sucesso"
    assert resultado["coletas"][0]["codigo_ibge6"] == "330410"
    assert len(resultado["estoque_medicamentos"]) == 1
    assert resultado["estoque_medicamentos"][0]["portal_slug"] == "portal_x"
    assert resultado["estabelecimentos_cnes"][0]["endereco_estabelecimento"] == "Rua A, 10"


def test_extract_zero_itens_e_coleta_com_sucesso():
    extrator = FarmaciaSusExtractor(min_interval_seconds=0)
    with patch("elt.extract.farmacia_sus.requests.Session", return_value=_sessao([], [])):
        resultado = extrator.extract("portal_x", 3304102)

    assert resultado["coletas"][0]["status_coleta"] == "sucesso"
    assert resultado["estoque_medicamentos"] == []


def test_extract_falha_registra_coleta_falha_sem_estoque():
    extrator = FarmaciaSusExtractor(min_interval_seconds=0, max_retries=2)
    sessao = MagicMock()
    sessao.get.side_effect = requests.Timeout("timeout")
    with (
        patch("elt.extract.farmacia_sus.requests.Session", return_value=sessao),
        patch("elt.extract.farmacia_sus.time.sleep"),
    ):
        resultado = extrator.extract("portal_x", 3304102)

    assert list(resultado) == ["coletas"]
    assert resultado["coletas"][0]["status_coleta"] == "falha"
    assert "timeout" in resultado["coletas"][0]["mensagem_erro"]


def _linhas_estoque(total):
    return [
        {"codigo_cnes": 1, "descricao_produto": f"Med {i}", "numero_lote": str(i), "data_posicao_estoque": "2026-10-15"}
        for i in range(total)
    ]


def test_extract_pagina_ate_o_fim_com_mais_de_uma_pagina():
    extrator = FarmaciaSusExtractor(min_interval_seconds=0)
    sessao = _sessao({"parametros": _linhas_estoque(1484)}, {"estabelecimentos": []})
    with patch("elt.extract.farmacia_sus.requests.Session", return_value=sessao):
        resultado = extrator.extract("portal_x", 3304102)

    assert len(resultado["estoque_medicamentos"]) == 1484
    assert resultado["coletas"][0]["status_coleta"] == "sucesso"


def test_lotes_distintos_nao_colapsam():
    extrator = FarmaciaSusExtractor(min_interval_seconds=0)
    registros = [
        {"codigo_cnes": 1, "descricao_produto": "Med", "numero_lote": lote, "data_posicao_estoque": "2026-10-15"}
        for lote in ("A", "B")
    ]
    sessao = _sessao({"parametros": registros}, {"estabelecimentos": []})
    with patch("elt.extract.farmacia_sus.requests.Session", return_value=sessao):
        resultado = extrator.extract("portal_x", 3304102)

    assert len({r["id_registro"] for r in resultado["estoque_medicamentos"]}) == 2


def test_estoque_404_e_falha_nunca_apagao():
    extrator = FarmaciaSusExtractor(min_interval_seconds=0)
    with patch("elt.extract.farmacia_sus.requests.Session", return_value=_sessao(404, [])):
        resultado = extrator.extract("portal_x", 3304102)

    assert list(resultado) == ["coletas"]
    assert resultado["coletas"][0]["status_coleta"] == "falha"


def test_registros_sem_nenhum_mapeado_e_falha():
    extrator = FarmaciaSusExtractor(min_interval_seconds=0)
    sessao = _sessao({"parametros": [{"campo_novo": "x"}]}, [])
    with patch("elt.extract.farmacia_sus.requests.Session", return_value=sessao):
        resultado = extrator.extract("portal_x", 3304102)

    assert resultado["coletas"][0]["status_coleta"] == "falha"
    assert "estoque_medicamentos" not in resultado


def test_truncamento_por_limite_de_paginas_e_falha():
    extrator = FarmaciaSusExtractor(min_interval_seconds=0)
    with (
        patch("elt.extract.farmacia_sus.MAXIMO_PAGINAS", 1),
        patch(
            "elt.extract.farmacia_sus.requests.Session", return_value=_sessao({"parametros": _linhas_estoque(2000)}, [])
        ),
    ):
        resultado = extrator.extract("portal_x", 3304102)

    assert resultado["coletas"][0]["status_coleta"] == "falha"


def test_falha_no_cnes_omite_estabelecimentos():
    extrator = FarmaciaSusExtractor(min_interval_seconds=0)
    sessao = _sessao({"parametros": _linhas_estoque(2)}, 404)
    with patch("elt.extract.farmacia_sus.requests.Session", return_value=sessao):
        resultado = extrator.extract("portal_x", 3304102)

    assert "estabelecimentos_cnes" not in resultado
    assert resultado["coletas"][0]["status_coleta"] == "sucesso"


def test_ibge_invalido_gera_coleta_falha():
    resultado = FarmaciaSusExtractor(min_interval_seconds=0).extract("portal_x", "abc")

    assert resultado["coletas"][0]["status_coleta"] == "falha"


def test_cnes_repetido_por_competencia_prevalece_a_mais_recente():
    extrator = FarmaciaSusExtractor(min_interval_seconds=0)
    estoque = {
        "parametros": [{"codigo_cnes": 1234, "descricao_produto": "Losartana", "data_posicao_estoque": "2026-10-15"}]
    }
    cnes = {
        "estabelecimentos": [
            {"co_cnes": "0001234", "no_fantasia": "UBS", "nome_fantasia": "UBS Nova", "nu_comp": 202308},
            {"co_cnes": "0001234", "nome_fantasia": "UBS Antiga", "nu_comp": 202105},
        ]
    }
    with patch("elt.extract.farmacia_sus.requests.Session", return_value=_sessao(estoque, cnes)):
        resultado = extrator.extract("portal_x", 3304102)

    assert len(resultado["estabelecimentos_cnes"]) == 1
    assert resultado["estabelecimentos_cnes"][0]["nome_estabelecimento"] == "UBS Nova"


def test_coordenadas_do_cnes_tem_prioridade_e_estoque_preenche_quando_cnes_nulo():
    extrator = FarmaciaSusExtractor(min_interval_seconds=0)
    estoque = {
        "parametros": [
            {"codigo_cnes": 1, "descricao_produto": "A", "latitude": -21.0, "longitude": -42.0},
            {"codigo_cnes": 2, "descricao_produto": "B", "latitude": -22.0, "longitude": -43.0},
        ]
    }
    cnes = {
        "estabelecimentos": [
            {"co_cnes": "0000001", "nu_latitude": -21.001, "nu_longitude": -42.002},
            {"co_cnes": "0000002", "nu_latitude": None, "nu_longitude": None},
        ]
    }
    with patch("elt.extract.farmacia_sus.requests.Session", return_value=_sessao(estoque, cnes)):
        resultado = extrator.extract("portal_x", 3304102)

    por_cnes = {r["codigo_cnes"].lstrip("0"): r for r in resultado["estabelecimentos_cnes"]}
    assert (por_cnes["1"]["latitude_estabelecimento"], por_cnes["1"]["longitude_estabelecimento"]) == (-21.001, -42.002)
    assert (por_cnes["2"]["latitude_estabelecimento"], por_cnes["2"]["longitude_estabelecimento"]) == (-22.0, -43.0)
