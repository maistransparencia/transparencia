---
title: 'Story 20.12: Cores semânticas do tema claro: fill e text'
type: 'refactor'
created: '2026-10-29'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-20-context.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** No tema claro um único token por intenção (`warn`, `ok`, `danger`) serve mal a dois usos: texto precisa de contraste alto, preenchimento precisa de vivacidade. Hoje só `warn` tem o par `*-fill`/`*-text` (Story 20.11) e `warn-fill` claro era marrom escuro quando usado em barras.

**Approach:** Completar o par `*-fill`/`*-text` para `warn`, `ok`, `danger` e `brand` nos dois temas, com `warn`/`ok`/`danger` virando alias do tom `*-text`; migrar os usos de classes para o par correto e travar o contraste em teste.

## Boundaries & Constraints

**Always:** sem `dark:`, hex nem paleta fixa do Tailwind (guarda da 20.1); tokens existentes não são removidos; `*-text` sobre `page` e `banbg` >= 4,5:1; `*-fill` sobre `track` e `line2` >= 1,5:1 (regra afrouxada por decisão do Julio em 2026-10-29: barras e selos sempre têm rótulo e valor ao lado, e 3:1 escurecia o âmbar até virar marrom), nos dois temas.

**Never:** alterar dados, queries, textos ou `@transparencia/db`; tocar `sprint-status.yaml`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Token novo ausente | `ok-text` só em `:root` | `tokens.spec.ts` falha | Teste vermelho |
| Contraste abaixo do mínimo | `warn-fill` claro sobre `track` < 3:1 | teste de contraste falha | Teste vermelho |

</intent-contract>

## Code Map

- `apps/web/app/globals.css` -- `:root`, `.dark` e `@theme inline` com os tokens.
- `packages/ui/src/tokens.ts` e `tokens.spec.ts` -- espelho TS e teste de existência nos dois temas.
- `apps/web/architecture/tema.spec.ts` -- guarda da 20.1 (lista de exceções só encolhe).
- Usos: `apps/web/components/*`, `apps/web/app/[portalSlug]/**`, `packages/ui/src/components/*` (`alert-box`, `badge`, `kpi-card`, `indicadores-linha`...).

## Tasks & Acceptance

**Execution:**
- `apps/web/app/globals.css` e `packages/ui/src/tokens.ts` -- adicionar `ok-text`, `danger-text`, `brand-fill`, `brand-text`; recalibrar `warn-fill`, `warn-text`, `ok-fill`; `warn`/`ok`/`danger` como alias do `*-text`.
- `packages/ui/src/tokens.spec.ts` -- teste de contraste (OKLCH para sRGB) nos dois temas.
- Componentes listados -- texto e borda de selo para `*-text`; barras, pontos, anel e tinta de selo para `*-fill`.
- Este arquivo -- tabela de auditoria e decisões; capturas antes/depois ficam como ação do operador (exigem navegador autenticado e dados reais).

**Acceptance Criteria:**
- Given os tokens no tema claro e no escuro, when o teste de contraste roda, then `*-text` >= 4,5:1 sobre `page` e `banbg` e `*-fill` >= 1,5:1 sobre `track` e `line2`.
- Given os componentes do escopo, when a guarda da 20.1 roda, then não há `dark:`, hex nem paleta Tailwind novos.
- `pnpm typecheck`, `pnpm test` e `biome` passam.

## Spec Change Log

## Review Triage Log

## Design Notes

Decisões: (1) alvo de `*-fill` são os tons vivos (equivalentes a `amber-500`/`emerald-500`; contraste sobre `track` de 1,84:1 e 2,31:1), por decisão do Julio; o critério de 3:1 virou 1,5:1; (2) `alert-box` e `badge` entram nesta story, pois migram só classes; (3) `brand` já cumpre os dois critérios, então `brand-fill` e `brand-text` são alias do valor atual.

## Auditoria de contraste (tema claro, sobre page / banbg / track / line2)

| Token | Valor | Contraste | Veredito |
|-------|-------|-----------|----------|
| warn-text | oklch(0.53 0.14 55) | 5,5 / 5,0 / 4,8 / 4,9 | texto |
| warn-fill | oklch(0.77 0.16 70) | 2,1 / 1,9 / 1,8 / 1,9 | preenchimento |
| ok-text | oklch(0.5 0.1 155) | 5,7 / 5,2 / 4,9 / 5,1 | texto |
| ok-fill | oklch(0.68 0.16 155) | 2,7 / 2,4 / 2,3 / 2,4 | preenchimento |
| danger-text | oklch(0.55 0.17 25) | 5,3 / 4,8 / 4,6 / 4,7 | texto |
| danger-fill | oklch(0.63 0.2 27) | 3,9 / 3,5 / 3,3 / 3,4 | preenchimento |
| brand | oklch(0.5 0.11 250) | 6,0 / 5,4 / 5,2 / 5,3 | texto e preenchimento |

