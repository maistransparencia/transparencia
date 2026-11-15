---
title: 'Educação: contratos em cards por categoria com modal de lista'
type: 'feature'
created: '2026-10-18'
status: 'done'
route: 'dispatch'
baseline_commit: 'e5a5e6438661671e744ff48934b8bc6d038d527a'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-transparencia-2026-10-18/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-transparencia-2026-10-18/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A seção de contratos da página de Educação é uma lista longa (filtros + tabela/cards empilhados), cansativa de navegar, sobretudo no mobile, e ocupa espaço que deveria abrir caminho para "de onde vem o dinheiro".

**Approach:** Substituir a lista por cards por categoria (valor em `fmtCompact`, barra de % pago, "N contratos ›"). O toque abre um modal de lista da categoria (bottom-sheet no mobile) e a linha abre o `ContratoDetalhesModal` existente. A `DenseTable` permanece só no desktop (`md+`) como "Ver todos os contratos".

## Boundaries & Constraints

**Always:** Seguir DESIGN.md e EXPERIENCE.md. Grade 2 colunas no mobile (5º card em linha inteira) e 3 + 2 no desktop. Categoria sem contratos: card esmaecido, "0 contratos", valor "—", não clicável. Lista ordenada por `valorContrato` decrescente; busca só com mais de 8 contratos. Deep link `?contratoNumero=` preservado (`pushState`/`popstate`). Totais por categoria (valor, empenhado, pago) vêm do view-model. Reusar `ModalDialog`, `Badge`, `fmtCompact`, `fmtCurrency`. Nomes de métricas explícitos, sem ternários aninhados, camelCase.

**Never:** Não criar cores, fontes ou termos novos (usar "Detalhes", "Ver todos os contratos"). Não hard-codar tenant, UF ou ano. Não alterar `ContratoDetalhesModal` nem as queries de `@transparencia/db`. Não implementar o bloco "de onde vem o dinheiro" (entrega posterior).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Categoria com contratos | 12 contratos de merenda | Card ativo com valor compacto, barra e "12 contratos ›"; toque abre a lista | N/A |
| Categoria vazia | 0 contratos de locação | Card esmaecido, "0 contratos", `aria-disabled`, sem ação | N/A |
| Sem empenhado | `totalEmpenhado` = 0 | Barra omitida | N/A |
| Deep link válido | `?contratoNumero=123` | Abre direto o detalhe; fechar volta à página | N/A |
| Deep link inválido | número inexistente | Página normal, sem modal | Ignora o parâmetro |
| Busca sem resultado | termo sem match (>8 contratos) | "Nenhum contrato encontrado para “termo”." + "Limpar busca" | N/A |
| Sem contratos no ano | lista vazia | Grade toda esmaecida e frase neutra | N/A |

</frozen-after-approval>

## Code Map

- `apps/web/components/educacao/educacao-contratos-section.tsx` -- seção atual (filtros `SegmentedButton`, `DenseTable`, `TabelaTotaisRow` mobile, deep link, `formatCategoriaLabel`). Reaproveitar o deep link e `educacaoDtoToContratoServicoVigente`. Remover filtros e `TabelaTotaisRow`.
- `apps/web/components/educacao/educacao-contratos-section.spec.tsx` -- testes atuais de totais/filtros; adaptar.
- `apps/web/app/[portalSlug]/educacao/view-model.ts` -- `contratosResumo` (soma só `porCategoria` como contagem); estender com totais por categoria. Não é consumido por componentes hoje.
- `apps/web/app/[portalSlug]/educacao/page.tsx` -- passa `contratos` à seção; passar também o resumo por categoria.
- `apps/web/components/licitacoes-spotlight-modal.tsx` -- referência de padrão (bottom-sheet, navegação por teclado, camadas). Não alterar.
- `packages/ui/src/components/modal-dialog.tsx` -- `ModalDialog` com `zIndex`, `onBack`, `footer`; base do modal de lista.
- `apps/web/public/llms.txt` e `llms-full.txt` -- atualizar se a descrição da seção mudar (regra 12).

## Tasks & Acceptance

**Execution:**
- [ ] `apps/web/app/[portalSlug]/educacao/view-model.ts` -- adicionar a `contratosResumo` o total por categoria (`valorContrato`, `totalEmpenhado`, `totalPago`, quantidade) com `reduce` imutável -- cards sem cálculo na UI
- [ ] `apps/web/components/educacao/categoria-contrato-card.tsx` -- criar `CategoriaContratoCard` -- card conforme DESIGN.md e estado esmaecido
- [ ] `apps/web/components/educacao/contratos-categoria-modal.tsx` -- criar modal de lista sobre `ModalDialog` (ordenação, busca condicional, estados) -- padrão do spotlight
- [ ] `apps/web/components/educacao/educacao-contratos-section.tsx` -- recompor: grade de cards, modal em duas camadas, `DenseTable` em `hidden md:block` com título "Ver todos os contratos" -- núcleo da entrega
- [ ] testes (`*.spec.tsx`, `view-model.spec.ts`) -- cobrir a matriz I/O -- red/green
- [ ] `apps/web/public/llms.txt`, `llms-full.txt` -- ajustar se aplicável

**Acceptance Criteria:**
- Given contratos em várias categorias, when a página carrega, then são exibidos 5 cards com valor via `fmtCompact` e contagem correta.
- Given um card ativo, when o usuário o toca, then a lista abre ordenada por valor decrescente.
- Given a lista aberta, when toca uma linha, then o detalhe abre por cima e a URL recebe `?contratoNumero=`.
- Given viewport mobile, when a seção renderiza, then a tabela completa não aparece.
- Given `pnpm test`, `tsc --noEmit` e lint, then tudo passa.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `make test/ts` -- expected: todos os testes passam
- `pnpm --filter web exec tsc --noEmit` -- expected: sem erros de tipo
- `pnpm build` -- expected: build concluído

**Manual checks (if no CLI):**
- Página de Educação em 375px e 1280px: grade, modais em camadas e deep link.

### Triagem da revisão

- medium/patch: atalhos de teclado da lista agiam com o detalhe aberto — corrigido (`detalheAberto`).
- medium/patch: testes do rodapé da tabela, voltar à lista e teclado removidos/ausentes — restaurados.
- low/patch: opacidade duplicada na grade vazia — corrigido.
- false: rodapé de totais inexistente (existe nas colunas da DenseTable); deep link sem "Voltar à lista" (por desenho); tabela ausente no mobile (decisão do usuário).
- defer: soma por categoria no view-model em vez de `@transparencia/db`; `pushState` no fechamento do detalhe (código pré-existente); prop `contratoAbrindoId` sem uso.
- fora do diff da feature: `AGENTS.md` alterado pelo bloco automático do turbo.
