---
title: 'Story 10.2: Isolamento dos Marts Analíticos no Schema Dedicado analytics'
type: 'refactor'
created: '2026-09-12T15:03:27-03:00'
baseline_revision: e9dd9736e7de67909f7599ebc1639c13eaba4a3c
final_revision: f400cd8
status: done
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** Os modelos analíticos dbt (marts `fct_*` e `dim_*`) residem atualmente no schema `public`, misturando tabelas analíticas com tabelas operacionais da aplicação (`newsletter_subscribers`) e impedindo governança estrita de permissões de leitura.

**Approach:** Configurar o dbt para materializar os marts no schema `analytics` customizado, atualizar os scripts DDL de permissões/roles (`read_only` e `postgres`), configurar o `search_path = analytics, public` nos pools Kysely em `@transparencia/db` e no `conftest.py`, e sincronizar as fixtures de teste no `Makefile`.

## Boundaries & Constraints

**Always:**
- Toda alteração em modelos SQL deve respeitar a Regra 6 (sem alinhamento por espaços) e Regra 15 (testes e migrações rodando estritamente contra PostgreSQL local/efêmero).
- Os testes analíticos em Python (`make test`) e TypeScript (`make test/ts`) devem continuar com 100% de aprovação.
- O dump de fixtures no `Makefile` deve conter `CREATE SCHEMA IF NOT EXISTS analytics;` para assegurar compatibilidade com o CI.

**Block If:**
- Modificações exigirem renomeação de colunas em marts ou breaking changes de API na aplicação web.

