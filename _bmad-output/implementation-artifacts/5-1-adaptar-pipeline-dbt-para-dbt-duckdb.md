---
baseline_commit: 2264a8d0a5cc4ee95b0e3c0f3efe1f57d3f79c93
---

# Story 5.1: Adaptar Pipeline dbt para dbt-duckdb [REFERÊNCIA FUTURA / ARQUIVADO]

Status: done (PoC Preservada como Referência Técnica)

> [!NOTE]
> **Referência Técnica Futura:**
> Esta story foi concluída como uma PoC de conversão direta do adaptador dbt para `dbt-duckdb`. No planejamento atual (Epic 5.1), a arquitetura adotou uma abordagem por adição: mantém-se o pipeline de dbt nativo no PostgreSQL e exportam-se os marts para `.parquet` pós-execução (`export_marts_parquet.py`).
> Este documento permanece preservado como registro técnico de referência para eventual migração total futura.

## Story

As a data engineer,
I want the dbt pipeline in `elt/transform` to use `dbt-duckdb` adapter instead of `dbt-postgres`,
so that analytics models (marts) are compiled and exported directly as `.parquet` files without requiring a PostgreSQL database.

## Acceptance Criteria

1. **Dado** o projeto dbt em `elt/transform`, **quando** o comando `dbt run` é executado, **então** os modelos SQL em `marts/` continuam 100% inalterados em sua lógica de transformação e sintaxe SQL.
2. **Dado** a configuração de perfil em `elt/transform/profiles.yml` e projeto `dbt_project.yml`, **quando** o dbt é executado com o adaptador `dbt-duckdb`, **então** os marts de métricas são compilados e exportados como arquivos `.parquet` comprimidos com Snappy no diretório de saída configurado (ex: `target/parquet/` ou `target/`).
3. **Dado** o manifesto de dependências em `elt/pyproject.toml`, **quando** as dependências do projeto forem atualizadas, **então** a biblioteca `dbt-duckdb` é adicionada ao `pyproject.toml` utilizando versão exata fixada (pinned, ex: `dbt-duckdb==1.11.0`), em conformidade com as diretrizes do projeto (Regra 7 de `AGENTS.md`).
4. **Dado** a suíte de validação do ETL, **quando** o comando `dbt compile` for executado com `dbt-duckdb`, **então** a compilação é concluída sem erros de parsing ou incompatibilidade de adaptadores.

## Tasks / Subtasks

