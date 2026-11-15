---
baseline_commit: 17a9693
generated_at: 2026-08-04T23:30:00-03:00
---

# Story 3.5: Complemento Métrico de Visão Geral e Orçamento

## Metadados

- Epic: 3 - Reorganização da UI e Co-localização de Loaders no apps/web
- Story ID: 3.5
- Story Key: 3-5-complemento-metrico-de-visao-geral-e-orcamento
- Status: done
- Arquivo: _bmad-output/implementation-artifacts/3-5-complemento-metrico-de-visao-geral-e-orcamento.md

## User Story

Como dev de dados + web,
Quero ampliar a cobertura métrica para detalhes fiscais da Visão Geral e para o detalhamento funcional de Orçamento,
Para que loadVisaoGeralData e loadOrcamentoData removam os fallbacks legados restantes.

## Critérios de Aceitação (BDD)

**Given** os loaders de Visão Geral e Orçamento já migrados no núcleo para readers de métricas em Story 3.3
**When** os complementos métricos forem implementados no dbt e expostos por novos readers atômicos no @transparencia/db
**Then** os dois loaders removem os fallbacks legados remanescentes (`getPosicaoFiscal` e `getOrcamentoFuncional`) mantendo os mesmos contratos esperados pelos respectivos view-models.

**And** a camada @transparencia/db continua como leitor burro tipado (pass-through) sobre marts, sem agregação sobre dados transacionais brutos em runtime.

**And** todos os fluxos multi-tenant mantêm filtro obrigatório por `portal_slug` no dbt e por `portalSlug` em todos os readers/loaders.

**And** a paridade visual e comportamental das páginas de Visão Geral e Orçamento permanece 100% preservada.

**And** a suíte obrigatória de validação (`make test`, `make test/ts`, `pnpm build`) conclui com sucesso.

## Contexto da Epic e Valor

- Story 3.3 já migrou o núcleo de múltiplas rotas para readers `*-metrics` e deixou dois gaps explícitos para esta story:
  - Visão Geral: detalhes de restos pendentes e top credores ainda dependentes de `getPosicaoFiscal`.
  - Orçamento: detalhamento funcional ainda dependente de `getOrcamentoFuncional`.
- Story 3.4 fechou o gate final de estabilidade da 3.3.
- Esta story completa o corte do legado em duas rotas críticas antes da expansão para Despesas/Saúde/CAPREM (3.6).

## Guardrails Arquiteturais Obrigatórios

### AD-1 e AD-3 (SSOT dbt + leitor burro)

1. Toda métrica nova desta story deve nascer em marts dbt materializados como `table`.
2. Readers no @transparencia/db devem apenas ler marts com Kysely e mapear DTOs tipados.
3. Não reintroduzir SQL runtime em TypeScript sobre `fct_despesas`/`fct_receitas` para cálculos fiscais desta story.

### AD-4 (separação de responsabilidades)

1. `apps/web/app/[portalSlug]/loader.ts` e `apps/web/app/[portalSlug]/orcamento/loader.ts` fazem apenas orquestração IO.
2. `page.tsx` e `view-model.ts` devem permanecer sem acesso direto ao banco.
3. Não mover componentes de UI nesta story.

### AD-5 (multi-tenant)

1. Todo mart novo/ajustado deve preservar `portal_slug` no agrupamento.
2. Todo reader deve exigir `portalSlug` e `empresaIds` não-vazio quando houver consolidação multiempresa.
3. Proibido fallback silencioso de tenant vazio.

### AD-6 (qualidade)

1. Qualquer mudança em `elt/transform/models/` exige validação com `make test`.
2. Alterações TS/Kysely/loaders exigem `make test/ts` e `pnpm build`.
3. O encerramento da story depende de evidência objetiva dos 3 comandos.

## Descoberta de Artefatos Carregados

