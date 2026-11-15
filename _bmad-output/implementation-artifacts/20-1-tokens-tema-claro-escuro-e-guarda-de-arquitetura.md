---
title: 'Story 20.1: Tokens, Tema Claro/Escuro e Guarda de Arquitetura'
type: 'feature'
created: '2026-10-25'
status: 'done'
context:
  - '{project-root}/CLAUDE.md'
  - '{project-root}/.claude/rules/web.md'
  - '{project-root}/_bmad-output/planning-artifacts/handoff-divisorias/ISSUE-divisorias.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md (Epic 20, Story 20.1)'
---

## Intent

Trocar cores fixas por tokens semânticos em variáveis CSS (tema claro padrão, escuro opcional via `.dark`), sem alterar nenhum componente além do necessário para os aliases continuarem funcionando. Esta story não toca banco, queries nem layout dos componentes (isso é 20.2 em diante).

## Decisões fechadas (Julio, 2026-10-25)

- Fundo `page` branco. Tema padrão claro; escuro só se o usuário escolher. Sem `prefers-color-scheme`.
- Script anti-flash só lê `localStorage["mt-tema"]` e aplica `.dark` se for `"dark"`.
- Contraste AA vence o protótipo: 4,5:1 texto normal, 3:1 texto grande e limites de controles.

## Medições (feitas em 2026-10-25, WCAG 2.x, oklch convertido para sRGB)

Fundos de texto considerados: `page`, `banbg` (ribbon) e `track`.

### Protótipo do handoff que reprova AA

| Token | Tema | Valor do protótipo | page | banbg | track | Valor final | page / banbg / track |
|---|---|---|---|---|---|---|---|
| `mute2` | claro | `#6b7280` | 4,83 | **4,37** | **4,16** | `#666c7a` | 5,26 / 4,76 / 4,53 |
| `mute3` | claro | `#9aa1ab` | **2,61** | **2,36** | **2,24** | `#676c73` | 5,29 / 4,79 / 4,55 |
| `mute2` | escuro | `#8b94a1` | 5,86 | 5,21 | **4,39** | `#8d96a2` | 6,01 / 5,33 / 4,50 |
| `mute3` | escuro | `#6f7884` | **4,02** | **3,57** | **3,01** | `#8f969f` | 6,02 / 5,35 / 4,51 |
| `brand` | claro | `oklch(0.55 0.11 250)` = `#3a75af` | 4,83 | **4,37** | **4,16** | `oklch(0.5 0.11 250)` = `#2a669f` (igual ao `accent` atual) | 5,98 / 5,41 / 5,15 |

Consequência para o design: com AA, `mute2` e `mute3` ficam praticamente iguais nos dois temas (a hierarquia de três cinzas de texto colapsa em dois). A story mantém os três nomes (o handoff e os aliases dependem deles), mas `mute3` deixa de significar "mais claro que mute2". Registrar em comentário no `globals.css`; a decisão de fundir os dois fica para a 20.9.

### Tokens que passam sem ajuste (manter valores do handoff)

`ink` (16,9 claro / 14,9 escuro), `mute` (7,56 / 8,21), `danger` (5,29 / 6,27), `ok` (5,71 / 8,49), `warn` (6,15 / 8,79), `brand` escuro (8,13), `banfg` sobre `banbg` (6,36 / 8,09), `onink` sobre `ink` (16,9 / 14,9). Todos ≥ 4,5:1 sobre `page` e `banbg` nos dois temas.

### Tokens decorativos (não podem carregar texto nem ser o único limite de um controle)

`faint` (1,68 claro / 2,24 escuro), `pill` (1,42 / 1,72), `line` (1,26 / 1,37), `line2`, `track` (1,16 / 1,33) ficam com os valores do handoff. Regra: nunca em `text-*`; limite de controle (input, select, botão secundário) usa `mute3` (≥ 3:1 por construção). O teste de arquitetura reprova `text-faint`, `text-pill`, `text-line`, `text-line2` e `text-track`.

### Aliases atuais, contraste sobre branco (para decidir o mapeamento)

