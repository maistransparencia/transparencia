---
title: 'Página da Farmácia SUS (/[portalSlug]/saude/farmacia), camada de dados e card-resumo na home'
type: 'feature'
created: '2026-10-21'
status: 'done'
baseline_revision: '0037217b65f1573f9959f25f4e76241c92049f2c'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-19-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/handoff-remodelagem-home-utilidade.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problema:** O mart `fct_farmacia_estoque` (Story 19.1) não tem camada de dados nem UI: o cidadão não consegue saber em qual unidade há o remédio, nem agir quando o município descumpre a Lei 14.654/2023.

**Abordagem:** `getFarmaciaSus` em `@transparencia/db` (somente leitura do mart), página `/[portalSlug]/saude/farmacia` com busca vazia por padrão, resultados por unidade, mapa e sentinela de apagão, e um card-resumo compacto na home abaixo do resumo fiscal.

## Boundaries & Constraints

**Always:** Camada de apresentação burra: status e agrupamento por unidade vêm do DTO `camelCase` (Regras 14, 18). Isolamento por `portal_slug` (Regra 23). Códigos `conforme`/`apagao`/`indisponivel` traduzidos só na UI (Regra 10). Links de lei (Planalto) com `target="_blank"`, `rel="noopener noreferrer"` e `ExternalLink` (Regra 20). Vocabulário e componentes do design system (Regra 24); sem ternário aninhado (Regra 13); formatação via `fmt*`. Sem nome de município/UF fixo. Portal sem linha no mart = `indisponivel`. Mapa: reaproveitar a técnica do mini-mapa estático de Obras (`getTileCoordinates`/`projectCoordToTilePercent`), generalizando o marker em componente neutro sem quebrar `ObrasResumoCard`; unidade sem coordenada só na lista.

**Never:** Não alterar ELT/mart nem fixture de schema; sem `fetch` em runtime; botões "Copiar Requerimento de Fiscalização" e "Compartilhar no WhatsApp" fora da rota da Farmácia (nem na home); sem lista de medicamentos na home; sem reorganizar a home (Story 19.3); sem `/farmacia` na raiz (19.5).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Conforme sem busca | status `conforme`, sem `q` | Selo "Estoque Transparente — Atualizado em [data]", campo "Qual remédio você procura?", sem resultados | — |
| Busca | `?q=dipirona` | Resultados agrupados por unidade, paginados ("Ver mais unidades"); `&unidade=` filtra | Sem resultado: estado vazio neutro |
| Apagão | status `apagao` | Sentinela com Lei 14.654/2023 e os dois botões de ação | Clipboard falho: mensagem de erro, sem quebrar |
| Indisponível | status `indisponivel` ou sem linhas | Página: mensagem neutra; home: nada | — |
| Isolamento | dois portais | Cada um vê só seu `portal_slug` | — |

</intent-contract>

## Code Map

- `elt/transform/models/marts/_fct_farmacia_estoque.yml` -- contrato do mart (colunas `status_conformidade`, `nome_unidade`, `nome_medicamento`, `quantidade_estoque`, `data_posicao_estoque`, `latitude_unidade`...); somente leitura
- `packages/db/src/queries/obras.ts` -- modelo de query (guard de slug, `unaccent`, DTO camelCase, numeric via `Number`); `packages/db/src/index.ts` -- barrel (`export * from "./queries/farmacia"`)
- `packages/db/src/queries/__tests__/obras.spec.ts` e `packages/db/tests/fixtures/seed.ts` (`seedObra` ~l.1006) -- padrão de teste; criar `seedFarmacia`
- `apps/web/app/[portalSlug]/saude/` -- `page.tsx`, `loader.ts`, `view-model.ts`, `page.spec.tsx` como modelo; criar `farmacia/`
- `apps/web/components/obras-resumo-card.tsx` -- mini-mapa estático (`ObraMiniMapMarker`); `apps/web/lib/tile-calc`
- `apps/web/app/[portalSlug]/page.tsx`, `loader.ts` (`fetchRawVisaoGeralData`), `view-model.tsx` -- home; card entra após `HeroFiscalCard`/resumo fiscal
- `apps/web/public/llms.txt` (l.42-43 como modelo) e `llms-full.txt` -- documentar rota e card
- `packages/ui/src/index.ts` -- `AlertBox`, `Badge`, `ShareButton`, `fmt*`; não há Button/Search (usar `apps/web/components`)

## Tasks & Acceptance

