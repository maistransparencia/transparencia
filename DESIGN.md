---
name: Portal Transparência — Padrões Visuais Base
description: Estilos base dos elementos HTML (títulos, parágrafo, dl, tabela, listas, links), papéis visuais nomeados e o painel. Estende os tokens existentes de apps/web/app/globals.css; não cria cor nova.
status: final
updated: 2026-10-31
colors:
  # Convenções deste arquivo:
  #  - Nomes são os tokens de globals.css. Tema claro em :root, escuro em .dark.
  #  - Sufixo -dark = valor do tema escuro. Token sem par -dark tem o mesmo valor nos dois temas
  #    (ok-fill, warn-fill, danger-fill).
  #  - Valores oklch são aceitos: é como globals.css os define; converter para hex duplicaria a fonte.
  page: '#ffffff'
  page-dark: '#14171b'
  ink: '#1a1d21'
  ink-dark: '#e8eaed'
  line: '#e2e5ea'
  line-dark: '#2c3138'
  line2: '#f0f1f4'
  line2-dark: '#23282e'
  mute: '#4b5563'
  mute-dark: '#a8b0bb'
  brand-fill: 'oklch(0.5 0.11 250)'
  brand-fill-dark: 'oklch(0.6 0.15 255)'
  brand-text: 'oklch(0.5 0.11 250)'
  brand-text-dark: 'oklch(0.75 0.11 250)'
  ok-fill: 'oklch(0.68 0.16 155)'
  ok-text: 'oklch(0.5 0.1 155)'
  ok-text-dark: 'oklch(0.75 0.12 155)'
  warn-fill: 'oklch(0.77 0.16 70)'
  warn-text: 'oklch(0.53 0.14 55)'
  warn-text-dark: 'oklch(0.83 0.15 80)'
  danger-fill: 'oklch(0.63 0.2 27)'
  danger-text: 'oklch(0.55 0.17 25)'
  danger-text-dark: 'oklch(0.7 0.16 25)'
  focus-ring: '{colors.brand-fill}'
typography:
  # Sufixo -md = valor a partir do breakpoint md (768px). Sem sufixo = mobile.
  # Títulos: serif, text-ink. O tamanho vem do elemento, nunca de classe solta.
  h1:
    fontFamily: 'Source Serif 4'
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  h1-md:
    fontFamily: 'Source Serif 4'
    fontSize: 30px
    fontWeight: '700'
    lineHeight: '1.2'
  h2:
    fontFamily: 'Source Serif 4'
    fontSize: 20px
    fontWeight: '700'
    lineHeight: '1.25'
  h2-md:
    fontFamily: 'Source Serif 4'
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.25'
  h3:
    fontFamily: 'Source Serif 4'
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.3'
  h3-md:
    fontFamily: 'Source Serif 4'
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.3'
  h4:
    fontFamily: 'Source Serif 4'
    fontSize: 16px
    fontWeight: '600'
    lineHeight: '1.35'
  h4-md:
    fontFamily: 'Source Serif 4'
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.35'
  display:
    fontFamily: 'Source Serif 4'
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.01em
  display-md:
    fontFamily: 'Source Serif 4'
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.01em
  body:
    fontFamily: 'IBM Plex Sans'
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  body-md:
    fontFamily: 'IBM Plex Sans'
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  eyebrow:
    fontFamily: 'IBM Plex Sans'
    fontSize: 11px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0.08em
  caption:
    fontFamily: 'IBM Plex Sans'
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
  stat-value-sm:
    fontFamily: 'Source Serif 4'
    fontSize: 20px
    fontWeight: '700'
    lineHeight: '1.15'
  stat-value-sm-md:
    fontFamily: 'Source Serif 4'
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.15'
  stat-value:
    fontFamily: 'Source Serif 4'
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.15'
  stat-value-md:
    fontFamily: 'Source Serif 4'
    fontSize: 30px
    fontWeight: '700'
    lineHeight: '1.15'
  stat-value-lg:
    fontFamily: 'Source Serif 4'
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1'
  stat-value-lg-md:
    fontFamily: 'Source Serif 4'
    fontSize: 60px
    fontWeight: '700'
    lineHeight: '1'
  numeric:
    fontFamily: 'IBM Plex Mono'
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
spacing:
  # Escala padrão do Tailwind herdada. Só o que o spec nomeia:
  section-gap: 24px
  section-heading-gap: 12px
  text-flow-gap: 16px
  indicator-grid-gap: 24px
  table-cell-y: 10px
  table-cell-x: 12px
  touch-target: 44px
