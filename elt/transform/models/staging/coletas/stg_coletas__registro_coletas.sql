with source as (
    select * from {{ source('raw_coletas', 'registro_coletas') }}
),

renamed as (
    select
        portal_slug,
        lower(trim(fonte)) as fonte,
        nullif(trim(coletado_em), '')::timestamptz as coletado_em,
        lower(trim(frequencia_esperada)) as frequencia_esperada,
        nullif(trim(total_linhas), '')::integer as total_linhas
    from source
)

select * from renamed
