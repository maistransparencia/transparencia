# Epic 15 Context: Expansão Regional Noroeste Fluminense (Cluster Sigcorp), RPPS Canônico (`fct_previdencia_*`) e Módulos Dinâmicos por Portal

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Desacoplar o núcleo analítico e a camada de apresentação de amarras institucionais locais (eliminando o acoplamento do `CAPREM` e generalizando os marts analíticos para `fct_previdencia_*` e rotas `/previdencia`), parametrizar temas e institutos previdenciários no `PortalConfig`, abstrair o extrator da API Sigcorp/Fiorilli em um conector genérico parametrizado e realizar o rollout oficial dos municípios de Natividade (~15 mil hab., RPPS IPAMN), Bom Jesus do Itabapoana (~35 mil hab., RPPS FUNPREV) e São Fidélis (~40 mil hab., RPPS FASP), acompanhado do profiling de escalabilidade para Campos dos Goytacazes, expandindo o alcance cívico da plataforma no Noroeste Fluminense sem duplicação de infraestrutura.

## Stories

- Story 15.1: Generalização Analítica do RPPS no dbt (`fct_previdencia_*`), Particionamento Multi-Portal e Governança de Fixtures
- Story 15.2: Camada de Dados Kysely (`@transparencia/db`) e Parametrização de Previdência e Temas no `PortalConfig`
- Story 15.3: Camada Web: Roteamento Canônico `/[portalSlug]/previdencia`, Redirect 308 e Navegação Dinâmica por Portal
- Story 15.4: Generalização do Extrator Fiorilli/Sigcorp, Pipelines de Ingestão (Natividade, Bom Jesus, Bônus São Fidélis) e Spike Técnico de Campos dos Goytacazes
- Story 15.5: Rollout dos Novos Portais (Natividade, Bom Jesus e São Fidélis), Homologação Cívica e Atualização dos Guias de IA (`llms.txt`)

## Requirements & Constraints

- **Isolamento Multi-Portal Estrito**: Todas as agregações analíticas nos marts dbt e consultas Kysely no banco devem incluir obrigatoriamente a partição/filtro por `portal_slug`, prevenindo qualquer contaminação cruzada de dados fiscais entre municípios.
- **Governança de Fixtures de Teste**: Toda e qualquer alteração de schema nos marts analíticos ou seeds exige regerar o fixture compactado de teste (`packages/db/tests/fixtures/schema.sql.gz`) via `make db/fixture/dump` e checagem de paridade absoluta via `make db/fixture/check`.
- **Estratégia Híbrida de Ingestão de Receitas**: Devido a uma limitação estrutural da API JSON da Fiorilli (onde o campo `ARRECADADO_TOTAL` retorna `0` em exercícios anteriores ao ano corrente), a extração de receitas orçamentárias deve adotar pipeline dual: o exercício corrente consome a API JSON, enquanto a série histórica (2021–2025) utiliza exportação e carga via relatórios CSV (`receitas_csv.py` e `load_receitas_csv.py`), assegurando arrecadações autênticas.
- **Compatibilidade Retroativa e SEO**: A rota legada `/caprem` deve emitir redirecionamento permanente HTTP 308 para a rota canônica `/previdencia`, preservando indexação em motores de busca, bookmarks públicos e compartilhamentos externos.
- **Transparência e Guia de IA**: O catálogo de rotas públicas e novos municípios deve ser refletido de forma síncrona em `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`, orientando o consumo por agentes autônomos.
- **Fundamentação Legal com Links Diretos**: Qualquer citação de dispositivos legais (ex.: Art. 40 da CF/88, Lei 9.717/1998, Resolução CMN 4.963/2021) deve incluir hiperlink oficial direto para o Planalto com `target="_blank" rel="noopener noreferrer"`.
- **Isolamento de Testes Unitários/Integração**: Testes automatizados de pipelines de extração e staging não devem efetuar chamadas de rede externa; fixtures sintéticas locais em `elt/conftest.py` e `_sources.yml` devem cobrir todos os novos portais.

## Technical Decisions

- **Renomeação Canônica de Marts de Previdência (`elt/transform/models/marts/metrics/`)**:
  - `fct_historia_caprem_metricas.sql` ➔ `fct_previdencia_historia_metricas.sql`
  - `fct_caprem_patrimonio_historico_metricas.sql` ➔ `fct_previdencia_patrimonio_historico_metricas.sql`
  - `fct_caprem_tendencia_atuarial_metricas.sql` ➔ `fct_previdencia_tendencia_atuarial_metricas.sql`
  - `fct_caprem_cadprev_metricas.sql` ➔ `fct_previdencia_cadprev_metricas.sql`
  - `fct_caprem_entidades_metricas.sql` ➔ `fct_previdencia_entidades_metricas.sql`
  - `fct_caprem_natureza_metricas.sql` ➔ `fct_previdencia_natureza_metricas.sql`
  - Atualização dos contratos de schema (`_fct_previdencia_*.yml`) com testes `not_null` em `portal_slug` e redirecionamento de referências em modelos downstream como `fct_anomalias_fiscais_metricas.sql`.
