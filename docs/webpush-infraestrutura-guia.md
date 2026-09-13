# Guia de Infraestrutura de Web Push (VAPID, Subscrições e Despachante)

Este documento estabelece a arquitetura, governança de dados, configuração de credenciais e procedimentos operacionais da infraestrutura de mensageria Web Push da plataforma MaisTransparencia.

---

## 1. Visão Geral e Arquitetura

O sistema de Web Push permite enviar alertas tempestivos aos cidadãos sobre novas extrações de dados fiscais e novas versões da plataforma, dando cumprimento ao princípio da publicidade e da tempestividade da informação pública ([Art. 48-A da LC 101/2000 - LRF](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art48a)).

A arquitetura adere estritamente aos padrões abertos W3C Push API e [RFC 8292 (VAPID)](https://datatracker.ietf.org/doc/html/rfc8292):

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  [ Pipeline ELT em Nuvem / Cron Trigger ]                              │
│       │                                                                │
│       ▼ (HTTP POST autenticado com INTERNAL_API_SECRET)                │
│  [ Webhook de Ingestão: /api/ingestion/webhook ]                       │
│       │                                                                │
│       ▼ (Disparo não-bloqueante / try-catch isolado)                   │
│  [ Despachante Web Push: apps/web/lib/push-dispatcher.ts ]             │
│       │                                                                │
│       ├─► Consulta inscrições ativas (failed_attempts < 5) no Postgres │
│       ├─► Loteamento de envio em blocos de 25 (Promise.allSettled)     │
│       ├─► Poda automática de endpoints expirados (HTTP 410 / 404)      │
│       │                                                                │
│       ▼ (Payload JSON criptografado via chaves VAPID RFC 8292)         │
│  [ Serviços de Push dos Fabricantes ]                                  │
│  (Google FCM, Apple WebPush, Mozilla Autopush)                         │
│       │                                                                │
│       ▼ (Push Event)                                                   │
│  [ Service Worker do PWA: apps/web/public/sw.js ]                      │
│       │                                                                │
│       ▼ (Exibição do banner nativo e foco na rota municipal)           │
│  [ Notificação Nativa do Sistema Operacional (macOS, Windows, Android) ]
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Configuração de Credenciais VAPID

O Voluntary Application Server Identification (VAPID) identifica a aplicação perante os serviços de push sem depender de contas proprietárias ou SDKs externos:

### Variáveis de Ambiente (`apps/web/env.ts` & `.env`)

| Variável | Escopo | Descrição |
|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Cliente (PWA) | Chave pública P-256 (Base64URL), passada ao `pushManager.subscribe` |
| `VAPID_PRIVATE_KEY` | Servidor (Next.js) | Chave privada P-256 (Base64URL), usada para assinar o JWT de envio |
| `VAPID_SUBJECT` | Servidor (Next.js) | URI de contato (`mailto:` ou `https:`) do emissor (ex: `mailto:contato@maistransparencia.com`) |

> [!IMPORTANT]
> A chave privada `VAPID_PRIVATE_KEY` é estritamente restrita ao backend Next.js e nunca deve ser exposta no bundle do cliente nem versionada em repositórios públicos.

### Gerando novas chaves VAPID

Para gerar um novo par criptográfico no terminal:
```bash
npx web-push generate-vapid-keys
```

Adicione o par resultante no seu `.env` ou `.env.local`:
```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY="B..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:contato@maistransparencia.com"
```

---

## 3. Modelo de Dados e Governança (`packages/db`)

### Tabela `public.push_subscriptions`

Criada pela migração [`002_create_push_subscriptions.ts`](file:///Volumes/Projects/transparencia/packages/db/src/migrations/002_create_push_subscriptions.ts):

| Coluna | Tipo | Restrições / Padrão | Descrição |
|---|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` | Identificador único do registro |
| `portal_slug` | `text` | NOT NULL | Tenant municipal vinculado (ex: `porciuncula_prefeitura`) |
| `endpoint` | `text` | NOT NULL, UNIQUE | URL única do canal de push do dispositivo |
| `p256dh` | `text` | NOT NULL | Chave pública P-256 do cliente (65 bytes descodificados) |
| `auth` | `text` | NOT NULL | Segredo de autenticação simétrica gerado pelo navegador |
| `user_agent` | `text` | NULL | Informações de auditoria do cliente / navegador |
| `topics` | `text[]` | `ARRAY['extracoes', 'versoes']` | Tópicos de interesse em lowercase snake_case (Regra 10) |
| `created_at` | `timestamptz` | NOT NULL, `NOW()` | Timestamp de inscrição |
| `last_notified_at` | `timestamptz` | NULL | Timestamp do último despacho bem-sucedido |
| `failed_attempts` | `integer` | NOT NULL, `0` | Contador de falhas consecutivas de entrega |

### Políticas RLS e Permissões de Escrita

Em [`elt/migrations/grant_readonly.sql`](file:///Volumes/Projects/transparencia/elt/migrations/grant_readonly.sql), a tabela `push_subscriptions` possui permissão explícita de escrita e política RLS para a role `read_only`, garantindo que conexões serverless via poolers consigam persistir inscrições e executar podas:

```sql
-- Exceção: Permissões de escrita e políticas RLS para push_subscriptions
IF to_regclass('public.push_subscriptions') IS NOT NULL THEN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'read_only') THEN
    EXECUTE 'GRANT USAGE ON SCHEMA public TO read_only;';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.push_subscriptions TO read_only;';
    EXECUTE 'DROP POLICY IF EXISTS push_subscriptions_read_only_all ON public.push_subscriptions;';
    EXECUTE 'CREATE POLICY push_subscriptions_read_only_all ON public.push_subscriptions FOR ALL TO read_only USING (true) WITH CHECK (true);';
  END IF;
END IF;
```

### Funções da Camada de Dados (`packages/db/src/queries/push.ts`)

- `savePushSubscription(input)`: Upsert idempotente de inscrição (`ON CONFLICT (endpoint) DO UPDATE SET ...`), renovando chaves e zerando o contador de falhas.
- `removePushSubscription(endpoint, portalSlug?)`: Remove a subscrição pelo endpoint.
- `getActivePushSubscriptions(portalSlug?)`: Retorna subscrições ativas com filtro de resiliência `failed_attempts < 5`.
- `prunePushSubscriptions(endpoints)`: Remove em lote subscrições expiradas ou revogadas.
- `recordPushNotificationSuccess(endpoints)`: Atualiza `last_notified_at = NOW()` e zera `failed_attempts`.
- `recordPushNotificationFailure(endpoints)`: Incrementa `failed_attempts = failed_attempts + 1`.

---

## 4. Motor Despachante (`apps/web/lib/push-dispatcher.ts`)

O despachante executa a mensageria com as seguintes garantias de resiliência:

1. **Loteamento Controlado:** O envio para as subscrições é processado em lotes de 25 (`BATCH_SIZE = 25`) via `Promise.allSettled`, prevenindo esgotamento de sockets TLS no Node.js e bloqueios por rate limit de gateways de push.
2. **Poda Automática (Auto-Pruning):** Quando o serviço de push remoto retorna `HTTP 410 Gone` (usuário revogou permissão ou desinstalou o PWA) ou `HTTP 404 Not Found`, os endpoints são coletados e expurgados imediatamente do PostgreSQL via `prunePushSubscriptions`.
3. **Tratamento de Sucesso Operacional:** A poda de endpoints expirados é tratada como manutenção esperada do ciclo de vida, não marcando o resultado geral do lote como falha.
4. **Resiliência a Falhas Transitórias:** Erros não-fatais (ex: `HTTP 500`, `503`, timeouts de rede) incrementam `failed_attempts` no banco sem podar a subscrição.
5. **Degradação Graciosa:** Se as chaves VAPID não estiverem presentes no ambiente (ex: desenvolvimento inicial), o despachante emite warning estruturado e retorna resultado sem quebrar a execução da aplicação.
6. **Payload Padronizado:** Envia payload JSON no formato `{ title, body, url }` com TTL de 24 horas (`{ TTL: 86400 }`), em total conformidade com o listener de push em [`apps/web/public/sw.js`](file:///Volumes/Projects/transparencia/apps/web/public/sw.js).

---

## 5. Endpoints de API HTTP (`apps/web/app/api/push/`)

### `POST /api/push/subscribe`
- **Acesso:** Público (com rate limit por IP: 30 requisições / 10 minutos).
- **Validação Zod:**
  ```typescript
  {
    portalSlug: string;
    subscription: {
      endpoint: string; // validado com z.url()
      keys: { p256dh: string; auth: string; };
    };
    userAgent?: string;
    topics?: string[];
  }
  ```
- **Comportamento:** Valida a existência do portal via `getPortalConfig`, adota fallback para o header nativo `User-Agent` e executa o upsert no banco. Retorna HTTP 200 `{ success: true, message: "Subscription saved" }`.

### `POST /api/push/unsubscribe`
- **Acesso:** Público (com rate limit por IP).
- **Validação:** `{ endpoint: string; portalSlug?: string; }`.
- **Comportamento:** Remove a inscrição correspondente. Retorna HTTP 200 `{ success: true, message: "Subscription removed" }`.

### `POST /api/push/dispatch`
- **Acesso:** Privado / Autenticado.
- **Autorização:** Header `Authorization: Bearer <token>` validado com comparação timing-safe (`crypto.timingSafeEqual`) contra `INTERNAL_API_SECRET` ou `CRON_SECRET`.
- **Validação:** `{ portalSlug?: string; title: string; body: string; url?: string; topic?: string; dryRun?: boolean; }`.
- **Comportamento:** Invoca `dispatchPushNotification` e retorna as estatísticas detalhadas de despacho (`totalSubscribers`, `sentCount`, `failedCount`, `prunedCount`, `dryRun`, `success`, `errors`).

---

## 6. Integração com o Webhook de Ingestão (`/api/ingestion/webhook`)

Ao término bem-sucedido de uma execução do pipeline ELT (`payload.status === "success"`):

1. O webhook revalida o cache do Next.js via `revalidatePath("/[portalSlug]", "layout")`.
2. Resolve o nome oficial de exibição do município via `getPortalConfig(payload.portalSlug).displayName`.
3. Dispara a notificação Web Push cívica de forma resiliente:
   - **Título:** `MaisTransparencia - Atualização Fiscal (${portalName})`
   - **Corpo:** Cita a disponibilização dos novos dados em cumprimento ao [Art. 48-A da LC 101/2000 (LRF)](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art48a).
   - **Tópico:** `"extracoes"`.
   - **URL:** `/${payload.portalSlug}`.
4. O bloco é isolado em `try/catch`: eventuais falhas externas de push nunca invalidam ou atrasam a resposta de sucesso do webhook de ingestão.

---

## 7. Como Testar Localmente

### A) Teste via CLI e Makefile

O repositório fornece alvos dedicados no Makefile:

```bash
# Simulação rápida sem envio real (Dry-Run):
make push/dry-run

# Simulação com filtros de portal e tópico:
make push/dry-run PORTAL=porciuncula_prefeitura TOPIC=extracoes

# Envio real para a base de inscritos:
make push/send TITLE="Alerta Fiscal" BODY="Novos dados disponíveis no portal"
```

### B) Inscrição Manual pelo Navegador (DevTools)

Enquanto a interface visual de opt-in (Story 11.4) está sendo construída, é possível inscrever o navegador para receber alertas locais reais:

1. Inicie a aplicação: `pnpm dev`
2. Acesse `http://localhost:3001` no Chrome, Firefox, Safari ou Edge.
3. Abra o **Console do DevTools (F12)** e execute o script abaixo (atenção à conversão da chave pública para `Uint8Array` exigida pela API nativa):

```javascript
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const permission = await Notification.requestPermission();
if (permission === "granted") {
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  // Substitua pela sua chave pública VAPID definida no .env
  const vapidPublicKey = "SUA_NEXT_PUBLIC_VAPID_PUBLIC_KEY_AQUI";

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
  });

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      portalSlug: "porciuncula_prefeitura",
      subscription: sub.toJSON()
    })
  });

  console.log("Inscrito com sucesso:", await res.json());
}
```

4. Após a inscrição, execute no terminal `make push/send TITLE="Alerta de Teste" BODY="Recebido com sucesso!"` para ver o card de notificação nativa aparecer no seu sistema operacional!
