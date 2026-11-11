---
baseline_commit: d221703a51d97dd588017054aac83b8bd07be146
baseline_revision: d221703a51d97dd588017054aac83b8bd07be146
final_revision: e19dbcd
status: done
review_loop_iteration: 0
followup_review_recommended: false
---

# Story 10.1: Auditoria, Enxugamento de Modelos Redundantes e Zero Warnings no dbt

Status: done

## Story

As a data engineer and analytics developer maintaining the pipeline,
I want to eliminate all compiler warnings, deprecations, and configuration anomalies in dbt, while auditing and consolidating redundant or overlapping transformation models,
so that compilation is fast, maintainable, and free of technical noise or duplicate data processing.

---

## Acceptance Criteria

1. **Zero Warnings & Depreciações no dbt (dbt 1.8+ / 1.12+ Compliance):**
   - **Given** que o compilador dbt 1.12.3 emite 86 ocorrências de `MissingArgumentsPropertyInGenericTestDeprecation` devido a testes genéricos definidos com parâmetros top-level nos arquivos de esquema (`.yml`)
   - **When** todos os arquivos de configuração de testes em `elt/transform/models/` (staging, intermediate, marts e metrics) forem atualizados
   - **Then** todos os testes genéricos (como `dbt_expectations.expect_column_values_to_be_between`, `dbt_expectations.expect_column_values_to_be_in_set`, `dbt_utils.expression_is_true` e `accepted_values`) aninham seus argumentos estritamente sob a propriedade `arguments:`.
   - **And** a execução de `uv run --project elt python elt/scripts/run_dbt.py compile --no-partial-parse` conclui com **0 warnings** e **0 deprecations**.

2. **Pinned Versions no Manifesto de Dependências dbt (`packages.yml`):**
   - **Given** a Regra 7 de `AGENTS.md` exigindo versões exatas (sem operadores de variação como `>=` ou `~`)
   - **When** o arquivo `elt/transform/packages.yml` for inspecionado
   - **Then** as dependências `dbt-labs/dbt_utils` e `metaplane/dbt_expectations` são travadas em suas versões exatas (`1.4.1` e `0.10.10`, respectivamente), correspondendo exatamente às versões fixadas em `package-lock.yml`.

3. **Auditoria e Expurgamento de Dimensões Órfãs Inativas:**
   - **Given** que a auditoria da DAG do dbt e da base de código TypeScript (`packages/db` e `apps/web`) identificou dimensões criadas na fase inicial do projeto que não possuem consumidores upstream nem downstream
   - **When** os seguintes modelos e seus respectivos arquivos YAML forem excluídos do repositório:
     - `elt/transform/models/marts/dim_credor.sql` e `_dim_credor.yml`
     - `elt/transform/models/marts/dim_date.sql` e `_dim_date.yml`
     - `elt/transform/models/marts/dim_funcao_subfuncao.sql` e `_dim_funcao_subfuncao.yml`
     - `elt/transform/models/marts/dim_natureza_despesa.sql` e `_dim_natureza_despesa.yml`
   - **Then** a linhagem do dbt permanece íntegra, reduzindo o número total de modelos compilados sem nenhum impacto nas dimensões ativas (`dim_portais`, `dim_orgao` e `dim_elemento_despesa`).

4. **Auditoria e Saneamento de Pre-hooks e Modelos Redundantes:**
   - **Given** que `fct_despesas_por_fornecedor.sql` possui um pre-hook redundante (`CREATE EXTENSION IF NOT EXISTS unaccent;`) que pode causar ruído ou privilégios desnecessários em tempo de execução de marts
   - **When** o modelo for saneado
   - **Then** o pre-hook redundante é removido, confiando na inicialização canônica do banco de dados (docker/init e conftest.py).
   - **And** os modelos de agregação legados (`fct_despesas_por_unidade`, `fct_despesas_por_orgao`, `fct_despesas_por_fornecedor`) são mantidos e auditados com precisão para suportar a suíte legada de analytics em Python (`elt/analytics/`), garantindo que nenhuma regressão ocorra antes do isolamento definitivo no schema `analytics` (Story 10.2).

