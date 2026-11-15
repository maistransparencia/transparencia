select
    portal_slug,
    key,
    value
from {{ source('raw_fiorilli', 'metadata') }}
