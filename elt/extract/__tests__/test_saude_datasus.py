"""Testes do extrator do DATASUS (FTP e `.dbc` falsos; nenhuma rede)."""

import ftplib
from datetime import date
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from elt.extract import saude_datasus as modulo
from elt.extract.saude_datasus import (
    ArquivoFonte,
    ClienteFtp,
    SaudeDatasusError,
    agregar_atendimentos_ambulatoriais,
    agregar_internacoes,
    agregar_leitos,
    agregar_profissionais,
    anos_da_populacao,
    arquivos_da_competencia,
    carregar_fontes,
    carregar_tipos_leito,
    competencias_do_pedido,
    competencias_dos_anos,
    competencias_recentes,
    registros_dos_municipios,
)

MUNICIPIOS = {"330430": "portal_a"}


def test_competencias_recentes_sao_as_fechadas_sem_o_mes_corrente():
    assert competencias_recentes(4, date(2026, 11, 7)) == [202610, 202609, 202608, 202607]
    assert competencias_recentes(2, date(2026, 1, 3)) == [202512, 202511]


def test_competencias_dos_anos_param_no_mes_fechado():
    assert competencias_dos_anos([2026], date(2026, 3, 10)) == [202602, 202601]
    assert competencias_dos_anos([2025, 2026], date(2026, 1, 2))[:2] == [202512, 202511]


def test_pedido_respeita_o_corte_de_ano_do_projeto(monkeypatch):
    monkeypatch.setattr(modulo, "ano_inicial_historico", lambda: 2023)
    assert competencias_do_pedido([202212, 202301, 202412], None) == [202301, 202412]
    assert competencias_do_pedido(None, [2022], date(2026, 11, 7)) == []


def test_sia_em_partes_casa_por_padrao_e_ignora_outra_uf_e_outro_mes():
    sia = carregar_fontes()[0].sia
    listagem = ["PARJ2512a.dbc", "PARJ2512b.dbc", "PARJ2512c.dbc", "PASP2512a.dbc", "PARJ2511a.dbc", "PARJ2512.dbf"]
    assert arquivos_da_competencia(listagem, sia, "RJ", 202512) == ["PARJ2512a.dbc", "PARJ2512b.dbc", "PARJ2512c.dbc"]
    assert arquivos_da_competencia(["parj2512A.DBC"], sia, "RJ", 202512) == ["parj2512A.DBC"]


def test_nome_do_arquivo_de_leitos_profissionais_e_internacoes():
    fonte = carregar_fontes()[0]
    assert arquivos_da_competencia(["LTRJ2605.dbc", "LTRJ2604.dbc"], fonte.leitos, "RJ", 202605) == ["LTRJ2605.dbc"]
    assert arquivos_da_competencia(["PFRJ2605.dbc"], fonte.profissionais, "RJ", 202605) == ["PFRJ2605.dbc"]
    assert arquivos_da_competencia(["RDRJ2512.dbc"], fonte.sih, "RJ", 202512) == ["RDRJ2512.dbc"]


def test_leitos_somam_por_tipo_e_traduzem_o_codigo_do_cnes():
    registros = [
        {"tipo_leito": "2", "leitos_existentes": 3, "leitos_sus": 3},
        {"tipo_leito": "2", "leitos_existentes": 55, "leitos_sus": 44},
        {"tipo_leito": "9", "leitos_existentes": "x", "leitos_sus": None},
    ]
    linhas = agregar_leitos("p", 202605, "d", registros, carregar_tipos_leito())
    assert [(i["tipo_leito"], i["total_leitos_existentes"], i["total_leitos_sus"]) for i in linhas] == [
        ("2 - ESPEC - CLINICO", "58", "47"),
        ("9", "", ""),
    ]


