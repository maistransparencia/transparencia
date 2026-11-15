---
story_id: 1.2
story_key: 1-2-modelagem-das-dimensoes-canonicas-fiscais-stnmcasp-no-dbt
epic_num: 1
status: done
baseline_commit: 0c6c76619db78849e3c25df3f03c874ead209fc1
created: 2026-08-02T00:38:30-03:00
updated: 2026-08-02T00:54:00-03:00
---

# Story 1.2: Modelagem das Dimensões Canônicas Fiscais (STN/MCASP) no dbt

## Story Description

**As a** data engineer,  
**I want** canonical dimension tables for expense elements, nature of expense, functions, and subfunctions built in dbt according to official STN/MCASP standards,  
**So that** all metrics models join against standardized official classifications rather than using hardcoded JavaScript dictionaries.

---

## Acceptance Criteria

### Scenario 1: Criação e Carga da Dimensão Canônica de Elemento de Despesa (`dim_elemento_despesa`)
- **Given** a especificação oficial dos 99 elementos de despesa da Portaria STN nº 448/2002 e Portaria STN/SOF nº 163/2001 (catalogados na História 1.1)
- **When** o modelo/seed `dim_elemento_despesa` for criado e executado no dbt
- **Then** a dimensão é populada fisicamente com o catálogo completo e exaustivo de elementos (01 a 99), contendo `elemento_codigo`, `elemento_descricao` e `categoria_macro` (ex: Pessoal e Encargos, Diárias, Material, Serviços de Terceiros, Transferências, Investimentos, Amortização da Dívida, Aporte Atuarial, Sentenças).
- **And** substitui a necessidade do dicionário runtime `ELEMENTO_LABELS` do TypeScript por `JOIN` nativo no dbt.

### Scenario 2: Criação e Carga da Dimensão Canônica de Natureza de Despesa (`dim_natureza_despesa`)
- **Given** a norma de codificação orçamentária da Portaria STN/SOF nº 163/2001 ($C.G.MM.EE$)
- **When** o modelo/seed `dim_natureza_despesa` for criado no dbt
- **Then** a dimensão contêm a estrutura completa com Categoria Econômica (1 dígito), Grupo de Natureza de Despesa - GND (1 dígito), Modalidade de Aplicação (2 dígitos) e Elemento de Despesa (2 dígitos), incluindo suas descrições normatizadas.

### Scenario 3: Criação e Carga da Dimensão Canônica de Funções e Subfunções (`dim_funcao_subfuncao`)
- **Given** a taxonomia da Portaria MOG nº 42/1999 para classificação funcional da despesa pública
- **When** o modelo/seed `dim_funcao_subfuncao` for criado no dbt
- **Then** a dimensão contêm a totalidade das funções (2 dígitos) e subfunções oficiais (3 dígitos, ex: `10.301` Atenção Básica, `10.303` Suporte Profilático e Terapêutico, `09.272` RPPS, `28.843` Serviço da Dívida, `28.846` Sentenças Judiciais).

### Scenario 4: Testes de Integridade no dbt e Aprovação da Suíte de Testes
- **Given** as especificações declaradas nos arquivos de schema dbt (`_dim_elemento_despesa.yml`, `_dim_natureza_despesa.yml`, `_dim_funcao_subfuncao.yml`)
- **When** a suíte de testes de integração é executada via `make test`
- **Then** os testes de não-nulidade (`not_null`) e unicidade (`unique`) das chaves primárias passam com 100% de sucesso no banco de dados efêmero de testes (PostgreSQL).

---

## Tasks & Subtasks

- [x] **Task 1: Implementar o Seed/Model de Elementos de Despesa (`dim_elemento_despesa`)** (AC: Scenario 1)
  - [x] Criar o arquivo de seed CSV `elt/transform/seeds/seed_elemento_despesa.csv` (ou model dbt) contendo os 99 códigos normatizados (01 a 99) conforme tabela do `inventario-regras-fiscais-stn-mcasp.md`.
  - [x] Criar o modelo `elt/transform/models/marts/dim_elemento_despesa.sql` selecionando do seed/ref e formatando colunas: `elemento_codigo` (VARCHAR(2)), `elemento_descricao` (TEXT), `categoria_macro` (TEXT).
  - [x] Garantir formatação SQL sem alinhamento por espaços extras conforme diretriz do projeto.

