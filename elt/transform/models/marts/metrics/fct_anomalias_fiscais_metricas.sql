{{ config(materialized='view' if var('test_mode', false) else 'table') }}

with max_ano_despesas as (
    select
        d.portal_slug,
        max(d.ano) as max_ano
    from {{ ref('fct_despesas') }} d
    where d.fonte = 'exercicio'
    group by d.portal_slug
),

despesas_anuais as (
    select
        d.portal_slug,
        d.ano,
        coalesce(nullif(trim(d.funcao_nome), ''), 'Sem Função') as funcao_nome,
        sum(d.empenhado_liquido) as valor_observado
    from {{ ref('fct_despesas') }} d
    join max_ano_despesas m on d.portal_slug = m.portal_slug
    where d.fonte = 'exercicio'
      and d.ano < m.max_ano
      and d.ano >= {{ var('ano_inicial_historico', 2021) }}
    group by d.portal_slug, d.ano, coalesce(nullif(trim(d.funcao_nome), ''), 'Sem Função')
),

despesas_stats as (
    select
        portal_slug,
        funcao_nome,
        percentile_cont(0.25) within group (order by valor_observado) as q1,
        percentile_cont(0.50) within group (order by valor_observado) as mediana,
        percentile_cont(0.75) within group (order by valor_observado) as q3
    from despesas_anuais
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
        12::integer as mes_final,
        null::text as licitacao_numero,
        'iqr_fluxo_homologo'::text as metodo_deteccao
    from despesas_anuais h
    join despesas_stats s on h.portal_slug = s.portal_slug and h.funcao_nome = s.funcao_nome
    where h.valor_observado > s.q3 + 1.5 * (s.q3 - s.q1)
      and h.valor_observado >= 50000.0
      and (h.valor_observado - s.mediana) >= 20000.0
      and lower(regexp_replace({{ target.schema }}.unaccent(trim(h.funcao_nome)), '[^a-zA-Z0-9]+', '_', 'g')) not in (
          'saude',
          'educacao',
          'assistencia_social',
          'habitacao',
          'saneamento',
          'gestao_ambiental',
          'cultura',
          'desporto_e_lazer',
          'direitos_da_cidadania'
      )
),

comissionados as (
    select
        portal_slug,
        ano,
        sum(total_profissionais) as valor_observado
    from {{ ref('fct_pessoal_regime_metricas') }}
    where categoria_regime = 'comissionado'
      and ano >= {{ var('ano_inicial_historico', 2021) }}
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
        null::text as licitacao_numero,
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
      and ano >= {{ var('ano_inicial_historico', 2021) }}
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
        null::text as licitacao_numero,
        'iqr_estoque'::text as metodo_deteccao
    from caixa c
    join caixa_stats s on c.portal_slug = s.portal_slug
    where c.valor_observado < 0
       or c.valor_observado < s.q1 - 1.5 * (s.q3 - s.q1)
),

licitacoes_anuais as (
    select
        l.portal_slug,
        l.ano,
        count(*)::integer as total_processos,
        count(
            case
                when {{ target.schema }}.unaccent(lower(coalesce(l.modalidade, ''))) like '%dispensa%'
                  or {{ target.schema }}.unaccent(lower(coalesce(l.modalidade, ''))) like '%inexigibilidade%'
                  or {{ target.schema }}.unaccent(lower(coalesce(l.modalidade, ''))) like '%adesao%ata%'
                  or {{ target.schema }}.unaccent(lower(coalesce(l.modalidade, ''))) like '%sem%licitacao%'
                then 1
            end
        )::integer as dispensas_processos
    from {{ ref('fct_licitacoes') }} l
    where l.ano >= {{ var('ano_inicial_historico', 2021) }}
    group by l.portal_slug, l.ano
),

