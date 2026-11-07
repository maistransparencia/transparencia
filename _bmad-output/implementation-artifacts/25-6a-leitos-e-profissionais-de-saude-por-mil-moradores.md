---
status: ready-for-dev
---

# Story 25.6a: Leitos e Profissionais de Saúde por Mil Moradores

Critérios de aceite completos: `planning-artifacts/epics.md`, Story 25.6a (Epic 25). Este arquivo guarda só o contexto de execução.

## Pergunta do cidadão (Regra 27)

"Quantos leitos e profissionais de saúde há para cada mil moradores, comparado a anos anteriores?" Sem régua numérica e sem "adequado" ou "insuficiente" (decisão do `jurista-fiscal`, registrada em `epics.md`). "Por mil moradores" é cálculo do portal (dado derivado) e a tela diz isso.

## Padrão a seguir

- Extrator: `elt/extract/farmacia_sus.py`, mesma API (`apidadosabertos.saude.gov.br`). Reaproveitar `_request` (limite de taxa, repetição com espera crescente, timeout), `_extrair_registros`, `codigo_ibge6` e `_competencia_cnes`. Não copiar: extrair o que for comum se a duplicação aparecer.
- dbt: seguir a Story 25.4 (`elt/transform/models/marts/metrics/fct_educacao_origem_recursos_metricas.sql` e `.yml`, contrato enforced, `accepted_values`) e o schema por fonte com `portal_slug` na chave (Story 24.9).
- Query: `packages/db/src/queries/` (DTOs camelCase, intervalo de anos real da série).
- Tela: bloco de `/saude`; `DESIGN.md` e `EXPERIENCE.md` lidos antes (Regra 25). Posição final na página é da 25.10.
- Skills: `dbt-transparencia`, `editor-cidadao`, `jurista-fiscal`.

## Fontes (spike 25.1, seção 5)

- `/assistencia-a-saude/cnes-leitos` (`co_ibge`, `nu_comp`): leitos existentes e SUS. Competência 2026-05 respondeu; 2026-09 veio vazia.
- `/assistencia-a-saude/cnes-profissionais`: **traz nome de pessoa física**. Agregar na ingestão; o nome nunca é gravado nem exibido.
- `/vigilancia-e-meio-ambiente/svsa-populacao-residente`: por ano, sexo e idade, com `cod_mun` de **7 dígitos** (com 6 vem vazio). Até 2025; 2026 vazio.
- Código IBGE: 6 dígitos no CNES, 7 na população. Converter sempre a partir do `cod_ibge` do portal.
- **Armadilha:** sem `nu_comp` ou `nu_ano` a API devolve 2008. Sempre filtrar.

## Decisões jurídicas (resumo; texto completo em `epics.md`)

- Sem régua numérica. Base: Portaria de Consolidação GM/MS 1/2017, arts. 102 a 106 (parâmetros indicativos, ajustáveis por município; valores não verificados).
- Proibida a faixa de 2,5 a 3 leitos por mil (Portaria 1.101/2002, revogada).
- Licença: tela cita Ministério da Saúde, API e data da competência; "por mil moradores" aparece como cálculo do portal. Risco aceito pelo Julio, sem advogado humano.

## Para decidir na hora de implementar

- Quais campos de cada endpoint entram no schema (a spike não os listou). Ler uma resposta real no ambiente local antes de desenhar a tabela.
- Como tratar o ano em curso (competência mais recente sem resposta): mostrar até onde a fonte tem dado, com a data.
- Se a população residente de anos futuros (2026 vazio) usa o último ano disponível. Se usar, a tela diz que é estimativa (Regra 27).
- Teste de contrato no ambiente da carga diária: roteiro (uma passada por endpoint, com repetição e medição) e resultado registrados aqui; a 25.6b depende dele.

## Fora do escopo

SIA e SIH (25.6b); fila de espera, Previne Brasil, vacinação, transporte e hemodiálise (backlog); régua numérica; execução em produção; cadência de carga (Story 23.8).

## Regras que valem

- Regra 15: só Docker local (`localhost:5544`). **Nunca** exportar `DATABASE_URL` do 5544 junto de `db/test/build` ou `pnpm test` (apaga o banco local). Nunca rodar `elt/extract` contra produção.
- Regras 2, 9, 10, 20, 23, 25 e 27. Anos antes de 2021 não importam (mart filtra `ano >= 2021`).
- Após alterar: `make test` e `make check` (dbt), `make test/ts` e `pnpm typecheck` (TypeScript).
- Commits convencionais em minúsculas, sem referência a story (Regra 19). Não commitar sem pedir ao Julio.
