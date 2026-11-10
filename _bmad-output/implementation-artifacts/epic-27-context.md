# Epic 27 Context: Home: a Situação da Cidade Primeiro

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A página inicial deixa de abrir pela arrecadação e passa a responder "Como está a minha cidade hoje?". Saúde, obras e educação viram cards de situação (pergunta do cidadão, resposta curta, régua que a sustenta). O dinheiro fica abaixo, em duas perguntas: "Dinheiro que entra na cidade" (13º, só na época) e "Para onde vai o dinheiro público" (hero fiscal rebaixado). Público: leigos, celular primeiro, sem jargão; o 13º interessa ao comerciante local.

## Stories

- Story 27.1: Contrato de dados da home (mínimos, etiqueta com motivo e estados)
- Story 27.2: Card de situação (saúde, obras e educação)
- Story 27.3: Reorganização da home (nova ordem, hero rebaixado, Radar fora)
- Story 27.4: Dinheiro que entra na cidade (13º salário, sazonal)

## Requirements & Constraints

- Ordem fixa: abertura, "Como está a cidade hoje", "Dinheiro que entra na cidade", "Para onde vai o dinheiro público", "Mais detalhes".
- Sem seletor de ano no conteúdo (já existe no sidebar/header); período só como texto.
- Seção sem dado não deixa card ou espaço vazio.
- Camada de apresentação burra: números saem das mesmas queries das páginas internas, nunca recalculados na tela.
- Sem município, UF ou ano fixos em código; textos ao cidadão passam pelo `editor-cidadao`; estágios do 13º conferidos pelo `contador-publico`.
- Dado derivado diz que é derivado; dado não publicado nunca vira "atrasado" nem "não pagou".

## Technical Decisions

- O 13º existe em `getExecucaoDecimoTerceiroMetrics` (empenhado, liquidado, pago, percentual pago) por ano, sem mês nem data de pagamento.
- A janela de exibição do 13º (novembro e dezembro) é regra única do portal na camada de dados, sem config por município e sem lei municipal (decisão de 2026-11-09).
- Visual: `DESIGN.md` e `EXPERIENCE.md` (elemento nu primeiro, papéis `eyebrow`, `stat-value`, `panel`, `section`).

## Cross-Story Dependencies

- 27.4 edita o mesmo `loader.ts` e `view-model` da 27.1; o encaixe na página usa o espaço deixado pela 27.3 (nada renderizado ali até a 27.4).
