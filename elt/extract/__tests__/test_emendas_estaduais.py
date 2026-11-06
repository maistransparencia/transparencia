from decimal import Decimal
from types import SimpleNamespace

import pytest
from elt.extract.emendas_estaduais import (
    MODALIDADE_NAO_MAPEADA,
    EmendasEstaduaisError,
    FonteEmendaEstadual,
    PadroesArquivo,
    carregar_fontes,
    descobrir_arquivos,
    extract_and_load_fonte,
    ler_detalhamento,
    ler_execucao,
    parse_valor,
)

PAGINA_REAL = """
<a href="../img/docs/emendas/2026/base_detalhamento_emendas_impositivas_2026_govrj_09042026_1fase.csv">1ª fase</a>
<a href="../img/docs/emendas/2026/base_detalhamento_emendas_impositivas_2026_govrj_09042026_1fase.xlsx">xlsx</a>
<a href="../img/docs/emendas/2026/base_DetalhamentoEmendasImpositivas2026_govrj18082026 - 2fase.csv">2ª fase</a>
<a href="../img/docs/emendas/2026/4bi_Relatório de Execução Orçamentária e Financeira.csv">execução</a>
"""

CSV_REAL = (
    "﻿ Emenda;Identificador;Autor;Valor;UO;Função;Objeto;Beneficiário;Município;Modalidade\n"
    "650;11202606501;Luiz Paulo; R$ 100.000,00 ;18010-SEEDUC;04 - Administração;Implantar sala;Escola Municipal;Porciúncula;2 - Transferência Especial\n"
    "650;11202606502;Outra Autora; R$ 1.250,50 ;18010-SEEDUC;04 - Administração;Outro objeto;Escola;Porciúncula;1 - Execução Direta\n"
    ";;;;;;;;;\n"
)

EXECUCAO_REAL = (
    "\ufeff;;;;;;;;;;;Valores;;;\n"
    "posição;Sigla UO;Cod Ação;Tit Ação;Ano Fonte;Fonte RJ;Fonte STN;Autor;Cod. Emenda;Nº Empenho;Descrição;"
    "Dotação Inicial ;Empenhado ;Liquidado ;Pago \n"
    "abr/26;UO1;1;Ação A;1;148;500;Luiz Paulo;111;-;-;60.000,00;10.000,50;0,00;0,00\n"
    ";;2;Ação B;1;148;500;Luiz Paulo;111;-;-;40.000,00;5.000,00;0,00;0,00\n"
    ";;3;Ação C;1;148;500;Outra;222;-;-;1.000,00;0,00;0,00;0,00\n"
    "abr/26 Total;;;;;;;;;;;101.000,00;15.000,50;0,00;0,00\n"
    "Total Geral;;;;;;;;;;;101.000,00;15.000,50;0,00;0,00\n"
)


def _fonte_real() -> FonteEmendaEstadual:
    (fonte,) = carregar_fontes()
    return fonte


def _fonte_ficticia() -> FonteEmendaEstadual:
    """Outro Estado: outro separador, outra codificação, decimal em ponto, outros nomes de coluna e de modalidade."""
    return FonteEmendaEstadual(
        codigo_fonte="fonte_ficticia",
        uf="ZZ",
        orgao_publicador="Secretaria Fictícia da Fazenda",
        pagina_url="https://exemplo.test/emendas/",
        codificacao="latin-1",
        delimitador=",",
        separador_decimal=".",
        simbolo_moeda="$",
        arquivos={"detalhamento": PadroesArquivo(padrao_link="relatorio_final", padrao_ano=r"(?P<ano>20\d{2})")},
        areas_por_unidade={"orgao saude": "saude"},
        areas_por_funcao={"99": "educacao"},
        colunas={
            "unidade_orcamentaria": "Orgao executor",
            "funcao": "Area do gasto",
            "numero_emenda": "Numero",
            "identificador": "Codigo",
            "autor": "Parlamentar",
            "valor": "Montante",
            "modalidade": "Tipo de repasse",
            "municipio": "Cidade",
        },
        modalidades={"repasse livre": "transferencia_especial", "obra do governo": "execucao_direta"},
    )


def test_configuracao_real_declara_orgao_e_pagina_oficial():
    fonte = _fonte_real()
    assert fonte.codigo_fonte and fonte.orgao_publicador and fonte.pagina_url.startswith("https://")


