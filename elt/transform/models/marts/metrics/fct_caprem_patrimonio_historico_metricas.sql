with msc_base as (
    select
        'porciuncula_prefeitura' as portal_slug,
        ano,
        mes_referencia,
        conta_contabil,
        saldo_valor
    from {{ ref('stg_siconfi_msc_patrimonial') }}
    where poder_orgao = '10132'
),

msc as (
    select
        portal_slug,
        ano,
        mes_referencia,
        conta_contabil,
        saldo_valor,
        max(mes_referencia) over (partition by portal_slug, ano) as max_mes_ano
    from msc_base
),

competencias_finais as (
    select
        portal_slug,
        ano,
        mes_referencia,
        greatest(0, sum(case when conta_contabil like '111%' then saldo_valor else 0 end))::numeric(15, 2) as saldo_caixa,
        greatest(0, sum(case when conta_contabil like '114%' or conta_contabil like '1213%' then saldo_valor else 0 end))::numeric(15, 2) as saldo_aplicacoes
    from msc
    where mes_referencia = max_mes_ano
    group by portal_slug, ano, mes_referencia
),

com_totais as (
    select
        portal_slug,
        ano,
        mes_referencia,
        saldo_caixa,
        saldo_aplicacoes,
        (saldo_caixa + saldo_aplicacoes)::numeric(15, 2) as patrimonio_total
    from competencias_finais
),

com_variacoes as (
    select
        portal_slug,
        ano,
        mes_referencia,
        saldo_caixa,
        saldo_aplicacoes,
        patrimonio_total,
        (patrimonio_total - lag(patrimonio_total) over (partition by portal_slug order by ano))::numeric(15, 2) as variacao_abs,
        case
            when lag(patrimonio_total) over (partition by portal_slug order by ano) is not null
                and lag(patrimonio_total) over (partition by portal_slug order by ano) != 0
            then round(
                ((patrimonio_total - lag(patrimonio_total) over (partition by portal_slug order by ano))
                / lag(patrimonio_total) over (partition by portal_slug order by ano)) * 100,
                2
            )
            else null
        end::numeric(15, 2) as variacao_pct
    from com_totais
)

select
    {{ dbt_utils.generate_surrogate_key(['portal_slug', 'ano']) }} as caprem_patrimonio_historico_id,
    portal_slug,
    ano,
    mes_referencia,
    saldo_caixa,
    saldo_aplicacoes,
    patrimonio_total,
    variacao_abs,
    variacao_pct
from com_variacoes
