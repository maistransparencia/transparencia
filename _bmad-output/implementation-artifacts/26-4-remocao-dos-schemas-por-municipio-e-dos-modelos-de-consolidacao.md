---
title: 'Story 26.4: Remoção dos schemas por município e dos modelos de consolidação'
type: 'refactor'
created: '2026-11-14'
status: 'in-progress'
baseline_commit: 'f33890bac70c2a4a2d9847f57a2573cd02cceb6f'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-26-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/26-3-fiorilli-em-raw-fiorilli-base-do-loader-e-tabelas-sem-leitor.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** depois das Stories 26.3 e 26.5 a 26.9, as tabelas raw estarão em `raw_fiorilli` e `raw_siconfi`, mas o código ainda carrega o mapa temporário de tabelas migradas, a propriedade `raw_schema` por município, os staging por portal e os modelos `int_*_consolidadas`. Também não há monitoramento de escala: o número de schemas passa a crescer com os provedores, e o volume de cada tabela cresce com os municípios.

**Approach:** remover o legado (mapa, `raw_schema`, staging por portal, consolidações, fontes antigas) e deixar só o desenho por fonte; acrescentar o monitoramento de escala do `raw_<fonte>` com limiares num único lugar, métricas no log da carga mensal, teste estrutural e nota de desenho. Os schemas `raw_<portal>` só são apagados em produção por script separado, depois da conferência do Julio.

## Boundaries & Constraints

**Always:** executar só depois de 26.3, 26.5, 26.6, 26.7, 26.8 e 26.9 concluídas; paridade das saídas dos marts antes e depois (contagens e totais por `portal_slug`); `portal_slug` em todo `JOIN` e `GROUP BY` (Regra 23); nada de literal de tenant; identificadores novos em inglês; rodar tudo no banco local (Regra 15); `make db/backup` antes de qualquer script no banco local.

**Never:** executar DROP, migração ou carga em produção; apagar tabelas antigas no banco local sem backup e sem a conferência de paridade ter passado; mudar o que o cidadão vê; abrir issue automática por limiar, particionar tabelas ou criar índices extras; mexer em `raw_siope`, `raw_siops` e demais schemas que já são por fonte.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Estado final | `dbt run` e testes sem `raw_<portal>` | marts iguais aos de antes da remoção | N/A |
| Limiar ultrapassado | mais de 20 municípios no provedor, tabela acima de 5 milhões de linhas, recarga acima de 10 min ou tabela com mais de 150 colunas | log da carga mensal destaca o limiar e aponta a nota de desenho | métrica indisponível: registra aviso e não derruba a carga |
| Tabela raw migrada sem `portal_slug` na PK ou com mais de 150 colunas | banco de teste | teste estrutural falha apontando a nota | N/A |
| Script de DROP | schema `raw_<portal>` ainda com leitor ou paridade divergente | aborta sem apagar | `ON_ERROR_STOP`, transação única |

</frozen-after-approval>

## Code Map

- `elt/core/config.py` -- `MIGRATED_RAW_TABLES`, `is_migrated_table`, `resolve_raw_schema`, `resolve_key_cols`, `tag_rows_with_portal` e `PortalConfig.raw_schema`: remover o mapa e fixar `raw_<provider>` com `portal_slug` na chave; local dos limiares de escala (constantes únicas).
- `elt/load/run.py`, `elt/load/fiorilli/receitas_loader.py`, `elt/core/pipeline.py`, `elt/core/db.py` -- usam o mapa; simplificar. `run.py` também deve registrar início e fim da carga por município (`raw_coletas.registro_coletas` guarda só `coletado_em`).
- `elt/load/coletas.py` -- escritor de `registro_coletas`; recebe a duração.
- `elt/transform/models/intermediate/int_*_consolidad*.sql` e `_int_*.yml` (contratos, despesas, despesas_orgao, despesas_unidade, diarias, emendas, licitacoes, pessoal, receitas, siconfi_rgf, transferencias) -- remover; `int_despesas_reclassificadas.sql` e `marts/fct_*.sql` (despesas_por_unidade, despesas_por_orgao, transferencias, emendas, receitas, diarias, licitacoes) passam a ler o staging único de cada fonte. Conferir `fct_despesas_por_fornecedor.sql`.
- `elt/transform/models/staging/{porciuncula,natividade}_prefeitura/` -- remover os `stg_*` e `_sources.yml` por portal; staging único em `staging/fiorilli/` (criado em 26.3 e ampliado em 26.6 a 26.9). `stg_*__receita_orcamentaria.sql` ainda cita `_consolidadas`.
- `elt/tests/test_multitenant_integrity.py` -- remover a exceção de `fct_despesas_por_fornecedor.sql`; modelo do novo teste estrutural.
- `elt/tests/test_receitas_dedupe.py`, `elt/conftest.py` (`search_path` com `raw_porciuncula_prefeitura`, linha ~199), `elt/scripts/build_test_db.py` (`create_raw_schema` lê todos os `_sources.yml`) -- ajustar à ausência de `raw_<portal>`; fixture `schema.sql.gz` (Regra 21).
- `elt/migrations/manual/`, `elt/scripts/migrate_*_para_raw_*.sql` -- modelo para o novo `drop_raw_por_municipio.sql` (idempotente, sem literal de tenant).
- `.github/workflows/ingestion-monthly.yml` -- chama o orquestrador; o log de escala sai do código Python da carga, sem mudar o fluxo.
- `docs/` -- nota curta de desenho e limiares (um schema por provedor, `portal_slug` na PK, o porquê); registrar em `epic-26-context.md`.

