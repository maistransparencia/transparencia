---
baseline_commit: 2264a8d0a5cc4ee95b0e3c0f3efe1f57d3f79c93
---

# Story 4.14: Derivação de Status de Inexecução Contratual e Filtro de Segmentação de Execução na UI

# Story 4.14: Derivação de Status de Inexecução Contratual e Filtro de Segmentação de Execução na UI

Status: done

## Story

**As a** munícipe ou auditor fiscal navegando nas páginas de Licitações e Saúde do Portal da Transparência,  
**I want** que os contratos vencidos sem nenhuma execução financeira (`total_liquidado = 0` / `total_pago = 0`) sejam classificados como "Não Executados" (inexecutados/rescindidos) e segregados através de um filtro de segmentação por status de execução,  
**So that** os contratos inexecutados fiquem organizados e consultáveis sob demanda, sem poluir visualmente os cards padrão de contratos em execução nem exigir textos explicativos extensos ou tooltips escondidas.

## Acceptance Criteria

1. **Given** a leitora de dados `getContratosServicosVigentes` em `@transparencia/db` e a interface `ContratoServicoVigente`
2. **When** a leitora processa os contratos retornados da tabela/mart `fct_contratos_servicos_vigentes`
3. **Then** ela deve derivar o campo semântico `statusExecucao: 'em_execucao' | 'concluido' | 'inexecutado'`, onde:
   - `'inexecutado'`: contrato cuja data de vencimento (`vencimentoAtual`) é menor que a data/ano de referência atual e apresenta liquidação/pagamento zerados (`totalLiquidado === 0` / `totalPago === 0`).
   - `'concluido'`: contrato onde `percentualPago >= 100` ou saldo pendente quitado em contrato vencido.
   - `'em_execucao'`: contrato ativo dentro da vigência ou com execuções financeiras em andamento.

4. **Given** o componente de lista/seção de contratos `ContratosServicosVigentesSection` em `apps/web/components/contratos-servicos-vigentes-section.tsx`
5. **When** a seção é renderizada na página (ex: `/licitacoes` ou `/saude`)
6. **Then** ela deve disponibilizar um filtro de segmentação limpo por status de execução (opções: `Em Execução` [padrão ativo], `Concluídos`, `Não Executados` / `Todos`), permitindo ao usuário alternar a visualização e auditar contratos inexecutados sob demanda.

7. **Given** a renderização de um card de contrato (`ContratoServicoVigenteCard`) para um item classificado como `'inexecutado'` na visão filtrada
8. **When** o card é exibido
9. **Then** deve apresentar apenas um badge neutro e minimalista (ex: `Sem Execução Orçamentária`), sem adicionar blocos de texto explicativos redundantes ou tooltips poluídas.

10. **Given** alterações em campos ou DTOs expostos publicamente
11. **When** a funcionalidade for concluída
12. **Then** os guias de leitura para IAs `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` devem ser atualizados conforme a Regra 12 de `AGENTS.md` caso novos tipos/atributos sejam disponibilizados publicamente.

13. **And** todas as suítes de teste e validação (`make test`, `make test/ts` e `pnpm build`) devem ser executadas e passar com 100% de sucesso.

---

## Tasks / Subtasks

