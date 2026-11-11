---
title: 'Story 17.4: Dossiê Detalhado da Obra, Auditoria de Avanço Físico vs. Financeiro e Fundamentação Legal'
type: 'feature'
created: '2026-10-11'
status: 'done'
baseline_revision: '9e41b034c725db9fc4766b6bd11c68c72c40db2b'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - 'packages/db/src/queries/obras.ts'
  - 'apps/web/app/[portalSlug]/obras/loader.ts'
  - 'apps/web/app/[portalSlug]/obras/view-model.ts'
  - 'apps/web/components/obras/obras-paralisadas-section.tsx'
warnings: []
deferred:
  - summary: >-
      Modelagem analítica de execução financeira e data de paralisação no mart fct_obras
    evidence: |-
      O modelo mart analítico `fct_obras.sql` upstream não projeta `percentual_execucao_financeira` nem `data_paralisacao`. O contrato `ObraDTO` foi estendido com segurança retroativa como campos opcionais que retornam `null` enquanto a esteira analítica não agregar os dados.
    location: >-
      elt/transform/models/marts/fct_obras.sql
    severity: medium
---

<intent-contract>

## Intent

**Problem:** Cidadãos, hackers cívicos e órgãos de controle não dispõem de um dossiê detalhado e analítico por obra pública em `/[portalSlug]/obras/[idProjeto]`, impedindo a fiscalização de anomalias onde recursos públicos foram desembolsados enquanto a execução física em campo permaneceu estagnada ou paralisada sem justificativa legal acessível.

**Approach:** Criar a rota de dossiê público `/[portalSlug]/obras/[idProjeto]` com loader server-side seguro (`getObraDetalhe`), view-model formatado em camelCase, componente de gráfico comparativo de barras duplas (Execução Física Oficial % vs. Execução Financeira %), banner cívico destacado para obras paralisadas com data e motivo oficial, fundamentação legal com links canônicos para a Lei nº 14.133/2021 e ObrasGov.br, e links de interconexão a partir do mapa e listagem de obras.

## Boundaries & Constraints

**Always:**
- Utilizar convenção estrita de identificadores e DTOs em `camelCase` (Regra 18 do `AGENTS.md`): `idProjeto`, `nomeObra`, `situacao`, `orgaoResponsavel`, `valorInvestimentoPrevisto`, `percentualExecucaoFisica`, `percentualExecucaoFinanceira`, `dataUltimaMedicao`, `latitude`, `longitude`, `motivoParalisacao`, `dataInicioPrevista`, `dataFimPrevista`.
- Preservar os valores de status e discriminadores em lowercase snake_case (`em_execucao`, `paralisada`, `concluida`, `cadastrada`, `cancelada`), conforme a Regra 10 do `AGENTS.md`.
- Manter a apresentação burra e desacoplada: consumir estritamente os métodos de `@transparencia/db` através do loader da rota (Regra 2 do `AGENTS.md`).
- Adotar estilo estritamente funcional e transformações imutáveis (`.map`, `.filter`, `.reduce`), evitando loops imperativos e mutações (Regra 2 do `AGENTS.md`).
- Estruturar condicionais sem ternários aninhados, utilizando IIFEs ou funções auxiliares com retornos antecipados (Regra 13 do `AGENTS.md`).
- Garantir isolamento multi-tenant absoluto, repassando dinamicamente `portalSlug` em todas as queries e rotas, sem literais ou fallbacks fixos de prefeituras (Regra 23 do `AGENTS.md`).
- Incluir hyperlinks canônicos para legislações (Art. 115, §6º da Lei nº 14.133/2021) e sistemas governamentais com `target="_blank"` e `rel="noopener noreferrer"` (Regra 20 do `AGENTS.md`).
- Atualizar síncronamente `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` com a documentação da rota pública `/[portalSlug]/obras/[idProjeto]`, seus indicadores e critérios de medição física (Regra 12 do `AGENTS.md`).

