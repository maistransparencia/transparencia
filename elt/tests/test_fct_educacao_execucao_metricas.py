"""Testes de integração para o mart analítico fct_educacao_execucao_metricas."""

from decimal import Decimal

import pytest
from sqlalchemy import text

ANO_ENCERRADO = 2025


@pytest.fixture
def seed_despesas_educacao(conn):
    """Insere despesas sintéticas (Função 12 e outra função) em Porciúncula e Natividade."""
    despesas = [
        ("porciuncula_prefeitura", "1", "1", "12", "Educação", "361", "1000.00", "900.00"),
        ("porciuncula_prefeitura", "1", "2", "12", "Educação", "364", "300.00", "200.00"),
        ("porciuncula_prefeitura", "1", "3", "10", "Saúde", "301", "500.00", "500.00"),
        ("natividade_prefeitura", "1", "1", "12", "Educação", "361", "800.00", "700.00"),
    ]
    for portal, empresa, numero, funcao, funcao_nome, subfuncao, empenhado, pago in despesas:
        conn.execute(
            text(
                f"""
                INSERT INTO raw_{portal}.despesas_gerais
                    (ano, empresa, numero, funcao, funcaonome, subfuncao, empenhado, pago)
                VALUES (:ano, :empresa, :numero, :funcao, :funcao_nome, :subfuncao, :empenhado, :pago)
                ON CONFLICT (ano, empresa, numero) DO UPDATE SET pago = EXCLUDED.pago
                """
            ),
            {
                "ano": ANO_ENCERRADO,
                "empresa": empresa,
                "numero": numero,
                "funcao": funcao,
                "funcao_nome": funcao_nome,
                "subfuncao": subfuncao,
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
            {"ano": ANO_ENCERRADO},
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
def test_fct_educacao_execucao_metricas_pago_por_aluno_sem_ensino_superior(conn):
    """Pago por aluno exclui a subfunção 364 e não mistura portais."""
    rows = {
        row[0]: row[1:]
        for row in conn.execute(
            text(
                """
                SELECT portal_slug, pago_educacao, pago_ensino_superior,
                       pago_sem_ensino_superior, total_matriculas_rede_municipal, pago_por_aluno
                FROM analytics.fct_educacao_execucao_metricas
                WHERE ano = :ano
                """
            ),
            {"ano": ANO_ENCERRADO},
        ).fetchall()
    }

    pago, superior, sem_superior, matriculas, pago_por_aluno = rows["porciuncula_prefeitura"]
    assert Decimal(str(pago)) >= Decimal("1100.00")
    assert Decimal(str(sem_superior)) == Decimal(str(pago)) - Decimal(str(superior))
    assert matriculas == 2290
    assert Decimal(str(pago_por_aluno)) == (Decimal(str(sem_superior)) / matriculas).quantize(Decimal("0.01"))

    assert rows["natividade_prefeitura"][3] == 1790
