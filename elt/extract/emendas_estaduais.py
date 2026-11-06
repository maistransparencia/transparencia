"""Extrator das emendas estaduais a partir da página oficial de cada Estado, guiado por configuração por fonte.

Cada Estado é uma entrada de `elt/fontes/emendas_estaduais.yml` (órgão, página, padrão para descobrir os links,
mapeamento de colunas para o modelo comum, modalidades, codificação e decimal). Nada aqui conhece um Estado: adicionar
um Estado é adicionar a configuração. Os links dos arquivos são descobertos na página, nunca por nome fixo.

O arquivo de detalhamento traz uma linha por emenda. Valor sem número é ignorado (nunca zero); modalidade que a
configuração não conhece vira `nao_mapeada` e é registrada no log.
"""

import argparse
import csv
import io
import logging
import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Callable
from urllib.parse import unquote, urljoin

import requests
import yaml

from elt.core.db import Connectable, get_engine
from elt.load.emendas_estaduais import (
    ensure_emendas_estaduais_tables,
    load_arquivos_fonte,
    load_emendas_detalhamento,
    load_execucao_emendas,
)

logger = logging.getLogger(__name__)

CAMINHO_FONTES = Path(__file__).resolve().parent.parent / "fontes" / "emendas_estaduais.yml"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)
TIPO_DETALHAMENTO = "detalhamento"
TIPO_EXECUCAO = "execucao"
# posição do relatório: "8 / 2026" ou "abr/26" (mês por extenso abreviado, em português)
PADROES_POSICAO = (
    r"(?P<mes>\d{1,2})\s*/\s*(?P<ano>\d{4})",
    r"(?P<mes_nome>[a-z]{3})\s*/\s*(?P<ano_curto>\d{2})\b",
)
MESES_ABREVIADOS = ("jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez")
CAMPOS_VALOR_EXECUCAO = ("dotacao_inicial", "empenhado", "liquidado", "pago")
COLUNAS_OBRIGATORIAS_EXECUCAO = ("identificador", "posicao", *CAMPOS_VALOR_EXECUCAO)
MODALIDADE_NAO_MAPEADA = "nao_mapeada"
AREA_OUTRAS = "outras"
COLUNAS_OBRIGATORIAS = ("numero_emenda", "identificador", "valor", "modalidade")
TIMEOUT_SEGUNDOS = 60


class EmendasEstaduaisError(RuntimeError):
    """Página ou arquivo fora do contrato esperado: a carga da fonte termina sem gravar nada dela."""


@dataclass(frozen=True)
class PadroesArquivo:
    padrao_link: str
    padrao_ano: str | None = None
    padrao_data: str | None = None
    padrao_fase: str | None = None
    padroes_posicao: tuple[str, ...] = PADROES_POSICAO


@dataclass(frozen=True)
class FonteEmendaEstadual:
    codigo_fonte: str
    uf: str
    orgao_publicador: str
    pagina_url: str
    codificacao: str
    delimitador: str
    separador_decimal: str
    simbolo_moeda: str
    arquivos: dict[str, PadroesArquivo]
    colunas: dict[str, str]
    modalidades: dict[str, str]
    fase_padrao: str | None = None
    areas_por_unidade: dict[str, str] = field(default_factory=dict)
    areas_por_funcao: dict[str, str] = field(default_factory=dict)
    colunas_execucao: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class ArquivoDescoberto:
    tipo_arquivo: str
    url_arquivo: str
    nome_arquivo: str
    ano: int | None
    data_arquivo: date | None
    fase: str | None


def normalizar(texto: str) -> str:
    """Minúsculas, sem acento e sem espaços nas pontas, para comparar cabeçalhos e modalidades."""
    sem_acento = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", sem_acento).strip().lower()


def _codigo_numerico(texto: str) -> str:
    """Número que abre o texto (`04-Administração` e `4` viram `4`); texto sem número fica vazio."""
    achado = re.match(r"\s*(\d+)", texto)
    return str(int(achado.group(1))) if achado else ""


