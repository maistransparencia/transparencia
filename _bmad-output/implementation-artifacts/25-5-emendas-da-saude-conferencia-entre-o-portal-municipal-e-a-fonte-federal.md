---
status: not-planned
---

> **not-planned (2026-11-07):** o Julio abandonou a branch `feature/epic25-story-25-5` por enquanto. A camada de dados (25.5a) está pronta e revisada (commits `d92cb7ca` e `d53fea53`), mas a tela da conferência foi retirada por ficar redundante. Reabrir com outro desenho, se a conferência voltar.

# Story 25.5: Emendas da Saúde: Conferência entre o Portal Municipal e a Fonte Federal

Critérios de aceite completos: `planning-artifacts/epics.md`, Story 25.5 (Epic 25). Este arquivo guarda só o contexto de execução. A 25.7 (educação) reaproveita o método, então construa o que for genérico sem amarrar à função Saúde.

## Pergunta do cidadão (Regra 27)

"O dinheiro desta emenda chegou à cidade e já foi usado?" A tela mostra as duas posições (Governo Federal e Prefeitura), cada uma com data e fonte, e nunca conclui omissão, irregularidade ou atraso.

## Leitura obrigatória antes de codar

`planning-artifacts/spike-emendas-fonte-federal.md` (local, não versionada). Pontos que mandam:

- **Resposta curta (seção 1) e cadeia a conferir (seção 3).**
- **Seção 4:** cruzamento real no banco local, incluindo os formatos de código (12 dígitos e "Nº" + 8 dígitos) e o caso `Múltiplo`.
- **Seção 6:** textos por situação e regras de texto (termos proibidos). Os rótulos novos vão para `docs/glossario-cidadao.md`.
- **Seção 8:** decisões do Julio, não reabrir (estadual fora; indício com data, nunca "omissão"; carga semanal pela 23.8; não consultar a Prefeitura sobre o formato do código).
- **Seções 10 e 11:** pareceres do `jurista-fiscal` e do `contador-publico`. Itens marcados **AJUSTAR** viram critério de teste: liquidado e pago registrados juntos; caixa contra competência; ano do código de 8 dígitos pelo lançamento mais próximo do pagamento federal; pagamento por exercício separado de restos a pagar.

## O que já existe para reaproveitar (25.9, estaduais)

- Carga: `elt/extract/emendas_estaduais.py`, `elt/fontes/emendas_estaduais.yml`, teste em `elt/extract/__tests__/test_emendas_estaduais.py`. Padrão por fonte da Epic 26 (`raw_<fonte>`).
- Staging: `elt/transform/models/staging/emendas_estaduais/`.
- Marts: `fct_emendas_estaduais*.sql` e `fct_emendas.sql`, com testes em `elt/tests/test_fct_emendas_estaduais*.py`.
- Query e UI: `packages/db/src/queries/emendas-estaduais.ts` (+ spec) e `apps/web/components/emendas-estaduais-bloco.spec.tsx`.
- Vocabulário de forma de repasse (`transferencia_especial`, `finalidade_definida`, `bancada_comissao_relator`) **já existe nas estaduais**: a coluna `forma_repasse` da federal usa os mesmos códigos. Conferir onde o mapa vive (`fct_emendas_estaduais.sql` e o YAML da fonte) e reutilizar, sem duplicar.
- Objeto correto da emenda na tela: Story 25.8 (feita). Use o campo de objeto que ela entregou.

## Pontos de atenção

- **Fonte nacional, sem `portal_slug`.** O vínculo com o município vem do código IBGE da dimensão de portais; o `PorFavorecido` só traz nome e UF, então o cruzamento é por nome normalizado (`unaccent`, já disponível no banco) mais UF. Ambiguidade: não cruza e registra.
- **Arquivo de 32 MB, instantâneo, sem contrato de estabilidade.** Registrar a data do arquivo em cada carga. O teste de contrato em ambiente de carga está pendente (8.1 da spike) e não bloqueia a entrega local.
- **Código de emenda extraído do texto da receita e da despesa.** As contagens da spike são piso, não total: a regra precisa aceitar "Nº" opcional.
- **Fundo de destino na chave.** O cruzamento por entidade ainda não foi feito (item 13 do parecer contábil, NÃO VERIFICÁVEL). Verificar no banco local antes de fechar o grão do mart.
- **Valor vazio é nulo, nunca zero.** Empenho líquido. Rendimento da conta da emenda em coluna própria, fora das comparações.
- **Sem pessoa física** como favorecido na tela.
- **Tamanho:** a story cobre carga, staging, mart, query e tela. Se, ao detalhar o plano, ela passar de um ciclo de revisão razoável, pare e proponha ao Julio dividir em dados (dbt e query) e tela.

## Fora do escopo

Emenda estadual (25.9, feita); educação (25.7); execução em produção; cadência da carga (23.8); qualquer conclusão sobre omissão, irregularidade ou atraso.

## Regras que valem

