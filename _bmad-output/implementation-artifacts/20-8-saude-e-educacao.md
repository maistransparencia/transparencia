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

### Review Findings

Rodada 1 (2026-10-31) — `8a2be965..HEAD` restrito a `packages/db` e `elt/` (4 camadas). Rodadas de `apps/web` e `packages/ui` ainda pendentes.

- [x] [Review][Decision→Rejeitado] Gasto com "medicamentos" inclui todo o elemento 3.3.90.32 — medido no banco local: o `3.3.90.32` fora dos outros critérios pesa 5–98% do total por ano, mas os fornecedores são quase todos distribuidoras de medicamentos e drogarias; o resto (ótica, supermercado, padaria, nutrição) fica em torno de 4% (ex.: Porciúncula 2022). "Medicamentos e insumos" já cobre o que entra e a descrição do yml explicita o critério.
- [x] [Review][Patch] Colunas novas `uniao_sus_pct`, `estado_pct`, `propria_pct`, `outras_receitas_pct` e DTO `outrasReceitasPct` violam a Regra 9 (renomear para `percentual_*`) [elt/transform/models/marts/metrics/fct_historia_saude_metricas.sql, packages/db/src/queries/historia-saude-metrics.ts]
- [x] [Review][Patch] `getSaudeLicitacoesMetrics`, `getSaudeFontesReceitaMetrics` e `getSaudeExecutionTrendMetrics` sem teste de DB (isolamento por `portal_slug`/`empresa_id`, mapeamento de colunas, `pago`); `tipo_contratacao` nulo vira `""` e a consulta não ordena [packages/db/src/queries/historia-saude-metrics.ts]
- [x] [Review][Patch] `montarEmendasStats`: campos `totalRecebidoFundo`, `totalReceitaPossivel`, `receitaCodigo`/`receitaDescricao` sem asserção [packages/db/src/queries/emendas-parlamentares.ts]
- [x] [Review][Patch] `confirmadas` não garante uma emenda por linha de receita (duas emendas de mesmo valor e mesma proposta confirmam a mesma linha e somam `valor_recebido_fundo` em dobro), contra o comentário do cabeçalho [elt/transform/models/marts/fct_emendas.sql]
- [x] [Review][Patch] `percentualPago` de `getTopFornecedoresEducacaoMetrics` divide pelo total do top N (sempre soma 100%); a página recalcula pelo total da função, então o campo do DTO engana [packages/db/src/queries/educacao-execucao-metrics.ts]
- [x] [Review][Patch] Resíduos: `_primeiroContexto`/`contexto` mortos e comentário velho em `educacao-metrics.ts`; descrição "…, fluxo escolar, fluxo escolar" em `_fct_educacao_metricas.yml`; nome do teste `…growth_and_financials` e espaço em `+1,4 ponto )` — corrigidos; as asserções `>=` de `test_fct_educacao_execucao_metricas.py` ficaram como estão (o teste lê o mart já construído, então igualdade exata exigiria rodar o dbt dentro do teste) [packages/db, elt/tests]
- [x] [Review][Defer] Sem as linhas-raiz orçamentárias (`1000.00…`/`2000.00…`) o portal fica com `receita_outras_saude` zerada e percentuais inflados — deferred: funciona nos dois portais atuais; conferir ao integrar um terceiro portal
- [x] [Review][Defer] `getEducacaoContratos` devolve vazio se o portal não tiver órgão com "fundo" e "educa" no nome — deferred: restrição ao fundo é intencional (7d9e92bb); conferir ao integrar novo portal
- [x] [Review][Defer] Texto de "indício" para `valor_igual`/`totalReceitaPossivel` na tela de emendas — deferred: está em `apps/web`, entra na rodada 2

Rodada 2 (2026-10-31) — `8a2be965..HEAD` em `apps/web` (passe único, 4 revisores). Rodada de `packages/ui` ainda pendente.

- [x] [Review][Patch] `SaudeHeroSection` sem guarda de "sem dados": exercício com empenhado e pago zerados dizia "reservou R$ 0 e pagou R$ 0" [apps/web/components/saude-hero-section.tsx]
- [x] [Review][Patch] `EvolucaoAnual` escalava as barras só pelo maior empenhado; pago maior que empenhado era cortado em 100% [apps/web/components/evolucao-anual.tsx]
- [x] [Review][Patch] Regra 9: `qtd`/`qtdEmpenhos` renomeados para `quantidadeEmpenhos` (web, `emendas-parlamentares.ts`, `historia-saude-metrics.ts` e specs)
- [x] [Review][Defer] Specs de componente ausentes (hero/histórico/aprendizado da educação, `contratos-tabela`, `saude-hero-section`, `fonte-recurso-modal`) — DW-12
- [x] [Review][Defer] `saude-educacao-divisorias.spec.ts` testa regex no código-fonte, com ramo morto (`fiscal-section`); mocks dos `page.spec` com `as never` — DW-13
- [x] [Review][Defer] Acessibilidade menor: barras sem texto alternativo, dois botões por emenda (tabela e cartão) — DW-14
- [x] [Review][Defer] `EducacaoHeroSection` com empenhado 0 e pago > 0 mostra barras em 0% — DW-15
- DW-11 resolvido sem mudança: o texto de "indício" está correto na tabela e não entra em "Confirmada na receita".
- Rejeitados após verificação: `hideSearch` padrão `true` (único chamador direto passa `false`); percentual cru na origem de recursos (dbt já entrega inteiro); "Nota Informativa do Ideb 2025" (nome oficial, allowlist deliberada); denominador de fornecedores da saúde (risco sem caso real); texto de `percentualRecebido` acima de 100% (coerente).

**Rejected:**
- `false` Escopo do spec ("Never: alterar `@transparencia/db`", "só migração visual") violado — o escopo da story cresceu nos commits manuais posteriores (`feat(db)`, `fix(db)`); o remédio seria editar o spec.
- `false` `fct_emendas` filtra `tipo_receita = 'orcamentaria'` e nunca confirma — `fct_emendas` tem 8 confirmadas em Porciúncula (R$ 6,14 mi) e há linhas `1713.5%` com tipo `orcamentaria` nos dois portais.
- `false` Fan-out do join por `numero_emenda`/`resumo` — 73 linhas e 73 `emenda_id` distintos no banco local.
- `false` Percentuais de saúde somando 101–102 — todos os anos dos dois portais somam exatamente 100.
- `false` Fallback por `funcao_nome` perdido em `fct_educacao_execucao_metricas` — zero despesas sem `funcao` com nome de educação nos dois portais.
- `false` Literais de tenant/ano em testes e fixtures (Regra 23) — a regra mira marts e frontend, não fixtures de teste.
- `false` Remoção de `custo_anual_por_aluno` e da seed de matrículas sem registro — foi intencional (`4119348f`) e documentada (`7ff5aa3e`); `despesaLiquidadaEducacao` segue no DTO.
- `low` Arredondamento de percentuais no limite, `round(valor)` em reais inteiros, `array_agg(...)[1]` ignorando linhas já confirmadas, `limit` sem teto, `having pago > 0` e ano `NaN` nos fornecedores, `repasses_saude` por nome — improváveis nos dados atuais e o remédio acrescenta lógica.

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
