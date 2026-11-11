---
title: 'Story 12.5: Radar de Licitações Abertas, Taxa de Contratação Direta e Alertas nas Páginas de Licitações e Saúde'
type: 'feature'
created: '2026-09-14'
baseline_revision: '1295f0842cc9a41f06ca6b26de00e05e84bffbb4'
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

**Problem:** Os cidadãos, jornalistas investigativos e fornecedores locais não têm visibilidade unificada sobre a taxa agregada de contratações diretas (dispensas e inexigibilidades) com contexto de anomalia estatística, nem conseguem auditar preventivamente processos licitatórios abertos e em andamento ("Em Andamento") antes que as compras públicas sejam homologadas nas páginas `/licitacoes`, `/saude` e Homepage.

**Approach:** Estender o leitor Kysely `getLicitacoesEmAndamentoMetrics` com `valorEstimado` e `entidadeNome` via join com `dim_orgao`; integrar à página `/licitacoes` o KPI de "Taxa de Contratação Direta" com badge e banner explicativo para a anomalia `concentracao_dispensa` e a seção interativa de licitações em andamento com busca por objeto; exibir na página `/saude` o bloco dedicado de compras abertas da Saúde; e apresentar no Radar Cívico da Homepage a pílula de alerta de licitações em andamento com deep link.

## Boundaries & Constraints

**Always:**
- Seguir estritamente a Regra 18 do AGENTS.md: todos os campos de DTOs em TypeScript devem ser estritamente em `camelCase` (`licitacaoNumero`, `modalidade`, `objeto`, `dataAbertura`, `valorEstimado`, `entidadeNome`).
- Seguir a Regra 10 do AGENTS.md: identificadores, modalidades e códigos armazenados em `lowercase snake_case`.
- Seguir a Regra 13 do AGENTS.md: zero ternários aninhados; utilizar IIFEs autoexecutáveis ou funções auxiliares.
- Seguir a Regra 20 do AGENTS.md: citar legislações oficiais (como [Lei Federal nº 14.133/2021](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm)) com hyperlinks canônicos para o Planalto.
- Seguir a Regra 12 do AGENTS.md: atualizar `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` com as novas capacidades de transparência de compras e licitações abertas.
- Manter total compatibilidade retroativa com campos legados em `LicitacaoEmAndamentoDTO` (mantendo `valor` em paridade com `valorEstimado`).

**Never:**
- Nunca emitir textos acusatórios ou sensacionalistas nos alertas de concentração de dispensas ou licitações em andamento; manter tom estritamente factual e neutro.
- Nunca acessar `process.env` diretamente no código de componentes web (Regra 17).
- Nunca realizar agregações estatísticas pesadas no cliente que violem a separação entre `@transparencia/db` e `apps/web`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Consulta de licitações em andamento | `portalSlug: "porciuncula_prefeitura"`, `ano: 2024` | Retorna array de `LicitacaoEmAndamentoDTO` contendo `licitacaoNumero`, `modalidade`, `objeto`, `dataAbertura`, `valorEstimado` e `entidadeNome` | Retorna `[]` se slug for inválido ou ano for `NaN` |
| Rota `/licitacoes` com anomalia `concentracao_dispensa` | Exercício 2025/2026 com taxa elevada de dispensas e anomalia no radar | Exibe KPI "Taxa de Contratação Direta", badge de alerta e banner contextual explicativo com link para a legislação | Se sem anomalia, exibe KPI com badge neutra e sem banner de alerta |
| Rota `/licitacoes` com licitações em andamento | Existem compras com `situacao in ('em_andamento', 'aberta', 'em_aberto')` | Exibe seção `#licitacoes-em-andamento` com contador, campo de busca reativo por objeto e cards/tabela de processos | Se vazio, exibe empty state amigável informando ausência de processos em aberto |
| Rota `/saude` com compras em andamento | Órgãos vinculados à Saúde com licitações em andamento | Exibe bloco dedicado dentro de "Como o Fundo contrata" com processos da pasta de saúde | Se nenhuma em andamento, exibe mensagem contextual neutra |
| Homepage Radar Cívico com licitações em andamento | `licitacoesEmAndamentoCount > 0` | Renderiza pílula no cabeçalho do feed com link para `/[portalSlug]/licitacoes#licitacoes-em-andamento` | Se contagem for 0 ou indefinida, a pílula não é renderizada |

