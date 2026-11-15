---
title: 'Story 15.2: Camada de Dados Kysely (@transparencia/db) e Parametrização de Previdência e Temas no PortalConfig'
type: 'feature'
created: '2026-10-01'
status: 'done'
baseline_revision: '3b53780633200d1c202d19a95e7738d9e2d7c21c'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** A camada de dados Kysely (`@transparencia/db`) ainda utiliza nomenclaturas locais e acopladas a Porciúncula (como `CAPREM`), e o `PortalConfig` carece de metadados previdenciários e temas em destaque dinâmicos, limitando a extensibilidade multi-portal para os demais municípios da região.

**Approach:** Estender `seed_portais.csv` e `dim_portais.sql` com colunas de previdência e temas em JSON, parametrizar `PortalConfig` em `metadata.ts` com parsing defensivo, introduzir o módulo de queries canônicas `historia-previdencia-metrics.ts` com filtragem estrita por `portal_slug` sobre `analytics.fct_previdencia_*`, preservando compatibilidade retroativa através de re-exports em `historia-caprem-metrics.ts`, e regerar os fixtures em estrito cumprimento à Regra 21.

## Boundaries & Constraints

**Always:**
- Cumprir a Regra 21 do `AGENTS.md` regerando `packages/db/tests/fixtures/schema.sql.gz` com `make db/fixture/dump` e validando com `make db/fixture/check`.
- Incluir `portal_slug` de forma mandatória em todas as queries Kysely filtrando com `.where('portal_slug', '=', portalSlug)`.
- Adotar estritamente a convenção `camelCase` para todas as propriedades de interfaces, tipos e DTOs em TypeScript (Regra 18).
- Manter nomes de métricas 100% claros, explícitos e sem abreviações opacas em SQL e TypeScript (Regra 9).
- Manter compatibilidade retroativa total para os consumidores existentes em `apps/web` através de aliases e re-exports em `historia-caprem-metrics.ts` até a execução da Story 15.3.
- Utilizar exclusivamente o tipo `TEXT` no PostgreSQL para as novas colunas `previdencia_sigla`, `previdencia_nome` e `highlights_json` (Regra 16).
- Executar todas as validações e testes estritamente contra os bancos locais do Docker (`localhost:5544` e `localhost:5545`), nunca contra bancos remotos (Regra 15).

**Never:**
- Não quebrar contratos de tipagem consumidos pelas páginas web e rotas atuais de Porciúncula.
- Não duplicar lógica contábil nem sanitização de strings já realizadas pelos modelos analíticos dbt (Regras 2 e 14).
- Não utilizar operadores ternários aninhados em lógicas condicionais (Regra 13).
- Não omitir o tratamento defensivo de parsing em `highlights_json` no `PortalConfig`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Consulta de metadados do portal | `getPortalConfig('porciuncula_prefeitura')` | Objeto `PortalConfig` contendo `previdencia: { habilitado: true, sigla: 'CAPREM', nome: '...' }` e array tipado de `highlights` | Retorna `null` apenas se portal inexistente |
| Parsing de `highlights_json` corrompido ou nulo | `highlights_json = null` ou string malformada | `highlights` avaliado como array vazio `[]` sem lançar exceção não tratada | Fallback defensivo via bloco try-catch |
| Consulta de previdência para portal específico | `getHistoriaPrevidenciaMetrics(slug, 2024)` | Métricas previdenciárias isoladas estritamente para o município informado | Retorna `null` caso não haja registros |
| Consulta retrocompatível legado | `getHistoriaCapremMetrics(slug, 2024)` | Mesmo DTO retornado por `getHistoriaPrevidenciaMetrics` com aliases preservados | Idêntico ao canônico |
| Verificação de paridade de fixtures | `make db/fixture/check` | 100% de paridade estrutural e de dados de seed entre o banco analítico e o fixture compactado | Falha com relatório explícito de discrepâncias |

</intent-contract>

## Code Map

