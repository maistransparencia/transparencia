---
baseline_commit: ef3ee31f329475f72fa9d6363967d2d846870f88
---

# Story 6.4: Redesenho Cidadão da Interface da Página de Despesas Detalhadas (`/despesas`)

**Status:** done  
**Epic:** Epic 6: Reformulação Fiscal da Homepage e Redesenho da Página de Despesas Detalhadas  

## User Story

As a citizen / municipal auditor,  
I want a clear, citizen-centric layout on `/despesas` organized into 3 focused acts: Macro Execution KPIs (Empenhado, Liquidado, Pago, Quitação), a "Radar de Gastos Sensíveis & Controle Fiscal" (tracking fuel/fleets, machinery rentals, events/festivities, travel per-diems, and public works with real pending liabilities and partial-year budget share), and a 100% homepage-consistent Restos a Pagar section with stacked supplier debt bars (liquidado vs empenhado não processado),  
So that I can easily discover where the municipality is spending, audit which expense areas were effectively controlled, and inspect real municipal liabilities without confusing multi-tone gray charts or duplicated information.

## Acceptance Criteria

### 1. Macro Termômetro de Execução (Hero KPIs)
1. **Quatro KPIs da Execução do Exercício:** A rota `/despesas` renderiza no topo 4 KPIs consolidados do ano selecionado (`fonte = 'exercicio'`):
   - **Total Empenhado:** $R\$ X.X\text{mi}$ (`no exercício {ano}`)
   - **Total Liquidado:** $R\$ X.X\text{mi}$ (`serviços/bens atestados`)
   - **Total Pago:** $R\$ X.X\text{mi}$ (`desembolso efetivo de caixa`)
   - **Taxa de Quitação:** $XX\%$ (`pago / empenhado`)

### 2. Radar de Gastos Sensíveis & Controle Fiscal (Dívida Real & Variação)
2. **Cards Temáticos de Contas Críticas com Comparativo Histórico e Passivos:** Exibir um grid de cards para as 5 contas de alta sensibilidade social e fiscal:
   - ⛽ **Combustíveis & Frotas:** Despesas com abastecimento e manutenção da frota (`combustivel_frota`).
   - 🚜 **Locação de Máquinas & Veículos:** Aluguel de maquinários pesados e automóveis de terceiros (`locacao_maquinas_veiculos`).
   - 🎭 **Eventos, Shows & Festividades:** Contratação de palcos, iluminação, bandas e festividades (`eventos_festas`).
   - ✈️ **Diárias & Viagens:** Gastos com deslocamentos e reembolsos a servidores e agentes políticos (`diarias_viagens`).
   - 🏗️ **Obras & Infraestrutura (Investimento Real):** Recursos aplicados em construções, reformas e pavimentação (`obras_infraestrutura`).
3. **Indicador de Tendência, Peso no Orçamento e Dívida Real:** Cada card sensível exibe:
   - **Total Pago no Ano:** Formatado com proteção tipográfica contra quebra de linha (`whitespace-nowrap`).
   - **Badge de Contexto:**
     - Em anos parciais (ano atual): `% do pago em {ano}` em badge neutro.
     - Em anos fechados: `+X.X% vs {ano-1}` (Alerta) ou `-X.X% vs {ano-1}` (Economia).
   - **Pill de Dívida Real a Pagar:**
     - Se `valorLiquidadoPendente > 0`: Destaque em tom âmbar com o montante liquidado aguardando desembolso.
     - Se `valorLiquidadoPendente === 0`: `100% quitados`.

### 3. Restos a Pagar & Dívidas Herdadas (Paridade SSOT com a Homepage)
4. **Paridade Matemática com a Homepage:** Os cards de Restos a Pagar na rota `/despesas` consomem estritamente a mart `fct_posicao_fiscal_detalhes_metricas`, exibindo o saldo devedor total acumulado (`posicao.restosPendentesTotal`), a contagem exata de fornecedores e a pendência mais antiga desde o primeiro exercício.
5. **Ranking de Top 5 Fornecedores com Barras Empilhadas (`RestosAPagarVendorsChart`):** Renderiza barras empilhadas:
   - 🟧 **Liquidado (Dívida Real):** em `bg-amber-600`
   - 🟨 **Empenhado (Não Processado):** em `bg-amber-300`
   - Sem trilhos cinzas enganosos de progresso.

