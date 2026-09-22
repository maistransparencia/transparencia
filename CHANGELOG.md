# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.
O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e este projeto adere ao [Semantic Versioning](https://semver.org/).

## [Unreleased]

### ✨ Novas Funcionalidades (Added)
* **Visibilidade e Sinalização do Radar Cívico na Navegação (`Sidebar` e `MobileBottomNav`):** Indicador visual não-intrusivo e acessível para anomalias fiscais críticas ativas no exercício selecionado. No menu lateral desktop (`Sidebar`), o "Radar Cívico" foi promovido para o bloco superior da navegação (logo abaixo de "Visão geral"), garantindo visibilidade imediata sem scroll tanto no desktop quanto na abertura do drawer móvel. Exibe badge com indicador em pulso suave (`motion-safe:animate-pulse`, respeitando `motion-reduce:animate-none`), `role="status"` e contagem numérica em `tabular-nums` sem emojis ou sirenes. No mobile (`MobileBottomNav`), adiciona um dot luminoso discreto sobre a aba "Mais", preservando a Topbar limpa e ocultando-se automaticamente quando o menu lateral estiver aberto.
* **Consulta Atômica e Endpoint Público de Alertas do Radar (`getRadarAnomaliasCount` e `/api/[portalSlug]/radar/count`):** Nova consulta atômica na camada `@transparencia/db` com agregação rápida de anomalias com severidade `'critico'`, cache de layout com tolerância a falhas via `unstable_cache` (`getRadarAnomaliasCountByYear`), e endpoint REST público com rate limiting (60 req/min) e cabeçalhos `Cache-Control`.

### ⚖️ Governança & Documentação Pública (Governance & Docs)
* **Sincronização dos Guias de Consumo de IA (`llms.txt` e `llms-full.txt`):** Inclusão da rota pública `/api/[portalSlug]/radar/count` e documentação dos sinalizadores cívicos de navegação para consulta automatizada por assistentes de IA (Regra 12 do AGENTS.md).

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Handshake de Conexão e Estabilidade em Servidores Serverless (`@transparencia/db`):** Configuração determinística do parâmetro `options: "-c search_path=analytics,public"` nos pools de conexão do PostgreSQL (`pool` e `writePool`). A injeção direta no pacote de inicialização (`StartupMessage`) elimina a condição de corrida assíncrona do evento não-bloqueante `pool.on("connect")` durante cold starts de funções serverless na Vercel, prevenindo falhas intermitentes de tabela inexistente (`42P01: relation does not exist`) em consultas ao schema `analytics` através de poolers em modo de transação.

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
