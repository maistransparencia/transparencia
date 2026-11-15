---
baseline_commit: 2ec5a589bef3c7c23b519802173844de475f36ea
---
# Story 6.8: Modelo Intermediário de Reclassificação Orçamentária STN e Inferência de Natureza Sugerida

**Status:** done  
**Epic:** Epic 6: Reformulação Fiscal da Homepage e Redesenho da Página de Despesas Detalhadas  

## Story

As a data engineer, citizen, or public auditor,  
I want an intermediate dbt model (`int_despesas_reclassificadas`) backed by a canonical seed of STN/MCASP budget expense codes (`seed_naturezas_despesa_stn`) that infers a standardized `natureza_despesa_codigo_sugerido` and `categoria_objeto_sugerida` from raw spending objects,  
So that `fct_despesas` is decoupled from monolithic regex rules, ambiguous classifications (such as waste management containers misclassified as generic vehicles) are properly resolved, and citizens can inspect accurate suggested classifications across public consortia, waste management, medical shifts, judicial injunctions, and outsourced labor.

---

## Background & Diagnóstico Técnico

1. **Problema Atual em `fct_despesas.sql`:**
   - Mais de 80 linhas de expressões regulares `CASE WHEN ... ~* ...` embutidas diretamente na fato principal.
   - Casos de ambiguidade: Contratos de aluguel de caçambas e poliguindastes de coleta de resíduos recicláveis foram capturados na regra genérica de `locacao_maquinas_veiculos`.
   - Gastos volumosos em `.99` (como R$ 7M em Consórcios de Saúde, R$ 4,6M em Bloqueios Judiciais e R$ 1,7M em Coleta de Lixo) ficavam marcados como *"Sem classificação específica"* porque não pertenciam às 6 categorias originais do radar.

2. **Origem dos Dados do Catálogo (`seed_naturezas_despesa_stn.csv`):**
   - **Fonte Normativa Canônica:** Tabela padronizada nacional da **Portaria Interministerial STN/SOF nº 163/2001** e do **MCASP (Manual de Contabilidade Aplicada ao Setor Público)** da Secretaria do Tesouro Nacional (STN).
   - **Fonte Empírica Municipal:** Validação contra o histórico real de empenhos de Porciúncula (coluna `catec` do raw), cobrindo subitens utilizados na prática pelo município.

3. **Solução Arquitetural:**
   - Criação de um catálogo oficial em seed (`seed_naturezas_despesa_stn.csv`) mapeando os códigos de subitens da Portaria STN/SOF e MCASP.
   - Criação do modelo intermediário `int_despesas_reclassificadas.sql` que infere o `natureza_despesa_codigo_sugerido` com prioridade léxica estrita.
   - Desacoplamento de `fct_despesas.sql`, que passa a consumir o código sugerido diretamente sem regexes redundantes.
   - Enriquecimento dos marts de métricas, `@transparencia/db` e do componente web para suportar as novas categorias na gaveta de credores.

---

## Protocolo de Governança para Novos Subitens STN (`docs/governanca-constantes-fiscais.md`)

Ao adicionar ou revisar subitens no catálogo, o seguinte checklist de 4 passos deve ser rigorosamente seguido:

1. **Validação Normativa & Nomenclatura:**
   - `natureza_codigo` deve existir formalmente na Portaria STN/SOF ou MCASP.
   - `categoria_macro` deve estar estritamente em **lowercase snake_case** (ex: `limpeza_residuos`, `consorcios_publicos`), em conformidade com a Regra 10 do `AGENTS.md`.
2. **Precedência Léxica no Modelo Intermediário (`int_despesas_reclassificadas.sql`):**
   - Regras específicas e de nicho (ex: resíduos/caçambas, sentenças judiciais, consórcios de saúde) **devem** preceder regras genéricas (ex: locação de máquinas/veículos, consultoria).
3. **Propagação de Contrato (TypeScript & UI):**
   - Estender os union types em `@transparencia/db` e o helper `formatCategoriaSensivel` em `apps/web/components/termometro-opacidade-fiscal.tsx`.
