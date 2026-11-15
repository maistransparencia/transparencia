---
baseline_revision: 4de20841e7cdd454d838283846fed1b3f278f84b
final_revision: bdb616218d3c1afda7cec2789f3a0b3fc2262ef3
status: done
review_loop_iteration: 0
followup_review_recommended: false
---

# Story 10.3: Blindagem de CI/CD e Governança Estrita de Fixtures `.sql` de Teste

Status: ready-for-dev

## Story

As a quality assurance engineer and developer submitting pull requests,
I want an automated validation mechanism in CI and local test suites that enforces synchronization between dbt models and test `.sql` fixtures,
so that PRs cannot be merged if fixtures are outdated, preventing silent test suite degradation and ensuring reliable parity testing across environments.

---

## Acceptance Criteria

1. **Mecanismo de Validação Automatizada de Paridade (dbt models ↔ `schema.sql.gz`):**
   - **Given** que o pipeline dbt compila e materializa tabelas/views no schema `analytics` (`fct_*`, `dim_*` e `seed_*`)
   - **When** o teste de integração de governança for executado (`elt/tests/test_fixture_sync.py`)
   - **Then** o arquivo compactado `packages/db/tests/fixtures/schema.sql.gz` é inspecionado e validado contra a estrutura gerada pelo dbt
   - **And** todas as tabelas e views analíticas do dbt (`analytics.fct_*`, `analytics.dim_*`, `analytics.seed_*`) devem ter correspondência exata no fixture (sem tabelas faltantes ou órfãs)
   - **And** todas as colunas (nomes e tipos de dados) devem ser 100% idênticas entre as definições dbt e o DDL do fixture
   - **And** os dados estáticos das tabelas de seed (`analytics.seed_*`) no fixture devem conter os mesmos registros dos arquivos CSV/seeds do dbt
   - **And** qualquer divergência resulta em falha explícita com mensagem de erro detalhada indicando as diferenças e a instrução clara de remediação: `Execute 'make db/fixture/dump' para sincronizar o fixture`.

2. **Target de Automação no Makefile (`make db/fixture/check`):**
   - **Given** o `Makefile` do repositório
   - **When** o comando `make db/fixture/check` for executado
   - **Then** a suíte de validação de paridade de fixtures é disparada via `uv run --project elt pytest elt/tests/test_fixture_sync.py -v`
   - **And** o comando finaliza com código de saída 0 se o fixture estiver em total conformidade, ou código diferente de 0 com relatório de discrepâncias caso haja desatualização
   - **And** o target `db/fixture/dump` é mantido e documentado como a fonte oficial de regeração do arquivo `packages/db/tests/fixtures/schema.sql.gz`.

3. **Blindagem e Fail-Fast no Pipeline de CI/CD (`.github/workflows/ci.yml`):**
   - **Given** o workflow do GitHub Actions em `.github/workflows/ci.yml`
   - **When** um pull request ou push for acionado nas branches `main` ou `dev`
   - **Then** o job `ci` executa a validação de sincronização de fixtures (através de `make test` ou step explícito `make db/fixture/check`), impedindo o avanço se `schema.sql.gz` estiver defasado em relação a qualquer alteração nos modelos dbt
   - **And** no job `web`, a etapa de restauração do schema é blindada com `set -eo pipefail` para garantir que falhas no comando `gunzip` ou erros de sintaxe no `psql` interrompam o job imediatamente (fail-fast) em vez de mascarar erros silenciosos.

4. **Diretriz de Governança de Fixtures em `AGENTS.md`:**
   - **Given** as regras de desenvolvimento do projeto em `AGENTS.md`
   - **When** consultado por desenvolvedores e agentes de IA
   - **Then** uma nova diretriz (`Regra 21: Governança e Sincronização Obrigatória de Fixtures de Teste`) estabelece que qualquer alteração em modelos de marts analíticos (`elt/transform/models/marts/`) ou seeds (`elt/transform/seeds/`) exige a regeração de `packages/db/tests/fixtures/schema.sql.gz` via `make db/fixture/dump` e validação com `make db/fixture/check` antes de submeter commits ou pull requests.

5. **Qualidade e Não-Regressão da Base de Código:**
   - **Given** todas as alterações em testes, Makefile, CI e documentação
   - **When** todos os linters e suítes de teste forem executados
   - **Then** `make check` aprova 100% das checagens estáticas (mypy, ruff)
   - **And** `make test` executa com sucesso todas as 18+ suítes de testes analíticos em Python
   - **And** `make test/ts` (`pnpm test`) roda todos os 68+ testes TypeScript contra o schema restaurado sem erros
   - **And** `pnpm build` compila os pacotes e a aplicação web com sucesso.

---

## Tasks / Subtasks

