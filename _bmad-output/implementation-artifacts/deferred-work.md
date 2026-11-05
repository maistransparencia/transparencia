# Deferred Work Ledger

## Deferred from: code review of 3-8-hard-cutover-e-remocao-definitiva-do-legado.md (2026-08-06)

- Fragile SQL `LIKE` pattern matching and un-boundaried keyword matching in `fct_licitacoes_metricas.sql` (`elt/transform/models/marts/metrics/fct_licitacoes_metricas.sql:200`) — pre-existing logic from early dbt models.
- `loadSaudeData` default entity selection fallback when no `searchParams` provided (`apps/web/app/[portalSlug]/saude/loader.ts:56-58`) — pre-existing query behavior.

## Deferred from: code review of 4-2-titulos-dinamicos-de-pagina-com-prefixo-transparenciaweb.md (2026-08-07)

- Add full OpenGraph, Twitter and Description Metadata payload (`apps/web/app/[portalSlug]/*/page.tsx`) — deferred, pre-existing scope covered in Epic 4 / Story 4.5.

## Deferred from: code review of 4-6-seo-basico-meta-tags-open-graph-sitemap-e-robots.md (2026-08-07)

- Nomes de métricas abreviados e loops imperativos pré-existentes em pacotes de queries Kysely e modelos dbt (`packages/db/src/queries/licitacoes-metrics.ts`) — pre-existing code to be addressed in Story 4.7.

## Deferred from: Story 5.15 (Guard-Rails & Superadmin Mode) (2026-08-22)

- Expandir o Superadmin Mode para verificar user roles de banco de dados (`role === 'superadmin'`) via Supabase Auth em produção — por razões de segurança, o bypass atual é estritamente restrito a ambiente de desenvolvimento/localhost.

## Deferred from: code review of 6-1-reformulacao-do-card-de-despesas-e-antiguidade-de-restos-a-pagar-na-homepage.md (2026-08-26)

- Discrepância na fórmula do cálculo de índices de mandato entre modelos dbt marts (`elt/transform/models/marts/metrics/fct_posicao_fiscal_detalhes_metricas.sql:45-46`) — pré-existente nos modelos dbt.

## Deferred from: Story 6.7 / 6.8 (Radar de Opacidade Contábil e Classificação Sugerida) (2026-08-29)

- **Leitura Completa do Objeto no Clique (UI/UX):** Modal ou expansão de linha na tabela de credores do `TermometroOpacidadeFiscal` (`apps/web/components/termometro-opacidade-fiscal.tsx`) para visualização na íntegra da descrição do objeto do empenho/contrato, evitando truncamento por reticências.
- **Navegação Interativa na Série Histórica (UI/UX):** Permitir selecionar um ano específico nos cards históricos (2021–2025) para atualizar dinamicamente o termômetro de opacidade e o ranking de credores para aquele exercício fechado.
- **Métrica Derivada "Taxa de Opacidade Evitável" (Analytics/dbt):** Modelar no dbt/DB uma métrica isolando a opacidade estritamente evitável (serviços de terceiros PJ/PF e materiais: 39.99, 36.99, 30.99) expurgando despesas de natureza estrutural/compulsória (Sentenças Judiciais 91.99 e Contribuições Patronais 13.99).
- **Deep Link para Despesas Filtradas (UX/Navegação):** Adicionar atalho na linha de cada fornecedor do ranking em `.99` para redirecionar à listagem detalhada de despesas com filtros pré-aplicados para o credor e subitens genéricos.
## Deferred from: code review of 8-4-popover-decomposto-da-divida-real-por-entidade-no-radar-de-gastos-sensiveis.md (2026-09-04)

- **Janela Retroativa em Restos a Pagar (`despesas-metrics.ts:305`):** A query filtra `d.ano <= year` sem limite inferior de anos para restos a pagar. Definir regra de produto/contábil caso se deseje limitar o scan histórico a uma janela fixa (ex: últimos 5 anos) — pre-existing query behavior.

## Deferred from: code review of 9-1-quick-wins-consistencia-ui-data-extracao-mobile-e-ordenacao-contratos.md (2026-09-05)

- **Tratamento Estruturado de Erro em getPortalConfig (`packages/db/src/queries/metadata.ts:30`):** O bloco `try/catch` silencia totalmente erros retornando `{}`/`null`. Adicionar logging estruturado ou propagação controlada de erros de infraestrutura/conexão de banco — pre-existing query behavior.

## Deferred from: code review of 9-4-exibicao-do-saldo-em-caixa-por-entidade-na-ui.md (2026-09-09)

- **Acoplamento a códigos de órgãos municipais específicos em queries de banco (`packages/db/src/queries/siconfi-caixa-metrics.ts`, `packages/db/src/queries/export-raw-data.ts`):** O uso de literais `"10131"` e `"10132"` para segregação de previdência e prefeitura deve ser parametrizado via dimensões do mart dbt (`grupo_destinacao` ou tenant config) no roadmap multitenant — pre-existing query behavior.
- **Comparação de competências não homólogas na omissão do parâmetro mês (`packages/db/src/queries/siconfi-caixa-metrics.ts:180-187`):** Ao omitir o mês, a query utiliza `ultima_competencia_flag` que particiona por ano, comparando o mês corrente mais recente com o fechamento de dezembro anterior — pre-existing query behavior.


## Deferred from: my head

