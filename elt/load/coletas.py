"""Registro de coletas por fonte (raw_coletas.registro_coletas).

Cada carga concluída grava uma linha por (portal_slug, fonte, coletado_em), com a frequência esperada lida do
catálogo único `seed_fontes_coleta.csv`. Fontes fora do catálogo são recusadas, para que a frequência nunca seja
declarada à mão em outro lugar. Colunas TEXT (Regra 16) e chave com portal_slug (Regra 23).
"""

from __future__ import annotations

import csv
from datetime import datetime
from functools import cache
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.engine import Engine

SCHEMA = "raw_coletas"
SOURCE_CATALOG_PATH = Path(__file__).resolve().parents[1] / "transform" / "seeds" / "seed_fontes_coleta.csv"


@cache
def load_source_catalog() -> dict[str, dict[str, str]]:
    """Catálogo de fontes indexado por `fonte` (frequencia_esperada e monitoramento)."""
    with SOURCE_CATALOG_PATH.open(newline="", encoding="utf-8") as f:
        return {row["fonte"]: row for row in csv.DictReader(f)}


def ensure_collection_log_table(engine: Engine) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                f"""
                CREATE SCHEMA IF NOT EXISTS "{SCHEMA}";
                CREATE TABLE IF NOT EXISTS "{SCHEMA}"."registro_coletas" (
                    "portal_slug" TEXT NOT NULL,
                    "fonte" TEXT NOT NULL,
                    "coletado_em" TEXT NOT NULL,
                    "frequencia_esperada" TEXT NOT NULL,
                    PRIMARY KEY ("portal_slug", "fonte", "coletado_em")
                );
                """
            )
        )


def record_collections(engine: Engine, portal_slug: str, fontes: set[str], coletado_em: datetime) -> int:
    """Grava uma coleta por fonte; reexecutar a mesma carga só atualiza a frequência (idempotente)."""
    catalog = load_source_catalog()
    unknown = sorted(fontes - catalog.keys())
    if unknown:
        raise ValueError(f"Fonte(s) fora de seed_fontes_coleta.csv: {unknown}")
    if not fontes:
        return 0

    ensure_collection_log_table(engine)
    rows = [
        {
            "portal_slug": portal_slug,
            "fonte": fonte,
            "coletado_em": coletado_em.isoformat(),
            "frequencia_esperada": catalog[fonte]["frequencia_esperada"],
        }
        for fonte in sorted(fontes)
    ]
    with engine.begin() as conn:
        conn.execute(
            text(
                f'INSERT INTO "{SCHEMA}"."registro_coletas" (portal_slug, fonte, coletado_em, frequencia_esperada) '
                "VALUES (:portal_slug, :fonte, :coletado_em, :frequencia_esperada) "
                "ON CONFLICT (portal_slug, fonte, coletado_em) "
                "DO UPDATE SET frequencia_esperada = EXCLUDED.frequencia_esperada"
            ),
            rows,
        )
    return len(rows)
