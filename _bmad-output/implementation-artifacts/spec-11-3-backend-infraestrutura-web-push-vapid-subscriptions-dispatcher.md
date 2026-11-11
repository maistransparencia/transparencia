---
title: 'Story 11.3: Backend & Infraestrutura de Web Push (VAPID, Subscriptions & Dispatcher)'
type: 'feature'
created: '2026-09-13T10:25:00-03:00'
baseline_revision: 'bc2b892c1acb85aa8ac5ca187cd8e5b3014a69ca'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/implementation-artifacts/11-3-backend-infraestrutura-web-push-vapid-subscriptions-dispatcher.md'
  - '_bmad-output/implementation-artifacts/epic-11-context.md'
warnings: []
---

<intent-contract>

## Intent

**Problem:** O portal MaisTransparencia não possui infraestrutura de backend para mensageria Web Push (VAPID, armazenamento de assinaturas e despachante), impedindo notificações ativas e tempestivas aos cidadãos sobre novas extrações de dados e novas versões do app, descumprindo a diretriz de transparência tempestiva do [Art. 48-A da LC 101/2000 (LRF)](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art48a).

**Approach:** Configurar chaves VAPID no schema Zod centralizado em `apps/web/env.ts` (`@/env`), criar a migração Kysely `002_create_push_subscriptions.ts` para persistir inscrições com tipos exclusivamente `TEXT` no PostgreSQL, implementar métodos funcionais em `@transparencia/db/src/queries/push.ts`, construir a biblioteca despachante `apps/web/lib/push-dispatcher.ts` com poda automática de endpoints inativos (`HTTP 410/404`), expor rotas REST em `/api/push/`, integrar o acionamento resiliente no webhook de ingestão e fornecer CLI/Makefile para testes operacionais.

## Boundaries & Constraints

**Always:**
- Toda leitura de variáveis de ambiente deve ser feita exclusivamente via canônico `@/env` (Regra 17).
- Todas as colunas de texto na tabela PostgreSQL devem ser estritamente `TEXT`, proibido `VARCHAR(n)` ou `CHAR(n)` (Regra 16).
- Todos os identificadores e DTOs em TypeScript devem utilizar rigorosamente `camelCase` (Regra 18).
- Métodos da camada `@transparencia/db` devem seguir estilo funcional e imutabilidade (Regra 2).
- Proibido qualquer uso de operadores ternários aninhados (Regra 13).
- Dependências declaradas com versões fixas exatas em `package.json` (Regra 7): `"web-push": "3.6.7"` e `"@types/web-push": "3.6.4"`.
- Todos os testes de banco devem executar contra instâncias locais (`localhost:5544` ou porta dinâmica), sem qualquer conexão com banco de produção (Regra 15).
- Citações a leis devem conter links canônicos oficiais (Regra 20).

**Block If:**
- A integração com Web Push quebrar ou atrasar a resposta síncrona do webhook de ingestão de dados (`/api/ingestion/webhook`).
- A biblioteca despachante falhar fatalmente quando chaves VAPID não estiverem configuradas em ambiente de desenvolvimento/teste.

