# Story 5.16: Histórico de Conversas Local-First & Telemetria Anônima Desvinculada de Identidade

**Status:** done  
**Epic:** Epic 5 - Histórico do Assistente & MCP  

## User Story
As a portal user / citizen,
I want my AI assistant chat history to be saved locally in my browser by default and my conversation telemetry to be completely decoupled from my user identity,
So that I can revisit, rename, and manage my past fiscal queries across multiple sessions without feeling monitored or uncomfortable creating an account, while enabling future anonymous LLM-as-a-Judge evaluations.

## Acceptance Criteria

### Fase 1: Persistência e Gerenciamento do Histórico Local-First
1. **Armazenamento no Navegador:** As conversas do assistente fiscal devem ser salvas exclusivamente no armazenamento local do navegador (`localStorage` ou `IndexedDB`) via `assistant-context.tsx` / `useLocalChatHistory`.
2. **Gerenciamento de Conversas na UI:** A gaveta de chat (`assistant-chat-drawer.tsx`) deve permitir:
   - Iniciar uma nova conversa (`+ Nova Conversa`).
   - Listar conversas recentes agrupadas por data (Hoje, Ontem, Últimos 7 dias).
   - Alternar suavemente entre conversas salvas preservando as mensagens e contexto.
   - Renomear e excluir conversas individuais.
3. **Controle de Privacidade do Usuário:** Disponibilizar um botão "Limpar Todo o Histórico" bem visível nas configurações da gaveta, purgando instantaneamente todos os dados do navegador.

### Fase 2: Sanitização da Telemetria e Preparação para LLM-as-a-Judge Futuro
4. **Sanitização do PostHog:** Nenhum evento de analytics do PostHog associado ao `distinct_id` do usuário logado (ex: `identify()`) pode conter o texto original dos prompts ou respostas fiscais. Apenas métricas genéricas (`tokens_used`, `has_sql_result`, `route`) devem ser gravadas.
5. **Estrutura de Telemetria Anônima (Staging Evals):** Garantir que requisições de chat registrem eventos ou dados de avaliação usando um `eval_id` desvinculado (gerado via `crypto.randomUUID()`), sem `user_id`, `email` ou IP, preparando a base para futuras avaliações de acurácia com LLM-as-a-Judge sem acúmulo de passivo de privacidade.
6. **Transparência de UX (Micro-Copy):** Exibir aviso de privacidade claro no rodapé ou onboarding do chat:
   > *"Suas conversas ficam salvas exclusivamente no seu dispositivo. Nenhuma pergunta é associada à sua conta de usuário."*

## Sequência Ordenada de Tasks

### 🔴 FASE 1: Gerenciamento e Persistência Local-First no Frontend
- [x] **Task 1:** Criar/refatorar a camada de persistência em `apps/web/app/components/assistant-context.tsx` (ou hook `useLocalChatHistory`) para gerenciar coleções de conversas no `localStorage` com IDs, títulos e timestamps.
- [x] **Task 2:** Atualizar `apps/web/app/components/assistant-chat-drawer.tsx` com uma gaveta/aba de histórico permitindo trocar de conversa, criar nova conversa e excluir sessões salvas.
- [x] **Task 3:** Adicionar a ação de "Limpar todo o histórico" com modal de confirmação e micro-copy transparente de privacidade.

### 🔵 FASE 2: Sanitização do PostHog & Telemetria Anônima para Futuros Evals
- [x] **Task 4:** Auditar e refatorar as chamadas `posthog.capture()` na rota `apps/web/app/api/assistant/chat/route.ts` e no cliente para remover textos de prompts dos eventos identificados por usuário.
- [x] **Task 5:** Estruturar o disparo de telemetria anônima de conversas com UUID descartável (`query_eval_id`), preparando a infraestrutura para futuras iterações com LLM-as-a-Judge.
- [x] **Task 6:** Executar suíte de testes de validação no frontend (`pnpm test` / `make test/ts`) garantindo que as mudanças não afetam os tipos Kysely nem a compilação do Next.js (`pnpm build`).