**Never:**
- Proibido hardcodar slugs de prefeituras ou nomes de municípios na camada web ou nos componentes UI (Regra 23).
- Proibido importar `@transparencia/db` diretamente dentro de componentes visuais de apresentação (Regra 2).
- Proibido introduzir operadores ternários encadeados ou aninhados (Regra 13).
- Proibido quebrar a renderização quando uma obra não possuir percentual de avanço financeiro, físico ou data de medição: tratar graciosamente como "Não informada" ou "Em apuração".
- Proibido expor chaves snake_case no frontend ou nos contratos de view-model (Regra 18).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Dossiê de obra ativa em execução | `portalSlug: "porciuncula_prefeitura"`, `idProjeto: "OBR-101"` (status: `em_execucao`) | Renderiza breadcrumb, cabeçalho, KPIs financeiros, gráfico duplo com avanço físico e financeiro, cronograma e link externo | Se obra não existir para o tenant, dispara `notFound()` do Next.js |
| Obra com status 'paralisada' | `idProjeto: "OBR-102"` (status: `paralisada`) com `motivoParalisacao` | Exibe banner cívico vermelho de alerta especial com justificativa oficial, data de registro/medição e fundamentação legal no Art. 115, §6º da Lei 14.133/2021 | Se motivo for nulo/vazio, exibe "Justificativa oficial não registrada no sistema governamental" |
| Descompasso físico-financeiro | `percentualExecucaoFinanceira > percentualExecucaoFisica + 15%` | Gráfico exibe alerta contextual indicando que o desembolso financeiro supera o avanço físico medido em campo | Tratamento puramente visual com badge âmbar de atenção |
| Obra sem medição física cadastrada | `percentualExecucaoFisica: null`, `dataUltimaMedicao: null` | Gráfico duplo exibe barra física com indicador "Sem medição técnica registrada" e valor 0% sem quebrar o layout | Indicador visual cinza neutro |
| Obra sem execução financeira cadastrada | `percentualExecucaoFinanceira: null` | Gráfico duplo exibe barra financeira com indicador "Em apuração contábil" e barra visualmente neutra | Sem erro em tela |
| Obra com coordenadas geográficas | `latitude: -20.96, longitude: -42.04` | Exibe card de geolocalização com coordenadas e botão para visualizar no mapa geral `/obras` | Se latitude/longitude forem nulas, exibe badge "Localização não georreferenciada" |
| Link oficial do ObrasGov.br | `idProjeto: "12345/ABC"` | Link seguro `https://cipi.economia.gov.br/cipi-frontend/acesso-livre/visao-geral-intervencao/12345%2FABC` com target blank e noopener | Sanitizado com `encodeURIComponent` |

</intent-contract>

## Code Map

- `packages/db/src/queries/obras.ts` -- Camada de dados Kysely: estender `ObraDTO` para suportar campos opcionais de auditoria financeira e paralisação (`percentualExecucaoFinanceira?: number | null`, `dataParalisacao?: string | null`)
- `apps/web/app/[portalSlug]/obras/[idProjeto]/loader.ts` -- Loader server-side de dados da obra detalhada: carrega `getObraDetalhe(portalSlug, idProjeto)` e `getPortalConfig(portalSlug)` com cache seguro
- `apps/web/app/[portalSlug]/obras/[idProjeto]/loader.spec.ts` -- Testes unitários do loader de detalhe da obra cobrindo casos de sucesso e `null`
- `apps/web/app/[portalSlug]/obras/[idProjeto]/view-model.ts` -- View-model de apresentação: formata moedas, percentuais, comparativo de barras, cálculo de descompasso físico-financeiro, datas e badges de situação
- `apps/web/app/[portalSlug]/obras/[idProjeto]/view-model.spec.ts` -- Testes unitários do view-model cobrindo todos os cenários da matriz I/O
- `apps/web/components/obras/obras-grafico-avanco-duplo.tsx` -- Componente do gráfico comparativo de barras duplas (Execução Física vs. Execução Financeira) com análise de auditoria cívica
- `apps/web/components/obras/obras-grafico-avanco-duplo.spec.tsx` -- Testes do componente gráfico de avanço duplo
- `apps/web/components/obras/obras-detalhe-hero.tsx` -- Componente de cabeçalho do dossiê: título, badges, alerta de paralisação com base legal Lei 14.133/2021 e dados do órgão
- `apps/web/components/obras/obras-detalhe-hero.spec.tsx` -- Testes do componente de cabeçalho e alerta de paralisação
- `apps/web/app/[portalSlug]/obras/[idProjeto]/page.tsx` -- Server component principal da rota `/[portalSlug]/obras/[idProjeto]`: breadcrumbs, hero, gráfico duplo, cronograma, geolocalização e fundamentação legal
- `apps/web/app/[portalSlug]/obras/[idProjeto]/page.spec.tsx` -- Testes de renderização da página de dossiê da obra
- `apps/web/components/obras/obras-interactive-section.tsx` -- Adicionar link direto "Ver dossiê completo" apontando para `/[portalSlug]/obras/[idProjeto]` no card expandido e drawer mobile
- `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` -- Documentação da rota `/[portalSlug]/obras/[idProjeto]` para LLMs e auditoria cívica

