import pytest
from sqlalchemy import text


@pytest.fixture
def seed_msc_patrimonial(conn):
    """Insere registros sintéticos para validar os filtros de staging e agregação do mart."""
    rows = [
        # 1. Executivo (10131) - Conta 111% (deve ser capturada)
        {
            "ano": 2024,
            "mes_referencia": 12,
            "cod_ibge": 3304102,
            "tipo_matriz": "MSCC",
            "classe_conta": 1,
            "conta_contabil": "111110200",
            "poder_orgao": "10131",
            "financeiro_permanente": 1,
            "ano_fonte_recursos": 1,
            "fonte_recursos": "1500",
            "valor": "5000000.00",
            "natureza_conta": "D",
            "tipo_valor": "ending_balance",
            "data_referencia": "2024-12-31",
            "data_extracao": "2024-12-31T23:59:59Z",
        },
        # 2. Executivo (10131) - Conta 114% (DEVE SER DESCARTADA pelo staging)
        {
            "ano": 2024,
            "mes_referencia": 12,
            "cod_ibge": 3304102,
            "tipo_matriz": "MSCC",
            "classe_conta": 1,
            "conta_contabil": "114110100",
            "poder_orgao": "10131",
            "financeiro_permanente": 1,
            "ano_fonte_recursos": 1,
            "fonte_recursos": "1500",
            "valor": "1000000.00",
            "natureza_conta": "D",
            "tipo_valor": "ending_balance",
            "data_referencia": "2024-12-31",
            "data_extracao": "2024-12-31T23:59:59Z",
        },
        # 3. CAPREM (10132) - Conta 111% (deve ser capturada)
        {
            "ano": 2024,
            "mes_referencia": 12,
            "cod_ibge": 3304102,
            "tipo_matriz": "MSCC",
            "classe_conta": 1,
            "conta_contabil": "111110600",
            "poder_orgao": "10132",
            "financeiro_permanente": 1,
            "ano_fonte_recursos": 1,
            "fonte_recursos": "1800",
            "valor": "25000000.00",
            "natureza_conta": "D",
            "tipo_valor": "ending_balance",
            "data_referencia": "2024-12-31",
            "data_extracao": "2024-12-31T23:59:59Z",
        },
        # 4. CAPREM (10132) - Conta 114% com financeiro_permanente = 1 (deve ser capturada)
        {
            "ano": 2024,
            "mes_referencia": 12,
            "cod_ibge": 3304102,
            "tipo_matriz": "MSCC",
            "classe_conta": 1,
            "conta_contabil": "114110100",
            "poder_orgao": "10132",
            "financeiro_permanente": 1,
            "ano_fonte_recursos": 1,
            "fonte_recursos": "1800",
            "valor": "35000000.00",
            "natureza_conta": "D",
            "tipo_valor": "ending_balance",
            "data_referencia": "2024-12-31",
            "data_extracao": "2024-12-31T23:59:59Z",
        },
        # 5. CAPREM (10132) - Conta 114% com financeiro_permanente = 2 (DEVE SER CAPTURADA)
        {
            "ano": 2024,
            "mes_referencia": 12,
            "cod_ibge": 3304102,
            "tipo_matriz": "MSCC",
            "classe_conta": 1,
            "conta_contabil": "114410101",
            "poder_orgao": "10132",
            "financeiro_permanente": 2,
            "ano_fonte_recursos": 1,
            "fonte_recursos": "1800",
            "valor": "5000000.00",
            "natureza_conta": "D",
            "tipo_valor": "ending_balance",
            "data_referencia": "2024-12-31",
            "data_extracao": "2024-12-31T23:59:59Z",
        },
        # 6. Câmara Municipal (20231) - Conta 111% (DEVE SER DESCARTADA pelo staging)
        {
            "ano": 2024,
            "mes_referencia": 12,
            "cod_ibge": 3304102,
            "tipo_matriz": "MSCC",
            "classe_conta": 1,
            "conta_contabil": "111110200",
            "poder_orgao": "20231",
            "financeiro_permanente": 1,
            "ano_fonte_recursos": 1,
            "fonte_recursos": "1500",
            "valor": "450000.00",
            "natureza_conta": "D",
            "tipo_valor": "ending_balance",
            "data_referencia": "2024-12-31",
            "data_extracao": "2024-12-31T23:59:59Z",
        },
        # 7. CAPREM (10132) - Conta 1213% com financeiro_permanente = 2 (DEVE SER CAPTURADA)
        {
            "ano": 2024,
            "mes_referencia": 12,
            "cod_ibge": 3304102,
            "tipo_matriz": "MSCC",
            "classe_conta": 1,
            "conta_contabil": "121310902",
            "poder_orgao": "10132",
            "financeiro_permanente": 2,
            "ano_fonte_recursos": 1,
            "fonte_recursos": "1800",
            "valor": "10000000.00",
            "natureza_conta": "D",
            "tipo_valor": "ending_balance",
            "data_referencia": "2024-12-31",
            "data_extracao": "2024-12-31T23:59:59Z",
        },
        # 8. CAPREM (10132) - 2025 mês 6 (intermediário, deve ser ignorado pela agregação anual)
        {
            "ano": 2025,
            "mes_referencia": 6,
            "cod_ibge": 3304102,
            "tipo_matriz": "MSCC",
            "classe_conta": 1,
            "conta_contabil": "111110600",
            "poder_orgao": "10132",
            "financeiro_permanente": 1,
            "ano_fonte_recursos": 1,
            "fonte_recursos": "1800",
            "valor": "500000.00",
            "natureza_conta": "D",
            "tipo_valor": "ending_balance",
            "data_referencia": "2025-06-30",
            "data_extracao": "2025-06-30T23:59:59Z",
        },
        # 9. CAPREM (10132) - 2025 mês 12 (caixa)
        {
            "ano": 2025,
            "mes_referencia": 12,
            "cod_ibge": 3304102,
            "tipo_matriz": "MSCC",
            "classe_conta": 1,
            "conta_contabil": "111110600",
            "poder_orgao": "10132",
            "financeiro_permanente": 1,
            "ano_fonte_recursos": 1,
            "fonte_recursos": "1800",
            "valor": "15000000.00",
            "natureza_conta": "D",
            "tipo_valor": "ending_balance",
            "data_referencia": "2025-12-31",
            "data_extracao": "2025-12-31T23:59:59Z",
        },
        # 10. CAPREM (10132) - 2025 mês 12 (aplicações 1213%)
        {
            "ano": 2025,
            "mes_referencia": 12,
            "cod_ibge": 3304102,
            "tipo_matriz": "MSCC",
            "classe_conta": 1,
            "conta_contabil": "121310902",
            "poder_orgao": "10132",
            "financeiro_permanente": 2,
            "ano_fonte_recursos": 1,
            "fonte_recursos": "1800",
            "valor": "45000000.00",
            "natureza_conta": "D",
            "tipo_valor": "ending_balance",
            "data_referencia": "2025-12-31",
            "data_extracao": "2025-12-31T23:59:59Z",
        },
    ]

    conn.execute(text("TRUNCATE TABLE raw_porciuncula_prefeitura.siconfi_msc_patrimonial CASCADE"))
    for r in rows:
        conn.execute(
            text(
                """
                INSERT INTO raw_porciuncula_prefeitura.siconfi_msc_patrimonial (
                    ano, mes_referencia, cod_ibge, tipo_matriz, classe_conta, conta_contabil,
                    poder_orgao, financeiro_permanente, ano_fonte_recursos, fonte_recursos,
                    valor, natureza_conta, tipo_valor, data_referencia, data_extracao
                ) VALUES (
                    :ano, :mes_referencia, :cod_ibge, :tipo_matriz, :classe_conta, :conta_contabil,
                    :poder_orgao, :financeiro_permanente, :ano_fonte_recursos, :fonte_recursos,
                    :valor, :natureza_conta, :tipo_valor, :data_referencia, :data_extracao
                )
                """
            ),
            r,
        )
    conn.commit()
    yield
    conn.execute(text("TRUNCATE TABLE raw_porciuncula_prefeitura.siconfi_msc_patrimonial CASCADE"))
    conn.commit()


