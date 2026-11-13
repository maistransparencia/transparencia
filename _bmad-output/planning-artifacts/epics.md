---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-transparencia-2026-08-01/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-transparencia-2026-08-01/ARCHITECTURE-SPINE.md
---

# transparencia - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for transparencia, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

- **FR1 (FR-1.1)**: O dbt deve fornecer o modelo `fct_posicao_fiscal_metricas.sql` pré-calculando total arrecadado, despesas pagas, restos pagos e pendentes (separados por gestão anterior vs. atual com auxílio do ano de referência em `dim_metadata`).
- **FR2 (FR-1.2)**: O dbt deve fornecer o modelo `fct_analise_despesas_metricas.sql` pré-agregando totais empenhados, liquidados e pagos por órgãos, unidades e funções contábeis.
- **FR3 (FR-1.3)**: O dbt deve fornecer os modelos `fct_execucao_orcamentaria_metricas.sql`, `fct_fontes_receita_metricas.sql`, `fct_historia_caprem_metricas.sql` e `fct_historia_saude_metricas.sql`, suportados por tabelas dimensionais canônicas padronizadas conforme normas oficiais (STN/MCASP).
- **FR4 (FR-1.4)**: Todos os modelos de métricas e dimensões devem incluir a dimensão `portal_slug` em seu agrupamento obrigatório quando aplicável a multi-tenant.
- **FR5 (FR-2.1)**: A camada `@transparencia/db` deve substituir scripts monolíticos de montagem de telas por leitores burros atômicos (ex: `getPosicaoFiscalMetrics(portalSlug, ano)`, `getHistoriaCapremMetrics(portalSlug, ano)`).
- **FR6 (FR-2.2)**: Nenhuma função em `@transparencia/db` pode conter chamadas a `sql` com agregações `SUM()`, `AVG()` ou `GROUP BY` sobre dados transacionais brutos ou casts e mapeamentos hardcoded em runtime.
- **FR7 (FR-2.3)**: Todas as funções leitoras devem exigir obrigatoriamente o parâmetro `portalSlug`.
- **FR8 (FR-3.1)**: Mover componentes de domínio de `packages/ui/src/components/` para `apps/web/components/` (ex: `caprem-hero-section.tsx`, `saude-emendas-section.tsx`, `posicao-fiscal-hero.tsx`).
- **FR9 (FR-3.2)**: Manter em `packages/ui` apenas primitivas agnósticas de design system (ex: `button.tsx`, `card.tsx`, `dense-table.tsx`, `kpi-card.tsx`).
- **FR10 (FR-4.1)**: Os data loaders e a composição de View Models devem residir em `apps/web/app/` (próximo às rotas que renderizam as telas, como `apps/web/app/[portalSlug]/caprem/page.tsx`).
- **FR11 (FR-4.2)**: Os componentes UI devem receber apenas DTOs prontos passados via props.

### NonFunctional Requirements

- **NFR1 (NFR-1.1)**: Desempenho e Latência: Leituras das páginas principais (ex: Posição Fiscal, CAPREM, Saúde) na web devem responder em menos de 100ms no banco de dados PostgreSQL devido à pré-materialização física (`materialized='table'`).
- **NFR2 (NFR-2.1)**: Integridade e Tolerância Zero a Erros: Testes fiscais e balanços contábeis (ex: `empenhado >= liquidado >= pago`, adimplência atuarial CAPREM) devem falhar a compilação do dbt caso haja discrepância nos dados.
- **NFR3 (NFR-3.1)**: Manutencibilidade e Testabilidade: Mudanças em schemas de staging exigem atualização em `_sources.yml` para garantir que os testes de integração (`make test`) passem sem erro.
- **NFR4 (NFR-3.2)**: Manutencibilidade e Testabilidade: Testes TypeScript (`make test/ts`) devem validar que todas as queries Kysely mantêm tipagem forte e passam o filtro `portal_slug`.
- **NFR5 (Preservação Visual)**: Nenhuma visualização ou tela existente deve ser removida durante a refatoração. A aplicação web deve manter total paridade visual e comportamental com a versão existente para facilitar a migração.
- **NFR6 (Conformidade STN/MCASP)**: A classificação orçamentária de elementos de despesa, naturezas, funções e subfunções deve seguir rigorosamente as tabelas e normas oficiais da Secretaria do Tesouro Nacional (STN) e Manual de Contabilidade Aplicada ao Setor Público (MCASP).

### Additional Requirements

- **AD-1**: dbt Marts de Métricas em `elt/transform/models/marts/metrics/` como Única Fonte da Verdade Contábil (SSOT).
- **AD-2**: Todos os modelos em `elt/transform/models/marts/metrics/` devem ser configurados com `materialized='table'` no dbt.
- **AD-3**: O pacote `@transparencia/db` conterá apenas funções leitoras atômicas e genéricas ("pass-through") que espelham diretamente as tabelas/marts do dbt (`selectFrom('fct_..._metricas').where('portal_slug', '=', portalSlug)`).
- **AD-4**: `packages/ui` restrito a primitivas genéricas e componentes de domínio em `apps/web/components/`. Co-localização de data loaders em `apps/web/app/`.
- **AD-5**: Isolamento Multi-tenant Obrigatório via `portal_slug` em dbt (`GROUP BY portal_slug`) e Kysely.
- **AD-6**: Protocolo de Validação Fiscais em dbt (`dbt test`) e aprovação estrita de `make test` (Python/dbt) e `make test/ts` (TypeScript/Kysely).
- **ASSUMPTION-1**: Projeções Enxutas de Métricas em `marts/metrics/` omitindo campos de texto longo como histórico de empenhos.
- **ASSUMPTION-2**: Referência de Gestão em `dim_metadata` (`ano_inicio_gestao_atual`) para cálculo de restos a pagar anterior vs. atual.
- **ASSUMPTION-3**: Estrutura Plana de Componentes em `apps/web/components/` com nomes descritivos com hífens.

### UX Design Requirements

*Nenhum documento de especificação UX dedicado encontrado. Os requisitos de UI são derivados diretamente dos requisitos FR8-FR11, AD-4 e NFR5 (reorganização da UI, separação de primitivas e componentes de domínio, garantindo 100% de preservação da paridade visual das telas existentes).*

### FR Coverage Map

- **FR1 (FR-1.1)**: Epic 1 - Modelo `fct_posicao_fiscal_metricas.sql` pré-calculando saldos e restos a pagar por gestão.
- **FR2 (FR-1.2)**: Epic 1 - Modelo `fct_analise_despesas_metricas.sql` pré-agregando totais por órgãos, unidades e funções.
- **FR3 (FR-1.3)**: Epic 1 - Auditoria de queries legadas, dimensões canônicas STN/MCASP (`dim_elemento_despesa`, `dim_natureza_despesa`, `dim_funcao_subfuncao`) e modelos `fct_execucao_orcamentaria_metricas.sql`, `fct_fontes_receita_metricas.sql`, `fct_historia_caprem_metricas.sql` e `fct_historia_saude_metricas.sql`.
- **FR4 (FR-1.4)**: Epic 1 - Inclusão da dimensão `portal_slug` em todos os agrupamentos dbt.
- **FR5 (FR-2.1)**: Epic 2 - Substituição de queries monolíticas por leitores burros atômicos em `@transparencia/db`.
- **FR6 (FR-2.2)**: Epic 2 - Eliminação de `SUM()`, `AVG()`, `GROUP BY`, `CAST` e dicionários JS hardcoded em runtime no Kysely.
- **FR7 (FR-2.3)**: Epic 2 - Filtro obrigatório de `portalSlug` em todas as funções leitoras.
- **FR8 (FR-3.1)**: Epic 3 - Migração dos componentes de domínio de `packages/ui` para `apps/web/components/`.
- **FR9 (FR-3.2)**: Epic 3 - Manutenção exclusiva de primitivas agnósticas no `packages/ui`.
- **FR10 (FR-4.1)**: Epic 3 - Co-localização de Data Loaders e composição de View Models em `apps/web/app/`.
- **FR11 (FR-4.2)**: Epic 3 - Transmissão de DTOs puros via props para componentes de UI.

## Epic List

- [Epic 1: Descoberta de Domínios, Dimensões Canônicas (STN/MCASP) e SSOT no dbt](#epic-1-descoberta-de-domínios-dimensões-canônicas-stnmcasp-e-ssot-no-dbt)
- [Epic 2: Leitores Atômicos e Contratos de Dados no `@transparencia/db`](#epic-2-leitores-atômicos-e-contratos-de-dados-no-transparenciadb)
- [Epic 3: Reorganização da UI e Co-localização de Loaders no `apps/web`](#epic-3-reorganização-da-ui-e-co-localização-de-loaders-no-appsweb)
- [Epic 4: Experiência Visual, Responsividade Mobile, SEO & Otimização para LLMs](#epic-4-experiência-visual-responsividade-mobile-seo--otimização-para-llms)
- [Epic 5: Arquitetura Analytics Serverless (DuckDB + Parquet R2), Servidor MCP & Assistente Fiscal com Evals](#epic-5-arquitetura-analytics-serverless-duckdb--parquet-r2-servidor-mcp--assistente-fiscal-com-evals)
- [Epic 6: Reformulação Fiscal da Homepage e Redesenho da Página de Despesas Detalhadas](#epic-6-reformulação-fiscal-da-homepage-e-redesenho-da-página-de-despesas-detalhadas)
- [Epic 7: Distribuição Cívica, Engajamento Comunitário, Newsletters Automatizadas e Social Sharing Dinâmico](#epic-7-distribuição-cívica-engajamento-comunitário-newsletters-automatizadas-e-social-sharing-dinâmico)
- [Epic 8: Auditabilidade Cívica ('Show Your Work'), Transparência Metodológica e Navegação Mobile Contínua](#epic-8-auditabilidade-cívica-show-your-work-transparência-metodológica-e-navegação-mobile-contínua)
- [Epic 9: Consistência Cívica, Indicadores da Saúde e Disponibilidade Financeira SICONFI (MSC)](#epic-9-consistência-cívica-indicadores-da-saúde-e-disponibilidade-financeira-siconfi-msc)
- [Epic 10: Fundação, Higiene de Dados e Isolamento de Schema](#epic-10-fundação-higiene-de-dados-e-isolamento-de-schema)
- [Epic 11: Automação da Ingestão de Dados, Notificações PWA e Fontes Consolidadas (TCE-RJ e SICONFI)](#epic-11-automação-da-ingestão-de-dados-notificações-pwa-e-fontes-consolidadas-tce-rj-e-siconfi)
- [Epic 12: Radar Cívico Ativo, Detecção de Anomalias e Funil de Engajamento](#epic-12-radar-cívico-ativo-detecção-de-anomalias-e-funil-de-engajamento)
- [Epic 13: Usabilidade Cívica, Descoberta Global e Governança](#epic-13-usabilidade-cívica-descoberta-global-e-governança)
- [Epic 14: Sustentabilidade Previdenciária e Patrimônio Financeiro da CAPREM](#epic-14-sustentabilidade-previdenciária-e-patrimônio-financeiro-da-caprem)
- [Epic 15: Expansão Regional Noroeste Fluminense (Cluster Sigcorp), RPPS Canônico (`fct_previdencia_*`) e Módulos Dinâmicos por Portal](#epic-15-expansão-regional-noroeste-fluminense-cluster-sigcorp-rpps-canônico-fct_previdencia_-e-módulos-dinâmicos-por-portal)
- [Epic 16: Ingestão Regional Cluster Pronim/Cidade360 e Lançamento do Polo Regional de Itaperuna](#epic-16-ingestão-regional-cluster-pronimcidade360-e-lançamento-do-polo-regional-de-itaperuna)
- [Epic 17: Radar Cívico de Obras Públicas, Medições Físicas e Impacto Urbano](#epic-17-radar-cívico-de-obras-públicas-medições-físicas-e-impacto-urbano)
- [Epic 18: Tema Canônico da Educação Básica, Desempenho Pedagógico (IDEB/SAEB) e Responsabilidade Fiscal (MDE/FUNDEB)](#epic-18-tema-canônico-da-educação-básica-desempenho-pedagógico-idebsaeb-e-responsabilidade-fiscal-mdefundeb)
- [Epic 19: Remodelagem da Homepage para Utilidade Pública, Sentinela da Farmácia SUS (Lei 14.654/2023) e Ação Cívica](#epic-19-remodelagem-da-homepage-para-utilidade-pública-sentinela-da-farmácia-sus-lei-146542023-e-ação-cívica)
- [Epic 20: Tema Divisórias: Identidade Visual Minimalista, Tema Claro/Escuro Acessível e Migração dos Componentes](#epic-20-tema-divisórias-identidade-visual-minimalista-tema-claroescuro-acessível-e-migração-dos-componentes)
- [Epic 21: Assistência Social, Programas de Transferência de Renda (CGU) e Impacto Econômico Municipal](#epic-21-assistência-social-programas-de-transferência-de-renda-cgu-e-impacto-econômico-municipal)
- [Epic 22: Busca Global por Categorias](#epic-22-busca-global-por-categorias)
- [Epic 23: Confiança e Transparência do Portal (Frescor dos Dados, Reporte de Erro e Metodologia)](#epic-23-confiança-e-transparência-do-portal-frescor-dos-dados-reporte-de-erro-e-metodologia)
- [Epic 24: Educação: Aprendizado e Financiamento (Dados do SIOPE e do INEP)](#epic-24-educação-aprendizado-e-financiamento-dados-do-siope-e-do-inep)
- [Epic 25: Saúde: a Prefeitura aplica o mínimo exigido?](#epic-25-saúde-a-prefeitura-aplica-o-mínimo-exigido)
- [Epic 26: Camada Raw por Fonte (Fim do Schema por Município) (esboço)](#epic-26-camada-raw-por-fonte-fim-do-schema-por-município-esboço)
- [Epic 27: Home: a Situação da Cidade Primeiro](#epic-27-home-a-situação-da-cidade-primeiro)

---

## Epic 1: Descoberta de Domínios, Dimensões Canônicas (STN/MCASP) e SSOT no dbt

Realizar o inventário e auditoria de todas as queries TypeScript legadas para extrair regras contábeis ocultas, criar as tabelas de dimensões canônicas oficiais do setor público (`dim_elemento_despesa`, `dim_natureza_despesa`, `dim_funcao_subfuncao`) baseadas nas normas da Secretaria do Tesouro Nacional (STN/MCASP) e consolidar os marts de métricas no dbt materializados fisicamente (`materialized='table'`).

### Story 1.1: Fase de Descoberta e Auditoria de Regras Fiscais Ocultas no TypeScript

As a data/fiscal architect,
I want to audit all legacy TypeScript queries in `@transparencia/db/src/queries/` to catalog all domain-specific filters, element mappings, and hardcoded constants,
So that no domain logic or accounting rule is lost during the migration to dbt.

**Acceptance Criteria:**

**Given** as funções leitoras legadas em `@transparencia/db/src/queries/` (ex: `historia_caprem.ts`, `historia_saude.ts`, `posicao_fiscal.ts`, `despesas.ts`)
**When** a auditoria de regras contábeis e de-para ocultos for realizada
**Then** é gerado um inventário mapeando todas as constantes hardcoded (ex: `CAPREM_CODE`, `CASP_CNPJ`, códigos de elemento `13`, `46`, `71`, `91`, `97`), joins com credores específicos e fórmulas de cálculo atuarial/saúde.
**And** cada item do inventário é associado à especificação correspondente nas tabelas oficiais do STN/MCASP.

### Story 1.2: Modelagem das Dimensões Canônicas Fiscais (STN/MCASP) no dbt

As a data engineer,
I want canonical dimension tables for expense elements, nature of expense, functions, and subfunctions built in dbt according to official STN/MCASP standards,
So that all metrics models join against standardized official classifications rather than using hardcoded JavaScript dictionaries.

**Acceptance Criteria:**

**Given** a especificação oficial de classificação orçamentária da Portaria STN/SOF nº 163/2001 e Portaria STN nº 448/2002 (MCASP)
**When** as dimensões `dim_elemento_despesa.sql`, `dim_natureza_despesa.sql` e `dim_funcao_subfuncao.sql` são criadas no dbt
**Then** elas contêm o catálogo completo e oficial de elementos de despesa, especificações, descrições e títulos contábeis regulamentados.
**And** o de-para legado (ex: `ELEMENTO_LABELS`) é totalmente substituído pelo `JOIN` nativo com `dim_elemento_despesa`.
**And** a suíte `make test` executa e valida as novas dimensões no banco de testes efêmero.

### Story 1.3: Modelo de Métricas de Posição Fiscal no dbt (`fct_posicao_fiscal_metricas`)

As a fiscal analyst / system,
I want pre-calculated financial metrics for daily and annual fiscal positioning in a materialized dbt table,
So that screen queries do not calculate totals from raw transactional data at runtime.

**Acceptance Criteria:**

**Given** as tabelas raw de receita e despesa sincronizadas em `_sources.yml` e o schema efêmero configurado
**When** o comando `dbt run --select fct_posicao_fiscal_metricas` é executado
**Then** a tabela física `fct_posicao_fiscal_metricas` é criada em `elt/transform/models/marts/metrics/` com materialização `table` contendo as colunas `portal_slug`, `ano`, `total_arrecadado`, `despesas_pagas`, `restos_pagos_no_ano`, `restos_pendentes_adm_anterior`, `restos_pendentes_adm_atual` e `saldo_estimado`.
**And** os restos a pagar são corretamente segregados entre gestão anterior e atual utilizando a referência em `dim_metadata`.
**And** a dimensão `portal_slug` é obrigatoriamente incluída no agrupamento do modelo.
**And** os testes do dbt (`total_arrecadado >= 0`) e a suíte `make test` executam e passam com 100% de sucesso.

### Story 1.4: Modelo de Métricas de Análise de Despesas no dbt (`fct_analise_despesas_metricas`)

As a fiscal analyst / system,
I want pre-aggregated totals for empenhado, liquidado, and pago grouped by portal_slug, ano, orgao, unidade, and funcao,
So that expense breakdowns load instantly with strict accounting consistency.

**Acceptance Criteria:**

**Given** as tabelas de staging de empenhos, liquidações e pagamentos
**When** o modelo `fct_analise_despesas_metricas` é executado no dbt
**Then** a tabela física `fct_analise_despesas_metricas` é criada com `materialized='table'` contendo agrupamento por `portal_slug`, `ano`, `orgao_codigo`, `unidade_codigo` e `funcao_codigo`.
**And** o modelo pré-calcula os somatórios de `total_empenhado`, `total_liquidado` e `total_pago`.
**And** o teste fiscal de invariante contábil (`total_empenhado >= total_liquidado AND total_liquidado >= total_pago`) é declarado em `schema.yml` e validado via `dbt test`.
**And** a suíte de testes `make test` é aprovada sem erros.

### Story 1.5: Modelos de Métricas de Domínio Específico no dbt (`fct_execucao_orcamentaria_metricas`, `fct_fontes_receita_metricas`, `fct_historia_caprem_metricas` e `fct_historia_saude_metricas`)

As a fiscal analyst / system,
I want pre-aggregated budgetary execution, revenue sources, CAPREM actuarial metrics, and Health story metrics models in dbt using official dimension tables,
So that domain-specific cross-referencing, casts, and complex filtering happen at data materialization time without runtime overhead.

**Acceptance Criteria:**

**Given** as tabelas raw de empenhos, folhas de pagamento, credores e as dimensões `dim_elemento_despesa`, `dim_natureza_despesa`, `dim_funcao_subfuncao`
**When** os modelos `fct_execucao_orcamentaria_metricas`, `fct_fontes_receita_metricas`, `fct_historia_caprem_metricas` e `fct_historia_saude_metricas` são executados no dbt
**Then** todas as tabelas são materializadas fisicamente (`materialized='table'`) em `elt/transform/models/marts/metrics/` contendo a dimensão obrigatória `portal_slug`.
**And** `fct_historia_caprem_metricas` utiliza as tabelas de dimensões oficiais para cruzamentos de empenhos patronais/aportes e indicadores atuariais.
**And** `fct_historia_saude_metricas` consolida os indicadores de aplicação da saúde.
**And** os testes de schema dbt e `make test` são aprovados com sucesso.

---

## Epic 2: Leitores Atômicos e Contratos de Dados no `@transparencia/db`

Refatorar a biblioteca de acesso a dados `@transparencia/db` para agir estritamente como um leitor burro "pass-through" fortemente tipado via Kysely, eliminando todas as agregações runtime em TypeScript e impondo a filtragem por `portalSlug`.

### Story 2.1: Leitores Burros Atômicos para Posição Fiscal (`getPosicaoFiscalMetrics`)

As a developer,
I want an atomic Kysely reader function for Posição Fiscal metrics in `@transparencia/db`,
So that server components receive strongly typed DTOs directly from pre-materialized dbt marts without runtime SQL aggregations.

**Acceptance Criteria:**

**Given** a tabela materializada `fct_posicao_fiscal_metricas` no banco PostgreSQL
**When** a função `getPosicaoFiscalMetrics(portalSlug: string, ano: number)` é chamada
**Then** ela executa uma query Kysely simples `.selectFrom('fct_posicao_fiscal_metricas').where('portal_slug', '=', portalSlug).where('ano', '=', ano).executeTakeFirst()`.
**And** ela não contém nenhuma chamada a `sql` bruto com `SUM()`, `AVG()` ou `GROUP BY` sobre dados transacionais.
**And** o parâmetro `portalSlug` é obrigatório no contrato de tipos.
**And** o teste de paridade TypeScript `make test/ts` passa sem erros de tipagem.

### Story 2.2: Leitores Burros Atômicos para Domínios Específicos (Despesas, Receitas, CAPREM e Saúde)

As a developer,
I want atomic Kysely reader functions for expense analysis, budget execution, CAPREM actuarial history, and Health story metrics in `@transparencia/db`,
So that all backend queries act strictly as pass-through DTO providers with zero runtime SQL logic, hardcoded dictionaries, or type casting.

**Acceptance Criteria:**

**Given** os marts `fct_analise_despesas_metricas`, `fct_execucao_orcamentaria_metricas`, `fct_historia_caprem_metricas` e `fct_historia_saude_metricas`
**When** as funções leitoras `getAnaliseDespesasMetrics`, `getExecucaoOrcamentariaMetrics`, `getHistoriaCapremMetrics` e `getHistoriaSaudeMetrics` são invocadas
**Then** todas realizam estritamente `.selectFrom(...)` aplicando obrigatoriamente a cláusula `.where('portal_slug', '=', portalSlug)`.
**And** o código legado monolítico de agregação e filtros runtime em `@transparencia/db/src/queries/historia_caprem.ts` e `historia_saude.ts` (incluindo `ELEMENTO_LABELS` hardcoded) é removido.
**And** a suíte de testes de tipos `make test/ts` é aprovada com 100% de sucesso.

---

## Epic 3: Reorganização da UI e Co-localização de Loaders no `apps/web`

Refatorar a camada de apresentação separando primitivas de design system em `packages/ui` de componentes de domínio em `apps/web/components/`, co-localizando data loaders e View Models em `apps/web/app/` e garantindo 100% de preservação da paridade visual e funcional existente.

### Story 3.1: Desacoplamento da UI - Migração dos Componentes de Domínio para `apps/web/components/`

As a frontend developer,
I want domain-specific UI components moved from `packages/ui` to `apps/web/components/`,
So that `packages/ui` contains only generic, agnostic design system primitives.

**Acceptance Criteria:**

**Given** componentes de domínio como `posicao-fiscal-hero.tsx`, `caprem-hero-section.tsx`, `saude-emendas-section.tsx` em `packages/ui`
**When** a reorganização dos pacotes é executada
**Then** todos os componentes específicos de domínio são movidos para o diretório plano `apps/web/components/`.
**And** em `packages/ui/src/components/` permanecem exclusivamente primitivas agnósticas de design system (ex: `button.tsx`, `card.tsx`, `dense-table.tsx`, `kpi-card.tsx`).
**And** todas as importações no `apps/web` são atualizadas sem causar falhas de compilação no `pnpm build`.

### Story 3.2: Co-localização de Data Loaders e View Models em `apps/web/app/`

As a developer,
I want page data loaders and View Model composition co-located near their Next.js routes in `apps/web/app/`,
So that pages fetch DTOs via `@transparencia/db` atomic readers and pass ready props to domain UI components.

**Acceptance Criteria:**

**Given** as rotas de páginas em `apps/web/app/` (Posição Fiscal, Despesas, Saúde, CAPREM, Receitas)
**When** os data loaders são configurados nas rotas de `apps/web/app/` (incluindo `apps/web/app/[portalSlug]/caprem/page.tsx`)
**Then** os data loaders buscam os dados utilizando exclusivamente os leitores atômicos do `@transparencia/db` (ex: `getHistoriaCapremMetrics(portalSlug, ano)`).
**And** os componentes de UI de domínio em `apps/web/components/` recebem DTOs prontos como props.
**And** 100% da paridade visual e funcional de todas as telas existentes é rigorosamente preservada sem remoção de nenhuma visualização ou gráfico (NFR5).
**And** as suítes de validação `make test`, `make test/ts` e `pnpm build` passam com sucesso.

### Story 3.3: Migração Completa dos Loaders Web para Leitores de Métricas

As a developer,
I want all route loaders in `apps/web/app/[portalSlug]` to consume the new `*-metrics` readers from `@transparencia/db` wherever coverage exists,
So that the application fully realizes the architecture of pre-materialized metrics marts and removes residual dependence on legacy monolithic readers.

**Acceptance Criteria:**

**Given** os leitores atômicos de métricas já existentes em `@transparencia/db` (ex: `getPosicaoFiscalMetrics`, `getAnaliseDespesasMetrics`, `getExecucaoOrcamentariaMetrics`, `getFontesReceitaMetrics`, `getHistoriaCapremMetrics`, `getHistoriaSaudeMetrics`)
**When** os loaders das rotas de domínio em `apps/web/app/[portalSlug]/` são refatorados
**Then** toda rota com cobertura de métricas disponível passa a buscar dados exclusivamente via leitores `*-metrics`, preservando o filtro obrigatório por `portalSlug`.

**And** o objetivo desta story é eliminar a dependência dos readers legados atuais na aplicação web para os domínios cobertos, mantendo apenas fluxos orientados a métricas.

**And** para cada domínio sem cobertura total de DTO métrico (campos detalhados ainda não materializados), deve ser aberto e documentado um plano de extensão de métricas no dbt, analisado caso a caso (uma métrica por vez), com decisão explícita de implementação antes de qualquer mudança no loader.

**And** qualquer fallback legado temporário deve ser excepcional, explicitamente rastreado com prazo de remoção no artefato da story, e não pode ser considerado estado final da migração.

**And** nenhum loader de rota principal deve depender de agregação runtime em TypeScript para totais fiscais já cobertos por marts de métricas.

**And** todos os contratos de props dos componentes em `apps/web/components/` permanecem estáveis, preservando 100% da paridade visual e funcional existente (NFR5).

**And** a suíte completa de validação (`make test`, `make test/ts`, `pnpm build`) passa com sucesso.

**And** é produzido um mapa de rastreabilidade por rota (reader legado anterior -> reader de métricas adotado -> gaps remanescentes -> decisão de implementação dbt), anexado aos artefatos da implementação.

### Plano Pós-Story 3.3 (Aposentadoria Completa do Legado)

Objetivo: eliminar toda dependência residual de queries legadas nos domínios cobertos e completar cobertura métrica para Pessoal e Licitações.

#### Story 3.4: Validação Final e Gate de Encerramento da Story 3.3

As a developer,
I want to execute the full validation gate (`make test`, `make test/ts`, `pnpm build`) and register evidence,
So that Story 3.3 closes with objective proof of stability before expanding scope.

Entregáveis:
- Evidências dos três comandos no artefato da story.
- Checklist 3.3 totalmente concluído.

#### Story 3.5: Complemento Métrico de Visão Geral e Orçamento

As a data+web developer,
I want to expand metrics coverage for fiscal details and budget functional breakdown,
So that `loadVisaoGeralData` e `loadOrcamentoData` removam fallbacks legados restantes.

Entregáveis:
- Extensão dos marts para restos pendentes/top credores e dimensão funcional consolidada.
- Readers de métricas correspondentes em `@transparencia/db`.
- Remoção de fallback legado nesses dois loaders.

#### Story 3.6: Complemento Métrico de Despesas, Saúde e CAPREM

As a data+web developer,
I want metrics for HHI/diárias/restos (Despesas), tendência/contratação/fontes (Saúde) e séries/natureza/cadprev (CAPREM),
So that these domains stop depending on legacy query composition.

Entregáveis:
- Novos/ajustados marts em `elt/transform/models/marts/metrics/`.
- Readers `*-metrics` dedicados para os blocos faltantes.
- Remoção dos fallbacks controlados nos três loaders.

#### Story 3.7: Métricas de Pessoal e Licitações (Cobertura Total)

As a data+web developer,
I want to create dedicated marts/readers for Pessoal and Licitações,
So that both routes migrate from 100% legacy to 100% metrics.

Entregáveis:
- `fct_pessoal_metricas` e `fct_licitacoes_metricas` (ou partições equivalentes por subdomínio).
- Readers de métricas para folha/chefias/13o/proventos/departamental e gaps/adesão/anomalias/modalidades.
- Migração completa de `apps/web/app/[portalSlug]/pessoal/loader.ts` e `apps/web/app/[portalSlug]/licitacoes/loader.ts`.

#### Story 3.8: Hard Cutover e Remoção Definitiva do Legado

As a maintainer,
I want to remove legacy query paths no longer needed,
So that architecture remains SSOT via dbt marts + atomic metric readers.

Entregáveis:
- Remoção de imports/chamadas legadas substituídas.
- Atualização de testes de paridade para contratos métricos finais.
- Changelog de aposentadoria do legado por domínio.

Critérios de saída da fase:
- Nenhum loader de rota principal depende de agregação runtime para domínios cobertos.
- `portalSlug` explícito em todos os fluxos da web.
- Suíte completa verde em cada story de corte (`make test`, `make test/ts`, `pnpm build`).

---

## Epic 4: Experiência Visual, Responsividade Mobile, SEO & Otimização para LLMs

Garantir que a plataforma TransparenciaWeb seja visualmente impecável em dispositivos móveis, com títulos dinâmicos padronizados, suporte a favicon personalizável (corrigindo a colisão de rota do Next.js no loader dinâmico), totalmente otimizada para motores de busca (SEO) e consumo automatizado por LLMs/IAs, além de alinhar as diretrizes de código do repositório em todo o código TypeScript/Frontend.

### Story 4.1: Correção de Roteamento do Favicon e Suporte a Ícones Personalizados

As a platform user / auditor,
I want the application to serve favicon requests properly without triggering server route exceptions,
So that browser tab icons render correctly and metric loaders are not invoked for static assets like `favicon.ico`.

**Acceptance Criteria:**
- **Given** uma requisição estática para `GET /favicon.ico`
- **When** o servidor Next.js processa a rota
- **Then** a requisição não deve colidir com o parâmetro dinâmico `[portalSlug]` de `app/[portalSlug]`.
- **And** a função `requireEmpresaIdsForMetrics` nunca deve ser invocada com o slug `"favicon.ico"`.
- **And** a aplicação deve expor suporte completo no Next.js Metadata (`metadata.icons`) para carregar o favicon fornecido pelo usuário.

### Story 4.2: Títulos Dinâmicos de Página com Prefixo TransparenciaWeb

As a portal visitor,
I want clear, descriptive page titles with the `TransparenciaWeb` prefix on every page,
So that I can immediately identify the current section and municipal entity in my browser tabs and bookmarks.

**Acceptance Criteria:**
- **Given** qualquer página renderizada no portal (ex: `/visao-geral`, `/despesas`, `/caprem`, `/saude`)
- **When** a página é carregada no navegador
- **Then** o título HTML da página deve seguir a estrutura `TransparenciaWeb - [Nome da Tela] | [Entidade do Portal]`.
- **And** o `layout.tsx` raiz do Next.js deve definir um `title.template` padronizado.

### Story 4.3: Responsividade Mobile e Adequação para Telas Menores

As a mobile device user,
I want tables, KPI cards, navigation menus, and year selectors to adapt to smaller screens,
So that I can consult public transparency data smoothly on smartphones and tablets.

**Acceptance Criteria:**
- **Given** um dispositivo móvel com largura de tela entre 360px e 430px
- **When** o usuário navega pelas telas do portal
- **Then** as tabelas (`dense-table`, tabelas de despesas e contratos) devem possuir rolagem horizontal suave ou layout adaptativo sem quebrar o container.
- **And** componentes de KPI (`kpi-card`) e seletores de filtros devem reorganizar-se em colunas responsivas utilizando breakpoints Tailwind (`sm:`, `md:`).
- **And** botões e elementos interativos devem possuir área de toque mínima adequada (44x44px).

### Story 4.4: Investigação e Correção de Emendas via PIX Zeradas em "Recebido por Emendas Parlamentares"

As a municipal transparency user / auditor,
I want "Recebido por emendas parlamentares" and "Emendas PIX" metrics to correctly reflect the data present in `raw.emendas_cad`,
So that PIX transfer amendments are accurately reported in the portal header and revenues dashboard instead of showing zero.

**Acceptance Criteria:**
- **Given** registros de emendas via PIX cadastrados na tabela `raw.emendas_cad` (`stg_porciuncula_prefeitura__emendas_cad`)
- **When** os modelos dbt (`int_emendas_consolidadas.sql`, `fct_emendas.sql` e `fct_fontes_receita_metricas.sql`) forem processados e agregados
- **Then** a identificação/categorização de emendas PIX vs. individuais em `fct_emendas` deve capturar corretamente as modalidades/tipos de transferência PIX.
- **And** o modelo de métricas `fct_fontes_receita_metricas` deve retornar o saldo `emendas_pix_arrecadado` maior que 0 quando existirem registros válidos.
- **And** o leitor Kysely (`getFontesReceitaMetrics`) e a UI (`EmendasCard` / `emendas-card.tsx` em "Recebido por emendas parlamentares") devem exibir o valor correto e não zerado.
- **And** a suíte de testes fiscais dbt (`make test`) e testes TypeScript (`make test/ts`) deve ser atualizada com asserções de paridade para validar a não zeragem.

### Story 4.5: Estruturação para Leitura por LLMs (LLM-Friendly App Architecture)

As an AI agent / LLM or accessibility screen reader,
I want structured HTML5 semantics, JSON-LD metadata, and a standard `/llms.txt` file,
So that I can extract, query, and process municipal transparency data accurately.

**Acceptance Criteria:**
- **Given** um agente de IA acessando a aplicação web
- **When** o agente analisa o código HTML e endpoints da aplicação
- **Then** o layout deve utilizar tags semânticas HTML5 (`<header>`, `<main>`, `<section>`, `<article>`, `<table>` acessíveis).
- **And** o portal deve disponibilizar os arquivos `/llms.txt` e `/llms-full.txt` detalhando as rotas, APIs e estrutura dos dados públicos.
- **And** as páginas principais devem conter esquemas `Schema.org` (`GovernmentOrganization`, `DataCatalog`, `Dataset`) serializados em JSON-LD.

### Story 4.6: SEO Básico (Meta Tags, Open Graph, Sitemap & Robots)

As a municipal transparency manager,
I want the portal to feature full search engine metadata and social sharing previews,
So that citizens can easily find transparency information on search engines and social platforms.

**Acceptance Criteria:**
- **Given** indexadores de busca ou crawlers de redes sociais
- **When** o portal é indexado ou compartilhado
- **Then** o Next.js Metadata API deve fornecer meta tags dinâmicas de `description`, `keywords`, `canonical` e `robots`.
- **And** meta tags Open Graph (`og:title`, `og:description`, `og:image`, `og:type`, `og:site_name`) e Twitter Cards devem estar configuradas.
- **And** rotas para `sitemap.xml` dinâmico e `robots.txt` devem estar ativas e válidas.

### Story 4.7: Suporte a PWA (Progressive Web App - Instalabilidade e Notificações de Extração)

As a municipal portal user / citizen,
I want the TransparenciaWeb platform to function as a Progressive Web App (PWA) that is installable on my mobile or desktop browser and capable of sending push notifications when new municipal extraction data is published,
So that I can quickly access transparency data from my home screen and stay immediately informed of new fiscal data updates.

**Acceptance Criteria:**
- **Given** um munícipe acessando a aplicação web em um navegador compatível (Chrome, Safari, Edge, Firefox)
- **When** o portal é carregado
- **Then** a aplicação deve fornecer um arquivo Web App Manifest (`manifest.webmanifest` ou `manifest.json`) configurado com `name: "TransparenciaWeb - Transparência Pública Municipal"`, `short_name: "TransparenciaWeb"`, `theme_color: "#1e3a8a"`, `background_color: "#0f172a"`, `display: "standalone"`, `start_url: "/"`, e ícones em resoluções 192x192 e 512x512.
- **And** o navegador deve habilitar o prompt nativo de instalação ("Adicionar à Tela de Início" / "Instalar App").
- **And** o Service Worker (`sw.js`) deve ser registrado para gerenciar cache estático e suporte offline do app shell.
- **And** a aplicação deve integrar com a Web Push / Notification API para alertar o usuário quando a data de extração (`dataExtracao` em `dim_portais`) for atualizada no banco de dados.

### Story 4.8: Aplicação de Diretrizes do Projeto no Código Frontend (Non-Python Files)

As a code maintainer,
I want all TypeScript, React components, and styling files to strictly comply with `AGENTS.md` guidelines,
So that code readability, immutability, explicit metric naming, and type safety are enforced across the workspace.

**Acceptance Criteria:**
- **Given** o repositório de código TypeScript em `apps/web`, `packages/ui` e `packages/db`
- **When** a auditoria e refatoração de código for concluída
- **Then** todas as variáveis de métrica e DTOs devem utilizar nomes explícitos (zero abreviações opacas).
- **And** transformações de dados devem ser puras e imutáveis (`.map`, `.filter`, `.reduce`).
- **And** as suítes de validação (`pnpm build` e `pnpm test`) devem rodar 100% limpas e sem warnings de tipagem.

### Story 4.9: Modelagem dbt e Exibição de Receitas Extra-Orçamentárias no Portal

As a municipal transparency user / auditor,
I want extra-budgetary revenues (such as tax retentions, consignments, deposits, and payroll loans) modeled in dbt and presented on the Receitas page,
So that citizens have complete visibility over all financial inflows managed by the municipality alongside budgetary revenues.

**Acceptance Criteria:**
- **Given** a tabela raw `receita_extra_orcamentaria` (já declarada no `_sources.yml`)
- **When** o modelo de staging `stg_porciuncula_prefeitura__receita_extra_orcamentaria.sql` for executado no dbt
- **Then** os dados de entrada de receitas extra-orçamentárias devem ser normalizados com o campo `portal_slug` e tipos padronizados (`ano`, `empresa`, `codigo`, `descricao`, `valor`, `dtlan`, `empresanome`).
- **And** os dados extra-orçamentários devem ser integrados no modelo intermediário unificado `int_receitas_consolidadas.sql` sob o classificador `tipo_receita = 'extra_orcamentaria'`, evitando a criação desnecessária de novos modelos `int_`.
- **And** os modelos marts `fct_receita_extra_orcamentaria.sql` (para listagem detalhada) e `fct_fontes_receita_metricas.sql` (para agregação da métrica `receita_extra_orcamentaria_arrecadado`) devem ser criados/estendidos com materialização física (`materialized='table'`), consolidando totais e listagens por `portal_slug` e `ano`.
- **And** no pacote `@transparencia/db`, o leitor `getFontesReceitaMetrics` deve ser estendido para incluir `receitaExtraOrcamentariaArrecadado` e a leitora `getReceitasExtraOrcamentariasList` deve ser criada aplicando obrigatoriamente o filtro `portal_slug`.
- **And** na aplicação web (`apps/web/app/[portalSlug]/receitas`), o loader e a View Model devem consumir as novas métricas e exibir um novo card de KPI ("Receitas Extra-Orçamentárias") no resumo de receitas e uma tabela detalhada de lançamentos extra-orçamentários na interface.
- **And** os arquivos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` devem ser atualizados conforme a Regra 12 de `AGENTS.md` para documentar o novo conjunto de dados públicos.
- **And** as suítes de validação (`make test`, `make test/ts` e `pnpm build`) devem passar com 100% de sucesso.

### Story 4.13: Parametrização Dinâmica de Limites Fiscais (Seed `seed_constantes_fiscais`) na UI de Licitações

As a municipal transparency user / auditor,
I want the Licitações page to dynamically display the exact legal limits for bidding exemptions (limites de dispensa) corresponding to the selected fiscal year (exercício),
So that explanation texts and alert tooltips reflect the actual decree/law applicable for that year (e.g. Decreto 12.343/2024 for 2025 vs Decreto 12.807/2025 for 2026) without hardcoded static amounts.

**Acceptance Criteria:**
- **Given** o seed `seed_constantes_fiscais.csv` contendo os limites históricos e vigentes de dispensa de licitação (`limite_dispensa_compras_servicos`, `limite_dispensa_obras_engenharia`, `limite_dispensa_veiculos`) por período de ano
- **When** o usuário seleciona um ano/exercício específico na rota `/licitacoes` (ex: 2023, 2024, 2025, 2026)
- **Then** a função leitora/loader de métricas de licitação (`getLicitacoesMetrics`) em `@transparencia/db` deve expor o valor numérico do limite de dispensa de compras/serviços vigente no ano selecionado (`limiteDispensaComprasServicos`).
- **And** o texto explicativo no cabeçalho de `apps/web/app/[portalSlug]/licitacoes/page.tsx` deve formatar dinamicamente o valor retornado (substituindo o valor fixo hardcoded de `R$ 62.725,59` por `acima de R$ {limiteDispensaFormatado} sem licitação`), explicitando a base legal correspondente ao exercício exibido.
- **And** as suítes de validação (`make test`, `make test/ts` e `pnpm build`) devem passar com 100% de sucesso.

### Story 4.14: Derivação de Status de Inexecução Contratual e Filtro de Segmentação de Execução na UI

As a citizen / municipal transparency auditor,
I want the contracts list and section to classify expired contracts with zero execution (`liquidado = 0` / `pago = 0`) as unexecuted/rescinded and provide an execution status filter,
So that unexecuted contracts are cleanly segregated from active/executed contracts without cluttering contract cards with excess text or hidden tooltips.

**Acceptance Criteria:**
- **Given** o modelo dbt `fct_contratos_servicos_vigentes.sql` e os componentes UI em `apps/web/components/contratos-servicos-vigentes-section.tsx` e `contrato-servico-vigente-card.tsx`
- **When** um contrato possui data de vencimento anterior ao ano/data atual e apresenta liquidação zerada (`total_liquidado = 0`)
- **Then** a leitora `@transparencia/db` / View Model da página deve derivar a propriedade de status de execução (ex: `statusExecucao: 'inexecutado' | 'em_execucao' | 'concluido'`).
- **And** a UI da seção de contratos deve fornecer um filtro de segmentação limpo por status de execução (ex: `Em Execução` [padrão], `Concluídos`, `Não Executados`), permitindo ao usuário auditar contratos inexecutados sob demanda sem poluir visualmente os cards padrão.
- **And** para contratos classificados como não executados na visão filtrada, exibir apenas um badge de status simples e minimalista (ex: badge neutro `Sem Execução Orçamentária` / `Não Executado`), sem adicionar blocos de texto explicativo ou tooltips nos cards.
- **And** os arquivos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` devem ser atualizados caso novos campos públicos de status de execução sejam expostos.
- **And** as suítes de validação (`make test`, `make test/ts` e `pnpm build`) devem passar com 100% de sucesso.

### Story 4.15: Revelação Progressiva e Segregação Didática de Restos a Pagar e Contratos Plurianuais na UI

As a citizen / municipal auditor,
I want the Restos a Pagar cards and Contract detail drawers to segregate processed vs unprocessed liabilities and multi-year contract celebration years using progressive disclosure,
So that I can clearly audit financial obligations without cluttering the main UI with redundant badges or text boxes.

**Acceptance Criteria:**
- **Given** os componentes de Posição Fiscal e Licitações/Contratos em `apps/web/components/` (ex: `posicao-fiscal-hero.tsx`, `contratos-servicos-vigentes-section.tsx`, `contrato-servico-vigente-card.tsx`)
- **When** o usuário visualiza o card de Restos a Pagar no painel de Posição Fiscal ou abre o Drawer de Detalhes de um contrato plurianual
- **Then** o card principal de Restos a Pagar deve apresentar um indicador discreto de informação `(i)` com tooltip simples em hover explicando a diferença entre Restos Processados (dívidas de serviços já prestados) e Não Processados (obras/serviços contratados em andamento).
- **And** no Drawer de Detalhes ao clicar no card ou contrato, exibir a segregação por mandato de origem (`Gestão Atual [2025-2028]` vs `Gestões Anteriores [Pré-2025]`) e as datas de celebração/vigência de contratos plurianuais.
- **And** a listagem principal deve permanecer limpa, sem adição de blocos de texto promocionais ou badges ruidosos que causem poluição visual ou sobrecarga cognitiva na UI principal.
- **And** os arquivos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` devem ser atualizados caso novos campos públicos de segregação de restos ou vigências contábeis sejam expostos.
- **And** as suítes de validação (`make test`, `make test/ts` e `pnpm build`) devem passar com 100% de sucesso.

---


## Epic 5: Arquitetura Analytics Serverless (DuckDB + Parquet R2), Servidor MCP & Assistente Fiscal com Evals

### Overview
Evolução da camada de inteligência de dados de transparência fiscal para uma arquitetura moderna baseada em **MCP (Model Context Protocol)**, DuckDB-WASM e arquivos Parquet particionados hospedados no Cloudflare R2, agregando uma camada de contexto orientada a **Skills (Markdown)** e um **Harness de Avaliação Determinística (Evals)**, alinhada às melhores práticas de agentes de IA (posthog.com/newsletter/building-ai-agents).

> [!NOTE]
> **Decisão Arquitetural (Evolução por Adição + MCP First):**
> Manter o pipeline dbt/PostgreSQL 100% intocado para garantir os testes de integração fiscais. Uma etapa pós-materialização exporta os marts do PostgreSQL para arquivos `.parquet` comprimidos (Snappy) e os sincroniza com o Cloudflare R2.
> A camada de inteligência expõe os marts através de um **Servidor/Ferramentas MCP** (`transparencia-mcp`), permitindo que tanto o assistente no frontend quanto agentes LLM externos consultem os dados com 100% de exatidão fiscal.

---

### Story 5.1: Exportação Automatizada de Marts PostgreSQL para `.parquet` Snappy e Sync MinIO/R2

As a data engineer,
I want a Python/DuckDB post-processing script (`elt/export_marts_parquet.py`) and sync script (`elt/scripts/sync_parquet.py`) that export all Postgres marts to Parquet and upload to Cloudflare R2 / MinIO,
So that we maintain a clean Parquet analytics store without altering the dbt Postgres adapter or integration tests.

**Acceptance Criteria:**
- **Given** o banco PostgreSQL populado com os marts de métricas materializados (`fct_*_metricas`, `dim_*`, `seed_*`) pós-execução do dbt
- **When** o script `elt/export_marts_parquet.py` é executado
- **Then** ele conecta ao PostgreSQL via DuckDB nativo (com fallback SQLAlchemy/pandas) e exporta cada mart para `target/parquet/` em formato `.parquet` comprimido com Snappy.
- **And** o script `elt/scripts/sync_parquet.py` sincroniza os arquivos para o Cloudflare R2 (produção) ou MinIO S3 local (dev), verificando ETag/ContentLength para evitar re-uploads.
- **And** a suíte de testes `elt/tests/test_export_marts_parquet.py` e `test_sync_parquet.py` executa e passa com 100% de sucesso.

---

### Story 5.2: Motor de Execução DuckDB-WASM e Registro Dinâmico dos 25 Marts Parquet (`duckdb-executor.ts`)

As a fullstack developer,
I want an atomic DuckDB-WASM execution module (`apps/web/lib/duckdb-executor.ts`) that runs server-side (Node.js) and client-side (Browser),
So that SQL queries against Parquet files hosted on R2/MinIO execute instantly with automatic `HugeInt` 128-bit casting.

**Acceptance Criteria:**
- **Given** os 25 arquivos Parquet de marts (`MART_TABLES`) armazenados no R2 ou sistema de arquivos local
- **When** a função `getDuckDbInstance()` ou `queryDuckDbParquet(sql)` é invocada no `apps/web`
- **Then** o DuckDB-WASM é inicializado via `eval("require")` no Node.js (Vercel Serverless) ou `Web Worker` no navegador.
- **And** todas as 25 tabelas fato/dimensão são registradas como views relacionais nativas no DuckDB.
- **And** valores numéricos de somatórios fiscais são protegidos por `CAST AS DOUBLE` prevenindo falhas de conversão de 128-bit.

---

### Story 5.3: Servidor & Ferramentas MCP (`transparencia-mcp`) para Consulta Dinâmica e Taxonomia Fiscal

As a developer / AI ecosystem user,
I want a Model Context Protocol (MCP) server exposing tools to inspect taxonomia, schema definitions, and execute analytical DuckDB queries,
So that internal web chat agents and external LLM agents (Claude, ChatGPT, etc.) query municipal transparency data via a standard, secure protocol.

**Acceptance Criteria:**
- **Given** o repositório TransparenciaWeb
- **When** um agente de IA acessa o servidor MCP `transparencia-mcp` (ou endpoint MCP em Next.js)
- **Then** as ferramentas MCP `list_marts_taxonomia`, `get_mart_schema` e `query_duckdb_mart` são expostas com JSON Schema estrito.
- **And** a ferramenta de taxonomia permite ao agente explorar tabelas, dimensões e colunas sob demanda sem entupir o prompt inicial com todo o schema do banco.

---

### Story 5.4: Camada de Contexto & Skills em Markdown (Regras Fiscais STN/MCASP)

As an AI prompt engineer / data architect,
I want structured Markdown Skills detailing accounting rules (STN/MCASP), fiscal formulas, Restos a Pagar rules, and domain-specific query patterns,
So that the AI agent generates accurate DuckDB queries without domain or accounting hallucinations.

**Acceptance Criteria:**
- **Given** a documentação de regras de negócio contábeis em `_bmad/skills/` ou `apps/web/lib/skills/`
- **When** o assistente fiscal prepara a chamada ao LLM
- **Then** o sistema injeta a Skill correspondente ao domínio solicitado (Posição Fiscal, CAPREM, Saúde, Licitações, Pessoal).
- **And** o prompt combina **Layered Runtime Context Injection** (`portal_slug` ativo, ano do exercício selecionado, rota atual).

---

### Story 5.5: Assistente Fiscal no Frontend (`assistant-chat-drawer.tsx` + Tool Calling, Charts & Feedback Telemetry)

As a citizen / auditor,
I want an interactive chat drawer accessible from the header featuring suggested questions, formatted answers, KPI cards, charts, and feedback buttons (Thumbs Up / Down),
So that I can explore municipal transparency data in natural language with visual evidence and rate response quality in real-time.

**Acceptance Criteria:**
- **Given** o botão "Perguntar aos Dados" no cabeçalho do portal
- **When** o usuário abre o `assistant-chat-drawer.tsx` e envia uma pergunta
- **Then** o backend invoca o LLM via Tool Calling / ReAct executando a query DuckDB correspondente.
- **And** a resposta renderiza a explicação textual, KPI cards formatados (`fmtMoney`), gráfico dinâmico (barras/linhas) e a query SQL gerada para auditoria do cidadão.
- **And** cada resposta do assistente renderiza botões de avaliação rápida (👍 Útil / 👎 Impreciso) que disparam o evento de telemetria `ai_feedback` (`score`, `message_id`, `answer_snippet`, `portal_slug`, `ano`) diretamente para o PostHog.

---

### Story 5.6: Harness de Avaliação Determinística (Evals) & Suíte de Testes de Paridade de IA (`make test/evals`)

As a quality engineer,
I want an automated Evals test harness (`make test/evals` ou `pnpm test`) running benchmark questions against the agent,
So that regressions, hallucinations, or wrong calculation outputs are caught before deployment.

**Acceptance Criteria:**
- **Given** um conjunto de mais de 50 perguntas de benchmark (ex: `eval-12` testando retenção patronal e rombo previdenciário do CAPREM) com gabarito fiscal extraído dos marts dbt
- **When** o comando `make test/evals` ou `pnpm test` é executado
- **Then** o harness dispara as perguntas para a pipeline do assistente/MCP e compara os valores numéricos gerados contra o gabarito.
- **And** o teste falha se a discrepância percentual for maior que 0% em métricas contábeis.

---

### Story 5.7 (Deferred / Post-V1): Avaliador Automatizado (*LLM-as-a-Judge*) & Webhooks de Qualidade no PostHog

As a lead AI engineer / product manager,
I want an automated LLM-as-a-Judge pipeline that periodically audits production conversation traces from PostHog and alerts on low-score feedbacks,
So that we continuously measure agent accuracy, catch edge-case hallucinations, and auto-generate benchmark test cases without manual log inspection.

**Acceptance Criteria (Deferred):**
- **Given** as gerações de IA registradas no PostHog via evento `$ai_generation` e os feedbacks negativos via `ai_feedback` (`score: -1`)
- **When** o cron/worker de avaliação diária (*LLM-as-a-Judge*) é executado à meia-noite
- **Then** ele lê todas as respostas do dia no PostHog, submete a um modelo avaliador (Gemini 3.6 Flash) para checar a fidelidade contra os resultados SQL do DuckDB e gera um relatório diário de acurácia (ex: 98.4% de precisão).
- **And** webhooks automatizados notificam o time via Slack/E-mail imediatamente quando um feedback `score: -1` (👎) for capturado no PostHog.
- **And** as interações reais que geraram dúvidas ou imprecisões são convertidas automaticamente em novos casos de teste no `benchmark-questions.ts`.

---

### Story 5.8: Limpeza do DuckDB-WASM e Migração da IA para PostgreSQL

As a fullstack developer,
I want to remove the experimental DuckDB-WASM execution infrastructure and align AI/MCP tools to execute directly against Supabase PostgreSQL via `@transparencia/db`,
So that we eliminate cold-start issues, network timeouts (10s), Vercel bundle size limits (50MB), and dynamic WASM downloads to `/tmp`.

**Acceptance Criteria:**
- **Given** o módulo `apps/web/lib/duckdb-executor.ts`
- **When** o código é refatorado
- **Then** a dependência `@duckdb/duckdb-wasm`, downloads para `/tmp` e conexões com o MotherDuck são eliminados.
- **And** a função `queryDuckDbParquet` invoca a função `executeRawSql` exposta em `@transparencia/db` utilizando Kysely sobre PostgreSQL.
- **And** a configuração `next.config.js` é limpa de entradas de WASM e `package.json` remove a dependência.
- **And** todas as suítes de testes (`pnpm test`) e compilação (`pnpm build`) passam com 100% de sucesso.

---

### Story 5.9: Otimização de Índices e Performance no Supabase PostgreSQL

As a database architect,
I want functional indexes on `unaccent(lower(...))` and a strict `statement_timeout` configured in Supabase Postgres,
So that text search queries run instantly and abusive queries are automatically terminated without degrading web dashboard performance.

**Acceptance Criteria:**
- **Given** o banco de dados PostgreSQL gerenciado no Supabase
- **When** o script de otimização de índices for executado
- **Then** as extensões `unaccent` e `pg_trgm` são ativadas.
- **And** índices expressionais btree em `unaccent(lower(...))` são criados para as colunas de busca em `fct_despesas`, `fct_licitacoes` e `dim_credor`.
- **And** a role do Postgres ou conexões do assistente configuram `statement_timeout = '5000ms'` (5 segundos).

---

### Story 5.10: Trava de Segurança e Rate Limiting no MCP / Vercel Edge

As a backend engineer,
I want a Rate Limiting middleware at the Vercel Edge / API layer limiting anonymous users to 5 queries per day,
So that public infrastructure is protected from automated abuse and scraping.

**Acceptance Criteria:**
- **Given** uma requisição de usuário anônimo enviada para `/api/mcp` ou assistente
- **When** o usuário atinge o limite de 5 consultas em 24 horas
- **Then** o servidor responde com erro HTTP 429 (`QUOTA_EXCEEDED` com `code: "ANONYMOUS_LIMIT_REACHED"`).
- **And** clientes MCP externos exigem chave de API assinada (`API_KEY`) para requisições ilimitadas.

---

### Story 5.11: Funil de Conversão (Segway UI) e Integração Supabase Auth no Assistente

As a product manager / UX designer,
I want the assistant chat drawer to display remaining anonymous queries and present a seamless sign-up modal via Supabase Auth upon reaching the limit,
So that free users are smoothly converted into registered users to unlock full historical access and benefits.

**Acceptance Criteria:**
- **Given** o componente de chat do assistente em `assistant-chat-drawer.tsx`
- **When** o usuário interage com o assistente
- **Then** o topo da gaveta exibe o contador discreto de perguntas restantes.
- **And** ao receber o status 429 (`QUOTA_EXCEEDED`), a UI abre o modal de cadastro via Supabase Auth (Google / Magic Link).
- **And** após a autenticação, a cota do usuário é ampliada e o acesso histórico completo é desbloqueado.

---

### Story 5.12: Expurgo Geral e Limpeza Definitiva de DuckDB e Cloudflare R2

As a fullstack developer,
I want to remove all residual dependencies, parquet sync scripts, and DuckDB references from the repository,
So that the codebase remains 100% clean, focused exclusively on Supabase PostgreSQL, and free of legacy technical debt.

**Acceptance Criteria:**
- **Given** a conclusão da migração serverless para PostgreSQL/Supabase
- **When** o processo de limpeza for executado
- **Then** as dependências `duckdb` e arquivos legados Parquet/R2 são totalmente expurgados.
- **And** todas as suítes de testes (`make test` e `pnpm test`) continuam 100% limpas e verdes.

---

### Story 5.13: Experiência Avançada de Uso, Cache KV Resiliente, SQL AST Guardrails e Telemetria de Token

As a fullstack engineer / product designer,
I want persistent local state (via native `useReducer` + `React Context`), route-aware question suggestions, resilient KV caching with graceful fallbacks (to PostHog and in-memory `Map` rate limiting), SQL AST Guardrails, and internal token usage telemetry,
So that the AI assistant delivers instant, secure, cost-monitored, and highly usable transparency interactions for citizens without single points of failure.

**Acceptance Criteria:**
- **Given** a gaveta de chat `assistant-chat-drawer.tsx` e a API do assistente
- **When** o usuário interage com o assistente fiscal
- **Then** o histórico de mensagens é restaurado do `localStorage` via `useReducer` + `React Context` sem dependências de estado externas.
- **And** o cabeçalho inclui um botão para reiniciar a conversa ("Nova Conversa") limpando o estado local.
- **And** o bloco de sugestões é ocultado após a 1ª pergunta, mantendo um botão de toggle para expandir/recolher.
- **And** as sugestões de pergunta adaptam-se dinamicamente à rota ativa (`/saude`, `/caprem`, etc.) e os resultados em tabela oferecem exportação para CSV.
- **And** um aviso legal estático no rodapé orienta o usuário a checar os dados antes de citações formais.
- **And** o middleware de cache KV responde perguntas idênticas em < 5ms; se o KV falhar, a requisição captura a exceção no PostHog (`$exception`) e prossegue consultando o Postgres diretamente.
- **And** o rate limit em `lib/rate-limit.ts` utiliza o KV distribuído como primário e recua suavemente para o `Map<string, RateLimitEntry>` em memória caso o KV esteja indisponível.
- **And** o middleware `sql-guardrail.ts` restringe queries a `SELECT`, exige `portal_slug`, e aplica `LIMIT 100` exclusivamente em buscas detalhadas, **preservando o cálculo contábil integral em queries de agregação (`SUM`, `AVG`, `GROUP BY`)**.
- **And** a telemetria interna rastreia a métrica de tokens consumidos (`ai_token_usage`) enviando para o PostHog sem exibir contadores na UI.

---

### Story 5.15: Blindagem de Guard-Rails, Rate Limit 429 UI & Superadmin Mode, Hero Welcome Card (Lucide Icons) e Supabase Auth Onboarding

**Status:** Completed 🎉

As a product manager / lead fullstack engineer,
I want explicit HTTP 429 error handling in `assistant-chat-drawer.tsx`, Superadmin bypass mode in `lib/rate-limit.ts`, PostHog rate limit telemetry, persistent local chat history, 100% removal of unicode emojis in favor of `lucide-react` icons, and a Supabase Auth conversion onboarding flow,
So that users receive friendly, actionable rate-limit feedback leading to account creation, developers can test without restrictions using Superadmin mode, and the chat UI delivers a clean, consistent, high-converting experience.

**Acceptance Criteria:**
- **Given** uma requisição do assistente que retorna HTTP 429 (`QUOTA_EXCEEDED`) pelo middleware `proxy.ts`
- **When** o `assistant-chat-drawer.tsx` processar a resposta
- **Then** ele **não** deve exibir a mensagem de erro genérica ("Desculpe, ocorreu um erro...").
- **And** para usuários anônimos (`ANONYMOUS_LIMIT_REACHED`), deve exibir um card amigável com um Call-To-Action destacado para criação de conta via Supabase Auth (`@supabase/ssr`).
- **And** para usuários autenticados (`USER_LIMIT_REACHED`), deve exibir uma mensagem clara informando o horário exato do reset da quota diária.
- **And** o evento `ai_rate_limit_reached` (`user_type`, `limit_count`, `reset_at`, `portal_slug`, `current_route`) deve ser enviado para o PostHog para rastreamento de funil.
- **And** o módulo `lib/rate-limit.ts` deve suportar o modo **Superadmin** (via header `x-superadmin-key` ou role `superadmin`), contornando 100% dos limites de requisição.
- **And** todos os emojis unicode (como 🛑, 🚀, 🔒, ⚡) na gaveta de chat e prompts do agente devem ser substituídos por componentes SVG nativos da biblioteca `lucide-react`.
- **And** o estado inicial da gaveta de chat deve exibir um Hero Card de Boas-Vindas centralizado apresentando os benefícios do portal (respostas em tempo real, gráficos, histórico) com ícones Lucide.
- **And** no ambiente de desenvolvimento/localhost, o histórico de mensagens da conversa deve ser restaurado de forma resiliente via `localStorage`.

---

### Story 5.16: Histórico de Conversas Local-First & Telemetria Anônima Desvinculada de Identidade

**Status:** Completed 🎉

As a portal user / citizen,
I want my AI assistant chat history to be saved locally in my browser by default and my conversation telemetry to be completely decoupled from my user identity,
So that I can revisit, rename, and manage my past fiscal queries across multiple sessions without feeling monitored or uncomfortable creating an account, while enabling future anonymous LLM-as-a-Judge evaluations.

**Acceptance Criteria:**
- **Given** o assistente fiscal em `assistant-chat-drawer.tsx`
- **When** o usuário interage e troca de conversas
- **Then** as conversas são salvas no `localStorage` por slug de portal com títulos e timestamps.
- **And** a UI da gaveta permite criar novas conversas, trocar entre sessões recentes e limpar todo o histórico local.
- **And** a telemetria do PostHog é sanitizada para desvincular textos de prompts de identidades de usuários logados (`distinct_id` anônimo/descartável `eval_id`).

---

### Story 5.17: Limitador de Caracteres, Guardrails de Escopo, Fallback Lucide & PostHog MCP Analytics

**Status:** Completed 🎉

As a portal user and system admin,
I want the AI assistant chat to provide character limits, scope guardrails (protecting individual salaries), Lucide-icon fallback navigation chips, and PostHog MCP Analytics with quota alerts at 70%,
So that citizens enjoy a smooth, direct chat experience, sensitive data is protected, and administrators receive real-time telemetry and threshold warnings before free-tier AI quotas expire.

**Acceptance Criteria:**
- **Given** a caixa de entrada do assistente e a API de chat
- **When** o usuário digita uma pergunta
- **Then** o input aplica `maxLength={300}` com contador visual visível a partir de 210 caracteres e tom âmbar a partir de 270 caracteres.
- **And** o System Prompt (`context-builder.ts` e `lrf-pessoal.md`) orienta a IA a recusar consultas de salários/remunerações individuais de servidores por nome/CPF (sem `if`s de string em TypeScript conforme Regra 15 do `AGENTS.md`).
- **And** a resposta do assistente utiliza o componente `AssistantFallbackChips` com ícones do `lucide-react` para oferecer atalhos de refinamento (`Search`) e navegação interna (`ExternalLink`) para as rotas da própria aplicação (`/[portalSlug]/pessoal`, `/despesas`, `/licitacoes`, `/saude`, `/caprem`).
- **And** as ferramentas MCP registram eventos de observabilidade no PostHog (`$mcp_tool_call` e `$ai_token_usage`) de forma 100% stateless (conforme Regra 14 do `AGENTS.md`), disparando alertas de cota para o admin no PostHog ao atingir 70% do Free Tier.

---

### Story 5.18: Modal de Compartilhamento Social Estilo YouTube & Rate Limiting MCP Stateless

**Status:** Completed 🎉


As a portal user and system admin,
I want a YouTube-style social sharing modal on assistant responses (with direct links to WhatsApp, X/Twitter, Telegram, LinkedIn, and Copy Text/Link with custom SVG icons) and stateless rate-limiting on MCP endpoints,
So that citizens can effortlessly share structured fiscal insights and citations on social media to generate organic engagement, while system administrators prevent API/MCP abuse through robust, stateless rate limits.

**Acceptance Criteria:**
- **Given** cada mensagem finalizada do assistente no drawer de chat (`assistant-chat-drawer.tsx`)
- **When** o usuário clica no botão `[Compartilhar]` (com ícone Lucide `Share2`)
- **Then** um modal estilo YouTube exibe a citação formatada (`> "Trecho..." \n\nFonte: MaisTransparência \nURL`) e botões de compartilhamento direto com ícones SVG vetoriais (`social-icons.tsx`).
- **And** ao clicar no botão do WhatsApp, X/Twitter, Telegram ou LinkedIn, abre a URL de compartilhamento nativa em nova aba (`target="_blank"`), com truncamento inteligente a 280 caracteres para o Twitter.
- **And** ao clicar em "Copiar Citação & Link", a citação inteira é copiada para a área de transferência com feedback de confirmação.
- **And** o servidor MCP e as APIs de chat aplicam rate limiting estateless (`lib/rate-limit.ts`) por IP/Token e validação rigorosa de parâmetros no backend (Regras 14 e 16 do `AGENTS.md`).

---

## Epic 6: Reformulação Fiscal da Homepage e Redesenho da Página de Despesas Detalhadas

Reformular a experiência visual e a precisão contábil da Homepage e da página de Despesas Detalhadas (`/despesas`), reestruturando o Card de Despesas com fracionamento claro entre valores Empenhados e Liquidados (Dívida Real), removendo seções com métricas ambíguas (Donut de Gastos Locais e Maiores Credores na Homepage), adotando agrupamentos por Áreas de Interesse Público (Funções STN) com ícones do pacote `lucide-react`, e otimizando a performance dos data loaders através de marts dbt pré-agregados.

### Story 6.1: Reformulação do Card de Despesas e Antiguidade de Restos a Pagar na Homepage

As a citizen / municipal auditor,
I want the Homepage Despesas card to display a clean Hero metric separating Empenhado and Liquidado amounts, along with proportion-filled annual bars and mobile-friendly inline text without tooltips,
So that I can immediately understand the real executed debt without confusing budget reservations with actual financial liabilities.

**Acceptance Criteria:**
- **Given** o componente de Card de Despesas da Homepage em `apps/web/components/cards-secundarios-visao-geral.tsx`
- **When** o card de despesas é renderizado no portal
- **Then** a métrica principal no topo exibe o valor formatado em formato ultra-clean de linha única: `R$ XX.Xmi / R$ X.Xmi liquidados`.
- **And** o texto de apoio exibe `pendentes a N fornecedores` sem a presença de tooltips em hover, prevenindo acionamentos acidentais em dispositivos móveis.
- **And** as barras de antiguidade por ano exibem preenchimento proporcional empilhado/bipartido, onde a base inferior da barra (cor viva/destaque) indica a porcentagem com valor **Liquidado** real e o topo (tom sutil/muted) indica o saldo apenas **Empenhado**.
- **And** as suítes de validação (`make test`, `make test/ts` e `pnpm build`) passam com 100% de sucesso.

### Story 6.2: Despoluição da Homepage e Transferência do Ranking de Credores para a Página Dedicada

As a citizen / municipal portal visitor,
I want the "Maiores Credores da Gestão Atual" section removed from the Homepage overview,
So that the homepage remains concise, high-level, and focused on macro fiscal indicators, while supplier-level details are cleanly hosted on the detailed expenses page.

**Acceptance Criteria:**
- **Given** a visão geral da Homepage em `apps/web/app/[portalSlug]/page.tsx`
- **When** a rota principal do portal é carregada
- **Then** a seção "Maiores Credores da Gestão Atual" não é mais renderizada na Homepage.
- **And** o View Model em `apps/web/app/[portalSlug]/view-model.tsx` e o loader correspondente não carregam mais os dados brutos de credores para a tela inicial.
- **And** a interface da Homepage permanece limpa e focada exclusivamente nos cards macrofiscais.

### Story 6.3: Mart dbt (`fct_despesas_por_funcao_metricas`) e Reader Kysely (`getDespesasPorFuncaoMetrics`) — DISPENSADA

**Status:** Cancelada / Dispensada (Decisão de Produto)  
*Nota: A visualização de gastos por Função STN ("Para onde vai o gasto, por função") já é entregue e mantida de forma dedicada na página de Execução Orçamentária (`/orcamento`). Para evitar redundâncias entre rotas e sobrecarga de marts duplicados, a distribuição por função não será duplicada na página `/despesas`.*

### Story 6.4: Redesenho Cidadão da Interface da Página de Despesas Detalhadas (`/despesas`)

As a citizen / municipal auditor,
I want a 2-section layout on `/despesas` featuring macro execution KPIs with YoY delta comparison, a transparent Restos a Pagar section highlighting Liquidado amounts (Dívida Real), and travel expenses without exposing individual server names,
So that I can easily understand where the municipal spending bottlenecks are, whether expenses are increasing or decreasing compared to previous years, and inspect actual executed liabilities.

**Acceptance Criteria:**
- **Given** a página de despesas em `apps/web/app/[portalSlug]/despesas/page.tsx`
- **When** o usuário acessa a rota `/despesas`
- **Then** a interface é organizada em 2 seções principais: (1) Saúde Financeira & Comparativo Anual; (2) Restos a Pagar & Dívida Real com Liquidados.
- **And** a seção de Restos a Pagar exibe o fracionamento explícito com o valor **Liquidado (Dívida Real / Processada)** e **Empenhado a Liquidar (Não-Processada)**, mantendo paridade visual com o card da visão geral da Homepage.
- **And** a seção de Diárias e Viagens exibe o custo total e médias do exercício comparados ao ano anterior, removendo gráficos de favorecidos individuais por nome de servidor.
- **And** todos os componentes são responsivos e adaptáveis para telas mobile sem tooltips perigosos em hover.

### Story 6.5: Leitores Fiscais Comparativos (YoY) e Cálculo de Dívida Real em `@transparencia/db`

As a web developer / data analyst,
I want atomic metric readers in `@transparencia/db` for year-over-year expense comparisons and Restos a Pagar liquidation breakdowns,
So that the `/despesas` route loader executes pre-aggregated, high-performance queries responding in under 10ms without performing manual math in presentation components.

**Acceptance Criteria:**
- **Given** as funções leitoras em `@transparencia/db/src/queries/`
- **When** solicitadas pelo loader de despesas
- **Then** a camada `@transparencia/db` fornece leitores atômicos para variação percentual do exercício atual em relação ao anterior (YoY) e detalhamento de liquidação de Restos a Pagar.
- **And** a execução do loader `loadDespesasData` realiza no máximo 5 consultas leitoras paralelas.
- **And** as suítes de validação (`make test`, `make test/ts` e `pnpm build`) passam com 100% de sucesso.

### Story 6.6: Atualização dos Guias de Consumo Público de IA (`llms.txt` e `llms-full.txt`)

As an AI agent / external LLM,
I want updated `/llms.txt` and `/llms-full.txt` documentation describing the new public expense metrics, STN function classifications, and restructured page routes,
So that external AI tools accurately interpret municipal expense execution stages and public interest breakdown according to Rule 12 of `AGENTS.md`.

**Acceptance Criteria:**
- **Given** a reestruturação das métricas públicas de despesas na Homepage e na rota `/despesas`
- **When** as alterações de interface e banco forem concluídas
- **Then** os arquivos públicos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` são atualizados documentando as novas métricas de liquidação, funções STN e tabelas de credores expostas aos cidadãos e assistentes de IA.
- **And** o conteúdo foca estritamente no entendimento do cidadão/agente externo sobre os conceitos orçamentários sem detalhes internos de código.

### Story 6.7: Radar de Opacidade Orçamentária e Auditoria Forense de Subitens Residuais (`.99`)

As a citizen, investigative journalist, or public prosecutor / auditor,
I want an automated forensic radar that measures the municipality's degree of accounting opacity (the proportion of expenditures buried under generic residual sub-items `.99`, such as `3.3.90.39.99` and `3.3.90.30.99`) and highlights textual mismatches where real sensitive spending (e.g. sanitation, fleet rental, public events, or construction) was hidden under general codes,
So that I can detect systematic attempts to evade public procurement thresholds, violate the Budgetary Specification Principle (Law 4.320/64, Arts. 5 and 15), and obscure public spending from civic oversight.

**Acceptance Criteria:**
- **Given** o modelo mart dbt `fct_despesas` e os lançamentos orçamentários municipais
- **When** as métricas de conformidade orçamentária forem compiladas pelo dbt e consultadas via `@transparencia/db`
- **Then** é calculada a **Taxa de Opacidade Contábil** do exercício (razão entre o total pago em subitens residuais `.99` e o total pago do orçamento municipal).
- **And** são identificados os maiores credores recebedores de recursos sob a rubrica `.99` juntamente com a amostra real de seus objetos contratuais para apontar desvios de classificação orçamentária (ex: consórcios intermunicipais, limpeza urbana, locação de palcos e vans).
- **And** a rota `/despesas` apresenta um painel/card dedicado de **"Termômetro de Opacidade Contábil"** categorizando o nível de risco (ex: Normal < 15%, Atenção 15-30%, Crítico > 30%) com histórico comparativo anual.
- **And** as suítes de validação (`make test`, `make test/ts` e `pnpm build`) passam com 100% de sucesso.

---

### Story 6.8: Modelo Intermediário de Reclassificação Orçamentária STN e Inferência de Natureza Sugerida

As a data engineer, citizen, or public auditor,
I want an intermediate dbt model (`int_despesas_reclassificadas`) backed by a canonical seed of STN/MCASP budget expense codes (`seed_naturezas_despesa_stn`) that infers a standardized `natureza_despesa_codigo_sugerido` and `categoria_objeto_sugerida` from raw spending objects,
So that `fct_despesas` is decoupled from monolithic regex rules, ambiguous classifications (such as waste management containers misclassified as generic vehicles) are properly resolved, and citizens can inspect accurate suggested classifications across public consortia, waste management, medical shifts, judicial injunctions, and outsourced labor.

**Acceptance Criteria:**
- **Given** os lançamentos orçamentários brutos em `int_despesas_consolidadas`
- **When** a pipeline do dbt processa a reclassificação orçamentária
- **Then** um seed SSOT `seed_naturezas_despesa_stn.csv` é criado contendo os subitens oficiais da Portaria STN/SOF e suas respectivas categorias macro do portal.
- **And** o modelo intermediário `int_despesas_reclassificadas` aplica a inferência léxica priorizada para gerar a coluna `natureza_despesa_codigo_sugerido`.
- **And** o mart `fct_despesas` consome `int_despesas_reclassificadas`, expõe `natureza_despesa_codigo_sugerido` e simplifica a derivação de `categoria_gasto_sensivel` de forma desacoplada e sem regexes redundantes.
- **And** a tabela de maiores fornecedores e a camada `@transparencia/db` são enriquecidas com as novas categorias sugeridas (*Consórcios de Saúde*, *Limpeza Urbana & Resíduos*, *Plantões Médicos*, *Sentenças & Bloqueios Judiciais*, *Mão de Obra Terceirizada*, etc.).
- **And** todas as suítes de validação (`make test`, `pnpm test` e `pnpm build`) passam com 100% de sucesso.

---

## Epic 7: Distribuição Cívica, Engajamento Comunitário, Newsletters Automatizadas e Social Sharing Dinâmico

Construir a infraestrutura de distribuição orgânica, engajamento cidadão recorrente e compartilhamento social para a população de Porciúncula (com arquitetura multi-tenant escalável para futuros municípios), integrando geração dinâmica de imagens OpenGraph (OG Cards) na edge para WhatsApp e redes sociais, sistema de newsletter e alertas municipais com Resend e React Email (com suporte nativo a double opt-in e unsubscribe conforme LGPD), automação de despachos pós-cargas de ELT e bot de publicação de manchetes fiscais no X.com (`@mtransparenciax`).

### Story 7.1: Geração Dinâmica de Imagens OpenGraph (OG Cards) para Compartilhamento Social e WhatsApp

As a citizen or journalist sharing a portal URL on WhatsApp, X (Twitter), or Telegram,
I want each page route (`/`, `/despesas`, `/licitacoes`, `/saude`) to automatically generate an informative 1200x630 dynamic OpenGraph preview card with real-time fiscal figures (e.g. Total Paid, Opacity Rate, Sensitive Spend Highlights),
So that recipients in community groups can immediately understand the context and be encouraged to click and inspect municipal public data.

**Acceptance Criteria:**
- **Given** as rotas públicas do portal em `apps/web/app/[portalSlug]/`
- **When** um link da Homepage (`/`), Despesas (`/despesas`), Licitações (`/licitacoes`) ou Saúde (`/saude`) é compartilhado em redes sociais ou mensageiros (WhatsApp, Telegram, X, iMessage)
- **Then** o Next.js gera dinamicamente na edge (via `ImageResponse` / `@vercel/og` / Satori) uma imagem PNG de 1200x630px personalizada para aquele `portalSlug`.
- **And** a imagem do card de `/despesas` exibe o Total Pago do exercício, a barra/status do Termômetro de Opacidade (`.99`) e os destaques das principais contas vigiadas (Combustíveis, Frotas).
- **And** a imagem do card da Homepage exibe o balanço geral (Receita vs Despesa) e o indicador de limite de pessoal da LRF.
- **And** a geração de imagem é tipada, consome as queries Kysely existentes e mantém tempo de resposta ultrarrápido com cache na edge.
- **And** as suítes de teste de renderização e build (`pnpm build`) passam com 100% de sucesso.

### Story 7.2: Infraestrutura de Newsletter Cívica com Resend, React Email, Modal Interativo e Links Sociais

As a resident of Porciúncula, civic leader, or public auditor,
I want to click a newsletter subscription button to open an engaging modal dialog where I can enter my email, as well as access official social media links (e.g. X.com / `@mtransparenciax` driven by environment variables),
So that I can follow municipal spending directly in my email inbox with guaranteed privacy, double opt-in, and one-click unsubscribe compliant with LGPD.

**Acceptance Criteria:**
- **Given** o banco de dados e a camada web do portal
- **When** o usuário clica no botão de inscrição no Header/Sidebar ou no Footer
- **Then** um modal interativo e acessível (`newsletter-modal.tsx`) é exibido com título amigável, badge do município (`portalSlug`), explicação clara da frequência (sem spam) e formulário com validação em tempo real.
- **And** ao submeter o e-mail, o registro é salvo com isolamento multi-tenant (`portal_slug`) e status pendente de confirmação.
- **And** um e-mail transacional de confirmação (double opt-in) é disparado via **Resend** utilizando template desenhado em **React Email** (`@react-email/components`) com o design system do projeto.
- **And** os e-mails enviados incluem suporte nativo aos cabeçalhos normativos de cancelamento de inscrição com 1 clique (RFC 8058 `List-Unsubscribe`) e link de cancelamento no rodapé.
- **And** o cancelamento atualiza o status na tabela do banco e sincroniza com a API de Audiences/Contacts do Resend.
- **And** é disponibilizado o componente `social-links.tsx` no Header/Sidebar e Footer renderizando o ícone oficial do X.com apontando para a URL/handle parametrizada via variável de ambiente (`NEXT_PUBLIC_X_URL` / `NEXT_PUBLIC_X_HANDLE`), com arquitetura extensível para novas redes sociais.
- **And** todas as suítes de testes (`newsletter-modal.spec.tsx`, `make test/ts` e `pnpm test`) passam com 100% de sucesso.


### Story 7.3: Automação de Alertas Pós-ELT e Boletim Periódico Municipal ("Radar Porciúncula")

As a subscribed citizen or municipal auditor,
I want to receive an automated notification whenever the data pipeline processes a new batch of municipal expenses, as well as a monthly digest ("Radar Porciúncula"),
So that I am automatically alerted to relevant spending deltas, large new contracts, and changes in accounting opacity without having to manually check the portal daily.

**Acceptance Criteria:**
- **Given** a conclusão com sucesso do pipeline de ELT (`dbt run` / carga de novos empenhos)
- **When** o script de despacho de alertas periódicos for executado
- **Then** é compilado um resumo contendo o delta de novos pagamentos do período, os maiores novos contratos assinados e a taxa de uso de subitens `.99`.
- **And** o boletim é despachado via Resend para todos os assinantes confirmados e ativos daquele `portal_slug`.
- **And** o layout do e-mail é 100% responsivo para leitura em clientes móveis (Gmail, Apple Mail, Outlook).

### Story 7.4: Integração Social e Bot Automatizado no X.com (`@mtransparenciax`)

As a follower of `@mtransparenciax` on X (Twitter),
I want automated public posts highlighting new data extraction completions, monthly spending totals, and portal release notes,
So that municipal transparency findings reach journalists, regional activists, and civic influencers across social networks.

**Acceptance Criteria:**
- **Given** uma nova carga de dados concluída pelo pipeline ou uma nova release publicada no `CHANGELOG.md`
- **When** o workflow de automação social for acionado
- **Then** é publicada uma mensagem estruturada na conta `@mtransparenciax` contendo os destaques fiscais resumidos e link encurtado direto para a página correspondente.
- **And** a publicação inclui hashtags temáticas da cidade e de controle social (`#Porciuncula`, `#TransparenciaFiscal`).
- **And** o workflow trata falhas de API com tolerância a erros sem bloquear o pipeline principal de dados.

### Story 7.5: Documentação de Canais de Distribuição e Sincronização dos Guias de IA (`llms.txt`)

As an external AI assistant, search engine, or citizen,
I want updated documentation in `llms.txt` and `llms-full.txt` explaining available notification channels, subscription endpoints, and LGPD privacy policies,
So that AI agents consuming the portal can inform citizens on how to subscribe to automated municipal spending alerts in accordance with Rule 12 of `AGENTS.md`.

**Acceptance Criteria:**
- **Given** a inclusão dos canais de newsletter, alertas de extração e compartilhamento social
- **When** as funcionalidades forem integradas
- **Then** os arquivos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` são atualizados documentando os novos recursos de inscrição e distribuição pública.
- **And** as diretrizes de governança e privacidade de dados são explicitadas.

### Story 7.6: Centralização, Tipagem e Validação de Variáveis de Ambiente com `@t3-oss/t3-env` e Zod

As a developer or site reliability engineer,
I want all client and server environment variables to be strictly declared, validated at build-time and runtime, and strongly typed using `@t3-oss/t3-env` (`@t3-oss/env-nextjs`) and Zod,
So that missing secrets, malformed URLs, or configuration mismatches fail fast with clear diagnostic messages before reaching production, and client-side code never accidentally leaks private server credentials.

**Acceptance Criteria:**
- **Given** o ecossistema de variáveis de ambiente do projeto (`DATABASE_URL`, `RESEND_API_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, credenciais sociais do X e Facebook, etc.)
- **When** o pacote `@t3-oss/env-nextjs` e `zod` forem integrados em `apps/web/env.ts` (com versões fixas/pinadas conforme Regra 7 de `AGENTS.md`)
- **Then** as variáveis são formalmente segregadas em escopos `server` e `client` (`NEXT_PUBLIC_*`), validadas por schemas Zod estritos com tipos explícitos (`z.string()`, `z.string().url()`, `z.coerce.number()`, etc.).
- **And** fallbacks seguros e valores padrão são configurados para parâmetros opcionais em desenvolvimento local e testes (`RESEND_FROM_EMAIL`, `DATABASE_POOL_MAX`, `NEXT_PUBLIC_PROJECT_NAME`), mantendo opcionais segredos de serviços externos (`RESEND_API_KEY`, tokens do X e Facebook).
- **And** a opção `emptyStringAsUndefined: true` é habilitada para evitar que strings vazias (`""`) passem despercebidas como variáveis válidas configuradas.
- **And** a flag `skipValidation: !!process.env.SKIP_ENV_VALIDATION` é suportada para viabilizar builds de compilação em pipelines de CI/Docker sem necessidade de segredos reais.
- **And** é criado e sincronizado um arquivo `.env.example` completo e autodocumentado na raiz do repositório e em `apps/web/`, detalhando o propósito de cada variável de ambiente.
- **And** todos os acessos dispersos a `process.env` em `apps/web` (componentes, data loaders, rotas de API, bots e scripts CLI) são migrados para o objeto canônico e tipado importado de `@/env`.
- **And** é implementada uma suíte de testes automatizados (`apps/web/env.spec.ts`) cobrindo cenários de validação bem-sucedida, valores padrão e rejeição de formatos inválidos.
- **And** todas as validações mandatórias (`pnpm test`, `pnpm build`, `make test` e `make check`) passam com 100% de aprovação.

---

## Epic 8: Auditabilidade Cívica ('Show Your Work'), Transparência Metodológica e Navegação Mobile Contínua

Elevar a autoridade técnica e a usabilidade do portal através de auditoria direta dos dados brutos por cidadãos, vereadores e órgãos de controle, implementando o botão "Baixar Registros Deste Valor" (Show Your Work) em streaming CSV com paridade matemática exata, popovers decompostos da Dívida Real por entidade/órgão para contextualizar despesas sensíveis, badges explícitos de perímetro contábil (`Consolidado` vs. `Filtrado por Órgão`), barra fixa de navegação contínua no rodapé para dispositivos móveis (`MobileBottomNav`) e atualização da documentação metodológica pública para cidadãos e assistentes de IA (`llms.txt`).

### Story 8.1: Estabilização do CI e Alinhamento dos Testes de Variáveis de Ambiente e Redes Sociais

As a developer or CI/CD reliability engineer,
I want the automated test suites (`env.spec.ts` and `social-links.spec.tsx`) to accurately reflect the canonical default fallback URL for Facebook (`https://facebook.com/profile.php?id=`),
So that continuous integration pipelines run completely green without false-positive failures on default environment configurations.

**Acceptance Criteria:**
- **Given** o módulo canônico `apps/web/env.ts` com o valor padrão institucional `NEXT_PUBLIC_FACEBOOK_URL` definido como `"https://facebook.com/profile.php?id="`
- **When** as suítes de testes `apps/web/env.spec.ts` e `apps/web/components/social-links.spec.tsx` forem executadas
- **Then** as asserções de teste validam com precisão o valor padrão `"https://facebook.com/profile.php?id="` sem divergências.
- **And** a telemetria do PostHog disparada no clique do link do Facebook nos testes reflete a URL esperada.
- **And** todas as validações mandatórias (`make test/ts`, `pnpm test`, `make test`, `make check` e `pnpm build`) passam com 100% de sucesso.

### Story 8.2: Barra Fixa de Navegação Mobile Contínua (`MobileBottomNav`) com Stepper Cívico e Seletor de Ano

As a mobile citizen browsing the municipal transparency portal,
I want a sticky bottom navigation bar with "Previous" and "Next" stepper controls, a quick link to Overview, and an integrated year switcher,
So that I can fluidly flip through all portal sections (Overview, Expenses, Revenue, Budget, Procurement, Personnel, Health, Pension) with one hand without getting trapped on the homepage.

**Acceptance Criteria:**
- **Given** as rotas públicas do portal em `apps/web/app/[portalSlug]/`
- **When** o usuário acessa o portal em telas menores (`md:hidden`)
- **Then** uma barra fixa elegante (`MobileBottomNav`) é renderizada no rodapé com `z-50`, fundo translúcido (`backdrop-blur`) e padding de segurança inferior (`pb-safe`).
- **And** a barra exibe o botão `← Anterior` com o label da rota anterior e o botão `Próximo →` com o label da próxima rota, respeitando a sequência canônica de páginas do portal.
- **And** no centro da barra, há um botão de retorno para `🏠 Início` e um seletor compacto de exercício/ano (ou badge de ano ativo).
- **And** o layout global mobile adiciona padding inferior adequado (`pb-20`) para evitar que a barra sobreponha rodapés, botões ou dados tabulares.
- **And** a barra fica oculta automaticamente em visualização desktop (`md:block hidden`).
- **And** todas as suítes de teste de renderização mobile passam com 100% de sucesso.

### Story 8.3: Infraestrutura "Show Your Work" — Exportação Direta de Dados Brutos (CSV) por Card e Métrica

As a city councilor, investigative journalist, or public prosecutor,
I want to click a "Download Records for this Metric" button on any sensitive spending or opacity card to receive a raw CSV file,
So that I can verify line-by-line each commitment, creditor, invoice, and payment, confirming that the mathematical sum matches the displayed total cent-for-cent.

**Acceptance Criteria:**
- **Given** os cards analíticos de gastos sensíveis, termômetro de opacidade (`.99`) e despesas por função
- **When** o usuário clica no botão de auditoria `📥 Baixar Registros (CSV)`
- **Then** é acionado um endpoint de API seguro e em streaming (`/api/[portalSlug]/export`) que consulta a base Kysely e gera um arquivo CSV formatado.
- **And** o arquivo CSV inclui BOM UTF-8 (`\uFEFF`) e delimitador padrão (vírgula ou ponto-e-vírgula configurável) para abertura nativa e perfeita no Microsoft Excel e Google Sheets sem corrupção de caracteres acentuados.
- **And** o arquivo CSV contém as colunas de auditoria canônicas: `numero_empenho`, `data_empenho`, `orgao_nome`, `credor_nome`, `credor_cpf_cnpj`, `objeto_descricao`, `valor_empenhado`, `valor_liquidado`, `valor_pago`, `natureza_codigo`.
- **And** a soma da coluna `valor_pago` do arquivo baixado é exatamente idêntica ao número agregado exibido no card da interface.
- **And** a geração é realizada em streaming assíncrono para prevenir estouro de memória no servidor e suporta rate-limiting anônimo.
- **And** testes automatizados validam a integridade dos dados, headers de download e correspondência centavo a centavo com as queries do portal.

### Story 8.4: Popover Decomposto da Dívida Real por Entidade no Radar de Gastos Sensíveis

As a citizen or public auditor inspecting sensitive expense metrics (such as Accumulated Fuel Debt),
I want to click or tap the debt figure to open a decomposed popover showing a mini-table with proportional percentage bars by municipal entity,
So that I can immediately understand which municipal entity (e.g. Health Fund for ambulances vs. City Hall cabinet) generated the liability, preventing misinformation and false assumptions.

**Acceptance Criteria:**
- **Given** os cards do Radar de Gastos Sensíveis (ex: Combustíveis & Frotas) na página de despesas ou homepage
- **When** o usuário interage (clique, toque no mobile ou hover no desktop) com o valor da Dívida Real Acumulada
- **Then** abre-se um Popover acessível e interativo (Radix UI / Popover) detalhando a composição exata por entidade/órgão.
- **And** o popover exibe cada entidade (ex: *Fundo Municipal de Saúde*, *Prefeitura Municipal*, *Fundo de Meio Ambiente*) com o valor em reais, o percentual relativo e uma barra de progresso visual proporcional.
- **And** o componente lida graciosamente com entidades secundárias de baixo valor agrupando-as ou ordenando-as em ordem decrescente de relevância.
- **And** o popover possui foco gerenciado, fechamento por clique fora ou tecla Escape e excelente legibilidade em dispositivos móveis.
- **And** testes unitários e de componente cobrem a abertura do popover, cálculos proporcionais e acessibilidade.

### Story 8.5: Seletor Compacto de Perímetro Institucional no Header Móvel (`Consolidado` vs. `Filtrado por Entidade`)

As a user navigating municipal metrics on mobile devices,
I want a compact institutional perimeter dropdown in the top mobile header mirroring the year dropdown,
So that I can immediately identify and toggle between consolidated and entity-filtered views without cluttering page cards or needing to open the full drawer menu.

**Acceptance Criteria:**
- **Given** o cabeçalho superior móvel (`Top Header Móvel (< md)`) em `packages/ui/src/components/sidebar.tsx`
- **When** a página é renderizada em dispositivos móveis (`md:hidden`)
- **Then** no lado oposto ao seletor de ano (`YearSelect variant="compact"`), é renderizado um gatilho de seleção de entidade com rigorosa simetria visual externa (mesma tipografia `text-xs font-medium text-ink`, borda inferior `border-b border-borderLine`, altura compacta e ícone `ChevronDown` discreto).
- **When** nenhuma entidade estiver filtrada (visão padrão consolidada)
- **Then** o gatilho exibe o rótulo `Consolidado` (ou `Todas`) acompanhado da seta indicadora.
- **When** uma ou mais entidades estiverem selecionadas no filtro
- **Then** o gatilho reflete o escopo ativo (nome da entidade para seleção única, ou `N entidades` para seleção múltipla) com destaque visual sutil indicando filtro ativo.
- **When** o usuário toca ou clica no gatilho
- **Then** abre-se um Popover/Dropdown flutuante compacto e acessível posicionado logo abaixo do gatilho, exibindo a lista de entidades disponíveis com checkboxes interativos e opção de alternar rapidamente entre "Todas as entidades (Consolidado)" e órgãos individuais.
- **And** a seleção é sincronizada em tempo real com o parâmetro de busca `entidades` na URL via `useQueryState("entidades")`, atualizando dinamicamente as métricas da página e mantendo paridade com o filtro da Sidebar do desktop.
- **And** o componente possui foco gerenciado, fechamento por clique fora ou tecla Escape e atributos WAI-ARIA adequados (`aria-haspopup="dialog"`, `aria-expanded`).
- **And** testes unitários e de componente cobrem ambos os estados do gatilho, abertura/fechamento do popover e manipulação dos checkboxes.

### Story 8.6: Documentação Metodológica Cívica e Sincronização dos Guias de IA (`llms.txt`)

As an external AI assistant, investigative researcher, or citizen,
I want updated documentation in `llms.txt` and `llms-full.txt` describing the calculation methodologies, the "Show Your Work" export endpoints, and the institutional consolidation rules,
So that AI agents consuming the portal can explain to citizens exactly how calculations were derived and provide direct download links to audit spreadsheets in accordance with Rule 12 of `AGENTS.md`.

**Acceptance Criteria:**
- **Given** a inclusão dos endpoints de exportação CSV, popovers de decomposição da dívida e badges de perímetro
- **When** as histórias da Epic 8 forem integradas
- **Then** os arquivos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` são atualizados documentando a especificação dos endpoints de download CSV, notas metodológicas e critérios de consolidação institucional.
- **And** a suíte de testes automatizados de integridade e leak-check (`llms-guides.spec.ts`) valida a documentação com 100% de sucesso.

---

## Epic 9: Consistência Cívica, Indicadores da Saúde e Disponibilidade Financeira SICONFI (MSC)

Garantir fidelidade cronológica na data de extração, responsividade e ordenação consistente, redesign com tom de alerta e indicadores HHI na Saúde, e ingestão oficial dos saldos bancários e de caixa da Matriz de Saldos Contábeis (MSC) do Tesouro Nacional / SICONFI.

### Story 9.1: Quick-Wins de Consistência na UI: Data de Extração Real, Responsividade Mobile no Elemento Pai (.99) e Ordenação Nativa em Licitações

As a citizen or municipal transparency analyst accessing the portal on desktop or mobile devices,
I want the partial year indicator to reflect the exact month of data extraction, the generic expense breakdown card (.99) to display comfortably on mobile screens without squished labels, and the contracts table under procurement to sort by clicking column headers like all other tables in the portal,
So that I get accurate chronological context, flawless mobile readability, and a consistent, standard navigation experience across the platform.

### Story 9.2: Redesign de Indicadores na Página da Saúde: Emendas Parlamentares em Linha Única, Alerta Âmbar no Hero e Concentração de Fornecedores HHI

As a civic researcher or citizen auditing public health expenditure,
I want the health overview to display parliamentary amendments in an uncluttered single-line format, highlight unspent allocations with amber warnings in the hero, and classify pharmaceutical supplier concentration using the Herfindahl-Hirschman Index (HHI),
So that I can immediately detect underutilization of earmarked funds and dependency on concentrated suppliers.

### Story 9.3: Pipeline ELT & Modelagem SICONFI: Extração da MSC Patrimonial e Mart de Disponibilidade de Caixa por Entidade

As a civic researcher, public manager, or citizen seeking audited treasury balances,
I want the ELT pipeline to ingest the official Monthly Accounting Balance Matrix (MSC Patrimonial - Classe 1) directly from the National Treasury Secretariat (STN / SICONFI API) and transform it into a consolidated dbt mart of cash availability by municipal entity (City Hall, Health Fund, Social Assistance Fund, Pension Fund, and City Council),
So that our database can accurately report the true bank and cash balances for each autonomous fund without relying on inaccurate budgetary flow estimates.

### Story 9.4: Apresentação da Posição Financeira e Saldo em Caixa por Entidade na Web

As a citizen, journalist, or public policy researcher exploring the transparency portal,
I want to view the verified bank and cash balances for each municipal entity (such as the Social Assistance Fund, Health Fund, City Hall, and Pension Fund) with full attribution to the National Treasury Secretariat (STN/SICONFI),
So that I can clearly see how much actual money each entity holds in bank accounts without confusing cash availability with uncommitted budget surplus.

### Story 9.5: Painel de Pessoal por Regime Jurídico e Vínculo Funcional na Página /pessoal

As a citizen, journalist, or public administration analyst auditing personnel expenditures,
I want to view municipal staff and payroll broken down by legal regime and appointment type (concursados/efetivos, comissionados/livre nomeação, contratos temporários e RPPS/previdenciários),
So that I can identify spending bottlenecks, assess the balance between career civil servants and political appointees, and monitor compliance with fiscal transparency standards.

**Acceptance Criteria:**
- **Given** os dados brutos de folha em `raw_porciuncula_prefeitura.pessoal` contendo campos nativos de classificação (`tiporegime`, `tipocontrato`, `situacaofuncional`, `matricula`)
- **When** o modelo staging `stg_porciuncula_prefeitura__pessoal` e `_sources.yml` forem atualizados
- **Then** as colunas nativas de classificação e vínculo são resgatadas e higienizadas (removendo a necessidade de aproximações heurísticas por substring).
- **When** a fato atômica `fct_pessoal` (via `int_pessoal_consolidado`) for compilada
- **Then** centraliza a categorização canônica em lowercase snake_case (`categoria_regime`: `efetivo_concurso`, `efetivo_comissao`, `comissionado`, `contrato_temporario`, `agente_politico`, `rpps_inativos`) e `regime_previdenciario` (`rpps`, `rgps`, `sem_regime`), permitindo refatorar `fct_pessoal_folha_metricas` para eliminar filtros frágeis (`LIKE '%FG%'`).
- **When** o modelo dbt mart `fct_pessoal_regime_metricas` é executado
- **Then** os registros são consolidados por `portal_slug`, `ano`, `empresa_id` e `categoria_regime`, computando métricas explícitas (`total_profissionais`, `total_proventos`, `provento_medio`, `percentual_profissionais`, `percentual_folha`).
- **When** a camada de dados Kysely (`@transparencia/db`) for consultada via reader `getPessoalRegimeMetrics`
- **Then** retorna DTOs tipados com chaves estritamente em `camelCase` e transformações funcionais imutáveis.
- **When** o usuário acessa a rota pública `/pessoal`
- **Then** é exibida uma seção dedicada e responsiva ("Composição do Quadro por Regime e Vínculo") apresentando a distribuição visual por categoria funcional, headcount, volume total de proventos e provento médio com badges semânticas, respeitando filtros de ano e entidade.
- **And** a funcionalidade de download CSV "Show Your Work" permite exportar a discriminação por regime de contratação.
- **And** a documentação em `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` é sincronizada conforme a Regra 12 de `AGENTS.md`.
- **And** a suíte de testes de integração e TypeScript (`make test`, `pnpm --filter web test`, `pnpm test`) valida a funcionalidade com 100% de sucesso.

**Deferred Work (Backlog Futuro):**
- `dim_servidor`: Modelagem de dimensão cadastral de servidores (aproveitando `matricula`, `cpf` anonimizado, `dataadmissao` e `datadesligamento` do raw) para análises avançadas de trajetória funcional, antiguidade e evolução salarial histórica individual.

## Epic 10: Fundação, Higiene de Dados e Isolamento de Schema

Modernizar e blindar a infraestrutura de dados e analytics, eliminando warnings do dbt, consolidando modelos redundantes, isolando marts analíticos no schema dedicado `analytics` (com atualização das queries Kysely e permissões de acesso) e instituindo governança rígida sobre as fixtures de teste no CI/CD.

### Story 10.1: Auditoria, Enxugamento de Modelos Redundantes e Zero Warnings no dbt

As a data engineer and analytics developer maintaining the pipeline,
I want to eliminate all compiler warnings, deprecations, and configuration anomalies in dbt, while auditing and consolidating redundant or overlapping transformation models,
So that compilation is fast, maintainable, and free of technical noise or duplicate data processing.

### Story 10.2: Isolamento dos Marts Analíticos no Schema Dedicado `analytics`

As a system architect and backend engineer querying public fiscal data,
I want all dbt marts and analytics views to reside in a dedicated `analytics` schema (instead of `public`), with updated database roles/permissions in `elt/migrations/grant_readonly.sql` and corresponding Kysely queries in `@transparencia/db`,
So that analytics data is cleanly segregated from staging/raw schemas with robust security boundaries, preserving full transparency and seamless consumption across web applications.

### Story 10.3: Blindagem de CI/CD e Governança Estrita de Fixtures `.sql` de Teste

As a quality assurance engineer and developer submitting pull requests,
I want an automated validation mechanism in CI and local test suites that enforces synchronization between dbt models and test `.sql` fixtures,
So that PRs cannot be merged if fixtures are outdated, preventing silent test suite degradation and ensuring reliable parity testing across environments.

## Epic 11: Automação da Ingestão de Dados, Notificações PWA e Fontes Consolidadas (TCE-RJ e SICONFI)

Eliminar a dependência de extrações manuais em localhost através da automação do pipeline de ingestão (Cloudflare Workers, Containers e Cron Triggers), integrar notificações nativas e Web Push no PWA (com infraestrutura VAPID, consentimento/opt-in amigável e gatilhos automáticos para novas extrações e novas versões do app) e conduzir investigação e implementação de viabilidade de dados unificados no estado do Rio de Janeiro (TCE-RJ / SIGFIS e SICONFI) para acelerar o onboarding multi-cidade sem scrapers ad-hoc.

### Story 11.1: Spike de R&D — Viabilidade de Dados Granulares no TCE-RJ (SIGFIS) & SICONFI

As a data engineer and municipal civic researcher,
I want to audit and prototype extractions from the TCE-RJ (SIGFIS / Dados Abertos) and SICONFI APIs for municipalities in the state of Rio de Janeiro (specifically Porciúncula),
So that we determine whether granular expenditures (empenhos, liquidações, pagamentos), payroll, contracts, and tenders can be ingested from centralized state/federal sources instead of maintaining custom municipal portal scrapers.

**Acceptance Criteria:**
- **Given** as APIs públicas e portais de dados abertos do TCE-RJ (SIGFIS) e SICONFI (STN)
- **When** o spike de pesquisa técnica for executado para o município de Porciúncula (e amostragem de outros municípios fluminenses)
- **Then** produz um documento de viabilidade técnica (`tce-rj-sigfis-viability-report.md`) mapeando a granularidade disponível (despesas por item/favorecido, contratos, licitações, folha nominal de servidores).
- **And** estabelece uma matriz de comparação (cobertura, defasagem temporal de publicação, estabilidade de API e esforço de integração) entre a extração direta do portal municipal vs. ingestão unificada via TCE-RJ / SICONFI.
- **And** define uma recomendação arquitetural clara de migração ou modelo híbrido para expansão multi-cidade no estado do Rio de Janeiro.

### Story 11.2: Infraestrutura de Automação de Ingestão de Dados (Cloudflare)

As a DevOps and platform engineer,
I want an automated cloud pipeline for scheduled ELT extraction using Cloudflare services (Workers / Containers / Cron Triggers),
So that data ingestion runs periodically without manual intervention on localhost, with structured logging, failure alerts, and webhook triggers upon completion.

**Acceptance Criteria:**
- **Given** o pipeline de extração Python existente em `elt/`
- **When** empacotado e configurado para execução automatizada em nuvem (ex: Cloudflare Container / Worker agendado via Cron Trigger)
- **Then** a ingestão é executada periodicamente em horários programados sem depender de intervenção manual no localhost.
- **And** falhas de extração geram alertas monitoráveis e logs estruturados com telemetria adequada.
- **And** na conclusão bem-sucedida de cada ciclo de ingestão, o pipeline dispara um webhook interno seguro notificando o serviço de dados e preparando os gatilhos de atualização.

### Story 11.3: Backend & Infraestrutura de Web Push (VAPID, Subscriptions & Dispatcher)

As a backend engineer and transparency platform architect,
I want a robust Web Push notification infrastructure supporting VAPID keys, subscription persistence, and notification dispatching,
So that the platform can send push notifications to registered citizen devices whenever new data extractions are processed or new application versions are released.

**Acceptance Criteria:**
- **Given** a especificação do padrão W3C Web Push e chaves VAPID configuradas de forma segura via `@/env`
- **When** um cliente PWA solicita inscrição ou cancelamento de notificações
- **Then** os endpoints `/api/push/subscribe` e `/api/push/unsubscribe` validam e persistem os dados de subscrição (`endpoint`, `keys.p256dh`, `keys.auth`) em tabela dedicada no banco de dados (`push_subscriptions`) utilizando exclusivamente o tipo `TEXT` no PostgreSQL e DTOs em `camelCase`.
- **When** um evento de nova extração de dados ou deploy de versão for acionado
- **Then** um serviço dispatcher dispara mensagens de push formatadas para as subscriptions ativas, tratando e podando automaticamente inscrições expiradas ou revogadas (HTTP 410 Gone).

### Story 11.4: Frontend & UX de Consentimento e Gestão de Notificações no PWA

As a citizen using the municipal transparency portal as an installed PWA or browser application,
I want a non-intrusive, clear, and contextual interface to opt in or out of push notifications,
So that I receive timely system alerts when new municipal public spending data is extracted or when the app is updated, without receiving unsolicited browser permission prompts.

**Acceptance Criteria:**
- **Given** um usuário navegando no portal web ou executando o PWA instalado no desktop ou dispositivo móvel
- **When** uma oportunidade contextual for apresentada (ex: banner sutil de extração, rodapé ou configurações)
- **Then** o sistema oferece uma explicação clara do valor cívico das notificações antes de solicitar permissão nativa.
- **When** o usuário confirma o opt-in
- **Then** invoca `Notification.requestPermission()`, registra a subscrição no Service Worker (`sw.js`) e envia os dados para o endpoint de backend.
- **When** a permissão for concedida e novos dados forem publicados
- **Then** o usuário recebe uma notificação nativa do sistema operacional mesmo com o app fechado, com clique direcionando para a rota relevante da aplicação.
- **And** caso a permissão seja negada pelo usuário, o app respeita a decisão de forma elegante sem spam de novos prompts.

## Epic 12: Radar Cívico Ativo, Detecção de Anomalias e Funil de Engajamento

Transformar o portal da transparência em uma plataforma proativa de controle social e engajamento cívico, implementando motor estatístico no dbt para detecção de anomalias (segregando fluxos homólogos de estoques/snapshots instantâneos como explosão de comissionados e rombos de caixa), exibindo um feed mobile-first factual e não-acusatório na Homepage para guiar o cidadão para páginas profundas, ativando distribuição multicanal (Web Push e redes sociais) e disponibilizando o acompanhamento preventivo em tempo real de licitações abertas e em andamento em compras públicas e na saúde.

### Story 12.1: Modelagem dbt do Motor Estatístico de Anomalias Fiscais (Fluxo Homólogo vs. Estoque 1:1)

As a data engineer and municipal auditor,
I want a dedicated dbt mart (`fct_anomalias_fiscais_metricas`) that applies rigorous statistical detection (IQR e Z-score modificado) segregating flux metrics (comparação temporal homóloga mês-a-mês) from snapshot/structural metrics (comparação direta 1:1 de comissionados em pessoal e saldo em caixa),
So that anomalies are mathematically sound, immune to false-positives in partial fiscal years, and categorized with factual severity.

**Acceptance Criteria:**
- **Given** os marts consolidados de despesas, licitações, pessoal (`fct_pessoal_regime_metricas`) e saldos em caixa SICONFI (`fct_siconfi_caixa_por_entidade_metricas`)
- **When** o modelo analítico `fct_anomalias_fiscais_metricas` for compilado no dbt
- **Then** aplica regras estritas de diferenciação metodológica:
  - *Métricas de Fluxo (Despesas por Função e Licitações):* Para anos parciais (ano corrente), compara estritamente o período homólogo equivalente mês-a-mês (ex: Jan-Ago 2024 vs Jan-Ago de anos anteriores), prevenindo anomalias sazonais ilusórias.
  - *Métricas de Estoque/Snapshot (Pessoal e Disponibilidade Financeira):* Aplica comparação direta 1:1 do snapshot atual ativo (ex: headcount de comissionados e saldo de caixa bancário) contra as médias históricas do mesmo período de anos anteriores.
- **And** padroniza classificadores e dimensões em lowercase snake_case: `tipo_anomalia` (`explosao_comissionados`, `rombo_caixa`, `pico_despesa_homologa`, `concentracao_dispensa`), `dimensao_referencia` (`saude`, `educacao`, `comissionados`, `recursos_livres`, `dispensas`), `grau_severidade` (`critico`, `alto`, `moderado`), `desvio_percentual`, `valor_observado`, `valor_esperado`, `mes_inicial`, `mes_final` e `deep_link_rota`.
- **And** delega a composição textual factual e explicável para a camada de apresentação/ViewModel a partir das métricas brutas e dimensões padronizadas.

### Story 12.2: Camada de Acesso a Dados Kysely (`@transparencia/db`) com Roteamento Canônico e DTOs Tipados

As a fullstack engineer developing civic interfaces,
I want typed Kysely readers (`getRadarCivicoAlertas`) that return anomalies ordered by severity and civic relevance with pre-built deep links and contextual metrics,
So that UI components and background dispatchers consume clean, functional data with zero business logic leakage.

**Acceptance Criteria:**
- **Given** o schema `analytics` e o mart `fct_anomalias_fiscais_metricas`
- **When** o reader `getRadarCivicoAlertas(portalSlug, options)` for executado em `@transparencia/db`
- **Then** retorna DTOs tipados com chaves estritamente em `camelCase` (`tipoAnomalia`, `dimensaoReferencia`, `grauSeveridade`, `desvioPercentual`, `valorObservado`, `valorEsperado`, `deepLinkRota`, `mesInicial`, `mesFinal`), utilizando programação funcional imutável.
- **And** inclui parâmetros dinâmicos de filtro (portal, ano, severidade mínima e entidade) com ordenação prioritária por severidade decrescente e impacto financeiro/estrutural.
- **And** as rotas de destino (`deepLinkRota`) preservam os searchParams relevantes para navegação contínua (ex: `/[portalSlug]/pessoal?ano=2024#comissionados`).

### Story 12.3: Feed Mobile-First do Radar Cívico na Homepage com Linguagem Factual e Funil de Navegação

As a citizen browsing the transparency portal on mobile,
I want an engaging, factual, and non-accusatory "Civic Radar" card feed on the homepage highlighting notable anomalies (e.g., comissionados surge, health expenditure spikes),
So that I am intuitively guided out of the homepage into deep thematic sections without encountering aggressive or misleading headlines.

**Acceptance Criteria:**
- **Given** um usuário acessando o portal web (desktop ou dispositivo móvel)
- **When** a Homepage for renderizada
- **Then** exibe a seção destacada "Radar Cívico Municipal" posicionada no primeiro scroll da tela, contendo cards interativos baseados nos alertas do backend.
- **And** cada card exibe título objetivo, badge semântica de severidade, indicador de "Comparação Homóloga" ou "Posição Atual" e texto estritamente factual (ex: *"Em 2024, o número de cargos comissionados registrou um aumento de +65% em relação à média dos últimos anos"*).
- **And** cada card contém um botão de ação claro direcionando o cidadão para a página temática correspondente (`/pessoal`, `/saude`, `/despesas`, `/licitacoes`), operando como funil ativo de exploração.
- **And** disponibiliza botão de ação rápida "Compartilhar no WhatsApp" que gera mensagem com resumo factual e link direto para a página.

### Story 12.4: Distribuição Multicanal: Web Push, Cards Sociais e Telemetria PostHog

As a civic engagement coordinator and platform user,
I want confirmed critical anomalies to automatically trigger Web Push notifications, generate dynamic OpenGraph social cards, and track mobile navigation funnels in PostHog,
So that relevant civic findings are actively distributed across social channels (@mtransparenciax) and mobile devices, converting passive visitors into engaged researchers.

**Acceptance Criteria:**
- **Given** a infraestrutura de Web Push PWA implementada na Epic 11 e o bot social `@mtransparenciax` da Epic 7
- **When** um novo ciclo de ingestão registrar anomalias de severidade `critico`
- **Then** dispara automaticamente notificações push com deep links para os dispositivos cadastrados no PWA.
- **And** integra com o gerador de OpenGraph images dinâmico para renderizar cartões visuais otimizados para redes sociais (X, Instagram, WhatsApp).
- **And** instrumenta telemetria PostHog (`civic_radar_card_viewed`, `civic_radar_card_clicked`, `civic_radar_whatsapp_shared`, `funnel_home_to_internal_page`) para validar empiricamente a saída dos usuários da Homepage.

### Story 12.5: Radar de Licitações Abertas, Taxa de Contratação Direta e Alertas nas Páginas de Licitações e Saúde

As a citizen, local supplier, or investigative journalist,
I want to view the overall direct contracting rate (dispensas/inexigibilidades) with anomaly context, and monitor all ongoing and open public tenders ("Em Andamento") on `/licitacoes` and specifically for healthcare procurement on `/saude`,
So that I can monitor public procurement processes in real-time before contracts are awarded and understand whether the municipality is excessively relying on purchases without competitive bidding.

**Acceptance Criteria:**
- **Given** os dados de licitações em `analytics.fct_licitacoes` contendo registros com `situacao = 'Em Andamento'` (ou normalizado para `em_andamento`) e as anomalias de `concentracao_dispensa` em `analytics.fct_anomalias_fiscais_metricas`
- **When** o reader Kysely `getLicitacoesEmAndamentoMetrics` for consultado
- **Then** resgata a relação completa de compras públicas abertas com `licitacaoNumero`, `modalidade`, `objeto`, `dataAbertura`, `valorEstimado` e `entidadeNome`.
- **When** o usuário acessa a rota `/[portalSlug]/licitacoes`
- **Then** exibe na grade de KPIs o indicador consolidado de "Taxa de Contratação Direta" (% do volume financeiro total em dispensas, inexigibilidades e adesões a ata), acompanhado de badge e banner explicativo quando o exercício apresentar a anomalia `concentracao_dispensa` (ex: 48,87% em 2025 e 72,57% em 2026).
- **And** exibe uma seção dedicada "Licitações Abertas e em Andamento" com contadores, busca textual por objeto e listagem estruturada com badges de modalidade e prazo de abertura.
- **When** o usuário acessa a rota `/[portalSlug]/saude`
- **Then** a área de compras públicas da Saúde exibe um bloco específico destacando as licitações em andamento da pasta (medicamentos, insumos e equipamentos médicos).
- **And** o Radar Cívico da Homepage apresenta pílula de alerta indicando o volume de compras públicas atualmente em andamento no município com deep link para a seção.

### Story 12.6: Página de Histórico do Radar Cívico com Seções Anuais Cronológicas em Temas

As a citizen, researcher, or municipal auditor,
I want a dedicated page (`/[portalSlug]/radar`) accessible from the "Temas" sidebar group that aggregates all civic radar alerts across all available fiscal years organized into chronological sections,
So that I can audit historical governance anomalies and fiscal patterns across time without cluttering the current-year homepage feed.

**Acceptance Criteria:**
- **Given** o menu lateral de navegação (Sidebar) em qualquer página do portal
- **When** o grupo `Temas` for renderizado
- **Then** exibe o link "Radar Cívico" direcionando para `/[portalSlug]/radar` acompanhado do ícone `ShieldAlert`.
- **When** o usuário acessa a rota `/[portalSlug]/radar`
- **Then** exibe os alertas de anomalias detectadas em todos os anos disponíveis, agrupados por exercício em ordem cronológica decrescente.
- **And** os exercícios que não apresentarem anomalias apuradas são omitidos da listagem visual.
- **And** cada seção anual exibe o cabeçalho do exercício com contagem e severidade dos alertas, seguido de grade responsiva em 2 colunas (`md:grid md:grid-cols-2 gap-4`) utilizando o componente `RadarAnomaliaCard`.
- **And** uma barra de atalhos rápidos/âncoras permite rolagem suave para qualquer exercício listado.
- **And** caso nenhum alerta exista em todo o histórico, exibe estado de conformidade global.
- **And** sincroniza os guias de consumo por IA (`apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`).

### Story 12.7: Expansão do Radar Cívico: Detecção de Anomalias Previdenciárias (CAPREM / RPPS)

As a citizen, civil servant, or municipal fiscal auditor,
I want the civic radar engine (`fct_anomalias_fiscais_metricas`) to detect severe pension system liabilities (actuarial contribution defaults on Element 97 and unremitted employer contributions on Element 13),
So that unconstitutional pension defaults and structural actuarial risks are proactively identified, explained with official legal foundations, and deep-linked into the dedicated CAPREM portal.

**Acceptance Criteria:**
- **Given** os marts consolidados de previdência municipal (`fct_caprem_tendencia_atuarial_metricas` e `fct_historia_caprem_metricas`)
- **When** o modelo analítico `fct_anomalias_fiscais_metricas` for compilado no dbt
- **Then** adiciona a detecção de anomalias previdenciárias padronizadas em `lowercase snake_case`:
  - `inadimplencia_aporte_rpps`: inadimplência na cobertura de déficit atuarial (Elemento 97), quando `aporte_exigido > 0` e a taxa de adimplência for inferior a 90% (severidade `alto`) ou inferior a 70% (severidade `critico`).
  - `retencao_patronal_rpps`: retenção de cota patronal não repassada ao RPPS (`rombo_patronal_nao_repassado` no Elemento 13 > 0 e valor absoluto > R$ 20.000,00), com severidade `critico`.
- **And** estabelece rotas de destino (`deepLinkRota`) com âncoras temáticas para a página do CAPREM (`/[portalSlug]/caprem?ano=[ano]#atuarial` e `/[portalSlug]/caprem?ano=[ano]#patronal`).
- **And** atualiza os leitores e tipos Kysely em `packages/db` (`TipoAnomalia` com `"inadimplencia_aporte_rpps"` e `"retencao_patronal_rpps"`).
- **And** inclui o catálogo preliminar de candidatos a alertas sob análise para ativação posterior: compras e itens licitados da Story 12.8 (`desconto_nulo_pregao`, `disparidade_preco_item`, `concentracao_itens_fornecedor`, `desagio_extremo_inexequibilidade`, `compras_abertas_itens_criticos`) e harmonização cadastral de pessoal (`inconsistencia_vinculo_pessoal`).
- **And** atualiza as fixtures compactadas de banco (`make db/fixture/dump`) e valida integridade via `make test`.
- **And** mapeia na camada de apresentação (`apps/web`) textos neutros e factuais com links oficiais para o [Art. 40 da CF/88](https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art40) e [Lei Federal nº 9.717/1998](https://www.planalto.gov.br/ccivil_03/leis/l9717.htm).

### Story 12.8: Des-truncamento, Itens Licitados e Enriquecimento de Licitações (Contratos Internos, PNCP e TCE-RJ)

As a citizen, civic researcher, or municipal fiscal auditor,  
I want the transparency platform to enrich municipal tender objects and ingest item-level procurement data (including estimated reference prices, quantities, winning suppliers, and homologated prices) from the federal PNCP API and local contracts,  
So that truncated tender descriptions (150 chars) are replaced by untruncated descriptions and citizens can inspect individual line items and dispute results across all civic dashboards, search filters, and the Civic Radar.

**Acceptance Criteria:**
- **Given** que contratos locais em `raw_porciuncula_prefeitura.contratos` já possuem `objeto_completo` íntegro (até 1.041 chars) e que licitações estão truncadas em 150 caracteres na API municipal
- **When** o modelo intermediário `int_licitacoes_consolidadas.sql` for compilado
- **Then** aplica enriquecimento hierárquico `COALESCE(pncp.objeto, contrato_local.objeto_completo, licitacao_tce.objeto, municipal.discr)` e expõe a proveniência em `fonte_objeto`.
- **And** ingere compras, editais e metadados via API do PNCP (`https://pncp.gov.br/api/pncp/`) a partir de 2024, resgatando `objetoCompra` integral e `linkSistemaOrigem` (sala de disputa do pregão).
- **And** extrai e ingere a lista integral de itens licitados (`/compras/{ano}/{sequencial}/itens`) e os resultados de homologação por item com dados de fornecedores vencedores e descontos obtidos (`/itens/{numeroItem}/resultados`).
- **And** cria o modelo staging e o mart analítico `fct_licitacoes_itens` consolidando preços estimados vs. homologados e deságios.
- **And** atualiza o mart `fct_licitacoes` e cria o leitor Kysely `getLicitacaoItens` em `@transparencia/db` com DTOs em `camelCase`.
- **And** regera a fixture de banco (`make db/fixture/dump`) e valida a suíte de testes com `make test`.
- **And** exibe tabela expansível de itens licitados e links da sala de disputa na interface web, sincronizando os guias de IA (`apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`).

### Story 12.9: Componente Reutilizável de Truncamento Inteligente e Modal de Leitura para Células Extensas em Tabelas

As a citizen, civic researcher, or municipal fiscal auditor,  
I want table cells with extensive textual content (such as tender and contract objects) to display a compact truncated preview with an intuitive visual indicator that opens the full text in an accessible modal dialog upon click or keyboard interaction,  
So that I can read, audit, and copy comprehensive procurement objects without breaking table density, layout responsiveness, or mobile usability.

**Acceptance Criteria:**
- **Given** que textos longos de objetos de compras e contratos (500 a 1.200 caracteres) quebram a legibilidade das tabelas densas
- **When** o componente `TruncatedCellWithModal` for renderizado em `@transparencia/ui`
- **Then** exibe até 2 linhas de texto (`line-clamp-2`) acompanhado de um indicador visual sutil de expansão (*"Ver mais"* ou ícone discreto) quando o texto superar o limite.
- **And** clicar ou pressionar Enter/Espaço na célula abre o modal acessível `ModalDialog` exibindo o texto completo formatado, contexto do registro (processo/contrato/fornecedor) e botão de ação rápida "Copiar texto completo".
- **And** em telas móveis (`< 640px`), o modal se adapta responsivamente como Bottom Sheet.
- **And** integra o componente nas tabelas de licitações (`LicitacoesTable`), licitações em andamento (`LicitacoesEmAndamentoSection`), contratos vigentes (`ContratosServicosVigentesSection`) e saúde (`SaudeContratacaoSection`).
- **And** na página de licitações (`LicitacoesTable` e `LicitacoesPage`), quando acessada via deep link com parâmetro de busca (ex: `?numero=[numero]` ou `?filtro=sem_licitacao` / `?modalidade=dispensa`), aplica auto-filtro instantâneo na tabela ou posiciona a visualização via scroll suave com destaque visual temporário (highlight pulse) na linha do certame em auditoria; e se a URL contiver a âncora `#itens` (ex: `?numero=000290#itens`), abre automaticamente o modal com os itens licitados, preços unitários e fornecedores do respectivo pregão.
- **And** para a anomalia de inconsistência de vínculos de pessoal (`inconsistencia_vinculo_pessoal`), disponibiliza no card do Radar Cívico ou na seção de regime de pessoal (`#regime`) um gatilho de auditoria nominal que abre o `ModalDialog` com a listagem completa e paginada/pesquisável dos servidores com divergência cadastral apurada (Nome, Cargo, Categoria Declarada de Origem, Regime Jurídico Atribuído e Lotação), permitindo conferência e auditoria cívica transparente sem quebrar a densidade da interface.
- **And** valida os testes unitários em `packages/ui` e `apps/web` via `make test/ts`.

---

## Epic 13: Usabilidade Cívica, Descoberta Global e Governança

Elevar o patamar de usabilidade, encontrabilidade e governança cívica do portal da transparência através de sete intervenções estratégicas: busca global unificada de compras públicas (licitações e contratos via FTS no PostgreSQL com modal spotlight), sinalização inteligente e acessível do Radar Cívico nos pontos de navegação, seleção rápida e intuitiva de entidade única ("apenas esta") no seletor institucional, formalização da anomalia de dependência fiscal de transferências no dbt para exercícios fechados com embasamento no Art. 11 da LRF, institucionalização de Termos de Uso e Política de Privacidade aderentes à LAI e LGPD, otimização da densidade de tela mobile com toolbar em linha única para exportação CSV, e rolagem suave automática com compensação de cabeçalho fixo na paginação de tabelas densas.

### Story 13.1: Busca Global de Licitações e Contratos com Spotlight Modal e Postgres FTS

As a citizen, journalist, or civic researcher,  
I want a prominent and intuitive global search bar on the procurement page that opens a fast, keyboard-friendly spotlight modal to search across all public bids, tenders, and contracts,  
So that I can locate any procurement process, object description, or contracted supplier in seconds without having to hunt for embedded table filters.

**Acceptance Criteria:**
- **Given** a página pública de licitações e contratos (`/[portalSlug]/licitacoes`)
- **When** o usuário acessa a página ou pressiona o atalho de teclado `⌘K` / `Ctrl+K`
- **Then** exibe no topo da página (hero/header de licitações) uma barra de busca em destaque com atalho visual legível (*"Buscar número, processo, fornecedor ou objeto de licitação e contrato..."*).
- **And** ao focar ou clicar no campo, abre um modal interativo (Spotlight / Command Dialog com transição fluida, adaptando-se para visualização fullscreen no mobile).
- **And** a consulta de busca é processada nativamente no PostgreSQL utilizando Kysely em `@transparencia/db` (`searchLicitacoesEContratos`), combinando `tsvector` com `unaccent`, `websearch_to_tsquery('portuguese', ...)` e operador de similaridade trigram (`pg_trgm`) sobre `objeto`, `numero`, `fornecedor_nome` e `processo_adm`.
- **And** os resultados da busca são agrupados e segregados visualmente em duas seções: *Licitações Encontradas* e *Contratos*, exibindo número, valor formatado, status/modalidade, objeto resumido e link de navegação direta.
- **And** ao selecionar um resultado, o usuário é direcionado diretamente para o registro correspondente (ou linha destacada na tabela com scroll suave).
- **And** inclui cobertura de testes unitários e de integração validando busca exata por número com máscara/barra, busca por palavras sem acento e busca por razão social parcial.

### Story 13.2: Visibilidade e Sinalização do Radar Cívico na Navegação Desktop e Mobile

As a citizen or municipal fiscal auditor,  
I want clear, non-intrusive notification badges and status indicators for the Civic Radar in the primary navigation,  
So that I am immediately alerted to active critical fiscal anomalies without cluttering or sensationalizing the homepage hero section.

**Acceptance Criteria:**
- **Given** a existência de anomalias de severidade crítica apuradas pelo Radar Cívico para o exercício fiscal selecionado
- **When** o usuário navega pelo portal em qualquer dispositivo
- **Then** no menu lateral desktop (`Sidebar`), exibe ao lado do item "Radar Cívico" um badge numérico com a quantidade de alertas críticos (ex: `🚨 3`) acompanhado de um indicador pontual com pulso sutil (`motion-safe:animate-pulse`, respeitando `motion-reduce:animate-none` para acessibilidade).
- **And** na barra de navegação móvel (`MobileBottomNav`), exibe um dot discreto de notificação no botão "Mais" (onde a rota do Radar está aninhada), preservando a Topbar móvel limpa e desafogada.
- **And** a contagem de alertas ativos é resgatada através de uma consulta atômica e leve no `@transparencia/db` (`getRadarAnomaliasCount({ portalSlug, ano })`), sem impacto de latência no SSR do layout base.
- **And** caso o exercício fiscal selecionado não possua anomalias ativas (contagem igual a 0), os badges e indicadores luminosos permanecem totalmente ocultos.
- **And** valida os estados visuais e acessibilidade (`aria-label` descritivo) via testes automatizados em `packages/ui` e `apps/web`.

### Story 13.3: Seleção Rápida de Entidade Única ("Apenas Esta") no Multi-Select Institucional

As a citizen, researcher, or municipal auditor,  
I want to select a single government entity in the multi-select dropdown with one click by clicking its label text, while retaining multi-selection toggles on the checkboxes,  
So that I can quickly isolate one specific municipal agency without having to manually uncheck every other option.

**Acceptance Criteria:**
- **Given** o componente reutilizável `MultiSelect` em `packages/ui` utilizado na Sidebar e no Header
- **When** o usuário abre o dropdown de entidades
- **Then** cada linha de opção é segregada em duas zonas de interação acessíveis (sem elementos `<button>` aninhados no DOM):
  - *Área do Checkbox*: clicar no quadradinho do checkbox executa a alternância tradicional de seleção múltipla (toggle da entidade no array de selecionados).
  - *Área do Label/Texto*: clicar no texto da entidade executa a ação de **seleção exclusiva**, desmarcando instantaneamente todas as demais e selecionando apenas aquela entidade (`onChange([opt.id])`).
- **And** no desktop, ao passar o mouse sobre a linha da entidade (hover), exibe um indicador sutil à direita com o texto *"apenas"* para reforçar a previsibilidade da ação.
- **And** a opção "Todas as entidades" continua resetando a seleção para o conjunto completo (`[]`).
- **And** valida acessibilidade via teclado, atributos ARIA e testes unitários em `packages/ui/src/components/multi-select.spec.tsx` cobrindo o clique isolado no checkbox e o clique direto no label.

### Story 13.4: Modelagem e Integração da Anomalia de Dependência Fiscal no dbt e Radar Cívico

As a citizen, municipal fiscal auditor, or public manager,  
I want the fiscal dependency on external transfers to be modeled as an official first-class civic anomaly for closed fiscal years, backed by Article 11 of the Fiscal Responsibility Law (LRF),  
So that structural revenue vulnerability is systematically tracked across the Civic Radar, digests, and revenue dashboards without creating false alarms during in-progress fiscal years.

**Acceptance Criteria:**
- **Given** o modelo analítico dbt de anomalias fiscais `fct_anomalias_fiscais_metricas.sql`
- **When** o modelo for compilado no dbt
- **Then** adiciona a detecção analítica da anomalia `dependencia_transferencias` (com dimensão de referência `receita_propria`):
  - *Regra Temporal Estrita (Opção A)*: A anomalia é gerada exclusivamente para exercícios fiscais fechados e consolidados (`ano < extract(year from current_date)`), prevenindo falsos positivos decorrentes da sazonalidade de vencimento do IPTU/ISS em exercícios correntes em andamento.
  - *Critério de Disparo*: Percentual de receita própria (`(impostos + taxas + contribuicao_melhoria) / total_receita_corrente`) inferior a 10%, classificado com severidade `critico`.
  - *Deep Link*: Rota canônica `/[portalSlug]/receitas`.
- **And** atualiza o catálogo de tipos em `@transparencia/db` (`TipoAnomalia` com `"dependencia_transferencias"`).
- **And** formata no gerador narrativo factual (`radar-civico-narrative.ts`) a explicação descritiva neutra e objetiva, incluindo citação e link oficial para o [Art. 11 da LC 101/2000 (LRF)](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art11) em conformidade com as Regras 11 e 20 do AGENTS.md.
- **And** na página `/[portalSlug]/receitas`, substitui o `AlertBox` pontual pelo componente canônico do Radar Cívico (`RadarAnomaliaCard` ou banner temático de anomalia) quando houver anomalia apurada.
- **And** regera os fixtures compactados de teste via `make db/fixture/dump` (Regra 21) e valida com `make test`.

### Story 13.5: Criação das Páginas Estáticas de Termos de Uso e Política de Privacidade

As a platform user, citizen, or public authority,  
I want to consult transparent and legally grounded Terms of Use and Privacy Policy pages,  
So that I understand the civic, non-partisan nature of the platform, the legal foundation for publishing public data under the LAI, and the strict adherence to the LGPD.

**Acceptance Criteria:**
- **Given** a aplicação web pública (`apps/web`)
- **When** o usuário acessa as rotas `/termos` e `/privacidade`
- **Then** renderiza páginas estáticas (`export const dynamic = 'force-static'`) com tipografia em prosa confortável, cabeçalhos semânticos claros e metadados de SEO canônicos (`apps/web/lib/metadata.ts`).
- **And** os Termos de Uso esclarecem a natureza cívica e independente da plataforma, ausência de fins lucrativos, compilação de dados oficiais baseada na [Lei Federal nº 12.527/2011 (LAI)](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm) e [LC nº 131/2009](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp131.htm), legitimidade de divulgação salarial amparada pelo Tema 483 do STF e transparência em compras sob a [Lei 14.133/2021](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm).
- **And** a Política de Privacidade detalha a conformidade com a [LGPD (Lei nº 13.709/2018)](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm), a coleta estritamente mínima (apenas e-mail voluntário com double opt-in para boletim, com descadastro em 1 clique), telemetria anônima e compromisso inegociável de não comercialização de dados.
- **And** adiciona links institucionais discretos no rodapé global ([`GlobalFooter`](file:///Volumes/Projects/transparencia/apps/web/components/global-footer.tsx)): *"Termos de Uso"* e *"Política de Privacidade"*.
- **And** sincroniza os arquivos de documentação para agentes de IA (`apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`) conforme a Regra 12 do AGENTS.md.
- **And** adiciona testes automatizados de renderização e integridade dos links de rodapé.

### Story 13.6: Otimização da Barra de Ferramentas e Botão "Baixar CSV" no Mobile

As a mobile user browsing financial and procurement tables,  
I want the table search input and CSV export action to be arranged horizontally in a single compact row,  
So that valuable vertical screen space is preserved and table data is immediately visible above the fold.

**Acceptance Criteria:**
- **Given** o componente reutilizável `DenseTable` em `packages/ui` utilizado em todas as tabelas analíticas da plataforma
- **When** a tabela for renderizada em telas pequenas/mobile (`< 640px`)
- **Then** a barra de ferramentas superior adota layout em linha única (`flex items-center justify-between gap-2`), mantendo o campo de busca e o botão de exportação CSV lado a lado.
- **And** em visualização mobile (`< sm`), o botão de exportação se compacta como pílula com o ícone `<Download />` e rótulo simplificado *"CSV"*, preservando área de toque mínima acessível de 40px e `aria-label="Baixar planilha CSV"`.
- **And** em telas desktop (`>= sm`), o botão expande exibindo o rótulo completo parametrizado (ex: *"Baixar CSV"*).
- **And** a redução de altura vertical beneficia universalmente todas as tabelas do portal (Licitações, Contratos, Despesas, Receitas, Pessoal e Saúde).
- **And** valida os testes unitários de `packages/ui/src/components/dense-table.spec.tsx` garantindo o disparo correto do download CSV em ambos os viewports.

### Story 13.7: Scroll Suave Automático para o Topo da Tabela ao Paginar

As a mobile and desktop user navigating through paginated table pages,  
I want the viewport to smoothly scroll back to the top of the table whenever I switch pages,  
So that I am immediately positioned at the first row of the new page without having to manually scroll back through the entire list.

**Acceptance Criteria:**
- **Given** qualquer tabela paginada renderizada com `DenseTable` em `packages/ui`
- **When** o usuário clica em um número de página ou nos botões de navegação anterior/próximo (`←` ou `→`)
- **Then** além de atualizar a fatia de registros exibidos, a visualização rola suavemente para o início da tabela utilizando `scrollIntoView({ behavior: 'smooth', block: 'start' })`.
- **And** a referência do topo é gerenciada isoladamente via `useRef<HTMLDivElement>(null)` no container raiz do `DenseTable`, sem uso de IDs globais estáticos para prevenir colisões em páginas com múltiplas tabelas.
- **And** o elemento raiz recebe classe utilitária de compensação `scroll-mt-20 sm:scroll-mt-24` (scroll margin top de ~80px a ~96px), garantindo que a barra de busca e o cabeçalho da tabela não fiquem encobertos pela barra de navegação superior fixa.
- **And** valida o acionamento de `scrollIntoView` via testes unitários com mock no Vitest em `packages/ui/src/components/dense-table.spec.tsx`.

### Story 13.8: Deep-Link e Modal de Detalhes de Contratos com Retenção de Busca

As a citizen, journalist, or public auditor,  
I want to click on a contract search result or direct URL link and immediately view a detailed 360° modal of the contract without losing my search context,  
So that I can inspect full contract details, supplier credentials, and financial execution metrics with complete parity to procurement processes.

**Acceptance Criteria:**
- **Given** a seção de contratos de serviços vigentes (`ContratosServicosVigentesSection`) na rota `/[portalSlug]/licitacoes`
- **When** a página for carregada com parâmetro `contratoNumero` (ou `contratoId`), ou receber o evento `contrato:selected`
- **Then** abre automaticamente o Modal de Detalhes do Contrato (`ModalDialog`) exibindo dados completos (número, ano, status, fornecedor, CNPJ formatado, objeto integral, vigência, empenhado, liquidado, pago, saldo pendente e percentual pago).
- **And** rola suavemente até `#contratos-servicos-vigentes` e aplica highlight sutil na linha correspondente da tabela se visível.
- **And** quando selecionado a partir da busca Spotlight (`LicitacoesSpotlightModal`), preserva a busca em camadas e disponibiliza botão de retorno à busca, sem perder os termos e resultados anteriores ao fechar o contrato.
- **And** inclui cobertura de testes unitários e de integração validando deep-link, abertura via evento e renderização de métricas fiscais.

### Story 13.9: Desacoplamento de Rotas de Navegação do Mart `fct_anomalias_fiscais_metricas`

As a developer maintaining the codebase,
I want the `fct_anomalias_fiscais_metricas` mart to expose only semantic data fields (without any hardcoded URL strings),
So that routing logic lives exclusively in `apps/web` and any future navigation refactoring requires no dbt reprocessing.

**Acceptance Criteria:**
- **Given** o modelo `elt/transform/models/marts/metrics/fct_anomalias_fiscais_metricas.sql`
- **When** o modelo for refatorado
- **Then** a coluna `deep_link_rota` é completamente removida do mart — nenhum CTE deve mais construir strings de URL.
- **And** o campo `licitacao_numero TEXT` é adicionado à projeção final do mart, preenchido com o número da licitação nos CTEs `desconto_nulo_anomalias` e `desagio_extremo_anomalias`, e `NULL` em todos os demais.
- **And** o arquivo `packages/db/src/queries/radar-civico-alertas.ts` remove `"deep_link_rota"` do `.select()` do Kysely e adiciona `"licitacao_numero"`.
- **And** o DTO `RadarCivicoAlertaDTO` remove a propriedade `deepLinkRota` e adiciona `licitacaoNumero: string | null`.
- **And** a função `enrichDeepLink` e quaisquer referências a construção de URL são removidas de `packages/db`.
- **And** é criada a função `buildAlertaUrl(alerta: RadarCivicoAlertaDTO, opts?: { entidade?: string }): string` dentro de `apps/web`, próxima aos componentes que renderizam os alertas, mapeando `tipoAnomalia` para rota base, query params e âncora conforme a tabela canônica abaixo:

| `tipoAnomalia` | Rota base | Âncora |
|---|---|---|
| `pico_despesa_homologa` | `/despesas` | — |
| `explosao_comissionados` | `/pessoal` | `#comissionados` |
| `rombo_caixa` | `/receitas` | `#saldo-caixa` |
| `concentracao_dispensa` | `/licitacoes` | — |
| `opacidade_gastos_genericos` | `/despesas` | `#gastos-genericos` |
| `inadimplencia_aporte_rpps` | `/caprem` | `#atuarial` |
| `retencao_patronal_rpps` | `/caprem` | `#patronal` |
| `desconto_nulo_pregao` | `/licitacoes` | `#itens` + `&numero=licitacaoNumero` |
| `desagio_extremo_inexequibilidade` | `/licitacoes` | `#itens` + `&numero=licitacaoNumero` |
| `inconsistencia_vinculo_pessoal` | `/pessoal` | `#regime` |
| `dependencia_transferencias` | `/receitas` | — |

- **And** todos os componentes de alerta existentes em `apps/web` passam a usar `buildAlertaUrl(alerta)` em vez de consumir `deepLinkRota` diretamente do DTO.
- **And** as fixtures compactadas são regeradas via `make db/fixture/dump` e a suíte completa de testes passa via `make test` e `make test/ts`.

### Story 13.10: Refinamento da Busca de Licitações e Contratos: Vigência Plurianual, Fornecedores Homologados e Calibração Textual

As a citizen, journalist, or public auditor,  
I want the global search for procurements and contracts to accurately find suppliers, respect multi-year contract validity periods, and eliminate false-positive fuzzy matches,  
So that I can reliably locate ongoing contracts from previous years (e.g. 2024 contracts active in 2026), search procurement processes by winning bidder, and find companies regardless of punctuation variations.

**Acceptance Criteria:**
- **Given** a query unificada de busca em `packages/db/src/queries/licitacoes-contratos-search.ts`
- **When** um usuário busca contratos sob o escopo de um determinado ano de exercício (ex: `ano = 2026`)
- **Then** a filtragem temporal de contratos não se restringe apenas ao ano de assinatura (`ano = :anoParam`), mas inclui todos os contratos cuja vigência cubra o exercício solicitado (`ano_exercicio >= EXTRACT(YEAR FROM data_inicio) AND (vencimento_atual IS NULL OR EXTRACT(YEAR FROM vencimento_atual) >= ano_exercicio)`), garantindo que contratos plurianuais assinados em anos anteriores continuem visíveis e localizáveis enquanto estiverem vigentes ou executados no exercício.
- **And** para a busca de licitações, a consulta passa a correlacionar com `analytics.fct_licitacoes_itens` para incluir `fornecedor_nome` e `fornecedor_cpf_cnpj` dos itens homologados no índice de busca e projeção de resultados, permitindo encontrar processos licitatórios pelo nome ou documento da empresa vencedora (ex: busca por "DOHA" retornando os processos homologados para a empresa).
- **And** calibra o threshold e regras de similaridade trigramática (`word_similarity` / `similarity`), exigindo comprimento mínimo de caracteres (ex: `>= 5` letras) ou pontuação mínima elevada (ex: `> 0.50`), eliminando os falsos positivos em que palavras de 4 letras (como "doha") geravam match com a preposição "do" presente nos objetos de editais.
- **And** implementa normalização de pontuação e caracteres especiais em nomes corporativos e razões sociais (ex: desconsiderando pontos e espaçamentos irregulares como `L.PHILIPPE` vs `L. PHILIPPE` vs `L PHILIPPE`), assegurando paridade de correspondência tanto no FTS quanto em `ILIKE`.
- **And** no modal de busca (`LicitacoesSpotlightModal`), resultados de contratos vigentes originados de anos anteriores exibem claramente o badge do ano de celebração e o período de vigência atual.
- **And** inclui suíte completa de testes automatizados em `packages/db/src/queries/__tests__/licitacoes-contratos-search.spec.ts` cobrindo busca de licitações por fornecedor homologado, contratos vigentes plurianuais, tolerância a pontuação corporativa e ausência de falsos positivos trigramáticos.

---

## Epic 14: Sustentabilidade Previdenciária e Patrimônio Financeiro da CAPREM

Tornar visível e auditável pelo cidadão a trajetória de desidratação da poupança previdenciária da CAPREM (Instituto de Previdência dos Servidores de Porciúncula), expondo com rigor contábil — a partir dos dados oficiais da Secretaria do Tesouro Nacional (SICONFI / MSC Patrimonial) — a queda do patrimônio financeiro do RPPS de R$ 60,4 milhões em 2021 para R$ 35,9 milhões em 2025. A epic corrige a captura incompleta das contas de investimentos do RPPS na camada de dados, constrói a série histórica plurianual consolidada (caixa + aplicações), adiciona diagnóstico de causas estruturais (déficit de contribuição, patronal em atraso e diluição da base de efetivos) e integra um alerta automatizado de sustentabilidade atuarial no Radar Cívico — garantindo que a fala do vereador Saulo possa ser verificada publicamente em tempo real por qualquer cidadão.

### Story 14.1: Captura das Contas de Investimentos do RPPS na MSC Patrimonial e Consolidação do Saldo Financeiro Total

As a citizen or fiscal auditor,  
I want the CAPREM financial dashboard to show the real total financial assets of the pension fund — including not just checking accounts but also the investment portfolio managed in financial markets —  
So that the actual size and trajectory of the pension savings can be verified against official SICONFI/STN data.

**Acceptance Criteria:**
- **Given** o modelo de staging `stg_siconfi_msc_patrimonial.sql` em `elt/transform/models/staging/porciuncula_prefeitura/`
- **When** o modelo for recompilado no dbt
- **Then** a cláusula `conta_contabil like '111%'` é expandida para incluir também as contas de investimentos e aplicações temporárias a curto prazo da classe `114%` **exclusivamente quando** `poder_orgao = '10132'` (Instituto de Previdência / CAPREM), sem afetar a captura do caixa geral do Executivo (`10131`) nem da Câmara (`20231`).
- **And** a segregação entre `saldo_recursos_vinculados` (aplicações em fundos RPPS regulamentados pelo CMN — fontes `18%`, `28%`, `98%`) e `saldo_recursos_livres` é mantida corretamente na mart downstream `fct_saldo_caixa_siconfi`.
- **And** o `CapremSaldoCaixaCard` na rota `/[portalSlug]/caprem` passa a exibir o saldo total consolidado (caixa em conta corrente `111%` + carteira de aplicações `114%`), refletindo os valores oficiais do STN.
- **And** os testes de paridade existentes em `packages/db/tests` (`siconfi-caixa-metrics.spec.ts`) são atualizados para cobrir o cenário de consolidação caixa + aplicações para o órgão `10132`, validando que o Executivo não é afetado.
- **And** as fixtures compactadas são regeradas via `make db/fixture/dump` e a suíte completa de testes passa via `make test` e `make test/ts`.

### Story 14.2: Série Histórica Plurianual do Patrimônio Financeiro do RPPS (2021–Corrente)

As a citizen, journalist, or municipal council member,  
I want to see a year-by-year evolution of the total CAPREM financial patrimony since 2021,  
So that I can objectively verify the magnitude of pension savings depletion raised in the council session and hold the executive accountable.

**Acceptance Criteria:**
- **Given** os dados consolidados da mart `fct_saldo_caixa_siconfi` após a Story 14.1 (cobrindo caixa `111%` + aplicações `114%` para o órgão `10132`)
- **When** a função `getCapremActuarialTrendMetrics` em `packages/db/src/queries/historia-caprem-metrics.ts` for chamada
- **Then** o DTO `CapremActuarialTrendDTO` é estendido com o campo `patrimonioFinanceiroTotal: number` representando o saldo final de cada exercício (caixa + carteira de investimentos, conforme posição do último mês disponível do ano).
- **And** a série cobre no mínimo os exercícios de 2021 a 2025, com o ano corrente retornando o saldo da última competência homologada no SICONFI.
- **And** o DTO expõe adicionalmente `variacaoPatrimonioAbs: number` e `variacaoPatrimonioPct: number` (variação absoluta e percentual em relação ao exercício anterior), calculados diretamente na query Kysely sem duplicar lógica já presente no modelo dbt.
- **And** um novo modelo analítico dbt `fct_caprem_patrimonio_historico_metricas.sql` materializa a série anual com `portal_slug`, `ano`, `mes_referencia`, `saldo_caixa`, `saldo_aplicacoes`, `patrimonio_total`, `inconsistencia_declaracao_flag`, `variacao_abs` e `variacao_pct`, seguindo as Regras 9 e 10 do AGENTS.md (nomes explícitos e `lowercase snake_case`).
- **And** o modelo implementa a flag determinística e agnóstica `inconsistencia_declaracao_flag: boolean` que detecta exercícios onde a declaração de aplicações financeiras na MSC foi omitida ou invertida (`saldo_aplicacoes = 0` circundado por anos com carteira expressiva `> 10.000.000`).
- **And** em exercícios marcados com `inconsistencia_declaracao_flag = true` ou cujo exercício anterior tenha a flag ativa (ex: 2022 e 2023), o dbt aplica quebra de série metodológica definindo `variacao_abs = null` e `variacao_pct = null`, eliminando variações ilusórias causadas por anomalias de reporte.
- **And** o modelo é coberto por schema contract (`_fct_caprem_patrimonio_historico_metricas.yml`) com testes `not_null` e `positive_values` nos campos de patrimônio e `not_null` em `inconsistencia_declaracao_flag`.
- **And** as fixtures são regeradas via `make db/fixture/dump` e validadas com `make test`.

### Story 14.3: Visualização de Desidratação da Poupança e Diagnóstico de Causas na Rota `/caprem`

As a citizen, council member, or civic journalist,  
I want the CAPREM page to show a clear multi-year chart of pension fund depletion along with an objective diagnosis of its structural causes,  
So that I can understand not just that the savings are shrinking, but why — and what the risk horizon looks like.

**Acceptance Criteria:**
- **Given** a série histórica plurianual do patrimônio (`patrimonioFinanceiroTotal`, `inconsistenciaDeclaracaoFlag`, `variacaoPatrimonioPct`) da Story 14.2 disponível no DTO de `actuarialTrend`
- **When** o usuário acessa a rota `/[portalSlug]/caprem`
- **Then** a seção `CapremSaldoCaixaCard` ou uma nova seção `CapremPatrimonioHistoricoSection` renderiza um gráfico de área ou linha (`LineChart` / `AreaChart` via Recharts) com a série anual do patrimônio total, eixo Y em R$ e eixo X por exercício, destacando visualmente a trajetória de queda de 2021 para o ano mais recente.
- **And** caso um exercício possua `inconsistenciaDeclaracaoFlag = true` (ex: 2022), a UI renderiza um badge de aviso / nota de transparência metodológica ("Inconsistência de Declaração na MSC") esclarecendo a omissão de aplicações informada pelo ente ao SICONFI.
- **And** no exercício imediatamente subsequente à quebra de série (ex: 2023), a variação percentual é exibida como `N/D` (com tooltip metodológico de quebra de série) em vez de exibir taxas irreais decorrentes da inconsistência do ano anterior.
- **And** acima do gráfico, três KPI cards contextualizadores exibem: (1) *Patrimônio em [ano base]* (pico histórico observado), (2) *Patrimônio Atual* com variação percentual em relação ao pico, e (3) *Queima Média Anual* (diferença total / número de anos).
- **And** abaixo do gráfico, uma seção de diagnóstico objetivo e não-acusatório exibe as três causas estruturais identificadas, cada uma com ícone semântico, valor quantitativo e referência legal quando aplicável:
  - **Déficit de Contribuição**: rombo anual entre arrecadação e benefícios pagos, com referência à [Lei nº 9.717/1998](https://www.planalto.gov.br/ccivil_03/leis/l9717.htm).
  - **Cota Patronal em Atraso**: valor de `rombo_patronal_nao_repassado` do exercício selecionado, com referência ao [Art. 40 da CF/88](https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art40).
  - **Diluição da Base Contributiva**: razão atual de servidores temporários/efetivos vs. razão histórica, explicando que temporários contribuem para o RGPS e não para o RPPS local.
- **And** todos os links para legislação abrem em `target="_blank" rel="noopener noreferrer"` com ícone `ExternalLink`, em conformidade com a Regra 20 do AGENTS.md.
- **And** os guias de consumo por IA (`apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`) são sincronizados com as novas métricas e seções conforme a Regra 12 do AGENTS.md.
- **And** a suíte de testes de view model (`caprem/view-model.spec.ts`) é atualizada cobrindo os novos campos de patrimônio histórico e os KPIs de queima.

### Story 14.4: Alerta de Sustentabilidade Atuarial do RPPS no Radar Cívico

As a citizen, pension council member, or fiscal auditor,  
I want the Civic Radar to automatically generate a critical alert when the pension fund's financial patrimony falls by more than 20% over a rolling 3-year window,  
So that the depletion risk is proactively surfaced across the platform and not only visible to those who navigate to the CAPREM page.

**Acceptance Criteria:**
- **Given** os dados do novo modelo `fct_caprem_patrimonio_historico_metricas` contendo a série anual do patrimônio financeiro do RPPS
- **When** o modelo analítico `fct_anomalias_fiscais_metricas.sql` for compilado no dbt
- **Then** é adicionada a detecção da anomalia `desidratacao_patrimonio_rpps` com as seguintes regras:
  - *Critério*: `variacao_pct` acumulada nos últimos 3 exercícios disponíveis inferior a `-20%`, aplicável exclusivamente a exercícios fechados (`ano < extract(year from current_date)`).
  - *Severidade*: `critico`.
  - *Deep Link*: `/[portalSlug]/caprem?ano=[ano]#patrimonio`.
  - *Narrativa*: texto factual e não-acusatório gerado no `radar-civico-narrative.ts` explicando a queda percentual, o valor absoluto consumido e o horizonte de risco estimado se mantida a taxa de queima atual.
- **And** o `TipoAnomalia` em `@transparencia/db` é atualizado com `"desidratacao_patrimonio_rpps"`.
- **And** links obrigatórios no card do Radar Cívico para a [Resolução CMN nº 4.963/2021](https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?tipo=Resolução%20CMN&numero=4963) (política de investimentos RPPS) e para a [Lei nº 9.717/1998](https://www.planalto.gov.br/ccivil_03/leis/l9717.htm), com `target="_blank" rel="noopener noreferrer"` (Regra 20).
- **And** as fixtures compactadas são regeradas via `make db/fixture/dump`, os tipos Kysely atualizados e a suíte completa de testes validada via `make test` e `make test/ts`.

### Story 14.5: Consolidação da Rota /caprem: Remoção de Cards Redundantes e Foco Documental no CADPREV

As a citizen, council member, or municipal employee,  
I want the CAPREM page to present a clean, non-repetitive information hierarchy by removing redundant KPI cards already addressed in the Structural Causes Diagnosis,  
So that I can focus directly on the official debt acknowledgment agreements (CADPREV) and historical actuarial coverage without cognitive clutter.

**Acceptance Criteria:**
- **Given** a existência da nova seção `CapremPatrimonioHistoricoSection` que já diagnostica de forma aprofundada o Déficit no Aporte Atuarial, a Cota Patronal em Atraso e a Diluição da Base Contributiva
- **When** a rota `/[portalSlug]/caprem` for renderizada
- **Then** a seção `CapremActuarialRiskSection` tem seu grid de 4 cards de topo (`<KPIGrid columns={3}>`) descontinuado e removido, eliminando a duplicação direta de valores e conceitos com a seção anterior.
- **And** a seção é reestruturada e renomeada para **"Acordos de Parcelamento e Dívidas Previdenciárias (CADPREV / Ministério da Previdência)"**, com descrição focada no monitoramento de acordos formais de confissão de dívida e cumprimento histórico dos aportes de equilíbrio atuarial.
- **And** a tabela de **Acordos Oficiais de Confissão e Parcelamento de Dívidas (CADPREV / Ministério da Previdência)** passa a ter posição de destaque no topo da seção, preservando todas as colunas de registro, objeto, valor empenhado e valor pago.
- **And** a tabela de **Evolução Histórica da Cobertura Atuarial e Resgate de Dívidas (2021–2026)** é mantida na sequência como fonte documental da série histórica de adimplência do Elemento 97 e amortização de dívidas.
- **And** os guias de consumo por IA (`apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`) são atualizados refletindo a estrutura consolidada da rota `/caprem` conforme a Regra 12 do AGENTS.md.
- **And** a suíte de testes de componentes (`caprem-actuarial-risk-section.spec.tsx` e `page.spec.tsx`) é atualizada e validada com 100% de aprovação via `pnpm test`.

---

## Epic 15: Expansão Regional Noroeste Fluminense (Cluster Sigcorp), RPPS Canônico (`fct_previdencia_*`) e Módulos Dinâmicos por Portal

Desacoplar o núcleo analítico e a camada de apresentação de amarras institucionais locais (eliminando o acoplamento do `CAPREM` e generalizando os marts analíticos para `fct_previdencia_*` e rotas `/previdencia`), parametrizar temas e institutos previdenciários no `PortalConfig`, abstrair o extrator da API Sigcorp em um conector genérico parametrizado e realizar o rollout oficial dos municípios de Natividade (~15 mil hab., RPPS IPAMN) e Bom Jesus do Itabapoana (~35 mil hab., RPPS FUNPREV), expandindo o alcance cívico da plataforma para ~70 mil cidadãos no Noroeste Fluminense sem duplicação de infraestrutura.

### Story 15.1: Generalização Analítica do RPPS no dbt (`fct_previdencia_*`), Particionamento Multi-Portal e Governança de Fixtures

As a data engineer, civic developer, or public auditor,  
I want the dbt mart models for municipal pensions to be standardized under the canonical prefix `fct_previdencia_*` with mandatory `portal_slug` partitioning across all aggregations,  
So that the analytical data layer seamlessly scales to any municipality in the region while maintaining 100% test parity and strict fixture governance (Rule 21).

**Acceptance Criteria:**
- **Given** os modelos de métricas previdenciárias em `elt/transform/models/marts/metrics/` (`fct_historia_caprem_metricas.sql`, `fct_caprem_entidades_metricas.sql`, `fct_caprem_cadprev_metricas.sql`, `fct_caprem_patrimonio_historico_metricas.sql`, `fct_caprem_tendencia_atuarial_metricas.sql`, `fct_caprem_natureza_metricas.sql`)
- **When** a refatoração analítica for implementada no dbt
- **Then** todos os marts com prefixo `caprem` são renomeados para o prefixo canônico `fct_previdencia_*` (ex: `fct_previdencia_historia_metricas.sql`, `fct_previdencia_patrimonio_historico_metricas.sql`, `fct_previdencia_tendencia_atuarial_metricas.sql`, `fct_previdencia_cadprev_metricas.sql`, `fct_previdencia_entidades_metricas.sql`, `fct_previdencia_natureza_metricas.sql`).
- **And** a coluna `portal_slug` é incluída de forma mandatória em todas as cláusulas `GROUP BY` e projeções finais de todas as CTEs dos novos modelos.
- **And** os arquivos de documentação e contratos de esquema (`_fct_previdencia_*.yml`) são renomeados e atualizados com testes `not_null` e integridade referencial em `portal_slug`.
- **And** os modelos downstream de anomalias fiscais (`fct_anomalias_fiscais_metricas.sql`) e referências internas são atualizados para consumir os novos marts `fct_previdencia_*`.
- **And** o fixture de teste compactado `packages/db/tests/fixtures/schema.sql.gz` é obrigatoriamente regerado via `make db/fixture/dump` e sua conformidade validada via `make db/fixture/check` em estrito cumprimento à Regra 21 do `AGENTS.md`.
- **And** a suíte de testes de integração do dbt e backend passa com 100% de sucesso via `make test`.

---

### Story 15.2: Camada de Dados Kysely (`@transparencia/db`) e Parametrização de Previdência e Temas no `PortalConfig`

As a backend engineer or UI developer,  
I want typed Kysely queries reading from `fct_previdencia_*` filtered by `portal_slug`, alongside an expanded `PortalConfig` schema with dynamic pension metadata and civic highlights,  
So that domain logic, municipal pension names, and portal themes are strictly typed, functional, and decoupled from hardcoded municipality assumptions (Rules 2, 9, 10 and 18).

**Acceptance Criteria:**
- **Given** a camada de dados em `packages/db/src/queries/`
- **When** os leitores e tipos forem atualizados para refletir o schema gerado na Story 15.1
- **Then** os arquivos de queries (ex: `historia-caprem-metrics.ts` ➔ `historia-previdencia-metrics.ts` ou equivalente) são renomeados e adaptados para consultar `analytics.fct_previdencia_*` com filtro obrigatório `.where('portal_slug', '=', portalSlug)`.
- **And** todas as propriedades de interfaces, tipos e DTOs em TypeScript utilizam estritamente a convenção `camelCase` (Regra 18) e nomes semânticos explícitos (Regra 9).
- **And** o seed `seed_portais.csv` e o mart `dim_portais.sql` são estendidos com as colunas explícitas `previdencia_habilitado` (BOOLEAN), `previdencia_sigla` (TEXT), `previdencia_nome` (TEXT) e `highlights_json` (TEXT contendo array JSON serializado de temas), eliminando joins adicionais e garantindo leitura em tempo constante.
- **And** a função `getPortalConfig` em `packages/db/src/queries/metadata.ts` é estendida para mapear as novas colunas com parsing defensivo para os tipos estruturados:
  ```ts
  previdencia: {
    habilitado: boolean;
    sigla: string; // ex: "CAPREM", "IPAMN", "FUNPREV", "RPPSI"
    nome: string;  // nome oficial do instituto / fundo
  };
  highlights: Array<{ slug: string; titulo: string; descricao?: string; icone: string }>;
  ```
- **And** o registro de Porciúncula (`porciuncula_prefeitura`) em `seed_portais.csv` é atualizado com `previdencia_habilitado = true`, `previdencia_sigla = 'CAPREM'`, `previdencia_nome = 'Caixa de Aposentadoria e Pensões dos Servidores Públicos de Porciúncula'` e os destaques correspondentes em `highlights_json`.
- **And** a suíte de testes de queries e paridade em `packages/db` (`metadata.spec.ts`, `make test/ts` e `pnpm test`) passa com 100% de sucesso.

---

### Story 15.3: Camada Web: Roteamento Canônico `/[portalSlug]/previdencia`, Redirect 308 e Navegação Dinâmica por Portal

As a citizen, municipal employee, or search engine crawler,  
I want the portal to feature a canonical `/[portalSlug]/previdencia` route with automatic 308 redirect from legacy `/caprem` paths and a dynamic sidebar/nav reflecting local themes and pension institute names,  
So that navigation feels natural for any municipality, existing bookmarks/SEO links for Porciúncula remain unbroken, and interface components display the accurate local pension acronym.

**Acceptance Criteria:**
- **Given** a estrutura de rotas em `apps/web/app/[portalSlug]/`
- **When** a rota `/[portalSlug]/previdencia/` for implementada
- **Then** a rota `/[portalSlug]/previdencia/` substitui `/[portalSlug]/caprem/` como destino canônico, renderizando as seções de sustentabilidade atuarial, patrimônio financeiro e acordos CADPREV.
- **And** é configurado um redirecionamento HTTP 308 permanente de `/[portalSlug]/caprem/` para `/[portalSlug]/previdencia/` (e sub-rotas/âncoras associadas), preservando integridade para SEO, compartilhamentos em mensageiros e histórico público.
- **And** os componentes visuais de previdência (`patrimonio-historico-section`, `saldo-caixa-card`, etc.) recebem a sigla institucional (`portal.previdencia.sigla`) via View Model e formatam cabeçalhos e rótulos de forma dinâmica (ex: *"Patrimônio Financeiro da CAPREM"*, *"Patrimônio Financeiro do IPAMN"*).
- **And** a barra lateral (`packages/ui/src/components/sidebar.tsx`) e a barra móvel (`apps/web/components/mobile-bottom-nav.tsx`) tornam-se orientadas a dados, renderizando o link de Previdência somente quando `portal.previdencia.habilitado === true`.
- **And** os links para legislações (Art. 40 da CF/88, Lei 9.717/98, Resolução CMN 4.963/21) permanecem acessíveis com `target="_blank" rel="noopener noreferrer"` e ícone `ExternalLink` (Regra 20).
- **And** todos os testes unitários de componentes e rotas passam com 100% de aprovação via `pnpm test` e o build compila sem erros (`pnpm build`).

---

### Story 15.4: Generalização do Extrator Fiorilli/Sigcorp, Pipelines de Ingestão (Natividade, Bom Jesus, Bônus São Fidélis) e Spike Técnico de Campos dos Goytacazes

As a data engineer, civic hacker, or transparency advocate,  
I want the existing Fiorilli/Sigcorp REST API extractor abstracted into a generic configurable module (`elt/extract/fiorilli/`), configured for Natividade, Bom Jesus do Itabapoana and São Fidélis, alongside an automated profiling spike assessing the data volume of Campos dos Goytacazes,  
So that raw fiscal data from three municipalities can be ingested into staging with zero code duplication, while infrastructure and database capacity are reliably planned for the future rollout of Campos dos Goytacazes (~480k citizens).

**Acceptance Criteria:**
- **Given** a implementação do extrator de Porciúncula em `elt/extract/porciuncula_prefeitura/` baseada na API Fiorilli (`/Transparencia/versaoJson/DadosAbertos`)
- **When** o código for refatorado para uma estrutura genérica em `elt/extract/fiorilli/` (ou módulo base reutilizável)
- **Then** o extrator aceita parâmetros dinâmicos de portal (`base_url`, `porta`, `cod_ibge`, `portal_slug`, `ano_inicial`, `empresa_padrao`).
- **And** são criados os arquivos de configuração declarativos para:
  - **Natividade** (`elt/portals/natividade_prefeitura.yml`, IBGE `3303401`, RPPS: `IPAMN`)
  - **Bom Jesus do Itabapoana** (`elt/portals/bom_jesus_itabapoana_prefeitura.yml`, IBGE `3300605`, RPPS: `FUNPREV`)
  - **São Fidélis (Bônus)** (`elt/portals/sao_fidelis_prefeitura.yml`, IBGE `3304805`, RPPS: `FASP`, base host Fiorilli `riodejaneiro1.dcfiorilli.com.br:8079`)
- **And** as fontes raw dos três novos municípios são devidamente mapeadas no arquivo de fontes `_sources.yml` correspondente, em estrita conformidade com a Regra 5 do `AGENTS.md`.
- **And** o arquivo de setup de testes `elt/conftest.py` é atualizado com fixtures sintéticas locais para validar os novos portais sem disparar requisições para a internet pública (Regra 15).
- **And** é desenvolvido o **Spike Técnico de Volumetria de Campos dos Goytacazes** (`elt/extract/spikes/spike_campos_volume.py`), realizando profiling exploratório dos endpoints de Campos (`riodejaneiro1.dcfiorilli.com.br:8079/Transparencia/versaoJson/DadosAbertos`), catalogando volume de empenhos por ano, limites de paginação, tempo médio de resposta e produzindo uma nota técnica (`_bmad-output/planning-artifacts/spike-volumetria-campos-dos-goytacazes.md`) com requisitos de infraestrutura e particionamento dbt.
- **And** a suíte de testes de extração e staging passa com 100% de sucesso via `make test`.

---

### Story 15.5: Rollout do Portal de Natividade (NATPREVI), Homologação Cívica e Atualização dos Guias de IA (`llms.txt`)

As a resident of Natividade, external AI agent, or public auditor,  
I want to navigate a live municipal portal for Natividade with complete fiscal indicators, accompanied by updated AI documentation in `llms.txt` and `llms-full.txt`,  
So that citizens of Natividade have access to transparent public accounts and autonomous AI agents can query their fiscal data in accordance with Rule 12.

**Acceptance Criteria:**
- **Given** os dados brutos e modelos analíticos processados para Natividade (`/natividade`) e sua entidade previdenciária (`NATPREVI`)
- **When** o portal de Natividade for habilitado na aplicação web
- **Then** as páginas públicas (Homepage, Despesas, Receitas, Licitações, Pessoal e Previdência) renderizam os números fiscais corretos de Natividade sem contaminação cruzada de dados (`portal_slug` isolado).
- **And** o seletor de portais no cabeçalho/menu permite alternar perfeitamente entre Porciúncula e Natividade, preservando o ano e sub-rota ativos (removendo entidades de um município ao alternar para outro).
- **And** para o pipeline de receitas de Natividade, em virtude do bug estrutural confirmado na API JSON da Fiorilli (onde `ARRECADADO_TOTAL` retorna `0` para qualquer exercício anterior ao ano corrente), a extração de receitas para o exercício atual (`date.today().year`) consome a API JSON, enquanto a série histórica fechada (2021 a 2025) utiliza a esteira de exportação de relatórios CSV via automação Playwright/DevExpress (`elt/extract/fiorilli/natividade_prefeitura/receitas_csv.py`) e carga SQL (`elt/load/fiorilli/natividade_prefeitura/load_receitas_csv.py`), com arquivos armazenados em `data/raw/natividade_prefeitura/receitas_csv/`.
- **And** os arquivos públicos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` documentam as rotas municipais de Natividade, a rota canônica `/previdencia` (NATPREVI) e os parâmetros de consumo por agentes externos de IA (Regra 12).
- **And** todas as baterias de teste e linters do projeto (`make test`, `make test/ts`, `make check`, `pnpm build`) passam com 100% de sucesso.

---

### Story 15.6: Rollout do Portal de Bom Jesus do Itabapoana (FUNPREV), Homologação Cívica e Atualização dos Guias de IA

As a resident of Bom Jesus do Itabapoana, external AI agent, or public auditor,  
I want to navigate a live municipal portal for Bom Jesus do Itabapoana with complete fiscal indicators, accompanied by updated AI documentation in `llms.txt` and `llms-full.txt`,  
So that citizens of Bom Jesus do Itabapoana have access to transparent public accounts and autonomous AI agents can query their fiscal data in accordance with Rule 12.

**Acceptance Criteria:**
- **Given** os dados brutos e modelos analíticos processados para Bom Jesus do Itabapoana (`/bom-jesus-do-itabapoana`) e sua entidade previdenciária (`FUNPREV`)
- **When** o portal de Bom Jesus do Itabapoana for homologado e habilitado nas rotas públicas da aplicação web
- **Then** as páginas públicas (Homepage, Despesas, Receitas, Licitações, Pessoal e Previdência) renderizam os números fiscais corretos de Bom Jesus do Itabapoana com isolamento estrito de `portal_slug`.
- **And** o seletor de portais no cabeçalho/menu incorpora Bom Jesus do Itabapoana entre as opções ativas, preservando o ano e a sub-rota selecionada.
- **And** a esteira dedicada de extração e carga de receitas históricas CSV (`elt/extract/fiorilli/bom_jesus_itabapoana_prefeitura/receitas_csv.py` e `elt/load/fiorilli/bom_jesus_itabapoana_prefeitura/load_receitas_csv.py`) é executada e homologada contra o portal oficial, salvando em `data/raw/bom_jesus_itabapoana_prefeitura/receitas_csv/`.
- **And** os arquivos públicos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` incorporam a documentação das rotas, indicadores e API de exportação de Bom Jesus do Itabapoana (Regra 12).
- **And** todas as baterias de teste e linters do projeto (`make test`, `make test/ts`, `make check`, `pnpm build`) passam com 100% de sucesso.

---

### Story 15.7: Rollout do Portal de São Fidélis (FASP), Homologação Cívica e Atualização dos Guias de IA

As a resident of São Fidélis, external AI agent, or public auditor,  
I want to navigate a live municipal portal for São Fidélis with complete fiscal indicators, accompanied by updated AI documentation in `llms.txt` and `llms-full.txt`,  
So that citizens of São Fidélis have access to transparent public accounts and autonomous AI agents can query their fiscal data in accordance with Rule 12.

**Acceptance Criteria:**
- **Given** os dados brutos, semente de órgãos (`seed_sao_fidelis_prefeitura_orgaos.csv`) e modelos analíticos de São Fidélis (`/sao-fidelis`) e sua entidade previdenciária (`FASP`)
- **When** o portal de São Fidélis for homologado e habilitado nas rotas públicas da aplicação web
- **Then** as páginas públicas (Homepage, Despesas, Receitas, Licitações, Pessoal e Previdência) renderizam os números fiscais corretos de São Fidélis com isolamento estrito de `portal_slug`.
- **And** o seletor de portais no cabeçalho/menu incorpora São Fidélis entre as opções ativas, preservando o ano e a sub-rota selecionada.
- **And** a esteira dedicada de extração e carga de receitas históricas CSV (`elt/extract/fiorilli/sao_fidelis_prefeitura/receitas_csv.py` e `elt/load/fiorilli/sao_fidelis_prefeitura/load_receitas_csv.py`) é executada e homologada contra o portal oficial, salvando em `data/raw/sao_fidelis_prefeitura/receitas_csv/`.
- **And** os arquivos públicos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` incorporam a documentação das rotas, indicadores e API de exportação de São Fidélis (Regra 12).
- **And** todas as baterias de teste e linters do projeto (`make test`, `make test/ts`, `make check`, `pnpm build`) passam com 100% de sucesso.

---

## Epic 16: Ingestão Regional Cluster Pronim/Cidade360 e Lançamento do Polo Regional de Itaperuna

Desenvolver a família de extratores para o ecossistema GovBR / Pronim TB (`cidade360.cloud`) com gerenciamento de sessão e extração de lotes, integrando o polo regional de Itaperuna (~101 mil cidadãos, RPPSI e polo regional de saúde) e pavimentando a inclusão de Varre-Sai e Laje do Muriaé na plataforma de transparência fiscal.

---

## Epic 17: Radar Cívico de Obras Públicas, Medições Físicas e Impacto Urbano

Transformar o portal em uma ferramenta de fiscalização cívica de alto impacto urbano no cotidiano do cidadão, integrando a esteira oficial de dados abertos do ObrasGov.br (`api-publica.obrasgov.gestao.gov.br`) aos portais municipais para exibir obras públicas georreferenciadas no mapa, percentuais auditáveis de avanço físico vs. financeiro, prazos de entrega e justificativas formais de paralisações ou atrasos que afetam a população.

### Story 17.1: Pipeline ELT ObrasGov, Ingestão Multi-Tenant e Modelagem Mart (`fct_obras`) no dbt

As a data engineer and civic auditor,  
I want an automated multi-tenant pipeline that extracts public works, geometries, and physical execution measurements from the ObrasGov.br API into canonical dbt models,  
So that the platform maintains verified, structured data on municipal infrastructure projects with strict multi-tenant isolation.

**Acceptance Criteria:**
- **Given** os portais municipais configurados com código IBGE canônico (`cod_ibge`) em seus respectivos manifestos (ex: `porciuncula_prefeitura.yml` e `natividade_prefeitura.yml`)
- **When** o pipeline de extração e carga `elt/extract/obrasgov.py` e `elt/load/obrasgov.py` for executado
- **Then** os dados dos endpoints `/geometria`, `/projeto-investimento`, `/execucao-fisica` e `/historico-situacao-cancelada-paralisada` são ingeridos na camada raw com idempotência e controle de requisições.
- **And** os modelos de staging `stg_obrasgov__projetos.sql`, `stg_obrasgov__geometrias.sql`, `stg_obrasgov__execucoes_fisicas.sql` e o mart `fct_obras.sql` são criados no dbt materializados como tabela.
- **And** o modelo mart `fct_obras.sql` implementa rigorosamente o particionamento e join por `portal_slug` (Regra 23 do `AGENTS.md`), contendo as colunas métricas: `portal_slug`, `id_projeto`, `nome_obra`, `situacao`, `orgao_responsavel`, `valor_investimento_previsto`, `percentual_execucao_fisica`, `data_ultima_medicao`, `latitude`, `longitude`, `motivo_paralisacao`, `data_inicio_prevista`, `data_fim_prevista`.
- **And** os valores de `situacao` seguem o padrão lowercase snake_case (`em_execucao`, `paralisada`, `concluida`, `cadastrada`) em conformidade com a Regra 10.
- **And** o fixture de teste `packages/db/tests/fixtures/schema.sql.gz` é sincronizado via `make db/fixture/dump` e validado via `make db/fixture/check` (Regra 21).
- **And** a suíte de testes dbt e testes unitários em Python passam com 100% de sucesso via `make test`.

---

### Story 17.2: Contratos de Dados, Tipagem Estrita e Queries Kysely no `@transparencia/db`

As a backend engineer,  
I want type-safe Kysely query functions and immutable domain DTOs in `@transparencia/db/src/queries/obras.ts`,  
So that frontend pages can query public works metrics cleanly without embedding raw SQL or mutating state in presentation layers.

**Acceptance Criteria:**
- **Given** o mart analítico `fct_obras` disponível no banco de dados e devidamente tipado no schema Kysely
- **When** as funções leitoras `getObrasPorPortal(portalSlug, filtros)` e `getObraDetalhe(portalSlug, idProjeto)` forem chamadas
- **Then** elas retornam coleções e DTOs puros com campos estritamente formatados em `camelCase` (Regra 18 do `AGENTS.md`): `idProjeto`, `nomeObra`, `situacao`, `orgaoResponsavel`, `valorInvestimentoPrevisto`, `percentualExecucaoFisica`, `dataUltimaMedicao`, `latitude`, `longitude`, `motivoParalisacao`.
- **And** a consulta permite filtros por situação (`status`: 'todas' | 'em_execucao' | 'paralisada' | 'concluida') e busca textual normalizada.
- **And** as funções são escritas em estilo funcional e imutável (Regra 2), sem loops imperativos com variáveis mutáveis.
- **And** testes unitários de integração no TypeScript cobrem as queries contra o banco de testes efêmero via `make test/ts`.

---

### Story 17.3: Rota Pública `/obras`, Mapa Interativo de Impacto Urbano e Filtros Cívicos no `apps/web`

As a citizen or resident impacted by local public works,  
I want to navigate an interactive municipal map showing active construction sites, street repairs, and infrastructure projects,  
So that I understand what is being built in my city, where detours or disruptions are occurring, and what the expected completion timeline is.

**Acceptance Criteria:**
- **Given** a rota pública `/[portalSlug]/obras` implementada em `apps/web/app/[portalSlug]/obras/page.tsx`
- **When** o munícipe acessa a página
- **Then** um mapa interativo é renderizado com marcadores georreferenciados para cada obra registrada no município, codificados visualmente por status:
  - 🟢 **Em Execução:** obras ativas gerando intervenções ou avançando cronograma.
  - 🔴 **Paralisada:** obras interrompidas que requerem atenção da comunidade e do poder público.
  - 🔵 **Concluída:** infraestruturas entregues à sociedade.
  - ⚪ **Cadastrada / Planejada:** projetos em fase preparatória ou licitação.
- **And** ao clicar ou selecionar um marcador/card, o mapa centraliza e abre um painel resumo contendo: nome popular da obra, órgão responsável, valor do investimento, data de previsão de término e percentual de avanço físico.
- **And** controles de filtro na interface permitem alternar rapidamente entre "Todas", "Em Andamento (Obras Ativas)" e "Paralisadas (Atenção)".
- **And** a rota é co-localizada com loader desacoplado do `@transparencia/db`, mantendo a apresentação puramente declarativa (Regra 2).
- **And** o layout é totalmente responsivo para dispositivos móveis, adaptando o mapa para visualização touch e lista vertical expansível.

---

### Story 17.4: Dossiê Detalhado da Obra, Auditoria de Avanço Físico vs. Financeiro e Fundamentação Legal

As a citizen, civic hacker, or public prosecutor,  
I want a detailed dossier for each public work comparing official physical completion percentage against financial expenditure disbursements,  
So that I can detect anomalies where public funds were heavily disbursed while physical construction remains stalled or lagging.

**Acceptance Criteria:**
- **Given** o card ou página de detalhe da obra em `/[portalSlug]/obras/[idProjeto]`
- **When** o usuário inspeciona o detalhamento de uma obra
- **Then** a interface exibe o comparativo gráfico de barras duplas:
  - **Execução Física Oficial (%):** boletim de medição técnica presencial extraído do ObrasGov.br com data da última aferição.
  - **Execução Financeira (%):** relação entre desembolsos/pagamentos e valor total contratado.
- **And** caso a obra esteja com status `paralisada`, um alerta cívico destacado exibe a data da paralisação e a `justificativa_cancelada_paralisada` registrada oficialmente no sistema governamental.
- **And** links externos oficiais e seguros com `target="_blank"` e `rel="noopener noreferrer"` direcionam para o ObrasGov.br e legislações aplicáveis (Lei 14.133/2021) em conformidade com a Regra 20 do `AGENTS.md`.
- **And** os arquivos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` são atualizados para documentar a nova rota `/obras`, seus indicadores e convenções de medição física (Regra 12).
- **And** todas as validações estáticas e de tipagem passam com sucesso (`pnpm build`, `tsc --noEmit`).

---

### Story 17.5: Correlação de Obras Públicas com Contratos Municipais e Licitações

As a citizen, civic auditor, or public prosecutor,  
I want to see the specific municipal contracts and procurement processes linked to a public work,  
So that I can verify which contractor won the bid, how much was actually contracted, and follow through with civic oversight via direct links to local contracts and tenders.

**Acceptance Criteria:**
- **Given** uma obra pública inspecionada no modal de detalhes em `/[portalSlug]/obras?idProjeto=[idProjeto]`
- **When** o usuário consulta as informações da obra
- **Then** a plataforma realiza a correlação analítica (relacionamento 1:N opcional) entre `fct_obras` e os contratos municipais em `fct_contratos` (utilizando cruzamento por tenant `portal_slug`, propostas/emendas ministeriais na descrição e/ou termos identificadores do objeto e órgão executor).
- **And** no modal de detalhes da obra, renderiza uma seção dedicada: *"Contratos e Licitações Vinculados"*:
  - Para cada contrato identificado, exibe número do contrato com badge de status, fornecedor/empreiteira contratada com CPF/CNPJ mascarado, valor contratado formatado (`fmtCurrency`) e modalidade licitatória.
  - Disponibiliza links diretos de deep link para o contrato no portal municipal (`/[portalSlug]/contratos?numero=[contratoNumero]`) ou para a licitação (`/[portalSlug]/licitacoes?numero=[licitacaoNumero]`), em conformidade com as regras de UX e deep linking (Regra 24).
  - Caso nenhum contrato local possua correspondência direta (ex: contratação 100% federal direta sem execução municipal), exibe uma mensagem contextual neutra e amigável: *"Nenhum contrato municipal diretamente correlacionado"*.
- **And** a query Kysely em `@transparencia/db/src/queries/obras.ts` retorna a lista imutável e fortemente tipada de contratos relacionados sem efetuar mutações em memória (Regra 2).
- **And** inclui cobertura de testes no backend/TypeScript (`make test/ts`) validando o retorno de contratos correlacionados e cenários de obras sem vínculo contratual.

---

### Story 17.6: Card Resumo de Obras Públicas na Visão Geral (Homepage)

As a citizen or taxpayer visiting the municipal homepage (`/[portalSlug]`),  
I want a high-level summary card of municipal public works positioned right after the secondary cards,  
So that I can immediately see the total planned investment, the physical breakdown across active, completed, and stalled works, and seamlessly navigate to the full interactive works map.

**Acceptance Criteria:**
- **Given** a página inicial do portal municipal (`/[portalSlug]`)
- **When** a página é renderizada
- **Then** exibe uma seção de destaque dedicada de largura total (`ObrasResumoCard`), posicionada estrategicamente logo abaixo de `CardsSecundariosVisaoGeral` e antes de `RadarCivicoFeed`.
- **And** o card segue rigorosamente o design system e o padrão do `SaldoCaixaResumoCard`:
  - **Cabeçalho:** Título *"Obras Públicas e Investimentos Urbanos"*, subtítulo explicativo com a fonte oficial (*"Painel oficial de intervenções urbanas (ObrasGov.br)"*) e badge de fonte/versão.
  - **Destaque Numérico:** Montante consolidado de investimento previsto formatado em tipografia de destaque (`font-serif`, ex: `R$ 93.1mi`).
  - **Barra Segmentada Empilhada:** Barra proporcional horizontal (`role="progressbar"`) refletindo a distribuição do investimento previsto entre *Não iniciadas* (cinza), *Em execução* (azul), *Concluídas* (verde) e *Paralisadas* (vermelho/rosa).
  - **Legenda e Contadores:** Linhas com contagem de obras e montantes compactos (`kpis.emExecucao`, `kpis.paralisadas`, `kpis.concluidas`, `kpis.cadastradas`).
  - **Alerta de Paralisação:** Se houver obras paralisadas (`paralisadas > 0`), destaca visualmente o indicador para chamar atenção cívica para o desperdício de recursos parados.
  - **Ação Direta (Call to Action):** Link de deep link direcionando para a rota dedicada de obras (`/[portalSlug]/obras`): *"Ver mapa e detalhes das obras"*.
- **And** o data loader `loadVisaoGeralData` em `apps/web/app/[portalSlug]/loader.ts` é atualizado para consultar o resumo de obras via `@transparencia/db` (`getResumoObrasPorPortal`) em paralelo com `Promise.all`.
- **And** caso o município não possua obras cadastradas no ObrasGov.br, renderiza um empty state neutro e elegante no padrão do design system.
- **And** os arquivos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` são atualizados para registrar o novo bloco de obras na Visão Geral e suas convenções (Regra 12).
- **And** todos os testes de frontend e tipagem passam com sucesso (`pnpm build`, `tsc --noEmit`).

---

## Epic 18: Tema Canônico da Educação Básica, Desempenho Pedagógico (IDEB/SAEB) e Responsabilidade Fiscal (MDE/FUNDEB)

Estruturar o tema canônico da Educação no MaisTransparência, integrando dados oficiais de desempenho pedagógico (série histórica do IDEB, proficiências Saeb de Língua Portuguesa e Matemática e fluxo escolar de aprovação apurados pelo INEP/MEC) com a execução orçamentária municipal (Função 12 - Educação), auditoria dos limites constitucionais ([Art. 212 da CF/88](https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art212) para MDE 25% e [Art. 212-A da CF/88](https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art212a) para FUNDEB 70%), cálculo inédito de Custo Anual por Aluno e uma experiência cívica moderna e transparente desenhada em conjunto com a especialista de UX/UI (Sally).

---

### Story 18.1: Ingestão de Dados Educacionais Oficiais do INEP, dbt Seed e Workflow de Atualização Automatizada (`check-inep-ideb-updates.yml`)

As a data engineer and maintainer,  
I want a canonical, versioned dbt seed for municipal IDEB data coupled with a lightweight, automated GitHub Actions monitor,  
So that MaisTransparência stays automatically updated whenever new biennial cycles are published by INEP without polluting daily CI pipelines or requiring manual reminders.

**Acceptance Criteria:**
- **Given** o script de processamento em `elt/scripts/sync_inep_ideb_seed.py`
- **When** executado
- **Then** baixa os pacotes oficiais consolidados do IDEB diretamente dos servidores do INEP (`divulgacao_anos_iniciais_municipios_2025.zip` e `divulgacao_anos_finais_municipios_2025.zip`), extrai os indicadores de 2021 a 2025 para os municípios do estado e gera o arquivo estruturado `elt/transform/seeds/seed_inep_ideb.csv`.
- **And** declara a seed em `elt/transform/seeds/seeds.yml` com tipos estritos e documentação de colunas.
- **And** cria o modelo de staging `elt/transform/models/staging/nacional/stg_inep__ideb.sql` a partir do seed com colunas em lowercase snake_case (`cod_ibge`, `ano`, `rede`, `etapa_ensino`, `nota_ideb`, `meta_ideb`, `saeb_matematica`, `saeb_lingua_portuguesa`, `taxa_aprovacao`).
- **And** implementa o workflow autônomo `.github/workflows/check-inep-ideb-updates.yml`:
  - **Gatilho:** Cron mensal (dia 1º às 08:00 UTC) e `workflow_dispatch` manual.
  - **Verificação Leve ("Ping"):** Faz requisição HTTP `HEAD` ultraleve contra os endpoints do INEP para o próximo ano de ciclo bienal (ex: 2027) antes de fazer qualquer download pesado.
  - **Idempotência:** Se o ano mais recente já constar no seed ou se o servidor retornar 404, o workflow encerra em menos de 5 segundos sem consumir recursos.
  - **Pull Request Automático:** Caso um novo ciclo seja detectado (`200 OK`), o workflow executa a sincronização, regera o fixture de teste (`make db/fixture/dump`) e abre automaticamente um Pull Request via `peter-evans/create-pull-request` com título `"feat(data): atualizar seed do IDEB com novo ciclo [ANO]"`.
- **And** regera o fixture compactado de testes `packages/db/tests/fixtures/schema.sql.gz` executando `make db/fixture/dump` e valida paridade com `make test` (Regra 21).

---

### Story 18.2: Fato Analítica de Métricas Educacionais e Cruzamento Orçamentário (`fct_educacao_metricas`)

As an analytics engineer,  
I want a unified fact table crossing pedagogical outcomes with municipal budgetary execution (Function 12 - Education),  
So that we can compute the real annual investment per student and audit constitutional mandates alongside educational performance.

**Acceptance Criteria:**
- **Given** os modelos `stg_inep__ideb` e `fct_orcamento_despesa`
- **When** o modelo `elt/transform/models/marts/metrics/fct_educacao_metricas.sql` é compilado
- **Then** materializa como tabela física (`materialized='table'`, Regra 2) com grão único por `portal_slug`, `ano` e `etapa_ensino`.
- **And** inclui obrigatoriamente a cláusula de particionamento e join por tenant: `ON a.portal_slug = b.portal_slug` (Regra 23, zero tenant leakage).
- **And** calcula as métricas pedagógicas:
  - `nota_ideb`, `meta_ideb`, `atingiu_meta_flag`.
  - `saeb_matematica`, `saeb_lingua_portuguesa`, `indicador_fluxo_aprovacao`.
  - `crescimento_pontos_ideb`: variação em pontos em relação ao ciclo bienal anterior via função analítica `LAG()`.
  - `variacao_saeb_matematica` e `variacao_saeb_portugues`.
- **And** cruza com os dados orçamentários da Função 12 (Educação) para computar:
  - `despesa_liquidada_educacao`: montante liquidado no exercício na Função 12.
  - `total_matriculas_rede_municipal`: contagem de matrículas ativas da rede.
  - `custo_anual_por_aluno`: `despesa_liquidada_educacao / nullif(total_matriculas_rede_municipal, 0)`.
- **And** inclui testes genéricos do dbt (`not_null`, `unique` na chave surrogate `portal_slug || '_' || ano || '_' || etapa_ensino`).
- **And** a suíte de testes de integração passa com sucesso (`make test`).

---

### Story 18.3: Camada de Dados Kysely (`@transparencia/db`) com Contratos Fortemente Tipados em camelCase

As a frontend and API developer,  
I want atomic pass-through readers in `@transparencia/db` with strict camelCase DTOs,  
So that the web application can query educational metrics with high performance, strong type safety, and zero business logic in the presentation layer.

**Acceptance Criteria:**
- **Given** o pacote `@transparencia/db`
- **When** o leitor `getEducacaoMetrics(portalSlug: string)` é invocado
- **Then** consulta a tabela `fct_educacao_metricas` filtrando estritamente por `where('portal_slug', '=', portalSlug)` (Regra 2).
- **And** todas as propriedades de interfaces e DTOs utilizam rigorosamente a convenção **camelCase** (Regra 18):
  - `notaIdeb`, `metaIdeb`, `atingiuMeta`, `crescimentoPontosIdeb`.
  - `saebMatematica`, `saebLinguaPortuguesa`, `indicadorFluxoAprovacao`.
  - `despesaLiquidadaEducacao`, `totalMatriculasRedeMunicipal`, `custoAnualPorAluno`.
  - `etapaEnsino` (`'anosIniciais' | 'anosFinais'`).
- **And** implementa a função auxiliar `getResumoEducacao(portalSlug: string)` para alimentar o card de destaque da homepage com os KPIs mais recentes do ciclo 2025.
- **And** inclui suíte de testes unitários com Vitest em `packages/db/src/queries/__tests__/educacao-metrics.spec.ts` validando o retorno de Porciúncula (Ideb 5,9, crescimento de +1,4 ponto) e Natividade.
- **And** a validação de tipos passa sem erros (`pnpm --filter @transparencia/db check-types` e `make test/ts`).

---

### Story 18.4: Página Temática da Educação (`/[portalSlug]/educacao`) com Especificações de UX/UI (Sally)

As a citizen, teacher, or public auditor,  
I want a dedicated, accessible, and comprehensive Education page in `/[portalSlug]/educacao`,  
So that I can clearly understand school quality, verify the historic breakthrough of the city, and audit municipal investments with complete civic context.

**Acceptance Criteria:**
- **Given** a rota `apps/web/app/[portalSlug]/educacao/page.tsx`
- **When** o cidadão acessa a página
- **Then** a interface renderiza uma experiência cívica de alto impacto dividida em 4 blocos desenhados segundo o Design System:
  - **Bloco 1: Hero & Destaque do Ciclo 2025 ("Troféu Cívico"):**
    - Card de destaque com badge dourada: *"🏆 Maior crescimento do Estado do Rio de Janeiro nos Anos Iniciais (+1,4 ponto) e Rede Municipal no Top 10 dos Anos Finais"*.
    - KPIs principais: Nota Atual (5,9), Nota Anterior (4,5), Posição no Ranking Estadual (46º lugar, subindo 43 posições) e Custo Anual por Aluno.
  - **Bloco 2: Linha do Tempo e Gráfico Histórico do IDEB (2021–2025):**
    - Gráfico interativo e limpo com os três ciclos recentes (2021, 2023 e 2025) com alternância entre *Anos Iniciais* e *Anos Finais*.
    - Foco estritamente institucional e cívico, **sem nomes de prefeitos ou agentes políticos** (a conquista pertence à comunidade escolar e à rede municipal).
    - Evidencia a trajetória recente: o patamar de 2021 (5,2), a queda de 2023 (4,5) e a grande virada em 2025 (5,9).
    - Linha de referência da Meta do MEC e da Média Estadual da rede pública (RJ).
  - **Bloco 3: Painel de Responsabilidade Fiscal da Educação:**
    - Termômetro visual do MDE (25% mínimo constitucional) com hyperlink oficial para o [Art. 212 da CF/88](https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art212) (Regra 20).
    - Termômetro do FUNDEB 70% com link para o [Art. 212-A da CF/88](https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art212a).
    - Gráfico de correlação: Evolução do Custo por Aluno vs. Desempenho no IDEB.
  - **Bloco 4: Contratos e Compras da Educação:**
    - Listagem auditável dos contratos da Secretaria de Educação (fornecimento de merenda escolar PNAE, transporte escolar PNATE e manutenção escolar) com links diretos para o detalhe em modal (Regra 24).
- **And** todas as condicionais complexas na UI utilizam IIFE ou funções auxiliares, sem ternários aninhados (Regra 13).
- **And** todos os links para legislações incluem `target="_blank"`, `rel="noopener noreferrer"` e ícone acessível (Regra 20).
- **And** a página é totalmente responsiva em dispositivos móveis e atinge nota 100% no Lighthouse de acessibilidade.

---

### Story 18.5: Card Resumo de Educação na Homepage (`/[portalSlug]`) e Sincronização de Contexto para LLMs

As a citizen visiting the city homepage (`/[portalSlug]`),  
I want a concise, high-visibility Educational Summary Card,  
So that I can instantly see the latest IDEB score, its evolution, goal status and state ranking, and navigate smoothly to the full educational module.

**Acceptance Criteria:**
- **Given** a página inicial do portal municipal (`apps/web/app/[portalSlug]/page.tsx`)
- **When** a página é carregada
- **Then** renderiza o componente `EducacaoResumoCard` na seção de cards principais, contendo:
  - Título *"Educação Básica e Desempenho Escolar"* com badge de fonte oficial em link externo (*"INEP / IDEB"*, `target="_blank"`, `rel="noopener noreferrer"`, ícone `ExternalLink`) apontando para a página oficial do IDEB no INEP.
  - Nota do IDEB em destaque tipográfico (`font-serif`, ex: `5.9`), acompanhada do badge de evolução (`+1.4 ponto`).
  - Rótulo do indicador principal *"Nota do IDEB (1º ao 5º ano)"* (anos iniciais), com ciclo anterior e evolução em pontos; sem faixa de etapas (anos iniciais/finais).
  - Situação da meta do IDEB (atingida ou não atingida), exibida apenas quando houver meta no ciclo.
  - Classificação estadual (`posicaoRanking` de `totalMunicipios`), apenas quando disponível, sem UF fixa.
  - Sem despesa liquidada em educação no card (não reconcilia com os indicadores financeiros do topo da home); variação de posições no ranking exibida junto à classificação.
  - Layout em duas colunas no desktop (nota; classificação estadual) com alturas iguais, compacto no mobile; rodapé com divisor (`border-t`) sempre visível, ícone `Info` + *"Indicadores oficiais do IDEB apurados pelo INEP/MEC."* e CTA à direita.
  - Ênfase positiva (faixa verde, ex.: *"Destaque: evolução de +1,4 ponto no IDEB"* ou *"Meta do IDEB atingida"*) quando a evolução for >= 1,0 ponto ou a meta for atingida; ênfase de atenção (tom âmbar) quando houver queda ou meta não atingida; neutro nos demais casos. A regra de destaque é compartilhada com a página `/educacao`.
  - Botão de ação cívica (CTA) direcionando para `/[portalSlug]/educacao`: *"Ver indicadores pedagógicos e despesas detalhadas"*.
- **And** o data loader `loadVisaoGeralData` em `apps/web/app/[portalSlug]/loader.ts` consulta `getResumoEducacaoPorPortal` em paralelo com `Promise.all`.
- **And** atualiza os arquivos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` documentando a rota pública `/[portalSlug]/educacao`, os conceitos do IDEB, Saeb, MDE (25%) e FUNDEB (70%) da página de educação, e o conteúdo do card (sem custo por aluno nem MDE), para consumo por agentes de IA externos (Regra 12).
- **And** todos os testes automatizados e builds passam com 100% de sucesso (`pnpm build`, `tsc --noEmit`, `make test`).


### Story 18.6: Consistência de Dados e Textos da Educação (Etapa do IDEB, Formatação Compacta pt-BR e Sincronização de Contexto para LLMs)

As a citizen and as an external AI agent consulting the Education module,  
I want the displayed IDEB stage, compact currency values and public descriptions to be accurate and consistent with what the portal actually shows,  
So that I never read a score from the wrong school stage, a number with a foreign decimal separator, or documentation that describes indicators the portal no longer displays.

**Acceptance Criteria:**
- **Given** `getResumoEducacao` em `packages/db/src/queries/educacao-metrics.ts`, que hoje usa os anos iniciais como fonte principal e cai para os anos finais quando a nota inicial é nula (`primary.notaIdeb ?? secondary?.notaIdeb`)
- **When** um município não possui nota do IDEB dos anos iniciais para o ciclo
- **Then** a nota, a evolução, a meta e o ranking do resumo **não** são preenchidos com dados dos anos finais: o campo retorna `null`, de modo que o card da home (rótulo "Nota do IDEB (1º ao 5º ano)") e o troféu da `/[portalSlug]/educacao` exibem "—" ou ocultam o indicador, sem misturar etapas
  - **And** testes de paridade em `packages/db` cobrem município com nota inicial, sem nota inicial e com nota apenas nos anos finais
- **Given** o helper compartilhado `fmtCompact` em `packages/ui/src/utils/formatters.ts`, que formata com ponto decimal (ex.: `R$ 33.3mi`)
- **When** valores compactos são exibidos em qualquer tela (home, orçamento, obras, educação, cards OpenGraph)
- **Then** usam a convenção pt-BR com vírgula decimal (ex.: `R$ 33,3 mi`), de forma consistente com `fmtCurrency`, `fmtPercent` e `fmtNumber`
  - **And** todos os testes unitários, snapshots e specs que dependem do formato anterior são atualizados e passam
- **Given** os arquivos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` e o card OpenGraph de `/[portalSlug]/educacao/opengraph-image`
- **When** a descrição da rota `/[portalSlug]/educacao` e do card de compartilhamento é revisada contra o que a página realmente exibe
- **Then** nenhuma menção a indicadores que a página e o card da home não exibem mais (percentual de MDE, custo anual por aluno) permanece; os textos descrevem apenas os indicadores públicos vigentes, e o card OpenGraph exibe somente dados efetivamente apresentados na página (Regra 12)
- **And** todos os testes automatizados e builds passam com 100% de sucesso (`pnpm build`, `tsc --noEmit`, `make test/ts`, `make test`).


### Story 18.7: Linha de Totais Fixa nas Tabelas de Contratos/Emendas e Emendas Parlamentares da Educação com Rastreabilidade de Empenhos

As a citizen auditing education spending,  
I want a fixed totals row below the education contracts table and to see the parliamentary amendments destined to Education with their linked commitment notes (as already done for Health),  
So that I can see at a glance how much was committed, settled, paid and still pending, and follow each amendment up to the actual expenditure.

**Acceptance Criteria:**
- **Given** a tabela "Contratos e Compras da Educação" em `apps/web/components/educacao/educacao-contratos-section.tsx`
- **When** a tabela é exibida (inclusive com filtro de categoria ou busca aplicados)
- **Then** uma linha fixa de totais no rodapé exibe a soma de **Empenhado, Liquidado, Pago e Saldo Pendente** dos contratos atualmente filtrados, usando `fmtCurrency` e o mesmo estilo do totalizador de Emendas da Saúde (fundo `slate-100`, rótulo "Total", valores em negrito)
  - **And** os totais são calculados a partir dos registros filtrados e não variam com a paginação da tabela
- **Given** a página `/[portalSlug]/educacao` e o exercício selecionado
- **When** existem emendas parlamentares destinadas à Educação no exercício
- **Then** uma seção "Emendas parlamentares destinadas à Educação" é exibida seguindo o mesmo padrão de `apps/web/components/saude-emendas-section.tsx`: KPIs (total autorizado, total empenhado, taxa de empenho, maior emenda), tabela com coluna "Rastreabilidade" (quantidade de empenhos) e modal "Detalhes" com as notas de empenho vinculadas (empenhado, liquidado, pago, saldo a executar), com o mesmo deep linking por query param
  - **And** a classificação das emendas da Educação e o vínculo com os empenhos ficam em `@transparencia/db` (query tipada em camelCase, reaproveitando `EmendaEmpenhoItemDTO`) e, se necessário, no modelo dbt correspondente, com fixtures regeneradas (`make db/fixture/dump`)
  - **And** quando não houver emendas, a seção exibe estado neutro ou é omitida, sem dados de outro município (Regra 23)
- **Given** a seção de Emendas da Saúde em `apps/web/components/saude-emendas-section.tsx`
- **When** a tabela é exibida
- **Then** o rodapé de totais usa o mesmo componente/estilo compartilhado da linha de totais da Educação, apresentando Autorizado e Empenhado de forma consistente (extraído para um componente reutilizável em `packages/ui` ou `apps/web/components`)
- **Given** a Regra 12
- **When** as rotas e seções acima são alteradas
- **Then** `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` descrevem a linha de totais e as emendas da Educação
  - **And** todos os testes automatizados e builds passam com 100% de sucesso (`pnpm build`, `tsc --noEmit`, `make test/ts`, `make test`, `make db/fixture/check`).

---

## Epic 19: Remodelagem da Homepage para Utilidade Pública, Sentinela da Farmácia SUS (Lei 14.654/2023) e Ação Cívica

Remodelar a arquitetura de informação da página inicial (`apps/web/app/[portalSlug]/page.tsx`), transformando o portal em uma utilidade pública indispensável ao cidadão comum conforme especificado em `handoff-remodelagem-home-utilidade.md`. Promover a primeira dobra para os serviços e direitos essenciais — com destaque prioritário para a **Consulta de Estoque de Remédios da Farmácia SUS** e **Sentinela de Conformidade** ([Lei Federal nº 14.654/2023](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14654.htm)), o Troféu Cívico da Educação e o alerta de Obras Públicas paralisadas —, municiando o cidadão com ferramentas de utilidade direta (saber se o remédio está no posto e onde buscar) e ferramentas de ação imediata (cópia de requerimentos formais para o Ministério Público/Câmara e compartilhamento no WhatsApp quando houver omissão de dados), mantendo a inteligência orçamentária e financeira consolidada como base de sustentação.

---

### Story 19.1: Pipeline ELT da Farmácia SUS (Lei 14.654/2023): Estoque BNAFAR/Hórus e Estabelecimentos CNES

As a data engineer,  
I want an automated ELT pipeline that ingests municipal SUS pharmacy stock (BNAFAR/Hórus) and health facilities (CNES) from the Ministry of Health open data API,  
So that the portal has a tenant-isolated, auditable mart to power the medication search and the Lei 14.654/2023 compliance sentinel.

**Escopo:** somente ELT (extract/load Python + dbt). Toda a UI e a camada `@transparencia/db` foram movidas para a Story 19.2.

**Acceptance Criteria:**
- **Given** os endpoints oficiais `GET https://apidadosabertos.saude.gov.br/daf/estoque-medicamentos-bnafar-horus?codigo_municipio={ibge6}` e `GET https://apidadosabertos.saude.gov.br/assistencia-a-saude/cnes-estabelecimentos?co_ibge={ibge6}`
- **When** o pipeline global (`ingestion-pipeline.yml`) ou `make elt/farmacia-sus [PORTAL=...]` é executado
- **Then** o extrator (`elt/extract/farmacia_sus.py`) pagina as duas APIs por IBGE de 6 dígitos de cada portal, deduplica o CNES pela competência mais recente (`nu_comp`) e registra cada coleta como `sucesso` ou `falha`, sem nunca tratar falha de coleta como apagão.
- **And** o loader (`elt/load/farmacia_sus.py`) grava em `raw_farmacia_sus` (`estoque_medicamentos`, `estabelecimentos_cnes`, `coletas`) com `portal_slug` na chave primária e sem payload bruto.
- **And** o dbt expõe `fct_farmacia_estoque` classificando cada portal como `conforme`, `apagao` (0 itens ou posição defasada > 15 dias, calculada por CNES) ou `indisponivel` (coleta ausente, falha ou antiga), com coordenadas das unidades (`latitude_unidade`, `longitude_unidade`, CNES primário e estoque como complemento), em lowercase snake_case (Regras 9, 10 e 23).
- **And** a ingestão roda dentro do `ingestion-pipeline.yml` global, sem workflow dedicado.
- **And** `make check`, `make test` e `make db/fixture/check` passam.

---

### Story 19.2: Página da Farmácia SUS (`/[portalSlug]/saude/farmacia`), Camada de Dados e Card-Resumo na Home

As a citizen seeking essential medication or a civic auditor,  
I want a dedicated Farmácia SUS page with a search-first experience and a compact summary on the homepage,  
So that I can find which health facility has my medicine without cluttering the homepage, and see or act on Lei 14.654/2023 violations.

**Acceptance Criteria:**
- **Given** o mart `fct_farmacia_estoque` da Story 19.1
- **When** `getFarmaciaSus(portalSlug)` é consumida em `@transparencia/db/src/queries/farmacia.ts` (somente leitura do mart, sem `fetch`, DTOs `camelCase`, isolamento por `portal_slug`)
- **Then** a rota `/[portalSlug]/saude/farmacia` renderiza a busca **vazia por padrão** ("Qual remédio você procura?"), resultados **agrupados por unidade** (nome, endereço, telefone, quantidade, data da posição) com paginação ("Ver mais unidades") e filtro por unidade, com deep link (`?q=...&unidade=...`).
- **And** exibe mapa das unidades (`latitudeUnidade`/`longitudeUnidade`), reutilizando o mini-mapa de Obras; unidade sem coordenada aparece só na lista.
- **And** trata os estados: `conforme` (selo "Estoque Transparente — Atualizado em [data]"), `apagao` (sentinela citando a [Lei 14.654/2023](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14654.htm) com `target="_blank"` e `rel="noopener noreferrer"`, botões "Copiar Requerimento de Fiscalização" (Art. 6º-A da Lei 8.080/1990) e "Compartilhar no WhatsApp", **somente nesta rota na 19.2; estendido à home na Story 19.4**) e `indisponivel` (mensagem neutra).
- **And** a home exibe apenas um **card-resumo compacto** abaixo do resumo fiscal (sem lista de medicamentos): campo "Qual remédio você procura?" no estado `conforme`, faixa curta com "Ver detalhes" no `apagao`, e nada no `indisponivel`.
- **And** `llms.txt` e `llms-full.txt` documentam a rota (Regra 12); vocabulário e componentes do design system (Regra 24); sem nomes de município/UF fixos (Regra 23).

---

### Story 19.3: Reorganização da Arquitetura da Homepage (Dobra de Sentinela Cívica & Troféus da Cidade)

As a citizen or local taxpayer,  
I want the homepage hierarchy restructured to prioritize real-life civic impact over raw accounting tables,  
So that I immediately understand public service quality, municipal breakthroughs, and critical red flags upon landing on the portal.

**Acceptance Criteria:**
- **Given** a página inicial `apps/web/app/[portalSlug]/page.tsx`
- **When** a página é renderizada
- **Then** a estrutura de blocos segue estritamente a arquitetura de informação do handoff de produto:
  - **1. Header do Município:** Identidade cívica, nome oficial da cidade e brasão.
  - **2. Dobra Superior (Sentinela Cívica & Utilidade):**
    - Card-resumo da Farmácia SUS e faixa de alerta da Lei 14.654/2023 (Story 19.2; sem lista de medicamentos na home).
    - `EducacaoTrofeuCard` (conquista do IDEB 2025 da Epic 18: salto de 4,5 para 5,9 e maior crescimento do RJ).
    - `ObrasParalisadasAlertaCard` (resumo de obras travadas e recursos públicos paralisados da Epic 17).
  - **3. Radar Cívico:** Feed de anomalias promovido e ordenado por severidade e impacto social.
  - **4. Painel Fiscal Resumido:** Indicador consolidado de saúde fiscal e disponibilidade de caixa líquido.
  - *(Sem seção de trilhas temáticas na página: a exploração por tema vive na navegação lateral e na bottom bar.)*
- **And** o data loader `loadVisaoGeralData` em `apps/web/app/[portalSlug]/loader.ts` orquestra todas as consultas via `@transparencia/db` em paralelo com `Promise.all`.
- **And** nenhum nome de município ou estado é declarado de forma hardcoded (Regra 23, zero tenant leakage).
- **And** na sidebar desktop (`packages/ui/src/components/sidebar.tsx`) o grupo "Temas" aparece antes do grupo "Administrativo", que continua aberto.
- **And** a bottom bar mobile (`apps/web/components/mobile-bottom-nav.tsx`) exibe Início, Saúde, Educação, Obras e "Mais" (o "Mais" abre os itens administrativos e a Previdência quando habilitada), com alvos de toque de pelo menos 44 px e `aria-label`; a lista de temas vem de uma fonte única compartilhada com a sidebar.
- **And** o fallback `"/brasao-porciuncula.png"` em `normalizedBrasao` no `sidebar.tsx` é removido: sem brasão informado, renderiza-se o ícone cívico neutro (Regra 23).

---

### Story 19.4: Ação Cívica no Card da Farmácia na Home

As a citizen who finds no up-to-date pharmacy stock information for my city,  
I want to act right from the homepage card (copy a request to a councilor or the health secretary, or share it on WhatsApp),  
So that I do not need to open the pharmacy page to react to the lack of disclosure.

**Contexto:** decisão anterior à descoberta dos dados de estoque de Natividade. O estado `apagao` (0 itens ou posição com mais de 15 dias, Story 19.1) já aparece na home como faixa "Sem informação de estoque" com "Ver detalhes", mas os botões de ação existem só em `/[portalSlug]/saude/farmacia` (Story 19.2). Esta story **estende o `FarmaciaResumoCard` existente**; não cria componente novo e não altera a camada de dados.

**Acceptance Criteria:**
- **Given** o `FarmaciaResumoCard` (`apps/web/components/farmacia/farmacia-resumo-card.tsx`) com `status === "apagao"`
- **When** renderizado na home
- **Then** exibe, além do texto de contexto e do link "Ver detalhes", os botões "Copiar Requerimento de Fiscalização" e "Compartilhar no WhatsApp", reutilizando a lógica do `farmacia-sus-sentinela-banner.tsx` por extração de um trecho compartilhado (sem duplicar clipboard, texto do requerimento nem link do WhatsApp).
- **And** o gatilho continua sendo somente `apagao`: `conforme` mantém a busca e `indisponivel` continua sem render, pois pode ser falha de coleta ou ausência de publicação e não deve induzir ação.
- **And** a palavra "apagão" não aparece na UI; o rótulo e o contexto seguem o `editor-cidadao` (ex.: "Sem informação de estoque"; contexto que diz que o dado não mostra falta de remédio, e sim ausência de divulgação atualizada), indício e nunca acusação.
- **And** a restrição "somente nesta rota" da Story 19.2 é revogada para esses dois botões; a [Lei 14.654/2023](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14654.htm) e o Art. 6º-A da Lei 8.080/1990 citados têm link oficial com `target="_blank"` e `rel="noopener noreferrer"`.
- **And** a citação legal é corrigida de "Art. 6º-B" para **"Art. 6º-A da Lei nº 8.080/1990, incluído pela Lei nº 14.654/2023"** (texto verificado no DOU de 24/08/2023 e no Planalto) no requerimento, na sentinela, nos testes e nos documentos de contexto; "divulgação quinzenal" tem base direta nesse artigo. O gatilho de 15 dias é parâmetro do portal e não prazo legal, e o requerimento fala em "possível descumprimento".
- **And** sem município, UF ou ano fixos (Regra 23); `make test/ts` e build passam.

**Fora de escopo (referências):** limites de pessoal da LRF lidos do seed (issue #61); termômetros de MDE 25% e Saúde 15% e `PainelSaudeFiscalCard` (`deferred-work.md`, refinamento da 19-4).

---

### Story 19.7: Sincronização da Nova Arquitetura da Home em `llms.txt` e Otimizações de Acessibilidade Mobile

As an AI agent or assistive technology user,  
I want the redesigned homepage structure fully documented and perfectly accessible across all viewports,  
So that external LLMs and screen readers understand the civic priorities of the portal.

**Acceptance Criteria:**
- **Given** as alterações na página inicial
- **When** finalizada a implementação
- **Then** os arquivos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` são atualizados documentando a nova hierarquia, a página da Farmácia SUS, a entrada por tema `/farmacia`, o card-resumo e a faixa da Lei 14.654/2023 e as convenções de sentinela cívica (Regra 12).
- **And** a página inicial atinge nota 100% no Lighthouse de Acessibilidade e SEO em mobile.
- **And** todos os testes estáticos e de tipagem passam com sucesso (`pnpm build`, `tsc --noEmit`, `make test`).

---

### Story 19.8: Histórico de Estoque da Farmácia SUS (Snapshots Diários e Histórico de Coletas)

As a data analyst and civic auditor,  
I want the daily pharmacy stock snapshots and the collection history preserved instead of overwritten,  
So that we can prove how long a municipality went without transmitting and, in the future, compute stockout duration, turnover and expiry statistics.

**Prioridade:** executar antes de iniciar a coleta diária em produção, pois cada dia sem acumular é histórico perdido. Independe das stories de UI.

**Acceptance Criteria:**
- **Given** o pipeline ELT da Story 19.1
- **When** o loader grava o estoque
- **Then** `raw_farmacia_sus.estoque_medicamentos` passa a ser append-only e idempotente, com chave `(portal_slug, id_registro, data_posicao_estoque)` (rodar duas vezes no mesmo dia não duplica) e registra a origem do dado (`sigla_sistema_origem`).
- **And** `raw_farmacia_sus.coletas` acumula uma linha por execução (portal, data da coleta, status, totais), em vez de manter só a última.
- **And** o dbt expõe um modelo incremental `fct_farmacia_estoque_historico` (grão: portal, unidade, medicamento, lote e data da posição, com quantidade e validade) e uma visão do histórico de coletas por portal, em lowercase snake_case e com `portal_slug` nas chaves e agrupamentos (Regras 9, 10 e 23).
- **And** o mart atual `fct_farmacia_estoque` continua devolvendo a última posição de cada unidade, sem alterar seu contrato.
- **And** testes cobrem a idempotência, a preservação do histórico em recargas e a coleta com falha (não apaga o histórico); `make check`, `make test` e `make db/fixture/check` passam.

---

### Story 19.9: Medicamentos-Sentinela da Farmácia SUS: Disponibilidade por Unidade sob a Busca

As a citizen looking for essential medication,
I want to see, right below the search box, the most common essential medicines and in how many health facilities each one has reported stock,
So that I can spot at a glance which basic medicines are missing from the reported stock and click to find where the available ones are.

**Contexto:** a fonte (BNAFAR/Hórus) não publica saídas nem dispensação e só traz itens com saldo, então não há ranking de demanda nem como afirmar "estoque zerado". A lista é editorial, baseada na RENAME 2024 (Anexo I, Componente Básico) e na PNAUM. Fundamentação, lista de 21 itens e riscos em `handoff-sentinelas-farmacia-sus.md`.

**Acceptance Criteria:**
- **Given** a lista de sentinelas do handoff (19 itens do núcleo, sem azitromicina, mais `fluoxetina` e `amitriptilina`)
- **When** o dbt é executado
- **Then** existe o seed `seed_farmacia_medicamentos_sentinela` (declarado em `seeds.yml` com `column_types` em `text`, Regra 16) com `codigo_principio_ativo`, `nome_principio_ativo`, `prefixo_nome_normalizado`, `grupo_terapeutico` e `ordem_exibicao`; códigos em lowercase snake_case sem acento (Regra 10), colunas com nomes explícitos (Regra 9), sem município, UF ou portal (Regra 23). Um mesmo `codigo_principio_ativo` pode ter mais de uma linha (ex.: `insulina` com os prefixos `insulina humana nph` e `insulina humana regular`).
- **And** o mart `fct_farmacia_sentinela_disponibilidade` (contrato `enforced` e `unique_combination_of_columns` em `_fct_farmacia_sentinela_disponibilidade.yml`, como o mart-pai) é derivado de `fct_farmacia_estoque` filtrado em `status_conformidade = 'conforme'` e tem grão `(portal_slug, codigo_cnes, codigo_principio_ativo)`, com `status_disponibilidade` em `com_registro_estoque` / `sem_registro_estoque` e `quantidade_apresentacoes_com_estoque`. Todo `JOIN` e `GROUP BY` inclui `portal_slug` (Regra 23).
- **And** o **casamento** usa `{{ target.schema }}.unaccent(lower(nome_medicamento))` (Regra 11) com a regra `^prefixo_nome_normalizado([ ,(]|$)`, **excluindo** nomes com `+` ou "associada" (combinações em dose fixa não são o sentinela). Isso evita falsos positivos reais da base: `amoxicilina + clavulanato`, `atenolol + clortalidona`, `losartana + hidroclorotiazida`, `paracetamol + codeína`, `furosemida + cloreto de potássio`, e as insulinas análogas (aspart, glargina, lispro etc.), que não são a NPH/regular do Anexo I. Variações de sal ("losartana potássica", "dipirona sódica", "levotiroxina sódica") continuam casando pelo prefixo.
- **And** o denominador são as **unidades ativas** derivadas do próprio mart de estoque (`distinct codigo_cnes` dos itens de portal `conforme`); a combinação unidade × sentinela é gerada por `cross join` do seed (tabela de ~21 linhas, sem `portal_slug`) com as unidades ativas, já filtradas por portal. `com_registro_estoque` exige ao menos uma apresentação com `quantidade_estoque > 0`. **Não se somam quantidades entre apresentações** (mL, comprimidos e frascos não são comparáveis); o mart expõe só a contagem. O CNES apenas enriquece nome e endereço, então unidade que nunca transmitiu não entra na conta; a interface escreve "N de M unidades que informaram estoque".
- **And** `getFarmaciaSentinelas(portalSlug)` em `@transparencia/db/src/queries/farmacia.ts` devolve DTOs camelCase (ex.: `unidadesComRegistro`, `totalUnidadesAtivas`, `grupoTerapeutico`), somente leitura do mart, sem lógica na camada de apresentação.
- **And** a rota `/[portalSlug]/saude/farmacia` exibe, abaixo da busca e **somente no estado `conforme`**, os sentinelas agrupados por `grupo_terapeutico`; clicar em um item leva à busca preenchida (`?q=`). Nos estados `apagao` e `indisponivel` o bloco não aparece.
- **And** o texto ao cidadão usa "não aparece na lista de estoque" (nunca "esgotado" ou "zerado"), em linguagem simples (revisão `editor-cidadao`; entradas novas em `docs/glossario-cidadao.md`), e traz nota de que a lista vem da RENAME 2024, com **link oficial** para o PDF do Ministério da Saúde (Regra 20, chave `rename2024` em `apps/web/lib/constants/legislacao.ts`), e de que a fonte publica apenas itens com saldo. Não há ranking de demanda.
- **And** rótulos vêm da camada de UI a partir dos códigos (Regra 10), componentes do design system (Regra 24), `llms.txt` e `llms-full.txt` atualizados (Regra 12).
- **And** testes cobrem: casamento por princípio ativo com apresentações, sais e acentos diferentes, **combinações em dose fixa e insulinas análogas não casando**, item totalmente ausente, apresentação com quantidade zero contando como sem registro, unidade inativa fora do denominador e isolamento entre portais; `make check`, `make test`, `make test/ts` e `make db/test/build` passam (Regra 21: não há fixture versionado).
- **And** (decisão posterior) o mart expõe `quantidade_apresentacoes_combinacao_com_estoque` e a query `unidadesSomenteCombinacao`: combinações em dose fixa continuam **não** contando como o sentinela, mas quando a unidade só tem o princípio ativo em combinação (ex.: `valsartana + hidroclorotiazida`) o item mostra "só aparece misturado com outro remédio em N de M unidades", para não contradizer a busca textual, que encontra o nome.
- **And** (decisão posterior) a página da farmácia mostra o link "Limpar busca" no formulário quando há busca ativa (`FarmaciaBuscaForm`, prop opcional `limparHref`), voltando à rota sem `?q=`, `unidade` e `limite`.
- **And** (decisão posterior) o card da Farmácia SUS na página inicial (`conforme`) exibe até 6 pílulas de exemplo ("Exemplos:") que levam à busca preenchida. A eleição é dado, não UI: coluna `destaque_card_inicial` no seed (`dipirona`, `paracetamol`, `losartana`, `metformina`, `amoxicilina`, `omeprazol`), exposta no mart e em `destaqueCardInicial`; só aparecem os que têm `unidadesComRegistro > 0` no município, e uma falha da consulta não derruba a página inicial.
- **And** (operação) o pipeline `elt/farmacia-sus` roda `dbt seed --full-refresh` do seed de sentinelas antes do mart, porque colunas novas exigem recriar a tabela do seed. Até o seed e o mart serem reconstruídos em um ambiente, o bloco de sentinelas e as pílulas ficam ocultos (a consulta falha e é descartada).

**Dependências:** 19.1 (concluída) e 19.2 (página e query base). Independe da 19.8, que depois pode enriquecer o bloco com "sem registro há N dias".


---

### Story 19.11: Redesenho do Conteúdo da Página da Farmácia SUS (Busca em Destaque, Resultados com Mapa e Remédios Essenciais)

As a citizen looking for medication in my city,  
I want the pharmacy page to put the search first and show where each medicine is available on a map and by unit,  
So that I find the nearest unit with stock quickly and see at a glance which essential medicines the city reports.

**Contexto:** refatoração de layout **só da área de conteúdo** de `/[portalSlug]/saude/farmacia`, a partir do handoff de design em `_bmad-output/planning-artifacts/design_handoff_farmacia_sus/` (README + protótipos `.dc.html`). **Não alterar** sidebar, banner superior, header/bottom nav mobile e footer. **A rota não muda nesta story** (a mudança para `/[portalSlug]/farmacia` é da 19.10). Os dados do protótipo são placeholders: usar **os dados reais** do projeto. Executar **antes da 19.10**; depende da 19.8 e da 19.9 (concluídas).

**Acceptance Criteria:**
- **Given** a página atual da farmácia
- **When** renderizada
- **Then** segue o layout do handoff: (1) cabeçalho com eyebrow "Temas · Saúde · Farmácia SUS", H1, lead de uma linha e selo de atualização; busca em destaque (lupa, "×" dentro do campo, botão Buscar, Enter busca) com chips "Mais procurados"; 3 indicadores; (2) seção "Onde encontrar …" com seletor "Por unidade | Por remédio" e mapa; (3) seção "Remédios essenciais" com "Como ler esta lista" recolhível (texto da RENAME inalterado), filtro por categoria e lista de cobertura.
- **And** o selo da Lei 14.654/2023 é mantido, com os estados `conforme`, `apagao` e `indisponivel`.
- **And** os chips "Mais procurados" usam o critério já estabelecido na 19.9 (mesma fonte das pílulas da home), sem lista fixa no componente.
- **And** busca sem distinção de acento e caixa, por substring; estado vazio sem prometer que o remédio acabou ("não aparecer na lista não prova que o remédio acabou"), texto revisado pelo `editor-cidadao`.
- **And** mapa Leaflet + Esri World Light Gray (igual a Obras), com marcadores numerados para unidades com resultado, pontos cinza para as demais, `fitBounds` recalculado a cada busca e hover/clique sincronizados entre card e marcador; em mobile o mapa fica acima da lista.
- **And** os 3 indicadores (unidades que informaram estoque, essenciais no estoque, última atualização) e os agrupamentos por unidade e por remédio são calculados em `@transparencia/db`; a apresentação só renderiza. Nenhum "8 unidades", "Há N dias" ou intervalo de datas fixo (Regra 23).
- **And** tokens mapeados para os existentes em `packages/ui/src/tokens.ts` (Regra 24), acrescentando só os que faltarem; fixtures de teste sem os números inventados do protótipo.
- **And** `make test/ts`, `pnpm typecheck` passam.

**Dependências:** 19.8 e 19.9. **Bloqueia:** 19.10.

---

### Story 19.10: Página Dedicada da Farmácia SUS (`/[portalSlug]/farmacia`) com Estatísticas de Estoque e Ação por Medicamento

As a citizen looking for medication in my city,  
I want a dedicated pharmacy page, independent of the Health section, that shows the stock search, the essential medicines and how current the reported stock is,  
So that I find medicine, understand how reliable the information is and know how to act when an essential medicine has no reported stock.

**Contexto:** hoje a farmácia vive em `/[portalSlug]/saude/farmacia` (Story 19.2). A página passa a ter identidade própria porque deixa de ser só uma busca: reúne estatísticas de estoque, sentinelas e ações. **Sem redirect da rota antiga:** a página ainda não foi lançada, então a rota é movida, e não duplicada. Executar **depois das Stories 19.8, 19.9 e 19.11**: o layout (busca, 3 indicadores, resultados com mapa, essenciais) já vem da 19.11, e esta story adiciona rota, lotes a vencer e a ação por sentinela.

**Acceptance Criteria:**
- **Given** a rota `/[portalSlug]/farmacia`
- **When** a página é renderizada
- **Then** reúne, em ordem: busca de medicamento (19.2), estatísticas de estoque, medicamentos-sentinela (19.9) e a sentinela de conformidade da Lei 14.654/2023, preservando os estados `conforme`, `apagao` e `indisponivel`.
- **And** a rota antiga `/[portalSlug]/saude/farmacia` é removida (sem redirect), e todas as referências são atualizadas: link do card da home, URL embutida no requerimento e no texto de WhatsApp, navegação, `llms.txt`, `llms-full.txt` (Regra 12), metadados e testes.
- **And** o sidebar (`packages/ui/src/components/sidebar.tsx`) ganha o item solto "Farmácia SUS" (fora de qualquer grupo), logo abaixo de "Radar Cívico", apontando para `/[portalSlug]/farmacia`; a barra mobile só muda se tiver o mesmo menu.
- **And** exibe estatísticas calculadas na camada `@transparencia/db` (somente leitura de marts, sem lógica na apresentação): unidades que informaram estoque, itens com saldo, data da última atualização e, quando a validade estiver disponível (19.8), lotes próximos do vencimento. Cada número traz contexto e a fonte, com os helpers canônicos de formatação.
- **And** para cada sentinela em `sem_registro_estoque`, há um botão de ação que gera um pedido de esclarecimento sobre aquele medicamento (copiar texto e compartilhar no WhatsApp), reutilizando o trecho compartilhado de ações da Story 19.4, sem duplicar clipboard nem link.
- **And** o texto nunca diz "esgotado" ou "zerado" (a fonte só publica itens com saldo): usa "sem registro de estoque informado", tom de indício, revisado pelo `editor-cidadao`.
- **And** a base legal do pedido foi verificada pelo `jurista-fiscal` no texto oficial do Planalto (24/10/2026): arts. 10 e 11 da Lei 12.527/2011 (pedido; resposta em até 20 dias, prorrogáveis por mais 10) e art. 6º-A da Lei 8.080/1990, incluído pela Lei 14.654/2023 (divulgação quinzenal e acessível do estoque das farmácias públicas do SUS). O pedido nunca afirma falta do medicamento nem descumprimento: a lei obriga a divulgar o estoque, não a mantê-lo. Texto-base, com campos vindos dos dados (medicamento, data da posição, unidade) e links oficiais das duas leis (Regra 20): "Com base nos arts. 10 e 11 da Lei nº 12.527/2011 (Lei de Acesso à Informação) e no art. 6º-A da Lei nº 8.080/1990, incluído pela Lei nº 14.654/2023, que obriga a divulgação quinzenal e acessível dos estoques de medicamentos das farmácias públicas do SUS, solicito esclarecimento sobre o medicamento [nome]. Na posição de estoque divulgada em [data], não consta registro de estoque informado para esse item. Peço informar se o medicamento está disponível e, caso não esteja, a previsão de reposição." Pendente de confirmação, sem bloquear: leitura do art. 9º da Lei 8.080 (alcance sobre a gestão municipal) e do art. 1º da LAI.
- **And** sem município, UF ou ano fixos (Regra 23); componentes do design system (Regra 24); `make test/ts` e `tsc --noEmit` passam.

**Dependências:** 19.8 (histórico e validade), 19.9 (sentinelas) e 19.11 (redesenho do layout; os indicadores básicos já existem, aqui entra apenas o card de lotes a vencer, condicional à validade). A 19.5 e a 19.6 (opcionais) ficam para depois, pois a decisão sobre elas depende desta página.

---

### Story 19.12: Download do Estoque Completo da Farmácia SUS em CSV

As a citizen, journalist or councilor who wants to check the pharmacy stock,  
I want to download the full stock list of my city as a CSV,  
So that I can cross-check it with other sources without depending on the search box.

**Contexto:** a página da Farmácia SUS só mostra o estoque por busca. O endpoint `/api/[portalSlug]/export` hoje atende só despesas, caixa e pessoal (cinco tipos, todos com `ano`), monta o CSV em memória e já aplica `checkRateLimit` e `escapeCsvCell`. Executar **depois da Story 19.10** (rota `/[portalSlug]/farmacia` e seção "Fonte dos dados" no fim da página).

**Acceptance Criteria:**
- **Given** o endpoint de exportação
- **When** recebe o tipo `estoque_farmacia` com um `portalSlug` válido, sem `ano`
- **Then** devolve o CSV da posição de estoque vigente do portal (a mesma que alimenta a página), com `Content-Disposition` no formato `estoque_farmacia_<portalSlug>.csv`, mantendo `checkRateLimit` e `escapeCsvCell`; portal inválido ou sem estoque vigente responde de forma neutra, sem vazar dados de outro tenant (Regra 23).
- **And** a leitura vive em `@transparencia/db` (somente leitura do mart `fct_farmacia_estoque`, com `portal_slug` no filtro), com colunas explícitas em snake_case (Regra 9): `portal_slug`, `codigo_cnes`, `nome_estabelecimento`, `nome_medicamento`, `numero_lote`, `quantidade_estoque`, `data_posicao_estoque` e, quando disponível, `data_validade`. Sem dado pessoal.
- **And** se o volume justificar, a resposta é transmitida em stream em vez de montada inteira em memória; a decisão e a medida ficam registradas na spec.
- **And** a seção "Fonte dos dados" da página exibe o link "Baixar a lista completa de estoque (CSV)", reaproveitando o botão de exportação existente (generalizado, sem duplicar download), com a legenda: "a lista traz só os remédios com estoque informado; um remédio ausente não prova que acabou" (nunca "esgotado" ou "zerado"), revisada pelo `editor-cidadao`.
- **And** o link some quando o portal não está em `conforme`; sem município, UF ou ano fixos (Regra 23); `llms.txt` e `llms-full.txt` documentam o download (Regra 12); `make test/ts` e `tsc --noEmit` passam.

**Dependências:** 19.10 (rota e seção "Fonte dos dados"). Decisão em aberto para a spec: delimitador e formatação numérica seguem o padrão do export atual (`;` e vírgula decimal quando solicitado).

---

### Story 19.13: Ajustes da Seção "Em destaque" da Home (Realce por Status e Ordem dos Cards)

As a citizen opening the home page,  
I want the "Em destaque" cards to look the same and follow a stable order,  
So that no card seems more important or more "approved" just because of a colored glow.

**Acceptance Criteria:**
- **Given** a seção "Em destaque" da home
- **When** renderizada
- **Then** os cards da Farmácia SUS e de Educação Básica e Desempenho Escolar têm contorno neutro, sem o realce verde/âmbar que variava conforme o status dos dados; o status segue comunicado por texto e selo.
- **And** a ordem é Farmácia SUS, Obras e Educação, sem deixar vazio quando algum card não tem dado.
- **And** só apresentação (sem mudança em `@transparencia/db`); sem município, UF ou ano fixos (Regra 23); testes atualizados.

**Dependências:** 19.3 e 19.4.

---

### Story 19.5 (opcional): Entrada por Tema na Raiz (`/farmacia`) com Seletor de Cidade e Faixa "Trocar cidade"

> **Opcional, movida para o fim da Epic 19.** Só será decidida depois de definido todo o escopo da página da Farmácia SUS (19.8, 19.9 e demais ajustes da página). Sem spec até lá. A 19.6 depende desta.

As a citizen receiving a shared link,  
I want to open a thematic link such as `/farmacia` and choose my city,  
So that sharing the subject, not the city, works on WhatsApp and I always know which city I am seeing.

**Acceptance Criteria:**
- **Given** o mecanismo genérico tema + cidade (reutilizável por `/obras`, `/educacao`), com a lista de temas derivada do código e sem confundir tema com `portalSlug`
- **When** o usuário acessa `/farmacia` sem cidade salva
- **Then** vê o seletor de cidade temático ("Em qual cidade você quer procurar remédios?") com a lista dos municípios obtida de `getAllPortais()` e o estado do estoque de cada um; ao escolher, grava `preferred_portal` e navega para `/[portalSlug]/saude/farmacia`.
- **And** com `preferred_portal` válido, redireciona direto e exibe a faixa "Mostrando [cidade] · Trocar cidade" na página de destino.
- **And** a página tem OpenGraph próprio; lista vazia de municípios mantém estado neutro (Regra 23); sem listas de cidades hard-coded.

---

### Story 19.6 (opcional): Atalho "Remédios" no Topbar Mobile

> **Opcional, bloqueada pela 19.5.** Só entra se a 19.5 for implementada.

As a mobile citizen,  
I want a prominent "Remédios" shortcut in the top bar,  
So that I reach the medication search in one tap.

**Acceptance Criteria:**
- **Given** o topbar mobile
- **When** renderizado
- **Then** exibe botão com ícone e texto "Remédios" (área de toque ≥ 44 px, `aria-label`) que leva a `/farmacia` (Story 19.5), ao lado do ícone de busca.
- **And** não altera a barra de navegação inferior; acessibilidade e SEO mantêm nota 100% no Lighthouse mobile.

---

### Checklist de fechamento da Epic 19 (pendências de produção)

> **Não fechar a Epic 19 sem concluir estes itens.** Todos exigem **autorização explícita do usuário** (Regra 15) e devem ocorrer **antes de iniciar a coleta diária da Farmácia SUS em produção** (Story 19.8).

- [ ] Rodar em produção a migração de chaves primárias de `raw_farmacia_sus` (`ensure_farmacia_sus_tables`), incluindo a limpeza das linhas legadas de estoque com data fora do formato AAAA-MM-DD.
- [ ] Rodar `dbt run --full-refresh` em `fct_farmacia_estoque_historico` (`on_schema_change='fail'` por causa da coluna `data_validade`).
- [ ] Só então iniciar a coleta diária em produção (cada dia anterior sem acumular é histórico perdido).

---

## Epic 20: Tema Divisórias: Identidade Visual Minimalista, Tema Claro/Escuro Acessível e Migração dos Componentes

Substituir o padrão de painéis com borda arredondada e sombra por uma linguagem editorial baseada em filetes (2px para seções, 1px para itens), tipografia hierárquica e colunas separadas por filete vertical, conforme `handoff-divisorias/ISSUE-divisorias.md` e os protótipos `Home - Divisorias.dc.html` e `Farmacia SUS - Padrao.dc.html` (pasta `_bmad-output/planning-artifacts/handoff-divisorias/`). Toda cor passa a ser variável CSS semântica; o tema escuro, opcional e escolhido pelo usuário, é um bônus de acessibilidade e troca apenas valores de variáveis. Raio de 6px só em controles; raio maior só em camadas flutuantes (modal, menus, tooltip).

**Nota de numeração:** esta epic entra antes das antigas 20, 21 e 22, que foram renumeradas para 21 (Assistência Social), 22 (Busca Global) e 23 (Confiança e Transparência). As epics 21, 22 e 23 devem nascer já no padrão divisórias.

**Decisões do produto (Julio, 2026-10-25):**
- Fundo da página: **branco** (`page`), não mais cinza `#f4f5f7`.
- Tema padrão: **claro**. O escuro só ativa se o usuário escolher no toggle (sem `prefers-color-scheme`); o script anti-flash apenas lê `localStorage["mt-tema"]`.
- Contraste: **AA vence o protótipo**. `mute2`, `mute3`, `faint` e demais tons de texto podem ser escurecidos acima dos valores do handoff para atingir 4,5:1 (texto normal) e 3:1 (texto grande e componentes). Contas de cabeça sugerem que `mute3` do protótipo falha nos dois temas; validar com ferramenta.
- Ordem de migração por tráfego real (PostHog, 180 dias): a Home do município concentra a maior parte dos visitantes; em seguida licitações, despesas, pessoal, receitas, orçamento, saúde e educação. A Farmácia SUS ainda não foi lançada (piloto sem público).
- Pendência já resolvida: `text-attention` está em `packages/ui/src/tokens.ts` (`oklch(0.5 0.11 70)`), idêntico ao `warn` claro; vira alias de `warn`.

**Decisão em aberto (resolver na Story 20.6):** formato das tabelas no mobile. Hoje `DenseTable` oferece `renderMobileCard` (um desenho de cartão por página, 11 arquivos usam o componente) e a lista fica longa demais. Candidatas: (A) linha de duas linhas com detalhes expansíveis, (B) API declarativa `mobileSummary` com `renderMobileCard` como saída de emergência, (C) tabela com rolagem horizontal, primeira coluna fixa e largura total. Decidir com protótipos usando licitações e despesas reais em 375px.

**Restrições:** Regra 23 (sem literais de tenant, UF ou ano; nada de lista fixa de municípios), Regra 9 (nomes explícitos), Regra 20 (links externos com `target="_blank" rel="noopener noreferrer"`), regras de `.claude/rules/` para web/UI; camada de apresentação só renderiza dados de `@transparencia/db`. Sem `dark:` e sem cor hex fixa em componente. Imagens OG permanecem no tema claro. Padrão de commits: Conventional Commits em minúsculas, sem referência a story ou task.

**Padrões base (decisão do Julio, 2026-10-29):** `DESIGN.md` e `EXPERIENCE.md` na raiz definem os elementos base, os papéis visuais e o `panel`, evolução do padrão de filetes (borda lateral de 3px por padrão, formato trocável por variável). As Stories 20.14 a 20.17 vêm **antes da 20.7**; as Stories 20.7 a 20.10 passam a usar elementos base e papéis nas páginas que tocam e removem suas entradas da lista de isentos; a Story 20.18 fecha a migração.

**Fora do escopo:** navegação mobile (`MobileBottomNav` só troca tokens), mudança de dados ou queries, novas funcionalidades.

**Pendência de insumo:** definir o formato da tabela mobile (Story 20.6). Ajustar a Story 23.x de "tema escuro e auditoria WCAG" no backlog, já que parte dela é absorvida aqui.

---

### Story 20.1: Tokens, Tema Claro/Escuro e Guarda de Arquitetura

As a developer,  
I want semantic color tokens as CSS variables with a light default and an optional dark theme,  
So that every component changes theme by swapping variable values, never by scattering `dark:` classes.

**Escopo:** `apps/web/app/globals.css` (`@theme` do Tailwind 4), `apps/web/tailwind.config.ts` (confirmar qual dos dois é a fonte de verdade e remover a duplicidade), `packages/ui/src/tokens.ts`, `apps/web/app/layout.tsx`.

**Acceptance Criteria:**
- **Given** a tabela de tokens do handoff (`page`, `ink`, `onink`, `line`, `line2`, `track`, `mute`, `mute2`, `mute3`, `faint`, `pill`, `banbg`, `banfg`, `brand`, `danger`, `ok`, `warn`)
- **When** o app renderiza
- **Then** cada token existe nos temas claro e escuro, com `page` branco no claro, ativados por `.dark` no `<html>`.
- **And** o texto sobre `page` e sobre `banbg` atinge contraste mínimo AA (4,5:1; 3:1 para texto grande e controles) nos dois temas, validado com ferramenta; valores ajustados acima do protótipo ficam documentados na própria story.
- **And** um script inline no `<head>` lê `localStorage["mt-tema"]` antes da hidratação, aplica `.dark` apenas se o valor for `dark`, e não causa flash; sem valor guardado, o tema é claro.
- **And** `accent`, `borderLine`, `canvas`, `subtleText`, `mutedText`, `cardBg` e `text-attention` continuam existindo como aliases dos novos tokens, e `TOKENS` em `packages/ui/src/tokens.ts` aponta para `var(--...)`.
- **And** existe um teste de arquitetura que falha se aparecer `dark:` ou cor hex fixa em componente novo, com uma lista de exceções que só pode encolher.
- **And** `pnpm typecheck`, `pnpm test` e `biome` passam.

---

### Story 20.2: Shell: Sidebar, Ribbon, Footer e Alternador de Tema

As a citizen,  
I want a calmer navigation shell with an easy way to choose light or dark theme,  
So that I can read the portal comfortably on any device and lighting.

**Escopo:** `packages/ui/src/components/sidebar.tsx`, `ribbon.tsx`, `apps/web/components/global-footer.tsx`, novo `theme-toggle.tsx`.

**Acceptance Criteria:**
- **Given** a sidebar
- **When** renderizada
- **Then** não tem fundo próprio e usa `border-r border-line`; o item ativo usa `border-l-2 border-ink font-semibold`, cada item tem ícone Lucide de 16px, os campos Exercício e Entidade usam `rounded-md border border-line` e o rodapé contém apenas "Compartilhar página" e o `ThemeToggle`.
- **And** o `ThemeToggle` oferece `Claro | Escuro` com `Sun` e `Moon`, `aria-pressed` correto, persiste em `localStorage["mt-tema"]` e é operável por teclado.
- **And** o ribbon usa `banbg`/`banfg` e o footer usa `border-t-2 border-ink` em três colunas (marca e fonte dos dados, "Neste dispositivo" com `PushNotificationPrompt` e `PwaInstaller`, "Alertas" com botão primário de e-mail).
- **And** rótulos mono pequenos (`text-[10px]`) passam a no mínimo 11px com contraste AA.
- **And** `sidebar.spec.tsx` e demais specs de classe são atualizados; sem município, UF ou ano fixos (Regra 23).

**Dependências:** 20.1.

---

### Story 20.3: Componentes de `packages/ui` no Padrão Divisórias

As a developer,  
I want the shared UI components to offer the divider look,  
So that pages can migrate without writing custom styles.

**Acceptance Criteria:**
- **Given** `KPICard`
- **When** usado com `variant="divisoria"`
- **Then** não tem borda, raio nem sombra, o rótulo é `font-mono` uppercase em `mute2` (contraste AA) e o valor é `text-[26px] font-semibold`; `KPIGrid` agrupa com `divide-x divide-line` (primeira coluna sem recuo) e a variante atual permanece até o fim da migração.
- **And** `SegmentedButton` usa `rounded-md` com ativo `bg-ink text-onink` e ganha variante `tabs` (`border-b-2`); `Badge` usa `rounded-sm` e tokens; `ModalDialog` usa `rounded-xl border-line bg-page shadow-2xl` com títulos em `font-serif`; `AlertBox` mantém a caixa e troca só cores por tokens.
- **And** novos componentes `SectionHeader` (filete de 2px, título serif, descrição e link de ação), `ExternalLinkPill` (`rounded-full border border-pill`, `ExternalLink` 12px, `target="_blank" rel="noopener noreferrer"`) e `StatRow`.
- **And** um helper de cores de gráfico via variáveis CSS fica disponível para `recharts`.
- **And** `modal-dialog.spec.tsx` e demais specs são atualizados.

**Dependências:** 20.1.

---

### Story 20.4: Baseline Visual e Home no Padrão Divisórias

As a citizen opening the municipal home,  
I want the first page to be clean, readable and consistent,  
So that I find the essential information without visual noise.

**Escopo:** `municipal-landing-client.tsx`, `view-model.tsx` e as seções da Home (Em destaque, Radar Cívico, Execução Orçamentária, Restos a Pagar, Licitações, Pessoal).

**Acceptance Criteria:**
- **Given** a Home antes de qualquer alteração
- **When** esta story começa
- **Then** existem capturas de tela de referência (claro e escuro, desktop e mobile) versionadas como baseline dos testes visuais.
- **And** cada seção abre com `SectionHeader`, blocos de dados usam colunas com filete (`sm:` em diante, empilhadas no mobile), o espaçamento entre seções é 104px no desktop e 64px no mobile e o fundo é branco.
- **And** os gráficos da Home usam cores por variável e continuam legíveis nos dois temas.
- **And** o cartão `rounded-2xl border shadow-sm` do resumo de Farmácia na Home vira seção com filete e usa `ExternalLinkPill`.
- **And** nada de dados, queries ou textos é alterado; sem município, UF ou ano fixos (Regra 23).
- **And** os ajustes herdados da revisão da Story 20.3 (abaixo) são resolvidos antes de a Home consumir os componentes.

**Ajustes herdados da revisão da Story 20.3** (componentes de `packages/ui`; sem alterar o visual já aprovado):
- `ModalDialog`: cabeçalho e rodapé distintos do corpo (hoje todos `bg-page`); botões de fechar e voltar com feedback de hover/ativo e anel de foco; teste do comportamento de bottom sheet no mobile (`max-sm:rounded-b-none`) e do botão voltar.
- `SectionHeader`: prop para o nível do título (`h1`/`h2`/`h3`, padrão `h2`); não renderizar `description`/`action` quando vazios ou `0`/string vazia; testes de props opcionais ausentes.
- `ExternalLinkPill`: texto `sr-only` "abre em nova aba"; validar que `href` usa `http`/`https`; teste de `className` e props extras.
- `KPICard` `divisoria`: precedência documentada entre `accent` e `alert`; tratar `subtext`/`trend` vazios ou `0`; permitir inverter a cor da tendência para métricas em que subir é ruim (ex.: despesa); extrair o rodapé compartilhado com a variante padrão.
- `chart-colors.ts`: trocar a lista de exclusão por lista de permissão de tokens; testar que todo token permitido resolve para `var(--...)` e que os aliases legados são rejeitados pelo tipo.
- `SegmentedButton` `tabs`: sem `role="tab"` não usar `aria-pressed` de forma ambígua; contraste do estado `muted` (`mute3`) validado com o teste de contraste da 20.1; hover visível; `focus-visible:ring-inset`; estilo de `disabled`; testes de `size`.
- Testes: preferir comportamento a nome de classe onde houver comportamento (foco, clique, ausência de rodapé); corrigir o título do teste do `Badge` para refletir o que ele verifica; teste de renderização claro/escuro para os tokens migrados; teste de que `index.ts` exporta os componentes novos.

**Dependências:** 20.1, 20.2 e 20.3.

---

### Story 20.5: Farmácia SUS no Padrão Divisórias (Página Piloto)

As a citizen searching for a medicine,  
I want the pharmacy page to follow the new divider look in both themes,  
So that the most useful tool of the portal is also the clearest.

**Escopo:** `apps/web/components/farmacia/` (`farmacia-busca-destaque`, `farmacia-indicadores`, `farmacia-resultados`, `farmacia-sentinelas`, `farmacia-acoes-civicas`, `farmacia-mapa`, `farmacia-fonte-dados`, `farmacia-sus-sentinela-banner`, `page.tsx`).

**Acceptance Criteria:**
- **Given** a página da Farmácia SUS
- **When** renderizada nos temas claro e escuro
- **Then** não há cartões `rounded-xl` com borda e sombra, inclusive no mapa; indicadores em colunas com `divide-x`, abas `border-b-2`, estado vazio com `border-y border-line`, "Mais procurados" como links de texto e botões `rounded-md`.
- **And** o mapa usa variáveis CSS nos marcadores e controles com `rounded-md`; a solução de tiles escuros (filtro CSS ou tiles escuros nativos) é decidida por spike curto com capturas de tela e documentada.
- **And** os textos pt-BR do padrão atual são preservados ("em estoque", "Pedir esclarecimento") e `fmtNumber` do `packages/ui` continua sendo usado.
- **And** specs `farmacia-*.spec.tsx` atualizados.

**Dependências:** 20.3.

---

### Story 20.6: `DenseTable`, Formato Mobile e Tela de Licitações

As a citizen reading tenders and expenses on a phone,  
I want tables that show the key facts without endless scrolling,  
So that I can understand what was bought, for how much and in what status.

**Acceptance Criteria:**
- **Given** o formato de tabela mobile em aberto (opções A, B e C do cabeçalho da epic)
- **When** a story começa
- **Then** três protótipos com licitações reais (incluindo contratos vigentes) em 375px são apresentados e o Julio escolhe um; a decisão fica registrada nesta story.
- **And** o contêiner de `DenseTable` perde `rounded-xl border shadow-xs`, usa filete de cabeçalho `border-b border-ink` e linhas `border-b border-line`, e ocupa a largura total no mobile (sem espaços laterais).
- **And** os cartões avulsos de licitações de maior valor, acima da tabela, também migram para o padrão divisórias.
- **And** a situação exibida em licitações é coerente: o rótulo "Homologado" nunca aparece junto de "Em disputa" (a correção é no dado, em `@transparencia/db`/dbt, não só no texto da UI; códigos em snake_case, Regra 10) e o cidadão não vê duas situações contraditórias no mesmo registro.
- **And** a busca flutuante "Buscar licitações e contratos" e a busca da tabela deixam de competir na mesma tela (uma só entrada de busca visível, sem cobrir o conteúdo); a busca global em si segue na Epic 22.
- **And** a tela de licitações (incluindo a seção de contratos vigentes, para onde as rotas de contratos já redirecionam) fica migrada; despesas segue na Story 20.11; os demais usos de `DenseTable` continuam funcionando com os aliases.
- **And** o comportamento é coberto por testes (uma suíte para o formato escolhido) e o tempo de permanência nas páginas de licitações no mobile é acompanhado no PostHog antes e depois.

**Notas da sala (contabilidade, linguagem cidadã e jurídico):**
- Contabilidade: "homologado" e "em disputa" são fases excludentes do processo. A coluna "Homologado" parece exibir o **valor homologado** com texto ao lado; antes de corrigir, conferir na origem se o campo está mal mapeado ou se um texto de fallback está sendo tratado como status.
- Linguagem cidadã: quando não há valor homologado, exibir "ainda não homologada" (texto claro), nunca um selo que pareça outro dado; o cidadão não deve achar que o portal errou.
- Jurídico: "não homologada" é um fato do processo, nunca indício de irregularidade; manter tom neutro.
- Insumo visual: captura da tela de licitações no mobile (cartões longos, cerca de 2 registros por rolagem). Desenho de referência da Sally: linha com número do processo e valor, objeto em até 2 linhas, situação e abertura, e detalhes (modalidade, PNCP, órgão só na visão consolidada, Detalhes e Sala de Disputa como `ExternalLinkPill`) ao tocar; meta de 4 a 5 registros por tela.

**Dependências:** 20.3.

---

### Story 20.7: Pessoal, Receitas e Orçamento

**Acceptance Criteria:**
- **Given** as páginas de pessoal, receitas e orçamento
- **When** migradas
- **Then** usam `KPICard variant="divisoria"`, `SectionHeader`, `AlertBox` e `Badge` com tokens, sem cartões com borda arredondada e sombra, nos dois temas.
- **And** gráficos usam o helper de cores por variável e tabelas seguem a decisão da Story 20.6.
- **And** specs atualizados e sem literais de tenant, UF ou ano (Regra 23).

**Dependências:** 20.3 e 20.6.

---

### Story 20.8: Saúde e Educação

**Acceptance Criteria:**
- **Given** as páginas de saúde e educação básica
- **When** migradas
- **Then** seguem o mesmo padrão da Story 20.7, incluindo o card de educação na seção "Em destaque" da Home.
- **And** specs atualizados e Regra 23 respeitada.

**Dependências:** 20.3 e 20.6.

---

### Story 20.9: Obras, Previdência, Radar, Gráficos Restantes e Mapa no Tema Escuro

**Acceptance Criteria:**
- **Given** as páginas restantes (obras, previdência, radar cívico)
- **When** migradas
- **Then** seguem o padrão divisórias nos dois temas.
- **And** todos os gráficos `recharts` restantes usam cores por variável.
- **And** o mini mapa estático de `obras-resumo-card.tsx` (hoje base ArcGIS Light Gray) acompanha o tema escuro, achado nas capturas da Story 20.12.
- **And** as entradas de obras, previdência e radar saem da lista de exceções do teste de arquitetura da Story 20.1 (a remoção dos aliases e o zeramento da lista ficam na Story 20.19).
- **And** cada página migrada (obras, previdência, radar) declara, antes de qualquer alteração visual, a **pergunta do cidadão** que responde (Regra 27), com a régua que a responde junto do número; bloco sem pergunta sai da página ou vai para o fim, atrás de "Ver detalhes". Valor derivado ou estimado diz que é derivado e como foi calculado.
- **And** cada página passa por três revisões, registradas no arquivo da story:
  - **Creuza** (`editor-cidadao`): linguagem cidadã, sem jargão, "indício" em vez de acusação, contexto junto dos números.
  - **Atanagildo** (`contador-publico`): métricas contabilmente corretas (estágios da despesa, RCL, regime próprio de previdência, obras).
  - **Jurídico** (`jurista-fiscal`): base legal verificada e citada com link; sem base verificada, registrar "NÃO VERIFICADO".
- **And** os achados das três revisões são corrigidos nesta story ou registrados em `deferred-work.md` com motivo.
- **And** a migração repete os padrões consolidados na 20.8 (abaixo).
- **And** `pnpm typecheck`, `pnpm test`, `biome` e a suíte de testes visuais passam.

**Padrões herdados da 20.8 (valem para obras, previdência e radar):**
- `KPIGrid` + `KPICard variant="divisoria"`, `SectionHeader`, `AlertBox`/`Badge`, filetes no lugar de cartões; elementos base nus (`h1`–`h4` sem classe de tamanho) e papéis (`eyebrow`, `caption`, `lead`).
- Só tokens semânticos (`*-fill` em barras e bordas, `*-text` em texto); sem `dark:`, hex, paleta fixa, sombra nem `rounded-*` em cartões; `font-mono` só em `table` e `numeric`.
- Barras com `*-fill` pleno e tons distintos por categoria (nunca `/15`); série de barra e linha em cores diferentes; legendas iguais às séries.
- Gráficos `recharts` com `corDoGrafico`; tooltips com `bg-page`; escala das barras pelo maior valor entre as séries (pago pode superar empenhado).
- Todo componente com guarda de "sem dados" (exercício zerado não vira "R$ 0"); sem ternário morto nem hover igual ao estado base.
- Regra 9 (sem `qtd`, `pct`; usar `quantidade_*`, `percentual_*`), Regra 23 (sem município, UF ou ano fixo; intervalo vindo dos pontos reais), links externos com `rel="noopener noreferrer"`, specs de componente para o que for criado (lição do DW-12).
- Aprendizado: na 20.8 o escopo cresceu além do spec. Mudança de dados ou de `@transparencia/db` fica explícita nesta story ou vira outra.

**Dependências:** 20.4 a 20.8. A remoção dos aliases foi separada na Story 20.19 (decisão do Julio, para limitar o tamanho desta story).

---

### Story 20.10: Acabamento do Shell: Notificações, Instalação do App e Rodapé

As a citizen using push notifications and the installable app,  
I want these controls to be accessible, give clear feedback and never show empty or misleading states,  
So that I can turn alerts on or off with confidence on any device.

**Origem:** itens adiados e rejeitados da revisão de código da Story 20.2 (`deferred-work.md`). Pode ser executada logo após a 20.2, sem depender das demais.

**Escopo:** `apps/web/components/push-notification-settings.tsx`, `pwa-installer.tsx`, `global-footer.tsx`, `packages/ui/src/components/sidebar.tsx` (só o drawer), `apps/web/hooks/use-push-notifications.ts` e o teste de contraste dos tokens (20.1).

**Acceptance Criteria:**
- **Given** notificações bloqueadas no navegador
- **When** o cidadão chega por teclado ou toque
- **Then** as instruções para desbloquear são acessíveis (botão ou disclosure operável por teclado e toque, não apenas `title` com hover), em texto claro e sem jargão.
- **And** ao ativar ou desativar, qualquer falha (inclusive `unsubscribe()` rejeitado) mostra mensagem de erro com `role="alert"` e nunca gera promessa rejeitada sem tratamento; os handlers de ativar e desativar compartilham uma única implementação.
- **And** enquanto o estado real ainda carrega, o componente não exibe "Notificações desativadas" nem "ativas" (mostra carregando ou nada), e leitores de tela não anunciam estado errado.
- **And** `PwaInstaller` e `PwaInstallButton` usam ícones Lucide de 16px no lugar de emojis (🚀, 📲, ✕), o nome do app vem de `env.NEXT_PUBLIC_PROJECT_NAME` (Regra 17) com a grafia correta, e não há `backdrop-blur` sobre fundo opaco nem borda dupla (`border` + `ring`).
- **And** a coluna "Neste dispositivo" do rodapé só aparece quando há conteúdo (push ou instalação disponíveis); sem conteúdo, o rodapé continua em duas colunas sem título solto.
- **And** o drawer móvel respeita `prefers-reduced-motion` (sem animação de deslize) e não anima ao cruzar o breakpoint `md`.
- **And** o teste de contraste da Story 20.1 cobre `mute2` sobre `page` em `text-xs` nos dois temas (4,5:1); se falhar, o token é escurecido e o valor documentado.
- **And** specs cobrem cada item acima; `pnpm typecheck`, `pnpm test` e `biome` passam.

**Decisões da sala (PM):**
- Incluído por baixo custo e ganho real: `prefers-reduced-motion`, tratamento de erro único, borda dupla e blur inútil.
- Fora de escopo, por decisão: guard de `portalSlug` em tempo de execução nos três consumidores. O tipo obrigatório e o único chamador já protegido bastam; um guard extra só entra se surgir um segundo chamador sem slug.
- Linguagem cidadã: mensagens de erro dizem o que fazer ("Não foi possível desativar. Tente novamente."), sem códigos técnicos.

**Dependências:** 20.2.

---

### Story 20.11: Despesas no Padrão Divisórias

As a citizen checking how the city spends its money,  
I want the expenses page to follow the divider look and stay readable in both themes,  
So that the third most visited page of the portal is as clear as the home.

**Origem:** decisão do Julio ao separar despesas da Story 20.6. A página `apps/web/app/[portalSlug]/despesas/` não usa `DenseTable` (7 `KPICard`, 2 `KPIGrid`, 2 `SectionHeader`, `TermometroOpacidadeFiscal`, `RadarGastosSensiveis` e `RestosAPagarVendorsChart`); por isso não depende da decisão do formato mobile de tabelas.

**Escopo:** `apps/web/app/[portalSlug]/despesas/page.tsx` e os componentes `termometro-opacidade-fiscal.tsx` (maior risco, cerca de 620 linhas), `radar-gastos-sensiveis.tsx` e `restos-a-pagar-vendors-chart.tsx`. O `opengraph-image.tsx` permanece no tema claro.

**Acceptance Criteria:**
- **Given** a página de despesas antes de qualquer alteração
- **When** esta story começa
- **Then** existem capturas de tela de referência (claro e escuro, desktop e mobile) como baseline.
- **And** os `KPICard` passam a `variant="divisoria"` em `KPIGrid` com filete vertical, cada seção abre com o `SectionHeader` do padrão divisórias e não há cartões `rounded-xl` com borda e sombra, nos dois temas.
- **And** os três componentes usam cores por variável (gráficos incluídos), legíveis nos dois temas e com contraste AA, sem `dark:` nem hex fixo (guarda da Story 20.1).
- **And** nenhum dado, query ou texto de `@transparencia/db` é alterado; o rótulo "gasto" segue sempre qualificado (empenhado, liquidado ou pago) como já está na página.
- **And** sem município, UF ou ano fixos (Regra 23); specs (`page.spec.tsx`, `view-model.spec.ts` e dos componentes) atualizados; `pnpm typecheck`, `pnpm test` e `biome` passam.

**Dependências:** 20.3. Ordem de execução sugerida: logo após a 20.4 (despesas é a terceira página mais visitada).

---

### Story 20.12: Cores Semânticas no Tema Claro: Preenchimento e Texto Separados

As a citizen reading the portal in the light theme,  
I want warning, success and danger colors that look like their meaning and stay readable,  
So that bars, badges and figures are distinguishable at a glance instead of all looking dark brown or dark green.

**Origem:** observação do Julio (2026-10-27) ao revisar o Radar de Gastos Sensíveis na Story 20.11. O `warn` claro (`oklch(0.5 0.11 70)`) foi calibrado para texto AA e fica marrom escuro quando usado em barras e preenchimentos (em produção, a mesma situação usava `amber-500`). Alguns tons de verde (`ok`) estão igualmente escuros no tema claro. Um único token por intenção serve mal a dois usos: texto precisa de contraste alto, preenchimento precisa de vivacidade.

**Já feito (Story 20.11):** `warn-fill` (âmbar vivo, barras e preenchimentos) e `warn-text` (âmbar escuro, texto) em `apps/web/app/globals.css` e `packages/ui/src/tokens.ts`, aplicados apenas em `radar-gastos-sensiveis.tsx` e `restos-a-pagar-vendors-chart.tsx`. Esta story generaliza o par para o restante do portal.

**Escopo:**
- Tokens: `globals.css` (`:root`, `.dark` e `@theme`), `packages/ui/src/tokens.ts` e `tokens.spec.ts`.
- Usos de `warn` ainda no tom antigo: `termometro-opacidade-fiscal.tsx`, `despesas/page.tsx`, `hero-fiscal-card.tsx`, `radar-civico-feed.tsx`, `licitacoes-table.tsx`, `licitacoes-em-andamento-section.tsx`, `licitacoes-spotlight-modal.tsx`, `contratos-servicos-vigentes-section.tsx`, `contrato-detalhes-modal.tsx`, `educacao-resumo-card.tsx`, `destaque-linha.tsx`, `push-notification-settings.tsx`, `farmacia/farmacia-sentinelas.tsx`, `view-model.tsx` e, em `packages/ui`, `alert-box.tsx`, `badge.tsx` e `indicadores-linha.tsx`.
- Auditoria de `ok`, `danger` e `brand` com o mesmo critério (texto versus preenchimento).

**Acceptance Criteria:**
- **Given** os tokens `warn`, `ok`, `danger` e `brand` no tema claro
- **When** a auditoria é feita com ferramenta de contraste
- **Then** existe uma tabela documentada nesta story com, para cada token, o valor atual, o contraste sobre `page` e sobre `track`/`line2`, e o veredito por uso (texto ou preenchimento).
- **And** cada cor semântica com problema ganha o par `*-fill` (barras, legendas, ícones, preenchimento de selo) e `*-text` (números, rótulos, bordas de selo), nos dois temas, sem remover os tokens existentes; a decisão sobre `warn`/`ok`/`danger` virarem alias do tom de texto fica registrada.
- **And** os usos listados no escopo migram: elementos gráficos para `*-fill` e texto para `*-text`, sem `dark:`, hex nem paleta fixa do Tailwind (guarda da Story 20.1; a lista de exceções só encolhe).
- **And** `tokens.spec.ts` cobre os novos tokens nos dois temas e há teste de contraste: `*-text` sobre `page` e `banbg` com no mínimo 4,5:1; `*-fill` sobre `track` e `line2` com no mínimo 3:1.
- **And** existem capturas de tela antes e depois (claro e escuro, desktop e mobile) de despesas, licitações e home, o que fecha o pendente de baseline visual da Story 20.11.
- **And** nenhum dado, query ou texto é alterado; `pnpm typecheck`, `pnpm test` e `biome` passam.

**Decisões em aberto:** (1) âmbar e verde de referência: usar os tons de produção (`amber-500`, `emerald-500`) como alvo de `*-fill`? (2) alertas e selos de `packages/ui` (`alert-box`, `badge`) entram nesta story ou numa seguinte, por afetarem o portal inteiro?

**Dependências:** 20.1 e 20.11. Pode rodar em paralelo às demais migrações, mas as stories 20.7 a 20.10 devem passar a usar o par `*-fill`/`*-text` assim que ele existir.

---

### Story 20.13: Despesas Detalhadas: Reorganização da Página com os Dados Existentes

As a citizen checking where the city's money went,  
I want the expenses page to answer "how much was reserved, delivered and paid, for which areas and to whom" in plain language,  
So that I understand the page without knowing public accounting terms.

**Origem:** decisão do Julio (2026-10-28) após o mockup `handoff-divisorias/Despesas Detalhadas - Divisorias.html`, revisado pela Creuza (linguagem cidadã) e pelo Jurandir (base jurídica). A Epic 20 exclui "novas funcionalidades"; esta story abre uma exceção limitada: ela só reorganiza a página e passa a exibir dados de duas queries que já existem em `@transparencia/db` e hoje não são chamadas pelo app (`getDespesasPorFuncaoMetrics` e `getTopFornecedoresExecucaoMetrics`). Nenhuma query, DTO ou mart é criado ou alterado.

**Referência visual:** `_bmad-output/planning-artifacts/handoff-divisorias/Despesas Detalhadas - Divisorias.html` (dados fictícios). Rolagem única, sem abas nem barra de âncoras.

**Escopo:** `apps/web/app/[portalSlug]/despesas/` (`page.tsx`, `loader.ts`, `view-model.ts` e specs) e componentes de `apps/web/components/` usados pela página (`radar-gastos-sensiveis.tsx`, `restos-a-pagar-vendors-chart.tsx`, novos componentes de áreas e de fornecedores). `llms.txt` e `llms-full.txt` (Regra 12). O `opengraph-image.tsx` permanece como está.

**Ordem final da página:** (1) resumo, sem título de seção; (2) para quais áreas o dinheiro foi; (3) quem mais recebeu; (4) gastos que merecem acompanhamento; (5) dívidas de anos anteriores.

**Acceptance Criteria:**
- **Given** a página de despesas antes de qualquer alteração
- **When** esta story começa
- **Then** existem capturas de tela de referência (claro e escuro, desktop e mobile); as capturas depois da mudança são coordenadas com a Story 20.12.
- **And** o resumo é o primeiro bloco, sem `SectionHeader`, com `KPIGrid` divisória sem filete horizontal abaixo nem filete de 2px acima, e os rótulos "Reservado (empenhado)", "Serviço entregue (liquidado)", "Dinheiro que saiu (pago)" e "Quanto já foi pago", cada um com uma frase de contexto.
- **And** o valor de "Quanto já foi pago" usa o mesmo cálculo da taxa de quitação atual, e a frase de apoio descreve esse cálculo como ele é, sem reinterpretá-lo.
- **And** três barras comparam cada etapa com o valor reservado, sem somar etapas, e um accordion "Como ler estes números: as três etapas não se somam" explica a regra pago ≤ entregue ≤ reservado "dentro do mesmo ano", sem usar as palavras "desvio" ou "calote".
- **And** "Para quais áreas o dinheiro foi" lista as áreas de `getDespesasPorFuncaoMetrics` em ordem decrescente, com seletor de etapa (`SegmentedButton`: Reservado, Serviço entregue, Dinheiro que saiu; padrão "Dinheiro que saiu"), valor, percentual da etapa selecionada e barra na cor `brand`.
- **And** cada linha de área abre (com seta que gira) e mostra as três etapas daquela área; não há detalhamento por subfunção, que pertence à epic seguinte.
- **And** "Quem mais recebeu" lista os fornecedores de `getTopFornecedoresExecucaoMetrics` com valor pago e percentual do total pago, com frase de contexto que diz que o valor mostra o que foi pago e não se o preço foi justo; a linha abre e mostra o documento do fornecedor exatamente como vem da fonte (CPF já mascarado na origem, sem nova máscara em TypeScript), e um teste garante que nenhum número de 11 dígitos sem máscara é renderizado.
- **And** "Gastos que merecem acompanhamento" mantém a tabela accordion, o menu de auditoria e o CSV atuais, com título novo, descrição "Contas que a população mais acompanha: quanto cada categoria pesa no total pago em {ano} e como o valor pago mudou em relação a {ano − 1}.", coluna "Ainda a pagar (acum.)", texto "Nada pendente" no lugar de "Sem dívida" e aumento de variação em `warn-text` no lugar de `danger`; as linhas mostram seta indicando que abrem.
- **And** o bloco de dívidas de anos anteriores mantém o accordion explicativo, com texto que diferencia restos a pagar já entregues e conferidos dos ainda em andamento, e os três indicadores atuais.
- **And** os textos da página seguem a revisão da Creuza e do Jurandir: nenhuma lei é citada sem link oficial (Regra 20), nenhum artigo é citado sem verificação, e o rótulo "gasto" aparece sempre qualificado.
- **And** o `TermometroOpacidadeFiscal` continua na página, sem alteração de conteúdo, logo depois do radar, porque o mockup não o previu; a decisão sobre mantê-lo ou movê-lo fica registrada nesta story.
- **And** nenhum dado, query, DTO ou texto de `@transparencia/db` é alterado; percentuais por etapa são divisões simples no `view-model`, e qualquer outra lógica contábil continua na camada de dados.
- **And** sem município, UF ou ano fixos (Regra 23), sem `dark:` nem hex fixo (guarda da Story 20.1), componentes canônicos do design system (Regra 24), propriedades em `camelCase` (Regra 18); `llms.txt` e `llms-full.txt` refletem as novas seções (Regra 12).
- **And** specs (`page.spec.tsx`, `view-model.spec.ts` e dos componentes novos) cobrem a ordem das seções, o seletor de etapa, a regra de que etapas não se somam e o caso de lista vazia (estado neutro, sem município); `pnpm typecheck`, `pnpm test` e `biome` passam.

**Fora do escopo (epic seguinte de despesas, a numerar):** mês a mês, tipo de despesa por grupo e elemento, forma de contratação (exige mapeamento em dbt), subfunção das áreas, listagem de empenhos por fornecedor ou contrato e qualquer tabela geral de empenhos.

**Dependências:** 20.3 e 20.11. Deve rodar antes da 20.12, que migra `despesas/page.tsx` para o par `*-fill` e `*-text`.

---

### Story 20.14: Elementos Base, Papéis Visuais e Plex Mono

As a developer building or migrating a portal page,  
I want the base HTML elements and a small set of named visual roles to carry the portal's look by default,  
So that headings, paragraphs, indicator lists, tables and panels are the same on every page and change in one place.

**Origem:** decisão do Julio (2026-10-29) antes de prosseguir com as stories 20.7 a 20.10. Contrato em `DESIGN.md` e `EXPERIENCE.md` na raiz do repositório (regra 25 do `CLAUDE.md`). O `panel` é a evolução do padrão de filetes desta epic: o padrão inicial é a borda lateral de 3px (um pouco mais marcada que o filete de 2px das seções, decisão do Julio), e o formato é trocável por variáveis CSS.

**Escopo:** `apps/web/app/globals.css` (`@layer base`, `@utility`, `@theme inline`, variáveis `--panel-*`), carga da fonte IBM Plex Mono com `next/font` em `apps/web/app/layout.tsx` e `--font-mono`, `packages/ui/src/tokens.ts` se houver espelho dos tokens. Sem alteração de páginas nesta story.

**Acceptance Criteria:**
- **Given** o `DESIGN.md` e o `EXPERIENCE.md`
- **When** a story termina
- **Then** `h1` a `h4`, `p`, `dl`/`dt`/`dd`, `table`/`th`/`td`, `ul`/`ol` e `a` nascem estilizados em `@layer base`, com a escala, as fontes e as cores do `DESIGN.md`, e sem margem própria.
- **And** os papéis `eyebrow`, `caption`, `lead`, `display`, `numeric`, `stat-value`, `stat-value-sm`, `stat-value-lg`, `panel` (com `panel-brand`, `panel-ok`, `panel-warn`, `panel-danger`), `section` e `list-text` existem como `@utility`, funcionam em qualquer tag e aceitam variantes do Tailwind e sobrescrita por classe.
- **And** o `panel` lê `--panel-border-width`, `--panel-radius`, `--panel-shadow` e `--panel-padding` de `:root` (padrão: borda lateral de 3px, sem raio, sem sombra); trocar essas variáveis muda todos os painéis sem tocar em componentes.
- **And** o IBM Plex Mono é carregado e exposto como `--font-mono`; `font-mono` só é usado em `table` e `numeric`.
- **And** `tokens-contraste.spec.ts` cobre as combinações da tabela de contraste do `DESIGN.md` nos dois temas, com 4,5:1 para texto e 3:1 para o `focus-ring`.
- **And** o `expandable-row` do `DESIGN.md` é comparado com o que o `DenseTable` entregou na Story 20.6; a diferença fica registrada nesta story e o ajuste é feito aqui só se for pequeno, senão vira decisão em aberto.
- **And** nenhuma página é alterada, nenhum dado ou texto muda; `pnpm typecheck`, `pnpm test` e `biome` passam.

**Decisões em aberto:** (1) ~~`stat-value-lg` em serifa: validar `tabular-nums` e o espaçamento de "R$"~~ — Resolvido na Story 20.16 (2026-10-30): conferido no Storybook, claro e escuro, desktop e mobile. `tabular-nums` iguala a largura dos algarismos e o espaço depois de "R$" (U+0020 ou U+00A0) fica idêntico; `stat-value-lg` permanece em serifa. (2) Nome da fonte mono caso o carregamento mude o tamanho do bundle de forma relevante.

**Dependências:** 20.1 e 20.12. Deve rodar **antes da 20.7**.

---

### Story 20.15: `packages/ui` Sem Dependência do Next

As a maintainer of the design system package,  
I want `packages/ui` to import nothing from Next.js,  
So that its components render in Storybook and in any consumer without mocks.

**Origem:** decisão do Julio (2026-10-29). Hoje só `packages/ui/src/components/sidebar.tsx` importa `next/image`, `next/link` e `next/navigation` (`usePathname`); o `next` está só em `devDependencies` do pacote.

**Escopo:** `packages/ui/src/components/sidebar.tsx` e specs, o wrapper em `apps/web` que injeta link e rota atual, `packages/ui/package.json`.

**Acceptance Criteria:**
- **Given** o `Sidebar`
- **When** a story termina
- **Then** ele recebe o componente de link por prop (padrão `<a>`), a rota atual por prop (`pathnameAtual`) e o logo como `<img>` simples ou slot, sem nenhum import de `next/*`.
- **And** `apps/web` fornece um wrapper fino que injeta `next/link` e `usePathname()`, e o comportamento visível do shell não muda.
- **And** um teste de arquitetura falha se qualquer arquivo de `packages/ui/src` importar `next` ou `next/*`.
- **And** `next` sai de `devDependencies` de `packages/ui` se nada mais o usar; `pnpm typecheck`, `pnpm test` e `biome` passam.

**Dependências:** 20.2. Pode rodar em paralelo à 20.14.

---

### Story 20.16: Storybook, Fase 1

As a maintainer reviewing the visual standard,  
I want a Storybook with the base elements and core components,  
So that I can compare headings, indicator panels and tables side by side in both themes and at mobile and desktop width.

**Origem:** decisão do Julio (2026-10-29). Storybook em `apps/storybook`; publicação futura em `storybook.maistransparencia.com` fica para outra story.

**Escopo:** novo pacote `apps/storybook` (`@storybook/react-vite` e `@tailwindcss/vite`, versões exatas conforme a seção 7 do `CLAUDE.md`), importando o `globals.css` de `apps/web`. Fase 1 cobre elementos base, papéis, `panel` (os três formatos), `indicator`, `table` e `expandable-row`.

**Acceptance Criteria:**
- **Given** o `apps/storybook`
- **When** `pnpm --filter storybook dev` roda
- **Then** as stories mostram os elementos base e a escala de títulos, os papéis, o `panel` nos três formatos e nos quatro tons, o `indicator` nos três tamanhos de valor, a `table` com `numeric` e totais, e o `expandable-row` aberto e fechado.
- **And** há alternador claro/escuro (classe `.dark`) e visões em largura mobile e desktop.
- **And** o primeiro caso de teste é o valor da despesa em `stat-value-lg`; o resultado do `tabular-nums` e do espaçamento de "R$" é registrado e fecha a decisão em aberto da Story 20.14.
- **And** o Storybook usa o mesmo `globals.css` do app (um teste ou verificação garante que ele não define estilos próprios para os elementos base).
- **And** nenhum componente de `apps/web` é alterado; o build do Storybook é local, sem deploy; `pnpm typecheck`, `pnpm test` e `biome` passam.

**Fora do escopo:** publicação, stories dos demais componentes de `packages/ui` (entram aos poucos, quando tocados) e teste visual automatizado.

**Dependências:** 20.14 e 20.15.

---

### Story 20.17: Guardas de Teste dos Padrões Base

As a reviewer of future pages,  
I want automated checks that fail when a page ignores the base standard,  
So that consistency does not decay with the next story.

**Origem:** decisão do Julio (2026-10-29). Mesmo estilo de `apps/web/styles/tokens-uso.spec.ts`.

**Escopo:** novos specs em `apps/web/styles/` e uma lista de isentos versionada.

**Acceptance Criteria:**
- **Given** o código de `apps/web` e `packages/ui/src`
- **When** os specs rodam
- **Then** falham: classes `slate-*`, `gray-*`, `text-black` e `text-white` em UI; classes de tamanho de fonte em `h1` a `h4`; `<h5>` e `<h6>`; `font-mono` fora de `table` e `numeric`.
- **And** os isentos ficam em duas listas explícitas: *temporária* (páginas e modais ainda não migrados), que só pode diminuir (um teste falha se uma entrada deixar de ser necessária ou se a lista crescer), e *permanente* (e-mails, imagens OG, cores de série de gráficos, mapa Leaflet).
- **And** a lista temporária nasce com todas as páginas que hoje violam as regras, e cada story de migração remove as suas entradas.
- **And** `pnpm typecheck`, `pnpm test` e `biome` passam.

**Dependências:** 20.14. Deve rodar antes da 20.7. Passa a rodar depois da 20.20 (ajustes dos destaques), para congelar o padrão já corrigido.

---

### Story 20.18: Varredura Final dos Padrões Base

As a citizen using any page of the portal,  
I want every page and modal to follow the same base standard,  
So that the portal reads as one product.

**Origem:** decisão do Julio (2026-10-29). Fecha a migração gradual dos padrões base.

**Escopo:** páginas e modais que as stories 20.7 a 20.10 e as epics seguintes não tocaram, inclusive os modais existentes (`LicitacoesSpotlightModal`, `ContratoDetalhesModal`, `ModalDialog`).

**Acceptance Criteria:**
- **Given** a lista de isentos temporários da Story 20.17
- **When** a story termina
- **Then** a lista está vazia; só a lista permanente permanece.
- **And** cada página migrada usa elementos base e papéis, sem classes de tamanho em títulos e sem cores fora dos tokens, com capturas de tela antes e depois (claro e escuro, desktop e mobile).
- **And** nenhum dado, query ou texto é alterado; `pnpm typecheck`, `pnpm test` e `biome` passam.

**Dependências:** 20.7 a 20.10, 20.17 e 20.19.

**Itens de ação para a retrospectiva da Epic 20:**
- **Decidir a Story TD.1 (Idioma dos Identificadores).** Ao rodar `bmad-retrospective` para a Epic 20, depois da 20.18: (1) refazer a medição descrita na TD.1 (declarações, parâmetros, props, tipos e nomes de arquivo com identificador de infraestrutura em português, regra 26); (2) se o resultado for zero ou quase zero, descartar a TD.1; (3) se ainda houver ocorrências relevantes, registrar a linha da TD.1 no `sprint-status.yaml` (ação do operador, o arquivo é do orquestrador) e executá-la em branch própria a partir de `dev`. Registrar a decisão na retrospectiva.

### Story 20.19: Remoção dos Aliases e Zeramento das Exceções do Tema

As a developer maintaining the portal,  
I want the legacy color aliases and the old KPI card gone and the theme exceptions list empty,  
So that every screen uses only the semantic tokens and the architecture test guards the whole codebase.

**Origem:** separada da Story 20.9 por decisão do Julio. Etapa mecânica, feita depois que as páginas foram migradas.

**Escopo:** `packages/ui` (`kpi-card.tsx` e seu spec), `apps/web` (usos dos aliases) e `apps/web/architecture/tema-excecoes.json`. Medição de 2026-10-31: `accent` em 25 arquivos, `borderLine` e `subtleText` em 16, `mutedText` em 14, `cardBg` em 6, `canvas` em 3, `text-attention` em 0; exceções: 36 de paleta fixa, 23 de raio antigo, 21 de hex literal.

**Acceptance Criteria:**
- **Given** as Stories 20.4 a 20.9 concluídas
- **When** a story termina
- **Then** os aliases (`accent`, `borderLine`, `canvas`, `subtleText`, `mutedText`, `cardBg`, `text-attention`) não existem mais no código nem nos tokens.
- **And** a variante antiga de `KPICard` é removida e nenhum chamador a usa.
- **And** a lista de exceções do teste de arquitetura da Story 20.1 chega a zero; o que for exceção legítima (e-mail, imagem OG, cor de série de gráfico) migra para a lista permanente com motivo.
- **And** nenhum dado, query ou texto é alterado; capturas de tela antes e depois das páginas mais afetadas (claro e escuro) não mostram regressão.
- **And** `pnpm typecheck`, `pnpm test`, `biome` e a suíte de testes visuais passam.

**Dependências:** 20.4 a 20.9.

---

### Story 20.20: Ajustes dos Destaques de Despesas, Licitações e Pessoal

As a citizen reading the portal,  
I want the headline number of each page to look and read the same way, and to see the period it covers,  
So that I compare pages without relearning the layout and never mistake a partial year for a full one.

**Origem:** decisão do Julio (2026-11-01), a partir de capturas de tela das três páginas. **Deve entrar antes da 20.17** e antes do fechamento da Epic 20 (a 20.17 congela o padrão em testes; a tela precisa estar certa antes).

**Escopo:** `apps/web/app/[portalSlug]/{despesas,licitacoes,pessoal}/page.tsx`, a camada `@transparencia/db` para os dois totais novos de `/licitacoes` e os specs das páginas. Nenhuma query existente muda de resultado.

**Acceptance Criteria:**

*`/despesas`*
- **Given** o destaque "Dinheiro que saiu (pago)"
- **When** a página renderiza
- **Then** usa o mesmo padrão de `/receitas`: `eyebrow` (sem `font-mono`), `stat-value-lg text-brand-text` e `caption`, sem classes de tamanho soltas (`text-5xl`, `font-bold`).
- **And** a frase de apoio ("Valor que já saiu do caixa… Isso é X% do que estava reservado…") ocupa a largura inteira do contêiner (remove `max-w-xl`/`max-w-3xl` do subtítulo e do bloco de apoio). O texto é mantido.

*`/licitacoes`*
- **Given** os cinco indicadores de contratação direta
- **When** a página renderiza
- **Then** ficam dentro de um `IndicatorPanel` (`panel`), e não mais numa linha solta.
- **And** os valores em destaque (`stat-value-lg`, no padrão de `/receitas`) são: **(1) quantidade de licitações em aberto** e **(2) total empenhado em contratos**. Cada um responde a uma pergunta do cidadão ("Quantas licitações estão abertas agora?" e "Quanto a prefeitura já reservou para pagar contratos em {ano}?") e diz o recorte na legenda (ex.: "contratos vigentes em {ano}").
- **And** os dois totais são calculados em `@transparencia/db` (regra 2), a partir dos dados que a página já carrega (`licitacoesEmAndamento` e `contratosServicosVigentes`); a página só formata. Se algum total vier de estimativa ou de recorte parcial, a legenda diz.
- **And** "Taxa de contratação direta" e os demais indicadores deixam de competir por destaque: viram `Indicator` comum dentro do painel.
- **Given** o alerta "Concentração de contratações diretas"
- **When** a página renderiza com anomalia
- **Then** o texto é reescrito em linguagem cidadã (skill `editor-cidadao`, validado por `jurista-fiscal`), em até duas frases, sem repetir o percentual que o indicador já mostra, no tom de **indício** e não de irregularidade. Proposta: *"Muitas compras sem disputa aberta. Em {ano}, a maior parte dos processos foi feita por dispensa, inexigibilidade ou adesão a ata de outro órgão. A lei permite em alguns casos, mas exige justificativa; é um ponto para acompanhar."*
- **And** o alerta usa `AlertBox` do tipo `info` (o tipo `warning` só entra quando há algo comprovado, conforme `DESIGN.md`), e não mais um `div` com `bg-warn-fill/10`.
- **And** as citações legais (Art. 74, 75 e 86 da Lei 14.133/2021) saem do alerta e vão para um "Ver detalhes" logo abaixo, mantendo os links atuais; a referência histórica (média de processos) vai para o mesmo "Ver detalhes". Versão filtrada por entidade segue a mesma regra.

*`/pessoal`*
- **Given** o destaque "Total pago em folha" com ano em andamento
- **When** `isCurrentYear` e há período parcial
- **Then** a legenda inclui o período, no mesmo padrão de `/receitas` (ex.: "proventos brutos no período (Jan–Out)"); sem período disponível, "até agora".
- **And** em ano fechado a legenda segue "proventos brutos, {ano}". O período vem do mesmo `partialPeriod` já usado nas outras páginas, nunca de texto fixo (regra 23).

*Geral*
- **And** nenhum dado de outra seção, query ou texto fora dos blocos acima é alterado; specs de `page.spec.tsx` das três páginas atualizados (os de `/licitacoes` que procuram "Concentração de contratações diretas." e "Taxa de Contratação Direta" acompanham o novo texto).
- **And** capturas de tela antes e depois das três páginas (claro e escuro, desktop e mobile), com ano fechado e ano parcial.
- **And** `pnpm typecheck`, `pnpm test` e `biome` passam.

**Decisões (Julio, 2026-11-01):** (1) "licitações em aberto" = licitações **ativas**: situação `aberta` ou `em_andamento`; o rótulo diz "ativas" para não induzir a erro; (2) "total empenhado em contratos" = só contratos **vigentes** do ano (`totalEmpenhado` de `contratosServicosVigentes`); (3) com filtro por entidade, os dois destaques refletem o filtro.

**Dependências:** 20.14 e 20.16. Precede a 20.17.

---

## Epic 21: Assistência Social, Programas de Transferência de Renda (CGU) e Impacto Econômico Municipal

Integrar os dados oficiais do Portal da Transparência da CGU (`portaldatransparencia.gov.br`) sobre programas federais de transferência de renda e benefícios ao cidadão (Bolsa Família, Benefício de Prestação Continuada - BPC/LOAS, Auxílio Gás e Seguro Defeso), mensurando o impacto financeiro real da injeção de renda federal na economia das famílias e do comércio local em comparação direta com a arrecadação tributária municipal.

---

### Story 21.1: Ingestão de Dados de Benefícios ao Cidadão da CGU e Staging dbt (`raw_nacional` e `stg_cgu__beneficios`)

As a data engineer,  
I want an automated extraction pipeline for federal citizen benefit transfers (Bolsa Família, BPC, Auxílio Gás) from the federal transparency portal,  
So that MaisTransparência tracks federal social injection across all integrated municipalities.

**Acceptance Criteria:**
- **Given** o extrator em `elt/src/extractors/beneficios_cgu.py`
- **When** o pipeline de extração é executado
- **Then** extrai os dados consolidados de transferências a pessoas físicas por município a partir dos dados abertos da CGU (`portaldatransparencia.gov.br`).
- **And** armazena os registros brutos em `raw_nacional.cgu_beneficios_municipios` com `cod_ibge`, `mes_competencia`, `ano`, `tipo_beneficio`, `quantidade_beneficiarios`, `valor_total_sacado`.
- **And** cria o modelo de staging `elt/transform/models/staging/nacional/stg_cgu__beneficios.sql` com colunas padronizadas em lowercase snake_case (Regras 9 e 10).
- **And** regera o fixture compactado de testes `packages/db/tests/fixtures/schema.sql.gz` executando `make db/fixture/dump` e valida paridade com `make test` (Regra 21).

---

### Story 21.2: Fato Analítica de Assistência Social e Comparativo com Arrecadação Local (`fct_beneficios_sociais_metricas`)

As an analytics engineer,  
I want a dedicated analytical fact table computing annual social benefit volumes and comparing them against local municipal tax revenues,  
So that citizens and researchers can understand the macroeconomic weight of social transfers in the local economy.

**Acceptance Criteria:**
- **Given** os modelos `stg_cgu__beneficios` e `fct_fontes_receita_metricas`
- **When** o modelo `elt/transform/models/marts/metrics/fct_beneficios_sociais_metricas.sql` é compilado
- **Then** materializa como tabela física (`materialized='table'`, Regra 2) com grão único por `portal_slug` e `ano`.
- **And** inclui obrigatoriamente a cláusula de join por tenant: `ON a.portal_slug = b.portal_slug` (Regra 23).
- **And** calcula as métricas consolidadas:
  - `total_bolsa_familia_ano`: montante total transferido via Bolsa Família no exercício.
  - `familias_beneficiarias_media`: média de famílias atendidas.
  - `total_bpc_ano`: montante transferido para idosos e PCDs em situação de vulnerabilidade.
  - `total_injecao_social_federal`: soma de todos os benefícios sociais federais sacados no município.
  - `arrecadacao_tributaria_propria`: total arrecadado com impostos locais (IPTU + ISS + ITBI).
  - `razao_beneficios_sobre_impostos_proprios`: `total_injecao_social_federal / nullif(arrecadacao_tributaria_propria, 0)`.
- **And** inclui testes genéricos do dbt (`not_null`, `unique`) e passa em `make test`.

---

### Story 21.3: Contratos Kysely `@transparencia/db` e Módulo Temático de Assistência Social (`/[portalSlug]/assistencia-social`)

As a citizen or social assistance researcher,  
I want a dedicated thematic page in `/[portalSlug]/assistencia-social` powered by strict Kysely queries,  
So that I can explore local social protection coverage and economic impact through clear charts and tables.

**Acceptance Criteria:**
- **Given** o leitor atômico em `packages/db/src/queries/assistencia-social.ts`
- **When** a rota `apps/web/app/[portalSlug]/assistencia-social/page.tsx` é acessada
- **Then** exibe painel completo de assistência social com DTOs tipados em camelCase (`totalBolsaFamilia`, `familiasBeneficiarias`, `totalBpc`, `razaoBeneficiosSobreImpostosProprios`).
- **And** renderiza gráfico histórico comparativo: *Injeção Federal de Benefícios vs. Arrecadação de Impostos Próprios do Município*.
- **And** detalha a composição dos programas (Bolsa Família, BPC Idoso, BPC Deficiência, Auxílio Gás).
- **And** inclui testes unitários no `@transparencia/db` (`make test/ts`).

---

### Story 21.4: Card de Injeção de Renda Social na Homepage Modular e Documentação Pública

As a citizen visiting the city homepage,  
I want a concise Social Income Injection Card integrated into the thematic section,  
So that I can immediately perceive the economic scale of federal social protection in my town.

**Acceptance Criteria:**
- **Given** o componente `BeneficiosSociaisResumoCard` em `apps/web/components/beneficios-sociais-resumo-card.tsx`
- **When** renderizado na seção temática da homepage
- **Then** exibe o montante anual transferido (`fmtCurrency`), o número de famílias atendidas e o multiplicador econômico em relação aos tributos municipais.
- **And** atualiza os arquivos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` documentando a rota `/assistencia-social` e seus indicadores (Regra 12).
- **And** todas as suítes de teste e verificações estáticas passam com sucesso (`pnpm build`, `tsc --noEmit`, `make test`).

---

## Epic 22: Busca Global por Categorias

Criar uma busca global do portal (barra no topo, atalho `/`) que encontra, por município, itens de várias categorias — Tudo, Remédios, Obras, Contratos, Licitações, Servidores e Despesas — com resultados agrupados por categoria (máximo de 3 por grupo, com "Ver todos os resultados" levando à página da categoria com a busca preenchida). Direção visual no canvas da Sally (artboards 1 e 4). Observação: o Epic 21 já existe (Assistência Social); a busca global entra como Epic 22.

---

### Story 22.1: Consulta Unificada de Busca por Categorias em `@transparencia/db`

As a citizen,  
I want one query that searches across categories for my city,  
So that I do not need to know which section holds the information.

**Acceptance Criteria:**
- **Given** um termo de busca e um `portalSlug`
- **When** a consulta unificada é executada
- **Then** retorna resultados agrupados por categoria (contagem total por categoria e até 3 itens por grupo), com DTOs `camelCase` e isolamento por `portal_slug` (Regra 23).

---

### Story 22.2: Barra de Busca Global com Abas por Categoria (Desktop e Mobile)

As a citizen,  
I want a global search bar with category tabs,  
So that I can narrow results quickly on any device.

**Acceptance Criteria:**
- **Given** a consulta da Story 22.1
- **When** o usuário digita na busca do topo
- **Then** vê abas por categoria com contagem, resultados agrupados e "Ver todos os resultados"; no mobile as abas rolam na horizontal; o item "Remédios" reaproveita a busca da Story 19.2.


---

## Epic 23: Confiança e Transparência do Portal (Frescor dos Dados, Reporte de Erro e Metodologia)

Dar ao cidadão, ao jornalista e ao vereador provas de que os números do portal são confiáveis: de onde vêm, quando foram atualizados, quando estão atrasados e como apontar um erro. Origem: pesquisa competitiva do politicometro.org (`research/competitive-politicometro-2026-10-24/research.md`, recomendações 1 a 3). O concorrente é complementar (amplo e centrado em pessoas); o nosso diferencial é a profundidade fiscal municipal, e esta epic reforça a confiança nela. Tudo que o site deles diz sobre a própria rotina é alegação não verificada; aqui adaptamos o padrão, não copiamos o conteúdo.

**Restrições:** Regra 23 (sem literais de tenant, UF ou ano; tudo por `portal_slug`), Regra 9 (nomes explícitos), Regra 10 (códigos em snake_case; a UI traduz), lógica só em `@transparencia/db` (UI burra), linguagem cidadã e tom não acusatório (`editor-cidadao`), texto jurídico revisado por `jurista-fiscal`.

**Fora do escopo (backlog):** página "Quem publica e quem não publica", "Direito de resposta", fila de WhatsApp com confirmação dupla (só com demanda; exige opt-in e custo Meta; LGPD e tarifas não verificadas), tema escuro e auditoria de contraste AA (absorvidos pela Epic 20), "Usar no seu assistente".

**Insumo recebido:** página "Sobre e metodologia" do concorrente (2026-11-12), usada para detalhar a Story 23.6. A página "Quem publica e quem não publica" ficou fora da epic por decisão do Julio (2026-11-12).

---

### Story 23.1: Registro de Coletas por Fonte e Frequência Esperada

As a maintainer,  
I want every source load to leave a record (source, portal, loaded-at, expected frequency),  
So that freshness can be computed instead of declared by hand.

**Acceptance Criteria:**
- **Given** o histórico de coletas já acumulado pela farmácia SUS (Epic 19) como modelo
- **When** uma carga de qualquer fonte termina
- **Then** é gravado um registro por `portal_slug` e `fonte` com `coletado_em` e `frequencia_esperada` (`diaria`, `semanal`, `mensal`, `anual`, `sob_demanda`), sem literais de tenant
- **And** a cobertura começa pelas fontes já com data de carga e as demais ficam registradas como "frescor não monitorado" (nunca presumidas atualizadas).

---

### Story 23.2: Query de Frescor com Estado "Fora do Prazo Previsto"

As a citizen,  
I want to know if a dataset is up to date,  
So that I do not trust a stale number.

**Origem:** pesquisa competitiva do politicometro.org (recomendação 1: selo de frescor). A Story 23.1 já entregou a base: o modelo `fct_coletas_por_fonte` (uma linha por `portal_slug` e `fonte`, com `frequencia_esperada`, `situacao_monitoramento`, `ultima_coleta_em`, `ultima_coleta_total_linhas`) e o catálogo `seed_fontes_coleta`. Falta transformar isso em resposta para o cidadão. Esta story é só dados: nenhuma tela (a tela é a 23.4).

**Decisões de produto (confirmadas pelo Julio em 2026-11-12):**
- **Tolerância por frequência fica no catálogo, não no código.** O `seed_fontes_coleta` ganha a coluna `tolerancia_dias`: `diaria` 4 dias (cobre fim de semana e feriado), `semanal` 10, `mensal` 40, `anual` 400. `sob_demanda` nunca vira `coleta_atrasada` (coluna vazia).
- **A situação mede a nossa coleta, não a publicação da fonte.** Uma fonte que parou de publicar continua `coleta_em_dia` enquanto a busca roda; por isso os códigos dizem "coleta" e o período mais recente publicado fica na Story 23.9 (decisão do Julio, 2026-11-12, a partir de nota de revisão).
- **A fonte cuja carga não grava registro continua `nao_monitorado`**, nunca presumida em dia (herdado da 23.1). As 7 fontes ainda `nao_monitorado` podem aparecer assim no selo da 23.4; a Story 23.8 vem depois do selo ("não monitorado" é honesto e não esconde nada).
- **`descricao_dados` é texto do catálogo**, em linguagem cidadã, revisado pelo `editor-cidadao`; códigos de `fonte` e `situacao` ficam em snake_case e a UI traduz (Regra 10). Rascunho para revisão (o dev ajusta só com aprovação):

  | fonte | descricao_dados |
  |---|---|
  | `fiorilli` | o que a Prefeitura arrecadou e gastou, contratos, licitações e diárias |
  | `farmacia_sus` | os remédios disponíveis na farmácia do SUS |
  | `pncp` | as compras e contratos publicados no portal nacional de contratações |
  | `obrasgov` | as obras feitas com dinheiro federal |
  | `siconfi_msc` | as contas da Prefeitura enviadas todo mês ao Tesouro Nacional |
  | `siconfi_rgf` | os limites da Lei de Responsabilidade Fiscal, como gasto com pessoal e dívida |
  | `siope` | quanto a Prefeitura aplica em educação |
  | `siops` | quanto a Prefeitura aplica em saúde |
  | `saude_rede` | a população usada nos indicadores de saúde |
  | `inep_censo` | escolas, turmas e alunos da rede municipal |
  | `inep_ideb` | a nota de qualidade do ensino (Ideb) |
  | `emendas_estaduais` | o dinheiro enviado ao município por emendas de deputados estaduais |
  | `receitas_csv` | o detalhe do dinheiro que entrou nos cofres da Prefeitura |

**Acceptance Criteria:**
- **Given** `fct_coletas_por_fonte` e o seed `seed_fontes_coleta` com a nova coluna `descricao_dados` e `tolerancia_dias` por fonte
- **When** `@transparencia/db` consulta o frescor de um `portalSlug` (nova query em `packages/db/src/queries/`, tipada com Kysely)
- **Then** retorna por fonte: `fonte`, `descricaoDados`, `frequenciaEsperada`, `ultimaColetaEm` e `situacao` (`coleta_em_dia`, `coleta_atrasada`, `nao_monitorado`), em `camelCase` e com nomes explícitos (Regra 9), ordenado de forma estável
- **And** `coleta_atrasada` ocorre quando `ultima_coleta_em` é mais antiga que `tolerancia_dias`, medido contra a data corrente passada como parâmetro (nunca `now()` escondido, para o teste ser determinístico); o cálculo existe só na camada de dados.
- **Given** fontes `sem_registro` e `nao_monitorado`
- **When** a query roda
- **Then** ambas saem como `nao_monitorado` com `ultimaColetaEm` nulo, e uma coleta com `ultima_coleta_total_linhas` zero continua `coleta_em_dia` (fonte respondeu sem registros não é falha).
- **Given** dois portais com fontes de mesmo nome e datas diferentes
- **When** a query roda para um deles
- **Then** só aparecem as fontes dele (isolamento por `portal_slug`, Regra 23), sem literais de município, UF ou ano.
- **And** há teste de paridade (banco local) cobrindo os três estados, a fronteira exata da tolerância (dia limite `coleta_em_dia`, dia seguinte `coleta_atrasada`) e `sob_demanda`; `make test/ts` e `pnpm typecheck` passam.

**Fora do escopo:** qualquer componente ou texto na tela (Story 23.4); registrar falha de carga (Story 23.3); mudar o que cada extrator coleta; confirmar com cada fonte a frequência real de publicação.

**Riscos:** a tolerância é uma estimativa; tolerância curta demais gera falso alarme ("coleta atrasada" sem motivo) e prejudica a confiança que a epic quer construir. Por isso fica no seed, ajustável sem deploy de código.

**Dependências:** Story 23.1 (concluída). Alinhamento de `frequencia_esperada` com a Story 23.8b. Mudança de seed roda só no banco local do Docker (Regra 15).

---

### Story 23.3: Carga Segura: Parar e Avisar em Vez de Gravar Dado Errado

As a maintainer,  
I want a load that fails validation to stop and flag the source,  
So that wrong data never overwrites good data.

**Origem:** pesquisa competitiva (recomendação 2). O concorrente alega rotina de "parar e avisar" sem prova; aqui a regra precisa ser verificável por teste. Padrão já existente a aproveitar: o tudo-ou-nada do SIOPE (Story 24.1) e do SIOPS (Story 25.2), e o registro de coletas da 23.1.

**Decisões de produto:**
- **Falha preserva o dado anterior e é visível.** Uma carga que falha não grava linhas novas e não apaga as antigas; o registro da tentativa guarda `resultado` (`sucesso`, `falha`) e `erro_codigo` (snake_case, ex.: `fonte_fora_do_ar`, `formato_mudou`, `resposta_vazia_suspeita`), sem texto de exceção cru.
- **Zero registros não é, por si só, falha** (a 23.1 já distingue coleta vazia). Só vira `resposta_vazia_suspeita` quando a fonte historicamente traz linhas e agora traz zero, regra por fonte no catálogo, sem número fixo no código.
- **Ausente na fonte é "—", nunca zero.** Vale para o que a story tocar; a auditoria de telas fica a cargo do `contador-publico`.

**Acceptance Criteria:**
- **Given** uma fonte que ficou fora do ar, mudou de formato ou devolveu resposta suspeita
- **When** a carga detecta a falha
- **Then** nenhuma linha da fonte é alterada nem apagada, o registro de coletas ganha uma tentativa com `resultado` `falha` e `erro_codigo`, e o loader termina com código de saída que o workflow enxerga (o job falha, a equipe é avisada pelo mecanismo de alerta do CI já existente)
- **And** `fct_coletas_por_fonte` passa a expor a última tentativa com falha (`ultima_falha_em`, `ultimo_erro_codigo`) sem sobrescrever `ultima_coleta_em`, que continua sendo a última coleta bem-sucedida.
- **Given** uma fonte cuja última tentativa falhou
- **When** a query da Story 23.2 consulta o frescor
- **Then** a fonte aparece como `coleta_atrasada` assim que a tolerância vence, com a data da última coleta boa preservada (a falha sozinha não troca a situação antes do prazo, para não alarmar por um tropeço de um dia).
- **Given** um campo ausente na fonte em um bloco já existente
- **When** a tela renderiza
- **Then** mostra "—" com a explicação do que significa, não `0` nem `R$ 0,00`, com teste em pelo menos um bloco real e lista dos demais blocos auditados registrada na story.
- **And** testes com fonte simulada fora do ar e com formato alterado provam que o dado anterior sobrevive intacto; sem literais de tenant (Regra 23).

**Fora do escopo:** reescrever extratores que já são tudo-ou-nada; retentativa automática com espera; painel de saúde das cargas para a equipe; notificação nova (usa o alerta do CI atual).

**Riscos:** a detecção de "formato mudou" depende de cada extrator expor um contrato de validação; extratores sem contrato ficam fora desta story e registrados como pendência por fonte, não presumidos seguros.

**Dependências:** Stories 23.1 (concluída) e 23.2. Execução só no banco local do Docker (Regra 15).

---

### Story 23.4: Selo "Fonte · verificado em" nos Blocos e Página "Como Atualizamos"

As a citizen,  
I want each block to show its source and update date, and a page listing all sources,  
So that I can judge how current and how reliable what I see is.

**Origem:** pesquisa competitiva (recomendação 1). O concorrente mostra o selo no rodapé de cada bloco e um link "Como atualizamos" no cabeçalho. Aqui adaptamos o padrão, sem copiar texto. Leia `DESIGN.md` e `EXPERIENCE.md` antes de criar os componentes (Regra 25).

**Pergunta do cidadão (Regra 27):** "Estes números estão atualizados? De onde vieram?"

**Decisões de produto:**
- **Selo discreto no rodapé do bloco**, uma linha: "Fonte: {descrição} · verificado em {data}". A data é a da nossa última coleta, não a do dado: o selo nunca diz "atualizado em" nem afirma que o número é recente até a Story 23.9 entregar o período mais recente publicado (decisão do Julio, 2026-11-12). Em `coleta_atrasada`, o selo ganha o aviso "Não conseguimos verificar esta fonte desde {data}"; em `nao_monitorado`, "Não acompanhamos a data de atualização desta fonte". Nunca finge frescor.
- **Página "Como atualizamos"** por município: tabela com fonte, o que traz, frequência, última verificação e situação. Fica no rodapé/menu e é linkada pelo selo; o texto da frequência é em linguagem comum ("todo dia útil", "toda semana", "todo mês").
- **Tom não acusatório:** "atrasada" descreve a coleta do portal, não a conduta da Prefeitura, salvo quando a fonte original for a que não publica (distinção a revisar com o `editor-cidadao`).

**Acceptance Criteria:**
- **Given** a query da Story 23.2
- **When** o usuário abre um bloco de dados de qualquer página do município
- **Then** o bloco mostra "Fonte: … · verificado em …", com a fonte vinda do DTO (um mapeamento bloco → `fonte` por página, definido na camada de dados ou no view-model, nunca em JSX solto) e a data formatada em `pt-BR`
- **And** em `coleta_atrasada` e `nao_monitorado` aparece o aviso correspondente, com ícone e texto (não só cor) e legível em leitor de tela.
- **Given** a página "Como atualizamos" do município
- **When** o usuário a abre
- **Then** vê a tabela de todas as fontes do portal (fonte, o que traz, frequência, última verificação, situação), com aviso claro no topo se qualquer fonte estiver `coleta_atrasada`, e a tabela é legível no celular sem rolagem horizontal da página
- **And** o cabeçalho ou rodapé do site leva à página, e o texto "Dados atualizados em" geral, se existir, deriva da mesma query (uma só fonte de verdade).
- **Given** um portal sem nenhuma fonte monitorada
- **When** a página abre
- **Then** o estado é neutro e genérico, sem município fixo (Regra 23).
- **And** os componentes apenas renderizam o DTO (UI burra), sem anos ou municípios fixos; textos revisados pelo `editor-cidadao`; specs de página, view-model e componente e o glossário (`docs/glossario-cidadao.md`) atualizados; `make test/ts` e `pnpm typecheck` passam.

**Fora do escopo:** reportar erro (23.5); página de metodologia (23.6); notificação por e-mail de dados novos; histórico de atualizações por fonte.

**Dependências:** Story 23.2 (query). A Story 23.9 acrescenta "dados até {período}" ao selo depois. A cobertura do selo cresce conforme as fontes ganham registro de coleta (Stories 23.1 e 23.8).

---

### Story 23.5: "Reportar Erro" por Indicador

As a citizen,  
I want to report an error on a specific indicator,  
So that wrong numbers are corrected quickly.

**Origem:** pesquisa competitiva (recomendação 3). No concorrente, todo crachá tem "Reportar erro" e as mensagens "são conferidas contra a fonte oficial". O rótulo visível na tela é "Sugestão ou erro", definido na Story 27.5; esta story entrega o mecanismo por indicador.

**Decisões de produto:**
- **Um botão por indicador**, não um formulário global: o cidadão aponta o número exato que estranhou.
- **O envio carrega contexto automaticamente**: `portal_slug`, identificador estável do indicador (snake_case), a página e o período exibidos, mais a descrição livre. O cidadão não precisa saber o nome do indicador.
- **Conferência é humana e contra a fonte**; o portal não promete prazo que não controla, e o texto de confirmação diz o que acontece depois, em linguagem comum.
- **Sem dado pessoal obrigatório.** E-mail é opcional, só para retorno; a política de uso fica na página da 23.6.

**Acceptance Criteria:**
- **Given** o `feedback-modal` existente
- **When** o usuário aciona "Sugestão ou erro" em um indicador
- **Then** o modal abre já ligado àquele indicador e o envio leva `portal_slug`, identificador do indicador e descrição, validados no servidor (indicador e portal existentes; descrição com tamanho mínimo e máximo)
- **And** o rótulo é explícito e visível em cada bloco, alcançável por teclado, com foco devolvido ao botão ao fechar.
- **Given** um envio válido
- **When** o servidor o recebe
- **Then** grava a mensagem com status `recebida` (snake_case), sem rastrear a pessoa, e responde com confirmação que diz o que acontece em seguida; há limite de taxa contra abuso, sem armazenar IP em claro.
- **Given** um envio inválido ou falha de gravação
- **When** o usuário envia
- **Then** vê mensagem de erro clara e o texto digitado é preservado.
- **And** o texto segue linguagem cidadã e tom não acusatório (`editor-cidadao`); sem literais de tenant (Regra 23); nome do indicador vem do catálogo de indicadores, não de JSX; testes cobrem validação, isolamento por portal e acessibilidade básica do modal.

**Fora do escopo:** painel interno para triagem das mensagens (a equipe usa o banco por enquanto); resposta automática ao cidadão; "Direito de resposta" (backlog); fila de WhatsApp.

**Riscos:** receber erro que o portal não consegue verificar (a fonte oficial está errada). A resposta padrão precisa distinguir "erro do portal" de "erro na fonte original".

**Dependências:** Story 27.5 (rótulo "Sugestão ou erro" por indicador; ver `epic-27-context.md`). Quando houver conflito de rótulo, vale o da 27.5.

---

### Story 23.6: Metodologia e Fontes e "Sobre"

As a citizen or public official,  
I want to know the methodology and sources of the portal,  
So that the portal is accountable for what it shows.

**Origem:** pesquisa competitiva. Referência analisada: a página "Sobre e metodologia" do Politicômetro (salva por Julio em 2026-11-12), que reúne na mesma página: o que é o site, neutralidade, método de contagem, fontes com o que cada uma traz, "O que cobrimos", "O que ainda não cobrimos", "Lacunas e divergências conhecidas", privacidade, tratamento de processos e sanções, correções e direito de resposta, e créditos. O que vale adaptar (não copiar texto): a honestidade sobre o que **não** cobrimos e sobre divergências entre fontes; a regra explícita "ausente aparece como 'ainda não disponível', nunca zero"; a promessa de ligar pessoas só por mais de um dado, nunca só pelo nome; "investigação não é condenação" como princípio. Ficam fora da epic, por decisão do Julio (2026-11-12): a página "Quem publica e quem não publica" e o "Direito de resposta" (ambos no backlog).

**Decisões de produto:**
- **Duas páginas em vez de uma:** "Sobre" (curta: o que é, para quem, neutralidade, quem mantém) e "Metodologia e fontes" (detalhada). Hoje as fontes só aparecem em termos e privacidade; as páginas novas passam a ser a referência e os termos apontam para elas.
- **Seções de "Metodologia e fontes"**, na ordem do cidadão: de onde vêm os números (tabela de fontes por município, gerada dos dados reais); como calculamos o que não é medido direto (valor derivado ou estimado diz que é, Regra 27); o que ainda não cobrimos; lacunas e divergências conhecidas; promessas negativas.
- **Promessas negativas explícitas**, cada uma verificável no código antes de entrar no texto: não inventamos dado (ausente é "—", Story 23.3); não juntamos registros só pelo nome; não expomos dados pessoais além do já público; não fazemos acusação (indício, nunca conclusão).
- **Correções:** a página explica como apontar um erro por "Sugestão ou erro" (Story 23.5) e o que acontece depois; não promete fluxo de resposta formal.
- **Jurídico:** qualquer lei citada na página (LAI, LGPD) passa pelo `jurista-fiscal` e leva link oficial (Regra 20); o que não for verificado fica marcado "NÃO VERIFICADO" no registro da story e sai do texto público.

**Acceptance Criteria:**
- **Given** o `jurista-fiscal` conferiu cada lei citada nas páginas, com link oficial
- **When** o usuário acessa "Sobre" e "Metodologia e fontes" de um município
- **Then** as fontes, o que cada uma traz e o que não cobrimos são gerados dos dados reais por `portal_slug` (catálogo de fontes da 23.1 e query da 23.2, sem lista escrita à mão na UI), sem município, UF ou ano fixo (Regra 23)
- **And** as lacunas e divergências conhecidas vêm de uma fonte de dados mantida na camada de dados (catálogo com `fonte`, texto cidadão e vigência), não de JSX.
- **Given** as promessas negativas da página
- **When** a story é concluída
- **Then** cada promessa tem referência ao ponto do código ou do teste que a sustenta (registrada na story); promessa sem sustentação sai do texto.
- **And** os termos e a política de privacidade passam a apontar para as novas páginas; a seção de correções aponta para "Sugestão ou erro"; textos revisados pelo `editor-cidadao`; glossário e specs atualizados; `make test/ts` e `pnpm typecheck` passam.

**Fora do escopo:** "Direito de resposta" e a página "Quem publica e quem não publica" (decisão do Julio em 2026-11-12); tratamento de processos e sanções de pessoas (não é escopo fiscal do portal); contas de usuário, e-mail e WhatsApp de atualização; classificação de temas por palavras-chave; atualização em produção sem autorização explícita (Regra 15).

**Riscos:** uma promessa negativa falsa é pior que nenhuma, por isso a exigência de sustentação no código; lei citada sem verificação cria compromisso público indevido.

**Dependências:** Stories 23.2 e 23.5; revisão do `jurista-fiscal` antes de publicar.

---

### Story 23.7: Origem das "Entradas Fora do Orçamento" em Receitas

As a citizen reading the revenue page,  
I want to see where the "entradas fora do orçamento" amount comes from,  
So that I understand it is money withheld and passed on to others, not municipal revenue.

**Origem:** decisão do Julio (2026-10-30), durante os ajustes visuais da Story 20.7, depois de perguntar de que origem financeira vem o valor exibido na linha "Entradas fora do orçamento" em `/receitas` (no exemplo de Porciúncula em 2026, R$ 13,7 mi, hoje só uma linha com texto explicativo). Opinião do John (PM): a story não pertence à Epic 20, porque exige regra de classificação nova na camada de dados; o tema (mostrar de onde vem um valor que o cidadão não entende) cabe aqui. Mockup da opção escolhida: https://claude.ai/artifact/2Dr16DYL6kcTjPqQxfMuit (opção 1, "De onde vem este valor").

**Acceptance Criteria:**
- **Given** os lançamentos extra-orçamentários já carregados por `portal_slug` e `ano` (`fct_receita_extra_orcamentaria`)
- **When** a camada de dados classifica cada lançamento
- **Then** cada lançamento recebe um código de categoria em lowercase snake_case, por exemplo `previdencia_servidores`, `emprestimo_consignado`, `imposto_renda_retido`, `previdencia_geral_inss`, `plano_saude_servidores`, `iss_retido`, `pensao_alimenticia` e `outros_descontos`, definido em dbt ou em `@transparencia/db` (nunca na UI) e sem literais de município, UF ou ano (Regras 10 e 23)
- **And** a regra de classificação é testada com as descrições reais de pelo menos dois portais diferentes e com um lançamento de descrição desconhecida, que cai em `outros_descontos`, nunca é descartado; a soma das categorias é igual ao total de `receitaExtraOrcamentariaArrecadado`
- **And** `@transparencia/db` expõe por `portalSlug` e `ano` o DTO em `camelCase` com `categoria`, `valorArrecadado` e `percentualDoTotal` (cálculo na camada de dados; nomes explícitos, Regra 9), com isolamento entre portais.
- **Given** o DTO acima
- **When** o cidadão abre `/receitas`
- **Then** a linha "Entradas fora do orçamento" ganha um bloco recolhido "De onde vem este valor", fechado por padrão, com uma linha por categoria (rótulo em linguagem cidadã traduzido na UI, valor, barra e percentual do total), na ordem decrescente de valor, alcançável por teclado e legível no celular sem rolagem horizontal
- **And** a UI só renderiza o DTO (UI burra) e nenhum nome de banco, plano de saúde ou beneficiário aparece na tela
- **And** o bloco não aparece quando não há entradas fora do orçamento, e o estado vazio é neutro, sem município.
- **Given** o texto da linha e do subtítulo
- **When** a story é concluída
- **Then** os textos são revisados pelo `editor-cidadao` e, antes de afirmar que o valor "não é dinheiro da prefeitura", o `contador-publico` confere se algum lançamento de `outros_descontos` (ou de outra categoria) é de fato receita da prefeitura; se houver, a frase é ajustada sem afirmação categórica
- **And** o glossário (`docs/glossario-cidadao.md`) recebe as entradas novas e os specs de página, de view-model e de componente são atualizados.

**Fora do escopo:** incluir as entradas fora do orçamento no total arrecadado (decisão de contabilidade, não de apresentação); listar lançamentos individuais ou nomes de beneficiários; mudar a carga ou a extração do relatório de origem.

**Dependências:** nenhuma de código; usa o tema Divisórias já entregue pela Epic 20. Mudanças em dbt rodam só no banco local do Docker; qualquer execução em produção exige autorização explícita do Julio (Regra 15).

---

### Story 23.8a: Extratores do SIOPE e do SIOPS no padrão de coleta em JSON

As a maintainer,  
I want the SIOPE and SIOPS extractors to write JSON runs like SICONFI and to be selectable in groups,  
So that a scheduled workflow can run them (Story 23.8b) without them writing straight to the database.

**Origem:** a Story 23.8 foi dividida em 23.8a, 23.8b e 23.8c em 2026-11-09 (decisão do Julio). Esta parte é a base técnica: sem ela o SIOPE e o SIOPS não entram em workflow agendado. conversa de 2026-11-01 durante a Story 24.1. O `ingestion-pipeline.yml` roda de segunda a sexta e chama `elt.extract.run` sem `--only`, então todas as fontes rodam todo dia útil (o SICONFI faz 12 chamadas mensais por portal a cada execução). O extrator do SIOPE (Story 24.1) ainda não está no pipeline. Cadências acordadas com o Julio: diária (Fiorilli e Farmácia SUS), semanal (PNCP e ObrasGov), mensal (SICONFI e SIOPE). Precedente de workflow com cadência própria: `check-inep-ideb-updates.yml` (mensal). Acrescentado em 2026-11-05 durante o refinamento da página de educação: a média nacional do IDEB virou o seed `seed_inep_ideb_brasil.csv` e precisa seguir a mesma cadência dos outros seeds do IDEB. Acrescentado em 2026-11-07 durante a Story 25.6a: a rede de saúde (`saude_rede`: CNES leitos, CNES profissionais e população residente) é fonte nova, com custo de extração alto (ver critério abaixo).

**Acceptance Criteria:**
- **Given** o SIOPE com extrator próprio (Story 24.1) que hoje grava direto no banco
- **When** a story é concluída
- **Then** o SIOPE grava JSON em `data/raw_runs/<portal>/<timestamp>/siope_indicadores/indicadores.json` e é registrado em `elt/extract/run.py` (chave `siope`) e em `elt/load/run.py`, como o SICONFI, mantendo o tudo-ou-nada da 24.1
- **And** `--only` em `elt.extract.run` aceita mais de uma chave, para um workflow chamar um grupo de fontes.
- **Given** o SIOPS com extrator próprio (Story 25.2, `elt/extract/siops.py`), que hoje grava direto no banco com tudo-ou-nada, duas vias (TABNET e consulta por ano) e erro explícito quando o 3.2 diverge entre elas
- **When** a story é concluída
- **Then** o SIOPS é tratado **da mesma forma que o SIOPE**: grava JSON em `data/raw_runs/<portal>/<timestamp>/siops_indicadores/indicadores.json`, é registrado em `elt/extract/run.py` e `elt/load/run.py` (chave `siops`), entra no grupo **mensal** e no registro de coletas da Story 23.1 com `frequencia_esperada` `mensal`
- **And** o primeiro run mensal mede timeout, limite de taxa e repetição a partir do CI (critério que a 25.2 deixou), e o resultado é registrado. **Esse run depende do workflow da Story 23.8b e de autorização do Julio (Regra 15): a 23.8a entrega o log e deixa a evidência PENDENTE, que fecha junto com a 23.8b.**

**Fora do escopo:** execução em produção sem autorização explícita; mudar o que cada extrator coleta; dbt seletivo por grupo (decisão: dbt completo); confirmar com cada fonte a frequência real de publicação além da estimativa acordada, que a Story 23.1 pode ajustar.

**Dependências:** Story 24.1 (extrator do SIOPE) e Story 25.2 (extrator do SIOPS). Qualquer execução em produção exige autorização explícita do Julio (Regra 15).

---

### Story 23.8b: Grupos de Cadência e Workflows Agendados por Fonte

As a maintainer,  
I want each source to run in a workflow with the cadence its data actually changes (daily, weekly, monthly),  
So that we stop re-fetching unchanged data every business day.

**Origem:** parte da antiga Story 23.8 (dividida em 2026-11-09). Cadências acordadas com o Julio: diária (portal da prefeitura, código `portal_municipal`, e Farmácia SUS), semanal (PNCP e ObrasGov), mensal (SICONFI, SIOPE e SIOPS). Hoje o `ingestion-pipeline.yml` roda de segunda a sexta e chama `elt.extract.run` sem `--only`, então todas as fontes rodam todo dia útil (o SICONFI faz 12 chamadas mensais por portal a cada execução). Precedente de workflow com cadência própria: `check-inep-ideb-updates.yml` (mensal). O código `portal_municipal` é único para o portal da prefeitura, qualquer que seja o sistema que o município usa (renomeado de `fiorilli` na Story 23.4); o grupo diário referencia esse código, e sistemas novos de portal não criam fonte nova.

**Acceptance Criteria:**
- **Given** os três grupos de cadência (diária, semanal, mensal)
- **When** cada workflow roda
- **Then** executa só as fontes do seu grupo, com cron próprio e `workflow_dispatch` com `portal`, `years` e `dry_run` como hoje, sem literais de tenant e com a lista de portais descoberta dinamicamente
- **And** após cada carga o dbt roda completo (`run` e `test`), como no pipeline atual
- **And** nenhuma fonte fica fora de todos os grupos nem em mais de um, e um teste confere isso.
- **Given** o registro de coletas da Story 23.1
- **When** a cadência é definida
- **Then** o valor de `frequencia_esperada` de cada fonte (`diaria`, `semanal`, `mensal`) vem da mesma definição que gera os workflows ou é conferido por teste contra ela, sem duas listas divergentes.
- **Given** o cron de cada grupo
- **When** a cadência é definida
- **Then** a `tolerancia_dias` de cada fonte do grupo cobre o intervalo entre execuções do cron mais uma folga, e um teste confere que nenhuma fonte fica "atrasada" só por seguir o próprio agendamento (por exemplo, fonte mensal com tolerância menor que o intervalo entre execuções).

**Fora do escopo:** execução em produção sem autorização explícita; mudar o que cada extrator coleta; dbt seletivo por grupo (decisão: dbt completo); confirmar com cada fonte a frequência real de publicação além da estimativa acordada, que a Story 23.1 pode ajustar.

**Dependências:** Story 23.8a (SIOPE e SIOPS em `raw_runs` e `--only` com várias chaves); alinhamento de valores com a Story 23.1. Qualquer execução em produção exige autorização explícita do Julio (Regra 15).

---

### Story 23.8c: Cadência dos Seeds do IDEB e das Fontes de Saúde

As a maintainer,  
I want the IDEB seeds and the health sources (CNES, SIA, SIH, population) on a schedule that fits their cost,  
So that the national IDEB average does not go stale and the health network does not get fixed to the API's cost in the pipeline.

**Origem:** parte da antiga Story 23.8 (dividida em 2026-11-09). Seeds do IDEB: acrescentado em 2026-11-05, durante o refinamento da página de educação (a média nacional virou o seed `seed_inep_ideb_brasil.csv` e precisa seguir a cadência dos outros seeds do IDEB). Saúde: acrescentado em 2026-11-07, durante a Story 25.6a (`saude_rede`: CNES leitos, CNES profissionais e população residente, com custo de extração alto).

**Acceptance Criteria:**
- **Given** o seed `seed_inep_ideb_brasil.csv` (média nacional do IDEB da rede pública, atualizada por `elt/scripts/sync_ibge_ideb_brasil.py`, API do IBGE, pesquisa 40) e que ele não se atualiza sozinho
- **When** a cadência é definida
- **Then** o seed entra na mesma cadência dos demais seeds do IDEB, isto é, no workflow `check-inep-ideb-updates.yml`, que passa a rodar também o `sync_ibge_ideb_brasil.py` junto do `sync_inep_ideb_seed.py`, na mesma verificação de novo ciclo bienal e no mesmo PR de atualização; a story confere se o `seed_inep_ideb_estados` também está coberto, já que hoje o workflow só chama o sync do seed municipal
- **And** o registro de coletas da Story 23.1 lista os seeds do IDEB (municipal, estados e Brasil) como fontes com `frequencia_esperada` `mensal`, e um teste confere que nenhum seed do IDEB fica fora do workflow
- **And** o deploy aplica `dbt seed` antes de publicar o código que lê a média nacional, porque `getEducacaoMediasNacionais` devolve vazio em silêncio se a tabela não existir e o marcador some da tela sem erro.
- **Given** as fontes de saúde da Epic 25: `saude_rede` (CNES leitos e profissionais e população residente, Story 25.6a) e `saude_producao` (SIA e SIH, Story 25.6b), hoje em `elt/extract/saude_rede.py` pela API de dados abertos, **fora da carga diária** (só rodam com `--only`), e a Story 25.6c, que troca CNES, SIA e SIH pelos arquivos mensais por estado do DATASUS (`elt/fontes/saude_datasus.yml`, uma entrada por UF)
- **When** a cadência é definida
- **Then** as fontes de saúde entram no grupo **mensal** (o CNES, o SIA e o SIH publicam uma competência por mês; a população residente, uma vez por ano) e no registro de coletas da Story 23.1 com `frequencia_esperada` `mensal`; o nome da fonte no grupo segue o da 25.6c quando ela for entregue
- **And** a carga é **incremental por competência**: as 4 últimas competências fechadas (defasagem medida em 2026-11-07: CNES até 2026-09 e SIA até 2026-08); anos fechados nunca são rebuscados pelo job. O backfill de 2021 em diante é manual, em partes, só no banco local; em produção só com autorização explícita do Julio (Regra 15)
- **And** o custo medido é o que decide o desenho do job: **pela API** (25.6a e 25.6b), 1 linha por página a ~0,5 s: profissionais de uma competência levam 4 a 5 min por portal (Natividade: 507 páginas, 263 s; Porciúncula: 695) e SIA ~300 páginas por mês (~4 min), logo a carga completa de 2021 a 2026 passa de 1 h por portal e cresce linearmente com o número de cidades (Brasil inteiro: ~16 dias de leitura contínua por ano de dados, inviável); **por arquivo em massa do DATASUS** (25.6c), o custo é por UF e não por cidade: SIA do mês do RJ ~271 MB baixados em ~1 min e ~2 a 3 min de leitura, CNES e SIH em segundos, e o disco temporário chega a ~3,4 GB (o job apaga os arquivos ao fim)
- **And** o primeiro run mensal mede o tempo do job por UF no runner (ubuntu-latest), incluindo o acesso ao FTP, e registra o resultado; o resultado do teste de contrato da 25.6a (API) e o da 25.6c (FTP) são a linha de base. Se o total não couber no limite do job, divide-se por UF em matriz
- **And** os dois grupos só entram no workflow mensal depois da 25.6c, para não fixar na pipeline o custo da API; até lá continuam manuais (`make elt/saude-rede` e `make elt/saude-producao`) e um teste confere que nenhuma fonte de saúde roda na carga diária por omissão.

**Fora do escopo:** execução em produção sem autorização explícita; mudar o que cada extrator coleta; dbt seletivo por grupo (decisão: dbt completo); confirmar com cada fonte a frequência real de publicação além da estimativa acordada, que a Story 23.1 pode ajustar.

**Dependências:** Story 23.8b (grupos e workflow mensal) e Story 23.1 (registro de coletas); Stories 25.6a, 25.6b e 25.6c (fontes de saúde; a 25.6c entrega a cadência por UF). Os critérios de saúde só entram no workflow mensal depois da 25.6c. Qualquer execução em produção exige autorização explícita do Julio (Regra 15).


---

### Story 23.9: Período Mais Recente Publicado por Fonte ("Dados até")

As a citizen,  
I want to know until which period the data of each source goes,  
So that a source that stopped publishing does not look current just because the portal keeps checking it.

**Origem:** revisão da spec da Story 23.2 (2026-11-12). A situação da 23.2 mede quando o portal buscou a fonte, não quando a fonte publicou dado novo: se o Tesouro parar de publicar, a busca continua e a coleta sai "em dia". Decisão do Julio: separar as duas perguntas; esta story responde "o número é recente?".

**Pergunta do cidadão (Regra 27):** "Até quando vão estes números?"

**Decisões de produto:**
- **Por fonte, o período mais recente que existe no mart** (ex.: mês para a MSC, quadrimestre para o RGF, data da posição de estoque para a farmácia), devolvido junto do DTO da 23.2 como `periodoMaisRecente` e `granularidadePeriodo`.
- **Começa pelas fontes em que o período é direto:** `siconfi_msc`, `siconfi_rgf` e `farmacia_sus` (precedente: o "apagão" da farmácia já usa a data da posição). As demais ficam sem período ("ainda não disponível"), nunca presumidas.
- **Defasagem esperada de publicação** (quanto tempo a fonte costuma levar para publicar) fica no catálogo `seed_fontes_coleta`, nunca no código; valores marcados "NÃO VERIFICADO" até confirmação com a fonte.

**Acceptance Criteria:**
- **Given** um portal com dados de MSC, RGF e farmácia
- **When** `@transparencia/db` consulta o frescor do portal
- **Then** cada uma dessas fontes traz o período mais recente do próprio mart, isolado por `portal_slug`, sem literais de tenant, UF ou ano
- **And** quando o período é mais antigo que a defasagem esperada, medida contra a data de referência passada como parâmetro, a situação do dado é `dado_defasado`; senão, `dado_recente`; sem período, `periodo_nao_disponivel`.
- **And** há teste de paridade cobrindo os três estados e a fronteira da defasagem; `make test/ts` e `pnpm typecheck` passam.

**Fora do escopo:** tela (o selo da 23.4 ganha "dados até {período}" numa mudança pequena depois desta); fontes fora das três iniciais; confirmar prazos com cada fonte.

**Riscos:** prazos de publicação não verificados geram falso alarme; por isso ficam no seed, marcados como estimativa, e a UI diz que é estimativa (Regra 27).

**Dependências:** Story 23.2. Story 23.4 para exibir.

---

## Epic 24: Educação: Aprendizado e Financiamento (Dados do SIOPE e do INEP)

A página de educação passa a abrir pelo aprendizado ("as crianças estão aprendendo?", Story 24.7), com o financiamento logo abaixo. Responder ao cidadão duas perguntas que hoje ficam sem resposta: "quanto a Prefeitura investe por aluno?" e "a Prefeitura aplica o mínimo exigido em educação?". A fonte é o SIOPE (FNDE), o sistema que o município declara e que o contador da educação de Porciúncula indicou e conferiu. Origem: spike `planning-artifacts/spike-siope-valor-por-aluno.md` (2026-10-31). A estimativa anterior de "pago por aluno" foi retirada da Epic 20 (Story 20.8) porque o seed de matrículas não tinha fonte rastreável e divergia do SIOPE em 3% a 42%.

**Fonte e acesso:** a consulta de planilhas do SIOPE exige reCAPTCHA e não será automatizada nem contornada. O caminho é a API JSON do Relatório Gerencial do FNDE (`/siope/relatorioGerencialIndicador.do`), aberta e sem captcha, mas interna e não documentada: precisa de teste de contrato e de falha graciosa. Indicadores de interesse: 4.9 (investimento por aluno), 4.8 (educação básica), 4.1 (infantil), 4.2 (fundamental), 1.1 (aplicação em MDE, mínimo de 25%) e 1.2 (magistério).

**Restrições:** Regra 23 (sem literais de tenant, UF ou ano; o código SIOPE de 6 dígitos vem de `cod_ibge`), Regra 14 (conta no dbt, não no TypeScript), Regra 15 (execução só no banco local do Docker), Regra 20 (toda lei citada com link oficial), Regra 27 (pergunta do cidadão antes do dado; dado declarado diz que é declarado), `contador-publico` para conferir cada indicador e `jurista-fiscal` para as leis; `editor-cidadao` para os textos.

**Fora do escopo:** automatizar o formulário com captcha; reproduzir no portal as planilhas de receita e despesa do SIOPE; comparação entre municípios ou ranking de valor por aluno (o ranking estadual do IDEB, já existente, não entra nessa exclusão).

**Riscos:** a API pode mudar sem aviso; o SIOPE é declaratório e homologado pelo FNDE, não é auditoria independente; o rótulo do indicador 1.2 do SIOPE cita "mínimo de 60%" para o magistério, mas o art. 26 da Lei 14.113/2020 (verificado no texto do Planalto em 2026-10-31) fixa **70%** para a remuneração dos profissionais da educação em efetivo exercício, e a lei não menciona 60%. O indicador do SIOPE pode estar com o rótulo da regra antiga (Lei 11.494/2007): só exibir depois de o `contador-publico` conferir a fórmula.

---

### Story 24.1: Ingestão do Relatório Gerencial do SIOPE

As a maintainer,  
I want the SIOPE indicators loaded from the FNDE Relatório Gerencial API into the raw layer,  
So that the education page can use the same numbers the municipal accountant reports.

**Acceptance Criteria:**
- **Given** os portais com `cod_ibge` cadastrado e a lista de indicadores de interesse (4.1, 4.2, 4.8, 4.9, 1.1, 1.2)
- **When** a carga roda para um portal e uma faixa de anos
- **Then** grava em tabela raw um registro por `portal_slug`, `ano`, `periodo` e `codigo_indicador` com o valor, o código SIOPE do município derivado do IBGE e `coletado_em`, sem literais de tenant
- **And** a carga pede um município por requisição (em lote, a API devolve a média dos municípios com `codEnte` zerado, verificado em 2026-11-01) e valida o formato da resposta antes de gravar
- **And** resposta em HTML (erro 99), formato inesperado ou indicador ausente não grava nada e termina com aviso claro, nunca com dado parcial presumido correto
- **And** o `User-Agent` e o `Referer` seguem o padrão da API, há limite de taxa e nenhuma tentativa de contornar o captcha.

**Fora do escopo:** execução em produção sem autorização explícita; planilhas de receita e despesa do SIOPE.

**Dependências:** nenhuma. Pode registrar a coleta conforme a Story 23.1 quando ela existir.

---

### Story 24.2: Staging e Mart de Indicadores do SIOPE no dbt

As a data analyst,  
I want the SIOPE indicators modeled by portal and year,  
So that every figure on the page comes from one tested model.

**Acceptance Criteria:**
- **Given** a tabela raw da Story 24.1
- **When** o dbt roda
- **Then** existe `fct_educacao_siope_metricas` com grão `portal_slug` e `ano`, colunas explícitas (`investimento_por_aluno_basica`, `investimento_por_aluno`, `percentual_aplicado_mde` etc., Regra 9) e contrato imposto
- **And** valor ausente fica nulo e nunca zero, e o ano em andamento é identificável como parcial
- **And** há testes de unicidade, de isolamento entre portais e de intervalo plausível, mais teste de integração em `make test`
- **And** os valores de Porciúncula para 2024 (R$ 16.789,15) e 2025 (R$ 16.767,14), conferidos pelo contador, entram como caso de referência.

**Dependências:** Story 24.1.

---

### Story 24.3: Contratos de Dados do SIOPE em `@transparencia/db`

As a frontend developer,  
I want typed `camelCase` queries for the SIOPE indicators,  
So that the pages only render what the data layer delivers.

**Acceptance Criteria:**
- **Given** o mart da Story 24.2
- **When** a página pede o SIOPE de um `portalSlug` e um ano
- **Then** a query devolve DTOs `camelCase` com o valor, o ano, o período e a situação (`encerrado`, `parcial`), e uma série anual para histórico
- **And** não há cálculo contábil no TypeScript, e há teste de paridade e de isolamento entre portais.

**Dependências:** Story 24.2.

---

### Story 24.4: Valor por Aluno na Página de Educação

As a citizen,  
I want to know how much the Prefeitura invests per student,  
So that I can compare it with last year and with what the school needs.

**Acceptance Criteria:**
- **Given** a Story 24.3 e a pergunta "Quanto a Prefeitura investe por aluno da rede municipal?"
- **When** o ano selecionado está encerrado e há valor no SIOPE
- **Then** o painel de indicadores mostra o investimento por aluno, com a nota de que o valor é declarado pela Prefeitura ao FNDE, e junto do número a série anual do próprio município como régua (valores da época, sem correção pela inflação, com a nota de que anos diferentes não são comparáveis em poder de compra); "Ver detalhes" abre o histórico completo
- **And** no ano em andamento mostra o valor acumulado até o último bimestre (Story 24.10) com a palavra "parcial", e nunca o compara com um ano fechado; sem valor, mostra "—" com a causa
- **And** sem média estadual, ranking, comparação entre municípios nem referência nacional como "acima ou abaixo do mínimo" (decisão de 2026-11-01, parecer do `contador-publico` e do `jurista-fiscal`: o VAAF-MIN da Lei 14.113/2020, arts. 12 e 13, não é meta nem piso de gasto do município e não é comparável ao indicador 4.9, que cobre a rede toda)
- **And** o texto passa pelo `editor-cidadao`, o cálculo é conferido pelo `contador-publico` (o que o indicador 4.9 inclui e exclui ainda é NÃO VERIFICADO e deve ser confirmado na metodologia do SIOPE), e `llms.txt`, `llms-full.txt`, CHANGELOG e specs de página, view-model e componente são atualizados.

**Dependências:** Story 24.3. Posição (decisão de 2026-11-01): o painel compõe a faixa de três respostas no topo da página, montada na Story 24.11; esta story entrega o painel e o dado.

---

### Story 24.5: Mínimos Constitucionais de Educação (MDE e FUNDEB)

As a citizen,  
I want to know whether the Prefeitura applies the legal minimum in education,  
So that I can tell if the rule is being met.

**Acceptance Criteria:**
- **Given** os indicadores 1.1 (aplicação em MDE) e 1.2 (magistério) do SIOPE e a pergunta "A Prefeitura aplica o mínimo exigido em educação?"
- **When** o ano selecionado está encerrado
- **Then** a página mostra o percentual aplicado ao lado do mínimo legal, com o texto "cumpriu" ou "ficou abaixo" junto do ícone (nunca só a cor) e a lei citada com link oficial (Regra 20)
- **And** o limite legal vem de `seed_constantes_fiscais.csv`, não de literal no código, e o `jurista-fiscal` confirma o dispositivo aplicável (Art. 212 e Art. 212-A da CF/88) e confirma que o piso do FUNDEB é de 70% (art. 26 da Lei 14.113/2020, https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l14113.htm) e não os 60% do rótulo antigo do SIOPE, antes de publicar
- **And** abaixo do mínimo, o tom é factual e não acusatório ("indício", nunca "irregularidade")
- **And** o `contador-publico` valida a base de cálculo, o ano em andamento é marcado como parcial e `llms.txt`, `llms-full.txt` e CHANGELOG são atualizados.

**Dependências:** Story 24.3. Posição (decisão de 2026-11-01): o bloco compõe a faixa de três respostas no topo da página, montada na Story 24.11; esta story entrega o bloco e o dado. O indicador 1.2 só é exibido depois de o `contador-publico` conferir a fórmula; o piso usado é sempre o 70% do seed, nunca o rótulo do SIOPE. Substitui as pendências "mínimo de 25%" e "piso do FUNDEB" do inventário de educação.

---

### Story 24.6: Total de Alunos com Fonte Verificada (INEP)

As a citizen,  
I want to see how many students the municipal network serves, from an official source,  
So that the per-student value has a visible denominator.

**Acceptance Criteria:**
- **Given** a Sinopse Estatística da Educação Básica do INEP como fonte candidata
- **When** o spike da story confirma um arquivo oficial por município e ano, com URL estável e leiaute conhecido
- **Then** um extrator versionado grava as matrículas da rede municipal por `cod_ibge` e ano, o mart expõe o total e o ano do Censo, e a página mostra "Alunos na rede municipal" com o ano real do Censo
- **And** se o spike não confirmar fonte automatizável, a story termina registrando a decisão e o indicador continua fora da página, sem seed manual
- **And** nenhum valor é digitado à mão no repositório, e os números de uma amostra são conferidos contra o INEP.

**Dependências:** nenhuma de código; pode rodar em paralelo à Story 24.1. Condicionada ao resultado do spike.

---

### Story 24.7: Aprendizado no Topo da Página de Educação

As a citizen,  
I want to see first whether the municipal students are learning, and whether that is improving,  
So that the money figures that follow are read against the result they should produce.

**Acceptance Criteria:**
- **Given** a pergunta "As crianças da rede municipal estão aprendendo?" e a seção "Aprendizado dos alunos" (`EducacaoAprendizadoSection`) já existente
- **When** o cidadão abre `/[portalSlug]/educacao`
- **Then** a seção "Aprendizado dos alunos" é o primeiro bloco da página, antes de qualquer seção financeira, e o hero financeiro atual (com "Emendas na educação") e as demais seções descem sem perder conteúdo; seções para especialistas continuam no fim (Regra 27)
- **And** em cada etapa (anos iniciais e anos finais) "Nota do IDEB" e "Ciclo anterior" viram um indicador só: a nota atual com o ano de apuração, e junto a nota do ciclo anterior com o ano e a variação em pontos (ex.: "ciclo anterior 4,5 em 2023, +1,4 ponto"), com sinal e palavra ("subiu" ou "caiu") além da cor
- **And** em "Classificação entre as redes municipais do estado" aparece, junto da posição e do total de redes, quantas posições subiu ou caiu em relação ao ciclo anterior, calculado pela camada de dados com a mesma regra de ordenação do ciclo atual; se o total de redes do ciclo anterior for diferente, o texto diz isso em vez de comparar posições como se fossem equivalentes
- **And** o IDEB é bienal: o texto fala em "ciclo anterior" e nunca em "ano anterior"
- **And** a variação de posição vem de `@transparencia/db` (Regra 14) a partir do `cod_ibge`, sem UF, "Média RJ" nem ano fixo em títulos (Regra 23); sem dado do ciclo anterior o indicador mostra "—" com a causa, sem esconder a etapa
- **And** "Meta" continua visível, com a causa quando o MEC não definiu meta
- **And** a citação "Nota Informativa do Ideb 2025" em `educacao-historico-section.tsx` deixa de depender de ano fixo no texto, ou o `editor-cidadao` e o `jurista-fiscal` registram por que ela fica
- **And** o texto passa pelo `editor-cidadao`, o padrão visual segue `DESIGN.md` e `EXPERIENCE.md` nos temas claro e escuro, e specs de query, view-model, página e componente, `llms.txt`, `llms-full.txt` e CHANGELOG são atualizados.

**Fora do escopo:** matrículas (Story 24.6), valor por aluno (24.4) e mínimos legais (24.5). Os dois últimos entram logo abaixo desta seção quando ficarem prontos; até lá a página não reserva espaço vazio.

**Contexto levantado em 2026-11-01 (leitura sem edição):**
- Ordem atual de `apps/web/app/[portalSlug]/educacao/page.tsx`: `EducacaoHeroSection`, `EducacaoOrigemRecursosSection`, `EvolucaoAnual`, `EducacaoContratosSection`, fornecedores (`DespesasFornecedoresSection`), `EducacaoAprendizadoSection` (6ª), `EmendasSection`.
- `educacao-aprendizado-section.tsx` (124 linhas) já mostra por etapa (`EtapaPainel`): nota com ano, meta, ciclo anterior com variação e classificação "Nº entre N redes"; embute `EducacaoHistoricoSection` (série histórica, média estadual, aprovação).
- Ranking: `getEducacaoRankingEstadual` (`packages/db/src/queries/educacao-metrics.ts`, ~linha 307) deriva a UF de `cod_ibge` e usa `seed_inep_ideb`; médias em `getEducacaoMediasEstaduais` (~467), label dinâmico em `view-model.ts` (~187-190). Sem violação da Regra 23 nos arquivos lidos; `view-model.ts` não foi varrido por inteiro. Falta confirmar se o ranking aceita o ciclo como parâmetro (necessário para a variação de posição).
- Matrículas e `custo_anual_por_aluno` foram removidos de propósito (Story 20.8): não há dado hoje, e a Story 24.6 é a dona do indicador. A spec 18-2 está desatualizada nesse ponto.
- Decisão de produto (2026-11-01): sem hero novo; a própria seção "Aprendizado dos alunos" sobe para o topo e recebe os dois ajustes. O custo por aluno (24.4) e os mínimos legais (24.5) entram logo abaixo dela quando prontos. O mínimo legal é de **aplicação** (25% em MDE, 70% do FUNDEB em magistério), não de repasse.

**Dependências:** nenhuma. Deve ser entregue antes da Story 24.4. Substitui o ajuste pedido para `/educacao` na Story 20.8, que permanece `done`.

---

### Story 24.8: Movida para a Story 25.7

Decidido em 2026-11-04: a conferência de emendas da educação depende do método da spike 25.1 e da Story 25.5, então passou para a Epic 25 como **Story 25.7**, e a Epic 24 fecha sem ela. A numeração 24.8 não é reaproveitada.

---

### Story 24.9: SIOPE em Schema por Fonte com `portal_slug` na Chave

As a maintainer,  
I want the SIOPE raw data in one source schema shared by all portals,  
So that adding municipalities does not add schemas, and the contracts of Story 24.3 are built on the final model.

**Origem:** decisão do Julio em 2026-11-01, por escalabilidade (ver Epic 26). Fica na Epic 24, e não na 26, para que a branch da Epic 24 não dependa de trabalho de outra epic. **Executar antes da Story 24.3**, que cria os contratos em cima do mart. Corrige o desenho das Stories 24.1 e 24.2, já concluídas.

**Acceptance Criteria:**
- **Given** a tabela `siope_indicadores` hoje gravada em `raw_<portal_slug>` (`elt/load/siope.py`)
- **When** a story termina
- **Then** a tabela fica em um schema único da fonte (`raw_siope`) com `portal_slug` na chave primária, e a carga de um portal grava e recarrega só as linhas daquele `portal_slug`, sem tocar as dos outros.
- **And** o staging por portal (`stg_<portal>__siope_indicadores`) é substituído por um modelo único da fonte, sem literal de tenant (Regra 23), e o mart `fct_educacao_siope_metricas` continua com o mesmo grão e os mesmos contratos.
- **And** os valores de referência da Story 24.2 (Porciúncula 2024: R$ 16.789,15; 2025: R$ 16.767,14) passam sem mudança, e há teste de isolamento entre dois portais com os mesmos códigos de indicador.
- **And** a fixture `packages/db/tests/fixtures/schema.sql.gz` é regerada (`make db/fixture/dump`) e `make test`, `make check`, `pnpm test` e `pnpm typecheck` passam (Regra 21).
- **And** os dados já carregados são migrados no banco local do Docker, com paridade conferida antes e depois (mesmos totais por portal). Nenhuma execução em produção sem autorização explícita (Regra 15); a migração em produção, se necessária, fica descrita para o Julio decidir.

**Fora do escopo:** Siconfi e demais fontes (Epic 26); qualquer mudança no que o cidadão vê.

**Dependências:** Stories 24.1 e 24.2 (concluídas). Bloqueia a Story 24.3.

---

### Story 24.10: Ingestão Bimestral do SIOPE para o Ano em Andamento

As a citizen,  
I want to see the SIOPE indicators of the current year, marked as partial,  
So that I do not have to wait for the year to close to know how much is being invested per student.

**Origem:** conversa de 2026-11-01. Hoje o extrator (`elt/extract/siope.py`) pede só a consulta anual (`tpPeriodo: "A"`, bimestre 6, o fechamento). O ano em andamento não tem dado de 6º bimestre, a API não devolve nada e o extrator o ignora com aviso. Por isso o ano corrente não aparece. A lógica `parcial` do mart `fct_educacao_siope_metricas` existe, mas só é exercitada por dados sintéticos de teste.

**Acceptance Criteria:**
- **Given** a API do SIOPE, que oferece o tipo de período bimestral (`tpPeriodo: "B"`)
- **When** a story começa
- **Then** um teste contra a resposta real de pelo menos um município integrado registra se a API devolve os bimestres do ano em andamento, com que defasagem, e se o valor é acumulado no ano ou isolado no bimestre. Se a API não devolver, a story para aqui e o resultado fica documentado. Nenhum número é inferido sem essa verificação.
- **And** o extrator grava, para o ano em andamento, o bimestre mais avançado disponível em `raw_siope.siope_indicadores` (`periodo` 1 a 5, `tipo_periodo` coerente com a coluna), sem literal de tenant ou de ano (Regra 23), e o fechamento anual continua gravado como hoje.
- **And** quando o ano fecha, a linha do bimestre 6 passa a valer e o mart mostra `encerrado`, sem linhas parciais antigas que mudem o resultado.
- **And** o mart `fct_educacao_siope_metricas` mostra o ano corrente como `parcial`, com o `periodo` correspondente, e teste de paridade com dado real (não sintético) para pelo menos um portal.
- **And** o valor parcial nunca é apresentado ao cidadão como fechamento (Regra 27); a decisão de texto fica com a Story 24.3 e o `editor-cidadao`.
- **And** `make test`, `make check`, `pnpm test` e `pnpm typecheck` passam; toda execução no banco local do Docker (Regra 15).

**Fora do escopo:** mudança no que o cidadão vê (Story 24.3); valores de 6º bimestre de anos anteriores; comparação entre bimestres.

**Dependências:** Story 24.9 (concluída). Pode rodar antes ou depois da 24.3, mas a 24.3 precisa saber se o parcial existe.

---

### Story 24.11: Três Respostas no Topo da Página de Educação

As a citizen,  
I want the top of the education page to answer whether the minimum is met, how much is invested per student and whether students are learning,  
So that the page leads with what matters to me and not with budget execution.

**Origem:** reanálise da página em 2026-11-01 (Mary e Julio). Hipótese do Julio: indicadores financeiros puros (reservado, liquidado, pago) devem ser despriorizados em favor de mínimo constitucional, valor por aluno e aprendizado. A hipótese vem de lógica de produto, sem dado de uso; uma validação barata com cidadãos ou com os dados de acesso da página reduz o risco.

**Acceptance Criteria:**
- **Given** as Stories 24.4 (valor por aluno) e 24.5 (mínimos MDE e FUNDEB) concluídas e a seção "Aprendizado dos alunos" (24.7)
- **When** o cidadão abre `/[portalSlug]/educacao`
- **Then** o topo traz uma faixa com três respostas lado a lado, nesta ordem: "A Prefeitura aplica o mínimo exigido em educação?", "Quanto a Prefeitura investe por aluno?" e "As crianças estão aprendendo?", cada uma com um número e a sua régua (limite legal, série do próprio município e meta ou ciclo anterior do IDEB)
- **And** abaixo da faixa vêm os detalhes de cada resposta na mesma ordem, e a seção "Aprendizado dos alunos" da 24.7 permanece como o detalhe da terceira resposta
- **And** o hero financeiro atual (reservado, liquidado e pago) deixa de ser a manchete: seus números passam a ser a memória de cálculo do mínimo, atrás de "Ver detalhes", e as seções de origem do dinheiro, evolução anual, contratos e fornecedores descem para a parte de especialista, no fim (Regra 27)
- **And** "Emendas na educação" fica na parte intermediária; a conferência com a fonte federal é da Story 25.7 (ex-24.8)
- **And** nenhuma seção perde conteúdo, ano em andamento é sempre marcado como parcial, e blocos sem dado mostram "—" com a causa, sem reservar espaço vazio
- **And** o texto passa pelo `editor-cidadao`, o padrão visual segue `DESIGN.md` e `EXPERIENCE.md` nos temas claro e escuro (Regra 25), sem literais de tenant, UF ou ano (Regra 23), e specs de página, `llms.txt`, `llms-full.txt` e CHANGELOG são atualizados.

**Fora do escopo:** novos indicadores; qualquer mudança nos cálculos das Stories 24.4 e 24.5; média estadual ou ranking de valor por aluno.

**Dependências:** Stories 24.4 e 24.5. Substitui a posição "logo abaixo do aprendizado" que essas stories tinham. A 24.7 permanece `done`.

---

### Story 24.12: Refino Visual da Página de Educação: Hero com Barra do Mínimo e Leis e Fontes em Destaque

As a citizen,  
I want the education page to open with one impactful number and its legal minimum on a bar, with the law and the data source always visible,  
So that I understand at a glance whether the minimum is met and can check where the data comes from, without reading blocks of text or following links to sections that repeat the same numbers.

**Origem:** pedido do Julio em 2026-11-03, com análise de Sally, Amelia, Mary, Creuza, Atanagildo e Jurandir. Mockup aprovado (v3): https://claude.ai/artifact/RFAMapEvBMn8VgNiAGv9wJ. Referência de padrão: hero de `/despesas`. Esta story refina a 24.11 depois das inclusões de dados da 24.4 a 24.10.

**Princípio:** nenhuma informação existente sai da página; muda só o peso de cada uma.

**Acceptance Criteria:**

*Topo (hero)*
- **Given** a página `/[portalSlug]/educacao` com dados do SIOPE
- **When** o cidadão a abre
- **Then** o topo segue o padrão de `/despesas`: `eyebrow`, `h1` e lead, e a região "Destaques da educação" com **dois destaques lado a lado, sem `panel`**: (1) "A Prefeitura aplica o mínimo exigido em educação?" e (2) "As crianças estão aprendendo?"
- **And** cada destaque tem um `stat-value-lg`, a barra quadrada **logo abaixo do valor** (componente `ThresholdMeter`, `bg-track`, `h-4`, sem `rounded-*`, sem rótulo sobre o marcador) e o subtexto abaixo da barra, de modo que as duas barras ficam alinhadas
- **And** no mínimo, o marcador é o `limite` vindo da seed (nunca literal), mostrado no texto como "A lei exige pelo menos 25%" (sem casas decimais desnecessárias); "cumpriu o mínimo" **não aparece em texto** (fica na leitura acessível da barra); abaixo do mínimo o texto diz "indício a ser esclarecido pela Prefeitura", sem acusar; ano em andamento fica marcado como parcial e sem veredito, com o aviso abaixo da barra
- **And** no IDEB dos anos iniciais, a barra é de 0 a 10 com o marcador da **média da rede pública do estado** (valor e rótulo dinâmicos, vindos da camada de dados, sem UF fixa); o subtexto traz a faixa, a variação em pontos "em relação ao ciclo anterior (ano)" e a meta do MEC do ciclo, ou "sem meta definida pelo MEC para este ciclo"
- **And** logo abaixo dos destaques, um painel de indicadores (`IndicatorPanel`) com: a parte do Fundeb paga aos profissionais da educação (**só texto**, sem barra, com tom pela posição frente ao mínimo e "a lei exige pelo menos 70% dos recursos do Fundeb"), "Quanto a Prefeitura investe por aluno?" (variação com palavra, "em R$ da época", "Ver detalhes" para a série ano a ano) e "Alunos na rede municipal" (divisão infantil e fundamental, "Ver detalhes" para o modal com Censo Escolar do INEP, o mês de maio e a exclusão de médio, EJA e educação especial)
- **And** "Quanto a Prefeitura gastou em educação?" fica **à vista** no topo, sem modal: reservado, liquidado e pago, com a legenda de que reservar não é pagar, de que o mínimo vale para o que a Prefeitura gasta e não para o que recebe, de que o total soma toda a função Educação e de que o percentual do mínimo usa o cálculo do SIOPE
- **And** uma **única** linha "Leis: … · Fonte: …" fecha o topo, com CF/88 art. 212 e 212-A, Lei 14.113/2020 art. 26 e Lei 4.320/1964 (links de `urlBaseLegal` e de `urlLegislacao`, com `ExternalLink`, `target="_blank"` e `rel="noopener noreferrer"`, Regra 20) e as fontes **com link**: SIOPE (`FONTES_OFICIAIS.siope`) e a execução orçamentária da Prefeitura (portal de transparência oficial do portal, vindo do banco); sem o endereço do portal, a fonte aparece sem link
- **And** os links "Ver o detalhe" para âncoras são removidos e as seções separadas de mínimo, valor por aluno e três respostas deixam de existir, porque o topo as substitui sem perder dado

*Aprendizado dos alunos*
- **And** cada etapa mostra o painel com nota, ciclo anterior, classificação entre as redes municipais do estado e meta, mais a barra com a meta, tudo sem `font-mono` (mono só em `table` e `numeric`)
- **And** a variação usa texto e cor: sobe em `ok-text`, cai em `danger-text`, e **sem indicador quando não houve mudança**; "meta atingida" e "abaixo da meta" seguem a mesma regra; o estado nunca depende só da cor
- **And** o gráfico "Evolução da nota do IDEB" e o seletor de etapa permanecem; o SAEB de Português e de Matemática e a taxa de aprovação aparecem **logo abaixo do aviso** do IDEB, e o modal "Detalhes do IDEB" fica só com o texto de como ler a meta

*Demais seções*
- **And** "O que entrou" usa uma barra empilhada: as três maiores fontes têm cor própria e as demais somam um segmento cinza "Demais fontes", sem cor repetida, com legenda em texto e percentual; abaixo, o painel de indicadores por fonte (valor, percentual e "Ver detalhes"), em **2 colunas no celular** (opção `twoColumnsOnMobile` do `IndicatorPanel`) e 4 no desktop
- **And** "Como o Fundo contrata" mantém os cards por categoria **com "Ver detalhes"** (cada categoria vazia sem o link), e as leis (merenda, transporte, locação) saem da descrição e vão para a linha "Leis:" **no fim da seção**, com link; a locação diz "licitação inexigível quando as características e a localização do imóvel tornam necessária sua escolha"
- **And** o painel "Emendas / Contratos do Fundo" sai da página (a seção de emendas e a de contratos mantêm o conteúdo); nas emendas, o aviso "O dinheiro das emendas chegou?" fica **abaixo** dos indicadores (`EmendasSection` é compartilhado e vale para as páginas que o usam)
- **And** evolução anual, contratos e fornecedores mantêm todo o conteúdo atual, na ordem da 24.11

*Textos e links*
- **And** "Ver detalhes" é um link pequeno (14px, `underline`, **sempre em linha própria**, alvo de toque garantido por área e não por altura visual), em todas as seções de educação, num componente único (`VerDetalhesLink`) em vez de `<button>` com classes soltas
- **And** `NOTA_DECLARACAO`, `NOTA_MINIMO_GASTO` e `NOTA_INFLACAO` existem uma só vez; `Veredito`, `notaDoMinimo` e a descrição de variação do valor por aluno não são duplicados; o valor por aluno diz, no modal, o método oficial do SIOPE (despesa com MDE dividida pelo número total de alunos matriculados) e que esse total pode ser diferente do mostrado em "Alunos na rede municipal"
- **And** os textos passam pelo `editor-cidadao` (Creuza) e pela conferência de dados (Mary); mantidos obrigatoriamente (no topo ou em "Ver detalhes"): inflação, mínimo vale para o gasto, exclusão de médio, EJA e educação especial no total de alunos e a fonte do SIOPE publicada sem recalcular

*Modais*
- **And** os modais de detalhes de educação (valor por aluno, alunos na rede, fonte de recurso, categoria de contrato, IDEB) usam o mesmo cabeçalho e rodapé do `ModalDialog`, título em `h2`, no máximo uma frase antes do primeiro bloco, corpo em `text-sm`, tabelas no padrão do projeto e **lei e fonte sempre no rodapé** no mesmo formato

*Componentes e qualidade*
- **And** a barra com marcador é o componente `ThresholdMeter` em `packages/ui` (quadrada, `h-4`, marcador opcional, sem rótulo sobre o marcador, valor acessível por texto), reaproveitável em `/saude`, com teste de arquitetura e de tokens; `IndicatorPanel` ganha `twoColumnsOnMobile`
- **And** sem literais de tenant, UF ou ano (Regra 23), nomes de métricas explícitos (Regra 9), sem ternários aninhados (Regra 13), cores só por tokens `-fill` e `-text` nos temas claro e escuro, specs de página atualizados, `llms.txt`, `llms-full.txt` e CHANGELOG atualizados

**Fora do escopo:** novos dados ou indicadores; valor em R$ do mínimo (quanto precisaria ser gasto), que fica como melhoria futura; mudança nos cálculos de 24.4, 24.5 e 24.6; reorganizar a ordem das seções de especialista.

**Pendências antes de implementar (resolvidas na implementação):** (1) Atanagildo: o SIOPE 4.9 é "Investimento educacional por aluno", método "Despesa com MDE / Número total de alunos matriculados" (página de descrição do indicador no FNDE); a fonte do total de alunos segue sem confirmação e o texto diz só que pode ser diferente do Censo; (2) Jurandir: as URLs do Planalto de Lei 11.947/2009, Lei 10.880/2004 e Lei 14.133/2021 respondem e a âncora `#art74v` existe; o texto da locação foi ajustado à redação do art. 74, V, e a fonte "Royalties" (Lei 7.990/1989) cobre compensação por recursos hídricos e minerais, com a ligação dos royalties de petróleo à educação na Lei 12.858/2013, art. 2º; (3) Mary revisou os textos de dados; (4) Julio confirmou o endereço do SIOPE.

**Dependências:** Stories 24.4, 24.5, 24.6, 24.7, 24.10 e 24.11 (todas `done`).

---

### Story 24.13: Hierarquia da Página de Educação: "Para Entender" e "Para Fiscalizar"

As a citizen,  
I want the education page to tell the story "o que as crianças aprendem, de onde vem o dinheiro e para onde vai" first, with the audit material (emendas, contratos, fornecedores) grouped at the end and collapsed,  
So that I can follow the main answer without scrolling through tables made for journalists, councilors and auditors, and still reach every detail when I want it.

**Origem:** pedido do Julio em 2026-11-04, a partir de uma segunda opinião sobre a página renderizada (uma LLM sem contexto do projeto) conferida por Mary contra a página real depois da 24.12. Concordância: a LLM acertou na hierarquia (seções de fiscalização misturadas e abertas) e na repetição da ressalva "ano em andamento". **Decisão do Julio:** os termos "reservado", "liquidado" e "pago" **não mudam**; "entregue" não substitui "liquidado" (liquidar é reconhecer que o serviço foi prestado, não que chegou ao cidadão).

**Princípio:** nenhuma informação existente sai da página; muda só a posição e o peso, como na 24.12 (Regra 25 e Regra 27: seções para especialistas ficam no fim).

**Acceptance Criteria:**

*Ordem*
- **Given** a página `/[portalSlug]/educacao`
- **When** o cidadão rola do topo ao fim
- **Then** a ordem é: topo (24.12) → "Aprendizado dos alunos" → "O que entrou" → "Como mudou ao longo dos anos" → bloco **"Para fiscalizar"**
- **And** o bloco "Para fiscalizar" agrupa, nesta ordem, as emendas, "Como o Fundo contrata", "Ver todos os contratos" e "Quem recebe o dinheiro da educação", com um `h2` e uma frase em linguagem comum dizendo para quem serve (por exemplo, quem quer conferir contrato por contrato)
- **And** o conteúdo interno de cada seção fica idêntico ao da 24.12 (mesmos números, textos, tabelas, "Ver detalhes" e links de lei e fonte)

*Recolhido por padrão*
- **And** cada seção do bloco "Para fiscalizar" fica recolhida por padrão (padrão `<details>`/`summary`, acessível por teclado e leitor de tela), com o título e **um resumo com número visível mesmo recolhida** (por exemplo, a contagem de contratos e o total autorizado em emendas), calculado na camada `@transparencia/db`, nunca fixo no componente (Regra 23)
- **And** com o bloco recolhido, nenhum dado some da leitura para quem usa leitor de tela ou impressão: o estado é anunciado e a impressão abre tudo
- **And** o link de âncora para uma seção recolhida (por exemplo, vindo de um alerta ou de `llms.txt`) a abre ao chegar

*Âncoras*
- **And** uma linha de âncoras logo abaixo do topo ("Aprendizado · De onde vem · Para onde vai · Para fiscalizar") leva a cada seção; só aparecem as seções que existem para o portal; os rótulos vêm do contrato visual (`EXPERIENCE.md`) e não criam uma segunda navegação concorrente com o menu do portal

*Ressalva de ano em andamento*
- **And** a ressalva do ano em andamento é dita **uma vez**, em destaque, perto do `eyebrow` do topo (o que o portal já marca como parcial, com o período dinâmico, sem ano ou mês fixo)
- **And** nos cards e seções restantes, o estado fica só como rótulo curto "parcial", sem repetir o parágrafo; onde a ressalva muda o sentido da leitura (veredito suspenso do mínimo, IDEB do ano em curso), o texto mantém a frase necessária para não induzir o cidadão a ler valor parcial como ano fechado

*Emendas*
- **And** o aviso "O dinheiro das emendas chegou?" fica mais curto, sem perder a resposta honesta à pergunta (autorizado, contemplado e empenhado, e onde conferir); `EmendasSection` é compartilhado e a mudança vale para as outras páginas que o usam, com teste de regressão

*Siglas*
- **And** na primeira ocorrência de cada sigla no corpo da página, o nome comum vem junto (por exemplo, "merenda escolar (PNAE)", "transporte escolar (PNATE)"); a sigla oficial e a lei seguem em "Ver detalhes" e na linha "Leis:"

*Qualidade*
- **And** os textos passam pelo `editor-cidadao` (Creuza); a ordem e o resumo recolhido passam por conferência de dados (Mary) e do `contador-publico` quanto aos números do resumo
- **And** sem literais de tenant, UF ou ano (Regra 23), nomes de métricas explícitos (Regra 9), sem ternários aninhados (Regra 13), tokens de cor nos temas claro e escuro, mono só em `table` e `numeric`
- **And** specs de página, `llms.txt`, `llms-full.txt` e CHANGELOG atualizados; teste de que nenhum bloco existente da 24.12 desapareceu (mesmos títulos e mesmos números, só posição e estado inicial)

**Fora do escopo:** trocar "liquidado" por "entregue" ou renomear os estágios da despesa (decisão do Julio em 2026-11-04); novos dados ou indicadores; mudar os cálculos das stories 24.4 a 24.10; estender o padrão a outras páginas (`/saude` pode reaproveitar depois); teste de usabilidade com cidadãos (recomendado fora da story: duas ou três pessoas de fora da área).

**Dependências:** Story 24.12 (precisa estar `done` e com merge, porque a 24.13 muda a ordem das seções que ela entrega).

---

## Epic 25: Saúde: a Prefeitura aplica o mínimo exigido?

A página de saúde passa a abrir pela pergunta "A Prefeitura aplica o mínimo exigido em saúde?" (mínimo constitucional em ações e serviços públicos de saúde), com a origem do dinheiro, as emendas e, só quando houver fonte e régua, a produção da rede e a fila de espera logo abaixo. Origem: conversa de produto de 2026-11-01 a partir da planilha da audiência pública de prestação de contas da saúde (2º quadrimestre de 2026), usada **somente** para decidir o que a Secretaria destaca ao público. **Nenhum número da planilha é fonte de dado do portal:** ela é a transcrição de um vídeo e tem erros de soma (por exemplo, Saúde da Mulher soma 3.028 e informa 3.228; o total do convênio hospitalar não bate com os meses; o total de receitas para apuração não fecha com os subtotais).

**Fonte e acesso:** todo número vem de fonte oficial recorrente do governo. A API de Dados Abertos do Ministério da Saúde (`apidadosabertos.saude.gov.br`, a mesma da farmácia SUS, Story 19.1) é o ponto de partida. Em 2026-11-01 a especificação em `/static/swagger.json` listava 113 endpoints. **Encontrados:** produção ambulatorial (SIA) e hospitalar (SIH), indicadores do Previne Brasil, doses aplicadas do PNI (2026), CNES (estabelecimentos, leitos, profissionais, equipamentos, serviços), unidades básicas de saúde e população residente (denominador para régua por habitante). **Não encontrados nessa API:** mínimo constitucional (SIOPS), fila de espera ou regulação, repasses fundo a fundo e emendas. Esses precisam de outra fonte oficial (candidatas **NÃO VERIFICADAS**: Siconfi, SIOPS, Fundo Nacional de Saúde, Transferegov, Portal da Transparência federal). Nota operacional: em 2026-11-01 a API da Saúde deu timeout em uma tentativa e respondeu 200 em outra, então a carga precisa de repetição e falha graciosa.

**Critério de entrada de um indicador (decidido em 2026-11-01):** só entra se (a) responde a uma pergunta que o cidadão faria, (b) tem fonte oficial que se atualiza sem trabalho manual e (c) tem régua (limite legal, meta, período anterior ou população). Indicador sem os três vai para o backlog.

**Restrições:** Regra 14 (conta no dbt), Regra 15 (execução só no banco local do Docker), Regra 20 (lei citada com link oficial), Regra 23 (sem literais de tenant, UF ou ano), Regra 27 (pergunta do cidadão antes do dado; dado declarado diz que é declarado), `jurista-fiscal` para a base legal do mínimo, `contador-publico` para a base de cálculo e `editor-cidadao` para os textos.

**Fora do escopo:** usar a planilha da audiência como fonte; fila de WhatsApp; comparação ou ranking entre municípios.

---

### Story 25.1a: Spike de Emendas: Fonte Federal e Conferência com o Portal Municipal

As a product manager,  
I want the parliamentary amendments in the municipal portal checked against an official recurring source,  
So that the page shows what each side registers, with its date, and never picks one or hints at omission.

**Origem:** fatiada da 25.1 em 2026-11-05, por pedido do Julio, porque as emendas travam as Stories 25.5 e 25.7. Fonte candidata proposta pelo Julio: download de dados do Portal da Transparência federal, `https://portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares/UNICO` (zip de cerca de 32 MB, Brasil inteiro, atualizado em 2026-10-29, com `EmendasParlamentares.csv`, `EmendasParlamentares_PorFavorecido.csv` e `EmendasParlamentares_Convenios.csv`; latin1, separador `;`, decimal com vírgula). O `curl` precisou de user agent de navegador.

**Entregável:** `planning-artifacts/spike-emendas-fonte-federal.md`, no modelo de `spike-siope-valor-por-aluno.md`. Sem código de produção.

**O que a exploração de 2026-11-05 já mostrou (a spike confirma e amplia):**
- **O "Valor Empenhado" do arquivo é o empenho da União**, não o da Prefeitura. Os empenhos municipais não estão no arquivo; ele não testa sozinho a hipótese de que a Prefeitura não os atualiza.
- **Cadeia a conferir:** a União empenha, a União paga ao fundo municipal (`PorFavorecido`, com mês e favorecido), a Prefeitura registra a receita e a Prefeitura empenha e paga a despesa. Cada elo é um registro de um sistema diferente.
- **Chave de cruzamento:** o `Código da Emenda` federal (12 dígitos: ano, código do autor, sequência) aparece no nome das linhas de receita do portal municipal (por exemplo, `EMENDA PARLAMENTAR 202643380001`). No `emendas_cad` municipal, só 6 de 73 emendas têm esse código; as demais trazem número curto (650, 1979) ou número de proposta (`63000767223202600`).
- **Emenda de vários municípios:** no arquivo principal a linha `Múltiplo` traz o total da emenda, não a parcela do município. A parcela vem do `PorFavorecido`.
- **Prova de conceito (Porciúncula, assistência social, banco local):** nas 3 emendas de 2026 com receita registrada (202641520010, 202632680008, 202643380001), o valor pago ao fundo pela União bate ao centavo com a receita da Prefeitura (R$ 300.000, R$ 200.000 e R$ 500.000). Das 6 emendas com código de 12 dígitos em 2025–2026, 3 aparecem no portal municipal com empenho zero ou em branco meses depois do pagamento federal (outubro e novembro de 2025). Isso é **indício**, não prova: o dinheiro pode estar em conta, ainda sem gasto.
- **Porciúncula 2023 (saúde):** R$ 304.277 pagos pela União batem ao centavo com a receita `TRANSF.SUS- BLOCO MANUTENÇÃO-ATENÇÃO ESPECIALIZADA-POLICLINI`.
- **Esfera:** o arquivo federal só cobre emenda de origem **federal**. As emendas de educação de Porciúncula em 2026 (R$ 400 mil, 3 projetos, 6 linhas) vêm do portal marcadas como `ESTADUAL` (Transferência Especial do Estado). Por isso não há nenhuma linha de educação do RJ em 2026 no arquivo federal, e também não há favorecido de educação no `PorFavorecido`. **Emenda estadual precisa de outra fonte oficial (NÃO VERIFICADA: Assembleia Legislativa e Secretaria de Fazenda do estado).**

**Acceptance Criteria:**
- **Given** o arquivo federal baixado e os dados dos municípios integrados (raw e `analytics`, banco local, Regra 15)
- **When** a spike termina
- **Then** o documento traz, para cada elo da cadeia (empenho da União, pagamento ao fundo, receita da Prefeitura, empenho e pagamento da Prefeitura): fonte, arquivo ou endpoint, periodicidade, defasagem típica, quem registra e a data de referência de cada posição.
- **And** mede, por município integrado e por ano, quantas emendas do portal cruzam pelo código de 12 dígitos, quantas só por valor e favorecido, e quantas não cruzam, separando por esfera (federal, estadual) e por função (saúde, educação, assistência social).
- **And** define a política para: emenda `Múltiplo` (usar o `PorFavorecido`), emenda sem código de 12 dígitos, formato de código de proposta (`630…`, `120…`) que não aparece no arquivo e linhas de receita duplicadas com o mesmo valor (verificar dedupe do `fct_receitas` antes de usá-lo em tela).
- **And** responde, com números, à hipótese do Julio: em quantas emendas a União pagou, a receita entrou e a despesa municipal está vazia, e em quantas isso é explicável (pagamento recente, dinheiro ainda em conta).
- **And** define como mostrar as duas posições, rotuladas "Governo federal" e "Prefeitura", com a data de cada uma e a frase de que são registros de sistemas diferentes; nunca escolhe uma sozinho nem sugere omissão (indício, nunca acusação; Regra 27 para dado derivado). Textos passam pelo `editor-cidadao` e a base legal da obrigação de registro passa pelo `jurista-fiscal` (Regra 20, com link oficial).
- **And** faz o teste de contrato do download (URL, nomes de colunas, codificação, tamanho) a partir do ambiente de carga, informa se a fonte é recorrente sem trabalho manual e registra a defasagem entre a data do arquivo e a data da consulta.
- **And** para **emendas estaduais**, informa se existe fonte aberta e recorrente; se não existir, registra a alternativa (pedido pela LAI) e deixa fora do primeiro corte.
- **And** termina com o método que vale para as Stories 25.5 e 25.7 e as perguntas abertas para o Julio.

**Fora do escopo:** ingestão em produção; qualquer execução fora do banco local (Regra 15); concluir omissão da Prefeitura; usar números da planilha da audiência.

**Decisões do Julio (2026-11-05):** emenda estadual fora do primeiro corte; a tela mostra indício com data e nunca usa "omissão"; a Prefeitura não é consultada. A frequência da carga é definida na Story 23.8; a recomendação da spike é **semanal**, e a fonte de emendas federais precisa entrar num dos grupos de cadência dela.

**Dependências:** nenhuma. Bloqueia as Stories 25.5 e 25.7.

---

### Story 25.1c: Spike de Emendas Estaduais: Fonte Oficial e Conferência com o Portal Municipal

As a product manager,  
I want to know whether state parliamentary amendments have an official, recurring and open source,  
So that the amendments that come from the State can be checked the way the federal ones are, or be shown honestly as not checkable.

**Origem:** pergunta do Julio em 2026-11-05 sobre exibir emendas estaduais. Na spike 25.1a, as emendas de educação de Porciúncula em 2026 (R$ 400 mil) e várias de saúde vêm do portal municipal marcadas como origem **estadual** (Transferência Especial do Estado), e o arquivo federal não as cobre. No banco local, Porciúncula tem 20 emendas estaduais em 2025–2026 (19 em 2026), cerca de metade das emendas do ano.

**Entregável:** `planning-artifacts/spike-emendas-estaduais.md`, curto, no modelo do spike da 25.1a. Sem código de produção.

**Resultado (2026-11-05):** a spike foi feita e está em `planning-artifacts/spike-emendas-estaduais.md`. A Secretaria de Planejamento do Estado publica CSV com o detalhamento das emendas impositivas e o relatório de execução bimestral; o número da emenda do arquivo estadual bate com o `numero_emenda` do cadastro municipal (10 emendas de Porciúncula cruzam). A execução disponível é de 08/2026 e está zerada para as emendas que cruzam, então o elo "o Estado pagou" fica pendente de posição mais nova. O Estado lista emendas para os dois municípios que o cadastro municipal não mostra (12 em Porciúncula e 9 em Natividade, 4 delas de saúde `Fundo a Fundo` que somam R$ 3,5 milhões). Normas estaduais citadas ficam **NÃO VERIFICADAS** até revisão do `jurista-fiscal`. Recomendação: história própria depois da 25.5.

**Acceptance Criteria:**
- **Given** as emendas de origem estadual dos municípios integrados (`esfera_origem` estadual no cadastro, banco local, Regra 15)
- **When** a spike termina
- **Then** o documento traz, para o Estado de cada município integrado (descoberto pela dimensão de portais, sem UF fixa no texto de produto, Regra 23): quem registra a emenda estadual (Assembleia Legislativa, Secretaria de Fazenda ou de Planejamento, portal de transparência estadual), a fonte, o endpoint ou arquivo, a periodicidade, a defasagem típica, se há API ou download aberto e sem captcha, e a decisão de entrar, adiar ou descartar pelo critério de entrada da Epic 25.
- **And** mede, com dados reais, se o código ou o número da emenda estadual aparece no nome das receitas e despesas do portal municipal (como o código federal de 12 dígitos) e quantas das 20 emendas estaduais de Porciúncula em 2025–2026 cruzariam com a fonte encontrada.
- **And** o `jurista-fiscal` fixa a base legal da publicidade das emendas estaduais e da transferência especial estadual (norma estadual, com link oficial, Regra 20); sem fonte verificada, escrever **NÃO VERIFICADO**.
- **And** informa se a fonte estadual traz empenho, pagamento ao município e data, para a mesma cadeia da 25.1a (reservou, depositou no fundo, Prefeitura recebeu, reservou e pagou).
- **And** se não houver fonte aberta e recorrente, registra a alternativa (pedido de informação pela LAI, sem consultar a Prefeitura, decisão do Julio de 2026-11-05) e deixa a conferência estadual fora, mantendo na tela o texto "Esta emenda vem do Estado. Ainda não temos uma fonte oficial do Estado para conferir."
- **And** termina com a recomendação (entra numa história própria, adia ou descarta) e as perguntas abertas para o Julio.

**Fora do escopo:** ingestão em produção; qualquer execução fora do banco local (Regra 15); consultar a Prefeitura; concluir omissão ou irregularidade de qualquer ente.

**Dependências:** Story 25.1a (método da cadeia). Não bloqueia a 25.5 (federal). Desejável antes da Story 25.7, porque as emendas de educação de Porciúncula em 2026 são estaduais.

---

### Story 25.1: Spike de Fontes Oficiais dos Indicadores de Saúde

As a product manager,  
I want each candidate health indicator mapped to an official, recurring and testable source,  
So that the next stories only build what has a real source, a ruler and a citizen question.

**Entregável:** `planning-artifacts/spike-saude-fontes-indicadores.md`, no modelo de `spike-siope-valor-por-aluno.md`. Sem código de produção.

**Acceptance Criteria:**
- **Given** a lista de indicadores candidatos (mínimo constitucional em ASPS, origem do dinheiro por esfera, emendas, exames e procedimentos ambulatoriais e hospitalares, atenção primária, imunização, leitos e profissionais, transporte e hemodiálise, fila de espera e regulação)
- **When** a spike termina
- **Then** o documento traz uma tabela com, para cada indicador: pergunta do cidadão, fonte oficial, endpoint ou arquivo, periodicidade, defasagem típica, régua disponível, teste de contrato (resposta real de pelo menos um município integrado, sem literal de tenant no código) e decisão de entrar, adiar ou descartar pelo critério de entrada da epic.
- **And** para o **mínimo constitucional**, compara Siconfi e SIOPS (e o cálculo próprio pelo dbt) e recomenda uma fonte, com `jurista-fiscal` fixando a base legal (com link oficial, Regra 20) e `contador-publico` validando base de cálculo, exclusões e a diferença entre repasse ao fundo e despesa aplicada com recursos próprios.
- **And** as **emendas** saem desta spike e vão para a Story 25.1a, que é feita antes e define o método também para a Story 25.7 (ex-24.8).
- **And** para **fila de espera**, informa se existe fonte aberta; se não existir, registra a alternativa (pedido de informação pela LAI) e deixa o indicador fora do primeiro corte.
- **And** testa a API da Saúde a partir do ambiente da carga diária (CI), registrando timeouts, limites de taxa e a necessidade de repetição.
- **And** termina com a divisão recomendada das Stories 25.2 a 25.6 (o que entra, o que adia) e as perguntas abertas para o Julio.

**Fora do escopo:** ingestão em produção; qualquer execução fora do banco local (Regra 15); usar números da planilha da audiência.

**Dependências:** nenhuma.

---

### Story 25.2: Mínimo Constitucional de Saúde no dbt (esboço)

As a data analyst,  
I want the constitutional health minimum computed per portal and year from the official source chosen in the spike,  
So that the page can answer "A Prefeitura aplica o mínimo exigido em saúde?" with the legal limit next to the number.

**Status:** esboço ajustado pela spike 25.1 (`planning-artifacts/spike-saude-fontes-indicadores.md`). **Fonte decidida: SIOPS, indicador 3.2** (e 3.1), sem captcha, sem contrato de estabilidade, servido em `http`. **Anos fechados:** `POST` no TABNET (`SerHist/municipio/mIndicadores.def`, parâmetros em latin1, `formato=prn`), baixando todos os municípios e filtrando pelos `cod_ibge` do `seed_portais`; entidades HTML do nome decodificadas antes de separar por `;`. **Ano em andamento:** `POST` em `relindicadoresmun2.php` só para os portais do seed (o TABNET não tem arquivo do ano corrente), valor rotulado `parcial` e nunca comparado com o mínimo. O Siconfi **não** serve: a API do RREO não devolve o Anexo 12. Esperado: extrator em `elt/extract` com tratamento de "Não houve transmissão" como sem dado (nulo, nunca zero), validação estrita de faixa 0 a 100 (houve 121,91% real em bimestre parcial), divergência entre as duas vias como erro explícito, 3.2/3.1/2.1 como indicadores e `D.R.Próprios`, `R.Impostos_e_Transf.Const` e `D.Total_Saúde` como base de conferência (3.2 = `D.R.Próprios` ÷ `R.Impostos_e_Transf.Const`), tabela raw por fonte, staging e mart `fct_saude_minimo_constitucional` com grão `portal_slug` e `ano`, colunas explícitas (Regra 9), ano em andamento identificável como parcial, limite legal vindo do seed (linha `minimo_aplicacao_saude_percentual`, base LC 141/2012 art. 7º, com a vigência da LC 227/2026 ainda **NÃO VERIFICADA**) e cálculo próprio como mart de **conferência** com a diferença exposta. Critério de aceite: conciliar a divergência de 2,6 pontos percentuais do cálculo próprio com o SIOPS em um município e ano. **Via oficial para 2.1 e 3.1: consulta por ano (`relindicadoresmun2.php`); o TABNET serve ao 3.2 e aos valores absolutos, e divergência entre as vias é alerta. O que está na fonte oficial é o que se exibe, sem depender de conferência de contador. Teste a partir do CI: NAO EXECUTADO (critério de aceite).** Parecer da skill `contador-publico` (spike, item 8.2): estágio da despesa e códigos de receita **não bloqueiam a tela**, que exibe o SIOPS com o rótulo "calculado pelo SIOPS" e cita o estágio que ele usa (empenhada menos restos sem disponibilidade; a LC 141 art. 24 manda liquidada e restos até a disponibilidade). Os dois pontos só se aplicam ao cálculo próprio de conferência: usar o mapeamento de fontes STN em vez de texto livre e detalhar os códigos de receita da base por vigência.

**Dependências:** Story 25.1.

**Decisão de implementação (divergência entre as vias):** a divergência entre TABNET e consulta por ano **não derruba a carga** para o 2.1 e o 3.1, porque os dados reais já divergem (2.1 nos dois municípios em 2024). O extrator grava as duas linhas, avisa no log e o mart expõe `divergencia_entre_vias` e `indicadores_divergentes`, com teste dbt `severity: warn`. Só o **3.2**, que é comparado com o mínimo legal, é erro explícito no extrator, e o mart deixa `cumpre_minimo` nulo se ele divergir. Na 25.3, quando houver divergência, a tela cita só a via oficial (decisão do `editor-cidadao`).

---

### Story 25.3: Contratos em `@transparencia/db` e Bloco do Mínimo no Topo de `/saude`

**Status:** concluída em 2026-11-06 (critérios detalhados abaixo). Fonte da tela: `analytics.fct_saude_minimo_constitucional` (25.2); o cálculo próprio (`fct_saude_minimo_conferencia`) não é fonte.

**Acceptance Criteria:**
- **Given** o mart `fct_saude_minimo_constitucional` **When** `getSaudeMinimoConstitucional({ portalSlug, ano })` roda **Then** devolve `atual`, `minimo` (limite em pontos percentuais, `percentualAplicado`, `resultado`, base legal e URL do seed), `serie` de anos encerrados com percentual e `anoInicial`/`anoFinal` calculados dos dados, tudo em camelCase e com nulo preservado
- **And** `resultado` é `cumpriu`/`abaixo` só para ano `encerrado` com `cumpre_minimo` do mart; `parcial` no ano em andamento (nunca comparado, mesmo acima de 100%); `indeterminado` quando `cumpre_minimo` é nulo (vias divergentes); `sem_dado` sem linha, sem percentual ou sem limite, nunca zero
- **And** o isolamento por `portal_slug` e o slug vazio são cobertos por teste de paridade
- **Given** `/[portalSlug]/saude` **When** o cidadão abre **Then** o topo mostra, logo após o hero, a pergunta "A Prefeitura aplica o mínimo exigido em saúde?", o percentual, "A lei exige pelo menos N%" (N do seed), a barra com a régua (só em ano encerrado comparável), o rótulo "Calculado pelo SIOPS (Ministério da Saúde) com dados enviados pela Prefeitura" com a data em que o portal consultou o SIOPS, a linha "Lei: … · Fonte: …" com links (`target="_blank"`, `rel="noopener noreferrer"`) e "Ver detalhes"
- **And** abaixo do mínimo o texto diz "indício a ser esclarecido pela Prefeitura"; `indeterminado` não compara e não afirma cumprimento; sem dado mostra "—" e explica; ano em andamento mostra o aviso de parcial sem barra nem selo
- **And** "Ver detalhes" (modal) traz receita base, despesa com recursos próprios, despesa total, despesa por habitante, o estágio da despesa que o SIOPS usa (empenhada menos restos sem disponibilidade; LC 141 art. 24 fala em liquidada) e a série `${anoMin}–${anoMax}` calculada dos dados; o cálculo próprio não aparece
- **And** loader e view-model só repassam o dado tipado (Regra 2); `llms.txt` e `llms-full.txt` atualizados (Regra 12)
- **Revisões feitas:** textos pelo `editor-cidadao` e base legal pelo `jurista-fiscal` (art. 7º e art. 24 da LC 141 conferidos no Planalto). **Vigência da LC 227/2026 VERIFICADA em 2026-11-06** no texto do Planalto (`lcp227.htm`): o art. 170 altera o art. 7º da LC 141 e, pelo art. 182, III, vale a partir da publicação (13/01/2026, DOU de 14/01/2026). Fica de fora desta story, como NÃO VERIFICADO no seed, o que vale de 2027 em diante para o IBS.

**Origem do detalhamento (esboço anterior):** Rótulo na tela: "calculado pelo SIOPS (Ministério da Saúde) com dados enviados pela Prefeitura", com a data em que o portal consultou o SIOPS. Contratos tipados em `@transparencia/db` e bloco no topo da página com a pergunta do cidadão, o limite legal ao lado do número, texto revisado pelo `editor-cidadao` e "Ver detalhes" para a memória de cálculo. Conferir `DESIGN.md` e `EXPERIENCE.md` (Regra 25) e a regra de dado derivado (Regra 27).

**Dependências:** Story 25.2.

---

### Story 25.4: Quanto a União e o Estado Repassam ao Fundo Municipal de Saúde

**Status:** detalhada em 2026-11-06, a partir do que a spike 25.1 apurou e de consulta ao banco local (Porciúncula, 2023 e 2024).

**Pergunta do cidadão (Regra 27):** "Quanto a União e o Estado repassam ao Fundo Municipal de Saúde?" A pergunta original ("De onde vem o dinheiro da saúde?") foi trocada porque a receita do fundo **não inclui** o que a Prefeitura aplica com recursos próprios: em 2024 o fundo arrecadou R$ 20,47 milhões contra R$ 49,37 milhões de despesa total no SIOPS. Sem a troca, a tela sugeriria que a saúde é quase toda dinheiro de fora.

**Decisão do Julio (2026-11-06):** a fonte primária é o **portal da cidade**, não o SIOPS. **Sem estimativa** da parcela da Prefeitura. O SIOPS 3.1 não aparece na tela; a diferença para o portal (2023 próxima da União SUS, 2024 não) é pendência sem causa provada.

**Critérios de aceite:**

1. **dbt:** mart `fct_saude_origem_recursos_metricas` no molde de `fct_educacao_origem_recursos_metricas`: receitas orçamentárias do Fundo Municipal de Saúde, somente folhas do plano de contas, grão `portal_slug`, `ano`, `empresa_id`, `grupo_fonte`, `codigo_natureza`. O órgão se identifica por `unaccent(orgao_nome) ilike '%saude%'` (a extensão já existe no banco). Nenhum literal de município (Regra 23).
2. **Grupos de esfera** em lowercase snake_case (Regra 10), decididos pelo prefixo da natureza da receita (`171x` e `241x` União, `172x` e `242x` Estado), com `outras_receitas` para o restante (rendimento de aplicação, devoluções) e `nao_detalhado` para a diferença contra o total oficial. Valores, prefixos e a tabela de naturezas anterior a 2022 conferidos pelo `contador-publico` antes de codar.
3. **Teste de coerência:** a soma das folhas bate com o total oficial (natureza `1` e `2`) por portal, ano e entidade, como na educação; a divergência vai para `nao_detalhado`, nunca some.
4. **`@transparencia/db`:** query `saude-origem-recursos.ts` no molde de `educacao-origem-recursos.ts` (camelCase, nomes explícitos, nulo preservado, ano parcial e mês de referência, `anoMin` e `anoMax` calculados). Teste de paridade. Funcional e imutável, sem ternário aninhado.
5. **Bloco em `/saude`:** pergunta, valor por esfera com a participação de cada uma, série anual, fonte, data da coleta e aviso fixo: "Mostra o que o fundo recebe de outras esferas. Não inclui o que a Prefeitura aplica com recursos próprios." Posição na página conforme a 25.10; até lá, abaixo do bloco do mínimo. `DESIGN.md` e `EXPERIENCE.md` lidos antes da UI (Regra 25).
6. **Ano em andamento:** valor parcial com aviso, sem comparação com ano fechado como se fosse completo.
7. **Textos** revisados pelo `editor-cidadao`; naturezas e base legal pelo `jurista-fiscal` e pelo `contador-publico`.
8. **Multi-tenant:** funciona para outro estado e para histórico de 2017 a 2027 sem dado trocado; município sem órgão de saúde identificado devolve estado vazio, nunca zero.

**Fora do escopo:** estimativa de recursos próprios da Prefeitura; SIOPS 3.1 na tela; Fundo Nacional de Saúde (não verificado); emendas (25.5).

**Pendências registradas:** (a) a diferença de 2023 entre o portal e o SIOPS 3.1 tinha causa no critério de folha do modelo antigo (corrigida); a de 2024 segue sem causa provada; (b) identificação do órgão por nome é heurística, risco para municípios com outro nome de órgão; (c) em Natividade, repasses com cara de estaduais (resoluções da SES, PREFAPS, PAHI, deliberações da CIB-RJ, fonte STN 1621 "SUS provenientes do Governo Estadual") estão lançados pela Prefeitura na natureza federal (1713), e a seção "Transferências do Estado" do próprio portal mostra R$ 0,00 de 2022 a 2025. A esfera segue a natureza, como o portal exibe; Porciúncula 2024 tem R$ 1,38 mi na mesma situação. Decisão do Julio (2026-11-06): sem aviso na tela; o link do portal fica na fonte para o cidadão conferir. Validar com o `contador-publico` se a fonte 1621 deve reclassificar para Estado; (d) o SUS (1713) de Natividade 2026 está R$ 1,34 mi abaixo do portal (coleta de 05/11), esperado na próxima coleta; (e) o ano mínimo é 2021; o plano de contas anterior só é tratado no que vale para 2021 (1718/2418, 1728).

**Dependências:** Stories 25.1 e 25.3 (feitas).

---

### Story 25.5: Emendas da Saúde: Conferência entre o Portal Municipal e a Fonte Federal

As a citizen,  
I want to see, for each health amendment, what the federal government registers and what the city hall registers, each with its date,  
So that I can tell whether the money arrived and was used, without a delay in one record being read as wrongdoing.

**Pergunta do cidadão (Regra 27):** "O dinheiro desta emenda chegou à cidade e já foi usado?"

**Origem e método:** spike `planning-artifacts/spike-emendas-fonte-federal.md` (Story 25.1a), com pareceres do `jurista-fiscal` (seção 10), do `contador-publico` (seção 11) e do `editor-cidadao` (seção 6). Este é o método que a Story 25.7 (educação) reaproveita.

**Escopo:** emendas de **origem federal** da função Saúde, nos municípios integrados. Emenda estadual e as demais funções ficam fora (a tela diz que não há conferência).

**Acceptance Criteria:**

*Dados (dbt e `@transparencia/db`, Regras 9, 10, 14, 15, 23)*
- **Given** o download do Portal da Transparência federal (`EmendasParlamentares.csv` e `EmendasParlamentares_PorFavorecido.csv`)
- **When** a carga roda no banco local do Docker
- **Then** os arquivos entram no schema `raw_emendas_federais` (padrão por fonte da Epic 26), em latin1 e com decimal em vírgula tratados no staging, com a data do arquivo registrada em cada carga e **sem `portal_slug` na fonte** (a fonte é nacional)
- **And** o vínculo com o município usa o código IBGE do portal (dimensão de portais) e nunca literais de município, UF ou ano; o `PorFavorecido` só traz nome do município e UF, então o mapeamento usa nome normalizado mais UF contra a dimensão de portais e, havendo ambiguidade, **não cruza** e registra o caso
- **And** o `PorFavorecido` é a fonte da parcela do município; o total do arquivo principal nunca é usado como valor do município, em especial nas linhas `Múltiplo`.
- **Given** a coluna `Tipo de Emenda` do `EmendasParlamentares.csv`
- **When** a carga entra no staging
- **Then** o texto da fonte é mapeado, por configuração (seed ou YAML, sem `CASE` com texto no SQL), para a coluna `forma_repasse` com códigos em snake_case: `transferencia_especial` (Emenda Individual - Transferências Especiais), `finalidade_definida` (Emenda Individual - Transferências com Finalidade Definida) e `bancada_comissao_relator` (Emenda de Bancada, de Comissão e de Relator)
- **And** valor de `Tipo de Emenda` fora do mapa vira `nao_identificado` e nunca é adivinhado por palavra parecida; um teste `accepted_values` falha na carga quando a CGU criar um tipo novo
- **And** o vocabulário é o mesmo da modalidade da Story 25.9, e a UI traduz o código no rótulo do glossário ("Repasse direto à Prefeitura (Emenda Pix)"), sem escrever "Emenda Pix" sem explicação
- **And** o rótulo "Emenda PIX" do cadastro da Prefeitura nunca classifica a emenda; sem confirmação da fonte oficial, a tela diz "origem não confirmada"
- **Given** o nome das linhas de receita e despesa do portal municipal
- **When** o código da emenda é extraído por regra
- **Then** a regra aceita o código de 12 dígitos e o formato de 8 dígitos (autor e sequência) **com ou sem "Nº"**, recupera o ano pelo lançamento mais próximo do pagamento federal e nunca assume o "mais recente"; códigos de outro formato (número de programa, de proposta) são marcados como não cruzáveis
- **And** o mart (por exemplo `fct_emendas_saude_conferencia`) tem grão `portal_slug`, `codigo_emenda` e fundo de destino, inclui `portal_slug` em todo `JOIN` e `GROUP BY` e usa colunas explícitas (por exemplo `valor_depositado_governo_federal`, `valor_recebido_prefeitura`, `valor_reservado_prefeitura`, `valor_pago_prefeitura`, `data_posicao_governo_federal`, `data_posicao_prefeitura`)
- **And** valor vazio é nulo e nunca zero; o empenho usado é o líquido; liquidado não é etapa separada (o portal registra junto com o pagamento); os valores são acumulados do período, e o período é calculado dos dados
- **And** a coluna `situacao_conferencia` guarda códigos em snake_case (`pago_e_registrado`, `pago_sem_gasto_identificado`, `gasto_por_valor_sem_codigo`, `sem_pagamento_federal`, `registros_prefeitura_divergem`, `emenda_estadual_sem_conferencia`); os rótulos ficam na UI (Regra 10).
- **And** as linhas de rendimento da conta da emenda não entram nas comparações e os rendimentos ficam em coluna própria.

*Tela (`apps/web`, camada burra; Regra 25: ler `DESIGN.md` e `EXPERIENCE.md` antes)*
- **Given** a seção de emendas da saúde e o objeto verdadeiro de cada emenda (Story 25.8)
- **When** a emenda tem situação conferida
- **Then** a linha mostra dois blocos, "O que o Governo Federal registra" e "O que a Prefeitura registra", cada um com **data da posição e fonte**, com os textos da seção 6 do spike (situações: pago e registrado, pago sem gasto identificado, gasto parecido sem a emenda na descrição, sem pagamento federal ainda, divergência entre os registros da Prefeitura, campo vazio)
- **And** a frase fixa "O Governo Federal e a Prefeitura registram em sistemas diferentes e em datas diferentes. A diferença entre eles não indica erro nem irregularidade: serve para você conferir." fica sempre visível, e o texto nunca usa omissão, irregular, desvio, sumiu, não pagou, não informou ou descumpre
- **And** a situação "gasto parecido sem a emenda na descrição" diz que é estimativa por valor e data (Regra 27)
- **And** emenda estadual ou sem código mostra só o lado da Prefeitura e diz que não há conferência disponível
- **And** o favorecido pessoa física nunca é exibido; o cruzamento mostra o fundo ou o ente
- **And** qualquer lei citada na tela tem link oficial (Regra 20); se o bloco citar o prazo da transferência especial, o link é o da LC 210/2024, art. 8º, no Planalto
- **And** o bloco é `EmendasSection` compartilhado, o "Ver detalhes" traz a memória de cálculo (código, fonte de cada número, regra de cruzamento), e os resumos dos blocos recolhidos são calculados na camada `@transparencia/db`.

*Qualidade*
- **And** testes de paridade da query com casos reais do spike: emenda integralmente reservada e paga (concordância), emenda paga com gasto pequeno, emenda `Múltiplo` (parcela pelo `PorFavorecido`), emenda de 8 dígitos sem "Nº", emenda estadual (sem conferência), campo vazio contra zero e portal sem emendas (estado neutro, sem dados de outro município)
- **And** testes da classificação: tipo conhecido de cada família, tipo novo (`nao_identificado`), emenda `Múltiplo` de transferência especial (parcela pelo `PorFavorecido`) e emenda do cadastro municipal chamada "PIX" sem confirmação federal
- **And** a pergunta de revisão multi-tenant ("se o portal for de outro estado e o histórico começar em 2017 ou terminar em 2027, continua funcionando?") é respondida no PR
- **And** `make test`, `make check`, `make test/ts` e `pnpm typecheck` passam; `llms.txt` e `llms-full.txt` descrevem a conferência (Regra 12).

**Fora do escopo:** emenda estadual; educação (Story 25.7); execução em produção (Regra 15); concluir omissão, irregularidade ou atraso de qualquer ente; exibir pessoa física; a cadência de carga, que é da Story 23.8 (a fonte `emendas_federais` entra no grupo semanal dela).

**Riscos e perguntas abertas (da spike):** o arquivo federal é um instantâneo sem contrato de estabilidade; a regra de ano do código de 8 dígitos precisa de teste; o cruzamento por entidade (fundo de destino) ainda não foi feito; o texto final passa de novo pelo `editor-cidadao`, pelo `jurista-fiscal` (licença de reuso dos dados federais) e pelo `contador-publico` (restos a pagar por exercício). Se a transferência especial federal tem o mesmo cronograma e a mesma obrigação de publicação das estaduais fica para o `jurista-fiscal` (LC 210/2024, art. 8º).

**Dependências:** Story 25.1a (concluída como spike, falta o teste de contrato em ambiente de carga) e Story 25.8 (concluída). Story 23.8 para a carga recorrente, sem bloquear a entrega local.

---

### Story 25.6a: Leitos e Profissionais de Saúde por Mil Moradores

As a citizen,  
I want to see how many hospital beds and health professionals the city has for every thousand residents, compared with previous years,  
So that I can tell whether the local health network is growing or shrinking.

**Origem:** a Story 25.6 foi dividida em 25.6a e 25.6b em 2026-11-07 (decisão do Julio). A 25.6a leva a primeira ingestão do CNES e da população residente, e prova o contrato da API a partir do ambiente da carga. A 25.6b reaproveita esse esqueleto para atendimentos e internações.

**Pergunta do cidadão (Regra 27):** "Quantos leitos e profissionais de saúde há para cada mil moradores, comparado a anos anteriores?" (texto aprovado na spike, parecer do `editor-cidadao`).

**Fontes (spike 25.1, seção 5):** `/assistencia-a-saude/cnes-leitos` (existentes e SUS), `/assistencia-a-saude/cnes-profissionais` e `/vigilancia-e-meio-ambiente/svsa-populacao-residente`. Extrator de partida: `elt/extract/farmacia_sus.py` (limite de taxa, repetição, timeout, `codigo_ibge6`).

**Acceptance Criteria:**
- **Given** o `cod_ibge` do portal
- **When** a ingestão rodar
- **Then** leitos e profissionais chegam em schema próprio por fonte, com `portal_slug` na chave (Regra 23), sempre com `nu_comp` (ou `nu_ano`) explícito, nunca a resposta sem filtro, que devolve 2008.
- **And** o código IBGE de 6 dígitos (CNES) e o de 7 dígitos (população residente) são convertidos a partir do `cod_ibge` do portal, sem literal de município.
- **And** profissionais são **agregados na ingestão**: o nome da pessoa física não é gravado nem exibido.
- **And** o mart calcula leitos (existentes e SUS) e profissionais por mil moradores por ano, com nomes explícitos (Regra 9) e códigos em snake_case (Regra 10). Competência sem resposta fica como "sem dado", não zero.
- **And** `@transparencia/db` devolve a série tipada e o intervalo de anos real da série (sem ano fixo, Regra 23); a tela só renderiza.
- **And** a tela de saúde traz a pergunta, a comparação com anos anteriores, a fonte e a data da competência. Não há "mínimo" nem "adequado": o parâmetro oficial de leitos por mil habitantes é NÃO VERIFICADO e fica para o `jurista-fiscal`. Texto passa pelo `editor-cidadao`; leitos e profissionais por mil moradores são dado derivado (divisão por população) e a tela diz isso (Regra 27).
- **And** **teste de contrato** a partir do ambiente da carga diária: uma passada por endpoint com repetição, timeouts e limite de taxa medidos, registrada na story. Esse resultado vale para a 25.6b.
- **And** `make test`, `make check`, `make test/ts` e `pnpm typecheck` passam, só contra o banco local (Regra 15).

**Decisões jurídicas (`jurista-fiscal`, 2026-11-07):**
- **Sem régua numérica na tela.** Compara só com anos anteriores e nunca diz "adequado", "insuficiente" ou "abaixo do ideal". Base: Portaria de Consolidação GM/MS 1/2017, arts. 102 a 106 (vigente; revoga por consolidação a Portaria 1.631/2015, art. 560, XIX): parâmetros "indicativos, sem qualquer caráter impositivo ou obrigatório", ajustáveis por estado e município. Os valores ficam em documento externo do Ministério da Saúde e **não foram verificados**. Se a régua entrar um dia, vem como linha do `seed_constantes_fiscais.csv` com `base_legal` e URL, e o texto diz "referência indicativa do Ministério da Saúde, que cada município pode ajustar".
- **Proibida** a faixa de 2,5 a 3 leitos por mil habitantes (Portaria 1.101/2002, revogada), na tela e no código.
- **Licença (risco aceito pelo Julio, sem advogado humano):** o portal `dadosabertos.saude.gov.br` declara o conteúdo do site sob CC BY-ND 3.0 (Atribuição-SemDerivações), em frase que parece rodapé padrão e não termo dos conjuntos. Não há termo verificado para a API, CNES, SIA, SIH e população. Mitigação: a tela cita o Ministério da Saúde, a API e a data da competência; reproduz os números como estão; identifica "por mil moradores" como cálculo do portal (dado derivado, Regra 27). Revisão de advogado fica recomendada antes de escala, não bloqueia.

**Fora do escopo:** SIA e SIH (25.6b); estabelecimentos além do necessário; execução em produção; cadência de carga (Story 23.8).

**Dependências:** Story 25.1 (concluída). Referência de padrão: Story 25.4. Bloqueia a 25.6b e a 25.10.

---

### Story 25.6b: Atendimentos e Internações do SUS na Cidade

As a citizen,  
I want to see how many outpatient visits and hospital admissions the SUS delivered in my city, compared with last year,  
So that I can tell how much care is actually being produced.

**Pergunta do cidadão (Regra 27):** "Quantos atendimentos e internações o SUS fez na cidade?"

**Fontes (spike 25.1, seção 5):** `/assistencia-a-saude/sia-procedimentos-ambulatoriais` (defasagem de 1 a 2 meses) e `/assistencia-a-saude/sih-procedimentos-hospitalares`.

**Acceptance Criteria:**
- **Given** o esqueleto de ingestão e a população da 25.6a
- **When** SIA e SIH forem ingeridos por competência
- **Then** o mart traz atendimentos e internações por ano, total e por habitante, com `portal_slug` na chave e nomes explícitos.
- **And** SIH sem retorno para o município vira o estado "sem dado nesta fonte" na tela e na query, nunca zero (a spike achou município de teste sempre vazio); o texto explica sem concluir nada sobre a Prefeitura.
- **And** a competência mais recente sem resposta não derruba o ano em curso: a tela mostra até onde a fonte tem dados, com a data.
- **And** a tela traz a comparação com o ano anterior, a fonte e o que ela mede; é produção paga/registrada pelo SUS, não todo o atendimento da cidade, e o texto diz isso (`editor-cidadao`).
- **And** testes de paridade, `make test`, `make check`, `make test/ts` e `pnpm typecheck` passam, sem literal de tenant, UF ou ano (Regra 23).

**Fora do escopo:** fila de espera, Previne Brasil, vacinação, transporte sanitário, hemodiálise.

**Dependências:** Story 25.6a.

---

### Story 25.6c: Fonte em Massa do DATASUS para a Rede e a Produção de Saúde

As a maintainer,  
I want the health network and SUS production numbers to come from the Ministry's monthly state files instead of the page-by-page API,  
So that loading a month costs minutes per state, not hours per city, and a new city of a known state costs nothing extra.

**Origem:** pedido do Julio em 2026-11-07, depois da carga manual da 25.6a e 25.6b: a API devolve 1 linha por página (profissionais de uma cidade pequena: 300 a 500 páginas por competência, 4 a 5 min; SIA: ~300 páginas por mês), a carga completa leva horas por portal e para o Brasil inteiro seria impraticável (estimativa de ~16 dias de leitura contínua por ano de dados). Spike local (só leitura, sem banco) mostrou que os arquivos mensais por estado do DATASUS reproduzem exatamente os números da API.

**Evidência do spike (2026-11-07, FTP anônimo `ftp.datasus.gov.br`, arquivos `.dbc` = DBF comprimido):**

| Fonte | Arquivo (RJ) | Tamanho | Conferência contra a API |
|---|---|---|---|
| CNES leitos | `/dissemin/publicos/CNES/200508_/Dados/LT/LTRJ2605.dbc` | 46 KB | Porciúncula 2026-05: 28 existentes e 27 do SUS, igual à API |
| CNES profissionais | `.../CNES/200508_/Dados/PF/PFRJ2605.dbc` | 29 MB | Porciúncula 2026-05: 695 vínculos, 548 pessoas, 438 no SUS, igual à API (nome e CNS dão o mesmo total) |
| SIA | `/dissemin/publicos/SIASUS/200801_/Dados/PARJ2512a.dbc` e `b` (mês em partes a, b, c) | 151 MB + 120 MB | Natividade 2025-12: 18.282 procedimentos (`PA_QTDAPR`), igual à API (`PA_QTDPRO` dá 18.283) |
| SIH | `/dissemin/publicos/SIHSUS/200801_/Dados/RDRJ2512.dbc` | 6 MB | Natividade 2025-12: 63 AIH (`MUNIC_MOV`), igual à API |

Medições: download do SIA do mês (271 MB) em 62 s; leitura de 8,2 milhões de linhas de SIA em 136 s com `dbfread`; descompactado o SIA do mês ocupa ~3,4 GB (processar em fluxo e apagar). Uma listagem do FTP deu timeout (repetição é obrigatória). Defasagem em 2026-11-07: CNES até 2026-09, SIA até 2026-08. Municípios do arquivo: `CODUFMUN` (CNES), `PA_UFMUN` (SIA), `MUNIC_MOV` (SIH), todos com código IBGE de 6 dígitos.

**Pergunta do cidadão (Regra 27):** não muda. É a mesma das Stories 25.6a e 25.6b; a tela, a query, o mart e o raw continuam iguais.

**Acceptance Criteria:**
- **Given** o `elt/fontes/saude_datasus.yml`, com uma entrada por UF (host, pasta de cada fonte, padrão de nome do arquivo e mapeamento de campos)
- **When** o extrator roda para um portal
- **Then** baixa o arquivo da UF do portal por competência, descompacta o `.dbc` em fluxo, filtra o município pelo código de 6 dígitos vindo do `cod_ibge` do portal, agrega e grava as **mesmas linhas** de `leitos_competencia`, `profissionais_competencia`, `sia_competencia` e `sih_competencia` do `raw_saude_rede`, sem literal de município, UF ou ano.
- **And** os números reproduzem os do spike (tabela acima) em teste de conferência com amostra pequena; a diferença de `PA_QTDAPR` para `PA_QTDPRO` fica explícita no teste.
- **And** profissionais são agregados na ingestão com o CNS como identificador de pessoa distinta (substitui a contagem por nome e dispensa a frase "contagem aproximada" na tela, que passa pelo `editor-cidadao`); nome, CPF e CNS nunca são gravados nem exibidos, e o arquivo baixado e o `.dbf` descompactado são apagados ao fim, inclusive em falha.
- **And** **teste de cobertura por UF** no padrão da Regra 28 (`elt/tests/test_cobertura_fontes_saude_datasus.py`): toda UF de `elt/transform/seeds/seed_portais.csv` precisa estar em `fontes` ou em `ufs_sem_fonte` (com motivo); cadastrar cidade de UF nova sem isso quebra o teste. Sem `if` por UF no extrator.
- **And** o FTP é tratado como instável: repetição com espera crescente, timeout, retomada por arquivo; competência sem arquivo ou sem linhas do município vira "sem dado" (sem linha), nunca zero; falha propaga e nada parcial é gravado como completo.
- **And** o **teste de contrato a partir do ambiente da carga** (GitHub Actions, ubuntu-latest) mede o FTP (conexão de saída, tempo de download por arquivo, espaço em disco, repetição) e o resultado é registrado na story; esse resultado alimenta a Story 23.8.
- **And** a API de dados abertos continua só para a população residente (1 página por ano); o `SaudeRedeExtractor` por páginas e as opções `--only saude_rede` e `saude_producao` são substituídos, sem deixar caminho morto.
- **And** a dependência de leitura do `.dbc` (`datasus-dbc` no spike) entra em versão exata (Regra 7), com a velocidade de leitura medida (`dbfread` em Python puro: 136 s para 8,2 milhões de linhas) e alternativa mais rápida considerada se o backfill passar de poucas horas.
- **And** o `jurista-fiscal` registra a decisão sobre o termo de uso dos arquivos do DATASUS (não verificado no spike) e a tela mantém a citação ao Ministério da Saúde e a data da competência.
- **And** `make test`, `make check`, `make test/ts` e `pnpm typecheck` passam, só contra o banco local (Regra 15).

**Informação de cadência para a Story 23.8 (já refletida lá):** arquivos mensais por UF, grupo **mensal**; incremental (só as competências novas, as 4 últimas fechadas por padrão); backfill de 2021 em diante é manual, em partes, e só no banco local (em produção só com autorização do Julio); custo estimado do RJ por mês de 3 a 4 min no SIA e segundos no CNES e no SIH, para **todas** as cidades do estado de uma vez (o custo é por UF, não por cidade); o SIA do mês tem 2 a 3 partes de ~150 MB e o disco temporário chega a ~3,4 GB. **Medido no GitHub Actions (2026-11-07, RJ 2025-12):** ~15 min por UF por mês fechado (SIA domina), sem falha nem repetição, maior `.dbf` descompactado ~1,9 GB (uma parte por vez), 93 GB livres; o custo é por UF, não por cidade. **Nota da revisão de código:** o padrão de 4 competências relê o SIA já gravado a cada execução (~3,4 GB de `.dbf` por mês); na coleta recorrente, a Story 23.8 deve pular a competência já carregada ou reduzir a janela. A gravação é tabela por tabela, sem transação; uma falha de banco no meio deixa a competência parcial até a próxima execução (o upsert corrige).

**Fora do escopo:** fila de espera, Previne Brasil, vacinação, transporte sanitário e hemodiálise; execução em produção; mudar o raw, o mart, a query ou a tela (salvo o texto de contagem de profissionais); cadência de carga (Story 23.8).

**Dependências:** Stories 25.6a e 25.6b (revisadas; o raw, o mart e a tela que esta história alimenta). Story 23.8 recebe a cadência. Substitui o caminho da API para CNES, SIA e SIH.

---

### Backlog da Epic 25 (sem story, com motivo)

- **Fila de espera:** removida do escopo da Epic 25 em 2026-11-07 (decisão do Julio). Não há endpoint na API da Saúde (especificação 1.8.32). Só voltaria com resposta de pedido pela Lei de Acesso à Informação (Lei 12.527/2011), que é pontual, não recorrente.
- **Previne Brasil:** série parou em 2024Q3; sucessor NÃO VERIFICADO.
- **Vacinação:** o contrato não filtra por município e não há denominador.
- **Transporte sanitário e hemodiálise:** não testados.

### Story 25.8: Objeto Correto das Emendas na Saúde e na Educação

As a citizen,  
I want each amendment to show what it was for (its object), not an internal label,  
So that I can tell what the money is meant to buy.

**Origem:** achado do Julio em 2026-11-05. A página de educação mostra, por exemplo, `TRANSFERENCIA ESPECIAL DOS ESTADOS`, e o objeto verdadeiro é "Implantação da sala de regulação sensorial na Escola Municipal Orlinda Veiga". Causa verificada no banco local: a camada de staging descarta a coluna `objeto` do `emendas_cad` e a query `packages/db/src/queries/emendas-parlamentares.ts` preenche `objeto` com `resumo`. O `resumo` é texto livre de cadastro e muitas vezes repete o tipo de transferência (inclusive com erros de digitação, como `TRANSFERENCIA ESPECILA AOS MUNICIPIOS`). Diferem de `objeto` 26 de 53 linhas em Porciúncula e 20 de 20 em Natividade.

**Acceptance Criteria:**
- **Given** o `objeto` do `emendas_cad` em Porciúncula e Natividade
- **When** o dbt e a query forem corrigidos
- **Then** o staging passa a expor `objeto`, o mart `fct_emendas` o carrega com nome explícito (Regra 9) e `getEmendasParlamentares` devolve o objeto em `objeto` e, se útil, o resumo em campo separado; nenhum componente muda de lógica (camada de apresentação burra).
- **And** a seção de emendas da **educação** e a da **saúde** mostram o objeto verdadeiro; quando o objeto vier vazio, a tela usa texto neutro e não o resumo.
- **And** o tipo de transferência (por exemplo, Emenda PIX) e a esfera de origem (federal ou estadual) aparecem como informação própria, em linguagem comum, e não no lugar do objeto.
- **And** testes de paridade da query (o banco de testes é montado por `make db/test/build` e pelo `seed.ts`, sem fixture a regenerar), `make test`, `make test/ts` e `pnpm typecheck` passam, sem literal de tenant (Regra 23).

**Dependências:** nenhuma. Bloqueia as Stories 25.5 e 25.7.

---

### Story 25.7: Emendas da Educação: Conferência entre o Portal Municipal e a Fonte Federal

As a citizen,  
I want to see how much parliamentary-amendment money for education reached my city and in which stage it is, according to both the municipal portal and the federal source,  
So that a delay in the municipal records is not read as money that stopped.

**Origem:** era a Story 24.8, movida para a Epic 25 em 2026-11-04 porque depende do método da 25.1 e da 25.5. Story irmã da 25.5 (saúde), decidida pelo Julio em 2026-11-01. Hipótese do Julio: a Prefeitura não atualiza no portal oficial municipal os empenhos ligados às emendas, e pode registrá-los só no sistema federal por exigência legal.

**Status:** esboço. Detalhar depois da spike 25.1a, que define o método de cruzamento e as fontes federais (Transferegov, Portal da Transparência federal, FNDE). Nenhuma fonte foi verificada ainda.

**Princípios já decididos:** quando as fontes divergirem, o portal mostra as duas posições com a data de cada uma e diz que são registros de sistemas diferentes; nunca escolhe uma sozinho nem sugere omissão da Prefeitura (indício, nunca acusação; Regra 27 para dado derivado). Sem literais de tenant (Regra 23).

**Dependências:** Story 25.1a (spike de emendas), Story 25.5 (método compartilhado) e Story 25.8 (objeto correto). Story 25.9 (emendas estaduais, concluída em 2026-11-05 com pendências), porque as emendas de educação de Porciúncula em 2026 são estaduais; a Entrega 1 dela basta. Em 2026-11-05 a exploração mostrou que as emendas de educação de Porciúncula em 2026 são de origem **estadual**; a fonte federal não as cobre. Ao concluir, atualizar a página de educação (a conferência entra na parte intermediária, junto de "Emendas na educação").

---

### Story 25.9: Emendas Estaduais: Lista Oficial e Conferência com o Portal Municipal

As a citizen,  
I want to see the amendments the State registers for my city, and which of them reach the city hall,  
So that I know what was indicated for my city even when the city hall does not list it, and I do not confuse money spent by the State with money paid to the city hall.

**Pergunta do cidadão (Regra 27):** "Que emendas do Estado foram indicadas para a minha cidade e o dinheiro chega à Prefeitura?"

**Origem e método:** spike `planning-artifacts/spike-emendas-estaduais.md` (Story 25.1c). Segue o método da Story 25.5 (duas posições, cada uma com data e fonte), com o relatório de execução do Estado como elo estadual.

**Escopo:** emendas impositivas de origem estadual dos municípios integrados, todas as áreas, com saúde e educação em destaque. Em duas entregas:

*Entrega 1: lista oficial do Estado por município (sem depender da execução)*
- **Given** as planilhas CSV de detalhamento das emendas impositivas publicadas pela Secretaria de Planejamento do Estado, descobertas pelos links da página oficial (nunca por nome de arquivo fixo)
- **When** a carga roda no banco local do Docker (Regra 15)
- **Then** os arquivos entram no schema `raw_emendas_estaduais` (padrão por fonte da Epic 26), em UTF-8 com BOM, separador `;`, valor com `R$` e vírgula decimal tratados no staging, guardando a data e a fase de cada arquivo
- **And** o vínculo com o município usa a coluna de município do arquivo e o código IBGE da dimensão de portais, com nome normalizado e UF vinda do portal; havendo ambiguidade, não cruza e registra o caso; o Estado vem dos dados, nunca de literal (Regra 23)
- **And** o mart (por exemplo `fct_emendas_estaduais`) tem grão `portal_slug`, número da emenda, autor e `identificador`, com colunas explícitas (por exemplo `valor_emenda_estadual`, `objeto_emenda`, `beneficiario_emenda`, `data_arquivo_estado`) e `portal_slug` em todo `JOIN` e `GROUP BY`
- **And** a `modalidade` guarda códigos em snake_case (`execucao_direta`, `transferencia_especial`, `finalidade_definida`, `fundo_a_fundo`, `osc`); os rótulos ficam na UI (Regra 10)
- **And** a classificação em saúde, educação ou outra área usa a unidade orçamentária do Estado e, na falta dela, o código da função (configurado por fonte), nunca o texto do objeto (a emenda 650, da escola municipal, tem função "Administração" e é classificada pela unidade, a Secretaria de Educação).

*Entrega 2: conferência com o portal municipal e com a execução do Estado*
- **Given** o cadastro municipal de emendas e a lista oficial do Estado
- **When** a emenda aparece nos dois
- **Then** o cruzamento é por número da emenda mais autor (ou pelo identificador), com teste de unicidade; emendas só no Estado entram como "indicada pelo Estado, não consta no cadastro da Prefeitura" (sem sugerir omissão)
- **And** o relatório de execução bimestral (empenhado, liquidado e pago do Estado) entra com a **posição do arquivo** (mês e ano) visível; enquanto a posição for anterior à data da consulta, a tela diz "o relatório mais recente do Estado é de [mês/ano]" e nunca afirma que o Estado não pagou
- **And** a receita da Prefeitura só é comparada por total ou por valor igual, dita como estimativa (Regra 27), porque as linhas de receita estadual não trazem o número da emenda. **Entregue (2026-11-05):** `fct_emendas_estaduais_receita` compara, por portal e ano, o **pago** do Estado nas emendas que chegam à Prefeitura (todas as áreas, só as do arquivo mais recente) com o arrecadado em "outras transferências dos Estados" (alíneas 1729 e 2429, um só nível: total e subalíneas não se somam). Situações: `nao_identificado`, `exercicios_diferentes`, `pago_acima_do_registrado` (o excedente "ainda não aparece", dito como calculado) e `dentro_do_registrado` (não prova elo). Pago ausente fica nulo, não se somam estágios, e a comparação só vale no mesmo ano. **Limites declarados na tela:** o relatório do Estado não separa restos a pagar, as datas de corte dos dois sistemas diferem e a linha de receita reúne outras transferências além de emendas. **Riscos registrados (contador-publico):** a soma é do portal, sem chave por fundo de destino, e a receita lançada fora das alíneas 1729 e 2429 não é vista
- **And** `Execução Direta` e `OSC` aparecem como "o Estado executa" ou "repasse a organização", nunca como dinheiro que chega à Prefeitura; só `transferencia_especial`, `finalidade_definida` e `fundo_a_fundo` entram em "o dinheiro chega à Prefeitura"
- **And** estados e textos seguem a seção 6 do spike federal (dois blocos, "Governo estadual" e "Prefeitura", a frase fixa de que são registros de sistemas diferentes, sem as palavras proibidas), revisados pelo `editor-cidadao`.

*Fontes visíveis e suporte a outros Estados (decidido pelo Julio em 2026-11-05)*
- **Given** que hoje a única fonte estadual verificada é a do Estado do Rio de Janeiro, mas o portal vai integrar municípios de outros Estados
- **When** a carga e a tela são construídas
- **Then** a fonte de cada Estado é uma **configuração por fonte** (nome oficial do órgão, URL da página, padrão para descobrir os links dos arquivos, mapeamento de colunas para o modelo comum, modalidades do Estado para os códigos snake_case, formato de codificação e decimal), sem `if` por UF no código; adicionar um Estado novo significa adicionar a configuração e o mapeamento, não mexer em modelos ou componentes
- **And** o modelo comum no dbt (`fct_emendas_estaduais`) é agnóstico de Estado, e a coluna de origem guarda o código da fonte (por exemplo `fonte_emenda_estadual`), nunca o nome do Estado fixo em SQL ou TypeScript (Regra 23)
- **And** um Estado sem fonte configurada produz estado neutro na tela: "Ainda não temos uma fonte oficial do Estado para conferir", sem erro e sem dados de outro Estado
- **And** a tela **mostra a fonte usada**: em cada emenda e no cabeçalho da seção, o nome do órgão que publica (por exemplo, a Secretaria de Planejamento do Estado), o nome do arquivo ou página, a data do arquivo e a posição do relatório, com **link para a página oficial**; a fonte da Prefeitura (portal municipal) e a do Governo Federal (Portal da Transparência) também aparecem com nome, data e link
- **And** nome do órgão, URL e rótulos vêm da camada `@transparencia/db` (configuração por fonte), e a UI só renderiza (camada burra)
- **And** um teste confere que o cálculo funciona com uma segunda configuração fictícia de Estado (outros nomes de coluna e outras modalidades), para provar que não há acoplamento ao Estado do Rio de Janeiro.

*Qualidade*
- **And** testes de paridade com casos reais da spike: emenda que cruza com valor igual, emenda só no Estado (saúde fundo a fundo), execução direta em colégio estadual, objeto de educação com função "Administração", número repetido entre autores, execução com posição antiga e portal sem emendas (estado neutro)
- **And** a revisão do `jurista-fiscal` fixa a base legal estadual (EC 75/2019, EC 97/2023, LC 219/2024, LC 221/2024, LC 232/2026 e o Decreto 49.132/2024, hoje **NÃO VERIFICADOS**), a do `contador-publico` valida os estágios do Estado e a do `editor-cidadao` os rótulos por modalidade
- **And** `make test`, `make check`, `make test/ts`, `pnpm typecheck` passam; `llms.txt` e `llms-full.txt` descrevem a conferência (Regra 12).

**Fora do escopo:** execução em produção (Regra 15); concluir omissão ou irregularidade de qualquer ente; exibir pessoa física; o painel Qlik do Estado, até haver exportação verificada; as emendas de 2025 e anteriores além do necessário para o histórico (verificar na própria história); a cadência de carga (Story 23.8, grupo semanal). A classificação federal por `forma_repasse` é da Story 25.5; a 25.9 mantém `modalidade` e usa os mesmos códigos.

**Perguntas abertas (da spike):** unicidade de (número, autor) e do identificador; as seis emendas de saúde de Porciúncula com número de proposta que não casam com o detalhamento; se o painel Qlik tem posição mais nova que as planilhas; termos de uso do portal do Estado.

**Dependências:** Story 25.1c (concluída como spike), Story 25.5 (método e textos), Story 25.8 (objeto correto) e Story 23.8 (cadência). A Story 25.7 (educação) usa a Entrega 1 desta história para as emendas de educação de Porciúncula em 2026.

**Status (2026-11-05): concluída, com pendências registradas.** Entregues nos commits `a58528fe` e `0fc1e738`, no banco local (Regra 15, nada em produção): extração e carga por fonte (`elt/fontes/emendas_estaduais.yml`), `fct_emendas_estaduais`, `fct_emendas_estaduais_fontes` e `fct_emendas_estaduais_receita`, as consultas em `@transparencia/db`, o bloco nas páginas de saúde e educação e o cartão da receita só na saúde. A revisão (`bmad-code-review`) corrigiu: execução cruzada com o ano da emenda, comparação com a receita só da `transferencia_especial` (fundo a fundo e finalidade definida ficam fora até haver parecer contábil), erro de consulta como `indisponivel`, valor ausente nulo e não zero, e a fonte (órgão, arquivo, data, fase, link) em cada emenda. Decisões: a área vem da unidade orçamentária e, na falta dela, da função (texto da spec ajustado); a coluna "Rastreabilidade" de `emendas-section.tsx` saiu de propósito.

**Pendências (não bloqueiam o fechamento; seguem em `deferred-work.md`):**
- Revisões do `jurista-fiscal` (base legal estadual, ainda NÃO VERIFICADA), do `contador-publico` (estágios do Estado e alíneas 1729/2429; só então ampliar a comparação a fundo a fundo e finalidade definida) e do `editor-cidadao` (textos): não registradas nesta sessão.
- Datas das fontes federal e municipal na lista de fontes (hoje `null`) e os dois blocos "Governo estadual" e "Prefeitura" (hoje uma tabela só): ajustar a tela ou a spec.
- A página de educação não mostra a mensagem "sem fonte" quando não há emendas municipais (os testes de página esperam a seção oculta): decidir.
- Extrator Python: casos de borda não verificados (identificador repetido no CSV, posições de meses diferentes somadas, soma parcial tratada como total, mês fora de 1..12, `NaN`, carga sem transação única).
- Sem alerta de arquivo desatualizado do Estado; `coletado_em` não aparece na tela.
- `make test/ts` e `pnpm test` perdem o `DATABASE_URL` no turbo e leem a 5544; usar `pnpm exec turbo run test --env-mode=loose` com a 5545 explícita.

### Story 25.10: Hierarquia da Página de Saúde: "Para Entender" e "Para Fiscalizar" (esboço)

As a citizen,  
I want the health page to answer first "a Prefeitura aplica o mínimo, de onde vem o dinheiro e o que a rede entrega", with the audit material (emendas, contratos, fornecedores) grouped at the end and collapsed,  
So that I can follow the main answer without scrolling through tables made for journalists, councilors and auditors, and still reach every detail when I want it.

**Origem:** pedido do Julio em 2026-11-06, depois de aprovar o resultado das Stories 24.12 e 24.13 na página de educação. Nenhuma story anterior da Epic 25 reorganiza a página inteira: a 25.3 cobre só o equivalente da 24.12 (o topo), e as 25.4, 25.6a e 25.6b acrescentam blocos. Esta story é o equivalente da 24.13 e vem **depois** delas, para reorganizar uma vez só, com a página já completa.

**Status:** detalhada em 2026-11-08; ver `implementation-artifacts/25-10-hierarquia-da-pagina-de-saude-para-entender-e-para-fiscalizar.md` (decisões do Julio e ACs). Texto original do esboço: detalhar quando as Stories 25.3, 25.4, 25.6a e 25.6b fecharem, com a página renderizada na mão. Princípio herdado da 24.13: nenhuma informação existente sai da página; muda só a posição e o peso (Regra 25 e Regra 27: seções para especialistas ficam no fim). Esperado: ordem "topo (25.3)", origem do dinheiro (25.4), produção da rede (25.6a e 25.6b), série histórica, e bloco **"Para fiscalizar"** com emendas (25.5 e 25.9), contratos e fornecedores, cada seção recolhida por padrão (`<details>`/`summary`) com resumo numérico visível calculado em `@transparencia/db` (Regra 23), mesmo padrão e componentes da educação, sem texto de município, UF ou ano fixo. Conferir `DESIGN.md` e `EXPERIENCE.md`, `editor-cidadao` nos textos e a regra de dado derivado (Regra 27).

**Candidatos a decidir aqui (vindos da 25.6c, carga só do ano atual):**
- Anos anteriores ao início da carga: rótulo "não disponível" ou ocultar do seletor, igual nos blocos de rede e de produção. O rótulo atual é "sem dado da fonte"; revisar o texto com o `editor-cidadao`.
- Produção do SUS usa só a população do mesmo ano e mostra traço; a rede usa a do ano anterior como estimativa. Alinhar os dois.
- Eyebrow "2026–2026" quando há um único ano.
- **Município do estabelecimento:** SIA (`PA_UFMUN`) e SIH (`MUNIC_MOV`) trazem o município do estabelecimento, não o de residência do paciente; a tela divide pelos moradores. Conferir se o texto diz que são atendimentos e internações **feitos na cidade**, e não de moradores.
- **Procedimentos de diagnóstico ("exames"):** o arquivo mensal do SIA traz `PA_PROC_ID` (código SIGTAP, 10 dígitos); os 2 primeiros dígitos seriam o grupo, e o 02 seria "diagnóstico" (a confirmar na tabela oficial). Spike no SIA do Acre de 2026-08: grupo 02 = 790.833 de ~1,8 milhão de procedimentos aprovados (cerca de 40%). Hoje o raw guarda só o total mensal; separar exigiria agregar por grupo no extrator (em memória), coluna nova no raw, mart, tela e recarga do SIA (~15 a 20 min por mês e UF). O rótulo honesto é "procedimentos de diagnóstico", não "exames realizados" (mistura laboratório, imagem e outros métodos). Medido só em uma UF e um mês.

**Dependências:** Stories 25.3, 25.4, 25.6a e 25.6b; referência de padrão: Stories 24.12 e 24.13.

### Story 25.11: Título sem ano e escopo declarado em cada bloco (saúde, educação e previdência)

As a citizen,  
I want each theme page to say clearly which blocks show the chosen year, which show a history and which show today's picture,  
So that "Saúde 2026" never makes me think everything on the page is from 2026.

**Pergunta do cidadão (Regra 27):** "Isto que estou vendo é de que ano?"

**Origem:** observação do Julio em 2026-11-08: o título de `/saude` e `/educacao` leva o ano selecionado, mas boa parte dos blocos não é daquele ano (série histórica, rede, produção). Análise da Mary na mesma data, com levantamento no código.

**Decisões do Julio (2026-11-08):**
- **Filtro global mantido.** O seletor de ano já existe no cabeçalho, vale para todas as rotas e sincroniza com `?ano=`. A story **não cria seletor nem muda o contrato de URL**; ela muda título e rótulos.
- Título da página só com o tema, sem o ano.
- Cada bloco declara o escopo **no próprio título**, nunca numa nota: o cidadão lê o título, não a nota.
- O padrão do seletor continua sendo o **ano atual**, inclusive no mínimo constitucional (não trocar por "último ano fechado").
- **`/obras` fica fora.** A obra é estoque e o `?ano=` ali funciona como filtro de lista; não há bloco declarado de outro escopo. `/previdencia` entra porque tem bloco de série.

**Levantamento (feito em 2026-11-08, por `page.tsx`; tipos inferidos pelas props, a confirmar ao codar):**

| Rota | Do exercício (usam o ano) | Série histórica ou retrato (não usam o ano) |
|---|---|---|
| `/saude` | Hero (mínimo e orçamento), O que entrou, Contratação, Quem recebe, Emendas | Como mudou ao longo dos anos, Rede SUS, Produção SUS; no hero, rede por mil moradores e Farmácia (retrato atual) |
| `/educacao` | Hero, Origem dos recursos, Emendas, Contratos (vigentes **no ano**, `educacao-metrics.ts:954`), Fornecedores | Aprendizado dos alunos, Como mudou ao longo dos anos |
| `/previdencia` | Hero, Entidades, Saldo em caixa, Risco atuarial, Composição dos repasses | Patrimônio histórico |

Os blocos de exercício são a maioria nas três rotas; por isso o filtro global é o desenho honesto, e os blocos que o ignoram é que precisam avisar.

**Acceptance Criteria:**

- **Given** `/saude`, `/educacao` ou `/previdencia`
- **When** a página renderiza
- **Then** o título da página mostra só o tema, sem o ano (nem em `<title>`, `h1` ou eyebrow), e o ano selecionado continua no seletor do cabeçalho
- **And** todo bloco **do exercício** traz o ano no título, vindo do parâmetro ativo (por exemplo "O que entrou em 2026"), nunca de literal (Regra 23)
- **And** todo bloco de **série histórica** diz o período no título, calculado dos pontos reais dos dados (`${anoMin}–${anoMax}`), e com um único ano diz só esse ano, nunca "2026–2026"
- **And** todo bloco de **retrato atual** diz "hoje" ou "atual" no título e mostra a data da coleta (por exemplo, rede de leitos, Farmácia)
- **And** o hero de `/saude` separa visualmente o que é do exercício (mínimo, orçamento) do que é retrato atual (rede por mil moradores, Farmácia), para o seletor não parecer controlar tudo
- **And** a pergunta e o texto dos títulos e rótulos novos passam pelo `editor-cidadao` (sem jargão, sem tom de acusação)
- **And** nenhum bloco some: um teste confere, por rota, que a lista de blocos antes e depois é a mesma, só com o escopo declarado
- **And** um teste confere que todo bloco que **não** recebe `ano` declara período ou "hoje" no título.

**Documentação e contrato:**
- `apps/web/public/llms.txt` e `llms-full.txt` (Regra 12): descrever, por rota, quais blocos são do exercício e quais não; ajustar frases como "contra a verba prevista no ano" em `/saude`; o `?ano=` e o seletor no cabeçalho não mudam.
- `DESIGN.md` e `EXPERIENCE.md` (Regra 25): registrar o padrão "título sem ano; escopo no título do bloco" (exercício, série, retrato).
- Imagem de compartilhamento: sem mudança esperada (já usa o exercício padrão sem `?ano`); conferir o texto de `saude` e `educacao`.

**Perguntas em aberto para o dev confirmar:**
- ~~Onde nasce o ano no título~~ Resolvido: nos heroes de cada rota (`saude-hero-section.tsx`, `educacao-hero-section.tsx`, `previdencia-hero-section.tsx`), específicos da rota; `<title>` não leva o ano. Detalhes no arquivo da story.
- ~~Rótulo do seletor~~ Resolvido: o seletor global (`packages/ui/src/components/sidebar.tsx`) já se chama "Exercício"; não renomear.

**Herdado da 25.10:** revisão de texto de `/saude` pelo `editor-cidadao` e ano sem dado em rede e produção sem quebrar a tela.

**Detalhes de execução:** `implementation-artifacts/25-11-titulo-sem-ano-e-escopo-declarado-em-cada-bloco.md`.

**Fora de escopo:** `/obras`; criar seletor por bloco ou grupo "Por exercício"; trocar o ano padrão; mudar queries (a story é de apresentação, sem alterar `@transparencia/db`).

**Dependências:** Story 25.10 (reordenação de `/saude`, concluída); referência de padrão: Stories 24.12 e 24.13.

---

## Epic 26: Camada Raw por Fonte (Fim do Schema por Município) (esboço)

Passar a camada raw de "um schema por município" (`raw_<portal_slug>`) para "um schema por fonte" (por exemplo `raw_siope`, `raw_siconfi`, `raw_fiorilli`), com `portal_slug` como coluna e parte da chave primária de cada tabela. Origem: decisão do Julio em 2026-11-01, por escalabilidade: com os municípios do Brasil, um schema raw por município (dezenas de tabelas cada) pesa no catálogo do Postgres, no `pg_dump`, nas migrações e nos `source` do dbt.

**Estado de partida (verificado no banco local em 2026-11-01):** já seguem o padrão por fonte `raw_farmacia_sus`, `raw_pncp` e `raw_obrasgov`. Seguem o padrão por município `raw_porciuncula_prefeitura` e `raw_natividade_prefeitura` (22 tabelas cada), onde `elt/load/siope.py` e `elt/load/siconfi.py` também gravam, e o staging do SIOPE (Story 24.2) é por portal (`stg_<portal>__siope_indicadores`).

**Regra para as demais epics:** toda fonte nova (inclusive a Epic 25) nasce no padrão por fonte, com `portal_slug` na chave. A migração do legado fica nesta epic.

**Princípio de desenho:** o schema é da **fonte** (por exemplo o fornecedor do portal municipal), não do município, porque municípios com fornecedores diferentes têm estruturas diferentes.

**Riscos e cuidados:** mudança de chave primária e `full-refresh` (mesma natureza da pendência de migração da Epic 19); paridade de dados antes e depois (mesmos totais por portal); recarga isolada por portal (apagar só `where portal_slug = ...`); ajuste dos modelos dbt, das fontes e da fixture `schema.sql.gz` (Regra 21); plano de reversão; qualquer carga ou migração em produção só com autorização explícita (Regra 15). Os modelos `int_*_consolidadas.sql`, que hoje unem schemas por município, deixam de ser necessários (Regra 23).

**Stories (esboço, detalhar antes de executar):**
- **(feito na Epic 24, Story 24.9)** O SIOPE já migra para `raw_siope` lá, para a branch da Epic 24 não depender desta epic. Serve de modelo para as demais.
- **26.1 Siconfi (MSC Patrimonial) em schema por fonte.** Mover `siconfi_msc_patrimonial` para `raw_siconfi` com `portal_slug` na chave e trocar o staging por um modelo único da fonte, repetindo o método da 24.9 com teste de paridade.
- **26.2 Inventário e plano de migração do legado.** Listar as 22 tabelas por portal, agrupar por fonte, definir ordem, paridade e reversão.
- **26.3 Migração das tabelas do portal municipal (Fiorilli) para schema por fonte**, uma tabela ou grupo por story.
- **26.4 Remoção dos schemas por município e dos modelos de consolidação.**
- **26.5 Migração do RGF (`siconfi_rgf`, criado na Story TD.2) para `raw_siconfi`.** A TD.2 grava a tabela no schema por município, seguindo o padrão atual, para não depender desta epic. Mover junto com `siconfi_msc_patrimonial` (26.1), com `portal_slug` na chave e teste de paridade.

**Dependências:** a 26.1 pode rodar a qualquer momento, de preferência depois da 24.9; o restante depois da 26.2.

---

## Epic 27: Home: a Situação da Cidade Primeiro

A página inicial deixa de abrir pela arrecadação e passa a abrir pela pergunta "Como está a minha cidade hoje?". Os três temas que mais pesam em cidade pequena (saúde, obras e educação) viram cards de situação, cada um com a pergunta do cidadão, a resposta em uma frase e a régua que a sustenta. O dinheiro fica logo abaixo, em duas perguntas separadas: "Dinheiro que entra na cidade" (o 13º dos servidores, só na época) e "Para onde vai o dinheiro público" (o hero fiscal rebaixado). Origem: sessão de produto e UX de 2026-11-09 com mockups em `https://claude.ai/artifact/E27agKixrsAExv4Pgwb5ih` (canvas privado do Julio; a decisão final está neste texto, não no canvas). Depois das refatorações de Educação (Epic 24) e Saúde (Epic 25), a home é a última página que ainda abre como relatório contábil.

**Público (informado pelo Julio em 2026-11-09):** hoje, pessoas com mais de 30 anos vindas do Facebook; a meta é alcançar a faixa anterior, vinda do Instagram. Quase todos leigos. Os municípios são pequenos e os próximos também serão. Daí: celular primeiro, uma resposta curta por card, botão "Compartilhar" em cada card e nada de jargão. O 13º interessa sobretudo ao **comerciante local** (o dinheiro da folha vira venda na cidade), não ao servidor.

**Contexto e substituição do handoff:** `handoff-remodelagem-home-utilidade.md` (Epic 19) continua valendo como contexto. Nesta epic, **três pontos dele são substituídos**: (1) o Radar Cívico não sobe para a primeira dobra, **sai da home** (a rota `/radar` continua; os alertas ainda são técnicos demais para a vitrine e a versão "novidades em linguagem comum" fica no backlog); (2) o apagão da farmácia deixa de ser "Violação" e "Inconformidade Crítica" na home: o texto segue o que o card já diz ("não encontramos estoque divulgado... isso não quer dizer que falta remédio") e **não recebe a etiqueta "Merece atenção"**; (3) "Copiar requerimento" e "Compartilhar no WhatsApp" **ficam na home** (decisão do Julio, 2026-11-09), dentro do card de saúde no estado de apagão.

**Decisões fechadas em 2026-11-09:**
- **Ordem fixa**, sem reordenar por dado: abertura (h1 com o município, período em texto), "Como está a cidade hoje" (Saúde, Obras, Educação), "Dinheiro que entra na cidade" (13º, sazonal), "Para onde vai o dinheiro público" (hero fiscal e saldo em caixa) e "Mais detalhes". O cidadão aprende onde fica cada coisa.
- **Sem seletor de ano no conteúdo.** Ele já existe no sidebar (desktop) e no header (mobile). A home mostra o período só como texto.
- **Etiqueta "Merece atenção" só com dois gatilhos, ambos fatos com régua:** `abaixo_minimo` (mínimo de saúde ou de educação com resultado `abaixo`, **só no ano fechado**) e `obra_paralisada` (qualquer obra paralisada, pelo menos uma). Toda etiqueta traz o **motivo escrito em uma linha** ("2 obras estão paradas."). **Não disparam:** mínimo `parcial` ou `sem_dado`, apagão da farmácia (não divulgar o estoque não é falta de remédio), Ideb em queda (nota que oscila a cada dois anos; a meta é parâmetro do portal, não limite legal; a queda já aparece no card com a seta para baixo e "era X").
- **Uma manchete por card**, a pergunta do uso (remédio, obra, escola). O mínimo legal entra como **linha de apoio**, menor, com barra e link da lei.
- **Cidade sem dado não ganha card vazio:** o card some e os demais seguem empilhados, sem espaço reservado.

**Estados de cada card (todos desenhados no canvas):** normal; mínimo `parcial` no ano em andamento ("Em andamento", sem "Sim" nem "Não"); `abaixo` ("Ainda não", em âmbar, sem vermelho e sem acusação); `sem_dado` (a linha da régua não aparece, e o card nunca mostra "sem dado" como se fosse resposta); farmácia em apagão; cidade sem obras.

**O que o levantamento de 2026-11-09 mostrou (verificado no código):** o loader da home hoje **não carrega** o mínimo de saúde (`getSaudeMinimoConstitucional`, usado só pela página de saúde) nem o mínimo de educação (`siope.minimos.mde`, usado só pela página de educação); `MinimoLegalDTO` já traz `limite`, `percentualAplicado`, `resultado` (`cumpriu`, `abaixo`, `parcial`, `sem_dado`), `baseLegal` e `urlBaseLegal`; o 13º existe em `getExecucaoDecimoTerceiroMetrics` (empenhado, liquidado, pago e percentual pago) **por ano, sem mês e sem data de pagamento**, porque o mart `fct_pessoal_folha_metricas` agrega por ano e empresa, embora o staging de pessoal tenha a coluna `mes`; `ResumoObrasDTO` traz `paralisadas` e `valorParalisadas`, **sem a duração da paralisação**; a busca de remédio já existe (`farmacia-busca-destaque`, `farmacia-busca-form`).

**Restrições:** Regra 2 (camada de apresentação burra: o percentual da home sai da **mesma query** da página interna, nunca recalculado na tela), Regra 9 e 18 (nomes claros e `camelCase`), Regra 10 (códigos `abaixo_minimo`, `obra_paralisada` em snake_case; a UI traduz), Regra 12 (`llms.txt` e `llms-full.txt`), Regra 15 (seed e dbt só no banco local), Regra 20 (toda lei citada com link oficial), Regra 23 (sem município, UF ou ano fixos), Regra 24 e 25 (vocabulário, `DESIGN.md` e `EXPERIENCE.md`), Regra 27 (pergunta primeiro, dado derivado diz que é derivado), `jurista-fiscal` para a base legal, `contador-publico` para os estágios do 13º e `editor-cidadao` para todo texto ao cidadão.

**Fora do escopo (backlog, com motivo):**
- **Radar Cívico na home:** alertas técnicos demais para a vitrine. Evolução: feed de novidades em linguagem comum (outra fonte e outro produto).
- **Assistência social:** ainda sem dado (Epic 21). Não se reserva espaço nem se mostra "em breve".
- **Previdência em dia:** não interessa ao comerciante e não há fonte (a contribuição patronal é despesa, não situação de regularidade).
- **Salário do mês pago:** exige competência (mês) no mart e data de pagamento, que não achamos nos models. Story de dados própria.
- **Fornecedores locais pagos em dia:** produto novo.
- **Duração da obra paralisada** como critério da etiqueta: só com dado confirmado.
- **Ideb em queda como gatilho:** descartado nesta epic (ver acima).

**Release:** as Stories 27.1 a 27.3 vão no release. A 27.4 entra se ficar pronta a tempo; senão vai logo depois.

---

### Story 27.1: Contrato de Dados da Home (Mínimos, Etiqueta com Motivo e Estados)

As a citizen opening the portal,  
I want the home to show the same numbers as the Saúde and Educação pages,  
So that a card on the home never contradicts the page it links to.

**Origem:** sessão de 2026-11-09. Base das Stories 27.2 e 27.3. **Sem mudança visual.**

**Acceptance Criteria:**
- **Given** o loader da home em `apps/web/app/[portalSlug]/loader.ts`
- **When** a story termina
- **Then** o loader passa a trazer o mínimo de saúde (a mesma query `getSaudeMinimoConstitucional` da página de saúde) e o mínimo de educação (a mesma fonte `siope.minimos.mde` da página de educação), cada um com `limite`, `percentualAplicado`, `resultado`, `baseLegal` e `urlBaseLegal`.
- **And** o percentual exibido na home é **idêntico** ao da página interna no mesmo ano e portal; há teste de paridade entre as duas (Regra 2: nada é recalculado na tela).
- **And** `@transparencia/db` devolve, por área (saúde, obras, educação), `emAtencao` (booleano) e `motivo` (código em snake_case, Regra 10): `abaixo_minimo` quando o resultado do mínimo é `abaixo` **e o ano está fechado**; `obra_paralisada` quando `ResumoObrasDTO.paralisadas` é maior que zero. A tradução em frase é da camada de apresentação.
- **And** `parcial`, `sem_dado`, apagão da farmácia e queda do Ideb **nunca** geram `emAtencao`; há teste para cada um desses casos.
- **And** o estado de cada área é expresso por um valor tipado (`normal`, `parcial`, `abaixo`, `sem_dado`, `indisponivel`), sem ternário aninhado (Regra 13) e sem tautologia (Regra 14).
- **And** quando uma fonte falha ou não existe para o município, a área vem como `indisponivel` e o loader **não derruba a página** (mesma tolerância que `getResumoFarmaciaSus(...).catch` já tem).
- **And** nenhum literal de município, UF ou ano (Regra 23); campos em `camelCase` (Regra 18).
- **And** `make test/ts` (ou `pnpm test`) e `pnpm typecheck` passam, com testes novos no `loader.spec.ts` e no `view-model.spec.ts`.

**Fora do escopo:** qualquer componente ou mudança visual; o 13º e a janela do 13º (Story 27.4, que traz o próprio dado ao loader).

**Dependências:** nenhuma. Pré-requisito da 27.2.

---

### Story 27.2: Card de Situação (Saúde, Obras e Educação)

As a citizen with little time,  
I want each city area to answer one question in a sentence, with the rule that backs it,  
So that I know how the city is doing before reading any table.

**Origem:** sessão de 2026-11-09 (mockup "Card de situação" e "D · Estados dos cards").

**Acceptance Criteria:**
- **Given** os dados da Story 27.1
- **When** a home carrega
- **Then** a seção "Como está a cidade hoje" (`h2`) mostra, na **ordem fixa** Saúde, Obras, Educação, um card por área com: `eyebrow` da área, pergunta em `h3` ("Tem remédio no posto de saúde?", "As obras da cidade estão andando?", "A educação da cidade está melhorando?"), resposta curta em `stat-value`, a linha "Fonte:" em `caption` com as fontes **com link** (`FONTES_OFICIAIS`, nova aba, `rel="noopener noreferrer"`, seta `ArrowUpRight` do Lucide), "Ver detalhes" e "Compartilhar" (rótulos da Regra 24), no formato `panel` do `DESIGN.md`.
- **And** a **Saúde** tem como manchete o estado do estoque da farmácia e reaproveita a busca de remédio (`farmacia-busca-destaque`); o mínimo de saúde aparece como linha de apoio ("A Prefeitura aplica o mínimo exigido em saúde?"), com barra quadrada, traço do mínimo e a base legal vinda de `urlBaseLegal` (Regra 20, `target="_blank"` e `rel="noopener noreferrer"`).
- **And** a **Educação** tem como manchete a nota do Ideb com "era X" ao lado; quando a nota sobe ou cai, a seta `ArrowUp`/`ArrowDown` do Lucide vem antes do texto, e seta e texto ficam juntos em `ok-text` (subiu) ou `warn-text` (caiu); o leitor de tela ouve "subiu" ou "caiu", e o texto de compartilhar diz "(caiu, era X)"; o mínimo de educação aparece como linha de apoio, no mesmo padrão. A meta do Ideb é exibida como contexto, sem tom de limite legal.
- **And** **Obras** mostra "N em andamento" como manchete e as paradas ao lado ("1 parada", "M paradas" ou "nenhuma parada"); com a etiqueta, o complemento das paradas **some**, porque o motivo já diz quantas estão paradas; sem nenhuma obra em andamento nem parada, a manchete passa a ser as não iniciadas ("15 não iniciadas"), com as concluídas ao lado, e, sem não iniciadas, as concluídas; nunca "0 em andamento" sozinho.
- **And** a proporção por situação fica em barra quadrada segmentada (`h-3`, `gap-px` entre as partes, proporção por `flex-grow`), na ordem do ciclo da obra: concluídas (`ok-fill`), em andamento (`brand-fill`), paradas (`warn-fill`) e não iniciadas (`faint`), mais canceladas (`mute3`) só quando houver; o total da barra é a soma das partes desenhadas, então nenhum pedaço fica sem status na legenda; com legenda e o mini mapa que já existe, sem recalcular contagens na tela.
- **And** as barras do mínimo legal usam o `ThresholdMeter` do `packages/ui` (marcador no mínimo, tom `warn` quando abaixo), nunca uma barra desenhada à mão.
- **And** os **estados** seguem o canvas: `parcial` mostra "Em andamento: X% aplicados até agora" sem veredito; `abaixo` mostra "Ainda não:" em tom de atenção (âmbar, nunca vermelho) com `emAtencao`; `sem_dado` **omite** a linha da régua; cidade sem obras ou sem resumo de educação **não renderiza** o card e os demais dividem a linha.
- **And** a etiqueta "Merece atenção" aparece **somente** quando `emAtencao` é verdadeiro e **sempre acompanhada do motivo escrito** em uma linha ("2 obras estão paradas.", "Aplicou menos que o mínimo exigido no ano."); a etiqueta nunca aparece sozinha.
- **And** com a farmácia em **apagão** o card de saúde mostra "Sem informação de estoque" com o texto atual ("isso não quer dizer que falta remédio"), o link da Lei 14.654/2023, **mantém "Copiar requerimento" e "Compartilhar no WhatsApp"**, esconde a busca e **não leva etiqueta**; a borda é neutra.
- **And** com a farmácia `indisponivel` o card de saúde tem comportamento **a decidir com o Julio no início da story** (proposta: o mínimo de saúde vira a manchete única do card; se também não houver mínimo, o card some).
- **And** o conteúdo do botão "Compartilhar" carrega o **período e a fonte** do dado, para não perder o contexto fora da página (por exemplo "2 obras paradas" sem data pode ser lido como abandono).
- **And** o componente fica em `apps/web/components/` (domínio, não em `packages/ui`), reusa `fmtPercent`, `fmtDate` e o `ModalDialog` onde couber, usa só os tokens do `DESIGN.md` (sem `slate-*`, sem `font-mono` fora de `table` e `numeric`) e os textos passam pelo `editor-cidadao`.
- **And** os cards ficam **empilhados**, um por linha, com 32px entre eles (`space-y-8`); dentro do card, a partir de `md`, a resposta fica à esquerda e o detalhe (busca de remédio, barra e mapa de obras, linha do mínimo) à direita, com "Ver detalhes" e "Compartilhar" embaixo da resposta; no celular tudo empilha na ordem de leitura e as ações fecham o card. "Compartilhar" é discreto (sem borda), com alvo de toque de 44px. Sem altura fixa nem `min-height`.
- **Ajuste pós-implementação (2026-11-10):** a grade de 3 colunas da proposta original foi descartada na revisão visual com o Julio (colunas espremidas e espaço negativo demais); os critérios acima já refletem o layout aprovado na prancheta "E · Ajustes" do canvas.
- **And** não há ternário aninhado (Regra 13); `pnpm typecheck` e `pnpm test` passam, com teste por estado de cada card e teste de guarda de tokens (Story 20-12).

**Fora do escopo:** reordenação da página e remoção de blocos (Story 27.3); o 13º (Story 27.4).

**Dependências:** Story 27.1.

---

### Story 27.3: Reorganização da Home (Nova Ordem, Hero Rebaixado e Radar Fora)

As a citizen,  
I want the home to open by how the city is doing and only then show the accounts,  
So that I get the answer first and the technical detail only if I ask for it.

**Origem:** sessão de 2026-11-09 (mockups A e C).

**Acceptance Criteria:**
- **Given** a home em `apps/web/app/[portalSlug]/page.tsx`
- **When** a story termina
- **Then** a página segue a ordem: abertura compacta (`PageEyebrow` "Situação da cidade", `h1` com o nome do município vindo do portal e **uma linha** com a frase e o período em texto "Dados de {ano}, atualizados em {data}", a 32px da primeira seção; entre as demais seções, 48px no celular e 64px no desktop), "Como está a cidade hoje" (Story 27.2), espaço reservado ao bloco "Dinheiro que entra na cidade" (Story 27.4), "Para onde vai o dinheiro público" e "Mais detalhes".
- **And** **não existe seletor de ano** no conteúdo da home (o do sidebar e o do header continuam).
- **And** "Para onde vai o dinheiro público" traz o total arrecadado e o percentual da previsão em barra quadrada (`ThresholdMeter`, o hero fiscal rebaixado) e o saldo em caixa com a frase "Saldo disponível nas contas da Prefeitura", mais "Ver detalhes" para a página de orçamento. O valor principal segue a regra de **um `stat-value-lg` por página** do `DESIGN.md` (a decisão de qual valor ganha o `stat-value-lg` é conferida com o Julio no início da story).
- **And** o `RadarCivicoFeed` **sai da home** (componente e rota `/radar` permanecem) e o `PipelineExecucao` sai da home (continua na página de orçamento).
- **And** "Mais detalhes" lista atalhos para Despesas ("Em que a Prefeitura gastou"), Licitações ("Compras e contratações") e Pessoal ("Servidores e folha de pagamento"), no padrão de lista do `DESIGN.md`. **Confirmar com o Julio no início da story** que esses atalhos substituem os `CardsSecundariosVisaoGeral` (os cards com números de despesas, licitações e pessoal saem da home).
- **And** o `h1` é único, os níveis de título não se pulam e não há `h5` nem `h6` (`EXPERIENCE.md`).
- **And** `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` descrevem a nova home e o que mudou (Regra 12), sem detalhe interno de código.
- **And** `page.spec.tsx`, `view-model.spec.ts` e o `opengraph-image.tsx` da home continuam passando, sem município, UF ou ano fixos no texto (Regra 23: município vazio mostra "Municípios Integrados").
- **And** `pnpm typecheck` e `pnpm test` passam; `CHANGELOG.md` registra a mudança.

**Fora do escopo:** o bloco do 13º (27.4); feed de novidades; assistência social.

**Dependências:** Story 27.2.

---

### Story 27.4: Dinheiro que Entra na Cidade (13º Salário, Sazonal)

As a local shop owner,  
I want to know whether the city hall has started paying the 13th salary,  
So that I can plan my sales for the weeks when that money reaches the city.

**Origem:** sessão de 2026-11-09. O 13º interessa ao comerciante, não ao servidor. **Tem relógio:** a janela é novembro e dezembro; perder dezembro significa esperar um ano. **Pode andar em paralelo** às Stories 27.2 e 27.3 (só o encaixe na página depende da 27.3). Entra no release se ficar pronta a tempo.

**Decisões de 2026-11-09/10 (Julio):** (1) sem lei municipal nem seed por município (manter a lei de cada cidade não escala): a janela é regra única do portal, novembro e dezembro do ano corrente; (2) o card mostra só o **valor pago acumulado no ano**, sem percentual nem barra, porque o dado é anual, o empenhado ainda é parcial em novembro e municípios como Natividade pagam a primeira parcela em junho (2026: R$ 1,2 mi pago de R$ 1,2 mi empenhado, 100%); (3) o filtro do 13º no mart é corrigido; (4) a "folha do mês" **não entra**: ver "Fora do escopo".

**Por que "acumulado no ano":** o dado existente (`getExecucaoDecimoTerceiroMetrics`) é anual e não tem data de pagamento. A fonte não traz data de pagamento em nenhum dos municípios. A tela diz isso.

**Acceptance Criteria:**

*Correção do 13º no mart (`fct_pessoal_folha_metricas`):*
- **Given** o `pago_13` e o `empenhado_13` de hoje somam encargos e falsos positivos (em 2025, elemento 13 = R$ 85 mil em Natividade e R$ 650 mil em Porciúncula, cerca de 12% do `pago_13` dela; "DFD Nº 213" casa com `%13%`)
- **When** o mart é recalculado
- **Then** o 13º conta só os elementos de despesa **01, 03, 04, 11, 16 e 96** e **exclui o elemento 13** (obrigações patronais, multa e juros); aposentados e pensionistas (01 e 03) **entram**; o padrão de texto deixa de ser `%13%` solto e passa a ser "13º", "décimo terceiro" e "13 salário" com `unaccent` (Regra 11), mantendo as exclusões já existentes (anulação e tipo `AN`).
- **And** a mudança altera o `pago_13` também em `/pessoal`; os testes de paridade do mart e da página de pessoal são atualizados e o texto do `DecimoTerceiroCard` não promete "servidores" quando o valor inclui aposentados (Regra 15: dbt só no banco local; `make db/test/build` isolado, sem exportar a `DATABASE_URL` do banco local).

*Bloco "Dinheiro que entra na cidade" (card do 13º):*
- **Given** o ano ativo é o ano corrente e a data de hoje está em novembro ou dezembro (regra única do portal na camada de dados, sem seed, sem config por município e sem lei citada; Regra 23)
- **When** há dado do 13º para o portal
- **Then** a home mostra "Dinheiro que entra na cidade" (`h2`) entre "Como está a cidade hoje" e "Para onde vai o dinheiro público", com a pergunta "Quanto do 13º a Prefeitura já pagou este ano?", o valor pago acumulado em `stat-value` (sem percentual nem barra) e a frase "Valor pago acumulado no ano, inclusive parcelas pagas antes de novembro. Ainda não temos a data de cada pagamento." A descrição diz "servidores e aposentados".
- **And** fora da janela, ou sem dado do 13º, **a seção inteira some** (sem espaço reservado).
- **And** com `pago` igual a zero dentro da janela o texto é "Ainda sem informação de pagamento", **nunca** "atrasado" nem "não pagou" (dado não publicado não é dado de não pagamento).
- **And** "pago" é o estágio **pago** (não empenhado nem liquidado, `contador-publico`) e a leitura é um indício derivado, dito como tal na tela (Regra 27).
- **And** o loader da home passa a trazer o 13º para o ano ativo; esta story é dona desse dado e **não depende da Story 27.1**.
- **And** o texto "informados até dd/mm" não aparece: a única data disponível é a de extração do portal, já exibida na abertura.
- **And** o agregado é só da folha total, **sem dado individual de servidor** (LGPD).
- **And** o `contador-publico` valida os elementos de despesa e os estágios; o `editor-cidadao` valida os textos; `llms.txt`, `llms-full.txt` e `CHANGELOG.md` são atualizados (Regra 12).
- **And** `pnpm typecheck` e `pnpm test` passam, com testes: 13º dentro e fora da janela, sem dado, `pago` zerado; mart com e sem encargos (elemento 13) e com "DFD Nº 213".

**Fora do escopo:**
- **Folha do mês (salário pago no mês atual, último mês pago integralmente):** descartada em 2026-11-10 por fragilidade do dado. A fonte não traz data de pagamento, só o mês do empenho e o pago acumulado. Natividade empenha, liquida e paga junto (empenhado de folha dos ativos ÷ holerite entre 0,94 e 1,01 em 19 de 21 meses), mas Porciúncula empenha a folha em lotes de vários meses (razão de 0,03 a 3,97) e o holerite do mês corrente ainda não existe. Só volta com fonte de data de pagamento ou com empenho mensal nos municípios.
- Data de pagamento por competência, salário individual de servidor e previdência.

**Dependências:** nenhuma de dados. Só o encaixe na página depende da Story 27.3. Edita o mesmo `loader.ts` e o mesmo `view-model` da Story 27.1; se as duas andarem em paralelo, o conflito se resolve no merge. Altera o `pago_13` de `/pessoal`.

---

### Story 27.5: Ajustes da Home e do Layout (Resumo nos Atalhos, Compartilhar a Página, Sidebar Recolhível)

As a citizen,  
I want the home shortcuts to tell me what is behind each link, the card share to send the page itself, and the desktop sidebar to get out of the way,  
So that I decide where to go without guessing, the person I share with sees the page preview, and the content has more room.

**Origem:** pedidos do Julio em 2026-11-10, depois da revisão visual da home entregue nas Stories 27.2 a 27.4.

**Acceptance Criteria:**

*Resumo nos atalhos de "Mais detalhes"*
- **Given** a seção "Mais detalhes" da home
- **When** o cidadão a vê
- **Then** cada atalho (Despesas, Licitações e Contratos, Pessoal) mostra, na linha de baixo (`caption`), um **resumo do ano ativo em uma frase com número**, no lugar da descrição genérica atual (ex.: "R$ 48,1 mi pagos em {ano}", "{N} contratações em {ano}", "{N} servidores na folha de {mês}"). Os textos finais passam pelo `editor-cidadao`.
- **And** os números vêm das **mesmas queries** das páginas de destino em `@transparencia/db` (Regra 2), carregados no loader da home; nada é recalculado na tela.
- **And** sem dado para um atalho, a linha volta à descrição genérica atual (nunca "R$ 0" ou "0 servidores" como se fosse fato); ano em andamento marca o valor como parcial no próprio texto.
- **And** ano, mês e município são dinâmicos (Regra 23).

*Exemplos de remédio no card de Saúde*
- **And** os remédios de exemplo abaixo da busca viram **chips com borda** (`border-line`, raio de controle do `DESIGN.md`, altura de 32px, `gap-2`), no lugar dos links soltos de 44px que quebram linha com espaço sobrando. Alvo de toque de pelo menos 24px (WCAG 2.2 AA, 2.5.8). Decisão do Julio em 2026-11-10, entre linha corrida, chips e faixa com rolagem.

*Compartilhar do card = compartilhar a página*
- **And** o "Compartilhar" de cada card de situação usa o **mesmo comportamento do compartilhar global** (`ShareButton` do `packages/ui`: compartilhamento nativo do celular e, sem ele, cópia do link), passando a **URL da página de detalhe** do card (`/saude`, `/obras`, `/educacao`, com o ano ativo quando houver), para que quem recebe veja a imagem de prévia (open graph) daquela página.
- **And** o envio direto para `wa.me` com texto montado sai; o `textoCompartilhar` do modelo é removido se não tiver outro uso; o evento `situacao_card_compartilhado` continua, com `area` e `method`.

*Sidebar recolhível no desktop*
- **Given** o desktop (a partir do breakpoint em que a sidebar é fixa)
- **When** o cidadão aciona o botão de recolher a sidebar
- **Then** ela vira uma **faixa só de ícones** da navegação (Visão geral, Radar, Farmácia, temas e administrativo), **sem os filtros** (município, exercício, entidade) nem os controles do rodapé da sidebar; cada ícone tem nome acessível e dica (tooltip) com o nome da página; o item ativo continua marcado.
- **And** o conteúdo **e o rodapé global** passam a ocupar a largura liberada.
- **And** o botão de expandir fica visível na faixa; o estado **não é lembrado** entre visitas (decisão do Julio em 2026-11-10): toda visita abre expandida.
- **And** o celular não muda (header e menu atuais).

*Rótulo de "Reportar erro"*
- **And** o link "Reportar erro" do rodapé passa a deixar claro que serve **para sugestão ou erro** (proposta: "Sugestão ou erro"; texto final pelo `editor-cidadao`), e o título do `feedback-modal` acompanha.
- **And** a Story 23.5 (Epic 23, backlog) é atualizada para usar o mesmo rótulo por indicador. Verificado em 2026-11-10: não existia story de renomear; a 23.5 trata de levar o botão a cada indicador.

*Qualidade*
- **And** `pnpm typecheck` e `pnpm test` passam, com testes: resumo com e sem dado; card compartilhando a URL da página; sidebar recolhida sem filtros e com rodapé em largura total; `CHANGELOG.md`, `llms.txt` e `llms-full.txt` atualizados no que muda para o cidadão (Regra 12).

**Fora do escopo:** "Reportar erro" por indicador (Story 23.5); "Direito de resposta" está no backlog; lembrar a sidebar recolhida; mudanças no menu do celular.

**Dependências:** Stories 27.2 e 27.3 (done).

---

## Backlog de Dívida Técnica

Itens que não pertencem ao objetivo de nenhuma epic de produto. Entram na sprint só quando houver dor concreta (por exemplo, um review travado por causa do problema) e não bloqueiam nenhuma epic.

### Story TD.1: Idioma dos Identificadores: Varredura do Legado (opcional)

As a maintainer reading the codebase,  
I want the identifiers that still break rule 26 of `.claude/rules/typescript.md` renamed,  
So that infrastructure code is in English and domain terms stay in Portuguese everywhere.

**Origem:** decisão do Julio (2026-10-30), a partir da regra 26. Opinião do John (PM): a story não pertence à Epic 20, porque não muda o que o cidadão vê nem o padrão visual. A regra 26 e o renome oportunista (código tocado é renomeado na própria story) já resolvem a maior parte; esta story só existe para o que sobrar.

**Quando executar:** só se, no fim da Epic 20, a medição abaixo ainda achar ocorrências relevantes, ou se a dor for concreta. Se a medição der zero ou quase zero, a story é descartada.

**Escopo (por critério, não por lista de arquivos):** todo arquivo `.ts` e `.tsx` de `apps` e `packages` que, no início da story, ainda tiver identificador de infraestrutura em português, conforme a regra 26: nomes de funções utilitárias, helpers, constantes técnicas, variáveis locais, parâmetros, props de UI e tipos genéricos. A medição de partida (2026-10-29) achou 34 declarações em 22 arquivos, só de `const`, `let` e `function` com um verbo ou substantivo técnico conhecido, então é um piso e envelhece conforme as stories visuais tocam esses arquivos.

**Acceptance Criteria:**
- **Given** o estado do repositório no início da story
- **When** a story começa
- **Then** a medição é refeita (declarações, parâmetros, props, tipos e nomes de arquivo) e a lista de ocorrências fica registrada no spec; se for zero, a story termina descartada.
- **And** cada ocorrência da lista é renomeada para inglês quando for puramente de infraestrutura; termos que um contador ou advogado reconheceria (teste de fronteira da regra 26) permanecem em português, inclusive nomes mistos (o termo de domínio é preservado).
- **And** nenhum DTO, coluna, campo exportado de `@transparencia/db`, código de dados (regra 10), texto de UI nem descrição de `it(...)`/`describe(...)` é alterado.
- **And** o renome não muda comportamento: `pnpm typecheck`, `pnpm test` e `biome` passam sem alterar asserções.

**Fora do escopo:** arquivos de domínio, contratos de dados e lint de idioma (avaliar só se a regra escrita não bastar).

**Dependências:** nenhuma. Recomenda-se rodar depois do fim da Epic 20 para a medição pegar o código já migrado.


### Story TD.2: Gasto com Pessoal pelo Número Oficial do RGF (12 Meses)

As a citizen checking whether the Prefeitura respects the personnel spending limit,  
I want the percentage on `/pessoal` to be the official one from the Relatório de Gestão Fiscal (RGF),  
So that the comparison with the LRF limits (teto, prudencial e alerta) is the same one the Tribunal de Contas makes.

**Origem:** revisão do `contador-publico` em 2026-11-10, ao promover o "Gasto com Pessoal (LRF)" a destaque de `/pessoal`. Achados:
1. O percentual (`packages/db/src/queries/pessoal-metrics.ts`) divide a despesa com pessoal acumulada no ano pela receita corrente líquida acumulada no ano. A LRF mede 12 meses corridos (mês de referência mais os 11 anteriores, art. 18 §2 e art. 19): em ano fechado as janelas coincidem; no ano em andamento, não.
2. A receita corrente líquida vem de `fct_fontes_receita_metricas` e é estimada (descrição do mart), não a RCL publicada no RGF.
3. Quando `despesa_total_pessoal_lrf` vem zerada, a query usa `total_folha` no lugar, sem aviso.
4. `rclProxy` e `receitaCorrenteLiquida` são o mesmo valor com dois nomes.

**Paliativo já feito (commit `e61b0782`):** no ano em andamento a página não compara com o ano anterior nem dá veredito de limite, e sempre diz que o número é cálculo do portal com a receita corrente líquida estimada.

**Acceptance Criteria:**
- **Given** o RGF do Poder Executivo publicado no SICONFI (Anexo 1, Demonstrativo da Despesa com Pessoal)
- **When** o pipeline roda
- **Then** a despesa total com pessoal e a RCL ajustada de 12 meses de cada período publicado (quadrimestre ou semestre) ficam num mart com `portal_slug`, ano e período, sem literal de município, UF ou ano (CLAUDE.md §23), seguindo o desenho de schema por fonte da Epic 26.
- **And** `/pessoal` mostra o percentual oficial do último período publicado do ano selecionado, com o período (a API do SICONFI não devolve a data de publicação; decisão de 2026-11-11), e só ele recebe veredito contra os limites, que continuam vindo de `seed_constantes_fiscais`.
- **And** quando o RGF do período ainda não saiu, a página mostra a estimativa atual com o aviso de estimativa, sem veredito.
- **And** a troca de `despesa_total_pessoal_lrf` por `total_folha` ou deixa de existir ou aparece na tela como estimativa; `rclProxy` e `receitaCorrenteLiquida` viram um campo só, com nome que diga se é oficial ou estimado (regras 9 e 18).
- **And** o bloco oficial é autocontido: despesa com pessoal de 12 meses, RCL, percentual, período e data de publicação vêm todos do RGF; o total pago em folha do portal fica em bloco separado, com nota de que não é o número do RGF (competência, 12 meses, encargos); a diferença entre os dois só aparece em "Ver detalhes" e nunca se mistura numerador de uma fonte com denominador de outra.
- **And** a comparação com o ano anterior usa o mesmo período do RGF dos dois anos (por exemplo, 2º quadrimestre contra 2º quadrimestre).
- **And** os textos passam pelo `editor-cidadao` e a citação da LRF pelo `jurista-fiscal`, com link oficial (regra 20); `llms.txt` e `llms-full.txt` são atualizados.

**Fora do escopo:** Poder Legislativo (a página não cita a Câmara por ora) e o limite consolidado do município (60%).

**Implementação (2026-11-11):** extrator `elt/extract/siconfi_rgf.py` (RGF Anexo 01, Executivo municipal; periodicidade e período vêm da resposta da API), tabela `siconfi_rgf` no schema raw do portal, `fct_pessoal_rgf_metricas` (despesa de 12 meses, RCL ajustada e percentual do mesmo período), `getFolhaVsServicosMetrics` com `rgf` e `rgfAnoAnteriorMesmoPeriodo` (`rclProxy` removido, sem fallback para `total_folha`, comparadores `>`). Pendente: carga e conferência com dados reais (Porciúncula 2024, 3º quadrimestre: 53,46% sobre RCL ajustada de R$ 132,2 mi); confirmar com a API se Natividade 2024 realmente não tem RGF; revisão de texto pelo `editor-cidadao` e da citação pelo `jurista-fiscal`; migração para `raw_siconfi` na Story 26.5.

**Dependências:** confirmar com o `jurista-fiscal` a redação da janela de 12 meses e qual periodicidade (quadrimestral ou semestral) vale para cada município; Epic 26 para o padrão de schema por fonte.
