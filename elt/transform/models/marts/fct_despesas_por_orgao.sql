select
    empresa,
    ano::int as ano,
    codigo,
    descricao,
    nullif(replace(empenhado, ',', '.'), '')::numeric(15, 2) as empenhado,
    nullif(replace(liquidado, ',', '.'), '')::numeric(15, 2) as liquidado,
    nullif(replace(pago, ',', '.'), '')::numeric(15, 2) as pago,
    nullif(replace(dotacao_atualizada, ',', '.'), '')::numeric(15, 2) as dotacao_atualizada
from {{ source('porciuncula_prefeitura', 'despesas_por_orgao') }}
