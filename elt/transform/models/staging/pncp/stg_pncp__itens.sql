-- Staging: itens de compras do PNCP
-- Casts text → numeric/integer e padroniza quantidades e valores.

with source as (
    select * from {{ source('raw_pncp', 'itens') }}
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
    numero_controle_pncp,
    cnpj_orgao,
    ano_compra,
    sequencial_compra,
    numero_compra,
    numero_item,
    descricao,
    material_ou_servico,
    quantidade,
    unidade_medida,
    valor_unitario_estimado,
    valor_total_estimado,
    situacao_item,
    criterio_julgamento
from renamed
