---
baseline_commit: 63e2faed5a0ce3c44b8224f6c456dbcaf5719069
---

# Story 7.2: Infraestrutura de Newsletter Cívica com Resend, React Email, Modal Interativo e Links Sociais

Status: done

## Story

As a resident of Porciúncula, civic leader, or public auditor,  
I want to click a newsletter subscription button to open an engaging modal dialog where I can enter my email, as well as access official social media links (such as X.com / `@mtransparenciax` driven by environment variables),  
So that I can follow municipal spending directly in my email inbox with guaranteed privacy, double opt-in verification, robust rate-limiting protection, and one-click unsubscribe compliant with LGPD and RFC 8058.

---

## Acceptance Criteria

### 1. Modelagem, Migração SQL e Conexão Dual (`@transparencia/db` & `elt/migrations/`)
1. **Migração Nativa Kysely (`packages/db/src/migrations/001_create_newsletter_subscribers.ts`):**
   - Criar migração tipada Kysely para a tabela transacional de aplicação `public.newsletter_subscribers` contendo:
     - `id` (`UUID PRIMARY KEY DEFAULT gen_random_uuid()`)
     - `portal_slug` (`TEXT NOT NULL`)
     - `email` (`TEXT NOT NULL`)
     - `status` (`TEXT NOT NULL DEFAULT 'pendente'`) — valores fixos estritamente em lowercase snake_case (`'pendente'`, `'confirmado'`, `'cancelado'`) conforme Regra 10 do `AGENTS.md`.
     - `token_confirmacao` (`TEXT NOT NULL UNIQUE`)
     - `token_cancelamento` (`TEXT NOT NULL UNIQUE`)
     - `created_at` (`TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`)
     - `confirmed_at` (`TIMESTAMP WITH TIME ZONE NULL`)
     - `unsubscribed_at` (`TIMESTAMP WITH TIME ZONE NULL`)
     - `resend_contact_id` (`TEXT NULL`)
     - Constraint de unicidade: `CONSTRAINT uq_newsletter_portal_email UNIQUE (portal_slug, email)`
     - Índices em `portal_slug` e `status`.
   - Disponibilizar migrador programático (`runMigrations`) e comando CLI (`pnpm db:migrate`).
2. **Conexão Dual de Banco com `DATABASE_WRITE_URL` (`packages/db/src/client.ts`):**
   - Manter a instância `db` para todas as consultas de leitura (usando `DATABASE_URL` com credencial `read_only` em produção).
   - Criar e exportar a instância `dbWrite` em `@transparencia/db`, alimentada por `DATABASE_WRITE_URL` (com fallback transparente para `DATABASE_URL` em desenvolvimento local e CI).
3. **Funções Atômicas em `packages/db/src/queries/newsletter.ts`:**
   - `subscribeNewsletter(portalSlug: string, email: string)`: Cria ou reativa a inscrição com status `'pendente'`, gerando novos tokens criptográficos (`crypto.randomUUID()`).
   - `confirmNewsletterSubscription(token: string)`: Valida o token de confirmação, transita o status para `'confirmado'`, grava `confirmed_at = NOW()` e retorna os dados do assinante.
   - `unsubscribeNewsletterByToken(token: string)`: Valida o token de cancelamento, transita o status para `'cancelado'`, grava `unsubscribed_at = NOW()` e retorna os dados atualizados.
   - `getNewsletterSubscriber(portalSlug: string, email: string)`: Consulta o status atual de uma inscrição específica.

### 2. Rate Limiting e Proteção Anti-Abuso (`apps/web/lib/rate-limit.ts`)
4. **Defesa em Camadas (Rate Limiting + Anti-Bot):**
   - **Limite por IP (`x-forwarded-for` / `req.ip`):** Máximo de **5 requisições a cada 10 minutos** por IP.
   - **Limite por E-mail:** Máximo de **3 submissões a cada 24 horas** para o mesmo endereço de e-mail (prevenção contra *Email Bombing*).
   - Quando o limite for excedido, retornar HTTP `429 Too Many Requests` com cabeçalho `Retry-After` e mensagem informativa.
   - **Honeypot Invisível:** Campo oculto no formulário (`b_empresa_url`); se preenchido por robôs, a rota responde HTTP `200 OK` fictício imediatamente sem gravar no banco nem acionar o Resend.
   - **Timer de Submissão:** Descartar submissões efetuadas em menos de 1 segundo após a renderização do modal.

