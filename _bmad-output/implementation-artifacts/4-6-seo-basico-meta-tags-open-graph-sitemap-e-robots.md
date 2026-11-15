---
baseline_commit: 0edd9ba
generated_at: 2026-08-07T22:42:00-03:00
---

# Story 4.6: SEO Básico (Meta Tags, Open Graph, Sitemap & Robots)

## Metadados

- Epic: 4 - Experiência Visual, Responsividade Mobile, SEO & Otimização para LLMs
- Story ID: 4.6
- Story Key: 4-6-seo-basico-meta-tags-open-graph-sitemap-e-robots
- Status: done
- Arquivo: _bmad-output/implementation-artifacts/4-6-seo-basico-meta-tags-open-graph-sitemap-e-robots.md

## User Story

Como gestor de transparência municipal / munícipe / auditor público,
Quero que o portal disponha de metadados completos para mecanismos de busca, prévias ricas para redes sociais (Open Graph e Twitter Cards), sitemap dinâmico (`sitemap.xml`) e arquivo de diretivas de rastreamento (`robots.txt`),
Para que cidadãos e robôs de busca encontrem facilmente as informações de transparência municipal com excelente apresentação visual e indexação precisa.

## Critérios de Aceitação (BDD)

**Given** indexadores de busca (Google, Bing) ou robôs de rastreamento acessando qualquer rota do portal
**When** os metadados HTML do Next.js forem gerados no servidor
**Then** o `apps/web/app/layout.tsx` (RootLayout) deve fornecer a propriedade `metadataBase` configurada via variável de ambiente `NEXT_PUBLIC_APP_URL` ou fallback `https://transparencia.porciuncula.rj.gov.br`, `description` padrão, `keywords` fiscais/municipais, `authors`, `creator`, `publisher`, `robots` (`index: true, follow: true`) e template de títulos `TransparenciaWeb - %s`.
**And** as 8 rotas dinâmicas em `apps/web/app/[portalSlug]` devem utilizar o helper `createPortalMetadata` (em `apps/web/lib/metadata.ts`) para injetar descrições específicas e contextualizadas do município, palavras-chave e URLs canônicas (`alternates.canonical`).

**Given** links de páginas do portal compartilhados em redes sociais (WhatsApp, Twitter/X, LinkedIn, Facebook)
**When** o preview do link for processado pelo leitor de prévias
**Then** as meta tags Open Graph (`og:title`, `og:description`, `og:url`, `og:siteName`, `og:locale`, `og:type`, `og:image`) e Twitter Cards (`card: "summary_large_image"`, `title`, `description`, `images`) devem ser populadas dinamicamente refletindo a seção atual e a entidade municipal (`portalConfig.displayName`).
**And** a aplicação deve conter fallback de imagens Open Graph adequados.

**Given** robôs e buscadores solicitando diretivas e mapa de URLs do portal
**When** requisitarem `GET /robots.txt` e `GET /sitemap.xml`
**Then** a rota nativa `apps/web/app/robots.ts` deve gerar o arquivo `robots.txt` permitindo indexação pública (`User-agent: *`, `Allow: /`) e referenciando a URL absoluta do `sitemap.xml`.
**And** a rota nativa `apps/web/app/sitemap.ts` deve gerar um `sitemap.xml` dinâmico contendo a raiz (`/`), rotas estáticas (`/llms.txt`, `/llms-full.txt`), e todas as rotas multi-tenant dinâmicas obtidas via `getEntidades()` (`/[portalSlug]`, `/[portalSlug]/despesas`, `/[portalSlug]/receitas`, `/[portalSlug]/orcamento`, `/[portalSlug]/licitacoes`, `/[portalSlug]/pessoal`, `/[portalSlug]/caprem`, `/[portalSlug]/saude`) com `lastModified` dinâmico e prioridades semânticas.

**Given** a execução da suíte de validação e verificação de integridade
**When** forem executados os comandos `make test`, `make test/ts` e `pnpm build`
**Then** todas as suítes de testes fiscais (dbt/Python), tipagem estática (TypeScript/Kysely) e a compilação de produção do Next.js devem rodar e passar com 100% de sucesso sem warnings ou erros de compilação.

## Contexto da Epic e Valor