- `elt/transform/seeds/seed_portais.csv` -- Semente de metadados dos portais municipais; adição das colunas `previdencia_habilitado`, `previdencia_sigla`, `previdencia_nome` e `highlights_json`.
- `elt/transform/seeds/seeds.yml` -- Configuração de tipos das colunas de seed para `seed_portais`.
- `elt/transform/models/marts/core/dim_portais.sql` -- Modelo dimensional de portais; projeção das novas colunas de previdência e temas.
- `elt/transform/models/marts/core/_dim_portais.yml` -- Contrato de esquema estrito (`contract.enforced: true`) com tipagem das novas colunas em `dim_portais`.
- `packages/db/src/queries/metadata.ts` -- Interfaces `PortalConfig`, `PrevidenciaConfig`, `HighlightItem` e função `getPortalConfig` com parsing defensivo.
- `packages/db/src/queries/historia-previdencia-metrics.ts` -- Novo módulo canônico de queries Kysely para previdência municipal consumindo `analytics.fct_previdencia_*`.
- `packages/db/src/queries/historia-caprem-metrics.ts` -- Camada de retrocompatibilidade re-exportando funções e tipos do módulo canônico.
- `packages/db/src/index.ts` -- Exportação pública dos módulos canônico e legado em `@transparencia/db`.
- `packages/db/src/queries/__tests__/metadata.spec.ts` -- Suíte de testes unitários para validação de `previdencia` e `highlights` em `PortalConfig`.
- `packages/db/src/queries/__tests__/historia-caprem-metrics.spec.ts` -- Testes de integração/paridade das queries de previdência.
- `packages/db/tests/fixtures/schema.sql.gz` -- Fixture compactado sincronizado contendo DDL atualizado e semente estática.

## Tasks & Acceptance

**Execution:**
- `elt/transform/seeds/seed_portais.csv` -- Adicionar as colunas `previdencia_habilitado`, `previdencia_sigla`, `previdencia_nome` e `highlights_json`, preenchendo os dados oficiais de Porciúncula.
- `elt/transform/seeds/seeds.yml` -- Declarar `previdencia_habilitado` (boolean), `previdencia_sigla` (text), `previdencia_nome` (text) e `highlights_json` (text) no contrato de tipos do seed `seed_portais`.
- `elt/transform/models/marts/core/dim_portais.sql` -- Projetar as 4 novas colunas no select final a partir do seed de portais.
- `elt/transform/models/marts/core/_dim_portais.yml` -- Incluir as 4 novas colunas no contrato enforced de `dim_portais`.
- `packages/db/src/queries/metadata.ts` -- Estender a interface `PortalConfig` e implementar parsing defensivo para `previdencia` e `highlights` em `getPortalConfig`.
- `packages/db/src/queries/historia-previdencia-metrics.ts` -- Implementar queries canônicas filtrando por `portal_slug` para os 6 marts `fct_previdencia_*`.
- `packages/db/src/queries/historia-caprem-metrics.ts` -- Re-exportar funções e tipos de `historia-previdencia-metrics.ts` com nomes legados para evitar quebras em consumidores.
- `packages/db/src/index.ts` -- Exportar o novo módulo `historia-previdencia-metrics`.
- `packages/db/tests/fixtures/schema.sql.gz` -- Atualizar o banco de dados de desenvolvimento local via dbt e regerar o fixture compactado com `make db/fixture/dump`.
- `packages/db/src/queries/__tests__/metadata.spec.ts` -- Adicionar asserções para os campos `previdencia` e `highlights`.

**Acceptance Criteria:**
- Given a camada de metadados em `packages/db/src/queries/metadata.ts`
- When `getPortalConfig('porciuncula_prefeitura')` for invocado
- Then o retorno inclui `previdencia` com `habilitado: true`, `sigla: 'CAPREM'` e o nome oficial da caixa de previdência.
- And o retorno inclui `highlights` como array de objetos contendo `slug`, `titulo`, `descricao` e `icone`.
- And os arquivos de queries canônicas em `historia-previdencia-metrics.ts` consultam `analytics.fct_previdencia_*` filtrando obrigatoriamente por `portal_slug`.
- And todas as propriedades de interfaces e DTOs em TypeScript utilizam estritamente `camelCase` (Regra 18) e nomes semânticos explícitos (Regra 9).
- And o fixture `schema.sql.gz` é regerado e validado com 100% de sucesso via `make db/fixture/check` (Regra 21).
- And a suíte de testes do banco e frontend (`make test/ts`) passa com 100% de sucesso sem regressões.

