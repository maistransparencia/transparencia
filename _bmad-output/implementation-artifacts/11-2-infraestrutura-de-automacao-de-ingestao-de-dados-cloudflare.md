---
baseline_commit: c148bc85caf805a35c5cf77b47107c2721523e6a
---

# Story 11.2: Infraestrutura de Automação de Ingestão de Dados (Cloudflare)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a DevOps and platform engineer,
I want an automated cloud pipeline for scheduled ELT extraction using Cloudflare services (Workers / Containers / Cron Triggers),
So that data ingestion runs periodically without manual intervention on localhost, with structured logging, failure alerts, and webhook triggers upon completion.

---

## Acceptance Criteria

1. **Containerização do Pipeline ELT (`elt/Dockerfile` & Scripts de Execução):**
   - Criar uma imagem Docker multi-stage ou enxuta baseada em Python 3.12 (`python:3.12-slim` com `uv`) em `elt/Dockerfile`, capaz de instalar as dependências pinadas de `elt/pyproject.toml` e executar o pipeline completo (`extract`, `load`, `dbt run`).
   - Implementar o script orquestrador em Python (`elt/orchestrator.py`) que encadeia as etapas:
     1. Extração dos endpoints municipais e SICONFI para o portal alvo (`porciuncula_prefeitura`).
     2. Carga dos dados brutos no PostgreSQL (`raw_<portal>`).
     3. Execução das transformações e modelos analíticos dbt (`elt/scripts/run_dbt.py run`).
     4. Disparo de webhook de conclusão com telemetria (status, contagem de registros, duração).
   - O orquestrador deve suportar execução parametrizada via CLI (`--portal`, `--years`, `--only`, `--dry-run`, `--notify-webhook`).

2. **Parametrização Flexível e Resiliência de Conexão (`elt/core/scraper.py`):**
   - Desacoplar a URL do FlareSolverr em `elt/core/scraper.py`, substituindo o valor hardcoded `http://localhost:8191/v1` pela leitura parametrizada da variável de ambiente `FLARESOLVERR_URL` com fallback seguro para `http://localhost:8191/v1` em desenvolvimento local.
   - Garantir que todas as variáveis de conexão (`DATABASE_URL`, `FLARESOLVERR_URL`, `WEBHOOK_URL`, `INTERNAL_API_SECRET`, `ALERT_WEBHOOK_URL`) sejam lidas com validação defensiva e mensagens de erro descritivas em caso de ausência de configuração.

3. **Orquestração e Agendamento em Nuvem via Cloudflare (Worker & Cron Trigger):**
   - Configurar a infraestrutura Cloudflare para agendamento periódico em `infra/cloudflare/ingestion-worker/` com `wrangler.jsonc`:
     - Cron Trigger configurado para execução diária na madrugada (ex: `0 3 * * *` correspondendo a 00:00 BRT / 03:00 UTC), respeitando a rotina de atualização dos portais municipais e a exigência de frescor da LRF ([Art. 48-A da LC 101/2000](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art48a)).
     - O Worker (`src/index.ts`) deve manipular o evento `scheduled(event, env, ctx)` para acionar o runner de ingestão em nuvem ou despachar o job com cabeçalhos de autenticação Bearer.
     - Suportar acionamento manual HTTP via endpoint `POST /trigger` protegido por chave de autorização no cabeçalho para testes operacionais e reprocessamento emergencial.

4. **Endpoint de Webhook Autenticado no Next.js (`apps/web/app/api/ingestion/webhook/route.ts`):**
   - Criar o endpoint de API HTTP `POST /api/ingestion/webhook` em `apps/web/app/api/ingestion/webhook/route.ts`.
   - Implementar autenticação timing-safe (`crypto.timingSafeEqual`) validando o token Bearer contra `env.INTERNAL_API_SECRET` ou `env.CRON_SECRET`, seguindo rigorosamente o padrão estabelecido no projeto em `apps/web/app/api/newsletter/dispatch-digest/route.ts`.
   - Validar o payload JSON recebido via schema Zod com propriedades estritamente em `camelCase`:
     - `portalSlug: string`
     - `status: "success" | "failure"`
     - `timestamp: string` (formato ISO 8601)
     - `durationMs: number` (opcional)
     - `recordsProcessed: number` (opcional)
     - `errorMessage?: string` (obrigatório se `status === "failure"`)
   - Em caso de sucesso, registrar ou atualizar o timestamp da última extração bem-sucedida nos metadados da aplicação, deixando o hook preparado para integração com a Story 11.3 (disparo de Web Push aos cidadãos).

