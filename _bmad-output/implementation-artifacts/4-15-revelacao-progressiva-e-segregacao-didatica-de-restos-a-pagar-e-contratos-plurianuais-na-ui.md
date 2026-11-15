---
baseline_commit: 1a96202
---

# Story 4.15: Revelação Progressiva e Segregação Didática de Restos a Pagar e Contratos Plurianuais na UI

Status: review

## Story

**As a** munícipe ou auditor fiscal navegando pelas seções de Posição Fiscal e Licitações/Contratos do Portal da Transparência,  
**I want** que o card de Restos a Pagar e o painel/drawer de detalhes de contratos plurianuais apresentem a segregação entre obrigações processadas vs não processadas e mandato de origem via técnica de revelação progressiva (progressive disclosure),  
**So that** eu possa auditar com clareza as obrigações financeiras e compromissos plurianuais do município sem que a interface principal fique poluída com caixas de texto promocionais ou badges ruidosos.

## Acceptance Criteria

1. **Given** os componentes de Posição Fiscal e Licitações/Contratos em `apps/web/components/` (ex: `cards-secundarios-visao-geral.tsx`, `contratos-servicos-vigentes-section.tsx`, `contrato-servico-vigente-card.tsx`)
2. **When** o usuário visualiza o card principal de Restos a Pagar no painel de Posição Fiscal ou Visão Geral
3. **Then** o card de Restos a Pagar deve apresentar um indicador discreto de informação `(i)` com tooltip simples em hover explicando a distinção contábil (STN/MCASP) entre Restos Processados (dívidas de serviços já prestados e liquidados) e Não Processados (obras/serviços contratados em andamento).
4. **Given** a interação do usuário ao abrir o Drawer ou Modal de Detalhes de um contrato plurianual ou passivo de Restos a Pagar
5. **When** os detalhes expandidos forem exibidos
6. **Then** a interface deve apresentar a segregação por mandato de origem (`Gestão Atual [2025-2028]` vs `Gestões Anteriores [Pré-2025]`) e detalhar a vigência e data de celebração de contratos plurianuais (ex: celebrado em 2023 com término em 2026).
7. **And** a listagem principal da interface deve permanecer limpa e enxunta, sem adição de blocos de texto promocionais, banners ruidosos ou acúmulo de badges que causem sobrecarga cognitiva na UI.
8. **Given** alterações ou adições em conceitos públicos de segregação de restos a pagar ou vigências contábeis
9. **When** a funcionalidade for concluída
10. **Then** os guias de leitura para IAs `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` devem ser atualizados conforme a Regra 12 de `AGENTS.md`.
11. **And** todas as suítes de validação e testes (`make test`, `make test/ts` e `pnpm build`) devem passar com 100% de sucesso.

---

## Tasks / Subtasks

