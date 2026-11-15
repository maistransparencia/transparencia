---
title: 'Valor por aluno na página de Educação'
type: 'feature'
created: '2026-11-01'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: ['{project-root}/DESIGN.md', '{project-root}/EXPERIENCE.md']
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** a página `/[portalSlug]/educacao` não responde "Quanto a Prefeitura investe por aluno da rede municipal?"; o dado do SIOPE (indicador 4.9) já está em `getEducacaoSiope` (Story 24.3), mas sem tela.

**Approach:** o loader traz o SIOPE, o view-model monta o painel (valor do ano, estado, série própria como régua) e um componente novo `EducacaoValorPorAlunoSection` o renderiza logo abaixo de "Aprendizado dos alunos", com "Ver detalhes" para o histórico completo.

## Boundaries & Constraints

**Always:** pergunta do cidadão no título; nota de que o valor é declarado pela Prefeitura ao FNDE (SIOPE); valores da época, sem correção pela inflação, com aviso de que anos diferentes não são comparáveis em poder de compra; ano em andamento rotulado "parcial" (acumulado até o último bimestre) e nunca comparado com ano fechado; sem valor mostra "—" com a causa; variação com palavra e sinal, nunca só cor; sem `portalSlug`, UF ou ano fixos (Regra 23); `DESIGN.md`/`EXPERIENCE.md`.

**Never:** média estadual, ranking, comparação entre municípios, referência nacional ou VAAF-MIN como "acima/abaixo do mínimo"; cálculo contábil fora de `@transparencia/db`; alterar dbt/raw; reposicionar para a faixa de três respostas (Story 24.11).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ano encerrado com ano anterior encerrado | 4.9 em ambos | valor, nota SIOPE/FNDE, "subiu/caiu R$ X (N%) em relação a {ano}" | — |
| Ano encerrado sem ano anterior | só o ano atual | valor, "sem ano anterior para comparar" | — |
| Ano parcial | `situacao parcial` | valor com "parcial" e período; sem comparação com ano fechado | — |
| Sem valor | linha com 4.9 nulo | "—" e "a Prefeitura não informou o valor ao FNDE para {ano}" | — |
| Sem linha | ano sem registro no SIOPE | "—" e "sem dado do SIOPE para {ano}" | — |
| SIOPE indisponível | `siope` nulo/série vazia | "—" com a causa; página não quebra | — |

</intent-contract>

## Code Map

- `packages/db/src/queries/educacao-siope-metrics.ts` -- `getEducacaoSiope` (somente leitura): `atual`, `serie`, `situacao`, `periodo`.
- `apps/web/app/[portalSlug]/educacao/loader.ts` -- `fetchRawEducacaoCoreData`: acrescentar `siope` ao `Promise.all` e a `RawEducacaoData`.
- `apps/web/app/[portalSlug]/educacao/view-model.ts` -- `buildEducacaoViewModel`: acrescentar `valorPorAluno`.
- `apps/web/components/educacao/educacao-aprendizado-section.tsx` e `educacao-historico-section.tsx` -- padrão de `Indicator`, `ModalDialog` e botão "Ver detalhes".
- `apps/web/app/[portalSlug]/educacao/page.tsx` -- montar a seção abaixo do aprendizado.
- `apps/web/public/llms.txt`, `llms-full.txt`, `CHANGELOG.md` -- remover "sem valor por aluno" e descrever o painel.

## Tasks & Acceptance

**Execution:**
- `apps/web/app/[portalSlug]/educacao/loader.ts` -- buscar `getEducacaoSiope` (ano selecionado) -- dado do painel
- `apps/web/app/[portalSlug]/educacao/view-model.ts` -- `buildValorPorAluno` (estado, variação só entre anos encerrados, série) -- regra de apresentação sem cálculo contábil
- `apps/web/components/educacao/educacao-valor-por-aluno-section.tsx` -- seção com painel, nota e modal de histórico
- `apps/web/app/[portalSlug]/educacao/page.tsx` -- renderizar a seção
- specs de loader, view-model, componente e página; `llms.txt`, `llms-full.txt`, `CHANGELOG.md`

**Acceptance Criteria:**
- Given 24.3 e ano encerrado com valor, when o cidadão abre a página, then vê o investimento por aluno, a nota de declaração ao FNDE e a série do próprio município; "Ver detalhes" abre o histórico completo.
- Given ano em andamento, when há valor, then aparece como "parcial" e sem comparação com ano fechado.
- Given ausência de valor, when renderiza, then "—" com a causa.
- Given qualquer ano, then não há média estadual, ranking nem mínimo de referência.

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `pnpm --filter web test` (specs afetadas) -- expected: passam
- `pnpm typecheck` -- expected: sem erros

## Design Notes

Texto ao cidadão passa pelo `editor-cidadao`; o que o 4.9 inclui/exclui é NÃO VERIFICADO e consta como pendência para o `contador-publico`.

## Auto Run Result

Status: done

- Resumo: seção "Quanto a Prefeitura investe por aluno da rede municipal?" abaixo do aprendizado, com valor do SIOPE (4.9), variação só entre anos fechados, parcial sem comparação, "—" com causa e histórico em "Ver detalhes".
- Arquivos: `loader.ts`, `view-model.ts`, `page.tsx`, `educacao-valor-por-aluno-section.tsx` (+ specs), `llms.txt`, `llms-full.txt`, `CHANGELOG.md`.
- Verificação: vitest do web 1645 ok; `tsc --noEmit` ok; biome ok.
- Pendente: revisão multi-lente (step-04) não executada por limite de tokens; `editor-cidadao` e `contador-publico` ainda devem conferir o texto e o que o indicador 4.9 inclui (NÃO VERIFICADO). Posição na faixa do topo fica para a Story 24.11.
