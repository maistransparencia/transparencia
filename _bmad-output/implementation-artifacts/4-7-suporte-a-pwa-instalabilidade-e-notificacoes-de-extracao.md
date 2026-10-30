---
baseline_commit: 0537f5c
generated_at: 2026-08-08T00:29:00-03:00
---

# Story 4.7: Suporte a PWA (Progressive Web App - Instalabilidade e Notificações de Extração)

## Metadados

- Epic: 4 - Experiência Visual, Responsividade Mobile, SEO & Otimização para LLMs
- Story ID: 4.7
- Story Key: 4-7-suporte-a-pwa-instalabilidade-e-notificacoes-de-extracao
- Status: done
- Arquivo: _bmad-output/implementation-artifacts/4-7-suporte-a-pwa-instalabilidade-e-notificacoes-de-extracao.md

## User Story

Como munícipe / usuário do portal de transparência municipal,
Quero que a plataforma MaisTransparencia funcione como um Progressive Web App (PWA) instalável no meu navegador e capaz de enviar notificações quando novos dados fiscais de extração forem publicados,
Para que eu possa acessar rapidamente os dados de transparência pública a partir da tela inicial do meu dispositivo e me manter informado imediatamente sobre a atualização de contas do município.

## Critérios de Aceitação (BDD)

**Given** um munícipe acessando a aplicação web em um navegador compatível (Chrome, Safari, Edge, Firefox)
**When** a aplicação é carregada no navegador
**Then** o Next.js App Router deve expor a rota nativa de manifesto (`apps/web/app/manifest.ts`) gerando `manifest.webmanifest` com `name: "MaisTransparencia - Transparência Pública Municipal"`, `short_name: "MaisTransparencia"`, `theme_color: "#1e3a8a"`, `background_color: "#0f172a"`, `display: "standalone"`, `start_url: "/"`, e ícones em resoluções 192x192 e 512x512 (`/favicon-192.png` e `/favicon-512.png`).
**And** os ícones PNG de 192x192 e 512x512 devem ser gerados sem perda de qualidade a partir da renderização vetorial exata do SVG existente (`apps/web/public/favicon.svg`).
**And** o navegador deve habilitar o prompt de instalação nativo ("Adicionar à Tela de Início" / "Instalar App").

**Given** a execução da aplicação web em segundo plano ou em cenários de baixa conectividade
**When** o Service Worker for registrado (`/sw.js`)
**Then** o Service Worker deve utilizar uma chave de cache dinamicamente versionada pelo build do projeto (`CACHE_NAME = "transparenciaweb-cache-" + BUILD_ID`) para realizar o pré-caching do app shell (ativos estáticos, ícones, fontes e layout base) utilizando estratégia cache-first para estáticos e network-first para rotas dinâmicas do portal sem interferir no roteamento do Next.js.
**And** quando uma nova versão da aplicação for lançada, o Service Worker deve purgar a chave de cache anterior no evento `activate`.

**Given** uma atualização do aplicativo implantada em produção (novo Service Worker disponível)
**When** o navegador detectar que um novo Service Worker está no estado `waiting` / `updatefound`
**Then** o componente `PwaInstaller` / `AppUpdateBanner` deve interceptar o evento e exibir uma notificação visual proeminente ao usuário ("Nova versão da aplicação disponível! Clique para atualizar").
**And** ao clicar no botão de atualização, a aplicação deve postar a mensagem `SKIP_WAITING` para o novo Service Worker e recarregar a janela (`window.location.reload()`) para que o usuário consuma imediatamente os ativos e códigos atualizados.

**Given** o lançamento de uma nova carga de dados no banco de dados (`dataExtracao` atualizado em `dim_portais` / `dim_metadata`)
**When** o munícipe concede permissão de notificação no navegador (`Notification.requestPermission()`)
**Then** a aplicação deve comparar `dataExtracao` obtido do `getPortalConfig()` com o registro local (`localStorage.getItem("last_seen_extraction")`).
**And** se a data de extração for mais recente do que a última visualizada pelo usuário, o portal deve disparar uma Notificação Web nativa (`Notification` / `showNotification`) e exibir um banner discreto informando que novos dados de contas públicas foram disponibilizados.
**And** ao confirmar a leitura, a nova data deve ser gravada em `localStorage`.