4. **Portão de Qualidade Obrigatório:**
   - Testes de integridade no dbt (`unique` e `not_null` no seed) e execução com 100% de aprovação em `make test` e `pnpm test`.

---

## Acceptance Criteria

### 1. Catálogo, Seeds e Governança (`elt/transform/seeds/` & `docs/`)
1. **Seed `seed_naturezas_despesa_stn.csv`:**
   - Colunas: `natureza_codigo`, `natureza_descricao`, `elemento_codigo`, `categoria_macro`, `is_sensivel`.
   - Contempla códigos STN: Combustíveis (`3.3.90.30.01`), Locação Máquinas/Veículos (`3.3.90.39.12`, `3.3.90.39.13`), Locação Imóveis (`3.3.90.39.14`), Eventos/Shows (`3.3.90.39.22`), Limpeza Urbana/Lixo (`3.3.90.39.44`), Serviços Médicos/Plantões (`3.3.90.39.50`), Consórcios Públicos/Saúde (`3.3.71.70.00`), Terceirização Mão de Obra (`3.3.90.37.00`), Sentenças/Bloqueios Judiciais (`3.3.90.91.00`), Obrigações Patronais/Previdência (`3.3.90.13.00`), Diárias (`3.3.90.14.00`), Obras (`4.4.90.51.00`), etc.
   - Schema `_seed_naturezas_despesa_stn.yml` com testes de unicidade e não-nulos.
2. **Governança do Catálogo (`docs/governanca-constantes-fiscais.md`):**
   - Adicionar seção dedicada ao Catálogo de Naturezas de Despesa STN/MCASP documentando fontes, critérios de inclusão e checklist de atualização.

### 2. Modelagem dbt Intermediária e Marts (`elt/transform/models/`)
3. **Modelo `int_despesas_reclassificadas.sql`:**
   - Lê de `int_despesas_consolidadas`.
   - Aplica inferência com prioridades léxicas estruturadas (ex: caçambas/resíduos/lixo tem precedência sobre veículos).
   - Produz `natureza_despesa_codigo_sugerido`, `natureza_despesa_nome_sugerido` e `categoria_objeto_sugerida`.
4. **Refatoração de `fct_despesas.sql`:**
   - Consome `int_despesas_reclassificadas`.
   - Remove regexes monolíticas.
   - Expõe `natureza_despesa_codigo_sugerido`.
5. **Atualização de `fct_opacidade_contabil_credores.sql`:**
   - Utiliza `categoria_objeto_sugerida` e `natureza_despesa_codigo_sugerido` para classificar os maiores credores.

### 3. Camada de Dados `@transparencia/db` (`packages/db/`)
6. **DTOs e Leitor em `packages/db/src/queries/opacidade-contabil-metrics.ts`:**
   - Expande os tipos de `categoriaPredominante` para incluir as novas categorias (*Consórcios de Saúde*, *Limpeza Urbana & Resíduos*, *Plantões Médicos*, *Bloqueios & Sentenças*, *Mão de Obra Terceirizada*, *Previdência*, *Consultoria Técnica*).
   - Testes unitários atualizados.

### 4. Apresentação Web (`apps/web/`)
7. **Escopo Estrito de UI (Sem Novos Cards no Radar Sensível):**
   - O componente `RadarGastosSensiveis` (`radar-gastos-sensiveis.tsx`) permanece **estritamente inalterado** com seus 6 cards temáticos atuais.
   - O componente `TermometroOpacidadeFiscal` (`termometro-opacidade-fiscal.tsx`) é atualizado em seu helper `formatCategoriaSensivel` para renderizar labels amigáveis e badges informativos na gaveta de credores para todas as novas categorias sugeridas (ex: *Consórcios de Saúde*, *Limpeza Urbana & Resíduos*, *Plantões Médicos*, *Bloqueios & Sentenças*).
   - Testes unitários em `termometro-opacidade-fiscal.spec.tsx` atualizados.
