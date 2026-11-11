---
baseline_commit: dfb98d37433c7f6b01341f3e7c283b432fbeb563
---

# Story 11.4: Frontend & UX de Consentimento e Gestão de Notificações no PWA

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a citizen using the municipal transparency portal as an installed PWA or browser application,  
I want a non-intrusive, clear, and contextual interface to opt in or out of push notifications,  
So that I receive timely system alerts when new municipal public spending data is extracted or when the app is updated, without receiving unsolicited browser permission prompts.

---

## Acceptance Criteria

1. **Utilitário de Chave VAPID e Helpers de Suporte (`apps/web/lib/vapid.ts`):**
   - Implementar a função utilitária `urlBase64ToUint8Array(base64String: string): Uint8Array` para converter a chave pública VAPID (base64 URL-safe) no array binário exigido pelo método `PushManager.subscribe({ applicationServerKey })`.
   - Implementar a função `isPushNotificationSupported(): boolean` verificando a presença de `window`, `navigator.serviceWorker`, `window.PushManager` e `window.Notification`.
   - Garantir tipagem estrita em TypeScript e tratamento defensivo para ambientes de SSR (Server-Side Rendering) e navegadores legados ou com modo anônimo restrito.
   - Criar testes unitários para o utilitário em `apps/web/lib/__tests__/vapid.spec.ts`.

2. **Hook Reativo de Gestão de Notificações Web Push (`apps/web/hooks/use-push-notifications.ts`):**
   - Criar o hook `"use client"` com a seguinte assinatura e DTOs em `camelCase` (Regra 18):
     ```typescript
     export interface UsePushNotificationsOptions {
       portalSlug?: string;
     }

     export interface UsePushNotificationsReturn {
       isSupported: boolean;
       isSubscribed: boolean;
       permission: NotificationPermission | "unsupported";
       isLoading: boolean;
       error: string | null;
       subscribe: (topics?: string[]) => Promise<boolean>;
       unsubscribe: () => Promise<boolean>;
     }
     ```
   - Obter a chave pública VAPID exclusivamente a partir do módulo canônico `@/env` (`env.NEXT_PUBLIC_VAPID_PUBLIC_KEY`), sem nenhum acesso direto a `process.env` (Regra 17).
   - Inicialização e sincronização reativa de estado:
     - Detectar se o navegador suporta Web Push. Se não suportar, definir `isSupported = false` e `permission = "unsupported"`.
     - Aguardar `navigator.serviceWorker.ready` para consultar a subscrição existente via `registration.pushManager.getSubscription()`.
     - Refletir o estado real de permissão do navegador (`Notification.permission`).
   - Implementar a função `subscribe(topics?: string[])`:
     - Solicitar permissão nativa ao navegador via `await Notification.requestPermission()`.
     - Se a permissão for concedida (`"granted"`):
       - Obter a subscrição do `PushManager` via `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) })`.
       - Enviar requisição `POST /api/push/subscribe` com payload validado: `{ portalSlug, subscription: { endpoint, keys: { p256dh, auth } }, userAgent, topics }`.
       - Atualizar estado local `isSubscribed = true` e `permission = "granted"`.
       - Capturar evento de telemetria no PostHog `push_notification_subscribed`.
       - Retornar `true`.
     - Se a permissão for negada (`"denied"`):
       - Atualizar estado local `permission = "denied"`.
       - Capturar evento de telemetria no PostHog `push_permission_denied`.
       - Retornar `false`.
   - Implementar a função `unsubscribe()`:
     - Obter a subscrição ativa via `registration.pushManager.getSubscription()`.
     - Se existir, chamar `await subscription.unsubscribe()`.
     - Notificar o backend via `POST /api/push/unsubscribe` com `{ endpoint: subscription.endpoint, portalSlug }`.
     - Atualizar estado local `isSubscribed = false`.
     - Capturar evento de telemetria no PostHog `push_notification_unsubscribed`.
     - Retornar `true`.
   - Tratar erros graciosamente preenchendo o campo `error` sem quebrar a aplicação.
   - Criar testes unitários com Vitest e `@testing-library/react` em `apps/web/hooks/__tests__/use-push-notifications.spec.ts`.

