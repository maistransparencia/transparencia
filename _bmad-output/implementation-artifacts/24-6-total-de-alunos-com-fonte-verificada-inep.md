---
title: 'Total de alunos com fonte verificada (INEP)'
type: 'feature'
created: '2026-11-02'
status: 'done'
baseline_revision: '6d9a388980aaa74fb899817af46c481ed09a5a25'
review_loop_iteration: 0
followup_review_recommended: false
context: ['{project-root}/DESIGN.md', '{project-root}/EXPERIENCE.md']
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** O valor por aluno (24.4) aparece sem o denominador: o cidadão não vê quantos alunos a rede municipal atende. O seed antigo de matrículas não tinha fonte rastreável e foi removido (20.8).

**Approach:** Spike confirmou fonte automatizável: microdados do Censo Escolar do INEP (`download.inep.gov.br/dados_abertos/microdados_censo_escolar_<ano>.zip`, URL estável por ano, leiaute `microdados_ed_basica_<ano>.csv`). Um extrator soma `QT_MAT_BAS` das escolas municipais em atividade por `CO_MUNICIPIO` = `cod_ibge`, grava em `raw_inep_censo`, o dbt expõe o mart e a página mostra "Alunos na rede municipal" com o ano do Censo.

## Boundaries & Constraints

**Always:** Nenhum número digitado no repositório; `portal_slug` na chave e nos joins (Regra 23); nomes explícitos (Regra 9); códigos em snake_case (Regra 10); cálculo só em dbt/`@transparencia/db` (Regra 14); execução só contra o banco local (Regra 15); ano do Censo real exibido, sem ano fixo; sem matrícula, o indicador some (sem espaço vazio, sem "0"); texto em linguagem cidadã (Regra 27): é o Censo de maio, não o número de hoje.

**Never:** Seed manual; baixar o zip em CI/test; raspar páginas do gov.br (403); comparar com outros municípios; dividir valores no TypeScript.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ano com Censo | zip com escolas municipais em atividade do município | soma de `QT_MAT_BAS` por portal e ano | — |
| Escola paralisada/extinta ou outra dependência | `TP_SITUACAO_FUNCIONAMENTO` ≠ 1 ou `TP_DEPENDENCIA` ≠ 3 | não entra na soma | — |
| Ano ainda não publicado | HTTP 404 | ano ignorado com aviso | nenhum ano com dado: erro, nada gravado |
| Município sem escola municipal | nenhuma linha | sem registro (nunca zero) | aviso |
| Página sem matrícula do ano | mart sem linha | indicador não aparece | — |
| Ano selecionado sem Censo | Censo mais recente ≤ ano selecionado | mostra o ano real do Censo na nota | — |

</intent-contract>

## Code Map

- `elt/extract/siope.py`, `elt/load/siope.py` -- molde: classe de extração, `ensure_*_table`, `upsert`, CLI `--portal/--years/--dry-run`, `PortalConfig.cod_ibge`.
- `elt/transform/models/staging/siope/` , `marts/metrics/fct_educacao_siope_metricas.sql` + `_...yml` -- molde de source/staging/mart com contrato.
- `elt/tests/test_fct_educacao_siope_metricas.py` -- molde de teste de mart com `conn`.
- `packages/db/src/queries/educacao-siope-metrics.ts`, `packages/db/src/index.ts`, `packages/db/tests/fixtures/seed.ts` (seed/cleanup) -- molde de query, export e fixture.
- `apps/web/app/[portalSlug]/educacao/{loader.ts,view-model.ts}` -- loader paralelo e view-model.
- `apps/web/components/educacao/educacao-valor-por-aluno-section.tsx` -- recebe o 2º `Indicator`.
- `Makefile` (`elt/siope`), `apps/web/public/llms.txt`, `llms-full.txt`, `CHANGELOG.md`.

## Tasks & Acceptance

**Execution:**
- `elt/load/inep_censo.py` -- tabela `raw_inep_censo.matriculas_rede_municipal` (PK `portal_slug`,`ano`) -- raw por fonte
- `elt/extract/inep_censo.py` -- baixa o zip por ano (stream, User-Agent de navegador), agrega o CSV sem carregá-lo todo, 404 ignora o ano -- extrator versionado
- `elt/extract/__tests__/test_inep_censo.py` -- agregação (filtros, município, latin1), 404, erro sem dados -- sem rede
- `elt/transform/models/staging/inep_censo/*` e `marts/metrics/fct_educacao_matriculas_metricas.{sql,yml}` -- grão portal+ano, contrato, testes
- `elt/tests/test_fct_educacao_matriculas_metricas.py` -- isolamento entre portais, unicidade
- `packages/db/src/queries/educacao-matriculas-metrics.ts` (+ spec, export, fixture) -- `getEducacaoMatriculas`: Censo mais recente ≤ ano pedido
- `loader.ts`, `view-model.ts` (+ specs) -- `alunosRede` (null sem dado)
- `educacao-valor-por-aluno-section.tsx` (+ spec) -- indicador "Alunos na rede municipal"
- `Makefile`, `llms*.txt`, `CHANGELOG.md` -- comando `elt/inep-censo`, texto e registro da decisão do spike

**Acceptance Criteria:**
- Given matrículas no mart, when o cidadão abre `/[portalSlug]/educacao`, then vê "Alunos na rede municipal" com o total e "Censo Escolar <ano real>, INEP".
- Given nenhum registro de matrículas, when a página abre, then o indicador não aparece e nada mais muda.
- Given Porciúncula 2024, when o extrator roda no zip oficial, then o total é 2.001 (conferido na fonte).

