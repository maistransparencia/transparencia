---
title: 'Storybook, Fase 1'
type: feature
created: '2026-10-30'
status: done
baseline_revision: '563d47535f6045aa4b57b5c7bff18dccecfa080f'
review_loop_iteration: 0
followup_review_recommended: false
context: ['{project-root}/DESIGN.md']
warnings: []
operator_actions:
  - Abrir `pnpm --filter storybook dev`, conferir a story Fundamentos/Valor estatístico (stat-value-lg com espaço comum e com U+00A0) nos temas claro e escuro, e registrar na Story 20.14 se mantém a serifa ou passa para font-sans.
deferred: []
---

<intent-contract>

## Intent

**Problem:** Não há onde comparar lado a lado títulos, painéis de indicador e tabelas nos dois temas e em larguras mobile e desktop; a decisão em aberto da Story 20.14 (`stat-value-lg` em serifa, `tabular-nums` e espaçamento de "R$") depende disso.

**Approach:** Novo pacote `apps/storybook` (`@storybook/react-vite` + `@tailwindcss/vite`, versões exatas) que importa o `globals.css` de `apps/web`, com stories dos elementos base, papéis, `panel`, `indicator`, `table` e `expandable-row`, alternador claro/escuro (classe `.dark`) e viewports mobile e desktop.

## Boundaries & Constraints

**Always:** reaproveitar o `globals.css` do app sem estilos próprios para elementos base; elementos nus primeiro, papéis pelo nome (DESIGN.md); versões exatas (regra 7); nomes explícitos (regra 9); `pnpm typecheck`, `pnpm test` e `biome` passam; build do Storybook local.

**Never:** alterar componentes de `apps/web`; publicar ou fazer deploy; stories dos demais componentes de `packages/ui`; teste visual automatizado; literais de município, UF ou ano nos exemplos (regra 23).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Tema | alternador em escuro | `.dark` aplicada ao contêiner da story | — |
| Largura | viewport mobile / desktop | story renderiza na largura escolhida | — |
| Guarda | `preview.css` com seletor de elemento base | teste falha | — |
| Valor | `stat-value-lg` com "R$ 1.234.567,89" | registrado o resultado de `tabular-nums` e do espaço de "R$" | — |

</intent-contract>

## Code Map

- `apps/web/app/globals.css` -- fonte única de tokens, `@utility` de papéis (`numeric`, `stat-value*`, `panel*`), `.dark` na linha 56, variáveis `--panel-*` em `:root`; as fontes vêm de `--font-ibm-plex*`/`--font-source-serif` (no app, `next/font`).
- `DESIGN.md` (linhas 306-372) -- contrato de `panel`, `indicator`, `table`, `expandable-row` e papéis.
- `apps/web/vitest.config.ts`, `packages/ui/package.json` -- modelo de scripts/versões; `packages/ui/src/arquitetura.spec.ts` não existe no branch atual (modelo: `tokens.spec.ts`, usa `node:fs`).
- `pnpm-workspace.yaml` -- `apps/*` já cobre o novo pacote.

## Tasks & Acceptance

