"""Testes de integração do mart fct_emendas_estaduais (lista oficial do Estado por município)."""

import pytest
from sqlalchemy import text

_FONTE = "fonte_teste_a"
_FONTE_OUTRA_UF = "fonte_teste_b"
_ARQUIVO_ABRIL = "detalhamento_abril.csv"
_ARQUIVO_AGOSTO = "detalhamento_agosto.csv"
_ARQUIVO_JANEIRO = "detalhamento_janeiro.csv"

# (nome_arquivo, identificador, numero, autor, objeto, beneficiario, municipio, area, modalidade, funcao)
_EMENDAS = [
    (
        _ARQUIVO_ABRIL,
        "i1",
        "650",
        "Autor Um",
        "Implantação de Sala de Regulação Sensorial",
        "Prefeitura",
        "Porciúncula",
        "educacao",
        "transferencia_especial",
        "04-Administração",
    ),
    (
        _ARQUIVO_ABRIL,
        "i2",
        "650",
        "Autor Dois",
        "Aquisição de ambulância",
        "Fundo Municipal de Saúde",
        "PORCIUNCULA",
        "saude",
        "fundo_a_fundo",
        "10-Saúde",
    ),
    (
        _ARQUIVO_ABRIL,
        "i3",
        "901",
        "Autor Três",
        "Reforma do colégio estadual",
        "SECRETARIA DE ESTADO DE EDUCAÇÃO",
        "Porciúncula",
        "educacao",
        "execucao_direta",
        "12-Educação",
    ),
    (
        _ARQUIVO_ABRIL,
        "i4",
        "77",
        "Autor Quatro",
        "Apoio a entidade",
        "Associação X",
        "Porciúncula",
        "outras",
        "osc",
        "08-Assistência",
    ),
    (
        _ARQUIVO_ABRIL,
        "i5",
        "78",
        "Autor Cinco",
        "Outro objeto",
        "Prefeitura",
        "Cidade Sem Portal",
        "outras",
        "transferencia_especial",
        "04-Administração",
    ),
    (
        _ARQUIVO_JANEIRO,
        "i7",
        "80",
        "Autor Sete",
        "Objeto que saiu do arquivo novo",
        "Prefeitura",
        "Porciúncula",
        "outras",
        "transferencia_especial",
        "04-Administração",
    ),
    (
        _ARQUIVO_ABRIL,
        "i6",
        "79",
        "Autor Seis",
        "Objeto de outro Estado",
        "Prefeitura",
        "Porciúncula",
        "outras",
        "transferencia_especial",
        "04-Administração",
    ),
    (
        _ARQUIVO_AGOSTO,
        "i1",
        "650",
        "Autor Um",
        "Implantação de Sala de Regulação Sensorial",
        "Prefeitura",
        "Porciúncula",
        "educacao",
        "transferencia_especial",
        "04-Administração",
    ),
]


@pytest.fixture
def seed_emendas(conn):
    for fonte, uf in ((_FONTE, "RJ"), (_FONTE_OUTRA_UF, "ZZ")):
        for nome, data, fase in (
            (_ARQUIVO_JANEIRO, "2026-01-15", "1"),
            (_ARQUIVO_ABRIL, "2026-04-09", "1"),
            (_ARQUIVO_AGOSTO, "2026-08-18", "2"),
        ):
            conn.execute(
                text(
                    """
                    INSERT INTO raw_emendas_estaduais.arquivos_fonte
                        (codigo_fonte, nome_arquivo, uf, orgao_publicador, url_pagina, url_arquivo, tipo_arquivo,
                         ano, data_arquivo, fase, coletado_em)
                    VALUES (:fonte, :nome, :uf, 'Órgão de Teste', 'https://exemplo.test/', 'https://exemplo.test/a.csv',
                            'detalhamento', 2026, :data, :fase, now())
                    """
                ),
                {"fonte": fonte, "nome": nome, "uf": uf, "data": data, "fase": fase},
            )
    for nome, ident, numero, autor, objeto, benef, municipio, area, modalidade, funcao in _EMENDAS:
        fonte = _FONTE_OUTRA_UF if ident == "i6" else _FONTE
        conn.execute(
            text(
                """
                INSERT INTO raw_emendas_estaduais.emendas_detalhamento
                    (codigo_fonte, nome_arquivo, identificador, numero_emenda, autor, valor, objeto, area,
                     beneficiario, municipio, funcao, modalidade)
                VALUES (:fonte, :nome, :ident, :numero, :autor, 100000, :objeto, :area, :benef, :municipio,
                        :funcao, :modalidade)
                """
            ),
            {
                "fonte": fonte,
                "nome": nome,
                "ident": ident,
                "numero": numero,
                "autor": autor,
                "objeto": objeto,
                "area": area,
                "benef": benef,
                "municipio": municipio,
                "funcao": funcao,
                "modalidade": modalidade,
            },
        )
    conn.commit()
    yield
    conn.execute(text("DELETE FROM raw_emendas_estaduais.emendas_detalhamento"))
    conn.execute(text("DELETE FROM raw_emendas_estaduais.arquivos_fonte"))
    conn.commit()


