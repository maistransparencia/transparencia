{{ config(
    materialized='view' if var('test_mode', false) else 'table',
    indexes=[
        {'columns': ['portal_slug', 'ano'], 'unique': True}
    ] if not var('test_mode', false) else []
) }}

-- Matrículas da educação básica na rede municipal, do Censo Escolar (INEP), no grão portal + ano.
-- Total de QT_MAT_BAS das escolas municipais em atividade; é a fotografia de maio do ano do Censo.
-- Ano sem registro no raw não aparece (nunca zero).

select
    portal_slug,
    ano,
    matriculas_educacao_basica,
    quantidade_escolas,
    coletado_em
from {{ ref('stg_inep_censo__matriculas') }}
where matriculas_educacao_basica > 0
