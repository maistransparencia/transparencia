-- Staging: matrículas do Censo Escolar (INEP) nas escolas municipais em atividade.
-- Fonte única de todos os portais (raw_inep_censo, portal_slug na chave).

with source as (
    select * from {{ source('raw_inep_censo', 'matriculas_rede_municipal') }}
)

select
    portal_slug,
    ano::int as ano,
    matriculas_educacao_infantil::int as matriculas_educacao_infantil,
    matriculas_ensino_fundamental::int as matriculas_ensino_fundamental,
    coletado_em
from source
