---
title: 'Story 18.1: Ingestão de Dados Educacionais Oficiais do INEP, dbt Seed e Workflow de Atualização Automatizada (check-inep-ideb-updates.yml)'
type: 'feature'
created: '2026-10-16'
status: 'done'
baseline_revision: 'b74b9562c1808bbfc51101c710bd74a81cb5ee15'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-18-context.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** O MaisTransparência ainda não possui ingestão de dados oficiais do IDEB/Saeb do INEP nem estrutura analítica para auditoria educacional no dbt, exigindo um pipeline automatizado, versionado e idempotente para sincronização bienal sem intervenção manual.

**Approach:** Desenvolver o extrator canônico `elt/scripts/sync_inep_ideb_seed.py` para gerar `elt/transform/seeds/seed_inep_ideb.csv`, cadastrar a seed em `seeds.yml`, criar a camada de staging `stg_inep__ideb.sql`, configurar o workflow autônomo `.github/workflows/check-inep-ideb-updates.yml` com ping leve via requisições HTTP `HEAD` e sincronizar o fixture compactado de testes `schema.sql.gz`.

## Boundaries & Constraints

**Always:**
- Armazenar identificadores, etapas de ensino e redes estritamente em lowercase snake_case (`anos_iniciais`, `anos_finais`, `municipal`, `estadual`, `publica`) respeitando a Regra 10.
- Tratar caracteres não-numéricos como traços (`-`) ou strings vazias de notas e taxas como `NULL` numérico.
- Garantir que requisições aos servidores do INEP enviem cabeçalho `User-Agent: Mozilla/5.0` e suportem SSL flexível para evitar timeouts e bloqueios HTTP.
- Executar `make db/fixture/dump` e validar a sincronização com `make db/fixture/check` e `make test` após qualquer adição de seed (Regra 21).
- Encerrar o workflow do GitHub Actions em menos de 5 segundos quando o próximo ciclo bienal retornar 404 ou já estiver presente na seed.

**Never:**
- Nunca utilizar literais de texto de exibição na camada SQL/seed (ex: proibido `'Anos Iniciais'`, `'Rede Municipal'`).
- Nunca realizar downloads pesados de `.zip` no workflow do GitHub Actions antes da checagem preliminar com requisição `HEAD` ultraleve.
- Nunca executar operações de DDL/DML contra bancos de dados de produção ou fora do ambiente Docker local (Regra 15).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Sincronização Completa (2021–2025) | Download de `divulgacao_anos_iniciais_municipios_2025.zip` e `divulgacao_anos_finais_municipios_2025.zip` | Geração de `seed_inep_ideb.csv` contendo dados de RJ filtrados por `CO_MUNICIPIO`, com anos 2021, 2023 e 2025 normalizados | Em caso de falha de conexão, logar erro e abortar com código não-zero |
| Valores Ausentes ou Omissos | Células com `-`, `ND` ou vazias em `VL_OBSERVADO_...` ou `VL_NOTA_...` | Campo exportado como vazio no CSV (`NULL` no banco) | Não lançar exceção de conversão numérica |
| Verificação Leve (Novo Ciclo Inexistente) | Requisição `HEAD` para ciclo 2027 retorna HTTP 404 | Workflow loga status e encerra com sucesso em < 5 segundos sem abrir PR | Resposta 404 tratada como condição esperada de encerramento |
| Detecção de Novo Ciclo | Requisição `HEAD` para ciclo 2027 retorna HTTP 200 OK e ano não está na seed | Executa sync, regera fixture e abre Pull Request com título padronizado | Se PR já existir para a branch, atualiza a branch |

</intent-contract>

## Code Map

