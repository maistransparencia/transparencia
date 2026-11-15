---
title: 'Story 13.10: Refinamento da Busca de Licitações e Contratos: Vigência Plurianual, Fornecedores Homologados e Calibração Textual'
type: 'feature'
created: '2026-09-23'
status: 'backlog'
baseline_revision: 'HEAD'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - packages/db/src/queries/licitacoes-contratos-search.ts
  - packages/db/src/queries/__tests__/licitacoes-contratos-search.spec.ts
  - apps/web/app/api/[portalSlug]/licitacoes/search/route.ts
  - apps/web/components/licitacoes-spotlight-modal.tsx
  - apps/web/components/licitacoes-search-bar.tsx
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** A ferramenta de busca global de compras públicas (`searchLicitacoesEContratos`) apresenta três comportamentos anômalos que degradam a experiência cívica e a encontrabilidade de registros:
1. **Filtro estrito de ano em contratos plurianuais:** Quando o usuário pesquisa no contexto do exercício atual (ex: 2026), a query filtra `ano = 2026` com base no ano de celebração do contrato. Contratos plurianuais firmados em anos anteriores (ex: contrato de 2024 de empresa como "L.PHILIPPE CONSTRUCOES LTDA" que segue em execução em 2026) são ignorados nos resultados.
2. **Invisibilidade de empresas vencedoras nas licitações:** Licitações são consultadas apenas em `analytics.fct_licitacoes`, que não contém os fornecedores homologados (estes ficam em `analytics.fct_licitacoes_itens`). Logo, buscar por uma empresa que venceu um edital (ex: "DOHA") não localiza as licitações correspondentes.
3. **Falso-positivo trigramático matemático:** A cláusula `word_similarity > 0.35` em termos curtos de 4 letras (como "doha") gera interseção de 40% com a preposição "do", casando inadvertidamente quase todos os objetos da base que contenham expressões como "do município".
4. **Fragilidade de pontuação corporativa:** Variações com/sem ponto e espaçamentos em razões sociais (ex: `L.PHILIPPE` vs `L. PHILIPPE` vs `L PHILIPPE`) falham no FTS e no `ILIKE` estrito.

**Approach:** 
1. Reformular o filtro temporal de contratos para considerar a **vigência temporal** no exercício pesquisado (`ano_exercicio >= EXTRACT(YEAR FROM data_inicio) AND (vencimento_atual IS NULL OR EXTRACT(YEAR FROM vencimento_atual) >= ano_exercicio)`), mantendo visíveis contratos plurianuais ativos no ano da consulta.
2. Expandir a busca de licitações para correlacionar com `analytics.fct_licitacoes_itens`, integrando `fornecedor_nome` e `fornecedor_cpf_cnpj` no índice de busca e retornando o fornecedor vencedor no resultado.
3. Calibrar o algoritmo trigramático (`word_similarity` / `similarity`) para exigir comprimento mínimo (>= 5 letras) e threshold calibrado (>= 0.50), eliminando falsos positivos gerados por preposições curtas.
4. Normalizar pontuações e caracteres especiais na busca e nos campos consultados para tolerar variações de grafia em razões sociais com siglas.

## Boundaries & Constraints

**Always:**
- Toda a lógica de cruzamento e cálculo de similaridade deve residir exclusivamente em `packages/db/src/queries/licitacoes-contratos-search.ts` (Regra 2 do AGENTS.md).
- Respeitar rigorosamente a convenção camelCase em interfaces TypeScript e DTOs (Regra 18 do AGENTS.md).
- Utilizar funções funcionais e imutáveis na transformação de dados (Regra 2 do AGENTS.md).
- Manter as queries SQL sem alinhamento artificial por espaços (Regra 6 do AGENTS.md).
- Garantir que a suíte de testes de paridade passe via `make test/ts` e testes gerais via `make test` (Regra 4 do AGENTS.md).

**Never:**
- Proibido excluir contratos vigentes no exercício selecionado apenas porque o ano de assinatura foi anterior.
- Proibido manter `NULL AS fornecedor_nome` nas licitações quando houver fornecedores homologados registrados em `fct_licitacoes_itens`.
- Proibido acionar operadores trigramáticos em palavras curtas sem proteção de threshold adequado.

## Acceptance Criteria

1. **Given** a query `searchLicitacoesEContratos` e um contrato assinado em 2024 mas com vigência até 2026
   - **When** o usuário busca pela razão social ou objeto informando `ano = 2026`
   - **Then** o contrato é retornado nos resultados de contratos para o exercício 2026, indicando seu ano de origem e status de vigência.

2. **Given** um processo licitatório com itens homologados em favor de um fornecedor em `analytics.fct_licitacoes_itens` (ex: "DOHA EMPREENDIMENTOS E SERVICOS LTDA")
   - **When** o usuário pesquisa pelo nome ou termo principal do fornecedor (ex: "doha")
   - **Then** a licitação é encontrada e retornada no grupo de licitações, preenchendo `fornecedorNome` com a razão social correspondente.

3. **Given** uma busca por termos curtos (ex: "doha")
   - **When** a query é executada contra `analytics.fct_licitacoes` e `analytics.fct_contratos`
   - **Then** não retorna falsos positivos causados por mera ocorrência de preposições como "do" ou "da" no campo `objeto`.

4. **Given** um contrato ou fornecedor cadastrado com pontuação em sigla (ex: "L.PHILIPPE CONSTRUCOES LTDA")
   - **When** o usuário pesquisa por "L.PHILIPPE", "L. PHILIPPE" ou "L PHILIPPE"
   - **Then** a correspondência é estabelecida com sucesso e o contrato é retornado.

5. **Given** a suíte de testes em `packages/db/src/queries/__tests__/licitacoes-contratos-search.spec.ts`
   - **When** executada via `make test/ts`
   - **Then** valida todos os cenários acima com 100% de sucesso.

</intent-contract>
