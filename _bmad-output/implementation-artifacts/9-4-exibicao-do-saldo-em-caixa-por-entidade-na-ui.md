---
baseline_commit: c2db6637978135dde05a9d29c521a24d10cea98f
---

# Story 9.4: Apresentação da Posição Financeira e Saldo em Caixa por Entidade na Web

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a citizen, journalist, or public policy researcher exploring the transparency portal,
I want to view the verified bank and cash balances for each municipal entity (such as the Social Assistance Fund, Health Fund, City Hall, and Pension Fund) with full attribution to the National Treasury Secretariat (STN/SICONFI),
So that I can clearly see how much actual money each entity holds in bank accounts without confusing cash availability with uncommitted budget surplus, accessing a lightweight summary on the overview page, the full per-entity breakdown on the budget execution page, and dedicated pension fund availability on the CAPREM page, with full ability to download the underlying CSV data.

---

## Acceptance Criteria

1. **Redesign Visual do Componente de Detalhamento (`SaldoCaixaEntidadesSection`):**
   - Adequação visual estrita ao Design System do portal (padrão Radar de Gastos Sensíveis e Carros-chefe de Arrecadação):
     - **Bordas e Containers:** `rounded-2xl border border-[#e7e9ee] bg-white p-6 shadow-sm` (sem bordas pretas pesadas `border-border/80`).
     - **Cards por Entidade:** `rounded-2xl border border-[#e7e9ee] bg-white p-5 shadow-sm transition-all hover:border-[#cbd0db]`.
     - **Tipografia e Cores:** Título em `font-bold text-base text-ink`, subtítulo em `text-subtleText text-xs`, saldo em `font-bold font-serif text-2xl text-ink tracking-tight`.
     - **Remoção de Ruídos:** Eliminação total do código numérico bruto (`10131`) e de ícones infantis/lúdicos.
     - **Badges Semânticas Institucionais:** Indicação de tipo institucional claro (ex: "Administração Direta", "Fundo Municipal", "Previdência").
     - **Contraste Correto:** Badge de competência homologada em `border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-medium` (legibilidade e contraste WCAG AAA).
     - **Callout Cívico Didático:** Fundo suave `rounded-xl border border-amber-200/80 bg-amber-50/70 p-4 text-amber-900 text-xs` destacando a regra de ouro contábil (*"Atenção: Saldo em caixa não é dinheiro 'sobrando'..."*).
     - **Show Your Work:** Botão de download CSV (`ShowYourWorkButton`) integrado nos cards e/ou no cabeçalho da seção.

2. **Card Resumo Compacto na Visão Geral (`SaldoCaixaResumoCard` em `apps/web/app/[portalSlug]/page.tsx`):**
   - Substituição do bloco massivo de cards na Visão Geral por um card compacto e harmonioso.
   - Exibição do total em caixa municipal consolidado (`fmtCompact`), mini-barra proporcional entre Recursos Livres e Vinculados, selo oficial STN e link direto de navegação para a página de execução orçamentária: *"Ver detalhamento por entidade em Execução Orçamentária →"*.

3. **Seção Completa na Página de Execução Orçamentária (`apps/web/app/[portalSlug]/orcamento/page.tsx`):**
   - Inclusão da seção completa `SaldoCaixaEntidadesSection` posicionada harmoniosamente na página de Execução Orçamentária (onde o munícipe analisa a dotação, empenhos, pagamentos e a disponibilidade real em caixa).
   - Atualização de `loader.ts`, `view-model.ts` e `page.tsx` para carregar `getSiconfiPosicaoFinanceira`.

4. **Card de Disponibilidade de Caixa na Página do CAPREM (`apps/web/app/[portalSlug]/caprem/page.tsx`):**
   - Exibir card dedicado na página do CAPREM apresentando a Disponibilidade Financeira e Aplicações do Fundo Previdenciário (RPPS) homologadas pelo SICONFI MSC, com paridade de estilo rigorosa ao componente de Execução Orçamentária.
   - Atualização de `loader.ts`, `view-model.ts` e `page.tsx` de caprem.

5. **Infraestrutura de Download CSV ("Show Your Work"):**
   - Suporte a `tipo="saldo_caixa_siconfi"` na rota `/api/[portalSlug]/export` com segregação estrita por escopo (`entidades=executivo` e `entidades=previdencia`).
   - Exportação em formato CSV (suporte a delimitadores `;` e `,`) com as colunas canônicas homologadas pela STN.