- Epics: `_bmad-output/planning-artifacts/epics.md`
- PRD: `_bmad-output/planning-artifacts/prds/prd-transparencia-2026-08-01/prd.md`
- Arquitetura: `_bmad-output/planning-artifacts/architecture/architecture-transparencia-2026-08-01/ARCHITECTURE-SPINE.md`
- UX: nenhum documento dedicado encontrado (contexto UX derivado de NFR5/paridade visual)
- Fatos persistentes (`project-context.md`): nenhum arquivo encontrado no workspace

## Estado Atual dos Arquivos UPDATE (lidos)

### apps/web/app/[portalSlug]/loader.ts

- Estado atual: usa readers métricos para núcleo (`getPosicaoFiscalMetrics`, `getExecucaoOrcamentariaMetrics`, `getFontesReceitaMetrics`), mas ainda chama `getPosicaoFiscal(...)` como fallback para `restosPendentesTotal`, `restosPendentesAnteriores` e `topCredoresAdmAtual`.
- Mudança desta story: substituir esse fallback por reader(s) métrico(s) dedicados para detalhes de restos/credores.
- Preservar: shape de `posicao` consumido por `buildVisaoGeralViewModel` e tabela de maiores credores.

### apps/web/app/[portalSlug]/orcamento/loader.ts

- Estado atual: usa `getExecucaoOrcamentariaMetrics` para o núcleo, mas mantém `getOrcamentoFuncional(...)` para `funcionalData`.
- Mudança desta story: trocar `getOrcamentoFuncional` por reader métrico dedicado para visão funcional consolidada.
- Preservar: saída `items`, `funcionalData` e `summary` sem quebra no `buildOrcamentoViewModel`.

### packages/db/src/queries/posicao_fiscal.ts

- Estado atual: query legada com SQL runtime em `fct_despesas` para restos pendentes e top credores.
- Mudança desta story: aposentar o uso no loader de Visão Geral.
- Preservar: semântica dos indicadores exibidos na UI (principalmente identificação de credores e pendências).

### packages/db/src/queries/orcamento_funcional.ts

- Estado atual: agrega em runtime (`funcao_nome`, `subfuncao_nome`, `dotacao_atualizada`, `empenhado`, `liquidado`, `pago`) a partir de `fct_despesas`.
- Mudança desta story: aposentar o uso no loader de Orçamento.
- Preservar: agrupamento por função/subfunção e métricas atualmente exibidas.

### elt/transform/models/marts/metrics/fct_posicao_fiscal_metricas.sql

- Estado atual: já materializa totais de posição fiscal por `portal_slug`, `empresa_id`, `ano`, incluindo `restos_pendentes_adm_anterior` e `restos_pendentes_adm_atual`.
- Gap para story: não entrega detalhamento de credores pendentes nem série de pendências no formato usado pela Visão Geral.

### elt/transform/models/marts/metrics/fct_execucao_orcamentaria_metricas.sql

- Estado atual: métrica consolidada por códigos de órgão/unidade/função/subfunção.
- Gap para story: `loadOrcamentoData` ainda depende de dados funcionais legados com nomes de função/subfunção.

## Estratégia Técnica Recomendada

1. Criar/ajustar marts para cobrir explicitamente os dois gaps de fallback.
2. Expor readers atômicos novos no @transparencia/db com contrato tipado e `satisfies`.
3. Atualizar os dois loaders para consumo exclusivo dos readers métricos.
4. Manter contratos de saída dos loaders estáveis para evitar regressão visual.

## Tarefas / Subtarefas

- [ ] Task 1 - Cobertura métrica para detalhes da Visão Geral (AC: 1, 2, 3)
  - [ ] Definir mart dedicado para credores/restos pendentes por `portal_slug`, `empresa_id`, `ano` (ex: `fct_posicao_fiscal_detalhes_metricas`), com campos suficientes para:
    - [ ] calcular `restosPendentesTotal` e `restosPendentesAnteriores`
    - [ ] construir ranking de `topCredoresAdmAtual`
  - [ ] Declarar schema/tests dbt para consistência numérica e chaves obrigatórias.
  - [ ] Se houver mudança de fonte/raw necessária, sincronizar `_sources.yml` conforme regra do repositório.

