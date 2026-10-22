import psycopg2
import pytest

from elt.analysis import desempenho, fornecedores
from elt.analysis.conexao import conectar, host_e_local


@pytest.fixture
def conexao_analise(pg, engine):  # noqa: ARG001 - engine garante os modelos construídos
    conexao = conectar(pg.url())
    yield conexao
    conexao.close()


def test_host_e_local_aceita_apenas_hosts_locais():
    assert host_e_local("postgresql://postgres:postgres@localhost:5544/postgres")
    assert host_e_local("postgresql://u:p@127.0.0.1:5432/db")
    assert not host_e_local("postgresql://u:p@db.exemplo.supabase.co:5432/postgres")


def test_conectar_recusa_banco_remoto_sem_autorizacao():
    with pytest.raises(SystemExit):
        conectar("postgresql://u:p@db.exemplo.supabase.co:5432/postgres")


def test_conexao_de_analise_e_somente_leitura(conexao_analise):
    with conexao_analise.cursor() as cursor, pytest.raises(psycopg2.errors.ReadOnlySqlTransaction):
        cursor.execute("create table analytics.nao_deve_existir (id int)")


def test_medir_todos_cobre_marts_e_dimensoes(conexao_analise):
    medicoes = desempenho.medir_todos(conexao_analise, repeticoes=1)
    assert {"fct_despesas", "dim_fornecedor", "fct_contratos"} <= set(medicoes)
    assert all(m["tempo_completo_ms"] >= 0 for m in medicoes.values())
    assert not any(nome.startswith("seed_") for nome in medicoes)


def test_comparar_marca_regressao_acima_do_limite():
    antes = {"a": {"tipo": "tabela", "tempo_completo_ms": 10.0}, "b": {"tipo": "tabela", "tempo_completo_ms": 10.0}}
    depois = {"a": {"tipo": "view", "tempo_completo_ms": 30.0}, "b": {"tipo": "view", "tempo_completo_ms": 11.0}}
    resultado = {linha["modelo"]: linha for linha in desempenho.comparar(antes, depois)}
    assert resultado["a"]["regressao"] is True
    assert resultado["b"]["regressao"] is False


def test_comparar_ignora_modelos_presentes_em_apenas_uma_medicao():
    antes = {"a": {"tipo": "tabela", "tempo_completo_ms": 1.0}}
    depois = {"b": {"tipo": "view", "tempo_completo_ms": 1.0}}
    assert desempenho.comparar(antes, depois) == []


def test_analises_de_fornecedores_rodam_em_banco_vazio(conexao_analise):
    cobertura = fornecedores.cobertura(conexao_analise)
    assert [linha["fato"] for linha in cobertura] == list(fornecedores.FATOS_COM_CREDOR)
    assert all(linha["linhas"] == 0 for linha in cobertura)
    assert fornecedores.ligacoes(conexao_analise)["distribuicao"] == []
    assert fornecedores.nomes_divergentes(conexao_analise)[0]["portais"] == []
    assert fornecedores.impacto_classificadores(conexao_analise) == []


FATOS_DO_ESQUEMA = ("fct_despesas", "fct_contratos")


@pytest.fixture
def esquema_com_dados(pg, monkeypatch):
    """Esquema isolado com fatos e dimensão mínimos para validar a lógica das análises."""
    escrita = psycopg2.connect(pg.url())
    escrita.autocommit = True
    with escrita.cursor() as cursor:
        cursor.execute(
            """
            create schema analise_teste;
            create table analise_teste.dim_fornecedor (
                portal_slug text, credor_id text, fornecedor_nome text, quantidade_nomes_distintos int
            );
            create table analise_teste.fct_despesas (
                portal_slug text, credor_id text, fornecedor_nome text, fornecedor_cpf_cnpj text, empenhado_liquido numeric
            );
            create table analise_teste.fct_contratos (
                portal_slug text, credor_id text, fornecedor_nome text, fornecedor_cpf_cnpj text
            );
            insert into analise_teste.dim_fornecedor values
                ('p1', 'a', 'CAPREM PREVIDENCIA', 2),
                ('p1', 'b', 'EMPRESA B', 1),
                ('p2', 'a', 'EMPRESA OUTRA', 1);
            insert into analise_teste.fct_despesas values
                ('p1', 'a', 'CAPREM PREVIDENCIA', '11', 100),
                ('p1', 'a', 'INSTITUTO XYZ', '11', 50),
                ('p1', 'b', 'EMPRESA B', '22', 10),
                ('p1', null, 'SEM CHAVE', null, 5),
                ('p1', 'orfa', 'FORNECEDOR ORFAO', '99', 1);
            insert into analise_teste.fct_contratos values
                ('p1', 'a', 'CAPREM PREVIDENCIA', '11'),
                ('p2', 'a', 'EMPRESA OUTRA', '33');
            """
        )
    monkeypatch.setattr(fornecedores, "SCHEMA", "analise_teste")
    conexao = conectar(pg.url())
    yield conexao
    conexao.close()
    with escrita.cursor() as cursor:
        cursor.execute("drop schema analise_teste cascade")
    escrita.close()


def test_cobertura_conta_linhas_sem_credor_e_orfas(esquema_com_dados):
    por_fato = {linha["fato"]: linha for linha in fornecedores.cobertura(esquema_com_dados, FATOS_DO_ESQUEMA)}
    despesas = por_fato["fct_despesas"]
    assert (despesas["linhas"], despesas["sem_credor"], despesas["orfas_na_dimensao"]) == (5, 1, 1)
    assert despesas["sem_documento"] == 1
    assert por_fato["fct_contratos"]["orfas_na_dimensao"] == 0


def test_ligacoes_isola_tenants_com_o_mesmo_credor_id(esquema_com_dados):
    distribuicao = {
        linha["quantidade_fatos"]: linha["fornecedores"]
        for linha in fornecedores.ligacoes(esquema_com_dados, FATOS_DO_ESQUEMA)["distribuicao"]
    }
    # p1/a está em despesas e contratos (2 fatos); p2/a só em contratos; p1/b e p1/orfa só em despesas
    assert distribuicao == {1: 3, 2: 1}


def test_nomes_divergentes_compara_linha_com_nome_canonico(esquema_com_dados):
    resultado = fornecedores.nomes_divergentes(esquema_com_dados)[0]
    p1 = next(p for p in resultado["portais"] if p["portal_slug"] == "p1")
    assert (p1["fornecedores"], p1["fornecedores_com_varios_nomes"]) == (2, 1)
    divergentes = {
        (linha["fato"], linha["portal_slug"]): linha["linhas_divergentes"] for linha in resultado["linhas_por_fato"]
    }
    # INSTITUTO XYZ difere do canônico; a linha sem chave e a órfã não têm nome canônico
    assert divergentes[("fct_despesas", "p1")] == 3
    assert divergentes[("fct_contratos", "p1")] == 0


def test_impacto_classificadores_mostra_valor_que_muda_de_categoria(esquema_com_dados):
    impacto = {
        linha["portal_slug"]: linha for linha in fornecedores.impacto_classificadores(esquema_com_dados, ("CAPREM",))
    }
    p1 = impacto["p1"]
    assert float(p1["valor_pelo_nome_da_linha"]) == 100
    assert float(p1["valor_pelo_nome_canonico"]) == 150
    assert p1["linhas_que_mudam"] == 1