dispensas_calc as (
    select
        portal_slug,
        ano,
        12::integer as max_mes,
        case
            when total_processos > 0
            then round((dispensas_processos::numeric / total_processos * 100.0), 2)
            else 0.00
        end as valor_observado
    from licitacoes_anuais
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
        12::integer as mes_final,
        null::text as licitacao_numero,
        'iqr_processos'::text as metodo_deteccao
    from dispensas_calc d
    join dispensas_stats s on d.portal_slug = s.portal_slug
    where d.valor_observado > s.q3 + 1.5 * (s.q3 - s.q1)
       or (
           d.valor_observado >= s.mediana * 1.3
           and (d.valor_observado - s.mediana) >= 15.0
       )
),

opacidade_anomalias as (
    select
        portal_slug,
        ano,
        'opacidade_gastos_genericos'::text as tipo_anomalia,
        'gastos_genericos'::text as dimensao_referencia,
        taxa_valor_opacidade_pct::numeric as valor_observado,
        30.00::numeric as valor_esperado,
        (taxa_valor_opacidade_pct - 30.00)::numeric as desvio_percentual,
        1::integer as mes_inicial,
        12::integer as mes_final,
        null::text as licitacao_numero,
        'limite_normativo_opacidade'::text as metodo_deteccao
    from {{ ref('fct_opacidade_contabil_metricas') }}
    where taxa_valor_opacidade_pct > 30.00
      and ano >= {{ var('ano_inicial_historico', 2021) }}
),

caprem_atuarial_anomalias as (
    select
        portal_slug,
        ano,
        'inadimplencia_aporte_rpps'::text as tipo_anomalia,
        'aporte_atuarial'::text as dimensao_referencia,
        aporte_quitado::numeric as valor_observado,
        aporte_exigido::numeric as valor_esperado,
        (100.00 - taxa_adimplencia)::numeric as desvio_percentual,
        1::integer as mes_inicial,
        12::integer as mes_final,
        null::text as licitacao_numero,
        'limite_normativo_adimplencia'::text as metodo_deteccao
    from {{ ref('fct_caprem_tendencia_atuarial_metricas') }}
    where aporte_exigido > 0
      and taxa_adimplencia < 90.00
      and ano >= {{ var('ano_inicial_historico', 2021) }}
),

caprem_patronal_anomalias as (
    select
        portal_slug,
        ano,
        'retencao_patronal_rpps'::text as tipo_anomalia,
        'contribuicao_patronal'::text as dimensao_referencia,
        rombo_patronal_nao_repassado::numeric as valor_observado,
        0.00::numeric as valor_esperado,
        100.00::numeric as desvio_percentual,
        1::integer as mes_inicial,
        12::integer as mes_final,
        null::text as licitacao_numero,
        'fluxo_patronal_em_aberto'::text as metodo_deteccao
    from {{ ref('fct_historia_caprem_metricas') }}
    where rombo_patronal_nao_repassado > 20000.00
      and ano >= {{ var('ano_inicial_historico', 2021) }}
),

licitacoes_itens_agrupadas as (
    select
        i.portal_slug,
        i.ano,
        i.licitacao_numero,
        coalesce(l.modalidade, '') as modalidade,
        sum(i.valor_total_estimado) as total_estimado,
        sum(i.valor_total_homologado) as total_homologado,
        case
            when sum(i.valor_total_estimado) > 0
            then round(((sum(i.valor_total_estimado) - sum(i.valor_total_homologado)) / sum(i.valor_total_estimado) * 100.0)::numeric, 2)
            else 0.00
        end as desconto_global
    from {{ ref('fct_licitacoes_itens') }} i
    left join {{ ref('fct_licitacoes') }} l
        on l.portal_slug = i.portal_slug
       and l.ano = i.ano
       and l.licitacao_numero = i.licitacao_numero
    where i.valor_total_homologado is not null
      and i.ano >= {{ var('ano_inicial_historico', 2021) }}
    group by i.portal_slug, i.ano, i.licitacao_numero, coalesce(l.modalidade, '')
),

