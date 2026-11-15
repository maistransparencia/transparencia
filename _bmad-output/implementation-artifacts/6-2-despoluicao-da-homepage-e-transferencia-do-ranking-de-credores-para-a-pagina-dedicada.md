---
baseline_commit: a0e2e2cb3e93583ec79e318fed1db744c7b3cad7
---

# Story 6.2: Despoluição da Homepage e Transferência do Ranking de Credores para a Página Dedicada

**Status:** done  
**Epic:** Epic 6: Reformulação Fiscal da Homepage e Redesenho da Página de Despesas Detalhadas  

## User Story

As a citizen / municipal portal visitor,  
I want the "Maiores Credores da Gestão Atual" section removed from the Homepage overview,  
So that the homepage remains concise, high-level, and focused on macro fiscal indicators, while supplier-level details are cleanly hosted on the detailed expenses page.

## Acceptance Criteria

### Componentes UI & Remoção do Bloco de Maiores Credores na Homepage
1. **Remoção Visual Limpa:** A visão geral da Homepage em `apps/web/app/[portalSlug]/page.tsx` não renderiza mais o bloco visual "Maiores Credores da Gestão Atual" nem a tabela de credores (`DenseTable`).
2. **Remoção de Import Desnecessário:** O import não utilizado de `DenseTable` (de `@transparencia/ui`) em `apps/web/app/[portalSlug]/page.tsx` é removido.

### View Model, Loader & Limpeza do Data Pipeline na Tela Inicial
3. **Limpeza do View Model (`view-model.tsx`):** O construtor do View Model `buildVisaoGeralViewModel` em `apps/web/app/[portalSlug]/view-model.tsx` não processa nem retorna as propriedades `sanitizedCredores` e `credoresCols`.
4. **Otimização do Loader (`loader.ts`):** O loader da visão geral em `apps/web/app/[portalSlug]/loader.ts` remove o campo `topCredoresAdmAtual` da propriedade `posicao` do DTO retornado, evitando o tráfego de listas brutas de credores desnecessárias para a página inicial.
5. **Preservação de Métricas Úteis:** A contagem total de fornecedores (`totalCredoresAdmAtual`) é mantida no objeto `posicao` e repassada ao `subtext` do `despesasCardData` ("pendentes a N fornecedores") sem regressão visual no card de Despesas.

### Validação, Tipagem & Testes
6. **Atualização da Suíte de Testes Unitários:** Os testes unitários do ViewModel em `apps/web/app/[portalSlug]/view-model.spec.ts` são atualizados para refletir a nova estrutura da DTO sem as propriedades `sanitizedCredores` e `credoresCols`.
7. **Suíte de Validação Limpa:** 
   - A execução de `pnpm test` (ou `make test/ts`) passa com 100% de sucesso em todos os pacotes.
   - A compilação via `pnpm build` finaliza sem nenhum erro de tipagem TypeScript.

---

## Contexto para Desenvolvedores & Guardrails

### 📂 Arquivos Afetados (UPDATE)

1. **`apps/web/app/[portalSlug]/page.tsx`**
   - **Estado Atual:** Renderiza a seção "Maiores Credores da Gestão Atual" utilizando `DenseTable` condicionado a `viewModel.sanitizedCredores.length > 0`.
   - **Modificações Necessárias:**
     - Remover o bloco JSX contendo o título `h3` "Maiores Credores da Gestão Atual" e o componente `<DenseTable>`.
     - Remover o import de `DenseTable` de `@transparencia/ui`.
   - **O que Preservar:** Renderização dos componentes `HeroFiscalCard`, `PipelineExecucao` e `CardsSecundariosVisaoGeral`.

2. **`apps/web/app/[portalSlug]/view-model.tsx`**
   - **Estado Atual:** Mapeia `credoresCols` e `sanitizedCredores` chamando `toTitleCase(credor.fornecedor)` sobre `posicao.topCredoresAdmAtual` e exporta na DTO de retorno.
   - **Modificações Necessárias:**
     - Remover o mapeamento de `credoresCols` e `sanitizedCredores`.
     - Remover a exportação de `sanitizedCredores` e `credoresCols` no objeto retornado por `buildVisaoGeralViewModel`.
   - **O que Preservar:** Leitura de `posicao.totalCredoresAdmAtual` para compor o `subtext` do `despesasCardData`.

3. **`apps/web/app/[portalSlug]/loader.ts`**
   - **Estado Atual:** Inclui `topCredoresAdmAtual: posicaoDetalhada.topCredoresAdmAtual` dentro do objeto `posicao` retornado por `loadVisaoGeralData`.
   - **Modificações Necessárias:**
     - Remover a propriedade `topCredoresAdmAtual` do objeto `posicao`.
   - **O que Preservar:** Manter `totalCredoresAdmAtual: posicaoDetalhada.totalCredoresAdmAtual` no objeto `posicao`.

