---
title: 'Extratores do SIOPE e do SIOPS no padrão de coleta em JSON'
type: 'feature'
created: '2026-11-13'
status: 'ready-for-dev'
baseline_commit: '2f85d6e64dd902476e94e85df859583f26d66fb4'
context: ['{project-root}/.claude/rules/dbt-sql.md']
---

# Story 23.8a: Extratores do SIOPE e do SIOPS no padrão de coleta em JSON

Fonte dos critérios: `_bmad-output/planning-artifacts/epics.md`, seção "Story 23.8a". Esta spec só acrescenta o que o código mostrou e as decisões abaixo.

## Estado atual (conferido em 2026-11-13)

- `elt/extract/siope.py`: `extract_and_load_siope(portal, years, db, extractor)` extrai e grava direto em `raw_siope.siope_indicadores` (`elt/load/siope.py`: `ensure_siope_table`, `load_siope_indicadores`). Erro (`SiopeError`) não grava nada.
- `elt/extract/siops.py`: `extract_and_load_siops(portais, years, db, extractor)`, mesma forma, para vários portais de uma vez. Grava em `raw_siops` (`elt/load/siops.py`). Erro (`SiopsError`) não grava nada, inclusive quando o 3.2 diverge entre as duas vias.
- `elt/extract/run.py` não conhece nenhum dos dois. `--only` é uma string só (`args.only`), validada contra uma lista; os blocos usam `not args.only or args.only in <conjunto>`.
- `elt/load/run.py` despacha por `json_file.parent.name` (nome da tabela) e acumula `rows_loaded[<fonte>]` para `record_collections` (`elt/load/coletas.py`), que exige a fonte em `seed_fontes_coleta.csv`.
- `seed_fontes_coleta.csv`: `siope` e `siops` já existem com `frequencia_esperada=mensal` e `monitoramento=nao_monitorado`.
- Makefile: `elt/siope` e `elt/siops` chamam os extratores direto, com `--dry-run`.
- `.github/workflows/ingestion-pipeline.yml:111` chama `elt.extract.run` **sem `--only`** (todo dia útil) e `:200` chama `elt.load.run`.

## Decisões desta spec

1. **Caminho do JSON segue a convenção real:** `data/raw_runs/<portal>/<timestamp>/siope_indicadores/indicadores.json` e `.../siops_indicadores/indicadores.json`. O texto do epic omite o `<timestamp>`; `load/run.py` pega o diretório mais recente por portal e lê `run_dir.name` como data da coleta, então sem ele a coleta não é registrada.
2. **Sem `--only`, SIOPE e SIOPS NÃO rodam.** Só rodam quando nomeados (`--only siope`, `--only siops`). Motivo: o pipeline atual chama sem `--only` todo dia útil; incluí-los agora os colocaria na cadência diária antes de existir o grupo mensal (Story 23.8b), e o SIOPS faz muitas requisições. O comportamento atual das outras fontes não muda.
3. **Extratores ficam puros.** Remover a gravação direta no banco de `extract_and_load_siope/siops` (viram `extrair_*` que devolvem as linhas ou levantam `SiopeError`/`SiopsError`). Quem grava é `elt/load/run.py`, usando os `ensure_*`/`load_*` que já existem.
4. **Tudo-ou-nada preservado:** se o extrator levanta erro, **nenhum** JSON dessa fonte é escrito; o erro entra em `failed_requests.csv` via `_log_failed` (padrão das demais fontes) e as outras fontes da mesma execução seguem. Coleta com 0 linhas e sem erro grava JSON `[]` (o `record_collections` já registra coleta vazia).
5. **SIOPS é multi-portal, a coleta é por portal.** `run.py` roda por `--portal`; para o SIOPS chamar o extrator com `[portal]`. O CLI do SIOPS que aceita lista de portais (`elt/extract/siops.py`, `_todos_os_portais`) sai; o Makefile passa a chamar `run.py`/`load.run` por portal.
6. **`seed_fontes_coleta.csv` não muda nesta story.** `siope`/`siops` continuam `nao_monitorado`; virar `monitorado` só depois do primeiro run real em produção (senão o selo da 23.4 mostraria "atrasado" em portal que ainda não foi coletado). Registrar isso para a 23.8b.

## Critérios de aceitação

**AC1 — SIOPE em JSON**
- Given `--portal P --only siope` · When roda · Then grava `data/raw_runs/P/<timestamp>/siope_indicadores/indicadores.json` com as mesmas linhas que hoje iriam para `raw_siope.siope_indicadores`, e nada é gravado no banco pelo extrator.
- And `elt/load/run.py` carrega o arquivo (`ensure_siope_table` + `load_siope_indicadores`, mesmo upsert por `KEY_COLS`) e acumula `rows_loaded["siope"]`, gerando a linha em `raw_coletas.registro_coletas` com `fonte=siope`, `frequencia_esperada=mensal`.
- And erro do SIOPE (`SiopeError`) não deixa arquivo parcial.

