-- Fato: arquivos oficiais que alimentam a lista de emendas estaduais de cada portal (a UF do portal define a fonte).
-- Serve à tela para mostrar órgão, página oficial, nome e data do arquivo. Portal sem fonte para a sua UF não tem linha.
-- O relatório de execução traz também a posição (ano e mês a que se refere).

with posicao_relatorio as (
    select
        codigo_fonte,
        nome_arquivo,
        max(posicao_ano * 100 + posicao_mes) as posicao_ano_mes
    from {{ ref('stg_emendas_estaduais__execucao') }}
    group by codigo_fonte, nome_arquivo
)

select
    p.portal_slug,
    a.codigo_fonte as fonte_emenda_estadual,
    a.orgao_publicador,
    a.url_pagina as url_pagina_oficial,
    a.url_arquivo,
    a.nome_arquivo as nome_arquivo_estado,
    a.tipo_arquivo,
    a.ano,
    a.data_arquivo as data_arquivo_estado,
    a.fase as fase_arquivo_estado,
    div(r.posicao_ano_mes, 100) as posicao_ano_relatorio,
    mod(r.posicao_ano_mes, 100) as posicao_mes_relatorio,
    a.coletado_em
from {{ source('raw_emendas_estaduais', 'arquivos_fonte') }} a
join {{ ref('dim_portais') }} p
    on a.uf = p.uf
left join posicao_relatorio r
    on a.codigo_fonte = r.codigo_fonte
    and a.nome_arquivo = r.nome_arquivo