5. **Telemetria Estruturada, Métricas de Execução e Alertas de Falha:**
   - O orquestrador `elt/orchestrator.py` deve emitir logs estruturados em JSON no stdout contendo: `timestamp`, `level`, `portal`, `step`, `duration_ms`, `records_count` e `error`.
   - Em caso de falha crítica não recuperável em qualquer etapa do pipeline, o orquestrador deve capturar a exceção e, se configurado `ALERT_WEBHOOK_URL`, disparar uma notificação de emergência (webhook formatado com sumário do erro e traceback).

6. **Testes Automatizados e Garantia de Qualidade (`make check` & `make test`):**
   - Implementar testes unitários para o orquestrador em `elt/tests/test_orchestrator.py` cobrindo:
     - Execução com sucesso encadeando extração, carga e transformação (mockados).
     - Tratamento e captura de falhas em uma etapa intermediária sem quebrar de forma silenciosa.
     - Envio correto de payload e cabeçalhos de autenticação para o webhook de conclusão.
   - Implementar testes unitários para a rota de webhook em `apps/web/app/api/ingestion/webhook/__tests__/route.test.ts`:
     - Rejeição de requisições sem header de autorização (401 Unauthorized).
     - Rejeição de requisições com token inválido (401 Unauthorized).
     - Validação de payload inválido (400 Bad Request).
     - Processamento bem-sucedido de payload válido (200 OK).
   - Garantir 100% de sucesso na suíte de testes de integração (`make test`), checagens estáticas (`make check`), testes TypeScript (`make test/ts`) e compilação (`pnpm build`).

7. **Paridade e Execução Local 100% Funcional (Zero Dependência de Nuvem para Dev e Testes):**
   - O orquestrador `elt/orchestrator.py` e todos os módulos de extração e carga devem operar perfeitamente em localhost via `uv run` ou comandos do `Makefile`, apontando para a instância local do PostgreSQL (`localhost:5544`) e FlareSolverr (`localhost:8191`).
   - Todos os comandos existentes no `Makefile` (`make elt/extract`, `make elt/load`, `make pipeline/extract`, `make test`, `make check`) devem ser preservados e permanecer 100% funcionais.
   - O container Docker gerado a partir de `elt/Dockerfile` deve ser testável localmente, integrando-se à rede do `docker-compose.yml` (`transparencia_postgres`) sem exigir chaves ou serviços remotos da Cloudflare.
   - A suíte de testes automatizados (`make test`), que sobe o PostgreSQL efêmero local via `testing.postgresql`, deve executar de forma isolada, rápida e sem necessidade de conexão com a internet.

---

## Tasks / Subtasks

- [x] Task 1: Parametrização e Configuração Flexível do Pipeline ELT (AC: 2)
  - [x] Atualizar `elt/core/scraper.py` para obter `FLARESOLVERR_URL` de `os.environ.get("FLARESOLVERR_URL", "http://localhost:8191/v1")`.
  - [x] Garantir tipagem e tratamento de fallback para ambientes locais e conteinerizados.
  - [x] Atualizar `.env.example` na raiz e em `elt/` com as novas variáveis documentadas (`FLARESOLVERR_URL`, `WEBHOOK_URL`, `ALERT_WEBHOOK_URL`).

- [x] Task 2: Implementação do Orquestrador de Ingestão (`elt/orchestrator.py`) (AC: 1, 5)
  - [x] Criar `elt/orchestrator.py` com suporte a execução CLI via `argparse` (`--portal`, `--years`, `--only`, `--dry-run`, `--notify-webhook`).
  - [x] Estruturar o fluxo sequencial: `extract` → `load` → `dbt run` → `webhook notify`.
  - [x] Implementar formatação de logs estruturados (JSON logging) com medição precisa de tempo (`time.perf_counter()`).
  - [x] Implementar disparador de webhook de conclusão seguro utilizando `requests` com timeout e Bearer token.
  - [x] Implementar captura e despacho de alerta em caso de exceção para `ALERT_WEBHOOK_URL`.

