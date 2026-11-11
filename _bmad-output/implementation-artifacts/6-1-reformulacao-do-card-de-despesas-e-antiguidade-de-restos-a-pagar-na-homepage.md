---
baseline_commit: ee156a594b4413eb08de5b149c556e98c607440a
---

# Story 6.1: Reformulação do Card de Despesas e Antiguidade de Restos a Pagar na Homepage

**Status:** done  
**Epic:** Epic 6: Reformulação Fiscal da Homepage e Redesenho da Página de Despesas Detalhadas  

## User Story

As a citizen / municipal auditor,  
I want the Homepage Despesas card to display a clean Hero metric separating Empenhado and Liquidado amounts, along with proportion-filled annual bars and mobile-friendly inline text without tooltips,  
So that I can immediately understand the real executed debt without confusing budget reservations with actual financial liabilities.

## Acceptance Criteria

### Componentes UI & Destaque Numérico no Card de Despesas
1. **Destaque Numérico Ultra-Clean:** O card de Despesas da Homepage em `apps/web/components/cards-secundarios-visao-geral.tsx` exibe a métrica principal no topo formatada de forma clara e legível em linha única: `R$ XX.Xmi / R$ X.Xmi liquidados` (ou `${totalEmpenhadoFormatted} / ${totalLiquidadoFormatted} liquidados` quando ambos forem fornecidos).
2. **Navegação & Texto de Apoio Mobile-Friendly:** 
   - O cabeçalho do card de despesas não contém tooltips acionáveis via hover (`Tooltip` com `CircleQuestionMarkIcon` removido), prevenindo popups acidentais ou travamentos durante a rolagem em dispositivos móveis.
   - O texto de apoio abaixo do número exibe `pendentes a N fornecedores` (ou a contagem equivalente de credores da administração atual) com tipografia limpa.

### Barras de Antiguidade Bipartidas / Empilhadas (Restos a Pagar por Ano)
3. **Barras com Preenchimento Proporcional Duplo:** As barras de antiguidade por ano (`antiguidadeBars`) renderizam preenchimento empilhado/bipartido:
   - A **base inferior** da barra (cor viva/destaque, ex: `bg-[oklch(0.55_0.11_25)]` ou `bg-sky-600`) indica a porcentagem da dívida com valor **Liquidado** real (`percentageLiquidado`).
   - O **topo superior** da barra (tom sutil/muted, ex: `bg-[#f0dadd]` ou `bg-sky-200`) indica o saldo apenas **Empenhado** a liquidar (`percentageEmpenhado`).
   - A altura total do container da barra reflete o percentual acumulado total em relação ao maior ano ou limite da escala.

### Validação, Tipagem & Testes
4. **Suíte de Validação Inteira Limpa:** 
   - Execução de `pnpm test` (ou `make test/ts`) passa com 100% de sucesso em todos os pacotes.
   - Compilação do projeto via `pnpm build` ou `tsc --noEmit` finaliza sem erros de tipagem TypeScript.

---

## Contexto para Desenvolvedores & Guardrails

### 📂 Arquivos Afetados (UPDATE)

1. **`apps/web/components/cards-secundarios-visao-geral.tsx`**
   - **Estado Atual:** Renderiza o Card de Despesas com a `Tooltip` de Restos a Pagar no cabeçalho, apenas um valor numérico simples (`despesasTotal`), e barras de antiguidade com cor única.
   - **Modificações Necessárias:**
     - Atualizar as interfaces `DespesasCardData` e `AntiguidadeBarItem` para suportar `totalEmpenhadoFormatted`, `totalLiquidadoFormatted`, `percentageLiquidado`, `percentageEmpenhado`.
     - Remover o wrapper `<Tooltip>` e o ícone `<CircleQuestionMarkIcon>` do cabeçalho do card de Despesas.
     - Ajustar a renderização da métrica principal para formatar `R$ XX.Xmi / R$ X.Xmi liquidados`.
     - Reestruturar o container visual de `despesasBars` para renderizar 2 segmentos sobrepostos/empilhados (base com a cor do Liquidado e topo com a cor do Empenhado).
   - **O que Preservar:** Responsividade da grid (Cards 2 e 3 de Licitações e Pessoal não devem ser alterados de forma destrutiva), estilização `border-[#e7e9ee] bg-white p-5 shadow-sm`.