- [x] Task 1: Criação do Teste Automatizado de Sincronização de Fixtures (AC: 1)
  - [x] Subtask 1.1: Criar `elt/tests/test_fixture_sync.py` com suporte à execução contra a instância efêmera do PostgreSQL (`engine` em `elt/conftest.py`).
  - [x] Subtask 1.2: Implementar leitura e descompactação de `packages/db/tests/fixtures/schema.sql.gz`.
  - [x] Subtask 1.3: Restaurar o DDL e dados de seed do fixture em um schema de auditoria isolado (`fixture_audit`) no banco de teste (substituindo tokens de schema `analytics.` por `fixture_audit.` e `public.` por `fixture_audit.` para isolamento).
  - [x] Subtask 1.4: Inspecionar e comparar metadados do PostgreSQL (`information_schema.columns` e `information_schema.tables`) entre o schema `analytics` (gerado pelo dbt) e o schema `fixture_audit` (gerado pelo fixture).
  - [x] Subtask 1.5: Validar correspondência exata de tabelas, colunas e tipos de dados (`data_type` / `udt_name`).
  - [x] Subtask 1.6: Validar paridade dos registros das tabelas `analytics.seed_*` entre o dbt e o fixture.
  - [x] Subtask 1.7: Formatar mensagens de erro amigáveis e instrução de remediação (`make db/fixture/dump`) em caso de divergência.

- [x] Task 2: Implementação do Target no Makefile (AC: 2)
  - [x] Subtask 2.1: Adicionar `.PHONY: db/fixture/check` ao `Makefile`.
  - [x] Subtask 2.2: Configurar o comando `db/fixture/check:` para rodar `uv run --project elt pytest elt/tests/test_fixture_sync.py -v`.
  - [x] Subtask 2.3: Atualizar o bloco de documentação de comandos no `Makefile` explicando o ciclo `db/fixture/dump` -> `db/fixture/check`.

- [x] Task 3: Blindagem e Fail-Fast no Workflow de CI/CD (AC: 3)
  - [x] Subtask 3.1: Em `.github/workflows/ci.yml`, verificar e adicionar a etapa `Verify test fixture synchronization` no job `ci` chamando `make db/fixture/check`.
  - [x] Subtask 3.2: No job `web` de `.github/workflows/ci.yml`, atualizar a etapa `Restore packages/db test schema` para incluir `set -eo pipefail` antes de `gunzip -c ... | psql "$DATABASE_URL"`.

- [x] Task 4: Atualização das Diretrizes de Engenharia em `AGENTS.md` (AC: 4)
  - [x] Subtask 4.1: Adicionar a seção `21. GOVERNANÇA E SINCRONIZAÇÃO DE FIXTURES DE TESTE (dbt models ↔ packages/db/tests/fixtures/schema.sql.gz)` em `AGENTS.md`.
  - [x] Subtask 4.2: Explicitar a obrigatoriedade de executar `make db/fixture/dump` e `make db/fixture/check` sempre que houver alteração em marts ou seeds analíticos.

- [x] Task 5: Validação Integral de Qualidade e Simulação de Falha (AC: 1, AC: 5)
  - [x] Subtask 5.1: Executar `make check` e garantir conformidade com ruff e mypy.
  - [x] Subtask 5.2: Executar `make db/fixture/check` e `make test` validando que a suíte passa 100% com o fixture atual.
  - [x] Subtask 5.3: Executar `make test/ts` (`pnpm test`) e `pnpm build` assegurando que os testes TypeScript e o build web passam sem nenhuma quebra.

---

## Dev Notes

### Diagnóstico e Racional Arquitetural
Na arquitetura do repositório, existe um desacoplamento intencional entre o pipeline de dados analítico em Python/dbt (`elt/`) e a camada de consumo em TypeScript/Kysely (`packages/db/` e `apps/web/`).
- O pipeline ELT em Python executa testes dinâmicos usando PostgreSQL efêmero (`testing.postgresql`), onde `elt/conftest.py` roda `dbt deps`, `dbt seed` e `dbt run --vars '{"test_mode": true}'`.
- A camada de dados TypeScript (`packages/db`), por sua vez, testa suas queries Kysely contra uma instância do PostgreSQL pré-populada com o DDL e dados de seed armazenados no fixture compactado `packages/db/tests/fixtures/schema.sql.gz`.

**O Problema Atual:**
Se um engenheiro de dados adiciona uma coluna, cria um novo mart (`fct_*`/`dim_*`) ou ajusta um seed no dbt, mas esquece de rodar `make db/fixture/dump`:
1. O pipeline Python passa normalmente no CI porque o dbt compila dinamicamente a partir dos arquivos `.sql` e `_sources.yml`.
2. O fixture `schema.sql.gz` permanece defasado no Git.
3. Se os testes TypeScript não acessam a nova coluna, o job `web` também passa no CI.
4. Resultado: o repositório entra em estado de inconsistência silenciosa, mascarando regressões e gerando divergências que só aparecem quando outro desenvolvedor tenta utilizar o schema atualizado.