desconto_nulo_anomalias as (
    select
        portal_slug,
        ano,
        'desconto_nulo_pregao'::text as tipo_anomalia,
        ('licitacao_' || lower(regexp_replace(trim(licitacao_numero), '[^a-zA-Z0-9]+', '_', 'g')))::text as dimensao_referencia,
        desconto_global::numeric as valor_observado,
        10.00::numeric as valor_esperado,
        round((10.00 - desconto_global)::numeric, 2) as desvio_percentual,
        1::integer as mes_inicial,
        12::integer as mes_final,
        licitacao_numero::text as licitacao_numero,
        'limite_competitividade_pregao'::text as metodo_deteccao
    from licitacoes_itens_agrupadas
    where {{ target.schema }}.unaccent(lower(modalidade)) like '%pregao%'
      and desconto_global < 1.00
      and total_homologado >= 20000.00
),

desagio_extremo_anomalias as (
    select
        portal_slug,
        ano,
        'desagio_extremo_inexequibilidade'::text as tipo_anomalia,
        ('licitacao_' || lower(regexp_replace(trim(licitacao_numero), '[^a-zA-Z0-9]+', '_', 'g')))::text as dimensao_referencia,
        desconto_global::numeric as valor_observado,
        50.00::numeric as valor_esperado,
        round((desconto_global - 50.00)::numeric, 2) as desvio_percentual,
        1::integer as mes_inicial,
        12::integer as mes_final,
        licitacao_numero::text as licitacao_numero,
        'limite_inexequibilidade_art59'::text as metodo_deteccao
    from licitacoes_itens_agrupadas
    where desconto_global >= 50.00
      and total_estimado >= 20000.00
),

pessoal_divergencias_anomalias as (
    select
        portal_slug,
        ano,
        'inconsistencia_vinculo_pessoal'::text as tipo_anomalia,
        'quadro_pessoal'::text as dimensao_referencia,
        count(*)::numeric as valor_observado,
        0.00::numeric as valor_esperado,
        100.00::numeric as desvio_percentual,
        1::integer as mes_inicial,
        12::integer as mes_final,
        null::text as licitacao_numero,
        'harmonizacao_cadastral_art37'::text as metodo_deteccao
    from {{ ref('fct_pessoal') }}
    where (
        {{ target.schema }}.unaccent(lower(coalesce(vinculo, ''))) like '%agente%politico%'
        or {{ target.schema }}.unaccent(lower(coalesce(categoria_funcional, ''))) like '%excepcional interesse%'
    )
      and categoria_regime in ('comissionado', 'contrato_temporario')
      and ano >= {{ var('ano_inicial_historico', 2021) }}
    group by portal_slug, ano
    having count(*) > 0
),

dependencia_transferencias_anomalias as (
    select
        portal_slug,
        ano,
        'dependencia_transferencias'::text as tipo_anomalia,
        'receita_propria'::text as dimensao_referencia,
        case
            when sum(total_arrecadado) > 0
            then (sum(receita_propria_arrecadado) / sum(total_arrecadado)) * 100.0
            else
                case
                    when sum(total_previsto) > 0
                    then (sum(receita_propria_previsto) / sum(total_previsto)) * 100.0
                    else 0.0
                end
        end::numeric as valor_observado,
        10.00::numeric as valor_esperado,
        round(
            case
                when sum(total_arrecadado) > 0
                then (10.00 - ((sum(receita_propria_arrecadado) / sum(total_arrecadado)) * 100.0))
                else
                    case
                        when sum(total_previsto) > 0
                        then (10.00 - ((sum(receita_propria_previsto) / sum(total_previsto)) * 100.0))
                        else 10.00
                    end
            end::numeric,
            2
        ) as desvio_percentual,
        1::integer as mes_inicial,
        12::integer as mes_final,
        null::text as licitacao_numero,
        'art11_lrf_arrecadacao_propria'::text as metodo_deteccao
    from {{ ref('fct_fontes_receita_metricas') }}
    where ano < extract(year from current_date)
      and ano >= {{ var('ano_inicial_historico', 2021) }}
    group by portal_slug, ano
    having (
        case
            when sum(total_arrecadado) > 0
            then (sum(receita_propria_arrecadado) / sum(total_arrecadado)) * 100.0
            else
                case
                    when sum(total_previsto) > 0
                    then (sum(receita_propria_previsto) / sum(total_previsto)) * 100.0
                    else 0.0
                end
        end
    ) < 10.0
),

