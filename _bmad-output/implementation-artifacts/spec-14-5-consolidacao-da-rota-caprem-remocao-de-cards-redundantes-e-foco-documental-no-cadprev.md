---
title: 'Story 14.5: Consolidação da Rota /caprem: Remoção de Cards Redundantes e Foco Documental no CADPREV'
type: 'refactor'
created: '2026-09-23'
status: 'done'
baseline_revision: '72e7dd15a1ca2e3bb54e1c22809b961d6ac62d89'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** A rota `/caprem` mantinha em `CapremActuarialRiskSection` um grid de 4 cards de KPI (Aporte Déficit Atuarial, Retenção Patronal, Amortização de Dívidas e Base de Contribuintes) redundantes com a nova seção `CapremPatrimonioHistoricoSection` (Story 14.3), gerando poluição cognitiva e dispersando a atenção do cidadão sobre os acordos oficiais de confissão de dívida.

**Approach:** Reestruturar e renomear a seção para "Acordos de Parcelamento e Dívidas Previdenciárias (CADPREV / Ministério da Previdência)", removendo o grid de 4 cards de topo e destacando a tabela oficial de confissão de dívidas e parcelamentos CADPREV seguida da tabela histórica de amortização e cobertura atuarial (2021–2026), com sincronização dos guias para IA e cobertura completa de testes.

## Boundaries & Constraints

**Always:**
- Preservar integralmente as colunas da tabela de Acordos CADPREV (`numeroCadprev`, `descricao`, `empenhado`, `pago`) e a tabela de evolução histórica de cobertura atuarial (`ano`, `aporteExigido`, `aporteQuitado`, `taxaAdimplencia`, `amortizacaoDivida`).
- Manter acessibilidade e responsividade da interface com título e descrição da seção via `SectionHeader`.
- Sincronizar os arquivos públicos de orientação para IA (`apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`) conforme a Regra 12 do AGENTS.md.
- Manter tipagem estrita TypeScript sem erros em `tsc --noEmit`.

**Never:**
- Não reimplementar nem duplicar os cards de causas estruturais (déficit, cota patronal e diluição da base) já presentes em `CapremPatrimonioHistoricoSection`.
- Não quebrar a interface de props ou exportações consumidas pela página (`CapremActuarialRiskSectionProps`).
- Não usar ternários aninhados conforme a Regra 13 do AGENTS.md.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Com acordos CADPREV e série histórica | `cadprev` com registros, `trend` com registros | Renderiza tabela CADPREV em destaque no topo, seguida da tabela de série histórica; nenhum card de topo duplicado exibido | Sem erro |
| Sem acordos CADPREV registrados | `cadprev = []`, `trend` com registros | Renderiza aviso discreto informando ausência de termos CADPREV no exercício selecionado, seguido da tabela de evolução histórica | Sem erro |
| Sem série histórica de adimplência | `cadprev` com registros, `trend = []` | Renderiza apenas tabela CADPREV; omite tabela de histórico sem quebra de layout | Sem erro |

</intent-contract>

## Code Map

- `apps/web/components/caprem-actuarial-risk-section.tsx` -- Componente client-side reestruturado: remoção de `<KPIGrid columns={3}>` e dos 4 cards de topo; atualização do cabeçalho com `SectionHeader` ("Acordos de Parcelamento e Dívidas Previdenciárias (CADPREV / Ministério da Previdência)"); reposicionamento de destaque da tabela CADPREV no topo da seção e manutenção da tabela histórica na sequência.
- `apps/web/components/caprem-actuarial-risk-section.spec.tsx` -- Nova suíte de testes de componente cobrindo: renderização do cabeçalho reestruturado, ausência de cards redundantes de KPI, destaque da tabela CADPREV com dados e tratamento de lista vazia.
- `apps/web/app/[portalSlug]/caprem/page.tsx` -- Server Component da rota `/caprem`; atualização do comentário e chamada da seção consolidada.
- `apps/web/app/[portalSlug]/caprem/page.spec.tsx` -- Testes de integração da página `/caprem`; adição de asserções validando a renderização da seção de Acordos CADPREV.
- `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` -- Atualização das diretrizes e especificações públicas de consumo por IA sobre a rota `/caprem`, refletindo a remoção de cards redundantes e o foco documental no CADPREV e na série histórica (Regra 12 do AGENTS.md).

