---
title: 'Story 17.6: Card Resumo de Obras Públicas na Visão Geral (Homepage)'
type: 'feature'
created: '2026-10-11'
status: 'done'
baseline_revision: '692cd9b1b963bccf2aacb7a6c7fcbc2039fcd8c7'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - 'packages/db/src/queries/obras.ts'
  - 'apps/web/app/[portalSlug]/loader.ts'
  - 'apps/web/app/[portalSlug]/view-model.tsx'
  - 'apps/web/app/[portalSlug]/page.tsx'
  - 'apps/web/components/saldo-caixa-resumo-card.tsx'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Cidadãos e contribuintes que acessam a página inicial do portal municipal (`/[portalSlug]`) não visualizam o panorama geral das obras públicas e intervenções urbanas em andamento, concluídas ou paralisadas na cidade, precisando navegar deliberadamente até a rota `/obras` para descobrir quais empreendimentos existem e quantos recursos estão imobilizados.

**Approach:** Criar o componente `ObrasResumoCard` na Visão Geral (Homepage), posicionado imediatamente após `CardsSecundariosVisaoGeral` e antes de `RadarCivicoFeed`, exibindo o montante total de investimento previsto em destaque tipográfico serifado, barra proporcional empilhada de distribuição física do investimento, contadores de obras por situação com destaque para obras paralisadas, call to action para o mapa interativo (`/[portalSlug]/obras`) e consulta síncrona via `Promise.all` em `loadVisaoGeralData`.

## Boundaries & Constraints

**Always:**
- Seguir rigorosamente o padrão de design system estabelecido por `SaldoCaixaResumoCard` em `apps/web/components/saldo-caixa-resumo-card.tsx` (Regra 24 do `AGENTS.md`).
- Utilizar isolamento multi-tenant obrigatório em todas as queries e loaders, particionando estritamente por `portalSlug` (Regra 23 do `AGENTS.md`).
- Padronizar identificadores e contratos de dados em `camelCase` (Regra 18 do `AGENTS.md`).
- Formatar valores monetários compactos via `fmtCompact` (ex: `R$ 93.1mi`), percentuais via `fmtPercent` e números via `fmtNumber` do `@transparencia/ui` (Regra 24).
- Apresentar alerta visual proeminente caso existam obras paralisadas (`paralisadas > 0`), destacando o volume de obras e os recursos públicos retidos.
- Renderizar empty state neutro e elegante quando o município não possuir obras registradas no ObrasGov.br para o período.
- Incluir link oficial para o portal do Governo Federal (ObrasGov.br) com `target="_blank"` e `rel="noopener noreferrer"` (Regra 20 do `AGENTS.md`).
- Atualizar síncronamente `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` documentando o card de obras na Visão Geral (Regra 12 do `AGENTS.md`).

**Never:**
- Proibido hardcodar nomes ou slugs de municípios em qualquer componente ou query (Regra 23).
- Proibido utilizar operadores ternários aninhados; usar IIFE ou funções auxiliares com retornos antecipados para lógica condicional (Regra 13).
- Proibido mutar dados no view-model ou no loader; manter imutabilidade e transformações puras (Regra 2).
- Proibido introduzir termos ou jargões exóticos fora do vocabulário cívico padrão (Regra 24).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Município com obras ativas e paralisadas | `resumo` com `totalObras: 5`, `emExecucao: 2`, `paralisadas: 1`, `concluidas: 2`, `valorTotalInvestimento: 15000000` | Exibe `ObrasResumoCard` completo com montante em destaque (`R$ 15.0mi`), barra empilhada proporcional, 4 contadores e alerta destacado de paralisação (1 obra paralisada) | Sem erro |
| Município com obras mas sem nenhuma paralisada | `resumo` com `totalObras: 3`, `emExecucao: 2`, `concluidas: 1`, `paralisadas: 0` | Exibe card completo, barra empilhada sem segmento de paralisação e sem o banner de alerta de paralisação | Sem erro |
| Município sem obras no período | `resumo` com `totalObras: 0` ou `resumo: null` | Renderiza empty state elegante com ícone `AlertCircle`, mensagem neutra e link para o painel de obras | Sem erro |
| Obras com investimento zerado mas contagem > 0 | `valorTotalInvestimento: 0`, `totalObras: 2` | Barra proporcional empilhada calcula proporções com base na contagem de obras ao invés de valores zerados | Divisão por zero prevenida |

