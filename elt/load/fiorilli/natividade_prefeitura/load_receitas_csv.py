"""Carrega arquivos CSV de receitas de Natividade no schema raw_fiorilli."""

from elt.load.fiorilli.receitas_loader import run_load_receitas_csv

PORTAL_SLUG = "natividade_prefeitura"


def main() -> None:
    run_load_receitas_csv(PORTAL_SLUG)


if __name__ == "__main__":
    main()
