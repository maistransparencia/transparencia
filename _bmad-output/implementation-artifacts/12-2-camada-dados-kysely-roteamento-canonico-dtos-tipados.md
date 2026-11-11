---
baseline_commit: 4e7ed27a13d7ff887caae7cf71ba9ff91475c792
---

# Story 12.2: Camada de Acesso a Dados Kysely (`@transparencia/db`) com Roteamento Canônico e DTOs Tipados

Status: done

## Story

As a fullstack engineer developing civic interfaces,  
I want typed Kysely readers (`getRadarCivicoAlertas`) that return anomalies ordered by severity and civic relevance with pre-built deep links and contextual metrics,  
So that UI components and background dispatchers consume clean, functional data with zero business logic leakage.

---

## Acceptance Criteria

1. **Leitor Kysely de Anomalias Fiscais (`packages/db/src/queries/radar-civico-alertas.ts`):**
   - Implementar `getRadarCivicoAlertas(portalSlug, options)` para o mart `analytics.fct_anomalias_fiscais_metricas`.
   - Retornar DTOs tipados com chaves estritamente em `camelCase` (`tipoAnomalia`, `dimensaoReferencia`, `grauSeveridade`, `desvioPercentual`, `valorObservado`, `valorEsperado`, `deepLinkRota`, `mesInicial`, `mesFinal`), utilizando programação funcional imutável.
   - Incluir parâmetros dinâmicos de filtro (portal, ano, severidade mínima e entidade) com ordenação prioritária por severidade decrescente (`critico` > `alto` > `moderado`), magnitude de impacto e desempate determinístico.
   - Preservar `searchParams` e âncoras temáticas relevantes nas rotas de destino (`deepLinkRota`).

2. **Leitor Kysely de Licitações em Aberto e em Andamento (`packages/db/src/queries/licitacoes-metrics.ts`):**
   - Implementar `getLicitacoesEmAndamentoMetrics(portalSlug, options)` e DTO `LicitacaoEmAndamentoDTO` para `analytics.fct_licitacoes`.
   - Normalizar classificadores e códigos em `lowercase snake_case` (`modalidade`, `situacao`) e suportar valores nulos para orçamentos não divulgados.

3. **Re-exportação e Governança:**
   - Re-exportar novos módulos e tipos em `packages/db/src/index.ts`.
   - Adicionar helpers de fixture e limpeza atômica em `packages/db/tests/fixtures/seed.ts`.
   - Validar cobertura completa com testes unitários e de integração em `packages/db/src/queries/__tests__/radar-civico-alertas.spec.ts` e `packages/db/src/queries/__tests__/licitacoes-metrics.spec.ts`.
