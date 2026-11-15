"""Sincroniza o seed da média nacional do IDEB da rede pública (INEP, republicado pela API do IBGE).

Fonte: pesquisa 40 ("Índice de Desenvolvimento da Educação Básica") da API `servicodados.ibge.gov.br`. A localidade
"0" é o Brasil ("BR" devolve vazio). A API traz só a nota, com uma casa decimal; meta, Saeb e aprovação continuam
vindo da planilha municipal do INEP.

Uso: PYTHONPATH=. uv run --project elt python elt/scripts/sync_ibge_ideb_brasil.py [--from-year 2021]
"""

import argparse
import csv
import logging
from pathlib import Path
from typing import Any

import requests

logger = logging.getLogger(__name__)

IBGE_URL_IDEB_BRASIL = "https://servicodados.ibge.gov.br/api/v1/pesquisas/40/indicadores/{indicador}/resultados/0"
SEED_PATH = Path(__file__).resolve().parents[1] / "transform" / "seeds" / "seed_inep_ideb_brasil.csv"
DEFAULT_FROM_YEAR = 2021
REDE = "publica"

# "Ensino fundamental > <etapa> > Pública" da pesquisa 40.
INDICADOR_POR_ETAPA = {"anos_iniciais": 78187, "anos_finais": 78192}


class IbgeIdebError(RuntimeError):
    """Resposta inesperada ou nenhum ano com nota: o seed não é regravado."""


def serie_do_indicador(resposta: Any, indicador: int) -> dict[int, float]:
    """Valida o formato da resposta e devolve `{ano: nota}`; ano sem nota numérica fica de fora."""
    try:
        (item,) = [i for i in resposta if i["id"] == indicador]
        (resultado,) = item["res"]
        serie = resultado["res"]
        return {int(ano): float(valor) for ano, valor in serie.items() if _e_nota(valor)}
    except (TypeError, KeyError, ValueError, AttributeError) as err:
        raise IbgeIdebError(f"Resposta do IBGE fora do formato esperado para o indicador {indicador}") from err


def _e_nota(valor: Any) -> bool:
    if not isinstance(valor, str):
        return False
    try:
        float(valor)
    except ValueError:
        return False
    return True


def buscar_serie(indicador: int, timeout: int = 60) -> dict[int, float]:
    try:
        resp = requests.get(IBGE_URL_IDEB_BRASIL.format(indicador=indicador), timeout=timeout)
    except requests.RequestException as err:
        raise IbgeIdebError(f"API do IBGE indisponível para o indicador {indicador}: {err}") from err
    if resp.status_code != 200:
        raise IbgeIdebError(f"HTTP {resp.status_code} inesperado da API do IBGE para o indicador {indicador}")
    try:
        corpo = resp.json()
    except ValueError as err:
        raise IbgeIdebError(f"Resposta do IBGE não é JSON para o indicador {indicador}") from err
    return serie_do_indicador(corpo, indicador)


def montar_linhas(series_por_etapa: dict[str, dict[int, float]], from_year: int) -> list[dict[str, Any]]:
    return [
        {"ano": ano, "rede": REDE, "etapa_ensino": etapa, "nota_ideb": nota}
        for etapa, serie in sorted(series_por_etapa.items())
        for ano, nota in sorted(serie.items())
        if ano >= from_year
    ]


def sync_ibge_ideb_brasil(output_path: Path | str = SEED_PATH, from_year: int = DEFAULT_FROM_YEAR) -> int:
    series = {etapa: buscar_serie(indicador) for etapa, indicador in INDICADOR_POR_ETAPA.items()}
    linhas = montar_linhas(series, from_year)
    if not linhas:
        raise IbgeIdebError(f"IBGE sem nenhuma nota nacional do IDEB a partir de {from_year}")
    with Path(output_path).open("w", newline="", encoding="utf-8") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=["ano", "rede", "etapa_ensino", "nota_ideb"], lineterminator="\n")
        escritor.writeheader()
        escritor.writerows(linhas)
    logger.info("Seed %s gravado com %d linhas", output_path, len(linhas))
    return len(linhas)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description="Sincroniza o seed da média nacional do IDEB (rede pública)")
    parser.add_argument("--output", default=str(SEED_PATH), help="CSV de saída")
    parser.add_argument("--from-year", type=int, default=DEFAULT_FROM_YEAR, help="Primeiro ano gravado")
    args = parser.parse_args()
    try:
        sync_ibge_ideb_brasil(args.output, args.from_year)
    except IbgeIdebError as err:
        logger.error("Sincronização abortada, o seed não foi alterado: %s", err)
        raise SystemExit(1) from err


if __name__ == "__main__":
    main()
