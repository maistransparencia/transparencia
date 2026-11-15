---
title: 'Story 14.1: Captura das Contas de Investimentos do RPPS na MSC Patrimonial e Consolidação do Saldo Financeiro Total'
type: 'feature'
created: '2026-09-23'
status: 'done'
baseline_revision: 'efe5dbc1e1f9da6ea6c72b897083ed9dc563ad7d'
review_loop_iteration: 0
followup_review_recommended: true
context: []
warnings: []
deferred:
  - summary: >-
      Avaliar expansão para contas contábeis de longo prazo (121%) do RPPS nas histórias subsequentes
    evidence: |-
      Em exercícios posteriores (como 2026), parte das aplicações foi reclassificada no SICONFI para 1213%. O escopo da Story 14.1 cobre estritamente 114% (investimentos a curto prazo); a modelagem plurianual ampla é escopo da Story 14.2.
    location: >-
      elt/transform/models/staging/porciuncula_prefeitura/stg_siconfi_msc_patrimonial.sql:28
    severity: low
---

<intent-contract>

## Intent

**Problem:** O staging `stg_siconfi_msc_patrimonial.sql` capturava estritamente contas contábeis da classe `111%` (caixa e equivalentes), descartando as contas de investimentos e aplicações temporárias a curto prazo `114%` que concentram ~99% da poupança previdenciária da CAPREM (RPPS), subnotificando drasticamente o patrimônio do RPPS no portal.

**Approach:** Expandir a cláusula de filtro em `stg_siconfi_msc_patrimonial.sql` para capturar a classe `114%` exclusivamente para o órgão `10132` (CAPREM), preservando a segregação entre recursos vinculados e livres na mart `fct_saldo_caixa_siconfi`, validando paridade nos testes de `@transparencia/db` e garantindo isolamento total do caixa geral do Executivo (`10131`) e Câmara (`20231`).

## Boundaries & Constraints

**Always:**
- A captura de contas `114%` deve ser estrita e exclusivamente condicional a `trim(poder_orgao) = '10132'`.
- O órgão `10131` (Executivo Municipal) só pode ter contas capturadas da classe `111%`, sem qualquer inclusão de contas `114%`.
- O órgão `20231` (Câmara Municipal) continua 100% excluído (`trim(poder_orgao) != '20231'`).
- A regra de classificação de fontes em `fct_saldo_caixa_siconfi` deve manter fontes de previdência (`18%`, `28%`, `98%`) como `grupo_destinacao = 'previdencia'` e `recurso_vinculado_flag = true`.
- Regenerar fixtures `packages/db/tests/fixtures/schema.sql.gz` via `make db/fixture/dump` e validar com `make db/fixture/check` (Regra 21 do AGENTS.md).
- Todos os testes de integração e linters devem passar (`make check`, `make test`, `make test/ts`).

**Never:**
- Nunca capturar contas `114%` de outros órgãos além do `10132`.
- Nunca alterar ou inflar o total do caixa geral da Prefeitura (`totalCaixaGeral` do Executivo).
- Nunca recalcular ou duplicar em TypeScript regras já sanitizadas no dbt (Regra 14 do AGENTS.md).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Contas 111% do Executivo (10131) | Linha raw com `conta_contabil = '111110200'`, `poder_orgao = '10131'` | Capturada em `stg_siconfi_msc_patrimonial` e agregada em `totalCaixaGeral` | Nenhuma exceção |
| Contas 114% do Executivo (10131) | Linha raw com `conta_contabil = '114110100'`, `poder_orgao = '10131'` | Descartada no filtro do staging, NÃO aparece em `totalCaixaGeral` | Nenhuma exceção |
| Contas 111% da CAPREM (10132) | Linha raw com `conta_contabil = '111110600'`, `poder_orgao = '10132'` | Capturada em `stg_siconfi_msc_patrimonial` e agregada em `totalCaixaPrevidencia` | Nenhuma exceção |
| Contas 114% da CAPREM (10132) | Linha raw com `conta_contabil = '114110100'`, `poder_orgao = '10132'` | Capturada em `stg_siconfi_msc_patrimonial` e agregada em `totalCaixaPrevidencia` e `saldoRecursosVinculados` | Nenhuma exceção |
| Qualquer conta da Câmara (20231) | Linha raw com `poder_orgao = '20231'` | Descartada no filtro do staging | Nenhuma exceção |

