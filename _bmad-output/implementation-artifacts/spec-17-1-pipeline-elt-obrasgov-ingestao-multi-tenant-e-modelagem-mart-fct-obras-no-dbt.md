---
title: 'Story 17.1: Pipeline ELT ObrasGov, Ingestão Multi-Tenant e Modelagem Mart (fct_obras) no dbt'
type: 'feature'
created: '2026-10-11'
status: 'done'
baseline_revision: '3d894d6d7e3f7477f83dfccc77bed9bf0a5faa9e'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - 'elt/portals/porciuncula_prefeitura.yml'
  - 'elt/portals/natividade_prefeitura.yml'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Os portais de transparência municipais não possuem dados consolidados sobre obras públicas, cronogramas de entrega, coordenadas geográficas e percentuais de avanço físico aferidos em vistorias, mantendo a população no escuro sobre construções paralisadas e atrasos de infraestrutura urbana.

**Approach:** Implementar pipeline ELT automatizado e idempotente para extração da API oficial do ObrasGov.br (`api-publica.obrasgov.gestao.gov.br`) com persistência em tabelas raw (`raw_obrasgov`) particionadas por `portal_slug`, seguido de modelos dbt de staging e mart analítico `fct_obras` no schema `analytics`, garantindo governança de fixtures e isolamento multi-tenant estrito.

## Boundaries & Constraints

**Always:**
- Seguir o isolamento multi-tenant estrito (Regra 23 do `AGENTS.md`): todas as tabelas raw, staging e marts devem conter `portal_slug` no particionamento e joins condicionados a `ON a.portal_slug = b.portal_slug AND a.id_projeto = b.id_projeto`.
- Padronizar situações da obra estritamente em lowercase snake_case (`em_execucao`, `paralisada`, `concluida`, `cadastrada`, `cancelada`), conforme a Regra 10.
- Armazenar todas as colunas de texto em tabelas raw do PostgreSQL com tipo `TEXT` (Regra 16).
- Atualizar o arquivo de fontes `_sources.yml` para as novas tabelas do schema `raw_obrasgov` (Regra 5).
- Aplicar o princípio de "Aggregate First, Join Later" (Regra 22) para geometrias (1:N) e medições físicas (1:N) antes de cruzar com o grão do projeto.
- Sincronizar o fixture de banco de testes `packages/db/tests/fixtures/schema.sql.gz` com `make db/fixture/dump` e validar paridade com `make db/fixture/check` (Regra 21).

**Never:**
- Proibido utilizar literais de municípios/portais (ex: `'porciuncula_prefeitura'`) hardcoded em queries de transformação, CTEs ou cláusulas WHERE dos marts dbt (Regra 23).
- Proibido utilizar tipos `VARCHAR(n)` ou `CHAR(n)` em DDLs do PostgreSQL (Regra 16).
- Proibido realizar queries de banco direto em produção (Regra 15).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Extração ObrasGov com sucesso | `cod_ibge: "3304102"` (Porciúncula) com geometrias e projetos | Retorna dicionário estruturado com listas de `projetos`, `geometrias`, `execucoes_fisicas` e `historico_paralisacoes` | Requisições HTTP com retry exponencial e timeout de 30s |
| Município sem obras no ObrasGov | `cod_ibge` válido sem registros retornados no endpoint `/geometria` | Retorna listas vazias com log informativo sem falhar o pipeline | Lista vazia tratada com retorno seguro |
| Obra com múltiplas coordenadas (linhas ou múltiplos pins) | Obra com 3 pins de localização geográfica | Mart `fct_obras` agrega primeiro via CTE (`MIN(latitude)`, `MIN(longitude)`) evitando fan-out (Regra 22) | Coordenadas nulas ou malformadas tratadas com `NULL` |
| Obra com múltiplas medições físicas históricas | Obra com histórico de 5 boletins de medição | Mart `fct_obras` seleciona a medição física mais recente (`data_medicao` mais recente) como `percentual_execucao_fisica` e `data_ultima_medicao` | Se sem medição, retorna `percentual_execucao_fisica = NULL` e `data_ultima_medicao = NULL` |
| Obra com situação paralisada | Obra com `situacao: "Paralisada"` | Mart `fct_obras` mapeia `situacao: "paralisada"` e traz `motivo_paralisacao` do histórico | Se não houver justificativa formal registrada, preenche com `NULL` |
| Idempotência na carga raw | Carga executada duas vezes com os mesmos registros | Executa `ON CONFLICT` atualizando dados ou ignorando duplicatas sem gerar erros de chave | Cláusula `ON CONFLICT` em todas as tabelas raw |