_RELATORIO_ABRIL = "execucao_abril.csv"
_RELATORIO_AGOSTO = "execucao_agosto.csv"


@pytest.fixture
def seed_conferencia(conn, seed_emendas):  # noqa: ARG001 - depende da lista do Estado já carregada
    """Cadastro municipal (i1 igual, i2 com valor diferente, i3 só no Estado) e dois relatórios de execução."""
    for nome in (_RELATORIO_ABRIL, _RELATORIO_AGOSTO):
        conn.execute(
            text(
                """
                INSERT INTO raw_emendas_estaduais.arquivos_fonte
                    (codigo_fonte, nome_arquivo, uf, orgao_publicador, url_pagina, url_arquivo, tipo_arquivo,
                     ano, data_arquivo, fase, coletado_em)
                VALUES (:fonte, :nome, 'RJ', 'Órgão de Teste', 'https://exemplo.test/', 'https://exemplo.test/e.csv',
                        'execucao', 2026, NULL, NULL, now())
                """
            ),
            {"fonte": _FONTE, "nome": nome},
        )
    for nome, ident, ano, mes, pago in (
        (_RELATORIO_ABRIL, "i1", 2026, 4, 0),
        (_RELATORIO_AGOSTO, "i1", 2026, 8, 25000),
        (_RELATORIO_ABRIL, "i2", 2026, 4, 0),
    ):
        conn.execute(
            text(
                """
                INSERT INTO raw_emendas_estaduais.execucao_emendas
                    (codigo_fonte, nome_arquivo, identificador, posicao_ano, posicao_mes, dotacao_inicial,
                     empenhado, liquidado, pago)
                VALUES (:fonte, :nome, :ident, :ano, :mes, 100000, 0, 0, :pago)
                """
            ),
            {"fonte": _FONTE, "nome": nome, "ident": ident, "ano": ano, "mes": mes, "pago": pago},
        )
    for numero, autor, valor in (("650", "AUTOR UM", "100000"), ("650", "Autor Dois", "90000")):
        conn.execute(
            text(
                """
                INSERT INTO raw_porciuncula_prefeitura.emendas_cad
                    (ano, empresa, numero, numero_emenda, resumo, valor_total, empenhado, autor)
                VALUES ('2026', '1', :numero || :autor, :numero, 'resumo ' || :autor, :valor, '30000', :autor)
                """
            ),
            {"numero": numero, "autor": autor, "valor": valor},
        )
    conn.commit()
    yield
    conn.execute(text("DELETE FROM raw_emendas_estaduais.execucao_emendas"))
    conn.execute(text("DELETE FROM raw_porciuncula_prefeitura.emendas_cad"))
    conn.commit()


def _mart(conn):
    return conn.execute(
        text("SELECT * FROM analytics.fct_emendas_estaduais WHERE fonte_emenda_estadual = :f ORDER BY identificador"),
        {"f": _FONTE},
    ).fetchall()


@pytest.mark.usefixtures("seed_emendas")
def test_mesmo_numero_com_autores_diferentes_gera_duas_linhas(conn):
    linhas = [linha for linha in _mart(conn) if linha.numero_emenda == "650"]
    assert sorted(linha.autor for linha in linhas) == ["Autor Dois", "Autor Um"]


@pytest.mark.usefixtures("seed_emendas")
def test_vale_o_arquivo_mais_recente_de_cada_identificador(conn):
    (linha,) = [linha for linha in _mart(conn) if linha.identificador == "i1"]
    assert (str(linha.data_arquivo_estado), linha.fase_arquivo_estado) == ("2026-08-18", "2")
    assert linha.nome_arquivo_estado == _ARQUIVO_AGOSTO


@pytest.mark.usefixtures("seed_emendas")
def test_area_vem_da_carga_e_sem_regra_fica_em_outras(conn):
    areas = {linha.identificador: linha.area_emenda for linha in _mart(conn)}
    assert areas["i1"] == "educacao"  # área decidida pela configuração da fonte
    assert areas["i2"] == "saude"
    assert areas["i3"] == "educacao"
    assert areas["i4"] == "outras"


@pytest.mark.usefixtures("seed_emendas")
def test_emenda_ausente_do_arquivo_mais_recente_da_fase_e_sinalizada(conn):
    consta = {linha.identificador: linha.consta_no_arquivo_mais_recente for linha in _mart(conn)}
    assert consta["i7"] is False  # só no arquivo de janeiro; o de abril (mesma fase) não a traz
    assert consta["i1"] is True  # está no arquivo mais recente da sua fase (agosto)
    assert consta["i2"] is True  # está no de abril, o mais recente da fase 1
    (i7,) = [linha for linha in _mart(conn) if linha.identificador == "i7"]
    assert str(i7.data_arquivo_mais_recente_fase) == "2026-04-09"


