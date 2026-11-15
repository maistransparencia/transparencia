---
title: 'Story 26.6: Fiorilli em raw_fiorilli: tabelas restantes, numa story só'
type: 'refactor'
created: '2026-11-14'
status: 'ready-for-dev'
baseline_commit: '1aede91642667f810c18ac0d550f76a393662f90'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-26-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/26-3-fiorilli-em-raw-fiorilli-base-do-loader-e-tabelas-sem-leitor.md'
  - '{project-root}/_bmad-output/implementation-artifacts/26-5-rgf-em-raw-siconfi.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 15 tabelas do portal Fiorilli ainda ficam em `raw_<portal_slug>`, com chave sem `portal_slug`, um staging por município e modelos `int_*_consolidad*` que unem os portais com literal de tenant (viola a Regra 23).

**Approach:** mover as 15 tabelas para `raw_fiorilli` com `portal_slug` na chave, usando a base do loader da 26.3; criar um staging único por tabela em `staging/fiorilli/` e apontar a camada intermediária e os marts para ele, sem literal de tenant. Sem mudança no que o cidadão vê.

Tabelas, em cinco grupos (um commit por grupo, paridade por tabela): **despesas** (`despesas_gerais`, `despesas_restos_pagar`, `despesas_por_orgao`, `despesas_por_unidade`, `despesas_por_fornecedor`); **receitas** (`receita_orcamentaria`, `receita_uniao`, `receita_estado`, `receita_extra_orcamentaria`); **compras** (`licitacoes`, `contratos`); **pessoal** (`pessoal`, `diarias`); **repasses** (`transferencias`, `emendas_cad`).

## Boundaries & Constraints

**Always:** schema vindo de `PortalConfig.provider`; `portal_slug` na PK e aplicado na carga (JSON/CSV antigos seguem válidos); recarga só das linhas do portal; mapa `MIGRATED_RAW_TABLES` como único ponto de registro; colunas `TEXT` (Regra 16); `portal_slug` em todo `JOIN` e `GROUP BY` (Regra 23); script de migração idempotente, sem literal de tenant, com conferência de paridade, sem apagar origem; tudo no banco local, `make db/backup` antes (Regra 15); identificadores novos em inglês; nomes de métrica por extenso (Regra 9).

**Never:** executar carga, migração ou dbt em produção; rodar `elt/extract`; remover `raw_<portal>`, staging por portal, `int_*_consolidad*` órfãos, `MIGRATED_RAW_TABLES` ou `raw_schema` (a 26.4 remove); mexer em `siconfi_rgf`, nas tabelas PNCP ou nas seis da 26.3; mudar regra de cálculo, dedupe por fonte STN ou telas.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Carga de tabela migrada | portal A, JSON de `despesas_gerais` | linhas em `raw_fiorilli.despesas_gerais` com `portal_slug`=A | N/A |
| Mesma chave em dois portais | A e B com mesmo `ano`, `empresa`, `numero` | duas linhas; recarregar A não altera B | N/A |
| Receitas por CSV | CSV manual de `receita_orcamentaria` do portal A | grava em `raw_fiorilli` com `portal_slug`; dedupe por fonte STN igual ao de antes | N/A |
| Migração repetida | script rodado duas vezes | sem duplicar nem alterar linhas | aborta se faltar ou divergir linha |
| Portal sem dados numa tabela | tabela vazia no legado | 0 linhas migradas, sem erro | N/A |

</frozen-after-approval>

## Code Map

