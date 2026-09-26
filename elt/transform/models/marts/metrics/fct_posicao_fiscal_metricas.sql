{{ config(materialized='table') }}

with metadata_gestao as (
    select
        portal_slug,
        coalesce(max(case when key = 'ano_inicio_gestao_atual' then value::int end), 2025) as ano_inicio_gestao
    from {{ ref('dim_metadata') }}
    group by portal_slug
),

receitas_root as (
    select
        t.portal_slug,
        t.empresa_id,
        t.ano,
        t.arrecadado
    from {{ ref('fct_receitas') }} t
    where t.tipo_receita = 'orcamentaria'
      and not exists (
        select 1 from {{ ref('fct_receitas') }} t2
        where t2.tipo_receita = t.tipo_receita
          and t2.ano = t.ano
          and t2.empresa_id = t.empresa_id
          and t2.codigo != t.codigo
          and t.codigo like rtrim(t2.codigo, '0.') || '%'
          and length(rtrim(t2.codigo, '0.')) < length(rtrim(t.codigo, '0.'))
      )
),

receitas_agregadas as (
    select
        portal_slug,
        empresa_id,
        ano,
        sum(coalesce(arrecadado, 0)) as total_arrecadado
    from receitas_root
    group by portal_slug, empresa_id, ano
),

despesas_agregadas as (
    select
        portal_slug,
        empresa_id,
        ano,
        sum(case when fonte = 'exercicio' then coalesce(pago, 0) else 0 end) as despesas_pagas,
        sum(case when fonte = 'restos_a_pagar' then coalesce(liquidado, 0) else 0 end) as restos_liquidados_no_ano,
        sum(case when fonte = 'restos_a_pagar' then coalesce(pago, 0) else 0 end) as restos_pagos_no_ano,
        sum(case when fonte = 'restos_a_pagar' then coalesce(empenhado, 0) - coalesce(pago, 0) else 0 end) as restos_pendentes_total
    from {{ ref('fct_despesas') }}
    where fonte in ('exercicio', 'restos_a_pagar')
    group by portal_slug, empresa_id, ano
),

despesas_com_gestao as (
    select
        d.portal_slug,
        d.empresa_id,
        d.ano,
        d.despesas_pagas,
        d.restos_liquidados_no_ano,
        d.restos_pagos_no_ano,
        case
            when d.ano < coalesce(m.ano_inicio_gestao, 2025) then d.restos_pendentes_total
            else 0
        end as restos_pendentes_adm_anterior,
        case
            when d.ano >= coalesce(m.ano_inicio_gestao, 2025) then d.restos_pendentes_total
            else 0
        end as restos_pendentes_adm_atual
    from despesas_agregadas d
    left join metadata_gestao m
        on d.portal_slug = m.portal_slug
),

chaves_base as (
    select portal_slug, empresa_id, ano from receitas_agregadas
    union
    select portal_slug, empresa_id, ano from despesas_com_gestao
)

select
    {{ dbt_utils.generate_surrogate_key(['cb.portal_slug', 'cb.empresa_id', 'cb.ano']) }} as posicao_fiscal_id,
    cb.portal_slug,
    cb.empresa_id,
    cb.ano,
    coalesce(r.total_arrecadado, 0)::numeric(15, 2) as total_arrecadado,
    coalesce(d.despesas_pagas, 0)::numeric(15, 2) as despesas_pagas,
    coalesce(d.restos_liquidados_no_ano, 0)::numeric(15, 2) as restos_liquidados_no_ano,
    coalesce(d.restos_pagos_no_ano, 0)::numeric(15, 2) as restos_pagos_no_ano,
    coalesce(d.restos_pendentes_adm_anterior, 0)::numeric(15, 2) as restos_pendentes_adm_anterior,
    coalesce(d.restos_pendentes_adm_atual, 0)::numeric(15, 2) as restos_pendentes_adm_atual,
    (coalesce(r.total_arrecadado, 0) - (coalesce(d.despesas_pagas, 0) + coalesce(d.restos_pagos_no_ano, 0)))::numeric(15, 2) as saldo_estimado
from chaves_base cb
left join receitas_agregadas r
    on cb.portal_slug = r.portal_slug
    and cb.empresa_id = r.empresa_id
    and cb.ano = r.ano
left join despesas_com_gestao d
    on cb.portal_slug = d.portal_slug
    and cb.empresa_id = d.empresa_id
    and cb.ano = d.ano