- A Epic 4 foca em aperfeiçoar a experiência do portal TransparenciaWeb através de excelência visual, responsividade mobile, otimização para IA/LLMs e SEO.
- A Story 4.5 introduziu suporte a leitura estruturada para LLMs via `/llms.txt`, `/llms-full.txt` e JSON-LD (`Schema.org`).
- A Story 4.6 completa a estratégia de descoberta pública garantindo que buscadores tradicionais (Google, Bing) e redes sociais (WhatsApp, X, LinkedIn) indexem e exibam o portal com cartões de prévia atraentes e sitemap sempre atualizado com as entidades municipais cadastradas.

## Guardrails Arquiteturais Obrigatórios

### AD-5 e Multi-tenant
1. O parâmetro `portalSlug` deve ser utilizado para construir URLs canônicas (`alternates.canonical`) e URLs de Open Graph dinâmicas (`https://[domain]/[portalSlug]/despesas`).
2. O helper `createPortalMetadata` em `apps/web/lib/metadata.ts` deve continuar utilizando `getCachedPortalConfig(portalSlug)` com o React `cache()` para evitar requisições redundantes ao banco durante a renderização de metadados.

### AGENTS.md e Protocolos de Qualidade
1. **Nomes Explícitos**: Nenhuma abreviação opaca (ex: `desc`, `kw`, `og`, `url`). Utilizar `portalDescription`, `portalKeywords`, `openGraphMetadata`, `canonicalUrl`.
2. **Programação Funcional**: Manter imutabilidade na geração de objetos de metadados.
3. **Versões Pinned**: Utilizar os tipos nativos do Next.js Metadata API (`import type { Metadata, MetadataRoute } from "next"`). Nenhuma inclusão de bibliotecas externas de SEO desnecessárias.
4. **Validação Estrita**: `make test` (Python/dbt), `make test/ts` (TypeScript/Kysely) e `pnpm build` devem ser executados e aprovados com 100% de sucesso.

## Aprendizados das Stories Anteriores (4.1 a 4.5)

- **Story 4.1**: Configuração de ícones (`icons`) em `apps/web/app/layout.tsx` foi estabelecida. Manter intacta ao atualizar o `metadata` raiz.
- **Story 4.2**: O template de título `title: { default: "TransparenciaWeb", template: "TransparenciaWeb - %s" }` foi criado no RootLayout. `createPortalMetadata` retorna `title: ${pageTitle} | ${portalDisplayName}`.
- **Story 4.5**: As rotas estáticas `/llms.txt` e `/llms-full.txt` foram criadas em `apps/web/public/`. Devem ser incluídas no `sitemap.ts`.
- **Bibliotecas e Funções**: `@transparencia/db` expõe `getEntidades()` que retorna a lista de todas as entidades cadastradas (útil para iterar sobre slugs no `sitemap.ts`).

---

## Tasks / Subtasks