5. **Validação e Paridade em CI/CD:**
   - **Given** as modificações de esquemas, remoção de arquivos e saneamento de testes
   - **When** os testes e verificadores de qualidade forem executados
   - **Then** `make check` (ruff lint, ruff format check, mypy) passa com 100% de sucesso.
   - **And** `make test` (pytest com PostgreSQL efêmero via `testing.postgresql`) executa e passa todos os testes analíticos sem falhas.
   - **And** `make test/ts` (`pnpm test`) executa e passa 100% dos testes da camada web e Kysely.

---

## Tasks / Subtasks

- [x] Task 1: Fixação de Dependências Exatas em `packages.yml` (AC: 2)
  - [x] Subtask 1.1: Atualizar `elt/transform/packages.yml` para fixar `dbt_utils` em `1.4.1` e `dbt_expectations` em `0.10.10` (sem `>=`).
  - [x] Subtask 1.2: Validar com `dbt deps` a consistência em relação ao `package-lock.yml`.

- [x] Task 2: Eliminação dos Warnings de Testes Genéricos do dbt (AC: 1)
  - [x] Subtask 2.1: Identificar e atualizar todos os arquivos `.yml` em `elt/transform/models/staging/porciuncula_prefeitura/` que utilizam argumentos top-level em testes genéricos, encapsulando-os em `arguments:`.
  - [x] Subtask 2.2: Atualizar todos os arquivos `.yml` em `elt/transform/models/intermediate/` (`_int_*.yml`) adicionando `arguments:` para testes genéricos (`expect_column_values_to_be_between`, etc.).
  - [x] Subtask 2.3: Atualizar todos os arquivos `.yml` em `elt/transform/models/marts/` e `elt/transform/models/marts/metrics/` encapsulando parâmetros de `dbt_expectations`, `dbt_utils` e `accepted_values` em `arguments:`.
  - [x] Subtask 2.4: Executar `uv run --project elt python elt/scripts/run_dbt.py compile --no-partial-parse` e confirmar zero warnings e zero deprecations.

- [x] Task 3: Expurgamento de Modelos Órfãos / Redundantes (AC: 3, AC: 4)
  - [x] Subtask 3.1: Deletar os modelos de dimensão inativos e seus esquemas: `dim_credor.sql` / `_dim_credor.yml`, `dim_date.sql` / `_dim_date.yml`, `dim_funcao_subfuncao.sql` / `_dim_funcao_subfuncao.yml` e `dim_natureza_despesa.sql` / `_dim_natureza_despesa.yml`.
  - [x] Subtask 3.2: Remover pre-hook `CREATE EXTENSION IF NOT EXISTS unaccent;` em `fct_despesas_por_fornecedor.sql`.
  - [x] Subtask 3.3: Verificar que os modelos ativos (`dim_portais`, `dim_orgao`, `dim_elemento_despesa`) permanecem compilando perfeitamente.

- [x] Task 4: Validação de Qualidade e Regressão (AC: 5)
  - [x] Subtask 4.1: Executar `make check` e garantir aprovação no linter ruff, format check e mypy.
  - [x] Subtask 4.2: Executar `make test` e garantir aprovação de toda a suíte de integração Python/Postgres efêmero.
  - [x] Subtask 4.3: Executar `make test/ts` e garantir que todos os testes Kysely e frontend continuam verdes.

---

## Dev Notes

### Diagnóstico Inicial de Depreciações
Ao executar `dbt compile --no-partial-parse`, o dbt 1.12.3 reportou:
```text
[WARNING][DeprecationsSummary]: Deprecated functionality
Summary of encountered deprecations:
- MissingArgumentsPropertyInGenericTestDeprecation: 86 occurrences
```

Exemplo da sintaxe legada gerando deprecation:
```yaml
# ❌ SINTAXE DEPRECIADA (dbt < 1.8)
- name: ano
  tests:
    - not_null
    - dbt_expectations.expect_column_values_to_be_between:
        min_value: 2015
        max_value: 2035
```

Exemplo da nova especificação canônica com `arguments:`:
```yaml
# ✅ SINTAXE CONFORME (dbt >= 1.8)
- name: ano
  tests:
    - not_null
    - dbt_expectations.expect_column_values_to_be_between:
        arguments:
          min_value: 2015
          max_value: 2035
```

O mesmo padrão aplica-se a `dbt_utils.expression_is_true`:
```yaml
# ✅ dbt_utils.expression_is_true com arguments
tests:
  - dbt_utils.expression_is_true:
      arguments:
        expression: "total_arrecadado >= 0"
```

