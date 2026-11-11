---
title: 'Histórico de Estoque da Farmácia SUS (snapshots diários e histórico de coletas)'
type: 'feature'
created: '2026-10-23'
status: 'done'
baseline_revision: 'adadabb928a0d5c3f8af2c86ac3b2d9dccbeeea5'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-19-context.md'
  - '{project-root}/.claude/rules/dbt-sql.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** o loader da Farmácia SUS substitui o retrato do portal a cada execução e mantém só a última coleta; sem histórico não é possível provar por quanto tempo um município ficou sem transmitir, nem calcular ruptura, giro ou validade.

**Approach:** tornar `raw_farmacia_sus.estoque_medicamentos` append-only e idempotente (chave `portal_slug, id_registro, data_posicao_estoque`, com `sigla_sistema_origem`), fazer `raw_farmacia_sus.coletas` acumular uma linha por execução e expor no dbt `fct_farmacia_estoque_historico` (incremental) e uma visão do histórico de coletas, sem alterar o contrato de `fct_farmacia_estoque`.

## Boundaries & Constraints

**Always:** colunas raw em TEXT (Regra 16); nomes explícitos (Regra 9); códigos em lowercase snake_case (Regra 10); `portal_slug` em toda chave, `JOIN` e `GROUP BY` (Regra 23); sem literais de tenant; DDL idempotente e executado somente no banco local (Regra 15); `_sources.yml` atualizado junto com o DDL do loader (Regra 5), pois o banco de teste é construído a partir dele; estilo funcional no TypeScript, se tocado.

**Never:** alterar colunas ou contrato de `fct_farmacia_estoque`; adicionar `sigla_sistema_origem` a esse mart; mexer em UI, queries TS ou `llms.txt`; executar DDL/dbt contra produção; fixture versionado `schema.sql.gz` (proibido pela Regra 21).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Reexecução no mesmo dia | mesmas linhas, mesma `data_posicao_estoque` | nenhuma linha duplicada (upsert) | sem erro |
| Novo dia | mesmo `id_registro`, nova data de posição | nova linha; anteriores preservadas | sem erro |
| Coleta com falha | extractor devolve só `coletas` com `falha` | estoque histórico intacto; nova linha em `coletas` | sem erro |
| Várias coletas por portal | 2+ linhas em `coletas` | `fct_farmacia_estoque` usa só a mais recente por portal, sem duplicar itens | contrato inalterado |
| Isolamento | dois portais com mesmos códigos | histórico e coletas separados por `portal_slug` | n/a |

</intent-contract>

## Code Map

- `elt/load/farmacia_sus.py` -- `ensure_farmacia_sus_tables` (só `CREATE IF NOT EXISTS`), `_replace_portal_rows`, `load_farmacia_sus_estoque` (hoje `replace=True`), `load_farmacia_sus_coletas` (upsert por `portal_slug`).
- `elt/extract/farmacia_sus.py` -- `_mapear_estoque` (linhas ~92-110; `id_registro` já inclui a data), `CAMPOS_DATA_POSICAO` (~43), `extract()` (~220-300) que monta as linhas de `coletas`.
- `elt/transform/models/staging/farmacia_sus/_sources.yml` -- `meta.primary_key` e colunas; `build_test_db.py` e `elt/conftest.py` geram o schema raw a partir dele.
- `elt/transform/models/staging/farmacia_sus/_models.yml` e `stg_farmacia_sus__{estoque_medicamentos,coletas}.sql` -- testes de unicidade a ajustar; incluir `sigla_sistema_origem`, `mensagem_erro`, totais.
- `elt/transform/models/marts/fct_farmacia_estoque.sql` (+ `_fct_farmacia_estoque.yml`) -- junta `estoque_valido` a coletas só por `portal_slug` (hoje 1:1); passa a usar a última coleta por portal. Contrato com 16 colunas, intocado.
- `Makefile` alvo `elt/farmacia-sus` (~85-91) -- incluir os novos modelos no `--select`.
- Testes: `elt/load/__tests__/test_farmacia_sus_loader.py`, `elt/tests/test_fct_farmacia_estoque.py`, `elt/extract/__tests__/test_farmacia_sus.py`.
- `CHANGELOG.md` -- entrada em `[Unreleased]` (skill changelog-transparencia).
- Sem precedente de modelo incremental no repo; marts usam `view` em `test_mode` e `table` fora dele.

## Tasks & Acceptance

**Execution:**
- `elt/extract/farmacia_sus.py` -- mapear `sigla_sistema_origem` no estoque e normalizar `data_posicao_estoque` para ISO (evita duplicata por formato) -- chave idempotente confiável
- `elt/load/farmacia_sus.py` -- DDL idempotente: `ADD COLUMN IF NOT EXISTS sigla_sistema_origem`, troca protegida das PKs (estoque: `portal_slug,id_registro,data_posicao_estoque`; coletas: `portal_slug,data_coleta`); estoque passa a upsert sem apagar (`replace=False`); coletas insere uma linha por execução -- append-only
- `elt/transform/models/staging/farmacia_sus/_sources.yml` -- novas colunas e PKs -- paridade com o DDL e o banco de teste
- `elt/transform/models/staging/farmacia_sus/_models.yml` + stagings -- unicidade ajustada, remover `unique` de `portal_slug` em coletas, expor novas colunas
- `elt/transform/models/marts/fct_farmacia_estoque.sql` -- selecionar a coleta mais recente por portal (`distinct on (portal_slug) ... order by data_coleta desc`) e considerar na posição apenas dados coerentes com ela; contrato igual
- `elt/transform/models/marts/fct_farmacia_estoque_historico.sql` + `_fct_farmacia_estoque_historico.yml` -- incremental (`delete+insert`, `unique_key` por surrogate de portal, unidade, medicamento, lote, data), `table` em `test_mode`; contrato `enforced`, `unique_combination_of_columns`; grão portal/unidade/medicamento/lote/data com quantidade e validade
- `elt/transform/models/marts/fct_farmacia_coletas_historico.sql` + yml -- visão do histórico de coletas por portal (status, data, totais)
- `Makefile` -- adicionar modelos ao `elt/farmacia-sus`
- testes (três arquivos acima + novos para os dois modelos) -- idempotência, preservação em recargas, falha sem apagar histórico, múltiplas coletas sem duplicar `fct_farmacia_estoque`, isolamento entre portais
- `CHANGELOG.md` -- registrar a mudança