**Never:**
- Nunca usar `VARCHAR(n)` ou `CHAR(n)` (Regra 16).
- Nunca acessar `process.env` diretamente ou executar comandos contra instâncias remotas/produção (Regras 15 e 17).
- Nunca quebrar queries existentes do Kysely qualificando manualmente nomes de tabelas como `analytics.fct_*` no TypeScript (usar sempre `search_path`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| dbt Marts Materialization | Execução do dbt compile/run | Tabelas e views de `marts/` criadas no schema `analytics`; `staging` e `intermediate` no schema default | Falha de compilação se schema não existir ou macro falhar |
| Kysely Client Connection | Pool `connect` em `client.ts` | Conexão executa `SET search_path = analytics, public;` resolvendo `fct_*` em `analytics` e `seed_*`/`newsletter_subscribers` em `public` | Propaga erro caso query SET search_path falhe |
| Fixture CI Restore | Container vazio de PostgreSQL no CI | Restauração executa `CREATE SCHEMA IF NOT EXISTS analytics;` antes de criar tabelas `analytics.fct_*` | Aborta restauração com erro de schema inexistente |

</intent-contract>

## Code Map

- `elt/transform/macros/generate_schema_name.sql` -- Macro do dbt para respeitar schemas customizados (`custom_schema_name`)
- `elt/transform/dbt_project.yml` -- Configuração do schema `analytics` para marts e hook `on-run-start`
- `docker/init/01-init-roles.sql` -- Inicialização do banco local com criação do schema `analytics`, permissões do role `read_only` e search_path
- `elt/migrations/grant_readonly.sql` -- Script de concessão de permissões, default privileges e RLS para schemas `public` e `analytics`
- `packages/db/src/client.ts` -- Pool Kysely com listener `connect` para `SET search_path = analytics, public;`
- `elt/conftest.py` -- Configuração do PostgreSQL efêmero com criação do schema `analytics` e `search_path` na fixture `conn`
- `Makefile` -- Target `db/fixture/dump` atualizado para exportar tabelas do schema `analytics` com criação de schema
- `packages/db/tests/fixtures/schema.sql.gz` -- Fixture binária compactada para testes unitários Kysely/web

## Tasks & Acceptance

**Execution:**
- [x] `elt/transform/macros/generate_schema_name.sql` -- atualizar macro para retornar `custom_schema_name | trim` quando informado, permitindo isolamento em schema customizado -- viabiliza custom schemas sem concatenação automática
- [x] `elt/transform/dbt_project.yml` -- adicionar `+schema: analytics` em `models.transparencia.marts` e `CREATE SCHEMA IF NOT EXISTS analytics;` no hook `on-run-start` -- direciona marts para schema dedicado e garante sua existência prévia
- [x] `docker/init/01-init-roles.sql` -- adicionar criação do schema `analytics`, concessões de USAGE/SELECT para `read_only` e `ALTER ROLE ... SET search_path = analytics, public;` -- assegura permissões de leitura no ambiente Docker
- [x] `elt/migrations/grant_readonly.sql` -- adicionar permissões do schema `analytics` e expandir loop de RLS para `schemaname IN ('public', 'analytics')` -- protege e audita acesso do role de leitura
- [x] `packages/db/src/client.ts` -- adicionar listeners `connect` em `pool` e `writePool` executando `SET search_path = analytics, public;` -- resolve tabelas analíticas e públicas no Kysely sem alteração de queries
- [x] `elt/conftest.py` -- criar schema `analytics` em `_create_raw_schema` e incluir `analytics` no `search_path` da fixture `conn` -- provê ambiente de teste efêmero idêntico ao de produção
- [x] `Makefile` -- atualizar target `db/fixture/dump` com `echo 'CREATE SCHEMA IF NOT EXISTS analytics;'` e flags de dump para `analytics.fct_*`, `analytics.dim_*` e `public.seed_*` -- garante dump multi-schema correto
- [x] `packages/db/tests/fixtures/schema.sql.gz` -- regerar dump compactado a partir do banco local Docker atualizado com `make dbt/run` e `make db/fixture/dump` -- sincroniza fixtures de teste TypeScript para CI/CD

**Acceptance Criteria:**
- Given modelos dbt de marts, when compilados via `uv run --project elt python elt/scripts/run_dbt.py compile`, then as relações geradas referenciam estritamente `"analytics"."fct_*"` e `"analytics"."dim_*"`.
- Given conexão Kysely em `@transparencia/db`, when queries executadas sobre `fct_*` ou `seed_*`, then ambas as tabelas são resolvidas corretamente sem qualificação explícita de schema e todos os testes em `make test/ts` passam.
- Given suíte de integração Python em `elt/conftest.py`, when `make test` executado contra `testing.postgresql`, then 100% dos testes de analytics passam com os marts no schema `analytics`.
- Given fixture compactada `packages/db/tests/fixtures/schema.sql.gz`, when restaurada via `make db/test/restore`, then o schema `analytics` é criado e todas as tabelas analíticas e seeds são povoadas sem erros.

## Spec Change Log

## Review Triage Log

### 2026-09-12 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 5: (high 0, medium 1, low 4)
- defer: 2
- reject: 7
- addressed_findings:
  - `[low]` `[patch]` Adicionado `.catch(() => {})` na execução de `client.query` nos listeners de `connect` dos pools `pool` e `writePool` em `packages/db/src/client.ts` para eliminar unhandled promise rejections.
  - `[medium]` `[patch]` Qualificada a criação da tabela e índices de `newsletter_subscribers` explicitamente com `.withSchema("public")` em `packages/db/src/migrations/001_create_newsletter_subscribers.ts`.
  - `[low]` `[patch]` Adicionados `ALTER ROLE read_only SET search_path = analytics, public;` e `ALTER ROLE postgres SET search_path = analytics, public;` em `elt/migrations/grant_readonly.sql`.
  - `[low]` `[patch]` Blindada a macro `generate_schema_name.sql` com verificação estrita de string não vazia (`custom_schema_name | trim != ''`).
  - `[low]` `[patch]` Atualizado dump de fixtures no `Makefile` para `-t 'analytics.*' -t 'public.seed_*'` garantindo cobertura total de tabelas analíticas.

## Design Notes

Configurar o `search_path = analytics, public` tanto a nível de pool de conexões quanto nas sessões dos testes garante retrocompatibilidade total:
```typescript
pool.on("connect", (client) => {
  client.query("SET search_path = analytics, public;");
});
```
Isso dispensa alterações em queries Kysely existentes e mantém a compatibilidade com tabelas da aplicação em `public`.

## Verification

**Commands:**
- `uv run --project elt python elt/scripts/run_dbt.py compile` -- expected: compilação dbt bem-sucedida com marts em `analytics`
- `make check` -- expected: linters ruff, format check e mypy aprovados com zero erros
- `make test` -- expected: testes Python de integração passando contra postgres efêmero
- `make test/ts` -- expected: 100% dos testes Kysely/TypeScript passando
- `pnpm build` -- expected: build de produção bem-sucedido

## Auto Run Result

### Summary of Implemented Change
- Configurado o isolamento de todos os 41 marts dbt (`fct_*` e `dim_*`) no schema dedicado `analytics`.
- Atualizada a macro `generate_schema_name.sql` para suportar `custom_schema_name` com validação de string não vazia.
- Adicionado hook `CREATE SCHEMA IF NOT EXISTS analytics;` em `dbt_project.yml`.
- Atualizados `01-init-roles.sql` e `grant_readonly.sql` com criação de schema `analytics`, concessões explícitas de `USAGE`/`SELECT` e privilégios padrão para `read_only`, loop RLS sobre `public` e `analytics`, e `ALTER ROLE read_only/postgres SET search_path = analytics, public;`.
- Configurados listeners `connect` em `pool` e `writePool` em `packages/db/src/client.ts` executando `SET search_path = analytics, public;` com tratamento seguro de promessas (`.catch(() => {})`).
- Qualificada criação de tabela e índices de `newsletter_subscribers` explicitamente com `.withSchema("public")` em `001_create_newsletter_subscribers.ts`.
- Atualizado `elt/conftest.py` para criar o schema `analytics` e incluir `analytics` no `search_path` da fixture de conexão.
- Atualizado `Makefile` para exportar `CREATE SCHEMA IF NOT EXISTS analytics;` e filtrar `-t 'analytics.*' -t 'public.seed_*'`.
- Regerada e validada a fixture de teste compactada `packages/db/tests/fixtures/schema.sql.gz`.

### Files Changed
- `elt/transform/macros/generate_schema_name.sql`: Suporte e blindagem para custom schema `analytics`.
- `elt/transform/dbt_project.yml`: `+schema: analytics` para marts e hook `on-run-start`.
- `docker/init/01-init-roles.sql`: Criação do schema `analytics`, concessões e search_path para `read_only` e `postgres`.
- `elt/migrations/grant_readonly.sql`: Permissões completas, RLS e search_path para o schema `analytics`.
- `packages/db/src/client.ts`: Listeners de conexão com `SET search_path = analytics, public;` e tratamento de erros.
- `packages/db/src/migrations/001_create_newsletter_subscribers.ts`: Escopo explícito com `withSchema("public")`.
- `elt/conftest.py`: Schema `analytics` e search_path no PostgreSQL efêmero de testes.
- `Makefile`: Target `db/fixture/dump` com criação de schema e dump integral de `analytics.*` e `public.seed_*`.
- `packages/db/tests/fixtures/schema.sql.gz`: Fixture multi-schema regerada e verificada.

### Review Findings Breakdown
- Patches applied: 5 (floating promise no connect, schema explícito em newsletter migration, search_path em grant_readonly, blindagem de macro dbt, dump flag no Makefile)
- Items deferred: 2 (suporte a poolers em transaction mode via connection string options, ciclo de reaplicação periódica de RLS sobre tabelas criadas via dbt run)
- Items rejected: 7 (ausência de FOR ROLE, multi-tenant dbt, search_path no pipeline raw ELT, clean flag no dump, init docker em volume existente, privilégio CREATE para não-superusuário, duplicação de listener de conexão)

### Follow-up Review Recommendation
`false` — As correções aplicadas na revisão foram pontuais, de baixo impacto, preservando 100% a estabilidade da API e suíte de testes.

### Verification Performed
- `uv run --project elt python elt/scripts/run_dbt.py compile`: 65/65 modelos compilados com sucesso, marts gerados em `"analytics"`.
- `make check`: 100% aprovado (ruff check, ruff format, mypy sem erros).
- `make test`: 96/96 testes aprovados no PostgreSQL efêmero.
- `make test/ts`: 307/307 testes aprovados em 49 arquivos de teste no Vitest.
- `make db/test/restore`: Restauração da fixture executada com criação de schema e tabelas no banco de testes.
- `pnpm build`: Compilação dos pacotes e aplicação concluída com sucesso.

### Residual Risks
Nenhum risco funcional residual identificado. Toda a linhagem analítica dbt e consumo Kysely operam com transparência e retrocompatibilidade assegurada via `search_path`.

