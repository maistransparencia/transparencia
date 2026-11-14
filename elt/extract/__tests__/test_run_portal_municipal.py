"""extract/run.py: the portal_municipal key runs every municipal listing and nothing else."""

import sys
from types import SimpleNamespace

import pytest
import requests
from elt.extract import run as extract_run


class FakeExtractor:
    extracted: list[str] = []

    def __init__(self, base_path, listagem, table, *args, **kwargs):
        self.listagem = listagem

    def extract(self, empresa_id, year):
        FakeExtractor.extracted.append(self.listagem)
        return [{"listagem": self.listagem}]


@pytest.fixture
def harness(monkeypatch, tmp_path):
    monkeypatch.chdir(tmp_path)
    FakeExtractor.extracted = []
    endpoints = [
        SimpleNamespace(
            extractor_cls=FakeExtractor, base_path="/x", listagem=name, table=f"raw_{name}", extra={}, base_url=""
        )
        for name in ("receitas", "despesas")
    ]
    portal = SimpleNamespace(
        slug="portal_a",
        provider="fiorilli",
        cod_ibge=3300000,
        ano_inicial=2024,
        base_host="",
        empresa_padrao=1,
        orgaos_csv_path="missing.csv",
        load_orgaos=lambda: {1: "Prefeitura"},
    )
    monkeypatch.setattr(extract_run.PortalConfig, "load", lambda slug: portal)
    monkeypatch.setattr(
        extract_run,
        "importlib",
        SimpleNamespace(import_module=lambda name: SimpleNamespace(ENDPOINT_CONFIGS=endpoints)),
    )
    farmacia_calls = []
    monkeypatch.setattr(
        "elt.extract.farmacia_sus.FarmaciaSusExtractor",
        lambda: SimpleNamespace(extract=lambda **kw: farmacia_calls.append(1) or {}),
    )

    def run(*only):
        monkeypatch.setattr(sys, "argv", ["run", "--portal", "portal_a", "--years", "2024", "--only", *only])
        extract_run.main()
        return list((tmp_path / "data/raw_runs/portal_a").iterdir())[0]

    return SimpleNamespace(run=run, farmacia_calls=farmacia_calls)


def test_portal_municipal_runs_every_listing_and_no_other_source(harness):
    run_dir = harness.run("portal_municipal")

    assert sorted(FakeExtractor.extracted) == ["despesas", "receitas"]
    assert (run_dir / "raw_receitas/1_2024.json").exists()
    assert harness.farmacia_calls == []


def test_portal_municipal_combined_with_farmacia_sus_runs_both(harness):
    harness.run("portal_municipal", "farmacia_sus")

    assert sorted(FakeExtractor.extracted) == ["despesas", "receitas"]
    assert harness.farmacia_calls == [1]


def test_single_listing_key_still_filters_listings(harness):
    harness.run("receitas")

    assert FakeExtractor.extracted == ["receitas"]
    assert harness.farmacia_calls == []


def test_failed_listing_is_logged_with_catalog_source_and_error_code(harness, monkeypatch):
    import csv

    def broken_extract(self, empresa_id, year):
        raise requests.ConnectionError("down") if self.listagem == "despesas" else RuntimeError("x")

    monkeypatch.setattr(FakeExtractor, "extract", broken_extract)

    run_dir = harness.run("portal_municipal")

    with open(run_dir / "failed_requests.csv", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    assert sorted((r["listagem"], r["fonte"], r["erro_codigo"]) for r in rows) == [
        ("despesas", "portal_municipal", "fonte_fora_do_ar"),
        ("receitas", "portal_municipal", "erro_inesperado"),
    ]


def test_farmacia_failure_code_is_handed_off_to_failed_requests_csv(harness, monkeypatch):
    import csv

    stub = SimpleNamespace(
        extract=lambda **kw: {"coletas": [{"status_coleta": "falha"}]},
        last_error_code="fonte_fora_do_ar",
        last_error_message="HTTP 503",
    )
    monkeypatch.setattr("elt.extract.farmacia_sus.FarmaciaSusExtractor", lambda: stub)

    run_dir = harness.run("farmacia_sus")

    with open(run_dir / "failed_requests.csv", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    assert [(r["fonte"], r["erro_codigo"], r["error"]) for r in rows] == [
        ("farmacia_sus", "fonte_fora_do_ar", "HTTP 503")
    ]