| Alias atual | Valor | Contraste | Mapeia para | Observação |
|---|---|---|---|---|
| `accent` | `oklch(0.5 0.11 250)` | 5,98 | `brand` | valor final do `brand` é idêntico |
| `canvas` | `#f4f5f7` | n/a | `page` | muda de cinza para branco (decisão do produto) |
| `cardBg` | `#ffffff` | n/a | `page` | |
| `borderLine` | `#e7e9ee` | n/a | `line` | |
| `subtleText` | `#5b6270` | 6,13 | `mute` | |
| `mutedText` | `#656c79` | 5,28 | `mute2` | valor final do `mute2` (5,26) é quase idêntico |
| `attention` / `text-attention` | `oklch(0.5 0.11 70)` | 6,15 | `warn` | idêntico ao `warn` claro |
| `warning` | `oklch(0.65 0.13 65)` | **3,34** | `warn` | **reprovava AA como texto**; só passa como ícone/preenchimento grande. Quem usa `text-warning` passa a ler `warn` (mais escuro). Inventariar usos de `bg-warning` antes (contraste do texto sobre o fundo). |
| `inactive` | `#aab1bc` | **2,16** | `mute3` (se for texto) ou `faint` (se for decoração) | decidir por uso no inventário |
| `danger` | `oklch(0.55 0.11 25)` = `#a85550`, 5,12 | | `danger` (novo `oklch(0.55 0.17 25)`, 5,29) | mais saturado; passa |
| `success` | `oklch(0.5 0.13 145)`, 5,67 | | `ok` (`oklch(0.5 0.1 155)`, 5,71) | |

## Boundaries & Constraints

- **Fonte de verdade única: `apps/web/app/globals.css`.** Migrar para `@theme` (Tailwind 4.3.3) e **remover `apps/web/tailwind.config.ts`** junto com a diretiva `@config`. O array `content` vira `@source "../../../packages/ui/src"` (o diretório `apps/web` já é detectado automaticamente). `fontFamily` migra para `--font-sans` e `--font-serif` em `@theme`. Motivo: os dois arquivos hoje duplicam cores (e `tokens.ts` é uma terceira cópia, sem teste de paridade: pendência registrada na revisão da 19.7).
- Padrão: `:root { --page: #ffffff; ... }`, `.dark { --page: #14171b; ... }` e `@theme inline { --color-page: var(--page); ... }`. Com `inline`, as utilities resolvem `var(--page)` em tempo de uso e trocar `.dark` troca o tema sem rebuild.
- Nomes de tokens do handoff são a exceção aceita à Regra 9 (vocabulário fechado do design system, tabela abaixo). Qualquer token **novo** criado fora dessa tabela segue a Regra 9.
- Sem `dark:` em componente. Sem literais de tenant, UF ou ano (Regra 23). Versões pinadas (Regra 7): nenhuma dependência nova é necessária.
- Fora do escopo: reescrever componentes, remover aliases (20.9), alternador de tema na UI (20.2), imagens OG (permanecem no tema claro com hex próprio, são exceção declarada).
- Regra 15: não toca banco.

## Tabela final de tokens

| Token | Claro | Escuro |
|---|---|---|
| `page` | `#ffffff` | `#14171b` |
| `ink` | `#1a1d21` | `#e8eaed` |
| `onink` | `#ffffff` | `#14171b` |
| `line` | `#e2e5ea` | `#2c3138` |
| `line2` | `#f0f1f4` | `#23282e` |
| `track` | `#eceef2` | `#2a2f36` |
| `mute` | `#4b5563` | `#a8b0bb` |
| `mute2` | `#666c7a` (ajustado) | `#8d96a2` (ajustado) |
| `mute3` | `#676c73` (ajustado) | `#8f969f` (ajustado) |
| `faint` | `#c3c8d0` | `#4a515b` |
| `pill` | `#d5d9df` | `#3a4049` |
| `banbg` / `banfg` | `#eef4fd` / `#3a5a86` | `#182233` / `#9bbbe6` |
| `brand` | `oklch(0.5 0.11 250)` (ajustado) | `oklch(0.75 0.11 250)` |
| `danger` | `oklch(0.55 0.17 25)` | `oklch(0.7 0.16 25)` |
| `ok` | `oklch(0.5 0.1 155)` | `oklch(0.75 0.12 155)` |
| `warn` | `oklch(0.5 0.11 70)` | `oklch(0.78 0.13 70)` |

