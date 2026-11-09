"""Testes de integração do mart fct_saude_origem_recursos_metricas."""

from decimal import Decimal

import pytest
from sqlalchemy import text

_ANO = 2031

# (schema raw, empresa, codigo, fontestn, valor)
_LINHAS = [
    # Fundo Municipal de Saúde de Porciúncula
    ("raw_porciuncula_prefeitura", "2", "1000.00.0.0.00.00", "", "1000,00"),
    ("raw_porciuncula_prefeitura", "2", "1713.50.1.1.00.00", "1.600 0", "600,00"),
    ("raw_porciuncula_prefeitura", "2", "2411.50.1.1.00.00", "1.600 0", "50,00"),
    # A fonte 1621 aparece nas duas esferas: quem decide é a natureza
    ("raw_porciuncula_prefeitura", "2", "1713.50.2.1.00.00", "1.621 0", "40,00"),
    ("raw_porciuncula_prefeitura", "2", "1723.50.1.1.00.00", "1.621 0", "90,00"),
    ("raw_porciuncula_prefeitura", "2", "1321.01.0.1.00.00", "1.600 0", "20,00"),
    # O total (1000,00) é maior que as folhas (800,00): o resíduo de 200,00 vai para nao_detalhado
    # Entidade que não é órgão de saúde no mesmo portal
    ("raw_porciuncula_prefeitura", "1", "1000.00.0.0.00.00", "", "9999,00"),
    ("raw_porciuncula_prefeitura", "1", "1713.50.1.1.00.00", "", "9999,00"),
    # Outro portal com o nome do órgão acentuado e os mesmos códigos
    ("raw_natividade_prefeitura", "3", "1000.00.0.0.00.00", "", "300,00"),
    ("raw_natividade_prefeitura", "3", "1713.50.1.1.00.00", "", "300,00"),
]


@pytest.fixture
def seed_origem(conn):
    def limpar():
        for schema in ("raw_porciuncula_prefeitura", "raw_natividade_prefeitura"):
            conn.execute(text(f"DELETE FROM {schema}.receita_orcamentaria WHERE ano = :ano"), {"ano": str(_ANO)})
        conn.commit()

    limpar()
    for schema, empresa, codigo, fontestn, valor in _LINHAS:
        conn.execute(
            text(
                f"""
                INSERT INTO {schema}.receita_orcamentaria
                    (ano, empresa, codigo, fontestn, nome, arrecadado_total, previsao_atualizada)
                VALUES (:ano, :empresa, :codigo, :fontestn, 'Receita sintetica', :valor, '0,00')
                """
            ),
            {"ano": str(_ANO), "empresa": empresa, "codigo": codigo, "fontestn": fontestn, "valor": valor},
        )
    conn.commit()
    yield
    limpar()


def _por_grupo(conn, portal_slug: str, ano: int = _ANO) -> dict[str, Decimal]:
    rows = conn.execute(
        text(
            """
            SELECT grupo_fonte, sum(arrecadado_receita) AS total
            FROM analytics.fct_saude_origem_recursos_metricas
            WHERE portal_slug = :portal_slug AND ano = :ano
            GROUP BY grupo_fonte
            """
        ),
        {"portal_slug": portal_slug, "ano": ano},
    ).fetchall()
    return {r.grupo_fonte: r.total for r in rows}


@pytest.mark.usefixtures("seed_origem")
def test_esfera_decidida_pela_natureza_e_nao_pela_fonte(conn):
    assert _por_grupo(conn, "porciuncula_prefeitura") == {
        "uniao": Decimal("690.00"),
        "estado": Decimal("90.00"),
        "outras_receitas": Decimal("20.00"),
        "nao_detalhado": Decimal("200.00"),
    }


@pytest.mark.usefixtures("seed_origem")
def test_residuo_fecha_o_total_com_o_topo(conn):
    total = sum(_por_grupo(conn, "porciuncula_prefeitura").values(), Decimal("0"))
    assert total == Decimal("1000.00")