- **Desnormalização O(1) de Metadados de Portal (`seed_portais.csv` e `dim_portais.sql`)**:
  - Expansão da tabela de portais com colunas do tipo `TEXT`/`BOOLEAN`: `previdencia_habilitado` (BOOLEAN), `previdencia_sigla` (TEXT), `previdencia_nome` (TEXT) e `highlights_json` (TEXT com array serializado de temas em destaque).
  - Atualização da função `getPortalConfig` em `packages/db/src/queries/metadata.ts` com tipagem estrita e parsing defensivo (`previdencia: { habilitado, sigla, nome }`, `highlights: Array<{ slug, titulo, descricao, icone }>`).
- **Camada de Dados Kysely (`@transparencia/db`)**:
  - Nomes de funções e arquivos migrados de `caprem` para `previdencia`, filtrando sempre por `.where('portal_slug', '=', portalSlug)`.
  - Mapeamento estrito em `camelCase` para todas as propriedades de interfaces e DTOs, garantindo separação entre modelo analítico e contratos tipados da UI.
- **Conector Genérico Fiorilli/Sigcorp (`elt/extract/fiorilli/`)**:
  - Abstração do extrator de API para aceitar manifestos declarativos YAML (`elt/portals/<slug>.yml`), parametrizando `base_url`, `porta`, `cod_ibge`, `portal_slug`, `ano_inicial` e `empresa_padrao`.
  - Mapeamento de fontes raw em `_sources.yml` e suporte a Natividade (`3303401`, IPAMN), Bom Jesus do Itabapoana (`3300605`, FUNPREV) e São Fidélis (`3304805`, FASP).
- **Diretrizes de Infraestrutura do Spike de Campos dos Goytacazes**:
  - Pessoal e Folha de Pagamento em grandes praças municipais demandam timeout estendido (>= 90s) e particionamento estrito mensal (`MesFinalPeriodo`) para evitar estouro de memória/conexão.

## UX & Interaction Patterns

- **Navegação Dinâmica Orientada a Metadados**:
  - A barra lateral (`packages/ui/src/components/sidebar.tsx`) e a barra de navegação inferior mobile (`apps/web/components/mobile-bottom-nav.tsx`) renderizam o item de menu "Previdência" condicionado a `portal.previdencia.habilitado === true`.
  - Blocos de destaque na homepage renderizam dinamicamente a partir dos temas definidos em `portal.highlights`.
- **Rótulos Institucionais Parametrizados na UI**:
  - Componentes de previdência (gráficos de patrimônio histórico, cards de liquidez de caixa e tabelas de cobertura atuarial) recebem a sigla institucional (`portal.previdencia.sigla`) via View Model, exibindo títulos contextualizados para cada cidade (ex.: *"Patrimônio Financeiro da CAPREM"*, *"Patrimônio Financeiro do IPAMN"*, *"Patrimônio Financeiro do FUNPREV"*).
- **Seletor Global de Municípios**:
  - O alternador de portal no cabeçalho permite transição transparente entre Porciúncula, Natividade, Bom Jesus do Itabapoana e São Fidélis, mantendo a rota e o exercício temporal selecionado quando aplicável.
- **Redirecionamento Canônico Transparente**:
  - O acesso à rota `/caprem` (inclusive com queries ou âncoras como `#patrimonio`) redireciona silenciosa e permanentemente (HTTP 308) para `/previdencia`.

## Cross-Story Dependencies

- **Story 15.1 → Story 15.2**: A migração das queries Kysely e DTOs em `@transparencia/db` depende diretamente da renomeação dos marts dbt para `fct_previdencia_*` e da sincronização do fixture `packages/db/tests/fixtures/schema.sql.gz`.
- **Story 15.2 → Story 15.3**: A renderização da rota canônica `/previdencia`, os rótulos dinâmicos da previdência e a exibição condicional do menu dependem do `PortalConfig` estendido e dos DTOs em `@transparencia/db`.
- **Story 15.1 & Story 15.4 → Story 15.5**: O lançamento dos novos portais (Natividade, Bom Jesus e São Fidélis) requer os marts analíticos particionados por `portal_slug` (15.1) e os pipelines de extração/staging operacionais (15.4).
- **Story 15.3 & Story 15.4 → Story 15.5**: A homologação visual e cívica depende da interface dinâmica (15.3) combinada com os dados municipais carregados no banco local (15.4).
- **Upstream (Epic 14 & Story 13.9)**: Os modelos e gráficos consolidados na Epic 14 são a base analítica generalizada nesta epic; deep links e alertas previdenciários preservam a resolução desacoplada via `buildAlertaUrl`.
