---
title: 'Story 20.11: Despesas no Padrão Divisórias'
type: 'feature'
created: '2026-10-26'
status: 'done'
baseline_revision: '01a26f59dd41edd76f6d9aff5a6c249e37683092'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/CLAUDE.md'
  - '{project-root}/.claude/rules/web.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-20-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/20-5-farmacia-sus-no-padrao-divisorias.md'
warnings: []
deferred:
  - summary: >-
      Capturar baseline e resultado visual de /despesas (375px e 1280px, claro e escuro) e medir contraste AA.
    evidence: |-
      Nenhuma captura de tela foi feita nesta execução automática; a migração foi validada apenas por testes e guardas de código-fonte.
    location: >-
      apps/web/app/[portalSlug]/despesas/page.tsx
    severity: medium (unverified)
  - summary: >-
      restos-a-pagar-vendors-chart.tsx mantém variáveis abreviadas (liq, naoProc, liqPct) contra a Regra 9.
    evidence: |-
      Nomes pré-existentes, fora do escopo visual da história.
    location: >-
      apps/web/components/restos-a-pagar-vendors-chart.tsx:52
    severity: low
---

<intent-contract>

## Intent

**Problema:** a página `apps/web/app/[portalSlug]/despesas/page.tsx` e os componentes `termometro-opacidade-fiscal.tsx` (620 linhas), `radar-gastos-sensiveis.tsx` (300) e `restos-a-pagar-vendors-chart.tsx` (124) usam cartões `rounded-xl/2xl` com borda e sombra, `bg-white`, paleta fixa do Tailwind (`slate-*`, `rose-*`, `amber-*`, `emerald-*`, `sky-*`, `blue-*`, `indigo-*`), hex (`#2B5278`, `#F0F6FD`...), aliases legados (`accent`, `subtleText`, `borderLine`) e o `SectionHeader`/`KPIGrid` no formato antigo; não funcionam no tema escuro.

**Abordagem:** migrar para o padrão Divisórias sem alterar dados, queries nem textos: `KPICard`/`KPIGrid` com `variant="divisoria"`, `SectionHeader` de `@transparencia/ui` (em vez do local `@/components/section-header`), filetes (`divide-y`, `border-y border-line`) no lugar de cartões, e cores só por token/variável CSS (incluindo barras e gráficos).

## Boundaries & Constraints

**Always:** só tokens semânticos (`ink`, `line`, `line2`, `track`, `mute`, `mute2`, `mute3`, `page`, `pill`, `brand`, `danger`, `ok`, `warn`, `banbg`, `banfg`, `onink`); sem `dark:`, hex nem paleta fixa do Tailwind nos arquivos migrados; contraste AA nos dois temas; preservar textos pt-BR, `aria-*`, `data-testid` e links de lei (Regra 20); "gasto" sempre qualificado (empenhado, liquidado ou pago); Regras 9, 23 e 24 (nada de município/UF/ano fixo, sem vocabulário novo); banner informativo de restos a pagar com `bg-banbg`/`text-banfg`; specs atualizados.

**Never:** alterar `@transparencia/db`, `loader.ts`, `view-model.ts` ou textos; mexer em `opengraph-image.tsx` (permanece claro); migrar outras páginas; remover aliases legados (Story 20.9); alterar `DenseTable`; adicionar dependências; usar `rounded-xl/2xl/lg`, sombras ou `bg-white` em cartões; editar `sprint-status.yaml`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Radar sem itens | `itens` vazio | mesmo comportamento atual, sem cartão | — |
| Opacidade ausente | `opacidadeContabil` nulo | termômetro não renderiza | — |
| Níveis de risco | alto / médio / baixo | cor por `danger` / `warn` / `ok` (texto, barra e selo com contraste AA) | — |
| Restos sem credores | `topFornecedores` vazio | gráfico não renderiza | — |
| Ano corrente parcial | `isCurrentYear` | cabeçalho com "(PARCIAL, …)" como hoje | — |

</intent-contract>

## Code Map

