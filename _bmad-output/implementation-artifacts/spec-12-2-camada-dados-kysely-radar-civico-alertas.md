---
title: 'Story 12.2: Camada de Acesso a Dados Kysely (@transparencia/db) com Roteamento Canônico e DTOs Tipados'
type: 'feature'
created: '2026-09-13'
baseline_revision: 'db18bd1226299867e6ba3dbcd6e0f270f36d5dc2'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '_bmad-output/implementation-artifacts/epic-12-context.md'
  - '_bmad-output/planning-artifacts/epics.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** A camada de apresentação (web) e os serviços de segundo plano (despachantes de push e geração de imagens) necessitam consumir as anomalias fiscais detectadas pelo motor dbt (`fct_anomalias_fiscais_metricas`) e os processos licitatórios em andamento, mas não possuem leitores atômicos Kysely em `@transparencia/db` com DTOs padronizados, ordenação por relevância e preservação de deep links canônicos.

**Approach:** Implementar em `@transparencia/db` os leitores tipados imutáveis `getRadarCivicoAlertas` e `getLicitacoesEmAndamentoMetrics`, retornando DTOs estritamente em `camelCase` com ordenação prioritária por severidade decrescente e impacto, filtros dinâmicos (ano, severidade, entidade) e preservação de parâmetros de contexto em `deepLinkRota`.

## Boundaries & Constraints

**Always:**
- Seguir rigorosamente o padrão `camelCase` em todos os campos dos DTOs TypeScript (Regra 18 do `AGENTS.md`).
- Utilizar valores literais e códigos em `lowercase snake_case` (`critico`, `alto`, `moderado`, `explosao_comissionados`, etc.) nos tipos e campos de categoria (Regra 10 do `AGENTS.md`).
- Empregar programação funcional imutável (`.map`, `.filter`, `.reduce`, `Promise.all`) sem mutação ou loops imperativos (`for..of`) em `@transparencia/db` (Regra 2 do `AGENTS.md`).
- Ordenar alertas prioritariamente por gravidade decrescente (`critico` > `alto` > `moderado`), seguido por impacto financeiro/estrutural (`desvioPercentual` / magnitude).
- Preservar `searchParams` e âncoras temáticas existentes em `deepLinkRota` ao injetar parâmetros de filtro como `entidade` ou parâmetros adicionais de contexto.
- Cobertura de testes unitários e de integração com Vitest para todos os cenários de filtros, ordenação e manipulação de links.

