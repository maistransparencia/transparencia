---
name: Portal Transparência — Comportamento dos Padrões Base
description: Como os elementos base, os papéis e o painel se comportam, como são aplicados e como são verificados nas páginas do portal. A aparência está em DESIGN.md.
status: final
updated: 2026-11-04
design: ./DESIGN.md
sources:
  - apps/web/app/globals.css
  - packages/ui/src/components/dense-table.tsx
  - .claude/rules/web.md
  - apps/web/styles/tokens-contraste.spec.ts
  - apps/web/styles/tokens-uso.spec.ts
---

# Padrões Base — Experience Spine

> Aparência: [`DESIGN.md`](./DESIGN.md) (por exemplo `{components.panel}`, `{components.indicator}`, `{typography.eyebrow}`, `{colors.focus-ring}`). Este documento cobre comportamento, aplicação e verificação. Em conflito com qualquer mock, os dois spines vencem. Mock de referência (rascunho; se for removido, o spec continua valendo): [`mock-painel-tabela.html`](./_bmad-output/planning-artifacts/ux-designs/ux-transparencia-2026-10-29/.working/mock-painel-tabela.html).

## Foundation

- **Superfície:** web responsiva (mobile primeiro), Next.js 16 + React 19, Tailwind 4.3.3 sem `tailwind.config`. A configuração vive em `apps/web/app/globals.css` (`@layer base`, `@utility`, `@theme inline`).
- **Sistema de UI:** o do próprio portal (`packages/ui` + tokens existentes). Este spec **estende**, não substitui. `DESIGN.md` é a referência visual.
- **Temas:** claro em `:root`, escuro em `.dark`. Tudo aqui funciona nos dois temas sem regra extra, porque só usa tokens.
- **Multi-tenant:** nenhum padrão depende de município, UF ou período. Títulos e rótulos vêm de dados, nunca de literais.
- **Pré-requisito de fonte:** `IBM Plex Mono` (papel `numeric`) ainda não é carregada pelo app; a fundação a carrega e expõe como `--font-mono`.

**Glossário** (os mesmos nomes em todo o spec e no código):

| Termo | Significado |
|---|---|
| `panel` | bloco destacado com borda (formato por variável CSS) |
| `indicator` | um par rótulo/valor (`dt` + `dd`) dentro de um `panel` |
| hero | o `panel` principal da página, com um `stat-value-lg` |
| `stat-value` | o papel tipográfico do valor de um `indicator` (três tamanhos) |
| `expandable-row` | linha de `table` que abre o detalhe logo abaixo |
| `numeric` | papel de número alinhado em fonte mono, em `table` |

## Information Architecture

Este spec não cria páginas. Ele define **a anatomia que toda página deve seguir**:

1. `h1` (ou `display`) com o nome da página. Exatamente um por página.
2. Blocos em `section`, cada um com `h2`. Subseções com `h3`.
3. Dentro do bloco: `panel` com `indicator`, `table`, texto. Título de `panel` é `h3`; título de card é `h4`.
4. Níveis não se pulam (`h2` → `h4` é erro). Sem `h5`/`h6`.

**Quem usa o quê:**
- Valores principais (home, despesas, receitas, saúde, previdência): `panel` + `indicator`.
- Listas e tabelas (licitações, contratos, pessoal): `table` ou `DenseTable`; com detalhe inline, `expandable-row`.
- Textos longos (termos, privacidade): `display` + contêiner de texto corrido.

## Voice and Tone

A voz do portal continua a da regra 24: simples, direta, sem termos exóticos. Neste spec vale:
- Rótulo de `indicator` (`dt`): nome que o cidadão reconhece, curto, sem sigla opaca. Caixa alta só pelo estilo `eyebrow`, nunca digitada em maiúsculas.
- Nota de valor (`caption`): diz de onde vem o número ("73% da previsão anual"), sem jargão contábil sem explicação.
- Códigos fixos (`sem_licitacao`) são traduzidos só na UI, nunca exibidos crus.
- Textos de detalhe, ações e janelas seguem os rótulos da regra 24 ("Ver detalhes", "Detalhes da Licitação").

