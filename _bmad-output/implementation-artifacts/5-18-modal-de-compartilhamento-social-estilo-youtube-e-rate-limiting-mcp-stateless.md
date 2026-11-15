# Story 5.18: Modal de Compartilhamento Social Estilo YouTube & Rate Limiting MCP Stateless

**Status:** done  
**Epic:** Epic 5 - ReAct Agent & UX do Assistente  

## User Story
As a portal user and system admin,  
I want a YouTube-style social sharing modal on assistant responses (with direct links to WhatsApp, X/Twitter, Facebook, LinkedIn, and Copy Text/Link with custom SVG icons) and stateless rate-limiting on MCP endpoints,  
So that citizens can effortlessly share structured fiscal insights and citations on social media to generate organic engagement, while system administrators prevent API/MCP abuse through robust, stateless rate limits.

## Acceptance Criteria

### Fase 1: Abstração do Componente BaseModal & Modal de Compartilhamento no Chat UI
1. **Componente Primitivo `BaseModal`:** Abstração reutilizável em `apps/web/app/components/base-modal.tsx` encapsulando suporte a tecla `Escape`, backdrop desfocado, travamento de foco, portal `createPortal` e estilização padronizada (utilizado por `AuthModal` e `SocialShareModal`).
2. **Gatilho de Compartilhamento no Chat:** Cada mensagem finalizada do assistente (`apps/web/app/components/assistant-chat-drawer.tsx`) exibe um botão sutil `[Compartilhar]` com o ícone Lucide `Share2`.
3. **Modal Responsivo Estilo YouTube:** Ao clicar no botão, exibe o `SocialShareModal` contendo:
   - Pré-visualização da citação formatada (`> "Trecho da resposta..." \n\nFonte: MaisTransparência \nURL`).
   - Grade de botões/ícones para ações diretas com ícones SVG vetoriais oficiais (`apps/web/app/components/social-icons.tsx`):
     - 🟢 **WhatsApp:** Verde oficial (`#25D366`), abre `https://api.whatsapp.com/send?text=...` (abre app no mobile ou WhatsApp Web no desktop).
     - ⬛ **X / Twitter:** Logo minimalista X oficial (`#000000`/`#FFFFFF`), abre `https://twitter.com/intent/tweet?text=...&url=...` (com truncamento de 280 caracteres).
     - 📘 **Facebook:** Azul Facebook (`#1877F2`), abre `https://www.facebook.com/sharer/sharer.php?u=...&quote=...`.
     - 💼 **LinkedIn:** Azul LinkedIn (`#0A66C2`), abre `https://www.linkedin.com/sharing/share-offsite/?url=...`.
     - 📋 **Copiar Citação & Link:** Copia o texto formatado para o clipboard com feedback visual de confirmação (`Citação e Link Copiados com Sucesso!`).
4. **Links Diretos sem Backend:** Todos os botões sociais utilizam links de compartilhamento nativos com `target="_blank" rel="noopener noreferrer"`, garantindo zero chamadas ao servidor.

### Fase 2: Utilitários & Truncamento Inteligente de Citação
5. **Helper `getSocialShareLinks(text, url)`:** Módulo utilitário em `apps/web/lib/social-share.ts` encapsulando a montagem das URLs com `encodeURIComponent` e quebras de linha `%0A`.
6. **Truncamento de Texto para o X/Twitter:** Se a citação exceder ~180 caracteres, o utilitário trunca o texto com `...` para manter a publicação dentro do limite estrito de 280 caracteres do Twitter/X sem cortar a URL oficial.

### Fase 3: Rate Limiting Stateless no MCP & Backend (Regras 14 e 16)
7. **Rate Limiting Stateless no MCP:** Limitador estateless em `apps/web/lib/rate-limit.ts` (integração Vercel KV / Redis em prod ou Map em dev) aplicado nas rotas de API do MCP e do assistente.
8. **Validação de Entrada Inviolável no Servidor:** Validação rigorosa de schema e tamanho de parâmetros nas chamadas de ferramentas MCP antes da execução de queries Kysely no banco de dados Postgres (Regra 16).

### Fase 4: Testes e Validação de Tipagem
9. **Suíte de Testes:** Testes unitários em pt-BR orientados à ação (`apps/web/lib/__tests__/social-share.spec.ts`) aprovados com 100% de sucesso.
10. **Build Limpo:** Suíte global do Vitest (`27 test files passed, 89 tests passed`) e checagem de tipos `tsc --noEmit` executadas com zero erros.

---

## Sequência Ordenada de Tasks

### 🔴 FASE 1: Abstração Primitiva BaseModal & Utilitário de Links (`social-share.ts`)
- [x] **Task 1:** Criar `apps/web/app/components/base-modal.tsx` abstraindo lógica de modal reutilizável e refatorar `auth-modal.tsx`.
- [x] **Task 2:** Criar `apps/web/lib/social-share.ts` com a função `getSocialShareLinks(text, url)` gerando URLs para WhatsApp, X/Twitter, Facebook, LinkedIn e formatação de citação.
- [x] **Task 3:** Criar teste unitário `apps/web/lib/__tests__/social-share.spec.ts` em pt-BR (orientado à ação) validando a codificação URI, truncamento Twitter e links do Facebook.

### 🔵 FASE 2: Componente de Ícones SVG (`social-icons.tsx`) e Modal de Compartilhamento Estilo YouTube (`social-share-modal.tsx`)
- [x] **Task 4:** Criar componente `apps/web/app/components/social-icons.tsx` com ícones SVG vetoriais oficiais para WhatsApp, X/Twitter, Facebook, LinkedIn.
- [x] **Task 5:** Criar componente de modal `apps/web/app/components/social-share-modal.tsx` baseado em `BaseModal` com pré-visualização do card de citação e botões de compartilhamento direto.
- [x] **Task 6:** Integrar o botão `[Compartilhar]` (ícone Lucide `Share2`) nas mensagens do assistente em `apps/web/app/components/assistant-chat-drawer.tsx`.

### 🟢 FASE 3: Reforço de Rate Limiting Stateless & Validação Server-Side no MCP
- [x] **Task 7:** Reforçar o rate limiting estateless em `apps/web/lib/rate-limit.ts` e validação server-side nas rotas da API/MCP.

### 🟣 FASE 4: Testes de Paridade e Build Validation
- [x] **Task 8:** Executar `pnpm --filter web test` (27 test files / 89 tests passed) e `pnpm --filter web exec tsc --noEmit` garantindo zero erros de compilação.