## Spec Change Log

_None._

## Review Triage Log

### 2026-10-01 — Review pass
- verdicts: 16 findings — high 0, medium 0, low 3, false 13, maybe-false 0
- findings:
  - `[patch]` `[patch]` Normalização de objetos Date em `toCadprevDTO` no `historia-previdencia-metrics.ts` — corrigida conversão para ISO `YYYY-MM-DD` prevenindo string de representação local de Date.
  - `[patch]` `[patch]` Ajuste de formatação e quebra de linha em export de aliases em `historia-previdencia-metrics.ts` — corrigido via Biome format.
  - `[patch]` `[patch]` Adição de asserções explícitas para `previdencia` e `highlights` em `metadata.spec.ts` — implementada cobertura de teste completa.
  - `[false]` `[reject]` Tratamento de `previdencia_habilitado` com valores não booleanos — garantido por checagem flexível `Boolean(row.previdencia_habilitado === true || ...)`.
  - `[false]` `[reject]` Parsing de `highlights_json` inválido — protegido por bloco `try-catch` com fallback para `[]`.
  - `[false]` `[reject]` Ausência de chaves obrigatórias em itens de highlight — valores mapeados com defaults seguros `String(item.slug || "")`.
  - `[false]` `[reject]` Fallback de portal inexistente em `getPortalConfig` — validado por teste retornando `null`.
  - `[false]` `[reject]` Incompatibilidade com queries legadas de `CAPREM` na camada web — preservada por aliases e re-exports em `historia-caprem-metrics.ts`.
  - `[false]` `[reject]` Vazamento de métricas entre portais no `historia-previdencia-metrics.ts` — cláusulas `.where("portal_slug", "=", portalSlug)` presentes em todas as funções.
  - `[false]` `[reject]` Descompasso de fixture de banco de testes — `schema.sql.gz` sincronizado e verificado com `make db/fixture/check`.
  - `[false]` `[reject]` Contrato enforced de `dim_portais` no dbt sem tipagem — novas colunas tipadas explicitamente em `_dim_portais.yml`.
  - `[false]` `[reject]` Violação da regra de camelCase em DTOs — todas as propriedades expostas em camelCase.
  - `[false]` `[reject]` Dependência de rede externa nos testes — todos os testes executam estritamente contra banco local ou efêmero.
  - `[false]` `[reject]` Ausência de helpers de seed para os novos tipos — aliases `seedPrevidenciaHistoria` etc. implementados em `seed.ts`.
  - `[false]` `[reject]` Nomes abreviados em DTOs — terminologias semânticas explícitas mantidas.
  - `[false]` `[reject]` Divergência com intenção da Story 15.2 — o diff reflete exatamente os requisitos descritos em `epics.md`.

## Design Notes

Parsing defensivo para `highlights_json` e `previdencia`:
```ts
const previdenciaHabilitado = Boolean(
  row.previdencia_habilitado === true ||
    row.previdencia_habilitado === "true" ||
    row.previdencia_habilitado === 1,
);

const previdencia: PrevidenciaConfig = {
  habilitado: previdenciaHabilitado,
  sigla: String(row.previdencia_sigla || ""),
  nome: String(row.previdencia_nome || ""),
};

const highlights: HighlightItem[] = (() => {
  if (!row.highlights_json) return [];
  try {
    const raw = typeof row.highlights_json === "string" 
      ? JSON.parse(row.highlights_json) 
      : row.highlights_json;
    if (Array.isArray(raw)) {
      return raw.map((item) => ({
        slug: String(item.slug || ""),
        titulo: String(item.titulo || ""),
        descricao: item.descricao ? String(item.descricao) : undefined,
        icone: String(item.icone || ""),
      }));
    }
  } catch {
    return [];
  }
  return [];
})();
```

## Verification

