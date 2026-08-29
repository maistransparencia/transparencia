{{ config(materialized='table') }}

with despesas_99 as (
    select
        portal_slug,
        ano,
        coalesce(fornecedor_cpf_cnpj, '00') as credor_codigo,
        coalesce(fornecedor_nome, 'OUTROS') as credor_nome,
        categoria_objeto_sugerida,
        categoria_gasto_sensivel,
        natureza_despesa_codigo_sugerido,
        {{ target.schema }}.unaccent(trim(coalesce(descricao, ''))) as descricao_sanitizada,
        coalesce(pago, 0) as pago
    from {{ ref('fct_despesas') }}
    where fonte = 'exercicio'
      and (natureza_despesa_codigo like '%.99' or elemento = '99')
),

credores_agregados as (
    select
        portal_slug,
        ano,
        credor_codigo,
        credor_nome,
        count(*)::integer as total_empenhos,
        sum(pago)::numeric(15, 2) as total_pago,
        sum(case when coalesce(categoria_objeto_sugerida, categoria_gasto_sensivel) is not null then pago else 0 end)::numeric(15, 2) as pago_desvio_sensivel,
        coalesce(
            max(nullif(categoria_objeto_sugerida, '')),
            max(nullif(categoria_gasto_sensivel, '')),
            'sem_classificacao_especifica'
        ) as categoria_predominante,
        max(nullif(descricao_sanitizada, '')) as amostra_objeto
    from despesas_99
    group by
        portal_slug,
        ano,
        credor_codigo,
        credor_nome
),

credores_ranqueados as (
    select
        portal_slug,
        ano,
        credor_codigo,
        credor_nome,
        total_empenhos,
        total_pago,
        pago_desvio_sensivel,
        categoria_predominante,
        coalesce(amostra_objeto, 'Despesa em subitem residual') as amostra_objeto,
        row_number() over (
            partition by portal_slug, ano
            order by total_pago desc, total_empenhos desc, credor_nome asc
        ) as ranking
    from credores_agregados
)

select
    {{ dbt_utils.generate_surrogate_key(['portal_slug', 'ano', 'credor_codigo', 'credor_nome']) }} as opacidade_credor_id,
    portal_slug,
    ano,
    credor_codigo,
    credor_nome,
    total_empenhos,
    total_pago,
    pago_desvio_sensivel,
    categoria_predominante,
    amostra_objeto,
    ranking::integer as ranking
from credores_ranqueados
where ranking <= 10