**Given** a execução dos gates de validação e compilação
**When** forem executados os comandos `make test`, `pnpm test` e `pnpm build`
**Then** todas as suítes de testes fiscais (dbt/Python), testes de tipos/contratos (TypeScript/Kysely) e a compilação do Next.js devem rodar e passar com 100% de sucesso sem avisos ou erros.

## Contexto da Epic e Valor

- A Epic 4 garante que a plataforma MaisTransparencia atinja o estado da arte em experiência do usuário, responsividade mobile, SEO, integração com IAs/LLMs e tecnologias web modernas.
- A adição do suporte a PWA (Progressive Web App) transforma o portal web em um aplicativo instalável sem a necessidade de lojas de aplicativos (App Store / Play Store), oferecendo acesso instantâneo na tela inicial do smartphone do cidadão.
- A funcionalidade de Notificações de Carga de Extração capacita a cidadania ativa, alertando o munícipe assim que a prefeitura realiza novas cargas de empenhos, liquidações, receitas e contratos no banco de dados.

## Guardrails Arquiteturais Obrigatórios

### AD-5 e Multi-tenant
1. O Service Worker e o manifesto devem respeitar a estrutura de URLs multi-tenant (`/[portalSlug]`).
2. Notificações de extração de dados devem indicar explicitamente a entidade municipal correspondente (ex: `"Novos dados fiscais atualizados para Prefeitura de Porciúncula"`).

### AGENTS.md e Protocolos de Qualidade
1. **Nomes Explícitos**: Nenhuma abreviação opaca (`sw`, `pwa`, `notif`, `btn`). Utilizar identificadores descritivos (`serviceWorkerRegistration`, `pwaInstallerComponent`, `extractionNotificationBanner`, `lastSeenExtractionDate`).
2. **Programação Funcional**: Manter imutabilidade no gerenciamento de estados locais e manipuladores de eventos.
3. **Versões Pinned**: Utilizar os tipos nativos do Next.js (`MetadataRoute.Manifest`) e APIs nativas dos navegadores (Service Worker API e Web Notification API) sem adicionar dependências externas desnecessárias.
4. **Validação Estrita**: `make test` (Python/dbt), `pnpm test` (TypeScript/Kysely) e `pnpm build` devem passar com 100% de sucesso.

## Aprendizados das Stories Anteriores (4.1 a 4.6)

- **Story 4.1**: Suporte a favicon e ícones em `apps/web/public/` e `apps/web/app/layout.tsx` foi estabelecido.
- **Story 4.5**: As rotas estáticas `/llms.txt` e `/llms-full.txt` foram criadas em `apps/web/public/`.
- **Story 4.6**: `apps/web/app/layout.tsx` e `apps/web/lib/metadata.ts` utilizam `formatBaseUrl` e `metadataBase`. `getPortalConfig()` fornece a propriedade `dataExtracao` (ex: `"2026-08-01"` ou data ISO).

---

## Tasks / Subtasks

