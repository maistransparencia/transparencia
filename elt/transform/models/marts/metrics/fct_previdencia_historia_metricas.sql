{{ config(materialized='table') }}

with portais as (
    select
        portal_slug,
        previdencia_sigla,
        previdencia_cnpj
    from {{ ref('dim_portais') }}
),

despesas_filtradas as (
    select
        d.portal_slug,
        d.ano,
        d.elemento,
        coalesce(d.empenhado_liquido, 0) as empenhado_liquido,
        coalesce(d.liquidado, 0) as liquidado,
        coalesce(d.pago, 0) as pago,
        (
            d.elemento = '13' and (
                (
                    p.previdencia_sigla is not null and (
                        d.fornecedor_nome ilike '%' || p.previdencia_sigla || '%'
                        or d.natureza_despesa ilike '%' || p.previdencia_sigla || '%'
                        or d.descricao ilike '%' || p.previdencia_sigla || '%'
                    )
                )
                or (
                    p.previdencia_cnpj is not null
                    and regexp_replace(coalesce(d.fornecedor_cpf_cnpj, ''), '[^0-9]', '', 'g') = p.previdencia_cnpj
                )
                or d.fornecedor_nome ilike '%RPPS%'
                or d.natureza_despesa ilike '%RPPS%'
                or d.descricao ilike '%RPPS%'
            )
        ) as is_patronal,
        (
            d.elemento not in ('13', '71', '97') and (
                d.fornecedor_nome ilike '%CASP%'
                or d.natureza_despesa ilike '%CASP%'
                or d.descricao ilike '%CASP%'
                or d.fornecedor_cpf_cnpj = '07.573.075/0001-00'
            )
        ) as is_casp
    from {{ ref('fct_despesas') }} d
    join portais p on d.portal_slug = p.portal_slug
    where
        d.fonte = 'exercicio'
        and (
            d.elemento in ('13', '71', '97')
            or d.orgao_codigo = '1061'
            or d.credor_id = '1061'
            or (
                p.previdencia_sigla is not null and (
                    d.fornecedor_nome ilike '%' || p.previdencia_sigla || '%'
                    or d.natureza_despesa ilike '%' || p.previdencia_sigla || '%'
                    or d.descricao ilike '%' || p.previdencia_sigla || '%'
                )
            )
            or (
                p.previdencia_cnpj is not null
                and regexp_replace(coalesce(d.fornecedor_cpf_cnpj, ''), '[^0-9]', '', 'g') = p.previdencia_cnpj
            )
            or d.fornecedor_nome ilike '%CASP%'
            or d.fornecedor_cpf_cnpj = '07.573.075/0001-00'
            or d.descricao ilike '%CASP%'
            or d.descricao ilike '%RPPS%'
            or d.natureza_despesa ilike '%RPPS%'
        )
        and (d.tipo_empenho is null or d.tipo_empenho != 'AN')
),

despesas_previdencia as (
    select
        portal_slug,
        ano,
        sum(case when elemento = '97' then empenhado_liquido else 0 end) as total_aporte_exigido,
        sum(case when elemento = '97' then pago else 0 end) as total_aporte_quitado,
        sum(case when is_patronal then empenhado_liquido else 0 end) as total_empenhado_patronal,
        sum(case when is_patronal then liquidado else 0 end) as total_liquidado_patronal,
        sum(case when is_patronal then pago else 0 end) as total_pago_patronal,
        sum(case when elemento = '71' then pago else 0 end) as total_amortizacao_divida,
        sum(case when is_casp then empenhado_liquido else 0 end) as total_casp_plano_saude,
        sum(empenhado_liquido) as total_empenhado,
        sum(liquidado) as total_liquidado,
        sum(pago) as total_pago
    from despesas_filtradas
    group by portal_slug, ano
),

pessoal_previdencia as (
    select
        portal_slug,
        ano,
        sum(case when categoria_regime in ('efetivo_concurso', 'efetivo_comissao') then 1 else 0 end) as servidores_efetivos,
        sum(case when categoria_regime in ('comissionado', 'contrato_temporario') then 1 else 0 end) as servidores_temporarios
    from {{ ref('fct_pessoal') }}
    group by portal_slug, ano
),

calculos as (
    select
        d.portal_slug,
        d.ano,
        d.total_aporte_exigido::numeric(15, 2) as total_aporte_exigido,
        d.total_aporte_quitado::numeric(15, 2) as total_aporte_quitado,
        case
            when d.total_aporte_exigido > 0
            then (d.total_aporte_quitado / d.total_aporte_exigido) * 100
            else 100
        end::numeric(15, 4) as taxa_adimplencia_aporte,
        d.total_empenhado_patronal::numeric(15, 2) as total_empenhado_patronal,
        d.total_liquidado_patronal::numeric(15, 2) as total_liquidado_patronal,
        d.total_pago_patronal::numeric(15, 2) as total_pago_patronal,
        greatest(0, d.total_liquidado_patronal - d.total_pago_patronal)::numeric(15, 2) as rombo_patronal_nao_repassado,
        d.total_amortizacao_divida::numeric(15, 2) as total_amortizacao_divida,
        d.total_casp_plano_saude::numeric(15, 2) as total_casp_plano_saude,
        d.total_empenhado::numeric(15, 2) as total_empenhado,
        d.total_liquidado::numeric(15, 2) as total_liquidado,
        d.total_pago::numeric(15, 2) as total_pago,
        coalesce(p.servidores_efetivos, 0)::integer as servidores_efetivos,
        coalesce(p.servidores_temporarios, 0)::integer as servidores_temporarios
    from despesas_previdencia d
    left join pessoal_previdencia p
        on d.portal_slug = p.portal_slug
        and d.ano = p.ano
)

select
    {{ dbt_utils.generate_surrogate_key(['portal_slug', 'ano']) }} as previdencia_historia_id,
    portal_slug,
    ano,
    total_aporte_exigido,
    total_aporte_quitado,
    taxa_adimplencia_aporte,
    total_empenhado_patronal,
    total_liquidado_patronal,
    total_pago_patronal,
    rombo_patronal_nao_repassado,
    total_amortizacao_divida,
    total_casp_plano_saude,
    total_empenhado,
    total_liquidado,
    total_pago,
    servidores_efetivos,
    servidores_temporarios
from calculos