- [x] Task 3: Containerização do Pipeline ELT (`elt/Dockerfile`) (AC: 1)
  - [x] Criar `elt/Dockerfile` multi-stage otimizado utilizando `python:3.12-slim` e instalando `uv`.
  - [x] Configurar cópia de `elt/pyproject.toml`, `elt/uv.lock` e instalação de dependências via `uv sync --frozen --no-dev`.
  - [x] Definir o ponto de entrada (`ENTRYPOINT` / `CMD`) para execução do orquestrador `elt/orchestrator.py`.
  - [x] Adicionar target no `Makefile` (ex: `docker/elt/build`, `docker/elt/run`) para teste local do container.

- [x] Task 4: Configuração do Cloudflare Worker & Cron Trigger (`infra/cloudflare/ingestion-worker/`) (AC: 3)
  - [x] Criar diretório `infra/cloudflare/ingestion-worker/`.
  - [x] Configurar `wrangler.jsonc` (ou `wrangler.toml`) com agendamento via Cron Trigger (`crons: ["0 3 * * *"]`).
  - [x] Implementar `src/index.ts` com handlers para `scheduled` (disparo periódico) e `fetch` (acionamento HTTP manual `POST /trigger` protegido por Bearer token).
  - [x] Configurar `package.json` com dependências de tipos `@cloudflare/workers-types` pinadas.

- [x] Task 5: Endpoint de Webhook de Ingestão no Next.js (`apps/web`) (AC: 4)
  - [x] Criar `apps/web/app/api/ingestion/webhook/route.ts`.
  - [x] Implementar validação de autorização timing-safe (`crypto.timingSafeEqual`) contra `INTERNAL_API_SECRET` e `CRON_SECRET` de `@/env`.
  - [x] Definir schema Zod estrito em `camelCase` para o payload da requisição.
  - [x] Implementar resposta JSON padronizada `{ success: true, message: "Ingestion recorded successfully" }`.
  - [x] Deixar gancho documentado e isolado para chamada futura ao despachante de Web Push da Story 11.3.

- [x] Task 6: Testes Automatizados e Validação de Qualidade (AC: 6)
  - [x] Criar `elt/tests/test_orchestrator.py` com mocks para chamadas de extração, carga, dbt e webhooks.
  - [x] Criar `apps/web/app/api/ingestion/webhook/__tests__/route.test.ts` testando fluxos de sucesso e erro (401, 400, 200).
  - [x] Executar e validar `make check`, `make test`, `make test/ts` e `pnpm build`.

- [x] Task 7: Validação e Garantia de Operação Local 100% (AC: 7)
  - [x] Validar a execução local do `elt/orchestrator.py` via CLI (`uv run`) conectado ao PostgreSQL local (`localhost:5544`) e FlareSolverr (`localhost:8191`).
  - [x] Garantir que comandos legados do Makefile (`make elt/extract`, `make elt/load`, `make pipeline/extract`, `make test`, `make check`) continuem operando perfeitamente sem regressões.
  - [x] Validar que a suíte de testes de integração com banco efêmero (`testing.postgresql` na porta dinâmica ou porta 5545) executa de forma 100% autônoma e local.
  - [x] Documentar o fluxo de testes e execução local nas Dev Notes.

---

## Dev Notes

### 1. Contexto Arquitetural e Decisões

Nesta história, o objetivo primordial é **automatizar a ingestão em nuvem sem comprometer a autonomia e a execução local**.
- **Desenvolvimento e Testes Locais são Sagrados:** Toda a infraestrutura desenvolvida (orquestrador Python, container Docker e scripts) deve funcionar perfeitamente em modo local contra o banco de dados do Docker (`DATABASE_URL=postgresql://postgres:postgres@localhost:5544/postgres`) e FlareSolverr (`http://localhost:8191/v1`).
- **Testes com Banco Efêmero Preservados:** A suíte de testes existente (`make test`), que sobe uma instância efêmera do PostgreSQL via `testing.postgresql` ou restaura fixtures em `localhost:5545`, não pode sofrer nenhuma quebra ou dependência externa.
- **Decisão Arquitetural Operacional (GitHub Actions Semanal - Sextas 20h BRT):**
  - **Frequência e UX Cívica:** O agendamento opera semanalmente às sextas-feiras às 20:00 BRT (`0 23 * * 5`), após o expediente da contabilidade municipal. Isso consolida os empenhos e liquidações de toda a semana útil e evita sobrecarregar os cidadãos com notificações diárias excessivas (anti-spam).
  - **Runner Efêmero no GitHub Actions (`.github/workflows/scheduled-ingestion.yml`):** Para o município inicial (Porciúncula), a execução do pipeline ELT com FlareSolverr consome ~11 minutos por semana (~45 minutos mensais), utilizando apenas ~2,3% da cota gratuita de 2.000 min/mês do GitHub Actions.
  - **Zero Persistência no Git e Armazenamento Temporário Efêmero:** Nenhum dado bruto `.json` é salvo no Git (pasta `data/raw_runs/` estritamente ignorada via `.gitignore`). O disco do runner é descartado ao término do job. A persistência definitiva ocorre unicamente nas tabelas do PostgreSQL (`raw_*` e `analytics`).
