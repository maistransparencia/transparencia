---
title: 'Story 20.6: DenseTable, Formato Mobile e Telas de Licitações e Contratos'
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_revision: '66ae4b16e674e8c8a5e7f513bda93e3537475588'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/CLAUDE.md'
  - '{project-root}/.claude/rules/web.md'
  - '{project-root}/.claude/rules/dbt-sql.md'
  - '{project-root}/.claude/rules/typescript.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-20-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/20-5-farmacia-sus-no-padrao-divisorias.md'
warnings: [oversized]
deferred:
  - summary: >-
      Conferir visualmente /licitacoes (375px e 1280px, claro e escuro): linhas de duas linhas, detalhes ao tocar, margens do contêiner e da paginação após remover o padding.
    evidence: |-
      Nenhuma captura de tela foi feita; jsdom não executa os breakpoints sm. Os testes cobrem o markup, não o layout renderizado.
    location: >-
      packages/ui/src/components/dense-table.tsx
    severity: medium (unverified)
  - summary: >-
      Linha destacada por ?numero= no celular fica com os detalhes fechados e sem id no resumo (contratos de serviços).
    evidence: |-
      renderMobileRow não recebe flag de abertura; resolver exige nova superfície pública no DenseTable.
    location: >-
      apps/web/components/licitacoes-em-andamento-section.tsx
    severity: low
  - summary: >-
      Paleta fixa do Tailwind remanescente no modal de detalhes e nos cartões ContratoServicoVigenteCard; licitacoes-spotlight-modal.tsx segue na lista de exceções.
    evidence: |-
      Resíduos blue/amber/slate fora do escopo listado na spec; o guarda de tema não os sinaliza.
    location: >-
      apps/web/components/licitacoes-em-andamento-section.tsx
    severity: low
  - summary: >-
      Regra de situacao_codigo duplicada entre o dbt, derivarSituacaoCodigo do seed de testes e fmtLicitacaoSituacao.
    evidence: |-
      O espelho no seed é copiado à mão; o teste Python cobre agora os 8 códigos, mas não há verificação cruzada com o TS.
    location: >-
      packages/db/tests/fixtures/seed.ts
    severity: low
  - summary: >-
      Licitações com situacao_codigo homologada ou classificada aparecem na seção "Abertas e em Andamento" quando fonte_objeto é pncp.
    evidence: |-
      O filtro só exclui encerrada, fracassada, cancelada e deserta; comportamento anterior parece igual para PNCP, mas não foi confirmado. Resolver pede decisão de contabilidade/produto.
    location: >-
      packages/db/src/queries/licitacoes-metrics.ts:730
    severity: medium (unverified)
  - summary: >-
      Validar com a contabilidade a regra de que valor homologado do PNCP prevalece sobre situação "em andamento" do portal.
    evidence: |-
      Decisão de modelagem tomada no planejamento (Design Notes); 17 casos locais afetados.
    location: >-
      elt/transform/models/intermediate/int_licitacoes_consolidadas.sql
    severity: medium
---

<intent-contract>

## Intent

**Problema:** `DenseTable` usa contêiner `rounded-xl border shadow-xs` e, no celular, cartões longos (cerca de 2 registros por rolagem). Em `/licitacoes` a situação é incoerente: o rótulo "Homologado" aparece junto de "Em disputa"/"Em andamento", e a busca flutuante "Buscar licitações e contratos" compete com a busca da tabela.

**Abordagem:** decisão do Julio (2026-10-25, mockup): **formato A**. No celular cada registro vira uma linha de duas linhas (número + valor; objeto em até 2 linhas; situação + abertura) que abre os detalhes ao tocar. Contêiner no padrão Divisórias. Migrar as telas de **licitações e contratos** (ambas em `/licitacoes`, mesma lógica de tabela); despesas tem página própria e fica fora. Corrigir a situação na camada de dados.

## Boundaries & Constraints