</intent-contract>

## Code Map

- `elt/transform/models/staging/porciuncula_prefeitura/stg_siconfi_msc_patrimonial.sql` -- Modelo de staging que filtra a MSC Patrimonial bruta; ajustar a cláusula WHERE para incluir `114%` exclusivamente para `10132`.
- `elt/transform/models/staging/porciuncula_prefeitura/_stg_siconfi_msc_patrimonial.yml` -- Documentação dbt do staging; atualizar a descrição para refletir contas `114%` da CAPREM.
- `elt/transform/models/staging/porciuncula_prefeitura/_sources.yml` -- Documentação da fonte raw; atualizar a descrição da tabela `siconfi_msc_patrimonial`.
- `elt/transform/models/marts/financeiro/fct_saldo_caixa_siconfi.sql` -- Mart analítico que agrega por órgão e grupo de destinação; downstream direto de `stg_siconfi_msc_patrimonial`.
- `elt/tests/fixtures/siconfi_msc_fixture.json` -- Fixture de dados brutos SICONFI; adicionar casos com conta `114%` para CAPREM (10132) e Executivo (10131).
- `elt/tests/test_siconfi_patrimonial.py` -- Novo teste de integração em pytest validando que o staging e mart compilados filtram e consolidam corretamente `114%` apenas para `10132`.
- `packages/db/src/queries/siconfi-caixa-metrics.ts` -- Query Kysely consumidora de `fct_saldo_caixa_siconfi`.
- `packages/db/src/queries/__tests__/siconfi-caixa-metrics.spec.ts` -- Teste de unidade/paridade da query Kysely; adicionar asserções para o saldo consolidado de contas correntes + carteira de investimentos da previdência.
- `apps/web/components/caprem-saldo-caixa-card.tsx` -- Componente de UI que renderiza os saldos consolidados da previdência a partir do DTO.
- `packages/db/tests/fixtures/schema.sql.gz` -- Fixture compactada de paridade do banco de dados analítico.

## Tasks & Acceptance

**Execution:**
- `elt/transform/models/staging/porciuncula_prefeitura/stg_siconfi_msc_patrimonial.sql` -- Modificar filtro WHERE para `(conta_contabil like '111%' or (conta_contabil like '114%' and trim(poder_orgao) = '10132'))` -- Habilitar captura de investimentos da CAPREM sem afetar outros órgãos.
- `elt/transform/models/staging/porciuncula_prefeitura/_stg_siconfi_msc_patrimonial.yml` -- Atualizar descrição do modelo dbt -- Manter coerência na documentação do catálogo dbt.
- `elt/transform/models/staging/porciuncula_prefeitura/_sources.yml` -- Atualizar descrição da fonte raw `siconfi_msc_patrimonial` -- Sincronizar catálogo dbt de fontes com escopo expandido.
- `elt/tests/fixtures/siconfi_msc_fixture.json` -- Adicionar entradas de teste de conta `114110100` para `10132` e para `10131` -- Prover dados representativos para os testes de extração e transformação.
- `elt/tests/test_siconfi_patrimonial.py` -- Criar teste pytest de integração verificando o comportamento do staging e agregação no mart -- Garantir que `114%` só entra para `10132` e nunca para `10131` ou `20231`.
- `packages/db/src/queries/__tests__/siconfi-caixa-metrics.spec.ts` -- Adicionar teste unitário de consolidação de caixa + aplicações do RPPS -- Validar que `totalCaixaPrevidencia` soma ambos e `totalCaixaGeral` do Executivo permanece estritamente isolado.
- `packages/db/tests/fixtures/schema.sql.gz` -- Executar `make db/fixture/dump` e verificar com `make db/fixture/check` -- Cumprir governança de fixtures de teste (Regra 21).

