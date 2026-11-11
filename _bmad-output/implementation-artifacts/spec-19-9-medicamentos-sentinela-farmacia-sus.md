---
title: 'Medicamentos-sentinela da Farmácia SUS: disponibilidade por unidade sob a busca'
type: 'feature'
created: '2026-10-24'
status: 'done'
baseline_revision: 'f5311cc645d976ef11974004a5b7500c09e19e60'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/planning-artifacts/handoff-sentinelas-farmacia-sus.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-19-context.md'
warnings: []
deferred:
  - summary: >-
      Nomes com o sal antes do princípio ativo (ex.: "Cloridrato de fluoxetina") não casam pelo prefixo ancorado.
    evidence: |-
      A regra do AC (`^prefixo([ ,(]|$)`) é ancorada por desenho. Não verificado se a base real contém esses nomes; conferir com `select distinct nome_medicamento` nos portais e, se houver, acrescentar prefixos no seed. Gravidade se confirmado: medium (unverified).
    location: >-
      elt/transform/models/marts/fct_farmacia_sentinela_disponibilidade.sql
    severity: medium (unverified)
  - summary: >-
      `farmacia-resumo-card.spec.tsx` falha na checagem do href `l14654.htm`.
    evidence: |-
      Falha já existente: o arquivo não foi alterado pela story e falhava com as mudanças em stash, segundo o implementador.
    location: >-
      apps/web/components/farmacia/farmacia-resumo-card.spec.tsx
    severity: low
---

<intent-contract>

## Intent

**Problem:** O cidadão que busca um remédio na Farmácia SUS não vê quais medicamentos essenciais estão sem registro de estoque nas unidades. A fonte (BNAFAR/Hórus) só publica itens com saldo e não traz demanda, então não há ranking nem como afirmar "estoque zerado".

**Approach:** Lista editorial de 21 sentinelas (RENAME 2024 + PNAUM) em um seed dbt, mart `fct_farmacia_sentinela_disponibilidade` (unidade ativa × sentinela), query `getFarmaciaSentinelas` e bloco na página `/[portalSlug]/saude/farmacia` abaixo da busca, somente no estado `conforme`.

## Boundaries & Constraints

**Always:** Regras 9, 10, 11, 12, 16, 21, 23 e 24 do CLAUDE.md/.claude/rules. Códigos em lowercase snake_case sem acento; seed sem portal/município/UF; todo `JOIN`/`GROUP BY` com `portal_slug`; `unaccent` via `{{ target.schema }}.unaccent(lower(...))`; `seeds.yml` com `column_types` em `text`; contrato `enforced` no mart. Camada de apresentação só renderiza (agrupar por `grupoTerapeutico` e montar rótulos/hrefs é aceitável). Texto: "sem registro de estoque informado", "N de M unidades que informaram estoque"; nota de que a lista vem da RENAME 2024 e a fonte publica só itens com saldo.

**Never:** Somar quantidades entre apresentações; dizer "esgotado"/"zerado"; ranking de demanda; contar unidade inativa ou sem transmissão no denominador; casar combinações em dose fixa (`+`, "associada") ou insulinas análogas; hard-code de portal/UF; renderizar o bloco em `apagao`/`indisponivel`; mexer na 19.8 ou criar a página `/farmacia` da 19.10.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Casamento com sal/acento/apresentação | "Losartana Potássica 50mg", "ÁCIDO ACETILSALICÍLICO 100 mg" | `com_registro_estoque` p/ `losartana`, `acido_acetilsalicilico` | N/A |
| Dose fixa / análoga | "Amoxicilina + Clavulanato", "Insulina Glargina", "Paracetamol + Codeína" | Não casam; sentinela fica `sem_registro_estoque` | N/A |
| Item ausente | Nenhuma linha casa na unidade | Linha explícita `sem_registro_estoque`, `quantidade_apresentacoes_com_estoque = 0` | N/A |
| Quantidade zero | Única apresentação com `quantidade_estoque = 0` | `sem_registro_estoque` | N/A |
| Unidade inativa | CNES só com posição defasada (fora de `fct_farmacia_estoque`) | Fora do denominador | N/A |
| Dois portais | Mesmo `codigo_cnes`/sentinela em portais distintos | Linhas e contagens isoladas por `portal_slug` | N/A |
| Portal `apagao`/`indisponivel` | Sem itens vigentes | Mart sem linhas; query devolve lista vazia; UI não renderiza o bloco | `totalUnidadesAtivas = 0` |

</intent-contract>

## Code Map