**Always:** tokens semânticos (`ink`, `line`, `line2`, `mute`, `mute2`, `brand`, `ok`, `warn`), sem `dark:`/hex/paleta fixa nos arquivos migrados; manter `scroll-mt-20 sm:scroll-mt-24` e os dois botões CSV do `DenseTable`; desktop continua tabela; `renderMobileCard` segue funcionando (saída de emergência, usos de saúde e pessoal intocados); regras 9, 10, 23 e 24; lógica de situação só em `@transparencia/db`/dbt (Regra 2) com códigos em snake_case; dbt e queries só contra o Postgres local (Regra 15); `fmtLicitacaoSituacao` e demais formatadores de `@transparencia/ui` reutilizados.

**Never:** migrar receitas, orçamento, previdência, pessoal, saúde, educação ou despesas (20.7 a 20.9); remover aliases legados; adicionar dependências; tratar "não homologada" como indício de irregularidade (tom neutro); tocar a busca global em si (Epic 22).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Linha mobile | tabela com `renderMobileRow` | `<details>`: resumo de duas linhas; detalhes (modalidade, estimado, homologado, fonte, `ExternalLinkPill` Detalhes/Sala de Disputa) ao tocar | `renderMobileRow` ausente → cai em `renderMobileCard`; ambos ausentes → só tabela |
| Homologada | `valor_homologado > 0` | situação `homologada`, valor homologado exibido | — |
| Sem valor homologado | `valor_homologado` nulo/0 | texto "ainda não homologada"; nunca "Homologado" junto de "Em disputa" | — |
| Situação divergente | portal "Em Andamento" + PNCP com valor homologado | um único código `homologada` | — |
| Variação de grafia | "Homologado"/"Homologada", "Em Andamento"/"Em andamento" | mesmo código (`homologada`, `em_andamento`) | NULL → `nao_informada` |
| Busca | `/licitacoes` | só uma entrada de busca visível, nada coberto | — |

</intent-contract>

## Code Map

- `packages/ui/src/components/dense-table.tsx` -- contêiner na linha ~342 (`rounded-xl border bg-white shadow-xs`), cabeçalho `bg-gray-100/70`, mobile ~392-398 (`renderMobileCard`), busca ~348; props 44-64.
- `packages/ui/src/components/__tests__/dense-table.spec.tsx` -- testa `scroll-mt-*`, CSV e `renderMobileCard`; estender para `renderMobileRow` e `hideSearch`.
- `apps/web/components/licitacoes-table.tsx` (:257) -- contratos, `renderContratoMobileCard`.
- `apps/web/components/licitacoes-em-andamento-section.tsx` -- DenseTable :1016, card mobile ~600, cartões de maior valor ~820-970 (selos "Homologado" 944 / "Em disputa" 961), coluna Homologado 553-586, badge sempre `warning` 595/624, normalização 172-186.
- `apps/web/components/contratos-servicos-vigentes-section.tsx` (:541) -- DenseTable com card inline.
- `apps/web/components/licitacoes-search-bar.tsx` (:106), `licitacoes-spotlight-modal.tsx` (:371) -- busca flutuante.
- `apps/web/app/[portalSlug]/licitacoes/page.tsx` -- monta busca (:93), em andamento (:236), contratos (:244), tabela (:273).
- `elt/transform/models/intermediate/int_licitacoes_consolidadas.sql` (:129-130, :199-200) -- `situacao` do portal e `valor_homologado` do PNCP, sem normalização; `models/marts/fct_licitacoes.sql` repassa.
- `packages/db/src/queries/licitacoes-metrics.ts` (:718-721) e `packages/ui/src/utils/formatters.ts` (:119, `fmtLicitacaoSituacao`) -- normalização hoje só no consumo.
- Specs: `licitacoes-table.spec.tsx`, `licitacoes-em-andamento-section.spec.tsx`, `contratos-servicos-vigentes-section.spec.tsx`, `licitacoes-search-bar.spec.tsx`, `licitacoes/page.spec.tsx`.
- `apps/web/instrumentation-client.ts` (:35-45) -- PostHog; não há evento de permanência.

