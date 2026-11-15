# Story 19.13: Ajustes da Seção "Em destaque" da Home (Realce por Status e Ordem dos Cards)

**Status:** done  
**Epic:** Epic 19: Remodelagem da Homepage para Utilidade Pública, Sentinela da Farmácia SUS e Ação Cívica  
**Dependências:** 19.3 e 19.4 (entregues: seção "Em destaque" e card da Farmácia na home)

## User Story

As a citizen opening the home page,  
I want the "Em destaque" cards to look the same and follow a stable order,  
So that no card seems more important or more "approved" just because of a colored glow.

## Decisões de planejamento (fechadas)

1. **O que sai:** o realce colorido da borda/anel do card, que hoje muda conforme o status dos dados. Farmácia SUS: `border-emerald-200` fixo no card "conforme" (`farmacia-resumo-card.tsx`) e a borda `emerald`/`amber` da linha de aviso (`CLASSES_LINHA_POR_TOM` em `destaque-linha.tsx`, usada no estado "sem informação de estoque"). Educação Básica e Desempenho Escolar: `CLASSES_BORDA_POR_TOM` (`border-emerald-300 ring-1 ring-emerald-100` / âmbar) em `educacao-resumo-card.tsx`.
2. **O que fica:** o status continua comunicado por **texto e selo (badge)**, que mantêm a cor do tom. Só o contorno do card fica neutro (`border-[#e7e9ee]`, igual ao card de Obras). Assim a informação não depende de cor (acessibilidade) e nada é apagado.
3. **Sem mudança de dados:** puramente apresentação. `enfaseTom` e `tom` continuam existindo para selo e texto; nenhum DTO ou query muda (Regra 2).
4. **Nova ordem:** Farmácia SUS → Obras → Educação (hoje: Farmácia → Educação → Obras). Obras passa a vir logo depois da Farmácia SUS.
5. **Estados vazios:** `temDestaques` e a omissão de cada card quando sem dado continuam como estão; a reordenação não pode deixar espaço vazio nem quebrar quando um dos cards falta.

## Acceptance Criteria

1. **Card da Farmácia.** No estado `conforme`, o card usa contorno neutro, sem `emerald`. No estado `apagao` (linha de aviso), o contorno também é neutro; o selo "Sem informação de estoque" mantém o tom `atencao`.
2. **Card de Educação.** O contorno não varia mais com `enfaseTom` (sem `ring`, sem `emerald`/`amber` na borda do card). Selo, faixa e ícones de variação mantêm seus tons por `enfaseTom`.
3. **Ordem.** Em `apps/web/app/[portalSlug]/page.tsx`, a seção "Em destaque" renderiza Farmácia SUS, depois Obras, depois Educação. Cada card continua condicionado ao seu dado; sem cards, a seção não aparece.
4. **Multi-tenant.** Nenhum município, UF ou ano fixo (Regra 23). A ordem vale para qualquer portal.
5. **Testes.** Atualizar `educacao-resumo-card.spec.tsx` (hoje espera `emerald` no contorno), `farmacia-resumo-card.spec.tsx` e `page.spec.tsx`: contorno neutro nos dois cards em todos os tons, e ordem Farmácia → Obras → Educação, inclusive com um dos cards ausente.
6. **Documentação.** Se `llms.txt`/`llms-full.txt` descreverem a ordem dos cards ou o realce por status, atualizar (Regra 12); se não descreverem, nada a fazer.
7. **Qualidade.** `make test/ts` e `tsc --noEmit` passam.

## Tarefas

- [x] `farmacia-resumo-card.tsx` e `destaque-linha.tsx`: contorno neutro, mantendo o tom no selo e no ícone.
- [x] `educacao-resumo-card.tsx`: remover `CLASSES_BORDA_POR_TOM`; contorno fixo neutro.
- [x] `app/[portalSlug]/page.tsx`: mover `ObrasResumoCard` para logo após `FarmaciaResumoCard`.
- [x] Ajustar os testes citados e adicionar o teste de ordem.
- [x] Verificar se `DestaqueLinha` é usado fora da home; se sim, decidir se o contorno neutro vale só aqui (prop) ou para todos.
- [x] `make test/ts` e `tsc --noEmit`.

## Guardrails

- Só apresentação; lógica e dados intocados (Regra 2).
- Execução apenas contra o banco local (Regra 15).
- Commits convencionais em minúsculas, sem referência a story ou task (Regra 19).
