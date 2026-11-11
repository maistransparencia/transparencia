---
title: 'Story 20.4: Baseline Visual e Home no Padrão Divisórias'
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_revision: '908d83ba6a8bad1e0c1ee69ff56ea33c1ef6b4de'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/CLAUDE.md'
  - '{project-root}/.claude/rules/web.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-20-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/20-3-componentes-de-packages-ui-no-padrao-divisorias.md'
warnings: ['multiple-goals', 'oversized']
deferred:
  - summary: >-
      playwright.config.ts e o spec visual usam process.env direto (regra 17).
    evidence: |-
      Arquivos de configuracao/teste fora do bundle do app; migrar para @/env exige resolver o alias fora do Next.
    location: >-
      apps/web/playwright.config.ts
    severity: low
  - summary: >-
      Sem entrada no CHANGELOG.md para a migracao visual da Home.
    evidence: |-
      Mudanca visivel ao cidadao; tratar no fechamento do epico 20 com a skill changelog-transparencia.
    severity: low
---

<intent-contract>

## Intent

**Problema:** a Home municipal (`apps/web/app/[portalSlug]/page.tsx`) ainda usa cartões `rounded-2xl/[14px] border shadow-sm`, hex e paleta fixa do Tailwind, cabeçalhos de seção reimplementados à mão e `space-y-9`; não existe baseline visual; e a revisão da 20.3 deixou ajustes pendentes nos componentes de `packages/ui` que a Home vai consumir.

**Abordagem:** (1) resolver os ajustes herdados da 20.3 em `packages/ui`; (2) criar a baseline visual (Playwright, claro/escuro, desktop/mobile) capturada **antes** de migrar a Home; (3) migrar as seções da Home para `SectionHeader`, colunas com filete, espaçamento 104px/64px e fundo branco, sem alterar dados, queries ou textos.

## Boundaries & Constraints

**Always:** só tokens semânticos (`ink`, `line`, `mute2`, `page`, `pill`...); sem `dark:` e sem hex; `corDoGrafico`/`coresDoGrafico` para cores de barras/gráficos; nomes explícitos (regra 9); sem município, UF ou ano fixos (regra 23); `variant` ausente em `KPICard`/`SegmentedButton` continua com o comportamento atual; nova API só retrocompatível; exportar novidades em `packages/ui/src/index.ts`; ao migrar um arquivo, remover suas entradas de `apps/web/architecture/tema-excecoes.json` (a lista só encolhe); dependência nova com versão exata (regra 7); comandos só contra o banco local (regra 15); textos pt-BR da Home preservados.

**Never:** alterar queries, `loader.ts`, `view-model.tsx` (dados/textos) ou `@transparencia/db`; migrar outras páginas; remover aliases legados nem o `SectionHeader` de `apps/web/components/section-header.tsx` (20.9); tocar `DenseTable`; incluir o teste visual em `make test`/CI padrão; migrar `app/municipal-landing-client.tsx` (é a seleção de cidade da raiz `/`, não a Home do município) — apenas lê-lo como referência.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| SectionHeader sem opcionais | `description`/`action` ausentes, `""` ou `0` | não renderiza o bloco | — |
| SectionHeader nível | `as="h1"\|"h2"\|"h3"` (padrão `h2`) | tag correspondente | — |
| ExternalLinkPill href inválido | `href` não `http(s)` (ex.: `javascript:`) | não renderiza link navegável (renderiza texto simples) | — |
| KPICard divisoria vazio | `subtext`/`trend` vazios ou `0` | omite rodapé | — |
| Tendência invertida | métrica em que subir é ruim | cor da tendência invertida via prop | — |
| Home sem dados de seção | seção retorna `null` hoje | continua `null`, sem cabeçalho órfão | — |

</intent-contract>

## Code Map