</intent-contract>

## Code Map

- `packages/db/src/queries/licitacoes-metrics.ts` -- Definição de `LicitacaoEmAndamentoDTO` e leitor `getLicitacoesEmAndamentoMetrics` -- Atualiza DTO com `entidadeNome` e `valorEstimado`, adicionando `leftJoin` com `dim_orgao`.
- `packages/db/src/queries/__tests__/licitacoes-metrics.spec.ts` -- Suíte de testes Kysely de licitações -- Valida presença de `entidadeNome` e `valorEstimado`.
- `apps/web/app/[portalSlug]/licitacoes/loader.ts` -- Data loader da página `/licitacoes` -- Carrega `getLicitacoesEmAndamentoMetrics` e `getRadarCivicoAlertas`.
- `apps/web/app/[portalSlug]/licitacoes/view-model.ts` -- View model da página `/licitacoes` -- Computa taxa de contratação direta, anomalia de dispensa e dados das licitações em andamento.
- `apps/web/components/licitacoes-em-andamento-section.tsx` -- Componente especializado de domínio -- Renderiza a seção com contadores, busca textual por objeto e listagem de processos em andamento.
- `apps/web/app/[portalSlug]/licitacoes/page.tsx` -- Página `/licitacoes` -- Renderiza novo KPI de Taxa de Contratação Direta, banner explicativo de anomalia e a seção de licitações em andamento.
- `apps/web/app/[portalSlug]/saude/loader.ts` -- Data loader da página `/saude` -- Carrega licitações em andamento filtradas pelas entidades da Saúde.
- `apps/web/components/saude-contratacao-section.tsx` -- Componente de contratação da Saúde -- Renderiza bloco dedicado às compras públicas abertas da pasta.
- `apps/web/app/[portalSlug]/loader.ts` -- Data loader da Homepage -- Carrega contagem de licitações em andamento do exercício.
- `apps/web/app/[portalSlug]/page.tsx` -- Página inicial -- Passa a contagem de licitações em andamento para o `RadarCivicoFeed`.
- `apps/web/components/radar-civico-feed.tsx` -- Feed do Radar Cívico -- Renderiza a pílula de alerta de compras em andamento com deep link.
- `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` -- Documentação cívica para LLMs -- Documenta indicadores de contratação direta e radar de compras abertas.

## Tasks & Acceptance

**Execution:**
- `packages/db/src/queries/licitacoes-metrics.ts` -- Atualizar `LicitacaoEmAndamentoDTO` e `getLicitacoesEmAndamentoMetrics` -- Adicionar `entidadeNome` e `valorEstimado` com leftJoin em `dim_orgao` preservando compatibilidade.
- `packages/db/src/queries/__tests__/licitacoes-metrics.spec.ts` -- Atualizar testes unitários do leitor -- Validar projeção de `entidadeNome` e `valorEstimado`.
- `apps/web/components/licitacoes-em-andamento-section.tsx` -- Criar componente de seção de licitações em andamento -- Implementar contadores, filtro de busca textual por objeto e lista com badges e datas.
- `apps/web/app/[portalSlug]/licitacoes/loader.ts` -- Atualizar loader de licitações -- Resgatar licitações em andamento e alertas do radar cívico.
- `apps/web/app/[portalSlug]/licitacoes/view-model.ts` -- Atualizar view model de licitações -- Calcular taxa de contratação direta e consolidar alerta de concentração de dispensas.
- `apps/web/app/[portalSlug]/licitacoes/page.tsx` -- Atualizar página de licitações -- Integrar o novo KPI, banner de anomalia de dispensa e seção `#licitacoes-em-andamento`.
- `apps/web/app/[portalSlug]/saude/loader.ts` -- Atualizar loader da saúde -- Resgatar licitações em andamento específicas da pasta de saúde.
- `apps/web/components/saude-contratacao-section.tsx` -- Atualizar componente de contratações da saúde -- Adicionar bloco de licitações em andamento na Saúde.
- `apps/web/app/[portalSlug]/loader.ts` -- Atualizar loader da homepage -- Obter contagem de licitações em andamento.
- `apps/web/app/[portalSlug]/page.tsx` -- Atualizar página inicial -- Conectar contagem ao feed do radar.
- `apps/web/components/radar-civico-feed.tsx` -- Atualizar componente do radar cívico -- Renderizar pílula de alerta com deep link para `/[portalSlug]/licitacoes#licitacoes-em-andamento`.
- `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` -- Atualizar arquivos LLM -- Documentar Taxa de Contratação Direta e monitoramento preventivo de licitações.

