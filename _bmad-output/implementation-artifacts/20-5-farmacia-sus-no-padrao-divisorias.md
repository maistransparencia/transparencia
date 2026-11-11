---
title: 'Story 20.5: Farmácia SUS no Padrão Divisórias (Página Piloto)'
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_revision: '2081af378ffd031810c63a84e35cd0ba4a8e6f56'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/CLAUDE.md'
  - '{project-root}/.claude/rules/web.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-20-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/20-4-baseline-visual-e-home-no-padrao-divisorias.md'
warnings: []
deferred:
  - summary: >-
      Duplicação de SEM_PAPEL_DE_ABA; criar variante de toggle (aria-pressed) em SegmentedButton.
    evidence: |-
      Definido em farmacia-resultados.tsx e farmacia-sentinelas.tsx para anular role/aria-selected da variante tabs.
    location: >-
      packages/ui/src/components/segmented-button.tsx
    severity: low
  - summary: >-
      Conferir visualmente a Farmácia SUS (375px e 1280px, claro e escuro), incluindo o filtro dos tiles escuros.
    evidence: |-
      Nenhuma captura de tela foi feita; filtro CSS decidido sem verificação visual.
    severity: medium (unverified)
---

<intent-contract>

## Intent

**Problema:** a página Farmácia SUS (`apps/web/app/[portalSlug]/farmacia/page.tsx` e `apps/web/components/farmacia/`) ainda usa cartões `rounded-xl/[10px] border`, `shadow`, `bg-white`, paleta fixa do Tailwind (`slate-*`, `rose-*`), hex (`#f7f8fa`, `#f4f7fb`, `#fff`) e aliases legados (`borderLine`, `subtleText`, `accent`), e não funciona direito no tema escuro. O mapa Leaflet usa tiles claros fixos.

**Abordagem:** migrar a página para o padrão Divisórias sem alterar dados, queries, `loader.ts`, `view-model.ts` nem textos: indicadores em colunas `divide-x`, abas `border-b-2` (`SegmentedButton variant="tabs"`), estado vazio `border-y border-line`, "Mais procurados" como links de texto, botões `rounded-md`, listas com filetes em vez de cartões, `SectionHeader` quando couber. Decidir por spike curto a solução de tiles escuros do mapa e documentá-la em Design Notes.

## Boundaries & Constraints

**Always:** só tokens semânticos (`ink`, `line`, `line2`, `mute`, `mute2`, `mute3`, `page`, `pill`, `brand`, `danger`, `ok`, `warn`, `onink`); sem `dark:`, sem hex e sem paleta fixa do Tailwind nos arquivos migrados; marcadores/controles do mapa via variáveis CSS (`var(--brand)`, `var(--page)`...) e controles `rounded-md`; preservar textos pt-BR ("em estoque", "Pedir esclarecimento", "Mais procurados:", etc.) e `fmtNumber` de `@transparencia/ui`; regras 9, 23 e 24 (nada de município/UF/ano fixo; sem vocabulário novo); atributos de acessibilidade existentes (`aria-*`, `data-testid`, `data-unidade-id`) preservados; specs `farmacia-*.spec.tsx` e `page.spec.tsx` atualizados para o novo markup.

**Never:** alterar `@transparencia/db`, `loader.ts`, `view-model.ts` ou textos; migrar outras páginas; remover aliases legados (20.9) nem tocar `DenseTable`; adicionar dependências; usar `rounded-xl`/`rounded-lg`/sombras em cartões, inclusive no contêiner do mapa.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Indicadores | lista vazia / 1..N itens | vazia → `null`; senão `<dl>` em colunas com `divide-x` (empilha com `divide-y` no mobile) | — |
| Nota de atenção | `notaAtencao: true` | nota na cor `text-warn` | — |
| Estado vazio da busca | `unidades.length === 0` | bloco `border-y border-line` com mesmos textos | — |
| Mais procurados | `exemplos` vazio | omite a linha; senão links de texto com sublinhado ao hover | — |
| Modo de visualização | clicar em "Por remédio" | aba `border-b-2` ativa com `aria-pressed=true` | — |
| Destaque | hover/foco em unidade | linha ganha realce por token (`bg-line2`), marcador do mapa cresce | — |
| Mapa tema escuro | `data-theme`/classe escura ativa | tiles seguem a solução decidida no spike; marcadores usam variáveis CSS | tiles indisponíveis: mapa vazio, sem erro |

</intent-contract>

## Code Map