rounded:
  # O painel hoje não tem raio. O formato é trocável por variável (ver Components > panel).
  none: 0px
  md: 6px
components:
  # Nomes em inglês. Valores de panel espelham as variáveis CSS --panel-border-width, --panel-radius,
  # --panel-padding e --panel-shadow.
  panel:
    border-width: '0 0 0 3px'
    radius: '{rounded.none}'
    padding: '0.25rem 0 0.25rem 1rem'
    shadow: 'none'
    border-color: '{colors.line}'
  panel-interactive:
    hover-border-color: '{colors.brand-fill}'
    transition: 150ms
  panel-brand:
    border-color: '{colors.brand-fill}'
  panel-ok:
    border-color: '{colors.ok-fill}'
  panel-warn:
    border-color: '{colors.warn-fill}'
  panel-danger:
    border-color: '{colors.danger-fill}'
  indicator:
    label: '{typography.eyebrow}'
    label-color: '{colors.mute}'
    value: '{typography.stat-value}'
    value-color: '{colors.ink}'
    note: '{typography.caption}'
    grid-gap: '{spacing.indicator-grid-gap}'
  table:
    header: '{typography.eyebrow}'
    header-color: '{colors.mute}'
    header-divider: '{colors.line}'
    row-divider: '{colors.line2}'
    row-hover-background: '{colors.line2}'
    cell-padding-y: '{spacing.table-cell-y}'
    cell-padding-x: '{spacing.table-cell-x}'
    number-cell: '{typography.numeric}'
  expandable-row:
    open-background: '{colors.line2}'
    detail-divider: '{colors.line}'
    trigger-min-height: '{spacing.touch-target}'
    chevron-size: 16px
    chevron-open-rotation: 90deg
  button:
    min-height: '{spacing.touch-target}'
    radius: '{rounded.md}'
    padding: '8px 16px'
    typography: '{typography.body}, medium'
    primary-background: '{colors.ink}'
    primary-color: '{colors.page}'
    secondary-border: '{colors.line}'
    secondary-background: '{colors.page}'
    secondary-color: '{colors.ink}'
    hover-background: '{colors.line2}'
  link:
    color: '{colors.brand-text}'
    decoration: underline
    underline-offset: 2px
    focus: '{colors.focus-ring}'
  list:
    marker: none
    text-flow-marker: disc
    item-gap: 4px
  alert-box:
    border-width: '0 0 0 3px'
    radius: '{rounded.none}'
    padding: '12px 16px'
    background: '{colors.brand-fill}, {colors.warn-fill}, {colors.danger-fill} ou {colors.ok-fill} a 15%, conforme o tipo'
    title: '{typography.body}, semibold, {colors.ink}'
    body: '{typography.body}'
    body-color: '{colors.ink}'
    icon-size: 16px
  section-header:
    top-rule: '2px {colors.ink}'
    padding-top: 16px
    padding-bottom: 20px
    eyebrow: '{typography.eyebrow}'
    title: '{typography.h2}'
    description: '{typography.body}'
    description-color: '{colors.mute}'
    description-gap: 6px
  section:
    block-gap: '{spacing.section-gap}'
    heading-gap: '{spacing.section-heading-gap}'
---

## Brand & Style

Este documento não define uma identidade nova. Ele fixa **como os elementos HTML base se parecem em todas as páginas** do portal, usando a paleta, as fontes e o tema claro/escuro que já existem em `apps/web/app/globals.css`. O tom é cívico e sóbrio, de documento público: títulos em serifa, interface em sans, sem sombras e sem gradientes.

O princípio é o de **três camadas**:

1. **Elemento nu.** `h1`–`h4`, `p`, `dl`/`dt`/`dd`, `table`/`th`/`td`, `ul`/`ol` e `a` já nascem estilizados em `@layer base`. Uma página que usa o elemento sem classe já está no padrão.
2. **Papel visual nomeado pelo papel, não pelo elemento.** `eyebrow`, `caption`, `lead`, `numeric`, `stat-value`, `display`, `panel`, `section`, `list-text`. Definidos com `@utility` (Tailwind 4), funcionam em qualquer tag, aceitam variantes (`md:`, `dark:`) e podem ser sobrescritos por classe do Tailwind. Nunca nomear por elemento (proibido `h2-eyebrow`).
3. **Bloco composto como componente** em `packages/ui`, montado só com elementos base e papéis (por exemplo `indicator` dentro de `panel`).

