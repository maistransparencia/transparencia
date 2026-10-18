with source as (
    select * from {{ ref('seed_inep_ideb_estados') }}
),

renamed as (
    select
        cod_uf,
        sigla_uf,
        ano,
        rede,
        etapa_ensino,
        nota_ideb
    from source
)

select * from renamed
