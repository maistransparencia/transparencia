---
baseline_revision: e9dd9736e7de67909f7599ebc1639c13eaba4a3c
final_revision: f400cd8
status: done
review_loop_iteration: 0
followup_review_recommended: false
---

# Story 10.2: Isolamento dos Marts Analíticos no Schema Dedicado `analytics`

Status: done

## Story

As a system architect and backend engineer querying public fiscal data,
I want all dbt marts and analytics views to reside in a dedicated `analytics` schema (instead of `public`), with updated database roles/permissions in `elt/migrations/grant_readonly.sql` and corresponding Kysely queries in `@transparencia/db`,
so that analytics data is cleanly segregated from staging/raw schemas with robust security boundaries, preserving full transparency and seamless consumption across web applications.

---

## Acceptance Criteria

1. **Configuração e Isolamento de Schema no dbt (`analytics`):**
   - **Given** que todos os 41 modelos dbt da camada `marts` (`elt/transform/models/marts/` incluindo `core/`, `financeiro/` e `metrics/`) atualmente compilam e materializam tabelas e views no schema `public`
   - **When** `elt/transform/dbt_project.yml` for configurado com `+schema: analytics` para o diretório `marts:` e o macro `elt/transform/macros/generate_schema_name.sql` for atualizado para respeitar `custom_schema_name`
   - **Then** todos os modelos de marts (`fct_*` e `dim_*`) são materializados estritamente dentro do schema `analytics`
   - **And** modelos de staging e intermediate permanecem isolados em seus respectivos schemas/defaults (`public` ou staging) sem colisão de namespace
   - **And** `on-run-start` em `dbt_project.yml` garante a criação prévia do schema via `CREATE SCHEMA IF NOT EXISTS analytics;`.

2. **Governança de Permissões e Segurança de Banco (`grant_readonly.sql` e Docker Init):**
   - **Given** que o usuário `read_only` é utilizado em ambientes gerenciados/produção e no Docker local para consultas de leitura públicas
   - **When** os scripts `elt/migrations/grant_readonly.sql` e `docker/init/01-init-roles.sql` forem executados
   - **Then** o schema `analytics` possui concessão explícita de `USAGE` e `SELECT` em todas as tabelas/sequências para o role `read_only` (`GRANT USAGE ON SCHEMA analytics TO read_only;`, `GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO read_only;`)
   - **And** privilégios padrão (`ALTER DEFAULT PRIVILEGES IN SCHEMA analytics GRANT SELECT ON TABLES TO read_only;`) são concedidos
   - **And** o loop de Row Level Security (RLS) em `grant_readonly.sql` itera sobre `schemaname IN ('public', 'analytics')`, aplicando a política `read_only_select` para todas as tabelas do schema `analytics`
   - **And** o `search_path` padrão dos roles `read_only` e `postgres` é parametrizado como `analytics, public`.

3. **Compatibilidade e Resolução de Schemas em `@transparencia/db` (Kysely):**
   - **Given** que a camada de dados Kysely (`packages/db`) realiza leituras atômicas sobre tabelas de métricas e seeds
   - **When** o pool de conexões do PostgreSQL for inicializado em `packages/db/src/client.ts`
   - **Then** os pools `pool` (leitura) e `writePool` (escrita) configuram o evento `connect` para executar `SET search_path = analytics, public`, garantindo que consultas a `fct_*` e `dim_*` encontrem as tabelas no schema `analytics` e consultas a `seed_*` e `newsletter_subscribers` continuem funcionando no schema `public`
   - **And** nenhuma quebra ou regressão ocorre nas 20 suítes de teste de queries (`packages/db/src/queries/__tests__/*.spec.ts`).

