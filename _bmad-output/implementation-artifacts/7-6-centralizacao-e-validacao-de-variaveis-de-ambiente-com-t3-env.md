---
baseline_commit: 02645b95648fbe9fb423eaac4175dc2a95b18d21
---

# Story 7.6: Centralização, Tipagem e Validação de Variáveis de Ambiente com t3-env e Zod

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer or site reliability engineer,  
I want all client and server environment variables to be strictly declared, validated at build-time and runtime, and strongly typed using `@t3-oss/t3-env` (`@t3-oss/env-nextjs`) and Zod,  
So that missing secrets, malformed URLs, or configuration mismatches fail fast with clear diagnostic messages before reaching production, client-side code never accidentally leaks private server credentials, and the team maintains a single source of truth for all application settings.

---

## Acceptance Criteria

### 1. Instalação e Pinagem de Dependências (`apps/web/package.json`)
1. **Instalação com Versões Fixas (Regra 7 de `AGENTS.md`):**
   - Adicionar ao `apps/web/package.json` em `dependencies`:
     - `@t3-oss/env-nextjs`: `"0.13.11"` (pinned version exata sem `^` ou `~`).
     - `zod`: `"3.24.2"` (pinned version exata sem `^` ou `~`).
   - Não utilizar prefixos de variação (`^`, `~`).
   - Executar `pnpm install` mantendo `pnpm-lock.yaml` sincronizado e íntegro.

---

### 2. Definição do Schema Canônico Centralizado (`apps/web/env.ts`)
2. **Segregação Rigorosa entre `server` e `client`:**
   - Criar `apps/web/env.ts` utilizando `createEnv` de `@t3-oss/env-nextjs`:
     - **Variáveis de Servidor (`server`):**
       - `NODE_ENV`: `z.enum(["development", "test", "production"]).default("development")`
       - `DATABASE_URL`: `z.string().min(1).optional()` (ou url do PostgreSQL).
       - `DATABASE_WRITE_URL`: `z.string().min(1).optional()` (conexão de escrita com fallback para `DATABASE_URL`).
       - `DATABASE_POOL_MAX`: `z.coerce.number().positive().default(5)`
       - `RESEND_API_KEY`: `z.string().min(1).optional()`
       - `RESEND_FROM_EMAIL`: `z.string().min(1).default("Radar Porciúncula <newsletter@maistransparencia.org>")`
       - `CRON_SECRET`: `z.string().min(1).optional()`
       - `INTERNAL_API_SECRET`: `z.string().min(1).optional()`
       - `DIGEST_SECRET`: `z.string().min(1).optional()`
       - `SOCIAL_SECRET`: `z.string().min(1).optional()`
       - `X_API_KEY`: `z.string().min(1).optional()`
       - `X_API_SECRET`: `z.string().min(1).optional()`
       - `X_ACCESS_TOKEN`: `z.string().min(1).optional()`
       - `X_ACCESS_TOKEN_SECRET`: `z.string().min(1).optional()`
       - `X_BEARER_TOKEN`: `z.string().min(1).optional()`
       - `FACEBOOK_PAGE_ID`: `z.string().min(1).optional()`
       - `FACEBOOK_PAGE_ACCESS_TOKEN`: `z.string().min(1).optional()`
       - `VERCEL_URL`: `z.string().min(1).optional()`
     - **Variáveis Públicas de Cliente (`client` - prefixo obrigatório `NEXT_PUBLIC_`):**
       - `NEXT_PUBLIC_APP_URL`: `z.string().min(1).optional()` (validado para formato de URL se fornecido).
       - `NEXT_PUBLIC_SITE_DOMAIN`: `z.string().min(1).optional()`
       - `NEXT_PUBLIC_SITE_NAME`: `z.string().min(1).default("MaisTransparencia")`
       - `NEXT_PUBLIC_PROJECT_NAME`: `z.string().min(1).default("MaisTransparência")`
       - `NEXT_PUBLIC_X_URL`: `z.string().min(1).optional()`
       - `NEXT_PUBLIC_X_HANDLE`: `z.string().min(1).default("@mtransparenciax")`
       - `NEXT_PUBLIC_GITHUB_URL`: `z.string().min(1).default("https://github.com/maistransparencia/transparencia")`
       - `NEXT_PUBLIC_FACEBOOK_URL`: `z.string().min(1).optional()`
       - `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`: `z.string().min(1).optional()`
       - `NEXT_PUBLIC_POSTHOG_HOST`: `z.string().min(1).default("https://us.i.posthog.com")`
