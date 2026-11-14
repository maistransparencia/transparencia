-- Fato: ultima coleta com sucesso de cada fonte do catalogo (seed_fontes_coleta) por portal.
-- ultima_coleta_total_linhas: linhas da ultima carga (0 = a fonte respondeu sem registros; nulo = sem registro).
-- ultima_falha_em / ultimo_erro_codigo: ultima tentativa com falha; nunca sobrescreve a ultima coleta com sucesso.
-- Toda fonte do catalogo aparece para todo portal: sem registro de coleta, nunca e presumida atualizada.
{{ config(
    materialized = 'view' if var('test_mode', false) else 'table'
) }}

with coletas_numeradas as (
    select
        portal_slug,
        fonte,
        coletado_em,
        total_linhas,
        row_number() over (partition by portal_slug, fonte order by coletado_em desc) as posicao_coleta,
        count(*) over (partition by portal_slug, fonte) as total_coletas
    from {{ ref('stg_coletas__registro_coletas') }}
    where resultado = 'sucesso'
),

ultimas_coletas as (
    select
        portal_slug,
        fonte,
        coletado_em as ultima_coleta_em,
        total_linhas as ultima_coleta_total_linhas,
        total_coletas
    from coletas_numeradas
    where posicao_coleta = 1
),

ultimas_falhas as (
    select
        portal_slug,
        fonte,
        coletado_em as ultima_falha_em,
        erro_codigo as ultimo_erro_codigo
    from (
        select
            portal_slug,
            fonte,
            coletado_em,
            erro_codigo,
            row_number() over (partition by portal_slug, fonte order by coletado_em desc) as posicao_falha
        from {{ ref('stg_coletas__registro_coletas') }}
        where resultado = 'falha'
    ) falhas_numeradas
    where posicao_falha = 1
)

select
    {{ dbt_utils.generate_surrogate_key(['p.portal_slug', 'f.fonte']) }} as id_registro,
    p.portal_slug,
    f.fonte,
    f.frequencia_esperada,
    f.descricao_dados,
    f.tolerancia_dias,
    f.nome_fonte,
    f.url_fonte,
    f.esfera_fonte,
    case
        when f.monitoramento = 'nao_monitorado' then 'nao_monitorado'
        when c.ultima_coleta_em is null then 'sem_registro'
        else 'monitorado'
    end as situacao_monitoramento,
    c.ultima_coleta_em,
    c.ultima_coleta_total_linhas,
    coalesce(c.total_coletas, 0)::integer as total_coletas,
    u.ultima_falha_em,
    u.ultimo_erro_codigo
from {{ ref('dim_portais') }} p
cross join {{ ref('seed_fontes_coleta') }} f
left join ultimas_coletas c
    on c.portal_slug = p.portal_slug
    and c.fonte = f.fonte
left join ultimas_falhas u
    on u.portal_slug = p.portal_slug
    and u.fonte = f.fonte
