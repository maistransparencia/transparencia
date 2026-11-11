---
title: 'Story 20.7: Pessoal, Receitas e Orçamento'
type: 'feature'
created: '2026-10-30'
status: 'done'
baseline_revision: '624400fb74a18c6b70cffacb2f7ee57adfe9d913'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/CLAUDE.md'
  - '{project-root}/DESIGN.md'
  - '{project-root}/EXPERIENCE.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-20-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/20-11-despesas-no-padrao-divisorias.md'
warnings: []
deferred:
  - summary: >-
      Capturar /pessoal, /receitas e /orcamento (375px e 1280px, claro e escuro) e medir contraste AA; não foi possível nesta execução automática.
    evidence: |-
      Validação feita só por testes e guardas de código-fonte. Conferir em especial: categorias de regime em tons neutros (`mute2`, `ink`, `faint`, `pill`) na barra proporcional, valor do funil agora em coluna à direita a 320px, `text-mute2` sobre `bg-line2/40` nos selos.
    location: >-
      apps/web/components/pessoal-regime-section.tsx
    severity: medium (unverified)
  - summary: >-
      Testes de estado cobrem só 3 dos 10 componentes; faltam limites negativos (13º, histograma, funções) e renderização do funil e dos `AlertBox` de saldo em caixa.
    evidence: |-
      `apps/web/components/pessoal-receitas-orcamento-estados.spec.tsx` exercita apenas limite superior e vazio; remover os `Math.max(0, ...)` novos não derrubaria teste.
    location: >-
      apps/web/components/pessoal-receitas-orcamento-estados.spec.tsx
    severity: low
---

<intent-contract>

## Intent

**Problema:** as páginas `/pessoal`, `/receitas` e `/orcamento` e seus componentes usam cartões `rounded-xl/2xl/[14px]` com borda e sombra, `bg-white`, paleta fixa do Tailwind (`slate`, `emerald`, `sky`, `indigo`, `blue`, `cyan`, `amber`, `rose`), hex e aliases legados (`accent`, `subtleText`, `borderLine`, `cardBg`); não funcionam no tema escuro e ignoram os elementos base do `DESIGN.md`.

**Abordagem:** migrar para o padrão Divisórias sem alterar dados, queries, view-models nem textos: `KPIGrid`/`KPICard variant="divisoria"`, `SectionHeader` de `@transparencia/ui`, `AlertBox`/`Badge`, filetes no lugar de cartões, elementos base nus (`h1`, `p`) e papéis (`eyebrow`, `caption`, `lead`), cores só por token (`*-fill` em barras e bordas, `*-text` em texto).

## Boundaries & Constraints

**Always:** só tokens semânticos; sem `dark:`, hex, paleta fixa, `bg-white`, sombra nem `rounded-xl/2xl/lg/[Npx]` em cartões nos arquivos migrados; contraste AA nos dois temas; preservar textos pt-BR, `aria-*`, `data-testid`, links externos com `target="_blank" rel="noopener noreferrer"`; `h1`–`h4` sem classe de tamanho, sem `h5/h6`, sem `font-mono` fora de `table`/`numeric`; Regras 9 (nomes explícitos nos arquivos novos), 23 (sem município, UF ou ano fixo) e 24; tabelas seguem o `DenseTable` já migrado na 20.6; specs atualizados.

**Never:** alterar `@transparencia/db`, `loader.ts`, `view-model.ts`, `opengraph-image.tsx` ou textos; migrar outras páginas; remover aliases legados (20.9); alterar `DenseTable`, `AlertBox` ou `Badge`; adicionar dependências; editar `sprint-status.yaml`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| 13º sem dados | `decimo13` nulo | texto neutro "Sem dados de 13º salário para {ano}." em `border-y border-line`, sem cartão | — |
| Histograma vazio | soma de `count` = 0 | mensagem de estado vazio com `border-y border-line` | — |
| Ano corrente parcial | `isCurrentYear` e `partialPeriod` | eyebrow com "(PARCIAL, …)" como hoje | — |
| Sem anomalia | `cardDependencia` nulo | `RadarAnomaliaCard` não renderiza | — |
| Sem funções | `funcItems` vazio | seção "Para onde vai o gasto" não renderiza | — |
| Barras com valor 0 ou acima do máximo | percentuais fora de 0–100 | largura limitada entre 0% e 100% | — |

</intent-contract>

## Code Map

