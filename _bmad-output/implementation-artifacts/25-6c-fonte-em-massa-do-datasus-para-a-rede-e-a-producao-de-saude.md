---
status: ready-for-dev
---

# Story 25.6c: Fonte em Massa do DATASUS para a Rede e a Produção de Saúde

Critérios de aceite completos: `planning-artifacts/epics.md`, Story 25.6c (Epic 25). Este arquivo guarda só o contexto de execução. Depende das Stories 25.6a e 25.6b (revisadas); ler a seção "Registro da implementação" de cada uma antes de começar. A cadência de carga é da Story 23.8, que já recebeu os números abaixo.

## Por que existe

A API de dados abertos devolve 1 linha por página: profissionais de uma competência levam 4 a 5 min por portal (Natividade: 507 páginas, 263 s), o SIA ~300 páginas por mês, e a carga completa passa de 1 h por portal. O custo cresce com o número de cidades (Brasil inteiro: ~16 dias de leitura por ano de dados). Os arquivos mensais por estado do DATASUS custam minutos por UF, para todas as cidades dela, e reproduzem exatamente os números da API (spike de 2026-11-07).

## O que o spike já provou (não repetir; refazer só a conferência em teste)

| Fonte | Arquivo (RJ) | Conferência |
|---|---|---|
| CNES leitos | `CNES/200508_/Dados/LT/LTRJ2605.dbc` (46 KB) | Porciúncula 2026-05: 28 existentes e 27 SUS |
| CNES profissionais | `CNES/200508_/Dados/PF/PFRJ2605.dbc` (29 MB) | Porciúncula 2026-05: 695 vínculos, 548 pessoas, 438 SUS |
| SIA | `SIASUS/200801_/Dados/PARJ2512a.dbc`, `b` (mês em partes a, b, c; ~150 MB cada) | Natividade 2025-12: 18.282 (`PA_QTDAPR`; `PA_QTDPRO` dá 18.283) |
| SIH | `SIHSUS/200801_/Dados/RDRJ2512.dbc` (6 MB) | Natividade 2025-12: 63 AIH (`MUNIC_MOV`) |

- Host: `ftp.datasus.gov.br`, anônimo, pasta base `/dissemin/publicos/`. Arquivos `.dbc` (DBF comprimido); no spike, `datasus-dbc` descompacta e `dbfread` lê (latin-1).
- Campos de município (6 dígitos): `CODUFMUN` (CNES), `PA_UFMUN` (SIA), `MUNIC_MOV` (SIH). Competência: `COMPETEN` (CNES), `PA_CMP` (SIA), `ANO_CMPT` e `MES_CMPT` (SIH).
- Campos de contagem: leitos `TP_LEITO`, `QT_EXIST`, `QT_SUS`; profissionais `CNS_PROF` (pessoa), `PROF_SUS` (`'1'` é SIM), `NOMEPROF` (**nunca gravar**); SIA `PA_QTDAPR`; SIH uma linha por AIH.
- Tempos: download do SIA do mês (271 MB) 62 s; leitura de 8,2 milhões de linhas com `dbfread` 136 s; `.dbf` descompactado do SIA do mês ~3,4 GB. Uma listagem do FTP deu timeout.
- Defasagem em 2026-11-07: CNES até 2026-09, SIA até 2026-08.

## Padrão a seguir

- Configuração por UF e teste de cobertura: `elt/fontes/emendas_estaduais.yml` e `elt/tests/test_cobertura_fontes_emendas_estaduais.py` (Regra 28 em `.claude/rules/dbt-sql.md`). Sem `if` por UF no extrator.
- Saída idêntica à de hoje: mesmas tabelas do `raw_saude_rede` (`elt/load/saude_rede.py`), mesmas funções de agregação onde servirem (`agregar_*` em `elt/extract/saude_rede.py`). O mart, a query e a tela não mudam.
- Skills: `jurista-fiscal` (termo de uso dos arquivos), `editor-cidadao` (frase de contagem de profissionais), `dbt-transparencia` se tocar o raw.

## Decisões a deixar explícitas na implementação

1. **Dependência de leitura do `.dbc`** em versão exata (Regra 7). `datasus-dbc` no spike; avaliar velocidade e manutenção. Se o backfill passar de poucas horas, medir alternativa mais rápida que `dbfread`.
2. **Processamento em fluxo e limpeza:** o `.dbf` do SIA do mês chega a ~3,4 GB. Descompactar para pasta temporária própria, ler, agregar e apagar, inclusive em falha. O arquivo de profissionais traz nome, CPF e CNS: nunca grava, nunca loga.
3. **Pessoa distinta por CNS** (substitui o nome). Decidir o que fazer com linhas sem CNS e registrar. Texto "contagem aproximada pelo nome" sai da tela (`editor-cidadao`).
4. **Descoberta de arquivos:** nome por padrão (`PF{UF}{AAMM}`, `LT{UF}{AAMM}`, `PA{UF}{AAMM}{a,b,c...}`, `RD{UF}{AAMM}`); SIA em número variável de partes, então listar a pasta e casar por padrão. Competência ausente = "sem dado".
5. **Leitos:** passam para o arquivo `LT` (46 KB); a população continua na API.
6. **Cadência:** incremental, 4 últimas competências fechadas por padrão, `--competencias` para backfill manual (só banco local). Entrar na carga mensal é da 23.8.

## Fora do escopo

Fila de espera, Previne Brasil, vacinação, transporte sanitário e hemodiálise; execução em produção; mudar raw, mart, query ou tela (salvo o texto de contagem de profissionais); cadência de carga (23.8).

## Regras que valem

- Regra 15: só Docker local (`localhost:5544`). **Nunca** exportar `DATABASE_URL` do 5544 junto de `db/test/build` ou `pnpm test` (apaga o banco local); para os testes do `db` use `DATABASE_URL` do 5545 explícito. Nunca rodar `elt/extract` contra produção.
- Regras 2, 7, 9, 10, 23, 25, 27 e 28. O corte de ano vem da variável dbt `ano_inicial_historico` (`dbt_project.yml`), nunca de literal no SQL ou no Python; anos antes dele não importam.
- Após alterar: `make test`, `make check`, `make test/ts` e `pnpm typecheck`.
- Commits convencionais em minúsculas, sem referência a story (Regra 19). Não commitar sem pedir ao Julio.
