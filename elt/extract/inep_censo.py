"""Extrator das matrículas do Censo Escolar (INEP) por município.

Fonte: microdados do Censo Escolar, `download.inep.gov.br/dados_abertos/microdados_censo_escolar_<ano>.zip`
(URL estável por ano; leiaute `microdados_ed_basica_<ano>.csv`, separador `;`, latin1). O zip é baixado em
streaming para um arquivo temporário e o CSV é lido linha a linha, sem carregá-lo inteiro na memória.

Total do município = soma de `QT_MAT_BAS` (educação básica) das escolas municipais
(`TP_DEPENDENCIA` = 3) em atividade (`TP_SITUACAO_FUNCIONAMENTO` = 1) com `CO_MUNICIPIO` igual ao `cod_ibge`.
O Censo Escolar é a fotografia de maio do ano: não é o número de matrículas de hoje.

Ano ainda não publicado (HTTP 404) é ignorado com aviso. Sem nenhum ano com dado, a carga termina com
erro e nada é gravado. Município sem escola municipal no ano fica sem registro (nunca zero).
"""

import argparse
import csv
import io
import logging
import tempfile
import zipfile
from dataclasses import dataclass
from datetime import date, datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import IO, Any

import certifi
import requests

from elt.core.config import PortalConfig
from elt.core.db import Connectable, get_engine
from elt.load.inep_censo import SCHEMA, ensure_inep_censo_table, load_inep_censo_matriculas

logger = logging.getLogger(__name__)

INEP_URL_POR_ANO = "https://download.inep.gov.br/dados_abertos/microdados_censo_escolar_{ano}.zip"
INEP_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)

# O servidor do INEP envia só o certificado folha, sem o intermediário da RNP (cadeia incompleta): a verificação
# TLS falha com o repositório de certificados padrão. O intermediário público (obtido pelo AIA do certificado do
# servidor) é anexado aos certificados raiz, e a verificação continua ligada.
CERTIFICADO_INTERMEDIARIO = Path(__file__).parent / "certs" / "rnp_icpedu_gr46_ov_tls_ca_2025.pem"

DEPENDENCIA_MUNICIPAL = "3"
SITUACAO_EM_ATIVIDADE = "1"
COLUNAS_OBRIGATORIAS = ("CO_MUNICIPIO", "TP_DEPENDENCIA", "TP_SITUACAO_FUNCIONAMENTO", "QT_MAT_BAS")
CODIFICACAO_CSV = "latin1"
SEPARADOR_CSV = ";"
TAMANHO_BLOCO_DOWNLOAD = 1024 * 1024


class InepCensoError(RuntimeError):
    """Resposta inesperada, arquivo fora do leiaute ou nenhum ano com dado: a carga termina sem gravar nada."""


@dataclass(frozen=True)
class MatriculasMunicipio:
    matriculas_educacao_basica: int
    quantidade_escolas: int


def agregar_matriculas(linhas: IO[str], cod_ibge: int) -> MatriculasMunicipio | None:
    """Soma `QT_MAT_BAS` das escolas municipais em atividade do município; `None` se não houver nenhuma escola."""
    leitor = csv.DictReader(linhas, delimiter=SEPARADOR_CSV)
    ausentes = [c for c in COLUNAS_OBRIGATORIAS if c not in (leitor.fieldnames or [])]
    if ausentes:
        raise InepCensoError(f"Colunas ausentes no CSV do Censo Escolar: {', '.join(ausentes)}")

    codigo = str(cod_ibge)
    do_municipio = (
        linha
        for linha in leitor
        if linha["CO_MUNICIPIO"].strip() == codigo
        and linha["TP_DEPENDENCIA"].strip() == DEPENDENCIA_MUNICIPAL
        and linha["TP_SITUACAO_FUNCIONAMENTO"].strip() == SITUACAO_EM_ATIVIDADE
    )
    try:
        totais = [int((linha["QT_MAT_BAS"] or "").strip() or 0) for linha in do_municipio]
    except (ValueError, AttributeError) as err:
        raise InepCensoError("Valor inválido em QT_MAT_BAS no CSV do Censo Escolar") from err
    if not totais:
        return None
    return MatriculasMunicipio(matriculas_educacao_basica=sum(totais), quantidade_escolas=len(totais))


def ler_matriculas_do_zip(caminho_zip: Path, ano: int, cod_ibge: int) -> MatriculasMunicipio | None:
    """Abre o CSV de escolas dentro do zip e agrega o município."""
    nome_csv = f"microdados_ed_basica_{ano}.csv"
    try:
        with zipfile.ZipFile(caminho_zip) as arquivo:
            membros = [m for m in arquivo.namelist() if Path(m).name.lower() == nome_csv]
            if not membros:
                raise InepCensoError(f"{nome_csv} não encontrado no zip do Censo Escolar {ano}")
            with arquivo.open(membros[0]) as binario:
                texto = io.TextIOWrapper(binario, encoding=CODIFICACAO_CSV, newline="")
                return agregar_matriculas(texto, cod_ibge)
    except zipfile.BadZipFile as err:
        raise InepCensoError(f"Zip do Censo Escolar {ano} inválido") from err