Nomes de componentes e de papéis são **sempre em inglês** e iguais em todo o spec e no código. O texto exibido ao cidadão segue o vocabulário da regra 24 do projeto.

**Referência visual.** O mock [`mock-painel-tabela.html`](./_bmad-output/planning-artifacts/ux-designs/ux-transparencia-2026-10-29/.working/mock-painel-tabela.html) ilustra os três formatos de `panel` (borda lateral, total e no topo), os tons, o `indicator`, a `table` e o `expandable-row`, nos temas claro e escuro. É material de rascunho: se for removido, este spec continua valendo. Em conflito com o mock, **este documento e o `EXPERIENCE.md` vencem**.

## Colors

Nenhuma cor nova. Tudo vem dos tokens existentes, e o tema escuro (`.dark`) já os redefine.

- **Texto principal:** `{colors.ink}`. **Texto secundário:** `{colors.mute}`. Os papéis `eyebrow`, `caption` e cabeçalho de `table` usam `{colors.mute}`.
- **Divisórias:** `{colors.line}` (cabeçalho de `table`, borda neutra de `panel`) e `{colors.line2}` (linhas do corpo, hover).
- **Links no texto:** `{colors.brand-text}`. **Foco:** `{colors.focus-ring}`.
- **Tom semântico:** borda e preenchimento usam `-fill`; texto colorido usa `-text`. Nunca `text-ok`, `bg-warn` e similares sem sufixo (a story 20-12 já tem teste de guarda).
- **Proibido** em UI: `slate-*`, `gray-*`, `black`, `white`, `red-500` e qualquer cor de paleta do Tailwind fora dos tokens. Isenção só para e-mails, imagens OG, séries de gráfico e Leaflet.

**Contraste.** Alvo AA: 4,5:1 para texto e 3:1 para o anel de foco e para ícones. As combinações abaixo valem nos **dois temas** (`{colors.ink-dark}` etc. sobre `{colors.page-dark}` e `{colors.line2-dark}`) e `apps/web/styles/tokens-contraste.spec.ts` deve cobri-las:

| Texto ou elemento | Fundo |
|---|---|
| `{colors.ink}` | `{colors.page}` e `{colors.line2}` (hover, linha aberta) |
| `{colors.mute}` | `{colors.page}` e `{colors.line2}` (hover de `table`, `expandable-row` aberta) |
| `{colors.brand-text}` | `{colors.page}` e `{colors.line2}` (link no detalhe aberto) |
| `{colors.ok-text}`, `{colors.warn-text}`, `{colors.danger-text}` | `{colors.page}` e `{colors.line2}` (valor ou situação em linha com hover ou aberta) |
| `{colors.focus-ring}` (3:1) | `{colors.page}` e `{colors.line2}` |

Bordas e divisórias (`-fill`, `line`, `line2`) são decorativas: não substituem texto nem carregam sozinhas o significado.

## Typography

Três famílias, cada uma com um papel:

- **`font-serif` (Source Serif 4):** `h1`–`h4`, `display` e todos os `stat-value`. Só aí.
- **`font-sans` (IBM Plex Sans):** parágrafo, rótulos, links, interface.
- **`font-mono` (IBM Plex Mono):** só em `table` e no papel `numeric`. Não aparece em `panel`. **A fonte ainda não é carregada pelo app** (`globals.css` só define Plex Sans e Source Serif): faz parte da fundação carregá-la com `next/font` e expô-la como `--font-mono` em `@theme inline`.

**Escala de títulos.** O tamanho vem do elemento, sem classe. Mobile / a partir de `md`:

| Elemento | Mobile | ≥ `md` | Peso | Uso |
|---|---|---|---|---|
| `h1` | `text-2xl` | `text-3xl` | bold | título da página |
| `h2` | `text-xl` | `text-2xl` | bold | seção principal |
| `h3` | `text-lg` | `text-xl` | semibold | subseção, título de `panel` |
| `h4` | `text-base` | `text-lg` | semibold | título de card |

`h5` e `h6` são **proibidos**. Se parecer necessário, o nível está errado: usar `eyebrow`. Todos em `{colors.ink}`.