6. **Sincronização dos Guias de IA (Regra 12 de `AGENTS.md`):**
   - Atualizar `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` documentando o indicador público de Caixa SICONFI, sua presença na Visão Geral, Execução Orçamentária e CAPREM, e a distinção entre disponibilidade de tesouraria e orçamento.

7. **Testes Automatizados:**
   - Testes unitários de exportação CSV e dos novos componentes.
   - Testes de integração em Visão Geral, Execução Orçamentária e CAPREM.
   - 100% de aprovação em `pnpm --filter web test`, `tsc --noEmit`, `make test` e `make check`.

---

## Tasks / Subtasks

- [x] Task 1: Redesign visual de `SaldoCaixaEntidadesSection` (AC: 1)
  - [x] Subtask 1.1: Alinhar visual com o Design System do Radar (bordas `#e7e9ee`, fundo branco, tipografia `font-serif text-ink`, remoção de códigos brutos `10131`, contraste correto no badge).
  - [x] Subtask 1.2: Atualizar testes unitários em `saldo-caixa-entidades-section.spec.tsx`.

- [x] Task 2: Card Compacto na Visão Geral (AC: 2)
  - [x] Subtask 2.1: Criar componente `SaldoCaixaResumoCard` com saldo consolidado, divisão livre/vinculado e link de detalhamento.
  - [x] Subtask 2.2: Atualizar `apps/web/app/[portalSlug]/page.tsx` para substituir a seção massiva pelo card compacto, e ajustar `page.spec.tsx`.

- [x] Task 3: Integração da Seção Detalhada na Página de Execução Orçamentária (AC: 3)
  - [x] Subtask 3.1: Atualizar `orcamento/loader.ts` e `orcamento/view-model.ts` para carregar `getSiconfiPosicaoFinanceira`.
  - [x] Subtask 3.2: Renderizar `SaldoCaixaEntidadesSection` em `orcamento/page.tsx` e atualizar testes.

- [x] Task 4: Card de Caixa da Previdência na Página do CAPREM (AC: 4)
  - [x] Subtask 4.1: Atualizar `caprem/loader.ts` e `caprem/view-model.ts` para isolar os saldos do RPPS.
  - [x] Subtask 4.2: Criar `CapremSaldoCaixaCard` (unificado com `SaldoCaixaEntidadesSection` com `scope="previdencia"`), renderizar em `caprem/page.tsx` e atualizar `caprem/page.spec.tsx`.

- [x] Task 5: Infraestrutura e Integração do "Show Your Work" (Download CSV) (AC: 5)
  - [x] Subtask 5.1: Implementar suporte a `saldo_caixa_siconfi` em `@transparencia/db` e na rota `/api/[portalSlug]/export` com filtro estrito de previdência.
  - [x] Subtask 5.2: Conectar o botão `ShowYourWorkButton` na seção de Execução Orçamentária e no card do CAPREM, com testes da rota e da query.

- [x] Task 6: Sincronização dos Guias de IA e Documentação (AC: 6)
  - [x] Subtask 6.1: Atualizar `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`.

- [x] Task 7: Validação de Qualidade e Testes de Regressão (AC: 7)
  - [x] Subtask 7.1: Executar `pnpm --filter web test`, `tsc --noEmit`, `make test` e `make check`.

- [x] Task 8: Segregação Institucional do SICONFI (10131 Executivo vs 10132 CAPREM) e Redesign Compacto do Card da CAPREM
  - [x] Subtask 8.1: Atualizar `@transparencia/db` (`siconfi-caixa-metrics.ts` e `export-raw-data.ts`) para segregar estritamente por `poder_orgao`: contas `10131` integradas 100% ao caixa do Executivo/Prefeitura (mesmo vinculadas à previdência) e contas `10132` restritas exclusivamente à autarquia CAPREM.
  - [x] Subtask 8.2: Redesenhar `CapremSaldoCaixaCard` adotando o formato compacto e elegante de `SaldoCaixaResumoCard` (estilo Visão Geral: layout horizontal `md:grid-cols-[auto_1fr]`, valor `font-serif text-3xl`, mini-barra proporcional e rodapé com segregação constitucional e *Show Your Work*).
  - [x] Subtask 8.3: Atualizar e expandir testes unitários e de integração (`caprem-saldo-caixa-card.spec.tsx`, `caprem/page.spec.tsx`, `siconfi-caixa-metrics.spec.ts`, `export-raw-data.spec.ts`).
  - [x] Subtask 8.4: Executar validações de qualidade e conformidade (`pnpm test`, `tsc --noEmit`, `make test`, `make check`).

