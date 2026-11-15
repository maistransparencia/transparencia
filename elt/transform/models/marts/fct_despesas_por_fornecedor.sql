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
from {{ ref('stg_fiorilli__despesas_por_fornecedor') }}
