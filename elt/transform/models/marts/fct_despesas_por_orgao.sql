select
    portal_slug,
    empresa,
    ano,
    codigo,
    descricao,
    empenhado,
    liquidado,
    pago,
    dotacao_atualizada
from {{ ref('stg_fiorilli__despesas_por_orgao') }}