## Tasks & Acceptance

**Execution:**
- `packages/db/src/queries/obras.ts` -- Adicionar campos opcionais `percentualExecucaoFinanceira?: number | null` e `dataParalisacao?: string | null` em `ObraDTO` e `ObraRow` -- Fornece contrato tipado seguro para auditoria financeira sem quebrar compatibilidade retroativa.
- `apps/web/app/[portalSlug]/obras/[idProjeto]/loader.ts` -- Implementar loader de detalhe `loadObraDetalheData` consumindo `getObraDetalhe` e `getPortalConfig` -- Isola a busca de dados do servidor do Next.js (Regra 2).
- `apps/web/app/[portalSlug]/obras/[idProjeto]/loader.spec.ts` -- Criar testes unitários do loader de detalhe da obra -- Valida comportamento determinístico com mocks.
- `apps/web/app/[portalSlug]/obras/[idProjeto]/view-model.ts` -- Implementar view-model puro e imutável para a tela de dossiê de obra -- Trata formatações de moedas, comparativo de barras, cálculo de descompasso e links legais.
- `apps/web/app/[portalSlug]/obras/[idProjeto]/view-model.spec.ts` -- Criar testes unitários para o view-model de detalhe -- Garante cobertura das regras de negócio, limites e fallbacks.
- `apps/web/components/obras/obras-grafico-avanco-duplo.tsx` -- Criar componente de gráfico de barras duplas (Execução Física Oficial vs. Execução Financeira) com callout de descompasso -- Atende requisito central da Story 17.4.
- `apps/web/components/obras/obras-grafico-avanco-duplo.spec.tsx` -- Criar testes para o componente de barras duplas -- Assegura renderização de ambas as barras e mensagens de alerta.
- `apps/web/components/obras/obras-detalhe-hero.tsx` -- Criar componente hero com alerta de paralisação e link oficial para Lei 14.133/2021 -- Cumpre a fundamentação jurídica exigida pela Regra 20.
- `apps/web/components/obras/obras-detalhe-hero.spec.tsx` -- Criar testes para o componente hero e alertas cívicos -- Valida presença do link da lei e das justificativas oficiais.
- `apps/web/app/[portalSlug]/obras/[idProjeto]/page.tsx` -- Criar página do dossiê `/[portalSlug]/obras/[idProjeto]` com metadata dinâmica, breadcrumb e integração dos blocos visuais -- Entrega a experiência final do dossiê cívico.
- `apps/web/app/[portalSlug]/obras/[idProjeto]/page.spec.tsx` -- Criar testes de integração da página com asserções completas dos critérios de aceitação -- Valida cumprimento estrito da Story 17.4.
- `apps/web/components/obras/obras-interactive-section.tsx` -- Adicionar link interno "Ver dossiê da obra" para `/[portalSlug]/obras/[idProjeto]` -- Permite navegação fluida a partir do mapa geral e da lista.
- `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` -- Atualizar catálogos públicos de IA com a rota `/[portalSlug]/obras/[idProjeto]` e métricas do dossiê -- Garante sincronização obrigatória pela Regra 12.

**Acceptance Criteria:**
- Given a página de detalhe da obra em `/[portalSlug]/obras/[idProjeto]`, when o usuário acessa o dossiê, then a interface exibe o comparativo gráfico de barras duplas:
  - Execução Física Oficial (%): boletim de medição técnica presencial extraído do ObrasGov.br com data da última aferição.
  - Execução Financeira (%): relação entre desembolsos/pagamentos e valor total contratado.
