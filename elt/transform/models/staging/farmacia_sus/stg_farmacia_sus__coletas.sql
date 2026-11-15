with source as (
    select * from {{ source('raw_farmacia_sus', 'coletas') }}
),

renamed as (
    select
        portal_slug,
        codigo_ibge6,
        lower(trim(status_coleta)) as status_coleta,
        coalesce(nullif(trim(total_registros_estoque), '')::integer, 0) as total_registros_estoque,
        coalesce(nullif(trim(total_registros_cnes), '')::integer, 0) as total_registros_cnes,
        nullif(trim(mensagem_erro), '') as mensagem_erro,
        nullif(trim(data_coleta), '')::timestamptz as data_hora_coleta,
        left(nullif(trim(data_coleta), ''), 10)::date as data_coleta
    from source
)

select * from renamed
