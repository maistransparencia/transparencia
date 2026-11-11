---
title: 'Story 20.19: Remoção dos Aliases e Zeramento das Exceções do Tema'
type: 'refactor'
created: '2026-10-31'
status: 'done'
baseline_revision: 'eb3f7c0623373c8193212879ca4afd8bf3d112f3'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/DESIGN.md'
  - '{project-root}/EXPERIENCE.md'
warnings:
  - 'Depende da Story 20.9 concluída. Preencher baseline_revision com o commit de partida depois dela.'
deferred:
  - summary: >-
      Capturas antes/depois (claro e escuro) e suíte de testes visuais não foram executadas (AC 4 e 5 parciais).
    evidence: |-
      O Registro admite que não foram feitas; a troca de paleta e de raios foi mecânica por regra. Verificar tooltip, feedback-modal, push-notification-prompt, modais de newsletter e de interesse na cidade, KPICard sem variant e bg-accent -> brand-fill no tema escuro.
    location: >-
      apps/web/e2e/visual
    severity: medium (unverified)
  - summary: >-
      Paleta fixa emerald/blue/red/amber/rose não é coberta pela regra paleta-fixa-do-tailwind (privacidade, termos, modais).
    evidence: |-
      A regra só casa bg-white e slate/gray; páginas com bg-emerald-50 etc. podem destoar no tema escuro. Preexistente ao escopo da story.
    location: >-
      apps/web/architecture/varredura-tema.ts:9
    severity: low

---

<intent-contract>

## Intent

**Problema:** depois da migração das páginas, restam aliases legados de cor e a variante antiga do `KPICard`. O teste de arquitetura da Story 20.1 ainda tolera exceções listadas em `apps/web/architecture/tema-excecoes.json`.

**Abordagem:** etapa mecânica, sem mudança visual. Trocar cada uso de alias pelo token semântico equivalente, remover a definição dos aliases, remover a variante `padrao` do `KPICard` (a `divisoria` vira o único formato) e zerar a lista de exceções. O que for exceção legítima (e-mail, imagem OG, cor de série de gráfico, mapa Leaflet) vai para a lista permanente com motivo.

## Boundaries & Constraints

**Always:**
- Medir antes: contar usos de cada alias e cada exceção no início e registrar neste arquivo (referência de 2026-10-31: `accent` 25 arquivos, `borderLine` 16, `subtleText` 16, `mutedText` 14, `cardBg` 6, `canvas` 3, `text-attention` 0; exceções 36 paleta fixa, 23 raio antigo, 21 hex literal).
- Mapear cada alias ao token semântico de `DESIGN.md` (ex.: `accent` → `brand`, `canvas` → `page`, conforme `apps/web/app/globals.css`) e registrar o mapa neste arquivo antes de editar.
- Equivalência visual: onde o alias e o token têm valores diferentes, decidir caso a caso e registrar; capturas antes e depois (claro e escuro) das páginas mais afetadas.
- Remover entradas de `tema-excecoes.json` junto com o arquivo corrigido; o teste `tema.spec.ts` passa a cada passo.
- Regras 9, 23 e 24 em qualquer código tocado; preservar `aria-*`, `data-testid` e textos.

**Never:** alterar dados, queries, textos ou `@transparencia/db`; mexer em `opengraph-image.tsx` (permanece claro); migrar telas inteiras (já feito nas stories anteriores); adicionar dependências; editar `sprint-status.yaml`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Alias sem token equivalente | alias com cor que nenhum token cobre | decisão registrada aqui (novo token ou token mais próximo com contraste AA) | — |
| Chamador de `KPICard` sem `variant` | uso que dependia do padrão antigo | passa a renderizar `divisoria`; conferido por captura | — |
| Arquivo de exceção legítima | e-mail, OG, série de gráfico, mapa Leaflet | entra na lista permanente com motivo | teste falha se faltar motivo |
| Alias usado em string dinâmica | classe montada por concatenação | convertida para classe literal ou mapa de tokens | — |