- [x] **Task 1: Refatoração e Enriquecimento de `apps/web/lib/metadata.ts`** (AC: #1, #2)
  - [x] Atualizar `createPortalMetadata(pageTitle: string, portalSlug: string, options?: { description?: string; path?: string; keywords?: string[] }): Promise<Metadata>` em `apps/web/lib/metadata.ts`.
  - [x] Gerar dynamic `description` contextualizada com a prefeitura e a tela atual (ex: `"Consulta pública de Despesas do município de Porciúncula - TransparenciaWeb"`).
  - [x] Adicionar `openGraph` completo (`title`, `description`, `url`, `siteName: "TransparenciaWeb"`, `locale: "pt_BR"`, `type: "website"`).
  - [x] Adicionar `twitter` (`card: "summary_large_image"`, `title`, `description`).
  - [x] Configurar `alternates.canonical` para a URL completa da página.
  - [x] Manter fallbacks seguros quando `portalConfig` for nulo (`"Prefeitura de Porciúncula"`).

- [x] **Task 2: Atualização dos Metadados Globais no `RootLayout` (`apps/web/app/layout.tsx`)** (AC: #1, #2)
  - [x] Atualizar o objeto `metadata: Metadata` em `apps/web/app/layout.tsx`.
  - [x] Adicionar `metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://transparencia.porciuncula.rj.gov.br")`.
  - [x] Adicionar `description`, `keywords` globais (transparência pública, contas públicas, despesas, receitas, orçamentos, municipal), `authors`, `creator`, `publisher`.
  - [x] Configurar `robots: { index: true, follow: true, googleBot: { index: true, follow: true } }`.
  - [x] Manter intactos o `title.template` e `icons`.

- [x] **Task 3: Atualização das 8 Rotas Principais em `apps/web/app/[portalSlug]`** (AC: #1, #2)
  - [x] Atualizar `generateMetadata` em `apps/web/app/[portalSlug]/page.tsx` ("Visão Geral").
  - [x] Atualizar `generateMetadata` em `apps/web/app/[portalSlug]/despesas/page.tsx` ("Despesas").
  - [x] Atualizar `generateMetadata` em `apps/web/app/[portalSlug]/receitas/page.tsx` ("Receitas").
  - [x] Atualizar `generateMetadata` em `apps/web/app/[portalSlug]/orcamento/page.tsx` ("Orçamento").
  - [x] Atualizar `generateMetadata` em `apps/web/app/[portalSlug]/licitacoes/page.tsx` ("Licitações").
  - [x] Atualizar `generateMetadata` em `apps/web/app/[portalSlug]/pessoal/page.tsx` ("Pessoal").
  - [x] Atualizar `generateMetadata` em `apps/web/app/[portalSlug]/caprem/page.tsx` ("CAPREM").
  - [x] Atualizar `generateMetadata` em `apps/web/app/[portalSlug]/saude/page.tsx` ("Saúde").
  - [x] Garantir que cada rota passe parâmetros com descrições semânticas ricas e o `path` correto.

- [x] **Task 4: Criar Rota Nativa `robots.ts` em `apps/web/app/robots.ts`** (AC: #3)
  - [x] Criar arquivo `apps/web/app/robots.ts` exportando `default function robots(): MetadataRoute.Robots`.
  - [x] Definir `rules: { userAgent: "*", allow: "/", disallow: ["/api/"] }`.
  - [x] Definir `sitemap: `${baseUrl}/sitemap.xml``.

- [x] **Task 5: Criar Rota Nativa `sitemap.ts` em `apps/web/app/sitemap.ts`** (AC: #3)
  - [x] Criar arquivo `apps/web/app/sitemap.ts` exportando `default async function sitemap(): Promise<MetadataRoute.Sitemap>`.
  - [x] Buscar todas as entidades ativas chamando `getEntidades()` do pacote `@transparencia/db`.
  - [x] Mapear as URLs base (`/`, `/llms.txt`, `/llms-full.txt`).
  - [x] Para cada entidade/portalSlug, mapear as 8 rotas (`/[portalSlug]`, `/despesas`, `/receitas`, `/orcamento`, `/licitacoes`, `/pessoal`, `/caprem`, `/saude`).
  - [x] Definir `lastModified: new Date()`, `changeFrequency` (`daily` / `weekly`) e `priority` correspondente (1.0 para home, 0.9 para portal, 0.8 para subpáginas).

- [x] **Task 6: Validação de Qualidade e Gates de Integridade** (AC: #4)
  - [x] Executar a suíte de testes dbt/Python via `make test`.
  - [x] Executar a suíte de testes TypeScript via `make test/ts`.
  - [x] Executar o build de produção via `pnpm build`.
  - [x] Verificar a geração estática dos arquivos `/robots.txt` e `/sitemap.xml`.

### Review Findings

- [x] [Review][Patch] Fallback de domínio inconsistente e erro de digitação em layout.tsx ("transparenciawebweb.com") e robots.ts ("transparenciaweb.com") [apps/web/app/layout.tsx:18, apps/web/app/robots.ts:5]
- [x] [Review][Patch] Sitemap estático sem chamada assíncrona a getEntidades() para rotas dinâmicas de portais municipais [apps/web/app/sitemap.ts:1,32]
- [x] [Review][Patch] Ausência de propriedade images em openGraph e twitter nos helpers de metadados [apps/web/lib/metadata.ts:48-60, apps/web/app/layout.tsx:44-59]
- [x] [Review][Patch] Normalização de trailing slash em NEXT_PUBLIC_APP_URL [apps/web/lib/metadata.ts:25, apps/web/app/robots.ts:5, apps/web/app/sitemap.ts:6, apps/web/app/layout.tsx:17]
- [x] [Review][Patch] Normalização de leading slash em options.path em createPortalMetadata [apps/web/lib/metadata.ts:27-29]
- [x] [Review][Patch] Validação de array vazio em options.keywords para evitar sobrescrever palavras-chave default [apps/web/lib/metadata.ts:37]
- [x] [Review][Defer] Nomes de métricas abreviados e loops imperativos pré-existentes em pacotes de queries Kysely e modelos dbt [packages/db/src/queries/licitacoes-metrics.ts:262] — deferred, pre-existing

---

## Dev Notes

### Especificação dos Arquivos a Criar e Modificar

1. **`apps/web/lib/metadata.ts`** (UPDATE)
   ```typescript
   import { getPortalConfig } from "@transparencia/db";
   import type { Metadata } from "next";
   import { cache } from "react";

   export const getCachedPortalConfig = cache(async (portalSlug: string) => {
     return getPortalConfig(portalSlug);
   });

   interface CreateMetadataOptions {
     description?: string;
     path?: string;
     keywords?: string[];
   }

   export async function createPortalMetadata(
     pageTitle: string,
     portalSlug: string,
     options?: CreateMetadataOptions
   ): Promise<Metadata> {
     const portalConfig = await getCachedPortalConfig(portalSlug);
     const portalDisplayName = portalConfig?.displayName?.trim() || "Prefeitura de Porciúncula";
     const fullTitle = `${pageTitle} | ${portalDisplayName}`;
     const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://transparencia.porciuncula.rj.gov.br";
     const pagePath = options?.path ? `/${portalSlug}${options.path}` : `/${portalSlug}`;
     const canonicalUrl = `${baseUrl}${pagePath}`;
     const defaultDescription = `Dados de transparência pública municipal de ${portalDisplayName}. Consulta de ${pageTitle.toLowerCase()}, dados orçamentários e prestação de contas.`;
     const finalDescription = options?.description || defaultDescription;

     return {
       title: pageTitle,
       description: finalDescription,
       keywords: options?.keywords || [
         "transparência pública",
         "porciúncula",
         portalDisplayName,
         pageTitle.toLowerCase(),
         "contas públicas",
         "prestação de contas",
       ],
       alternates: {
         canonical: canonicalUrl,
       },
       openGraph: {
         title: fullTitle,
         description: finalDescription,
         url: canonicalUrl,
         siteName: "TransparenciaWeb",
         locale: "pt_BR",
         type: "website",
       },
       twitter: {
         card: "summary_large_image",
         title: fullTitle,
         description: finalDescription,
       },
     };
   }
   ```

2. **`apps/web/app/layout.tsx`** (UPDATE)
   Atualizar a constante `metadata`:
   ```typescript
   const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://transparencia.porciuncula.rj.gov.br";

   export const metadata: Metadata = {
     metadataBase: new URL(baseUrl),
     title: {
       default: "TransparenciaWeb",
       template: "TransparenciaWeb - %s",
     },
     description: "Portal de Transparência Pública Municipal - Consulta de despesas, receitas, orçamentos, licitações, pessoal e previdência pública.",
     keywords: [
       "transparência pública",
       "portal de transparência",
       "contas públicas",
       "gestão fiscal",
       "município",
       "porciúncula",
     ],
     authors: [{ name: "TransparenciaWeb" }],
     creator: "TransparenciaWeb",
     publisher: "TransparenciaWeb",
     robots: {
       index: true,
       follow: true,
       googleBot: {
         index: true,
         follow: true,
         "max-video-preview": -1,
         "max-image-preview": "large",
         "max-snippet": -1,
       },
     },
     icons: {
       icon: [
         { url: "/favicon.svg", type: "image/svg+xml" },
         { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
       ],
       apple: [{ url: "/favicon-180.png", sizes: "180x180", type: "image/png" }],
     },
   };
   ```

3. **`apps/web/app/robots.ts`** (NOVO)
   ```typescript
   import type { MetadataRoute } from "next";

   export default function robots(): MetadataRoute.Robots {
     const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://transparencia.porciuncula.rj.gov.br";

     return {
       rules: {
         userAgent: "*",
         allow: "/",
         disallow: ["/api/"],
       },
       sitemap: `${baseUrl}/sitemap.xml`,
     };
   }
   ```

4. **`apps/web/app/sitemap.ts`** (NOVO)
   ```typescript
   import { getEntidades } from "@transparencia/db";
   import type { MetadataRoute } from "next";

   export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
     const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://transparencia.porciuncula.rj.gov.br";
     const currentDate = new Date();

     const staticRoutes: MetadataRoute.Sitemap = [
       {
         url: `${baseUrl}`,
         lastModified: currentDate,
         changeFrequency: "daily",
         priority: 1.0,
       },
       {
         url: `${baseUrl}/llms.txt`,
         lastModified: currentDate,
         changeFrequency: "weekly",
         priority: 0.5,
       },
       {
         url: `${baseUrl}/llms-full.txt`,
         lastModified: currentDate,
         changeFrequency: "weekly",
         priority: 0.5,
       },
     ];

     const entidades = await getEntidades();
     const subRoutes = [
       { path: "", priority: 0.9, changeFrequency: "daily" as const },
       { path: "/despesas", priority: 0.8, changeFrequency: "daily" as const },
       { path: "/receitas", priority: 0.8, changeFrequency: "daily" as const },
       { path: "/orcamento", priority: 0.8, changeFrequency: "weekly" as const },
       { path: "/licitacoes", priority: 0.8, changeFrequency: "daily" as const },
       { path: "/pessoal", priority: 0.8, changeFrequency: "monthly" as const },
       { path: "/caprem", priority: 0.8, changeFrequency: "monthly" as const },
       { path: "/saude", priority: 0.8, changeFrequency: "weekly" as const },
     ];

     const dynamicRoutes: MetadataRoute.Sitemap = entidades.flatMap((entidade) => {
       const slug = entidade.portalSlug;
       return subRoutes.map((sub) => ({
         url: `${baseUrl}/${slug}${sub.path}`,
         lastModified: currentDate,
         changeFrequency: sub.changeFrequency,
         priority: sub.priority,
       }));
     });

     return [...staticRoutes, ...dynamicRoutes];
   }
   ```

---

## Dev Agent Record

### Agent Model Used
Gemini 3.6 Flash (Antigravity CLI)

### Debug Log References
- `make test`: 83 passed em 21.57s
- `pnpm test`: 16 passed em `@transparencia/db`
- `pnpm build`: 3 packages compilados com sucesso (Next.js 16.2.11 Turbopack static export de `/robots.txt` e `/sitemap.xml`)

### Completion Notes List
- Helper `createPortalMetadata` em `apps/web/lib/metadata.ts` enriquecido para aceitar opções de descrição, caminho canônico (`alternates.canonical`), palavras-chave e metadados completos Open Graph e Twitter Cards.
- `apps/web/app/layout.tsx` (RootLayout) atualizado com `metadataBase`, `description`, `keywords`, `robots` e `openGraph` padrão.
- As 8 rotas em `apps/web/app/[portalSlug]` (Visão Geral, Despesas, Receitas, Orçamento, Licitações, Pessoal, CAPREM, Saúde) atualizadas para passar descrições semânticas ricas e o `path` correspondente ao `createPortalMetadata`.
- Arquivo `apps/web/app/robots.ts` criado exportando handler nativo do Next.js para gerar `robots.txt` apontando para o sitemap.
- Arquivo `apps/web/app/sitemap.ts` criado exportando handler nativo do Next.js para gerar `sitemap.xml` dinâmico com URLs estáticas e rotas multi-tenant por entidade.
- Suítes de validação `make test`, `pnpm test` e `pnpm build` executadas e aprovadas com 100% de sucesso.

### File List
- `apps/web/lib/metadata.ts` (UPDATE)
- `apps/web/app/layout.tsx` (UPDATE)
- `apps/web/app/[portalSlug]/page.tsx` (UPDATE)
- `apps/web/app/[portalSlug]/despesas/page.tsx` (UPDATE)
- `apps/web/app/[portalSlug]/receitas/page.tsx` (UPDATE)
- `apps/web/app/[portalSlug]/orcamento/page.tsx` (UPDATE)
- `apps/web/app/[portalSlug]/licitacoes/page.tsx` (UPDATE)
- `apps/web/app/[portalSlug]/pessoal/page.tsx` (UPDATE)
- `apps/web/app/[portalSlug]/caprem/page.tsx` (UPDATE)
- `apps/web/app/[portalSlug]/saude/page.tsx` (UPDATE)
- `apps/web/app/robots.ts` (NEW)
- `apps/web/app/sitemap.ts` (NEW)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (UPDATE)
- `_bmad-output/implementation-artifacts/4-6-seo-basico-meta-tags-open-graph-sitemap-e-robots.md` (UPDATE)

