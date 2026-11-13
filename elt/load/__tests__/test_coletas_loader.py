"""Tests for the per-source collection log (raw_coletas.registro_coletas)."""

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

import pytest
from elt.load import run as load_run
from elt.load.coletas import MUNICIPAL_PORTAL_SOURCE, SCHEMA, load_source_catalog, record_collections
from elt.load.run import _farmacia_collection_succeeded
from sqlalchemy import text

_RUN_PY = Path(__file__).resolve().parents[1] / "run.py"
_COLLECTED_AT = datetime(2026, 11, 10, 8, 30, tzinfo=timezone.utc)


def _rows(engine, portal):
    with engine.connect() as conn:
        return conn.execute(
            text(
                f"SELECT fonte, coletado_em, frequencia_esperada, total_linhas FROM {SCHEMA}.registro_coletas "
                "WHERE portal_slug = :p ORDER BY fonte, coletado_em"
            ),
            {"p": portal},
        ).fetchall()


@pytest.fixture
def clean(engine):
    def wipe():
        with engine.begin() as conn:
            conn.execute(text(f"DELETE FROM {SCHEMA}.registro_coletas"))

    wipe()
    yield
    wipe()


@pytest.mark.usefixtures("clean")
def test_records_one_row_per_source_with_catalog_frequency_and_isolates_portals(engine):
    record_collections(engine, "portal_a", {"portal_municipal": 120, "pncp": 0}, _COLLECTED_AT)
    record_collections(engine, "portal_b", {"siconfi_rgf": 7}, _COLLECTED_AT)

    assert _rows(engine, "portal_a") == [
        ("pncp", _COLLECTED_AT.isoformat(), "semanal", "0"),
        ("portal_municipal", _COLLECTED_AT.isoformat(), "diaria", "120"),
    ]
    assert _rows(engine, "portal_b") == [("siconfi_rgf", _COLLECTED_AT.isoformat(), "mensal", "7")]


@pytest.mark.usefixtures("clean")
def test_reloading_same_run_is_idempotent_and_new_run_appends(engine):
    later = datetime(2026, 11, 11, 8, 30, tzinfo=timezone.utc)
    record_collections(engine, "portal_a", {"portal_municipal": 1}, _COLLECTED_AT)
    record_collections(engine, "portal_a", {"portal_municipal": 1}, _COLLECTED_AT)
    record_collections(engine, "portal_a", {"portal_municipal": 1}, later)

    assert [row[1] for row in _rows(engine, "portal_a")] == [_COLLECTED_AT.isoformat(), later.isoformat()]


@pytest.mark.usefixtures("clean")
def test_unknown_source_is_rejected_and_nothing_is_written(engine):
    with pytest.raises(ValueError, match="fonte_inventada"):
        record_collections(engine, "portal_a", {"portal_municipal": 1, "fonte_inventada": 1}, _COLLECTED_AT)

    assert _rows(engine, "portal_a") == []


def test_every_source_recorded_by_load_runner_is_monitored_in_catalog():
    catalog = load_source_catalog()
    added = set(re.findall(r'rows_loaded\["([a-z_]+)"\]', _RUN_PY.read_text(encoding="utf-8")))

    recorded = added | {MUNICIPAL_PORTAL_SOURCE}
    assert recorded <= catalog.keys()
    assert {fonte for fonte in recorded if catalog[fonte]["monitoramento"] != "monitorado"} == set()
    assert {fonte for fonte, row in catalog.items() if row["monitoramento"] == "monitorado"} == recorded


def test_farmacia_counts_as_collected_only_when_collection_succeeded(tmp_path):
    def collection(status):
        directory = tmp_path / status
        directory.mkdir()
        (directory / "coletas.json").write_text(json.dumps([{"status_coleta": status}]))
        return directory

    assert _farmacia_collection_succeeded(collection("sucesso"))
    assert not _farmacia_collection_succeeded(collection("falha"))
    assert not _farmacia_collection_succeeded(tmp_path)


