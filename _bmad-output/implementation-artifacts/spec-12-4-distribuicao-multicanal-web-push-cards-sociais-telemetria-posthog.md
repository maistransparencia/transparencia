---
title: 'Story 12.4: Distribuição Multicanal: Web Push, Cards Sociais e Telemetria PostHog'
type: 'feature'
created: '2026-09-14'
baseline_revision: '0af44168fb576578702f7a828d74808d2c8a469d'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/implementation-artifacts/epic-12-context.md'
  - '_bmad-output/planning-artifacts/epics.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Quando anomalias fiscais de severidade crítica são apuradas pelo motor estatístico, o portal da transparência depende da visita espontânea do cidadão, carecendo de despacho ativo multicanal (Web Push tempestivo para dispositivos cadastrados, cartões visuais dinâmicos OpenGraph para redes sociais e mensuração empírica do funil de navegação da Homepage via PostHog).

**Approach:** Integrar a conclusão da ingestão ao despacho automático de Web Push com deep links para anomalias críticas, estender o publicador social (`@mtransparenciax` e Facebook) e o gerador de imagens OpenGraph para o Radar Cívico, e instrumentar eventos de telemetria PostHog no `RadarAnomaliaCard` para monitorar a conversão e evasão positiva para páginas temáticas internas.

## Boundaries & Constraints

