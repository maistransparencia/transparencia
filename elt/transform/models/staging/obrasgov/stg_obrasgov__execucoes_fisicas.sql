with source as (
    select * from {{ source('raw_obrasgov', 'execucoes_fisicas') }}
),

renamed as (
    select
        portal_slug,
        id_projeto_investimento as id_projeto,
        id_execucao_fisica,
        case
            when percentual_execucao_fisica ~ '^-?[0-9]+(\.[0-9]+)?$' then percentual_execucao_fisica::numeric(5, 2)
            else null
        end as percentual_execucao_fisica,
        case
            when left(coalesce(nullif(data_medicao, ''), nullif(dt_atualizacao_execucao, ''), nullif(dt_cadastro_execucao, ''), nullif(dt_final_execucao, '')), 10) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
            then left(coalesce(nullif(data_medicao, ''), nullif(dt_atualizacao_execucao, ''), nullif(dt_cadastro_execucao, ''), nullif(dt_final_execucao, '')), 10)::date
            else null
        end as data_medicao
    from source
)

select * from renamed
