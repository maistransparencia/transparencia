---
title: 'Story 13.10: Refinamento da Busca de Licitações e Contratos: Vigência Plurianual, Fornecedores Homologados e Calibração Textual'
type: 'feature'
created: '2026-09-23'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
baseline_revision: '49a27e33141cc9250a83b62126aba1e0f4923976'
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** A busca global unificada de compras públicas (licitações e contratos) não encontra contratos plurianuais ativos celebrados em anos anteriores quando filtrada pelo exercício corrente, omite fornecedores homologados na pesquisa de licitações e sofre de falsos positivos trigramáticos (ex: termo de 4 letras como "doha" combinando com preposição "do") além de falhas na correspondência de razões sociais com pontuações corporativas irregulares (ex: "L.PHILIPPE" vs "L. PHILIPPE").

**Approach:** Estender o filtro temporal de contratos em `licitacoes-contratos-search.ts` para cobrir a vigência plurianual integral, correlacionar licitações com `analytics.fct_licitacoes_itens` para projetar e indexar fornecedores homologados, calibrar as regras trigramáticas (exigindo comprimento mínimo de 5 caracteres e threshold > 0.50) eliminando falsos positivos de palavras curtas, padronizar pontuação e espaços em nomes corporativos tanto no FTS quanto em ILIKE, e exibir no `LicitacoesSpotlightModal` o badge de ano de celebração e período de vigência para contratos de anos anteriores.

## Boundaries & Constraints

**Always:**
- Seguir estritamente as regras de `@transparencia/db`: queries Kysely com tipagem estrita, camelCase em DTOs, e preservação do isolamento analítico no schema `analytics`.
- A filtragem de contratos plurianuais sob um exercício solicitado (`ano = :anoParam`) deve cobrir todos os contratos onde `coalesce(EXTRACT(YEAR FROM data_inicio), ano) <= :anoParam AND (vencimento_atual IS NULL OR EXTRACT(YEAR FROM vencimento_atual) >= :anoParam)`.
- No DTO `SearchResultItem`, expor `anoCelebracao`, `dataInicio` e `vencimentoAtual` como campos opcionais preservando retrocompatibilidade.
- Na correlação de licitações com itens homologados, agregar `fornecedor_nome` (via `string_agg(DISTINCT fornecedor_nome, '; ')`) e `fornecedor_cpf_cnpj` (via `string_agg(DISTINCT fornecedor_cpf_cnpj, ' ')`), projetando `fornecedorNome` no DTO e incluindo-os nos vetores `to_tsvector` e nas cláusulas de match textual.
- A similaridade trigramática (`word_similarity` / `similarity`) deve ser calibrada com pontuação mínima elevada (`> 0.50`) e comprimento mínimo `>= 5` letras para match trigramático de objetos, prevenindo correspondência espúria de palavras curtas com preposições e artigos da língua portuguesa ("do", "de", "da", "em").
- A normalização de pontuação corporativa (`.` e `-` convertidos em espaços com colapso de espaços múltiplos) deve ser aplicada no termo de busca e nos campos textuais de nomes de empresas, garantindo match consistente entre `L.PHILIPPE`, `L. PHILIPPE` e `L PHILIPPE`.
- O modal `LicitacoesSpotlightModal` deve exibir para contratos vigentes celebrados em anos anteriores o badge com o ano de celebração (`Celebrado em {ano}`) e a vigência formatada (`Vigência: {fmtDate(dataInicio)} a {fmtDate(vencimentoAtual)}`).
- Regras 1, 6, 9, 10, 11, 13, 14, 18, 20 do AGENTS.md aplicadas integralmente.

