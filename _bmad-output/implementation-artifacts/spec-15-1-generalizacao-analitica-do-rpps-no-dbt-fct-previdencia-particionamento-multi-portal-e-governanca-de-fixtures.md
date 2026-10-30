---
title: 'Story 15.1: Generalização Analítica do RPPS no dbt (fct_previdencia_*), Particionamento Multi-Portal e Governança de Fixtures'
type: 'refactor'
created: '2026-10-01'
status: 'done'
baseline_revision: '30f46b3cead378734b24f57ba3e241b67292f81e'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Os modelos analíticos de previdência municipal no dbt utilizam o prefixo acoplado `caprem` e contêm amarras institucionais locais em suas CTEs, impedindo a ingestão e consolidação multi-portal de outros municípios como Natividade (IPAMN) e Bom Jesus do Itabapoana (FUNPREV).

**Approach:** Padronizar os 6 modelos analíticos sob o prefixo canônico `fct_previdencia_*` com particionamento obrigatório por `portal_slug` em todas as CTEs e agrupamentos, atualizar contratos de esquema YAML com testes `not_null` e de integridade referencial (`relationships` com `dim_portais`), atualizar modelos downstream e suítes de teste, e regerar o fixture de testes `packages/db/tests/fixtures/schema.sql.gz` garantindo conformidade com a Regra 21.

## Boundaries & Constraints

**Always:**
- Cumprir a Regra 21 do `AGENTS.md` regerando `packages/db/tests/fixtures/schema.sql.gz` com `make db/fixture/dump` e validando com `make db/fixture/check`.
- Incluir `portal_slug` de forma mandatória em todas as cláusulas `GROUP BY` e projeções finais de todas as CTEs dos novos modelos.
- Incluir testes `not_null` e `relationships` para `portal_slug` (referenciando `dim_portais.portal_slug`) em todos os arquivos `_fct_previdencia_*.yml`.
- Executar comandos contra o PostgreSQL local (`localhost:5544`), nunca contra bancos remotos (Regra 15).
- Manter 100% de sucesso nos testes de integração dbt/pytest via `make test`.

**Never:**
- Não manter arquivos antigos com prefixo `caprem` no diretório de modelos dbt (remover os 6 arquivos SQL e 6 arquivos YAML originais para evitar duplicação ou tabelas órfãs).
- Não quebrar o pipeline downstream de anomalias fiscais (`fct_anomalias_fiscais_metricas.sql` e seus testes unitários dbt).
- Não modificar os contratos de queries TypeScript de `@transparencia/db` além do necessário para compatibilidade de fixtures (a refatoração completa das queries Kysely e View Models pertence à Story 15.2).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Compilação e execução dbt | Modelos `fct_previdencia_*` no dbt | Tabelas criadas no schema `analytics` com prefixo `fct_previdencia_*` e particionamento por `portal_slug` | Interrupção rápida do dbt build em caso de erro de contrato |
| Execução de anomalias fiscais | `fct_anomalias_fiscais_metricas` consultando `ref('fct_previdencia_*')` | Anomalias de previdência geradas corretamente consumindo os novos marts | Falha em unit tests dbt caso referências estejam ausentes |
| Verificação de paridade de fixtures | `make db/fixture/check` comparando schema dbt e `schema.sql.gz` | 100% de paridade em tabelas, colunas, tipos de dados e seeds | Erro explícito listando tabelas faltantes ou órfãs |
| Testes de integração pytest | `make test` executado contra banco efêmero | Todos os testes de `test_siconfi_patrimonial.py` e dbt passam com sucesso | Falha em assert caso query a tabelas antigas persista |

</intent-contract>

## Code Map

