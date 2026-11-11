---
title: 'Story 20.18: Varredura Final dos Padrões Base'
type: 'chore'
created: '2026-11-01'
status: 'done'
baseline_revision: '4a2bab7a'
review_loop_iteration: 0
followup_review_recommended: false
---

# Story 20.18: Varredura Final dos Padrões Base

## Intent

Zerar a lista de isentos temporários da Story 20.17, migrando as páginas e modais restantes para elementos base e papéis, sem alterar dados, queries ou textos.

## Tasks & Acceptance

- [x] `text-white` → `text-onink` nos 10 arquivos com cor proibida.
- [x] Classes de tamanho/peso/família/cor removidas de `h1`–`h4` em 30 arquivos (rótulos em caixa alta viraram `eyebrow`).
- [x] `font-mono` → `numeric` (valores) ou `eyebrow` (rótulos) em 16 arquivos.
- [x] `padroes-base-isentos.ts`: lista temporária vazia e `TETO_ISENTOS_TEMPORARIOS = 0`.
- [x] Testes de `kpi-card` e `modal-dialog` ajustados ao novo padrão.
- [x] `pnpm typecheck`, `pnpm test` e `biome` (sem erros) passam.
- [ ] Capturas de tela antes/depois (claro/escuro, desktop/mobile): não feitas nesta execução automatizada.


## Review Triage Log

### 2026-11-01 — Review pass (follow-up)
- verdicts: 21 findings — high 0, medium 1, low 3, false 7, maybe-false 10
- findings:
  - `[medium]` `[patch]` `numeric` (text-align: right) em `className` de coluna sem `align` deixa Vigência, Processo e Abertura à direita sob cabeçalho à esquerda — corrigido com `text-left` em `contratos-servicos-vigentes-section.tsx` (Vigência) e `licitacoes-em-andamento-section.tsx` (Processo, Abertura); Empenhado já tem `align: "right"`.
  - `[false]` `[reject]` `text-onink` sobre `bg-brand-fill` perde contraste no tema escuro — `--onink` é `#14171b` no escuro e `--brand-fill` é `oklch(0.6 0.15 255)`; a razão de contraste do texto escuro é igual ou maior que a do branco (~4,3–4,5), sem piora.
  - `[false]` `[reject]` token `text-onink` não existe — `--color-onink` definido em `globals.css:131`.
  - `[maybe-false]` `[reject]` `eyebrow` troca cor/tamanho de rótulos (ink→mute, pílulas) — mudança visual intrínseca ao contrato 20.17/DESIGN.md; confirmar nas capturas humanas já pendentes.
  - `[maybe-false]` `[reject]` `h1` da sidebar e títulos compactos (`destaque-linha`, `hero-fiscal-card`, modais, toast) crescem para o tamanho base — tamanho vem do elemento nu por decisão do DESIGN.md; verificação visual humana já registrada como pendente.
  - `[low]` `[reject]` `text-left` repetido ao lado de `numeric` (~30 vezes) — redundância sem dano; mudar o papel `numeric` está fora do escopo da story.
  - `[low]` `[reject]` `numeric` aplicado a códigos/"S/N" e `stat-value` em `h3` do índice A–Z — a guarda só permite mono em `numeric`; escolha deliberada.
  - `[maybe-false]` `[reject]` `eyebrow` em `h3` "Relação Completa…" vira caixa alta — escolha do papel, revisão visual pendente.
  - `[maybe-false]` `[reject]` `numeric` com `white-space: nowrap` em cartões mobile pode estourar a largura — valores curtos; só confirmável visualmente.
  - `[maybe-false]` `[reject]` `global-error.tsx` depende do CSS base — `globals.css` carrega via layout raiz; sem evidência de falha.
  - `[low]` `[reject]` regex `/font-|text-/` do teste do `modal-dialog` é ampla — falha de forma segura e é o objetivo do teste.
  - `[false]` `[reject]` afirmações de testes fracos / sem capturas / `TETO_ISENTOS_TEMPORARIOS` — capturas já registradas como pendentes na própria spec; guarda cobre os mesmos globs da 20.17.
  - `[maybe-false]` `[reject]` demais achados sobre mudanças tipográficas sem verificação visual (Blind Hunter, Edge Case, Intent) — mesma pendência de revisão visual humana.

## Auto Run Result

Status: done

- Resumo: varredura final migrou páginas/modais para elementos base e papéis (`eyebrow`, `numeric`, `text-onink`) e zerou os isentos temporários. Passada de revisão de acompanhamento: 1 patch aplicado.
- Arquivos alterados nesta passada: `apps/web/components/contratos-servicos-vigentes-section.tsx`, `apps/web/components/licitacoes-em-andamento-section.tsx` (`text-left` em colunas com `numeric`).
- Revisão: patches 1 (medium); adiados 0; rejeitados 20 com motivo no log.
- Revisão de acompanhamento recomendada: não (nenhum patch `high`).
- Verificação: `pnpm test`, `pnpm typecheck` e `biome check --write` nos dois arquivos passam.
- Risco residual: revisão visual humana pendente (claro/escuro, desktop/mobile) de `numeric` (alinhamento à direita), `eyebrow` (cor/caixa alta) e tamanhos de títulos nus.