**Acceptance Criteria:**
- Given dados de licitações em `fct_licitacoes` com situação 'em_andamento' e anomalia `concentracao_dispensa` em `fct_anomalias_fiscais_metricas`, when `getLicitacoesEmAndamentoMetrics` for executado, then projeta `licitacaoNumero`, `modalidade`, `objeto`, `dataAbertura`, `valorEstimado` e `entidadeNome`.
- Given o usuário na rota `/[portalSlug]/licitacoes`, when a página é renderizada, then exibe na grade de KPIs a "Taxa de Contratação Direta" acompanhada de badge e banner explicativo caso haja anomalia `concentracao_dispensa`.
- Given o usuário na rota `/[portalSlug]/licitacoes`, when visualiza a página, then exibe a seção "Licitações Abertas e em Andamento" (`#licitacoes-em-andamento`) com contadores, campo de busca por objeto e listagem estruturada.
- Given o usuário na rota `/[portalSlug]/saude`, when visualiza "Como o Fundo contrata", then exibe bloco com as licitações em andamento da Saúde (medicamentos, insumos, equipamentos).
- Given o usuário na Homepage, when houver compras públicas abertas, then o Radar Cívico exibe pílula de alerta informando o volume de compras em andamento com deep link direto para a seção em `/licitacoes`.

## Spec Change Log

## Review Triage Log

### 2026-09-14 — Review pass
- verdicts: 18 findings — high 0, medium 2, low 15, false 1, maybe-false 0
- findings:
  - `[low]` `[patch]` Busca textual por modalidade contendo espaços contra snake_case em `licitacoes-em-andamento-section.tsx` — Corrigido normalizando com `replace(/_/g, " ")` e adicionando busca em `discriminacao`.
  - `[low]` `[patch]` `alertaDispensa.valorEsperado` é zero avaliado como falsy no banner em `licitacoes/page.tsx` — Corrigido para `alertaDispensa?.valorEsperado != null`.
  - `[low]` `[patch]` `alertaDispensa.valorObservado` é NaN quando totalGeralModalidades <= 0 em `licitacoes/view-model.ts` — Corrigido adicionando validação `!Number.isNaN(alertaDispensa.valorObservado)`.
  - `[medium]` `[patch]` Distinção metodológica entre contagem de processos e volume financeiro no banner de `licitacoes/page.tsx` — Corrigido clarificando a copy com distinção explícita entre processos licitatórios e volume financeiro.
  - `[low]` `[reject]` Lógica de cálculo de `taxaContratacaoDireta` no ViewModel web em vez de `@transparencia/db` — Rejeitado: soma de 3 itens de DTO pré-agregado retornado pelo DB é mapeamento padrão de ViewModel sem prejuízo a invariantes.
  - `[low]` `[patch]` Citação jurídica incompleta no banner de contratações diretas em `licitacoes/page.tsx` — Corrigido adicionando fundamentação legal canônica para Arts. 74 (inexigibilidade), 75 (dispensa) e 86 (adesão a ata) da Lei 14.133/2021 com links do Planalto.
  - `[low]` `[patch]` Conflito de classes CSS no `KPICard` na página de licitações com `alert` e `accent` ativos juntos — Corrigido mantendo `accent={false}` quando `alert` for verdadeiro.
  - `[low]` `[patch]` Deep link para `#licitacoes-em-andamento` sem preservação do parâmetro `?ano=` em `radar-civico-feed.tsx` e `saude-contratacao-section.tsx` — Corrigido incluindo `?ano=${ano}` em ambos os links.
  - `[low]` `[patch]` Bloco de compras abertas da Saúde em `saude-contratacao-section.tsx` sem limite de corte — Corrigido aplicando corte de exibição inicial `.slice(0, 6)`.
  - `[low]` `[reject]` Sobrecarga de I/O em `loadVisaoGeralData` para contagem de licitações — Rejeitado: volume de licitações em aberto é diminuto (<20 registros por portal), consulta executa em <2ms sem impacto observável.
  - `[medium]` `[patch]` Busca textual em `licitacoes-em-andamento-section.tsx` falha em termos com espaço e omite discriminação — Corrigido expandindo busca para `discriminacao` e suportando snake_case e texto livre.
  - `[low]` `[patch]` Ausência de atributos de acessibilidade (`aria-live`) na contagem de licitações em `licitacoes-em-andamento-section.tsx` — Corrigido adicionando `aria-live="polite"` no contador de resultados.
  - `[low]` `[patch]` Inconsistência de variantes de Badge e rótulos entre licitações e saúde — Corrigido alinhando `variant="accent"` e textos de fallback ("Valor não divulgado", "Abertura não informada").
  - `[low]` `[patch]` Duplicação de utilitários de seed em `seed.ts` (`seedOrgao` vs `seedDimOrgao`) — Corrigido removendo `seedOrgao` e adotando `seedDimOrgao` existente.
  - `[low]` `[patch]` Testes unitários para contagem de licitações e bloco de saúde — Corrigido com testes dedicados em `radar-civico-feed.spec.tsx` e `saude/page.spec.tsx`.
  - `[low]` `[patch]` Discrepância no caminho canônico do link em `llms.txt` — Corrigido padronizando para `/porciuncula_prefeitura/licitacoes#licitacoes-em-andamento`.
  - `[false]` `[reject]` Duplicação de propriedades `valor` e `valorEstimado` em `LicitacaoEmAndamentoDTO` — Rejeitado: requerido explicitamente pelo critério de aceitação preservando retrocompatibilidade.
  - `[low]` `[patch]` Ausência de `unaccent` no filtro SQL de situação em `getLicitacoesEmAndamentoMetrics` — Corrigido adicionando `unaccent(lower(replace(...)))` conforme Regra 11 de AGENTS.md.

