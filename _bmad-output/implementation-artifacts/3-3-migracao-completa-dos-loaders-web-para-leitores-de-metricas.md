---
baseline_commit: ef2dd9f
generated_at: 2026-08-04T00:01:00-03:00
---

# Story 3.3: Migração Completa dos Loaders Web para Leitores de Métricas

## Metadados

- Epic: 3 - Reorganização da UI e Co-localização de Loaders no apps/web
- Story ID: 3.3
- Story Key: 3-3-migracao-completa-dos-loaders-web-para-leitores-de-metricas
- Status: done
- Arquivo: _bmad-output/implementation-artifacts/3-3-migracao-completa-dos-loaders-web-para-leitores-de-metricas.md

## User Story

Como desenvolvedor,
Quero migrar todos os route loaders em apps/web/app/[portalSlug] para consumir leitores *-metrics do @transparencia/db sempre que houver cobertura,
Para que a aplicação elimine dependência residual dos readers legados nos domínios cobertos e preserve 100% da paridade visual/funcional.

## Critérios de Aceitação (BDD)

Given os leitores atômicos de métricas já existentes em @transparencia/db (getPosicaoFiscalMetrics, getAnaliseDespesasMetrics, getExecucaoOrcamentariaMetrics, getFontesReceitaMetrics, getHistoriaCapremMetrics, getHistoriaSaudeMetrics)
When os loaders das rotas de domínio em apps/web/app/[portalSlug]/ forem refatorados
Then toda rota com cobertura de métricas disponível passa a buscar dados exclusivamente via leitores *-metrics, preservando o filtro obrigatório por portalSlug.

And o objetivo desta story é eliminar a dependência dos readers legados atuais na aplicação web para os domínios cobertos, mantendo apenas fluxos orientados a métricas.

And para cada domínio sem cobertura total de DTO métrico (campos detalhados ainda não materializados), deve ser aberto e documentado um plano de extensão de métricas no dbt, analisado caso a caso (uma métrica por vez), com decisão explícita de implementação antes de qualquer mudança no loader.

And qualquer fallback legado temporário deve ser excepcional, explicitamente rastreado com prazo de remoção no artefato da story, e não pode ser considerado estado final da migração.

And nenhum loader de rota principal deve depender de agregação runtime em TypeScript para totais fiscais já cobertos por marts de métricas.

And todos os contratos de props dos componentes em apps/web/components permanecem estáveis, preservando 100% da paridade visual e funcional existente (NFR5).

And a suíte completa de validação (make test, make test/ts, pnpm build) passa com sucesso.

And é produzido um mapa de rastreabilidade por rota (reader legado anterior -> reader de métricas adotado -> gaps remanescentes -> decisão de implementação dbt), anexado aos artefatos da implementação.

## Contexto da Epic e Valor

- Story 3.1 concluiu a migração dos componentes de domínio para apps/web/components.
- Story 3.2 concluiu a co-localização de loaders/view-model por rota.
- Esta Story 3.3 fecha a transição arquitetural de dados na camada web: loaders passam a priorizar readers de métricas e removem dependência residual de readers legados onde houver cobertura.

## Guardrails Arquiteturais Obrigatórios

### AD-1 e AD-3 (SSOT dbt + leitor burro tipado)

1. Toda métrica fiscal na web deve vir de marts dbt via readers de métricas.
2. Não reintroduzir SUM/GROUP BY de dados transacionais em loaders web.
3. Se o reader de métricas existir para o domínio coberto, ele é obrigatório.

### AD-4 (co-localização e separação de responsabilidades)

1. page.tsx permanece apenas como orquestração/render.
2. loader.ts faz IO com @transparencia/db.
3. view-model.ts compõe props finais sem consultar banco diretamente.

### AD-5 (multi-tenant obrigatório)

1. portalSlug deve ser propagado de params para todos os loaders e readers que exigem tenant.
2. Readers de métricas com empresaIds devem receber array não-vazio.
3. Não permitir fallback silencioso de portalSlug vazio.

### AD-6 (qualidade e regressão)

