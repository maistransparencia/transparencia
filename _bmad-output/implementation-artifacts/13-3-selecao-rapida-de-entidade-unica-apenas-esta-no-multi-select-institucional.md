---
title: 'Story 13.3: Seleção Rápida de Entidade Única ("Apenas Esta") no Multi-Select Institucional'
type: 'feature'
created: '2026-09-22'
status: 'done'
baseline_revision: '3f7109d94e3933abc7868817b74454c73da81881'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Cidadãos, pesquisadores e auditores municipais que desejam analisar uma única entidade governamental no seletor institucional (`MultiSelect`) precisam desmarcar manualmente todas as outras opções uma a uma para isolar a entidade desejada, gerando fricção desnecessária na navegação.

**Approach:** Segregar cada linha de opção do dropdown de entidades em duas zonas interativas acessíveis e independentes (sem elementos `<button>` aninhados): um botão dedicado ao quadradinho do checkbox (para alternância multi-seleção tradicional) e um botão dedicado ao texto do rótulo da entidade (que executa a seleção exclusiva imediata daquela entidade, `onChange([opt.id])`), exibindo no desktop um indicador sutil à direita com o texto *"apenas"* ao passar o mouse (hover) sobre a linha.

## Boundaries & Constraints

**Always:**
- Segregar as duas áreas interativas como elementos `<button>` irmãos dentro de um container flexível com `role="group"`, evitando estritamente a aninhamento de `<button>` dentro de `<button>` no DOM para conformidade com a especificação W3C HTML e prevenção de falhas de hidratação no React.
- Garantir acessibilidade via teclado para ambas as zonas (`Tab`, `Space`, `Enter`), provendo atributos ARIA explícitos (`role="checkbox"` com `aria-checked` e `aria-label` descritivo no botão do checkbox; `aria-label="Selecionar apenas {entidade}"` no botão do texto).
- Preservar o comportamento canônico da opção "Todas as entidades", que continua resetando a seleção para o conjunto completo (`onChange([])`).
- Exibir no desktop o indicador textual sutil *"apenas"* na extremidade direita da linha durante o hover (`group-hover:opacity-100 hidden sm:inline`), orientando o usuário sobre a ação rápida sem poluir telas móveis.
- Respeitar todas as diretrizes do `AGENTS.md`: componentes burros em `packages/ui` (Regra 2), sem ternários aninhados (Regra 13), DTOs e variáveis em `camelCase` (Regra 18).