### Review Findings

- [x] [Review][Patch] Violação da Regra 13: Substituir ternários aninhados por helper function nos 3 componentes de saldo em caixa [apps/web/components/caprem-saldo-caixa-card.tsx:174, apps/web/components/saldo-caixa-entidades-section.tsx:297,416, apps/web/components/saldo-caixa-resumo-card.tsx:198]
- [x] [Review][Patch] Inconsistência no fallback de fonte: padronizar badge SICONFI nos estados sem dados [apps/web/components/caprem-saldo-caixa-card.tsx:65, apps/web/components/saldo-caixa-entidades-section.tsx:89, apps/web/components/saldo-caixa-resumo-card.tsx:74]
- [x] [Review][Patch] Violação da Regra 12: sincronizar colunas e ordem do CSV saldo_caixa_siconfi no llms-full.txt com a rota real [apps/web/public/llms-full.txt:98-108]
- [x] [Review][Patch] Violação da Regra 9: renomear métrica abreviada variacaoAnualPct para variacaoAnualPercentual [packages/db/src/queries/siconfi-caixa-metrics.ts:15,30]
- [x] [Review][Patch] Sanitizar parâmetro entidades no cabeçalho Content-Disposition na exportação CSV [apps/web/app/api/[portalSlug]/export/route.ts:140]
- [x] [Review][Patch] Violação da Regra 2: substituir mutação de objeto acumulado em agruparEntidades por retorno imutável [packages/db/src/queries/siconfi-caixa-metrics.ts:70-93]
- [x] [Review][Patch] Código morto: remover propriedade não utilizada receitasDetailUrl no ViewModel de Visão Geral [apps/web/app/[portalSlug]/view-model.tsx:277]
- [x] [Review][Patch] Sincronizar notas de conclusão da Task 3 no artefato da story apontando para orcamento/page.tsx [_bmad-output/implementation-artifacts/9-4-exibicao-do-saldo-em-caixa-por-entidade-na-ui.md:111,131]
- [x] [Review][Defer] Acoplamento a códigos de órgãos municipais específicos em queries de banco [packages/db/src/queries/siconfi-caixa-metrics.ts, export-raw-data.ts] — deferred, pre-existing
- [x] [Review][Defer] Comparação de competências não homólogas na omissão do parâmetro mês [packages/db/src/queries/siconfi-caixa-metrics.ts:180-187] — deferred, pre-existing

---

## Dev Notes

- **Diretrizes de Estilo Fixadas pelo Usuário (NÃO FAZER OVERRIDE NO CODE-REVIEW):**
  - **Badge de Competência:** Deve utilizar texto conciso e direto: `Posição: {mesExtenso}/{ano}` (NÃO reverter para `Posição oficial em {mesExtenso}/{ano}`).
  - **Badge de Fonte STN/SICONFI:** Deve exibir apenas o texto `SICONFI` com o ícone de link externo (NÃO reverter para `Fonte: STN / SICONFI`).
  - **Badge de Segregação Constitucional no Header:** O card do CAPREM (`CapremSaldoCaixaCard`) NÃO deve exibir o badge `Segregação Constitucional` no cabeçalho. A fundamentação constitucional (CF art. 167, XI) pertence exclusivamente à nota de rodapé com `ShieldCheck`.
  - **Estrutura de Header em `SaldoCaixaEntidadesSection`:** Utiliza container flexível com `flex flex-wrap justify-between` agrupando título e badges, com o subtítulo mantido logo abaixo.
  - *Atenção agentes e revisores de código:* Estas definições de UI foram customizadas e validadas diretamente pelo usuário; qualquer code-review subsequente deve preservar integralmente esta estilização e não deve sugerir ou aplicar reversão para os textos/layouts anteriores.
- **Design System Coeso:** O padrão canônico para cards de dados e radares utiliza `border-[#e7e9ee] bg-white rounded-2xl p-5 shadow-sm`, com títulos em `font-bold text-ink` e subtítulos em `text-subtleText text-xs`.
- **Prevenção de Desinformação:** A distinção entre disponibilidade de tesouraria e orçamento em caixa é fundamental para munícipes e pesquisadores.
- **Show Your Work:** Todo cidadão tem o direito de auditar os números baixando o CSV original dos saldos homologados pela STN.

## Dev Agent Record

