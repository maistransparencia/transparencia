---
title: 'packages/ui Sem Dependência do Next'
type: refactor
created: '2026-10-29'
status: done
baseline_revision: '776c0eef5681242381bda22b9040ca3875253ef5'
review_loop_iteration: 0
followup_review_recommended: false
context: ['{project-root}/DESIGN.md']
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** `packages/ui/src/components/sidebar.tsx` importa `next/image`, `next/link` e `next/navigation`, o que obriga mocks para renderizar o `Sidebar` fora do Next (Storybook, testes).

**Approach:** O `Sidebar` recebe o componente de link (`componenteLink`, padrão `<a>`) e a rota atual (`pathnameAtual`) por prop e usa `<img>` simples para o brasão. O `SidebarWrapper` de `apps/web` injeta `next/link` e `usePathname()`. Um teste de arquitetura impede qualquer import de `next` em `packages/ui/src`.

## Boundaries & Constraints

**Always:** o comportamento visível do shell não muda (mesmas classes, hrefs, `onClick` de fechar o menu móvel); nomes explícitos (regra 9); `pnpm typecheck`, `pnpm test` e `biome` passam.

**Never:** alterar dados, textos ou outras páginas; importar `next/*` em `packages/ui/src`; mocks de `next` nos specs de `packages/ui`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Padrão | `Sidebar` sem `componenteLink` | itens de navegação são `<a href>` | — |
| Injeção | `componenteLink={Link}` | itens usam o componente injetado | — |
| Rota ativa | `pathnameAtual="/x/radar"` | item Radar Cívico ativo | `pathnameAtual` ausente: nenhum item ativo |
| Brasão | `brasaoAsset` válido / `onError` | `<img>`; no erro, ícone `Landmark` | — |
| Guarda | arquivo em `packages/ui/src` importa `next` | teste de arquitetura falha | — |

</intent-contract>

## Code Map

- `packages/ui/src/components/sidebar.tsx` -- imports `next/*` nas linhas 16-18; `usePathname` na linha 238; `Image` em ~378 e ~458; `Link` nos itens de navegação (~543-674); `SidebarProps` na linha 55.
- `apps/web/app/components/sidebar-wrapper.tsx` -- já chama `usePathname()`; passa a injetar `componenteLink={Link}` e `pathnameAtual={pathname}`.
- `packages/ui/src/components/__tests__/sidebar.spec.tsx` -- hoje mocka `next/navigation`; passa a usar `pathnameAtual`.
- `apps/web/app/components/sidebar-wrapper.spec.tsx` -- deve cobrir a injeção.
- `packages/ui/src/tokens.spec.ts` -- modelo de estilo de spec de guarda (usa `node:fs`).
- `packages/ui/package.json` -- `next` em `devDependencies` (linha 29).

## Tasks & Acceptance

**Execution:**
- `packages/ui/src/components/sidebar.tsx` -- remover imports de `next/*`; adicionar props `componenteLink` (tipo de link com `href`, `onClick`, `className`, `children`; padrão `<a>`) e `pathnameAtual`; trocar `Image` por `<img>` -- remove a dependência.
- `apps/web/app/components/sidebar-wrapper.tsx` -- importar `next/link` e injetar link e `pathname`.
- `packages/ui/src/components/__tests__/sidebar.spec.tsx` -- remover o mock de `next`; passar `pathnameAtual`; testar `<a>` padrão e link injetado.
- `apps/web/app/components/sidebar-wrapper.spec.tsx` -- verificar que os itens renderizam e a rota ativa segue o `pathname`.
- `packages/ui/src/arquitetura.spec.ts` -- novo: varre `packages/ui/src` (exceto o próprio arquivo) e falha se achar import/`vi.mock` de `next` ou `next/*`.
- `packages/ui/package.json` -- remover `next` de `devDependencies` se nada mais usar; atualizar `pnpm-lock.yaml` com `pnpm install`.

**Acceptance Criteria:**
- Given o `Sidebar`, when renderizado sem providers do Next, then funciona com `<a>` padrão e `<img>` sem nenhum import de `next/*`.
- Given `apps/web`, when o shell renderiza, then links e rota ativa vêm de `next/link` e `usePathname()` e o visual não muda.
- Given um import de `next` em `packages/ui/src`, when `pnpm test` roda, then o teste de arquitetura falha.
- Given a story pronta, when `pnpm typecheck`, `pnpm test` e `biome` rodam, then passam.

## Spec Change Log

## Review Triage Log

### 2026-10-29 — Review pass
- verdicts: 20 findings — high 0, medium 1, low 5, false 6, maybe-false 0 (demais duplicados agrupados)
- findings:
  - `[medium]` `patch` teste do wrapper não distingue `next/link` de `<a>` (Verification Gap) — corrigido com mock de `next/link` marcando `data-next-link` e asserção no item Radar Cívico
  - `[low]` `reject` literais `porciuncula_prefeitura` nos testes (Blind) — já existiam nos specs antes da story; fixtures de teste, fora do escopo
  - `[low]` `reject` `<img>` sem width/height/lazy (Blind, Edge, Verification, Intent) — contêiner de tamanho fixo com `h-full w-full`; a story aceita `<img>` simples
  - `[low]` `reject` `onClick` sem teste, asserção por classe em vez de `aria-current`, props extras do link (Blind, Edge) — o `Sidebar` só passa href/onClick/className; `aria-current` não existe hoje e adicioná-lo muda o comportamento visível
  - `[false]` `reject` regex da guarda frágil/falsos positivos, extensões `.js`, `doMock`, `next-*`, `package.json` (Blind, Edge, Intent) — a guarda cobre o AC literal (`next` e `next/*` em `packages/ui/src`, `.ts`/`.tsx`); `package.json` já sem `next`
  - `[false]` `reject` `pathnameAtual`/`componenteLink` opcionais, CHANGELOG, Storybook (Blind, Edge, Intent) — a story pede padrão `<a>`; CHANGELOG não se aplica a refactor interno; Storybook é a Story 20.16

## Verification

**Commands:**
- `pnpm typecheck` -- expected: sem erros
- `pnpm test` -- expected: todos passam
- `pnpm exec biome check packages/ui apps/web/app/components` -- expected: sem erros
- `grep -rnE "from ['\"]next" packages/ui/src` -- expected: sem resultados

## Auto Run Result

Status: done

- Resumo: `Sidebar` sem imports de `next/*`; recebe `componenteLink` (padrão `<a>`) e `pathnameAtual`; brasão em `<img>`. `SidebarWrapper` injeta `next/link` e `usePathname()`. Teste de arquitetura impede `next` em `packages/ui/src`; `next` removido das `devDependencies` de `packages/ui`.
- Arquivos: `packages/ui/src/components/sidebar.tsx`, `apps/web/app/components/sidebar-wrapper.tsx`, `packages/ui/src/arquitetura.spec.ts` (novo), specs do sidebar e do wrapper, `packages/ui/package.json`, `pnpm-lock.yaml`.
- Revisão: 1 patch aplicado (mock de `next/link` no spec do wrapper), 0 deferidos, demais rejeitados (ver Review Triage Log).
- Follow-up recomendado: false.
- Verificação: `pnpm typecheck`, `pnpm test` e `biome check` passam; grep de `next` em `packages/ui/src` vazio.
- Riscos residuais: brasão sem otimização de imagem do Next e sem width/height intrínsecos (CSS fixa o tamanho); não verificado em navegador.
