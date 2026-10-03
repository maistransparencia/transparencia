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
from {{ ref('int_despesas_unidade_consolidadas') }}
