"""Conexão restrita ao banco local: análises nunca rodam contra produção sem autorização explícita."""

from urllib.parse import urlparse

import psycopg2
from psycopg2.extensions import connection as Connection

HOSTS_LOCAIS = frozenset({"localhost", "127.0.0.1", "::1", "postgres"})


def host_e_local(database_url: str) -> bool:
    return (urlparse(database_url).hostname or "") in HOSTS_LOCAIS


def conectar(database_url: str, permitir_remoto: bool = False) -> Connection:
    if not permitir_remoto and not host_e_local(database_url):
        raise SystemExit(
            "Recusado: DATABASE_URL não aponta para o banco local. "
            "Use --permitir-remoto apenas com autorização explícita."
        )
    conexao = psycopg2.connect(database_url)
    conexao.set_session(readonly=True, autocommit=True)
    return conexao
