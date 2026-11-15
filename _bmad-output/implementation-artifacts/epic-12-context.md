# Epic 12 Context: Radar Cívico Ativo, Detecção de Anomalias e Funil de Engajamento

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Transformar o portal da transparência em uma plataforma proativa de controle social e engajamento cívico, implementando um motor estatístico no dbt para detecção rigorosa de anomalias fiscais (segregando fluxos homólogos de estoques/snapshots estruturais), exibindo um feed mobile-first factual e não-acusatório na Homepage para guiar o cidadão para páginas temáticas profundas, ativando distribuição multicanal (Web Push para anomalias críticas, social cards e telemetria) e disponibilizando o monitoramento preventivo em tempo real de licitações públicas abertas e em andamento (inclusive no setor de saúde).

## Stories

- Story 12.1: Modelagem dbt do Motor Estatístico de Anomalias Fiscais (Fluxo Homólogo vs. Estoque 1:1)
- Story 12.2: Camada de Acesso a Dados Kysely (`@transparencia/db`) com Roteamento Canônico e DTOs Tipados
- Story 12.3: Feed Mobile-First do Radar Cívico na Homepage com Linguagem Factual e Funil de Navegação
- Story 12.4: Distribuição Multicanal: Web Push, Cards Sociais e Telemetria PostHog
- Story 12.5: Radar de Licitações Abertas e em Andamento nas Páginas de Licitações e Saúde
- Story 12.6: Página de Histórico do Radar Cívico com Seções Anuais Cronológicas em Temas
- Story 12.7: Expansão do Radar Cívico: Detecção de Anomalias Previdenciárias (CAPREM / RPPS) e Candidatos de Compras
- Story 12.8: Des-truncamento, Itens Licitados e Enriquecimento de Licitações (Contratos Internos, PNCP e TCE-RJ)
- Story 12.9: Truncamento Inteligente de Células, Modal de Leitura, Auto-filtro de Licitações e Modal de Auditoria de Vínculos de Pessoal

## Requirements & Constraints

- **Segregação Metodológica de Anomalias (Fluxo vs. Estoque)**:
  - *Métricas de Fluxo (Despesas por Função e Licitações)*: Para exercícios correntes incompletos, comparar exclusivamente períodos temporais homólogos equivalentes mês-a-mês (ex: Jan–Ago do ano corrente vs. Jan–Ago de exercícios anteriores), eliminando anomalias ilusórias geradas por sazonalidade orçamentária ou incompletude do exercício.
  - *Métricas de Estoque/Snapshot (Pessoal e Disponibilidade Financeira)*: Comparar a posição estrutural instantânea ativa 1:1 (headcount ativo de comissionados e saldo de caixa bancário) contra as médias históricas observadas em períodos equivalentes.
- **Detecção Estatística Robusta no dbt (SSOT)**: Aplicar métodos estatísticos consagrados (Intervalo Interquartil - IQR e Z-score modificado) diretamente na modelagem analítica dbt para mitigar falsos-positivos e calcular desvios de forma matematicamente auditável, sem computação analítica no runtime TypeScript.
- **Neutralidade e Rigor Factual da Linguagem**: Toda anomalia deve gerar sumários explicativos com tom estritamente descritivo, neutro e factual (ex: indicação de desvio percentual e valores absolutos), sendo terminantemente vedado o uso de vocabulário acusatório, conclusões de dolo ou adjetivos sensacionalistas.
- **Padronização de Slugs e Classificadores**: Todos os classificadores e códigos contidos nos marts e DTOs devem utilizar estritamente o formato lowercase snake_case (`tipo_anomalia`, `grau_severidade`, `situacao`), com campos textuais no PostgreSQL tipados como `TEXT`.
- **Roteamento Canônico e Deep Linking Contextual**: Os alertas de anomalia devem encapsular rotas de destino (`deepLinkRota`) com preservação de searchParams e âncoras temáticas (ex: `/[portalSlug]/pessoal?ano=2024#comissionados`), conduzindo o cidadão diretamente ao contexto visual relevante.
- **Monitoramento em Tempo Real de Licitações em Aberto**: Rastrear compras públicas com situação em andamento (`em_andamento`), permitindo auditoria preventiva e controle social antes da adjudicação e homologação contratual, com destaque especial para contratações da pasta de saúde pública.
- **Segurança e Centralização de Configurações**: Configurações de ambiente e serviços externos (PostHog e chaves de envio) devem ser validadas e acessadas exclusivamente via módulo canônico `@/env` (`apps/web/env.ts`), sem acesso direto a `process.env`.

## Technical Decisions

