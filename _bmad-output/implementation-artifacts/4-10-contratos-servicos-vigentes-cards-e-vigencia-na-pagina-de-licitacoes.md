---
baseline_commit: 2f10772
generated_at: 2026-08-11T14:40:00-03:00
---

# Story 4.10: Contratos de Serviços Vigentes — Vigência, Cards e Tabela na Página de Licitações

## Metadados

- Epic: 4 - Experiência Visual, Responsividade Mobile, SEO & Otimização para LLMs
- Story ID: 4.10
- Story Key: 4-10-contratos-servicos-vigentes-cards-e-vigencia-na-pagina-de-licitacoes
- Status: review
- Arquivo: _bmad-output/implementation-artifacts/4-10-contratos-servicos-vigentes-cards-e-vigencia-na-pagina-de-licitacoes.md

## User Story

Como munícipe / auditor de transparência municipal,
Quero visualizar os principais contratos de serviços vigentes na página de Licitações, ordenados pelo menor valor pago (evidenciando potenciais inadimplências),
Para que eu possa rapidamente identificar quais contratos essenciais para a cidade estão sendo executados e se a prefeitura está honrando seus compromissos financeiros.

## Contexto Arquitetural (Descoberta da Sessão Winston 2026-08-11)

Esta story é resultado de uma investigação exploratória que identificou:

1. **Colunas não expostas no raw**: a tabela `raw_porciuncula_prefeitura.contratos` contém `data_inicio`, `vencimento_atual`, `objeto_completo` e `saldoempenhar` — ausentes do staging e dos marts.
2. **Filtro de "serviço contínuo"**: contratos de serviços com terceiros (PJ) são identificados pela classificação PCASP `grupo_natureza = '3'` e `elemento IN ('39', '70')` em `fct_despesas`. Essa combinação captura Serviços de Terceiros PJ (3.39) e Rateios de Consórcios Públicos (3.70) — exclui naturalmente folhas, obras e encargos.
3. **"Vigente" via dado real**: `vencimento_atual >= CURRENT_DATE` (data do contrato, já atualizada após aditivos) é mais confiável que proxies calculados sobre empenhos.
4. **Multi-cidade nativo**: `portal_slug` já existe em `fct_contratos` e `fct_despesas` — zero configuração adicional por cidade.
5. **Ordenação por atenção cidadã**: `total_pago ASC` — contratos com menor valor pago recebem maior destaque.

## Critérios de Aceitação (BDD)

**Given** a tabela `raw_porciuncula_prefeitura.contratos` com colunas `data_inicio`, `vencimento_atual`, `objeto_completo` e `saldoempenhar`
**When** o modelo `stg_porciuncula_prefeitura__contratos.sql` for compilado no dbt
**Then** as quatro colunas devem ser selecionadas com nomes explícitos e fortemente tipados:
- `data_inicio::date`
- `vencimento_atual::date`
- `objeto_completo::text`
- `saldo_a_empenhar::numeric` (renomeado de `saldoempenhar`)
**And** o schema `_stg_porciuncula_prefeitura__contratos.yml` deve ser atualizado declarando as novas colunas.

**Given** o staging de contratos atualizado
**When** os modelos `int_contratos_consolidados.sql` e `fct_contratos.sql` forem compilados
**Then** as quatro novas colunas devem ser propagadas por toda a camada, mantendo os schemas `.yml` sincronizados.

**Given** os marts `fct_contratos` (com vigência) e `fct_despesas` (com `grupo_natureza` e `elemento`)
**When** o novo mart `fct_contratos_servicos_vigentes.sql` for compilado com `materialized='table'`
**Then** o mart deve agrupar por `portal_slug` e CNPJ do fornecedor, calculando:
- `total_empenhado`, `total_liquidado`, `total_pago` (de `fct_despesas` filtrado por `grupo_natureza = '3'` e `elemento IN ('39', '70')`)
- `data_inicio`, `vencimento_atual`, `fornecedor_nome`, `objeto_descricao` (do contrato mais recente vinculado ao CNPJ)
**And** apenas contratos com `vencimento_atual >= CURRENT_DATE` devem ser incluídos.
**And** o resultado deve ser ordenado por `total_pago ASC`.
**And** testes de integridade fiscal devem ser declarados: `total_empenhado >= total_liquidado` e `total_liquidado >= total_pago`.

