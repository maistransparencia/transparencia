{#- Chave surrogate do fornecedor (credor): só os dígitos do CPF/CNPJ, para que "12.345.678/0001-99" e
    "12345678000199" sejam o mesmo fornecedor; sem documento, o próprio nome, para que fornecedores sem
    documento não colapsem numa única chave. Sem documento nem nome não há fornecedor: a chave é nula. -#}
{% macro credor_key(portal_slug='portal_slug', fornecedor_cpf_cnpj='fornecedor_cpf_cnpj', fornecedor_nome='fornecedor_nome') -%}
    {%- set identificador -%}
        coalesce(nullif(regexp_replace(coalesce({{ fornecedor_cpf_cnpj }}, ''), '[^0-9]', '', 'g'), ''), nullif(trim({{ fornecedor_nome }}), ''))
    {%- endset -%}
    case
        when {{ identificador }} is null then null
        else {{ dbt_utils.generate_surrogate_key([portal_slug, identificador]) }}
    end
{%- endmacro %}