@pytest.mark.usefixtures("seed_emendas")
def test_so_tres_modalidades_chegam_a_prefeitura(conn):
    chega = {linha.identificador: linha.dinheiro_chega_prefeitura for linha in _mart(conn)}
    assert chega == {"i1": True, "i2": True, "i3": False, "i4": False, "i7": True}


@pytest.mark.usefixtures("seed_emendas")
def test_municipio_sem_portal_e_fonte_de_outra_uf_nao_entram(conn):
    identificadores = {linha.identificador for linha in _mart(conn)}
    assert "i5" not in identificadores
    assert (
        conn.execute(
            text("SELECT count(*) FROM analytics.fct_emendas_estaduais WHERE fonte_emenda_estadual = :f"),
            {"f": _FONTE_OUTRA_UF},
        ).scalar_one()
        == 0
    )


@pytest.mark.usefixtures("seed_emendas")
def test_fontes_listam_orgao_pagina_e_arquivo_so_para_portais_da_uf(conn):
    linhas = conn.execute(
        text("SELECT * FROM analytics.fct_emendas_estaduais_fontes WHERE fonte_emenda_estadual = :f"),
        {"f": _FONTE},
    ).fetchall()
    assert {linha.nome_arquivo_estado for linha in linhas} >= {_ARQUIVO_ABRIL, _ARQUIVO_AGOSTO}
    assert all(linha.orgao_publicador == "Órgão de Teste" and linha.url_pagina_oficial for linha in linhas)
    assert not conn.execute(
        text("SELECT 1 FROM analytics.fct_emendas_estaduais_fontes WHERE fonte_emenda_estadual = :f"),
        {"f": _FONTE_OUTRA_UF},
    ).fetchall()


def test_portal_sem_fonte_nao_tem_linha_nem_erro(conn):
    assert conn.execute(text("SELECT count(*) FROM analytics.fct_emendas_estaduais")).scalar_one() == 0


@pytest.mark.usefixtures("seed_conferencia")
def test_cruza_com_o_cadastro_municipal_por_ano_numero_e_autor(conn):
    por_id = {linha.identificador: linha for linha in _mart(conn)}
    assert por_id["i1"].consta_no_cadastro_municipal is True  # autor igual sem diferenciar caixa
    assert por_id["i1"].valor_cadastro_municipal == 100000
    assert por_id["i2"].consta_no_cadastro_municipal is True
    assert por_id["i2"].valor_cadastro_municipal == 90000  # mesmo número, autor diferente: não se mistura
    assert por_id["i3"].consta_no_cadastro_municipal is False
    assert por_id["i3"].valor_cadastro_municipal is None


@pytest.mark.usefixtures("seed_conferencia")
def test_execucao_usa_o_relatorio_de_posicao_mais_recente_e_guarda_a_posicao(conn):
    por_id = {linha.identificador: linha for linha in _mart(conn)}
    assert (por_id["i1"].posicao_ano_execucao_estado, por_id["i1"].posicao_mes_execucao_estado) == (2026, 8)
    assert por_id["i1"].pago_estado == 25000
    assert por_id["i2"].posicao_mes_execucao_estado == 4  # só o relatório de abril a traz
    assert por_id["i3"].posicao_mes_execucao_estado is None  # emenda fora dos relatórios: nulo, nunca zero
    assert por_id["i3"].pago_estado is None


@pytest.mark.usefixtures("seed_conferencia")
def test_execucao_de_outro_ano_nao_e_atribuida_a_emenda(conn):
    for ident in ("i2", "i3"):
        conn.execute(
            text(
                """
                INSERT INTO raw_emendas_estaduais.execucao_emendas
                    (codigo_fonte, nome_arquivo, identificador, posicao_ano, posicao_mes, dotacao_inicial,
                     empenhado, liquidado, pago)
                VALUES (:fonte, :nome, :ident, 2025, 12, 100000, 0, 0, 999)
                """
            ),
            {"fonte": _FONTE, "nome": _RELATORIO_AGOSTO, "ident": ident},
        )
    conn.commit()
    por_id = {linha.identificador: linha for linha in _mart(conn)}
    assert por_id["i3"].posicao_ano_execucao_estado is None  # só há relatório de 2025 e a emenda é de 2026
    assert por_id["i3"].pago_estado is None
    assert (por_id["i2"].posicao_ano_execucao_estado, por_id["i2"].posicao_mes_execucao_estado) == (2026, 4)


@pytest.mark.usefixtures("seed_emendas")
def test_sem_relatorio_nem_cadastro_a_conferencia_fica_neutra(conn):
    linhas = _mart(conn)
    assert linhas
    assert all(not linha.consta_no_cadastro_municipal and linha.pago_estado is None for linha in linhas)
