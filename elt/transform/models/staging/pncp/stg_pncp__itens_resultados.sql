-- Staging: resultados homologados de itens do PNCP
-- Casts text → numeric/integer/date e padroniza fornecedores e valores homologados.

with source as (
    select * from {{ source('raw_pncp', 'itens_resultados') }}
),

renamed as (
    select
        nullif(trim(numero_controle_pncp::text), '') as numero_controle_pncp,
        nullif(trim(cnpj_orgao::text), '') as cnpj_orgao,
        nullif(trim(ano_compra::text), '')::integer as ano_compra,
        nullif(trim(sequencial_compra::text), '')::integer as sequencial_compra,
        nullif(trim(numero_item::text), '')::integer as numero_item,
        nullif(trim(sequencial_resultado::text), '')::integer as sequencial_resultado,
        nullif(trim(fornecedor_cnpj_cpf::text), '') as fornecedor_cnpj_cpf,
        nullif(trim(fornecedor_nome::text), '') as fornecedor_nome,
        case
            when trim(valor_unitario_homologado::text) ~ '^[0-9]+(\.[0-9]+)?$' then trim(valor_unitario_homologado::text)::numeric(15, 4)
            when replace(replace(trim(valor_unitario_homologado::text), '.', ''), ',', '.') ~ '^[0-9]+(\.[0-9]+)?$' then replace(replace(trim(valor_unitario_homologado::text), '.', ''), ',', '.')::numeric(15, 4)
            else null
        end as valor_unitario_homologado,
        case
            when trim(valor_total_homologado::text) ~ '^[0-9]+(\.[0-9]+)?$' then trim(valor_total_homologado::text)::numeric(15, 2)
            when replace(replace(trim(valor_total_homologado::text), '.', ''), ',', '.') ~ '^[0-9]+(\.[0-9]+)?$' then replace(replace(trim(valor_total_homologado::text), '.', ''), ',', '.')::numeric(15, 2)
            else null
        end as valor_total_homologado,
        case
            when trim(percentual_desconto::text) ~ '^[0-9]+(\.[0-9]+)?$' then trim(percentual_desconto::text)::numeric(5, 2)
            when replace(replace(trim(percentual_desconto::text), '.', ''), ',', '.') ~ '^[0-9]+(\.[0-9]+)?$' then replace(replace(trim(percentual_desconto::text), '.', ''), ',', '.')::numeric(5, 2)
            else null
        end as percentual_desconto,
        nullif(trim(situacao_resultado::text), '') as situacao_resultado,
        case
            when nullif(trim(data_resultado::text), '') is null then null
            when trim(data_resultado::text) ~ '^\d{4}-\d{2}-\d{2}' then left(trim(data_resultado::text), 10)::date
            when trim(data_resultado::text) ~ '^(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/\d{4}' then to_date(left(trim(data_resultado::text), 10), 'DD/MM/YYYY')
            else null
        end as data_resultado
    from source
)

select
    numero_controle_pncp,
    cnpj_orgao,
    ano_compra,
    sequencial_compra,
    numero_item,
    sequencial_resultado,
    fornecedor_cnpj_cpf,
    fornecedor_nome,
    valor_unitario_homologado,
    valor_total_homologado,
    percentual_desconto,
    situacao_resultado,
    data_resultado
from renamed