1. Mudança só é concluída com make test, make test/ts e pnpm build verdes.
2. Paridade visual e funcional é mandatória (sem remoção de blocos/gráficos/tabelas).

## Requisitos Técnicos de Biblioteca e Framework

- next: 16.2.11
- react: 19.2.8
- nuqs: 2.9.1
- Reusar apenas dependências já instaladas (não introduzir libs novas nesta story).
- Seguir política do repositório de versões exatas em novos pacotes (se houver necessidade futura).

## Estado Atual dos Arquivos UPDATE (lidos)

### apps/web/app/[portalSlug]/loader.ts

- Hoje usa readers legados: getPosicaoFiscal, getExecucaoOrcamentaria, getLicitacaoGaps, getFontesReceita, getFolhaVsServicos, getPercentualChefiasEfetivas.
- Mudança desta story: migrar os blocos cobertos para getPosicaoFiscalMetrics, getExecucaoOrcamentariaMetrics e getFontesReceitaMetrics.
- Preservar: shape esperado do view-model da visão geral e ordens dos cards.

### apps/web/app/[portalSlug]/despesas/loader.ts

- Hoje usa readers legados de despesas, concentração, diárias e restos.
- Mudança desta story: adotar getAnaliseDespesasMetrics no que for coberto e manter fallback explícito apenas para blocos sem cobertura.
- Preservar: KPIs, HHI, diárias, restos e estruturas usadas pelo view-model.

### apps/web/app/[portalSlug]/receitas/loader.ts

- Hoje usa getFontesReceita e não recebe portalSlug no contrato.
- Mudança desta story: assinatura com portalSlug e migração para getFontesReceitaMetrics.
- Preservar: cálculo de variação anual, alerta de dependência e tabela por origem.

### apps/web/app/[portalSlug]/orcamento/loader.ts

- Hoje usa getExecucaoOrcamentaria e getOrcamentoFuncional sem portalSlug explícito.
- Mudança desta story: assinatura com portalSlug e adoção de getExecucaoOrcamentariaMetrics para o núcleo.
- Preservar: funil, KPIs e listagens por órgão/função.

### apps/web/app/[portalSlug]/saude/loader.ts

- Hoje usa getHistoriaSaude(selectedYear) sem portalSlug.
- Mudança desta story: assinatura com portalSlug e adoção de getHistoriaSaudeMetrics para o que estiver coberto.
- Preservar: seções de hero, tendências, contratação e emendas sem regressão visual.

### apps/web/app/[portalSlug]/caprem/loader.ts

- Hoje usa getHistoriaCaprem(portalSlug, ano, null).
- Mudança desta story: adotar getHistoriaCapremMetrics quando aplicável, respeitando regra de portal específico.
- Preservar: blocos atuariais e contratos de props dos componentes CAPREM.

### apps/web/app/[portalSlug]/pessoal/loader.ts

- Hoje 100% legado; não há reader de métricas dedicado.
- Mudança desta story: manter explicitamente marcado como gap de cobertura e abrir plano de extensão métrica.
- Preservar: KPIs de folha, chefias, 13o e distribuição sem quebra.

### apps/web/app/[portalSlug]/licitacoes/loader.ts

- Hoje 100% legado; não há reader de métricas dedicado.
- Mudança desta story: manter explicitamente marcado como gap de cobertura e abrir plano de extensão métrica.
- Preservar: distribuição por modalidade, fracionamento e alertas.

### packages/db/src/index.ts e readers de métricas

- Exports de métricas já existem para posição fiscal, execução, fontes, despesas, saúde e CAPREM.
- Mudança desta story: expandir/ajustar exports apenas se novos readers de métricas forem criados para cobrir gaps.
- Preservar: contratos públicos atuais e tipagem forte.

## Mapa de Rastreabilidade por Rota (atualizado ate Task 4)

1. Visão geral
- Reader anterior: getPosicaoFiscal/getExecucaoOrcamentaria/getFontesReceita.
- Reader atual: getPosicaoFiscalMetrics/getExecucaoOrcamentariaMetrics/getFontesReceitaMetrics + fallback legado pontual para detalhes não cobertos.
- Gaps remanescentes: restosPendentes e topCredoresAdmAtual no card fiscal; dependências de domínios sem reader dedicado (Pessoal/Licitações).
- Decisão: manter fallback explícito até expansão de marts; remover fallback até Story 3.5.

