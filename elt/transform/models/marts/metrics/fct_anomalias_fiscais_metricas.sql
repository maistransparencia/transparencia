{{ config(materialized='view' if var('test_mode', false) else 'table') }}

with ref_periodo_despesas as (
    select
        d.portal_slug,
        max(nullif(regexp_replace(trim(d.mes::text), '[^0-9]', '', 'g'), '')::integer) as max_mes
    from {{ ref('fct_despesas') }} d
    where d.ano = (select max(ano) from {{ ref('fct_despesas') }} where portal_slug = d.portal_slug)
      and d.fonte = 'exercicio'
    group by d.portal_slug
),

despesas_homologas as (
    select
        d.portal_slug,
        d.ano,
        coalesce(nullif(trim(d.funcao_nome), ''), 'Sem Função') as funcao_nome,
        sum(d.empenhado_liquido) as valor_observado,
        max(r.max_mes) as max_mes
    from {{ ref('fct_despesas') }} d
    join ref_periodo_despesas r on d.portal_slug = r.portal_slug
    where d.fonte = 'exercicio'
      and nullif(regexp_replace(trim(d.mes::text), '[^0-9]', '', 'g'), '')::integer <= r.max_mes
    group by d.portal_slug, d.ano, coalesce(nullif(trim(d.funcao_nome), ''), 'Sem Função')
),

despesas_stats as (
    select
        portal_slug,
        funcao_nome,
        percentile_cont(0.25) within group (order by valor_observado) as q1,
        percentile_cont(0.50) within group (order by valor_observado) as mediana,
        percentile_cont(0.75) within group (order by valor_observado) as q3
    from despesas_homologas
    group by portal_slug, funcao_nome
),

despesas_anomalias as (
    select
        h.portal_slug,
        h.ano,
        'pico_despesa_homologa'::text as tipo_anomalia,
        lower(regexp_replace({{ target.schema }}.unaccent(trim(h.funcao_nome)), '[^a-zA-Z0-9]+', '_', 'g'))::text as dimensao_referencia,
        h.valor_observado::numeric,
        s.mediana::numeric as valor_esperado,
        case
            when s.mediana = 0 then 100.0
            else ((h.valor_observado - s.mediana) / s.mediana) * 100.0
        end::numeric as desvio_percentual,
        1::integer as mes_inicial,
        h.max_mes::integer as mes_final,
        ('/' || h.portal_slug || '/despesas?ano=' || h.ano)::text as deep_link_rota,
        'iqr_fluxo_homologo'::text as metodo_deteccao
    from despesas_homologas h
    join despesas_stats s on h.portal_slug = s.portal_slug and h.funcao_nome = s.funcao_nome
    where h.valor_observado > s.q3 + 1.5 * (s.q3 - s.q1)
      and h.valor_observado >= 50000.0
      and (h.valor_observado - s.mediana) >= 20000.0
),

comissionados as (
    select
        portal_slug,
        ano,
        sum(total_profissionais) as valor_observado
    from {{ ref('fct_pessoal_regime_metricas') }}
    where categoria_regime = 'comissionado'
    group by portal_slug, ano
),

comissionados_stats as (
    select
        portal_slug,
        percentile_cont(0.25) within group (order by valor_observado) as q1,
        percentile_cont(0.50) within group (order by valor_observado) as mediana,
        percentile_cont(0.75) within group (order by valor_observado) as q3
    from comissionados
    group by portal_slug
),

comissionados_anomalias as (
    select
        c.portal_slug,
        c.ano,
        'explosao_comissionados'::text as tipo_anomalia,
        'comissionados'::text as dimensao_referencia,
        c.valor_observado::numeric,
        s.mediana::numeric as valor_esperado,
        case
            when s.mediana = 0 then 100.0
            else ((c.valor_observado - s.mediana) / s.mediana) * 100.0
        end::numeric as desvio_percentual,
        1::integer as mes_inicial,
        12::integer as mes_final,
        ('/' || c.portal_slug || '/pessoal?ano=' || c.ano || '#comissionados')::text as deep_link_rota,
        case
            when c.valor_observado > s.q3 + 1.5 * (s.q3 - s.q1) then 'iqr_estoque'
            else 'desvio_mediana_estoque'
        end::text as metodo_deteccao
    from comissionados c
    join comissionados_stats s on c.portal_slug = s.portal_slug
    where c.valor_observado > s.q3 + 1.5 * (s.q3 - s.q1)
       or (
           c.valor_observado >= s.mediana * 1.3
           and (c.valor_observado - s.mediana) >= 10
       )
),

caixa as (
    select
        portal_slug,
        ano,
        max(mes_referencia) as mes_referencia,
        sum(saldo_recursos_livres) as valor_observado
    from {{ ref('fct_saldo_caixa_siconfi') }}
    where ultima_competencia_flag = true
    group by portal_slug, ano
),

