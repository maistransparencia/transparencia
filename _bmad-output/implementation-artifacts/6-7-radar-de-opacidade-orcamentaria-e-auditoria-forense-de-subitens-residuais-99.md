---
baseline_commit: f773d9367fd6fc9e1ea7022a5dde1cbab6c36a02
---

# Story 6.7: Radar de Opacidade Orçamentária e Auditoria Forense de Subitens Residuais (`.99`)

**Status:** done  
**Epic:** Epic 6: Reformulação Fiscal da Homepage e Redesenho da Página de Despesas Detalhadas  


## Story

As a citizen, investigative journalist, or public prosecutor / auditor,  
I want an automated forensic radar that measures the municipality's degree of accounting opacity (the proportion of expenditures buried under generic residual sub-items `.99`, such as `3.3.90.39.99` and `3.3.90.30.99`) and highlights textual mismatches where real sensitive spending (e.g. sanitation, fleet rental, public events, or construction) was hidden under general codes,  
So that I can detect systematic attempts to evade public procurement thresholds, violate the Budgetary Specification Principle (Law 4.320/64, Arts. 5 and 15), and obscure public spending from civic oversight.

---

## Background & Diagnóstico Forense (Porciúncula 2021-2026)

- **Volume Histórico em `.99`:** **R$ 172.199.187,23 (27,32% de todo o orçamento pago no período)** foram desembolsados sob subitens residuais `.99` (*"Outros Serviços de Terceiros - PJ"*, *"Outros Serviços - PF"* e *"Outros Materiais de Consumo"*).
- **Pico de Opacidade em 2026:** **56,40% de todos os empenhos do exercício atual** foram registrados sob `.99`.
- **Top 5 Beneficiários no "Buraco Negro":**
  1. *CODESP (Consórcio Intermunicipal de Saúde):* R$ 31,92M em `.99` (deveria ser `3.3.71.70.00` - Rateio de Consórcio Público).
  2. *Coop. Catadores de Miracema (Limpeza Urbana / Caçambas):* R$ 14,18M em `.99` (deveria ser `3.3.90.39.28` e `3.3.90.39.12`).
  3. *Bloqueios Judiciais e Precatórios (Cartório / TJRJ):* R$ 12,48M em `.99` (deveria ser `3.3.90.91.00` / `4.4.90.91.00` - Sentenças Judiciais).
  4. *Arena Eventos de Itaperuna (Palcos / Som / Shows):* R$ 5,78M em `.99` (deveria ser `3.3.90.39.14` e `3.3.90.39.22`).
  5. *Radar Empreendimentos (Frotas / Vans / Maquinários):* R$ 4,86M em `.99` (deveria ser `3.3.90.39.13` e `3.3.90.39.12`).