@pytest.mark.usefixtures("seed_origem")
def test_exclui_entidades_que_nao_sao_saude(conn):
    empresas = conn.execute(
        text(
            """
            SELECT DISTINCT empresa_id FROM analytics.fct_saude_origem_recursos_metricas
            WHERE portal_slug = 'porciuncula_prefeitura' AND ano = :ano
            """
        ),
        {"ano": _ANO},
    ).fetchall()
    assert [r.empresa_id for r in empresas] == ["2"]


@pytest.mark.usefixtures("seed_origem")
def test_isolamento_por_tenant_com_orgao_acentuado(conn):
    assert _por_grupo(conn, "natividade_prefeitura") == {"uniao": Decimal("300.00")}


@pytest.mark.usefixtures("seed_origem")
def test_grao_sem_duplicatas(conn):
    duplicadas = conn.execute(
        text(
            """
            SELECT 1 FROM analytics.fct_saude_origem_recursos_metricas
            GROUP BY portal_slug, ano, empresa_id, grupo_fonte, codigo_natureza
            HAVING count(*) > 1
            """
        )
    ).fetchall()
    assert duplicadas == []


def test_classifica_plano_de_contas_anterior_a_2022(conn):
    ano = _ANO - 1
    linhas = [
        ("1000.00.0.0.00.00", "600,00"),
        ("1718.03.1.1.00.00", "300,00"),
        ("2418.10.1.1.00.00", "40,00"),
        ("1728.03.1.1.00.00", "110,00"),
        ("1321.01.0.1.00.00", "20,00"),
    ]

    def limpar():
        conn.execute(
            text("DELETE FROM raw_porciuncula_prefeitura.receita_orcamentaria WHERE ano = :ano"), {"ano": str(ano)}
        )
        conn.commit()

    limpar()
    try:
        for codigo, valor in linhas:
            conn.execute(
                text(
                    """
                    INSERT INTO raw_porciuncula_prefeitura.receita_orcamentaria
                        (ano, empresa, codigo, fontestn, nome, arrecadado_total, previsao_atualizada)
                    VALUES (:ano, '2', :codigo, '', 'Receita sintetica', :valor, '0,00')
                    """
                ),
                {"ano": str(ano), "codigo": codigo, "valor": valor},
            )
        conn.commit()
        resultado = _por_grupo(conn, "porciuncula_prefeitura", ano)
    finally:
        limpar()

    assert resultado == {
        "uniao": Decimal("340.00"),
        "estado": Decimal("110.00"),
        "outras_receitas": Decimal("20.00"),
        "nao_detalhado": Decimal("130.00"),
    }


def test_diferenca_da_categoria_fica_na_esfera_em_linha_propria(conn):
    ano = _ANO - 2
    linhas = [
        ("1000.00.0.0.00.00", "800,00"),
        ("1710.00.0.0.00.00", "700,00"),
        ("1713.50.1.1.00.00", "500,00"),
        ("1713.50.1.1.00.10", "100,00"),
        ("1720.00.0.0.00.00", "90,00"),
        ("1723.50.1.1.00.00", "90,00"),
        ("1321.01.0.1.00.00", "10,00"),
    ]

    def limpar():
        conn.execute(
            text("DELETE FROM raw_porciuncula_prefeitura.receita_orcamentaria WHERE ano = :ano"), {"ano": str(ano)}
        )
        conn.commit()

    limpar()
    try:
        for codigo, valor in linhas:
            conn.execute(
                text(
                    """
                    INSERT INTO raw_porciuncula_prefeitura.receita_orcamentaria
                        (ano, empresa, codigo, fontestn, nome, arrecadado_total, previsao_atualizada)
                    VALUES (:ano, '2', :codigo, '', 'Receita sintetica', :valor, '0,00')
                    """
                ),
                {"ano": str(ano), "codigo": codigo, "valor": valor},
            )
        conn.commit()
        resultado = _por_grupo(conn, "porciuncula_prefeitura", ano)
        sem_detalhe = conn.execute(
            text(
                """
                SELECT grupo_fonte, codigo_natureza, arrecadado_receita
                FROM analytics.fct_saude_origem_recursos_metricas
                WHERE portal_slug = 'porciuncula_prefeitura' AND ano = :ano
                  AND codigo_natureza LIKE 'sem_detalhe_%'
                """
            ),
            {"ano": ano},
        ).fetchall()
    finally:
        limpar()

    assert resultado == {
        "uniao": Decimal("700.00"),
        "estado": Decimal("90.00"),
        "outras_receitas": Decimal("10.00"),
    }
    assert [(r.grupo_fonte, r.codigo_natureza, r.arrecadado_receita) for r in sem_detalhe] == [
        ("uniao", "sem_detalhe_171", Decimal("600.00"))
    ]


