---
title: 'Educação: bloco "De onde vem o dinheiro" (origem dos recursos)'
type: 'feature'
created: '2026-10-18'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '83fa36a174bc20d8b0cac859ed45839197652f59'
context:
  - '{project-root}/_bmad-output/planning-artifacts/arquitetura-educacao-origem-recursos.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-transparencia-2026-10-18/EXPERIENCE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-transparencia-2026-10-18/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A página de Educação não mostra de onde vem o dinheiro do Fundo Municipal de Educação. Além disso, `int_receitas_consolidadas` soma duas vezes as linhas-folha de `receita_orcamentaria` (linha "total" sem fonte STN + linhas de detalhe por fonte STN), inflando em ~2× qualquer leitura por código-folha.

**Approach:** Corrigir o dedupe no dbt (linha sem fonte STN vence; sem ela, soma dos detalhes), criar o mart `fct_educacao_origem_recursos_metricas` e a query Kysely `getEducacaoOrigemRecursos`, e renderizar o bloco entre Fiscal e Contratos conforme a UX da Sally. O aporte da Prefeitura (`fct_transferencias`) fica fora desta versão. Decisão do humano após a revisão: a diferença entre a soma das folhas e o total oficial (`1000.00` + `2000.00`) aparece como a fonte `nao_detalhado`, para o total do bloco fechar com a receita oficial.

## Boundaries & Constraints

**Always:** Banco somente local (`localhost:5544` ou `testing.postgresql`). Escopo do órgão por `dim_orgao.orgao_nome ilike '%edu%'` com join `portal_slug` + `empresa_id`. Só `tipo_receita = 'orcamentaria'` e só folhas. `grupo_fonte` em lowercase snake_case; UI traduz rótulos. Percentuais, `anoMin`/`anoMax` e nome do fundo vêm da camada de dados. Estilo funcional em `packages/db`. Leis com link oficial do Planalto, validado com `curl`. `fmtCompact` nos cards, `fmtCurrency` nos detalhes.

**Never:** Hard-code de município, UF, ano ou lista de portais. Somar entre `tipo_receita`. Expor `repasse_prefeitura`. Lógica de classificação ou soma na UI. Referências a story/task em código ou commits.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Linha total + detalhes iguais | Mesmo código com 1 linha sem fonte STN e N com fonte STN | `arrecadado` = valor da linha total | N/A |
| Detalhe parcial | Total maior que a soma dos detalhes | `arrecadado` = valor da linha total | N/A |
| Só detalhes | Sem linha sem fonte STN | `arrecadado` = soma dos detalhes | N/A |
| Conciliação | Fundo com receitas no ano | Soma dos grupos, incluindo `nao_detalhado`, = `1000.00` + `2000.00` (±R$ 0,01) | Teste falha |
| Resíduo | Linha-mãe maior que a soma das folhas | Grupo `nao_detalhado` com a diferença (só se > R$ 0,01); ausente quando as folhas fecham | N/A |
| Fonte sem valor | Grupo ausente no ano | Grupo não aparece em `fontes`; card esmaecido não clicável | N/A |
| Portal sem fundo | Nenhum `orgao_nome ilike '%edu%'` | Query retorna `null`; bloco não renderiza | N/A |

</frozen-after-approval>

## Code Map

- `elt/transform/models/staging/{porciuncula,natividade}_prefeitura/stg_*__receita_orcamentaria.sql` -- expor `fonte_stn` = `nullif(trim(coalesce(fontestn, fonte_stn)), '')`; raw já tem as duas colunas.
- `elt/transform/models/intermediate/int_receitas_consolidadas.sql` -- aplicar o dedupe antes do `group by`; corrigir o comentário do cabeçalho. Não alterar os CTEs `uniao`, `estado`, `extra_orcamentaria`.
- `elt/transform/models/marts/metrics/fct_fontes_receita_metricas.sql` -- padrão de seleção de folhas (`not exists` com `rtrim(codigo,'0.')`); reutilizar o critério, não mudar o modelo.
- `elt/transform/models/marts/metrics/fct_educacao_metricas.sql` + `_fct_educacao_metricas.yml` -- convenção de mart e schema yml.
- `elt/tests/test_fct_educacao_metricas.py` e `conftest.py` -- padrão de teste pytest (`conn`, seed em `raw_*`, schema `analytics`).
- `packages/db/src/queries/educacao-metrics.ts` e `__tests__/educacao-metrics.spec.ts` -- padrão de query/DTO e spec.
- `apps/web/app/[portalSlug]/educacao/{loader,view-model,page}.ts(x)` -- `Promise.all` do loader (linha ~85), view-model e ordem das seções (Fiscal → Contratos).
- `apps/web/components/educacao/educacao-contratos-section.tsx`, `categoria-contrato-card.tsx`, `contratos-categoria-modal.tsx` -- padrão de card/modal a reaproveitar.

