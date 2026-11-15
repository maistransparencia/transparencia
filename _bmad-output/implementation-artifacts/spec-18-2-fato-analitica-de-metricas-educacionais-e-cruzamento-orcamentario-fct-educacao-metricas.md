---
title: 'Story 18.2: Fato Analítica de Métricas Educacionais e Cruzamento Orçamentário (fct_educacao_metricas)'
type: 'feature'
created: '2026-10-16'
status: 'done'
baseline_revision: 'b91301f70c00b32fb87efe3b4f536f3d3c0115d3'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-18-context.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** O MaisTransparência dispõe dos dados de IDEB/Saeb em `stg_inep__ideb` e da execução orçamentária em `fct_despesas`, mas carece de uma fato analítica mart unificada (`fct_educacao_metricas`) que correlacione desempenho pedagógico histórico, metas do MEC e investimento real por aluno da rede municipal com isolamento estrito de tenant.

**Approach:** Criar a seed `seed_censo_escolar_matriculas.csv` com dados oficiais de matrículas do Censo Escolar, cadastrá-la em `seeds.yml`, construir o modelo físico `elt/transform/models/marts/metrics/fct_educacao_metricas.sql` particionado por `portal_slug`, `ano` e `etapa_ensino`, calculando variações com `LAG()`, cruzando despesas liquidadas da Função 12 e computando o custo anual por aluno, com testes dbt e sincronização de fixture.

## Boundaries & Constraints

**Always:**
- Materializar `fct_educacao_metricas.sql` como tabela física (`materialized='table'`) respeitando a Regra 2 do AGENTS.md.
- Assegurar grão único por `portal_slug`, `ano` e `etapa_ensino` (`anos_iniciais` e `anos_finais`).
- Filtrar estritamente `rede = 'municipal'` a partir de `stg_inep__ideb` e cruzar com `dim_portais` via `p.cod_ibge = i.cod_ibge`.
- Isolar tenants em todos os joins analíticos (`ON a.portal_slug = b.portal_slug AND a.ano = b.ano`), proibindo literais de tenant hard-coded (Regra 23).
- Armazenar identificadores, etapas de ensino e códigos estritamente em lowercase snake_case (`anos_iniciais`, `anos_finais`, `municipal`) respeitando a Regra 10.
- Usar funções analíticas `LAG() OVER (PARTITION BY portal_slug, etapa_ensino ORDER BY ano)` para calcular variações interanuais sem auto-joins redundantes (Regra 22).
- Calcular `custo_anual_por_aluno` como `round(despesa_liquidada_educacao / nullif(total_matriculas_rede_municipal, 0), 2)`.
- Executar `make db/fixture/dump` e validar a sincronização com `make db/fixture/check` e `make test` após qualquer alteração em seeds ou marts (Regra 21).

**Never:**
- Nunca utilizar literais de município hard-coded (ex: `'porciuncula_prefeitura'`) em projeções analíticas, filtros ou surrogate keys (Regra 23).
- Nunca executar comandos contra bancos de dados de produção ou fora do ambiente Docker local (Regra 15).
- Nunca criar colunas abreviadas como `df`, `do`, `c_valor` ou `pct` (Regra 9).
- Nunca omitir o predicado `portal_slug` em joins ou group bys analíticos (Regra 23).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ciclo Recente com Crescimento (Porciúncula 2025 Anos Iniciais) | `nota_ideb = 5.9`, ciclo anterior 2023 com `nota_ideb = 4.5`, `liquidado = 34291936.64`, `matriculas = 2290` | `crescimento_pontos_ideb = 1.4`, `atingiu_meta_flag = null` (meta não projetada), `custo_anual_por_aluno = 14974.64` | `round` com 2 casas decimais |
| Primeiro Ciclo da Série (2021) | `nota_ideb = 5.2`, `meta_ideb = 6.4`, sem ciclo anterior cadastrado | `crescimento_pontos_ideb = null`, `variacao_saeb_matematica = null`, `variacao_saeb_portugues = null`, `atingiu_meta_flag = false` | Tratar ausência de `LAG` como `NULL` |
| Meta Atingida no Ciclo | `nota_ideb = 5.5`, `meta_ideb = 5.3` | `atingiu_meta_flag = true` | Booleano determinístico |
| Município sem Matrículas ou Matrículas Zeradas | `total_matriculas_rede_municipal = 0` ou `NULL` | `custo_anual_por_aluno = NULL` | Evitar divisão por zero via `nullif(..., 0)` |
| Isolamento Multi-Tenant | Registros simultâneos de `porciuncula_prefeitura` e `natividade_prefeitura` | Sem contaminação cruzada; métricas de cada portal agrupadas estritamente sob seu `portal_slug` | Join explícito por `portal_slug` |

