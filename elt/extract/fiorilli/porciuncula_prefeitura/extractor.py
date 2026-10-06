from typing import Any

from elt.core.config import PortalConfig
from elt.extract.fiorilli.extractor import FiorilliExtractor


class PorciunculaExtractor(FiorilliExtractor):
    """Alias retrocompatível para o extrator genérico Fiorilli."""

    def __init__(
        self,
        base_path: str = "/Transparencia/VersaoJson/Despesas/",
        listagem: str = "DespesasGerais",
        table: str = "despesas_gerais",
        key_cols: list[str] | None = None,
        extra: dict[str, Any] | None = None,
        post_process: Any = None,
        base_url: str = "",
        portal_slug: str = "porciuncula_prefeitura",
        cod_ibge: int | None = 3304102,
        ano_inicial: int | None = 2021,
    ):
        if not base_url:
            base_url = PortalConfig.load("porciuncula_prefeitura").base_host
        super().__init__(
            base_path=base_path,
            listagem=listagem,
            table=table,
            key_cols=key_cols or [],
            extra=extra or {},
            post_process=post_process,
            base_url=base_url,
            portal_slug=portal_slug or "porciuncula_prefeitura",
            cod_ibge=cod_ibge,
            ano_inicial=ano_inicial,
        )