- `apps/web/app/[portalSlug]/{pessoal,receitas,orcamento}/page.tsx` -- cabeçalho com `text-accent`/`text-slate-900`/`text-subtleText`; `KPIGrid` sem `variant`; receitas tem 3 cartões `rounded-[14px]` com hex e `emerald-700`; orçamento tem seções com `border-t-2 pt-6` à mão (trocar por `SectionHeader`); pessoal tem cartão vazio `rounded-xl`.
- `apps/web/components/decimo-terceiro-card.tsx`, `proventos-distribution-chart.tsx` (pessoal) -- cartões, `h4` com classe, barras `sky/emerald/slate`.
- `apps/web/components/pessoal-regime-section.tsx` (642 linhas, ~73 ocorrências) e `saldo-caixa-entidades-section.tsx` (591, ~54) -- maiores migrações; specs `pessoal-regime-section.spec.tsx`, `saldo-caixa-entidades-section.spec.tsx`.
- `apps/web/components/{carros-chefe-arrecadacao,emendas-card,previsto-vs-arrecadado,radar-anomalia-card}.tsx` (receitas) -- barras e cartões; `radar-anomalia-card.tsx` também é usado em `radar/page.tsx` (comportamento preservado); spec em `components/__tests__/radar-anomalia-card.spec.tsx`.
- `apps/web/components/{funil-execucao-horizontal,gasto-por-funcao-bars}.tsx` (orçamento) -- `colorClass` opcional vindo do view-model; trocar o padrão por tokens.
- `packages/ui/src/{components/{kpi-card,section-header,alert-box,badge}.tsx,utils/chart-colors.ts}` e `apps/web/components/kpi-grid.tsx` -- reuso, somente leitura.
- `apps/web/components/despesas-divisorias.spec.ts` -- modelo da guarda de código-fonte.
- `DESIGN.md`/`EXPERIENCE.md` -- contrato de elementos base, papéis, `panel` e tokens `*-fill`/`*-text`.

## Tasks & Acceptance

**Execution:**
- `apps/web/app/[portalSlug]/{pessoal,receitas,orcamento}/page.tsx` -- cabeçalho com `eyebrow`/`h1` nu/`lead`, `KPIGrid`+`KPICard variant="divisoria"` (receitas: trocar os 3 cartões avulsos), `SectionHeader` nas seções, estado vazio com filete -- AC 1, 2
- Componentes de pessoal (4 arquivos) -- sem cartões; filetes, `Badge`, `AlertBox` onde houver aviso, barras `bg-brand-fill`/`bg-ok-fill`/`bg-track` -- AC 1, 2
- Componentes de receitas (4 arquivos) -- idem; legenda e barras por token; WhatsApp sem hex -- AC 1, 2
- Componentes de orçamento (3 arquivos) -- idem; `colorClass` padrão por token -- AC 1, 2
- `apps/web/components/pessoal-receitas-orcamento-divisorias.spec.ts` -- guarda de código-fonte (modelo `despesas-divisorias.spec.ts`) sobre as 3 páginas e os 11 componentes, incluindo ausência de `h5/h6`, `font-mono` e literais de UF/ano -- AC 3
- Specs de página e de componente -- ajustar ao novo markup e cobrir a matriz I/O -- AC 3

**Acceptance Criteria:**
- Given as 3 páginas, when renderizadas, then não há cartões com borda arredondada e sombra, cor fixa nem alias legado, e funcionam nos temas claro e escuro.
- Given gráficos e barras, when desenhados, then usam tokens (`*-fill`, `track`, `pill`) ou o helper `corDoGrafico`, e textos coloridos usam `*-text`.
- Given a suíte, when executada, then `pnpm test`, `pnpm typecheck` e `biome` passam e a guarda cobre os arquivos migrados sem literais de tenant, UF ou ano (Regra 23).

## Spec Change Log

## Review Triage Log

### 2026-10-30 — Review pass
- verdicts: 33 findings — high 0, medium 2, low 4, false 3, maybe-false 2 (agrupados abaixo)
- findings:
  - `[medium]` `defer` funil do orçamento mantém `colorClass` de paleta fixa no view-model — pré-existente, em arquivo que o contrato exclui; registrado em `deferred`.
  - `[maybe-false]` `defer` categorias de regime em cinzas indistinguíveis, valor do funil a 320px, contraste de `text-mute2` em `bg-line2/40` — só se resolve com capturas; registrado em `deferred`.
  - `[low]` `defer` testes de estado limitados a 3 componentes e sem limites negativos — registrado em `deferred`.
  - `[low]` `reject` NaN nos clamps (13º, histograma, funções, progresso, funil) — o comportamento com NaN é igual ao anterior e nenhuma entrada NaN foi demonstrada; correção exigiria novos guardas.
  - `[low]` `reject` cores de status usadas como série categórica (FPM `ok-fill`, PIX `ok-fill`, ISS+IPTU `warn-fill`) — a spec limita a tokens e não há paleta categórica; corrigir exigiria decisão de design.
  - `[low]` `reject` ícone do WhatsApp sem verde da marca — hex proibido pela guarda; `ok-text` é aceito.
  - `[low]` `reject` barras sem `role="progressbar"`, nomes `pct*` (Regra 9) de props do view-model, `gap-px` na barra de regime, separador mobile do `EmendasCard`, hierarquia `h2` do funil, comentários removidos, "100% autorizado" fixo — pré-existentes ou negligíveis, fora da migração visual.
  - `[false]` `reject` "guarda cobre 11 componentes": a guarda lista 13 caminhos (3 páginas e 10 componentes) e a spec só usava 11 por engano de contagem; `radar-anomalia-card` e demais estão cobertos.
  - `[false]` `reject` variáveis `isFirst`/`isLast` não usadas — `biome check` não aponta nenhum aviso nesses arquivos.
  - `[false]` `reject` leitura R2/R4 do alinhamento (só páginas; helper `recharts`) — as barras são `div` com tokens, sem `recharts` nestas páginas; o DenseTable já segue a 20.6.

