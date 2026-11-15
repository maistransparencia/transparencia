---
story_id: 1.1
story_key: 1-1-fase-de-descoberta-e-auditoria-de-regras-fiscais-ocultas-no-typescript
epic_num: 1
status: done
created: 2026-08-02T00:25:46-03:00
updated: 2026-08-02T00:31:05-03:00
baseline_commit: 6a3aa8a7775c812af6377d4a1dc0a80ab919118b
---

# Story 1.1: Fase de Descoberta e Auditoria de Regras Fiscais Ocultas no TypeScript

## Story Description

**As a** data/fiscal architect,
**I want to** audit all legacy TypeScript queries in `@transparencia/db/src/queries/` to catalog all domain-specific filters, element mappings, and hardcoded constants,
**So that** no domain logic or accounting rule is lost during the migration to dbt.

---

## Acceptance Criteria

### Scenario 1: Auditoria e Mapeamento de Regras Fiscais Ocultas
- **Given** as funções leitoras legadas em `@transparencia/db/src/queries/` (ex: `historia_caprem.ts`, `historia_saude.ts`, `posicao_fiscal.ts`, `analise_despesas.ts`, `fontes_receita.ts`, `adesao_de_ata.ts`, `licitacao_gaps.ts`)
- **When** a auditoria de regras contábeis e de-para ocultos for realizada em todo o pacote
- **Then** é gerado um inventário mapeando todas as constantes hardcoded (ex: `CAPREM_CODE = "1061"`, `CASP_CNPJ = "07.573.075/0001-00"`, códigos de elemento `13`, `46`, `71`, `91`, `97`, subfunção `10.303`), joins com credores específicos e fórmulas de cálculo atuarial/saúde.
- **And** cada item do inventário é associado à especificação correspondente nas tabelas oficiais do STN/MCASP (Portaria STN/SOF nº 163/2001 e Portaria STN nº 448/2002).
- **And** [REQUISITO COMPLETO STN/MCASP] O mapeamento das tabelas de dimensões canônicas (`dim_elemento_despesa`, `dim_natureza_despesa`, `dim_funcao_subfuncao`) **deve cobrir exaustivamente a totalidade dos códigos oficiais regulamentados pelo STN/MCASP** (catalogo completo de elementos 01-99, todas as naturezas e funções/subfunções oficiais), e não se limitar aos valores mapeados como constantes no projeto legado.

---

## Tasks & Subtasks

- [x] **Task 1: Varredura de Código Fonte dos Arquivos Legados em `@transparencia/db/src/queries/`**
  - [x] Inspecionar `posicao_fiscal.ts` (cálculo de `saldoEstimado`, `restosPagosNoAno`, `restosPendentesAnteriores`, `topCredoresAdmAtual`).
  - [x] Inspecionar `historia_caprem.ts` (constantes `CAPREM_CODE`, `CASP_CNPJ`, de-para `ELEMENTO_LABELS`, regras de repasse atuarial).
  - [x] Inspecionar `historia_saude.ts` (subfunções `10.303`, regras de judicialização, percentuais de repasse União/Estado/Própria, cálculo HHI).
  - [x] Inspecionar `analise_despesas.ts`, `fontes_receita.ts`, `execucao_orcamentaria.ts` e demais arquivos do diretório.

- [x] **Task 2: Catalogação de Constantes, Mapeamentos de Elementos e Regras Fiscais**
  - [x] Mapear o dicionário `ELEMENTO_LABELS`:
    - `13`: Contribuições Patronais
    - `46`: Auxílio-Alimentação
    - `71`: Principal da Dívida Contratual Resgatado (Parcelamento)
    - `91`: Sentenças Judiciais
    - `97`: Aporte para Cobertura do Déficit Atuarial do RPPS
  - [x] Mapear regras de segregação de restos a pagar por gestão (ano atual vs. anos anteriores).
  - [x] Mapear fórmulas de indicadores atuariais (taxa de adimplência de aporte, rombo patronal não repassado, razão temporários/efetivos).
  - [x] Mapear regras de licitação/adesão a ata e compras em saúde (normalização de modalidades).

