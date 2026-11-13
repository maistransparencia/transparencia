---
title: 'Cadência dos seeds do IDEB e das fontes de saúde'
type: 'feature'
created: '2026-11-13'
status: 'ready-for-dev'
baseline_commit: '14ee4ebc'
context: ['{project-root}/.claude/rules/dbt-sql.md']
---

# Story 23.8c: Cadência dos Seeds do IDEB e das Fontes de Saúde

Fonte dos critérios: `_bmad-output/planning-artifacts/epics.md`, seção "Story 23.8c". Decisões fechadas com o Julio em 2026-11-13 (seção "Decisões").

## Estado atual (conferido em 2026-11-13)

**IDEB**
- `.github/workflows/check-inep-ideb-updates.yml`: cron `0 8 1 * *` (mensal), `workflow_dispatch` (`target_year`, `force_sync`). Faz `sync_inep_ideb_seed.py --check-next <ano>` (ping leve) e, se há ciclo novo, `sync_inep_ideb_seed.py --year`, `dbt seed/run/test` só de `seed_inep_ideb`/`stg_inep__ideb`, `make test` e abre PR contra `dev`. **Não chama `sync_ibge_ideb_brasil.py` e não confere `seed_inep_ideb_estados`.**
- Seeds: `seed_inep_ideb.csv` (municipal), `seed_inep_ideb_estados.csv`, `seed_inep_ideb_brasil.csv`. O Brasil vem de `elt/scripts/sync_ibge_ideb_brasil.py` (API do IBGE, pesquisa 40, `--from-year`, `--output`).
- `seed_fontes_coleta.csv` tem só `inep_ideb` (anual, tolerância 400, `nao_monitorado`). `elt/core/cadence.py` a lista em `UNSCHEDULED_SOURCES` ("verificado por check-inep-ideb-updates.yml").
- Seed não passa por `load.run`, então **nunca gera linha em `raw_coletas.registro_coletas`**.

**Saúde**
- A 25.6c está `done`: CNES, SIA e SIH vêm dos arquivos mensais por UF do DATASUS (`elt/extract/saude_datasus.py`, config em `elt/fontes/saude_datasus.yml`, uma entrada por UF); população pela API (`saude_rede.py`).
- `saude_datasus.py` é CLI próprio: agrupa portais por UF, extrai as 4 últimas competências fechadas por padrão e **grava direto no banco** (`--dry-run` só extrai). Não passa por `extract/run.py`, não escreve JSON e não registra coleta.
- `seed_fontes_coleta.csv` tem `saude_rede` (mensal, 40, `nao_monitorado`); **não há `saude_producao`**. Hoje a coleta é manual: `make elt/saude-datasus` (roda o dbt do mart ao final).
- `cadence.py` lista `saude_rede` em `UNSCHEDULED_SOURCES` com motivo "Story 23.8c".

## Decisões (fechadas pelo Julio em 2026-11-13)

1. **Valor de `frequencia_esperada` do IDEB.** O epic pedia `mensal`, mas o INEP publica a cada dois anos e hoje o seed diz `anual`. **Decidido: manter.** Manter o nome de fonte e o valor que descrevem a **publicação** (`bienal`/`anual`) e tratar o `check-inep-ideb-updates.yml` mensal como a verificação, não como a cadência dos dados. O texto do epic ("`mensal`") fica superado por esta decisão; ajustar o `epics.md` junto.
2. **Como seed entra no registro de coletas.** Seed não passa pelo `load.run`. **Decidido: sim.** O catálogo `seed_fontes_coleta.csv` ganha uma linha por seed do IDEB (municipal, estados, Brasil) como **catálogo apenas** (`nao_monitorado`, sem linha em `registro_coletas`), para o texto "como atualizamos" listar a fonte; monitorar a idade do seed fica fora desta story.
3. **Nome das fontes de saúde e onde roda.** **Decidido: sim.** Manter `saude_rede` (população e rede) e criar `saude_producao` (SIA e SIH) no catálogo, ambas mensais. Como o extrator é por UF e tem custo de disco (~3,4 GB no SIA), rodar como **job próprio dentro do workflow mensal** (uma execução por UF, não uma por portal), e não dentro da matriz por portal do `extract.run`; o job registra a coleta de cada portal da UF no fim. Alternativa descartada: adaptar ao padrão de JSON por portal da 23.8a (rebaixaria o mesmo arquivo da UF para cada portal).

## Critérios de aceitação

**AC1 — Seeds do IDEB na mesma verificação**
- O `check-inep-ideb-updates.yml` passa a rodar também `sync_ibge_ideb_brasil.py` e conferir/atualizar `seed_inep_ideb_estados` (se o script que o gera é o mesmo `sync_inep_ideb_seed.py --uf ALL`, usar ele; senão, documentar a origem). Um único PR de atualização contém os três seeds.
- Etapa de validação do workflow roda `dbt seed` e testes dos três seeds, não só do municipal.
- Teste pytest: todo seed cujo nome começa com `seed_inep_ideb` é coberto pelo workflow (lê o YAML e a lista de seeds; um seed novo fora do workflow reprova).

