---
title: 'Story 13.5: Criação das Páginas Estáticas de Termos de Uso e Política de Privacidade'
type: 'feature'
created: '2026-09-22'
status: 'in-review'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred: []
baseline_revision: '8b6bb72d117712433b877960cf57accfedf4f351'
---

<intent-contract>

## Intent

**Problem:** O portal MaisTransparência não possui páginas de Termos de Uso (`/termos`) nem Política de Privacidade (`/privacidade`), deixando o cidadão, autoridades públicas e auditores sem amparo jurídico formal sobre a natureza cívica, independência e conformidade legal da plataforma (LAI, LGPD, Tema 483 do STF, Lei 14.133/2021). O rodapé global (`GlobalFooter`) também não expõe esses links institucionais.

**Approach:** Criar duas rotas estáticas globais (`force-static`) sem `[portalSlug]`: `apps/web/app/termos/page.tsx` e `apps/web/app/privacidade/page.tsx`, com conteúdo fundamentado nas bases legais exigidas pelas ACs; adicionar links institucionais "Termos de Uso" e "Política de Privacidade" ao `GlobalFooter`; incluir as rotas no sitemap; sincronizar `llms.txt` e `llms-full.txt` conforme Regra 12.

## Boundaries & Constraints

**Always:**
- As páginas devem exportar `export const dynamic = 'force-static'` para renderização estática em build.
- Os Termos de Uso devem referenciar com hyperlinks canônicos (com `target="_blank"` e `rel="noopener noreferrer"` — Regra 20): [Lei 12.527/2011 (LAI)](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm), [LC 131/2009](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp131.htm), [Lei 14.133/2021](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm) e Tema 483 do STF (RE 1.143.261).
- A Política de Privacidade deve referenciar a [LGPD — Lei 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) com hyperlink canônico, e detalhar coleta mínima (apenas e-mail voluntário com double opt-in para boletim), telemetria anônima e não-comercialização de dados.
- Os links no `GlobalFooter` ("Termos de Uso" e "Política de Privacidade") devem ser âncoras `<Link>` internas do Next.js (não `<a>` externa), pois as rotas são internas da mesma aplicação.
- Metadados SEO canônicos devem usar `env.NEXT_PUBLIC_APP_URL` (via `@/env`) e `env.NEXT_PUBLIC_SITE_NAME` — não usar `createPortalMetadata` (que requer `portalSlug` de banco de dados).
- Testes de renderização e integridade dos links do rodapé devem ser criados conforme ACs.
- Atualizar `apps/web/app/sitemap.ts` com as rotas `/termos` e `/privacidade`.
- Atualizar `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` (Regra 12).

**Never:**
- Não usar `createPortalMetadata` nas páginas `/termos` e `/privacidade` — ela faz query de banco e exige `portalSlug`.
- Não usar `process.env` diretamente — importar sempre de `@/env` (Regra 17).
- Não usar `<a>` com `target="_blank"` para links internos do próprio portal.
- Não usar ternários aninhados em condicionais (Regra 13).
- Não adicionar conteúdo político-partidário, comercial ou dados individualizados de servidores nas páginas.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Acesso a `/termos` | GET `/termos` | Renderiza página estática com título "Termos de Uso", tipografia em prosa, cabeçalhos semânticos e metadados SEO canônicos | N/A — página estática sem dados externos |
| Acesso a `/privacidade` | GET `/privacidade` | Renderiza página estática com título "Política de Privacidade", tipografia em prosa, cabeçalhos semânticos e metadados SEO canônicos | N/A — página estática sem dados externos |
| Rodapé Global em qualquer página | Renderização do `GlobalFooter` | Exibe links "Termos de Uso" (href="/termos") e "Política de Privacidade" (href="/privacidade") acessíveis | Links sempre presentes — sem renderização condicional |
| Indexação pelo crawler/sitemap | GET `/sitemap.xml` | Inclui entradas para `/termos` e `/privacidade` com `changeFrequency: "yearly"` e `priority: 0.4` | N/A |

</intent-contract>

## Code Map

