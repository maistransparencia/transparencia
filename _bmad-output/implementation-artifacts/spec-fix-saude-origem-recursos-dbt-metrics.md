---
title: 'Fix Saúde Origem dos Recursos Chart Discrepancy'
type: 'bugfix'
created: '2026-08-06'
status: 'in-progress'
baseline_commit: 'b790690b6eb5e83d5a652df877d73242bfdb6283'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O gráfico de "Origem dos Recursos" na página da Saúde apresentou valores totalmente distorcidos em relação à produção (95% União, 5% Estado, 0% Própria em vez de ~40% União, ~2% Estado, ~58% Própria/Repasse). Isso ocorreu porque a função `getSaudeFontesReceitaMetrics` estava somando dados de `tipo_receita = 'orcamentaria'` por cima dos dados de `tipo_receita = 'uniao'` e `tipo_receita = 'estado'`, gerando contagem dupla de receitas.

**Approach:** Ajustar `getSaudeFontesReceitaMetrics` em `packages/db/src/queries/historia-saude-metrics.ts` para isolar e sumarizar corretamente as transferências federais (União) e estaduais (Estado) de `fct_receitas` sem dupla contagem com linhas analíticas orçamentárias, calculando o repasse municipal/propria como a diferença em relação ao total empenhado na saúde.

## Boundaries & Constraints

**Always:** Manter estrita conformidade com a camada de dados em `@transparencia/db/src/queries/` (AGENTS.md) e nomes de métricas claros em lowercase snake_case.

**Ask First:** Alterações em schemas de tabelas de marts dbt.

**Never:** Mutar estado localmente na UI sem atualizar a camada de inteligência contábil em `@transparencia/db`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Exercício com receitas de União e Estado | Fundo Municipal de Saúde (empresa_id = '2'), ano 2024 | uniaoSusPct ≈ 40%, estadoPct ≈ 2%, propriaPct ≈ 58% | Retorna objeto padrão zerado em erro de banco |
| Exercício sem lançamentos de receita | empresaIds vazio ou sem linhas no banco | uniaoSusPct = 0, estadoPct = 0, propriaPct = 0 | Retorna empty DTO |

</frozen-after-approval>

## Code Map

- `packages/db/src/queries/historia-saude-metrics.ts` -- Contém a função `getSaudeFontesReceitaMetrics` responsável pelo cálculo do DTO do gráfico de Origem dos Recursos na Saúde.
- `apps/web/app/[portalSlug]/saude/loader.ts` -- Loader da página de Saúde que consome `getSaudeFontesReceitaMetrics`.
- `apps/web/components/saude-fontes-donut.tsx` -- Componente UI que exibe o gráfico de rosca de Origem dos Recursos.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/db/src/queries/historia-saude-metrics.ts` -- Corrigir a agregação de receitas em `getSaudeFontesReceitaMetrics` eliminando a dupla contagem entre `tipo_receita in ('uniao', 'estado')` e `tipo_receita = 'orcamentaria'`.

**Acceptance Criteria:**
- Given portalSlug `porciuncula_prefeitura` e ano `2024`, quando `getSaudeFontesReceitaMetrics` for executado, os percentuais retornados refletem corretamente a proporção real de recursos (~40% União, ~2% Estado, ~58% Própria/Repasse).

## Verification

**Commands:**
- `pnpm build` -- expected: Sucesso sem erros de compilação TypeScript
- `make check` -- expected: Linters e validações estáticas passando
