"""Carregador do estoque de medicamentos (BNAFAR/Hórus) e CNES no schema raw_farmacia_sus.

Todas as colunas são TEXT (Regra 16) e as chaves primárias incluem portal_slug (Regra 23).
O estoque é append-only e idempotente: a chave é (portal_slug, id_registro, data_posicao_estoque) e
reexecuções no mesmo dia apenas atualizam a linha. `coletas` acumula uma linha por execução
(portal_slug, data_coleta), inclusive as com falha, que nunca apagam o histórico de estoque.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from sqlalchemy import MetaData, Table, delete, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.engine import Connection, Engine

from elt.core.db import Connectable

logger = logging.getLogger(__name__)

SCHEMA_PADRAO = "raw_farmacia_sus"
# 5000 linhas x ~9 colunas fica abaixo do limite de 65535 parâmetros do protocolo Postgres.
TAMANHO_LOTE = 5000


def _migrar_chave_primaria(schema: str, tabela: str, colunas: list[str], limpeza_legada: str = "") -> str:
    """Bloco DO idempotente: troca a PK da tabela legada só quando ela ainda difere da esperada (`limpeza_legada` roda antes, só nessa troca)."""
    esperado = ", ".join(f"'{c}'" for c in sorted(colunas))
    lista = ", ".join(f'"{c}"' for c in colunas)
    alvo = f'"{schema}"."{tabela}"'
    preparo = " ".join(
        f'UPDATE {alvo} SET "{c}" = \'\' WHERE "{c}" IS NULL; ALTER TABLE {alvo} ALTER COLUMN "{c}" SET NOT NULL;'
        for c in colunas
        if c != "portal_slug" and c != "id_registro"
    )
    return f"""DO $migracao$
    DECLARE
        pk_atual TEXT[];
        nome_pk TEXT;
    BEGIN
        SELECT array_agg(a.attname::text ORDER BY a.attname::text), min(c.conname::text)
        INTO pk_atual, nome_pk
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        WHERE c.conrelid = '{alvo}'::regclass AND c.contype = 'p';
        IF pk_atual IS DISTINCT FROM ARRAY[{esperado}]::TEXT[] THEN
            {limpeza_legada}
            {preparo}
            IF nome_pk IS NOT NULL THEN
                EXECUTE format('ALTER TABLE {alvo} DROP CONSTRAINT %I', nome_pk);
            END IF;
            ALTER TABLE {alvo} ADD PRIMARY KEY ({lista});
        END IF;
    END
    $migracao$;"""


def ensure_farmacia_sus_tables(engine: Connectable, schema: str = SCHEMA_PADRAO) -> None:
    # Linhas legadas com data fora do formato ISO têm id_registro de outra hash; a próxima coleta as recarrega normalizadas.
    limpeza_estoque_legado = (
        f'DELETE FROM "{schema}"."estoque_medicamentos" '
        "WHERE data_posicao_estoque IS NOT NULL AND data_posicao_estoque <> '' "
        "AND data_posicao_estoque !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';"
    )
    ddl = f"""
    CREATE SCHEMA IF NOT EXISTS "{schema}";

    CREATE TABLE IF NOT EXISTS "{schema}"."estoque_medicamentos" (
        "portal_slug" TEXT NOT NULL,
        "id_registro" TEXT NOT NULL,
        "codigo_cnes" TEXT,
        "nome_medicamento" TEXT,
        "numero_lote" TEXT,
        "data_validade" TEXT,
        "quantidade_estoque" TEXT,
        "data_posicao_estoque" TEXT NOT NULL DEFAULT '',
        "sigla_sistema_origem" TEXT,
        "data_coleta" TEXT,
        PRIMARY KEY ("portal_slug", "id_registro", "data_posicao_estoque")
    );

    CREATE TABLE IF NOT EXISTS "{schema}"."estabelecimentos_cnes" (
        "portal_slug" TEXT NOT NULL,
        "codigo_cnes" TEXT NOT NULL,
        "nome_estabelecimento" TEXT,
        "endereco_estabelecimento" TEXT,
        "telefone_estabelecimento" TEXT,
        "latitude_estabelecimento" TEXT,
        "longitude_estabelecimento" TEXT,
        "data_coleta" TEXT,
        PRIMARY KEY ("portal_slug", "codigo_cnes")
    );

    CREATE TABLE IF NOT EXISTS "{schema}"."coletas" (
        "portal_slug" TEXT NOT NULL,
        "codigo_ibge6" TEXT,
        "status_coleta" TEXT,
        "total_registros_estoque" TEXT,
        "total_registros_cnes" TEXT,
        "mensagem_erro" TEXT,
        "data_coleta" TEXT NOT NULL,
        PRIMARY KEY ("portal_slug", "data_coleta")
    );

    ALTER TABLE "{schema}"."estoque_medicamentos" ADD COLUMN IF NOT EXISTS "sigla_sistema_origem" TEXT;

    ALTER TABLE "{schema}"."estoque_medicamentos" ADD COLUMN IF NOT EXISTS "data_validade" TEXT;

    {_migrar_chave_primaria(schema, "estoque_medicamentos", ["portal_slug", "id_registro", "data_posicao_estoque"], limpeza_estoque_legado)}

    {_migrar_chave_primaria(schema, "coletas", ["portal_slug", "data_coleta"])}
    """
    if isinstance(engine, Engine):
        with engine.begin() as conn:
            conn.execute(text(ddl))
    elif isinstance(engine, Connection):
        engine.execute(text(ddl))


def _replace_portal_rows(
    engine: Connectable,
    schema: str,
    table_name: str,
    portal_slug: str,
    rows: list[dict[str, Any]],
    key_cols: list[str],
    replace: bool,
) -> int:
    ensure_farmacia_sus_tables(engine, schema=schema)
    tbl = Table(table_name, MetaData(), schema=schema, autoload_with=engine)

    deduped = list(
        {
            tuple(row.get(k) for k in key_cols): {c.name: _text_or_none(row.get(c.name)) for c in tbl.columns}
            for row in rows
        }.values()
    )

    def _execute(conn: Connection) -> None:
        if replace:
            conn.execute(delete(tbl).where(tbl.c.portal_slug == portal_slug))
        if deduped:
            stmt = pg_insert(tbl).values(deduped)
            non_pk = [c.name for c in tbl.columns if c.name not in key_cols]
            conn.execute(
                stmt.on_conflict_do_update(index_elements=key_cols, set_={c: stmt.excluded[c] for c in non_pk})
            )

    if isinstance(engine, Engine):
        with engine.begin() as conn:
            _execute(conn)
    elif isinstance(engine, Connection):
        _execute(engine)
    return len(deduped)


def _text_or_none(value: Any) -> str | None:
    return None if value is None else str(value)


def load_farmacia_sus_estoque(
    engine: Connectable, rows: list[dict[str, Any]], portal_slug: str, schema: str = SCHEMA_PADRAO
) -> int:
    """Grava o estoque em modo append-only: upsert por (portal, registro, data de posição), sem apagar histórico."""
    linhas = [{**row, "data_posicao_estoque": row.get("data_posicao_estoque") or ""} for row in rows]
    return _replace_portal_rows(
        engine,
        schema,
        "estoque_medicamentos",
        portal_slug,
        linhas,
        ["portal_slug", "id_registro", "data_posicao_estoque"],
        replace=False,
    )


def load_farmacia_sus_estabelecimentos(
    engine: Connectable, rows: list[dict[str, Any]], portal_slug: str, schema: str = SCHEMA_PADRAO
) -> int:
    return _replace_portal_rows(
        engine, schema, "estabelecimentos_cnes", portal_slug, rows, ["portal_slug", "codigo_cnes"], replace=True
    )


def load_farmacia_sus_coletas(
    engine: Connectable, rows: list[dict[str, Any]], portal_slug: str, schema: str = SCHEMA_PADRAO
) -> int:
    """Acumula uma linha por execução (portal_slug, data_coleta), inclusive coletas com falha."""
    return _replace_portal_rows(
        engine, schema, "coletas", portal_slug, rows, ["portal_slug", "data_coleta"], replace=False
    )


def load_farmacia_sus_dir(engine: Connectable, directory: Path, portal_slug: str, schema: str = SCHEMA_PADRAO) -> int:
    """Carrega os JSONs da pasta `farmacia_sus`: estoque e CNES primeiro, `coletas` por último.

    Assim uma coleta só é marcada como `sucesso` depois que o estoque foi persistido.
    """
    loaders = {
        "estoque_medicamentos.json": load_farmacia_sus_estoque,
        "estabelecimentos_cnes.json": load_farmacia_sus_estabelecimentos,
        "coletas.json": load_farmacia_sus_coletas,
    }
    total = 0
    for nome, loader in loaders.items():
        arquivo = directory / nome
        if arquivo.exists():
            total += loader(engine, json.loads(arquivo.read_text(encoding="utf-8")), portal_slug, schema)
    for arquivo in sorted(directory.glob("*.json")):
        if arquivo.name not in loaders:
            logger.warning("Arquivo sem loader ignorado em farmacia_sus: %s", arquivo.name)
    return total