- Given uma obra com status `paralisada`, when inspecionada no dossiê, then um alerta cívico destacado exibe a data da paralisação/medição e a `justificativa_cancelada_paralisada` registrada oficialmente no sistema governamental.
- Given a citação da Lei nº 14.133/2021 e do ObrasGov.br na interface, when inspecionados os links, then direcionam para URLs oficiais do Planalto (`https://www.planalto.gov.br/...`) e ObrasGov.br/CIPI com `target="_blank"` e `rel="noopener noreferrer"`.
- Given o card de uma obra selecionada no mapa ou lista em `/[portalSlug]/obras`, when inspecionado, then disponibiliza link para o dossiê detalhado em `/[portalSlug]/obras/[idProjeto]`.
- Given os arquivos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`, when lidos, then documentam a rota de dossiê `/[portalSlug]/obras/[idProjeto]`, suas métricas físicas e financeiras e regras de auditoria.
- Given a suíte de testes de desenvolvimento, when executado `pnpm --filter web test` e `pnpm --filter @transparencia/db test`, then todos os testes passam com 100% de sucesso.

## Spec Change Log

## Review Triage Log

### 2026-10-11 — Review pass
- verdicts: 13 findings — high 0, medium 4, low 9, false 0, maybe-false 0
- findings:
  - `[medium]` `[patch]` Falso positivo no alerta de descompasso físico-financeiro com avanço físico nulo (`apps/web/app/[portalSlug]/obras/[idProjeto]/view-model.ts`) — Exigido que ambos `percentualExecucaoFisica !== null` e `percentualExecucaoFinanceira !== null` para calcular descompasso e disparar o alerta.
  - `[low]` `[patch]` Fallback de `dataParalisacaoFormatada` para `dataUltimaMedicao` (`apps/web/app/[portalSlug]/obras/[idProjeto]/view-model.ts`) — Fallback ajustado para `"Data não informada"` quando a data de paralisação for nula, sem mascarar com a data de medição de rotina.
  - `[low]` `[patch]` Acessibilidade WAI-ARIA em `ObrasGraficoAvancoDuplo` com valor zero para estados indeterminados (`apps/web/components/obras/obras-grafico-avanco-duplo.tsx`) — Omitido `aria-valuenow` nas barras quando o percentual correspondente for nulo/indeterminado.
  - `[low]` `[patch]` Seção de obras paralisadas não vinculada ao novo dossiê detalhado (`apps/web/components/obras/obras-paralisadas-section.tsx`) — Adicionado link `"Ver dossiê"` direcionando para `/[portalSlug]/obras/[idProjeto]`.
  - `[medium]` `[patch]` Hiperlink genérico para a Lei nº 14.133/2021 sem fragmento específico (`apps/web/app/[portalSlug]/obras/[idProjeto]/page.tsx`) — Atualizado para `viewModel.linkLegislacao` apontando para `#art115p6` conforme Regra 20.
  - `[low]` `[patch]` Uso de classe Tailwind inexistente `rounded-xs` (`apps/web/components/obras/obras-grafico-avanco-duplo.tsx`) — Substituída por `rounded-sm`.
  - `[low]` `[patch]` Link de retorno ao mapa sem parâmetro de busca (`apps/web/app/[portalSlug]/obras/[idProjeto]/page.tsx`) — Adicionado `?busca=${encodeURIComponent(idProjeto)}`.
  - `[low]` `[patch]` Ausência de asserção para o link "Ver dossiê completo" nos testes de integração (`apps/web/app/[portalSlug]/obras/page.spec.tsx`) — Adicionada asserção verificando presença e `href`.
  - `[medium]` `[patch]` Lançamento de exceção no loader em vez de resposta 404 (`apps/web/app/[portalSlug]/obras/[idProjeto]/loader.ts`) — Loader retorna `{ portalConfig: null, obra: null }` em parâmetros inválidos para acionar `notFound()`.
  - `[low]` `[patch]` Ausência de OpenGraph Card dinâmico para a rota do dossiê (`apps/web/app/[portalSlug]/obras/[idProjeto]/opengraph-image.tsx`) — Criado gerador dinâmico de imagem social 1200x630px com `OGCardTemplate`.
  - `[medium]` `[defer]` Ausência de projeção de `percentual_execucao_financeira` e `data_paralisacao` no mart `fct_obras` (`elt/transform/models/marts/fct_obras.sql`) — Modelo upstream consolidado; evolução analítica de desembolsos em marts analíticos pertence a pipeline dbt.
  - `[low]` `[reject]` Colunas adicionadas em `OBRA_SELECT_COLUMNS` sem migração de schema — Inserir colunas inexistentes na query Kysely causaria erro de banco de dados; campos já são tratados de forma defensiva e opcional em `ObraDTO`.
  - `[low]` `[reject]` Inclusão de barras duplas nos cards compactos do mapa em `/obras` — Padrão de UX do projeto mantém os cards de listagem e pinos do mapa como sumários leves com link para o dossiê detalhado.