- `apps/web/app/[portalSlug]/farmacia/page.tsx` -- layout `gap-9`, estado "indisponivel" (`rounded-xl border-dashed bg-slate-50/50`, hex) → `border-y border-line`.
- `components/farmacia/farmacia-indicadores.tsx` -- grade de cartões `rounded-[10px]` → colunas `divide-x`; `text-attention` → `text-warn`.
- `components/farmacia/farmacia-busca-destaque.tsx` -- campo `rounded-xl shadow-xs`, botão `rounded-lg`, "Mais procurados" em pílulas `rounded-full` → campo `rounded-md`, botão `rounded-md`, links de texto.
- `components/farmacia/farmacia-resultados.tsx` -- cartões `rounded-xl`, seletor segmentado `bg-slate-200` → abas (`SegmentedButton variant="tabs"` de `@transparencia/ui`), contêiner do mapa `rounded-xl border`, hex `#f4f7fb`, `bg-accent`.
- `components/farmacia/farmacia-mapa.tsx` -- `htmlMarcador` com `TOKENS.colors.accent` e `#fff` → `var(--brand)`/`var(--onink)`/`var(--page)`; tiles Esri claros fixos; zoom control Leaflet (`leaflet.css`) precisa de `rounded-md` e tokens.
- `components/farmacia/farmacia-sentinelas.tsx` (379 linhas) -- `rounded-xl/[10px]`, `slate-*`, hex `#f7f8fa`, pílulas de filtro `rounded-full` → filetes/`border-y`, `border-b-2`.
- `components/farmacia/farmacia-acoes-civicas.tsx` -- botões `rounded-xl`, `rose-*`, `slate-50` → `rounded-md`, `border-danger`/`text-danger`.
- `components/farmacia/farmacia-sus-sentinela-banner.tsx`, `farmacia-fonte-dados.tsx`, `farmacia-cabecalho.tsx`, `farmacia-selo-transparencia.tsx`, `farmacia-resumo-card.tsx` -- `slate-*`, `rounded-lg`, `bg-white` → tokens.
- `packages/ui/src/components/{segmented-button,section-header}.tsx` e `packages/ui/src/utils/chart-colors.ts` -- reuso (somente leitura); `apps/web/app/globals.css` -- tokens e variáveis CSS (somente leitura, exceto estilos do Leaflet se necessário).
- `apps/web/components/farmacia/*.spec.tsx`, `app/[portalSlug]/farmacia/page.spec.tsx` -- specs a atualizar.

## Tasks & Acceptance

**Execution:**
- `components/farmacia/farmacia-indicadores.tsx` -- colunas `divide-x` sem cartão; `text-warn` na nota -- AC 1
- `components/farmacia/farmacia-busca-destaque.tsx` -- campo/botão `rounded-md`, sem sombra; "Mais procurados" como links de texto -- AC 1
- `components/farmacia/farmacia-resultados.tsx` -- abas `border-b-2`, listas com filetes (`divide-y`/`border-t border-line`), estado vazio `border-y border-line`, contêiner do mapa sem `rounded-xl`, tokens no lugar de hex/slate -- AC 1
- `components/farmacia/farmacia-mapa.tsx` -- spike de tiles (filtro CSS vs. tiles nativos escuros), marcadores com variáveis CSS, controles `rounded-md` -- AC 2
- `components/farmacia/farmacia-sentinelas.tsx`, `farmacia-acoes-civicas.tsx`, `farmacia-sus-sentinela-banner.tsx`, `farmacia-fonte-dados.tsx`, `farmacia-cabecalho.tsx`, `farmacia-selo-transparencia.tsx`, `farmacia-resumo-card.tsx`, `page.tsx` -- migrar para tokens e padrão Divisórias -- AC 1
- `components/farmacia/*.spec.tsx`, `page.spec.tsx` -- ajustar asserções ao novo markup; cobrir matriz I/O; garantir ausência de `rounded-xl`, hex e `slate-` nos arquivos migrados -- AC 3

**Acceptance Criteria:**
- Given a página Farmácia SUS, when renderizada nos temas claro e escuro, then não há cartões `rounded-xl` com borda e sombra (inclusive no mapa), indicadores usam `divide-x`, abas usam `border-b-2`, estado vazio usa `border-y border-line`, "Mais procurados" são links de texto e botões são `rounded-md`.
- Given o mapa, when renderizado, then marcadores usam variáveis CSS, controles têm `rounded-md` e a solução de tiles escuros está documentada em Design Notes.
- Given os textos atuais, when comparados, then "em estoque", "Pedir esclarecimento" e `fmtNumber` seguem inalterados e os specs passam.

## Spec Change Log

## Review Triage Log

### 2026-10-25 — Review pass
- verdicts: 27 findings — high 0, medium 4, low 6, false 3, maybe-false 0 (demais agrupados/deferidos como abaixo)
- findings:
  - `[medium]` `patch` `first:pl-0` no mobile desalinha indicadores empilhados — trocado por `sm:px-4 sm:first:pl-0`.
  - `[medium]` `patch` fundo do contêiner Leaflet claro no tema escuro — regra `.dark .farmacia-mapa.leaflet-container` com `var(--line2)`.
  - `[medium]` `patch` estado pressionado das abas sem asserção (Blind/Verification Gap) — asserções de `aria-pressed`/ausência de `aria-selected` nos specs de resultados e sentinelas.
  - `[medium]` `patch` guarda `farmacia-divisorias.spec.ts` fraca (hex com `;`, `rounded-2xl`, `shadow-lg`, `bg-white`, `page.tsx` fora) — regexes ampliados e `page.tsx` incluído.
  - `[low]` `patch` linhas focáveis sem indicador de foco — `focus-visible:outline-2 outline-brand`.
  - `[low]` `defer` `SEM_PAPEL_DE_ABA` duplicado / variante de toggle em `packages/ui` — ver deferred.
  - `[low]` `reject` seletor `.dark` vs `data-theme`: o tema usa a classe `.dark` (globals.css:40) — falso.
  - `[low]` `reject` tokens `warn`/`ok` inexistentes: existem em globals.css — falso.
  - `[low]` `reject` `type="button"` ausente: `SegmentedButton` já define (segmented-button.tsx:48) — falso.
  - `[low]` `reject` popups/tooltips Leaflet sem tema, contraste de `mute3`, chips sem afordância, changelog, `rounded-sm/full` residuais, `page.spec` sem asserção do estado indisponível, spike sem artefato além das Design Notes — cosméticos ou fora do intento; changelog tratado no fechamento do épico.
  - `[low]` `defer` verificação visual do mapa escuro e contraste nos dois temas (manual) — ver deferred.

