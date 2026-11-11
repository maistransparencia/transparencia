# Epic 27 Context: Home: a Situação da Cidade Primeiro

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A home deixa de abrir pela arrecadação e passa a abrir pela pergunta "Como está a minha cidade hoje?". Saúde, obras e educação viram cards de situação (pergunta do cidadão, resposta em uma frase, régua que a sustenta). O dinheiro fica abaixo, em duas perguntas separadas: "Dinheiro que entra na cidade" (13º, sazonal) e "Para onde vai o dinheiro público" (hero fiscal rebaixado). Público: leigos em celular, vindos de redes sociais, em municípios pequenos; o 13º interessa ao comerciante local.

## Stories

- Story 27.1: Contrato de Dados da Home (Mínimos, Etiqueta com Motivo e Estados)
- Story 27.2: Card de Situação (Saúde, Obras e Educação)
- Story 27.3: Reorganização da Home (Nova Ordem, Hero Rebaixado e Radar Fora)
- Story 27.4: Dinheiro que Entra na Cidade (13º Salário, Sazonal)
- Story 27.5: Ajustes da Home e do Layout (Resumo nos Atalhos, Compartilhar a Página, Sidebar Recolhível)

## Requirements & Constraints

- Ordem fixa da home, sem reordenar por dado: abertura (h1 com município, período em texto), situação da cidade (Saúde, Obras, Educação), 13º, destino do dinheiro, mais detalhes. Sem seletor de ano no conteúdo (já existe no sidebar/header).
- Etiqueta "Merece atenção" só em dois casos: mínimo de saúde/educação `abaixo` em ano fechado (`abaixo_minimo`) e qualquer obra paralisada (`obra_paralisada`). Sempre com motivo escrito em uma linha. Nunca disparam: mínimo `parcial`/`sem_dado`, apagão da farmácia, queda do Ideb.
- Estados por área: normal, parcial, abaixo, sem_dado, indisponivel. Fonte ausente ou falha não derruba a página; cidade sem dado de uma área: o card some, sem espaço reservado. "Sem dado" nunca é mostrado como resposta.
- Apagão da farmácia: texto neutro ("isso não quer dizer que falta remédio"), sem etiqueta, mantém "Copiar requerimento" e "Compartilhar no WhatsApp" no card de saúde.
- 13º: janela única do portal (novembro e dezembro do ano corrente, sem seed nem config por município); mostra só o valor pago acumulado no ano, sem percentual ou barra; pago zerado diz "Ainda sem informação de pagamento", nunca "atrasado"; dado derivado declarado como tal; só agregado da folha, sem dado individual (LGPD). Fora da janela ou sem dado, a seção some.
- Mart do 13º: contar só elementos de despesa 01, 03, 04, 11, 16 e 96 (excluir 13, encargos); padrão de texto "13º", "décimo terceiro", "13 salário" com `unaccent`, mantendo exclusões de anulação/tipo `AN`. Altera `pago_13` também em `/pessoal`.
- Mínimo legal sempre com base legal linkada (nova aba, `rel="noopener noreferrer"`); texto de compartilhar leva período e fonte.
- Radar Cívico e PipelineExecucao saem da home (rota `/radar` e página de orçamento permanecem). Fora do escopo: assistência social, previdência, salário do mês, fornecedores locais, duração de obra paralisada.
- Atalhos "Mais detalhes" com resumo do ano ativo em uma frase com número, vindo das mesmas queries das páginas de destino; sem dado volta à descrição genérica (nunca "R$ 0").
- Sidebar desktop recolhível em faixa de ícones (sem filtros, sem controles do rodapé, tooltips, estado não lembrado); celular inalterado. Rótulo de "Reportar erro" vira "Sugestão ou erro" (texto final pelo editor-cidadao).

## Technical Decisions

- Percentuais da home saem das mesmas queries das páginas internas (`getSaudeMinimoConstitucional`, `siope.minimos.mde`, `getExecucaoDecimoTerceiroMetrics`, resumo de obras) com testes de paridade; nada recalculado na tela. Lógica (`emAtencao`, `motivo`, estado) em `@transparencia/db`; UI só traduz códigos em frases.
- Loader da home em `apps/web/app/[portalSlug]/loader.ts` com tolerância a falha por fonte (`.catch`, como `getResumoFarmaciaSus`); testes em `loader.spec.ts` e `view-model.spec.ts`.
- Estado como valor tipado, sem ternário aninhado nem tautologia; campos em camelCase, códigos em snake_case.
- Componente do card em `apps/web/components/` (domínio); barras de mínimo via `ThresholdMeter` de `packages/ui`; compartilhar via `ShareButton` com a URL da página de detalhe (evento `situacao_card_compartilhado` com `area` e `method`).
- Sem município, UF ou ano fixos (município vazio mostra "Municípios Integrados"); dbt/seed só no banco local; `llms.txt`, `llms-full.txt` e `CHANGELOG.md` atualizados; `pnpm typecheck` e `pnpm test` passam.
- Skills de domínio: jurista-fiscal (base legal), contador-publico (estágios do 13º), editor-cidadao (todo texto).

## UX & Interaction Patterns

- Card: eyebrow da área, pergunta em h3, resposta em `stat-value`, linha "Fonte:" em caption com links, "Ver detalhes" e "Compartilhar" (discreto, alvo 44px), formato `panel` do `DESIGN.md`. Um card por linha (`space-y-8`); a partir de `md`, resposta à esquerda e detalhe à direita; sem altura fixa.
- Saúde: manchete é o estoque da farmácia com busca de remédio; exemplos como chips com borda (32px). Educação: nota do Ideb com "era X" e seta `ArrowUp`/`ArrowDown` (`ok-text`/`warn-text`), meta só como contexto. Obras: "N em andamento" com paradas ao lado (some com a etiqueta); barra quadrada segmentada na ordem concluídas, em andamento, paradas, não iniciadas (canceladas só se houver); nunca "0 em andamento" sozinho.
- Tom: "Ainda não" em âmbar, sem vermelho nem acusação; "Em andamento" sem veredito no ano parcial.
- Espaçamento: abertura a 32px da primeira seção; entre seções 48px (celular) e 64px (desktop). h1 único, sem pular níveis, sem h5/h6; tokens do `DESIGN.md`/`EXPERIENCE.md` (sem `slate-*`, `font-mono` só em table/numeric).

## Cross-Story Dependencies

- 27.1 é base de 27.2; 27.2 é base de 27.3; 27.5 depende de 27.2 e 27.3.
- 27.4 não depende de dados da 27.1 (traz o próprio dado ao loader); só o encaixe na página depende da 27.3. Edita o mesmo `loader.ts` e `view-model` da 27.1 (conflito resolvido no merge).
- 27.4 altera o `pago_13` de `/pessoal` (testes de paridade e `DecimoTerceiroCard` ajustados).
- 27.5 atualiza a Story 23.5 (Epic 23) com o mesmo rótulo de erro/sugestão por indicador.
- Release: 27.1 a 27.3 no release; 27.4 entra se ficar pronta (janela do 13º é nov/dez).