**Never:**
- Nunca acessar `process.env` diretamente dentro dos arquivos de `apps/web/` fora de `apps/web/env.ts` (Regra 17).
- Nunca manter registros de subscrições cujo retorno do serviço push seja `HTTP 410 Gone` ou `HTTP 404 Not Found` (poda obrigatória).
- Nunca expor a chave privada VAPID (`VAPID_PRIVATE_KEY`) no bundle do cliente Next.js (`client` schema Zod).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Subscribe novo cliente | `POST /api/push/subscribe` com `{ portalSlug, subscription: { endpoint, keys: { p256dh, auth } } }` | Salva registro em `push_subscriptions`, HTTP 200 `{ success: true }` | Validação Zod retorna HTTP 400 em caso de payload inválido |
| Re-inscrição (upsert) | Mesmo `endpoint` já existente com novas chaves | Executa `ON CONFLICT (endpoint) DO UPDATE`, renova chaves e zera `failed_attempts`, HTTP 200 | Sem erro, operação idempotente |
| Unsubscribe cliente | `POST /api/push/unsubscribe` com `{ endpoint }` | Remove registro da tabela `push_subscriptions`, HTTP 200 `{ success: true }` | Se não existir, retorna HTTP 200 sem efeito colateral |
| Despacho com sucesso | `POST /api/push/dispatch` autenticado ou chamada direta a `dispatchPushNotification` | Envia payload `{ title, body, url }` via `webpush.sendNotification`, atualiza `last_notified_at`, zera falhas | Retorna contagem de enviados e sucesso |
| Endpoint expirado (410/404) | Chamada a `webpush.sendNotification` retorna `statusCode === 410` ou `404` | Executa poda imediata via `prunePushSubscriptions([endpoint])`, incrementa `prunedCount` | Registrado em log de aviso, não propaga erro fatal |
| VAPID não configurado | `VAPID_PRIVATE_KEY` ausente no ambiente | Emite warning no console, retorna `success: false` com motivo amigável sem quebrar a execução | Resiliência completa sem exceções não tratadas |
| Webhook de Ingestão com sucesso | Ingestão finaliza com `status: "success"` | Dispara notificação cívica push em bloco try/catch isolado para o `portalSlug` | Erro no push é capturado em log e não invalida o HTTP 200 do webhook |

</intent-contract>

## Code Map

- `apps/web/env.ts` -- Centralização Zod de `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT`
- `.env.example` -- Documentação de referência das variáveis VAPID
- `apps/web/package.json` -- Adição de dependências pinadas `"web-push": "3.6.7"` e `"@types/web-push": "3.6.4"` e scripts CLI
- `packages/db/src/migrations/002_create_push_subscriptions.ts` -- Migração DDL Kysely para a tabela `push_subscriptions`
- `packages/db/src/migrator.ts` -- Registro da nova migração no migrador Kysely
- `packages/db/src/queries/push.ts` -- DTOs camelCase e operações funcionais de banco de dados (upsert, list, prune, success, failure)
- `packages/db/src/queries/__tests__/push.spec.ts` -- Testes de integração Vitest para as operações de banco
- `packages/db/src/index.ts` -- Exportação das funções e tipos no barrel de `@transparencia/db`
- `apps/web/lib/push-dispatcher.ts` -- Motor de despacho com `web-push`, controle de concorrência e auto-prune
- `apps/web/lib/__tests__/push-dispatcher.spec.ts` -- Testes unitários do despachante com mocks de `web-push`
- `apps/web/app/api/push/subscribe/route.ts` -- Rota HTTP de subscrição de dispositivos PWA
- `apps/web/app/api/push/unsubscribe/route.ts` -- Rota HTTP de cancelamento de subscrição
- `apps/web/app/api/push/dispatch/route.ts` -- Rota HTTP protegida para despacho de notificações
- `apps/web/app/api/push/__tests__/subscribe.test.ts` -- Testes de rota da API de subscrição
- `apps/web/app/api/push/__tests__/unsubscribe.test.ts` -- Testes de rota da API de desinscrição
- `apps/web/app/api/push/__tests__/dispatch.test.ts` -- Testes de rota da API de despacho
- `apps/web/app/api/ingestion/webhook/route.ts` -- Disparo de push automático após conclusão com sucesso da ingestão
- `apps/web/app/api/ingestion/webhook/__tests__/route.test.ts` -- Testes atualizados do webhook cobrindo o disparo resiliente
- `apps/web/bin/dispatch-push.ts` -- CLI de despacho manual e validação operacional
- `Makefile` -- Novos alvos `push/send` e `push/dry-run`

## Tasks & Acceptance

