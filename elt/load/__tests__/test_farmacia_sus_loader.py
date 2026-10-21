"""Testes do carregador da Farmácia SUS."""

import json

from elt.load.farmacia_sus import load_farmacia_sus_coletas, load_farmacia_sus_dir, load_farmacia_sus_estoque
from sqlalchemy import text

_SCHEMA = "raw_farmacia_sus"


def _linha(portal, id_registro):
    return {"portal_slug": portal, "id_registro": id_registro, "nome_medicamento": "X"}


def test_estoque_substitui_retrato_apenas_do_portal(engine):
    with engine.begin() as conn:
        conn.execute(text(f"DELETE FROM {_SCHEMA}.estoque_medicamentos"))

    load_farmacia_sus_estoque(engine, [_linha("portal_a", "1"), _linha("portal_a", "2")], "portal_a")
    load_farmacia_sus_estoque(engine, [_linha("portal_b", "1")], "portal_b")
    load_farmacia_sus_estoque(engine, [_linha("portal_a", "3")], "portal_a")
    load_farmacia_sus_estoque(engine, [], "portal_b")

    with engine.connect() as conn:
        linhas = conn.execute(text(f"SELECT portal_slug, id_registro FROM {_SCHEMA}.estoque_medicamentos")).fetchall()
    assert [tuple(linha) for linha in linhas] == [("portal_a", "3")]


def test_coleta_com_falha_preserva_estoque(engine):
    load_farmacia_sus_estoque(engine, [_linha("portal_c", "1")], "portal_c")
    load_farmacia_sus_coletas(engine, [{"portal_slug": "portal_c", "status_coleta": "falha"}], "portal_c")

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
    (tmp_path / "coletas.json").write_text(json.dumps([{"portal_slug": "portal_e", "status_coleta": "sucesso"}]))
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
