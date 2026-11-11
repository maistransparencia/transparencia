---
baseline_commit: 44e8d3043665ca0b19c2fc2df9d233f8c32182b6
---
# Story 8.2: Barra Fixa de Navegação Mobile Contínua (`MobileBottomNav`) com Stepper Cívico e Seletor de Ano

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a mobile citizen browsing the municipal transparency portal,
I want a sticky bottom navigation bar with "Previous" and "Next" stepper controls, a quick link to Overview, and an integrated year switcher,
So that I can fluidly flip through all portal sections (Overview, Expenses, Revenue, Budget, Procurement, Personnel, Health, Pension) with one hand without getting trapped on the homepage.

---

## Acceptance Criteria

1. **Visibilidade Responsiva e Fixação no Rodapé:**
   - O componente `MobileBottomNav` deve ser renderizado exclusivamente em viewports móveis (`md:hidden`) e permanecer oculto em telas de desktop (`hidden md:hidden` no breakpoint desktop).
   - O componente deve ser fixado no rodapé da viewport (`fixed bottom-0 left-0 right-0 z-50`) com efeito translúcido (`backdrop-blur-md bg-white/95`), borda superior divisória sutil (`border-t border-borderLine`) e sombra suave (`shadow-lg`).
   - O container deve suportar o safe area inset de dispositivos móveis modernos (ex: barra de início de iPhones/Android) utilizando padding inferior seguro (`pb-[max(0.5rem,env(safe-area-inset-bottom))]` ou utilitário `pb-safe`).

2. **Navegação Móvel em Tab Bar Ergonômica de 5 Abas (com Botão "Mais"):**
   - A barra inferior fixa deve conter 5 abas ergonômicas de toque generoso (`min-h-[48px] touch-manipulation`):
     1. **Início** (`/` ou `/${portalSlug}`) — com ícone `LayoutDashboard`
     2. **Receitas** (`/${portalSlug}/receitas`) — com ícone `TrendingUp`
     3. **Despesas** (`/${portalSlug}/despesas`) — com ícone `Receipt`
     4. **Licitações** (`/${portalSlug}/licitacoes`) — com ícone `FileText`
     5. **Mais / Fechar** — botão interativo de ação que abre/fecha o menu lateral completo (drawer com `Orçamento`, `Pessoal`, `Saúde`, `CAPREM`, etc.) via contexto reativo compartilhado (`MobileNavProvider`), alternando dinamicamente entre ícone `Menu` (quando fechado) e `X` (quando aberto).
   - A aba ativa correspondente à rota corrente deve ser destacada visualmente com cor de destaque (`accent`), ícone levemente ampliado (`scale-110`) e `aria-current="page"`.

3. **Seletor de Ano Centralizado no Top Header e Sincronizado via URL:**
   - O seletor de ano (`YearSelect` / `nuqs("ano")`) deve ser exibido com destaque e ergonomia no cabeçalho superior móvel e desktop, sincronizado reativamente com a URL e preservado em todas as transições de rota.
   - A alteração do ano deve atualizar a query string `?ano=YYYY` de forma reativa e consistente em toda a árvore da aplicação.

4. **Preservação de Contexto e Parâmetros Multi-tenant:**
   - Todas as transições de rota pelos botões do stepper e pelo botão de início devem preservar estritamente os parâmetros de busca vigentes (`ano` e `entidades`), utilizando a função utilitária `buildNavUrl` de `@transparencia/ui`.
   - O `portalSlug` deve ser detectado dinamicamente a partir dos parâmetros de rota ou contexto padrão (`porciuncula_prefeitura`), garantindo compatibilidade multi-tenant (AD-5).

5. **Acomodação de Layout Global (Anti-sobreposição):**
   - O layout raiz (`apps/web/app/layout.tsx`) deve acomodar a barra fixa adicionando espaçamento inferior ao container de conteúdo principal (`pb-20 md:pb-0` ou `pb-24`), impedindo que a barra sobreponha rodapés, paginações de tabelas, botões de ação ou gráficos.

6. **Qualidade e Testes:**
   - Suíte completa de testes unitários e de integração (`apps/web/components/mobile-bottom-nav.spec.tsx`) cobrindo:
     - Renderização de botões anterior/próximo com rótulos corretos baseados no pathname ativo.
     - Estados desabilitados do botão anterior na raiz e próximo na última seção.
     - Preservação de query strings (`ano` e `entidades`) nos links gerados.
     - Interação com o seletor compacto de ano e disparo de evento.
     - Acessibilidade (`aria-label`, touch target mínimo 44px).
   - 100% de aprovação nas suítes automatizadas: `make test/ts` (ou `pnpm --filter web test`), `pnpm build`, `make test` e `make check`.

