---
title: 'Acabamento do Shell: Notificações, Instalação do App e Rodapé'
type: 'feature'
created: '2026-11-01'
status: 'done'
baseline_revision: '8c7d3b32d31613d3685a66c118bc8888d046fe23'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/DESIGN.md'
  - '{project-root}/EXPERIENCE.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Os controles de notificação push e de instalação do app no shell têm instruções de desbloqueio só em `title` (hover), erros não tratados no desativar, estado "desativadas" exibido enquanto ainda carrega, emojis e nome do app fixo, rodapé com coluna "Neste dispositivo" possivelmente vazia, drawer móvel que anima sempre e `mute2` sem teste de contraste.

**Approach (inclui pedido do Julio, 2026-11-01):** o rodapé usa fundo invertido em relação ao tema (mais escuro no claro, mais claro no escuro) e exibe o logo do MaisTransparencia. Corrigir cada item da Story 20.10 (`epics.md`, linha 2593) nos arquivos de escopo, com specs por item, sem alterar dados nem `@transparencia/db`.

## Boundaries & Constraints

**Always:** Linguagem cidadã nas mensagens ("Não foi possível desativar. Tente novamente."), sem códigos técnicos. Nome do app via `env.NEXT_PUBLIC_PROJECT_NAME` de `@/env` (Regra 17). Ícones Lucide de 16px (`h-4 w-4`, `aria-hidden`). Elemento nu e papéis do `DESIGN.md`; cores só por token. Um único handler compartilhado para ativar e desativar. Identificadores de infraestrutura em inglês (Regra 26), textos em português.

**Never:** Guard de `portalSlug` em tempo de execução (fora de escopo por decisão do PM). Não tocar `sprint-status.yaml`. Sem município, UF ou ano fixos. Sem `process.env` direto.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Bloqueado | `permission === "denied"` | Botão/disclosure operável por teclado e toque (`aria-expanded`) revela passo a passo em texto claro | N/A |
| Carregando | `isLoading` real e estado ainda desconhecido | Não mostra "ativas" nem "desativadas" (nada ou "Carregando…"), sem anúncio de estado errado | N/A |
| Desativar falha | `unsubscribe()` rejeita ou retorna `false` | Mensagem com `role="alert"`, sem rejeição não tratada | Texto cidadão |
| Ativar falha | `subscribe()` falha | Mesma mensagem de erro, mesmo caminho do desativar | Texto cidadão |
| Rodapé sem conteúdo | Sem push suportado e sem instalação disponível | Coluna "Neste dispositivo" não renderiza; rodapé em duas colunas, sem título solto | N/A |
| Rodapé invertido | Tema claro / tema escuro | Fundo escuro no claro e claro no escuro, via tokens `footer-*` (fundo, texto, texto secundário, filete); textos e controles filhos legíveis (AA) | N/A |
| Movimento reduzido | `prefers-reduced-motion: reduce` | Drawer sem animação de deslize; sem transição ao cruzar `md` | N/A |

</intent-contract>

## Code Map