2. Despesas
- Reader anterior: getMetricasGeraisDespesas (+ complementares legados).
- Reader atual: getAnaliseDespesasMetrics para KPIs centrais (empenhado/liquidado/pago/taxas) + readers legados complementares.
- Gaps remanescentes: HHI, diárias, restos a pagar, concentração detalhada de fornecedores e impacto local.
- Decisão: fallback explícito mantido; expansão dbt planejada no backlog técnico abaixo com remoção de fallback até Story 3.6.

3. Receitas
- Reader anterior: getFontesReceita.
- Reader atual: getFontesReceitaMetrics.
- Gaps remanescentes: sem gap estrutural relevante no loader.
- Decisão: migração concluída sem fallback residual.

4. Orçamento
- Reader anterior: getExecucaoOrcamentaria/getOrcamentoFuncional.
- Reader atual: getExecucaoOrcamentariaMetrics (núcleo) + getOrcamentoFuncional (complemento).
- Gaps remanescentes: dimensão funcional detalhada ainda não consolidada em mart métrico dedicado.
- Decisão: manter complemento legado explícito e avaliar mart funcional até Story 3.6.

5. Saúde
- Reader anterior: getHistoriaSaude.
- Reader atual: getHistoriaSaudeMetrics para blocos cobertos (orçamento/farmacêutica/emendas) + getHistoriaSaude para narrativa detalhada.
- Gaps remanescentes: tendências, contratação detalhada e composição completa de fontes por regras históricas.
- Decisão: fallback controlado mantido; expansão de mart por blocos até Story 3.6.

6. CAPREM
- Reader anterior: getHistoriaCaprem.
- Reader atual: getHistoriaCapremMetrics para totais/atuarial cobertos + getHistoriaCaprem para granularidade histórica e natureza.
- Gaps remanescentes: séries anuais/mensais detalhadas, cadprev granular e composição de natureza completa no DTO métrico.
- Decisão: fallback controlado mantido; extensão de mart planejada até Story 3.6.

7. Pessoal
- Reader anterior: getFolhaVsServicos/getPercentualChefiasEfetivas/getExecucaoDecimoTerceiro/getDistribuicaoProventos/getDepartmentalPayroll.
- Reader atual: permanece legado (sem reader métrico dedicado).
- Gaps remanescentes: cobertura total de métricas.
- Decisão: criar marts/readers dedicados (backlog técnico abaixo) e remover legado até Story 3.7.

8. Licitações
- Reader anterior: getLicitacaoGaps/getAdesaoDeAta/getAdesaoExterna/getAnomaliasContratuais/getDistribucaoModalidades.
- Reader atual: permanece legado (sem reader métrico dedicado).
- Gaps remanescentes: cobertura total de métricas.
- Decisão: criar marts/readers dedicados (backlog técnico abaixo) e remover legado até Story 3.7.

## Backlog Técnico DBT para Gaps Remanescentes

1. Pessoal (prioridade alta)
- Novo mart proposto: fct_pessoal_metricas.
- Readers alvo: getFolhaVsServicosMetrics, getChefiasEfetivasMetrics, getDecimoTerceiroMetrics, getDistribuicaoProventosMetrics.
- Escopo mínimo: totais por ano/empresa/portal, percentuais de composição e séries anuais principais.
- Dependências: validação de chaves por portal_slug e padronização de categoria_funcional.
- Prazo alvo: implementar até Story 3.7 e remover fallback legado na sequência.

2. Licitações (prioridade alta)
- Novo mart proposto: fct_licitacoes_metricas.
- Readers alvo: getLicitacaoGapsMetrics, getAdesaoAtaMetrics, getAnomaliasContratuaisMetrics, getDistribuicaoModalidadesMetrics.
- Escopo mínimo: métricas por modalidade, adesão interna/externa, indicadores de fracionamento e concentração anual.
- Dependências: padronização de modalidades e normalização de fornecedores para séries comparáveis.
- Prazo alvo: implementar até Story 3.7 e remover fallback legado na sequência.

