from elt.core.config import PortalConfig
from elt.extract.fiorilli.api_endpoints import get_endpoint_configs

_portal = PortalConfig.load("natividade_prefeitura")
ENDPOINT_CONFIGS = get_endpoint_configs(
    base_url=_portal.base_host,
    portal_slug=_portal.slug,
    cod_ibge=_portal.cod_ibge,
    ano_inicial=_portal.ano_inicial,
)

__all__ = ["ENDPOINT_CONFIGS"]
