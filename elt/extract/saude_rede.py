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
import time
from datetime import date, datetime, timezone
from typing import Any, Callable

import requests

from elt.extract.farmacia_sus import FARMACIA_SUS_BASE_URL, FarmaciaSusExtractor, _extrair_registros, codigo_ibge6

logger = logging.getLogger(__name__)

ENDPOINT_LEITOS = "/assistencia-a-saude/cnes-leitos"
ENDPOINT_PROFISSIONAIS = "/assistencia-a-saude/cnes-profissionais"
ENDPOINT_POPULACAO = "/vigilancia-e-meio-ambiente/svsa-populacao-residente"
ENDPOINT_SIA = "/assistencia-a-saude/sia-procedimentos-ambulatoriais"
ENDPOINT_SIH = "/assistencia-a-saude/sih-procedimentos-hospitalares"

TAMANHO_PAGINA = 1000
# SIA de uma competência em município pequeno já passa de 300 páginas (1 linha por página); município grande
# precisa de folga. O limite existe só para não girar para sempre e, ao estourar, falha a coleta do portal.
MAXIMO_PAGINAS = 20000
# Páginas idênticas seguidas indicam API que ignora `offset`: a extração falha em vez de devolver dado incompleto.
MAXIMO_PAGINAS_REPETIDAS = 3
# Uma competência de profissionais passa de 300 páginas: sem progresso a coleta parece travada.
PAGINAS_POR_LOG = 25


def competencias_do_ano(ano: int, hoje: date | None = None) -> list[int]:
    """Competências (AAAAMM) do ano da mais recente para a mais antiga, sem passar do mês corrente."""
    hoje = hoje or date.today()
    ultimo_mes = hoje.month if ano == hoje.year else 12
    return [ano * 100 + mes for mes in range(ultimo_mes, 0, -1)] if ano <= hoje.year else []


