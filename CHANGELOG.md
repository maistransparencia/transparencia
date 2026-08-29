# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.
O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e este projeto adere ao [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
