---
title: 'Story 18.5: Card Resumo de Educação na Homepage e Sincronização de Contexto para LLMs'
type: 'feature'
created: '2026-10-17'
status: 'done'
baseline_revision: '0f3bcb16ef67c1f592bdce0a1b26fea04bee7445'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-18-context.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** A homepage `/[portalSlug]` não apresenta a educação: o cidadão não vê a nota do IDEB, o custo por aluno nem o cumprimento do mínimo de MDE sem entrar em `/[portalSlug]/educacao`, e `llms.txt`/`llms-full.txt` ainda não refletem o card da home.

**Approach:** Carregar `getResumoEducacao` em paralelo no `loadVisaoGeralData`, montar o modelo de apresentação no `view-model.tsx` da home e renderizar `EducacaoResumoCard` (padrão do `ObrasResumoCard`) entre os cards principais, com CTA para `/educacao`. Atualizar `llms.txt` e `llms-full.txt` (Regra 12).

## Boundaries & Constraints

**Always:**
- Reutilizar a query existente `getResumoEducacao` (a "`getResumoEducacaoPorPortal`" do épico é este mesmo contrato); sem nova query em `@transparencia/db`.
- Formatação via `fmtCurrency`/`fmtPercent`; `camelCase` em DTOs/props (Regra 18); zero ternários aninhados (Regra 13); camada de apresentação sem lógica contábil (Regra 2).
- Dados por `portalSlug`, sem literais de município/UF/ano (Regra 23); ano do IDEB vem de `resumo.ano`, não do exercício fiscal selecionado.
- Badge da fonte: "INEP / Censo Escolar". Link legal do Art. 212 da CF/88 com `target="_blank"`, `rel="noopener noreferrer"` e `ExternalLink` (Regra 20). Vocabulário padrão (Regra 24).
- Estados ausentes degradam com graça: `notaIdeb`, `crescimentoPontosIdeb`, `mdePercentual` (hoje sempre `null` no DTO) e `custoAnualPorAluno` nulos exibem "—"/"Não apurado", sem crash nem divisão por zero.

**Never:**
- Não alterar `/educacao`, o DTO nem queries/dbt (sem regenerar fixture).
- Não hardcodar "5.9", "+1.4" ou "25%" como dado; 25% é apenas o limiar constitucional do termômetro.
- Não quebrar o carregamento da home se `getResumoEducacao` retornar `null` (card em estado neutro ou omitido).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Dados completos | `resumo` com nota, crescimento +1.4, custo, `mdePercentual` ≥ 25 | Título, badge INEP, nota `font-serif`, badge "+1,4 ponto", termômetro cumprido, custo `fmtCurrency`, CTA | — |
| Sem MDE | `mdePercentual: null` | Termômetro em estado "Não apurado" | Sem crash |
| Sem crescimento | `crescimentoPontosIdeb: null` | Sem badge de evolução | — |
| Sem resumo | `resumo: null` | Card em estado neutro com CTA para `/educacao` | Sem exceção |
| Queda | crescimento < 0 | Badge "-X,X ponto" em tom negativo | — |

</intent-contract>

## Code Map

- `apps/web/app/[portalSlug]/loader.ts` -- `Promise.all` (l.~177) de `fetchRawVisaoGeralData`; adicionar `getResumoEducacao(tenantSlug)` (sem ano: último ciclo INEP) e `resumoEducacao` no retorno.
- `apps/web/app/[portalSlug]/loader.spec.ts` -- mock de `@transparencia/db` (l.21); incluir `getResumoEducacao` e teste espelhando o de `resumoObras`.
- `apps/web/app/[portalSlug]/view-model.tsx` -- `buildVisaoGeralViewModel`; ao lado de `obrasDetailUrl`/`resumoObras` (l.~318) expor `educacaoDetailUrl: routeUrl("/educacao")` e `educacaoResumo` (nota, crescimento, MDE, custo, ano).
- `apps/web/app/[portalSlug]/view-model.spec.ts` -- fixture raw (l.~65) e testes do novo bloco.
- `apps/web/components/obras-resumo-card.tsx` -- referência de estrutura/estilo, CTA com `Link` e telemetria posthog.
- `apps/web/components/educacao/educacao-hero-section.tsx` -- referência do formato do badge ("+X,X ponto") e nota.
- `apps/web/components/educacao-resumo-card.tsx` -- NOVO `EducacaoResumoCard` + `educacao-resumo-card.spec.tsx`.
- `apps/web/app/[portalSlug]/page.tsx` -- renderizar o card após `ObrasResumoCard`.
- `apps/web/public/llms.txt` (l.30 home, l.42 educacao) e `apps/web/public/llms-full.txt` (§1.7.1, l.~318) -- documentar o card na home, IDEB/Saeb, MDE 25%, FUNDEB 70%.

## Tasks & Acceptance

**Execution:**
- `apps/web/app/[portalSlug]/loader.ts` -- adicionar `getResumoEducacao` ao `Promise.all` e `resumoEducacao` ao retorno -- AC de carga paralela
- `apps/web/app/[portalSlug]/view-model.tsx` -- montar `educacaoResumo` e `educacaoDetailUrl` -- apresentação burra
- `apps/web/components/educacao-resumo-card.tsx` -- criar `EducacaoResumoCard` -- UI do card
- `apps/web/app/[portalSlug]/page.tsx` -- inserir o card na seção de cards principais
- `apps/web/public/llms.txt`, `apps/web/public/llms-full.txt` -- atualizar descrição da home e conceitos IDEB/Saeb/MDE/FUNDEB com a rota `/[portalSlug]/educacao` -- Regra 12
- `loader.spec.ts`, `view-model.spec.ts`, `educacao-resumo-card.spec.tsx` -- testar a matriz de I/O (completo, sem MDE, sem crescimento, `null`, queda)