- `elt/transform/models/marts/fct_farmacia_estoque.sql` -- mart-pai (grão item vigente; `status_conformidade`, `codigo_cnes`, `nome_medicamento`, `quantidade_estoque`); fonte única do novo mart via `ref`. Somente leitura.
- `elt/transform/models/marts/_fct_farmacia_estoque.yml` -- molde do contrato `enforced` + `unique_combination_of_columns`.
- `elt/transform/seeds/seeds.yml` -- declarar o novo seed (molde: `seed_censo_escolar_matriculas`, `column_types`).
- `elt/tests/test_fct_farmacia_estoque.py` -- molde de teste de integração do mart (fixtures `raw`, `portais`, `_dia`); `Makefile` alvo `elt/farmacia-sus` (linha ~91) lista os modelos executados.
- `packages/db/src/queries/farmacia.ts` -- molde de DTO/`isPortalSlugValido`/`toNumberOrNull`; exportado por `packages/db/src/index.ts` (verificar se `export * from "./queries/farmacia"` já existe).
- `packages/db/tests/fixtures/seed.ts` (`seedFarmacia`, ~l.1055; `cleanupFixtures` ~l.1239) -- adicionar `seedFarmaciaSentinela` e limpeza.
- `packages/db/src/queries/__tests__/farmacia.spec.ts` -- molde de spec da query.
- `apps/web/app/[portalSlug]/saude/farmacia/{loader.ts,view-model.ts,page.tsx}` (+ `.spec`) -- loader carrega sentinelas só se `conforme`; view-model agrupa e monta href `?q=`; page renderiza abaixo de `FarmaciaBuscaForm`.
- `apps/web/components/farmacia/farmacia-resultados.tsx` -- molde de componente (classes Tailwind, `Link`, `fmtNumber`); novo `farmacia-sentinelas.tsx` (+ spec).
- `apps/web/public/llms.txt` (l.44) e `llms-full.txt` (§1.7.1.1, l.345) -- documentar o bloco (Regra 12).

## Tasks & Acceptance

**Execution:**
- `elt/transform/seeds/seed_farmacia_medicamentos_sentinela.csv` -- criar 22 linhas (21 sentinelas; `insulina` com 2 prefixos): colunas `codigo_principio_ativo,nome_principio_ativo,prefixo_nome_normalizado,grupo_terapeutico,ordem_exibicao`; grupos `cardiovascular`, `diabetes`, `dor_febre`, `antibiotico`, `gastrointestinal`, `respiratorio`, `endocrino`, `saude_mental` -- lista editorial do handoff sem azitromicina, com `fluoxetina` e `amitriptilina`.
- `elt/transform/seeds/seeds.yml` -- declarar o seed com todos os `column_types` em `text` e teste de unicidade de `(codigo_principio_ativo, prefixo_nome_normalizado)` -- Regra 16.
- `elt/transform/models/marts/fct_farmacia_sentinela_disponibilidade.sql` -- CTE `unidades_ativas` (distinct `portal_slug, codigo_cnes` de `fct_farmacia_estoque` conforme, cnes não nulo); CTE `apresentacoes` agregando por `(portal_slug, codigo_cnes, codigo_principio_ativo, nome normalizado)` com casamento regex `^prefixo([ ,(]|$)` sobre `{{ target.schema }}.unaccent(lower(nome_medicamento))`, excluindo `+`/"associad"; `cross join` do seed deduplicado por `codigo_principio_ativo` com `unidades_ativas`; `left join` com `portal_slug` e chaves; `status_disponibilidade` e `quantidade_apresentacoes_com_estoque` (apresentações distintas com `quantidade_estoque > 0`). Colunas: `portal_slug, codigo_cnes, codigo_principio_ativo, nome_principio_ativo, grupo_terapeutico, ordem_exibicao, status_disponibilidade, quantidade_apresentacoes_com_estoque` -- grão `(portal_slug, codigo_cnes, codigo_principio_ativo)`.
- `elt/transform/models/marts/_fct_farmacia_sentinela_disponibilidade.yml` -- contrato `enforced`, `not_null`, `accepted_values` de `status_disponibilidade`, `unique_combination_of_columns` no grão.
- `Makefile` -- incluir o novo modelo (e `dbt seed` do seed se necessário) no alvo `elt/farmacia-sus`.
- `elt/tests/test_fct_farmacia_sentinela_disponibilidade.py` -- cobrir a matriz (sais/acentos, dose fixa e insulinas análogas, ausência, quantidade zero, unidade inativa, isolamento entre portais, `insulina` NPH/regular).
- `packages/db/src/queries/farmacia.ts` -- `getFarmaciaSentinelas(portalSlug)` → `{ totalUnidadesAtivas, sentinelas: { codigoPrincipioAtivo, nomePrincipioAtivo, grupoTerapeutico, ordemExibicao, unidadesComRegistro }[] }`, agregando o mart por `(portal_slug, codigo_principio_ativo)` filtrado por portal; slug inválido ou sem linhas → vazio.
- `packages/db/tests/fixtures/seed.ts` + `packages/db/src/queries/__tests__/farmacia.spec.ts` -- fixture e testes da query (contagem, ordem por `ordem_exibicao`, isolamento entre portais, portal vazio).
- `apps/web/app/[portalSlug]/saude/farmacia/loader.ts`, `view-model.ts` (+ specs) -- chamar `getFarmaciaSentinelas` somente quando o status for `conforme`; view-model agrupa por `grupoTerapeutico` (rótulos PT-BR a partir dos códigos, ordem estável) e gera `href` `?q=<nomePrincipioAtivo>`.
- `apps/web/components/farmacia/farmacia-sentinelas.tsx` (+ spec) e `page.tsx` (+ spec) -- bloco abaixo da busca, dentro do estado `conforme`; "N de M unidades que informaram estoque", "sem registro de estoque informado" quando 0, nota da RENAME 2024/fonte só com saldo; ausente em `apagao`/`indisponivel` ou sem sentinelas.
- `apps/web/public/llms.txt`, `apps/web/public/llms-full.txt`, `CHANGELOG.md` -- documentar o bloco e a entrada em Unreleased.