## Verification

**Commands:**
- `pnpm typecheck` -- expected: sem erros
- `pnpm test` -- expected: verde

## Auto Run Result

Status: done
Feito: tokens `*-fill`/`*-text` nos dois temas, `warn`/`ok`/`danger` como alias do tom de texto, migração das classes em `apps/web` e `packages/ui`, testes de contraste. `pnpm typecheck`, `pnpm test` e `biome` passam.
Pendente (operador): capturas de tela antes/depois.

## Achados das capturas (2026-10-29)

Despesas, licitações e a seção "Do orçamento autorizado ao pagamento" da home aprovadas. Reprovados: barras de Disponibilidade em Caixa e Bancos e de Obras Públicas, com `ok`/`warn`/`danger` no tom de texto (escuro). Causa: `corDoGrafico` devolvia o alias `var(--ok|warn|danger|brand)`, que passou a ser `*-text`.

Correção: `corDoGrafico` agora devolve `var(--*-fill)` para `brand`, `danger`, `ok` e `warn` (`packages/ui/src/utils/chart-colors.ts`), com testes atualizados. `pnpm typecheck` e `pnpm test` passam (144 arquivos, 1357 testes).

Fora do escopo: mapa de Obras sem tema escuro, movido para a Story 20.9 (`epics.md`).

Pendente (operador): refazer as capturas de Caixa e Bancos e Obras Públicas, nos dois temas, para confirmar.

Segunda rodada (2026-10-29): no tema escuro o azul da barra de Obras Públicas ficou claro demais e se confundiu com o verde. `brand-fill` do escuro deixou de ser alias de `brand` e passou a `oklch(0.6 0.15 255)` (`apps/web/app/globals.css`). Teste de contraste dos tokens passa. Pendente (operador): confirmar na captura de Obras Públicas no tema escuro.

### Review Findings

- [x] [Review][Patch] Barras e pontos de marca ainda em `bg-brand` (tom de texto) em vez de `bg-brand-fill`; no tema escuro ficam mais claros que as barras migradas [obras-resumo-card.tsx:204, radar-gastos-sensiveis.tsx:338, despesas-areas-section.tsx:76, despesas-fornecedores-section.tsx:44, restos-a-pagar-vendors-chart.tsx:45,87, termometro-opacidade-fiscal.tsx:99,545, farmacia-disponibilidade-unidades.tsx:20, farmacia-resultados.tsx:325,354, contrato-detalhes-modal.tsx:251, farmacia-mapa.tsx:37] (botões `bg-brand text-onink` ficam como estão)
- [x] [Review][Patch] Comentário `Devolve var(--token)...` ficou acima de `TOKENS_COM_PREENCHIMENTO` em vez de `corDoGrafico` [packages/ui/src/utils/chart-colors.ts:26]
- [x] [Review][Defer] Botão "copiado" usa `bg-ok-text text-onink` (token de texto como fundo); trocar para `ok-fill` exige conferir contraste de `onink` sobre `ok-fill` nos dois temas [farmacia-acoes-civicas.tsx:90] — resolvido: `onink` sobre `ok-fill` dá 2,69:1 no claro (sobre `ok-text` 5,71:1), então o botão permanece em `ok-text`
- [x] [Review][Defer] Sem guarda contra o retorno de `text-ok/warn/danger`, `bg-*` legados e sem asserções de classe na maioria dos ~40 componentes migrados — resolvido: guarda `apps/web/styles/tokens-uso.spec.ts` varre o código e barra `text|bg|ring|border-ok|warn|danger` sem sufixo

#### Rejected

- Contraste de `*-text` sobre `bg-*-fill/10` não testado (low): tinta de 10% é desprezível e o teste exigiria nova lógica de mistura.
- Resolvedor de aliases sem proteção contra ciclo, `var(--x, fallback)`, hex de 3 dígitos e bloco ausente (low): só código de teste/tooling, inalcançável com os tokens atuais.
- `.dark` com alias para token só do `:root` (low): inalcançável hoje, todos os aliases do `.dark` apontam para tokens do próprio bloco.
- `--warn` virou alias de `--warn-text` e mudou de matiz (false): é o desenho da spec (Design Notes), não defeito.
- Nota de Design 3 da spec contradiz o código (rejeitado): a correção seria editar a spec sob revisão.
- Parser/calculadora de contraste duplicados em `tokens.spec.ts` (low): refatoração maior que o ganho.
- `token in TOKENS_COM_PREENCHIMENTO` aceita chaves de protótipo (false): `token` é a união tipada `TokenCorGrafico`.
- Sem teste de distinção `brand-fill` x outros fills (low): o teste genérico de 1,5:1 cobre; novo teste seria complexidade extra.
- Sem entrada no CHANGELOG (low): não verificado como exigência desta story; tratar na consolidação do épico.
