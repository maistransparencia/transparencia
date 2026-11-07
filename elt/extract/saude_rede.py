"""Extrator da rede de saúde (CNES leitos, CNES profissionais) e da população residente.

Usa a mesma API de dados abertos do Ministério da Saúde da farmácia SUS e reaproveita seu cliente
HTTP (limite de taxa, repetição com espera crescente, timeout).

Comportamento da API que o código respeita (teste de contrato da Story 25.6a):
- sem `nu_comp` (CNES) ou `ano` (população) a API devolve 2008; o filtro é sempre enviado;
- `offset` é o número da página (começa em 0), não a posição da linha;
- nos endpoints do CNES `limit` é ignorado e cada página traz 1 linha: caminha-se até a página vazia;
- CNES usa o código IBGE de 6 dígitos; a população residente usa 7.

Profissionais são agregados na própria extração: o nome da pessoa física só existe em memória para
contar pessoas distintas e nunca é gravado.
"""

from __future__ import annotations

import json
import logging
import re
from datetime import date, datetime, timezone
from typing import Any

import requests

from elt.extract.farmacia_sus import FARMACIA_SUS_BASE_URL, FarmaciaSusExtractor, _extrair_registros, codigo_ibge6

logger = logging.getLogger(__name__)

ENDPOINT_LEITOS = "/assistencia-a-saude/cnes-leitos"
ENDPOINT_PROFISSIONAIS = "/assistencia-a-saude/cnes-profissionais"
ENDPOINT_POPULACAO = "/vigilancia-e-meio-ambiente/svsa-populacao-residente"

TAMANHO_PAGINA = 1000
MAXIMO_PAGINAS = 5000


def competencias_do_ano(ano: int, hoje: date | None = None) -> list[int]:
    """Competências (AAAAMM) do ano da mais recente para a mais antiga, sem passar do mês corrente."""
    hoje = hoje or date.today()
    ultimo_mes = hoje.month if ano == hoje.year else 12
    return [ano * 100 + mes for mes in range(ultimo_mes, 0, -1)] if ano <= hoje.year else []


def _inteiro(valor: Any) -> int:
    try:
        return int(valor or 0)
    except (TypeError, ValueError):
        return 0


def _inteiro_ou_none(valor: Any) -> int | None:
    try:
        return int(valor)
    except (TypeError, ValueError):
        return None


def _soma_ou_vazio(valores: list[int | None]) -> str:
    """Soma os valores legíveis; sem nenhum legível devolve vazio, que o mart lê como "sem dado"."""
    legiveis = [valor for valor in valores if valor is not None]
    return str(sum(legiveis)) if legiveis else ""


def _tipo_leito(registro: dict[str, Any]) -> str:
    return re.sub(r"\s+", " ", str(registro.get("tp_leito") or "").strip())


