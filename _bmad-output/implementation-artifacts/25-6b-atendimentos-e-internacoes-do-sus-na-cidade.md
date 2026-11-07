---
status: ready-for-dev
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
