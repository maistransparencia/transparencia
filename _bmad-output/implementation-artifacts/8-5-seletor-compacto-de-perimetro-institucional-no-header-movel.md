---
baseline_commit: 7143a89949d857b70c59fda2d4481261298f4a77
---

# Story 8.5: Seletor Compacto de Perímetro Institucional no Header Móvel (`Consolidado` vs. `Filtrado por Entidade`)

Status: done

## Story

As a citizen, auditor, or journalist navigating municipal transparency metrics on mobile devices,
I want a compact institutional perimeter selector in the sticky top mobile header mirroring the year dropdown,
So that I can instantly identify and toggle between consolidated and entity-filtered views with 1 tap, without cluttering the page cards or needing to open the full drawer menu.

---

## Acceptance Criteria

1. **Gatilho de Perímetro Institucional no Header Móvel (`Top Header Móvel (< md)`):**
   - No componente `Sidebar` (`packages/ui/src/components/sidebar.tsx`), dentro do cabeçalho superior móvel (`md:hidden`), no lado oposto ao seletor de ano (`YearSelect variant="compact"`), deve ser renderizado o gatilho compacto de seleção de entidades (`EntidadeSelectCompact`).
   - **Simetria Visual Rigorosa com o `YearSelect (variant="compact")`:**
     - Container alinhado à direita com borda inferior sutil: `relative max-w-[130px] sm:max-w-[150px] border-b border-borderLine`.
     - Botão interativo com mesma tipografia e estilo: `min-h-[24px] cursor-pointer appearance-none px-0 font-medium text-ink text-xs shadow-xs transition-colors hover:border-gray-400 focus:border-[#1d64d8] focus:outline-none flex items-center justify-between gap-1 w-full`.
     - Ícone indicador `ChevronDown` com `strokeWidth={1.6}` e `h-3 w-3 text-mutedText shrink-0` posicionado à direita.
   - **Texto Exibido no Gatilho:**
     - *Visão Consolidada (Padrão):* Quando nenhuma entidade estiver filtrada (`selectedEntidades.length === 0` ou `selectedEntidades.length === entidades.length`), exibe `Consolidado` (ou `Todas`).
     - *Visão Filtrada (1 Entidade):* Exibe o nome amigável da entidade (com `truncate` suave para não estourar o layout móvel) acompanhado de indicador visual sutil (ex: cor ou dot discreto de filtro ativo).
     - *Visão Filtrada (Múltiplas Entidades):* Exibe `${selectedEntidades.length} entidades`.
   - **Acessibilidade WAI-ARIA no Gatilho:**
     - `aria-haspopup="dialog"`.
     - `aria-expanded={isOpen}`.
     - `aria-label="Filtrar entidades públicas municipais"`.

2. **Popover/Dropdown Flutuante Compacto de Entidades:**
   - Ao tocar ou clicar no gatilho, deve abrir um popover compacto posicionado logo abaixo do gatilho (`absolute right-0 top-full mt-1.5 z-50 w-64 rounded-lg border border-borderLine bg-white p-2.5 shadow-lg`).
   - **Estrutura do Popover:**
     - **Cabeçalho:**
       - Título semântico em caixa alta discreta: `PERÍMETRO INSTITUCIONAL` e resumo do escopo atual.
       - Ação rápida: Botão "Todas (Consolidado)" que limpa seleções e ativa o escopo consolidado com 1 toque.
     - **Lista de Entidades com Checkboxes:**
       - Renderiza a lista de opções de `entidades` recebidas pela `Sidebar`.
       - Cada item com checkbox estilizado e nome completo legível da entidade.
       - Tocar em uma entidade alterna sua presença em `selectedEntidades`.
       - Se todas forem marcadas ou todas forem desmarcadas, dispara a limpeza do filtro (`[]`).
   - **Gerenciamento de Foco e Fechamento:**
     - Fechamento imediato ao pressionar a tecla `Escape`.
     - Fechamento ao clicar/tocar fora do popover (evento `pointerdown` para suporte ágil a touch mobile).
     - `role="dialog"` e `aria-modal="true"`.

