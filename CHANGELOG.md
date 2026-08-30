# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.
O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e este projeto adere ao [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.6.1] - 2026-08-29

### 🌟 Destaques da Versão (Hotfix: Otimização de Performance & Estabilidade do CI)
* **Aceleração do Pipeline de Despesas (Redução de 110s para 6.5s):** Eliminação de inlining repetitivo de `unaccent()` e materialização da etapa de reclassificação léxica, prevenindo timeouts na execução do dbt em instâncias com recursos restritos (Supabase).
* **Indexação Estratégica de Marts (`fct_despesas`):** Adição de índices B-Tree compostos para consultas de gastos sensíveis, restos a pagar e fornecedores na camada de aplicação.
* **Estabilidade da Fixture de Testes (CI/CD):** Inclusão automática dos dados de tabelas de sementes (`seed_*`) no dump de fixture do banco de dados, garantindo paridade total entre testes locais e GitHub Actions.

### 🏛️ Engenharia de Dados & Modelagem dbt (Data & Analytics)
* **Pré-computação em `int_despesas_consolidadas.sql`:** Projeção direta dos campos normalizados (`texto_objeto`, `texto_fornecedor`, `texto_completo`, `texto_proj_ativ`) na tabela consolidada, garantindo execução única do `unaccent` por registro.
* **Otimização em `int_despesas_reclassificadas.sql`:** Aplicação de `materialized` na CTE de inferência léxica para impedir reavaliação de regexes no preenchimento de metadados da Portaria STN/SOF.
* **Índices B-Tree em `fct_despesas.sql`:** Configuração nativa no dbt-postgres para indexar colunas-chave (`portal_slug, ano`, `empresa_id`, `categoria_gasto_sensivel`, `fonte`, `fornecedor_cpf_cnpj`, `elemento`, `funcao`).

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Tempo Total de Execução do dbt:** Redução superior a 90% no tempo total de build do cluster de despesas (de 67.11s para 6.50s localmente).
* **Dump de Fixture Aprimorado (`Makefile`):** Atualização do target `db/fixture/dump` para gerar `--schema-only` de tabelas fato/dimensão e `--data-only` das tabelas de sementes (`seed_*`).

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Tratamento de Rota 404 em Portais:** Retorno explícito de página 404 para requisições com `portalSlug` inexistente ou inválido.
* **Resiliência em Métricas de Opacidade:** Degradação graciosa de consultas quando marts ou constantes fiscais não possuem registros.

## [1.6.0] - 2026-08-29

### 🌟 Destaques da Versão (Epic 6: Reformulação Fiscal de Despesas)
* **Radar de Gastos Sensíveis:** Monitoramento em tempo real de 6 categorias prioritárias (Combustíveis, Frotas, Aluguel de Imóveis, Eventos, Diárias e Obras) com cálculo de dívida real acumulada (empenhos do exercício + restos a pagar herdados).
* **Monitoramento de Gastos Genéricos (Subitens `.99`):** Termômetro de opacidade orçamentária fundamentado na Lei Federal nº 4.320/64 (Arts. 5º e 15), com distinção metodológica inédita entre despesas *Evitáveis* (39.99/36.99/30.99) e *Estruturais* (Sentenças 91.99 e Previdência 13.99).
* **Reclassificação Orçamentária STN:** Mecanismo automático de inferência de objeto que sugere códigos canônicos da Portaria STN/SOF para Consórcios de Saúde, Limpeza Urbana & Resíduos, Previdência e Plantões Médicos.
* **Redesenho de Despesas em 3 Atos:** Homepage despoluída e página de despesas reestruturada com navegação guiada, série histórica interanual (2021–2025) e totalização líquida.

### ✨ Novas Funcionalidades (Added)
* **Componente `TermometroOpacidadeFiscal`:** Termômetro com régua de risco calibrada (até 15% esperado, 15%–30% atenção, >30% elevado), callout de achado de concentração e quebra por elemento pai.
* **Ranking de Credores em `.99` com Sugestão de Objeto:** Tabela de maiores fornecedores com badges inteligentes indicando a real destinação do recurso (ex: CODESP → Consórcios de Saúde; Coop. Catadores → Limpeza Urbana).
* **Componente `RadarGastosSensiveis`:** 6 cards temáticos com percentual sobre o orçamento pago e segregação de restos a pagar.
* **Série Histórica Fechada (2021–2025):** Visualização interanual do índice de opacidade para comparação de mandatos e exercícios fiscais.

### 🏛️ Engenharia de Dados & Modelagem dbt (Data & Analytics)
* **Novo Seed SSOT `seed_naturezas_despesa_stn.csv`:** Catálogo padronizado de códigos e descrições da Portaria STN/SOF e MCASP do Tesouro Nacional.
* **Modelo Intermediário `int_despesas_reclassificadas.sql`:** Pipeline de inferência léxica com hierarquia de precedência estrita para desambiguação de despesas.
* **Marts de Métricas Forenses:** 
  * `fct_opacidade_contabil_metricas.sql`: Indicadores de taxa de opacidade e limites de risco anuais.
  * `fct_opacidade_contabil_credores.sql`: Ranking e agrupamento de credores residuais com tratamento `unaccent`.
  * `fct_opacidade_contabil_elementos.sql`: Distribuição por elemento pai (39.99, 36.99, 30.99, etc.).
* **Desacoplamento de `fct_despesas.sql`:** Expulso o bloco monolítico de regexes para o modelo intermediário.

### ⚖️ Governança & Documentação Pública (Governance & Docs)
* **Guia de Governança Fiscal (`docs/governanca-constantes-fiscais.md`):** Protocolo de auditoria, calendário de revisão anual de limites de licitação e procedimento de atualização de seeds.
* **Hiperlinks de Bases Legais:** Inclusão de `url_base_legal` no `seed_constantes_fiscais.csv` com links oficiais diretos para o Planalto e TCU.
* **Sincronização de IA (Regra 12 de `AGENTS.md`):** Atualização completa dos manuais públicos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`.

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Linguagem Cidadã Não-Acusatória:** Textos e badges readequados com neutralidade técnica e rigor estatístico.
* **Ajustes de Responsividade Mobile:** Correção de alinhamento de barras de progresso, padding e layout touch-friendly.
* **Safe Bounding:** Tratamento preventivo de divisão por zero e overflow percentual nas queries Kysely e modelos dbt.
