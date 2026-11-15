---
baseline_commit: 619844882db434d255b8a3dea8d6f5882d7b83fe
---

# Story 3.1: Desacoplamento da UI — Migração dos Componentes de Domínio para `apps/web/components/`

## Metadados

- **Epic**: 3 — Reorganização da UI e Co-localização de Loaders no `apps/web`
- **Story ID**: 3.1
- **Story Key**: `3-1-desacoplamento-da-ui-migracao-dos-componentes-de-dominio-para-apps-web-components`
- **Status**: `ready-for-dev`
- **Arquivo**: `_bmad-output/implementation-artifacts/3-1-desacoplamento-da-ui-migracao-dos-componentes-de-dominio-para-apps-web-components.md`

---

## User Story

**Como** desenvolvedor frontend,
**Quero** que os componentes específicos de domínio sejam movidos de `packages/ui` para `apps/web/components/`,
**Para que** `packages/ui` contenha exclusivamente primitivas genéricas e agnósticas do design system.

---

## Critérios de Aceitação (BDD)

**Given** componentes de domínio em `packages/ui/src/components/`  
**When** a reorganização dos pacotes é executada  
**Then** todos os componentes específicos de domínio são movidos para o diretório plano `apps/web/components/` (sem subdiretórios por domínio — diretório plano).

**And** em `packages/ui/src/components/` permanecem exclusivamente primitivas agnósticas de design system.

**And** todas as importações em `apps/web/app/**/*.tsx` são atualizadas: componentes de domínio passam a importar de `@/components/` (path alias local), e os utilitários genéricos (`fmtCurrency`, `KPICard`, etc.) continuam importando de `@transparencia/ui`.

**And** o arquivo `packages/ui/src/index.ts` remove os re-exports dos componentes de domínio migrados.

**And** `pnpm build` executa sem erros de compilação ou de tipo.

**And** `make test/ts` (`tsc --noEmit`) em `packages/ui` e `packages/db` passa 100%.

---

## Classificação Definitiva dos Componentes

### 🚚 MOVER: Domínio → `apps/web/components/` (diretório plano)

| Arquivo em `packages/ui/src/components/` | Categoria de Domínio |
|-------------------------------------------|----------------------|
| `caprem-actuarial-risk-section.tsx` | CAPREM |
| `caprem-hero-section.tsx` | CAPREM |
| `cards-secundarios-visao-geral.tsx` | Visão Geral |
| `carros-chefe-arrecadacao.tsx` | Receitas |
| `charts/bar-chart-h.tsx` | Despesas |
| `charts/caprem-entidades-donut.tsx` | CAPREM |
| `charts/departmental-payroll-chart.tsx` | Pessoal |
| `charts/distribuicao-modalidades-chart.tsx` | Licitações |
| `charts/donut-gastos-locais.tsx` | Despesas |
| `charts/folha-lrf-history-chart.tsx` | Pessoal |
| `charts/funil-execucao-horizontal.tsx` | Orçamento |
| `charts/funnel-waterfall.tsx` | Orçamento |
| `charts/gasto-por-funcao-bars.tsx` | Orçamento/Despesas |
| `charts/previsto-vs-arrecadado.tsx` | Receitas |
| `charts/proventos-distribution-chart.tsx` | Pessoal |
| `charts/restos-a-pagar-vendors-chart.tsx` | Despesas |
| `charts/saude-fontes-donut.tsx` | Saúde |
| `charts/saude-trend-chart.tsx` | Saúde |
| `charts/unidades-gastos-chart.tsx` | Despesas |
| `decimo-terceiro-card.tsx` | Pessoal |
| `emendas-card.tsx` | Receitas |
| `hero-fiscal-card.tsx` | Visão Geral |
| `kpi-grid.tsx` | Composição (contém lógica de layout específica) |
| `licitacoes-table.tsx` | Licitações |
| `pipeline-execucao.tsx` | Orçamento |
| `saude-contratacao-section.tsx` | Saúde |
| `saude-emendas-section.tsx` | Saúde |
| `saude-hero-section.tsx` | Saúde |
| `section-header.tsx` | Composição de página |

