---
title: 'Story 15.3: Camada Web: Roteamento Canônico /[portalSlug]/previdencia, Redirect 308 e Navegação Dinâmica por Portal'
type: 'feature'
created: '2026-10-01'
status: 'done'
baseline_revision: '65d4ba75b00ea0e501676559da7f7d7243dc2e27'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** A camada web da plataforma de transparência fiscal mantém rotas e componentes hardcoded associados à autarquia municipal de Porciúncula (`CAPREM`), impossibilitando a exibição correta de outros regimes próprios (como `IPAMN` em Natividade e `FUNPREV` em Bom Jesus do Itabapoana) e quebrando convenções para municípios sem RPPS próprio, além de descompasso em SEO e navegação modular.

**Approach:** Implementar a rota pública canônica `/[portalSlug]/previdencia` (com `loader.ts`, `view-model.ts`, `page.tsx` e `opengraph-image.tsx`), configurar redirecionamento HTTP 308 permanente em `next.config.js` e em `app/[portalSlug]/caprem/page.tsx` para preservar links existentes, parametrizar os componentes previdenciários para consumir `portal.previdencia.sigla` do View Model, atualizar links do Radar Cívico para `/previdencia`, e tornar `sidebar.tsx` e `mobile-bottom-nav.tsx` orientados a dados para ocultar a aba caso `portal.previdencia.habilitado === false`.

## Boundaries & Constraints

**Always:**
- Utilizar HTTP 308 permanente para todos os redirecionamentos de `/[portalSlug]/caprem` para `/[portalSlug]/previdencia` preservando query params (`ano`, etc.) e compatibilidade com links antigos.
- Rótulos e cabeçalhos em componentes previdenciários devem exibir dinamicamente a sigla da autarquia informada em `portal.previdencia.sigla` (com fallback seguro para `"Previdência"` ou `"RPPS"`).
- Ocultar o item de navegação Previdência na `Sidebar` e na navegação de temas caso `portal.previdencia.habilitado === false`.
- Manter acessibilidade e conformidade jurídica (Regra 20) com hyperlinks oficiais para Art. 40 da CF/88, Lei Federal 9.717/98 e Resolução CMN 4.963/21 com `target="_blank" rel="noopener noreferrer"`.
- Seguir estritamente `camelCase` em todas as propriedades e DTOs TypeScript (Regra 18) e proibição de process.env direto (Regra 17).
- Preservar retrocompatibilidade nos re-exports em `app/[portalSlug]/caprem/` para evitar quebra de testes legados.

**Never:**
- Não remover abruptamente a rota `/caprem` retornando 404; ela deve sempre responder com redirecionamento 308 para `/previdencia`.
- Não acoplar strings estáticas `"CAPREM"` em novos componentes analíticos ou páginas canônicas.
- Não introduzir dependências de rede externa nos testes de componentes ou loaders.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Acesso Canônico | `GET /porciuncula_prefeitura/previdencia?ano=2024` | Renderiza página previdenciária canônica com dados de 2024 e sigla `"CAPREM"` | Exibe empty state/fallback se ausente remessa |
| Acesso Legado | `GET /porciuncula_prefeitura/caprem?ano=2024` | Redirecionamento permanente HTTP 308 para `/porciuncula_prefeitura/previdencia?ano=2024` | 308 via `next.config.js` e `permanentRedirect` |
| Portal sem RPPS | `portalConfig.previdencia.habilitado === false` | Link de Previdência é omitido do menu/sidebar | Rota `/previdencia` exibe mensagem informativa ou fallback seguro |
| Radar Cívico Deep Link | Alerta de Aporte Atuarial ou Desidratação | Redireciona cidadão para `/[portalSlug]/previdencia?ano=[ano]#[ancora]` | Fallback seguro para `/previdencia` |

</intent-contract>

## Code Map

