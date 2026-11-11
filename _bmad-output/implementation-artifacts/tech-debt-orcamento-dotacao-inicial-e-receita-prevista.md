# Débito Técnico / Backlog: Dotação Inicial, Alterações e Receita Prevista (Orçamento)

Levantamento de 2026-10-30, feito sobre o banco local (somente leitura). Nenhum dado de produção foi consultado. Revisão técnica, não substitui contador (CRC).

## Contexto
A página `/orcamento` deve responder "a prefeitura está cumprindo o que prometeu?". Os itens de execução contra a dotação atualizada (KPIs, funil, órgão/unidade) usam o mart `fct_execucao_orcamentaria_metricas` e **estão corretos**. Dotação inicial, alterações (créditos adicionais) e receita prevista **não devem ser exibidas** até resolver os pontos abaixo.

## O que está correto (não mexer)
- `fct_execucao_orcamentaria_metricas` vem do relatório por órgão (`stg_*__despesas_por_orgao`), no grão certo. Bate ao centavo com os empenhos do exercício em `int_despesas_consolidadas` (Porciúncula 2025: empenhado R$ 145.276.994, pago R$ 125.761.583).
- O empenhado do exercício é líquido de anulações (tipo `AN`).
- `fct_orcamento_funcional_metricas` já filtra `fonte = 'exercicio'` (exclui restos a pagar).

## Achados

### 1. Dotação repete em cada linha de empenho (não somar direto)
- `dotacao_inicial`, `alteracao_dotacao` e `dotacao_atualizada` em `int_despesas_consolidadas` e `fct_despesas` repetem o valor da dotação em cada empenho. Porciúncula 2025: 10.443 linhas para 493 fichas.
- Soma bruta: dotação inicial R$ 5,66 bi e atualizada R$ 8,24 bi, contra R$ 214,9 mi do mart por órgão.
- A dotação é consistente dentro da mesma `ficha` (0 fichas com valores divergentes).
- Deduplicando por `portal_slug + ano + ficha`, a identidade fecha: inicial + alteração = atualizada (Porciúncula 2025: 105,01 + 52,60 = 157,61 mi; Natividade 2025: 114,04 + 52,26 = 166,30 mi).

### 2. Restos a pagar convivem na mesma tabela
- `int_despesas_consolidadas` une empenhos do exercício e restos a pagar (`union all`). As linhas de restos a pagar não têm `ficha`, `data_empenho` nem dotação (661 linhas em Porciúncula 2025; R$ 39,4 mi empenhados, R$ 15,4 mi pagos).
- Quem consultar essa tabela direto e somar por `ano` mistura exercício corrente com restos a pagar. `fct_despesas` expõe `fonte = 'exercicio'` e deve ser o discriminador.

### 3. Risco latente no mart funcional
- `fct_orcamento_funcional_metricas.sql:17` usa `max(dotacao_atualizada)` por linha agrupada (função, subfunção, programa, atividade, natureza). Se o grupo for mais grosso que a ficha, fichas distintas contam uma vez só.
- Porciúncula 2025: R$ 141,9 mi nesse mart, contra R$ 157,6 mi por deduplicação por ficha. **Suspeita, não confirmada.**
- **Confirmado em 2026-10-30** pelo absurdo contábil: Porciúncula 2025, Educação com dotação R$ 28,4 mi e pago R$ 32,5 mi (pago maior que a dotação); Cultura R$ 1,17 mi contra R$ 1,198 mi pagos; Encargos Especiais R$ 0,79 mi contra R$ 1,01 mi pagos. O `max()` subconta a dotação.
- Sem efeito visível hoje: a tela usa só o valor pago desse mart. **Não usar a dotação por função para taxa de execução** até corrigir.
- `fct_execucao_orcamentaria_metricas` tem `funcao_codigo` e `subfuncao_codigo` sempre `'00'` (grão efetivo: órgão/unidade). Não dá para obter taxa de execução por função a partir dele.

### 4. `fct_receitas` não serve para somar previsão
- Porciúncula 2026, tipo orçamentária: R$ 839 mi de previsão no banco, contra R$ 110.264.174,12 no Balancete da Receita de agosto/2026 (líquido de deduções do Fundeb). Hierarquia (subtotais e detalhes) e códigos repetidos inflam a soma.
- A previsão por código confere (FPM cota mensal: R$ 34.109.475 nos dois).
- Itens extraorçamentários (consignações) não são receita da prefeitura e não podem entrar em orçamento.