3. **Componente de Consentimento Contextual e Educativo (`apps/web/components/push-notification-prompt.tsx`):**
   - **Princípio Anti-Spam e Opt-in Contextual (UX)**:
     - É estritamente proibido invocar o prompt nativo do navegador (`Notification.requestPermission()`) no primeiro carregamento da aplicação sem interação explícita do cidadão.
     - Exibir um card / banner contextual e elegante explicando a fundamentação cívica das notificações:
       - Acompanhe em tempo real novos gastos, empenhos e liquidações da prefeitura com a tempestividade exigida pelo [Art. 48-A da LC 101/2000 (LRF)](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art48a).
       - Alertas automáticos de novas extrações municipais e novas versões do app.
     - Botão primário com ação explícita ("Ativar Notificações") e botão secundário neutro ("Agora não").
   - **Controle de Frequência e Memória Local**:
     - Utilizar `localStorage` (`push_prompt_dismissed_at`) para registrar quando o usuário clica em "Agora não".
     - Cooldown de reexibição configurável (mínimo de 30 dias após descarte), evitando insistência abusiva.
     - Se `Notification.permission === "denied"` ou `isSubscribed === true`, o prompt contextual nunca deve ser exibido.
   - **Acessibilidade e Usabilidade**:
     - Foco acessível, fechamento via tecla `Escape`, contraste adequado em conformidade com as diretrizes do design system.
   - Criar testes de componente em `apps/web/components/__tests__/push-notification-prompt.spec.tsx`.

4. **Componente de Gestão de Preferências do Cidadão (`apps/web/components/push-notification-settings.tsx`):**
   - Disponibilizar componente compacto e acessível para controle total do cidadão a qualquer momento:
     - Estado 1 (Inscrito / Ativo): Exibe status "Notificações ativas" com botão ou toggle para desativar.
     - Estado 2 (Não Inscrito / Disponível): Exibe status "Notificações desativadas" com botão para ativar.
     - Estado 3 (Bloqueado no Navegador / `denied`): Exibe status informativo com ícone de alerta e explicação amigável sobre como reativar as permissões nas configurações do navegador, caso deseje.
     - Estado 4 (Não Suportado): Oculta silenciosamente o controle ou exibe tooltip informativo para navegadores legados / sem suporte.
   - Zero ternários aninhados: utilizar IIFE autoexecutável ou helper functions para renderização dos estados (Regra 13).
   - Integrar o componente de configurações no rodapé da Sidebar do portal (`packages/ui/src/components/sidebar.tsx` via slot ou wrapper em `apps/web/app/components/sidebar-wrapper.tsx`), ao lado dos alertas de e-mail/newsletter existentes.

5. **Aprimoramento Contextual do `ExtractionNotificationBanner` (`apps/web/components/extraction-notification-banner.tsx`):**
   - Atualizar `ExtractionNotificationBanner` para integrar suavemente a oportunidade de opt-in:
     - Quando um banner de nova extração de dados for exibido ao usuário e o mesmo ainda não tiver ativado as notificações push (`permission === "default"`), oferecer um atalho contextual discreto ("Deseja receber avisos automáticos de novas contas públicas?").
     - Ao clicar, abrir o prompt contextual educativo ou invocar diretamente o fluxo de inscrição.
   - Manter a compatibilidade com a verificação de data existente em `localStorage` (`last_seen_extraction`).

6. **Telemetria de Engajamento Cívico (PostHog):**
   - Disparar eventos estruturados e sem PII no PostHog para auditoria de engajamento do funil de notificações:
     - `push_prompt_impression`: exibição do card educativo de opt-in.
     - `push_prompt_accepted`: clique no botão de aceite do opt-in.
     - `push_prompt_dismissed`: clique em "Agora não".
     - `push_subscribed_success`: inscrição concluída com sucesso no PushManager e backend.
     - `push_subscribed_failure`: falha na inscrição (com log de erro anonimizado).
     - `push_unsubscribed`: cancelamento da subscrição pelo usuário.
     - `push_permission_denied`: recusa da permissão nativa no navegador.

