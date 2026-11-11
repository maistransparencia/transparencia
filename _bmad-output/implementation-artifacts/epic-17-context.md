# Epic 17 Context: Radar Cívico de Obras Públicas, Medições Físicas e Impacto Urbano

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Transformar o portal em uma ferramenta de fiscalização cívica de alto impacto urbano no cotidiano do cidadão, integrando a esteira oficial de dados abertos do ObrasGov.br (`api-publica.obrasgov.gestao.gov.br`) aos portais municipais para exibir obras públicas georreferenciadas no mapa, percentuais auditáveis de avanço físico vs. financeiro, prazos de entrega, correlação analítica com contratos e licitações municipais e justificativas formais de paralisações ou atrasos que afetam a população.

## Stories

- Story 17.1: Pipeline ELT ObrasGov, Ingestão Multi-Tenant e Modelagem Mart (`fct_obras`) no dbt
- Story 17.2: Contratos de Dados, Tipagem Estrita e Queries Kysely no `@transparencia/db`
- Story 17.3: Rota Pública `/obras`, Mapa Interativo de Impacto Urbano e Filtros Cívicos no `apps/web`
- Story 17.4: Dossiê Detalhado da Obra, Auditoria de Avanço Físico vs. Financeiro e Fundamentação Legal
- Story 17.5: Correlação de Obras Públicas com Contratos Municipais e Licitações
- Story 17.6: Card Resumo de Obras Públicas na Visão Geral (Homepage)

## Requirements & Constraints

- **Isolamento Multi-Tenant Rigoroso**: Modelos analíticos dbt (staging e marts) e queries Kysely no banco de dados devem particionar e cruzar estritamente por `portal_slug`, prevenindo contaminação entre municípios e sem conter literais fixos de municípios no código.
- **Padronização Categórica em Snake_Case**: Códigos de situação e status da obra devem ser armazenados estritamente em lowercase snake_case (`em_execucao`, `paralisada`, `concluida`, `cadastrada`). Rótulos amigáveis de exibição pertencem unicamente à camada de visualização.
- **Convenção de DTOs em CamelCase**: Contratos de dados em `@transparencia/db` devem expor propriedades estritamente em `camelCase` (`idProjeto`, `nomeObra`, `situacao`, `orgaoResponsavel`, `valorInvestimentoPrevisto`, `percentualExecucaoFisica`, `dataUltimaMedicao`, `latitude`, `longitude`, `motivoParalisacao`).
- **Paradigma Funcional e Imutabilidade**: Funções leitoras e transformações em `@transparencia/db` devem utilizar estilo funcional imutável (`.map`, `.filter`, `.reduce`, `Promise.all`), sem mutações de estado ou loops imperativos.
- **Governança de Fixtures e Fontes Raw**: Tabelas de entrada raw devem estar declaradas em `_sources.yml`. Qualquer alteração nos modelos mart analíticos exige a atualização do fixture compactado de testes (`packages/db/tests/fixtures/schema.sql.gz`) via `make db/fixture/dump` e validação com `make db/fixture/check`.
- **Fundamentação Legal e Links Oficiais**: Citações a legislações aplicáveis (ex: Lei 14.133/2021) ou sistemas governamentais devem obrigatoriamente incluir links canônicos para fontes oficiais (Planalto e ObrasGov.br) com `target="_blank"` e `rel="noopener noreferrer"`.
- **Navegação Padronizada e Deep Linking**: Manter UX consistente para detalhamento via modal contextual com parâmetros na URL (`?idProjeto=...`, `?contratoNumero=...`), sem introduzir jargões exóticos.
- **Catálogo de IA e Descoberta Pública**: Atualizar síncronamente `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` documentando a rota `/obras`, o card de obras na Visão Geral e os indicadores de medição física.

## Technical Decisions

- **Pipeline ELT ObrasGov (`elt/extract/obrasgov.py` e `elt/load/obrasgov.py`)**:
  - Ingestão idempotente da API pública ObrasGov.br a partir do `cod_ibge` configurado no manifesto de cada portal.
  - Extração dos endpoints `/geometria`, `/projeto-investimento`, `/execucao-fisica` e `/historico-situacao-cancelada-paralisada`.
