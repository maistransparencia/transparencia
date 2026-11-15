---
baseline_commit: 0edd9ba
generated_at: 2026-08-07T16:19:00-03:00
---

# Story 4.5: Estruturação para Leitura por LLMs (LLM-Friendly App Architecture)

## Metadados

- Epic: 4 - Experiência Visual, Responsividade Mobile, SEO & Otimização para LLMs
- Story ID: 4.5
- Story Key: 4-5-estruturacao-para-leitura-por-llms-llm-friendly-app-architecture
- Status: done
- Arquivo: _bmad-output/implementation-artifacts/4-5-estruturacao-para-leitura-por-llms-llm-friendly-app-architecture.md

## User Story

Como agente de IA, modelo LLM, leitor de tela ou web crawler,
Quero que a aplicação web possua semântica estruturada HTML5, metadados Schema.org em JSON-LD e os arquivos padrão `/llms.txt` e `/llms-full.txt`,
Para que eu possa extrair, consultar, interpretar e relacionar os dados de transparência pública municipal de forma precisa, padronizada e sem ruído de raspagem visual.

## Critérios de Aceitação (BDD)

**Given** um agente de IA ou leitor de tela acessando a aplicação web
**When** a estrutura do documento HTML é analisada
**Then** o layout deve utilizar tags semânticas HTML5 (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`, `<table>` acessíveis com `<caption` e `<th scope="col">`) com papéis ARIA apropriados (`role="navigation"`, `role="main"`, `role="contentinfo"`, etc.).

**And** o portal deve servir os arquivos estáticos `/llms.txt` e `/llms-full.txt` na raiz da aplicação web (`apps/web/public/` ou rotas equivalentes), detalhando o propósito da plataforma, rotas principais (`/[portalSlug]`, `/[portalSlug]/despesas`, `/[portalSlug]/receitas`, `/[portalSlug]/orcamento`, `/[portalSlug]/licitacoes`, `/[portalSlug]/pessoal`, `/[portalSlug]/caprem`, `/[portalSlug]/saude`), os marts de métricas do dbt que servem como SSOT e a arquitetura de acesso multi-tenant via `portalSlug`.

**And** as páginas principais do portal devem incluir metadados estruturados no padrão `Schema.org` (`GovernmentOrganization`, `DataCatalog`, `Dataset`, `WebSite`) serializados via `<script type="application/ld+json">` (JSON-LD), refletindo dinamicamente o nome da entidade municipal e dados da prestação de contas.

**And** a suíte de validação completa (`make test`, `make test/ts`, `pnpm build`) deve executar e passar com 100% de sucesso sem avisos ou erros de tipagem.

## Contexto da Epic e Valor

- A Epic 4 garante excelência em experiência visual, responsividade mobile, SEO e suporte nativo a inteligência artificial.
- Com o avanço de agentes autônomos e modelos de linguagem (LLMs) que realizam auditoria cidadã, análises contábeis e buscas automatizadas, portais de transparência pública precisam ser "LLM-Friendly".
- O padrão `llms.txt` (https://llmstxt.org/) tornou-se a especificação de mercado para disponibilizar contexto estruturado, mapas de rotas e dicionários de dados para IAs.
- Além do `llms.txt`, a presença de esquemas JSON-LD (`Schema.org`) permite que buscadores como Google e IAs estruturadas compreendam diretamente a natureza governamental dos conjuntos de dados expostos.

## Guardrails Arquiteturais Obrigatórios

### AD-5 e Multi-tenant
1. O parâmetro `portalSlug` deve ser devidamente documentado nos arquivos `/llms.txt` e `/llms-full.txt` como chave primária de roteamento multi-tenant.
2. Componentes JSON-LD em `apps/web` devem receber dynamic props baseadas na entidade do portal (`portalConfig.displayName`, `portalConfig.uf`, `portalConfig.portalUrl`).

### AGENTS.md e Protocolos de Qualidade
1. **Nomes Explícitos**: Nenhuma abreviação opaca (`d`, `ld`, `sch`, `org`). Utilizar identificadores claros (`jsonLdDataset`, `governmentOrganizationSchema`, `dataCatalogSchema`).
2. **Programação Funcional**: Manter imutabilidade na geração das estruturas de JSON-LD.
3. **Versões Pinned**: Nenhuma adição de pacotes sem versão exata. Utilizar o `next` nativo e componentes React existentes sem adicionar dependências desnecessárias.
4. **Validação Estrita**: `make test` (Python/dbt), `make test/ts` (TypeScript/Kysely) e `pnpm build` devem ser aprovados com 100% de sucesso.

## Aprendizados das Stories Anteriores (4.1 a 4.4)

- **Story 4.1**: Next.js Metadata API em `app/layout.tsx` é a localização primária para inclusão de metadados globais.
- **Story 4.2**: Prefixos de título `TransparenciaWeb - [Tela] | [Entidade]` já estabelecem padrão de metadados na aplicação.
- **Story 4.3**: A estrutura de layout raiz e sidebar (`SidebarWrapper`) já divide o app em `<SidebarWrapper>` e `<main>`.
- **Story 4.4**: Testes fiscais e de paridade do dbt/Kysely devem ser mantidos sem regressão fiscal.

---

## Tasks / Subtasks

- [x] **Task 1: Criação dos Arquivos Padrão `/llms.txt` e `/llms-full.txt`** (AC: #2)
  - [x] Criar `apps/web/public/llms.txt` fornecendo resumo executivo da aplicação TransparenciaWeb, entidades municipais atendidas, guia de navegação por rotas (`/[portalSlug]/...`), estrutura multi-tenant e resumo da arquitetura dbt (SSOT).
  - [x] Criar `apps/web/public/llms-full.txt` contendo a especificação técnica detalhada, dicionário de dados dos marts de métricas (`fct_posicao_fiscal_metricas`, `fct_analise_despesas_metricas`, `fct_execucao_orcamentaria_metricas`, `fct_fontes_receita_metricas`, `fct_historia_caprem_metricas`, `fct_historia_saude_metricas`), contratos Kysely do `@transparencia/db` e instruções completas para agentes de IA.

- [x] **Task 2: Implementação de Metadados Estruturados JSON-LD (Schema.org)** (AC: #3)
  - [x] Criar componente reutilizável `JsonLd` ou helper `apps/web/components/json-ld.tsx` (ou `apps/web/app/components/json-ld.tsx`) que aceita schemas `Schema.org`.
  - [x] Definir o schema `GovernmentOrganization` / `GovernmentService` contendo dados da prefeitura/entidade municipal (`displayName`, `uf`, `officialPortalUrl`).
  - [x] Definir os schemas `DataCatalog` e `Dataset` para os conjuntos de dados de transparência pública (Execução Orçamentária, Despesas, Receitas, CAPREM, Saúde, Licitações, Pessoal).
  - [x] Integrar o `JsonLd` no `RootLayout` (`apps/web/app/layout.tsx`) e/ou layout/página do portal (`apps/web/app/[portalSlug]/layout.tsx` ou `page.tsx`).

- [x] **Task 3: Auditoria e Reforço de Semântica HTML5 e Acessibilidade** (AC: #1)
  - [x] Auditar `apps/web/app/layout.tsx`, `apps/web/app/components/sidebar-wrapper.tsx` e `apps/web/components/` para garantir uso correto de `<header>`, `<nav>`, `<main>`, `<section>`, `<article>` e `<footer>`.
  - [x] Garantir que tabelas de dados (`packages/ui/src/components/dense-table.tsx` e tabelas customizadas em `apps/web/components/`) possuem estrutura semântica apropriada (`<thead>`, `<tbody>`, `<th scope="col">`, `<caption>` ou `aria-label`).
  - [x] Adicionar papéis ARIA (`role="navigation"`, `role="main"`, `role="contentinfo"`, `aria-label`) onde relevante para leitores de tela e robôs de inspeção.

- [x] **Task 4: Validação e Gates de Qualidade** (AC: #4)
  - [x] Executar a suíte de testes do dbt (`make test`) e verificar se não há quebras.
  - [x] Executar a suíte de testes de tipos TypeScript (`make test/ts`).
  - [x] Executar o build de produção (`pnpm build`) e testar o acesso a `http://localhost:3000/llms.txt` e `http://localhost:3000/llms-full.txt`.

---

## Dev Notes

### Especificação de Arquivos a Criar/Modificar

1. **`apps/web/public/llms.txt`** (NOVO)
   - Formato Markdown segundo o padrão `llms.txt`.
   - Conteúdo:
     - Título e Descrição do TransparenciaWeb.
     - Seção `## Portal Structure`: Explicação de `/[portalSlug]` (ex: `porciuncula-prefeitura`).
     - Seção `## Available Routes`: Lista das 7 rotas principais (`/visao-geral`, `/despesas`, `/receitas`, `/orcamento`, `/licitacoes`, `/pessoal`, `/caprem`, `/saude`).
     - Seção `## Data Source & Reliability`: Explicação dos marts dbt como SSOT (Single Source of Truth) e pré-materialização física.

2. **`apps/web/public/llms-full.txt`** (NOVO)
   - Formato Markdown detalhado.
   - Conteúdo:
     - Guia completo para LLMs e Agentes de IA.
     - Mapeamento detalhado dos marts no dbt (`elt/transform/models/marts/metrics/`):
       - `fct_posicao_fiscal_metricas`
       - `fct_analise_despesas_metricas`
       - `fct_execucao_orcamentaria_metricas`
       - `fct_fontes_receita_metricas`
       - `fct_historia_caprem_metricas`
       - `fct_historia_saude_metricas`
     - Estrutura de dados exposta pela API TypeScript `@transparencia/db`.
     - Instruções de extração de dados e interpretação de balanços contábeis municipais (STN/MCASP).

3. **`apps/web/components/json-ld.tsx`** (NOVO)
   - Componente React cliente/servidor que renderiza `<script type="application/ld+json">`.
   - Exemplo de tipo:
     ```tsx
     interface JsonLdProps {
       schema: Record<string, unknown>;
     }

     export function JsonLd({ schema }: JsonLdProps) {
       return (
         <script
           type="application/ld+json"
           dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
         />
       );
     }
     ```
   - Schemas a gerar via helpers em `json-ld.tsx` (ou arquivo utilitário):
     - `GovernmentOrganization`: `@context: "https://schema.org"`, `@type: "GovernmentOrganization"`, `name`, `url`, `parentOrganization`.
     - `DataCatalog`: `@context: "https://schema.org"`, `@type: "DataCatalog"`, `name: "Portal de Transparência Municipal"`, `dataset: [...]`.
     - `Dataset`: Para cada domínio de dados (Despesas, Receitas, CAPREM, etc.).

4. **`apps/web/app/layout.tsx` e `apps/web/app/[portalSlug]/layout.tsx` ou `page.tsx`** (UPDATE)
   - Injetar o componente `JsonLd` com os dados do `portalConfig` obtidos do `@transparencia/db`.
   - Garantir tags semânticas `<header>`, `<main>` e `<footer>`.

### Checklist de Semântica HTML5
- `<header>`: Para a faixa superior (Ribbon) e topo da sidebar/menu.
- `<nav aria-label="Navegação Principal">`: Para os links da sidebar.
- `<main>`: Para o container principal de conteúdo em `layout.tsx` (já existe, verificar atributos ARIA).
- `<section>`: Para cada bloco/card principal nas páginas de domínio.
- `<table>`, `<thead>`, `<tbody>`, `<th scope="col">`: Para tabelas de dados em `packages/ui` e `apps/web/components/`.

---

## Dev Agent Record

### Agent Model Used
Gemini 3.6 Flash (Antigravity CLI)

### Debug Log References
- `make test`: Passed 83 tests in Python/dbt test suite.
- `make test/ts`: Passed 16 tests in Vitest / TypeScript parity suite.
- `pnpm build`: Next.js 16 build succeeded with 0 errors.

### Completion Notes List
- Criados os arquivos estáticos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` seguindo a especificação llmstxt.org.
- Implementado o componente `JsonLd` em `apps/web/components/json-ld.tsx` com geradores de schemas `Schema.org` (`GovernmentOrganization`, `DataCatalog`, `Dataset`).
- Integrado o componente `JsonLd` no `RootLayout` (`apps/web/app/layout.tsx`).
- Reforçada a acessibilidade semântica com o atributo `scope="col"` no header de tabelas `DenseTable` em `packages/ui/src/components/dense-table.tsx`.
- Validados todos os gates de build e testes (`make test`, `make test/ts`, `pnpm build`).

### File List
- `apps/web/public/llms.txt`
- `apps/web/public/llms-full.txt`
- `apps/web/components/json-ld.tsx`
- `apps/web/app/layout.tsx`
- `packages/ui/src/components/dense-table.tsx`
- `_bmad-output/implementation-artifacts/4-5-estruturacao-para-leitura-por-llms-llm-friendly-app-architecture.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