</intent-contract>

## Code Map

- `packages/db/src/queries/obras.ts` -- Linha 520: Função canônica `getResumoObrasPorPortal(portalSlug, filtros)` retornando `ResumoObrasDTO`. Reutilizada diretamente pelo loader.
- `apps/web/app/[portalSlug]/loader.ts` -- Linhas 159-194: Loader da Visão Geral `loadVisaoGeralData`. Adicionar `getResumoObrasPorPortal(tenantSlug, { ano: selectedYear })` ao array do `Promise.all` e propagar `resumoObras` no retorno.
- `apps/web/app/[portalSlug]/loader.spec.ts` -- Testes unitários do loader da Visão Geral. Adicionar mock de `getResumoObrasPorPortal` e asserção de chamada.
- `apps/web/app/[portalSlug]/view-model.tsx` -- Linhas 18-322: `buildVisaoGeralViewModel`. Receber `resumoObras` de `raw`, calcular deep link de obras (`obrasDetailUrl: routeUrl("/obras")`) e expor no DTO do view-model.
- `apps/web/app/[portalSlug]/view-model.spec.ts` -- Testes unitários do view-model da Visão Geral. Validar propagação de `resumoObras` e `obrasDetailUrl`.
- `apps/web/components/obras-resumo-card.tsx` -- Novo componente canônico de apresentação do resumo de obras na Visão Geral, implementando cabeçalho, destaque numérico, barra de progresso empilhada, legendas, alerta de paralisação e CTA.
- `apps/web/components/obras-resumo-card.spec.tsx` -- Testes unitários abrangentes de `ObrasResumoCard` cobrindo cenários com obras, obras paralisadas, obras sem paralisação e empty state.
- `apps/web/app/[portalSlug]/page.tsx` -- Linhas 64-83: Página da Visão Geral. Importar e renderizar `<ObrasResumoCard resumo={viewModel.resumoObras} detailUrl={viewModel.obrasDetailUrl} />` logo após `CardsSecundariosVisaoGeral` e antes de `RadarCivicoFeed`.
- `apps/web/app/[portalSlug]/page.spec.tsx` -- Testes da página inicial validando a renderização do card de obras e navegação.
- `apps/web/public/llms.txt` -- Atualizar seção 1.1 da Visão Geral para documentar o card resumo de obras públicas e indicadores de intervenções urbanas (Regra 12).
- `apps/web/public/llms-full.txt` -- Atualizar seção 1.1 da Visão Geral com detalhamento dos campos, barra de distribuição física e convenções do ObrasGov.br (Regra 12).

## Tasks & Acceptance

**Execution:**
- `apps/web/app/[portalSlug]/loader.ts` -- Integrar `getResumoObrasPorPortal` em `loadVisaoGeralData` via `Promise.all` -- Carregar dados oficiais de obras públicas de forma concorrente sem overhead de latência sequencial.
- `apps/web/app/[portalSlug]/loader.spec.ts` -- Atualizar testes do loader com mock de `getResumoObrasPorPortal` -- Garantir que a query é executada com os parâmetros corretos de portal e exercício.
- `apps/web/app/[portalSlug]/view-model.tsx` -- Mapear `resumoObras` e `obrasDetailUrl` em `buildVisaoGeralViewModel` -- Fornecer dados estruturados e links de navegação para a camada de apresentação.
- `apps/web/app/[portalSlug]/view-model.spec.ts` -- Adicionar testes de unidade para `resumoObras` no view-model -- Validar que dados são repassados e formatados sem mutações.
- `apps/web/components/obras-resumo-card.tsx` -- Criar componente `ObrasResumoCard` com design system padronizado -- Exibir métricas de obras, barra de progresso proporcional, alerta de paralisação e empty state.
- `apps/web/components/obras-resumo-card.spec.tsx` -- Criar suíte de testes unitários para `ObrasResumoCard` -- Cobrir renderização, cálculo de percentuais, alertas e acessibilidade.
- `apps/web/app/[portalSlug]/page.tsx` -- Inserir `ObrasResumoCard` entre `CardsSecundariosVisaoGeral` e `RadarCivicoFeed` -- Cumprir o layout canônico da página inicial conforme critérios da story.
- `apps/web/app/[portalSlug]/page.spec.tsx` -- Atualizar testes de integração da página da Visão Geral -- Assegurar que o card de obras é renderizado no fluxo principal da homepage.
- `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` -- Sincronizar documentação pública de IA com o novo card de obras -- Manter conformidade com a Regra 12 de governança documental.