**Execution:**
- `packages/db/src/queries/farmacia.ts` -- `getFarmaciaSus(portalSlug, filtros?)` retorna `{ status, dataColeta, dataPosicaoMaisRecente, diasDesdePosicaoMaisRecente, unidades[] }` agrupado por unidade, com busca `unaccent`, e `getResumoFarmaciaSus` leve para a home -- fonte única de lógica
- `packages/db/src/index.ts`, `tests/fixtures/seed.ts`, `queries/__tests__/farmacia.spec.ts` -- barrel, `seedFarmacia` e testes (3 estados, busca, camelCase, isolamento, slug vazio)
- `apps/web/app/[portalSlug]/saude/farmacia/` (`page.tsx`, `loader.ts`, `view-model.ts`, specs) -- rota com deep link `?q&unidade`, metadata via `createPortalMetadata`
- `apps/web/components/farmacia/` -- busca, lista por unidade com "Ver mais unidades", mapa, selo, `FarmaciaSusSentinelaBanner` (requerimento Art. 6º-B da Lei 8.080/1990, WhatsApp), com specs
- Home `loader.ts`/`view-model.tsx`/`page.tsx` + `FarmaciaResumoCard` -- `conforme`: campo que leva à rota com `?q=`; `apagao`: faixa com "Ver detalhes"; `indisponivel`: nada
- `apps/web/public/llms.txt`, `llms-full.txt`, `CHANGELOG.md` -- documentar (Regra 12)

**Acceptance Criteria:**
- Given portal `conforme`, when abre a rota sem `q`, then vê busca vazia e selo com data, sem lista.
- Given `?q=...&unidade=...`, when renderiza, then só a unidade filtrada, com paginação e mapa só com coordenadas.
- Given `apagao`, when abre a rota, then vê sentinela com link da lei e os dois botões; na home só a faixa "Ver detalhes".
- Given `indisponivel`, then mensagem neutra na rota e nada na home.
- Given dois portais, then nenhum dado cruza `portal_slug`.

## Spec Change Log

## Review Triage Log

### 2026-10-21 — Review pass
- verdicts: 39 achados — high 0, medium 4, low 14, false 8, maybe-false 13 (agrupados em patch/reject; ver linhas)
- findings:
  - Intent Alignment (5):
    - `[low]` `reject` mini-mapa de Obras não reutilizado literalmente — o spec definiu reuso da técnica (`tile-calc`), que é compartilhada; `ObrasResumoCard` fica acoplado a marcadores de obra
    - `[medium]` `patch` wiring do card na home sem asserção (loader/view-model/page) — testes adicionados em page.spec e loader.spec
    - `[false]` `reject` mapa só aparece com busca — sem busca não há unidades a exibir (busca vazia por padrão é AC)
    - `[low]` `reject` page.spec mocka `loadFarmaciaData` — a camada de dados tem spec próprio (`farmacia.spec.ts`)
    - `[medium]` `patch` filtro `?unidade` e `limite` sem exercício na rota — testes de view-model/loader adicionados
  - Edge Case Hunter (11):
    - `[high→medium]` `patch` `?q=a&q=b` chega como string[] e `.trim` quebra a rota (confirmado em `loader.ts:29-30`) — usar primeiro valor
    - `[low]` `patch` q de 1 caractere mostra "nenhuma unidade" sem busca — `hasBusca` exige 2+ caracteres
    - `[low]` `reject` `getResumoFarmaciaSus` fora de isolamento de falha na home — as demais queries do mesmo `Promise.all` não têm `.catch`; padrão do repositório
    - `[low]` `patch` key duplicada nos medicamentos — índice na key
    - `[low]` `patch` curingas `%`/`_` no LIKE — escape
    - `[low]` `reject` coordenadas fora de faixa — origem CNES já válida; guarda adicional improvável de ser exercida
    - `[medium]` `patch` marcadores fora do tile somem sem aviso — filtrar fora de 0–100 e testar
    - `[low]` `patch` "Ver mais unidades" em loop no teto de 200 — esconder no teto
    - `[false]` `reject` `limit(1)` sem `orderBy` não determinístico — o mart calcula `status_portal` por portal, mesma linha de status em todas
    - `[low]` `reject` mapa duplica `tile-calc` (claim) — mesmo motivo do reuso do mapa
    - `[low]` `reject` cache de 1h por combinação de busca — mesmo padrão dos loaders existentes (`createCachedDataLoader`)
  - Verification Gap (9):
    - `[medium]` `patch` wiring da home sem teste (duplicado com Intent Alignment)
    - `[medium]` `patch` `parseFarmaciaContext` sem teste — `loader.spec.ts` novo
    - `[low]` `patch` hrefs/filtro de unidade no view-model sem teste — testes adicionados
    - `[low]` `patch` `StaticTileMap` sem spec — spec adicionado
    - `[low]` `patch` fallback de status desconhecido sem teste — teste adicionado
    - `[false]` `reject` `limit(1)` sem ordem (outros): status por portal é único
    - `[false]` `reject` linhas de status com id "status" entrando na busca — filtro `status_conformidade='conforme'` + LIKE exclui; coberto pelo spec de apagão
    - `[low]` `patch` termo de 1 caractere (duplicado)
    - `[low]` `patch` key duplicada (duplicado)
  - Blind Hunter (14):
    - `[low]` `patch` loop no teto (duplicado); `[low]` `patch` curingas LIKE (duplicado)
    - `[low]` `patch` sem limite de tamanho de `q` — truncado em 80
    - `[low]` `reject` cache 1h com chave de texto livre — padrão do repositório
    - `[low]` `reject` sem isolamento de falha na home (duplicado)
    - `[false]` `reject` extensão `unaccent`/tipos Kysely ausentes — `db` é `Kysely<any>` e `unaccent` já é usado em `obras.ts`
    - `[false]` `reject` `limit(1)` sem ordem (duplicado)
    - `[maybe-false]` `reject` identidade de unidade com fallback `id_registro` — conforme exige CNES nomeado no mart; improvável
    - `[false]` `reject` `toIsoDateString` com getters locais — node-pg interpreta DATE em hora local, getters locais são os corretos
    - `[low]` `patch` mapa corta unidades fora do tile (duplicado)
    - `[maybe-false]` `reject` texto jurídico hardcoded na view-model — pendência de revisão jurídica já registrada na 19.1; nenhum fato sem dado do DTO
    - `[low]` `reject` WhatsApp inclui `location.href` — sentinela de apagão não tem busca ativa
    - `[low]` `patch` lacunas de teste (duplicado)
    - `[low]` `reject` a11y/UX menores (aria-label duplicado, h3, "un." fracionário, link em /saude, ordem do barrel, CHANGELOG) — cosméticos

