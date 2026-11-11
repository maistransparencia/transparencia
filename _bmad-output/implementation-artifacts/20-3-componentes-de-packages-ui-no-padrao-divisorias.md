---
title: 'Story 20.3: Componentes de packages/ui no Padrão Divisórias'
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_revision: '65bcb91e82d3c60d1ddf4dd0c953351b294b50bc'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/CLAUDE.md'
  - '{project-root}/.claude/rules/web.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-20-context.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problema:** os componentes compartilhados de `packages/ui` ainda usam o visual antigo (caixas com borda, raio e sombra, paleta fixa do Tailwind), então as páginas não conseguem migrar para o padrão Divisórias sem estilos próprios.

**Abordagem:** adicionar a variante `divisoria` ao `KPICard`/`KPIGrid`, migrar `SegmentedButton`, `Badge`, `ModalDialog` e `AlertBox` para tokens, criar `SectionHeader`, `ExternalLinkPill` e `StatRow` em `packages/ui` e expor um helper de cores de gráfico por variável CSS. A variante atual do `KPICard` permanece até a story 20.9.

## Boundaries & Constraints

**Always:** só tokens semânticos (`ink`, `onink`, `line`, `mute2`, `page`, `pill`, ...); sem `dark:` e sem hex; links externos com `target="_blank" rel="noopener noreferrer"`; nomes explícitos (regra 9); `KPICard` sem `variant` continua idêntico ao atual; exportar tudo em `packages/ui/src/index.ts`; atualizar `apps/web/architecture/tema-excecoes.json` removendo as entradas dos arquivos que deixarem de violar (a lista só encolhe).

**Never:** migrar páginas; remover aliases (`accent`, `cardBg` etc.) ou o `SectionHeader` de `apps/web/components/section-header.tsx` (migração é das stories 20.4+); tocar `DenseTable`, `Tooltip`, `TruncatedCellWithModal`; texto com `text-faint|pill|line|line2|track`.

</intent-contract>

## Code Map

- `packages/ui/src/components/kpi-card.tsx` -- `KPICard`; adicionar `variant?: "padrao" | "divisoria"` (padrão = comportamento atual).
- `apps/web/components/kpi-grid.tsx` -- `KPIGrid` vive no web; adicionar `variant="divisoria"` (`divide-x divide-line`, sem gap, primeira coluna sem recuo). Sem `variant` fica igual.
- `packages/ui/src/components/segmented-button.tsx` -- `SegmentedButton`, hoje `rounded-lg` com `slate-*`.
- `packages/ui/src/components/badge.tsx`, `alert-box.tsx`, `modal-dialog.tsx` (linhas ~165-270: contêiner, cabeçalho, título `font-serif`) -- migrar para tokens.
- `packages/ui/src/components/__tests__/modal-dialog.spec.tsx` e demais specs -- padrão de teste (vitest + Testing Library); criar specs novos ao lado.
- `packages/ui/src/tokens.ts` -- `TOKENS.colors` já aponta para `var(--...)`; base do helper de gráfico.
- `packages/ui/src/index.ts` -- barrel de exportação.
- `apps/web/components/section-header.tsx` -- `SectionHeader` antigo (filete, `slate-900`); só referência, permanece.
- `apps/web/architecture/tema-excecoes.json` e `tema.spec.ts` -- guarda: `raio-antigo` e `paleta-fixa-do-tailwind` listam os arquivos de ui; `cor-hex-literal` lista `dense-table.tsx`.
- `apps/web/components/saude-trend-chart.tsx`, `previdencia-entidades-donut.tsx` -- usam `recharts`; consumidores futuros do helper (não alterar agora).

## Tasks & Acceptance

**Execution:**
- `packages/ui/src/components/kpi-card.tsx` -- variante `divisoria`: sem borda/raio/sombra, rótulo `font-mono` uppercase `text-mute2`, valor `text-[26px] font-semibold` -- AC 1.
- `apps/web/components/kpi-grid.tsx` -- variante `divisoria` com `divide-x divide-line`, primeira coluna sem recuo (`first:pl-0`), colunas com filete a partir de `sm:`, empilhadas no mobile -- AC 1.
- `packages/ui/src/components/segmented-button.tsx` -- `rounded-md`, ativo `bg-ink text-onink`, inativo/mudo com tokens; `variant?: "segmentado" | "tabs"` (`tabs` com `border-b-2`, ativo `border-ink`) -- AC 2.
- `packages/ui/src/components/badge.tsx` -- `rounded-sm` e tokens (`ok`, `warn`, `danger`, `brand`, `line`, `mute`) -- AC 2.
- `packages/ui/src/components/modal-dialog.tsx` -- `rounded-xl border border-line bg-page shadow-2xl`, títulos `font-serif`, cabeçalho/rodapé com tokens -- AC 2.
- `packages/ui/src/components/alert-box.tsx` -- mantém a caixa; só troca cores por tokens -- AC 2.
- `packages/ui/src/components/section-header.tsx` (novo) -- filete `border-t-2 border-ink`, título serif, `description`, `action` (link) -- AC 3.
- `packages/ui/src/components/external-link-pill.tsx` (novo) -- `rounded-full border border-pill`, ícone `ExternalLink` 12px, `target="_blank" rel="noopener noreferrer"` -- AC 3.
- `packages/ui/src/components/stat-row.tsx` (novo) -- linha rótulo/valor com filete de 1px (`border-b border-line`), valor alinhado à direita -- AC 3.
- `packages/ui/src/utils/chart-colors.ts` (novo) -- helper `corDoGrafico(token)` / mapa de `var(--...)` para `fill`/`stroke` do `recharts` -- AC 4.
- `packages/ui/src/index.ts` -- exportar novos componentes e helper.
- `packages/ui/src/components/__tests__/*.spec.tsx` -- atualizar `modal-dialog.spec.tsx` e criar specs de `kpi-card`, `segmented-button`, `badge`, `alert-box`, `section-header`, `external-link-pill`, `stat-row`, `chart-colors`; spec do `KPIGrid` ao lado do componente -- AC 5.
- `apps/web/architecture/tema-excecoes.json` -- remover entradas de arquivos que deixaram de violar; manter as que ainda violam (ex.: `modal-dialog` e `alert-box` em `raio-antigo`, pois seguem `rounded-xl`).