3. **Integração com o Estado Global e Paridade com a Sidebar:**
   - O componente consome diretamente as props já existentes em `SidebarProps`:
     - `entidades?: MultiSelectOption[]`
     - `selectedEntidades?: string[]`
     - `onEntidadesChange?: (ids: string[]) => void`
   - O gatilho móvel e o dropdown utilizam os mesmos dados e acionam o mesmo `onEntidadesChange` que o `MultiSelect` da Sidebar desktop.
   - A alteração reflete imediatamente na URL (`?entidades=1,2`) via `SidebarWrapper` (`useQueryState("entidades")`), mantendo sincronia bidirecional com todas as páginas e gráficos do portal.

4. **Diretrizes Arquiteturais e Guardrails de Código (`AGENTS.md`):**
   - **Regra 7 (Pinned Versions):** Não instalar nenhuma dependência externa nova; utilizar puramente React 19, Tailwind CSS e Lucide Icons.
   - **Regra 13 (Zero Ternários Aninhados):** Utilizar IIFEs ou funções auxiliares com retornos antecipados para formatar o texto do gatilho e as classes condicionais.
   - **Mobile-first e Viewport:** O componente reside exclusivamente no header móvel (`md:hidden`), preservando o layout da Sidebar desktop limpo e inalterado.

5. **Testes Automatizados:**
   - Testes unitários do componente e da `Sidebar` em `apps/web/components/sidebar-mobile-entidades.spec.tsx` ou em suíte dedicada cobrindo:
     - Renderização do gatilho móvel no estado consolidado padrão.
     - Renderização do gatilho com entidade filtrada ativa.
     - Abertura e fechamento do popover ao interagir com o gatilho, clicar fora e pressionar `Escape`.
     - Chamada do callback `onEntidadesChange` ao marcar/desmarcar checkboxes e ao clicar em "Todas (Consolidado)".
     - Acessibilidade e atributos WAI-ARIA.
   - 100% de aprovação nos comandos `pnpm --filter web test`, `pnpm build`, `make test/ts`, `make check`.

---

## Tasks / Subtasks

- [x] Task 1: Implementar o componente `EntidadeSelectCompact` em `apps/web/components` (AC: 1, 2, 4)
  - [x] Subtask 1.1: Criar o componente `EntidadeSelectCompact` (em `apps/web/components/entidade-select-compact.tsx` para manter `packages/ui` genérico e desacoplado de domínio municipal) com layout de gatilho idêntico a `YearSelect (variant="compact")`.
  - [x] Subtask 1.2: Implementar o texto inteligente do gatilho ("Consolidado", nome da entidade ou "N entidades") usando IIFE sem ternários aninhados.
  - [x] Subtask 1.3: Construir o popover flutuante com cabeçalho, botão rápido de consolidar e lista de checkboxes das entidades.
  - [x] Subtask 1.4: Implementar listeners de tecla `Escape` e clique/toque fora via `pointerdown`.

- [x] Task 2: Integrar o seletor compacto ao Header Móvel da `Sidebar` (AC: 1, 3, 4)
  - [x] Subtask 2.1: No componente `packages/ui/src/components/sidebar.tsx`, expor o slot genérico `mobileHeaderRightSlot?: React.ReactNode` no `Top Header Móvel (< md)` preservando o desacoplamento de `@transparencia/ui`.
  - [x] Subtask 2.2: Adicionar o `EntidadeSelectCompact` via `mobileHeaderRightSlot` em `apps/web/app/components/sidebar-wrapper.tsx`, passando `entidades`, `selectedEntidades` e `handleEntidadesChange`.
  - [x] Subtask 2.3: Garantir alinhamento responsivo evitando overflow mesmo em telas de 375px (iPhone SE).

- [x] Task 3: Testes Automatizados e Acessibilidade (AC: 5)
  - [x] Subtask 3.1: Criar suíte de testes em `apps/web/components/entidade-select-compact.spec.tsx` cobrindo o gatilho, estados consolidado/filtrado, abertura do popover e interações de checkbox.
  - [x] Subtask 3.2: Verificar acessibilidade com atributos `role="dialog"`, `aria-expanded`, `aria-haspopup`, `aria-modal`.