- `apps/web/components/push-notification-settings.tsx` -- 119 linhas; `title` em "Desbloquear" (linha ~47), dois `onClick` async duplicados (68-107), estados sem tratar `isLoading`; `error` só aparece no ramo "não inscrito".
- `apps/web/hooks/use-push-notifications.ts` -- store compartilhada; `unsubscribe` (393-450) captura erro mas `sub.unsubscribe()` pode retornar `false`; `isLoading` inicia `true` (44-60); mensagens técnicas em `error` (ex.: VAPID, HTTP) devem virar texto cidadão.
- `apps/web/components/pwa-installer.tsx` -- emojis 🚀 (352), 📲 (371), ✕ (390, 548, 587); nome fixo "MaisTransparencia"/"MaisTransparência" (374, 412); `ring-1` junto de `border` (350, 369, 404, 538, 577) e `backdrop-blur-md` sobre `bg-page` opaco (404). `Smartphone` e `X` já importados de lucide.
- `apps/web/components/global-footer.tsx` -- coluna "Neste dispositivo" sempre renderizada (128-136) dentro de `sm:grid-cols-3` (109); `PwaInstallButton` retorna `null` internamente (484-486), então o rodapé precisa saber a disponibilidade (extrair hook de disponibilidade de instalação e usar `usePushNotifications` ou equivalente).
- `apps/web/public/favicon.svg` -- única marca existente (glifo "M" branco sobre `#5a72a8`); usar como logo do rodapé (`<img>` 24px com `alt=""` ao lado do nome, ou SVG inline com `currentColor`); sem logo novo.
- `apps/web/app/globals.css` (`:root` 28-39, `.dark` 58-69, `@theme` 87-98) e `packages/ui/src/tokens.ts` -- criar tokens `footer-bg`, `footer-ink`, `footer-mute`, `footer-line` (claro: fundo escuro; escuro: fundo claro). Rodapé hoje usa `bg-page` e `border-ink border-t-2` (`global-footer.tsx` 100-106); botões `botaoPrimario`/`botaoSecundario` e `PushNotificationSettings` precisam de variante legível sobre fundo invertido (herdar `footer-*` por variáveis, sem `dark:`).
- `packages/ui/src/components/sidebar.tsx` -- só o drawer: `<aside>` (460-468) `transition-[transform,visibility] duration-300` sem `motion-reduce`; backdrop (451). Já existe `md:transition-none`.
- `packages/ui/src/tokens.spec.ts` -- bloco `describe.each(temas)` (115-141); `mute2` claro `#666c7a`, escuro `#8d96a2` em `apps/web/app/globals.css` (35, 65); `page` como fundo. Adicionar caso `mute2` sobre `page` ≥ 4,5:1.
- `apps/web/components/global-footer.spec.tsx`, `pwa-installer.spec.tsx` -- specs existentes a atualizar; não há spec de `push-notification-settings` (criar).

## Tasks & Acceptance

**Execution:**
- `apps/web/components/push-notification-settings.tsx` -- disclosure acessível no estado bloqueado; handler único `runAction` para ativar/desativar com try/catch, erro com `role="alert"` em todos os ramos; sem rótulo de estado enquanto carrega -- ACs 1-3
- `apps/web/hooks/use-push-notifications.ts` -- tratar `unsubscribe()` rejeitado/`false`, mensagens de erro em português cidadão -- AC 2
- `apps/web/components/pwa-installer.tsx` -- trocar emojis por `Rocket`, `Smartphone`, `X` (16px), nome via `env`, remover `ring-1` e `backdrop-blur-md` -- AC 4
- `apps/web/app/globals.css`, `packages/ui/src/tokens.ts`, `tokens.spec.ts` -- tokens `footer-*` nos dois temas; teste de contraste `footer-ink` e `footer-mute` sobre `footer-bg` ≥ 4,5:1 -- AC 9
- `apps/web/components/global-footer.tsx` -- fundo invertido, logo + nome, controles legíveis sobre o fundo invertido; renderizar a coluna só com conteúdo; grid de 2 colunas sem ela -- AC 5
- `packages/ui/src/components/sidebar.tsx` -- `motion-reduce:transition-none` no drawer e backdrop; sem animar ao cruzar `md` -- AC 6
- `packages/ui/src/tokens.spec.ts` (e `globals.css`/`tokens.ts` se falhar) -- teste `mute2` sobre `page` nos dois temas; se falhar, escurecer o token e documentar o valor no comentário de `globals.css` -- AC 7
- Specs: criar `push-notification-settings.spec.tsx`; atualizar `pwa-installer.spec.tsx`, `global-footer.spec.tsx` e testes do drawer -- AC 8

**Acceptance Criteria:**
- Given notificações bloqueadas, when o cidadão usa teclado ou toque, then as instruções de desbloqueio abrem por botão operável, em texto claro.
- Given falha ao ativar ou desativar (inclusive `unsubscribe()` rejeitado), when a ação termina, then aparece `role="alert"` e não há promessa rejeitada sem tratamento.
- Given o estado real ainda carrega, when o componente renderiza, then não exibe "Notificações desativadas" nem "ativas".
- Given os componentes PWA, when renderizados, then usam Lucide 16px, o nome vem de `env.NEXT_PUBLIC_PROJECT_NAME`, e não há `backdrop-blur` sobre fundo opaco nem `border` com `ring`.
- Given nem push nem instalação disponíveis, when o rodapé renderiza, then não há título "Neste dispositivo" e o grid tem duas colunas.
- Given `prefers-reduced-motion`, when o drawer abre, then não há animação de deslize.
- Given qualquer tema, when o rodapé renderiza, then o fundo é invertido em relação à página, o logo do MaisTransparencia aparece com o nome do app, e textos e controles têm contraste AA (coberto por teste).
- Given o teste de contraste, when roda, then `mute2` sobre `page` ≥ 4,5:1 nos dois temas.