def test_descobre_links_pela_pagina_com_data_ano_e_fase():
    arquivos = descobrir_arquivos(_fonte_real(), PAGINA_REAL)
    nomes = {a.nome_arquivo: a for a in arquivos}
    assert len(arquivos) == 3
    assert {a.tipo_arquivo for a in arquivos} == {"detalhamento", "execucao"}
    primeira = nomes["base_detalhamento_emendas_impositivas_2026_govrj_09042026_1fase.csv"]
    assert (primeira.ano, primeira.fase) == (2026, "1")
    assert str(primeira.data_arquivo) == "2026-04-09"
    assert primeira.url_arquivo.startswith("https://www.redeplan.")
    segunda = nomes["base_DetalhamentoEmendasImpositivas2026_govrj18082026 - 2fase.csv"]
    assert (str(segunda.data_arquivo), segunda.fase) == ("2026-08-18", "2")


def test_arquivo_sem_fase_no_nome_usa_a_fase_padrao_da_fonte():
    pagina = '<a href="../2026/base_detalhamento_2026_govrj_15012026.csv">janeiro</a>'
    (arquivo,) = descobrir_arquivos(_fonte_real(), pagina)
    assert arquivo.fase == "1"


def test_le_detalhamento_com_bom_valor_em_reais_e_modalidade_snake_case():
    linhas = ler_detalhamento(_fonte_real(), CSV_REAL.encode("utf-8"))
    assert [(linha["numero_emenda"], linha["autor"], linha["valor"], linha["modalidade"]) for linha in linhas] == [
        ("650", "Luiz Paulo", Decimal("100000.00"), "transferencia_especial"),
        ("650", "Outra Autora", Decimal("1250.50"), "execucao_direta"),
    ]
    assert linhas[0]["funcao"] == "04 - Administração"


def test_cabecalho_sem_coluna_obrigatoria_encerra_com_erro():
    with pytest.raises(EmendasEstaduaisError, match="identificador"):
        ler_detalhamento(_fonte_real(), "Emenda;Valor;Modalidade\n1;2;3".encode("utf-8"))


def test_modalidade_desconhecida_vira_nao_mapeada():
    csv = " Emenda;Identificador;Valor;Modalidade\n1;9;R$ 10,00;9 - Inventada\n"
    (linha,) = ler_detalhamento(_fonte_real(), csv.encode("utf-8"))
    assert linha["modalidade"] == MODALIDADE_NAO_MAPEADA


def test_valor_vazio_ou_invalido_fica_nulo_nunca_zero():
    fonte = _fonte_real()
    assert parse_valor(fonte, " R$ ") is None
    assert parse_valor(fonte, "abc") is None


def test_segunda_configuracao_ficticia_funciona_sem_nenhuma_mudanca_de_codigo():
    """Prova o desacoplamento: outro Estado só muda a configuração."""
    fonte = _fonte_ficticia()
    pagina = '<a href="/docs/2027/relatorio_final_15032027.csv">arquivo</a><a href="/docs/outro.csv">x</a>'
    (arquivo,) = descobrir_arquivos(fonte, pagina)
    assert (arquivo.ano, arquivo.url_arquivo) == (2027, "https://exemplo.test/docs/2027/relatorio_final_15032027.csv")

    conteudo = (
        "Numero,Codigo,Parlamentar,Montante,Tipo de repasse,Cidade,Orgao executor,Area do gasto\n"
        "7,A-1,Fulana,$1250.50,3 - Repasse livre,Cidade X,Orgao Saude,01 - Qualquer\n"
        "8,A-2,Beltrana,$10.00,3 - Repasse livre,Cidade X,Outro orgao,99 - Ensino\n"
        "9,A-3,Sicrana,$10.00,3 - Repasse livre,Cidade X,Outro orgao,01 - Qualquer\n"
    )
    linha, por_funcao, sem_regra = ler_detalhamento(fonte, conteudo.encode("latin-1"))
    assert linha["codigo_fonte"] == "fonte_ficticia"
    assert (linha["numero_emenda"], linha["identificador"], linha["valor"]) == ("7", "A-1", Decimal("1250.50"))
    assert linha["modalidade"] == "transferencia_especial"
    assert linha["objeto"] is None
    assert linha["area"] == "saude"  # pela unidade orçamentária
    assert por_funcao["area"] == "educacao"  # pelo código da função (99)
    assert sem_regra["area"] == "outras"


