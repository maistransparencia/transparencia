---
title: 'Gasto com Pessoal pelo Número Oficial do RGF (12 Meses)'
type: 'feature'
created: '2026-11-11'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/DESIGN.md'
  - '{project-root}/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/pessoal` divide a despesa com pessoal acumulada no ano pela RCL estimada do portal. A LRF mede 12 meses por competência (art. 18 §2º) e a RCL oficial vem do RGF. No ano em andamento o número não é comparável com os limites.

**Approach:** Ingerir o RGF Anexo 1 do SICONFI (Executivo municipal) em `siconfi_rgf`, no schema raw do portal (padrão atual; migração para `raw_siconfi` é a Story 26.5). A página mostra um bloco oficial autocontido (despesa de 12 meses, RCL ajustada, percentual e período, todos do RGF) e só ele recebe veredito. O total pago em folha do portal fica em bloco separado, com nota.

## Boundaries & Constraints

**Always:** `portal_slug`/`cod_ibge` em chave, JOIN e GROUP BY, sem literal de município, UF ou ano (§23). Nomes explícitos (§9), códigos em snake_case (§10). Periodicidade (Q ou S) e número do período vêm da resposta da API, sem configuração por município. Veredito compara com `seed_constantes_fiscais` usando `>` nos três limites (art. 20 III b, art. 22 par. único, art. 59 §1º II). Sem RGF publicado: estimativa rotulada, sem veredito. Execução só no Docker local 5544 (§15), com `make db/backup` antes. Textos passam pelo `editor-cidadao`; citação da LRF pelo `jurista-fiscal`, com link oficial.

**Decisão (Julio, 2026-11-11):** a tela mostra só o período do RGF (ex.: "3º quadrimestre de 2024"), sem data de publicação, porque a API `/rgf` não a devolve; data de entrega fica para story própria.

**Never:** Misturar numerador de uma fonte com denominador de outra. Calcular "diferença para bater" entre RGF e portal fora de "Ver detalhes". Poder Legislativo, limite consolidado de 60%, schema por fonte novo, mudar o comportamento da MSC.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| RGF publicado | Último período do ano selecionado existe | Bloco oficial com percentual, período e veredito | N/A |
| RGF ausente | API devolve `items: []` (ex.: Natividade 2024, a reconfirmar) | Estimativa rotulada, sem comparação anual nem veredito | Extrator grava 0 linhas, sem erro |
| Ano em andamento | Só períodos parciais publicados | Usa o último período publicado, com seu rótulo | N/A |
| Comparação anual | Mesmo período nos dois anos | Compara 3º quad. com 3º quad. (ou semestre) | Sem par: omite a comparação |
| Limite | percentual igual ao limite | Sem veredito de excesso (`>`) | N/A |

</frozen-after-approval>

## Code Map

- `elt/extract/siconfi_msc.py` -- cliente HTTP, limite de taxa, retries, `_safe_*`; extrair base comum (endpoint+params) sem mudar a MSC
- `elt/extract/run.py:120-139` -- runner SICONFI por portal e ano; adicionar `siconfi_rgf`
- `elt/load/siconfi.py` -- `ensure_siconfi_table` + `upsert`; modelo para `siconfi_rgf`
- Endpoint verificado: `.../tt/rgf?an_exercicio&in_periodicidade=Q|S&nr_periodo&co_tipo_demonstrativo=RGF&no_anexo=RGF-Anexo 01&co_esfera=M&co_poder=E&id_ente`. Contas: `DespesaComPessoalTotal` (coluna "TOTAL (ÚLTIMOS 12 MESES) (a)" e "% sobre a RCL Ajustada"), `ReceitaCorrenteLiquidaAjustada`, `ReceitaCorrenteLiquidaLimiteLegal`
- `elt/transform/models/staging/<portal>/` e `marts/metrics/` -- staging + mart com `portal_slug`, ano, periodicidade, período
- `packages/db/src/queries/pessoal-metrics.ts:89-200` -- `percentualFolha`, fallback `total_folha` (l.147-150), `rclProxy`/`receitaCorrenteLiquida` duplicados, comparadores `>=` em l.183-184 (a lei diz `>`)
- `apps/web/app/[portalSlug]/pessoal/{loader,view-model,page}.ts(x)` -- paliativo (`isCurrentYear`, `exibirMarcadores`, `notaEstimativaLrf`) a adaptar; specs ao lado
- `apps/web/public/llms.txt`, `llms-full.txt` -- atualizar

## Tasks & Acceptance

**Execution:**
- [ ] `elt/extract/siconfi_msc.py`, `elt/extract/siconfi_rgf.py` -- base comum + `SiconfiRgfExtractor` (testes em `elt/extract/__tests__`)
- [ ] `elt/load/siconfi.py`, `elt/extract/run.py` -- tabela `siconfi_rgf` e runner
- [ ] `elt/transform/models/...` -- staging e mart do RGF + yml com testes (dbt-transparencia)
- [ ] `packages/db/src/queries/pessoal-metrics.ts` -- ler mart; campo único oficial vs estimado; sem fallback silencioso; `>` nos limites; testes de paridade
- [ ] `apps/web/app/[portalSlug]/pessoal/*` -- bloco oficial, bloco do portal com nota, "Ver detalhes"; rótulos dinâmicos
- [ ] `llms.txt`, `llms-full.txt`, `epics.md` -- atualizar

**Acceptance Criteria:**
- Given RGF publicado, when abre `/pessoal`, then percentual, despesa 12 meses e RCL vêm do mesmo período do RGF e só esse bloco tem veredito.
- Given RGF não publicado, when abre `/pessoal`, then aparece estimativa rotulada, sem veredito.
- Given dois portais, when o mart é consultado, then nenhum valor cruza `portal_slug`.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

Teste de plausibilidade (Porciúncula, 2024, 3º quad., API): 53,46% sobre RCL ajustada de R$ 132,2 mi, teto 54%. O percentual oficial vem pronto da API; o portal só compara com o seed.

## Verification

**Commands:**
- `make db/backup` -- antes de qualquer teste que apague o banco
- `make test` e `make check` -- expected: verde
- `pnpm test && pnpm typecheck` -- expected: verde
