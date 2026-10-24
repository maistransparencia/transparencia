import os
import subprocess
import sys
from pathlib import Path
from typing import Iterator
from urllib.parse import urlparse

import pytest
import testing.postgresql
from sqlalchemy import text
from sqlalchemy.engine import Connection
from sqlmodel import create_engine

sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent))

from scripts.build_test_db import create_raw_schema  # noqa: E402

os.environ.setdefault("PORTAL_SLUG", "porciuncula_prefeitura")


_PROFILES_DIR = str(Path(__file__).parent / "transform")


@pytest.fixture
def fiorilli_synthetic_payload() -> dict[str, list[dict]]:
    """Fixture sintética local para testes de extratores Fiorilli sem requisições à rede."""
    return {
        "DespesasPorOrgao": [
            {
                "ano": 2024,
                "empresa": "1",
                "codigo": "01",
                "descricao": "GABINETE DO PREFEITO",
                "empenhado": "10000.00",
                "liquidado": "9000.00",
                "pago": "8000.00",
                "dotac": "20000.00",
                "altdo": "0.00",
                "dotacao_atualizada": "20000.00",
            }
        ],
        "DespesasGerais": [
            {
                "ano": 2024,
                "empresa": "1",
                "numero": "1001",
                "pkemp": "1001",
                "descricao": "SERVIÇOS DE TECNOLOGIA",
                "empenhado": "15000.00",
                "liquidado": "15000.00",
                "pago": "15000.00",
            }
        ],
        "ReceitaOrcamentaria": [
            {
                "ano": 2026,
                "empresa": "1",
                "codigo": "1112",
                "descricao": "IPTU",
                "previsto": "500000.00",
                "arrecadado": "450000.00",
                "fonte_stn": "15000000",
            }
        ],
        "Licitacoes": [
            {
                "ano": 2024,
                "empresa": "1",
                "numero": "001/2024",
                "licit": "001/2024",
                "modalidade": "pregao_eletronico",
                "objeto": "AQUISIÇÃO DE EQUIPAMENTOS",
                "valor": "75000.00",
                "situacao": "homologada",
            }
        ],
        "Contratos": [
            {
                "ano": 2024,
                "empresa": "1",
                "numero": "CONTRATO-01",
                "codigo": "CONTRATO-01",
                "proclic": "001/2024",
                "valcon": "75000.00",
                "vigeni": "01/01/2024",
                "vigenf": "31/12/2024",
            }
        ],
        "Servidores": [
            {
                "ano": 2024,
                "empresa": "1",
                "mes": "01",
                "matricula": "12345",
                "registro": "12345",
                "nome": "SERVIDOR EXEMPLO",
                "cargo": "ANALISTA",
                "proventos": "5000.00",
                "remuneracao": "4500.00",
            }
        ],
        "EmendasImpositivasArt166A": [
            {
                "ano": 2024,
                "empresa": "1",
                "numero": "EMENDA-01",
                "descricao": "REFORÇO NA ATENÇÃO BÁSICA",
                "valor": "50000.00",
            }
        ],
        "Transf": [
            {
                "ano": 2024,
                "empresa": "1",
                "codigo": "TR-01",
                "mes": "01",
                "entidade_pagadora": "FPM",
                "entidade_recebedora": "PREFEITURA",
                "repasse": "120000.00",
                "devolucao": "0.00",
            }
        ],
    }


@pytest.fixture
def mock_fiorilli_fetch(monkeypatch, fiorilli_synthetic_payload):
    """Interceptador que impede qualquer chamada HTTP e retorna dados sintéticos locais."""

    def _fake_fetch(url: str) -> list[dict]:
        for listagem, rows in fiorilli_synthetic_payload.items():
            if f"Listagem={listagem}" in url or listagem.lower() in url.lower():
                return [dict(r) for r in rows]
        return []

    monkeypatch.setattr("elt.extract.base.fetch", _fake_fetch)
    return _fake_fetch


@pytest.fixture
def sigcorp_synthetic_payload(fiorilli_synthetic_payload):
    """Alias retrocompatível para fiorilli_synthetic_payload."""
    return fiorilli_synthetic_payload


@pytest.fixture
def mock_sigcorp_fetch(mock_fiorilli_fetch):
    """Alias retrocompatível para mock_fiorilli_fetch."""
    return mock_fiorilli_fetch


def _run_dbt(pg_url: str, *args: str) -> None:
    u = urlparse(pg_url)
    venv_dbt = Path(__file__).parent / ".venv" / "bin" / "dbt"
    dbt_bin = str(venv_dbt) if venv_dbt.exists() else "dbt"
    env = {
        **os.environ,
        "DBT_HOST": u.hostname or "",
        "DBT_PORT": str(u.port or 5432),
        "DBT_USER": u.username or "",
        "DBT_PASSWORD": u.password or "",
        "DBT_DBNAME": u.path.lstrip("/"),
        "DBT_ALLOW_EXPERIMENTAL_ADAPTERS": "true",
    }
    subprocess.run(
        [dbt_bin, *args, "--profiles-dir", _PROFILES_DIR, "--project-dir", _PROFILES_DIR],
        env=env,
        check=True,
        capture_output=True,
    )


@pytest.fixture(scope="session")
def pg():
    with testing.postgresql.Postgresql() as pg:
        yield pg


@pytest.fixture(scope="session")
def engine(pg):
    pg_url = pg.url()
    eng_url = (
        pg_url.replace("postgresql://", "postgresql+psycopg2://", 1) if pg_url.startswith("postgresql://") else pg_url
    )
    eng = create_engine(eng_url)
    # Raw schema e tabelas derivadas de _sources.yml
    create_raw_schema(eng)
    # dbt cria staging/intermediate (views) em public e marts (views em test_mode) em analytics
    _run_dbt(pg_url, "deps")
    _run_dbt(pg_url, "seed")
    _run_dbt(pg_url, "run", "--vars", '{"test_mode": true}')
    return eng


@pytest.fixture
def conn(engine) -> Iterator[Connection]:
    with engine.connect() as connection:
        connection.execute(text("SET search_path = analytics, raw_porciuncula_prefeitura, public"))
        yield connection
        connection.rollback()
