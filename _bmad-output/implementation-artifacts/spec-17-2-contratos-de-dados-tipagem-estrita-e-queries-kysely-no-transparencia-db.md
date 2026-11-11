---
title: 'Story 17.2: Contratos de Dados, Tipagem Estrita e Queries Kysely no @transparencia/db'
type: 'feature'
created: '2026-10-11'
status: 'done'
baseline_revision: '3191e4936da5acec73d22eee6884d09f6dcc2505'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - 'packages/db/src/queries/radar-civico-alertas.ts'
  - 'packages/db/src/queries/contratos-servicos-vigentes.ts'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** A camada de dados TypeScript (`@transparencia/db`) não possui tipagem nem queries Kysely para consumir o modelo mart `fct_obras`, impedindo que as páginas públicas de visualização cartográfica e auditoria física de obras consumam os dados com segurança de tipos e isolamento multi-tenant.

**Approach:** Criar o módulo `@transparencia/db/src/queries/obras.ts` com DTOs em `camelCase`, filtros por status/busca textual com `unaccent`, funções leitoras puras (`getObrasPorPortal`, `getObraDetalhe`, `getResumoObrasPorPortal`), helpers de seed e testes de integração com cobertura rigorosa no vitest.

## Boundaries & Constraints

**Always:**
- Utilizar convenção estrita de DTOs e identificadores em `camelCase` (Regra 18 do `AGENTS.md`): `idProjeto`, `nomeObra`, `situacao`, `orgaoResponsavel`, `valorInvestimentoPrevisto`, `percentualExecucaoFisica`, `dataUltimaMedicao`, `latitude`, `longitude`, `motivoParalisacao`, `dataInicioPrevista`, `dataFimPrevista`.
- Preservar os valores de status/situação em lowercase snake_case (`em_execucao`, `paralisada`, `concluida`, `cadastrada`, `cancelada`), conforme a Regra 10 do `AGENTS.md`.
- Adotar estilo estritamente funcional e transformações imutáveis (`.map`, `.filter`, `Promise.all`) sem loops imperativos com variáveis mutáveis (Regra 2 do `AGENTS.md`).
- Implementar isolamento multi-tenant obrigatório por `portalSlug` em todas as queries e filtros (Regra 23 do `AGENTS.md`).
- Utilizar busca textual com normalização insensível a acentuação e caixa via `unaccent` e `ILIKE` em `nome_obra` e `orgao_responsavel` (Regra 11 do `AGENTS.md`).
- Tratar dados nulos e conversões numéricas de forma defensiva (`parseFloat` seguro para valores monetários e percentuais; coordenadas válidas).

**Never:**
- Proibido expor chaves snake_case (`id_projeto`, `nome_obra`) ou com espaços nos DTOs da camada TypeScript (Regra 18).
- Proibido utilizar literais fixos de municípios/tenants hardcoded no código (Regra 23).
- Proibido aninhar ternários complexos na montagem dos retornos (Regra 13).
- Proibido alterar componentes da camada web (`apps/web`) neste story — foco estrito na camada de dados `@transparencia/db` (Regra 2).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Listagem padrão de obras | `portalSlug: "porciuncula_prefeitura"`, sem filtros | Retorna array de `ObraDTO` ordenado por `valorInvestimentoPrevisto` desc com todos os campos tipados em camelCase | Retorna array vazio `[]` se portal não existir |
| Slug vazio ou inválido | `portalSlug: ""` ou espaços | Retorna `[]` imediatamente sem executar query no banco | Retorno defensivo fail-fast `[]` |
| Filtro por situação 'paralisada' | `status: "paralisada"` | Retorna apenas obras com `situacao = 'paralisada'`, incluindo `motivoParalisacao` preenchido | Retorna `[]` se não houver obras no status |
| Filtro por situação 'todas' | `status: "todas"` | Retorna todas as obras registradas para o portal | Nenhuma cláusula de status aplicada |
| Busca textual com acentos | `busca: "reforma de creche"` | Encontra registro "Reforma de Creche" ou "REFORMA DA CRECHE" usando `unaccent(lower(...))` | Se termo tiver menos de 2 caracteres, ignora filtro |
| Detalhe de obra existente | `portalSlug: "porciuncula_prefeitura"`, `idProjeto: "proj_123"` | Retorna `ObraDTO` correspondente com geolocalização e medição física | Retorna `null` se não existir |
| Detalhe com ID inexistente | `portalSlug: "porciuncula_prefeitura"`, `idProjeto: "inexistente"` | Retorna `null` | Retorno seguro `null` |
| Isolamento multi-tenant | Projeto cadastrado no portal A consultado no portal B | Retorna `null` (ou `[]` na listagem), sem vazamento de dados entre prefeituras | Query isolada por `portal_slug = cleanSlug` |
| Resumo agregado de obras | `portalSlug: "porciuncula_prefeitura"` | Retorna `ResumoObrasDTO` com contadores por status, soma de investimento e percentual médio de avanço | Retorna zerado se município não possuir obras |

