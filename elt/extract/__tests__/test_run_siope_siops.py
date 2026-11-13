"""extract/run.py: SIOPE and SIOPS write JSON in the standard run layout and only run when named in --only."""

import csv
import sys
from types import SimpleNamespace

import pytest
from elt.extract import run as extract_run
from elt.extract.siope import SiopeError
from elt.extract.siops import SiopsError


@pytest.fixture
def harness(monkeypatch, tmp_path):
    monkeypatch.chdir(tmp_path)
    portal = SimpleNamespace(
        slug="portal_a",
        provider="fiorilli",
        cod_ibge=3300000,
        ano_inicial=2024,
        base_host="",
        empresa_padrao=1,
        orgaos_csv_path="missing.csv",
        load_orgaos=lambda: {},
    )
    monkeypatch.setattr(extract_run.PortalConfig, "load", lambda slug: portal)
    monkeypatch.setattr(
        extract_run, "importlib", SimpleNamespace(import_module=lambda name: SimpleNamespace(ENDPOINT_CONFIGS=[]))
    )
    calls = {"siope": 0, "siops": 0}

    def fake(source, rows=None, error=None):
        def extrair(*args, **kwargs):
            calls[source] += 1
            if error:
                raise error
            return rows or []

        return extrair

    def run(*only, siope=None, siops=None, siope_error=None, siops_error=None):
        monkeypatch.setattr("elt.extract.siope.extrair_siope", fake("siope", siope, siope_error))
        monkeypatch.setattr("elt.extract.siops.extrair_siops", fake("siops", siops, siops_error))
        monkeypatch.setattr(
            sys, "argv", ["run", "--portal", "portal_a", "--years", "2024", *(["--only", *only] if only else [])]
        )
        extract_run.main()
        return list((tmp_path / "data/raw_runs/portal_a").iterdir())[0]

    return SimpleNamespace(run=run, calls=calls)


def test_only_with_several_keys_writes_json_for_each_source(harness):
    run_dir = harness.run("siope", "siops", siope=[{"a": 1}], siops=[{"b": 2}])

    assert (run_dir / "siope_indicadores/indicadores.json").read_text().count('"a": 1') == 1
    assert (run_dir / "siops_indicadores/indicadores.json").read_text().count('"b": 2') == 1
    assert harness.calls == {"siope": 1, "siops": 1}


def test_only_siope_does_not_run_siops(harness):
    run_dir = harness.run("siope")

    assert (run_dir / "siope_indicadores/indicadores.json").read_text() == "[]"
    assert not (run_dir / "siops_indicadores").exists()
    assert harness.calls == {"siope": 1, "siops": 0}


def test_without_only_neither_source_runs(harness, monkeypatch):
    empty_extractor = lambda *args, **kwargs: SimpleNamespace(extract_ano=lambda *a: [], extract=lambda **kw: {})  # noqa: E731
    for target in (
        "elt.extract.siconfi_msc.SiconfiMscExtractor",
        "elt.extract.siconfi_rgf.SiconfiRgfExtractor",
        "elt.extract.obrasgov.ObrasGovExtractor",
        "elt.extract.farmacia_sus.FarmaciaSusExtractor",
    ):
        monkeypatch.setattr(target, empty_extractor)
    monkeypatch.setattr("elt.extract.pncp.extract_and_load_pncp", lambda **kwargs: None)

    run_dir = harness.run()

    assert harness.calls == {"siope": 0, "siops": 0}
    assert not (run_dir / "siope_indicadores").exists()
    assert not (run_dir / "siops_indicadores").exists()


@pytest.mark.parametrize(
    ("source", "kwargs"),
    [("siope", {"siope_error": SiopeError("divergiu")}), ("siops", {"siops_error": SiopsError("divergiu")})],
)
def test_extractor_error_leaves_no_json_and_is_logged_as_failed_request(harness, source, kwargs):
    run_dir = harness.run("siope", "siops", **kwargs)

    assert not (run_dir / f"{source}_indicadores").exists()
    other = "siops" if source == "siope" else "siope"
    assert (run_dir / f"{other}_indicadores/indicadores.json").exists()
    with open(run_dir / "failed_requests.csv", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    assert [(r["listagem"], r["empresa"], r["error"]) for r in rows] == [(source, "portal_a", "divergiu")]


def test_unknown_only_key_raises_value_error_listing_valid_keys(harness):
    with pytest.raises(ValueError, match="siope.*siops|siops.*siope"):
        harness.run("siope", "nao_existe")