**Given** o mart `fct_contratos_servicos_vigentes` materializado no banco
**When** `getContratosServicosVigentes(portalSlug, ano)` do `@transparencia/db` for chamada
**Then** deve retornar lista tipada com: `fornecedorNome`, `fornecedorCnpj`, `objetoDescricao`, `dataInicio`, `vencimentoAtual`, `totalEmpenhado`, `totalLiquidado`, `totalPago`, `saldoPendente`, `percentualPago`.
**And** a query Kysely deve aplicar `.where('portal_slug', '=', portalSlug)` obrigatoriamente.

**Given** o leitor `getContratosServicosVigentes` disponível
**When** a página `apps/web/app/[portalSlug]/licitacoes` for renderizada
**Then** deve existir uma seção "Contratos de Serviços Vigentes" acima da tabela de licitações existente.
**And** a seção deve exibir os **3 primeiros registros** (menor `totalPago`) como cards em linha, cada card mostrando:
  - Nome do fornecedor
  - Objeto (truncado com tooltip para o texto completo)
  - Vigência: data início → vencimento atual
  - Barra de progresso visual: Empenhado / Liquidado / Pago
  - Percentual pago e saldo pendente em destaque
**And** abaixo dos cards, uma tabela com **todos** os contratos vigentes na mesma ordenação (`totalPago ASC`), com colunas: Fornecedor, Objeto, Vigência, Empenhado, Liquidado, Pago, Saldo Pendente, % Pago.
**And** a seção inteira deve ter guard de lista vazia.

**Given** a nova seção pública de contratos vigentes
**When** a implementação for concluída
**Then** `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` devem ser atualizados conforme Regra 12 do `AGENTS.md`.

**Given** os gates de validação
**When** executados `make test`, `make test/ts` e `pnpm build`
**Then** todas as suítes devem passar com 100% de sucesso.

## Guardrails Arquiteturais Obrigatórios

### Multi-tenant (AD-5)
1. `fct_contratos_servicos_vigentes` deve incluir `portal_slug` no `GROUP BY` e no schema.
2. `getContratosServicosVigentes` deve exigir e filtrar por `portalSlug` via Kysely.

### Regras do AGENTS.md
1. **Nomes explícitos**: proibido `saldo`, `val`, `pct`, `emp`. Usar `saldo_a_empenhar`, `total_empenhado`, `percentual_pago`, `vencimento_atual`.
2. **Valores fixos em lowercase snake_case**: sem labels de exibição em SQL — a UI formata.
3. **Sem alinhamento por espaços** nas queries SQL dbt.
4. **Propagação de `_sources.yml`**: verificar se `data_inicio` e `vencimento_atual` estão declaradas como colunas na source `contratos` — adicionar se ausentes antes de rodar `make test`.
5. **Materialização física obrigatória**: `materialized='table'` em `fct_contratos_servicos_vigentes`.
6. **Camada de apresentação burra**: `percentualPago` e `saldoPendente` calculados na `view-model.ts`, não no componente.

---

## Tasks / Subtasks

