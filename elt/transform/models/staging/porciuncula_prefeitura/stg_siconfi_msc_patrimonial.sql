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
        poder_orgao,
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
    where classe_conta::int = 1
      and conta_contabil like '111%'
      and financeiro_permanente::int = 1
      and tipo_valor = 'ending_balance'
      and poder_orgao != '20231'
)

select * from filtered_and_cast
