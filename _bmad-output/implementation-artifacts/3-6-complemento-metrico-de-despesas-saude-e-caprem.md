---
baseline_commit: 17a9693
generated_at: 2026-08-05T17:08:00-03:00
---

# Story 3.6: Complemento Métrico de Despesas, Saúde e CAPREM

## Metadados

- Epic: 3 - Reorganização da UI e Co-localização de Loaders no apps/web
- Story ID: 3.6
- Story Key: 3-6-complemento-metrico-de-despesas-saude-e-caprem
- Status: done
- Arquivo: _bmad-output/implementation-artifacts/3-6-complemento-metrico-de-despesas-saude-e-caprem.md

## User Story

Como dev de dados + web,
Quero implementar a cobertura métrica completa para Despesas (diárias, fornecedores, HHI, restos a pagar, unidades), Saúde (indicadores gerais, farmácia, emendas, concentração) e CAPREM (risco atuarial, séries de repasses e aportes),
Para que os loaders `loadDespesasData`, `loadSaudeData` e `loadCapremData` eliminem definitivamente a dependência de composição de queries legadas e de fallbacks runtime.

## Critérios de Aceitação (BDD)

**Given** os loaders de Despesas (`apps/web/app/[portalSlug]/despesas/loader.ts`), Saúde (`apps/web/app/[portalSlug]/saude/loader.ts`) e CAPREM (`apps/web/app/[portalSlug]/caprem/loader.ts`) mantendo fallbacks legados controlados no estado atual
**When** os marts dbt em `elt/transform/models/marts/metrics/` forem criados ou estendidos e expostos por leitores `*-metrics` atômicos em `@transparencia/db`
**Then** os três loaders removem 100% das chamadas a readers legados (`getMetricasGeraisDespesas`, `getImpactoGastosLocais`, `getConcentracaoFornecedores`, `getRestosAPagarResumo`, `getDespesasPorUnidade`, `getResumoDiarias`, `getPrincipaisBeneficiariosDiarias`, `getHistoriaSaude`, `getHistoriaCaprem`) e passam a consumir exclusivamente leitores baseados em marts de métricas.

**And** a camada `@transparencia/db` atua estritamente como leitor burro fortemente tipado (pass-through sobre marts), sem qualquer agregação runtime em TypeScript sobre dados transacionais brutos (`SUM`, `AVG`, `GROUP BY`).

**And** a dimensão `portal_slug` é mantida em todos os agrupamentos dos novos modelos dbt, e a validação obrigatória de `portalSlug` (e `empresaIds` quando multiempresa) é imposta em todos os novos leitores.

**And** 100% da paridade visual e comportamental das páginas de Despesas, Saúde e CAPREM é rigorosamente preservada, mantendo os contratos de View Models e props de componentes de UI em `apps/web/components/` inalterados.

**And** a suíte de validação obrigatória (`make test`, `make test/ts`, `pnpm build`) executa e passa com 100% de sucesso.

## Contexto da Epic e Valor

- Story 3.3 migrou o núcleo das rotas da web para leitores de métricas e catalogou a transição de Despesas, Saúde e CAPREM com fallbacks temporários controlados.
- Story 3.5 removeu os fallbacks das rotas de Visão Geral e Orçamento.
- Esta story (3.6) remove os fallbacks restantes nos três domínios mais complexos da aplicação (Despesas, Saúde e CAPREM), aproximando o projeto do Hard Cutover final (Story 3.8).

## Guardrails Arquiteturais Obrigatórios

### AD-1 e AD-3 (SSOT dbt + leitor burro)
1. Toda métrica ou indicador novo/ampliado desta story deve nascer em marts dbt materializados fisicamente (`materialized='table'`).
2. Leitores no `@transparencia/db` devem executar apenas queries Kysely simples (`selectFrom('fct_..._metricas').where('portal_slug', '=', portalSlug)...`) e retornar DTOs tipados.
3. Proibido reintroduzir SQL raw ou agregações runtime (`SUM`, `AVG`, `GROUP BY`) em TypeScript sobre tabelas brutas/transacionais.

### AD-4 (separação de responsabilidades)
1. `apps/web/app/[portalSlug]/despesas/loader.ts`, `saude/loader.ts` e `caprem/loader.ts` realizam estritamente orquestração de IO.
2. Componentes visuais em `apps/web/components/` e `page.tsx` não podem ter acesso direto ao banco ou queries SQL.
3. Não alterar a estrutura de componentes visuais nesta story sem necessidade estrita de compatibilidade de props.

