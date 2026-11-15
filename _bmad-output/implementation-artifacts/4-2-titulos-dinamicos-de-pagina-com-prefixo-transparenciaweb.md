---
baseline_commit: b790690
generated_at: 2026-08-06T23:22:00-03:00
---

# Story 4.2: Títulos Dinâmicos de Página com Prefixo TransparenciaWeb

## Metadados

- Epic: 4 - Experiência Visual, Responsividade Mobile, SEO & Otimização para LLMs
- Story ID: 4.2
- Story Key: 4-2-titulos-dinamicos-de-pagina-com-prefixo-transparenciaweb
- Status: done
- Arquivo: _bmad-output/implementation-artifacts/4-2-titulos-dinamicos-de-pagina-com-prefixo-transparenciaweb.md

## User Story

Como visitante do portal de transparência,
Quero que todas as páginas apresentem títulos descritivos e padronizados com o prefixo `TransparenciaWeb`,
Para que eu possa identificar facilmente a seção atual e a entidade municipal nas abas do meu navegador e nos meus marcadores.

## Critérios de Aceitação (BDD)

**Given** qualquer página renderizada no portal (ex: `/visao-geral`, `/despesas`, `/caprem`, `/saude`, `/receitas`, `/pessoal`, `/licitacoes`, `/orcamento`)
**When** a página é carregada no navegador
**Then** o título HTML da página (`<title>`) deve seguir rigorosamente a estrutura `TransparenciaWeb - [Nome da Tela] | [Entidade do Portal]`.

**And** o `layout.tsx` raiz do Next.js (`apps/web/app/layout.tsx`) deve definir a propriedade `title.template` padronizada na constante `metadata`.

**And** se a entidade do portal for `"Prefeitura de Porciúncula"` e a página acessada for Despesas (`/porciuncula_prefeitura/despesas`), o título final renderizado no elemento `<title>` deve ser `TransparenciaWeb - Despesas | Prefeitura de Porciúncula`.

**And** a suíte de validação completa (`make test`, `make test/ts`, `pnpm build`) executa e passa com 100% de sucesso.

## Contexto da Epic e Valor

- A Epic 4 estabelece a excelência visual, SEO, suporte a LLMs e diretrizes de código no frontend.
- Títulos de página inconsistentes ou padrão (ex: apenas `"Next.js App"` ou `"Transparencia"`) prejudicam a usabilidade em múltiplas abas, a navegabilidade para leitores de tela e o rankeamento no SEO.
- No Next.js App Router, o controle de títulos é feito via exportação de `metadata` estático ou `generateMetadata` dinâmico em layouts e páginas.
- Esta story padroniza o template de títulos no `RootLayout` e implementa os metadados dinâmicos em todas as 8 rotas principais do portal municipal.

## Guardrails Arquiteturais Obrigatórios

### AD-5 e Multi-tenant
1. O parâmetro `portalSlug` deve ser utilizado para buscar a configuração da entidade através de `getPortalConfig(portalSlug)` da biblioteca `@transparencia/db`.
2. Em caso de portal não encontrado ou falha, utilizar o fallback padrão da entidade (`displayName` ou `"Prefeitura de Porciúncula"`).

### AGENTS.md e Protocolos de Qualidade
1. **Nomes Explícitos**: Nenhuma abreviação opaca (ex: `t`, `ttl`, `ent`). Utilizar nomes descritivos como `portalDisplayName`, `pageTitle`, `formattedTitle`.
2. **Programação Funcional**: Preferir imutabilidade e funções puras para formatação de títulos.
3. Testes de integração dbt/Python (`make test`) devem passar 100%.
4. Testes de tipos e contratos Kysely (`make test/ts`) devem passar 100%.
5. O build de produção Next.js e pacotes (`pnpm build`) deve compilar sem nenhum aviso ou erro.

## Descoberta de Artefatos Carregados

- Epics: `_bmad-output/planning-artifacts/epics.md`
- PRD: `_bmad-output/planning-artifacts/prds/prd-transparencia-2026-08-01/prd.md`
- Arquitetura: `_bmad-output/planning-artifacts/architecture/architecture-transparencia-2026-08-01/ARCHITECTURE-SPINE.md`
- Aprendizados da Story Anterior (4.1):
  - No Next.js App Router, `apps/web/app/layout.tsx` exporta `metadata: Metadata`.
  - Configuração de ícones (`icons`) já foi adicionada na Story 4.1. A propriedade `title` deve ser incorporada de forma limpa mantendo os ícones intactos.
  - Proxy/middleware em `apps/web/proxy.ts` já intercepta ativos estáticos.

