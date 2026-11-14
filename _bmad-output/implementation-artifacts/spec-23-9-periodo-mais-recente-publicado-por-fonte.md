---
title: 'Período mais recente publicado por fonte ("Dados até")'
type: 'feature'
created: '2026-11-14'
status: 'in-review'
baseline_commit: '1e347949e97c3180a28fe7a97a4666f83f665eb4'
route: 'dispatch'
review_loop_iteration: 0
context: ['{project-root}/.claude/rules/dbt-sql.md']
---

# Story 23.9: Período Mais Recente Publicado por Fonte

Fonte dos critérios: `_bmad-output/planning-artifacts/epics.md`, seção "Story 23.9".

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** a situação da 23.2 mede quando o portal buscou a fonte, não quando a fonte publicou: se o Tesouro parar de publicar, a coleta continua "em dia". O cidadão não sabe até quando vão os números ("Até quando vão estes números?").

**Approach:** o mart `fct_coletas_por_fonte` passa a trazer, para `siconfi_msc`, `siconfi_rgf` e `farmacia_sus`, o período mais recente do próprio mart (isolado por `portal_slug`) e a granularidade; o catálogo ganha a defasagem esperada de publicação. `getFrescorFontes` devolve `periodoMaisRecente`, `granularidadePeriodo` e `situacaoDado` contra a data de referência passada como parâmetro.

## Boundaries & Constraints

**Always:** cálculo do período no dbt (Regra 14); defasagem no seed `seed_fontes_coleta`, marcada "NÃO VERIFICADO" no CSV/seeds.yml e tratada como estimativa; sem literal de tenant, UF ou ano; join com `portal_slug` no predicado; códigos em snake_case; fontes sem período ficam `periodo_nao_disponivel`, nunca presumidas; data de referência como parâmetro.

**Never:** tela (o selo da 23.4 muda depois); período para outras fontes; confirmar prazos com as fontes; mudar `situacao` da 23.2 nem os campos existentes do DTO; rodar dbt em produção.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Recente | fim do período + defasagem ≥ data de referência | `situacaoDado: dado_recente` | N/A |
| Fronteira | dias entre fim do período e referência = defasagem | `dado_recente`; com defasagem + 1, `dado_defasado` | N/A |
| Defasado | passou da defasagem | `dado_defasado` | N/A |
| Sem período | fonte fora das três, ou portal sem dados | `periodoMaisRecente: null`, `periodo_nao_disponivel` | N/A |
| Sem defasagem no catálogo | período existe, defasagem nula | `periodo_nao_disponivel` (não presume) | N/A |
| Referência inválida | `dataReferencia` não é data | lança erro, como na 23.2 | já existente |

</frozen-after-approval>

## Code Map

- `elt/transform/seeds/seed_fontes_coleta.csv` -- nova coluna `defasagem_publicacao_dias` (vazia nas fontes sem período).
- `elt/transform/seeds/seeds.yml:249` -- `column_types` (integer) e descrição "estimativa, NÃO VERIFICADO".
- `elt/transform/models/marts/fct_coletas_por_fonte.sql` -- CTE `periodos_publicados` (union das três fontes por `portal_slug`) e left join; novas colunas `periodo_mais_recente_fim` (date), `granularidade_periodo`, `defasagem_publicacao_dias`.
- `elt/transform/models/marts/_fct_coletas_por_fonte.yml` -- contrato `enforced`; declarar as três colunas; `accepted_values` da granularidade (`dia`, `mes`, `quadrimestre`, `semestre`).
- Origens: `marts/financeiro/fct_saldo_caixa_siconfi.sql` (MSC: fim do mês de `ano`+`mes_referencia`); `marts/metrics/fct_pessoal_rgf_metricas.sql` (RGF: `ano`, `periodicidade`, `periodo` → fim do quadrimestre/semestre); `marts/fct_farmacia_estoque.sql` (`data_posicao_mais_recente`, granularidade `dia`).
- `elt/tests/test_fct_coletas_por_fonte.py` -- fixtures `portais`/`coleta`; asserir período por fonte e isolamento entre portais.
- `packages/db/src/queries/frescor-fontes.ts` -- `FrescorFonteLinha`, `montarFrescorFontes` (reusar `diasDeCalendario`), `getFrescorFontes` (select das novas colunas).
- `packages/db/src/queries/__tests__/frescor-fontes.spec.ts` -- padrão de inserção em `fct_coletas_por_fonte`.
- `apps/web/lib/frescor-fontes.ts` e specs de web com DTO tipado -- só ajustar fixtures se o typecheck exigir.

## Tasks & Acceptance

**Execution:**
- [x] `seed_fontes_coleta.csv` + `seeds.yml` -- coluna `defasagem_publicacao_dias`: `siconfi_msc` 60, `siconfi_rgf` 45, `farmacia_sus` 7 (estimativas NÃO VERIFICADO)
- [x] `fct_coletas_por_fonte.sql` + `_fct_coletas_por_fonte.yml` -- período mais recente, granularidade e defasagem, com contrato
- [x] `test_fct_coletas_por_fonte.py` -- período das três fontes, fonte sem período nula, dois portais sem vazamento
- [x] `frescor-fontes.ts` -- DTO ganha `periodoMaisRecente` (AAAA-MM-DD ou null), `granularidadePeriodo`, `situacaoDado` (`dado_recente | dado_defasado | periodo_nao_disponivel`)
- [x] `frescor-fontes.spec.ts` -- matriz I/O inteira, incluindo a fronteira exata e dois portais
- [x] fixtures de `apps/web` -- só se o typecheck quebrar

**Acceptance Criteria:**
- Given `make dbt/seed` e `make dbt/run` no banco local, when o mart é consultado, then MSC, RGF e farmácia de um portal com dados trazem período e granularidade, e as demais fontes trazem nulo.
- Given as mudanças, when `make test`, `make check`, `make db/test/build`, `make test/ts` e `pnpm typecheck` rodam, then todos passam.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

Dias de defasagem = diferença de calendário entre `dataReferencia` e `periodoMaisRecente`; `dado_defasado` quando `> defasagem_publicacao_dias`. O período é o **fim** do intervalo (último dia do mês, do quadrimestre ou do semestre; a própria data na farmácia), então a defasagem conta desde o fechamento. Valores de defasagem: MSC e RGF seguem os prazos de envio ao Siconfi com folga; farmácia, a rotina diária com tolerância de fim de semana. Todos estimativas, a UI deve dizer isso (Regra 27). Fonte de MSC = saldo de caixa (`fct_saldo_caixa_siconfi`), o mart MSC que alimenta receitas; se a MSC de outro mart avançar mais, a 23.9 não o vê (limite aceito).

## Verification

**Commands:**
- `make dbt/seed && make dbt/run` -- expected: sucesso no banco local
- `make test && make check` -- expected: verde
- `make db/test/build && make test/ts && pnpm typecheck` -- expected: verde