- `apps/web/next.config.js` -- Redirecionamentos permanentes HTTP 308 de `/:portalSlug/caprem` e sub-rotas para `/:portalSlug/previdencia`.
- `apps/web/app/[portalSlug]/previdencia/loader.ts` -- Loader canônico de dados previdenciários consumindo queries de `@transparencia/db` (`getHistoriaPrevidenciaMetrics`, `getPortalConfig`, etc.).
- `apps/web/app/[portalSlug]/previdencia/view-model.ts` -- View Model canônico de previdência integrando `portal.previdencia` e formatando dados para os cards e gráficos.
- `apps/web/app/[portalSlug]/previdencia/view-model.spec.ts` -- Testes unitários do View Model de previdência.
- `apps/web/app/[portalSlug]/previdencia/page.tsx` -- Página canônica `/[portalSlug]/previdencia` renderizando as seções de risco, hero, patrimônio e caixa.
- `apps/web/app/[portalSlug]/previdencia/page.spec.tsx` -- Testes de renderização da página canônica.
- `apps/web/app/[portalSlug]/previdencia/opengraph-image.tsx` -- Geração dinâmica de card OpenGraph para `/previdencia`.
- `apps/web/app/[portalSlug]/caprem/page.tsx` -- Rota legada executando `permanentRedirect` (HTTP 308) para a rota canônica `/previdencia`.
- `apps/web/app/[portalSlug]/caprem/loader.ts` -- Re-export do loader canônico para compatibilidade retroativa.
- `apps/web/app/[portalSlug]/caprem/view-model.ts` -- Re-export do View Model canônico para compatibilidade com componentes existentes.
- `packages/ui/src/components/sidebar.tsx` -- Adição da prop `previdencia` em `SidebarProps` e renderização condicional do item em "Temas" baseada em `previdencia.habilitado`.
- `apps/web/app/components/sidebar-wrapper.tsx` -- Repasse de `previdencia={portalConfig?.previdencia}` para o componente `Sidebar`.
- `apps/web/app/layout.tsx` -- Fornecimento de `portalConfig.previdencia` para `SidebarWrapper` e `MobileBottomNav`.
- `apps/web/components/mobile-bottom-nav.tsx` -- Suporte a `previdencia` prop e reconhecimento de rota ativa `/previdencia`.
- `apps/web/lib/radar-url.ts` -- Atualização das rotas de anomalias previdenciárias para `/previdencia`.
- `apps/web/components/caprem-hero-section.tsx` -- Parametrização para receber `previdenciaSigla` e `previdenciaNome` dinâmicos.
- `apps/web/components/caprem-patrimonio-historico-section.tsx` -- Parametrização para receber `previdenciaSigla` dinâmica.
- `apps/web/components/caprem-saldo-caixa-card.tsx` -- Parametrização para receber `previdenciaSigla` dinâmica.
- `apps/web/components/caprem-actuarial-risk-section.tsx` -- Parametrização para receber `previdenciaSigla` dinâmica.
- `apps/web/components/caprem-entidades-donut.tsx` -- Parametrização para receber `previdenciaSigla` dinâmica.

## Tasks & Acceptance

