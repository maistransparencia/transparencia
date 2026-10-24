"""Testes do carregador da Farmácia SUS."""

import json

from elt.load.farmacia_sus import load_farmacia_sus_coletas, load_farmacia_sus_dir, load_farmacia_sus_estoque
from sqlalchemy import text

_SCHEMA = "raw_farmacia_sus"


def _linha(portal, id_registro):
    return {"portal_slug": portal, "id_registro": id_registro, "nome_medicamento": "X"}


def _linha_dia(portal, id_registro, data_posicao, sigla=None):
    return {**_linha(portal, id_registro), "data_posicao_estoque": data_posicao, "sigla_sistema_origem": sigla}


def _contar(engine, tabela, portal):
    with engine.connect() as conn:
        return conn.execute(
            text(f"SELECT count(*) FROM {_SCHEMA}.{tabela} WHERE portal_slug = :p"), {"p": portal}
        ).scalar()


def _limpar(engine, portal):
    with engine.begin() as conn:
        for tabela in ("estoque_medicamentos", "coletas"):
            conn.execute(text(f"DELETE FROM {_SCHEMA}.{tabela} WHERE portal_slug = :p"), {"p": portal})


def test_estoque_reexecucao_no_mesmo_dia_nao_duplica_e_registra_sigla(engine):
    linhas = [_linha_dia("portal_a", "1", "2026-10-01", "hor")]
    load_farmacia_sus_estoque(engine, linhas, "portal_a")
    load_farmacia_sus_estoque(engine, linhas, "portal_a")

    with engine.connect() as conn:
        sigla = conn.execute(
            text(f"SELECT sigla_sistema_origem FROM {_SCHEMA}.estoque_medicamentos WHERE portal_slug='portal_a'")
        ).scalar()
    total = _contar(engine, "estoque_medicamentos", "portal_a")
    _limpar(engine, "portal_a")
    assert (total, sigla) == (1, "hor")


def test_estoque_novo_dia_preserva_anteriores_e_isola_portais(engine):
    load_farmacia_sus_estoque(engine, [_linha_dia("portal_a", "1", "2026-10-01")], "portal_a")
    load_farmacia_sus_estoque(engine, [_linha_dia("portal_a", "1", "2026-10-02")], "portal_a")
    load_farmacia_sus_estoque(engine, [_linha_dia("portal_b", "1", "2026-10-02")], "portal_b")
    load_farmacia_sus_estoque(engine, [], "portal_a")

    totais = (_contar(engine, "estoque_medicamentos", "portal_a"), _contar(engine, "estoque_medicamentos", "portal_b"))
    _limpar(engine, "portal_a")
    _limpar(engine, "portal_b")
    assert totais == (2, 1)


def test_coletas_acumulam_uma_linha_por_execucao(engine):
    coleta = {"portal_slug": "portal_f", "status_coleta": "sucesso"}
    load_farmacia_sus_coletas(engine, [{**coleta, "data_coleta": "2026-10-01T10:00:00"}], "portal_f")
    load_farmacia_sus_coletas(engine, [{**coleta, "data_coleta": "2026-10-01T11:00:00"}], "portal_f")
    load_farmacia_sus_coletas(engine, [{**coleta, "data_coleta": "2026-10-01T11:00:00"}], "portal_f")

    total = _contar(engine, "coletas", "portal_f")
    _limpar(engine, "portal_f")
    assert total == 2


def _colunas_pk(conn, schema, tabela):
    return sorted(
        linha[0]
        for linha in conn.execute(
            text(
                "SELECT a.attname FROM pg_constraint c JOIN pg_attribute a "
                "ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey) "
                f"WHERE c.conrelid = '{schema}.{tabela}'::regclass AND c.contype = 'p'"
            )
        )
    )