def test_segmento_com_zero_significativo_nao_vira_pai_do_vizinho(conn):
    ano = _ANO - 3
    linhas = [
        ("1000.00.0.0.00.00", "300,00"),
        ("1710.00.0.0.00.00", "300,00"),
        ("1713.50.1.1.10.00", "100,00"),
        ("1713.50.1.1.11.00", "100,00"),
        ("1713.50.1.1.20.00", "100,00"),
    ]

    def limpar():
        conn.execute(
            text("DELETE FROM raw_porciuncula_prefeitura.receita_orcamentaria WHERE ano = :ano"), {"ano": str(ano)}
        )
        conn.commit()

    limpar()
    try:
        for codigo, valor in linhas:
            conn.execute(
                text(
                    """
                    INSERT INTO raw_porciuncula_prefeitura.receita_orcamentaria
                        (ano, empresa, codigo, fontestn, nome, arrecadado_total, previsao_atualizada)
                    VALUES (:ano, '2', :codigo, '', 'Receita sintetica', :valor, '0,00')
                    """
                ),
                {"ano": str(ano), "codigo": codigo, "valor": valor},
            )
        conn.commit()
        detalhe = conn.execute(
            text(
                """
                SELECT codigo_natureza
                FROM analytics.fct_saude_origem_recursos_metricas
                WHERE portal_slug = 'porciuncula_prefeitura' AND ano = :ano AND grupo_fonte = 'uniao'
                ORDER BY codigo_natureza
                """
            ),
            {"ano": ano},
        ).fetchall()
    finally:
        limpar()

    assert [r.codigo_natureza for r in detalhe] == ["1713.50.1.1.10.00", "1713.50.1.1.11.00", "1713.50.1.1.20.00"]


def test_anos_anteriores_a_2021_ficam_fora_do_mart(conn):
    ano = 2020

    def limpar():
        conn.execute(
            text("DELETE FROM raw_porciuncula_prefeitura.receita_orcamentaria WHERE ano = :ano"), {"ano": str(ano)}
        )
        conn.commit()

    limpar()
    try:
        for codigo, valor in [("1000.00.0.0.00.00", "100,00"), ("1721.33.01.00.00.00", "100,00")]:
            conn.execute(
                text(
                    """
                    INSERT INTO raw_porciuncula_prefeitura.receita_orcamentaria
                        (ano, empresa, codigo, fontestn, nome, arrecadado_total, previsao_atualizada)
                    VALUES (:ano, '2', :codigo, '', 'Receita sintetica', :valor, '0,00')
                    """
                ),
                {"ano": str(ano), "codigo": codigo, "valor": valor},
            )
        conn.commit()
        total = conn.execute(
            text(
                "SELECT count(*) FROM analytics.fct_saude_origem_recursos_metricas "
                "WHERE portal_slug = 'porciuncula_prefeitura' AND ano = :ano"
            ),
            {"ano": ano},
        ).scalar()
    finally:
        limpar()

    assert total == 0
