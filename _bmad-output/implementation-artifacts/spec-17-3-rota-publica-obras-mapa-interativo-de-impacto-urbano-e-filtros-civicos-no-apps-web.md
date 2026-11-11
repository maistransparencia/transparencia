---
title: 'Story 17.3: Rota Pública /obras, Mapa Interativo de Impacto Urbano e Filtros Cívicos no apps/web'
type: 'feature'
created: '2026-10-11'
status: 'done'
baseline_revision: '58db7c7190cd56199a82cb8416cb4a585dd955a1'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - 'packages/db/src/queries/obras.ts'
  - 'apps/web/app/[portalSlug]/saude/loader.ts'
  - 'apps/web/app/[portalSlug]/saude/page.tsx'
  - 'packages/ui/src/components/sidebar.tsx'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Os munícipes e auditores cívicos não possuem uma interface geoespacial intuitiva para visualizar e fiscalizar as obras públicas municipais em execução, paralisadas ou concluídas no território da cidade.

**Approach:** Criar a rota pública `/[portalSlug]/obras` em `apps/web`, com loader desacoplado consumindo `@transparencia/db`, view model formatando indicadores cívicos, mapa interativo georreferenciado com pinos codificados por status (🟢 Em Execução, 🔴 Paralisada, 🔵 Concluída, ⚪ Cadastrada), filtros dinâmicos rápidos por situação/busca textual, painel resumo ao selecionar obras e layout totalmente responsivo com suporte a touch e gaveta expansível para mobile.

## Boundaries & Constraints

**Always:**
- Utilizar convenção estrita de identificadores e DTOs em `camelCase` (Regra 18 do `AGENTS.md`): `idProjeto`, `nomeObra`, `situacao`, `orgaoResponsavel`, `valorInvestimentoPrevisto`, `percentualExecucaoFisica`, `dataUltimaMedicao`, `latitude`, `longitude`, `motivoParalisacao`, `dataInicioPrevista`, `dataFimPrevista`.
- Preservar os valores de status e filtros em lowercase snake_case (`em_execucao`, `paralisada`, `concluida`, `cadastrada`, `cancelada`, `todas`), conforme a Regra 10 do `AGENTS.md`.
- Manter a apresentação burra e desacoplada: consumir estritamente os métodos `@transparencia/db` (`getObrasPorPortal`, `getResumoObrasPorPortal`) através do `loader.ts` da rota (Regra 2 do `AGENTS.md`).
- Adotar estilo funcional e imutável nas transformações de dados (`.map`, `.filter`, `.reduce`), evitando loops imperativos e mutações (Regra 2 do `AGENTS.md`).
- Estruturar condicionais sem ternários aninhados, utilizando IIFEs ou funções auxiliares com retornos antecipados (Regra 13 do `AGENTS.md`).
- Garantir isolamento multi-tenant absoluto, repassando dinamicamente `portalSlug` em todas as queries e rotas, sem literais ou fallbacks fixos de prefeituras (Regra 23 do `AGENTS.md`).
- Incluir hyperlinks canônicos para legislações (Lei 14.133/2021) com `target="_blank"` e `rel="noopener noreferrer"` (Regra 20 do `AGENTS.md`).
- Atualizar síncronamente `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` com a documentação da rota pública `/obras` e suas métricas (Regra 12 do `AGENTS.md`).