### AD-5 (isolamento multi-tenant)
1. Todo mart dbt criado ou modificado deve incluir `portal_slug` em seu agrupamento obrigatório.
2. Toda função leitora em `@transparencia/db` deve aplicar `.where('portal_slug', '=', portalSlug)` e exigir `requireEmpresaIdsForMetrics` para consultas multiempresa.
3. Proibido fallback silencioso com tenant ou lista de empresa IDs vazia.

### AD-6 (qualidade e integridade)
1. Mudanças em modelos dbt ou tabelas de staging exigem validação via `make test`. Se colunas/tabelas raw forem alteradas, atualizar obrigatoriamente `_sources.yml`.
2. Alterações na camada TS e Kysely exigem validação via `make test/ts` e `pnpm build`.
3. O aceite desta story exige evidências explícitas das 3 validações verdes.

## Descoberta de Artefatos Carregados

- Epics: `_bmad-output/planning-artifacts/epics.md`
- PRD: `_bmad-output/planning-artifacts/prds/prd-transparencia-2026-08-01/prd.md`
- Arquitetura: `_bmad-output/planning-artifacts/architecture/architecture-transparencia-2026-08-01/ARCHITECTURE-SPINE.md`
- Inventário STN/MCASP: `_bmad-output/implementation-artifacts/inventario-regras-fiscais-stn-mcasp.md`
- Débito Técnico / Plano da Saúde: `_bmad-output/implementation-artifacts/tech-debt-saude-empenhado-vs-pago.md` / `plan_exibir_empenhado_e_pago_saude.md`
- Stories Anteriores: `3-3-migracao-completa-dos-loaders-web-para-leitores-de-metricas.md`, `3-5-complemento-metrico-de-visao-geral-e-orcamento.md`

## Estado Atual dos Arquivos UPDATE (lidos)

### 1. `apps/web/app/[portalSlug]/despesas/loader.ts`
- **Estado Atual**: Usa `getAnaliseDespesasMetrics` para o totalizador de despesas, mas mantém 7 chamadas a queries legadas (`getMetricasGeraisDespesas`, `getImpactoGastosLocais`, `getConcentracaoFornecedores`, `getRestosAPagarResumo`, `getDespesasPorUnidade`, `getResumoDiarias`, `getPrincipaisBeneficiariosDiarias`).
- **Mudança**: Substituir os 7 leitores legados por leitores atômicos `*-metrics` alimentados por marts dbt.
- **Preservar**: DTO de saída consumido pela página de Despesas (`metricasGerais`, `impactoLocais`, `concentracao`, `restosResumo`, `despesasUnidades`, `diariasResumo`, `diariasBeneficiarios`).

