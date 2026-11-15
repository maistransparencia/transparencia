---
story_id: 1.3
story_key: 1-3-modelo-de-metricas-de-posicao-fiscal-no-dbt-fct-posicao-fiscal-metricas
epic_num: 1
status: done
baseline_commit: 74d7a6eab7e296cedce59b6d2503b278e4948754
created: 2026-08-02T00:58:40-03:00
---

# Story 1.3: Modelo de Métricas de Posição Fiscal no dbt (`fct_posicao_fiscal_metricas`)

## Story Description

**As a** Brazilian fiscal analyst / system,  
**I want** pre-calculated financial metrics for daily and annual fiscal positioning in a materialized dbt table,  
**So that** screen queries do not calculate totals from raw transactional data at runtime.

---

## Acceptance Criteria

### Scenario 1: Materialização Física e Estrutura do Mart de Posição Fiscal (`fct_posicao_fiscal_metricas`)
- **Given** as tabelas de fatos consolidadas (`fct_receitas`, `fct_despesas`, `fct_despesas_por_orgao`)
- **When** o modelo dbt `fct_posicao_fiscal_metricas` for executado via `dbt run --select fct_posicao_fiscal_metricas`
- **Then** a tabela física `fct_posicao_fiscal_metricas` é criada no schema de marts com materialização `table` (`config(materialized='table')`).
- **And** a tabela contém a seguinte estrutura de colunas:
  - `posicao_fiscal_id` (VARCHAR/TEXT, Primary Key gerada via surrogate key)
  - `portal_slug` (VARCHAR/TEXT, dimensão de tenant obrigatória)
  - `ano` (INTEGER, ano do exercício fiscal)
  - `total_arrecadado` (NUMERIC(15,2), total de receitas arrecadadas no exercício)
  - `despesas_pagas` (NUMERIC(15,2), total de despesas orçamentárias pagas no ano)
  - `restos_pagos_no_ano` (NUMERIC(15,2), restos a pagar liquidados e pagos no ano de referência)
  - `restos_pendentes_adm_anterior` (NUMERIC(15,2), saldo pendente de restos a pagar referentes a gestões anteriores)
  - `restos_pendentes_adm_atual` (NUMERIC(15,2), saldo pendente de restos a pagar da gestão atual)
  - `saldo_estimado` (NUMERIC(15,2), calculado como `total_arrecadado - (despesas_pagas + restos_pagos_no_ano)`)

### Scenario 2: Segregação Contábil de Restos a Pagar por Gestão
- **Given** as obrigações de restos a pagar na tabela `fct_despesas` (onde `fonte = 'restos_a_pagar'`)
- **When** a segregação por gestão for calculada no dbt
- **Then** os restos pendentes são classificados como `restos_pendentes_adm_anterior` se o ano do empenho de restos a pagar for menor que a referência de gestão (obtida preferencialmente da tabela `dim_metadata` via chave `ano_inicio_gestao_atual` ou fallback `ano < 2025`).
- **And** os restos pendentes do próprio exercício/gestão atual são agrupados em `restos_pendentes_adm_atual`.

### Scenario 3: Suporte Obrigatório ao Multitenancy via `portal_slug`
- **Given** o requisito AD-5 de isolamento multi-tenant
- **When** o modelo `fct_posicao_fiscal_metricas` for compilado e executado
- **Then** a dimensão `portal_slug` é obrigatoriamente incluída no agrupamento (`GROUP BY portal_slug, ano`).
- **And** nenhuma linha agregada mistura dados de diferentes portais.

### Scenario 4: Invariantes Fiscais e Execução de Testes dbt em `make test`
- **Given** a especificação declarada no schema YAML `_fct_posicao_fiscal_metricas.yml`
- **When** a suíte de validação do repositório for executada via `make test`
- **Then** os testes dbt de não-nulidade (`not_null`), unicidade (`unique`) da chave primária `posicao_fiscal_id` e o teste de invariante `total_arrecadado >= 0` são executados com 100% de aprovação no banco de dados PostgreSQL efêmero de testes.

---

## Tasks & Subtasks

