---
title: 'Carga segura: parar e avisar em vez de gravar dado errado'
type: 'feature'
created: '2026-11-13'
status: 'done'
baseline_commit: '6c2cc3ab443dba0c3d2482fe9f382502a4aa7684'
route: 'dispatch'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O extrator engole falhas de fonte em `failed_requests.csv` e sai com 0; o loader não sabe da falha, carrega o que houver e o job fica verde. Uma resposta vazia anômala pode ser gravada como coleta normal, e a falha não fica registrada em lugar nenhum consultável.

**Approach:** O extrator registra fonte e `erro_codigo` de cada falha; o loader pula as fontes com falha (ou resposta vazia suspeita), grava a tentativa em `raw_coletas.registro_coletas` com `resultado` `falha` e sai com código não zero; o mart expõe a última falha sem mexer na última coleta boa; o workflow falha no fim, depois do dbt.

## Boundaries & Constraints

**Always:** `erro_codigo` em snake_case (`fonte_fora_do_ar`, `formato_mudou`, `resposta_vazia_suspeita`, `erro_inesperado`), nunca texto de exceção no registro; `resposta_vazia_suspeita` só quando o catálogo marca a fonte (`resposta_vazia_e_suspeita`) e a última coleta com sucesso trouxe linhas; registros antigos sem `resultado` contam como `sucesso`; `ultima_coleta_em` é só a última coleta com sucesso; código e testes novos em inglês, sem literais de tenant/UF/ano; tudo roda no banco local (5544/5545).

**Decisões (Julio, 2026-11-13):**
- Falha parcial de uma fonte (ex.: uma listagem de `portal_municipal`) pula a fonte inteira naquela execução: nenhum arquivo dela é carregado.
- `resposta_vazia_e_suspeita = true` em `portal_municipal`, `farmacia_sus`, `siope` e `siops`; `false` nas demais (`siconfi_msc`, `siconfi_rgf`, `pncp`, `obrasgov` podem vir vazias no ano corrente; as `nao_monitorado` também ficam `false`).
- O loader registra tudo e sai ≠ 0; o workflow continua até o dbt (o mart já mostra a falha) e um passo final reprova o job.
- A spec fica inteira (~2.200 tokens) por ser um objetivo só.

**Never:** reescrever extratores tudo-ou-nada (SIOPE, SIOPS); retentativa automática; notificação nova; painel de cargas; mudança de tela ou de texto (o "—" em vez de zero foi para `deferred-work.md`); apagar linhas para "limpar" falha; mudar a regra de `situacao` da 23.2.

## I/O & Edge-Case Matrix

| Cenário | Entrada / Estado | Resultado esperado |
|---|---|---|
| Fonte fora do ar | `failed_requests.csv` com `farmacia_sus`/`fonte_fora_do_ar` | Nenhuma linha de estoque/CNES alterada; registro `falha`+`fonte_fora_do_ar`; `coletas.json` da farmácia continua carregado (histórico); loader sai ≠ 0 |
| Formato mudou | SIOPE/SIOPS levanta erro de contrato, ou farmácia "nenhum mapeado" | Registro `falha`+`formato_mudou`; dado anterior intacto |
| Vazio suspeito | Fonte marcada no catálogo, JSON com 0 linhas, última coleta boa com >0 | Arquivos da fonte não carregados; registro `falha`+`resposta_vazia_suspeita`; sai ≠ 0 |
| Vazio legítimo | Fonte não marcada (ou última coleta boa também 0) | Registro `sucesso` com `total_linhas` 0 (como hoje) |
| Falha antes do prazo | Última coleta boa há 1 dia, falha hoje, tolerância 4 | Mart: `ultima_coleta_em` = coleta boa, `ultima_falha_em` = hoje; frescor `coleta_em_dia` |
| Falha após o prazo | Última coleta boa além da tolerância | Frescor `coleta_atrasada`, `ultimaColetaEm` = coleta boa |
| Só falhas | Fonte sem nenhum `sucesso` | `situacao_monitoramento` `sem_registro`; frescor `coleta_sem_registro` |
| Dois portais | Falha só no portal A | Portal B sem `ultima_falha_em` |

</frozen-after-approval>

## Code Map

