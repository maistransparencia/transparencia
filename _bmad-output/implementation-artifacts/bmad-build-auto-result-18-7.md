---
status: blocked
---

# BMad Build Auto Result

Status: blocked
Blocking condition: intent gap

## Perguntas sem resposta

A Story 18.7 exige que as emendas da Educação tenham "Rastreabilidade" (quantidade de empenhos) e um modal "Detalhes" com as notas de empenho vinculadas. Nenhum dado de origem liga uma emenda a empenhos. Há mais de uma leitura defensável, e elas levam a resultados diferentes:

1. **Fidelidade à Saúde:** copiar o padrão atual da Saúde, em que `getSaudeEmendasMetrics` devolve sempre `qtdEmpenhos: 0` e `empenhos: []`. A coluna e o modal existiriam, mas ficariam vazios.
2. **Vínculo heurístico:** inferir empenhos por texto ou fonte de recurso (`destinacao`, `resumo`, fonte). Isso inventaria uma relação que a fonte não declara, o que é arriscado numa tela de auditoria cidadã.
3. **Novo vínculo na origem:** estender a extração ELT para trazer o vínculo emenda↔empenho, por exemplo expondo `pk_ep_emenda` e uma tabela ou coluna correspondente no lado dos empenhos. Isso exige uma fonte que talvez nem exista.

Perguntas para decidir:
- A rastreabilidade pode ficar vazia nesta story (leitura 1), com a estrutura pronta para receber dados?
- Se não, qual é a regra oficial de vínculo emenda→empenho, e de qual coluna ou fonte ela vem?
- A classificação "emenda da Educação" pode ser feita por texto (`destinacao`/`resumo` com `unaccent(lower(...))` contendo "educa"), como a Saúde faz com "saud", ou existe um critério oficial (função 12, `empresa_id`)?

## Evidências

- `elt/transform/models/marts/fct_emendas.sql` e `int_emendas_consolidadas.sql` não têm coluna de função, ação, flag de educação nem referência a empenhos. `pk_ep_emenda` existe só no raw, em `_sources.yml` (Porciúncula e Natividade), e não é propagado.
- `grep` nas fontes (`staging/*/_sources.yml`) não encontra campo de emenda nas tabelas de empenho, liquidação ou pagamento.
- `packages/db/src/queries/historia-saude-metrics.ts` (~135-232): a classificação da Saúde usa `ILIKE '%saud%'` em `destinacao`/`resumo` ou `empresa_id`. Os empenhos retornam sempre vazios, e só os specs os preenchem.
- A linha de totais fixa nos contratos da Educação e o componente de totais compartilhado não dependem dessa decisão e estão prontos para planejar.

## Contexto reunido para o replanejamento

- `apps/web/components/saude-emendas-section.tsx:480-494`: totalizador atual (`bg-slate-100 px-4 py-3 font-bold text-sm rounded-lg`), um `div` externo ao `DenseTable`. Não há deep link por query param nessa seção; o padrão de deep link está em `educacao-contratos-section.tsx:88-152` (`?contratoNumero=`).
- `apps/web/components/educacao/educacao-contratos-section.tsx`: `filteredContratos` (linha 157), `tableData` (182) e `DenseTable` com `pageSize={10}` (464). O total deve ser calculado sobre `filteredContratos`, não sobre a página visível.
- Página da Educação: `page.tsx` (seção de emendas entraria após Contratos, ~linha 76), `loader.ts` (`EducacaoSearchParams` precisaria de novo parâmetro de deep link), `view-model.ts`.
- `llms.txt:42` e `llms-full.txt` (seção 1.7.1, linhas 319-332) precisam ser atualizados (Regra 12).
- Contexto do épico: `epic-18-context.md` (recompilado nesta execução).
