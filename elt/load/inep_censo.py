"""Carregador das matrículas do Censo Escolar (INEP) no schema raw único da fonte."""

import logging
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection, Engine

from elt.core.db import Connectable, upsert

logger = logging.getLogger(__name__)

SCHEMA = "raw_inep_censo"
TABLE_NAME = "matriculas_rede_municipal"

KEY_COLS = ["portal_slug", "ano"]


def ensure_inep_censo_table(engine: Connectable, schema: str = SCHEMA) -> None:
    """Garante a existência da tabela raw de matrículas, compartilhada por todos os portais.

    `portal_slug` faz parte da chave primária: cada portal grava e recarrega só as suas linhas.
    `matriculas_educacao_infantil` (creche e pré-escola) e `matriculas_ensino_fundamental` (1º ao 9º ano) são da rede
    municipal (API do IBGE, Censo Escolar do INEP).
    """
    ddl = f"""
    CREATE SCHEMA IF NOT EXISTS "{schema}";
    CREATE TABLE IF NOT EXISTS "{schema}"."{TABLE_NAME}" (
        portal_slug TEXT NOT NULL,
        ano INTEGER NOT NULL,
        codigo_municipio_ibge INTEGER NOT NULL,
        matriculas_educacao_infantil INTEGER NOT NULL,
        matriculas_ensino_fundamental INTEGER NOT NULL,
        coletado_em TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (portal_slug, ano)
    );
    """
    if isinstance(engine, Engine):
        with engine.begin() as conn:
            conn.execute(text(ddl))
    elif isinstance(engine, Connection):
        engine.execute(text(ddl))


def load_inep_censo_matriculas(db: Connectable, rows: list[dict[str, Any]], schema: str = SCHEMA) -> int:
    """Insere ou atualiza as matrículas em raw_inep_censo.matriculas_rede_municipal, sem tocar em outros portais."""
    if not rows:
        return 0
    return upsert(db, TABLE_NAME, rows, KEY_COLS, schema=schema)
