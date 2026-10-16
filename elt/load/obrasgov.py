"""Carregador para persistir tabelas de obras públicas do ObrasGov.br no PostgreSQL.

Garante a criação do schema raw_obrasgov com colunas estritamente do tipo TEXT (Regra 16)
e chaves primárias compostas contendo portal_slug para isolamento multi-tenant (Regra 23).
"""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import MetaData, Table, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.engine import Connection, Engine

from elt.core.db import Connectable

logger = logging.getLogger(__name__)


def ensure_obrasgov_tables(engine: Connectable, schema: str = "raw_obrasgov") -> None:
    """Cria schema raw_obrasgov e tabelas com colunas estritamente do tipo TEXT (Regra 16)."""
    ddl = f"""
    CREATE SCHEMA IF NOT EXISTS "{schema}";

    CREATE TABLE IF NOT EXISTS "{schema}"."projetos" (
        "portal_slug" TEXT NOT NULL,
        "id_projeto_investimento" TEXT NOT NULL,
        "desc_nome" TEXT,
        "desc_funcao_social" TEXT,
        "desc_projeto" TEXT,
        "natureza_intervencao" TEXT,
        "especie_intervencao" TEXT,
        "executores_json" TEXT,
        "repassadores_json" TEXT,
        "situacao" TEXT,
        "organizacao_resp" TEXT,
        "valor_investimento_previsto" TEXT,
        "dt_inicial_prevista" TEXT,
        "dt_final_prevista" TEXT,
        "data_extracao" TEXT,
        PRIMARY KEY ("portal_slug", "id_projeto_investimento")
    );

    CREATE TABLE IF NOT EXISTS "{schema}"."geometrias" (
        "portal_slug" TEXT NOT NULL,
        "id_projeto_investimento" TEXT NOT NULL,
        "id_geometria" TEXT NOT NULL,
        "latitude" TEXT,
        "longitude" TEXT,
        "pin" TEXT,
        "origem_geometria" TEXT,
        "data_extracao" TEXT,
        PRIMARY KEY ("portal_slug", "id_projeto_investimento", "id_geometria")
    );

    CREATE TABLE IF NOT EXISTS "{schema}"."execucoes_fisicas" (
        "portal_slug" TEXT NOT NULL,
        "id_projeto_investimento" TEXT NOT NULL,
        "id_execucao_fisica" TEXT NOT NULL,
        "percentual_execucao_fisica" TEXT,
        "dt_inicial_execucao" TEXT,
        "dt_final_execucao" TEXT,
        "tipo_instrumento" TEXT,
        "tipo_forma_execucao" TEXT,
        "dt_cadastro_execucao" TEXT,
        "dt_atualizacao_execucao" TEXT,
        "data_medicao" TEXT,
        "data_extracao" TEXT,
        PRIMARY KEY ("portal_slug", "id_projeto_investimento", "id_execucao_fisica")
    );

    CREATE TABLE IF NOT EXISTS "{schema}"."historico_paralisacoes" (
        "portal_slug" TEXT NOT NULL,
        "id_projeto_investimento" TEXT NOT NULL,
        "id_historico_situacao_investimento" TEXT NOT NULL,
        "descricao_historico_situacao_investimento" TEXT,
        "data_historico_situacao_investimento" TEXT,
        "justificativa_cancelada_paralisada" TEXT,
        "possui_tratativas_situacao_investimento" TEXT,
        "fase_tratativas_situacao_investimento" TEXT,
        "data_extracao" TEXT,
        PRIMARY KEY ("portal_slug", "id_projeto_investimento", "id_historico_situacao_investimento")
    );

    CREATE TABLE IF NOT EXISTS "{schema}"."empenhos" (
        "portal_slug" TEXT NOT NULL,
        "id_projeto_investimento" TEXT NOT NULL,
        "nr_empenho" TEXT NOT NULL,
        "ug_emitente" TEXT,
        "valor_empenho" TEXT,
        "data_emissao" TEXT,
        "sistema_origem_empenho" TEXT,
        "natureza_despesa" TEXT,
        "fonte" TEXT,
        "programa_trabalho" TEXT,
        "plano_interno" TEXT,
        "acao_orcamentaria" TEXT,
        "descricao_empenho" TEXT,
        "data_extracao" TEXT,
        PRIMARY KEY ("portal_slug", "id_projeto_investimento", "nr_empenho")
    );
    """
    if isinstance(engine, Engine):
        with engine.begin() as conn:
            conn.execute(text(ddl))
    elif isinstance(engine, Connection):
        engine.execute(text(ddl))


