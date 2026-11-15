---
baseline_commit: bc2b892ed4b01e23730cb85dd7ecdd3543d2c67f
---

# Story 11.3: Backend & Infraestrutura de Web Push (VAPID, Subscriptions & Dispatcher)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer and transparency platform architect,  
I want a robust Web Push notification infrastructure supporting VAPID keys, subscription persistence, and notification dispatching,  
So that the platform can send push notifications to registered citizen devices whenever new data extractions are processed or new application versions are released.

---

## Acceptance Criteria

1. **Configuração Segura de VAPID e Variáveis de Ambiente (`apps/web/env.ts` & `.env.example`):**
   - Configurar VAPID no schema Zod centralizado em `apps/web/env.ts` (`@/env`), sem nenhum acesso direto a `process.env` (Regra 17):
     - `client.NEXT_PUBLIC_VAPID_PUBLIC_KEY`: Chave pública VAPID (exposta ao navegador PWA para inscrição no PushManager), `z.string().min(1).optional()`, mapeada em `experimental__runtimeEnv`.
     - `server.VAPID_PRIVATE_KEY`: Chave privada VAPID (estritamente restrita ao backend Next.js para assinatura de tokens JWT W3C Web Push), `z.string().min(1).optional()`.
     - `server.VAPID_SUBJECT`: Identificador de contato do emissor VAPID (URL ou `mailto:`), `z.string().min(1).default("mailto:contato@maistransparencia.com")`.
   - Adicionar as variáveis documentadas no arquivo `.env.example` da raiz.
   - Declarar dependências pinadas exatas em `apps/web/package.json` (Regra 7): `"web-push": "3.6.7"` e `"@types/web-push": "3.6.4"`.

2. **Migração Kysely e Governança de Esquema (`packages/db/src/migrations/002_create_push_subscriptions.ts`):**
   - Criar a migração `002_create_push_subscriptions.ts` no schema `public`:
     - Tabela `push_subscriptions`:
       - `id`: `uuid` chave primária com default `gen_random_uuid()`.
       - `portal_slug`: `text` não nulo (ex: `"porciuncula_prefeitura"`).
       - `endpoint`: `text` não nulo e único (`unique`), identificador único do canal de push do dispositivo.
       - `p256dh`: `text` não nulo, chave pública criptográfica do cliente W3C.
       - `auth`: `text` não nulo, segredo de autenticação criptográfica do cliente.
       - `user_agent`: `text` opcional (auditoria de navegador/sistema operacional).
       - `topics`: `text[]` opcional com default `sql`ARRAY['extrações', 'versões']::text[]``.
       - `created_at`: `timestamptz` não nulo com default `NOW()`.
       - `last_notified_at`: `timestamptz` opcional.
       - `failed_attempts`: `integer` não nulo com default `0`.
     - Índices:
       - `idx_push_subscriptions_portal`: sobre a coluna `portal_slug`.
       - `idx_push_subscriptions_endpoint`: sobre a coluna `endpoint`.
     - Regra 16 estrita: todas as colunas de texto devem ser exclusivamente `TEXT`, proibido `VARCHAR(n)`.
   - Registrar a migração no catálogo de migrações em `packages/db/src/migrator.ts`.