## Tasks & Acceptance

**Execution:**
- [x] `elt/tests/test_receitas_dedupe.py` -- teste vermelho: seed raw com total+detalhes, detalhe parcial e só detalhes; conciliação das folhas com `1000.00` -- prova o bug antes da correção
- [x] `stg_*__receita_orcamentaria.sql` (2) e `int_receitas_consolidadas.sql` -- carregar `fonte_stn` e deduplicar -- corrige a dobra
- [x] `elt/transform/models/marts/_fct_receitas.yml` -- teste de conciliação por `(portal_slug, ano, empresa_id)` -- trava regressão
- [x] `elt/transform/models/marts/metrics/fct_educacao_origem_recursos_metricas.sql` + `.yml` -- grão `portal_slug, ano, empresa_id, grupo_fonte, codigo_natureza`; classificação por prefixo conforme a arquitetura (`1751`→`fundeb`, `1715`→`fundeb_complementacao_uniao`, `1714.50`→`salario_educacao`, `1714.52`→`pnae`, `1714.53`→`pnate`, demais `1714`→`outros_fnde`, resto→`outras_receitas`); testes `not_null`, `accepted_values`, unicidade
- [x] `elt/tests/test_fct_educacao_origem_recursos_metricas.py` -- valores e isolamento por tenant -- cobre a matriz
- [x] `packages/db/src/queries/educacao-origem-recursos.ts`, `index` e `__tests__/educacao-origem-recursos.spec.ts` -- `getEducacaoOrigemRecursos` com DTO da arquitetura, `null` sem fundo
- [x] `apps/web/app/[portalSlug]/educacao/{loader,view-model,page}` -- carregar e repassar o DTO
- [x] `apps/web/components/educacao/` -- `educacao-origem-recursos-section.tsx`, `composicao-recursos-bar.tsx`, `fonte-recurso-card.tsx`, `fonte-recurso-modal.tsx` e specs, conforme EXPERIENCE/DESIGN
- [x] `llms.txt`, `llms-full.txt`, `CHANGELOG.md` -- novo indicador, correção do dedupe e entrada pendente de contratos por categoria

**Acceptance Criteria:**
- Given o raw de Porciúncula 2025, when `make dbt/run` local, then a soma das folhas do Fundo é R$ 16.951.446,05 e `1751.50` é R$ 14.626.293,57.
- Given um portal com Fundo de Educação, when a página abre, then o bloco mostra barra e cards entre Fiscal e Contratos, com `fmtCompact`, e "Ver detalhes" abre o modal com ano a ano, composição e lei.
- Given um portal sem Fundo, when a página abre, then o bloco não aparece.
- Given as mudanças, when `make test`, `make check`, `pnpm test` e `tsc --noEmit`, then tudo passa.

## Implementation Notes

