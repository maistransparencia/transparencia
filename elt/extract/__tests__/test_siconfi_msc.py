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
        assert call_kwargs["params"]["an_referencia"] == "2024"
        assert call_kwargs["params"]["me_referencia"] == "12"
        assert call_kwargs["params"]["co_tipo_matriz"] == "MSCC"
        assert call_kwargs["params"]["classe_conta"] == 1
        assert call_kwargs["params"]["id_tv"] == "ending_balance"
        assert call_kwargs["headers"]["User-Agent"] == "TransparenciaPublica/1.0"

        assert len(result["items"]) == 7
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
            assert len(result["items"]) == 7


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


def test_ensure_siconfi_table():
    from elt.extract.siconfi_msc import ensure_siconfi_table
    from sqlalchemy.engine import Engine

    mock_engine = MagicMock(spec=Engine)
    mock_conn = MagicMock()
    mock_engine.begin.return_value.__enter__.return_value = mock_conn

    ensure_siconfi_table(mock_engine, schema="raw_porciuncula_prefeitura")
    assert mock_conn.execute.call_count == 1
    call_sql = str(mock_conn.execute.call_args[0][0])
    assert "siconfi_msc_patrimonial" in call_sql


def test_extract_and_load_siconfi(tmp_path):
    from elt.extract.siconfi_msc import extract_and_load_siconfi
    from sqlalchemy.engine import Engine

    portal = MagicMock()
    portal.slug = "porciuncula_prefeitura"
    portal.cod_ibge = 3304102
    portal.ano_inicial = 2024
    portal.raw_schema = "raw_porciuncula_prefeitura"

    mock_db = MagicMock(spec=Engine)
    sample_rows = [{"ano": 2024, "mes_referencia": 12, "valor": 100.0}]

    with (
        patch("elt.extract.siconfi_msc.ensure_siconfi_table") as mock_ensure,
        patch.object(SiconfiMscExtractor, "extract_ano", return_value=sample_rows) as mock_extract,
        patch("elt.extract.siconfi_msc.load_siconfi_msc", return_value=1) as mock_load,
    ):
        total = extract_and_load_siconfi(
            portal=portal,
            years=[2024],
            db=mock_db,
            run_dir=tmp_path,
            save_raw=True,
        )

        assert total == 1
        mock_ensure.assert_called_once_with(mock_db, "raw_porciuncula_prefeitura")
        mock_extract.assert_called_once_with(3304102, 2024, session=None)
        mock_load.assert_called_once_with(mock_db, sample_rows)

        saved_file = tmp_path / "siconfi_msc_patrimonial" / "3304102_2024.json"
        assert saved_file.exists()
        assert json.loads(saved_file.read_text()) == sample_rows


def test_main_cli(tmp_path):
    from elt.extract.siconfi_msc import main

    test_args = [
        "siconfi_msc.py",
        "--portal",
        "porciuncula_prefeitura",
        "--years",
        "2024",
        "--raw-only",
        "--dir",
        str(tmp_path),
    ]

    with (
        patch("sys.argv", test_args),
        patch("elt.extract.siconfi_msc.extract_and_load_siconfi", return_value=5) as mock_extract_load,
    ):
        main()
        mock_extract_load.assert_called_once()
        kwargs = mock_extract_load.call_args.kwargs
        assert kwargs["years"] == [2024]
        assert kwargs["db"] is None
        assert kwargs["run_dir"] == tmp_path


def test_extract_run_only_siconfi(tmp_path, monkeypatch):
    import elt.extract.run as extract_run

    sample_rows = [{"ano": 2024, "mes_referencia": 12, "valor": 50.0}]
    test_args = [
        "run.py",
        "--portal",
        "porciuncula_prefeitura",
        "--years",
        "2024",
        "--only",
        "siconfi_msc",
    ]

    with (
        patch("sys.argv", test_args),
        patch.object(SiconfiMscExtractor, "extract_ano", return_value=sample_rows) as mock_extract,
    ):
        monkeypatch.setattr(
            "elt.extract.run.Path",
            lambda p: tmp_path / p if isinstance(p, str) and p.startswith("data/raw_runs") else Path(p),
        )
        extract_run.main()

        assert mock_extract.call_count == 1
        written_files = list(tmp_path.rglob("*.json"))
        assert len(written_files) == 1
        assert "siconfi_msc_patrimonial" in str(written_files[0])


def test_load_run_siconfi(tmp_path):
    import elt.load.run as load_run

    run_dir = tmp_path / "data" / "raw_runs" / "porciuncula_prefeitura" / "20260101_120000"
    siconfi_dir = run_dir / "siconfi_msc_patrimonial"
    siconfi_dir.mkdir(parents=True)
    json_file = siconfi_dir / "3304102_2024.json"
    sample_rows = [{"ano": 2024, "mes_referencia": 12, "valor": 50.0}]
    json_file.write_text(json.dumps(sample_rows))

    test_args = [
        "run.py",
        "--portal",
        "porciuncula_prefeitura",
        "--dir",
        str(run_dir),
    ]

    with (
        patch("sys.argv", test_args),
        patch("elt.load.run.get_engine") as mock_engine,
        patch("elt.load.run._upsert_raw") as mock_upsert_raw,
        patch("elt.extract.siconfi_msc.ensure_siconfi_table") as mock_ensure,
        patch("elt.extract.siconfi_msc.load_siconfi_msc", return_value=1) as mock_load,
    ):
        load_run.main()
        mock_ensure.assert_called_once()
        mock_load.assert_called_once_with(mock_engine.return_value, sample_rows)
        mock_upsert_raw.assert_called_once()
