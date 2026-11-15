---
baseline_commit: 54e1336
generated_at: 2026-08-07T15:04:30-03:00
---

# Story 4.4: Investigação e Correção de Emendas via PIX Zeradas em "Recebido por Emendas Parlamentares"

## Metadados

- Epic: 4 - Experiência Visual, Responsividade Mobile, SEO & Otimização para LLMs
- Story ID: 4.4
- Story Key: 4-4-investigacao-e-correcao-de-emendas-pix-zeradas-em-recebido-por-emendas-parlamentares
- Status: done
- Arquivo: _bmad-output/implementation-artifacts/4-4-investigacao-e-correcao-de-emendas-pix-zeradas-em-recebido-por-emendas-parlamentares.md

## User Story

Como cidadão, auditor ou usuário do portal de transparência municipal,
Quero que as métricas de "Recebido por emendas parlamentares" e "Emendas PIX" no painel de receitas e cabeçalhos reflitam fielmente os dados registrados na tabela `raw.emendas_cad`,
Para que transferências por emendas PIX e emendas individuais não apareçam incorretamente zeradas na interface web.

## Critérios de Aceitação (BDD)

**Given** a presença de registros de emendas via PIX na tabela bruta `raw.emendas_cad` (via `stg_porciuncula_prefeitura__emendas_cad`)
**When** o pipeline do dbt é executado e atualiza as tabelas intermediárias e marts (`int_emendas_consolidadas`, `fct_emendas` e `fct_fontes_receita_metricas`)
**Then** as regras de classificação/distinção de modalidades de emenda (PIX vs. Individuais vs. Outras) em `fct_emendas` e `fct_fontes_receita_metricas` devem categorizar corretamente os registros de transferência especial / PIX.

**And** a coluna `emendas_pix_arrecadado` no mart `fct_fontes_receita_metricas` deve computar o total arrecadado via PIX sem zerar indevidamente quando existirem registros válidos na tabela de origem ou na receita orçamentária.

**And** as funções leitoras Kysely em `@transparencia/db` (`getFontesReceitaMetrics`) devem expor o campo `emendasPixArrecadado` devidamente populado.

**And** o componente `EmendasCard` (`apps/web/components/emendas-card.tsx`) no quadro "Recebido por emendas parlamentares" deve exibir o valor correto e não zerado para o saldo de Emendas PIX e percentuais correspondentes.

**And** a suíte de testes dbt (`make test`) e testes TypeScript de paridade (`make test/ts`) deve validar a acurácia dos saldos calculados sem regressão fiscal.

## Contexto da Epic e Valor

- Na Epic 4, garantimos a integridade de dados e visualização confiável em todo o portal TransparenciaWeb.
- Foi identificado um bug contábil/de agregação: o valor de "Emendas PIX" em "Recebido por emendas parlamentares" está zerado na interface web, apesar de existirem registros cadastrados na tabela raw `emendas_cad` e receitas orçamentárias de transferências especiais.
- Esta story realiza a auditoria e correção de ponta a ponta do fluxo de dados: da staging raw `stg_porciuncula_prefeitura__emendas_cad` até os marts do dbt (`fct_emendas.sql` e `fct_fontes_receita_metricas.sql`), leitor Kysely (`getFontesReceitaMetrics`) e renderização nos componentes web (`EmendasCard`).

## Guardrails Arquiteturais Obrigatórios

### AD-1, AD-2, AD-3 e SSOT no dbt
1. As agregações e cálculos de emendas pertencem exclusivamente ao dbt (`marts/metrics/fct_fontes_receita_metricas.sql` e `marts/fct_emendas.sql`).
2. A camada `@transparencia/db` deve apenas ler a métrica pré-calculada do mart, mantendo o padrão de leitor atômico burro ("pass-through").
3. Nenhuma agregação `SUM()` sobre dados transacionais brutos em runtime deve ser introduzida em TypeScript.

### AGENTS.md e Protocolos de Qualidade
1. **Nomes Explícitos**: Nenhuma abreviação opaca (`c_valor`, `df`, `pct`). Manter campos explícitos em SQL e TypeScript (`emendas_pix_arrecadado`, `emendas_individuais_arrecadado`, `emendas_total_arrecadado`).
2. **Preservação de Fontes (`_sources.yml`)**: Caso seja necessário declarar novas colunas da raw `emendas_cad`, atualizar `_sources.yml` conforme Regra 5 do `AGENTS.md`.
3. Executar `make test` e `make test/ts` e `pnpm build` garantindo 100% de aprovação antes de concluir.

