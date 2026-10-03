with porciuncula as (
    select * from {{ ref('stg_porciuncula_prefeitura__siconfi_msc_patrimonial') }}
),

natividade as (
    select * from {{ ref('stg_natividade_prefeitura__siconfi_msc_patrimonial') }}
)

select * from porciuncula
union all
select * from natividade
