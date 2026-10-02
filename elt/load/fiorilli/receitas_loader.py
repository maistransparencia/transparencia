"""Módulo compartilhado para carregar CSVs de receitas da Fiorilli no PostgreSQL."""

import argparse
import re
import unicodedata
from pathlib import Path
from typing import Any

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import MetaData, Table, text
from sqlalchemy.dialects.postgresql import insert as pg_insert

from elt.core.config import PortalConfig
from elt.core.db import get_engine
from elt.extract.base import EndpointConfig
from elt.extract.fiorilli.api_endpoints import get_endpoint_configs

TABLE_MAPPING = {
    "ReceitaOrcamentaria": "receita_orcamentaria",
    "ReceitaUniao": "receita_uniao",
    "ReceitaEstado": "receita_estado",
    "ReceitaExtraOrcamentaria": "receita_extra_orcamentaria",
    "DetalhesReceitaOrcamentaria": "receita_detalhes",
    "ReceitaDetalhes": "receita_detalhes",
    "ReceitaDetalhe": "receita_detalhes",
}


def _sanitize_key(k: str) -> str:
    """Normaliza nomes de colunas para snake_case sem acentuação."""
    nfkd = unicodedata.normalize("NFKD", k)
    ascii_str = "".join(c for c in nfkd if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "_", ascii_str.lower()).strip("_")


def _ensure_table(engine: Any, schema: str, table: str, cols: list[str], key_cols: list[str]) -> None:
    """Garante a existência do schema, tabela e colunas necessárias."""
    valid_keys = [k for k in key_cols if k in cols]
    if not valid_keys:
        valid_keys = [cols[0]] if cols else []
    pk_def = ", ".join(f'"{k}"' for k in valid_keys)
    col_defs = ",\n    ".join(f'"{c}" TEXT' for c in cols)
    with engine.begin() as conn:
        conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema}"'))
        if pk_def:
            conn.execute(
                text(
                    f'CREATE TABLE IF NOT EXISTS "{schema}"."{table}" (\n    {col_defs},\n    PRIMARY KEY ({pk_def})\n)'
                )
            )
        else:
            conn.execute(text(f'CREATE TABLE IF NOT EXISTS "{schema}"."{table}" (\n    {col_defs}\n)'))
        for col in cols:
            conn.execute(text(f'ALTER TABLE "{schema}"."{table}" ADD COLUMN IF NOT EXISTS "{col}" TEXT'))


def _upsert_raw(engine: Any, schema: str, table: str, rows: list[dict], key_cols: list[str]) -> int:
    """Executa upsert com deduplicação de chaves primárias e tratamento de nulos."""
    if not rows:
        return 0
    all_cols = sorted({k for row in rows for k in row.keys()})
    _ensure_table(engine, schema, table, all_cols, key_cols)

    meta = MetaData()
    tbl = Table(table, meta, schema=schema, autoload_with=engine)

    # Identifica a chave primária real da tabela no banco
    pk_cols = [c.name for c in tbl.primary_key.columns] if tbl.primary_key.columns else []
    if not pk_cols:
        pk_cols = [k for k in key_cols if k in all_cols]

    non_pk_cols = [c.name for c in tbl.columns if c.name not in pk_cols and c.name in all_cols]

    # Prepara linhas garantindo que colunas da chave primária nunca fiquem nulas (usam "" como string vazia)
    prepared_rows: list[dict] = []
    for r in rows:
        item: dict[str, Any] = {}
        for k in all_cols:
            val = r.get(k)
            if k in pk_cols:
                item[k] = "" if val is None or pd.isna(val) else str(val).strip()
            else:
                item[k] = None if val is None or pd.isna(val) or str(val).strip() == "" else str(val).strip()
        prepared_rows.append(item)

    # Deduplica no lote de inserção
    seen: dict[tuple, dict] = {}
    for row in prepared_rows:
        seen[tuple(row.get(k) for k in pk_cols)] = row
    deduped = list(seen.values())

    stmt = pg_insert(tbl).values(deduped)
    if pk_cols and non_pk_cols:
        stmt = stmt.on_conflict_do_update(
            index_elements=pk_cols,
            set_={c: stmt.excluded[c] for c in non_pk_cols},
        )
    elif pk_cols:
        stmt = stmt.on_conflict_do_nothing(index_elements=pk_cols)

    with engine.begin() as conn:
        conn.execute(stmt)
    return len(deduped)