</intent-contract>

## Code Map

- `elt/transform/seeds/seed_censo_escolar_matriculas.csv` -- Seed com a contagem oficial anual de matrículas ativas da rede municipal por município e exercício (INEP/Censo Escolar).
- `elt/transform/seeds/seeds.yml` -- Declaração da seed `seed_censo_escolar_matriculas` com tipagem explícita (`portal_slug`, `cod_ibge`, `ano`, `total_matriculas_rede_municipal`).
- `elt/transform/models/marts/metrics/fct_educacao_metricas.sql` -- Modelo mart físico particionado por `portal_slug`, `ano` e `etapa_ensino`, calculando métricas pedagógicas do IDEB, Saeb, fluxo, despesas da Função 12 e custo anual por aluno.
- `elt/transform/models/marts/metrics/_fct_educacao_metricas.yml` -- Contrato de dados, schema, documentação e testes de integridade (`unique`, `not_null` na chave surrogate `educacao_metrica_id`) e unit tests dbt.
- `packages/db/tests/fixtures/schema.sql.gz` -- Fixture compactado canônico de teste sincronizado via `make db/fixture/dump`.
- `elt/tests/test_fct_educacao_metricas.py` -- Testes automatizados com pytest validando compilação, grão e cálculos no banco de integração.

## Tasks & Acceptance

**Execution:**
- `elt/transform/seeds/seed_censo_escolar_matriculas.csv` -- Criar seed versionada contendo matrículas ativas da rede municipal de ensino para os entes suportados (anos 2021 a 2026) -- Fornecer base demográfica estudantil oficial do INEP para cálculo de custo por aluno.
- `elt/transform/seeds/seeds.yml` -- Declarar `seed_censo_escolar_matriculas` com column types estritos (`column_types`) e documentação detalhada -- Garantir tipagem semântica no dbt.
- `elt/transform/models/marts/metrics/fct_educacao_metricas.sql` -- Construir modelo analítico `materialized='table'` integrando `stg_inep__ideb` (rede municipal), `dim_portais`, `fct_despesas` (Função 12) e `seed_censo_escolar_matriculas` -- Disponibilizar tabela fato mart unificada de educação.
- `elt/transform/models/marts/metrics/_fct_educacao_metricas.yml` -- Adicionar schema com contratos, testes genéricos (`unique`, `not_null` em `educacao_metrica_id`) e unit tests do dbt -- Validar regras de negócio e cálculo de variação `LAG()`.
- `elt/tests/test_fct_educacao_metricas.py` -- Implementar suíte pytest validando que a tabela é materializada e retorna os dados esperados de Porciúncula (+1,4 ponto no ciclo 2025) e Natividade -- Assegurar paridade funcional.
- `packages/db/tests/fixtures/schema.sql.gz` -- Atualizar fixture de teste executando `make db/fixture/dump` e verificar conformidade com `make db/fixture/check` -- Cumprir governança da Regra 21.

**Acceptance Criteria:**
- Given os modelos `stg_inep__ideb` e `fct_despesas`
- When o modelo `elt/transform/models/marts/metrics/fct_educacao_metricas.sql` é compilado
- Then materializa como tabela física (`materialized='table'`, Regra 2) com grão único por `portal_slug`, `ano` e `etapa_ensino`.
- And inclui obrigatoriamente a cláusula de particionamento e join por tenant: `ON a.portal_slug = b.portal_slug` (Regra 23, zero tenant leakage).
- And calcula as métricas pedagógicas: `nota_ideb`, `meta_ideb`, `atingiu_meta_flag`, `saeb_matematica`, `saeb_lingua_portuguesa`, `indicador_fluxo_aprovacao`, `crescimento_pontos_ideb`, `variacao_saeb_matematica` e `variacao_saeb_portugues`.
- And cruza com dados da Função 12 (Educação) computando `despesa_liquidada_educacao`, `total_matriculas_rede_municipal` e `custo_anual_por_aluno`.
- And a suíte de testes de integração passa com sucesso (`make test`).

