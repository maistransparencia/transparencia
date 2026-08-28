-- Fato: despesas consolidadas com chaves para dimensões
-- Aplica a regra do Empenho Líquido: soma anulações (tipo_empenho='AN') ao empenhado bruto
-- para evitar distorções na taxa de quitação quando há estornos de fim de exercício.
-- RAP (restos a pagar): tipo_empenho é null — incluídos na tabela final sem anulações.

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

-- Agrega anulações por empenho pai para calcular empenho líquido
anulacoes as (
    select
        portal_slug,
        ano,
        empresa_id,
        pk_empenho_pai,
        sum(coalesce(empenhado, 0.00)) as total_anulado
    from despesas
    where tipo_empenho = 'AN'
    group by portal_slug, ano, empresa_id, pk_empenho_pai
),

empenhos as (
    select
        d.portal_slug,
        d.fonte,
        d.ano,
        d.empresa_id,
        d.empenho_id,
        d.pk_empenho,
        d.pk_empenho_pai,
        d.tipo_empenho,
        d.orgao_codigo,
        d.funcao,
        d.funcao_nome,
        d.subfuncao,
        d.subfuncao_nome,
        d.elemento,
        d.natureza_despesa,
        d.natureza_despesa_codigo,
        d.categoria,
        d.grupo_natureza,
        d.modalidade,
        d.programa,
        d.programa_nome,
        d.proj_atividade,
        d.projeto_atividade_nome,
        d.mes,
        d.fornecedor_nome,
        d.fornecedor_cpf_cnpj,
        d.fornecedor_raw,
        d.licitacao_numero,
        d.licitacao_modalidade,
        d.licitacao_descricao,
        d.fongrupo,
        d.fongrupo_desc,
        d.foncodigo,
        d.foncodigo_desc,
        d.fonro,
        d.fonro_desc,
        d.fonte_stn,
        d.fonte_stn_desc,
        d.fonte_recurso_desc,
        d.data_empenho,
        d.empenhado,
        d.liquidado,
        d.pago,
        d.dotacao_inicial,
        d.alteracao_dotacao,
        d.dotacao_atualizada,
        d.anulado,
        d.reforco,
        d.descricao,
        d.entidade_nome,
        d.proc,
        d.codlo,
        d.cfpro,
        d.ficha,
        d.codif,
        d.codigo,
        d.produ,
        d.vingrupo_vincodigo,
        d.vincodigonome,
        coalesce(a.total_anulado, 0.00) as valor_anulacoes,
        coalesce(d.empenhado, 0.00) + coalesce(a.total_anulado, 0.00) as empenhado_liquido
    from despesas d
    left join anulacoes a
        on d.portal_slug = a.portal_slug
        and d.ano = a.ano
        and d.empresa_id = a.empresa_id
        and d.pk_empenho = a.pk_empenho_pai
    where d.tipo_empenho != 'AN' or d.tipo_empenho is null
)

