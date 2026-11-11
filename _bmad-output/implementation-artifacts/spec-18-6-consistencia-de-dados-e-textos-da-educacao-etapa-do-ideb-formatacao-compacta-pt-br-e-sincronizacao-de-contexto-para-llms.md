---
title: 'Consistência de dados e textos da Educação (etapa do IDEB, fmtCompact pt-BR, llms)'
type: 'bugfix'
created: '2026-10-17'
status: 'done'
baseline_revision: 'f03b6867ca7e367aae428473732e7436d7106cd3'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred:
  - summary: >-
      fmtCompact arredonda para 1.000,0 mil em valores como 999.950 em vez de promover para mi
    evidence: |-
      Comportamento pré-existente da fronteira de faixa; não coberto pela intenção.
    location: >-
      packages/ui/src/utils/formatters.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** `getResumoEducacao` mistura etapas (cai para anos finais quando a nota dos anos iniciais é nula), `fmtCompact` usa ponto decimal (`R$ 33.3mi`) e `llms.txt`/`llms-full.txt`/card OpenGraph da Educação ainda citam MDE e custo por aluno, que a página e o card da home não exibem mais.

**Approach:** Restringir o resumo às métricas dos anos iniciais (sem fallback para anos finais), formatar compactos em pt-BR (`R$ 33,3 mi`) e alinhar textos/OG ao que a página realmente exibe.

## Boundaries & Constraints

**Always:** lógica no `@transparencia/db`; camelCase; sem ternários aninhados; sem anos/UF hard-coded (remover `?? 2025` do OG); atualizar `llms.txt` e `llms-full.txt` (Regra 12); `fmtCompact` com vírgula decimal e espaço antes do sufixo (`R$ 33,3 mi`, `R$ 500,0 mil`, `R$ 1,0 bi`).

**Never:** preencher nota/meta/evolução/ranking do resumo com anos finais; alterar `anosFinais` exposto no resumo; criar novo formatter paralelo; remover o cálculo de `getEducacaoMetrics`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Com nota inicial | anosIniciais com `notaIdeb` | resumo usa dados dos anos iniciais | — |
| Sem nota inicial | anosIniciais sem nota, anosFinais com nota | `notaIdeb`, `metaIdeb`, `atingiuMeta`, `crescimentoPontosIdeb`, `posicaoRanking` = `null` | UI exibe "—" |
| Só anos finais | sem linha de anos iniciais | indicadores de IDEB `null`; `anosFinais` segue disponível | — |
| Compacto | 33_300_000 / 500_000 / 1_000_000_000 | `R$ 33,3 mi` / `R$ 500,0 mil` / `R$ 1,0 bi` | — |

</intent-contract>

## Code Map

- `packages/db/src/queries/educacao-metrics.ts:254-328` -- `getResumoEducacao`: `primary`/`secondary` com `??` entre etapas; ranking já usa `anosIniciais`.
- `packages/db/src/queries/__tests__/educacao-metrics.spec.ts` -- testes de paridade do resumo.
- `packages/ui/src/utils/formatters.ts:8-26` -- `fmtCompact` com `toFixed(1)` (ponto decimal).
- Specs com formato antigo (`R$ 15.2mi`, `500.0mil`): `apps/web/app/[portalSlug]/view-model.spec.ts`, `previdencia/page.spec.tsx`, `components/previdencia-saldo-caixa-card.spec.tsx`, `components/termometro-opacidade-fiscal.spec.tsx`, `components/__tests__/radar-anomalia-card.spec.tsx` (localizar demais via grep `\d\.\dmi|mil|bi`).
- `apps/web/app/[portalSlug]/educacao/opengraph-image.tsx:42-115` -- métricas do card: MDE (fallback "25,0%") e `?? 2025`; trocar por indicadores exibidos na página (nota IDEB, evolução, ranking/despesa Função 12).
- `apps/web/components/og/og-routes.spec.tsx` -- spec do OG da Educação.
- `apps/web/public/llms.txt:42` e `apps/web/public/llms-full.txt:325-328,388` -- remover MDE/custo por aluno.
- Consumidores de `getResumoEducacao`: `app/[portalSlug]/loader.ts`, `educacao/loader.ts` (+ specs).

## Tasks & Acceptance