**Corpo.** `p`: `{typography.body}` no mobile, `{typography.body-md}` em `md`, `{colors.ink}` (corpo) ou `{colors.mute}` (secundário).

**Papéis de texto** (todos listados na tabela de papéis em Components):
- `eyebrow` (`{typography.eyebrow}`, caixa alta, `{colors.mute}`): substitui `h5`/`h6`, rotula `dt` e `th`.
- `caption` (`{typography.caption}`, `{colors.mute}`): nota ao lado de um valor (variação, fonte, "vs. ano anterior").
- `lead`: parágrafo de abertura, `{colors.mute}`, largura máxima de 65 caracteres.
- `display` (`{typography.display}` / `{typography.display-md}`): título de página maior que o `h1` (landing, termos, privacidade). Continua sendo `<h1>` na semântica; o tamanho vem do papel.

**Valores (indicadores).** O valor **não é título**: o `h1` nunca cresce para acomodá-lo.

| Papel | Mobile | ≥ `md` | Uso |
|---|---|---|---|
| `stat-value-sm` | `text-xl` | `text-2xl` | painéis densos |
| `stat-value` | `text-2xl` | `text-3xl` | padrão dos painéis |
| `stat-value-lg` | `text-5xl` | `text-6xl` | um valor principal por página (hero) |

Todos: serif, bold, `tabular-nums`, `{colors.ink}`. `stat-value-lg` com `leading-none`. A cor muda **só** para tom semântico (`-text`). Não há variante em cor de marca.

**Números em tabela.** Papel `numeric` (`{typography.numeric}`): `text-right`, `tabular-nums`, sem quebra de linha. Aplicado no `th` e no `td` numéricos.

## Layout & Spacing

**Elementos base têm margem zero.** O espaço é sempre do contêiner (`space-y-*`, `gap-*`). Isso evita `mt-0` e `-mt-2` espalhados.

- **`section`** é o papel de ritmo, sem moldura: `{spacing.section-gap}` entre blocos e `{spacing.section-heading-gap}` entre título e conteúdo. É o único lugar com regra de espaçamento vertical.
- **Texto corrido** (termos, privacidade): contêiner com `{spacing.text-flow-gap}` entre parágrafos. Sem `@tailwindcss/typography`.
- **Grade de indicadores:** `dl` em grade com `{spacing.indicator-grid-gap}`, colunas conforme a largura (`auto-fit`, mínimo `13rem`). Cada indicador é `div > dt + dd`.
- **Gutter mínimo** de 16px em todas as larguras.
- **`table`:** células com `{spacing.table-cell-y}` e `{spacing.table-cell-x}`. A tabela nua rola na horizontal (`overflow-x-auto`); o comportamento mobile do `DenseTable` não muda.
- **Alvos interativos:** no mínimo `{spacing.touch-target}` de altura.

## Elevation & Depth

**Sem sombras.** A hierarquia vem de borda, espaçamento e tipografia. `--panel-shadow` existe com valor `none`, para o caso de uma decisão futura.

## Shapes

O padrão inicial do `panel` é **sem arredondamento** (borda lateral). O raio entra pela variável `--panel-radius` se o formato mudar. `table` e linhas sem raio. **Controles têm leve arredondamento** (`rounded-md`, `{rounded.md}`): botões (ver `button`), campos e seletores. Blocos de conteúdo (`panel`, `alert-box`, `table`) e dados (barras) continuam quadrados.

**Barras de progresso e comparação são quadradas**: trilho `bg-track` de `h-3` com preenchimento `bg-*-fill`, sem `rounded-*` no trilho nem no preenchimento. Barra é dado, não controle: o raio é reservado a controles e a camadas flutuantes. A ponta reta mostra com precisão onde o valor termina; com cantos arredondados, valores pequenos viram uma bolinha. Com marcador de mínimo ou meta, use `ThresholdMeter` (`packages/ui`, trilho `h-3.5`). Referência: `decimo-terceiro-card.tsx` e o hero de saúde.

**Marcador vertical de barra** (mínimo, teto, meta, média ou o próprio valor sobre uma escala de faixas): sempre o `MeterMarker` (`packages/ui`). Traço de 4px (`w-1`), centrado na posição (`-translate-x-1/2`), passando 2px acima e abaixo do trilho; `ink` para a referência principal e `warn` para a segunda (média do estado, limite prudencial). Proibido desenhar marcador à mão, com outra largura ou outra cor. Referência: o termômetro de "Outros" em despesas.

