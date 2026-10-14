with source as (
    select * from {{ source('raw_obrasgov', 'projetos') }}
),

renamed as (
    select
        portal_slug,
        id_projeto_investimento as id_projeto,
        desc_nome as nome_obra,
        desc_funcao_social as funcao_social,
        desc_projeto as descricao_intervencao,
        natureza_intervencao,
        especie_intervencao,
        case
            when executores_json is not null and executores_json ~ '^\s*\['
            then nullif(trim(executores_json::json -> 0 ->> 'organizacao_executor'), '')
            else null
        end as executor_nome,
        case
            when executores_json is not null and executores_json ~ '^\s*\['
            then nullif(trim(executores_json::json -> 0 ->> 'cnpj_executor'), '')
            else null
        end as executor_cnpj,
        case
            when repassadores_json is not null and repassadores_json ~ '^\s*\['
            then nullif(trim(repassadores_json::json -> 0 ->> 'organizacao_repassador'), '')
            else null
        end as repassador_nome,
        case
            when repassadores_json is not null and repassadores_json ~ '^\s*\['
            then nullif(trim(repassadores_json::json -> 0 ->> 'cnpj_repassador'), '')
            else null
        end as repassador_cnpj,
        case
            when situacao is null then null
            when lower(unaccent(situacao)) like '%execucao%' then 'em_execucao'
            when lower(unaccent(situacao)) like '%paralisad%' then 'paralisada'
            when lower(unaccent(situacao)) like '%concluid%' then 'concluida'
            when lower(unaccent(situacao)) like '%cancelad%' then 'cancelada'
            when lower(unaccent(situacao)) like '%cadastrad%' then 'cadastrada'
            else lower(regexp_replace(unaccent(trim(situacao)), '[^a-zA-Z0-9]+', '_', 'g'))
        end as situacao,
        organizacao_resp as orgao_responsavel,
        nullif(regexp_replace(valor_investimento_previsto, '[^0-9.-]', '', 'g'), '')::numeric(15, 2) as valor_investimento_previsto,
        case
            when left(dt_inicial_prevista, 10) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then left(dt_inicial_prevista, 10)::date
            else null
        end as data_inicio_prevista,
        case
            when left(dt_final_prevista, 10) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then left(dt_final_prevista, 10)::date
            else null
        end as data_fim_prevista
    from source
)

select * from renamed