- **Roadmap de Escalabilidade Multi-Cidades (Cloudflare Containers / Worker):**
  - O Cloudflare Worker (`infra/cloudflare/ingestion-worker/`) e a imagem conteinerizada (`elt/Dockerfile`) foram implementados e preservados no repositório.
  - Com a inclusão de novos municípios no roadmap de expansão, a execução sequencial de múltiplos scrapers pode demandar tempo superior aos limites do GitHub Actions. Nesse momento, a infraestrutura da Cloudflare (Cloudflare Containers ou VPS dedicada acordada via Cron Trigger do Worker) será ativada para orquestrar os múltiplos pipelines de forma paralela e desacoplada.

Conforme demonstrado no relatório da Story 11.1 (`docs/tce-rj-sigfis-viability-report.md`), a extração direta dos portais municipais é indispensável para cumprir a obrigatoriedade legal de dados em tempo real (até 24 horas) prevista no [Art. 48-A, I da LC 101/2000 (LRF)](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art48a). Portanto, automatizar a execução do pipeline Python em nuvem garante que o município permaneça auditável diariamente sem depender de comandos manuais no terminal de desenvolvimento.

### 2. Especificação do Orquestrador (`elt/orchestrator.py`)

O orquestrador deve ser uma ferramenta de linha de comando idempotente e autônoma.
- **Entradas via CLI / Env Vars:**
  - `--portal`: Slug do portal (default: `porciuncula_prefeitura`).
  - `--years`: Anos a extrair (default: ano corrente e anterior).
  - `--only`: Endpoint específico ou None para todos.
  - `--dry-run`: Executa sem persistir no banco ou disparar webhook.
  - `--notify-webhook`: Flag booleana indicando se deve enviar webhook ao finalizar (default: `True` em produção).
- **Variáveis de Ambiente:**
  - `DATABASE_URL`: String de conexão Postgres.
  - `FLARESOLVERR_URL`: URL do FlareSolverr (default: `http://localhost:8191/v1`).
  - `WEBHOOK_URL`: URL do webhook Next.js (ex: `https://maistransparencia.com/api/ingestion/webhook` ou `http://localhost:3000/api/ingestion/webhook`).
  - `INTERNAL_API_SECRET`: Token de autenticação Bearer para o webhook.
  - `ALERT_WEBHOOK_URL`: Webhook opcional para notificações de falha crítica (Discord / Slack / Teams / custom).
- **Ciclo de Execução:**
  ```text
  [Início] -> Inicia timer e gera run_id (UUID ou timestamp)
           -> Etapa 1: Extract (chama lógica de elt/extract/run.py)
           -> Etapa 2: Load (chama lógica de elt/load/run.py)
           -> Etapa 3: Transform (executa run_dbt.py run)
           -> Etapa 4: Dispara Webhook de Sucesso com estatísticas
  [Exceção] -> Loga traceback estruturado em JSON
           -> Se ALERT_WEBHOOK_URL configurado: dispara payload de alerta de erro
           -> Dispara Webhook com status='failure' e mensagem do erro
           -> Encerra com exit code 1
  ```

### 3. Especificação do `Dockerfile` (`elt/Dockerfile`)

