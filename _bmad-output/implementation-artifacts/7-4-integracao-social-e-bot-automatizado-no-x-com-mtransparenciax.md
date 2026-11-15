---
baseline_commit: 2692da3349b57c7173d883fe971cc5809af30487
---

# Story 7.4: Integração Social e Bot Automatizado no X.com (@mtransparenciax) e Facebook Pages

Status: done

## Story

As a follower of `@mtransparenciax` on X (Twitter), Facebook Page follower, citizen, or public auditor,  
I want automated public posts broadcasting data extraction completions, periodic municipal fiscal digests, and portal release notes across both X.com and Facebook Pages, as well as a Facebook icon in the sidebar/footer alongside existing links,  
So that municipal transparency findings and civic spending insights reach the entire community across all major social networks without manual intervention.

---

## Acceptance Criteria

### 1. Cliente e Formatador de Mensagens do X.com (`apps/web/lib/x-bot.ts`)
1. **Autenticação e Cliente X API v2:**
   - Implementar módulo `apps/web/lib/x-bot.ts` com suporte à API v2 do X (`POST https://api.twitter.com/2/tweets`).
   - Autenticação nativa via **OAuth 1.0a User Context** (utilizando módulo padrão `node:crypto` para assinatura HMAC-SHA1) ou **OAuth 2.0 Bearer/User Token**, configurável pelas variáveis de ambiente:
     - `X_API_KEY` (Consumer Key)
     - `X_API_SECRET` (Consumer Secret)
     - `X_ACCESS_TOKEN` (Access Token)
     - `X_ACCESS_TOKEN_SECRET` (Access Token Secret)
     - `X_BEARER_TOKEN` (opcional / fallback)
   - **Zero Dependências Pesadas Externas:** Não instalar pacotes de terceiros; utilizar `fetch` e `crypto` nativos do Node.js.
2. **Cálculo de Comprimento e Regra dos 280 Caracteres:**
   - Implementar helper de cálculo de caracteres no padrão do X: URLs contam como 23 caracteres (`t.co` weighting).
   - Garantir que mensagens do X nunca ultrapassem **280 caracteres** (`<= 280`), com truncamento inteligente preservando URLs e hashtags.
3. **Formatadores Especializados para o X:**
   - `buildFiscalDigestTweet`: Título cívico, Total Pago, indicador de opacidade/balanço, link da rota e hashtags `#Porciuncula #TransparenciaFiscal`.
   - `buildExtractionTweet`: Resumo da carga de dados concluída e link.
   - `buildReleaseTweet`: Resumo de nova release do portal e link.
   - `buildCustomTweet`: Validação e postagem de mensagens arbitrárias.

### 2. Cliente e Formatador de Mensagens do Facebook Pages (`apps/web/lib/facebook-bot.ts`)
4. **Autenticação e Meta Graph API v21.0 (`POST /{page-id}/feed`):**
   - Implementar módulo `apps/web/lib/facebook-bot.ts` com integração direta com a Meta Graph API (`POST https://graph.facebook.com/v21.0/{page-id}/feed`).
   - Autenticação via `FACEBOOK_PAGE_ACCESS_TOKEN` e `FACEBOOK_PAGE_ID`.
   - Suporte a publicação de `message` com `link` associado (para enriquecer com o card OpenGraph gerado dinamicamente na Story 7.1).
5. **Formatadores Estruturados para o Facebook:**
   - Aproveitar que o Facebook não possui o limite de 280 caracteres para construir publicações cívicas mais completas e didáticas:
     - `buildFiscalDigestFacebookPost`: Mensagem estruturada em tópicos (Execução Orçamentária, Termômetro de Opacidade Fiscal, Maiores Fornecedores e Balanço do Exercício) com links diretos e hashtags.
     - `buildExtractionFacebookPost`: Detalhamento dos novos dados carregados no portal e orientações de consulta.
     - `buildReleaseFacebookPost`: Anúncio de novidades com resumo expandido das melhorias cívicas.
     - `buildCustomFacebookPost`: Mensagem customizada com validação.

