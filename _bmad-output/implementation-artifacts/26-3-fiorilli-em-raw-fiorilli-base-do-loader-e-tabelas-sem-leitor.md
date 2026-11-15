---
title: 'Story 26.3: Fiorilli em raw_fiorilli: base do loader e tabelas sem leitor dbt'
type: 'refactor'
created: '2026-11-14'
status: 'done'
baseline_commit: '8be0c8769f751141e43a1a7ca8a61a6569138da1'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-26-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/26-1-siconfi-msc-patrimonial-em-schema-por-fonte.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** as tabelas do portal municipal (Fiorilli) ficam em `raw_<portal_slug>` com chave sem `portal_slug` (exceto `metadata`), e `dim_metadata` une `metadata` dos dois municípios com `source()` fixo por tenant (viola a Regra 23).

**Approach:** criar a base do loader que decide o schema pela fonte e grava `portal_slug` na chave, e mover para `raw_fiorilli` as seis tabelas sem leitor dbt: `despesas_extra_orcamentaria`, `despesas_por_exigibilidade`, `emendas_impositivas`, `empresas`, `receita_detalhes`, `metadata`. O `dim_metadata` passa a ler `raw_fiorilli.metadata`, sem literal de tenant. As demais tabelas Fiorilli seguem no schema antigo até as Stories 26.6 a 26.9.

## Boundaries & Constraints

**Always:** o nome do schema vem de `PortalConfig.provider` (`raw_<provider>`); `portal_slug` entra na chave primária e é aplicado na carga (JSONs/CSVs antigos continuam válidos); recarga de um portal só toca linhas daquele `portal_slug`; o mapa de tabelas migradas fica num único lugar (a 26.4 o remove); colunas `TEXT` (Regra 16); script de migração idempotente, deriva o slug do nome do schema (sem literais), confere paridade e não apaga as tabelas antigas; identificadores novos em inglês.

**Never:** mexer nas outras tabelas Fiorilli, em `siconfi_rgf` ou nos schemas antigos; mudar o que o cidadão vê; executar qualquer coisa em produção (Regra 15); reintroduzir dump versionado (Regra 21).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Carga de tabela migrada | portal A, `receita_detalhes`, JSON ou CSV | linhas em `raw_fiorilli.receita_detalhes` com `portal_slug`=A | N/A |
| Isolamento | portais A e B com mesmo `empresa`, `ano`, `codigo` | duas linhas; recarregar A não altera B | N/A |
| Tabela não migrada | portal A, `licitacoes` | continua em `raw_<A>` sem `portal_slug` | N/A |
| Migração repetida | script rodado duas vezes | sem duplicar nem alterar linhas | aborta se faltar linha na conferência |

</frozen-after-approval>

## Code Map

- `elt/core/config.py` -- `PortalConfig.raw_schema` (`raw_{slug}`), `provider`; receber o mapa de tabelas migradas e o método que resolve o schema e a chave por tabela.
- `elt/load/run.py` -- `main()` (linhas ~407-428): `_upsert_raw`/`_ensure_table` e o upsert de `metadata`; usar o schema resolvido e acrescentar `portal_slug` à linha e à chave. Teste usa dublê `SimpleNamespace(slug, provider, raw_schema)`.
- `elt/load/fiorilli/receitas_loader.py` -- `run_load_receitas_csv` grava `receita_detalhes` com `portal.raw_schema` e cópia própria de `_upsert_raw`.
- `elt/core/db.py` -- `upsert`/`_get_table`/`set_metadata` usam `raw_schema`; `metadata` passa a `raw_fiorilli`. `elt/core/pipeline.py` (linhas ~264, ~354) é o caminho legado que também grava essas tabelas.
- `elt/transform/models/marts/dim_metadata.sql` -- `union all` de `source()` por tenant; vira um `select` de `raw_fiorilli.metadata`. Sai da lista de exceções de `elt/tests/test_multitenant_integrity.py`.
- `elt/transform/models/staging/porciuncula_prefeitura/_sources.yml` e `natividade_prefeitura/_sources.yml` -- declaram as 6 tabelas; mover para novo `staging/fiorilli/_sources.yml` (source `raw_fiorilli`). `elt/scripts/build_test_db.py` cria as tabelas raw a partir dos `_sources.yml`.
- `elt/scripts/migrate_siconfi_msc_para_raw_siconfi.sql` -- modelo do script de migração.
- `elt/tests/test_db.py`, `elt/tests/test_pipeline.py`, `elt/load/__tests__/test_coletas_loader.py`, `test_receitas_loader.py` -- ajustar ao novo schema.