- [x] **Task 1: Indicador Discreto `(i)` e Tooltip Explicativo de Restos a Pagar no Card de Despesas** (AC: #1, #2, #3, #7)
  - [x] Adicionar um indicador discreto `(i)` com tooltip em hover no cabeçalho do card de Despesas/Restos a Pagar em `apps/web/components/cards-secundarios-visao-geral.tsx`.
  - [x] Configurar o texto da tooltip explicitando a diferença contábil entre Restos Processados (serviços executados) vs Não Processados (empenhos em andamento).
  - [x] Manter a estética minimalista e limpa do card sem caixas de texto permanentes no fluxo da página.

- [x] **Task 2: Segregação por Mandato e Detalhamento Plurianual na Revelação Progressiva (Drawer/Modal)** (AC: #1, #4, #5, #6, #7)
  - [x] Integrar no Drawer/Modal de detalhes de contratos ou restos a pagar a exibição do mandato de origem (`Gestão Atual` vs `Gestões Anteriores`).
  - [x] Exibir no detalhamento a data de celebração e o período total de vigência em contratos plurianuais.
  - [x] Garantir que o card da listagem principal não seja inflado com badges ou textos ruidosos.

- [x] **Task 3: Atualização de Documentação LLM (`llms.txt` / `llms-full.txt`) e Validação CI/CD** (AC: #8, #9, #10, #11)
  - [x] Atualizar os arquivos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` conforme a Regra 12 de `AGENTS.md`.
  - [x] Executar a suíte de testes fiscais Python/dbt via `make test`.
  - [x] Executar os testes unitários e de tipos TypeScript via `make test/ts` (ou `pnpm test`).
  - [x] Executar o build estático do Next.js via `pnpm build`.

---

## Dev Notes

### Arquitetura & Guardrails (`AGENTS.md`)

- **Regra 1 (Economia Extrema de Contexto)**: Utilizar `grep` e buscas cirúrgicas antes de ler arquivos completos.
- **Regra 2 (Arquitetura em Camadas)**: Inteligência contábil e queries pertencem a `@transparencia/db`. A camada UI em `apps/web/components/` apenas consome DTOs tipados.
- **Regra 9 (Nomeação Clara de Métricas)**: Proibido utilizar nomes de métricas abreviados (ex: `proc`, `nproc`, `gest`). Utilizar nomes explícitos como `restosProcessados`, `restosNaoProcessados`, `gestaoAtual`, `gestoesAnteriores`.
- **Regra 10 (Padrão de Valores Fixos em Lowercase Snake Case)**: Slugs e identificadores armazenados em `lowercase_snake_case` (ex: `'gestao_atual'`, `'gestao_anterior'`). A UI é a responsável pela formatação e exibição amigável aos usuários.
- **Regra 12 (Sincronização de Guias para IA)**: Atualizar `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` ao expor ou alterar rotas e conceitos de transparência pública.

### Contexto dos Arquivos Relevantes

- **`apps/web/components/cards-secundarios-visao-geral.tsx`**: Card de Despesas (Restos a Pagar) na Visão Geral/Posição Fiscal. Recebe `despesas: DespesasCardData`.
- **`apps/web/components/contrato-servico-vigente-card.tsx`**: Card individual de contrato de serviços.
- **`apps/web/components/contratos-servicos-vigentes-section.tsx`**: Seção de contratos com filtros e exibição de tabela.
- **`packages/db/src/queries/posicao-fiscal.ts`**: Leitora de métricas de posição fiscal e restos a pagar.
- **`apps/web/public/llms.txt` & `apps/web/public/llms-full.txt`**: Documentação pública para LLMs.

### Git Intelligence
Últimos commits recentes no repositório:
- `1a96202`: Merge branch 'feature/epic4-story-4-14' into dev
- `6a35dba`: feat(web): filtro de segmentacao de execucao e badges de status
- `dbb9c61`: feat(db): status de inexecucao contratual e paridade sql/typescript

---

## Dev Agent Record

### Agent Model Used
Gemini 3.6 Flash (Medium)

### Debug Log References
- N/A

### Completion Notes List
- Adicionado indicador discreto `(i)` com tooltip hover no card de Despesas/Restos a Pagar em `apps/web/components/cards-secundarios-visao-geral.tsx` detalhando a diferença contábil entre Restos Processados vs Não Processados (STN/MCASP).
- Implementado painel/drawer expandido de revelação progressiva em `apps/web/components/contrato-servico-vigente-card.tsx` exibindo a segregação por mandato de origem (`Gestão Atual [2025-2028]` vs `Gestões Anteriores [Pré-2025]`), número do contrato, objeto e vigência plurianual.
- Atualizados os guias de leitura para IAs `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` conforme a Regra 12 de `AGENTS.md`.
- Validados todos os gates de integridade: `make test` (83/83 Python/dbt), `pnpm test` (37/37 DB, 49/49 Web) e `pnpm build` com 100% de sucesso.

### Change Log
- 2026-08-19: Implemented Story 4.15 - Progressive disclosure and didactic segregation of Restos a Pagar and multi-year contracts in UI.

### File List
- `apps/web/components/cards-secundarios-visao-geral.tsx`
- `apps/web/components/contrato-servico-vigente-card.tsx`
- `apps/web/public/llms.txt`
- `apps/web/public/llms-full.txt`
- `packages/db/src/queries/contratos-servicos-vigentes.ts`
- `_bmad-output/implementation-artifacts/4-15-revelacao-progressiva-e-segregacao-didatica-de-restos-a-pagar-e-contratos-plurianuais-na-ui.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