## Design Notes

Texto do requerimento e do WhatsApp parte do handoff e de `minuta-requerimento-informacoes-saude.md`; afirmar fato (dias sem divulgação) só com dados do DTO, evitando "descumprindo" categórico quando não houver data (pendência jurídica da 19.1).

## Verification

**Commands:**
- `make check`, `make test`, `make test/ts`, `make db/fixture/check` -- expected: verde
- `pnpm build` e `tsc --noEmit` nos pacotes alterados -- expected: sem erros

## Auto Run Result

Status: done

- Resumo: `getFarmaciaSus`/`getResumoFarmaciaSus` em `@transparencia/db`, rota `/[portalSlug]/saude/farmacia` (busca vazia por padrão, resultados por unidade, paginação, deep link `?q&unidade&limite`, mapa estático, selo, sentinela de apagão com requerimento e WhatsApp), card-resumo na home, `llms.txt`/`llms-full.txt` e `CHANGELOG.md`.
- Arquivos: camada de dados + `seedFarmacia` + spec; rota com loader/view-model/page; componentes em `apps/web/components/farmacia/`; `static-tile-map.tsx` (novo, neutro); wiring da home.
- Revisão: 39 achados; patches aplicados (parse de query repetida, escape de LIKE, q curto, teto de paginação, marcadores fora do tile, key, lacunas de teste); demais rejeitados com motivo no Triage Log. Patches por verdict: medium 4, low vários.
- Follow-up recomendado: `true` — 2+ patches medium; risco não verificado: mapa estático em tile único (zoom fixo) com unidades muito espalhadas.
- Verificação: `make test/ts` (web 914, db 280, ui 91), `tsc --noEmit` (web), `make db/fixture/check`, biome nos arquivos alterados — verdes. `make check`/`make test` Python não rodados (sem mudança em Python/dbt).
- Riscos residuais: texto jurídico do requerimento a revisar; mini-mapa não compartilhado com `ObrasResumoCard` (apenas `tile-calc`); cache de 1h na rota.

### Review Findings

Follow-up review (2026-10-21, commit 95a3cdb): 4 camadas, 0 decision-needed, 11 patch, 3 defer, 12 rejeitados.

