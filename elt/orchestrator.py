"""Pipeline orchestrator for ELT ingestion with structured JSON telemetry and webhook dispatch."""

import argparse
import json
import os
import subprocess
import sys
import time
import traceback
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv

from elt.core.config import PortalConfig


def log_event(
    level: str,
    portal: str,
    step: str,
    duration_ms: int | None = None,
    records_count: int | None = None,
    error: str | None = None,
    **extra: Any,
) -> dict[str, Any]:
    """Emits a structured log line in JSON format to stdout."""
    payload: dict[str, Any] = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": level,
        "portal": portal,
        "step": step,
        "duration_ms": duration_ms,
        "records_count": records_count,
        "error": error,
    }
    if extra:
        payload.update(extra)
    line = json.dumps(payload, ensure_ascii=False)
    sys.stdout.write(line + "\n")
    sys.stdout.flush()
    return payload


def count_records_in_latest_run(portal: str) -> int:
    """Counts records present in the latest extraction run directory."""
    raw_portal_dir = Path(f"data/raw_runs/{portal}")
    if not raw_portal_dir.exists():
        return 0
    run_dirs = [d for d in raw_portal_dir.iterdir() if d.is_dir()]
    if not run_dirs:
        return 0
    latest_dir = max(run_dirs, key=lambda d: d.name)
    total = 0
    for json_file in latest_dir.rglob("*.json"):
        try:
            data = json.loads(json_file.read_text(encoding="utf-8"))
            if isinstance(data, list):
                total += len(data)
        except Exception:
            continue
    return total


def send_webhook(
    url: str,
    token: str | None,
    payload: dict[str, Any],
    timeout: int = 30,
) -> requests.Response:
    """Dispatches a webhook POST request with optional Bearer authorization."""
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return requests.post(url, json=payload, headers=headers, timeout=timeout)


