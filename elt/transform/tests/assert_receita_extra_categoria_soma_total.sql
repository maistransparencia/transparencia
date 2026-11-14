with total as (
    select portal_slug, ano, sum(valor_arrecadado) as valor_total
    from {{ ref('fct_receita_extra_orcamentaria') }}
    group by portal_slug, ano
),

categorizado as (
    select portal_slug, ano, sum(valor_arrecadado) as valor_categorizado
    from {{ ref('fct_receita_extra_orcamentaria_categoria') }}
    group by portal_slug, ano
)

select total.portal_slug, total.ano
from total
left join categorizado
    on categorizado.portal_slug = total.portal_slug
    and categorizado.ano = total.ano
where categorizado.valor_categorizado is distinct from total.valor_total