- **Modelo Central de Anomalias (`fct_anomalias_fiscais_metricas`)**: Mart analítico materializado como tabela física (`materialized='table'`) no schema `analytics`, integrando dados consolidados de despesas, contratações, folha de pessoal (`fct_pessoal_regime_metricas`) e saldos em caixa (`fct_siconfi_caixa_por_entidade_metricas`).
- **Dimensões e Métricas do Mart**: Inclui obrigatoriamente `portal_slug`, `ano`, `tipo_anomalia` (`explosao_comissionados`, `rombo_caixa`, `pico_despesa_homologa`, `concentracao_dispensa`), `dimensao_referencia` (`saude`, `educacao`, `comissionados`, `recursos_livres`, `dispensas`), `grau_severidade` (`critico`, `alto`, `moderado`), `desvio_percentual`, `valor_observado`, `valor_esperado`, `mes_inicial`, `mes_final` e `deep_link_rota`.
- **Leitores Atômicos Kysely em `@transparencia/db`**:
  - `getRadarCivicoAlertas(portalSlug, options)`: Leitor pass-through com ordenação decrescente por severidade e impacto estrutural/financeiro.
  - `getLicitacoesEmAndamentoMetrics(portalSlug, options)`: Leitor para resgatar processos licitatórios abertos a partir de `analytics.fct_licitacoes`.
  - Conformidade estrita com DTOs em `camelCase` (`tipoAnomalia`, `dimensaoReferencia`, `grauSeveridade`, `desvioPercentual`, `valorObservado`, `valorEsperado`, `deepLinkRota`, `mesInicial`, `mesFinal`), implementados com programação funcional imutável.
- **Arquitetura de Apresentação e Componentização**:
  - Primitivas genéricas reutilizáveis mantidas em `packages/ui` (`Card`, `Badge`, `Button`).
  - Componentes de domínio especializados localizados em `apps/web/components/` (`radar-civico-feed.tsx`, `radar-anomalia-card.tsx`, `licitacoes-em-andamento-section.tsx`).
  - Data loaders e montagem de View Models co-localizados no App Router (`apps/web/app/`).
- **Gatilho de Despacho Web Push Automático**: O despacho de notificações push (implementado na Epic 11) é acionado pelo pipeline de ingestão apenas para anomalias com `grau_severidade = 'critico'`, redirecionando para a rota temática correspondente via Service Worker.
- **Geração Dinâmica de OpenGraph e Telemetria**: Renderização de imagens de pré-visualização para redes sociais e instrumentação de eventos PostHog (`civic_radar_card_viewed`, `civic_radar_card_clicked`, `civic_radar_whatsapp_shared`, `funnel_home_to_internal_page`) para avaliação do funil de navegação cívica.
- **Governança de Fixtures e CI/CD**: Atualização obrigatória das fixtures compactadas `packages/db/tests/fixtures/schema.sql.gz` via `make db/fixture/dump` e validação com `make db/fixture/check` e `make test`.

## UX & Interaction Patterns

- **Seção Radar Cívico no Primeiro Scroll da Homepage**: Exibição prioritária em formato de feed de cards compactos e responsivos (mobile-first), apresentando badge semântica de severidade, marcador metodológico ("Comparação Homóloga" ou "Posição Atual") e resumo explicativo factual.
- **Funil de Conversão e Navegação Aprofundada**: Cada card do Radar funciona como gatilho de navegação (CTA explícito) direcionando o usuário da página inicial para as páginas aprofundadas (`/pessoal`, `/despesas`, `/saude`, `/licitacoes`), evitando sobrecarga cognitiva na Home.
- **Compartilhamento Cívico Ágil no WhatsApp**: Botão de compartilhamento direto com mensagem estruturada contendo o dado factual apurado e hyperlink canônico para validação transparente.
- **Blocos Contextuais de Licitações em Aberto e Taxa de Contratação Direta**: Exibição de KPI de Taxa de Contratações Diretas (dispensas/inexigibilidades) com badge de anomalia e banner explicativo de `concentracao_dispensa` na página `/licitacoes`, cards e listagens de licitações em andamento com indicadores de contagem, busca por objeto, prazos e modalidades tanto na página geral `/licitacoes` quanto no bloco temático de compras de `/saude`, além de pílula de alerta no topo da Homepage.

## Cross-Story Dependencies

- **Story 12.1 → Story 12.2**: A modelagem do mart dbt `fct_anomalias_fiscais_metricas` e sua validação definem a estrutura relacional consumida diretamente pelos leitores Kysely da camada de dados.
- **Story 12.2 → Story 12.3 & Story 12.4**: Os readers tipados e DTOs de `getRadarCivicoAlertas` alimentam os componentes visuais do feed da Homepage e os despachantes de notificações e metadados OpenGraph.
- **Story 12.3 → Story 12.4**: A estrutura dos cards e links do Radar Cívico na Homepage fornece os pontos de ancoragem para a instrumentação de telemetria PostHog e gatilhos de compartilhamento social.
- **Story 12.1 & Story 12.2 → Story 12.5**: O motor de detecção e os contratos de consulta estabelecem o padrão para o levantamento e disponibilização das licitações em andamento nas telas temáticas de compras e saúde.
- **Epic 10 → Epic 12**: A segregação de modelos no schema `analytics` e o isolamento dos pools de conexão Kysely garantem o ambiente de execução seguro para os novos marts e queries de anomalias.
- **Epic 11 → Epic 12**: O pipeline de ingestão automatizada em nuvem e a infraestrutura Web Push (VAPID/Service Worker) viabilizam a detecção contínua e o despacho reativo em tempo real de alertas críticos.
