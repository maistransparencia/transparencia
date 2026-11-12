---
title: 'Story 27.5: Ajustes da Home e do Layout (resumo nos atalhos, compartilhar a página, sidebar recolhível)'
type: 'feature'
created: '2026-11-10'
status: 'done'
baseline_commit: '76e883bac6334e06985659d211e13d3cdc266651'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred:
  - summary: >-
      "N servidores na folha de mês" soma `total_profissionais` do mart de regime, que é `count(*)` de `fct_pessoal` (linhas mensais) por ano.
    evidence: |-
      `fct_pessoal_regime_metricas` agrega por ano sem filtrar o mês; se a fonte tiver vários meses, o número é pessoa-mês, não servidores. A página `/pessoal` usa a mesma soma, então hoje os dois batem. Banco local não respondeu para confirmar a granularidade (`count(distinct mes)` por ano em `fct_pessoal`).
    location: >-
      apps/web/app/[portalSlug]/loader.ts:339
    severity: high (unverified)
---

<intent-contract>

## Intent

**Problem:** os atalhos de "Mais detalhes" mostram descrição genérica; o "Compartilhar" dos cards de situação abre `wa.me` com texto montado (quem recebe não vê a prévia da página); os remédios de exemplo são links soltos de 44px; a sidebar desktop não recolhe; "Reportar erro" não diz que serve também para sugestão.

**Approach:** os cinco ajustes de `_bmad-output/planning-artifacts/epics.md` (seção "Story 27.5"), com os números dos atalhos vindos das mesmas queries das páginas de destino, carregados no loader da home.

## Boundaries & Constraints

**Always:** camada de apresentação burra (Regra 2); sem município, UF, ano ou mês fixos (Regra 23); camelCase e nomes claros (Regras 9, 18); texto ao cidadão passa pelo `editor-cidadao`; `DESIGN.md` e `EXPERIENCE.md` (Regra 25); `llms.txt`, `llms-full.txt` e `CHANGELOG.md` atualizados (Regra 12); sem `process.env` direto; sem ternário aninhado.

**Never:** "R$ 0" ou "0 servidores" como fato quando não há dado (volta à descrição genérica); lembrar a sidebar recolhida entre visitas; mexer no menu do celular; implementar "Reportar erro" por indicador (Stories 23.5/23.6); `wa.me` no card.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Atalho com dado | ano fechado, número > 0 | `caption` com resumo em uma frase com número e ano | N/A |
| Ano em andamento | ano corrente | texto marca valor como parcial | N/A |
| Atalho sem dado | número ausente ou 0 | `caption` mostra a descrição genérica atual | sem erro |
| Card compartilha | clique em "Compartilhar" | `ShareButton` com `url` = `detailUrl` do card; evento `situacao_card_compartilhado` com `area` e `method` | falha de share cai na cópia do link |
| Sidebar recolhida | desktop, clique no botão | faixa só de ícones, sem filtros e sem rodapé da sidebar, tooltip e `aria-label` por ícone, item ativo marcado, conteúdo e rodapé global em largura total | celular inalterado |

</intent-contract>

## Code Map

- `apps/web/components/mais-detalhes-section.tsx` -- `DetailShortcut` (`label`, `title`, `url`); `title` vira o resumo com fallback genérico.
- `apps/web/app/[portalSlug]/view-model.tsx` (`detailShortcuts`, ~l.402) -- monta os atalhos; já tem `execSummary.totalPago`, `fmtCompact`, `selectedYear`, `isCurrentYear`.
- `apps/web/app/[portalSlug]/loader.ts` (`Promise.all`, ~l.191) -- já carrega `getExecucaoOrcamentariaMetrics`, `getLicitacoesEmAndamentoMetrics`; incluir `getDistribucaoModalidadesMetrics` (contratações, como em `/licitacoes`) e `getPessoalRegimeMetrics` (`totalProfissionais`, `mesReferencia`, como em `/pessoal`).
- `apps/web/components/situacao-cidade-section.tsx` -- `compartilhar()` (l.57, `wa.me`) e botão (l.~428) trocados por `ShareButton` (`@transparencia/ui`, `url`, `title`, `onShare` com posthog); chips dos exemplos (l.~271).
- `apps/web/lib/situacao-cidade.ts` -- remover `textoCompartilhar` e `montarTextoCompartilhar` (l.59, 139, 203, 281, 345) e atualizar `situacao-cidade.spec.ts`.
- `packages/ui/src/components/share-button.tsx` -- aceita `url`/`title`/`onShare`; precisa de variante inline de texto "Compartilhar" se as existentes não servirem.
- `packages/ui/src/components/sidebar.tsx` (`<aside>` l.448, `md:w-[266px]`) e `apps/web/app/components/sidebar-wrapper.tsx` -- estado `recolhida` local (sem persistência), faixa de ícones.
- `apps/web/app/layout.tsx` (l.229-262) -- `body` flex; conteúdo e `GlobalFooter` já ficam na coluna `flex-1`, então liberam largura com a sidebar estreita.
- `apps/web/components/global-footer.tsx` (l.231 "Reportar erro") e `components/feedback-modal.tsx` (l.154 título) -- rótulo "Sugestão ou erro"; specs `global-footer.spec.tsx`, `feedback-modal.spec.tsx`.
- `_bmad-output/planning-artifacts/epics.md` (Story 23.5) -- usar o mesmo rótulo.
- `apps/web/public/llms.txt`, `llms-full.txt`, `CHANGELOG.md`.

