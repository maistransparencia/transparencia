---
baseline_commit: 4df9ca5
generated_at: 2026-08-03T22:37:50-03:00
---

# Story 3.2: Co-localização de Data Loaders e View Models em `apps/web/app/`

## Metadados

- **Epic**: 3 — Reorganização da UI e Co-localização de Loaders no `apps/web`
- **Story ID**: 3.2
- **Story Key**: `3-2-co-localizacao-de-data-loaders-e-view-models-em-apps-web-app`
- **Status**: `review`
- **Arquivo**: `_bmad-output/implementation-artifacts/3-2-co-localizacao-de-data-loaders-e-view-models-em-apps-web-app.md`

---

## User Story

**Como** desenvolvedor,
**Quero** co-localizar os data loaders e a composição de View Models próximos das rotas em `apps/web/app/`,
**Para que** as páginas consumam leitores atômicos do `@transparencia/db` e passem DTOs prontos para os componentes de domínio em `apps/web/components/`.

---

## Critérios de Aceitação (BDD)

**Given** as rotas de páginas em `apps/web/app/` (Visão Geral, Despesas, Saúde, CAPREM, Receitas, Orçamento, Pessoal e Licitações)
**When** os data loaders e View Models forem co-localizados por rota
**Then** cada rota usa apenas loader local para buscar dados e montar props prontas para os componentes.

**And** os loaders usam exclusivamente leitores atômicos do `@transparencia/db` (incluindo os leitores `*-metrics` quando existentes para o domínio).

**And** os componentes de domínio em `apps/web/components/` recebem apenas DTOs/props prontas, sem acoplamento a query/montagem fiscal.

**And** 100% da paridade visual e funcional das telas existentes é preservada (NFR5), sem remover visualização, card, gráfico ou tabela.

**And** as validações `make test`, `make test/ts` e `pnpm build` passam com sucesso.

---

## Contexto da Epic e Valor de Negócio

- A Epic 3 desacopla definitivamente responsabilidades entre UI de domínio e camada de dados.
- A Story 3.1 já migrou componentes de domínio para `apps/web/components/`.
- Esta Story 3.2 fecha a etapa, levando a montagem de dados para junto das rotas e removendo montagem extensa diretamente em `page.tsx`.
- Objetivo arquitetural: reduzir acoplamento, facilitar manutenção por domínio, diminuir risco de regressão em telas fiscais e padronizar o fluxo "leitor atômico -> view model local -> componente".

---

## Guardrails Arquiteturais Obrigatórios

### AD-1 e AD-3 (SSOT dbt + `@transparencia/db` leitor burro)

1. A lógica fiscal estrutural continua no dbt e nos leitores do `@transparencia/db`.
2. Rota não deve reintroduzir agregação contábil transacional pesada em SQL runtime.
3. Sempre preferir leitores de métricas (`*-metrics`) quando já existirem para o domínio.

### AD-4 (UI pura + co-localização)

1. Co-localizar loader e montagem de view model no segmento da rota.
2. `page.tsx` deve ficar focada em orquestração/render, delegando transformação para funções locais de loader/view model.
3. Componentes em `apps/web/components/` permanecem sem acesso direto a `@transparencia/db`.

### AD-5 (isolamento multi-tenant)

1. Sempre propagar e aplicar `portalSlug` nos leitores que exigem tenant.
2. Evitar fallback silencioso de slug vazio.
3. Quando o leitor suporta `portalSlug`, ele é obrigatório no fluxo do loader.

### AD-6 (qualidade)

1. Mudança só é concluída com validação completa de testes e build.
2. Não aceitar implementação parcialmente funcional com degradação visual.

---

## Estado Atual (Arquivos UPDATE Lidos Integralmente)

### `apps/web/app/[portalSlug]/page.tsx`

- Hoje faz parsing de query params, dispara várias queries e monta diversos view models inline (`hero`, `pipeline`, cards secundários, tabela de credores).
- Há mistura de responsabilidades no mesmo arquivo: coleta de dados, regra de apresentação e render.
- Deve ser quebrado em loader/view model co-localizados para preservar legibilidade e facilitar evolução sem mexer no componente visual.