8. **Documentação Pública (`llms.txt` e `llms-full.txt`):**
   - Sincroniza o dicionário de categorias sugeridas pelo objeto.

---

## Tasks / Subtasks

- [x] [Task 1] Catálogo STN, Governança e Modelo Intermediário (`elt/` & `docs/`)
  - [x] Criar seed `elt/transform/seeds/seed_naturezas_despesa_stn.csv`.
  - [x] Criar schema `elt/transform/seeds/_seed_naturezas_despesa_stn.yml`.
  - [x] Documentar o protocolo de inclusão/atualização de subitens em `docs/governanca-constantes-fiscais.md`.
  - [x] Criar `elt/transform/models/intermediate/int_despesas_reclassificadas.sql`.
  - [x] Criar schema `elt/transform/models/intermediate/_int_despesas_reclassificadas.yml`.
  - [x] Refatorar `fct_despesas.sql` para consumir o modelo intermediário.
  - [x] Atualizar `fct_opacidade_contabil_credores.sql`.
  - [x] Executar `make dbt/seed && make dbt/run && make dbt/test && make test`.
- [x] [Task 2] Camada `@transparencia/db`
  - [x] Atualizar DTOs e queries em `packages/db/src/queries/opacidade-contabil-metrics.ts`.
  - [x] Atualizar testes unitários em `packages/db/src/queries/__tests__/opacidade-contabil-metrics.spec.ts`.
  - [x] Executar `pnpm --filter @transparencia/db test`.
- [x] [Task 3] Camada Web UI & Documentação
  - [x] Atualizar `formatCategoriaSensivel` em `apps/web/components/termometro-opacidade-fiscal.tsx`.
  - [x] Atualizar testes unitários em `apps/web/components/termometro-opacidade-fiscal.spec.tsx`.
  - [x] Atualizar `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`.
  - [x] Executar `pnpm test` e `pnpm build`.
- [x] [Task 4] Validação de Ponta a Ponta
  - [x] Executar `make test` e `pnpm test`.
- [x] [Task 5] Refinamento Forense & UX: Residual Evitável vs Estrutural, Callout Investigativo e Expansão
  - [x] Adicionar coluna `tipo_residual` ('evitavel' vs 'estrutural') em `fct_opacidade_contabil_elementos.sql` e atualizar schema/testes dbt.
  - [x] Atualizar `OpacidadeElementoDTO` em `packages/db` com o campo `tipoResidual`.
  - [x] Adicionar Callout narrativo investigativo de destaque para a concentração de 39.99 no `TermometroOpacidadeFiscal`.
  - [x] Implementar badges de identificação (`Evitável / Discricionário` vs `Estrutural / Legal`) e nota explicativa sobre sentenças judiciais e encargos patronais.
  - [x] Ajustar rotulagem para `"Top 5 de N naturezas"` e adicionar toggle/accordion para visualização completa de todas as naturezas identificadas.
  - [x] Atualizar documentação em `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`.
  - [x] Validar suíte de testes (`make test && pnpm test && pnpm build`).

### Review Findings
- [x] [Review][Patch] Unificação de cômputo do desvio sensível macro com categorias sugeridas [elt/transform/models/marts/metrics/fct_opacidade_contabil_metricas.sql:16-19]
- [x] [Review][Patch] Adição de word boundaries (\y) em regexes curtas (posto, festa, inss) [elt/transform/models/intermediate/int_despesas_reclassificadas.sql:180,240,280]
- [x] [Review][Patch] Remoção de código 3.3.90.36.19 (Imóveis PF) da regra de locação de máquinas/veículos [elt/transform/models/intermediate/int_despesas_reclassificadas.sql:199,226]
- [x] [Review][Patch] Desempate determinístico (tie-breaker) no ranking de elementos pai [elt/transform/models/marts/metrics/fct_opacidade_contabil_elementos.sql:56]
- [x] [Review][Patch] Tratamento de string vazia em coalesce(nullif(d.produ, ''), d.descricao, '') [elt/transform/models/intermediate/int_despesas_reclassificadas.sql:69-71]
- [x] [Review][Patch] Bounding seguro Math.max(0, Math.min(100, ...)) em larguras CSS [apps/web/components/termometro-opacidade-fiscal.tsx:387,452]
- [x] [Review][Patch] Formatação de badge para exercício histórico único na UI [apps/web/components/termometro-opacidade-fiscal.tsx:496]