def test_ddl_migra_chaves_legadas_preservando_linhas_e_e_idempotente(engine):
    from elt.load.farmacia_sus import ensure_farmacia_sus_tables

    schema = "raw_farmacia_sus_legado"
    with engine.begin() as conn:
        conn.execute(text(f"DROP SCHEMA IF EXISTS {schema} CASCADE"))
        conn.execute(text(f"CREATE SCHEMA {schema}"))
        conn.execute(
            text(
                f"CREATE TABLE {schema}.estoque_medicamentos (portal_slug TEXT NOT NULL, id_registro TEXT NOT NULL, "
                "codigo_cnes TEXT, nome_medicamento TEXT, numero_lote TEXT, quantidade_estoque TEXT, "
                "data_posicao_estoque TEXT, data_coleta TEXT, PRIMARY KEY (portal_slug, id_registro))"
            )
        )
        conn.execute(
            text(
                f"CREATE TABLE {schema}.coletas (portal_slug TEXT NOT NULL, codigo_ibge6 TEXT, status_coleta TEXT, "
                "total_registros_estoque TEXT, total_registros_cnes TEXT, mensagem_erro TEXT, data_coleta TEXT, "
                "PRIMARY KEY (portal_slug))"
            )
        )
        conn.execute(
            text(
                f"INSERT INTO {schema}.estoque_medicamentos (portal_slug, id_registro, data_posicao_estoque) VALUES "
                "('p', '1', NULL), ('p', '2', '15/10/2026'), ('p', '3', '2026-10-15')"
            )
        )
        conn.execute(
            text(f"INSERT INTO {schema}.coletas (portal_slug, status_coleta, data_coleta) VALUES ('p', 'falha', NULL)")
        )

    try:
        ensure_farmacia_sus_tables(engine, schema=schema)
        ensure_farmacia_sus_tables(engine, schema=schema)
        with engine.connect() as conn:
            pks = {t: _colunas_pk(conn, schema, t) for t in ("estoque_medicamentos", "coletas")}
            posicao = conn.execute(text(f"SELECT data_posicao_estoque FROM {schema}.estoque_medicamentos")).fetchall()
            coleta = conn.execute(text(f"SELECT status_coleta, data_coleta FROM {schema}.coletas")).fetchall()
            colunas = conn.execute(
                text(
                    "SELECT count(*) FROM information_schema.columns WHERE table_schema = :s "
                    "AND table_name = 'estoque_medicamentos' AND column_name = 'sigla_sistema_origem'"
                ),
                {"s": schema},
            ).scalar()
    finally:
        with engine.begin() as conn:
            conn.execute(text(f"DROP SCHEMA IF EXISTS {schema} CASCADE"))

    assert pks == {
        "estoque_medicamentos": ["data_posicao_estoque", "id_registro", "portal_slug"],
        "coletas": ["data_coleta", "portal_slug"],
    }
    assert sorted(tuple(r) for r in posicao) == [("",), ("2026-10-15",)]
    assert [tuple(r) for r in coleta] == [("falha", "")]
    assert colunas == 1


def test_coleta_com_falha_preserva_estoque(engine):
    load_farmacia_sus_estoque(engine, [_linha("portal_c", "1")], "portal_c")
    load_farmacia_sus_coletas(
        engine,
        [{"portal_slug": "portal_c", "status_coleta": "falha", "data_coleta": "2026-10-01T10:00:00"}],
        "portal_c",
    )

    with engine.connect() as conn:
        total = conn.execute(
            text(f"SELECT count(*) FROM {_SCHEMA}.estoque_medicamentos WHERE portal_slug='portal_c'")
        ).scalar()
        status = conn.execute(
            text(f"SELECT status_coleta FROM {_SCHEMA}.coletas WHERE portal_slug='portal_c'")
        ).scalar()
        conn.execute(text(f"DELETE FROM {_SCHEMA}.coletas WHERE portal_slug='portal_c'"))
        conn.execute(text(f"DELETE FROM {_SCHEMA}.estoque_medicamentos WHERE portal_slug='portal_c'"))
        conn.commit()
    assert (total, status) == (1, "falha")


def test_estoque_grande_e_inserido_em_lotes(engine):
    linhas = [_linha("portal_d", str(i)) for i in range(12000)]
    assert load_farmacia_sus_estoque(engine, linhas, "portal_d") == 12000
    load_farmacia_sus_estoque(engine, [], "portal_d")


def test_dispatch_da_pasta_carrega_estoque_antes_da_coleta_e_avisa_arquivo_desconhecido(engine, tmp_path, caplog):
    (tmp_path / "coletas.json").write_text(
        json.dumps([{"portal_slug": "portal_e", "status_coleta": "sucesso", "data_coleta": "2026-10-01T10:00:00"}])
    )
    (tmp_path / "estoque_medicamentos.json").write_text(json.dumps([_linha("portal_e", "1")]))
    (tmp_path / "estabelecimentos_cnes.json").write_text(
        json.dumps([{"portal_slug": "portal_e", "codigo_cnes": "1", "nome_estabelecimento": "UBS"}])
    )
    (tmp_path / "desconhecido.json").write_text("[]")

    assert load_farmacia_sus_dir(engine, tmp_path, "portal_e") == 3

    with engine.begin() as conn:
        status = conn.execute(
            text(f"SELECT status_coleta FROM {_SCHEMA}.coletas WHERE portal_slug='portal_e'")
        ).scalar()
        for tabela in ("coletas", "estoque_medicamentos", "estabelecimentos_cnes"):
            conn.execute(text(f"DELETE FROM {_SCHEMA}.{tabela} WHERE portal_slug='portal_e'"))
    assert status == "sucesso"
    assert "desconhecido.json" in caplog.text