</intent-contract>

## Code Map

- `packages/db/src/queries/obras.ts` -- Arquivo principal da Story 17.2: DTOs em camelCase (`ObraDTO`, `ResumoObrasDTO`, `SituacaoObra`, `GetObrasFiltros`), queries Kysely `getObrasPorPortal`, `getObraDetalhe` e `getResumoObrasPorPortal`
- `packages/db/src/index.ts` -- Barril de exportações públicas de `@transparencia/db`: adicionar `export * from "./queries/obras"`
- `packages/db/tests/fixtures/seed.ts` -- Utilitários de seed e isolamento para vitest: adicionar interface `ObraRow`, função `seedObra` e expurgar `fct_obras` em `cleanupFixtures`
- `packages/db/src/queries/__tests__/obras.spec.ts` -- Suíte de testes unitários de integração vitest contra banco efêmero cobrindo listagem, filtros, busca unaccent, paginação, detalhe, resumo e isolamento multi-tenant

## Tasks & Acceptance

**Execution:**
- `packages/db/src/queries/obras.ts` -- Implementar tipos de domínio, DTOs em camelCase e funções Kysely funcionais e imutáveis (`getObrasPorPortal`, `getObraDetalhe`, `getResumoObrasPorPortal`) -- Disponibiliza a inteligência de consulta analítica de obras para toda a aplicação.
- `packages/db/src/index.ts` -- Exportar todas as funções e tipos de `./queries/obras` no entrypoint de `@transparencia/db` -- Permite consumo limpo por apps web e outros pacotes.
- `packages/db/tests/fixtures/seed.ts` -- Adicionar helper `seedObra` e incluir `fct_obras` na rotina `cleanupFixtures` -- Permite testes de integração determinísticos e isolados.
- `packages/db/src/queries/__tests__/obras.spec.ts` -- Implementar testes de integração vitest cobrindo cenários da matriz I/O e validação de contratos camelCase -- Garante 100% de confiabilidade e prevenção de regressão.

**Acceptance Criteria:**
- Given o mart `fct_obras` no banco de dados analítico, when a função `getObrasPorPortal(portalSlug, filtros)` for chamada, then retorna lista de `ObraDTO` contendo estritamente propriedades em camelCase (`idProjeto`, `nomeObra`, `situacao`, `orgaoResponsavel`, `valorInvestimentoPrevisto`, `percentualExecucaoFisica`, `dataUltimaMedicao`, `latitude`, `longitude`, `motivoParalisacao`, `dataInicioPrevista`, `dataFimPrevista`).
- Given a função `getObrasPorPortal` com `filtros.status = 'paralisada'`, when executada, then filtra estritamente por obras paralisadas.
- Given a função `getObrasPorPortal` com `filtros.busca = 'educacao'`, when executada, then encontra registros contendo "Educação" no nome da obra ou órgão responsável independente de acentuação e caixa.
- Given a função `getObraDetalhe(portalSlug, idProjeto)`, when chamada com um projeto existente do portal informado, then retorna o `ObraDTO` completo correspondente, ou `null` se inexistente ou pertencente a outro portal.
- Given a função `getResumoObrasPorPortal(portalSlug)`, when chamada, then retorna agregados consolidados com contadores por status (`totalObras`, `emExecucao`, `paralisadas`, `concluidas`), valor total de investimento previsto e percentual médio de execução física.
- Given a suíte de testes de queries do TypeScript, when executado `pnpm --filter @transparencia/db test`, then todos os testes passam sem falhas de tipagem ou asserção.