- `packages/ui/src/components/{modal-dialog,section-header,external-link-pill,kpi-card,segmented-button,badge}.tsx` e `packages/ui/src/utils/chart-colors.ts` -- alvos dos ajustes herdados; specs em `__tests__/` e `utils/__tests__/chart-colors.spec.ts` (hoje único consumidor de `corDoGrafico`).
- `packages/ui/src/index.ts` -- barrel; teste de que exporta os componentes novos.
- `apps/web/app/[portalSlug]/page.tsx` -- Home: wrapper `space-y-9`; cabeçalho inline "Em destaque" (linhas ~63-71, `border-[#1a1d21] border-t-2`); ordem: `HeroFiscalCard`, Em destaque (`FarmaciaResumoCard`, `ObrasResumoCard`, `EducacaoResumoCard`), `RadarCivicoFeed`, `PipelineExecucao`, `SaldoCaixaResumoCard`, `CardsSecundariosVisaoGeral`.
- `apps/web/components/{hero-fiscal-card,radar-civico-feed,destaque-linha,pipeline-execucao,saldo-caixa-resumo-card,cards-secundarios-visao-geral,obras-resumo-card,educacao-resumo-card}.tsx` e `components/farmacia/farmacia-resumo-card.tsx` -- usam `rounded-* border shadow-sm bg-white`, hex e paleta fixa; cabeçalhos reimplementados em `radar-civico-feed` (~113-121) e `pipeline-execucao` (~32-34). Restos a Pagar, Licitações e Pessoal são 3 cartões dentro de `cards-secundarios-visao-geral.tsx`.
- Gráficos da Home são barras/funis em `div` com cor fixa (não há recharts na Home): migrar cores para `coresDoGrafico`/`corDoGrafico`.
- `apps/web/app/[portalSlug]/view-model.tsx` -- só monta dados; contém classes de tom (paleta fixa) em `tema-excecoes.json`: alterar **somente** classes/tokens de cor, nunca dados ou textos.
- `apps/web/architecture/{tema.spec.ts,tema-excecoes.json}` -- guarda de tema; `page.tsx`, `hero-fiscal-card`, `pipeline-execucao`, `cards-secundarios` usam `rounded-[14px]`/`2xl` mas podem não ser detectados por `raio-antigo`: conferir a varredura.
- `apps/web/app/[portalSlug]/page.spec.tsx` e specs ao lado dos componentes -- atualizar.
- Sem infraestrutura visual hoje (sem playwright/config/e2e). Chromium já está em `~/Library/Caches/ms-playwright`; banco local em `localhost:5544` ativo.

## Tasks & Acceptance

**Execution:**
- `packages/ui/src/components/modal-dialog.tsx` + spec -- cabeçalho/rodapé distintos do corpo; hover/ativo e `focus-visible` nos botões fechar/voltar; testes de bottom sheet mobile (`max-sm:rounded-b-none`) e do botão voltar -- AC 6.
- `packages/ui/src/components/section-header.tsx` + spec -- prop de nível do título (`h1|h2|h3`, padrão `h2`); omitir `description`/`action` vazios ou `0`; testes de opcionais ausentes -- AC 6.
- `packages/ui/src/components/external-link-pill.tsx` + spec -- `sr-only` "abre em nova aba"; aceitar só `http`/`https`; testes de `className` e props extras -- AC 6.
- `packages/ui/src/components/kpi-card.tsx` + spec -- documentar precedência `accent` x `alert`; tratar `subtext`/`trend` vazios/`0`; prop para inverter cor da tendência; extrair rodapé compartilhado com a variante padrão -- AC 6.
- `packages/ui/src/utils/chart-colors.ts` + spec -- trocar lista de exclusão por lista de permissão; testar que todo token permitido resolve para `var(--...)` e que aliases legados são rejeitados pelo tipo -- AC 6.
- `packages/ui/src/components/segmented-button.tsx` + spec -- `tabs` sem `aria-pressed` ambíguo (usar `role="tab"`/`aria-selected` ou nenhum atributo de pressão), contraste `muted` (`mute3`) validado pelo teste da 20.1, hover visível, `focus-visible:ring-inset`, estilo `disabled`, testes de `size` -- AC 6.
- `packages/ui/src/components/__tests__/{badge,tokens-claro-escuro,index-exports}.spec.*` -- corrigir título do teste do `Badge`; teste de renderização claro/escuro dos tokens migrados; teste de que `index.ts` exporta os componentes novos; preferir comportamento a nome de classe onde houver foco/clique/ausência de rodapé -- AC 6.
- `apps/web/playwright.config.ts`, `apps/web/e2e/visual/home.visual.spec.ts`, `apps/web/package.json` (`@playwright/test` exato, script `test:visual`), `.gitignore` se preciso -- baseline da Home em claro/escuro × desktop (1280)/mobile (375) via `toHaveScreenshot`, contra o servidor local e portal existente no banco local (slug lido por `getAllPortais()`/variável de ambiente, nunca literal); alternância de tema pelo mecanismo da 20.2; **gerar e versionar os PNGs antes de migrar a Home** (commit próprio) -- AC 1.
- `apps/web/app/[portalSlug]/page.tsx` -- usar `SectionHeader` de `packages/ui` em "Em destaque" e nas demais seções; espaçamento entre seções `gap`/`space-y` de 64px (mobile) e 104px (`md:`/desktop); fundo `bg-page` branco -- AC 2.
- `radar-civico-feed.tsx`, `pipeline-execucao.tsx`, `saldo-caixa-resumo-card.tsx`, `cards-secundarios-visao-geral.tsx` -- abrir com `SectionHeader`; trocar caixas por blocos em colunas com filete (`sm:divide-x divide-line`, empilhadas no mobile; `border-y`/`divide-y` no mobile); tokens no lugar de hex/paleta -- AC 2, 3.
- `hero-fiscal-card.tsx`, `destaque-linha.tsx`, `obras-resumo-card.tsx`, `educacao-resumo-card.tsx` -- remover caixa `rounded border shadow`, tokens semânticos, mantendo dados/textos -- AC 2.
- Barras/funis (`pipeline-execucao`, `saldo-caixa-resumo-card`, `cards-secundarios-visao-geral`, `restos-a-pagar-vendors-chart` se usado) -- cores por `coresDoGrafico`/`corDoGrafico`, legíveis nos dois temas -- AC 3.
- `components/farmacia/farmacia-resumo-card.tsx` -- vira seção com filete (`border-t`), botões com `ExternalLinkPill`; atualizar `farmacia-resumo-card.spec.tsx` -- AC 4.
- `apps/web/architecture/tema-excecoes.json` -- remover entradas dos arquivos migrados -- AC 5.
- Specs da Home (`page.spec.tsx` e dos componentes tocados) -- cobrir cabeçalhos via `SectionHeader`, ausência de `rounded-2xl|shadow-sm|bg-white`/hex nos arquivos migrados, e agnosticismo de tenant (portal de outra UF, série iniciando em 2017/terminando em 2027) -- AC 5.
- `apps/web/public/llms.txt` e `llms-full.txt` -- sem alteração (nenhuma rota/métrica muda); confirmar.

