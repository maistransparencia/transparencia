---
baseline_commit: bf3f5dd7c942dcc03faec4e33c7c64513922d86c
---

# Story 8.4: Popover Decomposto da Dívida Real por Entidade no Radar de Gastos Sensíveis

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a citizen, journalist, or public auditor inspecting sensitive expense metrics (such as Accumulated Fuel Debt or Infrastructure Rent),
I want to click or tap the debt figure in the Sensitive Spending Radar to open a decomposed popover showing a mini-table with proportional percentage bars by municipal entity,
So that I can immediately understand which municipal entity (e.g. Health Fund for ambulances vs. City Hall cabinet) generated the liability, preventing misinformation and false assumptions.

---

## Acceptance Criteria

1. **Camada de Dados `@transparencia/db` — Decomposição da Dívida por Entidade (Regra 2 e 9 de `AGENTS.md`):**
   - No módulo `packages/db/src/queries/despesas-metrics.ts`, o DTO `ItemGastoSensivelDTO` deve ser expandido com a propriedade:
     ```ts
     decomposicaoDivida: EntidadeDividaItemDTO[];
     ```
   - O novo DTO `EntidadeDividaItemDTO` deve ser exportado canonicamente em `packages/db/src/index.ts` com a estrutura:
     ```ts
     export interface EntidadeDividaItemDTO {
       empresaId: string;
       entidadeNome: string;
       valorDivida: number;
       percentual: number;
     }
     ```
   - A query `getRadarGastosSensiveisMetrics` deve juntar `dim_orgao` (`leftJoin("dim_orgao as o", ...)`) ou agrupar por `empresa_id` para computar o passivo acumulado (`dividaRealAcumulada`) individualizado por órgão/entidade:
     - Dívida do exercício: `Math.max(0, liquidado - pago)` para `fonte = 'exercicio'` e `ano = selectedYear`.
     - Dívida de restos a pagar: `Math.max(0, liquidado - pago)` para `fonte = 'restos_a_pagar'`.
     - `valorDivida = dividaExercicio + dividaRestos` para cada entidade.
   - `percentual` deve ser calculado de forma relativa ao total de `dividaRealAcumulada` da categoria (`totalDivida > 0 ? Number(((valorDivida / totalDivida) * 100).toFixed(1)) : 0`).
   - A lista `decomposicaoDivida` deve ser ordenada em ordem decrescente de `valorDivida` e incluir apenas entidades com `valorDivida > 0`.
   - Se `dividaRealAcumulada === 0`, `decomposicaoDivida` deve ser um array vazio `[]`.
   - Paridade matemática estrita: a soma de `valorDivida` de todas as entidades em `decomposicaoDivida` deve equivaler a `dividaRealAcumulada` do item (tolerância `< 0.01`).

2. **Gatilho de Interação no Card do Radar de Gastos Sensíveis (`RadarGastosSensiveis`):**
   - No componente `apps/web/components/radar-gastos-sensiveis.tsx`, quando o card possuir `dividaReal > 0`, a pill de status ("Dívida real acumulada: R$ X") deve funcionar como um gatilho clicável/interativo (`button` acessível).
   - O botão do gatilho deve apresentar indicação visual sutil de interatividade (ex: cursor pointer, transição suave de hover `hover:border-amber-300 hover:bg-amber-100/80`, ícone indicador como `ChevronRight` ou `Info` discreto).
   - Atributos WAI-ARIA mandatórios no gatilho:
     - `aria-haspopup="dialog"`
     - `aria-expanded={isOpen}`
     - `aria-label={`Ver decomposição da dívida de ${config.titulo} por entidade`}`
   - Suporte a múltiplos modos de interação: clique ou toque (mobile) e clique no desktop, com fechamento ao clicar fora ou pressionar `Escape`.

