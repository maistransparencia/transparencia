with source as (
    select * from {{ source('porciuncula_prefeitura', 'siconfi_msc_patrimonial') }}
),

filtered_and_cast as (
    select
        ano::int as ano,
        mes_referencia::int as mes_referencia,
        cod_ibge::int as cod_ibge,
        tipo_matriz,
        classe_conta::int as classe_conta,
        conta_contabil,
        trim(poder_orgao) as poder_orgao,
        financeiro_permanente::int as financeiro_permanente,
        ano_fonte_recursos::int as ano_fonte_recursos,
        fonte_recursos,
        valor::numeric as valor_original,
        natureza_conta,
        tipo_valor,
        case
            when upper(natureza_conta) = 'C' then -valor::numeric
            else valor::numeric
        end as saldo_valor,
        data_referencia,
        data_extracao
    from source
    where classe_conta::int = 1 -- somente contas patrimoniais
        and (conta_contabil like '111%' or ((conta_contabil like '114%' or conta_contabil like '1213%') and trim(poder_orgao) = '10132'))
        and (financeiro_permanente::int = 1 or ((conta_contabil like '114%' or conta_contabil like '1213%') and trim(poder_orgao) = '10132')) -- contas financeiras em geral e totalidade dos investimentos do RPPS
        and tipo_valor = 'ending_balance' -- somente o saldo final do mês
        and trim(poder_orgao) != '20231' -- camara municipal esta fora do escopo
)

select * from filtered_and_cast
