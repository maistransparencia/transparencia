-- Fato: lacunas e divergencias conhecidas do portal (seed_lacunas_conhecidas), repetidas por portal.
-- texto_cidadao nasce no catalogo; {ano_inicial_historico} vira o ano inicial configurado, sem ano fixo no texto.
-- vigencia_fim nulo = lacuna ainda vigente.
{{ config(
    materialized = 'view' if var('test_mode', false) else 'table'
) }}

select
    {{ dbt_utils.generate_surrogate_key(['p.portal_slug', 'l.codigo']) }} as id_registro,
    p.portal_slug,
    l.codigo,
    l.fonte,
    l.tipo,
    replace(l.texto_cidadao, '{ano_inicial_historico}', '{{ var("ano_inicial_historico", 2021) }}') as texto_cidadao,
    l.vigencia_inicio::date as vigencia_inicio,
    nullif(l.vigencia_fim::text, '')::date as vigencia_fim
from {{ ref('dim_portais') }} p
cross join {{ ref('seed_lacunas_conhecidas') }} l
