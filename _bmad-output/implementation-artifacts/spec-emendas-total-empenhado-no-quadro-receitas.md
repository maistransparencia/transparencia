---
title: 'Total empenhado de emendas no quadro de emendas da página de receitas'
type: 'feature'
created: '2026-08-10T21:34:44-03:00'
status: 'in-progress'
review_loop_iteration: 0
baseline_commit: '7ba2ae0d13eeedb6dfcd81aff07a88364963e762'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O quadro de emendas parlamentares na página de receitas exibe apenas o valor *arrecadado* (recebido), omitindo o total *empenhado* — informação que evidencia o compromisso da prefeitura em destinar corretamente os recursos recebidos. A ausência desse dado cria uma lacuna de fiscalidade relevante para o cidadão.

**Approach:** Adicionar a coluna `emendas_total_empenhado` ao mart `fct_fontes_receita_metricas` a partir de `fct_emendas`, propagá-la pelo query TypeScript (`getFontesReceitaMetrics`), view-model e loader da página de receitas, e exibi-la no `EmendasCard` como linha de destaque com percentual de execução (empenhado / arrecadado).

## Boundaries & Constraints

**Always:**
- Seguir regras de nomenclatura: `emendas_total_empenhado` em SQL, `emendasTotalEmpenhado` em TypeScript — sem abreviações.
- A métrica deve usar `sum(empenhado)` de `fct_emendas`, já existente nessa tabela, filtrada por `portal_slug`, `empresa_id` e `ano`.
- O percentual de execução exibido na UI é `empenhado / arrecadado × 100`, tratando divisão por zero como 0.
- Toda formatação de labels e percentuais fica exclusivamente no componente React; a query retorna apenas números brutos.
- Manter programação funcional e imutável nas queries Kysely.

**Ask First:**
- Se `empenhado` em `fct_emendas` puder ser maior que `emendasTotalArrecadado` (ex: estornos, remanejamentos), antes de exibir a barra de progresso confirmar se deve capear em 100%.

**Never:**
- Não buscar `empenhado` da tabela de receitas orçamentárias — a fonte correta é exclusivamente `fct_emendas`.
- Não alterar o visual geral do card além de adicionar a nova linha de detalhe.
- Não criar nova query separada — aproveitar o join já existente em `emendas_fct` dentro de `fct_fontes_receita_metricas`.

## I/O & Edge-Case Matrix

| Cenário | Estado | Resultado esperado | Tratamento de erro |
|---------|--------|-------------------|-------------------|
| Emendas com empenhado > 0 | `emendas_total_empenhado > 0` | Barra de progresso com % execução | N/A |
| Nenhum dado empenhado | `emendas_total_empenhado = 0` | Barra vazia, valor "R$ 0" | Sem crash |
| Empenhado > arrecadado | `emendasTotalEmpenhado > emendasTotalArrecadado` | Barra capeada em 100%; valor numérico real exibido | N/A |
| Portal sem emendas | `emendasTotalArrecadado = 0` | Percentual = 0%, sem divisão por zero | Divisão por zero → 0% |

</frozen-after-approval>

## Code Map

- `elt/transform/models/marts/metrics/fct_fontes_receita_metricas.sql` — mart de métricas de receitas; CTE `emendas_fct` agrega `fct_emendas`; local para adicionar `sum(empenhado) as emendas_total_empenhado`
- `elt/transform/models/marts/fct_emendas.sql` — fonte de verdade com coluna `empenhado` por emenda
- `packages/db/src/queries/fontes-receita-metrics.ts` — query Kysely + DTO `FontesReceitaMetricsDTO`; adicionar campo `emendasTotalEmpenhado`
- `apps/web/app/[portalSlug]/receitas/loader.ts` — monta dados para a página; passa `emendasTotalEmpenhado`
- `apps/web/app/[portalSlug]/receitas/view-model.ts` — estado/fallback inicial; adicionar `emendasTotalEmpenhado: 0`
- `apps/web/app/[portalSlug]/receitas/view-model.spec.ts` — testes de paridade
- `apps/web/components/emendas-card.tsx` — componente React; adicionar prop + linha visual "Total Empenhado"
- `apps/web/app/[portalSlug]/receitas/page.tsx` — passa `emendasTotalEmpenhado` para `<EmendasCard>`

## Tasks & Acceptance

**Execution:**
- [ ] `elt/transform/models/marts/metrics/fct_fontes_receita_metricas.sql` — na CTE `emendas_fct`, adicionar `sum(empenhado) as emendas_total_empenhado`; no `calculos`, selecionar `emendas_total_empenhado::numeric(15,2) as emendas_total_empenhado`; no `select` final, incluir `emendas_total_empenhado` — expõe a métrica ao mart
- [ ] `packages/db/src/queries/fontes-receita-metrics.ts` — adicionar `emendasTotalEmpenhado: number` ao `FontesReceitaMetricsDTO`; adicionar `eb.fn.sum<string>("emendas_total_empenhado").as("emendas_total_empenhado")` na query; mapear `emendasTotalEmpenhado: Number(result.emendas_total_empenhado ?? 0)` no retorno
- [ ] `apps/web/app/[portalSlug]/receitas/view-model.ts` — adicionar `emendasTotalEmpenhado: 0` ao estado inicial de fallback
- [ ] `apps/web/app/[portalSlug]/receitas/loader.ts` — adicionar `emendasTotalEmpenhado: fontes.emendasTotalEmpenhado` na montagem do objeto de dados
- [ ] `apps/web/components/emendas-card.tsx` — adicionar prop `emendasTotalEmpenhado: number` à interface; calcular `execPct = emendasTotalArrecadado > 0 ? Math.min(100, (emendasTotalEmpenhado / emendasTotalArrecadado) * 100) : 0`; renderizar nova linha "Total Empenhado" com valor formatado, percentual e barra em amber para distinguir visualmente
- [ ] `apps/web/app/[portalSlug]/receitas/page.tsx` — passar `emendasTotalEmpenhado={rec.emendasTotalEmpenhado || 0}` para `<EmendasCard>`
- [ ] `apps/web/app/[portalSlug]/receitas/view-model.spec.ts` — adicionar caso verificando que `emendasTotalEmpenhado` é mapeado corretamente (incluindo fallback 0)

**Acceptance Criteria:**
- Dado um portal com emendas registradas, quando o usuário acessa a página de receitas, então o quadro "Recebido por emendas parlamentares" exibe uma linha "Total Empenhado" com o valor formatado e percentual de execução.
- Dado `emendasTotalEmpenhado = 0`, quando renderizado, então nenhum crash ocorre e a linha exibe "R$ 0" sem divisão por zero.
- Dado `emendasTotalEmpenhado > emendasTotalArrecadado`, quando renderizado, então a barra de progresso mostra 100% (capeada), mas o valor numérico exibido reflete o valor real.
- Dado a suite de testes TypeScript, quando `pnpm test` é executado, então todos os testes passam sem erros de tipagem.

## Spec Change Log

## Verification

**Commands:**
- `pnpm --filter @transparencia/db test` — expected: todos os testes passam
- `pnpm build` nos pacotes relevantes — expected: sem erros de tipagem
- `make test` — expected: modelos dbt compilam e executam no banco de testes sem erro
