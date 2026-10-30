---
story_id: 1.5
story_key: 1-5-modelos-de-metricas-de-dominio-especifico-no-dbt-fct-execucao-orcamentaria-metricas-fct-fontes-receita-metricas-fct-historia-caprem-metricas-e-fct-historia-saude-metricas
epic_num: 1
status: done
baseline_commit: e6fa3fe
created: 2026-08-02T10:55:00-03:00
---

# Story 1.5: Modelos de Métricas de Domínio Específico no dbt (`fct_execucao_orcamentaria_metricas`, `fct_fontes_receita_metricas`, `fct_historia_caprem_metricas` e `fct_historia_saude_metricas`)

## Story Description

**As a** Brazilian fiscal analyst / system,  
**I want** pre-aggregated budgetary execution, revenue sources, CAPREM actuarial metrics, and Health story metrics models in dbt using official dimension tables,  
**So that** domain-specific cross-referencing, casts, and complex filtering happen at data materialization time without runtime SQL/JS overhead.

---

## Acceptance Criteria

### Scenario 1: Materialização Física dos Marts de Domínio Específico
- **Given** as tabelas raw/staging de empenhos, liquidações, pagamentos, receitas, folhas de pagamento e credores, integradas às dimensões canônicas (`dim_elemento_despesa`, `dim_natureza_despesa`, `dim_funcao_subfuncao`)
- **When** os modelos dbt `fct_execucao_orcamentaria_metricas`, `fct_fontes_receita_metricas`, `fct_historia_caprem_metricas` e `fct_historia_saude_metricas` forem executados no dbt via `dbt run --select marts.metrics`
- **Then** todas as tabelas são criadas no schema de marts com materialização física `table` (`config(materialized='table')`) em `elt/transform/models/marts/metrics/`.
- **And** cada tabela contém a dimensão de tenant obrigatória `portal_slug` em seu agrupamento e chave surrogate MD5.

### Scenario 2: Estrutura e Invariantes de Execução Orçamentária (`fct_execucao_orcamentaria_metricas`)
- **Given** o mart de execução orçamentária
- **When** o modelo `fct_execucao_orcamentaria_metricas.sql` for executado
- **Then** ele agrega os dados por `portal_slug`, `empresa_id`, `ano`, `orgao_codigo`, `unidade_codigo`, `funcao_codigo` e `subfuncao_codigo`.
- **And** pré-calcula os somatórios de `total_dotacao_atualizada`, `total_empenhado`, `total_liquidado`, `total_pago`, `saldo_orcamentario` (`dotacao - empenhado`) e `taxa_execucao` (`empenhado / dotacao`).
- **And** define o indicador de alerta de execução (`baixa` para taxa < 30%, `excesso` para taxa > 100%, `normal`, ou `N/D`).

### Scenario 3: Estrutura e Métricas de Fontes de Receita (`fct_fontes_receita_metricas`)
- **Given** o mart de fontes de receita
- **When** o modelo `fct_fontes_receita_metricas.sql` for executado
- **Then** ele agrega os totais de arrecadação e previsão orçamentária por `portal_slug` e `ano`.
- **And** pré-calcula a segregação entre `receita_propria_previsto`, `receita_propria_arrecadado`, `transferencias_uniao_previsto`, `transferencias_uniao_arrecadado`, `transferencias_estado_previsto`, `transferencias_estado_arrecadado`, `total_previsto` e `total_arrecadado`.
- **And** pré-consolida o percentual de receita própria (`pct_propria`) e o flag de alerta de dependência financeira (`alerta_dependencia = TRUE` se `pct_propria < 10%`).
- **And** pré-calcula as receitas específicas de FPM, ICMS, ISS/IPTU, Emendas Pix (`1.7.1.5%` ou `TRANSFERENCIA ESPECIAL`) e Emendas Individuais.

