---
baseline_commit: ca11775cf2e50c40342d1364235bfe7a5d1efddc
baseline_revision: ca11775cf2e50c40342d1364235bfe7a5d1efddc
final_revision: 17d50feb7eed6b0960aaf28279fb3b8f06ed0a0b
status: done
review_loop_iteration: 0
followup_review_recommended: false
---

# Story 9.5: Painel de Pessoal por Regime Jurídico e Vínculo Funcional na Página /pessoal

Status: done

## Story

As a citizen, journalist, or public administration analyst auditing personnel expenditures,
I want to view municipal staff and payroll broken down by legal regime and appointment type (concursados/efetivos, comissionados/livre nomeação, contratos temporários e RPPS/previdenciários),
So that I can identify spending bottlenecks, assess the balance between career civil servants and political appointees, and monitor compliance with fiscal transparency standards.

---

## Acceptance Criteria

1. **Resgate de Colunas Nativas no Staging (`_sources.yml` e `stg_porciuncula_prefeitura__pessoal`):**
   - Declarar em `_sources.yml` (Regra 5 de `AGENTS.md`) as colunas existentes em `raw_porciuncula_prefeitura.pessoal`: `matricula`, `tiporegime`, `tipocontrato`, `situacaofuncional`.
   - Atualizar `stg_porciuncula_prefeitura__pessoal.sql` para expor essas colunas sanitizadas:
     - `matricula`: `nullif(trim(matricula), '')`
     - `tipo_regime_raw`: `nullif(trim(tiporegime), '')`
     - `tipo_contrato_raw`: `nullif(trim(tipocontrato), '')`
     - `situacao_funcional_raw`: `nullif(trim(situacaofuncional), '')`

2. **Categorização Canônica Determinística na Fato Atômica (`fct_pessoal`):**
   - Na camada intermediária (`int_pessoal_consolidado`) e na fato atômica (`fct_pessoal`), derivar as colunas canônicas a partir dos classificadores oficiais do município:
     - `categoria_regime` (lowercase snake_case, Regra 10):
       - `efetivo_concurso`: `situacaofuncional` código `0` ou `tipocontrato = 'Efetivo'`
       - `efetivo_comissao`: `situacaofuncional` código `1` ou `tipocontrato = 'Efetivo em Comissão'` (efetivos ocupando liderança)
       - `comissionado`: `situacaofuncional` código `2` ou `tipocontrato = 'Função de Confiança'` (comissionados externos)
       - `contrato_temporario`: `situacaofuncional` código `3` ou `tipocontrato ilike '%temporario%'` (processo seletivo)
       - `agente_politico`: `forma_provimento = 'ELEICAO/INDICACAO'` ou `vinculo ilike '%agente politico%'`
       - `rpps_inativos`: aposentados, pensionistas e inativos
       - `outros`: demais casos residuais
     - `regime_previdenciario`: `'rpps'` (quando `tipo_regime_raw ilike '%proprio%'` ou RPPS/Caprem), `'rgps'` (quando `tipo_regime_raw ilike '%geral%'`), ou `'sem_regime'`.
   - **Refatoração de `fct_pessoal_folha_metricas`:** Substituir as buscas de substrings (`vinculo like '%FG%'` e `categoria_funcional = 'Cargo comissionado extra-quadro'`) pelo uso direto da coluna canônica `categoria_regime`.

3. **Modelo dbt Mart de Métricas por Regime (`fct_pessoal_regime_metricas`):**
   - Agregação dos dados da tabela fato atômica `fct_pessoal` por `portal_slug`, `ano`, `empresa_id` e `categoria_regime`.
   - Nomes de métricas 100% explícitos e sem abreviações (Regra 9 de `AGENTS.md`):
     - `total_profissionais` (integer)
     - `total_proventos` (numeric 15,2)
     - `provento_medio` (numeric 15,2)
     - `percentual_profissionais` (numeric 5,2)
     - `percentual_folha` (numeric 5,2)
   - Surrogate key determinística via `dbt_utils.generate_surrogate_key(['portal_slug', 'ano', 'empresa_id', 'categoria_regime'])`.