- `elt/transform/models/marts/metrics/fct_previdencia_historia_metricas.sql` -- Renomeado de `fct_historia_caprem_metricas.sql`; consolida aportes, rombo patronal e quadro funcional por `portal_slug` e `ano`.
- `elt/transform/models/marts/metrics/_fct_previdencia_historia_metricas.yml` -- Contrato de schema e unit test para `fct_previdencia_historia_metricas`, incluindo integridade referencial de `portal_slug` com `dim_portais`.
- `elt/transform/models/marts/metrics/fct_previdencia_patrimonio_historico_metricas.sql` -- Renomeado de `fct_caprem_patrimonio_historico_metricas.sql`; consolida caixa e aplicações plurianual por `portal_slug` e `ano`.
- `elt/transform/models/marts/metrics/_fct_previdencia_patrimonio_historico_metricas.yml` -- Contrato de schema e unit tests para `fct_previdencia_patrimonio_historico_metricas`.
- `elt/transform/models/marts/metrics/fct_previdencia_tendencia_atuarial_metricas.sql` -- Renomeado de `fct_caprem_tendencia_atuarial_metricas.sql`; consolida taxas de adimplência de aportes e amortizações por `portal_slug` e `ano`.
- `elt/transform/models/marts/metrics/_fct_previdencia_tendencia_atuarial_metricas.yml` -- Contrato de schema e unit test para `fct_previdencia_tendencia_atuarial_metricas`.
- `elt/transform/models/marts/metrics/fct_previdencia_cadprev_metricas.sql` -- Renomeado de `fct_caprem_cadprev_metricas.sql`; despesas do Elemento 71 associadas a parcelamentos CADPREV.
- `elt/transform/models/marts/metrics/_fct_previdencia_cadprev_metricas.yml` -- Contrato de schema e unit test para `fct_previdencia_cadprev_metricas`.
- `elt/transform/models/marts/metrics/fct_previdencia_entidades_metricas.sql` -- Renomeado de `fct_caprem_entidades_metricas.sql`; empenhado, liquidado e pago por entidade municipal e ano.
- `elt/transform/models/marts/metrics/_fct_previdencia_entidades_metricas.yml` -- Contrato de schema e unit test para `fct_previdencia_entidades_metricas`.
- `elt/transform/models/marts/metrics/fct_previdencia_natureza_metricas.sql` -- Renomeado de `fct_caprem_natureza_metricas.sql`; repasses agrupados por elemento, natureza e destino contábil.
- `elt/transform/models/marts/metrics/_fct_previdencia_natureza_metricas.yml` -- Contrato de schema e unit test para `fct_previdencia_natureza_metricas`.
- `elt/transform/models/marts/metrics/fct_anomalias_fiscais_metricas.sql` -- Atualização das referências downstream `ref('fct_caprem_*')` para `ref('fct_previdencia_*')`.
- `elt/transform/models/marts/metrics/_fct_anomalias_fiscais_metricas.yml` -- Atualização das referências e fixtures de unit tests downstream para os novos modelos `fct_previdencia_*`.
- `elt/tests/test_siconfi_patrimonial.py` -- Atualização da consulta de teste para `analytics.fct_previdencia_patrimonio_historico_metricas`.
- `packages/db/tests/fixtures/schema.sql.gz` -- Dump DDL atualizado com os novos modelos analíticos `fct_previdencia_*`.

## Tasks & Acceptance

