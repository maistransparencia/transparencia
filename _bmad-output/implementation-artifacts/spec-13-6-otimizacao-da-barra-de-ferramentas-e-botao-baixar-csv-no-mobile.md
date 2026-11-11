---
title: 'Story 13.6: Otimização da Barra de Ferramentas e Botão "Baixar CSV" no Mobile'
type: 'feature'
created: '2026-09-22'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
baseline_revision: '79ffed211c13f7e5b558a50212d9310f18a04e0d'
context: []
warnings: []
deferred:
  - summary: >-
      Três consumers omitem a prop csvButtonLabel silenciosamente, dependendo do valor padrão
    evidence: |-
      licitacoes-em-andamento-section.tsx, contratos-servicos-vigentes-section.tsx e pessoal-regime-section.tsx
      não passam csvButtonLabel e dependem do default "Baixar CSV". Não é uma falha atual mas pode
      propagar inadvertidamente se o default mudar. Nenhum teste no nível do consumer verifica aria-label do CSV.
    location: >-
      apps/web/components/licitacoes-em-andamento-section.tsx, contratos-servicos-vigentes-section.tsx, pessoal-regime-section.tsx
    severity: low
---

<intent-contract>

## Intent

**Problema:** No mobile, a toolbar do `DenseTable` empilha busca e exportação CSV verticalmente (`flex-col`), ocupando altura excessiva e reduzindo a área útil de visualização dos dados.

**Abordagem:** Converter a toolbar para layout em linha única (`flex-row`) no mobile também, e tornar o botão CSV adaptativo — pílula compacta com apenas ícone em telas `< sm` e rótulo completo "Baixar CSV" em `sm` e acima — sem quebrar o comportamento existente.

## Boundaries & Constraints

**Always:**
- Manter acessibilidade: `aria-label` adequado no botão compacto (sem texto visível).
- Manter `min-h-[44px]` no mobile para área de toque adequada do botão CSV.
- Usar apenas classes Tailwind CSS; sem estilos inline ou CSS modules novos.
- O label do botão no desktop continua usando a prop `csvButtonLabel`.
- Ícone `Download` de `lucide-react` já importado no componente.

**Never:**
- Não alterar a lógica de exportação CSV (`handleExportCsv`, `sortedData`, etc.).
- Não remover ou renomear props existentes (`csvButtonLabel`, `enableExportCsv`, etc.).
- Não introduzir nova prop para controlar o comportamento adaptativo — é sempre adaptativo.
- Não tocar no restante do componente (tabela, paginação, cards mobile, etc.).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mobile com busca + CSV | `searchableKeys` definido, `enableExportCsv=true`, viewport `< 640px` | Toolbar em linha única: campo de busca à esquerda, botão pílula `[ 📥 ]` à direita | N/A |
| Desktop com busca + CSV | `searchableKeys` definido, `enableExportCsv=true`, viewport `>= 640px` | Toolbar em linha única: campo de busca à esquerda, botão completo `[ 📥 Baixar CSV ]` à direita | N/A |
| CSV desabilitado | `enableExportCsv=false` | Nenhum botão CSV renderizado; busca ocupa toda a linha | N/A |
| Sem busca, com CSV | `searchableKeys=undefined`, `enableExportCsv=true` | Toolbar mostra apenas botão CSV à direita (busca ausente) | N/A |
| CSV com dados vazios | `sortedData.length === 0` | Botão CSV desabilitado (`disabled`) tanto no mobile quanto desktop | N/A |

</intent-contract>

## Code Map

- `packages/ui/src/components/dense-table.tsx` — Componente `DenseTable` — Linha 318: toolbar `div` com `flex flex-col gap-2 ... sm:flex-row`; Linhas 337–347: botão CSV com `min-h-[44px]` e rótulo fixo. Modificar para toolbar `flex-row` sempre e botão adaptativo.
- `packages/ui/src/components/__tests__/dense-table.spec.tsx` — Testes unitários do `DenseTable` — Adicionar testes cobrindo renderização do botão compacto (sem texto visível) no viewport mobile e botão completo no desktop.

## Tasks & Acceptance

**Execution:**
- `packages/ui/src/components/dense-table.tsx` — Substituir classe `flex flex-col gap-2 border-borderLine border-b bg-gray-50/50 p-3 sm:flex-row sm:items-center sm:justify-between` da toolbar por `flex items-center justify-between gap-2 border-borderLine border-b bg-gray-50/50 p-3` — Garantir linha única em todos os breakpoints.
- `packages/ui/src/components/dense-table.tsx` — Substituir o botão CSV único por dois elementos irmãos: (1) `<button>` com classe `sm:hidden` contendo apenas o ícone `Download` e `aria-label="Baixar CSV"`, com `min-h-[44px]`; (2) `<button>` com classe `hidden sm:inline-flex` contendo ícone + `{csvButtonLabel}` — Botão adaptativo por breakpoint.
- `packages/ui/src/components/__tests__/dense-table.spec.tsx` — Adicionar teste verificando que o botão com `aria-label="Baixar CSV"` está presente (versão mobile) e que o elemento com texto `csvButtonLabel` está presente (versão desktop, hidden por CSS mas renderizado no DOM) — Garantir regressão zero.