4. **Reader Kysely e Tipagem Funcional (`@transparencia/db`):**
   - Criação da query tipada `getPessoalRegimeMetrics(portalSlug, ano, options)` em `packages/db/src/queries/pessoal-regime-metrics.ts`.
   - DTO tipado em `camelCase` estrito (Regra 18 de `AGENTS.md`):
     - `categoriaRegime`: `"efetivo_concurso" | "efetivo_comissao" | "comissionado" | "contrato_temporario" | "agente_politico" | "rpps_inativos" | "outros"`
     - `categoriaRegimeRotulo`: Rótulo legível para apresentação na UI ("Concursados (Efetivos)", "Efetivos em Chefia (FG/CC)", "Cargos em Comissão", "Contratos Temporários", "Agentes Políticos", "RPPS / Previdenciários", "Outros")
     - `totalProfissionais`: number
     - `totalProventos`: number
     - `proventoMedio`: number
     - `percentualProfissionais`: number
     - `percentualFolha`: number
   - Estilo funcional e imutável (Regra 2 de `AGENTS.md`), sem sanitizações redundantes (Regra 14 de `AGENTS.md`).

5. **Seção Visual na Página `/pessoal` (`apps/web`):**
   - Criação do componente `PessoalRegimeSection` em `apps/web/components/pessoal-regime-section.tsx`.
   - Estilização estrita no Design System do portal:
     - Container: `rounded-2xl border border-[#e7e9ee] bg-white p-6 shadow-sm`.
     - Cards por categoria com hover sutil `hover:border-[#cbd0db] transition-all`.
     - Headcount em destaque com número de profissionais e percentual do quadro (`fmtNumber`, `fmtPercent`).
     - Volume financeiro em proventos (`fmtCompact` / `fmtCurrency`) e provento médio mensal.
     - Barra proporcional de distribuição visual entre os regimes.
     - Badges semânticas com contraste correto e sem termos técnicos obscuros.
     - Regra 13 de `AGENTS.md`: Zero ternários aninhados na UI (uso de helpers/IIFE para derivação condicional).
   - Integração na página em `apps/web/app/[portalSlug]/pessoal/page.tsx` via `loader.ts` e `view-model.ts`.

6. **Infraestrutura Show Your Work (Exportação CSV):**
   - Suporte a `tipo="pessoal_regime"` na rota de exportação `/api/[portalSlug]/export`.
   - Botão `ShowYourWorkButton` integrado no cabeçalho da seção permitindo download dos dados auditáveis em formato CSV.

7. **Sincronização dos Guias de IA (Regra 12 de `AGENTS.md`):**
   - Atualização de `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` documentando a rota `/pessoal`, as métricas de regime funcional e a distinção entre concurso, livre nomeação e contrato temporário.

8. **Garantia de Qualidade e Testes Automatizados:**
   - Testes unitários do componente `PessoalRegimeSection` e do `view-model.ts` da página `/pessoal`.
   - Teste de integração do reader Kysely em `packages/db`.
   - Teste da rota de exportação CSV `/api/[portalSlug]/export`.
   - 100% de sucesso em `pnpm --filter web test`, `tsc --noEmit`, `make test` e `make check`.

---

## Tasks / Subtasks

