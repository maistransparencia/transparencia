"""extract/run.py: the portal_municipal key runs every municipal listing and nothing else."""

import sys
from types import SimpleNamespace

import pytest
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