**Acceptance Criteria:**
- Given a home de um portal com resumo educacional, when carregada, then `EducacaoResumoCard` exibe título "Educação Básica e Desempenho Escolar", badge "INEP / Censo Escolar", nota do IDEB em `font-serif`, badge de evolução, termômetro de MDE, custo por aluno em `fmtCurrency` e CTA "Ver indicadores pedagógicos e despesas detalhadas" para `/[portalSlug]/educacao`.
- Given o loader, when executado, then `getResumoEducacao` roda no mesmo `Promise.all` das demais consultas.
- Given `llms.txt` e `llms-full.txt`, when lidos, then documentam o card/rota `/[portalSlug]/educacao`, IDEB, Saeb, MDE (25%) e FUNDEB (70%), sem detalhes internos de código.
- Given o repositório, when rodam `pnpm test`, `pnpm build` e `tsc --noEmit` (e `make test/ts`), then passam.

## Spec Change Log

- 2026-10-17 — Escopo do card alterado pelo dono do produto: sem custo/aluno e sem MDE; indicadores e ênfase conforme /educacao.
- 2026-10-17 — Despesa liquidada removida do card: não reconcilia com os indicadores financeiros do topo da home; etapas removidas; rótulo 'Nota do IDEB (1º ao 5º ano)'; link da fonte INEP e rodapé com divisor.

## Review Triage Log

### 2026-10-17 — Review pass
- verdicts: 20 findings — high 0, medium 3, low 5, false 4, maybe-false 0 (8 agrupados em defer/reject)
- findings:
  - `[medium]` `[defer]` `mdePercentual` sempre nulo em `getResumoEducacao` (packages/db:324) — pré-existente (18.3/18.4), spec antecipa "Não apurado"; verificar populando MDE na camada de dados (SIOPE/SICONFI).
  - `[medium]` `[patch]` página sem teste de integração do card — adicionado caso em `page.spec.tsx`.
  - `[medium]` `[patch]` sem teste de repasse de `mdePercentual` não nulo no view-model — adicionado.
  - `[low]` `[patch]` ordem de imports em `page.tsx` (Biome) — corrigido com `biome check --write`.
  - `[low]` `[patch]` loader sem caso `resumoEducacao` nulo — teste adicionado.
  - `[low]` `[reject]` rejeição de `getResumoEducacao` derruba a home — mesmo comportamento das demais consultas do `Promise.all`; fix adiciona ramo.
  - `[low]` `[reject]` sinal/arredondamento de crescimento (0,04) — IDEB tem 1 casa decimal, improvável.
  - `[low]` `[reject]` `aria-valuenow` sem clamp, resumo todo nulo, ano do CTA (`?ano=` fiscal), `llms.txt` sem link legal/Radar — improvável ou cosmético.
  - `[false]` NaN/Infinity (valores vêm do banco), badge "INEP / Censo Escolar" (exigido pela AC), `"use client"` (padrão do ObrasResumoCard), try/catch do posthog (já único), formatter duplicado/nomes abreviados (sem violação concreta).

## Verification

**Commands:**
- `pnpm --filter web test` -- expected: verde
- `pnpm --filter web exec tsc --noEmit` -- expected: sem erros
- `pnpm build` -- expected: sucesso
- `make test/ts` -- expected: verde

## Auto Run Result

Status: done

- **Resumo:** card `EducacaoResumoCard` na home com IDEB, evolução, termômetro MDE, custo por aluno e CTA para `/educacao`; `getResumoEducacao` no `Promise.all` do loader; `llms.txt` e `llms-full.txt` atualizados.
- **Arquivos:** `loader.ts`, `view-model.tsx`, `page.tsx`, `components/educacao-resumo-card.tsx` (+ specs), `public/llms.txt`, `public/llms-full.txt`.
- **Revisão:** 4 patches aplicados (3 testes, 1 lint), 1 defer (MDE nulo na camada de dados), demais rejeitados conforme o log.
- **Follow-up recomendado:** false (nenhum patch high; menos de 2 medium com correção de código).
- **Verificação:** specs afetadas (257 testes), `tsc --noEmit`, `make test/ts`, `pnpm build` e suíte web completa (844) passaram.
- **Risco residual:** termômetro de MDE exibirá "Não apurado" até a camada de dados popular `mdePercentual`.

### Ajustes pós-revisão (decisões do dono do produto, 2026-10-17)

- Card sem custo por aluno, MDE, despesa liquidada e etapas; indicadores iguais aos da `/educacao` (nota do IDEB 1º ao 5º ano, ciclo anterior, evolução, meta, classificação com variação de posições) com ênfase verde/âmbar.
- Link da fonte INEP/IDEB no topo e rodapé com divisor; CTA para `/educacao`.
- Card segue o exercício selecionado (`getResumoEducacao(tenantSlug, selectedYear)`), como a página `/educacao`.
- Risco residual: se faltar nota dos anos iniciais, a query cai para os anos finais e o rótulo "1º ao 5º ano" ficaria incorreto.
- Commits finais: `6261ef5` e o fix de exercício selecionado (ver `git log`).
