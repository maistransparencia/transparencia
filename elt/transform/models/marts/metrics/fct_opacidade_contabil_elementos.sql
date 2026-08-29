{{ config(materialized='table') }}

with despesas_99 as (
    select
        portal_slug,
        ano,
        coalesce(nullif(elemento, ''), '99') as elemento_codigo,
        natureza_despesa_codigo,
        coalesce(pago, 0) as pago
    from {{ ref('fct_despesas') }}
    where (natureza_despesa_codigo like '%.99' or elemento = '99')
      and fonte = 'exercicio'
),

elementos_agregados as (
    select
        d.portal_slug,
        d.ano,
        d.elemento_codigo,
        coalesce(e.elemento_descricao, 'Outros Elementos') as elemento_descricao,
        coalesce(e.categoria_macro, 'Outros') as categoria_macro,
        case
            when d.elemento_codigo in ('91', '13', '94', '96', '92', '01', '02', '03', '05', '09', '97', '98', '47')
            then 'estrutural'
            else 'evitavel'
        end as tipo_residual,
        count(*)::integer as total_empenhos,
        sum(d.pago)::numeric(15, 2) as total_pago
    from despesas_99 d
    left join {{ ref('seed_elemento_despesa') }} e
        on d.elemento_codigo = e.elemento_codigo
    group by
        d.portal_slug,
        d.ano,
        d.elemento_codigo,
        e.elemento_descricao,
        e.categoria_macro
),

com_ranking_e_pct as (
    select
        {{ dbt_utils.generate_surrogate_key(['portal_slug', 'ano', 'elemento_codigo']) }} as opacidade_elemento_id,
        portal_slug,
        ano,
        elemento_codigo,
        elemento_descricao,
        categoria_macro,
        tipo_residual,
        total_empenhos,
        total_pago,
        case
            when sum(total_pago) over (partition by portal_slug, ano) > 0
            then round((total_pago / sum(total_pago) over (partition by portal_slug, ano) * 100.0), 2)
            else 0.00
        end as percentual_do_residual_99,
        row_number() over (partition by portal_slug, ano order by total_pago desc)::integer as ranking
    from elementos_agregados
)

select * from com_ranking_e_pct
order by portal_slug, ano desc, ranking asc
