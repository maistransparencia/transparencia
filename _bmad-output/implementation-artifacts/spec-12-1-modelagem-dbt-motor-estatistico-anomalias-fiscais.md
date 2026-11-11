---
title: 'Story 12.1: Modelagem dbt do Motor Estatístico de Anomalias Fiscais (Fluxo Homólogo vs. Estoque 1:1)'
type: 'feature'
created: '2026-09-13'
baseline_revision: 'b880730faab019ca3ff8ae056bd9f7d3439c9181'
status: 'done'
review_loop_iteration: 1
followup_review_recommended: false
context:
  - '_bmad-output/implementation-artifacts/epic-12-context.md'
  - '_bmad-output/planning-artifacts/epics.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** O portal da transparência apresenta visões analíticas históricas, mas carece de um motor estatístico automatizado e à prova de falsos-positivos para identificar anomalias fiscais tempestivas (como surtos de cargos comissionados, rombos de liquidez em caixa, picos de despesas por função e concentração atípica de dispensas de licitação), distinguindo a sazonalidade de fluxos parciais de distorções estruturais em snapshots instantâneos.

**Approach:** Criar o mart analítico dbt `fct_anomalias_fiscais_metricas` materializado como tabela no schema `analytics`, segregando metodologicamente métricas de fluxo homólogo (comparações estritas mês-a-mês para exercícios correntes parciais) de métricas de estoque/snapshot (comparação 1:1 contra histórico), aplicando detecção por IQR e Z-score modificado com categorização neutra e factual (`critico`, `alto`, `moderado`) e deep links canônicos para navegação cívica.

## Boundaries & Constraints

**Always:**
- Segregar rigorosamente métricas de fluxo (despesas por função e licitações com recorte temporal acumulado homólogo) de métricas de estoque/snapshot (headcount de comissionados e saldo de caixa em comparação 1:1).
- Utilizar exclusivamente identificadores e classificadores em `lowercase snake_case` (`tipo_anomalia`: `explosao_comissionados`, `rombo_caixa`, `pico_despesa_homologa`, `concentracao_dispensa`; `grau_severidade`: `critico`, `alto`, `moderado`).
- Todas as colunas textuais no PostgreSQL devem ser do tipo `TEXT` (Regra 16 do `AGENTS.md`).
- Gerar sumários `resumo_factual` estritamente neutros, objetivos e explicativos, sem termos adjetivados, conclusões de dolo ou teor acusatório.
- Sem alinhamento por espaços extras em código SQL (Regra 6 do `AGENTS.md`).
- Executar e validar dbt estritamente no ambiente local/Docker ou instâncias de teste efêmeras (Regra 15 do `AGENTS.md`).
- Atualizar fixtures de teste com `make db/fixture/dump` e verificar conformidade com `make db/fixture/check` e `make test` (Regra 21 do `AGENTS.md`).

**Never:**
- Nunca comparar exercícios fiscais incompletos com anos completos em métricas de fluxo sem equalização temporal homóloga mês-a-mês.
- Nunca executar comandos DDL/DML contra bancos de dados de produção ou Supabase remoto sem autorização explícita.
- Nunca utilizar tipos `VARCHAR(n)` ou `CHAR(n)` nas definições de schema SQL.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ano corrente incompleto (Fluxo) | Despesas de 2024 acumuladas até Agosto (mês 8) | Compara Jan-Ago de 2024 contra média/mediana de Jan-Ago de 2021, 2022 e 2023 | Não gera anomalia de subexecução artificial por incompletude do exercício |
| Snapshot de comissionados (Estoque) | Headcount ativo de comissionados em 2024 com salto expressivo (+65%) | Detecta `tipo_anomalia = 'explosao_comissionados'`, `grau_severidade = 'critico'`, desvio percentual e deep link para `/[portalSlug]/pessoal?ano=2024#comissionados` | Trata divisão por zero se anos anteriores tiverem zero comissionados |
| Saldo de caixa negativo ou queda abrupta | Saldo SICONFI em contas de livre destinação negativo ou 3 desvios abaixo da mediana histórica | Detecta `tipo_anomalia = 'rombo_caixa'`, `grau_severidade = 'critico'`, deep link para `/[portalSlug]/receitas?ano=2024#saldo-caixa` | Ignora entidades sem histórico mínimo de competências |
| Exercício sem desvios significativos | Despesas, licitações e pessoal dentro do intervalo [Q1 - 1.5*IQR, Q3 + 1.5*IQR] | Nenhuma linha de anomalia gerada para a respectiva dimensão/ano | Modelo compila normalmente com resultado vazio para o escopo sem desvio |

</intent-contract>

## Code Map

- `elt/transform/models/marts/metrics/fct_anomalias_fiscais_metricas.sql` -- Mart central dbt materializado como tabela no schema `analytics`, integrando as regras estatísticas de fluxo e estoque.
- `elt/transform/models/marts/metrics/_fct_anomalias_fiscais_metricas.yml` -- Documentação de schema dbt, contratos de tipos e testes (`not_null`, `unique`, `accepted_values`).
- `elt/transform/models/marts/metrics/fct_pessoal_regime_metricas.sql` -- Fonte upstream para métricas de estoque de cargos comissionados por entidade e ano.
- `elt/transform/models/marts/financeiro/fct_saldo_caixa_siconfi.sql` -- Fonte upstream para disponibilidades financeiras e saldos de caixa SICONFI Classe 1.
- `elt/transform/models/marts/fct_despesas.sql` -- Fonte upstream para agregação de despesas por função com filtro de mês para comparação homóloga.
- `elt/transform/models/marts/fct_licitacoes.sql` -- Fonte upstream para cálculo de proporção e concentração de dispensas de licitação.
- `packages/db/tests/fixtures/schema.sql.gz` -- Fixture compactada do PostgreSQL sincronizada via `make db/fixture/dump`.

