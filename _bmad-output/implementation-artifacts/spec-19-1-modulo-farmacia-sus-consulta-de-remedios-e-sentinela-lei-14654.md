---
title: 'Pipeline ELT da Farmácia SUS (Lei 14.654/2023): estoque BNAFAR/Hórus e estabelecimentos CNES'
type: 'feature'
created: '2026-10-19'
status: 'done'
baseline_revision: 'e5398f7a38a26cc2a2fbc1fef60ce701b6214d3e'
final_commit: '5b4ae53'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-19-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/handoff-remodelagem-home-utilidade.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problema:** O portal não tem dados estruturados do estoque de medicamentos das farmácias SUS municipais, nem como saber se o município cumpre a transmissão quinzenal da Lei 14.654/2023.

**Abordagem:** ELT no padrão do projeto: extract/load em Python trazem estoque BNAFAR/Hórus e estabelecimentos CNES para `raw_farmacia_sus`, e o dbt expõe o mart `fct_farmacia_estoque` com o status de conformidade. UI e camada `@transparencia/db` pertencem à Story 19.2.

## Boundaries & Constraints

**Always:** Nenhuma chamada HTTP à API do SUS em runtime; execução somente contra o Postgres local em desenvolvimento (Regra 15); `portal_slug` em chaves, joins e agrupamentos (Regra 23); códigos em lowercase snake_case (`conforme`, `apagao`, `indisponivel`); sem payload bruto nas tabelas raw; ingestão dentro do `ingestion-pipeline.yml` global; falha de coleta nunca vira apagão.

**Never:** Sem UI, sem `getFarmaciaSus`, sem alterações em `llms.txt`, sem workflow dedicado.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Transmissor | Posição mais recente por CNES ≤ 15 dias | `conforme`, itens vigentes por unidade | — |
| Apagão vazio | Coleta com sucesso e 0 itens | `apagao` | — |
| Apagão defasado | Posição mais recente por CNES > 15 dias | `apagao` | — |
| Falha de coleta | 404, campos sem mapeamento, limite de páginas, IBGE inválido | Coleta `falha` e `indisponivel` | Estoque anterior preservado |
| CNES repetido | Várias competências (`nu_comp`) do mesmo estabelecimento | Prevalece a competência mais recente | — |

</intent-contract>

## Code Map

- `elt/extract/farmacia_sus.py`, `elt/load/farmacia_sus.py` -- extract/load (registrados em `elt/extract/run.py` e `elt/load/run.py`)
- `elt/transform/models/staging/farmacia_sus/` -- staging; `models/marts/fct_farmacia_estoque.sql` e yml -- mart
- `Makefile` (`elt/farmacia-sus`) -- extract, load e dbt locais; `.github/workflows/ingestion-pipeline.yml` -- pipeline global
- `elt/extract/__tests__/test_farmacia_sus.py`, `elt/load/__tests__/test_farmacia_sus_loader.py`, `elt/tests/test_fct_farmacia_estoque.py` -- testes

## Tasks & Acceptance

**Execution:**
- Extract, load, staging, mart, alvo `make` e testes conforme o Code Map; `CHANGELOG.md` com a entrada do pipeline.

**Acceptance Criteria:**
- Given um portal transmissor, when o pipeline roda, then o mart marca `conforme` com itens por unidade.
- Given 0 itens ou posição defasada, then `apagao`.
- Given falha de coleta, then `indisponivel`, nunca `apagao`.
- Given dois portais, then cada um lê só linhas do seu `portal_slug`.

## Spec Change Log

## Review Triage Log

### 2026-10-19 — Review pass
- verdicts: 4 camadas, ~45 achados agrupados — high 4, medium 8, low 6, false 0, maybe-false 3
- findings:
  - `[high]` `patch` 404/204 e deriva de campos da API viravam coleta 'sucesso' com 0 itens (apagão falso) — extrator passa a registrar 'falha'; 404 erra, registros sem mapeamento e limite de páginas viram falha
  - `[high]` `patch` frescor medido contra data_coleta, não current_date; conforme sem itens/nulos — mart agora usa current_date, 'indisponivel' para coleta ausente/antiga e conforme exige item nomeado
  - `[high]` `patch` frescor por município contaminado por unidades legadas — cálculo por CNES (spike ao vivo)
  - `[high]` `patch` falha antes do try / falha CNES deixavam coleta antiga ou apagavam CNES — IBGE dentro do try; chave CNES omitida na falha
  - `[medium]` `patch` INSERT único estoura 65535 parâmetros; ordem de carga com coletas antes do estoque; arquivos sem loader ignorados — lotes de 5000, coletas por último, warning
  - `[medium]` `patch` injeção via inputs.portal no workflow — workflow dedicado removido por decisão do usuário; pipeline global já cobre
  - `[medium]` `patch` view-model sem testes; clipboard sem feedback; 'Atualizado em null' — spec novo, fallback de erro, guarda de data
  - `[medium]` `patch` lotes diferentes colidiam no id_registro — numero_lote na chave
  - `[low]` `patch` constante TS não usada; JSDoc desposicionado; literais de tenant em teste
  - `[maybe-false]` `defer` parsing de quantidade '1.234' (milhar BR) e quantidade negativa — payload real traz float; liquidar com amostra real
  - `[low]` `defer` texto jurídico "descumprindo" afirma violação — revisão editorial/jurídica
  - `[low]` `reject` fuso/UTC, aria-live, tel:, cores literais, limite de 50 itens, posição acima do hero — fora do escopo da 19.1 (19.2/19.4) ou cosmético
  - `[low]` `defer` subtítulo do banner ainda diz "mais de 15 dias" em apagão sem data

## Verification

**Commands:**
- `make check`, `make test`, `make db/fixture/check` -- expected: verde

## Auto Run Result

Status: done

- Escopo final: somente ELT (commit `5b4ae53`, após squash). A UI e a camada de dados inicialmente implementadas foram retiradas por decisão do Julio e movidas para a Story 19.2.
- Revisão: patches aplicados (frescor por CNES, falhas de coleta, lotes de inserção, ordem de carga), itens adiados (parsing de quantidade com milhar brasileiro, texto jurídico a revisar).
- Verificação: `make check`, `make test` (182), `make db/fixture/check` verdes. A extração ao vivo contra a API do SUS foi validada manualmente pelo usuário.
- Riscos residuais: payload da API conhecido por fixtures de um spike; `followup_review_recommended: true`.
