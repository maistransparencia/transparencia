---
title: 'Story 13.7: Scroll Suave Automático para o Topo da Tabela ao Paginar'
type: 'feature'
created: '2026-09-23'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
baseline_revision: '0ccc989f2441eeb64aa5a6ab31983d127d99d2f3'
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Ao navegar entre páginas de tabelas longas e densas (`DenseTable`), o usuário permanece no final/rodapé da tabela onde clicou na paginação, sendo forçado a rolar a página manualmente de volta para o topo a fim de ver as primeiras linhas da nova página.

**Approach:** Adicionar rolagem suave automática (`scrollIntoView({ behavior: 'smooth', block: 'start' })`) para o container do `DenseTable` sempre que o usuário alterar de página (via botões de número, anterior ou próximo), com compensação visual (`scroll-mt-20 sm:scroll-mt-24`) para evitar que o topo da tabela fique oculto sob cabeçalhos fixos.

## Boundaries & Constraints

**Always:**
- Utilizar `useRef<HTMLDivElement>(null)` vinculado ao elemento raiz do `DenseTable` para acionar `scrollIntoView`.
- Tratar defensivamente a chamada `tableRef.current?.scrollIntoView` verificando se o método existe antes da execução (`typeof tableRef.current?.scrollIntoView === 'function'`), prevenindo quebras em ambientes como jsdom/testes unitários sem mock.
- Adicionar classes utilitárias Tailwind `scroll-mt-20 sm:scroll-mt-24` ao container raiz do `DenseTable`.
- Não utilizar IDs globais estáticos no DOM para a âncora/rolagem, evitando colisões e bugs quando múltiplas instâncias de `DenseTable` coexistirem na mesma página.
- Isolar a função auxiliar de paginação (ex: `handlePageChange(newPage: number)`) ou disparar o scroll suave ao mudar de página, garantindo que o scroll só aconteça quando houver efetiva troca de página e não na montagem inicial (`useEffect` desnecessário evitado ao amarrar o evento diretamente na ação de paginação).

**Never:**
- Não disparar rolagem na montagem inicial do componente (`page = 1` no primeiro render).
- Não alterar filtros, lógica de busca ou ordenação de dados existentes.
- Não introduzir dependências externas de smooth-scroll.
- Não remover ou renomear props existentes do `DenseTable`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Clique em número de página diferente | Usuário na página 1 clica em página 2 | Atualiza página para 2 e chama `scrollIntoView({ behavior: 'smooth', block: 'start' })` no container raiz | Checa se método existe antes de invocar |
| Clique na mesma página já ativa | Usuário na página 2 clica no botão 2 | Nenhuma mudança de página, nenhum `scrollIntoView` redundante | Não invoca scroll se `newPage === currentPage` |
| Navegação anterior (←) | Usuário na página 2 clica em página anterior | Página muda para 1 e dispara scroll suave ao topo do `DenseTable` | Botão desabilitado se `currentPage <= 1` |
| Navegação próxima (→) | Usuário na página 1 clica em próxima página | Página muda para 2 e dispara scroll suave ao topo do `DenseTable` | Botão desabilitado se `currentPage >= totalPages` |
| Ambiente jsdom sem `scrollIntoView` | Teste ou navegador sem suporte nativo a `scrollIntoView` | Não lança exceção (runtime error protegido por checagem defensiva) | `typeof el.scrollIntoView === 'function'` |

</intent-contract>

## Code Map

- `packages/ui/src/components/dense-table.tsx` — Componente `DenseTable` — Adicionar `useRef<HTMLDivElement>(null)` no container raiz; adicionar `scroll-mt-20 sm:scroll-mt-24` nas classes do container raiz; criar helper `goToPage(newPage: number)` que atualiza `setPage` e executa `scrollIntoView({ behavior: "smooth", block: "start" })`; conectar botões de paginação (anterior, números e próximo) ao helper.
- `packages/ui/src/components/__tests__/dense-table.spec.tsx` — Testes unitários do `DenseTable` — Adicionar suíte de testes com mock de `scrollIntoView` no Vitest verificando que a navegação de página dispara `scrollIntoView` com `{ behavior: 'smooth', block: 'start' }` e que o container possui as classes `scroll-mt-20` e `sm:scroll-mt-24`.

## Tasks & Acceptance

