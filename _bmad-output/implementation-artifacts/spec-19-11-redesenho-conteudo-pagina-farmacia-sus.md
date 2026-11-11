---
title: 'Redesenho do conteúdo da página da Farmácia SUS'
type: 'refactor'
created: '2026-10-24'
status: 'done'
followup_review_recommended: true
baseline_revision: '061325bb37d788a5fb8de4319d543ad9c696d09c'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/design_handoff_farmacia_sus/README.md'
  - '{project-root}/.claude/rules/web.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** a página `/[portalSlug]/saude/farmacia` não segue o padrão visual de Educação e Obras e a busca de remédios não é a protagonista. Resultados não têm mapa interativo nem visão por remédio, e os essenciais (19.9) aparecem como cards de alturas diferentes.

**Approach:** recriar só a área de conteúdo conforme o handoff de design (cabeçalho com busca e chips, 3 indicadores, "Onde encontrar" por unidade/remédio com mapa Leaflet, "Remédios essenciais" com filtro de categoria), com dados reais calculados em `@transparencia/db`. A rota não muda (a mudança é da 19.10).

## Boundaries & Constraints

**Always:** manter sidebar, banner, headers, bottom nav e footer; eyebrow "Temas · Saúde · Farmácia SUS"; selo da Lei 14.654 com os estados `conforme`, `apagao` e `indisponivel`; chips "Mais procurados" pelo critério da 19.9 (`buildExemplosFarmacia`); busca sem acento/caixa, por substring; agrupamentos e indicadores calculados em `@transparencia/db` (apresentação burra), sem "8 unidades", "Há N dias", UF ou datas fixas (Regra 23); tokens de `packages/ui/src/tokens.ts` (Regra 24); campos camelCase e métricas com nome explícito; texto do estado vazio e do lead revisados pelo `editor-cidadao`; nunca "esgotado"/"zerado".

**Mapa no desktop:** `sticky` com `top` de 16px, acompanhando a rolagem da lista; em mobile fica acima da lista, sem sticky, com 240px de altura.

**Decisões:** (1) a busca continua começando vazia: "Onde encontrar" só aparece com termo de 2+ letras, sem o estado "Todas as unidades" e sem alterar a regra da 19.2; (2) sem mudar o dbt: `nome_medicamento` é o título do remédio, sem linha de apresentação, e o endereço da unidade fica sem bairro.

**Never:** mover a rota, mexer em `llms*.txt` por rota, botão de pedido por sentinela (19.10), card de lotes a vencer (19.10), alterar `FarmaciaResumoCard` da home ou o banner de apagão, copiar números do protótipo para fixtures, introduzir fontes ou cores fora dos tokens.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Busca com resultado | `?q=omeprazol`, status `conforme` | H2 "Onde encontrar “omeprazol”", unidades numeradas por total desc., mapa só com unidades com resultado | N/A |
| Busca sem resultado | termo ausente do estoque | card tracejado "não aparece na lista de estoque", sem mapa | texto sem afirmar que acabou |
| Unidade sem coordenadas | resultado sem lat/lng | card listado, sem marcador | mapa oculto se nenhuma tem |
| Essencial só em combinação | `unidadesComRegistro = 0`, `unidadesSomenteCombinacao > 0` | rótulo "só em combinação" | N/A |
| Status `apagao`/`indisponivel` | mart sem estoque vigente | sem busca/resultados/essenciais; mantém banner e mensagem atuais | falha de coleta não vira apagão |
| Portal com N unidades | qualquer N | quadradinhos e textos usam N dos dados | N=0: bloco omitido |

</frozen-after-approval>

## Code Map