> **ATENÇÃO `kpi-grid.tsx` e `section-header.tsx`:** Embora possam parecer genéricos visualmente, são usados exclusivamente nas páginas de domínio e dependem de layouts específicos da aplicação. Devem ser migrados.

### ✅ MANTER: Primitivas Genéricas em `packages/ui/src/components/`

| Arquivo | Motivo |
|---------|--------|
| `alert-box.tsx` | Primitiva genérica |
| `badge.tsx` | Primitiva genérica |
| `dense-table.tsx` | Primitiva genérica de tabela |
| `kpi-card.tsx` | Primitiva genérica de cartão KPI |
| `multi-select.tsx` | Primitiva genérica de seleção |
| `ribbon.tsx` | Primitiva genérica de faixa |
| `sidebar.tsx` | Primitiva genérica de layout |

> **Atenção `sidebar.tsx`:** Importado por `apps/web/app/components/sidebar-wrapper.tsx` via `@transparencia/ui` — **não mover**.

---

## Contexto de Desenvolvimento (Guardrails Críticos)

### Estado Atual (O que Existe Hoje)

**`packages/ui/src/index.ts`** exporta TUDO (36 componentes + charts + utils):
```
export * from "./components/alert-box";
export * from "./components/badge";
export * from "./components/caprem-actuarial-risk-section";
... (todos os 29 componentes de domínio + 7 primitivas + charts)
export * from "./tokens";
export * from "./utils/cn";
export * from "./utils/formatters";
export * from "./utils/text";
```

**Padrão de importação atual nas páginas:**
```tsx
// Todas as páginas importam TUDO de @transparencia/ui
import {
  KPICard,           // primitiva — continua em @transparencia/ui
  SaudeHeroSection,  // domínio — será movida para @/components/
  fmtCompact,        // utilitário — continua em @transparencia/ui
} from "@transparencia/ui";
```

**Path alias `@/*` configurado em `apps/web/tsconfig.json`:**
```json
"paths": { "~/*": ["./*"] }
```
Isso significa que `~/components/saude-hero-section` resolve para `apps/web/components/saude-hero-section`.

### Estado Esperado Após a Story

**`packages/ui/src/index.ts`** exporta apenas primitivas:
```
export * from "./components/alert-box";
export * from "./components/badge";
export * from "./components/dense-table";
export * from "./components/kpi-card";
export * from "./components/multi-select";
export * from "./components/ribbon";
export * from "./components/sidebar";
export * from "./tokens";
export * from "./utils/cn";
export * from "./utils/formatters";
export * from "./utils/text";
```

**Novo `apps/web/components/` (diretório plano, sem subpastas):**
```
apps/web/components/
├── caprem-actuarial-risk-section.tsx
├── caprem-hero-section.tsx
├── cards-secundarios-visao-geral.tsx
├── carros-chefe-arrecadacao.tsx
├── decimo-terceiro-card.tsx
├── emendas-card.tsx
├── hero-fiscal-card.tsx
├── kpi-grid.tsx
├── licitacoes-table.tsx
├── pipeline-execucao.tsx
├── saude-contratacao-section.tsx
├── saude-emendas-section.tsx
├── saude-hero-section.tsx
├── section-header.tsx
├── bar-chart-h.tsx          ← flatten: sem subpasta charts/
├── caprem-entidades-donut.tsx
├── departmental-payroll-chart.tsx
├── distribuicao-modalidades-chart.tsx
├── donut-gastos-locais.tsx
├── folha-lrf-history-chart.tsx
├── funil-execucao-horizontal.tsx
├── funnel-waterfall.tsx
├── gasto-por-funcao-bars.tsx
├── previsto-vs-arrecadado.tsx
├── proventos-distribution-chart.tsx
├── restos-a-pagar-vendors-chart.tsx
├── saude-fontes-donut.tsx
├── saude-trend-chart.tsx
└── unidades-gastos-chart.tsx
```