- Critério de folha invertido em relação a `fct_fontes_receita_metricas`: aquele `not exists` mantém as raízes (`1000.00`, `2000.00`). Aqui folha é a linha sem código mais longo sob `rtrim(codigo,'0.')` na mesma entidade/ano. A afirmação anterior de que a soma das folhas fechava com o topo em Porciúncula 2024/2025 foi medida com o critério das raízes e não provava nada; a medição correta (21 grupos portal/ano/empresa divergem no banco local) está no teste dbt.
- `receitas_folhas_conciliam_com_topo` está com `severity: warn`: em alguns códigos a linha principal `.00.00` é maior que a soma dos filhos (resíduo ~R$ 0,1 mi em 2022 e 2023 do Fundo). Fundo de Porciúncula 2025: R$ 16.951.446,05, fecha. Decisão pendente sobre o resíduo.
- `_sources.yml` dos dois portais ganhou `fontestn`/`fonte_stn`; a PK de Porciúncula passou a incluir `fontestn`. `schema.sql.gz` regenerado (ruído de nomes de índices).
- URL do PNATE corrigida para `l10.880.htm` em `educacao-contratos-section.tsx`, `llms.txt`, `llms-full.txt`. Links do Planalto não puderam ser validados por `curl` na revisão (sem rede no sandbox); o subagente reportou HTTP 200.
- Teste de dedupe não foi executado contra o modelo antigo (vermelho não demonstrado).

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Rota | Evidência |
|---|---|---|---|
| Total=0 com detalhes >0 é zerado pela regra "total vence" | medium | patch | Reproduzido no raw: Natividade `1713.50.1.1.02.00` (2023–2025, ~R$ 0,7–0,9 mi/ano) e Porciúncula `1321.01.0.1.02.00` (2024). Antes da mudança esses códigos somavam certo. |
| Natividade sem teste de dedupe (`fonte_stn` pode regredir sem falhar) | medium | patch | `test_receitas_dedupe.py` só semeia Porciúncula. |
| "Outras" duplicado na barra quando `outras_receitas` ≥ 3% | low | patch | `montarSegmentos` cria segmento "Outras" com a mesma cor de `outras_receitas`. |
| Barra sem asserção de aria-label/agrupamento | low | patch | Spec só checa `role="img"`. |
| Período "Ano a ano" usa `anoMin–anoMax` do portal, não da fonte | low | patch | `fonte-recurso-modal.tsx:33-35`. |
| Largura negativa na mini-barra | low | patch | Correção direta com `Math.max(0, …)`. |
| Aporte da Prefeitura ausente sem aviso visível | medium | patch | Subtítulo não diz o que fica de fora; só o `llms-full.txt` diz. |
| JSDoc fora do lugar em `seed.ts` | low | patch | Confirmado no diff. |
| Id do painel fiscal duplicado | low | patch | Literal + constante. |
| Teste `receitas_folhas_conciliam_com_topo` em `warn` | medium | defer | 21 grupos divergem (resíduo ~R$ 0,1 mi 2022–2023 do Fundo). Decisão sobre o resíduo é do humano. |
| `rtrim(codigo,'0.')` frágil para códigos com zero significativo | low | defer | Mesmo padrão já usado em `fct_fontes_receita_metricas`; nenhuma folha do Fundo no banco local é afetada. |
| Grupo com total líquido negativo é descartado (`total > 0`) | maybe-false | defer | Sem códigos fora de `1`/`2` em `orcamentaria` no Fundo local; confirmar em dados reais de outros portais. |
| Ano corrente sem dados mostra estado neutro mesmo com histórico | low | defer | Comportamento previsto na spec ("Nenhuma receita registrada…"); o loader segue o padrão das outras seções. |
| Fan-out de `dim_orgao` ('%edu%' com 2+ linhas por empresa) | false | rejeitado | Consulta no banco local: nenhuma `(portal_slug, empresa_id)` duplicada. |
| Códigos 9xxx dedutores no Fundo | false | rejeitado | Nenhum código fora de `1`/`2` em `orcamentaria` no Fundo local. |
| Colunas `fontestn`/`fonte_stn` ausentes no raw | false | rejeitado | Ambos os raws têm as duas colunas e o loader as define; `_sources.yml` atualizado. |
| Falha da query derruba a página | false | rejeitado | Mesmo padrão das demais queries no `Promise.all` do loader. |
| Card vazio focável (`aria-disabled`) | false | rejeitado | Mesmo padrão do `CategoriaContratoCard`, definido na spec. |
| Percentuais arredondados somam 99/101% | low | rejeitado | Cosmético; correção exige mover agrupamento para a camada de dados. |
| Grupo fora da união TS | false | rejeitado | `accepted_values` no yml do mart. |
| `agruparPor` O(n²), constantes de ordem duplicadas, `ilike` repetido | low | rejeitado | Volume pequeno; sem dano nomeado. |
| `schema.sql.gz` sem a nova tabela | false | rejeitado | `gzip -dc … \| grep -c` encontra 4 ocorrências. |
| Scroll da âncora com modal aberto | maybe-false | rejeitado | Âncora comum; `onClose` roda no mesmo clique. Sem evidência de falha. |

## Design Notes

Prefixos de natureza seguem o plano de contas padrão (MCASP); a tabela vive em um único CASE no mart. Aporte da Prefeitura adiado porque `fct_transferencias` reporta valores que não conciliam entre os dois lados.

## Verification

**Commands:**
- `make test` -- expected: pytest verde, incluindo dedupe e conciliação
- `make check` -- expected: lint/format/type-check sem erros
- `pnpm test` -- expected: specs de `packages/db` e `apps/web` verdes
- `pnpm exec tsc --noEmit` (em `apps/web` e `packages/db`) -- expected: sem erros
- `curl -sI <url do Planalto>` -- expected: HTTP 200 para cada lei citada
