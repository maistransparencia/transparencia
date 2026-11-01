"""Carregador dos indicadores do Relatório Gerencial do SIOPE (FNDE) no schema raw do portal."""

import logging
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection, Engine

from elt.core.db import Connectable, upsert

logger = logging.getLogger(__name__)

TABLE_NAME = "siope_indicadores"

KEY_COLS = ["portal_slug", "ano", "periodo", "codigo_indicador"]


def ensure_siope_table(engine: Connectable, schema: str) -> None:
    """Garante a existência da tabela raw de indicadores do SIOPE no schema especificado.

    `tipo_periodo` é `anual` (código "A" da API) e `periodo` 6 é o 6º bimestre, o fechamento do ano.
    `unidade` é `percentual` ou `monetario`; `nomes_oficiais_indicador` guarda os `nomIndi` da API.
    """
    ddl = f"""
    CREATE SCHEMA IF NOT EXISTS "{schema}";
    CREATE TABLE IF NOT EXISTS "{schema}"."{TABLE_NAME}" (
        portal_slug TEXT NOT NULL,
        ano INTEGER NOT NULL,
        periodo INTEGER NOT NULL,
        tipo_periodo TEXT NOT NULL,
        codigo_indicador TEXT NOT NULL,
        codigo_interno_indicador INTEGER NOT NULL,
        unidade TEXT NOT NULL,
        nomes_oficiais_indicador TEXT NOT NULL,
        codigo_siope TEXT NOT NULL,
        valor NUMERIC,
        coletado_em TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (portal_slug, ano, periodo, codigo_indicador)
    );
    """
    if isinstance(engine, Engine):
        with engine.begin() as conn:
            conn.execute(text(ddl))
    elif isinstance(engine, Connection):
        engine.execute(text(ddl))


def load_siope_indicadores(db: Connectable, rows: list[dict[str, Any]], schema: str) -> int:
    """Insere ou atualiza os indicadores na tabela raw_<portal>.siope_indicadores."""
    if not rows:
        return 0
    return upsert(db, TABLE_NAME, rows, KEY_COLS, schema=schema)
