-- Fato: diarias consolidadas de todos os portais

with diarias as (
    select
        portal_slug,
        ano,
        empresa_id,
        diaria_id,
        valor,
        favorecido,
        cargo,
        data,
        unidade,
        descricao
    from {{ ref('stg_fiorilli__diarias') }}
)

select
    {{ dbt_utils.generate_surrogate_key(['portal_slug', 'ano', 'empresa_id', 'diaria_id']) }} as id,
    portal_slug,
    ano,
    empresa_id,
    diaria_id,
    valor::numeric(15, 2) as valor,
    favorecido,
    cargo,
    data,
    unidade,
    descricao
from diarias
