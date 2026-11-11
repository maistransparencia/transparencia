---
title: 'Story 20.2: Shell: Sidebar, Ribbon, Footer e Alternador de Tema'
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_revision: 'b3d842690319e999ca7d0b80fd603112b237ad24'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/CLAUDE.md'
  - '{project-root}/.claude/rules/web.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-20-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/20-1-tokens-tema-claro-escuro-e-guarda-de-arquitetura.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** O shell (sidebar, ribbon, footer) ainda usa cores fixas, fundos próprios, rótulos de 10px e não oferece alternador de tema, embora a 20.1 já tenha entregue os tokens e o script anti-flash.

**Approach:** Reescrever as classes do shell com tokens (`page`, `ink`, `line`, `banbg`/`banfg`...), criar `ThemeToggle` (Claro/Escuro, persiste `localStorage["mt-tema"]`) e reorganizar sidebar/footer conforme o Epic 20 (rodapé da sidebar só com compartilhar + toggle; slots de push/PWA vão para o footer).

## Boundaries & Constraints

**Always:** Tokens da 20.1 (sem `dark:`, sem hex, sem paleta fixa do Tailwind nos arquivos tocados); Regra 23 (sem município, UF ou ano fixos; remover defaults `porciuncula_prefeitura`/`RJ` do footer); Regra 20 em links externos; rótulos mono/pequenos ≥ 11px com contraste AA; ícones Lucide 16px; lista `apps/web/architecture/tema-excecoes.json` só encolhe (remover os arquivos migrados).

**Never:** Alterar queries, dados, textos de negócio ou navegação mobile (`MobileBottomNav`); `prefers-color-scheme`; mexer em outros componentes além do necessário (multi-select, push/pwa ficam fora, salvo ajuste mínimo de slot).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Toggle p/ escuro | clique em "Escuro" | `.dark` no `<html>`, `localStorage["mt-tema"]="dark"`, `aria-pressed` correto | localStorage indisponível: troca a classe sem persistir |
| Toggle p/ claro | clique em "Claro" | remove `.dark`, grava `"light"` | idem |
| Montagem | `.dark` já presente / ausente | estado inicial reflete o `<html>` (sem flash de hidratação) | — |
| Footer sem portal | rota raiz | sem município/UF; marca neutra | — |

</intent-contract>

## Code Map

- `packages/ui/src/components/sidebar.tsx` -- aside (l.444), filtros (l.516), nav (l.546), rodapé (l.697); slots `pushNotificationSlot`/`pwaInstallSlot` hoje no rodapé.
- `packages/ui/src/components/ribbon.tsx` -- hex fixos; migrar para `bg-banbg text-banfg`.
- `apps/web/components/global-footer.tsx` -- footer atual (defaults fixos l.~38-39; botão `bg-slate-800`); `PwaInstallButton`, `NewsletterModal`.
- `apps/web/app/components/sidebar-wrapper.tsx` -- l.229-232 passa push/pwa slots à Sidebar.
- `apps/web/components/push-notification-prompt.tsx`, `push-notification-settings.tsx`, `pwa-installer.tsx` -- componentes a hospedar no footer ("Neste dispositivo"); `PwaInstallButton` variant `footer` já existe.
- `apps/web/lib/tema-script.ts` -- `CHAVE_TEMA = "mt-tema"`; reutilizar.
- `apps/web/architecture/tema-excecoes.json` -- remover sidebar, ribbon, global-footer das categorias.
- Specs: `packages/ui/src/components/__tests__/sidebar.spec.tsx`, `apps/web/components/global-footer.spec.tsx`, `apps/web/app/components/sidebar-wrapper.spec.tsx`, `apps/web/components/entidade-select-compact.spec.tsx`.

## Tasks & Acceptance