### Estratégia de Validação Semântica (`test_fixture_sync.py`)
Em vez de depender de diff de texto ou diff de arquivos `.gz` (que sofrem com variações de versão do `pg_dump` entre macOS e Linux, timestamps e metadados irrelevantes), a validação semântica em banco é a abordagem mais robusta:
1. O fixture `schema.sql.gz` é descompactado em memória (`gzip.decompress`).
2. O script SQL é executado em um schema isolado `fixture_audit` no banco PostgreSQL efêmero (já fornecido pela fixture `engine` do `elt/conftest.py`).
   - Para garantir isolamento e evitar sobrescrever o schema `analytics` real, o SQL do dump pode ser adaptado substituindo `CREATE SCHEMA IF NOT EXISTS analytics;` por `CREATE SCHEMA IF NOT EXISTS fixture_audit;` e `analytics.` por `fixture_audit.`.
3. Consultas a `information_schema.columns` e `information_schema.tables` são realizadas para comparar:
   - Conjunto de tabelas em `analytics` vs `fixture_audit`.
   - Para cada tabela correspondente, o mapeamento `column_name -> data_type`.
   - Para tabelas `seed_*`, a contagem de linhas e/ou igualdade de conteúdo.
4. Se houver qualquer discrepância, o teste emite um `pytest.fail` detalhado, listando exatamente quais tabelas ou colunas diferem e como resolver (`make db/fixture/dump`).

### Fail-Fast no CI (`.github/workflows/ci.yml`)
No bash padrão de runners Linux do GitHub Actions, pipes como `gunzip -c file.gz | psql ...` retornam o exit code do **último** comando (`psql`). Se o `gunzip` falhar por arquivo truncado ou corrompido, o pipe pode ter comportamento indefinido.
Com `set -eo pipefail`:
```yaml
      - name: Restore packages/db test schema
        run: |
          set -eo pipefail
          gunzip -c packages/db/tests/fixtures/schema.sql.gz | psql "$DATABASE_URL"
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5544/postgres
```
Qualquer falha na cadeia interrompe o pipeline imediatamente.

### Arquivos Modificados / Impactados
- `elt/tests/test_fixture_sync.py` (NEW)
- `Makefile` (UPDATE)
- `.github/workflows/ci.yml` (UPDATE)
- `AGENTS.md` (UPDATE)

### Diretrizes de Qualidade e Governança (`AGENTS.md`)
- **Regra 4 (Baseline de Qualidade Mandatória):** Executar `make check`, `make test`, `make test/ts` e `pnpm build`.
- **Regra 5 (Sincronização de Fontes dbt models ↔ `elt/conftest.py`):** Modelos e fontes devem estar sincronizados com `_sources.yml`.
- **Regra 15 (Segurança de Produção):** Todos os testes devem rodar estritamente contra o banco de dados efêmero (`testing.postgresql`) ou Docker local (`localhost:5544`). Nunca disparar comandos contra produção.
- **Regra 19 (Mensagens de Commit Convencionais):** Sem menção a números de story/task nos commits (ex: `test(elt): adicionar validacao automatizada de sincronizacao de fixtures`).

---

## Dev Agent Record

### Agent Model Used

Gemini 3.8 Flash (Medium)

### Debug Log References

### Completion Notes List

1. Implementada a suíte de validação automatizada de paridade de fixtures em `elt/tests/test_fixture_sync.py`, testando existência do arquivo, paridade exata de tabelas/views (`fct_*`, `dim_*`, `seed_*`), paridade de colunas e tipos de dados no `information_schema`, e paridade de conteúdo dos dados estáticos de `seed_*`.
2. Adicionado o target `db/fixture/check` no `Makefile` e documentado o ciclo de governança de fixtures (`make db/fixture/dump` -> `make db/fixture/check`).
3. Atualizado o pipeline de CI/CD `.github/workflows/ci.yml` com step explícito `Verify test fixture synchronization` chamando `make db/fixture/check` no job `ci`, e blindada a etapa `Restore packages/db test schema` com `set -eo pipefail` no job `web`.
4. Atualizado `AGENTS.md` com a diretriz canônica `Regra 21: Governança e Sincronização Obrigatória de Fixtures de Teste`.
5. Validação completa realizada: `make check` (100% aprovado), `make test` (100 testes aprovados, incluindo os 4 testes de fixture_sync), `make test/ts` (49 arquivos de teste e 307 testes aprovados) e `pnpm build` (build bem-sucedido em todos os pacotes).

### File List

