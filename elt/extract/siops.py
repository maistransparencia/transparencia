"""Extrator dos indicadores de saúde do SIOPS (Ministério da Saúde).

Duas vias, ambas por HTTP simples e sem contrato de estabilidade (raspagem de HTML):

- `tabnet`: série histórica do TABNET (`SerHist/municipio/mIndicadores.def`). Uma requisição por indicador e ano
  devolve os 5.570 municípios; o extrator filtra pelos `cod_ibge` dos portais. Só existe para ano fechado.
- `consulta_ano`: página `relindicadoresmun2.php`, a mesma que o Poder Executivo vê no SIOPS. Cobre o ano fechado
  (6º bimestre) e o ano em andamento (bimestre mais avançado já transmitido, valor acumulado parcial).

Toda resposta é validada antes de gravar; qualquer divergência de formato encerra a carga sem gravar nada
(ver `SiopsError`). "Não houve transmissão" é sem dado (valor nulo), nunca zero. Divergência numérica entre as
duas vias não aborta a carga: as duas linhas são gravadas e o dbt expõe a divergência.
"""

import argparse
import html
import logging
import re
import time
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

import requests

from elt.core.config import PortalConfig
from elt.core.db import Connectable, get_engine
from elt.load.siops import SCHEMA, ensure_siops_table, load_siops_indicadores

logger = logging.getLogger(__name__)

SIOPS_CONSULTA_URL = "http://siops.datasus.gov.br/relindicadoresmun2.php"
SIOPS_TABNET_URL = "http://siops-asp.datasus.gov.br/cgi/tabcgi.exe?SIOPS/SerHist/municipio/mIndicadores.def"
SIOPS_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)

VIA_TABNET = "tabnet"
VIA_CONSULTA_ANO = "consulta_ano"
TIPO_PERIODO_ANUAL = "anual"
TIPO_PERIODO_BIMESTRAL = "bimestral"
PERIODO_FECHAMENTO = 6
PERIODOS_PARCIAIS_DECRESCENTES = (5, 4, 3, 2, 1)
# `cmbPeriodo` da consulta por ano: código do formulário de cada bimestre.
CODIGO_PERIODO_CONSULTA = {1: "12", 2: "14", 3: "1", 4: "18", 5: "20", 6: "2"}

UNIDADE_PERCENTUAL = "percentual"
UNIDADE_MONETARIA = "monetario"

# Indicadores exibidos ao cidadão: presentes nas duas vias para a conferência.
INDICADORES_TELA: dict[str, dict[str, str]] = {
    "2.1": {"incremento": "2.1_D.Total_Saúde/Hab", "unidade": UNIDADE_MONETARIA},
    "3.1": {"incremento": "3.1_%Transf.SUS/D.Total", "unidade": UNIDADE_PERCENTUAL},
    "3.2": {"incremento": "3.2_%R.Próprios_em_Saúde-EC_29", "unidade": UNIDADE_PERCENTUAL},
}
INDICADOR_MINIMO = "3.2"
# Valores absolutos (só no TABNET) que permitem conciliar o 3.2 com o cálculo próprio do dbt.
INDICADORES_BASE: dict[str, dict[str, str]] = {
    "receita_impostos_transferencias_constitucionais": {
        "incremento": "R.Impostos_e_Transf.Const",
        "unidade": UNIDADE_MONETARIA,
    },
    "despesa_recursos_proprios": {"incremento": "D.R.Próprios", "unidade": UNIDADE_MONETARIA},
    "despesa_total_saude": {"incremento": "D.Total_Saúde", "unidade": UNIDADE_MONETARIA},
}
INDICADORES_TABNET = {**INDICADORES_TELA, **INDICADORES_BASE}

# O TABNET devolve ~5.570 municípios; abaixo disto a resposta veio truncada ou é outra página.
MINIMO_MUNICIPIOS_TABNET = 1000
TAMANHO_CODIGO_SIOPS = 6
TOLERANCIA_DIVERGENCIA = Decimal("0.01")

