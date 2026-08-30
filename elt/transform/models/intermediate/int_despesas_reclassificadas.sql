with despesas as (
    select * from {{ ref('int_despesas_consolidadas') }}
),

reclassificacao as materialized (
    select
        portal_slug,
        fonte,
        ano,
        empresa_id,
        empenho_id,
        pk_empenho,
        pk_empenho_pai,
        tipo_empenho,
        orgao_codigo,
        funcao,
        funcao_nome,
        subfuncao,
        subfuncao_nome,
        elemento,
        natureza_despesa,
        natureza_despesa_codigo,
        categoria,
        grupo_natureza,
        modalidade,
        programa,
        programa_nome,
        proj_atividade,
        projeto_atividade_nome,
        mes,
        fornecedor_nome,
        fornecedor_cpf_cnpj,
        fornecedor_raw,
        licitacao_numero,
        licitacao_modalidade,
        licitacao_descricao,
        fongrupo,
        fongrupo_desc,
        foncodigo,
        foncodigo_desc,
        fonro,
        fonro_desc,
        fonte_stn,
        fonte_stn_desc,
        fonte_recurso_desc,
        data_empenho,
        empenhado,
        liquidado,
        pago,
        dotacao_inicial,
        alteracao_dotacao,
        dotacao_atualizada,
        anulado,
        reforco,
        descricao,
        entidade_nome,
        proc,
        codlo,
        cfpro,
        ficha,
        codif,
        codigo,
        produ,
        vingrupo_vincodigo,
        vincodigonome,
        case
            -- 1. Limpeza Urbana e Resíduos Sólidos (Precede locação genérica para evitar capturar caçambas/poliguindastes como veículos)
            when natureza_despesa_codigo = '3.3.90.39.44'
                 or (
                     elemento in ('39', '99')
                     and texto_objeto ~ '(cacamba|poliguindaste|residuo|entulho|lixo|recicla|transbordo|destinacao final|capina|varricao|aterro sanit)'
                 ) then 'limpeza_residuos'

            -- 2. Consórcios Públicos e Rateios de Saúde
            when natureza_despesa_codigo like '3.3.71%'
                 or elemento = '70'
                 or texto_completo ~ '(consorcio publico|consorcio intermunicipal|rateio de consorcio|rateio do consorcio|cisbap|codesp|cis-bap|ajuste de contas.*confissao de divida)' then 'consorcios_publicos'

            -- 3. Bloqueios Judiciais e Sentenças
            when natureza_despesa_codigo like '3.3.90.91%'
                 or elemento in ('91', '61')
                 or (
                     texto_completo ~ '(bloqueio judicial|sequestro judicial|precatorio|sentenca judicial|requisicao de pequeno valor|justica do trabalho|tribunal de justica|vara do trabalho|justica federal|tribunal.*trt|tribunal regional do trabalho|vara unica|penhora online|resgate judicial|acordados junto ao tribunal|honorarios advocaticios)'
                     and texto_fornecedor !~ '(vittalis|homecare|home care|hospital|clinica|medico|saude|codesp|cisbap)'
                     and texto_objeto !~ '(home care|homecare|equipe multidisciplinar|plantao|consulta medica|assistencial de saude)'
                 ) then 'bloqueios_sentencas'

            -- 4. Diárias e Viagens
            when natureza_despesa_codigo like '3.3.90.14%'
                 or natureza_despesa_codigo like '3.3.90.33%'
                 or natureza_despesa_codigo = '3.3.90.36.02'
                 or elemento in ('14', '33')
                 or (
                     elemento = '36'
                     and texto_objeto ~ '(passagens aereas|diarias a servico)'
                 ) then 'diarias_viagens'

            -- 5. Obras e Infraestrutura
            when natureza_despesa_codigo like '4.4.90.51%'
                 or elemento = '51'
                 or (
                     elemento in ('39', '99')
                     and texto_objeto ~ '(pavimentacao|drenagem pluvial|construcao de ponte|muro de contencao|recapeamento asfaltico)'
                     and texto_objeto !~ '(projeto basico|projeto executivo|topografia|consultoria)'
                 ) then 'obras_infraestrutura'

            -- 6. Combustíveis e Frotas
            when (
                natureza_despesa_codigo in ('3.3.90.30.01', '3.3.90.30.39')
                or (
                    elemento in ('30', '39', '99')
                    and (
                        texto_fornecedor ~ '(\yposto\y|petroleo|uaitag)'
                        or texto_objeto ~ '(gasolina|diesel|etanol|\ycombustivel|\ycombustiveis|abastecimento de combustiveis|abastecimento com arla)'
                    )
                )
                or (
                    fonte = 'restos_a_pagar'
                    and texto_fornecedor ~ '(\yposto\y|combustiv|petroleo)'
                )
            )
            and texto_fornecedor !~ '(cedae|copasa|enel|educacao|aliment|didatico|livro|magazine|papelaria|cooperativa de transportes|autolocadora|radar empreendimentos)'
            and texto_objeto !~ '(agua e esgoto|abastecimento de agua|tratamento de esgoto|cedae|alimento|generos alimenticios|didatico|livro|jogos|xicara|cobertor|pedagogico|locacao|aluguel|veiculos leves|veiculos pesados|combustivel por conta)' then 'combustivel_frota'

            -- 7. Locação de Máquinas e Veículos (específico para máquinas/veículos, sem caçambas ou serviços hospitalares/médicos puros)
            when (
                (
                    natureza_despesa_codigo in ('3.3.90.39.12', '3.3.90.39.13', '3.3.90.36.16')
                    and texto_fornecedor !~ '(copiadora|grafica|papelaria|informatica|flexlab|laboratorio|magazine|pousada|pure air|gases|salino)'
                    and texto_objeto !~ '(copiadora|xerox|impressora|digitalizac|reprografia|duplicador|toner|cartucho|software|sistema|imovel|predio|sala|galpao|tenda|palco|dosimetro|abastecimento de agua|tratamento de esgoto|bomba infusora|laboratorio|consulta oftalmolog|consulta medica|oftalmolog|pediatria|som |sonor|mesa|cadeira|freezer|fogao|lavar roupa|colocacao de vidro|revisao|troca de pneu|alinhamento|gases medicinais|oxigenio|brinquedo|inflaveis|usina de|aparelho para|cacamba|residuo|lixo|aluguel social)'
                )
                or (
                    elemento in ('36', '39', '32', '99')
                    and (
                        texto_fornecedor ~ '(autolocadora|radar empreendimentos|cooperativa de transportes)'
                        or texto_objeto ~ '(locacao|aluguel|prestacao de servicos veiculos|veiculos leves|veiculos pesados).*(veiculo|ambulancia|trator|escavadeira|retroescavadeira|caminhao|van|pipa|motoniveladora|pa carregadeira|maquinario|sem condutor)'
                    )
                    and texto_fornecedor !~ '(copiadora|grafica|papelaria|informatica|flexlab|laboratorio|magazine|pousada|pure air|gases|salino)'
                    and texto_objeto !~ '(copiadora|xerox|impressora|digitalizac|reprografia|duplicador|toner|cartucho|software|sistema|imovel|predio|sala|galpao|tenda|palco|dosimetro|abastecimento de agua|tratamento de esgoto|bomba infusora|laboratorio|consulta oftalmolog|consulta medica|oftalmolog|pediatria|som |sonor|mesa|cadeira|freezer|fogao|lavar roupa|colocacao de vidro|revisao|troca de pneu|alinhamento|gases medicinais|oxigenio|brinquedo|inflaveis|usina de|aparelho para|cacamba|residuo|lixo|aluguel social)'
                )
                or (
                    fonte = 'restos_a_pagar'
                    and (
                        texto_fornecedor ~ '(autolocadora|radar empreendimentos|cooperativa de transportes)'
                        or texto_objeto ~ '(locacao|aluguel).*(veiculo|ambulancia|trator|caminhao|maquina)'
                    )
                    and texto_objeto !~ 'aluguel social'
                )
            ) then 'locacao_maquinas_veiculos'

            -- 8. Locação de Imóveis
            when (
                natureza_despesa_codigo in ('3.3.90.36.15', '3.3.90.39.10')
                or (
                    natureza_despesa_codigo in ('3.3.90.36.19', '3.3.90.39.14', '3.3.90.36.16')
                    and texto_objeto ~ '(imovel|predio|sala|galpao|terreno|sede|almoxarifado|biblioteca|aluguel social)'
                )
                or (
                    elemento in ('36', '39', '93', '99')
                    and texto_objeto ~ '(locacao|aluguel).*(imovel|predio|sala|galpao|terreno|sede|almoxarifado|biblioteca|aluguel social)'
                )
                or (
                    fonte = 'restos_a_pagar'
                    and texto_objeto ~ '(locacao|aluguel).*(imovel|predio|sala|galpao|terreno|aluguel social)'
                )
            )
            and texto_fornecedor !~ '(transporte|veiculo|enel|cedae|copasa)'
            and texto_objeto !~ '(transporte|veiculo|aluno|energia|eletric|agua|esgoto|tenda|som|palco)' then 'locacao_imoveis'

            -- 9. Eventos, Shows e Festividades
            when (
                natureza_despesa_codigo in ('3.3.90.39.21', '3.3.90.39.22', '3.3.90.39.23')
                or natureza_despesa_codigo like '3.3.90.31%'
                or (
                    natureza_despesa_codigo = '3.3.90.39.14'
                    and texto_objeto ~ '(palco|\ysom\y|\yshow\y|\yshows\y|\yfesta\y|\yfestas\y|evento)'
                )
                or (
                    elemento in ('39', '31', '99')
                    and (
                        (funcao in ('13', '27') or subfuncao in ('392', '695', '812'))
                        or texto_fornecedor ~ '(arena eventos|ws shows|shows|estruturas para eventos)'
                    )
                    and texto_objeto ~ '(show|festa|festivid|palco|sonorizacao|carnaval|bandas|artistic|locacao de estruturas|tendas)'
                    and texto_proj_ativ !~ 'manutencao'
                )
            )
            and texto_objeto !~ '(data show|projetor|imovel|predio|veiculo|transporte|agua|energia|palestra)'
            and texto_fornecedor !~ '(transporte|veiculo|enel|cedae|copasa)' then 'eventos_festas'

            -- 10. Serviços Médicos, Plantões e Exames
            when natureza_despesa_codigo in ('3.3.90.39.50', '3.3.90.36.06', '3.3.90.36.07', '3.3.90.39.51')
                 or (
                     elemento in ('36', '39', '99')
                     and (
                         texto_fornecedor ~ '(flexlab|laboratorio|clinica|oftalmo|hospital|servicos medicos|assistencia em saude|home care|homecare|remocao.*saude|saude.*servicos|vittalis|focus.*medico|pure air|gases medicinais)'
                         or texto_objeto ~ '(plantao|plantoes|escala.*plantao|gestao de escala|assistencial de saude|consulta medica|consultas medicas|consulta oftalmolog|oftalmolog|pediatria|ultrassonografia|exames laborator|cirurgia|hospitalar|home care|homecare|dosimetro|gases medicinais|oxigenio medicinal|medicos 24h|medico 24h|urgencia.*medico|medico.*urgencia)'
                     )
                 ) then 'plantoes_medicos'

            -- 11. Mão de Obra Terceirizada
            when natureza_despesa_codigo like '3.3.90.37%'
                 or elemento = '37'
                 or (
                     elemento in ('36', '39', '99')
                     and texto_objeto ~ '(mao de obra terceirizada|mao-de-obra terceirizada|locacao de mao de obra|locacao de mao-de-obra|terceirizacao de mao|terceirizacao de servicos|servicos continuados de mao|servicos terceirizados|posto de trabalho|postos de trabalho|servicos de portaria|servicos de recepcao|limpeza predial terceirizada|apoio administrativo terceirizado)'
                 ) then 'terceirizacao_mao_obra'

            -- 12. Previdência e Obrigações Patronais (inclui folha de inativos e pensionistas)
            when natureza_despesa_codigo like '3.3.90.13%'
                 or natureza_despesa_codigo in ('3.1.90.01.99', '3.1.90.03.99', '3.1.90.01.01', '3.1.90.01.06', '3.1.90.03.01')
                 or elemento in ('13', '01', '03')
                 or texto_completo ~ '(\yinss\y|caprem|previdencia propria|contribuicao previdenciaria patronal|obrigacoes patronais|pasep|folha de pagamento dos inativos|inativos e pensionistas|casp - caixa assist|guias de recolhimento de planos de saude|pensionista|inativo)' then 'previdencia'

            -- 13. Consultoria, Assessoria Técnica e Pesquisa
            when (
                     natureza_despesa_codigo like '3.3.90.35%'
                     or elemento = '35'
                     or (
                         natureza_despesa_codigo = '3.3.90.39.05'
                         and texto_fornecedor !~ '(informatica|telecom|digital net|internet)'
                         and texto_objeto !~ '(internet|telecomunicac|link de dados|provedor)'
                     )
                     or (
                         elemento in ('36', '39', '99')
                         and (
                             texto_fornecedor ~ '(fundacao universitar|fujb|coppetec|faperj)'
                             or texto_objeto ~ '(consultoria tecnica|assessoria juridica|assessoria contabil|auditoria externa|auditoria contabil|assessoria tributaria|acordo de parceria para pesquisa|pesquisa.*desenvolvimen|projeto de pesquisa|estudo especializado|modelagem de cheias|desenvolvimento institucional)'
                         )
                     )
                 )
                 and texto_objeto !~ '(show|festa|veiculo|combustivel|internet|telecomunicac)' then 'consultoria_tecnica'

            else null
        end as categoria_objeto_sugerida
    from despesas
)

