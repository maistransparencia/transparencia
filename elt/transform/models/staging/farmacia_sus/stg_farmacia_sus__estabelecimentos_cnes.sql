with source as (
    select * from {{ source('raw_farmacia_sus', 'estabelecimentos_cnes') }}
),

renamed as (
    select
        portal_slug,
        nullif(ltrim(trim(codigo_cnes), '0'), '') as codigo_cnes,
        nullif(trim(nome_estabelecimento), '') as nome_unidade,
        nullif(trim(endereco_estabelecimento), '') as endereco_unidade,
        nullif(trim(telefone_estabelecimento), '') as telefone_unidade,
        case
            when trim(latitude_estabelecimento) ~ '^-?[0-9]+(\.[0-9]+)?$' then trim(latitude_estabelecimento)::numeric(12, 8)
            else null
        end as latitude_unidade,
        case
            when trim(longitude_estabelecimento) ~ '^-?[0-9]+(\.[0-9]+)?$' then trim(longitude_estabelecimento)::numeric(12, 8)
            else null
        end as longitude_unidade
    from source
)

select * from renamed