def competencias_recentes(meses: int = 4, hoje: date | None = None) -> list[int]:
    """Últimas `meses` competências (AAAAMM) fechadas, da mais recente para a mais antiga (o mês corrente fica de fora)."""
    hoje = hoje or date.today()
    indice = hoje.year * 12 + (hoje.month - 1)
    return [(posicao // 12) * 100 + (posicao % 12) + 1 for posicao in range(indice - 1, indice - 1 - meses, -1)]


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


def agregar_atendimentos_ambulatoriais(
    portal_slug: str, competencia: int, data_coleta: str, registros: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """SIA: soma a quantidade de procedimentos ambulatoriais pagos pelo SUS na competência (sem valores em reais)."""
    if not registros:
        return []
    return [
        {
            "portal_slug": portal_slug,
            "competencia": str(competencia),
            "total_procedimentos_ambulatoriais": _soma_ou_vazio(
                [_inteiro_ou_none(r.get("qt_procedimento")) for r in registros]
            ),
            "data_coleta": data_coleta,
        }
    ]


def agregar_internacoes(
    portal_slug: str, competencia: int, data_coleta: str, registros: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """SIH: soma a quantidade de AIH (internações) pagas pelo SUS na competência (sem valores em reais)."""
    if not registros:
        return []
    return [
        {
            "portal_slug": portal_slug,
            "competencia": str(competencia),
            "total_internacoes": _soma_ou_vazio([_inteiro_ou_none(r.get("qt_procedimento")) for r in registros]),
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
    def __init__(
        self, base_url: str = FARMACIA_SUS_BASE_URL, maximo_paginas: int = MAXIMO_PAGINAS, **kwargs: Any
    ) -> None:
        super().__init__(base_url=base_url, **kwargs)
        self.maximo_paginas = maximo_paginas

    def _paginas(self, endpoint: str, params: dict[str, Any], session: requests.Session) -> list[dict[str, Any]]:
        """Caminha pelas páginas (offset = número da página) até uma página vazia.

        Linhas idênticas em páginas vizinhas podem ser legítimas (1 linha por página); só
        `MAXIMO_PAGINAS_REPETIDAS` páginas idênticas seguidas indicam `offset` ignorado e derrubam a coleta.
        """
        acumulado: list[dict[str, Any]] = []
        anterior: str | None = None
        repetidas = 0
        for pagina in range(self.maximo_paginas):
            corpo = self._request(endpoint, {**params, "limit": TAMANHO_PAGINA, "offset": pagina}, session)
            registros = _extrair_registros(corpo)
            if not registros:
                return acumulado
            assinatura = json.dumps(registros, sort_keys=True, default=str)
            repetidas = repetidas + 1 if assinatura == anterior else 0
            if repetidas >= MAXIMO_PAGINAS_REPETIDAS:
                raise RuntimeError(f"A API repetiu a mesma página em {endpoint}: extração truncada")
            anterior = assinatura
            acumulado.extend(registros)
            if (pagina + 1) % PAGINAS_POR_LOG == 0:
                logger.info("%s %s: %d páginas buscadas...", endpoint, params, pagina + 1)
        raise RuntimeError(f"Limite de {self.maximo_paginas} páginas atingido em {endpoint}: extração truncada")

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

    def extract(  # type: ignore[override]
        self,
        portal_slug: str,
        cod_ibge: int | str,
        anos: list[int] | None = None,
        ao_concluir_ano: Callable[[dict[str, list[dict[str, Any]]]], None] | None = None,
    ) -> dict[str, list[dict[str, Any]]]:
        """Uma competência por ano. Competência ou ano sem resposta não gera linha (fica 'sem dado', não zero).

        Cada ano leva minutos (os profissionais passam de 300 páginas), então o progresso é logado por ano e
        `ao_concluir_ano` recebe o acumulado ao fim de cada ano, para quem chama gravar o que já foi buscado.
        Qualquer falha de rede propaga; os anos já concluídos continuam válidos (a carga é por upsert).
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
            inicio = time.monotonic()
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
            registros_profissionais = self._paginas(ENDPOINT_PROFISSIONAIS, filtro, session)
            profissionais += agregar_profissionais(portal_slug, competencia, data_coleta, registros_profissionais)
            logger.info(
                "Rede de saúde %s %d: competência %d, %d páginas de profissionais, %.0f s.",
                portal_slug,
                ano,
                competencia,
                len(registros_profissionais),
                time.monotonic() - inicio,
            )
            if ao_concluir_ano:
                ao_concluir_ano(
                    {
                        "leitos_competencia": leitos,
                        "profissionais_competencia": profissionais,
                        "populacao_residente": populacao,
                    }
                )
        return {
            "leitos_competencia": leitos,
            "profissionais_competencia": profissionais,
            "populacao_residente": populacao,
        }

    def extract_producao(
        self, portal_slug: str, cod_ibge: int | str, competencias: list[int]
    ) -> dict[str, list[dict[str, Any]]]:
        """Produção do SUS (SIA e SIH) das competências pedidas, sempre filtrando por `nu_comp`.

        Não usa `nu_ano`: com ele a API repete linhas entre páginas e o total sai inflado. Competência
        sem resposta não gera linha ("sem dado nesta fonte", nunca zero). Falha de rede propaga.
        """
        data_coleta = datetime.now(timezone.utc).isoformat()
        session = requests.Session()
        ibge6 = codigo_ibge6(cod_ibge)
        sia: list[dict[str, Any]] = []
        sih: list[dict[str, Any]] = []
        for competencia in competencias:
            filtro = {"co_ibge": ibge6, "nu_comp": competencia}
            sia += agregar_atendimentos_ambulatoriais(
                portal_slug, competencia, data_coleta, self._paginas(ENDPOINT_SIA, filtro, session)
            )
            sih += agregar_internacoes(
                portal_slug, competencia, data_coleta, self._paginas(ENDPOINT_SIH, filtro, session)
            )
        return {"sia_competencia": sia, "sih_competencia": sih}