**Execution:**
- [x] `apps/web/package.json` -- Adicionar dependências pinadas e scripts CLI -- Prover `web-push` e scripts operacionais
- [x] `apps/web/env.ts` -- Configurar variáveis VAPID no schema Zod -- Tipar e centralizar credenciais VAPID com segurança
- [x] `.env.example` -- Documentar variáveis VAPID -- Guia para desenvolvedores e ambientes de homologação/produção
- [x] `packages/db/src/migrations/002_create_push_subscriptions.ts` -- Criar migração da tabela `push_subscriptions` -- Persistência de subscrições com colunas `TEXT`
- [x] `packages/db/src/migrator.ts` -- Registrar migração 002 -- Garantir execução da migração no migrador Kysely
- [x] `packages/db/src/queries/push.ts` -- Implementar queries e DTOs funcionais -- Operações de dados para subscrições
- [x] `packages/db/src/index.ts` -- Exportar queries e interfaces de push -- Exposição no pacote `@transparencia/db`
- [x] `packages/db/src/queries/__tests__/push.spec.ts` -- Criar testes funcionais de ciclo de vida de subscrições -- Garantir integridade da camada de dados
- [x] `apps/web/lib/push-dispatcher.ts` -- Implementar despachante de Web Push com auto-pruning -- Núcleo de mensageria VAPID
- [x] `apps/web/lib/__tests__/push-dispatcher.spec.ts` -- Testar o despachante e poda de subscrições 410/404 -- Validar lógica de envio e expurgo
- [x] `apps/web/app/api/push/subscribe/route.ts` -- Implementar rota POST de subscrição -- Inscrição de navegadores PWA
- [x] `apps/web/app/api/push/unsubscribe/route.ts` -- Implementar rota POST de desinscrição -- Cancelamento de inscrições
- [x] `apps/web/app/api/push/dispatch/route.ts` -- Implementar rota POST protegida de despacho -- Disparo via API autenticada
- [x] `apps/web/app/api/push/__tests__/` -- Testar endpoints `/api/push/` -- Garantir validação Zod e segurança timing-safe
- [x] `apps/web/app/api/ingestion/webhook/route.ts` -- Conectar `dispatchPushNotification` no webhook de ingestão -- Automatizar push pós-ingestão
- [x] `apps/web/app/api/ingestion/webhook/__tests__/route.test.ts` -- Atualizar testes do webhook com mock de push -- Garantir resiliência do webhook
- [x] `apps/web/bin/dispatch-push.ts` -- Criar CLI de teste de despacho -- Testes operacionais e depuração
- [x] `Makefile` -- Adicionar targets `push/send` e `push/dry-run` -- Atalhos de execução operacional

**Acceptance Criteria:**
- Given novas subscrições PWA, when requisitadas em `POST /api/push/subscribe`, then os registros são persistidos/atualizados em `push_subscriptions` com HTTP 200.
- Given um endpoint revogado ou desinstalado que retorna HTTP 410 Gone ou 404 Not Found, when `dispatchPushNotification` tenta enviar a notificação, then a subscrição é podada automaticamente do banco de dados via `prunePushSubscriptions`.
- Given um ciclo de ingestão de dados concluído com sucesso, when o webhook `POST /api/ingestion/webhook` é acionado, then o despachante Web Push é invocado de forma não bloqueante e resiliente, sem falhar a resposta de sucesso do webhook.
- Given chamadas à rota `POST /api/push/dispatch`, when o token de autorização Bearer for avaliado com `crypto.timingSafeEqual`, then apenas requisições autenticadas por `INTERNAL_API_SECRET` ou `CRON_SECRET` são autorizadas.

## Spec Change Log

<!-- Append-only. Empty until first bad_spec loopback. -->

## Review Triage Log

