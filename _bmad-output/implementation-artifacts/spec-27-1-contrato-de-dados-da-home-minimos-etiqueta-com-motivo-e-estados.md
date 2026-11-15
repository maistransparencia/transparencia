---
status: done
date: 2026-11-09
---

# Story 27.1: Contrato de dados da home (mínimos, etiqueta com motivo e estados)

## Intenção

A home traz os mesmos mínimos de saúde e educação das páginas internas e um estado tipado por área (saúde, obras, educação), com `emAtencao` e `motivo`. Sem mudança visual.

## Code Map

- `packages/db/src/queries/situacao-home.ts`: `calcularSituacaoHome` (função pura), `SituacaoHomeDTO`, estados `normal|parcial|abaixo|sem_dado|indisponivel`, motivos `abaixo_minimo|obra_paralisada`.
- `apps/web/app/[portalSlug]/loader.ts`: reusa `getSaudeMinimoConstitucional` e `getEducacaoSiope` (`.minimos.mde`), com `.catch(() => null)`; expõe `minimoSaude`, `minimoEducacao`, `situacaoHome`. `anoFechado = selectedYear < currentYear`.
- `apps/web/app/[portalSlug]/view-model.tsx`: propaga os três campos sem recalcular.

## Aceitação (resumo)

- Given a home, When carrega, Then traz os mínimos da mesma query das páginas internas (teste de loader: mesma referência, sem recálculo).
- Then `emAtencao`/`motivo` só para `abaixo` em ano fechado e obra paralisada; `parcial`, `sem_dado`, apagão e queda do Ideb nunca disparam (testes em `situacao-home.spec.ts`).
- Then fonte ausente ou com falha vira `indisponivel` sem derrubar a página (teste de loader).

## Verificação

`pnpm typecheck` e `pnpm test` passam. Testes novos: `situacao-home.spec.ts`, `loader.spec.ts`, `view-model.spec.ts`.

## Auto Run Result

Status: done
