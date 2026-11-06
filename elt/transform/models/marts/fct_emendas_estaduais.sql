-- Fato: emendas estaduais por município integrado, agnóstico de Estado.
-- A lista oficial vem de `raw_emendas_estaduais` (uma fonte por Estado, configurada no extrator); aqui só se vincula
-- o município pelo nome normalizado e pela UF da fonte, sem literal de Estado ou município (Regra 23).
-- Vale a linha do arquivo mais recente de cada emenda (identificador). Município ambíguo ou sem portal não entra.
-- A área (saúde, educação) vem pronta da carga (`area`), pelo mapa de unidade orçamentária e de código de função
-- configurado na fonte; sem regra que a classifique, fica `outras`. Nada de adivinhar pelo texto.
-- Conferência com o cadastro municipal: por ano, número da emenda e autor (normalizado), no mesmo portal; sem
-- cruzamento por texto livre. Execução do Estado: linha do relatório de posição mais recente de cada emenda.

with portais as (
    select
        portal_slug,
        uf,
        cod_ibge,
        {{ target.schema }}.unaccent(upper(trim(cidade_clean))) as municipio_normalizado
    from {{ ref('dim_portais') }}
),

vinculos as (
    select
        d.*,
        p.portal_slug,
        p.cod_ibge,
        count(*) over (partition by d.codigo_fonte, d.nome_arquivo, d.identificador) as portais_candidatos
    from {{ ref('stg_emendas_estaduais__detalhamento') }} d
    join portais p
        on d.uf = p.uf
        and {{ target.schema }}.unaccent(upper(trim(d.municipio))) = p.municipio_normalizado
),

mais_recentes as (
    select
        *,
        row_number() over (
            partition by portal_slug, codigo_fonte, identificador
            order by data_arquivo desc nulls last, nome_arquivo desc
        ) as posicao_arquivo
    from vinculos
    where portais_candidatos = 1
),

-- cadastro municipal agregado antes do cruzamento (uma emenda pode ter mais de uma linha de cadastro)
cadastro_municipal as (
    select
        portal_slug,
        ano,
        regexp_replace(coalesce(numero_emenda, ''), '\D', '', 'g') as numero_digitos,
        {{ target.schema }}.unaccent(upper(trim(autor))) as autor_normalizado,
        sum(valor_total) as valor_cadastro_municipal,
        sum(empenhado) as empenhado_cadastro_municipal
    from {{ ref('fct_emendas') }}
    group by 1, 2, 3, 4
),

execucao_recente as (
    select
        *,
        row_number() over (
            partition by codigo_fonte, identificador
            order by posicao_ano desc, posicao_mes desc, nome_arquivo desc
        ) as posicao_relatorio
    from {{ ref('stg_emendas_estaduais__execucao') }}
),

-- o arquivo mais recente de cada fase (de toda a fonte, não só do portal): emenda que sumiu dele foi retirada ou
-- ainda não entrou; a tela diz só "não consta no arquivo mais recente", nunca "cancelada"
ultimos_arquivos as (
    select
        codigo_fonte,
        ano,
        fase,
        max(data_arquivo) as data_arquivo_mais_recente_fase
    from {{ source('raw_emendas_estaduais', 'arquivos_fonte') }}
    where tipo_arquivo = 'detalhamento'
    group by codigo_fonte, ano, fase
)

select
    t.portal_slug,
    t.cod_ibge,
    t.codigo_fonte as fonte_emenda_estadual,
    t.ano,
    t.numero_emenda,
    coalesce(t.autor, 'nao_informado') as autor,
    t.identificador,
    t.valor as valor_emenda_estadual,
    t.objeto as objeto_emenda,
    t.beneficiario as beneficiario_emenda,
    t.modalidade,
    t.modalidade in ('transferencia_especial', 'finalidade_definida', 'fundo_a_fundo') as dinheiro_chega_prefeitura,
    coalesce(t.area, 'outras') as area_emenda,
    t.funcao as funcao_estadual,
    t.unidade_orcamentaria,
    t.nome_arquivo as nome_arquivo_estado,
    t.data_arquivo as data_arquivo_estado,
    t.fase as fase_arquivo_estado,
    coalesce(t.data_arquivo = u.data_arquivo_mais_recente_fase, false) as consta_no_arquivo_mais_recente,
    u.data_arquivo_mais_recente_fase,
    c.portal_slug is not null as consta_no_cadastro_municipal,
    c.valor_cadastro_municipal,
    c.empenhado_cadastro_municipal,
    x.posicao_ano as posicao_ano_execucao_estado,
    x.posicao_mes as posicao_mes_execucao_estado,
    x.dotacao_inicial as dotacao_inicial_estado,
    x.empenhado as empenhado_estado,
    x.liquidado as liquidado_estado,
    x.pago as pago_estado
from mais_recentes t
left join ultimos_arquivos u
    on t.codigo_fonte = u.codigo_fonte
    and t.ano = u.ano
    and t.fase is not distinct from u.fase
left join cadastro_municipal c
    on t.portal_slug = c.portal_slug
    and t.ano = c.ano
    and regexp_replace(t.numero_emenda, '\D', '', 'g') = c.numero_digitos
    and {{ target.schema }}.unaccent(upper(trim(t.autor))) = c.autor_normalizado
left join execucao_recente x
    on t.codigo_fonte = x.codigo_fonte
    and t.identificador = x.identificador
    and x.posicao_relatorio = 1
where t.posicao_arquivo = 1
