"""Extrator dos indicadores do Relatório Gerencial do SIOPE (FNDE).

Usa apenas a API JSON do Relatório Gerencial, aberta e sem captcha. A consulta de planilhas
do SIOPE exige reCAPTCHA e não é automatizada nem contornada.

A API é interna e não documentada: toda resposta é validada antes de gravar e qualquer
divergência encerra a carga sem gravar nada (ver `SiopeError`).

Cada município é pedido sozinho. Em lote, a API devolve a média dos municípios com
`codEnte` zerado (verificado em 2026-11-01: Porciúncula 16.789,15 e Natividade 19.463,73
viram 18.126,44 em lote), então o lote não serve para ler cada município.
"""

import argparse
import logging
import time
from datetime import date, datetime, timezone
from typing import Any

import requests

from elt.core.config import PortalConfig
from elt.core.db import Connectable, get_engine
from elt.load.siope import SCHEMA, ensure_siope_table, load_siope_indicadores

logger = logging.getLogger(__name__)

SIOPE_BASE_URL = "https://www.fnde.gov.br/siope/relatorioGerencialIndicador.do"
SIOPE_REFERER = "https://www.fnde.gov.br/siope/relatorio-gerencial/dist/"
SIOPE_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)

ESFERA_MUNICIPAL = 2
TIPO_PERIODO_ANUAL = "A"  # código da API: "A" = Anual, "B" = Bimestral (tela do Relatório Gerencial)
TIPO_PERIODO_ANUAL_CODIGO = "anual"
# Na consulta anual a API devolve o valor do 6º bimestre (fechamento do ano, acumulado), qualquer que seja
# o `numPeri` pedido. Ano em andamento volta sem linhas (verificado em 2026-11-01).
PERIODO_ANUAL = 6
UNIDADE_POR_TIPO_VALOR = {"P": "percentual", "M": "monetario"}
PRIMEIRO_ANO_SIOPE = 2005
TAMANHO_CODIGO_SIOPE = 6

# Grupo do Relatório Gerencial -> indicadores de interesse (código de exibição).
INDICADORES_POR_GRUPO: dict[int, tuple[str, ...]] = {
    1: ("1.1", "1.2"),
    4: ("4.1", "4.2", "4.8", "4.9"),
}

INDICADORES_POR_GRUPO_TOTAL = tuple(c for codigos in INDICADORES_POR_GRUPO.values() for c in codigos)

CAMPOS_LINHA = ("codEnte", "numAno", "numPeri", "codIndi", "codExib", "valIndi")


class SiopeError(RuntimeError):
    """Resposta inesperada, incompleta ou indisponível: a carga termina sem gravar nada."""


def codigo_siope(cod_ibge: int) -> str:
    """Código SIOPE do município: o IBGE sem o dígito verificador (6 dígitos)."""
    codigo = str(cod_ibge)[:TAMANHO_CODIGO_SIOPE]
    if len(codigo) != TAMANHO_CODIGO_SIOPE or not codigo.isdigit():
        raise SiopeError(f"cod_ibge inválido para derivar o código SIOPE: {cod_ibge}")
    return codigo


def codigo_uf(cod_ibge: int) -> int:
    return int(str(cod_ibge)[:2])