**Acceptance Criteria:**
- Given `KPICard variant="divisoria"`, when renderizado, then não há `border`, `rounded` nem `shadow`, o rótulo tem `font-mono uppercase text-mute2` e o valor `text-[26px] font-semibold`; sem `variant` o markup antigo permanece.
- Given `KPIGrid variant="divisoria"`, when renderizado, then o contêiner tem `divide-x divide-line` e a primeira coluna sem recuo.
- Given `SegmentedButton` ativo, when renderizado, then tem `rounded-md bg-ink text-onink`; com `variant="tabs"` usa `border-b-2`.
- Given `ModalDialog` aberto, when renderizado, then o diálogo tem `rounded-xl border-line bg-page shadow-2xl` e o título `font-serif`.
- Given `ExternalLinkPill`, when renderizado, then o link tem `target="_blank"`, `rel="noopener noreferrer"` e classes `rounded-full border-pill`.
- Given o helper de cores, when pedida uma cor, then devolve `var(--token)`.

## Spec Change Log

## Review Triage Log

### 2026-10-25 — Review pass
- verdicts: contagem aproximada (revisores reportaram ~35 itens; vários duplicados entre camadas) — high 0, medium 3, restante low ou false; todos os rejeitados estão agrupados nas linhas abaixo
- findings:
  - `[medium]` `[patch]` KPIGrid divisoria: filete/recuo indevidos no primeiro item de linhas quebradas e sem separador no mobile (Blind, Edge, Intent, Verification) — corrigido com borda por item via nth e `max-sm:divide-y`.
  - `[medium]` `[patch]` AlertBox perdeu o preenchimento da caixa (Blind, Edge, Intent) — restaurado `bg-<token>/10`.
  - `[medium]` `[patch]` Badge perdeu fundos (Intent) — restaurado `bg-<token>/10`.
  - `[low]` `[patch]` Lacunas de teste: KPICard divisoria accent/alert/trend e SegmentedButton tabs inativo/muted (Verification, Blind, Edge) — casos adicionados.
  - `[false]` `[reject]` kpi-card.tsx ainda na lista de exceções (Blind) — a variante padrao permanece até a 20.9 e a guarda exige a entrada.
  - `[false]` `[reject]` KPIGrid fora de packages/ui (Intent) — KPIGrid vive em apps/web; decisão registrada na spec.
  - `[low]` `[reject]` Header/rodapé do modal com mesmo bg-page e sem hover de fundo; SectionHeader sem prop de nível; ExternalLinkPill sem aviso sr-only/validação de href; valores falsy 0 em SectionHeader/KPICard; denylist de chart-colors; aria-pressed em tabs sem role; cor de trend; testes por classe; título do teste de Badge — cosmético ou especulativo, sem consumidor, correção exigiria nova superfície pública.

## Design Notes

`ModalDialog` e `AlertBox` mantêm `rounded-xl` (camada flutuante/caixa, conforme o AC); por isso continuam na lista `raio-antigo` até a 20.9 decidir a permissão para camadas flutuantes. O `SectionHeader` novo de `packages/ui` coexiste com o de `apps/web/components` até a migração das páginas.

## Verification

**Commands:**
- `pnpm --filter @transparencia/ui test` -- expected: verde
- `pnpm --filter @transparencia/web test -- architecture kpi-grid` -- expected: verde, guarda sem arquivo novo violando nem entrada obsoleta
- `pnpm typecheck` -- expected: sem erros
- `pnpm exec biome check packages/ui apps/web/components apps/web/architecture` -- expected: sem avisos

## Auto Run Result

Status: done

- **Resumo:** variante `divisoria` em `KPICard` e `KPIGrid`; `SegmentedButton`, `Badge`, `ModalDialog` e `AlertBox` migrados para tokens; novos `SectionHeader`, `ExternalLinkPill`, `StatRow` e helper `corDoGrafico`/`coresDoGrafico`; specs atualizados e exceções da guarda reduzidas.
- **Revisão:** 4 patches aplicados (3 médios, 1 baixo), 0 deferidos, demais rejeitados conforme o log.
- **Recomendação de nova revisão:** false.
- **Verificação:** ui 204 testes e web 1210 testes passando, `pnpm typecheck` e `biome check` limpos.
- **Riscos residuais:** sem checagem visual em navegador; o comportamento do KPIGrid ao quebrar linha só foi testado por classes; `ModalDialog` e `AlertBox` seguem em `raio-antigo` até a 20.9.
