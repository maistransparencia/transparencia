{{ config(
    materialized='view' if var('test_mode', false) else 'table',
    indexes=[
        {'columns': ['portal_slug', 'ano'], 'unique': True}
    ] if not var('test_mode', false) else []
) }}

-- Matrículas da educação infantil e do ensino fundamental (1º ao 9º ano) na rede municipal, do Censo Escolar (INEP), no grão portal + ano.
-- Rede municipal, API do IBGE; matriculas_educacao_basica = infantil + fundamental. É a fotografia de maio do ano do Censo.
-- Ano sem registro no raw não aparece (nunca zero).

select
    portal_slug,
    ano,
    matriculas_educacao_infantil,
    matriculas_ensino_fundamental,
    matriculas_educacao_infantil + matriculas_ensino_fundamental as matriculas_educacao_basica,
    coletado_em
from {{ ref('stg_inep_censo__matriculas') }}
where matriculas_educacao_infantil + matriculas_ensino_fundamental > 0