- `apps/web/app/[portalSlug]/despesas/page.tsx` -- 2 `KPIGrid` (4 e 3 colunas) e 7 `KPICard`; `SectionHeader` importado de `@/components/section-header`; banner com hex; `text-accent`, `text-subtleText`, `text-amber-900`.
- `apps/web/components/termometro-opacidade-fiscal.tsx` -- níveis em `bg/text/border-rose|amber|emerald` (linhas 35-56), barras `slate/sky`, cartão `rounded-2xl ... shadow-sm` (184), sub-cartões `rounded-xl` (244, 308-340), selos `rounded-full`, marcadores da barra de comparação.
- `apps/web/components/radar-gastos-sensiveis.tsx` -- ícones por categoria `text-amber|blue|indigo|sky|emerald-700` e fundos `getIconBg` (110-141), cartão `rounded-2xl ... shadow-sm` (168), selos e caixas `rounded-xl`.
- `apps/web/components/restos-a-pagar-vendors-chart.tsx` -- contêiner `rounded-2xl bg-white`, barras `bg-amber-600/300`.
- `packages/ui/src/components/{kpi-card,section-header}.tsx` e `apps/web/components/kpi-grid.tsx` -- reuso (somente leitura); `variant="divisoria"` já existe.
- `apps/web/components/farmacia/farmacia-divisorias.spec.ts` -- modelo da guarda de arquivos (regexes de `rounded`, `shadow`, `bg-white`, paleta, hex, `dark:`).
- `apps/web/app/globals.css` -- tokens (somente leitura).
- Specs existentes: `app/[portalSlug]/despesas/{page,view-model}.spec.*`, `components/{termometro-opacidade-fiscal,radar-gastos-sensiveis}.spec.tsx`.

## Tasks & Acceptance

**Execution:**
- `apps/web/app/[portalSlug]/despesas/page.tsx` -- `KPIGrid variant="divisoria"` + `KPICard variant="divisoria"`, `SectionHeader` de `@transparencia/ui`, banner com `banbg/banfg` e `border-y`/filete, tokens no lugar de `accent/subtleText/amber` -- AC 2, 3
- `apps/web/components/termometro-opacidade-fiscal.tsx` -- sem cartões: seção com `border-y`/`divide-y`, sub-cartões viram colunas/filetes, níveis de risco por `danger/warn/ok`, barras por `track`/`brand`/`mute`, selos `rounded-md` ou texto -- AC 2, 3
- `apps/web/components/radar-gastos-sensiveis.tsx` -- lista por filetes (`divide-y`) em vez de cartões, ícones em `text-brand`/`text-mute2` (sem cor por categoria fixa), selos por token -- AC 2, 3
- `apps/web/components/restos-a-pagar-vendors-chart.tsx` -- sem cartão; barras `bg-warn`/`bg-pill` e legenda por token -- AC 2, 3
- `apps/web/components/despesas-divisorias.spec.ts` -- guarda (modelo `farmacia-divisorias.spec.ts`) sobre os 3 componentes e `page.tsx` -- AC 3
- specs de `page` e dos componentes -- ajustar ao novo markup e cobrir a matriz I/O (níveis, vazio, parcial) -- AC 4

**Acceptance Criteria:**
- Given a história, when começa, then há baseline de referência (claro/escuro, desktop/mobile); se não for possível capturar no ambiente, fica registrado como pendência manual em `deferred`.
- Given a página de despesas, when renderizada nos dois temas, then `KPICard`/`KPIGrid` usam `divisoria`, cada seção abre com o `SectionHeader` de `@transparencia/ui` e não há cartões `rounded-xl` com borda e sombra.
- Given os três componentes, when inspecionados, then usam só variáveis/tokens (gráficos incluídos), sem `dark:`, hex nem paleta fixa, e a guarda passa.
- Given a página, when comparada à atual, then dados, queries e textos de `@transparencia/db` seguem inalterados e "gasto" segue qualificado.
- Given o código, when auditado, then não há município, UF ou ano fixo; `pnpm typecheck`, `pnpm test` e `biome` passam.

## Spec Change Log

## Review Triage Log