4. **Sincronização de Fixtures de Teste e CI/CD (`Makefile` e `conftest.py`):**
   - **Given** que a suíte de testes de integração Python utiliza `testing.postgresql` em `elt/conftest.py` e os testes TypeScript utilizam `packages/db/tests/fixtures/schema.sql.gz`
   - **When** a migração para o schema `analytics` for concluída
   - **Then** `elt/conftest.py` cria o schema `analytics` em `_create_raw_schema(eng)` e configura `SET search_path = raw_porciuncula_prefeitura, analytics, public` na fixture `conn`
   - **And** o target `db/fixture/dump` no `Makefile` é atualizado para exportar o schema `analytics` (`-n analytics -t 'public.seed_*'`)
   - **And** o arquivo de fixture compactado `packages/db/tests/fixtures/schema.sql.gz` é regerado com a nova estrutura multi-schema
   - **And** o workflow do GitHub Actions (`.github/workflows/ci.yml`) restaura e executa todos os passos com 100% de sucesso.

5. **Validação de Qualidade e Zero Regressão:**
   - **Given** as alterações de schema no dbt, scripts SQL, client Kysely e conftest
   - **When** todos os linters e suítes de teste forem executados
   - **Then** `make check` aprova sem nenhum erro de tipagem (mypy) ou formatação (ruff)
   - **And** `make test` executa 100% dos testes analíticos em Python contra o PostgreSQL efêmero
   - **And** `make test/ts` (`pnpm test`) passa em todos os 68+ testes unitários e de integração TypeScript
   - **And** `pnpm build` compila os pacotes e a aplicação web sem erros.

---

## Tasks / Subtasks

- [x] Task 1: Configuração do Schema `analytics` no dbt (AC: 1)
  - [x] Subtask 1.1: Atualizar `elt/transform/macros/generate_schema_name.sql` para suportar `custom_schema_name`:
    ```jinja
    {% macro generate_schema_name(custom_schema_name, node) -%}
        {%- if custom_schema_name is not none and custom_schema_name | trim != '' -%}
            {{ custom_schema_name | trim }}
        {%- else -%}
            {{ target.schema }}
        {%- endif -%}
    {%- endmacro %}
    ```
  - [x] Subtask 1.2: Atualizar `elt/transform/dbt_project.yml` adicionando `+schema: analytics` sob a chave `models.transparencia.marts`.
  - [x] Subtask 1.3: Adicionar `"CREATE SCHEMA IF NOT EXISTS analytics;"` no hook `on-run-start` de `elt/transform/dbt_project.yml`.
  - [x] Subtask 1.4: Validar a compilação via `uv run --project elt python elt/scripts/run_dbt.py compile` e certificar que as relações de marts compilam como `"analytics"."fct_..."` e `"analytics"."dim_..."`.

- [x] Task 2: Atualização dos Scripts de Permissão e Docker Init (AC: 2)
  - [x] Subtask 2.1: Atualizar `docker/init/01-init-roles.sql` para criar o schema `analytics`, conceder USAGE/SELECT para `read_only`, configurar default privileges e definir `ALTER ROLE read_only SET search_path = analytics, public;` e `ALTER ROLE postgres SET search_path = analytics, public;`.
  - [x] Subtask 2.2: Atualizar `elt/migrations/grant_readonly.sql` adicionando `CREATE SCHEMA IF NOT EXISTS analytics;`, permissões completas de leitura/default privileges no schema `analytics` e expandindo o loop DO/RLS para contemplar `schemaname IN ('public', 'analytics')`.

- [x] Task 3: Adequação da Camada de Conexão Kysely em `@transparencia/db` (AC: 3)
  - [x] Subtask 3.1: Em `packages/db/src/client.ts`, registrar listeners `pool.on("connect", (client) => { client.query("SET search_path = analytics, public").catch(() => {}); })` e `writePool.on("connect", ...)` para garantir resolução transparente de marts e tabelas públicas sem depender de alterações manuais de role em bancos remotos/efêmeros.
  - [x] Subtask 3.2: Verificar se alguma query ou migração em `packages/db/src/queries/` necessita de ajuste de schema explícito.