3. **Componente de Popover Acessível e Reutilizável (`DecomposicaoDividaPopover`):**
   - Criar o componente `apps/web/components/decomposicao-divida-popover.tsx` (Client Component `"use client"`).
   - O popover deve abrir logo abaixo ou acima do gatilho (posicionamento absoluto inteligente com container relativo e alinhamento responsivo evitando overflow lateral na tela).
   - Estrutura do Popover:
     - **Cabeçalho:**
       - Título semântico: "Decomposição da Dívida Real".
       - Subtítulo indicando a categoria analisada (ex: "Combustíveis & Frotas") e o valor total acumulado em destaque.
       - Botão de fechar discreto (ícone `X` com `aria-label="Fechar detalhamento"`).
     - **Mini-tabela / Lista Decomposta por Entidade:**
       - Para cada entidade em `decomposicaoDivida`:
         - Nome da entidade em destaque legível (ex: *Fundo Municipal de Saúde*, *Prefeitura Municipal de Porciúncula*).
         - Valor monetário formatado (`R$ 45.200,00` via `fmtCurrency` ou `fmtCompact`).
         - Badge ou percentual relativo (ex: `65.4%`).
         - Barra de progresso visual proporcional (`h-2 w-full rounded-full bg-slate-100` com barra interna colorida `bg-amber-500` calculada pelo `percentual`).
     - **Nota de Contexto Contábil Cívico:**
       - Rodapé informativo curto explicando que a dívida real inclui empenhos liquidados do exercício ainda não pagos somados aos Restos a Pagar de anos anteriores, prevenindo acusações indevidas a secretarias que não geraram a dívida.
     - **Acessibilidade WAI-ARIA e UX:**
       - `role="dialog"` e `aria-modal="true"`.
       - Fechamento imediato com tecla `Escape`.
       - Fechamento ao clicar fora do container (`handleClickOutside`).
       - Limite de altura com scroll suave (`max-h-72 overflow-y-auto`) caso o município possua muitas entidades.

4. **Tratamento Elegante de Entidades Secundárias e Casos de Borda:**
   - Se uma entidade possuir dívida residual muito pequena (ex: menor que 1% ou centavos), ela ainda deve ser exibida ordenadamente no final da lista sem quebrar o layout.
   - Se `decomposicaoDivida` tiver apenas 1 entidade (100% da dívida em um único órgão), o popover deve renderizar a barra cheia (100%) informando com clareza a concentração total.
   - Quando `dividaReal === 0` ou o card estiver com "100% quitados" ou "Sem despesas no ano", o componente mantém o visual estático original sem abrir popover.

5. **Regras de Qualidade e Conformidade com `AGENTS.md`:**
   - **Regra 2 (Arquitetura em Camadas):** Toda a agregação de dívida por entidade deve residir exclusivamente no `@transparencia/db/src/queries/despesas-metrics.ts`. A UI apenas consome os dados prontos.
   - **Regra 7 (Pinned Versions):** Não instalar pacotes de terceiros adicionais; o popover deve ser implementado puramente com React 19, Tailwind CSS e Lucide Icons, aproveitando os padrões já consolidados em `apps/web/components/show-your-work-button.tsx`.
   - **Regra 10 (Snake_case em códigos/chaves):** Propriedades internas e discriminadores mantidos estritamente em snake_case.
   - **Regra 13 (Zero Ternários Aninhados):** Utilizar IIFEs ou funções auxiliares com retornos antecipados para condicionais de renderização.

6. **Testes Automatizados e Paridade:**
   - Testes unitários em `packages/db/src/queries/__tests__/despesas-metrics.spec.ts` validando o shape de `decomposicaoDivida`, a paridade matemática com `dividaRealAcumulada` e a ordenação decrescente de `valorDivida`.
   - Testes unitários do componente `DecomposicaoDividaPopover` em `apps/web/components/decomposicao-divida-popover.spec.tsx` cobrindo renderização das entidades, barras proporcionais, fechamento via Escape e clique fora.
   - Testes de integração do `RadarGastosSensiveis` em `apps/web/components/radar-gastos-sensiveis.spec.tsx` cobrindo o gatilho interativo da dívida quando `dividaReal > 0`.
   - 100% de aprovação nos comandos `make test/ts`, `pnpm --filter @transparencia/db test`, `pnpm --filter web test`, `pnpm build`, `make test` e `make check`.

---

## Tasks / Subtasks

