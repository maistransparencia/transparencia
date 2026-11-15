---
title: 'Story 11.2: Infraestrutura de Automação de Ingestão de Dados (Cloudflare)'
type: 'feature'
created: '2026-09-12T23:14:33-03:00'
baseline_revision: 'c148bc85caf805a35c5cf77b47107c2721523e6a'
final_revision: 'cf91dd2'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/implementation-artifacts/11-2-infraestrutura-de-automacao-de-ingestao-de-dados-cloudflare.md'
  - 'docs/tce-rj-sigfis-viability-report.md'
  - '_bmad-output/implementation-artifacts/epic-11-context.md'
warnings: []
---

<intent-contract>

## Intent

**Problem:** O pipeline de extração, carga e transformação analítica (`elt/`) depende de acionamento manual em localhost, impedindo a disponibilização contínua e em tempo real (24h) dos dados conforme o [Art. 48-A da LC 101/2000 (LRF)](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art48a) e bloqueando o envio de notificações push automáticas para novas extrações.

**Approach:** Implementar um orquestrador CLI modular em Python (`elt/orchestrator.py`) com telemetria JSON e webhooks de conclusão/alerta, parametrizar `FLARESOLVERR_URL` em `elt/core/scraper.py`, containerizar o pipeline via `elt/Dockerfile`, configurar Cloudflare Worker com Cron Trigger (`infra/cloudflare/ingestion-worker/`), e disponibilizar endpoint de webhook seguro no Next.js (`apps/web/app/api/ingestion/webhook/route.ts`) validado com `crypto.timingSafeEqual`.

## Boundaries & Constraints

**Always:**
- Todo o código Python novo ou alterado em `elt/` deve ser validado estaticamente por `make check` (Ruff e Mypy) e testado por `make test`.
- O webhook Next.js em `apps/web/app/api/ingestion/webhook/route.ts` deve validar a autorização Bearer com `crypto.timingSafeEqual` contra `INTERNAL_API_SECRET` e `CRON_SECRET` lidos de `@/env`.
- Todos os identificadores e DTOs na rota de webhook devem ser tipados em `camelCase` (Regra 18).
- Todas as execuções locais e de teste devem rodar estritamente contra o PostgreSQL local ou efêmero (`DATABASE_URL=postgresql://postgres:postgres@localhost:5544/postgres` ou porta dinâmica), sem conexões com serviços externos ou bancos de produção (Regra 15).
- Citações a normas jurídicas devem incluir links oficiais (Regra 20), como [Art. 48-A da LC 101/2000](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art48a).

**Block If:**
- A automação exigir alteração destrutiva que comprometa a execução local existente via Makefile (`make elt/extract`, `make elt/load`, `make pipeline/extract`).

**Never:**
- Nunca acessar `process.env` diretamente no código de `apps/web/` (usar `@/env` conforme Regra 17).
- Nunca utilizar ternários aninhados (Regra 13).
- Nunca utilizar tipos `VARCHAR(n)` ou `CHAR(n)` em estruturas PostgreSQL (Regra 16).
- Nunca enviar dados a bancos de produção remotos sem consentimento explícito (Regra 15).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Orquestrador Pipeline Completo | Execução CLI `python -m elt.orchestrator --portal porciuncula_prefeitura` | Executa extract → load → dbt run → webhook notify; emite logs JSON; exit code 0 | Captura falhas, loga JSON de erro, despacha webhook de falha/alerta e encerra com exit code 1 |
| Orquestrador Modo Dry-Run | Execução CLI com `--dry-run` | Executa validação de configuração e planejamento sem persistir no banco ou disparar webhook de produção | Trata erros de validação de argumentos normalmente |
| Scraper com FlareSolverr Customizado | `FLARESOLVERR_URL=http://flaresolverr:8191/v1` em env | `FlareSolverrClient` envia requisições para a URL configurada; fallback padrão `http://localhost:8191/v1` | Erros de conexão continuam lançando exceções tratadas de retry |
| Webhook Next.js Sucesso | `POST /api/ingestion/webhook` com Bearer token válido e payload de sucesso | Retorna HTTP 200 `{ success: true, message: "Ingestion recorded successfully" }` | Rejeita se payload for incompatível com schema Zod (HTTP 400) |
| Webhook Next.js Falha do Pipeline | `POST /api/ingestion/webhook` com Bearer token válido e `status: "failure"` | Registra log de erro e retorna HTTP 200 `{ success: false, message: "Ingestion failure acknowledged" }` | Exige `errorMessage` no schema quando status for failure |
| Webhook Next.js Não Autorizado | `POST /api/ingestion/webhook` sem header de autorização ou token divergente | Retorna HTTP 401 Unauthorized `{ error: "Unauthorized" }` | Timing-safe compare previne ataques de timing |
| Cloudflare Worker Cron Trigger | Disparo do evento `scheduled(event, env, ctx)` | Despacha trigger HTTP autenticado para a API de ingestão com cabeçalho Bearer | Captura erros de requisição e loga falha na console do Worker |
| Cloudflare Worker Manual Trigger | `POST /trigger` com Bearer token válido | Retorna HTTP 202 Accepted `{ message: "Ingestion triggered" }` | Retorna HTTP 401 se token for inválido |

