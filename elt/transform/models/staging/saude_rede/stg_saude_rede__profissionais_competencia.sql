with source as (
    select * from {{ source('raw_saude_rede', 'profissionais_competencia') }}
),

renamed as (
    select
        portal_slug,
        competencia::integer as competencia,
        left(competencia, 4)::integer as ano,
        nullif(trim(total_vinculos), '')::integer as total_vinculos,
        nullif(trim(total_profissionais), '')::integer as total_profissionais,
        nullif(trim(total_profissionais_sus), '')::integer as total_profissionais_sus,
        left(nullif(trim(data_coleta), ''), 10)::date as data_coleta
    from source
)

select * from renamed