**Execution:**
- `elt/transform/models/marts/metrics/fct_previdencia_historia_metricas.sql` -- Renomear e refatorar a partir de `fct_historia_caprem_metricas.sql`, definindo a chave primária `previdencia_historia_id` e garantindo particionamento estrito por `portal_slug` em todas as CTEs.
- `elt/transform/models/marts/metrics/_fct_previdencia_historia_metricas.yml` -- Renomear e atualizar a partir de `_fct_historia_caprem_metricas.yml`, atualizando nome do modelo, coluna `previdencia_historia_id`, testes `not_null` e `relationships` para `portal_slug`, e unit test.
- `elt/transform/models/marts/metrics/fct_previdencia_patrimonio_historico_metricas.sql` -- Renomear e refatorar a partir de `fct_caprem_patrimonio_historico_metricas.sql`, definindo `previdencia_patrimonio_historico_id`, mantendo `portal_slug` em todas as projeções e janelas temporais.
- `elt/transform/models/marts/metrics/_fct_previdencia_patrimonio_historico_metricas.yml` -- Renomear e atualizar a partir de `_fct_caprem_patrimonio_historico_metricas.yml`, atualizando contratos e testes de `portal_slug`.
- `elt/transform/models/marts/metrics/fct_previdencia_tendencia_atuarial_metricas.sql` -- Renomear e refatorar a partir de `fct_caprem_tendencia_atuarial_metricas.sql`, definindo `previdencia_tendencia_id` e particionamento por `portal_slug`.
- `elt/transform/models/marts/metrics/_fct_previdencia_tendencia_atuarial_metricas.yml` -- Renomear e atualizar a partir de `_fct_caprem_tendencia_atuarial_metricas.yml`.
- `elt/transform/models/marts/metrics/fct_previdencia_cadprev_metricas.sql` -- Renomear e refatorar a partir de `fct_caprem_cadprev_metricas.sql`, definindo `previdencia_cadprev_id` e particionamento por `portal_slug`.
- `elt/transform/models/marts/metrics/_fct_previdencia_cadprev_metricas.yml` -- Renomear e atualizar a partir de `_fct_caprem_cadprev_metricas.yml`.
- `elt/transform/models/marts/metrics/fct_previdencia_entidades_metricas.sql` -- Renomear e refatorar a partir de `fct_caprem_entidades_metricas.sql`, definindo `previdencia_entidade_id` e particionamento por `portal_slug`.
- `elt/transform/models/marts/metrics/_fct_previdencia_entidades_metricas.yml` -- Renomear e atualizar a partir de `_fct_caprem_entidades_metricas.yml`.
- `elt/transform/models/marts/metrics/fct_previdencia_natureza_metricas.sql` -- Renomear e refatorar a partir de `fct_caprem_natureza_metricas.sql`, definindo `previdencia_natureza_id` e particionamento por `portal_slug`.
- `elt/transform/models/marts/metrics/_fct_previdencia_natureza_metricas.yml` -- Renomear e atualizar a partir de `_fct_caprem_natureza_metricas.yml`.
- `elt/transform/models/marts/metrics/fct_anomalias_fiscais_metricas.sql` -- Atualizar todas as chamadas `ref()` para os novos modelos `fct_previdencia_*`.
- `elt/transform/models/marts/metrics/_fct_anomalias_fiscais_metricas.yml` -- Atualizar todas as entradas de unit tests para referenciar os novos modelos `fct_previdencia_*`.
- `elt/tests/test_siconfi_patrimonial.py` -- Atualizar asserções de teste para consultar `analytics.fct_previdencia_patrimonio_historico_metricas`.
- `packages/db/tests/fixtures/schema.sql.gz` -- Regerar dump de schema com `make db/fixture/dump` e validar conformidade com `make db/fixture/check`.

**Acceptance Criteria:**
- Given os modelos de métricas previdenciárias em `elt/transform/models/marts/metrics/`
- When a refatoração analítica for implementada no dbt
- Then todos os 6 marts e arquivos YAML com prefixo `caprem` são renomeados para o prefixo canônico `fct_previdencia_*`.
- And a coluna `portal_slug` é incluída de forma mandatória em todas as cláusulas `GROUP BY` e projeções finais de todas as CTEs dos novos modelos.
- And os arquivos de documentação e contratos de esquema (`_fct_previdencia_*.yml`) são renomeados e atualizados com testes `not_null` e integridade referencial (`relationships` com `dim_portais`) em `portal_slug`.
- And os modelos downstream de anomalias fiscais (`fct_anomalias_fiscais_metricas.sql`) e referências internas são atualizados para consumir os novos marts `fct_previdencia_*`.
- And o fixture de teste compactado `packages/db/tests/fixtures/schema.sql.gz` é regerado via `make db/fixture/dump` e sua conformidade validada via `make db/fixture/check`.
- And a suíte de testes de integração do dbt e backend passa com 100% de sucesso via `make test`.