2. **`apps/web/app/[portalSlug]/view-model.tsx`**
   - **Estado Atual:** Preenche `despesasCardData` com `totalRestosPagarFormatted`, `subtext` e `antiguidadeBars` simples.
   - **Modificações Necessárias:**
     - Atualizar o mapeamento de `despesasCardData` fornecendo `totalEmpenhadoFormatted` e `totalLiquidadoFormatted` (usando os totais de restos a pagar liquidados vs empenhados da posição fiscal) e repassando o percentual de liquidação por ano nas barras de antiguidade.
   - **O que Preservar:** Respeito à regra de multi-tenant e imutabilidade dos leitores do `@transparencia/db`.

---

## Regras de Projeto e Diretrizes Mandatórias (AGENTS.md)

- **Regra 2 (A Camada de Apresentação é Burra):** Os componentes UI apenas consomem DTOs e repassam via props. Nenhuma lógica de cálculo contábil ou `SUM()` deve ser introduzida em runtime nos componentes React.
- **Regra 9 (Nomeação Clara de Métricas):** Proibido criar variáveis abreviadas como `pct`, `df`, `liq`. Use `totalEmpenhadoFormatted`, `totalLiquidadoFormatted`, `percentageLiquidado`, `percentageEmpenhado`.
- **Regra 10 (Snake_case em Códigos):** Mantenha identificadores e categorias internas em lowercase `snake_case`.

---

## Sequência Ordenada de Tasks

### 🔴 FASE 1: Atualização de Interfaces e ViewModel
- [x] **Task 1:** Atualizar as interfaces `DespesasCardData` e `AntiguidadeBarItem` em `apps/web/components/cards-secundarios-visao-geral.tsx` adicionando suporte a métricas de empenhado/liquidado e porcentagens bipartidas.
- [x] **Task 2:** Atualizar a construção de `despesasCardData` em `apps/web/app/[portalSlug]/view-model.tsx` enviando os valores formatados de empenhado/liquidado e percentuais de liquidação por ano.

### 🔵 FASE 2: Reformulação do Card de Despesas e Antiguidade de Restos a Pagar
- [x] **Task 3:** Remover a `Tooltip` e o ícone de interrogação do cabeçalho do Card de Despesas em `apps/web/components/cards-secundarios-visao-geral.tsx`.
- [x] **Task 4:** Ajustar a exibição da métrica Hero no topo do Card de Despesas para exibir `R$ XX.Xmi / R$ X.Xmi liquidados`.
- [x] **Task 5:** Reformular o componente de barras `antiguidadeBars` para exibir o preenchimento empilhado/bipartido (base com a porcentagem de Liquidado e topo com a porcentagem de Empenhado pendente).

### 🟢 FASE 3: Validação de Paridade, Testes e Build
- [x] **Task 6:** Criar ou atualizar os testes unitários da Homepage em `apps/web/app/[portalSlug]/view-model.spec.ts` para validar o formato do DTO `despesasCardData`.
- [x] **Task 7:** Executar a suíte completa de testes (`pnpm test` ou `make test/ts`) e verificar a tipagem com `pnpm build` garantindo zero erros.

---

## Dev Agent Record