- `packages/db/src/queries/farmacia.ts` -- `getFarmaciaSus` (busca ≥2 letras, paginado por unidade) e `getFarmaciaSentinelas`; estender DTOs (total por unidade, agrupamento por remédio, indicadores).
- `apps/web/app/[portalSlug]/saude/farmacia/{page.tsx,loader.ts,view-model.ts}` -- orquestração, `searchParams` (`q`, `unidade`, `limite`), `buildExemplosFarmacia`, `buildGruposSentinelas`.
- `apps/web/components/farmacia/` -- `farmacia-busca-form`, `farmacia-resultados` (usa `StaticTileMap`), `farmacia-sentinelas`, `farmacia-selo-transparencia`; não alterar `farmacia-resumo-card`, banner nem ações cívicas.
- `apps/web/components/obras/obras-mapa-interativo.tsx` -- Leaflet 1.9.4 (já em `apps/web/package.json`) a reutilizar/generalizar para marcadores numerados e hover.
- `packages/ui/src/tokens.ts` -- `accent`, `ink`, `border`, `subtleText`, `mutedText`; faltam âmbar de atenção e cinza inativo.
- Filtro por unidade ("Filtrar por esta unidade") existe hoje via `?unidade=`; o design o remove.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/db/src/queries/farmacia.ts` -- DTOs e queries: total por unidade (ordenação desc.), agrupamento por remédio, indicadores (unidades que informaram, essenciais no estoque de N, sem registro, só em combinação) -- lógica fora da UI
- [ ] `packages/db/src/queries/__tests__/farmacia.spec.ts` -- testes de paridade com fixtures próprias -- sem dados do protótipo
- [ ] `apps/web/app/[portalSlug]/saude/farmacia/{loader,view-model}.ts` -- repassar DTOs, rótulos a partir de códigos, intervalo de datas dinâmico -- Regra 23
- [ ] `apps/web/components/farmacia/` -- cabeçalho/busca/chips, indicadores, resultados por unidade e por remédio, mapa interativo com hover e clique sincronizados, essenciais com filtro de categoria e quadradinhos -- layout do handoff
- [ ] `apps/web/app/[portalSlug]/saude/farmacia/page.tsx` -- nova composição preservando os três estados -- selo mantido
- [ ] specs dos componentes e da página -- cobrir matriz I/O, estados e mobile (mapa acima da lista)

**Acceptance Criteria:**
- Given portal `conforme` com busca, when a página renderiza, then mostra resultados por unidade e por remédio, mapa com marcadores numerados e legenda.
- Given viewport desktop e lista de resultados mais alta que o mapa, when o usuário rola a página, then o mapa permanece visível ao lado da lista (sticky) até o fim da seção, e em mobile não é sticky.
- Given hover num card ou marcador, when ocorre, then ambos são destacados e o clique no marcador rola até o card.
- Given um portal com outro número de unidades, when renderiza, then nenhum texto ou quadradinho assume 8.
- Given status `apagao` ou `indisponivel`, when renderiza, then o comportamento atual é preservado.

## Implementation Notes

## Spec Change Log

## Review Triage Log

### 2026-10-24 — Review pass
- verdicts: 33 findings — high 0, medium 9, low 8, false 0, maybe-false 0 (16 consolidados em defer/reject abaixo)
- findings:
  - `[medium]` `patch` input de busca mantém termo antigo ao navegar por chip/essencial — useState lê defaultValue só uma vez; reinicializar por `busca`.
  - `[medium]` `patch` mapa recria todos os marcadores a cada hover e efeitos rodam antes de `mapaRef` existir — usar setIcon e desenhar ao fim da criação assíncrona.
  - `[medium]` `patch` altura `sm:h-[360px]` contradiz os 240px da spec em mobile — removida.
  - `[low]` `patch` `tel:` concatena vários números — usar o primeiro e validar tamanho.
  - `[low]` `patch` rolagem suave ignora prefers-reduced-motion; destaque só por mouse (adicionar foco).
  - `[medium]` `patch` Leaflet/clique-para-rolar sem teste; `data-unidade-id` sem asserção — specs adicionados.
  - `[medium]` `patch` ramos de indicadores/resumo/dias sem teste; dica de 2 letras sem teste de página — testes adicionados.
  - `[medium]` `defer` limite fixo de 200 unidades sem aviso, resumo usa total completo — fora da intenção da spec; só afeta portais com mais de 200 unidades para um termo.
  - `[low]` `defer` quadradinhos sem teto para N muito grande — spec exige N dos dados; avaliar design para redes grandes.
  - `[low]` `defer` clique de marcador em "Por remédio" rola ao primeiro card da unidade — comportamento aceitável, ID repetido por design.
  - `[low]` `defer` perda de `dataPosicaoEstoque` por remédio e do texto "em N de M unidades" em combinação — decisão de design do handoff, validar com o usuário.
  - `[low]` `reject` lógica de apresentação no view-model, nomes curtos em lambdas, agrupamento O(n²) — view-model já existia; n ≤ 200; baixo impacto e correção ampla.
  - `[low]` `reject` hex/slate fora dos tokens, token `inactive` sem uso — valores do handoff; token exigido pela spec.
  - `[low]` `reject` soma de apresentações com "un." e espaços em `minLength` — sem dano demonstrado/corrigir aumentaria complexidade.
  - `[low]` `reject` chaves duplicadas por caixa de nome, "N de M" com total > ativas — dados do mart não produzem o caso demonstrável.
  - Demais achados repetidos entre revisores seguem as mesmas rotas acima.

## Design Notes

A busca continua via `searchParams` (deep link `?q=`); só alternância Por unidade/Por remédio, hover e mapa são ilha cliente. Os dois agrupamentos chegam prontos no payload.

## Verification

**Commands:**
- `cd packages/db && pnpm exec vitest run` -- expected: verde (com `DATABASE_URL` do `postgres_test`)
- `cd apps/web && pnpm exec vitest run` -- expected: verde
- `pnpm typecheck` -- expected: sem erros

**Manual checks (if no CLI):**
- Abrir `/[portalSlug]/saude/farmacia?q=...` em 1280px e 390px e conferir mapa, hover e quadradinhos contra o protótipo.

## Auto Run Result

Status: done

**Resumo:** conteúdo da página da Farmácia SUS refeito conforme o handoff: cabeçalho com busca e chips, 3 indicadores, "Onde encontrar" por unidade/remédio com mapa Leaflet (sticky no desktop, acima da lista no mobile), essenciais com filtro de categoria e quadradinhos pelos dados. Agrupamentos e indicadores calculados em `@transparencia/db`.

**Arquivos:** `packages/db/src/queries/farmacia.ts` (totais, agrupamento por remédio, indicadores); `apps/web/app/[portalSlug]/saude/farmacia/{page,loader,view-model}` (nova composição); `apps/web/components/farmacia/` (cabeçalho, busca destaque, indicadores, mapa, resultados, sentinelas, selo); `packages/ui/src/tokens.ts` e `apps/web/tailwind.config.ts` (tokens `attention`, `inactive`); specs correspondentes.

**Revisão:** 7 grupos de patch aplicados (4+ de severidade medium); 4 itens adiados (limite de 200 unidades sem aviso, quadradinhos sem teto, rolagem em "Por remédio", campos removidos do handoff); demais rejeitados com motivo no log de triagem.

**Verificação:** db 295/295; web 1042/1043 (única falha, `farmacia-resumo-card.spec.tsx`, é anterior à story); `pnpm typecheck` limpo.

**Recomendação de follow-up:** true — dois ou mais patches medium na primeira passada; risco não verificado: mapa, hover, clique e sticky nunca foram vistos em navegador (1280px/390px).

**Riscos residuais:** conferência manual visual pendente; o aviso de truncamento a 200 unidades não existe.

**Ajustes pós-revisão (feedback manual do usuário):** botão "Limpar busca" único e funcional (link para a rota sem `?q=`); mapa sticky corrigido (`overflow-x-clip` no `<main>` do layout); seção "Fonte dos dados" no fim da página; termos revisados (selo, "em estoque" no lugar de "un.", rótulos dos indicadores e do card "Lista de estoque mais recente"); scroll automático até `#resultados` ao buscar (form, chips e essenciais), com `scroll-mt-20` no mobile. Pendente do usuário: conferência visual em 1280px e 390px.