### 3. Publicador Social Unificado e Resiliência (`apps/web/lib/social-publisher.ts`)
6. **Orquestrador Multi-Canal (`publishSocial`):**
   - Função central que despacha para os canais selecionados (`channels: ["x", "facebook"]` ou `"all"`):
     ```typescript
     export type SocialChannel = "x" | "facebook";
     export interface SocialPublishOptions {
       portalSlug: string;
       type: "fiscal_digest" | "extraction" | "release" | "custom";
       channels?: SocialChannel[] | "all";
       ano?: number;
       text?: string;
       version?: string;
       summary?: string;
       dryRun?: boolean;
       baseUrl?: string;
     }
     export interface SocialPublishResult {
       success: boolean;
       portalSlug: string;
       type: string;
       dryRun: boolean;
       results: {
         x?: { success: boolean; tweetId?: string; error?: string };
         facebook?: { success: boolean; postId?: string; error?: string };
       };
     }
     ```
7. **Modo Dry-Run e Resiliência Independente:**
   - Suporte a `dryRun: true` (executa formatação e gera logs informativos `[X DRY-RUN]` e `[FACEBOOK DRY-RUN]` sem disparos HTTP).
   - Se faltarem credenciais de uma das redes sociais, ela entra automaticamente em fallback/dry-run ou emite warning sem interromper o envio na outra rede.
   - Não lançar exceções não tratadas: capturar erros de rede/API e retornar no DTO de resultado.

### 4. Ícone do Facebook na Sidebar e Rodapé (`apps/web/components/social-links.tsx`)
8. **Inclusão do Ícone Oficial do Facebook:**
   - Adicionar o link do Facebook no componente `SocialLinks` (utilizado na Sidebar e no Footer do portal):
     - Prop `facebookUrl?: string` com fallback para `process.env.NEXT_PUBLIC_FACEBOOK_URL || "https://facebook.com/maistransparencia"`.
     - Renderização do SVG oficial do Facebook (vetor nítido, escala consistente com GitHub e X).
     - Rótulos de acessibilidade: `title="Siga no Facebook"` e `aria-label="Página oficial no Facebook"`.
     - Disparo do evento de telemetria PostHog: `posthog.capture("social_link_clicked", { platform: "facebook", url: facebookUrl })`.

### 5. Endpoint de API / Webhook Seguro (`apps/web/app/api/social/publish/route.ts`)
9. **Endpoint Autenticado com Suporte a Multi-Canal:**
   - Criar `POST /api/social/publish` (com alias ou redirecionamento em `/api/social/publish-x` para retrocompatibilidade).
   - Autenticação obrigatória com `Authorization: Bearer <CRON_SECRET>` utilizando `crypto.timingSafeEqual`.
   - Processamento de requisições disparando o `socialPublisher` e retornando status 200 com resumo dos disparos em cada plataforma.

### 6. Interface CLI, Makefile e Scripts
10. **Script CLI Executável (`apps/web/bin/publish-social.ts`):**
    - Suportar execução via CLI com flags: `--channels` (`all`, `x`, `facebook`), `--type`, `--portal`, `--ano`, `--text`, `--version`, `--summary`, `--dry-run`, `--base-url`.
    - Atualizar scripts em `apps/web/package.json`:
      - `"social:publish": "tsx bin/publish-social.ts"`
      - `"social:dry-run": "tsx bin/publish-social.ts --dry-run"`
      - `"social:x": "tsx bin/publish-social.ts --channels x"`
      - `"social:facebook": "tsx bin/publish-social.ts --channels facebook"`
11. **Targets no `Makefile`:**
    - `bot/post`: Executa `pnpm --filter web social:publish --channels $(if $(CHANNELS),$(CHANNELS),all) --type $(if $(TYPE),$(TYPE),fiscal_digest) --portal $(if $(PORTAL),$(PORTAL),porciuncula_prefeitura) $(if $(ANO),--ano $(ANO)) $(if $(DRY_RUN),--dry-run)`
    - `bot/dry-run`: Executa em modo dry-run sem credenciais.