- [x] [Review][Patch] (decidido: zoom automático ao bounding box + legenda "N de M unidades no mapa") Mapa estático descarta unidades em silêncio — zoom fixo 14 (tile ~2,4 km) centrado na mediana; marcadores fora do tile somem sem aviso; centro pode cair em tile sem marcador; todos fora = tile vazio com alt enganoso; corte em 15 sem ordem; coluna `lg:grid-cols-[1fr_20rem]` reservada mesmo sem mapa; `mapMarkers` vem só da página atual (mapa muda a cada "Ver mais unidades"). Opções: (a) zoom automático ajustado ao bounding box, (b) legenda "N de M unidades no mapa" com zoom fixo, (c) ambos. [static-tile-map.tsx, view-model.ts:110]
- [x] [Review][Patch] (decidido: isolar com `.catch` → `indisponivel`) `getResumoFarmaciaSus` no `Promise.all` da home sem isolamento de falha — mart ausente/erro derruba a Visão Geral inteira em vez de ocultar o card (I/O: indisponível = home nada). Opções: `.catch` → `indisponivel` só para esta query, ou manter o padrão do repositório. [app/[portalSlug]/loader.ts]
- [x] [Review][Patch] Testes de `buildRequerimentoFiscalizacao`/`buildFatoApagao`/`buildTextoWhatsApp` (com/sem `portalName`, com/sem data e dias, URLs da lei) [view-model.ts:630-691]
- [x] [Review][Patch] Teste do clique em "Compartilhar no WhatsApp" (`window.open`, URL codificada, `_blank`, `noopener,noreferrer`) [farmacia-sus-sentinela-banner.spec.tsx]
- [x] [Review][Patch] Teste de `fetchRawFarmaciaData` repassando `busca`/`idUnidade`/`limiteUnidades`, slug vazio e `portalName` [loader.spec.ts]
- [x] [Review][Patch] Asserção do `href` de "Filtrar por esta unidade" no view-model [view-model.ts:716-722]
- [x] [Review][Patch] Validar faixa de coordenadas (|lat| ≤ 85,0511, |lng| ≤ 180) antes de montar a URL do tile [static-tile-map.tsx:35]
- [x] [Review][Patch] Atribuição do provedor de tile (Esri) ausente no mini-mapa; reaproveitar o texto de `obras-mapa-interativo.tsx` [static-tile-map.tsx]
- [x] [Review][Patch] WhatsApp compartilha `window.location.href` com `?q=` (busca de medicamento); usar URL sem query [farmacia-sus-sentinela-banner.tsx:41]
- [x] [Review][Patch] `limite` aceita `1e1`/`0x10`; exigir `/^\d+$/` antes de `Number()` [loader.ts:244]
- [x] [Review][Patch] Specs de `farmacia-busca-form`, `farmacia-resultados` e `farmacia-selo-transparencia` (Code Map pede specs)
- [x] [Review][Defer] Estoque zero/nulo — resolvido: o mart já filtra a última posição por unidade; no banco local 2956 linhas conformes, 0 zeradas, 0 nulas, 0 negativas. Sem ação.
- [x] [Review][Defer] SEO — rejeitado (low): `createPortalMetadata` emite canonical sem query string, tratando as variações como a mesma página.
- [x] [Review][Defer] Texto jurídico fixo "divulgação quinzenal" sem apoio no DTO — deferred: revisão jurídica já pendente desde a 19.1

#### Rejected

- `false` extensão `unaccent`/tipos: `unaccent` já usado em `obras.ts`.
- `false` `limit(1)` sem `orderBy` (3 camadas): `status_portal` é calculado por portal no mart, igual em todas as linhas.
- `false` chave de cache sem trim do slug (Regra 23): chaves distintas só duplicam cache; as queries filtram `portal_slug`.
- `low` mini-mapa de Obras não generalizado (duplicado da triagem anterior): spec reaproveita a técnica (`tile-calc`).
- `low` cache de 1h com `q` livre / status possivelmente velho: mesmo padrão de `createCachedDataLoader`.
- `low` ExternalLink (Regra 20) e Regra 24 só parciais: não verificado contra `.claude/rules`, impacto cosmético.
- `low` identidade da unidade com `coalesce(cnes, nome, id_registro)`: conforme exige CNES nomeado no mart.
- `low` rota sem link a partir de `/saude` e sem sitemap: fora do escopo da 19.2 (19.5 cobre a entrada por tema).
- `low` a11y (h3 sem h2, landmarks duplicados, `aria-describedby`): cosmético, já rejeitado antes.
- `low` filtro `unidade` perdido em nova busca: comportamento plausivelmente intencional.
- `low` `toIsoDateString`/`page.spec` com fixture mínima/teto de 200 sem aviso: baixo risco.
- `low` schema/contrato dbt do mart: fora do diff, pertence à 19.1.

### Fechamento (2026-10-21)

- Follow-up de revisão concluído: 11 patches aplicados e commitados (mapa com zoom automático, legenda "N de M" e atribuição Esri; isolamento de falha na home; WhatsApp sem query; `limite` só dígitos; lacunas de teste).
- Patch adicional validado na tela: lotes do mesmo medicamento somados por unidade em `getFarmaciaSus` (a fonte publica um registro por lote; `numero_lote` é descartado no staging). Lotes detalhados ficam como evolução futura.
- Defers: estoque zero/nulo resolvido (0 zeradas/nulas no banco local); SEO rejeitado (canonical já cobre); texto jurídico "quinzenal" segue pendente de revisão jurídica (`deferred-work.md`).
- Verificação: `make test/ts` verde, exceto `newsletter.spec` e `push.spec`, que falham por migration `004_create_city_interest_requests` ausente no banco local (ambiente, não relacionado).