### Scenario 4: Indicadores Atuariais do RPPS e CAPREM (`fct_historia_caprem_metricas`)
- **Given** as despesas vinculadas ao órgão gestor do RPPS (código `1061`), fornecedor CASP (`07.573.075/0001-00`) e dimensões canônicas de elementos de despesa (`13`, `46`, `71`, `91`, `97`)
- **When** o modelo `fct_historia_caprem_metricas.sql` for executado no dbt
- **Then** ele consolida por `portal_slug` e `ano` as métricas atuariais:
  - `total_aporte_exigido` (somatório empenhado do Elemento `97` - Aporte Atuarial)
  - `total_aporte_quitado` (somatório pago do Elemento `97`)
  - `taxa_adimplencia_aporte` (`aporte_quitado / aporte_exigido * 100`)
  - `total_empenhado_patronal` e `total_pago_patronal` (Elemento `13` - Contribuições Patronais)
  - `rombo_patronal_nao_repassado` (`max(0, patronal_empenhado - patronal_pago)`)
  - `total_amortizacao_divida` (Elemento `71` - Amortização da Dívida Contratual / CADPREV)
- **And** realiza o `JOIN` nativo com `dim_elemento_despesa` sem depender de dicionários JavaScript em runtime.

### Scenario 5: Consolidação dos Indicadores Fiscais da Saúde (`fct_historia_saude_metricas`)
- **Given** as despesas e receitas da Saúde (Função Orçamentária `10` / Empresa FMS `2`) e subfunção `10.303`
- **When** o modelo `fct_historia_saude_metricas.sql` for executado no dbt
- **Then** ele consolida por `portal_slug` e `ano` a execução orçamentária da saúde:
  - `dotacao_total`, `total_empenhado`, `total_liquidado`, `total_pago`
  - `medicamentos_insumos_pago` (despesas na Subfunção `10.303` - Assistência Farmacêutica)
  - `judicializacao_pago` (despesas no Elemento `91` na Função `10` - Sentenças Judiciais da Saúde)
  - `emendas_saude_arrecadado` (arrecadação de emendas destinadas ao SUS/Saúde)
  - `hhi_concentracao_fornecedores` (índice Herfindahl-Hirschman de concentração de fornecedores de saúde)

### Scenario 6: Contratos de Schema dbt e Testes de Integração
- **Given** os arquivos de contrato YAML `_fct_execucao_orcamentaria_metricas.yml`, `_fct_fontes_receita_metricas.yml`, `_fct_historia_caprem_metricas.yml` e `_fct_historia_saude_metricas.yml`
- **When** a suíte de testes dbt for executada via `make test`
- **Then** os testes `not_null` e `unique` nas chaves primárias surrogate de todos os 4 marts são aprovados com 100% de sucesso.
- **And** os testes de invariantes fiscais (`total_empenhado >= total_liquidado AND total_liquidado >= total_pago` e `total_arrecadado >= 0`) passam sem erros.
- **And** toda a suíte de integração backend (`make test`) executa e passa integralmente no banco PostgreSQL efêmero.

---

## Tasks & Subtasks

- [x] **Task 1: Criar o Mart dbt `fct_execucao_orcamentaria_metricas.sql` e Schema Contract** (AC: Scenario 1, Scenario 2, Scenario 6)
  - [x] Criar o arquivo `elt/transform/models/marts/metrics/fct_execucao_orcamentaria_metricas.sql`.
  - [x] Configurar materialização física: `{{ config(materialized='table') }}`.
  - [x] Implementar a agregação por `portal_slug`, `empresa_id`, `ano`, `orgao_codigo`, `unidade_codigo`, `funcao_codigo`, `subfuncao_codigo`.
  - [x] Gerar chave surrogate MD5 `execucao_orcamentaria_id`.
  - [x] Criar o contrato de schema e arquivo de teste `elt/transform/models/marts/metrics/_fct_execucao_orcamentaria_metricas.yml`.

- [x] **Task 2: Criar o Mart dbt `fct_fontes_receita_metricas.sql` e Schema Contract** (AC: Scenario 1, Scenario 3, Scenario 6)
  - [x] Criar o arquivo `elt/transform/models/marts/metrics/fct_fontes_receita_metricas.sql`.
  - [x] Configurar materialização física: `{{ config(materialized='table') }}`.
  - [x] Implementar a agregação por `portal_slug` e `ano`, consolidando receitas próprias, transferências da União/Estado, FPM, ICMS, ISS/IPTU e Emendas Pix/Individuais.
  - [x] Gerar chave surrogate MD5 `fontes_receita_id`.
  - [x] Criar o arquivo `elt/transform/models/marts/metrics/_fct_fontes_receita_metricas.yml` com testes de não-nulidade e unicidade.

