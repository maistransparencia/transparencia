-- Staging: receita_orcamentaria
-- Casts text → numeric e padroniza nomes de colunas. Relação 1:1 com a fonte.
-- A deduplicação entre a linha total (sem fonte STN) e as linhas de detalhe por
-- fonte STN ocorre em int_receitas_consolidadas (camada intermediária).

with source as (
    select * from {{ source('natividade_prefeitura', 'receita_orcamentaria') }}
),

renamed as (
    select
        ano::int as ano,
        empresa as empresa_id,
        codigo,
        nullif(trim(coalesce(nome, especificacao)), '') as descricao,
        nullif(replace(replace(coalesce(previsao_atualizada, prev_atualizada), '.', ''), ',', '.'), '')::numeric(15, 2) as previsao_atualizada,
        nullif(replace(replace(coalesce(arrecadado_total, arrec_total), '.', ''), ',', '.'), '')::numeric(15, 2) as arrecadado_efetivo,
        nullif(trim(coalesce(fontestn, fonte_stn)), '') as fonte_stn
    from source
)

select
    ano,
    empresa_id,
    codigo,
    descricao,
    previsao_atualizada,
    arrecadado_efetivo,
    fonte_stn
from renamed
