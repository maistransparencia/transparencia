---
baseline_commit: 3e83b4b8f521b4ffc186bf414c1faefca0aef531
---

# Story 12.1: Modelagem dbt do Motor Estatístico de Anomalias Fiscais (Fluxo Homólogo vs. Estoque 1:1)

Status: done

## Story

As a data engineer and municipal auditor,  
I want a dedicated dbt mart (`fct_anomalias_fiscais_metricas`) that applies rigorous statistical detection (IQR e Z-score modificado) segregating flux metrics (comparação temporal homóloga mês-a-mês) from snapshot/structural metrics (comparação direta 1:1 de comissionados em pessoal e saldo em caixa),  
So that anomalies are mathematically sound, immune to false-positives in partial fiscal years, and categorized with factual severity.

---

## Acceptance Criteria

1. **Mart Analítico `fct_anomalias_fiscais_metricas` (`elt/transform/models/marts/metrics/fct_anomalias_fiscais_metricas.sql`):**
   - Configurar materialização no schema `analytics` (usando `materialized='view' if var('test_mode', false) else 'table'`).
   - Integrar as fontes analíticas consolidadas: `fct_pessoal_regime_metricas`, `fct_saldo_caixa_siconfi`, `fct_despesas` e `fct_licitacoes`.
   - Implementar segregação metodológica:
     - **Fluxo Homólogo (Despesas e Dispensas):** Em anos parciais (ano corrente), comparar estritamente o período acumulado equivalente mês-a-mês (ex: Jan-Ago 2024 vs Jan-Ago de exercícios anteriores).
     - **Estoque/Snapshot 1:1 (Pessoal e Caixa):** Comparar a posição estrutural instantânea (headcount ativo de comissionados e saldo de caixa bancário) contra a média/mediana histórica dos mesmos períodos.
   - Padronizar campos e classificadores em `lowercase snake_case`:
     - `tipo_anomalia`: `explosao_comissionados`, `rombo_caixa`, `pico_despesa_homologa`, `concentracao_dispensa`
     - `dimensao_referencia`: `saude`, `educacao`, `comissionados`, `recursos_livres`, `dispensas` (em snake_case)
     - `grau_severidade`: `critico`, `alto`, `moderado`
     - Dimensões temporais canônicas: `mes_inicial` e `mes_final` (inteiros discretos de 1 a 12)
   - Delegar a composição textual factual e explicável para a camada de apresentação/ViewModel a partir das métricas e dimensões estruturadas.
   - Fornecer `deep_link_rota` com âncoras e parâmetros canônicos.

2. **Documentação e Testes dbt (`elt/transform/models/marts/metrics/_fct_anomalias_fiscais_metricas.yml`):**
   - Documentar modelo e colunas.
   - Adicionar testes de integridade (`unique`, `not_null`, `accepted_values`).

3. **Governança de Fixtures e Testes de Integração:**
   - Atualizar `packages/db/tests/fixtures/schema.sql.gz` com `make db/fixture/dump`.
   - Adicionar teste de integração em `elt/tests/test_db.py`.
   - Validar paridade e execução com `make test` e `make db/fixture/check`.