- **CI/CD quebrando**: Atualmente, o pipeline de CI/CD falha em alguns testes e validações, pois não estamos consistentemente atualizando o .sql de fixture. Precisamos incluir isso como parte do fechamento de stories/epic.
- **Corrigir warnings do dbt**: rodar o dbt localmente e corrigir todos os warnings de modelos
- **Mover tabelas gerenciadas pelo dbt para schema dedicado:** Atualmente, todas as tabelas gerenciadas pelo dbt residem no schema `public`. Para melhor organização e isolamento, considerar mover para um schema dedicado, como `analytics`, e atualizar as referências de tabela nos modelos dbt e queries Kysely correspondentes - é necessário atualizar as permissões de acesso em elt/migrations/grant_readonly.sql.
- **Renomear primary keys para `id` em todas as tabelas dbt:** Para consistência e padronização, renomear todas as primary keys para `id`, evitando nomes de coluna específicos de cada tabela (ex: `licitacao_id`, `despesa_id`, etc.), e atualizar todas as queries e modelos dbt que dependem desses nomes.
- **Verificar possibilidade de simplificação/merge de modelos dbt redundantes:** Alguns modelos dbt podem ter lógica redundante ou sobreposição de dados. Avaliar a possibilidade de consolidar ou simplificar esses modelos para reduzir complexidade e melhorar performance.
- **Automatização do pipeline de ingestão de dados e Notificações Web Push PWA:** Atualmente, o processo de ingestão de dados envolve etapas manuais e somente no localhost. Avaliar a possibilidade de automatizar o pipeline de ingestão, incluindo agendamento de jobs, monitoramento e alertas para falhas (Cloudflare: Workers, Containers, Cron Triggers). Incluir suporte completo a Web Push no PWA (chaves VAPID, registro de subscriptions no backend, UI de opt-in amigável com requestPermission e disparo automático quando novos dados forem publicados ou uma nova versão for lançada).
- **Detecção de anomalias em métricas de licitações e despesas:** Implementar monitoramento contínuo para detectar anomalias ou outliers nas métricas de licitações e despesas, utilizando técnicas estatísticas (futuramente: aprendizado de máquina), para alertar sobre possíveis inconsistências ou fraudes. Por exemplo, dados como um rombo detectado no dados do SICONFI no ano de 2024 fica escondido até que o usuário selecione o ano de 2024 por acaso.
- **Verificar viabilidade de utilizar SICONFI e TCE como fonte de dados**: Atualmente, para incluir novas cidades, é necessario explorar o respectivo portal da transparência e criar mecanismos especificos para extração de dados. Se todos os dados granulares, como folha de pagamento, fornecedores, etc estiverem disponíveis em portais federais/estaduais, o processo de extração seria muito mais simples.

## Deferred from: code review of spec-10-2-isolamento-dos-marts-analiticos-no-schema-dedicado-analytics.md (2026-09-12)

- source_spec: `/Volumes/Projects/transparencia/_bmad-output/implementation-artifacts/spec-10-2-isolamento-dos-marts-analiticos-no-schema-dedicado-analytics.md`
  summary: Suporte explícito a poolers de banco de dados em modo transação via connection string options no Kysely.
  evidence: Poolers em transaction mode (ex: PgBouncer porta 6543) descartam comandos de sessão executados via pool.on("connect"), exigindo a passagem de `-c search_path=analytics,public` na inicialização do handshake de conexão.
- source_spec: `/Volumes/Projects/transparencia/_bmad-output/implementation-artifacts/spec-10-2-isolamento-dos-marts-analiticos-no-schema-dedicado-analytics.md`
  summary: Aplicação periódica automatizada de políticas Row Level Security (RLS) sobre tabelas analíticas materializadas dinamicamente pelo dbt.
  evidence: Tabelas com `+materialized: table` são recriadas no ciclo do dbt run, exigindo hook post-dbt ou cron job para reaplicação de RLS e permissões sobre novos objetos criados no schema analytics.
- source_spec: `/Volumes/Projects/transparencia/_bmad-output/implementation-artifacts/10-3-blindagem-de-ci-cd-e-governanca-estrita-de-fixtures-sql-de-teste.md`
  summary: Harmonizar porta padrão do target db/test/restore no Makefile com a porta 5544 do container Docker de desenvolvimento local.
  evidence: O target `db/test/restore` no Makefile possui fallback na porta 5545 (`postgresql://postgres:postgres@localhost:5545/postgres`), enquanto `db/fixture/dump` e o docker-compose utilizam a porta 5544.

## Deferred from: code review of spec-11-2-infraestrutura-de-automacao-de-ingestao-de-dados-cloudflare.md (2026-09-12)

- source_spec: `_bmad-output/implementation-artifacts/spec-11-2-infraestrutura-de-automacao-de-ingestao-de-dados-cloudflare.md`
  summary: Container Docker Desktop no macOS requer host.docker.internal em vez de --network host para resolução de serviços em localhost.
  evidence: A flag --network host do Docker não vincula a interface de rede do host no macOS Docker Desktop, exigindo que serviços executando no macOS utilizem host.docker.internal quando invocados de dentro do container.

## Deferred from: code review of spec-15-6-desacoplamento-de-nomes-hardcoded-de-previdencia-no-dbt.md (2026-10-04)

- source_spec: `_bmad-output/implementation-artifacts/spec-15-6-desacoplamento-de-nomes-hardcoded-de-previdencia-no-dbt.md`
  summary: Identificadores legados específicos de Porciúncula (1061, CASP) em fct_previdencia_historia_metricas.sql
  evidence: Lógica legada pré-existente da base original que precisa ser devidamente isolada e parametrizada por portal ou eliminada quando Porciúncula adotar dimensões canônicas.
- source_spec: `_bmad-output/implementation-artifacts/spec-15-6-desacoplamento-de-nomes-hardcoded-de-previdencia-no-dbt.md`
  summary: Agrupamento mensal de servidores em pessoal_previdencia em fct_previdencia_historia_metricas.sql
  evidence: Agrupamento apenas por ano e portal em fct_pessoal sem filtro de mês de referência (max(mes)) soma múltiplos meses de folha para o mesmo servidor. Código pré-existente não alterado na Story 15.6.
- source_spec: `_bmad-output/implementation-artifacts/spec-15-6-desacoplamento-de-nomes-hardcoded-de-previdencia-no-dbt.md`
  summary: Código IBGE de Natividade em documentação pública de IA (llms-full.txt)
  evidence: O arquivo llms-full.txt contém 3303203 (Mendes) em vez de 3303401 (Natividade). Introduzido na story 15.5.
- source_spec: `_bmad-output/implementation-artifacts/spec-15-6-desacoplamento-de-nomes-hardcoded-de-previdencia-no-dbt.md`
  summary: Padding inferior pb-24 incondicional no container main em layout.tsx
  evidence: O elemento main aplica pb-24 mesmo na página raiz onde MobileBottomNav é suprimida. Arquivo pré-existente não tocado na story 15.6.


## Deferred from: code review (2026-10-09)
- Restabelecimento de disparos de alertas de falha (`ALERT_WEBHOOK_URL`) no GitHub Actions (`.github/workflows/scheduled-ingestion.yml`): a substituição do orchestrator antigo removeu temporariamente o envio de mensagens de falha para canais externos; configurar step `if: failure()` quando um canal/secret de monitoramento formal for definido.

## Deferred from: code review of spec-17-3-rota-publica-obras-mapa-interativo-de-impacto-urbano-e-filtros-civicos-no-apps-web.md (2026-10-11)