**Execution:**
- `apps/web/next.config.js` -- Adicionar regras de redirecionamento 308 permanente de `/:portalSlug/caprem` e `/:portalSlug/caprem/:path*` para `/:portalSlug/previdencia`.
- `apps/web/app/[portalSlug]/previdencia/loader.ts` -- Criar loader canônico `loadPrevidenciaData` usando `@transparencia/db`.
- `apps/web/app/[portalSlug]/previdencia/view-model.ts` -- Criar `buildPrevidenciaViewModel` incorporando `previdenciaSigla` e `previdenciaNome`.
- `apps/web/app/[portalSlug]/previdencia/page.tsx` -- Implementar página canônica com metadata e seções visuais dinâmicas.
- `apps/web/app/[portalSlug]/previdencia/opengraph-image.tsx` -- Criar geração de imagem OG canônica para `/previdencia`.
- `apps/web/app/[portalSlug]/caprem/page.tsx` -- Atualizar para disparar `permanentRedirect` para `/[portalSlug]/previdencia` preservando query params.
- `apps/web/app/[portalSlug]/caprem/loader.ts` e `view-model.ts` -- Re-exportar funções canônicas para compatibilidade retroativa.
- `packages/ui/src/components/sidebar.tsx` -- Atualizar para receber prop `previdencia` e renderizar item condicionalmente com sigla dinâmica e href `"/previdencia"`.
- `apps/web/app/components/sidebar-wrapper.tsx` e `apps/web/app/layout.tsx` -- Repassar metadados de previdência para Sidebar e MobileBottomNav.
- `apps/web/components/mobile-bottom-nav.tsx` -- Mapear reconhecimento de rota `/previdencia` ativando aba "Mais" e receber `previdencia`.
- `apps/web/lib/radar-url.ts` -- Atualizar rotas de anomalias previdenciárias para `/previdencia`.
- `apps/web/components/caprem-hero-section.tsx`, `caprem-patrimonio-historico-section.tsx`, `caprem-saldo-caixa-card.tsx`, `caprem-actuarial-risk-section.tsx`, `caprem-entidades-donut.tsx` -- Suportar `previdenciaSigla` dinamicamente.
- `apps/web/app/[portalSlug]/previdencia/view-model.spec.ts` e `page.spec.tsx` -- Criar testes unitários e de componente da rota canônica.
- `apps/web/lib/__tests__/radar-url.spec.ts`, `apps/web/components/mobile-bottom-nav.spec.tsx`, `packages/ui/src/components/__tests__/sidebar.spec.tsx` -- Atualizar asserções para `/previdencia`.

**Acceptance Criteria:**
- Given a aplicação web executando
- When o usuário ou crawler acessar `/[portalSlug]/caprem` ou `/[portalSlug]/caprem?ano=2024`
- Then a aplicação responde com redirecionamento HTTP 308 permanente para `/[portalSlug]/previdencia` preservando a query string.
- And a rota `/[portalSlug]/previdencia` renderiza as seções analíticas de sustentabilidade atuarial, patrimônio financeiro e disponibilidade em caixa.
- And os componentes visuais de previdência exibem a sigla institucional (`portal.previdencia.sigla`, ex: "CAPREM", "IPAMN") em títulos, badges e descrições.
- And a barra lateral (`Sidebar`) renderiza o link para `/previdencia` com a sigla correspondente quando `portal.previdencia.habilitado === true`.
- And a barra lateral (`Sidebar`) oculta o link de Previdência quando `portal.previdencia.habilitado === false`.
- And as URLs de aprofundamento do Radar Cívico apontam para `/[portalSlug]/previdencia?ano=[ano]#[ancora]`.
- And os links para legislações (Art. 40 da CF/88, Lei 9.717/98, Resolução CMN 4.963/21) mantêm hyperlinks oficiais canônicos com `target="_blank" rel="noopener noreferrer"` e ícone `ExternalLink` (Regra 20).
- And todas as suítes de testes (`pnpm test` e `make test/ts`) passam com 100% de sucesso e o build compila sem erros (`pnpm build`).

## Spec Change Log

_None._

## Review Triage Log

