with porciuncula as (
    select
        'porciuncula_prefeitura' as portal_slug,
        empresa,
        ano,
        codigo,
        descricao,
        empenhado,
        liquidado,
        pago,
        dotacao_atualizada
    from {{ ref('stg_porciuncula_prefeitura__despesas_por_orgao') }}
),

natividade as (
    select
        'natividade_prefeitura' as portal_slug,
        empresa,
        ano,
        codigo,
        descricao,
        empenhado,
        liquidado,
        pago,
        dotacao_atualizada
    from {{ ref('stg_natividade_prefeitura__despesas_por_orgao') }}
)

select * from porciuncula
union all
select * from natividade