class SiopeExtractor:
    def __init__(
        self,
        base_url: str = SIOPE_BASE_URL,
        min_interval_seconds: float = 1.0,
        max_retries: int = 3,
        timeout: int = 60,
    ) -> None:
        self.base_url = base_url
        self.min_interval_seconds = min_interval_seconds
        self.max_retries = max_retries
        self.timeout = timeout
        self._last_request_time = 0.0

    def _headers(self) -> dict[str, str]:
        return {
            "User-Agent": SIOPE_USER_AGENT,
            "Referer": SIOPE_REFERER,
            "Accept": "application/json",
        }

    def _wait_rate_limit(self) -> None:
        if self.min_interval_seconds <= 0:
            return
        elapsed = time.monotonic() - self._last_request_time
        if elapsed < self.min_interval_seconds:
            time.sleep(self.min_interval_seconds - elapsed)

    def _request(self, method: str, params: dict[str, Any], body: dict[str, Any] | None = None) -> list[Any]:
        """Faz a chamada com limite de taxa e retry só para falha transitória; devolve `content` validado."""
        headers = self._headers()
        if body is not None:
            headers["Content-Type"] = "application/json"
        backoff = 2.0
        ultimo_erro: Exception | None = None

        for tentativa in range(1, self.max_retries + 1):
            self._wait_rate_limit()
            try:
                self._last_request_time = time.monotonic()
                resp = requests.request(
                    method, self.base_url, params=params, json=body, headers=headers, timeout=self.timeout
                )
            except requests.RequestException as err:
                ultimo_erro = err
            else:
                if resp.status_code in (429, 500, 502, 503, 504):
                    ultimo_erro = requests.HTTPError(f"HTTP {resp.status_code} da API do SIOPE")
                else:
                    return self._parse_content(resp)
            logger.warning("Falha transitória no SIOPE (tentativa %s/%s): %s", tentativa, self.max_retries, ultimo_erro)
            if tentativa < self.max_retries:
                time.sleep(backoff)
                backoff *= 2

        raise SiopeError(f"API do SIOPE indisponível após {self.max_retries} tentativas") from ultimo_erro

    @staticmethod
    def _parse_content(resp: requests.Response) -> list[Any]:
        if resp.status_code != 200:
            raise SiopeError(f"HTTP {resp.status_code} inesperado da API do SIOPE")
        try:
            payload = resp.json()
        except ValueError as err:
            raise SiopeError("Resposta do SIOPE não é JSON (provável página de erro 99 em HTML)") from err
        if not isinstance(payload, dict) or payload.get("status") is not True:
            raise SiopeError("Resposta do SIOPE sem status de sucesso")
        content = payload.get("content")
        if not isinstance(content, list):
            raise SiopeError("Resposta do SIOPE sem lista `content`")
        return content

    def resolver_indicadores(self, grupo: int, codigos_exibicao: tuple[str, ...]) -> dict[str, dict[str, Any]]:
        """Metadados oficiais de cada código de exibição (ex.: '4.9') no grupo.

        Devolve `codigo_interno`, `unidade` (percentual ou monetario, de `idnTipoValr`) e
        `nomes_oficiais` (todos os `nomIndi` do código, pois a lista traz um nome por norma vigente ao longo do tempo).
        """
        content = self._request(
            "GET", {"metodo": "listarIndicador", "coEsferaAdm": ESFERA_MUNICIPAL, "codGrupIndi": grupo}
        )
        itens = [
            item
            for item in content
            if isinstance(item, dict) and all(c in item for c in ("codExib", "codIndi", "idnTipoValr", "nomIndi"))
        ]
        ausentes = [c for c in codigos_exibicao if not any(str(i["codExib"]) == c for i in itens)]
        if ausentes:
            raise SiopeError(f"Indicadores ausentes no grupo {grupo} do SIOPE: {', '.join(ausentes)}")

        def metadados(codigo: str) -> dict[str, Any]:
            do_codigo = [i for i in itens if str(i["codExib"]) == codigo]
            internos = {int(i["codIndi"]) for i in do_codigo}
            tipos = {i["idnTipoValr"] for i in do_codigo}
            if len(internos) != 1 or len(tipos) != 1 or next(iter(tipos)) not in UNIDADE_POR_TIPO_VALOR:
                raise SiopeError(f"Metadados inconsistentes para o indicador {codigo} do SIOPE")
            return {
                "codigo_interno": next(iter(internos)),
                "unidade": UNIDADE_POR_TIPO_VALOR[next(iter(tipos))],
                "nomes_oficiais": " | ".join(sorted({str(i["nomIndi"]).strip() for i in do_codigo})),
            }

        return {c: metadados(c) for c in codigos_exibicao}

    def buscar_grupo(
        self, cod_ibge: int, grupo: int, indicadores: dict[str, int], anos: list[int]
    ) -> list[dict[str, Any]]:
        """Busca um grupo de indicadores de um município para os anos e valida o formato."""
        body = {
            "coEsferaAdm": ESFERA_MUNICIPAL,
            "codUF": [codigo_uf(cod_ibge)],
            "codMuni": [int(codigo_siope(cod_ibge))],
            "codFaixaPopulacao": 0,
            "tpPeriodo": TIPO_PERIODO_ANUAL,
            "numAno": anos,
            "numPeri": [PERIODO_ANUAL],
            "codGrupIndi": grupo,
            "indicadores": list(indicadores.values()),
        }
        content = self._request("POST", {"metodo": "relatorio"}, body)
        return self.validar_linhas(content, indicadores, anos)

    @staticmethod
    def validar_linhas(content: list[Any], indicadores: dict[str, int], anos: list[int]) -> list[dict[str, Any]]:
        """Confere campos, domínio e duplicidade; falha em qualquer divergência."""
        codigo_por_interno = {interno: exib for exib, interno in indicadores.items()}
        vistos: set[tuple[int, int, int]] = set()
        for linha in content:
            if not isinstance(linha, dict) or any(campo not in linha for campo in CAMPOS_LINHA):
                raise SiopeError("Linha do SIOPE com formato inesperado")
            if linha["codIndi"] not in codigo_por_interno or linha["numAno"] not in anos:
                raise SiopeError(f"Linha do SIOPE fora do pedido: {linha}")
            if codigo_por_interno[linha["codIndi"]] != str(linha["codExib"]):
                raise SiopeError(f"Código de exibição divergente no SIOPE: {linha}")
            if linha["numPeri"] != PERIODO_ANUAL:
                raise SiopeError(f"Período inesperado no SIOPE: {linha}")
            if linha["valIndi"] is not None and not isinstance(linha["valIndi"], (int, float)):
                raise SiopeError(f"Valor não numérico no SIOPE: {linha}")
            chave = (linha["numAno"], linha["numPeri"], linha["codIndi"])
            if chave in vistos:
                raise SiopeError(f"Indicador repetido no SIOPE (resposta agregada?): {linha}")
            vistos.add(chave)
        return content

    def extrair_portal(self, portal: PortalConfig, anos: list[int]) -> list[dict[str, Any]]:
        """Extrai todos os indicadores de interesse de um portal. Tudo ou nada: qualquer lacuna levanta `SiopeError`."""
        codigo = codigo_siope(portal.cod_ibge)
        linhas: list[dict[str, Any]] = []
        metadados_por_codigo: dict[str, dict[str, Any]] = {}
        for grupo, codigos in INDICADORES_POR_GRUPO.items():
            metadados = self.resolver_indicadores(grupo, codigos)
            metadados_por_codigo.update(metadados)
            internos = {c: m["codigo_interno"] for c, m in metadados.items()}
            linhas.extend(self.buscar_grupo(portal.cod_ibge, grupo, internos, anos))

        esperados = len(INDICADORES_POR_GRUPO_TOTAL)
        por_ano: dict[int, int] = {}
        for linha in linhas:
            por_ano[linha["numAno"]] = por_ano.get(linha["numAno"], 0) + 1
        parciais = {ano: n for ano, n in por_ano.items() if n != esperados}
        if parciais:
            raise SiopeError(f"Indicadores ausentes em {portal.slug} (anos com lacuna: {sorted(parciais)})")
        sem_dado = [ano for ano in anos if ano not in por_ano]
        if sem_dado:
            logger.warning("SIOPE sem dados para %s nos anos %s; nada gravado para eles", portal.slug, sem_dado)
        if not por_ano:
            raise SiopeError(f"SIOPE sem nenhum dado para {portal.slug} nos anos {anos}")

        coletado_em = datetime.now(timezone.utc).isoformat()
        return [
            {
                "portal_slug": portal.slug,
                "ano": linha["numAno"],
                "periodo": linha["numPeri"],
                "tipo_periodo": TIPO_PERIODO_ANUAL_CODIGO,
                "codigo_indicador": str(linha["codExib"]),
                "codigo_interno_indicador": linha["codIndi"],
                "unidade": metadados_por_codigo[str(linha["codExib"])]["unidade"],
                "nomes_oficiais_indicador": metadados_por_codigo[str(linha["codExib"])]["nomes_oficiais"],
                "codigo_siope": codigo,
                "valor": linha["valIndi"],
                "coletado_em": coletado_em,
            }
            for linha in linhas
        ]