### 2026-09-13 — Review pass
- verdicts: 23 findings — high 1, medium 4, low 16, false 2, maybe-false 0
- findings:
  - `[false]` `[reject]` Ausência de UI client-side para Web Push — Rejeitado porque a interface de usuário pertence exclusivamente à Story 11.4 (Frontend & UX de Consentimento e Gestão de Notificações no PWA).
  - `[high]` `[patch]` Tópicos default com acentuação violando Regra 10 — Corrigido para lowercase snake_case `['extracoes', 'versoes']` na migração, queries, webhook e testes.
  - `[low]` `[patch]` Concorrência sem limitação em `dispatchPushNotification` — Aplicado chunking de concorrência com lotes de 25 (`BATCH_SIZE = 25`) via `Promise.allSettled`.
  - `[low]` `[patch]` Falsa falha de lote ao podar endpoints 410/404 normais — Ajustado cálculo para `success: failureEndpoints.length === 0` tratando poda de 410/404 como manutenção esperada.
  - `[false]` `[reject]` Restrição de unicidade em endpoint impede multi-tenant — Rejeitado pois a constraint `unique` em `endpoint` é mandatória pelo padrão de Web Push e explicitamente requerida pelo AC 2 da história.
  - `[low]` `[patch]` Índice B-tree redundante na coluna endpoint — Removido `idx_push_subscriptions_endpoint` desnecessário já coberto pelo índice único nativo.
  - `[medium]` `[patch]` Consulta a endpoints mortos indefinidamente — Adicionado filtro `failed_attempts < 5` em `getActivePushSubscriptions`.
  - `[low]` `[patch]` Ausência de rate limit e tratamento de malformed JSON em rotas públicas — Adicionado `checkIpRateLimit(req, 30)` e `req.json().catch(() => null)` retornando HTTP 400.
  - `[low]` `[patch]` Falta de validação de existência do portal — Adicionada validação com `getPortalConfig(portalSlug)` retornando HTTP 404 para portais inválidos.
  - `[low]` `[patch]` Identificador técnico cru exposto na notificação — Resolvido nome legível do portal via `getPortalConfig(payload.portalSlug).displayName`.
  - `[low]` `[patch]` Ausência de parâmetro `--topic` no CLI e Makefile — Implementado suporte à flag `--topic` no binário e targets do Makefile.
  - `[low]` `[patch]` Ausência de fallback para header User-Agent nativo — Configurado fallback para `req.headers.get("user-agent")`.
  - `[low]` `[patch]` Validação permissiva de `VAPID_SUBJECT` no schema Zod — Adicionado refinamento exigindo prefixo `mailto:` ou `https:`.
  - `[low]` `[patch]` SyntaxError não capturado em subscribe/route.ts — Tratado com `req.json().catch(() => null)`.
  - `[low]` `[patch]` SyntaxError não capturado em unsubscribe/route.ts — Tratado com `req.json().catch(() => null)`.
  - `[low]` `[patch]` SyntaxError não capturado em dispatch/route.ts — Tratado com `req.json().catch(() => null)`.
  - `[low]` `[patch]` CLI encerra com código 1 após poda de 410 — Corrigido critério de saída baseado em `result.success`.
  - `[low]` `[patch]` Throttling ausente para envio em massa — Resolvido com chunking de 25 por lote.
  - `[medium]` `[patch]` Endpoints com falhas recorrentes retentados indefinidamente — Resolvido com `failed_attempts < 5`.
  - `[medium]` `[patch]` Webhook síncrono bloqueado por requisições de push — Garantida resiliência com try/catch isolado e log estruturado.
  - `[medium]` `[patch]` Ausência de verificação de filtragem por tópico em testes — Adicionado caso de teste validando entrega apenas para tópicos correspondentes.
  - `[medium]` `[patch]` Ausência de verificação de registro de falhas transitórias 500 — Adicionado teste simulando HTTP 500 e verificando `recordPushNotificationFailure`.
  - `[low]` `[patch]` Falta de asserção na forma do payload JSON e TTL nos testes — Adicionada asserção estrita de `{ title, body, url }` e `{ TTL: 86400 }`.

