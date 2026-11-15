with casos as (
    select * from (values
        ('CAPREM', 'previdencia_servidores'),
        ('NATPREV FUNDEB', 'previdencia_servidores'),
        ('I.R.R.F. SOBRE RENDIMENTO DO TRABALHO-FUNDEB', 'imposto_renda_retido'),
        ('IRRF Servidores', 'imposto_renda_retido'),
        ('(6790) I.N.S.S.', 'previdencia_geral_inss'),
        ('CONTRIBUIÇÃO AO RGPS', 'previdencia_geral_inss'),
        ('EMPRÉSTIMO CEF', 'emprestimo_consignado'),
        ('EMPRESTIMO BANCO DO BRASIL', 'emprestimo_consignado'),
        ('UNIMED-FUNDEB', 'plano_saude_servidores'),
        ('CASP', 'plano_saude_servidores'),
        ('ISSQN', 'iss_retido'),
        ('ISS - Retenções', 'iss_retido'),
        ('PENSAO ALIMENTICIA', 'pensao_alimenticia'),
        ('Pensão Alimentícia', 'pensao_alimenticia'),
        ('COMPENSAÇÃO DE DÉBITOS', 'outros_descontos'),
        ('REGULARIZAÇÃO IRRF', 'imposto_renda_retido'),
        ('REGULARIZAÇÃO DE VALOR CONCILIADO', 'regularizacao_conciliacao'),
        ('CAUÇÕES E GARANTIAS RECEBIDAS', 'outros_descontos'),
        ('DESCRICAO INEDITA QUALQUER', 'outros_descontos'),
        (null, 'outros_descontos')
    ) as t (descricao, categoria_esperada)
)

select
    descricao,
    categoria_esperada,
    {{ classificar_receita_extra_orcamentaria('descricao') }} as categoria_obtida
from casos
where {{ classificar_receita_extra_orcamentaria('descricao') }} is distinct from categoria_esperada