### 7. Cobertura de Testes Automatizados e Qualidade
12. **Testes Unitários:**
    - `apps/web/lib/x-bot.spec.ts`: Testes de cálculo de caracteres (280 chars), OAuth 1.0a, formatação de tweets e erros da API.
    - `apps/web/lib/facebook-bot.spec.ts`: Testes de formatação estruturada de posts, chamada à Graph API e tratamento de erros.
    - `apps/web/lib/social-publisher.spec.ts`: Testes de orquestração multi-canal, isolamento de falhas e dry-run.
    - `apps/web/components/social-links.spec.tsx`: Testes de renderização do ícone do Facebook, customização via props e telemetria PostHog.
    - `apps/web/app/api/social/publish-route.spec.ts`: Testes de autenticação com `CRON_SECRET` e validação do payload.
13. **Baseline de Qualidade:**
    - Todas as suítes de testes (`pnpm test`, `make test` e `make test/ts`) e compilação (`pnpm build` e `make check`) devem passar com 100% de sucesso.

---

## Tasks / Subtasks

- [x] Task 1: Atualizar componente `SocialLinks` com ícone do Facebook (AC: #8, #12)
  - [x] 1.1: Adicionar prop `facebookUrl` e SVG oficial do Facebook em `apps/web/components/social-links.tsx`
  - [x] 1.2: Adicionar evento PostHog `platform: "facebook"` no clique do link
  - [x] 1.3: Atualizar testes em `apps/web/components/social-links.spec.tsx` validando renderização e telemetria
- [x] Task 2: Implementar módulo do X.com (`apps/web/lib/x-bot.ts` e `x-bot.spec.ts`) (AC: #1, #2, #3, #12)
  - [x] 2.1: Implementar OAuth 1.0a HMAC-SHA1 nativo com `node:crypto` e OAuth 2.0
  - [x] 2.2: Implementar helper de contagem de caracteres (`<= 280`) com t.co URLs
  - [x] 2.3: Implementar formatadores `buildFiscalDigestTweet`, `buildExtractionTweet`, `buildReleaseTweet`, `buildCustomTweet`
  - [x] 2.4: Criar suíte de testes unitários `apps/web/lib/x-bot.spec.ts`
- [x] Task 3: Implementar módulo do Facebook Pages (`apps/web/lib/facebook-bot.ts` e `facebook-bot.spec.ts`) (AC: #4, #5, #12)
  - [x] 3.1: Implementar integração com Meta Graph API v21.0 (`POST /{page-id}/feed`)
  - [x] 3.2: Implementar formatadores estruturados com contexto cívico detalhado para o Facebook
  - [x] 3.3: Criar suíte de testes unitários `apps/web/lib/facebook-bot.spec.ts`
- [x] Task 4: Implementar orquestrador `social-publisher.ts` e endpoint de API (AC: #6, #7, #9, #12)
  - [x] 4.1: Criar `apps/web/lib/social-publisher.ts` com orquestração multi-canal e resiliência independente
  - [x] 4.2: Criar rota `apps/web/app/api/social/publish/route.ts` protegida por `CRON_SECRET` com `timingSafeEqual`
  - [x] 4.3: Criar testes `apps/web/lib/social-publisher.spec.ts` e `apps/web/app/api/social/publish-route.spec.ts`
- [x] Task 5: Criar CLI executável, scripts npm e Makefile targets (AC: #10, #11, #13)
  - [x] 5.1: Criar `apps/web/bin/publish-social.ts` com parser de flags CLI
  - [x] 5.2: Adicionar scripts no `apps/web/package.json` (`social:publish`, `social:dry-run`, etc.)
  - [x] 5.3: Adicionar targets `bot/post` e `bot/dry-run` no `Makefile`
  - [x] 5.4: Executar validação completa (`pnpm test`, `pnpm build`, `make check`)

### Review Findings

- [x] [Review][Patch] Tornar hashtag do município no X.com dinâmica via sanitizeHashtag com fallback [apps/web/lib/x-bot.ts:178,195]
- [x] [Review][Patch] Tratamento gracioso de posição fiscal nula em boletins fiscais [apps/web/lib/facebook-bot.ts:74-93 e apps/web/lib/x-bot.ts:166-176]
- [x] [Review][Patch] Evitar erro de body já consumido e divergência de Content-Length em publish-x [apps/web/app/api/social/publish-x/route.ts:10-34]
- [x] [Review][Patch] Preservar quebras de linha (\n) ao truncar tweets e evitar fatiamento de surrogate pairs Unicode [apps/web/lib/x-bot.ts:115-122]
- [x] [Review][Patch] Suportar caracteres acentuados na regex de preservação de hashtags [apps/web/lib/x-bot.ts:91]
- [x] [Review][Patch] Validação defensiva do parâmetro channels em publicação social [apps/web/app/api/social/publish/route.ts:135]
- [x] [Review][Patch] Permitir publicações customizadas sem exigir portalSlug [apps/web/app/api/social/publish/route.ts:104]
- [x] [Review][Patch] Prevenir vazamento de temporização do tamanho do segredo em safeCompare via pré-hashing SHA-256 [apps/web/app/api/social/publish/route.ts:10-17]
- [x] [Review][Patch] Prevenir hashtag vazia quando municipioNome for vazio e exportar sanitizeHashtag [apps/web/lib/facebook-bot.ts:55-60]
- [x] [Review][Patch] Truncar descrições longas de contratos e tratar data.error na Meta Graph API [apps/web/lib/facebook-bot.ts:116-122]
- [x] [Review][Patch] Repassar flags de texto, versão e resumo no Makefile e documentar novas variáveis em .env.example [Makefile:116-121]

---

## Dev Notes

### Arquitetura & Guardrails Técnicos

1. **Meta Graph API (Facebook Pages):**
   - Endpoint: `POST https://graph.facebook.com/v21.0/${pageId}/feed`
   - Headers: `Content-Type: application/json`
   - Body:
     ```json
     {
       "message": "Texto detalhado do boletim...",
       "link": "https://transparencia.app/porciuncula_prefeitura/despesas",
       "access_token": "FACEBOOK_PAGE_ACCESS_TOKEN"
     }
     ```
   - O parâmetro `link` faz o Facebook gerar o preview visual com a imagem OpenGraph dinâmica da rota.

2. **X API v2 (OAuth 1.0a):**
   - Endpoint: `POST https://api.twitter.com/2/tweets`
   - Assinatura HMAC-SHA1 gerada via `node:crypto` nativo.
   - Ponderação estrita de 280 caracteres (`calculateTweetLength` com t.co url = 23 chars).

3. **Orquestração Desacoplada e Resiliente:**
   - Falha ou falta de credenciais em uma rede não impede o envio na outra.
   - `dryRun` ativado se credenciais ausentes ou flag explicitamente definida.

4. **Regras do Projeto (`AGENTS.md`):**
   - **Regra 2:** Dados fiscais obtidos de `@transparencia/db`, apresentação/formatação em `apps/web/lib`.
   - **Regra 7:** Versões fixas de pacotes, zero pacotes desnecessários.
   - **Regra 10:** Slugs e identificadores em lowercase snake_case.
   - **Regra 13:** Sem ternários aninhados; usar early return ou IIFE.

---

### Project Structure Notes

```
apps/web/
├── app/
│   └── api/
│       └── social/
│           ├── publish/
│           │   └── route.ts                # [NOVO] Endpoint autenticado para despacho social
│           └── publish-route.spec.ts       # [NOVO] Testes da rota /api/social/publish
├── bin/
│   └── publish-social.ts                   # [NOVO] CLI multi-canal para disparo social
├── components/
│   ├── social-links.tsx                    # [MODIFICADO] Adicionar ícone do Facebook
│   └── social-links.spec.tsx               # [MODIFICADO] Testes do link do Facebook
├── lib/
│   ├── x-bot.ts                            # [NOVO] Cliente X API v2, OAuth 1.0a e formatadores
│   ├── x-bot.spec.ts                       # [NOVO] Testes do x-bot
│   ├── facebook-bot.ts                     # [NOVO] Cliente Meta Graph API e formatadores
│   ├── facebook-bot.spec.ts                # [NOVO] Testes do facebook-bot
│   ├── social-publisher.ts                 # [NOVO] Orquestrador multi-canal
│   └── social-publisher.spec.ts            # [NOVO] Testes do orquestrador
└── package.json                            # [MODIFICADO] Scripts social:publish, social:dry-run

Makefile                                    # [MODIFICADO] Targets bot/post e bot/dry-run
```

---

### References

- [Epics Document - Story 7.4](file:///Volumes/Projects/transparencia/_bmad-output/planning-artifacts/epics.md#L937-L949)
- [Story 7.1 - Geração Dinâmica de Imagens OpenGraph (OG Cards)](file:///Volumes/Projects/transparencia/_bmad-output/implementation-artifacts/7-1-geracao-dinamica-de-imagens-opengraph-og-cards-para-compartilhamento-social-e-whatsapp.md)
- [Story 7.3 - Automação de Alertas Pós-ELT e Boletim Periódico Municipal](file:///Volumes/Projects/transparencia/_bmad-output/implementation-artifacts/7-3-automacao-de-alertas-pos-elt-e-boletim-periodico-municipal-radar-porciuncula.md)
- [Meta Graph API Documentation - Page Feeds](https://developers.facebook.com/docs/graph-api/reference/v21.0/page/feed)
- [X API v2 Documentation - POST /2/tweets](https://developer.x.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets)

---

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash (High)

### Debug Log References

### Completion Notes List
 
- ✅ **Task 1: Atualizar componente `SocialLinks` com ícone do Facebook (AC: #8, #12)**
  - Adicionada a prop `facebookUrl` e fallback para `process.env.NEXT_PUBLIC_FACEBOOK_URL || "https://facebook.com/maistransparencia"` em `apps/web/components/social-links.tsx`.
  - Inserido o SVG oficial do Facebook com acessibilidade (`title="Siga no Facebook"`, `aria-label="Página oficial no Facebook"`).
  - Integrado evento de telemetria PostHog (`social_link_clicked`, `platform: "facebook"`).
  - Suíte de testes unitários `apps/web/components/social-links.spec.tsx` atualizada e 100% verde (6 testes passando).
  - Build do Next.js validado com sucesso sem erros de tipagem.

- ✅ **Task 2: Implementar módulo do X.com (`apps/web/lib/x-bot.ts` e `x-bot.spec.ts`) (AC: #1, #2, #3, #12)**
  - Implementado cliente X API v2 nativo sem dependências externas utilizando `node:crypto` para autenticação OAuth 1.0a HMAC-SHA1 (`generateOAuth1Header`) e suporte a OAuth 2.0 Bearer Token.
  - Implementada regra oficial do X de ponderação de URLs (peso fixo de 23 caracteres via `t.co`) com cálculo de tamanho (`calculateTweetLength`) e truncamento inteligente (`truncateTweet`) preservando URLs e hashtags até o teto estrito de 280 caracteres.
  - Criados formatadores especializados: `buildFiscalDigestTweet`, `buildExtractionTweet`, `buildReleaseTweet` e `buildCustomTweet`.
  - Suporte a despacho com modo `dryRun` automático quando credenciais estão ausentes ou via flag de simulação.
  - Criada suíte completa de testes unitários em `apps/web/lib/x-bot.spec.ts` (14 testes passando).
  - Suíte de testes do `apps/web` (33 arquivos, 140 testes) e verificação do Biome (`pnpm lint`) 100% aprovados.

- ✅ **Task 3: Implementar módulo do Facebook Pages (`apps/web/lib/facebook-bot.ts` e `facebook-bot.spec.ts`) (AC: #4, #5, #12)**
  - Implementada integração nativa com a Meta Graph API v21.0 (`POST /{page-id}/feed`) utilizando `fetch` nativo.
  - Autenticação via `FACEBOOK_PAGE_ACCESS_TOKEN` e `FACEBOOK_PAGE_ID`, com suporte a publicação de texto (`message`) acompanhado de link dinâmico (`link`) com preview de card OpenGraph.
  - Desenvolvidos formatadores estruturados com contexto cívico didático e expandido para redes sem limite de 280 caracteres: `buildFiscalDigestFacebookPost`, `buildExtractionFacebookPost`, `buildReleaseFacebookPost` e `buildCustomFacebookPost`.
  - Suporte a modo `dryRun` e captura resiliente de erros de API / rede.
  - Suíte de testes unitários criada em `apps/web/lib/facebook-bot.spec.ts` com 8 testes passando.
  - Build do Next.js e validações do Biome 100% aprovados.

- ✅ **Task 4: Implementar orquestrador `social-publisher.ts` e endpoint de API (AC: #6, #7, #9, #12)**
  - Criado o orquestrador unificado `apps/web/lib/social-publisher.ts` (`publishSocial`) com suporte a múltiplos canais (`x`, `facebook` ou `all`) e tipos (`fiscal_digest`, `extraction`, `release`, `custom`).
  - Implementado isolamento de falhas: se uma das redes sociais falhar ou exceder rate limits, a outra segue executando sem bloqueio e o resultado individual é reportado com precisão.
  - Criado endpoint seguro `POST /api/social/publish` autenticado via Bearer token (`CRON_SECRET`, `INTERNAL_API_SECRET` ou `SOCIAL_SECRET`) utilizando `crypto.timingSafeEqual` para prevenção de timing attacks.
  - Criada rota de compatibilidade `POST /api/social/publish-x` que repassa requisições para o canal X.
  - Suítes de testes unitários `social-publisher.spec.ts` (6 testes) e `publish-route.spec.ts` (5 testes) 100% aprovadas.
  - Total da suíte web atualizado para 36 arquivos e 159 testes passando. Build de produção do Next.js aprovado.

- ✅ **Task 5: Criar CLI executável, scripts npm e Makefile targets (AC: #10, #11, #13)**
  - Criado o script executável `apps/web/bin/publish-social.ts` com suporte robusto a flags CLI (`--channels`, `--type`, `--portal`, `--ano`, `--text`, `--version`, `--summary`, `--dry-run`, `--base-url`).
  - Adicionados scripts no `apps/web/package.json`: `social:publish`, `social:dry-run`, `social:x`, `social:facebook`.
  - Adicionados targets no `Makefile`: `bot/post` e `bot/dry-run` com parametrização dinâmica de variáveis (`CHANNELS`, `TYPE`, `PORTAL`, `ANO`, `DRY_RUN`).
  - Executadas validações manuais e automatizadas: `social:dry-run`, `social:x`, `social:facebook` e `make bot/dry-run` com simulações perfeitas em dry-run.
  - Baseline de qualidade concluído com 100% de sucesso: `pnpm test` (36 arquivos, 159 testes), `pnpm lint` (0 erros), `pnpm build` (Next.js 16) e `make check` (mypy, ruff).

### File List

- `apps/web/components/social-links.tsx`
- `apps/web/components/social-links.spec.tsx`
- `apps/web/lib/x-bot.ts`
- `apps/web/lib/x-bot.spec.ts`
- `apps/web/lib/facebook-bot.ts`
- `apps/web/lib/facebook-bot.spec.ts`
- `apps/web/lib/social-publisher.ts`
- `apps/web/lib/social-publisher.spec.ts`
- `apps/web/app/api/social/publish/route.ts`
- `apps/web/app/api/social/publish-x/route.ts`
- `apps/web/app/api/social/publish-route.spec.ts`
- `apps/web/bin/publish-social.ts`
- `apps/web/package.json`
- `Makefile`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-09-01: Implementação completa da Story 7.4 (Integração Social e Bot Automatizado no X.com e Facebook Pages)
  - Adicionado ícone e telemetria do Facebook no componente SocialLinks.
  - Desenvolvido cliente da API v2 do X.com com OAuth 1.0a HMAC-SHA1 nativo e cálculo estrito de 280 chars (t.co URLs).
  - Desenvolvido cliente da Meta Graph API v21.0 do Facebook Pages com preview de imagem OpenGraph e posts didáticos long-form.
  - Implementado orquestrador multi-canal `publishSocial` com resiliência independente e isolamento de falhas.
  - Criados endpoints seguros `POST /api/social/publish` e `POST /api/social/publish-x` com timingSafeEqual.
  - Implementados script CLI `publish-social.ts`, comandos npm e targets no Makefile (`bot/post`, `bot/dry-run`).
  - Cobertura completa de testes automatizados adicionada (44 novos testes unitários) e 100% de aprovação nos linters/builds.
