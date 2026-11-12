-- Fato: ultima coleta de cada fonte do catalogo (seed_fontes_coleta) por portal.
-- Toda fonte do catalogo aparece para todo portal: sem registro de coleta, nunca e presumida atualizada.
{{ config(
    materialized = 'view' if var('test_mode', false) else 'table'
) }}

with ultimas_coletas as (
    select
        portal_slug,
        fonte,
        max(coletado_em) as ultima_coleta_em,
        count(*) as total_coletas
    from {{ ref('stg_coletas__registro_coletas') }}
    group by portal_slug, fonte
)

select
    {{ dbt_utils.generate_surrogate_key(['p.portal_slug', 'f.fonte']) }} as id_registro,
    p.portal_slug,
    f.fonte,
    f.frequencia_esperada,
    case
        when f.monitoramento = 'nao_monitorado' then 'nao_monitorado'
        when c.ultima_coleta_em is null then 'sem_registro'
        else 'monitorado'
    end as situacao_monitoramento,
    c.ultima_coleta_em,
    coalesce(c.total_coletas, 0)::integer as total_coletas
from {{ ref('dim_portais') }} p
cross join {{ ref('seed_fontes_coleta') }} f
left join ultimas_coletas c
    on c.portal_slug = p.portal_slug
    and c.fonte = f.fonte
