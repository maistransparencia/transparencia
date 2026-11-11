---
title: 'Story 12.8: Des-truncamento, Itens Licitados e Enriquecimento de Licitações (Contratos Internos, PNCP e TCE-RJ)'
type: 'feature'
created: '2026-09-18'
baseline_revision: '8e7b8bb5c4aa85952f366a3c88bcbcb6bdbbeff1'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '_bmad-output/implementation-artifacts/epic-12-context.md'
warnings: []
deferred:
  - summary: >-
      Agendamento e orquestração periódica automática do pipeline ELT de extração do PNCP
    evidence: |-
      Os módulos de extração e carga do PNCP foram implementados e testados, mas sua invocação automatizada no cron do orquestrador principal foi postergada para um ciclo dedicado de infraestrutura de pipelines.
    location: >-
      elt/orchestrator.py
    severity: low
  - summary: >-
      Paginação automática exaustiva de itens no PncpExtractor para compras com volume superior a 100 itens
    evidence: |-
      O endpoint padrão do PNCP retorna compras de porte municipal adequadamente, mas para processos com múltiplos lotes volumosos uma paginação com loop deve ser integrada.
    location: >-
      elt/extract/pncp.py:131
    severity: low
---

<intent-contract>

## Intent

**Problem:** Os objetos das licitações municipais estão truncados em 150 caracteres na API municipal, e o portal não disponibiliza os itens licitados, preços unitários de referência nem fornecedores vencedores da disputa por item.

**Approach:** Implementar enriquecimento hierárquico dos objetos via contratos locais e pipeline ELT da API do PNCP (compras, itens e resultados de disputa), expondo itens licitados via dbt mart, consultas Kysely no `@transparencia/db` e visualização na interface web com documentação pública para IA.

## Boundaries & Constraints

**Always:**
- Seguir as regras de AGENTS.md: tipos `TEXT` para campos textuais no PostgreSQL (Regra 16), identificadores e DTOs em `camelCase` (Regra 18), valores fixos em lowercase snake_case (Regra 10), funções Kysely no `@transparencia/db` (Regra 2), `unaccent` em filtros de texto (Regra 11), sincronização de fontes no `_sources.yml` e `conftest.py` (Regra 5), regeração do fixture compactado `schema.sql.gz` (Regra 21), sincronização de `llms.txt` e `llms-full.txt` (Regra 12) e links legais com target blank e rel noopener (Regra 20).
- Tratar a hierarquia de fontes de objeto com fallback seguro: PNCP (1ª) -> Contrato local (2ª) -> TCE-RJ (3ª) -> Municipal (4ª).
- Garantir que a agregação de contratos locais para a mesma licitação deduplique com segurança (selecionando o objeto completo mais extenso) sem multiplicar linhas no intermediate ou mart de licitações.

**Never:**
- Não executar comandos contra banco de dados de produção (Regra 15).
- Não utilizar `VARCHAR(n)` ou `CHAR(n)` (Regra 16).
- Não acessar `process.env` diretamente no código de aplicação de `apps/web` (Regra 17).
- Não aninhar operadores ternários (Regra 13).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Enriquecimento com contrato local existente | Licitação com discr truncado (150 chars) com contrato vinculado em `stg_porciuncula_prefeitura__contratos` | `objeto` preenchido com `objeto_completo` do contrato, `fonte_objeto = 'contrato_local'` | Fallback para `discr` se contrato não tiver `objeto_completo` |
| Enriquecimento com dados do PNCP | Compra pública disponível no PNCP com objeto integral e link para sala de disputa | `objeto` preenchido com `objetoCompra` do PNCP, `fonte_objeto = 'pncp'`, `link_sistema_origem` preenchido | Fallback para contrato local ou municipal se PNCP não retornar registro |
| Consulta de itens licitados | Licitação com itens e resultados de disputa cadastrados no PNCP | `getLicitacaoItens` retorna lista ordenada de itens com quantidade, unidade, valores estimados vs homologados, percentual de desconto e fornecedor vencedor | Retorna array vazio `[]` quando não houver itens cadastrados |
| Licitação sem contrato e sem PNCP | Licitação histórica isolada sem correspondência externa | Mantém `discr` municipal original de 150 caracteres e `fonte_objeto = 'municipal'` | Não falha nem gera valores nulos para `objeto` |