3. Saúde/CAPREM/Despesas (complementos)
- Saúde: ampliar fct_historia_saude_metricas para tendência anual, contratação e detalhamento de fontes.
- CAPREM: ampliar fct_historia_caprem_metricas para séries mensais/anuais e natureza detalhada.
- Despesas: criar mart complementar para HHI, restos e diárias com granularidade por portal/ano/empresa.
- Prazo alvo: Story 3.6 para eliminar os fallbacks controlados desses três domínios.

## Tasks / Subtasks

- [x] Task 1 - Normalizar contratos dos loaders para portalSlug explícito (AC: 1, 2)
  - [x] Ajustar assinatura de loadReceitasData, loadOrcamentoData, loadLicitacoesData e loadSaudeData para receber portalSlug.
  - [x] Atualizar chamadas em page.tsx correspondentes.

- [x] Task 2 - Migrar domínios com cobertura métrica direta (AC: 1, 2)
  - [x] Receitas: trocar getFontesReceita por getFontesReceitaMetrics.
  - [x] Orçamento (núcleo): trocar getExecucaoOrcamentaria por getExecucaoOrcamentariaMetrics.
  - [x] Visão geral (núcleo): trocar posição fiscal, execução e fontes para readers de métricas.

- [x] Task 3 - Migrar por blocos em domínios parcialmente cobertos (AC: 1, 3)
  - [x] Despesas: usar getAnaliseDespesasMetrics nos blocos cobertos e manter fallback explícito para não cobertos.
  - [x] Saúde: usar getHistoriaSaudeMetrics para blocos cobertos com fallback controlado.
  - [x] CAPREM: usar getHistoriaCapremMetrics para blocos cobertos com fallback controlado.

- [x] Task 4 - Rastrear gaps e plano dbt (AC: 3, 4, 8)
  - [x] Criar/atualizar artefato de rastreabilidade por rota com: reader atual, reader métrico adotado, gap remanescente, decisão e prazo de remoção de fallback.
  - [x] Registrar backlog técnico para métricas de Pessoal e Licitações.

- [x] Task 5 - Hardening de guardrails de tenant e empresas (AC: 1, 2, 5)
  - [x] Garantir propagação de portalSlug em todos os fluxos web dessa story.
  - [x] Garantir empresaIds não-vazio ao chamar readers de métricas que exigem agregação multiempresa.
  - [x] Eliminar caminhos de fallback silencioso com slug vazio.

- [x] Task 6 - Validação final e evidências (AC: 6, 7)
  - [x] Executar make test.
  - [x] Executar make test/ts.
  - [x] Executar pnpm build.
  - [x] Registrar no story resultado dos comandos e eventuais ajustes.

## Checklist Operacional Pós-Task 6 (Aposentar Legado)

- [ ] Etapa 1 - Gate de encerramento da Story 3.3
  - [ ] Consolidar evidências dos comandos finais e marcar Story 3.3 como concluída.
  - [ ] Confirmar que todos os fallbacks remanescentes estão rastreados com prazo de remoção.

- [ ] Etapa 2 - Story 3.5 (Visão Geral + Orçamento)
  - [ ] Definir escopo dbt para detalhes fiscais remanescentes da Visão Geral (restos pendentes e top credores).
  - [ ] Definir escopo dbt para dimensão funcional consolidada do Orçamento.
  - [ ] Implementar readers métricos dedicados e substituir fallback legado nesses dois loaders.
  - [ ] Validar paridade visual/funcional das duas rotas.

- [ ] Etapa 3 - Story 3.6 (Despesas + Saúde + CAPREM)
  - [ ] Despesas: criar cobertura métrica para HHI, diárias e restos.
  - [ ] Saúde: criar cobertura métrica para tendência anual, contratação e fontes detalhadas.
  - [ ] CAPREM: criar cobertura métrica para séries anuais/mensais, natureza e cadprev granular.
  - [ ] Remover fallbacks controlados nesses três loaders após validação.