- `elt/scripts/sync_inep_ideb_seed.py` -- Extrator e processador em Python que baixa os pacotes oficiais de divulgação do IDEB do INEP, extrai os anos 2021, 2023 e 2025 para municípios do RJ e gera o seed CSV estruturado.
- `elt/transform/seeds/seed_inep_ideb.csv` -- Arquivo de seed com os dados históricos e recentes do IDEB/Saeb para os municípios fluminenses.
- `elt/transform/seeds/seeds.yml` -- Declaração da seed `seed_inep_ideb` com tipagem explícita (`column_types`) e documentação das colunas.
- `elt/transform/models/staging/nacional/stg_inep__ideb.sql` -- Modelo de staging que projeta os dados da seed `seed_inep_ideb` com colunas padronizadas em lowercase snake_case.
- `elt/transform/models/staging/nacional/_models.yml` -- Documentação e testes de integridade (`not_null`, `unique` no grão `cod_ibge`, `ano`, `rede`, `etapa_ensino`).
- `.github/workflows/check-inep-ideb-updates.yml` -- Workflow automatizado do GitHub Actions disparado mensalmente ou manualmente para monitorar publicações do INEP e abrir PR automatizado.
- `packages/db/tests/fixtures/schema.sql.gz` -- Fixture canônico compactado de testes sincronizado via `make db/fixture/dump`.
- `elt/tests/test_sync_inep_ideb.py` -- Teste unitário e de integração que valida a extração, tratamento de campos nulos e parsing do script.

## Tasks & Acceptance

**Execution:**
- `elt/pyproject.toml` -- Adicionar `openpyxl==3.1.5` nas dependências do projeto `elt` com versão exata pinada (Regra 7).
- `elt/scripts/sync_inep_ideb_seed.py` -- Implementar script de download e processamento das planilhas do INEP para gerar `seed_inep_ideb.csv`.
- `elt/transform/seeds/seed_inep_ideb.csv` -- Gerar a seed com dados de 2021 a 2025 para Porciúncula (3304102), Natividade (3303104) e municípios do RJ.
- `elt/transform/seeds/seeds.yml` -- Declarar `seed_inep_ideb` com tipos estritos (`integer`, `text`, `numeric`).
- `elt/transform/models/staging/nacional/stg_inep__ideb.sql` -- Criar modelo de staging selecionando de `{{ ref('seed_inep_ideb') }}`.
- `elt/transform/models/staging/nacional/_models.yml` -- Criar documentação e testes do modelo `stg_inep__ideb`.
- `.github/workflows/check-inep-ideb-updates.yml` -- Criar o workflow autônomo com ping HTTP HEAD, idempotência e abertura de PR.
- `elt/tests/test_sync_inep_ideb.py` -- Criar teste unitário para validar funções de download, parsing e sanitização de dados do INEP.
- `packages/db/tests/fixtures/schema.sql.gz` -- Regerar fixture compactado via `make db/fixture/dump` e auditar conformidade.

**Acceptance Criteria:**
- Given o script `elt/scripts/sync_inep_ideb_seed.py`, when executado localmente, then baixa ou processa os zips de anos iniciais e finais do INEP, extrai os dados para os municípios do RJ de 2021 a 2025 e gera `elt/transform/seeds/seed_inep_ideb.csv` com Porciúncula contendo Ideb 5.9 em 2025 e 4.5 em 2023.
- Given o modelo `stg_inep__ideb.sql`, when compilado e testado pelo dbt, then materializa view em staging com colunas padronizadas em snake_case (`cod_ibge`, `ano`, `rede`, `etapa_ensino`, `nota_ideb`, `meta_ideb`, `saeb_matematica`, `saeb_lingua_portuguesa`, `taxa_aprovacao`).
- Given o workflow `.github/workflows/check-inep-ideb-updates.yml`, when acionado para verificação, then executa verificação de ping leve em menos de 5 segundos para ciclos não publicados (404) e possui estrutura para acionar PR automatizado quando 200 OK.
- Given as alterações em seeds e staging, when `make db/fixture/dump` é executado, then o arquivo `packages/db/tests/fixtures/schema.sql.gz` é atualizado e as suítes `make db/fixture/check` e `make test` passam com 100% de sucesso.

