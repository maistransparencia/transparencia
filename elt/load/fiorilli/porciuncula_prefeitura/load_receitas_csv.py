"""Carrega arquivos CSV de receitas de Porciúncula no schema raw_porciuncula_prefeitura."""

from elt.load.fiorilli.receitas_loader import run_load_receitas_csv

PORTAL_SLUG = "porciuncula_prefeitura"


def main() -> None:
    run_load_receitas_csv(PORTAL_SLUG)


if __name__ == "__main__":
    main()
