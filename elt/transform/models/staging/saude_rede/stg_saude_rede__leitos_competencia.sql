with source as (
    select * from {{ source('raw_saude_rede', 'leitos_competencia') }}
),

renamed as (
    select
        portal_slug,
        competencia::integer as competencia,
        left(competencia, 4)::integer as ano,
        trim(both '_' from regexp_replace(
            {{ target.schema }}.unaccent(lower(regexp_replace(trim(tipo_leito), '^\d+\s*-\s*', ''))),
            '[^a-z0-9]+', '_', 'g'
        )) as tipo_leito,
        coalesce(nullif(trim(total_leitos_existentes), '')::integer, 0) as total_leitos_existentes,
        coalesce(nullif(trim(total_leitos_sus), '')::integer, 0) as total_leitos_sus,
        left(nullif(trim(data_coleta), ''), 10)::date as data_coleta
    from source
)

select * from renamed
