---
title: 'Mínimos constitucionais de educação (MDE e Fundeb)'
type: 'feature'
created: '2026-11-01'
status: done
review_loop_iteration: 0
followup_review_recommended: false
context: ['{project-root}/DESIGN.md', '{project-root}/EXPERIENCE.md']
warnings: []
deferred:
  - summary: >-
      Anos de 2020 e 2021 podem ter regra de transição (EC 119/2022) para o mínimo de MDE; a tela mostra "abaixo" sem ressalva.
    evidence: |-
      Apontado pelo Blind Hunter; não verificado. Basta o jurista-fiscal confirmar o alcance da EC 119/2022 (art. 119 do ADCT).
    location: >-
      apps/web/components/educacao/educacao-minimos-legais-section.tsx
    severity: medium (unverified)
baseline_revision: 68f86d56ac62d100737b28be40f6e7c41979996b
---

<intent-contract>

## Intent

**Problem:** a página `/[portalSlug]/educacao` não responde "A Prefeitura aplica o mínimo exigido em educação?"; o SIOPE 1.1 e 1.2 existem em `getEducacaoSiope`, sem mínimo legal nem tela.

**Approach:** `getEducacaoSiope` compara os percentuais com o mínimo vigente do seed (`minimos`); view-model repassa; `EducacaoMinimosLegaisSection` mostra o MDE abaixo do valor por aluno.

## Boundaries & Constraints

**Always:** mínimo vindo de `seed_constantes_fiscais` (nunca literal); veredito com texto e ícone; "indício", nunca "irregularidade"; lei com link oficial; ano em andamento "parcial" sem veredito; mínimo é de aplicação, não de repasse; dado declarado pela Prefeitura.

**Never:** exibir o Fundeb (1.2) sem o mínimo legal vigente (a conferência do CRC do indicador 1.2 foi confirmada em 2026-11-01, então o Fundeb é exibido); usar os 60% do rótulo do SIOPE como piso atual; cálculo na tela; reposicionar na faixa da Story 24.11.

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
- Given Fundeb (conferência do CRC já confirmada), then aparece com o mínimo legal vigente.

## Spec Change Log

## Review Triage Log

### 2026-11-01 — Review pass
- verdicts: 24 findings — high 0, medium 3, low 5, false 0, maybe-false 1 (demais rejeitados por hipotéticos ou fora da intenção)
- findings:
  - `[medium]` `patch` arredondamento exibia 25,0% com "abaixo" — corrigido usando `fmtPercent` (2 casas) do design system
  - `[medium]` `patch` limite 25% sem base de cálculo na tela — texto agora diz "da receita de impostos e transferências"
  - `[medium]` `patch` faltavam testes do limite exato (25 → cumpriu) e da causa "não informou ao FNDE" — adicionados
  - `[maybe-false]` `defer` EC 119/2022 em 2020–2021 — registrado em `deferred`
  - `[low]` `reject` mínimo sem linha no seed, parcial sem período, seed sobreposto sem orderBy, lei sem URL — hipotéticos (seed cobre 2000–2099; período sempre numérico)
  - `[low]` `reject` Fundeb calculado mas oculto, DTO vazio duplicado, nome `fmtPercentual`, linguagem técnica, comparação com ano anterior, mínimo municipal próprio, CHANGELOG/llms — intenção prevê Fundeb oculto; resto fora do escopo

## Verification

- `pnpm typecheck`, vitest do web e do db (banco de teste 5545) -- passam.


## Auto Run Result

Status: done

- Implementação já estava commitada (`1421a2d5`, `8afa1364`, `fc53c264`, `800c5464`); esta retomada só reverificou, sem alterar código.
- Mínimo de MDE (25%) vem do seed, com veredito em texto e ícone, ano parcial sem veredito e lei com link; Fundeb exibido (conferência do CRC confirmada).
- Verificação: `pnpm typecheck` ok; vitest web (136 em `educacao`) e db no banco de teste 5545 (357) passam. Sem `DATABASE_URL` apontando para o 5545, o db usa o 5544 e 4 testes de mínimos falham por falta do seed — é ambiente, não código.
- Pendente (deferido): confirmar com o jurista-fiscal o alcance da EC 119/2022 para 2020–2021.
- Nenhuma ação de operador humano é devida.