### `apps/web/app/[portalSlug]/despesas/page.tsx`

- Mesma mistura: múltiplas chamadas db + composição de status HHI + estruturas para gráficos/tabelas inline.
- Forte candidato para `loadDespesasPageData(...)` + `buildDespesasViewModel(...)` no mesmo segmento.

### `apps/web/app/[portalSlug]/receitas/page.tsx`

- Define fallback de objeto completo e monta blocos de tabela/origens no `page.tsx`.
- Deve migrar fallback e construção de blocos para módulo de view model local.

### `apps/web/app/[portalSlug]/orcamento/page.tsx`

- Faz resumo, funil e agrupamento por função diretamente no arquivo da página.
- Deve mover agregações de apresentação para builder local e manter render declarativo.

### `apps/web/app/[portalSlug]/saude/page.tsx`

- Usa `getHistoriaSaude(selectedYear)` sem `portalSlug` explícito.
- Risco de violação de isolamento multi-tenant (AD-5) durante evolução.
- Story deve priorizar leitor atômico de métricas de saúde quando já disponível e garantir passagem explícita de tenant quando aplicável.

### `apps/web/app/[portalSlug]/caprem/page.tsx`

- Usa `getHistoriaCaprem(portalSlug, selectedYear, null)` e agrega `naturezaChartData` inline.
- A agregação de apresentação (map/sort para gráfico) deve ir para view model local.

### `apps/web/app/[portalSlug]/pessoal/page.tsx`

- Faz múltiplos fetches e combina dados no corpo da página.
- Usa `portalConfig?.portalSlug ?? ""` para `getFolhaVsServicos`, o que pode mascarar erro de tenant.
- Deve passar `portalSlug` de rota no loader co-localizado.

### `apps/web/app/[portalSlug]/licitacoes/page.tsx`

- Mapeia estrutura de fracionamento no corpo da página.
- Deve extrair `fracionamentoVendorsMap` para view model local.

### `apps/web/app/layout.tsx` e `apps/web/app/components/sidebar-wrapper.tsx`

- Não são alvo principal desta story, mas são parte da experiência de filtros globais (`ano`, `entidades`).
- Comportamentos a preservar: query string sincronizada, telemetry PostHog e layout estável.

---

## O Que Esta Story Deve Mudar

1. Em cada segmento de rota em `apps/web/app/[portalSlug]/...`, criar funções/módulos co-localizados para:
   - Parsing consistente de parâmetros (`ano`, `entidades`).
   - Coleta de dados via `@transparencia/db`.
   - Montagem do view model final da página.
2. Reduzir `page.tsx` para composição e render de componentes.
3. Garantir que os dados passados para componentes de domínio já estejam no formato final de props.
4. Alinhar os domínios às queries de métricas do Epic 2 onde aplicável.

---

## O Que Deve Ser Preservado (Sem Quebra)

1. Estrutura visual das oito páginas de domínio.
2. Textos, labels, ordem dos blocos, cores, títulos e semântica dos indicadores.
3. Query string e comportamento dos filtros (`ano`, `entidades`).
4. Compatibilidade de `apps/web/components/*` com props já utilizadas.
5. Comportamento do layout, sidebar e analytics.

---

## Estrutura Técnica Recomendada

Para cada rota, adotar padrão mínimo:

- `apps/web/app/[portalSlug]/<dominio>/page.tsx` (UPDATE): apenas orquestração/render.
- `apps/web/app/[portalSlug]/<dominio>/loader.ts` (NEW): busca dados no `@transparencia/db`.
- `apps/web/app/[portalSlug]/<dominio>/view-model.ts` (NEW): normalização, defaults, derivação e shape final para componentes.

Observação: para a rota raiz (`apps/web/app/[portalSlug]/page.tsx`), usar `apps/web/app/[portalSlug]/loader.ts` e `apps/web/app/[portalSlug]/view-model.ts`.

---

## Requisitos de Bibliotecas e Frameworks (Atualizados)

