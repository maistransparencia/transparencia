"""Extrator da rede de saúde e da produção do SUS a partir dos arquivos mensais por Estado do DATASUS.

Cada UF é uma entrada de `elt/fontes/saude_datasus.yml` (host, pasta e padrão de nome de cada fonte, mapeamento de
campos). Nada aqui conhece um Estado: incluir um Estado é incluir a configuração. Um arquivo da UF serve a todas as
cidades dela, então o custo é por UF e por mês, não por cidade.

Fluxo de cada arquivo `.dbc` (DBF comprimido): baixa para uma pasta temporária própria, descompacta, lê linha a linha,
agrega só as linhas dos municípios pedidos e apaga tudo ao fim, inclusive em falha. O `.dbf` do SIA do mês chega a
~3,4 GB, por isso nada é carregado inteiro em memória.

Dado pessoal: o arquivo de profissionais traz nome, CPF e CNS. Só o CNS é lido (para contar pessoas distintas), fica
em memória durante a agregação e nunca é gravado nem logado.

Competência sem arquivo ou sem linhas do município é "sem dado" (nenhuma linha, nunca zero). Falha de rede ou de
leitura propaga e a competência não é gravada.
"""

from __future__ import annotations

import argparse
import ftplib
import logging
import re
import socket
import tempfile
import time
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Callable, Iterator

import yaml

logger = logging.getLogger(__name__)

CAMINHO_FONTES = Path(__file__).resolve().parent.parent / "fontes" / "saude_datasus.yml"
CAMINHO_DBT_PROJECT = Path(__file__).resolve().parent.parent / "transform" / "dbt_project.yml"

TIMEOUT_FTP = 60
TENTATIVAS_FTP = 5
ESPERA_INICIAL_FTP = 2.0
MESES_RECENTES = 4


class SaudeDatasusError(RuntimeError):
    pass


@dataclass(frozen=True)
class ArquivoFonte:
    pasta: str
    padrao_arquivo: str
    campos: dict[str, str]
    valor_atende_sus: str | None = None


@dataclass(frozen=True)
class FonteDatasus:
    uf: str
    host: str
    codificacao: str
    leitos: ArquivoFonte
    profissionais: ArquivoFonte
    sia: ArquivoFonte
    sih: ArquivoFonte


def _ler_configuracao(caminho: Path) -> dict[str, Any]:
    return yaml.safe_load(caminho.read_text(encoding="utf-8")) or {}


def carregar_fontes(caminho: Path = CAMINHO_FONTES) -> list[FonteDatasus]:
    return [
        FonteDatasus(
            uf=item["uf"],
            host=item["host"],
            codificacao=item.get("codificacao", "latin-1"),
            **{nome: ArquivoFonte(**item[nome]) for nome in ("leitos", "profissionais", "sia", "sih")},
        )
        for item in _ler_configuracao(caminho).get("fontes", [])
    ]


def carregar_tipos_leito(caminho: Path = CAMINHO_FONTES) -> dict[str, str]:
    return {str(codigo): texto for codigo, texto in (_ler_configuracao(caminho).get("tipos_leito") or {}).items()}


def ano_inicial_historico(caminho: Path = CAMINHO_DBT_PROJECT) -> int:
    """Corte de ano do projeto (variável dbt `ano_inicial_historico`): anos anteriores não importam."""
    return int(_ler_configuracao(caminho)["vars"]["ano_inicial_historico"])


