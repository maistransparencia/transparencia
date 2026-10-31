---
title: 'Reorganização da página de Educação no padrão da Saúde'
type: 'feature'
created: '2026-10-31'
status: 'in-review'
route: 'dispatch'
baseline_commit: 'c620865afa2f6642950e6e8df7f77b52868a00fd'
review_loop_iteration: 0
context:
  - '{project-root}/DESIGN.md'
  - '{project-root}/EXPERIENCE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-educacao-pagina.md'
  - '{project-root}/_bmad-output/planning-artifacts/inventario-indicadores-educacao.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A página `/educacao` fala em liquidado, IDEB e troféu cívico antes do dinheiro, usa cópias locais de componentes e mistura contratos de outros órgãos sob o título do Fundo.

**Approach:** Reordenar a página como a da Saúde (hero reservado/pago, painel de 4, O que entrou, evolução anual, contratos do Fundo, fornecedores, aprendizado, emendas), com dados novos em `@transparencia/db` e a conta de "pago por aluno" no dbt. Fontes de verdade: `ux-educacao-pagina.md` (§10) e `inventario-indicadores-educacao.md` (§9).

## Boundaries & Constraints

**Always:** regras 2, 9, 12, 14, 17, 18, 20, 23, 24, 26, 27 e DESIGN.md/EXPERIENCE.md. Universo do hero e das séries: função 12 da Prefeitura, `fonte = 'exercicio'`. Pago por aluno = pago da função 12 sem subfunção 364 ÷ matrículas do Censo do mesmo ano, só ano encerrado, rotulado estimativa. Rótulos de média/ranking dinâmicos. Banco só local. Commits convencionais sem story/task.

**Never:** manter `despesa_liquidada_educacao` e `custo_anual_por_aluno` em `fct_educacao_metricas` (decisão: remover, ajustando contrato dbt, testes Python, `seed.ts` e DTOs); alerta de subexecução; mínimos de 25% e 70% do FUNDEB; média estadual ou ranking de pago por aluno; UF, município ou intervalo de anos fixos; `ComposicaoRecursosBar` em "O que entrou".

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ano encerrado | ano < corrente, função 12 com pago e matrículas | h1 "reservou X e pagou Y"; Pago por aluno com valor | N/A |
| Ano corrente | ano = corrente | eyebrow "PARCIAL"; Pago por aluno "—" com nota "só calculado para anos encerrados" | N/A |
| Sem matrícula do Censo no ano | ano encerrado sem linha no seed | Pago por aluno "—" com a causa na nota | nunca dividir por zero |
| Sem fornecedores | função 12 sem pago a fornecedor | frase neutra da seção | N/A |
| Sem IDEB no ano | etapa sem nota no ano | última nota com o ano de apuração; meta ausente "—" | nunca apresentar como do ano corrente |
| Contratos do Fundo | `empresa_id` do órgão "Fundo ... Educação" | só contratos dessa empresa | sem Fundo identificado: lista vazia |

</frozen-after-approval>

## Code Map

- `elt/transform/models/marts/metrics/fct_educacao_metricas.sql` -- grão portal/ano/etapa IDEB; usa liquidado
- `elt/tests/test_fct_educacao_metricas.py`, `_fct_educacao_metricas.yml` -- padrão de teste e contrato dbt
- `elt/transform/models/marts/metrics/` -- novo `fct_educacao_execucao_metricas` (portal/ano: empenhado, liquidado, pago, pago por subfunção, pago sem ensino superior, matrículas, pago por aluno)
- `packages/db/src/queries/educacao-metrics.ts` -- `getEducacaoContratos` (L820), `getEducacaoRankingEstadual` (L336, já aceita `etapaEnsino`), `getResumoEducacao` (L199)
- `packages/db/src/queries/despesas-metrics.ts:535` -- `getTopFornecedoresExecucaoMetrics` (por `empresa_id`); modelo para a versão por função 12
- `packages/db/src/queries/historia-saude-metrics.ts` -- `getSaudeExecutionTrendMetrics`, modelo da série anual
- `dim_orgao` local: Fundo = `FUNDO MUNICIPAL DE EDUCAÇÃO[ E CULTURA]` (empresa 5 Natividade, 8 Porciúncula)
- `apps/web/app/[portalSlug]/educacao/{page,loader,view-model}.ts(x)` e specs
- `apps/web/components/educacao/*` -- hero, histórico, fiscal (sai), origem recursos, contratos
- `apps/web/components/saude-{evolucao-anual,emendas-section}.tsx` (+specs) -- renomear; `@/components/section-header` vs `packages/ui`
- `apps/web/public/llms.txt`, `llms-full.txt`, `CHANGELOG.md`, `docs/glossario-cidadao.md`

## Tasks & Acceptance

**Execution:**
- [ ] `packages/db/src/queries/educacao-metrics.ts` -- medir contagem atual de `getEducacaoContratos` por portal/ano; restringir ao `empresa_id` do Fundo; registrar antes/depois -- decisão do usuário (inventário §9.1)
- [ ] `elt/transform/models/marts/metrics/fct_educacao_execucao_metricas.sql` + `.yml` + teste Python -- pago por aluno e pago por subfunção no dbt (`make test`, `make check`)
- [ ] `packages/db/src/queries/educacao-metrics.ts` -- série anual, fornecedores função 12, ranking por etapa, pago por subfunção; specs em `__tests__`
- [ ] `apps/web/components/` -- renomear `EvolucaoAnual` e `EmendasSection` (saúde, imports, specs); unificar `SectionHeader` em `@transparencia/ui`
- [ ] `apps/web/app/[portalSlug]/educacao/` -- loader, view-model e page na ordem do UX; remover `EducacaoFiscalSection`, troféu e KPIs antigos; hero, painel de 4, "Ver detalhes" do pago por aluno
- [ ] `apps/web/public/llms*.txt`, `CHANGELOG.md`, `docs/glossario-cidadao.md` -- IDEB (§11 do UX)
- [ ] Revisão de texto cidadão (editor-cidadao) e contábil (contador-publico) nos textos e cálculos novos

**Acceptance Criteria:**
- Given ano encerrado, when abrir `/educacao`, then h1 traz reservado e pago da função 12 e "Pago por aluno" exibe valor com aviso de estimativa em "Ver detalhes"
- Given ano corrente, when abrir, then "Pago por aluno" é "—" e o eyebrow indica parcial
- Given dois portais, when comparar, then nenhum valor cruza tenant e nenhum literal de UF/ano aparece
- Given `make test`, `make check`, `make test/ts`, `pnpm typecheck`, then todos passam

## Implementation Notes

Pago por aluno e total de alunos retirados depois da implementação: o seed `seed_censo_escolar_matriculas` não tinha fonte rastreável e divergia do SIOPE (ver `planning-artifacts/spike-siope-valor-por-aluno.md`). A fonte passa a ser a epic do SIOPE.

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `make test && make check` -- expected: verde
- `make test/ts && pnpm typecheck` -- expected: verde