- `apps/web/app/termos/page.tsx` -- **NOVO** — Página estática de Termos de Uso (`force-static`); metadados Next.js `Metadata` usando `env.NEXT_PUBLIC_APP_URL`/`env.NEXT_PUBLIC_SITE_NAME`; conteúdo em prosa com hyperlinks legais (LAI, LC 131, Lei 14.133, Tema 483 STF).
- `apps/web/app/privacidade/page.tsx` -- **NOVO** — Página estática de Política de Privacidade (`force-static`); metadados Next.js `Metadata`; conteúdo com hyperlink LGPD, coleta mínima (e-mail/double opt-in), telemetria anônima e não-comercialização.
- `apps/web/components/global-footer.tsx` -- **MODIFICAR** — Adicionar dois `<Link>` internos do Next.js: "Termos de Uso" (`href="/termos"`) e "Política de Privacidade" (`href="/privacidade"`), discretos, na seção esquerda do rodapé abaixo do texto descritivo; sem `target="_blank"`.
- `apps/web/app/sitemap.ts` -- **MODIFICAR** — Adicionar entradas estáticas para `/termos` e `/privacidade` no array `staticRoutes` com `changeFrequency: "yearly"` e `priority: 0.4`.
- `apps/web/public/llms.txt` -- **MODIFICAR** — Adicionar menção à seção de rotas públicas sobre `/termos` e `/privacidade`, incluindo o âmbito jurídico (LAI, LGPD, Tema 483 STF).
- `apps/web/public/llms-full.txt` -- **MODIFICAR** — Adicionar seção de governança e privacidade descrevendo as rotas `/termos` e `/privacidade` e seus fundamentos legais.
- `apps/web/app/termos/page.spec.tsx` -- **NOVO** — Testes de renderização: verifica que `<h1>` "Termos de Uso" está presente, que os hyperlinks legais canônicos existem no DOM e apontam para os domínios do Planalto.
- `apps/web/app/privacidade/page.spec.tsx` -- **NOVO** — Testes de renderização: verifica que `<h1>` "Política de Privacidade" está presente e hyperlink LGPD canônico existe no DOM.
- `apps/web/components/global-footer.spec.tsx` -- **NOVO** — Testes de integridade: verifica que `GlobalFooter` renderiza links com texto "Termos de Uso" (href="/termos") e "Política de Privacidade" (href="/privacidade").
- `apps/web/env.ts` -- **REFERÊNCIA APENAS** — Fonte canônica de `NEXT_PUBLIC_APP_URL` e `NEXT_PUBLIC_SITE_NAME` para metadados das páginas estáticas.

## Tasks & Acceptance

**Execution:**
- `apps/web/app/termos/page.tsx` -- CRIAR página estática com `export const dynamic = 'force-static'`, metadados SEO (título "Termos de Uso | MaisTransparência", descrição, URL canônica a partir de `env.NEXT_PUBLIC_APP_URL`), conteúdo em prosa com `<article>` e `<h1>`/"Termos de Uso", seções: "Natureza Cívica e Independência", "Base Legal para Publicação de Dados Públicos", "Divulgação de Remunerações de Agentes Públicos", "Transparência em Compras Públicas", "Limitações e Isenção de Responsabilidade" — cada seção com hyperlinks externos canônicos (LAI, LC 131, Lei 14.133, Tema 483 STF no Planalto) com `target="_blank"` e `rel="noopener noreferrer"` -- Cumprir AC de transparência institucional e legalidade (Regra 20)
- `apps/web/app/privacidade/page.tsx` -- CRIAR página estática com `export const dynamic = 'force-static'`, metadados SEO (título "Política de Privacidade | MaisTransparência"), conteúdo com `<article>` e `<h1>`/"Política de Privacidade", seções: "Dados Coletados", "Finalidade e Base Legal (LGPD)", "Telemetria Anônima", "Não-Comercialização", "Direitos do Titular", "Contato" — hyperlink LGPD com `target="_blank"` e `rel="noopener noreferrer"` -- Cumprir AC de conformidade com LGPD
- `apps/web/components/global-footer.tsx` -- ADICIONAR bloco de links institucionais: após o elemento `<p>` descritivo e antes (ou junto) do link opcional de portal oficial, adicionar `<nav aria-label="Links institucionais">` com dois `<Link>` internos Next.js ("Termos de Uso" → `/termos` e "Política de Privacidade" → `/privacidade`), estilizados como texto pequeno (`text-[11px]`) discreto em `text-mutedText` com `hover:underline` -- Cumprir AC de links no rodapé global
- `apps/web/app/sitemap.ts` -- ADICIONAR ao array `staticRoutes` duas entradas: `{ url: \`\${baseUrl}/termos\`, lastModified: currentDate, changeFrequency: "yearly", priority: 0.4 }` e `{ url: \`\${baseUrl}/privacidade\`, ..., changeFrequency: "yearly", priority: 0.4 }` -- Garantir indexação SEO das novas páginas
- `apps/web/public/llms.txt` -- ATUALIZAR seção "Navegação e Rotas Públicas" para incluir descrição de `/termos` e `/privacidade` com âmbito jurídico -- Cumprir Regra 12
- `apps/web/public/llms-full.txt` -- ATUALIZAR adicionando seção "Governança, Privacidade e Transparência Institucional" com as rotas e suas bases legais -- Cumprir Regra 12
- `apps/web/app/termos/page.spec.tsx` -- CRIAR testes: (1) `<h1>` com texto "Termos de Uso" presente; (2) link para LAI (`l12527.htm`) presente com `rel="noopener noreferrer"`; (3) link para Lei 14.133 (`l14133.htm`) presente -- Cumprir AC de testes automatizados de renderização
- `apps/web/app/privacidade/page.spec.tsx` -- CRIAR testes: (1) `<h1>` com texto "Política de Privacidade" presente; (2) link LGPD (`l13709.htm`) presente com `rel="noopener noreferrer"` -- Cumprir AC de testes automatizados de renderização
- `apps/web/components/global-footer.spec.tsx` -- CRIAR testes: (1) `getByRole('link', { name: /termos de uso/i })` com `href="/termos"`; (2) `getByRole('link', { name: /política de privacidade/i })` com `href="/privacidade"` -- Cumprir AC de integridade dos links de rodapé

