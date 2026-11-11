# Story 5.14: Hierarquia de Fontes de Receita, Alinhamento dbt, Taxonomia MCP e Evals do Assistente

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a fullstack engineer / AI data architect,
I want to standardize the fiscal revenue hierarchy across dbt metrics models (`fct_fontes_receita_metricas`), sync the MCP fiscal taxonomy (`FISCAL_TAXONOMY` / `fiscal-taxonomy.json`), enforce the gold rule for revenue queries in assistant prompt skills, and add benchmark eval tests,
So that citizens and AI agents querying municipal revenue sources receive accurate, un-duplicated, STN/MCASP-compliant fiscal answers with 100% data integrity and zero naive SQL query hallucinations.

## Acceptance Criteria

1. **Given** o modelo dbt `fct_fontes_receita_metricas.sql` e seus esquemas YAML (`_fct_fontes_receita_metricas.yml` e `_fct_receitas.yml`)
   **When** os marts de métricas de receita são compilados e executados
   **Then** a CTE `carros_chefe` e as colunas de métricas (`fpm_arrecadado`, `icms_arrecadado`, `iss_iptu_arrecadado`, `emendas_pix_arrecadado`, `receita_propria_arrecadado`, `transferencias_uniao_arrecadado`, `transferencias_estado_arrecadado`, `total_arrecadado`) refletem com precisão a hierarquia MCASP sem dupla contagem com códigos sintéticos agregadores.

2. **Given** a alteração nos marts dbt de receitas
   **When** o script de codegen `pnpm codegen:taxonomy` (ou `python3 scripts/codegen-taxonomy.py`) é executado
   **Then** a constante `FISCAL_TAXONOMY` em `apps/web/lib/mcp/transparencia-mcp.ts` e o arquivo `apps/web/lib/mcp/fiscal-taxonomy.json` são recompilados e sincronizados automaticamente a partir dos arquivos YAML do dbt.

3. **Given** a skill do assistente fiscal `apps/web/lib/skills/posicao-fiscal.md`, o construtor de contexto `context-builder.ts` e o motor ReAct `react-engine.ts`
   **When** o assistente fiscal recebe perguntas sobre principal fonte de renda, maiores receitas ou transferências vs. receita própria
   **Then** o assistente obrigatoriamente direciona a consulta SQL para a mart `fct_fontes_receita_metricas`, proibindo consultas ingênuas (naive) na mart transacional `fct_receitas` ordenadas por `arrecadado DESC` sem desconsiderar rubricas sintéticas (ex: `1.0.0.0.00.0.0`).

4. **Given** a suíte de avaliação de IA em `apps/web/lib/evals/benchmark-questions.ts`
   **When** a suíte de evals é executada (`pnpm test`)
   **Then** a pergunta de benchmark `eval-16` ("Qual a principal fonte de renda da prefeitura?") é validada com sucesso apontando para a mart `fct_fontes_receita_metricas` e métricas `["fpm_arrecadado", "icms_arrecadado", "total_arrecadado"]`.

5. **Given** as alterações na suíte de testes do backend e frontend
   **When** os comandos de verificação de qualidade (`make test`, `make check`, `pnpm test`, `pnpm build`) são executados
   **Then** todos os testes passam 100% verdes sem regressões de tipagem ou falhas contábeis.

## Tasks / Subtasks