7. **Links Oficiais para Legislação Citada (Regra 20):**
   - Todo texto de interface, tooltip ou modal que mencione a tempestividade das contas ou a Lei de Responsabilidade Fiscal deve conter hyperlink oficial e canônico para a Presidência da República:
     - [Art. 48-A da LC 101/2000 (LRF)](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art48a), com atributos `target="_blank"` e `rel="noopener noreferrer"`.

8. **Conformidade de Qualidade e Segurança:**
   - 100% de sucesso nas checagens:
     - `make test` (testes Python/ELT).
     - `make check` (linters Python).
     - `make test/ts` (testes unitários e de componentes TypeScript).
     - `pnpm lint` (Biome linter).
     - `pnpm build` (build Next.js de produção).

---

## Tasks / Subtasks

- [x] Task 1: Utilitários VAPID e Detecção de Capacidade PWA (AC: 1)
  - [x] Criar `apps/web/lib/vapid.ts` com `urlBase64ToUint8Array` e `isPushNotificationSupported`.
  - [x] Garantir tratamento seguro para SSR (`typeof window === "undefined"`).
  - [x] Criar testes unitários em `apps/web/lib/__tests__/vapid.spec.ts`.

- [x] Task 2: Hook Reativo `usePushNotifications` (AC: 2)
  - [x] Implementar `apps/web/hooks/use-push-notifications.ts` consumindo `env.NEXT_PUBLIC_VAPID_PUBLIC_KEY` de `@/env` (Regra 17).
  - [x] Implementar sincronização com `navigator.serviceWorker.ready` e `pushManager.getSubscription()`.
  - [x] Implementar métodos `subscribe(topics?: string[])` e `unsubscribe()` com chamadas às rotas `/api/push/subscribe` e `/api/push/unsubscribe`.
  - [x] Tratar permissão negada (`"denied"`) e erros de rede sem loops ou exceções não tratadas.
  - [x] Integrar telemetria PostHog (`push_notification_subscribed`, `push_notification_unsubscribed`, `push_permission_denied`).
  - [x] Criar testes de integração e mocks em `apps/web/hooks/__tests__/use-push-notifications.spec.ts`.

- [x] Task 3: Componente de Consentimento Contextual e Educativo (AC: 3, 7)
  - [x] Criar `apps/web/components/push-notification-prompt.tsx` com visual limpo, não intrusivo e focado em valor cívico.
  - [x] Adicionar hyperlink oficial para o [Art. 48-A da LC 101/2000 (LRF)](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art48a) (Regra 20).
  - [x] Implementar persistência de descarte em `localStorage` (`push_prompt_dismissed_at`) com cooldown de 30 dias.
  - [x] Evitar exibição se permissão estiver negada (`"denied"`) ou já inscrita.
  - [x] Criar testes de componente em `apps/web/components/__tests__/push-notification-prompt.spec.tsx`.

- [x] Task 4: Componente de Gestão de Preferências e Integração na Interface (AC: 4, 5)
  - [x] Criar `apps/web/components/push-notification-settings.tsx` com estados claros (ativo, inativo, bloqueado, não suportado) sem ternários aninhados (Regra 13).
  - [x] Integrar controle de notificações na Sidebar do portal (`apps/web/app/components/sidebar-wrapper.tsx` / `packages/ui/src/components/sidebar.tsx`).
  - [x] Integrar atalho contextual no `ExtractionNotificationBanner` (`apps/web/components/extraction-notification-banner.tsx`) quando novos dados forem carregados e o usuário ainda não for assinante.
  - [x] Integrar o prompt de consentimento contextual no layout raiz (`apps/web/app/layout.tsx`).