## Design Notes

- **Resiliência de Envio Concorrente com `Promise.allSettled`:**
  O despachante executa o envio para cada subscrição ativa usando `Promise.allSettled` em lotes de 25. Os resultados rejeitados são inspecionados: erros com `statusCode === 410 || statusCode === 404` são agrupados para chamada em lote a `prunePushSubscriptions(pruneList)`, enquanto falhas transitórias incrementam `failed_attempts` via `recordPushNotificationFailure(failList)`. Subscrições bem-sucedidas têm seu `last_notified_at` atualizado em lote via `recordPushNotificationSuccess(successList)`.
- **Payload Padronizado para o Service Worker (`apps/web/public/sw.js`):**
  O Service Worker espera `{ title: string, body: string, url?: string }`. O despachante envia `JSON.stringify({ title, body, url })`, permitindo que o evento `'push'` do SW apresente a notificação e o evento `'notificationclick'` abra a URL informada.

## Verification

**Commands:**
- `pnpm --filter @transparencia/db test` -- expected: Sucesso em todos os testes de queries e migração, incluindo `push.spec.ts`
- `pnpm --filter web test` -- expected: Sucesso em todos os testes de lib e rotas de API, incluindo `push-dispatcher.spec.ts`, rotas de push e webhook
- `make check` -- expected: Sucesso em todos os linters Python (Ruff/Mypy)
- `make test` -- expected: Sucesso nos testes de integração Python/ELT
- `pnpm lint` -- expected: Sucesso no linter Biome sem violações
- `pnpm build` -- expected: Build do Next.js sem erros de compilação ou tipagem

## Auto Run Result

### Summary of Implemented Change
Implementação completa da infraestrutura de Web Push para a plataforma MaisTransparencia em conformidade com o padrão W3C Web Push e RFC 8292 (VAPID):
- Suporte a credenciais VAPID via schema centralizado Zod (`apps/web/env.ts`), com validação estrita de protocolo URI e sem acesso direto a `process.env` (Regra 17).
- Migração DDL `002_create_push_subscriptions.ts` no schema `public` com identificadores UUID, chaves criptográficas, contadores de falhas e colunas de texto estritamente `TEXT` (Regra 16).
- Políticas RLS e permissões de escrita para a role `read_only` em `elt/migrations/grant_readonly.sql`.
- Camada de dados funcional e imutável em `packages/db/src/queries/push.ts` com DTOs em `camelCase` (Regra 18) e filtro de resiliência para assinaturas ativas com `failed_attempts < 5`.
- Despachante Web Push em `apps/web/lib/push-dispatcher.ts` com controle de concorrência em lotes de 25, poda automática em lote de endpoints expirados (HTTP 410/404), envio de payload padronizado para o Service Worker existente (`apps/web/public/sw.js`) e resiliência com VAPID não configurado.
- Endpoints REST `/api/push/subscribe` (com rate limiting por IP, validação Zod 4 e resolução de portal), `/api/push/unsubscribe` e `/api/push/dispatch` (com autenticação timing-safe contra `INTERNAL_API_SECRET` e `CRON_SECRET`).
- Disparo de notificação push cívica conectado no webhook de ingestão (`/api/ingestion/webhook`) em bloco try/catch não-bloqueante, respeitando a tempestividade fiscal do [Art. 48-A da LC 101/2000 (LRF)](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art48a).
- Script CLI operacional `apps/web/bin/dispatch-push.ts` e novos alvos `push/send` e `push/dry-run` no `Makefile`.

