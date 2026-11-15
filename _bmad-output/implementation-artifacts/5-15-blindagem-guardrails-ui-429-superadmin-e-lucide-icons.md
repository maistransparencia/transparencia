# Story 5.15: Blindagem de Guard-Rails, Rate Limit 429 UI, Superadmin Mode, Lucide Icons & Integração Supabase Auth

**Status:** done  
**Epic:** Epic 5 - Histórico do Assistente & MCP  

## User Story
As a product manager / lead fullstack engineer,
I want full control over API guardrails (HTTP 429 error handling in `assistant-chat-drawer.tsx`, Superadmin bypass mode in `lib/rate-limit.ts`, PostHog rate limit telemetry), 100% removal of unicode emojis in favor of `lucide-react` icons, persistent local chat history, and direct integration of Supabase Auth (`@supabase/ssr`),
So that users receive friendly rate-limit feedback leading directly to account creation via Supabase Auth, logged-in users unlock expanded query quotas, developers test without restrictions using Superadmin mode, and the chat UI delivers a clean, consistent, high-converting experience.

## Acceptance Criteria

### Fase 1: Domínio e Blindagem dos Guard-Rails (Prioridade Imediata)
1. **Modo Superadmin:** O módulo `lib/rate-limit.ts` deve suportar o modo Superadmin (via header `x-superadmin-key` comparando com `process.env.SUPERADMIN_SECRET_KEY`), permitindo bypass de 100% dos limites de requisição.
2. **Tratamento de 429 na UI:** Ao receber status `429` do backend/middleware, `assistant-chat-drawer.tsx` **não** deve exibir a mensagem genérica de erro ("Desculpe, ocorreu um erro..."). Deve ler o JSON `{ code, message, resetAt, limit }` e exibir cards amigáveis específicos.
3. **Telemetria de Guard-Rails no PostHog:** Disparar o evento `ai_rate_limit_reached` (`user_type`, `limit_count`, `reset_at`, `portal_slug`, `current_route`) no PostHog ao atingir qualquer limite.
4. **Padronização Lucide Icons:** Substituir 100% dos emojis unicode por componentes da biblioteca `lucide-react` na gaveta de chat e injetar instrução no motor ReAct (`react-engine.ts`) orientando o LLM a não gerar emojis unicode no texto.
5. **Hero Welcome Card & Persistência Local:** Renderizar Hero Card centralizado com ícones Lucide no estado vazio da gaveta apresentando as vantagens do assistente e sincronizar o histórico com `localStorage` em dev/localhost.

### Fase 2: Infraestrutura de Autenticação Supabase Auth (`@supabase/ssr`)
6. **Instalação Pinned:** Instalar `@supabase/supabase-js` e `@supabase/ssr` com versões exatas via `pnpm add --save-exact`.
7. **Clientes & Proxy Supabase Auth:** Criar `lib/supabase/client.ts`, `server.ts`, integração no middleware centralizado `apps/web/proxy.ts` (convenção Next.js do projeto) e a rota `app/auth/callback/route.ts` para troca de código OAuth/Magic Link por sessão.
8. **Componente AuthModal & Conexão:** Criar `app/components/auth-modal.tsx` (Google OAuth + Magic Link) e conectá-lo ao botão CTA do card de rate-limit no chat drawer.
9. **Verificação de Sessão no Rate Limit:** Atualizar `rate-limit.ts` para verificar a sessão ativa via `supabase.auth.getUser()`, concedendo cota expandida para usuários autenticados.

## Sequência Ordenada de Tasks

### 🔴 FASE 1: Guard-Rails, Rate Limit 429 UI & Superadmin Mode (Primeiro Passo)
- [x] **Task 1:** Implementar o modo **Superadmin** em `apps/web/lib/rate-limit.ts` (suporte a header `x-superadmin-key` que força `isAuth: true` e `limit: Infinity`).
- [x] **Task 2:** Refatorar a captura de erros no `apps/web/app/components/assistant-chat-drawer.tsx` para tratar HTTP status `429`, eliminando a mensagem de erro genérica e exibindo o Card de Limite Atingido.
- [x] **Task 3:** Adicionar telemetria no PostHog disparando o evento `ai_rate_limit_reached` ao atingir a cota.
- [x] **Task 4:** Substituir 100% dos emojis unicode em `assistant-chat-drawer.tsx` por componentes `lucide-react` e adicionar diretriz "no-emoji" no prompt do `apps/web/lib/agent/react-engine.ts`.
- [x] **Task 5:** Renderizar o **Hero Welcome Card** centralizado no estado inicial do chat e adicionar reidratação de `localStorage` em `assistant-context.tsx` para ambiente local/localhost.

### 🔵 FASE 2: Infraestrutura Supabase Auth (`@supabase/ssr`) & Onboarding
- [x] **Task 6:** Instalar pacotes `@supabase/supabase-js` e `@supabase/ssr` com versão exata no workspace `apps/web`.
- [x] **Task 7:** Criar utilitários `apps/web/lib/supabase/` (`client.ts`, `server.ts`), integrar atualização de sessão diretamente no proxy centralizado `apps/web/proxy.ts` (versão atual Next.js do projeto) e criar a rota de callback em `apps/web/app/auth/callback/route.ts`.
- [x] **Task 8:** Criar o componente modal de autenticação em `apps/web/app/components/auth-modal.tsx` e conectá-lo ao CTA do Card de Limite no `assistant-chat-drawer.tsx`.
- [x] **Task 9:** Integrar a verificação de sessão `supabase.auth.getUser()` no `rate-limit.ts` para conceder a cota expandida a usuários logados.
