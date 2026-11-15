---
story_id: 1.4
story_key: 1-4-modelo-de-metricas-de-analise-de-despesas-no-dbt-fct-analise-despesas-metricas
epic_num: 1
status: done
baseline_commit: 58b35ffd220406f4760f34803f74857a589ddddb
created: 2026-08-02T01:23:17-03:00
---

# Story 1.4: Modelo de Métricas de Análise de Despesas no dbt (`fct_analise_despesas_metricas`)

## Story Description

**As a** Brazilian fiscal analyst / system,  
**I want** pre-aggregated totals for empenhado, liquidado, and pago grouped by portal_slug, ano, orgao_codigo, unidade_codigo, and funcao_codigo in a materialized dbt table,  
**So that** expense breakdowns load instantly with strict accounting consistency.

---

## Acceptance Criteria

### Scenario 1: Materialização Física e Estrutura do Mart de Análise de Despesas (`fct_analise_despesas_metricas`)
- **Given** as tabelas/marts de fatos e staging de despesas (`fct_despesas`, `fct_despesas_por_orgao`, `fct_despesas_por_unidade`)
- **When** o modelo dbt `fct_analise_despesas_metricas` for executado via `dbt run --select fct_analise_despesas_metricas`
- **Then** a tabela física `fct_analise_despesas_metricas` é criada no schema de marts com materialização `table` (`config(materialized='table')`).
- **And** a tabela contém a seguinte estrutura de colunas:
  - `analise_despesas_id` (VARCHAR/TEXT, Primary Key gerada via surrogate key)
  - `portal_slug` (VARCHAR/TEXT, dimensão de tenant obrigatória)
  - `empresa_id` (VARCHAR/TEXT, dimensão de entidade contábil/empresa)
  - `ano` (INTEGER, ano do exercício fiscal)
  - `orgao_codigo` (VARCHAR/TEXT, código do órgão orçamentário)
  - `unidade_codigo` (VARCHAR/TEXT, código da unidade orçamentária)
  - `funcao_codigo` (VARCHAR/TEXT, código da função orçamentária)
  - `total_empenhado` (NUMERIC(15,2), somatório de valores empenhados no agrupamento)
  - `total_liquidado` (NUMERIC(15,2), somatório de valores liquidados no agrupamento)
  - `total_pago` (NUMERIC(15,2), somatório de valores pagos no agrupamento)

### Scenario 2: Agrupamento e Granularidade Multi-tenant
- **Given** as exigências de isolamento multi-tenant (AD-5) e granularidade de análise de despesas
- **When** o modelo `fct_analise_despesas_metricas` for compilado e executado
- **Then** a agregação é feita por `portal_slug`, `empresa_id`, `ano`, `orgao_codigo`, `unidade_codigo` e `funcao_codigo`.
- **And** a dimensão `portal_slug` é obrigatoriamente incluída no agrupamento (`GROUP BY portal_slug, empresa_id, ano, orgao_codigo, unidade_codigo, funcao_codigo`).
- **And** nenhuma linha misturar dados de portais distintos.

### Scenario 3: Invariantes Fiscais Contábeis e Testes dbt
- **Given** o arquivo de especificação e contrato de schema `_fct_analise_despesas_metricas.yml`
- **When** a suíte de validação dbt for executada via `dbt test` ou `make test`
- **Then** os testes de integridade `not_null` e `unique` na chave primária `analise_despesas_id` passam com 100% de aprovação.
- **And** o teste de invariante fiscal contábil (`total_empenhado >= total_liquidado AND total_liquidado >= total_pago`) é declarado em `_fct_analise_despesas_metricas.yml` (via `dbt_expectations` ou expressão `expression_is_true`) e validado com sucesso.
- **And** a suíte completa `make test` é aprovada sem erros.

---

## Tasks & Subtasks

- [x] **Task 1: Criar o Modelo dbt `fct_analise_despesas_metricas.sql`** (AC: Scenario 1, Scenario 2)
  - [x] Criar o arquivo `elt/transform/models/marts/metrics/fct_analise_despesas_metricas.sql`.
  - [x] Configurar materialização física: `{{ config(materialized='table') }}`.
  - [x] Implementar a consulta agregando os totais de `empenhado`, `liquidado` e `pago` a partir de `fct_despesas` (ou combinações de marts de despesas por órgão/unidade).
  - [x] Gerar a chave primária `analise_despesas_id` utilizando surrogate key sobre `(portal_slug, empresa_id, ano, orgao_codigo, unidade_codigo, funcao_codigo)`.
  - [x] Agrupar obrigatoriamente por `portal_slug`, `empresa_id`, `ano`, `orgao_codigo`, `unidade_codigo`, `funcao_codigo`.
  - [x] Garantir formatação SQL sem alinhamento por espaços (conforme diretriz do repositório).

- [x] **Task 2: Declarar Schema Contract e Testes dbt (`_fct_analise_despesas_metricas.yml`)** (AC: Scenario 3)
  - [x] Criar o arquivo `elt/transform/models/marts/metrics/_fct_analise_despesas_metricas.yml`.
  - [x] Documentar a tabela `fct_analise_despesas_metricas` e suas colunas.
  - [x] Adicionar testes de não-nulidade (`not_null`) e unicidade (`unique`) na chave primária.
  - [x] Adicionar teste de invariante fiscal: `total_empenhado >= total_liquidado AND total_liquidado >= total_pago`.

- [x] **Task 3: Validação da Suíte de Testes Backend** (AC: Scenario 3)
  - [x] Executar `make test` para verificar compilação dbt, criação da tabela no PostgreSQL de teste e execução de todos os testes unitários/integração.
  - [x] Garantir 100% de aprovação na suíte de testes.

---

## Dev Notes & Technical Architecture Guardrails

