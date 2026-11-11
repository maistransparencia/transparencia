---
baseline_commit: 2264a8d0a5cc4ee95b0e3c0f3efe1f57d3f79c93
---

# Story 5.1A: Exportação Automatizada dos Marts PostgreSQL para `.parquet` (`export_marts_parquet.py`)

## Status
- **Status:** done
- **Epic:** 5 - Migração para Arquitetura Analytics Serverless (DuckDB + Parquet + Cloudflare R2) & Assistente LLM
- **Sub-Epic:** 5.1 - Exportação dos Marts Postgres para Parquet & Sync R2
- **Story Key:** 5-1a-exportacao-automatizada-dos-marts-postgresql-para-parquet
- **Last Updated:** 2026-08-15

---

## User Story Statement

**As a** data engineer,  
**I want** a Python/DuckDB post-processing script (`elt/export_marts_parquet.py`) that connects to the PostgreSQL database after `dbt run` and exports all materialized marts to compressed `.parquet` files,  
**So that** we generate clean Parquet analytics files in `target/parquet/` for Cloudflare R2 sync without altering the dbt Postgres adapter, `_sources.yml`, or the integration test suite.

---

## Acceptance Criteria

1. **Dado** o banco PostgreSQL contendo as tabelas e marts materializados pelo dbt (`fct_*_metricas`, `fct_contratos_servicos_vigentes`, `fct_emendas`, etc.),
2. **When** o script `python elt/export_marts_parquet.py` for executado,
3. **Then** ele conecta ao banco PostgreSQL via DuckDB (`postgres_scanner` / `ATTACH`) ou SQLAlchemy/psycopg2 e extrai todas as tabelas de marts do schema de produção/marts.
4. **And** exporta cada mart como um arquivo Parquet individual em `target/parquet/{nome_tabela}.parquet` utilizando compressão Snappy (`COMPRESSION 'SNAPPY'`).
5. **And** o esquema de colunas, nomes de métricas e tipos de dados no Parquet são 100% idênticos aos dos marts no PostgreSQL.
6. **And** o script é integrado ao `Makefile` através do alvo `make export-parquet`.
7. **And** as suítes de validação (`make test` e `make test/ts`) continuam executando e passando com 100% de sucesso.

---

## Technical Requirements & Architecture Guardrails

### 1. Script de Exportação (`elt/export_marts_parquet.py`)
- **Conexão:** Conectar ao PostgreSQL utilizando DuckDB com extensão `postgres` ou SQLAlchemy + PyArrow / DuckDB.
- **Saída:** Diretório `target/parquet/` (criado automaticamente se não existir).
- **Format:** `.parquet` com compressão `SNAPPY`.

### 2. Automação (`Makefile`)
- Adicionar o comando `export-parquet` no `Makefile`:
  ```makefile
  export-parquet:
  	uv run --project elt python elt/export_marts_parquet.py $(if $(OUTPUT_DIR),--output-dir $(OUTPUT_DIR))
  ```

---

## Tasks / Subtasks

- [x] Task 1: Criar o script `elt/export_marts_parquet.py` (AC: #1, #2, #3, #4, #5)
  - [x] Implementar a conexão Postgres -> DuckDB com fallback resiliente para SQLAlchemy/pandas + DuckDB.
  - [x] Iterar sobre as tabelas da camada de marts (`fct_*`, `dim_*`, `seed_*`).
  - [x] Executar `COPY (SELECT * FROM mart) TO 'target/parquet/mart.parquet' (FORMAT PARQUET, COMPRESSION 'SNAPPY')`.
- [x] Task 2: Adicionar alvo no `Makefile` (AC: #6)
  - [x] Adicionar target `make export-parquet` e atualizar `.PHONY`.
- [x] Task 3: Validação da Exportação, Tipagem e Testes (AC: #5, #7)
  - [x] Criar `elt/tests/test_export_marts_parquet.py` e validar via `make test` (84 testes passando).
  - [x] Executar `make test/ts` (33 testes db e 49 testes web passando).
  - [x] Testar `make export-parquet` gerando 49 arquivos Parquet Snappy com sucesso.

---

## Dev Agent Record

### Agent Model Used
Gemini 3.6 Flash (Medium)

### Debug Log References
- Adicionado `duckdb==1.2.0` ao `elt/pyproject.toml` (versão exata pinned) e sincronizado via `uv sync`.
- `ruff check` e `mypy` validados com sucesso em `elt/export_marts_parquet.py`.
- `make export-parquet OUTPUT_DIR=target/parquet_test` executado com sucesso exportando 49 tabelas para Parquet Snappy.

### Completion Notes List
- ✅ Criado script de exportação pós-dbt `elt/export_marts_parquet.py` com suporte a `postgres_scanner` DuckDB nativo e fallback automático.
- ✅ Adicionado alvo `make export-parquet` ao `Makefile`.
- ✅ Criado teste de integração em `elt/tests/test_export_marts_parquet.py`.
- ✅ Executadas e aprovadas as suítes de validação de dados e paridade TypeScript (`make test` 84/84 e `make test/ts` 82/82).

---

## File List

- `elt/pyproject.toml`
- `elt/uv.lock`
- `elt/export_marts_parquet.py`
- `elt/tests/test_export_marts_parquet.py`
- `Makefile`
- `_bmad-output/implementation-artifacts/5-1a-exportacao-automatizada-dos-marts-postgresql-para-parquet.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

---

## Change Log

- 2026-08-15: Implementada Story 5.1A (Exportação dos marts PostgreSQL para Parquet Snappy via `export_marts_parquet.py` e target `make export-parquet`).
