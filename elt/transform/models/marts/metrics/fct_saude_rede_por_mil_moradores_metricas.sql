{{ config(
    materialized='view' if var('test_mode', false) else 'table',
    indexes=[
        {'columns': ['portal_slug', 'ano'], 'unique': True}
    ] if not var('test_mode', false) else []
) }}

-- Leitos (existentes e do SUS) e profissionais de saúde por mil moradores, uma linha por portal e ano.
-- Leitos e profissionais vêm do CNES: só a competência mais recente carregada de cada ano entra (a carga
-- acumula competências e nunca apaga); sem resposta fica nulo ("sem dado"), nunca zero. A população é do ano; sem população do ano usa a mais recente
-- anterior e marca populacao_estimada. Sem régua numérica: o portal só compara com anos anteriores.

with leitos_competencia_recente as (
    select
        portal_slug,
        ano,
        competencia,
        total_leitos_existentes,
        total_leitos_sus,
        data_coleta,
        max(competencia) over (partition by portal_slug, ano) as competencia_mais_recente
    from {{ ref('stg_saude_rede__leitos_competencia') }}
    where ano >= {{ var('ano_inicial_historico', 2021) }}
),

leitos as (
    select
        portal_slug,
        ano,
        max(competencia) as competencia_leitos,
        sum(total_leitos_existentes)::integer as total_leitos_existentes,
        sum(total_leitos_sus)::integer as total_leitos_sus,
        max(data_coleta) as data_coleta_leitos
    from leitos_competencia_recente
    where competencia = competencia_mais_recente
    group by portal_slug, ano
),

profissionais_competencia_recente as (
    select
        portal_slug,
        ano,
        competencia,
        total_profissionais,
        total_profissionais_sus,
        data_coleta,
        max(competencia) over (partition by portal_slug, ano) as competencia_mais_recente
    from {{ ref('stg_saude_rede__profissionais_competencia') }}
    where ano >= {{ var('ano_inicial_historico', 2021) }}
),

profissionais as (
    select
        portal_slug,
        ano,
        competencia as competencia_profissionais,
        total_profissionais,
        total_profissionais_sus,
        data_coleta as data_coleta_profissionais
    from profissionais_competencia_recente
    where competencia = competencia_mais_recente
),

anos as (
    select portal_slug, ano from leitos
    union
    select portal_slug, ano from profissionais
    union
    select portal_slug, ano
    from {{ ref('stg_saude_rede__populacao_residente') }}
    where ano >= {{ var('ano_inicial_historico', 2021) }} and total_populacao > 0
),

populacao_do_ano as (
    select
        a.portal_slug,
        a.ano,
        p.ano as ano_populacao_referencia,
        p.total_populacao
    from anos a
    left join lateral (
        select p.ano, p.total_populacao
        from {{ ref('stg_saude_rede__populacao_residente') }} p
        where p.portal_slug = a.portal_slug
          and p.ano <= a.ano
          and p.total_populacao > 0
        order by p.ano desc
        limit 1
    ) p on true
),

juncao as (
    select
        a.portal_slug,
        a.ano,
        l.competencia_leitos,
        pr.competencia_profissionais,
        l.total_leitos_existentes,
        l.total_leitos_sus,
        pr.total_profissionais,
        pr.total_profissionais_sus,
        po.total_populacao as populacao_residente,
        po.ano_populacao_referencia,
        coalesce(po.ano_populacao_referencia <> a.ano, false) as populacao_estimada,
        greatest(l.data_coleta_leitos, pr.data_coleta_profissionais) as data_coleta
    from anos a
    left join leitos l on l.portal_slug = a.portal_slug and l.ano = a.ano
    left join profissionais pr on pr.portal_slug = a.portal_slug and pr.ano = a.ano
    left join populacao_do_ano po on po.portal_slug = a.portal_slug and po.ano = a.ano
)

select
    portal_slug,
    ano,
    competencia_leitos,
    competencia_profissionais,
    total_leitos_existentes,
    total_leitos_sus,
    total_profissionais,
    total_profissionais_sus,
    populacao_residente,
    ano_populacao_referencia,
    populacao_estimada,
    (total_leitos_existentes * 1000.0 / populacao_residente)::numeric(10, 2) as leitos_existentes_por_mil_moradores,
    (total_leitos_sus * 1000.0 / populacao_residente)::numeric(10, 2) as leitos_sus_por_mil_moradores,
    (total_profissionais * 1000.0 / populacao_residente)::numeric(10, 2) as profissionais_por_mil_moradores,
    (total_profissionais_sus * 1000.0 / populacao_residente)::numeric(10, 2) as profissionais_sus_por_mil_moradores,
    data_coleta
from juncao
