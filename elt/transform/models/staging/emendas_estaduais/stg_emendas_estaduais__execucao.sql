-- Staging: execução (dotação, empenhado, liquidado e pago) das emendas estaduais por relatório, de todas as fontes.
-- Valor ausente permanece nulo (nunca zero). A posição é o mês e o ano a que o relatório se refere.

select
    e.codigo_fonte,
    e.nome_arquivo,
    trim(e.identificador) as identificador,
    e.posicao_ano,
    e.posicao_mes,
    e.dotacao_inicial::numeric as dotacao_inicial,
    e.empenhado::numeric as empenhado,
    e.liquidado::numeric as liquidado,
    e.pago::numeric as pago
from {{ source('raw_emendas_estaduais', 'execucao_emendas') }} e
join {{ source('raw_emendas_estaduais', 'arquivos_fonte') }} a
    on e.codigo_fonte = a.codigo_fonte
    and e.nome_arquivo = a.nome_arquivo
