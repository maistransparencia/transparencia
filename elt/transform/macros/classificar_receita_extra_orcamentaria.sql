{# Classifica a descricao de uma receita extra-orcamentaria em categoria lowercase snake_case. Pontuacao e removida antes (I.R.R.F. vira irrf); ordem das regras importa; desconhecida cai em outros_descontos. #}
{% macro classificar_receita_extra_orcamentaria(descricao) %}
case
    when {{ target.schema }}.unaccent(lower(regexp_replace(coalesce({{ descricao }}, ''), '[^[:alnum:]]+', '', 'g'))) ~ '(irrf|impostoderenda)' then 'imposto_renda_retido'
    when {{ target.schema }}.unaccent(lower(regexp_replace(coalesce({{ descricao }}, ''), '[^[:alnum:]]+', '', 'g'))) ~ '(inss|rgps|previdenciageral)' then 'previdencia_geral_inss'
    when {{ target.schema }}.unaccent(lower(regexp_replace(coalesce({{ descricao }}, ''), '[^[:alnum:]]+', '', 'g'))) ~ '(issqn|issretido|^iss)' then 'iss_retido'
    when {{ target.schema }}.unaccent(lower(coalesce({{ descricao }}, ''))) ~ 'regulariza' then 'regularizacao_conciliacao'
    when {{ target.schema }}.unaccent(lower(coalesce({{ descricao }}, ''))) ~ '\mpens(ao|oes)\M' then 'pensao_alimenticia'
    when {{ target.schema }}.unaccent(lower(coalesce({{ descricao }}, ''))) ~ '(emprestimo|consignad|financiamento)' then 'emprestimo_consignado'
    when {{ target.schema }}.unaccent(lower(coalesce({{ descricao }}, ''))) ~ '(unimed|plano de saude|assistencia medica|odonto|convenio medico|\mcasp|\msaf\M|orsaf|o\.r\.s\.a\.f)' then 'plano_saude_servidores'
    when {{ target.schema }}.unaccent(lower(coalesce({{ descricao }}, ''))) ~ '(caprem|natprev|previdencia|rpps|iprem|funprev)' then 'previdencia_servidores'
    else 'outros_descontos'
end
{% endmacro %}