## Tasks & Acceptance

**Execution:**
- `elt/transform/models/intermediate/int_licitacoes_consolidadas.sql` (+ `fct_licitacoes.sql`, yml, teste) -- adicionar `situacao_codigo` em lowercase snake_case (`homologada`, `em_andamento`, `encerrada`, `deserta`, `fracassada`, `cancelada`, `classificada`, `nao_informada`), normalizando caixa e gênero; `valor_homologado > 0` sobre situação de andamento resulta em `homologada` (homologação é fato do PNCP); `portal_slug` preservado -- corrige o dado na origem.
- `packages/db/src/queries/` (licitações/contratos) -- expor `situacao_codigo` nos DTOs tipados e usar nas métricas em vez de normalizar texto -- Regra 2.
- `packages/ui/src/components/dense-table.tsx` -- contêiner sem `rounded-xl border shadow-xs`; cabeçalho `border-b border-ink`; linhas `border-b border-line`; largura total no mobile; novas props `renderMobileRow?: (row) => { resumo; detalhes }` (renderiza `<details>`) e `hideSearch?` -- formato A.
- `apps/web/components/licitacoes-em-andamento-section.tsx`, `licitacoes-table.tsx`, `contratos-servicos-vigentes-section.tsx` -- usar `renderMobileRow`, `situacao_codigo` e "ainda não homologada"; migrar os cartões de maior valor para divisórias; `hideSearch` nas três tabelas.
- `apps/web/components/licitacoes-search-bar.tsx` e `licitacoes/page.tsx` -- busca única visível, sem cobrir conteúdo (barra fora do fluxo flutuante).
- Componente cliente em `/licitacoes` -- evento PostHog `licitacoes_tempo_na_pagina` (segundos e tipo de viewport) ao ocultar a página.
- Specs de `DenseTable`, das três seções e da busca; teste dbt de `situacao_codigo` (valores aceitos e regra de homologação) -- cobertura do formato A.

**Acceptance Criteria:**
- Given 375px, when `/licitacoes` renderiza, then cada registro ocupa duas linhas e abre detalhes ao tocar, com cerca de 4 a 5 registros por tela.
- Given qualquer `DenseTable`, when renderiza, then o contêiner não tem `rounded-xl`/`border`/`shadow-xs` e usa filetes `border-ink` e `border-line`; os demais usos continuam funcionando.
- Given licitação com `valor_homologado > 0`, when exibida, then nunca aparece "Em disputa" nem "Em andamento" no mesmo registro.
- Given licitação sem valor homologado, when exibida, then mostra "ainda não homologada".
- Given `/licitacoes` no celular, when carrega, then há uma única entrada de busca e nada fica coberto.
- Given o PostHog, when a página é ocultada, then o evento de permanência é enviado.

## Spec Change Log

## Review Triage Log

