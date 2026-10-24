{{ config(
    materialized='view' if var('test_mode', false) else 'table',
    indexes=[
        {'columns': ['portal_slug', 'ano', 'empresa_id', 'grupo_fonte', 'codigo_natureza'], 'unique': True},
        {'columns': ['portal_slug', 'ano']}
    ] if not var('test_mode', false) else []
) }}

-- Receitas orçamentárias (somente folhas do plano de contas) dos órgãos de Educação,
-- classificadas por origem. Os prefixos de natureza seguem o plano de contas padrão (MCASP)
-- e vivem somente no CASE de "classificadas". Até 2021 o portal usa a tabela de naturezas anterior
-- (1758.01 FUNDEB, 1718.05.x FNDE, 1718.09 complementação da União); a partir de 2022, 1751/1714/1715.
-- Naturezas específicas de programa decidem o grupo. Naturezas genéricas (rendimento de depósitos
-- bancários 1321.01, royalties 1712.x) seguem o código da fonte STN, que o portal lança por programa:
-- 1550 salário-educação, 1551 PDDE, 1552 PNAE, 1553 PNATE, 1569 outros FNDE, 1573 royalties da educação
-- (1704, 1705 e 1720 são royalties de compensação financeira do petróleo lançados pelo portal).
-- Até 2021 a fonte vem com 8 dígitos (1120 salário-educação, 1121 PDDE, 1122 PNAE, 1123 PNATE, 1124/1125 outros FNDE).

with orgaos_educacao as (
    select
        portal_slug,
        empresa_id,
        orgao_nome
    from {{ ref('dim_orgao') }}
    where orgao_nome ilike '%edu%'
),

receitas_educacao as (
    select
        r.portal_slug,
        r.ano,
        r.empresa_id,
        o.orgao_nome,
        r.codigo,
        r.descricao,
        r.codigo_fonte_stn,
        coalesce(r.arrecadado, 0) as arrecadado
    from {{ ref('fct_receitas') }} r
    join orgaos_educacao o
        on o.portal_slug = r.portal_slug
        and o.empresa_id = r.empresa_id
    where r.tipo_receita = 'orcamentaria'
),

folhas as (
    select t.*
    from receitas_educacao t
    where not exists (
        select 1
        from receitas_educacao t2
        where t2.portal_slug = t.portal_slug
          and t2.ano = t.ano
          and t2.empresa_id = t.empresa_id
          and t2.codigo != t.codigo
          and t2.codigo like rtrim(t.codigo, '0.') || '%'
          and length(rtrim(t2.codigo, '0.')) > length(rtrim(t.codigo, '0.'))
    )
),

classificadas as (
    select
        portal_slug,
        ano,
        empresa_id,
        orgao_nome,
        case
            when codigo like '1751%' or codigo like '1758.01%' then 'fundeb'
            when codigo like '1715%' or codigo like '1718.09%' then 'fundeb_complementacao_uniao'
            when codigo like '1714.50%' or codigo like '1718.05.1%' then 'salario_educacao'
            when codigo like '1714.52%' or codigo like '1718.05.3%' then 'pnae'
            when codigo like '1714.53%' or codigo like '1718.05.4%' then 'pnate'
            when codigo like '1714%' or codigo like '1718.05%' then 'outros_fnde'
            when codigo_fonte_stn = '1540' or (length(codigo_fonte_stn) = 8 and codigo_fonte_stn like '1116%') then 'fundeb'
            when codigo_fonte_stn in ('1541', '1542', '1543') or (length(codigo_fonte_stn) = 8 and codigo_fonte_stn like '1114%') then 'fundeb_complementacao_uniao'
            when codigo_fonte_stn = '1550' or (length(codigo_fonte_stn) = 8 and codigo_fonte_stn like '1120%') then 'salario_educacao'
            when codigo_fonte_stn = '1552' or (length(codigo_fonte_stn) = 8 and codigo_fonte_stn like '1122%') then 'pnae'
            when codigo_fonte_stn = '1553' or (length(codigo_fonte_stn) = 8 and codigo_fonte_stn like '1123%') then 'pnate'
            when codigo_fonte_stn in ('1551', '1569') or (length(codigo_fonte_stn) = 8 and codigo_fonte_stn similar to '(1121|1124|1125)%') then 'outros_fnde'
            when codigo_fonte_stn in ('1573', '1704', '1705', '1720') then 'royalties'
            else 'outras_receitas'
        end as grupo_fonte,
        codigo,
        descricao,
        arrecadado
    from folhas
),

folhas_agregadas as (
    select
        portal_slug,
        ano,
        empresa_id,
        max(orgao_nome) as orgao_nome,
        grupo_fonte,
        codigo as codigo_natureza,
        max(descricao) as descricao_natureza,
        sum(arrecadado)::numeric(15, 2) as arrecadado_receita
    from classificadas
    group by portal_slug, ano, empresa_id, grupo_fonte, codigo
),

totais_oficiais as (
    select
        portal_slug,
        ano,
        empresa_id,
        max(orgao_nome) as orgao_nome,
        sum(arrecadado) as total_oficial
    from receitas_educacao
    where rtrim(codigo, '0.') in ('1', '2')
    group by portal_slug, ano, empresa_id
),

totais_folhas as (
    select
        portal_slug,
        ano,
        empresa_id,
        sum(arrecadado_receita) as total_folhas
    from folhas_agregadas
    group by portal_slug, ano, empresa_id
),

residuos as (
    select
        o.portal_slug,
        o.ano,
        o.empresa_id,
        o.orgao_nome,
        'nao_detalhado' as grupo_fonte,
        'nao_detalhado' as codigo_natureza,
        'Não detalhado' as descricao_natureza,
        (o.total_oficial - coalesce(f.total_folhas, 0))::numeric(15, 2) as arrecadado_receita
    from totais_oficiais o
    left join totais_folhas f
        on f.portal_slug = o.portal_slug
        and f.ano = o.ano
        and f.empresa_id = o.empresa_id
    where o.total_oficial - coalesce(f.total_folhas, 0) > 0.01
)

select * from folhas_agregadas
union all
select * from residuos
