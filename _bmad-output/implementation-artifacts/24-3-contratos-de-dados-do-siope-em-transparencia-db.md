---
title: 'Contratos de dados do SIOPE em @transparencia/db'
type: 'feature'
created: '2026-11-01'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** o mart `fct_educacao_siope_metricas` (Stories 24.2, 24.9, 24.10) não tem leitura tipada; as Stories 24.4 e 24.5 precisariam consultar a tabela direto da página.

**Approach:** `getEducacaoSiope({ portalSlug, ano })` em `@transparencia/db` devolve DTOs `camelCase` do ano pedido (valor, ano, período, situação) e a série anual do portal. Só mapeia colunas; nenhum cálculo contábil.

## Boundaries & Constraints

**Always:** filtrar por `portal_slug`; valor ausente continua `null` (nunca `0`); `situacao` vem pronta do mart (`encerrado` | `parcial`); nomes explícitos (Regras 9, 18, 26); série em ordem crescente de ano.

**Never:** média estadual, ranking ou comparação entre municípios; correção pela inflação; texto ao cidadão (Story 24.4 e `editor-cidadao`); alterar dbt ou raw; ano fixo ou slug literal fora de testes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ano encerrado | portal com 2024 no período 6 | `atual` com valores, `periodo 6`, `situacao encerrado`; `serie` com todos os anos | — |
| Ano em andamento | ano no período 4 | `situacao parcial`, `periodo 4` | — |
| Indicador ausente | 4.9 nulo no mart | campo `null`, nunca `0` | — |
| Ano sem linha | ano pedido não existe | `atual = null`; `serie` preservada | — |
| Isolamento | outro portal com o mesmo ano | nunca aparece na série nem em `atual` | — |
| Slug vazio | `portalSlug` em branco | `{ atual: null, serie: [] }` | sem consulta |

</intent-contract>

## Code Map

- `elt/transform/models/marts/metrics/fct_educacao_siope_metricas.sql` e `_fct_educacao_siope_metricas.yml` -- mart (somente leitura): grão `portal_slug`+`ano`, colunas e `situacao`.
- `packages/db/src/queries/educacao-origem-recursos.ts` -- padrão de módulo/DTO a seguir (`db` Kysely sem tipos gerados; numeric do pg chega como string).
- `packages/db/tests/fixtures/seed.ts` -- `seed*` e `cleanupFixtures` (acrescentar o mart do SIOPE).
- `packages/db/src/index.ts` -- reexportações.
- `packages/db/src/queries/__tests__/educacao-origem-recursos.spec.ts` -- padrão de teste (banco `postgres_test`, `make db/test/build`).

## Tasks & Acceptance

**Execution:**
- `packages/db/src/queries/educacao-siope-metrics.ts` -- criar `getEducacaoSiope` e DTOs -- contrato tipado do mart
- `packages/db/src/index.ts` -- exportar o módulo
- `packages/db/tests/fixtures/seed.ts` -- `seedEducacaoSiope` e limpeza em `cleanupFixtures`
- `packages/db/src/queries/__tests__/educacao-siope-metrics.spec.ts` -- paridade com o mart (referência Porciúncula 2024 = 16.789,15; 2025 = 16.767,14), parcial, nulo≠0, isolamento, slug vazio

**Acceptance Criteria:**
- Given o mart populado, when se pede um `portalSlug` e um ano, then `atual` traz valores, ano, período e situação, e `serie` traz o histórico anual crescente.
- Given dois portais com o mesmo ano, when se consulta um, then nenhum dado do outro aparece.
- Given indicador ausente, when se lê, then o campo é `null`.

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `make db/test/build && pnpm --filter @transparencia/db test` -- expected: specs passam
- `pnpm typecheck` -- expected: sem erros

## Auto Run Result

Status: done

- Resumo: `getEducacaoSiope({ portalSlug, ano })` devolve `atual` e `serie` anual em `camelCase`, com `periodo` e `situacao` vindos do mart; ausente fica `null`.
- Arquivos: `packages/db/src/queries/educacao-siope-metrics.ts`, `packages/db/src/index.ts`, `packages/db/tests/fixtures/seed.ts`, `packages/db/src/queries/__tests__/educacao-siope-metrics.spec.ts`.
- Verificação: `make db/test/build` ok; vitest do `@transparencia/db` 353 ok (6 novos); `pnpm typecheck` ok; biome ok.
- Pendente fora do escopo: texto ao cidadão sobre o valor parcial (Story 24.4, `editor-cidadao`).