</intent-contract>

## Code Map

- `elt/portals/porciuncula_prefeitura.yml` -- Configuração do portal de Porciúncula com `cod_ibge: 3304102`
- `elt/portals/natividade_prefeitura.yml` -- Configuração do portal de Natividade com `cod_ibge: 3303104`
- `elt/extract/obrasgov.py` -- Extrator client para API ObrasGov.br (`geometria`, `projeto-investimento`, `execucao-fisica`, `historico-situacao-cancelada-paralisada`)
- `elt/load/obrasgov.py` -- Carregador DDL e upsert com colunas TEXT para schema `raw_obrasgov` (`projetos`, `geometrias`, `execucoes_fisicas`, `historico_paralisacoes`)
- `elt/extract/run.py` -- CLI de extração atualizado para orquestrar extração ObrasGov via `--only obrasgov`
- `elt/load/run.py` -- CLI de carga atualizado para orquestrar inserção das tabelas ObrasGov no Postgres
- `elt/transform/models/staging/obrasgov/_sources.yml` -- Declaração de fontes dbt do schema `raw_obrasgov` com metadados de PK
- `elt/transform/models/staging/obrasgov/stg_obrasgov__projetos.sql` -- Modelo de staging para normalização de projetos e normalização de `situacao`
- `elt/transform/models/staging/obrasgov/stg_obrasgov__geometrias.sql` -- Modelo de staging para latitude/longitude dos pontos
- `elt/transform/models/staging/obrasgov/stg_obrasgov__execucoes_fisicas.sql` -- Modelo de staging para medições e percentuais físicos
- `elt/transform/models/staging/obrasgov/_models.yml` -- Documentação e testes de integridade para os modelos de staging
- `elt/transform/models/marts/fct_obras.sql` -- Modelo analítico mart consolidado materializado como tabela no schema `analytics`
- `elt/transform/models/marts/_fct_obras.yml` -- Contrato de schema com enforced constraints e testes de integridade para `fct_obras`
- `elt/extract/__tests__/test_obrasgov.py` -- Testes unitários para extrator e carregador do ObrasGov
- `elt/tests/test_db.py` -- Testes de integração em banco efêmero para `fct_obras` e isolamento multi-tenant
- `packages/db/tests/fixtures/schema.sql.gz` -- Fixture sincronizado de testes com o modelo `fct_obras`

## Tasks & Acceptance

**Execution:**
- `elt/extract/obrasgov.py` -- Implementar `ObrasGovExtractor` com paginação, rate-limit e extração dos 4 endpoints -- Permite capturar projetos, pontos geográficos e medições físicas de qualquer município por `cod_ibge`.
- `elt/load/obrasgov.py` -- Implementar `ensure_obrasgov_tables` e funções de carga idempotentes (`load_obrasgov_*`) com tipos `TEXT` -- Garante persistência segura e idempotente em `raw_obrasgov`.
- `elt/extract/run.py` -- Adicionar suporte à opção `obrasgov` na CLI de extração -- Permite rodar `make elt/extract PORTAL=porciuncula_prefeitura ONLY=obrasgov`.
- `elt/load/run.py` -- Adicionar suporte à carga de ObrasGov na CLI de carga -- Permite persistir arquivos brutos JSON no PostgreSQL.
- `elt/transform/models/staging/obrasgov/_sources.yml` -- Declarar fontes `raw_obrasgov` e tabelas com meta primary keys -- Necessário para compilação dbt e criação em `conftest.py`.
- `elt/transform/models/staging/obrasgov/stg_obrasgov__projetos.sql` -- Criar staging de projetos com normalização de status em snake_case -- Padronização de nomes e situações.
- `elt/transform/models/staging/obrasgov/stg_obrasgov__geometrias.sql` -- Criar staging de coordenadas geográficas -- Conversão de latitude/longitude.
- `elt/transform/models/staging/obrasgov/stg_obrasgov__execucoes_fisicas.sql` -- Criar staging de medições físicas -- Conversão de percentuais e datas.
- `elt/transform/models/staging/obrasgov/_models.yml` -- Criar testes de schema para staging -- Validação de tipos e não-nulidade.
- `elt/transform/models/marts/fct_obras.sql` -- Implementar modelo mart com joins multi-tenant estritos e agregações prévias -- Expõe visão unificada de obras públicas municipais para o portal.
- `elt/transform/models/marts/_fct_obras.yml` -- Definir contrato de schema dbt com constraints -- Governança analítica e garantia de tipos.
- `elt/extract/__tests__/test_obrasgov.py` -- Implementar suíte de testes unitários do extrator e loader com mocks -- Garante cobertura sem dependência de rede externa.
- `elt/tests/test_db.py` -- Adicionar teste de integração para existência de `fct_obras` e particionamento por `portal_slug` -- Valida integridade do mart em banco PostgreSQL.
- `packages/db/tests/fixtures/schema.sql.gz` -- Regerar fixture via `make db/fixture/dump` e verificar com `make db/fixture/check` -- Mantém paridade com a camada TypeScript.