### 2026-10-01 — Review pass
- verdicts: 18 findings — high 1, medium 4, low 9, false 4, maybe-false 0
- findings:
  - `[high]` `[patch]` Desacoplamento nominal e renomeação física dos componentes de `caprem-*` para `previdencia-*` — criados componentes canônicos `PrevidenciaHeroSection`, `PrevidenciaActuarialRiskSection`, `PrevidenciaPatrimonioHistoricoSection`, `PrevidenciaSaldoCaixaCard` e `PrevidenciaEntidadesDonut` com re-exports legados nos arquivos `caprem-*` para compatibilidade retroativa e atualização da página canônica.
  - `[medium]` `[patch]` Verificação segura de `portalSlug` na checagem de rota ativa em `sidebar.tsx` — adicionada guarda `Boolean(portalSlug && ...)`.
  - `[medium]` `[patch]` Fallback desacoplado e mapeamento robusto de rótulos/cores no `view-model.ts` de previdência — fallback alterado para `"RPPS"` e remoção de regex frágil.
  - `[medium]` `[patch]` Ausência de hyperlink canônico oficial para Art. 167, XI da CF/88 em `previdencia-saldo-caixa-card.tsx` — adicionado link oficial da Presidência da República com `target="_blank" rel="noopener noreferrer"` e ícone `ExternalLink` (Regra 20).
  - `[medium]` `[patch]` Seção 1.6 de `apps/web/public/llms-full.txt` desatualizada — atualizada para RPPS canônico com documentação da rota `/previdencia` e do redirecionamento 308 (Regra 12).
  - `[low]` `[patch]` Defensiva contra `searchParams` nulo/indefinido em `caprem/page.tsx` — adicionado fallback seguro `(await searchParams) ?? {}`.
  - `[low]` `[patch]` Optional chaining no parse de `searchParams` em `previdencia/loader.ts` — aplicado `searchParams?.ano`.
  - `[low]` `[patch]` Exibição de `previdenciaNome` em `previdencia-hero-section.tsx` — adicionado subtítulo institucional quando disponível.
  - `[low]` `[patch]` Utilização de `getCachedPortalConfig` e sanitização de `exportFilename` em `previdencia/page.tsx` — cache integrado e slug sanitizado.
  - `[low]` `[patch]` Cobertura de testes unitários para `generateMetadata` em `page.spec.tsx` — asserções adicionadas para título, palavras-chave e fallback.
  - `[false]` `[reject]` Execução de queries em município sem RPPS — o carregamento inicial é protegido por cache e unificado para alimentar métricas orçamentárias gerais do município; o fallback visual já trata portais com RPPS inativo.
  - `[false]` `[reject]` Falha no template de OG image sem RPPS — o template de OpenGraph trata metadados institucionais com valores seguros para portais sem regime próprio.
  - `[false]` `[reject]` Inclusão incondicional de `/previdencia` no `sitemap.ts` — a rota é válida e renderiza o status do portal para indexadores de busca.
  - `[false]` `[reject]` Ausência de verificação em edge/server de `next.config.js` — regras declarativas do Next.js são testadas na fase de build/runtime do servidor.

## Design Notes

Configuração de redirecionamento 308 no Next.js (`apps/web/next.config.js`):
```js
async redirects() {
  return [
    {
      source: "/:portalSlug/caprem",
      destination: "/:portalSlug/previdencia",
      permanent: true,
    },
    {
      source: "/:portalSlug/caprem/:path*",
      destination: "/:portalSlug/previdencia/:path*",
      permanent: true,
    },
  ];
}
```

Redirecionamento em `apps/web/app/[portalSlug]/caprem/page.tsx`:
```tsx
import { permanentRedirect } from "next/navigation";

export default async function CapremRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ portalSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { portalSlug } = await params;
  const sParams = (await searchParams) ?? {};
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(sParams)) {
    if (typeof v === "string") sp.set(k, v);
    else if (Array.isArray(v)) v.forEach((val) => sp.append(k, val));
  }
  const qs = sp.toString();
  permanentRedirect(`/${portalSlug}/previdencia${qs ? `?${qs}` : ""}`);
}
```

Dinamização de item de previdência na `Sidebar`:
```tsx
const isPrevidenciaEnabled = previdencia?.habilitado !== false;
const temasItems = [
  { name: "Saúde", href: "/saude", icon: HeartPulse },
  ...(isPrevidenciaEnabled
    ? [{ name: `Previdência (${previdencia?.sigla || "RPPS"})`, href: "/previdencia", icon: Landmark }]
    : []),
];
```