- [x] **Task 1: Extensão do DTO e Derivação do Status de Execução em `@transparencia/db`** (AC: #1, #2, #3)
  - [x] Adicionar o campo `statusExecucao: 'em_execucao' | 'concluido' | 'inexecutado'` ao tipo `ContratoServicoVigente` em `packages/db/src/queries/contratos-servicos-vigentes.ts`.
  - [x] Implementar a regra de derivação pura no mapeamento da função leitora `getContratosServicosVigentes`.
  - [x] Atualizar ou adicionar testes unitários em `packages/db/src/queries/__tests__/contratos-servicos-vigentes.spec.ts` cobrindo cenários de contrato inexecutado (`total_liquidado = 0` e data vencida).

- [x] **Task 2: Filtro de Segmentação de Execução em `ContratosServicosVigentesSection`** (AC: #4, #5, #6)
  - [x] Adicionar estado local de filtro de status em `apps/web/components/contratos-servicos-vigentes-section.tsx` (default: `'em_execucao'`).
  - [x] Renderizar grupo de botões/pills de segmentação (`Em Execução`, `Concluídos`, `Não Executados`, `Todos`).
  - [x] Filtrar os contratos exibidos na lista de cards e na `DenseTable` conforme o status selecionado.

- [x] **Task 3: Badge Minimalista de Inexecução em `ContratoServicoVigenteCard`** (AC: #7, #8, #9)
  - [x] Injetar visualização de badge neutro para `statusExecucao === 'inexecutado'` em `apps/web/components/contrato-servico-vigente-card.tsx` (ex: badge slate/gray `Sem Execução Orçamentária`).
  - [x] Assegurar que nenhum layout shift ou poluição visual por tooltip excessiva ocorra.

- [x] **Task 4: Atualização de Documentação LLM (`llms.txt` / `llms-full.txt`) e Validação CI/CD** (AC: #10, #11, #12, #13)
  - [x] Verificar e atualizar `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` se necessário.
  - [x] Executar a suíte de testes fiscais Python/dbt via `make test`.
  - [x] Executar os testes unitários TypeScript/Kysely via `make test/ts` (ou `pnpm test`).
  - [x] Executar o build estático e validação de tipos via `pnpm build`.

### Review Findings

- [x] [Review][Patch] Divergência e bug na regra SQL de status_execucao em fct_contratos_servicos_vigentes.sql vs TypeScript [elt/transform/models/marts/fct_contratos_servicos_vigentes.sql:118]
- [x] [Review][Patch] Documentação LLM incompleta (llms.txt / llms-full.txt) violando a Regra 12 de AGENTS.md e AC #12 [apps/web/public/llms.txt:1]
- [x] [Review][Patch] Inconsistência visual de rótulos e cores de badges de status entre Card e Tabela [apps/web/components/contrato-servico-vigente-card.tsx:29]
- [x] [Review][Patch] Barra de progresso vazia órfã em cards de contratos inexecutados [apps/web/components/contrato-servico-vigente-card.tsx:63]
- [x] [Review][Patch] Divergência no limite de tolerância para status concluido entre SQL (100% estrito) e TypeScript (>= 99.9%) [packages/db/src/queries/contratos-servicos-vigentes.ts:45]
- [x] [Review][Patch] Utilização de data UTC (toISOString) em deriveStatusExecucao pode adiantar a data de referência em fusos negativos [packages/db/src/queries/contratos-servicos-vigentes.ts:34]

---

## Dev Notes

### Arquitetura & Guardrails (`AGENTS.md`)
- **Regra 9 (Nomeação Explícita de Métricas)**: Utilizar `statusExecucao` com os literais em `lowercase_snake_case` (`'em_execucao'`, `'concluido'`, `'inexecutado'`).
- **Regra 10 (Slugs/Códigos em Lowercase Snake Case)**: Todos os valores fixos de status devem permanecer em `lowercase_snake_case`. A camada de apresentação (`packages/ui` ou componentes web) é a única responsável por formatar e traduzir em labels amigáveis para o usuário (`Em Execução`, `Concluídos`, `Não Executados`).
- **AD-3 & AD-4**: `@transparencia/db` realiza a leitura pass-through e derivação semântica atômica; os componentes UI residem co-localizados em `apps/web/components/`.

### Arquivos a Modificar
- **UPDATE:** `packages/db/src/queries/contratos-servicos-vigentes.ts` — Adicionar `statusExecucao` na interface `ContratoServicoVigente` e lógica de derivação.
- **UPDATE:** `packages/db/src/queries/__tests__/contratos-servicos-vigentes.spec.ts` — Testes para derivação de `statusExecucao`.
- **UPDATE:** `apps/web/components/contratos-servicos-vigentes-section.tsx` — Adicionar filtro de segmentação de status.
- **UPDATE:** `apps/web/components/contrato-servico-vigente-card.tsx` — Badge neutro para contratos inexecutados.
- **UPDATE:** `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` — Sincronização de documentação de IA se aplicável.

---

## Dev Agent Record

### Agent Model Used
Gemini 3.6 Flash (Medium)

### Debug Log References
- N/A

### Completion Notes List
- Derivado `statusExecucao` (`em_execucao`, `concluido`, `inexecutado`) na leitora `getContratosServicosVigentes` em `@transparencia/db`.
- Adicionados testes unitários para `deriveStatusExecucao` em `contratos-servicos-vigentes.spec.ts`.
- Adicionado filtro de segmentação de status em `ContratosServicosVigentesSection` com contagens dinâmicas por categoria.
- Adicionado badge neutro `Sem Execução Orçamentária` em `ContratoServicoVigenteCard` para contratos inexecutados.
- Atualizado guia de IA em `apps/web/public/llms-full.txt`.
- Validados todos os gates de integridade: `make test` (83/83 Python/dbt), `pnpm test` (37/37 DB, 49/49 Web) e `pnpm build` com 100% de sucesso.

### Change Log
- 2026-08-14: Implemented story 4.14 - Derivação de status de inexecução contratual e filtro de segmentação na UI.

### File List
- `packages/db/src/queries/contratos-servicos-vigentes.ts`
- `packages/db/src/queries/__tests__/contratos-servicos-vigentes.spec.ts`
- `apps/web/components/contrato-servico-vigente-card.tsx`
- `apps/web/components/contratos-servicos-vigentes-section.tsx`
- `apps/web/public/llms-full.txt`
- `_bmad-output/implementation-artifacts/4-14-derivacao-de-status-de-inexecucao-contratual-e-filtro-de-segmentacao-de-execucao-na-ui.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
