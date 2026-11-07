"""CLI: extract raw data from portal API → data/raw_runs/<timestamp>/."""

import argparse
import csv
import importlib
import json
import logging
from datetime import date, datetime
from pathlib import Path
from typing import Any, cast

from elt.core.config import PortalConfig
from elt.extract.base import EndpointConfig

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def _log_failed(run_dir: Path, listagem: str, empresa: str, year: int, error: Exception) -> None:
    log_file = run_dir / "failed_requests.csv"
    file_exists = log_file.exists()
    with open(log_file, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(["timestamp", "listagem", "empresa", "year", "error"])
        writer.writerow([datetime.now().isoformat(), listagem, empresa, year, str(error)])


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract raw data from portal API")
    parser.add_argument("--portal", required=True, help="Portal slug (e.g. porciuncula_prefeitura)")
    parser.add_argument("--years", nargs="+", type=int, help="Years to extract (default: all since ano_inicial)")
    parser.add_argument(
        "--competencias",
        nargs="+",
        type=int,
        help="Competências AAAAMM de SIA/SIH (default: as 4 últimas fechadas). Backfill manual, em partes.",
    )
    parser.add_argument("--only", help="Extract only this listagem endpoint")
    args = parser.parse_args()

    portal = PortalConfig.load(args.portal)
    try:
        mod = importlib.import_module(f"elt.extract.{portal.provider}.{portal.slug}.api_endpoints")
        endpoints = cast(list[EndpointConfig], mod.ENDPOINT_CONFIGS)
    except ModuleNotFoundError:
        logger.info(
            "Módulo de endpoints específico para %s não encontrado. Usando fallback genérico Fiorilli.",
            portal.slug,
        )
        from elt.extract.fiorilli.api_endpoints import get_endpoint_configs

        endpoints = get_endpoint_configs(
            base_url=portal.base_host,
            portal_slug=portal.slug,
            cod_ibge=portal.cod_ibge,
            ano_inicial=portal.ano_inicial,
        )

    years = args.years or list(range(portal.ano_inicial, date.today().year + 1))

    siconfi_keys = {"siconfi", "siconfi_msc", "siconfi_msc_patrimonial"}
    pncp_keys = {"pncp", "pncp_compras", "pncp_itens"}
    obrasgov_keys = {"obrasgov"}
    farmacia_sus_keys = {"farmacia_sus"}
    saude_rede_keys = {"saude_rede", "saude_producao"}
    if args.only:
        valid = (
            [e.listagem for e in endpoints]
            + list(siconfi_keys)
            + list(pncp_keys)
            + list(obrasgov_keys)
            + list(farmacia_sus_keys)
            + list(saude_rede_keys)
        )
        if args.only not in valid:
            raise ValueError(f"Unknown listagem: {args.only!r}. Valid: {valid}")
        endpoints = [e for e in endpoints if e.listagem == args.only]

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_dir = Path(f"data/raw_runs/{portal.slug}/{timestamp}")
    run_dir.mkdir(parents=True, exist_ok=True)
    logger.info("Saving raw data to %s", run_dir)

    entities = portal.load_orgaos()

    for config in endpoints:
        effective_base_url = config.base_url or portal.base_host
        try:
            extractor = config.extractor_cls(
                config.base_path,
                config.listagem,
                config.table,
                [],
                config.extra,
                None,
                base_url=effective_base_url,
                portal_slug=portal.slug,
            )
        except TypeError:
            extractor = config.extractor_cls(
                config.base_path,
                config.listagem,
                config.table,
                [],
                config.extra,
                None,
                base_url=effective_base_url,
            )
        for empresa_id, empresa_name in entities.items():
            for year in years:
                try:
                    rows = extractor.extract(empresa_id, year)
                    out = run_dir / config.table / f"{empresa_id}_{year}.json"
                    out.parent.mkdir(parents=True, exist_ok=True)
                    out.write_text(json.dumps(rows, ensure_ascii=False, indent=2))
                    logger.info(
                        "Extracted %s / %s / %d → %d rows",
                        config.listagem,
                        empresa_name,
                        year,
                        len(rows),
                    )
                except Exception as exc:
                    logger.warning("Failed: %s / %s / %d: %s", config.listagem, empresa_name, year, exc)
                    _log_failed(run_dir, config.listagem, empresa_name, year, exc)

    if not args.only or args.only in siconfi_keys:
        from elt.extract.siconfi_msc import SiconfiMscExtractor

        logger.info("Extracting SICONFI MSC Patrimonial for IBGE %s...", portal.cod_ibge)
        siconfi_extractor = SiconfiMscExtractor()
        for year in years:
            try:
                siconfi_rows = siconfi_extractor.extract_ano(portal.cod_ibge, year)
                out = run_dir / "siconfi_msc_patrimonial" / f"{portal.cod_ibge}_{year}.json"
                out.parent.mkdir(parents=True, exist_ok=True)
                out.write_text(json.dumps(siconfi_rows, ensure_ascii=False, indent=2))
                logger.info(
                    "Extracted siconfi_msc_patrimonial / %s / %d → %d rows",
                    portal.slug,
                    year,
                    len(siconfi_rows),
                )
            except Exception as exc:
                logger.warning("Failed: siconfi_msc_patrimonial / %s / %d: %s", portal.slug, year, exc)
                _log_failed(run_dir, "siconfi_msc_patrimonial", str(portal.cod_ibge), year, exc)

    if not args.only or args.only in pncp_keys:
        from elt.extract.pncp import extract_and_load_pncp

        portal_cnpj = None
        try:
            with open(portal.orgaos_csv_path, newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for r in reader:
                    if r.get("empresa_id") == str(portal.empresa_padrao):
                        portal_cnpj = r.get("cnpj")
                        break
        except Exception:
            pass

        logger.info("Extracting PNCP data for %s (CNPJ: %s)...", portal.slug, portal_cnpj or "default")
        try:
            pncp_kwargs: dict[str, Any] = {
                "years": years,
                "run_dir": run_dir,
                "save_raw": True,
                "db": None,
            }
            if portal_cnpj:
                pncp_kwargs["cnpj"] = portal_cnpj
            extract_and_load_pncp(**pncp_kwargs)
            logger.info("Extracted PNCP data for %s", portal.slug)
        except Exception as exc:
            logger.warning("Failed: pncp / %s: %s", portal.slug, exc)
            _log_failed(run_dir, "pncp", portal.slug, years[-1] if years else 0, exc)

    if not args.only or args.only in obrasgov_keys:
        from elt.extract.obrasgov import ObrasGovExtractor

        logger.info("Extracting ObrasGov data for %s (cod_ibge: %s)...", portal.slug, portal.cod_ibge)
        try:
            obrasgov_extractor = ObrasGovExtractor()
            obrasgov_data = obrasgov_extractor.extract(portal_slug=portal.slug, cod_ibge=portal.cod_ibge)
            obrasgov_dir = run_dir / "obrasgov"
            obrasgov_dir.mkdir(parents=True, exist_ok=True)
            for key, rows in obrasgov_data.items():
                out = obrasgov_dir / f"{key}.json"
                out.write_text(json.dumps(rows, ensure_ascii=False, indent=2))
                logger.info("Extracted obrasgov / %s / %s → %d rows", portal.slug, key, len(rows))
        except Exception as exc:
            logger.warning("Failed: obrasgov / %s: %s", portal.slug, exc)
            _log_failed(run_dir, "obrasgov", portal.slug, years[-1] if years else 0, exc)

    if not args.only or args.only in farmacia_sus_keys:
        from elt.extract.farmacia_sus import FarmaciaSusExtractor

        logger.info("Extracting Farmácia SUS data for %s (cod_ibge: %s)...", portal.slug, portal.cod_ibge)
        try:
            farmacia_data = FarmaciaSusExtractor().extract(portal_slug=portal.slug, cod_ibge=portal.cod_ibge)
            farmacia_dir = run_dir / "farmacia_sus"
            farmacia_dir.mkdir(parents=True, exist_ok=True)
            for key, rows in farmacia_data.items():
                out = farmacia_dir / f"{key}.json"
                out.write_text(json.dumps(rows, ensure_ascii=False, indent=2))
                logger.info("Extracted farmacia_sus / %s / %s → %d rows", portal.slug, key, len(rows))
        except Exception as exc:
            logger.warning("Failed: farmacia_sus / %s: %s", portal.slug, exc)
            _log_failed(run_dir, "farmacia_sus", portal.slug, years[-1] if years else 0, exc)

    # saude_rede e saude_producao só rodam quando pedidas por --only: cada uma leva minutos por portal e a
    # cadência delas é da Story 23.8. Assim a carga diária (sem --only) não as puxa.
    if args.only == "saude_rede":
        from elt.extract.saude_rede import SaudeRedeExtractor

        # Sem --years busca só o ano atual (cada ano de profissionais leva minutos); anos fechados: --years.
        anos_saude = args.years or [date.today().year]
        logger.info(
            "Extracting rede de saúde for %s (cod_ibge: %s, anos %s)...", portal.slug, portal.cod_ibge, anos_saude
        )
        saude_dir = run_dir / "saude_rede"
        saude_dir.mkdir(parents=True, exist_ok=True)

        def gravar_saude_rede(dados: dict[str, list[dict[str, Any]]]) -> None:
            for key, rows in dados.items():
                (saude_dir / f"{key}.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2))

        try:
            saude_data = SaudeRedeExtractor().extract(
                portal_slug=portal.slug,
                cod_ibge=portal.cod_ibge,
                anos=anos_saude,
                ao_concluir_ano=gravar_saude_rede,
            )
            gravar_saude_rede(saude_data)
            for key, rows in saude_data.items():
                logger.info("Extracted saude_rede / %s / %s → %d rows", portal.slug, key, len(rows))
        except Exception as exc:
            logger.warning("Failed: saude_rede / %s: %s", portal.slug, exc)
            _log_failed(run_dir, "saude_rede", portal.slug, years[-1] if years else 0, exc)

    if args.only == "saude_producao":
        from elt.extract.saude_rede import SaudeRedeExtractor, competencias_recentes

        competencias_saude = args.competencias or competencias_recentes()
        logger.info("Extracting produção SUS (SIA/SIH) for %s, competências %s...", portal.slug, competencias_saude)
        try:
            producao_data = SaudeRedeExtractor().extract_producao(
                portal_slug=portal.slug, cod_ibge=portal.cod_ibge, competencias=competencias_saude
            )
            producao_dir = run_dir / "saude_rede"
            producao_dir.mkdir(parents=True, exist_ok=True)
            for key, rows in producao_data.items():
                out = producao_dir / f"{key}.json"
                out.write_text(json.dumps(rows, ensure_ascii=False, indent=2))
                logger.info("Extracted saude_producao / %s / %s → %d rows", portal.slug, key, len(rows))
        except Exception as exc:
            logger.warning("Failed: saude_producao / %s: %s", portal.slug, exc)
            _log_failed(run_dir, "saude_producao", portal.slug, years[-1] if years else 0, exc)

    logger.info("Extraction complete → %s", run_dir)


if __name__ == "__main__":
    main()