caixa_stats as (
    select
        portal_slug,
        percentile_cont(0.25) within group (order by valor_observado) as q1,
        percentile_cont(0.50) within group (order by valor_observado) as mediana,
        percentile_cont(0.75) within group (order by valor_observado) as q3
    from caixa
    group by portal_slug
),

caixa_anomalias as (
    select
        c.portal_slug,
        c.ano,
        'rombo_caixa'::text as tipo_anomalia,
        'recursos_livres'::text as dimensao_referencia,
        c.valor_observado::numeric,
        s.mediana::numeric as valor_esperado,
        case
            when s.mediana = 0 then 100.0
            else ((c.valor_observado - s.mediana) / nullif(abs(s.mediana), 0)) * 100.0
        end::numeric as desvio_percentual,
        c.mes_referencia::integer as mes_inicial,
        c.mes_referencia::integer as mes_final,
        ('/' || c.portal_slug || '/receitas?ano=' || c.ano || '#saldo-caixa')::text as deep_link_rota,
        'iqr_estoque'::text as metodo_deteccao
    from caixa c
    join caixa_stats s on c.portal_slug = s.portal_slug
    where c.valor_observado < 0
       or c.valor_observado < s.q1 - 1.5 * (s.q3 - s.q1)
),

ref_periodo_lic as (
    select
        l.portal_slug,
        max(extract(month from coalesce(l.data_abertura, make_date(l.ano, 1, 1)))) as max_mes
    from {{ ref('fct_licitacoes') }} l
    where l.ano = (select max(ano) from {{ ref('fct_licitacoes') }} where portal_slug = l.portal_slug)
    group by l.portal_slug
),

licitacoes_homologas as (
    select
        l.portal_slug,
        l.ano,
        sum(
            case
                when {{ target.schema }}.unaccent(lower(coalesce(l.modalidade, ''))) like '%dispensa%'
                  or {{ target.schema }}.unaccent(lower(coalesce(l.modalidade, ''))) like '%inexigibilidade%'
                  or {{ target.schema }}.unaccent(lower(coalesce(l.modalidade, ''))) like '%adesao%ata%'
                  or {{ target.schema }}.unaccent(lower(coalesce(l.modalidade, ''))) like '%sem%licitacao%'
                then l.valor
                else 0
            end
        ) as valor_dispensas,
        sum(l.valor) as valor_total,
        max(r.max_mes) as max_mes
    from {{ ref('fct_licitacoes') }} l
    join ref_periodo_lic r on l.portal_slug = r.portal_slug
    where extract(month from coalesce(l.data_abertura, make_date(l.ano, 1, 1))) <= r.max_mes
    group by l.portal_slug, l.ano
),

dispensas_calc as (
    select
        portal_slug,
        ano,
        max_mes,
        case when valor_total > 0 then (valor_dispensas / valor_total) * 100.0 else 0 end as valor_observado
    from licitacoes_homologas
),

dispensas_stats as (
    select
        portal_slug,
        percentile_cont(0.25) within group (order by valor_observado) as q1,
        percentile_cont(0.50) within group (order by valor_observado) as mediana,
        percentile_cont(0.75) within group (order by valor_observado) as q3
    from dispensas_calc
    group by portal_slug
),

dispensas_anomalias as (
    select
        d.portal_slug,
        d.ano,
        'concentracao_dispensa'::text as tipo_anomalia,
        'dispensas'::text as dimensao_referencia,
        d.valor_observado::numeric,
        s.mediana::numeric as valor_esperado,
        case
            when s.mediana = 0 then 100.0
            else ((d.valor_observado - s.mediana) / s.mediana) * 100.0
        end::numeric as desvio_percentual,
        1::integer as mes_inicial,
        d.max_mes::integer as mes_final,
        ('/' || d.portal_slug || '/licitacoes?ano=' || d.ano)::text as deep_link_rota,
        'iqr_fluxo_homologo'::text as metodo_deteccao
    from dispensas_calc d
    join dispensas_stats s on d.portal_slug = s.portal_slug
    where d.valor_observado > s.q3 + 1.5 * (s.q3 - s.q1)
      and d.valor_observado >= 5.0
),

todas_anomalias as (
    select * from despesas_anomalias
    union all
    select * from comissionados_anomalias
    union all
    select * from caixa_anomalias
    union all
    select * from dispensas_anomalias
)

select
    {{ dbt_utils.generate_surrogate_key(['portal_slug', 'ano', 'tipo_anomalia', 'dimensao_referencia']) }} as anomalia_id,
    portal_slug,
    ano,
    tipo_anomalia,
    dimensao_referencia,
    case
        when abs(desvio_percentual) > 50 or tipo_anomalia = 'rombo_caixa' then 'critico'
        when abs(desvio_percentual) > 30 then 'alto'
        else 'moderado'
    end::text as grau_severidade,
    abs(desvio_percentual)::numeric(15, 2) as desvio_percentual,
    valor_observado::numeric(18, 2) as valor_observado,
    valor_esperado::numeric(18, 2) as valor_esperado,
    mes_inicial,
    mes_final,
    deep_link_rota,
    metodo_deteccao
from todas_anomalias
