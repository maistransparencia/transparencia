# Epic 20 Context: Tema Divisórias: Identidade Visual Minimalista, Tema Claro/Escuro Acessível e Migração dos Componentes

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Substituir o padrão de painéis com borda arredondada e sombra por uma linguagem editorial baseada em filetes (2px em seções, 1px em itens), tipografia hierárquica e colunas separadas por filete vertical. Toda cor passa a ser variável CSS semântica, o que viabiliza um tema escuro opcional (bônus de acessibilidade) trocando apenas valores de variáveis. A migração segue a ordem do tráfego real: Home, licitações, despesas, pessoal, receitas, orçamento, saúde e educação. Os elementos base (`h1`-`h4`, `p`, `dl`, `table`, listas, links) e papéis visuais nomeados (`DESIGN.md`/`EXPERIENCE.md`) passam a carregar o visual por padrão. As epics 21, 22 e 23 já devem nascer neste padrão.

## Stories

- Story 20.1: Tokens, Tema Claro/Escuro e Guarda de Arquitetura
- Story 20.2: Shell: Sidebar, Ribbon, Footer e Alternador de Tema
- Story 20.3: Componentes de `packages/ui` no Padrão Divisórias
- Story 20.4: Baseline Visual e Home no Padrão Divisórias
- Story 20.5: Farmácia SUS no Padrão Divisórias (Página Piloto)
- Story 20.6: `DenseTable`, Formato Mobile e Tela de Licitações
- Story 20.7: Pessoal, Receitas e Orçamento
- Story 20.8: Saúde e Educação
- Story 20.9: Obras, Previdência, Radar, Gráficos Restantes e Mapa no Tema Escuro
- Story 20.10: Acabamento do Shell: Notificações, Instalação do App e Rodapé
- Story 20.11: Despesas no Padrão Divisórias
- Story 20.12: Cores Semânticas no Tema Claro: Preenchimento e Texto Separados
- Story 20.13: Despesas Detalhadas: Reorganização da Página com os Dados Existentes
- Story 20.14: Elementos Base, Papéis Visuais e Plex Mono
- Story 20.15: `packages/ui` Sem Dependência do Next
- Story 20.16: Storybook, Fase 1
- Story 20.17: Guardas de Teste dos Padrões Base
- Story 20.18: Varredura Final dos Padrões Base
- Story 20.19: Remoção dos Aliases e Zeramento das Exceções do Tema
- Story 20.20: Ajustes dos Destaques de Despesas, Licitações e Pessoal (antes da 20.17)

## Requirements & Constraints

- Fundo da página branco; tema padrão claro. O escuro só ativa por escolha explícita do usuário (sem `prefers-color-scheme`).
- Contraste AA prevalece sobre o protótipo: texto normal 4,5:1; texto grande e controles 3:1, nos dois temas, validado com ferramenta. Tons como `mute2`, `mute3` e `faint` podem ser escurecidos e o valor final documentado.
- Rótulos mono pequenos: mínimo de 11px.
- Raio de 6px apenas em controles; raio maior só em camadas flutuantes (modal, menus, tooltip).
- Sem `dark:` e sem cor hex fixa em componentes; imagens OG permanecem no tema claro.
- Regra 23: sem literais de município, UF ou ano; nenhuma lista fixa de municípios.
- Regra 9: nomes de métricas explícitos. Regra 10: códigos em lowercase snake_case, com tradução só na UI. Regra 20: links externos com `target="_blank" rel="noopener noreferrer"`.
- A camada de apresentação só renderiza dados tipados de `@transparencia/db`; as telas migradas não alteram dados, queries nem textos.
- Fora do escopo: navegação mobile (`MobileBottomNav` só troca tokens), mudança de dados/queries e novas funcionalidades (única exceção limitada: a página de despesas passa a exibir áreas e fornecedores de queries já existentes, sem criar nem alterar query, DTO ou mart).
- Despesas: o rótulo "gasto" é sempre qualificado (empenhado, liquidado ou pago). Etapas empenhado/liquidado/pago não se somam (pago ≤ liquidado ≤ empenhado dentro do mesmo ano); evitar as palavras "desvio" e "calote". Lei só citada com link oficial (Regra 20) e artigo só após verificação. Documento de fornecedor exibido como vem da fonte (CPF já mascarado na origem; nenhuma máscara nova em TypeScript e nenhum número de 11 dígitos sem máscara renderizado). `llms.txt` e `llms-full.txt` refletem as seções novas (Regra 12). Propriedades em `camelCase` (Regra 18) e componentes canônicos do design system (Regra 24).
- Elementos base e papéis: sem `h5`/`h6`, sem `slate-*`/`gray-*`/`text-black`/`text-white`, sem classes de tamanho em `h1`-`h4`, `font-mono` só em `table` e `numeric`. Fonte mono: IBM Plex Mono via `next/font`, exposta como `--font-mono`.
- Commits: Conventional Commits em minúsculas, sem referência a story ou task.
- Qualidade: `pnpm typecheck`, `pnpm test` e `biome` devem passar; specs de classe e componentes atualizados.

