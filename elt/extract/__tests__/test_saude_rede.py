"""Testes da população residente (única parte da rede de saúde que ainda vem da API)."""

from unittest.mock import MagicMock

import pytest
from elt.extract.saude_rede import TAMANHO_PAGINA, agregar_populacao, extrair_populacao


def _extrator(corpos_por_ano):
    extrator = MagicMock()
    extrator._request.side_effect = lambda _endpoint, params, _sessao: corpos_por_ano.get(params["ano"])
    return extrator


def test_agregar_populacao_soma_idades_e_sexos_e_vazio_nao_vira_zero():
    linhas = agregar_populacao("p", 2025, "d", [{"pop": "100"}, {"pop": 50}, {"pop": None}])
    assert linhas[0]["total_populacao"] == "150"
    assert agregar_populacao("p", 2025, "d", []) == []


def test_extrair_populacao_usa_codigo_de_7_digitos_uma_pagina_por_ano_e_ano_sem_resposta_nao_gera_linha():
    extrator = _extrator({2025: {"svsa_populacao_residente": [{"pop": 10}, {"pop": 5}]}})
    linhas = extrair_populacao("p", 3304102, [2025, 2026], extrator)
    chamadas = [c.args[1] for c in extrator._request.call_args_list]
    assert [(linha["ano"], linha["total_populacao"]) for linha in linhas] == [("2025", "15")]
    assert [(c["cod_mun"], c["ano"], c["offset"]) for c in chamadas] == [("3304102", 2025, 0), ("3304102", 2026, 0)]


def test_extrair_populacao_falha_quando_a_pagina_vem_cheia():
    cheia = {"svsa_populacao_residente": [{"pop": 1}] * TAMANHO_PAGINA}
    with pytest.raises(RuntimeError, match="truncada"):
        extrair_populacao("p", 3304102, [2025], _extrator({2025: cheia}))