**Execution:**
- `packages/ui/src/components/theme-toggle.tsx` -- criar `ThemeToggle` (Sun/Moon, `Claro | Escuro`, `aria-pressed`, botões nativos operáveis por teclado, lê `document.documentElement.classList` no efeito, grava `CHAVE_TEMA` em try/catch); exportar no index do ui. A chave vem por prop/constante para não depender de `apps/web`.
- `packages/ui/src/components/sidebar.tsx` -- sem fundo próprio, `border-r border-line`; item ativo `border-l-2 border-ink font-semibold`; ícones 16px; Exercício/Entidade em `rounded-md border border-line`; rodapé só com "Compartilhar página" e `ThemeToggle`; remover slots push/pwa da API; rótulos ≥11px; trocar hex/gray/paleta por tokens.
- `packages/ui/src/components/ribbon.tsx` -- `banbg`/`banfg`, ponto com `bg-brand`.
- `apps/web/components/global-footer.tsx` -- `border-t-2 border-ink`, 3 colunas: marca+fonte dos dados; "Neste dispositivo" (`PushNotificationSettings` + `PwaInstallButton`); "Alertas" (botão primário de e-mail `bg-ink text-onink`); manter links institucionais/modais; remover defaults de tenant/UF; tokens.
- `apps/web/app/components/sidebar-wrapper.tsx` -- remover slots push/pwa; ajustar imports.
- `apps/web/architecture/tema-excecoes.json` -- remover entradas dos arquivos migrados.
- Specs listados -- atualizar classes/expectativas; adicionar `theme-toggle.spec.tsx` (aria-pressed, persistência, teclado, localStorage lançando erro).

**Acceptance Criteria:**
- Given a sidebar renderizada, then não tem fundo próprio, usa `border-r border-line`, item ativo com `border-l-2 border-ink font-semibold`, ícones 16px e rodapé apenas com compartilhar + `ThemeToggle`.
- Given o `ThemeToggle`, when o usuário escolhe Escuro/Claro, then `.dark` e `localStorage["mt-tema"]` refletem a escolha e `aria-pressed` fica correto.
- Given ribbon e footer, then usam `banbg`/`banfg` e `border-t-2 border-ink` em três colunas com os conteúdos definidos.
- Given o shell, then nenhum `text-[10px]` nem hex/paleta fixa nos arquivos tocados e sem município/UF/ano fixos.
- `pnpm typecheck`, `pnpm test` e biome passam (incluindo guarda de arquitetura com exceções reduzidas).

## Design Notes

Push/PWA saem da sidebar porque o epic move "Neste dispositivo" para o footer; o `PushNotificationPrompt`/`PwaInstaller` globais do layout permanecem inalterados.

## Verification

**Commands:**
- `pnpm typecheck` -- expected: sem erros
- `pnpm test` -- expected: todos passam
- `pnpm exec biome check .` -- expected: sem erros

**Manual checks (if no CLI):**
- AC 9-like: 375px/1280px, claro/escuro (não executável em modo não assistido; registrar como pendência).

## Review Triage Log

### 2026-10-25 — Review pass
- verdicts: 4 camadas, achados agrupados por causa — patches 5, defer 2, rejeitados 8
- findings:
  - `[medium]` `patch` Sem teste de push/PWA no footer nem do gate por slug (Blind, Edge, Gap) — testes adicionados com stubs.
  - `[medium]` `patch` Teste da rota raiz não falhava sem o guard (Gap) — agora passa props de município/UF.
  - `[medium]` `patch` Campo Entidade (`multi-select`) e `ShareButton` fora dos tokens/10px (Intent) — migrados para tokens, ≥11px.
  - `[low]` `patch` Specs do sidebar sem reset de `.dark`/localStorage (Edge) — `beforeEach` adicionado.
  - `[low]` `defer` `PushNotificationSettings` mantém default de slug de Porciúncula (pré-existente, Regra 23).
  - `[low]` `defer` Chave `mt-tema` duplicada entre `ThemeToggle` e `tema-script` (sem teste de paridade).
  - `[low]` `reject` Estado inicial do toggle "light" até o efeito — padrão SSR-seguro; fix traria mismatch de hidratação.
  - `[low]` `reject` Coluna "Neste dispositivo" possivelmente vazia, sem `aria-current`/`focus-visible` novos, tamanhos de ícone/chevron, sincronização entre abas, tamanho do alvo de toque — cosméticos ou fora da intenção.
  - `[false]` `reject` Perda de push/PWA no mobile — o footer renderiza em todos os viewports.
  - `[false]` `reject` Quebra de API por remover slots — nenhum consumidor restante (grep).

