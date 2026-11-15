---
status: done
---

# Story 24.9: SIOPE em Schema por Fonte com `portal_slug` na Chave

## O que foi feito

- `siope_indicadores` agora vive em `raw_siope` (constante `SCHEMA` em `elt/load/siope.py`), com `portal_slug` na chave primária. A carga é upsert pela chave, então cada portal grava e recarrega só as suas linhas.
- Fonte `raw_siope` declarada em `staging/siope/_sources.yml` e removida dos `_sources.yml` de Porciúncula e Natividade.
- Staging por portal e `int_siope_indicadores_consolidados` substituídos por `stg_siope__indicadores` (modelo único, sem literal de tenant). O mart `fct_educacao_siope_metricas` mantém grão e contrato; só muda o `ref`.
- Testes: seed do mart passa a gravar em `raw_siope`; novo teste de isolamento com o mesmo código de indicador em dois portais. Referência de Porciúncula (2024: 16.789,15; 2025: 16.767,14) inalterada, conferida também no banco local após `make dbt/run`.
- Migração local (Docker, porta 5544): `elt/scripts/migrate_siope_para_raw_siope.sql`, idempotente, remove as views obsoletas, confere paridade e só então remove as tabelas antigas. Antes e depois: 30 linhas por portal, mesmas somas (Porciúncula 220.944,15; Natividade 295.015,48).
- `make test` (225), `make check`, `pnpm typecheck` e `make test/ts` passam.

## Notas

- A AC cita `packages/db/tests/fixtures/schema.sql.gz` e `make db/fixture/dump`; esse fixture não existe mais. O banco de teste é construído por `make db/test/build` a partir dos `_sources.yml` (já reconstruído, 117 modelos ok).
- Produção: não tocada (Regra 15). Para migrar, o Julio roda o script SQL acima e depois `make dbt/run`, só com autorização dele.

## Auto Run Result

Status: done