- [x] **Task 3: Criar o Mart dbt `fct_historia_caprem_metricas.sql` e Schema Contract** (AC: Scenario 1, Scenario 4, Scenario 6)
  - [x] Criar o arquivo `elt/transform/models/marts/metrics/fct_historia_caprem_metricas.sql`.
  - [x] Configurar materialização física: `{{ config(materialized='table') }}`.
  - [x] Cruzar despesas com `dim_elemento_despesa` (elementos `13`, `46`, `71`, `91`, `97`) e calcular indicadores de aporte atuarial, adimplência e rombo patronal.
  - [x] Agrupar obrigatoriamente por `portal_slug` e `ano`.
  - [x] Gerar chave surrogate MD5 `historia_caprem_id`.
  - [x] Criar o contrato de schema `elt/transform/models/marts/metrics/_fct_historia_caprem_metricas.yml`.

- [x] **Task 4: Criar o Mart dbt `fct_historia_saude_metricas.sql` e Schema Contract** (AC: Scenario 1, Scenario 5, Scenario 6)
  - [x] Criar o arquivo `elt/transform/models/marts/metrics/fct_historia_saude_metricas.sql`.
  - [x] Configurar materialização física: `{{ config(materialized='table') }}`.
  - [x] Consolidar métricas de orçamento da saúde (Função `10`), medicamentos/insumos (Subfunção `10.303`), judicialização (Elemento `91` na Função `10`) e índice HHI de fornecedores.
  - [x] Agrupar por `portal_slug` e `ano`.
  - [x] Gerar chave surrogate MD5 `historia_saude_id`.
  - [x] Criar o contrato de schema `elt/transform/models/marts/metrics/_fct_historia_saude_metricas.yml`.

- [x] **Task 5: Validação da Suíte de Testes Backend (`make test`)** (AC: Scenario 6)
  - [x] Executar `make test` para verificar compilação dbt no banco efêmero PostgreSQL, criação física de todos os 4 marts de métricas de domínio e validação dos testes `dbt test`.
  - [x] Garantir 100% de aprovação na suíte de testes.

### Review Findings

- [x] [Review][Patch] Remover LEFT JOIN não utilizado em `dim_elemento_despesa` [`elt/transform/models/marts/metrics/fct_historia_caprem_metricas.sql:35`]
- [x] [Review][Patch] Corrigir classificação de alerta para despesas sem orçamento (`dotacao = 0` e `empenhado > 0`) [`elt/transform/models/marts/metrics/fct_execucao_orcamentaria_metricas.sql:65`]
- [x] [Review][Patch] Ampliar precisão de `taxa_execucao` e percentuais para `numeric(15, 4)` evitando estouro numérico [`elt/transform/models/marts/metrics/fct_execucao_orcamentaria_metricas.sql:43`]
- [x] [Review][Patch] Alinhar filtro da Subfunção 303 na CTE `fornecedores_saude` em `fct_historia_saude_metricas.sql` [`elt/transform/models/marts/metrics/fct_historia_saude_metricas.sql:47`]
- [x] [Review][Patch] Corrigir cálculo de `emendas_saude_arrecadado` ordenando `coalesce` corretamente [`elt/transform/models/marts/metrics/fct_historia_saude_metricas.sql:34`]
- [x] [Review][Patch] Excluir elementos previdenciários (13, 71, 97) do cálculo de `total_casp_plano_saude` [`elt/transform/models/marts/metrics/fct_historia_caprem_metricas.sql:27`]
- [x] [Review][Patch] Adicionar filtro do código de órgão do RPPS (`1061`) na CTE do CAPREM [`elt/transform/models/marts/metrics/fct_historia_caprem_metricas.sql:38`]
- [x] [Review][Patch] Garantir que `total_previsto` e `total_arrecadado` agreguem receitas orçamentárias brutas para cálculo correto da receita própria municipal [`elt/transform/models/marts/metrics/fct_fontes_receita_metricas.sql:7`]