**Acceptance Criteria:**
- Given a página inicial do portal municipal (`/[portalSlug]`), when a página é renderizada, then exibe uma seção de destaque dedicada de largura total (`ObrasResumoCard`), posicionada estrategicamente logo abaixo de `CardsSecundariosVisaoGeral` e antes de `RadarCivicoFeed`.
- And o card segue o design system do `SaldoCaixaResumoCard`: cabeçalho com título *"Obras Públicas e Investimentos Urbanos"*, subtítulo explicativo com a fonte oficial (*"Painel oficial de intervenções urbanas (ObrasGov.br)"*) e badge com link oficial externo para o ObrasGov.br.
- And exibe montante consolidado de investimento previsto formatado em tipografia `font-serif` (ex: `R$ 93.1mi`) via `fmtCompact`.
- And exibe barra proporcional horizontal (`role="progressbar"`) refletindo a distribuição do investimento previsto entre *Não iniciadas* (cinza), *Em execução* (azul), *Concluídas* (verde) e *Paralisadas* (vermelho/rosa).
- And exibe contadores e legendas com contagem de obras e montantes compactos (`kpis.emExecucao`, `kpis.paralisadas`, `kpis.concluidas`, `kpis.cadastradas`).
- And se houver obras paralisadas (`paralisadas > 0`), destaca visualmente um alerta específico informando a quantidade de obras paralisadas e o valor total retido.
- And disponibiliza call to action com link direto para a rota de obras (`/[portalSlug]/obras`): *"Ver mapa e detalhes das obras"*.
- And o data loader `loadVisaoGeralData` em `apps/web/app/[portalSlug]/loader.ts` consulta `getResumoObrasPorPortal` em paralelo via `Promise.all`.
- And caso o município não possua obras cadastradas no ObrasGov.br, renderiza empty state neutro e elegante no padrão do design system.
- And `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` documentam o novo card de obras na Visão Geral (Regra 12).
- And todos os testes de frontend e tipagem passam com sucesso (`pnpm --filter web test`, `pnpm build`, `tsc --noEmit`).

## Spec Change Log

## Review Triage Log

### 2026-10-11 — Review pass
- verdicts: 12 findings — high 0, medium 2, low 9, false 1, maybe-false 0
- findings:
  - `[medium]` `[patch]` Vazamento de detalhes de implementação e estilização em `llms.txt` e `llms-full.txt` (Violação da Regra 12) — Detalhes internos de código (nomes de componentes, props, tags DOM, classes CSS e expressões SQL) removidos, preservando foco cívico e de cidadania.
  - `[low]` `[patch]` Omissão de obras canceladas na contagem total, valores de investimento e barra proporcional — Verificado e tratado: a soma de valores categorizados é checada e há fallback seguro para contagem de obras evitando vazios na barra.
  - `[low]` `[patch]` Inconsistência de ordenação entre os segmentos da barra empilhada e os itens da legenda — Barra e legenda alinhadas na mesma sequência consistente: Em execução -> Concluídas -> Não iniciadas -> Paralisadas.
  - `[low]` `[patch]` Inadequação semântica e de acessibilidade no uso de `role="progressbar"` (`aria-valuenow` e `aria-label`) — `aria-label` ajustado para anunciar "Distribuição das obras" quando calculada por quantidade e "Distribuição do investimento" quando por valor, com `aria-valuenow` refletindo a conclusão.
  - `[low]` `[patch]` Propagação de filtro de entidade (`entidadesIds`) para `obrasDetailUrl` sem suporte da rota e sem alerta contextual no card — `obrasDetailUrl` construído com `buildNavUrl({ path: "/obras", slug: portalSlug, exercice: String(selectedYear), entidades: undefined })`.
  - `[false]` `[reject]` Ausência de exibição das métricas de avanço físico (`percentualMedioExecucaoFisica` e `obrasSemMedicaoCount`) — A especificação e critérios da Story 17.6 definem os elementos consolidados do card de resumo na homepage; a auditoria aprofundada de avanço físico pertence ao modal/rota dedicada de obras.
  - `[low]` `[patch]` Duplicação da URL oficial do painel ObrasGov.br — Centralizada a constante `OBRASGOV_PANEL_URL` no módulo de apresentação.
  - `[medium]` `[patch]` Risco de barra vazia quando o investimento total for positivo mas os estágios não possuírem valor discriminado — Adicionada checagem `totalCategoriasValor > 0` antes de calcular por valores, com fallback seguro para contagem de obras.
  - `[low]` `[patch]` Ausência de cobertura de testes para geração de `obrasDetailUrl` com filtros de entidade ativos — Teste unitário adicionado em `view-model.spec.ts` validando omissão de `entidades` na URL.
  - `[low]` `[patch]` `resumo.totalObras is negative instead of zero` — Atualizada a guarda do empty state para `if (!resumo || resumo.totalObras <= 0)`.
  - `[low]` `[patch]` `resumo contains canceladas > 0 unhandled by category breakdown and progressbar` — Agrupado com Finding 2; resolvido com fallback de contagem e verificação de valores válidos.
  - `[low]` `[patch]` Weak assertion on financial progress bar distribution in ObrasResumoCard — Adicionadas asserções específicas em `obras-resumo-card.spec.tsx` para o conteúdo exato de `aria-label`, `aria-valuenow` e valores monetários da legenda.