> ⚠️ **FLATTEN obrigatório:** Os charts em `packages/ui/src/components/charts/` devem ser movidos para `apps/web/components/` **diretamente** (sem criar subpasta `charts/`). Isso é intencional para manter o diretório plano conforme arquitetura.

**Padrão de importação nas páginas após migração:**
```tsx
// Componentes de domínio → import local com path alias ~/
import { SaudeHeroSection } from "~/components/saude-hero-section";
import { BarChartH } from "~/components/bar-chart-h";

// Primitivas e utilitários → continuam em @transparencia/ui
import { KPICard, fmtCompact, fmtPercent } from "@transparencia/ui";
```

---

## Mapa Completo de Importações por Página

> Use este mapa para atualizar as importações em cada página. Cada página deve ser modificada separadamente.

### `apps/web/app/[portalSlug]/page.tsx` (Visão Geral)
**De `@transparencia/ui` → mover para `~/components/`:**
`CardsSecundariosVisaoGeral` → `~/components/cards-secundarios-visao-geral`
`HeroFiscalCard` → `~/components/hero-fiscal-card`
`PipelineExecucao` → `~/components/pipeline-execucao`

**Permanecem em `@transparencia/ui`:**
- `DenseTable`, `fmtCompact`, `fmtPercent`, `getPartialYearPeriod`, `toTitleCase`

### `apps/web/app/[portalSlug]/despesas/page.tsx`
**De `@transparencia/ui` → mover para `~/components/`:**
`BarChartH` → `~/components/bar-chart-h`
`DonutGastosLocais` → `~/components/donut-gastos-locais`
`RestosAPagarVendorsChart` → `~/components/restos-a-pagar-vendors-chart`
`UnidadesGastosChart` → `~/components/unidades-gastos-chart`
`SectionHeader` → `~/components/section-header`

**Permanecem em `@transparencia/ui`:**
- `fmtCompact`, `fmtCurrency`, `fmtPercent`, `getPartialYearPeriod`, `KPICard`, `KPIGrid`, `toTitleCase`

> ⚠️ `KPIGrid` — se o componente `KPIGrid` estiver sendo importado e usado na página de Despesas, ele deve vir de `@/components/kpi-grid` após a migração.

### `apps/web/app/[portalSlug]/receitas/page.tsx`
**De `@transparencia/ui` → mover para `~/components/`:**
`CarrosChefeArrecadacao` → `~/components/carros-chefe-arrecadacao`
`EmendasCard` → `~/components/emendas-card`
`PrevistoVsArrecadadoOrigem` → `~/components/previsto-vs-arrecadado`

**Permanecem em `@transparencia/ui`:**
- `AlertBox`, `DenseTable`, `fmtCompact`, `fmtPercent`, `getPartialYearPeriod`

### `apps/web/app/[portalSlug]/orcamento/page.tsx`
**De `@transparencia/ui` → mover para `~/components/`:**
`FunnelExecucaoHorizontal` → `~/components/funil-execucao-horizontal`
`GastoPorFuncaoBars` → `~/components/gasto-por-funcao-bars`

**Permanecem em `@transparencia/ui`:**
- `DenseTable`, `fmtCompact`, `getPartialYearPeriod`, `KPICard`, `KPIGrid`, `toTitleCase`

### `apps/web/app/[portalSlug]/saude/page.tsx`
**De `@transparencia/ui` → mover para `~/components/`:**
`SaudeContratacaoSection` → `~/components/saude-contratacao-section`
`SaudeEmendasSection` → `~/components/saude-emendas-section`
`SaudeFontesDonut` → `~/components/saude-fontes-donut`
`SaudeHeroSection` → `~/components/saude-hero-section`
`SaudeTrendChart` → `~/components/saude-trend-chart`

**Permanecem em `@transparencia/ui`:**
- `AlertBox`, `fmtCompact`, `getPartialYearPeriod`, `KPICard`, `KPIGrid`

