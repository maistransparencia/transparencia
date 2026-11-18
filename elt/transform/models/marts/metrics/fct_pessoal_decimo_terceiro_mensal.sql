{{ config(materialized='view' if var('test_mode', false) else 'table') }}

-- 13º pago por mês de empenho e grupo (ativos / inativos_pensionistas).
-- Mesmo critério de fct_pessoal_folha_metricas.pago_13 (int_pessoal_despesas_marcadas):
-- a soma dos grupos e meses, por portal, ano e empresa, é igual a pago_13.
-- mes_ultimo_registro: último mês com qualquer despesa registrada no portal, ano e empresa
-- (mesmo mês do empenho de int_pessoal_despesas_marcadas: data, ou coluna mes sem data);
-- é o mês até onde o ano corrente pode ser comparado com o anterior, mesmo sem 13º nos meses recentes.
with ultimo_registro as (
    select
        portal_slug,
        ano,
        coalesce(nullif(ltrim(empresa_id, '0'), ''), '0') as empresa_id,
        max(coalesce(
            extract(month from data_empenho)::integer,
            case when mes ~ '^(0?[1-9]|1[0-2])$' then mes::integer end
        )) as mes_ultimo_registro
    from {{ ref('fct_despesas') }}
    group by portal_slug, ano, coalesce(nullif(ltrim(empresa_id, '0'), ''), '0')
),

pago_por_grupo_e_mes as (
    select
        portal_slug,
        ano,
        coalesce(nullif(ltrim(empresa_id, '0'), ''), '0') as empresa_id,
        grupo_beneficiario,
        mes_empenho,
        sum(coalesce(pago, 0)) as pago_13
    from {{ ref('int_pessoal_despesas_marcadas') }}
    where eh_decimo_terceiro
      and grupo_beneficiario is not null
    group by portal_slug, ano, coalesce(nullif(ltrim(empresa_id, '0'), ''), '0'), grupo_beneficiario, mes_empenho
)

select
    {{ dbt_utils.generate_surrogate_key(['p.portal_slug', 'p.ano', 'p.empresa_id', 'p.grupo_beneficiario', 'p.mes_empenho']) }} as pessoal_decimo_terceiro_mensal_id,
    p.portal_slug,
    p.ano,
    p.empresa_id,
    p.grupo_beneficiario,
    p.mes_empenho,
    u.mes_ultimo_registro,
    p.pago_13::numeric(15, 2) as pago_13
from pago_por_grupo_e_mes as p
left join ultimo_registro as u
    on p.portal_slug = u.portal_slug
    and p.ano = u.ano
    and p.empresa_id = u.empresa_id
