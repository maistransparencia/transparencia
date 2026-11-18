{{ config(materialized='view') }}

-- Despesas de pessoal marcadas como 13º salário, com grupo e mês do empenho.
-- Critério único do 13º: fct_pessoal_folha_metricas e
-- fct_pessoal_decimo_terceiro_mensal leem daqui. View: não duplica o volume de fct_despesas.
select
    *,
    -- 13º pago ao servidor (ativos, aposentados e pensionistas): obrigações patronais
    -- (elemento 13), multa e juros não são 13º, e "Nº 213" não casa com "13º".
    (
        elemento != '13'
        and tipo_empenho != 'AN'
        and {{ target.schema }}.unaccent(lower(descricao)) !~ 'anula'
        and {{ target.schema }}.unaccent(lower(descricao)) ~ '(^|[^0-9])13 *(º|°|o([^a-z]|$)|sal)|decimo terceiro'
    ) as eh_decimo_terceiro,
    -- grupo pelo elemento de despesa, nunca pelo texto da descrição
    case
        when elemento in ('01', '03') then 'inativos_pensionistas'
        when elemento in ('04', '11', '16', '96') then 'ativos'
    end as grupo_beneficiario,
    -- mês da data do empenho; sem data, cai para a coluna mes (texto '01'..'12')
    coalesce(
        extract(month from data_empenho)::integer,
        case when mes ~ '^(0?[1-9]|1[0-2])$' then mes::integer end
    ) as mes_empenho
from {{ ref('fct_despesas') }}
where elemento in ('01', '03', '04', '11', '13', '16', '96')
