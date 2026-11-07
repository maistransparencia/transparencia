---
status: review
---

# Story 25.6b: Atendimentos e Internações do SUS na Cidade

Critérios de aceite completos: `planning-artifacts/epics.md`, Story 25.6b (Epic 25). Este arquivo guarda só o contexto de execução. Depende da 25.6a (revisada e liberada na `feature/epic25-story-25-6`); ler a seção "Registro da implementação" do arquivo da 25.6a antes de começar.

## Pergunta do cidadão (Regra 27)

"Quantos atendimentos e internações o SUS fez na cidade?" Resposta com comparação com o ano anterior e por habitante, sempre com a fonte e a data da competência. Sem régua numérica e sem "adequado" ou "insuficiente".

## Padrão a seguir (herdado da 25.6a)

- Extrator: `SaudeRedeExtractor` em `elt/extract/saude_rede.py`, usando `_paginas`. Custo medido: cerca de 0,3 s por página.
- Mart: `fct_saude_rede_por_mil_moradores_metricas` é o modelo de referência: competência mais recente por (`portal_slug`, `ano`), vazio vira nulo, população estimada marcada. Mesmo desenho para atendimentos e internações por habitante.
- Query em `packages/db/src/queries/`, DTOs camelCase, intervalo de anos real da série; tela só renderiza (Regra 2).
- Tela: bloco de `/saude`; `DESIGN.md` e `EXPERIENCE.md` lidos antes (Regra 25). A posição final é da 25.10.
- Skills: `dbt-transparencia`, `editor-cidadao`, `jurista-fiscal`, `contador-publico` (se algum valor financeiro entrar).

## Fontes (spike 25.1, seção 5)

- `/assistencia-a-saude/sia-procedimentos-ambulatoriais`: por unidade e procedimento. Competência 2026-06 respondeu; 2026-07 vazia (defasagem de 1 a 2 meses).
- `/assistencia-a-saude/sih-procedimentos-hospitalares`: competência 2025-12 respondeu.
- Código IBGE de 6 dígitos nas duas; população residente com 7 (já resolvida na 25.6a). Sempre a partir do `cod_ibge` do portal.
- **Armadilha:** sem `nu_comp` ou `nu_ano` a API devolve a competência mais antiga.

## O que a 25.6a já provou (não repetir, mas não confiar além disso)

- Teste de contrato no runner: SIA e SIH devolveram HTTP 200, sem 429 e sem timeout. O SIH veio vazio em 1 dos 2 portais nas 3 passadas, o que vira "sem dado nesta fonte", nunca zero.
- **Lacuna:** a medição só viu status e linhas vazias, **não o formato** das respostas de SIA e SIH. Antes de desenhar o schema, ler uma resposta real no ambiente local e verificar se a paginação se comporta como a do CNES (`offset` é número de página; o CNES devolve 1 linha por página e ignora `limit`).

## Decisões a deixar explícitas na implementação

1. **Campos que entram no schema** de SIA e SIH. A spike não os listou. Registrar aqui a lista final e o porquê de cada um; nada que identifique pessoa física.
2. **Definição de "atendimentos" e "internações".** São a produção registrada e paga pelo SUS na cidade, não todo o atendimento. Decidir a unidade (quantidade de procedimentos, de AIH aprovadas, etc.) com base no que a fonte entrega e escrever a definição em uma frase para a tela (`editor-cidadao`). O texto não pode sugerir que é o total de atendimentos da cidade.
3. **Defasagem de 1 a 2 meses.** O ano em curso é parcial e a competência mais recente vem vazia. A tela mostra até onde a fonte tem dado, com a data, e a comparação com o ano anterior precisa dizer que o ano em curso está incompleto (Regra 27); não comparar ano parcial com ano cheio sem aviso.
4. **SIH vazio.** Estado "sem dado nesta fonte" na query e na tela, com texto neutro que não conclui nada sobre a Prefeitura (indício, nunca acusação).

## Decisão do jurista sobre licença e uso (sem advogado humano, risco aceito pelo Julio)

Vale o que está em `epics.md`, Story 25.6a, "Decisões jurídicas": a tela cita o Ministério da Saúde, a API e a data da competência; reproduz os números como estão; identifica "por habitante" como cálculo do portal (dado derivado). Sem régua numérica. A licença declarada no portal de dados abertos é CC BY-ND 3.0, sem termo verificado para a API; revisão de advogado fica recomendada antes de escala e não bloqueia.

## Pendências repassadas pela revisão da 25.6a (por decisão do Julio, ao `editor-cidadao`)

- Rótulo "Leitos hospitalares" e `llms.txt` ("leitos de internação") divergem da soma de todos os tipos de leito do CNES. Alinhar o texto ao que o número mede.
- A frase "conta uma vez só" deve dizer que é contagem aproximada por nome.

Entram aqui só se a 25.6b tocar nesses textos; senão ficam registradas e seguem para o `editor-cidadao`.

## Dívidas conhecidas do extrator (`deferred-work.md`)

- `_paginas` para ao ver duas páginas idênticas seguidas, e `MAXIMO_PAGINAS=5000` aborta o portal inteiro em município grande.
- Faltam testes do extrator para página repetida, limite e falha no meio da paginação.

SIA e SIH usam `_paginas`: se o volume deles chegar perto do limite, isso deixa de ser dívida e vira bloqueio. Medir o número de páginas por competência antes de fechar o desenho.

## Fora do escopo

Fila de espera, Previne Brasil, vacinação, transporte sanitário e hemodiálise (backlog); régua numérica; execução em produção; cadência de carga (Story 23.8).