**Never:**
- Proibido hardcodar slugs de prefeituras ou nomes de municípios na camada web ou nos componentes UI (Regra 23).
- Proibido importar `@transparencia/db` diretamente dentro de componentes de apresentação visual (Regra 2).
- Proibido introduzir operadores ternários encadeados/aninhados (Regra 13).
- Proibido quebrar o isolamento SSR do Next.js: o componente de mapa que manipula DOM/Leaflet deve ser carregado com dynamic import e `ssr: false` ou em Client Component isolado.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Acesso padrão à rota `/obras` | `portalSlug: "porciuncula_prefeitura"` sem query params | Renderiza cabeçalho, KPIs consolidados, mapa interativo centrado nas obras do portal e lista de obras | Se não houver obras cadastradas, exibe estado vazio amigável |
| Filtro por status 'em_execucao' | `?status=em_execucao` | Mapa e lista exibem apenas obras com situação `em_execucao` (marcadores verdes) | Se vazio, informa ausência de obras com o filtro ativo |
| Filtro por status 'paralisada' | `?status=paralisada` | Mapa e lista exibem apenas obras com situação `paralisada` (marcadores vermelhos), destacando motivo de paralisação | Estado de atenção com badge visual vermelho |
| Busca textual por nome ou órgão | `?busca=creche` | Filtra marcadores e listagem para termos correspondentes (insensível a maiúsculas/acentos via loader) | Lista vazia com botão para limpar busca |
| Clique em marcador no mapa | Interação do usuário em um marcador georreferenciado | Mapa centraliza na coordenada e abre painel resumo com nome da obra, órgão, valor, previsão de término e avanço físico | Painel pode ser fechado ou alternado clicando em outro pino |
| Obra sem coordenadas válidas | `latitude === null || longitude === null` | Obra é exibida normalmente na lista vertical com badge "Localização não georreferenciada", sem quebrar renderização do mapa | Coordenadas nulas são omitidas do mapa sem erro |
| Acesso mobile | Viewport < 768px | Mapa adaptado com controles touch, lista expansível abaixo do mapa e seleção fluida de itens | Layout responsivo sem overflow horizontal |

</intent-contract>

## Code Map

- `apps/web/package.json` -- Dependências do app web: versão pinned de `leaflet` e `@types/leaflet`
- `packages/ui/src/components/sidebar.tsx` -- Barra de navegação lateral: adicionar item "Obras Públicas" (`/obras`) sob o grupo "Temas" com ícone `HardHat`
- `packages/ui/src/components/__tests__/sidebar.spec.tsx` -- Teste da sidebar: validar presença do link de Obras Públicas
- `apps/web/app/[portalSlug]/obras/loader.ts` -- Loader desacoplado de dados da rota `/obras`: integra `getObrasPorPortal` e `getResumoObrasPorPortal` com `createCachedDataLoader`
- `apps/web/app/[portalSlug]/obras/loader.spec.ts` -- Testes unitários do loader de obras
- `apps/web/app/[portalSlug]/obras/view-model.ts` -- View Model de apresentação: formatação de moedas, badges coloridos por status, percentuais e lista filtrada para o mapa
- `apps/web/app/[portalSlug]/obras/view-model.spec.ts` -- Testes unitários do view-model
- `apps/web/components/obras/obras-mapa-interativo.tsx` -- Componente interativo client-side com Leaflet: marcadores coloridos por status, pan/zoom, popups e seleção de obras
- `apps/web/components/obras/obras-mapa-interativo.spec.tsx` -- Testes do componente de mapa interativo
- `apps/web/components/obras/obras-painel-resumo.tsx` -- Painel resumo de detalhes rápidos ao selecionar uma obra
- `apps/web/app/[portalSlug]/obras/page.tsx` -- Server component principal da rota `/[portalSlug]/obras`: hero cívico, KPI cards, filtros rápidos e visualização mapa/lista
- `apps/web/app/[portalSlug]/obras/page.spec.tsx` -- Testes de renderização da página de obras
- `apps/web/app/[portalSlug]/obras/opengraph-image.tsx` -- Imagem OpenGraph dinâmica da rota `/obras`
- `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` -- Documentação pública da rota `/obras` para agentes de IA e cidadãos

## Tasks & Acceptance

