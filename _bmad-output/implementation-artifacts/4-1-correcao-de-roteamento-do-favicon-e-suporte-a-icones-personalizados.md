---
baseline_commit: f115418e4bc6bfbf6b13f52ce8a157b7dcc2e06c
generated_at: 2026-08-06T23:03:00-03:00
---

# Story 4.1: Correção de Roteamento do Favicon e Suporte a Ícones Personalizados

## Metadados

- Epic: 4 - Experiência Visual, Responsividade Mobile, SEO & Otimização para LLMs
- Story ID: 4.1
- Story Key: 4-1-correcao-de-roteamento-do-favicon-e-suporte-a-icones-personalizados
- Status: done
- Arquivo: _bmad-output/implementation-artifacts/4-1-correcao-de-roteamento-do-favicon-e-suporte-a-icones-personalizados.md

## User Story

Como usuário da plataforma / auditor,
Quero que as requisições de favicon da aplicação sejam servidas adequadamente sem disparar exceções de rotas no servidor,
Para que os ícones da aba do navegador sejam renderizados corretamente e as funções de leitura de métricas nunca sejam invocadas para ativos estáticos como `favicon.ico`.

## Critérios de Aceitação (BDD)

**Given** uma requisição estática para `GET /favicon.ico`
**When** o servidor Next.js processa a rota
**Then** a requisição não deve colidir com o parâmetro dinâmico `[portalSlug]` de `app/[portalSlug]`.

**And** a função `requireEmpresaIdsForMetrics` (e demais loaders de rotas dinâmicas) nunca deve ser invocada com o slug `"favicon.ico"`.

**And** a aplicação deve expor suporte completo no Next.js Metadata (`metadata.icons` no `layout.tsx`) carregando os ícones reais de `apps/web/public/`:
  - `<link rel="icon" type="image/svg+xml" href="/favicon.svg">`
  - `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">`
  - `<link rel="apple-touch-icon" sizes="180x180" href="/favicon-180.png">`

**And** a suíte de validação completa (`make test`, `make test/ts`, `pnpm build`) executa e passa com 100% de sucesso.

## Contexto da Epic e Valor

- A Epic 4 foca em melhorar a experiência visual, responsividade mobile, SEO, suporte a LLMs e qualidade do frontend.
- Na arquitetura Next.js App Router atual, a rota dinamicamente capturada `apps/web/app/[portalSlug]/` pode interceptar requisições raiz para ativos estáticos caso não existam rotas deduzidas ou manipuladores estáticos dedicados na raiz de `app/`.
- Quando um navegador ou crawler solicita `GET /favicon.ico`, a rota `[portalSlug]` captura `"favicon.ico"` como valor do parâmetro `portalSlug`. Em seguida, a função `requireEmpresaIdsForMetrics("favicon.ico")` tenta buscar entidades para o portal fictício `"favicon.ico"`, resultando em uma exceção de servidor (HTTP 500 / unhandled exception) em produção.
- Esta story resolve permanentemente a colisão de rota, implementa uma rota estática dedicada em `app/favicon.ico/route.ts` ou ativo em `public/favicon.ico`, adiciona guardrail estrito contra slugs de ativos estáticos no Proxy (`proxy.ts`) do Next.js e expõe metadados de ícones dinâmicos no Next.js Metadata.

## Guardrails Arquiteturais Obrigatórios

### AD-5 (Isolamento Multi-tenant e Guardrail de Slug)
1. Parâmetros de rota dinâmicos como `portalSlug` devem ser estritamente validados contra nomes de ativos estáticos reservados (`favicon.ico`, `robots.txt`, `sitemap.xml`, `api`, `_next`, `assets`).
2. Ativos estáticos e favicons são filtrados e interceptados no Proxy Next.js (`proxy.ts`) antes da resolução de rotas dinâmicas.

### AGENTS.md e Protocolos de Qualidade
1. Testes de integração backend/dbt (`make test`) devem passar 100%.
2. Testes de tipos e contratos Kysely (`make test/ts`) devem passar 100%.
3. O build de produção da UI e pacotes (`pnpm build`) deve passar com 0 erros.
4. Nenhuma regressão visual ou quebra nas rotas existentes de `[portalSlug]` é permitida.

## Descoberta de Artefatos Carregados

- Epics: `_bmad-output/planning-artifacts/epics.md`
- PRD: `_bmad-output/planning-artifacts/prds/prd-transparencia-2026-08-01/prd.md`
- Arquitetura: `_bmad-output/planning-artifacts/architecture/architecture-transparencia-2026-08-01/ARCHITECTURE-SPINE.md`
- Arquivos de código inspecionados:
  - `apps/web/app/layout.tsx` (`metadata.icons`)
  - `apps/web/proxy.ts` (Next.js Proxy para interceptar favicon/robots/sitemap)
  - `apps/web/app/favicon.ico/route.ts` (Handler estático para `GET /favicon.ico`)
  - `apps/web/public/` (confirmados: `favicon.svg`, `favicon-32.png`, `favicon-180.png`, `favicon.ico`, `brasao-porciuncula.svg`)

