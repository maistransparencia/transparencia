---
baseline_commit: 45f1c72602237b38c1c470a86f253b474c0bf81a
---

# Story 2.1: Leitores Burros Atômicos para Posição Fiscal (`getPosicaoFiscalMetrics`)

## Story Info

- **Epic**: 2 — Leitores Atômicos e Contratos de Dados no `@transparencia/db`
- **Story**: 2.1
- **Story Key**: `2-1-leitores-burros-atomicos-para-posicao-fiscal-getposicaofiscalmetrics`
- **Status**: `ready-for-dev`
- **Created**: 2026-08-02
- **Author**: BMad Create-Story (Antigravity)

---

## User Story

**As a** developer,  
**I want** an atomic Kysely reader function for Posição Fiscal metrics in `@transparencia/db`,  
**So that** server components receive strongly typed DTOs directly from pre-materialized dbt marts without runtime SQL aggregations.

---

## Acceptance Criteria (BDD)

**Scenario 1 — Leitor puro `selectFrom`**  
**Given** a tabela materializada `fct_posicao_fiscal_metricas` no banco PostgreSQL  
**When** a função `getPosicaoFiscalMetrics(portalSlug: string, ano: number, empresaId?: string)` é chamada  
**Then** ela executa estritamente `.selectFrom('fct_posicao_fiscal_metricas').where('portal_slug', '=', portalSlug).where('ano', '=', ano).executeTakeFirst()` (podendo adicionar `.where('empresa_id', '=', empresaId)` quando `empresaId` for fornecido)  
**And** ela não contém nenhuma chamada a `sql` bruto, `SUM()`, `AVG()`, `GROUP BY` ou qualquer lógica de agregação em runtime TypeScript  
**And** o parâmetro `portalSlug` é obrigatório no contrato de tipos  

**Scenario 2 — Tipagem forte do DTO**  
**Given** a interface `PosicaoFiscalMetricsDTO` exportada  
**When** o TypeScript compila o projeto via `pnpm build` ou `tsc --noEmit`  
**Then** todos os campos retornados pela query correspondem 1-para-1 às colunas do mart (`posicaoFiscalId`, `portalSlug`, `empresaId`, `ano`, `totalArrecadado`, `despesasPagas`, `restosPagosNoAno`, `restosPendentesAdmAnterior`, `restosPendentesAdmAtual`, `saldoEstimado`)  
**And** todos os campos numéricos são tipados como `number` (não `string`)  

**Scenario 3 — Sem regressão nos testes existentes**  
**Given** a nova função `getPosicaoFiscalMetrics` exportada no `index.ts`  
**When** o comando `make test/ts` é executado  
**Then** todos os 14+ testes existentes em `parity.test.ts` continuam passando  
**And** um novo teste `deve buscar posição fiscal via mart atômico` é adicionado em `parity.test.ts` verificando os campos do DTO  

**Scenario 4 — Coexistência com função legada**  
**Given** que a função `getPosicaoFiscal` (legada) ainda é usada por componentes existentes  
**When** a Story 2.1 é implementada  
**Then** a função `getPosicaoFiscal` (legada) **permanece intacta** no arquivo `posicao_fiscal.ts` — **não é removida nem modificada**  
**And** o novo arquivo `posicao-fiscal-metrics.ts` é criado com a nova função atômica  
**And** ambas as funções são exportadas via `index.ts`

---

## Dev Notes & Technical Architecture Guardrails

### ⚠️ REGRA CRÍTICA DE ESCOPO — LEIA ANTES DE TUDO

Esta story é **exclusivamente** sobre criar o leitor atômico em `@transparencia/db`. Ela **NÃO** inclui:
- Remoção ou refatoração de código legado em `posicao_fiscal.ts` (isso é Epic 2 completo / futuro)
- Migração de componentes ou páginas Next.js para usar o novo reader
- Qualquer alteração em `apps/web/`
- Qualquer alteração em `elt/` (os marts já existem e estão funcionando)

### Análise do Estado Atual — Arquivo a ser Complementado (NÃO MODIFICADO)