## Component Patterns

**Escopo temporal no título do bloco.** O seletor "Exercício" do cabeçalho é global e sincroniza `?ano=`; o título da página não leva o ano. Todo bloco declara no próprio título de que período é: do exercício (usa o ano ativo), série histórica (período calculado dos pontos reais) ou retrato atual ("hoje", com a data da coleta). Quando o topo mistura os dois, separa em grupos com eyebrow ("Exercício {ano}" e "Hoje"), para o seletor não parecer controlar tudo. Helpers em `apps/web/lib/escopo-bloco.ts`.

Nomes iguais aos de `DESIGN.md > Components`.

**`panel` / `indicator`.** Estrutura obrigatória `dl > div > dt + dd`. Um tamanho de valor por `panel`. Um `stat-value-lg` por página, no hero.

**`panel` clicável.** `panel-interactive` (botão ou link no bloco todo): `cursor-pointer`, borda `line` → `brand-fill` no hover e no foco, anel de foco visível, ação escrita no bloco ("16 contratos ›"), 44px de altura mínima. Desabilitado: `aria-disabled`, borda neutra, sem hover. Detalhes visuais em `DESIGN.md > panel`.

**Troca de formato do `panel`.** Mudar o formato é editar `--panel-*` em `globals.css`. Se uma página precisa fugir do padrão, sobrescreve por classe do Tailwind no próprio elemento, e a exceção é revisada no code review. Padrão inicial: borda lateral.

**`table`.** `table` nu e `DenseTable` compartilham os estilos de elemento. `DenseTable` mantém seu comportamento mobile e seus controles; a tabela nua só rola na horizontal.

**`expandable-row`.**
- Clique ou toque na linha, no botão ou no chevron abre e fecha o detalhe logo abaixo.
- O gatilho é um `<button>` na primeira célula com `aria-expanded` e `aria-controls` apontando para a linha de detalhe, que usa `hidden` quando fechada. **Só o botão recebe foco**; a linha inteira clicável é uma conveniência de ponteiro.
- O clique no botão não dispara o clique da linha duas vezes (`stopPropagation`).
- Vários itens podem ficar abertos ao mesmo tempo (não é accordion exclusivo).
- O detalhe inline mostra um **resumo** de 3 a 4 campos e termina com a ação **"Ver detalhes"** (um `<button>` com estilo de `link`), que abre o `ModalDialog` com deep link (regra 24). O foco vai para o modal e volta ao botão ao fechar. Abrir o modal não fecha a linha.

**`section`.** Agrupa um bloco da página com seu `h2` (ou `h3`) e dá o ritmo vertical. Não tem moldura nem comportamento. Cada `section` tem título; blocos sem título usam `div`.

**`collapsible-section`.** Seção recolhida por padrão, em `packages/ui` (`CollapsibleSection`), para material de especialista (emendas, contratos, fornecedores) agrupado no fim da página.
- Estrutura `section#id > details > summary`: o `summary` traz o título (`h2`) e o **resumo com número**, sempre visível (os números são calculados em `@transparencia/db`; a página só os junta ao texto); o corpo traz o conteúdo da seção sem alteração.
- Teclado e leitor de tela vêm do `details` nativo: `Enter`/`Espaço` abre e fecha, e o estado é anunciado. Chevron gira ao abrir (respeita `prefers-reduced-motion`). Vários podem ficar abertos.
- **Abre sozinha** quando a URL aponta para ela (`#id`, inclusive ao mudar o hash) ou quando a página recebe um deep link para um item dentro dela (`?contratoNumero=`, via `defaultOpen`). **A impressão abre tudo** (`beforeprint`).
- Nenhuma informação sai: só mudam posição e estado inicial. Sem sigla nem número no título.

