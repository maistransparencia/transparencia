---
status: review
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

## Registro da implementação (2026-11-07)

### Entregue
- `elt/fontes/saude_datasus.yml` (uma entrada por UF; hoje RJ) e `elt/extract/saude_datasus.py` (CLI próprio, padrão das emendas estaduais: `make elt/saude-datasus [PORTAL=] [COMPETENCIAS=] [YEARS=] [DRY_RUN=1]`). Agrupa os portais por UF, então um arquivo serve a todas as cidades do Estado. Teste de cobertura: `elt/tests/test_cobertura_fontes_saude_datasus.py`.
- `elt/extract/saude_rede.py` agora só traz a população (API, 1 página por ano; página cheia falha). Removidos o `SaudeRedeExtractor`, as opções `--only saude_rede` e `saude_producao`, `--competencias` do `run.py`, o ramo `saude_rede` do `load/run.py`, `load_saude_rede_dir`, os alvos `elt/saude-rede` e `elt/saude-producao` do Makefile e `elt/scripts/contrato_api_saude.py` (media a API; o resultado dela segue registrado na 25.6a).
- Frase de contagem de profissionais trocada na tela e no `llms.txt` (passou pelo `editor-cidadao`): "pelo número do Cartão Nacional de Saúde (CNS)"; vínculo sem CNS não entra na contagem de pessoas.

### Decisões
1. **Dependência:** `datasus-dbc==0.1.3` (descompacta, extensão em C: o runner precisa de compilador, ubuntu-latest tem) e `dbfread==2.0.7` (Python puro), versões exatas. Medido: SIA de 2025-12 (2 partes) lido em ~140 a 170 s por parte; PF 22 s; LT e RD segundos. Um mês do RJ leva ~6 min no total, aceitável; alternativa mais rápida só se o backfill de 2021 em diante (~60 meses, ~6 h) incomodar.
2. **Fluxo e limpeza:** cada arquivo vai para uma pasta temporária própria (`tempfile`), é descompactado, lido linha a linha e apagado ao sair (inclusive em falha; teste cobre). Só as colunas mapeadas na configuração saem da linha: nome e CPF são descartados. Nada de dado pessoal em log.
3. **Pessoa distinta = CNS.** Vínculo sem CNS conta como vínculo e fica fora das pessoas; sem nenhum CNS legível, pessoas ficam vazias ("sem dado"), nunca zero.
4. **Descoberta:** lista a pasta uma vez por execução e casa por padrão (`PA{uf}{aamm}[a-z]?`); competência sem arquivo ou sem linha do município = sem dado.
5. **Leitos:** do arquivo `LT`; o código `TP_LEITO` vira o mesmo texto da API pela tabela `tipos_leito` do yml (o raw continua idêntico). Códigos 6 e 7 vieram da tabela nacional do CNES; o 6 apareceu no arquivo de Porciúncula, o 7 não foi visto (NÃO VERIFICADO contra o arquivo).
6. **SIH:** total = número de linhas (1 linha por AIH). **SIA:** `PA_QTDAPR`.
7. **Cadência:** 4 últimas fechadas por padrão; `--competencias` e `--years` para backfill, só banco local. Nada antes de `ano_inicial_historico` (lido de `elt/transform/dbt_project.yml`, sem literal).
8. **Falha:** FTP com timeout de 60 s, 5 tentativas com espera 2, 4, 8, 16 s e retomada do download (`REST`); resposta 5xx não é repetida. As quatro fontes de uma competência são lidas antes de gravar; falha propaga e nada sai pela metade.

### Conferência real contra o FTP (RJ, 2025-12, sem gravar no banco)
Natividade: SIA 18.282, SIH 63, leitos 7/5, 16/12, 3/2, 7/6, 7/6 (iguais aos da API), profissionais 500 vínculos, 429 pessoas, 384 SUS. Porciúncula: SIA 44.359, SIH sem linha (a API também vinha vazia), profissionais 635/528/417. Os números de 2026-05 do spike (28/27 leitos, 695/548/438 profissionais de Porciúncula) não foram refeitos nesta execução: os testes automáticos usam amostras pequenas, não o arquivo real, e só a diferença `PA_QTDAPR` x `PA_QTDPRO` e as regras de contagem estão travadas neles.

