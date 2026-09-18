from elt.core import db


def test_create_tables_creates_expected_tables(conn):
    from sqlalchemy import text

    rows = conn.execute(
        text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'raw_porciuncula_prefeitura'")
    ).fetchall()
    table_names = {r[0] for r in rows}
    assert "despesas_por_orgao" in table_names
    assert "licitacoes" in table_names
    assert "pessoal" in table_names


def test_upsert_inserts_rows(conn):
    rows = [
        {
            "ano": 2025,
            "empresa": "7",
            "codigo": "01",
            "descricao": "SAUDE",
            "empenhado": "1000",
            "liquidado": "900",
            "pago": "800",
            "dotac": "2000",
            "altdo": "0",
            "dotacao_atualizada": "2000",
        },
    ]
    count = db.upsert(conn, "despesas_por_orgao", rows, key_cols=["ano", "empresa", "codigo"])
    assert count == 1
    from sqlalchemy import text

    row = conn.execute(
        text("SELECT descricao FROM despesas_por_orgao WHERE ano=2025 AND empresa='7' AND codigo='01'")
    ).fetchone()
    assert row is not None
    assert row[0] == "SAUDE"


def test_upsert_replaces_on_conflict(conn):
    row = {
        "ano": 2025,
        "empresa": "7",
        "codigo": "02",
        "descricao": "SAUDE",
        "empenhado": "1000",
        "liquidado": "900",
        "pago": "800",
        "dotac": "2000",
        "altdo": "0",
        "dotacao_atualizada": "2000",
    }
    db.upsert(conn, "despesas_por_orgao", [row], key_cols=["ano", "empresa", "codigo"])
    row["empenhado"] = "1500"
    db.upsert(conn, "despesas_por_orgao", [row], key_cols=["ano", "empresa", "codigo"])
    from sqlalchemy import text

    result = conn.execute(
        text("SELECT empenhado FROM despesas_por_orgao WHERE ano=2025 AND empresa='7' AND codigo='02'")
    ).fetchone()
    assert result[0] == "1500"
    count = conn.execute(
        text("SELECT COUNT(*) FROM despesas_por_orgao WHERE ano=2025 AND empresa='7' AND codigo='02'")
    ).fetchone()[0]
    assert count == 1


def test_set_and_get_metadata(conn):
    db.set_metadata(conn, "test_key", "test_value", "porciuncula_prefeitura")
    result = db.get_metadata(conn, "test_key", "porciuncula_prefeitura")
    assert result == "test_value"


def test_get_metadata_returns_none_for_missing_key(conn):
    result = db.get_metadata(conn, "nonexistent_key_xyz", "porciuncula_prefeitura")
    assert result is None


def test_fct_anomalias_fiscais_metricas_exists(conn):
    from sqlalchemy import text

    # Verify that the table was created by dbt in the analytics schema
    rows = conn.execute(
        text(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'analytics' AND table_name = 'fct_anomalias_fiscais_metricas'"
        )
    ).fetchall()

    columns = {r[0]: r[1] for r in rows}
    assert len(columns) > 0, "Table analytics.fct_anomalias_fiscais_metricas should exist"

    assert "anomalia_id" in columns
    assert "tipo_anomalia" in columns
    assert "dimensao_referencia" in columns
    assert "grau_severidade" in columns
    assert "mes_inicial" in columns
    assert "mes_final" in columns

    # Ensure text and integer types per spec
    assert columns["tipo_anomalia"] == "text"
    assert columns["dimensao_referencia"] == "text"
    assert columns["grau_severidade"] == "text"
    assert columns["mes_inicial"] == "integer"
    assert columns["mes_final"] == "integer"

    # Ensure query executes without SQL evaluation or runtime errors
    result = conn.execute(
        text(
            "SELECT anomalia_id, tipo_anomalia, dimensao_referencia, grau_severidade, mes_inicial, mes_final, desvio_percentual FROM analytics.fct_anomalias_fiscais_metricas LIMIT 10"
        )
    ).fetchall()
    assert isinstance(result, list)


def test_fct_licitacoes_enrichment_columns(conn):
    from sqlalchemy import text

    rows = conn.execute(
        text(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'analytics' AND table_name = 'fct_licitacoes'"
        )
    ).fetchall()
    columns = {r[0]: r[1] for r in rows}
    assert "fonte_objeto" in columns
    assert "link_sistema_origem" in columns
    assert columns["fonte_objeto"] == "text"

    # Inserção e validação de dados transformados
    conn.execute(
        text(
            """
            INSERT INTO "raw_porciuncula_prefeitura"."licitacoes" (ano, empresa, numero, discr, valor, situacao)
            VALUES (2025, '1', 'PE 099/2025', 'Objeto truncado municipal', '1000.00', 'em_andamento')
            ON CONFLICT (ano, empresa, numero) DO UPDATE SET discr = EXCLUDED.discr;
            """
        )
    )
    conn.execute(
        text(
            """
            INSERT INTO "raw_pncp"."compras" (numero_controle_pncp, cnpj_orgao, ano_compra, sequencial_compra, numero_compra, objeto_compra, link_sistema_origem)
            VALUES ('29129778000199-1-99/2025', '29129778000199', '2025', '99', 'PE 099/2025', 'Objeto completo enriquecido via PNCP oficial', 'https://pncp.gov.br/app/editais/29129778000199/2025/99')
            ON CONFLICT (numero_controle_pncp) DO UPDATE SET objeto_compra = EXCLUDED.objeto_compra;
            """
        )
    )

    enriched_row = conn.execute(
        text(
            """
            SELECT objeto, fonte_objeto, link_sistema_origem
            FROM analytics.fct_licitacoes
            WHERE ano = 2025 AND empresa_id = '1' AND licitacao_numero = 'PE 099/2025'
            """
        )
    ).fetchone()

    assert enriched_row is not None
    assert enriched_row[0] == "Objeto completo enriquecido via PNCP oficial"
    assert enriched_row[1] == "pncp"
    assert enriched_row[2] == "https://pncp.gov.br/app/editais/29129778000199/2025/99"


def test_fct_licitacoes_itens_exists(conn):
    from sqlalchemy import text

    rows = conn.execute(
        text(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'analytics' AND table_name = 'fct_licitacoes_itens'"
        )
    ).fetchall()
    columns = {r[0]: r[1] for r in rows}
    assert len(columns) > 0, "Table analytics.fct_licitacoes_itens should exist"
    assert "item_id" in columns
    assert "portal_slug" in columns
    assert "ano" in columns
    assert "licitacao_numero" in columns
    assert "numero_item" in columns
    assert "descricao" in columns
    assert "quantidade" in columns
    assert "valor_total_estimado" in columns
    assert "valor_total_homologado" in columns
    assert "percentual_desconto" in columns
    assert "fornecedor_nome" in columns
