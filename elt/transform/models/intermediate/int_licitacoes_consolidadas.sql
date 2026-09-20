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
        carona,
        edital_numero,
        processo
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

pncp_mapeamento as (
    select
        portal_slug,
        ano,
        licitacao_numero,
        ano_compra,
        sequencial_compra
    from {{ ref('seed_pncp_licitacoes_mapeamento') }}
),

pncp_dedup as (
    select
        ano_compra,
        sequencial_compra,
        numero_compra,
        processo,
        objeto_compra,
        link_sistema_origem,
        valor_total_estimado,
        valor_total_homologado
    from (
        select
            ano_compra,
            sequencial_compra,
            numero_compra,
            processo,
            objeto_compra,
            link_sistema_origem,
            valor_total_estimado,
            valor_total_homologado,
            row_number() over (
                partition by ano_compra, coalesce(numero_compra, sequencial_compra::text)
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
        coalesce(l.valor, p.valor_total_estimado) as valor_estimado,
        p.valor_total_homologado as valor_homologado,
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
    left join pncp_mapeamento m
        on m.portal_slug = l.portal_slug
       and m.ano = l.ano
       and m.licitacao_numero = l.licitacao_numero
    left join pncp_dedup p
        on (
            m.licitacao_numero is not null
            and p.ano_compra = m.ano_compra
            and p.sequencial_compra = m.sequencial_compra
        )
        or (
            m.licitacao_numero is null
            and p.ano_compra = l.ano
            and (
                p.numero_compra = l.licitacao_numero
                or (l.processo is not null and p.processo = l.processo)
            )
        )
),

pncp_exclusivas as (
    select
        'porciuncula_prefeitura' as portal_slug,
        c.ano_compra as ano,
        '7' as empresa_id,
        coalesce(nullif(c.numero_compra, ''), lpad(c.sequencial_compra::text, 3, '0') || '/' || c.ano_compra::text) as licitacao_numero,
        coalesce(nullif(c.modalidade_nome, ''), 'OUTROS') as modalidade,
        c.objeto_compra as objeto,
        cast(null as text) as discriminacao,
        coalesce(c.valor_total_homologado, c.valor_total_estimado) as valor,
        c.valor_total_estimado as valor_estimado,
        c.valor_total_homologado as valor_homologado,
        coalesce(c.situacao_compra_nome, 'Divulgada no PNCP') as situacao,
        coalesce(c.data_abertura_proposta, c.data_publicacao_pncp) as data_abertura,
        cast(null as text) as carona,
        'pncp' as fonte_objeto,
        c.link_sistema_origem,
        row_number() over (
            partition by c.ano_compra, coalesce(nullif(c.numero_compra, ''), lpad(c.sequencial_compra::text, 3, '0') || '/' || c.ano_compra::text)
            order by c.sequencial_compra asc
        ) as dedupe_rn
    from {{ ref('stg_pncp__compras') }} c
    left join pncp_mapeamento m
        on m.ano_compra = c.ano_compra
       and m.sequencial_compra = c.sequencial_compra
    where m.licitacao_numero is null
      and c.objeto_compra is not null
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
    valor_estimado,
    valor_homologado,
    situacao,
    data_abertura,
    carona,
    fonte_objeto,
    link_sistema_origem
from porciuncula_enriched
where dedupe_rn = 1

union all

select
    portal_slug,
    ano,
    empresa_id,
    licitacao_numero,
    modalidade,
    objeto,
    discriminacao,
    valor,
    valor_estimado,
    valor_homologado,
    situacao,
    data_abertura,
    carona,
    fonte_objeto,
    link_sistema_origem
from pncp_exclusivas
where dedupe_rn = 1