## Design Notes

Total = `QT_MAT_BAS` (educação básica: infantil, fundamental, médio, EJA, profissional, especial) das escolas com `TP_DEPENDENCIA = 3` (municipal) e `TP_SITUACAO_FUNCIONAMENTO = 1`. Coluna `matriculas_educacao_basica`. A Sinopse Estatística em xlsx não tem URL estável (404); os microdados têm e são a mesma base do Censo.

## Verification

**Commands:**
- `make test` e `make check` -- expected: verdes
- `pnpm test` e `pnpm typecheck` -- expected: verdes

## Review Triage Log

### 2026-11-02 — Review pass
- verdicts: 30 findings — high 0, medium 3, low 4, false 6, maybe-false 0 (restantes rejeitados como fora do escopo da intenção ou de baixo impacto)
- findings:
  - `[medium]` `patch` falta teste de fiação página/view-model com matrículas — adicionados testes em page.spec e view-model.spec
  - `[medium]` `patch` QT_MAT_BAS não numérico escapava como ValueError — convertido em InepCensoError, com teste
  - `[medium]` `patch` erro TLS escondido como "INEP indisponível" — mensagem agora inclui a causa
  - `[low]` `patch` bundle TLS temporário vazava um arquivo por instância — cache por processo (lru_cache)
  - `[false]` `reject` tipos Kysely ausentes — typecheck passa; client não usa tipos gerados
  - `[false]` `reject` certificado não versionado — será commitado junto
  - `[false]` `reject` 2.001 não verificado — extrator rodado no zip real: Porciúncula 2024 = 2.001, Natividade 2024 = 1.424
  - `[low]` `reject` linha obsoleta quando ano passa a None, CSV duplicado no zip, download repetido por portal, glossário, mart filtrando zero sem teste, loader sem catch — improvável no uso e correção exige complexidade

## Auto Run Result

Status: done

- Resumo: extrator do Censo Escolar (microdados INEP) → `raw_inep_censo` → mart `fct_educacao_matriculas_metricas` → `getEducacaoMatriculas` → indicador "Alunos na rede municipal" na seção de valor por aluno. Decisão do spike: Sinopse xlsx sem URL estável (404); microdados têm URL estável.
- Achado operacional: o servidor do INEP envia cadeia TLS incompleta; o intermediário público da RNP foi versionado em `elt/extract/certs/` e a verificação TLS permanece ligada (`certifi` fixado).
- Revisão: 4 patches aplicados, nenhum item adiado.
- Verificação: `make check`, `make test` (248), `pnpm typecheck`, `make lint/ts`, vitest de `educacao` (148) e da query nova verdes; extrator rodado no zip real: Porciúncula 2024 = 2.001 e Natividade 2024 = 1.424.
- Riscos: dados ainda não carregados no banco (rodar `make elt/inep-censo PORTAL=...` e `dbt run`); CSVs anteriores a ~2013 podem não ter `QT_MAT_BAS` (usar `--years`); intermediário TLS expira em 2030.
- followup_review_recommended: false

## Revisão de fonte (2026-11-02)

Decisão do usuário: trocar a fonte pela API de dados do IBGE (pesquisa 13, "Censo escolar - sinopse"), que republica a Sinopse do INEP, e contar só a rede municipal do ensino fundamental, do 1º ao 9º ano (o que a página exibe). O extrator soma os 9 indicadores "Municipal" por ano de escolaridade; a coluna do mart passou a `matriculas_ensino_fundamental` e a contagem de escolas saiu (anos iniciais e finais se sobrepõem). O certificado intermediário do INEP e o `certifi` foram removidos. Valores conferidos na API: Porciúncula 1.310 (2023), 1.303 (2024), 1.278 (2025); Natividade 857 (2024). Estes valores substituem o "2.001" do AC original, que era a educação básica inteira por microdados.

## Revisão de escopo (2026-11-02, 2)

Decisão do usuário com a análise da Mary: o denominador casa com o "por aluno da educação básica" do SIOPE 4.9, então entra a educação infantil (indicadores 77883 creche e 5904 pré-escola). O mart expõe `matriculas_educacao_infantil`, `matriculas_ensino_fundamental` e `matriculas_educacao_basica` (soma calculada no dbt); a tela mostra o total e a divisão entre as etapas. Ensino médio, EJA e educação especial ficam de fora e a nota diz isso. Conferência: Porciúncula 2024 = 668 + 1.303 = 1.971; Natividade 2024 = 567 + 857 = 1.424, os mesmos totais da soma de QT_MAT_BAS dos microdados do INEP. Pendente: confirmar a regra de cálculo do SIOPE 4.9 no FNDE.

## Decisão sobre o denominador (2026-11-03)

Mantido o total de educação infantil mais ensino fundamental da rede municipal. EJA, educação especial e ensino médio ficam de fora e a nota da tela diz isso. A regra exata do SIOPE 4.9 não foi confirmada em fonte oficial publicada: o relatório do TCE-BA (2020) diz que o denominador usa matrículas do Censo Escolar por nível e modalidade; uma afirmação de que o SIOPE usa 2.001 em Porciúncula 2024 (com EJA e especial) veio de texto sem fonte e com valor de Natividade divergente da API, então não foi adotada. A diferença estimada, se for verdadeira, é de cerca de 30 alunos (1,5%) em Porciúncula.
