"""Testes do extrator da rede de saúde (respostas HTTP mockadas)."""

import json
from datetime import date
from unittest.mock import MagicMock, patch

from elt.extract.saude_rede import (
    SaudeRedeExtractor,
    agregar_leitos,
    agregar_populacao,
    agregar_profissionais,
    competencias_do_ano,
)


def _resposta(corpo):
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = corpo
    return resp


def _api(leitos_por_competencia, profissionais, populacao_por_ano):
    """API falsa: CNES devolve 1 linha por página (limit ignorado), `offset` é o número da página."""
    chamadas = []

    def get(url, params=None, **_):
        chamadas.append((url, dict(params)))
        pagina = params["offset"]
        if "cnes-leitos" in url:
            linhas = leitos_por_competencia.get(params["nu_comp"], [])
            return _resposta({"cnes_leitos": linhas[pagina : pagina + 1]})
        if "cnes-profissionais" in url:
            linhas = profissionais.get(params["nu_comp"], [])
            return _resposta({"cnes_profissionais": linhas[pagina : pagina + 1]})
        linhas = populacao_por_ano.get(params["ano"], [])
        return _resposta({"svsa_populacao_residente": linhas[pagina * params["limit"] :][: params["limit"]]})

    sessao = MagicMock()
    sessao.get.side_effect = get
    return sessao, chamadas


def test_competencias_do_ano_nao_passam_do_mes_corrente():
    assert competencias_do_ano(2026, date(2026, 3, 10)) == [202603, 202602, 202601]
    assert competencias_do_ano(2024, date(2026, 3, 10))[0] == 202412
    assert competencias_do_ano(2027, date(2026, 3, 10)) == []


def test_agregar_profissionais_nao_grava_nome_de_pessoa():
    registros = [
        {"no_profissional": "Maria  Silva", "st_atende_sus": "SIM"},
        {"no_profissional": "MARIA SILVA", "st_atende_sus": "NÃO"},
        {"no_profissional": "João Souza", "st_atende_sus": "NÃO"},
    ]
    (linha,) = agregar_profissionais("p", 202512, "2026-01-01", registros)
    assert linha["total_vinculos"] == "3"
    assert linha["total_profissionais"] == "2"
    assert linha["total_profissionais_sus"] == "1"
    assert "SILVA" not in json.dumps(linha).upper()
    assert agregar_profissionais("p", 202512, "2026-01-01", []) == []


def test_agregar_leitos_soma_por_tipo():
    registros = [
        {"tp_leito": "2  - ESPEC - CLINICO", "qt_existente": 10, "qt_sus": 8},
        {"tp_leito": "2 - ESPEC - CLINICO", "qt_existente": 5, "qt_sus": 0},
        {"tp_leito": "5  - PEDIATRICO", "qt_existente": 3, "qt_sus": 3},
    ]
    linhas = agregar_leitos("p", 202512, "d", registros)
    assert {(linha["tipo_leito"], linha["total_leitos_existentes"], linha["total_leitos_sus"]) for linha in linhas} == {
        ("2 - ESPEC - CLINICO", "15", "8"),
        ("5 - PEDIATRICO", "3", "3"),
    }


def test_agregar_populacao_soma_idades_e_sexos_e_vazio_nao_vira_zero():
    assert agregar_populacao("p", 2025, "d", [{"pop": 10}, {"pop": 5}])[0]["total_populacao"] == "15"
    assert agregar_populacao("p", 2026, "d", []) == []


def test_extract_filtra_sempre_e_converte_codigo_ibge():
    leitos = {
        202512: [
            {"tp_leito": "1 - X", "qt_existente": 4, "qt_sus": 4},
            {"tp_leito": "2 - Y", "qt_existente": 6, "qt_sus": 0},
        ]
    }
    profissionais = {
        202512: [{"no_profissional": "A", "st_atende_sus": "SIM"}, {"no_profissional": "B", "st_atende_sus": "SIM"}]
    }
    populacao = {2025: [{"pop": 1000}]}
    sessao, chamadas = _api(leitos, profissionais, populacao)
    extrator = SaudeRedeExtractor(min_interval_seconds=0)
    with patch("elt.extract.saude_rede.requests.Session", return_value=sessao):
        resultado = extrator.extract("p", 3304102, anos=[2025])

    assert sum(int(linha["total_leitos_existentes"]) for linha in resultado["leitos_competencia"]) == 10
    assert resultado["profissionais_competencia"][0]["total_profissionais"] == "2"
    assert resultado["populacao_residente"][0]["total_populacao"] == "1000"
    for url, params in chamadas:
        if "svsa-populacao" in url:
            assert params["cod_mun"] == "3304102" and params["ano"] == 2025
        else:
            assert params["co_ibge"] == "330410" and "nu_comp" in params
    assert max(p["offset"] for u, p in chamadas if "cnes-leitos" in u) >= 2


def test_extract_ano_sem_resposta_do_cnes_nao_gera_linha():
    sessao, _ = _api({}, {}, {2025: [{"pop": 10}]})
    extrator = SaudeRedeExtractor(min_interval_seconds=0)
    with patch("elt.extract.saude_rede.requests.Session", return_value=sessao):
        resultado = extrator.extract("p", 3304102, anos=[2025])
    assert resultado["leitos_competencia"] == []
    assert resultado["profissionais_competencia"] == []
    assert resultado["populacao_residente"][0]["total_populacao"] == "10"