- **Filtro textual de projeto específico em modelo dbt mart (`elt/transform/models/marts/fct_obras.sql:17-22`):** Modelo dbt mart compartilhado; refatoração de regras de filtro de projetos federais pertence ao pipeline analítico do ELT.
- **Alteração de fallback de valor nulo no utilitário compartilhado `fmtDate` (`packages/ui/src/utils/formatters.ts:37`):** Utilitário global já integrado e validado na suíte de testes do pacote UI.
- **Discrepância de agregação temporal no card OpenGraph de Obras (`apps/web/app/[portalSlug]/obras/opengraph-image.tsx:17`):** Comportamento uniforme compartilhado com outros cartões sociais de rotas cívicas.
- **Critério de filtragem temporal de obras ativas/sem cronograma por ano (`packages/db/src/queries/obras.ts:196-204`):** Regra de filtragem compartilhada em Kysely; requer alinhamento contábil sobre obras plurianuais sem medição.
- **Inclusão de obras concluídas na métrica de avanço físico médio (`packages/db/src/queries/obras.ts:358`):** Query central no @transparencia/db consumida por múltiplas telas.
## Deferred from: code review of spec-17-4 (2026-10-11)

- **Modelagem analítica de execução financeira e data de paralisação no mart `fct_obras`** (`elt/transform/models/marts/fct_obras.sql`): O mart analítico upstream não possui colunas de desembolso financeiro nem histórico de paralisação; os campos foram tipados de forma defensiva e opcional em TypeScript aguardando evolução do pipeline dbt.
- **Busca server-side individual de obra para deep linking (`getObraDetalhe`) fora da listagem em memória** (`apps/web/components/obras/obras-interactive-section.tsx`): Acesso a `?idProjeto=...` com filtros locais restritivos ou fora da lista carregada; no momento todas as obras municipais do exercício são entregues no payload.
- **Otimização N+1 em `getObrasPorPortal` agregando contratos correlacionados em batch** (`packages/db/src/queries/obras.ts:32`): Atualmente mapeia com `getContratosPorObra` assíncrono por obra; consolidar em CTE única ou batch query com `id_projeto IN (...)` quando a volumetria exigir.
- **Refatoração de cálculo de empenhado/liquidado/pago_calc em mart e queries de contratos vigentes** (`elt/transform/models/marts/fct_contratos_servicos_vigentes.sql`): Auditoria de fallbacks de liquidação/pagamento entre `dl` e `df` para contratos sem licitação vinculada direta.

## Deferred from: code review (2026-10-16)

- **Inclusão de `ug_emitente` na chave primária da tabela `raw_obrasgov.empenhos` (`elt/load/obrasgov.py:101` e `_sources.yml`):** Requer validação prévia se a API do ObrasGov garante `ug_emitente` não nulo em todos os registros antes de adicionar à PK composta, prevenindo violações de restrição NOT NULL no PostgreSQL.

## Deferred from: Story 18.4 (Educação Básica) (2026-10-17)

- **Padronização de Seção/Card de Fontes Oficiais e Metodologia em Todas as Páginas Cívicas (UI/UX):** Conceber um padrão consistente de transparência metodológica em toda a aplicação (ex: seção de rodapé ou modal padronizado acessível em todas as rotas cívicas: Visão Geral, Despesas, Receitas, Licitações, Obras, Pessoal, Saúde, Educação, Previdência e CAPREM), informando para cada módulo as bases de dados oficiais de origem (portal municipal, SICONFI/STN, INEP/Censo Escolar, ObrasGov.br, etc.), periodicidade de atualização e critérios contábeis aplicados, evitando componentes de aviso ad-hoc ou isolados em apenas uma das páginas.


## Deferred from: code review of spec-18-7 (2026-10-18)

- Renomear `SaudeEmendasSection`/DTOs `EmendaSaudeDTO` para nomes genéricos de emendas parlamentares, hoje reutilizados na Educação via alias.
- Asserir no `loader.spec.ts` o ano padrão da query de emendas da Educação (baixo risco).

- source_spec: `_bmad-output/implementation-artifacts/spec-educacao-contratos-cards-modal.md`
  summary: mover a soma de valor, empenhado e pago por categoria de contratos de educação do view-model para `@transparencia/db`.
  evidence: CLAUDE.md §2 coloca agregações na camada de dados; hoje `buildTotaisPorCategoria` vive em `view-model.ts`.
- source_spec: `_bmad-output/implementation-artifacts/spec-educacao-contratos-cards-modal.md`
  summary: `handleCloseModal` usa pushState ao remover `?contratoNumero=`, e o botão Voltar do navegador pode reabrir o detalhe.
  evidence: código pré-existente, sem teste de histórico.
- source_spec: `_bmad-output/implementation-artifacts/spec-educacao-contratos-cards-modal.md`
  summary: remover a prop `contratoAbrindoId` não utilizada de `ContratosCategoriaModal`.
  evidence: o detalhe abre de forma síncrona, então o spinner nunca aparece.

- source_spec: `spec-educacao-origem-recursos.md`
  summary: Definir como tratar o resíduo na conciliação das folhas com o topo (`receitas_folhas_conciliam_com_topo`) e subir o teste de `warn` para `error`.
  evidence: 21 grupos portal/ano/empresa divergem no banco local (resíduo ~R$ 0,1 mi em 2022–2023 do Fundo); em alguns códigos a linha principal `.00.00` é maior que a soma dos filhos.
- source_spec: `spec-educacao-origem-recursos.md`
  summary: Trocar `rtrim(codigo,'0.')` por comparação por segmentos do código, numa única macro compartilhada pelo mart, pelo teste e por `fct_fontes_receita_metricas`.
  evidence: Códigos cujo último segmento significativo termina em 0 (ex.: `1714.50.0.0.00.00` → `1714.5`) casariam como pai de `1714.52…`; nenhuma folha do Fundo local é afetada hoje.
- source_spec: `spec-educacao-origem-recursos.md`
  summary: Confirmar em dados reais de outros portais se existem fontes com total líquido negativo (estornos/deduções), hoje descartadas por `total > 0`.
  evidence: Sem códigos fora de `1`/`2` em `orcamentaria` no Fundo local; severidade seria medium se existirem.
- source_spec: `spec-educacao-origem-recursos.md`
  summary: Avaliar fallback para o último ano com receita quando o ano corrente ainda não tem dados no bloco de origem dos recursos.
  evidence: O bloco mostra "Nenhuma receita registrada para a Educação no exercício." mesmo havendo histórico; é o estado previsto na spec, mas pode confundir no início do ano.