**`packages/db/src/queries/posicao_fiscal.ts`** — EXISTENTE, NÃO TOCAR:
- Contém `getPosicaoFiscal(year, empresaIds?, portalSlug?)` — função monolítica complexa
- Executa ~5 queries separadas em runtime com `sql` bruto
- Usa `sumVarcharCol`, parseFloat, sanitizeDescricao, etc.
- Exporta: `getPosicaoFiscal`, `getFornecedoresPendentes`, `getRestosBaixoValor`
- Interfaces exportadas: `PosicaoFiscalResult`, `RestoPendente`, `TopCredor`, `FornecedorPendente`, `RestoBaixoValor`
- **Esta função DEVE permanecer funcionando** — páginas ativas dependem dela

### Novo Arquivo a Criar

**`packages/db/src/queries/posicao-fiscal-metrics.ts`** (NEW):
- Arquivo completamente novo, separado do legado
- Contém APENAS a interface `PosicaoFiscalMetricsDTO` e a função `getPosicaoFiscalMetrics`
- Sem importar nada de `posicao_fiscal.ts`

### Schema do Mart `fct_posicao_fiscal_metricas` (já existente no banco)

Colunas confirmadas via `_fct_posicao_fiscal_metricas.yml`:
| Coluna DB (snake_case) | Campo DTO (camelCase) | Tipo DB | Tipo TS |
|---|---|---|---|
| `posicao_fiscal_id` | `posicaoFiscalId` | `text` | `string` |
| `portal_slug` | `portalSlug` | `text` | `string` |
| `empresa_id` | `empresaId` | `text` | `string` |
| `ano` | `ano` | `integer` | `number` |
| `total_arrecadado` | `totalArrecadado` | `numeric` | `number` |
| `despesas_pagas` | `despesasPagas` | `numeric` | `number` |
| `restos_pagos_no_ano` | `restosPagosNoAno` | `numeric` | `number` |
| `restos_pendentes_adm_anterior` | `restosPendentesAdmAnterior` | `numeric` | `number` |
| `restos_pendentes_adm_atual` | `restosPendentesAdmAtual` | `numeric` | `number` |
| `saldo_estimado` | `saldoEstimado` | `numeric` | `number` |

### Implementação Exata Esperada

```typescript
// packages/db/src/queries/posicao-fiscal-metrics.ts
import { db } from "../client";

export interface PosicaoFiscalMetricsDTO {
  posicaoFiscalId: string;
  portalSlug: string;
  empresaId: string;
  ano: number;
  totalArrecadado: number;
  despesasPagas: number;
  restosPagosNoAno: number;
  restosPendentesAdmAnterior: number;
  restosPendentesAdmAtual: number;
  saldoEstimado: number;
}

export async function getPosicaoFiscalMetrics(
  portalSlug: string,
  ano: number,
  empresaId?: string,
): Promise<PosicaoFiscalMetricsDTO | null> {
  let query = db
    .selectFrom("fct_posicao_fiscal_metricas")
    .selectAll()
    .where("portal_slug", "=", portalSlug)
    .where("ano", "=", ano);

  if (empresaId) {
    query = query.where("empresa_id", "=", empresaId);
  }

  const result = await query.executeTakeFirst();
  if (!result) return null;

  return {
    posicaoFiscalId: result.posicao_fiscal_id,
    portalSlug: result.portal_slug,
    empresaId: result.empresa_id,
    ano: Number(result.ano),
    totalArrecadado: Number(result.total_arrecadado),
    despesasPagas: Number(result.despesas_pagas),
    restosPagosNoAno: Number(result.restos_pagos_no_ano),
    restosPendentesAdmAnterior: Number(result.restos_pendentes_adm_anterior),
    restosPendentesAdmAtual: Number(result.restos_pendentes_adm_atual),
    saldoEstimado: Number(result.saldo_estimado),
  };
}
```

> **Nota sobre `Number()` nos campos numéricos**: O driver `pg` retorna colunas `numeric` do PostgreSQL como `string` (comportamento padrão do node-postgres para evitar perda de precisão de floats). Por isso o mapeamento explícito com `Number(result.campo)` é **obrigatório** para todos os campos numéricos.

### Exportação no `index.ts`

Adicionar no final do arquivo `packages/db/src/index.ts`:
```typescript
export * from "./queries/posicao-fiscal-metrics";
```

> **Não remover** nenhuma exportação existente — apenas adicionar a nova linha.