### 2026-10-26 — Review pass
- verdicts: 43 findings — high 1, medium 7, low 8, false 6, maybe-false 4 (restante descritivo/duplicado, agrupado nas linhas abaixo)
- findings:
  - `[high]` `patch` "ainda não homologada" para qualquer linha sem valor (inclui `homologada` e terminais) — célula/modal passam a usar `situacao_codigo`; Blind, Edge #1 e #19 (mesma causa).
  - `[medium]` `patch` fallback da busca mistura valor estimado como homologado e `situacao` "homologada" — só com `statusCodigo === 'homologada'`; Edge #6, #7 e Blind (fallback).
  - `[medium]` `patch` `statusCodigo` sem guarda de nulo e sem asserção — null explícito e teste; Edge #5, Verification-gap 1.
  - `[medium]` `patch` `getLicitacaoByNumero` sem asserção de `situacaoCodigo` e sem teste de linha municipal com valor + "em andamento" — testes adicionados; Verification-gap 2 e 3 (parte TS).
  - `[medium]` `patch` teste Python cobria 3 de 8 códigos e vazava dados; Blind (dbt tests), Edge #2 (parcial), Verification-gap 3 (parte Python) — 8 códigos, acento, só-PNCP, limpeza.
  - `[low]` `patch` mapa de variantes incompleto e divergente entre tabela e modal; Blind (badge), Edge #14 — helper único `Record<LicitacaoSituacaoCodigo,…>`.
  - `[low]` `patch` `fmtLicitacaoSituacaoCodigo` sem teste; Verification-gap (outros), Blind (tipos) — teste unitário.
  - `[medium]` `patch` `LicitacoesTempoNaPagina` conta tempo oculto, reenvia cumulativo, sem `pagehide`; Blind, Edge #8 e #9 — reescrito.
  - `[false]` `reject` remoções de `tema-excecoes.json` falhariam o guarda — `pnpm test` (guarda incluído) passou; resíduo de paleta no modal registrado em `deferred`; Blind, Edge #20.
  - `[false]` `reject` override `valor_homologado > 0` não restrito a PNCP — `valor_homologado` vem só do join PNCP (`int_licitacoes_consolidadas.sql:129`); Blind.
  - `[false]` `reject` `situacao_codigo` nulo derruba linhas — coluna tem `not_null` no yml e `else 'nao_informada'`; Edge #4.
  - `[false]` `reject` `homologada` sem valor deve virar outro código (SQL/yml) — é fato do portal; o texto da célula já trata (patch 1); Edge #1 (SQL), Edge #2.
  - `[false]` `reject` municipais "em andamento" com valor saindo da lista de abertas — é a consequência pretendida (viram `homologada`); Edge #3.
  - `[false]` `reject` `like '%revogad%'` casando "não revogada" — texto livre improvável nesse campo; Blind (duplicação, parte).
  - `[maybe-false]` `defer` homologada/classificada PNCP na seção "Abertas" — precisa confirmar o comportamento anterior; Blind (radar).
  - `[maybe-false]` `defer` regra do valor homologado prevalecer sobre "em andamento" — validar com a contabilidade; Blind (override, parte).
  - `[low]` `defer` regra de status duplicada (SQL, seed TS, formatter); Blind, Edge #15.
  - `[low]` `defer` linha destacada por `?numero=` fechada no celular, id do contrato de serviço; Edge #12 e #13, Blind (a11y/id).
  - `[low]` `defer` resíduos de paleta no modal/cartões e cartões de maior valor parciais; Edge #21, Verification-gap, Auditor.
  - `[maybe-false]` `defer` padding do contêiner/paginação e comportamento 375px/1280px, nenhum teste de página móvel; Blind (DenseTable), Auditor (superfície/testes).
  - `[low]` `reject` `key={idx}` sem `rowKey`, `focus:outline-none`, `aria-current`, `bg-page`, teste com `data` vazia, chevron — usos reais passam `rowKey`; resto cosmético ou preexistente; Blind (a11y/DenseTable), Edge #10.
  - `[low]` `reject` busca/ordenar só no desktop e pílula flutuante removida — pedido pela spec (uma só busca); ordenação móvel nunca existiu; Blind, Edge #11, #16, #17, Auditor (busca).
  - `[low]` `reject` banners de aviso em `bg-line2`, "Valor estimado" `valorEst ?? valorFinal`, cartão duplicado no top 3, limiar 640px, consentimento PostHog, tipo `LicitacaoSituacaoCodigo` em módulo compartilhado, "duas linhas" que são três — escolhas de design/preexistentes sem dano demonstrado; Blind, Edge #18, Auditor.

## Design Notes

Escolha da situação: o portal municipal e o PNCP são fontes independentes (17 "Em Andamento" com valor homologado no banco local). Valor homologado é fato do PNCP, então prevalece sobre uma situação de andamento desatualizada. O revisor deve validar essa regra com a contabilidade.