3. **Camada de Dados Funcional e Imutável (`packages/db/src/queries/push.ts`):**
   - Definir interfaces de DTO estritamente em `camelCase` (Regra 18) e mapeamento imutável a partir das colunas snake_case do Postgres:
     - `PushSubscription`: `{ id, portalSlug, endpoint, p256dh, auth, userAgent, topics, createdAt, lastNotifiedAt, failedAttempts }`.
     - `SavePushSubscriptionInput`: `{ portalSlug, endpoint, p256dh, auth, userAgent?, topics? }`.
   - Implementar operações no banco utilizando Kysely e estilo funcional (Regra 2):
     - `savePushSubscription(input, dbInstance = dbWrite)`: Upsert atômico de subscrição (`ON CONFLICT (endpoint) DO UPDATE SET ...`, renovando credenciais e resetando `failed_attempts`).
     - `removePushSubscription(endpoint, portalSlug?, dbInstance = dbWrite)`: Remoção da subscrição pelo `endpoint`.
     - `getActivePushSubscriptions(portalSlug?, dbInstance = db)`: Leitura imutável de subscrições ativas para um município ou todos.
     - `prunePushSubscriptions(endpoints, dbInstance = dbWrite)`: Deleção em lote de endpoints revogados ou inválidos.
     - `recordPushNotificationSuccess(endpoints, dbInstance = dbWrite)`: Atualização de `last_notified_at = NOW()` e reset de falhas para os endpoints que receberam o push com sucesso.
     - `recordPushNotificationFailure(endpoints, dbInstance = dbWrite)`: Incremento de `failed_attempts = failed_attempts + 1`.
   - Exportar os métodos e tipos no barrel principal de `packages/db/src/index.ts`.
   - Implementar testes de integração com Vitest em `packages/db/src/queries/__tests__/push.spec.ts`.

