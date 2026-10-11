with source as (
    select * from {{ source('raw_obrasgov', 'geometrias') }}
),

cleaned as (
    select
        portal_slug,
        id_projeto_investimento as id_projeto,
        id_geometria,
        trim(both '()' from trim(latitude)) as raw_lat,
        trim(both '()' from trim(longitude)) as raw_lon
    from source
),

renamed as (
    select
        portal_slug,
        id_projeto,
        id_geometria,
        case
            when raw_lat ~ '^-?[0-9]+(\.[0-9]+)?$' then raw_lat::numeric(12, 8)
            else null
        end as latitude,
        case
            when raw_lon ~ '^-?[0-9]+(\.[0-9]+)?$' then raw_lon::numeric(12, 8)
            else null
        end as longitude
    from cleaned
)

select * from renamed