**Barra segmentada** (proporção por situação, como as obras da home): `flex h-3 gap-px` sobre `bg-track`, cada parte com `bg-*-fill` e largura por `flex-grow`, para o `gap-px` não estourar a largura. O total é a **soma das partes desenhadas**: toda parte da barra tem item na legenda, nunca sobra trilho sem status. Partes em ordem de sentido (o ciclo da obra: concluídas, em andamento, paradas, não iniciadas), com `faint` para a parte neutra ("não iniciadas"). Referência: `situacao-cidade-section.tsx`.

## Components

Nomes iguais ao `EXPERIENCE.md > Component Patterns` e ao código.

### `panel`

Bloco destacado (indicador, alerta, hero). O formato **não é fixo**: é lido de variáveis CSS definidas uma vez em `:root`.

```css
--panel-border-width: 0 0 0 3px;   /* padrão inicial: só a esquerda */
--panel-radius: 0;
--panel-shadow: none;
--panel-padding: 0.25rem 0 0.25rem 1rem;
```

- Trocar o formato do portal inteiro é editar essas variáveis em `globals.css`. Nenhuma página muda.
- Trocar uma instância (o hero, por exemplo) é sobrescrever por classe do Tailwind (`panel rounded-md border`).
- **Tom da borda** por classe: `panel-brand`, `panel-ok`, `panel-warn`, `panel-danger` (tokens `-fill`). O padrão é `{colors.line}`.
- Formatos validados no mock: borda lateral (padrão), borda total com leve arredondado e borda no topo.
- **Borda no topo:** classe `panel-top` (`3px` só em cima, recuo vertical em vez de lateral). Usar em grades de blocos lado a lado, como os cards de categoria de uma seção.
- **`panel` clicável (`panel-interactive`):** o bloco inteiro é um `button` ou `a`. Regra única: `cursor-pointer`; no hover e no foco por teclado a borda passa de `{colors.line}` para `{colors.brand-fill}` (transição de 150ms) e o foco mostra o anel de `{colors.focus-ring}`; bloco desabilitado (`aria-disabled="true"`) mantém a borda neutra e `cursor-default`. O estado nunca depende só da cor: o bloco traz um texto de ação ("16 contratos ›"). Sem sombra e sem mudança de fundo. Combina com `panel-top` e com os tons.

### `indicator`

Estrutura `dl > div > dt + dd` dentro de `panel`.
- `dt`: `{typography.eyebrow}`. `dd` do valor: `{typography.stat-value}` (ou `-sm` / `-lg`). Nota: `dd` com `{typography.caption}`.
- **Um tamanho de valor por painel.** O destaque vem de posição e grade, não de tamanho de fonte.
- Cor do valor: `{colors.ink}`; tom semântico só por `{colors.ok-text}`, `{colors.warn-text}`, `{colors.danger-text}`.

### `table`

Vale para o `table` nu e para o `DenseTable`, que só acrescenta comportamento (busca, ordenação, exportação).
- `thead th`: `{typography.eyebrow}`, `text-left`, divisória `{colors.line}`, sem quebra de linha.
- `tbody tr`: divisória `{colors.line2}`, **sem zebra**, hover `{colors.line2}`.
- `td`: `{spacing.table-cell-y}` / `{spacing.table-cell-x}`, `{colors.ink}`. Célula numérica: papel `numeric`.
- `tfoot td`: semibold, divisória superior `{colors.line}` (totais).

### `expandable-row`

- Linha de detalhe logo abaixo, com `colspan` total. Linha aberta com fundo `{colors.line2}`; detalhe sem fundo e com divisória `{colors.line}`.
- Gatilho: botão na primeira célula com chevron (`16px`, gira 90° ao abrir), altura mínima `{spacing.touch-target}`.
- O conteúdo aberto reutiliza `panel` e `indicator`: sem estilo novo.
- **Ação "Ver detalhes"** no fim do detalhe: estilo de `link` (`{colors.brand-text}`, sublinhado), altura mínima `{spacing.touch-target}`, alinhada à esquerda sob o `indicator`. Abre o `ModalDialog`.

### `button`

