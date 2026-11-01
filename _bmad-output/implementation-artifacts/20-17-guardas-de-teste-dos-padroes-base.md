---
title: 'Story 20.17: Guardas de Teste dos Padrões Base'
type: 'chore'
created: '2026-11-01'
status: 'done'
baseline_revision: '45ac1f4e2fc3cc9dac7639138e58e6966809ab53'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/DESIGN.md'
  - '{project-root}/EXPERIENCE.md'
---

# Story 20.17: Guardas de Teste dos Padrões Base

## Intent

Falhar o teste quando uma página ignora o padrão base: `slate-*`/`gray-*`/`text-black`/`text-white`, classe de tamanho de fonte em `h1`–`h4`, `<h5>`/`<h6>` e `font-mono` fora de `table` e `numeric`. Sem mudar nenhuma tela.

## Tasks & Acceptance

- [x] `apps/web/styles/padroes-base.ts`: varredura de `apps/web` e `packages/ui/src` com um detector por regra.
- [x] `apps/web/styles/padroes-base-isentos.ts`: lista temporária (nasce com todos os violadores atuais, com teto numérico que só baixa) e lista permanente com motivo (e-mails, OG, séries de gráfico, Leaflet; hoje vazia porque nenhum deles viola).
- [x] `apps/web/styles/padroes-base.spec.ts`: testes dos detectores, arquivo novo violando falha, entrada desnecessária falha, lista não passa do teto.
- [x] `tsc --noEmit`, `biome` e vitest passam.

## Notas

- Cada story de migração (20.7–20.10, 20.18) remove suas entradas e baixa `TETO_ISENTOS_TEMPORARIOS`.
- `font-mono` é aceito na tag `table`/`th`/`td`/etc. ou quando a mesma tag tem `numeric`; qualquer outro uso é violação.

## Auto Run Result

Status: done