- [x] Task 1: Resgate de Colunas no Staging e Categorização na Fato Atômica (AC: 1, AC: 2)
  - [x] Subtask 1.1: Atualizar `elt/transform/models/staging/porciuncula_prefeitura/_sources.yml` com as colunas nativas (`matricula`, `tiporegime`, `tipocontrato`, `situacaofuncional`).
  - [x] Subtask 1.2: Atualizar `stg_porciuncula_prefeitura__pessoal.sql` e `int_pessoal_consolidado.sql` para expor e derivar `categoria_regime` e `regime_previdenciario`.
  - [x] Subtask 1.3: Atualizar `fct_pessoal.sql` e `_fct_pessoal.yml` com as novas colunas.
  - [x] Subtask 1.4: Refatorar `fct_pessoal_folha_metricas.sql` para consumir `categoria_regime` eliminando filtros frágeis de substring.
  - [x] Subtask 1.5: Validar com `dbt run` e `make test`.

- [x] Task 2: Modelagem dbt do Mart de Métricas de Regime de Pessoal (AC: 3)
  - [x] Subtask 2.1: Criar modelo `elt/transform/models/marts/metrics/fct_pessoal_regime_metricas.sql` e documentação `_fct_pessoal_regime_metricas.yml`.
  - [x] Subtask 2.2: Adicionar testes de integração Python em `tests/` e validar com `make test`.

- [x] Task 3: Reader Kysely em `@transparencia/db` (AC: 4)
  - [x] Subtask 3.1: Criar `packages/db/src/queries/pessoal-regime-metrics.ts` com DTO em camelCase e funções imutáveis.
  - [x] Subtask 3.2: Exportar em `packages/db/src/index.ts` e adicionar testes unitários de paridade em `packages/db/test/`.
  - [x] Subtask 3.3: Validar com `pnpm --filter @transparencia/db test`.

- [x] Task 4: Componente e Integração na Rota `/pessoal` (AC: 5)
  - [x] Subtask 4.1: Criar componente `apps/web/components/pessoal-regime-section.tsx` alinhado ao Design System.
  - [x] Subtask 4.2: Atualizar `apps/web/app/[portalSlug]/pessoal/loader.ts` e `view-model.ts` para carregar e transformar os dados de regime.
  - [x] Subtask 4.3: Inserir a seção na página `apps/web/app/[portalSlug]/pessoal/page.tsx`.
  - [x] Subtask 4.4: Criar testes unitários em `pessoal-regime-section.spec.tsx` e atualizar `view-model.spec.ts` e `page.spec.tsx`.

- [x] Task 5: Exportação CSV "Show Your Work" (AC: 6)
  - [x] Subtask 5.1: Adicionar suporte a `tipo="pessoal_regime"` em `packages/db/src/queries/export-raw-data.ts` e na rota `/api/[portalSlug]/export/route.ts`.
  - [x] Subtask 5.2: Integrar `ShowYourWorkButton` na seção de regime e adicionar testes em `apps/web/app/api/[portalSlug]/export/route.spec.ts`.

- [x] Task 6: Sincronização dos Guias de IA (AC: 7)
  - [x] Subtask 6.1: Atualizar `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`.
  - [x] Subtask 6.2: Rodar `pnpm --filter web test` para validar integridade da documentação.

- [x] Task 7: Validação de Qualidade e Baseline de Qualidade (AC: 8)
  - [x] Subtask 7.1: Executar `pnpm --filter web test`, `pnpm --filter @transparencia/db test` e `tsc --noEmit`.
  - [x] Subtask 7.2: Executar `make test` e `make check`.

