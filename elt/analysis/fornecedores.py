"""Relacionamento entre fatos por fornecedor (credor_id) e impacto de usar o nome canônico da dimensão."""

from psycopg2 import sql
from psycopg2.extensions import connection as Connection

SCHEMA = "analytics"
FATOS_COM_CREDOR = ("fct_despesas", "fct_contratos", "fct_licitacoes_itens", "fct_contratos_recursos")
FATOS_COM_NOME = ("fct_despesas", "fct_contratos")
PALAVRAS_CLASSIFICADORAS = ("CAPREM", "NATPREV", "CASP", "RPPS")


def _tabela(nome: str) -> sql.Composable:
    return sql.SQL("{}.{}").format(sql.Identifier(SCHEMA), sql.Identifier(nome))


def _consultar(conexao: Connection, consulta: sql.Composable, parametros: tuple | dict = ()) -> list[dict]:
    with conexao.cursor() as cursor:
        cursor.execute(consulta, parametros)
        colunas = [coluna.name for coluna in cursor.description]
        return [dict(zip(colunas, linha, strict=True)) for linha in cursor.fetchall()]


def cobertura(conexao: Connection, fatos: tuple[str, ...] = FATOS_COM_CREDOR) -> list[dict]:
    """Por fato: linhas, linhas sem credor_id e linhas cujo credor_id não existe em dim_fornecedor."""

    def por_fato(fato: str) -> dict:
        consulta = sql.SQL(
            """
            select
                %s as fato,
                count(*) as linhas,
                count(*) filter (where f.credor_id is null) as sem_credor,
                count(*) filter (where f.credor_id is not null and d.credor_id is null) as orfas_na_dimensao,
                count(*) filter (where nullif(trim(f.fornecedor_cpf_cnpj), '') is null) as sem_documento
            from {fato} f
            left join {dimensao} d on d.portal_slug = f.portal_slug and d.credor_id = f.credor_id
            """
        ).format(fato=_tabela(fato), dimensao=_tabela("dim_fornecedor"))
        return _consultar(conexao, consulta, (fato,))[0]

    return [por_fato(fato) for fato in fatos]


def ligacoes(conexao: Connection, fatos: tuple[str, ...] = FATOS_COM_CREDOR) -> dict:
    """Quantos fornecedores aparecem em 1, 2, ... N fatos: mede a conectividade do grafo de relacionamento."""
    uniao = sql.SQL(" union all ").join(
        sql.SQL("select distinct %s as fato, portal_slug, credor_id from {} where credor_id is not null").format(
            _tabela(fato)
        )
        for fato in fatos
    )
    # os placeholders %s da união recebem o nome do fato, na mesma ordem
    consulta = sql.SQL(
        """
        select quantidade_fatos, count(*) as fornecedores
        from (
            select portal_slug, credor_id, count(distinct fato) as quantidade_fatos
            from ({uniao}) u
            group by portal_slug, credor_id
        ) agrupado
        group by quantidade_fatos
        order by quantidade_fatos
        """
    ).format(uniao=uniao)
    distribuicao = _consultar(conexao, consulta, tuple(fatos))
    return {"fatos": list(fatos), "distribuicao": distribuicao}


def nomes_divergentes(conexao: Connection) -> list[dict]:
    """Por portal: fornecedores com mais de uma grafia e linhas dos fatos cujo nome difere do canônico."""
    consulta = sql.SQL(
        """
        select
            d.portal_slug,
            count(*) as fornecedores,
            count(*) filter (where d.quantidade_nomes_distintos > 1) as fornecedores_com_varios_nomes
        from {dimensao} d
        group by d.portal_slug
        order by d.portal_slug
        """
    ).format(dimensao=_tabela("dim_fornecedor"))
    portais = _consultar(conexao, consulta)

    def linhas_divergentes(fato: str) -> list[dict]:
        consulta_fato = sql.SQL(
            """
            select
                %s as fato,
                f.portal_slug,
                count(*) filter (where f.fornecedor_nome is distinct from d.fornecedor_nome) as linhas_divergentes,
                count(*) as linhas
            from {fato} f
            left join {dimensao} d on d.portal_slug = f.portal_slug and d.credor_id = f.credor_id
            group by f.portal_slug
            order by f.portal_slug
            """
        ).format(fato=_tabela(fato), dimensao=_tabela("dim_fornecedor"))
        return _consultar(conexao, consulta_fato, (fato,))

    return [
        {
            "portais": portais,
            "linhas_por_fato": [linha for fato in FATOS_COM_NOME for linha in linhas_divergentes(fato)],
        }
    ]


def impacto_classificadores(conexao: Connection, palavras: tuple[str, ...] = PALAVRAS_CLASSIFICADORAS) -> list[dict]:
    """Por palavra: valor classificado pelo nome de cada linha versus pelo nome canônico (fct_despesas)."""

    def por_palavra(palavra: str) -> list[dict]:
        consulta = sql.SQL(
            """
            select
                %(palavra)s as palavra,
                f.portal_slug,
                coalesce(sum(f.empenhado_liquido) filter (where f.fornecedor_nome ilike %(padrao)s), 0) as valor_pelo_nome_da_linha,
                coalesce(sum(f.empenhado_liquido) filter (where d.fornecedor_nome ilike %(padrao)s), 0) as valor_pelo_nome_canonico,
                count(*) filter (where coalesce(f.fornecedor_nome ilike %(padrao)s, false) <> coalesce(d.fornecedor_nome ilike %(padrao)s, false)) as linhas_que_mudam
            from {fato} f
            left join {dimensao} d on d.portal_slug = f.portal_slug and d.credor_id = f.credor_id
            group by f.portal_slug
            order by f.portal_slug
            """
        ).format(fato=_tabela("fct_despesas"), dimensao=_tabela("dim_fornecedor"))
        return _consultar(conexao, consulta, {"palavra": palavra, "padrao": f"%{palavra}%"})

    return [linha for palavra in palavras for linha in por_palavra(palavra)]
