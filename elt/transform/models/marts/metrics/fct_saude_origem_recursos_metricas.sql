{{ config(
    materialized='view' if var('test_mode', false) else 'table',
    indexes=[
        {'columns': ['portal_slug', 'ano', 'empresa_id', 'grupo_fonte', 'codigo_natureza'], 'unique': True},
        {'columns': ['portal_slug', 'ano']}
    ] if not var('test_mode', false) else []
) }}

-- Receitas orçamentárias dos órgãos de Saúde, classificadas pela esfera que repassa o recurso. A esfera vem
-- da natureza da receita, nunca do código da fonte STN: a fonte 1621 aparece tanto em naturezas da União (1713)
-- quanto do Estado (1723). O detalhe usa as folhas do plano de contas; quando o total da categoria
-- (171, 172, 241, 242) passa da soma das folhas, a diferença entra em sem_detalhe_<categoria> na mesma esfera.
-- A hierarquia compara segmentos inteiros (1713.50.1.1.10.00 não é pai de 1713.50.1.1.11.00); só o primeiro
-- segmento perde os zeros à direita (1710 -> 171).
-- Plano de contas a partir de 2022: 171x e 241x União, 172x e 242x Estado.
-- Em 2021 o portal ainda usa a tabela anterior: 1718 e 2418 União (SUS fundo a fundo e convênios), 1728 Estado;
-- os mesmos prefixos 171x/241x e 172x/242x cobrem os dois planos. Anos anteriores a 2021 ficam fora: a tabela
-- antiga usa 1721 para a União e 1722 para o Estado, o oposto do prefixo 172x aplicado aqui.
-- Rendimento de aplicação, devolução e demais naturezas ficam em outras_receitas.

with orgaos_saude as (
    select
        portal_slug,
        empresa_id,
        orgao_nome
    from {{ ref('dim_orgao') }}
    where {{ target.schema }}.unaccent(lower(orgao_nome)) like '%saude%'
),

receitas_saude as (
    select
        r.portal_slug,
        r.ano,
        r.empresa_id,
        o.orgao_nome,
        r.codigo,
        r.descricao,
        coalesce(r.arrecadado, 0) as arrecadado,
        case
            when position('.' in regexp_replace(r.codigo, '(\.0+)+$', '')) = 0
                then rtrim(regexp_replace(r.codigo, '(\.0+)+$', ''), '0')
            else regexp_replace(r.codigo, '(\.0+)+$', '') || '.'
        end as prefixo_hierarquia
    from {{ ref('fct_receitas') }} r
    join orgaos_saude o
        on o.portal_slug = r.portal_slug
        and o.empresa_id = r.empresa_id
    where r.tipo_receita = 'orcamentaria'
        and r.ano >= 2021
),

folhas as (
    select t.*
    from receitas_saude t
    where not exists (
        select 1
        from receitas_saude t2
        where t2.portal_slug = t.portal_slug
          and t2.ano = t.ano
          and t2.empresa_id = t.empresa_id
          and t2.codigo != t.codigo
          and t2.codigo like t.prefixo_hierarquia || '%'
          and length(t2.prefixo_hierarquia) > length(t.prefixo_hierarquia)
    )
),

classificadas as (
    select
        portal_slug,
        ano,
        empresa_id,
        orgao_nome,
        case
            when codigo like '171%' or codigo like '241%' then 'uniao'
            when codigo like '172%' or codigo like '242%' then 'estado'
            else 'outras_receitas'
        end as grupo_fonte,
        case
            when codigo like '171%' then '171'
            when codigo like '172%' then '172'
            when codigo like '241%' then '241'
            when codigo like '242%' then '242'
        end as categoria,
        codigo,
        descricao,
        arrecadado
    from folhas
),

totais_categoria as (
    select
        portal_slug,
        ano,
        empresa_id,
        max(orgao_nome) as orgao_nome,
        rtrim(codigo, '0.') as categoria,
        sum(arrecadado) as total_categoria
    from receitas_saude
    where rtrim(codigo, '0.') in ('171', '172', '241', '242')
    group by portal_slug, ano, empresa_id, rtrim(codigo, '0.')
),

folhas_por_categoria as (
    select
        portal_slug,
        ano,
        empresa_id,
        categoria,
        sum(arrecadado) as total_folhas_categoria
    from classificadas
    where categoria is not null
    group by portal_slug, ano, empresa_id, categoria
),

-- Linhas "principal" do portal carregam valor próprio além das filhas, então a soma das folhas
-- fica abaixo do total da categoria. A diferença continua na esfera da categoria, em linha própria.
-- Diferença negativa (detalhe acima do total) é descartada; o teste assert_saude_origem_recursos_fecha_total avisa.
sem_detalhe_categoria as (
    select
        c.portal_slug,
        c.ano,
        c.empresa_id,
        c.orgao_nome,
        case when c.categoria in ('171', '241') then 'uniao' else 'estado' end as grupo_fonte,
        'sem_detalhe_' || c.categoria as codigo_natureza,
        'Sem detalhe nas linhas da Prefeitura' as descricao_natureza,
        (c.total_categoria - coalesce(f.total_folhas_categoria, 0))::numeric(15, 2) as arrecadado_receita
    from totais_categoria c
    left join folhas_por_categoria f
        on f.portal_slug = c.portal_slug
        and f.ano = c.ano
        and f.empresa_id = c.empresa_id
        and f.categoria = c.categoria
    where c.total_categoria - coalesce(f.total_folhas_categoria, 0) > 0.01
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
    from receitas_saude
    where rtrim(codigo, '0.') in ('1', '2')
    group by portal_slug, ano, empresa_id
),

totais_folhas as (
    select
        portal_slug,
        ano,
        empresa_id,
        sum(arrecadado_receita) as total_folhas
    from (
        select portal_slug, ano, empresa_id, arrecadado_receita from folhas_agregadas
        union all
        select portal_slug, ano, empresa_id, arrecadado_receita from sem_detalhe_categoria
    ) detalhado
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
select * from sem_detalhe_categoria
union all
select * from residuos
