{% test receitas_folhas_conciliam_com_topo(model, tolerancia=0.01) %}
with orcamentarias as (
    select
        portal_slug,
        ano,
        empresa_id,
        codigo,
        coalesce(arrecadado, 0) as arrecadado
    from {{ model }}
    where tipo_receita = 'orcamentaria'
),

folhas as (
    select
        t.portal_slug,
        t.ano,
        t.empresa_id,
        t.arrecadado
    from orcamentarias t
    where not exists (
        select 1
        from orcamentarias t2
        where t2.portal_slug = t.portal_slug
          and t2.ano = t.ano
          and t2.empresa_id = t.empresa_id
          and t2.codigo != t.codigo
          and t.codigo like rtrim(t2.codigo, '0.') || '%'
          and length(rtrim(t2.codigo, '0.')) < length(rtrim(t.codigo, '0.'))
    )
),

soma_folhas as (
    select portal_slug, ano, empresa_id, sum(arrecadado) as total_folhas
    from folhas
    group by portal_slug, ano, empresa_id
),

soma_topo as (
    select portal_slug, ano, empresa_id, sum(arrecadado) as total_topo
    from orcamentarias
    where rtrim(codigo, '0.') in ('1', '2')
    group by portal_slug, ano, empresa_id
)

select
    f.portal_slug,
    f.ano,
    f.empresa_id,
    f.total_folhas,
    t.total_topo
from soma_folhas f
join soma_topo t
    on t.portal_slug = f.portal_slug
    and t.ano = f.ano
    and t.empresa_id = f.empresa_id
where abs(f.total_folhas - t.total_topo) > {{ tolerancia }}
{% endtest %}