## Estado Atual dos Arquivos a Serem Modificados / Criados

### 1. Novo arquivo (NEW) - `apps/web/app/favicon.ico/route.ts` e `apps/web/public/favicon.ico`:
- Adicionado endpoint e arquivo de ativo estático para servir `GET /favicon.ico` diretamente sem atingir `[portalSlug]`.

### 2. Novo arquivo (NEW) - `apps/web/proxy.ts`:
- Adicionado Next.js Proxy/Middleware com regras de matcher excluindo ativos estáticos de rotas dinâmicas `[portalSlug]`.

### 3. Atualização (UPDATE) - `apps/web/app/layout.tsx`:
- Exportada a constante `metadata: Metadata` com a configuração de `icons` mapeando `favicon.svg`, `favicon-32.png` e `favicon-180.png`.

## Tarefas / Subtarefas

- [x] **Task 1 - Rota Estática para Favicon em Next.js (AC: 1)**
  - [x] Criar arquivo de resposta estática em `apps/web/public/favicon.ico` e um route handler em `apps/web/app/favicon.ico/route.ts`.
  - [x] Testar requisições HTTP diretas para `GET /favicon.ico` garantindo que o status seja HTTP 200 OK com os headers corretos (`image/x-icon` ou `image/png`).

- [x] **Task 2 - Suporte a Ícones no Next.js Metadata em `layout.tsx` (AC: 3)**
  - [x] Atualizar `apps/web/app/layout.tsx` importando `type Metadata` de `"next"`.
  - [x] Exportar a constante `metadata: Metadata` mapeando os arquivos salvos em `apps/web/public/`:
    - `icon`: `/favicon.svg` (`type: "image/svg+xml"`) e `/favicon-32.png` (`sizes: "32x32"`, `type: "image/png"`).
    - `apple`: `/favicon-180.png` (`sizes: "180x180"`, `type: "image/png"`).

- [x] **Task 3 - Guardrail de Slugs Reservados via Next.js Proxy (AC: 2)**
  - [x] Criar `apps/web/proxy.ts` com matcher excluindo `favicon.ico`, `favicon*.png`, `favicon.svg`, `robots.txt` e `sitemap.xml` da resolução de `[portalSlug]`.
  - [x] Validar que rotas normais como `/porciuncula-prefeitura` continuam funcionando 100%.

- [x] **Task 4 - Suíte Completa de Validação (AC: 4)**
  - [x] Executar `make test` para verificar integridade do dbt/Python (82+ testes aprovados).
  - [x] Executar `make test/ts` para verificar integridade dos tipos Kysely/TypeScript (16+ testes aprovados).
  - [x] Executar `pnpm build` para confirmar 0 erros de compilação no Next.js e pacotes monorepo.

## Checklist de Validação da Story

- [x] Requisições `GET /favicon.ico` respondem com sucesso sem invocar `[portalSlug]`.
- [x] `requireEmpresaIdsForMetrics` nunca é chamada com `"favicon.ico"`.
- [x] `metadata.icons` declarado e exportado em `apps/web/app/layout.tsx`.
- [x] `make test` verde.
- [x] `make test/ts` verde.
- [x] `pnpm build` compila 100% verde.

## Dev Agent Record

### Agent Model Used

Gemini 3.6 Flash

### Debug Log References

- `make test`: 82 passed in 21.63s.
- `make test/ts`: 16 passed in 31ms.
- `pnpm build`: 3 packages built successfully (with `ƒ Proxy (Middleware)` compiled).

### Completion Notes List

- Criados `apps/web/public/favicon.ico` e `apps/web/app/favicon.ico/route.ts` para servir respostas HTTP 200 diretamente para requisições de favicon.
- Exportado `metadata: Metadata` em `apps/web/app/layout.tsx` registrando os favicons em SVG, PNG (32x32) e Apple Touch (180x180).
- Criado `apps/web/proxy.ts` no Next.js com filtragem por matcher para interceptar requisições estáticas antes da resolução de rotas dinâmicas em `[portalSlug]`.
- Validação completa executada com sucesso (`make test` 82/82, `make test/ts` 16/16, `pnpm build` 100% verde).

### File List

- `apps/web/app/favicon.ico/route.ts` (NEW)
- `apps/web/public/favicon.ico` (NEW)
- `apps/web/proxy.ts` (NEW)
- `apps/web/app/layout.tsx` (MODIFIED)
- `_bmad-output/implementation-artifacts/4-1-correcao-de-roteamento-do-favicon-e-suporte-a-icones-personalizados.md` (MODIFIED)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (MODIFIED)

## Change Log

- **2026-08-06**: Criação e implementação completa da Story 4.1. Adicionada rota estática e arquivo `favicon.ico`, Next.js Proxy em `proxy.ts`, metadados de ícone em `layout.tsx` e validação com `make test`, `make test/ts` e `pnpm build` 100% aprovados. Status: review.