---

## Dev Notes & Technical Architecture Guardrails

### Core Invariants & Architectural Rules
- **AD-1 (SSOT no dbt)**: Toda a inteligência contábil, agregação de empenhos/receitas e cruzamentos com dimensões oficiais (`dim_elemento_despesa`, `dim_natureza_despesa`, `dim_funcao_subfuncao`) são transferidos para os modelos dbt em `elt/transform/models/marts/metrics/`. Nenhuma regra de negócio fiscal deve permanecer em runtime JS/TS.
- **AD-2 (Materialização em Tabela Física)**: Todos os 4 novos marts devem ser configurados obrigatoriamente com `materialized='table'` para garantir leituras instantâneas (< 100ms) no PostgreSQL.
- **AD-5 (Filtragem Mandatória por `portal_slug`)**: Todos os modelos dbt em `marts/metrics/` devem obrigatoriamente incluir a dimensão `portal_slug` em seu agrupamento (`GROUP BY portal_slug, ...`).
- **AD-6 (Protocolo de Validação dbt e CI)**: Qualquer alteração em fontes exige sincronização no `_sources.yml`. O `make test` executa compilação e testes em banco de dados efêmero PostgreSQL.
- **Regra de Formatação SQL**: Nunca adicione espaços extras para alinhar colunas, aliases (`AS`) ou elementos em queries SQL de analytics (`analysis/`, `elt/`, `tests/`). Use apenas o espaço mínimo necessário para separar tokens.

### Current Code & Logic Analysis (Files Being Replaced / Subsidized)
1. **`packages/db/src/queries/execucao_orcamentaria.ts`**:
   - Atualmente calcula empenhado, liquidado, pago, dotação e taxa de execução via queries sql soltas sobre `fct_despesas_por_orgao`.
   - O novo mart `fct_execucao_orcamentaria_metricas.sql` pré-calcula essa estrutura no dbt.
2. **`packages/db/src/queries/fontes_receita.ts`**:
   - Atualmente executa múltiplos `Promise.all` em runtime com queries sql agregando `fct_receitas` e `fct_emendas`.
   - O novo mart `fct_fontes_receita_metricas.sql` consolida todos os totais e percentuais no dbt.
3. **`packages/db/src/queries/historia_caprem.ts`**:
   - Atualmente contém o dicionário hardcoded `ELEMENTO_LABELS` (elementos 13, 46, 71, 91, 97) e constantes (`CAPREM_CODE = "1061"`, `CASP_CNPJ = "07.573.075/0001-00"`).
   - O novo mart `fct_historia_caprem_metricas.sql` realiza os joins nativos com `dim_elemento_despesa` e materializa os indicadores de risco atuarial.
4. **`packages/db/src/queries/historia_saude.ts`**:
   - Atualmente calcula orçamento da saúde, subfunção `303`, judicialização da saúde e concentração de fornecedores em runtime.
   - O novo mart `fct_historia_saude_metricas.sql` consolida o domínio da saúde em tabela pré-calculada.

