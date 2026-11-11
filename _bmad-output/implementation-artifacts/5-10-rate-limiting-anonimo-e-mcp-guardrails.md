---
baseline_commit: 31b0049
---

# Story 5.10: Trava de Segurança, Rate Limiting Anônimo & Guardrails no MCP Server

## Status
- **Status:** done
- **Epic:** 5 - Arquitetura Analytics Serverless, Servidor MCP & Assistente Fiscal com Evals
- **Sub-Epic:** 5.10 - Proteção de Infraestrutura, Rate Limiting por IP/Sessão e Guardrails de API
- **Story Key:** 5-10-rate-limiting-anonimo-e-mcp-guardrails
- **Last Updated:** 2026-08-20

---

## User Story Statement

**As a** engenheiro de segurança e desenvolvedor backend,  
**I want** um mecanismo de Rate Limiting e controle de cotas na camada de API (`/api/assistant/chat` e `/api/mcp`),  
**So that** usuários anônimos sejam limitados a 5 requisições de IA por dia por IP/Sessão, protegendo o banco Supabase de abusos e estabelecendo a base do funil de conversão para cadastro.

---

## Acceptance Criteria

1. **Dado** uma requisição enviada por usuário anônimo (sem token JWT de autenticação),
2. **When** a requisição atinge os endpoints `/api/assistant/chat` ou `/api/mcp`,
3. **Then** o sistema identifica o cliente via IP (`x-forwarded-for` / `x-real-ip`) e Cookie de Sessão Anônima (`transparencia_anon_id`).
4. **And** se a cota do usuário anônimo for menor ou igual a 5 requisições em 24 horas, a consulta é processada normalmente e os cabeçalhos de rate-limit (`X-RateLimit-Limit: 5`, `X-RateLimit-Remaining: N`) são retornados.
5. **And** se a 6ª requisição for enviada no mesmo período, a API responde com código HTTP **429 (Too Many Requests)**.
6. **And** o corpo da resposta em 429 contém o JSON estruturado:
   ```json
   {
     "error": "QUOTA_EXCEEDED",
     "code": "ANONYMOUS_LIMIT_REACHED",
     "message": "Você atingiu o limite de 5 perguntas gratuitas de hoje. Crie sua conta para continuar!",
     "limit": 5,
     "remaining": 0
   }
   ```
7. **And** para o servidor MCP (`/api/mcp`), requisições com cabeçalho `X-MCP-API-Key` assinado ou token JWT válido ignoram o limite anônimo.
8. **And** todas as suítes de testes (`pnpm test` e `pnpm build`) continuam 100% limpas e aprovadas.

---

## Technical Requirements & Architecture Guardrails

### 1. Utility de Rate Limiting (`apps/web/lib/rate-limit.ts`)
- Utilitário leve de contagem de requisições baseado em memória/IP com sliding window de 24h.
- Suporte a verificação de headers (`x-forwarded-for`, `x-real-ip`).

### 2. Guardrails em Middleware / API Routes (`apps/web/app/api/`)
- Integrar a verificação de cota anônima nas rotas `app/api/assistant/chat/route.ts` e `app/api/mcp/route.ts`.

---

## Tasks / Subtasks

- [x] Task 1: Criar o módulo de rate limiting `apps/web/lib/rate-limit.ts` (AC: #3, #4)
- [x] Task 2: Integrar a trava de cota anônima em `apps/web/app/api/assistant/chat/route.ts` (AC: #4, #5, #6)
- [x] Task 3: Integrar a trava e validação de `X-MCP-API-Key` em `apps/web/app/api/mcp/route.ts` (AC: #7)
- [x] Task 4: Escrever testes unitários e de integração para o rate limit (AC: #8)