_RE_LINHA_TABNET = re.compile(r'^"(\d{6}) .*"$')
_RE_NUMERO_TABNET = re.compile(r"^-?\d+(,\d+)?$")
_RE_NUMERO_CONSULTA = re.compile(r"^-?\d{1,3}(\.\d{3})*,\d+$|^-?\d+,\d+$")
_RE_CABECALHO_CONSULTA = re.compile(r"Ano-Base:\s*(\d{4})\s*-\s*(\d)º\s*Bimestre", re.IGNORECASE)
_RE_CODIGO_CONSULTA = re.compile(r"Código:\s*(\d{6})")
_RE_LINHA_CONSULTA = re.compile(
    r'<td[^>]*class="td2 tdc linha"[^>]*>\s*(\d\.\d+)\s*</td>.*?<td[^>]*class="tdr caixa"[^>]*>(.*?)</td>',
    re.DOTALL,
)


class SiopsError(RuntimeError):
    """Resposta inesperada, incompleta ou indisponível: a carga termina sem gravar nada."""


def codigo_siops(cod_ibge: int) -> str:
    """Código do município no SIOPS: o IBGE sem o dígito verificador (6 dígitos)."""
    codigo = str(cod_ibge)[:TAMANHO_CODIGO_SIOPS]
    if len(codigo) != TAMANHO_CODIGO_SIOPS or not codigo.isdigit():
        raise SiopsError(f"cod_ibge inválido para derivar o código SIOPS: {cod_ibge}")
    return codigo


def codigo_uf(cod_ibge: int) -> str:
    return str(cod_ibge)[:2]


def validar_faixa(valor: Decimal | None, unidade: str, contexto: str) -> Decimal | None:
    """Percentual fora de 0 a 100 e valor monetário negativo são suspeitos: nunca seguem adiante."""
    if valor is None:
        return None
    if valor < 0 or (unidade == UNIDADE_PERCENTUAL and valor > 100):
        raise SiopsError(f"Valor fora da faixa válida no SIOPS ({contexto}): {valor}")
    return valor


def parse_tabnet(corpo: str, incremento: str) -> dict[str, Decimal | None]:
    """Lê a tabela `<PRE>` do TABNET: código de 6 dígitos -> valor (nulo quando a fonte traz '...')."""
    achado = re.search(r"<PRE>(.*?)</PRE>", corpo, re.IGNORECASE | re.DOTALL)
    if not achado:
        raise SiopsError("Resposta do TABNET sem bloco de dados (<PRE>)")
    linhas = [linha.strip() for linha in achado.group(1).splitlines() if linha.strip().startswith('"')]
    if not linhas:
        raise SiopsError("Resposta do TABNET sem linhas de dados")
    rotulo = html.unescape(linhas[0].split(";", 1)[-1]).strip('"')
    if rotulo != incremento.replace("_", " ") and rotulo != incremento:
        raise SiopsError(f"Coluna inesperada no TABNET: {rotulo!r}, esperado {incremento!r}")

    def ler(linha: str) -> tuple[str, Decimal | None]:
        # O nome do município vem com entidade HTML (`Porci&uacute;ncula`): o `;` dela quebra um split simples.
        # O valor é sempre o que vem depois do último `;`.
        nome, _, bruto = linha.rpartition(";")
        if not _RE_LINHA_TABNET.match(nome):
            raise SiopsError(f"Linha do TABNET com formato inesperado: {linha!r}")
        if bruto == "...":
            return nome[1:7], None
        if not _RE_NUMERO_TABNET.match(bruto):
            raise SiopsError(f"Valor do TABNET com formato inesperado: {linha!r}")
        return nome[1:7], Decimal(bruto.replace(",", "."))

    pares = [ler(linha) for linha in linhas[1:] if not linha.startswith('"Total";')]
    codigos = [codigo for codigo, _ in pares]
    if len(set(codigos)) != len(codigos):
        raise SiopsError("Município repetido na resposta do TABNET")
    if len(pares) < MINIMO_MUNICIPIOS_TABNET:
        raise SiopsError(f"Resposta do TABNET com poucos municípios ({len(pares)}): provável truncamento")
    return dict(pares)


