-- Dimensão: fornecedores (credores) por portal, a partir de despesas, contratos e itens de licitação
-- Lê as intermediárias de despesas e contratos porque os fatos não carregam mais o nome do fornecedor.
-- Chave: credor_id (ver macro credor_key), a mesma de fct_despesas e fct_contratos.
-- O nome canônico é o mais frequente por chave (desempate alfabético), pois o mesmo
-- documento aparece com grafias diferentes.

with ocorrencias_fornecedor as (
    select
        {{ credor_key() }} as credor_id,
        portal_slug,
        fornecedor_cpf_cnpj,
        fornecedor_nome
    from {{ ref('int_despesas_reclassificadas') }}
    where tipo_empenho is distinct from 'AN'

    union all

    select
        {{ credor_key() }} as credor_id,
        portal_slug,
        fornecedor_cpf_cnpj,
        fornecedor_nome
    from {{ ref('int_contratos_consolidados') }}

    union all

    select credor_id, portal_slug, fornecedor_cpf_cnpj, fornecedor_nome
    from {{ ref('fct_licitacoes_itens') }}
),

nomes_consolidados as (
    select
        credor_id,
        portal_slug,
        fornecedor_nome,
        max(fornecedor_cpf_cnpj) as fornecedor_cpf_cnpj,
        count(*) as ocorrencias_nome
    from ocorrencias_fornecedor
    where credor_id is not null
    group by credor_id, portal_slug, fornecedor_nome
),

nomes_ranqueados as (
    select
        *,
        row_number() over (
            partition by credor_id
            order by (fornecedor_nome is null), ocorrencias_nome desc, fornecedor_nome
        ) as posicao_nome,
        count(fornecedor_nome) over (partition by credor_id) as quantidade_nomes_distintos,
        max(fornecedor_cpf_cnpj) over (partition by credor_id) as cpf_cnpj_credor
    from nomes_consolidados
)

select
    credor_id,
    portal_slug,
    cpf_cnpj_credor as fornecedor_cpf_cnpj,
    fornecedor_nome,
    quantidade_nomes_distintos::integer as quantidade_nomes_distintos
from nomes_ranqueados
where posicao_nome = 1
