---
baseline_commit: 9543ee8eb11e6eba991ce340d4a4ebe76a1b4c9c
---

# Story 5.2: Refatorar Suíte de Testes do ETL (`conftest.py`) [REFERÊNCIA FUTURA / ARQUIVADO]

Status: done (PoC Preservada como Referência Técnica)

> [!NOTE]
> **Referência Técnica Futura:**
> Esta story foi desenvolvida como referência de execução da suíte de testes em memória via DuckDB. No planejamento atual (Epic 5.1), a arquitetura adotou a manutenção do PostgreSQL efêmero nos testes (`testing.postgresql`) com exportação pós-dbt dos marts para Parquet (`export_marts_parquet.py`).
> Este documento permanece preservado como registro técnico de referência para eventual migração total futura.

## Story

As a backend developer,
I want the test suite in `elt/conftest.py` to use an in-memory DuckDB instance (`:memory:`),
so that `make test` executes quickly and reliably without needing a `testing.postgresql` subprocess.

## Acceptance Criteria

1. **Dado** a suíte de testes de integração em `elt/tests/`, **quando** `make test` ou `pytest` é executado, **então** o fixture de banco cria o schema e tabelas efêmeras via DuckDB em memória/arquivo temporário utilizando `_sources.yml` como fonte única de verdade.
2. **Dado** os arquivos de configuração de ambiente e testes em `elt/pyproject.toml` e `elt/conftest.py`, **quando** as dependências forem atualizadas, **então** a biblioteca `testing-postgresql` é removida do `pyproject.toml` e a biblioteca `duckdb-engine` é adicionada com versão exata fixada (pinned, ex: `duckdb-engine==0.17.0`), em conformidade com a Regra 7 de `AGENTS.md`.
3. **Dado** a função `_run_dbt` no `elt/conftest.py`, **quando** dbt for acionado durante a inicialização da suíte de testes, **então** ele utiliza o adaptador `dbt-duckdb` apontando para a instância DuckDB de testes via variável de ambiente `DBT_DUCKDB_PATH`, descartando parâmetros de conexão com PostgreSQL host/porta.
4. **Dado** as suítes de testes em `elt/tests/test_db.py` e `elt/tests/test_pipeline.py`, **quando** as operações de `upsert`, `set_metadata` e limpeza de tabelas (`TRUNCATE`/`DELETE`) forem executadas no DuckDB, **então** todos os testes passam com 100% de sucesso e com tempo de execução drasticamente reduzido.

## Tasks / Subtasks