- `elt/extract/run.py:19` -- `_log_failed` grava `failed_requests.csv`; ganha colunas `fonte` (código do catálogo; listagens Fiorilli → `portal_municipal`, `siconfi_msc_patrimonial` → `siconfi_msc`) e `erro_codigo`. Os `except` dos blocos por fonte (linhas 136–263) passam o código.
- `elt/extract/siope.py:59`, `siops.py:82` -- `SiopeError`/`SiopsError`; "indisponível" encadeia (`from`) o erro de rede. Classificar pela cadeia: `requests.RequestException` → `fonte_fora_do_ar`; erro de contrato/JSON → `formato_mudou`; resto → `erro_inesperado`. Não mudar a validação.
- `elt/extract/farmacia_sus.py:253` -- `coleta_com_falha` já preserva o estoque; expor o código da falha (exceção → classificar; "nenhum mapeado" → `formato_mudou`) para o runner registrar no CSV, sem nova chave de JSON (cada chave vira arquivo).
- `elt/load/run.py:149` -- `main`: ler `failed_requests.csv`, agrupar arquivos por fonte antes de carregar, pular fonte com falha (exceto `farmacia_sus/coletas.json`), checar vazio suspeito antes de carregar (`estabelecimentos_cnes` usa `replace=True`), registrar sucessos e falhas e `sys.exit(1)` quando houver falha.
- `elt/load/coletas.py` -- `registro_coletas` ganha `resultado` e `erro_codigo` (TEXT, `ADD COLUMN IF NOT EXISTS`); função de falha e leitura de `total_linhas` da última coleta com sucesso; `load_source_catalog` traz a coluna nova.
- `elt/transform/seeds/seed_fontes_coleta.csv` + `seeds.yml` -- coluna booleana `resposta_vazia_e_suspeita`.
- `elt/transform/models/staging/coletas/_sources.yml` + `stg_coletas__registro_coletas.sql` -- colunas novas; `coalesce(resultado, 'sucesso')`.
- `elt/transform/models/marts/fct_coletas_por_fonte.sql` + `_fct_coletas_por_fonte.yml` -- `ultima_coleta_em`/`total_coletas` só de `sucesso`; novas `ultima_falha_em`, `ultimo_erro_codigo` (contrato `enforced`).
- `.github/workflows/ingestion-group.yml:279` -- passo de carga anota a falha e continua; passo final `if: always()` reprova o job.
- `packages/db/src/queries/frescor-fontes.ts` -- não muda; só ganha teste.
- Testes: `elt/load/__tests__/test_coletas_loader.py` (dublês `_run_main`/`_write_run`), `elt/tests/test_fct_coletas_por_fonte.py`, `packages/db/src/queries/__tests__/frescor-fontes.spec.ts`, `elt/extract/__tests__/`.

## Tasks & Acceptance

**Execution:**
- [x] `elt/extract/` -- função de classificação de erro (nova, compartilhada) + colunas novas no CSV + código da farmácia -- falha chega ao loader com fonte e motivo.
- [x] `elt/load/coletas.py` + `elt/load/run.py` -- registro de falha, pulo da fonte, vazio suspeito, código de saída.
- [x] seed, `_sources.yml`, staging, mart e contratos -- colunas e regra de sucesso.
- [x] `ingestion-group.yml` -- falha visível no fim do job, depois do dbt.
- [x] Testes da matriz: loader (fora do ar e formato alterado provam linhas raw anteriores intactas; vazio suspeito; vazio legítimo; isolamento), classificação de erro, mart (falha não sobrescreve `ultima_coleta_em`) e paridade TS (falha antes e depois da tolerância).

**Acceptance Criteria:**
- Given uma execução com falha, when o loader termina, then o processo sai ≠ 0 depois de registrar todas as fontes e o job do workflow fica vermelho.
- Given as mudanças, when `make test`, `make check`, `make test/ts` e `pnpm typecheck` rodam, then todos passam.

## Design Notes

Vazio suspeito se decide antes de carregar, contando linhas nos JSON da fonte; depois do load seria tarde para fontes com `replace=True`. A farmácia com falha já não traz estoque nem CNES, então carregar só `coletas.json` mantém o histórico de falhas da Epic 19 sem tocar no dado.

## Verification

**Commands:**
- `make dbt/seed && make dbt/run` (banco local 5544) -- expected: contrato do mart válido
- `make test && make check` -- expected: verde
- `make db/test/build && make test/ts && pnpm typecheck` -- expected: verde (lembrete: `db/test/build` só no 5545)

## Implementation Notes