- [ ] Task 2 - Cobertura métrica para detalhamento funcional de Orçamento (AC: 1, 2, 3)
  - [ ] Criar reader métrico para funcional consolidado (preferência: novo mart dedicado com função/subfunção nomeadas e totais; alternativa: extensão segura do mart existente sem quebrar consumidores atuais).
  - [ ] Garantir que o reader retorne a estrutura necessária para substituir `getOrcamentoFuncional` sem transformação runtime sobre dados transacionais.

- [ ] Task 3 - Readers atômicos no @transparencia/db (AC: 1, 2, 3)
  - [ ] Implementar readers `*-metrics` para os dois novos blocos.
  - [ ] Exigir assinatura `(portalSlug, ano, empresaIds)` quando consolidar empresas.
  - [ ] Atualizar exports em `packages/db/src/index.ts`.

- [ ] Task 4 - Remoção de fallback legado nos loaders (AC: 1, 4)
  - [ ] Em `apps/web/app/[portalSlug]/loader.ts`, remover dependência de `getPosicaoFiscal`.
  - [ ] Em `apps/web/app/[portalSlug]/orcamento/loader.ts`, remover dependência de `getOrcamentoFuncional`.
  - [ ] Manter shape final esperado por `buildVisaoGeralViewModel` e `buildOrcamentoViewModel`.

- [ ] Task 5 - Validação completa e evidências (AC: 5)
  - [ ] Rodar `make test`.
  - [ ] Rodar `make test/ts`.
  - [ ] Rodar `pnpm build`.
  - [ ] Registrar evidências no Dev Agent Record.

### Review Findings

- [x] [Review][Decision] Política de classificação de administração para anos outlier — decisão aplicada: limitar por faixa válida de ano no mart (`ano >= administracao_min_valid_year` e `ano <= ano corrente`) antes do cálculo de `ano_atual`.
- [x] [Review][Patch] Filtro por ano impede cálculo de `restosPendentesAnteriores` e série histórica [packages/db/src/queries/posicao-fiscal-detalhes-metrics.ts:47]
- [x] [Review][Patch] `totalCredoresAdmAtual` retorna tamanho do top 5 em vez do total real de credores [packages/db/src/queries/posicao-fiscal-detalhes-metrics.ts:115]
- [x] [Review][Patch] Regressão de fallback na Visão Geral: sem `posicaoMetricas`, campos fiscais são zerados [apps/web/app/[portalSlug]/loader.ts:189]

## Inteligência da Story Anterior

### Story 3.4 (imediatamente anterior)

- Entrega focada em gate de validação; nenhuma expansão funcional nova.
- Resultado relevante: baseline de estabilidade confirmado para seguir com remoção de fallback na 3.5.

### Story 3.3 (base funcional direta)

- Já marcou explicitamente os dois gaps desta story e o alvo de remoção até 3.5.
- Padrões validados que devem ser reaproveitados:
  - uso obrigatório de `requirePortalSlug` e `requireEmpresaIdsForMetrics`
  - readers de métricas com `empresaIds` obrigatório
  - manutenção de contratos estáveis nos view-models

## Inteligência de Git Recente

Commits mais relevantes para o contexto:

1. `eecd400 feat(web): migra loaders core para readers metrics`
   - Arquivos: `apps/web/app/[portalSlug]/loader.ts`, `apps/web/app/[portalSlug]/orcamento/loader.ts`, `apps/web/app/[portalSlug]/receitas/loader.ts`
   - Insight: estes loaders já foram preparados para transição incremental; alterações devem ser cirúrgicas.

2. `45826d9 feat(web): migra blocos parciais para readers metrics`
   - Arquivos: `apps/web/app/[portalSlug]/caprem/loader.ts`, `despesas/loader.ts`, `saude/loader.ts`
   - Insight: padrão de fallback explícito já é conhecido e deve ser removido somente quando cobertura métrica estiver completa.

3. `fc01772 feat(web): reforca guardrails de tenant e empresaIds`
   - Arquivos: oito loaders de domínio no `apps/web/app/[portalSlug]/`
   - Insight: não enfraquecer guardrails de tenant/empresa durante a refatoração.