**`ModalDialog`.** Componente existente do design system (regra 24), usado para o detalhamento completo. Este spec não o altera: o conteúdo interno segue os elementos base e papéis, e o título do modal é um `h2`.

**`link`.** No texto corre o estilo base. Link para lei ou norma segue a regra 20: `target="_blank"`, `rel="noopener noreferrer"` e ícone `ExternalLink`. Links de navegação e de ação são componentes, não usam o estilo base.

**`list`.** Sem marcador por padrão; texto corrido com marcador usa `list-text`.

## State Patterns

| Estado | `panel` / `indicator` | `table` | `expandable-row` |
|---|---|---|---|
| Carregando | espaço reservado com a altura do valor (sem salto de layout) | linhas de esqueleto, mesmo número de colunas | detalhe com esqueleto, gatilho já ativo |
| Vazio | rótulo visível e valor "—" com `caption` explicando a causa | mensagem curta no corpo, cabeçalho mantido | mensagem "sem dados" dentro do detalhe |
| Erro | `panel-danger` com mensagem e ação "Tentar novamente" | idem, no lugar do corpo | erro dentro do detalhe, a linha continua visível |
| Alerta | `panel-warn` / `panel-danger` + valor no tom `-text` | célula colorida só pelo token `-text` | — |
| Fechada / aberta | — | — | chevron para a direita / para baixo; fundo `{colors.line2}` quando aberta |
| Foco | anel `{colors.focus-ring}` em todo interativo | idem | no botão da primeira célula |

Estado nunca é comunicado só por cor: sempre há texto ou ícone junto.

**Fora do escopo deste spec:** busca sem resultados e ordenação ativa do `DenseTable` ficam com o comportamento atual do componente, que não é alterado aqui.

## Interaction Primitives

- **Clique/toque:** `expandable-row`, ordenação de cabeçalho (`DenseTable`), links. Alvo mínimo `{spacing.touch-target}`.
- **Teclado:** `Tab` percorre gatilhos; `Enter`/`Espaço` abre e fecha a `expandable-row`; foco sempre visível.
- **Hover:** fundo `{colors.line2}` em linha de `table`. Sem efeito que mude o layout.
- **Movimento:** só o giro do chevron (curto). Respeitar `prefers-reduced-motion`.
- **Deep link:** inalterado (regra 24). Abrir uma `expandable-row` **não** altera a URL.

## Accessibility Floor

- Hierarquia de títulos sem saltos, um `h1` por página. Nível escolhido pela estrutura, nunca pelo tamanho.
- `dl`/`dt`/`dd` para pares rótulo/valor; `th` com `scope`; `caption` ou `aria-label` em tabela quando o título não está adjacente.
- Contraste AA (4,5:1) nas combinações listadas em `DESIGN.md > Colors`, cobertas por `tokens-contraste.spec.ts`. Nada de cor fora dos tokens.
- Cor nunca é o único sinal. Texto de apoio junto de qualquer tom semântico.
- Foco visível global. Alvos de 44px. `expandable-row` anuncia aberto/fechado.
- Respeitar `prefers-reduced-motion` e o modo de alto contraste do sistema (`forced-colors`): bordas de `panel` e divisórias de `table` não podem sumir; usar `border` real, não só fundo.
- Valor ausente ("—") traz sempre uma nota com a causa (sem dados no período, ainda não divulgado).
- Texto corrido com largura máxima de ~65 caracteres.

## Responsive & Platform

- Mobile primeiro. Valores e títulos têm duas medidas: base e `md`.
- Grade de `indicator` quebra para uma coluna em telas estreitas (`auto-fit`, mínimo `13rem`).
- `table` nua: rolagem horizontal contida na própria tabela; a página nunca rola na horizontal.
- `DenseTable`: comportamento mobile atual. A estratégia de exibir dados em cards está sendo substituída por exibição compacta; este spec não decide isso.

## Verificação visual