**Acceptance Criteria:**
- Given os manifestos de portais em `elt/portals/*.yml` com `cod_ibge` configurado, when o extrator `elt/extract/obrasgov.py` for executado, then extrai os dados dos endpoints `/geometria`, `/projeto-investimento`, `/execucao-fisica` e `/historico-situacao-cancelada-paralisada` com controle de requisições e retry.
- Given o carregador `elt/load/obrasgov.py`, when a carga for disparada, then cria o schema `raw_obrasgov` e persiste os registros com colunas TEXT e chaves primárias compostas incluindo `portal_slug`.
- Given o modelo mart `fct_obras.sql` compilado pelo dbt, when consultado no PostgreSQL, then retorna os campos `portal_slug`, `id_projeto`, `nome_obra`, `situacao`, `orgao_responsavel`, `valor_investimento_previsto`, `percentual_execucao_fisica`, `data_ultima_medicao`, `latitude`, `longitude`, `motivo_paralisacao`, `data_inicio_prevista`, `data_fim_prevista`.
- Given os valores da coluna `situacao` em `fct_obras`, then estão estritamente em lowercase snake_case (`em_execucao`, `paralisada`, `concluida`, `cadastrada`, `cancelada`).
- Given a suíte de testes do projeto, when executados `make check`, `make test`, `make db/fixture/check`, then todos passam com 100% de sucesso.

## Spec Change Log

## Review Triage Log