- [x] **Task 2: Implementar o Seed/Model de Natureza de Despesa (`dim_natureza_despesa`)** (AC: Scenario 2)
  - [x] Criar o arquivo `elt/transform/seeds/seed_natureza_despesa.csv` (ou `dim_natureza_despesa.sql`) com o detalhamento de Categoria Econômica (`3` Correntes, `4` Capital), GND (`1` Pessoal, `2` Juros, `3` Outras Correntes, `4` Investimentos, `5` Inversões, `6` Amortização), Modalidades de Aplicação (`20`, `30`, `40`, `50`, `70`, `90`, `91`) e Elementos.
  - [x] Criar o modelo `elt/transform/models/marts/dim_natureza_despesa.sql`.

- [x] **Task 3: Implementar o Seed/Model de Funções e Subfunções (`dim_funcao_subfuncao`)** (AC: Scenario 3)
  - [x] Criar `elt/transform/seeds/seed_funcao_subfuncao.csv` (ou `dim_funcao_subfuncao.sql`) com todas as funções da Portaria MOG nº 42/1999 (01 a 28) e subfunções normatizadas (`10.301`, `10.302`, `10.303`, `10.304`, `10.305`, `09.272`, `28.843`, `28.846`, etc.).
  - [x] Criar o modelo `elt/transform/models/marts/dim_funcao_subfuncao.sql`.

- [x] **Task 4: Declarar Schema Contracts, Testes dbt e Atualizar `seeds.yml`** (AC: Scenario 4)
  - [x] Atualizar `elt/transform/seeds/seeds.yml` declarando os novos arquivos de seed com tipagem explícita de colunas (ex: `elemento_codigo: string`).
  - [x] Criar/atualizar arquivos YAML de documentação e teste em `elt/transform/models/marts/`:
    - `_dim_elemento_despesa.yml`
    - `_dim_natureza_despesa.yml`
    - `_dim_funcao_subfuncao.yml`
  - [x] Adicionar testes de `unique` e `not_null` nas chaves primárias.

- [x] **Task 5: Validação de Suíte de Testes Backend** (AC: Scenario 4)
  - [x] Executar `make test` para verificar a compilação dos seeds, modelos dbt e execução dos testes no ambiente PostgreSQL efêmero (`testing.postgresql`).
  - [x] Garantir 100% de aprovação sem regressões em testes existentes.

### Review Findings
- [x] [Review][Patch] Testes dbt - not_null ausentes para colunas não-PK em _dim_*.yml [elt/transform/models/marts/_dim_elemento_despesa.yml]
- [x] [Review][Patch] Renomear misnomer natureza_grupo_codigo para natureza_despesa_codigo (STN 163/2001) [elt/transform/seeds/seed_natureza_despesa.csv]
- [x] [Review][Patch] Adicionar códigos genéricos/reservados 00 ("A Classificar") e 99.999 ("Reserva de Contingência") em seeds [elt/transform/seeds/seed_elemento_despesa.csv]

---

## Dev Notes & Technical Architecture Guardrails

### Core Invariants & Architecture Decisions
- **AD-1 (SSOT no dbt)**: Nenhuma constante ou dicionário hardcoded de elementos de despesa (`ELEMENTO_LABELS`) deve ser mantido no código runtime TypeScript. As tabelas `dim_elemento_despesa`, `dim_natureza_despesa` e `dim_funcao_subfuncao` servirão como a fonte da verdade padronizada para os modelos de métricas (`fct_posicao_fiscal_metricas`, `fct_analise_despesas_metricas`, `fct_historia_caprem_metricas`, `fct_historia_saude_metricas`).
- **AD-6 (Protocolo de Validação dbt)**: As novas dimensões e seeds serão automaticamente testados durante `make test` através do setup em `elt/conftest.py`, que executa `dbt seed` e `dbt run --vars '{"test_mode": true}'`.
- **Regra de Formatação SQL**: Conforme a regra do repositório, não utilizar alinhamento por espaços extras em aliases `AS` ou colunas. Usar apenas o espaço mínimo necessário.
- **Seeds e Tipagem Kysely**: Seeds de códigos numéricos (ex: elementos `01`, `03`, `13`) devem ser configurados em `seeds.yml` com tipo `string` (VARCHAR) para evitar que o parser CSV interprete `01` como o inteiro `1`.