### 3. Modal Interativo e Acessível (`apps/web/components/newsletter-modal.tsx`)
5. **Disparo e Acessibilidade:**
   - Acionado por botões de inscrição na Sidebar (desktop), no Top Header (móvel) e no rodapé.
   - Suporte completo a navegação por teclado (`Escape` para fechar, foco no input de e-mail, `aria-modal="true"`, `role="dialog"`).
6. **Identidade Visual e Estados Reativos:**
   - Badge com o município/UF (`portalSlug` / `displayName`), título claro (*"Acompanhe as Contas Públicas"*), aviso de frequência (*"Sem spam. Apenas resumos periódicos e alertas fiscais"*) e aviso de privacidade LGPD.
   - 4 estados visuais claros: *Idle*, *Loading* (com spinner), *Success* (instrução para checar o e-mail) e *Error* (mensagem amigável de erro ou rate limit).

### 4. Template de E-mail Transacional com React Email (`apps/web/components/emails/`)
7. **Design System do E-mail (`newsletter-confirmation.tsx`):**
   - Desenvolvido com `@react-email/components` seguindo o design system do projeto:
     - Header institucional (`#5a72a8`, nome do portal e município).
     - Corpo do e-mail com botão CTA destacado para confirmação (*double opt-in*) contendo o link seguro com `token_confirmacao`.
     - Rodapé com aviso LGPD e link de cancelamento com 1 clique.

### 5. Disparo com Resend, RFC 8058 (1-Click Unsubscribe) e Sincronização
8. **Cliente Resend Resiliente (`apps/web/lib/resend.ts`):**
   - Utilizar a biblioteca oficial `resend` (pinned version `6.25.0`) com `RESEND_API_KEY` e `RESEND_FROM_EMAIL`.
   - Se `RESEND_API_KEY` não estiver definida em ambiente local/testes, registrar log estruturado em stdout sem lançar erro fatal.
9. **Cabeçalhos Normativos RFC 8058 (`List-Unsubscribe`):**
   - Incluir obrigatoriamente os headers:
     - `List-Unsubscribe: <https://<app_url>/api/newsletter/unsubscribe?token=<token_cancelamento>>`
     - `List-Unsubscribe-Post: List-Unsubscribe=One-Click`

### 6. Endpoints de API Next.js (`apps/web/app/api/newsletter/`)
10. **`POST /api/newsletter/subscribe`:**
    - Valida body `{ email: string, portalSlug: string }`.
    - Executa verificações de Honeypot, Submission Timer e Rate Limiter (IP e E-mail).
    - Executa `subscribeNewsletter` via `dbWrite` em `@transparencia/db`.
    - Dispara o e-mail transacional `newsletter-confirmation` via Resend.
    - Retorna status HTTP 200 `{ success: true, message: "E-mail de confirmação enviado." }`.
11. **`GET /api/newsletter/confirm`:**
    - Recebe query param `?token=...`.
    - Executa `confirmNewsletterSubscription` via `dbWrite` em `@transparencia/db`.
    - Redireciona para `/[portalSlug]/?newsletter=confirmed` com toast/banner de confirmação.
12. **`GET /api/newsletter/unsubscribe` e `POST /api/newsletter/unsubscribe`:**
    - Suporta GET (clique manual no rodapé) e POST (RFC 8058 One-Click para Gmail/Yahoo).
    - Recebe query param `?token=...`.
    - Executa `unsubscribeNewsletterByToken` via `dbWrite` em `@transparencia/db`.
    - Retorna confirmação de cancelamento da inscrição.

### 7. Componente de Links Sociais e Open Source (`apps/web/components/social-links.tsx`)
13. **Renderização, Economia de Espaço e Configurabilidade:**
    - Componente compacto (renderizando apenas ícones discretos para otimização de espaço na barra lateral) com suporte aos ícones oficiais do **GitHub** (Open Source) e do **X.com** (Twitter).
    - Totalmente parametrizável via props (`xUrl`, `xHandle`, `githubUrl`, `showLabel`) e variáveis de ambiente (`NEXT_PUBLIC_GITHUB_URL`, `NEXT_PUBLIC_X_URL`, `NEXT_PUBLIC_X_HANDLE`).
    - Estrutura tipada extensível para novas redes e abertura segura em nova aba (`target="_blank" rel="noopener noreferrer"`).
    - Integrado na Sidebar (desktop e drawer mobile).

### 8. Telemetria PostHog e Validação de Qualidade
14. **Eventos de Telemetria:**
    - `newsletter_modal_opened`, `newsletter_subscribe_submitted`, `newsletter_subscribe_success`, `newsletter_subscribe_error`, `newsletter_rate_limited`, `social_link_clicked`.
