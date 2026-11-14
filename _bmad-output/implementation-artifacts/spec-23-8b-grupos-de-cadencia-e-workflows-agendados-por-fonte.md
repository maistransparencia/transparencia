---
title: 'Grupos de cadência e workflows agendados por fonte'
type: 'feature'
created: '2026-11-13'
status: 'ready-for-dev'
baseline_commit: '1783f3c2'
context: ['{project-root}/.claude/rules/dbt-sql.md']
---

# Story 23.8b: Grupos de Cadência e Workflows Agendados por Fonte

Fonte dos critérios: `_bmad-output/planning-artifacts/epics.md`, seção "Story 23.8b". Esta spec acrescenta o que o código mostrou e as decisões abaixo.

## Estado atual (conferido em 2026-11-13)

- `.github/workflows/ingestion-pipeline.yml` (247 linhas): cron `0 23 * * 1-5`; `workflow_dispatch` com `portal`, `years`, `dry_run`; jobs `setup` (descobre portais em `elt/portals/*.yml`), `extract` (matriz por portal, FlareSolverr, `extract.run --portal P --years Y` **sem `--only`**, sync R2, upload de artefato) e `load_and_transform` (baixa artefatos, `load.run` por portal, `run_dbt.py deps/seed/run/test`, webhook de revalidação). O cron checa `main`; o dispatch checa `github.ref`.
- `elt/extract/run.py` (após a 23.8a): `--only` aceita várias chaves. Chaves existentes: listagens do portal da prefeitura (uma a uma), `siconfi`, `siconfi_msc`, `siconfi_rgf`, `pncp`, `obrasgov`, `farmacia_sus`, `siope`, `siops`. **Sem `--only`, SIOPE e SIOPS não rodam** (decisão da 23.8a). **Não existe chave única para "todas as listagens do portal da prefeitura".**
- `elt/transform/seeds/seed_fontes_coleta.csv` já traz, por fonte, `frequencia_esperada` e `tolerancia_dias`: `portal_municipal` e `farmacia_sus` diaria/4; `pncp` e `obrasgov` semanal/10; `siconfi_msc`, `siconfi_rgf`, `siope`, `siops` e `saude_rede` mensal/40; `inep_censo` e `inep_ideb` anual/400; `emendas_estaduais` sob_demanda/vazio.
- Precedente de cadência própria: `.github/workflows/check-inep-ideb-updates.yml`.

## Decisões desta spec

1. **Uma definição só, em Python.** Novo módulo `elt/core/cadence.py` (ou nome equivalente do pacote) com os grupos `diaria`, `semanal`, `mensal`, cada um com: lista de fontes, chaves de `--only` e o cron. O `frequencia_esperada` de cada fonte do grupo **continua no seed** e um teste confere que a fonte está no grupo cujo nome é igual ao seu `frequencia_esperada`. Assim não há duas listas divergentes: o grupo é derivado do mesmo valor que o seed já guarda, e o teste barra a divergência.
2. **As chaves de `--only` são os próprios códigos de fonte**, com uma exceção: `portal_municipal` não existe como chave hoje. Esta story **acrescenta a chave `portal_municipal` em `extract/run.py`**, que significa "todas as listagens do portal da prefeitura" (o laço de `endpoints` sem filtro). Sistemas novos de portal continuam sem criar fonte nova.
3. **Workflow reutilizável + três chamadores finos.** Um `ingestion-group.yml` (`workflow_call`, entrada `group`/`only`) contém a lógica atual (setup, extract, load_and_transform, webhook). Três arquivos finos (`ingestion-diaria.yml`, `ingestion-semanal.yml`, `ingestion-mensal.yml`) só definem `schedule`, `workflow_dispatch` (`portal`, `years`, `dry_run`) e chamam o reutilizável. `ingestion-pipeline.yml` deixa de existir (substituído, não duplicado). FlareSolverr só é necessário para o grupo diário (portal da prefeitura); se um grupo não precisa, o serviço pode ser condicional, mas não é obrigatório.
4. **Crons propostos** (Julio pode ajustar na revisão): diária `0 23 * * 1-5` (igual ao atual); semanal `0 23 * * 6` (sábado, fora do diário); mensal `0 23 3 * *` (dia 3). Intervalo máximo: diária 3 dias (sexta para segunda), semanal 7, mensal 31.
5. **Sem concorrência entre grupos no banco.** Os três workflows compartilham o mesmo `concurrency.group` para a fase de carga e dbt, com `cancel-in-progress: false`, porque dbt roda completo em todos (decisão do epic) e dois dbt simultâneos conflitam.
6. **Fontes fora dos grupos, de propósito.** O teste de "nenhuma fonte fora nem em mais de um grupo" vale para as fontes **coletadas por `elt.extract.run`**: `portal_municipal`, `farmacia_sus`, `pncp`, `obrasgov`, `siconfi_msc`, `siconfi_rgf`, `siope`, `siops`. `saude_rede`, `inep_censo`, `inep_ideb` (anuais e de saúde, Story 23.8c) e `emendas_estaduais` (sob demanda) ficam numa lista explícita de "fora dos grupos agendados por `extract.run`", com motivo, e o teste exige que toda fonte do seed esteja ou num grupo ou nessa lista.
7. **`siope` e `siops` continuam `nao_monitorado` no seed.** Virar `monitorado` só depois do primeiro run real e bem-sucedido em produção, com autorização do Julio. Não faz parte do código desta story; fica como passo pós-merge anotado em Implementation Notes.