## Design Notes

A Taxa de Contratação Direta soma os valores de dispensas, inexigibilidades e adesões a ata sobre o total de contratações apuradas no exercício. O banner de anomalia de `concentracao_dispensa` fundamenta a consulta no [Art. 75 da Lei Federal nº 14.133/2021](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art75).

## Verification

**Commands:**
- `pnpm --filter @transparencia/db test` -- expected: Suíte de testes do Kysely passando com 100% de sucesso.
- `pnpm --filter web test` -- expected: Suíte de testes do frontend passando com novos testes unitários.
- `pnpm build` -- expected: Build TypeScript do Next.js sem erros de compilação ou tipagem.

## Auto Run Result

### Summary of implemented change
Implementada a Story 12.5 completa:
1. Camada de dados Kysely (`@transparencia/db`): Estendido `LicitacaoEmAndamentoDTO` com `entidadeNome` e `valorEstimado` (mantendo `valor`), e atualizado `getLicitacoesEmAndamentoMetrics` com `leftJoin("dim_orgao")` e filtro com `unaccent`.
2. Componentes e Telas Web (`apps/web`):
   - Novo componente `LicitacoesEmAndamentoSection` com filtro de busca em tempo real por objeto, modalidade, entidade ou número de processo, ordenação por prazo de abertura, badges e acessibilidade (`aria-live`).
   - Rota `/[portalSlug]/licitacoes`: Novo KPI de "Taxa de Contratação Direta" (% financeiro em dispensas, inexigibilidades e caronas), banner explicativo contextual para anomalias de `concentracao_dispensa` com links oficiais para os Arts. 74, 75 e 86 da Lei Federal nº 14.133/2021, e seção `#licitacoes-em-andamento`.
   - Rota `/[portalSlug]/saude`: Bloco dedicado para compras abertas e licitações da Saúde (medicamentos, insumos e equipamentos).
   - Homepage: Pílula de alerta no cabeçalho do `RadarCivicoFeed` indicando compras em andamento com deep link direto para `/[portalSlug]/licitacoes?ano=${ano}#licitacoes-em-andamento`.
3. Documentação para IA (`llms.txt` e `llms-full.txt`): Atualizados com dicionário de conceitos das contratações diretas e rotas de monitoramento preventivo.