@pytest.mark.usefixtures("seed_msc_patrimonial")
def test_stg_siconfi_msc_patrimonial_filtra_contas_corretamente(conn):
    """Valida que o staging captura 114% e 1213% apenas para o órgão 10132 e descarta a Câmara (20231)."""
    rows = conn.execute(
        text(
            """
            SELECT conta_contabil, poder_orgao, saldo_valor
            FROM analytics.stg_siconfi_msc_patrimonial
            WHERE ano = 2024
            ORDER BY poder_orgao, conta_contabil
            """
        )
    ).fetchall()

    contas_por_orgao = [(r[0], r[1], float(r[2])) for r in rows]

    # Verifica que a Câmara (20231) foi totalmente excluída
    orgaos_presentes = {r[1] for r in rows}
    assert "20231" not in orgaos_presentes

    # Verifica que o Executivo (10131) possui apenas a conta 111% e descartou a 114%
    contas_executivo = [c for c in contas_por_orgao if c[1] == "10131"]
    assert len(contas_executivo) == 1
    assert contas_executivo[0][0] == "111110200"
    assert contas_executivo[0][2] == 5000000.0

    # Verifica que a CAPREM (10132) possui 111%, duas contas 114% (fp=1 e fp=2) e a conta 1213%
    contas_caprem = [c for c in contas_por_orgao if c[1] == "10132"]
    assert len(contas_caprem) == 4
    assert {c[0] for c in contas_caprem} == {"111110600", "114110100", "114410101", "121310902"}
    valores_caprem = {c[0]: c[2] for c in contas_caprem}
    assert valores_caprem["111110600"] == 25000000.0
    assert valores_caprem["114110100"] == 35000000.0
    assert valores_caprem["114410101"] == 5000000.0
    assert valores_caprem["121310902"] == 10000000.0


