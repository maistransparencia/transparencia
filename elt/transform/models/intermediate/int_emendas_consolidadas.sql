-- Intermediário: consolida emendas de todos os portais Fiorilli.

select
    portal_slug,
    ano,
    empresa_id,
    numero_emenda,
    resumo,
    objeto_emenda,
    valor_total,
    empenhado,
    autor,
    tipo_emenda,
    esfera_origem,
    ato_normativo,
    destinacao
from {{ ref('stg_fiorilli__emendas_cad') }}
