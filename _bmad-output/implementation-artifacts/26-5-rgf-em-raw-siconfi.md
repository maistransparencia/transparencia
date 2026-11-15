---
title: 'Story 26.5: RGF (`siconfi_rgf`) em `raw_siconfi`'
type: 'refactor'
created: '2026-11-14'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/26-1-siconfi-msc-patrimonial-em-schema-por-fonte.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-26-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `siconfi_rgf` (RGF Anexo 01, despesa com pessoal) ainda é gravada em `raw_<portal>`, com um staging por município e um `int_siconfi_rgf_consolidada` com literal de tenant. A MSC já mora em `raw_siconfi` (26.1).

**Approach:** Repetir o método da 26.1: tabela `raw_siconfi.siconfi_rgf` com `portal_slug` na chave, corte direto no loader, um staging único `stg_siconfi__rgf`, script SQL idempotente de migração, paridade de dados antes e depois. Sem mudança no que o cidadão vê.

## Boundaries & Constraints

**Always:** `portal_slug` na PK e aplicado na carga (JSONs antigos do R2 continuam válidos); recarga só das linhas do portal; join e `GROUP BY` com `portal_slug` (Regra 23); tudo contra o banco local (Regra 15); paridade de `fct_pessoal_rgf_metricas` e das linhas por portal/ano/período antes e depois; script de migração não apaga as tabelas antigas.

**Never:** executar carga, migração ou dbt em produção; remover `raw_<portal>.siconfi_rgf`, os staging antigos e o `int_siconfi_rgf_consolidada` (a 26.4 remove, como na 26.1); alterar extrator, regras de cálculo, `fct_pessoal_rgf_metricas` além da origem, ou telas; literal de `cod_ibge` ou de portal no staging novo.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Carga de um portal | JSON de `siconfi_rgf` do portal A | Linhas gravadas com `portal_slug` = A em `raw_siconfi.siconfi_rgf`; linhas do portal B intactas | N/A |
| Recarga | Mesmo JSON duas vezes | Upsert idempotente, mesma contagem | N/A |
| Mesmos códigos em dois portais | Mesma chave RGF em A e B | Duas linhas, uma por `portal_slug` | N/A |
| Migração | `raw_<portal>.siconfi_rgf` populadas | `raw_siconfi` com as mesmas linhas e `valor`; reexecução sem duplicar | Aborta se alguma linha de origem faltar ou divergir |
| Portal sem RGF | Lista vazia (ex.: Natividade 2024, a confirmar) | 0 linhas; fonte segue o fluxo de `fct_coletas_por_fonte` | N/A |

</frozen-after-approval>

## Code Map

- `elt/load/siconfi.py` -- `RGF_KEY_COLS`, `ensure_siconfi_rgf_table(engine, schema)` e `load_siconfi_rgf(db, rows, schema=None)`; mover para `SCHEMA`, `portal_slug` na PK/`KEY_COLS`, assinatura `load_siconfi_rgf(db, rows, portal_slug, schema=SCHEMA)` como `load_siconfi_msc`.
- `elt/load/run.py:302-310` -- ramo `siconfi_rgf` grava em `schema = portal.raw_schema`; passar a `raw_siconfi` (modelo: ramo da MSC, linhas 287-301).
- `elt/load/__tests__/test_coletas_loader.py:114-115` -- monkeypatch de `ensure_siconfi_rgf_table`/`load_siconfi_rgf`; ajustar aos novos argumentos.
- `elt/transform/models/staging/siconfi/_sources.yml` -- declarar `siconfi_rgf` com `portal_slug` e PK nova (modelo: `siconfi_msc_patrimonial`); alimenta o banco de testes (Regra 5/21).
- `elt/transform/models/staging/siconfi/stg_siconfi__rgf.sql` + `_stg_siconfi__rgf.yml` -- novo, mesmas colunas e filtros dos staging antigos, mais `portal_slug`, sem `cod_ibge = 3304102`.
- `elt/transform/models/staging/{porciuncula,natividade}_prefeitura/stg_*__siconfi_rgf.sql` e entradas `siconfi_rgf` dos dois `_sources.yml` -- ficam (26.4 remove); `int_siconfi_rgf_consolidada.sql` idem.
- `elt/transform/models/marts/metrics/fct_pessoal_rgf_metricas.sql` -- trocar `ref('int_siconfi_rgf_consolidada')` por `ref('stg_siconfi__rgf')`; juntar por `portal_slug` (hoje junta `dim_portais` por `cod_ibge`).
- `elt/scripts/migrate_siconfi_msc_para_raw_siconfi.sql` -- modelo do novo `elt/scripts/migrate_siconfi_rgf_para_raw_siconfi.sql`.
- Não mudar: `elt/extract/siconfi_rgf.py`, `elt/extract/run.py`, `cadence.py`, `fct_coletas_por_fonte` (lê o mart), seed de fontes.