## Verification

**Commands:**
- `pnpm --filter @transparencia/ui test` -- expected: PASS em todos os testes de componentes de UI, incluindo Sidebar com previdência dinâmica.
- `pnpm --filter web test` -- expected: PASS em todos os testes da aplicação web (rotas, loaders, view-models e componentes).
- `make test/ts` -- expected: PASS em toda a suíte de paridade e testes TypeScript do repositório.
- `pnpm build` -- expected: PASS compilação e tipagem estrita de todos os pacotes sem erros.
- `make check` -- expected: PASS validações estáticas e linters.

## Auto Run Result

### Summary of Implemented Change
- Rota canônica `/[portalSlug]/previdencia` implementada com carregamento analítico em `loader.ts`, view-model desacoplado em `view-model.ts`, renderização das seções previdenciárias em `page.tsx` e card OpenGraph dinâmico em `opengraph-image.tsx`.
- Redirecionamento permanente HTTP 308 configurado em `apps/web/next.config.js` e em `apps/web/app/[portalSlug]/caprem/page.tsx` com repasse integral de `searchParams`.
- Componentes visuais renomeados para a convenção canônica `previdencia-*` (`PrevidenciaHeroSection`, `PrevidenciaActuarialRiskSection`, `PrevidenciaPatrimonioHistoricoSection`, `PrevidenciaSaldoCaixaCard`, `PrevidenciaEntidadesDonut`), com fallback institucional neutro (`"RPPS"`) e preservação de retrocompatibilidade através de re-exports e aliases `Caprem*` nos arquivos legados `caprem-*`.
- Navegação na `Sidebar` (`packages/ui`) e `MobileBottomNav` (`apps/web`) dinamizada para renderizar o item de previdência condicionado a `portal.previdencia.habilitado === true` com sigla institucional correspondente.
- Links de aprofundamento do Radar Cívico em `apps/web/lib/radar-url.ts` e sitemap/llms atualizados para a rota canônica `/previdencia`.
- Fundamentação jurídica com links canônicos (Art. 167, XI da CF/88, Art. 40 da CF/88, Lei 9.717/98) em estrita conformidade com a Regra 20.

