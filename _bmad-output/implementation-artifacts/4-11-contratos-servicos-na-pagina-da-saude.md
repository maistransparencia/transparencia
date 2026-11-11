---
baseline_commit: 659bfbaf073cfd8f9374d9a71404b866266bb475
---

# Story 4.11: Contratos de Serviços e Revisão de Dados na Seção "Como o Fundo Contrata" (Página da Saúde)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a municipal transparency user / auditor,
I want the Health page (`/saude`) to feature audited KPI cards in the "Como o Fundo Contrata" section and display active health service contracts,
So that I can clearly distinguish formal contracts from total paid vendors, audit carona procurement vs. regular bidding, and inspect the municipality's top health service contracts by pending exposure.

---

## Acceptance Criteria

### AC #1 — Auditoria e Alinhamento dos KPIs da Seção "Como o Fundo Contrata"
- **Given** os cards de KPI na seção "Como o Fundo Contrata" (`<SaudeContratacaoSection />`) da página de Saúde
- **When** os dados forem carregados e renderizados na interface
- **Then** cada card deve exibir um rótulo e subtexto semanticamente correto e sem contradições lógicas:
  - **Card 1 (Contratos Formais):** Título `"Contratos formais"`, valor numérico `contratosVinculadosCount`, subtexto `"registrados no portal de compras"` (ou equivalente explicativo, sem misturar com a contagem de fornecedores de todas as despesas).
  - **Card 2 (Fornecedores Pagos):** Título `"Fornecedores pagos"`, valor numérico `fornecedoresAtivosCount`, subtexto `"receberam pagamentos do Fundo no ano"`.
  - **Card 3 (Adesões a Ata):** Título `"Adesões de ata (carona)"`, valor numérico `adesaoCaronaCount`, subtexto com o valor monetário formatado (`fmtCompact(adesaoCaronaValor) + " contratados"`).
  - **Card 4 (Execução via Ata Externa):** Título `"Pago via ata externa"`, valor formatado `fmtCompact(pagoAtaExternaValor)`, subtexto `${empenhosAtaExternaCount} notas de empenho`.

### AC #2 — Carregamento dos Contratos de Serviços Vigentes no Loader da Saúde
- **Given** uma requisição de renderização para a rota `/[portalSlug]/saude`
- **When** a função `loadSaudeData(portalSlug, searchParams)` for executada em `apps/web/app/[portalSlug]/saude/loader.ts`
- **Then** deve invocar `getContratosServicosVigentes(tenantSlug, context.selectedYear, empresaIds)` paralelamente dentro de `Promise.all`.
- **And** deve incluir a propriedade `contratosServicosVigentes` (com fallback para array vazio `[]` em caso de erro/nulo) dentro do objeto `saude` retornado pelo loader.

### AC #3 — Mapeamento dos Dados no View-Model da Saúde
- **Given** os dados brutos carregados pelo `loader.ts` da Saúde
- **When** `buildSaudeViewModel(rawData)` for invocado em `apps/web/app/[portalSlug]/saude/view-model.ts`
- **Then** o objeto de visão retornado deve expor `saude.contratosServicosVigentes` contendo os contratos de serviços de saúde vigentes para consumo pelos componentes de apresentação.

### AC #4 — Exibição dos Contratos de Serviços Vigentes na `<SaudeContratacaoSection />`
- **Given** a página da Saúde renderizando a seção **"Como o Fundo Contrata"**
- **When** existirem contratos de serviços vigentes para as entidades de saúde selecionadas
- **Then** a seção deve renderizar a listagem e os cards visuais de contratos de serviços vigentes (`<ContratosServicosVigentesSection contratos={contratosServicosVigentes} />` ou a composição de `<ContratoServicoVigenteCard />` + `<DenseTable />` com status de execução `em_execucao`, `concluido` e `inexecutado`).
- **And** caso a lista esteja vazia, a seção deve tratar graciosamente sem quebrar a UI nem renderizar tabelas corrompidas.