3. **Mapeamento de Runtime e Proteções de Build:**
   - Preencher `experimental__runtimeEnv` com todas as variáveis com prefixo `NEXT_PUBLIC_*` para permitir substituição em tempo de compilação estática pelo Next.js.
   - Configurar `emptyStringAsUndefined: true` para tratar strings vazias (`""`) como ausentes e acionar fallbacks/defaults.
   - Configurar `skipValidation: !!process.env.SKIP_ENV_VALIDATION` para não interromper builds em contêineres Docker/CI sem variáveis de produção.

---

### 3. Governança, Padronização e Dicionário de Variáveis (`.env.example`)
4. **Sincronização dos Arquivos `.env.example`:**
   - Atualizar/criar `.env.example` na raiz do monorepo e em `apps/web/.env.example` com todas as variáveis catalogadas.
   - Agrupar e comentar didaticamente as variáveis por domínio:
     - Banco de Dados (Leitura, Escrita, Pool)
     - Newsletter e Transacional (Resend)
     - Automações e Segurança de Cron (Secrets e Tokens de Despacho)
     - Redes Sociais e Bots (X.com e Facebook)
     - Informações Institucionais e Domínio Público
     - Telemetria e Analytics (PostHog)

---

### 4. Refatoração Cirúrgica dos Pontos de Consumo em `apps/web`
5. **Substituição de Acessos Diretos a `process.env`:**
   - Refatorar os módulos que atualmente usam `process.env` diretamente para importar o objeto `env` de `@/env` (ou caminho relativo correspondente):
     - `apps/web/lib/resend.ts`
     - `apps/web/lib/metadata.ts`
     - `apps/web/lib/x-bot.ts`
     - `apps/web/lib/facebook-bot.ts`
     - `apps/web/lib/radar-digest.ts`
     - `apps/web/lib/social-publisher.ts`
     - `apps/web/components/social-links.tsx`
     - `apps/web/components/og/og-card-template.tsx`
     - `apps/web/components/emails/newsletter-confirmation.tsx`
     - `apps/web/components/emails/radar-digest.tsx`
     - `apps/web/app/api/newsletter/dispatch-digest/route.ts`
     - `apps/web/app/api/newsletter/subscribe/route.ts`
     - `apps/web/app/api/newsletter/unsubscribe/route.ts`
     - `apps/web/app/api/newsletter/confirm/route.ts`
     - `apps/web/app/api/social/publish/route.ts`
     - `apps/web/app/sitemap.ts`
     - `apps/web/app/layout.tsx`
     - `apps/web/posthog-server.ts`
     - `apps/web/instrumentation-client.ts`
     - `apps/web/bin/publish-social.ts` e `apps/web/bin/dispatch-digest.ts`
   - Preservar `process.env.NODE_ENV` ou `process.env.NEXT_RUNTIME` onde exigido internamente pelo framework Next.js (`instrumentation.ts`).

---

### 5. Suíte de Testes Automatizados e Resiliência
6. **Testes Unitários de Validação de Ambiente (`apps/web/env.spec.ts`):**
   - Criar suíte de testes com Vitest validando:
     - Resolução bem-sucedida do schema com valores padrão (defaults) quando variáveis opcionais não são fornecidas.
     - Validação correta de tipos (ex: conversão de string para number em `DATABASE_POOL_MAX`).
     - Tratamento correto de `emptyStringAsUndefined`.
     - Isolamento entre client e server.
7. **Preservação de Suítes de Testes Existentes:**
   - Assegurar que os testes unitários já existentes (como `x-bot.spec.ts`, `facebook-bot.spec.ts`, `social-publisher.spec.ts`, `dispatch-digest-route.spec.ts`, `publish-route.spec.ts`) continuem passando sem regressões.

---

### 6. Baseline de Qualidade Mandatória
8. **Gates de Execução:**
   - `pnpm test` (testes em todos os pacotes e web).
   - `pnpm build` (build do Next.js sem falhas de validação de ambiente estático).
   - `make test` e `make check` (verificação completa do repositório).

---

## Tasks / Subtasks

