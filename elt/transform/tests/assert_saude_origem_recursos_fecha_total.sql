{{ config(severity='warn') }}

-- Avisa quando as linhas do mart não somam o total oficial da receita do órgão de saúde
-- (detalhe acima do total, que o mart descarta em vez de mostrar valor negativo).
with mart as (
    select portal_slug, ano, empresa_id, sum(arrecadado_receita) as total_mart
    from {{ ref('fct_saude_origem_recursos_metricas') }}
    group by portal_slug, ano, empresa_id
),

oficial as (
    select portal_slug, ano, empresa_id, sum(arrecadado) as total_oficial
    from {{ ref('fct_receitas') }}
    where tipo_receita = 'orcamentaria'
      and rtrim(codigo, '0.') in ('1', '2')
    group by portal_slug, ano, empresa_id
)

select m.portal_slug, m.ano, m.empresa_id, m.total_mart, o.total_oficial
from mart m
join oficial o
    on o.portal_slug = m.portal_slug
    and o.ano = m.ano
    and o.empresa_id = m.empresa_id
where abs(m.total_mart - o.total_oficial) > 0.01
