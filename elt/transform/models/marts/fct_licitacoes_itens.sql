-- Fato: itens licitados unificando dados de itens e resultados homologados do PNCP

with itens as (
    select * from {{ ref('stg_pncp__itens') }}
),

compras as (
    select * from {{ ref('stg_pncp__compras') }}
),

licitacoes_municipais as (
    select
        portal_slug,
        ano,
        ano_compra,
        sequencial_compra,
        licitacao_numero
    from {{ ref('seed_pncp_licitacoes_mapeamento') }}
),

resultados as (
    select
        numero_controle_pncp,
        numero_item,
        fornecedor_cnpj_cpf,
        fornecedor_nome,
        valor_unitario_homologado,
        valor_total_homologado,
        percentual_desconto,
        situacao_resultado
    from (
        select
            numero_controle_pncp,
            numero_item,
            fornecedor_cnpj_cpf,
            fornecedor_nome,
            valor_unitario_homologado,
            valor_total_homologado,
            percentual_desconto,
            situacao_resultado,
            row_number() over (
                partition by numero_controle_pncp, numero_item
                order by sequencial_resultado asc
            ) as rn
        from {{ ref('stg_pncp__itens_resultados') }}
    ) sub
    where rn = 1
)

select
    {{ dbt_utils.generate_surrogate_key([
        "'porciuncula_prefeitura'",
        "coalesce(i.ano_compra, c.ano_compra)",
        "coalesce(l.licitacao_numero, i.numero_compra, c.numero_compra, c.processo, lpad(coalesce(i.sequencial_compra, c.sequencial_compra)::text, 3, '0') || '/' || coalesce(i.ano_compra, c.ano_compra)::text, '')",
        "i.numero_item"
    ]) }} as item_id,
    'porciuncula_prefeitura' as portal_slug,
    coalesce(i.ano_compra, c.ano_compra)::integer as ano,
    coalesce(l.licitacao_numero, i.numero_compra, c.numero_compra, c.processo, lpad(coalesce(i.sequencial_compra, c.sequencial_compra)::text, 3, '0') || '/' || coalesce(i.ano_compra, c.ano_compra)::text) as licitacao_numero,
    i.numero_item::integer as numero_item,
    i.descricao,
    i.quantidade::numeric(15, 4) as quantidade,
    i.unidade_medida,
    i.valor_unitario_estimado::numeric(15, 4) as valor_unitario_estimado,
    coalesce(i.valor_total_estimado, (i.quantidade * i.valor_unitario_estimado), i.valor_unitario_estimado)::numeric(15, 2) as valor_total_estimado,
    r.valor_unitario_homologado::numeric(15, 4) as valor_unitario_homologado,
    coalesce(r.valor_total_homologado, (i.quantidade * r.valor_unitario_homologado), r.valor_unitario_homologado)::numeric(15, 2) as valor_total_homologado,
    case
        when i.valor_unitario_estimado > 0 and r.valor_unitario_homologado is not null
        then round(((i.valor_unitario_estimado - r.valor_unitario_homologado) / i.valor_unitario_estimado * 100.0)::numeric, 2)
        else r.percentual_desconto::numeric(5, 2)
    end as percentual_desconto,
    r.fornecedor_nome,
    r.fornecedor_cnpj_cpf as fornecedor_cpf_cnpj,
    lower(replace(trim(coalesce(r.situacao_resultado, i.situacao_item)), ' ', '_')) as situacao_item
from itens i
left join compras c
    on c.numero_controle_pncp = i.numero_controle_pncp
left join licitacoes_municipais l
    on l.ano = coalesce(i.ano_compra, c.ano_compra)
   and l.sequencial_compra = coalesce(i.sequencial_compra, c.sequencial_compra)
left join resultados r
    on r.numero_controle_pncp = i.numero_controle_pncp
   and r.numero_item = i.numero_item