- [x] Task 1: Instalação e pinagem de dependências (AC: #1)
  - [x] 1.1: Adicionar `"@t3-oss/env-nextjs": "0.13.11"` e `"zod": "3.24.2"` em `apps/web/package.json` sem prefixos `^` ou `~`.
  - [x] 1.2: Rodar `pnpm install` e verificar consistência do lockfile.

- [x] Task 2: Criação do módulo canônico `apps/web/env.ts` (AC: #2, #3)
  - [x] 2.1: Implementar o schema com segregação de `server` e `client`.
  - [x] 2.2: Mapear todas as variáveis `NEXT_PUBLIC_*` em `experimental__runtimeEnv`.
  - [x] 2.3: Configurar `emptyStringAsUndefined: true` e `skipValidation`.
  - [x] 2.4: Exportar `env` tipado como exportação nomeada canônica.

- [x] Task 3: Criação e sincronização do `.env.example` (AC: #4)
  - [x] 3.1: Criar `.env.example` na raiz do monorepo e sincronizar em `apps/web/.env.example`.
  - [x] 3.2: Documentar cada bloco de variáveis com instruções claras e valores fictícios seguros.

- [x] Task 4: Refatoração de acessos diretos a `process.env` em `apps/web` (AC: #5)
  - [x] 4.1: Refatorar serviços de e-mail e rotas da newsletter (`lib/resend.ts`, `app/api/newsletter/*`).
  - [x] 4.2: Refatorar bots e rotas sociais (`lib/x-bot.ts`, `lib/facebook-bot.ts`, `lib/social-publisher.ts`, `app/api/social/*`).
  - [x] 4.3: Refatorar componentes visuais e OpenGraph (`components/social-links.tsx`, `components/og/og-card-template.tsx`, `components/emails/*`).
  - [x] 4.4: Refatorar metadata, sitemap e telemetria (`lib/metadata.ts`, `app/sitemap.ts`, `posthog-server.ts`, `instrumentation-client.ts`).
  - [x] 4.5: Refatorar scripts CLI executáveis (`apps/web/bin/*`).

- [x] Task 5: Implementação de testes automatizados de validação de ambiente (AC: #6, #7)
  - [x] 5.1: Criar `apps/web/env.spec.ts` cobrindo carregamento, defaults e conversões de tipo.
  - [x] 5.2: Executar e ajustar testes de rotas e bots existentes que alteram variáveis de ambiente em tempo de execução para garantir compatibilidade.

- [x] Task 6: Validação de integridade e gates de qualidade (AC: #8)
  - [x] 6.1: Executar `pnpm test` e `pnpm build`.
  - [x] 6.2: Executar `make test` e `make check`.
  - [x] 6.3: Atualizar `sprint-status.yaml` refletindo o status da história.

### Review Findings
- [x] [Review][Patch] Definir NODE_ENV em shared e runtimeEnv para evitar quebra no navegador [apps/web/env.ts:7, apps/web/instrumentation-client.ts:6,18, apps/web/components/pwa-installer.tsx:84]
- [x] [Review][Patch] Corrigir armadilha booleana de SKIP_ENV_VALIDATION [apps/web/env.ts:69]
- [x] [Review][Patch] Tratar coerção numérica e empty string no Proxy de testes [apps/web/env.ts:72-83]
- [x] [Review][Patch] Carregar .env.local dinamicamente antes do import de publishSocial em CLI [apps/web/bin/publish-social.ts:3-30]
- [x] [Review][Patch] Sincronizar RESEND_FROM_EMAIL em apps/web/.env.example [apps/web/.env.example:31]
- [x] [Review][Patch] Exigir número inteiro em DATABASE_POOL_MAX [apps/web/env.ts:12]
- [x] [Review][Patch] Sanitizar trailing slash em NEXT_PUBLIC_APP_URL [apps/web/env.ts:32]
- [x] [Review][Patch] Atualizar fallback residual em apps/web/lib/x-bot.ts para novo domínio [apps/web/lib/x-bot.ts:133]
- [x] [Review][Patch] Adicionar testes unitários para novas proteções em env.spec.ts [apps/web/env.spec.ts]

---

## Dev Notes

### Arquitetura de Validação de Ambiente

O padrão de arquitetura estabelecido por `@t3-oss/env-nextjs` fornece garantias fundamentais para o ecossistema:
1. **Type Safety Instantâneo:** Autocomplete automático de todas as propriedades de `env` no IDE, sem risco de digitação incorreta de nomes como `NEXT_PUBLIC_AP_URL`.
2. **Detecção Antecipada (Fail-Fast):** Se uma variável obrigatória estiver faltando no deploy ou contiver formato inválido (ex: número em vez de string, URL malformada), a aplicação acusa o erro com diagnóstico preciso antes de aceitar tráfego de usuários.
3. **Segurança de Servidor vs Cliente:** Next.js substitui variáveis que iniciam com `NEXT_PUBLIC_` no bundle do navegador. Variáveis no bloco `server` são barradas de serem importadas em Client Components, evitando vazamentos acidentais de `DATABASE_URL`, `RESEND_API_KEY` ou `X_API_SECRET`.

### Exemplo de Estrutura Canônica em `apps/web/env.ts`

```typescript
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1).optional(),
    DATABASE_WRITE_URL: z.string().min(1).optional(),
    DATABASE_POOL_MAX: z.coerce.number().positive().default(5),
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM_EMAIL: z.string().min(1).default("Radar Porciúncula <newsletter@maistransparencia.org>"),
    CRON_SECRET: z.string().min(1).optional(),
    INTERNAL_API_SECRET: z.string().min(1).optional(),
    DIGEST_SECRET: z.string().min(1).optional(),
    SOCIAL_SECRET: z.string().min(1).optional(),
    X_API_KEY: z.string().min(1).optional(),
    X_API_SECRET: z.string().min(1).optional(),
    X_ACCESS_TOKEN: z.string().min(1).optional(),
    X_ACCESS_TOKEN_SECRET: z.string().min(1).optional(),
    X_BEARER_TOKEN: z.string().min(1).optional(),
    FACEBOOK_PAGE_ID: z.string().min(1).optional(),
    FACEBOOK_PAGE_ACCESS_TOKEN: z.string().min(1).optional(),
    VERCEL_URL: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().min(1).optional(),
    NEXT_PUBLIC_SITE_DOMAIN: z.string().min(1).optional(),
    NEXT_PUBLIC_SITE_NAME: z.string().min(1).default("MaisTransparencia"),
    NEXT_PUBLIC_PROJECT_NAME: z.string().min(1).default("MaisTransparência"),
    NEXT_PUBLIC_X_URL: z.string().min(1).optional(),
    NEXT_PUBLIC_X_HANDLE: z.string().min(1).default("@mtransparenciax"),
    NEXT_PUBLIC_GITHUB_URL: z.string().min(1).default("https://github.com/maistransparencia/transparencia"),
    NEXT_PUBLIC_FACEBOOK_URL: z.string().min(1).optional(),
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: z.string().min(1).optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().min(1).default("https://us.i.posthog.com"),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SITE_DOMAIN: process.env.NEXT_PUBLIC_SITE_DOMAIN,
    NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
    NEXT_PUBLIC_PROJECT_NAME: process.env.NEXT_PUBLIC_PROJECT_NAME,
    NEXT_PUBLIC_X_URL: process.env.NEXT_PUBLIC_X_URL,
    NEXT_PUBLIC_X_HANDLE: process.env.NEXT_PUBLIC_X_HANDLE,
    NEXT_PUBLIC_GITHUB_URL: process.env.NEXT_PUBLIC_GITHUB_URL,
    NEXT_PUBLIC_FACEBOOK_URL: process.env.NEXT_PUBLIC_FACEBOOK_URL,
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
```

### Regras do Projeto Aplicáveis (`AGENTS.md`)

- **Regra 1 (Economia de Contexto):** Focar estritamente nos arquivos de configuração e nos pontos de consumo de variáveis de ambiente.
- **Regra 2 (Camadas Arquiteturais):** `@transparencia/db` gerencia o pooling e conexão Kysely com suas próprias variáveis (`DATABASE_URL`, `DATABASE_WRITE_URL`, `DATABASE_POOL_MAX`), mantendo sua independência; `apps/web` valida o ambiente global do portal.
- **Regra 7 (Versões Fixas / Pinned Versions):** `@t3-oss/env-nextjs: "0.13.11"` e `zod: "3.24.2"` devem ser declarados com versões exatas, sem caracteres prefixados (`^`, `~`).
- **Regra 13 (Condicionais Complexas):** Sem ternários aninhados ao calcular fallbacks de ambiente. Usar IIFEs ou funções auxiliares claras.
- **Regra 14 (Auditoria de Repetição Upstream):** Não reimplementar checagens defensivas redundantes onde Zod já provê validação e tipagem estrita garantida.
- **Regra 15 (Segurança de Produção):** Todos os testes e builds locais rodam estritamente contra banco e variáveis de ambiente locais.

---

## Dev Agent Record

### Debug Log
- Task 1: Instaladas dependências `@t3-oss/env-nextjs@0.13.11` e `zod@3.24.2` com versões fixas (pinned) em `apps/web/package.json`. Sincronizado `pnpm-lock.yaml` via `pnpm install`. `pnpm lint` verificado com sucesso.
- Task 2: Criado `apps/web/env.ts` com segregação de `server` e `client`, defaults centralizados para todas as variáveis públicas e de serviço, runtime mapping em `experimental__runtimeEnv`, `emptyStringAsUndefined: true` e `skipValidation`. Verificado com Biome, `tsc --noEmit` e suíte Vitest (176 testes passando).
- Task 3: Criados e sincronizados `.env.example` na raiz do monorepo e em `apps/web/.env.example`, documentando com comentários e valores fictícios seguros todas as 8 seções por domínio.
- Task 4: Refatorados todos os módulos de `apps/web` que consumiam `process.env` diretamente para importar o objeto canônico `env` de `@/env`. Testes de build (`next build`), dry-runs de CLI (`digest:dry-run`, `social:dry-run`), Biome lint e Vitest aprovados com 100% de sucesso.
- Task 5: Implementada suíte de testes automatizados de validação de ambiente `apps/web/env.spec.ts` cobrindo defaults centralizados, tipos, variáveis opcionais, coerção numérica de pool e overrides dinâmicos em testes. Suíte completa do Vitest com 38 arquivos e 183 testes passando 100%.
- Task 6: Executados todos os gates mandatórios de qualidade: `pnpm test` (Turbo, 4 tasks bem-sucedidas), `pnpm build` (Next.js e pacotes com 0 erros), `make check` (ruff e mypy 100% aprovados) e `make test` (83 testes de integração pytest passando). Atualizados `sprint-status.yaml` e a história para status `review`.

### Completion Notes List
- Task 1 concluída:
  - Adicionados `@t3-oss/env-nextjs: "0.13.11"` e `zod: "3.24.2"` em `apps/web/package.json` sem prefixos `^` ou `~`, atendendo à Regra 7 de `AGENTS.md`.
  - Executado `pnpm install`, atualizando e sincronizando `pnpm-lock.yaml`.
  - Executado `pnpm lint` com 0 erros.
- Task 2 concluída:
  - Criado `apps/web/env.ts` utilizando `createEnv` de `@t3-oss/env-nextjs` e `zod`.
  - Definidos e centralizados todos os valores padrão (defaults) para `client` (`NEXT_PUBLIC_SITE_DOMAIN`, `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_PROJECT_NAME`, `NEXT_PUBLIC_X_URL`, `NEXT_PUBLIC_X_HANDLE`, `NEXT_PUBLIC_GITHUB_URL`, `NEXT_PUBLIC_FACEBOOK_URL`, `NEXT_PUBLIC_POSTHOG_HOST`) e `server` (`NODE_ENV`, `DATABASE_POOL_MAX`, `RESEND_FROM_EMAIL`).
  - Mapeadas todas as variáveis `NEXT_PUBLIC_*` em `experimental__runtimeEnv` para inlining estático pelo Next.js.
  - Habilitados `emptyStringAsUndefined: true` e `skipValidation: !!process.env.SKIP_ENV_VALIDATION`.
  - Validado via Biome (0 erros), TypeScript (`tsc --noEmit` sem erros) e suíte completa Vitest (37 arquivos, 176 testes passando).
- Task 3 concluída:
  - Atualizado `.env.example` na raiz do monorepo e criado `apps/web/.env.example`.
  - Documentação didática dividida em 8 domínios claros: Ambiente, Banco de Dados, Newsletter/Resend, Automações/Crons/Secrets, Redes Sociais/Bots, Hospedagem/Vercel, Informações Institucionais e Telemetria/PostHog.
  - Valores fictícios seguros que orientam a configuração sem expor credenciais reais.
- Task 4 concluída:
  - Refatorados os serviços de e-mail e rotas da newsletter (`lib/resend.ts`, `lib/radar-digest.ts`, `app/api/newsletter/confirm/route.ts`, `app/api/newsletter/dispatch-digest/route.ts`, `app/api/newsletter/subscribe/route.ts`, `app/api/newsletter/unsubscribe/route.ts`).
  - Refatorados os bots e rotas de redes sociais (`lib/x-bot.ts`, `lib/facebook-bot.ts`, `app/api/social/publish/route.ts`).
  - Refatorados os componentes visuais e templates de e-mail/OG (`components/social-links.tsx`, `components/og/og-card-template.tsx`, `components/emails/newsletter-confirmation.tsx`, `components/emails/radar-digest.tsx`).
  - Refatorados metadata, sitemap, robots, layout e telemetria (`lib/metadata.ts`, `app/sitemap.ts`, `app/robots.ts`, `app/layout.tsx`, `posthog-server.ts`, `instrumentation-client.ts`, `lib/cache.ts`).
  - Validados os scripts CLI executáveis (`bin/publish-social.ts` e `bin/dispatch-digest.ts`) via dry-runs com saída bem-sucedida.
  - Executados `pnpm lint`, `pnpm --filter web exec tsc --noEmit` e `pnpm --filter web build` com 0 erros.
- Task 5 concluída:
  - Criado `apps/web/env.spec.ts` com testes unitários cobrindo:
    1. Carregamento correto e integridade de todos os defaults centralizados (`NEXT_PUBLIC_SITE_DOMAIN`, `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_PROJECT_NAME`, `NEXT_PUBLIC_X_URL`, `NEXT_PUBLIC_X_HANDLE`, `NEXT_PUBLIC_GITHUB_URL`, `NEXT_PUBLIC_FACEBOOK_URL`, `NEXT_PUBLIC_POSTHOG_HOST`, `RESEND_FROM_EMAIL`).
    2. Coerção numérica e validação de `DATABASE_POOL_MAX`.
    3. Comportamento defensivo para variáveis opcionais em ambiente local.
    4. Suporte a overrides dinâmicos em testes via proxy para `process.env`.
  - Executada a suíte inteira do Vitest: 38 arquivos e 183 testes passando sem qualquer regressão.
- Task 6 concluída:
  - Executado `pnpm test` (Turbo) cobrindo todos os pacotes e a web (183 testes passando).
  - Executado `pnpm build` (Turbo) validando compilação otimizada do Next.js sem erros de ambiente ou tipagem.
  - Executado `make check` (ruff check, ruff format, mypy) com 0 erros.
  - Executado `make test` (pytest) com 83 testes passando 100%.
  - Atualizado status da história para `review` em `sprint-status.yaml` e no arquivo da história.

### File List
- `apps/web/package.json`
- `pnpm-lock.yaml`
- `apps/web/env.ts`
- `apps/web/env.spec.ts`
- `.env.example`
- `apps/web/.env.example`
- `apps/web/lib/resend.ts`
- `apps/web/lib/radar-digest.ts`
- `apps/web/lib/x-bot.ts`
- `apps/web/lib/facebook-bot.ts`
- `apps/web/lib/metadata.ts`
- `apps/web/lib/cache.ts`
- `apps/web/components/social-links.tsx`
- `apps/web/components/og/og-card-template.tsx`
- `apps/web/components/emails/newsletter-confirmation.tsx`
- `apps/web/components/emails/radar-digest.tsx`
- `apps/web/app/api/newsletter/confirm/route.ts`
- `apps/web/app/api/newsletter/dispatch-digest/route.ts`
- `apps/web/app/api/newsletter/subscribe/route.ts`
- `apps/web/app/api/newsletter/unsubscribe/route.ts`
- `apps/web/app/api/social/publish/route.ts`
- `apps/web/app/sitemap.ts`
- `apps/web/app/robots.ts`
- `apps/web/app/layout.tsx`
- `apps/web/posthog-server.ts`
- `apps/web/instrumentation-client.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/7-6-centralizacao-e-validacao-de-variaveis-de-ambiente-com-t3-env.md`

### Change Log
- 2026-09-02: Início da Story 7.6 e conclusão da Task 1 (instalação e pinagem de dependências `@t3-oss/env-nextjs` e `zod`).
- 2026-09-02: Conclusão da Task 2 (criação do módulo canônico `apps/web/env.ts` com validação centralizada e defaults).
- 2026-09-02: Conclusão da Task 3 (criação e sincronização do `.env.example` na raiz e em `apps/web/.env.example`).
- 2026-09-02: Conclusão da Task 4 (refatoração cirúrgica de todos os pontos de consumo direto de `process.env` em `apps/web` para `@/env`).
- 2026-09-02: Conclusão da Task 5 (criação de `apps/web/env.spec.ts` e validação da suíte completa de testes).
- 2026-09-02: Conclusão da Task 6 (execução de todos os gates de qualidade mandatórios e transição para review).