def _upsert_rows(
    engine: Connectable,
    schema: str,
    table_name: str,
    rows: list[dict[str, Any]],
    key_cols: list[str],
) -> int:
    if not rows:
        return 0

    ensure_obrasgov_tables(engine, schema=schema)

    all_cols = sorted({k for row in rows for k in row.keys()})
    valid_keys = [k for k in key_cols if k in all_cols]
    non_pk_cols = [c for c in all_cols if c not in valid_keys]

    # Converte todos os valores para str ou None para respeitar tipo TEXT (Regra 16)
    normalised = [{c: str(row[c]) if row.get(c) is not None else None for c in all_cols} for row in rows]

    # Deduplicação na memória antes da inserção (último registro prevalece)
    seen: dict[tuple[Any, ...], dict[str, Any]] = {}
    for row in normalised:
        pk_val = tuple(row.get(k) for k in valid_keys)
        seen[pk_val] = row
    deduped = list(seen.values())

    meta = MetaData()
    tbl = Table(table_name, meta, schema=schema, autoload_with=engine)

    stmt = pg_insert(tbl).values(deduped)
    if valid_keys and non_pk_cols:
        stmt = stmt.on_conflict_do_update(
            index_elements=valid_keys,
            set_={c: stmt.excluded[c] for c in non_pk_cols},
        )
    elif valid_keys:
        stmt = stmt.on_conflict_do_nothing(index_elements=valid_keys)

    if isinstance(engine, Engine):
        with engine.begin() as conn:
            conn.execute(stmt)
    elif isinstance(engine, Connection):
        engine.execute(stmt)

    return len(deduped)


def load_obrasgov_projetos(
    engine: Connectable,
    rows: list[dict[str, Any]],
    schema: str = "raw_obrasgov",
) -> int:
    """Persiste projetos de investimento de obras públicas no PostgreSQL."""
    return _upsert_rows(
        engine=engine,
        schema=schema,
        table_name="projetos",
        rows=rows,
        key_cols=["portal_slug", "id_projeto_investimento"],
    )


def load_obrasgov_geometrias(
    engine: Connectable,
    rows: list[dict[str, Any]],
    schema: str = "raw_obrasgov",
) -> int:
    """Persiste pontos e coordenadas geográficas das obras no PostgreSQL."""
    return _upsert_rows(
        engine=engine,
        schema=schema,
        table_name="geometrias",
        rows=rows,
        key_cols=["portal_slug", "id_projeto_investimento", "id_geometria"],
    )


def load_obrasgov_execucoes_fisicas(
    engine: Connectable,
    rows: list[dict[str, Any]],
    schema: str = "raw_obrasgov",
) -> int:
    """Persiste medições e boletins de execução física das obras no PostgreSQL."""
    return _upsert_rows(
        engine=engine,
        schema=schema,
        table_name="execucoes_fisicas",
        rows=rows,
        key_cols=["portal_slug", "id_projeto_investimento", "id_execucao_fisica"],
    )


def load_obrasgov_historico_paralisacoes(
    engine: Connectable,
    rows: list[dict[str, Any]],
    schema: str = "raw_obrasgov",
) -> int:
    """Persiste histórico de justificativas de paralisação e cancelamento no PostgreSQL."""
    return _upsert_rows(
        engine=engine,
        schema=schema,
        table_name="historico_paralisacoes",
        rows=rows,
        key_cols=["portal_slug", "id_projeto_investimento", "id_historico_situacao_investimento"],
    )


def load_obrasgov_empenhos(
    engine: Connectable,
    rows: list[dict[str, Any]],
    schema: str = "raw_obrasgov",
) -> int:
    """Persiste empenhos federais vinculados a obras públicas no PostgreSQL."""
    return _upsert_rows(
        engine=engine,
        schema=schema,
        table_name="empenhos",
        rows=rows,
        key_cols=["portal_slug", "id_projeto_investimento", "nr_empenho"],
    )


def load_obrasgov_all(
    engine: Connectable,
    data: dict[str, list[dict[str, Any]]],
    schema: str = "raw_obrasgov",
) -> dict[str, int]:
    """Carrega todos os conjuntos de dados extraídos do ObrasGov no PostgreSQL."""
    return {
        "projetos": load_obrasgov_projetos(engine, data.get("projetos", []), schema=schema),
        "geometrias": load_obrasgov_geometrias(engine, data.get("geometrias", []), schema=schema),
        "execucoes_fisicas": load_obrasgov_execucoes_fisicas(engine, data.get("execucoes_fisicas", []), schema=schema),
        "historico_paralisacoes": load_obrasgov_historico_paralisacoes(
            engine, data.get("historico_paralisacoes", []), schema=schema
        ),
        "empenhos": load_obrasgov_empenhos(engine, data.get("empenhos", []), schema=schema),
    }