- Extrator: `elt/extract/errors.py` classifica pela cadeia de causas; `failed_requests.csv` ganhou `fonte` e `erro_codigo`; a farmácia expõe o código da falha sem nova chave de JSON.
- Loader: pula a fonte inteira com falha (a farmácia ainda carrega `coletas.json` quando a falha veio do extrator), decide o vazio suspeito antes de carregar, registra sucessos e falhas e sai com 1.
- dbt: `resposta_vazia_e_suspeita` no seed; staging faz `coalesce(resultado, 'sucesso')`; o mart usa só `sucesso` em `ultima_coleta_em`/`total_coletas` e expõe `ultima_falha_em`/`ultimo_erro_codigo`.
- Workflow: o passo de carga anota o portal em `load_failures.txt` e segue; o passo final `always()` reprova o job.
- Verificação (subagente): `make check`, `make test` (498), `make db/test/build`, `make test/ts`, `pnpm typecheck` verdes. `make dbt/seed && make dbt/run` no 5544 não rodou.

## Spec Change Log

- 2026-11-13 (Julio): linha "Só falhas" da matriz corrigida de frescor `nao_monitorado` para `coleta_sem_registro`, que é o que `frescor-fontes.ts` já devolve para `sem_registro`; o código não muda.

## Review Triage Log

| Achado | Veredito | Rota | Evidência |
|---|---|---|---|
| Teste do runner para a falha da farmácia (CSV com `fonte=farmacia_sus`) | high | patch | Apagar o bloco `if farmacia_error_code` mantém todos os testes verdes; a queda da farmácia sairia com código 0. |
| Teste de vazio suspeito para `farmacia_sus` e `portal_municipal` | medium | patch | Só `siope` é testado; remover o filtro de `coletas.json` não quebra nada e a CNES (`replace=True`) seria apagada. |
| Identificadores novos em português no Python (`fonte_do_arquivo`, `ultimo_erro_codigo`/`ultimo_erro_mensagem` no extrator) | low | patch | Convenção de código técnico em inglês; renomeação direta. |
| Primeira falha vence quando uma fonte repete falha (sem teste) | low | patch | `reversed` + dict faz a primeira vencer; falta asserção. |
| Vazio suspeito nunca se desfaz se a fonte zerar de verdade | low | rejeitado | Segue a regra da spec (última coleta com sucesso trouxe linhas); contorno manual existe e o conserto exige mecanismo novo. Registrado para o Julio. |
| Corrupção de JSON/`dict` em `_count_rows` | low | rejeitado | Antes também quebrava no `json.loads` do laço de carga; sai ≠ 0 de qualquer forma. |
| `record_failures` com fonte desconhecida | false | rejeitado | Toda fonte do CSV vem do extrator ou do fallback `portal_municipal`, ambos no catálogo. |
| CSV legado sem `fonte` com listagem `siope`/`siops` | low | rejeitado | Só CSVs anteriores à mudança; o extrator sempre grava `fonte`. |
| Execução sem timestamp não registra a falha | low | rejeitado | O diretório de execução sempre tem timestamp; o código de saída 1 continua. |
| Farmácia em vazio suspeito não carrega `coletas.json` | false | rejeitado | A matriz diz "arquivos da fonte não carregados"; o histórico só segue em "fonte fora do ar". |
| Falha antiga continua no mart depois de recuperação | low | rejeitado | A spec manda expor a última falha; nenhuma tela lê as colunas ainda (comparação fica para a UI). |
| Qualquer queda do loader vira "falha de fonte" no workflow | low | rejeitado | Segue a decisão 3; o job fica vermelho no fim de qualquer forma. |
| `classify_error` percorre `__context__`; 4xx como fora do ar | low | rejeitado | Cenário improvável hoje; o conserto é mais que correção direta. |
| `portal_municipal` soma todas as listagens no vazio suspeito | low | rejeitado | A spec decide por fonte; histórico por listagem não existe em `registro_coletas`. |
| `extract` importa constante de `elt.load.coletas`; `fonte` com default | low | rejeitado | Acoplamento sem dano nomeado; mesmo ambiente `elt`. |
| SQL de INSERT duplicado, DDL repetido, JSON lido duas vezes | low | rejeitado | Só custo de manutenção sem dano concreto. |
| Teste TS não exercita as colunas novas | low | rejeitado | `frescor-fontes.ts` ignora as colunas por decisão da spec; o mart é coberto em `test_fct_coletas_por_fonte.py`. |
| Webhook antes do passo final, `sprint-status` com 23-8c, `Implementation Notes` vazias | false | rejeitado | O webhook avisa dado carregado; o `sprint-status` já vinha alterado antes desta story; as notas foram preenchidas. |
| Portal sem `data/raw_runs` só loga "Pulando load" | low | defer | Comportamento anterior à story; registrado em `deferred-work.md`. |
