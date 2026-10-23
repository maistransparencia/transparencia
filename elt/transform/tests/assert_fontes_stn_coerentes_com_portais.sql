{{ config(severity='error') }}

select
    referencia.codigo_fonte_stn,
    referencia.descricao_portal,
    referencia.palavra_chave,
    fonte.descricao as descricao_seed
from {{ ref('seed_fontes_recursos_stn_referencia_portais') }} as referencia
inner join {{ ref('seed_fontes_recursos_stn') }} as fonte
    on fonte.codigo_fonte = referencia.codigo_fonte_stn
where referencia.conferido_portaria
  and referencia.palavra_chave is not null
  and analytics.unaccent(lower(fonte.descricao)) not like '%' || analytics.unaccent(lower(referencia.palavra_chave)) || '%'