def agregar_leitos(
    portal_slug: str, competencia: int, data_coleta: str, registros: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Soma leitos existentes e do SUS por tipo de leito."""
    existentes_por_tipo: dict[str, list[int | None]] = {}
    sus_por_tipo: dict[str, list[int | None]] = {}
    for registro in registros:
        tipo = _tipo_leito(registro)
        existentes_por_tipo.setdefault(tipo, []).append(_inteiro_ou_none(registro.get("qt_existente")))
        sus_por_tipo.setdefault(tipo, []).append(_inteiro_ou_none(registro.get("qt_sus")))
    return [
        {
            "portal_slug": portal_slug,
            "competencia": str(competencia),
            "tipo_leito": tipo,
            "total_leitos_existentes": _soma_ou_vazio(existentes_por_tipo[tipo]),
            "total_leitos_sus": _soma_ou_vazio(sus_por_tipo[tipo]),
            "data_coleta": data_coleta,
        }
        for tipo in sorted(existentes_por_tipo)
    ]


def _pessoa(registro: dict[str, Any]) -> str | None:
    nome = re.sub(r"\s+", " ", str(registro.get("no_profissional") or "").strip()).upper()
    return nome or None


def agregar_profissionais(
    portal_slug: str, competencia: int, data_coleta: str, registros: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Conta vínculos e pessoas distintas. O nome é usado só para contar e não sai desta função."""
    if not registros:
        return []
    pessoas = {p for p in map(_pessoa, registros) if p}
    if not pessoas:
        # Vínculos sem nome não permitem contar pessoas: "sem dado", nunca zero.
        return [
            {
                "portal_slug": portal_slug,
                "competencia": str(competencia),
                "total_vinculos": str(len(registros)),
                "total_profissionais": "",
                "total_profissionais_sus": "",
                "data_coleta": data_coleta,
            }
        ]
    pessoas_sus = {
        p for r in registros if str(r.get("st_atende_sus") or "").strip().upper() == "SIM" and (p := _pessoa(r))
    }
    return [
        {
            "portal_slug": portal_slug,
            "competencia": str(competencia),
            "total_vinculos": str(len(registros)),
            "total_profissionais": str(len(pessoas)),
            "total_profissionais_sus": str(len(pessoas_sus)),
            "data_coleta": data_coleta,
        }
    ]


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


class SaudeRedeExtractor(FarmaciaSusExtractor):
    def __init__(self, base_url: str = FARMACIA_SUS_BASE_URL, **kwargs: Any) -> None:
        super().__init__(base_url=base_url, **kwargs)

    def _paginas(self, endpoint: str, params: dict[str, Any], session: requests.Session) -> list[dict[str, Any]]:
        """Caminha pelas páginas (offset = número da página) até uma página vazia ou repetida."""
        acumulado: list[dict[str, Any]] = []
        anterior: str | None = None
        for pagina in range(MAXIMO_PAGINAS):
            corpo = self._request(endpoint, {**params, "limit": TAMANHO_PAGINA, "offset": pagina}, session)
            registros = _extrair_registros(corpo)
            assinatura = json.dumps(registros, sort_keys=True, default=str)
            if not registros or assinatura == anterior:
                return acumulado
            anterior = assinatura
            acumulado.extend(registros)
        raise RuntimeError(f"Limite de {MAXIMO_PAGINAS} páginas atingido em {endpoint}: extração truncada")

    def _primeira_pagina(self, endpoint: str, params: dict[str, Any], session: requests.Session) -> bool:
        return bool(_extrair_registros(self._request(endpoint, {**params, "limit": 1, "offset": 0}, session)))

    def competencia_do_ano(self, ibge6: str, ano: int, session: requests.Session) -> int | None:
        """Competência mais recente do ano com leitos no CNES; None quando o ano inteiro está sem resposta."""
        return next(
            (
                competencia
                for competencia in competencias_do_ano(ano)
                if self._primeira_pagina(ENDPOINT_LEITOS, {"co_ibge": ibge6, "nu_comp": competencia}, session)
            ),
            None,
        )

    def extract(
        self, portal_slug: str, cod_ibge: int | str, anos: list[int] | None = None
    ) -> dict[str, list[dict[str, Any]]]:  # type: ignore[override]
        """Uma competência por ano. Competência ou ano sem resposta não gera linha (fica 'sem dado', não zero).

        Qualquer falha de rede propaga: nada parcial é gravado como se fosse a série completa.
        """
        anos = anos or []
        data_coleta = datetime.now(timezone.utc).isoformat()
        session = requests.Session()
        ibge6 = codigo_ibge6(cod_ibge)
        ibge7 = str(int(cod_ibge))

        leitos: list[dict[str, Any]] = []
        profissionais: list[dict[str, Any]] = []
        populacao: list[dict[str, Any]] = []
        for ano in anos:
            populacao += agregar_populacao(
                portal_slug,
                ano,
                data_coleta,
                self._paginas(ENDPOINT_POPULACAO, {"cod_mun": ibge7, "ano": ano}, session),
            )
            competencia = self.competencia_do_ano(ibge6, ano, session)
            if competencia is None:
                logger.info("CNES sem resposta em %s para %d.", portal_slug, ano)
                continue
            filtro = {"co_ibge": ibge6, "nu_comp": competencia}
            leitos += agregar_leitos(
                portal_slug, competencia, data_coleta, self._paginas(ENDPOINT_LEITOS, filtro, session)
            )
            profissionais += agregar_profissionais(
                portal_slug, competencia, data_coleta, self._paginas(ENDPOINT_PROFISSIONAIS, filtro, session)
            )
        return {
            "leitos_competencia": leitos,
            "profissionais_competencia": profissionais,
            "populacao_residente": populacao,
        }
