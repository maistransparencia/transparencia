-- Staging: indicadores de saúde do SIOPS (Ministério da Saúde), declarados pelo município.
-- Fonte única de todos os portais (raw_siops, portal_slug na chave). Valor ausente permanece nulo (nunca zero).

with source as (
    select * from {{ source('raw_siops', 'siops_indicadores') }}
)

select
    portal_slug,
    ano::int as ano,
    periodo::int as periodo,
    nullif(trim(tipo_periodo), '') as tipo_periodo,
    nullif(trim(via), '') as via,
    trim(codigo_indicador) as codigo_indicador,
    nullif(trim(unidade), '') as unidade,
    valor::numeric as valor,
    coletado_em
from source
