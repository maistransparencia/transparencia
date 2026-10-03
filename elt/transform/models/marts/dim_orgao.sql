-- Dimensão: entidades municipais (prefeitura + fundos) por portal
-- Fonte: seeds dos portais municipais habilitados

select
    {{ dbt_utils.generate_surrogate_key(['portal_slug', 'empresa_id']) }} as orgao_id,
    portal_slug,
    empresa_id::text as empresa_id,
    nome as orgao_nome,
    nullif(trim(cnpj), '') as cnpj
from {{ ref('seed_porciuncula_prefeitura_orgaos') }}

union all

select
    {{ dbt_utils.generate_surrogate_key(['portal_slug', 'empresa_id']) }} as orgao_id,
    portal_slug,
    empresa_id::text as empresa_id,
    nome as orgao_nome,
    nullif(trim(cnpj), '') as cnpj
from {{ ref('seed_natividade_prefeitura_orgaos') }}