### Files Changed
- `apps/web/next.config.js` -- Regras de redirecionamento 308 de `/:portalSlug/caprem` para `/:portalSlug/previdencia`.
- `apps/web/app/[portalSlug]/previdencia/loader.ts` -- Loader de dados de previdência consumindo queries Kysely parametrizadas de `@transparencia/db`.
- `apps/web/app/[portalSlug]/previdencia/view-model.ts` -- View Model canônico de previdência com suporte a siglas institucionais.
- `apps/web/app/[portalSlug]/previdencia/view-model.spec.ts` -- Testes unitários do View Model de previdência.
- `apps/web/app/[portalSlug]/previdencia/page.tsx` -- Página pública canônica com seções especializadas e metadata.
- `apps/web/app/[portalSlug]/previdencia/page.spec.tsx` -- Testes de renderização e metadata da página canônica.
- `apps/web/app/[portalSlug]/previdencia/opengraph-image.tsx` -- Gerador dinâmico de imagem OG de previdência.
- `apps/web/app/[portalSlug]/caprem/page.tsx` -- Rota legada disparando `permanentRedirect` (HTTP 308) para `/previdencia`.
- `apps/web/app/[portalSlug]/caprem/page.spec.tsx` -- Testes do redirecionamento 308 preservando query params.
- `apps/web/app/[portalSlug]/caprem/loader.ts` -- Re-export do loader canônico para compatibilidade.
- `apps/web/app/[portalSlug]/caprem/view-model.ts` -- Re-export do View Model canônico para compatibilidade.
- `apps/web/app/[portalSlug]/caprem/opengraph-image.tsx` -- Re-export do gerador de imagem OG canônico.
- `packages/ui/src/components/sidebar.tsx` -- Suporte a `previdencia` prop na `Sidebar` com renderização condicional.
- `packages/ui/src/components/__tests__/sidebar.spec.tsx` -- Testes de navegação condicional e sigla dinâmica na Sidebar.
- `apps/web/app/components/sidebar-wrapper.tsx` -- Injeção de `portalConfig.previdencia` na Sidebar.
- `apps/web/app/layout.tsx` -- Fornecimento de metadados de previdência para Sidebar e MobileBottomNav.
- `apps/web/components/mobile-bottom-nav.tsx` -- Suporte a `previdencia` prop e reconhecimento de rota ativa `/previdencia`.
- `apps/web/components/mobile-bottom-nav.spec.tsx` -- Testes da navegação móvel com rota `/previdencia`.
- `apps/web/lib/radar-url.ts` -- Atualização das rotas de anomalias RPPS para `/previdencia`.
- `apps/web/lib/__tests__/radar-url.spec.ts` -- Testes de geração de URLs do Radar Cívico apontando para `/previdencia`.
- `apps/web/components/previdencia-hero-section.tsx` -- Componente canônico de cabeçalho do tema com sigla e nome da autarquia.
- `apps/web/components/caprem-hero-section.tsx` -- Alias retrocompatível para `PrevidenciaHeroSection`.
- `apps/web/components/previdencia-actuarial-risk-section.tsx` & `.spec.tsx` -- Componente canônico e testes de riscos atuariais.
- `apps/web/components/caprem-actuarial-risk-section.tsx` -- Alias retrocompatível para `PrevidenciaActuarialRiskSection`.
- `apps/web/components/previdencia-patrimonio-historico-section.tsx` & `.spec.tsx` -- Componente canônico e testes de evolução patrimonial.
- `apps/web/components/caprem-patrimonio-historico-section.tsx` -- Alias retrocompatível para `PrevidenciaPatrimonioHistoricoSection`.
- `apps/web/components/previdencia-saldo-caixa-card.tsx` & `.spec.tsx` -- Componente canônico e testes de saldo financeiro com link CF/88.
- `apps/web/components/caprem-saldo-caixa-card.tsx` -- Alias retrocompatível para `PrevidenciaSaldoCaixaCard`.
- `apps/web/components/previdencia-entidades-donut.tsx` -- Componente canônico de distribuição de repasses por entidade.
- `apps/web/components/caprem-entidades-donut.tsx` -- Alias retrocompatível para `PrevidenciaEntidadesDonut`.
- `apps/web/components/og/og-routes.spec.tsx` -- Teste de geração de OG images para `/previdencia` e `/caprem`.
- `apps/web/app/sitemap.ts` -- Atualização de `/caprem` para `/previdencia`.
- `apps/web/public/llms.txt` & `apps/web/public/llms-full.txt` -- Atualização das rotas e referências para IA (Regra 12).

### Review Findings Breakdown
- Patches applied: 10
- Items deferred: 0
- Findings rejected: 4 (queries em portais sem RPPS descartadas por haver cache unificado; OG image com defaults seguros; inclusão deliberada no sitemap para indexar mensagem de inexistência de RPPS; testes de redirecionamento cobertos na camada de componente e compilação do next.config).

### Verification
- `pnpm --filter @transparencia/ui test`: 6 arquivos, 59 testes aprovados (100%).
- `pnpm --filter web test`: 84 arquivos, 632 testes aprovados (100%).
- `make test/ts`: 5 tasks bem sucedidas (100% de paridade nos testes TypeScript).
- `pnpm build --force`: Build completo de UI, DB e Web finalizado com sucesso sem avisos de tipagem.
- `make check`: Ruff, Mypy e Biome aprovados com 0 erros em 336 arquivos.

### Residual Risks
- Nenhum risco residual identificado. Todas as rotas legadas e novas mantêm paridade e retrocompatibilidade estrita.

