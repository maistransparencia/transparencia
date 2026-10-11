-- Fato: Obras publicas consolidadas por municipio do ObrasGov.br
{{ config(
    materialized = 'view' if var('test_mode', false) else 'table'
) }}

with projetos as (
    select
        portal_slug,
        id_projeto,
        nome_obra,
        situacao,
        orgao_responsavel,
        valor_investimento_previsto,
        data_inicio_prevista,
        data_fim_prevista
    from {{ ref('stg_obrasgov__projetos') }}
),

coords as (
    select distinct on (portal_slug, id_projeto)
        portal_slug,
        id_projeto,
        latitude,
        longitude
    from {{ ref('stg_obrasgov__geometrias') }}
    order by portal_slug, id_projeto, id_geometria
),

latest_medicao as (
    select distinct on (portal_slug, id_projeto)
        portal_slug,
        id_projeto,
        percentual_execucao_fisica,
        data_medicao as data_ultima_medicao
    from {{ ref('stg_obrasgov__execucoes_fisicas') }}
    order by portal_slug, id_projeto, data_medicao desc nulls last
),

latest_paralisacao as (
    select distinct on (portal_slug, id_projeto)
        portal_slug,
        id_projeto,
        justificativa_cancelada_paralisada as motivo_paralisacao
    from {{ ref('stg_obrasgov__historico_paralisacoes') }}
    where justificativa_cancelada_paralisada is not null and trim(justificativa_cancelada_paralisada) != ''
    order by portal_slug, id_projeto, data_historico_situacao_investimento desc nulls last
)

select
    p.portal_slug,
    p.id_projeto,
    p.nome_obra,
    p.situacao,
    p.orgao_responsavel,
    p.valor_investimento_previsto,
    m.percentual_execucao_fisica,
    m.data_ultima_medicao,
    c.latitude,
    c.longitude,
    case
        when p.situacao = 'paralisada' then par.motivo_paralisacao
        else null
    end as motivo_paralisacao,
    p.data_inicio_prevista,
    p.data_fim_prevista
from projetos p
left join coords c
    on p.portal_slug = c.portal_slug
    and p.id_projeto = c.id_projeto
left join latest_medicao m
    on p.portal_slug = m.portal_slug
    and p.id_projeto = m.id_projeto
left join latest_paralisacao par
    on p.portal_slug = par.portal_slug
    and p.id_projeto = par.id_projeto
