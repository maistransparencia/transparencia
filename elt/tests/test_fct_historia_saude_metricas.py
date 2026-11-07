"""Testes de integração da origem das receitas em fct_historia_saude_metricas."""

from decimal import Decimal

import pytest
from sqlalchemy import text

_ANO = 2032

# (empresa, codigo, valor): fundo de saúde é a empresa 2 do portal de Porciúncula
_LINHAS = [
    ("2", "1000.00.0.0.00.00", "850,00"),
    # Plano de contas anterior a 2022 e transferência especial entram como União
    ("2", "1718.03.1.1.00.00", "500,00"),
    ("2", "1719.57.0.1.02.00", "200,00"),
    ("2", "1728.03.1.1.00.00", "100,00"),
    ("2", "1321.01.0.1.00.00", "50,00"),
]


@pytest.fixture
def seed_receitas(conn):
    def limpar():
        for tabela in ("receita_orcamentaria", "despesas_gerais"):
            conn.execute(text(f"DELETE FROM raw_porciuncula_prefeitura.{tabela} WHERE ano = :ano"), {"ano": str(_ANO)})
        conn.commit()

    limpar()
    conn.execute(
        text(
            """
            INSERT INTO raw_porciuncula_prefeitura.despesas_gerais
                (ano, empresa, numero, funcao, funcaonome, empenhado, pago)
            VALUES (:ano, '2', 'historia-saude-1', '10', 'Saude', '100,00', '50,00')
            ON CONFLICT (ano, empresa, numero) DO UPDATE SET pago = EXCLUDED.pago
            """
        ),
        {"ano": str(_ANO)},
    )
    for empresa, codigo, valor in _LINHAS:
        conn.execute(
            text(
                """
                INSERT INTO raw_porciuncula_prefeitura.receita_orcamentaria
                    (ano, empresa, codigo, fontestn, nome, arrecadado_total, previsao_atualizada)
                VALUES (:ano, :empresa, :codigo, '', 'Receita sintetica', :valor, '0,00')
                """
            ),
            {"ano": str(_ANO), "empresa": empresa, "codigo": codigo, "valor": valor},
        )
    conn.commit()
    yield
    limpar()


@pytest.mark.usefixtures("seed_receitas")
def test_receita_por_esfera_vem_da_natureza(conn):
    row = conn.execute(
        text(
            """
            SELECT receita_uniao_saude, receita_estado_saude, receita_outras_saude
            FROM analytics.fct_historia_saude_metricas
            WHERE portal_slug = 'porciuncula_prefeitura' AND ano = :ano
            """
        ),
        {"ano": _ANO},
    ).one()
    assert row.receita_uniao_saude == Decimal("700.00")
    assert row.receita_estado_saude == Decimal("100.00")
    assert row.receita_outras_saude == Decimal("50.00")
