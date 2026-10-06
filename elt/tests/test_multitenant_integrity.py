"""Testes de integridade estática multi-tenant para modelos dbt.

Garante isolamento estrito entre portais (zero tenant leakage) e impede
que literais de municípios fiquem hard-coded em marts e métricas.
"""

import re
from pathlib import Path

_MODELS_DIR = Path(__file__).parent.parent / "transform" / "models"
_MARTS_DIR = _MODELS_DIR / "marts"
_METRICS_DIR = _MARTS_DIR / "metrics"

# Padrões proibidos em modelos marts/metrics
TENANT_SLUGS = [
    "porciuncula_prefeitura",
    "natividade_prefeitura",
]

# Exceções estritas permitidas apenas para união de fontes brutas
ALLOWED_EXCEPTIONS = {
    "fct_despesas_por_fornecedor.sql",  # Unifica fontes raw_porciuncula e raw_natividade
    "dim_metadata.sql",
}


def test_no_hardcoded_tenant_slugs_in_metrics_and_marts():
    """Valida que nenhum arquivo em marts/metrics possui portal_slug hard-coded."""
    violations = []

    sql_files = sorted(_MARTS_DIR.glob("**/*.sql"))
    assert len(sql_files) > 0, "Nenhum arquivo SQL encontrado em marts/"

    for sql_file in sql_files:
        if sql_file.name in ALLOWED_EXCEPTIONS:
            continue

        content = sql_file.read_text(encoding="utf-8")

        for slug in TENANT_SLUGS:
            # Detecta literais como: 'porciuncula_prefeitura' as portal_slug
            # ou surrogate_key com 'porciuncula_prefeitura'
            # ou coalesce(..., 'porciuncula_prefeitura')
            pattern_as = rf"['\"]{slug}['\"]\s+as\s+portal_slug"
            pattern_surrogate = rf"generate_surrogate_key\(\[[^\]]*['\"]{slug}['\"]"
            pattern_coalesce = rf"coalesce\([^)]*['\"]{slug}['\"]\)"

            if re.search(pattern_as, content, re.IGNORECASE):
                violations.append(f"{sql_file.relative_to(_MODELS_DIR)}: define '{slug}' as portal_slug hard-coded")
            if re.search(pattern_surrogate, content, re.IGNORECASE):
                violations.append(f"{sql_file.relative_to(_MODELS_DIR)}: usa '{slug}' dentro de generate_surrogate_key")
            if re.search(pattern_coalesce, content, re.IGNORECASE):
                violations.append(f"{sql_file.relative_to(_MODELS_DIR)}: fallback coalesce para '{slug}'")

    assert not violations, "Violações de isolamento multi-tenant detectadas:\n" + "\n".join(violations)


def test_metrics_models_preserve_portal_slug():
    """Valida que todos os modelos em metrics/ possuem a coluna portal_slug."""
    missing = []
    metric_files = sorted(_METRICS_DIR.glob("*.sql"))
    assert len(metric_files) > 0, "Nenhum arquivo de métrica encontrado"

    for sql_file in metric_files:
        content = sql_file.read_text(encoding="utf-8")
        if not re.search(r"\bportal_slug\b", content, re.IGNORECASE):
            missing.append(sql_file.name)

    assert not missing, f"Modelos de métricas sem referência a portal_slug: {missing}"
