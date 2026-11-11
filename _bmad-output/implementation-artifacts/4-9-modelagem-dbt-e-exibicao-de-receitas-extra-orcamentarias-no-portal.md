---
baseline_commit: 0537f5c
generated_at: 2026-08-08T11:30:00-03:00
---

# Story 4.9: Modelagem dbt e Exibição de Receitas Extra-Orçamentárias no Portal

## Metadados

- Epic: 4 - Experiência Visual, Responsividade Mobile, SEO & Otimização para LLMs
- Story ID: 4.9
- Story Key: 4-9-modelagem-dbt-e-exibicao-de-receitas-extra-orcamentarias-no-portal
- Status: done
- Arquivo: _bmad-output/implementation-artifacts/4-9-modelagem-dbt-e-exibicao-de-receitas-extra-orcamentarias-no-portal.md

## User Story

Como munícipe / auditor de transparência municipal,
Quero consultar as receitas extra-orçamentárias (como retenções de tributos, consignações, cauções, depósitos e retenções de empréstimos em folha) na página de Receitas do portal,
Para que eu tenha visibilidade completa de todas as entradas de recursos financeiros geridos pelo município, além das receitas orçamentárias.

## Critérios de Aceitação (BDD)

**Given** a tabela raw `receita_extra_orcamentaria` (já declarada no `_sources.yml` com colunas `ano`, `empresa`, `codigo`, `descricao`, `valor`, `dtlan`, `empresanome`)
**When** a camada Staging for compilada via `stg_porciuncula_prefeitura__receita_extra_orcamentaria.sql`
**Then** os dados de entrada de receitas extra-orçamentárias devem ser limpos, fortemente tipados e enriquecidos com a dimensão obrigatória `portal_slug`.

**Given** o modelo de staging `stg_porciuncula_prefeitura__receita_extra_orcamentaria`
**When** a camada Intermediate `int_receitas_consolidadas.sql` for compilada no dbt
**Then** os dados extra-orçamentários devem ser integrados via `UNION ALL` no modelo `int_receitas_consolidadas.sql` sob a constante `tipo_receita = 'extra_orcamentaria'`, com `previsao_atualizada = 0` e `arrecadado_efetivo = valor`.
**And** não deve ser criado um novo modelo intermediário dedicado, mantendo a consolidação em `int_receitas_consolidadas.sql`.

**Given** a camada Intermediate unificada em `int_receitas_consolidadas` e `fct_receitas`
**When** os modelos Marts `fct_receita_extra_orcamentaria.sql` (para detalhamento de lançamentos) e `fct_fontes_receita_metricas.sql` (incorporando a métrica `receita_extra_orcamentaria_arrecadado`) forem compilados no dbt
**Then** os modelos devem ser configurados com materialização física (`materialized='table'`), calculando o somatório acumulado `receita_extra_orcamentaria_arrecadado` na tabela de métricas `fct_fontes_receita_metricas` por `portal_slug`, `empresa_id` e `ano`, além do detalhamento de lançamentos ordenados na `fct_receita_extra_orcamentaria`.
**And** os testes de integridade fiscais do dbt (`valor >= 0`) devem ser declarados no `schema.yml` correspondente.

**Given** o mart de métricas de receitas no banco PostgreSQL
**When** as funções leitoras atômicas `getFontesReceitaMetrics` e `getReceitasExtraOrcamentariasList` forem chamadas no `@transparencia/db`
**Then** `getFontesReceitaMetrics` deve retornar a métrica `receitaExtraOrcamentariaArrecadado` e `getReceitasExtraOrcamentariasList` deve retornar a listagem detalhada de lançamentos extra-orçamentários.
**And** ambas as funções leitoras devem executar queries Kysely puras ("pass-through") aplicando obrigatoriamente a cláusula `.where('portal_slug', '=', portalSlug)`.

**Given** a rota da aplicação web `apps/web/app/[portalSlug]/receitas`
**When** a página for renderizada pelo servidor Next.js
**Then** o loader (`loader.ts`) e a View Model (`view-model.ts`) devem buscar os dados de receitas extra-orçamentárias via leitores do `@transparencia/db`.
**And** a interface deve renderizar um card de KPI destacado ("Receitas Extra-Orçamentárias") no cabeçalho/resumo de receitas e uma seção com tabela detalhada exibindo Código, Descrição, Data de Lançamento e Valor Arrecadado.

