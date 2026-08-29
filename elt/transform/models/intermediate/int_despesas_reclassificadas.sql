-- Intermediário: aplica regras léxicas e catálogo STN para inferir natureza sugerida e categoria do objeto
with despesas as (
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
        vincodigonome
    from {{ ref('int_despesas_consolidadas') }}
),

reclassificacao as (
    select
        *,
        case
            -- 1. Limpeza Urbana e Resíduos Sólidos (Precede locação genérica para evitar capturar caçambas/poliguindastes como veículos)
            when natureza_despesa_codigo = '3.3.90.39.44'
                 or (
                     elemento in ('39', '99')
                     and {{ target.schema }}.unaccent(lower(coalesce(produ, descricao, ''))) ~* '(cacamba|poliguindaste|residuo|entulho|lixo|recicla|transbordo|destinacao final|capina|varricao|aterro sanit)'
                 ) then 'limpeza_residuos'

            -- 2. Consórcios Públicos e Rateios de Saúde
            when natureza_despesa_codigo like '3.3.71%'
                 or elemento = '70'
                 or {{ target.schema }}.unaccent(lower(coalesce(fornecedor_nome, produ, descricao, ''))) ~* '(consorcio publico|consorcio intermunicipal|rateio de consorcio|rateio do consorcio|cisbap|codesp|cis-bap)' then 'consorcios_publicos'

            -- 3. Bloqueios Judiciais e Sentenças
            when natureza_despesa_codigo like '3.3.90.91%'
                 or elemento = '91'
                 or {{ target.schema }}.unaccent(lower(coalesce(fornecedor_nome, produ, descricao, ''))) ~* '(bloqueio judicial|sequestro judicial|precatorio|sentenca judicial|requisicao de pequeno valor|justica do trabalho|tribunal de justica|vara do trabalho|justica federal)' then 'bloqueios_sentencas'

            -- 4. Diárias e Viagens
            when natureza_despesa_codigo like '3.3.90.14%'
                 or natureza_despesa_codigo like '3.3.90.33%'
                 or natureza_despesa_codigo = '3.3.90.36.02'
                 or elemento in ('14', '33')
                 or (
                     elemento = '36'
                     and {{ target.schema }}.unaccent(lower(coalesce(produ, descricao, ''))) ~* '(passagens aereas|diarias a servico)'
                 ) then 'diarias_viagens'

            -- 5. Obras e Infraestrutura
            when natureza_despesa_codigo like '4.4.90.51%'
                 or elemento = '51'
                 or (
                     elemento in ('39', '99')
                     and {{ target.schema }}.unaccent(lower(coalesce(produ, descricao, ''))) ~* '(pavimentacao|drenagem pluvial|construcao de ponte|muro de contencao|recapeamento asfaltico)'
                     and {{ target.schema }}.unaccent(lower(coalesce(produ, descricao, ''))) !~* '(projeto basico|projeto executivo|topografia|consultoria)'
                 ) then 'obras_infraestrutura'

            -- 6. Combustíveis e Frotas
            when (
                natureza_despesa_codigo in ('3.3.90.30.01', '3.3.90.30.39')
                or (
                    elemento in ('30', '39', '99')
                    and (
                        {{ target.schema }}.unaccent(lower(coalesce(fornecedor_nome, ''))) ~* '(posto|petroleo|uaitag)'
                        or {{ target.schema }}.unaccent(lower(coalesce(produ, descricao, ''))) ~* '(gasolina|diesel|etanol|combustivel|abastecimento de combustiveis|abastecimento com arla)'
                    )
                )
                or (
                    fonte = 'restos_a_pagar'
                    and {{ target.schema }}.unaccent(lower(coalesce(fornecedor_nome, ''))) ~* '(posto|combustiv|petroleo)'
                )
            )
            and {{ target.schema }}.unaccent(lower(coalesce(fornecedor_nome, ''))) !~* '(cedae|copasa|enel|educacao|aliment|didatico|livro|magazine|papelaria)'
            and {{ target.schema }}.unaccent(lower(coalesce(produ, descricao, ''))) !~* '(agua e esgoto|abastecimento de agua|tratamento de esgoto|cedae|alimento|generos alimenticios|didatico|livro|jogos|xicara|cobertor|pedagogico)' then 'combustivel_frota'

            -- 7. Locação de Máquinas e Veículos (específico para máquinas/veículos, sem caçambas ou serviços hospitalares/médicos puros)
            when (
                (
                    natureza_despesa_codigo in ('3.3.90.39.12', '3.3.90.39.13', '3.3.90.36.16', '3.3.90.36.19')
                    and {{ target.schema }}.unaccent(lower(coalesce(fornecedor_nome, ''))) !~* '(copiadora|grafica|papelaria|informatica|flexlab|laboratorio|magazine|pousada|pure air|gases|salino)'
                    and {{ target.schema }}.unaccent(lower(coalesce(produ, descricao, ''))) !~* '(copiadora|xerox|impressora|digitalizac|reprografia|duplicador|toner|cartucho|software|sistema|imovel|predio|sala|galpao|tenda|palco|dosimetro|abastecimento de agua|tratamento de esgoto|bomba infusora|laboratorio|consulta oftalmolog|consulta medica|oftalmolog|pediatria|som |sonor|mesa|cadeira|freezer|fogao|lavar roupa|colocacao de vidro|revisao|troca de pneu|alinhamento|gases medicinais|oxigenio|brinquedo|inflaveis|usina de|aparelho para|cacamba|residuo|lixo)'
                )
                or (
                    elemento in ('36', '39', '32', '99')
                    and (
                        {{ target.schema }}.unaccent(lower(coalesce(fornecedor_nome, ''))) ~* 'autolocadora'
                        or {{ target.schema }}.unaccent(lower(coalesce(produ, descricao, ''))) ~* '(locacao|aluguel).*(veiculo|ambulancia|trator|escavadeira|retroescavadeira|caminhao|van|pipa|motoniveladora|pa carregadeira|maquinario)'
                    )
                    and {{ target.schema }}.unaccent(lower(coalesce(fornecedor_nome, ''))) !~* '(copiadora|grafica|papelaria|informatica|flexlab|laboratorio|magazine|pousada|pure air|gases|salino)'
                    and {{ target.schema }}.unaccent(lower(coalesce(produ, descricao, ''))) !~* '(copiadora|xerox|impressora|digitalizac|reprografia|duplicador|toner|cartucho|software|sistema|imovel|predio|sala|galpao|tenda|palco|dosimetro|abastecimento de agua|tratamento de esgoto|bomba infusora|laboratorio|consulta oftalmolog|consulta medica|oftalmolog|pediatria|som |sonor|mesa|cadeira|freezer|fogao|lavar roupa|colocacao de vidro|revisao|troca de pneu|alinhamento|gases medicinais|oxigenio|brinquedo|inflaveis|usina de|aparelho para|cacamba|residuo|lixo)'
                )
                or (
                    fonte = 'restos_a_pagar'
                    and (
                        {{ target.schema }}.unaccent(lower(coalesce(fornecedor_nome, ''))) ~* 'autolocadora'
                        or {{ target.schema }}.unaccent(lower(coalesce(descricao, ''))) ~* '(locacao|aluguel).*(veiculo|ambulancia|trator|caminhao|maquina)'
                    )
                )
            ) then 'locacao_maquinas_veiculos'

            -- 8. Locação de Imóveis
            when (
                natureza_despesa_codigo in ('3.3.90.36.15', '3.3.90.39.10')
                or (
                    natureza_despesa_codigo in ('3.3.90.36.19', '3.3.90.39.14')
                    and {{ target.schema }}.unaccent(lower(coalesce(produ, descricao, ''))) ~* '(imovel|predio|sala|galpao|terreno|sede|almoxarifado|biblioteca)'
                )
                or (
                    elemento in ('36', '39', '93', '99')
                    and {{ target.schema }}.unaccent(lower(coalesce(produ, descricao, ''))) ~* '(locacao|aluguel).*(imovel|predio|sala|galpao|terreno|sede|almoxarifado|biblioteca)'
                )
                or (
                    fonte = 'restos_a_pagar'
                    and {{ target.schema }}.unaccent(lower(coalesce(descricao, ''))) ~* '(locacao|aluguel).*(imovel|predio|sala|galpao|terreno)'
                )
            )
            and {{ target.schema }}.unaccent(lower(coalesce(fornecedor_nome, ''))) !~* '(transporte|veiculo|enel|cedae|copasa)'
            and {{ target.schema }}.unaccent(lower(coalesce(produ, descricao, ''))) !~* '(transporte|veiculo|aluno|energia|eletric|agua|esgoto|tenda|som|palco)' then 'locacao_imoveis'

            -- 9. Eventos, Shows e Festividades
            when (
                natureza_despesa_codigo in ('3.3.90.39.21', '3.3.90.39.22', '3.3.90.39.23')
                or natureza_despesa_codigo like '3.3.90.31%'
                or (
                    natureza_despesa_codigo = '3.3.90.39.14'
                    and {{ target.schema }}.unaccent(lower(coalesce(produ, descricao, ''))) ~* '(palco|som|show|festa|evento)'
                )
                or (
                    elemento in ('39', '31', '99')
                    and (funcao in ('13', '27') or subfuncao in ('392', '695', '812'))
                    and {{ target.schema }}.unaccent(lower(coalesce(produ, descricao, ''))) ~* '(show|festa|festivid|palco|sonorizacao|carnaval|bandas|artistic)'
                    and {{ target.schema }}.unaccent(lower(coalesce(projeto_atividade_nome, ''))) !~* 'manutencao'
                )
            )
            and {{ target.schema }}.unaccent(lower(coalesce(produ, descricao, ''))) !~* '(data show|projetor|imovel|predio|veiculo|transporte|agua|energia|palestra)'
            and {{ target.schema }}.unaccent(lower(coalesce(fornecedor_nome, ''))) !~* '(transporte|veiculo|enel|cedae|copasa)' then 'eventos_festas'

            -- 10. Serviços Médicos, Plantões e Exames
            when natureza_despesa_codigo = '3.3.90.39.50'
                 or (
                     elemento in ('36', '39', '99')
                     and (
                         {{ target.schema }}.unaccent(lower(coalesce(fornecedor_nome, ''))) ~* '(flexlab|laboratorio|clinica|oftalmo|hospital)'
                         or {{ target.schema }}.unaccent(lower(coalesce(produ, descricao, ''))) ~* '(plantao medico|plantoes medicos|consulta medica|consultas medicas|consulta oftalmolog|oftalmolog|pediatria|ultrassonografia|exames laborator|cirurgia|hospitalar|dosimetro|gases medicinais|oxigenio)'
                     )
                 ) then 'plantoes_medicos'

            -- 11. Mão de Obra Terceirizada
            when natureza_despesa_codigo like '3.3.90.37%'
                 or elemento = '37'
                 or (
                     elemento in ('36', '39', '99')
                     and {{ target.schema }}.unaccent(lower(coalesce(produ, descricao, ''))) ~* '(locacao de mao de obra|locacao de mao-de-obra|terceirizacao de mao|servicos de portaria|servicos de recepcao|limpeza predial terceirizada|apoio administrativo terceirizado)'
                 ) then 'terceirizacao_mao_obra'

            -- 12. Previdência e Obrigações Patronais
            when natureza_despesa_codigo like '3.3.90.13%'
                 or elemento = '13'
                 or {{ target.schema }}.unaccent(lower(coalesce(fornecedor_nome, produ, descricao, ''))) ~* '(inss|caprem|previdencia propria|contribuicao previdenciaria patronal|obrigacoes patronais|pasep)' then 'previdencia'

            -- 13. Consultoria e Assessoria Técnica
            when natureza_despesa_codigo like '3.3.90.35%'
                 or natureza_despesa_codigo = '3.3.90.39.05'
                 or elemento = '35'
                 or (
                     elemento in ('36', '39', '99')
                     and {{ target.schema }}.unaccent(lower(coalesce(produ, descricao, ''))) ~* '(consultoria tecnica|assessoria juridica|assessoria contabil|auditoria externa|auditoria contabil|assessoria tributaria)'
                     and {{ target.schema }}.unaccent(lower(coalesce(produ, descricao, ''))) !~* '(show|festa|veiculo|combustivel)'
                 ) then 'consultoria_tecnica'

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
        when r.categoria_objeto_sugerida = 'previdencia' then '3.3.90.13.00'
        when r.categoria_objeto_sugerida = 'consultoria_tecnica' then coalesce(r.natureza_despesa_codigo, '3.3.90.35.00')
        when r.categoria_objeto_sugerida = 'combustivel_frota' then '3.3.90.30.01'
        when r.categoria_objeto_sugerida = 'locacao_maquinas_veiculos' then coalesce(nullif(r.natureza_despesa_codigo, '3.3.90.39.99'), '3.3.90.39.12')
        when r.categoria_objeto_sugerida = 'locacao_imoveis' then coalesce(nullif(r.natureza_despesa_codigo, '3.3.90.39.99'), '3.3.90.36.15')
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
        when r.categoria_objeto_sugerida = 'plantoes_medicos' then 'Serviços Médico-Hospitalares Odontológicos e Laboratoriais'
        when r.categoria_objeto_sugerida = 'terceirizacao_mao_obra' then 'Locação de Mão-de-Obra'
        when r.categoria_objeto_sugerida = 'previdencia' then 'Obrigações Patronais'
        when r.categoria_objeto_sugerida = 'consultoria_tecnica' then 'Serviços de Consultoria'
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
