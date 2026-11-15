---
baseline_commit: d4df903304f251b9d4dd8b0083c07a53e43ade3b
---

# Story 6.5: Otimização do Data Loader loadDespesasData, Leitores Fiscais Atômicos e Desativação do Bloco de Gastos Locais

**Status:** done  
**Epic:** Epic 6: Reformulação Fiscal da Homepage e Redesenho da Página de Despesas Detalhadas  

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a web developer / municipal auditor,  
I want atomic metric readers in `@transparencia/db`, a consolidated high-performance data loader `loadDespesasData`, and the formal expunging/deprecation of legacy unverified metrics (such as the "Gastos Locais" and "Concentração de Fornecedores" blocks and orphan UI charts),  
so that the `/despesas` route executes pre-aggregated, high-performance queries responding in under 10ms with zero client/presentation manual math, while leaving no dead code, orphan charts, or unindexed table scans behind.

## Acceptance Criteria

### 1. Consolidação e Otimização do Data Loader `loadDespesasData`
1. **Quatro Leitores Paralelos Máximos:** O data loader em `apps/web/app/[portalSlug]/despesas/loader.ts` executa em paralelo via `Promise.all` no máximo 4 leitores atômicos essenciais:
   - `getAnaliseDespesasMetrics(tenantSlug, selectedYear, empresaIds)`: Fornece os 4 KPIs macro do ano (`empenhado`, `liquidado`, `pago`, taxas de quitação e liquidação).
   - `getRadarGastosSensiveisMetrics(tenantSlug, selectedYear, empresaIds)`: Fornece os 5 itens sensíveis com comparativo interanual (YoY), tendência e dívida real acumulada (`valorLiquidadoPendente`, `dividaRealAcumulada`, `dividaRestosAcumulada`).
   - `getPosicaoFiscalDetalhesMetrics(tenantSlug, selectedYear, empresaIds)`: Fornece o SSOT de Restos a Pagar (`restosPendentesTotal`, `totalCredoresAdmAtual`, série histórica por ano).
   - `getRestosAPagarResumoMetrics(tenantSlug, selectedYear, empresaIds)`: Fornece os top fornecedores com detalhamento bipartido (`liquidado` vs `empenhadoALiquidar`) e o ano da dívida mais antiga.
2. **Eliminação de Scans em Memória e Agregação SQL Kysely:** O leitor `getRestosAPagarResumoMetrics` em `packages/db/src/queries/despesas-metrics.ts` não deve baixar todos os registros não-agregados de `fct_despesas` para memória JavaScript. A consulta aos top fornecedores deve executar agregação SQL pura com `groupBy(['fornecedor_nome'])`, `orderBy` por valor pendente descrescente e `limit(5)`.

### 2. Desativação e Expurgo de Blocos e Componentes Legados/Órfãos
3. **Expurgo de Componentes UI Órfãos:** Remover componentes não utilizados no frontend:
   - `apps/web/components/donut-gastos-locais.tsx` (Remover arquivo - substituído pelo Radar de Gastos Sensíveis).
   - `apps/web/components/unidades-gastos-chart.tsx` (Remover arquivo - não utilizado).
   - `apps/web/components/funnel-waterfall.tsx` (Remover arquivo - órfão, sem importações).
4. **Limpeza de Leitores Legados em `@transparencia/db`:**
   - Em `packages/db/src/queries/despesas-metrics.ts`, marcar como `@deprecated` ou remover funções não mais utilizadas pelo portal (`getImpactoGastosLocaisMetrics`, `getConcentracaoFornecedoresMetrics`).
   - Atualizar a suíte de testes unitários `packages/db/src/queries/__tests__/despesas-metrics.spec.ts` para testar apenas os leitores ativos e suportados (`getResumoDiariasMetrics`, `getRadarGastosSensiveisMetrics`, `getRestosAPagarResumoMetrics`, `getTopFornecedoresExecucaoMetrics`, `getDespesasPorFuncaoMetrics`).

### 3. Conformidade com Diretrizes do Repositório (`AGENTS.md`)
5. **Programação Funcional e Imutabilidade (Regra 2):** Toda transformação de dados em `packages/db` deve utilizar métodos imutáveis (`.map`, `.reduce`, `.filter`, `Promise.all`), sem loops imperativos `for..of` ou mutação de variáveis externas.
6. **Nomenclatura Semântica Clara (Regra 9):** Proibido o uso de variáveis abreviadas ou opacas. Todos os DTOs e variáveis devem ser autoexplicativos (`valorTotalPendente`, `valorLiquidadoPendente`, `percentualPago`).
7. **Sem Duplicação de Sanitização (Regra 14):** Confiar nas colunas pré-sanitizadas das marts dbt (`portal_slug`, `fornecedor_nome`, `categoria_gasto_sensivel`), evitando chamadas redundantes a `unaccent` ou `trim` defensivo em runtime TS.

