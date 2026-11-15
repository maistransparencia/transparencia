---
baseline_commit: c2db6637978135dde05a9d29c521a24d10cea98f
---

# Story 9.1: Quick-Wins de Consistência na UI: Data de Extração Real, Responsividade Mobile no Elemento Pai (.99) e Ordenação Nativa em Licitações

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a citizen or municipal transparency analyst accessing the portal on desktop or mobile devices,
I want the partial year indicator to reflect the exact month of data extraction, the generic expense breakdown card (.99) to display comfortably on mobile screens without squished labels, and the contracts table under procurement to sort by clicking column headers like all other tables in the portal,
So that I get accurate chronological context, flawless mobile readability, and a consistent, standard navigation experience across the platform.

---

## Acceptance Criteria

1. **Camada de Dados `@transparencia/db` e `@transparencia/ui` — Exposição e Consumo da Data de Extração (Regras 1, 2 e 9 de `AGENTS.md`):**
   - No arquivo [packages/db/src/queries/metadata.ts](file:///Volumes/Projects/transparencia/packages/db/src/queries/metadata.ts), o tipo `PortalConfig` deve expor formalmente:
     ```ts
     dataExtracaoDate: Date | null;
     ```
   - A função `getPortalConfig` deve converter a coluna `row.data_extracao` para um objeto `Date` válido (ou `null` se ausente/inválido), além da string `dataExtracao` já existente (garantindo retrocompatibilidade).
   - No arquivo [packages/ui/src/utils/formatters.ts](file:///Volumes/Projects/transparencia/packages/ui/src/utils/formatters.ts), a função `getPartialYearPeriod(referenceDate?: Date | string | null): string` deve ser ajustada para:
     - Aceitar opcionalmente um `Date`, string ISO ou `null/undefined` (com default para `new Date()` apenas quando omitido).
     - Se receber uma string `YYYY-MM-DD`, parsear com segurança para `Date`.
     - Determinar o período parcial com base no mês da data de referência informada: se a data de extração for do exercício atual, retornar `"Jan–<Mês da Extração>"` (ex: extração em 15/08/2026 -> `"Jan–Ago"`).
   - Todos os view-models das páginas (`apps/web/app/[portalSlug]/**/view-model.ts` e `view-model.tsx`) que chamam `getPartialYearPeriod()` devem receber e repassar a data de extração real (`dataExtracaoDate` ou `dataExtracao`) obtida de `portalConfig` ou dos metadados da página, eliminando chamadas sem argumentos que dependem do relógio da máquina do usuário/servidor.

2. **Responsividade Mobile no Card de Concentração por Elemento Pai (.99) em Despesas:**
   - No componente [apps/web/components/termometro-opacidade-fiscal.tsx](file:///Volumes/Projects/transparencia/apps/web/components/termometro-opacidade-fiscal.tsx#L359-L415), na seção "Concentração por Elemento Pai (Subitens .99)":
     - Corrigir o layout da linha de cada elemento para evitar compressão no mobile (`xs` / `< 640px`):
       - No topo: código do elemento (ex: `39.99`), descrição com truncamento flexível e badge de classificação (`Estrutural` / `Evitável`).
       - Ao centro: barra de progresso horizontal em largura total (`w-full`).
       - Abaixo da barra de progresso: linha com o valor monetário (`fmtCompact(elem.totalPago)`) e percentual (`fmtPercent(elem.percentualDoResidual99)`), com alinhamento limpo e espaçamento respirável.
     - Garantir que telas pequenas (320px a 390px) exibam a descrição e os números com legibilidade total, sem quebra de layout, sem scroll horizontal e sem encavalamento de textos.

3. **Padronização da Tabela de Contratos em Licitações (`LicitacoesTable`):**
   - No componente [apps/web/components/licitacoes-table.tsx](file:///Volumes/Projects/transparencia/apps/web/components/licitacoes-table.tsx):
     - **Remover** o elemento `<select>` dropdown de ordenação ("Ordenar por: Maior valor, Menor valor, Fornecedor, Período") da toolbar.
     - **Tornar os cabeçalhos das colunas clicáveis e ordenáveis**, em alinhamento estrito com os componentes `DenseTable` e `DataTable` do projeto:
       - Coluna **Fornecedor** (ordenação alfabética A-Z / Z-A).
       - Coluna **Objeto** (ordenação alfabética A-Z / Z-A).
       - Coluna **Modalidade** (ordenação alfabética).
       - Coluna **Valor (R$)** (ordenação numérica asc / desc, default inicial: maior valor desc).
       - Coluna **Período** (ordenação cronológica por mês asc / desc).
     - Exibir indicadores visuais de ordenação nos cabeçalhos (`ArrowUpDown`, `ArrowUp`, `ArrowDown` do `lucide-react`).
     - Manter a busca textual rápida por fornecedor/objeto/modalidade e o botão de download de CSV perfeitamente integrados.
     - Adicionar suporte a navegação por teclado e atributos de acessibilidade nos cabeçalhos (`aria-sort="ascending" | "descending" | "none"` e `role="columnheader"`).

4. **Diretrizes Arquiteturais e Qualidade (`AGENTS.md`):**
   - **Regra 13 (Zero Ternários Aninhados):** Manuseio de estados de ordenação e classes condicionais implementados com funções auxiliares ou IIFEs.
   - **Regra 7 (Pinned Versions):** Não introduzir novas dependências no `package.json`.

5. **Testes Automatizados e Validação:**
   - Teste unitário em `packages/ui/src/utils/__tests__/formatters.spec.ts` validando `getPartialYearPeriod` com datas em diferentes meses do ano, viradas de ano e inputs em string ou Date.
   - Testes unitários do `termometro-opacidade-fiscal.spec.tsx` atualizados para verificar a renderização dos elementos e valores na nova estrutura responsiva.
   - Testes unitários do `LicitacoesTable` em `apps/web/components/licitacoes-table.spec.tsx` cobrindo a ordenação ao clicar nos cabeçalhos de coluna (valor, fornecedor, período) e remoção do dropdown.
   - Sucesso em `make test/ts`, `pnpm --filter web test`, `pnpm --filter @transparencia/ui test`, `pnpm build`, `make test` e `make check`.

---

## Tasks / Subtasks

- [x] Task 1: Expor `dataExtracaoDate` e refatorar `getPartialYearPeriod` (AC: 1, 4, 5)
  - [x] Subtask 1.1: Atualizar interface `PortalConfig` e query `getPortalConfig` em [packages/db/src/queries/metadata.ts](file:///Volumes/Projects/transparencia/packages/db/src/queries/metadata.ts) para expor `dataExtracaoDate: Date | null`.
  - [x] Subtask 1.2: Ajustar `getPartialYearPeriod` em [packages/ui/src/utils/formatters.ts](file:///Volumes/Projects/transparencia/packages/ui/src/utils/formatters.ts) para receber `Date | string | null` e formatar até o mês da extração.
  - [x] Subtask 1.3: Criar suíte de testes em `packages/ui/src/utils/__tests__/formatters.spec.ts` cobrindo `getPartialYearPeriod`.
  - [x] Subtask 1.4: Atualizar os loaders e view-models das páginas (`apps/web/app/[portalSlug]/**/view-model.ts`) para injetar a data de extração real em `getPartialYearPeriod(dataExtracao)`.

- [x] Task 2: Refatorar responsividade do Card de Concentração por Elemento Pai (.99) (AC: 2, 4, 5)
  - [x] Subtask 2.1: Reestruturar o markup JSX em [apps/web/components/termometro-opacidade-fiscal.tsx](file:///Volumes/Projects/transparencia/apps/web/components/termometro-opacidade-fiscal.tsx#L359-L415) para posicionar valor e percentual abaixo da barra de progresso no mobile com flex-col.
  - [x] Subtask 2.2: Atualizar ou expandir testes em `apps/web/components/termometro-opacidade-fiscal.spec.tsx`.

- [x] Task 3: Padronizar cabeçalhos ordenáveis em `LicitacoesTable` (AC: 3, 4, 5)
  - [x] Subtask 3.1: Remover o `<select>` de ordenação da toolbar em [apps/web/components/licitacoes-table.tsx](file:///Volumes/Projects/transparencia/apps/web/components/licitacoes-table.tsx).
  - [x] Subtask 3.2: Adicionar estado `sortColumn` e `sortDirection`, tornando `<th>` interativos com botões acessíveis e ícones direcionais.
  - [x] Subtask 3.3: Atualizar testes em `apps/web/components/licitacoes-table.spec.tsx` para simular cliques nos cabeçalhos de coluna e verificar a ordenação dos dados.

- [x] Task 4: Validação final e conformidade
  - [x] Subtask 4.1: Executar `make test/ts`, `pnpm build`, `make test` e `make check`.

### Review Findings

- [x] [Review][Decision] Ícones de ordenação em LicitacoesTable — Mantidos ChevronsUpDown/ChevronUp/ChevronDown para seguir a identidade visual do componente DenseTable do design system (conforme decisão do usuário).
- [x] [Review][Patch] Ponderar o ano na ordenação cronológica de período em LicitacoesTable [apps/web/components/licitacoes-table.tsx:94]
- [x] [Review][Patch] Resetar currentPage para 1 ao reordenar colunas em LicitacoesTable [apps/web/components/licitacoes-table.tsx:56]
- [x] [Review][Patch] Adicionar anel de foco visível (focus-visible:ring-*) nos botões de cabeçalho da tabela [apps/web/components/licitacoes-table.tsx:244]
- [x] [Review][Patch] Remover sanitização redundante e conversão repetitiva de valorContrato no sort de LicitacoesTable [apps/web/components/licitacoes-table.tsx:86]
- [x] [Review][Patch] Proteger parseReferenceDate e getPortalConfig contra deslocamento de fuso UTC em datas sem hora [packages/ui/src/utils/formatters.ts:87]
- [x] [Review][Patch] Evitar chamada de toISOString em instância inválida de Date em getPortalConfig [packages/db/src/queries/metadata.ts:59]
- [x] [Review][Patch] Prevenir width NaN% e adicionar role progressbar na barra de ElementoResidualRow [apps/web/components/termometro-opacidade-fiscal.tsx:880]
- [x] [Review][Patch] Remover propriedade key redundante dentro do template raiz de ElementoResidualRow [apps/web/components/termometro-opacidade-fiscal.tsx:848]
- [x] [Review][Patch] Evitar fragmento '(PARCIAL, )' nas páginas quando partialPeriod retornar vazio [apps/web/app/[portalSlug]/despesas/page.tsx:64]
- [x] [Review][Patch] Expandir testes unitários para viradas de ano em formatters e ordenação de Objeto/Modalidade em LicitacoesTable [packages/ui/src/utils/__tests__/formatters.spec.ts:1]
- [x] [Review][Defer] Tratamento e logging estruturado de falhas em getPortalConfig [packages/db/src/queries/metadata.ts:30] — deferred, pre-existing

---

## Dev Notes

- **Metadata do Portal:** `dim_portais` armazena `data_extracao` como `DATE` no Postgres. No Kysely / node-postgres, campos `DATE` retornam como instâncias de `Date` ou strings dependendo da tipagem do pooler. O helper em `metadata.ts` já trata `row.data_extracao` com `toISOString()`, mas agora deve manter também a instância `Date` intacta em `dataExtracaoDate`.
- **View Models Afetados:**
  - `apps/web/app/[portalSlug]/orcamento/view-model.ts`
  - `apps/web/app/[portalSlug]/despesas/view-model.ts`
  - `apps/web/app/[portalSlug]/receitas/view-model.ts`
  - `apps/web/app/[portalSlug]/pessoal/view-model.ts`
  - `apps/web/app/[portalSlug]/licitacoes/view-model.ts`
  - `apps/web/app/[portalSlug]/saude/view-model.ts`
  - `apps/web/app/[portalSlug]/view-model.tsx`
  - `apps/web/components/caprem-hero-section.tsx`
- **Tabela de Licitações:** Espelhar o comportamento de ordenação do `DenseTable` (`packages/ui/src/components/dense-table.tsx`), mantendo o estilo visual de badges e alertas de fracionamento já existentes.

---

## Dev Agent Record

### Implementation Plan
- **Task 1:** Expor `dataExtracaoDate: Date | null` na interface `PortalConfig` e implementar o parser seguro em `getPortalConfig`. Refatorar `getPartialYearPeriod` para aceitar `Date | string | null`, formatando até o mês da extração com cobertura de testes unitários em `packages/ui/src/utils/__tests__/formatters.spec.ts`. Injetar `portalConfig` nos loaders e view-models de todas as rotas temáticas.
- **Task 2:** Refatorar a responsividade do card de concentração por elemento pai (.99) em `termometro-opacidade-fiscal.tsx` para evitar quebra em dispositivos móveis.
- **Task 3:** Tornar cabeçalhos de coluna clicáveis e ordenáveis em `licitacoes-table.tsx`, removendo o `<select>` da toolbar.
- **Task 4:** Executar validação final e conformidade completa.

### Completion Notes
- ✅ **Task 1 concluída com sucesso:**
  - Interface `PortalConfig` e query `getPortalConfig` em `packages/db/src/queries/metadata.ts` atualizadas para fornecer `dataExtracaoDate: Date | null`.
  - `getPartialYearPeriod` em `packages/ui/src/utils/formatters.ts` refatorado para aceitar `Date | string | null`, formatando dinamicamente até o mês da extração real (ex: `Jan–Ago`).
  - Suíte de testes criada em `packages/ui/src/utils/__tests__/formatters.spec.ts` com 6 testes cobrindo variações de mês, string ISO, instâncias Date, omitido/undefined e entradas nulas/inválidas.
  - Loaders e view-models atualizados em `apps/web`: `visao-geral`, `orcamento`, `despesas`, `receitas`, `pessoal`, `licitacoes`, `saude` e `caprem-hero-section`.
  - 100% de sucesso em `pnpm --filter @transparencia/ui test`, `pnpm --filter @transparencia/db test`, `pnpm --filter web test`, `pnpm build`, `pnpm run lint`, `make check` e `make test`.
- ✅ **Task 2 concluída com sucesso:**
  - Extraído o componente reutilizável `ElementoResidualRow` em `termometro-opacidade-fiscal.tsx` implementando a estrutura responsiva em 3 níveis (topo: código, descrição com truncamento flexível e badge; centro: barra de progresso em largura total; base: valor monetário formatado e percentual do residual com espaçamento respirável).
  - Aplicado o componente em `top5Elementos` e na gaveta retrátil de `demaisElementos`.
  - Expandida a suíte de testes em `termometro-opacidade-fiscal.spec.tsx` cobrindo todos os 9 testes com verificação explícita dos valores e percentuais.
  - 100% de aprovação nos testes do web e do monorepo, linting Biome limpo e build Next.js validado.
- ✅ **Task 3 concluída com sucesso:**
  - Removido o elemento `<select>` de ordenação da toolbar em `apps/web/components/licitacoes-table.tsx`, preservando a busca e a exportação CSV.
  - Adicionados estados `sortColumn` e `sortDirection` ('asc' | 'desc') com default `valorContrato` desc (maior valor primeiro).
  - Transformados os `<th>` da tabela em cabeçalhos ordenáveis com botões acessíveis, atributos `aria-sort` e ícones dinâmicos (`ChevronsUpDown`, `ChevronUp`, `ChevronDown`) em estrita conformidade com a Regra 13 (sem ternários aninhados).
  - Criada suíte de testes unitários dedicada em `apps/web/components/licitacoes-table.spec.tsx` com 6 testes cobrindo ordenação por fornecedor, valor, período, busca combinada e verificação de remoção do select antigo.
  - 100% dos testes passando (253 testes em web, 55 em db, 6 em ui), build e lint validados.
- ✅ **Task 4 concluída com sucesso:**
  - `make test/ts`: Todos os testes TypeScript/React aprovados com sucesso (314 testes no total: 6 em `@transparencia/ui`, 55 em `@transparencia/db`, 253 em `web`).
  - `pnpm build`: Build de produção Turbo + Next.js Turbopack concluído com êxito sem erros de compilação ou checagem estática.
  - `make check`: Ruff lint, Ruff format e Mypy typechecker executados sem apontamentos (55 arquivos auditados).
  - `make test`: Suíte completa do backend Python com pytest sobre PostgreSQL efêmero executada com 100% de sucesso (83/83 testes aprovados).
  - Status da story transicionado para `review` em `sprint-status.yaml` e no artefato da story.

---

## File List

- `packages/db/src/queries/metadata.ts` (modificado)
- `packages/db/src/queries/__tests__/metadata.spec.ts` (modificado)
- `packages/ui/package.json` (modificado)
- `packages/ui/vitest.config.ts` (criado)
- `packages/ui/src/utils/formatters.ts` (modificado)
- `packages/ui/src/utils/__tests__/formatters.spec.ts` (criado)
- `apps/web/app/[portalSlug]/loader.ts` (mantido retrocompatível)
- `apps/web/app/[portalSlug]/view-model.tsx` (modificado)
- `apps/web/app/[portalSlug]/orcamento/loader.ts` (modificado)
- `apps/web/app/[portalSlug]/orcamento/view-model.ts` (modificado)
- `apps/web/app/[portalSlug]/despesas/loader.ts` (modificado)
- `apps/web/app/[portalSlug]/despesas/view-model.ts` (modificado)
- `apps/web/app/[portalSlug]/receitas/loader.ts` (modificado)
- `apps/web/app/[portalSlug]/receitas/view-model.ts` (modificado)
- `apps/web/app/[portalSlug]/pessoal/loader.ts` (modificado)
- `apps/web/app/[portalSlug]/pessoal/view-model.ts` (modificado)
- `apps/web/app/[portalSlug]/licitacoes/loader.ts` (modificado)
- `apps/web/app/[portalSlug]/licitacoes/view-model.ts` (modificado)
- `apps/web/app/[portalSlug]/saude/loader.ts` (modificado)
- `apps/web/app/[portalSlug]/saude/view-model.ts` (modificado)
- `apps/web/components/caprem-hero-section.tsx` (modificado)
- `apps/web/components/termometro-opacidade-fiscal.tsx` (modificado)
- `apps/web/components/termometro-opacidade-fiscal.spec.tsx` (modificado)
- `apps/web/components/licitacoes-table.tsx` (modificado)
- `apps/web/components/licitacoes-table.spec.tsx` (criado)
- `apps/web/app/[portalSlug]/receitas/loader.ts` (modificado)
- `apps/web/app/[portalSlug]/receitas/view-model.ts` (modificado)
- `apps/web/app/[portalSlug]/pessoal/loader.ts` (modificado)
- `apps/web/app/[portalSlug]/pessoal/view-model.ts` (modificado)
- `apps/web/app/[portalSlug]/licitacoes/loader.ts` (modificado)
- `apps/web/app/[portalSlug]/licitacoes/view-model.ts` (modificado)
- `apps/web/app/[portalSlug]/saude/loader.ts` (modificado)
- `apps/web/app/[portalSlug]/saude/view-model.ts` (modificado)
- `apps/web/app/[portalSlug]/caprem/loader.ts` (modificado)
- `apps/web/app/[portalSlug]/caprem/view-model.ts` (modificado)
- `apps/web/app/[portalSlug]/caprem/page.tsx` (modificado)
- `apps/web/components/caprem-hero-section.tsx` (modificado)
- `apps/web/components/termometro-opacidade-fiscal.tsx` (modificado)
- `apps/web/components/termometro-opacidade-fiscal.spec.tsx` (modificado)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modificado)
- `_bmad-output/implementation-artifacts/9-1-quick-wins-consistencia-ui-data-extracao-mobile-e-ordenacao-contratos.md` (modificado)

---

## Change Log

- **2026-09-05:** Implementação da Task 1 (Expor `dataExtracaoDate`, refatoração de `getPartialYearPeriod` e injeção da data de extração real nos view-models do portal).
- **2026-09-05:** Implementação da Task 2 (Reestruturação responsiva em 3 níveis do card de elementos residuais .99 em `termometro-opacidade-fiscal.tsx` e ampliação de testes unitários).