## Regras que valem

- Regra 15: só Docker local (`localhost:5544`). **Nunca** exportar `DATABASE_URL` do 5544 junto de `db/test/build` ou `pnpm test` (apaga o banco local). Nunca rodar `elt/extract` contra produção.
- Regras 2, 9, 10, 20, 23, 25 e 27. Anos antes de 2021 não importam (mart filtra `ano >= 2021`).
- Após alterar: `make test` e `make check` (dbt), `make test/ts` e `pnpm typecheck` (TypeScript).
- Commits convencionais em minúsculas, sem referência a story (Regra 19). Não commitar sem pedir ao Julio.

## Registro da implementação

### Achados da API (2026-11-07, leitura real; formato que a 25.6a não viu)

- Campos de SIA: `nu_comp`, `co_ibge`, `co_cnes`, `ds_grupo_nat_jur`, `ds_procedimento`, `ds_complex_procedimento`, `qt_procedimento`, `nu_valor_procedimento`, `ds_tp_unidade` (e códigos). Campos de SIH: os mesmos, mais `ds_financiamento`; `qt_procedimento` é a quantidade de AIH/procedimentos, `nu_valor_procedimento` o valor aprovado. Sem identificação de pessoa física em nenhum dos dois.
- Os dois aceitam `nu_comp` e `nu_ano` (o CNES só aceita `nu_comp`). Paginação: `offset` é número de página, como no CNES.
- **`nu_ano` devolve linhas duplicadas** entre páginas (5 páginas: 60 linhas, 16 distintas por competência, unidade e procedimento) e o tamanho da página varia com `limit` (limit 3 → 1 linha; limit 100 → 2; limit 1000 → 12). Somar por ano com `nu_ano` infla os totais. **`nu_comp` devolve linhas únicas** (6 de 6) e 1 linha por página.
- Volume por competência (dezembro de 2025): SIA de Porciúncula = **297 páginas** (~5.400 procedimentos); SIH de Natividade = 26 páginas; SIH de Porciúncula vazio em 2025 inteiro (confirma o estado "sem dado nesta fonte").
- Custo: ~0,8 s por página de SIA (0,3 s de resposta mais intervalo e latência), logo ~4 min por competência e **~50 min por ano por portal** só no SIA. Backfill de 2021 a 2026 passa de 5 h por portal. O limite de 5000 páginas do `_paginas` não é atingido nestes dois portais (3313 páginas/ano via `nu_ano`; 297 por competência via `nu_comp`), mas um município maior estoura em 1 competência de SIA.

### Decisões (aprovadas pelo Julio em 2026-11-07)

1. **Campos que entram:** só `qt_procedimento` (somado por competência). Fora: valores em reais (`nu_valor_procedimento`, evita o escopo do `contador-publico`), unidade, procedimento, CNPJ e nome fantasia (nada de identificação além do necessário). Schema `raw_saude_rede`: `sia_competencia` (`total_procedimentos_ambulatoriais`) e `sih_competencia` (`total_internacoes`), chave `(portal_slug, competencia)`.
2. **Definições:** "atendimentos sem internação" = procedimentos ambulatoriais pagos pelo SUS (cada consulta, exame ou procedimento conta um); "internações" = AIH pagas pelo SUS (a descrição do endpoint do SIH fala em "quantidade de AIH"). Texto da tela diz que não é todo o atendimento da cidade (sem particular nem plano de saúde).
3. **Defasagem e ano em curso:** o mart soma as competências carregadas por ano e traz `competencias_*`, `ultima_competencia_*` e `ano_completo_*` (12 competências). O indicador usa o ano completo mais recente; o ano em andamento aparece só em aviso "dados até MM/AAAA" e na tabela, nunca comparado com ano cheio.
4. **SIH vazio:** sem linha no raw, nulo no mart e no DTO, "sem dado nesta fonte" na tela com texto neutro.
5. **Cadência (sem `nu_ano`):** a extração é por competência (`nu_comp`), porque `nu_ano` repete linhas. Extração incremental: o `elt/extract/run.py --only saude_producao` busca por padrão as 4 últimas competências fechadas; `--competencias` faz o backfill manual em partes. `make elt/saude-producao [PORTAL=] [COMPETENCIAS="..."]`. Backfill de 2021 em diante só no banco local (Regra 15); em produção só com autorização do Julio.
6. **Dívidas da paginação resolvidas:** `_paginas` deixou de parar em 2 páginas idênticas (1 linha por página pode repetir legitimamente) e falha após 3 páginas idênticas seguidas (API ignorando `offset`); `MAXIMO_PAGINAS` subiu para 20000 e é configurável (`maximo_paginas`); testes de página repetida, limite e falha no meio. Falha de rede continua propagando (nada parcial é gravado).
7. **Pendências da 25.6a repassadas ao `editor-cidadao`:** rótulo "Leitos hospitalares" virou "Leitos existentes" e "Leitos do SUS"; `llms.txt` alinhado ("leitos existentes de todos os tipos"); "conta uma vez só" agora diz contagem aproximada pelo nome.

### Verificação

- Smoke real (só leitura da API, sem banco): Natividade, competência 202512: 18.282 procedimentos ambulatoriais e 63 internações, 63 s.
- Gates: `make test` (383), `make check`, `pnpm typecheck`, `pnpm lint`; vitest de `packages/db` (411, banco 5545) e `apps/web` (1734). Nada rodou no 5544.
- Pendência de ambiente: nenhuma carga real foi feita no banco local; o backfill é decisão do Julio.