## Spec Change Log

## Review Triage Log

### 2026-10-16 — Review pass
- verdicts: 28 findings — high 8, medium 6, low 6, false 8, maybe-false 0
- findings:
  - `[false]` `[reject]` Divergência de Superfície CI (Declarativa vs Runtime) — O workflow do GitHub Actions é declarativo por definição em repositórios Git; a lógica foi testada em testes unitários.
  - `[false]` `[reject]` Divergência de Superfície de Rede (Mocking Sintético vs Conexão Externa) — Testes automatizados de CI devem usar mocks de requisições de rede para evitar fragilidade e dependência de serviços externos.
  - `[false]` `[reject]` Divergência de Namespace dbt vs Escopo RJ — O modelo reside em nacional/ conforme especificação explícita da story, com recorte nos municípios do estado do Rio de Janeiro.
  - `[low]` `[patch]` Alteração Incidental em obras.spec.ts — Comentário @ts-expect-error ajustado para manter compatibilidade com o compilador TypeScript (TS2578).
  - `[high]` `[patch]` target_year não incluso em DEFAULT_YEARS em sync_inep_ideb_seed — Corrigido em sync_inep_ideb_seed.py para incluir target_year na lista padrão de anos extraídos (`DEFAULT_YEARS + [target_year]`).
  - `[medium]` `[patch]` INEP publica anos iniciais antes de anos finais — Corrigido em check_cycle_published para validar requisição HEAD tanto em anos iniciais quanto em anos finais.
  - `[low]` `[patch]` all_records vazio ao extrair — Corrigido tratamento com validação explícita de all_records.
  - `[low]` `[patch]` Coluna SG_UF ausente no cabeçalho Excel — Corrigida validação para checar presença de SG_UF no DataFrame antes de filtrar por UF.
  - `[high]` `[patch]` Falta de serviço Postgres e sintaxe Make no workflow — Adicionado container services: postgres (5544:5432), DATABASE_URL e corrigida a sintaxe do Make para SELECT=...
  - `[high]` `[patch]` Claim novo ciclo não extrai target_year — Corrigido junto com a inclusão de target_year, garantindo unpivot do ano alvo.
  - `[high]` `[patch]` Claim workflow falha antes do PR sem Postgres — Corrigido configurando postgres e DATABASE_URL no workflow.
  - `[high]` `[patch]` Omite target_year no unpivot ao passar --year — Corrigido em sync_inep_ideb_seed.py para incluir target_year em years.
  - `[medium]` `[patch]` Sintaxe inválida make dbt/run --select — Corrigido para SELECT=stg_inep__ideb no workflow YAML.
  - `[high]` `[patch]` Falta serviço Postgres 5544 no workflow — Corrigido no YAML do workflow adicionando container postgres e DATABASE_URL.
  - `[medium]` `[patch]` Cron de anos futuros não avança — Corrigido com inclusão de target_year na seed e validação de is_year_in_seed.
  - `[medium]` `[patch]` check_cycle_published valida apenas anos iniciais — Corrigido para validar anos iniciais e finais.
  - `[low]` `[patch]` Arquivos AppleDouble ._ no ZIP — Corrigido adicionando filtro not Path(n).name.startswith("._").
  - `[low]` `[reject]` skiprows=9 hardcoded no Excel — As planilhas oficiais de divulgação do IDEB do INEP possuem 9 linhas fixas de preâmbulo metodológico nos ciclos recentes; não justifica complexidade defensiva arbitrária.
  - `[false]` `[reject]` Descarte de ciclos anteriores a 2021 — O critério de aceitação especifica explicitamente o intervalo de 2021 a 2025 para a seed.
  - `[low]` `[patch]` Diff incidental em obras.spec.ts — Ajustado para compatibilidade de checagem de tipos.
  - `[false]` `[reject]` Ausência de mart downstream fct_educacao_metricas — O mart analítico é o escopo explícito da Story 18.2.
  - `[false]` `[reject]` Ausência de range checks em stg_inep__ideb — Notas e taxas na camada de staging refletem valores projetados do seed com testes de nulidade e valores aceitos.
  - `[false]` `[reject]` Insecure SSL context sem fallback — Os servidores Apache do INEP utilizam certificados legados que exigem SECLEVEL=1 para evitar handshake failure.
  - `[medium]` `[patch]` Asserção exata de anos quebra teste em novos ciclos — Corrigido em test_sync_inep_ideb.py:756 para {2021, 2023, 2025}.issubset(...)
  - `[low]` `[patch]` Seed presence check e flag --check-next sem testes — Adicionados testes unitários em TestIsYearInSeed e TestMainCliCheckNext.
  - `[medium]` `[patch]` Pipeline entrypoint sem teste para target_year — Adicionado teste unitário TestSyncTargetYearInclusion.
  - `[high]` `[patch]` years não recebe target_year em sync_inep_ideb_seed — Corrigido repasse de target_year quando years é None.
  - `[high]` `[patch]` Runner sem Postgres e sem DATABASE_URL — Corrigido container Postgres e DATABASE_URL no workflow.