## Linha de base medida (2026-10-25)

- `dark:` em componentes: **0**.
- Arquivos com `rounded-xl`, `rounded-2xl` ou `rounded-[10px]`: **72** (`apps/web/app`, `apps/web/components`, `packages/ui/src`).
- Arquivos `.ts/.tsx` (sem spec) com cor hex literal (`#rrggbb`): **57** (inclui `page.tsx`, `view-model.ts`, `manifest.ts`).
- Arquivos usando classes de alias (`bg-canvas`, `text-subtleText`, `border-borderLine`, `text-accent` etc.): **79**.
- Arquivos com valor arbitrário de cor (`[#...]`, `[oklch...]`): **53**.
- Consumidor de `TOKENS` fora de `tokens.ts`: só `apps/web/components/farmacia/farmacia-mapa.tsx` (HTML do marcador Leaflet, usa `TOKENS.colors.accent` dentro de `color-mix(in oklch, ...)`). Com `var(--brand)` continua funcionando porque o HTML é injetado no DOM da página. Confirmar no teste manual.
- `opengraph-image.tsx` (ImageResponse/satori não resolve `var()`): fica fora da regra, na lista de exceções.

## Acceptance Criteria

1. **Fonte única.** `apps/web/tailwind.config.ts` não existe mais; `globals.css` não contém `@config`; `@theme inline` declara cada token da tabela e as utilities `bg-page`, `text-ink`, `text-mute`, `border-line`, `text-brand` etc. compilam. `pnpm --filter web build` não é exigido (CLAUDE.md §4: build é da Vercel), mas `pnpm typecheck` e uma renderização local da home devem mostrar as classes dos pacotes `packages/ui` aplicadas (prova de que o `@source` funciona).
2. **Tokens nos dois temas.** Todos os 17 tokens existem em `:root` e em `.dark`, com os valores da tabela final. `body` usa `bg-page text-ink`; o fundo do site é branco no claro. `layout.tsx` troca `bg-canvas` por `bg-page`.
3. **Contraste verificado por teste, não de cabeça.** Novo spec (`apps/web/styles/tokens-contraste.spec.ts`, ou local equivalente) lê os valores de `globals.css` (parser simples de `:root`/`.dark`), converte oklch para sRGB e afirma: (a) `ink`, `mute`, `mute2`, `mute3`, `brand`, `danger`, `ok`, `warn` ≥ 4,5:1 sobre `page`, `banbg` e `track` nos dois temas; (b) `banfg` ≥ 4,5:1 sobre `banbg`; (c) `onink` ≥ 4,5:1 sobre `ink`; (d) `mute3` ≥ 3:1 sobre `page` (limite de controle). O spec falha se alguém clarear um token. Os valores finais acima são o resultado desse cálculo.
4. **Script anti-flash.** `<head>` do `layout.tsx` recebe um `<script>` inline (síncrono, antes do corpo) que faz `try { if (localStorage.getItem("mt-tema") === "dark") document.documentElement.classList.add("dark") } catch {}`. Sem `prefers-color-scheme`. `<html>` recebe `suppressHydrationWarning`. Sem valor guardado ou valor diferente de `dark`: tema claro. Teste (jsdom): executa o texto do script exportado de um módulo e verifica os três casos (`"dark"`, ausente, `"light"`/lixo) e que `localStorage` lançando exceção não quebra a página.
5. **Aliases preservados.** `accent`, `borderLine`, `canvas`, `subtleText`, `mutedText`, `cardBg`, `attention`, `warning`, `inactive`, `danger`, `success` e `ink` continuam compilando como utilities, apontando para os tokens conforme a tabela de aliases (por exemplo, `--color-canvas: var(--page)`). Nenhum dos 79 arquivos consumidores precisa mudar nesta story. O inventário de `bg-warning`/`text-warning`/`inactive` é registrado no Registro de implementação, com o contraste do texto sobre cada fundo usado.
6. **`TOKENS` aponta para variáveis.** `packages/ui/src/tokens.ts` mantém as chaves atuais (`accent`, `warning`, `attention`, `inactive`, `danger`, `success`, `ink`, `subtleText`, `mutedText`, `border`, `background`, `cardBg`) com valores `var(--brand)`, `var(--warn)`, etc., mais as chaves novas dos 17 tokens. Teste de paridade (`packages/ui`): todo `var(--x)` de `TOKENS` existe em `:root` e `.dark` de `globals.css`. `farmacia-mapa` segue renderizando o marcador com a cor da marca (verificação visual local).
7. **Guarda de arquitetura.** Novo spec (`apps/web/architecture/tema.spec.ts`) varre `apps/web/app`, `apps/web/components` e `packages/ui/src` (`.ts/.tsx`, exceto specs) e falha para: (a) `dark:` em qualquer classe; (b) cor hex literal; (c) `text-faint|pill|line|line2|track` (tokens decorativos como texto); (d) `rounded-xl|2xl|[10px]` (padrão antigo). Arquivos que já violam (a linha de base acima) entram em `apps/web/architecture/tema-excecoes.json`, uma lista **por regra e por arquivo**. O spec também falha se: um arquivo da lista deixou de violar (obriga a remover a entrada: a lista só encolhe) ou se há arquivo novo violando fora da lista. A lista é gerada na implementação a partir da varredura e commitada. Exceções permanentes e justificadas: `opengraph-image.tsx` (satori), `manifest.ts` (`theme_color`) e `globals.css`.
8. **Qualidade.** `pnpm typecheck`, `pnpm test` (ou `make test/ts`) e `biome` passam. Sem regressão de contraste sobre o commit `f9c969c2`: nenhum texto que hoje passa AA passa a reprovar (coberto pelo item 3 e pelo inventário do item 5).
9. **Revisão visual manual (local, banco do Docker).** Home do município em 375px e 1280px nos temas claro e escuro (alternando `localStorage["mt-tema"]` no console, pois o botão só existe na 20.2): sem flash ao recarregar, texto legível, sem cor quebrada. Lighthouse de acessibilidade na home permanece 100 (nota atingida na 19.7).