## Spec Change Log

## Review Triage Log

### 2026-11-01 — Review pass
- verdicts: 36 findings agrupados — high 0, medium 3, low 4, false 3, maybe-false 0 (demais itens repetidos entre camadas, mesma causa)
- findings:
  - `[medium]` `patch` ausência de testes de hook para `unsubscribe()` falso/rejeitado e textos cidadãos — testes adicionados em `use-push-notifications.spec.ts`
  - `[medium]` `patch` `usePwaInstallAvailability` sem teste e rodapé sem caso sem slug — testes adicionados em `pwa-installer.spec.tsx` e `global-footer.spec.tsx`
  - `[medium]` `patch` erro não renderizado nos ramos bloqueado e carregando — `errorMessage` renderizado em todos os ramos, com asserção
  - `[low]` `reject` `fetch` de `/api/push/unsubscribe` sem checar `res.ok` — comportamento anterior à story (`.catch(() => null)` já existia); fora do escopo da intenção
  - `[low]` `reject` `unsubscribe` em navegador sem suporte mostra erro de desativar — caso inalcançável (componente retorna `null` sem suporte)
  - `[low]` `reject` spec duplicado em `__tests__/push-notification-settings.spec.tsx` — não causa dano; unificação fica para a varredura final
  - `[low]` `reject` flash de layout 2→3 colunas após hidratação e logo (favicon) azul fixo nos dois fundos — decisão de design aceita (único logo existente); sem verificação em navegador
  - `[false]` `reject` `.footer-surface` não reatribui `--mute3`/`--faint`/`--pill` — nenhum filho do rodapé usa esses tokens (grep em `global-footer.tsx` e `social-links.tsx`)
  - `[false]` `reject` mensagem de VAPID ausente deveria ser distinta — o detalhe técnico segue para o PostHog; texto cidadão é o exigido pela spec
  - `[false]` `reject` live region removida — `role="status"` mantido em cada rótulo de estado; sem evidência de falha de anúncio

## Verification

**Commands:**
- `pnpm typecheck` -- expected: sem erros
- `pnpm test` -- expected: todos os specs passam
- `pnpm exec biome check apps/web packages/ui` -- expected: sem erros

## Auto Run Result

Status: done

**Resumo:** shell acabado conforme a Story 20.10: instruções de desbloqueio por botão com `aria-expanded`; handler único `runAction` com `role="alert"` em todos os ramos; "Carregando…" enquanto o estado real não chega; ícones Lucide 16px e nome via `env`; sem `ring`/`backdrop-blur` redundantes; coluna "Neste dispositivo" só com conteúdo; drawer com `motion-reduce`; teste de contraste de `mute2` (passou sem escurecer o token). Pedido do Julio: rodapé com fundo invertido (tokens `footer-*` e `.footer-surface`) e logo `favicon.svg` ao lado do nome.

**Arquivos:** `globals.css`, `tokens.ts`, `tokens.spec.ts` (tokens e contraste do rodapé); `global-footer.tsx` e spec; `push-notification-settings.tsx` e spec; `use-push-notifications.ts` e spec; `pwa-installer.tsx` e spec (hook `usePwaInstallAvailability`); `sidebar.tsx` e spec.

**Revisão:** 3 patches aplicados (medium), 7 rejeitados com motivo no log, 0 adiados. Follow-up recomendado: false (2 ou mais medium corrigidos, mas todos eram lacunas de teste e de erro silencioso, sem risco não verificado de gravidade alta).

**Verificação:** `pnpm typecheck` e `biome` passam. `pnpm test`: tudo passa, exceto `styles/tokens-uso.spec.ts` ("não usa classes legadas sem sufixo -fill ou -text"), que já falhava antes (confirmado com stash) e pertence à Story 20.12.

**Riscos residuais:** sem verificação visual em navegador (inversão coberta por contraste e classes); `usePwaInstallAvailability` tem estado próprio, então o título da coluna pode permanecer até recarregar se o aviso nativo for dispensado.