## Design Notes

A extração das planilhas de divulgação municipal do IDEB no INEP exige atenção às primeiras 9 linhas de metadados antes do cabeçalho técnico (`SG_UF`, `CO_MUNICIPIO`, `REDE`, etc.). As colunas históricas seguem o formato:
- Nota IDEB: `VL_OBSERVADO_{ano}`
- Meta IDEB: `VL_PROJECAO_{ano}`
- Saeb Matemática: `VL_NOTA_MATEMATICA_{ano}`
- Saeb Português: `VL_NOTA_PORTUGUES_{ano}`
- Taxa de Aprovação: `VL_INDICADOR_REND_{ano}`

O script faz o unpivot dos ciclos bienais (2021, 2023, 2025) e unifica Anos Iniciais (`anos_iniciais`) e Anos Finais (`anos_finais`), convertendo redes para `municipal`, `estadual` e `publica`.

## Verification

**Commands:**
- `uv run --project elt python elt/scripts/sync_inep_ideb_seed.py` -- expected: seed gerada com sucesso sem erros
- `uv run --project elt pytest elt/tests/test_sync_inep_ideb.py -v` -- expected: todos os testes unitários passando
- `make dbt/seed SELECT=seed_inep_ideb` -- expected: seed_inep_ideb semeada no banco local
- `make dbt/run SELECT=stg_inep__ideb` -- expected: staging compilada com sucesso
- `make dbt/test SELECT=stg_inep__ideb` -- expected: testes de integridade dbt aprovados
- `make db/fixture/dump` -- expected: schema.sql.gz regerado
- `make db/fixture/check` -- expected: paridade semântica 100% aprovada
- `make test` -- expected: suíte completa de testes de integração passando
- `make check` -- expected: linters e validações de tipo estáticas sem violações

## Auto Run Result

### Summary of Implemented Change
Implementada com sucesso a fundação de dados educacionais oficiais do INEP para o MaisTransparência, abrangendo o extrator canônico `sync_inep_ideb_seed.py`, o seed dbt `seed_inep_ideb.csv` (1.608 registros com notas auditadas de 2021 a 2025 para Porciúncula e Natividade), declaração estrita em `seeds.yml`, modelo de staging `stg_inep__ideb.sql` com testes dbt, workflow autônomo do GitHub Actions `.github/workflows/check-inep-ideb-updates.yml` com ping leve HTTP HEAD e abertura automática de PR, governança de fixture em `schema.sql.gz` e suíte de 46 testes unitários em pytest.

