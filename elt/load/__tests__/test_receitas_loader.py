"""Testes unitários para o módulo de carga receitas_loader."""

from pathlib import Path

import pandas as pd
from elt.load.fiorilli.receitas_loader import TABLE_MAPPING, _sanitize_key


def test_sanitize_key():
    """Valida normalização de cabeçalhos de CSV com acentos e caracteres especiais."""
    assert _sanitize_key("Código") == "codigo"
    assert _sanitize_key("Prev. Inicial") == "prev_inicial"
    assert _sanitize_key("Arrec. Total") == "arrec_total"
    assert _sanitize_key("Fonte STN") == "fonte_stn"
    assert _sanitize_key("Extra") == "extra"


def test_table_mapping():
    """Valida mapeamento dos slugs de relatórios de receitas para as tabelas correspondentes."""
    assert TABLE_MAPPING["ReceitaOrcamentaria"] == "receita_orcamentaria"
    assert TABLE_MAPPING["ReceitaUniao"] == "receita_uniao"
    assert TABLE_MAPPING["ReceitaEstado"] == "receita_estado"
    assert TABLE_MAPPING["ReceitaExtraOrcamentaria"] == "receita_extra_orcamentaria"


def test_semicolon_csv_parsing(tmp_path: Path):
    """Valida leitura correta de CSV delimitado por ponto e vírgula contendo vírgulas em decimais e textos."""
    csv_file = tmp_path / "1_2021_ReceitaEstado.csv"
    csv_file.write_text(
        "Código;Especificação;Prev. Inicial;Prev. Atualizada;Arrec. Período;Arrec. Total\n"
        "1720.00.0.0.00.00;TRANSF.DOS EST. E DO DISTRITO FEDERAL E DE SUAS ENT.;10.000,00;10.000,00;0,00;0,00\n"
        "1728.00.0.0.00.00;TRANSFERÊNCIAS ESTADOS - ESPECÍFICAS DE ESTADOS, DF E MUNIC.;10.000,00;10.000,00;0,00;0,00\n"
        ";;10.000,00;10.000,00;;\n",
        encoding="utf-8",
    )

    df = pd.read_csv(csv_file, sep=";", dtype=str, keep_default_na=False, encoding="utf-8")
    assert len(df) == 3
    assert list(df.columns) == [
        "Código",
        "Especificação",
        "Prev. Inicial",
        "Prev. Atualizada",
        "Arrec. Período",
        "Arrec. Total",
    ]

    df.columns = [_sanitize_key(c) for c in df.columns]
    # Filtra linha totalizadora
    df = df[df["codigo"].str.strip().ne("")]
    assert len(df) == 2
    assert df.iloc[0]["codigo"] == "1720.00.0.0.00.00"
    assert df.iloc[1]["especificacao"] == "TRANSFERÊNCIAS ESTADOS - ESPECÍFICAS DE ESTADOS, DF E MUNIC."
