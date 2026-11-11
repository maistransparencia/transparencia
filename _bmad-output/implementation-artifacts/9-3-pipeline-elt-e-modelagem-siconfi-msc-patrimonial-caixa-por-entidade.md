---
baseline_commit: c2db6637978135dde05a9d29c521a24d10cea98f
---

# Story 9.3: Pipeline ELT & Modelagem SICONFI: Extração da MSC Patrimonial e Mart de Disponibilidade de Caixa por Entidade

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a civic researcher, public manager, or citizen seeking audited treasury balances,
I want the ELT pipeline to ingest the official Monthly Accounting Balance Matrix (MSC Patrimonial - Classe 1) directly from the National Treasury Secretariat (STN / SICONFI API) and transform it into a consolidated dbt mart of cash availability by municipal entity (City Hall, Health Fund, Social Assistance Fund, Pension Fund, and City Council),
So that our database can accurately report the true bank and cash balances for each autonomous fund without relying on inaccurate budgetary flow estimates.

---

## Acceptance Criteria

1. **Pipeline de Extração e Ingestão ELT (Python — Regra 5, 15 de `AGENTS.md`):**
   - Criar módulo de extração em `elt/extract/siconfi_msc.py` (ou `elt/extract/porciuncula_prefeitura/siconfi_msc.py`):
     - Consumir o endpoint oficial da STN:
       `https://apidatalake.tesouro.gov.br/ords/siconfi/tt/msc_patrimonial?id_ente={ibge}&an_referencia={ano}&me_referencia={mes}&co_tipo_matriz=MSCC&classe_conta=1&id_tv=ending_balance`
     - Definir cabeçalho descritivo obrigatório `User-Agent: TransparenciaPublica/1.0`.
     - Respeitar rate limit estrito (máximo 1 req/segundo com backoff exponencial).
     - Obter os 12 meses (ou meses disponíveis da competência mais recente) do exercício.
     - Persistir os dados brutos na tabela `raw_porciuncula_prefeitura.siconfi_msc_patrimonial`.
   - **Sincronização de Fontes (`_sources.yml` — Regra 5 de `AGENTS.md`):**
     - Declarar formalmente a tabela `siconfi_msc_patrimonial` em [elt/transform/models/staging/porciuncula_prefeitura/_sources.yml](file:///Volumes/Projects/transparencia/elt/transform/models/staging/porciuncula_prefeitura/_sources.yml) com todas as suas colunas (`ano`, `mes_referencia`, `cod_ibge`, `tipo_matriz`, `classe_conta`, `conta_contabil`, `poder_orgao`, `financeiro_permanente`, `ano_fonte_recursos`, `fonte_recursos`, `valor`, `natureza_conta`, `tipo_valor`, `data_referencia`, `data_extracao`).

2. **Transformação dbt — Staging, Seeds e Mart Canônico (Regras 6, 9, 10, 15 de `AGENTS.md`):**
   - **Exclusão Mandatória da Câmara Municipal (`poder_orgao = '20231'`):**
     - O portal `porciuncula_prefeitura` atende estritamente à transparência do Poder Executivo Municipal e seus fundos.
     - A Câmara Municipal possui autonomia, orçamento e contabilidade próprios; portando, é **estritamente excluída** de qualquer cálculo, agregação ou seed.
   - **Arquitetura Desacoplada em 3 Seeds:**
     1. `seed_porciuncula_prefeitura_orgaos.csv`: Cadastro puro de órgãos locais (`portal_slug,empresa_id,nome,cnpj`).
     2. `seed_fontes_recursos_stn.csv`: Catálogo nacional oficial de fontes (Portaria STN nº 710/2021) (`codigo_fonte,descricao,grupo_destinacao,recurso_vinculado_flag`).
     3. `seed_porciuncula_prefeitura_siconfi_orgaos.csv`: Tabela de-para por portal associando `(portal_slug, poder_orgao, grupo_destinacao) -> empresa_id`.
   - **Staging (`stg_siconfi_msc_patrimonial.sql`):**
     - Ler de `source('porciuncula_prefeitura', 'siconfi_msc_patrimonial')`.
     - Filtrar apenas contas de Ativo Financeiro de Caixa e Bancos:
       - `classe_conta = 1`
       - `conta_contabil like '111%'` (Caixa Geral `11111.01`, Bancos Conta Movimento `11111.02`, Aplicações Imediatas `11111.06`/`11111.50`)
       - `financeiro_permanente = 1`
       - `tipo_valor = 'ending_balance'`
       - `poder_orgao != '20231'` (exclusão definitiva da Câmara Municipal)
     - Ajustar o sinal contábil:
       `case when natureza_conta = 'C' then -valor else valor end as saldo_valor`.
   - **Mart (`fct_saldo_caixa_siconfi.sql`):**
     - Cruzar `stg_siconfi_msc_patrimonial` com `seed_fontes_recursos_stn`.
     - Agregar por `cod_ibge`, `ano`, `mes_referencia`, `poder_orgao`, `grupo_destinacao`.
     - Associar com `seed_porciuncula_prefeitura_siconfi_orgaos` e `dim_orgao`:
       - Para `poder_orgao = '10131'` (Executivo), associar ao órgão correspondente via `vinculos.empresa_id`.
       - Para `poder_orgao = '10132'`, associar à CAPREM (RPPS).
       - Nenhuma linha ou agrupamento para a Câmara Municipal (`20231`).
     - Colunas do Mart:
       - `saldo_caixa_id` (PK surrogate key).
       - `portal_slug`, `cod_ibge`, `ano`, `mes_referencia`, `poder_orgao`.
       - `empresa_id`, `orgao_id`, `orgao_nome`, `entidade_nome`, `entidade_slug`, `cnpj`, `grupo_destinacao`.
       - `saldo_caixa_bancos`: soma de `saldo_valor`.
       - `saldo_recursos_livres`: soma de `saldo_valor` para fontes livres.
       - `saldo_recursos_vinculados`: soma de `saldo_valor` para fontes vinculadas.
       - `data_referencia`: data de encerramento da competência mensal.
       - `ultima_competencia_flag`: boolean indicando se é a competência mais recente do exercício.
     - Formatação SQL estrita conforme Regra 6 (sem alinhamento por espaços).

3. **Camada de Dados `@transparencia/db` — Leitor de Métricas Kysely (Regras 2 e 9 de `AGENTS.md`):**
   - Criar `packages/db/src/queries/siconfi-caixa-metrics.ts`:
     - Definir e exportar os DTOs tipados:
       ```ts
       export interface EntidadeSaldoCaixaDTO {
         poderOrgao: string;
         entidadeSlug: string | null;
         entidadeNome: string | null;
         cnpj: string | null;
         empresaId: string | null;
         grupoDestinacao: string;
         saldoCaixaBancos: number;
         saldoRecursosLivres: number;
         saldoRecursosVinculados: number;
         mesReferencia: number;
         dataReferencia: string;
       }

       export interface SiconfiPosicaoFinanceiraDTO {
         portalSlug: string;
         ano: number;
         mesMaisRecente: number;
         dataHomologacao: string;
         totalCaixaGeral: number;
         totalRecursosLivres: number;
         totalRecursosVinculados: number;
         entidades: EntidadeSaldoCaixaDTO[];
       }
       ```
     - Implementar query Kysely `getSiconfiPosicaoFinanceira(portalSlug: string, ano: number, mes?: number)` usando programação funcional imutável (`.map`, `.reduce`).
     - Exportar a query e DTOs no `packages/db/src/index.ts`.

4. **Isolamento de Testes e Mocking (Regra 5 e 15 de `AGENTS.md`):**
   - A suíte de testes Python (`make test`) não deve efetuar chamadas HTTP externas à STN.
   - Criar fixture/mock com payload representativo da MSC de Porciúncula em `elt/tests/fixtures/siconfi_msc_fixture.json`.
   - Testes de integração dbt validando agregação e reconciliação dos saldos por órgão e fonte.
   - Testes unitários em `packages/db/src/queries/__tests__/siconfi-caixa-metrics.spec.ts`.
   - 100% verde em `make test`, `make test/ts`, `make check`.

---

## Tasks / Subtasks

- [x] Task 1: Especificar schema e extrator SICONFI MSC (AC: 1, 4)
  - [x] Subtask 1.1: Atualizar [elt/transform/models/staging/porciuncula_prefeitura/_sources.yml](file:///Volumes/Projects/transparencia/elt/transform/models/staging/porciuncula_prefeitura/_sources.yml) com a tabela `siconfi_msc_patrimonial`.
  - [x] Subtask 1.2: Criar extrator Python em `elt/extract/siconfi_msc.py` com paginação, backoff exponencial, conversão segura de tipos (`_safe_int`, `_safe_float`) e suporte a CLI.
  - [x] Subtask 1.3: Criar fixture de teste e testes unitários do extrator em `elt/extract/__tests__/test_siconfi_msc.py`.
  - [x] Subtask 1.4: Integrar extração ao runner unificado (`elt/extract/run.py` e `elt/load/run.py`) e adicionar comando dedicado `make elt/siconfi`.

- [x] Task 2: Implementar modelos dbt de Staging, Seeds e Mart Reconciliado (AC: 2, 4)
  - [x] Subtask 2.1: Criar modelo de staging `elt/transform/models/staging/porciuncula_prefeitura/stg_siconfi_msc_patrimonial.sql` com filtro excluindo a Câmara Municipal (`poder_orgao != '20231'`).
  - [x] Subtask 2.2: Criar seed nacional de fontes STN `elt/transform/seeds/seed_fontes_recursos_stn.csv` e declarar no `seeds.yml`.
  - [x] Subtask 2.3: Criar seed de vínculo `elt/transform/seeds/seed_porciuncula_prefeitura_siconfi_orgaos.csv` mapeando grupos de destinação e poder_orgao aos órgãos municipais de `dim_orgao`.
  - [x] Subtask 2.4: Atualizar mart `elt/transform/models/marts/financeiro/fct_saldo_caixa_siconfi.sql` e schema `_fct_saldo_caixa_siconfi.yml` com reconciliação contábil por fonte sem inclusão da Câmara Municipal.
  - [x] Subtask 2.5: Atualizar testes de integração dbt em `elt/analytics/__tests__/test_saldo_caixa_siconfi.py` e rodar `make test`.

- [x] Task 3: Implementar consultas Kysely no `@transparencia/db` (AC: 3, 4)
  - [x] Subtask 3.1: Criar `packages/db/src/queries/siconfi-caixa-metrics.ts` com DTOs e função funcional `getSiconfiPosicaoFinanceira`.
  - [x] Subtask 3.2: Exportar novo leitor no `packages/db/src/index.ts`.
  - [x] Subtask 3.3: Adicionar helpers em `packages/db/tests/fixtures/seed.ts` e testes unitários em `packages/db/src/queries/__tests__/siconfi-caixa-metrics.spec.ts`.

- [x] Task 4: Validação geral de qualidade
  - [x] Subtask 4.1: Executar `make test`, `make test/ts` e `make check`.

### Review Findings

- [x] [Review][Decision] Mapeamento de CAPREM nos seeds de órgãos e vínculos — Decisão do usuário: manter fora do seed de órgãos da prefeitura para não poluir o dropdown da prefeitura; tratado de forma dedicada no mart com nome oficial e CNPJ para a página da CAPREM.
- [x] [Review][Decision] Coluna entidade_slug — Decisão do usuário: mantida fora por ausência de caso de uso específico.
- [x] [Review][Patch] Correção do sombreamento no CASE de classificação de fontes da STN (posicionar '166%' antes de '16%') [elt/transform/models/marts/financeiro/fct_saldo_caixa_siconfi.sql:22-24]
- [x] [Review][Patch] Documentar grão real da surrogate key [elt/transform/models/marts/financeiro/_fct_saldo_caixa_siconfi.yml:8]
- [x] [Review][Patch] Ajustar tipagem de entidadeNome para string | null no DTO [packages/db/src/queries/siconfi-caixa-metrics.ts:3-14]
- [x] [Review][Patch] Remover sanitização redundante e simplificar atribuição de entidadeNome no Kysely reader [packages/db/src/queries/siconfi-caixa-metrics.ts:67]
- [x] [Review][Patch] Validação segura do parâmetro mes (inteiro de 1 a 12) [packages/db/src/queries/siconfi-caixa-metrics.ts:31]
- [x] [Review][Patch] Remover condicional CASE tautológica em portal_slug conforme Regra 14 de AGENTS.md [elt/transform/models/marts/financeiro/fct_saldo_caixa_siconfi.sql:46-49]
- [x] [Review][Patch] Corrigir alinhamento de espaços em cláusulas SQL conforme Regra 6 de AGENTS.md [elt/transform/models/marts/financeiro/fct_saldo_caixa_siconfi.sql:106-108]
- [x] [Review][Patch] Remover pre-hook de extensão unaccent não utilizada no mart [elt/transform/models/marts/financeiro/fct_saldo_caixa_siconfi.sql:1]
- [x] [Review][Patch] Corrigir fontes de Meio Ambiente no SQL fallback retirando fonte 1751 [elt/transform/models/marts/financeiro/fct_saldo_caixa_siconfi.sql:25]
- [x] [Review][Patch] Usar time.monotonic() em vez de time.time() no rate limiter da STN [elt/extract/siconfi_msc.py:57, 96]

---

## Dev Notes

- **Normas Contábeis da STN (Portaria STN nº 710/2021 e MCASP):**
  - O SICONFI consolida o Poder Executivo municipal no código `poder_orgao = '10131'`. Não existem códigos separados de `poder_orgao` para fundos sem autonomia política (como FMS e FMAS).
  - A segregação orçamentária e financeira dos Fundos Municipais é legalmente definida pela **Fonte de Recursos** vinculada às contas do Ativo Disponível (`111110200`).
  - Fontes `1500` / `10010000`: Recursos Ordinários Livres (Prefeitura).
  - Fontes `1501`, `1600` a `1635`, `12110000`: Fundo Municipal de Saúde (FMS).
  - Fontes `1660` a `1669`: Fundo Municipal de Assistência Social (FMAS).
  - Fontes `1540` a `1553`, `11110000`: Fundo Municipal de Educação (FME).
  - Fontes `1750` a `1755`: Fundo Municipal de Defesa Ambiental.
  - Fontes `1800` a `1869`, `2800` a `2802` e `poder_orgao = '10132'`: Previdência Própria (CAPREM).
  - `poder_orgao = '20231'`: Câmara Municipal de Porciúncula (excluída de qualquer cálculo/seed).
- **Valores Nulos no Banco:** Órgãos que não possuírem correspondência no SICONFI mantêm campos com `NULL` (nunca strings `'N/D'`). A camada de UI é responsável pelo fallback visual para `'N/D'`.

---

## Dev Agent Record

### Implementation Plan
- Task 1: Mapear esquema raw da tabela `siconfi_msc_patrimonial` em `_sources.yml`, implementar `SiconfiMscExtractor` com controle de taxa, retries, normalização segura e CLI, integrar ao runner unificado e Makefile.
- Task 2: Criar seed nacional de fontes STN (`seed_fontes_recursos_stn.csv`), seed de de-para por portal (`seed_porciuncula_prefeitura_siconfi_orgaos.csv`), reconciliar saldos no mart `fct_saldo_caixa_siconfi.sql` excluindo expressamente a Câmara Municipal (`20231`) e validar com testes de integração.
- Task 3: Implementar queries tipadas Kysely em `packages/db` (`getSiconfiPosicaoFinanceira`) com programação funcional imutável (`.map`, `.reduce`), helpers de seed e testes unitários.
- Task 4: Executar validações finais (`make test`, `make test/ts`, `make check`).

### Completion Notes
- ✅ Task 1 concluída:
  - Declarada tabela `siconfi_msc_patrimonial` em `_sources.yml` com todas as 15 colunas especificadas no AC 1.
  - Implementado `SiconfiMscExtractor` em `elt/extract/siconfi_msc.py` com `User-Agent: TransparenciaPublica/1.0`, paginação, backoff exponencial contra HTTP 429/5xx, normalização com `_safe_int`/`_safe_float` resiliente a `None`, função de carga `load_siconfi_msc` e CLI com flags `--portal`, `--years`, `--raw-only`, `--load-only`, `--dir`.
  - Integrada extração SICONFI no runner unificado de extração (`elt/extract/run.py`), no carregador (`elt/load/run.py`) e adicionado comando dedicado `make elt/siconfi` no `Makefile`.
  - Suíte de testes unitários e de integração em `elt/extract/__tests__/test_siconfi_msc.py` (12 testes passando).
- ✅ Task 2 concluída:
  - Criado seed nacional `seed_fontes_recursos_stn.csv` com 97 códigos oficiais da STN categorizados.
  - Criado seed local `seed_porciuncula_prefeitura_siconfi_orgaos.csv` mapeando vínculos contábeis para `dim_orgao`.
  - Staging `stg_siconfi_msc_patrimonial.sql` e mart `fct_saldo_caixa_siconfi.sql` implementados com filtragem definitiva da Câmara Municipal (`poder_orgao != '20231'`).
  - Testes de integração em `elt/analytics/__tests__/test_saldo_caixa_siconfi.py` passando e validando ausência de registros da Câmara e agregação por fonte.
- ✅ Task 3 concluída:
  - Implementado `packages/db/src/queries/siconfi-caixa-metrics.ts` com DTOs camelCase e estilo funcional imutável (`.map`, `.reduce`).
  - Exportado em `packages/db/src/index.ts`.
  - Adicionado helper `seedSaldoCaixaSiconfi` e cleanup em `packages/db/tests/fixtures/seed.ts`.
  - Testes unitários em `packages/db/src/queries/__tests__/siconfi-caixa-metrics.spec.ts` cobrindo comportamento padrão (última competência), filtro por mês, ausência de dados e ausência da Câmara Municipal.
- ✅ Task 4 concluída:
  - `make test`: 96/96 testes passando (Python / dbt / ELT).
  - `make check`: 100% aprovado (ruff check, ruff format, mypy sem erros).
  - `make test/ts`: 5/5 tarefas passando (264 testes web, 58 testes db).

---

## File List

- `elt/transform/models/staging/porciuncula_prefeitura/_sources.yml` (modificado)
- `elt/extract/siconfi_msc.py` (novo)
- `elt/extract/__tests__/test_siconfi_msc.py` (novo)
- `elt/tests/fixtures/siconfi_msc_fixture.json` (novo)
- `elt/transform/models/staging/porciuncula_prefeitura/stg_siconfi_msc_patrimonial.sql` (novo)
- `elt/transform/models/staging/porciuncula_prefeitura/_stg_siconfi_msc_patrimonial.yml` (novo)
- `elt/transform/models/marts/financeiro/fct_saldo_caixa_siconfi.sql` (novo)
- `elt/transform/models/marts/financeiro/_fct_saldo_caixa_siconfi.yml` (novo)
- `elt/transform/models/marts/dim_orgao.sql` (modificado)
- `elt/transform/models/marts/_dim_orgao.yml` (modificado)
- `elt/transform/seeds/seed_fontes_recursos_stn.csv` (novo)
- `elt/transform/seeds/seed_porciuncula_prefeitura_siconfi_orgaos.csv` (novo)
- `elt/transform/seeds/seed_porciuncula_prefeitura_orgaos.csv` (modificado)
- `elt/transform/seeds/seeds.yml` (modificado)
- `elt/analytics/__tests__/test_saldo_caixa_siconfi.py` (novo)
- `elt/conftest.py` (modificado)
- `elt/extract/run.py` (modificado)
- `elt/load/run.py` (modificado)
- `elt/core/config.py` (modificado)
- `elt/portals/porciuncula_prefeitura.yml` (modificado)
- `Makefile` (modificado)
- `packages/db/src/queries/siconfi-caixa-metrics.ts` (novo)
- `packages/db/src/queries/__tests__/siconfi-caixa-metrics.spec.ts` (novo)
- `packages/db/src/index.ts` (modificado)
- `packages/db/tests/fixtures/seed.ts` (modificado)
- `packages/db/tests/fixtures/schema.sql.gz` (modificado)
- `_bmad-output/implementation-artifacts/9-3-pipeline-elt-e-modelagem-siconfi-msc-patrimonial-caixa-por-entidade.md` (modificado)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modificado)

---

## Change Log

- 2026-09-06: Implementação da Task 1 (schema `siconfi_msc_patrimonial`, extrator resiliente `siconfi_msc.py`, CLI, integração ao runner unificado, target `elt/siconfi` e testes).
- 2026-09-06: Descoberta contábil da consolidação da MSC do Executivo sob `10131` e redefinição da arquitetura para reconciliação via Seed Nacional de Fontes STN (Portaria 710/2021).
- 2026-09-06: Exclusão mandatória da Câmara Municipal (20231) de todos os cálculos e seeds contábeis do portal do Executivo.