## Dev Agent Record

### Completion Notes
- **Task 1 Finalizada:**
  - Criado o catálogo de naturezas STN em `elt/transform/seeds/seed_naturezas_despesa_stn.csv` e seu schema `elt/transform/seeds/_seed_naturezas_despesa_stn.yml`.
  - Documentado o protocolo de governança em `docs/governanca-constantes-fiscais.md` (Seção 5).
  - Criado o modelo `elt/transform/models/intermediate/int_despesas_reclassificadas.sql` com precedência léxica estrita (resíduos/caçambas, consórcios, bloqueios judiciais, plantões médicos, terceirização, previdência, consultorias e gastos sensíveis).
  - Desacoplado `elt/transform/models/marts/fct_despesas.sql` removendo mais de 80 linhas de regexes embutidas e expondo `natureza_despesa_codigo_sugerido`, `natureza_despesa_nome_sugerido` e `categoria_objeto_sugerida`.
  - Atualizado `elt/transform/models/marts/metrics/fct_opacidade_contabil_credores.sql` para utilizar a categoria sugerida do objeto.
  - Suíte de 83 testes de integração (`make test`) e linters (`make check`) 100% aprovados.
- **Task 2 Finalizada:**
  - Exportados `CATEGORIAS_OBJETO_SUGERIDAS`, `CategoriaObjetoSugerida` e `CategoriaPredominanteOpacidade` em `packages/db/src/queries/opacidade-contabil-metrics.ts`.
  - Atualizado `OpacidadeCredorDTO` e o mapper de `getOpacidadeContabilMetrics` para tipar e retornar todas as categorias sugeridas do objeto.
  - Adicionado teste unitário cobrindo todas as 7 novas categorias em `packages/db/src/queries/__tests__/opacidade-contabil-metrics.spec.ts`.
  - 36/36 testes unitários aprovados no Vitest e validação de tipos TypeScript `tsc --noEmit` 100% sem erros.
- **Task 3 Finalizada:**
  - Atualizado helper `formatCategoriaSensivel` em `apps/web/components/termometro-opacidade-fiscal.tsx` para formatar labels amigáveis para todas as novas categorias sugeridas na gaveta de credores.
  - Atualizado `apps/web/components/termometro-opacidade-fiscal.spec.tsx` com teste unitário validando renderização das novas categorias.
  - Atualizados os arquivos de documentação para IA `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` (Regra 12 do AGENTS.md).
  - Executados `pnpm test` (67/67 testes web e 36/36 testes db aprovados) e `pnpm build` com 100% de sucesso.
- **Task 4 Finalizada (Validação de Ponta a Ponta & DoD):**
  - `make test`: 83/83 testes de integração aprovados.
  - `make check`: Ruff e Mypy 100% aprovados.
  - `pnpm test`: 103 testes no Vitest aprovados.
  - `pnpm build`: Next.js turbo build com 100% de sucesso.
- **Task 5 Finalizada (Refinamento Forense & UX de Opacidade):**
  - Adicionada coluna `tipo_residual` (`'evitavel'` vs `'estrutural'`) no mart `fct_opacidade_contabil_elementos.sql` e contratos/testes dbt atualizados.
  - Atualizado `OpacidadeElementoDTO` e query em `@transparencia/db` com tipagem estrita `tipoResidual: "evitavel" | "estrutural"`.
  - Implementado Callout narrativo investigativo evidenciando que mais da metade dos gastos genéricos concentra-se em 39.99 (Serviços PJ).
  - Adicionados badges explicativos de identificação (`Evitável` vs `Estrutural`) em cada item e nota metodológica separando sentenças judiciais e encargos legais de contratações de serviços/materiais.
  - Ajustado rótulo para `"Top 5 de N naturezas"` e adicionado toggle para visualização das 20 naturezas completas.
  - Documentação para LLMs atualizada em `llms.txt` e `llms-full.txt`.
  - 106 testes Vitest, 83 testes pytest e build 100% aprovados.

