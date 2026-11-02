"""Extrator das matrículas da educação infantil e do ensino fundamental municipais (Censo Escolar, INEP) pela API do IBGE.

Fonte: pesquisa 13 ("Censo escolar - sinopse") da API `servicodados.ibge.gov.br`, a mesma que alimenta o Cidades@IBGE.
O IBGE republica a Sinopse Estatística da Educação Básica do INEP. A API é pública e devolve a série de todos os anos
de um município numa só chamada.

Total do município = matrículas da rede **municipal** na educação infantil (creche e pré-escola) mais o ensino
fundamental do 1º ao 9º ano (um indicador por ano de escolaridade). Não inclui ensino médio, EJA nem educação especial.
O Censo Escolar é a fotografia de maio do ano: não é o número de matrículas de hoje.

Ano sem valor é ignorado (nunca zero). Sem nenhum ano com dado, ou com resposta fora do formato, a carga termina com
erro e nada é gravado. O ano deve ter todas as séries preenchidas (creche, pré-escola e os 9 anos); ano incompleto não gera registro.
"""

import argparse
import logging
from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Any

import requests

from elt.core.config import PortalConfig
from elt.core.db import Connectable, get_engine
from elt.load.inep_censo import SCHEMA, ensure_inep_censo_table, load_inep_censo_matriculas

logger = logging.getLogger(__name__)

IBGE_URL_INDICADOR = (
    "https://servicodados.ibge.gov.br/api/v1/pesquisas/13/indicadores/{indicador}/resultados/{localidade}"
)

# Indicadores "Matrículas > <etapa> > Municipal" da pesquisa 13: creche (77883) e pré-escola (5904) na educação infantil;
# 1º ao 9º ano no ensino fundamental.
INDICADORES_INFANTIL_MUNICIPAL = (77883, 5904)
INDICADORES_FUNDAMENTAL_MUNICIPAL = (77941, 77945, 77949, 77953, 77957, 77961, 77965, 77969, 77973)


class InepCensoError(RuntimeError):
    """Resposta inesperada ou nenhum ano com dado: a carga termina sem gravar nada."""


@dataclass(frozen=True)
class MatriculasMunicipio:
    matriculas_educacao_infantil: int
    matriculas_ensino_fundamental: int


def codigo_localidade(cod_ibge: int) -> str:
    """O IBGE usa o código do município sem o dígito verificador (6 dígitos)."""
    return str(cod_ibge)[:6]


def serie_do_indicador(resposta: Any, indicador: int, localidade: str) -> dict[str, int]:
    """Valida o formato da resposta e devolve `{ano: matrículas}`; ano sem valor numérico fica de fora."""
    try:
        (item,) = [i for i in resposta if i["id"] == indicador]
        (resultado,) = [r for r in item["res"] if r["localidade"] == localidade]
        serie = resultado["res"]
        return {str(ano): int(valor) for ano, valor in serie.items() if isinstance(valor, str) and valor.isdigit()}
    except (TypeError, KeyError, ValueError, AttributeError) as err:
        raise InepCensoError(f"Resposta do IBGE fora do formato esperado para o indicador {indicador}") from err


def somar_series(
    series_infantil: list[dict[str, int]], series_fundamental: list[dict[str, int]]
) -> dict[int, MatriculasMunicipio]:
    """Soma as séries de cada etapa por ano do Censo; ano que falta em alguma série não entra."""
    todas = [*series_infantil, *series_fundamental]
    anos_completos = set.intersection(*(set(serie) for serie in todas)) if todas else set()
    return {
        int(ano): MatriculasMunicipio(
            matriculas_educacao_infantil=sum(serie[ano] for serie in series_infantil),
            matriculas_ensino_fundamental=sum(serie[ano] for serie in series_fundamental),
        )
        for ano in sorted(anos_completos)
    }


class InepCensoExtractor:
    def __init__(self, url_indicador: str = IBGE_URL_INDICADOR, timeout: int = 60) -> None:
        self.url_indicador = url_indicador
        self.timeout = timeout

    def serie_indicador(self, indicador: int, localidade: str) -> dict[str, int]:
        try:
            resp = requests.get(
                self.url_indicador.format(indicador=indicador, localidade=localidade), timeout=self.timeout
            )
        except requests.RequestException as err:
            raise InepCensoError(f"API do IBGE indisponível para o indicador {indicador}: {err}") from err
        if resp.status_code != 200:
            raise InepCensoError(f"HTTP {resp.status_code} inesperado da API do IBGE para o indicador {indicador}")
        try:
            corpo = resp.json()
        except ValueError as err:
            raise InepCensoError(f"Resposta do IBGE não é JSON para o indicador {indicador}") from err
        return serie_do_indicador(corpo, indicador, localidade)

    def extrair_portal(self, portal: PortalConfig, anos: list[int]) -> list[dict[str, Any]]:
        """Matrículas do portal nos anos pedidos. Erro se nenhum ano tiver dado."""
        localidade = codigo_localidade(portal.cod_ibge)
        series_infantil = [self.serie_indicador(i, localidade) for i in INDICADORES_INFANTIL_MUNICIPAL]
        series_fundamental = [self.serie_indicador(i, localidade) for i in INDICADORES_FUNDAMENTAL_MUNICIPAL]
        por_ano = somar_series(series_infantil, series_fundamental)
        coletado_em = datetime.now(timezone.utc).isoformat()
        linhas = [
            {
                "portal_slug": portal.slug,
                "ano": ano,
                "codigo_municipio_ibge": portal.cod_ibge,
                "matriculas_educacao_infantil": por_ano[ano].matriculas_educacao_infantil,
                "matriculas_ensino_fundamental": por_ano[ano].matriculas_ensino_fundamental,
                "coletado_em": coletado_em,
            }
            for ano in anos
            if ano in por_ano
            and por_ano[ano].matriculas_educacao_infantil + por_ano[ano].matriculas_ensino_fundamental > 0
        ]
        sem_dado = [ano for ano in anos if ano not in {linha["ano"] for linha in linhas}]
        if sem_dado:
            logger.warning(
                "Censo Escolar sem matrículas da educação infantil e do fundamental municipais de %s em %s",
                portal.slug,
                sem_dado,
            )
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
    parser = argparse.ArgumentParser(
        description="Extrai e carrega matrículas da educação infantil e do fundamental municipais (Censo Escolar)"
    )
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