## Design Notes

Solução de tiles escuros: registrar aqui a decisão do spike (filtro CSS sobre os tiles Esri claros no tema escuro vs. camada escura nativa) com o motivo; preferir a que não adiciona domínio/dependência nova.

**Decisão (spike):** filtro CSS sobre os tiles Esri claros. Regra `.dark .farmacia-mapa .leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) brightness(.9) contrast(.9) }` em `apps/web/app/globals.css`. Motivo: não adiciona domínio de tiles nem dependência, e o canvas cinza-claro vira cinza-escuro coerente com `--page`. Marcadores e controles não são afetados (ficam fora do `tile-pane`). Sem captura visual no spike; conferir manualmente.

## Verification

**Commands:**
- `pnpm --filter web test -- farmacia` -- expected: specs de farmácia passam
- `pnpm typecheck` -- expected: sem erros
- `pnpm exec biome check apps/web/components/farmacia apps/web/app/[portalSlug]/farmacia` -- expected: sem erros

**Manual checks (if no CLI):**
- Página `/farmacia` em 375px e 1280px nos dois temas: sem cartões arredondados, mapa legível, contraste dos textos.

## Auto Run Result

Status: done

- Resumo: Farmácia SUS migrada para o padrão Divisórias (indicadores `divide-x`, abas `border-b-2`, estado vazio `border-y`, links de texto, botões `rounded-md`, mapa com variáveis CSS e tiles escuros via filtro CSS).
- Arquivos: componentes `apps/web/components/farmacia/*`, `page.tsx`, `globals.css` (estilos Leaflet), `architecture/tema-excecoes.json` (entradas removidas), specs atualizados e `farmacia-divisorias.spec.ts` novo.
- Revisão: 5 patches aplicados (4 medium, 1 low), 2 itens adiados, demais rejeitados com motivo no log.
- Revisão de acompanhamento recomendada: false.
- Verificação: `pnpm --filter web test` (1241 passaram), `pnpm typecheck` ok, biome ok nos arquivos da farmácia.
- Riscos residuais: sem verificação visual do mapa escuro e do contraste.

### Review Findings

Revisão de `56406599..HEAD` (4 commits pós-fechamento), 2026-10-25.

- [x] [Review][Decision] Modal sem o aviso "Não aparecer na lista não quer dizer que o remédio acabou" e com "Pela LAI" (sigla) sem "com justificativa" — o design removeu/encurtou; o aviso protege o cidadão de concluir que faltou remédio [farmacia-sentinelas.tsx:112] — resolvido: aviso e prazo por extenso restaurados
- [x] [Review][Patch] Sem teste de `dataEstoque`, `rotuloMunicipio` e `portalUf` no view-model (UF vazia, nome vazio, citação da Lei 8.080/14.654 no texto do pedido) [view-model.spec.ts]
- [x] [Review][Patch] Foco do botão "Buscar" cortado pelo `overflow-hidden` do formulário [farmacia-busca-destaque.tsx:27]
- [x] [Review][Defer] Mapeamento `portalUf` do loader sem spec — deferred: repasse de uma linha, coberto pelo teste do view-model
- [x] [Review][Defer] Teste do botão "Copiado" usa timer real de 2,5 s e não restaura `navigator.clipboard` — deferred: lento mas estável; migrar para timers falsos junto da variante de toggle

#### Rejected

- `false` Perda de `aria-pressed` nas categorias (3 camadas): `SegmentedButton` segmentado aplica `aria-pressed` (segmented-button.tsx) e o spec assertia `aria-pressed="true"`.
- `false` `bg-banbg`/`text-banfg` fora dos tokens: existem em globals.css (`--color-banbg/banfg`).
- `false` Mensagem de erro de cópia invisível: o `<p role="alert">` não é `sr-only`.
- `low` Segundo "Copiar" dentro dos 2,5 s, UF duplicada no nome, data "N/D", rótulo "Copiado" fixo, ícones removidos na variante alerta, erro sem timeout, selo sem borda, `font-mono` (pedido do design): improvável no uso real e a correção adiciona ramos.
- `low` `ModalDialog` `max-w-full` sem teste e edição de `loader.ts`/`view-model.ts`/`packages/ui` fora da Boundaries da spec: pedidas pelo usuário; reverter a spec não cabe nesta revisão.
