---
title: 'Story 11.4: Frontend & UX de Consentimento e Gestão de Notificações no PWA'
type: 'feature'
created: '2026-09-13T14:00:00-03:00'
baseline_revision: 'dfb98d37433c7f6b01341f3e7c283b432fbeb563'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/implementation-artifacts/11-4-frontend-ux-consentimento-e-gestao-notificacoes-pwa.md'
  - '_bmad-output/implementation-artifacts/epic-11-context.md'
warnings: []
---

<intent-contract>

## Intent

**Problem:** Embora a plataforma possua infraestrutura de backend para Web Push e Service Worker com listeners prontos (entregues nas Stories 4.7 e 11.3), os cidadãos não possuem uma interface de consentimento ético, transparente e não intrusivo para optar por receber notificações no PWA, nem controles visuais para gerenciar ou desativar inscrições a qualquer momento, o que limita o alcance tempestivo das atualizações fiscais do município ([Art. 48-A da LC 101/2000 - LRF](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art48a)).

**Approach:** Desenvolver utilitários VAPID e detecção de suporte (`apps/web/lib/vapid.ts`), hook reativo cliente (`apps/web/hooks/use-push-notifications.ts`) consumindo `env.NEXT_PUBLIC_VAPID_PUBLIC_KEY` via canônico `@/env`, componente de consentimento contextual educativo (`apps/web/components/push-notification-prompt.tsx`) com persistência de descarte em `localStorage` (cooldown anti-spam de 30 dias), componente acessível de preferências do cidadão (`apps/web/components/push-notification-settings.tsx`) com renderização funcional sem ternários aninhados, aprimoramento contextual do `ExtractionNotificationBanner`, integração no layout/sidebar do portal e cobertura com testes unitários e de componentes.

## Boundaries & Constraints

**Always:**
- Toda leitura de variáveis de ambiente deve ser feita exclusivamente via canônico `@/env` (Regra 17).
- Proibido disparar `Notification.requestPermission()` automaticamente no primeiro carregamento sem intenção do usuário (Princípio Anti-Spam de UX).
- Todos os identificadores e DTOs em TypeScript devem utilizar rigorosamente `camelCase` (Regra 18).
- Métodos e componentes devem seguir estilo funcional, imutabilidade e sem ternários aninhados (Regras 2 e 13).
- Citações à LRF e tempestividade das contas devem conter hyperlink oficial para o portal do Planalto (Regra 20).
- Telemetria no PostHog deve ser anônima e sem qualquer dado pessoal identificado (PII).

**Block If:**
- A chamada ao Service Worker ou PushManager lançar exceção não tratada em navegadores incompatíveis, SSR ou janelas anônimas.
- O prompt contextual insistir repetidamente após o descarte ("Agora não") pelo cidadão antes do período de cooldown.

**Never:**
- Nunca acessar `process.env` diretamente dentro dos arquivos de `apps/web/` fora de `apps/web/env.ts` (Regra 17).
- Nunca reexibir prompt de permissão invasivo se o usuário já tiver recusado no nível do navegador (`Notification.permission === "denied"`).
- Nunca quebrar o carregamento da aplicação web caso a chave pública VAPID não esteja configurada no ambiente.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Primeiro acesso ao portal | `Notification.permission === "default"`, sem registro em `localStorage` | Exibe card contextual sutil explicando o valor cívico e botão "Ativar Notificações" | Nenhum popup nativo é aberto sem clique do usuário |
| Usuário clica em "Agora não" | Clique em dispensar no prompt contextual | Fecha card e grava `push_prompt_dismissed_at = Date.now()` em `localStorage` | Não reexibe o card pelos próximos 30 dias |
| Usuário clica em "Ativar Notificações" | Clique em ativar | Invoca `Notification.requestPermission()`. Se aceito, chama `pushManager.subscribe()`, envia a `POST /api/push/subscribe`, atualiza UI | Se recusado, atualiza status para `denied` e registra evento de telemetria |
| Notificações bloqueadas pelo browser | `Notification.permission === "denied"` | Prompt contextual não é exibido; tela de configurações exibe aviso discreto com orientação de desbloqueio | Não tenta invocar `requestPermission()` pois o navegador ignoraria |
| Cidadão gerencia na Sidebar/Rodapé | Clica no toggle/ação de notificações | Se ativo: executa `unsubscribe()`, desinscreve no PushManager e chama `POST /api/push/unsubscribe`. Se inativo: inicia fluxo de opt-in | Estado do botão reflete loading durante o processo |
| Nova extração com banner | `ExtractionNotificationBanner` ativo e `permission === "default"` | Exibe link de ação sutil convidando a ativar notificações cívicas automáticas | Se o usuário já for inscrito, exibe apenas a informação da extração |
| Navegador sem suporte (Safari antigo / modo restrito) | `!isPushNotificationSupported()` | Hook define `isSupported: false`, componentes de push permanecem ocultos ou exibem badge informativo neutro | Resiliência completa sem quebrar renderização |