### Files Changed
- `.github/workflows/check-inep-ideb-updates.yml` -- Workflow mensal e manual com ping leve HEAD e abertura automatizada de PR via peter-evans/create-pull-request.
- `elt/pyproject.toml` -- Adição da dependência exata openpyxl==3.1.5 (Regra 7).
- `elt/uv.lock` -- Lockfile atualizado com openpyxl e et-xmlfile.
- `elt/scripts/sync_inep_ideb_seed.py` -- Extrator do INEP com download, unpivot, sanitização e CLI de verificação leve.
- `elt/transform/seeds/seed_inep_ideb.csv` -- Seed dbt com 1.608 registros dos 92 municípios do RJ para 2021, 2023 e 2025.
- `elt/transform/seeds/seeds.yml` -- Declaração da seed seed_inep_ideb com tipos estritos e documentação.
- `elt/transform/models/staging/nacional/stg_inep__ideb.sql` -- View dbt de staging em lowercase snake_case.
- `elt/transform/models/staging/nacional/_models.yml` -- Documentação e testes de integridade do staging.
- `elt/tests/test_sync_inep_ideb.py` -- Suíte de 46 testes cobrindo sanitização, CLI, unpivot e integridade.
- `packages/db/tests/fixtures/schema.sql.gz` -- Fixture compactado sincronizado e auditado.
- `packages/db/src/queries/__tests__/obras.spec.ts` -- Ajuste de diretiva de tipo para aprovação no tsc.

### Review Findings Breakdown
- Patches aplicados: 19 constatações corrigidas (inclusão dinâmica de target_year, verificação de anos iniciais e finais no ping HEAD, filtro de arquivos ocultos ._, configuração de container postgres e DATABASE_URL no workflow, sintaxe SELECT= no Make, flexibilização de assert de anos futuros e novos testes unitários para CLI e seed presence).
- Items diferidos: 0.
- Constatações rejeitadas: 8 constatações rejeitadas com justificativa registrada (3 de alinhamento de intenção com justificativa de arquitetura declarativa/mocking, 1 de preâmbulo metodológico fixo, 1 de recorte temporal já explícito nos critérios, 1 de mart reservado para a Story 18.2, 1 de range checks em staging e 1 de necessidade estrita de SECLEVEL=1 para o INEP).

### Follow-up Review Recommendation
`followup_review_recommended: true` (Primeira iteração com correção de constatações de severidade alta no pipeline automatizado de dados e workflow de CI). Risco específico residual: estabilidade e formato dos certificados dos servidores do INEP em ciclos bienais futuros (ex: 2027).

### Verification Performed
- `uv run --project elt python elt/scripts/sync_inep_ideb_seed.py` -> Gerada a seed `seed_inep_ideb.csv` com 1.608 linhas sem erros.
- `uv run --project elt pytest elt/tests/test_sync_inep_ideb.py -v` -> 46/46 passed in 0.39s.
- `make dbt/seed SELECT=seed_inep_ideb` -> 1.608 registros inseridos em 0.56s.
- `make dbt/run SELECT=stg_inep__ideb` -> View analytics.stg_inep__ideb criada em 0.09s.
- `make dbt/test SELECT=stg_inep__ideb` -> 12/12 hooks e testes dbt aprovados em 0.23s.
- `make db/fixture/dump` e `make db/fixture/check` -> 4/4 testes de paridade de schema aprovados em 18.50s.
- `make check` -> ruff check (0 erros), ruff format (56 files ok), mypy (57 files ok).
- `make test` -> 130/130 testes de integração aprovados em 28.27s.
- `pnpm test` -> 5 packages de frontend/db aprovados (815 tests passed em apps/web).

### Residual Risks
Mudanças futuras unilaterais na estrutura de nomes ou colunas das planilhas de divulgação do INEP no ciclo bienal de 2027. Mitigado pela checagem leve HTTP HEAD e abertura de PR automatizado com pipeline de verificação completo antes de qualquer merge.