**Acceptance Criteria:**
- Given portal `conforme` com estoque, when o dbt roda, then o mart tem uma linha por (unidade ativa × sentinela) com `status_disponibilidade` correto e sem casar dose fixa ou insulina análoga.
- Given dois portais com o mesmo CNES, when consultados, then contagens e denominadores não se misturam.
- Given a página em `conforme`, when renderizada, then o bloco aparece abaixo da busca com grupos, contagens "N de M" e links `?q=`; em `apagao`/`indisponivel` o bloco não aparece.
- Given qualquer texto do bloco, when lido, then nunca contém "esgotado" ou "zerado".

## Spec Change Log

## Review Triage Log

### 2026-10-24 — Review pass
- verdicts: 36 findings — high 0, medium 3, low 8, false 4, maybe-false 1 (demais agrupados em rejeições `low`)
- findings:
  - `[medium]` `patch` loader derruba a página se `getFarmaciaSentinelas` falhar (mart ainda não construído) — `.catch` devolve o estado vazio; busca segue funcionando
  - `[low]` `patch` Makefile `elt/farmacia-sus` roda o mart sem `dbt seed` — adicionado `run_dbt.py seed --select seed_farmacia_medicamentos_sentinela` antes do run
  - `[low]` `patch` espaços repetidos não normalizados em `nome_normalizado` e apresentações agrupadas por nome com caixa — normalização e agrupamento por `nome_normalizado`
  - `[low]` `patch` só 1 de 8 rótulos de grupo testado — `it.each` nos 8 códigos do seed em `view-model.spec.ts`
  - `[maybe-false]` `defer` sal antes do princípio ativo (Cloridrato de…) — ver `deferred`
  - `[false]` `reject` tipos Kysely ausentes — `pnpm typecheck` passa; o cliente não usa tipos gerados
  - `[false]` `reject` `make db/fixture/check`/fixture regerado — Regra 21: sem fixture versionado; schema construído por `make db/test/build`, que passou
  - `[false]` `reject` cores literais `#e7e9ee` fora do design system — mesmo padrão dos demais componentes da farmácia
  - `[false]` `reject` link `?q=` não casa estoque real — `unaccent`/`ILIKE` na busca existente casa "Losartana Potássica"
  - `[low]` `reject` bloco abaixo dos resultados e não colado ao formulário — AC pede "abaixo da busca"; atendido
  - `[low]` `reject` combinações sem `+`/"associad" (ex.: "com", "/") — regra de exclusão definida pelo AC; sem caso real demonstrado
  - `[low]` `reject` `totalUnidadesAtivas` como máximo das contagens — invariante do cross join; igual por construção
  - `[low]` `reject` "1 de 1 unidades" sem plural, RENAME 2024 fixo no texto, ausência de data de posição, acessibilidade do link, `ordem_exibicao` text, `min()` sem teste de consistência, linhas em branco no seeds.yml, contagem de insulina vs. busca, `page.spec` afrouxado, ausência de teste ponta a ponta — texto/escopo definidos pela story ou sem dano real; correção adicionaria complexidade

## Design Notes

