---
title: 'Story 20.19: Remoção dos Aliases e Zeramento das Exceções do Tema'
type: 'refactor'
created: '2026-10-31'
status: 'ready-for-dev'
baseline_revision: ''
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/DESIGN.md'
  - '{project-root}/EXPERIENCE.md'
warnings:
  - 'Depende da Story 20.9 concluída. Preencher baseline_revision com o commit de partida depois dela.'
deferred: []
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

(medição inicial, mapa alias → token e decisões casuísticas, a preencher na execução)
