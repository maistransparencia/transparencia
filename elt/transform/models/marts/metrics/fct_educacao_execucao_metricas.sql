{{ config(
    materialized='view' if var('test_mode', false) else 'table',
    indexes=[
        {'columns': ['portal_slug', 'ano'], 'unique': True},
        {'columns': ['portal_slug']}
    ] if not var('test_mode', false) else []
) }}

select
    portal_slug,
    ano,
    sum(coalesce(empenhado_liquido, 0))::numeric(15, 2) as empenhado_educacao,
    sum(coalesce(liquidado, 0))::numeric(15, 2) as liquidado_educacao,
    sum(coalesce(pago, 0))::numeric(15, 2) as pago_educacao,
    sum(case when grupo_natureza is distinct from '1' then coalesce(pago, 0) else 0 end)::numeric(15, 2) as pago_sem_pessoal_educacao
from {{ ref('fct_despesas') }}
where fonte = 'exercicio'
  and funcao = '12'
group by portal_slug, ano