## Tasks & Acceptance

**Execution:**
- [ ] `elt/load/siconfi.py` -- tabela e loader do RGF em `raw_siconfi` com `portal_slug` na chave -- corte direto como na MSC
- [ ] `elt/load/run.py` -- ramo `siconfi_rgf` usa `raw_siconfi` e passa `portal.slug` -- sem layout duplo
- [ ] `elt/load/__tests__/test_coletas_loader.py` e novo teste do loader RGF -- isolamento por portal, idempotência, mesma chave em dois portais -- cobre a matriz
- [ ] `staging/siconfi/_sources.yml`, `stg_siconfi__rgf.sql`, `_stg_siconfi__rgf.yml` -- fonte e staging únicos com testes `not_null` em `portal_slug`
- [ ] `fct_pessoal_rgf_metricas.sql` -- consome o staging novo, join por `portal_slug`
- [ ] `elt/scripts/migrate_siconfi_rgf_para_raw_siconfi.sql` -- cópia idempotente com conferência de paridade, sem apagar origem
- [ ] `CHANGELOG.md` -- registrar a mudança (skill `changelog-transparencia`)
- [ ] `_bmad-output/implementation-artifacts/26-5-rgf-em-raw-siconfi.md` -- seção "Produção (NÃO executada)" ao concluir, no formato da 26.1

**Acceptance Criteria:**
- Given o banco local migrado, when se comparam antes e depois, then contagem e soma de `valor` por `portal_slug`/ano/período e as linhas de `fct_pessoal_rgf_metricas` são idênticas.
- Given dois portais com a mesma chave RGF, when ambos carregam, then cada um tem a sua linha e recarregar um não altera o outro.
- Given o staging novo, when se busca literal de portal ou `cod_ibge` fixo, then não há nenhum.
- Given `make test`, `make check`, `make db/test/build` e `make test/ts`, when executados, then passam.

## Implementation Notes

- Loader, staging único, mart e script implementados como na 26.1. O mart junta `dim_portais` por `portal_slug` e `cod_ibge`: o `cod_ibge` mantém o filtro de ente que os staging antigos faziam com literal, sem literal no código novo.
- Teste do loader (`elt/tests/test_siconfi_patrimonial.py`) e teste unitário do mart ajustados; o monkeypatch de `test_coletas_loader.py` já aceitava os novos argumentos.
- Paridade no banco local (5544): origem e `raw_siconfi` com a mesma contagem e soma de `valor` por portal (natividade 1687 / 11.071.642.618,83; porciuncula 2848 / 18.750.508.829,16); `fct_pessoal_rgf_metricas` com 26 linhas antes e depois, diferença vazia nos dois sentidos.
- Sobrou no banco local a tabela `public.paridade_rgf_antes` (snapshot da paridade); o hook bloqueou o `drop`. Remover a mão.

## Design Notes

PK nova: `(portal_slug, ano, cod_ibge, periodicidade, periodo, anexo, cod_conta, coluna, rotulo)`. Em produção o job mensal pode gravar em `raw_siconfi` antes da migração; o script preserva as linhas novas, como na 26.1. Reversão: tabelas antigas intactas; voltar o código e rodar o dbt.

## Verification

**Commands:**
- `make test` e `make check` -- expected: verde
- `make db/test/build && make test/ts` -- expected: verde (usa `TEST_DATABASE_URL` 5545; nunca `elt/extract` nem carga)
- `pnpm typecheck` -- expected: sem erros

**Manual checks (if no CLI):**
- Migração e comparação de paridade rodadas só no banco local; produção fica para o fechamento da epic, com autorização do Julio.

## Produção (NÃO executada; depende de autorização do Julio)

1. `make db/backup` equivalente em produção (`pg_dump -Fc -n 'raw*'`).
2. Publicar o código desta story (o job mensal passa a gravar `siconfi_rgf` em `raw_siconfi`; se rodar antes da migração, as linhas novas ficam lá e a migração as preserva).
3. `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f elt/scripts/migrate_siconfi_rgf_para_raw_siconfi.sql` (aborta sem concluir se alguma linha antiga faltar ou divergir).
4. `dbt run --full-refresh --select stg_siconfi__rgf+` (os staging por portal e o `int_siconfi_rgf_consolidada` passam a ser órfãos; remover na 26.4).
5. Conferir contagem e soma de `valor` por `portal_slug` e as linhas de `fct_pessoal_rgf_metricas` contra o estado anterior.
6. Reversão: as tabelas `raw_<portal>.siconfi_rgf` continuam intactas; voltar o código anterior e rodar o dbt basta.
