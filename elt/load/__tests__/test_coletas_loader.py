"""Tests for the per-source collection log (raw_coletas.registro_coletas)."""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import pytest
import yaml
from elt.load.coletas import SCHEMA, load_source_catalog, record_collections
from elt.load.run import _farmacia_collection_succeeded
from sqlalchemy import text

_RUN_PY = Path(__file__).resolve().parents[1] / "run.py"
_PORTALS_DIR = Path(__file__).resolve().parents[2] / "portals"
_COLLECTED_AT = datetime(2026, 11, 10, 8, 30, tzinfo=timezone.utc)


def _rows(engine, portal):
    with engine.connect() as conn:
        return conn.execute(
            text(
                f"SELECT fonte, coletado_em, frequencia_esperada FROM {SCHEMA}.registro_coletas "
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
    record_collections(engine, "portal_a", {"fiorilli", "pncp"}, _COLLECTED_AT)
    record_collections(engine, "portal_b", {"siconfi_rgf"}, _COLLECTED_AT)

    assert _rows(engine, "portal_a") == [
        ("fiorilli", _COLLECTED_AT.isoformat(), "diaria"),
        ("pncp", _COLLECTED_AT.isoformat(), "semanal"),
    ]
    assert _rows(engine, "portal_b") == [("siconfi_rgf", _COLLECTED_AT.isoformat(), "mensal")]


@pytest.mark.usefixtures("clean")
def test_reloading_same_run_is_idempotent_and_new_run_appends(engine):
    later = datetime(2026, 11, 11, 8, 30, tzinfo=timezone.utc)
    record_collections(engine, "portal_a", {"fiorilli"}, _COLLECTED_AT)
    record_collections(engine, "portal_a", {"fiorilli"}, _COLLECTED_AT)
    record_collections(engine, "portal_a", {"fiorilli"}, later)

    assert [row[1] for row in _rows(engine, "portal_a")] == [_COLLECTED_AT.isoformat(), later.isoformat()]


@pytest.mark.usefixtures("clean")
def test_unknown_source_is_rejected_and_nothing_is_written(engine):
    with pytest.raises(ValueError, match="fonte_inventada"):
        record_collections(engine, "portal_a", {"fiorilli", "fonte_inventada"}, _COLLECTED_AT)

    assert _rows(engine, "portal_a") == []


def test_every_source_recorded_by_load_runner_is_monitored_in_catalog():
    catalog = load_source_catalog()
    added = set(re.findall(r'fontes_carregadas\.add\("([a-z_]+)"\)', _RUN_PY.read_text(encoding="utf-8")))
    providers = {yaml.safe_load(path.read_text(encoding="utf-8"))["provider"] for path in _PORTALS_DIR.glob("*.yml")}

    recorded = added | providers
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