### `apps/web/app/[portalSlug]/caprem/page.tsx`
**De `@transparencia/ui` → mover para `~/components/`:**
`CapremActuarialRiskSection` → `~/components/caprem-actuarial-risk-section`
`CapremEntidadesDonut` → `~/components/caprem-entidades-donut`
`CapremHeroSection` → `~/components/caprem-hero-section`

**Permanecem em `@transparencia/ui`:**
- Verificar quais utilitários permanecem após leitura do arquivo completo

### `apps/web/app/[portalSlug]/pessoal/page.tsx`
**De `@transparencia/ui` → mover para `~/components/`:**
`DecimoTerceiroCard` → `~/components/decimo-terceiro-card`
`DepartmentalPayrollChart` → `~/components/departmental-payroll-chart`
`ProventosDistributionChart` → `~/components/proventos-distribution-chart`

**Permanecem em `@transparencia/ui`:**
- `fmtCompact`, `fmtPercent`, `getPartialYearPeriod`, `KPICard`, `KPIGrid`

### `apps/web/app/[portalSlug]/licitacoes/page.tsx`
**De `@transparencia/ui` → mover para `~/components/`:**
`DistribucaoModalidadesChart` → `~/components/distribuicao-modalidades-chart`
`LicitacoesTable` → `~/components/licitacoes-table`

**Permanecem em `@transparencia/ui`:**
- `cn`, `getPartialYearPeriod`, `KPICard`, `KPIGrid`

### `apps/web/app/components/sidebar-wrapper.tsx`
**Não muda:** `Sidebar` e `MultiSelectOption` continuam em `@transparencia/ui`.

### `apps/web/app/layout.tsx`
**Não muda:** `Ribbon` continua em `@transparencia/ui`.

---

## Dependências Internas dos Componentes

> Antes de mover, verifique se algum componente de domínio importa outro componente de `@transparencia/ui`. Se importar, após a migração esses imports internos devem apontar para `@/components/` (se o importado também foi migrado) ou continuar em `@transparencia/ui` (se for primitiva).

**Padrão esperado de import interno em componentes migrados:**
```tsx
// Dentro de apps/web/components/saude-hero-section.tsx
// Se este componente usa KPICard (primitiva) → continua @transparencia/ui:
import { KPICard } from "@transparencia/ui";

// Se usa SaudeEmendasSection (domínio migrado) → usa @/components/:
import { SaudeEmendasSection } from "@/components/saude-emendas-section";
```

**Ação obrigatória:** Ao copiar cada arquivo para `apps/web/components/`, inspecione seus imports e atualize conforme a regra acima.

---

## Requisitos Técnicos Mandatórios

### Arquitetura (AD-4 — ARCHITECTURE-SPINE.md)
1. `packages/ui` é restrito a primitivas genéricas (`Button`, `Card`, `Badge`, `DenseTable`, `KPIPrimitive`, `Sidebar`).
2. Componentes específicos de domínio/negócio pertencem a `apps/web/components/`.
3. View Model e data loaders co-localizados no `apps/web` (escopo da Story 3.2).

### Sem Criação de Novo Código
- Esta story é de **refatoração estrutural pura**: mover arquivos + atualizar imports.
- **Proibido:** Alterar a lógica, estilo, ou comportamento de qualquer componente durante a migração.
- **Proibido:** Criar novos componentes ou alterar props/contratos de interface.

### Ordem de Execução Segura
1. Criar o diretório `apps/web/components/` (se não existir).
2. Copiar os arquivos de `packages/ui/src/components/` para `apps/web/components/` (flatten charts).
3. Atualizar imports internos dos componentes copiados.
4. Atualizar imports em cada `apps/web/app/[portalSlug]/*/page.tsx`.
5. Remover os re-exports dos componentes de domínio de `packages/ui/src/index.ts`.
6. **Não deletar** os arquivos originais de `packages/ui/src/components/` ainda — validar build primeiro.
7. Após `pnpm build` verde, deletar os arquivos originais de `packages/ui/src/components/`.