## Deferred from: code review of spec-19-2 (2026-10-21)

- Texto jurídico fixo "divulgação quinzenal" no requerimento e na sentinela sem apoio no DTO — aguarda revisão jurídica.

## Deferred from: refinamento da story 19-4 (2026-10-22)

- source_spec: `epics.md` (Story 19.4)
  summary: Mini-termômetros dos mínimos constitucionais de MDE (25%, CF art. 212) e Saúde (15%, LC 141/2012) no painel de saúde fiscal (`PainelSaudeFiscalCard`, retirado da 19.4: caixa líquida, arrecadação vs. despesa liquidada e superávit/déficit corrente). Tratar os dois juntos, com seed `seed_constantes_fiscais`, métrica na camada `@transparencia/db` e revisão de `jurista-fiscal` e `contador-publico`.
  evidence: Não há query de percentual aplicado em saúde; `mdePercentual` está fixo em `null` em `educacao-metrics.ts`; o seed não tem as constantes. Fazer só um dos dois deixaria o painel assimétrico.

- source_spec: `spec-19-4-acao-civica-no-card-da-farmacia-na-home.md`
  summary: Mover o limite de 15 dias de `fct_farmacia_estoque.sql` (hoje `var('farmacia_sus_limite_dias_defasagem', 15)`) para o seed `seed_constantes_fiscais.csv` (`farmacia,limite_dias_defasagem_estoque,2024,2099,15`), com base legal "Lei 8.080/1990 Art. 6º-A (incluído pela Lei 14.654/2023)" e descrição de parâmetro do portal para "atualização quinzenal". Exige `make db/fixture/dump`, `make db/fixture/check` e `make test`.
  evidence: A lei diz "atualização quinzenal", sem número de dias; vigência desde 20/02/2024 (24/08/2023 + 180 dias, LC 95/1998 Art. 8º § 1º). Mesmo tema da issue #61 (constantes que deveriam vir do seed).
- source_spec: `spec-19-4-acao-civica-no-card-da-farmacia-na-home.md`
  summary: Opinião de advogado humano sobre se a divulgação no BNAFAR/Hórus supre a obrigação do Art. 6º-A pelo município, antes de afirmar descumprimento no requerimento.
  evidence: O artigo obriga as "instâncias gestoras do SUS" a divulgar em suas "páginas eletrônicas"; interpretação, não texto de lei.

## Deferred from: code review of spec-19-9 (2026-10-24)
- source_spec: `spec-19-9-medicamentos-sentinela-farmacia-sus.md`
  summary: Unidades com `codigo_cnes` nulo ficam fora do denominador "N de M unidades" do mart `fct_farmacia_sentinela_disponibilidade`, mas aparecem na busca (que usa `coalesce(codigo_cnes, nome_unidade, id_registro)`).
  evidence: Severidade medium não verificada. Conferir `count(*)` de `fct_farmacia_estoque` com `status_conformidade='conforme' and codigo_cnes is null` na base local/real.
- source_spec: `spec-19-9-medicamentos-sentinela-farmacia-sus.md`
  summary: Saldos negativos em `quantidade_estoque` podem anular linhas positivas do mesmo `nome_normalizado` (`sum(coalesce(...,0)) > 0`), mostrando "sem registro" com estoque existente.
  evidence: Severidade medium não verificada. Conferir se a fonte traz `quantidade_estoque < 0`; se sim, usar `bool_or(quantidade_estoque > 0)` por apresentação.

## Deferred from: code review of 20-1-tokens-tema-claro-escuro-e-guarda-de-arquitetura (2026-10-25)

- source_spec: `20-1-tokens-tema-claro-escuro-e-guarda-de-arquitetura.md`
  summary: Script anti-flash em `layout.tsx` não tem teste de fiação; remover o `<script>` não derruba nenhum spec.
  evidence: Cobrir com e2e na 20.2, quando o toggle de tema existir.
- source_spec: `20-1-tokens-tema-claro-escuro-e-guarda-de-arquitetura.md`
  summary: Marcador de `farmacia-mapa` agora usa `var(--brand)` dentro de `color-mix` no HTML do divIcon, sem asserção.
  evidence: Coberto pelo AC 9 (verificação visual local).
- source_spec: `20-1-tokens-tema-claro-escuro-e-guarda-de-arquitetura.md`
  summary: Conversão oklch→sRGB com clamp de gamut sem valor de referência; razões de contraste de `brand`/`danger`/`ok`/`warn` dependem dela.
  evidence: Severidade medium não verificada. Conferir 2 ou 3 conversões contra referência independente e ver se alguma razão fica perto de 4,5.

## Deferred from: code review of 20-2-shell-sidebar-ribbon-footer-e-alternador-de-tema (2026-10-25)

- `PushNotificationSettings`: dica "Desbloquear" inacessível por teclado/toque (pré-existente).
- `PushNotificationSettings`: erro de `unsubscribe()` sem catch/feedback (pré-existente).
- `PushNotificationSettings`: texto "desativadas" aparece durante `isLoading` inicial (pré-existente).
- `PwaInstaller`: emojis e nome de marca fixo "MaisTransparencia" (pré-existente).
- Contraste AA de `mute2` sobre `page` em `text-xs` não verificado (medium se verdadeiro; cobrir no teste de contraste da 20.1).
- Footer: coluna "Neste dispositivo" pode ficar vazia; reavaliar na revisão visual.

## Deferred from: code review of story-20-4 (2026-10-25)

- Telemetria `educacao_resumo_card_footer` e `obras_resumo_card_footer` agora dispara de link no cabeçalho; renomear quebra séries históricas — alinhar com analítica.
- Home "Em destaque" sem `h2`; cartões usam `h3` sob `aria-label` — tratar na revisão de hierarquia de títulos (20.9).

## Deferred from: code review of 20-5-farmacia-sus-no-padrao-divisorias (2026-10-25)

- Mapeamento `portalUf` do loader da farmácia sem spec (`apps/web/app/[portalSlug]/farmacia/loader.ts`).
- Teste do botão "Copiado" (`farmacia-sentinelas.spec.tsx`) usa timer real e não restaura `navigator.clipboard`.

## Deferred from: code review of 20-6 follow-up af8ebd1c (2026-10-26)

