"""Mede o tempo de leitura de cada modelo do schema analytics (tabelas e views)."""

import json
import statistics
from pathlib import Path

from psycopg2 import sql
from psycopg2.extensions import connection as Connection

SCHEMA = "analytics"
LIMITE_REGRESSAO = 1.25
MINIMO_ABSOLUTO_MS = 5.0


def listar_modelos(conexao: Connection) -> list[dict]:
    with conexao.cursor() as cursor:
        cursor.execute(
            """
            select c.relname, case c.relkind when 'v' then 'view' else 'tabela' end
            from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = %s and c.relkind in ('r', 'v')
              and c.relname not like 'seed\\_%%'
            order by c.relname
            """,
            (SCHEMA,),
        )
        return [{"modelo": nome, "tipo": tipo} for nome, tipo in cursor.fetchall()]


def possui_portal_slug(conexao: Connection, modelo: str) -> bool:
    with conexao.cursor() as cursor:
        cursor.execute(
            "select 1 from information_schema.columns where table_schema = %s and table_name = %s and column_name = 'portal_slug'",
            (SCHEMA, modelo),
        )
        return cursor.fetchone() is not None


def primeiro_portal(conexao: Connection) -> str | None:
    with conexao.cursor() as cursor:
        cursor.execute(
            sql.SQL("select portal_slug from {}.dim_portais order by portal_slug limit 1").format(
                sql.Identifier(SCHEMA)
            )
        )
        linha = cursor.fetchone()
        return linha[0] if linha else None


def tempo_execucao_ms(conexao: Connection, consulta: sql.Composable, parametros: tuple = ()) -> tuple[float, int]:
    """Executa EXPLAIN ANALYZE e devolve (tempo total em ms, linhas do nó raiz)."""
    with conexao.cursor() as cursor:
        cursor.execute(sql.SQL("explain (analyze, format json) ") + consulta, parametros)
        plano = cursor.fetchone()[0][0]
    return plano["Execution Time"], plano["Plan"].get("Actual Rows", 0)


def medir_modelo(conexao: Connection, modelo: dict, portal: str | None, repeticoes: int) -> dict:
    tabela = sql.SQL("{}.{}").format(sql.Identifier(SCHEMA), sql.Identifier(modelo["modelo"]))
    completo = sql.SQL("select count(*) from ") + tabela
    medicoes_completas = [tempo_execucao_ms(conexao, completo)[0] for _ in range(repeticoes)]
    resultado = {
        "tipo": modelo["tipo"],
        "tempo_completo_ms": round(statistics.median(medicoes_completas), 3),
        "tempo_portal_ms": None,
    }
    if portal and possui_portal_slug(conexao, modelo["modelo"]):
        filtrado = sql.SQL("select count(*) from ") + tabela + sql.SQL(" where portal_slug = %s")
        medicoes_portal = [tempo_execucao_ms(conexao, filtrado, (portal,))[0] for _ in range(repeticoes)]
        resultado["tempo_portal_ms"] = round(statistics.median(medicoes_portal), 3)
    return resultado


def medir_todos(conexao: Connection, repeticoes: int = 3) -> dict[str, dict]:
    portal = primeiro_portal(conexao)
    return {m["modelo"]: medir_modelo(conexao, m, portal, repeticoes) for m in listar_modelos(conexao)}


def comparar(
    antes: dict[str, dict],
    depois: dict[str, dict],
    limite: float = LIMITE_REGRESSAO,
    minimo_absoluto_ms: float = MINIMO_ABSOLUTO_MS,
) -> list[dict]:
    """Compara duas medições; regressão = cresceu mais que `limite` vezes e pelo menos `minimo_absoluto_ms`.

    O piso absoluto evita marcar como regressão variações de frações de milissegundo, que são ruído.
    """

    def linha(modelo: str) -> dict:
        tempo_antes = antes[modelo]["tempo_completo_ms"]
        tempo_depois = depois[modelo]["tempo_completo_ms"]
        razao = tempo_depois / tempo_antes if tempo_antes > 0 else None
        return {
            "modelo": modelo,
            "tipo_antes": antes[modelo]["tipo"],
            "tipo_depois": depois[modelo]["tipo"],
            "tempo_antes_ms": tempo_antes,
            "tempo_depois_ms": tempo_depois,
            "razao": razao,
            "regressao": razao is not None and razao > limite and tempo_depois - tempo_antes >= minimo_absoluto_ms,
        }

    return sorted(
        (linha(modelo) for modelo in sorted(set(antes) & set(depois))),
        key=lambda item: item["razao"] or 0,
        reverse=True,
    )


def salvar(medicoes: dict[str, dict], caminho: Path) -> None:
    caminho.write_text(json.dumps(medicoes, indent=2, ensure_ascii=False, sort_keys=True), encoding="utf-8")


def carregar(caminho: Path) -> dict[str, dict]:
    return json.loads(caminho.read_text(encoding="utf-8"))