**Acceptance Criteria:**
- Given a Home antes de migrar, when a story começa, then existem PNGs de referência (claro/escuro × desktop/mobile) versionados e `pnpm --filter @transparencia/web test:visual` os compara.
- Given a Home migrada, when renderizada, then cada seção abre com `SectionHeader`, blocos de dados usam colunas com filete de `sm:` em diante (empilhadas no mobile), o espaçamento entre seções é 104px no desktop e 64px no mobile e o fundo é branco.
- Given os gráficos/barras da Home, when em claro e escuro, then usam cores por variável e continuam legíveis (contraste validado pelo teste de tokens).
- Given o resumo de Farmácia, when renderizado, then não há `rounded-2xl border shadow-sm`, é seção com filete e usa `ExternalLinkPill`.
- Given a Home migrada, when comparados os textos e dados, then nada mudou; nenhum município, UF ou ano fixo; `tema.spec.ts` verde sem entradas obsoletas.
- Given os componentes de `packages/ui` revisados, when testados, then todos os ajustes herdados da 20.3 têm teste de comportamento e passam antes de a Home consumi-los.

## Spec Change Log

## Review Triage Log

### 2026-10-25 — Review pass
- verdicts: 52 findings (blind 14, edge 12, verification-gap 2+3 outros, intent-alignment 7 divergencias) — high 0, medium 2, low 6, false 5, maybe-false 0; demais agrupados como decisao de design/cosmetico
- findings:
  - `[medium]` `[patch]` KPICard invertTrend com isPositive indefinido pinta como bom — corrigido (inverte so com boolean) + teste.
  - `[medium]` `[patch]` cores das barras (corToken) sem asserção em view-model/Hero/Pipeline/CardsSecundarios — specs criados/ampliados (inclui DestaqueLinha data-tom).
  - `[low]` `[patch]` slug do spec visual dependia da ordem do banco — ordenado por portalSlug.
  - `[low]` `[defer]` process.env direto no playwright.config/spec visual; entrada de CHANGELOG — ver deferred.
  - `[false]` `[reject]` baselines PNG nao regenerados — commit e3466d7d atualiza os 4 PNGs; o diff de revisao excluiu *.png.
  - `[false]` `[reject]` import cn sobrando em hero-fiscal-card — usado na linha 56.
  - `[false]` `[reject]` SegmentedButton impede sobrescrever role — ariaDeSelecao vem antes de {...props}.
  - `[false]` `[reject]` lockfile desatualizado — pnpm-lock.yaml alterado no commit (excluido do diff de revisao).
  - `[false]` `[reject]` tema-excecoes inconsistente para view-model — ainda contem hex/raio nas outras listas.
  - `[low]` `[reject]` 3 colunas em 640-767px apertadas, hero em lg:, remocao dos separadores "›", semantica warn em Liquidado, aria-label vs labelledby, ExternalLinkPill fallback sem props, trend vazio, temConteudo duplicado, testes por grep de fonte, networkidle/tolerancia visual — o breakpoint sm: e exigido pela AC; demais sao cosmeticos ou especulativos e a correcao exigiria nova superficie.

