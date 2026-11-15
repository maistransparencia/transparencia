-- Intermediário: consolida contratos de todos os portais Fiorilli.

select
    portal_slug,
    ano,
    empresa_id,
    contrato_numero,
    fornecedor_nome,
    fornecedor_cpf_cnpj,
    objeto,
    objeto_completo,
    valor_contrato,
    valor_aditado,
    licitacao_numero,
    modalidade,
    mes,
    tipo_obra,
    numero_obra,
    fundlegal,
    empenhado,
    data_inicio,
    vencimento_atual,
    saldo_a_empenhar
from {{ ref('stg_fiorilli__contratos') }}
