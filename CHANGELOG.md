# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.
O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e este projeto adere ao [Semantic Versioning](https://semver.org/).

## [Unreleased]

### 🌟 Destaques da Versão (Ingestão agendada por grupos de cadência)
* **Coleta em três grupos, cada um com workflow e cron próprios:** diária (`portal_municipal` e `farmacia_sus`, dias úteis às 23:00 UTC), semanal (`pncp` e `obrasgov`, sábados) e mensal (`siconfi_msc`, `siconfi_rgf`, `siope` e `siops`, dia 3). O `ingestion-pipeline.yml` foi substituído pelo reutilizável `ingestion-group.yml` e pelos chamadores `ingestion-daily.yml`, `ingestion-weekly.yml` e `ingestion-monthly.yml`. A definição dos grupos fica em `elt/core/cadence.py` e testes a conferem contra o seed de fontes e os YAMLs. Nova chave `--only portal_municipal` em `extract.run`.
* **Cron só liga com a variável `INGESTION_SCHEDULE_ENABLED=true`:** o agendamento roda na `dev`, mas executa o código da `main`; a variável evita rodar antes de o código chegar lá. O disparo manual não depende dela.

### 🌟 Destaques da Versão (Ajustes da home e do layout)
* **Atalhos de "Mais detalhes" com resumo:** Despesas, Licitações e Contratos e Pessoal mostram uma frase do ano ativo com número ("R$ 48,1 mi pagos em 2025", "12 contratações em 2025", "340 servidores na folha de Jun/2025"); em ano em andamento o valor é marcado como parcial ("até agora") e, sem dado, volta a descrição de antes, nunca "R$ 0" nem "0 servidores". Os números vêm das mesmas consultas das páginas de destino.
* **Compartilhar do card leva a página:** o "Compartilhar" dos cards de saúde, obras e educação usa o compartilhamento nativo do celular (ou copia o link) com o endereço da página de detalhe e o ano ativo, para quem recebe ver a prévia da página; o envio direto ao WhatsApp com texto montado saiu. Os remédios de exemplo da busca viram chips com borda.
* **Menu lateral recolhível no desktop:** o botão no topo da barra a reduz a uma faixa de ícones (com nome e dica em cada um, sem filtros e sem o rodapé do menu), e o conteúdo e o rodapé do site ocupam a largura liberada; toda visita abre expandida. O celular não muda.
* **"Sugestão ou erro":** o link do rodapé e o título do formulário deixam claro que servem também para sugestão.

### 🌟 Destaques da Versão (Escopo declarado em cada bloco)
* **Home: "Dinheiro que entra na cidade" em novembro e dezembro:** entre "Como está a cidade hoje" e "Para onde vai o dinheiro público", a home mostra "Quanto do 13º a Prefeitura já pagou este ano?" com o valor pago acumulado no ano, inclusive parcelas pagas antes de novembro; sem percentual (o empenhado ainda é parcial em novembro), sem data de cada pagamento e sem prazo legal. Com pago zerado diz "Ainda sem informação de pagamento"; fora da janela ou sem dado do 13º a seção não aparece. O valor do 13º (home e `/pessoal`) deixa de somar encargos patronais, multa e juros (elemento 13) e números soltos no texto (como "Nº 213"); aposentados e pensionistas continuam incluídos, e os valores de anos anteriores caem de acordo (ex.: Natividade 2021, R$ 2,9 mi para R$ 1,9 mi).
* **Farmácia SUS: insulina geral, NPH e regular e aviso de remédio parecido:** nos remédios essenciais de `/farmacia`, "Insulina" continua como item geral (conta qualquer tipo, inclusive as análogas) e ganha "Insulina NPH" e "Insulina Regular" separadas, como na prestação de contas da saúde. Quando um desses (ou Anlodipino e Omeprazol) está sem lote dentro da validade mas a unidade tem remédio parecido com lote válido (insulina glargina, lispro, asparte, glulisina ou degludeca, levanlodipino, esomeprazol), o item avisa que há um parecido, sem contá-lo como o mesmo remédio.
* **Título sem ano em saúde, educação e previdência:** o título e o eyebrow das três páginas mostram só o tema; o ano fica no seletor "Exercício" do cabeçalho. Cada bloco diz o seu escopo no título: do exercício ("O que entrou em 2026", "Quem recebe o dinheiro da saúde em 2026", emendas, contratação, composição dos repasses), série histórica ("Como mudou ao longo dos anos (2017–2027)", aprendizado dos alunos, produção do SUS; só o ano quando há um) e retrato atual (leitos e profissionais e Farmácia SUS, com "hoje"). O topo de `/saude` separa "Dados de {ano}" (mínimo e origem do dinheiro) de "Hoje, não muda com o ano escolhido" (leitos e profissionais, Farmácia SUS, com a data da coleta). Sem mudança em consultas nem no `?ano=`.
* **Textos do topo e dos blocos revisados:** o título de saúde diz "Saúde: quanto a Prefeitura aplica e o que a população encontra" e o de educação "Educação: quanto a Prefeitura investe e se as crianças aprendem", sem eyebrow repetido (também em obras e previdência); em anos já fechados os títulos vão para o passado ("A Prefeitura aplicou o mínimo em saúde em 2025?", "Como o Fundo contratou", "Quem recebeu o dinheiro da saúde"); o rótulo "Exercício {ano}" vira "Dados de {ano}"; a série do SUS vira pergunta ("…na cidade, de 2024 a 2026?"); os dois destaques do topo de saúde ficam alinhados.
* **Previdência com títulos em linguagem comum e sem inverter quem deve:** "Quanto a Prefeitura pagou em 2026 de dívidas parceladas com o fundo de aposentadoria?" (acordos registrados no CADPREV, pagos pela Prefeitura ao fundo), "Para onde foi o dinheiro repassado à previdência em 2026?" e "Quanto o fundo de aposentadoria tem em caixa e aplicado em 2026?"; a legenda diz "Fundo de aposentadoria dos servidores: Nome (SIGLA)".

### 🌟 Destaques da Versão (Página de Educação em torno do reservado e do pago)
* **Topo da saúde no molde da educação:** o título vira "Saúde em {ano}" e o topo responde quatro perguntas, cada uma com um número e a sua régua: a Prefeitura aplica o mínimo exigido (com barra também no ano em andamento), de onde vem o dinheiro (quanto de cada R$ 100 vem do Governo Federal), quantos leitos e profissionais o SUS tem na cidade (números absolutos do CNES, com o mês do cadastro) e se o remédio está na Farmácia SUS, com botão para a busca. Fora do estado "conforme" a farmácia mostra só o texto e o botão, sem números. A execução do Fundo (reservado, entregue e pago) vira uma seção à vista, com três barras, e uma linha-resumo leva a "Para fiscalizar". A produção do SUS sai do topo, porque sem régua não responde se o cidadão consegue ser atendido, e abre a seção "Quanto atendimento o SUS registra na cidade?" com uma frase em linguagem comum, o período de cada medida e a média por mês (o por mil moradores fica no "Ver detalhes"), dizendo que inclui gente de outras cidades e que não mostra tempo de espera nem vaga. O painel de quatro indicadores saiu do topo; emendas, contratos e fornecedores continuam em "Para fiscalizar". Os totais de "Medicamentos e insumos" saíram do topo; "Contratos vinculados" e "Fornecedores ativos" passaram para o resumo de "Para fiscalizar".
* **Saúde com "para entender" primeiro e "para fiscalizar" no fim:** a página segue topo, alerta, O que entrou, Como mudou ao longo dos anos, leitos e profissionais por mil moradores e produção do SUS; Como o Fundo contrata, Quem recebe o dinheiro da saúde e as emendas ficam num bloco "Para fiscalizar", recolhidas, cada uma com um resumo com número à vista. Abrem pela âncora, pelo link de licitação e na impressão. Anos sem dado da fonte saem das séries de rede e produção, o período no título mostra só o ano quando há um, e o texto da produção diz "feitos na cidade", com o aviso de que quem se trata em outra cidade não entra na conta de onde mora.
* **IDEB comparado com a média do estado e a do Brasil:** o topo da educação mostra os dois mínimos lado a lado, o investimento por aluno e os alunos na rede, e o IDEB dos anos iniciais e finais lado a lado com o ano da nota, a média da rede pública do estado e a do Brasil na barra e uma frase que compara a variação da nota com a da média estadual. A meta do MEC, que só existe até 2021, sai da página.
* **Topo da educação em blocos-pergunta:** o Fundeb dos profissionais, os alunos com o valor por aluno e o gasto (reservado, liquidado e pago, em três barras com o percentual do reservado) viram blocos curtos, cada um com a pergunta como título, um número, uma barra e uma ou duas linhas. Quando há emendas, um resumo logo no topo mostra autorizado, confirmada na receita e empenhado no cadastro, com link para a seção completa em "Para fiscalizar". O aviso do Fundeb passa a ter barra com o marcador do mínimo.
* **Educação com "para entender" primeiro e "para fiscalizar" no fim:** a página segue topo, Aprendizado dos alunos, O que entrou e Como mudou ao longo dos anos; emendas, Como o Fundo contrata, Ver todos os contratos e Quem recebe o dinheiro da educação ficam num bloco "Para fiscalizar", recolhidas, cada uma com um resumo com número à vista. As seções abrem pela âncora, pelo link de contrato e na impressão. A ressalva do ano em andamento aparece uma vez, no topo; o aviso das emendas ficou mais curto sem perder autorizado, confirmada na receita, empenho e onde conferir. Nenhuma informação saiu da página, exceto o total do valor da categoria no modal de "Como o Fundo contrata" e a frase de ano parcial do modal de valor por aluno, retirados por decisão do Julio (o ano parcial é dito uma vez no topo).
* **Textos do topo de educação revisados:** o aviso de ano em andamento fica abaixo da barra do mínimo, o IDEB diz a meta do MEC e o ciclo anterior, o Fundeb diz "pelo menos 70% dos recursos do Fundeb", a locação de imóveis usa a redação do art. 74, V da Lei 14.133/2021 e o modal do valor por aluno cita o método oficial do SIOPE (despesa com MDE dividida pelo número total de alunos matriculados).
* **Lei e fonte em cada bloco do topo:** cada bloco-pergunta do topo de educação traz a sua lei e a sua fonte (SIOPE, Lei 4.320/1964 com a execução orçamentária ligada ao portal oficial, CF/88 nas emendas); o gasto (reservado, liquidado e pago) fica à vista, e o SAEB e a taxa de aprovação sobem para abaixo do aviso do IDEB.
* **O que entrou com barra empilhada sem cor repetida:** as três maiores fontes têm cor própria e as demais somam um segmento cinza, em 2 colunas no celular; o aviso "O dinheiro das emendas chegou?" desce para abaixo dos indicadores das emendas.
* **Barras do topo de educação alinhadas:** as duas barras ficam na mesma altura, mais grossas e sem o rótulo do marcador; o IDEB mostra o marcador e o valor da média da rede pública do estado.
* **Topo de educação mais limpo:** a barra fica logo abaixo do valor, o IDEB ganha a sua barra com a média do estado, o Fundeb dos profissionais fica só em texto, o gasto (reservado, liquidado e pago) aparece à vista e o SAEB e a taxa de aprovação sobem para logo abaixo do aviso do IDEB.
* **Educação abre com dois destaques:** o topo mostra, lado a lado e sem quadro em volta, o mínimo exigido em ensino (número grande, barra quadrada com o marcador do mínimo e o aviso em texto só quando está abaixo do mínimo; "cumpriu" fica na leitura acessível da barra) e o IDEB dos anos iniciais (nota, faixa, variação contra o ciclo anterior, meta do MEC em texto e barra com o marcador da média da rede pública do estado), no padrão de `/despesas`. Abaixo, num painel, a parte do Fundeb paga aos profissionais (só texto, com tom pela posição frente ao mínimo), o valor por aluno e os alunos na rede (a divisão infantil e fundamental; a exclusão de médio, EJA e educação especial fica em "Ver detalhes"). Leis e fonte formam uma única linha "Leis: … · Fonte: …" e todo "Ver detalhes" fica em linha própria. "Aprendizado dos alunos" mostra, por etapa, nota, classificação e meta em indicadores, com a barra da meta embaixo; a variação não tem indicador quando não mudou. "O que entrou" ganha barra empilhada com as fontes.
* **Educação abre pelo aprendizado:** "Aprendizado dos alunos" sobe para logo abaixo do hero, antes das seções financeiras, respondendo se as crianças da rede municipal estão aprendendo. Cada etapa junta a nota do IDEB com o ciclo anterior (ano e variação em pontos, "subiu"/"caiu") e mostra quantas posições o município subiu ou caiu no ranking estadual. A variação de posição e a de nota aparecem ao lado do valor (verde sobe, vermelho desce, nada se não mudou), "Meta" vem depois da classificação, e quando as redes avaliadas mudaram a tela diz em quantas redes a comparação foi feita.
* **Valor por aluno na educação:** a página mostra quanto a Prefeitura investe por aluno da rede municipal (SIOPE, declarado ao FNDE, em R$ da época), com a variação sobre o ano fechado anterior e o histórico em "Ver detalhes". Ano em andamento é parcial e não é comparado; sem valor, a tela diz a causa.
* **Mínimo de educação:** a página mostra quanto a Prefeitura aplicou em ensino (MDE, SIOPE) ao lado do mínimo de 25% da Constituição, com "cumpriu" ou "ficou abaixo" (indício, não acusação) e a lei com link. Ano em andamento é parcial, sem veredito. Também mostra o Fundeb pago aos profissionais da educação ao lado do mínimo de 70% (60% até 2020), com a lei e o mesmo veredito.
* **Educação abre com três respostas:** o topo traz uma faixa com o mínimo exigido, o valor por aluno e a nota do IDEB, cada uma com a sua régua, e os detalhes vêm na mesma ordem. Reservado, liquidado e pago passam a ser a memória de cálculo, em "Ver detalhes"; origem do dinheiro, evolução anual, contratos e fornecedores descem para o fim. Os textos dos dados do SIOPE agora dizem de onde vêm: enviados pela Prefeitura ao FNDE e publicados pelo FNDE.
* **Seções na ordem da pergunta do cidadão:** O que entrou, Como mudou ao longo dos anos, Como o Fundo contrata, Quem recebe o dinheiro da educação, Aprendizado dos alunos e Emendas na educação. O IDEB passa a ser lido por etapa (Anos Iniciais e Anos Finais), com ano de apuração, meta, ciclo anterior e classificação entre as redes municipais do estado.
* **Contratos só do Fundo:** A lista deixa de misturar contratos de outros órgãos que citavam escola ou merenda no objeto.

### ✨ Novas Funcionalidades (Added)
* **Registro de coletas por fonte:** cada `elt/load/run.py` concluído grava em `raw_coletas.registro_coletas` uma linha por portal e fonte carregada (Fiorilli, SICONFI MSC e RGF, PNCP, ObrasGov e Farmácia SUS, esta só quando a coleta teve sucesso), com `coletado_em` e a `frequencia_esperada` lida do catálogo único `seed_fontes_coleta.csv`. O mart `fct_coletas_por_fonte` lista toda fonte do catálogo para todo portal com a última coleta; fontes cuja carga ainda não grava registro (SIOPE, SIOPS, rede de saúde, INEP, emendas estaduais, receitas em CSV) aparecem como `nao_monitorado`, e fonte monitorada sem coleta como `sem_registro`, nunca presumidas atualizadas.
* **Origem das "Entradas fora do orçamento" em `/receitas`:** Bloco recolhido "De onde vem este valor" mostra, por categoria (previdência, imposto de renda, empréstimos, planos de saúde etc.), de onde vem o valor retido e repassado. A classificação é aproximada e feita pela descrição do lançamento.
* **`fct_receita_extra_orcamentaria_categoria` e `getReceitaExtraOrcamentariaOrigem`:** Novo mart dbt por portal, entidade e ano, e a query correspondente em `@transparencia/db`, com `categoria`, `valorArrecadado` e `percentualDoTotal`.
* **Emendas do Estado em Saúde e Educação:** a lista oficial das emendas que o Estado registra para o município, com objeto, autor, como o dinheiro chega (repasse à Prefeitura, o Estado executa ou organização da sociedade civil), conferência com o cadastro da Prefeitura e a execução do Estado com a posição do relatório. A fonte aparece sempre (órgão, arquivo, data e link oficial), e cada Estado é uma configuração própria em `elt/fontes/emendas_estaduais.yml`; Estado sem fonte mostra um aviso neutro.
* **"O dinheiro que o Estado diz ter pago já aparece na receita da Prefeitura?":** novo `fct_emendas_estaduais_receita` e `getComparacaoReceitaEstadual` comparam o pago do Estado, nas emendas que chegam à Prefeitura, com o arrecadado em "outras transferências dos Estados" no mesmo ano. A diferença "ainda não aparece na receita" é dita como calculada pelo portal; sem informação, com relatório de outro ano ou sem linha única da alínea, a tela diz que não foi possível comparar. Avisa que o relatório do Estado não separa restos a pagar. Só as transferências especiais entram na comparação (fundo a fundo e finalidade definida ficam de fora até haver parecer contábil), e o cartão aparece só na saúde. Se a consulta falhar, a tela diz que não conseguiu carregar, em vez de "sem fonte".
* **Alunos na rede municipal (Censo Escolar/INEP via IBGE):** novo `make elt/inep-censo PORTAL=...` consulta a API de dados do IBGE (pesquisa 13, "Censo escolar - sinopse", `servicodados.ibge.gov.br`), soma as matrículas municipais da educação infantil (creche e pré-escola) e do ensino fundamental (1º ao 9º ano) e grava em `raw_inep_censo.matriculas_rede_municipal`; o mart `fct_educacao_matriculas_metricas` e `getEducacaoMatriculas` (Censo mais recente até o ano pedido) alimentam o indicador "Alunos na rede municipal", com o ano real do Censo, ao lado do valor por aluno. Sem dado, o indicador não aparece. Decisão do spike: a Sinopse em xlsx e os microdados do INEP exigiam download de dezenas de MB por ano (e o servidor do INEP envia a cadeia TLS incompleta); a API do IBGE entrega a série completa (até 2025) por município, sem chave.
* **Média nacional do IDEB (`seed_inep_ideb_brasil`):** novo seed com a média da rede pública do Brasil por etapa e ano (2021 em diante), gerado por `elt/scripts/sync_ibge_ideb_brasil.py` a partir da pesquisa 40 da API do IBGE (INEP), e `getEducacaoMediasNacionais` em `@transparencia/db`. O seed não se atualiza sozinho: rode o script a cada novo ciclo bienal e aplique `dbt seed` em produção antes do deploy (Regra 15).
* **Carga dos indicadores do SIOPE (FNDE):** novo `make elt/siope PORTAL=...` grava no raw os indicadores 4.1, 4.2, 4.8, 4.9, 1.1 e 1.2 do Relatório Gerencial, por portal, ano e período. Resposta inesperada ou com lacuna não grava nada.
* **`fct_educacao_execucao_metricas`:** Novo mart dbt por portal e ano com empenhado, liquidado e pago da função 12.
* **`getEducacaoExecucaoAnual` e `getTopFornecedoresEducacaoMetrics`:** Série anual e maiores fornecedores da função 12 em `@transparencia/db`.
* **Mínimos legais no SIOPE:** `getEducacaoSiope` devolve `minimos` (MDE e Fundeb) comparados ao mínimo vigente de `seed_constantes_fiscais` (novas chaves `minimo_aplicacao_mde_percentual` e `minimo_fundeb_profissionais_percentual`, 60% até 2020 e 70% desde 2021).
* **`getEducacaoFundoEmpresaIds`:** Identifica a empresa do Fundo Municipal de Educação pelo órgão.

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Home reorganizada:** abre com "Situação da cidade" (nome do município e período dos dados), seguida de "Como está a cidade hoje", "Para onde vai o dinheiro público" (total arrecadado com o percentual da previsão e o saldo disponível nas contas da Prefeitura) e "Mais detalhes" (atalhos para Despesas, Licitações e Pessoal). O Radar Cívico, o pipeline de execução e os cards secundários saem da home; a página `/radar` e o pipeline do orçamento continuam. A home não tem seletor de ano no conteúdo.
* **Topo de educação mais enxuto:** "cumpriu o mínimo" sai do texto e fica só na barra (abaixo do mínimo e ano em andamento seguem em texto); o IDEB do topo mostra a meta do MEC em texto e a barra marca a média da rede pública do estado; o valor por aluno diz só "R$ da época" e a nota da inflação fica no detalhe; alunos na rede mostram a divisão infantil e fundamental, e o Censo e a exclusão do ensino médio, EJA e educação especial ficam num novo "Ver detalhes". O painel "Emendas na educação / Contratos do Fundo" sai da página (a seção de emendas e os contratos seguem). "O que entrou" dá cor às três maiores fontes e o cinza às demais. As leis de "Como o Fundo contrata" vão para o fim da seção. A tabela de "Investimento por aluno ano a ano" usa o estilo padrão das tabelas e o texto dos modais usa o tamanho pequeno.
* **`ThresholdMeter` com segundo marcador:** o parâmetro opcional `secondaryThreshold` desenha uma segunda referência na mesma escala, em outra cor (média nacional ao lado da estadual no IDEB).
* **Aprendizado dos alunos mais simples:** a seção deixa de repetir nota, classificação e meta do topo e fica com o seletor de etapa, o gráfico da nota com as médias estadual e nacional e uma frase em caixa de aviso com a posição entre as redes municipais e a variação de posições desde o ano anterior; SAEB e taxa de aprovação passam para "Ver detalhes: IDEB". Textos da página de educação encurtados e com a primeira letra maiúscula.
* **`ThresholdMeter` (`@transparencia/ui`):** barra quadrada com marcador de mínimo ou meta, rótulo e valor acessível por texto (`role="meter"`), reaproveitável em outras páginas, com testes de quadratura e de tokens.
* **"Ver detalhes" único na educação:** link pequeno (14px, sublinhado, alvo de toque por área) no componente `VerDetalhesLink`, em todas as seções. Os modais de educação passam a ter lei e fonte no rodapé, no mesmo formato; `NOTA_DECLARACAO`, `NOTA_INFLACAO`, `Veredito` e a descrição de variação do valor por aluno existem uma só vez. Em "Como o Fundo contrata", as leis saem da frase da descrição e vão para a linha "Leis:", e cada card tem "Ver detalhes".
* **Textos do SIOPE em linguagem cidadã na educação:** a origem do dado agora diz que a Prefeitura informa o número ao governo federal pelo SIOPE e que o portal o mostra como foi publicado, sem recalcular. "Sem dado do SIOPE" virou "sem dado publicado", "ainda sem veredito" virou "o resultado só fica claro quando o ano fechar" e a ausência de posição no ranking do IDEB explica que a posição do ciclo anterior não está disponível. Glossário ganhou SIOPE, FNDE e MDE.
* **Ranking do IDEB por ciclo real:** `getEducacaoRankingEstadual` compara com o último ano anterior que tem notas da etapa na UF (não mais `ano - 2` fixo), devolve `anoCicloAnterior` e `totalMunicipiosCicloAnterior` e calcula `variacaoPosicoes` só entre as redes presentes nos dois ciclos (`redesComparadas`), com empates dividindo a mesma posição (`classificarRedes`, `calcularVariacaoPosicoes`).
* **Reservado da educação pelo empenho líquido:** `fct_educacao_execucao_metricas` soma `empenhado_liquido` (descontadas as anulações) em vez do empenhado bruto, que inflava o reservado em 3% a 9%. A parte paga aos maiores fornecedores passa a usar como base o pago sem salários (`pago_sem_pessoal_educacao`), a mesma base da lista de fornecedores.
* **`panel` clicável:** Novas classes `panel-top` (borda no topo) e `panel-interactive` (cursor, borda `line` → `brand-fill` no hover e no foco, anel de foco, estado desabilitado), documentadas em `DESIGN.md` e `EXPERIENCE.md` e usadas nos cards de categoria de contratos.
* **Contratos da educação:** A tabela completa passa ao formato compacto com linha expansível (padrão das licitações em aberto da saúde), com cartão de resumo no celular; o modal de cada categoria usa a mesma tabela. A base legal fica no subtítulo da seção.
* **Aprendizado dos alunos:** O seletor de etapa do gráfico fica ao lado do título do gráfico, e a nota sobre o IDEB usa o `AlertBox`.
* **"O que entrou":** O detalhe de cada fonte mostra o ano a ano em barras quadradas e a composição em tabela, no padrão do `DESIGN.md`.
* **`getEducacaoContratos`:** Passa a filtrar só pelo `empresa_id` do Fundo, sem busca de texto no objeto nem na fonte de recursos.
* **`EvolucaoAnual` e `EmendasSection`:** Renomeados de `SaudeEvolucaoAnual` e `SaudeEmendasSection` e compartilhados entre saúde e educação.
* **`SectionHeader`:** A cópia local de `apps/web/components` saiu; saúde, educação e previdência usam a versão de `@transparencia/ui`.

### 🗑️ Removido (Removed)
* **Painel fiscal da educação:** Saem o gráfico despesa × IDEB, o Troféu Cívico, a barra de composição de "O que entrou", as colunas `despesa_liquidada_educacao`, `custo_anual_por_aluno` e `total_matriculas_rede_municipal` de `fct_educacao_metricas`, o seed `seed_censo_escolar_matriculas` (12 valores sem fonte rastreável) e os campos de custo e matrículas dos DTOs. O valor por aluno volta quando vier do SIOPE.

### ⚖️ Governança & Documentação Pública (Governance & Docs)
* **`llms.txt` e `llms-full.txt`:** Descrevem a nova página de educação e os contratos do Fundo.
* **Média nacional do IDEB na cadência da Epic 23:** a Story 23.8 passa a incluir o `seed_inep_ideb_brasil.csv` no workflow mensal `check-inep-ideb-updates.yml`, com o `dbt seed` antes do deploy. `llms.txt` e `llms-full.txt` descrevem o novo topo da educação, o IDEB com as médias estadual e nacional e a seção de aprendizado simplificada; o glossário do cidadão ganha a entrada EJA.
* **`docs/glossario-cidadao.md`:** Nova entrada IDEB.

### 🌟 Destaques da Versão (Despesas detalhadas com os dados existentes)
* **Início da página de Despesas:** O topo mostra o "Dinheiro que saiu (pago)" no ano em destaque e uma frase com a parte já paga do valor reservado, avisando que o restante não é necessariamente dívida. Abaixo ficam os cards Reservado (empenhado) e Serviço entregue (liquidado) e a explicação "Como ler estes números". As barras comparativas e o card "Quanto já foi pago" saíram.
* **Quem mais recebeu e quem mais espera receber:** Cada fornecedor expande para mostrar o documento e, quando é CNPJ completo, o link "Ver licitações e contratos", que abre a busca de `/licitacoes` já preenchida em todos os anos. CPF nunca vira link. A folha de pagamento dos servidores não entra na lista de fornecedores, e os restos a pagar passam a ser somados por fornecedor e documento.
* **Gastos registrados como "Outros":** O termômetro de opacidade foi reescrito em linguagem cidadã, com a lei citada como link e uma barra de faixas verde (até 15%), amarela (15% a 30%) e vermelha (acima de 30%), com um único marcador na taxa atual.

### ✨ Novas Funcionalidades (Added)
* **Busca de licitações pré-preenchida (`?q=`):** `LicitacoesSearchBar` e `LicitacoesSpotlightModal` aceitam `termoInicial`, abrem a busca preenchida em todos os anos e removem `q` da URL ao fechar. Valores repetidos de `q` usam o primeiro e são limitados a 100 caracteres.
* **`FornecedorDocumentoDetalhe`:** Novo componente com o documento do fornecedor e o link por CNPJ, usado em "Quem mais recebeu" e "Quem mais espera receber".
* **Seletor de etapa por área:** A seção de áreas alterna entre Reservado, Serviço entregue e Dinheiro que saiu, com os três valores de cada área no detalhe.

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **`getTopFornecedoresExecucaoMetrics`:** Exclui o grupo de natureza 1 (pessoal), cujos empenhos globais de folha vinham com o nome do primeiro servidor.
* **`getRestosAPagarResumoMetrics`:** `RestosAPagarVendorItemDTO` ganha `fornecedorDocumento`, e os fornecedores são agregados por nome e documento antes do top 5.
* **Tokens de cor `ok-fill` e `danger-fill`:** Novos tokens de preenchimento (tema claro e escuro) em `globals.css` e `tokens.ts`, ao lado do `warn-fill`, para barras e faixas com melhor contraste.
* **Listas no padrão de barras da página:** Radar de Gastos Sensíveis, restos a pagar, tipos de gasto e fornecedores seguem o mesmo padrão de lista, sem divisórias e com barras de cantos retos.

### ⚖️ Governança & Documentação Pública (Governance & Docs)
* **`llms.txt` e `llms-full.txt`:** Descrevem o novo resumo de despesas, a exclusão da folha em "Quem mais recebeu", o link por CNPJ, "Quem mais espera receber", o termômetro em linguagem cidadã e a busca `?q=`.

### 🌟 Destaques da Versão (Remédios só com lote vencido na Farmácia SUS)
* **Remédio só com lote vencido não parece mais disponível:** Na busca, no índice A–Z e nos remédios essenciais da Farmácia SUS, o remédio cujos lotes com saldo estão todos vencidos deixa de ser um link e aparece como "Sem lote dentro da validade na lista", com o botão "Pedir esclarecimento". Isso aparece também quando a busca traz outros remédios. A lista não prova falta de estoque nem entrega de remédio vencido.
* **Mesmo critério em todas as telas:** Só conta como lote utilizável o que tem saldo maior que zero e validade em dia (ou sem validade informada), na busca, no índice e no indicador de lotes a vencer.

### 🌟 Destaques da Versão (Cores do portal e tema escuro opcional)
* **Cores padronizadas:** As cores do portal passam a vir de uma única paleta, com texto cinza e avisos mais escuros para ficarem legíveis (contraste mínimo de 4,5:1). Os avisos amarelos/laranja, os vermelhos de alerta e os verdes de sucesso ficam um pouco mais escuros, e o fundo da página passa a ser branco em vez de cinza claro.
* **Tema escuro preparado:** A base do tema escuro está pronta, mas ainda não há botão para ativá-lo e várias telas continuam só com cores do tema claro.

### 🌟 Destaques da Versão (Mapa da Farmácia SUS sem prender a rolagem)
* **Rolar a página sem travar no mapa:** No mapa das unidades da Farmácia SUS, a roda do mouse só aplica zoom com Ctrl (⌘ no Mac) pressionado, e no celular o mapa só se move com dois dedos. Com um dedo, a página continua rolando normalmente, e um aviso explica como mexer no mapa. É o mesmo comportamento do mapa de obras.

### 🌟 Destaques da Versão (Índice A–Z na Farmácia SUS)
* **Procurar remédio por letra:** A página da Farmácia SUS ganhou a seção "Procurar por letra", entre a busca e os resultados. Cada letra mostra 3 remédios com "N de M unidades" e o link "Ver todos com A"; o botão "Ver mais" revela as próximas letras, de 6 em 6. No celular, a faixa de letras rola na horizontal. A letra escolhida fica no endereço da página (`?letra=A`), então o link pode ser compartilhado. Letras sem remédios ficam desabilitadas.
* **Grupo "0–9" no índice:** Remédios cujo nome não começa com letra (número ou símbolo) ganham o chip "0–9", depois do Z. O chip só aparece quando existe algum, então nenhum remédio fica fora do índice.
* **Busca por remédios com espaços duplicados:** A busca da Farmácia SUS agora encontra remédios cujo nome vem da fonte com espaços duplicados (ex.: "XAROPE  120 ML"), como os que aparecem no índice A–Z. Antes, clicar no nome da lista podia dizer que o medicamento não foi encontrado.

### 🌟 Destaques da Versão (Download do estoque da Farmácia SUS)
* **Lista completa de estoque em planilha:** Na seção "Fonte dos dados" da página da Farmácia SUS, o link "Baixar a lista completa de estoque (planilha CSV)" baixa o que cada unidade informou ter em estoque na lista mais recente, com lote, quantidade e validade quando informada. Se um remédio não aparece, isso não prova que faltou: a unidade pode não ter informado.

### 🌟 Destaques da Versão (Remédios comuns e essenciais na Farmácia SUS)
* **Remédios comuns na página inicial:** O card da Farmácia SUS na Visão Geral mostra atalhos "Exemplos:" (dipirona, paracetamol, losartana, metformina, amoxicilina e omeprazol) que abrem a busca já preenchida. Só aparecem remédios que alguma unidade informou em estoque, então o clique sempre traz resultado.
* **Remédios essenciais sob a busca:** A página da Farmácia SUS mostra 21 medicamentos da RENAME 2024 (como losartana, metformina e dipirona) com "N de M unidades que informaram estoque" e link para a busca. Quando nenhuma unidade informa o item, o texto é "não aparece na lista de estoque"; se o remédio só existe em combinação com outro (ex.: valsartana + hidroclorotiazida), o bloco avisa isso. A fonte só publica itens com saldo, então não é ranking de demanda nem afirmação de falta.
* **Botão "Limpar busca":** A página da Farmácia SUS ganhou um botão para limpar a busca e voltar à lista completa.
* **Pipeline da Farmácia SUS:** `make elt/farmacia-sus` agora recria o seed de medicamentos essenciais e reconstrói a tabela de disponibilidade a cada execução.
* **Menu lateral mais espaçado:** O espaçamento entre os itens do menu lateral (`Sidebar`) ficou uniforme em telas grandes e pequenas, com mais respiro entre os grupos.

### 🌟 Destaques da Versão (Histórico da Farmácia SUS)
* **Histórico de estoque:** O estoque de medicamentos da Farmácia SUS passa a ser acumulado a cada coleta, sem apagar dias anteriores, o que permite medir por quanto tempo uma unidade ficou sem informar estoque. A fonte do sistema de origem também passa a ser registrada.
* **Histórico de coletas:** Cada execução da coleta fica registrada, inclusive as que falharam, sem afetar o estoque já guardado. A tela atual continua usando apenas a coleta mais recente.

### 🏛️ Engenharia de Dados & Modelagem dbt (Data & Analytics)
* **`seed_fontes_recursos_stn_referencia_portais`:** Novo seed com os pares fonte e descrição observados nos portais, usado para checar `seed_fontes_recursos_stn`. Os pares confirmados contra a Portaria STN (1551, 1552 e 1553) falham o teste se divergirem; os demais geram aviso.
* **`seed_fontes_recursos_stn`:** Descrições das fontes 1704, 1705, 1708, 1710, 1715, 1719, 1720, 1721, 1750, 1751 e 1755 corrigidas conforme a Portaria STN nº 710/2021; 1750 e 1755 deixam de ser `meio_ambiente` e passam a `outros_vinculados`. Incluídas as fontes 1571, 1575, 1631, 1632, 1636, 1702, 1706, 1707, 1711, 1716, 1748 e 1862. O `CASE` de fallback de `fct_saldo_caixa_siconfi` deixa de listar 1750 e 1755 como `meio_ambiente`.
* **Testes de coerência das fontes STN:** Novos testes `assert_fontes_stn_coerentes_com_portais` (erro), `assert_fontes_stn_pendentes_de_conferencia` (aviso) e `assert_fontes_stn_ausentes_no_seed` (aviso, inclui as fontes de `fct_receitas`).

## [1.23.2] - 2026-10-23

### 🌟 Destaques da Versão (Origem dos Recursos da Educação)
* **Rendimentos no programa de origem:** Na tela "De onde vem o dinheiro", os rendimentos de aplicação financeira passam a somar ao programa que os gerou (PNATE, PNAE, FUNDEB, salário-educação e FNDE), em vez de aparecerem em "Outras receitas". No PNATE de Porciúncula em 2026, o total passa de R$ 36.089,58 para R$ 39.167,25.
* **Royalties em destaque:** A tela passa a mostrar o grupo "Royalties", com repasses e rendimentos de royalties do petróleo recebidos pelo fundo de Educação.

### ✨ Novas Funcionalidades (Added)
* **Card "Royalties" (`apps/web`):** Novo grupo na composição e nos cards de origem dos recursos. O detalhe cita a [Lei nº 12.858/2013](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12858.htm) (partilha destinada à educação) e a [Lei nº 7.990/1989](https://www.planalto.gov.br/ccivil_03/leis/l7990.htm) (compensação financeira pela produção de petróleo). A base legal de cada grupo passa a aceitar mais de uma lei.

### 🏛️ Engenharia de Dados & Modelagem dbt (Data & Analytics)
* **`fct_receitas` e `int_receitas_consolidadas`:** Nova coluna `codigo_fonte_stn`, com a fonte STN só em dígitos (ex.: `1553`; legado `11230000`). Fica nula quando o código de receita não traz fonte ou traz mais de uma. O grão e a chave da tabela não mudam.
* **`fct_educacao_origem_recursos_metricas`:** Naturezas específicas de programa decidem o grupo. Naturezas genéricas, como o rendimento de depósitos bancários (`1321.01`), seguem a fonte STN. Novo grupo `royalties` (fontes 1573, 1704, 1705 e 1720).
* **`seed_fontes_recursos_stn`:** As fontes 1551, 1552 e 1553 estavam trocadas. O correto é PDDE, PNAE e PNATE.

### ⚖️ Governança & Documentação Pública (Governance & Docs)
* **`llms.txt` e `llms-full.txt`:** Passam a descrever o grupo Royalties, as duas leis citadas e a regra de rendimentos somados ao programa de origem.

## [1.23.1] - 2026-10-21

### 🌟 Destaques da Versão (Avise-me: cidade em breve)
* **Cidades mais pedidas:** O registro de uso do formulário "Avise-me quando minha cidade chegar" passa a indicar qual cidade foi solicitada, para priorizar os próximos municípios do portal. O e-mail continua fora das métricas.

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Evento `city_interest_submitted` (`apps/web`):** Além da UF, o evento do PostHog passa a enviar `cidade` (texto informado, em minúsculas e sem espaços nas pontas) quando o pedido é gravado com sucesso. Isso substitui a regra da versão 1.23.0, na qual apenas a UF era enviada; o e-mail segue sem ser enviado.

## [1.23.0] - 2026-10-21

### 🌟 Destaques da Versão (Avise-me: cidade em breve)
* **Avise-me quando minha cidade chegar:** Quem mora em um município que ainda não está no portal agora pode deixar a cidade e o e-mail na página de seleção e ser avisado quando ela entrar.

### ✨ Novas Funcionalidades (Added)
* **Aviso de cidade em breve (`apps/web`, `@transparencia/db`):** A seleção de município ganha o bloco "Em breve" ("Sua cidade ainda não está aqui") com o formulário "Avise-me quando minha cidade chegar" (cidade, estado, e-mail e aceite com link para a Política de Privacidade). O pedido é gravado em `public.city_interest_requests` (migração 004) de forma idempotente por e-mail, cidade normalizada e UF, via `registerCityInterest` e a rota `POST /api/city-interest`, com honeypot e limite de tentativas por IP e por e-mail. Eventos do PostHog (`city_interest_cta_clicked`, `city_interest_modal_opened`, `city_interest_form_started`, `city_interest_validation_failed`, `city_interest_submitted`, `city_interest_submit_failed` e `city_interest_modal_closed`) medem o uso do formulário sem enviar e-mail nem o texto da cidade, apenas a UF. Nesta etapa não há e-mail de confirmação.

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Migração 004 e permissões (`@transparencia/db`, `elt`):** `004_create_city_interest_requests` cria `public.city_interest_requests`, e `elt/migrations/grant_readonly.sql` concede ao papel `read_only` as permissões de escrita e a política RLS da nova tabela, como nas tabelas da newsletter e de push.

### ⚖️ Governança & Documentação Pública (Governance & Docs)
* **Guias de IA (seleção de município):** `llms.txt` e `llms-full.txt` descrevem a página `/` com o bloco "Em breve" e o pedido de aviso, sem prometer municípios.

## [1.22.0] - 2026-10-19

### 🌟 Destaques da Versão (Educação: origem dos recursos)
* **De onde vem o dinheiro da Educação:** A página de Educação passa a mostrar quanto o Fundo Municipal de Educação arrecadou em cada fonte (FUNDEB, complementação da União, salário-educação, PNAE, PNATE e outras), com o histórico ano a ano e a base legal de cada fonte.
* **Valores de receita corrigidos:** Códigos de receita que o portal de origem informa duas vezes (linha total e linhas de detalhe) deixam de ser somados em duplicidade. Valores já publicados nesses códigos mudam.
* **Contratos da Educação mais fáceis de navegar:** Cards por categoria, com a lista completa em janela de detalhes.

### ✨ Novas Funcionalidades (Added)
* **Página da Farmácia SUS (`apps/web`):** Nova rota `/[portalSlug]/farmacia`, com item "Farmácia" no menu lateral logo abaixo de "Radar Cívico", para o cidadão descobrir em qual unidade há o remédio: busca vazia por padrão, resultados por unidade com "Ver mais unidades", filtro por unidade, mini-mapa das unidades com zoom ajustado para caber todas as unidades, legenda "N de M unidades no mapa" e selo "Estoque Transparente". Quando o estoque está sem divulgação atualizada, mostra a sentinela da Lei 14.654/2023 com os botões "Copiar Requerimento de Fiscalização" e "Compartilhar no WhatsApp". Na Visão Geral, um card-resumo leva à busca ou, em caso de apagão, à página.
* **Lotes a vencer e pedido por remédio (`apps/web`):** Quando a coleta traz validade, a página mostra os lotes que vencem em até 60 dias e quantos lotes aparecem como vencidos com saldo na lista de estoque mais recente. Nos remédios essenciais que não aparecem na lista de estoque, o link "Pedir esclarecimento" abre uma janela com o pedido pronto e editável, que pode ser copiado ou compartilhado por WhatsApp, à Secretaria Municipal de Saúde, com links das leis.
* **Medição do pedido de esclarecimento (`apps/web`):** O PostHog registra abrir, editar (uma vez), clicar nas leis, copiar, compartilhar no WhatsApp e fechar o pedido (`farmacia_pedido_*`), só com o remédio e se houve edição. O texto do pedido nunca é enviado.
* **Query `getFarmaciaLotesAVencer` (`@transparencia/db`):** Conta lotes a vencer, remédios, lotes já vencidos com saldo e o vencimento mais próximo na posição vigente de cada unidade, lendo `fct_farmacia_estoque_historico`.
* **Queries `getFarmaciaSus` e `getResumoFarmaciaSus` (`@transparencia/db`):** Leem o mart `fct_farmacia_estoque` com status, datas e unidades agrupadas por portal. Portal sem linhas equivale a `indisponivel`.
* **Origem dos Recursos da Educação (`apps/web`):** Novo bloco "De onde vem o dinheiro", entre o painel fiscal e os contratos, com barra de composição e cards por fonte. O modal "Ver detalhes" traz a série ano a ano com o ano selecionado destacado, a composição por natureza de receita e o link da lei no Planalto. A parcela cuja origem o portal não informa aparece como "Não detalhado", de modo que o total do bloco fecha com a receita oficial do Fundo. O ano em andamento é marcado como "parcial", com o mês de referência vindo da data da última extração. O bloco informa que o aporte da Prefeitura ao fundo não está incluído.
* **Contratos da Educação por categoria (`apps/web`):** A seção de contratos passa a exibir cards por categoria com valor total, percentual pago do empenhado e quantidade de contratos; cada card abre a lista da categoria ordenada por valor, e a tabela completa permanece abaixo dos cards em telas largas.
* **Query `getEducacaoOrigemRecursos` (`@transparencia/db`):** Devolve, por portal e ano, as fontes com valor, percentual do total, histórico anual, composição, `anoParcial` e `mesReferencia`. Retorna `null` quando o portal não tem órgão de Educação.

### 🏛️ Engenharia de Dados & Modelagem dbt (Data & Analytics)
* **Pipeline ELT da Farmácia SUS (`elt`):** Extrai estoque de medicamentos (BNAFAR/Hórus) e estabelecimentos (CNES) do Ministério da Saúde por município, carrega em `raw_farmacia_sus` e expõe o mart `fct_farmacia_estoque` com o status `conforme`, `apagao` ou `indisponivel` (posição defasada há mais de 15 dias, calculada por unidade) e as coordenadas das unidades. Falha de coleta nunca vira apagão. Roda dentro do `ingestion-pipeline.yml` e localmente com `make elt/farmacia-sus`. A interface chega na Story 19.5.
* **Mart `fct_educacao_origem_recursos_metricas` (`elt`):** Receitas orçamentárias folha do(s) órgão(s) de Educação (`dim_orgao`, `orgao_nome ilike '%edu%'`), classificadas em `fundeb`, `fundeb_complementacao_uniao`, `salario_educacao`, `pnae`, `pnate`, `outros_fnde`, `outras_receitas` e `nao_detalhado`. A classificação cobre a tabela de naturezas usada a partir de 2022 (`1751`, `1714`, `1715`) e a anterior (`1758.01`, `1718.05`, `1718.09`).
* **Teste `receitas_folhas_conciliam_com_topo`:** Compara a soma das folhas com o total oficial por portal, ano e entidade. Mantido como aviso, pois o portal informa linhas-mãe maiores que a soma das filhas.
* **Fontes `receita_orcamentaria`:** `fontestn` e `fonte_stn` declaradas em `_sources.yml` e expostas pelo staging dos dois portais.

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Download de receitas (`elt`):** O downloader aceita nomes alternativos de entidades por portal (`entidades_alternativas`), exige texto exato do combo, confere a entidade exibida e registra em `failed_requests.csv` as entidades indisponíveis, com as opções do portal.

### ⚖️ Governança & Documentação Pública (Governance & Docs)
* **Guias de IA:** `llms.txt` e `llms-full.txt` descrevem o bloco de origem dos recursos, a fonte "Não detalhado" e o ano parcial.

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Dobra de receitas orçamentárias (`elt`):** `int_receitas_consolidadas` somava a linha "total" (sem fonte STN) e as linhas de detalhe por fonte STN do mesmo código, inflando em cerca de 2x qualquer leitura por código-folha. Agora vale a linha sem fonte STN quando seu valor é diferente de zero e, na ausência dela, a soma dos detalhes. Valores publicados em códigos-folha de receita orçamentária mudam.
* **Link da Lei do PNATE (`apps/web`):** URL do Planalto corrigida para `l10.880.htm`.

## [1.21.0] - 2026-10-18

### 🌟 Destaques da Versão (Reorganização da Visão Geral)
* **Indicadores Sociais em Destaque:** Na página inicial, o Card Resumo de Educação e o Painel Resumo de Obras passam a ser apresentados juntos, logo após o resumo fiscal, antes do pipeline orçamentário.

### ✨ Novas Funcionalidades (Added)
* **Seção Indicadores Sociais (`apps/web`):** Nova seção na Visão Geral (`/[portalSlug]`) que agrupa, nesta ordem, os indicadores de Educação (INEP / IDEB) e de Obras (ObrasGov.br).

### ⚖️ Governança & Documentação Pública (Governance & Docs)
* **Guias de IA:** `llms.txt` e `llms-full.txt` atualizados com a descrição da seção Indicadores Sociais na Visão Geral.

## [1.20.2] - 2026-10-18

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Gráfico de Educação (`apps/web`):** Ajuste da margem esquerda do `ComposedChart` em `EducacaoFiscalSection`.

## [1.20.1] - 2026-10-18

### 🌟 Destaques da Versão (Hotfix: Empenhos Federais em Obras)
* **Fim dos Links Quebrados em Empenhos Federais:** O detalhe da obra deixa de exibir o link direto para o Portal da Transparência do Governo Federal, que retornava página não encontrada para parte dos empenhos. A consulta complementar segue disponível pelo link "Ver no Cadastro Oficial (CIPI)" no rodapé do detalhe.

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Empenhos Federais (`apps/web`):** O código do documento era montado com a gestão `00001` fixa, e a API do ObrasGov.br não informa a gestão nem o identificador da proposta no Transferegov.br. Os empenhos passam a exibir apenas os dados informados pela fonte (número, ano, UG emitente, sistema de origem, valor e objeto).

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Qualidade de Código:** Remoção da propriedade `municipioNome` não utilizada do hero de obras, tipagem dos mocks dos testes sem `any` e ajustes de consultas e migrações em `@transparencia/db` para eliminar os avisos do Biome.

### 🗑️ Depreciações & Remoções (Removed)
* **`buildLinkOrigemEmpenho`:** Remoção da função e dos campos `linkOrigem` e `linkOrigemLabel` do view-model de empenhos federais.

## [1.20.0] - 2026-10-18

### 🌟 Destaques da Versão (Epic 18: Educação)
* **Nova Página Temática de Educação:** Quatro blocos cívicos com indicadores do IDEB (fonte INEP), despesa de educação, contratos do setor e emendas parlamentares, com comparação à média estadual calculada a partir da rede pública.
* **Educação na Página Inicial:** Card-resumo com o IDEB, a meta, a variação de posições e a despesa liquidada do exercício selecionado, replicado também no card de compartilhamento (OpenGraph).
* **Linguagem Cidadã:** Remoção do jargão técnico "Função 12" dos textos públicos de educação.

### ✨ Novas Funcionalidades (Added)
* **Página de Educação (`apps/web`):** Seções com indicadores IDEB, despesa por aluno, contratos vigentes filtrados pelo ano selecionado, emendas parlamentares da educação e totais no rodapé das tabelas.
* **Card de Educação na Home:** Indicadores do IDEB, meta e ênfase na evolução, com link para a fonte INEP e rodapé padronizado.
* **Média Estadual Dinâmica:** Exibição da média estadual do IDEB e do período calculado.
* **Segmented Button (`@transparencia/ui`):** Novo botão segmentado com contraste acessível nos filtros inativos.

### 🏛️ Engenharia de Dados & Modelagem dbt (Data & Analytics)
* **Ingestão INEP/IDEB:** Pipeline de ingestão, `dbt seed` e workflow de atualização do IDEB.
* **`fct_educacao_metricas`:** Nova fato analítica com cruzamento orçamentário e custo por aluno; predicados de despesa, testes de schema e teardown refinados.
* **Seed de IDEB Estadual:** Seed da rede pública estadual e sincronização por UF; as médias estaduais passam a ser calculadas dinamicamente em `@transparencia/db`.
* **Leitores Kysely:** Queries e DTOs tipados de métricas educacionais.

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Refatorações de UI:** Card de educação, tabela e modal de contratos alinhados ao padrão canônico, tipografia harmonizada e renderização condicional do card de contrato vigente simplificada.
* **Ano-Base:** Fallback temporal do IDEB ao ano-base bienal correspondente.

### ⚖️ Governança & Documentação Pública (Governance & Docs)
* **Guias de IA:** `llms.txt` atualizado com o card e a página de educação.
* **Diretrizes do Repositório:** `AGENTS.md` atualizado; saída renderizada do BMAD ignorada no controle de versão.

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **IDEB:** A meta de 2021 deixa de ser propagada para edições sem meta; indicadores sincronizados ao ano-base; formato compacto pt-BR.
* **Contratos da Educação:** Categorização refinada com prevenção de vazamento setorial e filtro pelo ano selecionado.
* **Gráficos e Home:** Margens dos gráficos ajustadas; o card da home segue o exercício selecionado.

## [1.19.0] - 2026-10-18

### 🌟 Destaques da Versão (Empenhos Federais de Obras e Carregamento em Lote)
* **Empenhos Federais nas Obras:** O modal de detalhes da obra passa a exibir os empenhos federais vinculados, com link para a consulta oficial no portal federal, permitindo ao cidadão conferir a origem dos recursos.
* **Carregamento mais Rápido de Obras, Licitações e Radar:** Correlação de contratos e busca de itens de licitação agora são feitas em lote, reduzindo consultas repetidas ao banco.

### ✨ Novas Funcionalidades (Added)
* **Empenhos Federais no Modal de Obras (`ObrasDetalheModal`):** Visualização dos empenhos federais da obra, com informações cívicas simplificadas e avanço da obra, e link para a consulta oficial.

### 🏛️ Engenharia de Dados & Modelagem dbt (Data & Analytics)
* **Empenhos Federais de Obras:** Extração, carga e modelagem em `elt/` dos empenhos federais associados às obras, com queries Kysely e fixtures de teste em `@transparencia/db`.
* **Consultas em Lote com Isolamento de Tenant:** Busca em lote de itens de licitação com fallback temporal (`portal_slug` preservado) e correlação em lote de contratos por obras (`getContratosPorObrasBatch`) com transformações imutáveis.

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Loaders e Cache:** Carregamento em lote e cache com granularidade ajustada nos loaders de licitações, obras e radar.
* **Refatorações:** Simplificação da lógica de correlação de contratos e do layout do modal de obras, com remoção de elementos não utilizados.

### ⚖️ Governança & Documentação Pública (Governance & Docs)
* **Guias de IA:** Atualização de `llms.txt` e `llms-full.txt` com os empenhos federais de obras.

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Chaves de Cache Determinísticas:** Serialização estável de chaves de cache, com suporte a `undefined` e datas.
* **Testes:** Correção da diretiva `ts-expect-error` no teste de empenhos federais e do mock de empenho federal no spec do modal de obras.

## [1.18.0] - 2026-10-15

### 🌟 Destaques da Versão (Canal de Feedback Cívico, Indicadores de Progresso e Otimizações de Navegação Móvel)
* **Canal Cívico de Feedback e Reporte de Erros (`FeedbackModal`):** Novo diálogo acessível e contextual integrado ao rodapé global (`GlobalFooter`), permitindo aos cidadãos enviar comentários, elogios, sugestões ou relatar problemas diretamente na plataforma, com categorização cívica e telemetria anônima via PostHog.
* **Barra de Progresso Instantânea em Transições (`ProgressProvider`):** Indicador visual de carregamento contínuo no topo da aplicação (`BProgress`), exibido durante trocas de rotas, alternância entre municípios na barra lateral e landing page, e navegação a partir do modal de obras para contratos e licitações, com timeout defensivo de 8s e prevenção de travamento.
* **Gestos Cooperativos Touch e Resiliência Cartográfica (`ObrasMapaInterativo`):** Aprimoramento da usabilidade em dispositivos móveis no mapa de obras, implementando gestos cooperativos por toque (scroll vertical livre da página com um dedo e aviso educativo para uso de dois dedos na navegação/zoom do mapa), além de blindagem de renderização com `ResizeObserver` e proteção contra erros de dimensionamento zerado ao alternar abas móveis.
* **Modernização de Dependências Core:** Atualização de pacotes do ecossistema, incluindo `lucide-react` (1.55.0), `posthog-node` (5.55.2) e `zod` (4.6.6).

### ✨ Novas Funcionalidades (Added)
* **Modal de Feedback e Reporte de Erro (`apps/web/components/feedback-modal.tsx`):** Componente modal interativo com categorias cívicas estruturadas (`elogio`, `sugestao`, `problema`, `outro`), campos de texto com contagem de caracteres, captura contextual de página/rota e disparo do evento `$feedback` via PostHog.
* **Acesso Global ao Canal de Feedback (`GlobalFooter`):** Botão acessível no rodapé de todas as páginas públicas do portal para acionamento direto do diálogo de feedback.
* **Barra de Progresso em Transições de Navegação (`ProgressProvider`):** Provedor global com listener de rotas (`RouteChangeListener`) que captura cliques em links internos e sinaliza o carregamento da nova página imediatamente.

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Sinalização de Carregamento em Ações Críticas:** Disparo de `BProgress.start()` na seleção de municípios da tela inicial (`MunicipalLandingClient`), no seletor de municípios da barra lateral (`SidebarWrapper`) e na navegação de contratos vinculados no modal de obras (`ObrasContratosVinculados`).
* **Flexibilidade no Componente de Diálogo Modal (`ModalDialog`):** Ajustes de estilização no `@transparencia/ui` para permitir modais mais compactos e limpos adequados a formulários de contato e feedback.
* **Atualização de Dependências:** Atualização de versões diretas das bibliotecas `lucide-react` (1.55.0), `posthog-node` (5.55.2) e `zod` (4.6.6).

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Gestos Cooperativos Touch no Mapa de Obras:** Desativação do arraste (`dragging`) com um único dedo para evitar o bloqueio da rolagem natural da página no celular, exibindo overlay flutuante explicativo ("Use dois dedos para mover o mapa") e reativando controles com múltiplos toques e mouse.
* **Prevenção de Falhas de Dimensionamento no Leaflet:** Tratamento defensivo em `ObrasMapaInterativo` ao disparar `flyTo` com o container em tamanho zero (`zero-size`) durante a visualização em lista no mobile, aplicando `setView` instantâneo e recalculando as dimensões com `ResizeObserver` e `invalidateSize()` assim que o mapa retorna à visibilidade.

## [1.17.0] - 2026-10-14

### 🌟 Destaques da Versão (Epic 17: Monitoramento de Obras Públicas, Auditoria Físico-Financeira e Painel ObrasGov.br)
* **Painel Completo de Obras Públicas (`/obras`):** Nova rota pública dedicada ao acompanhamento geoespacial e analítico de empreendimentos financiados com recursos federais e municipais integrados via Obrasgov.br (antigo Transferegov), permitindo visualizar investimentos totais, execução física e financeira, e geolocalização precisa no mapa interativo com gestos cooperativos.
* **Auditoria Físico-Financeira e Detalhes da Obra (`ObrasDetalheModal`):** Modal aprofundado com comparação de avanço físico versus execução financeira, histórico detalhado de paralisações, orçamentos previstos e vigentes, identificação de tomador e executor, e links diretos para a fundamentação jurídica da Nova Lei de Licitações ([Lei Federal nº 14.133/2021](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm)).
* **Cruzamento de Obras com Contratos Municipais e Licitações:** Algoritmo analítico de correlação que conecta automaticamente projetos do Obrasgov.br aos contratos e processos licitatórios registrados no tribunal de contas municipal, possibilitando rastrear empresas contratadas, números de contrato e aditivos.
* **Mini-Mapa Interativo e Telemetria na Visão Geral:** Card resumo de obras integrado à página principal com mini-mapa estático gerado por projeção Web Mercator com tiles ArcGIS/CartoDB, coordenadas medianas do município e resumo de obras ativas e paralisadas.
* **Série Temporal de Evolução Mensal do Caixa (SICONFI MSC):** Novo card analítico e gráfico interativo na seção de Orçamento demonstrando a movimentação e queima/acumulação mensal de saldos de caixa a partir da Matriz de Saldos Contábeis do Tesouro Nacional.

### ✨ Novas Funcionalidades (Added)
* **Página de Obras Públicas (`apps/web/app/[portalSlug]/obras`):** Rota completa com KPIs consolidados (Total de Obras, Investimento Previsto, Em Execução, Concluídas e Paralisadas), busca textual e filtros de situação.
* **Mapa Interativo com Gestos Cooperativos (`ObrasMapaInterativo`):** Mapa geoespacial baseado em Leaflet com tiles CartoDB Positron e fallback ArcGIS World Imagery, gestos cooperativos (aviso de tecla `Cmd` / `Ctrl` ao rolar para evitar rolagem acidental da página), marcadores coloridos por status e popups contextuais.
* **Alternância e Responsividade Mobile em Obras:** Interface adaptativa com botão de alternância entre mapa e lista e carrossel horizontal de cards de obras para navegação móvel fluida.
* **Modal de Detalhes da Obra (`ObrasDetalheModal`):** Diálogo acessível com deep linking bidirecional via URL (`?idProjeto=...`), gráfico de avanço duplo (físico vs. financeiro), lista de contratos correlacionados, histórico de paralisações e compartilhamento cívico.
* **Disclaimer Cívico com Ação de Cobrança Parlamentar (`ObrasCivicDisclaimer`):** Componente informativo sobre a origem dos dados (Obrasgov.br) com botão para copiar texto estruturado e padronizado para cobrança parlamentar e fiscalização cidadã.
* **Mini-Mapa Cartográfico no Card Resumo de Obras (`ObrasResumoCard`):** Card na página inicial (`/`) exibindo a contagem de obras, investimento total e mini-mapa estático interativo calculado com projeção Web Mercator (`tile-calc.ts`).
* **Gráfico de Evolução Mensal de Caixa (`SaldoCaixaEvolucaoMensalChart`):** Gráfico de linha e barras exibindo a evolução mensal de disponibilidades de caixa e variação líquida mês a mês a partir do Siconfi MSC.
* **OpenGraph Dinâmico de Obras (`obras/opengraph-image.tsx`):** Geração dinâmica de cartões de compartilhamento social com contagem de obras, valor total e brasão oficial do município.
* **Queries Kysely de Obras e Caixa (`@transparencia/db`):** Funções analíticas `getObrasPublicasSummary`, `getObrasPublicasProjetos`, `getObraPublicaDetalhe`, `getObrasPublicasFilterOptions`, `getObrasPublicasGeoPoints` e `getSiconfiCaixaMensalEvolucao`.

### 🏛️ Engenharia de Dados & Modelagem dbt (Data & Analytics)
* **Extrator e Carregador Obrasgov.br (`elt/extract/obrasgov.py` e `elt/load/obrasgov.py`):** Pipeline automatizado de ingestão para download e processamento de projetos, execuções físicas, geometrias geoespaciais e histórico de paralisações do Obrasgov.br.
* **Modelos Staging Obrasgov (`staging/obrasgov`):** Criação de `stg_obrasgov__projetos`, `stg_obrasgov__execucoes_fisicas`, `stg_obrasgov__geometrias` e `stg_obrasgov__historico_paralisacoes` com documentação e testes de schema em `_models.yml`.
* **Mart Analítico `fct_obras`:** Modelo consolidando informações de projetos de engenharia, situação padronizada em snake_case (`em_execucao`, `concluida`, `paralisada`, etc.), filtragem de intervenções supra-regionais ou federais descoladas do município, cálculo de percentual físico e financeiro, datas de início/fim e georreferenciamento.
* **Enriquecimento de Contratos Vigentes (`fct_contratos_servicos_vigentes`):** Ajuste de modelo analítico para preservar e correlacionar anos de licitação e contratos vinculados a intervenções públicas.

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Cadência Otimizada no Pipeline de Ingestão (`ingestion-pipeline.yml`):** Ajuste do cron schedule para rodar exclusivamente em dias úteis (segunda a sexta) às 23:00 UTC (`0 23 * * 1-5`), reduzindo execuções desnecessárias aos finais de semana.
* **Cálculo Matemático de Tiles Web Mercator (`tile-calc.ts`):** Implementação de projeção matemática pura sem dependências externas pesadas para renderização ultrarrápida do mini-mapa estático.
* **Algoritmo de Correlação Resiliente:** Tratamento defensivo em `@transparencia/db` para correlação de obras com contratos municipais, prevenindo falsos positivos por truncamento de títulos e aplicando fallback para contratos de exercícios anteriores.
* **Hierarquia Visual no Saldo de Caixa (`SaldoCaixaEntidadesSection`):** Ajuste de alinhamento, espaçamento e tipografia na listagem de entidades municipais.

### ⚖️ Governança & Documentação Pública (Governance & Docs)
* **Regra 24 em `AGENTS.md` (Consistência de Design System e Vocabulário Cívico):** Diretriz de governança proibindo termos exóticos e padronizando rótulos de detalhes, modais, links e componentes do design system.
* **Documentação para LLMs (`llms.txt` e `llms-full.txt`):** Inclusão da rota `/obras`, catálogo de campos analíticos de obras públicas, parâmetros de URL suportados (`idProjeto`) e notas contábeis.
* **Termos de Uso e Metodologia (`/termos`):** Inclusão formal do Obrasgov.br / Ministério da Gestão e da Inovação em Serviços Públicos (MGI) e das bases legais da Lei 14.133/2021.

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Controle de Zoom do Mapa:** Desativação do `scrollWheelZoom` nativo no Leaflet e adoção de dica visual contextual de tecla modificadora para zoom seguro.
* **Blindagem de Testes Unitários de Banco (`contratos-servicos-vigentes.spec.ts`):** Isolamento de fixtures e semeadura determinística de contratos em suíte de testes Kysely.
* **Tratamento de Contratos com Status Inativos:** Filtragem de status contratuais descontinuados ou cancelados no vínculo com obras públicas.
* **Ajuste de Testes de Cards e Modais:** Sincronização dos testes de interface com as novas variantes de métricas e estrutura do card resumo de obras.

## [1.16.2] - 2026-10-10

### 🌟 Destaques da Versão (Correção do Código IBGE de Natividade)
* **Correção Cadastral e Analítica do Município de Natividade:** Ajuste do código oficial do IBGE de Natividade de `3303401` para `3303104`, garantindo a correta sincronização e correspondência nos filtros analíticos e integrações de dados municipais.

### 🏛️ Engenharia de Dados & Modelagem dbt (Data & Analytics)
* **Ajuste em Staging de Natividade (`stg_natividade_prefeitura__siconfi_msc_patrimonial`):** Atualização do filtro de `cod_ibge` para `3303104` na consolidação de saldos patrimoniais da Matriz de Saldos Contábeis (SICONFI MSC).
* **Atualização do Seed de Portais (`seed_portais.csv`):** Correção do identificador `cod_ibge` associado ao portal `natividade_prefeitura`.

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Configurações e Fixtures de Teste:** Atualização do manifesto declarativo `elt/portals/natividade_prefeitura.yml`, dos testes unitários de extração (`test_fiorilli.py`) e regeneração do fixture de banco de dados `schema.sql.gz`.

## [1.16.1] - 2026-10-10

### 🌟 Destaques da Versão (Detecção de Extrapolação do Teto de Pessoal da LRF e Resiliência na MSC SICONFI)
* **Alerta Crítico de Extrapolação de Gastos com Pessoal (Art. 20 da LRF):** Implementação da detecção analítica de anomalia fiscal quando a despesa líquida com pessoal do Poder Executivo ultrapassa o teto legal de 54% da Receita Corrente Líquida (RCL) em exercícios fiscais encerrados, destacando desvios em pontos percentuais (`p.p.`) e fundamentação jurídica direta no Radar Cívico.
* **Integridade Granular na Matriz de Saldos Contábeis (SICONFI MSC):** Inclusão dos discriminadores `entrada_msc` e `complemento_fonte` na chave primária e nos modelos de extração, carga e staging da MSC Patrimonial, prevenindo deduplicações indevidas e preservando lançamentos patrimoniais detalhados.
* **Refinamento de Narrativa e Navegação Cívica:** Aprimoramento da narrativa textual com desvio formatado em pontos percentuais (`+X.XX p.p.`), badge crítico com fundamentação no Art. 20 da LRF e direcionamento do cidadão diretamente à visualização analítica de despesas com pessoal (`/pessoal`).

### ✨ Novas Funcionalidades (Added)
* **Alerta de Teto de Pessoal no Radar Cívico (`apps/web`):** Novo card analítico para anomalia `despesa_pessoal_limite_lrf`, exibindo valor observado, teto legal (54,00%), desvio em pontos percentuais e atalho direto para a página de Pessoal com query params do exercício.
* **Narrativa Cívica Normativa (`radar-civico-narrative.ts`):** Narrativa parametrizada para despesas de pessoal acima do limite prudencial/máximo da Lei de Responsabilidade Fiscal, com sinalização de desvio em `p.p.`.
* **Suporte a `despesa_pessoal_limite_lrf` na Camada de Dados (`@transparencia/db`):** Tipagem e mapeamento do novo discriminador no enumerador `TipoAnomaliaFiscal` em `radar-civico-alertas.ts`.

### 🏛️ Engenharia de Dados & Modelagem dbt (Data & Analytics)
* **Detecção Analítica em `fct_anomalias_fiscais_metricas`:** Cruzamento anual entre `fct_pessoal_folha_metricas` e `fct_fontes_receita_metricas` com categorização como severidade `critico`, método `art20_lrf_limite_maximo` e valor esperado fixado em 54,00%.
* **Granularidade da MSC Patrimonial em Staging (`stg_*__siconfi_msc_patrimonial`):** Propagação do campo `entrada_msc` nas tabelas staging de Porciúncula e Natividade e sincronização das declarações em `_sources.yml` e testes unitários.

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Chave Composta na Extração e Carga da MSC (`elt/extract/siconfi_msc.py` e `elt/load/siconfi.py`):** Inclusão de `entrada_msc` e `complemento_fonte` no conjunto identificador de linhas contábeis.
* **Sincronização de Fixtures e Modelos de Teste:** Atualização do fixture serializado `schema.sql.gz` e suíte de testes unitários dbt cobrindo casos de ultrapassagem do teto legal e exercícios em aberto.

### ⚖️ Governança & Documentação Pública (Governance & Docs)
* **Guia de Consumo por IA (`llms.txt` e `llms-full.txt`):** Inclusão da anomalia `despesa_pessoal_limite_lrf` no catálogo de indicadores públicos e regras de negócio do Radar Cívico.

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Formatação de Desvio em Pontos Percentuais (`view-model.tsx`):** Ajuste na renderização de badges e métricas para exibir explicitamente o sufixo `p.p.` em vez de porcentagem (`%`) quando a anomalia for relativa ao teto de pessoal da LRF.

## [1.16.0] - 2026-10-10

### 🌟 Destaques da Versão (Compartilhamento Cívico em Modais, Ingestão Diária e Atualização de Dependências)
* **Compartilhamento Cívico Integrado aos Diálogos Modais (`ModalDialog`):** Expansão do componente `ShareButton` diretamente no cabeçalho de todas as caixas modais do ecossistema `@transparencia/ui`, permitindo ao cidadão compartilhar achados detalhados de despesas, licitações, pessoal e previdência via Web Share API nativa ou cópia para área de transferência.
* **Cadência Diária na Extração e Ingestão de Dados Públicos:** Transição do agendamento semanal do pipeline no GitHub Actions para execução diária automática às 20:00 BRT (23:00 UTC), garantindo atualização constante das bases contábeis, orçamentárias e licitatórias.
* **Gravação de Sessão Condicionada a Produção no PostHog:** Otimização do monitoramento analítico habilitando gravação de sessões estritamente no ambiente de produção e desativando-a em desenvolvimento e testes para poupar consumo de rede e preservar a performance do thread principal.
* **Modernização do Ecossistema Core (Next.js 16.4 e Ruff 0.17):** Atualização de pacotes centrais de frontend e backend, incluindo Next.js 16.4.0, Lucide React 1.54.0, Nuqs 2.10.2, PostHog 1.438.7, Ruff 0.17.0 e SQLModel 0.0.48.

### ✨ Novas Funcionalidades (Added)
* **Ações de Compartilhamento em `ModalDialog` (`packages/ui`):** Suporte nativo às propriedades `showShareButton`, `shareUrl`, `shareTitle`, `onShare` e `shareSlot`, inserindo o botão compacto de compartilhamento no cabeçalho do diálogo modal adjacente ao botão de fechar.

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Frequência Diária de Ingestão (`.github/workflows/ingestion-pipeline.yml`):** Atualização do cron schedule para `0 23 * * *` (todos os dias às 20:00 BRT).
* **Condicionamento de Gravação de Sessões no PostHog (`apps/web/instrumentation-client.ts`):** Gravação de sessões ativada somente quando `isProduction` for verdadeiro (`disable_session_recording: !isProduction`).
* **Compatibilidade com Dialeto SQLAlchemy em PostgreSQL (`elt/core/db.py` e `elt/conftest.py`):** Normalização de URLs `postgresql://` para `postgresql+psycopg2://` garantindo conexão estável nos ambientes de execução e testes.
* **Atualização de Dependências Monorepo e ELT:** Atualização de `next` (16.4.0), `lucide-react` (1.54.0), `nuqs` (2.10.2), `posthog-js` (1.438.7), `resend` (6.32.1), `dotenv` (18.0.7), `sqlmodel` (0.0.48), `ruff` (0.17.0) e sincronização dos lockfiles `pnpm-lock.yaml` e `elt/uv.lock`.

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Suíte de Testes Unitários de ModalDialog (`modal-dialog.spec.tsx`):** Cobertura abrangente para renderização de compartilhamento em modais, fallback para título da modal, customização de URL e renderização de slots arbitrários via `shareSlot`.

## [1.15.2] - 2026-10-10

### 🌟 Destaques da Versão (Correções em Testes dbt e Resiliência do Pipeline de Ingestão)
* **Ampliação da Faixa Temporal em Licitações:** Ajuste da validação de integridade nos modelos `_int_licitacoes_consolidadas.yml` e `_fct_licitacoes.yml` permitindo registros históricos a partir do ano 2000.
* **Correção de Testes Unitários em Métricas dbt:** Alinhamento dos inputs de testes com `portal_slug` e `dim_portais` em `fct_execucao_orcamentaria_metricas` e `fct_previdencia_patrimonio_historico_metricas`.
* **Execução Obrigatória de Seeds no Pipeline:** Inclusão explícita da etapa `run_dbt.py seed` no workflow do GitHub Actions antes da transformação dos marts.

### 🏛️ Engenharia de Dados & Modelagem dbt (Data & Analytics)
* **Sincronização de Sementes e Pacotes:** Execução de `dbt seed` automatizada no job `load_and_transform` da ingestão programada.
* **Validação de Anos Históricos:** Faixa mínima de ano reduzida de 2010 para 2000 nos contratos e licitações consolidadas.

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Blindagem de Testes Unitários de Execução Orçamentária e Previdência:** Inclusão de `portal_slug` e semente `dim_portais` com código IBGE nos dados simulados dos testes dbt.

## [1.15.1] - 2026-10-10

### 🌟 Destaques da Versão (Resiliência de Workflows no GitHub Actions)
* **Ajuste em Condicionais de CI/CD:** Correção na sintaxe de validação de secrets e condicionais do runner no pipeline de ingestão programada.

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Tratamento Seguro de Secrets Ausentes (`ingestion-pipeline.yml`):** Substituição de condicionais `if` que acessavam secrets por verificações no script bash, prevenindo falhas de compilação do workflow.
* **Renomeação de Workflow:** Padronização do nome do pipeline para `Scheduled Ingestion Pipeline`.

## [1.15.0] - 2026-10-09

### 🌟 Destaques da Versão (Pipeline ELT Escalável com Cloudflare R2, Compartilhamento Cívico e Identidade Visual Dinâmica)
* **Pipeline de Ingestão com Fan-In e Cloudflare R2:** Reestruturação da ingestão agendada no GitHub Actions com execução paralela dos extratores municipais e sincronização de artefatos brutos via Cloudflare R2 (storage S3-compatível), garantindo persistência sem limites de disco local e carregamento consolidado (*fan-in*).
* **Desacoplamento e Modularização da Camada ELT:** Segregação estrita entre extração e carregamento para fontes nacionais (SICONFI e PNCP) em módulos autônomos (`elt/load/siconfi.py` e `elt/load/pncp.py`), eliminando acoplamento direto com o banco nos extratores e facilitando a testabilidade isolada.
* **Engajamento e Compartilhamento Cívico Ativo (`ShareButton`):** Novo botão de compartilhamento acessível integrado à barra lateral (`Sidebar`) com suporte nativo à Web Share API em dispositivos móveis e fallback com cópia instantânea da URL na área de transferência e feedback visual ("Link copiado!").
* **Descoberta Visual no Radar Cívico:** Implementação de indicador de rolagem horizontal responsivo no carrossel de alertas fiscais (`RadarCivicoFeed`), sinalizando visualmente quando há múltiplos apontamentos e viabilizando a navegação intuitiva entre os achados.
* **OpenGraph Dinâmico e Identidade Visual Municipal:** Geração sob demanda de cartões sociais dinâmicos para a página inicial (`/opengraph-image.tsx`) e inclusão automatizada de brasões municipais em base64 com proporção harmônica em todas as rotas de compartilhamento das redes sociais, com cache versionado e queries sequenciais.

### ✨ Novas Funcionalidades (Added)
* **Sincronização com Cloudflare R2 (`elt/scripts/sync_r2.py`):** Script utilitário em Python e comandos no Makefile (`make elt/r2/sync`, `make elt/r2/download`) para upload e download de artefatos de dados brutos e parquet em buckets S3-compatíveis.
* **Botão de Compartilhamento Cívico na Barra Lateral (`ShareButton`):** Componente interativo em `@transparencia/ui` acoplado ao `Sidebar` e `SidebarWrapper`, permitindo ao usuário compartilhar o link da visão ativa por redes sociais ou copiar o link com um clique, com total suporte a acessibilidade e notificações de feedback.
* **Indicador de Rolagem no Feed do Radar Cívico (`RadarCivicoFeed`):** Sinalizador visual dinâmico com botões de navegação lateral e indicadores de posição quando a quantidade de alertas fiscais extrapola o contêiner visível no desktop e no mobile.
* **Social Card Dinâmico da Página Inicial (`/opengraph-image`):** Template institucional de imagem social (`og-home-card-template.tsx`) exibindo catálogo resumido de municípios integrados, indicador de transparência ativa e métricas do portal com renderização vetorial no servidor via `@vercel/og` / Edge runtime.
* **Brasões Municipais em Cards Sociais de Todas as Rotas:** Inclusão do brasão oficial do município em alta fidelidade nos cards sociais de Visão Geral, Despesas, Receitas, Orçamento, Licitações, Pessoal, Previdência, Saúde e Radar Cívico.

### 🏛️ Engenharia de Dados & Modelagem dbt (Data & Analytics)
* **Modularização de Carregadores SICONFI e PNCP (`elt/load/`):** Criação dos módulos dedicados `elt/load/siconfi.py` e `elt/load/pncp.py`, isolando a lógica de inserção/upsert no PostgreSQL e desacoplando os extratores (`elt/extract/siconfi_msc.py` e `elt/extract/pncp.py`).
* **Pipeline de Ingestão Agendada com Fan-In no GitHub Actions (`scheduled-ingestion.yml`):** Refatoração do workflow para paralelizar a extração entre portais (matrix strategy) com sincronização em bucket Cloudflare R2 e job final consolidado de carga e transformação dbt.

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Cache Versionado e Queries Sequenciais nas Rotas OG:** Todas as rotas de pré-visualização de imagem social (`[portalSlug]/*/opengraph-image.tsx`) agora utilizam o loader com cache versionado (`createCachedDataLoader`), garantindo que requisições repetidas de indexadores não atinjam o PostgreSQL e executem queries sequencialmente para limitar o consumo a no máximo uma conexão por requisição.
* **Pipeline de Checagem Estática de Tipos (`turbo typecheck`):** Padronização do script `typecheck` no Turborepo e nos manifests `package.json` de todos os pacotes (`apps/web`, `packages/db`, `packages/ui`), assegurando validação de tipos consistente e paralela no pipeline de CI/CD.
* **Utilitário Centralizado de Assets em Base64 (`og-assets.ts`):** Módulo utilitário dedicado para carregar e converter brasões municipais em base64 com verificação defensiva de existência de arquivos e prevenção de quebras em tempo de execução.
* **Atualização e Sincronização de Dependências:** Atualização do lockfile `elt/uv.lock`, dependências npm e atualização do `urllib3` para 2.8.0.

### ⚖️ Governança & Documentação Pública (Governance & Docs)
* **Diretriz de Proibição de Listas Hard-Coded de Municípios (`AGENTS.md`):** Atualização formal da regra de Isolamento Multi-Tenant estendendo a proibição de arrays, literais ou fallbacks fixos de municípios para todos os componentes frontend, templates de páginas, hooks e geradores de cards sociais.
* **Variáveis de Ambiente para Storage S3/R2 (`.env.example`):** Documentação das chaves de configuração `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` e `R2_ENDPOINT_URL`.

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Testes Unitários dos Carregadores e Extratores SICONFI (`elt/extract/__tests__/test_siconfi_msc.py`):** Ampliação da cobertura de testes para a rotina modularizada de extração do SICONFI MSC.
* **Blindagem e Cobertura de Testes Unitários de Compartilhamento:** Criação de suíte completa de testes para `ShareButton`, `SidebarWrapper` e `Sidebar`, cobrindo cenários de sucesso, erro, negação de permissão da Web Share API e fallbacks de clipboard.
* **Adequação do Layout Raiz para Metadata Social:** Limpeza de metadados estáticos legados no `layout.tsx` em favor da geração dinâmica por rota e por município via geradores de imagem OpenGraph dedicados.

## [1.14.1] - 2026-10-06

### 🌟 Destaques da Versão (Isolamento Multi-Tenant Estrito, Integridade Analítica e Formatação UI)
* **Blindagem Multi-Tenant e Eliminação de Cross-Tenant Leakage:** Eliminação de fallbacks e literais fixos de municípios nos modelos de analytics, garantindo particionamento e cruzamento estrito por `portal_slug` em fornecedores, licitações, saúde e pessoal.
* **Testes Automatizados de Isolamento Multi-Tenant:** Implementação de suíte de testes de integridade em Python/pytest validando que nenhum modelo dimensional misture ou vaze dados entre municípios com códigos internos idênticos.
* **Legibilidade e Acessibilidade em Folha de Pagamento:** Formatação monetária completa via tooltip no cartão de 13º salário (`DecimoTerceiroCard`), permitindo ao cidadão visualizar o valor exato reservado e pago além do formato compacto.

### ✨ Novas Funcionalidades (Added)
* **Tooltip com Valor Monetário Integral no Cartão de 13º Salário (`DecimoTerceiroCard`):** Inclusão de formatação em moeda corrente (`fmtCurrency`) no atributo `title` dos valores compacto (`fmtCompact`), permitindo consulta do valor exato em reais ao passar o cursor ou tocar no cartão.

### 🏛️ Engenharia de Dados & Modelagem dbt (Data & Analytics)
* **Particionamento Multi-Tenant em Despesas por Fornecedor (`fct_despesas_por_fornecedor`):** Unificação das bases de Porciúncula e Natividade com `portal_slug` explícito em nível de mart analítico.
* **Isolamento de Cruzamento e Chave Substituta em Itens de Licitação (`fct_licitacoes_itens`):** Remoção de fallback hardcoded municipal na geração do `item_id` e na coluna `portal_slug`.
* **Propagação de `portal_slug` em Marts de Métricas:** Ajustes de particionamento e join por `portal_slug` em `fct_despesas_fornecedores_metricas`, `fct_historia_saude_metricas`, `fct_pessoal_departamento_metricas` e `fct_pessoal_folha_metricas`.

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Diretriz Canônica de Isolamento Multi-Tenant em `AGENTS.md`:** Formalização da regra mandatória proibindo literais de tenants hard-coded e exigindo junções obrigatórias por `portal_slug`.
* **Exportação Aprimorada de Fixtures de Teste (`Makefile`):** Atualização da receita `db/fixture/dump` para incluir `analytics.dim_portais` e `analytics.dim_orgao` com dados na extração compactada de teste.

### ⚖️ Governança & Documentação Pública (Governance & Docs)
* **Suíte de Testes de Integridade Multi-Tenant (`elt/tests/test_multitenant_integrity.py`):** Criação de testes de integridade em dbt models assegurando que dados de portais distintos permaneçam mutuamente isolados.
* **Sincronização de Fixtures de Teste (`schema.sql.gz`):** Atualização do fixture [schema.sql.gz](file:///packages/db/tests/fixtures/schema.sql.gz) para garantir paridade total com as tabelas e dados analíticos.

## [1.14.0] - 2026-10-05

### 🌟 Destaques da Versão (Epic 15: Expansão Regional Noroeste Fluminense, RPPS Canônico e Arquitetura Multi-Portal)
* **Expansão Regional e Rollout Multi-Portal:** Desacoplamento estrutural da plataforma para suportar múltiplos municípios de forma escalável, viabilizando o ingresso oficial de Natividade (RPPS IPAMN) e Bom Jesus do Itabapoana (RPPS FUNPREV), além de infraestrutura de conectores para São Fidélis (RPPS FASP), estendendo a transparência fiscal ativa a mais de 90 mil cidadãos do Noroeste Fluminense.
* **RPPS Canônico e Desacoplamento Institucional:** Generalização de toda a camada analítica de previdência própria municipal — migrando de referências locais hardcoded (`CAPREM`) para modelos e rotas canônicas (`fct_previdencia_*` e `/[portalSlug]/previdencia`), com preservação de compatibilidade e redirecionamento permanente HTTP 308.
* **Página de Entrada Municipal e Navegação Contextual:** Nova landing page (`/`) com catálogo visual, cartões dos municípios, busca dinâmica e seletor global reativo no cabeçalho, barra lateral e rodapé, permitindo transição contínua entre cidades preservando o exercício temporal e o contexto cívico.
* **Invalidação de Cache sob Demanda via Webhooks:** Implementação de pipeline de revalidação granular de cache no Next.js (`/api/ingestion/webhook`), garantindo que atualizações nas tabelas analíticas dbt reflitam instantaneamente na interface pública sem dependência de revalidações manuais.

### ✨ Novas Funcionalidades (Added)
* **Portal Landing Page com Seletor Municipal (`/`):** Implementação de tela inicial interativa com catálogo de municípios atendidos, busca em tempo real por nome ou sigla, exibição de brasões municipais em alta resolução, atalhos para os principais módulos e redirecionamento automático/manual.
* **Rota Canônica de Previdência (`/[portalSlug]/previdencia`):** Padronização da rota de previdência com suporte multi-portal dinâmico, exibindo a denominação e sigla de cada instituto (CAPREM, NATPREVI), acompanhada de redirecionamento HTTP 308 permanente para links legados `/caprem`.
* **Navegação Contextual Multi-Portal:** Integração de seletor dinâmico de municípios na `Sidebar` e `GlobalFooter`, com exibição condicional de menus de acordo com os módulos habilitados em cada município (ex.: Previdência e Plano de Saúde).
* **Revalidação de Cache sob Demanda por Webhook (`/api/ingestion/webhook`):** Endpoint seguro para expurgo de tags de cache (`revalidateTag`) acionado automaticamente ao final das rotinas de ingestão ELT, acompanhado de workflow dedicado no GitHub Actions (`.github/workflows/revalidate-cache.yml`) e atalho via `make cache/revalidate`.

### 🏛️ Engenharia de Dados & Modelagem dbt (Data & Analytics)
* **Modelos Dimensionais Canônicos de Previdência (`fct_previdencia_*`):** Migração e padronização dos marts analíticos de RPPS (`fct_previdencia_historia_metricas`, `fct_previdencia_patrimonio_historico_metricas`, `fct_previdencia_tendencia_atuarial_metricas`, `fct_previdencia_cadprev_metricas`, `fct_previdencia_entidades_metricas`, `fct_previdencia_natureza_metricas`), com particionamento multi-portal estrito (`portal_slug`) e regras de agregação compatíveis com múltiplos regimes previdenciários.
* **Extrator Genérico Fiorilli (`elt/extract/fiorilli/`):** Generalização do extrator de dados orçamentários baseado em manifestos declarativos YAML (`elt/portals/<slug>.yml`), parametrizando portas, hosts, códigos IBGE e códigos de empresa.
* **Parametrização de Metadados em `seed_portais.csv` e `dim_portais`:** Desnormalização eficiente com colunas de configuração modular (`previdencia_habilitado`, `previdencia_sigla`, `previdencia_nome`, `plano_saude_habilitado`, `plano_saude_sigla`, `plano_saude_nome`, `highlights_json`), permitindo ativação declarativa de recursos por município.
* **Modelos Staging e Integração SICONFI Multi-Portal:** Consolidação de fontes orçamentárias e fiscais para suporte simultâneo a múltiplos municípios e tabelas de conformidade STN/SICONFI.

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Otimização de Imagens e Renderização de Brasões:** Substituição de arquivos vetoriais pesados por formatos otimizados PNG e uso do componente `next/image` na sidebar e na landing page, reduzindo tempo de carregamento e eliminando inconsistências visuais de renderização SVG.
* **Desacoplamento de Filtros Hardcoded nos Marts de Métricas:** Remoção de condições fixas por entidade municipal em `fct_previdencia_historia_metricas` e `fct_previdencia_cadprev_metricas`, substituindo-as por filtros dinâmicos acoplados aos metadados do portal.
* **Camada de Dados Kysely (@transparencia/db):** Modularização das consultas sob a ótica canônica de previdência (`packages/db/src/queries/previdencia.ts`), com tipagem estrita em `camelCase`, suporte a listagem dinâmica de portais (`listPortais()`) e extração centralizada de configurações em `getPortalConfig()`.
* **Estratégia de Cache e Revalidação Segura:** Atualização das rotinas de cache em `apps/web/lib/cache.ts` com tags dedicadas por portal (`portal-${slug}` e tags de entidade), garantindo isolamento total durante a invalidação de dados.

### ⚖️ Governança & Documentação Pública (Governance & Docs)
* **Sincronização de Fixtures Compactados (`schema.sql.gz`):** Atualização do fixture [schema.sql.gz](file:///packages/db/tests/fixtures/schema.sql.gz) com todas as novas tabelas dimensionais de previdência e colunas de metadados, validando paridade estrutural contínua via `make db/fixture/check`.
* **Guias Públicos para Modelos de IA (`llms.txt` e `llms-full.txt`):** Atualização das rotas canônicas e expansão do catálogo de municípios e siglas dos regimes próprios de previdência social (RPPS) atendidos pela plataforma.

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Correção da Ordem de Hooks e Layout na Rota Raiz:** Ajuste estrutural em `sidebar-wrapper.tsx`, `global-footer.tsx`, `ribbon-wrapper.tsx` e `extraction-notification-banner.tsx` para assegurar conformidade com as regras do React e evitar renderizações redundantes na página inicial (`/`).
* **Ajuste de Altura Mínima no Seletor da Sidebar:** Adequação de espaçamento e altura mínima no dropdown de seleção municipal em telas menores.
* **Parametrização Temporal da Série Histórica da Previdência:** Correção nos cálculos de anos com inconsistência declarada e normalização de períodos em `view-model.ts` de previdência.

### 🗑️ Depreciações & Remoções (Removed)
* **Expurgo de Componentes Legados Caprem:** Remoção e substituição completa dos componentes e arquivos denominados com o prefixo legado `caprem-*` em favor dos equivalentes canônicos `previdencia-*`.

## [1.13.0] - 2026-09-30

### 🌟 Destaques da Versão (Otimização de Performance, Navegação Temporal e Emendas da Saúde)
* **Navegação Temporal Contínua e Busca Rápida Multi-Ano (Spotlight):** O motor de busca rápida agora conta com seletor de escopo temporal por ano e preservação contextual do exercício nas rotas SPA de licitações e contratos, exibindo alertas informativos quando um certame ou contrato pertencer a exercício anterior sem perder a navegação original.
* **Salto de Performance e Redução Expressiva de JavaScript:** Otimização arquitetural com carregamento assíncrono sob demanda de gráficos (Recharts), expurgo de bibliotecas pesadas não utilizadas (ECharts), desacoplamento de banners dinâmicos para zerar Layout Shift (CLS = 0) e envolvimento de data loaders em cache versionado com barra de progresso responsiva (`BProgress`) em transições assíncronas.
* **Painel Aprimorado de Emendas Parlamentares da Saúde:** Priorização e ordenação automática de emendas com recursos já executados/empenhados, expansão de histórico do objeto em linha e renderização em cartões responsivos no mobile, mantendo total neutralidade e fidelidade aos registros oficiais dos portais.

### ✨ Novas Funcionalidades (Added)
* **Seletor de Escopo Temporal no Spotlight de Licitações:** Adição de filtro por exercício (`Ano Atual` vs `Todos os Anos`) no modal de busca global rápida (`Cmd+K`), com badges identificando o ano de competência de cada processo e contrato retornado.
* **Barra de Progresso em Transições SPA (`ProgressProvider`):** Integração do `@bprogress/next` no layout raiz, fornecendo feedback visual imediato ao cidadão durante a transição de páginas e buscas de dados sem travamento da interface.
* **Cartões Responsivos e Expansão de Histórico em Emendas da Saúde (`SaudeEmendasSection`):** Novo layout mobile via `renderMobileCard` para visualização clara de emendas parlamentares em smartphones e componente expansível `EmpenhoDescricaoCell` para leitura na íntegra de objetos extensos sem quebrar o layout da tabela.

### 🏛️ Engenharia de Dados & Modelagem dbt (Data & Analytics)
* **Fidelidade Oficial em `fct_emendas`:** Simplificação e blindagem do modelo dimensional `fct_emendas`, mantendo a integridade dos dados oficiais provenientes de `int_emendas_consolidadas` e eliminando heurísticas textuais artificiais de cruzamento com despesas.
* **Sincronização de Fixtures de Teste:** Atualização e validação das definições estruturais compactadas no fixture [schema.sql.gz](file:///packages/db/tests/fixtures/schema.sql.gz) para garantir paridade total entre modelos analíticos e testes Kysely em `@transparencia/db`.

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Carregamento Assíncrono de Gráficos Recharts:** Dynamic imports com `ssr: false` nas seções de Previdência (`/caprem`) e Saúde Pública (`/saude`), reduzindo substancialmente o tamanho do pacote JavaScript inicial (First Load JS) carregado pelo navegador.
* **Expurgo de Dependências e Otimização de Pacotes:** Remoção completa dos pacotes `echarts` e `echarts-for-react`, inclusão de `optimizePackageImports` para `recharts`, `lucide-react` e `@transparencia/ui` em `next.config.js`, e desativação do session recording do PostHog para poupar banda e processamento do usuário.
* **Cache Versionado em Rotas Dinâmicas:** Envolvimento dos data loaders em `apps/web/lib/cache.ts` com identificadores de versão de cache, acelerando a resposta de requisições subsequentes para Visão Geral, Licitações, Pessoal, CAPREM, Saúde e Radar.
* **Precedência de Emendas com Empenho na Saúde:** Ordenação do loader e DTOs de emendas em `historia-saude-metrics.ts` dando prioridade de exibição àquelas com recursos efetivamente empenhados ou liquidados.

### ⚖️ Governança & Documentação Pública (Governance & Docs)
* **Guias de Leitura Pública para Inteligência Artificial (`llms.txt` e `llms-full.txt`):** Atualização das orientações para agentes externos e LLMs sobre o painel de emendas parlamentares da saúde, detalhando a correlação com empenhos, propostas FNS/SISMOB e processos licitatórios municipais.

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Erradicação de Layout Shift no Banner de Extração:** Posicionamento desacoplado do fluxo estático do DOM em `ExtractionNotificationBanner`, eliminando o Cumulative Layout Shift (CLS) durante o carregamento assíncrono do status de sincronização de dados.
* **Preservação de Contexto Temporal na Navegação:** Correção no fluxo de abertura de certames e contratos de exercícios anteriores para manter o ano de navegação ativo na URL, acompanhado de alerta contextual discreto informando o exercício de origem do certame.
* **Persistência de Camadas no Spotlight Modal:** Prevenção do fechamento indevido do modal de busca ao selecionar processos ou contratos abertos a partir de atalhos rápidos.
* **Substituição de Emojis por Ícones Semânticos:** Substituição de emoji no banner de extração pelo ícone vetorial acessível `Megaphone` da biblioteca Lucide.

### 🗑️ Depreciações & Remoções (Removed)
* **Remoção de Middleware Proxy Não Utilizado:** Expurgo do arquivo legado `apps/web/proxy.ts`, simplificando a infraestrutura de borda do Next.js.

## [1.12.1] - 2026-09-27

### 🌟 Destaques da Versão (Acurácia Financeira de Contratos Plurianuais e Navegação Fluida entre Certames)
* **Acurácia Estrita da Execução Orçamentária de Contratos:** Vínculo direto e cirúrgico entre as despesas empenhadas/liquidadas e o processo licitatório correspondente no mart analítico, eliminando distorções de rateio generalizado por CNPJ e refletindo no centavo a execução real de contratos plurianuais (como compras contínuas de medicamentos e insumos de saúde).
* **Navegação Bidirecional e Fluida entre Contratos e Licitações:** Transição contextual intuitiva com botão "Voltar ao Contrato nº {número}" ao inspecionar certames vinculados a partir de um contrato, combinada com sincronização total com o botão "Voltar" do navegador (`popstate`/`pushState`).
* **Resolução Temporal Contínua de Processos Licitatórios:** Resolução automática de processos licitatórios multianuais, garantindo que contratos celebrados em exercícios subsequentes exibam integralmente os detalhes, itens cotados, modalidade e dotações orçamentárias originárias da licitação-base.

### 🏛️ Engenharia de Dados & Modelagem dbt (Data & Analytics)
* **Vínculo Fiel por Licitação em `fct_contratos_servicos_vigentes`:** O cálculo financeiro de execução anual (`empenhado_calc`, `liquidado_calc` e `pago_calc`) agora prioriza o cruzamento pelo número do certame (`split_part(licitacao_numero, '/', 1)`), restringindo o rateio genérico por fornecedor estritamente a contratações sem licitação formal (dispensas e inexigibilidades).
* **Tratamento de Contratos Plurianuais Ativos:** Ajuste na regra de status para que contratos vigentes com vencimento futuro não sejam precocemente marcados como inexecutados antes do término do seu período de vigência.

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Preservação de Fontes em Contratos Plurianuais (`contratos-servicos-vigentes`):** O leitor dimensional de contratos agora preserva a especificação de fontes de recursos (`TRANSF. SUS`, `FUNDEB`, etc.) e programas de trabalho para todos os exercícios em que o contrato permanecer vigente, evitando a supressão do bloco orçamentário em exercícios posteriores à contratação.
* **Fallback Temporal Inteligente em Licitações (`licitacoes-metrics`):** As funções `getLicitacaoByNumero` e `getLicitacaoItens` agora realizam fallback temporal para o exercício de ocorrência do certame caso a consulta seja originada a partir de uma rota filtrada por exercício posterior, eliminando registros vazios ou 404 em contratações decorrentes.

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Rótulo e Destino Contextual do Botão Voltar:** Ao navegar de um contrato para os detalhes do processo licitatório, o botão superior esquerdo passa a indicar expressamente o retorno ao contrato de origem em vez da mensagem genérica de busca.
* **Sincronização com o Histórico do Navegador:** Corrigido o manipulador de `popstate` em `licitacoes-em-andamento-section.tsx` para fechar o modal e limpar o estado quando o parâmetro `numero` for desempilhado da URL pelo botão "Voltar" do navegador.
* **Exibição do Valor Contratado Global:** Restauração do valor total homologado/contratado no cabeçalho financeiro do modal de contratos, permitindo a comparação imediata contra o saldo pendente de execução.

## [1.12.0] - 2026-09-27

### 🌟 Destaques da Versão (Rastreabilidade Orçamentária de Contratações e Usabilidade Mobile da Busca)
* **Rastreabilidade de Recursos Orçamentários e Órgãos Responsáveis:** Integração contábil completa entre compras públicas e a execução orçamentária (MCASP/STN). O cidadão agora identifica com clareza a origem dos recursos (ex: FUNDEB, Transferências do SUS, Recursos Próprios) e o órgão contratante responsável tanto nos modais detalhados de licitações e contratos quanto no motor de busca rápida.
* **Busca Rápida Acessível e Flutuante no Mobile:** Ao navegar e rolar longas páginas de certames ou contratos em dispositivos móveis, uma pílula flutuante de busca surge suavemente na tela, garantindo acesso instantâneo ao Spotlight modal (`Cmd+K` / busca global) sem exigir retorno manual ao topo da página.
* **Métricas de Execução Financeira e Saldos a Pagar em Contratos:** Visualização consolidada da execução de cada contratação nos modais (total contratado, aditado, empenhado, liquidado, pago e saldo residual a pagar), com fundamentação legal direta nos artigos da Nova Lei de Licitações (Lei nº 14.133/2021) e Lei nº 4.320/1964.

### ✨ Novas Funcionalidades (Added)
* **Detalhamento de Recursos e Órgão Contratante nos Modais 360:**
  - *Modal de Contratos*: exibição do órgão responsável (ex: Secretaria de Educação, Fundo Municipal de Saúde), discriminação das fontes orçamentárias STN e comparativo financeiro entre valores empenhados, liquidados e pagos com saldo a pagar.
  - *Modal de Licitações*: bloco informativo destacando as fontes de recursos vinculadas ao certame com link oficial para o Art. 18, VIII da [Lei nº 14.133/2021](https://www.planalto.gov.br/ccivil_03/_ato2021-2024/2021/lei/l14133.htm#art18).
* **Indexação Orçamentária na Busca Global (`searchLicitacoesEContratos`):** O motor de pesquisa textual agora indexa a descrição das fontes de recursos, nomes de programas, ações orçamentárias e órgãos responsáveis, permitindo que buscas como `"merenda escolar"`, `"sus"` ou `"fundeb"` retornem diretamente os contratos e licitações correspondentes.
* **Pílula Flutuante de Busca Móvel (`LicitacoesSearchBar`):** Botão flutuante responsivo no mobile posicionado acima da barra de navegação, com detecção de rolagem via `IntersectionObserver`, respeitando áreas seguras (`safe-area-inset-bottom`) e acessibilidade via teclado/leitores de tela.
* **Telemetria de Busca de Compras com PostHog:** Instrumentação de eventos de analytics (`licitacoes_search_performed`, `licitacoes_search_result_clicked`) para monitoramento do comportamento de pesquisa do cidadão com respeito à privacidade.

### 🏛️ Engenharia de Dados & Modelagem dbt (Data & Analytics)
* **Novo Mart Analítico `fct_contratos_recursos`:** Modelo dimensional pré-agregado consolidando `fct_contratos`, `dim_orgao` e `fct_despesas` com regra de "Aggregate First, Join Later", agregando despesas por licitação e fornecedor com ordenação de volume financeiro para identificar fonte de recursos e função orçamentária principais.
* **Correspondência Temporal Anti-Contaminação:** Extração da competência temporal da licitação (`licitacao_ano`) a partir da despesa com amarração por janela (`dl.licitacao_ano BETWEEN c.ano - 1 AND c.ano`), prevenindo que certames de exercícios anteriores com idêntico número sequencial contaminem contratos de exercícios subsequentes.
* **Sincronização Rigorosa de Fixtures de Teste:** Atualização do fixture [schema.sql.gz](file:///packages/db/tests/fixtures/schema.sql.gz) contendo o novo mart e verificação de paridade estrutural automatizada via `make db/fixture/dump` e `make db/fixture/check`.

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Aproveitamento de Mart e Desacoplamento em Runtime (`contratos-servicos-vigentes`):** Substituição de 6 subqueries inline custosas executadas diretamente sobre `fct_despesas` em tempo de requisição por um `leftJoin` direto com o mart `fct_contratos_recursos`, reduzindo drasticamente o tempo de resposta das consultas da API de contratos vigentes.
* **Normalização de Cruzamentos de Licitação (`split_part`):** Padronização das comparações de número de processo licitatório em consultas Kysely (`licitacoes-metrics.ts` e `licitacoes-contratos-search.ts`), normalizando sufixos com barra e vinculando obrigatoriamente o ano do certame.

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Acessibilidade do Botão Flutuante Móvel:** Configuração de `tabIndex={showFloatingPill ? 0 : -1}` e `aria-hidden={!showFloatingPill}`, evitando retenção indevida do foco por navegadores acessíveis quando a pílula estiver oculta.
* **Sanitização de Badges de Recursos na Interface:** Inclusão de filtro defensivo para strings vazias em `fontesRecursos.split(";")`, prevenindo badges em branco e avisos de chaves duplicadas no React.
* **Margem Inferior do Rodapé Institucional:** Expansão do espaçamento inferior do rodapé no mobile (`pb-24`), assegurando que a barra de navegação flutuante não sobreponha os links legais de Termos de Uso e Política de Privacidade.
* **Testes Determinísticos em `@transparencia/db`:** Refatoração da suíte de testes de contratos e recursos para utilizar isolamento por fixture (`createFixturePortalSlug()`) e semente determinística com `seedContratoRecurso()`, eliminando asserções condicionais vacuosas.

## [1.11.1] - 2026-09-26

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Otimização de Alta Performance em Queries dbt Marts (Regra 22):** Aplicação de técnicas de "Aggregate First, Join Later", single-scan em janelas temporais de exercícios e pushdown de predicados estruturados antes de funções de texto (`unaccent`) nos modelos `fct_licitacoes_metricas`, `fct_posicao_fiscal_metricas` e `fct_anomalias_fiscais_metricas`, eliminando riscos de timeout de execução analítica.

## [1.11.0] - 2026-09-25

### 🌟 Destaques da Versão (Epics 13 e 14: Busca Global de Contratações, Diagnóstico do RPPS e Usabilidade Cívica)
* **Busca Global Integrada de Contratações e Licitações:** Implementação de motor de busca instantâneo com Spotlight modal (atalho `Cmd+K` / `Ctrl+K`), busca textual e trigramática (`pg_trgm`) indexada no PostgreSQL para licitações e contratos vigentes, filtrando por número, ano, objeto, razão social de fornecedores homologados e CNPJ/CPF formatado ou unificado.
* **Diagnóstico de Sustentabilidade Previdenciária e Desidratação do RPPS:** Expansão do monitoramento atuarial do RPPS (CAPREM) com série histórica plurianual (2021 a 2026), identificando e segregando caixa e aplicações financeiras de longo prazo na MSC Patrimonial, com tratamento metodológico de quebra de série e nova anomalia crítica de desidratação patrimonial com fundamentação jurídica dupla (Art. 40 da [CF/88](https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art40) e [Lei nº 9.717/1998](https://www.planalto.gov.br/ccivil_03/leis/l9717.htm)).
* **Modais 360 de Licitações e Contratos e Acessibilidade:** Visualização aprofundada de certames e contratos em modais unificados com histórico de aditivos, empenhos vinculados, fornecedores homologados e detalhamento de itens cotados, suportados por deep-linking direto via URL e layout responsivo adaptado para dispositivos móveis.
* **Radar Cívico de Dependência de Transferências e Navegação Proativa:** Nova detecção de vulnerabilidade orçamentária por dependência extrema de transferências da União e do Estado (Art. 11 da [Lei Complementar nº 101/2000 - LRF](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art11)), sinalização visual discreta e acessível de anomalias no topo do menu lateral e na barra de navegação móvel, além de páginas públicas de Termos de Uso e Política de Privacidade em conformidade com a LGPD.
* **Experiência de Primeiro Acesso Respeitosa e Instalação Híbrida de PWA:** Eliminação completa da sobrecarga inicial de avisos e popovers invasivos no primeiro contato com a plataforma: silenciamento inteligente de banners para novos visitantes, desativação de botão redundante de notificações no topo, engajamento gradual para Web Push, adoção de modelo híbrido de PWA (botão permanente na barra lateral/menu e banner condicional inteligente no mobile, sem concorrência de telas) e despoluição visual da barra lateral, migrando o boletim cívico, link oficial e dados de extração para o rodapé global.

### ✨ Novas Funcionalidades (Added)
* **Busca Global com Spotlight Modal (`LicitacoesSearchSpotlight` e `LicitacoesSearchBar`):** Interface de busca rápida acionada via teclado (`Cmd+K` / `Ctrl+K`) ou botão na interface, permitindo localização imediata de licitações e contratos vigentes com pesquisa full-text no PostgreSQL (`websearch_to_tsquery` e `pg_trgm`), buscas por CNPJ/CPF com e sem pontuação corporativa, histórico recente e deep-links diretos.
* **Modais de Detalhes 360 de Licitações e Contratos (`LicitacaoDetalhesModal` e `ContratoDetalhesModal`):** Modais interativos com visão integral de certames e contratos administrativos:
  - *Licitações*: listagem auditável de itens cotados, estimativas, adjudicação homologada, fornecedores vencedores e cálculo de deságio percentual.
  - *Contratos*: vigência plurianual, termos aditivos de prorrogação ou valor, empenhos vinculados com execução orçamentária (liquidado e pago) e retenção de estado de busca via `nuqs`.
* **Série Histórica Plurianual do Patrimônio do RPPS (`CapremPatrimonioHistoricoSection`):** Painel gráfico e analítico na rota `/caprem` cobrindo o período de 2021 a 2026, com evolução consolidada dos ativos financeiros da previdência (caixa disponível e títulos/aplicações de curto e longo prazo), indicadores de variação anual e diagnóstico de causas estruturais (déficit atuarial registrado no CADPREV e histórico de repasse patronal).
* **Anomalia de Dependência Extrema de Transferências no Radar Cívico:** Alerta analítico apontando municípios cuja arrecadação tributária própria é desproporcionalmente reduzida frente às transferências correntes (FPM, Royalties e ICMS), em cumprimento aos princípios de arrecadação do Art. 11 da [Lei Complementar nº 101/2000 - LRF](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art11).
* **Anomalia de Desidratação do Patrimônio Previdenciário no Radar Cívico:** Alerta crítico no Radar Cívico identificando corrosão contínua das reservas financeiras do RPPS associada a déficit atuarial estrutural e/ou insuficiência de repasses patronais pelo ente instituidor, com fundamentação legal no Art. 40 da [CF/88](https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art40) e na [Lei nº 9.717/1998](https://www.planalto.gov.br/ccivil_03/leis/l9717.htm).
* **Sinalização do Radar Cívico na Navegação (`Sidebar` e `MobileBottomNav`):** Promoção do Radar Cívico para a área superior da barra de navegação desktop com badge pulsante (`motion-safe:animate-pulse`, respeitando `motion-reduce:animate-none`), contagem numérica tabular e dot de alerta discreto na navegação mobile inferior.
* **Instalação Híbrida e Acessível do PWA (`PwaInstallButton`, `Sidebar` e `PwaInstaller`):** Adição de botão dedicado de instalação no rodapé da barra lateral fixa (Desktop) e menu gaveta (Mobile), com suporte adicional a instruções passo a passo para dispositivos iOS/Safari, mantendo link discreto no rodapé institucional.
* **Seleção Rápida "Apenas Esta" em Filtro Multi-Select (`MultiSelect` e `EntidadeSelectCompact`):** Ação contextual exibida ao passar o mouse sobre opções de entidades públicas, permitindo isolar uma unidade orçamentária específica com um único clique.
* **Termos de Uso e Política de Privacidade (`/termos` e `/privacidade`):** Páginas institucionais públicas detalhando o compromisso de transparência ativa, conformidade com a Lei Geral de Proteção de Dados (LGPD - [Lei nº 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)) e a Lei de Acesso à Informação ([Lei nº 12.527/2011](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm)).
* **Endpoint Público de Contagem de Anomalias Ativas (`/api/[portalSlug]/radar/count`):** Rota REST pública com rate limiting e cache com tolerância a falhas para alimentar componentes de navegação com a contagem de alertas críticos.
* **Canal Oficial do Instagram no Rodapé (`SocialLinks` e `GlobalFooter`):** Integração do ícone e perfil oficial no Instagram (`@maistransparencia.ig`) na esteira de redes sociais do rodapé institucional, com links dinâmicos e identificadores parametrizados centralmente via schema Zod (`NEXT_PUBLIC_INSTAGRAM_URL` e `NEXT_PUBLIC_INSTAGRAM_HANDLE`) e rastreamento de engajamento via PostHog.

### 🏛️ Engenharia de Dados & Modelagem dbt (Data & Analytics)
* **Mart Analítico de Patrimônio Histórico do RPPS (`fct_caprem_patrimonio_historico_metricas`):** Modelo dimensional segregando contas de caixa disponível (`111%`) e investimentos de curto (`114%`) e longo prazo (`1213%`) da Matriz de Saldos Contábeis (MSC Patrimonial / SICONFI), com detecção de inconsistência declaratória (`inconsistencia_declaracao_flag`) e mecanismo de quebra de série metodológica (`variacao_abs = null` e `variacao_pct = null`) para prevenir distorções quando houver omissão de reporte pela Prefeitura.
* **Expansão do Motor de Anomalias Fiscais (`fct_anomalias_fiscais_metricas`):**
  - Integração do teste de dependência de transferências correntes com limiares estatísticos baseados na série histórica orçamentária.
  - Integração do teste de desidratação patrimonial do RPPS avaliando simultaneamente perda nominal de patrimônio, déficit atuarial apurado e inadimplência de contribuições patronais.
* **Extensão de Busca Textual no PostgreSQL (`pg_trgm`):** Migração dedicada (`003_enable_pg_trgm.ts`) ativando a extensão `pg_trgm` no PostgreSQL para suportar correspondência difusa e operadores de similaridade trigramática na busca global de compras e contratos.
* **Captura Abrangente de Investimentos Previdenciários (`stg_siconfi_msc_patrimonial`):** Extensão dos filtros de extração na MSC Patrimonial para incluir títulos e valores mobiliários de longo prazo (`1213%`) para o órgão gestor do RPPS (`10132`).

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Gestão Respeitosa de Notificações e Despoluição Visual no Primeiro Acesso:** Reestruturação do fluxo de apresentação de alertas para novos visitantes:
  - *Silenciamento de Primeiro Acesso*: O banner de extração (`ExtractionNotificationBanner`) grava silenciosamente a data mais recente sem exibir alertas irrelevantes a novos visitantes. Em acessos futuros com dados novos, exibe apenas a informação cronológica sem botões redundantes de push.
  - *Desativação de Botão Concorrente na Barra Superior*: Remoção do botão de notificações no cabeçalho mobile/desktop (`PushNotificationTopbarButton`), eliminando o truncamento e a compressão do título do município.
  - *Engajamento Gradual para Web Push (`PushNotificationPrompt`)*: Exigência de visita a pelo menos duas páginas (`minPageViews=2`) e carência ativa de 20 segundos (`delayMs=20000`) antes de exibir o convite de notificações, respeitando o momento de leitura do cidadão.
  - *Banner Condicional Inteligente do PWA no Mobile (`PwaInstaller`)*: Apresentação de banner inferior sutil em telas móveis apenas após engajamento (`minPageViews=2`, carência de 25 segundos) com mecanismo de exclusão mútua via eventos de janela impedindo concorrência com o diálogo de notificações, além de cooldown de 30 dias após descarte.
* **Despoluição da Barra Lateral e Centralização Institucional no Rodapé Global (`Sidebar` e `GlobalFooter`):** Migração do acionador do boletim cívico municipal ("Receber Alertas por E-mail"), do link para o portal oficial do município e da indicação cronológica da última extração de dados da barra lateral para o rodapé global (`GlobalFooter`). A área inferior da barra lateral passa a concentrar exclusivamente utilitários contextuais essenciais (ativação de notificações Web Push e instalação do PWA), tornando o menu lateral mais limpo, focado e ergonômico.
* **Consultas Kysely Otimizadas para Busca Global (`@transparencia/db`):** Métodos de consulta dedicados `searchLicitacoesAndContratos`, `getLicitacaoModalDetails` e `getContratoModalDetails` parametrizados com rankings de relevância de FTS (`ts_rank_cd`), suporte a prefixos de consulta e higienização de pontuação de documentos corporativos.
* **Desacoplamento de Roteamento Semântico no Radar Cívico:** Remoção do campo estático `link_rota` do mart `fct_anomalias_fiscais_metricas`, delegando a resolução de URLs e deep-links para a camada aplicacional (`radar-url.ts`), facilitando a manutenção e prevenindo quebras de rota em migrações de URL.
* **Paginação com Rolagem Suave na Tabela Densa (`DenseTable`):** Implementação de scroll-to-top automático suave ao alternar páginas em listagens extensas de dados, melhorando a ergonomia de navegação no desktop e mobile.
* **Otimização da Toolbar e Exportação CSV em Telas Compactas:** Reestruturação responsiva dos controles de tabela, convertendo botões de exportação para ícones adaptativos com feedback visual e densidade otimizada.
* **Ajuste de Handshake de Conexão no Pool PostgreSQL:** Fixação determinística de `options: "-c search_path=analytics,public"` nos pools de conexão Kysely, evitando condições de corrida em ambientes serverless com cold starts rápidos.

### ⚖️ Governança & Documentação Pública (Governance & Docs)
* **Sincronização dos Guias de Consumo de IA (`llms.txt` e `llms-full.txt`):** Atualização completa das diretrizes públicas para LLMs, documentando as novas rotas de busca (`/api/[portalSlug]/licitacoes/search`), termos de uso, catálogo de anomalias atualizado (dependência de transferências e desidratação do RPPS) e métodos de auditoria de compras.
* **Fundamentação Jurídica Canônica (Regra 20 de `AGENTS.md`):** Vinculação dos novos cards e seções aos dispositivos oficiais do Planalto: Art. 40 da [CF/88](https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art40), [Lei nº 9.717/1998](https://www.planalto.gov.br/ccivil_03/leis/l9717.htm), Art. 11 da [Lei Complementar nº 101/2000 - LRF](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art11) e [Lei nº 14.133/2021](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm).

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Paginação Automática na Extração de Itens do PNCP (`pncp_crawler.py`):** Implementação de paginação contínua na extração de itens de contratações públicas divulgadas no PNCP, garantindo a captura integral de lotes em certames de grande porte.
* **Filtro de Fornecedores Homologados na Busca de Licitações:** Correção de falso descarte de licitações homologadas sem itens individualizados cadastrados no Fiorilli, assegurando que todo processo homologado indexado seja pesquisável.
* **Ajuste de Classes de Botão em `ShowYourWorkButton`:** Padronização das classes de dimensionamento de botões de auditoria para consistência com o design system.
* **Configuração de Extensão `pg_trgm` no Workflow do GitHub Actions:** Inclusão explícita de `CREATE EXTENSION IF NOT EXISTS pg_trgm;` no script de restauração de fixtures do banco de dados nos jobs de teste de CI.
* **Atualização de Dependências Automatizadas:** Atualização segura de bibliotecas via dependabot para mitigação de vulnerabilidades e paridade de versões.

### 🗑️ Depreciações & Remoções (Removed)
* **Worker Legado Cloudflare e Infraestrutura Descontinuada:** Remoção definitiva do subdiretório `infra/cloudflare/ingestion-worker/` após a consolidação completa do orquestrador de ingestão em containers e GitHub Actions.

## [1.10.0] - 2026-09-20

### 🌟 Destaques da Versão (Epics 10, 11 e 12: Radar Cívico de Anomalias, Automação em Nuvem e Isolamento de Schema)
* **Radar Cívico Municipal e Detecção Estatística de Anomalias:** Lançamento de um motor analítico avançado no dbt para detecção tempestiva de anomalias fiscais e desvios atípicos (utilizando rigor estatístico com IQR e Z-score modificado), segregando fluxos orçamentários homólogos de estoques instantâneos 1:1, cobrindo evolução de cargos comissionados, rombo de caixa, concentração de contratações diretas, inadimplências previdenciárias do RPPS e licitações sem desconto ou com deságio excessivo.
* **Feed Mobile-First na Homepage e Navegação Cívica Aprofundada:** Exibição proativa dos alertas cívicos em formato de feed no primeiro scroll da tela inicial, com narrativa estritamente factual e neutra, comparativos com parâmetros normativos, deep linking temático direto para auditoria nas páginas internas (`/pessoal`, `/despesas`, `/licitacoes`, `/caprem`) e compartilhamento facilitado no WhatsApp.
* **Radar de Licitações em Andamento e Enriquecimento pelo PNCP:** Monitoramento preventivo de processos licitatórios abertos antes da adjudicação contratual, taxa de contratação direta, resolução integral de descrições de compras via des-truncamento analítico de objetos (PNCP, Contratos Locais e TCE-RJ) e modal de auditoria de itens com valores unitários, estimados, homologados e fornecedores vencedores.
* **Automação de Ingestão em Nuvem e Notificações Web Push no PWA:** Pipeline autônomo agendado semanal em nuvem (Cloudflare Workers e containers) com acionamento via webhook, acompanhado de infraestrutura completa de Web Push (VAPID) no PWA com opt-in contextual educativo para alertar os cidadãos sobre eventos críticos.
* **Fundação Analítica, Zero Warnings e Isolamento no Schema `analytics`:** Modernização da arquitetura de dados com migração física de todos os marts para o schema dedicado `analytics`, padronização numérica estrita com `numeric(15, 2)`, zero depreciações no dbt e governança automatizada de fixtures de banco de dados (`schema.sql.gz`) com fail-fast no CI/CD.

### ✨ Novas Funcionalidades (Added)
* **Feed do Radar Cívico na Homepage (`RadarCivicoFeed` e `RadarAnomaliaCard`):** Painel responsivo em duas colunas no primeiro scroll da tela inicial apresentando cartões de anomalia factual com badges semânticas de severidade (`critico`, `alto`, `moderado`), contexto temporal claro, métricas apuradas vs. valores de referência esperados e botão de compartilhamento cívico via WhatsApp.
* **Página de Histórico Consolidado do Radar Cívico (`/[portalSlug]/radar`):** Rota dedicada contendo a linha do tempo completa de alertas fiscais e variações atípicas apuradas pelo motor estatístico de 2021 a 2026, com agrupamento cronológico em seções anuais e atalhos rápidos de filtragem por tema.
* **Radar de Licitações Abertas e em Andamento (`LicitacoesEmAndamentoSection`):** Seção analítica destacada na rota `/licitacoes` e no módulo de compras da rota `/saude`, exibindo processos licitatórios em curso, contagem de certames, busca em tempo real por objeto, modalidade e data de abertura para acompanhamento social preventivo antes da homologação.
* **Indicador de Taxa de Contratação Direta:** Métrica de proporção de compras públicas realizadas via dispensa, inexigibilidade e adesão a atas de registro de preços, acompanhada de banner contextual de alerta de concentração de contratações diretas nos termos do Art. 75 da [Lei nº 14.133/2021](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art75).
* **Auditoria Detalhada de Itens Licitados (`LicitacaoItensModal`):** Modal interativo na listagem de licitações ativas detalhando itens individuais de cada processo com quantidade, unidade de medida, valor unitário de referência, valor estimado, valor homologado, percentual de desconto real e CNPJ/razão social dos fornecedores adjudicados.
* **Integração de Compras Divulgadas do PNCP:** Apresentação proativa de contratações públicas divulgadas e homologadas no Portal Nacional de Contratações Públicas (PNCP), incluindo obras estruturantes do Novo PAC e unidades escolares, com badges oficiais da procedência e link seguro para a sala de disputa externa (`linkSistemaOrigem`).
* **Modal de Leitura Acessível e Truncamento Inteligente (`ReadMoreModal`):** Modal de visualização expandida para leitura de textos longos de objetos de contratos e certames licitatórios, assegurando responsividade contínua em telas móveis compactas.
* **Infraestrutura e UX de Notificações Web Push (PWA):** Suporte nativo ao padrão W3C Web Push (VAPID) com fluxo de consentimento prévio educativo (opt-in contextual), botão de gerenciamento de inscrições sincronizado de forma reativa na barra superior e menu lateral via `useSyncExternalStore`, e exibição de alertas críticos do sistema no dispositivo do cidadão.
* **Competência Mensal Explícita na Folha de Pessoal:** Exibição clara do mês de competência da folha de pagamento na interface pública de `/pessoal` (ex: "Competência: Junho"), conectando headcount e remunerações ao mês de referência dos dados.

### 🏛️ Engenharia de Dados & Modelagem dbt (Data & Analytics)
* **Motor Estatístico de Anomalias Fiscais (`fct_anomalias_fiscais_metricas`):** Modelo mart analítico no dbt para detecção matematicamente auditável de anomalias fiscais via Intervalo Interquartil (IQR) e Z-score modificado:
  - *Fluxo Homólogo*: Restrição das anomalias de despesa a exercícios anuais consolidados e comparação temporal mês-a-mês equivalente no exercício corrente, expurgando funções sociais prioritárias (Saúde e Educação).
  - *Estoque Estrutural 1:1*: Avaliação de desvios em quadros de comissionados e saldos de caixa bancário frente a históricos normativos.
  - *Previdência e RPPS*: Monitoramento de déficit atuarial, insuficiência de aportes atuariais e retenção indevida de contribuição patronal no CAPREM ([Lei nº 9.717/1998](https://www.planalto.gov.br/ccivil_03/leis/l9717.htm) e Art. 40 da [CF/88](https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art40)).
  - *Competitividade Licitatória*: Identificação de processos homologados com 0% de desconto (sem disputa real) ou deságio superior a 50% (risco de inexequibilidade contratual conforme Art. 59 da [Lei nº 14.133/2021](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art59)).
  - *Vínculos de Pessoal*: Detecção de divergências entre regime previdenciário e provimento funcional à luz do Art. 37 da [CF/88](https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art37).
* **Pipeline ELT e Ingestão do PNCP (`pncp_crawler.py`):** Módulo de extração e carga assíncrona consumindo a API pública do PNCP, com particionamento temporal mensal, tolerância a retornos HTTP 204 No Content e retentativas exponenciais com backoff resiliente.
* **Hierarquia Analítica de Des-truncamento de Objetos (`int_licitacoes_consolidadas`):** Resolução e ampliação das descrições truncadas (150 caracteres) utilizando a cadeia canônica de precedência oficial: PNCP (1ª prioridade), Contratos Administrativos Locais (2ª prioridade), TCE-RJ (3ª prioridade) e Sistema Fiorilli Local (4ª prioridade).
* **Mart Analítico de Itens Licitados (`fct_licitacoes_itens`):** Novo modelo analítico consolidando catálogo de itens licitados, quantidades, unidades, valores unitários e globais de referência, valores homologados, fornecedores vencedores e cálculo matemático do deságio percentual obtido.
* **Isolamento de Marts no Schema Dedicado `analytics`:** Migração de todos os modelos dimensionais e marts analíticos (`fct_*` e `dim_*`) para o schema `analytics`, expurgando o namespace `public` de tabelas de produção derivadas e configurando concessões de privilégios mínimos (`GRANT SELECT`, `USAGE`) para a role `read_only`.
* **Padronização de Tipos Numéricos em `numeric(15, 2)`:** Uniformização de todas as colunas monetárias e bases de cálculo em marts centrais e setoriais (Posição Fiscal, Despesas, Orçamento, Saúde, CAPREM e Termômetro de Opacidade), garantindo integridade e prevenindo erros de arredondamento em float.
* **Modelagem Numérica de Competência Mensal em Pessoal:** Padronização da coluna `mes_referencia` como tipo integer em modelos staging e marts de pessoal (`stg_porciuncula_prefeitura__pessoal` e `fct_pessoal_regime_metricas`), garantindo rastreabilidade temporal precisa.
* **Automação de Ingestão em Nuvem (`cf-worker-ingestion`):** Orquestrador em Python para execução agendada em nuvem, acionado semanalmente via GitHub Actions e cron triggers em Cloudflare Workers/Containers, com webhook autenticado para atualização de metadados em `dim_portais`.
* **Persistência de Subscrições Web Push (`push_subscriptions`):** Tabela no PostgreSQL para controle de subscrições ativas com armazenamento de endpoints, chaves criptográficas em colunas `TEXT` e rotina de purga de inscrições expiradas (HTTP 410 Gone).

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Consultas Kysely Tipadas e Parametrização de Search Path (`@transparencia/db`):** Configuração automática do evento `connect` nos pools de conexão Kysely com `SET search_path = analytics, public`, viabilizando o consumo transparente de tabelas analíticas e tabelas de configuração, com novos métodos leitores atômicos:
  - `getRadarCivicoAlertas`: Recuperação de alertas fiscais com ordenação decrescente por grau de severidade e materialidade.
  - `getLicitacoesEmAndamentoMetrics`: Leitura de licitações ativas e compras divulgadas do PNCP com filtragem semântica via `unaccent`.
  - `getRawLicitacaoItens`: Consulta detalhada de itens de compras para o modal de auditoria.
  - `getRadarCivicoHistorico`: Consulta histórica agrupada por exercício.
* **Componentes de Apresentação e Tipografia Unificada:** Harmonização visual de cartões, substituição de fontes monoespaçadas por tipografia padronizada em tabelas e cards, refinamento de contraste conforme WCAG 2.1 AA e layout em 2 colunas para exibição dos cards do Radar Cívico.
* **Zero Warnings no dbt e Travamento de Dependências:** Aninhamento de propriedades de testes genéricos sob `arguments:` para compatibilidade estrita com dbt 1.8+/1.12+, fixação de versões exatas em `packages.yml` e eliminação de pre-hooks redundantes para extensão `unaccent`.
* **Despachante de Web Push Otimizado (`dispatch-push`):** Fechamento determinístico de pools de conexão ao término da execução do CLI de despacho e memorização estável de snapshot no cliente React via `useSyncExternalStore` para evitar loops de render.
* **Telemetria de Controle Social no PostHog:** Rastreamento anônimo e ético de métricas de visualização de anomalias, cliques em deep links internos e compartilhamentos de cards cívicos no WhatsApp.

### ⚖️ Governança & Documentação Pública (Governance & Docs)
* **Sincronização dos Guias para LLMs (`llms.txt` e `llms-full.txt`):** Atualização dos manuais de leitura pública para agentes de IA e modelos de linguagem, documentando os conceitos estatísticos do Radar Cívico, catálogo de anomalias, canais de Web Push e as rotas `/radar` e `/licitacoes#licitacoes-em-andamento`.
* **Governança Automatizada de Fixtures de Teste (`Makefile` e CI):** Criação dos comandos `make db/fixture/dump` e `make db/fixture/check`, exigindo a regeneração compulsória de `packages/db/tests/fixtures/schema.sql.gz` em qualquer alteração de modelos analíticos ou seeds, com validação fail-fast no GitHub Actions.
* **Links Oficiais para Legislação (Regra 20 de `AGENTS.md`):** Inclusão de referências diretas com hiperlinks canônicos para normas federais citadas nos alertas cívicos (Art. 37 e Art. 40 da [CF/88](https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm), [Lei nº 4.320/1964](https://www.planalto.gov.br/ccivil_03/leis/l4320.htm), [Lei nº 9.717/1998](https://www.planalto.gov.br/ccivil_03/leis/l9717.htm), [Lei nº 14.133/2021](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm) e [Lei Complementar nº 101/2000 - LRF](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm)).

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Estabilidade de Inscrição Web Push em Ambiente Local:** Tratamento no Service Worker para permitir operação de desenvolvimento em `localhost` sem travar a interface em estado "Ativando...".
* **Resolução de Conflito de Favicon no Next.js:** Remoção de rota duplicada de favicon para evitar inconsistência de carregamento com `public/favicon.ico`.
* **Formatação de Rótulos em Divergências de Pessoal:** Tratamento defensivo de rótulos de vínculos de servidores no modal de auditoria de inconsistências de pessoal.
* **Calibração de Limiares no Motor de Anomalias:** Ajuste de pisos de materialidade e filtros estatísticos em séries históricas curtas para evitar falsos positivos na identificação de comissionados e despesas.
* **Tratamento de Respostas HTTP 204 no PNCP:** Prevenção de tentativas desnecessárias de repetição em consultas à API do PNCP para competências ou órgãos sem compras registradas.

## [1.9.1] - 2026-09-16

### 🌟 Destaques da Versão (Hotfix: Conformidade Contábil da Despesa com Pessoal e RCL - LRF)
* **Adequação Contábil Estrita à Lei de Responsabilidade Fiscal (Art. 18 e 19 da LRF):** Correção metodológica na apuração do gasto com pessoal na página `/pessoal` e nos modelos de dados. A folha salarial nominal foi devidamente segregada da Despesa Total com Pessoal (DTP), passando a incluir os encargos sociais patronais previdenciários (INSS e RPPS - elemento 13) e contratos temporários (elemento 04).
* **Adoção Canônica da Receita Corrente Líquida (RCL):** Substituição da receita orçamentária bruta total pela Receita Corrente Líquida consolidada (RCL) como denominador do percentual de gasto com pessoal, expurgando receitas de capital e deduzindo as parcelas constitucionais obrigatórias (FUNDEB).
* **Alinhamento Imediato com os Relatórios de Gestão Fiscal (RGF/TCE-RJ):** A correção corrigiu distorções históricas onde Porciúncula figurava artificialmente em ~39% a 41%: no exercício fechado de 2024 a DTP atingiu 54,11% (acima do limite máximo legal de 54,0%) e em 2025 atingiu 52,75% (acima do limite prudencial de 51,3%).
* **Sinalização Proativa de Limites Constitucionais na UI:** O card principal na rota `/pessoal` passa a exibir o status contextual da LRF (normal, alerta a 48,6%, prudencial a 51,3% ou excedido a 54,0%), informando com transparência e clareza os gatilhos fiscais para o cidadão.

### 🏛️ Engenharia de Dados & Modelagem dbt (Data & Analytics)
* **Segregação de Folha Nominal e DTP (`fct_pessoal_folha_metricas`):** Inclusão da métrica `despesa_total_pessoal_lrf` cobrindo os elementos de despesa 01, 03, 04, 11, 13, 16 e 96 via `greatest(liquidado, pago)` conforme preceitua o Art. 18 da LRF, preservando `total_folha` para a folha nominal direta (elementos 01, 03, 11, 96).
* **Cálculo da Receita Corrente Líquida (`fct_fontes_receita_metricas`):** Adição da métrica `receita_corrente_liquida` agregada por exercício, consolidando as contas de receitas correntes (classes 1 e 7) deduzidas das deduções legais (classe 9), e expansão das fontes orçamentárias nos filtros de cálculo.
* **Contratos de Schema e Testes dbt:** Atualização de `_fct_pessoal_folha_metricas.yml` e `_fct_fontes_receita_metricas.yml` com validações de integridade matemática e schema contracts.

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Camada de Consultas Tipadas (`@transparencia/db`):** Atualização de `getFolhaVsServicosMetrics` para consumir `despesa_total_pessoal_lrf` e `receita_corrente_liquida`, calculando `percentualFolha` com precisão decimal e computando o enum tipado `statusLrf` (`normal | alerta | prudencial | excedido`) via função pura IIFE (Regra 13 de `AGENTS.md`).
* **Fixtures e Testes de Regressão Kysely:** Atualização do dump de testes `schema.sql.gz`, sementes em `seed.ts` e suíte de testes de paridade em `pessoal-metrics.spec.ts`.

### ⚖️ Governança & Documentação Pública (Governance & Docs)
* **Sincronização dos Guias para LLMs (`llms-full.txt`):** Documentação técnica da metodologia do cálculo fiscal da DTP/RCL conforme o Art. 18 da LRF, especificando os limites de alerta (48,6%), prudencial (51,3%) e teto (54,0%) para consumo por agentes externos.
* **Links Oficiais para Legislação (Regra 20 de `AGENTS.md`):** Links diretos e canônicos para a Lei de Responsabilidade Fiscal no Planalto nos textos explicativos e tooltips.

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Card de Gasto com Pessoal LRF (`PessoalViewModel`):** Renomeação de "Folha / Receita Municipal" para "Gasto com Pessoal (LRF)" e exibição do subtexto dinâmico com o enquadramento fiscal do município frente aos limites legais.

## [1.9.0] - 2026-09-11

### 🌟 Destaques da Versão (Epic 9: Consistência Cívica, Indicadores da Saúde e Disponibilidade Financeira SICONFI)
* **Disponibilidade em Caixa e Saldos Bancários Oficiais (SICONFI/STN):** Ingestão direta da Matriz de Saldos Contábeis (MSC Patrimonial - Classe 1) da Secretaria do Tesouro Nacional, apresentando nas páginas `/orcamento`, `/receitas`, `/caprem` e na Visão Geral o saldo bancário auditado centavo a centavo por entidade pública autônoma (Prefeitura, Fundo de Saúde, Assistência Social, CAPREM e Câmara), prevenindo equívocos entre superávit orçamentário e disponibilidade real em contas bancárias.
* **Estrutura Funcional e Folha de Pagamento por Regime Jurídico e Vínculo:** Painel completo na rota `/pessoal` com decomposição dos servidores e proventos por categoria legal (Efetivos Concursados, Comissionados, Contratos Temporários, Agentes Políticos e Inativos RPPS), acompanhado de auditoria cívica data-driven de divergências cadastrais com nota fundamentada no Art. 37 da Constituição Federal (com link canônico para o Planalto) e indicativos comparativos de variação anual (YoY).
* **Transparência e Alertas na Saúde Pública:** Redesign analítico dos recursos da saúde na rota `/saude`, com exibição em linha única das emendas parlamentares (destacando alocações sem empenho em tom de alerta), badges semânticas de concentração de fornecedores pelo Índice Herfindahl-Hirschman (HHI) e tabela detalhada de credores com rastreabilidade de origem dos recursos.
* **Auditabilidade Ponta a Ponta ("Show Your Work"):** Exportação instantânea em streaming CSV com codificação UTF-8 com BOM (`\uFEFF`) para os novos conjuntos de dados: saldos de caixa do SICONFI (`tipo=siconfi_saldo_caixa`) e microdados de servidores por regime (`tipo=pessoal_regime`), além de ordenação nativa nas tabelas de licitações e contratos.

### ✨ Novas Funcionalidades (Added)
* **Demonstrativo de Saldos de Caixa SICONFI (`SaldoCaixaEntidadesSection` e `SaldoCaixaEntidadesCard`):** Painéis e cards analíticos detalhando a disponibilidade financeira real e saldos bancários por entidade autônoma, com badges oficiais do SICONFI e destaque visual para a segregação patrimonial constitucional dos recursos previdenciários (CAPREM).
* **Painel de Pessoal por Regime Jurídico (`PessoalRegimeSection`):** Tabela e cards estruturados apresentando total de profissionais, valor da folha, provento médio, barra de distribuição proporcional com tooltips contextuais ricos e indicativos de variação anual (YoY) por regime e provimento.
* **Indicadores de Tendência YoY em KPIs (`KPICard`):** Exibição de variações anuais com rigor metodológico (diferença em `p.p.` para taxas percentuais e `%` relativo para grandezas financeiras absolutas) e proteção tipográfica contra sobreposições (`shrink-0 whitespace-nowrap`).
* **Card de Emendas Parlamentares na Saúde (`SaudeEmendasCard`):** Exibição compacta e em linha única dos repasses de emendas na rota `/saude`, destacando valores autorizados vs empenhados com badge rose-600 para alertar sobre saldos sem execução orçamentária.
* **Classificação de Concentração de Fornecedores HHI na Saúde:** Classificação semântica do Índice Herfindahl-Hirschman (`baixa`, `moderada`, `alta` concentração) nos contratos e empenhos da saúde, auxiliando o controle social na detecção de oligopólios de fornecimento.
* **Exportação Auditável de Microdados ("Show Your Work"):** Novos parâmetros no endpoint `/api/[portalSlug]/export` para download de saldos de caixa (`siconfi_saldo_caixa`) e microdados de folha (`pessoal_regime`) com streaming assíncrono e preservação de acentuação no Excel via BOM UTF-8 (`\uFEFF`).
* **Ordenação Nativa e Acessibilidade em Tabelas (`DenseTable` e `LicitacoesTable`):** Cabeçalhos clicáveis e ordenáveis em licitações e contratos com suporte completo a atributos WAI-ARIA (`aria-sort`) e teclado.

### 🏛️ Engenharia de Dados & Modelagem dbt (Data & Analytics)
* **Pipeline ELT da MSC SICONFI (`siconfi_msc_extractor.py`):** Ingestão automatizada da Matriz de Saldos Contábeis Patrimoniais (Classe 1) via API oficial do Tesouro Nacional / STN, com validação estrita via Pydantic, retentativas exponenciais com jitter e normalização de períodos.
* **Sementes de Mapeamento STN / SICONFI:** Novos seeds canônicos `seed_stn_fontes_recursos.csv` e `seed_orgaos_siconfi.csv` mapeando órgãos e fontes de recursos vinculadas e desvinculadas às entidades municipais.
* **Modelo Mart de Disponibilidade de Caixa (`fct_siconfi_saldo_caixa`):** Modelo dbt consolidando saldos de contas correntes, aplicações e caixas por entidade municipal (`Prefeitura`, `Fundo de Saúde`, `Fundo de Assistência Social`, `Previdência/CAPREM`, `Câmara Municipal`), exercício e mês de encerramento.
* **Resgate de Colunas Nativas e Modelo Mart de Pessoal (`fct_pessoal_regime_metricas`):** Mapeamento em `stg_porciuncula_prefeitura__pessoal` das colunas nativas de vínculo (`tiporegime`, `tipocontrato`, `situacaofuncional`, `matricula`) e agregação de métricas de headcount, folha e provento médio por categoria legal e regime previdenciário.
* **Precedência Constitucional na Classificação de Pessoal (`int_pessoal_consolidado`):** Refinamento das regras de negócio de classificação de regime e provimento, priorizando a natureza estrita do vínculo concursado/efetivo e isolando divergências cadastrais.
* **Queries Kysely Tipadas (`@transparencia/db`):** Novas consultas analíticas `getSiconfiCashPosition`, `getPessoalRegimeMetrics`, `getCountDivergenciasCadastraisPessoal`, `getRawSiconfiCashExport` e `getRawPessoalRegimeExport`, com tipagem estrita, transformações funcionais e fixtures de paridade matemática.

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Padronização Estrita de DTOs em `camelCase` (Regra 18 de `AGENTS.md`):** Eliminação de chaves contendo espaços, acentos ou formatação PascalCase em queries e contratos TypeScript em `@transparencia/db` e `apps/web`.
* **Sincronização Cronológica Real de Ano Parcial (`getPartialYearPeriod`):** Exposição de `dataExtracaoDate` nos metadados do portal para exibir o mês de corte real da extração (ex: "Até Maio/2026"), evitando sufixos parciais vazios ou ambíguos.
* **Responsividade Fluida no Card de Gastos Residuais (`.99`):** Reestruturação do card de subitens genéricos com adaptação de layout em 3 níveis (mobile compacto, tablet e desktop) e proteção matemática contra `NaN`.
* **Desacoplamento e Reuso de `DenseTable`:** Refatoração de `LicitacoesTable` para utilizar a base padronizada de `DenseTable`, eliminando duplicação de lógica de ordenação e paginação.
* **Suporte a Estilo Inline em Tooltip (`TooltipProps`):** Adição da propriedade `style` no componente base `@transparencia/ui` para posicionamento contextual refinado contra as bordas da tela.
* **Saneamento da Apresentação da Folha:** Descontinuação do componente legado `DepartmentalPayrollChart` na página `/pessoal`, consolidando a rota exclusivamente no quadro funcional e salarial dos servidores públicos.

### ⚖️ Governança & Documentação Pública (Governance & Docs)
* **Regra 18 em `AGENTS.md` (Padrão de Identificadores e DTOs em TypeScript):** Formalização da diretriz obrigatória exigindo convenção estrita em `camelCase` para todas as propriedades de interfaces, tipos, DTOs e loaders.
* **Regra 20 em `AGENTS.md` (Hiperlinks Oficiais para Legislação Citada):** Obrigatoriedade de links canônicos do portal da Presidência da República / Casa Civil (`planalto.gov.br`) para qualquer norma ou artigo legal citado na interface pública.
* **Sincronização dos Guias para Agentes e LLMs (`llms.txt` e `llms-full.txt`):** Atualização completa das rotas públicas, convenções contábeis da MSC SICONFI, métricas de regimes de pessoal e documentação detalhada do endpoint `/api/[portalSlug]/export`.

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Tratamento de Saldos a Descoberto no SICONFI:** Identificação e tratamento visual adequado para contas bancárias ou disponibilidades temporariamente negativas.
* **Segregação Rigorosa de Contas Previdenciárias:** Garantia de isolamento das contas do RPPS (CAPREM) nas queries de exportação SICONFI.
* **Normalização de Fuso Horário em Datas de Extração:** Parsing defensivo de datas no cliente e servidor prevenindo divergências de fuso horário UTC na exibição do período de extração.
* **Tratamento Tipográfico em Badges YoY:** Prevenção de quebra de linha ou sobreposição visual em variações anuais (`shrink-0 whitespace-nowrap`).

## [1.8.1] - 2026-09-04

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Indicador Folha / Receita Municipal (LRF):** Correção do cálculo de `rclProxy` em `getFolhaVsServicosMetrics` (`@transparencia/db`) para adotar a arrecadação municipal consolidada do exercício mesmo sob filtro de entidade, evitando distorções matemáticas artificiais (como os 147% no FMAS) e desativando alertas indevidos de teto da LRF para fundos setoriais.
* **Consolidação Municipal de Proventos e Chefias:** Remoção do filtro de entidade nas consultas de distribuição por faixas salariais (`distribuicaoProventos`) e ocupação de chefias (`pctChefias`) na página de Pessoal e na Visão Geral, exibindo com transparência pedagógica os dados consolidados de todos os servidores municipais (uma vez que a folha analítica individual de origem não é segregada por órgão).
* **Empty State no Gráfico de Proventos:** Inclusão de estado vazio defensivo e tag `Consolidado Municipal` no componente `ProventosDistributionChart`.

## [1.8.0] - 2026-09-04

### 🌟 Destaques da Versão (Epic 8: Auditabilidade Cívica ('Show Your Work'), Transparência Metodológica e Navegação Mobile Contínua)
* **Auditabilidade Cívica Direta ("Show Your Work"):** Exportação instantânea em streaming CSV com codificação UTF-8 com BOM (`\uFEFF`) diretamente a partir de cards analíticos (gastos sensíveis e termômetro de opacidade), viabilizando a conferência centavo a centavo dos microdados públicos por cidadãos, jornalistas e órgãos de controle.
* **Decomposição da Dívida Real por Entidade:** Popovers interativos e acessíveis no Radar de Gastos Sensíveis detalhando a dívida flutuante e restos a pagar por ente público (Prefeitura, Fundo Municipal de Saúde, Fundo de Assistência), prevenindo generalizações e identificando o real passivo setorial.
* **Navegação Mobile Contínua & Seletor de Perímetro Institucional:** Nova tab bar fixa no rodapé móvel (`MobileBottomNav`) com stepper cívico e atalhos rápidos, acompanhada de seletor compacto de entidade no topo móvel (`EntidadeSelectCompact`), viabilizando alternância fluida entre visão `Consolidada` e órgãos específicos com uma única mão.
* **Transparência Metodológica e Guias para IA:** Expansão abrangente dos arquivos públicos `llms.txt` e `llms-full.txt` documentando a arquitetura dos endpoints de exportação, regras de agregação contábil e critérios de consolidação para assistentes de inteligência artificial e cidadãos.

### ✨ Novas Funcionalidades (Added)
* **Botão "Show Your Work" (`ShowYourWorkButton`):** Menu dropdown acessível integrado aos cards analíticos de gastos sensíveis e termômetro de opacidade (`.99`), disponibilizando o download direto de microdados em CSV (`/api/[portalSlug]/export`) e acionando telemetria PostHog (`show_your_work_download_clicked`).
* **Endpoint de Streaming CSV de Alta Performance (`/api/[portalSlug]/export`):** Rota server-side com transmissão em streaming assíncrono de registros contábeis brutos, incluindo cabeçalho BOM UTF-8 (`\uFEFF`) para compatibilidade nativa com Excel e Google Sheets sem corrupção de caracteres.
* **Popover de Decomposição da Dívida (`DecomposicaoDividaPopover`):** Mini-painel flutuante baseado em Radix UI com barras de participação percentual, permitindo auditar a distribuição dos restos a pagar por órgão/entidade ao tocar ou clicar no valor da Dívida Acumulada.
* **Barra Fixa de Navegação Mobile (`MobileBottomNav`):** Tab bar de navegação no rodapé para dispositivos móveis (`md:hidden`) com 5 abas principais, botão "Mais" para o drawer lateral, botões de avanço e retrocesso (`← Anterior` / `Próximo →`) e contexto de estado integrado (`MobileNavContext`).
* **Seletor Compacto de Perímetro no Header Móvel (`EntidadeSelectCompact`):** Componente no cabeçalho superior móvel com rigorosa simetria tipográfica ao seletor de ano (`YearSelect`), permitindo filtrar dinamicamente entre `Consolidado` e órgãos individuais via parâmetro `entidades` na URL sincronizado com `nuqs`.

### 🏛️ Engenharia de Dados & Infraestrutura de Banco (Data & Analytics)
* **Query Atômica de Exportação de Dados Brutos (`export-raw-data.ts`):** Nova função `getRawExpensesExport` em `@transparencia/db` com filtros parametrizados por categoria sensível, rubrica `.99`, fornecedor e órgão, realizando join com `dim_orgao` para recuperar `orgao_nome` e projetando `categoria_sugerida` e `natureza_codigo_sugerido`.
* **Desagregação da Dívida no Kysely (`despesas-metrics.ts`):** Expansão de `getGastosSensiveisConsolidados` com a propriedade `decomposicao_divida`, computando o saldo de restos a pagar por entidade e sua participação percentual relativa sobre o total acumulado da categoria.
* **Fixtures de Teste Enriquecidas (`seed.ts`):** Inclusão de registros com múltiplos órgãos (`Fundo Municipal de Saúde` e `Prefeitura Municipal`) e metadados de classificação sugerida para validação de paridade matemática centavo a centavo.

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Ergonomia e Layout Mobile Global (`layout.tsx` e `sidebar.tsx`):** Ajuste de espaçamento inferior (`pb-20 md:pb-0`) para evitar sobreposição de elementos pelo `MobileBottomNav`, elevação de z-index do drawer e backdrop para `z-40`/`z-50` sobrepondo o rodapé (`z-30`), e desacoplamento do seletor de ano redundante do topo móvel.
* **Offset Vertical do Banner PWA (`pwa-installer.tsx`):** Ajuste do banner de instalação do Progressive Web App para `bottom-20 md:bottom-4`, preservando a visibilidade da barra de navegação móvel inferior.
* **Transições e Acessibilidade do Drawer Móvel:** Implementação de animação suave de slide/fade (`translate-x-full transition-transform duration-200`) e travamento de scroll do `body` durante a abertura do menu drawer.

### ⚖️ Governança & Documentação Pública (Governance & Docs)
* **Sincronização dos Guias para LLMs (`llms.txt` e `llms-full.txt`):** Atualização em conformidade estrita com a Regra 12 de `AGENTS.md`, documentando a rota `/api/[portalSlug]/export`, dicionário de parâmetros (`categoria`, `subitem`, `fornecedor`, `entidades`), notas metodológicas de consolidação institucional e links para download auditável.
* **Proteção contra Vazamento de Dados Internos (Leak Check):** Criação da suíte `apps/web/lib/__tests__/llms-guides.spec.ts` validando formalmente a integridade dos guias públicos e a ausência de termos de infraestrutura interna ou dados confidenciais.
* **Atualização de Capturas de Tela (`screenshot-mobile.png`):** Renovação da imagem visual de demonstração do portal refletindo a nova barra móvel inferior e o seletor compacto de entidade.

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Alinhamento do Fallback de Redes Sociais no CI:** Padronização de asserções em `env.spec.ts` e `social-links.spec.tsx` com o valor canônico institucional `NEXT_PUBLIC_FACEBOOK_URL="https://facebook.com/profile.php?id="`.
* **Acessibilidade e Foco (WAI-ARIA):** Inclusão de atributos `aria-haspopup="dialog"`, rótulos `aria-label`, foco gerenciado e fechamento por tecla `Escape` em `DecomposicaoDividaPopover` e `EntidadeSelectCompact`.
* **Ordenação Decrescente e Tratamento de Zeros na Dívida:** Ordenação determinística por valor e percentual com tratamento gracioso de categorias sem passivo acumulado na decomposição por entidade.

## [1.7.1] - 2026-09-04

### 🌟 Destaques da Versão (Hotfix v1.7.1: Saneamento Léxico e Desagregação Canônica de Despesas Sensíveis)
* **Segregação de Equipamentos Hospitalares e Plantões Clínicos:** Desagregação analítica determinística entre serviços médicos humanos presenciais e locação de usinas de oxigênio/equipamentos hospitalares, eliminando distorções de custos na saúde pública.
* **Depuração Rigorosa da Rubrica de Plantões Médicos:** Restrição estrita a termos clínicos diretos e exclusão determinística de funções de apoio operacional (cozinheiras, motoristas, portaria e vigias) indevidamente classificadas sob a rubrica médica.
* **Isolamento de Assistência Domiciliar (Home Care):** Criação de categoria dedicada com segregação precisa entre prestadores pessoa física (`3.3.90.36.06`) e pessoa jurídica (`3.3.90.39.99`).
* **Saneamento Upstream de Falsos Positivos:** Purificação de filtros léxicos em resíduos sólidos (exclusão de tarifas de água da CEDAE), combustíveis (segregação de peças automotivas), previdência (exclusão de PASEP) e consultoria técnica.

### ✨ Novas Funcionalidades (Added)
* **Novas Categorias de Despesas Sensíveis na Web & E-mails:** Apresentação transparente das categorias `locacao_equipamentos_saude`, `assistencia_domiciliar_home_care`, `pecas_manutencao_frota` e `aluguel_social` com rotulagem amigável no componente `TermometroOpacidadeFiscal` e no boletim cívico transacional `RadarDigestEmail`.

### 🏛️ Engenharia de Dados & Modelagem dbt (Data & Analytics)
* **Refatoração Léxica Canônica (`int_despesas_reclassificadas`):**
  * Introdução das categorias em lowercase snake_case `locacao_equipamentos_saude` (`3.3.90.39.12`), `assistencia_domiciliar_home_care` (PF `3.3.90.36.06` / PJ `3.3.90.39.99`), `pecas_manutencao_frota` (`3.3.90.30.39`) e `aluguel_social` (`3.3.90.48.00`), em conformidade com as Regras 9 e 10 de `AGENTS.md`.
  * Refinamento de `plantoes_medicos` com vocabulário estritamente clínico e aplicação de cláusulas de exclusão negativa para serviços não clínicos.
  * CTE `despesas` atualizada com fallback defensivo (`coalesce` e `unaccent`) garantindo integridade léxica contra valores nulos em fixtures de teste.
* **Atualização do Catálogo STN (`seed_naturezas_despesa_stn.csv`):** Inclusão das naturezas canônicas `3.3.90.36.06` (Serviços Técnicos Profissionais), `3.3.90.48.00` (Outros Auxílios Financeiros a Pessoas Físicas) e alinhamento de `3.3.90.30.39` com a categoria macro `pecas_manutencao_frota`.

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Constantes e Tipagem Fiscal (`@transparencia/db`):** Atualização de `CATEGORIAS_OBJETO_SUGERIDAS` e do tipo `CategoriaObjetoSugerida` para inclusão dos 4 novos discriminadores fiscais.
* **Formatadores UI com Early Returns (`apps/web`):** Padronização das funções de formatação `formatCategoriaSensivel` e `formatCategoriaCredor` com retornos antecipados em conformidade com a Regra 13 de `AGENTS.md` (Zero Ternários Aninhados).

### ⚖️ Governança & Documentação Pública (Governance & Docs)
* **Governança de Constantes Fiscais:** Alinhamento com as diretrizes de desagregação de subitens residuais `.99` e fundamentação nas normas da STN/MCASP e Lei 4.320/64.

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Saneamento de Falsos Positivos Upstream:**
  * `limpeza_residuos`: Exclusão de faturas da concessionária estadual de água (CEDAE) erroneamente catalogadas sob o código `3.3.90.39.44`.
  * `combustivel_frota`: Segregação de peças automotivas, baterias e pneus da rubrica de abastecimento e combustíveis.
  * `previdencia`: Exclusão de recolhimentos PASEP (`3.3.90.13.99`) do agregado de previdência e obrigações patronais.
  * `bloqueios_sentencas`: Exclusão de despesas com aquisição de imóveis e terrenos sob elemento `61`.
  * `consorcios_publicos`: Exclusão de compras diretas de medicamentos e insumos hospitalares.
  * `consultoria_tecnica`: Exclusão de reparos e manutenções físicas/operacionais (climatização, elétrica e CFTV).
* **Expansão da Cobertura de Testes Automatizados:**
  * Inclusão de 8 novos cenários de teste unitário dbt em `_int_despesas_reclassificadas.yml` validando todas as novas classes e regras de exclusão.
  * Atualização dos testes unitários de ranking em `_fct_opacidade_contabil_metricas.yml` contemplando credores das novas categorias sugeridas.
  * Expansão da suíte de testes unitários em TypeScript (`opacidade-contabil-metrics.spec.ts`, `termometro-opacidade-fiscal.spec.tsx` e `radar-digest.spec.tsx`).

## [1.7.0] - 2026-09-02

### 🌟 Destaques da Versão (Epic 7: Distribuição Cívica, Engajamento Comunitário, Newsletters Automatizadas e Social Sharing Dinâmico)
* **Cartões OpenGraph Dinâmicos na Edge:** Geração automática e em tempo real de cards visuais (1200x630px) com métricas fiscais consolidadas (gastos, receitas, previdência, despesas com pessoal e restos a pagar) para compartilhamento no WhatsApp, Telegram e redes sociais.
* **Newsletter Cívica & Boletim Radar Digest:** Canal direto de comunicação com a cidadania via e-mail com double opt-in seguro, conformidade estrita com a LGPD, cancelamento com 1 clique (RFC 8058 `List-Unsubscribe`) e resumos periódicos de despesas e restos a pagar.
* **Publicação Social Multi-Canal Automatizada:** Bots cívicos oficiais integrados ao X.com (`@mtransparenciax` via OAuth 1.0a) e Facebook Pages (via Meta Graph API v26.0) para disseminação programática de manchetes fiscais e novos lotes de dados.
* **Governança Estrita de Ambientes & Tipagem Segura:** Centralização e validação em tempo de compilação/execução de todas as variáveis de ambiente com `@t3-oss/env-nextjs` e Zod (Regra 17 de `AGENTS.md`), prevenindo vazamentos de credenciais e falhas silenciosas.

### ✨ Novas Funcionalidades (Added)
* **Geradores Dinâmicos de OpenGraph (`opengraph-image.tsx`):** Criação de geradores de imagem na edge para todas as rotas públicas do portal (`/`, `/despesas`, `/receitas`, `/orcamento`, `/licitacoes`, `/pessoal`, `/caprem`, `/saude`), baseados no componente `OGCardTemplate` com tema claro, tipografia legível e logomarca oficial.
* **Modal e Banner de Newsletter (`NewsletterModal` e `NewsletterFeedbackBanner`):** Componentes acessíveis na sidebar e footer para cadastro de cidadãos, com validação de e-mail em tempo real, proteção contra envios robotizados e feedback visual contextual de confirmação e cancelamento.
* **Boletim Cívico "Radar Digest" (`RadarDigestEmail`):** Template de e-mail transacional responsivo desenvolvido em React Email (`@react-email/components`), exibindo balanço fiscal do exercício (receita vs despesa líquida), monitoramento de restos a pagar, maiores credores e alertas orçamentários.
* **Rotas de API para Gestão de Assinaturas:** Endpoints `/api/newsletter/subscribe`, `/api/newsletter/confirm` e `/api/newsletter/unsubscribe` com suporte normativo aos cabeçalhos RFC 8058 (`List-Unsubscribe` e `List-Unsubscribe-Post`).
* **Orquestrador de Publicação Social (`SocialPublisher`):** Integração modular com suporte simultâneo a X.com (`XBotClient` com OAuth 1.0a) e Facebook Pages (`FacebookBotClient` com Meta Graph API v26.0), acionáveis via endpoint protegido `/api/social/publish` ou script CLI (`bin/publish-social.ts`).
* **Componente de Conexão Cívica (`SocialLinks`):** Exibição de canais oficiais e repositório open-source na barra lateral e rodapé, com links dinâmicos para X e Facebook parametrizados via variáveis de ambiente.

### 🏛️ Engenharia de Dados & Infraestrutura de Banco (Data & Analytics)
* **Sistema de Migrações Kysely (`@transparencia/db`):** Implementação do migrador programático (`migrator.ts` e comando `pnpm db:migrate`) para controle e versionamento do schema do banco de dados.
* **Migração `001_create_newsletter_subscribers.ts`:** Criação da tabela `newsletter_subscribers` com isolamento multi-tenant (`portal_slug`), status do ciclo de vida (`pendente`, `confirmado`, `cancelado`), timestamps e colunas de texto estritamente tipadas como `TEXT` (em conformidade com a Regra 16 de `AGENTS.md`).
* **Arquitetura Dual-Pool no Kysely (`client.ts`):** Segregação estrutural entre pool de leitura analítica (`readOnlyDb`) e pool de escrita transacional (`adminDb`), assegurando o princípio do menor privilégio.
* **Provisionamento de Permissões no PostgreSQL (`01-init-roles.sql`):** Configuração automatizada de permissões da role `read_only`, concedendo permissão de escrita estritamente necessária na tabela de assinantes.
* **Queries Analíticas Atômicas (`queries/newsletter.ts` e `queries/radar-digest.ts`):** Funções atômicas `getConfirmedSubscribers` e `getRadarDigestMetrics` para consolidação dos dados fiscais do município (receita arrecadada, despesas pagas, restos a pagar liquidados/pendentes e ranking de credores) utilizados no boletim.

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Centralização Canônica de Variáveis de Ambiente (`apps/web/env.ts`):** Validação estrita de variáveis em tempo de compilação com `@t3-oss/env-nextjs` e Zod, eliminando chamadas dispersas e inseguras a `process.env`.
* **Limitação de Taxa em Memória (`rate-limit.ts`):** Mecanismo de janela deslizante (sliding window) leve para prevenir abusos nas rotas públicas de submissão de newsletter sem dependências de infraestrutura externa.
* **Cliente Resend com Tolerância a Falhas (`resend.ts`):** Tratamento defensivo de erros da API, retentativas e suporte a divergências de relógio (clock skew) nos formulários com verificação temporal anti-bot.
* **Comandos de Automação no `Makefile`:** Inclusão dos targets `db/migrate`, `digest/dispatch` e `social/publish` para execução unificada das rotas e scripts operacionais via CLI.

### ⚖️ Governança & Documentação Pública (Governance & Docs)
* **Regra 16 em `AGENTS.md` (Campos de Texto no PostgreSQL):** Formalização da proibição de `VARCHAR(n)` e `CHAR(n)`, exigindo o tipo `TEXT` para todas as colunas de texto em novas migrações.
* **Regra 17 em `AGENTS.md` (Centralização de Variáveis de Ambiente):** Diretriz mandatória proibindo chamadas diretas a `process.env` na aplicação web, exigindo consumo exclusivo a partir de `@/env`.
* **Sincronização dos Guias para LLMs (`llms.txt` e `llms-full.txt`):** Inclusão de documentação pública sobre as rotas de OpenGraph, canais de distribuição de alertas municipais, diretrizes de privacidade conforme a LGPD e links sociais oficiais.
* **Manuais de Configuração de Ambiente (`.env.example`):** Criação e sincronização dos arquivos de exemplo na raiz e em `apps/web/`, documentando todas as credenciais de e-mail, redes sociais e telemetria.

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Mitigação de Timing Attacks:** Implementação de `crypto.timingSafeEqual` para comparação em tempo constante de Bearer tokens em endpoints protegidos de despacho.
* **Paridade de Restos a Pagar nos Posts Sociais:** Alinhamento dos formatadores dos bots sociais para refletir o saldo de restos a pagar em paridade com a Visão Geral do portal, substituindo referências a taxas de opacidade isoladas.
* **Resiliência a Formatos de Desinscrição RFC 8058:** Suporte para requisições com `Content-Type: application/x-www-form-urlencoded` e `multipart/form-data` nos cancelamentos acionados diretamente por clientes de e-mail.
* **Tratamento Defensivo de Dados:** Validação numérica em anos fiscais, fallbacks graciosos para municípios sem histórico e sanitização de domínios em rotas de metadados.

## [1.6.1] - 2026-08-29

### 🌟 Destaques da Versão (Hotfix: Otimização de Performance & Estabilidade do CI)
* **Aceleração do Pipeline de Despesas (Redução de 110s para 6.5s):** Eliminação de inlining repetitivo de `unaccent()` e materialização da etapa de reclassificação léxica, prevenindo timeouts na execução do dbt em instâncias com recursos restritos (Supabase).
* **Indexação Estratégica de Marts (`fct_despesas`):** Adição de índices B-Tree compostos para consultas de gastos sensíveis, restos a pagar e fornecedores na camada de aplicação.
* **Estabilidade da Fixture de Testes (CI/CD):** Inclusão automática dos dados de tabelas de sementes (`seed_*`) no dump de fixture do banco de dados, garantindo paridade total entre testes locais e GitHub Actions.

### 🏛️ Engenharia de Dados & Modelagem dbt (Data & Analytics)
* **Pré-computação em `int_despesas_consolidadas.sql`:** Projeção direta dos campos normalizados (`texto_objeto`, `texto_fornecedor`, `texto_completo`, `texto_proj_ativ`) na tabela consolidada, garantindo execução única do `unaccent` por registro.
* **Otimização em `int_despesas_reclassificadas.sql`:** Aplicação de `materialized` na CTE de inferência léxica para impedir reavaliação de regexes no preenchimento de metadados da Portaria STN/SOF.
* **Índices B-Tree em `fct_despesas.sql`:** Configuração nativa no dbt-postgres para indexar colunas-chave (`portal_slug, ano`, `empresa_id`, `categoria_gasto_sensivel`, `fonte`, `fornecedor_cpf_cnpj`, `elemento`, `funcao`).

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Tempo Total de Execução do dbt:** Redução superior a 90% no tempo total de build do cluster de despesas (de 67.11s para 6.50s localmente).
* **Dump de Fixture Aprimorado (`Makefile`):** Atualização do target `db/fixture/dump` para gerar `--schema-only` de tabelas fato/dimensão e `--data-only` das tabelas de sementes (`seed_*`).

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Tratamento de Rota 404 em Portais:** Retorno explícito de página 404 para requisições com `portalSlug` inexistente ou inválido.
* **Resiliência em Métricas de Opacidade:** Degradação graciosa de consultas quando marts ou constantes fiscais não possuem registros.

## [1.6.0] - 2026-08-29

### 🌟 Destaques da Versão (Epic 6: Reformulação Fiscal de Despesas)
* **Radar de Gastos Sensíveis:** Monitoramento em tempo real de 6 categorias prioritárias (Combustíveis, Frotas, Aluguel de Imóveis, Eventos, Diárias e Obras) com cálculo de dívida real acumulada (empenhos do exercício + restos a pagar herdados).
* **Monitoramento de Gastos Genéricos (Subitens `.99`):** Termômetro de opacidade orçamentária fundamentado na Lei Federal nº 4.320/64 (Arts. 5º e 15), com distinção metodológica inédita entre despesas *Evitáveis* (39.99/36.99/30.99) e *Estruturais* (Sentenças 91.99 e Previdência 13.99).
* **Reclassificação Orçamentária STN:** Mecanismo automático de inferência de objeto que sugere códigos canônicos da Portaria STN/SOF para Consórcios de Saúde, Limpeza Urbana & Resíduos, Previdência e Plantões Médicos.
* **Redesenho de Despesas em 3 Atos:** Homepage despoluída e página de despesas reestruturada com navegação guiada, série histórica interanual (2021–2025) e totalização líquida.

### ✨ Novas Funcionalidades (Added)
* **Componente `TermometroOpacidadeFiscal`:** Termômetro com régua de risco calibrada (até 15% esperado, 15%–30% atenção, >30% elevado), callout de achado de concentração e quebra por elemento pai.
* **Ranking de Credores em `.99` com Sugestão de Objeto:** Tabela de maiores fornecedores com badges inteligentes indicando a real destinação do recurso (ex: CODESP → Consórcios de Saúde; Coop. Catadores → Limpeza Urbana).
* **Componente `RadarGastosSensiveis`:** 6 cards temáticos com percentual sobre o orçamento pago e segregação de restos a pagar.
* **Série Histórica Fechada (2021–2025):** Visualização interanual do índice de opacidade para comparação de mandatos e exercícios fiscais.

### 🏛️ Engenharia de Dados & Modelagem dbt (Data & Analytics)
* **Novo Seed SSOT `seed_naturezas_despesa_stn.csv`:** Catálogo padronizado de códigos e descrições da Portaria STN/SOF e MCASP do Tesouro Nacional.
* **Modelo Intermediário `int_despesas_reclassificadas.sql`:** Pipeline de inferência léxica com hierarquia de precedência estrita para desambiguação de despesas.
* **Marts de Métricas Forenses:** 
  * `fct_opacidade_contabil_metricas.sql`: Indicadores de taxa de opacidade e limites de risco anuais.
  * `fct_opacidade_contabil_credores.sql`: Ranking e agrupamento de credores residuais com tratamento `unaccent`.
  * `fct_opacidade_contabil_elementos.sql`: Distribuição por elemento pai (39.99, 36.99, 30.99, etc.).
* **Desacoplamento de `fct_despesas.sql`:** Expulso o bloco monolítico de regexes para o modelo intermediário.

### ⚖️ Governança & Documentação Pública (Governance & Docs)
* **Guia de Governança Fiscal (`docs/governanca-constantes-fiscais.md`):** Protocolo de auditoria, calendário de revisão anual de limites de licitação e procedimento de atualização de seeds.
* **Hiperlinks de Bases Legais:** Inclusão de `url_base_legal` no `seed_constantes_fiscais.csv` com links oficiais diretos para o Planalto e TCU.
* **Sincronização de IA (Regra 12 de `AGENTS.md`):** Atualização completa dos manuais públicos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`.

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Linguagem Cidadã Não-Acusatória:** Textos e badges readequados com neutralidade técnica e rigor estatístico.
* **Ajustes de Responsividade Mobile:** Correção de alinhamento de barras de progresso, padding e layout touch-friendly.
* **Safe Bounding:** Tratamento preventivo de divisão por zero e overflow percentual nas queries Kysely e modelos dbt.
