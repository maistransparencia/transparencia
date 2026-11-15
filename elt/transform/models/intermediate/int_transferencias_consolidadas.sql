-- Intermediário: consolida transferencias de todos os portais Fiorilli.

select
    portal_slug,
    ano,
    empresa_id,
    mes,
    entidade_pagadora,
    entidade_recebedora,
    repasse,
    devolucao
from {{ ref('stg_fiorilli__transferencias') }}