### Implementation Plan
1. **Atualização de Interfaces (Task 1):** Adicionados campos `totalEmpenhadoFormatted`, `totalLiquidadoFormatted`, `percentageLiquidado`, `percentageEmpenhado` nas interfaces `DespesasCardData` e `AntiguidadeBarItem`.
2. **Atualização do ViewModel (Task 2):** Inseridos os dados de `execSummary.totalEmpenhado` e `execSummary.totalLiquidado` no DTO `despesasCardData`, e calculado o rateio proporcional do saldo empenhado vs liquidado por ano para as barras de antiguidade.
3. **Reformulação UI do Card de Despesas (Tasks 3, 4, 5):**
   - Removida a `Tooltip` do cabeçalho do Card de Despesas para evitar acionamentos por hover em dispositivos móveis.
   - Ajustado o destaque numérico Hero para formatar `R$ XX.Xmi / R$ X.Xmi liquidados`.
   - Implementada a renderização de barras bipartidas/empilhadas (base com a porcentagem de Liquidado e topo com o saldo Empenhado pendente).
4. **Testes e Build (Tasks 6, 7):**
   - Criada a suíte `apps/web/app/[portalSlug]/view-model.spec.ts` para testar os DTOs do ViewModel da Homepage.
   - Executada a suíte completa de testes (`pnpm test`) e checagem de tipos/build (`pnpm build`), ambos aprovados com 100% de sucesso.

### Completion Notes
- Todos os 4 critérios de aceite da Story 6.1 foram satisfeitos.
- As suítes de testes automatizados (`pnpm test`) e a compilação do Next.js Turbopack (`pnpm build`) foram executadas sem erros.

---

## File List

- `apps/web/components/cards-secundarios-visao-geral.tsx` (UPDATE)
- `apps/web/app/[portalSlug]/view-model.tsx` (UPDATE)
- `apps/web/app/[portalSlug]/view-model.spec.ts` (NEW)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (UPDATE)
- `_bmad-output/implementation-artifacts/6-1-reformulacao-do-card-de-despesas-e-antiguidade-de-restos-a-pagar-na-homepage.md` (UPDATE)

---

## Change Log

- **2026-08-26:** Implementada a reformulação do Card de Despesas e Antiguidade de Restos a Pagar na Homepage (Story 6.1). Adicionadas métricas ultra-clean `Empenhado / Liquidado`, barras bipartidas/empilhadas por ano, remoção de tooltip mobile-unfriendly e suíte de testes unitários do ViewModel.

---

### Review Findings

- [x] [Review][Patch] Formatação do Destaque Numérico Hero Metric no Card de Despesas [apps/web/components/cards-secundarios-visao-geral.tsx:119-129]
- [x] [Review][Patch] Inclusão dos campos totalEmpenhadoFormatted e totalLiquidadoFormatted no ViewModel [apps/web/app/[portalSlug]/view-model.tsx:128-160]
- [x] [Review][Patch] Substituição do nome abreviado de métrica liqPct e empPct por percentualLiquidado e percentualEmpenhado (Regra 9) [apps/web/app/[portalSlug]/view-model.tsx:143-146]
- [x] [Review][Patch] Tratamento de divisão por zero (totalVal === 0) nas barras bipartidas de antiguidade [apps/web/components/cards-secundarios-visao-geral.tsx:185-192]
- [x] [Review][Patch] Comparação explícita da flag isCurrentYear por selectedYear em vez de último elemento [apps/web/app/[portalSlug]/view-model.tsx:153]
- [x] [Review][Patch] Aplicação de unaccent(lower(...)) na limpeza de fornecedores no modelo dbt (Regra 11) [elt/transform/models/marts/metrics/fct_posicao_fiscal_detalhes_metricas.sql:8]
- [x] [Review][Patch] Refatoração de for..of e mutação em posicao-fiscal-detalhes-metrics.ts para estilo funcional e redução imutável (Regra 2) [packages/db/src/queries/posicao-fiscal-detalhes-metrics.ts:71-100]
- [x] [Review][Patch] Expansão das asserções dos testes unitários em view-model.spec.ts para o Hero Metric e campos do DTO [apps/web/app/[portalSlug]/view-model.spec.ts:68-73]
- [x] [Review][Defer] Discrepância na fórmula do cálculo de índices de mandato entre modelos dbt marts [elt/transform/models/marts/metrics/fct_posicao_fiscal_detalhes_metricas.sql:45-46] — deferred, pre-existing

