---
baseline_commit: 33221005e5530239e4997f2e216a39cc325815af
---

# Story 12.8: Des-truncamento, Itens Licitados e Enriquecimento de Licitações (Contratos Internos, PNCP e TCE-RJ)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> [!NOTE]
> **Constatação de Arquitetura no Banco Local e Fontes Externas:**
> - **Contratos (`raw_porciuncula_prefeitura.contratos`):** O campo `objeto_completo` já existe e está 99,5% preenchido no banco local (comprimento de até 1.041 caracteres), além do CNPJ/CPF em `insmf`. Não há problema de truncamento em contratos.
> - **Licitações (`raw_porciuncula_prefeitura.licitacoes`):** A API municipal da Fiorilli só fornece o campo `discr` (truncado em 150 caracteres), e o TCE-RJ (`/licitacoes`) trunca em 200 caracteres (`VARCHAR(200)` no SIGFIS).
> - **Ouro Analítico no PNCP (`pncp.gov.br`):** A API do Portal Nacional de Contratações Públicas fornece não apenas a descrição integral e sem limites (`objetoCompra`), mas também **todos os itens licitados** com quantidades e valores estimados, e os **resultados da disputa por item** com CNPJ/razão social do vencedor, valor unitário homologado e percentual de desconto obtido. Essa informação não existe nem no portal municipal nem no TCE-RJ.

## Story

As a citizen, civic researcher, or municipal fiscal auditor,  
I want the transparency platform to enrich municipal tender objects and ingest item-level procurement data (including estimated reference prices, quantities, winning suppliers, and homologated prices) from the federal PNCP API and local contracts,  
So that truncated tender descriptions (150 chars) are replaced by untruncated descriptions and citizens can inspect individual line items and dispute results across all civic dashboards, search filters, and the Civic Radar.

---

## Acceptance Criteria

1. **Enriquecimento Interno Imediato de Objetos via Contratos Locais (`int_licitacoes_consolidadas.sql`):**
   - Cruzar as licitações municipais com os contratos já existentes no banco local (`stg_porciuncula_prefeitura__contratos`):
     - Vincular por `ano`, `empresa_id` e chaves relacionais (`codtce` ou `licitacao_numero` / `proclic`).
     - Para licitações homologadas que geraram contrato, herdar prioritariamente `c.objeto_completo`.

2. **Pipeline ELT de Ingestão do PNCP - Compras e Metadados 2024+ (`elt/extract/pncp/`, `elt/load/pncp/`):**
   - Implementar extrator para a API de contratações do PNCP:
     - `GET /v1/contratacoes/publicacao?dataInicial={YYYYMMDD}&dataFinal={YYYYMMDD}&codigoModalidadeContratacao={id}&cnpj=28920999000106&pagina={pag}&tamanhoPagina=10`
     - `GET /v1/orgaos/{cnpj}/compras/{ano}/{sequencial}`
   - Parametrizar o CNPJ da prefeitura de Porciúncula (`28920999000106`) e código IBGE (`3304102`).
   - Ingerir no schema `raw_pncp.compras` com colunas `TEXT` (Regra 16 do AGENTS.md), registrando no `_sources.yml` (Regra 5 do AGENTS.md).
   - Capturar metadados essenciais: `objetoCompra` (texto 100% íntegro sem limite), `processo`, `numeroCompra`, `linkSistemaOrigem` (hiperlink para a sala de disputa, ex: Licitanet) e `valorTotalEstimado`.

3. **Pipeline ELT de Ingestão de Itens e Resultados de Disputa do PNCP (`elt/extract/pncp/`, `elt/load/pncp/`):**
   - Implementar extração automatizada para os endpoints de detalhamento de itens do PNCP:
     - **Itens Licitados:** `GET https://pncp.gov.br/api/pncp/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/itens`
       - Ingerir no schema `raw_pncp.itens`: `numeroItem`, `descricao`, `quantidade`, `valorUnitarioEstimado`, `valorTotal`, `unidadeMedida`, `criterioJulgamento`, `situacaoCompraItem`.
     - **Resultados da Disputa por Item (Vencedores e Preços Homologados):** `GET https://pncp.gov.br/api/pncp/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/itens/{numeroItem}/resultados`
       - Ingerir no schema `raw_pncp.itens_resultados`: `niFornecedor` (CNPJ/CPF do vencedor), `nomeRazaoSocialFornecedor`, `valorUnitarioHomologado`, `valorTotalHomologado`, `percentualDesconto`, `dataResultado`.
   - Todas as tabelas criadas no PostgreSQL com colunas `TEXT` para campos textuais (Regra 16 do AGENTS.md) e mapeadas em `_sources.yml` (Regra 5 do AGENTS.md).

4. **Modelagem dbt Staging e Mart Analítico de Itens (`fct_licitacoes_itens`):**
   - Criar `stg_pncp__itens.sql` e `stg_pncp__itens_resultados.sql` padronizados em `lowercase snake_case`.
   - Criar o mart analítico `fct_licitacoes_itens.sql` no schema `analytics`:
     - Chaves relacionais: `ano`, `numero_compra`, `sequencial_pncp`, `numero_item`.
     - Métricas e atributos: `descricao_item`, `quantidade`, `unidade_medida`, `valor_unitario_estimado`, `valor_total_estimado`, `valor_unitario_homologado`, `valor_total_homologado`, `percentual_desconto`, `fornecedor_cnpj`, `fornecedor_razao_social`, `criterio_julgamento`, `situacao_item`.