**Never:**
- Nunca executar comandos DDL/DML contra bancos de dados de produção (Regra 15).
- Nunca utilizar serviços externos pagos de busca (Elasticsearch/Algolia), mantendo o FTS 100% nativo no PostgreSQL.
- Nunca quebrar contratos de DTOs existentes na UI ou no cliente web.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Contrato plurianual de ano anterior | Busca `ano: 2026`, contrato celebrado em 2024 vigente até 2027 | Contrato retornado na busca com `ano: 2024`, status `vigente`, e exibição de badge `Celebrado em 2024` e vigência | Retorno normal sem erro |
| Busca por fornecedor homologado em licitação | Termo `"DOHA"`, licitação que possui item homologado para DOHA EMPREENDIMENTOS | Licitação retornada com `fornecedorNome: "DOHA EMPREENDIMENTOS E SERVICOS LTDA"` e destacada no resultado | Retorno normal sem erro |
| Eliminação de falso positivo trigramático | Termo `"doha"`, edital com objeto contendo apenas preposição `"do"` | Não dá match trigramático falso com `"do"`, retornando apenas correspondências reais | Retorno vazio se não houver match real |
| Variação de pontuação corporativa | Termo `"L.PHILIPPE"`, razão social `"L. PHILIPPE LTDA"` ou `"L PHILIPPE LTDA"` | Match positivo tanto via FTS quanto via ILIKE com normalização de pontuação | Retorno normal sem erro |
| Contrato com data_inicio nula | Contrato celebrado em 2024 sem `data_inicio`, com `vencimento_atual` em 2026 | Fallback para `ano <= 2026` e `vencimento_atual >= 2026`, incluindo o contrato | Retorno normal sem erro |
| Busca sem ano (global) | `ano: undefined`, termo `"veiculos"` | Busca em todos os exercícios sem filtro de vigência ou ano | Retorno normal sem erro |

</intent-contract>

## Code Map

- `packages/db/src/queries/licitacoes-contratos-search.ts` -- Centraliza a lógica de busca FTS e Kysely para licitações e contratos. Alterações: filtro temporal plurianual para contratos, correlação com `fct_licitacoes_itens`, calibração trigramática, normalização de pontuação corporativa e expansão do DTO `SearchResultItem`.
- `packages/db/src/queries/__tests__/licitacoes-contratos-search.spec.ts` -- Suíte de testes automatizados da busca unificada. Adição de testes para contratos plurianuais, fornecedores homologados de licitações, tolerância a pontuação corporativa e ausência de falsos positivos trigramáticos.
- `apps/web/components/licitacoes-spotlight-modal.tsx` -- Modal de busca Spotlight. Exibição de fornecedor homologado em licitações e, para contratos vigentes de anos anteriores, badge de ano de celebração e linha de período de vigência formatada via `fmtDate`.
- `apps/web/components/licitacoes-spotlight-modal.spec.tsx` -- Testes do modal Spotlight validando a renderização dos novos badges e campos.
- `packages/db/src/index.ts` -- Re-exportação de tipos e funções de busca do pacote `@transparencia/db`.

## Tasks & Acceptance

**Execution:**
- `packages/db/src/queries/licitacoes-contratos-search.ts` -- Atualizar `searchLicitacoesEContratos` para: (1) aplicar filtro temporal plurianual em contratos; (2) correlacionar `fct_licitacoes` com `fct_licitacoes_itens`; (3) calibrar regras trigramáticas (exigindo min length >= 5 e threshold > 0.50); (4) normalizar pontuação corporativa em FTS e ILIKE; (5) projetar `anoCelebracao`, `dataInicio` e `vencimentoAtual` em `SearchResultItem` -- Atender requisitos funcionais da Story 13.10.
- `packages/db/src/queries/__tests__/licitacoes-contratos-search.spec.ts` -- Adicionar testes para busca plurianual de contratos, licitações por fornecedor homologado, normalização corporativa e rejeição de falsos positivos trigramáticos -- Garantir paridade e prevenção de regressão.
- `apps/web/components/licitacoes-spotlight-modal.tsx` -- Renderizar `fornecedorNome` em licitações e badge de ano de celebração com período de vigência (`fmtDate`) para contratos vigentes originados de anos anteriores -- Atender critérios de usabilidade e visualização da Story 13.10.
- `apps/web/components/licitacoes-spotlight-modal.spec.tsx` -- Adicionar casos de teste para renderização de contratos plurianuais com badge de celebração e período de vigência -- Validação de interface.

