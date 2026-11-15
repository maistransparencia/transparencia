---
baseline_commit: d1daf38
---

# Story 5.11: Evals de Acurácia, Benchmarks Fiscais e Regras de Validação do Assistente

## Status
- **Status:** done
- **Epic:** 5 - Arquitetura Analytics Serverless, Servidor MCP & Assistente Fiscal com Evals
- **Sub-Epic:** 5.11 - Validação Automatizada de Acurácia, Invariantes Contábeis STN/MCASP e Suíte de Evals
- **Story Key:** 5-11-evals-de-acuracia-e-regras-fiscais-do-assistente
- **Last Updated:** 2026-08-21

---

## User Story Statement

**As a** auditor fiscal, especialista de produto e desenvolvedor AI,  
**I want** uma suíte expandida de Evals e Benchmark Questions (`apps/web/lib/evals/`) cobrindo todas as rotas e regras contábeis públicas (STN/MCASP, Posição Fiscal, Despesas, Licitações, Saúde, CAPREM, Pessoal),  
**So that** possamos garantir regredimento zero, invariantes fiscais protegidas e precisão de respostas do Assistente de IA a cada atualização do repositório.

---

## Acceptance Criteria

1. **Dado** a suíte de avaliação de IA (`apps/web/lib/evals/`),
2. **When** o comando `pnpm test` ou o runner de evals (`eval-runner.ts`) é executado,
3. **Then** todas as perguntas do benchmark (`apps/web/lib/evals/benchmark-questions.ts`) são avaliadas contra os invariantes fiscais.
4. **And** perguntas de Posição Fiscal testam o equilíbrio orçamentário e a segregação de restos a pagar anterior vs atual.
5. **And** perguntas de Saúde e CAPREM testam limites de aplicação mínima constitucional (15% saúde) e integridade previdenciária.
6. **And** perguntas de Licitações e Contratos testam a detecção de gaps de licitação, inexigibilidades e dispensas.
7. **And** o script `pnpm codegen:taxonomy` confirma sincronia 100% entre a taxonomia dbt e a constante `FISCAL_TAXONOMY`.
8. **And** todas as suítes de testes Vitest e pytest passam sem falhas.

---

## Technical Requirements & Architecture Guardrails

### 1. Benchmark Questions (`apps/web/lib/evals/benchmark-questions.ts`)
- Adicionar questões representativas cobrindo todos os marts e visualizações do portal.
- Testar invariants fiscais como não dupla contagem de receitas raiz, saldo de restos a pagar e percentuais de aplicação em saúde.

### 2. Taxonomia MCP (`apps/web/lib/mcp/transparencia-mcp.ts`)
- Recompilar via `pnpm codegen:taxonomy` para garantir total aderência aos esquemas YAML dos marts dbt.

---

## Tasks / Subtasks

- [x] Task 1: Executar `pnpm codegen:taxonomy` e verificar sincronia de `FISCAL_TAXONOMY` (AC: #7)
- [x] Task 2: Expandir o banco de perguntas e invariantes em `apps/web/lib/evals/benchmark-questions.ts` (AC: #3, #4, #5, #6)
- [x] Task 3: Executar e validar a suíte de testes unitários e evals via `pnpm test` (AC: #8)