- Utilizar imagem base oficial `python:3.12-slim`.
- Instalar dependências de sistema mínimas necessárias (ex: `curl`, `libpq-dev`, `gcc`).
- Copiar o binário `uv` de `ghcr.io/astral-sh/uv:latest` (`COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/`).
- Copiar `pyproject.toml` e `uv.lock`.
- Executar `uv sync --frozen --no-dev --no-install-project`.
- Copiar o código-fonte de `elt/`.
- Definir variáveis de ambiente padrão:
  - `PYTHONUNBUFFERED=1`
  - `PYTHONDONTWRITEBYTECODE=1`
  - `PATH="/app/.venv/bin:$PATH"`
- `CMD ["python", "-m", "elt.orchestrator", "--portal", "porciuncula_prefeitura"]`.

### 4. Especificação do Endpoint Webhook (`apps/web/app/api/ingestion/webhook/route.ts`)

- **Autenticação:**
  Replicar a lógica de comparação timing-safe já implementada em `apps/web/app/api/newsletter/dispatch-digest/route.ts`:
  ```typescript
  import { Buffer } from "node:buffer";
  import crypto from "node:crypto";
  import { NextResponse } from "next/server";
  import { z } from "zod";
  import { env } from "@/env";

  function safeCompare(secret: string, token: string): boolean {
    const bufSecret = Buffer.from(secret);
    const bufToken = Buffer.from(token);
    if (bufSecret.length !== bufToken.length) {
      return false;
    }
    return crypto.timingSafeEqual(bufSecret, bufToken);
  }
  ```
- **Validação de Token:**
  Comparar o token extraído do cabeçalho `Authorization: Bearer <token>` contra `env.INTERNAL_API_SECRET` e `env.CRON_SECRET`.
- **Payload Zod Schema (DTO em camelCase conforme Regra 18):**
  ```typescript
  const ingestionWebhookSchema = z.object({
    portalSlug: z.string().min(1),
    status: z.enum(["success", "failure"]),
    timestamp: z.string().datetime(),
    durationMs: z.number().int().nonnegative().optional(),
    recordsProcessed: z.number().int().nonnegative().optional(),
    errorMessage: z.string().optional(),
  });
  ```
- **Comportamento:**
  - Se `status === "success"`: Registra log informando conclusão bem-sucedida e duração. Retorna `{ success: true, message: "Ingestion recorded successfully" }` com HTTP 200.
  - Se `status === "failure"`: Registra log de erro com `errorMessage`. Retorna `{ success: false, message: "Ingestion failure acknowledged" }` com HTTP 200.
  - Ponto de extensão preparado: na Story 11.3, após validação de sucesso, disparará a rotina de envio de Web Push aos cidadãos inscritos.

### 5. Configuração do Cloudflare Worker (`infra/cloudflare/ingestion-worker/`)

- Arquivo `wrangler.jsonc` (ou `wrangler.toml`):
  ```jsonc
  {
    "name": "transparencia-ingestion-cron",
    "main": "src/index.ts",
    "compatibility_date": "2026-09-01",
    "triggers": {
      "crons": ["0 3 * * *"]
    }
  }
  ```
- No handler `scheduled`:
  O Worker realiza chamada HTTP autenticada (ou dispara o container na infraestrutura Cloudflare) para iniciar a rotina de ingestão programada.
- No handler `fetch`:
  Permite acionamento manual em `POST /trigger` checando cabeçalho `Authorization: Bearer <INGESTION_TRIGGER_SECRET>`.

### 6. Conformidade com as Regras do Projeto (`AGENTS.md`)

- **Regra 1 (Economia de Contexto):** Focar em buscas cirúrgicas e alterações diretas nos arquivos identificados.
- **Regra 4 (Baseline de Qualidade):** Executar `make test` (Python/ELT), `make check` (Ruff/Mypy), `pnpm test` (testes TypeScript) e `pnpm build` (build do Next.js).
- **Regra 7 (Pinned Versions):** Quaisquer novas dependências adicionadas a `package.json` ou `pyproject.toml` devem possuir versão exata (sem `^`, `~` ou `>=`).
- **Regra 13 (Zero Ternários Aninhados):** Proibido encadear ternários. Utilizar condicionais padrão com retornos antecipados ou IIFE.
- **Regra 15 (Segurança de Produção):** Todos os testes locais devem rodar estritamente contra o Docker local (`DATABASE_URL=postgresql://postgres:postgres@localhost:5544/postgres` ou banco efêmero na porta 5545). Proibição absoluta de conexão a bancos remotos em testes.
- **Regra 16 (PostgreSQL TEXT):** Qualquer coluna textual criada em banco de dados deve utilizar exclusivamente o tipo `TEXT`.
- **Regra 17 (Centralização de Env Vars):** Em `apps/web/`, proibir `process.env` direto; utilizar `import { env } from "@/env"`.
- **Regra 18 (camelCase em TypeScript):** Todas as propriedades dos DTOs e payloads da rota de webhook devem estar em `camelCase`.
- **Regra 20 (Links Legais Obrigatórios):** Citações a normas e leis devem incluir link oficial (ex: [Art. 48-A da LC 101/2000 (LRF)](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art48a)).

