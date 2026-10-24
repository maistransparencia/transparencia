with source as (
    select * from {{ source('raw_farmacia_sus', 'estoque_medicamentos') }}
),

normalizada as (
    select
        *,
        case
            when left(trim(data_posicao_estoque), 10) ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
            then substr(trim(data_posicao_estoque), 7, 4) || '-' || substr(trim(data_posicao_estoque), 4, 2) || '-' || substr(trim(data_posicao_estoque), 1, 2)
            else left(trim(data_posicao_estoque), 10)
        end as data_posicao_iso
    from source
),

renamed as (
    select
        portal_slug,
        id_registro,
        nullif(ltrim(trim(codigo_cnes), '0'), '') as codigo_cnes,
        nullif(trim(nome_medicamento), '') as nome_medicamento,
        nullif(trim(numero_lote), '') as numero_lote,
        nullif(lower(trim(sigla_sistema_origem)), '') as sigla_sistema_origem,
        case
            when trim(quantidade_estoque) ~ '^-?[0-9]{1,3}(\.[0-9]{3})*,[0-9]+$'
            then replace(replace(trim(quantidade_estoque), '.', ''), ',', '.')::numeric(15, 3)
            when trim(quantidade_estoque) ~ '^-?[0-9]+(\.[0-9]+)?$'
            then trim(quantidade_estoque)::numeric(15, 3)
            else null
        end as quantidade_estoque,
        {{ data_iso_valida('data_posicao_iso') }} as data_posicao_estoque,
        {{ data_iso_valida('left(trim(data_validade), 10)') }} as data_validade,
        nullif(left(trim(data_coleta), 10), '')::date as data_coleta
    from normalizada
)

select * from renamed