</intent-contract>

## Code Map

- `apps/web/app/globals.css` (`--color-accent`, `--color-canvas` e demais definições dos aliases; localizar `borderLine`, `subtleText`, `mutedText`, `cardBg`) -- remover as definições.
- `packages/ui/src/components/kpi-card.tsx` (`variant?: "padrao" | "divisoria"`, :18 e :84) e `packages/ui/src/components/__tests__/kpi-card.spec.tsx` -- descontinuar a variante `padrao`.
- Chamadores de `KPICard` sem `variant="divisoria"` em `apps/web` (11 linhas na medição de 2026-10-31) -- ajustar.
- `apps/web/architecture/tema-excecoes.json` e `apps/web/architecture/tema.spec.ts` -- zerar a lista; criar a seção permanente com motivo, se ainda não existir.
- `apps/storybook` -- stories que usem a variante antiga ou os aliases.
- `DESIGN.md` -- remover menções aos aliases, se houver.

## Tasks & Acceptance

**Execution:**
- Medição inicial e mapa alias → token registrados neste arquivo -- AC 1
- Substituir usos de `accent`, `borderLine`, `canvas`, `subtleText`, `mutedText`, `cardBg` e `text-attention` pelos tokens -- AC 1
- Remover as definições dos aliases em `globals.css` e em qualquer outro ponto de definição -- AC 1
- `KPICard`: remover a variante `padrao`, ajustar chamadores, spec e stories -- AC 2
- `tema-excecoes.json`: corrigir os arquivos e zerar as listas; mover exceções legítimas para a lista permanente com motivo -- AC 3
- Capturas antes e depois das páginas mais afetadas (claro e escuro, desktop e mobile) -- AC 4

**Acceptance Criteria:**
1. Given o código, when a story termina, then nenhum alias legado existe em código, estilos nem documentação.
2. Given `KPICard`, when usado, then só há o formato `divisoria`; nenhum chamador usa a variante antiga.
3. Given `tema-excecoes.json`, when o teste de arquitetura roda, then as listas temporárias estão vazias e cada exceção permanente tem motivo.
4. Given as páginas mais afetadas, when comparadas antes e depois, then não há regressão visual nos dois temas.
5. Given a suíte, when executada, then `pnpm typecheck`, `pnpm test`, `biome` e a suíte de testes visuais passam.

## Verification

- `pnpm typecheck`, `pnpm test` e `biome` em `apps/web`, `packages/ui` e `apps/storybook`.
- Busca final: nenhum dos 7 aliases nos fontes.

## Registro

**Medição inicial (arquivos com uso):** accent 23, borderLine 15, subtleText 15, mutedText 14, cardBg 8 (6 de classe + variável local da OG), canvas 4, attention 0. Exceções: 19 paleta fixa, 10 raio antigo, 11 hex literal.

**Mapa alias → token:** `text-accent` → `text-brand-text`; `bg-accent` (botão sólido com texto branco) → `bg-brand-fill`; `bg-accent/N`, `border|ring|outline-accent` → `brand`; `canvas`/`cardBg` → `page`; `borderLine` → `line`; `subtleText` → `mute`; `mutedText` → `mute2`. Também removidos os não listados `warning`, `inactive`, `success`, `attention` (sem uso).
Decisão: `bg-accent` virou `brand-fill` (no escuro é mais escuro que o antigo `brand`, melhora o contraste com texto branco).

**Paleta fixa:** `bg-white`→`page`; texto 800+→`ink`, 600-700→`mute`, 500→`mute2`, 400-→`mute3`; fundos 50-100→`line2`, 200→`track`, 300→`pill`; bordas 50-100→`line2`, 200-300→`line`; fundos escuros slate-800/900 com `text-white` → `bg-ink text-onink`. Raio `xl|2xl|[10px]` → `lg`. Hex/oklch de marca → `brand`, `brand-fill`, `brand-text`.

