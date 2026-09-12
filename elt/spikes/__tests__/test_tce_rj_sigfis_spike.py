"""Unit tests for TCE-RJ / SICONFI R&D viability spike."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
import requests

from elt.spikes.tce_rj_sigfis_spike import (
    CANONICAL_USER_AGENT,
    TceRjSigfisSpikeClient,
    build_parser,
    main,
    normalize_tce_response,
)

# ==============================================================================
# Unit tests for normalize_tce_response
# ==============================================================================


def test_normalize_tce_response_direct_list() -> None:
    data = [{"id": 1, "nome": "Item 1"}, {"id": 2, "nome": "Item 2"}]
    assert normalize_tce_response(data) == data


def test_normalize_tce_response_filters_non_dicts_in_list() -> None:
    data = [{"id": 1}, "string_invalida", 123, None, {"id": 2}]
    assert normalize_tce_response(data) == [{"id": 1}, {"id": 2}]


def test_normalize_tce_response_licitacoes_envelope() -> None:
    data = {
        "Count": 2,
        "Licitacoes": [
            {"numero_processo": "001/2024", "objeto": "Aquisição de Merenda"},
            {"numero_processo": "002/2024", "objeto": "Reforma Escola"},
        ],
    }
    res = normalize_tce_response(data)
    assert len(res) == 2
    assert res[0]["numero_processo"] == "001/2024"


def test_normalize_tce_response_compras_diretas_envelope() -> None:
    data = {
        "Count": 1,
        "Compras": [{"numero_processo": "CD-005/2024", "valor": 15000.0}],
    }
    res = normalize_tce_response(data)
    assert len(res) == 1
    assert res[0]["numero_processo"] == "CD-005/2024"


def test_normalize_tce_response_situacao_funcional_envelope() -> None:
    data = {
        "Count": 1,
        "SituacoesFuncionais": [{"cargo": "Professor", "quantidade": 45}],
    }
    res = normalize_tce_response(data)
    assert len(res) == 1
    assert res[0]["cargo"] == "Professor"


def test_normalize_tce_response_siconfi_items_envelope() -> None:
    data = {
        "items": [
            {"conta_contabil": "1.1.1.1.1.00.00", "valor": 100000.0},
            {"conta_contabil": "1.1.1.2.1.00.00", "valor": 250000.0},
        ],
        "hasMore": False,
    }
    res = normalize_tce_response(data)
    assert len(res) == 2
    assert res[0]["conta_contabil"] == "1.1.1.1.1.00.00"


def test_normalize_tce_response_generic_dict_first_list() -> None:
    data = {
        "metadata": {"versao": "1.0"},
        "conteudo_customizado": [{"campo": "valor_a"}, {"campo": "valor_b"}],
    }
    res = normalize_tce_response(data)
    assert len(res) == 2
    assert res[0]["campo"] == "valor_a"


def test_normalize_tce_response_empty_or_invalid_inputs() -> None:
    assert normalize_tce_response(None) == []
    assert normalize_tce_response(12345) == []
    assert normalize_tce_response("invalid text") == []
    assert normalize_tce_response({"sem_lista": 123, "meta": "info"}) == []
    assert normalize_tce_response([]) == []


# ==============================================================================
# Unit tests for TceRjSigfisSpikeClient HTTP and query methods
# ==============================================================================


@pytest.fixture
def mock_session() -> MagicMock:
    return MagicMock(spec=requests.Session)


def test_client_headers_canonical_user_agent(mock_session: MagicMock) -> None:
    client = TceRjSigfisSpikeClient(session=mock_session)
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.url = "https://dados.tcerj.tc.br/api/v1/licitacoes"
    mock_resp.json.return_value = {"Licitacoes": []}
    mock_session.get.return_value = mock_resp

    client.query_licitacoes(municipio="PORCIUNCULA", ano=2024)

    assert mock_session.get.call_count == 1
    call_args = mock_session.get.call_args
    headers = call_args.kwargs["headers"]
    assert headers["User-Agent"] == CANONICAL_USER_AGENT
    assert headers["Accept"] == "application/json"


def test_query_tce_success(mock_session: MagicMock) -> None:
    client = TceRjSigfisSpikeClient(session=mock_session)
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.url = "https://dados.tcerj.tc.br/api/v1/licitacoes?municipio=PORCIUNCULA"
    mock_resp.json.return_value = {
        "Count": 1,
        "Licitacoes": [{"id": 101, "modalidade": "pregao_eletronico"}],
    }
    mock_session.get.return_value = mock_resp

    result = client.query_licitacoes(municipio="PORCIUNCULA", ano=2024, limite=5)

    assert result["endpoint"] == "/licitacoes"
    assert result["status_code"] == 200
    assert result["count"] == 1
    assert result["items"][0]["modalidade"] == "pregao_eletronico"
    assert not result["timeout"]
    assert result["error"] is None
    assert result["rtt_ms"] >= 0.0


def test_query_tce_prestacao_contas_direct_list(mock_session: MagicMock) -> None:
    client = TceRjSigfisSpikeClient(session=mock_session)
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.url = "https://dados.tcerj.tc.br/api/v1/prestacao_contas_municipio"
    mock_resp.json.return_value = [
        {"exercicio": 2024, "situacao": "Homologado"},
        {"exercicio": 2023, "situacao": "Favoravel com ressalva"},
    ]
    mock_session.get.return_value = mock_resp

    result = client.query_prestacao_contas(municipio="PORCIUNCULA", ano=2024)

    assert result["status_code"] == 200
    assert result["count"] == 2
    assert result["items"][0]["situacao"] == "Homologado"


def test_query_tce_all_priority_methods(mock_session: MagicMock) -> None:
    client = TceRjSigfisSpikeClient(session=mock_session)
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.url = "https://dados.tcerj.tc.br/api/v1/endpoint"
    mock_resp.json.return_value = [{"teste": "ok"}]
    mock_session.get.return_value = mock_resp

    assert client.query_compras_diretas("PORCIUNCULA", 2024)["count"] == 1
    assert client.query_situacao_funcional("PORCIUNCULA", 2024)["count"] == 1
    assert client.query_empenho("PORCIUNCULA", 2024)["count"] == 1
    assert client.query_receitas("PORCIUNCULA", 2024)["count"] == 1
    assert client.query_contratos("PORCIUNCULA", 2024)["count"] == 1
    assert client.query_gastos_pessoal("PORCIUNCULA", 2024)["count"] == 1
    assert client.query_obras_paralisadas("PORCIUNCULA")["count"] == 1
    assert client.query_dotacao("PORCIUNCULA", 2024)["count"] == 1
    assert client.query_licitante_vencedor("PORCIUNCULA", 2024)["count"] == 1
    assert client.query_licitante_perdedor("PORCIUNCULA", 2024)["count"] == 1


def test_query_tce_timeout_graceful_handling(mock_session: MagicMock) -> None:
    client = TceRjSigfisSpikeClient(session=mock_session, default_timeout=5.0)
    mock_session.get.side_effect = requests.exceptions.Timeout("Connection timed out after 5.0s")

    result = client.query_empenho(municipio="PORCIUNCULA", ano=2024)

    assert result["endpoint"] == "/empenho_municipio"
    assert result["status_code"] is None
    assert result["timeout"] is True
    assert result["count"] == 0
    assert result["items"] == []
    assert "Timeout" in (result["error"] or "")
    assert result["rtt_ms"] >= 0.0


def test_query_tce_request_exception_handling(mock_session: MagicMock) -> None:
    client = TceRjSigfisSpikeClient(session=mock_session)
    mock_session.get.side_effect = requests.exceptions.ConnectionError("DNS resolution failed")

    result = client.query_licitacoes(municipio="PORCIUNCULA", ano=2024)

    assert result["endpoint"] == "/licitacoes"
    assert result["status_code"] is None
    assert not result["timeout"]
    assert result["count"] == 0
    assert "DNS resolution failed" in (result["error"] or "")


def test_query_tce_non_200_status(mock_session: MagicMock) -> None:
    client = TceRjSigfisSpikeClient(session=mock_session)
    mock_resp = MagicMock()
    mock_resp.status_code = 500
    mock_resp.url = "https://dados.tcerj.tc.br/api/v1/empenho_municipio"
    mock_resp.text = "Internal Server Error: Query timed out on backend database"
    mock_session.get.return_value = mock_resp

    result = client.query_empenho(municipio="PORCIUNCULA", ano=2024)

    assert result["status_code"] == 500
    assert not result["timeout"]
    assert result["count"] == 0
    assert "HTTP status 500" in (result["error"] or "")


def test_query_tce_json_decode_error(mock_session: MagicMock) -> None:
    client = TceRjSigfisSpikeClient(session=mock_session)
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.url = "https://dados.tcerj.tc.br/api/v1/licitacoes"
    mock_resp.json.side_effect = json.JSONDecodeError("Expecting value", "bad_doc", 0)
    mock_session.get.return_value = mock_resp

    result = client.query_licitacoes(municipio="PORCIUNCULA")

    assert result["status_code"] == 200
    assert result["count"] == 0
    assert "Falha ao decodificar JSON" in (result["error"] or "")


def test_query_siconfi_success(mock_session: MagicMock) -> None:
    client = TceRjSigfisSpikeClient(session=mock_session)
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.url = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/msc_patrimonial"
    mock_resp.json.return_value = {
        "items": [{"conta_contabil": "1.1.1.1.1.00.00", "valor": 500000.0}],
    }
    mock_session.get.return_value = mock_resp

    result = client.query_siconfi("msc_patrimonial", params={"id_ente": 3304102, "an_referencia": 2024})

    assert result["endpoint"] == "/msc_patrimonial"
    assert result["status_code"] == 200
    assert result["count"] == 1
    assert result["items"][0]["valor"] == 500000.0


def test_query_siconfi_timeout_handling(mock_session: MagicMock) -> None:
    client = TceRjSigfisSpikeClient(session=mock_session)
    mock_session.get.side_effect = requests.exceptions.Timeout("SICONFI gateway timeout")

    result = client.query_siconfi("msc_patrimonial")

    assert result["endpoint"] == "/msc_patrimonial"
    assert result["timeout"] is True
    assert "Timeout" in (result["error"] or "")


def test_query_siconfi_error_handling(mock_session: MagicMock) -> None:
    client = TceRjSigfisSpikeClient(session=mock_session)
    mock_session.get.side_effect = requests.exceptions.HTTPError("403 Forbidden")

    result = client.query_siconfi("msc_patrimonial")

    assert result["status_code"] is None
    assert not result["timeout"]
    assert "403 Forbidden" in (result["error"] or "")


def test_run_audit_executes_all_endpoints(mock_session: MagicMock) -> None:
    client = TceRjSigfisSpikeClient(session=mock_session)
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.url = "https://dados.tcerj.tc.br/api/v1/mock"
    mock_resp.json.return_value = [{"item": "val"}]
    mock_session.get.return_value = mock_resp

    audit = client.run_audit(municipio="PORCIUNCULA", ano=2024, limite=5)

    assert "licitacoes" in audit
    assert "compras_diretas_municipio" in audit
    assert "prestacao_contas_municipio" in audit
    assert "situacao_funcional" in audit
    assert "contratos_municipio" in audit
    assert "gastos_com_pessoal" in audit
    assert "obras_paralisadas" in audit
    assert "dotacao_municipio" in audit
    assert "empenho_municipio" in audit
    assert "receitas_municipio" in audit
    assert "siconfi_msc_patrimonial" in audit
    assert len(audit) == 11


# ==============================================================================
# Unit tests for CLI parsing and main()
# ==============================================================================


def test_build_parser_defaults() -> None:
    parser = build_parser()
    args = parser.parse_args([])
    assert args.municipio == "PORCIUNCULA"
    assert args.ano == 2024
    assert args.limite == 10
    assert args.inicio == 0
    assert args.rota == "licitacoes"
    assert args.output_dir == "data/spikes"
    assert not args.sample_output
    assert not args.audit


def test_build_parser_overrides() -> None:
    parser = build_parser()
    args = parser.parse_args(
        [
            "--municipio",
            "ITAPERUNA",
            "--ano",
            "2023",
            "--limite",
            "50",
            "--inicio",
            "10",
            "--rota",
            "compras_diretas",
            "--timeout",
            "20.5",
            "--output-sample",
            "--audit",
        ]
    )
    assert args.municipio == "ITAPERUNA"
    assert args.ano == 2023
    assert args.limite == 50
    assert args.inicio == 10
    assert args.rota == "compras_diretas"
    assert args.timeout == 20.5
    assert args.sample_output is True
    assert args.audit is True


def test_main_cli_single_route_with_sample_output(tmp_path: Path) -> None:
    sample_items = [{"id": 1, "licitacao": "001/2024"}]
    mock_result: dict[str, Any] = {
        "endpoint": "/licitacoes",
        "url": "https://dados.tcerj.tc.br/api/v1/licitacoes",
        "status_code": 200,
        "rtt_ms": 150.0,
        "count": 1,
        "items": sample_items,
        "timeout": False,
        "error": None,
    }

    with patch.object(TceRjSigfisSpikeClient, "query_licitacoes", return_value=mock_result):
        exit_code = main(
            [
                "--municipio",
                "PORCIUNCULA",
                "--ano",
                "2024",
                "--rota",
                "licitacoes",
                "--output-dir",
                str(tmp_path),
                "--sample-output",
            ]
        )
        assert exit_code == 0

        saved_file = tmp_path / "licitacoes_porciuncula_2024.json"
        assert saved_file.exists()
        loaded = json.loads(saved_file.read_text(encoding="utf-8"))
        assert loaded["count"] == 1
        assert loaded["items"][0]["licitacao"] == "001/2024"


def test_main_cli_audit_with_sample_output(tmp_path: Path) -> None:
    mock_audit_res: dict[str, Any] = {
        "licitacoes": {
            "endpoint": "/licitacoes",
            "url": "https://dados.tcerj.tc.br/api/v1/licitacoes",
            "status_code": 200,
            "rtt_ms": 120.0,
            "count": 5,
            "items": [],
            "timeout": False,
            "error": None,
        },
        "empenho_municipio": {
            "endpoint": "/empenho_municipio",
            "url": "https://dados.tcerj.tc.br/api/v1/empenho_municipio",
            "status_code": None,
            "rtt_ms": 10000.0,
            "count": 0,
            "items": [],
            "timeout": True,
            "error": "Timeout",
        },
    }

    with patch.object(TceRjSigfisSpikeClient, "run_audit", return_value=mock_audit_res):
        exit_code = main(
            [
                "--municipio",
                "PORCIUNCULA",
                "--ano",
                "2024",
                "--audit",
                "--output-dir",
                str(tmp_path),
                "--output-sample",
            ]
        )
        assert exit_code == 0

        saved_file = tmp_path / "audit_porciuncula_2024.json"
        assert saved_file.exists()
        loaded = json.loads(saved_file.read_text(encoding="utf-8"))
        assert "licitacoes" in loaded
        assert "empenho_municipio" in loaded