---

## Tasks / Subtasks

- [x] Task 1: Implementar o componente `MobileBottomNav` em `apps/web/components/mobile-bottom-nav.tsx` (AC: 1, 2, 3, 4)
  - [x] Subtask 1.1: Definir a lista canônica `PORTAL_PAGES` com slug, rota, rótulo de exibição e ícone Lucide.
  - [x] Subtask 1.2: Criar helper funcional para resolução da página atual, página anterior e próxima página a partir de `usePathname()`.
  - [x] Subtask 1.3: Construir os links de navegação com `buildNavUrl` preservando `ano` e `entidades`.
  - [x] Subtask 1.4: Implementar o botão central de `Início` e o seletor compacto de exercício sincronizado com `useQueryState("ano")`.
  - [x] Subtask 1.5: Aplicar estilos Tailwind: fixação inferior (`fixed bottom-0 left-0 right-0 z-50`), `backdrop-blur-md bg-white/95`, `pb-[max(0.5rem,env(safe-area-inset-bottom))]`, `md:hidden` e touch targets mínimos de 44px.
- [x] Task 2: Integrar `MobileBottomNav` ao layout raiz em `apps/web/app/layout.tsx` (AC: 1, 5)
  - [x] Subtask 2.1: Importar `MobileBottomNav` e posicioná-lo dentro do `<NuqsAdapter>` sob `<Suspense fallback={null}>`.
  - [x] Subtask 2.2: Passar as props necessárias (`portalSlug`, `anoInicial`, `entidades`).
  - [x] Subtask 2.3: Adicionar classe `pb-24 sm:px-6 md:px-10 md:py-8` ao `<main>` para evitar sobreposição de elementos na base da tela.
- [x] Task 3: Criar suíte de testes automatizados em `apps/web/components/mobile-bottom-nav.spec.tsx` (AC: 6)
  - [x] Subtask 3.1: Testar renderização na Visão Geral (botão Anterior desabilitado, Próximo aponta para Receitas).
  - [x] Subtask 3.2: Testar renderização em página intermediária como Despesas (Anterior aponta para Orçamento, Próximo aponta para Licitações).
  - [x] Subtask 3.3: Testar renderização na última página CAPREM (Próximo desabilitado, Anterior aponta para Saúde).
  - [x] Subtask 3.4: Testar preservação de parâmetros `?ano=2024&entidades=1,2` nos links de navegação.
  - [x] Subtask 3.5: Testar clique e alteração do seletor de ano.
- [x] Task 4: Executar validações de qualidade e compilação (AC: 6)
  - [x] Subtask 4.1: Executar `pnpm --filter web test` (ou `make test/ts`) e verificar passagem de todos os testes.
  - [x] Subtask 4.2: Executar `pnpm build` para garantir ausência de erros de build e tipagem.
  - [x] Subtask 4.3: Atualizar `_bmad-output/implementation-artifacts/sprint-status.yaml`.

### Review Findings

