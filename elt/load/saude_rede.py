"""Carregador da rede de saúde (leitos, profissionais e população residente) no schema raw_saude_rede.

Tudo TEXT (Regra 16) e `portal_slug` na chave (Regra 23). Profissionais chegam já agregados: não há
coluna para nome de pessoa física. Cada linha é uma competência (ou ano) de um portal; reexecutar
atualiza a linha, e competência sem resposta simplesmente não tem linha.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection, Engine

from elt.core.db import Connectable
from elt.load.farmacia_sus import _replace_portal_rows

SCHEMA_PADRAO = "raw_saude_rede"

TABELAS: dict[str, list[str]] = {
    "leitos_competencia": ["portal_slug", "competencia", "tipo_leito"],
    "profissionais_competencia": ["portal_slug", "competencia"],
    "populacao_residente": ["portal_slug", "ano"],
    "sia_competencia": ["portal_slug", "competencia"],
    "sih_competencia": ["portal_slug", "competencia"],
}


def ensure_saude_rede_tables(engine: Connectable, schema: str = SCHEMA_PADRAO) -> None:
    ddl = f"""
    CREATE SCHEMA IF NOT EXISTS "{schema}";

    CREATE TABLE IF NOT EXISTS "{schema}"."leitos_competencia" (
        "portal_slug" TEXT NOT NULL,
        "competencia" TEXT NOT NULL,
        "tipo_leito" TEXT NOT NULL,
        "total_leitos_existentes" TEXT,
        "total_leitos_sus" TEXT,
        "data_coleta" TEXT,
        PRIMARY KEY ("portal_slug", "competencia", "tipo_leito")
    );

    CREATE TABLE IF NOT EXISTS "{schema}"."profissionais_competencia" (
        "portal_slug" TEXT NOT NULL,
        "competencia" TEXT NOT NULL,
        "total_vinculos" TEXT,
        "total_profissionais" TEXT,
        "total_profissionais_sus" TEXT,
        "data_coleta" TEXT,
        PRIMARY KEY ("portal_slug", "competencia")
    );

    CREATE TABLE IF NOT EXISTS "{schema}"."populacao_residente" (
        "portal_slug" TEXT NOT NULL,
        "ano" TEXT NOT NULL,
        "total_populacao" TEXT,
        "data_coleta" TEXT,
        PRIMARY KEY ("portal_slug", "ano")
    );

    CREATE TABLE IF NOT EXISTS "{schema}"."sia_competencia" (
        "portal_slug" TEXT NOT NULL,
        "competencia" TEXT NOT NULL,
        "total_procedimentos_ambulatoriais" TEXT,
        "data_coleta" TEXT,
        PRIMARY KEY ("portal_slug", "competencia")
    );

    CREATE TABLE IF NOT EXISTS "{schema}"."sih_competencia" (
        "portal_slug" TEXT NOT NULL,
        "competencia" TEXT NOT NULL,
        "total_internacoes" TEXT,
        "data_coleta" TEXT,
        PRIMARY KEY ("portal_slug", "competencia")
    );
    """
    if isinstance(engine, Engine):
        with engine.begin() as conn:
            conn.execute(text(ddl))
    elif isinstance(engine, Connection):
        engine.execute(text(ddl))


def load_saude_rede_tabela(
    engine: Connectable, tabela: str, rows: list[dict[str, Any]], portal_slug: str, schema: str = SCHEMA_PADRAO
) -> int:
    """Upsert por chave; nunca apaga competências já carregadas (uma coleta parcial não destrói a série)."""
    return _replace_portal_rows(
        engine,
        schema,
        tabela,
        portal_slug,
        rows,
        TABELAS[tabela],
        replace=False,
        garantir_tabelas=ensure_saude_rede_tables,
    )