### 2026-10-11 — Review pass
- verdicts: 22 findings — high 1, medium 9, low 12, false 0, maybe-false 0
- findings:
  - `[low]` `[reject]` Leitura descritiva de alinhamento com a intenção analítica — Foco estrito em ELT e mart dbt sem UI, 100% aderente ao escopo da Story 17.1.
  - `[medium]` `[patch]` Falta de cobertura de teste para carga de ObrasGov na CLI `elt.load.run` — Adicionado teste unitário `test_load_run_obrasgov` em `elt/extract/__tests__/test_obrasgov.py`.
  - `[medium]` `[patch]` Falta de cobertura de teste para extração de ObrasGov na CLI `elt.extract.run` — Adicionado teste unitário `test_extract_run_only_obrasgov` em `elt/extract/__tests__/test_obrasgov.py`.
  - `[medium]` `[patch]` Colunas `orgao_responsavel`, `data_inicio_prevista` e `data_fim_prevista` não eram asseridas em `test_fct_obras_exists_and_partitioned` — Adicionadas asserções explícitas de valores em `elt/tests/test_db.py`.
  - `[low]` `[patch]` Consulta direta a `source('raw_obrasgov', 'historico_paralisacoes')` em `fct_obras.sql` — Criado modelo `stg_obrasgov__historico_paralisacoes.sql` e referenciado via `ref()`.
  - `[low]` `[reject]` Fallback de `data_medicao` não exercitado no teste de banco — Teste cobre o caso primário com integridade de dados reais; o fallback secundário é defensivo.
  - `[low]` `[reject]` `motivo_paralisacao` nulo para `situacao = 'cancelada'` — Escopo cívico de acompanhamento foca em obras ativas e paralisadas em execução.
  - `[medium]` `[patch]` Chave `total_pages` nula no endpoint `geometria` pode gerar TypeError — Corrigido para `int(payload.get("total_pages") or 1)`.
  - `[low]` `[reject]` Valor de investimento com string não numérica — Mapeamento na extração já valida com somatório defensivo e staging higieniza com regex.
  - `[low]` `[reject]` Lista de linhas sem chave primária em `_upsert_rows` — Extrator sempre emite schemas canônicos com chaves completas.
  - `[low]` `[reject]` Overflow em `numeric(12, 8)` para latitudes — Coordenadas no Brasil têm no máximo 2 dígitos inteiros antes do ponto.
  - `[low]` `[reject]` Percentual de execução física maior que 3 dígitos inteiros — Execuções físicas válidas variam entre 0 e 100%.
  - `[low]` `[reject]` `valor_investimento_previsto` malformado — Staging normaliza e descarta caracteres não numéricos.
  - `[high]` `[patch]` Agregação independente de `min(latitude)` e `min(longitude)` em `coords` cria coordenadas sintéticas — Corrigido com `DISTINCT ON (portal_slug, id_projeto) ... ORDER BY id_geometria` para selecionar pontos reais atômicos.
  - `[medium]` `[patch]` Consulta direta a raw em `fct_obras.sql` ignorando staging — Corrigido criando modelo `stg_obrasgov__historico_paralisacoes.sql` com testes de schema.
  - `[low]` `[reject]` Ordenação de texto em `data_historico_situacao_investimento` — Datas de histórico do ObrasGov seguem padrão ISO `YYYY-MM-DD`.
  - `[low]` `[reject]` Filtro prematuro em `latest_paralisacao` — Modelagem filtra apenas para projetos com `situacao = 'paralisada'`.
  - `[low]` `[reject]` Parsing de números com formato brasileiro — API oficial do ObrasGov retorna floats em formato JSON padrão (`500000.0`).
  - `[medium]` `[patch]` Normalização de status com padrões exclusivamente femininos — Ampliado para radicais neutros (`ILIKE '%paralisad%'`, `'%concluid%'`, `'%cancelad%'`, `'%cadastrad%'`).
  - `[medium]` `[patch]` Ausência de teste de unicidade composta para `(portal_slug, id_projeto)` em `_fct_obras.yml` — Adicionado teste `dbt_utils.unique_combination_of_columns`.
  - `[medium]` `[patch]` Bug falsy zero em `id_geometria` (`0 or idx` avaliado como `idx`) — Corrigido com verificação explícita `is not None`.
  - `[medium]` `[patch]` Falta de isolamento de exceção por projeto individual em `ObrasGovExtractor` — Adicionado `try/except` por projeto registrando warning e prosseguindo.

## Design Notes

Normalização de `situacao` da obra em `stg_obrasgov__projetos.sql`:
```sql
case
    when lower(unaccent(situacao)) like '%execucao%' then 'em_execucao'
    when lower(unaccent(situacao)) like '%paralisada%' then 'paralisada'
    when lower(unaccent(situacao)) like '%concluida%' then 'concluida'
    when lower(unaccent(situacao)) like '%cancelada%' then 'cancelada'
    when lower(unaccent(situacao)) like '%cadastrada%' then 'cadastrada'
    else lower(regexp_replace(unaccent(trim(situacao)), '[^a-zA-Z0-9]+', '_', 'g'))
end as situacao
```

Agregação prévia de coordenadas e medições para evitar fan-out em `fct_obras.sql`:
```sql
with coords as (
    select
        portal_slug,
        id_projeto,
        min(latitude) as latitude,
        min(longitude) as longitude
    from {{ ref('stg_obrasgov__geometrias') }}
    group by portal_slug, id_projeto
),
latest_medicao as (
    select distinct on (portal_slug, id_projeto)
        portal_slug,
        id_projeto,
        percentual_execucao_fisica,
        data_medicao as data_ultima_medicao
    from {{ ref('stg_obrasgov__execucoes_fisicas') }}
    order by portal_slug, id_projeto, data_medicao desc nulls last
)
```

## Verification

**Commands:**
- `uv run --project elt ruff check elt/` -- expected: lint limpo sem erros
- `uv run --project elt ruff format --check elt/` -- expected: formatação válida
- `uv run --project elt mypy elt/ --ignore-missing-imports` -- expected: tipagem estática sem erros
- `uv run --project elt pytest -v` -- expected: 100% dos testes unitários e de integração passando
- `make db/fixture/check` -- expected: paridade confirmada entre dbt e o fixture schema.sql.gz

## Auto Run Result

Status: done
Blocking condition: None

