# Story 5.17: Limitador de Caracteres, Guardrails de Escopo, Fallback Lucide & PostHog MCP Analytics

**Status:** done  
**Epic:** Epic 5 - ReAct Agent & UX do Assistente  

## User Story
As a portal user and system admin,
I want the AI assistant chat to provide character limits, scope guardrails (protecting individual salaries), Lucide-icon fallback navigation chips, and PostHog MCP Analytics with quota alerts at 70%,
So that citizens enjoy a smooth, direct chat experience, sensitive data is protected, and administrators receive real-time telemetry and threshold warnings before free-tier AI quotas expire.

## Acceptance Criteria

### Fase 1: Limitador de Caracteres & Micro-interações de Input no Chat
1. **Limite de Input no Textarea:** A caixa de entrada do assistente (`apps/web/app/components/assistant-chat-drawer.tsx` ou componente de input do chat) deve impor um limite máximo estrito de **300 caracteres** por pergunta (`maxLength={300}`).
2. **Micro-interação Visual do Contador:**
   - O contador de caracteres deve ser invisível até que o usuário atinja **70% do limite** (210 caracteres).
   - Ao atingir 210 caracteres, exibe um contador sutil no canto inferior (`210/300`).
   - Ao atingir **90% do limite** (270 caracteres), a cor do contador transita para um tom de aviso âmbar (`text-amber-500` / `warning`).
   - Ao atingir 300 caracteres, a digitação para suavemente sem exibir modais vermelhos ou popups agressivos.
3. **Placeholders Orientativos:** Os exemplos de placeholder na caixa de chat devem sugerir perguntas curtas e diretas (ex: *"Ex: Quanto foi gasto com merenda em 2024?"*).

### Fase 2: Guardrails de Escopo e Privacidade de Dados Sensíveis
4. **Respeito à Privacidade e Escopo via System Prompt:** O System Prompt (`context-builder.ts` / `lrf-pessoal.md`) deve ser configurado com instrução explícita para recusar consultas sobre salários/remunerações individuais de servidores específicos, justificando a proteção de dados sensíveis e o foco do assistente em visões agregadas e fiscais da LRF (proibido o uso de `if`s manuais de string em TypeScript conforme Regra 15 do `AGENTS.md`).
5. **Mensagem Amigável de Recusa:** Ao detectar consulta a dados individuais de pessoal via contexto do LLM, o assistente responde informando que exibe apenas dados consolidados e fornece o atalho direto para o painel de Pessoal da aplicação.

### Fase 3: Fallback de Navegação Interna com Chips Lucide
6. **Uso Exclusivo de Ícones Lucide (`lucide-react` v1.26.0):** É proibido o uso de emojis nativos nos componentes de chips de fallback; utilizar exclusivamente ícones vetoriais de `lucide-react` (ex: `Search`, `Sparkles`, `ExternalLink`, `ArrowUpRight`).
7. **Chips de Ação Dupla:**
   - **Chips de Refinamento (`type: 'prompt'`)**: Utilizam o ícone `Search` ou `Sparkles`. Ao clicar, preenchem automaticamente o chat com a pergunta sugerida e disparam a busca.
   - **Chips de Navegação Interna (`type: 'link'`)**: Utilizam o ícone `ExternalLink`. Navegam diretamente para as rotas públicas da própria aplicação Next.js (`/[portalSlug]/pessoal`, `/[portalSlug]/despesas`, `/[portalSlug]/licitacoes`, `/[portalSlug]/saude`, `/[portalSlug]/caprem`).

### Fase 4: PostHog MCP Analytics & Alerta de Cota (70% Threshold)
8. **PostHog MCP Analytics (`posthog-node` 5.49.1)**: As chamadas de ferramentas MCP em `apps/web/lib/mcp/transparencia-mcp.ts` e na rota da API do assistente devem capturar eventos de execução com métricas estruturadas (`$mcp_tool_call` / `$ai_trace`), incluindo:
   - `$mcp_tool_name`: Nome da ferramenta MCP invocada (ex: `get_posicao_fiscal`).
   - `$mcp_duration_ms`: Tempo de execução da consulta Kysely em milissegundos.
   - `$mcp_success`: Status booleano de sucesso.
   - `$ai_model`: Identificador do modelo (`gemini-2.5-flash-lite`).
   - `$ai_input_tokens` e `$ai_output_tokens`: Contagem de tokens consumidos na interação.
9. **Disparo de Evento de Alerta de Cota (70%) 100% Stateless**: O rastreamento e agregações de uso diário devem ser emitidos de forma *stateless* para o PostHog (conforme Regra 14 do `AGENTS.md`), permitindo que a regra de Action Alert no PostHog notifique o admin quando a métrica global atingir 70% do Free Tier.
10. **Notificação ao Admin**: O painel do PostHog será configurado com uma regra de Action Alert / Webhook sobre o evento `$ai_token_usage` para notificar o administrador via E-mail / Slack / Discord.

### Fase 5: Testes e Validação de Tipagem
11. **Validação de Tipagem e Testes:** A suíte de testes (`pnpm test` / `make test/ts`) deve validar o comportamento do limitador de caracteres, renderização dos chips, envio de telemetria MCP no PostHog e rotas de navegabilidade. Executar `pnpm build` sem erros de TypeScript ou Next.js.

## Sequência Ordenada de Tasks

### 🔴 FASE 1: Limitador de Caracteres & UI no Chat
- [x] **Task 1:** Atualizar o componente de input do chat (`assistant-chat-drawer.tsx` / `assistant-chat-input.tsx`) com `maxLength={300}`, estado de contagem e renderização condicional do contador (invisível < 70%, padrão >= 70%, âmbar >= 90%).
- [x] **Task 2:** Configurar placeholders dinâmicos inspiradores com exemplos curtos de busca fiscal.

### 🔵 FASE 2: Guardrail de Escopo & Resposta Educada
- [x] **Task 3:** Atualizar o System Prompt em `context-builder.ts` e `lrf-pessoal.md` reforçando a Regra 10 de sigilo de salários individuais e foco em agregados fiscais (sem `if`s manuais de string em código TS conforme Regra 15 do `AGENTS.md`).
- [x] **Task 4:** Estruturar a DTO de resposta fallback do assistente para retornar uma coleção de chips (`FallbackChip[]`).

### 🟢 FASE 3: Componentes de Chips com Lucide Icons & Navegação Interna
- [x] **Task 5:** Criar o componente `assistant-fallback-chips.tsx` renderizando ícones de `lucide-react` (`Search` para prompts e `ExternalLink` para links internos `/[portalSlug]/...`).
- [x] **Task 6:** Conectar o evento de clique dos chips ao dispatcher do chat (para prompts) e ao `<Link>` do Next.js (para páginas do portal).

### 🟣 FASE 4: Telemetria PostHog MCP Analytics & Alerta de Cota (70%)
- [x] **Task 7:** Implementar captura de telemetria MCP (`$mcp_tool_call` e `$ai_generation`) com `posthog-node` registrando nome da tool, duração, sucesso e contagem de tokens em `apps/web/lib/mcp/transparencia-mcp.ts` e na rota de chat.
- [x] **Task 8:** Configurar telemetria de cota e métricas de uso no PostHog de forma 100% stateless (conforme Regra 14 do `AGENTS.md`).

### 🟡 FASE 5: Testes & Build final
- [x] **Task 9:** Criar/atualizar testes de integração frontend (`pnpm test`) cobrindo o limitador de caracteres, ações de clique nos chips e envio de telemetria MCP.
- [x] **Task 10:** Executar `pnpm build` e `make test/ts` garantindo 100% de aprovação.

