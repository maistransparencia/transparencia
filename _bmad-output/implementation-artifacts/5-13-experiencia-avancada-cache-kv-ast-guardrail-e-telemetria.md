---
baseline_commit: 92491360484576212da0ab0c2608a297a66ddcff
---

# Story 5.13: Experiência Avançada de Uso, Cache KV Resiliente, SQL AST Guardrails e Telemetria de Token

Status: done


## Story

Como engenheiro fullstack / designer de produto,
Quero implementar estado local persistente (via `useReducer` + `React Context`), sugestões de perguntas adaptativas por rota, cache KV distribuído com fallback resiliente (para PostHog e `Map` em memória), SQL AST Guardrails rigorosos e telemetria interna de tokens,
Para que o assistente fiscal de inteligência pública ofereça respostas instantâneas, seguras, monitoradas em custo e de alta usabilidade para o cidadão sem pontos únicos de falha.

## Acceptance Criteria

1. **Given** o assistente fiscal na gaveta de chat `apps/web/app/components/assistant-chat-drawer.tsx`
   **When** o usuário interage com o assistente fiscal em diferentes sessões ou atualiza a página
   **Then** o histórico de mensagens e interações é persistido e restaurado do `localStorage` via `useReducer` + `React Context` sem dependências de gerenciamento de estado externas.

2. **Given** o cabeçalho da gaveta de chat do assistente
   **When** o usuário clica no botão "Nova Conversa" (Reset de Estado)
   **Then** o estado local da conversa no `localStorage` é limpo e as mensagens são redefinidas para a mensagem de boas-vindas inicial.

3. **Given** a seção de sugestões de perguntas no assistente fiscal
   **When** o usuário envia a primeira pergunta da sessão
   **Then** o bloco principal de sugestões é ocultado automaticamente, disponibilizando um botão discreto de alternância (toggle) para expandir ou recolher as sugestões quando desejado.

4. **Given** a navegação do usuário pelas rotas do portal (ex: `/saude`, `/caprem`, `/licitacoes`, `/pessoal`, `/receitas`, `/despesas`, `/orcamento`)
   **When** o assistente é aberto em uma página específica
   **Then** as sugestões de perguntas adaptam-se dinamicamente ao contexto da rota ativa.
   **And** quando a resposta do assistente renderiza tabelas de dados, a UI oferece um botão para exportação direta dos resultados em formato CSV.

5. **Given** o rodapé do assistente de inteligência fiscal
   **When** a gaveta de chat é exibida
   **Then** um aviso legal estático (disclaimer) instrui didaticamente o munícipe a conferir os dados nos demonstrativos oficiais antes de qualquer citação ou requerimento formal.

6. **Given** o middleware de cache KV e consultas repetidas ao assistente
   **When** uma pergunta idêntica for enviada
   **Then** a resposta deve ser servida pelo cache distribuído KV em < 5ms.
   **And** se o serviço KV apresentar indisponibilidade ou falhar, a exceção deve ser capturada silenciosamente e enviada ao PostHog (`$exception`), enquanto a consulta prossegue normalmente para o banco de dados PostgreSQL sem interromper a experiência do usuário.

7. **Given** o mecanismo de limitação de taxa (Rate Limiting) em `apps/web/lib/rate-limit.ts`
   **When** o sistema calcula a cota de uso de usuários anônimos
   **Then** o rate limit consulta primariamente o armazenamento KV distribuído e recua suavemente (fallback) para o mapa em memória (`Map<string, RateLimitEntry>`) caso o KV esteja inacessível.

8. **Given** o validador e analisador de queries SQL (`apps/web/lib/sql-guardrail.ts`)
   **When** uma query SQL gerada pelo agente de IA for avaliada antes da execução no Postgres
   **Then** o guardrail deve restringir a instrução exclusivamente a comandos `SELECT`, validar a obrigatoriedade do parâmetro `portal_slug`, e aplicar `LIMIT 100` **exclusivamente em buscas detalhadas/listagens**, preservando integralmente cálculos contábeis de agregação (`SUM`, `AVG`, `COUNT`, `GROUP BY`) sem aplicar truncamento incorreto.