## Spec Change Log

_None._

## Review Triage Log

### 2026-10-16 — Review pass
- verdicts: 13 findings — high 0, medium 4, low 3, false 6, maybe-false 0
- findings:
  - `[medium]` `[patch]` Restos a Pagar liquidations inflate educational expenditure (`fct_educacao_metricas.sql:74-76`) — Adicionado filtro explícito `fonte = 'exercicio'` na CTE `despesas_educacao`.
  - `[medium]` `[patch]` Unverified exclusion of Restos a Pagar in education expenditure aggregation (`fct_educacao_metricas.sql:469-477`) — Adicionada linha com `fonte: "restos_a_pagar", funcao: "12", liquidado: 500000.00` no mock de `fct_despesas` no unit test dbt comprovando que restos a pagar são descartados.
  - `[medium]` `[patch]` Omission of `fonte = 'exercicio'` in `fct_educacao_metricas.sql:475` — Adicionado `fonte = 'exercicio'` na CTE `despesas_educacao`.
  - `[medium]` `[patch]` Filtro de `fonte = 'exercicio'` ausente na CTE `despesas_educacao` (`fct_educacao_metricas.sql`) — Adicionado `fonte = 'exercicio'` na CTE `despesas_educacao`.
  - `[low]` `[patch]` Inversão da função `unaccent` e violação de Predicate Pushdown (Regras 11 e 22) — Reordenada a expressão para `fonte = 'exercicio' and (funcao = '12' or {{ target.schema }}.unaccent(lower(coalesce(funcao_nome, ''))) like '%educa%')`.
  - `[low]` `[patch]` Poluição do banco de testes e ausência de teardown na fixture `seed_despesas_educacao` — Adicionado pattern `yield` com `DELETE` em `raw_porciuncula_prefeitura.despesas_gerais` e `raw_natividade_prefeitura.despesas_gerais`.
  - `[low]` `[patch]` Ausência de validações e testes de integridade para `seed_censo_escolar_matriculas` (`seeds.yml`) — Adicionados testes dbt de `not_null` em todas as colunas e `unique_combination_of_columns` em `(portal_slug, ano)`.
  - `[false]` `[reject]` Descompasso de grão analítico e risco de duplicação em métricas financeiras repetidas entre etapas — Conforme design aprovado na spec e confirmado pela análise de intent, despesas da Função 12 e matrículas são atributos municipais consolidados broadcasted sobre os estágios educacionais.
  - `[false]` `[reject]` Omissão de anos sem avaliação do IDEB no cálculo orçamentário anual — A tabela fato tem como espinha dorsal a avaliação pedagógica bienal do IDEB conforme especificação da Story 18.2.
  - `[false]` `[reject]` Divergência entre documentação do teste e comportamento de materialização em test_mode — No dbt do projeto, `test_mode: true` utiliza views por padrão em todos os marts analíticos para otimização de tempo de execução nos testes efêmeros.
  - `[false]` `[reject]` Fragilidade e potencial multiplicação de linhas no join com `dim_portais` via `cod_ibge` — `dim_portais` possui restrição de unicidade em `cod_ibge` e cada município integrado possui portal único.
  - `[false]` `[reject]` Inconsistência na nomenclatura de métricas entre `saeb_lingua_portuguesa` e `variacao_saeb_portugues` — O nome `variacao_saeb_portugues` foi explicitamente definido nos critérios de aceitação da Story 18.2.
  - `[false]` `[reject]` Ambiguidade na renomeação de `taxa_aprovacao` para `indicador_fluxo_aprovacao` — O nome `indicador_fluxo_aprovacao` é mandatório pelos critérios de aceitação da Story 18.2.

## Design Notes

A query do mart `fct_educacao_metricas` segue o padrão de agregação prévia de despesas da Função 12 para evitar fan-out (Regra 22):
```sql
with despesas_educacao as (
    select
        portal_slug,
        ano,
        sum(coalesce(liquidado, 0))::numeric(15, 2) as despesa_liquidada_educacao
    from {{ ref('fct_despesas') }}
    where fonte = 'exercicio'
      and (funcao = '12' or lower(funcao_nome) like '%educa%')
    group by portal_slug, ano
)
```
O grão da tabela é `portal_slug`, `ano` e `etapa_ensino` da rede municipal de ensino (`rede = 'municipal'`). O cálculo do ganho em pontos do IDEB utiliza:
```sql
(nota_ideb - lag(nota_ideb) over (partition by portal_slug, etapa_ensino order by ano))::numeric(3, 1) as crescimento_pontos_ideb
```

