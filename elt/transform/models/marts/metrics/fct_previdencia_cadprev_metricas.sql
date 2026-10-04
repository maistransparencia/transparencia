{{ config(
    materialized='table'
) }}

with portais as (
    select
        portal_slug,
        previdencia_sigla,
        previdencia_cnpj
    from {{ ref('dim_portais') }}
),

cadprev_despesas as (
    select
        d.portal_slug,
        d.ano,
        d.empenho_id,
        d.descricao,
        d.data_empenho,
        coalesce(d.empenhado_liquido, 0) as empenhado,
        coalesce(d.pago, 0) as pago
    from {{ ref('fct_despesas') }} d
    join portais p on d.portal_slug = p.portal_slug
    where
        d.elemento = '71'
        and (
            (nullif(trim(p.previdencia_sigla), '') is not null and lower(unaccent(d.fornecedor_nome)) ilike '%' || lower(unaccent(p.previdencia_sigla)) || '%')
            or (nullif(trim(p.previdencia_cnpj), '') is not null and regexp_replace(coalesce(d.fornecedor_cpf_cnpj, ''), '[^0-9]', '', 'g') = p.previdencia_cnpj)
            or lower(unaccent(d.fornecedor_nome)) ilike '%rpps%'
            or lower(unaccent(d.descricao)) ilike '%cadprev%'
        )
        and (d.tipo_empenho is null or d.tipo_empenho != 'AN')
),

agregado as (
    select
        portal_slug,
        ano,
        empenho_id,
        max(descricao) as descricao,
        max(data_empenho) as data_empenho,
        sum(empenhado) as empenhado,
        sum(pago) as pago
    from cadprev_despesas
    group by portal_slug, ano, empenho_id
)

select
    {{ dbt_utils.generate_surrogate_key(['portal_slug', 'ano', 'empenho_id']) }} as previdencia_cadprev_id,
    portal_slug,
    ano,
    empenho_id,
    descricao,
    data_empenho,
    empenhado::numeric(15, 2) as empenhado,
    pago::numeric(15, 2) as pago
from agregado