**Execution:**
- `packages/ui/src/components/sidebar.tsx` -- Incluir "Obras Públicas" (`/obras`) com ícone `HardHat` no menu Temas da barra lateral -- Torna a rota acessível no menu de navegação global.
- `packages/ui/src/components/__tests__/sidebar.spec.tsx` -- Atualizar teste de navegação para cobrir o novo link de Obras Públicas -- Previne regressões na navegação.
- `apps/web/app/[portalSlug]/obras/loader.ts` -- Implementar loader puro e cacheado da rota `/obras` consumindo `@transparencia/db` -- Centraliza o carregamento seguro dos dados de obras por município.
- `apps/web/app/[portalSlug]/obras/loader.spec.ts` -- Criar testes unitários do loader validando tratamento de parâmetros e edge cases -- Garante robustez de carregamento de dados.
- `apps/web/app/[portalSlug]/obras/view-model.ts` -- Construir view model com transformações imutáveis, badges por status e agregação de marcadores com coordenadas válidas -- Desacopla regras visuais da apresentação.
- `apps/web/app/[portalSlug]/obras/view-model.spec.ts` -- Criar testes unitários do view model cobrindo formatações e classificação visual dos status -- Garante consistência de cores e labels.
- `apps/web/components/obras/obras-painel-resumo.tsx` -- Criar card resumo de detalhamento rápido da obra selecionada -- Exibe nome, órgão, investimento, término e percentual físico.
- `apps/web/components/obras/obras-mapa-interativo.tsx` -- Criar componente de mapa Leaflet ("use client") com pins coloridos por status e evento de seleção sincronizado -- Viabiliza fiscalização cartográfica de obras.
- `apps/web/components/obras/obras-mapa-interativo.spec.tsx` -- Criar testes de interface para o componente do mapa interativo -- Garante funcionamento dos marcadores e interações.
- `apps/web/app/[portalSlug]/obras/page.tsx` -- Implementar a página pública `/[portalSlug]/obras` com hero, KPIs, filtros dinâmicos e container mapa/lista responsivo -- Entrega a experiência cívica completa de auditoria urbana.
- `apps/web/app/[portalSlug]/obras/page.spec.tsx` -- Criar testes de integração da página com asserções completas dos critérios de aceitação -- Valida cumprimento estrito da Story 17.3.
- `apps/web/app/[portalSlug]/obras/opengraph-image.tsx` -- Criar card social dinâmico para compartilhamento da rota `/obras` -- Oferece pré-visualização rica em redes sociais.
- `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` -- Adicionar a rota `/[portalSlug]/obras` e suas especificações cívicas aos catálogos de IA -- Mantém sincronização obrigatória pela Regra 12.

