---
title: 'Story 13.4: Modelagem e Integração da Anomalia de Dependência Fiscal no dbt e Radar Cívico'
type: 'feature'
created: '2026-09-22'
status: 'done'
baseline_revision: '6267b8909e0764eb0de443872273eef13a3f5dbe'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** A vulnerabilidade fiscal decorrente da excessiva dependência de transferências externas da União e do Estado (FPM/ICMS) não era tratada como uma anomalia cívica formal de primeira classe no Radar Cívico, e a exibição em tela utilizava um aviso isolado (`AlertBox`) com regras soltas sem amparo temporal consolidado, arriscando falsos alarmes em exercícios correntes incompletos.

**Approach:** Modelar a anomalia `dependencia_transferencias` como anomalia analítica oficial no modelo dbt `fct_anomalias_fiscais_metricas.sql` restrita a exercícios fechados (`ano < extract(year from current_date)`) com corte inferior a 10% de arrecadação própria, integrar a fundamentação legal oficial do Art. 11 da LRF (LC nº 101/2000), atualizar o catálogo de tipos e narrativas factuais, e substituir o `AlertBox` na página de receitas pelo componente canônico `RadarAnomaliaCard`.

## Boundaries & Constraints

**Always:**
- Aplicar a regra temporal estrita (Opção A): a detecção analítica da anomalia `dependencia_transferencias` deve ocorrer exclusivamente para exercícios fiscais fechados/consolidados (`ano < extract(year from current_date)`), eliminando falsos positivos no exercício corrente em andamento decorrentes da sazonalidade de arrecadação (IPTU/ISS).
- Classificar a severidade da anomalia como `critico` quando o percentual de receita própria for estritamente inferior a 10.00%.
- Fundamentar a anomalia no Art. 11 da Lei Complementar nº 101/2000 (LRF), disponibilizando o link oficial canônico (`https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art11`) com atributos de segurança (`target="_blank"`, `rel="noopener noreferrer"`) em conformidade com as Regras 11 e 20 do `AGENTS.md`.
- Na página `/[portalSlug]/receitas`, substituir o `AlertBox` pontual pelo componente canônico `RadarAnomaliaCard` quando houver anomalia apurada para o exercício selecionado.
- Seguir a governança de fixtures de teste (Regra 21): regerar `packages/db/tests/fixtures/schema.sql.gz` via `make db/fixture/dump` e validar paridade com `make db/fixture/check` e `make test`.
- Respeitar todas as diretrizes de código: nomes em snake_case para discriminadores SQL (Regra 10), camelCase para DTOs em TypeScript (Regra 18), ausência de ternários aninhados (Regra 13), e ausência de process.env direto (Regra 17).