## Estado Atual dos Arquivos a Serem Modificados / Criados

### 1. Atualização (UPDATE) - `apps/web/app/layout.tsx`:
- Atualmente possui `export const metadata: Metadata` (com `icons`).
- Deve ser atualizado para incluir a propriedade `title`:
  ```typescript
  export const metadata: Metadata = {
    title: {
      default: "TransparenciaWeb",
      template: "TransparenciaWeb - %s",
    },
    // icons...
  };
  ```

### 2. Atualização / Modificação (UPDATE) das 8 Rotas Principais em `apps/web/app/[portalSlug]`:

1. `apps/web/app/[portalSlug]/page.tsx` (Visão Geral)
   - Adicionar `export async function generateMetadata({ params }: VisaoGeralPageProps): Promise<Metadata>`
   - Nome da Tela: `Visão Geral`
   - Retornar `{ title: `Visão Geral | ${portalDisplayName}` }` (que o template transforma em `TransparenciaWeb - Visão Geral | Prefeitura de Porciúncula`).

2. `apps/web/app/[portalSlug]/orcamento/page.tsx`
   - Adicionar `generateMetadata`
   - Nome da Tela: `Orçamento`
   - Retornar `{ title: `Orçamento | ${portalDisplayName}` }`

3. `apps/web/app/[portalSlug]/despesas/page.tsx`
   - Adicionar `generateMetadata`
   - Nome da Tela: `Despesas`
   - Retornar `{ title: `Despesas | ${portalDisplayName}` }`

4. `apps/web/app/[portalSlug]/receitas/page.tsx`
   - Adicionar `generateMetadata`
   - Nome da Tela: `Receitas`
   - Retornar `{ title: `Receitas | ${portalDisplayName}` }`

5. `apps/web/app/[portalSlug]/pessoal/page.tsx`
   - Adicionar `generateMetadata`
   - Nome da Tela: `Pessoal`
   - Retornar `{ title: `Pessoal | ${portalDisplayName}` }`

6. `apps/web/app/[portalSlug]/licitacoes/page.tsx`
   - Adicionar `generateMetadata`
   - Nome da Tela: `Licitações`
   - Retornar `{ title: `Licitações | ${portalDisplayName}` }`

7. `apps/web/app/[portalSlug]/caprem/page.tsx`
   - Adicionar `generateMetadata`
   - Nome da Tela: `CAPREM`
   - Retornar `{ title: `CAPREM | ${portalDisplayName}` }`

8. `apps/web/app/[portalSlug]/saude/page.tsx`
   - Adicionar `generateMetadata`
   - Nome da Tela: `Saúde`
   - Retornar `{ title: `Saúde | ${portalDisplayName}` }`

## Tarefas / Subtarefas

- [x] **Task 1 - Configurar `title.template` no Root Layout (AC: 2, 3)**
  - [x] Atualizar `apps/web/app/layout.tsx` adicionando `title: { default: "TransparenciaWeb", template: "TransparenciaWeb - %s" }` aos metadados.
  - [x] Garantir que a configuração existente de `icons` seja preservada.

- [x] **Task 2 - Implementar `generateMetadata` nas Páginas de Domínio (AC: 1, 3, 5)**
  - [x] Criar/atualizar a função `generateMetadata` em `apps/web/app/[portalSlug]/page.tsx` (Visão Geral).
  - [x] Criar/atualizar a função `generateMetadata` em `apps/web/app/[portalSlug]/orcamento/page.tsx`.
  - [x] Criar/atualizar a função `generateMetadata` em `apps/web/app/[portalSlug]/despesas/page.tsx`.
  - [x] Criar/atualizar a função `generateMetadata` em `apps/web/app/[portalSlug]/receitas/page.tsx`.
  - [x] Criar/atualizar a função `generateMetadata` em `apps/web/app/[portalSlug]/pessoal/page.tsx`.
  - [x] Criar/atualizar a função `generateMetadata` em `apps/web/app/[portalSlug]/licitacoes/page.tsx`.
  - [x] Criar/atualizar a função `generateMetadata` em `apps/web/app/[portalSlug]/caprem/page.tsx`.
  - [x] Criar/atualizar a função `generateMetadata` em `apps/web/app/[portalSlug]/saude/page.tsx`.

- [x] **Task 3 - Suíte Completa de Validação (AC: 4)**
  - [x] Executar `make test` para verificar integridade do dbt/Python.
  - [x] Executar `make test/ts` para verificar integridade dos tipos Kysely/TypeScript.
  - [x] Executar `pnpm build` para confirmar 0 erros de compilação no Next.js e pacotes monorepo.

