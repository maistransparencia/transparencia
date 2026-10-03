-- Staging: itens de compras do PNCP
-- Casts text → numeric/integer e padroniza quantidades e valores.

with source as (
    select * from {{ source('raw_pncp', 'itens') }}
),

orgaos as (
    select
        portal_slug,
        empresa_id::text as empresa_id,
        regexp_replace(cnpj, '[^0-9]', '', 'g') as cnpj_clean
    from {{ ref('seed_porciuncula_prefeitura_orgaos') }}
    union all
    select
        portal_slug,
        empresa_id::text as empresa_id,
        regexp_replace(cnpj, '[^0-9]', '', 'g') as cnpj_clean
    from {{ ref('seed_natividade_prefeitura_orgaos') }}
),

orgaos_dedup as (
    select distinct on (cnpj_clean)
        portal_slug,
        empresa_id,
        cnpj_clean
    from orgaos
),

renamed as (
    select
        nullif(trim(numero_controle_pncp::text), '') as numero_controle_pncp,
        nullif(trim(cnpj_orgao::text), '') as cnpj_orgao,
        nullif(trim(ano_compra::text), '')::integer as ano_compra,
        nullif(trim(sequencial_compra::text), '')::integer as sequencial_compra,
        nullif(trim(numero_compra::text), '') as numero_compra,
        nullif(trim(numero_item::text), '')::integer as numero_item,
        nullif(trim(descricao::text), '') as descricao,
        nullif(trim(material_ou_servico::text), '') as material_ou_servico,
        case
            when trim(quantidade::text) ~ '^[0-9]+(\.[0-9]+)?$' then trim(quantidade::text)::numeric(15, 4)
            when replace(replace(trim(quantidade::text), '.', ''), ',', '.') ~ '^[0-9]+(\.[0-9]+)?$' then replace(replace(trim(quantidade::text), '.', ''), ',', '.')::numeric(15, 4)
            else null
        end as quantidade,
        nullif(trim(unidade_medida::text), '') as unidade_medida,
        case
            when trim(valor_unitario_estimado::text) ~ '^[0-9]+(\.[0-9]+)?$' then trim(valor_unitario_estimado::text)::numeric(15, 4)
            when replace(replace(trim(valor_unitario_estimado::text), '.', ''), ',', '.') ~ '^[0-9]+(\.[0-9]+)?$' then replace(replace(trim(valor_unitario_estimado::text), '.', ''), ',', '.')::numeric(15, 4)
            else null
        end as valor_unitario_estimado,
        case
            when trim(valor_total_estimado::text) ~ '^[0-9]+(\.[0-9]+)?$' then trim(valor_total_estimado::text)::numeric(15, 2)
            when replace(replace(trim(valor_total_estimado::text), '.', ''), ',', '.') ~ '^[0-9]+(\.[0-9]+)?$' then replace(replace(trim(valor_total_estimado::text), '.', ''), ',', '.')::numeric(15, 2)
            else null
        end as valor_total_estimado,
        nullif(trim(situacao_item::text), '') as situacao_item,
        nullif(trim(criterio_julgamento::text), '') as criterio_julgamento
    from source
)

select
    r.numero_controle_pncp,
    r.cnpj_orgao,
    coalesce(o.portal_slug, case
        when regexp_replace(coalesce(r.cnpj_orgao, ''), '[^0-9]', '', 'g') = '28920304000196' then 'natividade_prefeitura'
        else 'porciuncula_prefeitura'
    end) as portal_slug,
    coalesce(o.empresa_id, case
        when regexp_replace(coalesce(r.cnpj_orgao, ''), '[^0-9]', '', 'g') = '28920304000196' then '6'
        else '7'
    end) as empresa_id,
    r.ano_compra,
    r.sequencial_compra,
    r.numero_compra,
    r.numero_item,
    r.descricao,
    r.material_ou_servico,
    r.quantidade,
    r.unidade_medida,
    r.valor_unitario_estimado,
    r.valor_total_estimado,
    r.situacao_item,
    r.criterio_julgamento
from renamed r
left join orgaos_dedup o
    on o.cnpj_clean = regexp_replace(coalesce(r.cnpj_orgao, ''), '[^0-9]', '', 'g')
