---
title: 'Origem das "Entradas Fora do Orçamento" em Receitas'
type: 'feature'
created: '2026-11-01'
status: 'done'
baseline_revision: 'c9bc8325b9445222e7f367366718a690211be7df'
review_loop_iteration: 0
followup_review_recommended: false
context: ['{project-root}/.claude/rules/dbt-sql.md', '{project-root}/DESIGN.md']
warnings: []
deferred:
  - summary: >-
      Teste da query de origem não exercita dados reais no banco de testes (vazio).
    evidence: |-
      postgres_test é construído só com tabelas raw vazias (regra 21); a query foi validada contra o banco local 5544.
    location: >-
      packages/db/src/queries/__tests__/receitas-extra-metrics.spec.ts
    severity: low
  - summary: >-
      Não há spec de página para /receitas cobrindo o bloco.
    evidence: |-
      Cobertura em view-model.spec.ts e no spec do componente; página não renderizada de ponta a ponta.
    location: >-
      apps/web/app/[portalSlug]/receitas/page.spec.tsx
    severity: low
---

<intent-contract>

## Intent

**Problem:** Em `/receitas` a linha "Entradas fora do orçamento" mostra um valor alto (ex.: R$ 13,7 mi) sem dizer de onde vem; o cidadão não entende que é dinheiro retido e repassado.

**Approach:** Classificar cada lançamento de `fct_receita_extra_orcamentaria` em categoria (lowercase snake_case) no dbt, expor por `portalSlug`/`ano` um DTO (`categoria`, `valorArrecadado`, `percentualDoTotal`) em `@transparencia/db` e renderizar na linha um bloco recolhido "De onde vem este valor".

## Boundaries & Constraints

**Always:** classificação só no dbt/`@transparencia/db` (UI burra, traduz rótulos); sem literais de município/UF/ano; join/agrupamento com `portal_slug`; categoria desconhecida cai em `outros_descontos`; soma das categorias = `receitaExtraOrcamentariaArrecadado`; nenhum nome de banco/plano/beneficiário na tela; dbt só no banco local.

**Never:** incluir as entradas no total arrecadado; listar lançamentos individuais; mexer na carga/extração; executar em produção.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Classificação | "CAPREM", "I.R.R.F. …", "(6790) I.N.S.S.", "UNIMED", "EMPRÉSTIMO CEF", "ISSQN", "PENSÃO ALIMENTÍCIA" | `previdencia_servidores`, `imposto_renda_retido`, `previdencia_geral_inss`, `plano_saude_servidores`, `emprestimo_consignado`, `iss_retido`, `pensao_alimenticia` | — |
| Desconhecida | "CAUÇÕES E GARANTIAS" / descrição nula | `outros_descontos` | nunca descartada |
| Sem entradas | portal/ano sem lançamentos | DTO `[]`; bloco não aparece | — |
| Isolamento | portal A e B com mesmo `empresa_id` | totais independentes | — |

</intent-contract>

## Code Map

- `elt/transform/models/marts/fct_receita_extra_orcamentaria.sql` -- mart de lançamentos (grão portal/empresa/ano/código/descrição); fonte da classificação.
- `elt/transform/models/marts/_fct_receita_extra_orcamentaria.yml` -- contrato do mart; modelo novo segue o padrão.
- `elt/transform/macros/data_iso_valida.sql` -- exemplo de macro; nova macro de classificação.
- `elt/transform/models/marts/metrics/fct_fontes_receita_metricas.sql:78` -- total extra vem de `fct_receitas` (mesma fonte; totais conferidos iguais no banco local).
- `packages/db/src/queries/receitas-extra-metrics.ts` -- query atômica atual; receberá a nova.
- `packages/db/src/queries/__tests__/receitas-extra-metrics.spec.ts` -- padrão de teste (PORTAL_SLUG/TEST_YEAR).
- `apps/web/app/[portalSlug]/receitas/{loader,view-model,page}.ts(x)` -- loader → view-model → page.
- `apps/web/components/previsto-vs-arrecadado.tsx` -- linha "Entradas fora do orçamento" (`semPrevisao`).
- `docs/glossario-cidadao.md`, `apps/web/public/llms.txt`, `llms-full.txt` -- documentação a atualizar.

## Tasks & Acceptance

**Execution:**
- `elt/transform/macros/classificar_receita_extra_orcamentaria.sql` -- macro com `unaccent(lower())` + regex ordenada (IRRF, INSS, ISS, pensão, empréstimo, plano de saúde, previdência) com `else 'outros_descontos'`.
- `elt/transform/models/marts/fct_receita_extra_orcamentaria_categoria.sql` + `.yml` -- grão `portal_slug, empresa_id, ano, categoria`; contrato, testes (unique, not_null, accepted_values).
- `elt/transform/tests/assert_receita_extra_categoria_soma_total.sql` -- soma das categorias = total do mart por portal/ano.
- `packages/db/src/queries/receitas-extra-metrics.ts` -- `getReceitaExtraOrcamentariaOrigem(portalSlug, ano, empresaIds)` → `{categoria, valorArrecadado, percentualDoTotal}[]` decrescente.
- `packages/db/src/queries/__tests__/receitas-extra-metrics.spec.ts` -- soma = `receitaExtraOrcamentariaArrecadado`, ordenação, `[]`, isolamento, categoria desconhecida.
- `apps/web/app/[portalSlug]/receitas/{loader,view-model}.ts` -- carregar DTO e repassar à linha.
- `apps/web/components/previsto-vs-arrecadado.tsx` -- `<details>` fechado "De onde vem este valor", rótulos cidadãos, barra e %; texto sem afirmação categórica.
- specs web/UI, glossário e `llms*.txt` -- atualizar.