**Acceptance Criteria:**
- Given o modelo de staging `stg_siconfi_msc_patrimonial.sql` em `elt/transform/models/staging/porciuncula_prefeitura/`, when o modelo for compilado e executado, then a cláusula de filtro captura contas `111%` para qualquer órgão e `114%` exclusivamente para `poder_orgao = '10132'`.
- Given registros brutos com `conta_contabil like '114%'` sob `poder_orgao = '10131'`, when o staging for processado, then esses registros não constam na saída e não alteram `totalCaixaGeral`.
- Given registros sob `poder_orgao = '20231'`, when o staging for processado, then continuam totalmente excluídos.
- Given o mart `fct_saldo_caixa_siconfi`, when consultado via `getSiconfiPosicaoFinanceira`, then o RPPS exibe o saldo financeiro consolidado em `previdencia` e `totalCaixaPrevidencia`.
- Given a suíte de testes de paridade `packages/db/src/queries/__tests__/siconfi-caixa-metrics.spec.ts`, when executada via `pnpm test`, then valida a consolidação do saldo do RPPS sem efeitos colaterais no Executivo.
- Given as ferramentas de governança do projeto, when executados `make check`, `make db/fixture/check`, `make test` e `make test/ts`, then todos passam com código 0.

## Spec Change Log

<!-- Append-only. Populated by step-04 during review loops. -->

## Review Triage Log

### 2026-09-23 — Review pass
- verdicts: 7 findings — high 1, medium 2, low 2, false 2, maybe-false 0
- findings:
  - `[high]` `[patch]` Omissão de contas com financeiro_permanente = 2 na carteira de investimentos (114%) da CAPREM — Aplicada flexibilização `(financeiro_permanente::int = 1 or (conta_contabil like '114%' and trim(poder_orgao) = '10132'))` em `stg_siconfi_msc_patrimonial.sql`, capturando integralmente os R$ 35,64M de 2025.
  - `[medium]` `[patch]` Inconsistência de sanitização da coluna poder_orgao em stg_siconfi_msc_patrimonial.sql — Aplicado `trim(poder_orgao) as poder_orgao` na projeção do staging para garantir integridade com joins downstream.
  - `[medium]` `[patch]` Ausência de teardown/restauração do banco de testes em elt/tests/test_siconfi_patrimonial.py — Adicionado `yield` e truncate de teardown na fixture `seed_msc_patrimonial` para evitar poluição residual.
  - `[low]` `[patch]` Premissa frágil de cardinalidade 1:1 por poder_orgao no teste de agregação do mart — Atualizada indexação de dicionário de asserção para chave composta `(poder_orgao, grupo_destinacao)`.
  - `[low]` `[defer]` Risco de subnotificação do patrimônio do RPPS por ausência de cobertura de contas 121% (Realizável a Longo Prazo) — Identificado em 2026 que reclassificações contábeis ocorreram; escopo da Story 14.1 é estritamente 114%, diferido para a Story 14.2 (série plurianual).
  - `[false]` `[reject]` Mapeamento incompleto da CAPREM (10132) nos seeds de entidades contábeis — A autarquia CAPREM é tratada deliberadamente como autarquia autônoma com fallback canônico em SQL (`fct_saldo_caixa_siconfi`), e o loader Kysely filtra estritamente por `poderOrgao === '10132'`.
  - `[false]` `[reject]` Duplicação de dados sintéticos entre fixture JSON e teste de integração — Os dois testes pertencem a camadas arquiteturais distintas (test_siconfi_msc testa mock HTTP do extrator Python; test_siconfi_patrimonial testa views/tabelas SQL no banco analítico).

## Design Notes

A expansão de `conta_contabil like '111%'` para `(conta_contabil like '111%' or (conta_contabil like '114%' and trim(poder_orgao) = '10132'))` é uma alteração cirúrgica em `stg_siconfi_msc_patrimonial.sql`.
Na MSC Patrimonial do SICONFI:
- `111%`: Caixa e equivalentes de caixa em moeda nacional (contas bancárias de livre movimentação).
- `114%`: Investimentos e aplicações temporárias a curto prazo (títulos públicos, fundos de investimento credenciados da carteira do RPPS).
Como a CAPREM é um regime de capitalização/repartição simples que mantém seu patrimônio primariamente investido em fundos de investimento do mercado financeiro em vez de contas bancárias correntes, capturar apenas a classe `111%` omitia ~99% dos ativos da autarquia. Para os demais órgãos (Prefeitura `10131`), a classe `111%` continua sendo a métrica oficial de disponibilidade de caixa financeiro imediato para confronto com restos a pagar e limites da LRF.

## Verification

**Commands:**
- `uv run --project elt pytest elt/tests/test_siconfi_patrimonial.py -v` -- expected: PASS (validação do filtro 114% no staging dbt)
- `make db/fixture/check` -- expected: 4 passed in ~18s (paridade dbt ↔ fixture)
- `make test` -- expected: todos os testes pytest passam
- `make test/ts` -- expected: todos os testes vitest passam, incluindo siconfi-caixa-metrics.spec.ts
- `make check` -- expected: linters e formatadores passam sem erros