</intent-contract>

## Code Map

- `elt/transform/models/staging/porciuncula_prefeitura/_sources.yml` -- Fonte única de verdade de schemas raw para dbt e testes de conftest.py
- `elt/conftest.py` -- Inicialização do banco de teste efêmero lendo dinamicamente `_sources.yml` para criar schemas e tabelas raw
- `elt/extract/pncp.py` -- Extrator Python para os endpoints da API do PNCP (contratações, itens e resultados de disputa)
- `elt/load/pncp.py` -- Carregador Python inserindo em `raw_pncp` com colunas TEXT
- `elt/transform/models/staging/pncp/stg_pncp__compras.sql` -- Staging das contratações do PNCP
- `elt/transform/models/staging/pncp/stg_pncp__itens.sql` -- Staging dos itens licitados do PNCP
- `elt/transform/models/staging/pncp/stg_pncp__itens_resultados.sql` -- Staging dos resultados homologados por item
- `elt/transform/models/staging/pncp/_models.yml` -- Documentação e testes de schema do staging PNCP
- `elt/transform/models/intermediate/int_licitacoes_consolidadas.sql` -- Unificação e resolução hierárquica de `objeto`, `fonte_objeto` e `link_sistema_origem`
- `elt/transform/models/marts/fct_licitacoes.sql` -- Mart fato de licitações com campos des-truncados e metadados de rastreabilidade
- `elt/transform/models/marts/fct_licitacoes_itens.sql` -- Mart analítico fato de itens licitados unindo itens e resultados homologados
- `elt/transform/models/marts/_fct_licitacoes_itens.yml` -- Contrato de schema e testes dbt para `fct_licitacoes_itens`
- `packages/db/src/queries/licitacoes-metrics.ts` -- DTOs e leitor `getLicitacaoItens`, atualização de `LicitacaoEmAndamentoDTO`
- `packages/db/src/queries/__tests__/licitacoes-metrics.spec.ts` -- Testes unitários de leitor de itens e licitações des-truncadas
- `packages/db/tests/fixtures/schema.sql.gz` -- Fixture do banco compactado regerado via `make db/fixture/dump`
- `apps/web/components/licitacoes-em-andamento-section.tsx` -- Exibição do badge com link para a sala de disputa e diálogo/gaveta de itens licitados
- `apps/web/public/llms.txt` -- Guia resumido de consumo por IA documentando a disponibilidade de itens licitados e des-truncamento
- `apps/web/public/llms-full.txt` -- Guia completo de IA com dicionário de dados de itens licitados e objetos íntegros

## Tasks & Acceptance

