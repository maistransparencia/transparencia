-- Intermediário: consolida os indicadores do SIOPE de todos os portais via union all.
-- Para adicionar novo portal: incluir novo CTE + union all abaixo.

with porciuncula as (
    select
        portal_slug,
        ano,
        periodo,
        tipo_periodo,
        codigo_indicador,
        unidade,
        valor,
        coletado_em
    from {{ ref('stg_porciuncula_prefeitura__siope_indicadores') }}
),

natividade as (
    select
        portal_slug,
        ano,
        periodo,
        tipo_periodo,
        codigo_indicador,
        unidade,
        valor,
        coletado_em
    from {{ ref('stg_natividade_prefeitura__siope_indicadores') }}
)

select * from porciuncula
union all
select * from natividade