## Auto Run Result

Status: done. Entregue `ThemeToggle`, sidebar/ribbon/footer com tokens, footer em 3 colunas (push/PWA em "Neste dispositivo"), defaults de tenant/UF removidos, `multi-select` e `share-button` migrados, exceções reduzidas.
Verificação: `pnpm typecheck`, `pnpm test` (db 302, ui 186, web 1205) e biome (1 warning pré-existente) passam.
Pendências: revisão visual 375px/1280px claro/escuro não executada; aside usa `bg-page md:bg-transparent` (drawer mobile precisa de fundo).
Follow-up review recomendado: false.

### Review Findings

Revisão do commit `7ed95506` (pós-finalize do build-auto).

- [x] [Review][Patch] `PwaInstallButton variant="footer"` sem teste real: o ramo unificado com `sidebar` pode voltar a link sem que nada falhe [apps/web/components/pwa-installer.spec.tsx:270]
- [x] [Review][Patch] Alvo de toque do `botaoPrimario`/`botaoSecundario` caiu para ~36px no mobile (era ~44px no botão de e-mail do footer) — usar `min-h-11 sm:min-h-9` [apps/web/components/botoes-acao.ts:2]
- [x] [Review][Defer] Dica "Desbloquear" é `<p title>`, inacessível por teclado/toque [apps/web/components/push-notification-settings.tsx:47] — deferred: pré-existente
- [x] [Review][Defer] Falha ao desativar notificações não mostra erro e `unsubscribe()` sem `catch` [apps/web/components/push-notification-settings.tsx:63] — deferred: pré-existente
- [x] [Review][Defer] Estado `isLoading` inicial exibe "Notificações desativadas" antes do estado real [apps/web/components/push-notification-settings.tsx:107] — deferred: pré-existente
- [x] [Review][Defer] Emojis 🚀/📲/✕ e nome "MaisTransparencia" fixo em `PwaInstaller` [apps/web/components/pwa-installer.tsx] — deferred: pré-existente (ícones Lucide e `NEXT_PUBLIC_PROJECT_NAME` em story futura)
- [x] [Review][Defer] Contraste AA de `text-mute2` sobre `page` em `text-xs` não verificado neste diff [apps/web/components/pwa-installer.tsx] — deferred: maybe-false, severidade se verdadeiro: medium (não verificado); resolver com o teste de contraste da 20.1 cobrindo `mute2`/`page`
- [x] [Review][Defer] Coluna "Neste dispositivo" pode ficar só com título (sem slug e sem PWA instalável) [apps/web/components/global-footer.tsx] — deferred: já rejeitado como cosmético na 20.2; reavaliar na revisão visual

#### Rejected

- `false` Escopo ampliado para push/PWA — o usuário pediu explicitamente esses ajustes (botões unificados e Regra 23).
- `false` `PushNotificationPrompt` some sem slug — é o comportamento desejado pela Regra 23 (layout passa slug indefinido só na raiz).
- `false` Drawer fechado sem `aria-hidden`/`inert` — `invisible` já o remove da árvore de acessibilidade e do foco.
- `false` Guard de tema pode falhar com restos de paleta — `pnpm test` (incluindo `architecture/`) passa.
- `low` Falta guard runtime de `portalSlug` em settings/topbar/hook — tipo obrigatório; único chamador já protege; guard extra seria complexidade.
- `low` `backdrop-blur` inútil, `border`+`ring` duplo, handlers duplicados, regex de teste fraca, `prefers-reduced-motion` no drawer, popover iOS no footer (visual) — cosméticos/sem dano concreto.