caprem_desidratacao_base as (
    select
        portal_slug,
        ano,
        patrimonio_total
    from {{ ref('fct_caprem_patrimonio_historico_metricas') }}
    where not inconsistencia_declaracao_flag
      and ano >= {{ var('ano_inicial_historico', 2021) }}
),

caprem_desidratacao_janela as (
    select
        portal_slug,
        ano,
        patrimonio_total as valor_observado,
        lag(patrimonio_total, 2) over (partition by portal_slug order by ano) as valor_esperado,
        lag(ano, 2) over (partition by portal_slug order by ano) as ano_esperado
    from caprem_desidratacao_base
),

caprem_desidratacao_anomalias as (
    select
        portal_slug,
        ano,
        'desidratacao_patrimonio_rpps'::text as tipo_anomalia,
        'patrimonio_previdenciario'::text as dimensao_referencia,
        valor_observado::numeric as valor_observado,
        valor_esperado::numeric as valor_esperado,
        round((((valor_observado - valor_esperado) / valor_esperado) * 100.0)::numeric, 2) as desvio_percentual,
        1::integer as mes_inicial,
        12::integer as mes_final,
        null::text as licitacao_numero,
        'variacao_trienal_patrimonio'::text as metodo_deteccao
    from caprem_desidratacao_janela
    where valor_esperado is not null
      and valor_esperado > 0
      and ano_esperado is not null
      and ano - ano_esperado <= 3
      and ano < extract(year from current_date)
      and (((valor_observado - valor_esperado) / valor_esperado) * 100.0) < -20.00
),

todas_anomalias as (
    select * from despesas_anomalias
    union all
    select * from comissionados_anomalias
    union all
    select * from caixa_anomalias
    union all
    select * from dispensas_anomalias
    union all
    select * from opacidade_anomalias
    union all
    select * from caprem_atuarial_anomalias
    union all
    select * from caprem_patronal_anomalias
    union all
    select * from desconto_nulo_anomalias
    union all
    select * from desagio_extremo_anomalias
    union all
    select * from pessoal_divergencias_anomalias
    union all
    select * from dependencia_transferencias_anomalias
    union all
    select * from caprem_desidratacao_anomalias
)

select
    {{ dbt_utils.generate_surrogate_key(['portal_slug', 'ano', 'tipo_anomalia', 'dimensao_referencia']) }} as anomalia_id,
    portal_slug,
    ano,
    tipo_anomalia,
    dimensao_referencia,
    case
        when tipo_anomalia in ('retencao_patronal_rpps', 'dependencia_transferencias', 'desidratacao_patrimonio_rpps') then 'critico'
        when tipo_anomalia = 'inadimplencia_aporte_rpps' then
            case
                when desvio_percentual > 30.0 then 'critico'
                else 'alto'
            end
        when tipo_anomalia = 'desconto_nulo_pregao' then
            case
                when valor_observado <= 0.20 or desvio_percentual >= 9.80 then 'critico'
                else 'alto'
            end
        when tipo_anomalia = 'desagio_extremo_inexequibilidade' then
            case
                when valor_observado >= 65.00 then 'critico'
                else 'alto'
            end
        when tipo_anomalia = 'inconsistencia_vinculo_pessoal' then
            case
                when valor_observado > 30 then 'critico'
                when valor_observado > 5 then 'alto'
                else 'moderado'
            end
        when abs(desvio_percentual) > 50 or tipo_anomalia = 'rombo_caixa' or tipo_anomalia = 'opacidade_gastos_genericos' then 'critico'
        when abs(desvio_percentual) > 30 then 'alto'
        else 'moderado'
    end::text as grau_severidade,
    abs(desvio_percentual)::numeric(15, 2) as desvio_percentual,
    valor_observado::numeric(18, 2) as valor_observado,
    valor_esperado::numeric(18, 2) as valor_esperado,
    mes_inicial,
    mes_final,
    licitacao_numero,
    metodo_deteccao
from todas_anomalias