def codigo_area(fonte: FonteEmendaEstadual, unidade_orcamentaria: str, funcao: str) -> str:
    """Área da emenda pelo mapa da fonte: unidade orçamentária, depois código da função; senão `outras`."""
    por_unidade = fonte.areas_por_unidade.get(normalizar(unidade_orcamentaria))
    por_funcao = fonte.areas_por_funcao.get(_codigo_numerico(funcao))
    return por_unidade or por_funcao or AREA_OUTRAS


def carregar_fontes(caminho: Path = CAMINHO_FONTES) -> list[FonteEmendaEstadual]:
    dados = yaml.safe_load(caminho.read_text(encoding="utf-8")) or {}
    return [
        FonteEmendaEstadual(
            codigo_fonte=item["codigo_fonte"],
            uf=item["uf"],
            orgao_publicador=item["orgao_publicador"],
            pagina_url=item["pagina_url"],
            codificacao=item.get("codificacao", "utf-8-sig"),
            delimitador=item.get("delimitador", ";"),
            separador_decimal=item.get("separador_decimal", ","),
            simbolo_moeda=item.get("simbolo_moeda", ""),
            arquivos={tipo: PadroesArquivo(**padroes) for tipo, padroes in item["arquivos"].items()},
            colunas=item["colunas"],
            modalidades={normalizar(texto): codigo for texto, codigo in item["modalidades"].items()},
            fase_padrao=item.get("fase_padrao"),
            areas_por_unidade={
                normalizar(str(k)): v for k, v in (item.get("areas") or {}).get("unidade_orcamentaria", {}).items()
            },
            areas_por_funcao={
                _codigo_numerico(str(k)): v for k, v in (item.get("areas") or {}).get("funcao", {}).items()
            },
            colunas_execucao=item.get("colunas_execucao") or {},
        )
        for item in (dados.get("fontes") or [])
    ]


