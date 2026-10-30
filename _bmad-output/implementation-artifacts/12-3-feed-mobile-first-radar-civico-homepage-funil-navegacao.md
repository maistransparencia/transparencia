---
baseline_commit: 9f7cf3139c530672425744ebcafe6ba2b6cefd48
---

# Story 12.3: Feed Mobile-First do Radar Cívico na Homepage com Linguagem Factual e Funil de Navegação

Status: done

## Story

As a citizen browsing the transparency portal on mobile,  
I want an engaging, factual, and non-accusatory "Civic Radar" card feed on the homepage highlighting notable anomalies (e.g., comissionados surge, health expenditure spikes),  
So that I am intuitively guided out of the homepage into deep thematic sections without encountering aggressive or misleading headlines.

---

## Acceptance Criteria

1. **Seção Radar Cívico na Homepage (`apps/web/components/radar-civico-feed.tsx` e `apps/web/app/[portalSlug]/page.tsx`):**
   - Exibir a seção destacada "Radar Cívico Municipal" posicionada no primeiro scroll da tela.
   - Renderizar cards interativos a partir de `getRadarCivicoAlertas` com layout responsivo mobile-first (`md:grid md:grid-cols-2`).
   - Apresentar Empty State claro e amigável quando nenhuma anomalia for detectada para o exercício.

2. **Visualização de Anomalias Factual e Não-Acusatória (`apps/web/components/radar-anomalia-card.tsx`):**
   - Apresentar badge semântica de severidade (`critico`, `alto`, `moderado`).
   - Indicar método/marcador temporal ("Comparação Homóloga", "Posição Atual").
   - Compor títulos e descrições factuais com desvio percentual e valores absolutos.

3. **Funil de Conversão e Navegação Aprofundada:**
   - Cada card opera como gatilho de navegação (CTA explícito) direcionando para a página temática relevante (`/pessoal`, `/saude`, `/despesas`, `/licitacoes`), preservando searchParams e âncoras.
   - Botão de ação rápida "Compartilhar no WhatsApp" com texto factual e hyperlink canônico.