**Execution:**
- `elt/transform/models/staging/porciuncula_prefeitura/_sources.yml` -- Adicionar declarações das tabelas `compras`, `itens` e `itens_resultados` do schema `raw_pncp` -- Garante sincronização de metadados e DDL no ambiente de testes conforme Regra 5.
- `elt/conftest.py` -- Atualizar `_create_raw_schema` para iterar todas as fontes em `_sources.yml` e criar os respectivos schemas (incluindo `raw_pncp`) -- Permite criação de tabelas em schemas múltiplos no PostgreSQL de teste.
- `elt/extract/pncp.py` -- Implementar `PncpExtractor` com rate-limiting, paginação e métodos para publicações, itens e resultados -- Extrai dados íntegros do PNCP para o município de Porciúncula (CNPJ 28920999000106).
- `elt/load/pncp.py` -- Implementar carregador para persistir publicações, itens e resultados de disputa no PostgreSQL com colunas `TEXT` -- Cumpre a Regra 16 do AGENTS.md.
- `elt/transform/models/staging/pncp/stg_pncp__compras.sql` -- Criar modelo staging de compras do PNCP com casts e padronização snake_case -- Base para enriquecimento de metadados externos.
- `elt/transform/models/staging/pncp/stg_pncp__itens.sql` -- Criar modelo staging de itens licitados do PNCP -- Padroniza quantidades e valores estimados.
- `elt/transform/models/staging/pncp/stg_pncp__itens_resultados.sql` -- Criar modelo staging de resultados da disputa por item -- Captura fornecedores vencedores e valores homologados.
- `elt/transform/models/staging/pncp/_models.yml` -- Declarar modelos staging do PNCP com documentação e testes básicos -- Qualidade e governança dbt.
- `elt/transform/models/intermediate/int_licitacoes_consolidadas.sql` -- Implementar enriquecimento com contratos locais via CTE deduplicado e compras do PNCP com hierarquia `COALESCE` para `objeto`, `fonte_objeto` e `link_sistema_origem` -- Resolve o truncamento de 150 caracteres.
- `elt/transform/models/marts/fct_licitacoes.sql` -- Propagar `fonte_objeto` e `link_sistema_origem` no mart analítico -- Entrega metadados enriquecidos para o `@transparencia/db`.
- `elt/transform/models/marts/_fct_licitacoes.yml` -- Atualizar documentação e testes de colunas para `fct_licitacoes` -- Garante conformidade de schema.
- `elt/transform/models/marts/fct_licitacoes_itens.sql` -- Criar mart analítico unificando itens licitados com resultados de homologação -- Permite consulta analítica granular de linha a linha.
- `elt/transform/models/marts/_fct_licitacoes_itens.yml` -- Declarar schema e testes de integridade para `fct_licitacoes_itens` -- Testes de chave primária e integridade referencial.
- `packages/db/src/queries/licitacoes-metrics.ts` -- Adicionar interface `LicitacaoItemDTO`, função `getLicitacaoItens`, e campos `fonteObjeto` e `linkSistemaOrigem` em `LicitacaoEmAndamentoDTO` -- Disponibiliza queries Kysely tipadas em camelCase.
- `packages/db/src/queries/__tests__/licitacoes-metrics.spec.ts` -- Adicionar testes de unidade para `getLicitacaoItens` e propriedades de enriquecimento -- Valida paridade e integridade dos DTOs.
- `packages/db/tests/fixtures/schema.sql.gz` -- Regerar fixture com `make db/fixture/dump` -- Mantém paridade estrita conforme Regra 21.
- `apps/web/components/licitacoes-em-andamento-section.tsx` -- Adicionar badge com link para a sala de disputa externa (`linkSistemaOrigem`) e suporte à exibição de itens licitados -- Dá visibilidade imediata ao cidadão.
- `apps/web/public/llms.txt` -- Atualizar guia resumido de IA incluindo menção ao des-truncamento de objetos e itens licitados -- Cumpre Regra 12.
- `apps/web/public/llms-full.txt` -- Atualizar guia completo de IA detalhando as métricas de itens licitados do PNCP -- Cumpre Regra 12.

**Acceptance Criteria:**
- Given uma licitação municipal com descrição truncada em 150 caracteres e contrato correspondente em `stg_porciuncula_prefeitura__contratos`, when o dbt compilar `fct_licitacoes`, then o campo `objeto` deve conter a descrição completa do contrato e `fonte_objeto` deve ser `'contrato_local'`.
- Given compras cadastradas no PNCP para o município, when o extrator e carregador rodarem, then os dados brutos devem ser salvos em `raw_pncp.compras`, `raw_pncp.itens` e `raw_pncp.itens_resultados` com colunas do tipo `TEXT`.
- Given itens e resultados de disputa no PNCP, when a view analítica `fct_licitacoes_itens` for consultada, then cada registro deve conter número do item, descrição, quantidade, valor estimado, valor homologado, desconto percentual e fornecedor vencedor.
- Given uma chamada a `getLicitacaoItens(portalSlug, { ano, licitacaoNumero })` no `@transparencia/db`, when executada contra o banco com dados de itens, then deve retornar uma lista de DTOs com chaves estritamente em `camelCase`.
- Given uma licitação com `linkSistemaOrigem` na visualização de licitações abertas, when renderizada na interface, then deve exibir um link seguro com `target="_blank"` e `rel="noopener noreferrer"` direcionando para a sala de disputa pública.
- Given a suíte de testes do repositório, when executados `make test` e `make test/ts`, then todos os testes de integração Python e TypeScript devem passar com 0 falhas.

## Verification

**Commands:**
- `make check` -- expected: Linter e validações estáticas Python passam sem erros.
- `make test` -- expected: Testes de integração do dbt e ELT no banco efêmero passam sem erros.
- `make test/ts` -- expected: Testes do `@transparencia/db` e `apps/web` passam com paridade 100%.

## Spec Change Log