15. **Testes Automatizados e Gates de Qualidade:**
    - Testes unitários para queries de banco (`newsletter.spec.ts`), rate limiter (`rate-limit.spec.ts`), modal (`newsletter-modal.spec.tsx`), rotas de API (`newsletter-routes.spec.ts`) e links sociais (`social-links.spec.tsx`).
    - `pnpm test`, `pnpm build`, `make test` e `make check` aprovados com 100% de sucesso.

---

## Tasks / Subtasks

- [x] **Task 1: Migração Kysely, Conexão Dual e Queries em `@transparencia/db`** (AC: #1, #2, #3)
  - [x] Criar migração nativa Kysely `packages/db/src/migrations/001_create_newsletter_subscribers.ts` utilizando exclusivamente tipo `TEXT` (Regra 16).
  - [x] Criar utilitário `packages/db/src/migrator.ts` e script CLI `packages/db/src/bin/migrate.ts` (`pnpm db:migrate`).
  - [x] Implementar pool `dbWrite` em `packages/db/src/client.ts` com fallback para `DATABASE_URL`.
  - [x] Implementar `packages/db/src/queries/newsletter.ts` com as funções atômicas `subscribeNewsletter`, `confirmNewsletterSubscription`, `unsubscribeNewsletterByToken` e `getNewsletterSubscriber`.
  - [x] Exportar `dbWrite`, migrador e queries em `packages/db/src/index.ts`.
  - [x] Escrever testes unitários em `packages/db/src/queries/__tests__/newsletter.spec.ts` com setup automático via `runMigrations`.

- [x] **Task 2: Rate Limiting, Resend Client e Template React Email** (AC: #4, #7, #8, #9)
  - [x] Adicionar dependências exatas pinned em `apps/web/package.json` (`resend: "6.25.0"`, `@react-email/components: "1.0.12"`).
  - [x] Implementar utilitário de rate limiting in-memory em `apps/web/lib/rate-limit.ts` (sliding window por IP e por e-mail).
  - [x] Criar cliente Resend resiliente em `apps/web/lib/resend.ts` com fallback para log em dev.
  - [x] Criar template de e-mail `apps/web/components/emails/newsletter-confirmation.tsx` com design system do portal.
  - [x] Escrever testes unitários em `apps/web/lib/rate-limit.spec.ts`.

- [x] **Task 3: Implementação dos Endpoints de API Next.js** (AC: #4, #10, #11, #12)
  - [x] Criar `apps/web/app/api/newsletter/subscribe/route.ts` com rate limiting, honeypot, gravação via `dbWrite` e disparo de e-mail via Resend com cabeçalhos RFC 8058.
  - [x] Criar `apps/web/app/api/newsletter/confirm/route.ts` com validação de token e redirecionamento de feedback.
  - [x] Criar `apps/web/app/api/newsletter/unsubscribe/route.ts` suportando GET e POST (RFC 8058 One-Click).
  - [x] Criar testes das rotas em `apps/web/app/api/newsletter/newsletter-routes.spec.ts`.

- [x] **Task 4: Componentes de UI — Modal de Inscrição, Feedback Banner e Links Sociais** (AC: #5, #6, #13, #14)
  - [x] Criar componente de modal acessível `apps/web/components/newsletter-modal.tsx` com validação em tempo real, honeypot e telemetria PostHog.
  - [x] Criar componente `apps/web/components/newsletter-feedback-banner.tsx` com tratamento de feedback de confirmação/cancelamento.
  - [x] Criar componente `apps/web/components/social-links.tsx` com ícone oficial do X.com.
  - [x] Integrar botão de acionamento do modal e componente social na Sidebar (`packages/ui/src/components/sidebar.tsx` e `apps/web/app/components/sidebar-wrapper.tsx`).
  - [x] Escrever testes unitários em `apps/web/components/newsletter-modal.spec.tsx`, `apps/web/components/newsletter-feedback-banner.spec.tsx` e `apps/web/components/social-links.spec.tsx`.

- [x] **Task 5: Validação de Qualidade, Paridade e Gates de Teste** (AC: #15)
  - [x] Executar `pnpm test` e verificar 100% de aprovação na suíte de testes do frontend (29 arquivos, 108 testes) e database (16 arquivos, 42 testes).
  - [x] Executar `pnpm build` e confirmar compilação e tipagem estrita sem erros.
  - [x] Executar `make test` (83 testes Python/pytest aprovados) e `make check` (Ruff/Mypy).

### Review Findings

- [x] [Review][Patch] Precedência de operadores e violação da Regra 13 na resolução de baseUrl em sendNewsletterConfirmationEmail [apps/web/lib/resend.ts:33-36]
- [x] [Review][Patch] Preservação de status de assinante confirmado e token de cancelamento invariante em subscribeNewsletter [packages/db/src/queries/newsletter.ts:87-94]
- [x] [Review][Patch] Tratamento de erro quando sendNewsletterConfirmationEmail falha no endpoint de inscrição [apps/web/app/api/newsletter/subscribe/route.ts:111-124]
- [x] [Review][Patch] Prevenção de falso-positivo de bot por relógio do cliente adiantado no Submission Timer [apps/web/app/api/newsletter/subscribe/route.ts:31-40]
- [x] [Review][Patch] Alinhamento de regex de e-mail e prevenção de fechamento durante envio no NewsletterModal [apps/web/components/newsletter-modal.tsx:73-78]
- [x] [Review][Patch] Suporte a formData em requisições RFC 8058 POST de cancelamento [apps/web/app/api/newsletter/unsubscribe/route.ts:44-51]
- [x] [Review][Patch] Documentação de novas variáveis de ambiente de newsletter e redes sociais no .env.example [.env.example:1-3]

---

## Dev Notes

### Arquitetura e Invariantes
- **Migrações Kysely Nativas (`packages/db/src/migrations/`):** A tabela de assinantes é criada e versionada programaticamente via Kysely (`001_create_newsletter_subscribers.ts`) com o comando `pnpm db:migrate`.
- **Campos de Texto em Postgres (Regra 16):** Todas as colunas de texto utilizam estritamente o tipo `TEXT` (sem `VARCHAR(n)`).
- **Camada de Dados (`@transparencia/db`):** Toda persistência de assinantes pertence a `packages/db/src/queries/newsletter.ts`. As queries de leitura continuam consumindo `db` (read-only), enquanto as mutações utilizam `dbWrite` (`DATABASE_WRITE_URL`).
- **Isolamento Multi-tenant (`portal_slug`):** Todo registro em `newsletter_subscribers` é indexado e associado ao `portal_slug` do município correspondente.
- **Valores Fixos em Lowercase Snake_case (Regra 10):** A coluna `status` usa estritamente `'pendente'`, `'confirmado'`, `'cancelado'`.
- **Zero Ternários Aninhados (Regra 13):** Todas as condicionais com mais de 2 ramos na UI e nas rotas utilizam funções auxiliares com retornos antecipados.
- **Pinned Versions (Regra 7):** `resend: "6.25.0"` e `@react-email/components: "1.0.12"` declarados com versões exatas sem `^` ou `~`.

### Segurança, Privacidade e LGPD
- **Double Opt-in Obrigatório:** E-mails de alerta só podem ser enviados após confirmação do link criptográfico (`crypto.randomUUID()`).
- **RFC 8058:** Headers `List-Unsubscribe` e `List-Unsubscribe-Post: List-Unsubscribe=One-Click` para garantir entregabilidade em Gmail/Yahoo.
- **Defesa Anti-Abuso:** Rate limiter por IP (5 req/10min) + E-mail (3 req/24h) + Honeypot invisível + Timer anti-bot.

### Arquivos Modificados / Criados

| Arquivo | Status | Descrição |
|---|---|---|
| `packages/db/src/migrations/001_create_newsletter_subscribers.ts` | NEW | Migração nativa Kysely com tipo `TEXT` para tabela `newsletter_subscribers` |
| `packages/db/src/migrator.ts` | NEW | Utilitário e provedor de migrações Kysely |
| `packages/db/src/bin/migrate.ts` | NEW | Script executável CLI para migrações (`pnpm db:migrate`) |
| `packages/db/package.json` | UPDATE | Adicionar dependência `tsx: "4.21.0"` e script `migrate` |
| `package.json` | UPDATE | Adicionar script global `db:migrate` |
| `packages/db/src/client.ts` | UPDATE | Criar pool de escrita `dbWrite` com suporte a `DATABASE_WRITE_URL` |
| `packages/db/src/queries/newsletter.ts` | NEW | Funções Kysely de persistência e tokens de newsletter |
| `packages/db/src/index.ts` | UPDATE | Exportar `dbWrite`, `migrator` e queries de newsletter |
| `packages/db/src/queries/__tests__/newsletter.spec.ts` | NEW | Testes unitários das queries de newsletter |
| `apps/web/package.json` | UPDATE | Adicionar `resend: "6.25.0"` e `@react-email/components: "1.0.12"` |
| `apps/web/lib/rate-limit.ts` | NEW | Utilitário de rate limiting in-memory (sliding window) |
| `apps/web/lib/rate-limit.spec.ts` | NEW | Testes unitários do rate limiter |
| `apps/web/lib/resend.ts` | NEW | Cliente Resend configurado e utilitário de despacho resiliente |
| `apps/web/components/emails/newsletter-confirmation.tsx` | NEW | Template React Email para confirmação double opt-in |
| `apps/web/app/api/newsletter/subscribe/route.ts` | NEW | Endpoint Next.js para inscrição com rate limit e honeypot |
| `apps/web/app/api/newsletter/confirm/route.ts` | NEW | Endpoint Next.js para validação do token de confirmação |
| `apps/web/app/api/newsletter/unsubscribe/route.ts` | NEW | Endpoint Next.js para cancelamento com 1 clique (GET/POST) |
| `apps/web/app/api/newsletter/newsletter-routes.spec.ts` | NEW | Testes de integração das API routes de newsletter |
| `apps/web/components/newsletter-modal.tsx` | NEW | Modal dialog interativo e acessível de inscrição |
| `apps/web/components/newsletter-modal.spec.tsx` | NEW | Testes unitários do modal de newsletter |
| `apps/web/components/newsletter-feedback-banner.tsx` | NEW | Banner de feedback para confirmação e cancelamento |
| `apps/web/components/newsletter-feedback-banner.spec.tsx` | NEW | Testes unitários do banner de feedback |
| `apps/web/components/social-links.tsx` | NEW | Componente de ícone do X.com / redes sociais parametrizado via env |
| `apps/web/components/social-links.spec.tsx` | NEW | Testes unitários de renderização de links sociais |
| `packages/ui/src/components/sidebar.tsx` | UPDATE | Incluir botão de acionamento de newsletter e links sociais no rodapé |
| `apps/web/app/components/sidebar-wrapper.tsx` | UPDATE | Integrar estado de abertura do modal de newsletter |
| `apps/web/app/layout.tsx` | UPDATE | Integrar banner de feedback de newsletter |
| `AGENTS.md` | UPDATE | Adicionar Regra 16 (campos de texto em Postgres sempre tipo `TEXT`) |

---

## Dev Agent Record

### Agent Model Used
- Gemini 3.7 Flash

### Debug Log References
- Execução dos testes do Kysely e adaptação para subpath export `kysely/migration`.
- Inclusão do Suspense boundary no `NewsletterFeedbackBanner` para renderização estática do Next.js.
- Ajuste de acessibilidade (a11y) no backdrop do modal de newsletter.

### Completion Notes List
- Implementada migração nativa Kysely para a tabela `newsletter_subscribers` utilizando exclusivamente o tipo `TEXT` em conformidade com a Regra 16.
- Implementado sistema de migração programático e CLI (`pnpm db:migrate`).
- Implementado pool dual com `db` (leitura) e `dbWrite` (`DATABASE_WRITE_URL` para escrita).
- Implementadas rotas completas de API com double opt-in, rate limiting (IP/e-mail), honeypot anti-bot e conformidade com RFC 8058 (1-click unsubscribe).
- Implementados componentes `NewsletterModal`, `NewsletterFeedbackBanner` e `SocialLinks` com telemetria PostHog.
- Todos os testes de banco, rotas, componentes, build Next.js, linting e testes Python aprovados com 100% de sucesso.

### File List
- `packages/db/src/migrations/001_create_newsletter_subscribers.ts`
- `packages/db/src/migrator.ts`
- `packages/db/src/bin/migrate.ts`
- `packages/db/package.json`
- `package.json`
- `packages/db/src/client.ts`
- `packages/db/src/queries/newsletter.ts`
- `packages/db/src/index.ts`
- `packages/db/src/queries/__tests__/newsletter.spec.ts`
- `apps/web/package.json`
- `apps/web/lib/rate-limit.ts`
- `apps/web/lib/rate-limit.spec.ts`
- `apps/web/lib/resend.ts`
- `apps/web/components/emails/newsletter-confirmation.tsx`
- `apps/web/app/api/newsletter/subscribe/route.ts`
- `apps/web/app/api/newsletter/confirm/route.ts`
- `apps/web/app/api/newsletter/unsubscribe/route.ts`
- `apps/web/app/api/newsletter/newsletter-routes.spec.ts`
- `apps/web/components/newsletter-modal.tsx`
- `apps/web/components/newsletter-modal.spec.tsx`
- `apps/web/components/newsletter-feedback-banner.tsx`
- `apps/web/components/newsletter-feedback-banner.spec.tsx`
- `apps/web/components/social-links.tsx`
- `apps/web/components/social-links.spec.tsx`
- `packages/ui/src/components/sidebar.tsx`
- `apps/web/app/components/sidebar-wrapper.tsx`
- `apps/web/app/layout.tsx`
- `AGENTS.md`

