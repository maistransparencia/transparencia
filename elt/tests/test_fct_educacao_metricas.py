"""Testes de integração para o modelo mart analítico fct_educacao_metricas."""

from decimal import Decimal

from sqlalchemy import text


def test_fct_educacao_metricas_materialization_and_grain(conn):
    """Valida materialização como tabela física e unicidade estrita do grão."""
    rows = conn.execute(
        text(
            """
            SELECT portal_slug, ano, etapa_ensino, count(*)
            FROM analytics.fct_educacao_metricas
            GROUP BY portal_slug, ano, etapa_ensino
            HAVING count(*) > 1
            """
        )
    ).fetchall()
    assert len(rows) == 0, f"Duplicatas encontradas no grão analítico: {rows}"

    total_count = conn.execute(text("SELECT count(*) FROM analytics.fct_educacao_metricas")).scalar()
    assert total_count > 0, "A tabela fct_educacao_metricas não deve estar vazia."


def test_fct_educacao_metricas_porciuncula_growth_and_financials(conn):
    """Valida o salto histórico de +1,4 ponto no IDEB 2025 de Porciúncula."""
    rows = conn.execute(
        text(
            """
            SELECT
                ano,
                etapa_ensino,
                nota_ideb,
                meta_ideb,
                atingiu_meta_flag,
                crescimento_pontos_ideb,
                saeb_matematica,
                variacao_saeb_matematica,
                saeb_lingua_portuguesa,
                variacao_saeb_portugues
            FROM analytics.fct_educacao_metricas
            WHERE portal_slug = 'porciuncula_prefeitura'
              AND etapa_ensino = 'anos_iniciais'
            ORDER BY ano
            """
        )
    ).fetchall()

    assert len(rows) == 3, f"Esperados 3 ciclos para Porciúncula Anos Iniciais, obtidos {len(rows)}"

    # Ciclo 2021 (Primeiro ciclo da série analisada)
    r2021 = rows[0]
    assert r2021[0] == 2021
    assert r2021[1] == "anos_iniciais"
    assert Decimal(str(r2021[2])) == Decimal("5.2")
    assert Decimal(str(r2021[3])) == Decimal("6.4")
    assert r2021[4] is False  # meta não atingida (5.2 < 6.4)
    assert r2021[5] is None  # sem ciclo anterior via LAG

    # Ciclo 2023 (Retração pós-pandemia)
    r2023 = rows[1]
    assert r2023[0] == 2023
    assert Decimal(str(r2023[2])) == Decimal("4.5")
    assert r2023[3] is None  # INEP não definiu meta após o ciclo encerrado em 2021
    assert r2023[4] is None
    assert Decimal(str(r2023[5])) == Decimal("-0.7")  # 4.5 - 5.2
    assert Decimal(str(r2023[6])) == Decimal("190.18")
    assert Decimal(str(r2023[7])) == Decimal("-20.61")
    assert Decimal(str(r2023[8])) == Decimal("175.60")
    assert Decimal(str(r2023[9])) == Decimal("-22.68")

    # Ciclo 2025 (Recuperação histórica de +1,4 ponto )
    r2025 = rows[2]
    assert r2025[0] == 2025
    assert Decimal(str(r2025[2])) == Decimal("5.9")
    assert r2025[3] is None
    assert r2025[4] is None
    assert Decimal(str(r2025[5])) == Decimal("1.4")  # 5.9 - 4.5 = +1.4 ponto
    assert Decimal(str(r2025[6])) == Decimal("218.39")
    assert Decimal(str(r2025[7])) == Decimal("28.21")  # 218.39 - 190.18
    assert Decimal(str(r2025[8])) == Decimal("210.91")
    assert Decimal(str(r2025[9])) == Decimal("35.31")  # 210.91 - 175.60


def test_fct_educacao_metricas_natividade_and_tenant_isolation(conn):
    """Valida métricas da rede municipal de Natividade e garantia de isolamento multi-tenant."""
    rows = conn.execute(
        text(
            """
            SELECT
                ano,
                etapa_ensino,
                nota_ideb,
                crescimento_pontos_ideb
            FROM analytics.fct_educacao_metricas
            WHERE portal_slug = 'natividade_prefeitura'
              AND etapa_ensino = 'anos_iniciais'
            ORDER BY ano
            """
        )
    ).fetchall()

    assert len(rows) == 3, f"Esperados 3 ciclos para Natividade Anos Iniciais, obtidos {len(rows)}"

    # Ciclo 2025 de Natividade
    r2025 = rows[2]
    assert r2025[0] == 2025
    assert Decimal(str(r2025[2])) == Decimal("6.0")
    assert Decimal(str(r2025[3])) == Decimal("0.3")  # 6.0 - 5.7

    # Verifica ausência de registros sem portal_slug (Regra 23)
    null_portals = conn.execute(
        text("SELECT count(*) FROM analytics.fct_educacao_metricas WHERE portal_slug IS NULL")
    ).scalar()
    assert null_portals == 0
