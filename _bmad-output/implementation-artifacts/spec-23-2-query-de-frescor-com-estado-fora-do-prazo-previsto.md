---
title: 'Query de frescor com estado "fora do prazo previsto"'
type: 'feature'
created: '2026-11-12'
status: 'done'
baseline_commit: '7556192fff3d8fc67c5158cef05da7c2afe1401d'
route: 'dispatch'
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-23-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A 23.1 grava quando cada fonte foi coletada, mas nada responde ao cidadão se o dado está em dia. Sem essa resposta, o selo da 23.4 seria só uma data colada na tela.

**Approach:** O catálogo `seed_fontes_coleta` ganha `descricao_dados` e `tolerancia_dias`, que o mart `fct_coletas_por_fonte` repassa. Uma query nova em `@transparencia/db` devolve, por fonte de um portal, a situação `coleta_em_dia`, `coleta_atrasada` ou `nao_monitorado`, calculada contra uma data de referência recebida como parâmetro. Só dados, sem tela.

**Decisões do Julio (2026-11-12):** tolerâncias `diaria` 4, `semanal` 10, `mensal` 40, `anual` 400 dias; `sob_demanda` sem tolerância (nunca `coleta_atrasada`). `descricao_dados` usa o texto aprovado na tabela da Story 23.2 em `epics.md`. Fontes ainda `nao_monitorado` saem assim; a 23.8 vem depois do selo.

## Boundaries & Constraints

**Always:** cálculo só em `packages/db`; data de referência como parâmetro (sem `now()`/`current_date`); filtro por `portal_slug`; DTO em camelCase com nomes explícitos; códigos em snake_case; ordem estável (por `fonte`); valores de tolerância e texto só no seed.

**Never:** afirmar que o dado é recente (a situação mede só a nossa coleta; período mais recente publicado é a Story 23.9); componente ou texto de UI (23.4); registrar falha de carga (23.3); alterar extratores ou o loader `elt/load/coletas.py`; literais de tenant, UF ou ano; rodar dbt fora do banco local.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Coleta em dia | `diaria`, última coleta 4 dias antes da referência | `coleta_em_dia`, `ultimaColetaEm` preenchida | N/A |
| Coleta atrasada | `diaria`, última coleta 5 dias antes | `coleta_atrasada` | N/A |
| Sem registro | `situacao_monitoramento = sem_registro` | `nao_monitorado`, `ultimaColetaEm` nula | N/A |
| Não monitorado | `situacao_monitoramento = nao_monitorado` | `nao_monitorado`, `ultimaColetaEm` nula | N/A |
| Coleta vazia | `ultima_coleta_total_linhas = 0`, dentro da tolerância | `coleta_em_dia` | N/A |
| Sob demanda | `sob_demanda`, coleta há 2 anos | `coleta_em_dia` | N/A |
| Outro portal | mesma `fonte` em dois portais | só as linhas do portal pedido | N/A |
| Slug inválido | `portalSlug` vazio | lista vazia | sem consulta ao banco |

</frozen-after-approval>

## Code Map

- `elt/transform/seeds/seed_fontes_coleta.csv` -- catálogo; ganha `descricao_dados` e `tolerancia_dias` (vazio em `sob_demanda`).
- `elt/transform/seeds/seeds.yml:249` -- `column_types` e testes do seed; acrescentar as duas colunas.
- `elt/transform/models/marts/fct_coletas_por_fonte.sql` -- cross join portal × catálogo; repassar `f.descricao_dados`, `f.tolerancia_dias`.
- `elt/transform/models/marts/_fct_coletas_por_fonte.yml` -- contrato `enforced: true`; declarar as duas colunas.
- `elt/tests/test_fct_coletas_por_fonte.py` -- teste dbt do mart (fixtures `portais`, `coleta`); acrescentar asserção das colunas novas.
- `elt/load/coletas.py` -- lê o CSV com `DictReader`; colunas extras não o afetam. Não mudar.
- `packages/db/src/queries/saude-farmacia-resumo.ts` -- padrão a seguir: função pura `montar…` testável + `get…` que lê o banco.
- `packages/db/src/queries/farmacia.ts:110` -- `isPortalSlugValido` (privado); replicar a guarda local ou exportar.
- `packages/db/src/queries/__tests__/emendas-parlamentares.spec.ts` -- padrão de teste com `insertInto`/`deleteFrom` em mart no banco de teste (5545).
- `packages/db/src/index.ts` -- reexportar a query nova.

## Tasks & Acceptance

**Execution:**
- [x] `elt/transform/seeds/seed_fontes_coleta.csv` + `seeds.yml` -- adicionar as colunas com os valores decididos; `tolerancia_dias` integer, testes `not_null` em `descricao_dados`.
- [x] `fct_coletas_por_fonte.sql` + `_fct_coletas_por_fonte.yml` -- repassar e declarar as colunas (`descricao_dados` text not null, `tolerancia_dias` integer).
- [x] `elt/tests/test_fct_coletas_por_fonte.py` -- asserir as colunas novas para uma fonte diária e uma `sob_demanda`.
- [x] `packages/db/src/queries/frescor-fontes.ts` -- `montarFrescorFontes(linhas, dataReferencia)` pura + `getFrescorFontes(portalSlug, dataReferencia)`; tipos `SituacaoFrescor` e `FrescorFonteDTO` (`fonte`, `descricaoDados`, `frequenciaEsperada`, `ultimaColetaEm`, `situacao`).
- [x] `packages/db/src/queries/__tests__/frescor-fontes.spec.ts` -- matriz I/O inteira, incluindo a fronteira exata, com dados inseridos em `fct_coletas_por_fonte` e removidos no fim.
- [x] `packages/db/src/index.ts` -- exportar.

**Acceptance Criteria:**
- Given `make dbt/seed` e `make dbt/run` no banco local, when o mart é consultado, then toda linha tem `descricao_dados` e só `sob_demanda` tem `tolerancia_dias` nulo.
- Given as mudanças, when `make test`, `make check`, `make db/test/build`, `make test/ts` e `pnpm typecheck` rodam, then todos passam.

## Design Notes

Dias decorridos = diferença em dias de calendário entre `dataReferencia` (AAAA-MM-DD) e a data UTC de `ultima_coleta_em`; `coleta_atrasada` quando `diasDecorridos > tolerancia_dias`. A data em UTC evita fuso fixo por UF (Regra 23); as coletas rodam em UTC e a tolerância de dias absorve a diferença de horas. `ultimaColetaEm` sai como timestamp ISO completo; a UI formata.

## Verification

**Commands:**
- `make dbt/seed && make dbt/run` (banco local 5544) -- expected: sucesso, contrato do mart válido
- `make test && make check` -- expected: verde
- `make db/test/build && make test/ts && pnpm typecheck` -- expected: verde

## Implementation Notes

## Spec Change Log

## Review Triage Log

| Achado | Veredito | Rota | Evidência |
|---|---|---|---|
| `dataReferencia` inválida vira `NaN` e a fonte sai `coleta_em_dia` | medium | patch | `packages/db/src/queries/frescor-fontes.ts`: `montarFrescorFontes` agora lança erro; teste "recusa data de referência inválida". |
| Asserção de `tolerancia_dias` nula comparava listas ordenadas por acaso | low | patch | `elt/tests/test_fct_coletas_por_fonte.py`: trocada por comparação de conjuntos. |