class InepCensoExtractor:
    def __init__(self, url_por_ano: str = INEP_URL_POR_ANO, timeout: int = 120) -> None:
        self.url_por_ano = url_por_ano
        self.timeout = timeout
        self._bundle_tls = self._montar_bundle_tls()

    @staticmethod
    @lru_cache(maxsize=1)
    def _montar_bundle_tls() -> str:
        """Raízes do certifi + intermediário do INEP, num arquivo temporário (um por processo) usado em `verify`."""
        bundle = tempfile.NamedTemporaryFile("w", suffix=".pem", delete=False, encoding="ascii")
        with bundle:
            bundle.write(Path(certifi.where()).read_text(encoding="ascii"))
            bundle.write("\n")
            bundle.write(CERTIFICADO_INTERMEDIARIO.read_text(encoding="ascii"))
        return bundle.name

    def baixar_zip(self, ano: int, destino: IO[bytes]) -> bool:
        """Baixa o zip do ano em streaming. Devolve `False` em 404 (ano ainda não publicado)."""
        try:
            with requests.get(
                self.url_por_ano.format(ano=ano),
                headers={"User-Agent": INEP_USER_AGENT},
                stream=True,
                timeout=self.timeout,
                verify=self._bundle_tls,
            ) as resp:
                if resp.status_code == 404:
                    return False
                if resp.status_code != 200:
                    raise InepCensoError(f"HTTP {resp.status_code} inesperado do INEP para o Censo {ano}")
                for bloco in resp.iter_content(chunk_size=TAMANHO_BLOCO_DOWNLOAD):
                    destino.write(bloco)
        except requests.RequestException as err:
            raise InepCensoError(f"INEP indisponível para o Censo {ano}: {err}") from err
        return True

    def matriculas_do_ano(self, ano: int, cod_ibge: int) -> MatriculasMunicipio | None:
        with tempfile.NamedTemporaryFile(suffix=".zip") as arquivo:
            if not self.baixar_zip(ano, arquivo):
                logger.warning("Censo Escolar %s ainda não publicado pelo INEP (404); ano ignorado", ano)
                return None
            arquivo.flush()
            return ler_matriculas_do_zip(Path(arquivo.name), ano, cod_ibge)

    def extrair_portal(self, portal: PortalConfig, anos: list[int]) -> list[dict[str, Any]]:
        """Matrículas do portal por ano. Erro se nenhum ano tiver dado."""
        coletado_em = datetime.now(timezone.utc).isoformat()
        por_ano = {ano: self.matriculas_do_ano(ano, portal.cod_ibge) for ano in anos}
        for ano, total in por_ano.items():
            if total is None:
                logger.warning("Censo Escolar %s sem escola municipal de %s; nada gravado para o ano", ano, portal.slug)
        linhas = [
            {
                "portal_slug": portal.slug,
                "ano": ano,
                "codigo_municipio_ibge": portal.cod_ibge,
                "matriculas_educacao_basica": total.matriculas_educacao_basica,
                "quantidade_escolas": total.quantidade_escolas,
                "coletado_em": coletado_em,
            }
            for ano, total in por_ano.items()
            if total is not None
        ]
        if not linhas:
            raise InepCensoError(f"Censo Escolar sem nenhum dado para {portal.slug} nos anos {anos}")
        return linhas


def extract_and_load_inep_censo(
    portal: PortalConfig,
    years: list[int] | None = None,
    db: Connectable | None = None,
    extractor: InepCensoExtractor | None = None,
) -> int:
    """Extrai as matrículas do portal e grava no raw; sem `db`, só extrai. Erro não grava nada."""
    anos = years or list(range(portal.ano_inicial, date.today().year + 1))
    linhas = (extractor or InepCensoExtractor()).extrair_portal(portal, anos)
    if db is None:
        return len(linhas)
    ensure_inep_censo_table(db, SCHEMA)
    return load_inep_censo_matriculas(db, linhas, schema=SCHEMA)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description="Extrai e carrega matrículas do Censo Escolar (INEP)")
    parser.add_argument("--portal", required=True, help="Slug do portal (ex: porciuncula_prefeitura)")
    parser.add_argument("--years", nargs="+", type=int, help="Anos (default: ano_inicial até o ano corrente)")
    parser.add_argument("--dry-run", action="store_true", help="Só extrai e valida, sem gravar no banco")
    args = parser.parse_args()

    portal = PortalConfig.load(args.portal)
    try:
        total = extract_and_load_inep_censo(portal, args.years, db=None if args.dry_run else get_engine())
    except InepCensoError as err:
        logger.error("Carga do Censo Escolar abortada, nada foi gravado: %s", err)
        raise SystemExit(1) from err
    logger.info("Censo Escolar %s: %d registros %s", portal.slug, total, "validados" if args.dry_run else "gravados")


if __name__ == "__main__":
    main()
