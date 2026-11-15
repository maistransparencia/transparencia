"""Carregador dos indicadores do SIOPS (Ministério da Saúde) no schema raw único da fonte."""

import logging
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection, Engine

from elt.core.db import Connectable, upsert

logger = logging.getLogger(__name__)

SCHEMA = "raw_siops"
TABLE_NAME = "siops_indicadores"

KEY_COLS = ["portal_slug", "ano", "periodo", "via", "codigo_indicador"]


def ensure_siops_table(engine: Connectable, schema: str = SCHEMA) -> None:
    """Garante a existência da tabela raw do SIOPS, compartilhada por todos os portais.

    `via` é `tabnet` (série histórica, só anos fechados) ou `consulta_ano` (página de indicadores do município,
    que cobre também o ano em andamento). As duas vias gravam lado a lado para a conferência no dbt.
    `tipo_periodo` é `anual` (`periodo` 6, fechamento) ou `bimestral` (`periodo` 1 a 5, acumulado parcial).
    `valor` nulo é "sem dado" (não houve transmissão), nunca zero.
    """
    ddl = f"""
    CREATE SCHEMA IF NOT EXISTS "{schema}";
    CREATE TABLE IF NOT EXISTS "{schema}"."{TABLE_NAME}" (
        portal_slug TEXT NOT NULL,
        ano INTEGER NOT NULL,
        periodo INTEGER NOT NULL,
        tipo_periodo TEXT NOT NULL,
        via TEXT NOT NULL,
        codigo_indicador TEXT NOT NULL,
        unidade TEXT NOT NULL,
        valor NUMERIC,
        coletado_em TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (portal_slug, ano, periodo, via, codigo_indicador)
    );
    """
    if isinstance(engine, Engine):
        with engine.begin() as conn:
            conn.execute(text(ddl))
    elif isinstance(engine, Connection):
        engine.execute(text(ddl))


def load_siops_indicadores(db: Connectable, rows: list[dict[str, Any]], schema: str = SCHEMA) -> int:
    """Insere ou atualiza os indicadores em raw_siops.siops_indicadores, sem tocar nas linhas de outros portais."""
    if not rows:
        return 0
    return upsert(db, TABLE_NAME, rows, KEY_COLS, schema=schema)
