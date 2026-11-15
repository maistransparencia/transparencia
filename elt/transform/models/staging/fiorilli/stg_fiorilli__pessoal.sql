-- Staging: pessoal
-- Casts text → numeric e padroniza nomes de colunas.
-- proventos: formato BR com ponto de milhar e vírgula decimal → remove ponto, depois substitui vírgula
-- mes: derivado a partir de referencia_nome ("Folha Mensal - <Mes>") ou fallback para o campo mes

with source as (
    select * from {{ source('raw_fiorilli', 'pessoal') }}
),

renamed as (
    select
        source.portal_slug,
        ano::int as ano,
        case
            when lower(coalesce(referencia_nome, '')) like '%janeiro%' then 1
            when lower(coalesce(referencia_nome, '')) like '%fevereiro%' then 2
            when lower(coalesce(referencia_nome, '')) like '%marco%' or lower(coalesce(referencia_nome, '')) like '%março%' then 3
            when lower(coalesce(referencia_nome, '')) like '%abril%' then 4
            when lower(coalesce(referencia_nome, '')) like '%maio%' then 5
            when lower(coalesce(referencia_nome, '')) like '%junho%' then 6
            when lower(coalesce(referencia_nome, '')) like '%julho%' then 7
            when lower(coalesce(referencia_nome, '')) like '%agosto%' then 8
            when lower(coalesce(referencia_nome, '')) like '%setembro%' then 9
            when lower(coalesce(referencia_nome, '')) like '%outubro%' then 10
            when lower(coalesce(referencia_nome, '')) like '%novembro%' then 11
            when lower(coalesce(referencia_nome, '')) like '%dezembro%' then 12
            else coalesce(nullif(trim(mes), '')::integer, 1)
        end::integer as mes,
        coalesce(mapeamento.empresa_id, coalesce(nullif(ltrim(source.empresa, '0'), ''), '0')) as empresa_id,
        nullif(replace(replace(proventos, '.', ''), ',', '.'), '')::numeric(15, 2) as proventos,
        nullif(trim(categoriafuncional), '') as categoria_funcional,
        nullif(trim(vinculo), '') as vinculo,
        nullif(trim(cargo), '') as cargo,
        nullif(trim(formaprovimento), '') as forma_provimento,
        nullif(trim(matricula), '') as matricula,
        nullif(trim(tiporegime), '') as tipo_regime_raw,
        nullif(trim(tipocontrato), '') as tipo_contrato_raw,
        nullif(trim(situacaofuncional), '') as situacao_funcional_raw
    from source
    left join {{ ref('seed_fiorilli_pessoal_empresa') }} as mapeamento
        on source.portal_slug = mapeamento.portal_slug
        and coalesce(nullif(ltrim(source.empresa, '0'), ''), '0') = mapeamento.empresa_origem
),

max_mes_por_ano as (
    select
        portal_slug,
        ano,
        empresa_id,
        max(mes) as max_mes
    from renamed
    group by portal_slug, ano, empresa_id
),

filtrado as (
    select
        r.portal_slug,
        r.ano,
        r.mes,
        r.empresa_id,
        r.proventos,
        r.categoria_funcional,
        r.vinculo,
        r.cargo,
        r.forma_provimento,
        r.matricula,
        r.tipo_regime_raw,
        r.tipo_contrato_raw,
        r.situacao_funcional_raw
    from renamed r
    inner join max_mes_por_ano m
        on r.portal_slug = m.portal_slug
        and r.ano = m.ano
        and r.empresa_id = m.empresa_id
        and r.mes = m.max_mes
)

select
    portal_slug,
    ano,
    mes,
    empresa_id,
    proventos,
    categoria_funcional,
    vinculo,
    cargo,
    forma_provimento,
    matricula,
    tipo_regime_raw,
    tipo_contrato_raw,
    situacao_funcional_raw
from filtrado