def test_profissionais_contam_pessoas_pelo_cns_e_nao_gravam_o_cns():
    registros = [
        {"pessoa": "700", "atende_sus": "1"},
        {"pessoa": "700", "atende_sus": "0"},
        {"pessoa": "701", "atende_sus": "0"},
        {"pessoa": "", "atende_sus": "1"},
    ]
    [linha] = agregar_profissionais("p", 202605, "d", registros, "1")
    assert (linha["total_vinculos"], linha["total_profissionais"], linha["total_profissionais_sus"]) == ("4", "2", "1")
    assert "700" not in str(linha) and "701" not in str(linha)


def test_profissionais_sem_nenhum_cns_ficam_sem_dado_e_nao_zero():
    [linha] = agregar_profissionais("p", 202605, "d", [{"pessoa": " ", "atende_sus": "1"}], "1")
    assert (linha["total_vinculos"], linha["total_profissionais"], linha["total_profissionais_sus"]) == ("1", "", "")
    assert agregar_profissionais("p", 202605, "d", [], "1") == []


def test_sia_soma_a_quantidade_aprovada_e_nao_a_produzida():
    """Conferência de 2025-12: `PA_QTDAPR` bate com a API (18.282); `PA_QTDPRO` daria 18.283."""
    campos = carregar_fontes()[0].sia.campos
    assert campos["quantidade"] == "PA_QTDAPR"
    linhas = [
        {"PA_UFMUN": "330430", "PA_CMP": "202512", "PA_QTDAPR": 18000, "PA_QTDPRO": 18001},
        {"PA_UFMUN": "330430", "PA_CMP": "202512", "PA_QTDAPR": 282, "PA_QTDPRO": 282},
    ]
    por_portal = registros_dos_municipios(iter(linhas), carregar_fontes()[0].sia, 202512, MUNICIPIOS)
    [saida] = agregar_atendimentos_ambulatoriais("portal_a", 202512, "d", por_portal["portal_a"])
    assert saida["total_procedimentos_ambulatoriais"] == "18282"


def test_filtro_por_municipio_competencia_e_nao_deixa_passar_campos_pessoais():
    arquivo = carregar_fontes()[0].profissionais
    linhas = [
        {
            "CODUFMUN": "330430",
            "COMPETEN": "202605",
            "CNS_PROF": "1",
            "PROF_SUS": "1",
            "NOMEPROF": "FULANO",
            "CPF_PROF": "9",
        },
        {"CODUFMUN": "330430", "COMPETEN": "202604", "CNS_PROF": "2", "PROF_SUS": "1"},
        {"CODUFMUN": "330010", "COMPETEN": "202605", "CNS_PROF": "3", "PROF_SUS": "1"},
    ]
    por_portal = registros_dos_municipios(iter(linhas), arquivo, 202605, MUNICIPIOS)
    assert por_portal == {"portal_a": [{"pessoa": "1", "atende_sus": "1"}]}


def test_internacoes_contam_linhas_e_competencia_vem_de_ano_e_mes():
    sih = carregar_fontes()[0].sih
    linhas = [{"MUNIC_MOV": "330430", "ANO_CMPT": 2025, "MES_CMPT": 12}] * 63 + [
        {"MUNIC_MOV": "330430", "ANO_CMPT": 2025, "MES_CMPT": 11}
    ]
    por_portal = registros_dos_municipios(iter(linhas), sih, 202512, MUNICIPIOS)
    [saida] = agregar_internacoes("portal_a", 202512, "d", por_portal["portal_a"])
    assert saida["total_internacoes"] == "63"
    assert agregar_internacoes("portal_a", 202512, "d", []) == []


# --- FTP ---


def _ftp_falso(falhas_de_listagem=0, conteudo=b"0123456789"):
    estado = {"listagens": 0}
    conexao = MagicMock()

    def nlst(pasta):
        estado["listagens"] += 1
        if estado["listagens"] <= falhas_de_listagem:
            raise TimeoutError("timed out")
        return [f"{pasta}A.dbc"]

    conexao.nlst.side_effect = nlst
    conexao.size.return_value = len(conteudo)
    conexao.retrbinary.side_effect = lambda _cmd, escrever, rest=None: escrever(conteudo[(rest or 0) :])
    return conexao, estado


