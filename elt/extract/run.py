"""CLI: extract raw data from portal API → data/raw_runs/<timestamp>/."""

import argparse
import csv
import importlib
import json
import logging
from datetime import date, datetime
from pathlib import Path
from typing import cast

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
    parser.add_argument("--only", help="Extract only this listagem endpoint")
    args = parser.parse_args()

    portal = PortalConfig.load(args.portal)
    mod = importlib.import_module(f"elt.extract.{portal.slug}.api_endpoints")
    endpoints = cast(list[EndpointConfig], mod.ENDPOINT_CONFIGS)

    years = args.years or list(range(portal.ano_inicial, date.today().year + 1))

    siconfi_keys = {"siconfi", "siconfi_msc", "siconfi_msc_patrimonial"}
    if args.only:
        valid = [e.listagem for e in endpoints] + list(siconfi_keys)
        if args.only not in valid:
            raise ValueError(f"Unknown listagem: {args.only!r}. Valid: {valid}")
        endpoints = [e for e in endpoints if e.listagem == args.only]

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_dir = Path(f"data/raw_runs/{portal.slug}/{timestamp}")
    run_dir.mkdir(parents=True, exist_ok=True)
    logger.info("Saving raw data to %s", run_dir)

    entities = portal.load_orgaos()

    for config in endpoints:
        extractor = config.extractor_cls(
            config.base_path,
            config.listagem,
            config.table,
            [],
            config.extra,
            None,
            base_url=config.base_url,
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

    logger.info("Extraction complete → %s", run_dir)


if __name__ == "__main__":
    main()