- **Storybook:** em `apps/storybook`, importando o mesmo `globals.css` do `apps/web`, com alternador claro/escuro e viewport mobile/desktop. A fase 1 cobre elementos base, papéis, `panel`, `indicator`, `table` e `expandable-row`. A publicação em `storybook.maistransparencia.com` e as stories dos demais componentes ficam para uma fase posterior.
- **Primeiro caso de teste:** o valor da despesa em `stat-value-lg`. Verificar `tabular-nums` e o espaçamento de "R$" e da vírgula no Source Serif. Resultado (Story 20.16, 2026-10-30): sem estranheza nos dois temas e nas duas larguras; `stat-value-lg` permanece em serifa.

## Guardas de teste

Estilo de `apps/web/styles/tokens-uso.spec.ts`, ativas desde o início:
- proibir `slate-*`/`gray-*`/`black`/`white`;
- proibir tamanho de fonte por classe em `h1`–`h4`;
- proibir `<h5>` e `<h6>`;
- proibir `font-mono` fora de `table` e `numeric`.

**Isenções, em duas listas explícitas.** *Temporária* (páginas e modais ainda não migrados): só pode diminuir. *Permanente*: e-mails (`radar-digest`), imagens OG, cores de série de gráficos e mapa Leaflet. A ordem de migração e o desacoplamento do Next em `packages/ui` ficam no épico e na arquitetura, não aqui.

## Key Flows

**1. Marina confere a despesa do mês no celular.** Marina, 34, professora municipal, abre a página de despesas no ônibus.
1. Vê o `h1` "Despesas" e logo abaixo o hero (`panel` com `stat-value-lg`).
2. Rola e encontra três `indicator` em `panel`, cada um com rótulo em caixa alta e nota de origem.
3. Chega à `table` de contratos, que rola na horizontal dentro da própria tabela.
4. Toca na linha de um contrato e o resumo abre logo abaixo (`expandable-row`).
5. **Clímax:** a página não rola na horizontal, o valor principal aparece inteiro, sem truncar, e o resumo aberto cabe na tela.
6. *Falha:* a conexão cai ao abrir o detalhe. O resumo mostra a mensagem de erro com "Tentar novamente", a linha continua visível e o restante da página não muda.

**2. Rodrigo, vereador, compara licitações em andamento no desktop.** Rodrigo, 52, prepara uma pergunta para a sessão.
1. Abre a página de licitações e vê a `table` com cabeçalho discreto e valores alinhados à direita.
2. Abre duas linhas ao mesmo tempo para comparar objeto e órgão. Usa o teclado: `Tab` até o gatilho, `Enter` para abrir.
3. **Clímax:** os dois resumos ficam abertos lado a lado na leitura, com a mesma estrutura de `indicator`.
4. Clica em "Ver detalhes" em uma delas e abre o `ModalDialog` completo.
5. *Falha:* uma das licitações não tem dados no período. O detalhe mostra "—" com a causa e a outra linha segue normal.

**3. Julio altera o formato do `panel`.** Julio, mantenedor, decide testar painel com borda total.
1. Abre o Storybook e vê o `panel` nos dois formatos, nos temas claro e escuro.
2. Edita as variáveis `--panel-*` em `globals.css`.
3. **Clímax:** todas as páginas migradas mudam juntas, sem tocar em nenhum componente.
4. *Falha:* uma página tem `text-slate-900` esquecido. O guarda de teste fica vermelho e aponta o arquivo, antes de chegar à revisão.

## Open Questions

- `[NOTE FOR UX]` O resumo inline da `expandable-row` é sempre menor que o `ModalDialog`? Fecha na story de licitações, antes de aplicar o padrão em contratos.
- `[RESOLVIDO]` `stat-value-lg` em serifa: validado na Story 20.16 (`tabular-nums` e "R$"), sem ajuste.
- `[ASSUMPTION]` Estados de carregando, vazio e erro seguem o que o `DenseTable` já faz; revisar na primeira story de `panel`.
