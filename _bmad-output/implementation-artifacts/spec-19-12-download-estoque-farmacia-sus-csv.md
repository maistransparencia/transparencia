---
title: 'Download do estoque completo da Farmácia SUS em CSV'
type: 'feature'
created: '2026-10-24'
status: 'done'
baseline_revision: 'e16e338eacb1819da5bb3ac35d42f5d804db7a2d'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-19-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/19-12-download-do-estoque-completo-da-farmacia-sus-em-csv.md'
  - '{project-root}/.claude/rules/web.md'
  - '{project-root}/.claude/rules/typescript.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** o cidadão, o jornalista ou o vereador só consegue consultar o estoque da Farmácia SUS pela caixa de busca; não há como baixar a lista completa para cruzar com outras fontes.

**Approach:** novo tipo `estoque_farmacia` no endpoint de exportação existente, alimentado por `getFarmaciaEstoqueExportRecords` em `@transparencia/db`, e um link de download em "Fonte dos dados" da página `/[portalSlug]/farmacia`, reaproveitando o botão de exportação atual.

## Boundaries & Constraints

**Always:** os critérios de aceite da story 19.12 (arquivo `19-12-download-do-estoque-completo-da-farmacia-sus-em-csv.md`, listado em `context`) valem integralmente: fonte, DTO, cabeçalhos, nome do arquivo, textos finais do rótulo e da legenda. Lógica de dados só em `@transparencia/db`, estilo funcional (`map`, `reduce`), `portal_slug` em todo filtro e JOIN (Regra 23). A rota e a UI apenas formatam. Reaproveitar `checkRateLimit`, `escapeCsvCell`, `delimitador` e a verificação de portal da rota existente. O CSV deve bater com o que a página mostra: o dev mede e explica a diferença local de 1.468 linhas no histórico contra 1.339 no mart vigente (porciuncula) e documenta a causa no `Design Notes`.

**Never:** stream, dado pessoal, literal de município/UF/ano, tocar dbt ou dados raw, exigir `ano` para o novo tipo (continua obrigatório nos demais), as palavras "esgotado", "zerado" ou "acabou", executar contra banco de produção (Regra 15), `pnpm build` como critério.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Portal conforme | `GET /api/portal_x/export?tipo=estoque_farmacia` | 200, CSV `;` com cabeçalho snake_case e uma linha por lote vigente das unidades ativas | N/A |
| Delimitador | `&delimitador=,` | mesmo CSV com `,` | outro valor: 400 existente |
| Sem estoque vigente | portal fora de `conforme` ou sem linhas | 200 com CSV só de cabeçalho | N/A |
| Sem `ano` | tipo `estoque_farmacia` | funciona | tipos antigos sem `ano`: 400 |
| Slug inválido | slug fora do padrão | query devolve `[]` | portal inexistente: 404 existente |
| Validade | lote sem `data_validade` | célula vazia | N/A |
| Dois portais | mesmo CNES em `portal_a` e `portal_b` | cada CSV só traz o próprio portal | N/A |
| Rate limit | excesso de chamadas | resposta do `checkRateLimit` | 429 existente |

</intent-contract>

## Code Map

- `packages/db/src/queries/farmacia.ts` -- `getFarmaciaLotesAVencer` (CTE `posicao_vigente` por `portal_slug` + `codigo_cnes`, join com `is not distinct from`) é o modelo da posição vigente; `isPortalSlugValido` e `getFarmaciaSus` (status `conforme`) para o gate. Restringir às unidades ativas de `fct_farmacia_estoque` (`nome_unidade` vem de lá).
- `packages/db/src/queries/export-raw-data.ts:12` -- `TIPOS_EXPORTACAO`/`TipoExportacao`; modelo das demais funções `getRaw*ExportRecords`. Exportar a nova query em `packages/db/src/index.ts`.
- `packages/db/tests/fixtures/seed.ts` -- `seedFarmaciaHistorico` (já aceita `numeroLote`, `dataValidade`, `quantidadeEstoque`) e seed do mart `fct_farmacia_estoque`.
- `apps/web/app/api/[portalSlug]/export/route.ts` -- `VALID_TIPOS`, validação de `ano` (linha ~262), `delimitador`, rotas especializadas por tipo (`saldo_caixa_siconfi`, `pessoal_regime`) como modelo; `resolveFilename`. Teste em `export-route.spec.ts` (mesmo diretório).
- `apps/web/components/show-your-work-button.tsx` -- botão de exportação (menu, `tipo`, `ano` obrigatório, `posthog`); generalizar sem duplicar o download.
- `apps/web/components/farmacia/farmacia-fonte-dados.tsx` -- recebe o link; renderizado só em `conforme` por `apps/web/app/[portalSlug]/farmacia/page.tsx:112`.
- `apps/web/public/llms.txt`, `llms-full.txt`, `CHANGELOG.md`, `docs/glossario-cidadao.md` -- documentação (Regra 12, skill `changelog-transparencia`).

## Tasks & Acceptance