### 2026-10-26 — Review pass
- verdicts: 33 findings — high 0, medium 4, low 3, false 6, maybe-false 1 (demais rejeitados como cosméticos/pré-existentes, abaixo)
- findings:
  - `[medium]` `patch` grade de bordas do radar: regras `nth-child(2n)`/`pl-0` vazavam do breakpoint `sm` para `lg` (cartões 2/6 sem filete, 3/5 sem recuo) — restritas com `sm:max-lg:` e `lg:` explícitos.
  - `[medium]` `patch` indicadores do termômetro sem separação e sem padding no mobile (2 colunas) — filetes e `px-4` adicionados.
  - `[medium]` `patch` segmento "não processado" com `bg-pill` de baixo contraste não textual — trocado por `bg-brand` (barra e legenda).
  - `[medium]` `patch` ícones do radar sem teste após refatoração para `ICONES` — teste por categoria; teste de restos criado (vazio e tokens); guarda agora exige import positivo de `SectionHeader`.
  - `[low]` `patch` radar vazio e ano parcial sem cobertura da matriz — testes adicionados em `radar-gastos-sensiveis.spec.tsx` e `page.spec.tsx`.
  - `[medium]` `defer` baseline/captura visual e contraste AA medido — não executável sem app rodando (ver deferred).
  - `[low]` `defer` nomes abreviados `liq`/`naoProc` — pré-existente.
  - `[low]` `reject` classificação de risco desconhecida cai em "ok" — comportamento pré-existente, não alterado.
  - `[false]` `reject` borda dupla `border-t-2` do termômetro sob `SectionHeader` — o termômetro vem após o radar, não imediatamente após o cabeçalho.
  - `[false]` `reject` AA dos tokens `warn`/`ok`/`danger`/`mute2` — tokens definidos para AA nos dois temas em `globals.css`.
  - `[low]` `reject` `rounded-md` permitido, regex frágil, contagem mágica de `variant`, `__dirname`, perda do acento lateral do banner, ícone único `text-brand`, changelog, `section-header` local ainda usado por outras páginas, tamanhos 10/11px — decisões da spec, cosméticos ou fora do intento (changelog no fechamento do épico).

## Verification

**Commands:**
- `pnpm --filter web test -- despesas termometro radar-gastos` -- expected: specs passam
- `pnpm typecheck` -- expected: sem erros
- `pnpm test` -- expected: suíte completa passa
- `pnpm exec biome check apps/web/components apps/web/app/[portalSlug]/despesas` -- expected: sem erros

**Manual checks (if no CLI):**
- `/despesas` em 375px e 1280px, claro e escuro: sem cartões arredondados, barras e níveis de risco legíveis, contraste AA.

## Auto Run Result

Status: done

**Resumo:** a página de despesas e os três componentes migraram para o padrão Divisórias: `KPIGrid`/`KPICard` com `variant="divisoria"`, `SectionHeader` de `@transparencia/ui`, filetes no lugar de cartões e apenas tokens de cor, nos dois temas. Nenhum dado, query ou texto foi alterado.

**Arquivos:**
- `apps/web/app/[portalSlug]/despesas/page.tsx` — KPIs divisória, `SectionHeader` do UI, banner com `banbg`/`banfg`.
- `apps/web/components/termometro-opacidade-fiscal.tsx` — seção sem cartão, risco por `danger`/`warn`/`ok`, colunas com filetes.
- `apps/web/components/radar-gastos-sensiveis.tsx` — grade com filetes, ícones `text-brand`, selos por token.
- `apps/web/components/restos-a-pagar-vendors-chart.tsx` — sem cartão, barras `bg-warn`/`bg-brand`.
- `apps/web/components/despesas-divisorias.spec.ts` e specs de radar, termômetro, restos e página — guarda e cobertura da matriz.
- `apps/web/architecture/tema-excecoes.json` — arquivos migrados removidos das exceções.

**Revisão:** 5 patches aplicados (4 medium, 1 low), 2 itens adiados (baseline visual/contraste medido; nomes abreviados pré-existentes), demais rejeitados com motivo no log. Revisão de acompanhamento recomendada: `false`.

**Verificação:** `pnpm --filter web test` 1277 testes passam; `pnpm typecheck` sem erros; `biome check` sem erros (2 avisos de ordenação de classes preexistentes/menores).

**Riscos residuais:** sem captura de tela nem medição de contraste (baseline do AC 1 pendente, em `deferred`); não há ação exclusiva de operador humano fora do repositório, portanto o status é `done`.
