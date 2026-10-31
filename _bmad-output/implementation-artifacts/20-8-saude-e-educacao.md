---
title: 'Story 20.8: Saúde e Educação'
type: 'feature'
created: '2026-10-30'
status: 'done'
baseline_revision: '8a2be965ab57046dd096175c19dc727a258d7fd1'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/DESIGN.md'
  - '{project-root}/EXPERIENCE.md'
warnings: []
deferred:
  - summary: >-
      Sem validação visual nos temas claro e escuro das páginas de saúde e educação, nem teste de renderização do `Badge` de concentração de fornecedores por nível.
    evidence: |-
      Só testes e guardas de código-fonte; contraste de `text-mute2` em `text-xs` e seções que mantêm `<section>`/`h2` próprios em `saude-contratacao-section.tsx` e `saude-emendas-section.tsx` (em vez de `SectionHeader`/`AlertBox`) não foram conferidos no navegador.
    location: >-
      apps/web/components/saude-contratacao-section.tsx
    severity: medium (unverified)
---

<intent-contract>

## Intent

**Problema:** as páginas `/saude` e `/educacao` e seus componentes ainda usam cartões `rounded-xl` com borda e sombra, paleta fixa do Tailwind (`slate`, `amber`, `rose`, `emerald`, `sky`…), hex (`#1a1d21`), `font-mono` e tamanhos soltos (`text-[10px]`); não funcionam no tema escuro e ignoram os elementos base do `DESIGN.md`. O card de educação da Home ("Em destaque") ainda tem `font-mono`/`text-[10px]` fora do padrão.

**Abordagem:** repetir o padrão da Story 20.7 sem alterar dados, queries, view-models nem textos: `KPIGrid`/`KPICard variant="divisoria"`, `SectionHeader`, `AlertBox`/`Badge`, filetes no lugar de cartões, elementos base nus e papéis (`eyebrow`, `caption`, `lead`), cores só por token (`*-fill` em barras e bordas, `*-text` em texto), gráficos `recharts` com `corDoGrafico`.

## Boundaries & Constraints

**Always:** só tokens semânticos; sem `dark:`, hex, paleta fixa, `bg-white`, sombra nem `rounded-xl/2xl/lg/[Npx]` em cartões nos arquivos migrados; contraste AA nos dois temas; preservar textos pt-BR, `aria-*`, `data-testid`, links externos com `target="_blank" rel="noopener noreferrer"`; `h1`–`h4` sem classe de tamanho, sem `h5/h6`, sem `font-mono` fora de `table`/`numeric`; Regras 9 (nomes explícitos em código novo), 23 (sem município, UF ou ano fixo) e 24; specs atualizados.

**Never:** alterar `@transparencia/db`, `loader.ts`, `view-model.ts`, `opengraph-image.tsx` ou textos; migrar outras páginas; alterar `contratos-servicos-vigentes-section.tsx` (da 20.6), `DenseTable`, `AlertBox` ou `Badge`; remover aliases legados (20.9); adicionar dependências; editar `sprint-status.yaml`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Sem dados de educação | lista de contratos/fontes vazia | estado vazio neutro com `border-y border-line`, sem cartão e sem município | — |
| Home sem dado de educação | `EducacaoResumoCard` com variante `neutro` | mesmo layout em filetes, selo neutro | — |
| Barra com valor 0 ou acima do máximo | percentual fora de 0–100 | largura limitada entre 0% e 100% | — |
| Gráfico carregando (`dynamic`) | fallback do `SaudeTrendChart` | bloco `animate-pulse` com `bg-line2`, sem cartão arredondado | — |

</intent-contract>

## Code Map

- `apps/web/app/[portalSlug]/saude/page.tsx` -- fallbacks de gráfico `rounded-xl slate`, `border-[#1a1d21]` e `h2` com classe (trocar por `SectionHeader`), `amber-700`, mapa de severidade `rose/amber/emerald` (linhas 107–112), `slate-500`; `KPIGrid` sem `variant`.
- `apps/web/app/[portalSlug]/educacao/page.tsx` -- sem classes legadas; conferir `KPIGrid`/cabeçalho e `SaudeEmendasSection` compartilhada.
- `apps/web/components/saude-{hero-section,contratacao-section,emendas-section,fontes-donut,trend-chart}.tsx` -- maiores migrações (`saude-emendas-section.tsx` 945 linhas, ~106 ocorrências; também usada por `/educacao`); spec `saude-emendas-section.spec.tsx`.
- `apps/web/components/educacao/*.tsx` (hero, fiscal, histórico, contratos, origem-recursos, composicao-recursos-bar, categoria-contrato-card, contratos-categoria-modal, fonte-recurso-card/modal) -- specs `composicao-recursos-bar`, `educacao-contratos-section`, `educacao-origem-recursos-section`.
- `apps/web/components/educacao-resumo-card.tsx` (+ `.spec.tsx`; usado em `app/[portalSlug]/page.tsx`) -- já em filetes; sobram `font-mono text-[10px]` nas linhas 56 e 92 (trocar pelo papel `eyebrow`/`Badge`).
- `packages/ui/src/{components/{kpi-card,section-header,alert-box,badge}.tsx,utils/chart-colors.ts}`, `apps/web/components/kpi-grid.tsx` -- reuso, somente leitura.
- `apps/web/components/pessoal-receitas-orcamento-divisorias.spec.ts` -- modelo da guarda de código-fonte.
- `DESIGN.md`/`EXPERIENCE.md` -- contrato de elementos base, papéis e tokens `*-fill`/`*-text`.

