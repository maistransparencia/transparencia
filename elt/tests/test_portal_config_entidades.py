"""Testes do suporte a nomes alternativos de entidades nos portais."""

from elt.core.config import PortalConfig


def test_nomes_entidade_inclui_alternativos_do_portal_natividade():
    config = PortalConfig.load("natividade_prefeitura")
    assert config.nomes_entidade("5", "FUNDO MUNICIPAL DE EDUCAÇÃO E CULTURA") == [
        "FUNDO MUNICIPAL DE EDUCAÇÃO E CULTURA",
        "FUNDO MUNICIPAL DE EDUCAÇÃO",
    ]


def test_nomes_entidade_sem_alternativos_devolve_so_o_nome_do_seed():
    config = PortalConfig.load("natividade_prefeitura")
    assert config.nomes_entidade("1", "prefeitura municipal de natividade") == ["PREFEITURA MUNICIPAL DE NATIVIDADE"]