select
    {{ dbt_utils.generate_surrogate_key(['portal_slug', 'fonte', 'ano', 'empresa_id', 'empenho_id']) }} as despesa_id,

    -- Chaves para dimensões
    {{ dbt_utils.generate_surrogate_key(['portal_slug', 'fornecedor_cpf_cnpj']) }} as credor_id,
    {{ dbt_utils.generate_surrogate_key(['portal_slug', 'empresa_id']) }} as orgao_id,
    data_empenho,

    -- Atributos da despesa
    portal_slug,
    fonte,
    ano,
    empresa_id,
    empenho_id,
    pk_empenho,
    tipo_empenho,
    orgao_codigo,
    coalesce(codlo, '00') as unidade_codigo,
    funcao,
    funcao_nome,
    subfuncao,
    subfuncao_nome,
    elemento,
    natureza_despesa,
    grupo_natureza,
    modalidade,
    programa,
    programa_nome,
    proj_atividade,
    projeto_atividade_nome,
    mes,
    fornecedor_nome,
    fornecedor_cpf_cnpj,
    licitacao_numero,
    licitacao_modalidade,
    fonte_recurso_desc,
    coalesce(produ, descricao) as descricao,
    natureza_despesa_codigo,

    -- Categorização Canônica Determinística de Gastos Sensíveis
    case
        -- 1. Diárias e Viagens
        when natureza_despesa_codigo like '3.3.90.14%'
             or natureza_despesa_codigo like '3.3.90.33%'
             or elemento in ('14', '33') then 'diarias_viagens'

        -- 2. Obras e Infraestrutura
        when natureza_despesa_codigo like '4.4.90.51%'
             or elemento = '51'
             or (
                 elemento = '39'
                 and {{ target.schema }}.unaccent(lower(coalesce(produ, descricao, ''))) ~* '(pavimentacao|drenagem pluvial|construcao de ponte|muro de contencao|recapeamento asfaltico)'
                 and {{ target.schema }}.unaccent(lower(coalesce(produ, descricao, ''))) !~* '(projeto basico|projeto executivo|topografia|consultoria)'
             ) then 'obras_infraestrutura'

        -- 3. Combustíveis e Frotas
        when (
            natureza_despesa_codigo = '3.3.90.30.01'
            or (
                elemento in ('30', '39')
                and (
                    {{ target.schema }}.unaccent(lower(coalesce(fornecedor_nome, ''))) ~* '(posto|petroleo|uaitag)'
                    or {{ target.schema }}.unaccent(lower(coalesce(produ, descricao, ''))) ~* '(gasolina|diesel|etanol|combustivel|abastecimento de combustiveis|abastecimento com arla)'
                )
            )
        )
        and {{ target.schema }}.unaccent(lower(coalesce(fornecedor_nome, ''))) !~* '(cedae|copasa|enel|educacao|aliment|didatico|livro|magazine|papelaria)'
        and {{ target.schema }}.unaccent(lower(coalesce(produ, descricao, ''))) !~* '(agua e esgoto|abastecimento de agua|tratamento de esgoto|cedae|alimento|generos alimenticios|didatico|livro|jogos|xicara|cobertor|pedagogico)' then 'combustivel_frota'

        -- 4. Locação de Máquinas e Veículos
        when (
            natureza_despesa_codigo in ('3.3.90.39.12', '3.3.90.39.13')
            or (
                elemento in ('36', '39', '32')
                and (
                    {{ target.schema }}.unaccent(lower(coalesce(fornecedor_nome, ''))) ~* 'autolocadora'
                    or {{ target.schema }}.unaccent(lower(coalesce(produ, descricao, ''))) ~* '(locacao|aluguel).*(veiculo|ambulancia|trator|escavadeira|retroescavadeira|caminhao|van|pipa|poliguindauto|poliguindaste|motoniveladora|pa carregadeira|maquinario)'
                )
            )
        )
        and {{ target.schema }}.unaccent(lower(coalesce(fornecedor_nome, ''))) !~* '(copiadora|grafica|papelaria|informatica|flexlab|laboratorio|magazine|pousada|pure air|gases|salino)'
        and {{ target.schema }}.unaccent(lower(coalesce(produ, descricao, ''))) !~* '(copiadora|xerox|impressora|digitalizac|reprografia|duplicador|toner|cartucho|software|sistema|imovel|predio|sala|galpao|tenda|palco|dosimetro|abastecimento de agua|tratamento de esgoto|bomba infusora|laboratorio|consulta oftalmolog|consulta medica|oftalmolog|pediatria|som |sonor|mesa|cadeira|freezer|fogao|lavar roupa|colocacao de vidro|revisao|troca de pneu|alinhamento|gases medicinais|oxigenio|brinquedo|inflaveis|usina de|aparelho para)' then 'locacao_maquinas_veiculos'

        -- 5. Locação de Imóveis
        when (
            natureza_despesa_codigo in ('3.3.90.36.15', '3.3.90.36.16', '3.3.90.36.19')
            or (
                elemento in ('36', '39', '93')
                and {{ target.schema }}.unaccent(lower(coalesce(produ, descricao, ''))) ~* '(locacao|aluguel).*(imovel|predio|sala|galpao|terreno|sede|almoxarifado|biblioteca)'
            )
        )
        and {{ target.schema }}.unaccent(lower(coalesce(fornecedor_nome, ''))) !~* '(transporte|veiculo|enel|cedae|copasa)'
        and {{ target.schema }}.unaccent(lower(coalesce(produ, descricao, ''))) !~* '(transporte|veiculo|aluno|energia|eletric|agua|esgoto|tenda|som|palco)' then 'locacao_imoveis'

        -- 6. Eventos, Shows e Festividades
        when (
            natureza_despesa_codigo in ('3.3.90.39.14', '3.3.90.39.21', '3.3.90.39.22', '3.3.90.39.23')
            or natureza_despesa_codigo like '3.3.90.31%'
            or (
                elemento in ('39', '31')
                and (funcao in ('13', '27') or subfuncao in ('392', '695', '812'))
                and {{ target.schema }}.unaccent(lower(coalesce(produ, descricao, ''))) ~* '(show|festa|festivid|palco|sonorizacao|carnaval|bandas|artistic)'
                and {{ target.schema }}.unaccent(lower(coalesce(projeto_atividade_nome, ''))) !~* 'manutencao'
            )
        )
        and {{ target.schema }}.unaccent(lower(coalesce(produ, descricao, ''))) !~* '(data show|projetor|imovel|predio|veiculo|transporte|agua|energia|palestra)'
        and {{ target.schema }}.unaccent(lower(coalesce(fornecedor_nome, ''))) !~* '(transporte|veiculo|enel|cedae|copasa)' then 'eventos_festas'

        -- 7. Restos a Pagar (sem metadados)
        when fonte = 'restos_a_pagar' and (
            {{ target.schema }}.unaccent(lower(coalesce(fornecedor_nome, ''))) ~* '(posto|combustiv|petroleo)'
        ) then 'combustivel_frota'

        when fonte = 'restos_a_pagar' and (
            {{ target.schema }}.unaccent(lower(coalesce(fornecedor_nome, ''))) ~* 'autolocadora'
            or {{ target.schema }}.unaccent(lower(coalesce(descricao, ''))) ~* '(locacao|aluguel).*(veiculo|ambulancia|trator|caminhao|maquina)'
        ) then 'locacao_maquinas_veiculos'

        when fonte = 'restos_a_pagar' and (
            {{ target.schema }}.unaccent(lower(coalesce(descricao, ''))) ~* '(locacao|aluguel).*(imovel|predio|sala|galpao|terreno)'
        ) then 'locacao_imoveis'

        else null
    end as categoria_gasto_sensivel,

    -- Valores financeiros (Lei de Responsabilidade Fiscal: pago ≤ liquidado ≤ empenhado)
    empenhado,
    empenhado_liquido,
    liquidado,
    pago,
    dotacao_inicial,
    alteracao_dotacao,
    dotacao_atualizada,
    reforco,
    valor_anulacoes

from empenhos