def test_listagem_repete_com_espera_crescente_e_reaproveita_o_resultado():
    conexao, estado = _ftp_falso(falhas_de_listagem=2)
    esperas = []
    cliente = ClienteFtp("h", dormir=esperas.append, espera_inicial=2.0, fabrica=lambda *_a, **_k: conexao)
    assert cliente.listar("/p/") == ["A.dbc"]
    assert cliente.listar("/p/") == ["A.dbc"]
    assert esperas == [2.0, 4.0]
    assert estado["listagens"] == 3


def test_listagem_falha_depois_das_tentativas():
    conexao, _ = _ftp_falso(falhas_de_listagem=99)
    cliente = ClienteFtp("h", tentativas=3, dormir=lambda _s: None, fabrica=lambda *_a, **_k: conexao)
    with pytest.raises(SaudeDatasusError, match="3 tentativas"):
        cliente.listar("/p/")


def test_resposta_5xx_nao_e_repetida():
    conexao = MagicMock()
    conexao.nlst.side_effect = ftplib.error_perm("550 sem pasta")
    cliente = ClienteFtp("h", dormir=lambda _s: pytest.fail("não deveria esperar"), fabrica=lambda *_a, **_k: conexao)
    with pytest.raises(ftplib.error_perm):
        cliente.listar("/p/")


def test_download_retoma_do_que_ja_foi_gravado(tmp_path):
    conexao, _ = _ftp_falso(conteudo=b"0123456789")
    destino = tmp_path / "A.dbc"
    destino.write_bytes(b"01234")
    cliente = ClienteFtp("h", fabrica=lambda *_a, **_k: conexao)
    cliente.baixar("/p/", "A.dbc", destino)
    assert destino.read_bytes() == b"0123456789"
    assert conexao.retrbinary.call_args.kwargs["rest"] == 5


def test_download_incompleto_e_tentado_de_novo_e_falha_se_persistir(tmp_path):
    conexao, _ = _ftp_falso(conteudo=b"0123456789")
    conexao.retrbinary.side_effect = lambda _c, escrever, rest=None: escrever(b"01")
    destino = tmp_path / "A.dbc"
    cliente = ClienteFtp("h", tentativas=2, dormir=lambda _s: None, fabrica=lambda *_a, **_k: conexao)
    with pytest.raises(SaudeDatasusError):
        cliente.baixar("/p/", "A.dbc", destino)


# --- limpeza ---


def test_arquivos_baixados_sao_apagados_mesmo_quando_a_leitura_falha(tmp_path, monkeypatch):
    usadas: list[Path] = []
    arquivo = ArquivoFonte(
        pasta="/p/", padrao_arquivo=r"X{uf}{aamm}\.dbc", campos={"municipio": "M", "competencia": "C"}
    )
    fonte = carregar_fontes()[0]

    cliente = MagicMock()
    cliente.listar.return_value = ["XRJ2605.dbc"]

    def baixar(_pasta, nome, destino):
        usadas.append(destino.parent)
        destino.write_bytes(b"dbc")

    cliente.baixar.side_effect = baixar

    def descompactar(origem, destino):
        Path(destino).write_bytes(b"dbf")
        raise OSError("descompactação quebrou")

    import datasus_dbc

    monkeypatch.setattr(datasus_dbc, "decompress", descompactar)
    with pytest.raises(OSError):
        modulo.extrair_fonte(cliente, fonte, arquivo, 202605, MUNICIPIOS)
    assert usadas and not usadas[0].exists()


def test_competencia_sem_arquivo_e_sem_dado_e_nao_zero():
    cliente = MagicMock()
    cliente.listar.return_value = []
    fonte = carregar_fontes()[0]
    dados = modulo.extrair_competencia(cliente, fonte, 202605, MUNICIPIOS, carregar_tipos_leito(), "d")
    assert dados == {
        "portal_a": {
            "leitos_competencia": [],
            "profissionais_competencia": [],
            "sia_competencia": [],
            "sih_competencia": [],
        }
    }


