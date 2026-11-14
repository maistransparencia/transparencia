"""Monitoramento de escala do raw_<fonte>: volume, largura e municípios por provedor.

Os limiares ficam em `elt.core.config` (único lugar). Ultrapassar um limiar só destaca no log da carga mensal;
nunca derruba a carga nem abre issue. Métrica indisponível vira aviso.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.engine import Engine

from elt.core.config import (
    SCALE_DESIGN_NOTE,
    SCALE_MAX_COLUMNS_PER_TABLE,
    SCALE_MAX_LOAD_MINUTES,
    SCALE_MAX_MUNICIPALITIES_PER_PROVIDER,
    SCALE_MAX_ROWS_PER_TABLE,
)

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class TableScale:
    table: str
    row_count: int
    total_bytes: int
    column_count: int


def collect_table_scales(engine: Engine, schema: str) -> list[TableScale]:
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT c.relname AS table_name,
                       COALESCE(s.n_live_tup, 0) AS row_count,
                       pg_total_relation_size(c.oid) AS total_bytes,
                       (SELECT count(*) FROM information_schema.columns ic
                         WHERE ic.table_schema = n.nspname AND ic.table_name = c.relname) AS column_count
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
                WHERE n.nspname = :schema AND c.relkind = 'r'
                ORDER BY c.relname
                """
            ),
            {"schema": schema},
        ).all()
    return [TableScale(r.table_name, int(r.row_count), int(r.total_bytes), int(r.column_count)) for r in rows]


def count_municipalities(engine: Engine, schema: str, tables: list[TableScale]) -> int:
    """Municípios distintos (portal_slug) em todo o schema; tabelas sem a coluna são ignoradas."""
    with engine.connect() as conn:
        with_slug = {
            r.table_name
            for r in conn.execute(
                text(
                    "SELECT table_name FROM information_schema.columns "
                    "WHERE table_schema = :schema AND column_name = 'portal_slug'"
                ),
                {"schema": schema},
            )
        }
        slugs: set[str] = set()
        for scale in tables:
            if scale.table in with_slug:
                slugs.update(
                    r[0] for r in conn.execute(text(f'SELECT DISTINCT "portal_slug" FROM "{schema}"."{scale.table}"'))
                )
    return len(slugs)


def find_threshold_breaches(
    tables: list[TableScale], municipality_count: int, load_seconds: float, schema: str
) -> list[str]:
    breaches = [
        *(
            [f"{schema}: {municipality_count} municípios (limiar {SCALE_MAX_MUNICIPALITIES_PER_PROVIDER})"]
            if municipality_count > SCALE_MAX_MUNICIPALITIES_PER_PROVIDER
            else []
        ),
        *(
            f"{schema}.{t.table}: {t.row_count} linhas (limiar {SCALE_MAX_ROWS_PER_TABLE})"
            for t in tables
            if t.row_count > SCALE_MAX_ROWS_PER_TABLE
        ),
        *(
            f"{schema}.{t.table}: {t.column_count} colunas (limiar {SCALE_MAX_COLUMNS_PER_TABLE})"
            for t in tables
            if t.column_count > SCALE_MAX_COLUMNS_PER_TABLE
        ),
        *(
            [f"carga de {load_seconds / 60:.1f} min (limiar {SCALE_MAX_LOAD_MINUTES} min)"]
            if load_seconds > SCALE_MAX_LOAD_MINUTES * 60
            else []
        ),
    ]
    return breaches


def log_scale_report(engine: Engine, schema: str, load_seconds: float) -> None:
    """Registra no log duração, linhas/tamanho por tabela, municípios do provedor e limiares ultrapassados."""
    try:
        tables = collect_table_scales(engine, schema)
        municipality_count = count_municipalities(engine, schema, tables)
    except Exception as exc:  # métrica indisponível não derruba a carga
        logger.warning("Métricas de escala de %s indisponíveis: %s", schema, exc)
        return

    logger.info(
        "Escala %s: carga em %.1f s, %d municípios, %d tabelas", schema, load_seconds, municipality_count, len(tables)
    )
    for t in tables:
        logger.info(
            "Escala %s.%s: %d linhas, %d bytes, %d colunas", schema, t.table, t.row_count, t.total_bytes, t.column_count
        )
    for breach in find_threshold_breaches(tables, municipality_count, load_seconds, schema):
        logger.warning("LIMIAR DE ESCALA ULTRAPASSADO — %s. Reavaliar o desenho: %s", breach, SCALE_DESIGN_NOTE)
