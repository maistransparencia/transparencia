---
title: 'Farmácia: link do card de remédio essencial busca pelo mesmo critério que gerou a contagem'
type: 'bugfix'
created: '2026-11-17'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Em `/farmacia`, o card de remédio essencial manda o rótulo de exibição ("Insulina NPH", "Insulina Regular") como termo de busca, mas o estoque usa "INSULINA HUMANA NPH/REGULAR". "Insulina NPH" só casa a mistura 70/30 vencida ("sem lote dentro da validade") e "Insulina Regular" não devolve nada, embora o card conte unidades com estoque.

**Approach:** O mart expõe o prefixo do seed (`prefixo_nome_normalizado` do tipo `principal`) como `termo_busca`; o DTO o repassa e o view-model o usa no `href`, mantendo o rótulo. Teste de paridade garante que a busca pelo termo do card acha os itens que o card contou. A mistura 70/30 não entra na busca de NPH (bate com o card, que a trata como combinação).

</frozen-after-approval>

## Implementation Notes

- `elt/transform/models/marts/fct_farmacia_sentinela_disponibilidade.sql` e `_fct_farmacia_sentinela_disponibilidade.yml`: coluna `termo_busca` (um `principal` por código no seed).
- `packages/db/src/queries/farmacia.ts`: `FarmaciaSentinelaDTO.termoBusca`; `min(termo_busca)` na consulta.
- `apps/web/app/[portalSlug]/farmacia/view-model.ts` (`buildEssenciais`, `buildExemplosFarmacia`): `href` com `termoBusca`.
- Testes: dbt em `elt/tests/test_fct_farmacia_sentinela_disponibilidade.py`; db/web em specs existentes; paridade no banco 5545.
- `CHANGELOG.md` via skill `changelog-transparencia`. Só banco local; sem commit sem pedir.