## Design Notes

- **Cálculo da Barra Proporcional de Investimento**:
  - Se `totalCategoriasValor > 0`: calcula percentuais dividindo os valores de cada categoria pelo valor total das categorias de investimento.
  - Se `totalCategoriasValor === 0` e `totalObras > 0`: calcula percentuais baseando-se na contagem de obras de cada categoria dividido por `totalObras`, evitando divisões por zero ou barras vazias.
- **Hierarquia Visual do Alerta de Paralisação**:
  - Quando `paralisadas > 0`, um card de alerta com borda e fundo em tons de rose (`border-rose-200 bg-rose-50/70 text-rose-950`) exibe a quantidade e o montante financeiro paralisado com o ícone `AlertTriangle`.
- **Acessibilidade**:
  - A barra empilhada implementa `role="progressbar"` com `aria-valuenow`, `aria-valuemin={0}`, `aria-valuemax={100}` e `aria-label` descritivo das fatias proporcionais, distinguindo distribuição de investimento de distribuição de obras.
- **Padrão de Links Externos e Navegação**:
  - Link externo para o ObrasGov.br centralizado na constante `OBRASGOV_PANEL_URL` com `target="_blank"`, `rel="noopener noreferrer"` e ícone `ExternalLink` (Regra 20).
  - Link interno de CTA utiliza `Link` do Next.js com `ArrowRight` e classe `text-accent`.

## Verification

**Commands:**
- `pnpm --filter web test` -- expected: Todos os testes unitários e de integração do frontend passam com sucesso
- `pnpm build` -- expected: Build de produção do Next.js conclui sem erros de tipagem TypeScript ou de compilação
- `pnpm lint` -- expected: Zero erros de lint em todo o repositório

## Auto Run Result

Status: done

### Summary of implemented change
Implementado o card resumo de obras públicas na página inicial municipal (`/[portalSlug]`), proporcionando aos cidadãos uma visão panorâmica e imediata dos investimentos urbanos em andamento, concluídos e paralisados na cidade. A implementação abrange:
1. Data Loader em `apps/web/app/[portalSlug]/loader.ts`: integração concorrente de `getResumoObrasPorPortal(tenantSlug, { ano: selectedYear })` no `Promise.all` de `loadVisaoGeralData`, propagando `resumoObras` sem introduzir gargalo sequencial.
2. View Model em `apps/web/app/[portalSlug]/view-model.tsx`: mapeamento de `resumoObras` e construção segura de `obrasDetailUrl` (`/[portalSlug]/obras?ano=...`) sem vazamento indevido do parâmetro `entidades`.
3. Componente de Apresentação `ObrasResumoCard` em `apps/web/components/obras-resumo-card.tsx`: desenvolvido em estrita conformidade com o design system do `SaldoCaixaResumoCard` (Regra 24), contendo cabeçalho institucional com link externo oficial para o ObrasGov.br (Regra 20), montante consolidado de investimentos em destaque serifado (`fmtCompact`), barra proporcional empilhada acessível (`role="progressbar"`), contadores por situação em ordem consistente, alerta visual destacado de paralisação (`paralisadas > 0`) e empty state neutro para municípios sem intervenções cadastradas.
4. Integração na Homepage em `apps/web/app/[portalSlug]/page.tsx`: posicionamento estratégico do card logo abaixo de `CardsSecundariosVisaoGeral` e imediatamente antes de `RadarCivicoFeed`.
5. Documentação pública para IA: sincronização síncrona de `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` sem detalhes internos de código (Regra 12).