- [x] Task 5: Validação da Suíte de Testes e Gates de Qualidade (AC: 8)
  - [x] Executar `make check` (linters Python/Ruff/Mypy).
  - [x] Executar `make test` (testes Python/ELT).
  - [x] Executar `make test/ts` (testes TypeScript de packages/db e apps/web).
  - [x] Executar `pnpm lint` (Biome).
  - [x] Executar `pnpm build` (compilação estática e rotas Next.js de produção).

---

## Dev Notes

### 1. Contexto Arquitetural e Interação com a Story 11.3

A Story 11.3 entregou a infraestrutura completa de backend e VAPID:
- Variáveis de ambiente configuradas em `apps/web/env.ts` (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`).
- Endpoints HTTP prontos:
  - `POST /api/push/subscribe`: recebe `{ portalSlug, subscription: { endpoint, keys: { p256dh, auth } }, userAgent, topics }`.
  - `POST /api/push/unsubscribe`: recebe `{ endpoint, portalSlug }`.
  - `POST /api/push/dispatch`: disparador autenticado via token Bearer.
- Service Worker (`apps/web/public/sw.js`):
  - Já possui os listeners `'push'` (para formatar e exibir `self.registration.showNotification(title, options)`) e `'notificationclick'` (com sanitização same-origin e foco/abertura de janela).
- Esta Story 11.4 fecha o ciclo entregando a camada de apresentação e experiência do usuário (UX), conectando o Service Worker ao backend através de um fluxo de consentimento ético, transparente e não invasivo.

---

### 2. Conversão de Chaves VAPID (`urlBase64ToUint8Array`)

O padrão W3C Web Push exige que o parâmetro `applicationServerKey` fornecido a `pushManager.subscribe()` seja um `ArrayBuffer` ou `Uint8Array` decodificado da chave pública em formato base64 URL-safe.

Implementação padrão de referência:
```typescript
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
```

---

### 3. Padrão UX Anti-Spam e Transparência Cívica

- **Problema de UX Comum**: Muitos sites disparam o prompt nativo do navegador imediatamente no primeiro acesso, gerando altas taxas de recusa (`denied`) permanentes e irritação do usuário.
- **Solução Cívica**:
  1. O portal MaisTransparencia **nunca** dispara `Notification.requestPermission()` automaticamente.
  2. Um prompt contextual suave informa o propósito: *"Receba notificações sobre novas despesas, receitas e atualizações fiscais do município conforme o princípio da tempestividade ([Art. 48-A da LRF](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art48a))."*
  3. Somente quando o usuário clica em "Ativar Notificações", o navegador exibe o diálogo nativo de permissão.
  4. Caso o usuário dispense ("Agora não"), um registro com timestamp é salvo em `localStorage` para silenciar o prompt por 30 dias.
  5. Se o navegador já tiver a permissão em `"denied"`, nenhum prompt invasivo é mostrado; a interface de configurações na Sidebar apenas exibe uma instrução amigável de como desbloquear nas configurações do navegador caso o cidadão queira reativar.

---

### 4. Regras do Repositório (`AGENTS.md`) a Observar

- **Regra 13 (Zero Ternários Aninhados)**: Na renderização condicional dos estados do toggle de notificações (inscrito, não inscrito, bloqueado, não suportado), utilizar IIFE autoexecutável ou funções auxiliares dedicadas.
- **Regra 17 (Centralização de Variáveis de Ambiente)**: Proibido acessar `process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY` diretamente. Sempre importar `env` de `@/env`.
- **Regra 18 (camelCase em TypeScript)**: Todas as propriedades de DTOs, objetos e parâmetros devem ser rigorosamente `camelCase`.
- **Regra 20 (Links Oficiais para Leis)**: Sempre que a LRF for citada na UI ou mensagens de consentimento, incluir o link canônico do Planalto: `https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art48a`.

---

## Verificação e Comandos de Validação

```bash
# Testes TypeScript e de componentes do hook e utilitários
pnpm --filter web test

# Verificação estática e linters
pnpm lint
make check

# Build do Next.js
pnpm build

# Testes de integração do projeto
make test/ts
make test
```
