"""Escala do raw_<fonte>: estrutura das tabelas migradas, limiares e relatório de carga."""

import logging
from pathlib import Path

import pytest
import yaml

from elt.core.config import (
    SCALE_DESIGN_NOTE,
    SCALE_MAX_COLUMNS_PER_TABLE,
    SCALE_MAX_LOAD_MINUTES,
    SCALE_MAX_MUNICIPALITIES_PER_PROVIDER,
    SCALE_MAX_ROWS_PER_TABLE,
)
from elt.load import scale_monitor
from elt.load.scale_monitor import TableScale, find_threshold_breaches, log_scale_report

_REPO_ROOT = Path(__file__).resolve().parents[2]
_FIORILLI_SOURCES = _REPO_ROOT / "elt" / "transform" / "models" / "staging" / "fiorilli" / "_sources.yml"


def _fiorilli_tables() -> list[dict]:
    return yaml.safe_load(_FIORILLI_SOURCES.read_text(encoding="utf-8"))["sources"][0]["tables"]


@pytest.mark.parametrize("table", _fiorilli_tables(), ids=lambda t: t["name"])
def test_raw_fiorilli_table_has_portal_slug_in_key_and_limited_width(table):
    primary_key = table.get("meta", {}).get("primary_key", [])
    assert "portal_slug" in primary_key, f"{table['name']}: PK sem portal_slug (ver {SCALE_DESIGN_NOTE})"
    assert len(table.get("columns", [])) <= SCALE_MAX_COLUMNS_PER_TABLE, (
        f"{table['name']}: mais de {SCALE_MAX_COLUMNS_PER_TABLE} colunas (ver {SCALE_DESIGN_NOTE})"
    )


def test_design_note_exists():
    assert (_REPO_ROOT / SCALE_DESIGN_NOTE).is_file()


def test_no_breach_at_thresholds():
    tables = [TableScale("receita_detalhes", SCALE_MAX_ROWS_PER_TABLE, 1, SCALE_MAX_COLUMNS_PER_TABLE)]
    load_seconds = SCALE_MAX_LOAD_MINUTES * 60
    assert find_threshold_breaches(tables, SCALE_MAX_MUNICIPALITIES_PER_PROVIDER, load_seconds, "raw_x") == []


def test_each_threshold_is_reported():
    tables = [
        TableScale("larga", 1, 1, SCALE_MAX_COLUMNS_PER_TABLE + 1),
        TableScale("grande", SCALE_MAX_ROWS_PER_TABLE + 1, 1, 1),
    ]
    breaches = find_threshold_breaches(
        tables, SCALE_MAX_MUNICIPALITIES_PER_PROVIDER + 1, SCALE_MAX_LOAD_MINUTES * 60 + 1, "raw_x"
    )
    assert len(breaches) == 4
    assert any("municípios" in b for b in breaches)
    assert any("raw_x.larga" in b and "colunas" in b for b in breaches)
    assert any("raw_x.grande" in b and "linhas" in b for b in breaches)
    assert any("carga" in b for b in breaches)


def test_report_logs_metrics_and_highlights_breach(monkeypatch, caplog):
    monkeypatch.setattr(
        scale_monitor,
        "collect_table_scales",
        lambda _engine, _schema: [TableScale("t", SCALE_MAX_ROWS_PER_TABLE + 1, 10, 3)],
    )
    monkeypatch.setattr(scale_monitor, "count_municipalities", lambda _engine, _schema, _tables: 2)
    with caplog.at_level(logging.INFO):
        log_scale_report(None, "raw_x", 1.0)
    assert "raw_x.t: 5000001 linhas" in caplog.text
    assert "LIMIAR DE ESCALA ULTRAPASSADO" in caplog.text
    assert SCALE_DESIGN_NOTE in caplog.text


def test_report_warns_and_does_not_raise_when_metrics_unavailable(monkeypatch, caplog):
    def unavailable(_engine, _schema):
        raise RuntimeError("sem acesso")

    monkeypatch.setattr(scale_monitor, "collect_table_scales", unavailable)
    with caplog.at_level(logging.WARNING):
        log_scale_report(None, "raw_x", 1.0)
    assert "indisponíveis" in caplog.text
