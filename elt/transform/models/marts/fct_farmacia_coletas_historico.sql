-- Fato: historico de coletas da Farmacia SUS por portal (uma linha por execucao do extrator).
-- Inclui coletas com falha, que nunca significam apagao; servem para auditar a regularidade da fonte.
{{ config(
    materialized = 'view' if var('test_mode', false) else 'table'
) }}

select
    {{ dbt_utils.generate_surrogate_key(['portal_slug', 'data_hora_coleta']) }} as id_registro,
    portal_slug,
    codigo_ibge6,
    status_coleta,
    data_coleta,
    data_hora_coleta,
    total_registros_estoque,
    total_registros_cnes,
    mensagem_erro
from {{ ref('stg_farmacia_sus__coletas') }}