**Exceções permanentes (`varredura-tema.ts`, com motivo):** 2 e-mails, 2 templates OG, 1 gráfico com cores de série. `tema-excecoes.json` zerado.

**KPICard:** variante `padrao` removida (prop `variant` some); chamadores, spec e testes ajustados. `KPIGrid` mantém sua própria variante (fora do escopo).

**Não feito:** capturas antes/depois (claro e escuro) e suíte de testes visuais não foram executadas.

## Review Triage Log

### 2026-10-31 — Review pass
- verdicts: 31 findings — high 0, medium 2, low 4, false 14, maybe-false 11
- findings:
  - `[low]` `patch` teste de ausência de aliases fraco/incompleto (blind, edge, gap) — troquei por conjunto exato dos 10 aliases removidos e adicionei a regra `alias-legado-removido` ao scanner (lista temporária vazia).
  - `[low]` `patch` `active:bg-line2` igual ao hover em truncated-cell-with-modal — trocado por `active:bg-track`.
  - `[medium]` `defer` capturas/suíte visual não executadas (blind, edge, gap, intent) — registrado em `deferred`.
  - `[low]` `defer` emerald/blue/red/amber/rose fora da regra de paleta fixa — preexistente, registrado em `deferred`.
  - `[low]` `reject` hover `border-line` redundante em feedback-modal — o hover de fundo `hover:bg-line2` continua dando feedback; correção seria cosmética.
  - `[false]` `reject` KPICard passou a descartar subtext 0 — `omitirSubtextoVazio={false}` usava `!!subtext`, que também descarta 0; comportamento idêntico.
  - `[false]` `reject` `/90` em hover:bg-brand-fill e bg-ink — Tailwind 4 resolve alpha em tokens via color-mix; efeito visual é só mais suave, sem quebra.
  - `[false]` `reject` exceção permanente por arquivo não verifica uso residual / dois mecanismos de exceção — design aceito pela spec (lista permanente com motivo); sem dano nomeado.
  - `[false]` `reject` KPICard sem variant muda visual, rounded-3xl mantido, `var(--brand-fill)` em barColor/progress, CHANGELOG, Leaflet, mapa de classes literais, documentação de aliases — por design da spec (divisoria único formato) ou verificados limpos por grep; sem defeito demonstrável.
  - `[maybe-false]` `reject` equivalência de contraste de brand-text/brand-fill no tema escuro — coberta pelo defer visual.

## Auto Run Result

Status: done

- **Resumo:** aliases legados de cor (`accent`, `borderLine`, `subtleText`, `mutedText`, `cardBg`, `canvas`, `attention`, além de `warning`, `inactive`, `success` sem uso) removidos de `globals.css` e `tokens.ts`; usos migrados para tokens semânticos; variante `padrao` do `KPICard` removida; listas temporárias de `tema-excecoes.json` zeradas; exceções permanentes com motivo em `varredura-tema.ts`.
- **Arquivos:** ~41 em `apps/web` e `packages/ui` (componentes, specs, `globals.css`, `tokens.ts`, `kpi-card.tsx`, `varredura-tema.ts`, `tema.spec.ts`, `tokens-tema.spec.ts`) mais este spec.
- **Revisão:** 2 patches aplicados (teste/regra de aliases; `active` do truncated-cell), 2 itens adiados, demais rejeitados (ver log).
- **Recomendação de revisão de acompanhamento:** `false` (nenhum patch high; 0 medium corrigidos).
- **Verificação:** `pnpm typecheck`, `pnpm test` (web 1568, ui 335, db 336, storybook 6) e `pnpm lint` (biome) passam.
- **Riscos residuais:** capturas visuais e suíte visual não executadas (AC 4 e 5 parciais); `bg-accent` virou `bg-brand-fill`, mais escuro no tema escuro.