select
    r.*,

    -- Código sugerido STN/MCASP
    case
        when r.categoria_objeto_sugerida = 'limpeza_residuos' then '3.3.90.39.44'
        when r.categoria_objeto_sugerida = 'consorcios_publicos' then '3.3.71.70.00'
        when r.categoria_objeto_sugerida = 'bloqueios_sentencas' then '3.3.90.91.00'
        when r.categoria_objeto_sugerida = 'plantoes_medicos' then '3.3.90.39.50'
        when r.categoria_objeto_sugerida = 'terceirizacao_mao_obra' then '3.3.90.37.00'
        when r.categoria_objeto_sugerida = 'previdencia' then
            case
                when r.elemento = '01' or r.natureza_despesa_codigo like '3.1.90.01%' then '3.1.90.01.01'
                when r.elemento = '03' or r.natureza_despesa_codigo like '3.1.90.03%' then '3.1.90.03.01'
                when r.natureza_despesa_codigo like '3.1.9%.13%' then coalesce(nullif(r.natureza_despesa_codigo, '3.1.90.13.99'), '3.1.90.13.02')
                else coalesce(nullif(r.natureza_despesa_codigo, '3.3.90.13.99'), '3.3.90.13.00')
            end
        when r.categoria_objeto_sugerida = 'consultoria_tecnica' then coalesce(nullif(r.natureza_despesa_codigo, '3.3.90.39.99'), '3.3.90.35.00')
        when r.categoria_objeto_sugerida = 'combustivel_frota' then '3.3.90.30.01'
        when r.categoria_objeto_sugerida = 'locacao_maquinas_veiculos' then coalesce(nullif(r.natureza_despesa_codigo, '3.3.90.39.99'), '3.3.90.39.12')
        when r.categoria_objeto_sugerida = 'locacao_imoveis' then coalesce(nullif(r.natureza_despesa_codigo, '3.3.90.39.99'), case when length(regexp_replace(coalesce(r.fornecedor_cpf_cnpj, ''), '\D', '', 'g')) > 11 then '3.3.90.39.10' else '3.3.90.36.15' end)
        when r.categoria_objeto_sugerida = 'eventos_festas' then coalesce(nullif(r.natureza_despesa_codigo, '3.3.90.39.99'), '3.3.90.39.23')
        when r.categoria_objeto_sugerida = 'diarias_viagens' then coalesce(r.natureza_despesa_codigo, '3.3.90.14.01')
        when r.categoria_objeto_sugerida = 'obras_infraestrutura' then coalesce(r.natureza_despesa_codigo, '4.4.90.51.00')
        else r.natureza_despesa_codigo
    end as natureza_despesa_codigo_sugerido,

    -- Nome da natureza sugerida
    case
        when r.categoria_objeto_sugerida = 'limpeza_residuos' then 'Serviços de Limpeza Urbana e Manejo de Resíduos Sólidos'
        when r.categoria_objeto_sugerida = 'consorcios_publicos' then 'Rateio pela Participação em Consórcio Público'
        when r.categoria_objeto_sugerida = 'bloqueios_sentencas' then 'Sentenças Judiciais'
        when r.categoria_objeto_sugerida = 'plantoes_medicos' then 'Serviços Médico-Hospitalares e Plantões'
        when r.categoria_objeto_sugerida = 'terceirizacao_mao_obra' then 'Locação de Mão-de-Obra Terceirizada'
        when r.categoria_objeto_sugerida = 'previdencia' then
            case
                when r.elemento = '01' or r.natureza_despesa_codigo like '3.1.90.01%' then 'Aposentadorias e Reformas'
                when r.elemento = '03' or r.natureza_despesa_codigo like '3.1.90.03%' then 'Pensões'
                else 'Obrigações Patronais e Contribuições Previdenciárias'
            end
        when r.categoria_objeto_sugerida = 'consultoria_tecnica' then 'Serviços de Consultoria e Assessoria Técnica'
        when r.categoria_objeto_sugerida = 'combustivel_frota' then 'Combustíveis e Lubrificantes Automotivos'
        when r.categoria_objeto_sugerida = 'locacao_maquinas_veiculos' then 'Locação de Máquinas e Equipamentos'
        when r.categoria_objeto_sugerida = 'locacao_imoveis' then 'Locação de Imóveis'
        when r.categoria_objeto_sugerida = 'eventos_festas' then 'Festividades e Homenagens'
        when r.categoria_objeto_sugerida = 'diarias_viagens' then 'Diárias no País'
        when r.categoria_objeto_sugerida = 'obras_infraestrutura' then 'Obras e Instalações'
        else null
    end as natureza_despesa_nome_sugerido,

    -- Centros de Custo Sensíveis Canônicos (6 categorias do Radar)
    case
        when r.categoria_objeto_sugerida in ('combustivel_frota', 'locacao_maquinas_veiculos', 'locacao_imoveis', 'eventos_festas', 'diarias_viagens', 'obras_infraestrutura')
        then r.categoria_objeto_sugerida
        else null
    end as categoria_gasto_sensivel

from reclassificacao r
