---
title: 'Story 20.9: Obras, Previdência, Radar, Gráficos Restantes e Mapa no Tema Escuro'
type: 'feature'
created: '2026-10-31'
status: 'ready-for-dev'
baseline_revision: 'c74232d8831bda663cb7e0e0c7120b2bd62018cb'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/DESIGN.md'
  - '{project-root}/EXPERIENCE.md'
  - '{project-root}/docs/glossario-cidadao.md'
  - '{project-root}/docs/governanca-constantes-fiscais.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problema:** `/obras`, `/previdencia` e `/radar` ainda usam cartões com borda arredondada e sombra, paleta fixa do Tailwind, hex e `font-mono`; os gráficos `recharts` restantes e o mini mapa de `obras-resumo-card.tsx` (base ArcGIS Light Gray) não acompanham o tema escuro. As três páginas também não declaram a pergunta do cidadão que respondem (Regra 27).

**Abordagem:** repetir o padrão da Story 20.8 em três páginas. Antes de mexer no visual, fixar a pergunta do cidadão de cada página e a régua que a responde; depois migrar para `KPIGrid`/`KPICard variant="divisoria"`, `SectionHeader`, `AlertBox`/`Badge`, filetes, elementos base nus e papéis, cores só por token e gráficos com `corDoGrafico`. Cada página passa por três revisões (Creuza, Atanagildo e jurídico) registradas neste arquivo. A remoção dos aliases e o zeramento da lista de exceções ficam na Story 20.19.

## Boundaries & Constraints

**Always:**
- Pergunta do cidadão por página, em linguagem comum, escolhida antes do dado; bloco sem pergunta sai ou vai para o fim, atrás de "Ver detalhes". Valor derivado ou estimado diz que é derivado e como foi calculado (Regra 27).
- Só tokens semânticos (`*-fill` em barras e bordas, `*-text` em texto); sem `dark:`, hex, paleta fixa, `bg-white`, sombra nem `rounded-*` em cartões nos arquivos migrados; contraste AA nos dois temas.
- `h1`–`h4` sem classe de tamanho, sem `h5/h6`, sem `font-mono` fora de `table`/`numeric`.
- Barras em `*-fill` pleno e tons distintos por categoria (nunca `/15`); barra e linha em cores diferentes; legendas iguais às séries; tooltips com `bg-page`; escala pelo maior valor entre as séries.
- Guarda de "sem dados" em todo componente (exercício zerado não vira "R$ 0"); sem ternário morto nem hover igual ao estado base.
- Regra 9 (sem `qtd`, `pct`), Regra 23 (sem município, UF ou ano fixo; intervalos vindos dos pontos reais), links externos com `target="_blank" rel="noopener noreferrer"`, preservar `aria-*` e `data-testid`.
- Specs de componente para tudo que for criado ou reescrito (lição do DW-12).
- Texto novo ou alterado segue o skill `editor-cidadao`; citação legal só com base verificada pelo `jurista-fiscal` (senão "NÃO VERIFICADO"); métricas conferidas pelo `contador-publico`.
- Remover do `apps/web/architecture/tema-excecoes.json` as entradas de obras, previdência e radar à medida que forem migradas.

**Never:** alterar `@transparencia/db`, `loader.ts` ou queries; mudar dados exibidos; alterar `opengraph-image.tsx` (permanece claro); migrar outras páginas; alterar `DenseTable`, `AlertBox` ou `Badge`; remover aliases legados nem a variante antiga de `KPICard` (20.19); adicionar dependências; editar `sprint-status.yaml`. Em `obras/view-model.ts` e `previdencia/view-model.ts` só se troca cor por token (estão na lista de exceções); lógica e textos ficam como estão, salvo achado das três revisões.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Sem obras / sem dados de previdência / sem alertas no radar | listas vazias ou totais zerados | estado vazio neutro com `border-y border-line`, sem "R$ 0" e sem município | — |
| Mini mapa de obras em tema escuro | tema escuro ativo | base de mapa escura legível, marcadores com contraste AA | tema claro mantém a base clara |
| Série com pago/valor maior que o previsto | percentual fora de 0–100 | barra limitada entre 0% e 100%, escala pelo maior valor entre as séries | — |
| Gráfico carregando (`dynamic`) | fallback dos gráficos | bloco `animate-pulse` com `bg-line2`, sem cartão arredondado | — |
| Histórico com anos diferentes de 2021–2025 | outro portal ou série mais longa | título e eixos usam `anoMin`–`anoMax` dos pontos reais | — |
| Valor estimado ou por diferença | métrica derivada (ex.: risco atuarial) | rótulo "estimativa" e frase de como foi calculada | — |