## Tasks & Acceptance

**Execution:**
- `apps/web/components/caprem-actuarial-risk-section.tsx` -- Remover o grid `<KPIGrid columns={3}>` de 4 cards de topo e seus ícones não mais utilizados, atualizar `SectionHeader` para "Acordos de Parcelamento e Dívidas Previdenciárias (CADPREV / Ministério da Previdência)" e posicionar a tabela de parcelamentos CADPREV em destaque no topo -- Eliminar duplicação cognitiva com a seção de patrimônio histórico e focar nos instrumentos documentais.
- `apps/web/components/caprem-actuarial-risk-section.spec.tsx` -- Criar testes unitários para `CapremActuarialRiskSection` verificando título da seção, presença da tabela CADPREV e ausência dos cards de KPI antigos -- Assegurar cobertura de regressão da reestruturação.
- `apps/web/app/[portalSlug]/caprem/page.tsx` -- Ajustar comentários da seção na página principal do CAPREM -- Manter clareza da arquitetura da página.
- `apps/web/app/[portalSlug]/caprem/page.spec.tsx` -- Adicionar teste de integração validando a presença da seção de acordos CADPREV na página -- Garantir coerência ponta a ponta na rota.
- `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` -- Sincronizar o descritivo da rota `/caprem` refletindo a remoção dos cards redundantes e o foco documental no CADPREV e na série histórica -- Cumprir a Regra 12 do AGENTS.md.

**Acceptance Criteria:**
- Given a página `/caprem`, when a seção `CapremActuarialRiskSection` for renderizada, then ela não exibe mais os cards de KPI de "Aporte Déficit Atuarial", "Déficit de Repasse Mensal", "Amortização de Dívidas" e "Base de Contribuintes".
- Given a seção reestruturada, when renderizada, then exibe o título "Acordos de Parcelamento e Dívidas Previdenciárias (CADPREV / Ministério da Previdência)" com descrição focada no monitoramento de acordos formais de confissão de dívida e cumprimento histórico dos aportes.
- Given dados de `cadprev`, when informados, then a tabela "Acordos Oficiais de Confissão e Parcelamento de Dívidas (CADPREV / Ministério da Previdência)" é renderizada em posição de destaque no topo da seção, preservando colunas de registro CADPREV, objeto, valor empenhado e valor pago.
- Given dados de `trend`, when informados, then a tabela "Evolução Histórica da Cobertura Atuarial e Resgate de Dívidas (2021–2026)" é renderizada na sequência.
- Given a documentação pública para LLMs, when consultados `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`, then eles refletem a organização consolidada da rota `/caprem`.
- Given a suíte de testes web, when executado `pnpm --filter web test caprem`, then todos os testes passam com 100% de sucesso.

## Spec Change Log

## Review Triage Log

