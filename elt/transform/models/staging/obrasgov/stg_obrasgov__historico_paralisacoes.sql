with source as (
    select * from {{ source('raw_obrasgov', 'historico_paralisacoes') }}
),

renamed as (
    select
        portal_slug,
        id_projeto_investimento as id_projeto,
        id_historico_situacao_investimento as id_historico,
        descricao_historico_situacao_investimento as descricao_historico,
        case
            when left(data_historico_situacao_investimento, 10) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
            then left(data_historico_situacao_investimento, 10)::date
            else null
        end as data_historico_situacao_investimento,
        nullif(trim(justificativa_cancelada_paralisada), '') as justificativa_cancelada_paralisada,
        possui_tratativas_situacao_investimento,
        fase_tratativas_situacao_investimento
    from source
)

select * from renamed