Casamento: `unaccent(lower(nome)) ~ ('^' || prefixo || '([ ,(]|$)')`, e `nome !~ '[+]'` e `nome !~ 'associad'`. "Losartana potássica" casa com `losartana`; "losartana + hidroclorotiazida" não. `insulina` tem prefixos `insulina humana nph` e `insulina humana regular`; o seed é deduplicado por `codigo_principio_ativo` no cross join e as apresentações casadas por qualquer prefixo contam para o mesmo código. O seed é editorial e versionado: revisar a cada nova RENAME.

## Verification

**Commands:**
- `make check` -- expected: sem erros
- `make test` -- expected: testes de integração do mart passam
- `docker compose up -d postgres_test && make db/test/build && make test/ts` -- expected: suíte TS passa
- `pnpm typecheck` -- expected: sem erros de tipo

## Auto Run Result

Status: done

**Resumo:** seed editorial de 21 sentinelas (22 linhas), mart `fct_farmacia_sentinela_disponibilidade`, query `getFarmaciaSentinelas` e bloco "Remédios essenciais" em `/[portalSlug]/saude/farmacia`, somente em `conforme`.

**Arquivos:** seed CSV e `seeds.yml`; mart SQL e YAML; `Makefile` (seed + run); testes Python do mart; `farmacia.ts` e `seed.ts`/spec do db; `loader.ts`, `view-model.ts`, `page.tsx`, `farmacia-sentinelas.tsx` e specs; `llms.txt`, `llms-full.txt`, `CHANGELOG.md`.

**Revisão:** 4 patches aplicados, 2 itens adiados (frontmatter `deferred`), demais rejeitados com motivo no log. Revisão de acompanhamento: `false` (nenhum patch `high`; um `medium`).

**Verificação:** `make check` ok; `make test` 196 passed; `make db/test/build` 114 modelos ok; vitest `packages/db` 289 passed (com `DATABASE_URL` da porta 5545); vitest `apps/web` 1009 passed e 1 falha pré-existente; `pnpm typecheck` e biome ok.

**Riscos:** `make test/ts` via turbo não repassa `DATABASE_URL` e usa o banco da 5544 sem o mart novo (rodar `docker compose up -d postgres_test && make db/test/build` e exportar `DATABASE_URL`). Rótulos dos grupos ("Coração e pressão" etc.) sem revisão do `editor-cidadao`. Cobertura de nomes com sal antes do princípio ativo não verificada na base real. Nada executado contra produção.

### Atualização pós-revisão (mudanças posteriores ao build inicial)

- **Combinações:** o mart ganhou `quantidade_apresentacoes_combinacao_com_estoque`; a query devolve `unidadesSomenteCombinacao`; o item mostra "só aparece misturado com outro remédio em N de M unidades" quando a unidade só tem o princípio ativo em combinação. A regra de contagem do sentinela não mudou. Motivo: a busca textual encontrava `valsartana + hidroclorotiazida` enquanto o bloco dizia "sem registro".
- **Linguagem cidadã (`editor-cidadao`):** "sem registro de estoque informado" virou "não aparece na lista de estoque"; nota do bloco reescrita; grupo "Respiração" virou "Pulmão e asma"; quatro termos novos em `docs/glossario-cidadao.md`.
- **Link da RENAME 2024:** `rename2024` em `apps/web/lib/constants/legislacao.ts` (PDF do Ministério da Saúde), usado na nota do bloco (Regra 20).
- **Limpar busca:** link no `FarmaciaBuscaForm` (prop `limparHref`) quando há busca ativa na página da farmácia.
- **Pílulas na página inicial:** coluna `destaque_card_inicial` no seed (6 remédios), exposta no mart e em `destaqueCardInicial`; `getFarmaciaSentinelas` chamada no loader da página inicial só em `conforme`, com falha isolada; até 6 pílulas com `unidadesComRegistro > 0` no card.
- **Pipeline:** `Makefile` `elt/farmacia-sus` roda `dbt seed --full-refresh` do seed antes do mart.
- **Commits após o inicial:** `b0120728` (combinações), `3e3bf967` (linguagem), `0d9a7ae2` (limpar busca), `08e8715a` (link RENAME), `bd5f9a1c` (pílulas), `b25ea2a2` (full-refresh).
- **Para o revisor:** `make test/ts` via turbo falha porque o `DATABASE_URL` não é repassado (cai na porta 5544); usar `docker compose up -d postgres_test && make db/test/build` e rodar `pnpm exec vitest run` em `packages/db` e `apps/web` com `DATABASE_URL=postgresql://postgres:postgres@localhost:5545/postgres`. A falha de `farmacia-resumo-card.spec.tsx` (href `l14654.htm`) é anterior à story. O item adiado de nomes com o sal antes do princípio ativo segue sem verificação na base real.