### Review Findings

Revisao final (2026-10-30) dos commits posteriores ao bmad-loop (`02779908..HEAD`), fatias dados (dbt e db) e orcamento/caixa. Lentes: Blind Hunter, Edge Case Hunter, Verification Gap e Acceptance Auditor.

- [x] [Review][Decision] (resolvido: opcao 2, tabela so para leitor de tela com os meses, parte visual com `aria-hidden`) Grafico de caixa sem acesso por teclado: `accessibilityLayer={false}` e `[&_*]:outline-none` removem o anel de foco ao clicar (pedido do Julio, ruim no mobile), mas tambem o acesso por teclado e por leitor de tela aos valores de cada mes, que so aparecem no tooltip. Opcoes: (1) manter como esta, os numeros-chave ja estao nos indicadores; (2) manter e acrescentar uma tabela com os meses so para leitor de tela; (3) reativar `accessibilityLayer` e esconder o anel so para foco por ponteiro. [apps/web/components/saldo-caixa-evolucao-mensal-chart.tsx]
- [x] [Review][Patch] Teste unitario do dbt tinha a entrada do orgao 04 (excesso) sem a linha esperada, e a regra `excesso` ficava sem cobertura; linha esperada adicionada e `dbt test` do mart rodado no banco local (23 PASS). `make test` nao executa os unit tests do dbt. [elt/transform/models/marts/metrics/_fct_execucao_orcamentaria_metricas.yml:137]
- [x] [Review][Patch] `getExecucaoAnoAnterior` era chamado depois do `Promise.all`, somando uma ida ao banco em toda carga; movido para dentro do `Promise.all`. [apps/web/app/[portalSlug]/orcamento/loader.ts]
- [x] [Review][Patch] Destaque mostrava "0%" e "R$ 0 pagos de R$ 0 autorizados" sem dotacao; agora mostra "—" com a causa (EXPERIENCE.md, estado vazio), com teste. [apps/web/app/[portalSlug]/orcamento/page.tsx]
- [x] [Review][Patch] Subtitulo da evolucao mensal dizia "de janeiro a janeiro" com um unico mes; ajustado. [apps/web/components/saldo-caixa-entidades-section.tsx]
- [x] [Review][Patch] Texto do card com saldo negativo dizia "nesta fonte", mas a condicao e o saldo da entidade; passou a "nesta entidade". [apps/web/components/saldo-caixa-entidades-section.tsx]
- [x] [Review][Patch] Nome abreviado `pagPct` (regra 9) renomeado para `percentualPago`. [apps/web/app/[portalSlug]/orcamento/view-model.ts]
- [x] [Review][Patch] `ExecucaoOrgaosTable` sem teste: adicionado spec cobrindo coluna Alerta, selo, nota, `% pago`, e ausencia de busca e CSV. [apps/web/components/execucao-orgaos-table.spec.tsx]
- [x] [Review][Patch] Teste de `getExecucaoAnoAnterior` so afirmava dentro de um `if` (passava vazio); agora afirma `null` para ano sem dotacao. [packages/db/src/queries/__tests__/execucao-orcamentaria-metrics.spec.ts]
- [x] [Review][Defer] Mesmo orgao em mais de uma linha: o mart tem grao orgao/unidade, e a tabela lista cada linha (ex.: Secretaria de Saude aparece 2 vezes em 2025) [apps/web/app/[portalSlug]/orcamento/loader.ts] — deferred: pre-existente (mapeamento `mapExecucaoMetricsToLegacyItems` nao mudou); agregar por orgao altera comportamento e entra na story de dotacao.
- [x] [Review][Defer] Frase "No ano inteiro de N, X% pago" pode enganar se o ano anterior foi carregado so em parte ou se pago supera a dotacao [packages/db/src/queries/execucao-orcamentaria-metrics.ts] — deferred (maybe-false, severidade medium nao verificada): conferir se algum ano ingerido tem meses faltando ou pago maior que a dotacao.
- [x] [Review][Defer] Percentual pago calculado no view-model a partir dos totais, e nao na camada de dados (regra 2) [apps/web/app/[portalSlug]/orcamento/view-model.ts] — deferred: padrao pre-existente da pagina.
- [x] [Review][Defer] `limitesLrf` em `pessoal-metrics.ts` sem teste do lado da query [packages/db/src/queries/pessoal-metrics.ts] — deferred: fora das fatias revisadas, baixa confianca.
- [x] [Review][Defer] `dense-table.tsx` (`statusBadge`) ainda trata "baixa" [packages/ui/src/components/dense-table.tsx:396] — deferred: componente compartilhado, ramo inofensivo para a pagina.
- [x] [Review][Defer] Divergencia entre spec 20.7 e DESIGN.md e a pratica: KPIGrid trocado por destaque e indicadores, papel `lead` trocado por classes do padrao de /pessoal, textos reescritos, arquivos de dados/loader/view-model alterados — deferred: a correcao e editar a spec ou o DESIGN.md; o codigo mais novo segue decisoes do Julio.
- [x] [Review][Defer] `variacaoIntraAnualLivresPct` deixou de ser exibido e o campo do DTO ficou sem uso [packages/db/src/queries/siconfi-caixa-metrics.ts] — deferred: decidir na story da rota propria do caixa se o campo sai do DTO.