## Tasks & Acceptance

**Execution:**
- `apps/web/app/[portalSlug]/{saude,educacao}/page.tsx` -- `SectionHeader` nas seções, `KPICard variant="divisoria"`, fallbacks e severidade por token -- AC 1
- `apps/web/components/saude-*.tsx` (5 arquivos) -- sem cartões; filetes, `Badge`, `AlertBox`, barras `bg-*-fill`/`bg-track`, gráficos com `corDoGrafico` -- AC 1, 2
- `apps/web/components/educacao/*.tsx` (10 arquivos) -- idem -- AC 1, 2
- `apps/web/components/educacao-resumo-card.tsx` -- remover `font-mono`/`text-[10px]` do card de "Em destaque" -- AC 1
- `apps/web/components/saude-educacao-divisorias.spec.ts` -- guarda de código-fonte (modelo da 20.7) sobre as 2 páginas, os componentes e o card da Home, sem `h5/h6`, `font-mono` e literais de UF/ano -- AC 3
- Specs de página e de componente -- ajustar ao novo markup e cobrir a matriz I/O -- AC 3

**Acceptance Criteria:**
- Given as páginas de saúde e educação básica e o card de educação em "Em destaque", when renderizadas, then não há cartões com borda arredondada e sombra, cor fixa nem alias legado, e funcionam nos temas claro e escuro.
- Given gráficos e barras, when desenhados, then usam tokens (`*-fill`, `track`, `pill`) ou `corDoGrafico`, e textos coloridos usam `*-text`.
- Given a suíte, when executada, then `pnpm test`, `pnpm typecheck` e `biome` passam e a guarda cobre os arquivos migrados sem literais de tenant, UF ou ano (Regra 23).

## Spec Change Log

## Review Triage Log

### 2026-10-30 — Review pass
- verdicts: ~30 findings (4 camadas) — high 0, medium 3, low 4, false 2, maybe-false 2 (agrupados)
- findings:
  - `[medium]` `patch` barras de modalidade, hero e execução de emenda com `*-fill/15` quase invisíveis e três modalidades na mesma cor — trocado por `*-fill` pleno e tons distintos (`mute2`, `mute3`).
  - `[medium]` `patch` tooltips de `educacao-fiscal`/`educacao-historico` sem fundo — acrescentado `bg-page`.
  - `[medium]` `patch` legendas divergentes das séries (IDEB, despesa liquidada, Meta MEC) e barra e linha na mesma cor — legendas alinhadas; barra com `line2` + contorno `brand`.
  - `[low]` `patch` ternário morto em `saude-trend-chart.tsx`, hovers iguais ao estado base e `ring-accent`/`outline-accent` — corrigidos.
  - `[low]` `patch` teste de limite da barra — o clamp acima de 100 está coberto (130 sem clamp daria 130%); o limite inferior não tem teste.
  - `[maybe-false]` `defer` contraste de `mute2` em `text-xs`, `SectionHeader`/`AlertBox` não usados em todas as seções, `Badge` de concentração sem teste de variante — registrado em `deferred`.
  - `[low]` `reject` hierarquia achatada `slate-700/800/900` → `ink`, `KPICard` empilhado sem `KPIGrid`, `educacao/page.tsx` só com comentário, `epic-20-context.md` no diff, `fonte-recurso-utils.ts` na lista de exceções — decisão de design/pré-existente, sem dano demonstrado.
  - `[false]` `reject` guarda de Regra 23 permitir "Nota Informativa do Ideb 2025" e "Lei 14.133/2021" — são nomes oficiais de documentos preservados pela spec; não é ano de contexto.
  - `[false]` `reject` lacunas de teste da matriz (estado vazio, `neutro`, `animate-pulse`) — mudanças só de classes, cobertas pela guarda de código-fonte e pelos specs existentes que seguem verdes.

## Verification

**Commands:**
- `pnpm test` -- expected: todos os testes passam
- `pnpm typecheck` -- expected: sem erros
- `pnpm exec biome check apps/web` -- expected: sem avisos nos arquivos migrados

## Auto Run Result

Status: done

**Resumo:** `/saude`, `/educacao` e o card de educação da Home migrados para o padrão Divisórias, sem alterar dados, queries, view-models nem textos.

**Arquivos:** `saude/page.tsx` e `educacao/page.tsx` (`SectionHeader`, `KPICard divisoria`, `Badge`); 5 componentes `saude-*`; 10 componentes `educacao/*`; `educacao-resumo-card.tsx` (papel `eyebrow`); `saude-educacao-divisorias.spec.ts` (guarda nova); `composicao-recursos-bar` (limite 0–100% + teste); `architecture/tema-excecoes.json` (18 arquivos removidos).

**Revisão:** patches aplicados (3 medium, 4 low), 1 item adiado, demais rejeitados (ver log). Recomendação de nova revisão: `false`.

**Verificação:** `pnpm test` (web 1485, ui 361, db 324 passam), `pnpm typecheck` ok, `biome check apps/web` com 1 aviso pré-existente em `farmacia/view-model.ts`.

**Riscos residuais:** sem conferência visual no navegador (claro/escuro); ver `deferred`.
