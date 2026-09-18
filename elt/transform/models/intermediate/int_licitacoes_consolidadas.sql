-- Intermediário: consolida licitacoes de todos os portais via union all.
-- Enriquecimento hierárquico de objetos: PNCP (1ª) -> Contrato local (2ª) -> TCE-RJ (3ª) -> Municipal (4ª).
-- Para adicionar novo portal: incluir novo CTE + union all abaixo.

with porciuncula_base as (
    select
        'porciuncula_prefeitura' as portal_slug,
        ano,
        empresa_id,
        licitacao_numero,
        modalidade,
        objeto,
        discriminacao,
        valor,
        situacao,
        data_abertura,
        carona
    from {{ ref('stg_porciuncula_prefeitura__licitacoes') }}
),

contratos_dedup as (
    select
        ano,
        empresa_id,
        licitacao_numero,
        objeto_completo,
        objeto
    from (
        select
            ano,
            empresa_id,
            licitacao_numero,
            objeto_completo,
            objeto,
            row_number() over (
                partition by ano, empresa_id, licitacao_numero
                order by length(coalesce(objeto_completo, objeto, '')) desc, contrato_numero asc
            ) as rn
        from {{ ref('stg_porciuncula_prefeitura__contratos') }}
        where licitacao_numero is not null
          and coalesce(objeto_completo, objeto) is not null
    ) sub
    where rn = 1
),

pncp_dedup as (
    select
        ano_compra,
        numero_compra,
        processo,
        objeto_compra,
        link_sistema_origem
    from (
        select
            ano_compra,
            numero_compra,
            processo,
            objeto_compra,
            link_sistema_origem,
            row_number() over (
                partition by ano_compra, coalesce(nullif(numero_compra, ''), processo)
                order by length(coalesce(objeto_compra, '')) desc
            ) as rn
        from {{ ref('stg_pncp__compras') }}
        where objeto_compra is not null
    ) sub
    where rn = 1
),

porciuncula_enriched as (
    select
        l.portal_slug,
        l.ano,
        l.empresa_id,
        l.licitacao_numero,
        l.modalidade,
        case
            when p.objeto_compra is not null then p.objeto_compra
            when c.objeto_completo is not null then c.objeto_completo
            when c.objeto is not null and length(c.objeto) > coalesce(length(l.objeto), 0) then c.objeto
            else l.objeto
        end as objeto,
        l.discriminacao,
        l.valor,
        l.situacao,
        l.data_abertura,
        l.carona,
        case
            when p.objeto_compra is not null then 'pncp'
            when c.objeto_completo is not null then 'contrato_local'
            when c.objeto is not null and length(c.objeto) > coalesce(length(l.objeto), 0) then 'contrato_local'
            else 'municipal'
        end as fonte_objeto,
        p.link_sistema_origem as link_sistema_origem,
        row_number() over (
            partition by l.portal_slug, l.ano, l.empresa_id, l.licitacao_numero
            order by
                case
                    when p.objeto_compra is not null then 1
                    when c.objeto_completo is not null then 2
                    when c.objeto is not null then 3
                    else 4
                end asc,
                length(coalesce(p.objeto_compra, c.objeto_completo, c.objeto, l.objeto, '')) desc
        ) as dedupe_rn
    from porciuncula_base l
    left join contratos_dedup c
        on c.ano = l.ano
       and c.empresa_id = l.empresa_id
       and (
           c.licitacao_numero = l.licitacao_numero
           or (
               l.licitacao_numero is not null
               and c.licitacao_numero is not null
               and split_part(c.licitacao_numero, '/', 1) = split_part(l.licitacao_numero, '/', 1)
           )
       )
    left join pncp_dedup p
        on p.ano_compra = l.ano
       and (
           p.numero_compra = l.licitacao_numero
           or p.processo = l.licitacao_numero
           or (
               l.licitacao_numero is not null
               and p.numero_compra is not null
               and split_part(p.numero_compra, '/', 1) = split_part(l.licitacao_numero, '/', 1)
           )
       )
)

select
    portal_slug,
    ano,
    empresa_id,
    licitacao_numero,
    modalidade,
    objeto,
    discriminacao,
    valor,
    situacao,
    data_abertura,
    carona,
    fonte_objeto,
    link_sistema_origem
from porciuncula_enriched
where dedupe_rn = 1
