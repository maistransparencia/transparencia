{{ config(materialized='view' if var('test_mode', false) else 'table') }}

with agregacao as (
    select
        portal_slug,
        ano,
        coalesce(nullif(ltrim(empresa_id, '0'), ''), '0') as empresa_id,
        categoria_regime,
        count(*)::integer as total_profissionais,
        coalesce(sum(proventos), 0)::numeric(15, 2) as total_proventos
    from {{ ref('fct_pessoal') }}
    group by portal_slug, ano, coalesce(nullif(ltrim(empresa_id, '0'), ''), '0'), categoria_regime
),

com_totais as (
    select
        portal_slug,
        ano,
        empresa_id,
        categoria_regime,
        total_profissionais,
        total_proventos,
        case
            when total_profissionais > 0 then round((total_proventos / total_profissionais), 2)
            else 0
        end::numeric(15, 2) as provento_medio,
        case
            when sum(total_profissionais) over (partition by portal_slug, ano, empresa_id) > 0
            then round(
                (total_profissionais::numeric / sum(total_profissionais) over (partition by portal_slug, ano, empresa_id)) * 100,
                2
            )
            else 0
        end::numeric(5, 2) as percentual_profissionais,
        case
            when sum(total_proventos) over (partition by portal_slug, ano, empresa_id) > 0
            then round(
                (total_proventos::numeric / sum(total_proventos) over (partition by portal_slug, ano, empresa_id)) * 100,
                2
            )
            else 0
        end::numeric(5, 2) as percentual_folha
    from agregacao
)

select
    {{ dbt_utils.generate_surrogate_key(['portal_slug', 'ano', 'empresa_id', 'categoria_regime']) }} as pessoal_regime_metricas_id,
    portal_slug,
    ano,
    empresa_id,
    categoria_regime,
    total_profissionais,
    total_proventos,
    provento_medio,
    percentual_profissionais,
    percentual_folha
from com_totais
