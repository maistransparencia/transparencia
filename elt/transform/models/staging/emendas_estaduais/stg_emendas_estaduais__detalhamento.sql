-- Staging: emendas estaduais por arquivo de detalhamento, de todas as fontes (raw_emendas_estaduais).
-- Valor ausente permanece nulo (nunca zero).

with detalhamento as (
    select * from {{ source('raw_emendas_estaduais', 'emendas_detalhamento') }}
),

arquivos as (
    select * from {{ source('raw_emendas_estaduais', 'arquivos_fonte') }}
)

select
    d.codigo_fonte,
    a.uf,
    a.ano,
    a.data_arquivo,
    a.fase,
    d.nome_arquivo,
    trim(d.identificador) as identificador,
    trim(d.numero_emenda) as numero_emenda,
    nullif(trim(d.autor), '') as autor,
    d.valor::numeric as valor,
    nullif(trim(d.objeto), '') as objeto,
    nullif(trim(d.beneficiario), '') as beneficiario,
    nullif(trim(d.municipio), '') as municipio,
    nullif(trim(d.funcao), '') as funcao,
    nullif(trim(d.unidade_orcamentaria), '') as unidade_orcamentaria,
    d.modalidade,
    d.area
from detalhamento d
join arquivos a
    on d.codigo_fonte = a.codigo_fonte
    and d.nome_arquivo = a.nome_arquivo
