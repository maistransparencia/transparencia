import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from elt.extract.siconfi_msc import (
    DEFAULT_IBGE_PORCIUNCULA,
    KEY_COLS,
    SiconfiMscExtractor,
    load_siconfi_msc,
)

FIXTURE_PATH = Path(__file__).parent.parent.parent / "tests" / "fixtures" / "siconfi_msc_fixture.json"


@pytest.fixture
def sample_payload():
    return json.loads(FIXTURE_PATH.read_text())


def test_fetch_page_success(sample_payload):
    extractor = SiconfiMscExtractor(min_interval_seconds=0)

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = sample_payload

    with patch("requests.get", return_value=mock_resp) as mock_get:
        result = extractor.fetch_page(ibge=DEFAULT_IBGE_PORCIUNCULA, ano=2024, mes=12)

        assert mock_get.call_count == 1
        call_kwargs = mock_get.call_args.kwargs
        assert call_kwargs["params"]["id_ente"] == DEFAULT_IBGE_PORCIUNCULA
        assert call_kwargs["params"]["an_referencia"] == 2024
        assert call_kwargs["params"]["me_referencia"] == 12
        assert call_kwargs["params"]["co_tipo_matriz"] == "MSCC"
        assert call_kwargs["params"]["classe_conta"] == 1
        assert call_kwargs["params"]["id_tv"] == "ending_balance"
        assert call_kwargs["headers"]["User-Agent"] == "TransparenciaPublica/1.0"

        assert len(result["items"]) == 5
        assert result["items"][0]["valor"] == 5000000.0


def test_fetch_page_404_returns_empty():
    extractor = SiconfiMscExtractor(min_interval_seconds=0)

    mock_resp = MagicMock()
    mock_resp.status_code = 404

    with patch("requests.get", return_value=mock_resp):
        result = extractor.fetch_page(ibge=DEFAULT_IBGE_PORCIUNCULA, ano=2025, mes=12)
        assert result == {"items": [], "hasMore": False}


def test_fetch_page_retry_on_rate_limit(sample_payload):
    extractor = SiconfiMscExtractor(min_interval_seconds=0, max_retries=3)

    resp_429 = MagicMock()
    resp_429.status_code = 429

    resp_200 = MagicMock()
    resp_200.status_code = 200
    resp_200.json.return_value = sample_payload

    with patch("requests.get", side_effect=[resp_429, resp_200]) as mock_get:
        with patch("time.sleep"):  # don't wait during test
            result = extractor.fetch_page(ibge=DEFAULT_IBGE_PORCIUNCULA, ano=2024, mes=12)
            assert mock_get.call_count == 2
            assert len(result["items"]) == 5


def test_fetch_page_max_retries_exceeded():
    extractor = SiconfiMscExtractor(min_interval_seconds=0, max_retries=2)

    resp_500 = MagicMock()
    resp_500.status_code = 500

    with patch("requests.get", return_value=resp_500):
        with patch("time.sleep"):
            with pytest.raises(RuntimeError, match="Falha ao consultar API SICONFI"):
                extractor.fetch_page(ibge=DEFAULT_IBGE_PORCIUNCULA, ano=2024, mes=12)


def test_extract_mes_paginated():
    extractor = SiconfiMscExtractor(min_interval_seconds=0)

    page1 = {
        "items": [
            {
                "tipo_matriz": "MSCC",
                "cod_ibge": 3304102,
                "classe_conta": 1,
                "conta_contabil": "111110200",
                "poder_orgao": "10131",
                "financeiro_permanente": 1,
                "ano_fonte_recursos": 1,
                "fonte_recursos": "1500",
                "exercicio": 2024,
                "mes_referencia": 12,
                "data_referencia": "2024-12-31T00:00:00Z",
                "valor": 100.0,
                "natureza_conta": "D",
                "tipo_valor": "ending_balance",
            }
        ],
        "hasMore": True,
        "limit": 1,
        "offset": 0,
    }
    page2 = {
        "items": [
            {
                "tipo_matriz": "MSCC",
                "cod_ibge": 3304102,
                "classe_conta": 1,
                "conta_contabil": "111110200",
                "poder_orgao": "10231",
                "financeiro_permanente": 1,
                "ano_fonte_recursos": 1,
                "fonte_recursos": "1501",
                "exercicio": 2024,
                "mes_referencia": 12,
                "data_referencia": "2024-12-31T00:00:00Z",
                "valor": 200.0,
                "natureza_conta": "D",
                "tipo_valor": "ending_balance",
            }
        ],
        "hasMore": False,
        "limit": 1,
        "offset": 1,
    }

    with patch.object(extractor, "fetch_page", side_effect=[page1, page2]):
        items = extractor.extract_mes(ibge=3304102, ano=2024, mes=12)
        assert len(items) == 2
        assert items[0]["poder_orgao"] == "10131"
        assert items[1]["poder_orgao"] == "10231"


def test_normalize_item_fields():
    raw_item = {
        "an_referencia": 2024,
        "me_referencia": 12,
        "id_ente": 3304102,
        "co_tipo_matriz": "MSCC",
        "classe_conta": 1,
        "conta_contabil": "111110200",
        "poder_orgao": "10131",
        "financeiro_permanente": 1,
        "ano_fonte_recursos": 1,
        "fonte_recursos": "1500",
        "valor": 9791641.21,
        "natureza_conta": "D",
        "tipo_valor": "ending_balance",
        "data_referencia": "2024-12-31T00:00:00Z",
    }

    normalized = SiconfiMscExtractor.normalize_item(
        raw_item, ano=2024, mes=12, ibge=3304102, extracted_at="2026-09-06T12:00:00Z"
    )

    assert normalized["ano"] == 2024
    assert normalized["mes_referencia"] == 12
    assert normalized["cod_ibge"] == 3304102
    assert normalized["tipo_matriz"] == "MSCC"
    assert normalized["classe_conta"] == 1
    assert normalized["conta_contabil"] == "111110200"
    assert normalized["poder_orgao"] == "10131"
    assert normalized["financeiro_permanente"] == 1
    assert normalized["ano_fonte_recursos"] == 1
    assert normalized["fonte_recursos"] == "1500"
    assert normalized["valor"] == 9791641.21
    assert normalized["natureza_conta"] == "D"
    assert normalized["tipo_valor"] == "ending_balance"
    assert normalized["data_referencia"] == "2024-12-31T00:00:00Z"
    assert normalized["data_extracao"] == "2026-09-06T12:00:00Z"


def test_load_siconfi_msc():
    mock_db = MagicMock()
    rows = [
        {
            "ano": 2024,
            "mes_referencia": 12,
            "cod_ibge": 3304102,
            "tipo_matriz": "MSCC",
            "classe_conta": 1,
            "conta_contabil": "111110200",
            "poder_orgao": "10131",
            "financeiro_permanente": 1,
            "ano_fonte_recursos": 1,
            "fonte_recursos": "1500",
            "valor": 1000.0,
            "natureza_conta": "D",
            "tipo_valor": "ending_balance",
            "data_referencia": "2024-12-31T00:00:00Z",
            "data_extracao": "2026-09-06T12:00:00Z",
        }
    ]

    with patch("elt.extract.siconfi_msc.upsert", return_value=1) as mock_upsert:
        res = load_siconfi_msc(mock_db, rows)
        assert res == 1
        mock_upsert.assert_called_once_with(mock_db, "siconfi_msc_patrimonial", rows, KEY_COLS)