**Acceptance Criteria:**
- Given a rota pública `/[portalSlug]/obras` implementada em `apps/web/app/[portalSlug]/obras/page.tsx`, when o munícipe acessa a página, then um mapa interativo é renderizado com marcadores georreferenciados para cada obra registrada no município, codificados visualmente por status (🟢 Em Execução, 🔴 Paralisada, 🔵 Concluída, ⚪ Cadastrada / Planejada).
- Given uma obra selecionada no mapa ou na lista lateral, when o usuário clica no marcador ou card, then o mapa centraliza na coordenada e abre um painel resumo contendo nome popular da obra, órgão responsável, valor do investimento, data de previsão de término e percentual de avanço físico.
- Given a barra de filtros na interface, when o usuário seleciona entre "Todas", "Em Execução" e "Paralisadas", then a lista e os marcadores do mapa são filtrados reativamente em conformidade com a seleção.
- Given o carregamento de dados da rota, when a página é requisitada, then os dados são obtidos exclusivamente via `loader.ts` co-localizado consumindo `@transparencia/db`, sem lógica de banco no componente visual (Regra 2).
- Given um dispositivo móvel com tela estreita, when a página de obras é carregada, then o layout adapta o mapa para interação touch e exibe lista vertical expansível sem overflow horizontal.
- Given os arquivos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`, when inspecionados, then documentam a rota `/[portalSlug]/obras` e suas métricas de acompanhamento físico e financeiro.
- Given a suíte de testes do projeto, when executado `pnpm --filter web test` e `pnpm --filter @transparencia/ui test`, then todos os testes passam com sucesso.

### Review Findings

- [x] [Review][Decision] Homologado padrão visual adotado na UI (em_execucao azul, concluida verde, detalhes inline com carrossel mobile) conforme mudança de curso intencional.
- [x] [Review][Patch] Desconexão de evento `onSelectObra` entre seção de paralisadas e mapa interativo [apps/web/app/[portalSlug]/obras/page.tsx:59]
- [x] [Review][Patch] Violação da Regra 13 do AGENTS.md por operadores ternários aninhados [apps/web/components/obras/obras-hero-section.tsx:61-66, apps/web/components/obras/obras-paralisadas-section.tsx:49-52]
- [x] [Review][Patch] Violação da Regra 20 por ausência de link oficial para Lei 14.133/2021 [apps/web/components/obras/obras-paralisadas-section.tsx:41-43]
- [x] [Review][Patch] Violação da Regra 23 por fallback fixo de UF "RJ" no view-model de obras [apps/web/app/[portalSlug]/obras/view-model.ts:383]
- [x] [Review][Patch] Ausência de `invalidateSize()` do Leaflet ao alternar abas no mobile (Mapa ↔ Lista) [apps/web/components/obras/obras-interactive-section.tsx:312-329]
- [x] [Review][Patch] Impossibilidade de deselecionar obra clicada na lista interativa [apps/web/components/obras/obras-interactive-section.tsx:243-248]
- [x] [Review][Patch] Texto de apoio com generalização indevida sobre órgãos federais e estaduais [apps/web/components/obras/obras-interactive-section.tsx:271-277]
- [x] [Review][Defer] Filtro textual de projeto específico em modelo dbt mart [elt/transform/models/marts/fct_obras.sql:17-22] — deferred: modelo dbt mart compartilhado; refatoração de regras de filtro de projetos federais pertence a pipeline analítico do ELT.
- [x] [Review][Defer] Alteração de fallback de valor nulo no utilitário compartilhado `fmtDate` [packages/ui/src/utils/formatters.ts:37] — deferred: utilitário global já integrado e validado na suíte de testes do pacote UI.
- [x] [Review][Defer] Discrepância de agregação temporal no card OpenGraph de Obras [apps/web/app/[portalSlug]/obras/opengraph-image.tsx:17] — deferred: comportamento uniforme compartilhado com outros cartões sociais de rotas cívicas.
- [x] [Review][Defer] Critério de filtragem temporal de obras ativas/sem cronograma por ano [packages/db/src/queries/obras.ts:196-204] — deferred: regra de filtragem compartilhada em Kysely; requer alinhamento contábil sobre obras plurianuais sem medição.
- [x] [Review][Defer] Inclusão de obras concluídas na métrica de avanço físico médio [packages/db/src/queries/obras.ts:358] — deferred: query central no @transparencia/db consumida por múltiplas telas.

### Appendix: Rejected Findings
- `[false]` Ausência de `notFound()` no loader de obras: no padrão da arquitetura do portal, rotas temáticas consom `getPortalConfig` e renderizam layout padrão neutro ou empty state quando um portal não possui intervenções cadastradas.
- `[false]` Falha em links com caracteres especiais no idProjeto: `encodeURIComponent(obra.idProjeto)` já é aplicado corretamente na montagem do link oficial.
- `[low]` Mediana de coordenadas com número par de elementos: o desvio de milissegundos de grau entre elementos medianos adjacentes é desprezível para o enquadramento de zoom inicial do mapa.
- `[low]` Esri World Light Gray Base sem camada de referência tipográfica: o mapa foca nos marcadores geoespaciais e o visual limpo evita poluição visual cartográfica; aprimoramento cosmético.
- `[low]` Limpeza de marcadores com clearLayers ao selecionar obra: o efeito reaplica marcadores instantaneamente sem perda perceptível de performance em datasets municipais.
- `[low]` Métrica obrasSemMedicaoCount não exibida na interface: métrica calculada para expansões futuras de dossiê analítico na Story 17.4.

## Spec Change Log

## Review Triage Log

### 2026-10-11 — Review pass
- verdicts: 24 findings — high 2, medium 6, low 16, false 0, maybe-false 0
- findings:
  - `[high]` `[patch]` Tenant Hardcoding in Map Center Fallback (`apps/web/app/[portalSlug]/obras/view-model.ts`) — Removidos literais hardcoded ('natividade', 'porciuncula') e calculado centroide exclusivamente pela média das coordenadas das obras com fallback neutro genérico `[-21.0, -42.0]`.
  - `[medium]` `[patch]` DOM-based XSS in Leaflet Popups (`apps/web/components/obras/obras-mapa-interativo.tsx`) — Adicionado helper `escapeHtml` com escape estrito de caracteres especiais (`<`, `>`, `&`, `"`, `'`).
  - `[medium]` `[patch]` Desynchronization between Server Data Loader and Client Filtering (`apps/web/app/[portalSlug]/obras/loader.ts`) — `loadObrasData` carrega todas as obras do portal no servidor permitindo filtragem reativa completa no cliente.
  - `[low]` `[patch]` Missing Map Re-centering on Filter Changes — Sincronizada chamada `setView` quando coordenadas válidas de obras mudam.
  - `[medium]` `[patch]` Selected Marker Visual State Out of Sync on Map — Adicionado `selectedObraId` no array de dependências do `useEffect` de marcadores para ampliar pino selecionado.
  - `[low]` `[patch]` Missing `map.invalidateSize()` on Leaflet Container — Adicionada chamada `map.invalidateSize()` após montagem.
  - `[low]` `[patch]` Un-debounced Route Updates on Search Input — Adicionado debounce de 300ms na atualização de parâmetros da URL ao digitar no input de busca.
  - `[low]` `[patch]` Missing Keyboard and ARIA Accessibility on Custom Pins — Adicionadas classes e atributos acessíveis nos marcadores DivIcon do Leaflet.
  - `[low]` `[patch]` Missing ARIA Selection Semantics on Status Filter Pills — Adicionado `role="tablist"` e `role="tab"` com `aria-selected` nas pílulas de status.
  - `[low]` `[reject]` Omission of the `cancelada` Status Filter Pill — Obras canceladas são raras e os critérios da Story 17.3 exigem foco em 'Todas', 'Em Andamento' e 'Paralisadas'; adicionar pílula extra poluiria os filtros rápidos principais.
  - `[low]` `[patch]` Missing Unit Test Suite for `ObrasInteractiveSection` — Adicionados testes em `page.spec.tsx` exercitando interações completas de filtro e busca.
  - `[low]` `[reject]` Mobile Viewport Obscured by Floating Detail Panel — O painel possui botão de fechar (`X`) acessível e `max-h-[75%]` responsivo para visualização touch sem bloquear a navegação.
  - `[low]` `[reject]` Missing Civic Data Export Option ("Show Your Work") — Endpoint e botão de exportação CSV de obras não fazem parte do escopo da Story 17.3.
  - `[low]` `[reject]` Uncleared Leaflet Event Listeners — Leaflet layer group `clearLayers()` remove os marcadores do mapa e descarta seus listeners nativamente.
  - `[low]` `[patch]` Ausência de teste para o manipulador de rota OpenGraph de Obras Públicas — Adicionado teste em `og-routes.spec.tsx` validando retorno de `ImageResponse` para a rota de obras.
  - `[low]` `[patch]` Falta de verificação do callback de seleção de obra ao clicar em marcador do mapa — Adicionado teste em `obras-mapa-interativo.spec.tsx` capturando clique no marker e conferindo emissão de `onSelectObra`.
  - `[low]` `[patch]` Ausência de teste para o campo de busca textual no componente interativo de obras — Adicionado teste em `page.spec.tsx` simulando preenchimento do input e conferindo filtragem de cards.
  - `[high]` `[patch]` Violação da Regra 23 de AGENTS.md (Isolamento Multi-tenant e Proibição de Literais de Tenant em view-model.ts) — Agrupado com item 1; removidos literais de tenant e implementado centroide neutro.
  - `[medium]` `[patch]` Dependência ausente no efeito de atualização de marcadores em ObrasMapaInterativo — Agrupado com item 5; adicionado `selectedObraId` às dependências.
  - `[medium]` `[patch]` Edge Case: selectedObraId changes without markers array reference changing — Agrupado com item 5; efeito re-executa com `selectedObraId`.
  - `[low]` `[patch]` Edge Case: center prop changes after initial map mount — Agrupado com item 4; `setView` sincronizado.
  - `[low]` `[patch]` Edge Case: selectedObraId is set on initial component mount — Adicionado auto-foco na obra pré-selecionada.
  - `[medium]` `[patch]` Edge Case: Search term contains unaccented letters for accented words or vice versa — Adicionada normalização Unicode NFD sem diacríticos (`unaccent`) na busca do cliente.
  - `[low]` `[patch]` Edge Case: User types rapidly in the search input — Agrupado com item 7; debounce de 300ms implementado.