@pytest.mark.usefixtures("seed_msc_patrimonial")
def test_fct_saldo_caixa_siconfi_consolida_investimentos_caprem(conn):
    """Valida que o mart fct_saldo_caixa_siconfi consolida caixa + investimentos para a CAPREM sem inflar o Executivo."""
    rows = conn.execute(
        text(
            """
            SELECT poder_orgao, grupo_destinacao, saldo_caixa_bancos, saldo_recursos_livres, saldo_recursos_vinculados
            FROM analytics.fct_saldo_caixa_siconfi
            WHERE ano = 2024
            ORDER BY poder_orgao, grupo_destinacao
            """
        )
    ).fetchall()

    resultados = {
        (r[0], r[1]): {
            "saldo_caixa_bancos": float(r[2]),
            "saldo_recursos_livres": float(r[3]),
            "saldo_recursos_vinculados": float(r[4]),
        }
        for r in rows
    }

    # Executivo (10131, livre) não deve ter seus saldos inflados por 114%
    assert ("10131", "livre") in resultados
    executivo = resultados[("10131", "livre")]
    assert executivo["saldo_caixa_bancos"] == 5000000.0
    assert executivo["saldo_recursos_livres"] == 5000000.0
    assert executivo["saldo_recursos_vinculados"] == 0.0

    # CAPREM (10132, previdencia) consolida 25M (111%) + 35M (114% fp=1) + 5M (114% fp=2) + 10M (1213% fp=2) = 75M vinculados
    assert ("10132", "previdencia") in resultados
    caprem = resultados[("10132", "previdencia")]
    assert caprem["saldo_caixa_bancos"] == 75000000.0
    assert caprem["saldo_recursos_livres"] == 0.0
    assert caprem["saldo_recursos_vinculados"] == 75000000.0

    # Câmara Municipal (20231) não deve existir no mart
    orgaos_presentes = {k[0] for k in resultados}
    assert "20231" not in orgaos_presentes


@pytest.mark.usefixtures("seed_msc_patrimonial")
def test_fct_caprem_patrimonio_historico_metricas_plurianual(conn):
    """Valida a série histórica plurianual da CAPREM, seleção da última competência anual, flag de consistência e variações."""
    rows = conn.execute(
        text(
            """
            SELECT portal_slug, ano, mes_referencia, saldo_caixa, saldo_aplicacoes, patrimonio_total, inconsistencia_declaracao_flag, variacao_abs, variacao_pct
            FROM analytics.fct_caprem_patrimonio_historico_metricas
            ORDER BY ano
            """
        )
    ).fetchall()

    assert len(rows) == 2

    # 2024: base histórica da série
    r2024 = rows[0]
    assert r2024[0] == "porciuncula_prefeitura"
    assert r2024[1] == 2024
    assert r2024[2] == 12
    assert float(r2024[3]) == 25000000.0  # 111110600
    assert float(r2024[4]) == 50000000.0  # 35M (114) + 5M (114) + 10M (1213)
    assert float(r2024[5]) == 75000000.0  # Total
    assert r2024[6] is False  # inconsistencia_declaracao_flag
    assert r2024[7] is None
    assert r2024[8] is None

    # 2025: segundo ano com mes_referencia = 12 (ignora mes 6) e variações calculadas
    r2025 = rows[1]
    assert r2025[0] == "porciuncula_prefeitura"
    assert r2025[1] == 2025
    assert r2025[2] == 12
    assert float(r2025[3]) == 15000000.0  # 111110600
    assert float(r2025[4]) == 45000000.0  # 121310902
    assert float(r2025[5]) == 60000000.0  # Total
    assert r2025[6] is False  # inconsistencia_declaracao_flag
    assert float(r2025[7]) == -15000000.0  # 60M - 75M
    assert float(r2025[8]) == -20.0  # (-15M / 75M) * 100
