select
    portal_slug,
    key,
    value
from {{ source('porciuncula_prefeitura', 'metadata') }}

union all

select
    portal_slug,
    key,
    value
from {{ source('natividade_prefeitura', 'metadata') }}

