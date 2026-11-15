---
title: 'Story 12.3: Feed Mobile-First do Radar Cívico na Homepage com Linguagem Factual e Funil de Navegação'
type: 'feature'
created: '2026-09-13'
baseline_revision: 'eaefac8e6719bb5326f75044655ab6c6f929d251'
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

**Problem:** Os cidadãos que acessam o portal de transparência municipal na Homepage deparam-se com visões agregadas tradicionais, sem um funil proativo que destaque anomalias atípicas detectadas pelo motor estatístico analítico nem os direcione de forma fluida e factual para auditorias aprofundadas nas páginas temáticas.

**Approach:** Criar uma seção proeminente e responsiva "Radar Cívico Municipal" no primeiro scroll da Homepage com cards em linguagem estritamente factual e neutra (sem sensacionalismo), exibindo badges semânticas de severidade, indicador metodológico ("Comparação Homóloga" vs. "Posição Atual"), CTA temático como funil ativo e botão de compartilhamento no WhatsApp.

## Boundaries & Constraints

**Always:**
- Utilizar tom estritamente factual, objetivo e neutro na formulação das narrativas dos alertas (ex: indicar variação percentual e valores absolutos observados vs. esperados sem adjetivos acusatórios).
- Posicionar a seção do Radar Cívico no primeiro scroll da tela da Homepage, imediatamente abaixo do `HeroFiscalCard`.
- Exibir badge semântica de severidade (`critico` = rose/red, `alto` = amber, `moderado` = blue) com ícones e contraste acessível.
- Exibir badge metodológica indicando "Comparação Homóloga" (para fluxos: despesas e licitações) ou "Posição Atual" (para estoques: comissionados e saldo de caixa).
- Implementar funil de navegação ativo com CTA direcionando para a rota canônica temática (`/pessoal`, `/saude`, `/despesas`, `/licitacoes`), preservando ano e âncoras (`#comissionados`, `#saldo-caixa`).
- Disponibilizar botão de ação rápida "Compartilhar no WhatsApp" utilizando link `https://api.whatsapp.com/send?text=...` codificado via `encodeURIComponent` com resumo factual e URL da página.
- Adotar layout mobile-first: feed com rolagem horizontal suave no mobile (`snap-x`) e grade responsiva no desktop.
- Seguir estritamente as regras de arquitetura: zero ternários aninhados (Regra 13), propriedades em camelCase (Regra 18), valores fixos em lowercase snake_case (Regra 10), sem `process.env` direto (Regra 17).
- Tratar estado vazio (quando não houver alertas detectados no exercício) exibindo mensagem cívica tranquilizadora de conformidade.

**Never:**
- Nunca usar linguagem acusatória, conspiratória ou termos como "gastança", "desvio", "farra" ou "crime".
- Nunca recalcular ou inventar estatísticas no cliente: consumir estritamente os campos entregues pelo leitor `getRadarCivicoAlertas`.
- Nunca quebrar o layout da Homepage caso o backend retorne lista vazia ou ocorra indisponibilidade transitória.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Homepage com alertas de anomalia | `radarAlertas` contendo anomalias de comissionados e despesas | Renderiza seção "Radar Cívico Municipal" com cards contendo badges, resumo factual, CTA temático e botão WhatsApp | Fallback elegante se propriedades opcionais forem nulas |
| Alerta de comissionados (`explosao_comissionados`) | Anomalia com `desvioPercentual = 65`, `valorObservado = 165`, `valorEsperado = 100` | Card com badge "Posição Atual", título "Variação em Cargos Comissionados", resumo factual indicando +65% e link para `/pessoal?ano=...#comissionados` | Trata valores numéricos com formatadores |
| Alerta de fluxo homólogo (`pico_despesa_homologa`) | Anomalia de despesa em saúde com `mesFinal = 8` | Card com badge "Comparação Homóloga (Jan–Ago)", título objetivo e CTA para `/despesas?ano=...` | Calcula nome do mês a partir de `mesFinal` |
| Alerta de contratação direta (`concentracao_dispensa`) | Anomalia de dispensas com `valorObservado = 72.57` | Card com badge "Comparação Homóloga", título "Volume em Contratações Diretas" e CTA para `/licitacoes?ano=...` | Exibe percentual formatado |
| Exercício sem anomalias detectadas | `radarAlertas = []` | Renderiza banner/card cívico de conformidade informando que os dados estão dentro dos parâmetros históricos | Não renderiza cards vazios nem quebra |
| Clique no botão WhatsApp | Card com anomalia factual | Abre link do WhatsApp com texto factual pré-formatado e deep link canônico codificado | `encodeURIComponent` garante caracteres válidos |

</intent-contract>

## Code Map

