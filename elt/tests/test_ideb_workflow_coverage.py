"""Every IDEB seed is checked by the monthly IDEB workflow."""

from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
SEEDS = ROOT / "elt/transform/seeds"
WORKFLOW = ROOT / ".github/workflows/check-inep-ideb-updates.yml"


def _ideb_seeds() -> set[str]:
    return {path.stem for path in SEEDS.glob("seed_inep_ideb*.csv")}


def _validation_script() -> str:
    workflow = yaml.safe_load(WORKFLOW.read_text(encoding="utf-8"))
    steps = workflow["jobs"]["check-updates"]["steps"]
    return next(step["run"] for step in steps if step.get("name") == "Seed database and validate")


def test_every_ideb_seed_is_seeded_and_tested_by_the_workflow():
    script = _validation_script()
    seed_line = next(line for line in script.splitlines() if "dbt/seed" in line)
    test_line = next(line for line in script.splitlines() if "dbt/test" in line)

    assert _ideb_seeds()
    assert all(seed in seed_line and seed in test_line for seed in _ideb_seeds())


def test_national_average_is_synced_by_the_workflow():
    assert "sync_ibge_ideb_brasil.py" in WORKFLOW.read_text(encoding="utf-8")


def test_every_ideb_seed_is_in_the_source_catalog():
    import csv

    with (SEEDS / "seed_fontes_coleta.csv").open(newline="", encoding="utf-8") as f:
        catalog = {row["fonte"]: row for row in csv.DictReader(f)}

    assert {seed.removeprefix("seed_") for seed in _ideb_seeds()} <= set(catalog)
    assert all(catalog[seed.removeprefix("seed_")]["monitoramento"] == "nao_monitorado" for seed in _ideb_seeds())