**Execution:**
- `packages/ui/src/components/dense-table.tsx` — Importar `useRef` de React; adicionar `const containerRef = useRef<HTMLDivElement>(null)`; adicionar classes `scroll-mt-20 sm:scroll-mt-24` ao container raiz; implementar `handlePageChange(newPage: number)` para setar a página e chamar `containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })`; atualizar os handlers de paginação para usar `handlePageChange` — Implementar rolagem suave no topo da tabela ao paginar sem colisões e com compensação para sticky header.
- `packages/ui/src/components/__tests__/dense-table.spec.tsx` — Criar testes unitários para a paginação e scroll suave: mock de `scrollIntoView`, simular clique na próxima página e página específica, validar chamada com parâmetros corretos e verificar classes de scroll margin top — Garantir validação de regressão e cobertura de AC.

**Acceptance Criteria:**
- Given qualquer tabela renderizada com `DenseTable` com dados suficientes para múltiplas páginas (`pageSize` definido e `totalPages > 1`)
- When o usuário clica em um botão de número de página ou no botão de próxima/anterior página
- Then a página é atualizada e o método `scrollIntoView` do container raiz é invocado com `{ behavior: "smooth", block: "start" }`.
- And o elemento raiz possui as classes Tailwind `scroll-mt-20 sm:scroll-mt-24` para compensação de cabeçalho fixo.
- And o scroll suave não é invocado na inicialização do componente nem quando o usuário clica na página já selecionada.
- And a execução de `pnpm --filter @transparencia/ui test` e `pnpm lint` passa com 100% de sucesso.

## Spec Change Log

## Review Triage Log

### 2026-09-23 — Review pass
- verdicts: 6 findings — high 0, medium 1, low 2, false 3, maybe-false 0
- findings:
  - `[medium]` `[patch]` **Blind Hunter 5** Restauração incompleta do protótipo no teardown de testes (`afterEach`) — `dense-table.spec.tsx`: atribuir `originalScrollIntoView` quando `undefined` criava uma propriedade própria no protótipo em vez de deletá-la; corrigido para `if (originalScrollIntoView !== undefined) ... else delete ...`.
  - `[false]` `[reject]` **Blind Hunter 1** `prefers-reduced-motion` não verificado em `handlePageChange` — Os critérios de aceitação exigem explicitamente `scrollIntoView({ behavior: 'smooth', block: 'start' })`. Modificar para `behavior: 'auto'` violaria o contrato estrito da história e o AC verificado por mock.
  - `[false]` `[reject]` **Blind Hunter 2** Scroll incondicional mesmo quando topo já visível — O intent e AC pedem expressamente que qualquer clique nos controles de paginação posicione o viewport suavemente no início da tabela, garantindo leitura a partir da primeira linha em qualquer dispositivo.
  - `[low]` `[reject]` **Blind Hunter 3** Gerenciamento de foco e `aria-live` na paginação — O componente `DenseTable` já possui estrutura de acessibilidade padrão e gerenciamento de foco complexo em paginação está fora do escopo desta história.
  - `[false]` `[reject]` **Blind Hunter 4** Scroll não disparado ao buscar ou reordenar colunas — A história 13.7 é específica sobre navegação e paginação ("ao paginar" / "whenever I switch pages" / "clica em um número de página ou nos botões de navegação anterior/próximo").
  - `[low]` `[reject]` **Blind Hunter 6** Classes `scroll-mt-20 sm:scroll-mt-24` fixas para outros contextos — As classes foram expressamente solicitadas e padronizadas no AC da Story 13.7 para compensar o cabeçalho fixo da aplicação web.

## Auto Run Result

**Story 13.7 — Concluída em 2026-09-23**

**Mudança implementada:**
- Container raiz do `DenseTable` recebeu `useRef<HTMLDivElement>(null)` e classes Tailwind `scroll-mt-20 sm:scroll-mt-24` para compensação de cabeçalho fixo sem conflitos de ID no DOM.
- Criado manipulador centralizado `handlePageChange` com checagem defensiva de existência de `scrollIntoView` (`typeof containerRef.current?.scrollIntoView === "function"`), disparo de `scrollIntoView({ behavior: "smooth", block: "start" })` e early return quando o usuário clica na página já ativa.
- Conectados todos os botões de paginação (anterior, números e próximo) ao `handlePageChange`.
- Adicionada suíte abrangente de testes unitários no Vitest mockando e validando todas as chamadas, classes utilitárias e resiliência em ambientes sem suporte nativo a `scrollIntoView`.

## Verification

**Commands:**
- `pnpm --filter @transparencia/ui test` -- expected: 13 testes do DenseTable passando (47 no pacote ui).
- `pnpm lint` -- expected: Zero erros ou alertas de linter/biome.
- `make check && make test/ts` -- expected: Sucesso total em todos os 507 testes TypeScript e verificações do projeto.

