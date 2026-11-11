---
baseline_commit: 54320f30baf5c4ed0d25357acd06a1b1cb0b07e0
---

# Story 5.6: MVP do Assistente Fiscal LLM (Chat Drawer + API Route Text-to-SQL)

## Status
- **Status:** done
- **Epic:** 5 - Migração para Arquitetura Analytics Serverless (DuckDB + Parquet + Cloudflare R2) & Assistente LLM
- **Sub-Epic:** 5.2 - Assistente Fiscal LLM (MVP)
- **Story Key:** 5-6-interface-da-sidebar-popover-do-assistente-fiscal-llm
- **Last Updated:** 2026-08-15

---

## User Story Statement

**As a** munícipe ou auditor fiscal navegando no portal da transparência,  
**I want** clicar no botão "Perguntar aos Dados ✨" na sidebar e interagir com uma gaveta (drawer) de chat em linguagem natural com sugestões de perguntas e respostas estruturadas (com texto + mini-cards de dados/gráficos),  
**So that** eu possa consultar dados fiscais e orçamentários municipais de forma interativa, rápida e descomplicada.

---

## Acceptance Criteria

1. **Dado** a barra lateral de navegação (Sidebar),
2. **When** o portal é renderizado,
3. **Then** um botão em destaque "Perguntar aos Dados ✨" ou "Assistente Fiscal AI" é exibido na navegação da sidebar.
4. **And** ao clicar no botão, uma gaveta (drawer/popover) lateral se abre com a interface de chat.
5. **And** a gaveta exibe sugestões de perguntas clicáveis (ex: *"Qual o total arrecadado este ano?"*, *"Quanto foi gasto com a Saúde em 2025?"*, *"Quais os maiores credores de despesa?"*).
6. **And** ao enviar uma pergunta (ou clicar numa sugestão), o frontend envia uma requisição `POST /api/assistant/chat` contendo a mensagem, `portalSlug` e `ano`.
7. **And** o endpoint `/api/assistant/chat` processa a pergunta, consulta as métricas fiscais e retorna a resposta formatada em JSON `{ answer: string, sql?: string, chartData?: Array<Record<string, unknown>>, chartType?: string }`.
8. **And** a interface do chat exibe a resposta com animação suave, texto formatado em Markdown e mini-cards de métricas ou gráficos inline quando aplicável.
9. **And** todas as suítes de validação (`make test`, `make test/ts` e `pnpm build`) continuam executando e passando com 100% de sucesso.

---

## Technical Requirements & Architecture Guardrails

### 1. Componentes Frontend (`apps/web` e `packages/ui`)
- **Drawer Component:** `apps/web/app/components/assistant-chat-drawer.tsx`
- **Botão na Sidebar:** Atualizar `packages/ui/src/components/sidebar.tsx` para expor o gatilho "Perguntar aos Dados ✨".
- **Mini-Cards:** Componente de renderização de respostas em chat com suporte a visualização de números fiscais chave e mini-tabelas/gráficos.

### 2. Endpoint API Next.js (`apps/web/app/api/assistant/chat/route.ts`)
- Route handler Next.js `POST /api/assistant/chat`.
- Validação dos parâmetros de entrada (`message`, `portalSlug`, `ano`).
- Orquestração de respostas inteligentes baseada em métricas pré-calculadas e leitores de dados.

---

## Tasks / Subtasks

- [x] Task 1: Criar o componente de chat drawer `apps/web/app/components/assistant-chat-drawer.tsx` (AC: #4, #5, #8)
  - [x] Implementar estado da mensagem, input de texto, sugestões de perguntas clicáveis e botão de fechar.
  - [x] Estilizar com design system premium do portal (whitespace, typography, zero clichês).
- [x] Task 2: Integrar o botão "Perguntar aos Dados ✨" na Sidebar (AC: #3)
  - [x] Adicionar botão de acionamento em `packages/ui/src/components/sidebar.tsx` e integrar no `SidebarWrapper`.
- [x] Task 3: Criar o Route Handler Next.js `apps/web/app/api/assistant/chat/route.ts` (AC: #6, #7)
  - [x] Implementar endpoint `POST /api/assistant/chat`.
  - [x] Conectar o endpoint com as métricas do `@transparencia/db` (Posição Fiscal, Receitas, Despesas, Saúde, CAPREM).
  - [x] Retornar respostas JSON com `answer` formatada e dados adicionais de gráfico/métrica.
- [x] Task 4: Validação e Testes (AC: #9)
  - [x] Escrever teste para a rota de API em `apps/web/app/api/assistant/chat/route.spec.ts`.
  - [x] Garantir aprovação em `make test`, `make test/ts` e `pnpm build`.
