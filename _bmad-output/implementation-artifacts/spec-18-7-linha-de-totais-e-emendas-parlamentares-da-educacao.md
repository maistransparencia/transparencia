---
title: 'Linha de totais nas tabelas e emendas parlamentares da Educação'
type: 'feature'
created: '2026-10-18'
status: 'done'
---

# Story 18.7 (escopo corrigido pelo usuário)

## Intenção

- Linha de totais dentro da tabela (rodapé `tfoot`, valores sob cada coluna) nos Contratos da Educação: Empenhado, Liquidado, Pago e Saldo Pendente, somando os contratos filtrados (categoria e busca), sem variar com a paginação.
- Exibir EMENDAS parlamentares da Educação (não empenhos) no mesmo padrão de `saude-emendas-section.tsx`: KPIs e tabela com Autorizado e Empenhado. Sem rastreio de empenhos nesta story.
- Critério de classificação: entidades de `dim_orgao` com `orgao_nome` contendo "educ" (unaccent/lower); as emendas vêm pelo `empresa_id` da entidade, sempre isoladas por `portal_slug`.
- Mesmo estilo de totais na Saúde (consistência).
- No mobile (cartões) o resumo de totais aparece em cartão com contraste.
- Sem emendas: seção omitida, sem dados de outro município (Regra 23).
- Regra 12: `llms.txt` e `llms-full.txt` atualizados.

## Acceptance Criteria

- Given a tabela de Contratos da Educação, when filtrada por categoria ou busca, then o rodapé mostra a soma dos filtrados e não muda ao paginar.
- Given emendas em entidades de educação do exercício, when a página abre, then a seção "Emendas parlamentares destinadas à Educação" mostra KPIs, tabela e rodapé de totais; given nenhuma, then a seção não aparece.
- Given emendas de outro portal ou de entidade fora da educação, then não entram nos resultados.
- Given a Saúde, when a tabela é exibida, then o rodapé usa o mesmo padrão de totais.
- Given as mudanças, then `pnpm build`, `tsc --noEmit`, `make test/ts` e `make test` passam.

## Review Findings

- [x] [Review][Patch] `llms-full.txt`: bullets de totais e emendas quebravam a sublista de categorias de contratos — reordenados [apps/web/public/llms-full.txt]
- [x] [Review][Patch] Rodapé de totais das emendas da Saúde/Educação não acompanhava a busca da tabela — totais agora derivam das linhas filtradas (`onFilteredDataChange`, dados memoizados) [apps/web/components/saude-emendas-section.tsx]
- [x] [Review][Patch] Seção de emendas na página da Educação sem teste de exibição/omissão e título customizado [page.spec.tsx, saude-emendas-section.spec.tsx]
- [x] [Review][Patch] `DenseTable` sem testes de `footer`, `footerLabel`, `onFilteredDataChange` e do cenário de `searchableKeys` literal (loop) [dense-table.spec.tsx]
- [x] [Review][Patch] Teste "independente da paginação" usava 2 contratos; adicionados 12 contratos e filtro por categoria [educacao-contratos-section.spec.tsx]
- [x] [Review][Patch] `montarEmendasStats` sem testes de ordenação, empenhado zero e taxa com autorizado zero [emendas-parlamentares.spec.ts]
- [x] [Review][Defer] Componente/DTOs de emendas com nome "Saúde" reutilizados na Educação — deferred: renomear para `EmendasParlamentaresSection` é refatoração ampla
- [x] [Review][Defer] Asserção do ano padrão do loader para emendas — deferred: `loadEducacaoData` sempre passa ano numérico; baixo risco

### Rejected

- `false` Fan-out por `dim_orgao` duplicado — `orgao_id` é único e derivado de `portal_slug` + `empresa_id` (`_dim_orgao.yml`).
- `false` `unaccent` não resolvível — usado sem schema em outras queries e passou nos testes de banco.
- `false` Seção oculta sem emendas — omissão é permitida pela spec; sem emendas não há o que explicar.
- `false` Ano do loader divergente — `loadEducacaoData` sempre entrega `selectedYear` numérico a todas as queries.
- `false` Falta de link legal em llms — o texto não cita lei nem norma.
- `low` Critério `%educ%` por nome — é o critério definido pelo usuário (`dim_orgao`).
- `low` Totais defasados por um render após trocar categoria; `catch` silencioso (padrão da Saúde); `searchableKeys` com `|`; `emendasStatsVazio` compartilhado; NaN em valores; rodapé com 0 linhas; `footerLabel` com footer na 1ª coluna; tipagem solta das linhas — cosméticos ou sem caso alcançável.