- [x] Task 4: Sincronização do Ambiente de Testes Python (`elt/conftest.py`) (AC: 4, AC: 5)
  - [x] Subtask 4.1: Em `elt/conftest.py`, atualizar `_create_raw_schema(eng)` para executar `conn.execute(text("CREATE SCHEMA IF NOT EXISTS analytics"))`.
  - [x] Subtask 4.2: Em `elt/conftest.py`, atualizar a fixture `conn` para `SET search_path = analytics, raw_porciuncula_prefeitura, public`.
  - [x] Subtask 4.3: Executar `make test` e verificar se toda a suíte de analytics Python passa sem quebras.

- [x] Task 5: Atualização do Dump de Fixtures e Validação em CI/CD (AC: 4, AC: 5)
  - [x] Subtask 5.1: Em `Makefile`, atualizar o target `db/fixture/dump` substituindo `-t 'public.fct_*' -t 'public.dim_*'` por `-t 'analytics.*' -t 'public.seed_*'`.
  - [x] Subtask 5.2: Executar `make dbt/run` no banco local (Docker 5544) e em seguida executar `make db/fixture/dump` para regerar `packages/db/tests/fixtures/schema.sql.gz` com o schema `analytics`.
  - [x] Subtask 5.3: Executar `make test/ts` (`pnpm --filter @transparencia/db test`) e `pnpm build` para assegurar aprovação integral.
  - [x] Subtask 5.4: Executar `make check` para validar tipagem e linters.

---

## Dev Notes

### Diagnóstico e Racional Arquitetural
Atualmente, todos os 41 modelos dbt de marts analíticos (como `fct_posicao_fiscal_metricas`, `fct_despesas`, `dim_portais`, etc.) residem diretamente no schema `public`. Essa configuração:
1. Mistura tabelas analíticas materializadas com tabelas operacionais da aplicação (`newsletter_subscribers`) e tabelas/views residuais.
2. Dificulta a concessão granulada de permissões e auditoria de segurança (ex: conceder acesso somente-leitura restrito às tabelas analíticas consolidadas, sem expor metadados internos ou dados transacionais operacionais).
3. O isolamento no schema `analytics` estabelece um padrão de data warehouse limpo e seguro, sem quebrar o consumo pela aplicação web graças à configuração consistente de `search_path`.

### Comportamento do dbt com Schemas Customizados
Por padrão, o dbt concatena o target schema com o custom schema (`public_analytics`). No entanto, o projeto possui o macro `elt/transform/macros/generate_schema_name.sql`:
```jinja
-- Atual (bloqueia custom schemas):
{% macro generate_schema_name(custom_schema_name, node) -%}
    {{ target.schema }}
{%- endmacro %}
```
Ao substituir pelo padrão dbt de override estrito:
```jinja
-- Proposto (respeita custom schemas explicitamente declarados):
{% macro generate_schema_name(custom_schema_name, node) -%}
    {%- if custom_schema_name is none -%}
        {{ target.schema }}
    {%- else -%}
        {{ custom_schema_name | trim }}
    {%- endif -%}
{%- endmacro %}
```
Todos os modelos em `elt/transform/models/marts/` passarão a usar o schema `analytics` diretamente (tanto em ambiente local dev quanto nos testes efêmeros).

### Configuração em `dbt_project.yml`
```yaml
models:
  transparencia:
    staging:
      +materialized: view
    intermediate:
      +materialized: "{{ 'view' if var('test_mode', false) else 'table' }}"
    marts:
      +materialized: "{{ 'view' if var('test_mode', false) else 'table' }}"
      +schema: analytics
```