4. **Biblioteca Despachante de Web Push (`apps/web/lib/push-dispatcher.ts`):**
   - Inicializar `web-push` configurando VAPID através das variáveis de ambiente de `@/env` (`VAPID_SUBJECT`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`).
   - Implementar a função central `dispatchPushNotification`:
     ```typescript
     export interface DispatchPushNotificationOptions {
       portalSlug?: string;
       title: string;
       body: string;
       url?: string;
       topic?: string;
       dryRun?: boolean;
     }
     export interface DispatchPushNotificationResult {
       totalSubscribers: number;
       sentCount: number;
       failedCount: number;
       prunedCount: number;
       dryRun: boolean;
       success: boolean;
       errors: Array<{ endpoint: string; error: string }>;
     }
     ```
   - Formatar o payload JSON no formato exato consumido pelo Service Worker (`apps/web/public/sw.js`): `{ title, body, url }`.
   - Envio concorrente controlado com `Promise.allSettled` (Regra 2) para as subscrições elegíveis.
   - Poda automática de inscrições revogadas (HTTP 410 Gone / 404 Not Found):
     - Detectar erros definitivos (`err.statusCode === 410 || err.statusCode === 404`).
     - Coletar os endpoints correspondentes e invocar `prunePushSubscriptions` para expurgo imediato do banco de dados.
   - Tratamento gracioso quando as chaves VAPID não estiverem presentes no ambiente (emissão de warning estruturado no console, sem quebrar o fluxo da aplicação).
   - Implementar testes unitários e mocks em `apps/web/lib/__tests__/push-dispatcher.spec.ts`.

5. **Endpoints de API HTTP de Subscrição e Despacho (`apps/web/app/api/push/`):**
   - `POST /api/push/subscribe` (`apps/web/app/api/push/subscribe/route.ts`):
     - Validação com Zod de payload em `camelCase`: `{ portalSlug: string, subscription: { endpoint: string, keys: { p256dh: string, auth: string } }, userAgent?: string, topics?: string[] }`.
     - Invoca `savePushSubscription` e retorna HTTP 200 `{ success: true, message: "Subscription saved" }`.
   - `POST /api/push/unsubscribe` (`apps/web/app/api/push/unsubscribe/route.ts`):
     - Validação com Zod de payload: `{ endpoint: string, portalSlug?: string }`.
     - Invoca `removePushSubscription` e retorna HTTP 200 `{ success: true, message: "Subscription removed" }`.
   - `POST /api/push/dispatch` (`apps/web/app/api/push/dispatch/route.ts`):
     - Protegido por autenticação timing-safe (`crypto.timingSafeEqual`) contra `env.INTERNAL_API_SECRET` ou `env.CRON_SECRET`.
     - Validação com Zod: `{ portalSlug?: string, title: string, body: string, url?: string, topic?: string, dryRun?: boolean }`.
     - Invoca `dispatchPushNotification` e retorna HTTP 200 com `DispatchPushNotificationResult`.
   - Testes de rotas em `apps/web/app/api/push/__tests__/`.

6. **Integração Operacional no Webhook de Ingestão (`apps/web/app/api/ingestion/webhook/route.ts`):**
   - Remover o comentário placeholder temporário das linhas 119-120 (`// Ponto de extensão para Story 11.3... // await dispatchCivicPushNotification(...)`) em `apps/web/app/api/ingestion/webhook/route.ts` e implementar a chamada ativa e tipada ao despachante `dispatchPushNotification`.
   - No bloco de conclusão com sucesso (`payload.status === "success"`), disparar notificação cívica via Web Push:
     - Título: `MaisTransparencia - Atualização Fiscal (${payload.portalSlug})`
     - Corpo: Notificação informando a publicação e processamento dos dados fiscais atualizados do município, em observância ao princípio da tempestividade ([Art. 48-A da LC 101/2000 - LRF](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art48a)).
     - URL: `/${payload.portalSlug}` (direcionando para a visão consolidada do município).
   - O disparo deve ser tolerante a falhas (try/catch isolado): falha no envio de push ou ausência de chaves VAPID não deve invalidar a resposta de sucesso da ingestão de dados.
   - Atualizar testes de `apps/web/app/api/ingestion/webhook/__tests__/route.test.ts` para verificar o acionamento resiliente do disparador.

7. **CLI de Teste Operacional e Alvos no Makefile:**
   - Criar script executável `apps/web/bin/dispatch-push.ts` com suporte a flags:
     - `--portal <slug>` (default: `"porciuncula_prefeitura"`).
     - `--title <titulo>`.
     - `--body <corpo>`.
     - `--url <caminho>`.
     - `--dry-run`.
   - Adicionar scripts em `apps/web/package.json`: `"push:send"` e `"push:dry-run"`.
   - Adicionar alvos no `Makefile`: `push/send` e `push/dry-run`.

8. **Conformidade de Qualidade e Segurança de Produção:**
   - Todos os testes de banco de dados devem rodar estritamente contra instâncias locais (`localhost:5544` ou `localhost:5545`), sem qualquer conexão a bancos de produção (Regra 15).
   - 100% de sucesso nas checagens:
     - `make test` (testes Python/ELT).
     - `make check` (linters Python).
     - `make test/ts` (testes unitários e de integração TypeScript).
     - `pnpm lint` (Biome linter).
     - `pnpm build` (build do Next.js sem erros de tipagem).

---

## Tasks / Subtasks

- [x] Task 1: Configuração de Variáveis de Ambiente e Dependências VAPID (AC: 1)
  - [x] Adicionar `"web-push": "3.6.7"` e `"@types/web-push": "3.6.4"` em `apps/web/package.json` com versão exata pinada.
  - [x] Atualizar `apps/web/env.ts` para incluir `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` no schema Zod.
  - [x] Mapear `NEXT_PUBLIC_VAPID_PUBLIC_KEY` em `client` e `experimental__runtimeEnv` de `apps/web/env.ts`.
  - [x] Atualizar `.env.example` com a documentação das novas chaves VAPID.

- [x] Task 2: Migração Kysely e Esquema de Subscrições (`packages/db`) (AC: 2)
  - [x] Criar arquivo de migração `packages/db/src/migrations/002_create_push_subscriptions.ts`.
  - [x] Definir a tabela `push_subscriptions` no schema `public` com colunas de texto exclusivas `TEXT` (Regra 16) e índices em `portal_slug` e `endpoint`.
  - [x] Registrar a migração `002_create_push_subscriptions` em `packages/db/src/migrator.ts`.

- [x] Task 3: Camada de Dados Kysely e Testes Unitários (`packages/db/src/queries/push.ts`) (AC: 3)
  - [x] Implementar tipos e DTOs em `camelCase` em `packages/db/src/queries/push.ts`.
  - [x] Implementar métodos funcionais e imutáveis: `savePushSubscription`, `removePushSubscription`, `getActivePushSubscriptions`, `prunePushSubscriptions`, `recordPushNotificationSuccess`, `recordPushNotificationFailure`.
  - [x] Exportar queries e interfaces em `packages/db/src/index.ts`.
  - [x] Criar testes unitários e de ciclo de vida em `packages/db/src/queries/__tests__/push.spec.ts`.

- [x] Task 4: Serviço Despachante Web Push e Poda de Inscrições (`apps/web/lib/push-dispatcher.ts`) (AC: 4)
  - [x] Implementar `apps/web/lib/push-dispatcher.ts` utilizando `web-push`.
  - [x] Configurar inicialização defensiva de VAPID (`webpush.setVapidDetails`).
  - [x] Implementar envio concorrente via `Promise.allSettled`.
  - [x] Implementar captura de `statusCode === 410 || statusCode === 404` para poda automática com `prunePushSubscriptions`.
  - [x] Criar testes unitários para o despachante em `apps/web/lib/__tests__/push-dispatcher.spec.ts`.

- [x] Task 5: Endpoints de API Next.js (`apps/web/app/api/push/`) (AC: 5)
  - [x] Criar endpoint `POST /api/push/subscribe` com validação Zod e tipagem camelCase.
  - [x] Criar endpoint `POST /api/push/unsubscribe` com validação Zod.
  - [x] Criar endpoint `POST /api/push/dispatch` com autenticação timing-safe contra `env.INTERNAL_API_SECRET` / `env.CRON_SECRET`.
  - [x] Implementar testes de rotas em `apps/web/app/api/push/__tests__/subscribe.test.ts`, `unsubscribe.test.ts` e `dispatch.test.ts`.

- [x] Task 6: Integração no Webhook de Ingestão de Dados (AC: 6)
  - [x] Remover o comentário de placeholder da linha 119-120 em `apps/web/app/api/ingestion/webhook/route.ts` (`// Ponto de extensão para Story 11.3: disparo de notificações Web Push...`).
  - [x] Implementar a chamada ativa ao despachante `dispatchPushNotification` disparando notificação cívica push em caso de `status === "success"`.
  - [x] Envolver o disparo em try/catch defensivo com log estruturado para garantir que erros de push não quebrem o webhook.
  - [x] Atualizar testes em `apps/web/app/api/ingestion/webhook/__tests__/route.test.ts`.

- [x] Task 7: CLI de Teste Operacional e Alvos no Makefile (AC: 7)
  - [x] Criar script executável `apps/web/bin/dispatch-push.ts`.
  - [x] Adicionar scripts `push:send` e `push:dry-run` em `apps/web/package.json`.
  - [x] Adicionar targets `push/send` e `push/dry-run` no `Makefile`.

- [x] Task 8: Verificação de Qualidade e Conformidade do Repositório (AC: 8)
  - [x] Executar `make check` (linters Python/Ruff/Mypy).
  - [x] Executar `make test` (testes Python/ELT).
  - [x] Executar `make test/ts` (testes TypeScript de packages/db e apps/web).
  - [x] Executar `pnpm lint` (Biome).
  - [x] Executar `pnpm build` (build Next.js de produção).

---

## Dev Notes

### 1. Contexto Arquitetural e Decisões

- **Padrão W3C Web Push & VAPID (Voluntary Application Server Identification):**
  O Web Push opera através de um canal criptografado entre o servidor de aplicação (Next.js backend) e o serviço de push do navegador (Google FCM, Mozilla Autopush, Apple WebPush). Para que o navegador autorize o servidor a enviar mensagens ao cliente sem depender de credenciais proprietárias de fabricantes, utiliza-se a especificação VAPID ([RFC 8292](https://datatracker.ietf.org/doc/html/rfc8292)), onde um par de chaves assimétricas EC P-256 identifica o remetente através de um JWT assinado.
- **Formato dos Dados de Subscrição:**
  O navegador PWA gera um objeto de inscrição no formato padrão:
  ```json
  {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4Ywf...",
      "auth": "tBHItJI5svbpez7KI4CCXg=="
    }
  }
  ```
  Esses valores devem ser persistidos fielmente no banco de dados para permitir a cifragem do payload de notificação no backend antes do envio.
- **Sinergia com o Service Worker Existente (`apps/web/public/sw.js`):**
  O Service Worker do projeto já possui listeners implementados para `'push'` e `'notificationclick'` (implementados na Story 4.7):
  ```javascript
  self.addEventListener("push", (event) => {
    let data = {};
    try {
      data = event.data ? event.data.json() : {};
    } catch {
      data = { body: event.data ? event.data.text() : "" };
    }
    const title = data.title || "MaisTransparencia - Atualização Fiscal";
    const options = {
      body: data.body || "Novos dados fiscais foram disponibilizados no portal.",
      icon: "/favicon-192.png",
      badge: "/favicon-192.png",
      data: { url: data.url || "/" }
    };
    event.waitUntil(self.registration.showNotification(title, options));
  });
  ```
  Portanto, o dispatcher no backend deve enviar o payload JSON contendo `{ title, body, url }` para garantir compatibilidade nativa imediata.
- **Poda Automática de Subscrições (HTTP 410 Gone):**
  Quando um usuário desinstala o PWA, limpa os dados do navegador ou revoga as permissões de notificação, os servidores de push retornam `HTTP 410 Gone` (ou ocasionalmente `HTTP 404 Not Found`). O dispatcher deve identificar esse status e acionar imediatamente `prunePushSubscriptions([endpoint])`, mantendo a base de inscritos limpa, otimizando custos e evitando tráfego inútil.

---

### 2. Esquema de Banco de Dados (`push_subscriptions`)

- **DDL da Migração Kysely (`packages/db/src/migrations/002_create_push_subscriptions.ts`):**
  ```typescript
  import { type Kysely, sql } from "kysely";

  export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
      .withSchema("public")
      .createTable("push_subscriptions")
      .ifNotExists()
      .addColumn("id", "uuid", (col) =>
        col.primaryKey().defaultTo(sql`gen_random_uuid()`),
      )
      .addColumn("portal_slug", "text", (col) => col.notNull())
      .addColumn("endpoint", "text", (col) => col.notNull().unique())
      .addColumn("p256dh", "text", (col) => col.notNull())
      .addColumn("auth", "text", (col) => col.notNull())
      .addColumn("user_agent", "text")
      .addColumn("topics", sql`text[]`, (col) =>
        col.defaultTo(sql`ARRAY['extrações', 'versões']::text[]`),
      )
      .addColumn("created_at", "timestamptz", (col) =>
        col.notNull().defaultTo(sql`NOW()`),
      )
      .addColumn("last_notified_at", "timestamptz")
      .addColumn("failed_attempts", "integer", (col) =>
        col.notNull().defaultTo(0),
      )
      .execute();

    await db.schema
      .withSchema("public")
      .createIndex("idx_push_subscriptions_portal")
      .ifNotExists()
      .on("push_subscriptions")
      .column("portal_slug")
      .execute();

    await db.schema
      .withSchema("public")
      .createIndex("idx_push_subscriptions_endpoint")
      .ifNotExists()
      .on("push_subscriptions")
      .column("endpoint")
      .execute();
  }

  export async function down(db: Kysely<any>): Promise<void> {
    await db.schema
      .withSchema("public")
      .dropTable("push_subscriptions")
      .ifExists()
      .execute();
  }
  ```
- **Registro em `packages/db/src/migrator.ts`:**
  ```typescript
  import * as migration001 from "./migrations/001_create_newsletter_subscribers";
  import * as migration002 from "./migrations/002_create_push_subscriptions";

  const migrations: Record<string, Migration> = {
    "001_create_newsletter_subscribers": migration001,
    "002_create_push_subscriptions": migration002,
  };
  ```

---

### 3. Camada de Consultas Kysely (`packages/db/src/queries/push.ts`)

- **Interfaces e Tipagem:**
  ```typescript
  export interface PushSubscription {
    id: string;
    portalSlug: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent: string | null;
    topics: string[] | null;
    createdAt: Date | string;
    lastNotifiedAt: Date | string | null;
    failedAttempts: number;
  }

  export interface SavePushSubscriptionInput {
    portalSlug: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string | null;
    topics?: string[] | null;
  }
  ```
- **Operação de Upsert Atômico (`savePushSubscription`):**
  ```typescript
  export async function savePushSubscription(
    input: SavePushSubscriptionInput,
    dbInstance = dbWrite,
  ): Promise<PushSubscription> {
    const row = await dbInstance
      .insertInto("public.push_subscriptions" as any)
      .values({
        portal_slug: input.portalSlug,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        user_agent: input.userAgent ?? null,
        topics: input.topics ?? sql`ARRAY['extrações', 'versões']::text[]`,
        created_at: sql`NOW()`,
        failed_attempts: 0,
      })
      .onConflict((oc: any) =>
        oc.column("endpoint").doUpdateSet({
          portal_slug: input.portalSlug,
          p256dh: input.p256dh,
          auth: input.auth,
          user_agent: input.userAgent ?? null,
          topics: input.topics ?? sql`ARRAY['extrações', 'versões']::text[]`,
          failed_attempts: 0,
        }),
      )
      .returningAll()
      .executeTakeFirstOrThrow();

    return mapRowToPushSubscription(row as any);
  }
  ```

---

### 4. Implementação do Despachante (`apps/web/lib/push-dispatcher.ts`)

- **Configuração VAPID:**
  ```typescript
  import webpush from "web-push";
  import { env } from "@/env";
  import {
    getActivePushSubscriptions,
    prunePushSubscriptions,
    recordPushNotificationSuccess,
    recordPushNotificationFailure,
  } from "@transparencia/db";

  function initVapid(): boolean {
    if (!env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
      console.warn("[PUSH_DISPATCHER] VAPID keys não configuradas. Envio de push desativado.");
      return false;
    }
    webpush.setVapidDetails(
      env.VAPID_SUBJECT,
      env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY,
    );
    return true;
  }
  ```
- **Despacho Concorrente e Poda:**
  ```typescript
  export async function dispatchPushNotification(
    options: DispatchPushNotificationOptions,
  ): Promise<DispatchPushNotificationResult> {
    const isVapidReady = initVapid();
    const subs = await getActivePushSubscriptions(options.portalSlug);
    if (options.dryRun || !isVapidReady) {
      return {
        totalSubscribers: subs.length,
        sentCount: isVapidReady ? subs.length : 0,
        failedCount: 0,
        prunedCount: 0,
        dryRun: Boolean(options.dryRun),
        success: true,
        errors: [],
      };
    }

    const payload = JSON.stringify({
      title: options.title,
      body: options.body,
      url: options.url ?? (options.portalSlug ? `/${options.portalSlug}` : "/"),
    });

    const expiredEndpoints: string[] = [];
    const successEndpoints: string[] = [];
    const failureEndpoints: string[] = [];
    const errors: Array<{ endpoint: string; error: string }> = [];

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload,
            { TTL: 86400 } // 24 horas
          );
          successEndpoints.push(sub.endpoint);
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            expiredEndpoints.push(sub.endpoint);
          } else {
            failureEndpoints.push(sub.endpoint);
          }
          errors.push({ endpoint: sub.endpoint, error: err.message ?? "Push failed" });
        }
      })
    );

    if (expiredEndpoints.length > 0) {
      await prunePushSubscriptions(expiredEndpoints);
    }
    if (successEndpoints.length > 0) {
      await recordPushNotificationSuccess(successEndpoints);
    }
    if (failureEndpoints.length > 0) {
      await recordPushNotificationFailure(failureEndpoints);
    }

    return {
      totalSubscribers: subs.length,
      sentCount: successEndpoints.length,
      failedCount: failureEndpoints.length + expiredEndpoints.length,
      prunedCount: expiredEndpoints.length,
      dryRun: false,
      success: errors.length === 0,
      errors,
    };
  }
  ```

---

### 5. Conformidade com as Regras do Projeto (`AGENTS.md`)

- **Regra 1 (Economia de Contexto):** Utilizar leituras e edições cirúrgicas nos arquivos afetados.
- **Regra 2 (Programação Funcional no DB):** Mapeamentos e transformações imutáveis (`.map`, `.filter`, `Promise.allSettled`), sem mutabilidade de estado ou loops com acumuladores imperativos.
- **Regra 4 (Baseline de Qualidade):** Garantir 100% de aprovação em `make test`, `make check`, `make test/ts`, `pnpm lint` e `pnpm build`.
- **Regra 7 (Pinned Versions):** Instalar `"web-push": "3.6.7"` e `"@types/web-push": "3.6.4"` sem prefixos `^` ou `~`.
- **Regra 13 (Zero Ternários Aninhados):** Proibição estrita de ternários aninhados; usar funções auxiliares ou retornos antecipados.
- **Regra 15 (Segurança de Produção):** Executar migrações e testes estritamente no banco local do Docker (`localhost:5544` ou instância de teste na 5545).
- **Regra 16 (Postgres TEXT):** Todas as colunas de texto da tabela `push_subscriptions` (`portal_slug`, `endpoint`, `p256dh`, `auth`, `user_agent`) devem utilizar exclusivamente o tipo `TEXT`.
- **Regra 17 (Centralização de Env):** Importar variáveis de ambiente exclusivamente de `@/env`.
- **Regra 18 (DTOs em camelCase):** Todas as propriedades de inputs, retornos de rotas e consultas Kysely devem estar em `camelCase`.
- **Regra 20 (Links Legais Obrigatórios):** Citar links oficiais de legislações (ex: [Art. 48-A da LC 101/2000 (LRF)](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art48a) e [RFC 8292 - VAPID](https://datatracker.ietf.org/doc/html/rfc8292)).

---

### Project Structure Notes

- **Novo arquivo de migração:** `packages/db/src/migrations/002_create_push_subscriptions.ts`.
- **Novo módulo de queries:** `packages/db/src/queries/push.ts`.
- **Novos testes de queries:** `packages/db/src/queries/__tests__/push.spec.ts`.
- **Novo despachante push:** `apps/web/lib/push-dispatcher.ts`.
- **Novos testes de despachante:** `apps/web/lib/__tests__/push-dispatcher.spec.ts`.
- **Novo CLI de despacho:** `apps/web/bin/dispatch-push.ts`.
- **Novas rotas de API Next.js:**
  - `apps/web/app/api/push/subscribe/route.ts`
  - `apps/web/app/api/push/unsubscribe/route.ts`
  - `apps/web/app/api/push/dispatch/route.ts`
- **Novos testes de API:**
  - `apps/web/app/api/push/__tests__/subscribe.test.ts`
  - `apps/web/app/api/push/__tests__/unsubscribe.test.ts`
  - `apps/web/app/api/push/__tests__/dispatch.test.ts`
- **Arquivos a modificar:**
  - `apps/web/env.ts` (adicionar chaves VAPID)
  - `apps/web/package.json` (adicionar `web-push`)
  - `packages/db/src/migrator.ts` (registrar migração 002)
  - `packages/db/src/index.ts` (exportar queries de push)
  - `apps/web/app/api/ingestion/webhook/route.ts` (remover comentário placeholder das linhas 119-120 e conectar gancho de push no sucesso da extração)
  - `apps/web/app/api/ingestion/webhook/__tests__/route.test.ts` (testar chamada do despachante)
  - `.env.example` (documentar variáveis VAPID)
  - `Makefile` (adicionar alvos de push)
  - `_bmad-output/implementation-artifacts/sprint-status.yaml` (atualizar timestamp)

---

### References

- [Art. 48-A, I da Lei Complementar nº 101/2000 (LRF)](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art48a) — Princípio da tempestividade na publicação dos atos de gestão orçamentária e financeira municipal.
- [RFC 8292 - Voluntary Application Server Identification (VAPID) for Web Push](https://datatracker.ietf.org/doc/html/rfc8292) — Especificação técnica do protocolo VAPID.
- [W3C Push API Specification](https://www.w3.org/TR/push-api/) — Padrão oficial de Web Push para navegadores e PWAs.
- `apps/web/public/sw.js` — Service Worker do portal com os handlers de push e notificationclick existentes.
- `apps/web/app/api/ingestion/webhook/route.ts` — Ponto de integração para acionamento do push pós-extração.
- `apps/web/app/api/newsletter/dispatch-digest/route.ts` — Referência de autenticação timing-safe com Bearer token.
- `_bmad-output/implementation-artifacts/epic-11-context.md` — Contexto geral e encadeamento da Epic 11.

---

## Dev Agent Record

### Agent Model Used

- Claude 3.7 Sonnet / Amelia (Senior Software Engineer)

### Debug Log References

- Execução dos testes de banco de dados com vitest em `packages/db` (75 testes em 21 arquivos passando).
- Execução dos testes unitários e de rotas em `apps/web` (335 testes em 54 arquivos passando).
- Validação estática de linter Biome com `pnpm lint` (0 erros).
- Compilação de produção com `pnpm build` (Next.js Turbopack bem-sucedido).
- Execução das checagens do backend Python com `make check` (Ruff, Mypy) e `make test` (36 testes pytest passando).

### Completion Notes List

- Infraestrutura completa de Web Push implementada com suporte a VAPID (RFC 8292).
- Migração Kysely `002_create_push_subscriptions.ts` criada e registrada no catálogo de migrações com tipagem estrita PostgreSQL TEXT e índices otimizados.
- Camada de queries em `packages/db/src/queries/push.ts` desenvolvida no padrão funcional e imutável (Regra 2) com DTOs camelCase (Regra 18).
- Despachante `apps/web/lib/push-dispatcher.ts` resiliente com auto-poda em lote de endpoints 410/404 e modo dry-run não invasivo.
- Rotas HTTP criadas sob `/api/push/` (`subscribe`, `unsubscribe`, `dispatch`) com validação Zod 4 e autenticação timing-safe com `crypto.timingSafeEqual`.
- Conexão do despachante no webhook de ingestão de dados `/api/ingestion/webhook` de forma assíncrona e não-bloqueante, em observância ao Art. 48-A da LC 101/2000 (LRF).
- CLI operacional `apps/web/bin/dispatch-push.ts` e alvos `push/send` e `push/dry-run` adicionados ao Makefile.
- Políticas RLS e permissões de escrita adicionadas para `public.push_subscriptions` em `elt/migrations/grant_readonly.sql`.

### File List

- `apps/web/package.json`
- `apps/web/env.ts`
- `.env.example`
- `packages/db/src/migrations/002_create_push_subscriptions.ts`
- `packages/db/src/migrator.ts`
- `packages/db/src/queries/push.ts`
- `packages/db/src/index.ts`
- `packages/db/src/queries/__tests__/push.spec.ts`
- `apps/web/lib/push-dispatcher.ts`
- `apps/web/lib/__tests__/push-dispatcher.spec.ts`
- `apps/web/app/api/push/subscribe/route.ts`
- `apps/web/app/api/push/unsubscribe/route.ts`
- `apps/web/app/api/push/dispatch/route.ts`
- `apps/web/app/api/push/__tests__/subscribe.test.ts`
- `apps/web/app/api/push/__tests__/unsubscribe.test.ts`
- `apps/web/app/api/push/__tests__/dispatch.test.ts`
- `apps/web/app/api/ingestion/webhook/route.ts`
- `apps/web/app/api/ingestion/webhook/__tests__/route.test.ts`
- `apps/web/bin/dispatch-push.ts`
- `elt/migrations/grant_readonly.sql`
- `Makefile`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/11-3-backend-infraestrutura-web-push-vapid-subscriptions-dispatcher.md`