def parse_consulta_ano(corpo: str, codigo: str, ano: int, periodo: int) -> dict[str, Decimal | None] | None:
    """Lê a página de indicadores do município. `None` = não houve transmissão (sem dado, nunca zero)."""
    texto = html.unescape(corpo)
    if "Não houve transmissão de dados" in texto:
        return None
    cabecalho = _RE_CABECALHO_CONSULTA.search(texto)
    codigo_pagina = _RE_CODIGO_CONSULTA.search(texto)
    if "<table" not in texto or not cabecalho or not codigo_pagina:
        raise SiopsError(f"Página do SIOPS sem tabela de indicadores ({codigo}, {ano}, bimestre {periodo})")
    if codigo_pagina.group(1) != codigo or (int(cabecalho.group(1)), int(cabecalho.group(2))) != (ano, periodo):
        raise SiopsError(
            f"Página do SIOPS fora do pedido: pediu {codigo}/{ano}/{periodo}, "
            f"veio {codigo_pagina.group(1)}/{cabecalho.group(1)}/{cabecalho.group(2)}"
        )
    por_codigo: dict[str, Decimal | None] = {}
    for indicador, bruto in _RE_LINHA_CONSULTA.findall(texto):
        if indicador in por_codigo:
            raise SiopsError(f"Indicador {indicador} repetido na página do SIOPS ({codigo}, {ano})")
        limpo = re.sub(r"[%\s]|R\$", "", bruto.replace("\xa0", ""))
        if not _RE_NUMERO_CONSULTA.match(limpo):
            raise SiopsError(f"Valor do indicador {indicador} com formato inesperado no SIOPS: {bruto.strip()!r}")
        por_codigo[indicador] = Decimal(limpo.replace(".", "").replace(",", "."))
    ausentes = [c for c in INDICADORES_TELA if c not in por_codigo]
    if ausentes:
        raise SiopsError(f"Indicadores ausentes na página do SIOPS ({codigo}, {ano}): {', '.join(ausentes)}")
    return {c: por_codigo[c] for c in INDICADORES_TELA}


def divergencias_entre_vias(linhas: list[dict[str, Any]]) -> list[tuple[str, str]]:
    """Pares (indicador, descrição) dos indicadores de tela cujo valor difere entre as duas vias (ambas com valor)."""
    por_chave: dict[tuple[Any, ...], dict[str, Decimal | None]] = {}
    for linha in linhas:
        if linha["codigo_indicador"] in INDICADORES_TELA:
            chave = (linha["portal_slug"], linha["ano"], linha["periodo"], linha["codigo_indicador"])
            por_chave.setdefault(chave, {})[linha["via"]] = linha["valor"]

    def diverge(vias: dict[str, Decimal | None]) -> bool:
        tabnet, consulta = vias.get(VIA_TABNET), vias.get(VIA_CONSULTA_ANO)
        return tabnet is not None and consulta is not None and abs(tabnet - consulta) > TOLERANCIA_DIVERGENCIA

    return [
        (
            indicador,
            f"{portal} {ano} bimestre {periodo} indicador {indicador}: tabnet={vias[VIA_TABNET]} "
            f"consulta_ano={vias[VIA_CONSULTA_ANO]}",
        )
        for (portal, ano, periodo, indicador), vias in sorted(por_chave.items())
        if diverge(vias)
    ]


