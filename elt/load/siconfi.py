"""Carregador para persistir dados da Matriz de Saldos Contábeis (MSC) do SICONFI no PostgreSQL."""

import logging
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection, Engine

from elt.core.db import Connectable, upsert

logger = logging.getLogger(__name__)

KEY_COLS = [
    "ano",
    "mes_referencia",
    "cod_ibge",
    "conta_contabil",
    "poder_orgao",
    "fonte_recursos",
    "ano_fonte_recursos",
    "financeiro_permanente",
    "tipo_valor",
    "natureza_conta",
]


def ensure_siconfi_table(engine: Connectable, schema: str) -> None:
    """Garante a existência da tabela raw de MSC Patrimonial no schema especificado."""
    ddl = f"""
    CREATE SCHEMA IF NOT EXISTS "{schema}";
    CREATE TABLE IF NOT EXISTS "{schema}"."siconfi_msc_patrimonial" (
        ano INTEGER NOT NULL,
        mes_referencia INTEGER NOT NULL,
        cod_ibge INTEGER NOT NULL,
        tipo_matriz TEXT NOT NULL,
        classe_conta INTEGER NOT NULL,
        conta_contabil TEXT NOT NULL,
        poder_orgao TEXT NOT NULL,
        financeiro_permanente INTEGER NOT NULL,
        ano_fonte_recursos INTEGER NOT NULL,
        fonte_recursos TEXT NOT NULL,
        valor NUMERIC NOT NULL,
        natureza_conta TEXT NOT NULL,
        tipo_valor TEXT NOT NULL,
        data_referencia TEXT,
        data_extracao TEXT,
        PRIMARY KEY (ano, mes_referencia, cod_ibge, conta_contabil, poder_orgao, fonte_recursos, ano_fonte_recursos, financeiro_permanente, tipo_valor, natureza_conta)
    );
    """
    if isinstance(engine, Engine):
        with engine.begin() as conn:
            conn.execute(text(ddl))
    elif isinstance(engine, Connection):
        engine.execute(text(ddl))


def load_siconfi_msc(
    db: Connectable,
    rows: list[dict[str, Any]],
    schema: str | None = None,
) -> int:
    """Insere ou atualiza os registros de MSC Patrimonial na tabela raw_<portal>.siconfi_msc_patrimonial."""
    if not rows:
        return 0
    if schema:
        return upsert(db, "siconfi_msc_patrimonial", rows, KEY_COLS, schema=schema)
    return upsert(db, "siconfi_msc_patrimonial", rows, KEY_COLS)


def main() -> None:
    import argparse
    import json
    from pathlib import Path

    from elt.core.config import PortalConfig
    from elt.core.db import get_engine

    parser = argparse.ArgumentParser(description="Carrega arquivos JSON do SICONFI MSC no banco de dados")
    parser.add_argument("--portal", required=True, help="Slug do portal (ex: porciuncula_prefeitura)")
    parser.add_argument("--dir", help="Diretório contendo siconfi_msc_patrimonial/*.json")
    args = parser.parse_args()

    portal = PortalConfig.load(args.portal)
    if args.dir:
        run_dir = Path(args.dir)
    else:
        portal_base = Path(f"data/raw_runs/{portal.slug}")
        if not portal_base.exists():
            raise FileNotFoundError(f"Diretório base {portal_base} não encontrado")
        run_dirs = [d for d in portal_base.iterdir() if d.is_dir()]
        if not run_dirs:
            raise FileNotFoundError(f"Nenhum diretório de execução encontrado sob {portal_base}")
        run_dir = max(run_dirs, key=lambda d: d.stat().st_mtime)

    if not run_dir.exists():
        raise FileNotFoundError(f"Diretório {run_dir} não encontrado")

    engine = get_engine()
    ensure_siconfi_table(engine, schema=portal.raw_schema)

    total = 0
    for json_file in sorted(run_dir.rglob("*.json")):
        if json_file.parent.name == "siconfi_msc_patrimonial":
            rows = json.loads(json_file.read_text(encoding="utf-8"))
            loaded = load_siconfi_msc(engine, rows, schema=portal.raw_schema)
            logger.info("Carregados %d registros de %s", loaded, json_file)
            total += loaded

    print(f"✅ Total carregado para {portal.slug}: {total} registros")


if __name__ == "__main__":
    main()
