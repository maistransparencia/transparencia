---
title: 'Farmácia: separar insulina NPH e Regular e avisar sobre substâncias relacionadas com estoque'
type: 'bugfix'
created: '2026-11-09'
status: 'done'
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
- Given o seed, when consultado, then existem os sentinelas `insulina_nph` e `insulina_regular`, além de `insulina` (qualquer tipo, inclusive análogas), conforme renegociado.
- Given Levanlodipino válido e Anlodipino sem estoque, then Anlodipino continua sem registro, com aviso.
- `make test`, `make check`, `make test/ts` e `pnpm typecheck` passam.

## Implementation Notes

- Renegociado pelo Julio: `insulina` (qualquer tipo, inclusive análogas) voltou como sentinela, ao lado de `insulina_nph` e `insulina_regular`; sentinelas passaram de 21 para 23. O bloco congelado acima descreve o plano original (divisão pura); vale o que está aqui e nos critérios de aceite.
- Seed ganhou `tipo_correspondencia`; ordem de exibição deslocada em 2 a partir de dipirona.
- Mart expõe `possui_relacionado_lote_sem_validade` e `data_validade_relacionado_mais_tardia`; a consulta decide o aviso com a validade de hoje.
- Aviso genérico ("Há um parecido com lote válido"), só quando o essencial não está no estoque. Texto revisado pelo `editor-cidadao` e encurtado para caber na linha do item (estilo `caption`, sem quebra).
- Mistura 70/30 conta como combinação apenas no card `insulina`; NPH e Regular ficam com combinação 0.
- Review (4 lentes) concluído: decisão do texto do aviso resolvida, testes dbt de cobertura aplicados; dois itens adiados em `deferred-work.md`.
- `llms-full.txt` e `CHANGELOG.md` atualizados. Verificado: `make check`, `make test` (400), db (428) e web (1769) no banco 5545, `tsc`, biome.

## Verification

**Commands:**
- `make test` -- expected: verde
- `make check` -- expected: verde
- `make test/ts` e `pnpm typecheck` -- expected: verde

**Manual checks (if no CLI):**
- Rodar dbt só no Docker local (5544) e abrir `/farmacia` verificando NPH e Regular separadas.

### Review Findings

- [x] [Review][Decision] (resolvido: texto revisado pelo editor-cidadao, estilo `caption`) Aviso "Há remédio parecido com lote válido, mas não é o mesmo" sem revisão do `editor-cidadao` — a tarefa está marcada `[x]`, mas as Implementation Notes admitem que o texto não passou pela revisão (Always do spec). O texto é vago (não diz qual remédio nem o que fazer), pode sugerir equivalência clínica (glargina não substitui NPH) e o span usa `text-[11px] text-mute2`, fora do DESIGN.md. Decidir o texto final e o estilo (rodar `editor-cidadao`; opcionalmente apontar para a busca da substância relacionada).
- [x] [Review][Patch] (aplicado) Cobertura dbt dos relacionados e da mistura 70/30 [elt/tests/test_fct_farmacia_sentinela_disponibilidade.py:508-528] — sem teste para esomeprazol e para asparte/glulisina/degludeca (prefixo errado no seed passaria sem falhar); sem teste de relacionado com saldo zero ou sem validade; o 70/30 só afirma NPH/Regular ausentes (não afirma a combinação nem o card `insulina`); o comentário "relacionada vencida" rotula um lote com `_dia(90)` (futuro).
- [x] [Review][Defer] Prefixos exatos do seed (`insulina humana nph`) podem não casar nomes reais como "INSULINA NPH 100 UI" — deferred: maybe-false; conferir os nomes reais em `raw.estoque` no banco local (5544) e, se divergirem, o card genérico `insulina` mostra estoque enquanto NPH mostra "sem registro".
- [x] [Review][Defer] Lista de relacionados pode estar incompleta (detemir, bifásicas) e sem fonte (RENAME/ANVISA) — deferred: precisa de validação de domínio (contador-publico/fonte oficial), não de código.

#### Rejected
- Spec contradiz o código (sentinela `insulina` mantida, contagens 21/22/23, deslocamento de ordem) — a correção seria editar a spec revisada. A renegociação está registrada nas Implementation Notes; vale alinhar o bloco congelado manualmente.
- Assimetria: card `insulina` genérico sem aviso — false: o principal conta qualquer tipo, não há relacionado a avisar.
- `IndicadoresLinha` alterado afeta saúde/educação — false: o único consumidor é `apps/web/components/farmacia/farmacia-indicadores.tsx`.
- Mudanças fora do escopo da spec no mesmo branch — processo, sem defeito de código.
- Teste "ocultar indicadores na busca" sem par positivo / interação com `q` curta — false: há caso positivo em `page.spec.tsx:98`, e `hasBusca` só vale com 2+ letras (`view-model.ts:596`).
- Data do estoque some dos indicadores — false: `dataAtualizacao` segue passada ao cabeçalho (`page.tsx:58,121`) e `fmtDate` ainda é usado.
- Guardas de integridade do seed (prefixo relacionado vs principal), teste cross-tenant do novo join, borda de validade no dia, `avisoRelacionado` com `somente_vencido`/`somente_combinacao`, redundância de colunas no seed, duplicação de estilo e ícone oculto no mobile nos formulários de busca, texto do aviso duplicado no spec, CHANGELOG sem o restilo — low, hipotéticos ou sem dano concreto; a correção adicionaria complexidade. (Rule 23 verificada pelo Acceptance Auditor: `portal_slug` presente nos joins e `GROUP BY`, sem literais de tenant.)