def test_competencia_soma_as_partes_do_sia_e_leva_cada_fonte_para_a_sua_tabela(tmp_path, monkeypatch):
    fonte = carregar_fontes()[0]
    listagens = {
        fonte.leitos.pasta: ["LTRJ2605.dbc"],
        fonte.profissionais.pasta: ["PFRJ2605.dbc"],
        fonte.sia.pasta: ["PARJ2605a.dbc", "PARJ2605b.dbc"],
        fonte.sih.pasta: ["RDRJ2605.dbc"],
    }
    linhas_por_arquivo = {
        "LTRJ2605.dbf": [
            {"CODUFMUN": "330430", "COMPETEN": "202605", "TP_LEITO": "2", "QT_EXIST": 10, "QT_SUS": 8},
        ],
        "PFRJ2605.dbf": [
            {"CODUFMUN": "330430", "COMPETEN": "202605", "CNS_PROF": "1", "PROF_SUS": "1"},
            {"CODUFMUN": "330430", "COMPETEN": "202605", "CNS_PROF": "1", "PROF_SUS": "0"},
            {"CODUFMUN": "330430", "COMPETEN": "202605", "CNS_PROF": "2", "PROF_SUS": "0"},
        ],
        "PARJ2605a.dbf": [{"PA_UFMUN": "330430", "PA_CMP": "202605", "PA_QTDAPR": 100}],
        "PARJ2605b.dbf": [{"PA_UFMUN": "330430", "PA_CMP": "202605", "PA_QTDAPR": 20}],
        "RDRJ2605.dbf": [{"MUNIC_MOV": "330430", "ANO_CMPT": 2026, "MES_CMPT": 5}] * 3,
    }

    cliente = MagicMock()
    cliente.listar.side_effect = lambda pasta: listagens[pasta]
    cliente.baixar.side_effect = lambda _pasta, _nome, destino: destino.write_bytes(b"dbc")

    import datasus_dbc

    monkeypatch.setattr(datasus_dbc, "decompress", lambda _origem, destino: Path(destino).write_bytes(b"dbf"))
    monkeypatch.setattr(
        modulo, "_linhas_dbf", lambda caminho, _cod, _colunas=(): iter(linhas_por_arquivo[caminho.name])
    )

    dados = modulo.extrair_competencia(cliente, fonte, 202605, MUNICIPIOS, carregar_tipos_leito(), "d")["portal_a"]

    assert [
        (i["tipo_leito"], i["total_leitos_existentes"], i["total_leitos_sus"]) for i in dados["leitos_competencia"]
    ] == [("2 - ESPEC - CLINICO", "10", "8")]
    [profissionais] = dados["profissionais_competencia"]
    assert (
        profissionais["total_vinculos"],
        profissionais["total_profissionais"],
        profissionais["total_profissionais_sus"],
    ) == ("3", "2", "1")
    assert [i["total_procedimentos_ambulatoriais"] for i in dados["sia_competencia"]] == ["120"]
    assert [i["total_internacoes"] for i in dados["sih_competencia"]] == ["3"]


def test_coluna_mapeada_ausente_no_arquivo_falha_em_vez_de_virar_sem_dado(tmp_path, monkeypatch):
    class DbfFalso:
        field_names = ["CODUFMUN", "COMPETEN"]

        def __init__(self, *_args, **_kwargs):
            pass

        def __iter__(self):
            return iter([])

    import dbfread

    monkeypatch.setattr(dbfread, "DBF", DbfFalso)
    with pytest.raises(SaudeDatasusError, match="CNS_PROF"):
        modulo._linhas_dbf(tmp_path / "PFRJ2605.dbf", "latin-1", ["codufmun", "CNS_PROF"])
    assert list(modulo._linhas_dbf(tmp_path / "PFRJ2605.dbf", "latin-1", ["codufmun"])) == []


def test_populacao_inclui_o_ano_anterior_ao_primeiro_como_referencia():
    assert anos_da_populacao([202602, 202601, 202512]) == [2024, 2025, 2026]
    assert anos_da_populacao([]) == []