- Next.js: `16.2.11` (projeto)
- React: `19.2.8` (projeto)
- nuqs: `2.9.1` (projeto)
- PostHog client/server libs já presentes no projeto.

Diretrizes atuais relevantes:

1. Em App Router, evitar cadeias `await` desnecessariamente sequenciais no mesmo loader; iniciar requests e aguardar em `Promise.all` quando independentes.
2. Manter fetch/IO em Server Components e loaders de servidor, sem vazar lógica para componentes client sem necessidade.
3. Preservar integração existente de analytics em layout e wrappers client.

---

## Inteligência da Story Anterior (3.1)

- Componentes de domínio já foram movidos para `apps/web/components/` e não devem voltar para `packages/ui`.
- `packages/ui` foi reduzido a primitivas e utilitários genéricos.
- Import path local de componentes de domínio já está padronizado e não deve ser alterado para algo externo.
- Build e tipagem passaram após migração; esta story deve manter essa linha de segurança.

---

## Inteligência de Git Recente

Commits recentes mostram foco em:

1. Ajustes de observabilidade (`@vercel/analytics`, `@vercel/speed-insights`) no layout.
2. Higiene de CI/lint e versionamento.

Implicação para esta story:

- Evitar alterações colaterais em `layout.tsx` e telemetria.
- Limitar o escopo aos loaders/view models e páginas de domínio.

---

## Plano de Implementação (Tasks / Subtasks)

- [x] Task 1 — Definir padrão comum de parsing e contexto por rota (AC: 1, 2)
  - [x] Criar helper local por rota para `selectedYear` e `entidadesIds`.
  - [x] Garantir tipagem estável para parâmetros ausentes/invalidos.

- [x] Task 2 — Co-localizar loaders por rota (AC: 1, 2)
  - [x] Criar `loader.ts` para cada rota de domínio e mover chamadas `@transparencia/db`.
  - [x] Paralelizar chamadas independentes com `Promise.all`.

- [x] Task 3 — Co-localizar construção de View Models (AC: 1, 3)
  - [x] Criar `view-model.ts` para cada rota.
  - [x] Mover mapeamentos, fallback DTO e dados prontos de gráficos/tabelas para view model.

- [x] Task 4 — Enxugar `page.tsx` para render declarativo (AC: 1, 3)
  - [x] Substituir lógica inline por consumo dos loaders/view models.
  - [x] Preservar markup e props dos componentes de domínio.

- [x] Task 5 — Garantir alinhamento com leitores atômicos/tenant (AC: 2)
  - [x] Priorizar `*-metrics` quando disponíveis no domínio.
  - [x] Remover fluxos com slug vazio e propagar `portalSlug` de rota quando aplicável.

- [x] Task 6 — Validação final de regressão e qualidade (AC: 4)
  - [x] Executar `make test`.
  - [x] Executar `make test/ts`.
  - [x] Executar `pnpm build`.

---

## Riscos e Mitigações

1. **Risco**: regressão visual por alteração de shape de props.
   **Mitigação**: não alterar contrato dos componentes; validar telas por domínio após refatoração.

2. **Risco**: quebra de tenant por não uso de `portalSlug`.
   **Mitigação**: checklist obrigatório de assinatura dos loaders e chamadas DB.

3. **Risco**: sequencialidade excessiva degradando performance.
   **Mitigação**: paralelizar requests independentes no loader local.

4. **Risco**: escopo expandir para redesign.
   **Mitigação**: esta story é estrutural, não visual.

---

## Checklist de Conformidade do Dev

1. Nenhum componente de domínio acessa `@transparencia/db` diretamente.
2. Todo loader está co-localizado no segmento da rota.
3. `page.tsx` não contém composição extensa de dados; usa view model local.
4. `portalSlug` é propagado quando exigido pelo leitor.
5. Paridade visual preservada em todas as páginas da Epic 3.
6. `make test`, `make test/ts` e `pnpm build` verdes.

---

## Referências de Fonte