**Execution:**
- `packages/db/src/queries/farmacia.ts`, `__tests__/farmacia.spec.ts`, `index.ts` -- `getFarmaciaEstoqueExportRecords(portalSlug)` com DTO camelCase explícito, ordenação unidade/medicamento/lote, testes (slug inválido, fora de `conforme`, isolamento entre portais, validade preenchida e nula, contagem igual à da página) -- fonte única do CSV
- `packages/db/src/queries/export-raw-data.ts` -- incluir `estoque_farmacia` em `TIPOS_EXPORTACAO` se for o tipo canônico -- consistência de tipos
- `apps/web/app/api/[portalSlug]/export/route.ts`, `export-route.spec.ts` -- tipo `estoque_farmacia` antes da validação de `ano`, cabeçalho, `Content-Disposition` `estoque_farmacia_<portalSlug>.csv`, testes da matriz -- entrega do CSV
- `apps/web/components/show-your-work-button.tsx` e `farmacia-fonte-dados.tsx` (+ specs) -- generalizar o botão (`ano` opcional) e exibir "Baixar a lista completa de estoque (planilha CSV)" com a legenda do AC 3 -- acesso do cidadão
- `llms.txt`, `llms-full.txt`, `CHANGELOG.md`, `docs/glossario-cidadao.md` -- documentar o download; glossário só se houver termo novo -- Regra 12

**Acceptance Criteria:**
- Given um portal em `conforme`, when o cidadão clica no link em "Fonte dos dados", then baixa `estoque_farmacia_<portalSlug>.csv` com o número de linhas igual ao das unidades ativas na página.
- Given a página fora de `conforme`, when renderiza, then o link não aparece.
- Given o tipo `estoque_farmacia`, when `ano` é omitido, then a rota responde 200; para os demais tipos continua 400.

## Spec Change Log

## Review Triage Log

### 2026-10-25 — Review pass
- verdicts: ver linhas abaixo; sem high
- findings:
  - `[medium]` `[patch]` quantidade ausente exportada como 0 — DTO passa a `number | null` e a célula sai vazia
  - `[medium]` `[patch]` quantidade passava por `escapeCsvCell` (negativo virava texto) — número fora do escaper; texto de unidade, remédio e lote continua protegido
  - `[medium]` `[patch]` sem teste de injeção de fórmula, delimitador vírgula e quantidade vazia — teste novo em `export-route.spec.ts`
  - `[medium]` `[reject]` sem teste automático de paridade com a página — fixtures do mart e do histórico são independentes; paridade medida em dados locais (1.339 e 1.617 linhas, iguais ao mart) e registrada nas Design Notes
  - `[false]` `[reject]` `index.ts` sem export — `export *` já expõe a query e o DTO
  - `[false]` `[reject]` CSV só de cabeçalho fora de `conforme` ambíguo — decisão 4 da story manda 200 só com cabeçalho
  - `[false]` `[reject]` "sem stream, sem limite" — Never da spec; volume máximo medido 1.617 linhas
  - `[low]` `[reject]` notação exponencial, `ano` ignorado, `aria-live`, união discriminada de props, variante `menu` com tipo de farmácia, duplo round-trip do `conforme`, data por fuso — sem cenário alcançável hoje (um único consumidor, quantidades pequenas)
  - `[low]` `[defer]` posição de unidade antiga entra como vigente — mesmo critério da 19.10; avaliar com dados reais de validade
  - `[low]` `[defer]` sem asserção de que a página repassa o slug do portal ao link — o typecheck cobre a prop ausente; risco só de valor errado
  - demais itens (CHANGELOG sem outros títulos, texto do rate limit compartilhado, telemetria `ano: null`) — `[reject]` sem dano demonstrado

## Design Notes

Posição vigente por CNES no histórico, restrita às unidades ativas do mart, porque o mart não tem `numero_lote` nem `data_validade`. O dev registra aqui a causa medida das 129 linhas a mais no histórico de porciuncula (candidatas: unidades inativas, posições antigas por CNES). Volume máximo medido: 1.617 linhas por portal; montagem em memória; reavaliar se algum portal passar de ~50 mil linhas.

## Verification

**Commands:**
- `make test/ts` -- expected: sem falhas
- `pnpm typecheck` -- expected: limpo

**Manual checks (if no CLI):**
- Em `/[portalSlug]/farmacia` conforme, o link baixa o CSV e o número de linhas bate com o da página; em apagão o link não aparece.

### Medicao da diferenca de linhas (dev)

No banco local, porciuncula tem 1.468 linhas no historico em 2 posicoes: 1.339 em 2026-10-19 (a posicao vigente) e 129 em 2023-12-31, uma posicao antiga que ja foi substituida. A diferenca de 129 linhas e, portanto, posicao antiga, nao unidade inativa: todos os CNES do historico existem no mart (0 CNES fora das unidades ativas nos dois portais). Com o filtro por posicao vigente por CNES, o CSV de porciuncula tem 1.339 linhas (igual ao mart) e o de natividade 1.617 (igual ao mart). O filtro por unidades ativas segue como salvaguarda.

## Auto Run Result

Status: done

- **Resumo:** tipo `estoque_farmacia` no endpoint de exportação (sem `ano`), query `getFarmaciaEstoqueExportRecords` (posição vigente por CNES das unidades ativas, só em `conforme`) e link "Baixar a lista completa de estoque (planilha CSV)" em "Fonte dos dados", com `llms*.txt` e CHANGELOG atualizados.
- **Revisão:** 3 patches (quantidade ausente vazia, quantidade fora do escaper, testes de injeção e vírgula); 2 itens adiados (posição antiga de unidade; asserção do slug na página); demais rejeitados no log.
- **Follow-up recomendado:** false (nenhum `high`; 3 `medium` corrigidos).
- **Verificação:** `make test/ts` e `pnpm typecheck` passam; biome limpo (1 warning pré-existente). Link não clicado no navegador.
- **Riscos residuais:** CSV traz uma linha por lote; a paridade com a página foi medida nos dados locais, não por teste automático.
