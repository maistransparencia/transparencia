{{ config(
    materialized='view' if var('test_mode', false) else 'table',
    indexes=[
        {'columns': ['portal_slug', 'ano'], 'unique': True}
    ] if not var('test_mode', false) else []
) }}

-- Mínimo constitucional de saúde no grão portal + ano, com os valores calculados pelo SIOPS (Ministério da Saúde)
-- a partir dos dados declarados pelo município. Códigos do SIOPS: 3.2 percentual da receita própria aplicada em
-- saúde, 3.1 percentual de transferências na despesa total, 2.1 despesa total com saúde por habitante.
-- Ano fechado: 3.2 e valores absolutos do TABNET; 2.1 e 3.1 da consulta por ano (via oficial do município).
-- Ano em andamento: acumulado parcial da consulta por ano, nunca comparado com o mínimo.
-- Sem transmissão é nulo (situacao sem_dado), nunca zero.

with base as (
    select
        portal_slug,
        ano,
        periodo,
        tipo_periodo,
        via,
        codigo_indicador,
        valor,
        coletado_em,
        max(periodo) over (partition by portal_slug, ano) as periodo_mais_recente
    from {{ ref('stg_siops__indicadores') }}
),

indicadores as (
    select
        portal_slug,
        ano,
        periodo,
        max(tipo_periodo) as tipo_periodo,
        max(valor) filter (where via = 'tabnet' and codigo_indicador = '3.2') as percentual_aplicado_saude_tabnet,
        max(valor) filter (where via = 'consulta_ano' and codigo_indicador = '3.2') as percentual_aplicado_saude_consulta,
        max(valor) filter (where via = 'tabnet' and codigo_indicador = '3.1') as percentual_transferencias_saude_tabnet,
        max(valor) filter (where via = 'consulta_ano' and codigo_indicador = '3.1') as percentual_transferencias_saude_consulta,
        max(valor) filter (where via = 'tabnet' and codigo_indicador = '2.1') as despesa_saude_por_habitante_tabnet,
        max(valor) filter (where via = 'consulta_ano' and codigo_indicador = '2.1') as despesa_saude_por_habitante_consulta,
        max(valor) filter (where via = 'tabnet' and codigo_indicador = 'receita_impostos_transferencias_constitucionais') as receita_impostos_transferencias_constitucionais,
        max(valor) filter (where via = 'tabnet' and codigo_indicador = 'despesa_recursos_proprios') as despesa_recursos_proprios,
        max(valor) filter (where via = 'tabnet' and codigo_indicador = 'despesa_total_saude') as despesa_total_saude,
        max(coletado_em) as coletado_em
    from base
    where periodo = periodo_mais_recente
    group by portal_slug, ano, periodo
),

divergencias as (
    select
        *,
        tipo_periodo = 'anual' and (
            coalesce(abs(percentual_aplicado_saude_tabnet - percentual_aplicado_saude_consulta) > 0.01, false)
            or (percentual_aplicado_saude_tabnet is null) <> (percentual_aplicado_saude_consulta is null)
        ) as diverge_percentual_aplicado_saude,
        tipo_periodo = 'anual' and (
            coalesce(abs(percentual_transferencias_saude_tabnet - percentual_transferencias_saude_consulta) > 0.01, false)
            or (percentual_transferencias_saude_tabnet is null) <> (percentual_transferencias_saude_consulta is null)
        ) as diverge_percentual_transferencias_saude,
        tipo_periodo = 'anual' and (
            coalesce(abs(despesa_saude_por_habitante_tabnet - despesa_saude_por_habitante_consulta) > 0.01, false)
            or (despesa_saude_por_habitante_tabnet is null) <> (despesa_saude_por_habitante_consulta is null)
        ) as diverge_despesa_saude_por_habitante
    from indicadores
),

resolvido as (
    select
        *,
        case
            when tipo_periodo = 'bimestral' then 'parcial'
            when percentual_aplicado_saude_tabnet is null then 'sem_dado'
            else 'encerrado'
        end as situacao,
        case
            when tipo_periodo = 'bimestral' then percentual_aplicado_saude_consulta
            else percentual_aplicado_saude_tabnet
        end as percentual_aplicado_saude
    from divergencias
)

select
    r.portal_slug,
    r.ano,
    r.periodo,
    r.situacao,
    r.percentual_aplicado_saude,
    c.valor_num as minimo_aplicacao_saude_percentual,
    case
        when r.situacao = 'encerrado' and not r.diverge_percentual_aplicado_saude
            then r.percentual_aplicado_saude >= c.valor_num
    end as cumpre_minimo,
    r.despesa_saude_por_habitante_consulta as despesa_saude_por_habitante,
    r.percentual_transferencias_saude_consulta as percentual_transferencias_saude,
    r.receita_impostos_transferencias_constitucionais,
    r.despesa_recursos_proprios,
    r.despesa_total_saude,
    (
        r.diverge_percentual_aplicado_saude
        or r.diverge_percentual_transferencias_saude
        or r.diverge_despesa_saude_por_habitante
    ) as divergencia_entre_vias,
    nullif(concat_ws(
        ',',
        case when r.diverge_percentual_aplicado_saude then 'percentual_aplicado_saude' end,
        case when r.diverge_percentual_transferencias_saude then 'percentual_transferencias_saude' end,
        case when r.diverge_despesa_saude_por_habitante then 'despesa_saude_por_habitante' end
    ), '') as indicadores_divergentes,
    r.coletado_em
from resolvido r
left join {{ ref('seed_constantes_fiscais') }} c
    on c.dominio = 'saude'
    and c.chave = 'minimo_aplicacao_saude_percentual'
    and r.ano between c.ano_inicio and c.ano_fim