</intent-contract>

## Code Map

- `apps/web/app/[portalSlug]/obras/{page.tsx,view-model.ts}` + `apps/web/components/obras/*.tsx` (hero, paralisadas, interativa, mapa interativo, avanço duplo, detalhe modal, contratos vinculados, empenhos federais, disclaimer) -- 9 arquivos na lista de exceções; specs existentes por componente.
- `apps/web/components/obras-resumo-card.tsx` (+ `.spec.tsx`) -- mini mapa estático com base ArcGIS Light Gray; precisa acompanhar o tema escuro.
- `apps/web/app/[portalSlug]/previdencia/{page.tsx,view-model.ts}` + `apps/web/components/previdencia-{hero-section,saldo-caixa-card,patrimonio-historico-section,actuarial-risk-section,entidades-donut}.tsx` -- `recharts` em `entidades-donut` e `patrimonio-historico`.
- `apps/web/app/[portalSlug]/radar/page.tsx` + `apps/web/components/radar-{anomalia-card,civico-feed,gastos-sensiveis}.tsx` -- `radar-gastos-sensiveis` tem spec.
- `apps/web/components/saldo-caixa-evolucao-mensal-chart.tsx` -- `recharts` restante (confirmar a página que o usa).
- `apps/web/architecture/tema-excecoes.json` -- remover as entradas das páginas migradas (`cor-hex-literal`, `raio-antigo`, `paleta-fixa-do-tailwind`).
- `apps/web/architecture/tema.spec.ts` -- guarda que lê as exceções; deve passar a cada remoção.
- `apps/web/components/saude-educacao-divisorias.spec.ts` e `pessoal-receitas-orcamento-divisorias.spec.ts` -- modelos da guarda de código-fonte.
- `packages/ui/src/{components/{kpi-card,section-header,alert-box,badge}.tsx,utils/chart-colors.ts}`, `apps/web/components/kpi-grid.tsx` -- reuso, somente leitura.
- `DESIGN.md`/`EXPERIENCE.md`, `docs/glossario-cidadao.md` -- contrato visual e vocabulário cidadão.

## Tasks & Acceptance

**Execution:**
- Para cada página (`obras`, `previdencia`, `radar`): registrar neste arquivo a **pergunta do cidadão**, a régua que a responde e o destino de cada bloco (fica, vai para "Ver detalhes" ou sai) -- AC 1
- `apps/web/app/[portalSlug]/{obras,previdencia,radar}/page.tsx` -- `SectionHeader`, `KPICard variant="divisoria"`, fallbacks e severidade por token -- AC 2
- `apps/web/components/obras/*.tsx` (9 arquivos) e `obras-resumo-card.tsx` -- sem cartões; filetes, `Badge`, `AlertBox`, barras `bg-*-fill`/`bg-track` -- AC 2
- `apps/web/components/previdencia-*.tsx` (5 arquivos) e `radar-*.tsx` (3 arquivos) -- idem -- AC 2
- Gráficos `recharts` (donut de entidades, patrimônio histórico, saldo de caixa mensal e os de obras) -- `corDoGrafico`, tooltips com `bg-page`, anos dos pontos reais -- AC 3
- `obras-resumo-card.tsx` e `obras-mapa-interativo.tsx` -- base de mapa que acompanha o tema (claro/escuro), com contraste dos marcadores -- AC 4
- `tema-excecoes.json` -- remover entradas das três páginas -- AC 2
- Revisões: **Creuza** (`editor-cidadao`), **Atanagildo** (`contador-publico`) e **jurídico** (`jurista-fiscal`) por página; achados corrigidos aqui ou registrados em `deferred-work.md` com motivo -- AC 5
- `apps/web/components/obras-previdencia-radar-divisorias.spec.ts` -- guarda de código-fonte (modelo da 20.8) sobre as 3 páginas e seus componentes: sem `h5/h6`, `font-mono`, hex, paleta fixa e literais de UF/ano -- AC 6
- Specs de página e de componente -- ajustar ao novo markup e cobrir a matriz I/O (incluir specs dos componentes sem spec hoje: obras hero/paralisadas/interativa, previdência hero/donut, radar anomalia/feed) -- AC 6