- `elt/tests/test_fixture_sync.py`
- `Makefile`
- `.github/workflows/ci.yml`
- `AGENTS.md`
- `_bmad-output/implementation-artifacts/10-3-blindagem-de-ci-cd-e-governanca-estrita-de-fixtures-sql-de-teste.md`
- `_bmad-output/implementation-artifacts/deferred-work.md`

---

## Review Triage Log

### 2026-09-12 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 5: (high 0, medium 3, low 2)
- defer: 1: (high 0, medium 0, low 1)
- reject: 3: (high 0, medium 0, low 3)
- addressed_findings:
  - `[medium]` `[patch]` Adicionado `-v ON_ERROR_STOP=1` ao comando `psql` na restauração do schema no CI (`.github/workflows/ci.yml`) para garantir fail-fast real se houver erro de SQL.
  - `[medium]` `[patch]` Criada função auxiliar `fixture_audit.unaccent` e restringida exclusão de metacomandos para `\restrict`, `\unrestrict`, `\connect` e `\c ` em `setup_fixture_audit` (`elt/tests/test_fixture_sync.py`).
  - `[medium]` `[patch]` Utilizada projeção explícita de colunas em ordem alfabética determinística e operador `EXCEPT ALL` para detecção precisa de divergências e duplicatas em `test_seed_records_parity` (`elt/tests/test_fixture_sync.py`).
  - `[low]` `[patch]` Adicionada asserção de `common_tables` não-vazio e proteção contra tabelas seed ausentes (`elt/tests/test_fixture_sync.py`).
  - `[low]` `[patch]` Adicionado `set -eo pipefail` na subshell de `db/fixture/dump` (`Makefile`) para prevenir truncamento silencioso do fixture caso `pg_dump` falhe.

---

## Auto Run Result

### Summary of Implemented Changes
- Implementada a suíte de testes de governança e paridade semântica `elt/tests/test_fixture_sync.py` que valida a integridade do fixture `packages/db/tests/fixtures/schema.sql.gz` contra os modelos marts (`fct_*`, `dim_*`) e seeds (`seed_*`) compilados pelo dbt no PostgreSQL efêmero.
- Adicionado o target `.PHONY: db/fixture/check` no `Makefile`, além de documentação do ciclo de sincronização e governança `make db/fixture/dump` -> `make db/fixture/check`.
- Blindado o workflow de CI/CD (`.github/workflows/ci.yml`) com etapa explícita `Verify test fixture synchronization` no job `ci` e `set -eo pipefail` com `-v ON_ERROR_STOP=1` na restauração do schema no job `web`.
- Formalizada a `Regra 21: Governança e Sincronização Obrigatória de Fixtures de Teste` em `AGENTS.md`.

### Files Changed
- `elt/tests/test_fixture_sync.py`: Novo teste de paridade e integridade semântica (tabelas, colunas, tipos e seeds).
- `Makefile`: Adicionado target `db/fixture/check`, documentação do ciclo de governança e `set -eo pipefail` no dump.
- `.github/workflows/ci.yml`: Adicionado step de validação no job `ci` e fail-fast estrito (`pipefail`, `ON_ERROR_STOP=1`) no job `web`.
- `AGENTS.md`: Incluída a Regra 21 estabelecendo obrigatoriedade de regeneração e validação de fixtures.
- `_bmad-output/implementation-artifacts/deferred-work.md`: Registrado item deferido para harmonização de portas padrão do Makefile.

### Review Findings Breakdown
- Patches applied: 5 (adicionado `ON_ERROR_STOP=1`, helper `fixture_audit.unaccent`, filtro seletivo de metacomandos, projeção ordenada com `EXCEPT ALL` para seeds, e `pipefail` no dump).
- Items deferred: 1 (harmonização de portas no `Makefile` entre 5545 e 5544 para desenvolvimento local).
- Items rejected: 3 (divergência de materialização proposital por spec, verificação de constraints fora de escopo para Kysely, duplicação visual de step no CI benéfica para DX).

### Follow-up Review Recommendation
- `false`: As correções pós-revisão foram cirúrgicas e restritas à resiliência dos testes e pipelines, sem impacto arquitetural ou em APIs públicas.

### Verification Performed
- `make check`: 100% aprovado (ruff check, ruff format, mypy sem erros em 60 arquivos).
- `make db/fixture/check`: 4/4 testes aprovados em 17.87s.
- `make test`: 100/100 testes de integração e análise Python aprovados em 26.54s.
- `make test/ts`: 49 arquivos e 307 testes TypeScript aprovados em 15.18s.
- `pnpm build`: Build concluído com sucesso em todos os pacotes (@transparencia/db, @transparencia/ui, web).

### Residual Risks
- Nenhum risco residual identificado. O isolamento em schema efêmero garante execução hermética e o CI bloqueará qualquer desvio futuro.
