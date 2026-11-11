{{ config(materialized='table') }}

with rgf as (
    select * from {{ ref('int_siconfi_rgf_consolidada') }}
),

portais as (
    select portal_slug, cod_ibge from {{ ref('dim_portais') }}
),

por_periodo as (
    select
        p.portal_slug,
        r.ano,
        r.periodicidade,
        r.periodo,
        -- max() colapsa linhas repetidas do mesmo período (ex.: retificação com a mesma chave); o ente entrega só um tipo de RGF.
        max(r.valor) filter (where r.cod_conta = 'DespesaComPessoalTotal' and r.coluna = 'Valor') as despesa_pessoal_12_meses,
        max(r.valor) filter (where r.cod_conta = 'ReceitaCorrenteLiquidaAjustada' and r.coluna = 'Valor') as receita_corrente_liquida_ajustada,
        max(r.valor) filter (where r.cod_conta = 'DespesaComPessoalTotal' and r.coluna = '% sobre a RCL Ajustada') as percentual_despesa_pessoal
    from rgf r
    inner join portais p
        on p.cod_ibge = r.cod_ibge
    group by p.portal_slug, r.ano, r.periodicidade, r.periodo
)

select
    {{ dbt_utils.generate_surrogate_key(['portal_slug', 'ano', 'periodicidade', 'periodo']) }} as pessoal_rgf_metricas_id,
    portal_slug,
    ano,
    periodicidade,
    periodo,
    despesa_pessoal_12_meses,
    receita_corrente_liquida_ajustada,
    percentual_despesa_pessoal
from por_periodo
where despesa_pessoal_12_meses is not null
    and receita_corrente_liquida_ajustada is not null
    and percentual_despesa_pessoal is not null
