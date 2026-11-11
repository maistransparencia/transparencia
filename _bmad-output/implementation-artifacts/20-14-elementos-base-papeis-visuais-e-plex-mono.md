---
title: 'Elementos Base, Papéis Visuais e Plex Mono'
type: feature
created: '2026-10-29'
status: done
review_loop_iteration: 0
followup_review_recommended: false
context: ['{project-root}/DESIGN.md', '{project-root}/EXPERIENCE.md']
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Os elementos HTML base e os papéis visuais do `DESIGN.md` não existiam em CSS; cada página repete classes.

**Approach:** Declarar elementos base em `@layer base` e papéis como `@utility` em `apps/web/app/globals.css`, carregar IBM Plex Mono via `next/font` e cobrir o contraste no teste. Sem alterar páginas.

## Boundaries & Constraints

**Always:** Sem cor nova; margem zero nos elementos base; `font-mono` só em `table` e `numeric`; tokens `-fill` em bordas.

**Never:** Alterar páginas, dados ou textos; criar `h5`/`h6`.

</intent-contract>

## Code Map

- `apps/web/app/globals.css` -- `@layer base`, `@utility`, `--panel-*`, `--focus-ring`, `--font-mono`
- `apps/web/app/layout.tsx` -- carga de `IBM_Plex_Mono` (`--font-ibm-plex-mono`)
- `apps/web/styles/tokens-contraste.spec.ts` -- combinações do DESIGN.md nos dois temas
- `apps/web/styles/tokens-tema.spec.ts` -- ignora `panel-*` (só `:root`)

## Tasks & Acceptance

**Execution:**
- [x] `globals.css` -- elementos base e papéis `eyebrow`, `caption`, `lead`, `display`, `numeric`, `stat-value(-sm/-lg)`, `panel(+tons)`, `section`, `list-text`
- [x] `layout.tsx` -- IBM Plex Mono
- [x] `tokens-contraste.spec.ts` -- 4,5:1 texto e 3:1 `focus-ring`

**Acceptance Criteria:**
- Given o DESIGN.md, when a story termina, then os elementos e papéis existem e o `panel` lê `--panel-*` de `:root`.
- `pnpm test` (1387 testes), `pnpm typecheck` e `biome` passam.

## Registro: expandable-row vs DenseTable (Story 20.6)

Diferenças encontradas no início: gatilho na última coluna; chevron 14px com rotação 180°; alvo 28px; fundo `line2` só no detalhe. **Decisão do Julio: aplicar o DESIGN.md.** Aplicado em `dense-table.tsx`: gatilho na primeira célula, chevron 16px girando 90°, alvo mínimo de 44px, linha aberta com `line2`, detalhe sem fundo e com divisória `line`, coluna extra removida; card mobile com o mesmo chevron. O teste do Radar (`radar-gastos-sensiveis.spec.tsx`) foi ajustado.

## Ajustes pós-revisão visual (Julio)

- **Links:** o estilo base de `a` vale só para `<a>` sem classe dentro de `p`, `li` e `dd`. Sidebar, pílulas, cartões e tabelas não são afetados.
- **Tabela:** `table` base sem `font-mono`; mono só no papel `numeric`.
- **`p`:** não impõe tamanho nem cor; o corpo (14px, 16px em `md`) é do `body`, e `p` herda do contêiner, para `text-xs`/`text-sm` continuarem valendo.
- **Accordions de Licitações e Contratos:** sem `font-mono` e sem `text-xs` no contêiner; `dt` com `eyebrow`; "Ver detalhes" e "Sala de Disputa" em estilo de link com 44px de altura.
- Resultado aprovado pelo Julio. Commits: `22c9744e`, `cbed6046`, `32ae051b`.

## Decisões em aberto

- ~~`stat-value-lg` em serifa: validar `tabular-nums` e "R$"~~ — Resolvido na Story 20.16 (2026-10-30): conferido no Storybook, claro e escuro, desktop e mobile. `tabular-nums` iguala a largura dos algarismos e o espaço depois de "R$" (U+0020 ou U+00A0) fica idêntico; `stat-value-lg` permanece em serifa.
- Outros `font-mono` e tamanhos soltos fora dos accordions seguem nas páginas; migrar nas stories 20.7 em diante.

## Auto Run Result

Status: done