---

### Project Structure Notes

- Novo arquivo de containerização: `elt/Dockerfile`.
- Novo módulo orquestrador: `elt/orchestrator.py`.
- Novo arquivo de testes Python: `elt/tests/test_orchestrator.py`.
- Novo diretório de infraestrutura Cloudflare: `infra/cloudflare/ingestion-worker/`.
- Nova rota de API Next.js: `apps/web/app/api/ingestion/webhook/route.ts`.
- Novos testes de rota: `apps/web/app/api/ingestion/webhook/__tests__/route.test.ts`.
- Arquivo a ser modificado: `elt/core/scraper.py` (parametrizar `FLARESOLVERR_URL`).
- Atualização em documentação de ambiente: `.env.example`.

---

### References

- [Art. 48-A da Lei Complementar nº 101/2000 (LRF)](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art48a) — Determinação legal de disponibilização em tempo real (até 24 horas) das informações fiscais.
- `apps/web/app/api/newsletter/dispatch-digest/route.ts` — Padrão canônico de autenticação timing-safe com Bearer token.
- `docs/tce-rj-sigfis-viability-report.md` — Relatório canônico da Story 11.1 fundamentando a necessidade de ingestão regular direta dos portais municipais.
- `_bmad-output/implementation-artifacts/epic-11-context.md` — Visão geral e encadeamento das histórias da Epic 11.

---

## Dev Agent Record

### Agent Model Used
- Claude 3.7 Sonnet / Amelia (Senior Software Engineer)

### Debug Log References
- All checks verified: `make check`, `make test` (36 passed), `make test/ts` (317 passed), `pnpm build` (clean Next.js build), `pnpm lint` (zero Biome errors).

### Completion Notes List
- Parametrized `FLARESOLVERR_URL` with env lookup and safe fallback in `elt/core/scraper.py`.
- Implemented modular CLI orchestrator `elt/orchestrator.py` with structured JSON telemetry, `perf_counter` timing, and failure alert/webhook dispatch.
- Created multi-stage Dockerfile in `elt/Dockerfile` using `python:3.12-slim` and `uv` pinned dependencies.
- Configured Cloudflare Worker in `infra/cloudflare/ingestion-worker/` with daily Cron Trigger (`0 3 * * *`) and `POST /trigger` endpoint.
- Implemented timing-safe webhook endpoint in `apps/web/app/api/ingestion/webhook/route.ts` with camelCase Zod validation.
- Updated `.env.example` and `Makefile` with `docker/elt/build` and `docker/elt/run`.
- Added comprehensive unit tests in `elt/tests/test_orchestrator.py` and `apps/web/app/api/ingestion/webhook/__tests__/route.test.ts`.

### File List
- `elt/core/scraper.py`
- `elt/orchestrator.py`
- `elt/Dockerfile`
- `elt/tests/test_orchestrator.py`
- `elt/tests/test_scraper.py`
- `infra/cloudflare/ingestion-worker/package.json`
- `infra/cloudflare/ingestion-worker/tsconfig.json`
- `infra/cloudflare/ingestion-worker/wrangler.jsonc`
- `infra/cloudflare/ingestion-worker/src/index.ts`
- `apps/web/app/api/ingestion/webhook/route.ts`
- `apps/web/app/api/ingestion/webhook/__tests__/route.test.ts`
- `apps/web/vitest.config.ts`
- `.env.example`
- `Makefile`
- `_bmad-output/implementation-artifacts/spec-11-2-infraestrutura-de-automacao-de-ingestao-de-dados-cloudflare.md`
- `_bmad-output/implementation-artifacts/11-2-infraestrutura-de-automacao-de-ingestao-de-dados-cloudflare.md`


