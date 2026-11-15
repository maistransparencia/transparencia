-- Staging: RGF Anexo 01 (despesa com pessoal) do SICONFI.
-- Fonte única de todos os portais (raw_siconfi, portal_slug na chave).

with source as (
    select * from {{ source('raw_siconfi', 'siconfi_rgf') }}
)

select
    portal_slug,
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