**Never:**
- Não disparar a anomalia para o ano fiscal corrente (em andamento) nem para exercícios com receita própria igual ou superior a 10%.
- Não introduzir dependências ou serviços externos de busca ou visualização.
- Não utilizar strings de exibição arbitrárias em colunas de marts dbt (manter `'dependencia_transferencias'` e `'receita_propria'`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Exercício fechado com receita própria < 10% | Ano = 2024, Total Corrente = 1.000.000, Própria = 50.000 (5%) | Anomalia gerada: `tipo_anomalia = 'dependencia_transferencias'`, `grau_severidade = 'critico'`, `valor_observado = 5.00`, `valor_esperado = 10.00`, `desvio_percentual = 5.00` | N/A |
| Exercício fechado com receita própria >= 10% | Ano = 2024, Total Corrente = 1.000.000, Própria = 150.000 (15%) | Nenhuma anomalia gerada para o exercício | N/A |
| Exercício corrente em andamento | Ano = ano atual, Própria = 4% | Nenhuma anomalia gerada (regra temporal estrita impede falsos alarmes) | N/A |
| Portal Web - página de receitas em ano com anomalia | Acesso a `/[portalSlug]/receitas?ano=2024` com anomalia apurada | Renderiza `RadarAnomaliaCard` com badge "Atenção Especial", narrativa factual, métricas comparativas e link para Art. 11 da LRF; `AlertBox` antigo removido | Fallback para renderização sem anomalia caso card não exista |
| Portal Web - página de receitas em ano sem anomalia ou ano corrente | Acesso a `/[portalSlug]/receitas?ano=2026` sem anomalia | Página renderiza tabelas e gráficos normais sem exibir `RadarAnomaliaCard` ou `AlertBox` | Renderização limpa sem alertas |

</intent-contract>

## Code Map

- `elt/transform/models/marts/metrics/fct_anomalias_fiscais_metricas.sql` -- Modelo analítico dbt de detecção de anomalias fiscais -- Adicionar CTE `dependencia_transferencias_anomalias`, filtro `ano < extract(year from current_date)`, severidade `critico` e união em `todas_anomalias`.
- `elt/transform/models/marts/metrics/_fct_anomalias_fiscais_metricas.yml` -- Contrato de schema e testes dbt -- Adicionar `'dependencia_transferencias'` aos accepted_values de `tipo_anomalia`, mock input nos testes existentes e novo unit test para a anomalia.
- `packages/db/src/queries/radar-civico-alertas.ts` -- Definições de tipo e queries do Radar Cívico -- Incluir `"dependencia_transferencias"` no union `TipoAnomalia`.
- `packages/db/src/queries/__tests__/radar-civico-alertas.spec.ts` -- Testes unitários do leitor de anomalias Kysely -- Cobrir retorno de anomalias do tipo `dependencia_transferencias`.
- `apps/web/lib/radar-civico-narrative.ts` -- Gerador factual de narrativas do Radar Cívico -- Adicionar formatação de dimensão `receita_propria` e gerador de narrativa neutra com citação ao Art. 11 da LRF.
- `apps/web/lib/__tests__/radar-civico-narrative.spec.ts` -- Testes unitários do gerador narrativo -- Cobrir a narrativa de dependência de transferências.
- `apps/web/app/[portalSlug]/view-model.tsx` -- View-model compartilhado do portal e gerador de cards do Radar Cívico -- Configurar título, labels, formatações numéricas e hyperlink legal do Art. 11 da LRF para `dependencia_transferencias`.
- `apps/web/app/[portalSlug]/view-model.spec.ts` -- Testes do view-model -- Validar geração de `RadarCivicoCardItem` para `dependencia_transferencias`.
- `apps/web/app/[portalSlug]/receitas/loader.ts` -- Data loader da página de receitas -- Integrar carregamento de alertas do Radar Cívico via `getRadarCivicoAlertas` e resolução do card da anomalia.
- `apps/web/app/[portalSlug]/receitas/view-model.ts` -- View-model da página de receitas -- Expor `cardDependencia` no view-model retornado.
- `apps/web/app/[portalSlug]/receitas/page.tsx` -- Página pública de receitas municipais -- Substituir o `AlertBox` pontual pelo componente canônico `RadarAnomaliaCard`.
- `apps/web/app/[portalSlug]/receitas/__tests__/receitas-page.spec.tsx` -- Testes da página de receitas -- Validar renderização do `RadarAnomaliaCard` em substituição ao `AlertBox`.
- `packages/db/tests/fixtures/schema.sql.gz` -- Fixture do banco de testes -- Atualizar via `make db/fixture/dump` após compilação do dbt.

## Tasks & Acceptance

**Execution:**
- `elt/transform/models/marts/metrics/fct_anomalias_fiscais_metricas.sql` -- Adicionar detecção analítica de `dependencia_transferencias` com `receita_propria` para anos fechados (`ano < extract(year from current_date)`) e severidade `critico` quando percentual próprio < 10% -- Formalizar anomalia no mart oficial do dbt.
- `elt/transform/models/marts/metrics/_fct_anomalias_fiscais_metricas.yml` -- Registrar `'dependencia_transferencias'` nos testes de accepted_values e criar unit test cobrindo anos fechados vs corrente -- Garantir qualidade e validação automatizada no pipeline dbt.
- `packages/db/src/queries/radar-civico-alertas.ts` -- Atualizar union type `TipoAnomalia` com `"dependencia_transferencias"` -- Prover paridade de tipagem estrita na camada TypeScript.
- `packages/db/src/queries/__tests__/radar-civico-alertas.spec.ts` -- Adicionar teste unitário validando query de anomalia de dependência fiscal -- Garantir regressão zero no leitor Kysely.
- `apps/web/lib/radar-civico-narrative.ts` -- Implementar narrativa factual neutra para `dependencia_transferencias` e mapeamento da dimensão `receita_propria` -- Assegurar conformidade com controle social e clareza informativa.
- `apps/web/lib/__tests__/radar-civico-narrative.spec.ts` -- Adicionar teste unitário para o gerador de narrativa de `dependencia_transferencias` -- Validar integridade textual e métricas da narrativa.
- `apps/web/app/[portalSlug]/view-model.tsx` -- Mapear metadados do card (`getCardTitulo`, `fundamentacaoLegal`, `esperadoLabel`, `valorObservadoFormatted`, etc.) com link oficial para Art. 11 da LRF -- Integrar anomalia à grade canônica do Radar Cívico.
- `apps/web/app/[portalSlug]/view-model.spec.ts` -- Adicionar testes de unidade para o card gerado de dependência fiscal -- Validar metadados e fundamentação jurídica.
- `apps/web/app/[portalSlug]/receitas/loader.ts` -- Carregar alertas do Radar Cívico no loader de receitas e resolver o card temático correspondente -- Alimentar a página com dados tipados e consolidados.
- `apps/web/app/[portalSlug]/receitas/view-model.ts` -- Adicionar campo `cardDependencia` ao view-model da página de receitas -- Desacoplar camada de apresentação.
- `apps/web/app/[portalSlug]/receitas/page.tsx` -- Remover o `AlertBox` e renderizar o `RadarAnomaliaCard` quando `cardDependencia` estiver presente -- Padronizar visualmente os alertas municipais.
- `apps/web/app/[portalSlug]/receitas/__tests__/receitas-page.spec.tsx` -- Criar testes de componente para a página de receitas cobrindo presença do card e ausência do AlertBox -- Garantir robustez do fluxo de renderização.
- `packages/db/tests/fixtures/schema.sql.gz` -- Regerar fixture compactada com `make db/fixture/dump` -- Manter paridade estrita do banco de testes (Regra 21).

**Acceptance Criteria:**
- Given o modelo analítico dbt `fct_anomalias_fiscais_metricas.sql`, when for executado o build ou teste do dbt, then a anomalia `dependencia_transferencias` é gerada com severidade `critico` e dimensão `receita_propria` exclusivamente para exercícios fiscais fechados (`ano < extract(year from current_date)`) onde o percentual próprio for inferior a 10%, sem gerar linhas para o exercício corrente.
- Given a camada `@transparencia/db`, when for consultada a lista de anomalias pelo Kysely, then o tipo `dependencia_transferencias` é devidamente tipado e retornado no DTO `RadarCivicoAlertaDTO`.
- Given a função `formatFactualNarrative`, when receber um alerta de `dependencia_transferencias`, then produz narrativa neutra e descritiva contextualizando o percentual arrecadado e referenciando o Art. 11 da LRF.
- Given o helper `buildRadarCivicoCards`, when processar um alerta de `dependencia_transferencias`, then o card gerado inclui título "Dependência de Transferências Externas", métricas de 10% esperados vs valor observado, e fundamentação jurídica com link canônico para o Planalto (`https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art11`).
- Given a página web `/[portalSlug]/receitas`, when renderizada para um exercício fiscal com anomalia de dependência apurada, then exibe o componente canônico `RadarAnomaliaCard` em substituição ao componente pontual `AlertBox`.
- Given os comandos de validação automatizada, when executados `make test`, `make test/ts` e `make lint`, then todos os testes do dbt, banco de dados e frontend passam com 100% de sucesso.

## Spec Change Log

## Review Triage Log

### 2026-09-22 — Review pass
- verdicts: 1 reviewer retornou findings (intent-alignment auditor) — high 0, medium 0, low 0, false 0, observation 1 (sem defeito de código); 3 revisores (blind-hunter, edge-case-hunter, verification-gap) não retornaram findings por esgotamento de cota de API (429) e falha de rede.
- findings:
  - `[observation]` `[reject]` Superfície de `/receitas` fora do escopo estrito do Radar Cívico hub (Leitura 1 — apenas rota `/[portalSlug]`) — Rejection reason: Sob a Leitura 2 (escopo sistêmico, corroborado pela spec e epic-13-context.md), a substituição do AlertBox legado na rota de destino do deep link é a conclusão natural e esperada da integração vertical da anomalia. Nenhum defeito de código foi identificado.

## Auto Run Result

**Story 13.4 — Concluída em 2026-09-22**

**Arquivos alterados (14):**
- `elt/transform/models/marts/metrics/fct_anomalias_fiscais_metricas.sql` — CTE `dependencia_transferencias_anomalias` adicionada; severidade `critico`; guarda temporal `ano < extract(year from current_date)`.
- `elt/transform/models/marts/metrics/_fct_anomalias_fiscais_metricas.yml` — `dependencia_transferencias` em accepted_values; mock input em 3 unit tests existentes; novo unit test com 3 cenários.
- `packages/db/src/queries/radar-civico-alertas.ts` — `"dependencia_transferencias"` adicionado ao union `TipoAnomalia`.
- `packages/db/src/queries/__tests__/radar-civico-alertas.spec.ts` — Teste de integração para `dependencia_transferencias`; isolamento de portal corrigido.
- `packages/db/tests/fixtures/schema.sql.gz` — Regenerado via `make db/fixture/dump`.
- `apps/web/lib/radar-civico-narrative.ts` — `receita_propria` no dicionário de dimensões; narrativa factual de `dependencia_transferencias`.
- `apps/web/lib/__tests__/radar-civico-narrative.spec.ts` — Testes de narrativa e dimensão adicionados.
- `apps/web/app/[portalSlug]/view-model.tsx` — 7 helpers estendidos; link canônico Art. 11 LRF; formatação percentual.
- `apps/web/app/[portalSlug]/view-model.spec.ts` — Teste de card `dependencia_transferencias`.
- `apps/web/app/[portalSlug]/receitas/loader.ts` — `getRadarCivicoAlertas` integrado; `radarAlertas` no raw data.
- `apps/web/app/[portalSlug]/receitas/view-model.ts` — Campo `cardDependencia` exposto no view-model.
- `apps/web/app/[portalSlug]/receitas/page.tsx` — `AlertBox` removido; `RadarAnomaliaCard` renderizado.
- `apps/web/app/[portalSlug]/receitas/page.spec.tsx` — 2 testes atualizados para `RadarAnomaliaCard`.
- `apps/web/app/[portalSlug]/receitas/view-model.spec.ts` — 2 testes adicionados para `cardDependencia`.

**Verificação (100% passing):**
- `make dbt/test`: PASS=540 WARN=0 ERROR=0
- `pnpm --filter @transparencia/db test`: 128 testes, 24 arquivos — 100% aprovados
- `pnpm --filter web test`: 504 testes, 70 arquivos — 100% aprovados
- `pnpm lint`: 308 arquivos, 0 erros
- `make db/fixture/check`: 4/4 pytest — paridade estrita
- `make test`: 43/43 testes Python de integração — aprovados



## Design Notes

A CTE de dependência fiscal em `fct_anomalias_fiscais_metricas.sql` é estruturada com base no mart consolidado `fct_fontes_receita_metricas`:
```sql
dependencia_transferencias_anomalias as (
    select
        portal_slug,
        ano,
        'dependencia_transferencias'::text as tipo_anomalia,
        'receita_propria'::text as dimensao_referencia,
        case
            when sum(total_arrecadado) > 0
            then (sum(receita_propria_arrecadado) / sum(total_arrecadado)) * 100.0
            else
                case
                    when sum(total_previsto) > 0
                    then (sum(receita_propria_previsto) / sum(total_previsto)) * 100.0
                    else 0.0
                end
        end::numeric as valor_observado,
        10.00::numeric as valor_esperado,
        round(
            case
                when sum(total_arrecadado) > 0
                then (10.00 - ((sum(receita_propria_arrecadado) / sum(total_arrecadado)) * 100.0))
                else
                    case
                        when sum(total_previsto) > 0
                        then (10.00 - ((sum(receita_propria_previsto) / sum(total_previsto)) * 100.0))
                        else 10.00
                    end
            end::numeric,
            2
        ) as desvio_percentual,
        1::integer as mes_inicial,
        12::integer as mes_final,
        ('/' || portal_slug || '/receitas?ano=' || ano)::text as deep_link_rota,
        'art11_lrf_arrecadacao_propria'::text as metodo_deteccao
    from {{ ref('fct_fontes_receita_metricas') }}
    where ano < extract(year from current_date)
      and ano >= {{ var('ano_inicial_historico', 2021) }}
    group by portal_slug, ano
    having (
        case
            when sum(total_arrecadado) > 0
            then (sum(receita_propria_arrecadado) / sum(total_arrecadado)) * 100.0
            else
                case
                    when sum(total_previsto) > 0
                    then (sum(receita_propria_previsto) / sum(total_previsto)) * 100.0
                    else 0.0
                end
        end
    ) < 10.0
)
```

Na aplicação web, a renderização de `RadarAnomaliaCard` na página de receitas utiliza `funnelSource="receitas_anomalia"` para rastreabilidade de telemetria sem interrupção de fluxo.

## Verification

**Commands:**
- `make dbt/test` -- expected: Validação de unit tests e schema contracts dos modelos dbt, incluindo `fct_anomalias_fiscais_metricas`.
- `pnpm --filter @transparencia/db test` -- expected: Testes da camada Kysely passam com 100% de sucesso.
- `pnpm --filter web test` -- expected: Testes unitários e de componentes da web app passam com 100% de sucesso.
- `pnpm lint` -- expected: Validação do linter sem erros em todo o monorepo.
- `make db/fixture/check` -- expected: Fixtures compactadas em paridade estrita com os marts dbt.
- `make test` -- expected: Execução da suíte completa de integração e regressão.