Ação do cidadão (copiar, compartilhar, ativar, filtrar). Em `packages/ui` (`Button`); nenhuma tela escreve `<button>` com classes próprias.
- **Forma:** altura mínima `{spacing.touch-target}`, `{rounded.md}`, recuo `8px 16px`, `{typography.body}` em medium, ícone de 16px com `gap-2`. Sem sombra.
- **Variantes:** `primary` (fundo `{colors.ink}`, texto invertido) para a ação principal da área, **uma por bloco**; `secondary` (borda `{colors.line}`, fundo `{colors.page}`, texto `{colors.ink}`, hover `{colors.line2}`) para as demais.
- **Estados:** `cursor-pointer` sempre; desabilitado com `cursor-default` e opacidade 50%; foco visível com contorno de `{colors.focus-ring}` e recuo de 2px. Confirmação ("Copiado") troca o rótulo e o ícone, nunca só a cor.
- **Rótulo:** verbo curto no infinitivo ("Copiar texto", "Compartilhar"), sem repetir o assunto da seção. O contexto longo vai no `aria-label`.
- **Controle segmentado** (filtro por situação, tema claro/escuro): mesma forma e raio; o item ativo usa o fundo da variante `primary`.
- **Não é link:** navegação e ação dentro de texto continuam `link`.

### `link` e `list`

- `link` no texto: `{colors.brand-text}`, sublinhado, `underline-offset-2`. **Link para lei ou norma** (regra 20): o mesmo estilo mais o ícone `ExternalLink` ao lado do texto. Links de navegação e de ação (botões, itens de menu) **não** usam o estilo base: são componentes.
- `list` (`ul`/`ol`): sem marcador por padrão. Texto corrido com marcador: papel `list-text` (`disc`, recuo, `{components.list.item-gap}` entre itens).
- Foco visível global em todo elemento interativo: anel de `{colors.focus-ring}`.

### `alert-box`

Aviso dentro de uma página, em `packages/ui` (`AlertBox`). Usa a mesma linguagem do `panel`: borda lateral de 3px, sem raio e sem sombra.
- **Tipo e cor:** `info` (`{colors.brand-fill}`), `warning` (`{colors.warn-fill}`), `danger` (`{colors.danger-fill}`) e `success` (`{colors.ok-fill}`). A borda usa `-fill`, o fundo é o mesmo `-fill` a 15% e o ícone usa `-text`. O tipo `warning` só entra quando o cidadão precisa agir ou desconfiar de algo comprovado; dado que pode estar desatualizado na fonte é `info`.
- **Texto:** tudo em `{typography.body}` de 14px, `{colors.ink}`, também a partir de `md`. O título **não é um título da escala**: é um parágrafo em semibold (sem `h4`, para não herdar 16–18px serif). Ícone de 16px.
- **Conteúdo curto:** título de poucas palavras e corpo de até duas frases. O que passar disso vira texto da seção, não do aviso.
- **Não repetir:** o aviso não reescreve o que os indicadores logo abaixo já mostram.

### `badge`

Etiqueta de situação ou de atenção, em `packages/ui` (`Badge`). Toda etiqueta do portal usa este componente; não montar `<span>` com borda e fundo na mão.
- **Forma:** borda de 1px, raio `rounded-sm`, `px-2 py-0.5`, texto de 11px. A borda é o `-text` a 40% e o fundo é o `-fill` a 10%.
- **Variante e uso:** `default` (situação neutra: encerrada, não informada), `accent` (destaque informativo da marca), `warning` (pede o olhar do cidadão: em andamento, "Merece atenção"), `danger` (problema comprovado: limite descumprido, obra paralisada) e `success` (desfecho positivo ou exigência cumprida).
- **Motivo junto:** `warning` e `danger` nunca aparecem sozinhos; o motivo fica escrito no bloco.

### `section-header`

Cabeçalho de seção, em `packages/ui` (`SectionHeader`): filete de 2px `{colors.ink}` no topo, `eyebrow` opcional, título no nível `h2` (aceita `h1` e `h3`), ação à direita e descrição.
- **Descrição:** `{typography.body}` de 14px em `{colors.mute}`, **a 6px do título e na largura inteira do contêiner**, dentro do próprio cabeçalho. É o único lugar do subtítulo de seção: nunca um parágrafo solto (`p` ou `lead`) abaixo do cabeçalho, que o afasta do título.
- **Eyebrow:** escopo ou contagem da seção ("18 emendas · exercício 2026"), nunca um selo.
- **Ação:** link curto à direita do título, sem botão. Com `eyebrow`, a ação é compacta e fica na linha do título.
- O espaço do cabeçalho até o primeiro bloco é do contêiner (`section`).

