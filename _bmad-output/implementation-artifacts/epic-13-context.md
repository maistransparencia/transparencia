# Epic 13 Context: Usabilidade Cívica, Descoberta Global e Governança

<!-- Generated from planning artifacts. -->

## Goal

Elevar o patamar de usabilidade, encontrabilidade e governança cívica do portal da transparência através de sete intervenções estratégicas: busca global unificada de compras públicas (licitações e contratos via FTS no PostgreSQL com modal spotlight), sinalização inteligente e acessível do Radar Cívico nos pontos de navegação, seleção rápida e intuitiva de entidade única ("apenas esta") no seletor institucional, formalização da anomalia de dependência fiscal de transferências no dbt para exercícios fechados com embasamento no Art. 11 da LRF, institucionalização de Termos de Uso e Política de Privacidade aderentes à LAI e LGPD, otimização da densidade de tela mobile com toolbar em linha única para exportação CSV, e rolagem suave automática com compensação de cabeçalho fixo na paginação de tabelas densas.

## Stories

- **Story 13.1**: Busca Global de Licitações e Contratos com Spotlight Modal e Postgres FTS
- **Story 13.2**: Visibilidade e Sinalização do Radar Cívico na Navegação Desktop e Mobile
- **Story 13.3**: Seleção Rápida de Entidade Única ("Apenas Esta") no Multi-Select Institucional
- **Story 13.4**: Modelagem e Integração da Anomalia de Dependência Fiscal no dbt e Radar Cívico
- **Story 13.5**: Criação das Páginas Estáticas de Termos de Uso e Política de Privacidade
- **Story 13.6**: Otimização da Barra de Ferramentas e Botão "Baixar CSV" no Mobile
- **Story 13.7**: Scroll Suave Automático para o Topo da Tabela ao Paginar
- **Story 13.8**: Deep-Link e Modal de Detalhes de Contratos com Retenção de Busca
- **Story 13.9**: Desacoplamento de Rotas de Navegação do Mart `fct_anomalias_fiscais_metricas`
- **Story 13.10**: Refinamento da Busca de Licitações e Contratos: Vigência Plurianual, Fornecedores Homologados e Calibração Textual

## Requirements & Constraints

- **Boring Technology & Custo Zero (Story 13.1)**: Proibido o uso de serviços de busca externos pagos (Algolia, Elastic Cloud, etc.). A busca global de licitações e contratos deve rodar 100% nativa no PostgreSQL utilizando `tsvector`, `unaccent`, `websearch_to_tsquery` e o operador de similaridade do `pg_trgm` em `@transparencia/db`.
- **Desempenho no Layout Base (Story 13.2)**: A contagem de alertas ativos do Radar Cívico para sinalização no menu deve ser uma consulta atômica e ultra-leve (`COUNT(*)` indexado sobre severidade crítica), sem recalcular regras complexas de anomalia durante o SSR do layout. Respeitar estritamente a preferência do usuário com `motion-safe:animate-pulse` e `motion-reduce:animate-none`.
- **Interação Intuitiva sem Conflito de Eventos (Story 13.3)**: No componente `MultiSelect`, a linha do dropdown deve segregar claramente o clique do checkbox (toggle multi-seleção) do clique no label de texto (seleção exclusiva da entidade), sem utilizar botões HTML aninhados (`<button>` dentro de `<button>`).
- **Segregação Metodológica e Não-Acusatória (Story 13.4)**: A anomalia `dependencia_transferencias` aplica-se exclusivamente a exercícios fiscais consolidados e encerrados (`ano < ano_corrente`), impedindo falsos alarmes gerados pela sazonalidade de vencimento de tributos municipais (IPTU/ISS) em exercícios em andamento. Links obrigatórios para o Art. 11 da LRF oficial no Planalto (Regra 20).
- **Governança de Fixtures (Story 13.4)**: Toda alteração no modelo analítico `fct_anomalias_fiscais_metricas.sql` exige a atualização imediata das fixtures compactadas `packages/db/tests/fixtures/schema.sql.gz` via `make db/fixture/dump` (Regra 21).
- **Transparência Institucional e Legalidade (Story 13.5)**: Termos de Uso e Política de Privacidade devem ser páginas estáticas (`force-static`) no nível raiz, fundamentadas na Lei de Acesso à Informação (Lei 12.527/2011), LC 131/2009 e LGPD (Lei 13.709/2018), sincronizando os guias `llms.txt` e `llms-full.txt` (Regra 12).
- **Ergonomia e Densidade Mobile (Stories 13.6 e 13.7)**: A toolbar do `DenseTable` deve manter busca e exportação CSV em linha única (`flex-row`), reduzindo a perda de espaço vertical. A paginação deve reposicionar a tela via `scrollIntoView` suave com `scroll-mt-20 sm:scroll-mt-24` para que o cabeçalho não fique oculto sob a barra superior fixa.
- **Segregação de Responsabilidades de Roteamento (Story 13.9)**: O mart `fct_anomalias_fiscais_metricas` não deve conter nenhuma string de URL ou lógica de construção de rota. A única fonte de verdade para rotas de navegação de alertas é a função `buildAlertaUrl` em `apps/web`. A coluna `deep_link_rota` deve ser removida do mart e substituída pelo campo semântico `licitacao_numero TEXT` (necessário apenas para anomalias de licitação).
- **Refinamento da Busca de Licitações e Contratos (Story 13.10)**: Filtragem temporal de contratos deve cobrir toda a vigência plurianual (`ano_exercicio >= EXTRACT(YEAR FROM data_inicio) AND (vencimento_atual IS NULL OR EXTRACT(YEAR FROM vencimento_atual) >= ano_exercicio)`), busca de licitações correlacionada com `analytics.fct_licitacoes_itens` para incluir fornecedores homologados, calibração de threshold trigramático (min length >= 5 ou pontuação > 0.50) para eliminar falsos positivos de palavras curtas, e normalização de pontuação corporativa (ex: L.PHILIPPE vs L. PHILIPPE). No modal, contratos vigentes de anos anteriores exibem badge do ano de celebração e período de vigência.