**AC2 — SIOPS em JSON**
- Igual ao AC1 com `siops` / `siops_indicadores` / `raw_siops` / `rows_loaded["siops"]`.
- And a divergência do 3.2 entre as duas vias (e via incompleta) continua erro explícito sem JSON.
- And o log registra a duração das requisições mais lentas (hoje em `extractor.metricas`) também na via `run.py`, para o critério de medição abaixo.

**AC3 — `--only` com várias chaves**
- `--only` passa a aceitar uma ou mais chaves (`--only siope siops`, `nargs="+"`). Chave desconhecida continua `ValueError` listando as válidas (agora incluindo `siope` e `siops`).
- Os conjuntos existentes (`siconfi`, `siconfi_msc`, `siconfi_rgf`, `pncp*`, `obrasgov`, `farmacia_sus`, listagens Fiorilli) mantêm o significado; `--only siconfi` continua rodando MSC e RGF.
- Sem `--only`: comportamento idêntico ao de hoje (decisão 2).
- `make elt/extract ONLY="siope siops"` funciona (checar o `$(if $(ONLY),--only $(ONLY))`).

**AC4 — Makefile e CLIs**
- `make elt/siope` e `make elt/siops` continuam existindo e passam a rodar `extract.run --only <chave>` + `load.run` por portal; `DRY_RUN` vira "só extrai e valida" (roda o extrator sem gravar JSON nem banco) ou é removido com nota, a critério do dev, desde que não grave no banco.

**AC5 — Medição do primeiro run mensal do SIOPS (herdado da 25.2)**
- Timeout, limite de taxa e repetição precisam ser medidos **a partir do CI**, o que depende do workflow da 23.8b e de autorização do Julio (regra 15). Esta story entrega o log necessário e deixa a seção "Evidência do primeiro run" em Implementation Notes marcada **PENDENTE**; o resultado é preenchido no fechamento da 23.8b.

## Fora do escopo

Execução em produção ou contra banco remoto; mudar o que cada extrator coleta; workflows e grupos de cadência (23.8b); dbt seletivo por grupo; alterar `seed_fontes_coleta.csv`; chave `portal_municipal` em `--only` (23.8b decide, o grupo diário referencia esse código).

## Testes (pytest, `make test` e `make check`)

- `elt/extract/__tests__/test_siope.py` e `test_siops.py`: ajustar para a nova assinatura; manter os casos de tudo-ou-nada e de divergência do 3.2.
- Novo: `run.py` escreve o JSON no caminho certo para cada fonte; erro do extrator não deixa arquivo e grava linha em `failed_requests.csv`; `--only siope siops` roda só os dois; sem `--only` não roda nenhum dos dois; chave inválida levanta `ValueError`.
- Novo: `load/run.py` carrega `siope_indicadores/` e `siops_indicadores/` e registra coleta com a frequência do seed (usar banco de teste efêmero; nada no banco local nem remoto de produção).
- Nomes e identificadores novos em inglês onde o código ao redor permitir; domínio fiscal segue em português.

## Regras do projeto que se aplicam

Regra 4 (`make test`, `make check`); regra 15 (só banco local/efêmero, 5544 local; `make db/test/build` apaga o banco local, usar `TEST_DATABASE_URL` 5545); regra 23 (nenhum slug de portal hard-coded: `portal_slug` vem do argumento); regra 19 (commits convencionais sem story/task).

## Implementation Notes

- `extrair_siope` / `extrair_siops` substituem `extract_and_load_*`: puros, devolvem linhas ou levantam `SiopeError`/`SiopsError`. CLIs próprios removidos.
- `extract/run.py`: `--only` com `nargs="+"`; blocos `siope`/`siops` só rodam quando nomeados; JSON em `<run_dir>/{siope,siops}_indicadores/indicadores.json` (`default=str` por causa de `Decimal` do SIOPS); erro vai para `failed_requests.csv` sem JSON; log das 3 requisições mais lentas do SIOPS (`slowest_requests`).
- `load/run.py`: ramo único para `siope_indicadores`/`siops_indicadores`, acumula `rows_loaded["siope"|"siops"]`. A chave é montada por variável, então o teste "toda fonte registrada é monitorada" (regex em `rows_loaded["..."]`) não as enxerga, o que é coerente com `nao_monitorado` no seed.
- Makefile: `elt/siope` e `elt/siops` exigem `PORTAL` e rodam `extract/run.py --only` + `load/run.py`. `DRY_RUN` removido (opção da spec): o extrator não grava mais no banco, então não havia o que simular.
- Testes: novo `test_run_siope_siops.py`; caso de carga em `test_coletas_loader.py`. `make check` ok; `make test` 445 passed.

### Evidência do primeiro run mensal do SIOPS

PENDENTE: depende da 23.8b e de autorização do Julio.