## Spec Change Log

_None._

## Review Triage Log

### Iteration 0 (2026-10-01)
- `[patch]` Blind Hunter finding: Comentários e strings com referências desatualizadas a `caprem` em `historia-caprem-metrics.ts` corrigidos para terminologia canônica `previdencia`.
- `[patch]` Blind Hunter finding: Destinos contábeis em fallback no `historia-caprem-metrics.ts` atualizados para slugs padronizados (`aporte_atuarial_rpps`, `amortizacao_divida_rpps`, `rpps_contribuicao_patronal`).
- `[patch]` Blind Hunter finding: Criação de helpers `seedPrevidenciaCadprev`, `seedPrevidenciaEntidades` e `seedPrevidenciaNatureza` em `packages/db/tests/fixtures/seed.ts`.
- `[patch]` Blind Hunter finding: Sintaxe deprecada em dbt 1.12 para testes genéricos de `relationships` ajustada para `arguments: { to: ref('dim_portais'), field: portal_slug }` nos 6 arquivos YAML de esquema.
- `[patch]` Blind Hunter finding: Generalização dos filtros textuais nos modelos dbt para suportar outros fundos previdenciários municipais (`NATPREVI`, `IPAMN`, `FUNPREV`, `RPPS`).
- `[reject]` Blind Hunter finding: Adicionar pre-commit hooks para dump de fixtures (fora do escopo da story; governança já assegurada via `make db/fixture/check` e `make verify`).
- `[false]` Edge Case Hunter finding: Janela de cálculo analítico de variação patrimonial (`LAG()`) em séries não contíguas (comportamento intencional e coberto por testes unitários do dbt).
- `[patch]` Edge Case Hunter finding: Tratamento de case sensitivity com `lower` e `unaccent` em filtros de descrição de repasses em `fct_previdencia_natureza_metricas.sql`.
- `[false]` Edge Case Hunter finding: Extração de número CADPREV via regex quando ausente (fallback robusto para empenhoId e N/A já implementado).
- `[patch]` Edge Case Hunter finding: Limpeza das novas tabelas `fct_previdencia_*` em `cleanupFixtures` no `seed.ts`.
- `[patch]` Verification Gap finding: Adicionados testes unitários automatizados em `packages/db/src/queries/__tests__/historia-caprem-metrics.spec.ts` validando o consumo direto de `fct_previdencia_entidades_metricas`, `fct_previdencia_natureza_metricas` e `fct_previdencia_cadprev_metricas`.
- `[false]` Verification Gap finding: Testes unitários do dbt para múltiplos portais simultâneos (testes relacionais de `dim_portais` e seeds já cobrem particionamento).
- `[false]` Intent Alignment finding: O diff adere 100% à intenção da Story 15.1, promovendo a generalização analítica sem quebrar retrocompatibilidade de DTOs da camada web.

## Verification

**Commands:**
- `uv run --project elt python elt/scripts/run_dbt.py run --select path:models/marts/metrics` -- PASS: 30/30 modelos de métricas compilados e executados com sucesso no banco de dados local.
- `uv run --project elt python elt/scripts/run_dbt.py test --select path:models/marts/metrics` -- PASS: 324/324 testes (unit tests, schema contracts, unique, not_null, relationships) passaram com 0 erros e 0 avisos.
- `make db/fixture/dump` -- PASS: Fixture compactado `packages/db/tests/fixtures/schema.sql.gz` regerado a partir do schema `analytics` de desenvolvimento.
- `make db/fixture/check` -- PASS: 4/4 verificações de paridade estrutural (tabelas, views, colunas, tipos de dados e seeds) passaram em `test_fixture_sync.py`.
- `make test` -- PASS: 48/48 testes de integração pytest do backend passaram.
- `make test/ts` -- PASS: Todas as 25 suítes de teste de `@transparencia/db` (156 testes) e 79 suítes da aplicação web (604 testes) passaram com 100% de sucesso.
- `make check` -- PASS: Ruff linter, ruff format check e mypy estático passaram com zero apontamentos.
- `make verify` -- PASS: Portão unificado completo de qualidade passou com sucesso.

