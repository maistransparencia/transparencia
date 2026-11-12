with source as (
    select * from {{ source('porciuncula_prefeitura', 'siconfi_rgf') }}
)

select
    ano::int as ano,
    cod_ibge::int as cod_ibge,
    case upper(trim(periodicidade))
        when 'Q' then 'quadrimestral'
        when 'S' then 'semestral'
    end as periodicidade,
    periodo::int as periodo,
    cod_conta,
    trim(coluna) as coluna,
    valor::numeric as valor,
    data_extracao
from source
where trim(anexo) = 'RGF-Anexo 01'
    and upper(trim(periodicidade)) in ('Q', 'S')
    and cod_conta in ('DespesaComPessoalTotal', 'ReceitaCorrenteLiquidaAjustada')
    and trim(coluna) in ('Valor', '% sobre a RCL Ajustada')
    and cod_ibge::int = 3304102