## Auto Run Result

Status: done

- **Resumo:** ajustes herdados da 20.3 em `packages/ui`; baseline visual Playwright (claro/escuro × desktop/mobile) versionada antes da migracao; Home migrada para SectionHeader, colunas com filete, espacamento 64/104px, fundo branco, cores de barras por variavel, Farmacia como secao com ExternalLinkPill.
- **Revisao:** 3 patches aplicados (2 medios, 1 baixo), 2 deferidos, demais rejeitados conforme o log. Nova revisao recomendada: false.
- **Verificacao:** ui 260 e web 1224 testes passando; typecheck e biome sem erros (1 aviso preexistente em farmacia/view-model.ts); test:visual passou antes dos patches (4/4), nao reexecutado depois deles.
- **Riscos residuais:** PNGs refletem dados do banco local; mobile escuro pos-migracao nao inspecionado visualmente; municipal-landing-client.tsx nao migrado (fora de escopo).

## Design Notes

Ordem obrigatória: ajustes herdados → baseline (commit só com PNGs/config) → migração da Home. O teste visual é opt-in (`test:visual`), fora de `make test`, porque depende de servidor e banco locais; os PNGs refletem os dados do banco local e servem de referência de regressão de estilo, não de dados. Diferenças esperadas após a migração são atualizadas com `--update-snapshots` e revisadas.

## Verification

**Commands:**
- `pnpm --filter @transparencia/ui test` -- expected: verde
- `pnpm --filter @transparencia/web test` -- expected: verde, guarda de tema sem arquivo novo violando nem entrada obsoleta
- `pnpm typecheck` -- expected: sem erros
- `pnpm exec biome check packages/ui apps/web` -- expected: sem avisos
- `pnpm --filter @transparencia/web test:visual` -- expected: verde contra os PNGs versionados

**Manual checks (if no CLI):**
- Abrir a Home local em claro/escuro, desktop e 375px: seções com filete, sem cartões com sombra, texto legível.

### Review Findings

Revisão de código (2026-10-25) dos commits 1f31f9e6..4f51e498 (ajustes de UI pós-fechamento).

- [x] [Review][Patch] Estado vazio do pipeline renderiza filete extra abaixo de "Nenhuma etapa" [apps/web/components/pipeline-execucao.tsx:83]
- [x] [Review][Patch] `despesasSubtext` some quando há `totalLiquidado` mas `totalEmpenhado` é vazio [apps/web/components/cards-secundarios-visao-geral.tsx:139-157]
- [x] [Review][Patch] Busca da Farmácia no mobile: campo e botão empilhados sem divisória entre eles [apps/web/components/farmacia/farmacia-busca-form.tsx:26-44]
- [x] [Review][Patch] Falta teste do fallback de cor (`brand`) das etapas do pipeline — já coberto por "aplica a cor por token e usa brand quando falta"; adicionado teste do estado vazio
- [x] [Review][Patch] Crachá de severidade com `sm:w-12` (48px) pode estourar com "■ MÉDIA"/"BAIXA" e desalinhar o cabeçalho [apps/web/components/radar-civico-feed.tsx:64,146]
- [x] [Review][Defer] Eventos de telemetria `educacao_resumo_card_footer`/`obras_resumo_card_footer` agora disparam de link no cabeçalho — deferred: renomear quebra séries de dashboards; decidir com o dono da analítica
- [x] [Review][Defer] "Em destaque" sem `h2` visível: cartões usam `h3` sob `aria-label` — deferred: resolver junto da revisão de hierarquia de títulos na 20.9

#### Rejected

- `false` hero sem separador/espaço no mobile — o grid pai tem `gap-8`.
- `false` `space-y-[104px]` abre vazio quando um cartão é `null` — filho `null` não renderiza nó, sem espaço.
- `false` testes de tenant/UF, ACs 1 e 6 sem evidência — estão nos commits anteriores da story (fora do intervalo revisado).
- `low` título "Em destaque" removido, "Total em Caixa Municipal" `sr-only`, "Posição" sem selo, legenda sem bolinhas, ícone de aviso removido, rótulo "Mapa · Ver no mapa", busca da Farmácia reestilizada, barras de uma cor só no pipeline/hero — pedidos explícitos do design aprovado pelo Julio.
- `low` fallbacks `ink` x `brand` e `corToken` opcional sem uso, `rounded-full` na pílula "Visão Consolidada", `pt-px` na pílula, tamanhos 9/10px, cabeçalho do radar `aria-hidden`, testes por classe/ausência — cosméticos ou especulativos; correção exigiria nova superfície.
