---
baseline_commit: 0af44168fb576578702f7a828d74808d2c8a469d
---

# Story 12.4: Distribuição Multicanal: Web Push, Cards Sociais e Telemetria PostHog

Status: done

## Story

As a civic engagement coordinator and platform user,
I want confirmed critical anomalies to automatically trigger Web Push notifications, generate dynamic OpenGraph social cards, and track mobile navigation funnels in PostHog,
So that relevant civic findings are actively distributed across social channels (@mtransparenciax) and mobile devices, converting passive visitors into engaged researchers.

---

## Acceptance Criteria

1. **Webhook de Ingestão e Disparo de Web Push com Deep Link (`apps/web/app/api/ingestion/webhook/route.ts`):**
   - Ao registrar sucesso em um ciclo de ingestão (`status === "success"`), consulta anomalias críticas vigentes (`getRadarCivicoAlertas`) filtradas pelo exercício fiscal correspondente.
   - Dispara notificação Web Push de alta prioridade com deep link direto para a seção temática relevante da anomalia identificada (`deepLinkRota` ou `/[portalSlug]/radar`).
   - Mantém fallback para a notificação padrão de conclusão de extração (`topic: "extracoes"`) quando não houver anomalias críticas apuradas.
   - O despacho é isolado de forma não-bloqueante em bloco `try/catch`, assegurando resposta HTTP 200 ao pipeline.

2. **Publicador Social Unificado e Disseminação Cívica (`apps/web/lib/social-publisher.ts` e `apps/web/bin/publish-social.ts`):**
   - Adiciona suporte ao tipo `civic_anomaly` e campo opcional `anomaliaId` no orquestrador social (`publishSocial`).
   - Implementa `buildCivicAnomalyTweet` respeitando o limite estrito de <= 280 caracteres ponderados pela API v2 do X, links canônicos e hashtags `#ControleSocial #TransparenciaFiscal`.
   - Implementa `buildCivicAnomalyFacebookPost` com estrutura descritiva em tópicos, métricas comparativas observadas vs. médias históricas e link para auditoria cidadã.
   - Atualiza a rota autenticada `/api/social/publish` e a CLI `publish-social.ts` para permitir publicações sob demanda ou automações.

3. **Instrumentação de Telemetria no Funil Cívico (`apps/web/components/radar-anomalia-card.tsx`):**
   - Converte o componente em Client Component (`"use client"`).
   - Dispara evento `civic_radar_card_viewed` na montagem do card.
   - Dispara eventos `civic_radar_card_clicked` e `funnel_home_to_internal_page` ao clicar no CTA de aprofundamento, suportando contexto de origem via prop `funnelSource`.
   - Dispara evento `civic_radar_whatsapp_shared` ao clicar no botão de compartilhamento no WhatsApp.

4. **Cartões Dinâmicos OpenGraph (`apps/web/app/[portalSlug]/radar/opengraph-image.tsx`):**
   - Adapta a renderização dinâmica de cartões OpenGraph para destacar badges de alerta crítico e volume apurado quando houver ocorrências críticas no radar.

5. **Documentação de Consumo para IA (`apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`):**
   - Atualiza os guias de consumo por agentes externos com a descrição pública das notificações tempestivas e do funil de engajamento comunitário, em estrita conformidade com a Regra 12 de AGENTS.md.