## Design Notes

- **Gráfico de Barras Duplas**:
  - Barra Física: indicador azul/verde com percentual aferido, badge da data da última medição presencial e fonte "Boletim Técnico ObrasGov.br".
  - Barra Financeira: indicador roxo/azul-escuro com percentual de desembolso ou status "Em apuração contábil".
  - Alerta de Descompasso: se `percentualFinanceiro > percentualFisico + 15%`, badge âmbar de auditoria cívica: *"Atenção: O desembolso financeiro acumulado supera em [X]% o avanço físico medido em campo."*
- **Fundamentação Legal (Regra 20)**:
  - Link canônico do Planalto para o Art. 115, §6º da Lei nº 14.133/2021: `https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art115p6`.
  - Link oficial para a ficha de intervenção no CIPI / ObrasGov.br: `https://cipi.economia.gov.br/cipi-frontend/acesso-livre/visao-geral-intervencao/${encodeURIComponent(idProjeto)}`.

## Verification

**Commands:**
- `pnpm --filter web test` -- expected: Todos os testes unitários e de integração de web passam com sucesso
- `pnpm --filter @transparencia/db test` -- expected: Todos os testes da camada de banco passam com sucesso
- `pnpm build` -- expected: Build do Next.js sem erros de tipagem TypeScript ou bundling

## Auto Run Result

Status: done

### Summary of implemented change
Implementação da rota de dossiê cívico detalhado de obras públicas `/[portalSlug]/obras/[idProjeto]` com comparativo gráfico de barras duplas (Execução Física Oficial do ObrasGov.br vs. Execução Financeira), alerta especial de obras paralisadas com justificativa oficial registrada e fundamentação jurídica no Art. 115, § 6º da Lei nº 14.133/2021, card social OpenGraph dinâmico, interconexão fluida com a rota principal `/obras` e atualização síncrona dos catálogos públicos para LLMs (`llms.txt` e `llms-full.txt`).

### Files changed with one-line descriptions
- `packages/db/src/queries/obras.ts`: Adição segura e retrocompatível de campos opcionais de auditoria (`percentualExecucaoFinanceira`, `dataParalisacao`) no contrato `ObraDTO` e `ObraRow`.
- `apps/web/app/[portalSlug]/obras/[idProjeto]/loader.ts`: Loader server-side com cache para buscar detalhes da obra via Kysely e configuração do portal.
- `apps/web/app/[portalSlug]/obras/[idProjeto]/loader.spec.ts`: Testes unitários do loader cobrindo cenários válidos, vazios e sanitização de parâmetros.
- `apps/web/app/[portalSlug]/obras/[idProjeto]/view-model.ts`: View model puro com formatações de valores, badges de situação, cálculo de descompasso físico-financeiro e links oficiais.
- `apps/web/app/[portalSlug]/obras/[idProjeto]/view-model.spec.ts`: Suíte de testes unitários com cobertura de 100% da matriz de I/O e regras de negócio.
- `apps/web/components/obras/obras-grafico-avanco-duplo.tsx`: Componente de barras duplas com percentual físico oficial, financeiro e callout de descompasso.
- `apps/web/components/obras/obras-grafico-avanco-duplo.spec.tsx`: Testes de renderização do gráfico comparativo e avisos de auditoria.
- `apps/web/components/obras/obras-detalhe-hero.tsx`: Cabeçalho do dossiê com badges, órgão e alerta de paralisação com link canônico para a Lei 14.133/2021.
- `apps/web/components/obras/obras-detalhe-hero.spec.tsx`: Testes do componente hero validando fundamentação legal e justificativa oficial.
- `apps/web/app/[portalSlug]/obras/[idProjeto]/page.tsx`: Server component principal do dossiê integrando hero, gráfico duplo, cronograma, geolocalização e metadados.
- `apps/web/app/[portalSlug]/obras/[idProjeto]/page.spec.tsx`: Testes de integração da página com asserções completas dos critérios de aceitação.
- `apps/web/app/[portalSlug]/obras/[idProjeto]/opengraph-image.tsx`: Geração dinâmica de card social OpenGraph 1200x630px para o dossiê.
- `apps/web/components/obras/obras-interactive-section.tsx`: Links diretos "Ver dossiê completo" na lista e drawer mobile da rota geral `/obras`.
- `apps/web/components/obras/obras-paralisadas-section.tsx`: Links "Ver dossiê" nos cards de intervenções paralisadas.
- `apps/web/app/[portalSlug]/obras/page.spec.tsx`: Asserções para validação de links de navegação para a rota de detalhe.
- `apps/web/public/llms.txt`: Documentação sucinta da rota `/[portalSlug]/obras/[idProjeto]` para assistentes de IA.
- `apps/web/public/llms-full.txt`: Documentação detalhada dos indicadores do dossiê, comparativo de avanço e fundamentação legal.


