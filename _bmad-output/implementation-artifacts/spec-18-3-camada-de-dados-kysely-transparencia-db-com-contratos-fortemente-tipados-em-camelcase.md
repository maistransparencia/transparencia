---
title: 'Story 18.3: Camada de Dados Kysely (@transparencia/db) com Contratos Fortemente Tipados em camelCase'
type: 'feature'
created: '2026-10-16'
status: 'done'
baseline_revision: '73224e0c6b75723f7a6f72d791c4af1cdbb4bc71'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-18-context.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** O MaisTransparência consolidou a fato analítica `fct_educacao_metricas` no dbt, mas a aplicação carece de uma camada de acesso a dados atômica, imutável e fortemente tipada em `@transparencia/db` para alimentar as rotas públicas de educação e o card resumo da homepage com isolamento estrito de tenant.

**Approach:** Implementar em `packages/db/src/queries/educacao-metrics.ts` as funções leitoras `getEducacaoMetrics` e `getResumoEducacao` utilizando Kysely e transformações funcionais puras, exportar DTOs estritos em `camelCase` (Regras 18 e 2), registrar seeds de teste em `packages/db/tests/fixtures/seed.ts` e validar conformidade através de suíte de testes com Vitest.

## Boundaries & Constraints

**Always:**
- Segregar toda a lógica contábil e de consulta em `packages/db/src/queries/educacao-metrics.ts` (Regra 2).
- Utilizar exclusivamente estilo funcional e transformações imutáveis (`.map()`, `.filter()`, `.reduce()`, `Promise.all`) sem mutação de estado ou loops imperativos (`for..of`, `for`) (Regra 2).
- Padronizar 100% dos identificadores, DTOs e propriedades de retorno em `camelCase` estrito (Regra 18).
- Tipar a etapa de ensino como `EtapaEnsino = 'anosIniciais' | 'anosFinais'` convertendo transparentemente de `anos_iniciais` / `anos_finais` (Regra 10 e 18).
- Aplicar isolamento estrito de tenant com `where('portal_slug', '=', portalSlug)` em todas as queries Kysely, prevenindo cross-tenant leakage (Regra 23).
- Tratar entradas nulas ou vazias de `portalSlug` retornando `[]` em `getEducacaoMetrics` e `null` em `getResumoEducacao`.
- Expor os leitores e tipos no ponto de entrada canônico `packages/db/src/index.ts`.
- Garantir que todos os testes passem via `pnpm --filter @transparencia/db test` e `make test/ts`.

**Never:**
- Nunca interpolar strings de consulta ou permitir SQL injection — utilizar os builders parametrizados do Kysely.
- Nunca hardcodar literais de tenant (`porciuncula_prefeitura`, `natividade_prefeitura`) nas queries de produção ou como fallbacks de busca (Regra 23).
- Nunca expor nomes de colunas do banco com underscores (`nota_ideb`, `etapa_ensino`) nas interfaces de saída (Regra 18).
- Nunca utilizar ternários aninhados em condicionais de mapeamento de dados (Regra 13).
- Nunca introduzir dependências externas desnecessárias no `package.json`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Consulta completa de séries históricas | `portalSlug: 'porciuncula_prefeitura'` | Retorna array de `EducacaoMetricDTO` ordenado por `ano asc, etapaEnsino asc` com dados do ciclo 2021 a 2025 | Retorna `[]` se nenhum registro for encontrado |
| Consulta com filtros opcionais | `portalSlug: 'porciuncula_prefeitura', options: { ano: 2025, etapaEnsino: 'anosIniciais' }` | Retorna apenas os registros compatíveis com os filtros especificados | Retorna `[]` em caso de incompatibilidade |
| Resumo executivo para homepage | `portalSlug: 'porciuncula_prefeitura'` | Retorna `ResumoEducacaoDTO` com os KPIs consolidados do ciclo mais recente (2025: nota 5,9, crescimento +1,4) | Retorna `null` se não houver dados no mart |
| Tenant inexistente ou inválido | `portalSlug: 'inexistente'` ou `''` ou whitespace | `getEducacaoMetrics` retorna `[]`; `getResumoEducacao` retorna `null` | Sanitização defensiva sem lançar exceções |
| Isolamento multi-tenant com fixtures | Dois portais distintos (`PORTAL_A` e `PORTAL_B`) gerados via `createFixturePortalSlug` | Dados semeados em `PORTAL_A` não são retornados nas consultas de `PORTAL_B` | Validação estrita por predicado de tenant |

</intent-contract>

## Code Map

- `packages/db/src/queries/educacao-metrics.ts` -- Arquivo principal de implementação dos leitores atômicos Kysely (`getEducacaoMetrics`, `getResumoEducacao`) e DTOs tipados em `camelCase`.
- `packages/db/src/index.ts` -- Ponto de exportação público do pacote `@transparencia/db` para consumo pelo frontend e loaders.
- `packages/db/tests/fixtures/seed.ts` -- Módulo de helpers de teste onde será adicionado `seedEducacaoMetricas` e atualizado `cleanupFixtures` para `fct_educacao_metricas`.
- `packages/db/src/queries/__tests__/educacao-metrics.spec.ts` -- Suíte de testes unitários Vitest validando recuperação de dados reais (Porciúncula e Natividade), mapeamento camelCase, filtros e isolamento multi-tenant.
- `packages/db/package.json` -- Adição do script `check-types: tsc --noEmit` para conformidade estrita com o critério de aceitação da Story 18.3.

