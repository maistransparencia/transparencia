import csv
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

# Limiares de escala do raw_<fonte> (um schema por provedor, portal_slug na chave): ao ultrapassar qualquer um,
# o log da carga mensal destaca e aponta docs/raw-por-fonte-escala.md. Calibrar com 5 a 10 municípios.
SCALE_MAX_MUNICIPALITIES_PER_PROVIDER = 20
SCALE_MAX_ROWS_PER_TABLE = 5_000_000
SCALE_MAX_LOAD_MINUTES = 10
SCALE_MAX_COLUMNS_PER_TABLE = 150
SCALE_DESIGN_NOTE = "docs/raw-por-fonte-escala.md"

# Tabelas já migradas para o schema único da fonte (raw_<provider>), com portal_slug na chave primária.
# Única fonte da verdade do loader: a Story 26.4 remove o mapa quando todas as tabelas estiverem migradas.
MIGRATED_RAW_TABLES: dict[str, frozenset[str]] = {
    "fiorilli": frozenset(
        {
            "despesas_extra_orcamentaria",
            "despesas_por_exigibilidade",
            "emendas_impositivas",
            "empresas",
            "receita_detalhes",
            "metadata",
            # Story 26.6: despesas
            "despesas_gerais",
            "despesas_restos_pagar",
            "despesas_por_orgao",
            "despesas_por_unidade",
            "despesas_por_fornecedor",
        }
    ),
}


def is_migrated_table(provider: str, table: str) -> bool:
    return table in MIGRATED_RAW_TABLES.get(provider, frozenset())


def resolve_raw_schema(portal: Any, table: str) -> str:
    """Schema da tabela raw: raw_<provider> se já migrada, senão o schema legado do portal."""
    return f"raw_{portal.provider}" if is_migrated_table(portal.provider, table) else portal.raw_schema


def resolve_key_cols(portal: Any, table: str, key_cols: list[str]) -> list[str]:
    """Chave da tabela raw: tabelas migradas levam portal_slug à frente da chave."""
    if not is_migrated_table(portal.provider, table) or "portal_slug" in key_cols:
        return list(key_cols)
    return ["portal_slug", *key_cols]


def tag_rows_with_portal(portal: Any, table: str, rows: list[dict]) -> list[dict]:
    """Aplica portal_slug nas linhas de tabelas migradas; as demais passam intactas."""
    if not is_migrated_table(portal.provider, table):
        return rows
    return [{**row, "portal_slug": portal.slug} for row in rows]


@dataclass
class PortalConfig:
    slug: str
    display_name: str
    uf: str
    portal_url: str
    base_host: str
    cidade_clean: str
    ano_inicial: int
    empresa_padrao: str
    assets: dict[str, str]
    cod_ibge: int = 3304102
    github_url: str | None = None
    provider: str = "fiorilli"
    rpps: dict[str, Any] | None = None
    entidades_alternativas: dict[str, list[str]] | None = None

    @property
    def raw_schema(self) -> str:
        return f"raw_{self.slug}"

    @property
    def orgaos_csv_path(self) -> Path:
        root = Path(__file__).resolve().parent.parent.parent
        return root / "elt" / "transform" / "seeds" / f"seed_{self.slug}_orgaos.csv"

    def nomes_entidade(self, empresa_id: str, nome: str) -> list[str]:
        """Nome do seed seguido dos nomes que o portal usou em outros exercícios."""
        principal = nome.upper()
        alternativos = (self.entidades_alternativas or {}).get(str(empresa_id), [])
        return [principal, *(n.upper() for n in alternativos if n.upper() != principal)]

    def load_orgaos(self) -> dict[str, str]:
        """Returns {empresa_id: nome} from the seed CSV."""
        orgaos: dict[str, str] = {}
        with open(self.orgaos_csv_path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                orgaos[row["empresa_id"]] = row["nome"]
        return orgaos

    @classmethod
    def load(cls, slug: str | None = None) -> "PortalConfig":
        # Default hardcoded until multi-portal support is added (URL/host-based routing)
        slug = slug or os.environ.get("PORTAL_SLUG", "porciuncula_prefeitura")
        path = Path(__file__).parent.parent / "portals" / f"{slug}.yml"
        if not path.exists():
            raise FileNotFoundError(f"Arquivo de configuração do portal '{slug}' não encontrado em {path}")
        data = yaml.safe_load(path.read_text())
        if not data:
            raise ValueError(f"Configuração vazia no arquivo {path}")
        return cls(**data)
