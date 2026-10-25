-- Fato: disponibilidade dos medicamentos-sentinela (RENAME 2024) por unidade ativa da Farmacia SUS.
-- Grao: (portal_slug, codigo_cnes, codigo_principio_ativo). Ausencia na fonte vira linha explicita sem registro.
{{ config(
    materialized = 'view' if var('test_mode', false) else 'table'
) }}

with unidades_ativas as (
    select distinct
        portal_slug,
        codigo_cnes
    from {{ ref('fct_farmacia_estoque') }}
    where status_conformidade = 'conforme'
        and codigo_cnes is not null
),

sentinelas as (
    select
        codigo_principio_ativo,
        min(nome_principio_ativo) as nome_principio_ativo,
        min(grupo_terapeutico) as grupo_terapeutico,
        min(ordem_exibicao::integer) as ordem_exibicao,
        bool_or(destaque_card_inicial = 'true') as destaque_card_inicial
    from {{ ref('seed_farmacia_medicamentos_sentinela') }}
    group by codigo_principio_ativo
),

prefixos as (
    select
        codigo_principio_ativo,
        prefixo_nome_normalizado
    from {{ ref('seed_farmacia_medicamentos_sentinela') }}
),

itens_normalizados as (
    select
        portal_slug,
        codigo_cnes,
        {{ target.schema }}.unaccent(lower(btrim(regexp_replace(nome_medicamento, '\s+', ' ', 'g')))) as nome_normalizado,
        quantidade_estoque
    from {{ ref('fct_farmacia_estoque') }}
    where status_conformidade = 'conforme'
        and codigo_cnes is not null
        and nome_medicamento is not null
),

-- Dose fixa e associacoes nao casam com o principio ativo isolado.
apresentacoes as (
    select
        itens_normalizados.portal_slug,
        itens_normalizados.codigo_cnes,
        prefixos.codigo_principio_ativo,
        itens_normalizados.nome_normalizado,
        sum(coalesce(itens_normalizados.quantidade_estoque, 0)) as quantidade_apresentacao
    from itens_normalizados
    inner join prefixos
        on itens_normalizados.nome_normalizado ~ ('^' || prefixos.prefixo_nome_normalizado || '([ ,(]|$)')
    where itens_normalizados.nome_normalizado !~ '[+]'
        and itens_normalizados.nome_normalizado !~ 'associad'
    group by
        itens_normalizados.portal_slug,
        itens_normalizados.codigo_cnes,
        prefixos.codigo_principio_ativo,
        itens_normalizados.nome_normalizado
),

-- Combinacoes em dose fixa que contem o principio ativo (ex.: valsartana + hidroclorotiazida):
-- nao sao o sentinela, mas explicam por que a busca textual encontra o nome.
apresentacoes_combinacao as (
    select
        itens_normalizados.portal_slug,
        itens_normalizados.codigo_cnes,
        prefixos.codigo_principio_ativo,
        itens_normalizados.nome_normalizado,
        sum(coalesce(itens_normalizados.quantidade_estoque, 0)) as quantidade_apresentacao
    from itens_normalizados
    inner join prefixos
        on itens_normalizados.nome_normalizado ~ ('(^|[ ,(+])' || prefixos.prefixo_nome_normalizado || '([ ,)+]|$)')
    where itens_normalizados.nome_normalizado ~ '[+]'
        or itens_normalizados.nome_normalizado ~ 'associad'
    group by
        itens_normalizados.portal_slug,
        itens_normalizados.codigo_cnes,
        prefixos.codigo_principio_ativo,
        itens_normalizados.nome_normalizado
),

apresentacoes_combinacao_com_estoque as (
    select
        portal_slug,
        codigo_cnes,
        codigo_principio_ativo,
        count(*) as quantidade_apresentacoes_combinacao_com_estoque
    from apresentacoes_combinacao
    where quantidade_apresentacao > 0
    group by portal_slug, codigo_cnes, codigo_principio_ativo
),

apresentacoes_com_estoque as (
    select
        portal_slug,
        codigo_cnes,
        codigo_principio_ativo,
        count(*) as quantidade_apresentacoes_com_estoque
    from apresentacoes
    where quantidade_apresentacao > 0
    group by portal_slug, codigo_cnes, codigo_principio_ativo
)

select
    unidades_ativas.portal_slug,
    unidades_ativas.codigo_cnes,
    sentinelas.codigo_principio_ativo,
    sentinelas.nome_principio_ativo,
    sentinelas.grupo_terapeutico,
    sentinelas.ordem_exibicao,
    sentinelas.destaque_card_inicial,
    case
        when coalesce(apresentacoes_com_estoque.quantidade_apresentacoes_com_estoque, 0) > 0
            then 'com_registro_estoque'
        else 'sem_registro_estoque'
    end as status_disponibilidade,
    coalesce(apresentacoes_com_estoque.quantidade_apresentacoes_com_estoque, 0)::integer as quantidade_apresentacoes_com_estoque,
    coalesce(apresentacoes_combinacao_com_estoque.quantidade_apresentacoes_combinacao_com_estoque, 0)::integer as quantidade_apresentacoes_combinacao_com_estoque
from unidades_ativas
cross join sentinelas
left join apresentacoes_com_estoque
    on unidades_ativas.portal_slug = apresentacoes_com_estoque.portal_slug
    and unidades_ativas.codigo_cnes = apresentacoes_com_estoque.codigo_cnes
    and sentinelas.codigo_principio_ativo = apresentacoes_com_estoque.codigo_principio_ativo
left join apresentacoes_combinacao_com_estoque
    on unidades_ativas.portal_slug = apresentacoes_combinacao_com_estoque.portal_slug
    and unidades_ativas.codigo_cnes = apresentacoes_combinacao_com_estoque.codigo_cnes
    and sentinelas.codigo_principio_ativo = apresentacoes_combinacao_com_estoque.codigo_principio_ativo
