---
title: 'Story 26.2: Inventário e plano de migração do legado raw por município'
type: 'chore'
created: '2026-11-14'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** as 21 tabelas do portal municipal (Fiorilli) seguem em `raw_<portal_slug>` com chave sem `portal_slug`, e não há inventário verificado nem ordem de migração para elas sair (Stories 26.3 em diante).

**Approach:** entregar só documentação: um documento em `docs/` com inventário por tabela (schema, fonte, chave, escritor, leitores, volume por portal), agrupamento por fonte, ordem, paridade, reversão, recarga isolada e riscos; depois listar as stories 26.3 em diante em `epics.md` e `sprint-status.yaml`. Nenhum código, modelo dbt, dado ou comando contra produção é alterado (Regra 15).

</frozen-after-approval>

## Implementation Notes

Investigação (banco local, 2026-11-14): 21 tabelas Fiorilli por portal mais `siconfi_rgf` (26.5); `siconfi_msc_patrimonial` já migrada (26.1, tabela antiga mantida até a 26.4). Chaves usam `empresa` (id da entidade no portal), nunca `portal_slug`, exceto `metadata`. Única divergência de colunas entre os portais: `diarias.catec`. Escritores: `elt/load/run.py` e `elt/load/fiorilli/receitas_loader.py` via `elt/core/db.py` (`PortalConfig.raw_schema`). Leitores: `staging/<portal>/stg_*` e `intermediate/int_*_consolidadas` (um CTE por portal com literal de tenant), `dim_metadata`, marts que leem `source()` de `despesas_por_fornecedor` e `metadata`. Sem leitor TypeScript direto de `raw_*`. Contagens do `pg_stat` são estimativas; o documento deve usar `count(*)`.