- [x] Task 1: Expandir query e DTOs de `getRadarGastosSensiveisMetrics` em `@transparencia/db` (AC: 1, 5, 6)
  - [x] Subtask 1.1: Adicionar interface `EntidadeDividaItemDTO` em `packages/db/src/queries/despesas-metrics.ts` e exportá-la no `packages/db/src/index.ts`.
  - [x] Subtask 1.2: Atualizar `ItemGastoSensivelDTO` para incluir `decomposicaoDivida: EntidadeDividaItemDTO[]`.
  - [x] Subtask 1.3: Modificar a query Kysely em `getRadarGastosSensiveisMetrics` para incluir join com `dim_orgao` (`leftJoin("dim_orgao as o", ...)`) e agrupar por `empresa_id` e `orgao_nome`.
  - [x] Subtask 1.4: Processar a decomposição por entidade de cada categoria no `reduce`, calculando `dividaExercicio`, `dividaRestos`, `valorDivida` e `percentual` proporcional.
  - [x] Subtask 1.5: Ordenar a decomposição por `valorDivida` decrescente, filtrando entidades com `valorDivida > 0`.
  - [x] Subtask 1.6: Atualizar testes em `packages/db/src/queries/__tests__/despesas-metrics.spec.ts` para verificar o retorno de `decomposicaoDivida`.

- [x] Task 2: Implementar o componente `DecomposicaoDividaPopover` em `apps/web` (AC: 3, 4, 5, 6)
  - [x] Subtask 2.1: Criar `apps/web/components/decomposicao-divida-popover.tsx` com `role="dialog"`, gerenciamento de estado aberto/fechado, listener de clique fora e tecla `Escape`.
  - [x] Subtask 2.2: Implementar layout do popover com cabeçalho, lista de entidades com nomes amigáveis, valores monetários formatados, percentuais e barras de progresso proporcionais (`bg-amber-500`).
  - [x] Subtask 2.3: Adicionar rodapé informativo de esclarecimento cívico sobre empenhos liquidados e restos a pagar.
  - [x] Subtask 2.4: Criar suíte de testes unitários em `apps/web/components/decomposicao-divida-popover.spec.tsx`.

- [x] Task 3: Integrar o Popover ao `RadarGastosSensiveis` (AC: 2, 4, 6)
  - [x] Subtask 3.1: No componente `apps/web/components/radar-gastos-sensiveis.tsx`, atualizar a interface `ItemGastoSensivel` para incluir `decomposicaoDivida?: EntidadeDividaItemDTO[]`.
  - [x] Subtask 3.2: Transformar a pill estática de status da dívida acumulada (`dividaReal > 0`) em um botão interativo conectado ao `DecomposicaoDividaPopover`.
  - [x] Subtask 3.3: Adicionar estados de foco/hover e atributos WAI-ARIA (`aria-haspopup`, `aria-expanded`, `aria-label`).
  - [x] Subtask 3.4: Atualizar os testes existentes em `apps/web/components/radar-gastos-sensiveis.spec.tsx` para cobrir a interação de abertura do popover e verificação do conteúdo exibido.

- [x] Task 4: Validação Integrada, Tipos e Linters (AC: 6)
  - [x] Subtask 4.1: Executar `pnpm --filter @transparencia/db test` e verificar passagem de 100% dos testes da camada de banco de dados.
  - [x] Subtask 4.2: Executar `pnpm --filter web test` e verificar passagem de 100% dos testes frontend.
  - [x] Subtask 4.3: Executar `pnpm build` e checagem de tipos (`tsc --noEmit`).
  - [x] Subtask 4.4: Executar `make check` e `make test`.
  - [x] Subtask 4.5: Atualizar o arquivo `sprint-status.yaml` para o próximo status.

### Review Findings

- [x] [Review][Decision] Padronização do padding dos cards do Radar de Gastos Sensíveis (`p-4` vs `p-5`) — Mantido `p-4` conforme decisão do usuário
- [x] [Review][Patch] Limpeza de dim_orgao no helper de testes cleanupFixtures [packages/db/tests/fixtures/seed.ts:328]
- [x] [Review][Patch] Suporte a pointerdown para toque mobile no fechamento ao clicar fora [apps/web/components/decomposicao-divida-popover.tsx:46]
- [x] [Review][Patch] Ajuste de dimensões de barra de progresso (h-2) e scroll (max-h-72) conforme AC 3 [apps/web/components/decomposicao-divida-popover.tsx:307,337]
- [x] [Review][Patch] Fallback resiliente para nomes de órgãos vazios ou com apenas espaços em branco [packages/db/src/queries/despesas-metrics.ts:361]
- [x] [Review][Patch] Desempate determinístico na ordenação de entidades com mesmo valor de dívida [packages/db/src/queries/despesas-metrics.ts:424]
- [x] [Review][Patch] Acessibilidade WAI-ARIA com vínculo semântico via id, aria-controls e aria-labelledby [apps/web/components/decomposicao-divida-popover.tsx:250,274]
- [x] [Review][Defer] Varredura histórica ilimitada em restos a pagar sem janela retroativa [packages/db/src/queries/despesas-metrics.ts:305] — deferred, pre-existing

