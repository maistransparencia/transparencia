{{ config(severity='error') }}

-- O cruzamento das emendas estaduais descarta o município que casa com mais de um portal da mesma UF; sem este
-- teste a emenda sumiria de todos os portais sem aviso.
select
    uf,
    {{ target.schema }}.unaccent(upper(trim(cidade_clean))) as municipio_normalizado,
    count(*) as portais
from {{ ref('dim_portais') }}
group by 1, 2
having count(*) > 1