**Acceptance Criteria:**
- Given o loader, when roda duas vezes no mesmo dia, then não há duplicatas em `raw_farmacia_sus.estoque_medicamentos`, e `sigla_sistema_origem` fica registrada.
- Given execuções sucessivas, when o loader grava coletas, then há uma linha por execução em `raw_farmacia_sus.coletas`, inclusive as com falha, sem apagar estoque.
- Given o dbt, when executado, then existem `fct_farmacia_estoque_historico` e o histórico de coletas por portal, com `portal_slug` nas chaves.
- Given várias coletas por portal, when `fct_farmacia_estoque` é consultado, then devolve a última posição por unidade, com o mesmo contrato e sem linhas duplicadas.
- Given o repositório, then `make check`, `make test` e `make db/test/build` passam (o `make db/fixture/check` citado no épico não existe; o equivalente é `db/test/build`).

## Spec Change Log

## Review Triage Log

### 2026-10-23 — Review pass
- verdicts: 20 findings — high 0, medium 4, low 6, false 2, maybe-false 2 (agrupados por causa raiz)
- findings:
  - `[medium]` `patch` migração grava '' em `data_coleta` legada e o staging de coletas faz cast de '' — aplicado `nullif(trim(...),'')` nos dois casts
  - `[medium]` `patch` incremental do histórico reagregava só parte da chave lógica e sobrescrevia a soma completa — reagrega todas as linhas das chaves tocadas, com `portal_slug`
  - `[medium]` `patch` teste de migração não criava tabelas legadas — teste agora cria PKs legadas em schema próprio e afirma a migração
  - `[medium]` `patch` histórico sem teste de valores/incremental — teste de valores e de duas cargas incrementais adicionado
  - `[medium]` `defer` histórico sem coluna de validade (spec cita quantidade e validade) — o raw e o extrator não têm campo de validade confirmado na API
  - `[low]` `defer` linhas legadas com data em outro formato podem duplicar posição no histórico na primeira carga pós-migração — pontual, coleta diária ainda não iniciada em produção
  - `[low]` `defer` `_data_posicao_iso` aceita datas impossíveis (2026-13-45) e o cast do staging as quebraria — comportamento pré-existente do staging
  - `[false]` `reject` lote com chave duplicada derruba o upsert — `_replace_portal_rows` já deduplica por chave
  - `[low]` `reject` coleta sem `data_coleta` — o extrator sempre preenche; sem guarda extra
  - `[low]` `reject` testes `unique`/`not_null`/`relationships`/`accepted_values` adicionais, `max(sigla_sistema_origem)` arbitrário, cast de timestamptz dependente de fuso, `on_schema_change=fail`, ausência de métrica de tempo sem transmitir, coerência de coleta no mart — custo maior que o benefício ou fora da intenção (a métrica é futura, conforme o épico)

## Design Notes

Uma execução vazia e bem-sucedida deixa de limpar o portal; o status "apagão" passa a depender apenas da defasagem de `max(data_posicao_estoque)`, regra que o mart já aplica. O ordenamento "última coleta" usa o texto ISO de `data_coleta`.

## Verification

**Commands:**
- `make check` -- expected: sem erros
- `make test` -- expected: todos passam
- `make db/test/build` -- expected: schema de teste construído com os novos modelos

## Auto Run Result

Status: done

**Resumo:** estoque da Farmácia SUS passa a ser append-only e idempotente, com `sigla_sistema_origem`; `coletas` acumula uma linha por execução; novos `fct_farmacia_estoque_historico` (incremental) e `fct_farmacia_coletas_historico`; `fct_farmacia_estoque` usa a coleta mais recente sem mudar o contrato.

**Arquivos:** extrator (data ISO e sigla), loader (DDL e migração de PK idempotentes), `_sources.yml`/`_models.yml` e stagings, `fct_farmacia_estoque.sql`, dois novos marts com yml, Makefile, CHANGELOG e testes.

**Revisão:** 4 patches aplicados (medium); 3 itens adiados (validade ausente, duplicata legada pontual, data impossível); demais rejeitados conforme o log.

**Recomendação de nova revisão:** false (2+ patches medium, mas nenhum high; sem risco não verificado específico).

**Verificação:** `make check`, `make test` (185 passaram) e `make db/test/build` (113 modelos, 0 erros). `make test/ts` não rodado (sem mudanças em TypeScript; `make db/fixture/check` do épico não existe, equivalente é `db/test/build`).

**Itens adiados:** resolvidos em working tree por outra sessão (data validada com strptime, limpeza de linhas legadas na troca de PK, `data_validade` no raw/staging/histórico).

**Riscos residuais:** migração de PK e limpeza legada ainda não executadas em produção (rodar antes da coleta diária); `fct_farmacia_estoque_historico` tem `on_schema_change=fail` e exige `dbt run --full-refresh` em produção, só com autorização explícita.