def send_alert(
    alert_url: str,
    portal: str,
    step: str,
    error: str,
    tb_str: str,
    timeout: int = 15,
) -> None:
    """Dispatches an emergency alert webhook on critical failure."""
    alert_text = f"🚨 [Pipeline Failure] Portal: {portal} | Step: {step} | Error: {error}"
    alert_payload = {
        "text": alert_text,
        "content": alert_text,  # Compatibilidade nativa com webhooks do Discord
        "portal": portal,
        "status": "failure",
        "step": step,
        "error": error,
        "traceback": tb_str,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    try:
        requests.post(alert_url, json=alert_payload, timeout=timeout)
    except Exception as exc:
        log_event(
            level="WARNING",
            portal=portal,
            step="alert",
            error=str(exc),
        )


def run_pipeline(
    portal: str,
    years: list[int] | None = None,
    only: str | None = None,
    dry_run: bool = False,
    notify_webhook: bool = True,
) -> int:
    """Executes the end-to-end ingestion pipeline: extract -> load -> transform -> webhook."""
    load_dotenv()
    pipeline_start = time.perf_counter()
    current_year = date.today().year
    target_years = years if years else [current_year - 1, current_year]

    # Validate portal configuration
    try:
        portal_config = PortalConfig.load(portal)  # noqa: F841
    except Exception as exc:
        alert_url = os.environ.get("ALERT_WEBHOOK_URL")
        if alert_url:
            send_alert(alert_url, portal, "init", f"Invalid portal: {exc}", traceback.format_exc())
        log_event(
            level="ERROR",
            portal=portal,
            step="init",
            error=f"Invalid portal: {exc}",
        )
        return 1

    log_event(
        level="INFO",
        portal=portal,
        step="init",
        years=target_years,
        only=only,
        dry_run=dry_run,
    )

    if dry_run:
        duration_ms = int((time.perf_counter() - pipeline_start) * 1000)
        log_event(
            level="INFO",
            portal=portal,
            step="pipeline",
            duration_ms=duration_ms,
            records_count=0,
            message="Dry-run completed successfully. No mutating operations performed.",
        )
        return 0

    webhook_url = os.environ.get("WEBHOOK_URL")
    api_secret = os.environ.get("INTERNAL_API_SECRET")
    alert_url = os.environ.get("ALERT_WEBHOOK_URL")
    base_dir = Path(__file__).resolve().parent

    current_step = "extract"
    records_count = 0

    try:
        # Step 1: Extract
        extract_start = time.perf_counter()
        extract_cmd = [sys.executable, "-m", "elt.extract.run", "--portal", portal]
        if target_years:
            extract_cmd.extend(["--years"] + [str(y) for y in target_years])
        if only:
            extract_cmd.extend(["--only", only])

        subprocess.run(extract_cmd, check=True)
        extract_duration_ms = int((time.perf_counter() - extract_start) * 1000)
        records_count = count_records_in_latest_run(portal)
        log_event(
            level="INFO",
            portal=portal,
            step="extract",
            duration_ms=extract_duration_ms,
            records_count=records_count,
        )

        # Step 2: Load
        current_step = "load"
        load_start = time.perf_counter()
        load_cmd = [sys.executable, "-m", "elt.load.run", "--portal", portal]
        subprocess.run(load_cmd, check=True)
        load_duration_ms = int((time.perf_counter() - load_start) * 1000)
        log_event(
            level="INFO",
            portal=portal,
            step="load",
            duration_ms=load_duration_ms,
            records_count=records_count,
        )

        # Step 3: Transform (dbt run)
        current_step = "transform"
        transform_start = time.perf_counter()
        dbt_script = str(base_dir / "scripts" / "run_dbt.py")
        dbt_packages_dir = base_dir / "transform" / "dbt_packages"
        if not dbt_packages_dir.exists():
            deps_cmd = [sys.executable, dbt_script, "deps"]
            subprocess.run(deps_cmd, check=True)

        transform_cmd = [sys.executable, dbt_script, "run"]
        subprocess.run(transform_cmd, check=True)
        transform_duration_ms = int((time.perf_counter() - transform_start) * 1000)
        log_event(
            level="INFO",
            portal=portal,
            step="transform",
            duration_ms=transform_duration_ms,
        )

        # Step 4: Webhook Notification (Success)
        total_duration_ms = int((time.perf_counter() - pipeline_start) * 1000)
        if notify_webhook and webhook_url:
            current_step = "webhook"
            webhook_start = time.perf_counter()
            success_payload = {
                "portalSlug": portal,
                "status": "success",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "durationMs": total_duration_ms,
                "recordsProcessed": records_count,
            }
            try:
                resp = send_webhook(webhook_url, api_secret, success_payload)
                resp.raise_for_status()
                webhook_duration_ms = int((time.perf_counter() - webhook_start) * 1000)
                log_event(
                    level="INFO",
                    portal=portal,
                    step="webhook",
                    duration_ms=webhook_duration_ms,
                )
            except Exception as hook_exc:
                log_event(
                    level="WARNING",
                    portal=portal,
                    step="webhook",
                    error=f"Failed to dispatch success webhook: {hook_exc}",
                )

        log_event(
            level="INFO",
            portal=portal,
            step="pipeline",
            duration_ms=total_duration_ms,
            records_count=records_count,
        )
        return 0

    except Exception as exc:
        total_duration_ms = int((time.perf_counter() - pipeline_start) * 1000)
        tb_str = traceback.format_exc()
        if isinstance(exc, subprocess.CalledProcessError) and exc.stderr:
            error_msg = f"{exc}: {exc.stderr.strip()}"
        else:
            error_msg = str(exc)

        log_event(
            level="ERROR",
            portal=portal,
            step=current_step,
            duration_ms=total_duration_ms,
            records_count=records_count,
            error=error_msg,
            traceback=tb_str,
        )

        # Dispatch emergency alert if configured
        if alert_url:
            send_alert(alert_url, portal, current_step, error_msg, tb_str)

        # Dispatch failure status to webhook if configured
        if notify_webhook and webhook_url:
            try:
                failure_payload = {
                    "portalSlug": portal,
                    "status": "failure",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "durationMs": total_duration_ms,
                    "recordsProcessed": records_count,
                    "errorMessage": f"Pipeline failed during '{current_step}' step: {error_msg}",
                }
                send_webhook(webhook_url, api_secret, failure_payload)
            except Exception as hook_exc:
                log_event(
                    level="WARNING",
                    portal=portal,
                    step="webhook",
                    error=f"Failed to dispatch failure webhook: {hook_exc}",
                )

        return 1


def main() -> None:
    parser = argparse.ArgumentParser(description="Orchestrator for automated ELT data ingestion")
    parser.add_argument(
        "--portal",
        default="porciuncula_prefeitura",
        help="Target portal slug (default: porciuncula_prefeitura)",
    )
    parser.add_argument(
        "--years",
        nargs="+",
        type=int,
        help="Fiscal years to process (default: current and previous year)",
    )
    parser.add_argument(
        "--only",
        help="Process only a specific listagem endpoint",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run validation without persisting changes or dispatching webhooks",
    )
    parser.add_argument(
        "--notify-webhook",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Dispatch completion or failure webhook (default: True)",
    )

    args = parser.parse_args()
    exit_code = run_pipeline(
        portal=args.portal,
        years=args.years,
        only=args.only,
        dry_run=args.dry_run,
        notify_webhook=args.notify_webhook,
    )
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