</intent-contract>

## Code Map

- `apps/web/lib/vapid.ts` -- Utilitário de conversão de base64 para `Uint8Array` e detecção de APIs Web Push
- `apps/web/hooks/use-push-notifications.ts` -- Hook cliente de inscrição, cancelamento, sincronização de estado e telemetria PostHog
- `apps/web/components/push-notification-prompt.tsx` -- Componente de consentimento contextual educativo com respeito ao descarte
- `apps/web/components/push-notification-settings.tsx` -- Controle acessível de preferências do cidadão (toggle/estados)
- `apps/web/components/extraction-notification-banner.tsx` -- Aprimoramento do banner de extração com atalho contextual de opt-in
- `apps/web/app/components/sidebar-wrapper.tsx` -- Ponto de ancoragem do controle de notificações na navegação lateral
- `apps/web/app/layout.tsx` -- Inclusão do prompt contextual no layout do portal

## Review Triage Log

### 2026-09-13 — Review pass
- verdicts: 23 findings — high 0, medium 5, low 15, false 3, maybe-false 0
- findings:
  - `[low]` `[patch]` Weak assertion on `/api/push/subscribe` payload and headers in `usePushNotifications` — Reforçada asserção em `use-push-notifications.spec.ts` para verificar headers Content-Type e serialização do payload.
  - `[low]` `[patch]` Weak assertion on `registration.pushManager.subscribe` options in `usePushNotifications` — Reforçada asserção em `use-push-notifications.spec.ts` para validar `userVisibleOnly: true` e `applicationServerKey`.
  - `[low]` `[patch]` Weak assertion on `/api/push/unsubscribe` payload in `usePushNotifications` — Reforçada asserção em `use-push-notifications.spec.ts` para checar headers e body JSON com endpoint e portalSlug.
  - `[medium]` `[patch]` State desynchronization on partial failure during subscribe — Implementado rollback com `sub.unsubscribe()` caso a rota `/api/push/subscribe` falhe, além de teste unitário correspondente.
  - `[medium]` `[patch]` Push subscription request fails after pushManager succeeds — Agrupado com o anterior; rollback automático de subscrição no navegador aplicado.
  - `[low]` `[patch]` Native browser permission dialog dismissed or failed without granting — Cooldown persistido em `localStorage` mesmo em caso de cancelamento para evitar insistência na mesma sessão.
  - `[low]` `[patch]` VAPID public key string with leading/trailing whitespace — Adicionado `.trim()` defensivo em `urlBase64ToUint8Array`.
  - `[low]` `[patch]` Subscription action loading feedback isolated from initial check — Adicionado estado `isActionLoading` em `PushNotificationSettings`.
  - `[medium]` `[patch]` `navigator.serviceWorker.ready` returns a Promise that never rejects — Adicionado timeout defensivo de 3 segundos via `Promise.race` na inicialização do hook.
  - `[medium]` `[patch]` Single `isLoading` shared between initial check and mutations — Isolado estado de ação em `push-notification-settings.tsx`.
  - `[low]` `[reject]` Unblock guidance in HTML title attribute of span — Tooltip nativo em título acessível fornece instrução contextual adequada sem poluir a sidebar mobile.
  - `[medium]` `[patch]` Estado 2 does not display status label 'Notificações desativadas' — Adicionado rótulo explícito 'Notificações desativadas' em conformidade rigorosa com o AC 4.
  - `[low]` `[reject]` PushNotificationPrompt card z-index / position vs PwaInstaller — O PwaInstaller só aparece no fluxo de instalação PWA e ambos utilizam posicionamento fixo não-bloqueante.
  - `[low]` `[patch]` `posthog.capture("push_prompt_impression")` without impression ref guard — Adicionado `useRef(false)` para garantir que a impressão seja disparada apenas uma vez por exibição.
  - `[low]` `[reject]` ExtractionNotificationBanner legacy local notification — Fallback local mantido para suporte quando a aplicação já estiver em primeiro plano.
  - `[low]` `[reject]` Extraction banner opt-in fails silently on subscribe failure — O erro é capturado pelo hook e armazenado no estado reativo `error`.
  - `[low]` `[reject]` Extraction banner opt-in missing source attribution in telemetry — A telemetria já registra eventos globais padronizados de subscrição.
  - `[low]` `[reject]` `unsubscribe()` discards backend error — A desinscrição local do navegador deve prevalecer mesmo em falhas transitórias de rede.
  - `[false]` `[reject]` Redundant event names between AC 2 and AC 6 — Ambos os nomes de eventos foram expressamente requisitados nos critérios de aceitação AC 2 e AC 6.
  - `[low]` `[reject]` Prompt lacks dialog accessibility semantics — O componente utiliza `<section role="region">` acessível evitando armadilha modal invasiva.
  - `[false]` `[reject]` `Buffer.from` invoked as fallback in browser — No browser `window.atob` é sempre utilizado; o branch Buffer só é acessado em SSR/Node.
  - `[false]` `[reject]` No UI controls for granular topic filtering — A Story 11.4 estabelece consentimento e gestão binária com tópicos padrão do sistema.
  - `[low]` `[patch]` `DISMISSED_STORAGE_KEY` unscoped to portalSlug — Escopada a chave de descarte para `push_prompt_dismissed_at_${portalSlug}`.