def _run_main(monkeypatch, engine, run_dir, *, farmacia_rows=1, siconfi_rgf_rows=1):
    """Executa main() sobre um diretório de coleta, com extração e carga das fontes substituídas por dublês."""
    portal = SimpleNamespace(slug="portal_a", provider="fiorilli", raw_schema="raw_portal_a")
    monkeypatch.setattr(sys, "argv", ["run", "--portal", "portal_a", "--dir", str(run_dir)])
    monkeypatch.setattr(load_run.PortalConfig, "load", lambda slug: portal)
    monkeypatch.setattr(
        load_run, "importlib", SimpleNamespace(import_module=lambda name: SimpleNamespace(ENDPOINT_CONFIGS=[]))
    )
    monkeypatch.setattr(load_run, "get_engine", lambda: engine)
    monkeypatch.setattr(load_run, "_upsert_raw", lambda *args, **kwargs: 0)
    monkeypatch.setattr("elt.load.farmacia_sus.load_farmacia_sus_dir", lambda *args: farmacia_rows)
    monkeypatch.setattr("elt.load.siconfi.ensure_siconfi_rgf_table", lambda *args: None)
    monkeypatch.setattr("elt.load.siconfi.load_siconfi_rgf", lambda *args, **kwargs: siconfi_rgf_rows)
    load_run.main()


def _write_run(base, name, farmacia_status="sucesso"):
    run_dir = base / name
    (run_dir / "farmacia_sus").mkdir(parents=True)
    (run_dir / "farmacia_sus" / "coletas.json").write_text(json.dumps([{"status_coleta": farmacia_status}]))
    (run_dir / "siconfi_rgf").mkdir()
    (run_dir / "siconfi_rgf" / "dados.json").write_text("[]")
    return run_dir


@pytest.mark.usefixtures("clean")
def test_main_records_each_source_that_loaded_rows(monkeypatch, engine, tmp_path):
    run_dir = _write_run(tmp_path, "20261110_083000")

    _run_main(monkeypatch, engine, run_dir)

    assert [(fonte, frequencia, total) for fonte, _, frequencia, total in _rows(engine, "portal_a")] == [
        ("farmacia_sus", "diaria", "1"),
        ("siconfi_rgf", "mensal", "1"),
    ]


@pytest.mark.usefixtures("clean")
def test_main_does_not_record_failed_farmacia_collection(monkeypatch, engine, tmp_path):
    run_dir = _write_run(tmp_path, "20261110_083000", farmacia_status="falha")

    _run_main(monkeypatch, engine, run_dir)

    assert [fonte for fonte, *_ in _rows(engine, "portal_a")] == ["siconfi_rgf"]


@pytest.mark.usefixtures("clean")
def test_main_records_source_that_responded_with_zero_rows(monkeypatch, engine, tmp_path):
    run_dir = _write_run(tmp_path, "20261110_083000")

    _run_main(monkeypatch, engine, run_dir, farmacia_rows=0, siconfi_rgf_rows=0)

    assert [(fonte, total) for fonte, _, _, total in _rows(engine, "portal_a")] == [
        ("farmacia_sus", "0"),
        ("siconfi_rgf", "0"),
    ]


@pytest.mark.usefixtures("clean")
def test_main_does_not_record_unrecognized_pncp_file(monkeypatch, engine, tmp_path):
    run_dir = tmp_path / "20261110_083000"
    (run_dir / "pncp").mkdir(parents=True)
    (run_dir / "pncp" / "desconhecido.json").write_text("[]")
    monkeypatch.setattr("elt.load.pncp.ensure_pncp_tables", lambda *args: None)

    _run_main(monkeypatch, engine, run_dir)

    assert _rows(engine, "portal_a") == []


@pytest.mark.usefixtures("clean")
def test_main_records_nothing_when_run_directory_has_no_timestamp(monkeypatch, engine, tmp_path):
    run_dir = _write_run(tmp_path, "coleta_manual")

    _run_main(monkeypatch, engine, run_dir)

    assert _rows(engine, "portal_a") == []