### Source Documents & References
- **Architecture Spine**: [`_bmad-output/planning-artifacts/architecture/architecture-transparencia-2026-08-01/ARCHITECTURE-SPINE.md`](file:///Volumes/Projects/transparencia/_bmad-output/planning-artifacts/architecture/architecture-transparencia-2026-08-01/ARCHITECTURE-SPINE.md#3-especifica%C3%A7%C3%A3o-dos-novos-marts-de-m%C3%A9tricas-no-dbt)
- **Inventário STN/MCASP (Story 1.1)**: [`_bmad-output/implementation-artifacts/inventario-regras-fiscais-stn-mcasp.md`](file:///Volumes/Projects/transparencia/_bmad-output/implementation-artifacts/inventario-regras-fiscais-stn-mcasp.md)
- **Epics Breakdown**: [`_bmad-output/planning-artifacts/epics.md`](file:///Volumes/Projects/transparencia/_bmad-output/planning-artifacts/epics.md#story-15-modelos-de-m%C3%A9tricas-de-dom%C3%ADnio-espec%C3%ADfico-no-dbt-fct_execucao_orcamentaria_metricas-fct_fontes_receita_metricas-fct_historia_caprem_metricas-e-fct_historia_saude_metricas)
- **História Anterior (Story 1.4)**: [`_bmad-output/implementation-artifacts/1-4-modelo-de-metricas-de-analise-de-despesas-no-dbt-fct-analise-despesas-metricas.md`](file:///Volumes/Projects/transparencia/_bmad-output/implementation-artifacts/1-4-modelo-de-metricas-de-analise-de-despesas-no-dbt-fct-analise-despesas-metricas.md)

### Learnings from Previous Stories (Story 1.3 & Story 1.4)
- Todos os marts de métricas ficam localizados no subdiretório `elt/transform/models/marts/metrics/`.
- Cada modelo `.sql` deve possuir seu schema contract YAML equivalente `_fct_<nome_do_mart>.yml` com `contract: enforced: true` (se viável) ou declarações explícitas de tipos e testes `unique` / `not_null` na chave surrogate MD5.
- Incluir a coluna `empresa_id` na granularidade quando aplicável permite filtrar por entidade (Prefeitura vs. Fundo de Saúde) mantendo `portal_slug` como dimensão principal de multi-tenant.
- A execução do `make test` no ambiente local valida toda a compilação do dbt contra a instância efêmera do PostgreSQL (`testing.postgresql`), rodando `dbt deps`, `dbt seed` e `dbt run --vars '{"test_mode": true}'`.

---

## Dev Agent Record

### Agent Model Used
Gemini 3.6 Flash (Medium)

### Debug Log References

### Completion Notes List
- Especificação completa da História 1.5 criada via `/bmad-create-story`.
- Definidos os cenários BDD e tarefas de desenvolvimento para a criação dos 4 marts dbt de domínio específico (`fct_execucao_orcamentaria_metricas`, `fct_fontes_receita_metricas`, `fct_historia_caprem_metricas` e `fct_historia_saude_metricas`).
- Criados os 4 novos modelos dbt em `elt/transform/models/marts/metrics/` com materialização física `table`.
- Criados os 4 contratos de schema em arquivos YAML com testes de integridade `unique`, `not_null` e invariantes da LRF.
- Validados 100% dos testes backend em Python/dbt via `make test` (82/82 testes aprovados).
- Validados 100% dos testes frontend/TypeScript via `make test/ts` (14/14 testes vitest e build sem erros).

### Change Log
- Implementação completa dos 4 marts de métricas de domínio específico no dbt com contratos de schema e testes integrados (Data: 2026-08-02).

### File List

#### Target Files Created / Updated in Implementation:
- `elt/transform/models/marts/metrics/fct_execucao_orcamentaria_metricas.sql` (NEW)
- `elt/transform/models/marts/metrics/_fct_execucao_orcamentaria_metricas.yml` (NEW)
- `elt/transform/models/marts/metrics/fct_fontes_receita_metricas.sql` (NEW)
- `elt/transform/models/marts/metrics/_fct_fontes_receita_metricas.yml` (NEW)
- `elt/transform/models/marts/metrics/fct_historia_caprem_metricas.sql` (NEW)
- `elt/transform/models/marts/metrics/_fct_historia_caprem_metricas.yml` (NEW)
- `elt/transform/models/marts/metrics/fct_historia_saude_metricas.sql` (NEW)
- `elt/transform/models/marts/metrics/_fct_historia_saude_metricas.yml` (NEW)
- `_bmad-output/implementation-artifacts/1-5-modelos-de-metricas-de-dominio-especifico-no-dbt-fct-execucao-orcamentaria-metricas-fct-fontes-receita-metricas-fct-historia-caprem-metricas-e-fct-historia-saude-metricas.md` (UPDATE)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (UPDATE)

---

## Status

**Current Status**: `done`