class SiopsExtractor:
    def __init__(self, min_interval_seconds: float = 1.0, max_retries: int = 3, timeout: int = 120) -> None:
        self.min_interval_seconds = min_interval_seconds
        self.max_retries = max_retries
        self.timeout = timeout
        self._last_request_time = 0.0
        self.metricas: list[tuple[str, float]] = []

    def _wait_rate_limit(self) -> None:
        if self.min_interval_seconds <= 0:
            return
        elapsed = time.monotonic() - self._last_request_time
        if elapsed < self.min_interval_seconds:
            time.sleep(self.min_interval_seconds - elapsed)

    def _post(self, url: str, campos: list[tuple[str, str]]) -> str:
        """POST em latin1 (o TABNET recusa UTF-8) com limite de taxa e retry só para falha transitória."""
        corpo = urlencode(campos, encoding="latin1").encode("ascii")
        headers = {"User-Agent": SIOPS_USER_AGENT, "Content-Type": "application/x-www-form-urlencoded"}
        backoff = 2.0
        ultimo_erro: Exception | None = None

        for tentativa in range(1, self.max_retries + 1):
            self._wait_rate_limit()
            inicio = time.monotonic()
            self._last_request_time = inicio
            try:
                resp = requests.post(url, data=corpo, headers=headers, timeout=self.timeout)
            except requests.RequestException as err:
                ultimo_erro = err
            else:
                self.metricas.append((url, time.monotonic() - inicio))
                if resp.status_code == 200:
                    return resp.content.decode("latin1")
                if resp.status_code not in (429, 500, 502, 503, 504):
                    raise SiopsError(f"HTTP {resp.status_code} inesperado do SIOPS")
                ultimo_erro = requests.HTTPError(f"HTTP {resp.status_code} do SIOPS")
            logger.warning("Falha transitória no SIOPS (tentativa %s/%s): %s", tentativa, self.max_retries, ultimo_erro)
            if tentativa < self.max_retries:
                time.sleep(backoff)
                backoff *= 2

        raise SiopsError(f"SIOPS indisponível após {self.max_retries} tentativas") from ultimo_erro

    def baixar_tabnet(self, ano: int, incremento: str) -> dict[str, Decimal | None]:
        campos = [
            ("Linha", "Munic-BR"),
            ("Coluna", "--Não-Ativa--"),
            ("Incremento", incremento),
            ("Arquivos", f"indmun{ano % 100:02d}.dbf"),
            ("SAno", "TODAS_AS_CATEGORIAS__"),
            ("formato", "prn"),
            ("mostre", "Mostra"),
        ]
        return parse_tabnet(self._post(SIOPS_TABNET_URL, campos), incremento)

    def consultar_ano(self, cod_ibge: int, ano: int, periodo: int) -> dict[str, Decimal | None] | None:
        codigo = codigo_siops(cod_ibge)
        campos = [
            ("cmbAno", str(ano)),
            ("cmbUF", codigo_uf(cod_ibge)),
            ("cmbPeriodo", CODIGO_PERIODO_CONSULTA[periodo]),
            ("cmbMunicipio[]", codigo),
            ("BtConsultar", "Consultar"),
        ]
        return parse_consulta_ano(self._post(SIOPS_CONSULTA_URL, campos), codigo, ano, periodo)

    def extrair(self, portais: list[PortalConfig], anos: list[int] | None = None) -> list[dict[str, Any]]:
        """Extrai as duas vias de todos os portais. Tudo ou nada: qualquer lacuna levanta `SiopsError`."""
        ano_corrente = date.today().year
        anos_por_portal = {p.slug: anos or list(range(p.ano_inicial, ano_corrente + 1)) for p in portais}
        anos_fechados = sorted({a for lista in anos_por_portal.values() for a in lista if a < ano_corrente})
        coletado_em = datetime.now(timezone.utc).isoformat()

        tabnet = {
            (ano, codigo): self.baixar_tabnet(ano, meta["incremento"])
            for ano in anos_fechados
            for codigo, meta in INDICADORES_TABNET.items()
        }

        def linha(
            portal: PortalConfig, ano: int, periodo: int, tipo: str, via: str, indicador: str, valor: Any
        ) -> dict[str, Any]:
            unidade = INDICADORES_TABNET[indicador]["unidade"]
            return {
                "portal_slug": portal.slug,
                "ano": ano,
                "periodo": periodo,
                "tipo_periodo": tipo,
                "via": via,
                "codigo_indicador": indicador,
                "unidade": unidade,
                "valor": validar_faixa(valor, unidade, f"{portal.slug} {ano} {indicador} via {via}"),
                "coletado_em": coletado_em,
            }

        def do_tabnet(portal: PortalConfig, ano: int) -> list[dict[str, Any]]:
            codigo = codigo_siops(portal.cod_ibge)
            ausentes = [i for i in INDICADORES_TABNET if codigo not in tabnet[(ano, i)]]
            if ausentes:
                raise SiopsError(f"Município {portal.slug} ausente no TABNET de {ano}: {', '.join(ausentes)}")
            return [
                linha(portal, ano, PERIODO_FECHAMENTO, TIPO_PERIODO_ANUAL, VIA_TABNET, i, tabnet[(ano, i)][codigo])
                for i in INDICADORES_TABNET
            ]

        def da_consulta(portal: PortalConfig, ano: int, periodo: int, tipo: str) -> list[dict[str, Any]]:
            valores = self.consultar_ano(portal.cod_ibge, ano, periodo)
            return [
                linha(portal, ano, periodo, tipo, VIA_CONSULTA_ANO, i, None if valores is None else valores[i])
                for i in INDICADORES_TELA
            ]

        def parcial(portal: PortalConfig, ano: int) -> list[dict[str, Any]]:
            """Bimestre mais avançado já transmitido; sem nenhum, o ano fica sem linhas."""
            for periodo in PERIODOS_PARCIAIS_DECRESCENTES:
                linhas = da_consulta(portal, ano, periodo, TIPO_PERIODO_BIMESTRAL)
                if any(item["valor"] is not None for item in linhas):
                    return linhas
            logger.warning("SIOPS sem transmissão para %s em %s; nada gravado", portal.slug, ano)
            return []

        linhas = [
            item
            for portal in portais
            for ano in anos_por_portal[portal.slug]
            for item in (
                [*do_tabnet(portal, ano), *da_consulta(portal, ano, PERIODO_FECHAMENTO, TIPO_PERIODO_ANUAL)]
                if ano < ano_corrente
                else parcial(portal, ano)
                if ano == ano_corrente
                else []
            )
        ]
        divergentes = divergencias_entre_vias(linhas)
        # O 3.2 é o número comparado com o mínimo legal: divergir entre as vias impede a carga.
        criticas = [descricao for indicador, descricao in divergentes if indicador == INDICADOR_MINIMO]
        if criticas:
            raise SiopsError(f"Divergência entre as vias no indicador do mínimo de saúde: {'; '.join(criticas)}")
        for _, descricao in divergentes:
            logger.warning("Divergência entre as vias do SIOPS: %s", descricao)
        return linhas