### AC #5 — Tratamento de Fallbacks e Proteção de Erros
- **Given** um município, entidade ou ano sem contratos de serviços vigentes cadastrados
- **When** a página da Saúde for renderizada
- **Then** os cards de KPI continuam exibindo valores zerados ou mensagens neutras sem lançar exceções de runtime (`undefined` / `null`).

### AC #6 — Conformidade com Diretrizes do Projeto e Guias de LLM
- **Given** as alterações realizadas no frontend e no pacote `@transparencia/db`
- **When** a documentação e validação forem inspecionadas
- **Then** `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` devem ser atualizados registrando a presença da auditoria de contratos e fornecedores na rota `/saude`.
- **And** as suítes de validação (`pnpm --filter web test` / `make test/ts` e `pnpm build`) devem passar com 100% de sucesso.

---

## Tasks / Subtasks

- [ ] **Task 1: Auditoria e Refatoração dos KPIs em `<SaudeContratacaoSection />`** (AC: #1, #5)
  - [ ] Atualizar `apps/web/components/saude-contratacao-section.tsx` para receber `contratosServicosVigentes?: ContratoServicoVigente[]`.
  - [ ] Separar e renomear os 4 cards de KPI com títulos e subtextos semanticamente explícitos:
    - Card 1: `"Contratos formais"` com `contratosVinculadosCount` e subtexto claro.
    - Card 2: `"Fornecedores pagos"` com `fornecedoresAtivosCount` e subtexto claro.
    - Card 3: `"Adesões de ata (carona)"` com `adesaoCaronaCount` e montante contratado.
    - Card 4: `"Pago via ata externa"` com montante pago e contagem de empenhos.
  - [ ] Garantir zero operadores ternários aninhados (utilizar IIFE ou helper functions conforme Regra 13 de `AGENTS.md`).

- [ ] **Task 2: Atualização do Loader da Saúde (`apps/web/app/[portalSlug]/saude/loader.ts`)** (AC: #2)
  - [ ] Importar `getContratosServicosVigentes` de `@transparencia/db`.
  - [ ] No `Promise.all` de `loadSaudeData`, adicionar a chamada `getContratosServicosVigentes(tenantSlug, context.selectedYear, empresaIds)`.
  - [ ] Propagar `contratosServicosVigentes` dentro do retorno `saude`.

- [ ] **Task 3: Atualização do View-Model da Saúde (`apps/web/app/[portalSlug]/saude/view-model.ts`)** (AC: #3)
  - [ ] Garantir que o DTO de retorno repasse `contratosServicosVigentes` de forma imutável e fortemente tipada.

- [ ] **Task 4: Integração Visual dos Contratos na Página da Saúde (`apps/web/app/[portalSlug]/saude/page.tsx` & componentes)** (AC: #4)
  - [ ] Passar `contratosServicosVigentes={saude.contratosServicosVigentes}` para `<SaudeContratacaoSection />` em `page.tsx`.
  - [ ] Integrar os cards e a tabela de contratos de serviços vigentes da saúde dentro de `<SaudeContratacaoSection />` (reutilizando `<ContratoServicoVigenteCard />` / `<ContratosServicosVigentesSection />` ou `<DenseTable />`).

- [ ] **Task 5: Atualização dos Guias de IA/LLM (`llms.txt` e `llms-full.txt`)** (AC: #6)
  - [ ] Atualizar `apps/web/public/llms.txt` na seção `/saude` mencionando o detalhamento de contratos de serviços vigentes do Fundo Municipal de Saúde e a distinção entre contratos formais e fornecedores pagos.
  - [ ] Atualizar `apps/web/public/llms-full.txt` com a documentação correspondente dos campos e regras da rota `/saude`.

- [ ] **Task 6: Testes Unitários e Validação de Tipagem** (AC: #6)
  - [ ] Atualizar mocks e asserções em `apps/web/app/[portalSlug]/saude/view-model.spec.ts`.
  - [ ] Atualizar mocks e asserções em `apps/web/app/[portalSlug]/saude/page.spec.tsx`.
  - [ ] Executar `pnpm --filter web test` para garantir aprovação de todos os testes unitários.
  - [ ] Executar `pnpm build` para garantir conformidade estrita do compilador TypeScript.

---

## Dev Notes

### 1. Arquitetura e Reutilização (@transparencia/db)
- **Não criar queries novas:** O leitor Kysely `getContratosServicosVigentes` já existe em `packages/db/src/queries/contratos-servicos-vigentes.ts` e aceita `empresaIds?: string[]`:
  ```typescript
  export async function getContratosServicosVigentes(
    portalSlug: string,
    ano: number,
    empresaIds?: string[],
  ): Promise<ContratoServicoVigente[]>
  ```
- No loader da Saúde (`apps/web/app/[portalSlug]/saude/loader.ts`), `empresaIds` já é calculado filtrando entidades por `"saude"` / `"saúde"`. Passar esse array diretamente para a função leitora.

### 2. Componentes de UI e Estilo
- Reutilizar `<ContratoServicoVigenteCard />` de `apps/web/components/contrato-servico-vigente-card.tsx` e `<ContratosServicosVigentesSection />` de `apps/web/components/contratos-servicos-vigentes-section.tsx` (ou integrar diretamente a seção de contratos dentro de `saude-contratacao-section.tsx`).
- Respeitar a tipografia editorial: `font-serif` em títulos, `DenseTable` para listagens tabulares, badges de status de execução (`em_execucao`, `concluido`, `inexecutado`).

### 3. Diretrizes Mandatórias do Repositório (`AGENTS.md`)
- **Regra 2 & 9:** Nomes de métricas e variáveis 100% explícitos (proibido `pct`, `emp`, `c_val`).
- **Regra 10:** Slugs e discriminadores em `lowercase_snake_case`.
- **Regra 13:** Zero ternários aninhados (`a ? b : c ? d : e`). Usar IIFE ou funções auxiliares com `return` antecipado.
- **Regra 14:** Sem duplicação de sanitização de strings se já vier tratada do banco.

---

### Project Structure Notes

- `apps/web/app/[portalSlug]/saude/loader.ts`: Co-localização de dados (Server-side data loader).
- `apps/web/app/[portalSlug]/saude/view-model.ts`: Transformações puras e imutáveis.
- `apps/web/app/[portalSlug]/saude/page.tsx`: Server Component Next.js.
- `apps/web/components/saude-contratacao-section.tsx`: Componente de apresentação da seção "Como o Fundo Contrata".
- `apps/web/public/llms.txt` & `llms-full.txt`: Documentação pública de consumo por IAs.

---

### References

- [Source: apps/web/app/[portalSlug]/saude/loader.ts]
- [Source: apps/web/app/[portalSlug]/saude/view-model.ts]
- [Source: apps/web/app/[portalSlug]/saude/page.tsx]
- [Source: apps/web/components/saude-contratacao-section.tsx]
- [Source: packages/db/src/queries/contratos-servicos-vigentes.ts]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 4]

---

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash

### Debug Log References

- Análise de consistência em `apps/web/app/[portalSlug]/saude/`
- Paridade de tipagem com `@transparencia/db/src/queries/contratos-servicos-vigentes.ts`
- Verificação de execução da suíte `pnpm --filter web test` (21 arquivos / 71 testes passando)

### Completion Notes List

- Story 4.11 estruturada com guia completo de implementação, guardrails arquiteturais e tarefas rastreáveis.

### File List

- `apps/web/app/[portalSlug]/saude/loader.ts`
- `apps/web/app/[portalSlug]/saude/view-model.ts`
- `apps/web/app/[portalSlug]/saude/page.tsx`
- `apps/web/components/saude-contratacao-section.tsx`
- `apps/web/app/[portalSlug]/saude/view-model.spec.ts`
- `apps/web/app/[portalSlug]/saude/page.spec.tsx`
- `apps/web/public/llms.txt`
- `apps/web/public/llms-full.txt`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
