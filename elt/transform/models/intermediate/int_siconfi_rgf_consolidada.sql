select * from {{ ref('stg_porciuncula_prefeitura__siconfi_rgf') }}
union all
select * from {{ ref('stg_natividade_prefeitura__siconfi_rgf') }}