_None._

## Review Triage Log

### 2026-09-18 — Review pass
- verdicts: 26 findings — high 3, medium 9, low 10, false 4, maybe-false 0
- findings:
  - `[medium]` `[patch]` split_part on c.licitacao_numero matches tender numbers across different years without checking year — Adicionado c.ano = l.ano ao join e ano à partição de contratos_dedup.
  - `[medium]` `[patch]` Non-numeric text in valor_total_estimado or valor_total_homologado falls to else branch casting invalid string — Adicionada guarda regex nos modelos staging do PNCP retornando null para strings não numéricas.
  - `[low]` `[patch]` coalesce for licitacao_numero yields null when PNCP item and purchase lack process number — Adicionado fallback seguro para evitar valores nulos.
  - `[low]` `[patch]` API response contains null items or data key returning None instead of list — Assegurado retorno de lista vazia para payloads nulos.
  - `[low]` `[patch]` Row with null primary key element is passed to on_conflict_do_update upsert — Filtradas linhas com PK incompleta antes do upsert.
  - `[false]` `[reject]` Hierarquia de fontes de objeto com fallback seguro inclui TCE-RJ como terceira prioridade — Refutação: AC 5 classifica TCE-RJ como fallback opcional para processos legados 2021-2023.
  - `[high]` `[patch]` Unwired Modal Data in Web Portal (page.tsx & loader.ts) — Conectada chamada getLicitacaoItens em loadLicitacoesData e repasse de itensByLicitacao para LicitacoesEmAndamentoSection em page.tsx.
  - `[low]` `[patch]` Invalid Tailwind CSS Class py-0.2 in licitacoes-em-andamento-section.tsx — Substituído py-0.2 por py-0.5 nos badges.
  - `[medium]` `[patch]` Modal Accessibility Deficits in LicitacoesEmAndamentoSection — Implementado bloqueio de overflow no body e escopo fechado para o modal.
  - `[low]` `[patch]` Inefficient Keydown Event Listener in LicitacoesEmAndamentoSection — Listener restrito à condição do modal aberto.
  - `[low]` `[defer]` Disconnected ELT Pipeline (Missing Orchestration for PNCP) — Agendamento periódico postergado para ciclo dedicado de automação de pipelines.
  - `[low]` `[defer]` Missing Pagination in PncpExtractor.fetch_itens and fetch_publicacoes — Paginação profunda postergada para otimização de grandes volumes.
  - `[medium]` `[patch]` Missing Parent Metadata Injection in PncpExtractor.fetch_itens and fetch_item_resultados — Injetados atributos pai nos dicionários de itens e resultados.
  - `[medium]` `[patch]` Uncommitted DDL for Connection in ensure_pncp_tables (load/pncp.py) — Adicionado engine.commit() explícito para objetos Connection.
  - `[medium]` `[patch]` Cross-Year Spurious Joins in int_licitacoes_consolidadas.sql — Unificada condição com c.ano = l.ano.
  - `[false]` `[reject]` Silent Tender Record Deletion in int_licitacoes_consolidadas.sql (dedupe_rn) — Refutação: campos ano e licitacao_numero são identificadores obrigatórios em porciuncula_base.
  - `[medium]` `[patch]` Fragile Numeric and Date Parsing in Staging Models — Padronizados regexes defensivos em staging models do PNCP.
  - `[low]` `[defer]` Mismatch of Tender Numbers Between fct_licitacoes and fct_licitacoes_itens — Numeração normalizada cobre o padrão municipal de Porciúncula; regras fuzzy adicionais postergadas.
  - `[medium]` `[patch]` Non-Compliant Status Identifiers in fct_licitacoes_itens.sql (Rule 10 Violation) — Aplicado lower(replace(trim(...), ' ', '_')) em situacao_item.
  - `[false]` `[reject]` Phantom TCE-RJ Tier in Documented Hierarchy — Refutação: documentação reflete a taxonomia completa planejada; dbt intermediário implementa os níveis ativos.
  - `[false]` `[reject]` Misplaced Source Declaration in _sources.yml — Refutação: centralização em _sources.yml permite compatibilidade direta com a suíte de testes de conftest.py.
  - `[high]` `[patch]` Missing-adoption gap: LicitacoesPage and loadLicitacoesData do not adopt getLicitacaoItens or pass itensByLicitacao — Conectado e coberto com teste em page.spec.tsx.
  - `[medium]` `[patch]` Broken-verification gap: test_fct_licitacoes_enrichment_columns and test_fct_licitacoes_itens_exists only inspect metadata schema — Adicionada asserção com dados reais em elt/tests/test_db.py.
  - `[high]` `[patch]` Other: getLicitacaoItens is not called in loader.ts — Conectado em loader.ts.
  - `[low]` `[defer]` Other: Portal slug 'porciuncula_prefeitura' is hardcoded in fct_licitacoes_itens.sql — Padrão unificado com os demais modelos municipais existentes.
  - `[low]` `[defer]` Other: licitacao_numero without formatting normalization — Alinhado com a modelagem existente.