---

## Dev Notes

### Padrões Arquiteturais e Guardrails Mandatórios

- **Arquitetura Baseada em Camadas (Regra 2 de `AGENTS.md`):**
  - **Camada `@transparencia/db`:** O cálculo analítico da dívida por entidade deve pertencer exclusivamente a `getRadarGastosSensiveisMetrics` em `packages/db/src/queries/despesas-metrics.ts`. Nenhuma agregação ou join de banco de dados deve ser executado no Next.js.
  - **Camada Web (`apps/web`):** O componente `RadarGastosSensiveis` e `DecomposicaoDividaPopover` são componentes burros de apresentação que apenas exibem os números e barras calculados pela camada de dados.

- **Ausência de Radix UI & Padrão de Componentes Próprios Acessíveis (Regra 7 de `AGENTS.md`):**
  - O projeto não utiliza `@radix-ui/react-popover`. O componente `DecomposicaoDividaPopover` deve seguir o padrão consolidado em `apps/web/components/show-your-work-button.tsx`, implementando `role="dialog"`, `aria-modal="true"`, `aria-expanded`, `useEffect` com listeners de clique fora e tecla `Escape`.

- **Formatação Monetária e Visual (Regra 10 e 13 de `AGENTS.md`):**
  - Utilizar os utilitários canônicos `@transparencia/ui` (`fmtCurrency` ou `fmtCompact`).
  - Não utilizar ternários aninhados; para qualquer condicional com mais de duas ramificações, utilizar IIFE `(() => { ... })()`.

- **Tratamento de Dados no DB (`dim_orgao`):**
  - Na query Kysely de `fct_despesas`, utilizar `leftJoin("dim_orgao as o", (join) => join.onRef("o.portal_slug", "=", "d.portal_slug").onRef("o.empresa_id", "=", "d.empresa_id"))` para obter `o.orgao_nome`.
  - Coalescer `o.orgao_nome` com fallback amigável caso nulo: `r.orgao_nome ?? \`Órgão \${r.empresa_id}\``.

### Existing Code Being Modified (UPDATE Files)

1. **`packages/db/src/queries/despesas-metrics.ts`**:
   - *Current state:* Calcula métricas agregadas do Radar de Gastos Sensíveis agrupando por `["ano", "fonte", "categoria_gasto_sensivel"]`. Calcula `dividaRealAcumulada = liquidadoPendente + dividaRestosAcumulada` de forma global para a categoria.
   - *What this story changes:* Agrupa também por `empresa_id` e traz `orgao_nome` de `dim_orgao`, gerando para cada categoria o array `decomposicaoDivida: EntidadeDividaItemDTO[]`.
   - *What must be preserved:* Os totais globais (`valorPagoAnoAtual`, `valorPagoAnoAnterior`, `dividaRealAcumulada`, `variacaoPercentual`, `tendencia`) não devem ser alterados em seus valores finais; a decomposição é puramente aditiva.

2. **`packages/db/src/index.ts`**:
   - *Current state:* Exporta DTOs e queries de despesas.
   - *What this story changes:* Exporta o novo tipo `EntidadeDividaItemDTO`.
   - *What must be preserved:* Todos os exports existentes.