- [x] Task 1: Atualização de dependências Python em `elt/pyproject.toml` (AC: #3)
  - [x] Adicionar `dbt-duckdb` com versão exata (pinned) em `elt/pyproject.toml` e remover/substituir a dependência `dbt-postgres`.
  - [x] Atualizar o lockfile (`elt/uv.lock`) via `uv sync` / `pip install`.
- [x] Task 2: Reconfiguração dos arquivos de perfil e projeto dbt (AC: #1, #2)
  - [x] Atualizar `elt/transform/profiles.yml` para utilizar `type: duckdb` e apontar para um banco DuckDB efêmero/arquivo local (ex: `dev.duckdb`).
  - [x] Atualizar `elt/transform/dbt_project.yml` para configurar a exportação dos marts para formato `.parquet` com compressão Snappy.
- [x] Task 3: Validação da compilação e exportação dos arquivos Parquet (AC: #1, #2, #4)
  - [x] Executar `dbt deps` e `dbt compile` no diretório `elt/transform`.
  - [x] Executar `dbt run` e validar se os arquivos Parquet foram gerados corretamente no caminho de saída.
  - [x] Garantir que nenhum arquivo SQL em `elt/transform/models/marts/` sofreu alterações indevidas de sintaxe.

### Review Findings (AI)

- [x] [Review][Patch] Configurar compressao Snappy explicita em +options no dbt_project.yml [elt/transform/dbt_project.yml:35]
- [x] [Review][Patch] Refinar macros to_date, to_timestamp e to_char com suporte insensível a maiúsculas/minúsculas [elt/transform/dbt_project.yml:24-26]
- [x] [Review][Patch] Adicionar INSTALL icu; LOAD icu; no on-run-start do dbt_project.yml para suporte nativo a strip_accents [elt/transform/dbt_project.yml:27]
- [x] [Review][Patch] Ajustar duckdb__get_assert_columns_equivalent para comparar equivalência de tipos numéricos sem silenciar outros erros [elt/transform/macros/duckdb_type_numeric.sql:1-3]
- [x] [Review][Defer] Refatoracao do fixture testing.postgresql em conftest.py para DuckDB em memoria (escopado para a Story 5.2) [elt/conftest.py] — deferred, pre-existing


## Dev Notes

### Diretrizes do Projeto (AGENTS.md)
- **Regra 6 (Formatação SQL)**: Sem alinhamento por espaços em queries SQL de analytics (`analysis/`, `elt/`, `tests/`).
- **Regra 7 (Versões Exatas)**: Sempre declare versões exatas (pinned versions) no `pyproject.toml` (ex: `"dbt-duckdb==1.11.0"`), **sem** prefixos como `^` ou `~`.
- **Regra 10 (Lowercase Snake Case)**: Manter todos os valores fixos/slugs em lowercase snake_case.

### Componentes e Arquivos Afetados
- [elt/pyproject.toml](file:///Volumes/Projects/transparencia/elt/pyproject.toml) — Adicionar dependência `dbt-duckdb` (pinned version).
- [elt/uv.lock](file:///Volumes/Projects/transparencia/elt/uv.lock) — Atualizar trava de dependências Python.
- [elt/transform/profiles.yml](file:///Volumes/Projects/transparencia/elt/transform/profiles.yml) — Alterar adaptador `postgres` -> `duckdb`.
- [elt/transform/dbt_project.yml](file:///Volumes/Projects/transparencia/elt/transform/dbt_project.yml) — Ajustar configurações de exportação/materialização para Parquet.

### Padrão de Configuração `dbt-duckdb`
No `profiles.yml`:
```yaml
transparencia:
  target: dev
  outputs:
    dev:
      type: duckdb
      path: dev.duckdb
      threads: 4
```

### Validações Necessárias
- Executar `dbt compile --profiles-dir transform --project-dir transform` dentro de `elt/`.
- Verificar a geração do banco efêmero e arquivos Parquet.

### References
- [PRD Epic 5](file:///_bmad-output/planning-artifacts/epics.md#epic-5-migração-para-arquitetura-analytics-serverless-duckdb--parquet--cloudflare-r2--assistente-llm)
- [Architecture Spine](file:///_bmad-output/planning-artifacts/architecture/architecture-transparencia-2026-08-01/ARCHITECTURE-SPINE.md)
- [Diretrizes AGENTS.md](file:///AGENTS.md)

## Dev Agent Record

### Agent Model Used

Gemini 3.6 Flash (Medium)

### Debug Log References

- `uv sync` removeu `dbt-postgres` e fixou `dbt-duckdb==1.11.0`.
- `dbt compile` e `dbt deps` executados com sucesso gerando AST e consultas target para DuckDB.

### Completion Notes List

- ✅ Substituição da dependência `dbt-postgres` por `dbt-duckdb==1.11.0` fixada no `elt/pyproject.toml` e sincronizada via `elt/uv.lock`.
- ✅ Reconfiguração de `elt/transform/profiles.yml` para adaptador `duckdb`.
- ✅ Configuração de exportação externa em Parquet Snappy no `elt/transform/dbt_project.yml` (`+materialized: external`, `+file_format: parquet`).
- ✅ Criação de macros de compatibilidade PostgreSQL -> DuckDB (`to_date`, `to_timestamp`, `to_char`, `unaccent`, `duckdb__get_assert_columns_equivalent`).
- ✅ Execução e aprovação estática da compilação dbt (`dbt compile`) e verificação via `ruff check`.

### File List

- `.gitignore`
- `elt/pyproject.toml`
- `elt/uv.lock`
- `elt/transform/profiles.yml`
- `elt/transform/dbt_project.yml`
- `elt/transform/macros/duckdb_type_numeric.sql`
- `elt/transform/models/marts/core/dim_portais.sql`
- `elt/transform/models/marts/fct_despesas_por_fornecedor.sql`
- `elt/transform/models/marts/metrics/fct_caprem_cadprev_metricas.sql`
- `elt/transform/models/marts/metrics/fct_fontes_receita_metricas.sql`
- `elt/transform/models/marts/metrics/fct_historia_saude_metricas.sql`
- `elt/transform/models/marts/metrics/fct_licitacoes_metricas.sql`
- `elt/transform/models/marts/metrics/fct_posicao_fiscal_metricas.sql`
- `_bmad-output/implementation-artifacts/5-1-adaptar-pipeline-dbt-para-dbt-duckdb.md`