def test_fonte_sem_link_de_detalhamento_na_pagina_nao_grava_nada():
    fonte = _fonte_ficticia()
    with pytest.raises(EmendasEstaduaisError, match="Nenhum arquivo"):
        extract_and_load_fonte(fonte, None, baixar=lambda url: SimpleNamespace(text="<html></html>", content=b""))


def test_extrai_validando_sem_gravar_quando_nao_ha_banco():
    fonte = _fonte_real()

    def baixar(url: str):
        conteudo = EXECUCAO_REAL if "Execu" in url else CSV_REAL
        return SimpleNamespace(text=PAGINA_REAL, content=conteudo.encode("utf-8"))

    assert extract_and_load_fonte(fonte, None, baixar=baixar) == 4


def test_remove_caractere_nulo_do_texto():
    csv = " Emenda;Identificador;Valor;Modalidade;Objeto\n1;9;R$ 10,00;4 - Fundo a Fundo;texto\x00 com nulo\n"
    (linha,) = ler_detalhamento(_fonte_real(), csv.encode("utf-8"))
    assert linha["objeto"] == "texto com nulo"


def test_area_da_configuracao_real_pela_unidade_e_pela_funcao_sem_olhar_o_texto():
    csv = (
        " Emenda;Identificador;Valor;UO;Função;Objeto;Modalidade\n"
        "1;a;R$ 1,00;18010-SEEDUC;04-Administração;Reforma de hospital;4 - Fundo a Fundo\n"
        "2;b;R$ 1,00;57010-SEGOV;10-Saúde;Qualquer coisa;4 - Fundo a Fundo\n"
        "3;c;R$ 1,00;57010-SEGOV;04-Administração;Sala em escola municipal;4 - Fundo a Fundo\n"
    )
    areas = [linha["area"] for linha in ler_detalhamento(_fonte_real(), csv.encode("utf-8"))]
    assert areas == ["educacao", "saude", "outras"]


def test_le_execucao_somando_acoes_da_mesma_emenda_e_ignorando_totais():
    fonte = _fonte_real()
    linhas = ler_execucao(fonte, fonte.arquivos["execucao"], EXECUCAO_REAL.encode("utf-8"))
    por_id = {linha["identificador"]: linha for linha in linhas}
    assert set(por_id) == {"111", "222"}
    assert por_id["111"]["dotacao_inicial"] == Decimal("100000.00")
    assert por_id["111"]["empenhado"] == Decimal("15000.50")
    assert (por_id["111"]["posicao_ano"], por_id["111"]["posicao_mes"]) == (2026, 4)
    assert por_id["222"]["pago"] == Decimal("0.00")


def test_posicao_aceita_mes_numerico_e_mes_abreviado():
    fonte = _fonte_real()
    conteudo = EXECUCAO_REAL.replace("abr/26;UO1", "8 / 2026;UO1").replace("abr/26 Total", "8 / 2026 Total")
    (a, _) = ler_execucao(fonte, fonte.arquivos["execucao"], conteudo.encode("utf-8"))
    assert (a["posicao_ano"], a["posicao_mes"]) == (2026, 8)


def test_execucao_sem_cabecalho_configurado_encerra_com_erro():
    fonte = _fonte_real()
    with pytest.raises(EmendasEstaduaisError, match="Cabeçalho"):
        ler_execucao(fonte, fonte.arquivos["execucao"], b"a;b\n1;2\n")


def test_segunda_configuracao_ficticia_le_execucao_com_outros_cabecalhos():
    base = _fonte_ficticia()
    fonte = FonteEmendaEstadual(
        **{
            **base.__dict__,
            "colunas_execucao": {
                "identificador": "Codigo",
                "posicao": "Periodo",
                "dotacao_inicial": "Previsto",
                "empenhado": "Empenho",
                "liquidado": "Liquido",
                "pago": "Quitado",
            },
        }
    )
    conteudo = "Periodo,Codigo,Previsto,Empenho,Liquido,Quitado\n3/2027,A-1,$100.00,$50.00,$20.00,$10.00\n"
    (linha,) = ler_execucao(fonte, PadroesArquivo(padrao_link="x"), conteudo.encode("latin-1"))
    assert (linha["identificador"], linha["pago"], linha["posicao_ano"], linha["posicao_mes"]) == (
        "A-1",
        Decimal("10.00"),
        2027,
        3,
    )