### Review Findings (AI)

- [x] [Review][Patch] Refactor generateMetadata duplication across 8 pages and ensure safe empty-string fallback [`apps/web/app/[portalSlug]/*/page.tsx`]
- [x] [Review][Patch] Wrap getPortalConfig with React cache() to eliminate duplicate DB fetches [`packages/db/src/queries/metadata.ts`]
- [x] [Review][Defer] Add full OpenGraph, Twitter and Description Metadata payload [`apps/web/app/[portalSlug]/*/page.tsx`] — deferred, pre-existing (Story 4.5)


## Checklist de Validação da Story

- [x] `metadata.title.template` definido em `apps/web/app/layout.tsx`.
- [x] Todas as 8 rotas principais possuem `generateMetadata` dinâmico com `portalSlug`.
- [x] Formatação final dos títulos nos elementos `<title>` segue o padrão `TransparenciaWeb - [Nome da Tela] | [Entidade do Portal]`.
- [x] `make test` aprovado 100% verde (82 passed).
- [x] `make test/ts` aprovado 100% verde (16 passed).
- [x] `pnpm build` compila com 0 erros.

## Dev Agent Record

### Agent Model Used

Gemini 3.6 Flash (Medium)

### Debug Log References

- `pnpm test` (`make test/ts`): 16/16 testes TypeScript de paridade e tipos executados e aprovados com 100% sucesso.
- `pnpm build`: Build de produção do Next.js executado com sucesso e 0 erros ou avisos de compilação TypeScript/Turbopack.
- `make test`: 82/82 testes pytest/dbt integrados executados e aprovados com 100% sucesso.

### Completion Notes List

- Adicionado objeto `title` com `default: "TransparenciaWeb"` e `template: "TransparenciaWeb - %s"` no `RootLayout` (`apps/web/app/layout.tsx`), preservando metadados de ícones da Story 4.1.
- Implementada a função `generateMetadata` assíncrona em todas as 8 rotas dinâmicas do portal:
  - `apps/web/app/[portalSlug]/page.tsx` (`Visão Geral | [Entidade]`)
  - `apps/web/app/[portalSlug]/orcamento/page.tsx` (`Orçamento | [Entidade]`)
  - `apps/web/app/[portalSlug]/despesas/page.tsx` (`Despesas | [Entidade]`)
  - `apps/web/app/[portalSlug]/receitas/page.tsx` (`Receitas | [Entidade]`)
  - `apps/web/app/[portalSlug]/pessoal/page.tsx` (`Pessoal | [Entidade]`)
  - `apps/web/app/[portalSlug]/licitacoes/page.tsx` (`Licitações | [Entidade]`)
  - `apps/web/app/[portalSlug]/caprem/page.tsx` (`CAPREM | [Entidade]`)
  - `apps/web/app/[portalSlug]/saude/page.tsx` (`Saúde | [Entidade]`)
- Todas as funções consultam a entidade via `getPortalConfig(portalSlug)` com fallback gracioso para `"Prefeitura de Porciúncula"`.

### File List

- `apps/web/app/layout.tsx` (MODIFIED)
- `apps/web/app/[portalSlug]/page.tsx` (MODIFIED)
- `apps/web/app/[portalSlug]/orcamento/page.tsx` (MODIFIED)
- `apps/web/app/[portalSlug]/despesas/page.tsx` (MODIFIED)
- `apps/web/app/[portalSlug]/receitas/page.tsx` (MODIFIED)
- `apps/web/app/[portalSlug]/pessoal/page.tsx` (MODIFIED)
- `apps/web/app/[portalSlug]/licitacoes/page.tsx` (MODIFIED)
- `apps/web/app/[portalSlug]/caprem/page.tsx` (MODIFIED)
- `apps/web/app/[portalSlug]/saude/page.tsx` (MODIFIED)
- `_bmad-output/implementation-artifacts/4-2-titulos-dinamicos-de-pagina-com-prefixo-transparenciaweb.md` (MODIFIED)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (MODIFIED)

## Change Log

- **2026-08-06**: Criação da especificação completa da Story 4.2 para padronização dos títulos de página com o prefixo `TransparenciaWeb`. Status: ready-for-dev.
- **2026-08-07**: Implementação concluída do template de títulos no RootLayout e `generateMetadata` dinâmico em todas as 8 rotas principais. Validação com `make test`, `make test/ts` e `pnpm build` 100% verde. Status: review.