**AC2 — Registro de fontes do IDEB (decisões 1 e 2)**
- Linhas no `seed_fontes_coleta.csv` conforme decidido; texto de `descricao_dados` em linguagem do cidadão (skill editor-cidadao). O contrato do seed e o teste de `cadence.py` continuam verdes (se a fonte nova não é coletada por `extract.run`, entra em `UNSCHEDULED_SOURCES` com motivo).

**AC3 — Ordem de deploy da média nacional**
- Conferir e documentar (no workflow e em Implementation Notes) em que ponto `dbt seed` publica `seed_inep_ideb_brasil` em relação ao deploy do código que lê `getEducacaoMediasNacionais`, que devolve vazio em silêncio se a tabela não existe. Entregar a garantia mínima: passo de `dbt seed` antes do deploy no fluxo de release, ou item no checklist de release se o deploy é externo (Vercel). Sem mudar a query.

**AC4 — Saúde no grupo mensal (decisão 3)**
- Fontes de saúde entram no grupo `mensal` de `cadence.py` e no catálogo com `frequencia_esperada` `mensal` e tolerância que cubra o cron mensal (teste da 23.8b já confere).
- Job de saúde no `ingestion-monthly.yml` (ou no reutilizável com entrada condicional): uma execução por UF a partir de `elt/portals/*.yml` descoberto dinamicamente (sem UF nem slug hard-coded, regra 23), carga incremental das **4 últimas competências fechadas** (comportamento padrão do extrator), apagando o disco temporário ao fim, com `timeout-minutes` explícito.
- Coleta registrada em `raw_coletas.registro_coletas` por portal e por fonte de saúde, com `frequencia_esperada` vindo do catálogo (reusar `record_collections`).
- dbt completo roda após a carga, como nos outros grupos.
- Teste pytest: nenhuma fonte de saúde roda sem `--only`/sem o job mensal (nem na carga diária por omissão), e o job mensal cita só fontes que existem em `cadence.py`.
- Backfill de 2021 em diante continua **manual, em partes e só no banco local**; em produção só com autorização do Julio (regra 15).

**AC5 — Primeiro run mensal medido**
- Mede o tempo do job de saúde por UF no runner (ubuntu-latest), incluindo o acesso ao FTP, e registra em "Evidência do primeiro run". Se o total não couber no limite do job, dividir por UF em matriz. Linha de base: testes de contrato da 25.6a (API) e da 25.6c (FTP). **Só roda com autorização explícita do Julio e depois do merge na `dev`** (o dispatch de workflow novo só funciona com o arquivo na branch padrão, aprendizado da 23.8b); sem autorização, fica PENDENTE com o motivo.

## Fora do escopo

Execução em produção sem autorização (regra 15); mudar o que cada extrator coleta; dbt seletivo por grupo; confirmar a frequência real de publicação além da estimativa; monitorar a idade dos seeds do IDEB; promover `siope`/`siops`/saúde para `monitorado` (passo pós-primeiro run).

## Testes (pytest, `make test` e `make check`)

Os de AC1, AC2 e AC4 acima, sem banco; o teste de cobertura de `cadence.py` (23.8b) segue passando. Identificadores novos em inglês onde o código ao redor permitir; domínio fiscal em português.

## Regras do projeto que se aplicam

Regra 4; regra 15 (a carga de saúde em produção só no workflow e com gate `INGESTION_SCHEDULE_ENABLED` da 23.8b; testes locais/efêmeros, `TEST_DATABASE_URL` 5545); regra 23 (portais e UFs descobertos dinamicamente); regra 7 (sem dependência nova); regra 19 (commits convencionais sem story/task).

## Implementation Notes

- **AC1:** `check-inep-ideb-updates.yml` passa a rodar `sync_ibge_ideb_brasil.py` e a semear/testar os três seeds. **`seed_inep_ideb_estados` não tem gerador**: `sync_inep_ideb_seed.py` só escreve linhas por município (`cod_ibge`), o seed de estados tem `cod_uf`/`sigla_uf`. Fica manual; o workflow emite aviso e o PR pede a conferência. Teste: `test_ideb_workflow_coverage.py`.
- **AC2:** catálogo ganha `inep_ideb_estados`, `inep_ideb_brasil` (anuais, `nao_monitorado`, em `UNSCHEDULED_SOURCES`) e `saude_producao`; `saude_rede` com descrição ampliada (leitos, profissionais, população).
- **AC3:** o deploy é da Vercel e não roda dbt; `release.yml` só publica notas. Garantia mínima: `docs/checklist-de-release.md` (dbt seed antes do deploy) + aviso no PR do IDEB. O `dbt seed` do ingestion-group cobre só a próxima execução do cron.
- **AC4:** `CadenceGroup.dedicated_keys` (mensal: `saude_rede`, `saude_producao`). `ingestion-group.yml` ganha input `saude` e job `saude` (matriz por UF descoberta dos YAMLs de portal, 120 min, limpeza do tmp); `load_and_transform` depende dele. `saude_datasus.py` ganha `--uf`, `--list-ufs` e registra coleta por portal. Sem concurrency no job de saúde (cancelaria itens pendentes da matriz); o dbt segue serializado.

### Evidência do primeiro run mensal de saúde

PENDENTE: depende de merge na `dev` e autorização do Julio.