## Tasks

1. Escrever o spec de contraste (item 3) primeiro, com os valores finais; falha até o CSS existir.
2. Migrar `globals.css` para `@theme inline` + `:root`/`.dark`; mapear aliases; adicionar `@source`; mover fontes; deletar `tailwind.config.ts` e `@config`.
3. Atualizar `layout.tsx` (script anti-flash, `suppressHydrationWarning`, `bg-page`); extrair o texto do script para módulo testável.
4. Atualizar `tokens.ts` e o teste de paridade.
5. Gerar `tema-excecoes.json` e o spec de arquitetura.
6. Inventário de `warning`/`inactive` e verificação visual; registrar no Registro de implementação.
7. `pnpm typecheck`, `pnpm test`, `biome`.

## Riscos

- Remover `tailwind.config.ts` pode perder classes de `packages/ui` se o `@source` estiver errado: o item 1 exige prova. Plano B: manter `@config` só com `content` (sem cores) e registrar o motivo.
- `warning` → `warn` escurece os avisos amarelos/laranja existentes. Intencional (AA), mas é mudança visível em telas com `bg-warning`/`text-warning`; o inventário do item 5 dimensiona isso.
- Mapear `canvas` para branco remove o contraste entre fundo cinza e cartões brancos nas páginas ainda não migradas (20.2 a 20.9). Aceito na decisão do produto; os cartões antigos mantêm borda `borderLine`.
- `color-mix(in oklch, var(--brand) 22%, transparent)` em `farmacia-mapa` deve continuar válido; conferir no navegador.

## Commits sugeridos

`feat(web): migrar cores para tokens css e tema escuro opcional`, `test(web): proteger contraste dos tokens e guarda de arquitetura do tema`.

## Registro de implementação

Implementado em 2026-10-25. `pnpm typecheck`, `pnpm test` (db 302, ui 180, web 1147) e `biome check` passam.