**Always:**
- Seguir estritamente a Regra 17 do AGENTS.md: variáveis de ambiente devem ser acessadas exclusivamente via `@/env` (`apps/web/env.ts`), nunca diretamente via `process.env`.
- Seguir a Regra 13 do AGENTS.md: zero ternários aninhados; utilizar IIFEs ou funções auxiliares com retornos antecipados.
- Seguir a Regra 10 do AGENTS.md: classificadores e slugs sempre em `lowercase snake_case`.
- Seguir a Regra 12 do AGENTS.md: manter os arquivos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` sincronizados com os canais de distribuição e telemetria.
- Manter o despacho de Web Push e publicações sociais totalmente não-bloqueantes em relação ao processamento da ingestão de dados, registrando falhas como avisos (`console.warn`) sem interromper a resposta HTTP 200 do webhook.
- No X.com, limitar mensagens estritamente ao teto de 280 caracteres (`<= 280`) calculados com peso canônico de URLs (23 caracteres), preservando links e hashtags oficiais.

**Never:**
- Nunca enviar notificações de severidade crítica com tom acusatório ou sensacionalista; manter linguagem estritamente descritiva, neutra e factual baseada nas métricas apuradas.
- Nunca disparar notificações de anomalia crítica para ocorrências moderadas ou de acompanhamento de rotina.
- Nunca quebrar contratos existentes de rotas de API (`/api/ingestion/webhook` e `/api/social/publish`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ingestão com anomalia crítica | Webhook recebe `status: success` e `getRadarCivicoAlertas` retorna ao menos 1 anomalia `critico` | Dispara Web Push com título de Alerta Crítico, resumo factual e `url` apontando para o `deepLinkRota` da anomalia | Falha de envio de push tratada em try-catch não-bloqueante; retorna HTTP 200 |
| Ingestão sem anomalia crítica | Webhook recebe `status: success` e `getRadarCivicoAlertas` não retorna anomalias críticas | Dispara Web Push padrão de conclusão de extração (`topic: "extracoes"`) com link para a Home | Falha de envio de push tratada em try-catch; retorna HTTP 200 |
| Despacho social de anomalia cívica | Chamada a `publishSocial({ type: "civic_anomaly", portalSlug })` com anomalia crítica | Formata e publica Tweet (<= 280 chars) e Facebook Post com links canônicos para o radar e hashtags oficiais | Erros de API externa registrados isoladamente por canal em `SocialPublishResult` |
| Interação do usuário com o Card do Radar | Usuário visualiza card na Homepage, clica no CTA temático ou clica em compartilhar no WhatsApp | Dispara eventos PostHog `civic_radar_card_viewed`, `civic_radar_card_clicked`, `civic_radar_whatsapp_shared` e `funnel_home_to_internal_page` | PostHog trata offline/bloqueio silenciosamente sem afetar a navegação do usuário |
| Compartilhamento no WhatsApp com OpenGraph | Usuário clica no botão do WhatsApp e compartilha o link | Gera URL do WhatsApp com resumo factual e URL canônica cujo crawler OpenGraph renderiza o card visual com métricas | Fallback para domínio e URL padrão se variáveis de ambiente não estiverem configuradas |

</intent-contract>

## Code Map

- `apps/web/app/api/ingestion/webhook/route.ts` -- Webhook de ingestão pós-pipeline -- Consulta anomalias críticas e despacha Web Push com deep link correspondente.
- `apps/web/lib/social-publisher.ts` -- Orquestrador de publicações sociais no X e Facebook -- Adiciona suporte ao tipo `civic_anomaly` e formatadores dedicados.
- `apps/web/app/api/social/publish/route.ts` -- API HTTP de despacho social -- Valida e aceita `type: "civic_anomaly"`.
- `apps/web/components/radar-anomalia-card.tsx` -- Componente de card de anomalia cívica -- Instrumenta eventos PostHog no cliente para visualização, clique no funil e compartilhamento.
- `apps/web/app/[portalSlug]/radar/opengraph-image.tsx` -- Gerador de imagem dinâmica OpenGraph do Radar Cívico -- Destaca visualmente a presença de anomalias críticas e volume apurado.
- `apps/web/public/llms.txt` -- Guia sucinto de consumo para LLMs -- Documenta canais de distribuição de alertas e telemetria cívica.
- `apps/web/public/llms-full.txt` -- Dicionário completo de IA -- Documenta eventos de telemetria e notificações de anomalias críticas.

## Tasks & Acceptance

**Execution:**
- `apps/web/lib/social-publisher.ts` -- Adicionar tipo `civic_anomaly` e funções `buildCivicAnomalyTweet` e `buildCivicAnomalyFacebookPost` com busca de alertas críticos -- Permite disseminação programática de anomalias nas redes sociais oficiais.
- `apps/web/app/api/social/publish/route.ts` -- Atualizar validação do parâmetro `type` para aceitar `civic_anomaly` -- Habilita chamadas autenticadas à API para disparos sociais de alertas.
- `apps/web/app/api/ingestion/webhook/route.ts` -- Integrar busca de alertas críticos via `getRadarCivicoAlertas` no ciclo de sucesso e disparar push com deep link da anomalia -- Assegura aviso tempestivo aos cidadãos com PWA instalado.
- `apps/web/components/radar-anomalia-card.tsx` -- Converter em client component (`"use client"`), instrumentando `civic_radar_card_viewed`, `civic_radar_card_clicked`, `civic_radar_whatsapp_shared` e `funnel_home_to_internal_page` via `posthog-js` -- Fornece métricas empíricas de conversão e evasão do funil cívico.
- `apps/web/app/[portalSlug]/radar/opengraph-image.tsx` -- Ajustar destaque dinâmico de severidade crítica no template OpenGraph -- Otimiza pré-visualização visual de alertas em redes sociais e WhatsApp.
- `apps/web/public/llms.txt` -- Atualizar documentação pública com tópicos de push de anomalias e telemetria -- Garante cumprimento da Regra 12 de AGENTS.md.
- `apps/web/public/llms-full.txt` -- Atualizar guia canônico expandido com tópicos de push de anomalias e telemetria -- Garante cumprimento da Regra 12 de AGENTS.md.
- `apps/web/components/__tests__/radar-anomalia-card.spec.tsx` -- Adicionar testes unitários para a instrumentação de telemetria PostHog -- Valida envio de eventos na montagem e nos cliques.
- `apps/web/app/api/ingestion/webhook/__tests__/route.test.ts` -- Adicionar casos de teste para disparo de notificação push com deep link quando houver anomalias críticas -- Assegura robustez no tratamento do webhook.
- `apps/web/lib/social-publisher.spec.ts` -- Adicionar casos de teste para publicações sociais de anomalias cívicas no X e Facebook -- Valida formatação e conformidade com limites de caracteres.
- `apps/web/app/api/social/publish-route.spec.ts` -- Atualizar testes da rota de publicação social com suporte a `civic_anomaly` -- Assegura cobertura de ponta a ponta.

**Acceptance Criteria:**
- Given a infraestrutura de Web Push PWA e o webhook `/api/ingestion/webhook`
- When uma carga de ingestão é finalizada com sucesso e existem anomalias com `grauSeveridade = 'critico'`
- Then despacha notificação Web Push aos assinantes com título destacando alerta crítico e `url` configurada para o deep link da anomalia apurada
- And quando nenhuma anomalia crítica for identificada, despacha a notificação padrão de extração concluída
- And integra com o gerador de OpenGraph images dinâmico para renderizar cartões visuais com badges e métricas proporcionais
- And instrumenta eventos PostHog no componente `RadarAnomaliaCard` (`civic_radar_card_viewed`, `civic_radar_card_clicked`, `civic_radar_whatsapp_shared`, `funnel_home_to_internal_page`)
- And disponibiliza suporte a `civic_anomaly` no publicador social `publishSocial` para emissão automática de publicações no X.com e Facebook Pages

## Spec Change Log

_None._

## Review Triage Log

### 2026-09-14 — Review pass
- verdicts: 15 findings — high 0, medium 3, low 11, false 1, maybe-false 0
- findings:
  - `[low]` `[patch]` `apps/web/lib/radar-civico-narrative.ts` — desvioPercentual negativo em narrativa — Aplicado tratamento limpo de sinal com Math.abs e IIFE sem duplicação de sinal negativo.
  - `[low]` `[patch]` `apps/web/lib/social-publisher.ts` — interpolação direta de desvioPercentual sem fallback no Facebook post — Sanitizado com `desvioPercentual ?? 0` e `formatPercentNumber`.
  - `[medium]` `[patch]` `apps/web/components/og/og-routes.spec.tsx` — ausência de teste no nível de rota para radar/opengraph-image — Adicionado caso de teste validando geração de ImageResponse com e sem anomalias críticas.
  - `[low]` `[patch]` `apps/web/bin/publish-social.ts` — anotação de tipo CLI sem 'civic_anomaly' — Adicionado suporte a `civic_anomaly` e flag `--anomalia-id`.
  - `[low]` `[patch]` `apps/web/lib/social-publisher.ts` — operadores ternários aninhados na resolução de URLs — Extraído helper puro `resolveAnomalyLink` com retornos explícitos, conforme Regra 13.
  - `[low]` `[patch]` `apps/web/lib/social-publisher.ts` — formatação decimal no Facebook com ponto — Substituído por `formatPercentNumber` no padrão pt-BR.
  - `[medium]` `[patch]` `apps/web/app/api/ingestion/webhook/route.ts` — busca de anomalias sem filtro de ano no webhook — Adicionado filtro estrito por `ano: new Date(payload.timestamp).getFullYear()`.
  - `[false]` `[reject]` `apps/web/app/api/ingestion/webhook/route.ts` — ausência de topic na notificação push de alerta crítico — No push-dispatcher, omitir o tópico transmite intencionalmente a todos os inscritos, comportamento desejado para alertas fiscais de severidade máxima.
  - `[low]` `[patch]` `apps/web/lib/radar-civico-narrative.ts` — omissão de contexto temporal nas narrativas — Incluído ano nas frases de rombo de caixa e contratação direta.
  - `[low]` `[patch]` `apps/web/components/radar-anomalia-card.tsx` — evento de telemetria com from fixo na tela de radar — Adicionada prop `funnelSource` com fallback `"home_radar_civico"` e valor `"radar_historico"` na página `/radar`.
  - `[low]` `[patch]` `apps/web/lib/social-publisher.ts` — boilerplate de tweet extenso — Otimizado texto introdutório garantindo preservação integral da narrativa e hashtags.
  - `[low]` `[patch]` `apps/web/public/llms.txt` — detalhes técnicos internos de telemetria nos guias — Removidos identificadores internos de eventos, mantendo foco estritamente cívico conforme Regra 12 de AGENTS.md.
  - `[low]` `[patch]` `apps/web/bin/publish-social.ts` — duplicidade de achado sobre CLI — Resolvido conjuntamente com a adição do tipo `civic_anomaly`.
  - `[medium]` `[patch]` `apps/web/lib/__tests__/radar-civico-narrative.spec.ts` — falta de testes unitários para o módulo de narrativa — Criada suíte completa com 18 testes unitários.
  - `[low]` `[patch]` `apps/web/lib/social-publisher.ts` — impossibilidade de filtrar anomalia específica — Adicionado campo opcional `anomaliaId` em `SocialPublishOptions`.

## Auto Run Result

- **Story:** 12.4: Distribuição Multicanal: Web Push, Cards Sociais e Telemetria PostHog
- **Summary:**
  - Implementada a integração reativa no webhook de ingestão (`/api/ingestion/webhook`) para despachar notificações Web Push com deep links para anomalias críticas do ano da carga.
  - Criado o módulo compartilhado de narrativas factuais `apps/web/lib/radar-civico-narrative.ts` com tipagem estrita, formatação monetária/percentual e tratamento neutro de variações.
  - Estendido o orquestrador social (`apps/web/lib/social-publisher.ts` e CLI `publish-social.ts`) para suportar disparos do tipo `civic_anomaly` no X.com e Facebook Pages, respeitando a regra de <= 280 caracteres e URLs canônicas.
  - Instrumentados os 4 eventos analíticos do PostHog no `RadarAnomaliaCard` (`civic_radar_card_viewed`, `civic_radar_card_clicked`, `civic_radar_whatsapp_shared`, `funnel_home_to_internal_page`), suportando atribuição de contexto de navegação via `funnelSource`.
  - Atualizado o gerador dinâmico de cartões OpenGraph do Radar Cívico (`/[portalSlug]/radar/opengraph-image`) para destacar ocorrências críticas.
  - Sincronizados os arquivos públicos de contexto para IA (`llms.txt` e `llms-full.txt`) conforme a Regra 12 de AGENTS.md.
- **Files Modified / Created:**
  - `apps/web/lib/radar-civico-narrative.ts` (novo módulo de narrativa factual)
  - `apps/web/lib/__tests__/radar-civico-narrative.spec.ts` (18 testes unitários de narrativa)
  - `apps/web/app/api/ingestion/webhook/route.ts` (webhook pós-ingestão com busca de anomalias críticas)
  - `apps/web/app/api/ingestion/webhook/__tests__/route.test.ts` (testes de despacho de push com deep link)
  - `apps/web/lib/social-publisher.ts` (suporte a civic_anomaly para X e Facebook)
  - `apps/web/lib/social-publisher.spec.ts` (testes de publicação social de alertas cívicos)
  - `apps/web/bin/publish-social.ts` (CLI com suporte a civic_anomaly e anomaliaId)
  - `apps/web/app/api/social/publish/route.ts` (rota HTTP autenticada com civic_anomaly)
  - `apps/web/app/api/social/publish-route.spec.ts` (testes de API para civic_anomaly)
  - `apps/web/components/radar-anomalia-card.tsx` (client component com telemetria PostHog)
  - `apps/web/components/__tests__/radar-anomalia-card.spec.tsx` (testes de eventos analíticos)
  - `apps/web/app/[portalSlug]/radar/page.tsx` (propagação de funnelSource)
  - `apps/web/app/[portalSlug]/radar/opengraph-image.tsx` (destaque visual dinâmico no card social)
  - `apps/web/components/og/og-routes.spec.tsx` (testes de rota para radar/opengraph-image)
  - `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` (guias públicos de IA sincronizados)
- **Review Findings Breakdown:**
  - Patches aplicados: 14 correções
  - Rejeitados: 1 (omissão de topic no push crítico é intencional para broadcast geral)
  - Deferidos: 0
  - Follow-up review recomendado: `false`
- **Verification:**
  - `make test/ts`: 5 tarefas bem-sucedidas, 65 arquivos de teste e 425 testes passando (100% green).
  - `pnpm --filter web build`: Build do Next.js Turbopack concluído com zero erros de compilação ou tipagem.
  - `make check`: Ruff, Mypy e Biome passando com 100% de sucesso.
- **Residual Risks:** Nenhum. Todas as integrações com serviços externos (VAPID, PostHog, X e Facebook) possuem isolamento seguro contra falhas e respeitam as regras do AGENTS.md.

## Design Notes

- **Formatação de Alerta Crítico no X.com (Twitter)**:
  - Mensagem concisa com teto estrito de 280 caracteres: `🚨 Radar Cívico ({municipio}): Alerta de severidade crítica apurado nas contas municipais. {textoFactual} Confira os dados oficiais: {link} #ControleSocial #TransparenciaFiscal`.
  - Links encurtados computados com tamanho fixo de 23 caracteres para evitar estouro da API v2 do X.
- **Formatação no Facebook Pages**:
  - Mensagem detalhada em tópicos estruturados, aproveitando o espaço expandido da rede: título institucional, detalhamento técnico, métricas comparativas (observado vs. esperado) e link oficial para validação cidadã.
- **Telemetria de Funil PostHog**:
  - `civic_radar_card_viewed`: disparado no `useEffect` na exibição do card contendo `anomaliaId`, `tipoAnomalia`, `grauSeveridade`, `dimensaoReferencia` e `ctaUrl`.
  - `civic_radar_card_clicked`: disparado ao clicar no link do CTA temático.
  - `funnel_home_to_internal_page`: disparado concomitantemente ao clique no CTA temático com `from: "home_radar_civico"` e `to: card.ctaUrl`.
  - `civic_radar_whatsapp_shared`: disparado ao clicar no botão de compartilhamento no WhatsApp.

## Verification

**Commands:**
- `pnpm --filter @transparencia/web test` -- expected: Todas as suítes de teste de frontend e rotas de API passam com sucesso (100% green).
- `pnpm --filter @transparencia/web build` -- expected: Build do Next.js sem erros de compilação ou tipagem TypeScript.