**Acceptance Criteria:**
- Given lançamentos de dois portais, when classificados, then cada um recebe categoria snake_case e a soma bate com o total.
- Given o DTO, when `/receitas` abre, then a linha tem bloco recolhido, ordenado, acessível por teclado, sem nomes de banco/plano.
- Given nenhuma entrada, then o bloco não aparece.

## Spec Change Log

## Review Triage Log

### 2026-11-01 — Review pass
- verdicts: 30 findings (blind 11, edge 15, gap 2, intent 2 observações) — high 0, medium 3, low 4, false 0, maybe-false 2; demais rejeitados como duplicados ou fora do ponto
- findings:
  - `[medium]` `patch` categorias com soma zero/negativa descartadas quebravam a soma com o total — filtro trocado para `!== 0`, barra limitada a 0–100%.
  - `[medium]` `patch` `pens[ao]` casava "compensação"/"dispensa" — regex com `\mpens(ao|oes)\M` e caso negativo no teste dbt.
  - `[low]` `patch` precedência de regras sem teste — casos "REGULARIZAÇÃO IRRF" e "COMPENSAÇÃO" adicionados.
  - `[low]` `patch` `llms-full.txt` sem `regularizacao_conciliacao`; CHANGELOG sem entrada — ambos atualizados.
  - `[medium]` `patch` falha da nova query derrubaria `/receitas` — `.catch(() => [])` no loader (bloco é opcional).
  - `[low]` `reject` `^iss` casar prefixo — descrições reais iniciadas em "iss" são todas ISS; sem dano demonstrado.
  - `[false]` `reject` `sum` nulo violaria contrato — `valor_arrecadado` é `not_null` no mart de origem.
  - `[false]` `reject` rótulos duplicados para categoria desconhecida — `accepted_values` impede categoria fora da lista.
  - `[low]` `reject` guardar origem quando total zero — query usa os mesmos filtros do total.
  - `[maybe-false]` `defer` teste da query passa vazio no `postgres_test` (sem dados, regra 21) — cobertura real só rodando no banco local 5544.
  - `[maybe-false]` `defer` sem spec de página para `/receitas` — view-model e componente cobertos.
  - `[low]` `reject` demais observações de estilo (classes, pergunta do cidadão) — o título "De onde vem este valor" é exigido pela story.

## Verification

**Commands:**
- `make db/test/build && make test` -- expected: dbt e testes passam
- `make test/ts && pnpm typecheck` -- expected: verdes

## Auto Run Result

Status: done

**Resumo:** classificação das entradas fora do orçamento em 9 categorias no dbt (as 8 do spec mais `regularizacao_conciliacao`, criada porque ~R$ 10 mi de "regularização de valor conciliado" não são retenção de terceiros), query `getReceitaExtraOrcamentariaOrigem` com `percentualDoTotal`, e bloco recolhido "De onde vem este valor" em `/receitas`.

**Arquivos:** macro `classificar_receita_extra_orcamentaria`; mart `fct_receita_extra_orcamentaria_categoria` (+yml); testes dbt de soma e de classificação; `receitas-extra-metrics.ts` (+spec); loader/view-model de `/receitas`; `previsto-vs-arrecadado.tsx` (+spec); glossário, `llms*.txt`, CHANGELOG.

**Review:** 5 patches aplicados, 2 deferidos (baixa severidade), demais rejeitados com motivo no log. `followup_review_recommended: false`.

**Conferência contábil/texto:** a distribuição real mostrou que `outros_descontos` e regularizações incluem lançamentos que não são retenção de terceiros; por isso a frase passou a "em regra não é dinheiro da prefeitura", com aviso de classificação aproximada. Revisão formal pelos agentes `contador-publico` e `editor-cidadao` não foi executada como subagente; recomenda-se passar os rótulos por eles antes de publicar.

**Verificação (banco local 5544 / teste 5545):** `make test` 203 passed; vitest `packages/db` 342 passed; vitest web de receitas 20 passed; `pnpm typecheck` ok; dbt run/test do mart e testes singulares 15/15 PASS.

**Riscos residuais:** regex heurística (descrições novas caem em `outros_descontos`); nada foi executado em produção; o mart precisa de `dbt run` em produção (com autorização) antes do deploy web (o loader degrada para bloco oculto).