- [x] **Task 1: Criação do Manifesto PWA (`apps/web/app/manifest.ts`) e Ícones de Alta Resolução a partir de SVG Vetorial** (AC: #1)
  - [x] Criar `apps/web/app/manifest.ts` exportando `default function manifest(): MetadataRoute.Manifest`.
  - [x] Configurar `name: "MaisTransparencia - Transparência Pública Municipal"`, `short_name: "MaisTransparencia"`, `description`, `start_url: "/"`, `display: "standalone"`, `background_color: "#0f172a"`, `theme_color: "#1e3a8a"`.
  - [x] Gerar os ícones `favicon-192.png` e `favicon-512.png` em `apps/web/public/` via renderização vetorial de alta definição diretamente a partir de `apps/web/public/favicon.svg` para manter nitidez máxima.
  - [x] Configurar a matriz `icons` no `manifest.ts` referenciando 192x192 e 512x512 com `purpose: "maskable"`.

- [x] **Task 2: Implementação do Service Worker de Caching, Versionamento Dinâmico e Suporte Offline (`apps/web/public/sw.js`)** (AC: #2)
  - [x] Criar `apps/web/public/sw.js` utilizando chave de cache versionada dinamicamente pelo build (`transparenciaweb-cache-${BUILD_ID}`).
  - [x] Implementar manipulador do evento `install` para realizar pré-caching do app shell (`/`, `/manifest.webmanifest`, `/favicon.svg`, `/favicon-192.png`, `/favicon-512.png`).
  - [x] Implementar manipulador do evento `activate` para limpeza automática de caches velhos de compilações anteriores.
  - [x] Implementar manipulador do evento `fetch` utilizando estratégia cache-first para ativos estáticos e network-first para rotas dinâmicas.
  - [x] Adicionar manipulador do evento `message` para escutar comando `SKIP_WAITING` enviado pela interface no momento de atualização.
  - [x] Adicionar suporte a eventos `push` e `notificationclick` para notificações do navegador.

- [x] **Task 3: Registro do Service Worker, Detecção de Atualizações de Código e Componente PWA (`apps/web/components/pwa-installer.tsx`)** (AC: #1, #2, #3)
  - [x] Criar componente client-side `apps/web/components/pwa-installer.tsx`.
  - [x] Registrar o Service Worker `/sw.js` quando `'serviceWorker' in navigator` na montagem do componente.
  - [x] Adicionar listener de atualização (`updatefound` / `reg.waiting`) para detectar novos deploys e exibir o banner/toast proeminente *"Nova versão da aplicação disponível! [Atualizar Agora]"*.
  - [x] Ao clicar em atualizar, disparar `reg.waiting.postMessage({ type: 'SKIP_WAITING' })` e acionar `window.location.reload()`.
  - [x] Capturar o evento `beforeinstallprompt` para salvar a chamada e disponibilizar prompt/botão de instalação nativo quando elegível.
  - [x] Injetar o `<PwaInstaller />` no RootLayout (`apps/web/app/layout.tsx`).

- [x] **Task 4: Componente de Notificações de Carga de Extração de Dados Fiscais (`apps/web/components/extraction-notification-banner.tsx`)** (AC: #4)
  - [x] Criar componente client-side `apps/web/components/extraction-notification-banner.tsx`.
  - [x] Receber as props `lastExtractionDate` (`dataExtracao` vindo do `getPortalConfig()`) e `portalName`.
  - [x] Comparar `lastExtractionDate` com `localStorage.getItem("last_seen_extraction")`.
  - [x] Se houver nova data de extração, solicitar permissão via `Notification.requestPermission()`.
  - [x] Se concedida a permissão, disparar notificação nativa do sistema (`new Notification("Novos Dados Fiscais Publicados", { body: ... })`).
  - [x] Renderizar um banner/toast de alerta amigável na interface com o botão "Entendido / Atualizar".
  - [x] Salvar a data atualizada no `localStorage.setItem("last_seen_extraction", lastExtractionDate)`.

- [x] **Task 5: Validação de Qualidade e Gates de Integridade** (AC: #5)
  - [x] Executar a suíte de testes fiscais via `make test`.
  - [x] Executar a suíte de testes TypeScript via `pnpm test`.
  - [x] Executar o build de produção via `pnpm build`.
  - [x] Verificar a compilação do `manifest.webmanifest`, nitidez dos ícones de 192px/512px e o fluxo de atualização do `/sw.js`.

### Review Findings

- [x] [Review][Patch] Fix condition `storedExtractionDate && ...` to allow extraction banner for new users [`apps/web/components/extraction-notification-banner.tsx:46`]
- [x] [Review][Patch] Replace `new Notification()` on Android Chrome & remove unprompted `requestPermission()` in useEffect [`apps/web/components/extraction-notification-banner.tsx:52`]
- [x] [Review][Patch] Restrict SW offline HTML fallback to `event.request.mode === 'navigate'` [`apps/web/public/sw.js:81`]
- [x] [Review][Patch] Validate origin/scheme of Push notification click `targetUrl` [`apps/web/public/sw.js:106`]
- [x] [Review][Patch] Listen to `controllerchange` before `window.location.reload()` on SW update [`apps/web/components/pwa-installer.tsx:89`]
- [x] [Review][Patch] Wrap `localStorage` calls in safe try/catch for Safari Private Browsing [`apps/web/components/pwa-installer.tsx:21`]
- [x] [Review][Patch] Make SW precaching resilient using `Promise.allSettled` or individual catches [`apps/web/public/sw.js:10`]
- [x] [Review][Patch] Fix relative URL matching in SW notification click handler [`apps/web/public/sw.js:112`]

---

## Dev Notes

### Especificação dos Arquivos a Criar e Modificar

1. **`apps/web/app/manifest.ts`** (NOVO)
   ```typescript
   import type { MetadataRoute } from "next";

   export default function manifest(): MetadataRoute.Manifest {
     return {
       name: "MaisTransparencia - Transparência Pública Municipal",
       short_name: "MaisTransparencia",
       description:
         "Portal de Transparência Pública Municipal - Consulta de despesas, receitas, orçamentos, licitações, pessoal e previdência pública.",
       start_url: "/",
       display: "standalone",
       background_color: "#0f172a",
       theme_color: "#1e3a8a",
       icons: [
         {
           src: "/favicon-192.png",
           sizes: "192x192",
           type: "image/png",
           purpose: "maskable any",
         },
         {
           src: "/favicon-512.png",
           sizes: "512x512",
           type: "image/png",
           purpose: "maskable any",
         },
       ],
     };
   }
   ```

2. **`apps/web/public/sw.js`** (NOVO)
   ```javascript
   const CACHE_NAME = "transparenciaweb-cache-v1";
   const PRECACHE_ASSETS = [
     "/",
     "/manifest.webmanifest",
     "/favicon.svg",
     "/favicon-32.png",
     "/favicon-180.png",
   ];

   self.addEventListener("install", (event) => {
     event.waitUntil(
       caches.open(CACHE_NAME).then((cache) => {
         return cache.addAll(PRECACHE_ASSETS);
       })
     );
     self.skipWaiting();
   });

   self.addEventListener("activate", (event) => {
     event.waitUntil(
       caches.keys().then((cacheNames) => {
         return Promise.all(
           cacheNames
             .filter((name) => name !== CACHE_NAME)
             .map((name) => caches.delete(name))
         );
       })
     );
     self.clients.claim();
   });

   self.addEventListener("fetch", (event) => {
     if (event.request.method !== "GET") return;

     const url = new URL(event.request.url);

     // Cache-first for static assets
     if (
       url.pathname.startsWith("/_next/static/") ||
       url.pathname.match(/\.(png|jpg|jpeg|svg|css|js|ico)$/)
     ) {
       event.respondWith(
         caches.match(event.request).then((cachedResponse) => {
           if (cachedResponse) return cachedResponse;
           return fetch(event.request).then((networkResponse) => {
             if (networkResponse.status === 200) {
               const responseClone = networkResponse.clone();
               caches.open(CACHE_NAME).then((cache) => {
                 cache.put(event.request, responseClone);
               });
             }
             return networkResponse;
           });
         })
       );
       return;
     }

     // Network-first for dynamic routes
     event.respondWith(
       fetch(event.request).catch(() => {
         return caches.match(event.request).then((cachedResponse) => {
           return cachedResponse || caches.match("/");
         });
       })
     );
   });
   ```

3. **`apps/web/components/pwa-installer.tsx`** (NOVO)
   ```tsx
   "use client";

   import { useEffect, useState } from "react";

   export function PwaInstaller() {
     const [installPrompt, setInstallPrompt] = useState<any>(null);

     useEffect(() => {
       if ("serviceWorker" in navigator) {
         navigator.serviceWorker
           .register("/sw.js")
           .catch((error) => console.error("Service Worker registration failed:", error));
       }

       const handleBeforeInstallPrompt = (event: Event) => {
         event.preventDefault();
         setInstallPrompt(event);
       };

       window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

       return () => {
         window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
       };
     }, []);

     if (!installPrompt) return null;

     return (
       <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-surface-elevated p-4 shadow-lg border border-border flex items-center gap-3">
         <span className="text-sm font-medium text-ink">
           Instale o App MaisTransparencia no seu dispositivo
         </span>
         <button
           type="button"
           onClick={() => {
             installPrompt.prompt();
             installPrompt.userChoice.then(() => setInstallPrompt(null));
           }}
           className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover"
         >
           Instalar
         </button>
       </div>
     );
   }
   ```

4. **`apps/web/components/extraction-notification-banner.tsx`** (NOVO)
   ```tsx
   "use client";

   import { useEffect, useState } from "react";

   interface ExtractionNotificationBannerProps {
     lastExtractionDate?: string;
     portalName?: string;
   }

   export function ExtractionNotificationBanner({
     lastExtractionDate,
     portalName = "Prefeitura de Porciúncula",
   }: ExtractionNotificationBannerProps) {
     const [showNotification, setShowNotification] = useState(false);

     useEffect(() => {
       if (!lastExtractionDate) return;

       const storedExtractionDate = localStorage.getItem("last_seen_extraction");

       if (storedExtractionDate && storedExtractionDate !== lastExtractionDate) {
         setShowNotification(true);

         if ("Notification" in window && Notification.permission === "granted") {
           new Notification("Novos Dados Fiscais Publicados", {
             body: `Novos dados de contas públicas foram carregados para ${portalName}. Data de extração: ${lastExtractionDate}`,
             icon: "/favicon-192.png",
           });
         } else if ("Notification" in window && Notification.permission !== "denied") {
           Notification.requestPermission();
         }
       }
     }, [lastExtractionDate, portalName]);

     const handleDismiss = () => {
       if (lastExtractionDate) {
         localStorage.setItem("last_seen_extraction", lastExtractionDate);
       }
       setShowNotification(false);
     };

     if (!showNotification) return null;

     return (
       <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 text-sm text-ink flex items-center justify-between">
         <span>
           📢 <strong>Novos dados disponíveis!</strong> A última extração de contas públicas de{" "}
           {portalName} foi atualizada ({lastExtractionDate}).
         </span>
         <button
           type="button"
           onClick={handleDismiss}
           className="ml-4 text-xs font-semibold text-primary underline hover:text-primary-hover"
         >
           Entendido
         </button>
       </div>
     );
   }
   ```

5. **`apps/web/app/layout.tsx`** (UPDATE)
   Injetar `<PwaInstaller />` e `<ExtractionNotificationBanner />`.

---

## Dev Agent Record

### Agent Model Used
Gemini 3.6 Flash (Medium)

### Debug Log References
- N/A

### Completion Notes List
- Criado o manifesto PWA nativo Next.js em `apps/web/app/manifest.ts` e sua suíte de testes unitários `apps/web/app/manifest.spec.ts`.
- Gerados os ícones de alta resolução `favicon-192.png` e `favicon-512.png` via renderização vetorial com `sharp` diretamente a partir de `apps/web/public/favicon.svg`.
- Criado o Service Worker `/sw.js` em `apps/web/public/sw.js` com chave de cache dinamicamente versionada pelo build, estratégia cache-first para estáticos e network-first para rotas dinâmicas, suporte a `SKIP_WAITING`, Web Push e `notificationclick`.
- Criado o componente `apps/web/components/pwa-installer.tsx` e testes `apps/web/components/pwa-installer.spec.tsx` para registro automático do Service Worker, escuta do prompt nativo `beforeinstallprompt` e exibição de notificação proeminente de atualização de aplicativo ("Nova versão da aplicação disponível! [Atualizar Agora]").
- Criado o componente `apps/web/components/extraction-notification-banner.tsx` e testes `apps/web/components/extraction-notification-banner.spec.tsx` para alerta em tempo real de novas cargas de dados contábeis/extrações fiscais (`dataExtracao`).
- Injetados os componentes em `apps/web/app/layout.tsx`.
- Executados e validados todos os gates de integridade: `make test` (83/83 Python/dbt), `pnpm test` (33/33 DB, 56/56 Web) e `pnpm build` com 100% de sucesso.

### Change Log
- 2026-08-19: Implemented Story 4.7 - PWA support, vector-based PNG favicons, install prompt, service worker caching with versioning, app update notification banner, and data extraction alerts.

### File List
- `apps/web/app/manifest.ts`
- `apps/web/app/manifest.spec.ts`
- `apps/web/public/favicon-192.png`
- `apps/web/public/favicon-512.png`
- `apps/web/public/screenshot-desktop.png`
- `apps/web/public/screenshot-mobile.png`
- `apps/web/public/sw.js`
- `apps/web/components/pwa-installer.tsx`
- `apps/web/components/pwa-installer.spec.tsx`
- `apps/web/components/extraction-notification-banner.tsx`
- `apps/web/components/extraction-notification-banner.spec.tsx`
- `apps/web/app/layout.tsx`
- `_bmad-output/implementation-artifacts/4-7-suporte-a-pwa-instalabilidade-e-notificacoes-de-extracao.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

