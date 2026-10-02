from elt.core.config import PortalConfig
from elt.extract.fiorilli.api_endpoints import (
    get_endpoint_configs,
    post_process_contratos,
    post_process_despesas_extra_orcamentaria,
    post_process_despesas_gerais,
    post_process_despesas_por_exigibilidade,
    post_process_despesas_restos_pagar,
    post_process_diarias,
    post_process_emendas_cad,
    post_process_pessoal,
    post_process_receita_detalhes,
    post_process_receita_orcamentaria,
    post_process_transferencias,
)
from elt.extract.fiorilli.extractor import (
    DespesasExtractor,
    EmendasExtractor,
    FiorilliExtractor,
    LicitacoesExtractor,
    PessoalExtractor,
    ReceitasExtractor,
    SigcorpExtractor,
    TransferenciasExtractor,
)

# Aliases com prefixo _ para compatibilidade interna
_post_process_contratos = post_process_contratos
_post_process_pessoal = post_process_pessoal
_post_process_despesas_extra_orcamentaria = post_process_despesas_extra_orcamentaria
_post_process_despesas_gerais = post_process_despesas_gerais
_post_process_despesas_restos_pagar = post_process_despesas_restos_pagar
_post_process_diarias = post_process_diarias
_post_process_emendas_cad = post_process_emendas_cad
_post_process_receita_detalhes = post_process_receita_detalhes
_post_process_receita_orcamentaria = post_process_receita_orcamentaria
_post_process_transferencias = post_process_transferencias
_post_process_despesas_por_exigibilidade = post_process_despesas_por_exigibilidade

_portal = PortalConfig.load("porciuncula_prefeitura")
_base_url = _portal.base_host

ENDPOINT_CONFIGS = get_endpoint_configs(
    base_url=_base_url,
    portal_slug=_portal.slug,
    cod_ibge=_portal.cod_ibge,
    ano_inicial=_portal.ano_inicial,
)

__all__ = [
    "ENDPOINT_CONFIGS",
    "FiorilliExtractor",
    "SigcorpExtractor",
    "DespesasExtractor",
    "ReceitasExtractor",
    "LicitacoesExtractor",
    "EmendasExtractor",
    "TransferenciasExtractor",
    "PessoalExtractor",
    "post_process_contratos",
    "post_process_pessoal",
    "post_process_despesas_extra_orcamentaria",
    "post_process_despesas_gerais",
    "post_process_despesas_restos_pagar",
    "post_process_diarias",
    "post_process_emendas_cad",
    "post_process_receita_detalhes",
    "post_process_receita_orcamentaria",
    "post_process_transferencias",
    "post_process_despesas_por_exigibilidade",
]
