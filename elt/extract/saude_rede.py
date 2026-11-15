"""População residente do Ministério da Saúde (a única parte da rede de saúde que ainda vem da API).

Leitos, profissionais, SIA e SIH vêm dos arquivos mensais do DATASUS (`elt/extract/saude_datasus.py`). A população
continua na API de dados abertos da farmácia SUS, cujo cliente HTTP (limite de taxa, repetição, timeout) é reaproveitado.

Comportamento da API que o código respeita (conferido por teste de contrato): sem `ano` a API devolve 2012; a
população residente usa o código IBGE de 7 dígitos; `limit` funciona e um ano de uma cidade cabe numa página.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import requests

from elt.extract.farmacia_sus import FARMACIA_SUS_BASE_URL, FarmaciaSusExtractor, _extrair_registros

ENDPOINT_POPULACAO = "/vigilancia-e-meio-ambiente/svsa-populacao-residente"
TAMANHO_PAGINA = 1000


def agregar_populacao(
    portal_slug: str, ano: int, data_coleta: str, registros: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Soma a população de todas as idades e sexos do ano."""
    if not registros:
        return []
    return [
        {
            "portal_slug": portal_slug,
            "ano": str(ano),
            "total_populacao": str(sum(_inteiro(r.get("pop")) for r in registros)),
            "data_coleta": data_coleta,
        }
    ]


def _inteiro(valor: Any) -> int:
    try:
        return int(valor or 0)
    except (TypeError, ValueError):
        return 0


def extrair_populacao(
    portal_slug: str,
    cod_ibge: int | str,
    anos: list[int],
    extrator: FarmaciaSusExtractor | None = None,
) -> list[dict[str, Any]]:
    """Uma página por ano. Ano sem resposta não gera linha ("sem dado", nunca zero); página cheia falha (truncada)."""
    extrator = extrator or FarmaciaSusExtractor(base_url=FARMACIA_SUS_BASE_URL)
    data_coleta = datetime.now(timezone.utc).isoformat()
    sessao = requests.Session()
    linhas: list[dict[str, Any]] = []
    for ano in anos:
        registros = _extrair_registros(
            extrator._request(
                ENDPOINT_POPULACAO,
                {"cod_mun": str(int(cod_ibge)), "ano": ano, "limit": TAMANHO_PAGINA, "offset": 0},
                sessao,
            )
        )
        if len(registros) >= TAMANHO_PAGINA:
            raise RuntimeError(
                f"População de {portal_slug} em {ano} ocupa a página inteira: resposta possivelmente truncada"
            )
        linhas += agregar_populacao(portal_slug, ano, data_coleta, registros)
    return linhas
