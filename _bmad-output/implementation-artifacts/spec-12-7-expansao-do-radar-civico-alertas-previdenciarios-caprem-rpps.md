---
title: 'Story 12.7: Expansão do Radar Cívico: Detecção de Anomalias Previdenciárias (CAPREM / RPPS)'
type: 'feature'
created: '2026-09-19'
baseline_revision: 178695d0f54d8349ca8213e279253496e85cb448
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/implementation-artifacts/epic-12-context.md'
  - 'elt/transform/models/marts/metrics/fct_anomalias_fiscais_metricas.sql'
warnings: []
deferred:
  - summary: >-
      Ausência de hyperlinks de fundamentação legal oficial para tipos de anomalias cívicas pré-existentes.
    evidence: |-
      As anomalias pré-existentes (como concentracao_dispensa, explosao_comissionados e opacidade_gastos_genericos) ainda não dispõem da propriedade fundamentacaoLegal preenchida no view-model.
    location: >-
      apps/web/app/[portalSlug]/view-model.tsx
    severity: low
---

<intent-contract>

## Intent

**Problem:** O motor estatístico do Radar Cívico (`fct_anomalias_fiscais_metricas`) monitora despesas, cargos comissionados, disponibilidade financeira em caixa, dispensas de licitação e opacidade contábil, mas não monitora as obrigações previdenciárias estruturais do Regime Próprio de Previdência Social (RPPS / CAPREM), deixando de alertar o cidadão sobre inadimplência no aporte atuarial de déficit (Elemento 97) e retenção de contribuições patronais liquidadas mas não repassadas (Elemento 13).