**Acceptance Criteria:**
- Given o componente `DenseTable` com `enableExportCsv=true` e `searchableKeys` definido, when renderizado, then a toolbar exibe busca e botão CSV em linha única (`flex-row`) sem quebra vertical em nenhum breakpoint.
- Given viewport mobile (`< sm`), when o botão CSV é inspecionado, then o botão com `aria-label="Baixar CSV"` está presente e visível, sem texto "Baixar CSV" visível; o elemento irmão com o texto do rótulo está presente no DOM mas oculto via `hidden sm:inline-flex`.
- Given viewport desktop (`>= sm`), when o botão CSV é inspecionado, then o botão com rótulo visível "Baixar CSV" (ou `csvButtonLabel` customizado) está visível; o botão compacto (`sm:hidden`) está presente no DOM mas oculto por CSS.
- Given `sortedData.length === 0`, when qualquer botão CSV é renderizado, then ambos os botões (mobile e desktop) têm o atributo `disabled`.
- Given os comandos de validação, when executados `pnpm --filter @transparencia/ui test` e `pnpm lint`, then todos os testes passam e nenhum erro de lint é reportado.

## Spec Change Log

## Review Triage Log

### 2026-09-22 — Review pass
- verdicts: 16 findings — high 0, medium 5, low 3, false 7, maybe-false 0, defer 1
- findings:
  - `[medium]` `[patch]` **B1/E1/E4/VG1/IA1** `aria-label` hardcoded `"Baixar CSV"` em vez de `{csvButtonLabel}` — `dense-table.tsx:343`: literal não reflete prop; corrigido para `aria-label={csvButtonLabel}`. Verificado: com label `"Exportar dados"` o `aria-label` agora segue a prop.
  - `[false]` `[reject]` **B2** Desktop button sem `aria-label` — `<button>` com `<span>text</span>` deriva accessible name do conteúdo textual (spec WAI-ARIA). Nenhuma AT terá problema.
  - `[false]` `[reject]` **B3** Toolbar layout regression (remoção de flex-col) — epic-13-context e spec explicitamente pedem `flex items-center justify-between gap-2`; `flex-1` search + `shrink-0` icon button coexistem corretamente em linha.
  - `[low]` `[reject]` **B4** `mobileBtn` de `.find()` pode ser `undefined` — cosmético; `getAllByRole` já lança se nenhum botão corresponder; fix adicionaria complexidade desnecessária.
  - `[low]` `[reject]` **B5/E3** `getAllByText` usa `length >= 1` em vez de exato — mobile button não tem texto; `>= 1` é efetivamente correto para a estrutura atual.
  - `[medium]` `[patch]` **B6/E2** Sem teste para `csvButtonLabel` customizado — mesmo grupo raiz que B1; corrigido com novo caso `csvButtonLabel="Exportar dados"` em `dense-table.spec.tsx`.
  - `[false]` `[reject]` **B7** Sem teste de click em `handleExportCsv` — fora de escopo do intent e dos ACs da spec.
  - `[false]` `[reject]` **B8** Sem documentação/Storybook — fora de escopo do intent.
  - `[false]` `[reject]` **IA2** Testes não distinguem visibilidade CSS no jsdom — acomodação explícita no spec; não é defeito.
  - `[defer]` **VG2** Três consumers omitem `csvButtonLabel` silenciosamente — pré-existente, não causado por esta story; registrado em `deferred`.

## Auto Run Result

**Story 13.6 — Concluída em 2026-09-22**

**Mudança implementada:** Toolbar do `DenseTable` convertida para linha única em todos os breakpoints (`flex items-center justify-between gap-2`). Botão CSV substituído por dois botões irmãos: versão mobile icon-only (`sm:hidden`, `aria-label={csvButtonLabel}`, touch target `min-h-[44px]`) e versão desktop com ícone + rótulo (`hidden sm:inline-flex`). Acessibilidade e lógica de exportação preservadas.

**Arquivos alterados (2):**
- `packages/ui/src/components/dense-table.tsx` — toolbar flex-col→flex-row; botão CSV único → dois botões adaptativos com `aria-label={csvButtonLabel}` no mobile.
- `packages/ui/src/components/__tests__/dense-table.spec.tsx` — novo describe `"DenseTable - botão CSV adaptativo"` com 4 casos: presença DOM de ambos os botões, disabled quando dados vazios, sem render com `enableExportCsv=false`, e `csvButtonLabel` customizado refletido no `aria-label` mobile.

**Review findings:**
- Patches aplicados (medium): 1 grupo (aria-label hardcoded → prop-driven; teste de custom label adicionado)
- Deferidos: 1 (consumers sem `csvButtonLabel` explícito — pré-existente, low)
- Rejeitados: 10 (7 false + 3 low cosmético)

**Verificação (100% passing):**
- `pnpm --filter @transparencia/ui test`: 41/41 testes, 6 arquivos — 100% aprovados
- `pnpm lint`: 311 arquivos, 0 erros

**Riscos residuais:** Nenhum. O único risco identificado (aria-label hardcoded) foi corrigido e coberto por teste.
