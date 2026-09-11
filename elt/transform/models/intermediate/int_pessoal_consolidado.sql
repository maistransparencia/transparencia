-- Intermediário: consolida pessoal de todos os portais via union all.
-- Para adicionar novo portal: incluir novo CTE + union all abaixo.

with porciuncula as (
    select
        'porciuncula_prefeitura' as portal_slug,
        ano,
        empresa_id,
        proventos,
        categoria_funcional,
        vinculo,
        cargo,
        forma_provimento,
        matricula,
        case
            when {{ target.schema }}.unaccent(lower(coalesce(categoria_funcional, ''))) like '%aposentad%'
                or {{ target.schema }}.unaccent(lower(coalesce(categoria_funcional, ''))) like '%pensionist%'
                or {{ target.schema }}.unaccent(lower(coalesce(categoria_funcional, ''))) like '%inativ%'
                or {{ target.schema }}.unaccent(lower(coalesce(vinculo, ''))) like '%aposentad%'
                or {{ target.schema }}.unaccent(lower(coalesce(vinculo, ''))) like '%pensionist%'
                or {{ target.schema }}.unaccent(lower(coalesce(vinculo, ''))) like '%inativ%'
                or {{ target.schema }}.unaccent(lower(coalesce(cargo, ''))) like '%aposentad%'
                or {{ target.schema }}.unaccent(lower(coalesce(cargo, ''))) like '%pensionist%'
                or {{ target.schema }}.unaccent(lower(coalesce(cargo, ''))) like '%inativ%'
                or {{ target.schema }}.unaccent(lower(coalesce(tipo_contrato_raw, ''))) like '%aposentad%'
                or {{ target.schema }}.unaccent(lower(coalesce(tipo_contrato_raw, ''))) like '%pensionist%'
                or {{ target.schema }}.unaccent(lower(coalesce(tipo_contrato_raw, ''))) like '%inativ%'
                then 'rpps_inativos'
            when {{ target.schema }}.unaccent(lower(coalesce(forma_provimento, ''))) = 'eleicao/indicacao'
                or {{ target.schema }}.unaccent(lower(coalesce(cargo, ''))) like '%prefeito%'
                or ({{ target.schema }}.unaccent(lower(coalesce(cargo, ''))) like '%secretario%' and {{ target.schema }}.unaccent(lower(coalesce(cargo, ''))) not like '%secretario escolar%' and {{ target.schema }}.unaccent(lower(coalesce(cargo, ''))) not like '%subsecretari%')
                or {{ target.schema }}.unaccent(lower(coalesce(cargo, ''))) like '%procurador geral%'
                or {{ target.schema }}.unaccent(lower(coalesce(cargo, ''))) like '%controlador interno%'
                or {{ target.schema }}.unaccent(lower(coalesce(cargo, ''))) like '%conselheiro tutelar%'
                then 'agente_politico'
            when situacao_funcional_raw = '1'
                or situacao_funcional_raw like '1 - %'
                or {{ target.schema }}.unaccent(lower(coalesce(tipo_contrato_raw, ''))) = 'efetivo em comissao'
                or {{ target.schema }}.unaccent(lower(coalesce(tipo_contrato_raw, ''))) = 'funcao de confianca'
                or {{ target.schema }}.unaccent(lower(coalesce(tipo_contrato_raw, ''))) like '%funcao gratificada%'
                or {{ target.schema }}.unaccent(lower(coalesce(vinculo, ''))) like '%fg%'
                or {{ target.schema }}.unaccent(lower(coalesce(categoria_funcional, ''))) = 'efetivos ocupantes de cargo comissionado'
                then 'efetivo_comissao'
            when situacao_funcional_raw = '2'
                or situacao_funcional_raw like '2 - %'
                or {{ target.schema }}.unaccent(lower(coalesce(forma_provimento, ''))) = 'livre provimento'
                or {{ target.schema }}.unaccent(lower(coalesce(categoria_funcional, ''))) = 'cargo comissionado extra-quadro'
                or {{ target.schema }}.unaccent(lower(coalesce(vinculo, ''))) = 'comissionado inss'
                or {{ target.schema }}.unaccent(lower(coalesce(vinculo, ''))) like 'cargo comissionado%'
                or {{ target.schema }}.unaccent(lower(coalesce(tipo_contrato_raw, ''))) = 'cargo comissionado'
                then 'comissionado'
            when situacao_funcional_raw = '3'
                or situacao_funcional_raw like '3 - %'
                or {{ target.schema }}.unaccent(lower(coalesce(forma_provimento, ''))) = 'tempo determinado'
                or {{ target.schema }}.unaccent(lower(coalesce(vinculo, ''))) like '%processo seletivo%'
                or {{ target.schema }}.unaccent(lower(coalesce(tipo_contrato_raw, ''))) like '%temporario%'
                or {{ target.schema }}.unaccent(lower(coalesce(categoria_funcional, ''))) like '%contratado%'
                or {{ target.schema }}.unaccent(lower(coalesce(categoria_funcional, ''))) like '%temporar%'
                or {{ target.schema }}.unaccent(lower(coalesce(categoria_funcional, ''))) like '%excepcional interesse publico%'
                or {{ target.schema }}.unaccent(lower(coalesce(vinculo, ''))) like '%temporar%'
                then 'contrato_temporario'
            when situacao_funcional_raw = '0'
                or situacao_funcional_raw like '0 - %'
                or {{ target.schema }}.unaccent(lower(coalesce(forma_provimento, ''))) = 'concurso publico'
                or {{ target.schema }}.unaccent(lower(coalesce(tipo_contrato_raw, ''))) = 'efetivo'
                or {{ target.schema }}.unaccent(lower(coalesce(categoria_funcional, ''))) = 'efetivo'
                or {{ target.schema }}.unaccent(lower(coalesce(categoria_funcional, ''))) = 'efetivos'
                or {{ target.schema }}.unaccent(lower(coalesce(vinculo, ''))) = 'efetivo'
                then 'efetivo_concurso'
            else 'outros'
        end as categoria_regime,
        case
            when {{ target.schema }}.unaccent(lower(coalesce(tipo_regime_raw, ''))) like '%proprio%'
                or {{ target.schema }}.unaccent(lower(coalesce(tipo_regime_raw, ''))) like '%rpps%'
                or {{ target.schema }}.unaccent(lower(coalesce(tipo_regime_raw, ''))) like '%caprem%'
                or {{ target.schema }}.unaccent(lower(coalesce(vinculo, ''))) like '%caprem%'
                or {{ target.schema }}.unaccent(lower(coalesce(vinculo, ''))) like '%rpps%'
                then 'rpps'
            when {{ target.schema }}.unaccent(lower(coalesce(tipo_regime_raw, ''))) like '%geral%'
                or {{ target.schema }}.unaccent(lower(coalesce(tipo_regime_raw, ''))) like '%rgps%'
                or {{ target.schema }}.unaccent(lower(coalesce(vinculo, ''))) like '%inss%'
                then 'rgps'
            else 'sem_regime'
        end as regime_previdenciario
    from {{ ref('stg_porciuncula_prefeitura__pessoal') }}
)

select
    portal_slug,
    ano,
    empresa_id,
    proventos,
    categoria_funcional,
    vinculo,
    cargo,
    forma_provimento,
    matricula,
    categoria_regime,
    regime_previdenciario
from porciuncula
