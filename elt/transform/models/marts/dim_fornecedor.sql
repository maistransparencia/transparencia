-- Dimensão: fornecedores (credores) por portal, a partir de despesas e contratos
-- Chave: credor_id, a mesma de fct_despesas. O nome canônico é o mais frequente
-- por CPF/CNPJ (desempate alfabético), pois o mesmo documento aparece com grafias diferentes.

with nomes_fornecedor as (
    select portal_slug, fornecedor_cpf_cnpj, fornecedor_nome, count(*) as ocorrencias_nome
    from {{ ref('fct_despesas') }}
    where fornecedor_nome is not null
    group by portal_slug, fornecedor_cpf_cnpj, fornecedor_nome

    union all

    select portal_slug, fornecedor_cpf_cnpj, fornecedor_nome, count(*) as ocorrencias_nome
    from {{ ref('fct_contratos') }}
    where fornecedor_nome is not null
    group by portal_slug, fornecedor_cpf_cnpj, fornecedor_nome
),

nomes_consolidados as (
    select
        portal_slug,
        fornecedor_cpf_cnpj,
        fornecedor_nome,
        sum(ocorrencias_nome) as ocorrencias_nome
    from nomes_fornecedor
    group by portal_slug, fornecedor_cpf_cnpj, fornecedor_nome
),

nomes_ranqueados as (
    select
        *,
        row_number() over (
            partition by portal_slug, fornecedor_cpf_cnpj
            order by ocorrencias_nome desc, fornecedor_nome
        ) as posicao_nome,
        count(*) over (partition by portal_slug, fornecedor_cpf_cnpj) as quantidade_nomes_distintos
    from nomes_consolidados
)

select
    {{ dbt_utils.generate_surrogate_key(['portal_slug', 'fornecedor_cpf_cnpj']) }} as credor_id,
    portal_slug,
    fornecedor_cpf_cnpj,
    fornecedor_nome,
    quantidade_nomes_distintos::integer as quantidade_nomes_distintos
from nomes_ranqueados
where posicao_nome = 1
