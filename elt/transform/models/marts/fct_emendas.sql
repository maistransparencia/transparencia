-- Fato: emendas consolidadas de todos os portais

with emendas as (
    select distinct
        portal_slug,
        ano,
        empresa_id,
        numero_emenda,
        resumo,
        valor_total,
        empenhado,
        autor,
        tipo_emenda,
        esfera_origem,
        ato_normativo,
        destinacao
    from {{ ref('int_emendas_consolidadas') }}
),

despesas_exercicio as (
    select
        portal_slug,
        ano,
        descricao,
        empenhado_liquido
    from {{ ref('fct_despesas') }}
    where fonte = 'exercicio'
        and empenhado_liquido > 0
),

empenhos_despesas_agrupados as (
    select
        e.portal_slug,
        e.ano,
        e.empresa_id,
        e.numero_emenda,
        sum(d.empenhado_liquido) as empenhado_despesa
    from emendas e
    inner join despesas_exercicio d
        on d.portal_slug = e.portal_slug
        and d.ano = e.ano
        and (
            (length(e.numero_emenda) >= 6 and {{ target.schema }}.unaccent(lower(d.descricao)) like '%' || {{ target.schema }}.unaccent(lower(e.numero_emenda)) || '%')
            or (length(e.numero_emenda) >= 12 and {{ target.schema }}.unaccent(lower(d.descricao)) like '%' || substring(e.numero_emenda from 1 for 10) || '%')
        )
    group by 1, 2, 3, 4
),

emendas_atualizadas as (
    select
        e.portal_slug,
        e.ano,
        e.empresa_id,
        e.numero_emenda,
        e.resumo,
        e.valor_total,
        greatest(coalesce(e.empenhado, 0), coalesce(ed.empenhado_despesa, 0)) as empenhado,
        e.autor,
        e.tipo_emenda,
        e.esfera_origem,
        e.ato_normativo,
        e.destinacao
    from emendas e
    left join empenhos_despesas_agrupados ed
        on e.portal_slug = ed.portal_slug
        and e.ano = ed.ano
        and e.empresa_id = ed.empresa_id
        and e.numero_emenda = ed.numero_emenda
)

select
    {{ dbt_utils.generate_surrogate_key(['portal_slug', 'ano', 'empresa_id', 'numero_emenda']) }} as emenda_id,
    portal_slug,
    ano,
    empresa_id,
    numero_emenda,
    resumo,
    valor_total::numeric(15, 2) as valor_total,
    empenhado::numeric(15, 2) as empenhado,
    autor,
    tipo_emenda,
    esfera_origem,
    ato_normativo,
    destinacao
from emendas_atualizadas
