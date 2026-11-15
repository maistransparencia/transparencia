# Story 4.13: Parametrização Dinâmica de Limites Fiscais (Seed `seed_constantes_fiscais`) na UI de Licitações

## Status
- **Status:** done
- **Epic:** 4 - Experiência Visual, Responsividade Mobile, SEO & Otimização para LLMs
- **Story Key:** 4-13-parametrizacao-dinamica-de-limites-fiscais-na-ui-de-licitacoes
- **Last Updated:** 2026-08-13


---

## User Story Statement

**As a** munícipe ou auditor fiscal navegando no Portal da Transparência,  
**I want** ver os limites legais de dispensa de licitação ajustados dinamicamente de acordo com o exercício/ano selecionado (ex: R$ 59.906,02 para 2024, R$ 62.725,59 para 2025, R$ 65.492,11 para 2026),  
**So that** os textos explicativos e alertas do portal reflitam a exata legislação e Decretos Federais vigentes para aquele ano, eliminando valores estáticos/hardcoded na interface.

---

## Acceptance Criteria

1. **Given** a tabela/seed `seed_constantes_fiscais` (que mapeia `limite_dispensa_compras_servicos`, `limite_dispensa_obras_engenharia` e `limite_dispensa_veiculos` por ano/decreto),
2. **When** a função leitora `getLicitacoesMetrics` ou `getLicitacaoGapsMetrics` for executada no pacote `@transparencia/db` para um determinado exercício (`year`),
3. **Then** a leitora de dados deve consultar ou expor o valor numérico do limite de dispensa de compras e serviços gerais vigente no ano selecionado (`limiteDispensaComprasServicos` ou `limiteDispensaVigente`), buscando a constante cadastrada no seed para aquele ano.
4. **And** na camada de apresentação (`apps/web/app/[portalSlug]/licitacoes/page.tsx` e `view-model.ts`), a legenda do cabeçalho da página deve utilizar esse valor retornado formatado dinamicamente via `formatCurrency` ou `Intl.NumberFormat` em vez do valor estático `R$ 62.725,59`.
5. **And** se nenhum gap for encontrado ou se o limite não for retornado, o sistema deve adotar um fallback seguro baseado no ano informado.
6. **And** todos os testes automatizados (`make test`, `make test/ts` e `pnpm build`) devem passar com 100% de sucesso e zero alertas de regressão.

---

## Technical Requirements & Architecture Guardrails

### 1. Camada de Dados e Queries (`packages/db`)
- **Arquivo a editar:** `packages/db/src/queries/licitacoes-metrics.ts`
- **Leitora / DTO:**
  - Extrair o limite a partir de `fct_licitacoes_metricas` pré-calculado no dbt.

### 2. Camada Web & View Model (`apps/web`)
- **Arquivo de View Model:** `apps/web/app/[portalSlug]/licitacoes/view-model.ts`
  - Incluir a propriedade `limiteDispensaComprasServicos` na View Model a partir do mart/fallback.
- **Arquivo de Página UI:** `apps/web/app/[portalSlug]/licitacoes/page.tsx`
  - Atualizar o parágrafo explicativo da página com `{fmtCurrency(limiteDispensaComprasServicos)}`.

---

## File Structure & Impact Requirements

- **UPDATE:** `apps/web/app/[portalSlug]/licitacoes/view-model.ts` — Mapear `limiteDispensaComprasServicos` na View Model.
- **UPDATE:** `apps/web/app/[portalSlug]/licitacoes/page.tsx` — Substituir valor hardcoded `R$ 62.725,59` por variável dinâmica formatada via `fmtCurrency`.
- **UPDATE:** `apps/web/app/[portalSlug]/licitacoes/view-model.spec.ts` — Atualizar testes unitários da View Model para validar a propagação do limite fiscal.
- **UPDATE:** `packages/db/src/queries/__tests__/licitacoes-metrics.spec.ts` — Validar a presença de `limiteDispensa` pré-calculado pelo dbt.

---

## Dev Agent Record & Tasks Checklist

- [x] **Sem Valores Hardcoded:** Eliminado o valor fixo `62.725,59` do cabeçalho de `apps/web/app/[portalSlug]/licitacoes/page.tsx`.
- [x] **Nomes Explícitos de Métricas:** Utilizado `limiteDispensaComprasServicos` (sem abreviações opacas).
- [x] **Arquitetura Respeitada:** dbt Mart de métricas `fct_licitacoes_metricas` mantido como a Única Fonte da Verdade (SSOT).
- [x] **Testes Automatizados Verificados:** Suíte `pnpm test` (vitest e tipagem TypeScript) executando 100% verde.
dinâmica e precisa do limite financeiro de acordo com o ano selecionado no menu superior.