- [x] Task 1: Alinhamento dbt e CTE `carros_chefe` em `fct_fontes_receita_metricas` (AC: #1)
  - [x] Ajustar lógica da CTE `carros_chefe` em `fct_fontes_receita_metricas.sql` para cálculo correto de FPM, ICMS, ISS/IPTU e Emendas PIX.
  - [x] Atualizar descrições de schema em `elt/transform/models/marts/metrics/_fct_fontes_receita_metricas.yml` e `elt/transform/models/marts/_fct_receitas.yml`.
- [x] Task 2: Sincronização Automática da Taxonomia MCP (AC: #2)
  - [x] Executar `pnpm codegen:taxonomy` (ou `python3 scripts/codegen-taxonomy.py`).
  - [x] Garantir atualização de `apps/web/lib/mcp/fiscal-taxonomy.json` e `apps/web/lib/mcp/transparencia-mcp.ts`.
- [x] Task 3: Regra Ouro e Prompts do Assistente de IA (AC: #3)
  - [x] Adicionar Seção 7 ("Hierarquia e Origem das Receitas Orçamentárias (MCASP)") em `apps/web/lib/skills/posicao-fiscal.md`.
  - [x] Atualizar `apps/web/lib/agent/react-engine.ts` e `apps/web/lib/skills/context-builder.ts` para reforçar obrigatoriedade da mart `fct_fontes_receita_metricas`.
- [x] Task 4: Inclusão de Evals e Pergunta de Benchmark (AC: #4)
  - [x] Adicionar `eval-16` em `apps/web/lib/evals/benchmark-questions.ts` ("Qual a principal fonte de renda da prefeitura?").
  - [x] Rodar testes de evals e paridade via `pnpm test`.
- [x] Task 5: Gate de Qualidade Mandatória (AC: #5)
  - [x] Executar `make test` e `make check` no backend Python/dbt.
  - [x] Executar `pnpm test` e `pnpm build` no frontend TypeScript/Next.js.

## Dev Notes

- **Axioma Contábil STN/MCASP**: Na contabilidade pública municipal brasileira, rubricas sintéticas de receita (ex: `1.0.0.0.00.0.0 - Receitas Correntes`) são aglutinadoras de nível superior. Consultar `fct_receitas` ordenando diretamente por `arrecadado DESC` gera falsos positivos ao retornar categorias agregadas no lugar das fontes reais de recursos (FPM, ICMS, IPTU, ISS).
- **Mart Canônica de Métricas**: `fct_fontes_receita_metricas` pré-calcula a segregação por portal e exercício fiscal, constituindo a fonte única da verdade para consultas sobre principais fontes de renda.
- **Sincronização de Taxonomia (MCP)**: Conforme Regra #13 de `AGENTS.md`, qualquer mudança em schemas YAML de marts exige re-execução do script `pnpm codegen:taxonomy`.
- **Nomes de Métricas**: Manter nomes explícitos conforme Regra #9 (`fpm_arrecadado`, `icms_arrecadado`, `receita_propria_arrecadado`, `total_arrecadado`).

### Project Structure Notes

- `elt/transform/models/marts/metrics/fct_fontes_receita_metricas.sql`: Modelo de métricas de receitas no dbt.
- `elt/transform/models/marts/metrics/_fct_fontes_receita_metricas.yml`: Schema YAML de metadados do mart.
- `apps/web/lib/mcp/fiscal-taxonomy.json` & `apps/web/lib/mcp/transparencia-mcp.ts`: Taxonomia MCP consumida pelos agentes de IA.
- `apps/web/lib/skills/posicao-fiscal.md`: Instruções de domínio fiscal injetadas no prompt do assistente.
- `apps/web/lib/evals/benchmark-questions.ts`: Matriz de perguntas para benchmark e evals de precisão de IA.

### References

- [AGENTS.md: Regra 13 - Sincronização da Taxonomia MCP e Evals de IA](file:///Volumes/Projects/transparencia/AGENTS.md#L120-L123)
- [Posição Fiscal Skill: Seção 7 - Hierarquia e Origem das Receitas Orçamentárias](file:///Volumes/Projects/transparencia/apps/web/lib/skills/posicao-fiscal.md#L32-L36)
- [Mart Schema: _fct_fontes_receita_metricas.yml](file:///Volumes/Projects/transparencia/elt/transform/models/marts/metrics/_fct_fontes_receita_metricas.yml#L1-L100)

## Dev Agent Record

### Agent Model Used

Gemini 3.6 Flash (Medium)

### Debug Log References

### Completion Notes List

- Story file criada via `/bmad-create-story` com alinhamento das regras contábeis STN/MCASP, taxonomia MCP, instrução de prompt de IA e testes de evals.

### File List

- `_bmad-output/implementation-artifacts/5-14-hierarquia-de-fontes-de-receita-alinhamento-dbt-taxonomia-mcp-e-evals.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