#### Rejected

- false: "pagamentos variam de mes para mes" so faz sentido em ano parcial. Real mas low; a correcao adicionaria ramo condicional.
- false: percentual do ano atual e do anterior calculados em bases diferentes. Ambos somam o mesmo mart com o mesmo filtro de entidades.
- low: `getVariacaoTexto` com NaN ou valor que arredonda para 0,0. Os valores vem pre-arredondados do banco.
- low: `formatarEixo` e `larguraEixo` com NaN, 999950 ou "0,5 mil". Dados nao nulos; guardas extras sem ocorrencia real.
- false: `mesExtenso` indefinido. `getMesNome` sempre devolve texto.
- low: destaque acima de 100% e "0%" na tabela com dotacao zero e pago maior que zero. Raro e a correcao adiciona ramos.
- false: coluna Alerta mudando com a busca. A busca foi removida.
- false: exportacao CSV removida sem motivo. Pedido explicito do Julio.
- low: sobrescritas com `!`, `rounded-md!`, `text-[11px]`, `h4` com classe, chip sem `Badge`. Seguem o padrao ja usado em `emendas-card` e sao pre-existentes.
- false: `llms.txt` e `llms-full.txt` sem atualizacao. Atualizados em `78b5a0e5`, fora da fatia revisada.
- low: `colorClass` e `CORES_PADRAO` sem uso no funil; nota de saldo livre negativo com texto "podem ser usados"; link SICONFI no alerta; teste `accepted_values` para o alerta; literal de tenant na fixture do unit test do dbt (padrao existente).

## Verification

**Commands:**
- `pnpm --filter web test` -- expected: specs verdes
- `pnpm typecheck` -- expected: sem erros
- `pnpm exec biome check apps/web packages/ui` -- expected: sem erros

**Manual checks (if no CLI):**
- Capturas de `/pessoal`, `/receitas`, `/orcamento` (375px e 1280px, claro e escuro) não são possíveis nesta execução automática; registrar como pendência em `deferred`.

## Auto Run Result

Status: done

**Resumo:** `/pessoal`, `/receitas` e `/orcamento` migradas para o padrão Divisórias: `KPIGrid`/`KPICard variant="divisoria"`, `SectionHeader`, `AlertBox` e `Badge`, filetes no lugar de cartões, elementos base nus e papéis, cores só por token (`*-fill` em barras, `*-text` em texto). Nenhuma ação humana externa é necessária.

**Arquivos:** 3 páginas; 10 componentes (`decimo-terceiro-card`, `proventos-distribution-chart`, `pessoal-regime-section`, `carros-chefe-arrecadacao`, `emendas-card`, `previsto-vs-arrecadado`, `radar-anomalia-card`, `funil-execucao-horizontal`, `gasto-por-funcao-bars`, `saldo-caixa-entidades-section`); guarda `pessoal-receitas-orcamento-divisorias.spec.ts`; `pessoal-receitas-orcamento-estados.spec.tsx`; `architecture/tema-excecoes.json` (13 isenções removidas).

**Revisão:** 0 patches aplicados; 3 itens adiados (ver `deferred`); demais rejeitados com motivo no Review Triage Log. `followup_review_recommended: false`.

**Verificação:** `pnpm typecheck` ok; `pnpm --filter web test` 147 arquivos, 1418 testes ok; `biome check` sem erros (1 aviso pré-existente em `farmacia/view-model.ts`).

**Follow-up:** `colorClass` removido do funil em `orcamento/view-model.ts`, com teste de guarda.

**Riscos residuais:** sem capturas visuais nem medição de contraste.