- [x] **Task 1: Criar o Modelo dbt `fct_posicao_fiscal_metricas.sql`** (AC: Scenario 1, Scenario 2, Scenario 3)
  - [x] Criar a pasta `elt/transform/models/marts/metrics/` caso ainda não exista.
  - [x] Criar o arquivo `elt/transform/models/marts/metrics/fct_posicao_fiscal_metricas.sql`.
  - [x] Configurar a materialização física: `{{ config(materialized='table') }}`.
  - [x] Implementar CTEs para:
    - `receitas_agregadas`: agregação de `arrecadado` de `fct_receitas` por `portal_slug` e `ano`.
    - `despesas_orgao_agregadas`: agregação de `pago` de `fct_despesas_por_orgao` (ou `fct_despesas` orçamentárias) por `portal_slug` e `ano`.
    - `restos_pagos_agregados`: agregação de `pago` em `fct_despesas` onde `fonte = 'restos_a_pagar'` por `portal_slug` e `ano`.
    - `restos_pendentes_agregados`: cálculo de `empenhado - pago` segregado entre gestão anterior e atual com base em `dim_metadata` (ou `ano < 2025`).
  - [x] Calcular o campo `saldo_estimado = total_arrecadado - (despesas_pagas + restos_pagos_no_ano)`.
  - [x] Garantir formatação SQL sem alinhamento por espaços extras (diretriz do projeto).

- [x] **Task 2: Declarar Schema Contract e Testes dbt (`_fct_posicao_fiscal_metricas.yml`)** (AC: Scenario 4)
  - [x] Criar o arquivo `elt/transform/models/marts/metrics/_fct_posicao_fiscal_metricas.yml`.
  - [x] Documentar a tabela `fct_posicao_fiscal_metricas` e suas colunas.
  - [x] Adicionar testes dbt: `unique` e `not_null` em `posicao_fiscal_id`, `not_null` em `portal_slug`, `ano`, `total_arrecadado`, `despesas_pagas`, `restos_pagos_no_ano`, `saldo_estimado`.
  - [x] Adicionar teste fiscal de invariante contábil: `dbt_expectations` ou `expression_is_true` para `total_arrecadado >= 0`.

- [x] **Task 3: Validação de Suíte de Testes Backend** (AC: Scenario 4)
  - [x] Executar `make test` para verificar a compilação do dbt, criação das tabelas e execução de todos os testes unitários e de integração no banco efêmero PostgreSQL (`testing.postgresql`).
  - [x] Garantir 100% de aprovação sem quebrar testes legados de `test_posicao_fiscal.py`.

### Review Findings (AI Code Review)

- [x] [Review][Patch] Inclusão da dimensão empresa_id na granularidade e chave surrogate do mart fct_posicao_fiscal_metricas [elt/transform/models/marts/metrics/fct_posicao_fiscal_metricas.sql:L1-L97]
- [x] [Review][Patch] Correção da lógica de Restos a Pagar Pendentes acumulados por exercício [elt/transform/models/marts/metrics/fct_posicao_fiscal_metricas.sql:L40-L63]
- [x] [Review][Patch] Tratamento seguro e conversão defensiva em metadata_gestao no dbt [elt/transform/models/marts/metrics/fct_posicao_fiscal_metricas.sql:L6]

---

## Dev Notes & Technical Architecture Guardrails

### Core Invariants & Architectural Rules
- **AD-1 (SSOT no dbt)**: Nenhuma agregação contábil (`SUM()`, `GROUP BY`, ou cálculos de saldo de caixa) deve ocorrer em tempo de execução no TypeScript. A tabela `fct_posicao_fiscal_metricas` em `elt/transform/models/marts/metrics/` passa a ser a **Single Source of Truth** para a tela de Posição Fiscal.
- **AD-2 (Materialização de Marts em Tabela Física)**: O modelo deve ser explicitamente configurado com `materialized='table'` para garantir leituras instantâneas em menos de 100ms no PostgreSQL.
- **AD-5 (Filtragem Mandatória por `portal_slug`)**: O agrupamento do modelo dbt deve incluir obrigatoriamente `portal_slug` (`GROUP BY portal_slug, ano`).
- **AD-6 (Protocolo de Validação dbt em CI)**: Toda alteração deve passar na suíte `make test`. Como o setup de teste do dbt roda dinamicamente através de `_create_raw_schema(eng)` e dbt runner em `elt/conftest.py`, não é necessário modificar `conftest.py`, mas qualquer nova coluna raw precisaria constar em `_sources.yml`.
- **Regra de Formatação SQL**: Nunca adicione espaços extras para alinhar colunas, aliases (`AS`) ou elementos em queries SQL (`analysis/`, `elt/`, `tests/`). Use apenas o espaço mínimo necessário.