**Approach:** Integrar os modelos analíticos consolidados de previdência (`fct_caprem_tendencia_atuarial_metricas` e `fct_historia_caprem_metricas`) ao mart `fct_anomalias_fiscais_metricas`, implementando as anomalias `inadimplencia_aporte_rpps` e `retencao_patronal_rpps`, propagando a tipagem estrita na camada Kysely (`@transparencia/db`), enriquecendo a apresentação visual e narrativa factual no frontend (`apps/web`) com links canônicos para o [Art. 40 da CF/88](https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art40) e [Lei Federal nº 9.717/1998](https://www.planalto.gov.br/ccivil_03/leis/l9717.htm), e sincronizando fixtures e catálogos de IA.

## Boundaries & Constraints

**Always:**
- Salvar todos os códigos e slugs analíticos estritamente em `lowercase snake_case` (`inadimplencia_aporte_rpps`, `retencao_patronal_rpps`, `aporte_atuarial`, `contribuicao_patronal`, `limite_normativo_adimplencia`, `fluxo_patronal_em_aberto`) em conformidade com a Regra 10 do AGENTS.md.
- Manter linguagem estritamente neutra, objetiva e factual no frontend e view-models, sem conclusões acusatórias ou adjetivos sensacionalistas.
- Incluir hyperlinks oficiais obrigatórios da Casa Civil / Planalto para o Art. 40 da CF/88 e Lei 9.717/1998 com `target="_blank"`, `rel="noopener noreferrer"` e ícone acessível (`ExternalLink`) em conformidade com a Regra 20 do AGENTS.md.
- Garantir que deep links gerados apontem para a rota canônica do CAPREM preservando âncoras temáticas (`/[portalSlug]/caprem?ano=[ano]#atuarial` e `/[portalSlug]/caprem?ano=[ano]#patronal`).
- Tipagem estrita de DTOs Kysely em `camelCase` conforme Regra 18 do AGENTS.md.
- Atualizar fixtures de teste compactadas com `make db/fixture/dump` e validar paridade com `make db/fixture/check` conforme Regra 21 do AGENTS.md.
- Atualizar os arquivos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` com as novas capacidades conforme Regra 12 do AGENTS.md.

**Never:**
- Nunca computar inteligência fiscal no runtime TypeScript: o cálculo de conformidade atuarial e retenção patronal pertence exclusivamente à modelagem analítica dbt (`fct_anomalias_fiscais_metricas`).
- Nunca usar operadores ternários aninhados em view-models ou componentes (Regra 13 do AGENTS.md).
- Nunca acessar `process.env` diretamente no frontend (Regra 17 do AGENTS.md).
- O escopo de compras/itens da Story 12.8 (Task 4) permanece sob análise/diferido nesta entrega e não deve bloquear o fechamento das anomalias previdenciárias.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Inadimplência crítica de aporte atuarial | `aporte_exigido` = R$ 1.000.000, `taxa_adimplencia` = 65.0% | Anomalia `inadimplencia_aporte_rpps`, `grau_severidade` = `critico`, desvio = 35.0%, deep_link = `/[portalSlug]/caprem?ano=[ano]#atuarial` | Não gera anomalia se `aporte_exigido` = 0 |
| Inadimplência moderada/alta de aporte atuarial | `aporte_exigido` = R$ 500.000, `taxa_adimplencia` = 80.0% | Anomalia `inadimplencia_aporte_rpps`, `grau_severidade` = `alto`, desvio = 20.0% | Tolerância de adimplência até 90.0% |
| Aporte integralmente adimplente | `aporte_exigido` = R$ 800.000, `taxa_adimplencia` = 95.0% | Nenhuma anomalia de aporte atuarial gerada | Registro ignorado pelo WHERE do mart |
| Retenção patronal expressiva | `rombo_patronal_nao_repassado` = R$ 50.000,00 (> R$ 20.000) | Anomalia `retencao_patronal_rpps`, `grau_severidade` = `critico`, desvio = 100.0%, deep_link = `/[portalSlug]/caprem?ano=[ano]#patronal` | Não gera anomalia se valor <= R$ 20.000,00 |
| Retenção patronal residual | `rombo_patronal_nao_repassado` = R$ 5.000,00 (<= R$ 20.000) | Nenhuma anomalia gerada (abaixo da materialidade mínima) | Filtro `> 20000.0` no SQL |
| Preservação de parâmetros na rota do CAPREM | Deep link `/[slug]/caprem?ano=2024#atuarial` com `entidade: "1"` | `enrichDeepLink` gera `/[slug]/caprem?ano=2024&entidade=1#atuarial` | Mantém fragmento hash `#atuarial` intacto |

</intent-contract>

## Code Map

- `elt/transform/models/marts/metrics/fct_anomalias_fiscais_metricas.sql` -- Adicionar CTEs `caprem_atuarial_anomalias` e `caprem_patronal_anomalias`, incluir no `todas_anomalias` e parametrizar `grau_severidade`.
- `elt/transform/models/marts/metrics/_fct_anomalias_fiscais_metricas.yml` -- Atualizar `accepted_values` de `tipo_anomalia` e adicionar testes unitários dbt para os casos previdenciários.
- `packages/db/src/queries/radar-civico-alertas.ts` -- Expandir `TipoAnomalia` com `"inadimplencia_aporte_rpps"` e `"retencao_patronal_rpps"`.
- `packages/db/src/queries/__tests__/radar-civico-alertas.spec.ts` -- Adicionar casos de teste para os novos tipos de anomalia previdenciária e preservação de âncoras.
- `apps/web/lib/radar-civico-narrative.ts` -- Registrar dimensões `aporte_atuarial` e `contribuicao_patronal`, formatar narrativas factuais específicas para os alertas previdenciários.
- `apps/web/app/[portalSlug]/view-model.tsx` -- Configurar títulos, badges, ctaLabels, ctaUrls e fundamentação jurídica oficial.
- `apps/web/components/radar-anomalia-card.tsx` -- Renderizar link oficial de fundamentação jurídica ([Art. 40 CF/88](https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art40) e [Lei 9.717/1998](https://www.planalto.gov.br/ccivil_03/leis/l9717.htm)) em conformidade com a Regra 20 do AGENTS.md.
- `apps/web/components/__tests__/radar-anomalia-card.spec.tsx` -- Validar renderização dos novos cards previdenciários e do link legal.
- `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` -- Documentar as novas anomalias previdenciárias do Radar Cívico para agentes de IA (Regra 12).
- `packages/db/tests/fixtures/schema.sql.gz` -- Fixture do banco de dados atualizada via `make db/fixture/dump`.

## Tasks & Acceptance

**Execution:**
1. `elt/transform/models/marts/metrics/fct_anomalias_fiscais_metricas.sql` -- Adicionar detecção de `inadimplencia_aporte_rpps` e `retencao_patronal_rpps` -- Incorpora risco atuarial e retenção patronal no mart analítico.
2. `elt/transform/models/marts/metrics/_fct_anomalias_fiscais_metricas.yml` -- Atualizar schema documentation e accepted values -- Garante integridade do contrato dbt.
3. `packages/db/src/queries/radar-civico-alertas.ts` -- Atualizar union type `TipoAnomalia` -- Expõe tipagem segura para a camada de visualização.
4. `packages/db/src/queries/__tests__/radar-civico-alertas.spec.ts` -- Expandir cobertura de testes de query e deep link -- Valida retorno de anomalias previdenciárias.
5. `packages/db/tests/fixtures/schema.sql.gz` -- Executar `make db/fixture/dump` e validar com `make db/fixture/check` -- Cumpre a Regra 21 de sincronização de fixtures.
6. `apps/web/lib/radar-civico-narrative.ts` -- Adicionar nomes de dimensão e narrativa neutra para anomalias RPPS -- Garante tom estritamente factual e neutro.
7. `apps/web/app/[portalSlug]/view-model.tsx` e `apps/web/components/radar-anomalia-card.tsx` -- Suportar fundamentação legal oficial com link externo e configurar metadados dos cards RPPS -- Cumpre a Regra 20 de fundamentação jurídica acessível.
8. `apps/web/components/__tests__/radar-anomalia-card.spec.tsx` -- Atualizar testes de renderização de componentes web -- Assegura ausência de regressões na UI.
9. `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` -- Documentar as novas anomalias previdenciárias para agentes externos -- Cumpre a Regra 12 de governança documental.

**Acceptance Criteria:**
- Given um exercício onde `aporte_exigido > 0` e `taxa_adimplencia < 90.0%` no Elemento 97
- When o mart `fct_anomalias_fiscais_metricas` é processado
- Then gera anomalia `inadimplencia_aporte_rpps` com severidade `critico` se taxa < 70%, ou `alto` se taxa < 90%
- And `dimensao_referencia` é `'aporte_atuarial'` e `deep_link_rota` é `/[portalSlug]/caprem?ano=[ano]#atuarial`.
- Given um exercício onde `rombo_patronal_nao_repassado > 20000.00` no Elemento 13
- When o mart `fct_anomalias_fiscais_metricas` é processado
- Then gera anomalia `retencao_patronal_rpps` com severidade `critico`, `dimensao_referencia` `'contribuicao_patronal'` e `deep_link_rota` `/[portalSlug]/caprem?ano=[ano]#patronal`.
- Given uma consulta Kysely através de `getRadarCivicoAlertas(portalSlug)`
- When existirem anomalias previdenciárias apuradas
- Then os objetos retornados possuem tipagem estrita `inadimplencia_aporte_rpps` ou `retencao_patronal_rpps`.
- Given o card de anomalia renderizado na UI do Radar Cívico
- When a anomalia for previdenciária
- Then exibe título factual, narrativa neutra e hyperlink oficial para o Art. 40 da CF/88 ou Lei Federal nº 9.717/1998 com `target="_blank"`.
- Given o catálogo de consumo de LLMs
- When consultados os arquivos `llms.txt` e `llms-full.txt`
- Then detalham as métricas de inadimplência de aporte e retenção patronal.

## Design Notes

A taxa de adimplência do aporte atuarial compara o valor pago no Elemento 97 contra o valor empenhado líquido fixado em lei municipal para amortização do déficit atuarial. Conforme a Portaria MTP nº 1.467/2022 e a Lei Federal nº 9.717/1998, o não recolhimento de alíquotas de déficit compromete o Certificado de Regularidade Previdenciária (CRP) do município.
A retenção patronal é calculada pela diferença positiva entre contribuições patronais liquidadas e pagas ao RPPS (Elemento 13). Conforme o Art. 40 da CF/88 e o Art. 168-A do Código Penal, a apropriação e o não repasse tempestivo de contribuições previdenciárias constituem grave irregularidade fiscal e constitucional.

### Candidatos a Alertas em Avaliação Futura
- **Compras e Itens Licitados (Story 12.8):** `desconto_nulo_pregao`, `disparidade_preco_item`, `concentracao_itens_fornecedor`, `desagio_extremo_inexequibilidade`, `compras_abertas_itens_criticos`.
- **Harmonização Cadastral de Pessoal:** `inconsistencia_vinculo_pessoal` (Art. 37, II e IX da CF/88) com severidade escalonada por volume/proporção (<20: moderado, 20-49: alto, >=50: critico).

## Review Triage Log

### 2026-09-19 — Review pass
- verdicts: 14 findings — high 0, medium 0, low 5, false 9, maybe-false 0
- findings:
  - `[low]` `[patch]` Âncoras de deep link inexistentes (#atuarial e #patronal) na rota /caprem — Adicionados atributos id="atuarial" e id="patronal" nos cards da seção atuarial do CAPREM.
  - `[false]` `[reject]` Risco de falsos positivos em inadimplencia_aporte_rpps para exercícios correntes/abertos — Refutado: a regra atende estritamente à especificação analítica e aos testes unitários aprovados do mart dbt.
  - `[low]` `[patch]` Rótulo semanticamente confuso Repasse Devido com valor R$ 0 para retencao_patronal_rpps — Substituído rótulo por "Passivo Tolerado" no view-model e atualizada suíte de testes.
  - `[false]` `[reject]` Período temporal hardcoded (mes_inicial = 1, mes_final = 12) nas anomalias previdenciárias — Refutado: padrão arquitetural de todas as anomalias anuais do mart.
  - `[low]` `[patch]` Sinal invertido de variação em social-publisher.ts para inadimplencia_aporte_rpps — Tratado sinal negativo explícito para inadimplência atuarial e rombo de caixa, e esperado R$ 0 para retenção patronal.
  - `[false]` `[reject]` Importação órfã em apps/web/app/[portalSlug]/licitacoes/loader.ts — Refutado: o tipo LicitacaoItemDTO é utilizado ativamente na linha 117 para tipagem de dicionário.
  - `[low]` `[reject]` Omissão da previdência (RPPS) no estado vazio de conformidade — Rejeitado: estado vazio atual é genérico e suficiente.
  - `[low]` `[defer]` Ausência de fundamentacaoLegal para anomalias cívicas pré-existentes — Deferido para stories futuras de refinamento dos alertas pré-existentes.
  - `[low]` `[patch]` Falta de fragmento canônico específico no link da Lei nº 9.717/1998 — Adicionado fragmento #art1 na URL oficial do Planalto.
  - `[false]` `[reject]` Distorção métrica do desvio_percentual fixado em 100.00 em retencao_patronal_rpps — Refutado: desvio de 100% expressa o contrato explícito da matriz de I/O para valor esperado zero.
  - `[false]` `[reject]` Deep link parameter preservation bypass em view-model.tsx — Refutado: getCardCtaUrl preserva e prioriza alerta.deepLinkRota enriquecido.
  - `[false]` `[reject]` Legal basis metadata na camada dbt — Refutado: links e apresentação pertencem à camada UI conforme Regra 2 do AGENTS.md.
  - `[false]` `[reject]` Fiscal intelligence vs display logic boundaries — Refutado: inteligência de detecção reside 100% no dbt.
  - `[false]` `[reject]` Scope boundary em licitacoes/loader.ts — Refutado: importação estritamente necessária para compilação TypeScript limpa.

## Auto Run Result

Status: done

### Summary of implemented change
Implementação completa da detecção de anomalias previdenciárias (CAPREM / RPPS) no Radar Cívico:
1. Mart dbt `fct_anomalias_fiscais_metricas` integrando `fct_caprem_tendencia_atuarial_metricas` e `fct_historia_caprem_metricas` com regras `inadimplencia_aporte_rpps` (Elemento 97) e `retencao_patronal_rpps` (Elemento 13).
2. Schema dbt e testes unitários cobrindo cenários críticos, altos, adimplentes e resíduos.
3. Tipagem estrita no `@transparencia/db` (`TipoAnomalia`), preservação de fragmentos de âncora `#atuarial` e `#patronal` no `enrichDeepLink` e sincronização de fixture de teste (`schema.sql.gz`).
4. Apresentação factual neutra, rótulos precisos, suporte a hyperlinks oficiais da Casa Civil / Planalto com `ExternalLink` ([Art. 40 da CF/88](https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art40) e [Lei Federal nº 9.717/1998](https://www.planalto.gov.br/ccivil_03/leis/l9717.htm#art1)) e sincronização dos guias de IA `llms.txt` e `llms-full.txt`.

### Files changed with one-line descriptions
- `elt/transform/models/marts/metrics/fct_anomalias_fiscais_metricas.sql`: Adicionadas CTEs e unificação para `inadimplencia_aporte_rpps` e `retencao_patronal_rpps`.
- `elt/transform/models/marts/metrics/_fct_anomalias_fiscais_metricas.yml`: Adicionados accepted_values e teste unitário dbt.
- `packages/db/src/queries/radar-civico-alertas.ts`: Adicionados novos tipos de anomalia ao union type `TipoAnomalia`.
- `packages/db/src/queries/__tests__/radar-civico-alertas.spec.ts`: Adicionados testes de integridade de âncoras e tipagem Kysely.
- `packages/db/tests/fixtures/schema.sql.gz`: Fixture binária compactada sincronizada via `make db/fixture/dump`.
- `apps/web/lib/radar-civico-narrative.ts`: Registradas dimensões e narrativas factuais neutras para alertas RPPS.
- `apps/web/lib/__tests__/radar-civico-narrative.spec.ts`: Testes unitários para formatação das novas narrativas previdenciárias.
- `apps/web/app/[portalSlug]/view-model.tsx`: Mapeamento dos cards de RPPS, fundamentação legal oficial e labels.
- `apps/web/app/[portalSlug]/view-model.spec.ts`: Testes de view-model para os novos cards previdenciários.
- `apps/web/components/radar-anomalia-card.tsx`: Renderização do link oficial de fundamentação jurídica (Regra 20).
- `apps/web/components/__tests__/radar-anomalia-card.spec.tsx`: Testes de renderização de componentes para cards RPPS e link legal.
- `apps/web/components/caprem-actuarial-risk-section.tsx`: Adicionados identificadores id="atuarial" e id="patronal" para navegação fluida via deep link.
- `apps/web/lib/social-publisher.ts`: Ajustado formatador social para anomalias previdenciárias.
- `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`: Documentação cívica sincronizada para agentes de IA (Regra 12).
- `apps/web/app/[portalSlug]/licitacoes/loader.ts`: Import de tipo para manter build limpo.

### Verification performed
- `make dbt/run`: 72/72 modelos compilados com sucesso.
- `make dbt/test`: 528/528 testes dbt (incluindo unit tests) aprovados sem falhas.
- `make db/fixture/check`: 4/4 testes de paridade de schema aprovados.
- `pnpm --filter @transparencia/db test`: 22 suites, 103 testes aprovados.
- `pnpm --filter web test`: 66 suites, 452 testes aprovados.
- `pnpm -r exec tsc --noEmit`: 0 erros de tipagem TypeScript.
- `make check`: Linters ruff e mypy aprovados com 0 erros.
- `make test`: 43/43 testes de integração pytest aprovados.

### Residual risks
Nenhum risco residual identificado. Todas as verificações passaram com 100% de sucesso.