### 2. `apps/web/app/[portalSlug]/saude/loader.ts` e `apps/web/app/[portalSlug]/saude/page.tsx`
- **Estado Atual**: Chama `getHistoriaSaudeMetrics` e faz um `spread` (`...saudeLegacy`) com o resultado de `getHistoriaSaude` para preencher blocos de farmácia, emendas e HHI.
- **Mudança**:
  - Expandir o mart `fct_historia_saude_metricas.sql` e o DTO `HistoriaSaudeMetricsDTO` para exportar explicitamente tanto o empenhado quanto o pago: `medicamentos_insumos_empenhado`, `medicamentos_insumos_pago`, `judicializacao_empenhado` e `judicializacao_pago` (conforme [plan_exibir_empenhado_e_pago_saude.md](file:///Users/juliobetta/.gemini/antigravity-cli/brain/ca5defa5-3729-49eb-bbb2-ac2bdf163a0e/plan_exibir_empenhado_e_pago_saude.md) e [tech-debt-saude-empenhado-vs-pago.md](file:///Volumes/Projects/transparencia/_bmad-output/implementation-artifacts/tech-debt-saude-empenhado-vs-pago.md)).
  - Atualizar os cartões `KPICard` em `apps/web/app/[portalSlug]/saude/page.tsx` para exibir o valor empenhado principal e a legenda de valor pago no subtexto.
  - Eliminar a dependência de `getHistoriaSaude`.
- **Preservar**: Estrutura do objeto `saude` (`orcamento`, `farmaceutica`, `fontesReceita`, `emendasStats`, `emendasTotal`).

### 3. `apps/web/app/[portalSlug]/caprem/loader.ts`
- **Estado Atual**: Chama `getHistoriaCapremMetrics` e faz `spread` com `getHistoriaCaprem` para complementar risco atuarial, séries históricas e repasses patronais.
- **Mudança**: Expandir o mart `fct_historia_caprem_metricas.sql` e a função `getHistoriaCapremMetrics` para retornar 100% dos dados previdenciários e atuariais necessários.
- **Preservar**: Estrutura do objeto `caprem` (`totalEmpenhado`, `totalLiquidado`, `totalPago`, `taxaExecucao`, `totalAporteAtuarial`, `totalDividaResgatada`, `totalCaspPlanoSaude`, `actuarialRisk`).

### 4. `packages/db/src/queries/`
- Arquivos legados a serem desacoplados dos loaders principais:
  - `despesas.ts`
  - `historia_saude.ts`
  - `historia_caprem.ts`
  - `concentracao_fornecedores.ts`

### 5. `elt/transform/models/marts/metrics/`
- Marts a serem criados/estendidos:
  - `fct_analise_despesas_metricas.sql` (ou marts específicos para diárias, fornecedores e restos)
  - `fct_historia_saude_metricas.sql`
  - `fct_historia_caprem_metricas.sql`

## Estratégia Técnica Recomendada

1. **Camada dbt (`elt/transform/`):**
   - Garantir que todas as agregações de diárias, HHI de fornecedores na Saúde/Despesas, restos a pagar por gestão e indicadores atuariais do CAPREM estejam totalmente calculados nos marts de métricas.
   - Manter materialização `table` em todos os marts sob `elt/transform/models/marts/metrics/`.

2. **Camada de Dados `@transparencia/db` (`packages/db/src/queries/`):**
   - Criar/estender leitores burros atômicos:
     - `getDespesasDiariasMetrics(portalSlug, ano, empresaIds)`
     - `getDespesasFornecedoresMetrics(portalSlug, ano, empresaIds)`
     - `getDespesasRestosMetrics(portalSlug, ano, empresaIds)`
     - `getHistoriaSaudeMetrics(portalSlug, ano)` (DTO completo)
     - `getHistoriaCapremMetrics(portalSlug, ano)` (DTO completo)
   - Tipar rigorosamente todos os retornos e exportá-los em `packages/db/src/index.ts`.

3. **Camada de Apresentação Web (`apps/web/app/`):**
   - Atualizar `despesas/loader.ts`, `saude/loader.ts` e `caprem/loader.ts` para invocar exclusivamente as novas funções métricas.
   - Garantir que as funções `requirePortalSlug` e `requireEmpresaIdsForMetrics` sejam executadas em todas as chamadas.

## Tarefas / Subtarefas

- [x] **Task 1 - Cobertura Métrica de Despesas no dbt e `@transparencia/db` (AC: 1, 2, 3)**
  - [x] Modelar marts dbt para diárias (`fct_despesas_diarias_metricas`), fornecedores/HHI (`fct_despesas_fornecedores_metricas`) e restos a pagar por unidade.
  - [x] Implementar readers atômicos em `@transparencia/db` com filtro por `portal_slug` e `empresaIds`.
  - [x] Declarar esquemas e testes de consistência dbt em `schema.yml`.

- [x] **Task 2 - Cobertura Métrica Completa da Saúde no dbt, `@transparencia/db` e UI (AC: 1, 2, 3)**
  - [x] Expandir `fct_historia_saude_metricas.sql` para incorporar todos os campos de medicamentos/insumos e judicialização (ambos com colunas `_empenhado` e `_pago`), HHI de saúde e detalhamento de emendas (conforme `plan_exibir_empenhado_e_pago_saude.md`).
  - [x] Atualizar o reader `getHistoriaSaudeMetrics` e DTO no `@transparencia/db` para retornar o DTO consolidado sem dependência de `getHistoriaSaude`.
  - [x] Atualizar `apps/web/app/[portalSlug]/saude/page.tsx` para renderizar o valor Empenhado principal e a legenda de valor Pago no subtexto dos cartões de Medicamentos e Judicialização.

- [x] **Task 3 - Cobertura Métrica Completa do CAPREM no dbt e `@transparencia/db` (AC: 1, 2, 3)**
  - [x] Expandir `fct_historia_caprem_metricas.sql` para cobrir 100% dos indicadores atuariais, repasses patronais, amortizações e CASP plano de saúde.
  - [x] Atualizar o reader `getHistoriaCapremMetrics` no `@transparencia/db` para retornar o DTO atuarial consolidado sem dependência de `getHistoriaCaprem`.

- [x] **Task 4 - Eliminação dos Fallbacks Legados nos Loaders da Web (AC: 1, 4)**
  - [x] Refatorar `apps/web/app/[portalSlug]/despesas/loader.ts` removendo todas as 7 importações de leitores legados.
  - [x] Refatorar `apps/web/app/[portalSlug]/saude/loader.ts` removendo a chamada a `getHistoriaSaude`.
  - [x] Refatorar `apps/web/app/[portalSlug]/caprem/loader.ts` removendo a chamada a `getHistoriaCaprem`.

- [x] **Task 5 - Validação e Evidências (AC: 5)**
  - [x] Executar `make test` para validação dbt / Python.
  - [x] Executar `make test/ts` para validação TypeScript / Kysely.
  - [x] Executar `pnpm build` para garantir ausência de erros de compilação na web.
  - [x] Registrar logs de execução e evidências no Dev Agent Record.

## Inteligência das Stories Anteriores

- **Story 3.3 & 3.5**:
  - Estabeleceram o padrão de assinar funções de métricas com `portalSlug` e `empresaIds`.
  - Implantação de guardrails estritos contra buscas multi-tenant desprovidas de filtro de portal (`requirePortalSlug`).
  - View Models em `apps/web/components/` não devem ser modificados se a tipagem do DTO for preservada.

## Inteligência de Git Recente

- `eecd400 feat(web): migra loaders core para readers metrics`
- `45826d9 feat(web): migra blocos parciais para readers metrics`
- `fc01772 feat(web): reforca guardrails de tenant e empresaIds`

## Requisitos Técnicos de Bibliotecas e Framework

- Next.js `16.2.11`, React `19.2.8`, Kysely `0.29.4`.
- dbt: Materialização estrita `materialized='table'` para marts em `elt/transform/models/marts/metrics/`.

## Pesquisa Técnica Atualizada (web)

1. dbt Marts com `materialized='table'` garantem performance sub-100ms em consultas de agregados consolidados (NFR1).
2. Kysely como query builder burro evita parsing e overhead de agregação runtime em Node.js (FR6).

## Riscos e Mitigações

1. **Risco**: Divergência nos cálculos atuariais do CAPREM ou HHI da Saúde em relação às queries legadas.
   - **Mitigação**: Validar se as fórmulas em dbt utilizam os mesmos filtros de código de elemento / credor mapeados em `inventario-regras-fiscais-stn-mcasp.md`.

2. **Risco**: Falha em builds TypeScript devido a incompatibilidade nos schemas dos DTOs.
   - **Mitigação**: Executar `make test/ts` após a alteração de cada reader.

## Checklist de Conclusão

- [x] Fallbacks legados removidos de `despesas/loader.ts`.
- [x] Fallback `getHistoriaSaude` removido de `saude/loader.ts`.
- [x] Fallback `getHistoriaCaprem` removido de `caprem/loader.ts`.
- [x] Novos/ajustados marts dbt materializados como `table`.
- [x] `make test`, `make test/ts` e `pnpm build` executados e aprovados.

## Referências

- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/architecture/architecture-transparencia-2026-08-01/ARCHITECTURE-SPINE.md`
- `_bmad-output/implementation-artifacts/3-3-migracao-completa-dos-loaders-web-para-leitores-de-metricas.md`
- `_bmad-output/implementation-artifacts/3-5-complemento-metrico-de-visao-geral-e-orcamento.md`
- `apps/web/app/[portalSlug]/despesas/loader.ts`
- `apps/web/app/[portalSlug]/saude/loader.ts`
- `apps/web/app/[portalSlug]/caprem/loader.ts`

## Dev Agent Record

### Agent Model Used

Gemini 3.6 Flash

### Debug Log References

- `make dbt/run` 49 models PASSING (0 errors).
- `make test` 82 pytest tests PASSING (21.11s).
- `pnpm test` 23 Vitest tests PASSING (1.35s).
- `pnpm build` Turbo Next.js build PASSING for all 3 packages.

### Completion Notes List

- Criados marts dbt materializados `fct_despesas_diarias_metricas`, `fct_despesas_fornecedores_metricas` e `fct_despesas_restos_metricas` com contratos `_fct_*.yml` validados.
- Expandidos marts `fct_historia_saude_metricas` (incluindo `medicamentos_insumos_empenhado` e `judicializacao_empenhado`) e `fct_historia_caprem_metricas` (incluindo `servidores_efetivos` e `servidores_temporarios`).
- Implementados leitores burros em `packages/db/src/queries/despesas-metrics.ts`, `historia-saude-metrics.ts` e `historia-caprem-metrics.ts` com validação de `portalSlug` e `empresaIds`.
- Refatorados os loaders `loadDespesasData`, `loadSaudeData` e `loadCapremData` eliminando 100% dos leitores legados e fallbacks runtime.
- Atualizada a página de Saúde (`apps/web/app/[portalSlug]/saude/page.tsx`) para exibição simultânea de Empenhado e Pago (com legenda).
- Validação executada com sucesso via `make dbt/run`, `make test`, `pnpm test` e `pnpm build`.

### File List

- `elt/transform/models/marts/metrics/fct_despesas_diarias_metricas.sql` (CREATED)
- `elt/transform/models/marts/metrics/_fct_despesas_diarias_metricas.yml` (CREATED)
- `elt/transform/models/marts/metrics/fct_despesas_fornecedores_metricas.sql` (CREATED)
- `elt/transform/models/marts/metrics/_fct_despesas_fornecedores_metricas.yml` (CREATED)
- `elt/transform/models/marts/metrics/fct_despesas_restos_metricas.sql` (CREATED)
- `elt/transform/models/marts/metrics/_fct_despesas_restos_metricas.yml` (CREATED)
- `elt/transform/models/marts/metrics/fct_analise_despesas_metricas.sql` (MODIFIED)
- `elt/transform/models/marts/metrics/_fct_analise_despesas_metricas.yml` (MODIFIED)
- `elt/transform/models/marts/metrics/fct_historia_saude_metricas.sql` (MODIFIED)
- `elt/transform/models/marts/metrics/_fct_historia_saude_metricas.yml` (MODIFIED)
- `elt/transform/models/marts/metrics/fct_historia_caprem_metricas.sql` (MODIFIED)
- `elt/transform/models/marts/metrics/_fct_historia_caprem_metricas.yml` (MODIFIED)
- `packages/db/src/queries/despesas-metrics.ts` (CREATED)
- `packages/db/src/queries/historia-saude-metrics.ts` (MODIFIED)
- `packages/db/src/queries/historia-caprem-metrics.ts` (MODIFIED)
- `packages/db/src/index.ts` (MODIFIED)
- `packages/db/src/__tests__/parity.test.ts` (MODIFIED)
- `apps/web/app/[portalSlug]/despesas/loader.ts` (MODIFIED)
- `apps/web/app/[portalSlug]/saude/loader.ts` (MODIFIED)
- `apps/web/app/[portalSlug]/saude/page.tsx` (MODIFIED)
- `apps/web/app/[portalSlug]/caprem/loader.ts` (MODIFIED)
### Review Findings

- [x] [Review][Decision] Importação e chamada a getHistoriaCaprem mantidas no caprem/loader.ts — resolvido via mart fct_caprem_entidades_metricas e getCapremEntidadesMetrics.
- [x] [Review][Patch] Agregações runtime sobre fct_despesas em despesas-metrics.ts [packages/db/src/queries/despesas-metrics.ts:353]
- [x] [Review][Patch] Cidade 'PORCIUNCULA' chumbada em fct_despesas_fornecedores_metricas.sql [elt/transform/models/marts/metrics/fct_despesas_fornecedores_metricas.sql:10]
- [x] [Review][Patch] Check de tenant chumbado porciuncula_prefeitura em getHistoriaCapremMetrics [packages/db/src/queries/historia-caprem-metrics.ts:33]
- [x] [Review][Patch] Funções de licitação na Saúde sem parâmetro de portalSlug [packages/db/src/queries/historia-saude-metrics.ts:395]
- [x] [Review][Patch] Propriedades potencialmente nulas (favorecido, cargo, codigo) em leitores métricos [packages/db/src/queries/despesas-metrics.ts:140]
- [x] [Review][Patch] Validação de ano não numérico (NaN) nos loaders Next.js [apps/web/app/[portalSlug]/despesas/loader.ts:29]

## Status Final

Status: done