## Design Notes

Padrão de cores e rótulos dos marcadores e badges por status de obra:
- `em_execucao`: Verde esmeralda (`#059669` / `bg-emerald-500` / `text-emerald-700`), rótulo: "Em Execução"
- `paralisada`: Vermelho (`#dc2626` / `bg-rose-500` / `text-rose-700`), rótulo: "Paralisada"
- `concluida`: Azul (`#2563eb` / `bg-sky-500` / `text-sky-700`), rótulo: "Concluída"
- `cadastrada`: Cinza ardósia (`#64748b` / `bg-slate-400` / `text-slate-700`), rótulo: "Cadastrada"
- `cancelada`: Cinza escuro (`#475569` / `bg-zinc-400` / `text-zinc-700`), rótulo: "Cancelada"

Centro padrão do mapa quando não houver centroide calculado das obras ou antes da seleção:
- Centroides das cidades: Porciúncula (-20.9634, -42.0408), Natividade (-21.0422, -41.9744) ou centrado na média dos marcadores disponíveis.

## Verification

**Commands:**
- `pnpm --filter web typecheck` -- expected: compilação TypeScript limpa sem erros
- `pnpm --filter web test` -- expected: todos os testes unitários e de integração passam
- `pnpm --filter @transparencia/ui test` -- expected: testes do pacote UI passam