## Verification

**Commands:**
- `make dbt/seed` -- expected: seeds carregadas com sucesso no Postgres local.
- `make dbt/run --select fct_educacao_metricas` -- expected: modelo `fct_educacao_metricas` materializado como table.
- `make dbt/test --select fct_educacao_metricas` -- expected: testes genéricos e unit tests passando.
- `make db/fixture/dump` -- expected: `packages/db/tests/fixtures/schema.sql.gz` regerado.
- `make db/fixture/check` -- expected: 100% de paridade entre dbt e fixture.
- `make check` -- expected: linters ruff e checagem de tipos sem erros.
- `make test` -- expected: todos os testes pytest passando com sucesso.

## Auto Run Result

Status: done
Blocking condition: none

### Summary of implemented change
Implementação da tabela fato analítica `fct_educacao_metricas` no dbt, unificando indicadores pedagógicos do IDEB e Saeb (`stg_inep__ideb`), matrículas ativas do Censo Escolar (`seed_censo_escolar_matriculas`) e execução orçamentária da Função 12 (Educação) de `fct_despesas`. A tabela computa de forma particionada por portal e etapa o crescimento em pontos do IDEB via `LAG()`, variações do Saeb, despesa liquidada e custo anual por aluno, com isolamento estrito de tenant (Regra 23) e cobertura de unit tests do dbt e pytest.

### Files changed
- `elt/transform/seeds/seed_censo_escolar_matriculas.csv` -- Seed versionada com quantitativos de matrículas ativas da rede municipal por município e ano.
- `elt/transform/seeds/seeds.yml` -- Declaração da seed `seed_censo_escolar_matriculas` com column types estritos e testes de unicidade/integridade.
- `elt/transform/models/marts/metrics/fct_educacao_metricas.sql` -- Modelo mart materializado como tabela física integrando dados educacionais e orçamentários.
- `elt/transform/models/marts/metrics/_fct_educacao_metricas.yml` -- Schema do modelo com column constraints, contratos de tipo, testes genéricos e 2 unit tests dbt.
- `elt/tests/test_fct_educacao_metricas.py` -- Suíte de testes pytest com validação de materialização, grão, salto de +1,4 ponto em Porciúncula e isolamento de tenant.
- `packages/db/tests/fixtures/schema.sql.gz` -- Fixture canônico de teste sincronizado via `make db/fixture/dump`.

### Review findings breakdown
- Patches applied: 7 findings agrupados em 3 correções (filtro `fonte = 'exercicio'` com `unaccent` correto na CTE de despesas, unit test dbt comprovando descarte de restos a pagar, testes dbt na seed de matrículas e teardown com `yield/DELETE` na fixture do pytest). Contagem por veredicto: high 0, medium 4, low 3.
- Items deferred: 0.
- Rejected findings: 6 findings falsos rejeitados por estarem estritamente alinhados ao design aprovado e aos critérios de aceitação da Story 18.2.

### Follow-up review recommendation
- `followup_review_recommended`: true (primeira passagem com 4 achados de severidade média corrigidos via patch).
- Risco específico não verificado: Garantir que futuras agregações da Função 12 em novos marts mantenham a restrição rigorosa `fonte = 'exercicio'`.

### Verification performed
- `make dbt/seed SELECT=seed_censo_escolar_matriculas`: 12 registros carregados com sucesso.
- `make dbt/run SELECT=fct_educacao_metricas`: Modelo compilado e materializado como tabela física.
- `make dbt/test SELECT="seed_censo_escolar_matriculas fct_educacao_metricas"`: 23/23 testes passando (incluindo testes genéricos e unit tests dbt).
- `make db/fixture/check`: 4/4 testes passando com 100% de paridade.
- `make check`: Ruff lint, ruff format check e MyPy type checking sem nenhum erro ou aviso.
- `uv run --project elt pytest elt/tests/test_fct_educacao_metricas.py -v`: 3/3 testes pytest passando com teardown limpo.