Busca: o Spotlight é a entrada global; as três tabelas de `/licitacoes` escondem a própria busca via `hideSearch` (default `false` preserva os demais usos).

## Verification

**Commands:**
- `make test` e `make check` -- expected: verde (dbt local)
- `pnpm test` e `pnpm typecheck` -- expected: verde

**Manual checks (if no CLI):**
- `/licitacoes` em 375px e 1280px, tema claro e escuro: filetes, linhas de duas linhas, detalhes ao tocar, uma só busca.

## Auto Run Result

Status: done

**Resumo:** formato A (duas linhas, detalhes ao tocar) em `DenseTable` via `renderMobileRow`, contêiner no padrão Divisórias e `hideSearch`. Licitações e contratos de `/licitacoes` migrados. Nova coluna `situacao_codigo` (snake_case) no dbt, nas queries e na UI, que elimina "Homologado" junto de "Em disputa". Busca flutuante removida, evento PostHog `licitacoes_tempo_na_pagina` criado.

**Arquivos:** `packages/ui/src/components/dense-table.tsx` (formato A, filetes), `packages/ui/src/utils/formatters.ts` (`fmtLicitacaoSituacaoCodigo`), `elt/transform/models/intermediate/int_licitacoes_consolidadas.sql` e `marts/fct_licitacoes.sql`/yml (`situacao_codigo`), `packages/db/src/queries/licitacoes-metrics.ts` e `licitacoes-contratos-search.ts` (DTOs e filtro), `apps/web/components/licitacoes-*.tsx` e `contratos-servicos-vigentes-section.tsx` (linhas móveis, rótulos), `licitacoes-tempo-na-pagina.tsx` (PostHog), `licitacoes-search-bar.tsx` (sem pílula), `tema-excecoes.json`, `llms.txt`, testes (ui, db, web, pytest).

**Revisão:** 8 patches aplicados (1 high, 5 medium, 2 low); 6 itens adiados em `deferred`; demais rejeitados com motivo no log. Seguimento recomendado: sim, pelo risco de layout não verificado visualmente e pelos patches de rótulo de valor homologado, que são código novo sem segunda revisão.

**Verificação:** `pnpm typecheck` ok; `pnpm test` (ui 274, db 303, web 1247) ok; `make test` 199 ok; `make check` ok; biome sem erros (1 aviso preexistente). dbt só no Postgres local. Nenhuma checagem visual.

**Riscos residuais:** regra "valor homologado do PNCP prevalece" pendente de validação contábil; `unaccent` precisa existir no banco de produção antes de rodar o dbt lá; migração dbt em produção exige autorização (Regra 15).

### Review Findings

Revisão do commit `af8ebd1c` (follow-up pós-build-auto), 2026-10-26.

