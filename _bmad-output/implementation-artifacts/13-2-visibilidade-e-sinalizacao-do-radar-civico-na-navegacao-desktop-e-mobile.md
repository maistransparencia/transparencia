---
title: 'Story 13.2: Visibilidade e Sinalização do Radar Cívico na Navegação Desktop e Mobile'
type: 'feature'
created: '2026-09-21'
status: 'done'
baseline_revision: 'cdad89cbf843bcad7102d5b43bde42def054ef74'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Cidadãos e auditores cívicos que acessam o portal não visualizam de imediato a existência de anomalias fiscais críticas ativas no exercício selecionado, a menos que rolem a homepage até a seção do Radar ou naveguem explicitamente até `/radar`.

**Approach:** Adicionar sinalizadores não-intrusivos e acessíveis nos pontos de navegação primária: no desktop (`Sidebar`), exibir um badge numérico (`🚨 <count>`) com indicador pontual em pulso suave (`motion-safe:animate-pulse`, respeitando `motion-reduce:animate-none`) ao lado do item "Radar Cívico"; no mobile (`MobileBottomNav`), exibir um dot de notificação discreto sobre o botão "Mais" (onde o Radar está aninhado), mantendo a Topbar limpa e alimentando a interface através de consulta atômica e leve no `@transparencia/db` (`getRadarAnomaliasCount`).

## Boundaries & Constraints

**Always:**
- Implementar a consulta atômica e indexada no PostgreSQL via Kysely em `packages/db/src/queries/radar-civico-alertas.ts`: `getRadarAnomaliasCount({ portalSlug, ano })` filtrando por severidade `'critico'`, e `getRadarAnomaliasCountByYear({ portalSlug })` para mapa consolidado sem re-consultas.
- Ocultar totalmente badges e indicadores visuais quando a contagem for igual a 0 ou indefinida para o exercício selecionado.
- Seguir o padrão estrito de acessibilidade WAI-ARIA: rótulo descritivo nos badges (`aria-label="${count} alertas críticos apurados"` e `aria-label="${count} alertas críticos no Radar"`), e respeito integral às preferências de acessibilidade (`motion-safe:animate-pulse`, `motion-reduce:animate-none`).
- Preservar a Topbar móvel limpa e sem ruídos, posicionando a sinalização móvel exclusivamente na aba "Mais" do `MobileBottomNav`.
- Respeitar todas as regras de `AGENTS.md`: lógica contábil/queries em `packages/db` (Regra 2), DTOs em `camelCase` (Regra 18), sem ternários aninhados (Regra 13).

