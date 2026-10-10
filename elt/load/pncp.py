"""Carregador para persistir publicações, itens e resultados do PNCP no PostgreSQL com colunas TEXT."""

import logging
from typing import Any

from sqlalchemy import MetaData, Table, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.engine import Connection, Engine

from elt.core.db import Connectable

logger = logging.getLogger(__name__)


def ensure_pncp_tables(engine: Connectable, schema: str = "raw_pncp") -> None:
    """Cria schema raw_pncp e tabelas com colunas estritamente do tipo TEXT (Regra 16)."""
    ddl = f"""
    CREATE SCHEMA IF NOT EXISTS "{schema}";

    CREATE TABLE IF NOT EXISTS "{schema}"."compras" (
        "numero_controle_pncp" TEXT NOT NULL,
        "cnpj_orgao" TEXT,
        "ano_compra" TEXT,
        "sequencial_compra" TEXT,
        "numero_compra" TEXT,
        "processo" TEXT,
        "objeto_compra" TEXT,
        "link_sistema_origem" TEXT,
        "modalidade_id" TEXT,
        "modalidade_nome" TEXT,
        "situacao_compra_id" TEXT,
        "situacao_compra_nome" TEXT,
        "data_publicacao_pncp" TEXT,
        "data_abertura_proposta" TEXT,
        "valor_total_estimado" TEXT,
        "valor_total_homologado" TEXT,
        "informacao_complementar" TEXT,
        "srp" TEXT,
        "data_extracao" TEXT,
        PRIMARY KEY ("numero_controle_pncp")
    );

    CREATE TABLE IF NOT EXISTS "{schema}"."itens" (
        "numero_controle_pncp" TEXT NOT NULL,
        "cnpj_orgao" TEXT,
        "ano_compra" TEXT,
        "sequencial_compra" TEXT,
        "numero_compra" TEXT,
        "numero_item" TEXT NOT NULL,
        "descricao" TEXT,
        "material_ou_servico" TEXT,
        "quantidade" TEXT,
        "unidade_medida" TEXT,
        "valor_unitario_estimado" TEXT,
        "valor_total_estimado" TEXT,
        "situacao_item" TEXT,
        "criterio_julgamento" TEXT,
        "data_extracao" TEXT,
        PRIMARY KEY ("numero_controle_pncp", "numero_item")
    );

    CREATE TABLE IF NOT EXISTS "{schema}"."itens_resultados" (
        "numero_controle_pncp" TEXT NOT NULL,
        "cnpj_orgao" TEXT,
        "ano_compra" TEXT,
        "sequencial_compra" TEXT,
        "numero_item" TEXT NOT NULL,
        "sequencial_resultado" TEXT NOT NULL,
        "fornecedor_cnpj_cpf" TEXT,
        "fornecedor_nome" TEXT,
        "valor_unitario_homologado" TEXT,
        "valor_total_homologado" TEXT,
        "percentual_desconto" TEXT,
        "situacao_resultado" TEXT,
        "data_resultado" TEXT,
        "data_extracao" TEXT,
        PRIMARY KEY ("numero_controle_pncp", "numero_item", "sequencial_resultado")
    );
    """
    if isinstance(engine, Engine):
        with engine.begin() as conn:
            conn.execute(text(ddl))
    elif isinstance(engine, Connection):
        engine.execute(text(ddl))
        engine.commit()


def _upsert_rows(
    engine: Connectable,
    schema: str,
    table_name: str,
    rows: list[dict[str, Any]],
    key_cols: list[str],
) -> int:
    if not rows:
        return 0

    ensure_pncp_tables(engine, schema=schema)

    all_cols = sorted({k for row in rows for k in row.keys()})
    valid_keys = [k for k in key_cols if k in all_cols]
    non_pk_cols = [c for c in all_cols if c not in valid_keys]

    # Converte todos os valores para str ou None para respeitar tipo TEXT
    normalised = [{c: str(row[c]) if row.get(c) is not None else None for c in all_cols} for row in rows]

    # Deduplicação na memória antes da inserção
    seen: dict[tuple, dict] = {}
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


def load_pncp_compras(engine: Connectable, rows: list[dict[str, Any]], schema: str = "raw_pncp") -> int:
    """Persiste compras públicas do PNCP no PostgreSQL no schema raw_pncp."""
    return _upsert_rows(
        engine=engine,
        schema=schema,
        table_name="compras",
        rows=rows,
        key_cols=["numero_controle_pncp"],
    )


def load_pncp_itens(engine: Connectable, rows: list[dict[str, Any]], schema: str = "raw_pncp") -> int:
    """Persiste itens licitados do PNCP no PostgreSQL no schema raw_pncp."""
    return _upsert_rows(
        engine=engine,
        schema=schema,
        table_name="itens",
        rows=rows,
        key_cols=["numero_controle_pncp", "numero_item"],
    )


def load_pncp_itens_resultados(engine: Connectable, rows: list[dict[str, Any]], schema: str = "raw_pncp") -> int:
    """Persiste resultados da disputa de itens do PNCP no PostgreSQL no schema raw_pncp."""
    return _upsert_rows(
        engine=engine,
        schema=schema,
        table_name="itens_resultados",
        rows=rows,
        key_cols=["numero_controle_pncp", "numero_item", "sequencial_resultado"],
    )


def main() -> None:
    import argparse
    import json
    from pathlib import Path

    from elt.core.db import get_engine

    parser = argparse.ArgumentParser(description="Carrega arquivos JSON do PNCP no banco de dados")
    parser.add_argument("--dir", required=True, help="Diretório contendo compras.json, itens.json, etc.")
    parser.add_argument("--schema", default="raw_pncp", help="Schema alvo (padrão: raw_pncp)")
    args = parser.parse_args()

    run_dir = Path(args.dir)
    if not run_dir.exists():
        raise FileNotFoundError(f"Diretório {run_dir} não encontrado")

    data_dir = run_dir / "pncp" if (run_dir / "pncp").is_dir() else run_dir

    engine = get_engine()
    ensure_pncp_tables(engine, schema=args.schema)

    compras_file = data_dir / "compras.json"
    if compras_file.exists():
        count = load_pncp_compras(engine, json.loads(compras_file.read_text(encoding="utf-8")), schema=args.schema)
        print(f"Carregadas {count} compras em {args.schema}.compras")

    itens_file = data_dir / "itens.json"
    if itens_file.exists():
        count = load_pncp_itens(engine, json.loads(itens_file.read_text(encoding="utf-8")), schema=args.schema)
        print(f"Carregados {count} itens em {args.schema}.itens")

    resultados_file = data_dir / "itens_resultados.json"
    if resultados_file.exists():
        count = load_pncp_itens_resultados(
            engine, json.loads(resultados_file.read_text(encoding="utf-8")), schema=args.schema
        )
        print(f"Carregados {count} resultados em {args.schema}.itens_resultados")


if __name__ == "__main__":
    main()
