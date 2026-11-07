"""Testes do extrator da rede de saúde (respostas HTTP mockadas)."""

import json
from datetime import date
from unittest.mock import MagicMock, patch

import pytest
import requests
from elt.extract.saude_rede import (
    SaudeRedeExtractor,
    agregar_leitos,
    agregar_populacao,
    agregar_profissionais,
    competencias_do_ano,
    competencias_recentes,
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


def test_leitos_ilegiveis_ficam_vazios_e_nao_zero():
    registros = [
        {"tp_leito": "1 - CIRURGICO", "qt_existente": None, "qt_sus": "x"},
        {"tp_leito": "2 - CLINICO", "qt_existente": "4", "qt_sus": None},
        {"tp_leito": "2 - CLINICO", "qt_existente": "oi", "qt_sus": "2"},
    ]
    cirurgico, clinico = agregar_leitos("p", 202512, "2026-01-01", registros)
    assert (cirurgico["total_leitos_existentes"], cirurgico["total_leitos_sus"]) == ("", "")
    assert (clinico["total_leitos_existentes"], clinico["total_leitos_sus"]) == ("4", "2")


def test_vinculos_sem_nome_nao_viram_zero_profissionais():
    (linha,) = agregar_profissionais("p", 202512, "2026-01-01", [{"no_profissional": ""}, {"no_profissional": None}])
    assert linha["total_vinculos"] == "2"
    assert linha["total_profissionais"] == ""
    assert linha["total_profissionais_sus"] == ""


def _sessao_sia_sih(sia_por_competencia, sih_por_competencia):
    """API falsa de SIA/SIH: 1 linha por página, páginas por `offset`."""
    chamadas = []

    def get(url, params=None, **_):
        chamadas.append((url, dict(params)))
        fonte = sia_por_competencia if "sia-procedimentos" in url else sih_por_competencia
        chave = "sia_procedimentos_ambulatoriais" if "sia-procedimentos" in url else "sih_procedimentos_hospitalares"
        linhas = fonte.get(params["nu_comp"], [])
        return _resposta({chave: linhas[params["offset"] : params["offset"] + 1]})

    sessao = MagicMock()
    sessao.get.side_effect = get
    return sessao, chamadas


def test_extract_producao_soma_por_competencia_filtra_por_nu_comp_e_nao_usa_nu_ano():
    sia = {202601: [{"qt_procedimento": 10}, {"qt_procedimento": 5}, {"qt_procedimento": 1}]}
    sih = {202601: [{"qt_procedimento": 2}], 202602: [{"qt_procedimento": 3}]}
    sessao, chamadas = _sessao_sia_sih(sia, sih)
    extrator = SaudeRedeExtractor(min_interval_seconds=0)
    with patch("elt.extract.saude_rede.requests.Session", return_value=sessao):
        resultado = extrator.extract_producao("p", 3304102, [202601, 202602])

    assert [
        (linha["competencia"], linha["total_procedimentos_ambulatoriais"]) for linha in resultado["sia_competencia"]
    ] == [("202601", "16")]
    assert [(linha["competencia"], linha["total_internacoes"]) for linha in resultado["sih_competencia"]] == [
        ("202601", "2"),
        ("202602", "3"),
    ]
    for _, params in chamadas:
        assert params["co_ibge"] == "330410" and "nu_comp" in params and "nu_ano" not in params


def test_extract_producao_sih_sem_resposta_nao_gera_linha():
    sessao, _ = _sessao_sia_sih({202601: [{"qt_procedimento": 4}]}, {})
    extrator = SaudeRedeExtractor(min_interval_seconds=0)
    with patch("elt.extract.saude_rede.requests.Session", return_value=sessao):
        resultado = extrator.extract_producao("p", 3304102, [202601])
    assert resultado["sih_competencia"] == []
    assert resultado["sia_competencia"][0]["total_procedimentos_ambulatoriais"] == "4"


def test_competencias_recentes_sao_as_fechadas_sem_o_mes_corrente():
    assert competencias_recentes(4, date(2026, 11, 7)) == [202610, 202609, 202608, 202607]
    assert competencias_recentes(3, date(2026, 2, 1)) == [202601, 202512, 202511]


def test_paginas_aceita_linhas_identicas_em_paginas_vizinhas():
    linha = {"qt_procedimento": 1}
    sessao, _ = _sessao_sia_sih({202601: [linha, linha]}, {})
    extrator = SaudeRedeExtractor(min_interval_seconds=0)
    assert len(extrator._paginas("/sia-procedimentos", {"nu_comp": 202601}, sessao)) == 2


def test_paginas_falha_quando_a_api_ignora_offset():
    resposta = _resposta({"sia_procedimentos_ambulatoriais": [{"qt_procedimento": 1}]})
    sessao = MagicMock()
    sessao.get.return_value = resposta
    extrator = SaudeRedeExtractor(min_interval_seconds=0)
    with pytest.raises(RuntimeError, match="repetiu a mesma página"):
        extrator._paginas("/sia-procedimentos", {"nu_comp": 202601}, sessao)


def test_paginas_falha_ao_atingir_o_limite_de_paginas():
    def get(url, params=None, **_):
        return _resposta({"sia_procedimentos_ambulatoriais": [{"qt_procedimento": params["offset"]}]})

    sessao = MagicMock()
    sessao.get.side_effect = get
    extrator = SaudeRedeExtractor(min_interval_seconds=0, maximo_paginas=5)
    with pytest.raises(RuntimeError, match="Limite de 5 páginas"):
        extrator._paginas("/sia-procedimentos", {"nu_comp": 202601}, sessao)


def test_falha_no_meio_da_paginacao_propaga_e_nao_devolve_dado_parcial():
    def get(url, params=None, **_):
        if params["offset"] == 2:
            raise requests.ConnectionError("queda")
        return _resposta({"sia_procedimentos_ambulatoriais": [{"qt_procedimento": params["offset"]}]})

    sessao = MagicMock()
    sessao.get.side_effect = get
    extrator = SaudeRedeExtractor(min_interval_seconds=0, max_retries=1)
    with patch("elt.extract.farmacia_sus.time.sleep"), pytest.raises(requests.ConnectionError):
        extrator._paginas("/sia-procedimentos", {"nu_comp": 202601}, sessao)


def test_extract_entrega_o_acumulado_a_cada_ano_concluido():
    leitos = {
        202412: [{"tp_leito": "1 - X", "qt_existente": 4, "qt_sus": 4}],
        202312: [{"tp_leito": "1 - X", "qt_existente": 3, "qt_sus": 3}],
    }
    profissionais = {202412: [{"no_profissional": "A"}], 202312: [{"no_profissional": "B"}]}
    populacao = {2024: [{"pop": 10}], 2023: [{"pop": 9}]}
    sessao, _ = _api(leitos, profissionais, populacao)
    recebidos = []
    extrator = SaudeRedeExtractor(min_interval_seconds=0)
    with patch("elt.extract.saude_rede.requests.Session", return_value=sessao):
        extrator.extract(
            "p",
            3304102,
            anos=[2023, 2024],
            ao_concluir_ano=lambda dados: recebidos.append({k: len(v) for k, v in dados.items()}),
        )
    assert [r["leitos_competencia"] for r in recebidos] == [1, 2]
    assert [r["profissionais_competencia"] for r in recebidos] == [1, 2]
    assert [r["populacao_residente"] for r in recebidos] == [1, 2]