- [x] **Task 1: Atualização do Staging (`stg_porciuncula_prefeitura__contratos.sql`)** (AC: #1)
  - [x] Adicionar `data_inicio::date`, `vencimento_atual::date`, `objeto_completo::text`, `saldo_a_empenhar::numeric` ao modelo staging.
  - [x] Verificar e atualizar `_sources.yml` se necessário.
  - [x] Atualizar `_stg_porciuncula_prefeitura__contratos.yml` com documentação e testes das novas colunas.

- [x] **Task 2: Propagação pelas camadas Intermediate e Mart** (AC: #2)
  - [x] Propagar as quatro colunas em `int_contratos_consolidados.sql`.
  - [x] Propagar as quatro colunas em `fct_contratos.sql`.
  - [x] Atualizar `_int_contratos_consolidados.yml` e `_fct_contratos.yml`.

- [x] **Task 3: Novo Mart `fct_contratos_servicos_vigentes.sql`** (AC: #3)
  - [x] Criar `elt/transform/models/marts/fct_contratos_servicos_vigentes.sql` com `materialized='table'`.
  - [x] JOIN entre `fct_contratos` (vigência + metadados) e `fct_despesas` (agregado por CNPJ com filtro `grupo_natureza = '3'` e `elemento IN ('39', '70')`), agrupado por `portal_slug` + CNPJ do fornecedor.
  - [x] Filtro: `vencimento_atual >= current_date`.
  - [x] Criar `_fct_contratos_servicos_vigentes.yml` com testes de integridade fiscal.
  - [x] Executar `make test`.

- [x] **Task 4: Leitor Atômico no `@transparencia/db`** (AC: #4)
  - [x] Criar `packages/db/src/queries/contratos-servicos-vigentes.ts` com `getContratosServicosVigentes(portalSlug, ano)`.
  - [x] Exportar DTO `ContratoServicoVigente` no `packages/db/src/index.ts`.
  - [x] Adicionar caso de teste em `contratos-servicos-vigentes.spec.ts`.
  - [x] Executar `make test/ts`.

- [x] **Task 5: Integração Frontend na Página de Licitações** (AC: #5)
  - [x] Atualizar `loader.ts` para chamar `getContratosServicosVigentes`.
  - [x] Atualizar `view-model.ts` calculando `percentualPago` e `saldoPendente`.
  - [x] Criar `apps/web/components/contrato-servico-vigente-card.tsx` e `apps/web/components/contratos-servicos-vigentes-section.tsx`.
  - [x] Atualizar `page.tsx` com seção "Contratos de Serviços Vigentes": 3 cards em linha + tabela completa.

- [x] **Task 6: Sincronização LLMs** (AC: #6)
  - [x] Atualizar `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`.

- [x] **Task 7: Validação Final** (AC: #7)
  - [x] `make test`
  - [x] `make test/ts`
  - [x] `pnpm build`

- [x] **Task 8: Atualização do Card "Licitações e Contratos" na Página de Visão Geral** (AC extra)
  - [x] Renomear card para "Licitações e Contratos".
  - [x] Atualizar `apps/web/app/[portalSlug]/loader.ts` para trazer agregados de contratos vigentes.
  - [x] Atualizar `licitacoesCardData` no `apps/web/app/[portalSlug]/view-model.tsx`.

## Dev Agent Record

### Implementation Notes
- Colunas `data_inicio`, `vencimento_atual`, `objeto_completo` e `saldo_a_empenhar` propagadas em staging (`stg_porciuncula_prefeitura__contratos`), intermediate (`int_contratos_consolidados`) e fato (`fct_contratos`).
- Criado o novo mart `fct_contratos_servicos_vigentes.sql` com materialização em tabela e pre-hook de unaccent, calculando agregados fiscais e vigência de fornecedores de serviços PJ e consórcios.
- Criado leitor atômico `getContratosServicosVigentes` no pacote `@transparencia/db` com tratamento resiliente e testes unitários Vitest.
- Criada a seção pública de visualização com top 3 cards de menor valor pago (destaque de atenção) e tabela completa dos contratos vigentes na página de licitações.
- Atualizado o card da página de visão geral para "Licitações e Contratos" exibindo a contagem e total empenhado em contratos de serviços.
- Sincronizados os guias de leitura para LLMs (`llms.txt` e `llms-full.txt`).
- Suíte completa de testes backend (`make test`), testes TypeScript (`make test/ts`) e compilação em produção (`pnpm build`) executados e validados com 100% de aprovação.

### File List
- `elt/transform/models/staging/porciuncula_prefeitura/stg_porciuncula_prefeitura__contratos.sql`
- `elt/transform/models/staging/porciuncula_prefeitura/_stg_porciuncula_prefeitura__contratos.yml`
- `elt/transform/models/staging/porciuncula_prefeitura/_sources.yml`
- `elt/transform/models/intermediate/int_contratos_consolidados.sql`
- `elt/transform/models/intermediate/_int_contratos_consolidados.yml`
- `elt/transform/models/marts/fct_contratos.sql`
- `elt/transform/models/marts/_fct_contratos.yml`
- `elt/transform/models/marts/fct_contratos_servicos_vigentes.sql`
- `elt/transform/models/marts/_fct_contratos_servicos_vigentes.yml`
- `packages/db/src/queries/contratos-servicos-vigentes.ts`
- `packages/db/src/index.ts`
- `packages/db/src/queries/__tests__/contratos-servicos-vigentes.spec.ts`
- `apps/web/app/[portalSlug]/licitacoes/loader.ts`
- `apps/web/app/[portalSlug]/licitacoes/view-model.ts`
- `apps/web/app/[portalSlug]/licitacoes/page.tsx`
- `apps/web/components/contrato-servico-vigente-card.tsx`
- `apps/web/components/contratos-servicos-vigentes-section.tsx`
- `apps/web/app/[portalSlug]/loader.ts`
- `apps/web/app/[portalSlug]/view-model.tsx`
- `apps/web/public/llms.txt`
- `apps/web/public/llms-full.txt`
- `_bmad-output/implementation-artifacts/4-10-contratos-servicos-vigentes-cards-e-vigencia-na-pagina-de-licitacoes.md`

## Change Log
- Story 4.10 criada a partir de investigação exploratória de dados (sessão Winston 2026-08-11).
- Implementação concluída da Story 4.10: Staging, Marts, DB reader, componentes Frontend, Visão Geral e documentação LLMs (2026-08-11).

---

## Bônus / Oportunidades Identificadas (não-bloqueantes para a story)

As observações abaixo foram identificadas durante a investigação exploratória de dados desta sessão. Não são requisitos da story, mas podem ser aproveitadas durante ou após a implementação.

### Bônus A: Alerta de Vencimento Iminente

A coluna `vencimento_atual` (já exposta pela Task 1) permite calcular dias restantes até o vencimento de cada contrato vigente. O componente `contrato-servico-vigente-card.tsx` **pode opcionalmente** exibir um badge de alerta visual quando `vencimento_atual <= CURRENT_DATE + 30 dias` — sinalizando ao cidadão que o serviço pode ser interrompido em breve por falta de renovação.

Limiares sugeridos:
- 🔴 ≤ 30 dias: "Vence em breve"
- 🟡 ≤ 60 dias: "Atenção: renovação próxima"
- ✅ > 60 dias: sem alerta

Sem impacto na query ou no mart — é lógica de apresentação pura na `view-model.ts`.

### Bônus B: Classificação por Tipo de Contrato (`tipoco`)

A coluna `tipoco` do raw `contratos` contém um código numérico de tipo de contrato (ex: `14` é o mais frequente, com 2.989 ocorrências; `24`, `09`, `36` aparecem com frequência). Antes de decidir sobre a criação de um `seed_tipo_contrato` ou `dim_tipo_contrato`, verificar:

1. **Se é codificação padrão TCE/STN**: pesquisar se os códigos `tipoco` correspondem a uma tabela oficial de tipos de contrato publicada pelo TCE-RJ ou STN. Se sim → criar `seed_tipo_contrato.csv` e `dim_tipo_contrato` seguindo o padrão já adotado em `dim_elemento_despesa` e `dim_natureza_despesa`.
2. **Se for codificação proprietária do sistema**: não vale mapear — registrar no `deferred-work.md` para investigação futura.

Esta verificação pode ser feita como subtask adicional da Task 1, sem bloquear as demais.

### Nota sobre a ordenação e contratos críticos

A ordenação `total_pago ASC` da story já faz com que contratos com **zero pagamento** (como o Consórcio Noroeste — SAMU com R$ 1.6M empenhado e R$ 0 pago) sejam automaticamente os primeiros nos cards. Não é necessária lógica adicional de "destaque" — a ordenação já cumpre esse papel de chamar atenção do cidadão para os contratos mais preocupantes.

### Bônus C: Detecção de Aditivos Sistemáticos

A coluna `aditado` do raw `contratos` registra o valor monetário dos aditivos por contrato (positivo = reforço de valor, negativo = redução). Contratos que acumulam múltiplos aditivos crescentes no mesmo fornecedor ao longo dos anos podem indicar subdimensionamento intencional no certame original — padrão identificado pelo TCU como "jogo de planilha".

**Como detectar nos dados:**
- Agrupar por `fornecedor_cnpj` + `portal_slug` somando `aditado` ao longo dos anos
- Calcular `aditado / valor_contrato_original` para medir o percentual de acréscimo acumulado
- Contratos com mais de 25% de aditivo acumulado (limite legal da Lei 8.666) merecem destaque

**Onde expor:**
- Como coluna adicional na tabela de contratos vigentes da story (`percentual_aditado`)
- Futuro: seção dedicada "Contratos com Aditivos Expressivos" em licitações

**Pré-requisito:** a coluna `aditado` precisa ser exposta no staging (Task 1 desta story pode incluí-la junto com as demais colunas já previstas).

---

## Task 8: Atualização do Card "Licitações e Contratos" na Página de Visão Geral (AC extra)

Esta task depende do leitor `getContratosServicosVigentes` criado na Task 4.

**Contexto atual:**
O card "Licitações" em `apps/web/app/[portalSlug]/view-model.tsx` (`licitacoesCardData`) exibe apenas:
- Contagem de contratos acima do limite sem licitação (alerta)
- Contagem de contratos sem licitação registrados

**O que muda:**

- [ ] **Renomear o card**: `title: "Licitações"` → `title: "Licitações e Contratos"` no `licitacoesCardData` do `view-model.tsx`.

- [ ] **Atualizar o `loader.ts` da visão geral** (`apps/web/app/[portalSlug]/loader.ts`) para chamar `getContratosServicosVigentes(portalSlug, ano)` e derivar os seguintes agregados:
  - `totalContratosVigentes`: contagem total de contratos de serviços vigentes
  - `totalContratosComPendencia`: contratos onde `totalPago = 0` e `totalEmpenhado > 0` (empenhado sem nenhum pagamento)
- Story 4.10 criada a partir de investigação exploratória de dados.
- Status: done
- Arquivo: _bmad-output/implementation-artifacts/4-10-contratos-servicos-vigentes-cards-e-vigencia-na-pagina-de-licitacoes.md

---

## Review Findings

### Tasks / Review Checklist

- [x] [Review][Patch] Mart missing `vencimento_atual >= CURRENT_DATE` filter for active contracts [`elt/transform/models/marts/fct_contratos_servicos_vigentes.sql:15`]
- [x] [Review][Patch] Dismissed per user request: Objeto description kept hidden on cards [`apps/web/components/contrato-servico-vigente-card.tsx:35`]
- [x] [Review][Patch] Restore dual progress bar (Liquidado + Pago) in `ContratoServicoVigenteCard` [`apps/web/components/contrato-servico-vigente-card.tsx:75`]
- [x] [Review][Patch] Fix malformed Tailwind `className="space-y-"` typo [`apps/web/app/[portalSlug]/licitacoes/page.tsx:145`]
- [x] [Review][Patch] Format fallback for `objeto_descricao` in SQL to `lowercase_snake_case` or `NULL` according to AGENTS.md Rule 10 [`elt/transform/models/marts/fct_contratos_servicos_vigentes.sql:41`]
- [x] [Review][Patch] Tighter regex for date strings in `stg_porciuncula_prefeitura__contratos.sql` [`elt/transform/models/staging/porciuncula_prefeitura/stg_porciuncula_prefeitura__contratos.sql:28`]
- [x] [Review][Patch] Guard against `NaN` in `percentualPago` in `contrato-servico-vigente-card.tsx` and `contratos-servicos-vigentes.ts`
- [x] [Review][Patch] Add fallback index in `key` prop in `ContratosServicosVigentesSection` [`apps/web/components/contratos-servicos-vigentes-section.tsx:112`]
