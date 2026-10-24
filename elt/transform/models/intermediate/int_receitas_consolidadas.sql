-- Intermediário: consolida receitas de todos os portais e agrega ao grain correto.
-- Para adicionar novo portal: incluir novos CTEs + union all em "combined".
-- Para a maioria dos códigos-folha de receita orçamentária o portal emite uma linha
-- "total" (sem fonte STN) mais linhas de detalhe por fonte STN, cada uma com o valor
-- cheio. Por (portal_slug, tipo_receita, ano, empresa_id, codigo) vence a linha sem
-- fonte STN quando existir e tiver valor; sem ela (ou com total zero), somam-se todas as linhas.

with porciuncula_orcamentaria as (
    select
        'porciuncula_prefeitura' as portal_slug,
        'orcamentaria' as tipo_receita,
        ano,
        empresa_id,
        codigo,
        descricao,
        previsao_atualizada,
        arrecadado_efetivo,
        fonte_stn
    from {{ ref('stg_porciuncula_prefeitura__receita_orcamentaria') }}
),

porciuncula_uniao as (
    select
        'porciuncula_prefeitura' as portal_slug,
        'uniao' as tipo_receita,
        ano,
        empresa_id,
        codigo,
        descricao,
        previsao_atualizada,
        arrecadado_efetivo,
        null::text as fonte_stn
    from {{ ref('stg_porciuncula_prefeitura__receita_uniao') }}
),

porciuncula_estado as (
    select
        'porciuncula_prefeitura' as portal_slug,
        'estado' as tipo_receita,
        ano,
        empresa_id,
        codigo,
        descricao,
        previsao_atualizada,
        arrecadado_efetivo,
        null::text as fonte_stn
    from {{ ref('stg_porciuncula_prefeitura__receita_estado') }}
),

porciuncula_extra_orcamentaria as (
    select
        portal_slug,
        'extra_orcamentaria' as tipo_receita,
        ano,
        empresa_id,
        codigo,
        descricao,
        0.00 as previsao_atualizada,
        coalesce(valor_arrecadado, 0.00) as arrecadado_efetivo,
        null::text as fonte_stn
    from {{ ref('stg_porciuncula_prefeitura__receita_extra_orcamentaria') }}
),

natividade_orcamentaria as (
    select
        'natividade_prefeitura' as portal_slug,
        'orcamentaria' as tipo_receita,
        ano,
        empresa_id,
        codigo,
        descricao,
        previsao_atualizada,
        arrecadado_efetivo,
        fonte_stn
    from {{ ref('stg_natividade_prefeitura__receita_orcamentaria') }}
),

natividade_uniao as (
    select
        'natividade_prefeitura' as portal_slug,
        'uniao' as tipo_receita,
        ano,
        empresa_id,
        codigo,
        descricao,
        previsao_atualizada,
        arrecadado_efetivo,
        null::text as fonte_stn
    from {{ ref('stg_natividade_prefeitura__receita_uniao') }}
),

natividade_estado as (
    select
        'natividade_prefeitura' as portal_slug,
        'estado' as tipo_receita,
        ano,
        empresa_id,
        codigo,
        descricao,
        previsao_atualizada,
        arrecadado_efetivo,
        null::text as fonte_stn
    from {{ ref('stg_natividade_prefeitura__receita_estado') }}
),

natividade_extra_orcamentaria as (
    select
        portal_slug,
        'extra_orcamentaria' as tipo_receita,
        ano,
        empresa_id,
        codigo,
        descricao,
        0.00 as previsao_atualizada,
        coalesce(valor_arrecadado, 0.00) as arrecadado_efetivo,
        null::text as fonte_stn
    from {{ ref('stg_natividade_prefeitura__receita_extra_orcamentaria') }}
),

combined as (
    select * from porciuncula_orcamentaria
    union all
    select * from porciuncula_uniao
    union all
    select * from porciuncula_estado
    union all
    select * from porciuncula_extra_orcamentaria
    union all
    select * from natividade_orcamentaria
    union all
    select * from natividade_uniao
    union all
    select * from natividade_estado
    union all
    select * from natividade_extra_orcamentaria
),

com_total as (
    select
        *,
        bool_or(fonte_stn is null and coalesce(arrecadado_efetivo, 0) <> 0) over (
            partition by portal_slug, tipo_receita, ano, empresa_id, codigo
        ) as possui_linha_total
    from combined
),

com_fonte as (
    select
        *,
        nullif(regexp_replace(split_part(fonte_stn, ' ', 1), '[^0-9]', '', 'g'), '') as codigo_fonte_stn_linha
    from com_total
),

com_fonte_unica as (
    select
        *,
        case
            when min(codigo_fonte_stn_linha) over codigo_receita = max(codigo_fonte_stn_linha) over codigo_receita
                then min(codigo_fonte_stn_linha) over codigo_receita
        end as codigo_fonte_stn
    from com_fonte
    window codigo_receita as (partition by portal_slug, tipo_receita, ano, empresa_id, codigo)
)

select
    portal_slug,
    tipo_receita,
    ano,
    empresa_id,
    codigo,
    max(descricao) as descricao,
    max(codigo_fonte_stn) as codigo_fonte_stn,
    sum(previsao_atualizada) as previsao_atualizada,
    sum(arrecadado_efetivo) as arrecadado_efetivo
from com_fonte_unica
where not possui_linha_total or (fonte_stn is null and coalesce(arrecadado_efetivo, 0) <> 0)
group by portal_slug, tipo_receita, ano, empresa_id, codigo