- [x] **Task 3: Mapeamento e Correlação com Normas Oficiais STN/MCASP (Catálogo Exaustivo)**
  - [x] Associar os códigos de elemento de despesa à Portaria STN/SOF nº 163/2001 e Portaria STN nº 448/2002.
  - [x] Estruturar a carga completa do catálogo de elementos de despesa (01 a 99) para a dimensão canônica `dim_elemento_despesa`.
  - [x] Estruturar o catálogo completo de Naturezas de Despesa para a dimensão canônica `dim_natureza_despesa`.
  - [x] Estruturar a taxonomia completa de Funções e Subfunções (Portaria MOG nº 42/1999) para a dimensão canônica `dim_funcao_subfuncao`.

- [x] **Task 4: Consolidação do Relatório de Inventário de Regras Fiscais**
  - [x] Documentar o inventário em um artefato estruturado ou especificação técnica de apoio.
  - [x] Garantir que todas as regras identificadas sirvam como requisitos diretos para a modelagem dos modelos dbt na História 1.2 e seguintes.

- [x] **Task 5: Validação da Cobertura de Requisitos**
  - [x] Verificar paridade total entre as regras existentes e o mapeamento STN/MCASP.
  - [x] Executar `make test` e `make test/ts` para garantir que o ambiente baseline está íntegro.

---

## Developer Context & Technical Architecture Guardrails

### Core Invariants
- **AD-1 (SSOT no dbt)**: Nenhuma regra contábil ou constante hardcoded deve permanecer no TypeScript runtime. Toda a lógica auditada nesta história será migrada para dbt Marts e tabelas de dimensões canônicas.
- **AD-5 (Multi-tenant por `portal_slug`)**: Todas as queries auditadas devem ter o isolamento por `portal_slug` mapeado.
- **Conformidade STN/MCASP**: Os elementos e naturezas de despesas devem respeitar a codificação oficial da Secretaria do Tesouro Nacional.

### Arch Spine Alignment
- `dim_elemento_despesa`: conterá o catálogo completo de elementos de despesa regulamentados pela Portaria STN nº 448/2002.
- `dim_natureza_despesa`: conterá Categoria Econômica (1 dígito), Grupo de Natureza (1 dígito), Modalidade de Aplicação (2 dígitos) e Elemento de Despesa (2 dígitos).
- `dim_funcao_subfuncao`: conterá a classificação funcional da Portaria MOG nº 42/1999 (ex: `10` Saúde, `10.303` Suporte Profilático e Terapêutico).

---

## Dev Agent Record

### Implementation Plan
- Realizar varredura sistemática dos 15 arquivos em `packages/db/src/queries/`.
- Extrair todas as constantes, queries brutas SQL com `sql` do Kysely, agregações runtime (`SUM()`, `GROUP BY`, `parseFloat(replace(",", "."))`) e dicionários JS.
- Mapear cada elemento contábil para as tabelas STN/MCASP oficiais.
- Consolidar a documentação de inventário no artefato `inventario-regras-fiscais-stn-mcasp.md`.

### Debug Log
- Todos os testes de validação do ambiente executados com 100% de sucesso (`make test`: 82/82 passed, `make test/ts`: 14/14 passed + tsc).

### Completion Notes
- Auditoria concluída e documentada exaustivamente no artefato `_bmad-output/implementation-artifacts/inventario-regras-fiscais-stn-mcasp.md`.
- Catalogação de todas as regras contábeis ocultas em `@transparencia/db/src/queries/` (15 arquivos leitores).
- Mapeamento exaustivo do catálogo STN/MCASP de elementos (01 a 99), naturezas e classificação funcional MOG nº 42/1999 pronto para ser utilizado na modelagem dbt das histórias subsequentes.

---

## File List

### Modified / Created Files
- `_bmad-output/implementation-artifacts/1-1-fase-de-descoberta-e-auditoria-de-regras-fiscais-ocultas-no-typescript.md`
- `_bmad-output/implementation-artifacts/inventario-regras-fiscais-stn-mcasp.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

---

## Change Log

- **2026-08-02**: Criação do arquivo de especificação da história 1.1 via `/bmad-create-story`.
- **2026-08-02**: Conclusão da auditoria de regras fiscais ocultas e mapeamento exaustivo STN/MCASP. História movida para `review`.

---

## Status

**Current Status**: `done`