### 4. Validação, Tipagem & Testes
6. **Suíte de Validação Limpa:**
   - As suítes de teste unitário em `@transparencia/db` e em `apps/web` passam com 100% de sucesso.
   - A execução de `pnpm test` e `pnpm build` passa em todos os pacotes sem erros de tipagem TypeScript.

---

## File List

- `packages/db/src/queries/despesas-metrics.ts` (UPDATE)
- `apps/web/components/radar-gastos-sensiveis.tsx` (NEW)
- `apps/web/components/restos-a-pagar-vendors-chart.tsx` (UPDATE)
- `apps/web/app/[portalSlug]/despesas/loader.ts` (UPDATE)
- `apps/web/app/[portalSlug]/despesas/view-model.ts` (UPDATE)
- `apps/web/app/[portalSlug]/despesas/page.tsx` (UPDATE)
- `apps/web/app/[portalSlug]/despesas/page.spec.tsx` (UPDATE)
- `apps/web/app/[portalSlug]/despesas/view-model.spec.ts` (UPDATE)
- `packages/db/src/queries/__tests__/despesas-metrics.spec.ts` (UPDATE)
- `_bmad-output/planning-artifacts/epics.md` (UPDATE)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (UPDATE)
- `_bmad-output/implementation-artifacts/6-4-redesenho-da-interface-da-pagina-de-despesas-detalhadas-despesas.md` (UPDATE)

---

## Tasks / Subtasks

- [x] [Task 1] Macro Termômetro de Execução (Hero KPIs)
- [x] [Task 2] Radar de Gastos Sensíveis & Controle Fiscal
- [x] [Task 3] Restos a Pagar & Dívidas Herdadas (SSOT)
- [x] [Task 4] Validação, Tipagem & Testes

### Review Findings

- [x] [Review][Patch] Tratar lógica trivalente SQL com subfuncao nula em fct_despesas.sql [elt/transform/models/marts/fct_despesas.sql:233]
- [x] [Review][Patch] Remover pre_hook de create extension desnecessário em fct_despesas.sql [elt/transform/models/marts/fct_despesas.sql:1]
- [x] [Review][Patch] Eliminar interface duplicada DespesaUnidadeMetricsDTO em despesas-metrics.ts [packages/db/src/queries/despesas-metrics.ts:132]
- [x] [Review][Patch] Adicionar campos dividaRealAcumulada e dividaRestosAcumulada na interface ItemGastoSensivel [apps/web/components/radar-gastos-sensiveis.tsx:14]
- [x] [Review][Patch] Exibir badge 'Sem despesas registradas' para categorias com R$ 0 pago e sem dívida [apps/web/components/radar-gastos-sensiveis.tsx:226]
- [x] [Review][Patch] Formatar variação percentual na faixa estável [-2%, +2%] [apps/web/components/radar-gastos-sensiveis.tsx:176]
- [x] [Review][Patch] Prevenir colisão de React Key e limitar porcentagem em RestosAPagarVendorsChart [apps/web/components/restos-a-pagar-vendors-chart.tsx:65]
- [x] [Review][Patch] Usar nullish coalescing (??) no fallback de fornecedoresAguardando em loader.ts [apps/web/app/[portalSlug]/despesas/loader.ts:143]
- [x] [Review][Patch] Atualizar mock de teste com propriedades canônicas em page.spec.tsx [apps/web/app/[portalSlug]/despesas/page.spec.tsx:98]
- [x] [Review][Patch] Eliminar strings 'PORCIUNCULA' hardcoded e refatorar loops imperativos para reduce em despesas-metrics.ts [packages/db/src/queries/despesas-metrics.ts:265]

---

## Change Log

- **2026-08-27:** Finalização integral da Story 6.4 com layout em 3 atos, auditoria minuciosa de passivos reais de 2026 no banco de dados (shows/eventos com R$ 1,065mi em dívida real), gráfico stacked de credores de restos a pagar e tipografia consistente.
