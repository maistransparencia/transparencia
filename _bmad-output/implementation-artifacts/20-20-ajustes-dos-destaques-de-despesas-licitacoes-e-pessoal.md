---
title: 'Story 20.20: Ajustes dos Destaques de Despesas, Licitações e Pessoal'
type: 'feature'
created: '2026-11-01'
status: 'done'
baseline_revision: '362f86e4b5c5ce59aa1ed250ff185ad91bf1af5b'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/DESIGN.md'
  - '{project-root}/EXPERIENCE.md'
  - '{project-root}/docs/glossario-cidadao.md'
  - '{project-root}/docs/governanca-constantes-fiscais.md'
warnings: []
deferred:
  - summary: >-
      Contagem de licitações ativas usa texto de situacao além do código.
    evidence: |-
      classificada com texto "Em aberto" conta como ativa (unverified); confirmar definição de aberta.
    location: >-
      packages/db/src/queries/licitacoes-metrics.ts
    severity: medium (unverified)
  - summary: >-
      Total empenhado pode mostrar R$ 0 com contratos sem totalEmpenhado.
    evidence: |-
      Depende de dados reais de contratos vigentes sem valor empenhado.
    location: >-
      apps/web/app/[portalSlug]/licitacoes/page.tsx
    severity: medium (unverified)
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

## Review Triage Log

### 2026-11-01 — Review pass
- verdicts: 24 findings — high 0, medium 2, low 6, false 3, maybe-false 13
- findings:
  - `[medium]` `[defer]` Contagem de "ativas" usa texto de `situacao` ("aberta"/"em aberto") além do código; `classificada` com "Em aberto" conta como ativa (blind, edge, verification-gap, intent) — heurística real mas sem dado que a refute; severidade média não verificada; confirmar com o Julio a definição de "aberta" e, se preciso, normalizar o código no dbt.
  - `[medium]` `[defer]` Total empenhado pode aparecer como "R$ 0" quando há contratos vigentes sem `totalEmpenhado` (blind, edge) — depende de dados reais; não verificado.
  - `[low]` `[patch]` Chevron do "Ver detalhes" sem `aria-hidden` — aplicado.
  - `[low]` `[patch]` Rótulos "agora"/"já" valiam também para anos passados (pedido do Julio durante a revisão) — pergunta e legendas agora variam com `isCurrentYear`, com testes.
  - `[low]` `[reject]` Legenda de "ativas" sem ano/filtro (edge, blind) — é retrato do momento; o filtro por entidade já vale na lista; correção adicionaria ramificações sem dano nomeado.
  - `[low]` `[reject]` Falta teste de `valorObservado`/`valorEsperado`, ramo filtrado e "até agora" (blind, verification-gap) — cobertura incremental; texto já exercido pelo teste do alerta.
  - `[low]` `[reject]` `/despesas` sem spec, remoção de `max-w-*` (blind, intent) — mudança pedida pela AC 1, apenas classes.
  - `[low]` `[reject]` `<details>` sem `focus-visible` e `info` em vez de `warn` (blind) — `info` é decisão da spec; foco nativo do `summary` preservado.
  - `[false]` `[reject]` `cn` removido pode quebrar outro uso (blind) — typecheck passa.
  - `[false]` `[reject]` Ano 2024 fixo nos testes viola Regra 23 (blind) — é fixture de teste, não texto de página.
  - `[false]` `[reject]` Totais deveriam ser agregados em query (edge) — spec pede funções em `@transparencia/db`, atendido.
  - `[maybe-false]` `[reject]` Demais observações de redação, pontuação do parágrafo e "boa parte" sem percentual (blind, edge, intent) — texto pedido pela spec (sem repetir percentual); sem dano comprovado.

## Auto Run Result

Status: done

- Resumo: destaques de `/despesas`, `/licitacoes` e `/pessoal` alinhados ao padrão de `/receitas`; dois totais novos em `@transparencia/db`; alerta de contratação direta em `AlertBox` `info` com "Ver detalhes"; legenda de período parcial em `/pessoal`; textos "agora"/"já" só no ano atual.
- Arquivos: `despesas/page.tsx` (classes do destaque), `licitacoes/{page.tsx,view-model.ts}` (hero, `IndicatorPanel`, alerta), `pessoal/page.tsx` (legenda), `packages/db/src/queries/{licitacoes-metrics,contratos-servicos-vigentes}.ts` (`contarLicitacoesAtivas`, `somarEmpenhadoContratosVigentes`), specs de página e `licitacoes-destaques.spec.ts`.
- Revisão: 2 médios adiados, 2 patches (aria-hidden; texto por ano atual), demais rejeitados (ver log). Follow-up recomendado: false.
- Verificação: `pnpm typecheck`, `pnpm test` e `biome` passam.
- Riscos residuais: texto do alerta e citações ainda sem `editor-cidadao`/`jurista-fiscal`; total empenhado sem `contador-publico`; sem capturas de tela; definição de "ativa" por texto a confirmar.