**Execution:**
- `apps/storybook/package.json` -- pacote `storybook` (scripts `dev`, `build`, `typecheck`, `test`) com `storybook`, `@storybook/react-vite`, `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `tailwindcss`, `react`, `react-dom`, `vitest`, tipos; tudo exato.
- `apps/storybook/.storybook/main.ts` -- `framework: @storybook/react-vite`, stories em `src/**/*.stories.tsx`, `viteFinal` com `@tailwindcss/vite`.
- `apps/storybook/.storybook/preview.ts` e `preview-head.html` -- importa `globals.css` do app; decorator de tema aplica `.dark`; viewports mobile e desktop; fontes via Google Fonts mapeadas às variáveis `--font-*`.
- `apps/storybook/src/*.stories.tsx` -- elementos-base-e-titulos, papeis, panel (3 formatos × 4 tons), indicator (3 tamanhos), table (numeric + tfoot), expandable-row (aberto/fechado) e `stat-value-lg` com "R$" como primeiro caso.
- `apps/storybook/src/guarda-estilos.spec.ts` -- falha se `.storybook/` ou `src/` tiver CSS próprio com seletor de elemento base, ou se o preview não importar o `globals.css` do app.
- `apps/storybook/tsconfig.json`, `.gitignore`, `README` curto -- tipagem, `storybook-static` ignorado, resultado do caso `stat-value-lg` registrado no spec.
- `pnpm-lock.yaml` -- `pnpm install`.

**Acceptance Criteria:**
- Given `apps/storybook`, when `pnpm --filter storybook dev` roda, then as stories mostram os elementos base e escala de títulos, papéis, `panel` nos três formatos e quatro tons, `indicator` nos três tamanhos, `table` com `numeric` e totais e `expandable-row` aberto e fechado.
- Given a barra do Storybook, then há alternador claro/escuro e viewports mobile e desktop.
- Given o primeiro caso, then o resultado de `tabular-nums` e do espaçamento de "R$" em `stat-value-lg` fica registrado e fecha a decisão da 20.14.
- Given o `globals.css`, then o Storybook o importa e um teste impede estilos próprios para elementos base.
- Given a story pronta, when `pnpm typecheck`, `pnpm test` e `biome` rodam, then passam, sem alterar `apps/web`.

## Spec Change Log

## Review Triage Log

### 2026-10-30 — Review pass
- verdicts: 32 findings — high 0, medium 3, low 8, false 4, maybe-false 0 (demais duplicados agrupados)
- findings:
  - `[medium]` `patch` variante U+00A0 da story era idêntica ao caso com espaço comum (Blind, Edge, Verification) — corrigido com `\u00a0` explícito, legendas e asserção no spec
  - `[medium]` `patch` guarda sem amostras positivas e regex só casava `tag {` (Blind, Edge, Verification, Intent) — regex ampliada e teste com seletores ofensores
  - `[medium]` `patch` recorte de `stat-value-lg` frágil com `indexOf` = -1 (Blind, Verification) — asserções de presença e fim do bloco
  - `[low]` `patch` identificadores em português na infraestrutura das stories (Blind; regra 26) — renomeados para inglês
  - `[low]` `patch` `@vitejs/plugin-react` não usado (Blind, Edge) — removido, build segue passando
  - `[low]` `reject` viewport inicial, `.dark` no contêiner e não no `html` (Edge, Intent) — variáveis estão em `.dark`, que funciona no contêiner; viewport escolhido na barra
  - `[low]` `reject` fontes via Google Fonts, sem fallback offline (Blind, Edge) — fase 1 local; fallback genérico das variáveis basta
  - `[low]` `reject` turbo outputs, CI, play functions, a11y addon, componentes reais de `packages/ui` (Blind, Verification) — fora do escopo (sem teste visual automatizado; stories dos demais componentes ficam para depois)
  - `[low]` `reject` guarda não cobre `style` inline, JS injetando estilo, `@apply` (Edge, Verification, Intent) — a guarda cobre o AC (sem CSS próprio para elementos base); o resto é custo sem risco concreto
  - `[false]` `reject` `__dirname` indefinido em ESM (Blind, Edge) — vitest fornece; testes passam
  - `[false]` `reject` total da tabela não computado (Blind) — dado de exemplo, soma confere
  - `[false]` `reject` teste "registra o resultado" sem registrar o espaço de "R$" (Edge, Verification, Intent) — procedente quanto à limitação; é a ação humana listada em `operator_actions`
  - `[false]` `reject` ausência de lockfile no diff (Intent) — diff exclui `pnpm-lock.yaml` de propósito

## Verification

**Commands:**
- `pnpm typecheck` -- expected: sem erros
- `pnpm test` -- expected: todos passam
- `pnpm exec biome check apps/storybook` -- expected: sem erros
- `pnpm --filter storybook build` -- expected: gera `storybook-static`
- `git diff --stat -- apps/web` -- expected: vazio

## Auto Run Result

Status: awaiting-operator

- Resumo: novo `apps/storybook` (Storybook 10.6.5, `@storybook/react-vite`, `@tailwindcss/vite`, versões exatas) importando o `globals.css` do app; stories de elementos base e títulos, papéis, `panel` (3 formatos × 4 tons), `indicator` (3 tamanhos), `table` (numeric e totais), `expandable-row` (aberto e fechado) e `stat-value-lg` com "R$"; alternador claro/escuro (`.dark`) e viewports mobile (375px) e desktop (1280px).
- Arquivos: `apps/storybook/**` (novo), `pnpm-lock.yaml`. `apps/web` intocado.
- Revisão: 5 patches aplicados (3 medium, 2 low), 0 deferidos, demais rejeitados (ver Review Triage Log).
- Follow-up recomendado: false.
- Verificação: `pnpm typecheck`, `pnpm test` (storybook 6 testes), `biome check apps/storybook` e `pnpm --filter storybook build` passam; `git diff -- apps/web` vazio.
- Decisão da 20.14 (conferida pelo Julio no navegador): espaço comum e U+00A0 ficam idênticos e `tabular-nums` iguala as larguras; mantém serifa e `tabular-nums`.
- Riscos residuais: guarda de estilos é textual (CSS e `<style>`); fontes dependem do Google Fonts.

## Operator Confirmation

Confirmed 2026-10-30: the external actions this story owed were carried out.

- Abrir `pnpm --filter storybook dev`, conferir a story Fundamentos/Valor estatístico (stat-value-lg com espaço comum e com U+00A0) nos temas claro e escuro, e registrar na Story 20.14 se mantém a serifa ou passa para font-sans.

_Appended by the bmad-loop orchestrator (`bmad-loop confirm`, #335): a human confirmed these external actions out of band, and the story was advanced from `awaiting-operator` to `done`._
