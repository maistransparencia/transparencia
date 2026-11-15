-- Intermediário: consolida receitas de todos os portais Fiorilli e agrega ao grain correto.
-- Para a maioria dos códigos-folha de receita orçamentária o portal emite uma linha
-- "total" (sem fonte STN) mais linhas de detalhe por fonte STN, cada uma com o valor
-- cheio. Por (portal_slug, tipo_receita, ano, empresa_id, codigo) vence a linha sem
-- fonte STN quando existir e tiver valor; sem ela (ou com total zero), somam-se todas as linhas.

with orcamentaria as (
    select
        portal_slug,
        'orcamentaria' as tipo_receita,
        ano,
        empresa_id,
        codigo,
        descricao,
        previsao_atualizada,
        arrecadado_efetivo,
        fonte_stn
    from {{ ref('stg_fiorilli__receita_orcamentaria') }}
),

uniao as (
    select
        portal_slug,
        'uniao' as tipo_receita,
        ano,
        empresa_id,
        codigo,
        descricao,
        previsao_atualizada,
        arrecadado_efetivo,
        null::text as fonte_stn
    from {{ ref('stg_fiorilli__receita_uniao') }}
),

estado as (
    select
        portal_slug,
        'estado' as tipo_receita,
        ano,
        empresa_id,
        codigo,
        descricao,
        previsao_atualizada,
        arrecadado_efetivo,
        null::text as fonte_stn
    from {{ ref('stg_fiorilli__receita_estado') }}
),

extra_orcamentaria as (
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
    from {{ ref('stg_fiorilli__receita_extra_orcamentaria') }}
),

combined as (
    select * from orcamentaria
    union all
    select * from uniao
    union all
    select * from estado
    union all
    select * from extra_orcamentaria
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