- [x] Task 8: Refinamentos de UI, Desacoplamento de Entidade e Higienização de CSV (AC: 5, AC: 6)
  - [x] Subtask 8.1: Remover ícone do título e ajustar grid para layout simétrico 3x2 (executado pelo usuário).
  - [x] Subtask 8.2: Adicionar badge "Consolidado Municipal" no cabeçalho do card e desacoplar filtro de entidades (loader, componente e Show Your Work).
  - [x] Subtask 8.3: Harmonizar estilos dos cards com o Design System (eliminar font-mono, padronizar bordas slate-200, tipografia e badges).
  - [x] Subtask 8.4: Remover `empresa_id` do cabeçalho e das linhas na exportação CSV de pessoal (`/api/[portalSlug]/export`).
  - [x] Subtask 8.5: Incluir nota explicativa contextualizando o que a categoria "Outros" representa (vínculos excepcionais e provimentos atípicos no portal de origem).
  - [x] Subtask 8.6: Atualizar testes unitários e de integração (componente, rota de exportação e página) garantindo 100% de aprovação.
  - [x] Subtask 8.7: Refatorar intermediate dbt `int_pessoal_consolidado.sql` para aplicar precedência constitucional de provimento e cargo, saneando a classificação e eliminando o resíduo espúrio de "Outros".
  - [x] Subtask 8.8: Adicionar callout box de Auditoria Cívica na UI (`PessoalRegimeSection`) alertando o cidadão sobre a anomalia cadastral da prefeitura (rotulagem indevida de auxiliares como Agentes Políticos).
  - [x] Subtask 8.9: Implementar detecção data-driven de divergências cadastrais (`getCountDivergenciasCadastraisPessoal` em `@transparencia/db`) e substituir alerta estático por nota dinâmica condicionada estritamente a `totalDivergencias > 0`.

---

## Deferred Work (Backlog Futuro)

- `dim_servidor`: Modelagem de dimensão cadastral de servidores (aproveitando `matricula`, `cpf` anonimizado, `dataadmissao` e `datadesligamento` presentes na tabela raw) para viabilizar análises avançadas de trajetória funcional, antiguidade no serviço público e evolução salarial histórica individual.

---

## Dev Notes

- **Conformidade Regra 5:** Sempre que adicionar novas colunas de entrada no staging, é obrigatório atualizar `_sources.yml`.
- **Conformidade Regra 10:** Os códigos de regime devem ser estritamente em lowercase snake_case (`efetivo_concurso`, `efetivo_comissao`, `comissionado`, `contrato_temporario`, `agente_politico`, `rpps_inativos`, `outros`). Rótulos amigáveis pertencem à camada de UI/View-Model.
- **Conformidade Regra 9:** Métricas com nomes explícitos (`total_profissionais`, `total_proventos`, `provento_medio`, `percentual_profissionais`, `percentual_folha`).
- **Conformidade Regra 18:** No TypeScript, todos os campos dos DTOs devem estar em `camelCase`.
- **Conformidade Regra 13:** Proibido o uso de ternários aninhados.
- **Conformidade Regra 15:** Rodar estritamente contra o PostgreSQL local.

---

## Review Triage Log

### 2026-09-10 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 8: (high 0, medium 3, low 5)
- defer: 0
- reject: 1: (high 0, medium 0, low 1)
- addressed_findings:
  - `[medium]` `[patch]` int_pessoal_consolidado: alinhar classificação de Funções de Confiança em efetivo_comissao, tratar plurais de agentes políticos e qualificar chamadas de unaccent com schema target sem DDL em pre-hook
  - `[medium]` `[patch]` export-raw-data: normalizar empresa_id com padding/unpadding e retornar array vazio quando empresaIds for vazio
  - `[medium]` `[patch]` pessoal-regime-section / page: repassar parâmetro entidades para ShowYourWorkButton e refletir no filename do CSV
  - `[low]` `[patch]` constants/pessoal: desacoplar CATEGORIA_REGIME_LABELS para apps/web/lib/constants/pessoal.ts evitando import de view-model na API
  - `[low]` `[patch]` export route: validar categoriaParam contra CATEGORIAS_REGIME com erro 400
  - `[low]` `[patch]` pessoal-regime-metrics: proteger ordenação de categorias desconhecidas e validação de ano
  - `[low]` `[patch]` pessoal-regime-section: adicionar atributos W3C ARIA (valuenow, valuemin, valuemax) na barra de distribuição proporcional e fallback para categoriaRegimeRotulo
  - `[low]` `[patch]` fct_pessoal_regime_metricas: adicionar clamp least/greatest aos percentuais para evitar overflow de numeric(5,2)