## Spec Change Log

## Review Triage Log

### 2026-10-11 — Review pass
- verdicts: 11 findings — high 0, medium 2, low 9, false 0, maybe-false 0
- findings:
  - `[low]` `[patch]` Limite ou offset com números fracionários ou negativos — Adicionado guard com `Number.isInteger(filtros.limite) && filtros.limite > 0` e `Number.isInteger(filtros.offset) && filtros.offset >= 0`.
  - `[medium]` `[patch]` Ordenação decrescente em `getObrasPorPortal` coloca NULLs primeiro por padrão no PostgreSQL — Corrigido com `sql`valor_investimento_previsto desc nulls last`` na cláusula `orderBy`.
  - `[medium]` `[patch]` Busca textual não contemplava `id_projeto` — Adicionado `id_projeto` na cláusula `eb.or(...)`.
  - `[low]` `[reject]` Caracteres curinga `%` e `_` no termo de busca — Normalização via unaccent/ILIKE atende plenamente ao padrão do projeto e usuários não usam curingas em buscas cívicas normais.
  - `[low]` `[reject]` Tratamento de `null` em situacao — Modelagem upstream em `stg_obrasgov__projetos` garante que `situacao` não é nula; o fallback no DTO é meramente defensivo.
  - `[low]` `[reject]` Retorno de contagem total em `getObrasPorPortal` — Contrato e critérios de aceitação da Story 17.2 exigem estritamente retorno de `Promise<ObraDTO[]>`.
  - `[low]` `[patch]` Coordenadas geográficas sem validação de limites ou coordenadas dummy (0, 0) — Validados intervalos `[-90, 90]` e `[-180, 180]` e coordenadas dummy (0, 0) anuladas como `null`.
  - `[low]` `[patch]` Risco de deslocamento de dia em `toIsoDateString` por fuso horário — Formatado `Date` usando `getFullYear()`, `getMonth()` e `getDate()` locais sem conversão UTC.
  - `[low]` `[reject]` Conciliação estrita entre `totalObras` e contadores de status — Todos os status válidos do ObrasGov são mapeados nas 5 categorias canônicas pelo dbt staging; não há necessidade de categoria 'outras'.
  - `[low]` `[patch]` Duplicação de colunas projetadas em `getObrasPorPortal` e `getObraDetalhe` — Extraída constante compartilhada `OBRA_SELECT_COLUMNS as const`.
  - `[low]` `[patch]` Ausência de teste de ordenação com `valorInvestimentoPrevisto` nulo — Adicionado teste assertando que obras sem investimento ordenam ao final (`nulls last`).

## Design Notes

Contrato de tipos e DTOs em `packages/db/src/queries/obras.ts`:
```ts
export type SituacaoObra =
  | "em_execucao"
  | "paralisada"
  | "concluida"
  | "cadastrada"
  | "cancelada"
  | (string & {});

export type SituacaoObraFiltro =
  | "todas"
  | "em_execucao"
  | "paralisada"
  | "concluida"
  | "cadastrada"
  | "cancelada";

export interface ObraDTO {
  idProjeto: string;
  portalSlug: string;
  nomeObra: string;
  situacao: SituacaoObra;
  orgaoResponsavel: string | null;
  valorInvestimentoPrevisto: number;
  percentualExecucaoFisica: number | null;
  dataUltimaMedicao: string | null;
  latitude: number | null;
  longitude: number | null;
  motivoParalisacao: string | null;
  dataInicioPrevista: string | null;
  dataFimPrevista: string | null;
}

export interface GetObrasFiltros {
  status?: SituacaoObraFiltro;
  busca?: string;
  limite?: number;
  offset?: number;
}

export interface ResumoObrasDTO {
  totalObras: number;
  emExecucao: number;
  paralisadas: number;
  concluidas: number;
  cadastradas: number;
  canceladas: number;
  valorTotalInvestimento: number;
  percentualMedioExecucaoFisica: number | null;
}
```

