# Epic 18 Context: Tema Canônico da Educação Básica, Desempenho Pedagógico (IDEB/SAEB) e Responsabilidade Fiscal (MDE/FUNDEB)

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Estruturar o tema canônico da Educação no MaisTransparência, integrando dados oficiais de desempenho pedagógico do INEP/MEC (série histórica do IDEB, proficiências Saeb de Português e Matemática, fluxo escolar) com a execução orçamentária municipal da Função 12 (Educação). O tema audita os limites constitucionais (MDE 25% e FUNDEB 70%), calcula o custo anual por aluno e entrega uma experiência cívica acessível e institucional (sem nomes de agentes políticos), com página dedicada, card na home e documentação para LLMs.

## Stories

- Story 18.1: Ingestão de dados do INEP, seed dbt e workflow de atualização automatizada
- Story 18.2: Fato analítica de métricas educacionais e cruzamento orçamentário (`fct_educacao_metricas`)
- Story 18.3: Camada de dados Kysely com contratos tipados em camelCase
- Story 18.4: Página temática da Educação (`/[portalSlug]/educacao`)
- Story 18.5: Card resumo de Educação na homepage e sincronização de contexto para LLMs
- Story 18.6: Consistência de dados e textos da Educação (etapa do IDEB, formatação compacta pt-BR)
- Story 18.7: Linha de totais fixa nas tabelas de contratos/emendas e emendas parlamentares da Educação com rastreabilidade de empenhos

## Requirements & Constraints

- Dados do IDEB (ciclos bienais, anos iniciais e finais) vêm de seed versionado do INEP, atualizado por workflow mensal leve e idempotente que abre PR quando surge novo ciclo.
- Nunca misturar etapas de ensino: indicador dos anos iniciais não pode ser preenchido com dados dos anos finais; ausência de dado exibe "—" ou oculta o indicador.
- A home e a página exibem apenas indicadores vigentes; não documentar nem exibir percentual de MDE ou custo por aluno onde a UI não os mostra. Textos públicos e card OpenGraph devem refletir somente o que a página apresenta.
- Valores compactos seguem pt-BR (vírgula decimal, ex.: `R$ 33,3 mi`), consistentes com `fmtCurrency`, `fmtPercent`, `fmtNumber`.
- Tabelas de contratos e emendas da Educação exibem linha fixa de totais (empenhado, liquidado, pago, saldo pendente; autorizado e empenhado nas emendas) calculada sobre os registros filtrados, independente de paginação.
- Emendas parlamentares da Educação seguem o padrão das da Saúde: KPIs, coluna de rastreabilidade (qtd. de empenhos) e modal "Detalhes" com notas de empenho vinculadas e deep link por query param.
- Links oficiais (planalto.gov.br) com `target="_blank"`, `rel="noopener noreferrer"` e ícone para Art. 212 e 212-A da CF/88.
- Sem nomes de prefeitos/agentes políticos; sem UF, município, ano ou médias estaduais hard-coded (rótulos e intervalos dinâmicos).
- Todo build/teste deve passar: `pnpm build`, `tsc --noEmit`, `make test/ts`, `make test`, `make db/fixture/check`.

## Technical Decisions

- Lógica contábil e cruzamentos ficam em dbt/`@transparencia/db`; a camada de apresentação apenas renderiza DTOs tipados.
- `fct_educacao_metricas`: tabela física, grão `portal_slug` + `ano` + `etapa_ensino`, join sempre com predicado de tenant; métricas de crescimento via `LAG()`; custo por aluno = despesa liquidada da Função 12 / matrículas (com `nullif`). Testes `not_null`/`unique` na chave surrogate.
- Staging `stg_inep__ideb` em snake_case; seed declarado em `seeds.yml` com tipos estritos.
- Leitores Kysely (`getEducacaoMetrics`, `getResumoEducacao`) filtram por `portal_slug`, DTOs em camelCase estrito (`etapaEnsino: 'anosIniciais' | 'anosFinais'`); classificação das emendas da Educação e vínculo com empenhos ficam em `@transparencia/db` (reuso de `EmendaEmpenhoItemDTO`).
- Componentes de domínio em `apps/web/components/`; `packages/ui` só primitivas genéricas (a linha de totais compartilhada pode ir para qualquer um dos dois). Loaders co-localizados em `apps/web`; `loadVisaoGeralData` busca o resumo da educação em paralelo via `Promise.all`.
- Mudança em marts/seeds exige `make db/fixture/dump` para regerar `schema.sql.gz`; novas rotas/indicadores exigem atualizar `apps/web/public/llms.txt` e `llms-full.txt`.
- Condicionais complexas na UI via IIFE/helper (sem ternários aninhados); vocabulário padrão ("Detalhes", "Ver detalhes") e `ModalDialog` do design system.

## UX & Interaction Patterns

- Página `/[portalSlug]/educacao` em blocos: destaque do ciclo (troféu cívico com KPIs), linha do tempo/gráfico do IDEB com alternância anos iniciais/finais e linhas de meta e média estadual, painel de responsabilidade fiscal (termômetros MDE/FUNDEB), contratos e compras da Educação.
- Card `EducacaoResumoCard` na home: nota do IDEB em `font-serif`, badge de evolução, situação da meta, classificação estadual (só quando disponível), rodapé com fonte oficial e CTA para a página; ênfase verde quando evolução >= 1,0 ponto ou meta atingida, âmbar em queda ou meta não atingida, neutro nos demais (regra compartilhada com a página).
- Detalhamento em modal com sincronização bidirecional de query params; totalizador no estilo `slate-100`, rótulo "Total", valores em negrito.
- Responsivo no mobile e acessibilidade Lighthouse 100%.

## Cross-Story Dependencies

- 18.1 (seed/staging) alimenta 18.2 (fato), que alimenta 18.3 (leitores), base de 18.4 (página) e 18.5 (card da home).
- 18.6 corrige comportamento de 18.3/18.5 (etapa do IDEB) e o formatador `fmtCompact` usado em todo o portal.
- 18.7 estende a página de 18.4, reaproveita o padrão de Emendas da Saúde (refatorando-o para totalizador compartilhado) e depende do fixture/dbt de emendas existente.
- Stories 18.5 a 18.7 atualizam os arquivos `llms.txt`/`llms-full.txt`.