- **Modelagem dbt (`elt/transform/models/`)**:
  - Staging: `stg_obrasgov__projetos.sql`, `stg_obrasgov__geometrias.sql` e `stg_obrasgov__execucoes_fisicas.sql`.
  - Mart consolidado: `fct_obras.sql` materializado como tabela no schema analítico dedicado, expondo métricas de avanço físico, geolocalização e histórico de paralisações.
  - Correlação analítica opcional 1:N entre `fct_obras` e `fct_contratos` por `portal_slug`, propostas/emendas ministeriais na descrição e termos identificadores do objeto e órgão executor.
- **Camada de Dados Kysely (`@transparencia/db/src/queries/obras.ts`)**:
  - Funções leitoras canônicas: `getObrasPorPortal(portalSlug, filtros)`, `getObraDetalhe(portalSlug, idProjeto)` e `getResumoObrasPorPortal(portalSlug)`.
  - Suporte a filtros por situação (`todas`, `em_execucao`, `paralisada`, `concluida`) e busca textual com normalização `unaccent`.
  - Consulta imutável de contratos vinculados à obra e cálculo consolidado de KPIs para a Visão Geral.
- **Data Loaders e Apresentação Web (`apps/web`)**:
  - Rota dedicada `app/[portalSlug]/obras/page.tsx` com visualização em mapa e modal de detalhes.
  - Loader da Visão Geral (`loadVisaoGeralData`) atualizado para consultar o resumo de obras via `@transparencia/db` (`getResumoObrasPorPortal`) em paralelo com `Promise.all`.
  - Empty state neutro e elegante caso o município não possua obras cadastradas no ObrasGov.br.

## UX & Interaction Patterns

- **Mapa Cívico Interativo (`/[portalSlug]/obras`)**:
  - Marcadores cartográficos com código visual de status: verde (em execução), vermelho (paralisada), azul (concluída) e cinza (cadastrada/planejada).
  - Painel/card resumo ao selecionar marcador, exibindo nome popular, órgão responsável, valor do investimento, previsão de entrega e percentual físico concluído.
  - Filtros rápidos no topo: "Todas", "Em Andamento (Obras Ativas)" e "Paralisadas (Atenção)".
  - Layout responsivo adaptado para alternância suave entre mapa touch e listagem vertical expansível no mobile.
- **Dossiê / Modal de Detalhes da Obra (`?idProjeto=[idProjeto]`)**:
  - Comparativo gráfico de barras duplas: Execução Física Oficial (%) vs. Execução Financeira (%).
  - Alerta cívico destacado para obras paralisadas, exibindo data da paralisação e justificativa oficial registrada.
  - Seção *"Contratos e Licitações Vinculados"*: lista contratos municipais identificados com número, empreiteira (CPF/CNPJ mascarado), valor (`fmtCurrency`) e modalidade, com link direto para `/contratos` ou `/licitacoes`. Mensagem contextual neutra caso não haja correlação direta.
- **Card Resumo na Homepage (`ObrasResumoCard`)**:
  - Posicionado estrategicamente logo abaixo de `CardsSecundariosVisaoGeral` e antes de `RadarCivicoFeed`.
  - Título *"Obras Públicas e Investimentos Urbanos"*, badge de fonte oficial (ObrasGov.br) e montante total de investimento em tipografia serifada.
  - Barra proporcional empilhada (`role="progressbar"`) por status (não iniciadas, em execução, concluídas, paralisadas).
  - Alerta visual específico caso existam obras paralisadas (`paralisadas > 0`).
  - Call to action direcionando para a rota dedicada de obras (`/[portalSlug]/obras`).

## Cross-Story Dependencies

- **Story 17.1 → Story 17.2**: A modelagem mart `fct_obras` e a sincronização do fixture de teste (`schema.sql.gz`) são pré-requisitos para os tipos e queries Kysely no `@transparencia/db`.
- **Story 17.2 → Story 17.3**: A rota `/obras` com mapa interativo depende da função leitora `getObrasPorPortal` e dos tipos de domínio.
- **Story 17.2 & 17.3 → Story 17.4**: O detalhamento da obra consome `getObraDetalhe` e conecta os marcadores do mapa à inspeção aprofundada de avanço físico vs. financeiro.
- **Story 17.2 & 17.4 → Story 17.5**: A correlação analítica de contratos e licitações estende `getObraDetalhe` no `@transparencia/db` e adiciona a seção dedicada de contratos no modal de detalhes da obra.
- **Story 17.2 → Story 17.6**: O card de resumo na homepage consome a query agregada `getResumoObrasPorPortal` no loader `loadVisaoGeralData`.
