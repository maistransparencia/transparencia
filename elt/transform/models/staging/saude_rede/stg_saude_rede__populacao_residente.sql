with source as (
    select * from {{ source('raw_saude_rede', 'populacao_residente') }}
),

renamed as (
    select
        portal_slug,
        ano::integer as ano,
        nullif(trim(total_populacao), '')::integer as total_populacao,
        left(nullif(trim(data_coleta), ''), 10)::date as data_coleta
    from source
)

select * from renamed