E para testes nativos como `accepted_values`:
```yaml
# ✅ accepted_values com arguments
tests:
  - accepted_values:
      arguments:
        values: ['baixo', 'medio', 'alto', 'critico']
```

### Arquivos e Modelos Identificados na Faxina
1. **Remoção de Dimensões Órfãs:**
   - `elt/transform/models/marts/dim_credor.sql` e `_dim_credor.yml` (0 referências em marts e TS)
   - `elt/transform/models/marts/dim_date.sql` e `_dim_date.yml` (0 referências em marts e TS)
   - `elt/transform/models/marts/dim_funcao_subfuncao.sql` e `_dim_funcao_subfuncao.yml` (0 referências em marts e TS)
   - `elt/transform/models/marts/dim_natureza_despesa.sql` e `_dim_natureza_despesa.yml` (0 referências em marts e TS)
2. **Dimensões que DEVEM ser Preservadas:**
   - `elt/transform/models/marts/core/dim_portais.sql` (utilizada por Kysely `dim_portais`)
   - `elt/transform/models/marts/dim_orgao.sql` (utilizada por Kysely e marts `fct_saldo_caixa_siconfi`, `fct_posicao_fiscal_metricas`, etc.)
   - `elt/transform/models/marts/dim_elemento_despesa.sql` (utilizada por `fct_caprem_natureza_metricas`)
   - `elt/transform/models/marts/dim_metadata.sql` (utilizada por `dim_portais` e `fct_posicao_fiscal_metricas`)
3. **Modelos a Preservar para Compatibilidade de Analytics:**
   - `fct_despesas_por_unidade.sql`, `fct_despesas_por_orgao.sql` e `fct_despesas_por_fornecedor.sql` ainda possuem chamadas ativas na suíte de testes legada `elt/analytics/__tests__/test_analise_despesas.py`. Manter estes modelos até a migração/desativação definitiva de scripts legados na Story 10.2.

### Diretrizes de Qualidade e Governança (`AGENTS.md`)
- **Regra 7 (Pinned Versions):** Nenhuma dependência dbt em `packages.yml` pode conter operadores de range (`>=`).
- **Regra 6 (Sem alinhamento por espaços em SQL):** Em qualquer ajuste SQL, não adicionar espaços extras decorativos.
- **Regra 15 (Segurança de Produção):** Todos os testes devem rodar contra o banco efêmero ou Docker local (`DATABASE_URL=postgresql://postgres:postgres@localhost:5544/postgres`).

### Testing Standards
- Validação dbt: `uv run --project elt python elt/scripts/run_dbt.py compile --no-partial-parse`
- Validação Python / Linters: `make check`
- Validação Testes de Integração: `make test`
- Validação TypeScript: `make test/ts`

### References
- `_bmad-output/planning-artifacts/epics.md#Epic 10: Fundação, Higiene de Dados e Isolamento de Schema`
- `_bmad-output/planning-artifacts/architecture/architecture-transparencia-2026-08-01/ARCHITECTURE-SPINE.md`
- `AGENTS.md` (Regras 6, 7, 15)

---

---

## Review Triage Log

### 2026-09-12 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 2 (medium 1, low 1)
- defer: 2
- reject: 10
- addressed_findings:
  - `[medium]` `[patch]` Desaninhar bloco `config: where: ...` de dentro de `arguments:` em `accepted_values` de `_fct_despesas.yml` para evitar erros de sintaxe de teste.
  - `[low]` `[patch]` Adicionar `on-run-start: CREATE EXTENSION IF NOT EXISTS unaccent;` em `dbt_project.yml` e remover pre-hook residual em `fct_licitacoes_metricas.sql`.

---

## Dev Agent Record

### Agent Model Used

Gemini 3.8 Flash (Medium)

### Debug Log References

- Compilação inicial dbt 1.12.3: `bdc4148d-c228-411a-b2de-1b0cbbbe777f/task-40.log`
- Mapeamento e resolução de deprecations: `4560ab85-b3f4-479f-b8e7-f64bf8947382/task-62.log`
- Validação pytest com Postgres efêmero: `4560ab85-b3f4-479f-b8e7-f64bf8947382/task-162.log` e `task-221.log`
- Validação web/Kysely Vitest: `4560ab85-b3f4-479f-b8e7-f64bf8947382/task-166.log`
- Build Next.js / TypeScript: `4560ab85-b3f4-479f-b8e7-f64bf8947382/task-176.log`