### Teste de Paridade a Adicionar

Adicionar em `packages/db/src/__tests__/parity.test.ts`, **dentro** do `describe` existente, **após** o teste de `getPosicaoFiscal` existente:

```typescript
it("deve buscar posição fiscal via mart atômico sem agregações runtime", async () => {
  const metrics = await getPosicaoFiscalMetrics(
    "porciuncula_prefeitura",
    TEST_YEAR,
  );
  // Pode retornar null se o banco de testes não tiver dados para este ano
  if (metrics !== null) {
    expect(typeof metrics.totalArrecadado).toBe("number");
    expect(typeof metrics.despesasPagas).toBe("number");
    expect(typeof metrics.restosPagosNoAno).toBe("number");
    expect(typeof metrics.restosPendentesAdmAnterior).toBe("number");
    expect(typeof metrics.restosPendentesAdmAtual).toBe("number");
    expect(typeof metrics.saldoEstimado).toBe("number");
    expect(typeof metrics.portalSlug).toBe("string");
    expect(typeof metrics.empresaId).toBe("string");
  }
});
```

**Atualizar o import** no topo do `parity.test.ts` para incluir `getPosicaoFiscalMetrics`:
```typescript
import {
  // ... imports existentes ...
  getPosicaoFiscalMetrics,
} from "../index";
```

### Regras Arquiteturais Mandatórias (dos AGENTS.md e Architecture Spine)

1. **AD-3 — Leitor Pass-Through Tipado**: A função deve ser estritamente `.selectFrom(...).where('portal_slug', '=', portalSlug)`. Zero `sql` bruto, zero `SUM()`, zero `GROUP BY`.
2. **AD-5 — Isolamento Multi-tenant**: `portalSlug` é obrigatório no contrato — nunca opcional.
3. **Versões exatas no `package.json`**: Nenhum `^` ou `~` ao instalar dependências (regra AGENTS.md §7).
4. **Kysely versão `0.29.4`** — não instalar versão nova. O padrão `.selectFrom(...).selectAll().where(...).executeTakeFirst()` é a API correta desta versão.

### Git Intelligence — Padrões Estabelecidos nas Stories Anteriores

- Commits seguem `feat(db): descrição` ou `feat(dbt): descrição`
- Branch naming: `feature/epic2-story-2-1`
- Todos os testes devem passar antes de fechar a story
- `make test/ts` = `cd packages/db && pnpm test` (vitest)
- `make test` = suíte Python/dbt (não necessário nesta story — apenas TS)

### Referências Críticas