**Never:**
- Proibido recalcular regras pesadas de anomalias em tempo real durante o SSR do layout base.
- Proibido exibir badges de contagem na Topbar móvel.
- Proibido manter badges visíveis com contagem zerada (`0`).
- Proibido utilizar cores alarmistas estridentes que quebrem o design system neutro da plataforma (utilizar estilos suaves compatíveis com `red-50`/`red-100`/`red-700`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Exercício com anomalias críticas (ex: 3 alertas) | `portalSlug = "porciuncula_prefeitura"`, `ano = 2024`, `count = 3` | Sidebar desktop exibe `🚨 3` com dot pulsante ao lado de "Radar Cívico"; MobileBottomNav exibe dot vermelho no botão "Mais". | No error expected |
| Exercício limpo sem anomalias críticas | `portalSlug = "porciuncula_prefeitura"`, `ano = 2026`, `count = 0` | Badges e dots permanecem 100% ocultos em desktop e mobile. | No error expected |
| Troca de ano via UI no cliente (ex: 2026 -> 2024) | Mudança no parâmetro `?ano=` em tempo de execução no browser | Contagem atualiza instantaneamente no client via dicionário `radarAlertsCountByYear` sem requisições adicionais. | Fallback para 0 se ano não constar |
| Slug ou portal inexistente / inválido | `portalSlug = ""` ou `null` | Query retorna `0` com segurança e componentes omitem indicadores. | Retorna 0 graciosamente |
| Redução de movimento ativada no SO | `prefers-reduced-motion: reduce` | Animações de pulso/ping desativadas (`motion-reduce:animate-none`), preservando indicador estático acessível. | No error expected |

</intent-contract>

## Code Map

- `packages/db/src/queries/radar-civico-alertas.ts` -- Implementar `getRadarAnomaliasCount({ portalSlug, ano })` e `getRadarAnomaliasCountByYear({ portalSlug })` realizando contagem atômica (`count(*)::int`) de severidade crítica.
- `packages/db/src/queries/__tests__/radar-civico-alertas.spec.ts` -- Testes unitários para `getRadarAnomaliasCount` e `getRadarAnomaliasCountByYear` cobrindo cenários com e sem ano, validação de slug e severidade.
- `packages/db/src/index.ts` -- Exportação pública de `getRadarAnomaliasCount` e `getRadarAnomaliasCountByYear`.
- `packages/ui/src/components/sidebar.tsx` -- Adicionar prop `radarAlertCount?: number` em `SidebarProps` e renderizar badge acessível com pulso sutil ao lado de "Radar Cívico".
- `packages/ui/src/components/__tests__/sidebar.spec.tsx` -- Testes unitários do componente `Sidebar` validando exibição do badge quando `radarAlertCount > 0`, ocultação quando `0` ou `undefined`, e `aria-label`.
- `apps/web/components/mobile-bottom-nav.tsx` -- Suportar `radarAlertCount` e `radarAlertsCountByYear` na prop `MobileBottomNavProps`, exibindo dot de notificação no botão "Mais" quando houver alertas ativos.
- `apps/web/components/mobile-bottom-nav.spec.tsx` -- Expandir testes unitários validando dot de notificação no botão "Mais" quando houver alertas e ausência quando zerado.
- `apps/web/app/components/sidebar-wrapper.tsx` -- Receber `radarAlertsCountByYear?: Record<number, number>` e calcular `radarAlertCount` reativo ao ano selecionado via `useQueryState("ano")`.
- `apps/web/app/layout.tsx` -- Carregar `radarAlertsCountByYear` no SSR via `unstable_cache` delegando para `getRadarAnomaliasCountByYear` e repassar para `SidebarWrapper` e `MobileBottomNav`.
- `apps/web/app/api/[portalSlug]/radar/count/route.ts` -- Endpoint HTTP GET leve com rate limit retornando `{ count: number }` para o portal e ano especificados.
- `apps/web/app/api/[portalSlug]/radar/count/count-route.spec.ts` -- Testes automatizados para a rota de API do contador do radar.

## Tasks & Acceptance

**Execution:**
- `packages/db/src/queries/radar-civico-alertas.ts` -- Adicionar funções `getRadarAnomaliasCount` e `getRadarAnomaliasCountByYear` -- Prover consulta atômica e de alto desempenho no Postgres com contagem de anomalias críticas.
- `packages/db/src/queries/__tests__/radar-civico-alertas.spec.ts` -- Criar testes unitários para as novas funções de contagem no DB -- Garantir confiabilidade e isolamento da camada de dados.
- `packages/ui/src/components/sidebar.tsx` -- Implementar prop `radarAlertCount` e badge numérico com indicador pontual pulsante acessível (`motion-safe:animate-pulse motion-reduce:animate-none`) -- Atender aos critérios de visibilidade e acessibilidade no menu desktop.
- `packages/ui/src/components/__tests__/sidebar.spec.tsx` -- Criar testes unitários para a Sidebar cobrindo os estados do badge do Radar Cívico -- Validar conformidade visual e acessibilidade.
- `apps/web/components/mobile-bottom-nav.tsx` -- Adicionar suporte a `radarAlertsCountByYear` e dot indicador no botão "Mais" -- Prover sinalização no mobile preservando a Topbar limpa.
- `apps/web/components/mobile-bottom-nav.spec.tsx` -- Adicionar casos de teste para o dot de alerta no botão "Mais" -- Validar renderização condicional do dot e labels acessíveis.
- `apps/web/app/components/sidebar-wrapper.tsx` -- Conectar `radarAlertsCountByYear` ao `Sidebar` reativo ao parâmetro `ano` -- Sincronizar contagem com o ano selecionado pelo usuário.
- `apps/web/app/layout.tsx` -- Integrar busca em cache de `radarAlertsCountByYear` no RootLayout e repassar aos componentes de navegação -- Garantir SSR ultra-rápido sem gargalos de latência.
- `apps/web/app/api/[portalSlug]/radar/count/route.ts` -- Criar route handler para `/api/[portalSlug]/radar/count` com suporte a query param `ano` -- Expor endpoint padronizado para consultas diretas.
- `apps/web/app/api/[portalSlug]/radar/count/count-route.spec.ts` -- Implementar testes automatizados da rota de API -- Validar validação de parâmetros e respostas corretas.

**Acceptance Criteria:**
- Given a existência de anomalias de severidade crítica apuradas para o exercício fiscal selecionado, when o usuário visualiza o menu lateral desktop (`Sidebar`), then exibe ao lado do item "Radar Cívico" um badge numérico com a quantidade de alertas críticos (ex: `🚨 3`) acompanhado de um indicador pontual com pulso sutil (`motion-safe:animate-pulse`, respeitando `motion-reduce:animate-none` para acessibilidade).
- Given o uso em dispositivo móvel com anomalias ativas, when o usuário visualiza a barra inferior (`MobileBottomNav`), then exibe um dot discreto de notificação no botão "Mais" e preserva a Topbar móvel limpa.
- Given um exercício fiscal sem anomalias críticas apuradas (contagem igual a 0), when o usuário navega pelo portal, then os badges e indicadores luminosos permanecem totalmente ocultos.
- Given a execução dos testes automatizados, when executado `pnpm --filter @transparencia/db test`, `pnpm --filter @transparencia/ui test` e `pnpm --filter web test`, then todos os testes passam com 100% de sucesso.

## Review Triage Log

### 2026-09-21 — Review pass
- verdicts: 15 findings — high 0, medium 5, low 7, false 3, maybe-false 0
- findings:
  - `[medium]` `[patch]` Remoção de emoji/ícone no badge do Radar Cívico a pedido do usuário — Action taken: Removido emoji 🚨 e ícone do badge em `packages/ui/src/components/sidebar.tsx`, mantendo o dot pulsante e o contador numérico em `tabular-nums`.
  - `[medium]` `[patch]` Sincronização obrigatória dos guias de consumo para IA (`apps/web/public/llms.txt` e `llms-full.txt`) para nova rota `/api/[portalSlug]/radar/count` (Regra 12) — Action taken: Atualizados os dois arquivos com documentação técnica e parâmetros da rota de contagem de anomalias do radar.
  - `[medium]` `[patch]` Ausência de tolerância a falhas e cascata no carregamento raiz de alertas (`apps/web/app/layout.tsx`) — Action taken: Envolvido `getRadarAnomaliasCountByYear` em `try/catch` com fallback para `{}`.
  - `[medium]` `[patch]` Validação frágil de parâmetro `ano`, falta de Cache-Control e try/catch na API de contagem (`apps/web/app/api/[portalSlug]/radar/count/route.ts`) — Action taken: Validado `ano` com retorno 400 Bad Request para entradas inválidas, adicionado cabeçalho `Cache-Control` e bloco `try/catch`.
  - `[low]` `[patch]` Parâmetro `ano` sem checagem de limites de 32 bits no PostgreSQL em `getRadarAnomaliasCount` (`packages/db/src/queries/radar-civico-alertas.ts:755`) — Action taken: Adicionada guarda `Math.abs(ano) > 2147483647` retornando 0.
  - `[low]` `[patch]` Condicional tautológica no carregamento de alertas em `apps/web/app/layout.tsx` (Regra 14) — Action taken: Removido o ternário redundante `portalSlug ? ... : {}`.
  - `[low]` `[patch]` Indicador luminoso visível sobre o botão "Fechar" no mobile (`apps/web/components/mobile-bottom-nav.tsx`) — Action taken: Adicionada guarda `!isMenuOpen` e teste unitário cobrindo o estado.
  - `[low]` `[patch]` Mutação imperativa de objeto acumulador no `.reduce` em `getRadarAnomaliasCountByYear` (`packages/db/src/queries/radar-civico-alertas.ts`) (Regra 2) — Action taken: Substituído por transformação pura com `Object.fromEntries(rows.map(...))`.
  - `[low]` `[patch]` Leitura redundante de acessibilidade para emoji em `packages/ui/src/components/sidebar.tsx` — Action taken: Resolvido diretamente com a remoção do emoji do badge.
  - `[low]` `[reject]` Duplicação de lógica de cálculo de alertas entre `sidebar-wrapper.tsx` e `mobile-bottom-nav.tsx` — Rejection reason: Lógica pontual e simples de 4 linhas específica de cada wrapper, sem necessidade de abstração prematura.
  - `[false]` `[reject]` Fallback incorreto quando `radarAlertsCountByYear` é um objeto vazio — Rejection reason: O mapa de alertas é o SSOT do layout para os anos apurados; anos ausentes possuem 0 alertas como esperado pelo design.
  - `[low]` `[reject]` Assinatura fixa exclusiva para severidade crítico em `packages/db` — Rejection reason: A especificação da história delimita expressamente a sinalização para alertas de severidade crítica.
  - `[low]` `[reject]` Utilização de classes utilitárias no lugar do componente Badge em `sidebar.tsx` — Rejection reason: O item de navegação requer um formato de pílula compacta customizado com dot pulsante específico.
  - `[false]` `[reject]` Inconsistência na propagação de `portalSlug` em `layout.tsx` — Rejection reason: `portalSlug` é garantido com fallback seguro e repassado aos componentes.
  - `[low]` `[reject]` Falta de tag de tenant em `unstable_cache` no `layout.tsx` — Rejection reason: Padrão versionado consistente com as demais caches do arquivo `layout.tsx`.

## Auto Run Result

### Summary of implemented change
Implementação completa da Story 13.2 provendo visibilidade e sinalização elegante, acessível e não-intrusiva das anomalias fiscais críticas do Radar Cívico nos pontos de navegação desktop (`Sidebar`) e mobile (`MobileBottomNav`), sem emojis, com reposicionamento estratégico do Radar Cívico no topo da barra lateral (logo abaixo de "Visão geral" para visibilidade imediata sem necessidade de scroll no mobile/laptops), alimentada por consulta atômica no `@transparencia/db`, cache eficiente no `layout.tsx` e endpoint REST em `apps/web`.

### Files changed with one-line descriptions
- `packages/db/src/queries/radar-civico-alertas.ts`: Implementadas consultas atômicas `getRadarAnomaliasCount` e `getRadarAnomaliasCountByYear` com filtros estritos e imutabilidade.
- `packages/db/src/queries/__tests__/radar-civico-alertas.spec.ts`: Testes unitários para consultas de contagem atômica de anomalias críticas.
- `packages/ui/src/components/sidebar.tsx`: Promove "Radar Cívico" para o bloco superior abaixo de "Visão geral" e adiciona badge acessível com pulso sutil sem emojis/sirenes.
- `packages/ui/src/components/__tests__/sidebar.spec.tsx`: Testes unitários para estados do badge e acessibilidade no Sidebar.
- `apps/web/components/mobile-bottom-nav.tsx`: Adicionadas props `radarAlertCount` e `radarAlertsCountByYear`, exibindo dot de notificação discreto no botão "Mais" quando fechado.
- `apps/web/components/mobile-bottom-nav.spec.tsx`: Testes unitários para exibição condicional do dot e reatividade à troca de exercício no mobile.
- `apps/web/app/components/sidebar-wrapper.tsx`: Sincronização reativa da contagem de alertas com o ano selecionado via `useQueryState`.
- `apps/web/app/components/sidebar-wrapper.spec.tsx`: Testes unitários da resolução reativa no wrapper da sidebar.
- `apps/web/app/layout.tsx`: Carregamento consolidado por ano via `unstable_cache` e repasse aos componentes de navegação.
- `apps/web/app/api/[portalSlug]/radar/count/route.ts`: Endpoint público GET para consulta de alertas críticos com rate limit e validações.
- `apps/web/app/api/[portalSlug]/radar/count/count-route.spec.ts`: Testes automatizados do endpoint de contagem.
- `apps/web/public/llms.txt`: Sincronização do guia de IA com o novo endpoint e sinalizadores de navegação.
- `apps/web/public/llms-full.txt`: Sincronização do dicionário completo de IA com os sinalizadores do Radar Cívico.

### Review findings breakdown
- Patches applied: 9 patches aplicados (remoção de emoji, sincronização llms.txt/llms-full.txt, tolerância a falhas no layout, validação de rota 400 Bad Request, imutabilidade em DB, proteção de limites de inteiro, supressão de dot com menu aberto, etc.).
- Items deferred: 0.
- Rejected findings: 6 rejeitados (com justificativas registradas no log de triagem).

### Follow-up review recommendation: false
Todas as 9 correções foram verificadas com testes automatizados e compilação estática bem-sucedida, sem riscos residuais.

### Verification performed
- `pnpm --filter @transparencia/db test`: 24 arquivos de teste, 127 testes passando.
- `pnpm --filter @transparencia/ui test`: 5 arquivos de teste, 23 testes passando.
- `pnpm --filter web test`: 70 arquivos de teste, 497 testes passando.
- `pnpm lint`: 0 erros no Biome check.
- `pnpm build`: Turbo build concluído com sucesso em todos os 3 pacotes.

### Residual risks
Nenhum risco residual identificado.
