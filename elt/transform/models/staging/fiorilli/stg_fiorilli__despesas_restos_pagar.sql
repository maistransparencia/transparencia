-- Staging: despesas_restos_pagar
-- Casts text → numeric e padroniza nomes de colunas.

with source as (
    select * from {{ source('raw_fiorilli', 'despesas_restos_pagar') }}
),

renamed as (
    select
        portal_slug,
        ano::int as ano,
        empresa as empresa_id,
        numero as rap_id,
        codigo::text as fornecedor_codigo,
        descricao,
        nullif(replace(empenhado, ',', '.'), '')::numeric(15, 2) as empenhado,
        nullif(replace(liquidado, ',', '.'), '')::numeric(15, 2) as liquidado,
        nullif(replace(pago, ',', '.'), '')::numeric(15, 2) as pago
    from source
)

select
    portal_slug,
    ano,
    empresa_id,
    rap_id,
    fornecedor_codigo,
    descricao,
    empenhado,
    liquidado,
    pago
from renamed