- a11y: `<button>`/links aninhados em `div role="button"` no mobile e `<tr onClick>` sem teclado próprio (`packages/ui/src/components/dense-table.tsx`).
- Base da economia diverge entre painel expandido (`valorEstimado ?? valorFinal`) e modal (`valorFinal` primeiro) em `licitacoes-em-andamento-section.tsx`.
- Contraste de `text-warn`/`text-danger` sobre fundos `/10` nos dois temas não medido (medium, unverified).
- Layout mobile (4 a 5 registros por tela, margens) não verificado visualmente em 375px/1280px (medium, unverified).
- `FarmaciaIndicadorItem` duplicado de `IndicadorLinhaItem`; spec de `IndicadoresLinha` frágil a classes.
- Higiene de testes em `licitacoes-em-andamento-section.spec.tsx` (render duplicado, índices e regex presa a 2025).

### DW-1: Capturar baseline e resultado visual de /despesas (375px e 1280px, claro e escuro) e medir contraste AA.
origin: spec-deferred 934e3a47be00
location: apps/web/app/[portalSlug]/despesas/page.tsx
source_spec: `20-11-despesas-no-padrao-divisorias.md`
reason: Nenhuma captura de tela foi feita nesta execução automática; a migração foi validada apenas por testes e guardas de código-fonte.
status: open

### DW-2: restos-a-pagar-vendors-chart.tsx mantém variáveis abreviadas (liq, naoProc, liqPct) contra a Regra 9.
origin: spec-deferred d9d299b608f4
location: apps/web/components/restos-a-pagar-vendors-chart.tsx:52
source_spec: `20-11-despesas-no-padrao-divisorias.md`
severity: low
reason: Nomes pré-existentes, fora do escopo visual da história.
status: open

## Deferred from: code review (2026-10-27)
- Primeiro toque de 1 dedo pode ainda arrastar o mapa (unverified, medium): `use-mapa-gestos.ts` desabilita `dragging` só no touchstart do contêiner, depois do handler do Leaflet no pane, e nem farmacia nem obras criam o mapa com `dragging` desligado. Para confirmar: teste em dispositivo real (iOS/Android) com 1 dedo no primeiro gesto, ou ler `Draggable.disable` do Leaflet instalado. Commit 44320392.

## Deferred from: code review of 20-13-despesas-detalhadas-reorganizacao-da-pagina-com-os-dados-existentes (2026-10-28)
- CPF completo trafega no DTO de restos (`fornecedorDocumento`) e só o regex da UI o esconde; mesmo padrão já existe em "Quem mais recebeu". Mascarar na camada db é mudança transversal.
- Layout de linha com barra copiado em 5 componentes (áreas, fornecedores, restos, radar, termômetro); extrair componente compartilhado para evitar divergência visual.
- `getRiscoConfig` trata classificação nula/desconhecida como "Normal"; pré-existente, confirmar se `classificacaoRisco` pode ser nula.

### DW-3: Alerta de estoque baixo por remédio na farmácia, estimado por cobertura em dias.
origin: spec-deferred spec-farmacia-lotes-a-vencer
location: packages/db/src/queries/farmacia.ts
source_spec: `_bmad-output/specs/spec-farmacia-lotes-a-vencer/SPEC.md`
severity: low
reason: Quantidade bruta não é comparável entre remédios; exige estimar consumo pela queda de quantidade nas posições do histórico e revisão do contador-publico e do editor-cidadao.
status: open

### DW-4: expandable-row do DenseTable diverge do DESIGN.md (decisão em aberto)
origin: spec-deferred 200bbb8e57d1
location: n/a
source_spec: `20-14-elementos-base-papeis-visuais-e-plex-mono.md`
reason: packages/ui/src/components/dense-table.tsx:754-790
status: open

### DW-5: O view-model do orçamento ainda passa `colorClass` com paleta fixa (`bg-blue-600`, `bg-blue-500`, `bg-sky-500`, `bg-cyan-500`) para o funil, então as cores padrão por token do componente não valem em
origin: spec-deferred 2f25c8ec8937
location: apps/web/app/[portalSlug]/orcamento/view-model.ts:23
source_spec: `20-7-pessoal-receitas-e-orcamento.md`
severity: medium
reason: `apps/web/app/[portalSlug]/orcamento/view-model.ts:23,29,35,41`; o componente usa `stage.colorClass || CORES_PADRAO[...]`. O contrato da história proíbe alterar `view-model.ts`. Correção: remover as quatro linhas `colorClass` e cobrir com asserção.
status: open

### DW-6: Capturar /pessoal, /receitas e /orcamento (375px e 1280px, claro e escuro) e medir contraste AA; não foi possível nesta execução automática.
origin: spec-deferred 809ac861261e
location: apps/web/components/pessoal-regime-section.tsx
source_spec: `20-7-pessoal-receitas-e-orcamento.md`
reason: Validação feita só por testes e guardas de código-fonte. Conferir em especial: categorias de regime em tons neutros (`mute2`, `ink`, `faint`, `pill`) na barra proporcional, valor do funil agora em coluna à direita a 320px, `text-mute2` sobre `bg-line2/40` nos selos.
status: open

### DW-7: Testes de estado cobrem só 3 dos 10 componentes; faltam limites negativos (13º, histograma, funções) e renderização do funil e dos `AlertBox` de saldo em caixa.
origin: spec-deferred 1ce534e088fb
location: apps/web/components/pessoal-receitas-orcamento-estados.spec.tsx
source_spec: `20-7-pessoal-receitas-e-orcamento.md`
severity: low
reason: `apps/web/components/pessoal-receitas-orcamento-estados.spec.tsx` exercita apenas limite superior e vazio; remover os `Math.max(0, ...)` novos não derrubaria teste.
status: open

## Deferred from: code review of 20-7-pessoal-receitas-e-orcamento (2026-10-30)

- Mesmo orgao em mais de uma linha na tabela de execucao (grao orgao/unidade do mart; Secretaria de Saude aparece 2 vezes em 2025). Pre-existente. Local: `apps/web/app/[portalSlug]/orcamento/loader.ts`.
- Frase do ano anterior ("o ano inteiro terminou com X% pago") pode enganar se o ano anterior esta incompleto ou com pago maior que a dotacao. Severidade medium nao verificada; conferir meses faltando e pago > dotacao nos anos ingeridos. Local: `packages/db/src/queries/execucao-orcamentaria-metrics.ts`.
- Percentual pago calculado no view-model e nao na camada de dados (regra 2). Padrao pre-existente. Local: `apps/web/app/[portalSlug]/orcamento/view-model.ts`.
- `limitesLrf` sem teste do lado da query. Local: `packages/db/src/queries/pessoal-metrics.ts`.
- `statusBadge` do `DenseTable` ainda trata o valor "baixa". Local: `packages/ui/src/components/dense-table.tsx:396`.
- Spec 20.7 e DESIGN.md divergentes da pratica (KPIGrid, papel `lead`, textos, arquivos de dados). A correcao e editar spec/DESIGN.md.
- `variacaoIntraAnualLivresPct` sem uso na tela; decidir na story da rota propria do caixa. Local: `packages/db/src/queries/siconfi-caixa-metrics.ts`.