- [ ] Etapa 4 - Story 3.7 (Pessoal + Licitações)
  - [ ] Criar mart `fct_pessoal_metricas` com readers alvo do domínio Pessoal.
  - [ ] Criar mart `fct_licitacoes_metricas` com readers alvo do domínio Licitações.
  - [ ] Migrar `apps/web/app/[portalSlug]/pessoal/loader.ts` para readers `*-metrics`.
  - [ ] Migrar `apps/web/app/[portalSlug]/licitacoes/loader.ts` para readers `*-metrics`.

- [ ] Etapa 5 - Story 3.8 (Hard Cutover)
  - [ ] Remover imports/chamadas legadas substituídas.
  - [ ] Atualizar testes de paridade para contratos métricos finais.
  - [ ] Executar validação completa (`make test`, `make test/ts`, `pnpm build`) e registrar evidências.

- [ ] Done Criteria da fase
  - [ ] Nenhum loader de rota principal depende de agregação runtime para domínios cobertos.
  - [ ] Todos os fluxos usam `portalSlug` explícito sem fallback silencioso.
  - [ ] Todos os gaps de Pessoal e Licitações migrados para readers de métricas.

## Inteligência da Story Anterior (3.2)

- Padrão por rota (loader.ts + view-model.ts) já está estabelecido e deve ser mantido.
- A Story 3.2 preservou contratos visuais com sucesso; esta story não deve alterar componentes de domínio além do necessário para troca de fonte de dados.
- O fluxo de validação completa já foi executado com sucesso em 3.2 e é baseline obrigatório nesta story.

## Inteligência de Git Recente

- Commit relevante: c017056 (refactor financial data loading and view model construction).
- Arquivos de loaders/pages das oito rotas foram mexidos recentemente; o risco de regressão está concentrado em ajustes de assinatura de loaders e shape de dados dos view-models.
- Evitar alterações colaterais fora do escopo de loaders/readers.

## Requisitos de Testes

1. Testes obrigatórios:
- make test
- make test/ts
- pnpm build

2. Verificações funcionais mínimas por domínio:
- Visão geral, Despesas, Receitas, Orçamento, Saúde, CAPREM, Pessoal e Licitações renderizam sem erro.
- Query params (ano, entidades) permanecem funcionais.
- Nenhuma seção visual é removida.

3. Verificação de isolamento multi-tenant:
- Todas as chamadas de reader aplicáveis usam portalSlug explícito.

## Referências

- _bmad-output/planning-artifacts/epics.md
- _bmad-output/planning-artifacts/prds/prd-transparencia-2026-08-01/prd.md
- _bmad-output/planning-artifacts/architecture/architecture-transparencia-2026-08-01/ARCHITECTURE-SPINE.md
- _bmad-output/implementation-artifacts/3-2-co-localizacao-de-data-loaders-e-view-models-em-apps-web-app.md
- apps/web/app/[portalSlug]/loader.ts
- apps/web/app/[portalSlug]/despesas/loader.ts
- apps/web/app/[portalSlug]/receitas/loader.ts
- apps/web/app/[portalSlug]/orcamento/loader.ts
- apps/web/app/[portalSlug]/saude/loader.ts
- apps/web/app/[portalSlug]/caprem/loader.ts
- apps/web/app/[portalSlug]/pessoal/loader.ts
- apps/web/app/[portalSlug]/licitacoes/loader.ts
- apps/web/app/[portalSlug]/receitas/page.tsx
- apps/web/app/[portalSlug]/orcamento/page.tsx
- apps/web/app/[portalSlug]/licitacoes/page.tsx
- apps/web/app/[portalSlug]/saude/page.tsx
- packages/db/src/index.ts
- packages/db/src/queries/posicao-fiscal-metrics.ts
- packages/db/src/queries/analise-despesas-metrics.ts
- packages/db/src/queries/execucao-orcamentaria-metrics.ts
- packages/db/src/queries/fontes-receita-metrics.ts
- packages/db/src/queries/historia-saude-metrics.ts
- packages/db/src/queries/historia-caprem-metrics.ts

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Implementation Plan