- [x] Task 4: Validação Integrada, Tipos e Linters (AC: 5)
  - [x] Subtask 4.1: Executar `pnpm --filter web test` e verificar aprovação dos testes.
  - [x] Subtask 4.2: Executar `pnpm build` e checagem estática de tipos (`tsc --noEmit`).
  - [x] Subtask 4.3: Executar `make check` e `make test`.

### Review Findings

- [x] [Review][Patch] Itens da lista de entidades sem atributos semânticos WAI-ARIA (role="checkbox" e aria-checked) [apps/web/components/entidade-select-compact.tsx:176]
- [x] [Review][Patch] Duplicação e redundância de props em SidebarProps (mobileHeaderSlot vs mobileHeaderRightSlot) [packages/ui/src/components/sidebar.tsx:73]
- [x] [Review][Patch] Ausência do resumo de escopo atual no cabeçalho do popover [apps/web/components/entidade-select-compact.tsx:156]
- [x] [Review][Patch] Evento Escape não interrompe propagação (stopPropagation), arriscando fechar contêineres pais [apps/web/components/entidade-select-compact.tsx:42]
- [x] [Review][Patch] Resolução de isAllSelected e toggle de opções vulnerável a IDs órfãos da URL e lista unitária [apps/web/components/entidade-select-compact.tsx:26]
- [x] [Review][Patch] Uso de cores arbitrárias border-gray-400 em vez do design token border-borderLine [apps/web/components/entidade-select-compact.tsx:114]
- [x] [Review][Patch] Ausência de teste de renderização do slot de cabeçalho móvel na Sidebar [packages/ui/src/components/sidebar.spec.tsx:1]

---

## Dev Notes

### Padrões Arquiteturais e Guardrails Mandatórios

- **Simetria de Estilo com `YearSelect` (variant="compact"):**
  Em `packages/ui/src/components/sidebar.tsx`:
  ```tsx
  <div className="relative max-w-16 border-b *:border-borderLine">
    <select ... />
    <ChevronDown strokeWidth={1.6} className="pointer-events-none absolute top-1/2 right-2 h-3 w-3 -translate-y-1/2 text-mutedText" />
  </div>
  ```
  O gatilho de entidades deve seguir exatamente as mesmas proporções de padding, tipografia (`text-xs font-medium text-ink`) e cor de borda.

- **Conexão com `useQueryState`:**
  O estado de entidades já é gerenciado em `apps/web/app/components/sidebar-wrapper.tsx`:
  ```tsx
  const [entidadesParam, setEntidadesParam] = useQueryState(
    "entidades",
    parseAsString.withOptions({ shallow: false }),
  );
  ```
  Nenhuma alteração de infraestrutura de URL é necessária; apenas consumir o callback `onEntidadesChange`.

- **Regra 13 de `AGENTS.md` (Zero Ternários Aninhados):**
  Para definir o rótulo do botão:
  ```tsx
  const triggerLabel = (() => {
    if (!selectedEntidades || selectedEntidades.length === 0 || selectedEntidades.length === entidades.length) {
      return "Consolidado";
    }
    if (selectedEntidades.length === 1) {
      const found = entidades.find((e) => e.id === selectedEntidades[0]);
      return found?.label ?? "1 entidade";
    }
    return `${selectedEntidades.length} entidades`;
  })();
  ```

---

## Verification Plan

### Automated Tests
1. `pnpm --filter web test apps/web/components/entidade-select-compact.spec.tsx`
2. `pnpm build`
3. `make check`
4. `make test`

### Manual Verification
1. Abrir a aplicação em modo responsivo mobile (< 768px).
2. Verificar se o header superior exibe o ano na esquerda e `Consolidado ▾` na direita com simetria visual.
3. Tocar em `Consolidado ▾` e conferir a abertura suave do popover com as entidades da base.
4. Marcar uma entidade específica: o gatilho deve atualizar para o nome da entidade (ou "1 entidade") e os dados da página devem recarregar filtrados.
5. Pressionar `Escape` ou tocar fora: o popover deve fechar imediatamente sem falhas.

---

## Dev Agent Record

### Agent Model Used

Gemini 3.8 Flash (Medium)

### Debug Log References

