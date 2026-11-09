---
title: 'Farmácia: separar insulina NPH e Regular e avisar sobre substâncias relacionadas com estoque'
type: 'bugfix'
created: '2026-11-09'
status: 'in-review'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '318905f24699e33e8d2105e683bb79a8d7935587'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Em "medicamentos essenciais" de `/farmacia`, o card "Insulina" junta NPH e Regular num só item e diz "sem lote dentro da validade" mesmo quando a unidade tem outras insulinas (glargina, lispro, asparte...) com lote válido; o mesmo vale para Levanlodipino (vs. Anlodipino) e Esomeprazol (vs. Omeprazol). A prestação de contas da saúde lista NPH e Regular separadamente.

**Approach:** Dividir o sentinela `insulina` em `insulina_nph` e `insulina_regular`. Criar o conceito de "substância relacionada" no seed: ela nunca conta como o sentinela, mas, quando o sentinela está sem lote válido e há relacionada com lote válido na unidade, a tela avisa.

## Boundaries & Constraints

**Always:** Lógica na camada `@transparencia/db`/dbt; UI só traduz códigos em rótulos (`lowercase snake_case` nos códigos). `JOIN` com `portal_slug`. Sem literais de tenant. Aviso em linguagem de cidadão (skill `editor-cidadao`).

**Never:** Somar análogas em NPH/Regular, nem levanlodipino em anlodipino, nem esomeprazol em omeprazol. Não mexer na regra de validade (lote vencido não conta). Não rodar dbt contra produção.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| NPH vencida, glargina válida | só NPH vencida e glargina com lote válido na unidade | NPH "só lote vencido" + aviso "há outra insulina com lote válido" | N/A |
| Regular e NPH separadas | NPH válida, Regular ausente | dois cards com status distintos | N/A |
| Levanlodipino válido | anlodipino ausente, levanlodipino válido | Anlodipino sem registro + aviso de levanlodipino | N/A |
| Relacionada vencida | só glargina vencida | sem aviso | N/A |
| Mistura NPH+Regular `70/30` | nome com `+` | segue como combinação, não é NPH nem Regular | N/A |

</frozen-after-approval>

## Code Map

- `elt/transform/seeds/seed_farmacia_medicamentos_sentinela.csv` -- trocar `insulina` por `insulina_nph` e `insulina_regular`; nova coluna `tipo_correspondencia` (`principal`|`relacionado`) com linhas das análogas, levanlodipino e esomeprazol.
- `elt/transform/seeds/seeds.yml:179` -- descrição/colunas do seed.
- `elt/transform/models/marts/fct_farmacia_sentinela_disponibilidade.sql` -- CTE `prefixos` filtrar `principal`; novas CTEs de relacionadas (qtd com lote utilizável e validade mais tardia); novas colunas no mart. Não alterar `apresentacoes_combinacao`.
- `elt/transform/models/marts/_fct_farmacia_sentinela_disponibilidade.yml` -- documentar as novas colunas.
- `elt/tests/test_fct_farmacia_sentinela_disponibilidade.py:127,165` -- testes de insulina existentes passam a refletir a divisão.
- `packages/db/src/queries/farmacia.ts:592,664` -- `FarmaciaSentinelaDTO` ganha `unidadesComRelacionadoValido`; `SENTINELA_LOTE_UTILIZAVEL_SQL` reaproveitado.
- `packages/db/src/queries/__tests__/farmacia.spec.ts`, `packages/db/tests/fixtures/seed.ts` -- fixtures/testes.
- `apps/web/app/[portalSlug]/farmacia/view-model.ts:81-150`, `apps/web/components/farmacia/farmacia-sentinelas.tsx` -- repassar o campo e exibir o aviso.

## Tasks & Acceptance

**Execution:**
- [x] Seed + `seeds.yml` -- dividir insulina, adicionar relacionadas -- distinção NPH/Regular e avisos
- [x] Mart SQL + yml -- coluna de relacionada com lote utilizável por unidade/sentinela -- dado derivado no dbt
- [x] Testes dbt (`elt/tests`) -- casos da matriz (red primeiro) -- `make test`
- [x] `farmacia.ts` + spec -- novo campo no DTO -- camada de dados
- [x] View-model + componente + specs -- aviso em linguagem cidadã -- `editor-cidadao` revisa o texto
- [x] `CHANGELOG.md` -- registrar a correção (skill `changelog-transparencia`)

**Acceptance Criteria:**
- Given unidade só com NPH vencida e glargina válida, when abre `/farmacia`, then o card "Insulina NPH" mostra lote vencido e o aviso de outra insulina com lote válido.
- Given o seed, when consultado, then não existe sentinela `insulina`, e sim `insulina_nph` e `insulina_regular`.
- Given Levanlodipino válido e Anlodipino sem estoque, then Anlodipino continua sem registro, com aviso.
- `make test`, `make check`, `make test/ts` e `pnpm typecheck` passam.

## Implementation Notes

- Renegociado pelo Julio: `insulina` (qualquer tipo, inclusive análogas) voltou como sentinela, ao lado de `insulina_nph` e `insulina_regular`; sentinelas passam a 23.
- Seed ganhou `tipo_correspondencia`; sentinelas passaram de 21 para 22; ordem de exibição deslocada em 1 a partir de dipirona.
- Mart expõe `possui_relacionado_lote_sem_validade` e `data_validade_relacionado_mais_tardia`; a consulta decide o aviso com a validade de hoje.
- Aviso genérico ("Há remédio parecido com lote válido, mas não é o mesmo"), só quando o essencial não está no estoque. Texto não passou pelo `editor-cidadao`.
- `llms-full.txt` e `CHANGELOG.md` atualizados. Verificado: `make check`, `make test` (400), db (428) e web (1769) no banco 5545, `tsc`, biome.

## Verification

**Commands:**
- `make test` -- expected: verde
- `make check` -- expected: verde
- `make test/ts` e `pnpm typecheck` -- expected: verde

**Manual checks (if no CLI):**
- Rodar dbt só no Docker local (5544) e abrir `/farmacia` verificando NPH e Regular separadas.