### Files changed with one-line descriptions
- `apps/web/app/[portalSlug]/loader.ts`: Consulta de `getResumoObrasPorPortal` em paralelo no `Promise.all` da Visão Geral.
- `apps/web/app/[portalSlug]/loader.spec.ts`: Testes unitários do loader cobrindo a chamada a `getResumoObrasPorPortal`.
- `apps/web/app/[portalSlug]/view-model.tsx`: Mapeamento de `resumoObras` e geração de `obrasDetailUrl` sem parâmetro de entidades.
- `apps/web/app/[portalSlug]/view-model.spec.ts`: Testes unitários para `resumoObras` e higienização da URL de detalhe.
- `apps/web/components/obras-resumo-card.tsx`: Componente `ObrasResumoCard` com barra proporcional, contadores, alerta e empty state.
- `apps/web/components/obras-resumo-card.spec.tsx`: Testes unitários de `ObrasResumoCard` cobrindo cenários com e sem paralisação, fallback de contagem e empty state.
- `apps/web/app/[portalSlug]/page.tsx`: Inclusão do `ObrasResumoCard` na Visão Geral entre os cards secundários e o Radar Cívico.
- `apps/web/app/[portalSlug]/page.spec.tsx`: Testes de integração da página inicial validando a renderização do card e navegação.
- `apps/web/public/llms.txt`: Documentação sucinta do card de obras na Visão Geral para assistentes de IA.
- `apps/web/public/llms-full.txt`: Documentação detalhada dos indicadores e regras do painel de obras na Visão Geral.

### Review Findings Breakdown
- Patches aplicados: 11 findings corrigidos (2 medium, 9 low).
  - Medium (2): Limpeza de vazamentos de detalhes internos de código em `llms.txt` e `llms-full.txt` (Regra 12); Verificação de `totalCategoriasValor > 0` antes de calcular por valores na barra empilhada.
  - Low (9): Guarda de `totalObras <= 0` no empty state; alinhamento de ordenação entre barra e legenda; `aria-label` descritivo adaptativo ("Distribuição das obras" vs "Distribuição do investimento"); higienização de `obrasDetailUrl` removendo `entidades`; centralização de `OBRASGOV_PANEL_URL`; fortalecimento de asserções da barra e legenda em `obras-resumo-card.spec.tsx`; teste unitário em `view-model.spec.ts` para remoção de `entidades`; tratamento seguro de obras canceladas na barra de progresso.
- Itens rejeitados (1):
  - Ausência de exibição de métricas de avanço físico: rejeitado pois os critérios da Story 17.6 definem os elementos consolidados do card de resumo na homepage; o detalhamento técnico de avanço físico pertence ao modal da obra na rota `/obras`.
- Itens diferidos: 0.

### Follow-up Review Recommendation
- Recomendação: `true`.
- Justificativa e Risco Residual: Dois findings `medium` foram corrigidos nesta primeira passagem de revisão (adequação da documentação pública LLMs à Regra 12 e resiliência da barra proporcional a estágios sem valores discriminados). Risco residual baixo a moderado relativo à representação proporcional em municípios que possuam múltiplos projetos com dados de investimento incompletos ou datas ausentes no ObrasGov.br.

### Verification
- `pnpm --filter web test`: 94 arquivos de teste passaram, 743 testes aprovados (100% verde).
- `pnpm lint`: 364 arquivos checados com biome, 0 erros.
- `pnpm build`: Build de produção do Next.js concluído com sucesso.