### DW-8: Sem validação visual nos temas claro e escuro das páginas de saúde e educação, nem teste de renderização do `Badge` de concentração de fornecedores por nível.
origin: spec-deferred ce31d8a97867
location: apps/web/components/saude-contratacao-section.tsx
source_spec: `20-8-saude-e-educacao.md`
reason: Só testes e guardas de código-fonte; contraste de `text-mute2` em `text-xs` e seções que mantêm `<section>`/`h2` próprios em `saude-contratacao-section.tsx` e `saude-emendas-section.tsx` (em vez de `SectionHeader`/`AlertBox`) não foram conferidos no navegador.
status: open

## Deferred from: code review of 20-8-saude-e-educacao.md (2026-10-31)

### DW-9: `receita_outras_saude` zera sem as linhas-raiz orçamentárias
origin: code-review 2026-10-31
location: elt/transform/models/marts/metrics/fct_historia_saude_metricas.sql
source_spec: `20-8-saude-e-educacao.md`
reason: Sem `1000.00.0.0.00.00`/`2000.00.0.0.00.00` em `fct_receitas`, as outras receitas ficam em 0 e os percentuais são inflados (severidade média, não verificada). Funciona nos dois portais atuais; conferir ao integrar um terceiro.
status: open

### DW-10: `getEducacaoContratos` vazio sem órgão com "fundo" e "educa" no nome
origin: code-review 2026-10-31
location: packages/db/src/queries/educacao-metrics.ts
source_spec: `20-8-saude-e-educacao.md`
reason: Portal cujo fundo tenha outro nome mostra lista vazia (severidade média, não verificada). A restrição ao fundo é intencional (commit 7d9e92bb); conferir ao integrar novo portal.
status: open

### DW-11: Texto de "indício" para `valor_igual` e `totalReceitaPossivel` nas emendas
origin: code-review 2026-10-31
location: apps/web/components/emendas-section.tsx
source_spec: `20-8-saude-e-educacao.md`
reason: Regra 27 (dado derivado diz que é derivado). Verificado na rodada 2: texto correto, sem mudança.
status: resolved

### DW-12: Specs de componente ausentes em educação e saúde
origin: code-review 2026-10-31 (rodada 2)
location: apps/web/components/educacao/{educacao-hero-section,educacao-historico-section,educacao-aprendizado-section,contratos-tabela,fonte-recurso-modal}.tsx, apps/web/components/saude-hero-section.tsx
source_spec: `20-8-saude-e-educacao.md`
reason: Só há cobertura indireta pelo `page.spec` com recharts mockado. Casos úteis: sem dados, intervalo `anoMin–anoMax` dinâmico, etapa sem Ideb, totais da tabela, `empenhado` 0 com pago > 0.
status: open

### DW-13: Spec de divisórias por regex e mocks sem contrato com o DTO
origin: code-review 2026-10-31 (rodada 2)
location: apps/web/components/saude-educacao-divisorias.spec.ts, apps/web/app/[portalSlug]/{saude,educacao}/page.spec.tsx
source_spec: `20-8-saude-e-educacao.md`
reason: O spec lê o código-fonte e tem ramo morto (`fiscal-section`); os `page.spec` usam `as never`/`as unknown`, o que desliga a checagem de tipo contra `@transparencia/db`.
status: open

### DW-14: Acessibilidade menor em evolução anual, modal de fonte e emendas
origin: code-review 2026-10-31 (rodada 2)
location: apps/web/components/{evolucao-anual,emendas-section}.tsx, apps/web/components/educacao/fonte-recurso-modal.tsx
source_spec: `20-8-saude-e-educacao.md`
reason: Barras sem texto alternativo por ponto; possíveis dois gatilhos por emenda (tabela e cartão) no DOM; foco/Escape dos modais não verificados.
status: open

### DW-15: Hero da educação com empenhado zero e pago positivo
origin: code-review 2026-10-31 (rodada 2)
location: apps/web/components/educacao/educacao-hero-section.tsx
source_spec: `20-8-saude-e-educacao.md`
reason: `percentualDoReservado` devolve 0 quando empenhado é 0 e há pago (restos a pagar); o título diz "reservou R$ 0 e pagou R$ X". Decidir o texto.
status: open

### DW-16: Falta spec de renderização que capture o `divIcon` do mapa de obras (cor do marcador e popup por token) e o tooltip do donut; `resolveDestinoColor` não tem teste.
origin: spec-deferred 32ce8ae8b925
location: apps/web/components/obras/obras-mapa-interativo.tsx; apps/web/app/[portalSlug]/previdencia/view-model.ts
source_spec: `20-9-obras-previdencia-radar-graficos-restantes-e-mapa-no-tema-escuro.md`
severity: medium
reason: Verification-gap: Leaflet é mockado em `obras-mapa-interativo.spec.tsx` e nenhum teste observa `barColor` nem `TooltipEntidade`; trocar tokens não quebra nada.
status: open

### DW-17: `cancelada` e `cadastrada` passaram a usar o mesmo token (`--mute3`); antes tinham cores distintas.
origin: spec-deferred fd888aab3ca4
location: apps/web/app/[portalSlug]/obras/view-model.ts:55
source_spec: `20-9-obras-previdencia-radar-graficos-restantes-e-mapa-no-tema-escuro.md`
severity: low
reason: Em `obras/view-model.ts` os dois casos têm `corPreenchimento: var(--mute3)`; `--mute2` e `--mute3` são quase idênticos, então a correção exige decisão de design (ex.: forma do marcador).
status: open

### DW-18: Hero de previdência esconde o painel quando `totalEmpenhado` é 0 mesmo com `totalPago` ou aporte atuarial maiores que zero.
origin: spec-deferred c794a7426e6b
location: apps/web/components/previdencia-hero-section.tsx:46
source_spec: `20-9-obras-previdencia-radar-graficos-restantes-e-mapa-no-tema-escuro.md`
reason: `temDados = totalEmpenhado > 0`; falta confirmar se a camada de dados pode devolver pago sem empenhado (maybe-false).
status: open