- [x] [Review][Decision] Alinhamento da Especificação da Story 8.2 (Stepper Cívico Sequencial vs. Tab Bar de 5 Abas com Botão "Mais") — Aprovada Opção 1: Ratificada a Tab Bar de 5 abas com botão "Mais" e atualizados os Critérios de Aceitação da história.
- [x] [Review][Decision] Restauração do Botão Hambúrguer de Contingência no Cabeçalho Superior Mobile — Aprovada Opção 2: Mantido exclusivamente o botão "Mais" na barra inferior como gatilho móvel canônico.
- [x] [Review][Patch] Correção da sobreposição do Backdrop e z-index da Barra Móvel (`MobileBottomNav`) [apps/web/components/mobile-bottom-nav.tsx:139, packages/ui/src/components/sidebar.tsx:263]
- [x] [Review][Patch] Reposicionamento do banner PwaInstaller para não sobrepor o botão "Mais" no mobile [apps/web/components/pwa-installer.tsx:248]
- [x] [Review][Patch] Eliminação do fallback silencioso no-op e substituição por erro explícito em `useMobileNav` [apps/web/components/mobile-nav-context.tsx:36]
- [x] [Review][Patch] Padronização das importações de `mobile-nav-context` com alias `@/components/mobile-nav-context` [apps/web/app/layout.tsx:19, apps/web/app/components/sidebar-wrapper.tsx:7, apps/web/components/mobile-bottom-nav.tsx:15]
- [x] [Review][Patch] Fechamento automático do drawer móvel na navegação de rotas via `useEffect` no `pathname` [apps/web/components/mobile-nav-context.tsx:20]
- [x] [Review][Patch] Correção do cálculo visual de aba ativa no botão "Mais" para refletir apenas `isMenuOpen` [apps/web/components/mobile-bottom-nav.tsx:134]
- [x] [Review][Patch] Passagem obrigatória de `portalSlug` para `SidebarWrapper` no layout raiz [apps/web/app/layout.tsx:153]
- [x] [Review][Patch] Eliminação de ternário aninhado em `normalizedBrasao` conforme Regra 13 de AGENTS.md [packages/ui/src/components/sidebar.tsx:205]
- [x] [Review][Patch] Substituição de ternário tautológico por coalescência nula conforme Regra 14 de AGENTS.md [packages/ui/src/components/sidebar.tsx:169]
- [x] [Review][Patch] Preservação de `md:sticky` e `md:top-0` no desktop mesmo com drawer móvel aberto [packages/ui/src/components/sidebar.tsx:274]
- [x] [Review][Patch] Adição de trava de rolagem no body (`overflow: hidden`) enquanto o drawer móvel estiver aberto [packages/ui/src/components/sidebar.tsx:260]
- [x] [Review][Patch] Testes de integração reais sem mock excessivo entre `MobileNavProvider`, `SidebarWrapper` e `MobileBottomNav` [apps/web/components/mobile-bottom-nav.spec.tsx]

---

## Dev Notes

### Padrões Arquiteturais e Guardrails Mandatórios

- **Localização de Componente (AD-4):**
  O componente `MobileBottomNav` deve ser criado em `apps/web/components/mobile-bottom-nav.tsx` por se tratar de um componente de domínio web do portal, consumindo hooks de navegação do Next.js (`usePathname`, `useSearchParams`) e gerenciamento de estado de query string via `nuqs`.
- **Navegação Canônica (Ordem das Telas):**
  A sequência ordenada de seções do portal definida no projeto é:
  1. Visão Geral (`/` ou `/${portalSlug}`) — `LayoutDashboard`
  2. Receitas (`/${portalSlug}/receitas`) — `TrendingUp`
  3. Orçamento (`/${portalSlug}/orcamento`) — `PieChart`
  4. Despesas (`/${portalSlug}/despesas`) — `Receipt`
  5. Licitações (`/${portalSlug}/licitacoes`) — `FileText`
  6. Pessoal (`/${portalSlug}/pessoal`) — `Users`
  7. Saúde (`/${portalSlug}/saude`) — `HeartPulse`
  8. CAPREM (`/${portalSlug}/caprem`) — `Landmark`
- **Preservação de Query Strings (AD-5):**
  Utilizar `buildNavUrl` importado de `@transparencia/ui` (`packages/ui/src/utils/nav.ts`):
  ```typescript
  buildNavUrl({
    path: targetRoute,
    slug: portalSlug,
    exercice: currentExercice,
    entidades: currentEntidades,
  });
  ```
- **Condicionais sem Ternários Aninhados (Regra 13 de `AGENTS.md`):**
  É estritamente proibido aninhar operadores ternários (`a ? b : c ? d : e`). Para mapear rótulos, estados desabilitados ou ícones condicionais, utilizar funções auxiliares funcionais com retornos antecipados (`return`) ou IIFEs autoexecutáveis.
- **Nenhum Acesso Direto a `process.env` (Regra 17 de `AGENTS.md`):**
  Se qualquer variável de ambiente for necessária, importar exclusivamente de `@/env`.
- **Nomes de Métricas e Variáveis Explícitos (Regra 9 de `AGENTS.md`):**
  Proibido utilizar identificadores opacos como `prev`, `nxt`, `nav`, `curr`. Utilizar `previousPage`, `nextPage`, `currentPageIndex`, `activePortalSlug`.

### Estado Atual dos Arquivos a Serem Modificados

#### 1. `apps/web/app/layout.tsx` (UPDATE)
- **O que faz hoje:**
  Renderiza `<SidebarWrapper />` e o container `<main className="mx-auto w-full max-w-[1000px] flex-1 overflow-x-hidden px-4 py-4 sm:px-6 md:px-10 md:py-8">`.
- **O que esta story altera:**
  - Adiciona `pb-20 md:pb-0` (ou `pb-24`) à classe do container `<main>` para que o conteúdo final de nenhuma página fique sob a barra fixa no mobile.
  - Insere `<Suspense fallback={null}><MobileBottomNav portalSlug={portalConfig?.slug} anoInicial={portalConfig?.anoInicial} /></Suspense>` no layout raiz.
