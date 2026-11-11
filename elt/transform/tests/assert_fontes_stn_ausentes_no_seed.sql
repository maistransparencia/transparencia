{{ config(severity='warn') }}

with fontes_observadas as (
    select codigo_fonte_stn from {{ ref('seed_fontes_recursos_stn_referencia_portais') }}
    union
    select codigo_fonte_stn from {{ ref('fct_receitas') }} where codigo_fonte_stn ~ '^[0-9]{4}$'
)

select fontes_observadas.codigo_fonte_stn
from fontes_observadas
left join {{ ref('seed_fontes_recursos_stn') }} as fonte
    on fonte.codigo_fonte = fontes_observadas.codigo_fonte_stn
where fonte.codigo_fonte is null