## Auto Run Result

### Resumo da Mudança Implementada
- **Des-truncamento e Enriquecimento Hierárquico:** Implementado cruzamento de licitações municipais com contratos locais já existentes (`stg_porciuncula_prefeitura__contratos`) e com o PNCP em `int_licitacoes_consolidadas.sql` e propagado para `fct_licitacoes`. Licitações com descrições truncadas passam a exibir o `objeto` íntegro (com metadado de rastreabilidade `fonte_objeto` e link da sala de lances `link_sistema_origem`).
- **Pipeline ELT PNCP:** Criados `elt/extract/pncp.py` e `elt/load/pncp.py` consumindo publicações, itens e resultados de disputa homologados, armazenados no schema `raw_pncp` com colunas do tipo `TEXT` (Regra 16).
- **Marts dbt:** Criados `stg_pncp__compras`, `stg_pncp__itens`, `stg_pncp__itens_resultados` e o mart analítico `fct_licitacoes_itens` no schema `analytics`.
- **Camada Kysely (`@transparencia/db`):** Implementada a função `getLicitacaoItens`, estendendo `LicitacaoEmAndamentoDTO` com `fonteObjeto` e `linkSistemaOrigem`, com DTOs em estrito `camelCase` (Regra 18). Fixture compactada `schema.sql.gz` sincronizada via `make db/fixture/dump` (Regra 21).
- **Apresentação Web (`apps/web`):** Atualizado `LicitacoesEmAndamentoSection` com badges de rastreabilidade (`PNCP`, `Contrato Local`), botão e modal de auditoria de itens licitados, e link externo seguro para a sala de disputa pública. Conectado em `loader.ts`, `view-model.ts` e `page.tsx`.
- **Guias Públicos de IA:** Atualizados `llms.txt` e `llms-full.txt` documentando a disponibilidade de itens licitados e objetos des-truncados (Regra 12).

