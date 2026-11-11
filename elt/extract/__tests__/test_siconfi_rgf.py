from unittest.mock import MagicMock, patch

import pytest
import requests
from elt.extract.siconfi_rgf import KEY_COLS, SiconfiRgfExtractor

IBGE = 1234567


def _item(periodicidade: str, periodo: int, cod_conta: str, coluna: str, valor: float) -> dict:
    return {
        "exercicio": 2024,
        "periodo": periodo,
        "periodicidade": periodicidade,
        "cod_ibge": IBGE,
        "populacao": 1000,
        "anexo": "RGF-Anexo 01",
        "rotulo": "Padrão",
        "coluna": coluna,
        "cod_conta": cod_conta,
        "conta": cod_conta,
        "valor": valor,
    }


def _resp(items: list[dict]) -> MagicMock:
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = {"items": items, "hasMore": False}
    return resp


def test_fetch_page_envia_parametros_do_rgf_executivo_municipal():
    extractor = SiconfiRgfExtractor(min_interval_seconds=0)
    with patch("requests.get", return_value=_resp([])) as mock_get:
        extractor.fetch_page(IBGE, 2024, "Q", 3)
    params = mock_get.call_args.kwargs["params"]
    assert params["an_exercicio"] == "2024"
    assert params["in_periodicidade"] == "Q"
    assert params["nr_periodo"] == 3
    assert params["no_anexo"] == "RGF-Anexo 01"
    assert params["co_esfera"] == "M"
    assert params["co_poder"] == "E"
    assert params["id_ente"] == IBGE


def test_extract_ano_usa_o_que_a_api_devolve_sem_configuracao_por_municipio():
    extractor = SiconfiRgfExtractor(min_interval_seconds=0)

    def fake_get(url, params, headers, timeout):
        if params["in_periodicidade"] == "S" and params["nr_periodo"] == 2:
            return _resp([_item("S", 2, "DespesaComPessoalTotal", "Valor", 70.0)])
        return _resp([])

    with patch("requests.get", side_effect=fake_get):
        rows = extractor.extract_ano(IBGE, 2024)

    assert len(rows) == 1
    assert rows[0]["periodicidade"] == "S"
    assert rows[0]["periodo"] == 2
    assert rows[0]["valor"] == 70.0
    assert set(KEY_COLS) <= set(rows[0])


def test_extract_ano_sem_rgf_publicado_devolve_lista_vazia_sem_erro():
    extractor = SiconfiRgfExtractor(min_interval_seconds=0)
    with patch("requests.get", return_value=_resp([])):
        assert extractor.extract_ano(IBGE, 2024) == []


def test_extract_ano_remove_duplicatas_pela_chave():
    extractor = SiconfiRgfExtractor(min_interval_seconds=0)
    duplicado = _item("Q", 3, "DespesaComPessoalTotal", "Valor", 1.0)
    with patch("requests.get", return_value=_resp([duplicado, duplicado])):
        rows = extractor.extract_ano(IBGE, 2024)
    chaves = [tuple(r[c] for c in KEY_COLS) for r in rows]
    assert len(chaves) == len(set(chaves))


def test_extract_ano_consulta_o_rgf_simplificado_quando_o_completo_vem_vazio():
    extractor = SiconfiRgfExtractor(min_interval_seconds=0)

    def fake_get(url, params, headers, timeout):
        if (
            params["co_tipo_demonstrativo"] == "RGF Simplificado"
            and params["in_periodicidade"] == "S"
            and params["nr_periodo"] == 2
        ):
            return _resp([_item("S", 2, "DespesaComPessoalTotal", "% sobre a RCL Ajustada", 51.14)])
        return _resp([])

    with patch("requests.get", side_effect=fake_get):
        rows = extractor.extract_ano(IBGE, 2024)

    assert [(row["periodicidade"], row["periodo"], row["valor"]) for row in rows] == [("S", 2, 51.14)]


def test_extract_ano_falha_em_vez_de_devolver_periodos_faltando():
    extractor = SiconfiRgfExtractor(min_interval_seconds=0)

    def fake_get(url, params, headers, timeout):
        if params["in_periodicidade"] == "Q" and params["nr_periodo"] == 2:
            raise requests.ConnectionError("falha transitória")
        return _resp([_item("Q", 3, "DespesaComPessoalTotal", "Valor", 70.0)])

    with patch("requests.get", side_effect=fake_get), pytest.raises(RuntimeError, match="Q2"):
        extractor.extract_ano(IBGE, 2024)