### Resolução de Schemas em `@transparencia/db` (Kysely / Postgres)
No Kysely, as queries atualmente realizam `.selectFrom("fct_posicao_fiscal_metricas")` sem qualificador de schema. Configurar `search_path` na conexão do pool PostgreSQL é a abordagem ideal e mais robusta por múltiplos motivos:
1. **Zero Churn em Queries:** Não é necessário reescrever 20 arquivos de queries Kysely adicionando strings manuais `"analytics.fct_..."`.
2. **Suporte Multi-Schema:** O `search_path = analytics, public` faz com que o PostgreSQL resolva:
   - Marts (`fct_*`, `dim_*`) -> encontrados no schema `analytics`.
   - Seeds (`seed_constantes_fiscais`, etc.) -> encontrados no schema `public`.
   - Tabelas da aplicação (`newsletter_subscribers`) -> encontradas no schema `public`.
3. **Resiliência Serverless e Conexões Efêmeras:**
   Ao adicionar o listener no `pg.Pool` em `packages/db/src/client.ts`:
   ```typescript
   pool.on("connect", (client) => {
     client.query("SET search_path = analytics, public");
   });
   ```
   Toda nova conexão aberta pelo pool (inclusive em workers do Vitest e em lambdas/serverless) recebe automaticamente o `search_path` correto, mesmo se o usuário do banco não tiver o atributo configurado via `ALTER ROLE`.

### Fixtures e CI/CD (`Makefile`)
No `Makefile`, o comando `db/fixture/dump` atualmente especifica:
```makefile
# Anterior:
PGPASSWORD=postgres pg_dump -h localhost -p 5544 -U postgres -d postgres \
    --schema-only --no-owner --no-privileges --no-comments \
    -t 'public.fct_*' -t 'public.dim_*' -t 'public.seed_*' ; \
PGPASSWORD=postgres pg_dump -h localhost -p 5544 -U postgres -d postgres \
    --data-only --inserts --no-owner --no-privileges --no-comments \
    -t 'public.seed_*'
```
Com o novo schema, ele deve ser ajustado para:
```makefile
# Atualizado:
PGPASSWORD=postgres pg_dump -h localhost -p 5544 -U postgres -d postgres \
    --schema-only --no-owner --no-privileges --no-comments \
    -n analytics -t 'public.seed_*' ; \
PGPASSWORD=postgres pg_dump -h localhost -p 5544 -U postgres -d postgres \
    --data-only --inserts --no-owner --no-privileges --no-comments \
    -t 'public.seed_*'
```
O parâmetro `-n analytics` garante que a criação do schema `CREATE SCHEMA analytics;` e todas as definições DDL de tabelas e views analíticas sejam exportadas, enquanto `-t 'public.seed_*'` preserva as tabelas e dados estáticos de apoio.

### Arquivos Modificados / Impactados
- `elt/transform/dbt_project.yml` (UPDATE)
- `elt/transform/macros/generate_schema_name.sql` (UPDATE)
- `docker/init/01-init-roles.sql` (UPDATE)
- `elt/migrations/grant_readonly.sql` (UPDATE)
- `elt/conftest.py` (UPDATE)
- `packages/db/src/client.ts` (UPDATE)
- `Makefile` (UPDATE)
- `packages/db/tests/fixtures/schema.sql.gz` (UPDATE - binário compactado regerado)

### Diretrizes de Qualidade e Governança (`AGENTS.md`)
- **Regra 4 (Baseline de Qualidade Mandatória):** Executar `make check`, `make test`, `make test/ts` e `pnpm build`.
- **Regra 6 (Formatação SQL):** Sem alinhamento por espaços em arquivos SQL.
- **Regra 15 (Segurança de Produção):** Todos os testes e comandos dbt DEVEM rodar estritamente contra o banco de dados local Docker (`localhost:5544`) ou efêmero (`testing.postgresql`). Nunca disparar comandos contra bancos de produção.
- **Regra 19 (Mensagens de Commit Convencionais):** Sem menção a histórias ou tasks no commit (ex: `refactor(elt): isolar marts analiticos no schema dedicado analytics`).

---

## Dev Agent Record

### Agent Model Used

Gemini 3.8 Flash (Medium)

### Debug Log References

### Completion Notes List

### File List