**Execution:**
- `packages/db/src/queries/educacao-metrics.ts` -- usar apenas `anosIniciais` para nota/meta/evolução/SAEB/fluxo/ranking; sem `secondary` -- evitar mistura de etapas
- `packages/db/src/queries/__tests__/educacao-metrics.spec.ts` -- casos: com nota inicial, sem nota inicial, só anos finais
- `packages/ui/src/utils/formatters.ts` -- `fmtCompact` via `Intl.NumberFormat("pt-BR")` com 1 casa e sufixo ` mi`/` mil`/` bi`
- specs dependentes do formato antigo -- atualizar expectativas
- `apps/web/app/[portalSlug]/educacao/opengraph-image.tsx` e `og-routes.spec.tsx` -- remover MDE e `2025` fixo; apenas dados exibidos na página
- `apps/web/public/llms.txt`, `llms-full.txt` -- descrever só indicadores vigentes (IDEB, SAEB, fluxo, ranking, despesa Função 12, contratos)

**Acceptance Criteria:**
- Given município sem nota IDEB dos anos iniciais, when `getResumoEducacao` é chamado, then nota, meta, evolução e ranking são `null` mesmo havendo anos finais
- Given valores compactos em qualquer tela, when formatados, then usam vírgula decimal pt-BR (`R$ 33,3 mi`)
- Given llms*.txt e OG da Educação, when revisados, then não citam percentual de MDE nem custo anual por aluno
- Given as alterações, when `pnpm build`, `tsc --noEmit`, `make test/ts` e `make test` rodam, then passam

## Spec Change Log

## Review Triage Log

### 2026-10-17 — Review pass
- verdicts: 31 findings — high 0, medium 4, low 7, false 3, maybe-false 0 (restantes: rejeitados/deferidos como cosméticos ou pré-existentes)
- findings:
  - `[medium]` `patch` Metadados de `educacao/page.tsx` ainda citam MDE, FUNDEB e custo por aluno — removidos
  - `[medium]` `patch` llms*.txt descreviam FUNDEB, que a página não renderiza — removido
  - `[medium]` `patch` OG exibia "Estável" quando evolução é nula — agora "—"
  - `[medium]` `patch` `rankingDetail` exibia total sem posição — detalhe neutro quando posição nula
  - `[low]` `patch` `fmtCompact` sem testes unitários — adicionado describe com mi/mil/bi/negativo/<1000
  - `[low]` `defer` Arredondamento em fronteira de faixa (999_950 → "R$ 1.000,0 mil") — pré-existente; fora da intenção
  - `[low]` `reject` Espaço não separável, Intl hoistado, NaN/Infinity em `fmtCompact` — cosmético, sem caso alcançável demonstrado
  - `[false]` `reject` `custoAnualPorAluno` "código morto" — consumido por `educacao/view-model.ts`
  - `[false]` `reject` MDE removido sem mudança na UI — a página não renderiza MDE (`educacao-fiscal-section.tsx` só tem gráfico Despesa vs IDEB)
  - `[low]` `reject` Formatos mistos de percentual (ponto) fora do escopo do `fmtCompact`; demais achados de cobertura do OG/ciclo e `metrics[0]` rejeitados como cosméticos

## Verification

**Commands:**
- `make test/ts` -- expected: todos os testes passam
- `pnpm build` -- expected: build sem erros
- `make test` -- expected: sucesso

## Auto Run Result

Status: done

- **Resumo:** `getResumoEducacao` usa só anos iniciais para IDEB/meta/evolução/SAEB/fluxo; `fmtCompact` em pt-BR (`R$ 33,3 mi`); OG da Educação sem MDE (agora ranking estadual), sem ano fixo; llms*.txt e metadados da página alinhados ao que é exibido.
- **Arquivos:** `packages/db/src/queries/educacao-metrics.ts`, `packages/ui/src/utils/formatters.ts`, `apps/web/app/[portalSlug]/educacao/{opengraph-image,page}.tsx`, `apps/web/public/llms*.txt` e specs correspondentes.
- **Revisão:** 5 patches aplicados, 1 deferido (fronteira de arredondamento), demais rejeitados (ver log).
- **Follow-up recomendado:** false.
- **Verificação:** `make test/ts` (web 861 testes), `pnpm build` e `make test` (133) passaram.
- **Riscos:** posts de bots e radar cívico agora usam vírgula decimal; `mdePercentual` segue no tipo, sempre `null`.
