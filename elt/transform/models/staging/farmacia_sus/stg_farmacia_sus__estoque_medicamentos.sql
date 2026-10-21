with source as (
    select * from {{ source('raw_farmacia_sus', 'estoque_medicamentos') }}
),

renamed as (
    select
        portal_slug,
        id_registro,
        nullif(ltrim(trim(codigo_cnes), '0'), '') as codigo_cnes,
        nullif(trim(nome_medicamento), '') as nome_medicamento,
        case
            when trim(quantidade_estoque) ~ '^-?[0-9]{1,3}(\.[0-9]{3})*,[0-9]+$'
            then replace(replace(trim(quantidade_estoque), '.', ''), ',', '.')::numeric(15, 3)
            when trim(quantidade_estoque) ~ '^-?[0-9]+(\.[0-9]+)?$'
            then trim(quantidade_estoque)::numeric(15, 3)
            else null
        end as quantidade_estoque,
        case
            when left(trim(data_posicao_estoque), 10) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
            then left(trim(data_posicao_estoque), 10)::date
            when left(trim(data_posicao_estoque), 10) ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
            then to_date(left(trim(data_posicao_estoque), 10), 'DD/MM/YYYY')
            else null
        end as data_posicao_estoque
    from source
)

select * from renamed