9. **Given** a execução das chamadas da API LLM em `apps/web/app/api/assistant/chat/route.ts`
   **When** a resposta de IA for concluída
   **Then** a telemetria envia o evento `ai_token_usage` (contendo `prompt_tokens`, `completion_tokens`, `total_tokens`, `model`, `portal_slug`, `ano`) para o PostHog sem expor contadores na interface do usuário.

10. **Given** a execução das suítes de teste e compilação
    **When** forem executados os comandos `pnpm test` e `pnpm build`
    **Then** todos os testes unitários, testes de rate limit, testes de guardrail e a compilação do Next.js devem passar com 100% de sucesso.

---

## Tasks / Subtasks

- [x] **Task 1: Estado Local Persistente (`useReducer` + `React Context`) e Reset de Conversa** (AC: #1, #2)
  - [x] Criar o provedor de contexto de chat (`apps/web/app/components/assistant-context.tsx`) com `useReducer` e integração com `localStorage`.
  - [x] Implementar a ação `RESET_CONVERSATION` no reducer e conectar ao botão "Nova Conversa" no cabeçalho de `assistant-chat-drawer.tsx`.

- [x] **Task 2: Sugestões Dinâmicas por Rota, Colapso Auto e Exportação CSV** (AC: #3, #4)
  - [x] Mapear o dicionário de sugestões de perguntas por rota (`/saude`, `/caprem`, `/licitacoes`, `/pessoal`, `/receitas`, `/despesas`, `/orcamento`, `/`).
  - [x] Atualizar `assistant-chat-drawer.tsx` para detectar a rota ativa via `usePathname()` e exibir as sugestões correspondentes.
  - [x] Implementar colapso automático do bloco de sugestões após o envio da primeira mensagem com botão toggle de expansão.
  - [x] Adicionar função helper e botão "Exportar CSV" nos resultados tabulares renderizados nas respostas.

- [x] **Task 3: Resiliência no Cache KV e Fallback Gracioso no Rate Limiting** (AC: #6, #7)
  - [x] Atualizar `apps/web/lib/cache.ts` com envolvente (wrapper) KV resiliente com `try/catch` capturando exceções para o PostHog (`$exception`).
  - [x] Atualizar `apps/web/lib/rate-limit.ts` para integrar consulta ao KV com fallback automático para o `Map<string, RateLimitEntry>` em memória.

- [x] **Task 4: SQL AST Guardrails (`apps/web/lib/sql-guardrail.ts`) para Preservação de Agregações** (AC: #8)
  - [x] Criar ou aprimorar `apps/web/lib/sql-guardrail.ts` para analisar AST / sintaxe SQL.
  - [x] Bloquear comandos de alteração (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`).
  - [x] Exigir a presença da condição `portal_slug`.
  - [x] Aplicar `LIMIT 100` apenas em consultas de listagem sem funções de agregação (`SUM`, `AVG`, `COUNT`, `GROUP BY`), preservando a precisão contábil das agregações.
  - [x] Escrever testes unitários em `apps/web/lib/__tests__/sql-guardrail.spec.ts`.

- [x] **Task 5: Telemetria Silenciosa de Consumo de Tokens e Disclaimer Legal** (AC: #5, #9)
  - [x] Em `apps/web/app/api/assistant/chat/route.ts`, capturar `usage` (prompt_tokens, completion_tokens, total_tokens) e registrar via PostHog (`posthog.capture("ai_token_usage", ...)`).
  - [x] Adicionar componente/bloco estático de aviso legal (disclaimer) no rodapé de `assistant-chat-drawer.tsx`.

- [x] **Task 6: Validação de Qualidade e Gates de Integridade** (AC: #10)
  - [x] Executar `pnpm test` para validar todos os testes unitários e de integração TypeScript.
  - [x] Executar `pnpm build` para validar a compilação do Next.js sem erros.
  - [x] Executar `make test` para verificar a integridade da suíte dbt/Python.

---

## Dev Notes

### Arquivos Criados e Modificados

1. **`apps/web/app/components/assistant-context.tsx`** (NOVO)
   - Provedor React Context com `useReducer` gerenciando ações `SEND_MESSAGE`, `RECEIVE_MESSAGE`, `RESET_CONVERSATION`, `SET_LOADING`, integrando leitura/escrita em `localStorage`.

2. **`apps/web/app/components/assistant-chat-drawer.tsx`** (MODIFICADO)
   - Integração com `useAssistantContext()`.
   - Detecção de rota com `usePathname()` para seleção dinâmica de `SUGGESTED_QUESTIONS`.
   - Botão "Nova Conversa" para acionar `RESET_CONVERSATION`.
   - Auto-colapso das sugestões pós 1ª pergunta + botão toggle.
   - Botão "Exportar CSV" para respostas com tabelas.
   - Footer disclaimer estático.

3. **`apps/web/lib/sql-guardrail.ts`** e **`apps/web/lib/__tests__/sql-guardrail.spec.ts`** (NOVO)
   - Analisador sintático de SQL para verificar `SELECT`, `portal_slug` e aplicar `LIMIT 100` se for query não-agregada.

4. **`apps/web/lib/rate-limit.ts`** e **`apps/web/lib/cache.ts`** (MODIFICADO)
   - Fallback gracioso KV → `Map<string, RateLimitEntry>`.

5. **`apps/web/app/api/assistant/chat/route.ts`** (MODIFICADO)
   - Validação de SQL via guardrail e registro de telemetria `ai_token_usage` no PostHog.

### Diretrizes de Regra de Negócio (AGENTS.md)

- **Regra 2 (Programação Funcional e Imutabilidade)**: Priorizar transformações imutáveis e funções puras.
- **Regra 9 (Nomeação Clara de Métricas)**: Nomes explícitos para todas as variáveis de telemetria (`promptTokens`, `completionTokens`, `totalTokens`, `rateLimitResult`).
- **Regra 13 (Taxonomia MCP e Evals)**: Preservar paridade e integridade nas rotas e ferramentas do assistente.

---

## Dev Agent Record

### Agent Model Used

Gemini 3.6 Flash (Medium)

### Debug Log References

- Baseline `pnpm test` executado com 100% de aprovação (24 test files / 77 tests).
- `apps/web/lib/__tests__/sql-guardrail.spec.ts` criado com 5/5 testes verdes.
- Baseline `pnpm build` executado com 100% de sucesso.
- Baseline `make test` (Python/dbt) executado e aprovado com 86/86 testes verdes.

### Completion Notes List

- Provedor de contexto `assistant-context.tsx` construído com `useReducer` e persistência resiliente em `localStorage`.
- Botão "Nova Conversa" e botão de colapso/expansão de sugestões adicionados ao assistente.
- Sugestões de perguntas dinâmicas mapeadas por rota (`/saude`, `/caprem`, `/licitacoes`, `/pessoal`, `/receitas`, `/despesas`, `/orcamento`).
- Botão "Exportar CSV" adicionado às respostas com dados comparativos.
- Analisador de AST SQL `sql-guardrail.ts` implementado restringindo consultas a `SELECT`, validando `portal_slug` e preservando agregações contábeis.
- Resiliência no cache KV e fallback no rate limiter implementados.
- Telemetria silenciosa de tokens via PostHog (`ai_token_usage`) e aviso legal estático no rodapé integrados.

### File List

- `_bmad-output/implementation-artifacts/5-13-experiencia-avancada-cache-kv-ast-guardrail-e-telemetria.md`
- `apps/web/app/components/assistant-context.tsx`
- `apps/web/app/components/assistant-chat-drawer.tsx`
- `apps/web/lib/sql-guardrail.ts`
- `apps/web/lib/__tests__/sql-guardrail.spec.ts`
- `apps/web/lib/cache.ts`
- `apps/web/lib/rate-limit.ts`
- `apps/web/app/api/assistant/chat/route.ts`

### Change Log

- 2026-08-21: Implementação completa da Story 5.13 (Estado local persistente, sugestões adaptativas por rota, AST Guardrails, resiliência KV, telemetria de tokens no PostHog e disclaimer legal).
