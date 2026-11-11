"""Testes de integração do carregador raw do SIOPS: DDL real e upsert idempotente."""

from decimal import Decimal

import pytest
from sqlalchemy import text

from elt.load.siops import TABLE_NAME, ensure_siops_table, load_siops_indicadores

_SCHEMA = "raw_siops_teste_loader"


def _linha(portal: str, via: str, valor: Decimal | None) -> dict:
    return {
        "portal_slug": portal,
        "ano": 2024,
        "periodo": 6,
        "tipo_periodo": "anual",
        "via": via,
        "codigo_indicador": "3.2",
        "unidade": "percentual",
        "valor": valor,
        "coletado_em": "2026-11-06T12:00:00+00:00",
    }


@pytest.fixture
def conn(engine):
    """Conexão própria: o upsert reflete a tabela pelo engine, então o DDL precisa estar commitado."""
    with engine.begin() as limpeza:
        limpeza.execute(text(f'DROP SCHEMA IF EXISTS "{_SCHEMA}" CASCADE'))
    with engine.connect() as connection:
        yield connection
        connection.commit()
    with engine.begin() as limpeza:
        limpeza.execute(text(f'DROP SCHEMA IF EXISTS "{_SCHEMA}" CASCADE'))


def _contar(conn) -> int:
    return conn.execute(text(f'SELECT count(*) FROM "{_SCHEMA}"."{TABLE_NAME}"')).scalar_one()


def test_carga_do_siops_e_idempotente_e_isola_portais(conn):
    ensure_siops_table(conn, _SCHEMA)
    conn.commit()
    linhas = [
        _linha("porciuncula_prefeitura", "tabnet", Decimal("20.18")),
        _linha("porciuncula_prefeitura", "consulta_ano", Decimal("20.18")),
        _linha("natividade_prefeitura", "tabnet", None),
    ]

    assert load_siops_indicadores(conn, linhas, schema=_SCHEMA) == 3
    assert load_siops_indicadores(conn, linhas, schema=_SCHEMA) == 3
    assert _contar(conn) == 3

    atualizada = [_linha("porciuncula_prefeitura", "tabnet", Decimal("21.00"))]
    assert load_siops_indicadores(conn, atualizada, schema=_SCHEMA) == 1

    valores = dict(
        conn.execute(text(f'SELECT portal_slug || \'/\' || via, valor FROM "{_SCHEMA}"."{TABLE_NAME}"')).all()
    )
    assert valores["porciuncula_prefeitura/tabnet"] == Decimal("21.00")
    assert valores["porciuncula_prefeitura/consulta_ano"] == Decimal("20.18")
    assert valores["natividade_prefeitura/tabnet"] is None


def test_ensure_siops_table_repetido_nao_falha(conn):
    ensure_siops_table(conn, _SCHEMA)
    ensure_siops_table(conn, _SCHEMA)
    assert _contar(conn) == 0