## Critérios de aceitação

**AC1 — Grupos executam só as suas fontes**
- Cada workflow chamador roda `extract.run --portal P --years Y --only <chaves do grupo>`. Diária: `portal_municipal farmacia_sus`. Semanal: `pncp obrasgov`. Mensal: `siconfi_msc siconfi_rgf siope siops`.
- `extract/run.py` aceita `portal_municipal` em `--only` (inclusive combinada com outras chaves) e continua rejeitando chave desconhecida com `ValueError`.
- Cada chamador tem cron próprio e `workflow_dispatch` com `portal`, `years` e `dry_run` como hoje; portais descobertos dinamicamente de `elt/portals/*.yml`; nenhum slug de portal no YAML (regra 23).
- Após cada carga, dbt roda completo (`deps`, `seed`, `run`, `test`), como no pipeline atual; webhook de revalidação mantido.

**AC2 — Cobertura dos grupos (teste)**
- Teste pytest: cada fonte coletada por `extract.run` está em exatamente um grupo; toda fonte do `seed_fontes_coleta.csv` está num grupo ou na lista explícita de fora (decisão 6); as chaves de `--only` de cada grupo são aceitas por `extract/run.py`.

**AC3 — Frequência vem da mesma definição**
- Teste: para toda fonte de grupo, `frequencia_esperada` do seed é igual ao nome do grupo. Nenhuma lista paralela de frequência.

**AC4 — Tolerância cobre o cron**
- Teste: para cada grupo, `tolerancia_dias` de toda fonte é maior que o intervalo máximo do cron do grupo (diária 3, semanal 7, mensal 31) mais uma folga mínima de 1 dia. Hoje os valores (4, 10, 40) já passam; o teste existe para barrar regressão.
- O cron declarado em `cadence.py` é conferido contra o `schedule` do YAML do chamador correspondente (o teste lê o YAML), para a definição e o workflow não divergirem.

**AC5 — Primeiro run do SIOPS medido (herdado da 23.8a)**
- Com os workflows no ar, um `workflow_dispatch` do grupo mensal com `dry_run=true` e portal único mede timeout, limite de taxa e repetição do SIOPS no CI **sem tocar o banco** (o dry-run já pula carga e dbt; a extração só consulta fontes públicas). Ainda assim **só roda com autorização explícita do Julio**. O resultado vai em "Evidência do primeiro run" abaixo e fecha o pendente da spec 23.8a. Se o Julio ainda não autorizou no fechamento, a seção fica PENDENTE com o motivo.