**Commands:**
- `uv run --project elt python elt/scripts/run_dbt.py seed --select seed_portais --full-refresh` -- PASS: seed atualizado com sucesso no PostgreSQL local.
- `uv run --project elt python elt/scripts/run_dbt.py run --select dim_portais` -- PASS: modelo `dim_portais` compilado com contrato estrito válido.
- `uv run --project elt python elt/scripts/run_dbt.py test --select dim_portais` -- PASS: 13/13 testes contratuais e relacionais aprovados.
- `make db/fixture/dump` -- PASS: `schema.sql.gz` regerado com DDL e dados de seed atualizados.
- `make db/fixture/check` -- PASS: 4/4 testes de paridade entre dbt e fixture aprovados.
- `make db/test/restore` -- PASS: banco de testes restaurado com sucesso.
- `pnpm --filter @transparencia/db test` -- PASS: todas as 26 suítes de teste de banco (165 testes) aprovadas.
- `make test/ts` -- PASS: 165 testes do db e 604 testes da web aprovados com 100% de sucesso.
- `make check` -- PASS: linters e formatters estáticos ruff e mypy passaram com zero avisos.
- `make verify` -- PASS: portão unificado completo de qualidade passou com sucesso.

## Auto Run Result

### Summary of Changes
1. **Semente e Mart Dimensional de Portais Estendidos (`elt/`):**
   - `elt/transform/seeds/seed_portais.csv`: Adicionadas as colunas `previdencia_habilitado`, `previdencia_sigla`, `previdencia_nome` e `highlights_json` para Porciúncula (`porciuncula_prefeitura`), configurando RPPS `CAPREM` e destaques temáticos em JSON (`saude`, `previdencia`).
   - `elt/transform/seeds/seeds.yml`: Tipagem estrita das novas colunas declarada no seed.
   - `elt/transform/models/marts/core/dim_portais.sql`: Projeção das novas colunas de previdência e temas.
   - `elt/transform/models/marts/core/_dim_portais.yml`: Contrato enforce atualizado com as novas colunas e tipos PostgreSQL.

2. **Camada de Metadados e Tipagem (`@transparencia/db`):**
   - `packages/db/src/queries/metadata.ts`: Interfaces `PrevidenciaConfig` e `HighlightItem` introduzidas e integradas a `PortalConfig`. Implementado parsing defensivo com fallback para JSON malformado ou nulo em `getPortalConfig`.
   - `packages/db/src/queries/__tests__/metadata.spec.ts`: Cobertura de testes unitários expandida para validar `previdencia` e `highlights`.

3. **Módulo Canônico de Queries Previdenciárias e Retrocompatibilidade:**
   - `packages/db/src/queries/historia-previdencia-metrics.ts`: Criado módulo canônico consultando `analytics.fct_previdencia_*` com filtro obrigatório por `portal_slug` e convenção estrita de `camelCase`.
   - `packages/db/src/queries/historia-caprem-metrics.ts`: Re-exportação completa do novo módulo com aliases legados mantendo paridade e zero quebra para a camada web (`apps/web`).
   - `packages/db/src/index.ts`: Módulo canônico exportado publicamente.
   - `packages/db/tests/fixtures/seed.ts`: Aliases canônicos de seed adicionados (`seedPrevidenciaHistoria`, `seedPrevidenciaPatrimonioHistorico`, `seedPrevidenciaTendenciaAtuarial`).
   - `packages/db/src/queries/__tests__/historia-previdencia-metrics.spec.ts`: Nova suíte de testes com 6 cenários cobrindo isolamento multi-portal e leitura dos marts.

4. **Sincronização de Fixtures e Governança:**
   - `packages/db/tests/fixtures/schema.sql.gz` regerado via `make db/fixture/dump` e auditado com 100% de paridade via `make db/fixture/check`.

### Review Findings Breakdown
- Patches aplicados: 3 (normalização de `Date` em `toCadprevDTO`, formatação Biome e expansão de asserções em `metadata.spec.ts`).
- Itens diferidos: 0.
- Rejeitados: 13 (falsos positivos de validações já cobertas por código defensivo, testes ou convenções).

### Verification
- `pnpm build`: PASS
- `make check`: PASS
- `make test`: PASS (48/48 testes pytest)
- `make test/ts`: PASS (165 testes db + 604 testes web)
- `make db/fixture/check`: PASS (4/4 testes de sincronia de schema)
- `make verify`: PASS (todos os gates)