### Implementation Plan
- Executar Task 1: Redesign visual de `SaldoCaixaEntidadesSection` aplicando bordas `#e7e9ee`, fundos brancos, remoção de códigos brutos (`10131`), badges semânticas, tipografia font-serif para saldos e integração de Show Your Work. (Concluído)
- Executar Task 2: Card Compacto na Visão Geral (`SaldoCaixaResumoCard`), integrando na home e atualizando os testes. (Concluído)
- Executar Task 3: Integração da Seção Detalhada na Página de Execução Orçamentária (com CAPREM restrito a `/caprem`). (Concluído)
- Apresentar Task 3 ao usuário para revisão antes de iniciar Task 4.
- Em seguida, executar Task 4: Card de Caixa da Previdência na Página do CAPREM (`CapremSaldoCaixaCard`).

### Completion Notes
- **Task 1 Concluída:**
  - Redesign visual completo de `SaldoCaixaEntidadesSection` em [saldo-caixa-entidades-section.tsx](file:///Volumes/Projects/transparencia/apps/web/components/saldo-caixa-entidades-section.tsx).
  - Alinhamento estrito com o Design System (bordas `border-[#e7e9ee]`, cards brancos `bg-white`, cantos `rounded-2xl`, sombras suaves `shadow-sm`, tipografia de valores em `font-serif text-ink`).
  - Mapeamento semântico institucional eliminando a exibição de códigos brutos como `10131` e ícones infantis (substituídos por ícones institucionais sóbrios `Building2` e `Landmark`).
  - Badge de competência contábil homologada com contraste correto (`border-emerald-200 bg-emerald-50 text-emerald-800`).
  - Callout cívico didático suave prevenindo equívocos de desinformação contábil.
  - Suporte ao botão `ShowYourWorkButton` (`tipo="saldo_caixa_siconfi"`) integrado no cabeçalho da seção.
  - Testes unitários atualizados e expandidos em [saldo-caixa-entidades-section.spec.tsx](file:///Volumes/Projects/transparencia/apps/web/components/saldo-caixa-entidades-section.spec.tsx) (7 testes passando com 100% de sucesso).
- **Task 2 Concluída:**
  - Criação do componente compacto [saldo-caixa-resumo-card.tsx](file:///Volumes/Projects/transparencia/apps/web/components/saldo-caixa-resumo-card.tsx) exibindo total consolidado em caixa municipal (`fmtCompact`), mini-barra proporcional entre Recursos Livres e Vinculados, selo STN / SICONFI com link oficial, alerta contábil didático e link de navegação direta para `Execução Orçamentária` (*"Ver detalhamento por entidade em Execução Orçamentária →"*).
  - Atualização do loader e view model de Visão Geral em [loader.ts](file:///Volumes/Projects/transparencia/apps/web/app/[portalSlug]/loader.ts) e [view-model.tsx](file:///Volumes/Projects/transparencia/apps/web/app/[portalSlug]/view-model.tsx) preservando contexto de navegação.
  - Substituição da seção massiva pelo card compacto em [page.tsx](file:///Volumes/Projects/transparencia/apps/web/app/[portalSlug]/page.tsx).
  - Testes unitários do componente criados em [saldo-caixa-resumo-card.spec.tsx](file:///Volumes/Projects/transparencia/apps/web/components/saldo-caixa-resumo-card.spec.tsx) (4 testes passando).
  - Testes de página ajustados em [page.spec.tsx](file:///Volumes/Projects/transparencia/apps/web/app/[portalSlug]/page.spec.tsx) (2 testes passando).
  - Segregação de dados contábeis em [siconfi-caixa-metrics.ts](file:///Volumes/Projects/transparencia/packages/db/src/queries/siconfi-caixa-metrics.ts) para separar o RPPS/CAPREM (`10132`) de `entidades` e de `totalCaixaGeral`.
- **Task 3 Concluída:**
  - Atualização de `orcamento/loader.ts` e `orcamento/view-model.ts` para carregar `getSiconfiPosicaoFinanceira`.
  - Inclusão harmoniosa de `SaldoCaixaEntidadesSection` em `orcamento/page.tsx` posicionada para complementar a análise de dotação e pagamentos.
  - Garantia de que apenas entidades do Executivo Municipal (Prefeitura e Fundos) são exibidas em Execução Orçamentária, excluindo o CAPREM (restringido ao `/caprem`).
  - Testes unitários e de integração atualizados em `orcamento/page.spec.tsx`.

- **Task 4 Concluída:**
  - Criação e integração de `CapremSaldoCaixaCard` em [caprem-saldo-caixa-card.tsx](file:///Volumes/Projects/transparencia/apps/web/components/caprem-saldo-caixa-card.tsx) unificado com `SaldoCaixaEntidadesSection` (`scope="previdencia"`), garantindo 100% de consistência visual com a página de Execução Orçamentária.
  - Exibição de cabeçalho alinhado, badges oficiais, métricas com variação anual vs ano anterior, callout de segregação constitucional (CF art. 167, XI) e grade discriminada por fundo previdenciário.
  - Atualização do loader e view model em [caprem/loader.ts](file:///Volumes/Projects/transparencia/apps/web/app/[portalSlug]/caprem/loader.ts) e [caprem/view-model.ts](file:///Volumes/Projects/transparencia/apps/web/app/[portalSlug]/caprem/view-model.ts).
  - Testes unitários e de integração em [caprem-saldo-caixa-card.spec.tsx](file:///Volumes/Projects/transparencia/apps/web/components/caprem-saldo-caixa-card.spec.tsx) e [caprem/page.spec.tsx](file:///Volumes/Projects/transparencia/apps/web/app/[portalSlug]/caprem/page.spec.tsx).
- **Task 5 Concluída:**
  - Implementação da exportação CSV bruta de saldos contábeis do SICONFI em [export-raw-data.ts](file:///Volumes/Projects/transparencia/packages/db/src/queries/export-raw-data.ts) e na rota `/api/[portalSlug]/export`.
  - Segregação rigorosa no CSV: `entidades=executivo` exclui estritamente registros previdenciários e `entidades=previdencia` isola exclusivamente o RPPS/CAPREM.
  - Testes de paridade da exportação em [export-raw-data.spec.ts](file:///Volumes/Projects/transparencia/packages/db/src/queries/__tests__/export-raw-data.spec.ts).
- **Task 6 Concluída:**
  - Sincronização dos guias de leitura para IA em [apps/web/public/llms.txt](file:///Volumes/Projects/transparencia/apps/web/public/llms.txt) e [apps/web/public/llms-full.txt](file:///Volumes/Projects/transparencia/apps/web/public/llms-full.txt) com detalhamento da rota de execução orçamentária, previdência (CAPREM) e colunas da exportação SICONFI.
- **Task 7 Concluída:**
  - 100% de aprovação nos testes: `pnpm --filter web test` (290 testes), `pnpm --filter @transparencia/db test` (61 testes), `make test` (96 testes) e validações de tipagem e linter (`tsc --noEmit`, `make check`, `biome check`).

## File List
- `packages/db/src/queries/siconfi-caixa-metrics.ts` (modificado)
- `packages/db/src/queries/__tests__/siconfi-caixa-metrics.spec.ts` (modificado)
- `packages/db/src/queries/export-raw-data.ts` (modificado)
- `packages/db/src/queries/__tests__/export-raw-data.spec.ts` (modificado)
- `apps/web/components/saldo-caixa-entidades-section.tsx` (modificado)
- `apps/web/components/saldo-caixa-entidades-section.spec.tsx` (modificado)
- `apps/web/components/saldo-caixa-resumo-card.tsx` (novo)
- `apps/web/components/saldo-caixa-resumo-card.spec.tsx` (novo)
- `apps/web/components/caprem-saldo-caixa-card.tsx` (novo/unificado)
- `apps/web/components/caprem-saldo-caixa-card.spec.tsx` (novo)
- `apps/web/components/show-your-work-button.tsx` (modificado)
- `apps/web/app/[portalSlug]/loader.ts` (modificado)
- `apps/web/app/[portalSlug]/view-model.tsx` (modificado)
- `apps/web/app/[portalSlug]/page.tsx` (modificado)
- `apps/web/app/[portalSlug]/page.spec.tsx` (novo)
- `apps/web/app/[portalSlug]/orcamento/page.tsx` (modificado)
- `apps/web/app/[portalSlug]/caprem/loader.ts` (modificado)
- `apps/web/app/[portalSlug]/caprem/view-model.ts` (modificado)
- `apps/web/app/[portalSlug]/caprem/page.tsx` (modificado)
- `apps/web/app/[portalSlug]/caprem/page.spec.tsx` (modificado)
- `apps/web/app/api/[portalSlug]/export/route.ts` (modificado)
- `apps/web/public/llms.txt` (sincronizado)
- `apps/web/public/llms-full.txt` (sincronizado)
- `_bmad-output/implementation-artifacts/9-4-exibicao-do-saldo-em-caixa-por-entidade-na-ui.md` (modificado)



