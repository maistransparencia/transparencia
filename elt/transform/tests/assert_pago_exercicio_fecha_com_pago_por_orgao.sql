-- O pago do exercício em fct_despesas (sem restos a pagar) deve fechar com o pago de
-- fct_despesas_por_orgao, por portal e ano. Tolera 0,01% por arredondamentos da fonte;
-- diferença maior indica empenho fora de uma das visões.

with pago_empenho as (
    select
        portal_slug,
        ano,
        sum(coalesce(pago, 0)) as pago_exercicio
    from {{ ref('fct_despesas') }}
    where fonte = 'exercicio'
    group by portal_slug, ano
),

pago_orgao as (
    select
        portal_slug,
        ano,
        sum(coalesce(pago, 0)) as pago_orgao
    from {{ ref('fct_despesas_por_orgao') }}
    group by portal_slug, ano
)

select
    coalesce(e.portal_slug, o.portal_slug) as portal_slug,
    coalesce(e.ano, o.ano) as ano,
    e.pago_exercicio,
    o.pago_orgao
from pago_empenho as e
full join pago_orgao as o
    on e.portal_slug = o.portal_slug
   and e.ano = o.ano
where abs(coalesce(e.pago_exercicio, 0) - coalesce(o.pago_orgao, 0)) > 0.0001 * greatest(abs(coalesce(e.pago_exercicio, 0)), abs(coalesce(o.pago_orgao, 0)), 1)