### Source Documents & References
- **Inventário Fiscais STN/MCASP**: [`_bmad-output/implementation-artifacts/inventario-regras-fiscais-stn-mcasp.md`](file:///Volumes/Projects/transparencia/_bmad-output/implementation-artifacts/inventario-regras-fiscais-stn-mcasp.md) (Especificação completa dos 99 elementos, naturezas e subfunções).
- **Architecture Spine**: [`_bmad-output/planning-artifacts/architecture/architecture-transparencia-2026-08-01/ARCHITECTURE-SPINE.md`](file:///Volumes/Projects/transparencia/_bmad-output/planning-artifacts/architecture/architecture-transparencia-2026-08-01/ARCHITECTURE-SPINE.md)
- **História Anterior (1.1)**: [`_bmad-output/implementation-artifacts/1-1-fase-de-descoberta-e-auditoria-de-regras-fiscais-ocultas-no-typescript.md`](file:///Volumes/Projects/transparencia/_bmad-output/implementation-artifacts/1-1-fase-de-descoberta-e-auditoria-de-regras-fiscais-ocultas-no-typescript.md)
- **Normas Oficiais**: Portaria STN/SOF nº 163/2001, Portaria STN nº 448/2002 (MCASP), e Portaria MOG nº 42/1999.

### Learnings from Previous Story (Story 1.1)
- O levantamento da História 1.1 mapeou todas as regras contábeis ocultas em `@transparencia/db/src/queries/`.
- Elementos críticos identificados em código legado: `13` (Patronal), `46` (Alimentação), `71` (Amortização/Parcelamento), `91` (Precatórios/Sentenças), `97` (Aporte Atuarial).
- Subfunções de saúde auditadas: `10.301` a `10.305`, especial atenção a `10.303` (Assistência Farmacêutica).
- Todos os testes de integração backend (`make test`: 82/82) e TypeScript (`make test/ts`: 14/14) passaram no baseline.

---

## Dev Agent Record

### Agent Model Used
Gemini 3.6 Flash (Medium)

### Debug Log References
- Nenhum erro detectado durante a execução da suíte de testes.

### Completion Notes List
- Arquivo de especificação da História 1.2 criado via `/bmad-create-story`.
- Criadas as dimensões canônicas oficiais STN/MCASP:
  - `dim_elemento_despesa`: seed com 99 elementos normatizados (Portaria STN 448/2002 e STN/SOF 163/2001) e model dbt com contrato de schema e testes de não-nulidade e unicidade.
  - `dim_natureza_despesa`: seed e model dbt com detalhamento de Categoria Econômica, GND e Modalidades de Aplicação (Portaria STN/SOF 163/2001) com contrato de schema.
  - `dim_funcao_subfuncao`: seed e model dbt com totalidade de funções (01 a 28) e subfunções oficiais (Portaria MOG 42/1999) com contrato de schema.
- Atualizado `seeds.yml` garantindo tipagem explícita como `text` para todos os códigos numéricos formatados.
- Validação backend executada com 100% de sucesso via `make test` (82/82 testes aprovados no PostgreSQL efêmero de testes) e `pnpm test` (14/14 testes TypeScript passantes).

### File List

#### Target Files Created / Updated in Implementation:
- `elt/transform/seeds/seed_elemento_despesa.csv` (NEW)
- `elt/transform/seeds/seed_natureza_despesa.csv` (NEW)
- `elt/transform/seeds/seed_funcao_subfuncao.csv` (NEW)
- `elt/transform/seeds/seeds.yml` (UPDATE)
- `elt/transform/models/marts/dim_elemento_despesa.sql` (NEW)
- `elt/transform/models/marts/dim_natureza_despesa.sql` (NEW)
- `elt/transform/models/marts/dim_funcao_subfuncao.sql` (NEW)
- `elt/transform/models/marts/_dim_elemento_despesa.yml` (NEW)
- `elt/transform/models/marts/_dim_natureza_despesa.yml` (NEW)
- `elt/transform/models/marts/_dim_funcao_subfuncao.yml` (NEW)
- `_bmad-output/implementation-artifacts/1-2-modelagem-das-dimensoes-canonicas-fiscais-stnmcasp-no-dbt.md` (UPDATE)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (UPDATE)

### Change Log
- 2026-08-02: Implementação concluída da História 1.2 — Modelagem das dimensões canônicas fiscais (`dim_elemento_despesa`, `dim_natureza_despesa`, `dim_funcao_subfuncao`), declaração de schemas dbt, seeds e validação 100% aprovada em `make test` e `pnpm test`.

---

## Status

**Current Status**: `done`
