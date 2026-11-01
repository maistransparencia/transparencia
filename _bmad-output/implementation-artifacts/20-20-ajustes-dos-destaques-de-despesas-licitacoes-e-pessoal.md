---
title: 'Story 20.20: Ajustes dos Destaques de Despesas, Licitações e Pessoal'
type: 'feature'
created: '2026-11-01'
status: 'ready-for-dev'
baseline_revision: 'f767fd842c6883a207d6ce16b721f944208c8a17'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/DESIGN.md'
  - '{project-root}/EXPERIENCE.md'
  - '{project-root}/docs/glossario-cidadao.md'
  - '{project-root}/docs/governanca-constantes-fiscais.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problema:** o destaque de `/despesas` usa `font-mono`, `text-5xl font-bold` e `max-w-*` no subtítulo, fora do padrão de `/receitas` (`eyebrow` + `stat-value-lg text-brand-text` + `caption`). `/licitacoes` abre com cinco indicadores soltos, sem valor principal, e com um alerta técnico (`div` com `bg-warn-fill/10`, três artigos de lei no corpo). `/pessoal` mostra "proventos brutos, {ano}" mesmo em ano parcial, sem dizer o período.

**Abordagem:** alinhar os três destaques ao padrão de `/receitas`. Em `/licitacoes`, dois valores principais (licitações ativas e total empenhado em contratos vigentes) acima de um `IndicatorPanel` com os cinco indicadores atuais; alerta reescrito em linguagem cidadã dentro de `AlertBox` tipo `info`. Em `/pessoal`, legenda com o período do ano parcial.

**Origem:** decisão do Julio (2026-11-01), a partir de capturas de tela. Deve ser concluída antes da 20.17 e do fechamento da Epic 20.

## Boundaries & Constraints

**Always:**
- Pergunta do cidadão por destaque, em linguagem comum: "Quantas licitações estão ativas agora?" e "Quanto a prefeitura já reservou para pagar contratos vigentes em {ano}?". Cada valor diz o recorte na legenda (Regra 27).
- **Licitações ativas** = situação `aberta` ou `em_andamento` (decisão do Julio); rótulo "ativas", nunca "abertas".
- **Total empenhado** = soma de `totalEmpenhado` dos contratos vigentes do ano (`contratosServicosVigentes`); legenda "contratos vigentes em {ano}". Com filtro por entidade, os dois destaques refletem o filtro.
- Os dois totais são calculados em `@transparencia/db` (Regra 2), funcional e imutável (`reduce`), e a página só formata. Nomes explícitos (Regra 9), por exemplo `totalEmpenhadoContratosVigentes` e `quantidadeLicitacoesAtivas`.
- Período parcial vem de `partialPeriod`, o mesmo das outras páginas; sem período, "até agora". Nada de mês, ano ou UF fixo (Regra 23).
- Alerta: `AlertBox` tipo `info` (o `warning` só entra com algo comprovado), título de poucas palavras e corpo de até duas frases, sem repetir o percentual que o indicador já mostra, tom de indício. Texto passa pelo `editor-cidadao`; citações legais (Art. 74, 75 e 86 da Lei 14.133/2021) conferidas pelo `jurista-fiscal` e movidas, com os links atuais, para um "Ver detalhes" logo abaixo, junto da média histórica de referência.
- Elementos base nus e papéis (`eyebrow`, `stat-value-lg`, `caption`), só tokens semânticos, sem `dark:`, hex, `slate-*`/`gray-*` nem `font-mono` fora de `table`/`numeric`; preservar `aria-*` e `data-testid`.
- Specs de página atualizados; spec de componente para o que for criado.

**Never:** alterar o resultado de queries existentes; mudar dados ou textos fora dos blocos citados; alterar `AlertBox`, `IndicatorPanel` ou `Indicator`; mexer em `opengraph-image.tsx`; remover aliases (20.19); adicionar dependências; editar `sprint-status.yaml`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| `/pessoal` em ano parcial | `isCurrentYear` e `partialPeriod` preenchido | legenda "proventos brutos no período ({período})" | sem período: "até agora" |
| `/pessoal` em ano fechado | ano anterior | "proventos brutos, {ano}" e tendência como hoje | — |
| `/despesas` sem empenhado | `empenhado` = 0 | destaque sem a frase "Isso é X% do que estava reservado" | — |
| `/licitacoes` sem licitações ativas | lista vazia | destaque "0" com legenda neutra, sem erro | — |
| `/licitacoes` sem contratos vigentes | lista vazia | total não vira "R$ 0" enganoso: estado neutro "sem contratos vigentes em {ano}" | — |
| `/licitacoes` filtrada por entidade | `empresaIds` ativo | os dois destaques refletem o filtro; alerta usa a versão "nas entidades selecionadas" | — |
| Sem anomalia de dispensa | `hasAnomaliaDispensa` falso | nenhum alerta nem "Ver detalhes" de concentração | — |
| Outro estado, histórico de 2017 a 2027 | outro portal e anos | nenhum texto fixo de UF, município ou ano | — |

