# Epic 14 Context: Sustentabilidade Previdenciária e Patrimônio Financeiro da CAPREM

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Tornar visível e auditável pelo cidadão a trajetória de desidratação da poupança previdenciária da CAPREM (Instituto de Previdência dos Servidores de Porciúncula), expondo com rigor contábil — a partir dos dados oficiais da Secretaria do Tesouro Nacional (SICONFI / MSC Patrimonial) — a queda do patrimônio financeiro do RPPS de R$ 60,4 milhões em 2021 para R$ 35,9 milhões em 2025. A epic corrige a captura incompleta das contas de investimentos do RPPS na camada de dados, constrói a série histórica plurianual consolidada (caixa + aplicações), adiciona diagnóstico de causas estruturais (déficit de contribuição, patronal em atraso e diluição da base de efetivos) e integra um alerta automatizado de sustentabilidade atuarial no Radar Cívico — garantindo que a fala do vereador Saulo possa ser verificada publicamente em tempo real por qualquer cidadão.

## Stories

- Story 14.1: Captura das Contas de Investimentos do RPPS na MSC Patrimonial e Consolidação do Saldo Financeiro Total
- Story 14.2: Série Histórica Plurianual do Patrimônio Financeiro do RPPS (2021–Corrente)
- Story 14.3: Visualização de Desidratação da Poupança e Diagnóstico de Causas na Rota `/caprem`
- Story 14.4: Alerta de Sustentabilidade Atuarial do RPPS no Radar Cívico
- Story 14.5: Consolidação da Rota `/caprem`: Remoção de Cards Redundantes e Foco Documental no CADPREV

## Requirements & Constraints

- **Isolamento de Staging por Órgão**: A expansão para contas `114%` (investimentos e aplicações a curto prazo) na MSC Patrimonial deve ser restrita exclusivamente ao RPPS (`poder_orgao = '10132'`), preservando intacta a captura do caixa geral do Executivo (`10131`) e Legislativo (`20231`).
- **Segregação Contábil**: A segregação entre recursos vinculados (fundos regulamentados pelo CMN, como fontes `18%`, `28%`, `98%`) e recursos livres deve ser mantida ao consolidar caixa e aplicações na mart downstream `fct_saldo_caixa_siconfi`.
- **SSOT e Sem Duplicação de Lógica**: As métricas de variação absoluta e percentual devem ser calculadas no modelo analítico dbt e passadas diretamente via Kysely, proibindo recálculos redundantes na camada de apresentação TypeScript (Regra 14 do AGENTS.md).
- **Governança de Fixtures**: Toda adição ou modificação em modelos analíticos (`fct_caprem_patrimonio_historico_metricas.sql`, `fct_anomalias_fiscais_metricas.sql`) exige a regeneração imediata de `packages/db/tests/fixtures/schema.sql.gz` via `make db/fixture/dump` e validação com `make test` (Regra 21).
- **Nomenclatura Explícita**: Todos os campos nos modelos dbt e DTOs Kysely devem adotar nomes semânticos claros e autoexplicativos (`patrimonio_total`, `saldo_aplicacoes`, `variacao_patrimonio_pct`), sem abreviações opacas (Regra 9).
- **Campos de Texto em PostgreSQL**: Todas as colunas de texto novas em bancos/marts devem usar exclusivamente o tipo `TEXT` (Regra 16).
- **Narrativa Factual e Não-Acusatória**: Os diagnósticos de causas e o texto do alerta do Radar Cívico devem ser rigorosamente técnicos, objetivos e não-acusatórios, sem imputação de culpa ou sensacionalismo.
- **Fundamentação Legal com Hyperlinks Oficiais**: Todas as citações de normas ou leis (Lei 9.717/1998, CF/88 Art. 40, Resolução CMN 4.963/2021) devem conter hiperlinks oficiais (Planalto / Banco Central) com `target="_blank" rel="noopener noreferrer"` e ícone `ExternalLink` (Regra 20).
- **Sincronização com Guias de IA**: A introdução de novas seções ou métricas públicas na rota `/caprem` exige a atualização de `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` (Regra 12).

## Technical Decisions

- **Modelo dbt de Staging (`stg_siconfi_msc_patrimonial.sql`)**:
  - Filtro atualizado para `(conta_contabil like '111%' OR (conta_contabil like '114%' AND poder_orgao = '10132'))`.
  - Propaga automaticamente para `fct_saldo_caixa_siconfi`, consolidando disponibilidades em conta corrente e investimentos financeiros da CAPREM.
