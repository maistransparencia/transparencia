{{ config(pre_hook="create extension if not exists unaccent;") }}

with stg as (
    select * from {{ ref('stg_siconfi_msc_patrimonial') }}
),

fontes as (
    select * from {{ ref('seed_fontes_recursos_stn') }}
),

vinculos as (
    select * from {{ ref('seed_porciuncula_prefeitura_siconfi_orgaos') }}
),

stg_com_fonte as (
    select
        s.*,
        coalesce(
            f.grupo_destinacao,
            case
                when s.fonte_recursos in ('1500', '2500', '10010000', '10900000', '1502') then 'livre'
                when s.fonte_recursos in ('1501', '2501', '12110000') or s.fonte_recursos like '16%' then 'saude'
                when s.fonte_recursos like '154%' or s.fonte_recursos like '155%' or s.fonte_recursos like '11%' then 'educacao'
                when s.fonte_recursos like '166%' then 'assistencia_social'
                when s.fonte_recursos in ('1750', '1751', '1755') then 'meio_ambiente'
                when s.fonte_recursos like '18%' or s.fonte_recursos like '28%' or s.fonte_recursos like '98%' then 'previdencia'
                when s.fonte_recursos = 'sem_fonte' then 'sem_fonte'
                else 'outros_vinculados'
            end
        ) as grupo_destinacao,
        coalesce(
            f.recurso_vinculado_flag,
            case
                when s.fonte_recursos in ('1500', '2500', '10010000', '10900000', '1502') then false
                when s.fonte_recursos = 'sem_fonte' then false
                else true
            end
        ) as recurso_vinculado_flag
    from stg s
    left join fontes f
      on f.codigo_fonte = s.fonte_recursos
),

agregado_siconfi as (
    select
        case
            when cod_ibge = 3304102 then 'porciuncula_prefeitura'
            else 'porciuncula_prefeitura'
        end as portal_slug,
        cod_ibge,
        ano,
        mes_referencia,
        poder_orgao,
        grupo_destinacao,
        max(data_referencia) as data_referencia,
        coalesce(sum(saldo_valor), 0)::numeric(18, 2) as saldo_caixa_bancos,
        coalesce(sum(case when not recurso_vinculado_flag then saldo_valor else 0 end), 0)::numeric(18, 2) as saldo_recursos_livres,
        coalesce(sum(case when recurso_vinculado_flag then saldo_valor else 0 end), 0)::numeric(18, 2) as saldo_recursos_vinculados
    from stg_com_fonte
    group by
        cod_ibge,
        ano,
        mes_referencia,
        poder_orgao,
        grupo_destinacao
),

orgaos as (
    select
        orgao_id,
        portal_slug,
        empresa_id,
        orgao_nome,
        cnpj
    from {{ ref('dim_orgao') }}
),

associado as (
    select
        {{ dbt_utils.generate_surrogate_key(['a.portal_slug', 'a.cod_ibge', 'a.ano', 'a.mes_referencia', 'a.poder_orgao', 'a.grupo_destinacao']) }} as saldo_caixa_id,
        a.portal_slug,
        a.cod_ibge,
        a.ano,
        a.mes_referencia,
        a.poder_orgao,
        a.grupo_destinacao,
        v.empresa_id,
        o.orgao_id,
        o.orgao_nome,
        case
            when o.orgao_nome is not null then o.orgao_nome
            when a.poder_orgao = '10132' then 'Instituto de Previdência dos Servidores (CAPREM)'
            else initcap(replace(a.grupo_destinacao, '_', ' '))
        end as entidade_nome,
        o.cnpj,
        a.data_referencia,
        a.saldo_caixa_bancos,
        a.saldo_recursos_livres,
        a.saldo_recursos_vinculados,
        case
            when a.mes_referencia = max(a.mes_referencia) over (partition by a.portal_slug, a.cod_ibge, a.ano) then true
            else false
        end as ultima_competencia_flag
    from agregado_siconfi a
    left join vinculos v
      on v.portal_slug = a.portal_slug
     and v.poder_orgao = a.poder_orgao
     and v.grupo_destinacao = a.grupo_destinacao
    left join orgaos o
      on o.portal_slug = v.portal_slug
     and o.empresa_id = v.empresa_id
)

select * from associado