## Tasks & Acceptance

**Execution:**
- `elt/transform/models/marts/metrics/fct_anomalias_fiscais_metricas.sql` -- Criar modelo dbt com CTEs para fluxo homólogo (despesas e dispensas) e estoque 1:1 (comissionados e caixa) aplicando IQR/Z-score modificado -- Implementa motor estatístico robusto livre de falsos-positivos.
- `elt/transform/models/marts/metrics/_fct_anomalias_fiscais_metricas.yml` -- Declarar documentação, testes de integridade e constraints de valores aceitos em snake_case -- Garante governança analítica dbt e tipagem estrita.
- `packages/db/tests/fixtures/schema.sql.gz` -- Atualizar a fixture de schema do banco de testes via `make db/fixture/dump` -- Mantém paridade estrita entre dbt e camada de dados TypeScript (Regra 21).
- `elt/tests/test_db.py` -- Adicionar teste automatizado de integração validando a presença e integridade de `fct_anomalias_fiscais_metricas` -- Garante execução sem regressão no pipeline Python.

**Acceptance Criteria:**
- Given os modelos upstream consolidados `fct_pessoal_regime_metricas`, `fct_saldo_caixa_siconfi`, `fct_despesas` e `fct_licitacoes`
- When o modelo `fct_anomalias_fiscais_metricas` for executado no dbt via `make dbt/run` ou `make test`
- Then a tabela `analytics.fct_anomalias_fiscais_metricas` é criada contendo as colunas: `anomalia_id`, `portal_slug`, `ano`, `tipo_anomalia`, `dimensao_referencia`, `grau_severidade`, `desvio_percentual`, `valor_observado`, `valor_esperado`, `mes_inicial`, `mes_final`, `deep_link_rota`, `metodo_deteccao`.
- And os classificadores utilizam estritamente snake_case: `tipo_anomalia` in (`explosao_comissionados`, `rombo_caixa`, `pico_despesa_homologa`, `concentracao_dispensa`), `dimensao_referencia` in (`saude`, `educacao`, `comissionados`, `recursos_livres`, `dispensas`, etc.) e `grau_severidade` in (`critico`, `alto`, `moderado`).
- And todas as colunas de texto são do tipo `TEXT`.
- And a suíte completa de testes (`make test`) executa com 100% de sucesso.

## Spec Change Log

_None._

## Review Triage Log

| Verdict | Finding / Location | Action / Evidence |
|---------|-------------------|-------------------|
| high | Surrogate key collision on multiple functional peaks (`fct_anomalias_fiscais_metricas.sql:283`) | Patched: incluído `resumo_factual` na surrogate key garantindo unicidade absoluta por anomalia |
| high | Lexicographical month comparison (`d.mes <= r.max_mes`) | Patched: adicionado cast numérico explícito `::integer` para mês em CTEs de despesas |
| medium | Procurement modality un-normalized matching | Patched: aplicado `unaccent(lower(coalesce(l.modalidade, '')))` com suporte a termos padrão e fallback de ano |
| low | Dynamic materialization in test mode | Patched: configurado `materialized='view' if var('test_mode', false) else 'table'` |
| low | URL slug interpolation | Patched: interpolado `portal_slug` diretamente na URL gerada de deep link |

## Design Notes

1. **Lógica de Fluxo Homólogo (Despesas):**
   - Identificar o mês máximo de execução no ano mais recente por portal: `mes_max = max(mes) where ano = max_ano`.
   - Filtrar os anos históricos limitando os registros ao intervalo `mes <= mes_max`.
   - Calcular média e desvio padrão (ou IQR) para o valor empenhado acumulado por função.
   - Desvio relativo: `(valor_observado - valor_esperado) / nullif(valor_esperado, 0) * 100`.

2. **Lógica de Estoque 1:1 (Pessoal e Caixa):**
   - Comissionados: contar total de profissionais com `categoria_regime = 'comissionado'` em `fct_pessoal_regime_metricas` por ano.
   - Saldo de caixa: selecionar o saldo de encerramento do exercício (ou da competência mais recente disponível) em `fct_saldo_caixa_siconfi`.
   - Comparar contra a média dos exercícios anteriores.

3. **Categorização de Severidade:**
   - `critico`: desvio percentual > 50% (ou saldo negativo em caixa de livre destinação) com impacto material relevante.
   - `alto`: desvio percentual entre 30% e 50%.
   - `moderado`: desvio percentual entre 15% e 30%.

## Verification

**Commands:**
- `make check` -- expected: linters e formatadores (ruff, sqlfluff) executam sem erros.
- `make test` -- expected: todos os testes pytest e compilação dbt em banco efêmero passam com sucesso.
- `make db/fixture/check` -- expected: paridade confirmada do schema da fixture.
