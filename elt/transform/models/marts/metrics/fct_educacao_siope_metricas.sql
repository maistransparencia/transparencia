{{ config(
    materialized='view' if var('test_mode', false) else 'table',
    indexes=[
        {'columns': ['portal_slug', 'ano'], 'unique': True}
    ] if not var('test_mode', false) else []
) }}

-- Indicadores do SIOPE (declarados pelo município ao FNDE) no grão portal + ano.
-- Códigos do Relatório Gerencial: 4.9 investimento por aluno, 4.8 educação básica, 4.1 infantil,
-- 4.2 ensino fundamental, 1.1 aplicação em MDE, 1.2 aplicação do FUNDEB na remuneração dos profissionais.
-- Usa o período mais avançado de cada ano; período 6 (6º bimestre) é o fechamento (encerrado),
-- qualquer anterior é parcial. Indicador ausente fica nulo, nunca zero.

with base as (
    select
        portal_slug,
        ano,
        periodo,
        codigo_indicador,
        valor,
        coletado_em,
        max(periodo) over (partition by portal_slug, ano) as periodo_mais_recente
    from {{ ref('stg_siope__indicadores') }}
)

select
    portal_slug,
    ano,
    periodo_mais_recente as periodo,
    case when periodo_mais_recente >= 6 then 'encerrado' else 'parcial' end as situacao,
    max(valor) filter (where codigo_indicador = '4.9') as investimento_por_aluno,
    max(valor) filter (where codigo_indicador = '4.8') as investimento_por_aluno_basica,
    max(valor) filter (where codigo_indicador = '4.1') as investimento_por_aluno_infantil,
    max(valor) filter (where codigo_indicador = '4.2') as investimento_por_aluno_fundamental,
    max(valor) filter (where codigo_indicador = '1.1') as percentual_aplicado_mde,
    max(valor) filter (where codigo_indicador = '1.2') as percentual_aplicado_fundeb_profissionais,
    max(coletado_em) as coletado_em
from base
where periodo = periodo_mais_recente
group by portal_slug, ano, periodo_mais_recente
