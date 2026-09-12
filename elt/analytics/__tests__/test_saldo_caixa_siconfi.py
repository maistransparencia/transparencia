import json
from pathlib import Path

import pytest
from sqlalchemy import text

from elt.core import db

FIXTURE_PATH = Path(__file__).parent.parent.parent / "tests" / "fixtures" / "siconfi_msc_fixture.json"


@pytest.fixture
def populated_conn(conn):
    payload = json.loads(FIXTURE_PATH.read_text())
    items = payload["items"]

    # Adiciona também um registro de ajuste com natureza C para testar dedução
    items_with_credora = items + [
        {
            "tipo_matriz": "MSCC",
            "cod_ibge": 3304102,
            "classe_conta": 1,
            "conta_contabil": "111110200",
            "poder_orgao": "10131",
            "financeiro_permanente": 1,
            "ano_fonte_recursos": 1,
            "fonte_recursos": "1500",
            "exercicio": 2024,
            "mes_referencia": 12,
            "data_referencia": "2024-12-31T00:00:00Z",
            "entrada_msc": 585,
            "valor": 50000.00,
            "natureza_conta": "C",
            "tipo_valor": "ending_balance",
        }
    ]

    raw_rows = [
        {
            "ano": item["exercicio"],
            "mes_referencia": item["mes_referencia"],
            "cod_ibge": item["cod_ibge"],
            "tipo_matriz": item["tipo_matriz"],
            "classe_conta": item["classe_conta"],
            "conta_contabil": item["conta_contabil"],
            "poder_orgao": item["poder_orgao"],
            "financeiro_permanente": item["financeiro_permanente"],
            "ano_fonte_recursos": item["ano_fonte_recursos"],
            "fonte_recursos": item["fonte_recursos"],
            "valor": str(item["valor"]),
            "natureza_conta": item["natureza_conta"],
            "tipo_valor": item["tipo_valor"],
            "data_referencia": item["data_referencia"],
            "data_extracao": "2026-09-06T12:00:00Z",
        }
        for item in items_with_credora
    ]

    key_cols = [
        "ano",
        "mes_referencia",
        "cod_ibge",
        "conta_contabil",
        "poder_orgao",
        "fonte_recursos",
        "ano_fonte_recursos",
        "financeiro_permanente",
        "tipo_valor",
        "natureza_conta",
    ]
    db.upsert(conn, "siconfi_msc_patrimonial", raw_rows, key_cols)
    return conn


def test_fct_saldo_caixa_siconfi_agregacao(populated_conn):
    query = text("""
        select
            poder_orgao,
            grupo_destinacao,
            empresa_id,
            orgao_nome,
            entidade_nome,
            cnpj,
            saldo_caixa_bancos,
            saldo_recursos_livres,
            saldo_recursos_vinculados,
            ultima_competencia_flag
        from fct_saldo_caixa_siconfi
        where ano = 2024 and mes_referencia = 12
        order by saldo_caixa_bancos desc
    """)
    rows = populated_conn.execute(query).fetchall()

    assert len(rows) == 4

    # Garante que a Câmara Municipal (20231) foi excluída de todos os cálculos e agregações
    assert all(r[0] != "20231" for r in rows)

    res = {
        (r[0], r[1]): {
            "empresa_id": r[2],
            "orgao_nome": r[3],
            "entidade_nome": r[4],
            "cnpj": r[5],
            "saldo": float(r[6]),
            "livre": float(r[7]),
            "vinculado": float(r[8]),
            "flag": r[9],
        }
        for r in rows
    }

    # Previdência / CAPREM (10132 - RPPS): 25.000.000,00 (não cadastrado em dim_orgao nesta fase -> empresa_id/cnpj null)
    assert res[("10132", "previdencia")]["saldo"] == 25000000.0
    assert res[("10132", "previdencia")]["empresa_id"] is None
    assert res[("10132", "previdencia")]["orgao_nome"] is None
    assert res[("10132", "previdencia")]["entidade_nome"] == "Instituto de Previdência dos Servidores (CAPREM)"
    assert res[("10132", "previdencia")]["cnpj"] is None
    assert res[("10132", "previdencia")]["flag"] is True

    # Prefeitura (10131, grupo livre -> empresa 7): 5.000.000 - 50.000 (natureza C) = 4.950.000,00
    assert res[("10131", "livre")]["saldo"] == 4950000.0
    assert res[("10131", "livre")]["livre"] == 4950000.0
    assert res[("10131", "livre")]["vinculado"] == 0.0
    assert res[("10131", "livre")]["empresa_id"] == "7"
    assert res[("10131", "livre")]["orgao_nome"] == "PREFEITURA MUNICIPAL DE PORCIÚNCULA"
    assert res[("10131", "livre")]["entidade_nome"] == "PREFEITURA MUNICIPAL DE PORCIÚNCULA"
    assert res[("10131", "livre")]["cnpj"] == "28920999000106"

    # FMS (10131, grupo saude -> empresa 2): 1.200.000,00 (fonte 1501 é vinculada)
    assert res[("10131", "saude")]["saldo"] == 1200000.0
    assert res[("10131", "saude")]["livre"] == 0.0
    assert res[("10131", "saude")]["vinculado"] == 1200000.0
    assert res[("10131", "saude")]["empresa_id"] == "2"
    assert res[("10131", "saude")]["orgao_nome"] == "FUNDO MUNICIPAL DE SAUDE"
    assert res[("10131", "saude")]["entidade_nome"] == "FUNDO MUNICIPAL DE SAUDE"
    assert res[("10131", "saude")]["cnpj"] == "12097798000110"

    # FMAS (10131, grupo assistencia_social -> empresa 3): 300.000,00 (fonte 1660 é vinculada)
    assert res[("10131", "assistencia_social")]["saldo"] == 300000.0
    assert res[("10131", "assistencia_social")]["livre"] == 0.0
    assert res[("10131", "assistencia_social")]["vinculado"] == 300000.0
    assert res[("10131", "assistencia_social")]["empresa_id"] == "3"
    assert res[("10131", "assistencia_social")]["orgao_nome"] == "FUNDO MUNICIPAL DE ASSISTENCIA SOCIAL"
    assert res[("10131", "assistencia_social")]["entidade_nome"] == "FUNDO MUNICIPAL DE ASSISTENCIA SOCIAL"
    assert res[("10131", "assistencia_social")]["cnpj"] == "12124826000141"