### Files Changed
- `.env.example`: Documentação das variáveis VAPID (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`).
- `Makefile`: Novos alvos `push/send` e `push/dry-run` com suporte ao parâmetro `$(TOPIC)`.
- `apps/web/package.json`: Adição de dependências pinadas `"web-push": "3.6.7"` e `"@types/web-push": "3.6.4"`, e scripts CLI `push:send` e `push:dry-run`.
- `apps/web/env.ts`: Schema Zod centralizado com validação das variáveis VAPID.
- `apps/web/lib/rate-limit.ts`: Exportação de `getClientIp` e suporte a `Request` em `checkIpRateLimit`.
- `apps/web/lib/push-dispatcher.ts`: Motor de despacho de notificações Web Push com auto-pruning e batching.
- `apps/web/lib/__tests__/push-dispatcher.spec.ts`: Testes unitários para envio, dry-run, poda 410/404, ausência de VAPID, filtragem de tópicos e falhas transitórias.
- `apps/web/app/api/push/subscribe/route.ts`: Rota POST de inscrição de dispositivos PWA com rate limit e validação Zod 4.
- `apps/web/app/api/push/unsubscribe/route.ts`: Rota POST de cancelamento de inscrição.
- `apps/web/app/api/push/dispatch/route.ts`: Rota POST autenticada de despacho de notificações.
- `apps/web/app/api/push/__tests__/`: Suíte de testes para as rotas HTTP de push.
- `apps/web/app/api/ingestion/webhook/route.ts`: Acionamento resiliente do despachante push após conclusão com sucesso da extração.
- `apps/web/app/api/ingestion/webhook/__tests__/route.test.ts`: Testes unitários atualizados do webhook cobrindo o disparo e tolerância a falhas.
- `apps/web/bin/dispatch-push.ts`: CLI para disparo e teste operacional de notificações.
- `elt/migrations/grant_readonly.sql`: Concessão de permissões e RLS para `push_subscriptions`.
- `packages/db/src/migrations/002_create_push_subscriptions.ts`: Migração DDL Kysely da tabela `push_subscriptions`.
- `packages/db/src/migrator.ts`: Registro da migração 002 no catálogo do migrador.
- `packages/db/src/queries/push.ts`: DTOs e funções funcionais de banco de dados para subscrições.
- `packages/db/src/queries/__tests__/push.spec.ts`: Testes de integração Vitest cobrindo ciclo de vida de subscrições.
- `packages/db/src/index.ts`: Exportação de queries e interfaces de push no barrel principal.

### Review Findings Breakdown
- Patches applied: 21 (normalização de tópicos para lowercase snake_case conforme Regra 10, batching de 25 por lote, tratamento de 410/404 como manutenção esperada, remoção de índice redundante, filtro de inativação com failed_attempts < 5, proteção contra malformed JSON em todas as rotas, rate limiting por IP, validação de portal com getPortalConfig, resolução de displayName, suporte à flag --topic no CLI e Makefile, fallback para header User-Agent nativo, refinamento de protocolo URI em VAPID_SUBJECT, testes de topic filtering, transient errors 500 e payload shape/TTL).
- Items deferred: 0.
- Rejected findings: 2 (BH-1: ausência de UI client-side rejeitada pois pertence à Story 11.4; BH-5: unicidade global de endpoint rejeitada pois é requisito do padrão Web Push e AC 2).

### Follow-up Review Recommendation
`false` (todas as correções foram integradas, validadas e cobertas por testes automatizados sem nenhum risco não verificado).

### Verification Performed
- `pnpm --filter @transparencia/db test`: 21 arquivos, 76 testes aprovados.
- `pnpm --filter web test`: 54 arquivos, 340 testes aprovados.
- `pnpm lint`: 260 arquivos verificados sem erros no Biome.
- `pnpm build`: Compilação Next.js / TypeScript / Turbopack 100% concluída com sucesso.
- `make check`: Linters Python (Ruff check, Ruff format, Mypy) aprovados sem inconformidades.
- `make test`: 36 testes pytest aprovados, incluindo paridade de fixtures de banco de dados.

### Residual Risks
Nenhum risco residual identificado. Todas as interfaces e DTOs aderem rigorosamente aos padrões de código do repositório.
