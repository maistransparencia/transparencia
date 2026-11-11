---
title: 'Story 14.3: Visualização de Desidratação da Poupança e Diagnóstico de Causas na Rota /caprem'
type: 'feature'
created: '2026-09-23'
status: 'done'
baseline_revision: 'ad796b94d0544b67e2e4039dcec4fbf5213c7c09'
review_loop_iteration: 1
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** A rota `/caprem` exibe apenas o saldo em caixa pontual do ano selecionado e tabelas textuais de aportes, impedindo que o cidadão e a Câmara Municipal compreendam visualmente a curva plurianual de desidratação da poupança previdenciária (queda de R$ 60,4M para R$ 35,9M) e o diagnóstico estrutural objetivo de suas causas (déficit de contribuição, cota patronal retida e diluição da base de efetivos).

**Approach:** Criar o componente `CapremPatrimonioHistoricoSection` com gráfico interativo de linha/área (`AreaChart` / `LineChart` do Recharts) destacando a retração do patrimônio consolidado, badges de transparência metodológica para inconsistência de declaração (2022) e quebra de série (2023), três KPI cards analíticos de topo (Pico Histórico, Patrimônio Atual com variação sobre o pico, e Queima Média Anual), e cards de diagnóstico objetivo das causas estruturais com referências normativas e links oficiais externos.

## Boundaries & Constraints

**Always:**
- A visualização de patrimônio financeiro deve ancorar-se na série consolidada `actuarialTrend` da Story 14.2 (`patrimonioFinanceiroTotal`, `inconsistenciaDeclaracaoFlag`, `variacaoPatrimonioAbs`, `variacaoPatrimonioPct`).
- Os três KPI cards do topo da seção de patrimônio histórico devem calcular:
  1. *Patrimônio em [ano base]*: o pico histórico observado em exercícios válidos (sem flag de inconsistência) da série (ex: 2021 com R$ 60,4M).
  2. *Patrimônio Atual*: o saldo mais recente disponível na série (ex: 2026 ou ano selecionado na rota) acompanhado da variação percentual acumulada em relação ao pico histórico.
  3. *Queima Média Anual*: a retração patrimonial total dividida pelo intervalo de anos transcorridos entre o pico e o ano corrente (`(saldoAtual - saldoPico) / anosTranscorridos`).
