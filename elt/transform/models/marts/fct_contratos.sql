-- Fato: contratos consolidados de todos os portais

with contratos as (
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
    from {{ ref('int_contratos_consolidados') }}
)

select
    {{ dbt_utils.generate_surrogate_key(['portal_slug', 'ano', 'empresa_id', 'contrato_numero']) }} as contrato_id,
    portal_slug,
    ano,
    empresa_id,
    contrato_numero,
    fornecedor_nome,
    fornecedor_cpf_cnpj,
    objeto,
    objeto_completo,
    valor_contrato::numeric(15, 2) as valor_contrato,
    valor_aditado::numeric(15, 2) as valor_aditado,
    licitacao_numero,
    modalidade,
    mes,
    tipo_obra,
    numero_obra,
    fundlegal,
    empenhado::numeric(15, 2) as empenhado,
    data_inicio,
    vencimento_atual,
    saldo_a_empenhar::numeric(15, 2) as saldo_a_empenhar
from contratos
