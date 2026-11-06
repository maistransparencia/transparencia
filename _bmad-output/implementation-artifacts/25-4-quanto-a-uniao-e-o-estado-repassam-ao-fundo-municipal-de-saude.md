---
status: ready-for-dev
---

# Story 25.4: Quanto a União e o Estado Repassam ao Fundo Municipal de Saúde

Critérios de aceite completos: `planning-artifacts/epics.md`, Story 25.4 (Epic 25). Este arquivo guarda só o contexto de execução.

## Pergunta do cidadão (Regra 27)

"Quanto a União e o Estado repassam ao Fundo Municipal de Saúde?" A receita do fundo **não inclui** os recursos próprios da Prefeitura; o aviso fixo no bloco diz isso. Sem estimativa, sem SIOPS 3.1 na tela (decisão do Julio, 2026-11-06).

## Padrão a seguir

- dbt: `elt/transform/models/marts/metrics/fct_educacao_origem_recursos_metricas.sql` e seu `.yml` (folhas do plano de contas, `totais_oficiais`, `nao_detalhado`, contrato enforced, `accepted_values`).
- Query: `packages/db/src/queries/educacao-origem-recursos.ts` (DTOs camelCase, ano parcial via `dim_metadata.last_extracted_at`).
- Tela: hero e blocos de `/educacao` (Story 24.12 em `epics.md`); `DESIGN.md` e `EXPERIENCE.md` lidos antes (Regra 25).
- Skill de dbt: `dbt-transparencia`.

## O que a consulta ao banco local mostrou (Porciúncula, `empresa_id` 2)

- Órgão: `FUNDO MUNICIPAL DE SAUDE` (Natividade: `FUNDO MUNICIPAL DE SAÚDE`, com acento). Filtro: `unaccent(orgao_nome) ilike '%saude%'`; a extensão `unaccent` já existe no banco.
- Receita do fundo 2024: R$ 20,47 mi (União SUS R$ 18,64 mi, capital da União R$ 0,35 mi, Estado R$ 1,09 mi, resto rendimento e devoluções). 2023: R$ 16,93 mi de correntes.
- Esfera pela natureza: `1710`/`1713` e `2410`/`2411` União; `1720`/`1723` Estado. O `codigo_fonte_stn` (1600, 1601, 1621, 1605...) **não** diz a esfera sozinho: a fonte 1621 aparece em naturezas `1713` (União) e `1723` (Estado). Decidir pela natureza.
- A tabela traz linhas em todos os níveis (pai e folha, algumas com `codigo_fonte_stn` nulo): usar só folhas, como na educação.
- Tabela de naturezas anterior a 2022 pode diferir (como na educação: 1758.01, 1718.x). Verificar com dados de anos anteriores antes de fechar os prefixos.
- O SIOPS 3.1 (`percentual_transferencias_saude` × `despesa_total_saude`) deu R$ 12,98 mi em 2023 e R$ 16,50 mi em 2024; a União SUS no portal foi R$ 12,91 mi e R$ 18,64 mi. Diferença sem causa provada, registrar em pendências.

## Fora do escopo

Estimativa da parcela da Prefeitura; SIOPS 3.1 na tela; Fundo Nacional de Saúde; emendas (25.5); posição final do bloco na página (25.10).

## Regras que valem

- Regra 15: só Docker local (`localhost:5544`). **Nunca** exportar `DATABASE_URL` do 5544 junto de `db/test/build` ou `pnpm test` (apaga o banco local).
- Regras 2, 9, 10, 20, 23, 25 e 27. Skills de apoio: `contador-publico` (naturezas e esferas), `jurista-fiscal` (base legal), `editor-cidadao` (textos).
- Após alterar: `make test` e `make check` (dbt), `make test/ts` e `pnpm typecheck` (TypeScript).
- Commits convencionais em minúsculas, sem referência a story (Regra 19). Não commitar sem pedir ao Julio.