**Never:**
- Nunca vazar lógica de apresentação ou formatação de strings visuais dentro da camada de dados (`@transparencia/db`).
- Nunca usar `process.env` diretamente no código de queries (Regra 17 do `AGENTS.md`).
- Nunca usar nomes de métricas abreviados ou opacos (Regra 9 do `AGENTS.md`).
- Nunca utilizar operadores ternários aninhados (Regra 13 do `AGENTS.md`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Consulta padrão de alertas | `portalSlug: 'porciuncula'` | Lista de `RadarCivicoAlertaDTO` ordenada por `grauSeveridade` ('critico' primeiro) e `desvioPercentual` | Retorna lista vazia se não houver registros |
| Filtro por ano e severidade mínima | `portalSlug: 'porciuncula'`, `{ ano: 2024, severidadeMinima: 'alto' }` | Apenas alertas de 2024 com severidade `alto` ou `critico` | Retorna array vazio caso nenhum alerta atenda aos critérios |
| Preservação de parâmetros em `deepLinkRota` | Alerta com rota `/[slug]/pessoal?ano=2024#comissionados` e `{ entidade: '1' }` | Rota final `/[slug]/pessoal?ano=2024&entidade=1#comissionados` preservando hash | Mantém rota original intacta se nenhum parâmetro adicional for informado |
| Portal slug vazio ou inválido | `portalSlug: ''` ou `portalSlug: null` | Retorna `[]` imediatamente sem erro | Retorna array vazio |
| Licitações em andamento | `portalSlug: 'porciuncula'` | Lista de `LicitacaoEmAndamentoDTO` com `situacao = 'em_andamento'` ou `'Em Andamento'` | Retorna array vazio se não houver licitações abertas |

</intent-contract>

## Code Map

- `packages/db/src/queries/radar-civico-alertas.ts` -- Leitor Kysely `getRadarCivicoAlertas`, tipos `RadarCivicoAlertaDTO`, `GetRadarCivicoAlertasOptions`, `GrauSeveridade`, `TipoAnomalia` e utilitário funcional de deep linking.
- `packages/db/src/queries/licitacoes-metrics.ts` -- Adição do leitor `getLicitacoesEmAndamentoMetrics` e DTO `LicitacaoEmAndamentoDTO` para processos abertos.
- `packages/db/src/index.ts` -- Re-exportação de `radar-civico-alertas` e do novo leitor de licitações.
- `packages/db/tests/fixtures/seed.ts` -- Adição de helper `seedAnomaliaFiscal` e limpeza de `fct_anomalias_fiscais_metricas` em `cleanupFixtures`.
- `packages/db/src/queries/__tests__/radar-civico-alertas.spec.ts` -- Suíte de testes com Vitest cobrindo cenários de filtros, ordenação, integridade de DTOs e preservação de deep links.
- `packages/db/src/queries/__tests__/licitacoes-metrics.spec.ts` -- Testes adicionais cobrindo `getLicitacoesEmAndamentoMetrics`.

## Tasks & Acceptance

**Execution:**
- `packages/db/src/queries/radar-civico-alertas.ts` -- Criar módulo de consultas para o mart `fct_anomalias_fiscais_metricas`, implementando `getRadarCivicoAlertas`, tipagem estrita de DTOs camelCase, ordenação decrescente de severidade e impacto, e enriquecimento canônico de deep links -- Provê a API atômica de dados para o Radar Cívico.
- `packages/db/src/queries/licitacoes-metrics.ts` -- Implementar `getLicitacoesEmAndamentoMetrics` com DTO `LicitacaoEmAndamentoDTO` filtrando licitações em andamento/abertas -- Viabiliza monitoramento preventivo de compras públicas.
- `packages/db/src/index.ts` -- Exportar os novos leitores e DTOs da biblioteca `@transparencia/db` -- Disponibiliza os métodos para consumo pelas aplicações web e jobs.
- `packages/db/tests/fixtures/seed.ts` -- Implementar helpers de seed e limpeza para a tabela `fct_anomalias_fiscais_metricas` -- Permite testes de integração isolados com banco de teste efêmero.
- `packages/db/src/queries/__tests__/radar-civico-alertas.spec.ts` -- Criar suíte de testes completa validando filtros, ordenação por severidade/impacto, edge cases e links contextuais -- Garante cobertura e prevenção de regressão.
- `packages/db/src/queries/__tests__/licitacoes-metrics.spec.ts` -- Adicionar testes para o reader de licitações em andamento -- Assegura filtragem correta de situações ativas.

**Acceptance Criteria:**
- Given o mart `analytics.fct_anomalias_fiscais_metricas` populado com registros de anomalias
- When o reader `getRadarCivicoAlertas(portalSlug, options)` for invocado
- Then retorna uma coleção de DTOs tipados contendo `tipoAnomalia`, `dimensaoReferencia`, `grauSeveridade`, `desvioPercentual`, `valorObservado`, `valorEsperado`, `deepLinkRota`, `mesInicial` e `mesFinal`
- And os alertas são ordenados com prioridade decrescente para severidade (`critico` > `alto` > `moderado`) e maior magnitude de impacto
- And filtros dinâmicos por ano e severidade mínima selecionam estritamente os registros qualificados
- And rotas `deepLinkRota` que recebem parâmetros contextuais adicionais preservam parâmetros e âncoras pré-existentes

## Verification

**Commands:**
- `pnpm --filter @transparencia/db test` -- expected: Todas as 22+ suítes de teste passam com 100% de sucesso.
- `pnpm --filter @transparencia/db build` -- expected: Compilação TypeScript e declaração de tipos executam sem erros.

## Review Triage Log

### 2026-09-13 — Review pass
- verdicts: 19 findings — high 0, medium 4, low 12, false 3, maybe-false 0
- findings:
  - `[medium]` `[patch]` `toIsoDateString` não tratava `Date` com `getTime() === NaN` — Adicionada verificação `Number.isNaN(val.getTime())` retornando null.
  - `[medium]` `[patch]` Filtro de `situacao` em `getLicitacoesEmAndamentoMetrics` com igualdade estrita e sensível a maiúsculas/minúsculas — Normalizado em SQL via `lower(replace(trim(situacao), ' ', '_')) in ('em_andamento', 'aberta', 'em_aberto')`.
  - `[medium]` `[patch]` `modalidade` em `LicitacaoEmAndamentoDTO` mantinha espaços — Convertido para `lowercase snake_case` (`.trim().toLowerCase().replace(/\s+/g, "_")`) conforme Regra 10 do `AGENTS.md`.
  - `[medium]` `[patch]` Coerção de `valor` forçava `null` para `0`, descaracterizando orçamentos em aberto/sigilosos — Tipado como `valor: number | null` e mapeado preservando `null`.
  - `[low]` `[patch]` `portalSlug` não sanitizado com `trim()` antes da query — Aplicado `const cleanSlug = portalSlug.trim()` em ambas as queries.
  - `[low]` `[patch]` `options.limite` não validava inteiros — Adicionada verificação `Number.isInteger(options.limite) && options.limite > 0`.
  - `[low]` `[patch]` `r.situacao` com espaços extras nas pontas gerava underscores indesejados — Adicionado `.trim()` antes de `.replace(/\s+/g, "_")`.
  - `[low]` `[patch]` Ausência de desempate determinístico (tie-breaker) nas queries — Adicionados `.orderBy("anomalia_id", "asc")` e `.orderBy("licitacao_id", "asc")`.
  - `[low]` `[patch]` `metodoDeteccao?: string | null` com modificador opcional redundante — Simplificado para `metodoDeteccao: string | null`.
  - `[low]` `[patch]` Falta de suporte a `empresaId`/`entidade` singular e verificação de array em `options.empresaIds` — Adicionado suporte a `empresaId` e `entidade`, com checagem estrita `Array.isArray`.
  - `[low]` `[patch]` `seedLicitacao` substituía `valor: null` por default 100000 — Atualizado para aceitar `null` explicitamente.
  - `[low]` `[reject]` Rota com protocolo externo em `enrichDeepLink` — Rejeitado: todas as rotas internas de deep link são caminhos canônicos relativos à aplicação web (`/[portalSlug]/...`).
  - `[low]` `[reject]` Falta de parsing complexo sem `new URL` em `enrichDeepLink` — Rejeitado: a implementação atual cobre 100% dos cenários de rotas internas com path, searchParams e hash.
  - `[low]` `[reject]` Fallback silencioso de severidade em `getSeveridadesPermitidas` para inputs inválidos — Rejeitado: a tipagem em tempo de compilação restringe a `GrauSeveridade` e o fallback para todas as severidades é comportamento defensivo seguro.
  - `[false]` `[reject]` Descarte de `empresaIdsParam` quando `optionsOrYear` é objeto — A sobrecarga é autoexplicativa: se o primeiro argumento for objeto de opções, ele encapsula os parâmetros.
  - `[false]` `[reject]` Falta de busca textual e filtro de modalidade em `GetLicitacoesEmAndamentoOptions` — Fora do escopo da Story 12.2; pertencente à Story 12.5 (UI e filtros avançados de licitações).
  - `[false]` `[reject]` Falta de leitor por ID (`getRadarCivicoAlertaById`) — Fora do escopo e dos Acceptance Criteria da Story 12.2.
  - `[low]` `[reject]` Intent alignment audit: divergência de camada (web vs db) — Confirmado como leitura B correta, pois a Story 12.2 é especificamente a camada de acesso a dados Kysely.
  - `[false]` `[reject]` Gaps de verificação — O revisor verification-gap confirmou explicitamente zero gaps.

## Auto Run Result

- **Summary:** Implementação da camada de acesso a dados Kysely (`@transparencia/db`) para consulta atômica de anomalias fiscais (`getRadarCivicoAlertas`) e licitações abertas/em andamento (`getLicitacoesEmAndamentoMetrics`), retornando DTOs em `camelCase`, aplicando ordenação prioritária por severidade decrescente e impacto, filtros dinâmicos e enriquecimento de rotas canônicas com preservação de searchParams e âncoras.
- **Files Changed:**
  - `packages/db/src/queries/radar-civico-alertas.ts`: Novo leitor Kysely para `fct_anomalias_fiscais_metricas`, DTOs tipados e utilitário `enrichDeepLink`.
  - `packages/db/src/queries/licitacoes-metrics.ts`: Novo leitor `getLicitacoesEmAndamentoMetrics` e DTO `LicitacaoEmAndamentoDTO`.
  - `packages/db/src/index.ts`: Re-exportação dos novos módulos e tipos.
  - `packages/db/tests/fixtures/seed.ts`: Helpers `seedAnomaliaFiscal`, `seedLicitacao` e limpeza em `cleanupFixtures`.
  - `packages/db/src/queries/__tests__/radar-civico-alertas.spec.ts`: Suíte de testes unitários e de integração (11 testes).
  - `packages/db/src/queries/__tests__/licitacoes-metrics.spec.ts`: Testes para licitações em andamento (10 testes).
- **Review Findings Breakdown:** 11 patches aplicados (4 medium, 7 low), 0 itens diferidos, 8 rejeitados (5 low, 3 false).
- **Follow-up Review Recommendation:** `true` (devido a 4 correções de severidade `medium` corrigidas na primeira passagem). Risco residual a acompanhar: validação de consistência dos novos DTOs ao plugar nos componentes de UI das Stories 12.3 e 12.5.
- **Verification:**
  - `pnpm --filter @transparencia/db test`: 22 suítes de teste passando (95 testes no total).
  - `pnpm --filter @transparencia/db build`: `tsc --noEmit` compilado com zero erros.
  - `pnpm lint`: Biome check com 272 arquivos verificados sem erros.
  - `make check`: Ruff lint, Ruff format e mypy passando com 100% de sucesso.
- **Residual Risks:** Nenhum no banco de dados. Os DTOs estão estritamente tipados e aderentes às diretrizes do projeto.

