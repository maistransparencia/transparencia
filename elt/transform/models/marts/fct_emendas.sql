-- Fato: emendas consolidadas de todos os portais
-- O recebimento da emenda na receita é um indício, em dois níveis de confiança:
--   confirmado_por_proposta: existe linha de receita da mesma entidade e ano com o mesmo valor
--     e com o número da proposta da emenda (10 primeiros dígitos) na descrição;
--   valor_igual: existe linha de receita de mesmo valor, sem o número da proposta (pode ser coincidência).
-- Cada linha de receita cobre uma emenda só: emendas de mesmo valor disputam as linhas disponíveis.

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
        destinacao,
        regexp_replace(coalesce(numero_emenda, ''), '\D', '', 'g') as numero_digitos
    from {{ ref('int_emendas_consolidadas') }}
),

linhas_receita as (
    select
        portal_slug,
        ano,
        empresa_id,
        codigo,
        descricao,
        arrecadado,
        round(arrecadado) as valor_arredondado
    from {{ ref('fct_receitas') }}
    where tipo_receita = 'orcamentaria'
        and arrecadado > 0
),

confirmadas_candidatas as (
    select distinct on (e.portal_slug, e.ano, e.empresa_id, e.numero_emenda, e.resumo)
        e.portal_slug,
        e.ano,
        e.empresa_id,
        e.numero_emenda,
        e.resumo,
        l.codigo as receita_codigo,
        l.descricao as receita_descricao
    from emendas e
    join linhas_receita l
        on e.portal_slug = l.portal_slug
        and e.ano = l.ano
        and e.empresa_id = l.empresa_id
        and round(e.valor_total) = l.valor_arredondado
        and length(e.numero_digitos) >= 10
        and l.descricao like '%' || left(e.numero_digitos, 10) || '%'
    order by e.portal_slug, e.ano, e.empresa_id, e.numero_emenda, e.resumo, l.codigo
),

-- uma linha de receita confirma uma emenda só; as demais disputam as linhas livres
confirmadas as (
    select
        portal_slug,
        ano,
        empresa_id,
        numero_emenda,
        resumo,
        receita_codigo,
        receita_descricao
    from (
        select
            *,
            row_number() over (
                partition by portal_slug, ano, empresa_id, receita_codigo
                order by numero_emenda, resumo
            ) as posicao_na_linha
        from confirmadas_candidatas
    ) ranqueadas
    where posicao_na_linha = 1
),

linhas_usadas as (
    select
        c.portal_slug,
        c.ano,
        c.empresa_id,
        round(e.valor_total) as valor_arredondado,
        count(*) as linhas_confirmadas
    from confirmadas c
    join emendas e
        on c.portal_slug = e.portal_slug
        and c.ano = e.ano
        and c.empresa_id = e.empresa_id
        and c.numero_emenda is not distinct from e.numero_emenda
        and c.resumo is not distinct from e.resumo
    group by c.portal_slug, c.ano, c.empresa_id, round(e.valor_total)
),

linhas_livres as (
    select
        l.portal_slug,
        l.ano,
        l.empresa_id,
        l.valor_arredondado,
        count(*) - coalesce(max(u.linhas_confirmadas), 0) as linhas_disponiveis,
        (array_agg(l.codigo order by l.codigo))[1] as receita_codigo,
        (array_agg(l.descricao order by l.codigo))[1] as receita_descricao
    from linhas_receita l
    left join linhas_usadas u
        on l.portal_slug = u.portal_slug
        and l.ano = u.ano
        and l.empresa_id = u.empresa_id
        and l.valor_arredondado = u.valor_arredondado
    group by l.portal_slug, l.ano, l.empresa_id, l.valor_arredondado
),

emendas_sem_confirmacao as (
    select
        e.*,
        row_number() over (
            partition by e.portal_slug, e.ano, e.empresa_id, round(e.valor_total)
            order by e.numero_emenda, e.resumo
        ) as posicao_mesmo_valor
    from emendas e
    left join confirmadas c
        on e.portal_slug = c.portal_slug
        and e.ano = c.ano
        and e.empresa_id = c.empresa_id
        and e.numero_emenda is not distinct from c.numero_emenda
        and e.resumo is not distinct from c.resumo
    where c.portal_slug is null
),

classificadas as (
    select
        e.portal_slug,
        e.ano,
        e.empresa_id,
        e.numero_emenda,
        e.resumo,
        case
            when c.portal_slug is not null then 'confirmado_por_proposta'
            when f.linhas_disponiveis >= s.posicao_mesmo_valor then 'valor_igual'
            else 'nao_identificado'
        end as recebimento_fundo,
        coalesce(c.receita_codigo, case when f.linhas_disponiveis >= s.posicao_mesmo_valor then f.receita_codigo end) as receita_codigo,
        coalesce(c.receita_descricao, case when f.linhas_disponiveis >= s.posicao_mesmo_valor then f.receita_descricao end) as receita_descricao
    from emendas e
    left join confirmadas c
        on e.portal_slug = c.portal_slug
        and e.ano = c.ano
        and e.empresa_id = c.empresa_id
        and e.numero_emenda is not distinct from c.numero_emenda
        and e.resumo is not distinct from c.resumo
    left join emendas_sem_confirmacao s
        on e.portal_slug = s.portal_slug
        and e.ano = s.ano
        and e.empresa_id = s.empresa_id
        and e.numero_emenda is not distinct from s.numero_emenda
        and e.resumo is not distinct from s.resumo
    left join linhas_livres f
        on e.portal_slug = f.portal_slug
        and e.ano = f.ano
        and e.empresa_id = f.empresa_id
        and round(e.valor_total) = f.valor_arredondado
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
    case when k.recebimento_fundo = 'confirmado_por_proposta' then e.valor_total else 0 end::numeric(15, 2) as valor_recebido_fundo,
    k.recebimento_fundo,
    k.receita_codigo,
    k.receita_descricao
from emendas e
join classificadas k
    on e.portal_slug = k.portal_slug
    and e.ano = k.ano
    and e.empresa_id = k.empresa_id
    and e.numero_emenda is not distinct from k.numero_emenda
    and e.resumo is not distinct from k.resumo