## File List
- `elt/transform/seeds/seed_naturezas_despesa_stn.csv` (novo)
- `elt/transform/seeds/_seed_naturezas_despesa_stn.yml` (novo)
- `elt/transform/seeds/seed_constantes_fiscais.csv` (modificado)
- `docs/governanca-constantes-fiscais.md` (modificado)
- `elt/transform/dbt_project.yml` (modificado)
- `elt/transform/profiles.yml` (modificado)
- `elt/transform/models/intermediate/int_despesas_reclassificadas.sql` (novo)
- `elt/transform/models/intermediate/_int_despesas_reclassificadas.yml` (novo)
- `elt/transform/models/marts/fct_despesas.sql` (modificado)
- `elt/transform/models/marts/_fct_despesas.yml` (modificado)
- `elt/transform/models/marts/metrics/fct_opacidade_contabil_credores.sql` (modificado)
- `elt/transform/models/marts/metrics/fct_opacidade_contabil_elementos.sql` (novo)
- `elt/transform/models/marts/metrics/_fct_opacidade_contabil_metricas.yml` (modificado)
- `packages/db/src/queries/opacidade-contabil-metrics.ts` (modificado)
- `packages/db/src/queries/__tests__/opacidade-contabil-metrics.spec.ts` (modificado)
- `packages/db/tests/fixtures/seed.ts` (modificado)
- `apps/web/components/termometro-opacidade-fiscal.tsx` (modificado)
- `apps/web/components/termometro-opacidade-fiscal.spec.tsx` (modificado)
- `apps/web/components/radar-gastos-sensiveis.tsx` (modificado)
- `apps/web/public/llms.txt` (modificado)
- `apps/web/public/llms-full.txt` (modificado)

## Change Log
- 2026-08-28: [Task 1] Criação do catálogo STN, governança, modelo intermediário de reclassificação léxica e desacoplamento de fct_despesas.
- 2026-08-28: [Task 2] Atualização de DTOs, união de categorias sugeridas e testes em @transparencia/db.
- 2026-08-28: [Task 3] Formatação de labels amigáveis na gaveta de credores UI, testes web e atualização de llms.txt / llms-full.txt.
- 2026-08-28: [Task 4] Validação de ponta a ponta e preparação para code-review.
- 2026-08-29: [Code Review - Performance dbt] Otimização drástica do pipeline de transformação (CTE despesas_normalizadas, threads 8).
- 2026-08-29: [Code Review - Precisão Forense & Governança de Dados] Auditoria forense em 37.528 despesas e eliminação de falsos positivos/negativos.
- 2026-08-29: [Code Review - Refinamento de UI/UX & Consistência Normativa] Correção de atribuição legal e responsividade mobile.
- 2026-08-29: [Code Review - Quebra por Elemento Pai & Série Histórica de Exercícios Anteriores] Mart fct_opacidade_contabil_elementos e série fechada.
- 2026-08-29: [Task 5 - Segregação Forense de Residual Evitável vs Estrutural & Callout Narrativo]:
  - Classificação de `tipo_residual` em `'estrutural'` (sentenças judiciais 91.99, contribuições patronais 13.99) vs `'evitavel'` (serviços 39.99/36.99, materiais 30.99).
  - Adição de Callout narrativo investigativo de destaque sobre a concentração de 39.99.
  - Inclusão de badges de identificação e nota explicativa metodológica.
  - Ajuste de rótulo para `"Top 5 de N naturezas"` e expansão completa das 20 naturezas residuais.
  - Sincronização dos arquivos de contexto `llms.txt` e `llms-full.txt`.





