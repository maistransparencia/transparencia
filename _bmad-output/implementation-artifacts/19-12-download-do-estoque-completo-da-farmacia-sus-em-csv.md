# Story 19.12: Download do Estoque Completo da Farmácia SUS em CSV

**Status:** done  
**Epic:** Epic 19: Remodelagem da Homepage para Utilidade Pública, Sentinela da Farmácia SUS e Ação Cívica  
**Dependências:** 19.10 (entregue: rota `/[portalSlug]/farmacia` e seção "Fonte dos dados")

## User Story

As a citizen, journalist or councilor who wants to check the pharmacy stock,  
I want to download the full stock list of my city as a CSV,  
So that I can cross-check it with other sources without depending on the search box.

## Decisões de planejamento (fechadas)

1. **Fonte do CSV:** `fct_farmacia_estoque_historico` na posição vigente por CNES (`max(data_posicao_estoque)` por `portal_slug` + `codigo_cnes`, mesmo critério de `getFarmaciaLotesAVencer`), **restrita às unidades ativas** presentes em `fct_farmacia_estoque` do mesmo `portal_slug` e `status_conformidade = 'conforme'`. Motivo: `fct_farmacia_estoque` não tem `numero_lote` nem `data_validade`; o CSV precisa bater com o que a página mostra. Medição local: porciuncula tem 1.468 linhas no histórico contra 1.339 no mart vigente (129 a mais); o dev deve explicar a diferença (unidades inativas ou posições antigas) e garantir que o CSV bata com a página.
2. **Coluna da unidade:** `nome_unidade` (e não `nome_estabelecimento`), alinhada ao mart e ao restante do código.
3. **Sem stream:** volume medido localmente de no máximo 1.617 linhas por portal (poucas centenas de KB). Montagem em memória, como o export atual. Reavaliar se algum portal passar de ~50 mil linhas.
4. **Portal sem estoque vigente:** resposta 200 com CSV só de cabeçalho (sem erro, sem vazar dado de outro tenant). Portal inexistente segue o 404 já existente da rota.
5. **Formato:** delimitador `;` por padrão e `,` via `delimitador=,`, UTF-8, igual ao export atual.
6. **Validade:** nenhuma linha local tem `data_validade`; a coluna sai vazia nesse caso. Teste com fixture de validade preenchida.

## Acceptance Criteria

1. **Camada de dados.** `getFarmaciaEstoqueExportRecords(portalSlug)` em `packages/db/src/queries/farmacia.ts` (somente leitura, `portal_slug` em todo filtro e JOIN, Regra 23), exportada por `@transparencia/db`. Retorna `[]` para slug inválido (`isPortalSlugValido`) ou portal fora de `conforme`. DTO camelCase com colunas explícitas (Regra 9): `portalSlug`, `codigoCnes`, `nomeUnidade`, `nomeMedicamento`, `numeroLote`, `quantidadeEstoque`, `dataPosicaoEstoque`, `dataValidade` (nula quando ausente). Sem dado pessoal. Ordenação estável: unidade, medicamento, lote.
2. **Rota.** `GET /api/[portalSlug]/export?tipo=estoque_farmacia` não exige `ano` (a validação de `ano` continua obrigatória para os demais tipos). Cabeçalhos do CSV em snake_case: `portal_slug`, `codigo_cnes`, `nome_unidade`, `nome_medicamento`, `numero_lote`, `quantidade_estoque`, `data_posicao_estoque`, `data_validade`. `Content-Disposition: attachment; filename="estoque_farmacia_<portalSlug>.csv"`. Mantém `checkRateLimit`, `escapeCsvCell` e a verificação de existência do portal. Sem estoque vigente: 200 com cabeçalho apenas.
3. **UI.** `FarmaciaFonteDados` exibe o link "Baixar a lista completa de estoque (CSV)" apontando para o endpoint, reaproveitando/generalizando o botão de exportação existente sem duplicar a lógica de download. Aparece só quando o portal está em `conforme`. Textos finais (revisados pelo `editor-cidadao`): rótulo "Baixar a lista completa de estoque (planilha CSV)"; legenda "Traz os remédios que cada unidade informou ter em estoque na lista mais recente, com lote, quantidade e validade quando informada. Se um remédio não aparece, isso não prova que faltou: a unidade pode não ter informado." Nunca "esgotado", "zerado" ou "acabou".
4. **Multi-tenant.** Sem município, UF ou ano fixos (Regra 23). Nenhum literal de portal em query, componente ou teste de produção.
5. **Documentação.** `llms.txt` e `llms-full.txt` documentam o download (Regra 12).
6. **Qualidade.** `make test/ts` e `tsc --noEmit` passam.

## Tarefas

- [ ] Query `getFarmaciaEstoqueExportRecords` + teste (`packages/db`), incluindo: slug inválido, portal fora de `conforme`, isolamento entre dois `portal_slug`, validade preenchida e nula, conferência da contagem com a página.
- [ ] Rota: tipo `estoque_farmacia` fora da validação de `ano`; teste em `export-route.spec.ts` (cabeçalho, nome do arquivo, `delimitador`, vazio, rate limit, `ano` ainda exigido nos outros tipos).
- [ ] Generalizar o botão de exportação e usá-lo em `apps/web/components/farmacia/farmacia-fonte-dados.tsx`; teste de aparecer só em `conforme`.
- [ ] Revisão de texto com `editor-cidadao`; atualizar `docs/glossario-cidadao.md` se surgir termo novo.
- [ ] Atualizar `llms.txt` e `llms-full.txt`.
- [ ] `make test/ts` e `tsc --noEmit`.

## Guardrails

- Lógica de dados só em `@transparencia/db`; a UI e a rota apenas formatam (Regra 2). Estilo funcional (`map`, `reduce`), sem loops imperativos em `packages/db`.
- Execução apenas contra o banco local (Regra 15).
- Commits convencionais em minúsculas, sem referência a story ou task (Regra 19).