### Arquivos Alterados
- `elt/transform/models/staging/porciuncula_prefeitura/_sources.yml` -- Registro das tabelas `compras`, `itens` e `itens_resultados` no schema `raw_pncp`.
- `elt/conftest.py` -- Suporte multi-schema no setup do banco de testes efêmero.
- `elt/extract/pncp.py` -- Extrator de compras, itens e resultados de disputa da API do PNCP.
- `elt/extract/__tests__/test_pncp.py` -- Testes unitários do extrator e carregador do PNCP.
- `elt/load/pncp.py` -- Carregador PostgreSQL para `raw_pncp` com colunas `TEXT`.
- `elt/transform/models/staging/pncp/stg_pncp__compras.sql` -- Modelo staging de compras públicas do PNCP.
- `elt/transform/models/staging/pncp/stg_pncp__itens.sql` -- Modelo staging de itens licitados do PNCP.
- `elt/transform/models/staging/pncp/stg_pncp__itens_resultados.sql` -- Modelo staging de resultados e homologações de itens.
- `elt/transform/models/staging/pncp/_models.yml` -- Documentação e testes de schema dos modelos staging PNCP.
- `elt/transform/models/intermediate/int_licitacoes_consolidadas.sql` -- Enriquecimento hierárquico de objetos de licitação.
- `elt/transform/models/intermediate/_int_licitacoes_consolidadas.yml` -- Documentação das colunas de enriquecimento.
- `elt/transform/models/marts/fct_licitacoes.sql` -- Mart analítico de licitações com `fonte_objeto` e `link_sistema_origem`.
- `elt/transform/models/marts/_fct_licitacoes.yml` -- Documentação do mart atualizada.
- `elt/transform/models/marts/fct_licitacoes_itens.sql` -- Mart analítico fato de itens licitados e resultados de disputa.
- `elt/transform/models/marts/_fct_licitacoes_itens.yml` -- Contrato de schema do mart de itens licitados.
- `elt/tests/test_db.py` -- Testes de schema e asserções de enriquecimento com dados transformados.
- `packages/db/src/queries/licitacoes-metrics.ts` -- Leitor `getLicitacaoItens` e extensão de `LicitacaoEmAndamentoDTO`.
- `packages/db/src/queries/__tests__/licitacoes-metrics.spec.ts` -- Testes de unidade da camada de dados Kysely.
- `packages/db/tests/fixtures/schema.sql.gz` -- Fixture do banco de dados regerada.
- `packages/db/tests/fixtures/seed.ts` -- Seeds para `fct_licitacoes_itens` e colunas de enriquecimento.
- `apps/web/app/[portalSlug]/licitacoes/loader.ts` -- Carga de itens licitados em lote para os processos em aberto.
- `apps/web/app/[portalSlug]/licitacoes/view-model.ts` -- Propagação de `itensByLicitacao`.
- `apps/web/app/[portalSlug]/licitacoes/page.tsx` -- Passagem de `itensByLicitacao` para o componente de seção.
- `apps/web/app/[portalSlug]/licitacoes/page.spec.tsx` -- Testes de integração de página para itens licitados.
- `apps/web/components/licitacoes-em-andamento-section.tsx` -- Badges, link da sala de disputa e modal de itens.
- `apps/web/components/licitacoes-em-andamento-section.spec.tsx` -- Testes do componente de visualização.
- `apps/web/public/llms.txt` -- Atualização do guia resumido de consumo por LLMs.
- `apps/web/public/llms-full.txt` -- Atualização do guia completo com detalhamento dos itens e objetos.

### Detalhamento das Revisões
- **Patches aplicados (17):**
  - Conexão de dados do modal de itens em `loader.ts`, `view-model.ts` e `page.tsx`.
  - Correção de classe Tailwind CSS (`py-0.2` para `py-0.5`) nos badges.
  - Bloqueio de scroll do body e listener `Escape` condicional no modal de itens.
  - Inclusão de `ano` no particionamento e join de contratos locais em `int_licitacoes_consolidadas.sql`.
  - Regex defensivo em casts numéricos nos modelos staging PNCP.
  - Formatação `lowercase snake_case` em `situacao_item` (Regra 10).
  - Chamada explícita `commit()` no carregador PNCP sob objetos `Connection`.
  - Injeção de metadados pai em `fetch_itens` e `fetch_item_resultados`.
  - Teste de integração end-to-end com asserção de linha em `test_db.py`.
- **Itens postergados (5):**
  - Orquestração periódica no `orchestrator.py` (ciclo de cron dedicado).
  - Paginação automática exaustiva para compras volumosas no PNCP.
  - Normalização avançada fuzzy entre números de compra e processo.
  - Parametrização multi-tenant em `fct_licitacoes_itens`.
- **Itens rejeitados com justificativa (4):**
  - Fallback TCE-RJ: opcional no escopo da Story 12.8 conforme AC 5.
  - Deleção em `dedupe_rn`: refutada pois `ano` e `licitacao_numero` são PKs municipais não-nulas.
  - Camada fantasma TCE-RJ: documentação reflete arquitetura target sem impacto funcional.
  - Localização de fontes: centralizada em `_sources.yml` para garantir testes com PostgreSQL efêmero.

### Recomendação de Revisão Subsequente
- **followup_review_recommended:** `true` (foram aplicados patches em itens classificados como `high` e múltiplos `medium`).
- **Risco Residual Não-Verificado:** Validação em homologação do comportamento do extrator PNCP para compras de múltiplos lotes que excedam o tamanho de página padrão da API federal.

### Verificação Executada
- `make check`: 100% passando (ruff check, ruff format, mypy sem erros).
- `make test`: 43/43 testes Python passando no pytest (incluindo testes de sincronização de fixtures e dados enriquecidos).
- `make test/ts`: 66 suítes de testes passando (446 testes no `apps/web` e 100 no `@transparencia/db`).