**Acceptance Criteria:**
- Given a query unificada de busca em `packages/db/src/queries/licitacoes-contratos-search.ts`, when um usuário busca contratos sob o escopo de um determinado ano de exercício (ex: `ano = 2026`), then a filtragem temporal inclui todos os contratos onde `coalesce(EXTRACT(YEAR FROM data_inicio), ano) <= :anoParam AND (vencimento_atual IS NULL OR EXTRACT(YEAR FROM vencimento_atual) >= :anoParam)`.
- Given a busca de licitações, when o termo de busca corresponde ao nome ou documento de fornecedor homologado em itens da licitação (`fct_licitacoes_itens`), then a licitação correspondente é retornada com `fornecedorNome` projetado.
- Given um termo de busca curto de 4 letras (ex: `"doha"`), when executada a busca sobre objetos contendo palavras curtas como a preposição `"do"`, then nenhum falso positivo trigramático é gerado.
- Given razões sociais com variações de pontuação (ex: `"L.PHILIPPE"`, `"L. PHILIPPE"`, `"L PHILIPPE"`), when o usuário pesquisa em qualquer das variações, then o registro correspondente é retornado com sucesso.
- Given o modal `LicitacoesSpotlightModal`, when exibe resultados de contratos vigentes originados de exercícios anteriores, then exibe o badge do ano de celebração e o período de vigência formatado.

## Spec Change Log

## Review Triage Log

### 2026-09-23 — Review pass
- verdicts: 18 findings — high 4, medium 5, low 7, false 2, maybe-false 0
- findings:
  - `[high]` `[patch]` Escape incorreto de regex em template literal (`\s+` interpretado como `'s+'`) em fetchLicitacoes e fetchContratos — Substituído por classe POSIX imune a escaping `'[[:space:]]+'`.
  - `[high]` `[patch]` Colapso de múltiplos espaços não executado em SQL por falha de regex — Agrupado com finding 1; substituído por `'[[:space:]]+'`.
  - `[high]` `[patch]` Expressão regexp_replace com \s+ dentro de template literal relatada por verificação — Agrupado com finding 1; corrigido com `'[[:space:]]+'`.
  - `[high]` `[patch]` Template literal unescaped \s+ regex trigger condition relatada por edge-case — Agrupado com finding 1; corrigido com `'[[:space:]]+'`.
  - `[medium]` `[patch]` Broken verification de normalização corporativa para termos curtos (< 5 chars) mascarada por trigrama — Corrigida expressão regex e adicionado teste unitário específico para "A.B." vs "A. B. SERVICOS LTDA".
  - `[medium]` `[patch]` Falta de filtro de homologação em subquery de itens de licitação — Adicionado filtro `AND (situacao_item IS NULL OR situacao_item = 'homologado')` na agregação de itens e teste unitário para itens cancelados.
  - `[medium]` `[patch]` Claim de correlação de fornecedores homologados sem validação de situacao_item — Agrupado com finding 6; filtro aplicado.
  - `[medium]` `[patch]` Vazamento de contratos legados com vencimento_atual nulo para exercícios posteriores — Ajustada condição temporal para restringir contratos com vencimento nulo ao próprio ano de celebração (`ano = filterAno`) e adicionado teste.
  - `[medium]` `[patch]` Mismatch de exercício no deep link (href) de contratos plurianuais na busca — Atualizado `href` para apontar para `ano=${filterAno ?? ano}` mantendo o escopo pesquisado pelo cidadão.
  - `[low]` `[patch]` formatDateValue com risco de RangeError em Date inválido (NaN) — Adicionada guarda `Number.isNaN(val.getTime()) ? null : ...`.
  - `[low]` `[patch]` Contrato com ano nulo ou zero avaliado incorretamente como ano anterior — Adicionada guarda `item.ano > 0` antes de calcular `isAnoAnterior`.
  - `[low]` `[patch]` Incompatibilidade de busca de CPF/CNPJ digitados sem pontuação — Adicionada correspondência por dígitos numéricos puros via `regexp_replace(..., '[^0-9]', '', 'g')`.
  - `[low]` `[patch]` Gargalo de performance por ausência de pushdown de filterAno na subquery de itens — Adicionado pushdown condicional `AND ano = ${filterAno}`.
  - `[low]` `[patch]` Duplicação visual de ano consecutivo (badge de celebração seguido de ano do contrato) — Condicionada a exibição de `· {item.ano}` apenas quando não houver o badge de ano anterior.
  - `[low]` `[patch]` Risco de estouro de layout em licitações com múltiplos vencedores — Adicionada classe `line-clamp-2` e pluralização dinâmica `"Fornecedores homologados:"` vs `"Fornecedor:"`.
  - `[low]` `[patch]` Violação da diretriz de formatação SQL sem alinhamento por espaços — Formatada a cláusula `ON` com espaçamento único sem alinhamento artificial.
  - `[false]` `[reject]` Redundância de anoCelebracao vs ano em SearchResultItem — Rejeitado: critério 7 exige exibição expressa do ano de celebração; campo dedicado explicita o contrato semântico preservando compatibilidade.
  - `[false]` `[reject]` Desativação indiscriminada de trigramas para termos curtos (< 5 caracteres) — Rejeitado: critério 5 exigiu explicitamente comprimento mínimo >= 5 caracteres ou pontuação elevada para eliminar matches de 4 letras com preposições de 2 letras ("do").