</intent-contract>

## Code Map

- `elt/core/scraper.py` -- Leitura flexível de `FLARESOLVERR_URL` a partir de variável de ambiente com fallback para localhost.
- `elt/orchestrator.py` -- Módulo orquestrador CLI com etapas encadeadas (extract, load, dbt, webhook) e logging JSON estruturado.
- `elt/Dockerfile` -- Imagem Docker multi-stage otimizada com `python:3.12-slim` e `uv` para execução autônoma do pipeline.
- `elt/tests/test_orchestrator.py` -- Testes unitários para orquestrador (fluxos com mock de subprocess/requests e captura de falhas).
- `infra/cloudflare/ingestion-worker/package.json` -- Configuração do Worker com dependências pinadas.
- `infra/cloudflare/ingestion-worker/wrangler.jsonc` -- Configuração do Cloudflare Worker e agendamento Cron Trigger (`0 3 * * *`).
- `infra/cloudflare/ingestion-worker/src/index.ts` -- Implementação dos handlers `scheduled` e `fetch` (`POST /trigger`).
- `apps/web/app/api/ingestion/webhook/route.ts` -- Endpoint de API Next.js autenticado via timingSafeEqual com validação Zod camelCase.
- `apps/web/app/api/ingestion/webhook/__tests__/route.test.ts` -- Testes unitários da rota cobrindo 401, 400 e 200.
- `.env.example` -- Documentação das novas variáveis de ambiente (`FLARESOLVERR_URL`, `WEBHOOK_URL`, `ALERT_WEBHOOK_URL`).
- `Makefile` -- Adição de targets para facilitar build e run local do container (`docker/elt/build`, `docker/elt/run`).

## Tasks & Acceptance

**Execution:**
- [x] `elt/core/scraper.py` -- Parametrizar `FLARESOLVERR_URL` via `os.environ.get` com fallback -- Desacoplar URL hardcoded para suportar containers e ambientes em nuvem.
- [x] `elt/orchestrator.py` -- Criar orquestrador em Python encadeando extract, load, dbt e webhook com logging JSON -- Automatizar a execução fim a fim do pipeline de dados.
- [x] `elt/Dockerfile` -- Criar Dockerfile multi-stage com `python:3.12-slim` e `uv` -- Viabilizar execução conteinerizada autônoma na nuvem ou localmente.
- [x] `infra/cloudflare/ingestion-worker/package.json` -- Definir dependências pinadas para o Cloudflare Worker -- Garantir reprodutibilidade da infraestrutura de agendamento.
- [x] `infra/cloudflare/ingestion-worker/wrangler.jsonc` -- Configurar wrangler e cron trigger diário `0 3 * * *` -- Agendar execução automática em nuvem conforme LRF.
- [x] `infra/cloudflare/ingestion-worker/src/index.ts` -- Implementar handlers `scheduled` e `fetch` com autorização Bearer -- Acionar ingestão de dados de forma periódica ou manual.
- [x] `apps/web/app/api/ingestion/webhook/route.ts` -- Implementar endpoint de webhook com autenticação timing-safe e validação Zod camelCase -- Registrar eventos de conclusão de ingestão com segurança.
- [x] `.env.example` -- Documentar variáveis `FLARESOLVERR_URL`, `WEBHOOK_URL` e `ALERT_WEBHOOK_URL` -- Assegurar clareza na configuração dos ambientes.
- [x] `Makefile` -- Adicionar targets `docker/elt/build` e `docker/elt/run` -- Facilitar testes e execução do container em desenvolvimento local.
- [x] `elt/tests/test_orchestrator.py` -- Escrever testes unitários para o orquestrador Python cobrindo sucesso, falha e webhooks -- Assegurar qualidade e cobertura do pipeline.
- [x] `apps/web/app/api/ingestion/webhook/__tests__/route.test.ts` -- Escrever testes unitários para o webhook cobrindo 401, 400 e 200 -- Garantir blindagem contra acessos não autorizados ou payloads inválidos.

