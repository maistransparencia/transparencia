---
status: done
---

# Story 24.2: Staging e Mart de Indicadores do SIOPE no dbt

## O que foi feito

- `siope_indicadores` declarada em `_sources.yml` de `porciuncula_prefeitura` e `natividade_prefeitura`.
- Staging `stg_<portal>__siope_indicadores` por portal e `int_siope_indicadores_consolidados` (union all, `portal_slug` preservado).
- Mart `fct_educacao_siope_metricas` (`models/marts/metrics/`), grão `portal_slug` + `ano`, contrato imposto, colunas: `investimento_por_aluno` (4.9), `investimento_por_aluno_basica` (4.8), `investimento_por_aluno_infantil` (4.1), `investimento_por_aluno_fundamental` (4.2), `percentual_aplicado_mde` (1.1), `percentual_aplicado_fundeb_profissionais` (1.2), `periodo`, `situacao`, `coletado_em`.
- Ausente = nulo (nunca zero). `situacao` = `encerrado` se o período mais avançado do ano é o 6, senão `parcial`. Hoje a 24.1 só grava o fechamento anual; o ano em andamento fica sem linha até haver ingestão bimestral.
- A coluna 1.2 não carrega o piso (60%/70%): o limite legal vem de `seed_constantes_fiscais.csv` na 24.5, após conferência de contador e jurista.
- Testes: unicidade, `relationships` com `dim_portais`, intervalo plausível; `elt/tests/test_fct_educacao_siope_metricas.py` (pivô, nulos, parcial, isolamento entre portais, referência de Porciúncula 2024 = 16.789,15 e 2025 = 16.767,14). `make test` (222) e `make check` passam.

## Auto Run Result

Status: done