def competencias_recentes(meses: int = MESES_RECENTES, hoje: date | None = None) -> list[int]:
    """Últimas `meses` competências (AAAAMM) fechadas, da mais recente para a mais antiga (o mês corrente fica de fora)."""
    hoje = hoje or date.today()
    indice = hoje.year * 12 + (hoje.month - 1)
    return [(posicao // 12) * 100 + (posicao % 12) + 1 for posicao in range(indice - 1, indice - 1 - meses, -1)]


def competencias_dos_anos(anos: list[int], hoje: date | None = None) -> list[int]:
    """Competências fechadas dos anos pedidos, da mais recente para a mais antiga."""
    hoje = hoje or date.today()
    atual = hoje.year * 100 + hoje.month
    return sorted(
        (ano * 100 + mes for ano in anos for mes in range(1, 13) if ano * 100 + mes < atual),
        reverse=True,
    )


def codigo_municipio6(cod_ibge: int | str) -> str:
    """Código IBGE de 6 dígitos (os arquivos do DATASUS não trazem o dígito verificador)."""
    codigo = int(cod_ibge)
    return str(codigo // 10 if codigo >= 1_000_000 else codigo)


def aamm(competencia: int) -> str:
    return f"{competencia // 100 % 100:02d}{competencia % 100:02d}"


def _inteiro_ou_none(valor: Any) -> int | None:
    try:
        return int(valor)
    except (TypeError, ValueError):
        return None


def _soma_ou_vazio(valores: list[int | None]) -> str:
    """Soma os valores legíveis; sem nenhum legível devolve vazio, que o mart lê como "sem dado"."""
    legiveis = [valor for valor in valores if valor is not None]
    return str(sum(legiveis)) if legiveis else ""


def _texto(valor: Any) -> str:
    return re.sub(r"\s+", " ", str(valor if valor is not None else "").strip())


def agregar_leitos(
    portal_slug: str, competencia: int, data_coleta: str, registros: list[dict[str, Any]], tipos_leito: dict[str, str]
) -> list[dict[str, Any]]:
    """Soma leitos existentes e do SUS por tipo de leito (o código do CNES vira o texto da tabela nacional)."""
    por_tipo: dict[str, list[dict[str, Any]]] = {}
    for registro in registros:
        codigo = _texto(registro.get("tipo_leito"))
        por_tipo.setdefault(tipos_leito.get(codigo, codigo), []).append(registro)
    return [
        {
            "portal_slug": portal_slug,
            "competencia": str(competencia),
            "tipo_leito": tipo,
            "total_leitos_existentes": _soma_ou_vazio([_inteiro_ou_none(r.get("leitos_existentes")) for r in grupo]),
            "total_leitos_sus": _soma_ou_vazio([_inteiro_ou_none(r.get("leitos_sus")) for r in grupo]),
            "data_coleta": data_coleta,
        }
        for tipo, grupo in sorted(por_tipo.items())
    ]


def agregar_profissionais(
    portal_slug: str,
    competencia: int,
    data_coleta: str,
    registros: list[dict[str, Any]],
    valor_atende_sus: str,
) -> list[dict[str, Any]]:
    """Conta vínculos e pessoas distintas pelo CNS. O CNS é usado só para contar e não sai desta função.

    Vínculo sem CNS conta como vínculo e não entra na contagem de pessoas (não há como saber se é a mesma pessoa).
    Sem nenhum CNS legível, as pessoas ficam "sem dado" (vazio), nunca zero.
    """
    if not registros:
        return []
    pessoas = {pessoa for r in registros if (pessoa := _texto(r.get("pessoa")))}
    pessoas_sus = {
        pessoa
        for r in registros
        if _texto(r.get("atende_sus")) == valor_atende_sus and (pessoa := _texto(r.get("pessoa")))
    }
    return [
        {
            "portal_slug": portal_slug,
            "competencia": str(competencia),
            "total_vinculos": str(len(registros)),
            "total_profissionais": str(len(pessoas)) if pessoas else "",
            "total_profissionais_sus": str(len(pessoas_sus)) if pessoas else "",
            "data_coleta": data_coleta,
        }
    ]


def agregar_atendimentos_ambulatoriais(
    portal_slug: str, competencia: int, data_coleta: str, registros: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """SIA: soma a quantidade de procedimentos ambulatoriais aprovados (`PA_QTDAPR`), sem valores em reais."""
    if not registros:
        return []
    return [
        {
            "portal_slug": portal_slug,
            "competencia": str(competencia),
            "total_procedimentos_ambulatoriais": _soma_ou_vazio(
                [_inteiro_ou_none(r.get("quantidade")) for r in registros]
            ),
            "data_coleta": data_coleta,
        }
    ]


def agregar_internacoes(
    portal_slug: str, competencia: int, data_coleta: str, registros: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """SIH: uma linha do arquivo é uma AIH paga pelo SUS; o total de internações é o número de linhas."""
    if not registros:
        return []
    return [
        {
            "portal_slug": portal_slug,
            "competencia": str(competencia),
            "total_internacoes": str(len(registros)),
            "data_coleta": data_coleta,
        }
    ]


class ClienteFtp:
    """FTP anônimo tratado como instável: timeout, repetição com espera crescente e retomada do download."""

    def __init__(
        self,
        host: str,
        timeout: float = TIMEOUT_FTP,
        tentativas: int = TENTATIVAS_FTP,
        espera_inicial: float = ESPERA_INICIAL_FTP,
        dormir: Callable[[float], None] = time.sleep,
        fabrica: Callable[..., ftplib.FTP] = ftplib.FTP,
    ) -> None:
        self.host = host
        self.timeout = timeout
        self.tentativas = tentativas
        self.espera_inicial = espera_inicial
        self._dormir = dormir
        self._fabrica = fabrica
        self._conexao: ftplib.FTP | None = None
        self._listagens: dict[str, list[str]] = {}

    def __enter__(self) -> ClienteFtp:
        return self

    def __exit__(self, *_: object) -> None:
        self._fechar()

    def _fechar(self) -> None:
        if self._conexao is not None:
            try:
                self._conexao.close()
            except OSError:
                pass
            self._conexao = None

    def _conectar(self) -> ftplib.FTP:
        if self._conexao is None:
            conexao = self._fabrica(self.host, timeout=self.timeout)
            conexao.login()
            conexao.set_pasv(True)
            self._conexao = conexao
        return self._conexao

    def _repetir(self, descricao: str, operacao: Callable[[ftplib.FTP], Any]) -> Any:
        """`error_perm` (resposta 5xx, como arquivo inexistente) não melhora ao repetir e propaga de imediato."""
        for tentativa in range(1, self.tentativas + 1):
            try:
                return operacao(self._conectar())
            except ftplib.error_perm:
                raise
            except (ftplib.Error, OSError, EOFError, socket.timeout) as erro:
                self._fechar()
                if tentativa == self.tentativas:
                    raise SaudeDatasusError(
                        f"FTP {self.host}: {descricao} falhou após {tentativa} tentativas: {erro}"
                    ) from erro
                espera = self.espera_inicial * 2 ** (tentativa - 1)
                logger.warning("FTP %s: %s falhou (%s); nova tentativa em %.0f s", self.host, descricao, erro, espera)
                self._dormir(espera)
        raise SaudeDatasusError(f"FTP {self.host}: {descricao} sem tentativas")  # pragma: no cover

    def listar(self, pasta: str) -> list[str]:
        """Nomes dos arquivos da pasta (uma listagem por pasta por execução)."""
        if pasta not in self._listagens:
            self._listagens[pasta] = self._repetir(
                f"listar {pasta}", lambda conexao: [Path(nome).name for nome in conexao.nlst(pasta)]
            )
        return self._listagens[pasta]

    def baixar(self, pasta: str, nome: str, destino: Path) -> None:
        """Baixa `nome` para `destino`, retomando do que já foi gravado a cada nova tentativa."""
        caminho = f"{pasta}{nome}"

        def uma_vez(conexao: ftplib.FTP) -> None:
            conexao.voidcmd("TYPE I")
            tamanho = conexao.size(caminho)
            ja_baixado = destino.stat().st_size if destino.exists() else 0
            if tamanho is not None and ja_baixado == tamanho:
                return
            with destino.open("ab") as saida:
                conexao.retrbinary(f"RETR {caminho}", saida.write, rest=ja_baixado or None)
            if tamanho is not None and destino.stat().st_size != tamanho:
                raise OSError(f"download incompleto de {nome}: {destino.stat().st_size} de {tamanho} bytes")

        self._repetir(f"baixar {nome}", uma_vez)


def arquivos_da_competencia(listagem: list[str], arquivo: ArquivoFonte, uf: str, competencia: int) -> list[str]:
    """Nomes da listagem que casam com o padrão da fonte para a UF e a competência (SIA em partes a, b, c...)."""
    padrao = re.compile(arquivo.padrao_arquivo.format(uf=re.escape(uf), aamm=aamm(competencia)), re.IGNORECASE)
    return sorted(nome for nome in listagem if padrao.fullmatch(nome))


def _linhas_dbf(caminho_dbf: Path, codificacao: str) -> Iterator[dict[str, Any]]:
    from dbfread import DBF

    return iter(DBF(str(caminho_dbf), encoding=codificacao, load=False, ignorecase=True, char_decode_errors="replace"))


@contextmanager
def pasta_temporaria() -> Iterator[Path]:
    """Pasta própria para o `.dbc` e o `.dbf` descompactado; apagada ao sair, inclusive em falha."""
    with tempfile.TemporaryDirectory(prefix="saude_datasus_") as pasta:
        yield Path(pasta)


def linhas_do_arquivo(
    cliente: ClienteFtp, arquivo: ArquivoFonte, nome: str, codificacao: str, pasta: Path
) -> Iterator[dict[str, Any]]:
    """Baixa, descompacta e devolve as linhas do arquivo em fluxo. O chamador apaga `pasta` ao terminar."""
    import datasus_dbc

    dbc = pasta / nome
    dbf = dbc.with_suffix(".dbf")
    cliente.baixar(arquivo.pasta, nome, dbc)
    datasus_dbc.decompress(str(dbc), str(dbf))
    dbc.unlink()
    return _linhas_dbf(dbf, codificacao)


def _competencia_da_linha(linha: dict[str, Any], campos: dict[str, str]) -> int | None:
    if "competencia" in campos:
        return _inteiro_ou_none(_texto(linha.get(campos["competencia"])))
    ano, mes = _inteiro_ou_none(linha.get(campos["ano"])), _inteiro_ou_none(linha.get(campos["mes"]))
    return ano * 100 + mes if ano is not None and mes is not None else None


def registros_dos_municipios(
    linhas: Iterator[dict[str, Any]],
    arquivo: ArquivoFonte,
    competencia: int,
    municipios: dict[str, str],
) -> dict[str, list[dict[str, Any]]]:
    """Filtra em fluxo as linhas dos municípios e da competência, já com os nomes do modelo comum.

    Só as colunas mapeadas na configuração saem daqui; qualquer outra (nome, CPF) é descartada com a linha.
    """
    campos = arquivo.campos
    colunas = {
        chave: coluna for chave, coluna in campos.items() if chave not in ("municipio", "competencia", "ano", "mes")
    }
    por_portal: dict[str, list[dict[str, Any]]] = {slug: [] for slug in municipios.values()}
    for linha in linhas:
        portal_slug = municipios.get(_texto(linha.get(campos["municipio"])))
        if portal_slug is not None and _competencia_da_linha(linha, campos) == competencia:
            por_portal[portal_slug].append({chave: linha.get(coluna) for chave, coluna in colunas.items()})
    return por_portal


def extrair_fonte(
    cliente: ClienteFtp,
    fonte: FonteDatasus,
    arquivo: ArquivoFonte,
    competencia: int,
    municipios: dict[str, str],
) -> dict[str, list[dict[str, Any]]]:
    """Registros por portal de uma fonte numa competência; sem arquivo na pasta é "sem dado" (listas vazias)."""
    por_portal: dict[str, list[dict[str, Any]]] = {slug: [] for slug in municipios.values()}
    nomes = arquivos_da_competencia(cliente.listar(arquivo.pasta), arquivo, fonte.uf, competencia)
    if not nomes:
        logger.info("%s %s: sem arquivo em %s para %d", fonte.uf, arquivo.pasta, fonte.host, competencia)
    for nome in nomes:
        with pasta_temporaria() as pasta:
            inicio = time.monotonic()
            parcial = registros_dos_municipios(
                linhas_do_arquivo(cliente, arquivo, nome, fonte.codificacao, pasta), arquivo, competencia, municipios
            )
            logger.info("%s lido em %.0f s", nome, time.monotonic() - inicio)
        por_portal = {slug: [*por_portal[slug], *parcial[slug]] for slug in por_portal}
    return por_portal


def extrair_competencia(
    cliente: ClienteFtp,
    fonte: FonteDatasus,
    competencia: int,
    municipios: dict[str, str],
    tipos_leito: dict[str, str],
    data_coleta: str | None = None,
) -> dict[str, dict[str, list[dict[str, Any]]]]:
    """Linhas agregadas por portal e por tabela do `raw_saude_rede` para uma competência da UF.

    As quatro fontes são lidas antes de qualquer gravação: falha em uma delas propaga e a competência não sai pela
    metade.
    """
    data_coleta = data_coleta or datetime.now(timezone.utc).isoformat()
    leitos, profissionais, sia, sih = (
        extrair_fonte(cliente, fonte, arquivo, competencia, municipios)
        for arquivo in (fonte.leitos, fonte.profissionais, fonte.sia, fonte.sih)
    )
    return {
        slug: {
            "leitos_competencia": agregar_leitos(slug, competencia, data_coleta, leitos[slug], tipos_leito),
            "profissionais_competencia": agregar_profissionais(
                slug, competencia, data_coleta, profissionais[slug], fonte.profissionais.valor_atende_sus or ""
            ),
            "sia_competencia": agregar_atendimentos_ambulatoriais(slug, competencia, data_coleta, sia[slug]),
            "sih_competencia": agregar_internacoes(slug, competencia, data_coleta, sih[slug]),
        }
        for slug in municipios.values()
    }


def competencias_do_pedido(
    competencias: list[int] | None, anos: list[int] | None, hoje: date | None = None
) -> list[int]:
    """`--competencias` ou `--years`; sem nenhum, as 4 últimas fechadas. Nada antes do corte do projeto."""
    escolhidas = competencias or (competencias_dos_anos(anos, hoje) if anos else competencias_recentes(hoje=hoje))
    corte = ano_inicial_historico()
    return [competencia for competencia in escolhidas if competencia // 100 >= corte]


def anos_da_populacao(competencias: list[int]) -> list[int]:
    """Anos das competências mais o anterior ao primeiro (referência quando o ano corrente ainda não tem população)."""
    anos = {competencia // 100 for competencia in competencias}
    return sorted({*anos, min(anos) - 1}) if anos else []


def main() -> None:
    from elt.core.config import PortalConfig
    from elt.core.db import get_engine
    from elt.extract.saude_rede import extrair_populacao
    from elt.load.saude_rede import load_saude_rede_tabela

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description="Extrai e carrega a rede e a produção de saúde do DATASUS")
    parser.add_argument("--portal", help="Slug de um portal (default: todos, agrupados por UF)")
    parser.add_argument("--competencias", nargs="+", type=int, help="Competências AAAAMM (default: 4 últimas fechadas)")
    parser.add_argument("--years", nargs="+", type=int, help="Todas as competências fechadas destes anos (backfill)")
    parser.add_argument("--dry-run", action="store_true", help="Extrai e agrega, sem gravar no banco")
    args = parser.parse_args()

    slugs = (
        [args.portal] if args.portal else sorted(p.stem for p in (CAMINHO_FONTES.parents[1] / "portals").glob("*.yml"))
    )
    portais = [PortalConfig.load(slug) for slug in slugs]
    fontes = {fonte.uf: fonte for fonte in carregar_fontes()}
    competencias = competencias_do_pedido(args.competencias, args.years)
    tipos_leito = carregar_tipos_leito()
    engine = None if args.dry_run else get_engine()

    for uf in sorted({portal.uf for portal in portais}):
        fonte = fontes.get(uf)
        do_estado = [portal for portal in portais if portal.uf == uf]
        if fonte is None:
            logger.warning("UF %s sem fonte do DATASUS configurada (ufs_sem_fonte): nada a extrair", uf)
            continue
        municipios = {codigo_municipio6(portal.cod_ibge): portal.slug for portal in do_estado}
        with ClienteFtp(fonte.host) as cliente:
            for competencia in competencias:
                dados = extrair_competencia(cliente, fonte, competencia, municipios, tipos_leito)
                for slug, tabelas in dados.items():
                    for tabela, linhas in tabelas.items():
                        logger.info("%s %d %s → %d linhas", slug, competencia, tabela, len(linhas))
                        if engine is not None and linhas:
                            load_saude_rede_tabela(engine, tabela, linhas, slug)
        # O mart usa o último ano anterior com população quando o ano da competência ainda não foi divulgado.
        anos = anos_da_populacao(competencias)
        for portal in do_estado:
            populacao = extrair_populacao(portal.slug, portal.cod_ibge, anos)
            logger.info("%s população → %d linhas", portal.slug, len(populacao))
            if engine is not None and populacao:
                load_saude_rede_tabela(engine, "populacao_residente", populacao, portal.slug)


if __name__ == "__main__":
    main()