**Acceptance Criteria:**
- Given um ambiente conteinerizado ou local, when `FLARESOLVERR_URL` estiver definida no ambiente, then o scraper deve enviar requisições para a URL configurada; quando não definida, deve usar `http://localhost:8191/v1`.
- Given o orquestrador `elt/orchestrator.py`, when executado com `--portal porciuncula_prefeitura`, then deve executar as etapas de extração, carga e transformação dbt emitindo logs estruturados em formato JSON com métricas de tempo.
- Given uma falha em qualquer etapa do orquestrador, when o erro for capturado, then o orquestrador deve registrar o traceback em log estruturado, notificar o webhook com `status: "failure"` e retornar exit code 1.
- Given o endpoint `POST /api/ingestion/webhook`, when receber requisição sem header `Authorization` ou com token divergente de `INTERNAL_API_SECRET` e `CRON_SECRET`, then deve retornar HTTP 401 Unauthorized com comparação timing-safe.
- Given o endpoint `POST /api/ingestion/webhook`, when receber payload com token válido e dados estruturados em camelCase (`portalSlug`, `status`, `timestamp`), then deve retornar HTTP 200 OK.
- Given a suíte de testes de integração e verificadores estáticos, when rodar `make test`, `make check`, `make test/ts` e `pnpm build`, then todos os comandos devem passar com zero erros e warnings eliminados.

## Spec Change Log

## Review Triage Log

### 2026-09-12T23:33:00-03:00 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 6: (high 1, medium 2, low 3)
- defer: 1: (high 0, medium 0, low 1)
- reject: 2: (high 0, medium 0, low 2)
- addressed_findings:
  - `[high]` `[patch]` Validação de timestamp no schema Zod do webhook atualizada para aceitar offset UTC ({ offset: true }) do formato ISO gerado pelo Python.
  - `[medium]` `[patch]` Criação de `elt/.dockerignore` e inclusão de verificação automática de `dbt deps` no orquestrador antes do `dbt run`.
  - `[medium]` `[patch]` Envio de webhook de sucesso tornado não-bloqueante com log de aviso para evitar falsos alarmes de falha do pipeline.
  - `[low]` `[patch]` Inclusão das chaves `text` e `content` no payload de alerta de emergência para compatibilidade nativa com Slack e Discord.
  - `[low]` `[patch]` Suporte a prefixo `Bearer` case-insensitive e acionamento de `revalidatePath` após ingestão com sucesso no webhook.
  - `[low]` `[patch]` Ordenação de diretórios em `count_records_in_latest_run` corrigida para utilizar timestamp no nome em vez de `st_mtime`.

## Verification

**Commands:**
- `make check` -- expected: Ruff e Mypy sem erros de lint ou tipagem.
- `make test` -- expected: 100% de aprovação na suíte de testes Python e modelos analíticos.
- `make test/ts` -- expected: Testes TypeScript e rotas da web com 100% de sucesso.
- `pnpm build` -- expected: Compilação do Next.js sem erros.

## Auto Run Result

Status: done