**Never:**
- Nunca aninhar elementos interativos `<button>` ou `<input>` dentro de outro `<button>`.
- Nunca quebrar a compatibilidade de props do componente `MultiSelect` (`options`, `selectedIds`, `onChange`, `labelAll`, `className`, `disabled`).
- Nunca remover o suporte a toque confortável em dispositivos móveis (`min-h-[44px] sm:min-h-0`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Clique no Checkbox (Adicionar) | `selectedIds = ['1']`, clique no checkbox de `'2'` | Dispara `onChange(['1', '2'])` | Sem erro |
| Clique no Checkbox (Remover) | `selectedIds = ['1', '2']`, clique no checkbox de `'1'` | Dispara `onChange(['2'])` | Sem erro |
| Clique no Checkbox (Todas Selecionadas) | `selectedIds = ['1']`, clique no checkbox de `'2'` (total de 2 opções) | Dispara `onChange([])` (consolidado) | Sem erro |
| Clique no Checkbox em Estado Consolidado | `selectedIds = []`, clique no checkbox de `'1'` (total de 2 opções: `'1'`, `'2'`) | Dispara `onChange(['2'])` (desmarca `'1'`) | Sem erro |
| Clique no Texto/Label ("Apenas Esta") | `selectedIds = ['1', '2']` ou `[]`, clique no label de `'1'` | Dispara instantaneamente `onChange(['1'])` | Sem erro |
| Clique em "Todas as entidades" | Qualquer estado de `selectedIds` | Dispara `onChange([])` | Sem erro |
| Hover Desktop sobre a Linha | Ponteiro do mouse sobre a linha da entidade | Revela texto *"apenas"* à direita em telas `>= sm` | Sem erro |

</intent-contract>

## Code Map

- `packages/ui/src/components/multi-select.tsx` -- Componente `MultiSelect` reutilizável do design system -- Linhas 142-166 contêm a renderização atual da linha de opção como botão único; substituir por estrutura de duas zonas com botões irmãos (checkbox + label) e indicador *"apenas"* com transição suave no hover.
- `packages/ui/src/components/__tests__/multi-select.spec.tsx` -- Nova suíte de testes unitários para o `MultiSelect` em `packages/ui` -- Cobrir renderização, toggle no checkbox, seleção exclusiva no label, reset em "Todas as entidades", atributos ARIA e suporte a teclado.
- `apps/web/components/entidade-select-compact.tsx` -- Seletor compacto de entidade utilizado no cabeçalho mobile/desktop -- Linhas 193-220 contêm a lista de opções; replicar o mesmo padrão de duas zonas (checkbox vs label "apenas esta") para garantir coerência universal de UX em toda a aplicação.
- `apps/web/components/entidade-select-compact.spec.tsx` -- Suíte de testes existente do seletor compacto -- Adicionar asserções para o clique exclusivo no label de texto da entidade.

## Tasks & Acceptance

**Execution:**
- `packages/ui/src/components/multi-select.tsx` -- Refatorar cada linha de opção em container flex com botões irmãos independentes para checkbox e label, adicionando indicador desktop *"apenas"* no hover -- Permitir seleção rápida de entidade única mantendo o toggle múltiplo no checkbox sem botões aninhados no DOM.
- `packages/ui/src/components/__tests__/multi-select.spec.tsx` -- Implementar suíte de testes unitários com Vitest e Testing Library para `MultiSelect` -- Garantir cobertura completa dos cenários da matriz de I/O, segregação de cliques e conformidade ARIA.
- `apps/web/components/entidade-select-compact.tsx` -- Atualizar a renderização das opções em `EntidadeSelectCompact` com segregação de checkbox e label ("apenas esta") -- Prover paridade de experiência de seleção rápida no seletor compacto do cabeçalho.
- `apps/web/components/entidade-select-compact.spec.tsx` -- Atualizar os testes unitários de `EntidadeSelectCompact` cobrindo o clique exclusivo no texto da entidade -- Validar a paridade funcional no cabeçalho da web app.

**Acceptance Criteria:**
- Given o componente reutilizável `MultiSelect` em `packages/ui` utilizado na Sidebar e telas da plataforma, when o usuário abre o dropdown de opções, then cada linha de entidade é segregada em duas zonas de interação acessíveis (sem elementos `<button>` aninhados): o quadradinho do checkbox executa a alternância multi-seleção tradicional (`handleToggleOption`), enquanto o texto do rótulo da entidade executa a seleção exclusiva imediata daquela entidade (`onChange([opt.id])`).
- Given a visualização desktop (telas `>= sm`), when o usuário passa o mouse sobre a linha da entidade (hover), then exibe um indicador sutil à direita com o texto *"apenas"* para sinalizar visualmente a ação de seleção única.
- Given qualquer estado de seleção, when o usuário clica na opção "Todas as entidades", then a seleção é resetada para o conjunto consolidado completo (`onChange([])`).
- Given a execução dos testes automatizados, when executado `pnpm --filter @transparencia/ui test` e `pnpm --filter web test`, then todos os testes passam com 100% de sucesso.

## Spec Change Log

## Review Triage Log

### 2026-09-22 — Review pass
- verdicts: 8 findings — high 0, medium 1, low 4, false 3, maybe-false 0
- findings:
  - `[medium]` `[patch]` Ausência de anel de foco visível (`focus-visible`) nos botões de checkbox e label (`packages/ui/src/components/multi-select.tsx` e `apps/web/components/entidade-select-compact.tsx`) — Action taken: Adicionadas classes `focus-visible:ring-1 focus-visible:ring-[#1d64d8] rounded-sm` em ambos os botões irmãos em ambos os componentes, em conformidade com WCAG 2.4.7.
  - `[false]` `[reject]` Risco de seleção acidental e inversão do modelo mental tradicional de multi-seleção — Rejection reason: O comportamento de seleção exclusiva com um clique no rótulo da entidade ("Apenas esta") mantendo a alternância múltipla na checkbox é o requisito central explícito dos Critérios de Aceitação da Story 13.3.
  - `[low]` `[patch]` Tamanho de alvo de toque reduzido no botão de checkbox no mobile — Action taken: Ampliado o padding e área de toque do checkbox para dispositivos móveis (`p-2 sm:p-1 min-h-[40px] sm:min-h-0`), prevenindo toques acidentais no label em telas sensíveis ao toque.
  - `[false]` `[reject]` Divergência no fechamento do dropdown entre `handleToggleAll` e `handleSelectOnly` em `entidade-select-compact.tsx` — Rejection reason: Manter o dropdown/popover aberto ao selecionar uma entidade é o padrão esperado de seletores múltiplos para permitir conferência visual pelo usuário, exatamente como ocorre em `handleToggleOption`.
  - `[low]` `[reject]` Ausência de guarda para lista com entidade única em `handleSelectOnly` — Rejection reason: Quando há apenas uma entidade cadastrada, a ação de seleção exclusiva é redundante mas inócua (`onChange([id])` preserva a entidade selecionada); rejeitado conforme diretriz para evitar complexidade desnecessária.
  - `[false]` `[reject]` Duplicação de lógica entre `packages/ui` e `apps/web` — Rejection reason: `EntidadeSelectCompact` é um popover especializado criado previamente no Epic 8 (Story 8.5) para o cabeçalho móvel; unificação de componentes está fora do escopo da Story 13.3.
  - `[low]` `[patch]` Ausência de fechamento do dropdown via teclado com tecla `Escape` em `packages/ui/src/components/multi-select.tsx` — Action taken: Adicionado manipulador de evento `keydown` no `useEffect` fechando o dropdown ao pressionar `Escape`.
  - `[low]` `[patch]` Cobertura de testes incompleta para interações de teclado (`Escape`) e classes de acessibilidade — Action taken: Adicionados testes unitários cobrindo o fechamento por `Escape` e asserções para anéis de foco visível (`focus-visible`).

## Design Notes

A segregação semântica de cada opção no dropdown é implementada através de um container neutro `<div className="group flex min-h-[44px] w-full items-center justify-between rounded-sm px-2 text-ink hover:bg-gray-100/80 sm:min-h-0 sm:py-1">` contendo dois botões irmãos:
1. Checkbox Button: `<button type="button" role="checkbox" aria-checked={isChecked} aria-label={`Alternar seleção de ${toTitleCase(opt.nome)}`} onClick={() => handleToggleOption(opt.id)} className="flex shrink-0 items-center justify-center p-1 ...">`
2. Label Button: `<button type="button" onClick={() => handleSelectOnly(opt.id)} aria-label={`Selecionar apenas ${toTitleCase(opt.nome)}`} className="flex flex-1 min-w-0 items-center justify-between py-1.5 pl-1.5 pr-1 text-left text-xs cursor-pointer ...">`
Dentro do Label Button, o span do texto da entidade ocupa a largura disponível e o indicador `<span className="hidden ml-2 shrink-0 text-[10px] font-medium text-mutedText transition-opacity opacity-0 group-hover:opacity-100 group-hover:text-[#1d64d8] sm:inline">apenas</span>` torna-se visível no hover desktop.

## Verification

**Commands:**
- `pnpm --filter @transparencia/ui test` -- expected: Testes unitários de `MultiSelect` e demais componentes do pacote UI passam sem erros.
- `pnpm --filter web test` -- expected: Testes unitários do `EntidadeSelectCompact` e da aplicação web passam sem erros.
- `pnpm lint` -- expected: Validação de estilo e tipos com Biome sem violações (especialmente regras de acessibilidade de botões).
- `pnpm build` -- expected: Compilação dos pacotes TypeScript sem erros de tipagem.

## Auto Run Result

### Summary of implemented change
Implementação da Story 13.3 provendo seleção rápida de entidade pública única ("Apenas Esta") com um clique no rótulo de texto em componentes de multi-seleção (`MultiSelect` em `packages/ui` e `EntidadeSelectCompact` em `apps/web`), preservando a alternância cumulativa tradicional na caixa de checkbox. A estrutura HTML divide cada linha em dois botões irmãos independentes dentro de container neutro com `role="group"`, eliminando qualquer aninhamento de `<button>` no DOM em estrita conformidade com os padrões W3C e WCAG. No desktop, é exibido um indicador textual sutil *"apenas"* à direita durante o hover. Suporte a acessibilidade completo com foco visível (`focus-visible`), fechamento via tecla `Escape`, e áreas de toque confortáveis no mobile.

### Files changed with one-line descriptions
- `packages/ui/src/components/multi-select.tsx`: Segregação de opções em botões irmãos acessíveis (checkbox toggle vs seleção exclusiva), indicador desktop hover *"apenas"*, anéis de foco visível, touch target de 40px no mobile e fechamento por `Escape`.
- `packages/ui/src/components/__tests__/multi-select.spec.tsx`: Nova suíte de testes unitários com Vitest e Testing Library com 14 testes cobrindo todos os cenários da matriz de I/O, segregação de cliques, tecla Escape e conformidade ARIA.
- `apps/web/components/entidade-select-compact.tsx`: Paridade de comportamento no seletor compacto do cabeçalho com botões irmãos independentes, indicador *"apenas"*, foco visível e touch target mobile adequado.
- `apps/web/components/entidade-select-compact.spec.tsx`: Testes unitários expandidos (18 testes) cobrindo seleção exclusiva por clique no texto, segregação semântica em `role="group"` e anéis de foco.

### Review findings breakdown
- Patches applied: 4 correções aplicadas (anéis de foco visível `focus-visible`, ampliação de área de toque no mobile para 40px, fechamento por tecla `Escape` no `MultiSelect`, e testes unitários de acessibilidade e teclado).
- Items deferred: 0.
- Rejected findings: 4 rejeitados (com justificativas técnicas registradas no log de triagem: requisito central da história, padrão UX de manter dropdown aberto, ausência de benefício em guarda defensiva redundante, e código preexistente fora de escopo).

### Follow-up review recommendation: false
Pached counts by verdict: high 0, medium 1, low 3. Nenhuma correção de severidade alta e menos de dois patches médios; todas as correções foram verificadas com testes automatizados e compilação limpa, sem riscos residuais.

### Verification performed
- `pnpm --filter @transparencia/ui test`: 6 arquivos de teste, 37 testes passando (100%).
- `pnpm --filter web test`: 70 arquivos de teste, 500 testes passando (100%).
- `pnpm lint`: 308 arquivos verificados pelo Biome com 0 erros.
- `pnpm turbo build`: Compilação de produção TypeScript e Turbopack concluída com sucesso em todos os 3 pacotes.

### Residual risks
Nenhum risco residual identificado.
