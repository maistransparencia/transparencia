{{ config(
    materialized='view' if var('test_mode', false) else 'table',
    indexes=[
        {'columns': ['portal_slug', 'ano', 'etapa_ensino'], 'unique': True},
        {'columns': ['portal_slug', 'ano']},
        {'columns': ['portal_slug']}
    ] if not var('test_mode', false) else []
) }}

with ideb_base as (
    select
        p.portal_slug,
        p.cod_ibge,
        i.ano,
        i.rede,
        i.etapa_ensino,
        i.nota_ideb::numeric(3, 1) as nota_ideb,
        i.meta_ideb::numeric(3, 1) as meta_ideb,
        i.saeb_matematica::numeric(5, 2) as saeb_matematica,
        i.saeb_lingua_portuguesa::numeric(5, 2) as saeb_lingua_portuguesa,
        i.taxa_aprovacao::numeric(7, 6) as indicador_fluxo_aprovacao
    from {{ ref('stg_inep__ideb') }} i
    join {{ ref('dim_portais') }} p
        on p.cod_ibge = i.cod_ibge
    where i.rede = 'municipal'
),

ideb_metricas as (
    select
        portal_slug,
        cod_ibge,
        ano,
        rede,
        etapa_ensino,
        nota_ideb,
        meta_ideb,
        case
            when nota_ideb is null or meta_ideb is null then null
            when nota_ideb >= meta_ideb then true
            else false
        end as atingiu_meta_flag,
        saeb_matematica,
        saeb_lingua_portuguesa,
        indicador_fluxo_aprovacao,
        round(
            (nota_ideb - lag(nota_ideb) over (
                partition by portal_slug, etapa_ensino
                order by ano
            ))::numeric,
            1
        )::numeric(3, 1) as crescimento_pontos_ideb,
        round(
            (saeb_matematica - lag(saeb_matematica) over (
                partition by portal_slug, etapa_ensino
                order by ano
            ))::numeric,
            2
        )::numeric(5, 2) as variacao_saeb_matematica,
        round(
            (saeb_lingua_portuguesa - lag(saeb_lingua_portuguesa) over (
                partition by portal_slug, etapa_ensino
                order by ano
            ))::numeric,
            2
        )::numeric(5, 2) as variacao_saeb_portugues
    from ideb_base
),

despesas_educacao as (
    select
        portal_slug,
        ano,
        sum(coalesce(liquidado, 0))::numeric(15, 2) as despesa_liquidada_educacao
    from {{ ref('fct_despesas') }}
    where (funcao = '12' or lower({{ target.schema }}.unaccent(coalesce(funcao_nome, ''))) like '%educa%')
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
    {{ dbt_utils.generate_surrogate_key(['i.portal_slug', 'i.ano', 'i.etapa_ensino']) }} as educacao_metrica_id,
    i.portal_slug,
    i.cod_ibge,
    i.ano,
    i.rede,
    i.etapa_ensino,
    i.nota_ideb,
    i.meta_ideb,
    i.atingiu_meta_flag,
    i.saeb_matematica,
    i.saeb_lingua_portuguesa,
    i.indicador_fluxo_aprovacao,
    i.crescimento_pontos_ideb,
    i.variacao_saeb_matematica,
    i.variacao_saeb_portugues,
    d.despesa_liquidada_educacao,
    m.total_matriculas_rede_municipal,
    round(
        (d.despesa_liquidada_educacao / nullif(m.total_matriculas_rede_municipal, 0))::numeric,
        2
    )::numeric(15, 2) as custo_anual_por_aluno
from ideb_metricas i
left join despesas_educacao d
    on i.portal_slug = d.portal_slug
    and i.ano = d.ano
left join matriculas m
    on i.portal_slug = m.portal_slug
    and i.ano = m.ano
