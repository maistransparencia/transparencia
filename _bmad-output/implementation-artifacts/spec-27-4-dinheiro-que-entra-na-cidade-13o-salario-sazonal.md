---
title: 'Story 27.4: Dinheiro que Entra na Cidade (13º salário, sazonal)'
type: feature
created: '2026-11-09'
status: in-progress
route: dispatch
baseline_commit: 9667dd76253311a20289b545d15a192ae4a5e733
---

<frozen-after-approval>

## Intent

**Problem:** o comerciante local não tem como saber, na home, se a Prefeitura já pagou o 13º; o dado do 13º só aparece em `/pessoal` e hoje soma encargos (elemento 13) e falsos positivos.

**Approach:** bloco sazonal "Dinheiro que entra na cidade" (13º, novembro e dezembro do ano corrente, valor pago acumulado, sem percentual) entre "Como está a cidade hoje" e "Para onde vai o dinheiro público"; o bloco some fora da janela ou sem dado. O filtro do 13º no mart é corrigido. Sem seed, sem config por município, sem lei citada. A folha do mês foi descartada (dado frágil).

## Boundaries & Constraints

**Always:** camada de apresentação burra (Regra 2); janela do 13º em `@transparencia/db`/dbt, constantes nomeadas e sem município, UF ou ano fixos (Regra 23); estágio **pago** não é empenhado nem liquidado; leitura dita como acumulada/indício (Regra 27); sem dado individual de servidor (LGPD); `unaccent` nos filtros de texto (Regra 11); dbt só no banco local (Regra 15, sem exportar `DATABASE_URL` do banco local junto de `db/test/build`); `llms*.txt` e `CHANGELOG.md` atualizados.

**13º no mart:** elementos 01, 03, 04, 11, 16, 96; exclui elemento 13 (encargos, multa e juros); padrões "13º", "décimo terceiro", "13 salário"; mantém exclusões de anulação e tipo `AN`. Aposentados e pensionistas entram.

**Never:** "atrasado", "não pagou" ou prazo legal; citar lei; seed ou config por município; espaço reservado quando algo some; data de pagamento inventada (a fonte só traz mês do empenho).

</frozen-after-approval>

## Code Map

- Feito (13º, janela): `packages/db/src/queries/pessoal-metrics.ts` (`isDecimoTerceiroWindowOpen`, `getDecimoTerceiroHome`), loader, view-model `decimoTerceiroHome`, `components/dinheiro-que-entra-section.tsx`, `page.tsx`, specs, `llms*.txt`, `CHANGELOG.md`.
- Mart do 13º: `elt/transform/models/marts/metrics/fct_pessoal_folha_metricas.sql` (CTE `despesas_folha`: `empenhado_13`, `empenhado_bruto_13`, `liquidado_13`, `pago_13`); testes dbt/pytest do mart e `pessoal-metrics.spec.ts`.
- Não alterar: `DecimoTerceiroCard` além do texto "servidores e aposentados".

## Decisões

- Evidência (banco local): 2025, elemento 13 = R$ 85 mil (Natividade) e R$ 650 mil (Porciúncula) no `pago_13`; Natividade 2026 tinha R$ 1,2 mi pago em junho (100% do empenhado).
- 13º sem percentual: o empenhado é parcial em novembro e Natividade paga a primeira parcela em junho.
- `contador-publico` valida elementos e estágios; `editor-cidadao` valida os textos.
- Folha do mês descartada em 2026-11-10: a fonte não traz data de pagamento e Porciúncula empenha a folha em lotes de vários meses.

## Tasks & Acceptance

**Execution:**
- [x] janela do 13º, loader, view-model, componente, page, testes, `llms*.txt`, `CHANGELOG.md` (card do 13º sem percentual).
- [x] teste vermelho e correção do filtro do 13º no mart (`elt/tests/test_fct_pessoal_folha_metricas.py`); `make check` e `pytest` (414) passam.
- [ ] paridade TypeScript de `/pessoal` (`make db/test/build` isolado) e texto de `/pessoal`.
- [ ] revisão do `contador-publico` e do `editor-cidadao`.

**Acceptance Criteria:** os da Story 27.4 em `_bmad-output/planning-artifacts/epics.md` (seção "Story 27.4").

## Verification

- `pnpm typecheck` e `pnpm test` em `apps/web`; `make test` e `make check` para dbt, só no banco local de testes (ver Regra 15).