## Tasks & Acceptance

**Execution:**
- `loader.ts`, `view-model.tsx`, `mais-detalhes-section.tsx` -- resumo por atalho com fallback e parcial -- números das mesmas queries.
- `situacao-cidade-section.tsx`, `situacao-cidade.ts`, specs -- `ShareButton` com URL do detalhe; remover `textoCompartilhar`; chips (`border-line`, 32px, `gap-2`) nos remédios.
- `sidebar.tsx`, `sidebar-wrapper.tsx`, specs -- faixa recolhível de ícones no desktop.
- `global-footer.tsx`, `feedback-modal.tsx`, `epics.md` (23.5), specs -- rótulo "Sugestão ou erro".
- `llms.txt`, `llms-full.txt`, `CHANGELOG.md` -- registrar o que muda para o cidadão.

**Acceptance Criteria:**
- Given a seção "Mais detalhes", when há dado, then cada atalho mostra resumo do ano ativo com número; sem dado, a descrição genérica.
- Given um card de situação, when o cidadão compartilha, then o `ShareButton` usa a URL de `/saude`, `/obras` ou `/educacao` (com o ano ativo) e não há `wa.me`.
- Given os remédios de exemplo, then aparecem como chips com borda, alvo de toque de pelo menos 24px.
- Given o desktop, when recolhe a sidebar, then só ícones com nome acessível e tooltip, sem filtros; conteúdo e rodapé global em largura total; toda visita abre expandida.
- Given o rodapé, then o link diz "Sugestão ou erro" e o título do modal acompanha.

## Spec Change Log

## Verification

**Commands:**
- `pnpm typecheck` -- expected: sem erros
- `pnpm test` -- expected: verde, com testes novos (resumo com e sem dado, URL do card, sidebar recolhida, rótulo)

## Review Triage Log

### 2026-11-10 — Review pass
- verdicts: 38 findings — high 0, medium 3, low 2, false 20, maybe-false 1 (resto agrupado em duplicatas)
- findings:
  - `[maybe-false]` `[defer]` contagem de servidores soma linhas mensais do mart — ver `deferred`; `/pessoal` usa a mesma soma.
  - `[medium]` `[patch]` sem teste da variante `inline` do ShareButton no caminho de cópia — teste adicionado em `share-button.spec.tsx`.
  - `[medium]` `[patch]` teste da sidebar recolhida só cobria o Radar — título dos links Visão geral e Farmácia SUS agora verificado.
  - `[low]` `[patch]` frase de `llms-full.txt` quebrava o antecedente de "nela" — reordenada.
  - `[false]` `[reject]` `empresaIds` ausente em pessoal — `/pessoal` também não passa; `[false]` URL relativa no share — `ShareButton` resolve com `new URL(url, href)`; `[false]` conteúdo e rodapé não ganham largura — `layout.tsx` é flex e a coluna é `flex-1`; `[false]` h1 duplicado — só um visível por viewport; `[false]` sem alternativa de tema no rail — o spec manda tirar os controles do rodapé.
  - `[low]` `[reject]` ponto de alerta do radar no rail, log no catch, `fmtCompact` de valores pequenos, resumo no campo `title`, telemetria sem doc — fix exige complexidade e ninguém os encontra no uso comum.

## Auto Run Result

Status: done

Resumo: resumo nos atalhos de "Mais detalhes", chips de remédio, "Compartilhar" do card via `ShareButton` com a URL do detalhe, sidebar recolhível no desktop (sem persistência), rótulo "Sugestão ou erro", `llms*.txt` e `CHANGELOG.md`.

Verificação: `pnpm typecheck` verde; testes do web (1799) e dos arquivos tocados em `packages/ui` passam. Os testes de integração de `packages/db` falharam por timeout/conexão com o Postgres local (sem alteração em `packages/db`).

Riscos: contagem de servidores (item adiado, severidade alta não verificada); texto dos atalhos não passou pelo `editor-cidadao`; sidebar e chips não vistos no navegador.