### 5. Receita da Prefeitura não é comparável à despesa consolidada
- O balancete é só da Prefeitura. A dotação 2026 do mart soma cinco entidades: Prefeitura R$ 75,6 mi, Saúde R$ 68,3 mi, Educação R$ 46,6 mi, Desenvolvimento Social R$ 8,5 mi, Meio Ambiente R$ 4,4 mi (total R$ 203,4 mi).
- Hipótese não verificada: Saúde e Educação recebem transferências próprias em balancetes separados.

## Pendências
- [ ] Obter a LOA 2026 (total geral) ou os balancetes das outras quatro entidades, para fechar a diferença entre R$ 157,6 mi (por ficha) e R$ 214,9 mi (por órgão). Hipótese: o relatório por órgão inclui dotações sem empenho no ano.
- [ ] Confirmar a suspeita do item 3 (agrupamento do mart funcional mais grosso que a ficha).
- [ ] Definir o tratamento do `ficha` nulo e documentar `fonte = 'exercicio'` como filtro obrigatório de dotação.
- [ ] Criar a query de dotação inicial e alterações em `@transparencia/db` com deduplicação por `portal_slug + ano + ficha`, e um teste dbt para a identidade inicial + alteração = atualizada.
- [ ] Corrigir a agregação de previsão de receita antes de comparar receita prevista com despesa fixada.
- [ ] Encaminhar ao `jurista-fiscal` a redação de "créditos adicionais" na tela, se exibida.
- [ ] Conferir de onde vem o "Previsto e arrecadado" de `/receitas` (não verificado neste levantamento).

## Referência
- Balancete da Receita de agosto/2026, Prefeitura de Porciúncula, baixado do portal da transparência (`~/Downloads/portalTransparencia.pdf`; arquivo fora do repositório).

## Fora do escopo de orcamento (story de varredura)
- [ ] Migrar os `KPICard` restantes para `IndicatorPanel` / `Indicator` (`@transparencia/ui`), conforme `DESIGN.md > indicator`: saude, previdencia, educacao-hero-section, obras-hero-section, saude-contratacao-section, saude-emendas-section, previdencia-patrimonio-historico-section. Depois disso, avaliar a remocao do `KPICard` e do `kpi-grid`.
- [ ] Cartao de disponibilidade financeira do RPPS em `/previdencia` ainda usa `rounded-2xl`, `bg-white` e `shadow-sm`, fora do padrao novo de paineis.

## Mover "Dinheiro em caixa e nos bancos" para rota propria (story futura)
Decisao de 2026-10-30: a secao responde "quanto dinheiro existe agora?", e nao "a prefeitura esta cumprindo o que prometeu?". Fica em `/orcamento` por enquanto para nao quebrar o link da pagina inicial. Recomendacao: rota propria (ex.: `/caixa`).
- Motivos: pergunta diferente da pagina; periodos diferentes na mesma tela (execucao "Jan-Out" e caixa "Posicao em agosto", fontes e atrasos distintos); peso desproporcional (3 alertas, indicadores, painel com grafico e cards por entidade).
- [ ] Criar a rota, mover `saldo-caixa-entidades-section.tsx` e o grafico para ela, com `loader` proprio (`getSiconfiPosicaoFinanceira`, `getSiconfiEvolucaoMensal`).
- [ ] Repontar o `SaldoCaixaResumoCard` da pagina inicial: hoje `detailUrl` = `/orcamento#disponibilidade-caixa` (`apps/web/app/[portalSlug]/page.tsx:113`); remover a ancora `id="disponibilidade-caixa"` de `/orcamento/page.tsx`.
- [ ] Em `/orcamento`, deixar uma linha com link para a nova pagina.
- [ ] Atualizar `llms.txt` e `llms-full.txt` (rotas e a descricao de `/orcamento`), a navegacao e o `opengraph-image` se aplicavel.
- [ ] Mover os testes da secao e manter o spec de arquitetura de tema.
- [ ] O modo `scope="previdencia"` de `SaldoCaixaEntidadesSection` nao e usado por nenhuma pagina (a Previdencia usa um cartao proprio): remover ou adotar na migracao.