### Parecer do `jurista-fiscal` (sem advogado humano, risco aceito pelo Julio)
Vale a decisão da 25.6a (CC BY-ND 3.0 declarada para o portal de dados abertos). **NÃO VERIFICADO:** termo de uso do FTP do DATASUS e enquadramento na LGPD de ler o CNS só em memória. Mitigação: a tela cita Ministério da Saúde/DATASUS e a competência, mostra só totais, nunca nome, CPF nem CNS; arquivos apagados ao fim. Revisão de advogado recomendada antes de escalar para outros Estados ou produção.

### Gates (banco local; `DATABASE_URL` não exportado)
`make check`, `make test` (394), `pnpm typecheck`, `pnpm lint`, `make db/test/build` e `make test/ts` passaram.

### Teste de contrato no GitHub Actions (ubuntu-latest, run 42413991963, 2026-11-07, RJ 2025-12)
Roteiro: `elt/scripts/contrato_ftp_datasus.py` (workflow temporário disparado por push na branch e removido em seguida; para repetir, recriar um workflow com `pip install uv`, `uv sync --project elt --no-dev` e `--competencia AAAAMM`). Job de 15 min 44 s, 0 falhas, 0 repetições com espera, conexão de saída ao FTP anônimo funcionou.

| Etapa | Arquivo | Baixado (MB) | `.dbf` (MB) | Segundos |
|---|---|---|---|---|
| listar pasta (leitos / profissionais / SIA / SIH) | 6.804 / 6.858 / 54.761 / 23.033 nomes | | | 1,9 / 1,1 / 2,3 / 1,6 |
| leitos | LTRJ2512 (3.943 linhas) | 0,0 | 0,4 | 1,1 download, 0,1 leitura |
| profissionais | PFRJ2512 (544.929 linhas) | 28,2 | 125,3 | 25,3 download, 18,8 descompactar, 13,5 leitura |
| SIA parte a | PARJ2512a (4.555.669 linhas) | 150,8 | 1.908,8 | 127,5 / 105,7 / 226,2 |
| SIA parte b | PARJ2512b (3.638.073 linhas) | 120,4 | 1.524,4 | 104,6 / 84,1 / 179,5 |
| SIH | RDRJ2512 (76.232 linhas) | 6,0 | 53,7 | 6,3 / 4,0 / 6,9 |
| repetição com conexão nova (listar e baixar leitos), 3 vezes | | | | 3,3 / 2,9 / 3,2 |

- Disco: 93 GB livres, o maior arquivo descompactado usou ~1,9 GB (uma parte do SIA por vez; as partes não ficam juntas). Cabe com folga no runner.
- Tempo: o runner levou ~15 min para o RJ em 2025-12 (download mais lento que no Mac: ~1,2 MB/s no SIA contra ~4 MB/s). Por mês fechado, conte 15 a 20 min por UF no Actions, **independente do número de cidades**. Backfill de 2021 em diante (~60 meses) passa de 15 h: só manual, em partes, no banco local.
- Estabilidade: nenhuma queda no runner. Na carga local houve 1 timeout de download (`PFRJ2608`) e a retomada com nova tentativa resolveu sozinha.
- Para a 23.8: grupo mensal; cabe num job do Actions (limite de 6 h por job) para o RJ; com várias UF, um job por UF.

### Carga no banco local (5544, `.env`)
Rodado `make elt/saude-datasus` sem argumentos: as 4 últimas fechadas (2026-07 a 2026-10). Upsert: nada foi apagado; 2026-07 sobrescreveu as linhas da API (mesma saída), 2026-08 e 2026-09 são novas. CNES de 2026-10 e SIA de 2026-09 e 2026-10 ainda não existem no FTP (sem linha, "sem dado"). Os marts foram reconstruídos (dbt 12/12). A população não foi rebuscada (2026 ainda sem dado na API; as linhas anteriores permanecem). Para levar a produção, a intenção do Julio é copiar as tabelas `raw_saude_rede` com todos os dados (execução em produção só com autorização, Regra 15); o backfill de 2021 em diante ainda não foi feito.

### Pendente
- Backfill de anos anteriores: descartado (decisão do Julio). Só o ano atual, acumulando daí; anos anteriores aparecem como "sem dado da fonte".
- Revisão de texto da tela (rótulo para anos anteriores, como "ainda não carregado pelo portal"): fica para depois da Story 25.10, com o `editor-cidadao`.
- Revisão de código da 25.6c (os commits desta sessão: implementação, remoção do workflow temporário e esta atualização de documentos; os dois primeiros foram enviados, o de documentos não).