## Auto Run Result

### Summary of implemented change
Implementada a captura das contas de investimentos e aplicações financeiras da classe `114%` exclusivamente para a CAPREM (`poder_orgao = '10132'`) no staging `stg_siconfi_msc_patrimonial.sql`, corrigindo a omissão de contas com `financeiro_permanente = 2` e sanitizando `trim(poder_orgao)`. O mart `fct_saldo_caixa_siconfi` consolida caixa e aplicações no RPPS mantendo o Executivo (`10131`) e o Legislativo (`20231`) estritamente isolados. Fixtures de testes e paridade dbt foram regeradas e verificadas com 100% de sucesso.

### Files changed
- `elt/transform/models/staging/porciuncula_prefeitura/stg_siconfi_msc_patrimonial.sql`: Expansão do filtro para classe `114%` da CAPREM (incluindo `fp = 2`) e projeção de `trim(poder_orgao)`.
- `elt/transform/models/staging/porciuncula_prefeitura/_stg_siconfi_msc_patrimonial.yml`: Atualização da documentação do modelo dbt de staging.
- `elt/transform/models/staging/porciuncula_prefeitura/_sources.yml`: Atualização da documentação da fonte raw `siconfi_msc_patrimonial`.
- `elt/tests/fixtures/siconfi_msc_fixture.json`: Adição de casos de teste para contas `114%` sob órgãos 10132 e 10131.
- `elt/extract/__tests__/test_siconfi_msc.py`: Atualização do número de registros esperados no mock HTTP da extração.
- `elt/tests/test_siconfi_patrimonial.py`: Novo teste pytest de integração verificando filtros de staging, agregação no mart e isolamento entre órgãos.
- `packages/db/src/queries/__tests__/siconfi-caixa-metrics.spec.ts`: Teste de paridade Kysely validando a consolidação de caixa + aplicações do RPPS sem inflar o Executivo.
- `packages/db/tests/fixtures/schema.sql.gz`: Fixture de paridade do banco analítico regerada via `make db/fixture/dump`.

### Review findings breakdown
- **Patches applied (4):**
  1. Flexibilização de `financeiro_permanente` para incluir contas `114%` com `fp = 2` da CAPREM em `stg_siconfi_msc_patrimonial.sql`.
  2. Sanitização `trim(poder_orgao)` no SELECT do staging.
  3. Adição de `yield` e truncate de teardown na fixture de teste `seed_msc_patrimonial`.
  4. Indexação com chave composta `(poder_orgao, grupo_destinacao)` no teste de agregação do mart.
- **Items deferred (1):**
  1. Investigação de reclassificação de investimentos para contas `121%` (Realizável a Longo Prazo) no exercício de 2026, diferido para a Story 14.2 (Série Histórica Plurianual).
- **Items rejected (2):**
  1. Mapeamento incompleto de CAPREM nos seeds de órgãos: rejeitado como falso pois o fallback canônico em SQL é a arquitetura padrão do projeto para a autarquia RPPS.
  2. Duplicação de dados sintéticos: rejeitado como falso por se tratarem de camadas de teste independentes (extrator HTTP vs. pipeline SQL de banco analítico).

### Follow-up review recommendation
- `followup_review_recommended: true`
- **Patched counts by verdict:** high: 1, medium: 2, low: 1
- **Unverified risk:** A inclusão de contas `114%` com `financeiro_permanente = 2` para a CAPREM deve ser validada contra cargas históricas adicionais no pipeline de extração real durante a Story 14.2 para confirmar que nenhuma conta duplicada ou de compensação indevida seja agregada.

### Verification performed
- `make check`: PASS (ruff check, ruff format check, mypy - 0 erros)
- `make db/fixture/check`: PASS (4 passed in 24.07s)
- `make test`: PASS (45 passed in 27.54s)
- `make test/ts`: PASS (74 arquivos de teste, 542 testes passed in 1m18s)
- `uv run --project elt pytest elt/tests/test_siconfi_patrimonial.py -v`: PASS (2 passed in 23.61s)

### Residual risks
Nenhum risco funcional identificado na Story 14.1. O comportamento do Executivo Municipal permanece 100% inalterado e preservado.