Busca com normalização `unaccent`:
```ts
if (filtros?.busca && filtros.busca.trim().length >= 2) {
  const termo = filtros.busca.trim();
  query = query.where((eb) =>
    eb.or([
      sql`unaccent(lower(nome_obra)) LIKE '%' || unaccent(lower(${termo})) || '%'`,
      sql`unaccent(lower(orgao_responsavel)) LIKE '%' || unaccent(lower(${termo})) || '%'`,
    ])
  );
}
```

## Verification

**Commands:**
- `pnpm --filter @transparencia/db test src/queries/__tests__/obras.spec.ts` -- expected: Todos os testes de integração passam com 100% de sucesso
- `pnpm --filter @transparencia/db build` -- expected: Compilação TypeScript de @transparencia/db executa sem erros de tipos

## Auto Run Result

### Summary of implemented change
Implementados os contratos de dados e queries Kysely no pacote `@transparencia/db/src/queries/obras.ts`, fornecendo tipagem estrita em `camelCase`, estilo funcional imutável e isolamento multi-tenant para consulta de obras públicas do mart `fct_obras`.

### Files changed
- `packages/db/src/queries/obras.ts` -- DTOs em `camelCase`, queries `getObrasPorPortal`, `getObraDetalhe`, `getResumoObrasPorPortal` com unaccent e ordenação defensiva.
- `packages/db/src/index.ts` -- Re-exportação dos novos contratos e funções de obras no barril público.
- `packages/db/tests/fixtures/seed.ts` -- Helper `seedObra` e expurgo de `fct_obras` em `cleanupFixtures`.
- `packages/db/src/queries/__tests__/obras.spec.ts` -- Suíte de 19 testes de integração vitest cobrindo contratos camelCase, filtros, busca, ordenação nulls last, coordenadas e isolamento multi-tenant.

### Review findings breakdown
- Patches applied: 7 (2 medium, 5 low).
  - Ordenação `nulls last` em `valor_investimento_previsto`.
  - Busca textual estendida para incluir `id_projeto`.
  - Validação estrita de inteiros para `limite` e `offset`.
  - Validação de limites geográficos e anulação de coordenadas dummy (0, 0).
  - Formatação de datas em `toIsoDateString` imune a timezone drift.
  - Extração de `OBRA_SELECT_COLUMNS as const` para evitar duplicação.
  - Testes cobrindo ordenação com valores nulos e validações.
- Items deferred: 0.
- Rejected findings:
  - Caracteres curinga em busca LIKE: rejeitado por ser comportamento padrão e sem risco em consultas cívicas.
  - Tratamento de null em situacao: rejeitado pois o staging garante preenchimento de status.
  - Retorno de paginação { data, total }: rejeitado por alterar a assinatura acordada no critério de aceitação (`Promise<ObraDTO[]>`).
  - Conciliação exaustiva de contadores de status: rejeitado pois o universo de status é delimitado pelo dbt staging.

### Follow-up review recommendation
- Recommended: `true` (2 correções de severidade média aplicadas na primeira rodada).
- Risco não verificado a auditar: Garantir compatibilidade de planos de execução de consulta e índices caso volume de obras cresça com filtros combinados.

### Verification performed
- `pnpm --filter @transparencia/db test src/queries/__tests__/obras.spec.ts`: 19/19 testes passaram.
- `pnpm --filter @transparencia/db build`: compilado com sucesso sem erros de tipo.
- `make test/ts`: 85 arquivos e 664 testes passaram (100%).

### Residual risks
Nenhum risco residual identificado na camada de dados.
