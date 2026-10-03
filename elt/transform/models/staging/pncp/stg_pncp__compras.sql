-- Staging: compras do PNCP
-- Casts text → numeric/date/integer e padroniza nomes de colunas em snake_case.

with source as (
    select * from {{ source('raw_pncp', 'compras') }}
),

orgaos as (
    select
        portal_slug,
        empresa_id::text as empresa_id,
        regexp_replace(cnpj, '[^0-9]', '', 'g') as cnpj_clean
    from {{ ref('seed_porciuncula_prefeitura_orgaos') }}
    union all
    select
        portal_slug,
        empresa_id::text as empresa_id,
        regexp_replace(cnpj, '[^0-9]', '', 'g') as cnpj_clean
    from {{ ref('seed_natividade_prefeitura_orgaos') }}
),

orgaos_dedup as (
    select distinct on (cnpj_clean)
        portal_slug,
        empresa_id,
        cnpj_clean
    from orgaos
),

renamed as (
    select
        nullif(trim(numero_controle_pncp::text), '') as numero_controle_pncp,
        nullif(trim(cnpj_orgao::text), '') as cnpj_orgao,
        nullif(trim(ano_compra::text), '')::integer as ano_compra,
        nullif(trim(sequencial_compra::text), '')::integer as sequencial_compra,
        nullif(trim(numero_compra::text), '') as numero_compra,
        nullif(trim(processo::text), '') as processo,
        nullif(trim(objeto_compra::text), '') as objeto_compra,
        nullif(trim(link_sistema_origem::text), '') as link_sistema_origem,
        nullif(trim(modalidade_id::text), '')::integer as modalidade_id,
        nullif(trim(modalidade_nome::text), '') as modalidade_nome,
        nullif(trim(situacao_compra_id::text), '')::integer as situacao_compra_id,
        nullif(trim(situacao_compra_nome::text), '') as situacao_compra_nome,
        case
            when nullif(trim(data_publicacao_pncp::text), '') is null then null
            when trim(data_publicacao_pncp::text) ~ '^\d{4}-\d{2}-\d{2}' then left(trim(data_publicacao_pncp::text), 10)::date
            when trim(data_publicacao_pncp::text) ~ '^(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/\d{4}' then to_date(left(trim(data_publicacao_pncp::text), 10), 'DD/MM/YYYY')
            else null
        end as data_publicacao_pncp,
        case
            when nullif(trim(data_abertura_proposta::text), '') is null then null
            when trim(data_abertura_proposta::text) ~ '^\d{4}-\d{2}-\d{2}' then left(trim(data_abertura_proposta::text), 10)::date
            when trim(data_abertura_proposta::text) ~ '^(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/\d{4}' then to_date(left(trim(data_abertura_proposta::text), 10), 'DD/MM/YYYY')
            else null
        end as data_abertura_proposta,
        case
            when trim(valor_total_estimado::text) ~ '^[0-9]+(\.[0-9]+)?$' then trim(valor_total_estimado::text)::numeric(15, 2)
            when replace(replace(trim(valor_total_estimado::text), '.', ''), ',', '.') ~ '^[0-9]+(\.[0-9]+)?$' then replace(replace(trim(valor_total_estimado::text), '.', ''), ',', '.')::numeric(15, 2)
            else null
        end as valor_total_estimado,
        case
            when trim(valor_total_homologado::text) ~ '^[0-9]+(\.[0-9]+)?$' then trim(valor_total_homologado::text)::numeric(15, 2)
            when replace(replace(trim(valor_total_homologado::text), '.', ''), ',', '.') ~ '^[0-9]+(\.[0-9]+)?$' then replace(replace(trim(valor_total_homologado::text), '.', ''), ',', '.')::numeric(15, 2)
            else null
        end as valor_total_homologado,
        nullif(trim(informacao_complementar::text), '') as informacao_complementar,
        nullif(trim(srp::text), '') as srp
    from source
)

select
    r.numero_controle_pncp,
    r.cnpj_orgao,
    coalesce(o.portal_slug, case
        when regexp_replace(coalesce(r.cnpj_orgao, ''), '[^0-9]', '', 'g') = '28920304000196' then 'natividade_prefeitura'
        else 'porciuncula_prefeitura'
    end) as portal_slug,
    coalesce(o.empresa_id, case
        when regexp_replace(coalesce(r.cnpj_orgao, ''), '[^0-9]', '', 'g') = '28920304000196' then '6'
        else '7'
    end) as empresa_id,
    r.ano_compra,
    r.sequencial_compra,
    r.numero_compra,
    r.processo,
    r.objeto_compra,
    r.link_sistema_origem,
    r.modalidade_id,
    r.modalidade_nome,
    r.situacao_compra_id,
    r.situacao_compra_nome,
    r.data_publicacao_pncp,
    r.data_abertura_proposta,
    r.valor_total_estimado,
    r.valor_total_homologado,
    r.informacao_complementar,
    r.srp
from renamed r
left join orgaos_dedup o
    on o.cnpj_clean = regexp_replace(coalesce(r.cnpj_orgao, ''), '[^0-9]', '', 'g')
