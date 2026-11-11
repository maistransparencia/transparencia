---
title: 'Ingestão bimestral do SIOPE para o ano em andamento'
type: 'feature'
created: '2026-11-01'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
warnings: []
deferred: []
---

## Intent

**Problema:** o extrator só pedia a consulta anual (`tpPeriodo: "A"`); o ano em andamento voltava sem linhas e não aparecia.

**Abordagem:** para anos sem fechamento, pedir `tpPeriodo: "B"` (bimestres 1 a 5) e gravar o bimestre mais avançado em que os 6 indicadores existem, com `tipo_periodo = bimestral`. O mart já usa o maior `periodo` por ano (`parcial` até o 6, `encerrado` no 6).

## Verificação na API real (2026-11-01, Porciúncula)

- 2026 bimestral: 4.9 tem bimestres 2 a 4 (4.836,80 / 7.804,75 / 11.325,75); 1.1 tem 1 a 4 (23,40 / 26,90 / 27,58 / 26,43). 5º e 6º sem linhas.
- Defasagem: em 01/11/2026 o último bimestre disponível é o 4º (jul-ago), isto é, ~2 meses.
- O valor é **acumulado no ano** (4.9 cresce a cada bimestre). 4.9 pode faltar nos primeiros bimestres, daí a regra "bimestre completo".
- 2025 bimestral traz 1 a 6, e o 6º confere com o anual (16.767,14). Consulta anual de 2026 segue vazia.

## Tasks & Acceptance (concluídas)

- `elt/extract/siope.py` -- consulta bimestral só para anos sem fechamento; sem literal de tenant ou ano.
- `elt/load/siope.py` -- documenta `bimestral` (1 a 5).
- `elt/extract/__tests__/test_siope.py`, `elt/tests/test_fct_educacao_siope_metricas.py` -- testes com a resposta real (parcial, e fechamento substitui parciais).
- Verificado: `make check`, `make test` (232 ok), `pnpm typecheck`. `pnpm test` (TS) não rodou: sem mudança em TS e sem `postgres_test` ativo.


## Review Triage Log

### 2026-11-01 — Review pass (follow-up)
- verdicts: 20 findings — high 0, medium 0, low 1, false 1, maybe-false 0 (demais agrupados como rejeitados/duplicados abaixo)
- findings:
  - `[low]` `patch` teste "resposta real" só compara constantes do próprio teste (Blind, Edge, Verification, Intent) — reescrito para passar a resposta real por `extrair_portal` e afirmar `periodo 4`, `bimestral` e valores acumulados.
  - `[low]` `reject` fechamento não remove linhas bimestrais antigas no loader — o upsert mantém as parciais por desenho; o mart usa o maior `periodo` por ano e o teste do mart cobre isso. Fix exigiria DML novo no loader.
  - `[low]` `reject` numPeri 6 em consulta bimestral aborta o portal — falha explícita desejada; a API real não devolveu 5º/6º bimestre. Sem cenário demonstrado.
  - `[low]` `reject` `valIndi` nulo conta como presente — mesmo comportamento da consulta anual já existente; sem caso real.
  - `[false]` `reject` hard-code de 2026/Porciúncula em testes (Blind) — fixture de teste documentando resposta real, não código de produção/mart.
  - `[low]` `reject` demais pontos (regressão de bimestre entre execuções, bimestres intermediários faltando, isolamento de falha anual/bimestral, `accepted_values`, aviso de valor parcial na UI, `_fake_request` permissivo, ano vazio/múltiplos) — sem dano demonstrado nesta mudança; texto ao cidadão é da Story 24.3.

## Auto Run Result

Status: done

- Resumo: extrator pede `tpPeriodo "B"` para anos sem fechamento e grava o bimestre mais avançado completo (`tipo_periodo = bimestral`).
- Arquivos: `elt/extract/siope.py`, `elt/load/siope.py` (doc), `elt/extract/__tests__/test_siope.py` (teste da resposta real agora exercita o extrator), `elt/tests/test_fct_educacao_siope_metricas.py`.
- Revisão: 1 patch (baixo), 0 deferidos, demais rejeitados conforme o log.
- Revisão de acompanhamento recomendada: false (nenhum patch `high`).
- Verificação: `pytest elt/extract/__tests__/test_siope.py` (21 ok), `make check` ok.
- Pendente fora do escopo: texto ao cidadão do valor parcial (Story 24.3, `editor-cidadao`); carga em produção só com autorização (Regra 15).