## Diagnóstico Técnico Detalhado e Causa Raiz

### Causa Raiz Identificada no dbt (`fct_fontes_receita_metricas.sql`)
1. **Sobrescrita da Receita PIX Orçamentária por `fct_emendas` zerado**:
   Em `elt/transform/models/marts/metrics/fct_fontes_receita_metricas.sql` (linhas 157-166), a junção com `emendas_fct` possuía a seguinte regra defeituosa:
   ```sql
   case
       when ef.portal_slug is not null and (ef.emendas_pix_fct > 0 or ef.emendas_individuais_fct > 0)
       then ef.emendas_pix_fct
       else coalesce(b.emendas_pix_arrecadado, 0)
   end as emendas_pix_arrecadado,
   ```
   **Defeito Lógico**: Se `ef.emendas_individuais_fct > 0` porém `ef.emendas_pix_fct` era 0, a condição avaliava como `TRUE`, fazendo `emendas_pix_arrecadado` receber `0` e sobrescrever o saldo arrecadado de `b.emendas_pix_arrecadado` da receita orçamentária.

2. **Solução Aplicada**: Substituído por `greatest(coalesce(ef.emendas_pix_fct, 0), coalesce(b.emendas_pix_arrecadado, 0))` e busca por termos PIX insensíveis a acentos/caixa (`unaccent`) considerando `tipo_emenda`, `resumo` e `destinacao`.

## Plano de Execução / Subtarefas

- [x] **Task 1 - Corrigir Agregação e Fallback de Emendas PIX no dbt (AC: 1, 2)**
  - [x] Atualizar `elt/transform/models/marts/metrics/fct_fontes_receita_metricas.sql` para usar `greatest`/`coalesce` entre `ef.emendas_pix_fct` e `b.emendas_pix_arrecadado`.
  - [x] Expandir busca de termos PIX em `emendas_fct` (incluindo `tipo_emenda`, `resumo` e `destinacao` sanitizados).

- [x] **Task 2 - Atualizar Suíte de Testes Fiscais do dbt (AC: 5)**
  - [x] Atualizar `elt/analytics/__tests__/test_fontes_receita.py` testando a não zeragem de `emendas_pix_arrecadado`.
  - [x] Executar `make test` e verificar aprovação 100%.

- [x] **Task 3 - Validar Leitor Kysely e UI Web (AC: 3, 4)**
  - [x] Executar `make test/ts` validando os contratos do DTO em `packages/db`.
  - [x] Executar `pnpm build` para garantir compilação limpa do frontend Next.js.

### Review Findings (AI)

- [x] [Review][Patch] Teste unitário de emendas PIX e individuais carece de asserções nos valores calculados [`elt/analytics/__tests__/test_fontes_receita.py`:159]
- [x] [Review][Patch] Ausência do uso de unaccent nas cláusulas de receitas_breakdown [`elt/transform/models/marts/metrics/fct_fontes_receita_metricas.sql`:81]

## Lista de Arquivos Modificados / Criados

- `elt/transform/models/marts/metrics/fct_fontes_receita_metricas.sql`
- `elt/analytics/__tests__/test_fontes_receita.py`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/4-4-investigacao-e-correcao-de-emendas-pix-zeradas-em-recebido-por-emendas-parlamentares.md`

## Registro do Agente Dev (Dev Agent Record)

- **Plano de Implementação**:
  1. Corrigida a lógica de junção de `emendas_fct` e `receitas_breakdown` no dbt model `fct_fontes_receita_metricas.sql` usando `greatest(coalesce(ef.emendas_pix_fct, 0), coalesce(b.emendas_pix_arrecadado, 0))`.
  2. Adicionada busca com `unaccent` em múltiplos campos (`tipo_emenda`, `resumo`, `destinacao`) para categorização resiliente de transferências especiais PIX.
  3. Adicionado caso de teste unitário `test_emendas_pix_and_individuais` em `elt/analytics/__tests__/test_fontes_receita.py`.
  4. Executados `make test` (83 testes Python passados), `make test/ts` (16 testes TypeScript passados) e `pnpm build` (compilação Next.js sem erros).

## Histórico de Alterações (Change Log)

- `2026-08-07`: Correção do fallback de emendas PIX e atualização dos testes de integração/paridade fiscal (Story 4.4 concluída).

## Status de Conclusão

Story 4.4 implementada e validada com 100% de sucesso. Status alterado para `review`.