### 2026-09-24 — Review pass
- verdicts: 14 findings — high 0, medium 1, low 12, false 1, maybe-false 0
- findings:
  - `[medium]` `[patch]` Deep link anchor identifiers `#atuarial` and `#patronal` relocated to diagnostic cards lack DOM presence assertions — Adicionadas asserções `expect(container.querySelector("#atuarial")).toBeInTheDocument()` e `expect(container.querySelector("#patronal")).toBeInTheDocument()` em `caprem-patrimonio-historico-section.spec.tsx`.
  - `[low]` `[patch]` In `caprem-actuarial-risk-section.tsx`, the `risk` prop was made optional and aliased to `_risk`, keeping dead code across interface and page — Removida a prop morta `risk` de `CapremActuarialRiskSectionProps` e de sua passagem em `page.tsx` e testes.
  - `[low]` `[patch]` Prop zumbi e DTO órfão mantidos sem utilidade (`risk: _risk` e `ActuarialRiskSummary`) — Mesma causa raiz do item anterior; removida a prop `risk` de `CapremActuarialRiskSectionProps` e de `page.tsx`.
  - `[low]` `[patch]` Ausência de valor padrão e tratamento defensivo para a prop `trend` — Adicionado default `trend = []` na desestruturação de props em `CapremActuarialRiskSection`.
  - `[low]` `[patch]` Ausência de âncora de deep link (`id`) na seção CADPREV — Adicionado `id="cadprev"` na tag `<section>`.
  - `[low]` `[patch]` Quebra de hierarquia semântica de títulos (salto de `<h2>` para `<h4>`) — Substituídas as tags `<h4>` por `<h3>` nos títulos internos de tabelas.
  - `[false]` `[reject]` Redundância textual entre cabeçalho da seção e cabeçalho da tabela CADPREV — O título da tabela ("Acordos Oficiais de Confissão e Parcelamento de Dívidas (CADPREV / Ministério da Previdência)") é exigência textual literal dos Critérios de Aceitação da história.
  - `[low]` `[reject]` Intervalo plurianual `(2021–2026)` fixado de forma estática — O texto "(2021–2026)" é exigido literalmente no AC da história ("Evolução Histórica da Cobertura Atuarial e Resgate de Dívidas (2021–2026)"); generalização dinâmica adicionaria complexidade desnecessária não especificada.
  - `[low]` `[reject]` Ausência de fundamentação e hyperlink oficial para o CADPREV / Ministério da Previdência — A seção foca nos dados contábeis municipais de parcelamentos da LOA (Elemento 71), sem citação de norma direta não linkada (as normas legais já estão linkadas em `#patrimonio`).
  - `[low]` `[patch]` Exportação CSV sem nomenclatura especializada (`exportFilename`) e rótulos genéricos — Adicionados `exportFilename={`cadprev-parcelamentos-${ano}.csv`}` e `exportFilename="cobertura-atuarial-historica.csv"`.
  - `[low]` `[reject]` Omissão da data de empenho (`dataEmpenho`) na tabela CADPREV — AC especifica explicitamente: "preservando todas as colunas de registro, objeto, valor empenhado e valor pago"; inclusão de nova coluna extrapola escopo acordado.
  - `[low]` `[reject]` Falta de destaque visual para o exercício selecionado na tabela de tendência histórica — Melhoria cosmética não demandada no AC; a tabela histórica serve de contexto plurianual completo.
  - `[low]` `[patch]` Lacunas de cobertura na nova suíte de testes (`caprem-actuarial-risk-section.spec.tsx` e `page.spec.tsx`) — Adicionadas asserções para fallback padrão sem `trend` e validação explícita da ausência de "Amortização de Dívidas" e "Base de Contribuintes" em `page.spec.tsx`.
  - `[low]` `[patch]` Desaparecimento do aviso metodológico de deduções no estado vazio de CADPREV — Reposicionada a nota metodológica fora da condicional de `cadprev.length > 0`.

## Auto Run Result

### Resumo das Alterações Implementadas
- **Consolidação Documental da Rota `/caprem`:** Reestruturada a seção `CapremActuarialRiskSection`, removendo o grid obsoleto de 4 cards de KPI que duplicava informações do diagnóstico estrutural de patrimônio histórico (`CapremPatrimonioHistoricoSection`).
- **Novo Cabeçalho e Destaque CADPREV:** Atualizado o cabeçalho para *"Acordos de Parcelamento e Dívidas Previdenciárias (CADPREV / Ministério da Previdência)"*, elevando a tabela de parcelamentos formalizados para o topo da seção com suporte a estado vazio amigável e nota metodológica sobre penalidades tributárias.
- **Série Histórica Plurianual:** Mantida a tabela de evolução histórica da cobertura atuarial e resgate de dívidas (2021–2026), com exportação CSV contextualizada e hierarquia de títulos acessível (`<h3>`).
- **Preservação de Âncoras do Radar Cívico:** Migrados e verificados os identificadores `#atuarial` e `#patronal` para os respectivos cards de diagnóstico na seção de patrimônio histórico.
- **Sincronização de IA & Testes:** Atualizados `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` (Regra 12 do AGENTS.md), criada suíte de testes unitários para a seção e enriquecidos os testes de integração da página `/caprem`.

