with source as (
    select * from {{ source('raw_saude_rede', 'sih_competencia') }}
),

renamed as (
    select
        portal_slug,
        competencia::integer as competencia,
        left(competencia, 4)::integer as ano,
        nullif(trim(total_internacoes), '')::integer as total_internacoes,
        left(nullif(trim(data_coleta), ''), 10)::date as data_coleta
    from source
)

select * from renamed