- Regra 15: só Docker local (`localhost:5544`). **Nunca** exportar `DATABASE_URL` do 5544 junto de `db/test/build` ou `pnpm test` (apaga o banco local). Chamadas HTTP de leitura ao Portal da Transparência federal são o único acesso externo.
- Regras 2, 9, 10, 12 (`llms.txt` e `llms-full.txt`), 14, 20 (link oficial da lei, LC 210/2024 art. 8º no Planalto se o bloco citar prazo), 23, 25 e 27.
- Skills de apoio: `dbt-transparencia`, `contador-publico`, `jurista-fiscal` (licença de reuso dos dados federais), `editor-cidadao` (textos finais).
- Após alterar: `make test`, `make check`, `make test/ts` e `pnpm typecheck`.
- Commits convencionais em minúsculas, sem referência a story (Regra 19). Não commitar sem pedir ao Julio.

## Registro da implementação (25.5a, dados e query; a tela é a 25.5b)

Dividida com o Julio em 25.5a (dados e query, feita) e 25.5b (tela, `EmendasSection`, glossário, `llms*.txt`, revisão do `editor-cidadao`).

- **Carga:** `elt/extract/emendas_federais.py`, `elt/load/emendas_federais.py`, `elt/fontes/emendas_federais.yml`, `make elt/emendas-federais`. Instantâneo nacional em `raw_emendas_federais` (substituído por inteiro a cada carga, data do arquivo vinda do zip). Pessoa física nunca é carregada. Contrato validado (arquivos e cabeçalhos) antes de gravar.
- **Staging:** `staging/emendas_federais/`. `forma_repasse` com o mesmo vocabulário das estaduais, mas o texto novo da CGU vira `nao_identificado` aqui (nas estaduais o código equivalente é `nao_mapeada`), e o `accepted_values` falha.
- **Vínculo e fundo:** `fct_emendas_federais_vinculo_municipio` (nome normalizado + UF contra `dim_portais`; ambíguo não cruza e fica registrado). O fundo de destino vem do CNPJ do favorecido contra `dim_orgao` do mesmo portal, o que fecha o item 13 do parecer contábil.
- **Mart:** `fct_emendas_conferencia`, grão portal + código + fundo (`empresa_id`). O cadastro municipal sem código cruzável tem linha própria (`emenda_id_cadastro`). Além dos seis códigos do épico há `sem_codigo_cruzavel`.
- **Achado:** o órgão do cadastro de emendas (`fct_emendas.empresa_id`) nem sempre é o fundo de destino. O cadastro cruza pelo portal e herda o fundo quando o pagamento federal tem um fundo só.
- **Ano do código de 8 dígitos:** pagamento federal mais próximo do lançamento (meses); empate não cruza. Corrige o caso 202650410001 da spike (despesa maior que o depósito).
- **Pagamento sem fundo:** `fct_emendas_federais_pagamentos_sem_fundo` lista pagamentos a fundo ou ente público do município sem CNPJ igual ao de um órgão do portal (teste dbt `warn`, deve ficar vazio; hoje 0 linhas). O mart marca `pagamento_federal_sem_fundo_identificado` e a tela não pode dizer "sem pagamento federal" nesse caso. Antes de entrar cidade nova, conferir essa lista.
- **Query:** `packages/db/src/queries/emendas-conferencia.ts` (`getEmendasConferencia`, `montarEmendasConferencia`), com resumo, período e datas calculados dos dados.
- **Conferido no banco local contra a spike:** 202539420002, 202543110013, 202571200001 (concordam), 202544350003 e 202544750003 (gasto pequeno), 202550410002 (R$ 2.580.000 recebidos; cadastro diverge da despesa), 202541520013 (gasto por valor de R$ 300.000).
- **Testes:** `elt/extract/__tests__/test_emendas_federais.py`, `elt/tests/test_fct_emendas_conferencia.py`, `emendas-conferencia.spec.ts`. `make check`, `make test` (368), `make test/ts` (1720) e `pnpm typecheck` passam.
- **Multi-tenant (Regra 23):** sem município, UF ou ano fixos; todo `JOIN` e `GROUP BY` leva `portal_slug`; ano e período vêm dos dados. Outro estado ou histórico de 2017 a 2027 continua funcionando.
- **Pendências para a 25.5b e outras:** textos finais (`editor-cidadao`); licença de reuso dos dados federais (`jurista-fiscal`); restos a pagar por exercício revisado pelo contador; teste de contrato no ambiente de carga e inclusão da fonte no grupo semanal da 23.8; ambiguidade de vínculo sem teste com dados porque o seed tem só duas cidades.

### Review Findings

Revisão do commit d92cb7ca (25.5a), modo full, 4 lentes. Tela, glossário e `llms*.txt` (25.5b) fora do escopo.