## Technical Decisions

- Tokens semânticos: `page`, `ink`, `onink`, `line`, `line2`, `track`, `mute`, `mute2`, `mute3`, `faint`, `pill`, `banbg`, `banfg`, `brand`, `danger`, `ok`, `warn`. Existem nos dois temas e o tema escuro é ativado por `.dark` no `<html>`.
- Confirmar se `apps/web/app/globals.css` (`@theme` do Tailwind 4) ou `apps/web/tailwind.config.ts` é a fonte de verdade e remover a duplicidade.
- Script inline no `<head>` lê apenas `localStorage["mt-tema"]` antes da hidratação, aplica `.dark` somente se o valor for `dark` e não causa flash.
- `TOKENS` em `packages/ui/src/tokens.ts` aponta para `var(--...)`. Os aliases legados (`accent`, `borderLine`, `canvas`, `subtleText`, `mutedText`, `cardBg`, `text-attention`) permanecem durante a migração e são removidos na 20.9. `text-attention` é alias de `warn`.
- Teste de arquitetura falha ao encontrar `dark:` ou hex fixo em componente novo. A lista de exceções só pode encolher, até zero na 20.9.
- Novos componentes em `packages/ui`: `SectionHeader` (prop de nível do título, padrão `h2`), `ExternalLinkPill`, `StatRow`, `ThemeToggle` e um helper de cores de gráfico por variável CSS para `recharts` (lista de permissão de tokens). `KPICard` ganha `variant="divisoria"` e `KPIGrid` usa `divide-x divide-line`. `SegmentedButton` ganha variante `tabs`.
- Licitações: a incoerência "Homologado" junto de "Em disputa" é corrigida no dado (`@transparencia/db`/dbt), não só na UI. Conferir primeiro se o campo está mal mapeado ou se um texto de fallback virou status. Sem valor homologado, exibir "ainda não homologada" em tom neutro, nunca como indício de irregularidade.
- Farmácia SUS: um spike curto decide a solução de tiles escuros do mapa (filtro CSS ou tiles escuros nativos) e documenta o resultado.
- Cores semânticas: texto e preenchimento precisam de tokens separados. `warn-fill` (âmbar vivo, barras e preenchimentos) e `warn-text` (âmbar escuro, texto AA) já existem; a 20.12 generaliza o par `*-fill`/`*-text` para `warn`, `ok`, `danger` e `brand` sem remover os tokens atuais. Contraste exigido: `*-text` sobre `page` e `banbg` >= 4,5:1; `*-fill` sobre `track` e `line2` >= 3:1. Sem paleta fixa do Tailwind.
- Despesas detalhadas: usar apenas `getDespesasPorFuncaoMetrics` e `getTopFornecedoresExecucaoMetrics` de `@transparencia/db`; percentuais por etapa são divisões simples no `view-model`, lógica contábil fica na camada de dados. Ordem da página: resumo (sem `SectionHeader`), áreas, fornecedores, gastos que merecem acompanhamento (tabela accordion, menu de auditoria e CSV atuais), dívidas de anos anteriores. `TermometroOpacidadeFiscal` permanece logo após o radar, sem mudar conteúdo. `opengraph-image.tsx` não muda. A referência visual é o mockup `handoff-divisorias/Despesas Detalhadas - Divisorias.html` (dados fictícios).
- `PwaInstaller` usa `env.NEXT_PUBLIC_PROJECT_NAME` (Regra 17) e ícones Lucide de 16px no lugar de emojis.

- Papéis como `@utility` em `globals.css`: `eyebrow`, `caption`, `lead`, `display`, `numeric`, `stat-value` (`-sm`/`-lg`), `panel` (`panel-brand`/`-ok`/`-warn`/`-danger`), `section`, `list-text`. O `panel` lê `--panel-border-width`, `--panel-radius`, `--panel-shadow` e `--panel-padding` de `:root` (padrão: borda lateral de 3px, sem raio, sem sombra); trocar as variáveis muda todos os painéis. `stat-value-lg` permanece em serifa com `tabular-nums` (validado no Storybook).
- `packages/ui` não importa `next/*`: `Sidebar` recebe componente de link e `pathnameAtual` por prop; `apps/web` fornece wrapper com `next/link` e `usePathname()`. Teste de arquitetura falha se `packages/ui/src` importar `next`.
- Storybook em `apps/storybook` (`@storybook/react-vite`, `@tailwindcss/vite`, versões exatas), reutiliza o `globals.css` do app sem estilos próprios para elementos base; alternador `.dark` e visões mobile/desktop. Sem deploy.
- Guardas de teste em `apps/web/styles/` (estilo `tokens-uso.spec.ts`) com duas listas de isentos: temporária (só pode diminuir; cada story de migração remove suas entradas; vazia na 20.18) e permanente (e-mails, imagens OG, cores de série de gráficos, mapa Leaflet).