> ⚠️ **Deletar os arquivos originais é obrigatório** ao final. Deixar duplicatas causa ambiguidade nos imports e viola a arquitetura.

### Preservação de Paridade Visual (NFR5)
- 100% de preservação visual: nenhuma screen, card, chart ou seção pode desaparecer.
- Os componentes migrados devem funcionar identicamente — só o local físico e o caminho de import mudam.

---

## Inteligência de Story Anterior

### Aprendizados das Stories 2.1 e 2.2 (Leitores Atômicos)
- **Padrão `satisfies DTO`** estabelecido em `packages/db/src/queries/`. Não é relevante para esta story de UI.
- **Nomenclatura de arquivo kebab-case** é o padrão consolidado no repositório. Manter ao criar arquivos em `apps/web/components/`.
- **Exportações sem default**: os componentes no `packages/ui` usam `export function` ou `export cons### Tasks de Desenvolvimento

### Task 1 — Criar `apps/web/components/` e mover componentes de seção
- [x] Criar diretório `apps/web/components/`
- [x] Mover (copiar) `caprem-actuarial-risk-section.tsx`, `caprem-hero-section.tsx`, `cards-secundarios-visao-geral.tsx`, `carros-chefe-arrecadacao.tsx`, `decimo-terceiro-card.tsx`, `emendas-card.tsx`, `hero-fiscal-card.tsx`, `kpi-grid.tsx`, `licitacoes-table.tsx`, `pipeline-execucao.tsx`, `saude-contratacao-section.tsx`, `saude-emendas-section.tsx`, `saude-hero-section.tsx`, `section-header.tsx` para `apps/web/components/`
- [x] Inspecionar imports internos de cada arquivo copiado e atualizar se necessário

### Task 2 — Mover gráficos (flatten `charts/`)
- [x] Mover (copiar) todos os 15 arquivos de `packages/ui/src/components/charts/` diretamente para `apps/web/components/` (sem criar subpasta `charts/`)
- [x] Inspecionar imports internos dos charts copiados e atualizar se necessário

### Task 3 — Atualizar imports nas páginas `apps/web/app/`
- [x] Atualizar `apps/web/app/[portalSlug]/page.tsx`
- [x] Atualizar `apps/web/app/[portalSlug]/despesas/page.tsx`
- [x] Atualizar `apps/web/app/[portalSlug]/receitas/page.tsx`
- [x] Atualizar `apps/web/app/[portalSlug]/orcamento/page.tsx`
- [x] Atualizar `apps/web/app/[portalSlug]/saude/page.tsx`
- [x] Atualizar `apps/web/app/[portalSlug]/caprem/page.tsx`
- [x] Atualizar `apps/web/app/[portalSlug]/pessoal/page.tsx`
- [x] Atualizar `apps/web/app/[portalSlug]/licitacoes/page.tsx`
- [x] Confirmar que `apps/web/app/components/sidebar-wrapper.tsx` e `apps/web/app/layout.tsx` não precisam de alteração

### Task 4 — Limpar `packages/ui/src/index.ts`
- [x] Remover os 29 re-exports de componentes de domínio migrados
- [x] Manter os 7 re-exports de primitivas genéricas + tokens + utils

### Task 5 — Validar e Limpar arquivos originais
- [x] Executar `pnpm build` e confirmar zero erros
- [x] Executar `make test/ts` e confirmar zero erros de tipo (20/20 testes passando)
- [x] Após build verde: deletar os 29 arquivos originais de `packages/ui/src/components/` (incluindo diretório `charts/`)
- [x] Executar `pnpm build` novamente para confirmar que a deleção não introduziu erros

### Review Findings
- ✅ **AC1 (Domain components flat in apps/web/components)**: Todos os 29 componentes de domínio movidos com sucesso.
- ✅ **AC2 (Primitives in packages/ui)**: Exatamente 7 primitivas mantidas em `packages/ui`.
- ✅ **AC3 (Page imports updated)**: 8 páginas atualizadas com `@/components/` e `@transparencia/ui`.
- ✅ **AC4 (pnpm build)**: 3/3 packages compilando com sucesso.
- ✅ **AC5 (make test/ts)**: 20/20 testes de paridade passando.re-exports de componentes de domínio migrados
- [x] Manter os 7 re-exports de primitivas genéricas + tokens + utils

### Task 5 — Validar e Limpar arquivos originais
- [x] Executar `pnpm build` e confirmar zero erros
- [x] Executar `make test/ts` e confirmar zero erros de tipo (20/20 testes passando)
- [x] Após build verde: deletar os 29 arquivos originais de `packages/ui/src/components/` (incluindo diretório `charts/`)
- [x] Executar `pnpm build` novamente para confirmar que a deleção não introduziu erros

---

## Lista de Arquivos Afetados

### Criados (NEW)
- `apps/web/components/caprem-actuarial-risk-section.tsx`
- `apps/web/components/caprem-hero-section.tsx`
- `apps/web/components/cards-secundarios-visao-geral.tsx`
- `apps/web/components/carros-chefe-arrecadacao.tsx`
- `apps/web/components/decimo-terceiro-card.tsx`
- `apps/web/components/emendas-card.tsx`
- `apps/web/components/hero-fiscal-card.tsx`
- `apps/web/components/kpi-grid.tsx`
- `apps/web/components/licitacoes-table.tsx`
- `apps/web/components/pipeline-execucao.tsx`
- `apps/web/components/saude-contratacao-section.tsx`
- `apps/web/components/saude-emendas-section.tsx`
- `apps/web/components/saude-hero-section.tsx`
- `apps/web/components/section-header.tsx`
- `apps/web/components/bar-chart-h.tsx`
- `apps/web/components/caprem-entidades-donut.tsx`
- `apps/web/components/departmental-payroll-chart.tsx`
- `apps/web/components/distribuicao-modalidades-chart.tsx`
- `apps/web/components/donut-gastos-locais.tsx`
- `apps/web/components/folha-lrf-history-chart.tsx`
- `apps/web/components/funil-execucao-horizontal.tsx`
- `apps/web/components/funnel-waterfall.tsx`
- `apps/web/components/gasto-por-funcao-bars.tsx`
- `apps/web/components/previsto-vs-arrecadado.tsx`
- `apps/web/components/proventos-distribution-chart.tsx`
- `apps/web/components/restos-a-pagar-vendors-chart.tsx`
- `apps/web/components/saude-fontes-donut.tsx`
- `apps/web/components/saude-trend-chart.tsx`
- `apps/web/components/unidades-gastos-chart.tsx`

### Modificados (UPDATE)
- `packages/ui/src/index.ts` — remover re-exports de domínio
- `apps/web/app/[portalSlug]/page.tsx` — atualizar imports
- `apps/web/app/[portalSlug]/despesas/page.tsx` — atualizar imports
- `apps/web/app/[portalSlug]/receitas/page.tsx` — atualizar imports
- `apps/web/app/[portalSlug]/orcamento/page.tsx` — atualizar imports
- `apps/web/app/[portalSlug]/saude/page.tsx` — atualizar imports
- `apps/web/app/[portalSlug]/caprem/page.tsx` — atualizar imports
- `apps/web/app/[portalSlug]/pessoal/page.tsx` — atualizar imports
- `apps/web/app/[portalSlug]/licitacoes/page.tsx` — atualizar imports

### Deletados (DELETE — após build verde)
- `packages/ui/src/components/caprem-actuarial-risk-section.tsx`
- `packages/ui/src/components/caprem-hero-section.tsx`
- `packages/ui/src/components/cards-secundarios-visao-geral.tsx`
- `packages/ui/src/components/carros-chefe-arrecadacao.tsx`
- `packages/ui/src/components/charts/bar-chart-h.tsx`
- `packages/ui/src/components/charts/caprem-entidades-donut.tsx`
- `packages/ui/src/components/charts/departmental-payroll-chart.tsx`
- `packages/ui/src/components/charts/distribuicao-modalidades-chart.tsx`
- `packages/ui/src/components/charts/donut-gastos-locais.tsx`
- `packages/ui/src/components/charts/folha-lrf-history-chart.tsx`
- `packages/ui/src/components/charts/funil-execucao-horizontal.tsx`
- `packages/ui/src/components/charts/funnel-waterfall.tsx`
- `packages/ui/src/components/charts/gasto-por-funcao-bars.tsx`
- `packages/ui/src/components/charts/previsto-vs-arrecadado.tsx`
- `packages/ui/src/components/charts/proventos-distribution-chart.tsx`
- `packages/ui/src/components/charts/restos-a-pagar-vendors-chart.tsx`
- `packages/ui/src/components/charts/saude-fontes-donut.tsx`
- `packages/ui/src/components/charts/saude-trend-chart.tsx`
- `packages/ui/src/components/charts/unidades-gastos-chart.tsx`
- `packages/ui/src/components/decimo-terceiro-card.tsx`
- `packages/ui/src/components/emendas-card.tsx`
- `packages/ui/src/components/hero-fiscal-card.tsx`
- `packages/ui/src/components/kpi-grid.tsx`
- `packages/ui/src/components/licitacoes-table.tsx`
- `packages/ui/src/components/pipeline-execucao.tsx`
- `packages/ui/src/components/saude-contratacao-section.tsx`
- `packages/ui/src/components/saude-emendas-section.tsx`
- `packages/ui/src/components/saude-hero-section.tsx`
- `packages/ui/src/components/section-header.tsx`

---

## Change Log

- **2026-08-03**: Criado diretório `apps/web/components/` com 29 componentes de domínio migrados de `packages/ui/src/components/` (14 seções + 15 charts com flatten da subpasta `charts/`).
- **2026-08-03**: Imports internos de todos os componentes migrados convertidos: `../utils/*` → `@transparencia/ui`, primitivas genéricas (`Badge`, `DenseTable`, `KPICard`) → `@transparencia/ui`, componentes de domínio (`KPIGrid`, `SectionHeader`) → `@/components/`.
- **2026-08-03**: Importações em 8 páginas de `apps/web/app/[portalSlug]/` atualizadas para separar componentes de domínio (`@/components/`) de primitivas genéricas (`@transparencia/ui`).
- **2026-08-03**: `packages/ui/src/index.ts` reduzido de 36 para 11 exports (7 primitivas + tokens + 3 utils).
- **2026-08-03**: Dependências `recharts@3.10.1`, `echarts-for-react@3.0.6`, `echarts@6.1.0` adicionadas a `apps/web/package.json` (versões exatas conforme AGENTS.md).
- **2026-08-03**: 29 arquivos originais deletados de `packages/ui/src/components/` (incluindo diretório `charts/`).
- **2026-08-03**: `pnpm build` verde (3/3 packages) e `make test/ts` verde (20/20 testes) confirmados após deleção.

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (Thinking) via Antigravity Agent

### Completion Notes List

- Story 3.1 implementada em execução única em 2026-08-03 via `/bmad-dev-story`
- 29 componentes de domínio migrados de `packages/ui` para `apps/web/components/` (flat, sem subdiretório `charts/`)
- Imports internos consolidados e convertidos via script Python para evitar duplicatas
- Dependências ausentes (`recharts`, `echarts-for-react`, `echarts`) identificadas no primeiro build e adicionadas com versões exatas (pinned) a `apps/web/package.json`
- `packages/ui/src/components/` retém apenas 7 primitivas agnósticas: `alert-box`, `badge`, `dense-table`, `kpi-card`, `multi-select`, `ribbon`, `sidebar`
- 100% de paridade: nenhuma tela, componente ou gráfico foi removido ou alterado funcionalmente
- `pnpm build` e `make test/ts` passando 100% após a deleção dos arquivos originais

### Status

**Current Status**: `done`