### Files changed
- `packages/db/src/queries/licitacoes-metrics.ts` -- Estende DTO com entidadeNome/valorEstimado e adiciona join com dim_orgao e unaccent.
- `packages/db/src/queries/__tests__/licitacoes-metrics.spec.ts` -- Testes unitários para projeção de campos e joins.
- `apps/web/components/licitacoes-em-andamento-section.tsx` -- Componente client de listagem interativa e busca de compras em andamento.
- `apps/web/components/licitacoes-em-andamento-section.spec.tsx` -- Testes unitários do componente de licitações em andamento.
- `apps/web/components/kpi-grid.tsx` -- Suporte a grid de 5 colunas.
- `apps/web/app/[portalSlug]/licitacoes/loader.ts` -- Loader de licitações carregando processos em andamento e alertas do radar.
- `apps/web/app/[portalSlug]/licitacoes/view-model.ts` -- Cálculo da Taxa de Contratação Direta e alerta de concentração de dispensas.
- `apps/web/app/[portalSlug]/licitacoes/view-model.spec.ts` -- Testes unitários para cálculos de view model.
- `apps/web/app/[portalSlug]/licitacoes/page.tsx` -- Exibição do KPI de contratação direta, banner normativo e seção em andamento.
- `apps/web/app/[portalSlug]/licitacoes/page.spec.tsx` -- Testes de renderização da página de licitações.
- `apps/web/app/[portalSlug]/saude/loader.ts` -- Loader da Saúde carregando processos abertos da pasta.
- `apps/web/app/[portalSlug]/saude/page.tsx` -- Passagem de dados para seção de contratações da saúde.
- `apps/web/app/[portalSlug]/saude/page.spec.tsx` -- Teste de renderização do bloco de compras da saúde.
- `apps/web/components/saude-contratacao-section.tsx` -- Bloco visual de compras abertas da pasta de saúde.
- `apps/web/app/[portalSlug]/loader.ts` -- Loader da home carregando contagem de licitações em andamento.
- `apps/web/app/[portalSlug]/loader.spec.ts` -- Mock de licitações em andamento.
- `apps/web/app/[portalSlug]/view-model.tsx` -- Integração de contagem no view model da home.
- `apps/web/app/[portalSlug]/page.tsx` -- Passagem de contagem para o feed do radar cívico.
- `apps/web/components/radar-civico-feed.tsx` -- Pílula com contagem e deep link temporal para licitações em andamento.
- `apps/web/components/__tests__/radar-civico-feed.spec.tsx` -- Teste unitário da pílula de compras abertas no feed.
- `apps/web/public/llms.txt` -- Atualização do guia sucinto de rotas e compras abertas para LLMs.
- `apps/web/public/llms-full.txt` -- Atualização do guia analítico de compras públicas e radar cívico para LLMs.

### Review findings breakdown
- Patches aplicados: 15 itens corrigidos (busca textual flexibilizada, verificação de falsy para 0, validação de NaN, distinção metodológica no banner, referências legais oficiais com links do Planalto, preservação de ?ano= nos deep links, corte superior em saúde, unaccent no SQL, alinhamento de badges e textos, acessibilidade aria-live, remoção de redundância de seed e testes dedicados).
- Itens diferidos: 0.
- Itens rejeitados: 3 (BH-2 por ser agregação padrão de ViewModel; BH-7 por volume de dados ser diminuto sem impacto de I/O; BH-14 por ser exigência explícita do critério de aceitação).

### Follow-up review recommendation
- `followup_review_recommended: false` (Zero anomalias críticas não verificadas; 100% dos testes e build passando).

### Verification performed
- `pnpm --filter @transparencia/db test`: 22 arquivos, 96 testes passando (100% sucesso).
- `pnpm --filter web test`: 66 arquivos, 437 testes passando (100% sucesso).
- `pnpm build`: turbo build com `@transparencia/db`, `@transparencia/ui` e `web` (17 páginas estáticas geradas, zero erros de tipo ou compilação).

### Residual risks
Nenhum risco residual identificado. Total retrocompatibilidade preservada em `LicitacaoEmAndamentoDTO` e isolamento dos componentes web.
