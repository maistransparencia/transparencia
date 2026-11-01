"""Carregador dos indicadores do Relatório Gerencial do SIOPE (FNDE) no schema raw único da fonte."""

import logging
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection, Engine

from elt.core.db import Connectable, upsert

logger = logging.getLogger(__name__)

SCHEMA = "raw_siope"
TABLE_NAME = "siope_indicadores"

KEY_COLS = ["portal_slug", "ano", "periodo", "codigo_indicador"]


def ensure_siope_table(engine: Connectable, schema: str = SCHEMA) -> None:
    """Garante a existência da tabela raw de indicadores do SIOPE, compartilhada por todos os portais.

    `portal_slug` faz parte da chave primária: cada portal grava e recarrega só as suas linhas.

    `tipo_periodo` é `anual` (código "A" da API, `periodo` 6 = 6º bimestre, fechamento do ano) ou `bimestral`
    (código "B", `periodo` 1 a 5, valor acumulado no ano até o bimestre, só de ano ainda em andamento).
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


def load_siope_indicadores(db: Connectable, rows: list[dict[str, Any]], schema: str = SCHEMA) -> int:
    """Insere ou atualiza os indicadores em raw_siope.siope_indicadores, sem tocar nas linhas de outros portais."""
    if not rows:
        return 0
    return upsert(db, TABLE_NAME, rows, KEY_COLS, schema=schema)