## Tasks & Acceptance

**Execution:**
- [ ] `elt/core/config.py` e os quatro escritores -- remover o mapa e `raw_schema`; schema `raw_<provider>` com `portal_slug` na chave -- fim do legado
- [ ] `elt/transform/models/intermediate/` e `marts/` -- remover as consolidações e apontar os consumidores ao staging único -- Regra 23
- [ ] `elt/transform/models/staging/<portal>/` -- remover staging e fontes por portal -- Regra 5
- [x] `elt/core/config.py` -- limiares de escala num único lugar (20 municípios por provedor, 5 milhões de linhas, 10 min, 150 colunas) -- calibrar com 5 a 10 municípios
- [x] `elt/load/run.py`, `elt/load/coletas.py` -- registrar início/fim e emitir no log da carga linhas e tamanho por tabela (`pg_stat_user_tables`, `pg_total_relation_size`), municípios distintos por fonte e limiar ultrapassado -- monitoramento
- [x] `elt/tests/` -- teste estrutural (tabela raw migrada: PK com `portal_slug`, no máximo 150 colunas), teste dos limiares e do log -- I/O Matrix
- [x] `elt/scripts/drop_raw_por_municipio.sql` -- derruba `raw_<portal>` com checagem de paridade e de leitores; não rodar em produção -- reprodutível
- [x] `docs/` e `epic-26-context.md` -- nota de desenho e limiares -- apontada pelo teste
- [ ] `schema.sql.gz` e conftest -- regenerar sem `raw_<portal>` -- Regra 21

**Acceptance Criteria:**
- Given o banco local antes e depois da remoção, when o dbt roda, then contagens e totais dos marts por `portal_slug` são iguais.
- Given o repositório, when buscado por `_consolidadas`, `MIGRATED_RAW_TABLES`, `raw_schema` e `raw_<portal>`, then nada resta fora de docs e do script de DROP.
- Given a carga mensal, when termina, then o log traz as métricas por tabela e por fonte e destaca limiares ultrapassados.
- Given `make test`, `make check`, `pnpm test` e `pnpm typecheck`, when rodados, then passam.

## Implementation Notes

Parcial (Julio autorizou seguir com 26.3 em review e 26.5 a 26.9 em backlog). Feito: limiares `SCALE_*` em `elt/core/config.py`, `elt/load/scale_monitor.py` integrado ao fim de `elt/load/run.py` (duração, linhas/tamanho/colunas por tabela, municípios, limiar destacado), `elt/tests/test_raw_fonte_escala.py`, `elt/scripts/drop_raw_por_municipio.sql` (não executado), `docs/raw-por-fonte-escala.md`. A duração fica só no log; `registro_coletas` não ganhou colunas.
Pendente (depende de 26.5 a 26.9, só 6 tabelas do Fiorilli estão em `raw_fiorilli`): remover `MIGRATED_RAW_TABLES`/`raw_schema`, staging por portal, `int_*_consolidadas`, ajustes de conftest/build_test_db e a paridade antes/depois.

## Spec Change Log

## Review Triage Log

## Design Notes

Verificar no início se 26.3 e 26.5 a 26.9 estão em `done` no `sprint-status.yaml`; se não, parar. O checklist de produção do épico (itens 1 a 7) é do Julio: o DROP em produção só roda no fechamento, com autorização explícita. Reavaliar o desenho quando o primeiro limiar de volume for atingido ou passar de 5 municípios no mesmo provedor.

## Verification

**Commands:**
- `make test` -- expected: passa
- `make check` -- expected: passa
- `pnpm test && pnpm typecheck` -- expected: passa
- `grep -rn "_consolidadas\|MIGRATED_RAW_TABLES" elt --include="*.py" --include="*.sql" --include="*.yml" --exclude-dir=target` -- expected: sem resultados
