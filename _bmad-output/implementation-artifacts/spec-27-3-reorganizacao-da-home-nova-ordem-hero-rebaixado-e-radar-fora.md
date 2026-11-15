---
title: 'Story 27.3: Reorganização da Home (nova ordem, hero rebaixado e radar fora)'
type: feature
created: '2026-11-09'
status: done
review_loop_iteration: 0
followup_review_recommended: false
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** a home abre pelo hero fiscal (arrecadação) e termina em radar, pipeline e cards técnicos; o cidadão não recebe primeiro a resposta de como a cidade está.

**Approach:** reordenar a página: abertura, "Como está a cidade hoje" (27.2), "Para onde vai o dinheiro público" (arrecadado + saldo em caixa), "Mais detalhes" (atalhos). Radar e pipeline saem da home; componentes e rota `/radar` permanecem.

## Boundaries & Constraints

**Always:** camada de apresentação burra (Regra 2); sem município, UF ou ano fixos (Regra 23, município vazio vira "Municípios Integrados"); um `stat-value-lg` por página; `h1` único, sem pular nível; `llms.txt`/`llms-full.txt` e `CHANGELOG.md` atualizados.

**Never:** seletor de ano no conteúdo; bloco do 13º (27.4) nem texto "em breve"; remover `RadarCivicoFeed`, `PipelineExecucao`, `CardsSecundariosVisaoGeral` do repositório.

</intent-contract>

## Code Map

- `apps/web/app/[portalSlug]/page.tsx` -- nova ordem das seções.
- `apps/web/app/[portalSlug]/view-model.tsx` -- `aberturaHome` (título, período) e `maisDetalhesLinks`.
- `apps/web/components/abertura-home.tsx` (novo) -- eyebrow, `h1`, `lead`, período.
- `apps/web/components/dinheiro-publico-section.tsx` (novo) -- hero rebaixado + `SaldoCaixaResumoCard`.
- `apps/web/components/mais-detalhes-section.tsx` (novo) -- atalhos Despesas, Licitações, Pessoal.
- `apps/web/components/saldo-caixa-resumo-card.tsx` -- descrição "Saldo disponível nas contas da Prefeitura".
- `apps/web/app/[portalSlug]/page.spec.tsx` -- testes da nova ordem.

## Decisões

- Pontos "a confirmar com o Julio" (sem humano na execução, adotada a proposta da story): o `stat-value-lg` fica no total arrecadado; os atalhos de "Mais detalhes" substituem os `CardsSecundariosVisaoGeral`. Rever se o Julio decidir outra coisa.
- O espaço do bloco "Dinheiro que entra na cidade" (27.4) é só a ordem na página: nada é renderizado.

## Tasks & Acceptance

**Execution:**
- componentes novos, `page.tsx`, `view-model.tsx`, `saldo-caixa-resumo-card.tsx`, `page.spec.tsx`, `llms*.txt`, `CHANGELOG.md`.

**Acceptance Criteria:**
- Given a home, when carrega, then a ordem é abertura, "Como está a cidade hoje", "Para onde vai o dinheiro público", "Mais detalhes"; sem Radar, pipeline nem cards secundários; `h1` único.
- Given município sem nome, then `h1` é "Municípios Integrados".

## Verification

- `pnpm typecheck` e `pnpm vitest run` em `apps/web` -- expected: passam.

## Auto Run Result

Status: done

- Mudança: home reordenada (abertura, situação, dinheiro público, mais detalhes); radar, pipeline e cards secundários fora da home; `llms*.txt` e `CHANGELOG.md` atualizados.
- Verificação: `pnpm typecheck` e `pnpm vitest run` em `apps/web` passam (1785 testes); `biome check` só com aviso antigo.
- Revisão: feita em linha sobre o diff, sem subagentes (CLAUDE.md §3).
- Follow-up recomendado: false.
- Risco residual: decisões "a confirmar com o Julio" seguiram a proposta; o loader ainda busca radar e demais dados que a home não usa mais (limpeza fica para outra story); textos não passaram pelo `editor-cidadao`; sem verificação visual no navegador.