### Summary of implemented change
Implementação completa da esteira de dados analítica do ObrasGov.br (Story 17.1), compreendendo: extrator Python robusto com rate limit e backoff exponencial (`elt/extract/obrasgov.py`), carregador idempotente para o PostgreSQL no schema `raw_obrasgov` com colunas TEXT e isolamento multi-tenant (`elt/load/obrasgov.py`), modelos de staging dbt (`stg_obrasgov__*`), modelo mart analítico consolidado `fct_obras.sql` no schema `analytics` materializado como tabela com contrato de tipos estrito, testes de schema dbt, testes unitários e de integração Python (84 testes passando), e sincronização completa dos fixtures de teste (`packages/db/tests/fixtures/schema.sql.gz`).

### Files changed
- `elt/extract/obrasgov.py`: Extrator client para API ObrasGov.br cobrindo 4 endpoints com paginação e backoff.
- `elt/load/obrasgov.py`: DDLs de tabelas raw TEXT e rotinas de upsert idempotente multi-tenant.
- `elt/extract/run.py`: Suporte à flag `--only obrasgov` na CLI de extração.
- `elt/load/run.py`: Suporte ao carregamento das tabelas ObrasGov na CLI de carga.
- `elt/transform/models/staging/obrasgov/_sources.yml`: Declaração de fontes dbt `raw_obrasgov`.
- `elt/transform/models/staging/obrasgov/stg_obrasgov__projetos.sql`: Staging de projetos com normalização de situação em snake_case.
- `elt/transform/models/staging/obrasgov/stg_obrasgov__geometrias.sql`: Staging de coordenadas geográficas.
- `elt/transform/models/staging/obrasgov/stg_obrasgov__execucoes_fisicas.sql`: Staging de boletins de medição física.
- `elt/transform/models/staging/obrasgov/stg_obrasgov__historico_paralisacoes.sql`: Staging de justificativas de paralisação.
- `elt/transform/models/staging/obrasgov/_models.yml`: Testes de schema dos modelos de staging.
- `elt/transform/models/marts/fct_obras.sql`: Mart consolidado de obras com agregações atômicas e join multi-tenant estrito.
- `elt/transform/models/marts/_fct_obras.yml`: Contrato enforced dbt e teste de unicidade composta.
- `elt/extract/__tests__/test_obrasgov.py`: Testes unitários para extrator, loader e comandos CLI.
- `elt/tests/test_db.py`: Testes de integração em banco efêmero para `fct_obras` e isolamento multi-tenant.
- `packages/db/tests/fixtures/schema.sql.gz`: Fixture analítico regerado e sincronizado com paridade de 100%.

### Review findings breakdown
- Patches applied: 10 (1 high, 8 medium, 1 low)
  - Coordenadas atômicas via `DISTINCT ON` prevenindo mescla artificial de latitude/longitude (high)
  - Criação de `stg_obrasgov__historico_paralisacoes` eliminando query direta a raw mart (medium)
  - Testes de cobertura de CLI em `elt.extract.run` e `elt.load.run` (medium)
  - Asserções de valores para `orgao_responsavel` e datas no teste de integração (medium)
  - Suporte a termos masculinos na normalização de situação (medium)
  - Teste de unicidade composta dbt para `(portal_slug, id_projeto)` (medium)
  - Correção de falsy zero em `id_geometria` (medium)
  - Try/except de isolamento de falha por projeto em `ObrasGovExtractor` (medium)
  - Tratamento de `total_pages` nulo na paginação (medium)
- Items deferred: 0
- Rejected findings: 12 (com justificativas técnicas registradas no triage log)

### Follow-up review recommendation
- Recommended: `true` (Patched counts: high 1, medium 8, low 1)
- Specific unverified risk: Validação em ambiente real de produção contra a API ao vivo do ObrasGov.br para municípios com grande volumetria de obras, onde a paginação profunda e latência de rede podem demandar ajustes finos de concorrência ou timeout.

### Verification performed
- `uv run --project elt ruff check elt/`: 0 erros (clean).
- `uv run --project elt ruff format --check elt/`: 54 arquivos verificados.
- `uv run --project elt mypy elt/ --ignore-missing-imports`: 0 erros em 55 arquivos.
- `make db/fixture/check`: 4/4 testes passando com 100% de paridade.
- `uv run --project elt pytest -v`: 84/84 testes passando.
- `pnpm test`: 85/85 arquivos e 664/664 testes TypeScript passando.

### Residual risks
- Baixo. A API do ObrasGov.br é governamental e pode sofrer instabilidades esporádicas de disponibilidade, cobertas defensivamente por retries exponenciais e isolamento de falha por projeto.