3. **`apps/web/components/radar-gastos-sensiveis.tsx`**:
   - *Current state:* Renderiza os 6 cards de gastos sensíveis. Na linha 251, renderiza uma `div` estática com a pill de "Dívida real acumulada" com tooltip via atributo `title`.
   - *What this story changes:* Substitui a pill estática por um gatilho clicável que aciona o `DecomposicaoDividaPopover`.
   - *What must be preserved:* O layout responsivo dos cards, os botões `ShowYourWorkButton` de 3 pontos, badges de variação percentual e os status "100% quitados" e "Sem despesas no ano".

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-8.4]
- [Source: packages/db/src/queries/despesas-metrics.ts#L249-L375]
- [Source: apps/web/components/radar-gastos-sensiveis.tsx#L251-L272]
- [Source: apps/web/components/show-your-work-button.tsx#L33-L72]
- [Source: AGENTS.md#Diretrizes-de-Desenvolvimento]

---

## Dev Agent Record

### Agent Model Used

Gemini 3.8 Flash (Medium)

### Debug Log References
 
 - Verified existing unit test suites passing cleanly (`@transparencia/db`: 53 tests, `web`: 217 tests).
 - Confirmed `dim_orgao` join patterns in `export-raw-data.ts` and `metadata.ts`.
 - Validated zero-dependency accessible popover pattern in `show-your-work-button.tsx`.
 - TDD RED/GREEN/REFACTOR for Task 1: added tests in `despesas-metrics.spec.ts` asserting `decomposicaoDivida` shape, percentage calculations, descending order and mathematical parity against `dividaRealAcumulada`. All 54 tests passing in `@transparencia/db`.
 - TDD RED/GREEN/REFACTOR for Task 2: created unit test suite in `decomposicao-divida-popover.spec.tsx` (6 tests). Implemented `DecomposicaoDividaPopover` with WAI-ARIA dialog semantics, escape/outside click listeners, visual progress bars and civic clarification footer. All 223 web tests passing.
 - TDD RED/GREEN/REFACTOR for Task 3: integrated `DecomposicaoDividaPopover` into `RadarGastosSensiveis`. Fixed lateral clipping on column 1 by binding popover width to card footprint (`left-0 right-0`) with `z-30`/`z-50` stacking. Updated `radar-gastos-sensiveis.spec.tsx` test suite. All 224 web tests passing. Refined visual hierarchy placing monetary values and percentage below the bar to give maximum space for entity names.
 - Task 4 validation: `pnpm --filter @transparencia/db test` (54 tests passed), `pnpm --filter web test` (224 tests passed), `pnpm build` (turbo build 3 packages passed), `make check` (ruff, ruff-format, mypy passed), `make test` (pytest 83 tests passed).

### Completion Notes List

 - Story file created with exhaustive developer guardrails, exact query joins, accessible UI popover requirements and test cases.
 - Implemented Task 1: `EntidadeDividaItemDTO` exported, `ItemGastoSensivelDTO` updated with `decomposicaoDivida`, `getRadarGastosSensiveisMetrics` joins `dim_orgao` and calculates debts per municipal entity with strict parity and descending sort.
 - Implemented Task 2: created `DecomposicaoDividaPopover` component in `apps/web/components/decomposicao-divida-popover.tsx` with zero third-party dependencies, accessible dialog pattern, keyboard Escape listener, click-outside listener, full test coverage in `decomposicao-divida-popover.spec.tsx`.
 - Implemented Task 3: integrated `DecomposicaoDividaPopover` into `RadarGastosSensiveis` replacing static debt pill. Resolved horizontal cutoff bug identified in column 1 cards by anchoring popover strictly to button/card width (`left-0 right-0 z-50`). Refined item hierarchy to allow long entity names to display cleanly without truncation. Cleaned unused variables and imports.
 - Implemented Task 4: complete test suites passed (DB, Web, Backend Pytest, Turborepo Build, Linters), story marked for review.

### File List

 - `_bmad-output/implementation-artifacts/8-4-popover-decomposto-da-divida-real-por-entidade-no-radar-de-gastos-sensiveis.md` (NEW)
 - `_bmad-output/implementation-artifacts/sprint-status.yaml` (UPDATE)
 - `packages/db/src/queries/despesas-metrics.ts` (UPDATE)
 - `packages/db/tests/fixtures/seed.ts` (UPDATE)
 - `packages/db/src/queries/__tests__/despesas-metrics.spec.ts` (UPDATE)
 - `apps/web/components/decomposicao-divida-popover.tsx` (NEW)
 - `apps/web/components/decomposicao-divida-popover.spec.tsx` (NEW)
 - `apps/web/components/radar-gastos-sensiveis.tsx` (UPDATE)
 - `apps/web/components/radar-gastos-sensiveis.spec.tsx` (UPDATE)