### DW-19: "Repassado ao fundo (pago)" usa `totalPago`, que pode incluir INSS/RGPS e plano de saúde; texto de estado sem fundo próprio afirma contribuição ao INSS sem confirmar que o RPPS não foi ingerido.
origin: spec-deferred 9237300af2f1
location: apps/web/components/previdencia-hero-section.tsx
source_spec: `20-9-obras-previdencia-radar-graficos-restantes-e-mapa-no-tema-escuro.md`
reason: Exige conferência do `contador-publico` sobre a composição de `totalPago` e do estado sem RPPS (maybe-false).
status: open

### DW-20: Painel do hero de obras pode mostrar "R$ 0" de investimento quando há obras sem valor; subtexto "Retração acumulada frente ao pico" é fixo mesmo se o patrimônio cresceu (já existia).
origin: spec-deferred cc3c8e815495
location: apps/web/components/obras/obras-hero-section.tsx:107; apps/web/components/previdencia-patrimonio-historico-section.tsx:269
source_spec: `20-9-obras-previdencia-radar-graficos-restantes-e-mapa-no-tema-escuro.md`
severity: low
reason: `obras-hero-section.tsx` só guarda `totalObras > 0`; o subtexto do patrimônio já estava assim em HEAD.
status: open

### DW-21: Guarda de código-fonte é mais fraca que a regra: regex de `rounded-*` não pega `rounded`, `rounded-md` e `rounded-full`, e `expect(obras).toBeDefined()` não afirma nada.
origin: spec-deferred 9ea15b9ea93b
location: apps/web/components/obras-previdencia-radar-divisorias.spec.ts
source_spec: `20-9-obras-previdencia-radar-graficos-restantes-e-mapa-no-tema-escuro.md`
severity: low
reason: Pills e badges arredondados continuam em radar, saldo de caixa e modal de obras.
status: open

### DW-22: Coluna de severidade do radar tem largura fixa `sm:w-16` com fonte proporcional; rótulos como "Moderada" podem estourar. Também faltam capturas de tela e suíte visual (AC 6) e a revisão independente
origin: spec-deferred dd7cd166b5a8
location: apps/web/components/radar-civico-feed.tsx:64
source_spec: `20-9-obras-previdencia-radar-graficos-restantes-e-mapa-no-tema-escuro.md`
reason: Sem render visual não foi possível confirmar; a story registra que capturas e revisões independentes não foram feitas.
status: open

### DW-23: Citação "Art. 115, §6º da Lei 14.133/2021" segue na tela sem conferência do `jurista-fiscal` (já existia em HEAD, via `urlLegislacao`).
origin: spec-deferred 58bbdaf291e8
location: apps/web/components/obras/obras-paralisadas-section.tsx:123
source_spec: `20-9-obras-previdencia-radar-graficos-restantes-e-mapa-no-tema-escuro.md`
severity: low
reason: Dispositivo verificado no Planalto (o §6º trata do aviso público de obra paralisada por mais de 1 mês). Pendentes: âncora `#art115p6` do link não confirmada (NÃO VERIFICADO) e texto literal do §6º não transcrito para conferir a frase "o motivo da paralisação seja divulgado". Além disso, o "Critério de Auditoria Cívica" perdeu a citação à Lei 14.133/2021 porque o Art. 115 não trata de pagamento versus medição; o jurista-fiscal deve indicar o artigo correto antes de o link voltar.
status: open

### DW-24: Capturas antes/depois (claro e escuro) e suíte de testes visuais não foram executadas (AC 4 e 5 parciais).
origin: spec-deferred 8ac9cf51ee58
location: apps/web/e2e/visual
source_spec: `20-19-remocao-dos-aliases-e-zeramento-das-excecoes-do-tema.md`
reason: O Registro admite que não foram feitas; a troca de paleta e de raios foi mecânica por regra. Verificar tooltip, feedback-modal, push-notification-prompt, modais de newsletter e de interesse na cidade, KPICard sem variant e bg-accent -> brand-fill no tema escuro.
status: open

### DW-25: Paleta fixa emerald/blue/red/amber/rose não é coberta pela regra paleta-fixa-do-tailwind (privacidade, termos, modais).
origin: spec-deferred 7d297fef4509
location: apps/web/architecture/varredura-tema.ts:9
source_spec: `20-19-remocao-dos-aliases-e-zeramento-das-excecoes-do-tema.md`
severity: low
reason: A regra só casa bg-white e slate/gray; páginas com bg-emerald-50 etc. podem destoar no tema escuro. Preexistente ao escopo da story. Resolvido: a regra passou a cobrir todas as famílias de cor do Tailwind e os arquivos encontrados foram migrados para tokens.
status: resolved

### DW-26: `Button` só tem `primary` e `secondary` (altura 44px); faltam variantes para controles compactos, então os `<button>` de obras seguem com classes soltas.
origin: code review de d4b058ba..HEAD (story 20-9, refinamentos de /obras)
location: apps/web/components/obras/obras-interactive-section.tsx (filtros de situação, seletores Mapa/Lista e Área urbana/Todo o território, botão flutuante do mapa, Limpar busca, Fechar detalhes) e obras-detalhe-modal.tsx:168 (Fechar)
source_spec: `packages/ui/src/components/button.tsx`, seção `button` do DESIGN.md
severity: medium
reason: Migrar para o `Button` atual mudou o visual dos filtros (altura de 44px, mais alto no mobile) e foi revertido a pedido. O DESIGN.md proíbe `<button>` com classes soltas. Criar variantes no `Button` (por exemplo compacto/pill para filtros e controle segmentado com item ativo `primary`, e `icon` para fechar/limpar), documentá-las no DESIGN.md e então migrar os botões de obras. Junto: trocar `role="tablist"`/`tab` sem painel por `aria-pressed` (sem painel, ARIA incorreta) e alinhar a bolinha de "Cancelada" (`bg-mute3` no filtro contra `var(--mute)` na lista e no mapa).
status: open