**Acceptance Criteria:**
1. Given obras, previdência e radar, when a story começa, then cada página tem a pergunta do cidadão e a régua registradas neste arquivo, e todo bloco responde a uma pergunta ou foi movido/removido; valor derivado diz que é estimativa e como foi calculado.
2. Given as três páginas e seus componentes, when renderizadas, then não há cartões com borda arredondada e sombra, cor fixa nem hex, funcionam nos temas claro e escuro, e as entradas delas saem de `tema-excecoes.json`.
3. Given os gráficos `recharts` restantes, when desenhados, then usam `corDoGrafico` ou tokens, com tooltip legível e intervalos de ano dos pontos reais.
4. Given o mini mapa de `obras-resumo-card.tsx`, when o tema é escuro, then a base do mapa é escura e os marcadores mantêm contraste AA; no tema claro nada muda.
5. Given cada página, when termina, then Creuza, Atanagildo e o jurídico revisaram e os achados estão resolvidos ou adiados com motivo.
6. Given a suíte, when executada, then `pnpm test`, `pnpm typecheck`, `biome` e a suíte de testes visuais passam, e a guarda cobre os arquivos migrados sem literais de tenant, UF ou ano (Regra 23).

## Verification

- `pnpm typecheck`, `pnpm test` e `biome` em `apps/web` e `packages/ui`.
- Capturas de tela antes e depois (claro e escuro, desktop e mobile) das três páginas e do card de obras na Home.
- Checklist da Regra 23: o componente continua correto para outro estado (ex.: MG) e com histórico de 2017 a 2027?

## Registro das revisões

### Pergunta do cidadão por página (definidas em 2026-10-31; Creuza revisa o texto na execução)

Régua = o que acompanha o número para o cidadão saber se está bem ou mal. Base legal fica **NÃO VERIFICADO** até o `jurista-fiscal` conferir; nenhuma lei é citada na tela sem essa conferência.

**`/obras` — "As obras da cidade estão andando e o que já foi pago por elas?"**
- Blocos que respondem:
  - quantas obras há e em que situação (andando, paralisadas, concluídas) — hero;
  - onde ficam — mapa;
  - quanto foi feito versus quanto foi pago — gráfico de avanço duplo (avanço físico × avanço financeiro);
  - quais estão paradas e há quanto tempo — paralisadas;
  - de onde vem o dinheiro — empenhos federais e contratos vinculados.
- Régua: avanço físico contra avanço financeiro da mesma obra; tempo parada; valor pago contra valor contratado.
- Dado derivado: avanço físico estimado ou informado pela fonte deve dizer de quem é a informação. Obra parada é indício de atenção, não de culpa.
- Vai para "Ver detalhes": detalhe da obra (modal), contratos vinculados, empenhos federais.
- Disclaimer cívico (`obras-civic-disclaimer`) permanece perto do topo.

**`/previdencia` — "O dinheiro da aposentadoria dos servidores está sendo guardado e repassado em dia?"**
- Blocos que respondem:
  - o município tem fundo próprio de previdência? — estado sem RPPS (hoje com texto técnico "RPPS / RGPS / INSS", Creuza reescreve);
  - quanto era devido e quanto foi repassado — hero e adimplência;
  - quanto o fundo tem guardado e como evoluiu — patrimônio histórico e saldo de caixa;
  - o fundo tem rombo previsto? — risco atuarial;
  - de onde vem o dinheiro por entidade — donut.
- Régua: repassado contra devido no mesmo período; patrimônio ano a ano; déficit atuarial contra patrimônio.
- Dado derivado: déficit atuarial é cálculo de projeção (não é fato medido); a tela diz que é estimativa e de quem é o cálculo.
- Vai para "Ver detalhes": composição contábil dos repasses e tabelas do risco atuarial.

**`/radar` — "Há algum gasto ou situação que merece um olhar mais atento?"**
- Blocos que respondem:
  - avisos atuais do portal (feed cívico e cartões de anomalia);
  - gastos em áreas sensíveis (radar de gastos sensíveis).
- Régua: comparação com o próprio histórico do município e com a média estadual calculada pela camada de dados (nunca constante no código, Regra 23).
- Dado derivado: todo alerta é **indício** para conferir, não acusação; a tela diz como o alerta foi calculado e o que o cidadão pode fazer (ex.: ver o detalhe da despesa).
- Vai para "Ver detalhes": critérios e fórmulas de cada alerta.

### Achados das revisões

(preencher durante a execução: Creuza, Atanagildo e jurídico, por página)