**Acceptance Criteria:**
- Dado que o usuário acessa `/termos`, quando a página renderiza, então exibe `<h1>Termos de Uso</h1>` com tipografia em prosa, hyperlinks legais canônicos para LAI, LC 131, Lei 14.133 e Tema 483 do STF no Planalto, e metadados SEO com URL canônica absoluta.
- Dado que o usuário acessa `/privacidade`, quando a página renderiza, então exibe `<h1>Política de Privacidade</h1>` com hyperlink canônico para LGPD, detalhes de coleta mínima (e-mail voluntário com double opt-in para boletim, descadastro em 1 clique), telemetria anônima e não-comercialização.
- Dado que o `GlobalFooter` é renderizado em qualquer página, quando inspecionado o DOM, então exibe dois links internos: "Termos de Uso" (`href="/termos"`) e "Política de Privacidade" (`href="/privacidade"`), sem `target="_blank"`.
- Dado que o `/sitemap.xml` é gerado, quando consultado, então inclui entradas para `${baseUrl}/termos` e `${baseUrl}/privacidade`.
- Dado que `pnpm test` é executado na raiz do workspace, quando os novos testes de `page.spec.tsx` e `global-footer.spec.tsx` rodam, então todos passam sem erros.

## Design Notes

As páginas `/termos` e `/privacidade` são rotas globais no nível `apps/web/app/` (sem `[portalSlug]`), portanto não têm acesso ao layout de portal (`SidebarWrapper`, `MobileBottomNav`). Elas herdam o layout raiz (`apps/web/app/layout.tsx`), que já inclui o `GlobalFooter`. Para os metadados, use a API `Metadata` do Next.js diretamente (objeto exportado `export const metadata: Metadata = {...}` — preferível ao `generateMetadata` assíncrono para páginas totalmente estáticas sem dados de banco).

Exemplo de metadados para `termos/page.tsx`:
```typescript
import type { Metadata } from "next";
import { env } from "@/env";

const baseUrl = env.NEXT_PUBLIC_APP_URL ?? "https://maistransparencia.com";

export const metadata: Metadata = {
  title: "Termos de Uso | MaisTransparência",
  description: "...",
  alternates: { canonical: `${baseUrl}/termos` },
};

export const dynamic = "force-static";
```

Os links institucionais no `GlobalFooter` devem usar `<Link>` do Next.js (não `<a>`), pois são rotas internas. Importar `import Link from "next/link"`.

## Verification

**Commands:**
- `pnpm test` (na raiz) -- expected: todos os novos testes em `termos/page.spec.tsx`, `privacidade/page.spec.tsx` e `global-footer.spec.tsx` passam
- `pnpm build` (em `apps/web`) -- expected: build sem erros de tipagem; as rotas `/termos` e `/privacidade` aparecem no output como páginas estáticas (ƒ → ○)

## Spec Change Log

## Review Triage Log