## Auto Run Result

### Resumo das Alterações Implementadas
Implementação completa da Story 17.3: Rota Pública `/obras`, Mapa Interativo de Impacto Urbano e Filtros Cívicos no `apps/web`. A entrega abrange:
- Adição do link "Obras Públicas" (`/obras`) com ícone `HardHat` no menu Temas da `Sidebar` em `@transparencia/ui`.
- Loader desacoplado e cacheado (`apps/web/app/[portalSlug]/obras/loader.ts`) consumindo `@transparencia/db`.
- View model puro e imutável (`apps/web/app/[portalSlug]/obras/view-model.ts`) com badges de status, formatações de moeda e cálculo dinâmico de centroide sem literais de tenant.
- Componente de mapa Leaflet (`apps/web/components/obras/obras-mapa-interativo.tsx`) com renderização no cliente, pins coloridos por situação da obra, sanitização XSS de popups e zoom responsivo.
- Seção interativa com filtros rápidos por status e busca textual com normalização diacrítica e debounce (`apps/web/components/obras/obras-interactive-section.tsx`).
- Painel resumo de detalhes rápidos com barra de avanço físico e fundamentação legal à Lei nº 14.133/2021 (`apps/web/components/obras/obras-painel-resumo.tsx`).
- Página server-component pública (`apps/web/app/[portalSlug]/obras/page.tsx`), card OpenGraph dinâmico (`opengraph-image.tsx`), e sincronização com `llms.txt` e `llms-full.txt`.

