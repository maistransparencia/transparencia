---
baseline_commit: 38948d3
---

# Story 5.12: Expurgo Geral e Limpeza Definitiva de DuckDB e Cloudflare R2

## Status
- **Status:** done
- **Epic:** 5 - Arquitetura Analytics Serverless, Servidor MCP & Assistente Fiscal com Evals
- **Sub-Epic:** 5.12 - Limpeza Definitiva de Infraestrutura Deprecada (DuckDB e Cloudflare R2)
- **Story Key:** 5-12-expurgo-geral-duckdb-e-cloudflare-r2
- **Last Updated:** 2026-08-21

---

## User Story Statement

**As a** engenheiro de software e arquiteto de dados,  
**I want** remover todas as dependências residuais, scripts de sincronização de Parquet para R2 e referencias a DuckDB do repositório,  
**So that** a base de código seja 100% limpa, leve, focada unicamente no PostgreSQL/Supabase e isenta de dívida técnica legada.

---

## Acceptance Criteria

1. **Dado** a conclusão da migração serverless para PostgreSQL/Supabase,
2. **When** o processo de limpeza de dependências for executado,
3. **Then** a biblioteca `duckdb` é removida do `elt/pyproject.toml` e `uv.lock`.
4. **And** scripts legados de backup/sync Parquet para R2 (`elt/export_marts_parquet.py`, `elt/sync_parquet.py`, etc.) e seus respectivos testes são removidos ou adaptados.
5. **And** referências de variáveis de ambiente relacionadas ao R2/MinIO em documentações e configs são limpas.
6. **And** todas as suítes de testes (`make test` e `pnpm test`) continuam 100% verdes sem erros de importação.

---

## Tasks / Subtasks

- [x] Task 1: Remover a dependência `duckdb` de `elt/pyproject.toml` e atualizar `uv.lock` (AC: #3)
- [x] Task 2: Remover/limpar scripts legados de exportação Parquet/R2 e testes associados em `elt/` (AC: #4, #5)
- [x] Task 3: Executar `make test` e `pnpm test` para garantir 100% de aprovação (AC: #6)