class _ColetorLinks(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "a":
            href = dict(attrs).get("href")
            if href:
                self.links.append(href)


def _grupo(padrao: str | None, texto: str, grupo: str) -> str | None:
    if not padrao:
        return None
    achado = re.search(padrao, texto)
    return achado.group(grupo) if achado and grupo in achado.groupdict() else None


def _data_do_nome(padrao: str | None, nome: str) -> date | None:
    if not padrao:
        return None
    achado = re.search(padrao, nome)
    if not achado:
        return None
    try:
        return date(int(achado.group("ano")), int(achado.group("mes")), int(achado.group("dia")))
    except ValueError:
        return None


def descobrir_arquivos(fonte: FonteEmendaEstadual, html: str) -> list[ArquivoDescoberto]:
    """Acha na página os links `.csv` de cada tipo de arquivo configurado; nunca usa nome de arquivo fixo."""
    coletor = _ColetorLinks()
    coletor.feed(html)
    descobertos: dict[str, ArquivoDescoberto] = {}
    for href in coletor.links:
        caminho = unquote(href.split("#")[0].split("?")[0])
        if not caminho.lower().endswith(".csv"):
            continue
        for tipo, padroes in fonte.arquivos.items():
            if not re.search(padroes.padrao_link, normalizar(caminho)):
                continue
            nome = caminho.rsplit("/", 1)[-1]
            ano = _grupo(padroes.padrao_ano, caminho, "ano")
            fase = _grupo(padroes.padrao_fase, normalizar(nome), "fase") or fonte.fase_padrao
            url = urljoin(fonte.pagina_url, href)
            descobertos[url] = ArquivoDescoberto(
                tipo_arquivo=tipo,
                url_arquivo=url,
                nome_arquivo=nome,
                ano=int(ano) if ano else None,
                data_arquivo=_data_do_nome(padroes.padrao_data, nome),
                fase=fase,
            )
    return list(descobertos.values())


def parse_valor(fonte: FonteEmendaEstadual, texto: str) -> Decimal | None:
    """`R$ 50.000,00` vira `50000.00`; texto vazio ou inválido vira nulo, nunca zero."""
    limpo = texto.replace(fonte.simbolo_moeda, "").strip() if fonte.simbolo_moeda else texto.strip()
    milhar = "." if fonte.separador_decimal == "," else ","
    limpo = limpo.replace(milhar, "").replace(fonte.separador_decimal, ".").replace(" ", "")
    try:
        return Decimal(limpo) if limpo else None
    except InvalidOperation:
        return None


def codigo_modalidade(fonte: FonteEmendaEstadual, texto: str) -> str:
    """Tira o número inicial (`2 - Transferência Especial`) e traduz pelo mapa da fonte."""
    sem_numero = re.sub(r"^\s*\d+\s*[-–.]\s*", "", texto)
    codigo = fonte.modalidades.get(normalizar(sem_numero))
    if codigo is None:
        logger.warning("Modalidade fora do mapa da fonte %s: %r", fonte.codigo_fonte, texto)
        return MODALIDADE_NAO_MAPEADA
    return codigo


def ler_detalhamento(fonte: FonteEmendaEstadual, conteudo: bytes) -> list[dict[str, Any]]:
    """Lê o CSV de detalhamento no modelo comum (já com nomes de coluna comuns e modalidade em snake_case).

    A primeira linha não vazia é o cabeçalho (o arquivo pode começar com linhas vazias). Cabeçalho sem as colunas
    obrigatórias do mapa encerra a leitura com erro.
    """
    leitor = csv.reader(io.StringIO(conteudo.decode(fonte.codificacao)), delimiter=fonte.delimitador)
    linhas = [linha for linha in leitor if any(celula.strip() for celula in linha)]
    if not linhas:
        raise EmendasEstaduaisError(f"Arquivo vazio na fonte {fonte.codigo_fonte}")
    posicoes = {normalizar(titulo): indice for indice, titulo in enumerate(linhas[0]) if titulo.strip()}
    indice_por_campo = {campo: posicoes.get(normalizar(titulo)) for campo, titulo in fonte.colunas.items()}
    ausentes = [campo for campo in COLUNAS_OBRIGATORIAS if indice_por_campo.get(campo) is None]
    if ausentes:
        raise EmendasEstaduaisError(f"Colunas ausentes na fonte {fonte.codigo_fonte}: {', '.join(ausentes)}")

    def celula(linha: list[str], campo: str) -> str:
        indice = indice_por_campo.get(campo)
        return linha[indice].replace("\x00", "").strip() if indice is not None and indice < len(linha) else ""

    return [
        {
            "codigo_fonte": fonte.codigo_fonte,
            "identificador": celula(linha, "identificador"),
            "numero_emenda": celula(linha, "numero_emenda"),
            "autor": celula(linha, "autor") or None,
            "valor": parse_valor(fonte, celula(linha, "valor")),
            "objeto": celula(linha, "objeto") or None,
            "beneficiario": celula(linha, "beneficiario") or None,
            "municipio": celula(linha, "municipio") or None,
            "funcao": celula(linha, "funcao") or None,
            "unidade_orcamentaria": celula(linha, "unidade_orcamentaria") or None,
            "modalidade": codigo_modalidade(fonte, celula(linha, "modalidade")),
            "area": codigo_area(fonte, celula(linha, "unidade_orcamentaria"), celula(linha, "funcao")),
        }
        for linha in linhas[1:]
        if celula(linha, "identificador") and celula(linha, "numero_emenda")
    ]


def _posicao(padroes: PadroesArquivo, texto: str) -> tuple[int, int] | None:
    """Ano e mês do relatório a partir do texto da coluna de posição; `None` se nenhum padrão reconhece."""
    texto = normalizar(texto)
    for padrao in padroes.padroes_posicao:
        achado = re.search(padrao, texto)
        if not achado:
            continue
        campos = achado.groupdict()
        if campos.get("mes") and campos.get("ano"):
            return int(campos["ano"]), int(campos["mes"])
        if campos.get("mes_nome") in MESES_ABREVIADOS and campos.get("ano_curto"):
            return 2000 + int(campos["ano_curto"]), MESES_ABREVIADOS.index(campos["mes_nome"]) + 1
    return None


def _soma(valores: list[Decimal | None]) -> Decimal | None:
    presentes = [v for v in valores if v is not None]
    return sum(presentes, Decimal(0)) if presentes else None


def ler_execucao(fonte: FonteEmendaEstadual, padroes: PadroesArquivo, conteudo: bytes) -> list[dict[str, Any]]:
    """Lê o relatório de execução e soma por emenda (uma emenda pode ter várias ações/unidades).

    O cabeçalho é a primeira linha que traz todas as colunas do mapa (o arquivo pode ter linhas de título antes).
    A posição (mês e ano do relatório) vem na primeira linha de cada bloco e vale para as seguintes; linhas de total
    e linhas sem identificador são ignoradas. Valor sem número fica nulo, nunca zero.
    """
    leitor = csv.reader(io.StringIO(conteudo.decode(fonte.codificacao)), delimiter=fonte.delimitador)
    linhas = [linha for linha in leitor if any(celula.strip() for celula in linha)]
    titulos = {campo: normalizar(titulo) for campo, titulo in fonte.colunas_execucao.items()}
    ausentes = [campo for campo in COLUNAS_OBRIGATORIAS_EXECUCAO if campo not in titulos]
    if ausentes:
        raise EmendasEstaduaisError(
            f"Colunas de execução não configuradas na fonte {fonte.codigo_fonte}: {', '.join(ausentes)}"
        )
    cabecalho = next(
        (i for i, linha in enumerate(linhas) if set(titulos.values()) <= {normalizar(c) for c in linha}), None
    )
    if cabecalho is None:
        raise EmendasEstaduaisError(f"Cabeçalho do relatório de execução não encontrado na fonte {fonte.codigo_fonte}")
    posicoes = {normalizar(titulo): indice for indice, titulo in enumerate(linhas[cabecalho]) if titulo.strip()}
    indice = {campo: posicoes[titulo] for campo, titulo in titulos.items()}

    def celula(linha: list[str], campo: str) -> str:
        return linha[indice[campo]].strip() if indice[campo] < len(linha) else ""

    agrupado: dict[str, dict[str, Any]] = {}
    posicao_atual: tuple[int, int] | None = None
    for linha in linhas[cabecalho + 1 :]:
        texto_posicao = celula(linha, "posicao")
        if "total" in normalizar(texto_posicao):
            continue
        posicao_atual = _posicao(padroes, texto_posicao) or posicao_atual
        identificador = celula(linha, "identificador")
        if not identificador:
            continue
        if posicao_atual is None:
            raise EmendasEstaduaisError(f"Linha sem posição do relatório na fonte {fonte.codigo_fonte}")
        atual = agrupado.setdefault(
            identificador, {"posicao": posicao_atual, "valores": {c: [] for c in CAMPOS_VALOR_EXECUCAO}}
        )
        atual["posicao"] = max(atual["posicao"], posicao_atual)
        for campo in CAMPOS_VALOR_EXECUCAO:
            atual["valores"][campo].append(parse_valor(fonte, celula(linha, campo)))
    return [
        {
            "codigo_fonte": fonte.codigo_fonte,
            "identificador": identificador,
            "posicao_ano": dados["posicao"][0],
            "posicao_mes": dados["posicao"][1],
            **{campo: _soma(dados["valores"][campo]) for campo in CAMPOS_VALOR_EXECUCAO},
        }
        for identificador, dados in agrupado.items()
    ]


def _texto_pagina(resposta: requests.Response) -> str:
    """HTML da página em UTF-8; o servidor às vezes declara ISO-8859-1 e os links com acento ficam corrompidos."""
    resposta.encoding = "utf-8"
    return resposta.text


def _baixar(url: str) -> requests.Response:
    resposta = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=TIMEOUT_SEGUNDOS)
    resposta.raise_for_status()
    return resposta


