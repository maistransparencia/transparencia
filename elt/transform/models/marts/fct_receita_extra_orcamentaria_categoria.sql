{{
    config(
        materialized='table'
    )
}}

select
    {{ dbt_utils.generate_surrogate_key(['portal_slug', 'empresa_id', 'ano', 'categoria']) }} as receita_extra_categoria_id,
    portal_slug,
    empresa_id,
    ano,
    categoria,
    sum(valor_arrecadado)::numeric(15, 2) as valor_arrecadado
from (
    select
        portal_slug,
        empresa_id,
        ano,
        {{ classificar_receita_extra_orcamentaria('descricao') }} as categoria,
        valor_arrecadado
    from {{ ref('fct_receita_extra_orcamentaria') }}
) as classificadas
group by portal_slug, empresa_id, ano, categoria