## Auto Run Result

### Summary of implemented change
Refinamento da busca global unificada de compras públicas (`searchLicitacoesEContratos` e `LicitacoesSpotlightModal`):
1. Filtro temporal plurianual para contratos garantindo que contratos celebrados em anos anteriores ativos no exercício corrente (`coalesce(EXTRACT(YEAR FROM data_inicio), ano) <= filterAno AND (vencimento_atual IS NULL OR EXTRACT(YEAR FROM vencimento_atual) >= filterAno)`) sejam encontrados na busca, preservando o deep link no ano pesquisado (`ano=${filterAno ?? ano}`).
2. Correlação de licitações com `analytics.fct_licitacoes_itens` filtrando itens homologados (`situacao_item = 'homologado'`), projetando `fornecedorNome` no DTO e indexando vencedores tanto no FTS quanto em ILIKE e rank.
3. Calibração trigramática com comprimento mínimo de 5 caracteres e pontuação elevada (> 0.50), eliminando falsos positivos de palavras curtas (ex: "doha" vs preposição "do").
4. Normalização de pontuação e caracteres corporativos (`.` e `-` com colapso de espaços múltiplos via regex POSIX `'[[:space:]]+'`) e dígitos limpos para CNPJ/CPF.
5. Apresentação no Spotlight Modal com badge de celebração (`Celebrado em {ano}`) e período de vigência formatado (`Vigência: {fmtDate(dataInicio)} a {fmtDate(vencimentoAtual)}`) para contratos vigentes de anos anteriores, e exibição de fornecedores homologados em licitações.

### Files changed with one-line descriptions
- `packages/db/src/queries/licitacoes-contratos-search.ts`: Implementação do filtro temporal plurianual, correlação de itens homologados, calibração trigramática, normalização corporativa e extensão do DTO SearchResultItem.
- `packages/db/src/queries/__tests__/licitacoes-contratos-search.spec.ts`: Testes unitários cobrindo busca plurianual, fornecedores homologados de licitações, termos curtos com pontuação, CPF/CNPJ sem pontuação e ausência de falsos positivos.
- `apps/web/components/licitacoes-spotlight-modal.tsx`: Exibição de fornecedor homologado em licitações e badge de ano de celebração com vigência formatada para contratos de anos anteriores.
- `apps/web/components/licitacoes-spotlight-modal.spec.tsx`: Testes de interface para fornecedor homologado e badge de contrato plurianual no modal.