def extract_and_load_siops(
    portais: list[PortalConfig],
    years: list[int] | None = None,
    db: Connectable | None = None,
    extractor: SiopsExtractor | None = None,
) -> int:
    """Extrai os indicadores dos portais e grava no raw; sem `db`, só extrai. Erro não grava nada."""
    linhas = (extractor or SiopsExtractor()).extrair(portais, years)
    if db is None:
        return len(linhas)
    ensure_siops_table(db, SCHEMA)
    return load_siops_indicadores(db, linhas, schema=SCHEMA)


def _todos_os_portais() -> list[str]:
    return sorted(p.stem for p in (Path(__file__).parent.parent / "portals").glob("*.yml"))


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description="Extrai e carrega indicadores de saúde do SIOPS")
    parser.add_argument("--portal", nargs="*", help="Slugs dos portais (default: todos os de elt/portals)")
    parser.add_argument("--years", nargs="+", type=int, help="Anos (default: ano_inicial até o ano corrente)")
    parser.add_argument("--dry-run", action="store_true", help="Só extrai e valida, sem gravar no banco")
    args = parser.parse_args()

    portais = [PortalConfig.load(slug) for slug in (args.portal or _todos_os_portais())]
    extractor = SiopsExtractor()
    try:
        total = extract_and_load_siops(
            portais, args.years, db=None if args.dry_run else get_engine(), extractor=extractor
        )
    except SiopsError as err:
        logger.error("Carga do SIOPS abortada, nada foi gravado: %s", err)
        raise SystemExit(1) from err
    lentas = sorted(extractor.metricas, key=lambda m: m[1], reverse=True)[:3]
    logger.info(
        "SIOPS: %d registros %s; requisições mais lentas: %s",
        total,
        "validados" if args.dry_run else "gravados",
        lentas,
    )


if __name__ == "__main__":
    main()
