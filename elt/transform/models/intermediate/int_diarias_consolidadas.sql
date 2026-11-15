-- Intermediário: consolida diarias de todos os portais Fiorilli.

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
