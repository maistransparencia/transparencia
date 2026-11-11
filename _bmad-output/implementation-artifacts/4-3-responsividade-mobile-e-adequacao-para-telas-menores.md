---
baseline_commit: b790690
generated_at: 2026-08-07T13:37:00-03:00
---

# Story 4.3: Responsividade Mobile e Adequação para Telas Menores

## Metadados

- Epic: 4 - Experiência Visual, Responsividade Mobile, SEO & Otimização para LLMs
- Story ID: 4.3
- Story Key: 4-3-responsividade-mobile-e-adequacao-para-telas-menores
- Status: review
- Arquivo: _bmad-output/implementation-artifacts/4-3-responsividade-mobile-e-adequacao-para-telas-menores.md

## User Story

Como usuário de dispositivo móvel,
Quero que tabelas, cards de KPI, menus de navegação e seletores de exercício e entidades se adaptem perfeitamente a telas menores (smartphones e tablets),
Para que eu possa consultar os dados de transparência pública municipal com fluidez e conforto sem quebras de layout em dispositivos móveis.

## Critérios de Aceitação (BDD)

**Given** um dispositivo móvel com largura de viewport entre 360px e 430px (smartphones iOS/Android)
**When** o usuário navega pelas telas do portal (ex: `/visao-geral`, `/despesas`, `/orcamento`, `/licitacoes`, `/pessoal`, `/caprem`, `/saude`)
**Then** as tabelas (`DenseTable`, tabelas de despesas, licitações e contratos) devem possuir rolagem horizontal suave (`overflow-x-auto`) e layout adaptativo sem estourar o container principal.

**And** a barra lateral (`Sidebar`) e o layout principal de navegação devem oferecer suporte a telas menores: em dispositivos móveis (`< md`), a navegação deve recolher-se em um menu responsivo (header móvel com botão de alternância/drawer ou layout adaptativo) para garantir que o conteúdo principal não seja esmagado ou ocultado.