- **O que deve ser preservado:**
  - Todas as integrações existentes (`JsonLd`, `Ribbon`, `NewsletterFeedbackBanner`, `ExtractionNotificationBanner`, `PwaInstaller`, `Analytics`, `SpeedInsights`).

#### 2. `apps/web/components/mobile-bottom-nav.tsx` (NEW)
- Novo componente cliente (`"use client"`) implementando a barra fixa mobile.

#### 3. `apps/web/components/mobile-bottom-nav.spec.tsx` (NEW)
- Nova suíte de testes Vitest com `@testing-library/react`.

### Testing Standards

- Testes de frontend são executados com `vitest run` via `pnpm --filter web test` ou `make test/ts`.
- Mocks necessários:
  - `next/navigation`: `usePathname`, `useSearchParams`, `useRouter`.
  - `posthog-js`: `capture`.
  - `nuqs`: `useQueryState`.
- Garantir que todos os testes passem de forma determinística sem warnings de act ou DOM leaks.

---

## Dev Agent Record

### Agent Model Used

Gemini 3.8 Flash (Medium)

### Debug Log References

- Baseline test check executado com sucesso: 38 arquivos de teste, 187 testes passando.
- Invariantes de rota validadas contra `packages/ui/src/components/sidebar.tsx` e `apps/web/public/llms.txt`.

### Completion Notes List

- Story context criado com todas as diretrizes de código, regras de responsividade, prevenção de sobreposição de rodapé e plano de testes detalhado.
- Task 1 e Task 3 concluídas: `MobileBottomNav` implementado em `apps/web/components/mobile-bottom-nav.tsx` com stepper cívico sequencial (anterior/próximo), atalho central para Início e seletor compacto de exercício com telemetria PostHog (`year_filter_changed`). Suíte completa de testes unitários e de integração criada em `apps/web/components/mobile-bottom-nav.spec.tsx` com 8 testes passando 100%.
- Task 2 concluída: `MobileBottomNav` integrado no layout raiz `apps/web/app/layout.tsx` sob `<NuqsAdapter>` dentro de `<Suspense fallback={null}>`, com passagem das props multi-tenant `portalSlug`, `anoInicial` e `entidades`. Container `<main>` atualizado com espaçamento inferior protetivo (`pb-24 sm:px-6 md:px-10 md:py-8`) evitando sobreposição no mobile.
- Task 4 concluída: 100% de sucesso na validação de testes (`make test/ts`, 39 arquivos de teste e 195 testes passando), typecheck sem erros (`tsc --noEmit`), compilação Next.js completa (`pnpm build`) e linter/formatters (`make check`).
- Refinamentos UX de Sally aplicados: evolução do componente `MobileBottomNav` para um padrão canônico de App Mobile com 5 abas ergonômicas de toque generoso (75px de largura por aba, touch target min 48px): 4 abas primárias para os eixos fiscais mais consultados pelos cidadãos (`Início`, `Receitas`, `Despesas`, `Licitações`) e uma 5ª aba funcional `Mais` (com ícone `Menu`) que aciona diretamente o menu lateral completo (contendo `Orçamento`, `Pessoal`, `Saúde`, `CAPREM`, etc.) via contexto reativo compartilhado (`MobileNavProvider`). O botão hambúrguer redundante do topo mobile foi removido (deixando o cabeçalho superior despoluído e dedicado à identidade municipal e seletor compacto de exercício), e um botão de fechar `X` foi incorporado no cabeçalho do drawer lateral. O z-index da barra foi cravado em `z-30`, ficando naturalmente por baixo do menu lateral drawer (`z-50`) e do backdrop translúcido (`z-40`).

### File List

- `_bmad-output/implementation-artifacts/8-2-barra-fixa-de-navegacao-mobile-continua-mobilebottomnav-com-stepper-civico-e-seletor-de-ano.md` (MODIFIED)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (MODIFIED)
- `apps/web/components/mobile-bottom-nav.tsx` (NEW)
- `apps/web/components/mobile-bottom-nav.spec.tsx` (NEW)
- `apps/web/components/mobile-nav-context.tsx` (NEW)
- `apps/web/app/components/sidebar-wrapper.tsx` (MODIFIED)
- `apps/web/app/layout.tsx` (MODIFIED)
- `packages/ui/src/components/sidebar.tsx` (MODIFIED)