### Current Code & Logic Analysis (Read Files)
1. **`packages/db/src/queries/posicao_fiscal.ts`**:
   - Atualmente executa queries dinâmicas com `sql` concatenado via Kysely em runtime:
     - `getFontesReceita` para obter `totalArrecadado`.
     - `sumVarcharCol` em `fct_despesas_por_orgao` para `despesasPagas`.
     - `sumVarcharCol` em `fct_despesas` com `fonte = 'restos_a_pagar'` para `restosPagosNoAno`.
     - `restosPendentes`: `empenhado - pago` agrupado por ano onde `ano < year ? "Adm. Anterior" : "Adm. Atual"`.
     - `saldoEstimado`: `totalArrecadado - (despesasPagas + restosPagosNoAno)`.
2. **`elt/analytics/posicao_fiscal.py`**:
   - Implementa a mesma lógica em Python com pandas e SQLAlchemy para os scripts de carga/análise.
   - Restos pendentes: `administracao = "Adm. Anterior" if ano < 2025 else "Adm. Atual"`.
3. **`elt/transform/models/marts/fct_despesas.sql` e `fct_receitas.sql`**:
   - `fct_receitas` possui colunas: `portal_slug`, `ano`, `arrecadado`.
   - `fct_despesas` possui colunas: `portal_slug`, `ano`, `fonte`, `empenhado`, `liquidado`, `pago`.
   - `fct_despesas_por_orgao` possui colunas: `portal_slug`, `ano`, `pago`.

### Source Documents & References
- **Architecture Spine**: [`_bmad-output/planning-artifacts/architecture/architecture-transparencia-2026-08-01/ARCHITECTURE-SPINE.md`](file:///Volumes/Projects/transparencia/_bmad-output/planning-artifacts/architecture/architecture-transparencia-2026-08-01/ARCHITECTURE-SPINE.md#31-fct_posicao_fiscal_metricassql)
- **Inventário de Regras Fiscais**: [`_bmad-output/implementation-artifacts/inventario-regras-fiscais-stn-mcasp.md`](file:///Volumes/Projects/transparencia/_bmad-output/implementation-artifacts/inventario-regras-fiscais-stn-mcasp.md#21-posicao_fiscalts)
- **História Anterior (1.2)**: [`_bmad-output/implementation-artifacts/1-2-modelagem-das-dimensoes-canonicas-fiscais-stnmcasp-no-dbt.md`](file:///Volumes/Projects/transparencia/_bmad-output/implementation-artifacts/1-2-modelagem-das-dimensoes-canonicas-fiscais-stnmcasp-no-dbt.md)

### Learnings from Previous Story (Story 1.2)
- Seeds e modelos dbt construídos no diretório `elt/transform/models/marts/`.
- Testes dbt de schema (`_dim_*.yml`) exigem declaração de `not_null` e `unique` para integridade contábil.
- A suíte `make test` compila e executa o dbt automaticamente contra a instância PostgreSQL efêmera (`testing.postgresql`).

---

## Dev Agent Record

### Agent Model Used
Gemini 3.6 Flash (Medium)

### Debug Log References

### Completion Notes List
- Arquivo de especificação da História 1.3 criado via `/bmad-create-story`.
- Criado o modelo de mart dbt `elt/transform/models/marts/metrics/fct_posicao_fiscal_metricas.sql` pré-calculando receitas, despesas pagas, restos pagos e restos pendentes por gestão com materialização física em tabela e surrogate key `posicao_fiscal_id`.
- Criado o arquivo de contrato de schema `elt/transform/models/marts/metrics/_fct_posicao_fiscal_metricas.yml` com contrato restrito (`enforced: true`), testes de chave primária e testes de invariantes contábeis (`total_arrecadado >= 0`).
- Incorporado retorno de Code Review: adicionada a dimensão de entidade `empresa_id` na granularidade do mart (`portal_slug`, `empresa_id`, `ano`) e na surrogate key para suporte nativo a filtros por entidade (Prefeitura, Fundo de Saúde) na UI.
- Validado via `make test` (45 testes dbt e 82 testes pytest com 100% de aprovação) e `make check` (ruff & mypy ok).

### File List

#### Target Files Created / Updated in Implementation:
- `elt/transform/models/marts/metrics/fct_posicao_fiscal_metricas.sql` (NEW)
- `elt/transform/models/marts/metrics/_fct_posicao_fiscal_metricas.yml` (NEW)
- `_bmad-output/implementation-artifacts/1-3-modelo-de-metricas-de-posicao-fiscal-no-dbt-fct-posicao-fiscal-metricas.md` (UPDATE)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (UPDATE)

---

## Status

**Current Status**: `done`