- Task 1 executada primeiro para alinhar o contrato multi-tenant dos loaders com o padrão já usado em `caprem` e `pessoal`.
- A mudança foi mantida mínima: assinatura explícita com `portalSlug` nos loaders de receitas, orçamento, licitações e saúde, seguida da atualização imediata das chamadas em `page.tsx`.
- Validação focada: typecheck do app web com `pnpm exec tsc --noEmit -p apps/web/tsconfig.json` e conferência de diagnósticos zero nos arquivos tocados.

### Completion Notes List

- Story criada com análise exaustiva de épico, PRD, arquitetura, story anterior, histórico de git e estado atual dos loaders/readers.
- Mapa de rastreabilidade por rota incluído para cumprir exigência de migração controlada e auditável.
- Guardrails de tenant, empresaIds e regressão visual explicitados para prevenir desvios de implementação.
- Task 1 concluída: contratos de `loadReceitasData`, `loadOrcamentoData`, `loadLicitacoesData` e `loadSaudeData` agora exigem `portalSlug` explícito, com páginas atualizadas para propagar o tenant corretamente.
- Evidência da Task 1: `pnpm exec tsc --noEmit -p apps/web/tsconfig.json` executado com sucesso e `get_errors` sem diagnósticos nos oito arquivos alterados.
- Task 2 concluída: loaders de Receitas, Orçamento (núcleo) e Visão Geral (núcleo) migrados para readers `*-metrics`, com preservação do contrato consumido pelos view-models.
- Evidência da Task 2: `pnpm exec tsc --noEmit -p apps/web/tsconfig.json` executado com sucesso e `get_errors` sem diagnósticos nos três loaders alterados.
- Task 3 concluída: migração parcial por blocos em Despesas, Saúde e CAPREM com adoção de readers de métricas nos campos cobertos e fallback legado explícito/controlado para blocos ainda sem cobertura total.
- Evidência da Task 3: `pnpm exec tsc --noEmit -p apps/web/tsconfig.json` executado sem erros após a migração e commit `45826d9` com validação de hook (`biome check`) aprovada.
- Task 4 concluída: mapa de rastreabilidade atualizado para estado pós-Task 3 com reader atual por rota, gaps remanescentes e prazo alvo de remoção dos fallbacks.
- Evidência da Task 4: backlog técnico dbt registrado no artefato para Pessoal e Licitações, incluindo marts/readers alvo e janela de entrega (Stories 3.6/3.7).
- Task 5 concluída: loaders da story receberam validação explícita de `portalSlug` e os fluxos com readers de métricas passaram a falhar de forma explícita quando não há `empresaIds` resolvidos.
- Evidência da Task 5: `pnpm exec tsc --noEmit -p apps/web/tsconfig.json` executado sem erros após hardening em Visão Geral, Receitas, Orçamento, Despesas, Saúde, CAPREM, Licitações e Pessoal.
- Task 6 concluída: suíte final obrigatória executada com sucesso (`make test`, `make test/ts`, `pnpm build`), sem regressões funcionais detectadas.
- Evidência da Task 6: `make test` aprovou 82 testes; `make test/ts` aprovou a suíte Turbo/Vitest; `pnpm build` concluiu build de `@transparencia/db`, `@transparencia/ui` e `web` com sucesso.
- Gate final concluído na Story 3.4: 3.3 promovida para `done` após validação objetiva de `make test`, `make test/ts` e `pnpm build`.
- Evidência do gate final: `make test` aprovou 82 testes; `make test/ts` aprovou a suíte Turbo/Vitest; `pnpm build` passou com `HOME`/`XDG_CONFIG_HOME` isolados para evitar leitura do `auth.json` global do Vercel CLI.

### Debug Log

