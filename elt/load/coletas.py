"""Registro de coletas por fonte (raw_coletas.registro_coletas).

Cada carga concluída grava uma linha por (portal_slug, fonte, coletado_em), com a frequência esperada lida do
catálogo único `seed_fontes_coleta.csv` e o total de linhas carregadas (zero quando a fonte respondeu sem registros). Fontes fora do catálogo são recusadas, para que a frequência nunca seja
declarada à mão em outro lugar. Colunas TEXT (Regra 16) e chave com portal_slug (Regra 23).
"""

from __future__ import annotations

import csv
from collections.abc import Mapping
from datetime import datetime
from functools import cache
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.engine import Engine

SCHEMA = "raw_coletas"
# Código único para o portal da prefeitura, qualquer que seja o sistema (`provider`): o catálogo tem uma linha por tipo de fonte.
MUNICIPAL_PORTAL_SOURCE = "portal_municipal"
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
                    "total_linhas" TEXT,
                    PRIMARY KEY ("portal_slug", "fonte", "coletado_em")
                );
                ALTER TABLE "{SCHEMA}"."registro_coletas" ADD COLUMN IF NOT EXISTS "total_linhas" TEXT;
                """
            )
        )


def record_collections(
    engine: Engine, portal_slug: str, rows_by_source: Mapping[str, int], coletado_em: datetime
) -> int:
    """Grava uma coleta por fonte, inclusive a que veio vazia; reexecutar a mesma carga só atualiza frequência e total."""
    catalog = load_source_catalog()
    fontes = set(rows_by_source)
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
            "total_linhas": str(rows_by_source[fonte]),
        }
        for fonte in sorted(fontes)
    ]
    with engine.begin() as conn:
        conn.execute(
            text(
                f'INSERT INTO "{SCHEMA}"."registro_coletas" (portal_slug, fonte, coletado_em, frequencia_esperada, total_linhas) '
                "VALUES (:portal_slug, :fonte, :coletado_em, :frequencia_esperada, :total_linhas) "
                "ON CONFLICT (portal_slug, fonte, coletado_em) "
                "DO UPDATE SET frequencia_esperada = EXCLUDED.frequencia_esperada, total_linhas = EXCLUDED.total_linhas"
            ),
            rows,
        )
    return len(rows)