- **Mart existente**: [`elt/transform/models/marts/metrics/fct_posicao_fiscal_metricas.sql`](file:///Volumes/Projects/transparencia/elt/transform/models/marts/metrics/fct_posicao_fiscal_metricas.sql)
- **Schema contract**: [`elt/transform/models/marts/metrics/_fct_posicao_fiscal_metricas.yml`](file:///Volumes/Projects/transparencia/elt/transform/models/marts/metrics/_fct_posicao_fiscal_metricas.yml)
- **Arquivo legado (NÃO TOCAR)**: [`packages/db/src/queries/posicao_fiscal.ts`](file:///Volumes/Projects/transparencia/packages/db/src/queries/posicao_fiscal.ts)
- **Index de exportações**: [`packages/db/src/index.ts`](file:///Volumes/Projects/transparencia/packages/db/src/index.ts)
- **Testes de paridade**: [`packages/db/src/__tests__/parity.test.ts`](file:///Volumes/Projects/transparencia/packages/db/src/__tests__/parity.test.ts)
- **Architecture Spine**: [`_bmad-output/planning-artifacts/architecture/architecture-transparencia-2026-08-01/ARCHITECTURE-SPINE.md`](file:///Volumes/Projects/transparencia/_bmad-output/planning-artifacts/architecture/architecture-transparencia-2026-08-01/ARCHITECTURE-SPINE.md)
- **Epics**: [`_bmad-output/planning-artifacts/epics.md`](file:///Volumes/Projects/transparencia/_bmad-output/planning-artifacts/epics.md)

---

## Tasks de Desenvolvimento

### Task 1 — Criar `posicao-fiscal-metrics.ts`

- [x] Criar arquivo `packages/db/src/queries/posicao-fiscal-metrics.ts`
- [x] Exportar interface `PosicaoFiscalMetricsDTO` com todos os 10 campos (ver tabela acima)
- [x] Implementar `getPosicaoFiscalMetrics(portalSlug: string, ano: number, empresaId?: string)` usando Kysely puro
- [x] Mapear todos os campos `numeric` do PostgreSQL com `Number()` para garantir tipo TypeScript correto
- [x] Zero `sql` bruto, zero `SUM()`, zero `GROUP BY`

### Task 2 — Exportar via `index.ts`

- [x] Adicionar `export * from "./queries/posicao-fiscal-metrics";` ao final de `packages/db/src/index.ts`
- [x] Verificar que nenhuma exportação existente foi removida

### Task 3 — Adicionar teste de paridade

- [x] Adicionar import de `getPosicaoFiscalMetrics` no topo de `parity.test.ts`
- [x] Adicionar novo `it(...)` de teste dentro do `describe` existente
- [x] Garantir que o teste é resiliente a banco de testes vazio (verificação com `if (metrics !== null)`)

### Task 4 — Validação

- [x] Executar `make test/ts` (ou `cd packages/db && pnpm test`) e confirmar 100% de sucesso
- [x] Executar `pnpm build` na raiz ou `cd packages/db && pnpm build` e confirmar zero erros de tipo TypeScript
- [x] Confirmar que **todos** os testes anteriores continuam passando (sem regressão)

---

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4.6 (Thinking)

### Debug Log References
_Nenhum bloqueador encontrado._

### Completion Notes List
- Story 2.1 criada via `/bmad-create-story` em 2026-08-02
- Análise completa do mart `fct_posicao_fiscal_metricas` realizada (schema confirmado via YAML contract)
- Análise do código legado `posicao_fiscal.ts` realizada — coexistência garantida na spec
- Padrão de `Number()` para campos `numeric` documentado (necessário por comportamento do driver `pg`)
- ✅ Implementação concluída em 2026-08-02: arquivo `posicao-fiscal-metrics.ts` criado com interface `PosicaoFiscalMetricsDTO` e função `getPosicaoFiscalMetrics`
- ✅ Export adicionado ao `index.ts` sem remover nenhuma exportação existente
- ✅ Teste de paridade adicionado ao `parity.test.ts` com verificação resiliente a banco vazio
- ✅ `make test/ts`: 15 testes passando (14 existentes + 1 novo) — zero regressões
- ✅ `tsc --noEmit`: zero erros de tipo TypeScript
- ✅ Função legada `getPosicaoFiscal` intacta em `posicao_fiscal.ts` — coexistência confirmada
- ✅ **Padrão arquitetural estabelecido (Story 2.1 → AD-3)**: retorno implícito + `satisfies DTO` no objeto de retorno. Documentado no `ARCHITECTURE-SPINE.md`. Todas as funções leitoras do Epic 2 devem seguir este padrão.
- ✅ `empresaIds` tipado como `string[]` (multi-select) — filtro via operador Kysely `'in'`

### Change Log
- 2026-08-02: Criado `packages/db/src/queries/posicao-fiscal-metrics.ts` com `PosicaoFiscalMetricsDTO` e `getPosicaoFiscalMetrics`
- 2026-08-02: Adicionado `export * from "./queries/posicao-fiscal-metrics"` ao `packages/db/src/index.ts`
- 2026-08-02: Adicionado teste de paridade `deve buscar posição fiscal via mart atômico sem agregações runtime` ao `packages/db/src/__tests__/parity.test.ts`

### File List

#### Arquivos a Criar (NEW):
- `packages/db/src/queries/posicao-fiscal-metrics.ts`

#### Arquivos a Modificar (UPDATE):
- `packages/db/src/index.ts` — adicionar export da nova query
- `packages/db/src/__tests__/parity.test.ts` — adicionar import e teste do novo leitor

#### Arquivos que NÃO devem ser tocados:
- `packages/db/src/queries/posicao_fiscal.ts` — código legado, manter intacto
- `elt/transform/models/marts/metrics/fct_posicao_fiscal_metricas.sql` — mart já implementado
- Qualquer arquivo em `apps/web/`

---

## Status

**Current Status**: `done`