- 2026-08-04T01:25:35-03:00 - Story retomada para implementação. Status operacional movido para in-progress e Task 1 iniciada pela normalização explícita de `portalSlug` nos loaders/páginas de receitas, orçamento, licitações e saúde.
- 2026-08-04T01:31:00-03:00 - Task 1 concluída. Typecheck focado do `apps/web` passou após a atualização dos contratos e das chamadas.
- 2026-08-04T02:16:00-03:00 - Task 2 concluída. Receitas/Orçamento/Visão Geral migrados para readers de métricas, com typecheck focado do `apps/web` aprovado.
- 2026-08-04T18:00:00-03:00 - Task 3 concluída. Despesas/Saúde/CAPREM migrados por blocos para readers de métricas, com fallback legado explícito e commit `45826d9` validado por `biome check`.
- 2026-08-04T18:20:00-03:00 - Task 4 concluída. Rastreabilidade por rota consolidada com status pós-migração e backlog dbt formalizado para Pessoal/Licitações e complementos de Saúde/CAPREM/Despesas.
- 2026-08-04T18:45:00-03:00 - Task 5 concluída. Hardening de tenant/empresas aplicado nos loaders com validação de `portalSlug` e bloqueio explícito de chamadas métricas sem entidades resolvidas.
- 2026-08-04T20:30:00-03:00 - Task 6 concluída. Validação final completa executada (`make test`, `make test/ts`, `pnpm build`) com sucesso.
- 2026-08-04T21:30:00-03:00 - Gate final da Story 3.4 concluído. Story 3.3 encerrada como `done` após validação final e registro de evidências.

### File List

- _bmad-output/implementation-artifacts/3-3-migracao-completa-dos-loaders-web-para-leitores-de-metricas.md (UPDATED)
- _bmad-output/implementation-artifacts/3-4-validacao-final-e-gate-de-encerramento-da-story-3-3.md (UPDATED - gate final)
- _bmad-output/implementation-artifacts/sprint-status.yaml (UPDATED - gate final)
- apps/web/app/[portalSlug]/receitas/loader.ts (UPDATED)
- apps/web/app/[portalSlug]/receitas/page.tsx (UPDATED)
- apps/web/app/[portalSlug]/orcamento/loader.ts (UPDATED)
- apps/web/app/[portalSlug]/orcamento/page.tsx (UPDATED)
- apps/web/app/[portalSlug]/licitacoes/loader.ts (UPDATED)
- apps/web/app/[portalSlug]/licitacoes/page.tsx (UPDATED)
- apps/web/app/[portalSlug]/saude/loader.ts (UPDATED)
- apps/web/app/[portalSlug]/saude/page.tsx (UPDATED)
- apps/web/app/[portalSlug]/loader.ts (UPDATED)
- apps/web/app/[portalSlug]/despesas/loader.ts (UPDATED)
- apps/web/app/[portalSlug]/caprem/loader.ts (UPDATED)

## Change Log

- 2026-08-04 - Task 1 concluída: contratos de loaders normalizados para `portalSlug` explícito em receitas, orçamento, licitações e saúde, com páginas atualizadas e validação de typecheck do `apps/web` aprovada.
- 2026-08-04 - Task 2 concluída: migração de Receitas, Orçamento (núcleo) e Visão Geral (núcleo) para readers `*-metrics`, preservando o shape consumido pelos view-models e mantendo typecheck do `apps/web` verde.
- 2026-08-04 - Task 3 concluída: migração parcial de Despesas, Saúde e CAPREM para readers `*-metrics` nos blocos cobertos, mantendo fallback explícito para gaps e validando tipagem/hook no commit `45826d9`.
- 2026-08-04 - Task 4 concluída: artefato de rastreabilidade atualizado com reader atual/gaps/prazos e backlog técnico dbt definido para Pessoal, Licitações e complementos dos domínios parcialmente cobertos.
- 2026-08-04 - Task 5 concluída: guardrails de tenant/empresas reforçados com validação de `portalSlug` e proteção contra chamadas métricas com `empresaIds` vazio nos loaders da story.
- 2026-08-04 - Task 6 concluída: validação final executada e aprovada (`make test`, `make test/ts`, `pnpm build`), encerrando os critérios técnicos da Story 3.3.
- 2026-08-04 - Gate final da Story 3.4 concluído: Story 3.3 promovida para `done` após evidências finais de teste e build.

## Status Final

Current Status: done

Completion Note: Story 3.3 encerrada como done após o gate final da Story 3.4 e validação objetiva de testes/build.