- `apps/web/app/[portalSlug]/loader.ts` -- Atualizar `loadVisaoGeralData` para carregar `getRadarCivicoAlertas(tenantSlug, { ano: selectedYear, limite: 6 })` a partir de `@transparencia/db`.
- `apps/web/app/[portalSlug]/view-model.tsx` -- Adicionar transformação e mapeamento de `radarAlertas` para `radarCivicoFeedData` com textos factuais neutros (Sophia), badges metodológicas e URLs do WhatsApp.
- `apps/web/components/radar-anomalia-card.tsx` -- Criar componente de apresentação atômico para o card de anomalia cívica com badges, métricas comparativas, CTA temático e ação de compartilhamento.
- `apps/web/components/radar-civico-feed.tsx` -- Criar container do feed do Radar Cívico no primeiro scroll da Homepage com suporte a carousel/snap horizontal mobile e grade desktop.
- `apps/web/app/[portalSlug]/page.tsx` -- Injetar o componente `RadarCivicoFeed` logo abaixo de `HeroFiscalCard`.
- `apps/web/components/__tests__/radar-anomalia-card.spec.tsx` -- Testes unitários para renderização de cards, badges de severidade e botões de compartilhamento.
- `apps/web/components/__tests__/radar-civico-feed.spec.tsx` -- Testes unitários para o feed, rolagem mobile e estado de conformidade (vazio).
- `apps/web/app/[portalSlug]/view-model.spec.ts` -- Testes para a transformação factual das anomalias no view-model.
- `apps/web/app/[portalSlug]/page.spec.tsx` -- Teste de integração de renderização na Homepage.

## Tasks & Acceptance

**Execution:**
- `apps/web/app/[portalSlug]/loader.ts` -- Integrar chamada a `getRadarCivicoAlertas` no carregamento de dados da Visão Geral -- Provê dados de alertas fiscais para a Homepage.
- `apps/web/app/[portalSlug]/view-model.tsx` -- Implementar gerador de narrativas factuais e DTOs de visualização para o Radar Cívico -- Garante comunicação neutra, badges de severidade e links do WhatsApp.
- `apps/web/components/radar-anomalia-card.tsx` -- Desenvolver componente de card interativo e mobile-first para anomalias cívicas -- Permite visualização clara e compartilhamento cívico.
- `apps/web/components/radar-civico-feed.tsx` -- Construir a seção do feed do Radar Cívico para a Homepage com suporte a mobile-first snap scroll e empty-state -- Apresenta os alertas no primeiro scroll do portal.
- `apps/web/app/[portalSlug]/page.tsx` -- Inserir a seção `RadarCivicoFeed` na hierarquia visual da Homepage -- Posiciona o Radar Cívico no primeiro scroll.
- `apps/web/components/__tests__/radar-anomalia-card.spec.tsx` -- Criar testes unitários para o card de anomalia e link do WhatsApp -- Assegura fidelidade visual e estrutural.
- `apps/web/components/__tests__/radar-civico-feed.spec.tsx` -- Criar testes unitários para a seção do feed e empty state -- Valida comportamento responsivo e robustez.
- `apps/web/app/[portalSlug]/view-model.spec.ts` -- Adicionar casos de teste para o mapeamento de anomalias no view-model -- Assegura formatação factual e semântica.
- `apps/web/app/[portalSlug]/page.spec.tsx` -- Atualizar mock e assertions da página principal -- Valida integração completa do componente na tela inicial.

**Acceptance Criteria:**
- Given um usuário acessando o portal web (desktop ou dispositivo móvel)
- When a Homepage for renderizada
- Then exibe a seção destacada "Radar Cívico Municipal" posicionada no primeiro scroll da tela, contendo cards interativos baseados nos alertas do backend
- And cada card exibe título objetivo, badge semântica de severidade (`critico`, `alto`, `moderado`), indicador de "Comparação Homóloga" ou "Posição Atual" e texto estritamente factual
- And cada card contém um botão de ação claro direcionando o cidadão para a página temática correspondente (`/pessoal`, `/saude`, `/despesas`, `/licitacoes`), operando como funil ativo de exploração
- And disponibiliza botão de ação rápida "Compartilhar no WhatsApp" que gera mensagem com resumo factual e link direto para a página
- And quando não existirem anomalias no exercício, renderiza mensagem cívica de conformidade assegurando tranquilidade institucional

## Spec Change Log

_None._

## Review Triage Log

- **Blind Hunter Reviewer:**
  - Finding: Falta de teste unitário verificando explicitamente os argumentos repassados a `getRadarCivicoAlertas` no loader (`{ ano: selectedYear, limite: 6 }`). -> Resolução: Teste unitário adicionado em `apps/web/app/[portalSlug]/loader.spec.ts`.
  - Finding: Tratamento de borda em intervalo mensal homólogo quando `mesInicio === mesFim` gerava "(Jan–Jan)". -> Resolução: Normalizado em `getBadgeMetodologia` para exibir apenas "(Jan)".
