---
title: 'Ação cívica no card da Farmácia na home'
type: 'feature'
created: '2026-10-22'
status: 'done'
baseline_revision: 'd7cfd1e40f3919307eb5890654f422bd5fdc8284'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-19-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/handoff-remodelagem-home-utilidade.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-19-2-pagina-farmacia-sus-camada-de-dados-e-card-resumo-na-home.md'
warnings: []
deferred:
  - 'Limite de 15 dias da Farmácia no seed de constantes fiscais (ver deferred-work.md)'
  - 'Termômetros de MDE e Saúde e PainelSaudeFiscalCard (ver deferred-work.md)'
---

<intent-contract>

## Intent

**Problema:** Quando o estoque da Farmácia SUS está sem divulgação atualizada (`apagao`: 0 itens ou posição com mais de 15 dias), a home mostra só a faixa "Sem informação de estoque" com "Ver detalhes". Os botões de ação (copiar requerimento e compartilhar no WhatsApp) existem apenas em `/[portalSlug]/saude/farmacia`, por decisão da Story 19.2.

**Abordagem:** Estender o `FarmaciaResumoCard` existente no estado `apagao` com os dois botões, reaproveitando a lógica do `farmacia-sus-sentinela-banner.tsx` por extração de um trecho compartilhado. Sem componente novo e sem mudança na camada de dados. Aproveitar para corrigir a citação legal de "Art. 6º-B" para "Art. 6º-A".

## Boundaries & Constraints

**Always:**
- Gatilho único: `status === "apagao"`. `conforme` mantém a busca; `indisponivel` continua `return null` (pode ser falha de coleta ou ausência de publicação; não induz ação).
- Apresentação burra: textos do requerimento e do WhatsApp vêm de `buildRequerimentoFiscalizacao` e `buildTextoWhatsApp` (hoje em `app/[portalSlug]/saude/farmacia/view-model.ts`); mover para local compartilhado se necessário. O `ResumoFarmaciaSusDTO` da home já traz `dataPosicaoMaisRecente` e `diasDesdePosicaoMaisRecente`.
- A palavra "apagão" nunca aparece na UI (código interno apenas, Regra 10). Manter o badge "Sem informação de estoque"; contexto conforme `editor-cidadao` (ver Design Notes).
- Citação legal correta: **Art. 6º-A da Lei nº 8.080/1990, incluído pela Lei nº 14.654/2023**, com link oficial `target="_blank"` e `rel="noopener noreferrer"` (Regra 20 do web). Usar `urlLegislacao("lei14654")` e `urlLegislacao("lei8080")`.
- Tom de indício: "possível descumprimento", nunca afirmar descumprimento como fato. O gatilho de 15 dias é parâmetro do portal, não prazo legal.
- Regra 23: sem município, UF ou ano fixos. Alvos de toque de pelo menos 44 px (`min-h-11`).

**Never:**
- Não criar componente novo de ação cívica nem painel fiscal.
- Não alterar ELT, mart, seed, fixture nem `@transparencia/db`.
- Não exibir botões em `conforme` nem em `indisponivel`.
- Não duplicar clipboard, texto do requerimento ou link do WhatsApp.

## Design Notes

- Revoga a restrição "somente nesta rota" da Story 19.2 para estes dois botões.
- Badge (mantido): "Sem informação de estoque". Contexto sugerido (Creuza): "Não encontramos estoque divulgado nos últimos 15 dias. Isso não quer dizer que falta remédio: pode ser que a informação não tenha sido publicada. A [Lei 14.654/2023](link) pede divulgação atualizada." Ajustar para cobrir também 0 itens. O texto atual "como exige a Lei 14.654/2023" soa afirmativo e deve ser suavizado.
- Sentinela da rota: "prevê a divulgação quinzenal" é adequado; sugestão: "atualização quinzenal dos estoques nas páginas do gestor do SUS".
- Verificação legal (Jurandir): Lei 14.654/2023 acrescenta o art. 6º-A à Lei 8.080/1990 ("atualização quinzenal"); vigência desde 20/02/2024 (24/08/2023 + 180 dias, LC 95/1998 Art. 8º § 1º). Fontes: DOU 24/08/2023 (ed. 162, p. 7), Planalto `l14654.htm` e `l8080.htm`. Não existe "Art. 6º-B".

## Tasks & Acceptance

