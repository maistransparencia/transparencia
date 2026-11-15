{# Converte texto AAAA-MM-DD em date; data impossivel (mes 13, 31/02, 29/02 em ano nao bissexto) vira null em vez de quebrar o cast. #}
{% macro data_iso_valida(expressao) %}
case
    when {{ expressao }} ~ '^[0-9]{4}-(0[13578]|1[02])-(0[1-9]|[12][0-9]|3[01])$'
        or {{ expressao }} ~ '^[0-9]{4}-(0[469]|11)-(0[1-9]|[12][0-9]|30)$'
        or {{ expressao }} ~ '^[0-9]{4}-02-(0[1-9]|1[0-9]|2[0-8])$'
        or (
            {{ expressao }} ~ '^[0-9]{4}-02-29$'
            and (
                left({{ expressao }}, 4)::int % 400 = 0
                or (left({{ expressao }}, 4)::int % 4 = 0 and left({{ expressao }}, 4)::int % 100 <> 0)
            )
        )
    then {{ expressao }}::date
    else null
end
{% endmacro %}
