-- Fato: historico diario do estoque de medicamentos da Farmacia SUS (BNAFAR/Horus).
-- Grao: portal, unidade (CNES), medicamento, lote e data da posicao do estoque.
-- Incremental: reprocessa apenas as linhas carregadas desde a ultima coleta de cada portal.
{{ config(
    materialized = 'table' if var('test_mode', false) else 'incremental',
    unique_key = 'id_registro',
    incremental_strategy = 'delete+insert',
    on_schema_change = 'fail'
) }}

with normalizado as (
    select
        portal_slug,
        coalesce(codigo_cnes, '') as codigo_cnes,
        nome_medicamento,
        coalesce(numero_lote, '') as numero_lote,
        data_posicao_estoque,
        quantidade_estoque,
        data_validade,
        sigla_sistema_origem,
        data_coleta
    from {{ ref('stg_farmacia_sus__estoque_medicamentos') }}
    where data_posicao_estoque is not null
        and nome_medicamento is not null
),

{% if is_incremental() %}
-- Chaves logicas tocadas desde a ultima coleta de cada portal; elas sao reagregadas por inteiro
-- para que a soma gravada nunca seja parcial.
chaves_tocadas as (
    select distinct
        normalizado.portal_slug,
        normalizado.codigo_cnes,
        normalizado.nome_medicamento,
        normalizado.numero_lote,
        normalizado.data_posicao_estoque
    from normalizado
    where normalizado.data_coleta >= coalesce(
        (
            select max(historico.data_coleta)
            from {{ this }} as historico
            where historico.portal_slug = normalizado.portal_slug
        ),
        date '1900-01-01'
    )
),

estoque as (
    select normalizado.*
    from normalizado
    inner join chaves_tocadas
        on normalizado.portal_slug = chaves_tocadas.portal_slug
        and normalizado.codigo_cnes = chaves_tocadas.codigo_cnes
        and normalizado.nome_medicamento = chaves_tocadas.nome_medicamento
        and normalizado.numero_lote = chaves_tocadas.numero_lote
        and normalizado.data_posicao_estoque = chaves_tocadas.data_posicao_estoque
)
{% else %}
estoque as (
    select * from normalizado
)
{% endif %}

select
    {{ dbt_utils.generate_surrogate_key(['portal_slug', 'codigo_cnes', 'nome_medicamento', 'numero_lote', 'data_posicao_estoque']) }} as id_registro,
    portal_slug,
    nullif(codigo_cnes, '') as codigo_cnes,
    nome_medicamento,
    nullif(numero_lote, '') as numero_lote,
    data_posicao_estoque,
    sum(quantidade_estoque)::numeric(15, 3) as quantidade_estoque,
    max(data_validade) as data_validade,
    max(sigla_sistema_origem) as sigla_sistema_origem,
    max(data_coleta) as data_coleta
from estoque
group by portal_slug, codigo_cnes, nome_medicamento, numero_lote, data_posicao_estoque
