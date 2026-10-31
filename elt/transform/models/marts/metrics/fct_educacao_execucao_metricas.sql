{{ config(
    materialized='view' if var('test_mode', false) else 'table',
    indexes=[
        {'columns': ['portal_slug', 'ano'], 'unique': True},
        {'columns': ['portal_slug']}
    ] if not var('test_mode', false) else []
) }}

with despesas_educacao as (
    select
        portal_slug,
        ano,
        sum(coalesce(empenhado, 0))::numeric(15, 2) as empenhado_educacao,
        sum(coalesce(liquidado, 0))::numeric(15, 2) as liquidado_educacao,
        sum(coalesce(pago, 0))::numeric(15, 2) as pago_educacao,
        sum(case when subfuncao = '364' then coalesce(pago, 0) else 0 end)::numeric(15, 2) as pago_ensino_superior
    from {{ ref('fct_despesas') }}
    where fonte = 'exercicio'
      and funcao = '12'
    group by portal_slug, ano
),

matriculas as (
    select
        portal_slug,
        ano,
        total_matriculas_rede_municipal
    from {{ ref('seed_censo_escolar_matriculas') }}
)

select
    d.portal_slug,
    d.ano,
    d.empenhado_educacao,
    d.liquidado_educacao,
    d.pago_educacao,
    d.pago_ensino_superior,
    (d.pago_educacao - d.pago_ensino_superior)::numeric(15, 2) as pago_sem_ensino_superior,
    m.total_matriculas_rede_municipal,
    case
        when d.ano >= extract(year from current_date)::integer then null
        else round(
            ((d.pago_educacao - d.pago_ensino_superior) / nullif(m.total_matriculas_rede_municipal, 0))::numeric,
            2
        )
    end::numeric(15, 2) as pago_por_aluno
from despesas_educacao d
left join matriculas m
    on d.portal_slug = m.portal_slug
    and d.ano = m.ano