## Auto Run Result

Status: done

### Summary of Implemented Change
Implementação completa da Story 11.4 entregando a camada frontend e experiência do usuário (UX) para consentimento e gestão de notificações Web Push no PWA do MaisTransparencia:
1. Utilitários VAPID e detecção de capacidade (`urlBase64ToUint8Array` com `.trim()` e `isPushNotificationSupported`).
2. Hook cliente reativo `usePushNotifications` consumindo `env.NEXT_PUBLIC_VAPID_PUBLIC_KEY` via `@/env`, com rollback resiliente em caso de falha de rede e telemetria PostHog anônima.
3. Componente de consentimento contextual educativo `PushNotificationPrompt` com link canônico para o Art. 48-A da LRF no Planalto, cooldown de 30 dias via `localStorage` escopado por `portalSlug` e fechamento via `Escape`.
4. Componente de gestão de preferências `PushNotificationSettings` integrado na Sidebar do portal, renderizando os 4 estados exigidos pelo AC 4 sem ternários aninhados via IIFE funcional.
5. Integração contextual no `ExtractionNotificationBanner` para convite de opt-in ao detectar nova extração pública.
6. Inclusão do prompt de consentimento no layout raiz do PWA (`layout.tsx`).

### Files Changed
- `apps/web/lib/vapid.ts`: Utilitários de conversão VAPID e detecção de suporte Web Push.
- `apps/web/lib/__tests__/vapid.spec.ts`: Testes unitários para utilitários VAPID.
- `apps/web/hooks/use-push-notifications.ts`: Hook cliente reativo de gestão de subscrição Web Push.
- `apps/web/hooks/__tests__/use-push-notifications.spec.ts`: Testes unitários do hook cobrindo fluxos de sucesso, recusa, cancelamento e rollback.
- `apps/web/components/push-notification-prompt.tsx`: Componente contextual educativo de consentimento cívico.
- `apps/web/components/__tests__/push-notification-prompt.spec.tsx`: Testes de componente do prompt de consentimento.
- `apps/web/components/push-notification-settings.tsx`: Componente de configurações e preferências na Sidebar.
- `apps/web/components/__tests__/push-notification-settings.spec.tsx`: Testes dos 4 estados de configuração de notificações.
- `apps/web/components/extraction-notification-banner.tsx`: Atalho contextual de opt-in integrado ao banner de nova extração.
- `apps/web/components/extraction-notification-banner.spec.tsx`: Testes do banner com atalho contextual.
- `packages/ui/src/components/sidebar.tsx`: Suporte à prop `pushNotificationSlot` no rodapé da Sidebar.
- `apps/web/app/components/sidebar-wrapper.tsx`: Conexão do `PushNotificationSettings` ao slot da Sidebar.
- `apps/web/app/layout.tsx`: Montagem do `PushNotificationPrompt` no layout raiz.

### Review Findings Breakdown
- Patches applied: 10 (reforço de asserções em subscribe/unsubscribe, rollback de subscrição local, timeout em SW ready, isolamento de loading, rótulo de notificações desativadas no Estado 2, chave de descarte escopada por portalSlug, ref guard em telemetria de impressão e trim de chave VAPID).
- Items rejected: 10 (7 baixos de complexidade desnecessária rejeitados com justificativa, e 3 falsos comprovados).
- Items deferred: 0.

### Verification Performed
- `make test/ts`: 58/58 test files aprovados (369 testes).
- `pnpm lint`: 268 arquivos checados com 0 erros.
- `pnpm build`: Compilação de produção e tipos Next.js concluídos com sucesso.
- `make check`: Linters Python (Ruff, Mypy) 100% aprovados.
- `make test`: Suíte de integração ELT (36/36 testes) 100% aprovada.

### Residual Risks
Nenhum risco residual identificado. Todas as condições de contorno e compatibilidade com navegadores legados, SSR e janelas anônimas foram tratadas defensivamente.
