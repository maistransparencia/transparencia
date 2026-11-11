---
baseline_commit: c2db6637978135dde05a9d29c521a24d10cea98f
---

# Story 9.2: Redesign dos Indicadores de Saúde: Card de Emendas Parlamentares e Concentração Semântica de Fornecedores

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a citizen or public healthcare transparency observer,
I want the Health page hero cards to show the volume and execution of parliamentary grants (emendas) instead of a redundant budget allocation figure, and the pharmaceutical supplier concentration card to communicate with intuitive, plain-language ratings instead of an obscure academic HHI score,
So that I can immediately understand whether congressional money sent to our local healthcare system is actually being spent and whether medication procurement is diversified or dominated by a handful of companies.

---

## Acceptance Criteria

1. **Substituição da "Dotação Atualizada" por "Emendas na Saúde" no Hero KPIs (Regra 2 e 9 de `AGENTS.md`):**
   - No componente [apps/web/app/[portalSlug]/saude/page.tsx](file:///Volumes/Projects/transparencia/apps/web/app/[portalSlug]/saude/page.tsx#L60-L79), no `<KPIGrid columns={4}>`:
     - **Remover** o card estático e redundante `<KPICard title="Dotação Atualizada" value={fmtCompact(saude.orcamento.dotacao)} />` (a dotação já é comunicada em destaque na narrativa do `SaudeHeroSection`).
     - **Inserir** o novo card focado em emendas parlamentares destinadas à Saúde:
       - **Título:** `"Emendas na Saúde"` (ou `"Emendas Parlamentares"`).
       - **Valor Principal:** `fmtCompact(saude.emendasStats.totalAutorizado)` (ou `fmtCompact(saude.emendasStats.totalAutorizado || saude.fontesReceita.emendasParlamentares)`).
       - **Subtexto:**
         - Se houver valor autorizado (`totalAutorizado > 0`): exibir `${fmtCompact(saude.emendasStats.totalEmpenhado)} empenhados (${fmtPercent(saude.emendasStats.taxaEmpenho * 100)})`.
         - Se não houver emendas no ano: exibir `"Nenhuma emenda destinada no exercício"`.
       - **Accent/Alert:** Aplicar `accent={saude.emendasStats.totalAutorizado > 0}` e destaque positivo se a taxa de empenho for satisfatória.

2. **Redesign do Card de Concentração (HHI) para Linguagem Humana e Semântica:**
   - No componente [apps/web/app/[portalSlug]/saude/page.tsx](file:///Volumes/Projects/transparencia/apps/web/app/[portalSlug]/saude/page.tsx#L149-L158), na seção "Insumos e assistência farmacêutica":
     - **Título do Card:** Alterar de `"Concentração (HHI)"` para `"Concentração de Fornecedores"`.
     - **Valor Principal em Destaque:** Em vez de exibir o número cabalístico cru (ex: `2.840`), exibir uma classificação humana com badge semântico colorido:
       - `"Baixa"` (quando HHI < 1.500) com cor verde/esmeralda (`text-emerald-700 bg-emerald-50 border-emerald-200`).
       - `"Moderada"` (quando 1.500 <= HHI < 2.500) com cor âmbar (`text-amber-700 bg-amber-50 border-amber-200`).
       - `"Alta"` (quando HHI >= 2.500) com cor vermelha/alerta (`text-rose-700 bg-rose-50 border-rose-200`).
     - **Subtexto Explicativo:** Frase cidadã de fácil compreensão:
       - Baixa: `"Compras bem distribuídas entre múltiplos fornecedores"`
       - Moderada: `"Mercado moderadamente concentrado em poucas empresas"`
       - Alta: `"Alto risco de dependência: poucos fornecedores dominam os fornecimentos"`
     - **Preservação do Rigor Técnico (Auditor Friendly):**
       - Incluir a pontuação numérica exata do índice (ex: `Índice HHI: 2.840`) e a definição metodológica do CADE/STN como tooltip, texto auxiliar discreto (`text-[10px] text-slate-400 font-mono`) ou popover de ajuda, garantindo que pesquisadores continuem tendo acesso ao dado sem poluir a leitura do cidadão.

3. **Consistência de Tipos e Loaders em `apps/web`:**
   - Em [apps/web/app/[portalSlug]/saude/loader.ts](file:///Volumes/Projects/transparencia/apps/web/app/[portalSlug]/saude/loader.ts), aprimorar a função `classifyHhi` ou enriquecer o objeto `farmaceutica`:
     ```ts
     export interface FarmaceuticaConcentracao {
       hhi: number;
       nivel: "baixa" | "moderada" | "alta";
       label: string;
       descricao: string;
     }
     ```
   - Atualizar a função auxiliar com retornos antecipados em conformidade com a Regra 13 de `AGENTS.md`.

4. **Testes Automatizados:**
   - Atualizar [apps/web/app/[portalSlug]/saude/page.spec.tsx](file:///Volumes/Projects/transparencia/apps/web/app/[portalSlug]/saude/page.spec.tsx) para verificar a presença de `"Emendas na Saúde"` e `"Concentração de Fornecedores"`, removendo asserções de `"Dotação Atualizada"` e `"Concentração (HHI)"`.
    - Testar o comportamento com zero emendas e diferentes faixas de concentração (baixa, moderada, alta).
    - Aprovação integral em `make test/ts`, `pnpm --filter web test`, `pnpm build`, `make test` e `make check`.

5. **Padronização Estrita de DTOs e Tipos em `camelCase` (Regra 18 de `AGENTS.md`):**
   - É estritamente proibido criar propriedades de interfaces com chaves por extenso, acentos ou espaços (ex: `"Valor Autorizado"`, `Nº`, `"Esfera de Origem"`).
   - Todos os DTOs em `packages/db/src/queries/` devem usar estritamente `camelCase` (ex: `EmendaSaudeDTO`, `ContratoFracionamentoMetricsDTO`).
   - Os componentes e testes consumidores em `apps/web` devem consumir os campos em `camelCase`, mantendo a formatação humana apenas nos cabeçalhos de tabela (`header: "Valor Autorizado"`).

---

## Tasks / Subtasks

- [x] Task 1: Atualizar loaders e tipagem de classificação de fornecedores (AC: 2, 3)
  - [x] Subtask 1.1: Refatorar `classifyHhi` em [apps/web/app/[portalSlug]/saude/loader.ts](file:///Volumes/Projects/transparencia/apps/web/app/[portalSlug]/saude/loader.ts) para fornecer nível, label e texto explicativo amigável.
  - [x] Subtask 1.2: Ajustar view-model em [apps/web/app/[portalSlug]/saude/view-model.ts](file:///Volumes/Projects/transparencia/apps/web/app/[portalSlug]/saude/view-model.ts) se necessário.

- [x] Task 2: Implementar novo card de Emendas e redesenhar o card de concentração na página da Saúde (AC: 1, 2)
  - [x] Subtask 2.1: Substituir card "Dotação Atualizada" por "Emendas na Saúde" com `totalAutorizado` e taxa de empenho em [apps/web/app/[portalSlug]/saude/page.tsx](file:///Volumes/Projects/transparencia/apps/web/app/[portalSlug]/saude/page.tsx).
  - [x] Subtask 2.2: Redesenhar o card "Concentração de Fornecedores" com badges semânticos e texto cidadão explicativo.

- [x] Task 3: Atualizar suíte de testes (AC: 4)
  - [x] Subtask 3.1: Atualizar testes em [apps/web/app/[portalSlug]/saude/page.spec.tsx](file:///Volumes/Projects/transparencia/apps/web/app/[portalSlug]/saude/page.spec.tsx) e [apps/web/app/[portalSlug]/saude/view-model.spec.ts](file:///Volumes/Projects/transparencia/apps/web/app/[portalSlug]/saude/view-model.spec.ts).
  - [x] Subtask 3.2: Rodar `pnpm --filter web test` e `pnpm build`.

- [x] Task 4: Padronização de DTOs TypeScript para camelCase estrito e criação da Regra 18 de `AGENTS.md` (AC: 5)
  - [x] Subtask 4.1: Adicionar a Regra 18 em `AGENTS.md` proibindo chaves de tipos/DTOs por extenso, com acentos, pontuação ou espaços.
  - [x] Subtask 4.2: Refatorar `EmendaSaudeDTO` em `packages/db/src/queries/historia-saude-metrics.ts` e `licitacoes-metrics.ts`.
  - [x] Subtask 4.3: Ajustar `SaudeEmendasSection` e mocks de testes em `apps/web` para consumir as propriedades em `camelCase`.
  - [x] Subtask 4.4: Validar suíte de testes e compilação (`pnpm --filter web test`, `pnpm --filter @transparencia/db test` e `pnpm build`).

### Review Findings

- [x] [Review][Decision] Divergência de regra vs refinamento de UX para emendas com empenho zerado — Mantido refinamento de UX ("Nenhum valor empenhado" em destaque âmbar).
- [x] [Review][Decision] Critério de ativação do destaque visual (accent) no card de Emendas — Mantida regra de ativação por taxa de empenho satisfatória (>= 70%).
- [x] [Review][Decision] Alterações adicionais em SaudeEmendasSection — Mantidas melhorias adicionais de harmonia visual (coluna Origem, ordenação sortable e alerta âmbar).
- [x] [Review][Patch] Coerção insegura com operador `||` no cálculo de `totalEmendas` [apps/web/app/[portalSlug]/saude/page.tsx:54-57]
- [x] [Review][Patch] Reclassificação redundante e acoplamento indevido na camada de apresentação (Regra 2) [apps/web/app/[portalSlug]/saude/page.tsx:76-78]
- [x] [Review][Patch] Ausência de tratamento para valor zero (`hhi === 0`) na classificação de fornecedores [apps/web/app/[portalSlug]/saude/loader.ts:52-76]
- [x] [Review][Patch] Divergência textual no subtexto de ausência de emendas no exercício [apps/web/app/[portalSlug]/saude/page.tsx:64]
- [x] [Review][Patch] Propriedade morta `subtextClassName` adicionada em `KPICardProps` [packages/ui/src/components/kpi-card.tsx:7,21]
- [x] [Review][Patch] Baixo contraste WCAG no rótulo numérico do índice HHI (`text-slate-400 text-[11px]`) [apps/web/app/[portalSlug]/saude/page.tsx:205]

---

## Dev Notes

- **Fontes dos Dados:** `emendasStats` já vem carregado pelo `loadSaudeData` chamando `getSaudeEmendas` ou métricas consolidadas. Não há necessidade de criar novas queries no banco para essa story.
- **HHI (Herfindahl-Hirschman Index):** Varia de 0 a 10.000. Abaixo de 1.500 é mercado desconcentrado; de 1.500 a 2.500 é concentração moderada; acima de 2.500 é alta concentração. A linguagem deve ser cívica, sem academicismo.

---

## Dev Agent Record

### Implementation Plan
- **Task 1**: Refatorar `classifyHhi` e exportar `FarmaceuticaConcentracao` no loader da Saúde com retornos antecipados (Regra 13), incorporando o objeto `concentracao` em `saude.farmaceutica` e adicionando testes unitários em `view-model.spec.ts`.
- **Task 2**: Substituir o card "Dotação Atualizada" por "Emendas na Saúde" e redesenhar o card "Concentração de Fornecedores" com badge colorido semântico e rigor metodológico em `apps/web/app/[portalSlug]/saude/page.tsx`.
- **Task 3**: Atualizar suíte de testes automatizados com cobertura de zero emendas e faixas de concentração (baixa, moderada, alta), validando integralmente `pnpm --filter web test`, `pnpm build`, `make test/ts`, `make test` e `make check`.

### Completion Notes
- ✅ Task 1 concluída: Interface `FarmaceuticaConcentracao` e função `classifyHhi` exportadas com suporte aos níveis "baixa", "moderada" e "alta", incluindo labels e descrições cidadãs. Testes unitários adicionados e validados com 100% de sucesso.
- ✅ Task 2 concluída: No Hero KPIs, adicionado o card "Emendas na Saúde" exibindo o total autorizado/arrecadado e subtexto com volume e taxa de empenho. Na seção de assistência farmacêutica, o card "Concentração de Fornecedores" foi redesenhado com badges de cores semânticas (verde para baixa, âmbar para moderada, vermelho para alta), descrição cidadã em linguagem simples e pontuação HHI com tooltip metodológico CADE/STN.
- ✅ Task 3 concluída: Ampliada a suíte de testes em `page.spec.tsx` com asserções para ausência de emendas no exercício e faixas de HHI moderada e alta. 100% dos testes e verificações estáticas passando (`vitest`, `next build`, `pytest`, `ruff`, `mypy`).

### File List
- `packages/ui/src/components/kpi-card.tsx`
- `apps/web/app/[portalSlug]/saude/loader.ts`
- `apps/web/app/[portalSlug]/saude/view-model.spec.ts`
- `apps/web/app/[portalSlug]/saude/page.tsx`
- `apps/web/app/[portalSlug]/saude/page.spec.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/9-2-redesign-indicadores-saude-emendas-parlamentares-e-concentracao-fornecedores.md`

### Change Log
- 2026-09-06: Conclusão da Task 1 (refatoração de `classifyHhi` e enriquecimento de `farmaceutica.concentracao`).
- 2026-09-06: Conclusão da Task 2 (redesign dos cards de Emendas na Saúde e Concentração de Fornecedores em `page.tsx`).
- 2026-09-06: Conclusão da Task 3 (testes de regressão, cenários de borda e validações finais).
- 2026-09-06: Refinamento de UX do card de Emendas na Saúde: subtexto conciso em linha única com destaque em `text-rose-600` para zero empenhado.