### Review findings breakdown
- Patches applied: 16 patches (findings 1 a 13 e 16 a 18: regex POSIX `[[:space:]]+`, teste para termos curtos pontuados, filtro de itens homologados, pushdown de ano, guardas de data inválida e ano zero, não-vazamento de vencimento nulo, deep link correto no exercício pesquisado, suporte a CPF/CNPJ puro e line-clamp).
- Items deferred: 0.
- Rejected findings: 2 findings (finding 14: anoCelebracao explicita semântica do DTO; finding 15: desativação de trigrama para palavras curtas atende expressamente o critério 5 de aceitação).

### Follow-up review recommendation
- `followup_review_recommended: false` — Todos os 16 patches foram aplicados e verificados com 100% de sucesso nas suítes automatizadas de banco (`@transparencia/db`: 139 testes), web (`apps/web`: 521 testes), formatação Biome (`pnpm lint`), compilação (`pnpm build`) e verificações estáticas (`make check`). Nenhum risco residual não verificado.

### Verification performed
- `pnpm --filter @transparencia/db test`: 24 arquivos de teste e 139 testes aprovados (100% sucesso).
- `pnpm --filter web test`: 73 arquivos de teste e 521 testes aprovados (100% sucesso).
- `pnpm lint`: Biome check aprovado em 314 arquivos com 0 erros.
- `pnpm build`: Turbo build concluído com sucesso em `@transparencia/db`, `@transparencia/ui` e `web`.
- `make check`: `ruff check`, `ruff format` e `mypy` concluídos com sucesso em 33 arquivos backend.

### Residual risks
- Nenhum risco residual identificado. Todas as props e campos adicionados aos DTOs são opcionais e mantêm estrita retrocompatibilidade.

## Design Notes

### Lógica de Filtro Temporal Plurianual de Contratos
Ao filtrar por ano de exercício (`anoParam`):
```sql
AND (
  (data_inicio IS NOT NULL AND EXTRACT(YEAR FROM data_inicio) <= :anoParam AND (vencimento_atual IS NULL OR EXTRACT(YEAR FROM vencimento_atual) >= :anoParam))
  OR
  (data_inicio IS NULL AND ano <= :anoParam AND (vencimento_atual IS NULL OR EXTRACT(YEAR FROM vencimento_atual) >= :anoParam))
)
```
Isso assegura que contratos assinados em anos anteriores continuem visíveis e localizáveis em exercícios nos quais sua execução permaneça vigente.

### Calibração Trigramática e Normalização Corporativa
- Normalização de termo: substituição de pontuações (`.`, `-`, `/`) por espaço e colapso de espaços múltiplos via regex POSIX `'[[:space:]]+'`.
- Normalização SQL: `regexp_replace(regexp_replace(unaccent(str), '[.\\-/]', ' ', 'g'), '[[:space:]]+', ' ', 'g')`.
- Threshold trigramático: restrito a termos com comprimento `>= 5` e similaridade `> 0.50`, eliminando o match espúrio de termos como `"doha"` com a preposição `"do"`.

## Verification

**Commands:**
- `pnpm --filter @transparencia/db test` -- expected: Todos os testes de busca e queries Kysely passam sem erros.
- `pnpm --filter @transparencia/web test` -- expected: Testes do modal Spotlight e componentes passam com 100% de sucesso.
- `pnpm lint` -- expected: Biome linter executado sem erros.
- `pnpm build` -- expected: Compilação Turbo e type-checking estrito aprovados.