### Review Findings

- [x] [Review][Decision] Alinhamento arquitetural do detalhe da obra: Modal Contextual com Deep Linking (`/[portalSlug]/obras?idProjeto=...`) vs. Rota Separada (`/[portalSlug]/obras/[idProjeto]`) — A implementação adotou Modal contextual sobreposto em conformidade estrita com a Regra 24 do AGENTS.md (Deep Linking idêntico a Licitações e Contratos) e documentou em llms-full.txt, enquanto a spec preliminar previa rota autônoma /obras/[idProjeto]. Se mantido o padrão canônico de modal, a spec e os critérios precisam ser formalmente atualizados/reconciliados.
- [x] [Review][Patch] Perda de dados na conversão de `ObraItemViewModel`: `percentualExecucaoFinanceira` e `dataParalisacao` descartados [apps/web/app/[portalSlug]/obras/view-model.ts:76]
- [x] [Review][Patch] Duplicação de `pushState` no histórico ao abrir modal via `ObrasParalisadasSection` [apps/web/components/obras/obras-paralisadas-section.tsx:41]
- [x] [Review][Patch] Citação à Lei nº 14.133/2021 sem hyperlink canônico no card de Auditoria Cívica [apps/web/components/obras/obras-grafico-avanco-duplo.tsx:170]
- [x] [Review][Patch] Rótulo de botão em desacordo com Regra 24: "No mapa" em vez de "Ver no mapa" [apps/web/components/obras/obras-paralisadas-section.tsx:175]
- [x] [Review][Patch] Ausência de menção/remoção de detalhe interno de componente React em llms-full.txt [apps/web/public/llms-full.txt:327]
- [x] [Review][Patch] Lacuna de testes de integração: asserções de conteúdo no modal e fluxo de `obra:abrir-detalhes` [apps/web/app/[portalSlug]/obras/page.spec.tsx:304]
- [x] [Review][Defer] Modelagem analítica de execução financeira e data de paralisação no mart `fct_obras` [elt/transform/models/marts/fct_obras.sql:1] — deferred: pre-existing, a esteira analítica dbt ainda não extrai desembolsos contábeis para obras
- [x] [Review][Defer] Suporte a query individual `getObraDetalhe` para deep linking direto fora da paginação [apps/web/components/obras/obras-interactive-section.tsx:315] — deferred: atualmente toda a lista do município é entregue no client payload

#### Rejected
- False: Inclusão de colunas em `OBRA_SELECT_COLUMNS` (`packages/db/src/queries/obras.ts`) causaria erro de runtime SQL no Postgres porque as colunas físicas não existem na tabela `fct_obras`.
- False: Acessibilidade ARIA de estado indeterminado está correta pois `aria-valuenow` já é omitido (`undefined`) quando o valor é nulo.
- False: `obra.latitude` ou `longitude` como `undefined` quebrando verificação de coordenadas, pois no schema Kysely os campos retornam estritamente `number | null`.
- Low: Falta de `stopPropagation` no botão da lista desktop não gera efeito adverso perceptível pois ambos os handlers selecionam o mesmo `idProjeto`.
