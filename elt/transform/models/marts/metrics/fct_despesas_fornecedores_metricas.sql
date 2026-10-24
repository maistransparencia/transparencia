{{ config(materialized='table') }}

with cidades_por_fornecedor as (
    select
        portal_slug,
        ano,
        regexp_replace(fornecedor_cpf_cnpj, '[^0-9]', '', 'g') as documento_fornecedor,
        max(fornecedor_cidade_clean) as fornecedor_cidade_clean
    from {{ ref('fct_despesas_por_fornecedor') }}
    where nullif(regexp_replace(coalesce(fornecedor_cpf_cnpj, ''), '[^0-9]', '', 'g'), '') is not null
    group by portal_slug, ano, regexp_replace(fornecedor_cpf_cnpj, '[^0-9]', '', 'g')
),

despesas_fonte as (
    select
        f.portal_slug,
        f.empresa_id,
        f.ano,
        coalesce(f.fornecedor_cpf_cnpj, '00') as fornecedor_codigo,
        coalesce(fo.fornecedor_nome, 'OUTROS') as fornecedor_nome,
        coalesce(c.fornecedor_cidade_clean, p.cidade_clean) as fornecedor_cidade_clean,
        f.empenhado_liquido,
        f.pago
    from {{ ref('fct_despesas') }} f
    left join {{ ref('dim_fornecedor') }} fo
        on fo.portal_slug = f.portal_slug
        and fo.credor_id = f.credor_id
    left join cidades_por_fornecedor c
        on c.portal_slug = f.portal_slug
        and c.ano = f.ano
        and c.documento_fornecedor = regexp_replace(coalesce(f.fornecedor_cpf_cnpj, ''), '[^0-9]', '', 'g')
    left join {{ ref('dim_portais') }} p
        on p.portal_slug = f.portal_slug
    where f.fonte = 'exercicio'
      and f.elemento in ('30', '36', '39', '52')
),

fornecedores_agregados as (
    select
        portal_slug,
        empresa_id,
        ano,
        fornecedor_codigo,
        fornecedor_nome,
        fornecedor_cidade_clean,
        sum(coalesce(empenhado_liquido, 0)) as total_empenhado,
        sum(coalesce(pago, 0)) as total_pago
    from despesas_fonte
    group by
        portal_slug,
        empresa_id,
        ano,
        fornecedor_codigo,
        fornecedor_nome,
        fornecedor_cidade_clean
)

select
    {{ dbt_utils.generate_surrogate_key(['portal_slug', 'empresa_id', 'ano', 'fornecedor_codigo', 'fornecedor_nome', 'fornecedor_cidade_clean']) }} as fornecedores_metricas_id,
    portal_slug,
    empresa_id,
    ano,
    fornecedor_codigo,
    fornecedor_nome,
    fornecedor_cidade_clean,
    total_empenhado::numeric(15, 2) as total_empenhado,
    total_pago::numeric(15, 2) as total_pago
from fornecedores_agregados