- **Novo Mart Analítico dbt (`fct_caprem_patrimonio_historico_metricas.sql`)**:
  - Tabela analítica agregando `fct_saldo_caixa_siconfi` para `poder_orgao = '10132'` e competência de encerramento (`ultima_competencia_flag = true`).
  - Colunas: `portal_slug`, `ano`, `saldo_caixa`, `saldo_aplicacoes`, `patrimonio_total`, `variacao_abs`, `variacao_pct`.
  - Schema contract dedicado com testes de integridade `not_null` e valores positivos.
- **Extensão de DTOs e Queries Kysely (`@transparencia/db`)**:
  - `CapremActuarialTrendDTO` em `historia-caprem-metrics.ts` estendido com `patrimonioFinanceiroTotal`, `variacaoPatrimonioAbs` e `variacaoPatrimonioPct`.
  - `TipoAnomalia` estendido com o classificador `'desidratacao_patrimonio_rpps'`.
  - Roteamento do alerta desacoplado da camada de banco de dados, sendo resolvido na aplicação web via `buildAlertaUrl` (conforme padrão consolidado na Story 13.9).
- **Diagnóstico das Causas Estruturais da Queda**:
  - Rombo patronal não repassado: valor apurado de contribuições patronais liquidadas mas não pagas no exercício.
  - Aporte atuarial / déficit contributivo: diferença estrutural entre receitas de contribuição e benefícios pagos.
  - Diluição da base de segurados: proporção de contratados temporários/comissionados (vinculados ao RGPS) em relação aos servidores estatutários efetivos (RPPS).

## UX & Interaction Patterns

- **Seção de Patrimônio Histórico (`/[portalSlug]/caprem`)**:
  - Componente dedicado (`CapremPatrimonioHistoricoSection` ou expansão de `CapremSaldoCaixaCard`) com gráfico de área/linha (Recharts) destacando a curva de retração plurianual desde 2021.
  - Eixo temporal por exercício e eixo financeiro com formatação compacta (`fmtCompact`), exibindo detalhamento em moeda corrente (`fmtCurrency`) no tooltip.
  - Três KPI cards de destaque no topo: Pico Histórico, Patrimônio Atual (com badge de variação percentual) e Queima Média Anual.
  - Painel inferior com três cards de causas estruturais (Déficit de Contribuição, Cota Patronal em Atraso, Diluição da Base Efetiva), com valores quantitativos, ícones semânticos e links oficiais da legislação.
- **Alerta no Radar Cívico**:
  - Card de severidade crítica (`desidratacao_patrimonio_rpps`) disparado quando a variação patrimonial trienal acumulada for inferior a `-20%` em exercícios fechados.
  - Deep link direcionando para a âncora `/[portalSlug]/caprem?ano=[ano]#patrimonio`.
  - Respeito a preferências de movimento reduzido (`motion-safe:animate-pulse` / `motion-reduce:animate-none`).

## Cross-Story Dependencies

- **Story 14.1 → Story 14.2**: A modelagem da série histórica plurianual em `fct_caprem_patrimonio_historico_metricas` depende diretamente da captura das contas `114%` no staging `stg_siconfi_msc_patrimonial` e consolidação em `fct_saldo_caixa_siconfi`.
- **Story 14.2 → Story 14.3**: Os novos cards de KPI, o gráfico de evolução histórica e os diagnósticos da rota `/caprem` dependem do DTO `CapremActuarialTrendDTO` enriquecido com os dados de patrimônio financeiro consolidado.
- **Story 14.2 → Story 14.4**: A detecção da anomalia de desidratação no mart `fct_anomalias_fiscais_metricas` consome diretamente as variações anuais calculadas em `fct_caprem_patrimonio_historico_metricas`.
- **Story 14.3 → Story 14.5**: A consolidação da rota `/caprem` remove o grid redundante de 4 cards de `CapremActuarialRiskSection`, agora que `CapremPatrimonioHistoricoSection` (Story 14.3) já diagnostica o déficit atuarial, cota patronal e diluição da base, reposicionando o foco da seção nos Acordos CADPREV e na tabela de evolução histórica.
- **Epic 13.9 → Story 14.4**: O alerta de sustentabilidade atuarial da Story 14.4 deve aderir ao padrão arquitetural de desacoplamento de rotas da Story 13.9, mantendo a regra de URL dentro de `buildAlertaUrl` no web e não em coluna de banco de dados.
