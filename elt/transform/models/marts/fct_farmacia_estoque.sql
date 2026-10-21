-- Fato: estoque de medicamentos da Farmacia SUS (BNAFAR/Horus) e conformidade com a Lei 14.654/2023.
-- Grao: uma linha por item de estoque vigente (portal conforme) ou uma linha de status por portal (apagao/indisponivel).
{{ config(
    materialized = 'view' if var('test_mode', false) else 'table'
) }}

{% set limite_dias_defasagem = var('farmacia_sus_limite_dias_defasagem', 15) %}

with portais as (
    select
        portal_slug,
        (case
            when cod_ibge::bigint >= 1000000 then cod_ibge::bigint / 10
            else cod_ibge::bigint
        end)::text as codigo_ibge6
    from {{ ref('dim_portais') }}
    where cod_ibge is not null
),

coletas as (
    select
        portal_slug,
        status_coleta,
        data_coleta
    from {{ ref('stg_farmacia_sus__coletas') }}
),

-- Posicoes futuras (> data da coleta) sao inconsistentes e nao contam como vigentes.
estoque_valido as (
    select
        estoque.portal_slug,
        estoque.id_registro,
        estoque.codigo_cnes,
        estoque.nome_medicamento,
        estoque.quantidade_estoque,
        estoque.data_posicao_estoque
    from {{ ref('stg_farmacia_sus__estoque_medicamentos') }} as estoque
    inner join coletas
        on estoque.portal_slug = coletas.portal_slug
    where estoque.data_posicao_estoque is not null
        and estoque.data_posicao_estoque <= coletas.data_coleta
),

-- Frescor por unidade: a ultima posicao de cada CNES, para que linhas legadas de uma
-- unidade parada nao contaminem o status do municipio.
posicao_por_unidade as (
    select
        portal_slug,
        codigo_cnes,
        max(data_posicao_estoque) as data_posicao_unidade
    from estoque_valido
    group by portal_slug, codigo_cnes
),

unidades_ativas as (
    select
        posicao_por_unidade.portal_slug,
        posicao_por_unidade.codigo_cnes,
        posicao_por_unidade.data_posicao_unidade
    from posicao_por_unidade
    inner join coletas
        on posicao_por_unidade.portal_slug = coletas.portal_slug
    where coletas.data_coleta - posicao_por_unidade.data_posicao_unidade <= {{ limite_dias_defasagem }}
),

itens_ativos as (
    select
        estoque_valido.portal_slug,
        estoque_valido.id_registro,
        estoque_valido.codigo_cnes,
        estoque_valido.nome_medicamento,
        estoque_valido.quantidade_estoque,
        estoque_valido.data_posicao_estoque
    from estoque_valido
    inner join unidades_ativas
        on estoque_valido.portal_slug = unidades_ativas.portal_slug
        and estoque_valido.codigo_cnes is not distinct from unidades_ativas.codigo_cnes
        and estoque_valido.data_posicao_estoque = unidades_ativas.data_posicao_unidade
    where estoque_valido.nome_medicamento is not null
),

resumo_ativo as (
    select
        portal_slug,
        max(data_posicao_estoque) as data_posicao_mais_recente
    from itens_ativos
    group by portal_slug
),

posicao_geral as (
    select
        portal_slug,
        max(data_posicao_estoque) as data_posicao_mais_recente
    from estoque_valido
    group by portal_slug
),

status_portal as (
    select
        portais.portal_slug,
        portais.codigo_ibge6,
        coletas.data_coleta,
        coalesce(resumo_ativo.data_posicao_mais_recente, posicao_geral.data_posicao_mais_recente) as data_posicao_mais_recente,
        (coletas.data_coleta - coalesce(resumo_ativo.data_posicao_mais_recente, posicao_geral.data_posicao_mais_recente)) as dias_desde_posicao_mais_recente,
        case
            when coletas.status_coleta is distinct from 'sucesso' then 'indisponivel'
            when coletas.data_coleta is null then 'indisponivel'
            when current_date - coletas.data_coleta > {{ limite_dias_defasagem }} then 'indisponivel'
            when resumo_ativo.portal_slug is not null then 'conforme'
            else 'apagao'
        end as status_conformidade
    from portais
    left join coletas
        on portais.portal_slug = coletas.portal_slug
    left join resumo_ativo
        on portais.portal_slug = resumo_ativo.portal_slug
    left join posicao_geral
        on portais.portal_slug = posicao_geral.portal_slug
),

unidades as (
    select distinct on (portal_slug, codigo_cnes)
        portal_slug,
        codigo_cnes,
        nome_unidade,
        endereco_unidade,
        telefone_unidade,
        latitude_unidade,
        longitude_unidade
    from {{ ref('stg_farmacia_sus__estabelecimentos_cnes') }}
    where codigo_cnes is not null
    order by portal_slug, codigo_cnes, nome_unidade
),

itens_vigentes as (
    select
        {{ dbt_utils.generate_surrogate_key(['itens_ativos.portal_slug', 'itens_ativos.id_registro']) }} as id_registro,
        status_portal.portal_slug,
        status_portal.codigo_ibge6,
        status_portal.status_conformidade,
        status_portal.data_coleta,
        status_portal.data_posicao_mais_recente,
        status_portal.dias_desde_posicao_mais_recente,
        itens_ativos.codigo_cnes,
        unidades.nome_unidade,
        unidades.endereco_unidade,
        unidades.telefone_unidade,
        unidades.latitude_unidade,
        unidades.longitude_unidade,
        itens_ativos.nome_medicamento,
        itens_ativos.quantidade_estoque,
        itens_ativos.data_posicao_estoque
    from status_portal
    inner join itens_ativos
        on status_portal.portal_slug = itens_ativos.portal_slug
    left join unidades
        on itens_ativos.portal_slug = unidades.portal_slug
        and itens_ativos.codigo_cnes = unidades.codigo_cnes
    where status_portal.status_conformidade = 'conforme'
),

portais_sem_itens as (
    select
        {{ dbt_utils.generate_surrogate_key(['portal_slug', "'status_portal'"]) }} as id_registro,
        portal_slug,
        codigo_ibge6,
        status_conformidade,
        data_coleta,
        data_posicao_mais_recente,
        dias_desde_posicao_mais_recente,
        null::text as codigo_cnes,
        null::text as nome_unidade,
        null::text as endereco_unidade,
        null::text as telefone_unidade,
        null::numeric(12, 8) as latitude_unidade,
        null::numeric(12, 8) as longitude_unidade,
        null::text as nome_medicamento,
        null::numeric(15, 3) as quantidade_estoque,
        null::date as data_posicao_estoque
    from status_portal
    where status_conformidade <> 'conforme'
)

select * from itens_vigentes
union all
select * from portais_sem_itens