**And** componentes de KPI (`KPIGrid` e `KPICard`) e seletores de filtros (exercício e `MultiSelect`) devem organizar-se em colunas responsivas flexíveis utilizando os breakpoints oficiais do Tailwind (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`).

**And** o padding do container principal em `RootLayout` (`apps/web/app/layout.tsx`) deve adaptar-se responsivamente (`px-4 sm:px-6 md:px-10 py-4 md:py-8`) liberando espaço útil em telas de 360px a 430px.

**And** botões e elementos interativos (seletores, itens do menu, botões de paginação e links) devem possuir área de toque (touch target) mínima adequada para toque móvel (44x44px).

**And** a suíte de validação completa (`make test`, `make test/ts`, `pnpm build`) executa e passa com 100% de sucesso.

## Contexto da Epic e Valor

- A Epic 4 estabelece a excelência visual, SEO, suporte a LLMs e diretrizes de código no frontend.
- Grande parcela dos cidadãos e auditores acessa portais de transparência pública via dispositivos móveis (360px a 430px).
- Atualmente, o container `<main>` possui padding fixo `px-10` (40px em cada lado), reduzindo a largura útil da tela em smartphones. Além disso, a `Sidebar` possui largura fixa `w-[266px]` sem ocultação responsiva em dispositivos móveis.
- Esta story adequa toda a interface do TransparenciaWeb para uma experiência mobile de classe mundial, mantendo total paridade funcional e visual no desktop.

## Guardrails Arquiteturais Obrigatórios

### AD-5 e Multi-tenant
1. O parâmetro `portalSlug` deve continuar sendo repassado normalmente em todos os links e navegações responsivas.
2. Em visualizações móveis do menu de navegação, preservar as seleções de exercício (`ano`) e entidades ativas.

### AGENTS.md e Protocolos de Qualidade
1. **Nomes Explícitos**: Nenhuma abreviação opaca (`m`, `tb`, `btn`, `w`). Utilizar nomes descritivos como `isMobileOpen`, `toggleMobileMenu`, `touchTargetMinHeight`.
2. **Programação Funcional**: Manter imutabilidade em manipuladores de estado responsivo.
3. **Preservação de Versões Pinned**: Manter dependências em `package.json` sem prefixos `^` ou `~`.
4. Testes de integração dbt/Python (`make test`) devem passar 100%.
5. Testes de tipos e contratos Kysely (`make test/ts`) devem passar 100%.
6. O build de produção Next.js e pacotes (`pnpm build`) deve compilar sem aviso ou erro.

## Aprendizados das Stories Anteriores (4.1 & 4.2)

- Na Story 4.1 e 4.2, `RootLayout` (`apps/web/app/layout.tsx`) foi configurado com `metadata.title` e `metadata.icons` com suporte ao proxy de favicons.
- O componente `SidebarWrapper` e `Sidebar` gerenciam os estados de busca via `nuqs` (`ano` e `entidades`). Alterações no `Sidebar` para suporte a menu mobile devem manter os callbacks de `onExerciceChange` e `onEntidadesChange` intactos.

## Estado Atual dos Arquivos a Serem Modificados

### 1. `apps/web/app/layout.tsx` (UPDATE)
- **Estado Atual**: Linha 70: `<main className="mx-auto w-full max-w-[1000px] flex-1 overflow-x-hidden px-10 py-8">`. Em mobile (360px), 80px de padding consome mais de 22% da tela.
- **Modificação Necessária**: Atualizar para `<main className="mx-auto w-full max-w-[1000px] flex-1 overflow-x-hidden px-4 sm:px-6 md:px-10 py-4 md:py-8">`.

### 2. `packages/ui/src/components/sidebar.tsx` (UPDATE)
- **Estado Atual**: `<aside className="sticky top-0 flex h-screen w-[266px] shrink-0 select-none flex-col justify-between border-borderLine border-r bg-white">`. Na web móvel, consome a maior parte da tela.
- **Modificação Necessária**:
  - Incorporar layout responsivo com toggle mobile (hamburger menu) para telas `< md`.
  - Em telas de desktop (`md:`), a barra lateral permanece fixa como hoje (`hidden md:flex md:w-[266px]`).
  - Em telas móveis (`< md`), exibir cabeçalho móvel compacto (`md:hidden`) com botão de menu 44x44px e gaveta (drawer/overlay) ou menu retrátil para navegação.

### 3. `packages/ui/src/components/dense-table.tsx` (UPDATE)
- **Estado Atual**: Tabela possui wrapper `overflow-x-auto`. O cabeçalho de busca e exportação CSV em telas pequenas usa `flex-col sm:flex-row`.
- **Modificação Necessária**:
  - Garantir padding adequado nas células (`px-2.5 sm:px-4 py-2.5`) e touch targets de ao menos 44px nos botões de paginação, ordenação e exportação CSV.
  - Adequar barra de paginação inferior (`flex-col gap-3 sm:flex-row`) para não estourar em telas de 360px.

### 4. `apps/web/components/kpi-grid.tsx` (UPDATE)
- **Estado Atual**: `columns === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"`.
- **Modificação Necessária**: Revisar espaçamento do grid `gap-3 sm:gap-4` para visualização em telas móveis verticais de 360px.

### 5. `packages/ui/src/components/multi-select.tsx` e Seletores em `sidebar.tsx` (UPDATE)
- **Estado Atual**: Botão de seleção possui `py-1.5` (~32px de altura).
- **Modificação Necessária**: Garantir altura/touch target mínimo para dispositivos móveis (`min-h-[44px]` ou padding adaptativo `py-2 sm:py-1.5`) para facilitar o toque com o polegar.

## Tarefas / Subtarefas

- [x] **Task 1 - Ajustar Padding Responsivo do Layout Raiz (AC: 4)**
  - [x] Atualizar `apps/web/app/layout.tsx` alterando `px-10 py-8` para `px-4 sm:px-6 md:px-10 py-4 md:py-8`.

- [x] **Task 2 - Implementar Sidebar Responsiva com Menu Mobile (AC: 2, 5)**
  - [x] Atualizar `packages/ui/src/components/sidebar.tsx` adicionando estado de abertura móvel (`isMobileOpen`).
  - [x] Criar bar/header móvel compacto para telas `< md` com brasão, título e botão hamburger (área de toque 44x44px).
  - [x] Exibir overlay/drawer ou gaveta retrátil quando o menu móvel estiver ativo.
  - [x] Garantir que clicar em um link da navegação em tela móvel feche automaticamente o menu.
  - [x] Preservar 100% da visualização da Sidebar no desktop (`md:flex md:w-[266px]`).

- [x] **Task 3 - Adequar `DenseTable` e Controles para Telas Menores (AC: 1, 5)**
  - [x] Garantir que o container da `DenseTable` preserve a rolagem horizontal suave em 360px (`overflow-x-auto`).
  - [x] Ajustar a barra de paginação e o botão "Baixar CSV" para alinhamento limpo em telas pequenas.
  - [x] Definir `min-h-[44px]` e `min-w-[44px]` nos botões de paginação e filtros em telas móveis.

- [x] **Task 4 - Adequar KPI Cards e Seletores de Filtro para Touch (AC: 3, 5)**
  - [x] Verificar `KPIGrid` e `KPICard` em visualizações de 360px-430px.
  - [x] Ajustar `MultiSelect` e o `select` de exercício em `packages/ui` para garantir altura de toque confortável (`min-h-[44px]`).

- [x] **Task 5 - Suíte Completa de Validação (AC: 6)**
  - [x] Executar `make test` para verificar integridade do dbt/Python.
  - [x] Executar `make test/ts` para verificar integridade dos tipos Kysely/TypeScript.
  - [x] Executar `pnpm build` para confirmar 0 erros de compilação no Next.js e pacotes monorepo.

## Checklist de Validação da Story

- [x] Padding do `<main>` em `RootLayout` adaptado (`px-4 sm:px-6 md:px-10 py-4 md:py-8`).
- [x] Sidebar adaptada com menu mobile/hamburger toggle em telas `< md`.
- [x] Rolagem horizontal fluida em todas as tabelas (`DenseTable`) sem quebra de viewport.
- [x] Botões interativos e seletores com touch target mínimo de 44x44px em telas menores.
- [x] `make test` aprovado 100% verde (82 passed).
- [x] `make test/ts` aprovado 100% verde (16 passed).
- [x] `pnpm build` compila com 0 erros.

## Dev Agent Record

### Agent Model Used

Gemini 3.6 Flash (Medium)

### Debug Log References

- `make test`: 82/82 testes pytest/dbt executados e aprovados com 100% de sucesso.
- `make test/ts`: 16/16 testes vitest/Kysely executados e aprovados com 100% de sucesso; compilação tsc limpa em pacotes.
- `pnpm build`: Build de produção turbopack/Next.js gerado com 0 erros ou avisos.

### Completion Notes List

- Ajustado o container principal `<main>` em `apps/web/app/layout.tsx` para padding responsivo (`px-4 sm:px-6 md:px-10 py-4 md:py-8`), aumentando a área útil em smartphones (360-430px).
- Incorporada barra móvel compacta (`sticky top-0 md:hidden`) com brasão, título e botão hamburger (área de toque 44x44px) na `Sidebar` (`packages/ui/src/components/sidebar.tsx`).
- Criado gaveta (drawer/overlay) retrátil com fecho automático ao selecionar rotas na visualização móvel.
- Adequada a `DenseTable` (`packages/ui/src/components/dense-table.tsx`) garantindo botões de paginação e exportação CSV com áreas de toque de 44px (`min-h-[44px] sm:min-h-0`).
- Atualizados o `MultiSelect` e `select` de exercício em `packages/ui` para suporte a touch de 44px min-h.

### File List

- `apps/web/app/layout.tsx` (MODIFIED)
- `packages/ui/src/components/sidebar.tsx` (MODIFIED)
- `packages/ui/src/components/dense-table.tsx` (MODIFIED)
- `packages/ui/src/components/multi-select.tsx` (MODIFIED)
- `_bmad-output/implementation-artifacts/4-3-responsividade-mobile-e-adequacao-para-telas-menores.md` (MODIFIED)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (MODIFIED)

## Change Log

- **2026-08-07**: Criação da especificação da Story 4.3 com foco em responsividade mobile, touch targets (44px), menu mobile e tabelas adaptativas para viewports de 360px a 430px. Status: ready-for-dev.
- **2026-08-07**: Implementação completa de layout responsivo, header móvel com hamburger menu, drawer retrátil na Sidebar, padding adaptativo no RootLayout, touch targets de 44px no DenseTable e MultiSelect. Validação tripla (`make test`, `make test/ts`, `pnpm build`) 100% verde. Status: review.