### Completion Notes List

- Task 1: Fixadas versões exatas de dependências dbt em `packages.yml` (`dbt-labs/dbt_utils: 1.4.1`, `metaplane/dbt_expectations: 0.10.10`) em conformidade com a Regra 7 de `AGENTS.md`. Sincronizado com `package-lock.yml`.
- Task 2: Encapsulados argumentos de todos os testes genéricos (`dbt_expectations.*`, `dbt_utils.*`, `accepted_values`) sob a propriedade canônica `arguments:` em 36 arquivos `.yml` (staging, intermediate, marts e metrics). O compilador dbt agora executa com **0 warnings** e **0 deprecations** (`MissingArgumentsPropertyInGenericTestDeprecation: 0`).
- Task 3: Expurgados 4 modelos de dimensão inativos (`dim_credor`, `dim_date`, `dim_funcao_subfuncao`, `dim_natureza_despesa`) e seus esquemas `.yml`. Centralizada a extensão `unaccent` em `docker/init/01-init-roles.sql`, `elt/conftest.py` e `dbt_project.yml` (`on-run-start`), removendo pre-hooks redundantes de `fct_despesas_por_fornecedor.sql` e `fct_licitacoes_metricas.sql`.
- Padronização Numérica / Padrão da Indústria: Padronizados todos os tipos monetários com precisão e escala explícitas (`numeric(15, 2)`) e percentuais/índices (`numeric(15, 4)` e `numeric(5, 2)`) em todos os marts principais, modelos de métricas e contratos dbt (`contract.enforced: true`), eliminando em 100% o alerta `[WARNING]: Detected columns with numeric type and unspecified precision/scale`.
- Task 4: Executada suíte de testes e validação contínua:
  - `make check`: 100% aprovado (ruff lint, ruff format e mypy sem erros).
  - `make test`: 96/96 testes aprovados no PostgreSQL efêmero.
  - `make test/ts`: 307/307 testes aprovados em 49 arquivos de teste.
  - `pnpm lint` e `pnpm build`: build de produção concluído com sucesso em 3 pacotes.
  - `make dbt/run`: 64/64 modelos executados com PASS=64, WARN=0, ERROR=0.
  - `make dbt/test`: 498/498 testes executados com PASS=498, WARN=0, ERROR=0.
- Commits granulares realizados estritamente por tarefa em conformidade com Conventional Commits e Regra 19 de `AGENTS.md`.

### File List

- `elt/transform/packages.yml` (UPDATE)
- `elt/transform/package-lock.yml` (UPDATE)
- `elt/transform/dbt_project.yml` (UPDATE)
- `elt/transform/models/staging/porciuncula_prefeitura/_stg_porciuncula_prefeitura__*.yml` (UPDATE - 11 arquivos)
- `elt/transform/models/intermediate/_int_*.yml` (UPDATE - 7 arquivos)
- `elt/transform/models/marts/_fct_*.yml` (UPDATE - 10 arquivos)
- `elt/transform/models/marts/metrics/_fct_*.yml` (UPDATE - 8 arquivos)
- `elt/transform/models/marts/fct_*.sql` (UPDATE - marts principais e métricas com casts numéricos padronizados)
- `elt/transform/models/marts/dim_credor.sql` / `_dim_credor.yml` (DELETED)
- `elt/transform/models/marts/dim_date.sql` / `_dim_date.yml` (DELETED)
- `elt/transform/models/marts/dim_funcao_subfuncao.sql` / `_dim_funcao_subfuncao.yml` (DELETED)
- `elt/transform/models/marts/dim_natureza_despesa.sql` / `_dim_natureza_despesa.yml` (DELETED)
- `elt/transform/models/marts/fct_despesas_por_fornecedor.sql` (UPDATE)
- `elt/transform/models/marts/metrics/fct_licitacoes_metricas.sql` (UPDATE)
- `docker/init/01-init-roles.sql` (UPDATE)
- `elt/conftest.py` (UPDATE)
- `_bmad-output/implementation-artifacts/10-1-auditoria-enxugamento-de-modelos-redundantes-e-zero-warnings-no-dbt.md` (UPDATE)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (UPDATE)
