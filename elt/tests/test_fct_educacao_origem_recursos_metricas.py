"""Testes de integração do mart fct_educacao_origem_recursos_metricas."""

from decimal import Decimal

import pytest
from sqlalchemy import text

_ANO = 2031

# (schema raw, empresa, codigo, fontestn, valor)
_LINHAS = [
    # Fundo de Educação de Porciúncula
    ("raw_porciuncula_prefeitura", "8", "1000.00.0.0.00.00", "", "719,00"),
    ("raw_porciuncula_prefeitura", "8", "1751.50.0.1.00.00", "", "400,00"),
    ("raw_porciuncula_prefeitura", "8", "1751.50.0.1.00.00", "1.540 1070", "400,00"),
    ("raw_porciuncula_prefeitura", "8", "1715.51.0.1.00.00", "", "100,00"),
    ("raw_porciuncula_prefeitura", "8", "1714.50.0.1.00.00", "", "60,00"),
    ("raw_porciuncula_prefeitura", "8", "1714.52.0.1.00.00", "", "50,00"),
    ("raw_porciuncula_prefeitura", "8", "1714.53.0.1.00.00", "", "30,00"),
    ("raw_porciuncula_prefeitura", "8", "1714.99.0.1.00.00", "", "20,00"),
    ("raw_porciuncula_prefeitura", "8", "1321.01.0.1.00.00", "", "40,00"),
    # Rendimentos de depósitos bancários (natureza genérica) seguem a fonte STN
    ("raw_porciuncula_prefeitura", "8", "1321.01.1.1.06.01", "1.553 0", "3,00"),
    ("raw_porciuncula_prefeitura", "8", "1321.01.1.1.08.01", "1.573 0", "7,00"),
    ("raw_porciuncula_prefeitura", "8", "1321.01.1.1.03.01", "1.540 1070", "5,00"),
    ("raw_porciuncula_prefeitura", "8", "1321.01.1.1.09.01", "1.704 0", "4,00"),
    # Entidade que não é órgão de Educação no mesmo portal
    ("raw_porciuncula_prefeitura", "1", "1000.00.0.0.00.00", "", "9999,00"),
    ("raw_porciuncula_prefeitura", "1", "1751.50.0.1.00.00", "", "9999,00"),
    # Outro portal com os mesmos códigos e valores distintos
    # Linha-mãe maior que as folhas: resíduo de 50,00
    ("raw_natividade_prefeitura", "5", "1000.00.0.0.00.00", "", "375,00"),
    ("raw_natividade_prefeitura", "5", "1751.50.0.1.00.00", "", "300,00"),
    # PNATE lançado pelo município na fonte 1.569: a natureza específica decide o grupo
    ("raw_natividade_prefeitura", "5", "1714.53.0.1.00.00", "1.569 0", "25,00"),
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


def _por_grupo(conn, portal_slug: str) -> dict[str, Decimal]:
    rows = conn.execute(
        text(
            """
            SELECT grupo_fonte, sum(arrecadado_receita) AS total
            FROM analytics.fct_educacao_origem_recursos_metricas
            WHERE portal_slug = :portal_slug AND ano = :ano
            GROUP BY grupo_fonte
            """
        ),
        {"portal_slug": portal_slug, "ano": _ANO},
    ).fetchall()
    return {r.grupo_fonte: r.total for r in rows}


@pytest.mark.usefixtures("seed_origem")
def test_classifica_folhas_por_grupo(conn):
    assert _por_grupo(conn, "porciuncula_prefeitura") == {
        "fundeb": Decimal("405.00"),
        "fundeb_complementacao_uniao": Decimal("100.00"),
        "salario_educacao": Decimal("60.00"),
        "pnae": Decimal("50.00"),
        "pnate": Decimal("33.00"),
        "outros_fnde": Decimal("20.00"),
        "royalties": Decimal("11.00"),
        "outras_receitas": Decimal("40.00"),
    }


@pytest.mark.usefixtures("seed_origem")
def test_soma_dos_grupos_concilia_com_topo(conn):
    total = sum(_por_grupo(conn, "porciuncula_prefeitura").values(), Decimal("0"))
    assert abs(total - Decimal("719.00")) <= Decimal("0.01")


@pytest.mark.usefixtures("seed_origem")
def test_exclui_entidades_que_nao_sao_educacao(conn):
    empresas = conn.execute(
        text(
            """
            SELECT DISTINCT empresa_id FROM analytics.fct_educacao_origem_recursos_metricas
            WHERE portal_slug = 'porciuncula_prefeitura' AND ano = :ano
            """
        ),
        {"ano": _ANO},
    ).fetchall()
    assert [r.empresa_id for r in empresas] == ["8"]


@pytest.mark.usefixtures("seed_origem")
def test_isolamento_por_tenant(conn):
    assert _por_grupo(conn, "natividade_prefeitura") == {
        "fundeb": Decimal("300.00"),
        "pnate": Decimal("25.00"),
        "nao_detalhado": Decimal("50.00"),
    }


@pytest.mark.usefixtures("seed_origem")
def test_grao_sem_duplicatas(conn):
    duplicadas = conn.execute(
        text(
            """
            SELECT 1 FROM analytics.fct_educacao_origem_recursos_metricas
            GROUP BY portal_slug, ano, empresa_id, grupo_fonte, codigo_natureza
            HAVING count(*) > 1
            """
        )
    ).fetchall()
    assert duplicadas == []


@pytest.mark.usefixtures("seed_origem")
def test_residuo_fecha_o_total_com_o_topo(conn):
    total = sum(_por_grupo(conn, "natividade_prefeitura").values(), Decimal("0"))
    assert total == Decimal("375.00")


@pytest.mark.usefixtures("seed_origem")
def test_folhas_que_fecham_nao_geram_residuo(conn):
    assert "nao_detalhado" not in _por_grupo(conn, "porciuncula_prefeitura")


def test_classifica_plano_de_contas_anterior_a_2022(conn):
    ano = _ANO - 1
    linhas = [
        ("1000.00.0.0.00.00", "700,00"),
        ("1758.01.1.1.00.00", "400,00"),
        ("1718.09.1.1.00.00", "100,00"),
        ("1718.05.1.1.00.00", "60,00"),
        ("1718.05.3.1.00.00", "50,00"),
        ("1718.05.4.1.00.00", "30,00"),
        ("1718.05.2.1.00.00", "20,00"),
        ("1321.01.0.1.00.00", "40,00"),
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
                    VALUES (:ano, '8', :codigo, '', 'Receita sintetica', :valor, '0,00')
                    """
                ),
                {"ano": str(ano), "codigo": codigo, "valor": valor},
            )
        conn.commit()
        rows = conn.execute(
            text(
                """
                SELECT grupo_fonte, sum(arrecadado_receita) AS total
                FROM analytics.fct_educacao_origem_recursos_metricas
                WHERE portal_slug = 'porciuncula_prefeitura' AND ano = :ano
                GROUP BY grupo_fonte
                """
            ),
            {"ano": ano},
        ).fetchall()
    finally:
        limpar()

    assert {r.grupo_fonte: r.total for r in rows} == {
        "fundeb": Decimal("400.00"),
        "fundeb_complementacao_uniao": Decimal("100.00"),
        "salario_educacao": Decimal("60.00"),
        "pnae": Decimal("50.00"),
        "pnate": Decimal("30.00"),
        "outros_fnde": Decimal("20.00"),
        "outras_receitas": Decimal("40.00"),
    }