- **Fonte única:** `globals.css` com `@source` para `packages/ui/src`, `:root`/`.dark` e `@theme inline`; `tailwind.config.ts` e `@config` removidos. Prova do `@source`: compilação via `@tailwindcss/postcss` gera `.text-warning` (usada só em `packages/ui` e em `contrato-servico-vigente-card`), `.bg-page`, `.border-line`, `.text-brand`, `.bg-cardBg`, `.font-serif`.
- **Aliases:** `accent`→`brand`, `canvas`/`cardBg`→`page`, `borderLine`→`line`, `subtleText`→`mute`, `mutedText`→`mute2`, `attention`/`warning`→`warn`, `success`→`ok`, `inactive`→`mute3`.
- **Inventário `warning`/`inactive`:** `text-warning` em 2 arquivos (`packages/ui/src/components/kpi-card.tsx`, `apps/web/components/contrato-servico-vigente-card.tsx`), ambos texto sobre `page` (agora `warn`: 6,15 claro / 8,79 escuro, antes 3,34). Nenhum `bg-warning`. `inactive` não é usado como classe, só em `TOKENS`; mapeado para `mute3`.
- **Script anti-flash:** `apps/web/lib/tema-script.ts` (+ spec jsdom com os três casos e `localStorage` lançando exceção), injetado no `<head>`; `<html suppressHydrationWarning>`; `body` usa `bg-page`.
- **`TOKENS`:** `packages/ui/src/tokens.ts` com `var(--...)`; paridade em `packages/ui/src/tokens.spec.ts`. `packages/ui/tsconfig.json` ganhou `"node"` em `types` para o spec ler o CSS.
- **Contraste:** `apps/web/styles/tokens-contraste.spec.ts` (+ `tokens-css.ts`, parser e conversão oklch→sRGB) com todos os valores da tabela passando.
- **Arquitetura:** `apps/web/architecture/tema.spec.ts`, `varredura-tema.ts`, `tema-excecoes.json`. Linha de base reproduzida: `dark:` 0, hex 55 (57 menos as 2 exceções permanentes `opengraph-image.tsx` e `manifest.ts`), `raio-antigo` 72, token decorativo como texto 0.
- **Pendente (AC 9):** revisão visual manual (375px/1280px, claro/escuro, sem flash, marcador de `farmacia-mapa`, Lighthouse) não foi executada nesta sessão.
- Nada commitado.

### Review Findings