5. **Fallback Opcional do TCE-RJ (`elt/extract/tcerj/`):**
   - Para processos legados (2021-2023) que não geraram contratos e não estão no PNCP, permitir enriquecimento secundário via `/api/v1/licitacoes` do TCE-RJ (ampliação para 200 caracteres quando superior aos 150 municipais).

6. **Hierarquia dbt de Resolução de Objeto no Intermediate (`int_licitacoes_consolidadas.sql`):**
   ```sql
   coalesce(
       pncp.objeto,                     -- 1ª prioridade: PNCP (2024+, texto integral sem limite)
       contrato_local.objeto_completo,  -- 2ª prioridade: Contrato local já existente no banco (até 1.041 chars)
       licitacao_tce.objeto,            -- 3ª prioridade: TCE-RJ (até 200 chars)
       municipal.discr                  -- 4ª prioridade: Fiorilli municipal (150 chars)
   ) as objeto
   ```
   - Adicionar metadado de rastreabilidade: `fonte_objeto` (`pncp`, `contrato_local`, `tcerj` ou `municipal`).
   - Adicionar `link_sistema_origem` quando oriundo do PNCP.

7. **Camada de Acesso a Dados Kysely e Fixtures (`@transparencia/db`):**
   - Atualizar `fct_licitacoes` garantindo que o Radar Cívico (Story 12.5) e as páginas `/licitacoes` e `/saude` realizem busca textual e exibição sobre o objeto des-truncado.
   - Criar leitor Kysely para itens da licitação: `getLicitacaoItens(portalSlug, { ano, numeroCompra })`.
   - Implementar DTOs tipados estritamente em `camelCase` (`numeroItem`, `descricaoItem`, `quantidade`, `unidadeMedida`, `valorUnitarioEstimado`, `valorUnitarioHomologado`, `percentualDesconto`, `fornecedorCnpj`, `fornecedorRazaoSocial`, `fonteObjeto`, `linkSistemaOrigem`) conforme Regra 18 do AGENTS.md.
   - Regerar fixture compactada com `make db/fixture/dump` e validar integridade via `make test` e `make test/ts` (Regras 4 e 21 do AGENTS.md).

8. **Camada de Apresentação, UX e Documentação para IA (`apps/web`):**
   - Na visualização detalhada ou modal da licitação, exibir tabela expansível de itens licitados contendo quantidade, valores estimados vs. homologados, desconto e fornecedor vencedor.
   - Exibir badge com link para a sala de lances pública (Licitanet/sistema de origem) via `linkSistemaOrigem`.
   - Sincronizar os guias de consumo público por IA (`apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`) documentando a disponibilidade de itens licitados conforme a Regra 12 do AGENTS.md.

---

## Tasks / Subtasks

- [x] Task 1: Enriquecimento Interno com Contratos Locais no dbt (AC: 1, 6)
  - [x] Atualizar `int_licitacoes_consolidadas.sql` cruzando com `stg_porciuncula_prefeitura__contratos` via `codtce` e `licitacao_numero`.
  - [x] Testar paridade e cobertura do enriquecimento interno.
- [x] Task 2: Extrator e Ingestão do PNCP (Compras, Itens e Resultados) (AC: 2, 3)
  - [x] Criar extrator em `elt/extract/pncp/` consumindo `/contratacoes/publicacao`, compras por sequencial, `/itens` e `/resultados`.
  - [x] Criar carregador em `elt/load/pncp/` gravando em `raw_pncp.compras`, `raw_pncp.itens` e `raw_pncp.itens_resultados` com colunas `TEXT`.
  - [x] Declarar fontes em `elt/transform/models/staging/pncp/_sources.yml`.
- [x] Task 3: Modelagem dbt Staging e Mart de Itens Licitados (AC: 4)
  - [x] Criar modelos staging `stg_pncp__compras.sql`, `stg_pncp__itens.sql` e `stg_pncp__itens_resultados.sql`.
  - [x] Criar mart `fct_licitacoes_itens.sql` unificando referências e métricas calculadas (deságio, vencedor, valores unitários).
- [x] Task 4: Unificação da Hierarquia no Mart `fct_licitacoes`, Kysely e Fixtures (AC: 6, 7)
  - [x] Consolidar a hierarquia `COALESCE` em `int_licitacoes_consolidadas.sql` e mart `fct_licitacoes`.
  - [x] Criar leitor Kysely `getLicitacaoItens` com DTOs em `camelCase`.
  - [x] Regerar fixture com `make db/fixture/dump` e rodar testes (`make test`, `make test/ts`).
- [x] Task 5: UI de Licitações (Detalhamento de Itens e Link da Sala de Disputa) e Guias de IA (AC: 8)
  - [x] Exibir tabela/seção expansível de itens licitados na visualização de licitações.
  - [x] Exibir link para sala de disputa (Licitanet) quando presente em `linkSistemaOrigem`.
  - [x] Atualizar `llms.txt` e `llms-full.txt`.