### 4. Validação, Tipagem & Testes
8. **Cobertura de Testes e Integridade de Tipagem:**
   - Testes unitários do DB (`packages/db/src/queries/__tests__/despesas-metrics.spec.ts`) passam com 100% de sucesso.
   - Testes de frontend (`apps/web/app/[portalSlug]/despesas/page.spec.tsx`, `view-model.spec.ts`) passam sem regressões.
   - Execução de `pnpm test` e `pnpm build` passa com 0 erros de tipagem TypeScript em todos os workspaces (`@transparencia/db`, `@transparencia/ui`, `web`).

---

## Tasks / Subtasks

- [x] [Task 1] Otimização do leitor `getRestosAPagarResumoMetrics` em `@transparencia/db` (AC: 1, 2, 5, 6, 7)
  - [x] Refatorar a query de top fornecedores em `packages/db/src/queries/despesas-metrics.ts` para usar agregação SQL nativa (`groupBy`, `sum`, `orderBy`, `limit(5)`) em vez de baixar todas as linhas de `fct_despesas`.
  - [x] Garantir tipagem imutável e retornos funcionais sem loops mutáveis.
- [x] [Task 2] Limpeza de leitores legados e expurgo de componentes órfãos (AC: 3, 4)
  - [x] Remover `apps/web/components/donut-gastos-locais.tsx`.
  - [x] Remover `apps/web/components/unidades-gastos-chart.tsx`.
  - [x] Remover `apps/web/components/funnel-waterfall.tsx`.
  - [x] Marcar ou remover `getImpactoGastosLocaisMetrics` e `getConcentracaoFornecedoresMetrics` em `packages/db/src/queries/despesas-metrics.ts`.
- [x] [Task 3] Otimização e validação de `loadDespesasData` em `apps/web` (AC: 1)
  - [x] Revisar `apps/web/app/[portalSlug]/despesas/loader.ts` garantindo paralelismo estrito em `Promise.all` com no máximo 4 leitores atômicos.
  - [x] Validar compatibilidade dos tipos com `apps/web/app/[portalSlug]/despesas/view-model.ts` e `page.tsx`.
- [x] [Task 4] Atualização da suíte de testes e verificação de build (AC: 8)
  - [x] Atualizar `packages/db/src/queries/__tests__/despesas-metrics.spec.ts` removendo testes de funções expurgadas e adicionando testes de shape para os leitores ativos otimizados.
  - [x] Executar `pnpm test` e verificar que todas as 18 suítes do frontend e 14 do banco passam.
  - [x] Executar `pnpm build` e confirmar compilação limpa sem erros de tipos.

---

## Dev Notes

### Arquitetura e Guardrails Técnicos

- **Camada de Dados / Queries (`packages/db`):** Toda inteligência e agregações residem em `@transparencia/db/src/queries/despesas-metrics.ts`. A UI apenas consome os dados tipados.
- **SQL Aggregations vs In-Memory Scans:** Anteriormente, `getRestosAPagarResumoMetrics` executava um `select *` em `fct_despesas` onde `fonte = 'restos_a_pagar'` e fazia reduce/Set/sort em JavaScript. Com a otimização, a consulta passa a usar agregação SQL nativa do PostgreSQL via Kysely:
  ```typescript
  const rows = await db
    .selectFrom("fct_despesas")
    .select((eb) => [
      "fornecedor_nome",
      eb.fn.sum<string>("empenhado").as("empenhado"),
      eb.fn.sum<string>("liquidado").as("liquidado"),
      eb.fn.sum<string>("pago").as("pago"),
    ])
    .where("portal_slug", "=", portalSlug)
    .where("fonte", "=", "restos_a_pagar")
    .where("ano", "=", year)
    .where("empresa_id", "in", empresaIds)
    .groupBy("fornecedor_nome")
    .execute();
  ```
- **Componentes Órfãos:** `donut-gastos-locais.tsx`, `unidades-gastos-chart.tsx` e `funnel-waterfall.tsx` não são referenciados por nenhuma rota pública ativa (a rota `/despesas` foi redesenhada na Story 6.4 com o `RadarGastosSensiveis` e `RestosAPagarVendorsChart`). Devem ser removidos para manter o repositório enxuto e evitar confusão para futuros agentes.

### Análise de Arquivos a Serem Modificados (UPDATE / DELETE)

