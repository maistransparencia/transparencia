"""Carrega arquivos CSV de receitas de Natividade no schema raw_natividade_prefeitura."""

from elt.load.fiorilli.receitas_loader import run_load_receitas_csv

PORTAL_SLUG = "natividade_prefeitura"


def main() -> None:
    run_load_receitas_csv(PORTAL_SLUG)


if __name__ == "__main__":
    main()