**Given** a inclusão de novas métricas e visualizações públicas de transparência na web
**When** a implementação da story for concluída
**Then** os arquivos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` devem ser atualizados conforme a Regra 12 de `AGENTS.md`, descrevendo a nova disponibilidade dos dados de Receitas Extra-Orçamentárias para agentes de IA.

**Given** a execução dos gates de validação e compilação do projeto
**When** forem executados os comandos `make test`, `make test/ts` (ou `pnpm test`) e `pnpm build`
**Then** todas as suítes de testes fiscais (dbt/Python), testes de tipos/contratos (TypeScript/Kysely) e a compilação do Next.js devem rodar e passar com 100% de sucesso.

## Contexto da Epic e Valor

- A Epic 4 cuida da excelência da experiência visual, responsividade, SEO, integração com IA/LLMs e completude dos dados expostos ao cidadão.
- Reuso eficiente da arquitetura dbt: integração direta de receitas extra-orçamentárias no modelo intermediário existente `int_receitas_consolidadas.sql` sob `tipo_receita = 'extra_orcamentaria'`.
- A integração direta em `fct_fontes_receita_metricas.sql` permite manter a SSOT de métricas de receitas consolidada em um único mart de métricas de fontes de receita.

## Guardrails Arquiteturais Obrigatórios

### AD-5 e Multi-tenant
1. Todos os modelos dbt (staging, intermediate e marts) devem incluir a dimensão `portal_slug` no agrupamento e no schema.
2. Todas as funções de leitura em `@transparencia/db` devem exigir e filtrar por `portalSlug`.

### Regras do AGENTS.md
1. **Convenção de Nomes**: Proibido utilizar nomes abreviados (`rec_extra`, `val`, `desc`). Usar `receita_extra_orcamentaria_arrecadado`, `receitas_extra_orcamentarias`, `valor_arrecadado`, `descricao_receita`.
2. **Programação Funcional e Imutabilidade**: Transformações de dados na View Model web devem utilizar `.map`, `.filter`, `.reduce`.
3. **Modelos dbt**: Materialização física obrigatória nos marts (`materialized='table'`).
4. **Sincronização de Fontes**: `receita_extra_orcamentaria` já está em `_sources.yml`. O `make test` utilizará o setup automático para criar a tabela no banco efêmero de testes.
5. **Formatação SQL**: Sem alinhamento por espaços extras nas queries SQL dbt.
6. **Sincronização llms.txt**: Atualizar `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`.

---

## Tasks / Subtasks

- [x] **Task 1: Modelo Staging dbt (`stg_porciuncula_prefeitura__receita_extra_orcamentaria.sql`)** (AC: #1)
  - [x] Criar `elt/transform/models/staging/porciuncula_prefeitura/stg_porciuncula_prefeitura__receita_extra_orcamentaria.sql`.
  - [x] Selecionar campos `ano`, `empresa`, `codigo`, `descricao`, `valor`, `dtlan`, `empresanome` e adicionar `'porciuncula_prefeitura' AS portal_slug`.
  - [x] Criar `_stg_porciuncula_prefeitura__receita_extra_orcamentaria.yml` declarando documentação, chaves primárias e testes básicos.

- [x] **Task 2: Atualização do Modelo Intermediate (`int_receitas_consolidadas.sql`)** (AC: #2)
  - [x] Atualizar `elt/transform/models/intermediate/int_receitas_consolidadas.sql` adicionando a CTE `porciuncula_extra_orcamentaria` lendo de `stg_porciuncula_prefeitura__receita_extra_orcamentaria` com `tipo_receita = 'extra_orcamentaria'`, `previsao_atualizada = 0` e `arrecadado_efetivo = valor`.
  - [x] Incluir `porciuncula_extra_orcamentaria` na CTE `combined` via `UNION ALL`.
  - [x] Atualizar a documentação em `_int_receitas_consolidadas.yml`.

- [x] **Task 3: Modelos Marts dbt (`fct_receita_extra_orcamentaria.sql` e integração em `fct_fontes_receita_metricas.sql`)** (AC: #3)
  - [x] Criar `elt/transform/models/marts/fct_receita_extra_orcamentaria.sql` com `materialized='table'` para listagem detalhada por `portal_slug`, `ano`, `codigo`, `descricao`, `valor` e `data_lançamento`.
  - [x] Atualizar `elt/transform/models/marts/metrics/fct_fontes_receita_metricas.sql` adicionando a CTE de receitas extra-orçamentárias e a coluna `receita_extra_orcamentaria_arrecadado::numeric(15, 2)`.
  - [x] Executar `make test` para verificar a compilação do pipeline no banco de testes efêmero.

- [x] **Task 4: Leitores Burros Atômicos no `@transparencia/db`** (AC: #4)
  - [x] Atualizar `getFontesReceitaMetrics(portalSlug, ano)` em `@transparencia/db` para mapear a nova coluna `receitaExtraOrcamentariaArrecadado`.
  - [x] Criar função leitora `getReceitasExtraOrcamentariasList(portalSlug, ano)` em `@transparencia/db/src/queries/receitas-extra-metrics.ts` para a tabela detalhada.
  - [x] Exportar DTOs tipados no pacote.
  - [x] Executar `make test/ts` para garantir integridade e forte tipagem Kysely.

- [x] **Task 5: Integração Frontend na Página de Receitas (`apps/web/app/[portalSlug]/receitas`)** (AC: #5)
  - [x] Atualizar `loader.ts` da rota para buscar as métricas consolidadas (incluindo `receitaExtraOrcamentariaArrecadado`) e a listagem de receitas extra-orçamentárias.
  - [x] Atualizar `view-model.ts` para formatar os DTOs de receitas extra-orçamentárias para os componentes de UI.
  - [x] Adicionar um card de KPI "Receitas Extra-Orçamentárias" e uma seção com tabela informativa de lançamentos extra-orçamentários em `apps/web/app/[portalSlug]/receitas/page.tsx`.

- [x] **Task 6: Sincronização dos Arquivos de Leitura por LLMs (`llms.txt` e `llms-full.txt`)** (AC: #6)
  - [x] Atualizar `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` incluindo a descrição da métrica `receitaExtraOrcamentariaArrecadado` e do conjunto de dados extra-orçamentários disponível em `/receitas`.

- [x] **Task 7: Validação Final e Suíte de Testes** (AC: #7)
  - [x] Executar `make test` (validação de dbt e Python: 83 passed).
  - [x] Executar `make test/ts` (validação de tipos e leitores Kysely: 17 passed).
  - [x] Executar `pnpm build` (validação de compilação da web: 3/3 successful).

## Dev Agent Record

### Implementation Notes
- Criado o modelo de staging `stg_porciuncula_prefeitura__receita_extra_orcamentaria.sql` e seu contrato de testes `_stg_porciuncula_prefeitura__receita_extra_orcamentaria.yml`.
- Atualizado o modelo intermediário `int_receitas_consolidadas.sql` adicionando a CTE `porciuncula_extra_orcamentaria` (`tipo_receita = 'extra_orcamentaria'`) via `UNION ALL`.
- Criado o mart físico `fct_receita_extra_orcamentaria.sql` (`materialized='table'`) e seu schema contract `_fct_receita_extra_orcamentaria.yml`.
- Atualizado o mart SSOT `fct_fontes_receita_metricas.sql` incorporando a coluna `receita_extra_orcamentaria_arrecadado` (com isenção de filtro de árvore orçamentária para extra-orçamentárias) e sincronizado o schema contract `_fct_fontes_receita_metricas.yml`.
- Atualizada a função leitora `getFontesReceitaMetrics` e criada a leitora `getReceitasExtraOrcamentariasList` no `@transparencia/db`.
- Atualizada a rota web `/receitas` (`loader.ts`, `view-model.ts`, `page.tsx`) com card de KPI de receitas extra-orçamentárias e tabela detalhada de lançamentos.
- Sincronizados os guias de leitura por IA `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`.

### File List
- `elt/transform/models/staging/porciuncula_prefeitura/stg_porciuncula_prefeitura__receita_extra_orcamentaria.sql`
- `elt/transform/models/staging/porciuncula_prefeitura/_stg_porciuncula_prefeitura__receita_extra_orcamentaria.yml`
- `elt/transform/models/intermediate/int_receitas_consolidadas.sql`
- `elt/transform/models/marts/fct_receita_extra_orcamentaria.sql`
- `elt/transform/models/marts/_fct_receita_extra_orcamentaria.yml`
- `elt/transform/models/marts/metrics/fct_fontes_receita_metricas.sql`
- `elt/transform/models/marts/metrics/_fct_fontes_receita_metricas.yml`
- `packages/db/src/queries/fontes-receita-metrics.ts`
- `packages/db/src/queries/receitas-extra-metrics.ts`
- `packages/db/src/index.ts`
- `packages/db/src/__tests__/parity.test.ts`
- `apps/web/app/[portalSlug]/receitas/loader.ts`
- `apps/web/app/[portalSlug]/receitas/view-model.ts`
- `apps/web/app/[portalSlug]/receitas/page.tsx`
- `apps/web/public/llms.txt`
- `apps/web/public/llms-full.txt`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/4-9-modelagem-dbt-e-exibicao-de-receitas-extra-orcamentarias-no-portal.md`

## Change Log
- Implementação completa da Story 4.9: Modelagem dbt de receitas extra-orçamentárias, leitores atômicos Kysely, interface web na página de Receitas e sincronização de documentação LLM.
- Code Review concluído com aprovação total (0 ressalvas).