## Tasks & Acceptance

**Execution:**
- [x] `elt/core/config.py` -- mapa `MIGRATED_FIORILLI_TABLES` e resolução de schema/chave por tabela -- base única para 26.6 a 26.9
- [x] `elt/load/run.py`, `elt/load/fiorilli/receitas_loader.py`, `elt/core/db.py`, `elt/core/pipeline.py` -- gravar as 6 tabelas em `raw_fiorilli` com `portal_slug` na chave -- corte direto
- [x] `elt/transform/models/staging/fiorilli/_sources.yml` + `_sources.yml` dos portais -- declarar `raw_fiorilli` e remover as 6 tabelas dos schemas antigos -- Regra 5
- [x] `elt/transform/models/marts/dim_metadata.sql` e `test_multitenant_integrity.py` -- fonte única sem tenant fixo -- Regra 23
- [x] `elt/scripts/migrate_fiorilli_base_para_raw_fiorilli.sql` -- copiar as 6 tabelas com paridade; rodar no banco local (`make db/backup` antes) -- reprodutível
- [ ] testes em `elt/` -- isolamento entre portais, schema por tabela, idempotência -- I/O Matrix
- [ ] descrever em `26-3-*.md` (Implementation Notes) o passo a passo de produção -- decisão do Julio

**Acceptance Criteria:**
- Given dois portais com chaves iguais, when ambos carregam, then `raw_fiorilli` tem as linhas de cada um e recarregar um não apaga o outro.
- Given a migração local, when termina, then contagem por portal e totais de `receita_detalhes.valor` por portal e ano batem com o legado, e `dim_metadata` devolve as mesmas linhas.
- Given `make test`, `make check`, `pnpm test` e `pnpm typecheck`, when rodados, then passam.

## Implementation Notes

- Base do loader em `elt/core/config.py`: `MIGRATED_RAW_TABLES` (mapa único, removido na 26.4), `resolve_raw_schema`, `resolve_key_cols` e `tag_rows_with_portal`. Usados por `elt/load/run.py`, `elt/load/fiorilli/receitas_loader.py`, `elt/core/pipeline.py` e `elt/core/db.py` (`set_metadata`).
- Fontes dbt: novo `staging/fiorilli/_sources.yml` (source `raw_fiorilli`, 6 tabelas; `despesas_por_exigibilidade` e `receita_detalhes` sem colunas, pois não têm leitor). `dim_metadata` virou um `select` de `raw_fiorilli.metadata` e saiu da lista de exceções de `test_multitenant_integrity.py`.
- `emendas_impositivas`: a chave real é `portal_slug, ano, empresa` (a API não devolve `numero`; as 36 e 42 linhas locais têm `numero` nulo). O script de migração copia a PK da tabela de origem, como o loader faz.
- Migração local (após `make db/backup`): `elt/scripts/migrate_fiorilli_base_para_raw_fiorilli.sql`, rodada duas vezes sem erro. Paridade: `receita_detalhes` 36.820 (Porciúncula) e 29.980 (Natividade), hash por portal/ano igual ao legado (o `valor` usa vírgula decimal, então a soma numérica não se aplica); `metadata` 1 linha por portal. A conferência por texto leva ~2 min nesse volume.
- Checks: `make test` (514), `make check`, `pnpm test`, `pnpm typecheck` passam.

### Produção (só com autorização explícita do Julio, Regra 15)

1. Gerar backup do schema raw (`pg_dump -Fc -n 'raw*'`) no banco de produção.
2. Rodar `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f elt/scripts/migrate_fiorilli_base_para_raw_fiorilli.sql` (transação única; aborta se faltar linha).
3. Publicar o código novo (loader) e rodar `make dbt/run` para recriar `dim_metadata` e dependentes.
4. Conferir `select portal_slug, count(*) from raw_fiorilli.<tabela> group by 1` contra o legado e `dim_metadata` com as mesmas linhas.
5. Não apagar `raw_<portal>.<tabela>` agora: a remoção fica para a 26.4.

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `make test` -- expected: passa
- `make check` -- expected: passa
- `pnpm test && pnpm typecheck` -- expected: passa