def extract_and_load_fonte(
    fonte: FonteEmendaEstadual,
    db: Connectable | None,
    baixar: Callable[[str], requests.Response] = _baixar,
) -> int:
    """Descobre os arquivos da fonte, valida todos e só então grava. Devolve o total de emendas do detalhamento.

    O detalhamento é obrigatório; o relatório de execução é opcional (Estado que não o publica segue só com a lista).
    """
    pagina = baixar(fonte.pagina_url)
    descobertos = descobrir_arquivos(fonte, _texto_pagina(pagina))
    detalhamentos = [a for a in descobertos if a.tipo_arquivo == TIPO_DETALHAMENTO]
    if not detalhamentos:
        raise EmendasEstaduaisError(
            f"Nenhum arquivo de detalhamento encontrado na página da fonte {fonte.codigo_fonte}"
        )
    execucoes = [a for a in descobertos if a.tipo_arquivo == TIPO_EXECUCAO]
    lidos = [(arquivo, ler_detalhamento(fonte, baixar(arquivo.url_arquivo).content)) for arquivo in detalhamentos]
    lidos_execucao = [
        (arquivo, ler_execucao(fonte, fonte.arquivos[TIPO_EXECUCAO], baixar(arquivo.url_arquivo).content))
        for arquivo in execucoes
    ]
    if db is None:
        return sum(len(linhas) for _, linhas in lidos)

    coletado_em = datetime.now(timezone.utc)
    ensure_emendas_estaduais_tables(db)
    load_arquivos_fonte(
        db,
        [
            {
                "codigo_fonte": fonte.codigo_fonte,
                "nome_arquivo": arquivo.nome_arquivo,
                "uf": fonte.uf,
                "orgao_publicador": fonte.orgao_publicador,
                "url_pagina": fonte.pagina_url,
                "url_arquivo": arquivo.url_arquivo,
                "tipo_arquivo": arquivo.tipo_arquivo,
                "ano": arquivo.ano,
                "data_arquivo": arquivo.data_arquivo,
                "fase": arquivo.fase,
                "coletado_em": coletado_em,
            }
            for arquivo, _ in [*lidos, *lidos_execucao]
        ],
    )
    for arquivo, linhas in lidos_execucao:
        load_execucao_emendas(db, [{**linha, "nome_arquivo": arquivo.nome_arquivo} for linha in linhas])
    return sum(
        load_emendas_detalhamento(db, [{**linha, "nome_arquivo": arquivo.nome_arquivo} for linha in linhas])
        for arquivo, linhas in lidos
    )


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description="Extrai e carrega as emendas estaduais das fontes configuradas")
    parser.add_argument("--fonte", help="Código da fonte (default: todas as configuradas)")
    parser.add_argument("--dry-run", action="store_true", help="Só extrai e valida, sem gravar no banco")
    args = parser.parse_args()

    fontes = [f for f in carregar_fontes() if args.fonte in (None, f.codigo_fonte)]
    if not fontes:
        raise SystemExit("Nenhuma fonte configurada para o filtro informado")
    db = None if args.dry_run else get_engine()
    for fonte in fontes:
        try:
            total = extract_and_load_fonte(fonte, db)
        except (EmendasEstaduaisError, requests.RequestException) as err:
            logger.error("Fonte %s abortada, nada foi gravado dela: %s", fonte.codigo_fonte, err)
            raise SystemExit(1) from err
        logger.info("Fonte %s: %d emendas %s", fonte.codigo_fonte, total, "validadas" if args.dry_run else "gravadas")


if __name__ == "__main__":
    main()