### Core Invariants & Architectural Rules
- **AD-1 (SSOT no dbt)**: Nenhuma agregação contábil (`SUM()`, `GROUP BY`) deve ser realizada em tempo de execução no TypeScript. A nova tabela física `fct_analise_despesas_metricas` em `elt/transform/models/marts/metrics/` passa a ser a **Single Source of Truth** para detalhamento e agregados de despesas.
- **AD-2 (Materialização em Tabela Física)**: O modelo deve ter `materialized='table'` para respostas de leitura instantâneas (< 100ms) no PostgreSQL.
- **AD-5 (Filtragem Mandatória por `portal_slug`)**: Todas as queries e agrupamentos dbt devem incluir `portal_slug`.
- **AD-6 (Protocolo de Validação dbt e CI)**: Qualquer alteração em tabelas raw exige sincronização no `_sources.yml`. O `make test` executa compilação e testes em banco de dados efêmero PostgreSQL.
- **Regra de Formatação SQL**: Nunca adicione espaços extras para alinhar colunas, aliases (`AS`) ou elementos em queries SQL de analytics (`analysis/`, `elt/`, `tests/`). Use apenas o espaço mínimo necessário.

### Current Code & Logic Analysis (Read Files)
1. **`packages/db/src/queries/analise_despesas.ts`**:
   - Atualmente executa queries agregadas via `sql` em runtime sobre `fct_despesas_por_unidade` e `fct_despesas_por_orgao` (`getMetricasGeraisDespesas`, `getDespesasPorUnidade`).
   - Esta história cria a infraestrutura de dados no dbt (`fct_analise_despesas_metricas.sql`) para subsidiar a refatoração posterior dos leitores burros em TypeScript (Epic 2, Story 2.2).
2. **`elt/transform/models/marts/fct_despesas.sql`**:
   - Tabela de fatos de despesas consolidadas, contendo as colunas `portal_slug`, `empresa_id`, `ano`, `orgao_codigo`, `funcao`, `empenhado`, `liquidado`, `pago`.

### Source Documents & References
- **Architecture Spine**: [`_bmad-output/planning-artifacts/architecture/architecture-transparencia-2026-08-01/ARCHITECTURE-SPINE.md`](file:///Volumes/Projects/transparencia/_bmad-output/planning-artifacts/architecture/architecture-transparencia-2026-08-01/ARCHITECTURE-SPINE.md#32-fct_analise_despesas_metricassql)
- **Epics Breakdown**: [`_bmad-output/planning-artifacts/epics.md`](file:///Volumes/Projects/transparencia/_bmad-output/planning-artifacts/epics.md#story-14-modelo-de-m%C3%A9tricas-de-an%C3%A1lise-de-despesas-no-dbt-fct_analise_despesas_metricas)
- **História Anterior (Story 1.3)**: [`_bmad-output/implementation-artifacts/1-3-modelo-de-metricas-de-posicao-fiscal-no-dbt-fct-posicao-fiscal-metricas.md`](file:///Volumes/Projects/transparencia/_bmad-output/implementation-artifacts/1-3-modelo-de-metricas-de-posicao-fiscal-no-dbt-fct-posicao-fiscal-metricas.md)

### Learnings from Previous Story (Story 1.3)
- Os modelos de métricas ficam localizados no subdiretório `elt/transform/models/marts/metrics/`.
- Cada modelo `.sql` é acompanhado de seu schema YAML de contrato e testes `_fct_<nome_do_mart>.yml`.
- Incluir `empresa_id` na granularidade do mart permite suporte nativo a filtros por entidade (Prefeitura, Fundo de Saúde) na UI sem quebrar a agregação por portal.
- A suíte de testes `make test` cria o schema efêmero via `_create_raw_schema(eng)` e executa `dbt deps`, `dbt seed` e `dbt run --vars '{"test_mode": true}'` automaticamente.

---

## Dev Agent Record

### Agent Model Used
Gemini 3.6 Flash (Medium)

### Debug Log References

### Completion Notes List
- Arquivo de especificação da História 1.4 gerado via `/bmad-create-story`.
- Criado o modelo dbt `elt/transform/models/marts/metrics/fct_analise_despesas_metricas.sql` materializado como tabela física com chave surrogate MD5 `analise_despesas_id` sobre `(portal_slug, empresa_id, ano, orgao_codigo, unidade_codigo, funcao_codigo)`.
- Adicionado mapeamento da coluna `unidade_codigo` em `fct_despesas.sql` e contrato `_fct_despesas.yml`.
- Declarado contrato rígido e testes em `elt/transform/models/marts/metrics/_fct_analise_despesas_metricas.yml` (`contract: enforced: true`), validações `not_null` e `unique` na chave primária, e teste de invariante fiscal LRF (`total_empenhado >= total_liquidado AND total_liquidado >= total_pago`).
- Executada e aprovada com 100% de sucesso a suíte de testes de integração backend `make test` (82 testes passando) e testes TypeScript `pnpm test`.

### File List

#### Target Files Created / Updated in Implementation:
- `elt/transform/models/marts/metrics/fct_analise_despesas_metricas.sql` (NEW)
- `elt/transform/models/marts/metrics/_fct_analise_despesas_metricas.yml` (NEW)
- `elt/transform/models/marts/fct_despesas.sql` (UPDATE)
- `elt/transform/models/marts/_fct_despesas.yml` (UPDATE)
- `_bmad-output/implementation-artifacts/1-4-modelo-de-metricas-de-analise-de-despesas-no-dbt-fct-analise-despesas-metricas.md` (UPDATE)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (UPDATE)

### Change Log
- Implemented fct_analise_despesas_metricas dbt model, schema contract, and tests (Date: 2026-08-02)

---

## Status

**Current Status**: `done`

