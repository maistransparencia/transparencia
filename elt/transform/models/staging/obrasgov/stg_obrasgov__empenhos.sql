with source as (
    select * from {{ source('raw_obrasgov', 'empenhos') }}
),

renamed as (
    select
        portal_slug,
        id_projeto_investimento as id_projeto,
        nr_empenho,
        ug_emitente,
        case
            when nr_empenho ~ '^[0-9]{4}' then substring(nr_empenho from 1 for 4)::integer
            when left(data_emissao, 4) ~ '^[0-9]{4}$' then left(data_emissao, 4)::integer
            else null
        end as ano_empenho,
        case
            when replace(trim(valor_empenho), ',', '.') ~ '^-?[0-9]+(\.[0-9]+)?$'
            then replace(trim(valor_empenho), ',', '.')::numeric(14, 2)
            else 0.00
        end as valor_empenho,
        case
            when left(data_emissao, 10) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then left(data_emissao, 10)::date
            else null
        end as data_emissao,
        sistema_origem_empenho,
        natureza_despesa,
        fonte,
        programa_trabalho,
        plano_interno,
        acao_orcamentaria,
        descricao_empenho
    from source
)

select * from renamed