- [x] [Review][Decision] Filtro de Saúde perdia emenda só da Prefeitura e incluía cadastro de outras áreas — resolvido (1a): `codigos_funcao_emenda` no mart, filtro `@>` e linhas sem emenda federal sempre incluídas [`emendas-conferencia.ts`, `fct_emendas_conferencia.sql`]
- [x] [Review][Decision] Receita ou despesa de 8 dígitos sem match sumia — resolvido (2a): linha `sem_codigo_cruzavel` com `codigo_parcial_emenda` [`fct_emendas_conferencia.sql`]
- [x] [Review][Decision] Cadastro com código pago a 2 ou mais fundos — resolvido (3c): mantido e documentado no cabeçalho do mart; nenhum caso nos dados; teste cobre o fundo único
- [x] [Review][Decision] `gastos_por_valor` sem limite de tempo — resolvido (4a): janela de 12 meses (`emendas_janela_gasto_por_valor_meses`) e despesa atribuída à emenda de pagamento mais próximo
- [x] [Review][Decision] `situacaoValida` mapeava código desconhecido para `sem_codigo_cruzavel` — resolvido (5a): situação `desconhecida` e `console.error`
- [x] [Review][Patch] Testes das situações do cadastro (divergência, estadual, federal sem código, PIX, herança de fundo) [`test_fct_emendas_conferencia.py`]
- [x] [Review][Patch] Teste de isolamento com segundo portal de mesmo `empresa_id` e código [`test_fct_emendas_conferencia.py`]
- [x] [Review][Patch] Teste do loader: segunda carga substitui e falha preserva o instantâneo [`test_load_emendas_federais.py`]
- [x] [Review][Patch] Teste do 8 dígitos que não cruza e teste PIX [`test_fct_emendas_conferencia.py`]
- [x] [Review][Patch] `orderBy` com `nulls last` [`emendas-conferencia.ts`]
- [x] [Review][Patch] `isoDate` pelas partes locais da data [`emendas-conferencia.ts`]
- [x] [Review][Patch] Regex de rendimento sem "depósito bancário" [`fct_emendas_conferencia.sql`]
- [x] [Review][Patch] `accepted_values` do mart amarrado às situações do TS por teste [`emendas-conferencia.spec.ts`]
- [x] [Review][Defer] Vínculo por nome e UF frágil [`fct_emendas_federais_vinculo_municipio.sql`] — deferred: real mas fora do escopo; relatório de favorecidos sem vínculo
- [x] [Review][Defer] Duplicação por CNPJ repetido em `dim_orgao` [`fct_emendas_federais_pagamentos.sql`] — deferred: consultar `dim_orgao` por CNPJ duplicado
- [x] [Review][Defer] Filtro de pessoa física por igualdade exata [`elt/extract/emendas_federais.py`] — deferred: listar `Tipo Favorecido` no arquivo real
- [x] [Review][Defer] `parse_valor` sem teste de negativo [`elt/extract/emendas_federais.py`] — deferred: conferir estornos no arquivo
- [x] [Review][Defer] `registros_prefeitura_divergem` com empenho parcial [`fct_emendas_conferencia.sql`] — deferred: junto com a 25.5b

#### Rejeitados

- `row_number() over ()` instável: falso, o CTE é materializado ao ser usado duas vezes.
- Falso positivo de "emen" ou de 8 dígitos: contido pelo join por portal, fundo e `right(codigo, 8)`.
- `make_date` com mês 00 ou 13, NaN, data zerada no zip, `ano_emenda` não numérico, `ALTER TABLE` no loader, timeout e retry do download, `hash()` salgado no fixture: baixa chance e correção cara.
- Mapa de `forma_repasse` na carga e nome do mart: documentado no registro; corrigir exigiria editar a spec.
- `pago_e_registrado` com valores nulos, `data_posicao_prefeitura`, `min(forma_repasse)`, `try/catch` com `indisponivel`, documentação e aliases: comportamento correto ou sem dano.

## Registro da implementação (25.5b, tela)

**Decisão do Julio (2026-11-07):** a tela da conferência ficou redundante e mostrava vários registros como "Autor não informado". Por enquanto a página de Saúde continua só com as emendas que a própria Prefeitura lança no portal dela. A camada de dados e a query da 25.5a seguem prontas (`getEmendasConferencia`), sem uso na tela.

- **Retirado da página:** ligação do bloco em `EmendasSection` e na página de Saúde; glossário e `llms*.txt` voltaram ao que estavam (não descrevem a conferência).
- **Rascunho guardado, sem uso:** `apps/web/components/emendas-conferencia-bloco.tsx`, `apps/web/lib/emendas-conferencia-textos.ts` e os dois specs. Reaproveitar só se a conferência voltar com outro desenho; o ponto de partida é por que o autor vinha vazio (o cadastro sem código e as linhas parciais não têm autor).
- **Produção:** o dbt de produção lê `raw_emendas_federais`, que só existe no banco local e no de teste; antes de publicar a 25.5a, rodar a carga federal em produção (com autorização do Julio, Regra 15) ou deixar os modelos fora da rodada diária.
