{{ config(
    materialized='view' if var('test_mode', false) else 'table',
    indexes=[
        {'columns': ['portal_slug', 'ano'], 'unique': True}
    ] if not var('test_mode', false) else []
) }}

-- Procedimentos ambulatoriais (SIA) e internações (SIH) pagos pelo SUS na cidade, por ano e por mil moradores,
-- uma linha por portal e ano. É a produção registrada e paga pelo SUS, não todo o atendimento da cidade.
-- Cada ano soma as competências carregadas (a fonte tem defasagem de 1 a 2 meses e a carga é incremental):
-- competencias_* diz quantos meses entraram e ano_completo_* só é verdadeiro com os 12. Competência sem
-- resposta ou com total ilegível não conta como competência (nem entra em ano_completo_*), então ano sem nenhuma competência fica nulo ("sem dado nesta fonte"), nunca zero.
-- A população segue a regra do mart de leitos: do ano ou, sem ela, a do último ano anterior (populacao_estimada).

with sia_por_ano as (
    select
        portal_slug,
        ano,
        count(*)::integer as competencias_ambulatoriais,
        min(competencia) as primeira_competencia_ambulatorial,
        max(competencia) as ultima_competencia_ambulatorial,
        sum(total_procedimentos_ambulatoriais)::bigint as total_procedimentos_ambulatoriais,
        max(data_coleta) as data_coleta_ambulatorial
    from {{ ref('stg_saude_rede__sia_competencia') }}
    where ano >= {{ var('ano_inicial_historico', 2021) }} and total_procedimentos_ambulatoriais is not null
    group by portal_slug, ano
),

sih_por_ano as (
    select
        portal_slug,
        ano,
        count(*)::integer as competencias_internacoes,
        min(competencia) as primeira_competencia_internacoes,
        max(competencia) as ultima_competencia_internacoes,
        sum(total_internacoes)::bigint as total_internacoes,
        max(data_coleta) as data_coleta_internacoes
    from {{ ref('stg_saude_rede__sih_competencia') }}
    where ano >= {{ var('ano_inicial_historico', 2021) }} and total_internacoes is not null
    group by portal_slug, ano
),

anos as (
    select portal_slug, ano from sia_por_ano
    union
    select portal_slug, ano from sih_por_ano
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
        s.competencias_ambulatoriais,
        h.competencias_internacoes,
        s.primeira_competencia_ambulatorial,
        s.ultima_competencia_ambulatorial,
        h.primeira_competencia_internacoes,
        h.ultima_competencia_internacoes,
        s.total_procedimentos_ambulatoriais,
        h.total_internacoes,
        coalesce(s.competencias_ambulatoriais = 12, false) as ano_completo_ambulatorial,
        coalesce(h.competencias_internacoes = 12, false) as ano_completo_internacoes,
        po.total_populacao as populacao_residente,
        po.ano_populacao_referencia,
        coalesce(po.ano_populacao_referencia <> a.ano, false) as populacao_estimada,
        greatest(s.data_coleta_ambulatorial, h.data_coleta_internacoes) as data_coleta
    from anos a
    left join sia_por_ano s on s.portal_slug = a.portal_slug and s.ano = a.ano
    left join sih_por_ano h on h.portal_slug = a.portal_slug and h.ano = a.ano
    left join populacao_do_ano po on po.portal_slug = a.portal_slug and po.ano = a.ano
)

select
    portal_slug,
    ano,
    competencias_ambulatoriais,
    competencias_internacoes,
    primeira_competencia_ambulatorial,
    ultima_competencia_ambulatorial,
    primeira_competencia_internacoes,
    ultima_competencia_internacoes,
    total_procedimentos_ambulatoriais,
    total_internacoes,
    ano_completo_ambulatorial,
    ano_completo_internacoes,
    populacao_residente,
    ano_populacao_referencia,
    populacao_estimada,
    (total_procedimentos_ambulatoriais * 1000.0 / populacao_residente)::numeric(12, 2) as procedimentos_ambulatoriais_por_mil_moradores,
    (total_internacoes * 1000.0 / populacao_residente)::numeric(12, 2) as internacoes_por_mil_moradores,
    data_coleta
from juncao
