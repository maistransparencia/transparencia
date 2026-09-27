{{ config(
    materialized='table'
) }}

with despesas_por_licitacao as (
    select
        portal_slug,
        empresa_id,
        split_part(licitacao_numero, '/', 1) as licitacao_clean,
        regexp_replace(fornecedor_cpf_cnpj, '[^\d]', '', 'g') as cnpj_clean,
        sum(empenhado_liquido) as total_empenhado,
        sum(liquidado) as total_liquidado,
        sum(pago) as total_pago,
        (array_agg(fonte_recurso_desc order by empenhado_liquido desc) filter (where fonte_recurso_desc is not null and trim(fonte_recurso_desc) != ''))[1] as fonte_principal,
        string_agg(distinct fonte_recurso_desc, '; ') filter (where fonte_recurso_desc is not null and trim(fonte_recurso_desc) != '') as fontes_recursos,
        (array_agg(funcao_nome order by empenhado_liquido desc) filter (where funcao_nome is not null))[1] as principal_funcao,
        (array_agg(programa_nome order by empenhado_liquido desc) filter (where programa_nome is not null))[1] as principal_programa,
        (array_agg(projeto_atividade_nome order by empenhado_liquido desc) filter (where projeto_atividade_nome is not null))[1] as principal_acao
    from {{ ref('fct_despesas') }}
    where licitacao_numero is not null
    group by
        portal_slug,
        empresa_id,
        split_part(licitacao_numero, '/', 1),
        regexp_replace(fornecedor_cpf_cnpj, '[^\d]', '', 'g')
),

despesas_por_fornecedor as (
    select
        portal_slug,
        empresa_id,
        ano,
        regexp_replace(fornecedor_cpf_cnpj, '[^\d]', '', 'g') as cnpj_clean,
        sum(empenhado_liquido) as total_empenhado,
        sum(liquidado) as total_liquidado,
        sum(pago) as total_pago,
        (array_agg(fonte_recurso_desc order by empenhado_liquido desc) filter (where fonte_recurso_desc is not null and trim(fonte_recurso_desc) != ''))[1] as fonte_principal,
        string_agg(distinct fonte_recurso_desc, '; ') filter (where fonte_recurso_desc is not null and trim(fonte_recurso_desc) != '') as fontes_recursos,
        (array_agg(funcao_nome order by empenhado_liquido desc) filter (where funcao_nome is not null))[1] as principal_funcao,
        (array_agg(programa_nome order by empenhado_liquido desc) filter (where programa_nome is not null))[1] as principal_programa,
        (array_agg(projeto_atividade_nome order by empenhado_liquido desc) filter (where projeto_atividade_nome is not null))[1] as principal_acao
    from {{ ref('fct_despesas') }}
    where licitacao_numero is null
    group by
        portal_slug,
        empresa_id,
        ano,
        regexp_replace(fornecedor_cpf_cnpj, '[^\d]', '', 'g')
),

contratos as (
    select
        c.contrato_id,
        c.portal_slug,
        c.ano,
        c.empresa_id,
        o.orgao_id,
        o.orgao_nome,
        c.contrato_numero,
        c.licitacao_numero,
        split_part(c.licitacao_numero, '/', 1) as licitacao_clean,
        c.fornecedor_nome,
        c.fornecedor_cpf_cnpj,
        regexp_replace(c.fornecedor_cpf_cnpj, '[^\d]', '', 'g') as cnpj_clean,
        coalesce(c.valor_contrato, 0) as valor_contrato,
        coalesce(c.valor_aditado, 0) as valor_aditado,
        coalesce(c.empenhado, 0) as empenhado_informado
    from {{ ref('fct_contratos') }} c
    left join {{ ref('dim_orgao') }} o
        on c.portal_slug = o.portal_slug
        and c.empresa_id = o.empresa_id
)

select
    {{ dbt_utils.generate_surrogate_key(['c.portal_slug', 'c.ano', 'c.empresa_id', 'c.contrato_id']) }} as contrato_recurso_id,
    c.contrato_id,
    c.portal_slug,
    c.ano,
    c.empresa_id,
    c.orgao_id,
    coalesce(c.orgao_nome, 'Órgão não identificado') as orgao_nome,
    c.contrato_numero,
    c.licitacao_numero,
    c.fornecedor_nome,
    c.fornecedor_cpf_cnpj,
    c.valor_contrato::numeric(15, 2) as valor_contrato,
    c.valor_aditado::numeric(15, 2) as valor_aditado,
    coalesce(dl.total_empenhado, df.total_empenhado, c.empenhado_informado, 0)::numeric(15, 2) as total_empenhado,
    coalesce(dl.total_liquidado, df.total_liquidado, 0)::numeric(15, 2) as total_liquidado,
    coalesce(dl.total_pago, df.total_pago, 0)::numeric(15, 2) as total_pago,
    greatest(0, coalesce(dl.total_empenhado, df.total_empenhado, c.empenhado_informado, 0) - coalesce(dl.total_pago, df.total_pago, 0))::numeric(15, 2) as saldo_a_pagar,
    coalesce(dl.fonte_principal, df.fonte_principal, 'Recursos Próprios / Ordinários') as fonte_principal,
    coalesce(dl.fontes_recursos, df.fontes_recursos, 'Recursos Próprios / Ordinários') as fontes_recursos,
    coalesce(dl.principal_funcao, df.principal_funcao, 'Administração Geral') as principal_funcao,
    coalesce(dl.principal_programa, df.principal_programa) as principal_programa,
    coalesce(dl.principal_acao, df.principal_acao) as principal_acao
from contratos c
left join despesas_por_licitacao dl
    on c.portal_slug = dl.portal_slug
    and c.empresa_id = dl.empresa_id
    and c.licitacao_clean = dl.licitacao_clean
    and c.cnpj_clean = dl.cnpj_clean
left join despesas_por_fornecedor df
    on c.licitacao_numero is null
    and c.portal_slug = df.portal_slug
    and c.empresa_id = df.empresa_id
    and c.ano = df.ano
    and c.cnpj_clean = df.cnpj_clean
