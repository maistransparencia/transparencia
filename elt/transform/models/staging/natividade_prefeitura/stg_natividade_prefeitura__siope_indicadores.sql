-- Staging: indicadores do SIOPE (Relatório Gerencial do FNDE), declarados pelo município.
-- Valor ausente permanece nulo (nunca zero).

with source as (
    select * from {{ source('natividade_prefeitura', 'siope_indicadores') }}
)

select
    portal_slug,
    ano::int as ano,
    periodo::int as periodo,
    nullif(trim(tipo_periodo), '') as tipo_periodo,
    trim(codigo_indicador) as codigo_indicador,
    nullif(trim(unidade), '') as unidade,
    valor::numeric as valor,
    coletado_em
from source