**Execution:**
- [ ] Extrair o bloco de botões (copiar, WhatsApp, feedback de cópia) de `components/farmacia/farmacia-sus-sentinela-banner.tsx` para componente compartilhado em `components/farmacia/`, usado pelo banner e pelo card.
- [ ] `farmacia-resumo-card.tsx`: no estado `apagao`, receber `requerimento` e `textoWhatsApp` (props) e renderizar os botões ao lado de "Ver detalhes". Ajustar o contexto conforme Design Notes.
- [ ] Home (`app/[portalSlug]/view-model.tsx`): montar `requerimento` e `textoWhatsApp` a partir de `resumoFarmacia` e do nome do portal, reutilizando os builders existentes; passar ao card em `page.tsx`.
- [ ] Corrigir "Art. 6º-B" para "Art. 6º-A" em: `saude/farmacia/view-model.ts:55`, `farmacia-sus-sentinela-banner.tsx:78`, `view-model.spec.ts:124/131`, `epic-19-context.md:26`, `handoff-remodelagem-home-utilidade.md:47`, `handoff-tecnico-anomalia-medicamentos-dbt.md:13`, `public/llms-full.txt` e `public/llms.txt` se citarem.
- [ ] Atualizar `llms.txt` / `llms-full.txt` (Regra 12) com os botões na home no estado de ausência de divulgação.
- [ ] Testes: `farmacia-resumo-card.spec.tsx` (apagao exibe botões e links com `rel`; conforme e indisponivel não), cópia e WhatsApp, `view-model.spec.ts` (citação 6º-A), `page.spec.tsx` da home se aplicável.
- [ ] Revisão do `editor-cidadao` nos textos novos e do `jurista-fiscal` no requerimento antes do merge.

**Acceptance Criteria:**
- Given `status === "apagao"`, when a home renderiza, then o card mostra contexto, "Ver detalhes" e os botões "Copiar Requerimento de Fiscalização" e "Compartilhar no WhatsApp" com alvo mínimo de 44 px.
- Given `conforme` ou `indisponivel`, then os botões não aparecem e `indisponivel` segue sem render.
- Given o requerimento copiado, then cita "Art. 6º-A da Lei nº 8.080/1990" e a Lei nº 14.654/2023 com URLs oficiais e fala em "possível descumprimento".
- Given a UI, then a palavra "apagão" não aparece em nenhum texto visível.
- Given os testes, `make test/ts` e `pnpm build` passam sem regressão na rota da Farmácia (o banner continua com os mesmos botões).

## Verification

**Commands:**
- `pnpm test` (ou `make test/ts`) — paridade e specs do web
- `pnpm build` — tipagem
- `grep -rn "6º-B" apps _bmad-output` — esperado sem ocorrências

**Manual checks:**
- Home de um portal em `apagao`: botões visíveis, cópia funciona, WhatsApp abre com link da rota da Farmácia.

## Out of scope

- Limites de pessoal da LRF lidos do seed: issue #61.
- Limite de 15 dias no seed e opinião jurídica sobre BNAFAR: `deferred-work.md`.
- Termômetros de MDE e Saúde e `PainelSaudeFiscalCard`: `deferred-work.md`.

</intent-contract>

## Review Triage Log

### 2026-10-22 — Review pass
- verdicts: ~30 achados dos 4 revisores — patches aplicados 7, deferidos 2, rejeitados o restante
- findings:
  - `[medium]` `patch` view-model da home sem teste (farmaciaRequerimento/TextoWhatsApp) — adicionados testes apagao/conforme/indisponivel/sem nome
  - `[medium]` `patch` nome do portal vazio gerava "Ouvidoria de ." — textos só são montados com portalName
  - `[low]` `patch` llms.txt/llms-full.txt com linha "Visão Geral" desatualizada — atualizadas
  - `[low]` `patch` indisponivel sem teste explícito e conforme sem props — testes adicionados
  - `[low]` `patch` vazamento de mocks (clipboard/window.open) — afterEach com restore
  - `[low]` `patch` feedback de cópia não resetava — setFeedback("idle") no início
  - `[low]` `defer` "15 dias" fixo no texto do card — sugerido pela própria spec (Design Notes); parâmetro no seed já está em deferred
  - `[low]` `defer` revisão editor-cidadao/jurista-fiscal dos textos — exige revisão humana antes do merge
  - `[low]` `reject` fallback de clipboard, popup blocker, live region, layout, payload RSC, duplicação de classes — hipotéticos/fora da intenção; reaproveita comportamento do banner existente
  - `[false]` `reject` "6º-B" remanescente em epics.md/spec-19-2 — descrevem a própria correção

## Auto Run Result

Status: done. Card da Farmácia na home exibe os botões de copiar requerimento e compartilhar no WhatsApp em `apagao`; componente compartilhado `farmacia-acoes-civicas.tsx`; citação corrigida para Art. 6º-A; llms atualizados.
Verificação: vitest 987/987, tsc sem erros. `pnpm build` falhou só na auditoria de rede do pnpm (next build concluiu). `make test/ts` e checagem manual no navegador não executados.
Risco residual: revisão editor-cidadao e jurista-fiscal pendente.