- `elt/core/config.py` -- `MIGRATED_RAW_TABLES["fiorilli"]` (hoje 6 tabelas): acrescentar as 15; `resolve_*` e `tag_rows_with_portal` já tratam o resto.
- `elt/load/run.py:~407-430`, `elt/load/fiorilli/receitas_loader.py` -- já usam os `resolve_*`; só conferir os CSVs de receitas (cópia própria de `_upsert_raw`).
- `elt/portals/{porciuncula,natividade}_prefeitura.yml` + `elt/extract/fiorilli/` -- fonte das `key_cols` por tabela; não alterar.
- `elt/transform/models/staging/fiorilli/_sources.yml` -- declarar as 15 tabelas (colunas e PK com `portal_slug`; alimenta o banco de teste, Regra 5/21). Criar `stg_fiorilli__<tabela>.sql` e `_stg_fiorilli__*.yml` copiando os `stg_porciuncula_prefeitura__*` (idênticos aos de Natividade; conferido em `diarias`) e acrescentando `portal_slug`.
- `elt/transform/models/intermediate/int_{contratos,despesas,despesas_orgao,despesas_unidade,diarias,emendas,licitacoes,receitas,transferencias}_consolidad*.sql` e `int_pessoal_consolidado.sql` -- hoje `union all` com literal de portal; trocar por leitura do staging único mantendo a lógica (dedupe STN em `int_receitas_consolidadas`, restos a pagar em `int_despesas_consolidadas`).
- `elt/transform/models/marts/fct_{receita_extra_orcamentaria,despesas_por_fornecedor}.sql`, `fct_pessoal.sql` e demais `fct_*` que citam `stg_*_prefeitura__*` -- apontar ao staging único; conferir `portal_slug` nos joins.
- `elt/transform/models/staging/{porciuncula,natividade}_prefeitura/` -- ficam (26.4 remove); retirar só as 15 tabelas dos `_sources.yml` de portal se isso não quebrar o dbt antes da 26.4.
- `elt/scripts/migrate_fiorilli_base_para_raw_fiorilli.sql` -- modelo do novo `migrate_fiorilli_tabelas_para_raw_fiorilli.sql` (deriva o slug do nome do schema).
- `elt/tests/test_receitas_dedupe.py` (usa `raw_porciuncula_prefeitura`), `test_multitenant_integrity.py`, `test_db.py`, `elt/load/__tests__/test_receitas_loader.py`, `test_coletas_loader.py`, `elt/scripts/build_test_db.py` -- ajustar ao novo schema.

## Tasks & Acceptance

**Execution:**
- [ ] `elt/core/config.py` -- registrar as 15 tabelas em `MIGRATED_RAW_TABLES` -- corte direto; commit do grupo de cada vez, após o respectivo staging
- [ ] `staging/fiorilli/_sources.yml`, `stg_fiorilli__*.sql`, `_stg_fiorilli__*.yml` -- fonte e staging únicos por grupo, `not_null` em `portal_slug` -- Regra 5/23
- [ ] `intermediate/int_*_consolidad*.sql` e marts consumidores -- ler o staging único, join e `GROUP BY` com `portal_slug`, sem literal de tenant -- Regra 23
- [ ] `elt/scripts/migrate_fiorilli_tabelas_para_raw_fiorilli.sql` -- cópia idempotente das 15 tabelas com contagem e hash por portal/ano; rodar local -- reprodutível
- [ ] testes em `elt/` -- isolamento entre portais, dedupe de receitas em `raw_fiorilli`, idempotência da migração -- I/O Matrix
- [ ] paridade local por tabela e dos marts (`fct_receitas`, `fct_despesas*`, `fct_pessoal`, `fct_licitacoes`, `fct_contratos`, `fct_transferencias`, `fct_emendas`, `fct_diarias`) antes e depois -- registrar em Implementation Notes
- [ ] `CHANGELOG.md` (skill `changelog-transparencia`) e seção "Produção (NÃO executada)" nesta spec -- decisão do Julio

**Acceptance Criteria:**
- Given o banco local migrado, when se comparam antes e depois, then contagem e hash por `portal_slug`/ano de cada tabela e as linhas dos marts consumidores são idênticos.
- Given dois portais com chaves iguais, when ambos carregam, then cada um tem as suas linhas e recarregar um não altera o outro.
- Given os modelos novos e alterados, when se busca literal de portal ou `cod_ibge`, then não há nenhum.
- Given `make test`, `make check`, `make db/test/build`, `make test/ts` e `pnpm typecheck`, when executados, then passam.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

- Decisão: as consolidações `int_*` ainda existem aqui, mas deixam de unir portais: passam a ler o staging único (mantêm a lógica de dedupe STN e restos a pagar). A 26.4 decide se elas viram modelos únicos ou somem; esta story não renomeia nada.
- A PK de cada tabela é a de hoje com `portal_slug` à frente (ex.: `receita_orcamentaria`: `portal_slug, ano, empresa, codigo, fontestn`); migração copia a PK da origem, como na 26.3.
- Volume local: `receita_detalhes` já tinha ~37 mil linhas por portal e a conferência por texto levou ~2 min; usar hash agregado por portal/ano, não soma numérica (`valor` usa vírgula decimal).

## Verification

**Commands:**
- `make db/backup` -- expected: backup antes de migrar
- `make test` e `make check` -- expected: verde
- `make db/test/build && make test/ts` -- expected: verde (`TEST_DATABASE_URL` 5545; nunca `elt/extract` nem carga)
- `pnpm typecheck` -- expected: sem erros