## Fora do escopo

Execução em produção ou contra banco remoto sem autorização (regra 15); mudar o que cada extrator coleta; dbt seletivo por grupo; confirmar a frequência real de publicação de cada fonte; cadência dos seeds do IDEB e das fontes de saúde (Story 23.8c); trocar `siope`/`siops` para `monitorado` (decisão 7).

## Testes (pytest, `make test` e `make check`)

- Novos testes de AC2, AC3 e AC4 (leitura do seed, de `cadence.py` e dos YAMLs). Sem banco.
- `extract/run.py`: caso novo para `--only portal_municipal` (roda as listagens do portal e nenhuma outra fonte) e para combinação `portal_municipal farmacia_sus`.
- Validar sintaxe dos YAMLs (ex.: `actionlint` se já usado no repositório; senão, ao menos o parse no teste).
- Nomes e identificadores novos em inglês onde o código ao redor permitir; domínio fiscal segue em português.

## Regras do projeto que se aplicam

Regra 4 (`make test`, `make check`); regra 15 (nada contra produção sem autorização; testes só locais/efêmeros, `TEST_DATABASE_URL` 5545); regra 23 (sem slug de portal no YAML nem no código; portais via descoberta dinâmica); regra 7 (versões exatas se algo for instalado; preferir não adicionar dependência, o teste de cron não precisa de `croniter`); regra 19 (commits convencionais sem story/task).

## Implementation Notes

- `elt/core/cadence.py` define grupos, chaves de `--only`, cron, intervalo maximo e arquivo do workflow. Testes em `elt/tests/test_cadence.py` (AC2, AC3, AC4, YAMLs).
- `extract/run.py` aceita `portal_municipal` (todas as listagens do portal); testes em `elt/extract/__tests__/test_run_portal_municipal.py`.
- Workflows em ingles: `ingestion-group.yml` (reutilizavel, ex-`ingestion-pipeline.yml`) e chamadores `ingestion-daily|weekly|monthly.yml`. Concurrency compartilhada no job `load_and_transform`.
- **Ordem de release (crons):** o cron dispara na branch padrao (`dev`) mas executa o codigo de `main`. Por isso cada chamador so roda por `schedule` se a variavel de repositorio `INGESTION_SCHEDULE_ENABLED` for `true` (testado). `workflow_dispatch` nao e afetado. Passo pos-merge: promover o codigo para `main`, depois mudar a variavel (criada com `false` em 2026-11-13) para `true` e conferir que o primeiro cron diario rodou. Ate la, nenhuma ingestao agendada roda (o pipeline antigo foi removido).
- Limite do GitHub: com concurrency, no maximo uma execucao fica pendente; uma terceira pode cancelar a pendente (e a carga dela some em silencio). Com os crons aprovados so duas execucoes coincidem (mensal no dia 3 com o diario ou o semanal), entao so ocorre com um disparo manual extra. Decisao do Julio (2026-11-13): manter o cron mensal `0 23 3 * *`; se acontecer, escalonar o horario (ex.: `0 21 3 * *`) em vez de criar fila. Grupo de concurrency por workflow foi descartado: permitiria dois dbt simultaneos.

### Evidência do primeiro run mensal do SIOPS

PENDENTE (2026-11-13): o Julio autorizou o dispatch com `dry_run=true`, mas o GitHub recusou (`HTTP 404: workflow ingestion-monthly.yml not found on the default branch`): o `workflow_dispatch` exige o workflow na `dev`, mesmo com `--ref` da branch (que foi enviada ao remoto). Passo pos-merge na `dev`, com os crons ainda travados por `INGESTION_SCHEDULE_ENABLED=false`: `gh workflow run ingestion-monthly.yml --ref dev -f portal=<um portal> -f dry_run=true`, registrar aqui timeout, limite de taxa e repeticao do SIOPS e so entao considerar `siope`/`siops` como `monitorado`.
