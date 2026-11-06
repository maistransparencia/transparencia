-- Comparação, por portal e ano, do que o Estado informa ter pago de emendas que chegam à Prefeitura com o que a
-- Prefeitura registra como arrecadado em "outras transferências dos Estados" (natureza de receita 1.7.2.9, corrente, e
-- 2.4.2.9, capital; códigos nacionais do plano de contas, não de município).
-- Regras contábeis:
-- - Um só nível da receita: a linha da alínea (prefixo + zeros). Subalíneas já estão somadas na alínea; somar as duas
--   dobraria o valor. Entidade sem linha única de alínea deixa a hierarquia não clara e a comparação não é feita.
-- - `tipo_receita = 'orcamentaria'` apenas: `estado` repete as mesmas linhas por origem do dado.
-- - Só o estágio pago do Estado (caixa) é comparado, com a arrecadação (caixa). Empenhado e liquidado do Estado não têm
--   par na receita da Prefeitura e não entram na comparação.
-- - Pago ausente fica nulo (não identificado), nunca zero: `emendas_sem_pago_informado` conta as ausentes.
-- - Só a transferência especial entra: ela é registrada em "outras transferências dos Estados". Fundo a fundo e
--   finalidade definida costumam cair em outras alíneas (saúde, educação, convênios), e compará-las com esta daria
--   falso "pago acima do registrado". Ampliar só com parecer contábil.
-- - Competência: a comparação só vale quando a posição do relatório do Estado é do mesmo ano da receita; o relatório
--   não separa restos a pagar, então fica como limite declarado na tela.

with alineas as (
    select
        portal_slug,
        ano,
        empresa_id,
        left(regexp_replace(codigo, '\D', '', 'g'), 4) as prefixo_alinea,
        count(*) as linhas_alinea,
        sum(arrecadado) as arrecadado
    from {{ ref('fct_receitas') }}
    where tipo_receita = 'orcamentaria'
        and regexp_replace(codigo, '\D', '', 'g') ~ '^(1729|2429)0+$'
    group by 1, 2, 3, 4
),

receita_prefeitura as (
    select
        portal_slug,
        ano,
        sum(arrecadado) filter (where prefixo_alinea = '1729') as arrecadado_outras_transferencias_corrente,
        sum(arrecadado) filter (where prefixo_alinea = '2429') as arrecadado_outras_transferencias_capital,
        sum(arrecadado) as arrecadado_outras_transferencias,
        bool_and(linhas_alinea = 1) as hierarquia_clara
    from alineas
    group by 1, 2
),

pago_estado as (
    select
        portal_slug,
        ano,
        count(*) as emendas_chegam_prefeitura,
        count(*) filter (where pago_estado is null) as emendas_sem_pago_informado,
        sum(pago_estado) as pago_estado_informado,
        max(posicao_ano_execucao_estado * 100 + posicao_mes_execucao_estado) as posicao_execucao_estado
    from {{ ref('fct_emendas_estaduais') }}
    where modalidade = 'transferencia_especial'
        and consta_no_arquivo_mais_recente
    group by 1, 2
)

select
    p.portal_slug,
    p.ano,
    p.emendas_chegam_prefeitura,
    p.emendas_sem_pago_informado,
    p.pago_estado_informado,
    p.posicao_execucao_estado / 100 as posicao_ano_execucao_estado,
    p.posicao_execucao_estado % 100 as posicao_mes_execucao_estado,
    r.arrecadado_outras_transferencias_corrente,
    r.arrecadado_outras_transferencias_capital,
    r.arrecadado_outras_transferencias,
    coalesce(r.hierarquia_clara, false) as hierarquia_clara
from pago_estado p
left join receita_prefeitura r
    on p.portal_slug = r.portal_slug
    and p.ano = r.ano