### Fundamentação Jurídica Canônica (com Links Oficiais):
- **[Lei Federal nº 4.320/64 (Arts. 5º e 15)](http://www.planalto.gov.br/ccivil_03/leis/l4320.htm):** Princípio da Especificação Orçamentária (veda empenhos globais e dotações indeterminadas).
- **[Lei Complementar nº 101/2000 - LRF (Art. 48)](http://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm):** Transparência Fiscal e Acesso Público em tempo real aos atos de despesa.
- **[Lei Federal nº 14.133/2021 (Art. 75)](http://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm) e [Código Penal (Art. 337-E)](http://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm):** Crime de Fracionamento de Despesa e Burla aos Limites de Licitação.
- **[Acórdão TCU nº 1.540/2014 - Plenário](https://pesquisa.apps.tcu.gov.br/) e Deliberação TCE-RJ nº 200/96:** Caráter estritamente residual, excepcional e temporário do uso do subitem `.99`.

Nota: A auditoria automatizada expõe indícios de desorganização contábil, burla de limites de licitação ou pedaladas fiscais, permitindo aos órgãos de controle (TCE-RJ / MP) e cidadãos a fiscalização direcionada.

---

## Acceptance Criteria

### 1. Governança Legislativa e Seeds (`elt/transform/seeds/` & `docs/`)
1. **Evolução do Seed `seed_constantes_fiscais.csv`:**
   - Adicionar coluna `url_base_legal`.
   - Incluir registros das leis citadas na Story 6.7 e preencher URLs oficiais do Planalto para constantes já existentes.
   - Definir limiares de risco em constantes: `opacidade_limite_atencao_pct` (15.00) e `opacidade_limite_critico_pct` (30.00).
2. **Guia Operacional `docs/governanca-constantes-fiscais.md`:**
   - Documentar fontes oficiais (Planalto, STN/Siconfi, TCU, TCE-RJ), calendário de revisões (virada de ano para limites de licitação) e checklist de atualização (`dbt seed` → `make test`).

### 2. Modelagem no dbt (`elt/transform/models/`)
3. **Mart de Métricas `fct_opacidade_contabil_metricas.sql`:**
   - Tabela materializada agrupada por `portal_slug` e `ano`.
   - Campos pré-calculados: `total_empenhos`, `empenhos_residual_99`, `taxa_empenhos_opacidade_pct`, `total_pago`, `pago_residual_99`, `taxa_valor_opacidade_pct`.
   - Tratamento seguro de divisão por zero (`CASE WHEN total_empenhos > 0 ... ELSE 0.0 END`).
   - Classificação de risco em lowercase snake_case: `normal` (< 15%), `atencao` (15% a 30%), `critico` (> 30%).
4. **Mart de Credores `fct_opacidade_contabil_credores.sql`:**
   - Ranking dos Top 10 credores por `portal_slug` e `ano` que mais receberam recursos sob `.99`, com contagem de empenhos, valor total pago e amostra textual do objeto (`produ` / `descricao`) sanitizada com `unaccent`.
5. **Contratos de Schema:**
   - Schemas `_fct_opacidade_contabil_metricas.yml` e `_seed_constantes_fiscais.yml` atualizados com testes de integridade.

### 3. Leitor Atômico em `@transparencia/db` (`packages/db/src/queries/`)
6. **Função `getOpacidadeContabilMetrics(portalSlug: string, ano: number)`:**
   - Retorna DTO `OpacidadeContabilMetricsDTO` contendo o indicador do exercício atual, comparativo histórico com anos anteriores, Top 10 credores e links das bases legais.
   - Zero agregação (`SUM`, `AVG`, `GROUP BY`) em runtime no TypeScript.
7. **Testes Unitários:**
   - Suíte em `packages/db/src/queries/__tests__/opacidade-contabil-metrics.spec.ts` validando retornos, cenários vazios e tipagens.

### 4. Apresentação na Web (`apps/web/`)
8. **Componente `apps/web/components/termometro-opacidade-fiscal.tsx`:**
   - Integrado na página `/despesas` (Ato II: Fiscalização Cidadã).
   - Exibe barra visual de risco (Termômetro), percentual de opacidade do ano atual (56,4%), total em R$ em `.99` e badge de risco fiscal (`Crítico`).
   - Badge com link oficial *"Base Legal: Lei 4.320/64 ↗"*.
   - Gaveta/tabela colapsável com os maiores credores em `.99` e o desvio aparente do objeto.
9. **Responsividade Mobile:**
   - 100% responsivo e touch-friendly, sem tooltips acidentais em hover (Regra de UI do projeto).

### 5. Guias Públicos para IA (`llms.txt` e `llms-full.txt`)
10. **Sincronização de IA (Regra 12 de `AGENTS.md`):**
    - Atualizar `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` documentando o conceito, a fórmula da **Taxa de Opacidade Contábil** e seu papel na auditoria de conformidade com a Lei 4.320/64.

---

## Tasks / Subtasks

- [x] [Task 1] Governança Legislativa & Modelagem dbt (`elt/`)
  - [x] Atualizar `elt/transform/seeds/seed_constantes_fiscais.csv` com a coluna `url_base_legal`, novas constantes de opacidade e links oficiais.
  - [x] Atualizar schema `elt/transform/seeds/_seed_constantes_fiscais.yml` (em `elt/transform/seeds/seeds.yml`).
  - [x] Criar guia operacional `docs/governanca-constantes-fiscais.md`.
  - [x] Criar mart `elt/transform/models/marts/metrics/fct_opacidade_contabil_metricas.sql` (materialized='table').
  - [x] Criar mart `elt/transform/models/marts/metrics/fct_opacidade_contabil_credores.sql` (materialized='table').
  - [x] Adicionar schema e testes unitários em `elt/transform/models/marts/metrics/_fct_opacidade_contabil_metricas.yml`.
- [x] [Task 2] Camada de Dados Atômica `@transparencia/db` (`packages/db/src/queries/`)
  - [x] Implementar `getOpacidadeContabilMetrics` em `packages/db/src/queries/opacidade-contabil-metrics.ts`.
  - [x] Exportar em `packages/db/src/index.ts`.
  - [x] Criar testes unitários em `packages/db/src/queries/__tests__/opacidade-contabil-metrics.spec.ts`.
- [x] [Task 3] Componente e Integração Web (`apps/web/`)
  - [x] Criar `apps/web/components/termometro-opacidade-fiscal.tsx`.
  - [x] Integrar no loader `loadDespesasData` (`apps/web/app/[portalSlug]/despesas/loader.ts`) e no `view-model.ts`.
  - [x] Renderizar na página `/despesas` (Ato II: Fiscalização Cidadã).
  - [x] Criar testes unitários em `apps/web/components/termometro-opacidade-fiscal.spec.tsx` e `apps/web/app/[portalSlug]/despesas/view-model.spec.ts`.
- [x] [Task 4] Documentação e Guias de IA (`apps/web/public/`)
  - [x] Atualizar `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` (Regra 12 de `AGENTS.md`).
- [x] [Task 5] Validação e Testes Finais de Ponta a Ponta
  - [x] Executar `make test` (backend Python e dbt).
  - [x] Executar `pnpm test` (frontend e DB TypeScript).

## Dev Agent Record

### Implementation Notes
- **Task 1:**
  - Atualizado `elt/transform/seeds/seed_constantes_fiscais.csv` incluindo `url_base_legal`, novas constantes de opacidade e limites de atenção (15%) e crítico (30%).
  - Atualizado schema `elt/transform/seeds/seeds.yml` tipando `url_base_legal: text`.
  - Criado `docs/governanca-constantes-fiscais.md` documentando SSOT de constantes fiscais.
  - Implementado mart `fct_opacidade_contabil_metricas.sql` calculando taxas de opacidade de empenho e valor pago com classificação de risco em `lowercase_snake_case` e métricas de desvio sensível.
  - Implementado mart `fct_opacidade_contabil_credores.sql` com ranking top 10 credores em `.99`, detecção de categoria sensível predominante e sanitização de amostra de objeto com `unaccent`.
  - Criado `_fct_opacidade_contabil_metricas.yml` com contratos estritos (`enforced: true`), testes de unicidade/não-nulo, accepted_values e 2 unit tests dbt.
  - Validações executadas: `make dbt/seed`, `make dbt/run`, `make dbt/test` (29 testes dbt verdes), `make test` (83 testes pytest verdes) e `make check` (100% aprovado).
- **Task 2:**
  - Implementado leitor atômico `getOpacidadeContabilMetrics` em `packages/db/src/queries/opacidade-contabil-metrics.ts` com DTOs `OpacidadeContabilMetricsDTO`, `OpacidadeMetricasExercicioDTO`, `OpacidadeCredorDTO`, `LimiaresOpacidadeDTO` e `BaseLegalOpacidadeDTO`.
  - Consulta paralela com `Promise.all` em `fct_opacidade_contabil_metricas`, `fct_opacidade_contabil_credores` e `seed_constantes_fiscais`. Zero agregação em runtime TypeScript.
  - Exportado em `packages/db/src/index.ts`.
  - Criada suíte de testes em `packages/db/src/queries/__tests__/opacidade-contabil-metrics.spec.ts` cobrindo retorno completo, histórico ordenado, top credores, bases legais do Planalto e fallback de exercício.
  - Validações: `pnpm --filter @transparencia/db test` (15/15 arquivos, 35/35 testes verdes), `tsc --noEmit` 100% limpo, `pnpm test` (monorepo 100% verde).
- **Task 3:**
  - Criado componente `TermometroOpacidadeFiscal` em `apps/web/components/termometro-opacidade-fiscal.tsx` com barra visual de risco, 4 KPIs forenses, link para Base Legal oficial e gaveta colapsável dos maiores beneficiários em .99 com desvios sensíveis detectados.
  - Integrado no loader `loadDespesasData` (`apps/web/app/[portalSlug]/despesas/loader.ts`) e no `view-model.ts`.
  - Integrado e renderizado no Ato II da página `/despesas`.
  - Criados testes unitários em `apps/web/components/termometro-opacidade-fiscal.spec.tsx` e atualizado `view-model.spec.ts`.
  - Validações: `pnpm --filter web test` (20/20 arquivos, 66/66 testes verdes), `pnpm build` (build Next.js bem sucedido) e `pnpm test` (monorepo 100% verde).
- **Task 4:**
  - Atualizados `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` documentando o Radar de Opacidade Orçamentária, conceito de subitens residuais (`.99`), limiares de risco fiscal (15% e 30%), fundamentação na Lei 4.320/64 / Acórdão TCU 1.540/2014 e diretrizes de interpretação e consulta para agentes de IA e LLMs (Regra 12 de `AGENTS.md`).
- **Task 5:**
  - Execução da validação completa ponta a ponta:
    - Backend & DBT: `make test` (83/83 testes pytest aprovados), `make dbt/test SELECT="fct_opacidade_contabil_metricas fct_opacidade_contabil_credores"` (29/29 testes dbt aprovados), `make check` (Ruff e Mypy 100% limpos).
    - Frontend & DB: `pnpm test` (101/101 testes Vitest aprovados: 35 no DB e 66 no Web), `pnpm build` (Next.js 16 build estático e dinâmico 100% aprovado).

### File List
- `elt/transform/seeds/seed_constantes_fiscais.csv` (modificado)
- `elt/transform/seeds/seeds.yml` (modificado)
- `docs/governanca-constantes-fiscais.md` (novo)
- `elt/transform/models/marts/metrics/fct_opacidade_contabil_metricas.sql` (novo)
- `elt/transform/models/marts/metrics/fct_opacidade_contabil_credores.sql` (novo)
- `elt/transform/models/marts/metrics/_fct_opacidade_contabil_metricas.yml` (novo)
- `packages/db/tests/fixtures/schema.sql.gz` (modificado)
- `packages/db/src/queries/opacidade-contabil-metrics.ts` (novo)
- `packages/db/src/index.ts` (modificado)
- `packages/db/tests/fixtures/seed.ts` (modificado)
- `packages/db/src/queries/__tests__/opacidade-contabil-metrics.spec.ts` (novo)
- `apps/web/components/termometro-opacidade-fiscal.tsx` (novo)
- `apps/web/components/termometro-opacidade-fiscal.spec.tsx` (novo)
- `apps/web/app/[portalSlug]/despesas/loader.ts` (modificado)
- `apps/web/app/[portalSlug]/despesas/view-model.ts` (modificado)
- `apps/web/app/[portalSlug]/despesas/view-model.spec.ts` (modificado)
- `apps/web/app/[portalSlug]/despesas/page.tsx` (modificado)
- `apps/web/public/llms.txt` (modificado)
- `apps/web/public/llms-full.txt` (modificado)

### Change Log
- 2026-08-28: [Task 1] Concluída modelagem dbt de opacidade orçamentária, governança de constantes fiscais e testes unitários dbt.
- 2026-08-28: [Task 2] Concluída camada de dados atômica @transparencia/db com query reader getOpacidadeContabilMetrics e testes unitários.
- 2026-08-28: [Task 3] Concluído componente UI TermometroOpacidadeFiscal, integração na página /despesas e testes unitários.
- 2026-08-28: [Task 4] Atualizados arquivos de contexto público para IA llms.txt e llms-full.txt conforme Regra 12 de AGENTS.md.
- 2026-08-28: [Task 5] Concluída bateria de testes e validações ponta a ponta (pytest, dbt, vitest e build Next.js).