- **Edge Case Hunter Reviewer:**
  - Finding: Possível divisão por zero ou NaN em `desvioPercentual` quando `metricaValorReferencia` for 0 ou nulo. -> Resolução: Protegido com fallback para 0 e verificação explícita de `isFinite`.
  - Finding: Canonical URL fallback em `buildWhatsAppShareUrl` continha ternário aninhado violando Regra 13. -> Resolução: Extraída função pura `resolveCanonicalUrl(ctaUrl, cleanBase)` com condicionais `if/return`.
- **Verification Gap Reviewer:**
  - Finding: Documentação de consumo público por LLMs (`apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`) exigida pela Regra 12 de AGENTS.md estava pendente de sincronização para a seção do Radar Cívico na Homepage. -> Resolução: Atualizados ambos os arquivos e validados com `llms-guides.spec.ts`.
- **Intent Alignment Auditor:**
  - Finding: Alinhamento de título e severidade textual nos cards ("Variação Atípica em Cargos Comissionados" e "Alto Desvio") garantindo conformidade com a persona Sophia (narrativa factual neutra) e Caravaggio (badges acessíveis). -> Resolução: Padronizado em `view-model.tsx` e componentes.

## Auto Run Result

- **Story:** 12.3 Feed Mobile-First do Radar Cívico na Homepage com Linguagem Factual e Funil de Navegação
- **Personas:** Sophia (narrativa factual e tom neutro), Caravaggio (design mobile-first, acessibilidade e microinterações), Amelia (arquitetura TypeScript, conformidade com regras AGENTS.md e suíte de testes).
- **Files Modified / Created:**
  - `apps/web/app/[portalSlug]/loader.ts`
  - `apps/web/app/[portalSlug]/loader.spec.ts`
  - `apps/web/app/[portalSlug]/view-model.tsx`
  - `apps/web/app/[portalSlug]/view-model.spec.ts`
  - `apps/web/app/[portalSlug]/page.tsx`
  - `apps/web/app/[portalSlug]/page.spec.tsx`
  - `apps/web/components/radar-anomalia-card.tsx`
  - `apps/web/components/radar-civico-feed.tsx`
  - `apps/web/components/__tests__/radar-anomalia-card.spec.tsx`
  - `apps/web/components/__tests__/radar-civico-feed.spec.tsx`
  - `apps/web/public/llms.txt`
  - `apps/web/public/llms-full.txt`
  - `_bmad-output/implementation-artifacts/spec-12-3-feed-mobile-first-radar-civico-homepage.md`
- **Verification:**
  - `pnpm --filter web test`: 61 test files, 384 tests passing (100% green).
  - `pnpm --filter web build`: Next.js 16 production build succeeded with zero errors.

## Design Notes

- **Linguagem Factual e Não-Acusatória (Sophia)**:
  - `explosao_comissionados`: *"Em {ano}, o quadro de pessoal registrou {valorObservado} cargos comissionados ativos, número +{desvioPercentual}% superior ao padrão histórico observado ({valorEsperado} cargos)."*
  - `rombo_caixa`: *"A disponibilidade líquida em recursos livres encerrou o período em {valorObservado}, posicionando-se {desvioPercentual}% abaixo da média de referência ({valorEsperado})."*
  - `pico_despesa_homologa`: *"No período homólogo (Jan a {mesFinal}), os gastos empenhados na função {funcao} totalizaram {valorObservado}, com variação de +{desvioPercentual}% sobre a mediana histórica ({valorEsperado})."*
  - `concentracao_dispensa`: *"No período homólogo, as compras diretas (dispensas e inexigibilidades) responderam por {valorObservado}% do volume licitado, frente à mediana histórica de {valorEsperado}%."*
- **Hierarquia Visual e Ergonomia Mobile (Caravaggio)**:
  - Cards com cantos arredondados, bordas sutis com acento de cor correspondente à severidade na borda esquerda (`border-l-4`).
  - Rolagem horizontal fluida no mobile com classes Tailwind `flex overflow-x-auto snap-x snap-mandatory gap-4 pb-2 no-scrollbar md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible`.
- **Implementação Funcional e Sem Ternários Aninhados (Amelia)**:
  - Uso de helpers dedicados para determinar rótulos metodológicos, cores de badges e textos factuais via retornos antecipados.

## Verification

**Commands:**
- `pnpm --filter @transparencia/web test` -- expected: Todas as suítes de teste de frontend passam com sucesso.
- `pnpm --filter @transparencia/web build` -- expected: Build e verificação de tipagem Next.js executam sem erros.
