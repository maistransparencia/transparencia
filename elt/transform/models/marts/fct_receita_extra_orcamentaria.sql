{{
    config(
        materialized='table'
    )
}}

with source as (
    select * from {{ ref('stg_porciuncula_prefeitura__receita_extra_orcamentaria') }}
    union all
    select * from {{ ref('stg_natividade_prefeitura__receita_extra_orcamentaria') }}
)

select
    {{ dbt_utils.generate_surrogate_key(['portal_slug', 'empresa_id', 'ano', 'codigo', 'coalesce(descricao, \'\')']) }} as receita_extra_id,
    portal_slug,
    empresa_id,
    ano,
    codigo,
    descricao,
    sum(valor_arrecadado)::numeric(15, 2) as valor_arrecadado
from source
group by portal_slug, empresa_id, ano, codigo, descricao