- Criados testes unitários TDD em `apps/web/components/entidade-select-compact.spec.tsx` cobrindo gatilho, estados consolidado e filtrado, contagem, abertura do popover, tecla `Escape`, toque fora `pointerdown` e callbacks `onChange`.
- Verificada falha inicial dos testes (Red Phase).
- Implementado componente `EntidadeSelectCompact` em `apps/web/components/entidade-select-compact.tsx` (Green Phase) respeitando a separação de responsabilidades (não poluir `packages/ui` com lógica específica de domínio municipal).
- Executados testes via `pnpm --filter web test components/entidade-select-compact.spec.tsx`: 8 testes passando com sucesso.
- Executadas checagens de tipos e lint via `pnpm --filter @transparencia/ui build`, `pnpm --filter web exec tsc --noEmit` e `pnpm biome check --write`.

### Completion Notes List

- **Task 1 Concluída:**
  - Componente `EntidadeSelectCompact` implementado em `apps/web/components/entidade-select-compact.tsx`.
  - Layout do gatilho espelha visualmente o `YearSelect (variant="compact")`.
  - Tratamento de textos inteligente ("Consolidado", nome da entidade via `toTitleCase`, ou `${n} entidades`) sem ternários aninhados (Regra 13).
  - Popover compacto com cabeçalho, botão "Todas (Consolidado)", lista de checkboxes e suporte a acessibilidade (`role="dialog"`, `aria-modal="true"`, `aria-haspopup="dialog"`, `aria-expanded`).
  - Fechamento imediato com tecla `Escape` e clique/toque fora via `pointerdown`.

- **Task 2 Concluída e Refinada com Feedback Visual do Usuário:**
  - Adicionado slot `mobileHeaderSlot?: React.ReactNode` em `packages/ui/src/components/sidebar.tsx` posicionado ao lado do seletor de ano (`[2026 ▾] [Consolidado ▾]`) na linha de subtítulo, liberando a largura total do título do portal para não ser precocemente truncado.
  - Padronizada a borda inferior de ambos os componentes para a mesma classe e cor: `border-gray-400 border-b transition-colors hover:border-gray-600 focus-within:border-[#1d64d8]`.
  - Corrigida a área de ativação do `YearSelect (variant="compact")`: o elemento `<select>` agora possui `w-full min-w-[50px] pr-4 pl-0 cursor-pointer`, preenchendo 100% da área do componente e permitindo ativação em qualquer parte (texto do ano, chevron ou espaço intermediário).
  - Popover de `EntidadeSelectCompact` ancorado à esquerda (`-left-16 sm:-left-20`) com `max-w-[calc(100vw-2.5rem)]`, abrindo perfeitamente alinhado abaixo do gatilho e sem causar scroll horizontal.
  - Validação de tipos estáticos (`tsc --noEmit`) em `@transparencia/ui` e `apps/web`.

- **Task 3 Concluída:**
  - Suíte de testes em `apps/web/components/entidade-select-compact.spec.tsx` expandida para 10 testes unitários e de integração cobrindo estados padrão, filtrado, contagem múltipla, alternância de checkboxes, deseleção, estado desativado, WAI-ARIA (`role="dialog"`, `aria-modal="true"`, `aria-haspopup="dialog"`, `aria-expanded`), tecla `Escape` e clique externo.

- **Task 4 Concluída:**
  - `pnpm --filter web test`: 43 suítes, 234 testes passando com 100% de sucesso.
  - `pnpm build` (turbo build): 3 pacotes compilados com sucesso e páginas estáticas geradas.
  - `make check`: `ruff`, `ruff-format` e `mypy` 100% aprovados.
  - `make test`: 83 testes de integração em Python/dbt aprovados.
  - `sprint-status.yaml` atualizado para `review`.

### File List

- `packages/ui/src/components/sidebar.tsx`
- `apps/web/app/components/sidebar-wrapper.tsx`
- `apps/web/components/entidade-select-compact.tsx`
- `apps/web/components/entidade-select-compact.spec.tsx`
- `_bmad-output/implementation-artifacts/8-5-seletor-compacto-de-perimetro-institucional-no-header-movel.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

