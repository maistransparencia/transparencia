"""Extrator do RGF Anexo 01 (Demonstrativo da Despesa com Pessoal) via API SICONFI/STN, Poder Executivo municipal."""

import logging
from datetime import datetime, timezone
from typing import Any

import requests

from elt.extract.siconfi_msc import SiconfiApiClient

logger = logging.getLogger(__name__)

SICONFI_RGF_URL = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rgf"
ANEXO_DESPESA_PESSOAL = "RGF-Anexo 01"
# Periodicidade Q (quadrimestral, 3 períodos) ou S (semestral, 2 períodos): o ente publica em uma delas e
# a resposta da API diz qual. Sem configuração por município.
PERIODOS_POR_PERIODICIDADE: dict[str, int] = {"Q": 3, "S": 2}
# Municípios pequenos podem entregar o RGF Simplificado (mesmo Anexo 01, mesmas contas). O ente entrega um dos
# dois tipos e a API devolve vazio para o outro.
TIPOS_DEMONSTRATIVO = ("RGF", "RGF Simplificado")
KEY_COLS = ["ano", "cod_ibge", "periodicidade", "periodo", "anexo", "cod_conta", "coluna", "rotulo"]


class SiconfiRgfExtractor(SiconfiApiClient):
    """Extrai o RGF Anexo 01 do Executivo municipal; ente sem RGF publicado gera lista vazia."""

    def __init__(self, base_url: str = SICONFI_RGF_URL, **kwargs: Any) -> None:
        super().__init__(base_url=base_url, **kwargs)

    def fetch_page(
        self,
        ibge: int,
        ano: int,
        periodicidade: str,
        periodo: int,
        offset: int = 0,
        limit: int = 5000,
        session: requests.Session | None = None,
        tipo_demonstrativo: str = "RGF",
    ) -> dict[str, Any]:
        params: dict[str, str | int] = {
            "an_exercicio": str(ano),
            "in_periodicidade": periodicidade,
            "nr_periodo": periodo,
            "co_tipo_demonstrativo": tipo_demonstrativo,
            "no_anexo": ANEXO_DESPESA_PESSOAL,
            "co_esfera": "M",
            "co_poder": "E",
            "id_ente": ibge,
            "offset": offset,
            "limit": limit,
        }
        return self._get_json(params, f"{tipo_demonstrativo} IBGE {ibge}, ano {ano}, {periodicidade}{periodo}", session)

    def _extract_tipo(
        self,
        ibge: int,
        ano: int,
        periodicidade: str,
        periodo: int,
        tipo_demonstrativo: str,
        limit: int,
        session: requests.Session | None,
    ) -> list[dict[str, Any]]:
        offset = 0
        raw_items: list[dict[str, Any]] = []
        while True:
            data = self.fetch_page(ibge, ano, periodicidade, periodo, offset, limit, session, tipo_demonstrativo)
            items = data.get("items", [])
            if not items:
                break
            raw_items.extend(items)
            if "hasMore" in data:
                if not data["hasMore"]:
                    break
            elif len(items) < limit:
                break
            offset += len(items)
        return raw_items

    def extract_periodo(
        self,
        ibge: int,
        ano: int,
        periodicidade: str,
        periodo: int,
        limit: int = 5000,
        session: requests.Session | None = None,
    ) -> list[dict[str, Any]]:
        raw_items = [
            item
            for tipo in TIPOS_DEMONSTRATIVO
            for item in self._extract_tipo(ibge, ano, periodicidade, periodo, tipo, limit, session)
        ]

        now_iso = datetime.now(timezone.utc).isoformat()
        return [self.normalize_item(item, ano=ano, ibge=ibge, extracted_at=now_iso) for item in raw_items]

    def extract_ano(
        self,
        ibge: int,
        ano: int,
        session: requests.Session | None = None,
    ) -> list[dict[str, Any]]:
        """Consulta todos os períodos de ambas as periodicidades; o que a API devolver é o que o ente publicou."""
        rows: list[dict[str, Any]] = []
        for periodicidade, quantidade in PERIODOS_POR_PERIODICIDADE.items():
            for periodo in range(1, quantidade + 1):
                try:
                    rows.extend(self.extract_periodo(ibge, ano, periodicidade, periodo, session=session))
                except Exception as err:
                    logger.error("Erro ao extrair RGF %s%s/%s: %s", periodicidade, periodo, ano, err)
        deduplicated = {tuple(row[col] for col in KEY_COLS): row for row in rows}
        return list(deduplicated.values())

    @classmethod
    def normalize_item(
        cls,
        item: dict[str, Any],
        ano: int,
        ibge: int,
        extracted_at: str | None = None,
    ) -> dict[str, Any]:
        return {
            "ano": cls._safe_int(item.get("exercicio"), ano),
            "cod_ibge": cls._safe_int(item.get("cod_ibge"), ibge),
            "periodicidade": str(item.get("periodicidade") or ""),
            "periodo": cls._safe_int(item.get("periodo"), 0),
            "anexo": str(item.get("anexo") or ANEXO_DESPESA_PESSOAL),
            "cod_conta": str(item.get("cod_conta") or ""),
            "conta": str(item.get("conta") or ""),
            "coluna": str(item.get("coluna") or ""),
            "rotulo": str(item.get("rotulo") or ""),
            "valor": cls._safe_float(item.get("valor"), 0.0),
            "populacao": cls._safe_int(item.get("populacao"), 0),
            "data_extracao": extracted_at or datetime.now(timezone.utc).isoformat(),
        }
