{{ config(materialized='table') }}

with despesas_base as (
    select
        portal_slug,
        ano,
        natureza_despesa_codigo,
        elemento,
        categoria_gasto_sensivel,
        coalesce(pago, 0) as pago,
        case
            when (natureza_despesa_codigo like '%.99' or elemento = '99') then 1
            else 0
        end as is_residual_99,
        case
            when (natureza_despesa_codigo like '%.99' or elemento = '99')
             and categoria_gasto_sensivel is not null then 1
            else 0
        end as is_desvio_sensivel
    from {{ ref('fct_despesas') }}
    where fonte = 'exercicio'
),

opacidade_agregada as (
    select
        portal_slug,
        ano,
        count(*)::integer as total_empenhos,
        sum(is_residual_99)::integer as empenhos_residual_99,
        sum(is_desvio_sensivel)::integer as empenhos_desvio_sensivel_99,
        case
            when count(*) > 0
            then least(100.00, round((sum(is_residual_99)::numeric / count(*) * 100.0), 2))
            else 0.00
        end as taxa_empenhos_opacidade_pct,
        sum(pago)::numeric(15, 2) as total_pago,
        sum(case when is_residual_99 = 1 then pago else 0 end)::numeric(15, 2) as pago_residual_99,
        sum(case when is_desvio_sensivel = 1 then pago else 0 end)::numeric(15, 2) as pago_desvio_sensivel_99,
        case
            when sum(pago) > 0
            then least(100.00, round((sum(case when is_residual_99 = 1 then pago else 0 end)::numeric / sum(pago) * 100.0), 2))
            else 0.00
        end as taxa_valor_opacidade_pct,
        case
            when sum(case when is_residual_99 = 1 then pago else 0 end) > 0
            then least(100.00, round((sum(case when is_desvio_sensivel = 1 then pago else 0 end)::numeric / sum(case when is_residual_99 = 1 then pago else 0 end) * 100.0), 2))
            else 0.00
        end as taxa_desvio_sensivel_pct
    from despesas_base
    group by
        portal_slug,
        ano
)

select
    {{ dbt_utils.generate_surrogate_key(['portal_slug', 'ano']) }} as opacidade_metricas_id,
    portal_slug,
    ano,
    total_empenhos,
    empenhos_residual_99,
    empenhos_desvio_sensivel_99,
    taxa_empenhos_opacidade_pct::numeric(5, 2) as taxa_empenhos_opacidade_pct,
    total_pago,
    pago_residual_99,
    pago_desvio_sensivel_99,
    taxa_valor_opacidade_pct::numeric(5, 2) as taxa_valor_opacidade_pct,
    taxa_desvio_sensivel_pct::numeric(5, 2) as taxa_desvio_sensivel_pct,
    case
        when taxa_valor_opacidade_pct > 30.00 then 'critico'
        when taxa_valor_opacidade_pct >= 15.00 then 'atencao'
        else 'normal'
    end as classificacao_risco
from opacidade_agregada