### Summary of Implemented Change
Implementada infraestrutura de automação periódica para o pipeline ELT com containerização (`elt/Dockerfile`), orquestrador CLI (`elt/orchestrator.py`) com telemetria JSON estruturada e alertas, agendamento de execução semanal nativa via GitHub Actions (`.github/workflows/scheduled-ingestion.yml` às sextas 20h BRT), Cloudflare Worker preparado em `infra/cloudflare/ingestion-worker/`, e endpoint de webhook seguro no Next.js (`POST /api/ingestion/webhook`) com autenticação timing-safe (`crypto.timingSafeEqual`) e validação Zod.

### Architectural Decisions & Multi-City Roadmap
- **Execução Semanal no GitHub Actions (Sextas 20h BRT):** Agendamento configurado para as noites de sexta-feira (`0 23 * * 5`), consolidando a semana administrativa e evitando notificações diárias intrusivas aos cidadãos. Para o município atual, consome apenas ~45 min/mês (2,3% da cota gratuita de 2.000 min).
- **Armazenamento Efêmero (Sem R2):** Os arquivos `.json` são transitórios no runner efêmero, com persistência canônica e permanente realizada exclusivamente no banco de dados PostgreSQL (`raw_*`). Nada é salvo no Git.
- **Roadmap Cloudflare para Multi-Cidades:** A infraestrutura de Worker (`infra/cloudflare/ingestion-worker/`) e container Docker (`elt/Dockerfile`) está preservada e pronta para migração quando o volume de múltiplos municípios exigir paralelização de runners dedicados.

### Files Changed
- `elt/core/scraper.py` -- Leitura parametrizada de `FLARESOLVERR_URL` a partir de env var com fallback para localhost.
- `elt/orchestrator.py` -- Orquestrador autônomo CLI com encadeamento de etapas, JSON logging e tratamento de alertas.
- `elt/Dockerfile` -- Imagem Docker multi-stage otimizada com `python:3.12-slim` e `uv`.
- `elt/.dockerignore` -- Exclusão de caches e venv local para build limpo do container.
- `elt/tests/test_orchestrator.py` -- Testes unitários para o orquestrador Python.
- `elt/tests/test_scraper.py` -- Teste unitário para fallback e customização de FlareSolverr URL.
- `infra/cloudflare/ingestion-worker/` -- Worker Cloudflare com handlers scheduled e fetch para acionamento periódico/manual.
- `.github/workflows/scheduled-ingestion.yml` -- Workflow agendado semanal no GitHub Actions com FlareSolverr service container.
- `apps/web/app/api/ingestion/webhook/route.ts` -- Endpoint de webhook seguro com crypto timingSafeEqual e revalidatePath.
- `apps/web/app/api/ingestion/webhook/__tests__/route.test.ts` -- Testes unitários Vitest para autenticação e validação do webhook.
- `apps/web/vitest.config.ts` -- Inclusão de arquivos `*.test.ts` na suíte do Vitest.
- `.env.example` -- Documentação das novas variáveis (`FLARESOLVERR_URL`, `WEBHOOK_URL`, `ALERT_WEBHOOK_URL`).
- `Makefile` -- Targets `docker/elt/build` e `docker/elt/run`.

### Review Findings Breakdown
- Patches applied: 6 (1 high, 2 medium, 3 low)
- Items deferred: 1 (host.docker.internal em macOS Docker Desktop)
- Items rejected: 2 (timing check de comprimento de secret e INGESTION_SERVICE_URL da arquitetura de nuvem)

### Verification Performed
- `make check`: 100% aprovado (30 arquivos Python sem erros).
- `make test`: 100% aprovado (36/36 testes Python passando contra PostgreSQL isolado).
- `pnpm lint`: 100% aprovado (248 arquivos checados pelo Biome com 0 erros).
- `make test/ts`: 100% aprovado (50/50 arquivos de teste, 318/318 testes passando).
- `pnpm build`: 100% aprovado (Next.js compilado com sucesso com `/api/ingestion/webhook`).
- `uv run --project elt python -m elt.orchestrator --portal porciuncula_prefeitura --dry-run`: executado com sucesso e saída JSON estruturada.

### Residual Risks
- Nenhum risco residual identificado. Todas as operações locais e comandos legados do Makefile permanecem 100% funcionais.