## Tasks & Acceptance

**Execution:**
- `packages/db/package.json` -- Adicionar script `"check-types": "tsc --noEmit"` -- Permitir execução de `pnpm --filter @transparencia/db check-types`.
- `packages/db/src/queries/educacao-metrics.ts` -- Criar módulo com tipos (`EtapaEnsino`, `EducacaoMetricDTO`, `ResumoEducacaoDTO`, `GetEducacaoMetricsOptions`) e funções `getEducacaoMetrics` e `getResumoEducacao` -- Implementar leitura do mart `fct_educacao_metricas` em estilo funcional e imutável.
- `packages/db/src/index.ts` -- Re-exportar todos os tipos e funções de `./queries/educacao-metrics` -- Disponibilizar a API pública de educação no pacote.
- `packages/db/tests/fixtures/seed.ts` -- Implementar interface `EducacaoMetricaRow`, função `seedEducacaoMetricas` e registrar limpeza em `cleanupFixtures` -- Suportar criação e isolamento de cenários de teste efêmeros.
- `packages/db/src/queries/__tests__/educacao-metrics.spec.ts` -- Criar suíte completa de testes com Vitest -- Cobrir dados oficiais de Porciúncula e Natividade, ordenação, campos camelCase, valores nulos e isolamento de tenant.

**Acceptance Criteria:**
- Given o pacote `@transparencia/db`
- When o leitor `getEducacaoMetrics(portalSlug: string, options?: GetEducacaoMetricsOptions)` é invocado
- Then consulta a tabela `fct_educacao_metricas` filtrando estritamente por `where('portal_slug', '=', portalSlug)` (Regra 2 e Regra 23).
- And todas as propriedades de interfaces e DTOs utilizam rigorosamente a convenção camelCase (Regra 18):
  - `notaIdeb`, `metaIdeb`, `atingiuMeta`, `crescimentoPontosIdeb`.
  - `saebMatematica`, `saebLinguaPortuguesa`, `indicadorFluxoAprovacao`.
  - `despesaLiquidadaEducacao`, `totalMatriculasRedeMunicipal`, `custoAnualPorAluno`.
  - `etapaEnsino` (`'anosIniciais' | 'anosFinais'`).
- And implementa a função auxiliar `getResumoEducacao(portalSlug: string, ano?: number)` para alimentar o card de destaque da homepage com os KPIs mais recentes do ciclo 2025.
- And inclui suíte de testes unitários com Vitest em `packages/db/src/queries/__tests__/educacao-metrics.spec.ts` validando o retorno de Porciúncula (Ideb 5,9, crescimento de +1,4 ponto nos Anos Iniciais) e Natividade.
- And a validação de tipos passa sem erros (`pnpm --filter @transparencia/db check-types` e `make test/ts`).

## Spec Change Log

_None._

## Review Triage Log

### 2026-10-16 — Review pass
- verdicts: 10 findings — high 0, medium 1, low 5, false 4, maybe-false 0
- findings:
  - `[medium]` `[patch]` Hardcoded tenant default in test fixture seed (`packages/db/tests/fixtures/seed.ts:743`) — Alterado fallback de `r.codIbge ?? 3304102` para o valor neutro `r.codIbge ?? 0` cumprindo estritamente a Regra 23.
  - `[low]` `[patch]` Non-idempotent and brittle etapa conversion helpers (`packages/db/src/queries/educacao-metrics.ts:468-482`) — Helpers `toEtapaEnsino` e `toDbEtapaEnsino` tornados idempotentes, aceitando formatos snake_case e camelCase com fallback seguro.
  - `[low]` `[patch]` Inverted pedagogical ordering in `getEducacaoMetrics` (`packages/db/src/queries/educacao-metrics.ts:615`) — Alterada a ordenação de `etapa_ensino` para `desc` para que `anos_iniciais` preceda `anos_finais` no mesmo ciclo.
  - `[false]` `[reject]` Inefficient two-query pattern in `getResumoEducacao` (`packages/db/src/queries/educacao-metrics.ts:645-660`) — Padrão padrão e idiomático do Kysely utilizando busca rápida por índice de `MAX(ano)` seguido por busca particionada sem perda perceptível de performance.
  - `[low]` `[patch]` Fragile primary stage selection and fallback in `getResumoEducacao` (`packages/db/src/queries/educacao-metrics.ts:670-693`) — Implementados fallbacks cruzados robustos para `notaIdeb` e métricas financeiras caso uma das etapas não possua valores preenchidos.
  - `[low]` `[patch]` Unsafe boolean coercion in `toBooleanOrNull` (`packages/db/src/queries/educacao-metrics.ts:506-511`) — Implementado parsing seguro de booleanos prevenindo coerção espúria de strings `"false"` ou `"0"`.
  - `[false]` `[reject]` Abbreviated metric name in DTO violating Rule 9 (`packages/db/src/queries/educacao-metrics.ts:528`) — `variacaoSaebPortugues` mapeia diretamente a coluna canônica do mart `fct_educacao_metricas` definida na Story 18.2 em conformidade com as Regras 14 e 18.
  - `[false]` `[reject]` Missing previous cycle score (`notaAnterior`) in DTOs (`packages/db/src/queries/educacao-metrics.ts:513-550`) — `nota_anterior` não é coluna de `fct_educacao_metricas` e pertence à camada de apresentação/view model (Story 18.4).
  - `[false]` `[reject]` Redundant script in `packages/db/package.json:9` — `"check-types"` é requisito explícito dos critérios de aceitação da Story 18.3.
  - `[low]` `[patch]` Gaps in test coverage in `educacao-metrics.spec.ts` — Adicionados testes para idempotência dos helpers, conversão de booleanos em string, fallbacks de `getResumoEducacao` e ordenação pedagógica (totalizando 17 testes).