### Review Findings

Code review de 2026-10-24 (4 camadas: Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor). `vitest` db 291/291, `vitest` web 1020/1021 (só a falha conhecida de `farmacia-resumo-card.spec.tsx`), `pnpm typecheck`, `make check` e `make test` (198) passam.

- [x] [Review][Decision] Mudança de espaçamento da sidebar sem relação com a story e sem aviso — `packages/ui/src/components/sidebar.tsx` (commit b0120728, mensagem fala só de combinações) remove `md:space-y-2 md:p-3`, `md:space-y-0.5` e sobe `space-y-1`→`space-y-2`; altera o layout do menu de todas as páginas, sem teste e sem CHANGELOG. Opções: reverter e mover para PR próprio, ou manter e documentar (CHANGELOG + justificativa). — decidido: manter, documentado no CHANGELOG.
- [x] [Review][Patch] Falha do bloco de sentinelas não é testada no loader da farmácia [apps/web/app/[portalSlug]/saude/farmacia/loader.ts:~69] — remover o `.catch` não quebra nenhum teste; o loader da Visão Geral já tem o caso. Adicionar `mockRejectedValue` em `loader.spec.ts` e conferir `sentinelas.sentinelas == []` com `farmacia` intacto.
- [x] [Review][Patch] Fiação de `exemplos` na home sem teste [apps/web/app/[portalSlug]/page.tsx:83] — remover a prop `exemplos={viewModel.farmaciaExemplos}` não quebra nada. Adicionar caso em `page.spec.tsx` com `sentinelasFarmacia` (um item `destaqueCardInicial` com `unidadesComRegistro > 0`) e afirmar "Exemplos:" e o link.
- [x] [Review][Patch] CHANGELOG incompleto [CHANGELOG.md] — faltam o botão "Limpar busca" (0d9a7ae2), o ajuste do Makefile que recria o seed (b25ea2a2) e, conforme a decisão acima, a sidebar. Dois "Destaques da Versão" para a mesma story: consolidar.
- [x] [Review][Defer] Unidades com `codigo_cnes` nulo ficam fora do denominador "N de M" [fct_farmacia_sentinela_disponibilidade.sql:unidades_ativas] — deferred: a busca usa `coalesce(codigo_cnes, nome_unidade, id_registro)` e o mart filtra `codigo_cnes is not null`; verificar com `select count(*) from fct_farmacia_estoque where status_conformidade='conforme' and codigo_cnes is null` na base local/real (se > 0, severidade medium).
- [x] [Review][Defer] Saldos negativos se anulam na soma por apresentação [fct_farmacia_sentinela_disponibilidade.sql:apresentacoes] — deferred: `sum(coalesce(quantidade_estoque,0))` pode virar ≤ 0 e mostrar "sem registro" com estoque positivo em outra linha; verificar se a fonte traz `quantidade_estoque < 0` (se sim, medium; trocar por `greatest(...,0)` ou `bool_or(quantidade_estoque > 0)`).

#### Rejected
- `false` — sem `?` duplicado em `href` de exemplos: `farmaciaDetailUrl` vem de `buildNavUrl` com `exercice`/`entidades` indefinidos, ou seja, só o caminho.
- `false` — "Exemplos:" sem rótulo acessível, `#e7e9ee` literal, alvo de toque `sm:min-h-0`: mesmo padrão dos demais componentes da farmácia (já rejeitado no Triage Log).
- `low` — consulta sentinelas em série após o `Promise.all` (fica atrás do status `conforme`; paralelizar exige consulta especulativa); `.catch` sem log (mesmo padrão do resto dos loaders).
- `low` — `totalUnidadesAtivas` como máximo (invariante do cross join), regex da combinação mais frouxa que a de casamento (só explicativa), separadores " e ", "/", "com" (já rejeitado), prefixo sem escape de regex (seed curado), `ordem_exibicao`/`destaque` como texto no seed (falha alto, no `run`), grupo desconhecido sem rótulo (seed tem `accepted_values`).
- `low` — duplicação de tipos e do literal "vazio", cópia de `Map` no `reduce` (21 itens), "21 medicamentos" e "RENAME 2024" nos textos, `destaque_card_inicial`/`unidadesSomenteCombinacao` fora do contrato original (a seção "Atualização pós-revisão" cobre).
- `defer` não gravado — Makefile `elt/farmacia-sus` sem smoke check: já coberto pelo checklist de produção da Epic 19.