- `_bmad-output/planning-artifacts/epics.md` (Epic 3, Story 3.2)
- `_bmad-output/planning-artifacts/prds/prd-transparencia-2026-08-01/prd.md`
- `_bmad-output/planning-artifacts/architecture/architecture-transparencia-2026-08-01/ARCHITECTURE-SPINE.md`
- `_bmad-output/implementation-artifacts/3-1-desacoplamento-da-ui-migracao-dos-componentes-de-dominio-para-apps-web-components.md`
- `apps/web/app/[portalSlug]/page.tsx`
- `apps/web/app/[portalSlug]/despesas/page.tsx`
- `apps/web/app/[portalSlug]/receitas/page.tsx`
- `apps/web/app/[portalSlug]/orcamento/page.tsx`
- `apps/web/app/[portalSlug]/saude/page.tsx`
- `apps/web/app/[portalSlug]/caprem/page.tsx`
- `apps/web/app/[portalSlug]/pessoal/page.tsx`
- `apps/web/app/[portalSlug]/licitacoes/page.tsx`
- `apps/web/app/layout.tsx`
- `apps/web/app/components/sidebar-wrapper.tsx`
- `apps/web/package.json`

---

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Completion Notes List

- Refatoração concluída nas 8 rotas alvo com padrão co-localizado de `loader.ts` + `view-model.ts` (ou `view-model.tsx` na rota raiz).
- `page.tsx` das rotas ficou reduzida à orquestração/render, sem composição extensa inline de dados fiscais.
- Fluxos de carga independentes foram paralelizados via `Promise.all` nos loaders aplicáveis.
- Correções pós-refatoração aplicadas: ajuste de sintaxe em receitas e restauração de import em orçamento.
- Validações executadas com sucesso: `pnpm --filter web exec tsc --noEmit`, `make test/ts`, `make test`, `pnpm build`.

### File List

Arquivos UPDATE:

- `apps/web/app/[portalSlug]/page.tsx`
- `apps/web/app/[portalSlug]/despesas/page.tsx`
- `apps/web/app/[portalSlug]/receitas/page.tsx`
- `apps/web/app/[portalSlug]/orcamento/page.tsx`
- `apps/web/app/[portalSlug]/saude/page.tsx`
- `apps/web/app/[portalSlug]/caprem/page.tsx`
- `apps/web/app/[portalSlug]/pessoal/page.tsx`
- `apps/web/app/[portalSlug]/licitacoes/page.tsx`

Arquivos NEW (co-localização):

- `apps/web/app/[portalSlug]/loader.ts`
- `apps/web/app/[portalSlug]/view-model.tsx`
- `apps/web/app/[portalSlug]/despesas/loader.ts`
- `apps/web/app/[portalSlug]/despesas/view-model.ts`
- `apps/web/app/[portalSlug]/receitas/loader.ts`
- `apps/web/app/[portalSlug]/receitas/view-model.ts`
- `apps/web/app/[portalSlug]/orcamento/loader.ts`
- `apps/web/app/[portalSlug]/orcamento/view-model.ts`
- `apps/web/app/[portalSlug]/saude/loader.ts`
- `apps/web/app/[portalSlug]/saude/view-model.ts`
- `apps/web/app/[portalSlug]/caprem/loader.ts`
- `apps/web/app/[portalSlug]/caprem/view-model.ts`
- `apps/web/app/[portalSlug]/pessoal/loader.ts`
- `apps/web/app/[portalSlug]/pessoal/view-model.ts`
- `apps/web/app/[portalSlug]/licitacoes/loader.ts`
- `apps/web/app/[portalSlug]/licitacoes/view-model.ts`

### Change Log

- 2026-08-03: Implementada co-localização de loaders e view models para Visão Geral, Despesas, Receitas, Orçamento, Saúde, CAPREM, Pessoal e Licitações.
- 2026-08-03: Páginas de domínio simplificadas para render declarativo consumindo `load*Data` e `build*ViewModel`.
- 2026-08-03: Validação completa executada com sucesso (`tsc --noEmit`, `make test/ts`, `make test`, `pnpm build`).

---

## Status Final

**Current Status**: `review`

**Completion Note**: Implementação concluída com co-localização por rota, paridade funcional preservada e validações de tipagem, testes e build aprovadas.
