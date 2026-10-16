with source as (
    select * from {{ ref('seed_inep_ideb') }}
),

renamed as (
    select
        cod_ibge,
        ano,
        rede,
        etapa_ensino,
        nota_ideb,
        meta_ideb,
        saeb_matematica,
        saeb_lingua_portuguesa,
        taxa_aprovacao
    from source
)

select * from renamed