## Requisitos Técnicos de Bibliotecas e Framework

- Stack web atual (já em uso no projeto): `next 16.2.11`, `react 19.2.8`, `nuqs 2.9.1`.
- Kysely: manter padrão de query builder tipado e evitar SQL raw para lógica de negócio de agregação.
- dbt: manter materialização `table` para marts de métricas conforme AD-2.

## Pesquisa Técnica Atualizada (web)

1. Referência dbt (jul/2026): `materialized` define a estratégia de persistência; `table` segue sendo materialização válida e consistente para leitura previsível de marts fiscais.
2. Referência dbt (jul/2026): incremental continua recomendado apenas quando necessário por custo/volume; para esta arquitetura, manter `table` para SSOT de leitura rápida continua alinhado ao baseline atual.
3. Referência Kysely (repositório oficial): versão mais recente publicada observada `0.29.4`; manter compatibilidade do projeto sem introduzir troca de major/minor durante esta story.

## Riscos e Mitigações

1. Risco: regressão visual por alteração do shape de dados.
   - Mitigação: preservar contratos atuais dos loaders e validar páginas de Visão Geral/Orçamento após troca dos readers.

2. Risco: inconsistência de tenant em joins/marts novos.
   - Mitigação: checklist obrigatório de `portal_slug` no dbt + `portalSlug` em readers/loaders.

3. Risco: divergência numérica entre legado e métricas novas.
   - Mitigação: testes dbt de consistência, comparação lado-a-lado em cenário de validação e aprovação por `make test`.

## Checklist de Conclusão

- [ ] Fallback `getPosicaoFiscal` removido de `loadVisaoGeralData`.
- [ ] Fallback `getOrcamentoFuncional` removido de `loadOrcamentoData`.
- [ ] Readers métricos novos exportados e tipados no @transparencia/db.
- [ ] Marts/testes dbt atualizados e verdes.
- [ ] `make test`, `make test/ts` e `pnpm build` verdes.
- [ ] Story final marcada como `review` apenas após evidências objetivas.

## Referências

- _bmad-output/planning-artifacts/epics.md
- _bmad-output/planning-artifacts/prds/prd-transparencia-2026-08-01/prd.md
- _bmad-output/planning-artifacts/architecture/architecture-transparencia-2026-08-01/ARCHITECTURE-SPINE.md
- _bmad-output/implementation-artifacts/3-3-migracao-completa-dos-loaders-web-para-leitores-de-metricas.md
- _bmad-output/implementation-artifacts/3-4-validacao-final-e-gate-de-encerramento-da-story-3-3.md
- apps/web/app/[portalSlug]/loader.ts
- apps/web/app/[portalSlug]/orcamento/loader.ts
- packages/db/src/queries/posicao_fiscal.ts
- packages/db/src/queries/orcamento_funcional.ts
- packages/db/src/queries/posicao-fiscal-metrics.ts
- packages/db/src/queries/execucao-orcamentaria-metrics.ts
- elt/transform/models/marts/metrics/fct_posicao_fiscal_metricas.sql
- elt/transform/models/marts/metrics/fct_execucao_orcamentaria_metricas.sql

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Implementation Plan

1. Entregar cobertura dbt para os dois gaps (Visão Geral + Orçamento funcional).
2. Expor readers atômicos tipados no @transparencia/db.
3. Remover os dois fallbacks legados dos loaders.
4. Validar suíte completa e registrar evidências.

### Completion Notes List

- Story criada com contexto consolidado de épico, arquitetura, stories anteriores e inteligência de commits recentes.
- Guardrails explícitos incluídos para prevenir regressão de tenant, paridade visual e reintrodução de agregação runtime indevida.

### File List

- _bmad-output/implementation-artifacts/3-5-complemento-metrico-de-visao-geral-e-orcamento.md (CREATED)

## Status Final

Current Status: done

Completion Note: Ultimate context engine analysis completed - comprehensive developer guide created.
