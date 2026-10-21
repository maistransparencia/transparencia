select
    portal_slug,
    empresa,
    ano,
    codigo,
    descricao,
    fornecedor_cpf_cnpj,
    fornecedor_cidade_clean,
    fornecedor_cidade,
    empenhado,
    liquidado,
    pago
from {{ ref('int_despesas_fornecedor_consolidadas') }}
