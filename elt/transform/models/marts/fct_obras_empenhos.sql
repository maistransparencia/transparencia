-- Fato: Empenhos federais individuais vinculados a obras públicas do ObrasGov.br
{{ config(
    materialized = 'view' if var('test_mode', false) else 'table'
) }}

select
    portal_slug,
    id_projeto,
    nr_empenho,
    ug_emitente,
    ano_empenho,
    valor_empenho,
    data_emissao,
    sistema_origem_empenho,
    natureza_despesa,
    fonte,
    programa_trabalho,
    plano_interno,
    acao_orcamentaria,
    descricao_empenho
from {{ ref('stg_obrasgov__empenhos') }}
