"""Testes do carregador da rede de saúde."""

import json

from elt.load.saude_rede import load_saude_rede_dir
from sqlalchemy import text

_SCHEMA = "raw_saude_rede"
_TABELAS = ("leitos_competencia", "profissionais_competencia", "populacao_residente")


def _leito(portal, competencia, existentes="10"):
    return {
        "portal_slug": portal,
        "competencia": competencia,
        "tipo_leito": "pediatrico",
        "total_leitos_existentes": existentes,
        "total_leitos_sus": "5",
        "data_coleta": "2026-11-07",
    }


def _escrever(diretorio, tabela, linhas):
    (diretorio / f"{tabela}.json").write_text(json.dumps(linhas), encoding="utf-8")


def _contar(engine, tabela, portal):
    with engine.connect() as conn:
        return conn.execute(
            text(f"SELECT count(*) FROM {_SCHEMA}.{tabela} WHERE portal_slug = :p"), {"p": portal}
        ).scalar()


def _limpar(engine, portal):
    with engine.begin() as conn:
        for tabela in _TABELAS:
            conn.execute(text(f"DELETE FROM {_SCHEMA}.{tabela} WHERE portal_slug = :p"), {"p": portal})


def test_carga_e_idempotente_e_preserva_competencias_de_cargas_anteriores(engine, tmp_path):
    primeira = tmp_path / "primeira"
    segunda = tmp_path / "segunda"
    primeira.mkdir()
    segunda.mkdir()
    _escrever(primeira, "leitos_competencia", [_leito("portal_a", "202610")])
    _escrever(segunda, "leitos_competencia", [_leito("portal_a", "202611")])

    load_saude_rede_dir(engine, primeira, "portal_a")
    load_saude_rede_dir(engine, primeira, "portal_a")
    depois_de_repetir = _contar(engine, "leitos_competencia", "portal_a")
    load_saude_rede_dir(engine, segunda, "portal_a")
    depois_da_nova_competencia = _contar(engine, "leitos_competencia", "portal_a")
    _limpar(engine, "portal_a")

    assert (depois_de_repetir, depois_da_nova_competencia) == (1, 2)


def test_carga_atualiza_linha_existente_e_isola_portais(engine, tmp_path):
    _escrever(tmp_path, "leitos_competencia", [_leito("portal_a", "202610", "10")])
    load_saude_rede_dir(engine, tmp_path, "portal_a")
    _escrever(tmp_path, "leitos_competencia", [_leito("portal_a", "202610", "12")])
    load_saude_rede_dir(engine, tmp_path, "portal_a")
    _escrever(tmp_path, "leitos_competencia", [_leito("portal_b", "202610", "99")])
    load_saude_rede_dir(engine, tmp_path, "portal_b")

    with engine.connect() as conn:
        existentes = conn.execute(
            text(f"SELECT total_leitos_existentes FROM {_SCHEMA}.leitos_competencia WHERE portal_slug = 'portal_a'")
        ).scalar()
    totais = (_contar(engine, "leitos_competencia", "portal_a"), _contar(engine, "leitos_competencia", "portal_b"))
    _limpar(engine, "portal_a")
    _limpar(engine, "portal_b")

    assert existentes == "12"
    assert totais == (1, 1)
