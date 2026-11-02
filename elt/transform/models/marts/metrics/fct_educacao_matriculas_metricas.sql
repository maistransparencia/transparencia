{{ config(
    materialized='view' if var('test_mode', false) else 'table',
    indexes=[
        {'columns': ['portal_slug', 'ano'], 'unique': True}
    ] if not var('test_mode', false) else []
) }}

-- Matrículas do ensino fundamental (1º ao 9º ano) na rede municipal, do Censo Escolar (INEP), no grão portal + ano.
-- Soma do 1º ao 9º ano do fundamental municipal (API do IBGE); é a fotografia de maio do ano do Censo.
-- Ano sem registro no raw não aparece (nunca zero).

select
    portal_slug,
    ano,
    matriculas_ensino_fundamental,
    coletado_em
from {{ ref('stg_inep_censo__matriculas') }}
where matriculas_ensino_fundamental > 0
