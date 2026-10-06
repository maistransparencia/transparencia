"""Script de automação para baixar CSVs de Receitas do Portal da Transparência de Porciúncula/RJ."""

from elt.extract.fiorilli.receitas_downloader import run_receitas_csv_extraction

PORTAL_SLUG = "porciuncula_prefeitura"


def main() -> None:
    run_receitas_csv_extraction(PORTAL_SLUG)


if __name__ == "__main__":
    main()