- Em exercícios marcados com `inconsistenciaDeclaracaoFlag = true` (ex: 2022), a UI deve renderizar badge e alerta metodológico explicando a omissão na remessa da MSC pelo ente ao SICONFI.
- No exercício imediatamente subsequente à inconsistência contábil (ex: 2023), a variação percentual interanual deve ser exibida como `"N/D"` com tooltip explicativo de quebra de série metodológica, eliminando distorções estatísticas ilusórias.
- O diagnóstico das três causas estruturais deve ser rigorosamente técnico, objetivo e não-acusatório:
  1. *Déficit de Contribuição / Equilíbrio Atuarial*: com link para [Lei nº 9.717/1998](https://www.planalto.gov.br/ccivil_03/leis/l9717.htm).
  2. *Cota Patronal em Atraso*: montante de retenção patronal com link para [Art. 40 da CF/88](https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art40).
  3. *Diluição da Base Contributiva*: relação entre temporários/comissionados e servidores efetivos, esclarecendo que temporários recolhem ao INSS/RGPS e não ao RPPS municipal.
- Todos os links para diplomas legais devem conter `target="_blank" rel="noopener noreferrer"`, ícone `ExternalLink` e acessibilidade via leitor de tela (Regra 20 do AGENTS.md).
- Toda a lógica de apresentação e formatação pertence à camada web/UI (Regras 2 e 10 do AGENTS.md), utilizando DTOs puros e formatadores canônicos (`fmtCurrency`, `fmtCompact`, `fmtPercent`). Proibidos ternários aninhados (Regra 13).
- Os arquivos públicos de orientação para IA (`apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`) devem ser atualizados e sincronizados com a nova seção e métricas (Regra 12 do AGENTS.md).
- Todos os testes de unidade, componentes e integração da web devem passar (`pnpm --filter web test`).

**Never:**
- Nunca emitir julgamentos políticos, linguagem sensacionalista ou acusações subjetivas nos cards de diagnóstico ou notas metodológicas.
- Nunca calcular taxas percentuais interanuais a partir do ano com inconsistência contábil (2022), sob risco de reportar variações artificiais superiores a +6.000%.
- Nunca remover ou alterar o comportamento do card existente `CapremSaldoCaixaCard` (que exibe a disponibilidade do exercício selecionado no SICONFI).
- Nunca acessar `process.env` diretamente nos novos componentes (Regra 17 do AGENTS.md).
- Nunca quebrar a responsividade mobile nem a navegação contínua da página.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Série histórica completa (2021-2026) | `actuarialTrend` com 6 exercícios de Porciúncula | Gráfico renderiza a trajetória anual; KPIs exibem Pico (2021: R$ 60,4M), Atual (ex: R$ 33,4M em 2026, -44,7%) e Queima Média Anual (~R$ 5,4M/ano) | Fallback gracioso se array estiver vazio |
| Ponto com inconsistência contábil (2022) | Ponto do gráfico ou hover em 2022 com `inconsistenciaDeclaracaoFlag = true` | Exibe badge de transparência metodológica ("Inconsistência de Declaração na MSC") e tooltip detalhando que aplicações não foram informadas ao SICONFI | Não oculta o ponto factual mas contextualiza |
| Exercício subsequente à inconsistência (2023) | Exibição de variação percentual interanual de 2023 | Exibe `"N/D"` com badge/tooltip de quebra de série metodológica em vez de valor numérico (+6.185%) | Trata `variacaoPatrimonioPct === null` |
| Diagnóstico: Déficit Atuarial / Aporte | `totalAporteExigido > 0`, `taxaAdimplenciaAporte` | Card exibe valor de aportes devidos/quitados, percentual e link oficial para a Lei nº 9.717/1998 | Se exigência = 0, informa regularidade |
| Diagnóstico: Retenção Patronal | `romboPatronalNaoRepassado > 0` | Card destaca montante retido e déficit médio mensal com link para CF/88 Art. 40 | Se retido = 0, badge verde de conformidade |
| Diagnóstico: Diluição da Base Efetiva | `servidoresEfetivos`, `servidoresTemporarios` | Card exibe contagem de vínculos e razão temporários/efetivos explicando a destinação ao RGPS | Se efetivos = 0, evita divisão por zero |
| Ano selecionado na rota | Usuário navega para `?ano=2024` | Gráfico destaca a referência do exercício selecionado e a âncora `#patrimonio` funciona perfeitamente | Suporte a âncora de navegação |

</intent-contract>

## Code Map

- `apps/web/app/[portalSlug]/caprem/loader.ts` -- Loader da rota `/caprem`; já extrai `actuarialTrend` com os campos de patrimônio consolidado da Story 14.2.
- `apps/web/app/[portalSlug]/caprem/view-model.ts` -- View model da rota; computar métricas agregadas da série histórica (pico histórico, patrimônio atual, variação acumulada, queima média anual) e repassar para o DTO final.
- `apps/web/app/[portalSlug]/caprem/view-model.spec.ts` -- Testes unitários do view model cobrindo o cálculo do pico histórico, queima anual e tratamento de quebra de série.
- `apps/web/components/caprem-patrimonio-historico-section.tsx` -- Novo componente client-side renderizando: (1) cabeçalho da seção com âncora `id="patrimonio"`, (2) 3 KPI cards de topo, (3) gráfico interativo Recharts (`AreaChart` / `ResponsiveContainer`), (4) notas metodológicas de inconsistência/quebra de série, (5) grid de 3 cards de diagnóstico estrutural com hyperlinks legais oficiais.
- `apps/web/components/caprem-patrimonio-historico-section.spec.tsx` -- Testes de renderização do novo componente cobrindo KPIs, badges de inconsistência e links legislativos.
- `apps/web/app/[portalSlug]/caprem/page.tsx` -- Página Server Component da rota `/caprem`; integrar `CapremPatrimonioHistoricoSection` logo abaixo da disponibilidade em caixa ou junto aos riscos atuariais.
- `apps/web/app/[portalSlug]/caprem/page.spec.tsx` -- Testes de integração da página validando a presença da nova seção de patrimônio e seus elementos.
- `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` -- Sincronização dos guias de consumo por IA com a nova seção e conceitos de patrimônio histórico do RPPS (Regra 12 do AGENTS.md).

## Tasks & Acceptance

**Execution:**
- `apps/web/app/[portalSlug]/caprem/view-model.ts` -- Adicionar cálculo de `patrimonioHistoricoResumo` no view model (pico histórico, ano base, patrimônio mais recente, variação acumulada frente ao pico, queima média anual e série formatada) -- Entregar View Model enriquecido para a UI sem cálculos ad-hoc em componentes.
- `apps/web/app/[portalSlug]/caprem/view-model.spec.ts` -- Criar testes unitários para a computação de KPIs de patrimônio histórico no view model -- Garantir precisão matemática e tolerância a dados parciais.
- `apps/web/components/caprem-patrimonio-historico-section.tsx` -- Criar o componente `CapremPatrimonioHistoricoSection` com `AreaChart` Recharts, 3 KPI cards de topo, notas de transparência metodológica para inconsistência de declaração na MSC e quebra de série, e os 3 cards de diagnósticos de causas com links para Lei 9.717/98, CF/88 Art. 40 e notas de previdência -- Materializar a visualização completa e auditável da trajetória da poupança e suas causas.
- `apps/web/components/caprem-patrimonio-historico-section.spec.tsx` -- Adicionar testes de componente para `CapremPatrimonioHistoricoSection` -- Validar renderização de valores monetários, badges de inconsistência e atributos de links externos (`target="_blank" rel="noopener noreferrer"`).
- `apps/web/app/[portalSlug]/caprem/page.tsx` -- Integrar `CapremPatrimonioHistoricoSection` na rota `/caprem` ancorada em `#patrimonio` -- Disponibilizar a visualização na interface pública do portal.
- `apps/web/app/[portalSlug]/caprem/page.spec.tsx` -- Atualizar os testes da página `/caprem` cobrindo a renderização da seção de patrimônio histórico -- Garantir que a integração não cause regressão nas seções existentes.
- `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` -- Atualizar a documentação pública para LLMs com o detalhamento da nova seção de patrimônio histórico, queima de poupança e causas estruturais -- Cumprir a Regra 12 do AGENTS.md.

**Acceptance Criteria:**
- Given a série histórica plurianual em `actuarialTrend`, when o cidadão acessa a rota `/[portalSlug]/caprem`, then a seção `CapremPatrimonioHistoricoSection` é renderizada com gráfico de área/linha da evolução do patrimônio (2021–corrente), com eixo Y em R$ e eixo X por ano.
- Given os dados de 2021 e do exercício mais recente, when renderizados os KPIs de topo, then exibem: (1) *Pico Histórico* (R$ 60,4mi em 2021), (2) *Patrimônio Atual* com variação percentual sobre o pico (-44,7%), e (3) *Queima Média Anual* (R$ 5,4mi/ano).
- Given o exercício de 2022 marcado com `inconsistenciaDeclaracaoFlag = true`, when inspecionado no gráfico/tabela, then exibe badge de aviso de transparência metodológica sobre a omissão de aplicações na remessa da MSC do SICONFI.
- Given o exercício subsequente (2023), when exibida a variação percentual interanual, then exibe `"N/D"` com nota de quebra de série metodológica, impedindo taxa artificial de +6.185%.
- Given os cards de diagnóstico de causas estruturais, when exibidos na UI, then apresentam os 3 blocos objetivos:
  1. *Déficit de Contribuição / Equilíbrio Atuarial*: com link oficial da Presidência da República para a Lei nº 9.717/1998.
  2. *Cota Patronal em Atraso*: com o montante de contribuição retida e link para o Art. 40 da CF/88.
  3. *Diluição da Base Contributiva*: demonstrando a proporção de contratados temporários/comissionados frente aos servidores estatutários efetivos e sua destinação ao RGPS.
- Given os hiperlinks para diplomas legais, when inspecionados, then contêm `target="_blank" rel="noopener noreferrer"`, ícone `ExternalLink` e acessibilidade adequada.
- Given as orientações de IA, when verificados os arquivos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`, then contêm as novas especificações públicas da seção de patrimônio histórico.
- Given a suíte de testes do frontend, when executado `pnpm --filter web test caprem`, then todos os testes passam com 100% de sucesso.

## Spec Change Log

## Review Triage Log

- **UX/Responsividade da Tabela Metodológica (Feedback do Usuário)**:
  - *Problema*: Em telas desktop, badges sofriam quebra de linha de texto e desalinhamento com colunas numéricas; em mobile, a tabela em overflow horizontal tornava a visualização prejudicada.
  - *Solução*: Refatorada a tabela desktop para `table-fixed` com larguras explícitas de coluna e `whitespace-nowrap shrink-0` em todos os badges e números. Adicionada apresentação responsiva dedicada para mobile (`sm:hidden`) em formato de lista de cards por exercício, garantindo legibilidade imediata sem necessidade de rolagem horizontal ou deformação de badges.
- **Regra 13 do AGENTS.md (Eliminação de Ternários Aninhados)**:
  - Substituídos os ternários aninhados no tooltip do gráfico (`formatVariacaoTooltip`) e nas notas da tabela (`renderVariacaoTabela`, `renderNotaMetodologica`) por funções auxiliares puras com retornos antecipados.
- **Sincronização de Métrica Patronal**:
  - Propagado o campo `totalLiquidadoPatronal` em `loader.ts`, `ActuarialRiskSummary` e `CapremPatrimonioHistoricoDiagnostico` para que o Card 2 de diagnóstico estrutural ("Patronal Liquidado") apresente exatamente o valor de patronal liquidado, com fallback consistente para cálculo do rombo de retenção.
- **Tratamento de Casos de Borda**:
  - Seleção de `itemAtual`: prioriza o último exercício sem flag de inconsistência declaratória (`!inconsistenciaDeclaracaoFlag`), evitando exibir dados corrompidos/omitidos como patrimônio atual.
  - Cálculo de `queimaMediaAnual`: protegido contra divisão por zero e anos negativos (`anoPico <= 0 || anosTranscorridos <= 0`).
  - Título da seção: formata `(2026)` em vez de `(2026–2026)` caso a série contenha apenas um exercício.
  - SVG Gradient: atribuído ID dinâmico via `useId()` do React para prevenir colisão de referências no DOM.
- **Cobertura de Testes**:
  - Adicionados testes para valores monetários de aportes e retenção patronal, badges de adimplência, formatação de título com exercício único e resiliência a inconsistências declaratórias.

## Auto Run Result

- **Story 14.3 Implementation Status**: Concluída e verificada com sucesso.
- **Testes**:
  - `pnpm --filter web test caprem`: 4 arquivos de teste, 23 testes passando (100%).
  - `pnpm --filter web test`: 75 arquivos de teste, 554 testes passando (100%).
- **Checagens Estáticas & Linter**:
  - `pnpm --filter web exec tsc --noEmit`: 0 erros de tipagem TypeScript.
  - `make check && make lint/ts`: 0 erros no Ruff/Mypy/Biome.
- **Build de Produção**:
  - `pnpm --filter web build`: Build do Next.js compilado com sucesso.

## Design Notes

### Layout da Seção `CapremPatrimonioHistoricoSection`
1. **Âncora e Identificação**: `<section id="patrimonio" aria-label="Trajetória do Patrimônio Financeiro da Previdência (CAPREM)" className="space-y-6">`
2. **SectionHeader**:
   - Título: `"Evolução do Patrimônio Financeiro da Previdência (2021–2026)"`
   - Descrição: `"Trajetória da reserva financeira e investimentos da previdência própria (SICONFI/STN), confrontando a queima de poupança com as causas estruturais do déficit atuarial."`
3. **KPI Grid Superior (3 Colunas)**:
   - *Pico Histórico*: `fmtCompact(resumo.patrimonioPico)` (`"Em 2021"`, `"Reserva máxima observada"`)
   - *Patrimônio Atual*: `fmtCompact(resumo.patrimonioAtual)` com badge percentual `fmtPercent(resumo.variacaoPicoPct)` (`"Retração acumulada frente ao pico"`)
   - *Queima Média Anual*: `fmtCompact(resumo.queimaMediaAnual)` (`"Consumo anual de poupança (2021–corrente)"`)
4. **Card do Gráfico de Área (Recharts)**:
   - Área sombreada em tom cívico (azul/índigo com gradiente suave para transparência).
   - Tooltip customizado com valor em moeda corrente (`fmtCurrency`), ano e notas explicativas.
   - Ponto de 2022 marcado visualmente com alerta de inconsistência contábil de declaração na MSC.
   - Abaixo do gráfico, mini-banner informativo sobre a transparência metodológica das remessas do SICONFI.
5. **Diagnóstico Estrutural das Três Causas**:
   - Três cartões informativos com ícones semânticos (`Scale`, `AlertCircle`, `Users`), dados quantitativos e hyperlinks para o Planalto.

## Verification

**Commands:**
- `pnpm --filter web test caprem` -- expected: PASS (todos os testes de unidade de caprem passam)
- `pnpm --filter web typecheck` ou `pnpm --filter web build` -- expected: PASS (0 erros de tipagem TypeScript)
- `make check` -- expected: PASS (linters e checagens estáticas passam)
- `make lint/ts` -- expected: PASS (biome linter sem violações)