def extract_and_load_siope(
    portal: PortalConfig,
    years: list[int] | None = None,
    db: Connectable | None = None,
    extractor: SiopeExtractor | None = None,
) -> int:
    """Extrai os indicadores do portal e grava no raw; sem `db`, só extrai. Erro não grava nada."""
    anos = years or list(range(max(portal.ano_inicial, PRIMEIRO_ANO_SIOPE), date.today().year + 1))
    linhas = (extractor or SiopeExtractor()).extrair_portal(portal, anos)
    if db is None:
        return len(linhas)
    ensure_siope_table(db, SCHEMA)
    return load_siope_indicadores(db, linhas, schema=SCHEMA)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description="Extrai e carrega indicadores do Relatório Gerencial do SIOPE")
    parser.add_argument("--portal", required=True, help="Slug do portal (ex: porciuncula_prefeitura)")
    parser.add_argument("--years", nargs="+", type=int, help="Anos (default: ano_inicial até o ano corrente)")
    parser.add_argument("--dry-run", action="store_true", help="Só extrai e valida, sem gravar no banco")
    args = parser.parse_args()

    portal = PortalConfig.load(args.portal)
    try:
        total = extract_and_load_siope(portal, args.years, db=None if args.dry_run else get_engine())
    except SiopeError as err:
        logger.error("Carga do SIOPE abortada, nada foi gravado: %s", err)
        raise SystemExit(1) from err
    logger.info("SIOPE %s: %d registros %s", portal.slug, total, "validados" if args.dry_run else "gravados")


if __name__ == "__main__":
    main()
