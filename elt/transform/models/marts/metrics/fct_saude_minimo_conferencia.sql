{{ config(
    materialized='view' if var('test_mode', false) else 'table',
    indexes=[
        {'columns': ['portal_slug', 'ano'], 'unique': True}
    ] if not var('test_mode', false) else []
) }}

-- Conferência do mínimo de saúde: cálculo próprio do portal (receita arrecadada e despesa liquidada em saúde pagas
-- com impostos e transferências de impostos) contra os valores absolutos declarados ao SIOPS. Não é fonte da tela.
-- A base de receita usa só a linha principal de cada código (final .00.00), porque os portais repetem o valor em
-- linhas filhas e somar tudo contaria duas vezes. A fonte de recurso da despesa é texto livre do portal.
-- Diferença positiva = cálculo próprio acima do SIOPS. O SIOPS informa a despesa empenhada com dedução de restos a
-- pagar sem disponibilidade financeira; o cálculo próprio usa a despesa liquidada.

with receita as (
    select
        r.portal_slug,
        r.ano,
        sum(r.arrecadado) as receita_base_calculo_proprio
    from {{ ref('fct_receitas') }} r
    inner join {{ ref('seed_saude_minimo_base_calculo') }} b
        on b.componente = 'receita'
        and b.tipo_correspondencia = 'prefixo_codigo'
        and r.ano between b.ano_inicio and b.ano_fim
        and left(r.codigo, length(b.padrao)) = b.padrao
    where r.tipo_receita = 'orcamentaria'
        and right(r.codigo, 6) = '.00.00'
    group by r.portal_slug, r.ano
),

despesa as (
    select
        d.portal_slug,
        d.ano,
        sum(d.liquidado) as despesa_recursos_proprios_calculo_proprio
    from {{ ref('fct_despesas') }} d
    inner join {{ ref('seed_saude_minimo_base_calculo') }} b
        on b.componente = 'despesa'
        and b.tipo_correspondencia = 'palavra_chave_fonte_recurso'
        and d.ano between b.ano_inicio and b.ano_fim
    where d.funcao = '10'
        and {{ target.schema }}.unaccent(lower(coalesce(d.fonte_recurso_desc, ''))) like '%' || {{ target.schema }}.unaccent(lower(b.padrao)) || '%'
    group by d.portal_slug, d.ano
),

proprio as (
    select
        r.portal_slug,
        r.ano,
        r.receita_base_calculo_proprio,
        d.despesa_recursos_proprios_calculo_proprio,
        case
            when r.receita_base_calculo_proprio > 0
                then round(100 * d.despesa_recursos_proprios_calculo_proprio / r.receita_base_calculo_proprio, 2)
        end as percentual_aplicado_saude_calculo_proprio
    from receita r
    left join despesa d
        on d.portal_slug = r.portal_slug
        and d.ano = r.ano
)

select
    p.portal_slug,
    p.ano,
    p.receita_base_calculo_proprio,
    p.despesa_recursos_proprios_calculo_proprio,
    p.percentual_aplicado_saude_calculo_proprio,
    s.percentual_aplicado_saude as percentual_aplicado_saude_siops,
    s.receita_impostos_transferencias_constitucionais as receita_base_siops,
    s.despesa_recursos_proprios as despesa_recursos_proprios_siops,
    p.receita_base_calculo_proprio - s.receita_impostos_transferencias_constitucionais as diferenca_receita_base,
    p.despesa_recursos_proprios_calculo_proprio - s.despesa_recursos_proprios as diferenca_despesa_recursos_proprios,
    p.percentual_aplicado_saude_calculo_proprio - s.percentual_aplicado_saude as diferenca_percentual_pontos
from proprio p
left join {{ ref('fct_saude_minimo_constitucional') }} s
    on s.portal_slug = p.portal_slug
    and s.ano = p.ano
    and s.situacao = 'encerrado'
