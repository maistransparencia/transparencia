{#- Chave surrogate do fornecedor (credor): CPF/CNPJ quando existe; sem documento, o próprio nome,
    para que fornecedores sem documento não colapsem numa única chave -#}
{% macro credor_key(portal_slug='portal_slug', fornecedor_cpf_cnpj='fornecedor_cpf_cnpj', fornecedor_nome='fornecedor_nome') -%}
    {{ dbt_utils.generate_surrogate_key([portal_slug, "coalesce(nullif(trim(" ~ fornecedor_cpf_cnpj ~ "), ''), " ~ fornecedor_nome ~ ")"]) }}
{%- endmacro %}
