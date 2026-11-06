"""Testes do mart fct_emendas_estaduais_receita: pago do Estado contra a arrecadação em outras transferências."""

from pathlib import Path

import pytest
from sqlalchemy import text

from elt.tests.test_fct_emendas_estaduais import seed_conferencia, seed_emendas  # noqa: F401 - fixtures reutilizadas

_PORTAL = "porciuncula_prefeitura"
_SQL = Path(__file__).parents[1] / "transform/models/marts/fct_emendas_estaduais_receita.sql"

# (codigo, fontestn, valor): alínea corrente com total + detalhes em três níveis, alínea de capital só com total.
_RECEITAS = [
    ("1729.00.0.0.00.00", "", "10000,00"),
    ("1729.00.0.0.00.00", "1.540 1070", "10000,00"),
    ("1729.99.0.1.00.00", "", "10000,00"),
    ("1729.99.0.1.02.00", "", "10000,00"),
    ("2429.00.0.0.00.00", "", "5000,00"),
    ("2429.99.0.1.00.00", "", "5000,00"),
]


@pytest.fixture
def seed_receitas(conn):
    for codigo, fontestn, valor in _RECEITAS:
        conn.execute(
            text(
                """
                INSERT INTO raw_porciuncula_prefeitura.receita_orcamentaria
                    (ano, empresa, codigo, fontestn, nome, arrecadado_total, previsao_atualizada)
                VALUES ('2026', '99', :codigo, :fontestn, 'Receita sintetica', :valor, '0,00')
                """
            ),
            {"codigo": codigo, "fontestn": fontestn, "valor": valor},
        )
    conn.commit()
    yield
    conn.execute(text("DELETE FROM raw_porciuncula_prefeitura.receita_orcamentaria WHERE empresa = '99'"))
    conn.commit()


def _linha(conn):
    return conn.execute(
        text("SELECT * FROM analytics.fct_emendas_estaduais_receita WHERE portal_slug = :p AND ano = 2026"),
        {"p": _PORTAL},
    ).fetchone()


@pytest.mark.usefixtures("seed_conferencia", "seed_receitas")
def test_total_e_detalhe_da_alinea_nao_dobram_o_arrecadado(conn):
    linha = _linha(conn)
    assert linha.arrecadado_outras_transferencias_corrente == 10000  # alínea, sem somar subalíneas
    assert linha.arrecadado_outras_transferencias_capital == 5000
    assert linha.arrecadado_outras_transferencias == 15000
    assert linha.hierarquia_clara is True


@pytest.mark.usefixtures("seed_conferencia", "seed_receitas")
def test_pago_soma_so_emendas_que_chegam_a_prefeitura_no_arquivo_mais_recente(conn):
    linha = _linha(conn)
    # i1 (transferência especial, pago 25000 em 08/2026) e i2 (fundo a fundo, pago 0 em 04/2026);
    # fora: i3 execução direta, i4 OSC, i7 que saiu do arquivo mais recente, i6 de outra fonte/UF.
    assert linha.emendas_chegam_prefeitura == 2
    assert linha.pago_estado_informado == 25000
    assert linha.emendas_sem_pago_informado == 0
    assert (linha.posicao_ano_execucao_estado, linha.posicao_mes_execucao_estado) == (2026, 8)


@pytest.mark.usefixtures("seed_conferencia")
def test_sem_linha_de_alinea_a_hierarquia_nao_e_clara_e_o_arrecadado_fica_nulo(conn):
    linha = _linha(conn)
    assert linha.hierarquia_clara is False
    assert linha.arrecadado_outras_transferencias is None  # ausente não é zero


@pytest.mark.usefixtures("seed_emendas")
def test_emenda_sem_relatorio_conta_como_pago_nao_informado(conn):
    linha = _linha(conn)
    assert linha.pago_estado_informado is None
    assert linha.emendas_sem_pago_informado == linha.emendas_chegam_prefeitura


def test_modelo_nao_fixa_estado_nem_municipio():
    sql = _SQL.read_text().lower()
    for literal in ("porciuncula", "natividade", "'rj'", "'sp'", "'mg'", "'zz'"):
        assert literal not in sql
    assert sql.count("portal_slug") >= 6  # chaves de JOIN e GROUP BY
