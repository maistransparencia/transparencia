{{ config(materialized='table') }}

with restos as (
    select
        despesa_id,
        portal_slug,
        empresa_id,
        empenho_id,
        ano,
        coalesce(empenhado, 0) as empenhado,
        coalesce(liquidado, 0) as liquidado,
        coalesce(pago, 0) as pago,
        coalesce(valor_anulacoes, 0) as valor_anulacoes
    from {{ ref('fct_despesas') }}
    where fonte = 'restos_a_pagar'
),

exercicios_por_empenho as (
    select distinct
        portal_slug,
        empresa_id,
        empenho_id,
        ano
    from {{ ref('fct_despesas') }}
    where fonte = 'exercicio'
),

-- o mesmo empenho_id se repete em vários exercícios (a numeração reinicia a cada ano) e a linha
-- de restos não traz o ano de origem; o exercício mais recente anterior ao ano do resto é a origem
-- mais provável. Agregar por despesa_id antes do join evita multiplicar as linhas de restos.
origem_por_resto as (
    select
        r.despesa_id,
        max(e.ano) as ano_origem
    from restos as r
    inner join exercicios_por_empenho as e
        on r.portal_slug = e.portal_slug
       and r.empresa_id = e.empresa_id
       and r.empenho_id = e.empenho_id
       and e.ano < r.ano
    group by r.despesa_id
),

restos_com_origem as (
    select
        r.portal_slug,
        r.empresa_id,
        r.ano,
        coalesce(o.ano_origem, r.ano) as ano_origem,
        r.empenhado,
        r.liquidado,
        r.pago,
        r.valor_anulacoes
    from restos as r
    left join origem_por_resto as o
        on r.despesa_id = o.despesa_id
),

restos_agregados as (
    select
        portal_slug,
        empresa_id,
        ano,
        sum(empenhado) as restos_inscritos,
        sum(liquidado) as restos_liquidados,
        sum(pago) as restos_pagos,
        sum(valor_anulacoes) as restos_cancelados,
        min(case when (empenhado - pago) > 0 then ano_origem else ano end) as divida_mais_antiga_ano
    from restos_com_origem
    group by
        portal_slug,
        empresa_id,
        ano
)

select
    {{ dbt_utils.generate_surrogate_key(['portal_slug', 'empresa_id', 'ano']) }} as restos_metricas_id,
    portal_slug,
    empresa_id,
    ano,
    restos_inscritos::numeric(15, 2) as restos_inscritos,
    restos_liquidados::numeric(15, 2) as restos_liquidados,
    restos_pagos::numeric(15, 2) as restos_pagos,
    restos_cancelados::numeric(15, 2) as restos_cancelados,
    (restos_inscritos - restos_pagos)::numeric(15, 2) as saldo_restos,
    coalesce(divida_mais_antiga_ano, ano)::integer as divida_mais_antiga_ano
from restos_agregados
