-- Fato: emendas consolidadas de todos os portais
-- O recebimento no fundo é um indício: a emenda é dada como recebida quando existe uma linha de
-- receita orçamentária da mesma entidade, no mesmo ano, com arrecadação de valor igual ao da emenda.
-- Cada linha de receita cobre uma emenda só (emendas de mesmo valor disputam as linhas disponíveis).

with emendas as (
    select
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

emendas_ordenadas as (
    select
        *,
        row_number() over (
            partition by portal_slug, ano, empresa_id, round(valor_total)
            order by numero_emenda, resumo
        ) as posicao_mesmo_valor
    from emendas
),

receitas_por_valor as (
    select
        portal_slug,
        ano,
        empresa_id,
        round(arrecadado) as valor_arredondado,
        count(*) as linhas_receita
    from {{ ref('fct_receitas') }}
    where tipo_receita = 'orcamentaria'
        and arrecadado > 0
    group by portal_slug, ano, empresa_id, round(arrecadado)
)

select
    {{ dbt_utils.generate_surrogate_key(['e.portal_slug', 'e.ano', 'e.empresa_id', 'e.numero_emenda']) }} as emenda_id,
    e.portal_slug,
    e.ano,
    e.empresa_id,
    e.numero_emenda,
    e.resumo,
    e.valor_total::numeric(15, 2) as valor_total,
    e.empenhado::numeric(15, 2) as empenhado,
    e.autor,
    e.tipo_emenda,
    e.esfera_origem,
    e.ato_normativo,
    e.destinacao,
    case
        when r.linhas_receita >= e.posicao_mesmo_valor then e.valor_total
        else 0
    end::numeric(15, 2) as valor_recebido_fundo,
    case
        when r.linhas_receita >= e.posicao_mesmo_valor then 'identificado_por_valor'
        else 'nao_identificado'
    end as recebimento_fundo
from emendas_ordenadas e
left join receitas_por_valor r
    on e.portal_slug = r.portal_slug
    and e.ano = r.ano
    and e.empresa_id = r.empresa_id
    and round(e.valor_total) = r.valor_arredondado
