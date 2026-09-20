"""Unit tests for the ELT pipeline orchestrator."""

import json
import subprocess
from unittest.mock import MagicMock, patch

import pytest

from elt.orchestrator import (
    count_records_in_latest_run,
    log_event,
    main,
    run_pipeline,
    send_alert,
    send_webhook,
)


def test_send_webhook():
    mock_post = MagicMock()
    with patch("elt.orchestrator.requests.post", mock_post):
        send_webhook("http://example.com/hook", "secret-key", {"status": "success"})
    mock_post.assert_called_once_with(
        "http://example.com/hook",
        json={"status": "success"},
        headers={"Content-Type": "application/json", "Authorization": "Bearer secret-key"},
        timeout=30,
    )


def test_send_alert():
    mock_post = MagicMock()
    with patch("elt.orchestrator.requests.post", mock_post):
        send_alert(
            "http://example.com/alert",
            portal="porciuncula_prefeitura",
            step="extract",
            error="Connection timeout",
            tb_str="Traceback...",
        )
    assert mock_post.call_count == 1
    call_json = mock_post.call_args[1]["json"]
    assert call_json["portal"] == "porciuncula_prefeitura"
    assert call_json["step"] == "extract"
    assert call_json["error"] == "Connection timeout"
    assert call_json["status"] == "failure"


def test_log_event_structure(capsys):
    event = log_event(
        level="INFO",
        portal="porciuncula_prefeitura",
        step="extract",
        duration_ms=120,
        records_count=50,
        error=None,
    )
    captured = capsys.readouterr()
    line = captured.out.strip()
    parsed = json.loads(line)

    assert parsed["level"] == "INFO"
    assert parsed["portal"] == "porciuncula_prefeitura"
    assert parsed["step"] == "extract"
    assert parsed["duration_ms"] == 120
    assert parsed["records_count"] == 50
    assert parsed["error"] is None
    assert "timestamp" in parsed
    assert parsed == event


def test_count_records_in_latest_run(tmp_path, monkeypatch):
    portal = "test_portal"
    run_dir = tmp_path / "data" / "raw_runs" / portal / "20260912_120000"
    table_dir = run_dir / "despesas"
    table_dir.mkdir(parents=True, exist_ok=True)
    json_file = table_dir / "empresa_2025.json"
    json_file.write_text(json.dumps([{"id": 1}, {"id": 2}, {"id": 3}]), encoding="utf-8")

    monkeypatch.chdir(tmp_path)
    count = count_records_in_latest_run(portal)
    assert count == 3


def test_run_pipeline_success(monkeypatch):
    webhook_url = "http://localhost:3001/api/ingestion/webhook"
    token = "test-secret-token"
    monkeypatch.setenv("WEBHOOK_URL", webhook_url)
    monkeypatch.setenv("INTERNAL_API_SECRET", token)

    mock_run = MagicMock()
    mock_post = MagicMock()
    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_post.return_value = mock_resp

    with (
        patch("elt.orchestrator.subprocess.run", mock_run),
        patch("elt.orchestrator.requests.post", mock_post),
        patch("elt.orchestrator.count_records_in_latest_run", return_value=123),
    ):
        code = run_pipeline(
            portal="porciuncula_prefeitura",
            years=[2024, 2025],
            notify_webhook=True,
        )

    assert code == 0
    # Should run extract, load, transform
    assert mock_run.call_count == 3
    extract_cmd = mock_run.call_args_list[0][0][0]
    load_cmd = mock_run.call_args_list[1][0][0]
    transform_cmd = mock_run.call_args_list[2][0][0]

    assert "elt.extract.run" in " ".join(extract_cmd)
    assert "elt.load.run" in " ".join(load_cmd)
    assert "run_dbt.py" in " ".join(transform_cmd)

    # Webhook assertion
    assert mock_post.call_count == 1
    call_args = mock_post.call_args
    assert call_args[0][0] == webhook_url
    assert call_args[1]["headers"]["Authorization"] == f"Bearer {token}"
    sent_payload = call_args[1]["json"]
    assert sent_payload["portalSlug"] == "porciuncula_prefeitura"
    assert sent_payload["status"] == "success"
    assert sent_payload["recordsProcessed"] == 123
    assert sent_payload["durationMs"] >= 0


def test_run_pipeline_failure_triggers_alert_and_webhook(monkeypatch):
    webhook_url = "http://localhost:3001/api/ingestion/webhook"
    alert_url = "http://alert-server/webhook"
    token = "test-secret-token"
    monkeypatch.setenv("WEBHOOK_URL", webhook_url)
    monkeypatch.setenv("INTERNAL_API_SECRET", token)
    monkeypatch.setenv("ALERT_WEBHOOK_URL", alert_url)

    mock_run = MagicMock(side_effect=subprocess.CalledProcessError(1, ["cmd"], output="Extraction failed"))
    mock_post = MagicMock()

    with (
        patch("elt.orchestrator.subprocess.run", mock_run),
        patch("elt.orchestrator.requests.post", mock_post),
    ):
        code = run_pipeline(
            portal="porciuncula_prefeitura",
            years=[2025],
            notify_webhook=True,
        )

    assert code == 1

    # Should call alert_url and failure webhook
    posted_urls = [call[0][0] for call in mock_post.call_args_list]
    assert alert_url in posted_urls
    assert webhook_url in posted_urls

    # Check alert payload
    alert_call = next(call for call in mock_post.call_args_list if call[0][0] == alert_url)
    alert_json = alert_call[1]["json"]
    assert alert_json["portal"] == "porciuncula_prefeitura"
    assert alert_json["step"] == "extract"
    assert alert_json["status"] == "failure"

    # Check webhook payload
    webhook_call = next(call for call in mock_post.call_args_list if call[0][0] == webhook_url)
    webhook_json = webhook_call[1]["json"]
    assert webhook_json["portalSlug"] == "porciuncula_prefeitura"
    assert webhook_json["status"] == "failure"
    assert "extract" in webhook_json["errorMessage"]


def test_run_pipeline_dry_run_executes_no_mutations(monkeypatch):
    monkeypatch.setenv("WEBHOOK_URL", "http://localhost:3001/api/ingestion/webhook")
    mock_run = MagicMock()
    mock_post = MagicMock()

    with (
        patch("elt.orchestrator.subprocess.run", mock_run),
        patch("elt.orchestrator.requests.post", mock_post),
    ):
        code = run_pipeline(portal="porciuncula_prefeitura", dry_run=True)

    assert code == 0
    assert mock_run.call_count == 0
    assert mock_post.call_count == 0


def test_run_pipeline_invalid_portal():
    code = run_pipeline(portal="non_existent_portal_xyz")
    assert code == 1


def test_main_cli(monkeypatch):
    mock_run_pipeline = MagicMock(return_value=0)
    monkeypatch.setattr(
        "sys.argv",
        [
            "orchestrator.py",
            "--portal",
            "porciuncula_prefeitura",
            "--years",
            "2024",
            "2025",
            "--dry-run",
        ],
    )

    with (
        patch("elt.orchestrator.run_pipeline", mock_run_pipeline),
        pytest.raises(SystemExit) as exc_info,
    ):
        main()

    assert exc_info.value.code == 0
    mock_run_pipeline.assert_called_once_with(
        portal="porciuncula_prefeitura",
        years=[2024, 2025],
        only=None,
        dry_run=True,
        notify_webhook=True,
    )