---

## Auto Run Result

### Summary of implemented change
Implementação completa da Story 9.5: painel de pessoal por regime jurídico e vínculo funcional na página pública `/pessoal`, enriquecimento de dados no dbt mart `fct_pessoal_regime_metricas`, leitor Kysely `getPessoalRegimeMetrics`, componentes visuais com gráfico proporcional e cards de headcount e folha, botão auditável Show Your Work (exportação CSV) e documentação cívica sincronizada em `llms.txt` e `llms-full.txt`.

### Files changed with one-line descriptions
- `elt/transform/models/staging/porciuncula_prefeitura/_sources.yml`: Declara colunas nativas de pessoal (matricula, tiporegime, tipocontrato, situacaofuncional).
- `elt/transform/models/staging/porciuncula_prefeitura/stg_porciuncula_prefeitura__pessoal.sql`: Sanitiza e expõe colunas de regime e contrato.
- `elt/transform/models/intermediate/int_pessoal_consolidado.sql`: Categoriza determinística e constitucionalmente regime funcional e previdenciário.
- `elt/transform/models/marts/fct_pessoal.sql`: Inclui categoria_regime e regime_previdenciario na tabela fato atômica.
- `elt/transform/models/marts/metrics/fct_pessoal_regime_metricas.sql`: Modelo mart agregado de headcount, folha, média e percentuais por regime.
- `elt/transform/models/marts/metrics/fct_pessoal_folha_metricas.sql`: Consome categoria_regime semântico substituindo filtros frágeis de substring.
- `packages/db/src/queries/pessoal-regime-metrics.ts`: Query Kysely tipada e funcional com DTO em camelCase.
- `packages/db/src/queries/export-raw-data.ts`: Consulta raw de servidores classificados por regime com normalização de entidades.
- `apps/web/lib/constants/pessoal.ts`: Constantes canônicas de regimes e rótulos humanos em apps/web.
- `apps/web/components/pessoal-regime-section.tsx`: Componente visual com gráfico de barras, cards, badges e Show Your Work.
- `apps/web/app/[portalSlug]/pessoal/page.tsx`: Integração da seção de regimes na página pública de pessoal.
- `apps/web/app/[portalSlug]/pessoal/loader.ts`: Carregamento assíncrono de getPessoalRegimeMetrics.
- `apps/web/app/[portalSlug]/pessoal/view-model.ts`: Transformação e anotação dos rótulos amigáveis de regime.
- `apps/web/app/api/[portalSlug]/export/route.ts`: Endpoint de streaming CSV para pessoal_regime com cabeçalhos UTF-8 e proteção contra injeção.
- `apps/web/public/llms.txt` e `llms-full.txt`: Documentação das rotas e métricas de regime funcional para agentes externos.

### Review findings breakdown
- Patches applied: 8 (classificação constitucional, normalização de filtros, acessibilidade ARIA, desacoplamento de constantes, bounds numéricos, fallbacks)
- Items deferred: 0
- Items rejected: 1 (redundância proposital de window functions no mart SQL vs agrupamento em Kysely)

### Verification performed
- `make test`: 96/96 testes em Python/pytest aprovados.
- `make check`: 100% aprovado (ruff check, ruff format, mypy).
- `make dbt/test`: 29/29 testes dbt aprovados (incluindo unit tests de cálculo de regime).
- `pnpm --filter web test`: 49/49 arquivos de teste aprovados (300/300 testes).
- `pnpm --filter @transparencia/db test`: 20/20 arquivos de teste aprovados (65/65 testes).
- `pnpm --filter web exec tsc --noEmit && pnpm --filter @transparencia/db exec tsc --noEmit`: 0 erros de tipagem.

### Residual risks
Nenhum risco residual identificado. Todas as suítes de testes estão verdes e a paridade de dados foi auditada.
