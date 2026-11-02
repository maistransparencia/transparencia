---
title: 'Mínimos constitucionais de educação (MDE e Fundeb)'
type: 'feature'
created: '2026-11-01'
status: 'awaiting-operator'
review_loop_iteration: 0
followup_review_recommended: false
context: ['{project-root}/DESIGN.md', '{project-root}/EXPERIENCE.md']
warnings: []
deferred: []
operator_actions:
  - "Pedir a um contador responsável (CRC) que confira a base de cálculo do indicador 1.2 do SIOPE contra o art. 26 da Lei 14.113/2020 e, estando correta, reexibir o Fundeb em educacao-minimos-legais-section.tsx."
  - "Pedir a revisão jurídica do dispositivo (CF/88 Art. 212 e 212-A XI; Lei 11.494/2007 Art. 22 até 2020) nas linhas novas de seed_constantes_fiscais.csv antes de publicar."
---

<intent-contract>

## Intent

**Problem:** a página `/[portalSlug]/educacao` não responde "A Prefeitura aplica o mínimo exigido em educação?"; o SIOPE 1.1 e 1.2 existem em `getEducacaoSiope`, sem mínimo legal nem tela.

**Approach:** `getEducacaoSiope` compara os percentuais com o mínimo vigente do seed (`minimos`); view-model repassa; `EducacaoMinimosLegaisSection` mostra o MDE abaixo do valor por aluno.

## Boundaries & Constraints

**Always:** mínimo vindo de `seed_constantes_fiscais` (nunca literal); veredito com texto e ícone; "indício", nunca "irregularidade"; lei com link oficial; ano em andamento "parcial" sem veredito; mínimo é de aplicação, não de repasse; dado declarado pela Prefeitura.

**Never:** exibir o Fundeb (1.2) antes da conferência do contador; usar os 60% do rótulo do SIOPE como piso atual; cálculo na tela; reposicionar na faixa da Story 24.11.

</intent-contract>

## Code Map

- `elt/transform/seeds/seed_constantes_fiscais.csv` -- domínio `educacao`: MDE 25%; Fundeb 60% (2007-2020) e 70% (2021+).
- `packages/db/src/queries/educacao-siope-metrics.ts` -- `minimos` (`classificarMinimos`).
- `apps/web/app/[portalSlug]/educacao/view-model.ts` -- `buildMinimosLegais`.
- `apps/web/components/educacao/educacao-minimos-legais-section.tsx` -- seção (só MDE).
- `page.tsx`, `llms.txt`, `llms-full.txt`, `CHANGELOG.md`.

## Tasks & Acceptance

**Execution:** seed, query, view-model, componente, página, specs, docs (feito).

**Acceptance Criteria:**
- Given ano encerrado com 1.1, when abre a página, then percentual ao lado de 25%, "Cumpriu"/"Ficou abaixo" com ícone e lei com link.
- Given ano em andamento, then "parcial" sem veredito. Given sem dado, then "—" com a causa.
- Given Fundeb, then não aparece até a conferência.

## Spec Change Log

## Review Triage Log

## Verification

- `pnpm typecheck`, vitest do web e do db (banco de teste 5545) -- passam.

## Auto Run Result

Status: awaiting-operator

- Parecer do `contador-publico`: MDE OK; Fundeb 1.2 NÃO VERIFICÁVEL (denominador do SIOPE vs. art. 26), por isso oculto.
- Pendências humanas em `operator_actions`. `editor-cidadao` e revisão multi-lente não executados.