## Design Notes

O mapeamento de dados converte o enum do banco de snake_case para camelCase tipado:
```typescript
export type EtapaEnsino = 'anosIniciais' | 'anosFinais';

function toEtapaEnsino(dbVal: string): EtapaEnsino {
  if (dbVal === 'anos_finais' || dbVal === 'anosFinais') return 'anosFinais';
  return 'anosIniciais';
}
```

O leitor de resumo `getResumoEducacao` realiza busca eficiente com `take(2)` ou agregação particionada para o ano de referência mais recente (ou ano solicitado), consolidando os indicadores de `anosIniciais` e `anosFinais` juntamente com as métricas financeiras da Função 12 em um DTO único e desnormalizado.

## Verification

**Commands:**
- `pnpm --filter @transparencia/db check-types` -- expected: compilação TypeScript limpa sem erros.
- `pnpm --filter @transparencia/db test run src/queries/__tests__/educacao-metrics.spec.ts` -- expected: todos os testes unitários passando.
- `make test/ts` -- expected: toda a suíte de testes do monorepo passando.
- `make check` -- expected: linters e validações de código íntegras.

## Auto Run Result

Status: done
Blocking condition: none

### Summary of implemented change
Implementação da camada de dados Kysely para métricas educacionais em `@transparencia/db`, fornecendo os leitores atômicos e imutáveis `getEducacaoMetrics` e `getResumoEducacao` com contratos fortemente tipados em `camelCase` estrito (Regras 2 e 18), conversões robustas entre etapas de ensino, helpers de teste e fixtures com isolamento de tenant em `tests/fixtures/seed.ts` (Regra 23), e cobertura abrangente de testes unitários com Vitest.

### Files changed
- `packages/db/package.json` -- Adição do script `"check-types": "tsc --noEmit"`.
- `packages/db/src/queries/educacao-metrics.ts` -- Criação dos DTOs `EducacaoMetricDTO` e `ResumoEducacaoDTO`, tipo `EtapaEnsino`, funções de conversão e leitores Kysely com isolamento de tenant.
- `packages/db/src/index.ts` -- Re-exportação da API pública de educação no ponto de entrada canônico do pacote.
- `packages/db/tests/fixtures/seed.ts` -- Adição do helper `seedEducacaoMetricas` com fallback neutro e registro de `fct_educacao_metricas` no `cleanupFixtures`.
- `packages/db/src/queries/__tests__/educacao-metrics.spec.ts` -- Suíte de 17 testes unitários Vitest cobrindo cenários reais, ordenação pedagógica, filtros, fallbacks e isolamento multi-tenant.

### Review findings breakdown
- Patches applied: 6 findings agrupados em correções pontuais (fallback neutro de IBGE no seed, ordenação pedagógica de etapas, idempotência de helpers, coerção segura de booleanos, fallbacks cruzados no resumo e novos casos de teste). Contagem por veredicto: high 0, medium 1, low 5.
- Items deferred: 0.
- Rejected findings: 4 findings falsos rejeitados com refutação técnica registrada no log (busca indexada do resumo, preservação de nome de coluna do dbt mart, escopo de apresentação para nota anterior e presença mandatória de `check-types`).

### Follow-up review recommendation
- `followup_review_recommended`: false (primeira passagem sem nenhum achado high e apenas 1 medium corrigido e verificado).

### Verification performed
- `pnpm --filter @transparencia/db check-types`: Compilação TypeScript limpa com código 0.
- `pnpm --filter @transparencia/db test run src/queries/__tests__/educacao-metrics.spec.ts`: 17/17 testes passando com sucesso.
- `pnpm lint`: Biome check sem erros em todos os 379 arquivos do monorepo.
- `make test/ts`: Toda a suíte de testes do monorepo (102 arquivos de teste, 815 testes) passando com 100% de sucesso.
- `make check`: Ruff lint, ruff format e MyPy limpos sem avisos.

### Residual risks
Nenhum risco residual detectado. As queries Kysely utilizam parâmetros vinculados e predicados estritos de `portal_slug`.