def run_load_receitas_csv(portal_slug: str) -> None:
    """Carrega os arquivos CSV de receitas do município para o banco de dados."""
    load_dotenv()

    portal = PortalConfig.load(portal_slug)
    schema = portal.raw_schema
    engine = get_engine()

    endpoint_configs = get_endpoint_configs(
        base_url=portal.portal_url,
        portal_slug=portal_slug,
        cod_ibge=portal.cod_ibge,
        ano_inicial=portal.ano_inicial,
    )
    config_by_table: dict[str, EndpointConfig] = {c.table: c for c in endpoint_configs}

    csv_dir = Path("data/raw") / portal_slug / "receitas_csv"
    if portal_slug == "porciuncula_prefeitura" and not csv_dir.exists() and Path("data/csv/receitas").exists():
        csv_dir = Path("data/csv/receitas")

    if not csv_dir.exists():
        print(f"Directory '{csv_dir}' not found for {portal.display_name}.")
        return

    csv_files = sorted(csv_dir.glob("*.csv"))
    if not csv_files:
        print(f"No CSV files found in '{csv_dir}'")
        return

    for file_path in csv_files:
        if file_path.name in ("failed_requests.csv",):
            continue

        parts = file_path.stem.split("_")
        if len(parts) < 3:
            print(f"Skipping {file_path.name}: expected <empresa>_<ano>_<endpoint>.csv")
            continue

        empresa_id = parts[0]
        try:
            year = int(parts[1])
        except ValueError:
            print(f"Skipping {file_path.name}: invalid year '{parts[1]}'")
            continue

        report_slug = "_".join(parts[2:])
        table_name = TABLE_MAPPING.get(report_slug)
        if not table_name:
            print(f"Skipping {file_path.name}: unknown report slug '{report_slug}'")
            continue

        ep_config = config_by_table.get(table_name)
        if not ep_config:
            print(f"Skipping {file_path.name}: no endpoint config for table '{table_name}'")
            continue

        if file_path.stat().st_size == 0:
            print(f"Skipping {file_path.name}: empty file")
            continue

        try:
            df = pd.read_csv(file_path, sep=";", dtype=str, keep_default_na=False, encoding="utf-8")
        except Exception as exc:
            print(f"Error reading {file_path.name}: {exc}")
            continue

        if df.empty:
            print(f"Skipping {file_path.name}: no data rows")
            continue

        df.columns = [_sanitize_key(c) for c in df.columns]
        df["ano"] = str(year)
        df["empresa"] = str(empresa_id)
        df["exercicio"] = str(year)
        df["portal_slug"] = portal_slug

        # Normalização de nomes de colunas CSV -> Schema de banco
        if "descricao" not in df.columns and "especificacao" in df.columns:
            df["descricao"] = df["especificacao"]
        if "nome" not in df.columns and "especificacao" in df.columns:
            df["nome"] = df["especificacao"]
        if "dtlan" not in df.columns and "data" in df.columns:
            df["dtlan"] = df["data"]

        if "codigo" not in df.columns and "extra" in df.columns:
            df["codigo"] = df["extra"]
        elif "codigo" not in df.columns:
            print(f"Skipping {file_path.name}: no 'codigo' column (incompatible with API table structure)")
            continue

        if "valor" not in df.columns and "arrec_total" in df.columns:
            df["valor"] = df["arrec_total"]
        if "previsao_inicial" not in df.columns and "prev_inicial" in df.columns:
            df["previsao_inicial"] = df["prev_inicial"]
        if "previsao_atualizada" not in df.columns and "prev_atualizada" in df.columns:
            df["previsao_atualizada"] = df["prev_atualizada"]
        if "arrecadado_periodo" not in df.columns and "arrec_periodo" in df.columns:
            df["arrecadado_periodo"] = df["arrec_periodo"]
        if "arrecadado_total" not in df.columns and "arrec_total" in df.columns:
            df["arrecadado_total"] = df["arrec_total"]

        if table_name == "receita_orcamentaria":
            if "fontestn" not in df.columns:
                df["fontestn"] = df["fonte_stn"] if "fonte_stn" in df.columns else ""

        # Remove linhas de totalizador onde codigo é vazio
        df = df[df["codigo"].astype(str).str.strip().ne("")]
        if df.empty:
            print(f"Skipping {file_path.name}: no valid rows after filtering totals")
            continue

        rows: list[dict] = []
        for raw_row in df.to_dict(orient="records"):
            item = dict(raw_row)
            if ep_config.post_process:
                item = ep_config.post_process(item)
            rows.append(item)

        count = _upsert_raw(engine, schema, table_name, rows, ep_config.key_cols)
        print(f"✓ {file_path.name} → {count} rows into {schema}.{table_name}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Carregar CSVs de receitas da Fiorilli no PostgreSQL.")
    parser.add_argument("--portal", required=True, help="Slug do portal (ex: natividade_prefeitura)")
    args = parser.parse_args()
    run_load_receitas_csv(args.portal)


if __name__ == "__main__":
    main()
