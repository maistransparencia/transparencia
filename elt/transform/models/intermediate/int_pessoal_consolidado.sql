{{ config(
    pre_hook="create extension if not exists unaccent;"
) }}

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
            when lower(unaccent(coalesce(forma_provimento, ''))) = 'eleicao/indicacao'
                or lower(unaccent(coalesce(vinculo, ''))) like '%agente politico%'
                then 'agente_politico'
            when lower(unaccent(coalesce(categoria_funcional, ''))) like '%aposentad%'
                or lower(unaccent(coalesce(categoria_funcional, ''))) like '%pensionist%'
                or lower(unaccent(coalesce(categoria_funcional, ''))) like '%inativ%'
                or lower(unaccent(coalesce(vinculo, ''))) like '%aposentad%'
                or lower(unaccent(coalesce(vinculo, ''))) like '%pensionist%'
                or lower(unaccent(coalesce(vinculo, ''))) like '%inativ%'
                or lower(unaccent(coalesce(cargo, ''))) like '%aposentad%'
                or lower(unaccent(coalesce(cargo, ''))) like '%pensionist%'
                or lower(unaccent(coalesce(cargo, ''))) like '%inativ%'
                or lower(unaccent(coalesce(tipo_contrato_raw, ''))) like '%aposentad%'
                or lower(unaccent(coalesce(tipo_contrato_raw, ''))) like '%pensionist%'
                or lower(unaccent(coalesce(tipo_contrato_raw, ''))) like '%inativ%'
                then 'rpps_inativos'
            when situacao_funcional_raw = '1'
                or lower(unaccent(coalesce(tipo_contrato_raw, ''))) = 'efetivo em comissao'
                or lower(unaccent(coalesce(vinculo, ''))) like '%fg%'
                or lower(unaccent(coalesce(vinculo, ''))) like '%cc%'
                or lower(unaccent(coalesce(categoria_funcional, ''))) = 'efetivos ocupantes de cargo comissionado'
                then 'efetivo_comissao'
            when situacao_funcional_raw = '2'
                or lower(unaccent(coalesce(tipo_contrato_raw, ''))) = 'funcao de confianca'
                or lower(unaccent(coalesce(categoria_funcional, ''))) = 'cargo comissionado extra-quadro'
                or lower(unaccent(coalesce(vinculo, ''))) = 'comissionado inss'
                or lower(unaccent(coalesce(vinculo, ''))) like 'cargo comissionado%'
                then 'comissionado'
            when situacao_funcional_raw = '3'
                or lower(unaccent(coalesce(tipo_contrato_raw, ''))) like '%temporario%'
                or lower(unaccent(coalesce(categoria_funcional, ''))) like '%contratado%'
                or lower(unaccent(coalesce(categoria_funcional, ''))) like '%temporar%'
                or lower(unaccent(coalesce(vinculo, ''))) like '%temporar%'
                then 'contrato_temporario'
            when situacao_funcional_raw = '0'
                or lower(unaccent(coalesce(tipo_contrato_raw, ''))) = 'efetivo'
                or lower(unaccent(coalesce(categoria_funcional, ''))) = 'efetivo'
                or lower(unaccent(coalesce(vinculo, ''))) = 'efetivo'
                then 'efetivo_concurso'
            else 'outros'
        end as categoria_regime,
        case
            when lower(unaccent(coalesce(tipo_regime_raw, ''))) like '%proprio%'
                or lower(unaccent(coalesce(tipo_regime_raw, ''))) like '%rpps%'
                or lower(unaccent(coalesce(tipo_regime_raw, ''))) like '%caprem%'
                or lower(unaccent(coalesce(vinculo, ''))) like '%caprem%'
                or lower(unaccent(coalesce(vinculo, ''))) like '%rpps%'
                then 'rpps'
            when lower(unaccent(coalesce(tipo_regime_raw, ''))) like '%geral%'
                or lower(unaccent(coalesce(tipo_regime_raw, ''))) like '%rgps%'
                or lower(unaccent(coalesce(vinculo, ''))) like '%inss%'
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
