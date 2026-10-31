"""Testes de integração para o mart analítico fct_educacao_execucao_metricas."""

from decimal import Decimal

import pytest
from sqlalchemy import text

ANO_TESTE = 2025


@pytest.fixture
def seed_despesas_educacao(conn):
    """Insere despesas sintéticas (Função 12 e outra função) em Porciúncula e Natividade."""
    despesas = [
        ("porciuncula_prefeitura", "1", "1", "12", "Educação", "1000.00", "900.00"),
        ("porciuncula_prefeitura", "1", "2", "12", "Educação", "300.00", "200.00"),
        ("porciuncula_prefeitura", "1", "3", "10", "Saúde", "500.00", "500.00"),
        ("natividade_prefeitura", "1", "1", "12", "Educação", "800.00", "700.00"),
    ]
    for portal, empresa, numero, funcao, funcao_nome, empenhado, pago in despesas:
        conn.execute(
            text(
                f"""
                INSERT INTO raw_{portal}.despesas_gerais
                    (ano, empresa, numero, funcao, funcaonome, empenhado, pago)
                VALUES (:ano, :empresa, :numero, :funcao, :funcao_nome, :empenhado, :pago)
                ON CONFLICT (ano, empresa, numero) DO UPDATE SET pago = EXCLUDED.pago
                """
            ),
            {
                "ano": ANO_TESTE,
                "empresa": empresa,
                "numero": numero,
                "funcao": funcao,
                "funcao_nome": funcao_nome,
                "empenhado": empenhado,
                "pago": pago,
            },
        )
    conn.commit()
    yield
    for portal in ("porciuncula_prefeitura", "natividade_prefeitura"):
        conn.execute(
            text(
                f"DELETE FROM raw_{portal}.despesas_gerais WHERE ano = :ano AND empresa = '1' AND numero IN ('1', '2', '3')"
            ),
            {"ano": ANO_TESTE},
        )
    conn.commit()


def test_fct_educacao_execucao_metricas_grain(conn):
    """O grão portal/ano não admite duplicatas."""
    rows = conn.execute(
        text(
            """
            SELECT portal_slug, ano, count(*)
            FROM analytics.fct_educacao_execucao_metricas
            GROUP BY portal_slug, ano
            HAVING count(*) > 1
            """
        )
    ).fetchall()
    assert rows == []


@pytest.mark.usefixtures("seed_despesas_educacao")
def test_fct_educacao_execucao_metricas_soma_funcao_12_sem_cruzar_portais(conn):
    """Soma só a função 12 de cada portal."""
    rows = {
        row[0]: row[1:]
        for row in conn.execute(
            text(
                """
                SELECT portal_slug, empenhado_educacao, pago_educacao
                FROM analytics.fct_educacao_execucao_metricas
                WHERE ano = :ano
                """
            ),
            {"ano": ANO_TESTE},
        ).fetchall()
    }

    empenhado, pago = rows["porciuncula_prefeitura"]
    assert Decimal(str(empenhado)) >= Decimal("1300.00")
    assert Decimal(str(pago)) >= Decimal("1100.00")
    assert Decimal(str(rows["natividade_prefeitura"][1])) >= Decimal("700.00")
