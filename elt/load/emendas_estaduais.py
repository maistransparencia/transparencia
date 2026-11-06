"""Carregador das emendas estaduais no schema raw único da fonte (`raw_emendas_estaduais`)."""

import logging
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection, Engine

from elt.core.db import Connectable, upsert

logger = logging.getLogger(__name__)

SCHEMA = "raw_emendas_estaduais"
TABELA_DETALHAMENTO = "emendas_detalhamento"
TABELA_ARQUIVOS = "arquivos_fonte"
TABELA_EXECUCAO = "execucao_emendas"

CHAVE_DETALHAMENTO = ["codigo_fonte", "nome_arquivo", "identificador"]
CHAVE_ARQUIVOS = ["codigo_fonte", "nome_arquivo"]
CHAVE_EXECUCAO = ["codigo_fonte", "nome_arquivo", "identificador"]


def ensure_emendas_estaduais_tables(engine: Connectable, schema: str = SCHEMA) -> None:
    """Garante as tabelas raw: uma linha por emenda de cada arquivo de detalhamento, uma por emenda de cada relatório
    de execução (somada, com a posição do relatório) e uma por arquivo coletado.

    A fonte é identificada por `codigo_fonte` (configuração por Estado), nunca pelo nome do Estado.
    `arquivos_fonte` guarda o órgão, a página oficial, o nome e a data de cada arquivo para a tela mostrar a origem.
    """
    ddl = f"""
    CREATE SCHEMA IF NOT EXISTS "{schema}";
    CREATE TABLE IF NOT EXISTS "{schema}"."{TABELA_ARQUIVOS}" (
        codigo_fonte TEXT NOT NULL,
        nome_arquivo TEXT NOT NULL,
        uf TEXT NOT NULL,
        orgao_publicador TEXT NOT NULL,
        url_pagina TEXT NOT NULL,
        url_arquivo TEXT NOT NULL,
        tipo_arquivo TEXT NOT NULL,
        ano INTEGER,
        data_arquivo DATE,
        fase TEXT,
        coletado_em TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (codigo_fonte, nome_arquivo)
    );
    CREATE TABLE IF NOT EXISTS "{schema}"."{TABELA_DETALHAMENTO}" (
        codigo_fonte TEXT NOT NULL,
        nome_arquivo TEXT NOT NULL,
        identificador TEXT NOT NULL,
        numero_emenda TEXT NOT NULL,
        autor TEXT,
        valor NUMERIC,
        objeto TEXT,
        beneficiario TEXT,
        municipio TEXT,
        funcao TEXT,
        unidade_orcamentaria TEXT,
        modalidade TEXT NOT NULL,
        area TEXT NOT NULL,
        PRIMARY KEY (codigo_fonte, nome_arquivo, identificador)
    );
    CREATE TABLE IF NOT EXISTS "{schema}"."{TABELA_EXECUCAO}" (
        codigo_fonte TEXT NOT NULL,
        nome_arquivo TEXT NOT NULL,
        identificador TEXT NOT NULL,
        posicao_ano INTEGER NOT NULL,
        posicao_mes INTEGER NOT NULL,
        dotacao_inicial NUMERIC,
        empenhado NUMERIC,
        liquidado NUMERIC,
        pago NUMERIC,
        PRIMARY KEY (codigo_fonte, nome_arquivo, identificador)
    );
    """
    if isinstance(engine, Engine):
        with engine.begin() as conn:
            conn.execute(text(ddl))
    elif isinstance(engine, Connection):
        engine.execute(text(ddl))


def load_arquivos_fonte(db: Connectable, rows: list[dict[str, Any]], schema: str = SCHEMA) -> int:
    if not rows:
        return 0
    return upsert(db, TABELA_ARQUIVOS, rows, CHAVE_ARQUIVOS, schema=schema)


def load_emendas_detalhamento(db: Connectable, rows: list[dict[str, Any]], schema: str = SCHEMA) -> int:
    if not rows:
        return 0
    return upsert(db, TABELA_DETALHAMENTO, rows, CHAVE_DETALHAMENTO, schema=schema)


def load_execucao_emendas(db: Connectable, rows: list[dict[str, Any]], schema: str = SCHEMA) -> int:
    if not rows:
        return 0
    return upsert(db, TABELA_EXECUCAO, rows, CHAVE_EXECUCAO, schema=schema)
