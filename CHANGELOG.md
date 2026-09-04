# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.
O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e este projeto adere ao [Semantic Versioning](https://semver.org/).

## [Unreleased]

### 🌟 Destaques da Versão (Hotfix v1.7.1: Saneamento Léxico e Desagregação Canônica de Despesas Sensíveis)
* **Segregação de Equipamentos Hospitalares e Plantões Clínicos:** Desagregação analítica determinística entre serviços médicos humanos presenciais e locação de usinas de oxigênio/equipamentos hospitalares, eliminando distorções de custos na saúde pública.
* **Depuração Rigorosa da Rubrica de Plantões Médicos:** Restrição estrita a termos clínicos diretos e exclusão determinística de funções de apoio operacional (cozinheiras, motoristas, portaria e vigias) indevidamente classificadas sob a rubrica médica.
* **Isolamento de Assistência Domiciliar (Home Care):** Criação de categoria dedicada com segregação precisa entre prestadores pessoa física (`3.3.90.36.06`) e pessoa jurídica (`3.3.90.39.99`).
* **Saneamento Upstream de Falsos Positivos:** Purificação de filtros léxicos em resíduos sólidos (exclusão de tarifas de água da CEDAE), combustíveis (segregação de peças automotivas), previdência (exclusão de PASEP) e consultoria técnica.

### ✨ Novas Funcionalidades (Added)
* **Novas Categorias de Despesas Sensíveis na Web & E-mails:** Apresentação transparente das categorias `locacao_equipamentos_saude`, `assistencia_domiciliar_home_care`, `pecas_manutencao_frota` e `aluguel_social` com rotulagem amigável no componente `TermometroOpacidadeFiscal` e no boletim cívico transacional `RadarDigestEmail`.

### 🏛️ Engenharia de Dados & Modelagem dbt (Data & Analytics)
* **Refatoração Léxica Canônica (`int_despesas_reclassificadas`):**
  * Introdução das categorias em lowercase snake_case `locacao_equipamentos_saude` (`3.3.90.39.12`), `assistencia_domiciliar_home_care` (PF `3.3.90.36.06` / PJ `3.3.90.39.99`), `pecas_manutencao_frota` (`3.3.90.30.39`) e `aluguel_social` (`3.3.90.48.00`), em conformidade com as Regras 9 e 10 de `AGENTS.md`.
  * Refinamento de `plantoes_medicos` com vocabulário estritamente clínico e aplicação de cláusulas de exclusão negativa para serviços não clínicos.
  * CTE `despesas` atualizada com fallback defensivo (`coalesce` e `unaccent`) garantindo integridade léxica contra valores nulos em fixtures de teste.
* **Atualização do Catálogo STN (`seed_naturezas_despesa_stn.csv`):** Inclusão das naturezas canônicas `3.3.90.36.06` (Serviços Técnicos Profissionais), `3.3.90.48.00` (Outros Auxílios Financeiros a Pessoas Físicas) e alinhamento de `3.3.90.30.39` com a categoria macro `pecas_manutencao_frota`.

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Constantes e Tipagem Fiscal (`@transparencia/db`):** Atualização de `CATEGORIAS_OBJETO_SUGERIDAS` e do tipo `CategoriaObjetoSugerida` para inclusão dos 4 novos discriminadores fiscais.
* **Formatadores UI com Early Returns (`apps/web`):** Padronização das funções de formatação `formatCategoriaSensivel` e `formatCategoriaCredor` com retornos antecipados em conformidade com a Regra 13 de `AGENTS.md` (Zero Ternários Aninhados).

### ⚖️ Governança & Documentação Pública (Governance & Docs)
* **Governança de Constantes Fiscais:** Alinhamento com as diretrizes de desagregação de subitens residuais `.99` e fundamentação nas normas da STN/MCASP e Lei 4.320/64.

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Saneamento de Falsos Positivos Upstream:**
  * `limpeza_residuos`: Exclusão de faturas da concessionária estadual de água (CEDAE) erroneamente catalogadas sob o código `3.3.90.39.44`.
  * `combustivel_frota`: Segregação de peças automotivas, baterias e pneus da rubrica de abastecimento e combustíveis.
  * `previdencia`: Exclusão de recolhimentos PASEP (`3.3.90.13.99`) do agregado de previdência e obrigações patronais.
  * `bloqueios_sentencas`: Exclusão de despesas com aquisição de imóveis e terrenos sob elemento `61`.
  * `consorcios_publicos`: Exclusão de compras diretas de medicamentos e insumos hospitalares.
  * `consultoria_tecnica`: Exclusão de reparos e manutenções físicas/operacionais (climatização, elétrica e CFTV).
* **Expansão da Cobertura de Testes Automatizados:**
  * Inclusão de 8 novos cenários de teste unitário dbt em `_int_despesas_reclassificadas.yml` validando todas as novas classes e regras de exclusão.
  * Atualização dos testes unitários de ranking em `_fct_opacidade_contabil_metricas.yml` contemplando credores das novas categorias sugeridas.
  * Expansão da suíte de testes unitários em TypeScript (`opacidade-contabil-metrics.spec.ts`, `termometro-opacidade-fiscal.spec.tsx` e `radar-digest.spec.tsx`).

## [1.7.0] - 2026-09-02

### 🌟 Destaques da Versão (Epic 7: Distribuição Cívica, Engajamento Comunitário, Newsletters Automatizadas e Social Sharing Dinâmico)
* **Cartões OpenGraph Dinâmicos na Edge:** Geração automática e em tempo real de cards visuais (1200x630px) com métricas fiscais consolidadas (gastos, receitas, previdência, despesas com pessoal e restos a pagar) para compartilhamento no WhatsApp, Telegram e redes sociais.
* **Newsletter Cívica & Boletim Radar Digest:** Canal direto de comunicação com a cidadania via e-mail com double opt-in seguro, conformidade estrita com a LGPD, cancelamento com 1 clique (RFC 8058 `List-Unsubscribe`) e resumos periódicos de despesas e restos a pagar.
* **Publicação Social Multi-Canal Automatizada:** Bots cívicos oficiais integrados ao X.com (`@mtransparenciax` via OAuth 1.0a) e Facebook Pages (via Meta Graph API v26.0) para disseminação programática de manchetes fiscais e novos lotes de dados.
* **Governança Estrita de Ambientes & Tipagem Segura:** Centralização e validação em tempo de compilação/execução de todas as variáveis de ambiente com `@t3-oss/env-nextjs` e Zod (Regra 17 de `AGENTS.md`), prevenindo vazamentos de credenciais e falhas silenciosas.

### ✨ Novas Funcionalidades (Added)
* **Geradores Dinâmicos de OpenGraph (`opengraph-image.tsx`):** Criação de geradores de imagem na edge para todas as rotas públicas do portal (`/`, `/despesas`, `/receitas`, `/orcamento`, `/licitacoes`, `/pessoal`, `/caprem`, `/saude`), baseados no componente `OGCardTemplate` com tema claro, tipografia legível e logomarca oficial.
* **Modal e Banner de Newsletter (`NewsletterModal` e `NewsletterFeedbackBanner`):** Componentes acessíveis na sidebar e footer para cadastro de cidadãos, com validação de e-mail em tempo real, proteção contra envios robotizados e feedback visual contextual de confirmação e cancelamento.
* **Boletim Cívico "Radar Digest" (`RadarDigestEmail`):** Template de e-mail transacional responsivo desenvolvido em React Email (`@react-email/components`), exibindo balanço fiscal do exercício (receita vs despesa líquida), monitoramento de restos a pagar, maiores credores e alertas orçamentários.
* **Rotas de API para Gestão de Assinaturas:** Endpoints `/api/newsletter/subscribe`, `/api/newsletter/confirm` e `/api/newsletter/unsubscribe` com suporte normativo aos cabeçalhos RFC 8058 (`List-Unsubscribe` e `List-Unsubscribe-Post`).
* **Orquestrador de Publicação Social (`SocialPublisher`):** Integração modular com suporte simultâneo a X.com (`XBotClient` com OAuth 1.0a) e Facebook Pages (`FacebookBotClient` com Meta Graph API v26.0), acionáveis via endpoint protegido `/api/social/publish` ou script CLI (`bin/publish-social.ts`).
* **Componente de Conexão Cívica (`SocialLinks`):** Exibição de canais oficiais e repositório open-source na barra lateral e rodapé, com links dinâmicos para X e Facebook parametrizados via variáveis de ambiente.

### 🏛️ Engenharia de Dados & Infraestrutura de Banco (Data & Analytics)
* **Sistema de Migrações Kysely (`@transparencia/db`):** Implementação do migrador programático (`migrator.ts` e comando `pnpm db:migrate`) para controle e versionamento do schema do banco de dados.
* **Migração `001_create_newsletter_subscribers.ts`:** Criação da tabela `newsletter_subscribers` com isolamento multi-tenant (`portal_slug`), status do ciclo de vida (`pendente`, `confirmado`, `cancelado`), timestamps e colunas de texto estritamente tipadas como `TEXT` (em conformidade com a Regra 16 de `AGENTS.md`).
* **Arquitetura Dual-Pool no Kysely (`client.ts`):** Segregação estrutural entre pool de leitura analítica (`readOnlyDb`) e pool de escrita transacional (`adminDb`), assegurando o princípio do menor privilégio.
* **Provisionamento de Permissões no PostgreSQL (`01-init-roles.sql`):** Configuração automatizada de permissões da role `read_only`, concedendo permissão de escrita estritamente necessária na tabela de assinantes.
* **Queries Analíticas Atômicas (`queries/newsletter.ts` e `queries/radar-digest.ts`):** Funções atômicas `getConfirmedSubscribers` e `getRadarDigestMetrics` para consolidação dos dados fiscais do município (receita arrecadada, despesas pagas, restos a pagar liquidados/pendentes e ranking de credores) utilizados no boletim.

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Centralização Canônica de Variáveis de Ambiente (`apps/web/env.ts`):** Validação estrita de variáveis em tempo de compilação com `@t3-oss/env-nextjs` e Zod, eliminando chamadas dispersas e inseguras a `process.env`.
* **Limitação de Taxa em Memória (`rate-limit.ts`):** Mecanismo de janela deslizante (sliding window) leve para prevenir abusos nas rotas públicas de submissão de newsletter sem dependências de infraestrutura externa.
* **Cliente Resend com Tolerância a Falhas (`resend.ts`):** Tratamento defensivo de erros da API, retentativas e suporte a divergências de relógio (clock skew) nos formulários com verificação temporal anti-bot.
* **Comandos de Automação no `Makefile`:** Inclusão dos targets `db/migrate`, `digest/dispatch` e `social/publish` para execução unificada das rotas e scripts operacionais via CLI.

### ⚖️ Governança & Documentação Pública (Governance & Docs)
* **Regra 16 em `AGENTS.md` (Campos de Texto no PostgreSQL):** Formalização da proibição de `VARCHAR(n)` e `CHAR(n)`, exigindo o tipo `TEXT` para todas as colunas de texto em novas migrações.
* **Regra 17 em `AGENTS.md` (Centralização de Variáveis de Ambiente):** Diretriz mandatória proibindo chamadas diretas a `process.env` na aplicação web, exigindo consumo exclusivo a partir de `@/env`.
* **Sincronização dos Guias para LLMs (`llms.txt` e `llms-full.txt`):** Inclusão de documentação pública sobre as rotas de OpenGraph, canais de distribuição de alertas municipais, diretrizes de privacidade conforme a LGPD e links sociais oficiais.
* **Manuais de Configuração de Ambiente (`.env.example`):** Criação e sincronização dos arquivos de exemplo na raiz e em `apps/web/`, documentando todas as credenciais de e-mail, redes sociais e telemetria.

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Mitigação de Timing Attacks:** Implementação de `crypto.timingSafeEqual` para comparação em tempo constante de Bearer tokens em endpoints protegidos de despacho.
* **Paridade de Restos a Pagar nos Posts Sociais:** Alinhamento dos formatadores dos bots sociais para refletir o saldo de restos a pagar em paridade com a Visão Geral do portal, substituindo referências a taxas de opacidade isoladas.
* **Resiliência a Formatos de Desinscrição RFC 8058:** Suporte para requisições com `Content-Type: application/x-www-form-urlencoded` e `multipart/form-data` nos cancelamentos acionados diretamente por clientes de e-mail.
* **Tratamento Defensivo de Dados:** Validação numérica em anos fiscais, fallbacks graciosos para municípios sem histórico e sanitização de domínios em rotas de metadados.

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