### Arquivos Modificados
- `apps/web/components/caprem-actuarial-risk-section.tsx` -- Remoção de 4 cards de KPI redundantes, reestruturação para foco documental no CADPREV e série histórica, exportFilename CSV e acessibilidade `<h3>`.
- `apps/web/components/caprem-actuarial-risk-section.spec.tsx` -- Nova suíte de testes unitários cobrindo o cabeçalho consolidado, tabelas CADPREV e histórica, e ausência dos cards antigos.
- `apps/web/components/caprem-patrimonio-historico-section.tsx` -- Preservação dos identificadores de deep link `#atuarial` e `#patronal`.
- `apps/web/components/caprem-patrimonio-historico-section.spec.tsx` -- Adicionadas asserções verificando a presença de `#atuarial` e `#patronal` no DOM.
- `apps/web/app/[portalSlug]/caprem/page.tsx` -- Atualizado comentário da seção e removido envio de prop morta `risk`.
- `apps/web/app/[portalSlug]/caprem/page.spec.tsx` -- Teste de integração validando a seção de acordos CADPREV e a ausência dos cards de KPI antigos.
- `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` -- Sincronização da documentação pública para LLMs conforme Regra 12 do AGENTS.md.
- `_bmad-output/implementation-artifacts/epic-14-context.md` -- Adicionada a Story 14.5 e dependências cruzadas.

### Review Findings Breakdown
- **Patches aplicados (8):**
  - 1 Medium: Adição de asserções para âncoras `#atuarial` e `#patronal` no DOM em `caprem-patrimonio-historico-section.spec.tsx`.
  - 7 Low: Remoção de prop/interface zumbi `risk`, fallback `trend = []`, âncora `id="cadprev"`, correção semântica `<h3>`, nota metodológica contínua no estado vazio, `exportFilename` em CSVs e asserções complementares em `page.spec.tsx`.
- **Items rejeitados (5):**
  - 1 False: Redundância de título rejeitada pois o texto foi extraído verbatim do critério de aceitação.
  - 4 Low: Rejeitados por não agregarem valor e adicionarem complexidade desnecessária fora do escopo do AC (data de empenho, destaque de ano selecionado, links adicionais redundantes e intervalo dinâmico).
- **Items diferidos:** Nenhum.
- **Follow-up review recommendation:** `false` (0 high patches, 1 medium patch; trabalho convergiu com 100% de testes e validações estáticas passando).

### Verificação Realizada
- `pnpm --filter web test caprem` -- 5 arquivos de teste, 30 testes passando (100%).
- `pnpm --filter web test` -- 76 arquivos de teste, 561 testes passando (100%).
- `pnpm --filter web exec tsc --noEmit` -- 0 erros de tipagem TypeScript.
- `make check && make lint/ts` -- 0 violações de linter (Ruff, Mypy, Biome).
- `pnpm --filter web build` -- Build do Next.js gerado com sucesso.

### Riscos Residuais
- Nenhum risco residual identificado.

## Design Notes

A seção `CapremActuarialRiskSection` agora tem propósito documental estrito:
1. Cabeçalho com `SectionHeader`: "Acordos de Parcelamento e Dívidas Previdenciárias (CADPREV / Ministério da Previdência)"
2. Tabela superior destacada com dados oficiais de parcelamentos formalizados no CADPREV (Elemento 71).
3. Tabela histórica plurianual consolidando a adimplência atuarial (Elemento 97) e amortização de dívidas (2021 a 2026).

## Verification

**Commands:**
- `pnpm --filter web test caprem` -- expected: 100% tests passing across all caprem test files
- `pnpm --filter web exec tsc --noEmit` -- expected: 0 type errors
- `make check && make lint/ts` -- expected: 0 linter errors
- `pnpm --filter web build` -- expected: successful Next.js build
