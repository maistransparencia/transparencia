"""Cadence groups: which sources each scheduled ingestion workflow collects and when it runs.

The group name equals the seed's `frequencia_esperada`; tests keep both in sync.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class CadenceGroup:
    name: str
    cron: str
    only_keys: tuple[str, ...]
    max_interval_days: int
    workflow_file: str
    # Sources collected by a dedicated job of the group (not by `elt.extract.run --only`).
    dedicated_keys: tuple[str, ...] = ()

    @property
    def source_keys(self) -> tuple[str, ...]:
        return (*self.only_keys, *self.dedicated_keys)


CADENCE_GROUPS: tuple[CadenceGroup, ...] = (
    CadenceGroup(
        "diaria",
        "0 23 * * 1-5",
        ("portal_municipal", "farmacia_sus"),
        max_interval_days=3,
        workflow_file="ingestion-daily.yml",
    ),
    CadenceGroup(
        "semanal", "0 23 * * 6", ("pncp", "obrasgov"), max_interval_days=7, workflow_file="ingestion-weekly.yml"
    ),
    CadenceGroup(
        "mensal",
        "0 23 3 * *",
        ("siconfi_msc", "siconfi_rgf", "siope", "siops"),
        max_interval_days=31,
        workflow_file="ingestion-monthly.yml",
        dedicated_keys=("saude_rede", "saude_producao"),
    ),
)

# Sources in the seed that elt.extract.run does not collect on a schedule, with the reason.
UNSCHEDULED_SOURCES: dict[str, str] = {
    "inep_censo": "anual, cadencia propria",
    "inep_ideb": "anual, verificado por check-inep-ideb-updates.yml",
    "inep_ideb_estados": "anual, verificado por check-inep-ideb-updates.yml",
    "inep_ideb_brasil": "anual, verificado por check-inep-ideb-updates.yml",
    "emendas_estaduais": "sob demanda",
}