### `collapsible-section`

`CollapsibleSection` em `packages/ui`: mesma abertura do `section-header` (filete de 2px `{colors.ink}` no topo e título `h2` serifado), com chevron de 16px à esquerda e o resumo numérico logo abaixo do título em `{typography.body}` de 14px, `{colors.mute}`. A área do `summary` tem 44px de altura mínima e usa o `{colors.focus-ring}` no foco. O corpo aberto mantém o ritmo da `section`.

### `ModalDialog`

O detalhamento completo abre em `ModalDialog` do design system (regra 24). Este spec não altera o `ModalDialog`; só exige que o conteúdo use os elementos base e papéis.

### Papéis

| Papel | O que faz | Onde se aplica |
|---|---|---|
| `eyebrow` | rótulo pequeno, caixa alta | `dt`, `th`, no lugar de `h5`/`h6` |
| `caption` | nota secundária | ao lado de valores |
| `lead` | parágrafo de abertura | início de seção |
| `display` | título de página maior | `h1` de landing/termos/privacidade |
| `stat-value`, `-sm`, `-lg` | valor de indicador | `dd` de `indicator` |
| `numeric` | número alinhado em mono | `th`/`td` numéricos |
| `panel` (+ tons) | bloco destacado | indicador, alerta, hero |
| `section` | ritmo vertical, sem moldura | blocos de página |
| `alert-box` | aviso com borda lateral e tom | dentro de uma seção, antes dos indicadores |
| `section-header` | filete, título, descrição e ação | abertura de toda seção |
| `button` | ação do cidadão | copiar, compartilhar, ativar |
| `list-text` | lista com marcador em texto corrido | termos, privacidade |

**Eyebrow de página:** o rótulo acima do `h1` usa sempre o componente `PageEyebrow` (`apps/web/components/page-eyebrow.tsx`): papel `eyebrow` em `{colors.brand-text}`, texto escrito em caixa normal (o papel põe em caixa alta) e o bloco do topo em `space-y-2` (eyebrow, `h1`, descrição). Nas páginas administrativas o texto é "Administrativo · Exercício {ano}", com "(parcial, {período})" no ano em andamento; nunca "Ano". Páginas temáticas (Saúde, Educação, Previdência, Obras, Farmácia) não têm eyebrow. Proibido montar o eyebrow com classes soltas (`text-xs uppercase tracking-wider`).

## Do's and Don'ts

- **Do** usar o elemento sem classe de tamanho. Para `h1`–`h4`, o tamanho vem do elemento.
- **Do** escolher o nível do título pela estrutura da página, nunca pelo tamanho que ele tem. Precisa do visual de outro nível: usar um papel.
- **Do** nomear papéis e componentes em inglês, pelo papel (`eyebrow`, `stat-value`), nunca pelo elemento (`h2-eyebrow`).
- **Do** usar os tokens `-fill` em bordas e `-text` em texto.
- **Don't** usar `h5`/`h6`, `slate-*`, `gray-*`, `text-black`/`text-white`.
- **Don't** usar `font-mono` fora de `table` e `numeric`.
- **Don't** aplicar tamanho de fonte por classe em `h1`–`h4`.
- **Don't** dar margem aos elementos base. Espaço é do contêiner.
- **Don't** usar sombra, zebra em tabela ou `@tailwindcss/typography`.
- **Don't** arredondar barras de progresso ou de comparação.
- **Don't** escrever `<button>` com classes soltas: usar `Button` (`rounded-md`, `min-h-11`, `cursor-pointer`).
- **Don't** escrever o subtítulo da seção como parágrafo solto: use a descrição do `section-header`.
- **Don't** usar `h4` como título de `alert-box` nem passar de duas frases no corpo.
- **Don't** crescer o `h1` para acomodar um valor grande: usar `stat-value-lg`.
- **Do** manter o `h1` e o eyebrow das páginas de tema (`/saude`, `/educacao`, `/previdencia`) sem ano. O escopo vai no título de cada bloco: exercício ("O que entrou em {ano}"), série ("Como mudou ao longo dos anos ({anoMin}–{anoMax})", só o ano quando há um) ou retrato atual ("... hoje", com a data da coleta). O ano vem do parâmetro ou dos dados, nunca de literal.