1. **`packages/db/src/queries/despesas-metrics.ts` (UPDATE):**
   - *Estado Atual:* Contém funções legadas (`getImpactoGastosLocaisMetrics`, `getConcentracaoFornecedoresMetrics`) e uma agregação in-memory lenta para top fornecedores de restos a pagar.
   - *Alterações:* Otimizar `getRestosAPagarResumoMetrics` com agregação nativa; desativar/remover queries legadas não utilizadas; garantir conformidade funcional (Regra 2).
   - *Preservar:* Assinatura e campos retornados para `RadarGastosSensiveisDTO`, `RestosAPagarResumoMetricsDTO` e `getDespesasPorFuncaoMetrics`.
2. **`apps/web/app/[portalSlug]/despesas/loader.ts` (UPDATE):**
   - *Estado Atual:* Executa 4 leitores paralelos em `fetchRawDespesasData`.
   - *Alterações:* Garantir que a agregação e integração com `getPosicaoFiscalDetalhesMetrics` e `getRestosAPagarResumoMetrics` ocorra de forma atômica e eficiente.
   - *Preservar:* Estrutura de contexto (`parseDespesasContext`) e cache (`createCachedDataLoader`).
3. **`apps/web/components/donut-gastos-locais.tsx` (DELETE):**
   - *Estado Atual:* Componente órfão sem uso.
   - *Alterações:* Deletar arquivo.
4. **`apps/web/components/unidades-gastos-chart.tsx` (DELETE):**
   - *Estado Atual:* Componente órfão sem uso.
   - *Alterações:* Deletar arquivo.
5. **`apps/web/components/funnel-waterfall.tsx` (DELETE):**
   - *Estado Atual:* Componente órfão sem uso.
   - *Alterações:* Deletar arquivo.
6. **`packages/db/src/queries/__tests__/despesas-metrics.spec.ts` (UPDATE):**
   - *Estado Atual:* Testa funções legadas (`getImpactoGastosLocaisMetrics`, `getConcentracaoFornecedoresMetrics`).
   - *Alterações:* Substituir testes legados por testes focados nas funções ativas (`getRestosAPagarResumoMetrics`, `getRadarGastosSensiveisMetrics`, `getTopFornecedoresExecucaoMetrics`).
   - *Preservar:* Padrão de smoke tests de shape contra schema mock/real.

### File List

- `packages/db/src/queries/despesas-metrics.ts` (UPDATE)
- `apps/web/app/[portalSlug]/despesas/loader.ts` (UPDATE)
- `apps/web/components/donut-gastos-locais.tsx` (DELETE)
- `apps/web/components/unidades-gastos-chart.tsx` (DELETE)
- `apps/web/components/funnel-waterfall.tsx` (DELETE)
- `packages/db/src/queries/__tests__/despesas-metrics.spec.ts` (UPDATE)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (UPDATE)
- `_bmad-output/implementation-artifacts/6-5-otimizacao-do-data-loader-loaddespesasdata-e-desativacao-do-bloco-de-gastos-locais.md` (NEW)

---

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash

### Debug Log References

- Análise de chamadas ativas em `apps/web/app/[portalSlug]/despesas/loader.ts`
- Verificação de ausência de referências a `donut-gastos-locais`, `unidades-gastos-chart` e `funnel-waterfall`
- Validação da suíte de testes de paridade (`pnpm test`) e compilação do Next.js / Turbopack (`pnpm build`)

### Completion Notes List

- Otimização do leitor `getRestosAPagarResumoMetrics` em `@transparencia/db/src/queries/despesas-metrics.ts` executando queries paralelas com agregação nativa SQL no Postgres via Kysely (`Promise.all` entre resumo e agregação por fornecedor).
- Remoção definitiva dos componentes órfãos `donut-gastos-locais.tsx`, `unidades-gastos-chart.tsx` e `funnel-waterfall.tsx` de `apps/web/components`.
- Marcação como `@deprecated` das queries legadas `getImpactoGastosLocaisMetrics` e `getConcentracaoFornecedoresMetrics` em `@transparencia/db`, com refatoração para padrão funcional imutável.
- Validação e sincronização estrita do data loader `loadDespesasData` em `apps/web/app/[portalSlug]/despesas/loader.ts` executando no máximo 4 leitores paralelos.
- Atualização da suíte de testes unitários `packages/db/src/queries/__tests__/despesas-metrics.spec.ts` cobrindo todos os leitores atômicos ativos.
- 100% de sucesso em todas as suítes de testes (`pnpm test` com 14/14 suites do DB e 18/18 suites da Web) e compilação limpa em Next.js/Turbopack (`pnpm build`).

---

## Change Log

- **2026-08-27:** Implementação integral da Story 6.5 com otimização das consultas Kysely de restos a pagar, expurgo de componentes órfãos e adequação das suítes de testes.