4. **`apps/web/app/[portalSlug]/view-model.spec.ts`**
   - **Estado Atual:** Possui mocks de `topCredoresAdmAtual` e asserções de `sanitizedCredores`.
   - **Modificações Necessárias:**
     - Atualizar o mock `makeRawVisaoGeral` removendo `sanitizedCredores` se presente.
     - Garantir que as asserções de testes existentes passem sem referências a `sanitizedCredores` ou `credoresCols`.

---

## Regras de Projeto e Diretrizes Mandatórias (AGENTS.md)

- **Regra 1 (Economia de Contexto):** Mantenha alterações restritas e cirúrgicas aos arquivos especificados.
- **Regra 2 (A Camada de Apresentação é Burra):** Os componentes de visualização (`apps/web/app/`) apenas consomem DTOs tipados.
- **Regra 9 (Nomeação Clara de Métricas):** É proibido utilizar nomes abreviados. Mantenha `totalCredoresAdmAtual` claro e explícito.
- **Regra 14 (Zero Duplicação & Zero Tipos Inúteis):** Remova DTOs e propriedades mortas sem deixar resíduos de código não utilizado.

---

## Sequência Ordenada de Tasks

### 🔴 FASE 1: Limpeza do Loader e ViewModel
- [x] **Task 1:** Atualizar `apps/web/app/[portalSlug]/loader.ts` removendo a propriedade `topCredoresAdmAtual` do objeto `posicao`.
- [x] **Task 2:** Atualizar `apps/web/app/[portalSlug]/view-model.tsx` removendo `credoresCols` e `sanitizedCredores` do retorno de `buildVisaoGeralViewModel`, preservando `posicao.totalCredoresAdmAtual`.

### 🔵 FASE 2: Remoção do Bloco de Credores na Homepage UI
- [x] **Task 3:** Atualizar `apps/web/app/[portalSlug]/page.tsx` removendo a seção da tabela "Maiores Credores da Gestão Atual" e o import não utilizado de `DenseTable`.

### 🟢 FASE 3: Validação, Testes Unitários e Build
- [x] **Task 4:** Atualizar `apps/web/app/[portalSlug]/view-model.spec.ts` ajustando a fixture de dados brutos do teste para estar em conformidade com o novo tipo do ViewModel.
- [x] **Task 5:** Executar a suíte completa de testes (`pnpm test` ou `make test/ts`) e verificar a tipagem/build (`pnpm build`).

---

## Dev Agent Record

### Implementation Plan
1. **Limpeza de Loader e ViewModel (Tasks 1, 2):** Remover `topCredoresAdmAtual`, `sanitizedCredores` e `credoresCols` dos pipelines da tela inicial, mantendo apenas a contagem total de credores.
2. **Atualização da UI da Homepage (Task 3):** Remover a seção visual da tabela de credores de `page.tsx` e limpar imports mortos.
3. **Testes e Validação (Tasks 4, 5):** Atualizar a suíte de testes unitários do ViewModel e executar `pnpm test` e `pnpm build`.

### Completion Notes
- **Task 1 & 2:** Removida a propriedade `topCredoresAdmAtual` em `loader.ts` e as propriedades `sanitizedCredores` e `credoresCols` do `buildVisaoGeralViewModel` em `view-model.tsx`.
- **Task 3:** Removida a seção visual "Maiores Credores da Gestão Atual" e a importação de `DenseTable` em `page.tsx`.
- **Task 4 & 5:** Atualizada a suíte de testes unitários do ViewModel em `view-model.spec.ts`. Validação completa (`pnpm test` e `pnpm --filter web exec tsc --noEmit`) aprovada com 100% de sucesso e zero erros.

---

## File List

- `apps/web/app/[portalSlug]/loader.ts` (UPDATE)
- `apps/web/app/[portalSlug]/view-model.tsx` (UPDATE)
- `apps/web/app/[portalSlug]/page.tsx` (UPDATE)
- `apps/web/app/[portalSlug]/view-model.spec.ts` (UPDATE)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (UPDATE)
- `_bmad-output/implementation-artifacts/6-2-despoluicao-da-homepage-e-transferencia-do-ranking-de-credores-para-a-pagina-dedicada.md` (UPDATE)

---

## Change Log

- **2026-08-26:** Criada a especificação da Story 6.2 para remoção da tabela "Maiores Credores da Gestão Atual" da Homepage e otimização do DTO do View Model da visão geral.
- **2026-08-26:** Concluída a implementação da Story 6.2. Removido o bloco da tabela de credores da visão geral, limpos os DTOs do loader/view-model e atualizados os testes unitários. Todos os testes e checagens TypeScript passaram com 100% de sucesso.
