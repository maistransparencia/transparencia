-- O restos a pagar pago em fct_despesas_restos_metricas deve fechar com o de fct_despesas,
-- por portal e ano. Diferença indica linhas de restos duplicadas ou perdidas no cruzamento.

with pago_despesas as (
    select
        portal_slug,
        ano,
        sum(coalesce(pago, 0)) as pago_despesas
    from {{ ref('fct_despesas') }}
    where fonte = 'restos_a_pagar'
    group by portal_slug, ano
),

pago_metricas as (
    select
        portal_slug,
        ano,
        sum(coalesce(restos_pagos, 0)) as pago_metricas
    from {{ ref('fct_despesas_restos_metricas') }}
    group by portal_slug, ano
)

select
    coalesce(d.portal_slug, m.portal_slug) as portal_slug,
    coalesce(d.ano, m.ano) as ano,
    d.pago_despesas,
    m.pago_metricas
from pago_despesas as d
full join pago_metricas as m
    on d.portal_slug = m.portal_slug
   and d.ano = m.ano
where abs(coalesce(d.pago_despesas, 0) - coalesce(m.pago_metricas, 0)) > 1