## UX & Interaction Patterns

- Sidebar sem fundo próprio, com `border-r border-line`. Item ativo com `border-l-2 border-ink font-semibold` e ícones Lucide de 16px. Rodapé da sidebar apenas com "Compartilhar página" e `ThemeToggle` (`Claro | Escuro`, `aria-pressed`, acessível por teclado).
- Footer com `border-t-2 border-ink` em três colunas: marca e fonte, "Neste dispositivo" (só aparece com conteúdo) e "Alertas".
- Seções abrem com `SectionHeader`. Blocos de dados viram colunas com filete a partir de `sm:` e empilham no mobile. Espaçamento entre seções de 104px no desktop e 64px no mobile.
- `DenseTable`: sem `rounded-xl border shadow-xs`, cabeçalho `border-b border-ink`, linhas `border-b border-line`, largura total no mobile.
- Formato mobile das tabelas: decisão em aberto, a resolver na 20.6. Candidatas: (A) linha de duas linhas com detalhes expansíveis, (B) API declarativa `mobileSummary`, (C) rolagem horizontal com primeira coluna fixa. Três protótipos em 375px e o Julio escolhe. Referência da Sally: processo e valor, objeto em até 2 linhas, situação e abertura, detalhes ao tocar, meta de 4 a 5 registros por tela.
- Uma só entrada de busca visível em licitações (a busca flutuante não compete com a da tabela).
- Notificações bloqueadas: instruções acessíveis por teclado e toque. Erros com `role="alert"` e texto simples. Não exibir estado "ativas/desativadas" enquanto carrega. O drawer respeita `prefers-reduced-motion`.
- Despesas detalhadas: rolagem única, sem abas nem barra de âncoras. Áreas com `SegmentedButton` de etapa (Reservado, Serviço entregue, Dinheiro que saiu; padrão "Dinheiro que saiu"), barra na cor `brand`, linhas que abrem com seta que gira e mostram as três etapas (sem subfunção). Fornecedores com valor pago e percentual do total pago; linha abre e mostra o documento. Resumo com `KPIGrid` divisória sem filete acima/abaixo, rótulos em linguagem cidadã ("Reservado (empenhado)", "Serviço entregue (liquidado)", "Dinheiro que saiu (pago)", "Quanto já foi pago"), três barras comparativas e accordion "as três etapas não se somam". Na tabela de gastos acompanhados: "Nada pendente" no lugar de "Sem dívida", aumento de variação em `warn-text` (não `danger`). Estado de lista vazia neutro, sem município.
- Antes de migrar Home e Despesas, capturar baseline visual (claro e escuro, desktop e mobile).

## Cross-Story Dependencies

- 20.1 é a base de tudo. 20.2 e 20.3 dependem da 20.1.
- 20.4 depende de 20.1, 20.2 e 20.3 e inclui os ajustes herdados da revisão da 20.3 (ModalDialog, SectionHeader, ExternalLinkPill, KPICard, chart-colors, SegmentedButton).
- 20.5 depende da 20.3. 20.6 depende da 20.3 e define o formato de tabela mobile.
- 20.7 e 20.8 dependem de 20.3 e 20.6. 20.9 depende de 20.4 a 20.8.
- 20.14 (depende de 20.1 e 20.12) e 20.17 (depende de 20.14) devem rodar antes da 20.7; 20.7 a 20.10 usam elementos base e papéis e removem suas entradas dos isentos. 20.15 depende da 20.2 e pode rodar em paralelo à 20.14; 20.16 depende de 20.14 e 20.15. 20.19 depende de 20.4 a 20.9; 20.18 depende de 20.7 a 20.10, 20.17 e 20.19.
- 20.10 depende só da 20.2 e usa o teste de contraste da 20.1.
- 20.11 (despesas) depende da 20.3, não usa `DenseTable` e deve rodar logo após a 20.4.
- Ajustar a Story 23.x (tema escuro e auditoria WCAG), parcialmente absorvida por esta epic. As epics 21 a 23 devem seguir o padrão divisórias desde o início.
- 20.12 depende de 20.1 e 20.11 e migra os usos de `warn` (inclusive `despesas/page.tsx`); as stories 20.7 a 20.10 devem usar o par `*-fill`/`*-text` assim que existir. Decisões em aberto: tons de referência (`amber-500`, `emerald-500`) e se `alert-box`/`badge` entram na 20.12. Suas capturas antes/depois fecham o baseline visual pendente da 20.11.
- 20.13 depende de 20.3 e 20.11 e deve rodar antes da 20.12. Depende das duas queries já existentes em `@transparencia/db`. Capturas de depois coordenadas com a 20.12. Itens de despesas fora do escopo (mês a mês, grupo/elemento, forma de contratação, subfunção, empenhos por fornecedor) pertencem a uma epic seguinte.