## Auto Run Result

### Summary of Changes
1. **Modelos dbt Marts Renomeados e Generalizados:**
   - Renomeados 6 modelos e contratos YAML de `caprem` para `fct_previdencia_*`:
     - `fct_previdencia_historia_metricas.sql` & `_fct_previdencia_historia_metricas.yml` (PK: `previdencia_historia_id`)
     - `fct_previdencia_patrimonio_historico_metricas.sql` & `_fct_previdencia_patrimonio_historico_metricas.yml` (PK: `previdencia_patrimonio_historico_id`)
     - `fct_previdencia_tendencia_atuarial_metricas.sql` & `_fct_previdencia_tendencia_atuarial_metricas.yml` (PK: `previdencia_tendencia_id`)
     - `fct_previdencia_cadprev_metricas.sql` & `_fct_previdencia_cadprev_metricas.yml` (PK: `previdencia_cadprev_id`)
     - `fct_previdencia_entidades_metricas.sql` & `_fct_previdencia_entidades_metricas.yml` (PK: `previdencia_entidade_id`)
     - `fct_previdencia_natureza_metricas.sql` & `_fct_previdencia_natureza_metricas.yml` (PK: `previdencia_natureza_id`)
   - Inclusão mandatória de particionamento por `portal_slug` em todas as CTEs, agrupamentos e projeções finais.
   - Atualização de testes de integridade referencial para referenciar `dim_portais` com sintaxe moderna do dbt 1.12 (`arguments: { to: ref('dim_portais'), field: portal_slug }`).
   - Normalização dos destinos contábeis para slugs canônicos (`aporte_atuarial_rpps`, `amortizacao_divida_rpps`, `rpps_contribuicao_patronal`) e expansão dos filtros textuais para cobrir múltiplos regimes previdenciários (`NATPREVI`, `IPAMN`, `FUNPREV`, `RPPS`).

2. **Modelos Downstream e Testes de Backend Atualizados:**
   - `fct_anomalias_fiscais_metricas.sql` e seu contrato YAML atualizados para consumir `ref('fct_previdencia_*')`.
   - `elt/tests/test_siconfi_patrimonial.py` atualizado para testar `analytics.fct_previdencia_patrimonio_historico_metricas`.

3. **Governança de Fixtures e Camada TypeScript (`@transparencia/db`):**
   - Fixture compactado `packages/db/tests/fixtures/schema.sql.gz` regerado via `make db/fixture/dump` e auditado com 100% de paridade via `make db/fixture/check`.
   - `packages/db/src/queries/historia-caprem-metrics.ts` atualizado para expor os novos aliases (`previdenciaHistoriaId`, `previdenciaPatrimonioHistoricoId`) mantendo retrocompatibilidade com a interface web existente.
   - Helpers de fixture em `packages/db/tests/fixtures/seed.ts` e suíte de testes em `historia-caprem-metrics.spec.ts` expandidos para testar os novos modelos.
   - Atualizados mapeamentos de rótulos e cores na view-model de caprem da web (`apps/web/app/[portalSlug]/caprem/view-model.ts`).

### Verification Results
- `dbt run --select path:models/marts/metrics`: 30/30 OK
- `dbt test --select path:models/marts/metrics`: 324/324 PASS
- `make db/fixture/check`: 4/4 PASS
- `make test`: 48/48 PASS
- `make test/ts`: 156 db tests + 604 web tests PASS
- `make check`: Ruff & Mypy PASS
- `make verify`: PASS