- [x] Task 1: Atualização de Dependências em `elt/pyproject.toml` (AC: #2)
  - [x] Remover `testing-postgresql` do grupo `[dependency-groups] dev` no `elt/pyproject.toml`.
  - [x] Adicionar `duckdb-engine==0.17.0` (versão exata pinned) no `elt/pyproject.toml`.
  - [x] Executar `uv sync` no diretório `elt/` para atualizar o `uv.lock` e o ambiente virtual.
- [x] Task 2: Refatoração de `elt/conftest.py` para DuckDB (AC: #1, #3)
  - [x] Remover o fixture `pg` baseado em `testing.postgresql`.
  - [x] Reimplementar o fixture `engine` para criar um engine SQLAlchemy via `duckdb-engine` (`duckdb:///<path_ou_memory>`).
  - [x] Atualizar `_create_raw_schema(eng)` para criar o schema `raw_porciuncula_prefeitura` e tabelas no DuckDB a partir do `_sources.yml` (Regra 5 do `AGENTS.md`).
  - [x] Reconfigurar `_run_dbt` para injetar `DBT_DUCKDB_PATH` no ambiente do subprocesso dbt e remover variáveis obsoletas (`DBT_HOST`, `DBT_PORT`, `DBT_USER`, etc.).
  - [x] Ajustar fixture `conn` para definir o `search_path` adequado em DuckDB (`SET search_path = 'raw_porciuncula_prefeitura,main'`).
- [x] Task 3: Compatibilidade de DML/DDL em `elt/core/db.py` e `elt/tests/` (AC: #4)
  - [x] Validar e ajustar as funções `upsert` e `set_metadata` em `elt/core/db.py` para garantirem execução 100% compatível com a sintaxe SQL do DuckDB.
  - [x] Ajustar em `elt/tests/test_pipeline.py` comandos de limpeza de tabela (`TRUNCATE ... CASCADE` -> `DELETE FROM ...` / `TRUNCATE` compatível com DuckDB).
- [x] Task 4: Validação de Suíte de Testes e Performance (AC: #1, #4)
  - [x] Executar `make test` / `pytest` em `elt/` e confirmar passagem de 100% dos testes sem subprocesso Postgres.
  - [x] Executar linters `ruff check` e `mypy` no pacote Python `elt/`.

### Review Findings

- [x] [Review][Patch] Fix test transaction rollback in conftest.py conn fixture [`elt/conftest.py:82`](file:///Volumes/Projects/transparencia/elt/conftest.py#L82)
- [x] [Review][Patch] Enhance _run_dbt error logging and environment isolation [`elt/conftest.py:48`](file:///Volumes/Projects/transparencia/elt/conftest.py#L48)
- [x] [Review][Patch] Move duckdb-engine from dev group to main dependencies [`elt/pyproject.toml:29`](file:///Volumes/Projects/transparencia/elt/pyproject.toml#L29)
- [x] [Review][Patch] Use CASCADE in DROP VIEW statements [`elt/load/run.py:94`](file:///Volumes/Projects/transparencia/elt/load/run.py#L94)
- [x] [Review][Patch] Absolute path resolution in PortalConfig.orgaos_csv_path [`elt/core/config.py:27`](file:///Volumes/Projects/transparencia/elt/core/config.py#L27)
- [x] [Review][Defer] pg_insert usage with DuckDB dialect — deferred, pre-existing
- [x] [Review][Patch] Dialect check for pg_insert in elt/load/run.py and load_receitas_csv.py [`elt/load/run.py:115`](file:///Volumes/Projects/transparencia/elt/load/run.py#L115)
- [x] [Review][Patch] Remove redundant SELECT DISTINCT in staging SQLs with QUALIFY [`elt/transform/models/staging/porciuncula_prefeitura/stg_porciuncula_prefeitura__contratos.sql:42`](file:///Volumes/Projects/transparencia/elt/transform/models/staging/porciuncula_prefeitura/stg_porciuncula_prefeitura__contratos.sql#L42)
- [x] [Review][Patch] Make PostgreSQL attach conditional in profiles.yml [`elt/transform/profiles.yml:16`](file:///Volumes/Projects/transparencia/elt/transform/profiles.yml#L16)


## Dev Notes

### Diretrizes Obrigatórias (AGENTS.md)
- **Regra 1 (Economia Extrema de Contexto)**: Buscas cirúrgicas (Grep/Glob), leitura por janelamento.
- **Regra 5 (Sincronização de Fontes)**: O arquivo `_sources.yml` é a fonte única de verdade para `_create_raw_schema(eng)`. Novas tabelas raw devem ser adicionadas nele.
- **Regra 6 (Formatação SQL)**: Sem alinhamento por espaços em queries SQL de analytics/testes.
- **Regra 7 (Versões Exatas)**: `duckdb-engine==0.17.0` no `elt/pyproject.toml` sem prefixos `^` ou `~`.
- **Regra 10 (Lowercase Snake Case)**: Todos os valores fixos, slugs e códigos em `lowercase_snake_case`.

### Detalhes Técnicos e Arquiteturais
- **Migração do Adaptador**: A Story 5.1 alterou o dbt em `elt/transform` para utilizar `dbt-duckdb`. O `profiles.yml` define `path: "{{ env_var('DBT_DUCKDB_PATH', 'dev.duckdb') }}"`.
- **Comunicação SQLAlchemy + dbt**: Durante o `pytest`, a fixture `engine` define um arquivo temporário (`tmp_path_factory`) e expõe essa localização para o `dbt` através da variável de ambiente `DBT_DUCKDB_PATH`. Isso garante que tanto a conexão SQLAlchemy usada pelos testes Python quanto o dbt compartilhem rigorosamente o mesmo banco fisicamente.
- **Limpeza de Conexões**: As conexões são devidamente encerradas via `eng.dispose()` e o diretório temporário é limpo ao término da sessão do pytest.

### Componentes e Arquivos Afetados
- [elt/pyproject.toml](file:///Volumes/Projects/transparencia/elt/pyproject.toml) — Substituição de `testing-postgresql` por `duckdb-engine==0.17.0`.
- [elt/uv.lock](file:///Volumes/Projects/transparencia/elt/uv.lock) — Atualização das travas de dependência.
- [elt/conftest.py](file:///Volumes/Projects/transparencia/elt/conftest.py) — Refatoração dos fixtures `pg`, `engine`, `conn` e da função `_run_dbt`.
- [elt/core/config.py](file:///Volumes/Projects/transparencia/elt/core/config.py) — Resolução robusta de caminho de seeds CSV.
- [elt/transform/models/staging/porciuncula_prefeitura/_sources.yml](file:///Volumes/Projects/transparencia/elt/transform/models/staging/porciuncula_prefeitura/_sources.yml) — Parametrização dinâmica do catálogo de banco de dados para dbt.
- [Makefile](file:///Volumes/Projects/transparencia/Makefile) — Atualização do comando do target `make test`.

### References
- [Epic 5 no epics.md](file:///_bmad-output/planning-artifacts/epics.md#epic-5-migração-para-arquitetura-analytics-serverless-duckdb--parquet--cloudflare-r2--assistente-llm)
- [Story 5.1 Artifact](file:///_bmad-output/implementation-artifacts/5-1-adaptar-pipeline-dbt-para-dbt-duckdb.md)
- [Architecture Spine](file:///_bmad-output/planning-artifacts/architecture/architecture-transparencia-2026-08-01/ARCHITECTURE-SPINE.md)
- [Diretrizes AGENTS.md](file:///AGENTS.md)

## Dev Agent Record

### Agent Model Used

Gemini 3.6 Flash (Medium)

### Debug Log References

- `make test` executado com sucesso (10/10 testes passando em 21s via DuckDB em memória/arquivo temporário sem subprocesso Postgres).
- `make check` executado com 100% de aprovação no ruff (lint e format) e mypy (55 arquivos limpos).

### Completion Notes List

- ✅ Removida a dependência `testing-postgresql` e adicionada `duckdb-engine==0.17.0` (pinned) no `elt/pyproject.toml`.
- ✅ Sincronizado o arquivo `elt/uv.lock` via `uv sync`.
- ✅ Refatorado `elt/conftest.py` para utilizar engine DuckDB com banco efêmero em diretório temporário (`tmp_path_factory`), eliminando fixture `pg` de PostgreSQL.
- ✅ Reconfigurada a função `_run_dbt` para injetar `DBT_DUCKDB_PATH` e integrar o subprocesso `dbt-duckdb` com o mesmo banco dos testes Python.
- ✅ Atualizada a referência de banco em `_sources.yml` para utilizar resolvedor dinâmico `database: "{{ env_var('DBT_DATABASE', target.database) }}"`.
- ✅ Ajustada a propriedade `orgaos_csv_path` em `elt/core/config.py` para resolução de caminho relativa a `__file__`.
- ✅ Atualizado o alvo `test` no `Makefile` para executar pytest no diretório `elt/` (`cd elt && uv run pytest -v`).
- ✅ Validação 100% aprovada na suíte de testes (`make test`) e estática (`make check`).

### File List

- `elt/pyproject.toml`
- `elt/uv.lock`
- `elt/conftest.py`
- `elt/core/config.py`
- `elt/transform/models/staging/porciuncula_prefeitura/_sources.yml`
- `Makefile`
- `_bmad-output/implementation-artifacts/5-2-refatorar-suite-de-testes-do-etl-conftest-py.md`