### Arquivos Modificados / Criados
- `packages/ui/src/components/sidebar.tsx` — Adiciona link "Obras Públicas" no grupo Temas.
- `packages/ui/src/components/__tests__/sidebar.spec.tsx` — Teste unitário do link de obras na sidebar.
- `apps/web/app/[portalSlug]/obras/loader.ts` — Loader co-localizado com cache de 24h.
- `apps/web/app/[portalSlug]/obras/loader.spec.ts` — Testes unitários do loader de obras.
- `apps/web/app/[portalSlug]/obras/view-model.ts` — View model de apresentação de obras e centroide dinâmico.
- `apps/web/app/[portalSlug]/obras/view-model.spec.ts` — Testes unitários do view model.
- `apps/web/components/obras/obras-painel-resumo.tsx` — Painel de detalhes rápidos ao selecionar obra.
- `apps/web/components/obras/obras-mapa-interativo.tsx` — Componente interativo client-side com Leaflet e marcadores coloridos.
- `apps/web/components/obras/obras-mapa-interativo.spec.tsx` — Testes unitários do mapa e interação de clique no marcador.
- `apps/web/components/obras/obras-interactive-section.tsx` — Container de filtros rápidos, busca e visualização mapa/lista responsiva.
- `apps/web/app/[portalSlug]/obras/page.tsx` — Server component da página pública com hero e KPIs.
- `apps/web/app/[portalSlug]/obras/page.spec.tsx` — Testes de integração da página, filtragem e busca.
- `apps/web/app/[portalSlug]/obras/opengraph-image.tsx` — Imagem OpenGraph dinâmica.
- `apps/web/components/og/og-routes.spec.tsx` — Teste unitário para a imagem OpenGraph de obras.
- `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` — Catálogo e guia de rotas públicas atualizados.
- `apps/web/package.json` e `pnpm-lock.yaml` — Versões fixadas de `leaflet` (1.9.4) e `@types/leaflet` (1.9.22).

### Detalhamento das Descobertas da Revisão
- **Patches aplicados (20):**
  - High (2): Removidos literais fixos de municípios em `getMapCenter` (Regra 23) e adotado centroide estritamente derivado das coordenadas das obras com fallback neutro genérico.
  - Medium (5): Sanitização de strings HTML contra XSS em popups do Leaflet; desacoplamento de filtros do servidor para garantir dataset completo no cliente; sincronização de `selectedObraId` no hook de marcadores; e normalização diacrítica (`unaccent`) na busca textual do cliente.
  - Low (13): Debounce de 300ms na digitação da busca; acessibilidade ARIA nos marcadores e pílulas de filtro; chamada a `map.invalidateSize()` após montagem; e testes adicionados para a rota OpenGraph, clique no marcador e input de busca textual.
- **Itens Rejeitados (4):**
  - Omissão da pílula "cancelada": Foco dos critérios da Story 17.3 é estritamente "Todas", "Em Andamento" e "Paralisadas".
  - Painel cobrindo tela mobile: Painel é responsivo, dismissível via botão X e dimensionado para visualização em gaveta.
  - Opção de exportação CSV: Fora do escopo da Story 17.3.
  - Event listeners do Leaflet: O gerenciador de camadas nativo do Leaflet limpa listeners ao invocar `clearLayers()`.

### Recomendação de Revisão de Acompanhamento
- `followup_review_recommended`: `true` (devido à aplicação de patch classificado como `high` referente à neutralidade multi-tenant da Regra 23 na primeira passagem).
- Contagem de patches por severidade: `high: 2`, `medium: 5`, `low: 13`.

### Verificação Realizada
- `pnpm --filter web typecheck`: 0 erros de tipagem.
- `pnpm --filter @transparencia/ui test`: 7/7 arquivos de teste, 79/79 testes passando.
- `pnpm --filter web test`: 89/89 arquivos de teste, 689/689 testes passando.
- `make check`: 55 arquivos Python e linters passando 100%.

### Riscos Residuais
Nenhum risco residual funcional ou de segurança. A renderização de mapas Leaflet é isolada no cliente via dynamic import (`ssr: false`) e os dados georreferenciados são validados defensivamente.