- [x] [Review][Patch] Restaurar o selo de situação/status no resumo mobile (decisão do Julio: opção 1; desktop segue o design)
- [x] [Review][Patch] Deep link (`?numero=`, `contratoNumero`): nova prop no `DenseTable` para expandir e paginar até a linha linkada (decisão do Julio: opção 1)
- [x] [Review][Patch] Remover o botão "Ver no PNCP" duplicado do painel de licitações (decisão do Julio: opção 1)
- [x] [Review][Patch] Seletor de ordenação mobile usa `columns` em vez de `visibleColumns` e lista colunas só-CSV [packages/ui/src/components/dense-table.tsx:187]
- [x] [Review][Patch] "Ordem padrão" zera o sort em vez de voltar a `defaultSortKey`/`defaultSortDir` [packages/ui/src/components/dense-table.tsx:194]
- [x] [Review][Patch] `percentualPago` sem guarda de NaN/infinito no painel de contratos (o cartão apagado tinha `Number.isFinite`) [apps/web/components/contratos-servicos-vigentes-section.tsx:436]
- [x] [Review][Patch] Painel expandido de contratos não mostra status "Não Executado"/"Concluído" nem aditamento, e exibe barra 0% para inexecutado [apps/web/components/contratos-servicos-vigentes-section.tsx:340]
- [x] [Review][Patch] Hovers sem efeito (`hover:text-warn` em `text-warn`, `hover:text-brand` em `text-brand`, `hover:decoration-brand/40`) [apps/web/components/contrato-detalhes-modal.tsx:158; licitacoes-em-andamento-section.tsx:881]
- [x] [Review][Patch] Nome abreviado `valorEst` (Regra 9) [apps/web/components/licitacoes-em-andamento-section.tsx:610]
- [x] [Review][Patch] Valor do resumo mobile de contratos (empenhado) sem rótulo [apps/web/components/contratos-servicos-vigentes-section.tsx]
- [x] [Review][Patch] `renderMobileRow` ainda monta `detalhes` que o `DenseTable` descarta quando há `renderExpandedRow` [apps/web/components/licitacoes-em-andamento-section.tsx]
- [x] [Review][Patch] Sem teste do CSV com colunas `exportOnly` (cabeçalho e valores no Blob) [packages/ui/src/components/__tests__/dense-table.spec.tsx]
- [x] [Review][Patch] Sem teste de que a linha expandida fecha ao ordenar/paginar/buscar e de que o painel mobile renderiza o conteúdo de `renderExpandedRow` [packages/ui/src/components/__tests__/dense-table.spec.tsx]
- [x] [Review][Defer] `<button>`/links dentro de `div role="button"` no mobile e `<tr onClick>` sem caminho de teclado próprio (a seta é o botão focável) — deferred: a11y; resolver pede repensar a estrutura da linha
- [x] [Review][Defer] Base da economia diverge: painel usa `valorEstimado ?? valorFinal`, modal usa `valorFinal` primeiro — deferred: precisa de decisão sobre qual valor é a referência
- [x] [Review][Defer] Contraste de `text-warn`/`text-danger` sobre `bg-*/10` nos dois temas não verificado — deferred (medium, unverified): medir AA com ferramenta
- [x] [Review][Defer] 4 a 5 registros por tela no mobile e margens do `DenseTable` não verificados visualmente — deferred (medium, unverified): captura em 375px/1280px nos dois temas
- [x] [Review][Defer] `FarmaciaIndicadorItem` duplicado ao lado de `IndicadorLinhaItem`; spec de `IndicadoresLinha` só confere classes — deferred: limpeza de design system
- [x] [Review][Defer] Qualidade de testes: render duplicado, índices dependentes de ordem e regex presa ao ano 2025 em `licitacoes-em-andamento-section.spec.tsx` — deferred: higiene de teste

#### Rejected

- `false` `expandedRowId` obsoleto quando `data` muda: as duas tabelas passam `rowKey` estável, então um id ausente simplesmente não abre nada.
- `false` pílula sobrepondo a barra inferior: o `bottom` já soma `4.5rem` e o print do Julio mostra a pílula acima da barra.
- `low` botão CSV oculto no mobile e perda do CSV como único lugar de colunas: pedido explícito do Julio.
- `low` cartões de maior valor/top 3 removidos, pílula restaurada e spec desatualizada sobre isso: pedidos explícitos do Julio; editar a spec não é correção de código.
- `low` serif default no `DenseTable` para outros usos, `ModalDialog` global sem sombra/`rounded-xl`, seletor de ordenação e `hideCsvOnMobile` em outros usos de `renderMobileRow`, tokens `accent`/`onink`/`pill`: consequências aceitas dos pedidos de modais tokenizados e consistência; sem dano demonstrado.
- `low` "Valor Est." abreviado no cabeçalho, ⚠️ só em um banner, título do alerta sem "Alerta", toolbar vazia no mobile, mocks de `IntersectionObserver` não restaurados, rótulo da seta sem equivalente mobile: cosmético, segue o design ou sem impacto.
- `low` troca de `hover:` e outros resíduos já cobertos nos patches acima (duplicatas do Blind/Edge agrupadas).