- [x] [Review][Patch] `@theme inline` sem teste: nada garante que cada `--color-X` aponte para `var(--Y)` existente em `:root`, nem que todo alias legado e chave de `TOKENS.colors` tenha `--color-*`. Apagar ou errar `--color-subtleText` (143 usos) ou `--color-borderLine` (68) passa em typecheck e specs [apps/web/app/globals.css:65-98, apps/web/styles/tokens-contraste.spec.ts]
- [x] [Review][Patch] Guarda de arquitetura com brechas: `cor-hex-literal` só pega hex de 6 dígitos (não `#fff`, 8 dígitos, `oklch(`/`rgb(`/`hsl(`); `raio-antigo` não pega `rounded-t-xl`/`rounded-l-2xl`; `token-decorativo-como-texto` só olha `text-*` (não `fill-`/`stroke-`/`placeholder-`); varredura ignora `apps/web/lib`, `apps/web/styles`, `.jsx`/`.mdx` [apps/web/architecture/varredura-tema.ts:3-21]
- [x] [Review][Patch] Contraste sem os pares preenchidos: `onink` sobre `brand`/`danger`/`ok`/`warn` e `banfg` só sobre `banbg`; no escuro `onink` (#14171b) sobre `brand` claro nunca é medido [apps/web/styles/tokens-contraste.spec.ts:13-62]
- [x] [Review][Patch] `.dark` sem `color-scheme: dark`: controles nativos, scrollbar e autofill continuam claros no tema escuro [apps/web/app/globals.css:34-52]
- [x] [Review][Patch] Mudança visível de cor (`danger` croma 0,11→0,17, `success`, `warning` 0,65→0,5 de luminosidade) sem entrada em `CHANGELOG.md` [CHANGELOG.md]
- [x] [Review][Defer] Script anti-flash sem teste de fiação: remover o `<script>` de `layout.tsx` não derruba nenhum spec [apps/web/app/layout.tsx:129-130] — deferred: layout é server component assíncrono, difícil de renderizar em unit; tema escuro é opt-in e sem toggle até a 20.2. Pode ser coberto por e2e na 20.2
- [x] [Review][Defer] Marcador `farmacia-mapa` passou de `oklch(...)` literal para `var(--brand)` dentro de `color-mix` em HTML de divIcon, sem asserção [packages/ui/src/tokens.ts, apps/web/components/farmacia/farmacia-mapa.tsx:34-36] — deferred: coberto pela verificação visual do AC 9
- [x] [Review][Defer] Conversão oklch→sRGB com clamp de gamut sem teste de valor de referência; as razões de `brand`/`danger`/`ok`/`warn` dependem dela (maybe-false, severidade medium não verificada) [apps/web/styles/tokens-css.ts:80-93] — deferred: conferir 2 ou 3 valores contra uma referência independente (ex.: culori ou o DevTools do navegador) e ver se alguma razão cruza 4,5 perto do limite

#### Pendente fora dos achados

- AC 9 (revisão visual 375px/1280px, claro/escuro, sem flash, marcador `farmacia-mapa`, Lighthouse) continua não executado. A story não deve ir a `done` sem ele.

#### Rejected

- Canvas e cardBg unificados em branco: decisão fechada do produto (spec, linha de `canvas` da tabela de aliases e Riscos). Fix seria editar a spec.
- `warning`/`attention`→`warn` e `inactive`→`mute3` mudam o visual: mapeamento decidido na spec; inventário registrado (2 arquivos com `text-warning`, nenhum `bg-warning`, `inactive` só em `TOKENS`).
- Sem toggle de tema e sem `prefers-color-scheme`: fora do escopo (toggle é 20.2) e a decisão fechada proíbe `prefers-color-scheme`.
- ~55 arquivos com hex ficam feios no escuro: escopo declarado, migração nas stories 20.2 a 20.9, lista de exceções só encolhe.
- `@types/node` não declarado em `packages/ui`: falso, está em `packages/ui/package.json` como `26.6.5` exato.
- Script inline sem nonce/CSP: nenhuma configuração de CSP nem nonce encontrada em `next.config`/middleware; o dano descrito não ocorre.
- `@custom-variant dark` ausente: inofensivo, a guarda proíbe `dark:` em componentes (0 ocorrências).
- Comentários citando "story 20.9": regra de commit não vale para comentário e a spec manda registrar a decisão no `globals.css`.
- `extrairBloco`/`nomesDoBloco` com primeira `}`, `arrayContaining` permitindo extras, `corParaRgb` restrito, `tokens[texto]` indefinido: todos falham alto num cenário que ninguém mostrou ser alcançável; correção adicionaria complexidade (baixo).
- `tema.spec.ts` com cast sem validar chaves do JSON; exceções permanentes sem justificativa; regex em comentários/strings gerando falso positivo; `@source` não provado de forma reproduzível: baixo, sem uso cotidiano.
- Status `ready-for-dev` e "Nada commitado" no Registro desatualizados: corrigir editaria a spec.

#### Resolução

- Os 5 patches foram aplicados. Efeito colateral: o regex de hex alargado achou 7 arquivos com cor literal, adicionados às exceções; a regra nova `paleta-fixa-do-tailwind` (`bg-white`, `bg|border|text-gray|slate-*`) entrou com 112 arquivos de exceção. Totais atuais: hex 62, raio antigo 72, paleta fixa 112.
- **AC 9 parcial (aceito por Julio em 2026-10-25).** Confirmado: tema escuro sem flash ao recarregar, Lighthouse 100 nos dois temas. Não cumprido: no escuro, cards com `bg-white` ficam com texto ilegível (claro sobre branco), além do cabeçalho e da barra lateral, porque ~112 arquivos ainda usam a paleta fixa do Tailwind. O escuro não é alcançável por usuários até existir o botão (20.2). A migração fica para as stories 20.2 a 20.9, e a lista de exceções só encolhe. Não foram conferidos 375px nem o marcador de `farmacia-mapa` no escuro (o print da farmácia mostra o marcador azul em 375px).