### DW-27: Coluna "Nível" do feed do radar na home tem largura diferente do cabeçalho; a coluna "Ocorrência" fica desalinhada.
origin: revisão do fechamento da story 20-9 (acabamento de /radar)
location: apps/web/components/radar-civico-feed.tsx:146 (cabeçalho `w-16`) e :64 (linha `sm:w-24`)
source_spec: `20-9-obras-previdencia-radar-graficos-restantes-e-mapa-no-tema-escuro.md`
severity: low
reason: A linha de severidade foi alargada para `sm:w-24`, o que resolveu o estouro de rótulos como "Moderada", mas o cabeçalho continua em `w-16`, então o título "Ocorrência" não alinha com o texto das linhas. Alinhar as duas larguras e conferir no navegador. Entra na varredura da 20-18.
status: open

### DW-28: Faltam capturas de tela e suíte visual de /obras, /previdencia e /radar (AC 6 da story 20-9).
origin: revisão do fechamento da story 20-9 (acabamento de /radar)
location: apps/web/app/[portalSlug]/{obras,previdencia,radar}/page.tsx
source_spec: `20-9-obras-previdencia-radar-graficos-restantes-e-mapa-no-tema-escuro.md`, `20-18` no `epics.md`
severity: medium
reason: A 20-9 foi fechada sem capturas de tela nem revisão visual independente. O acabamento do /radar (commits 580241f6 e 8c3adfcf) também não foi conferido no navegador (claro/escuro, mobile/desktop), inclusive a barra "Exercícios" fixa no mobile. A 20-18 já exige capturas antes e depois nos dois temas e tamanhos; cobrir estas três páginas nela.
status: open

### DW-29: Contagem de licitações ativas usa texto de situacao além do código.
origin: spec-deferred 42491095b626
location: packages/db/src/queries/licitacoes-metrics.ts
source_spec: `20-20-ajustes-dos-destaques-de-despesas-licitacoes-e-pessoal.md`
reason: classificada com texto "Em aberto" conta como ativa (unverified); confirmar definição de aberta.
status: open

### DW-30: Total empenhado pode mostrar R$ 0 com contratos sem totalEmpenhado.
origin: spec-deferred 4d0380beaa80
location: apps/web/app/[portalSlug]/licitacoes/page.tsx
source_spec: `20-20-ajustes-dos-destaques-de-despesas-licitacoes-e-pessoal.md`
reason: Depende de dados reais de contratos vigentes sem valor empenhado.
status: open

### DW-31: Empates de nota_ideb no ranking estadual são desempatados só por cod_ibge, podendo gerar "subiu/caiu N posições" espúrio.
origin: spec-deferred 54f356346323
location: packages/db/src/queries/educacao-metrics.ts
source_spec: `24-7-aprendizado-no-topo-da-pagina-de-educacao.md`
severity: medium
reason: Regra de ordenação pré-existente (nota_ideb desc, cod_ibge asc), mantida de propósito pela spec; notas têm uma casa decimal, então empates são comuns.
status: open

### DW-32: Totais iguais mas conjuntos de municípios diferentes entre ciclos, ou ano do ranking diferente do ano anterior da nota do município, comparam populações distintas.
origin: spec-deferred ef0f28603525
location: packages/db/src/queries/educacao-metrics.ts, apps/web/app/[portalSlug]/educacao/view-model.ts
source_spec: `24-7-aprendizado-no-topo-da-pagina-de-educacao.md`
reason: Não verificado com dados reais de seed_inep_ideb; checar se há ciclos com mesmo total e municípios trocados.
status: open

## Deferred from: code review of story-24-12 (2026-11-03)

- `NOTA_DECLARACAO` só é usada no modal de valor por aluno; confirmar se o percentual do mínimo/Fundeb no topo mantém a explicação de que o número vem do SIOPE sem recálculo (educacao-textos.tsx). Severidade não verificada: média. Resolvido: conferido por Julio em 2026-11-04; o texto está correto.
- Alinhamento das duas barras dos destaques (educacao-destaques.tsx) quando a pergunta quebra em duas linhas em largura md. Conferir no navegador. Resolvido: conferido por Julio no navegador em 2026-11-04; alinhamento correto.
- `IndicatorPanel` clona filhos com `size`, mas em educacao-indicadores-apoio.tsx os filhos são `<div>` wrapper; conferir `size` e a estrutura `dl`/`dt`/`dd`. Resolvido: `Indicator` ganhou `action` (dentro de `dd`) e `data-testid`; os wrappers `<div>` saíram, o `size` chega ao indicador e `IndicadorFundeb` o repassa.
- Estados do antigo `emendasSubtext` (sem emenda; emenda ainda não reservada): conferir se `EmendasSection` os cobre. Resolvido: mantido como está por decisão do Julio em 2026-11-04 (sem emendas o aviso não aparece; sem confirmação na receita o texto já diz "Nenhuma foi confirmada").
- Linha "Leis:" depende da seed (`baseLegal`/`urlBaseLegal`); conferir se a seed cobre CF/88 art. 212 e 212-A e Lei 14.113 art. 26. Resolvido: `seed_constantes_fiscais.csv` cobre CF/88 art. 212 e 212-A e Lei 14.113/2020 art. 26, com URL do Planalto.
- Link "Ver detalhes" do valor por aluno só aparece com `valor !== null` (educacao-indicadores-apoio.tsx:117); a regra antiga exigia só `serie.length > 0`. Resolvido: o link exige `valor !== null && serie.length > 0`, o que é o comportamento desejado (sem valor não há o que detalhar).
- Rótulo com ano fixo "INEP: Nota Informativa do Ideb 2025" no modal do IDEB (Regra 23); anterior a esta story. Resolvido: o rótulo agora é "INEP: Nota Informativa do Ideb", sem ano.
- `twoColumnsOnMobile` no `IndicatorPanel`: confirmar que `cn` faz merge de classes Tailwind (`grid-cols-2` vs `COLUMNS_CLASS`). Resolvido: `cn` usa `twMerge`, e `indicator.spec.tsx` confere `grid-cols-2` com `lg:grid-cols-4`.

## Deferred from: code review of story 24-13 (2026-11-04)

- `h2` dentro de `summary` em `CollapsibleSection`: confirmar com leitor de tela (VoiceOver/NVDA) se a navegação por títulos continua funcionando.
- Aviso das emendas perdeu "pode estar desatualizado": revisar com editor-cidadao e contador-publico.
- Resumo de fornecedores usa `viewModel.topFornecedores` e o corpo usa `fornecedoresLinhas`: conferir que são o mesmo conjunto.
- Fundeb em ano parcial mostra barra e marcador do mínimo: conferir `tomDoResultado` no ano em andamento.
- `apps/storybook/scripts/dev.mjs` e a story do Storybook que copia o markup do `CollapsibleSection`: tratar erro/sinal e importar o componente real.
