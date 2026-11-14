# Story 26.1: Siconfi MSC Patrimonial em `raw_siconfi`

Spec: `_bmad-output/specs/spec-siconfi-msc-raw-por-fonte/SPEC.md`.

## Entregue (banco local, Regra 15)

- `elt/load/siconfi.py`: `SCHEMA = "raw_siconfi"`, `portal_slug` na PK e em `KEY_COLS`; `load_siconfi_msc(db, rows, portal_slug)` grava só as linhas do portal. O RGF não foi tocado.
- `elt/extract/siconfi_msc.py` e `elt/load/run.py` gravam em `raw_siconfi` (corte direto, sem layout duplo; o `portal_slug` é aplicado na carga, então JSONs antigos do R2 continuam válidos).
- dbt: `staging/siconfi/` (`_sources.yml`, `stg_siconfi__msc_patrimonial`) substitui os dois staging por portal, `stg_siconfi_msc_patrimonial` e `int_siconfi_msc_patrimonial_consolidada`. Os marts juntam por `portal_slug` e `cod_ibge`.
- Migração local: `elt/scripts/migrate_siconfi_msc_para_raw_siconfi.sql` (idempotente, deriva `portal_slug` do nome do schema, confere que toda linha de origem existe em `raw_siconfi` com o mesmo `valor`; não apaga as tabelas antigas).
- Paridade (local, antes e depois): 14.128 (porciuncula_prefeitura) e 23.888 (natividade_prefeitura) linhas; somas de `valor` por portal/ano/mês e saídas de `fct_saldo_caixa_siconfi` e `fct_previdencia_patrimonio_historico_metricas` idênticas.
- Regra 21: não há `schema.sql.gz`; o banco de testes vem de `make db/test/build`, que já reflete o novo schema.

## Produção (NÃO executada; depende de autorização do Julio)

1. `make db/backup` equivalente em produção (`pg_dump -Fc -n 'raw*'`).
2. Publicar o código desta story (o job mensal passa a gravar em `raw_siconfi`; se rodar antes da migração, as linhas novas ficam lá e a migração as preserva).
3. `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f elt/scripts/migrate_siconfi_msc_para_raw_siconfi.sql` (aborta sem concluir se alguma linha antiga faltar ou divergir).
4. `dbt run --full-refresh --select stg_siconfi__msc_patrimonial+` (os modelos antigos por portal e o int passam a ser órfãos; remover as views obsoletas na 26.4).
5. Conferir contagem por `portal_slug` e as saídas dos dois marts contra o estado anterior.
6. Reversão: as tabelas `raw_<portal>.siconfi_msc_patrimonial` continuam intactas; voltar o código anterior e rodar o dbt basta.