## Technical Decisions

- **Busca em Licitações e Contratos (`searchLicitacoesEContratos`)**:
  - Implementada em `packages/db/src/queries/licitacoes-contratos-search.ts`.
  - Pesquisa unificada sobre os marts `fct_licitacoes` e `fct_contratos`.
  - Retorna DTOs normalizados em `camelCase`: `SearchResultItem` contendo `id`, `tipo` (`'licitacao' | 'contrato'`), `numero`, `objeto`, `fornecedorNome`, `valor`, `status` e `href`.
  - Modal Command Dialog na UI com atalho `⌘K` / `Ctrl+K` e estado de busca responsivo.
- **Contador de Alertas do Radar (`getRadarAnomaliasCount`)**:
  - Implementado em `packages/db/src/queries/radar-civico-alertas.ts`.
  - Retorna a quantidade de alertas com severidade crítica no ano e entidades selecionadas.
  - Consumido pelo `Sidebar` (desktop) e `MobileBottomNav` (mobile).
- **Refatoração do `MultiSelect` (`packages/ui`)**:
  - Estrutura acessível com `role="group"` ou divisão semântica de clique.
  - No hover desktop: label visual *"apenas"* com opacidade gradual.
  - No clique: aciona `onChange([opt.id])` de forma imutável.
- **Modelo dbt `fct_anomalias_fiscais_metricas.sql`**:
  - Nova CTE avaliando receita corrente total vs arrecadação própria (`impostos + taxas + contribuicao_melhoria`).
  - Condição estrita: `ano < extract(year from current_date)` e `pct_propria < 10%`.
  - Severidade: `critico`. Classificador: `dependencia_transferencias`.
  - Rota canônica: `/[portalSlug]/receitas`.
- **Refatoração do `DenseTable` (`packages/ui`)**:
  - Toolbar responsiva em linha única: `flex items-center justify-between gap-2`.
  - Botão CSV adaptativo: pílula `[ 📥 CSV ]` em telas `< sm` e botão completo no desktop.
  - Suporte a `tableRef = useRef<HTMLDivElement>(null)` disparando `scrollIntoView({ behavior: 'smooth', block: 'start' })`.
  - Aplicação de `scroll-mt-20 sm:scroll-mt-24` no container raiz.
- **Desacoplamento de Rotas (`buildAlertaUrl` — Story 13.9)**:
  - Função `buildAlertaUrl(alerta: RadarCivicoAlertaDTO, opts?: { entidade?: string }): string` criada em `apps/web`, próxima aos componentes de alerta.
  - Mapeia `tipoAnomalia` para segmento de rota, query params (`?ano=`, `&numero=`) e âncora de fragmento (`#saldo-caixa`, `#comissionados`, etc.).
  - O DTO `RadarCivicoAlertaDTO` passa a expor `licitacaoNumero: string | null` em vez de `deepLinkRota: string`.
  - A função `enrichDeepLink` é removida de `packages/db`.
