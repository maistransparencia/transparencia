"""Cadence groups stay consistent with the seed, extract/run.py and the scheduled workflow YAMLs."""

import csv
import re
from pathlib import Path

import pytest
import yaml

from elt.core.cadence import CADENCE_GROUPS, UNSCHEDULED_SOURCES

ROOT = Path(__file__).resolve().parents[2]
SEED = ROOT / "elt/transform/seeds/seed_fontes_coleta.csv"
WORKFLOWS = ROOT / ".github/workflows"
MIN_SLACK_DAYS = 1


def _seed_sources() -> dict[str, dict[str, str]]:
    with open(SEED, newline="", encoding="utf-8") as f:
        return {row["fonte"]: row for row in csv.DictReader(f)}


def _grouped_sources() -> list[str]:
    return [key for group in CADENCE_GROUPS for key in group.only_keys]


def test_each_collected_source_is_in_exactly_one_group():
    grouped = _grouped_sources()

    assert len(grouped) == len(set(grouped))


def test_every_seed_source_is_in_a_group_or_explicitly_unscheduled():
    covered = set(_grouped_sources()) | set(UNSCHEDULED_SOURCES)

    assert set(_seed_sources()) == covered
    assert not set(_grouped_sources()) & set(UNSCHEDULED_SOURCES)


def test_group_keys_are_accepted_by_extract_run():
    source = (ROOT / "elt/extract/run.py").read_text(encoding="utf-8")
    keys = {key for group in CADENCE_GROUPS for key in group.only_keys}

    assert all(re.search(rf'"{key}"', source) for key in keys)


@pytest.mark.parametrize("group", CADENCE_GROUPS, ids=lambda g: g.name)
def test_seed_frequency_equals_group_name(group):
    seed = _seed_sources()

    assert {key: seed[key]["frequencia_esperada"] for key in group.only_keys} == {
        key: group.name for key in group.only_keys
    }


@pytest.mark.parametrize("group", CADENCE_GROUPS, ids=lambda g: g.name)
def test_tolerance_covers_the_cron_interval(group):
    seed = _seed_sources()

    for key in group.only_keys:
        assert int(seed[key]["tolerancia_dias"]) >= group.max_interval_days + MIN_SLACK_DAYS


@pytest.mark.parametrize("group", CADENCE_GROUPS, ids=lambda g: g.name)
def test_caller_workflow_matches_group_definition(group):
    workflow = yaml.safe_load((WORKFLOWS / group.workflow_file).read_text(encoding="utf-8"))
    triggers = workflow.get("on") or workflow[True]  # PyYAML parses a bare `on` key as boolean True
    call = next(job for job in workflow["jobs"].values() if "uses" in job)

    assert triggers["schedule"] == [{"cron": group.cron}]
    assert set(triggers["workflow_dispatch"]["inputs"]) == {"portal", "years", "dry_run"}
    assert call["uses"] == "./.github/workflows/ingestion-group.yml"
    assert call["with"]["only"] == " ".join(group.only_keys)


def test_old_pipeline_workflow_is_replaced():
    assert not (WORKFLOWS / "ingestion-pipeline.yml").exists()


def test_reusable_workflow_parses_and_shares_concurrency():
    reusable = yaml.safe_load((WORKFLOWS / "ingestion-group.yml").read_text(encoding="utf-8"))
    triggers = reusable.get("on") or reusable[True]

    assert "workflow_call" in triggers
    assert reusable["jobs"]["load_and_transform"]["concurrency"]["cancel-in-progress"] is False


@pytest.mark.parametrize("group", CADENCE_GROUPS, ids=lambda g: g.name)
def test_scheduled_runs_are_gated_by_repository_variable(group):
    workflow = yaml.safe_load((WORKFLOWS / group.workflow_file).read_text(encoding="utf-8"))
    call = next(job for job in workflow["jobs"].values() if "uses" in job)

    assert "vars.INGESTION_SCHEDULE_ENABLED == 'true'" in call["if"]
    assert "github.event_name != 'schedule'" in call["if"]