</intent-contract>

## Code Map

- `apps/web/app/[portalSlug]/despesas/page.tsx` (+ `page.spec.tsx`) -- destaque `despesas-resumo-destaque`, linhas 85-110.
- `apps/web/app/[portalSlug]/licitacoes/{page.tsx,loader.ts,view-model.ts}` (+ `page.spec.tsx`, `view-model.spec.ts`) -- `IndicadoresLinha`, alerta e cabeçalho.
- `apps/web/app/[portalSlug]/pessoal/page.tsx` -- destaque `pessoal-destaque`, linhas 101-111.
- `apps/web/app/[portalSlug]/receitas/page.tsx` -- modelo do destaque e da legenda de período (somente leitura).
- `packages/db/src/queries/{licitacoes-metrics.ts,contratos-servicos-vigentes.ts}` -- fonte dos dois totais (`getLicitacoesEmAndamentoMetrics`, `getContratosServicosVigentes`); testes de paridade em `__tests__/`.
- `packages/ui/src/components/alert-box.tsx` e o `IndicatorPanel`/`Indicator` já usados em `/despesas` -- reuso, somente leitura.
- `DESIGN.md` (`alert-box`, `stat-value`), `docs/glossario-cidadao.md`.

## Tasks & Acceptance

**Execution:**
- `despesas/page.tsx` -- `eyebrow`, `stat-value-lg text-brand-text`, `caption`; subtítulo e frase de apoio na largura inteira -- AC 1
- `packages/db` -- funções puras que devolvem `quantidadeLicitacoesAtivas` (aberta + em andamento) e `totalEmpenhadoContratosVigentes`, com teste de paridade -- AC 2
- `licitacoes/{loader,view-model}.ts` -- expor os dois totais já filtrados por entidade -- AC 2
- `licitacoes/page.tsx` -- hero com dois `stat-value-lg` e legenda de recorte; cinco indicadores em `IndicatorPanel` -- AC 2
- `licitacoes/page.tsx` -- alerta em `AlertBox` `info` com texto novo; "Ver detalhes" com citações legais e média histórica; versão filtrada -- AC 3
- Revisão do texto do alerta pela **Creuza** e das citações pelo **jurídico** (`jurista-fiscal`); total empenhado conferido pelo **Atanagildo** (`contador-publico`) -- AC 3
- `pessoal/page.tsx` -- legenda com período em ano parcial -- AC 4
- Specs de página (`despesas`, `licitacoes`, `pessoal`) ajustados; os de `/licitacoes` que buscam "Concentração de contratações diretas." e "Taxa de Contratação Direta" acompanham o novo markup -- AC 5

**Acceptance Criteria:**
1. Given `/despesas`, when renderiza, then o destaque segue o padrão de `/receitas` e o subtítulo ocupa a largura inteira do contêiner, com o texto mantido.
2. Given `/licitacoes`, when renderiza, then os valores em destaque são licitações ativas (aberta ou em andamento) e total empenhado em contratos vigentes, ambos com recorte na legenda, calculados em `@transparencia/db` e refletindo o filtro por entidade; os cinco indicadores atuais ficam dentro de um `IndicatorPanel`.
3. Given anomalia de contratação direta, when a página renderiza, then o alerta é um `AlertBox` `info` em linguagem cidadã, no máximo duas frases, tom de indício; citações legais e média histórica ficam em "Ver detalhes".
4. Given `/pessoal` em ano parcial, when renderiza, then a legenda inclui o período, no padrão de `/receitas`; em ano fechado segue "proventos brutos, {ano}".
5. Given a suíte, when executada, then `pnpm typecheck`, `pnpm test` e `biome` passam; nenhum dado, query ou texto fora dos blocos acima mudou; Regra 23 respeitada.

## Verification

- `pnpm typecheck`, `pnpm test` e `biome` em `apps/web`, `packages/db` e `packages/ui`.
- Capturas de tela antes e depois das três páginas (claro e escuro, desktop e mobile), com ano fechado e ano parcial.
- Checklist da Regra 23: a tela continua correta para outro estado (ex.: MG) e com histórico de 2017 a 2027?
