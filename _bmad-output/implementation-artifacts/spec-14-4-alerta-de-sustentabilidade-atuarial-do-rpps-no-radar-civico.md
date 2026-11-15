---
title: 'Story 14.4: Alerta de Sustentabilidade Atuarial do RPPS no Radar Cívico'
type: 'feature'
created: '2026-09-24'
status: 'done'
baseline_revision: 'c2c5a17ae5911c43fde39013a5c8a739661edb89'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** A desidratação da poupança previdenciária do RPPS (CAPREM), com retração do patrimônio financeiro superior a 20% em janela móvel de 3 anos (de R$ 60,4M para R$ 35,9M), é visível na rota `/caprem`, mas não alerta proativamente o cidadão, conselheiros e auditores que navegam pela home ou pelo Radar Cívico.

**Approach:** Integrar a anomalia `desidratacao_patrimonio_rpps` no motor estatístico analítico dbt (`fct_anomalias_fiscais_metricas`), classificada como crítica para anos fiscais fechados com queda acumulada trienal > 20%, gerando alerta automatizado no Radar Cívico com narrativa factual neutra, deep link para `/[portalSlug]/caprem?ano=[ano]#patrimonio` e fundamentação legal obrigatória na Resolução CMN nº 4.963/2021 e Lei nº 9.717/1998.

## Boundaries & Constraints

**Always:**
- A detecção da anomalia deve ocorrer no mart dbt `fct_anomalias_fiscais_metricas.sql` consumindo o modelo `fct_caprem_patrimonio_historico_metricas` (SSOT), aplicando-se exclusivamente a exercícios fechados (`ano < extract(year from current_date)`).
- O critério matemático é a variação percentual acumulada entre o patrimônio do exercício atual e o de 2 exercícios anteriores válidos (janela de 3 exercícios, ignorando anos com `inconsistencia_declaracao_flag = true`), disparando quando inferior a `-20.00%`.
- Severidade deve ser fixada em `critico` para `desidratacao_patrimonio_rpps`.
- O deep link canônico deve direcionar para `/[portalSlug]/caprem?ano=[ano]#patrimonio`, resolvido no frontend via `buildAlertaUrl` em `apps/web/lib/radar-url.ts` (Regra 2).
- A narrativa gerada em `apps/web/lib/radar-civico-narrative.ts` deve ser estritamente factual e não-acusatória, detalhando a retração percentual, o montante consumido em 3 exercícios e o horizonte de sustentabilidade estimado se mantido o ritmo de queima.
- Links legislativos oficiais com `target="_blank" rel="noopener noreferrer"` e ícone `ExternalLink` para a Resolução CMN nº 4.963/2021 e Lei nº 9.717/1998 (Regra 20).
- Todos os identificadores em TypeScript devem seguir estritamente a convenção `camelCase` (Regra 18).
- Nomes semânticos claros e explícitos em SQL e TypeScript, proibido nome abreviado (Regra 9).
- Fixtures de teste devem ser sincronizadas via `make db/fixture/dump` e validadas com `make test` e `make test/ts` (Regra 21).
- Guias de consumo público por IA (`llms.txt` e `llms-full.txt`) devem ser atualizados (Regra 12).

**Never:**
- Nunca aplicar a detecção de anomalia a exercícios em andamento / abertos (`ano >= extract(year from current_date)`).
- Nunca calcular a variação trienal sobre exercícios com inconsistência de declaração (`inconsistencia_declaracao_flag = true`, como 2022).
- Nunca utilizar linguagem sensacionalista, subjetiva ou acusatória nas narrativas do Radar Cívico.
- Nunca armazenar URLs ou caminhos de rota em colunas do banco de dados (padrão arquitetural consolidado na Story 13.9).
- Nunca utilizar ternários aninhados no código (Regra 13).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Exercício fechado com queda trienal > 20% (ex: 2025) | `patrimonio_total` 2025 = 35.98M, 2023 = 45.42M (queda -20.78%) | Anomalia `desidratacao_patrimonio_rpps` detectada com severidade `critico`, desvio de 20.78%, link para `/caprem?ano=2025#patrimonio` | N/A |
| Exercício aberto / corrente (2026) | `ano = 2026`, queda acumulada > 20% | Nenhuma anomalia gerada para 2026 (ano corrente não fechado) | Filtro `ano < extract(year from current_date)` |
| Ponto com inconsistência contábil (2022) | 2022 com `inconsistencia_declaracao_flag = true` | 2022 é expurgado da base de cálculo de lag, comparando 2025 com 2023 e 2024 com 2021 | Filtro `not inconsistencia_declaracao_flag` |
| Histórico com menos de 3 exercícios válidos | Menos de 2 lags válidos disponíveis no município | `valor_esperado is null` -> nenhuma anomalia gerada | `valor_esperado is not null` |
| Queda inferior ao gatilho (ex: -14%) | Variação trienal = -14.65% | Nenhuma anomalia gerada | Filtro `desvio < -20.00` |

</intent-contract>

## Code Map

- `elt/transform/models/marts/metrics/fct_anomalias_fiscais_metricas.sql` -- Modelo analítico dbt do motor de anomalias; adicionar CTE `caprem_desidratacao_anomalias` com lag de 3 exercícios válidos, filtro de ano fechado e gatilho `< -20%`.
- `elt/transform/models/marts/metrics/_fct_anomalias_fiscais_metricas.yml` -- Schema contract e unit tests; adicionar `'desidratacao_patrimonio_rpps'` aos `accepted_values` de `tipo_anomalia`, mock de `fct_caprem_patrimonio_historico_metricas` nos testes existentes e novo teste unitário `test_fct_anomalias_fiscais_desidratacao_patrimonio_rpps`.
- `packages/db/src/queries/radar-civico-alertas.ts` -- Definição de tipos Kysely; estender `TipoAnomalia` com `"desidratacao_patrimonio_rpps"`.
- `packages/db/src/queries/__tests__/radar-civico-alertas.spec.ts` -- Testes unitários da query do Radar Cívico; validar filtragem e ordenação da nova anomalia crítica.
- `apps/web/lib/radar-url.ts` -- Roteador de alertas; mapear `"desidratacao_patrimonio_rpps"` para `{ path: "/caprem", anchor: "#patrimonio" }`.
- `apps/web/lib/__tests__/radar-url.spec.ts` -- Testes unitários do roteador; cobrir navegação para a âncora `#patrimonio` da CAPREM.
- `apps/web/lib/radar-civico-narrative.ts` -- Gerador de narrativas factuais; incluir caso de `"desidratacao_patrimonio_rpps"` detalhando saldo final, queda percentual, consumo absoluto e horizonte de sustentabilidade estimado.
- `apps/web/lib/__tests__/radar-civico-narrative.spec.ts` -- Testes da narrativa cívica; validar tom factual e cálculos de queima.
- `apps/web/components/radar-anomalia-card.tsx` -- Componente de card do radar; suportar array em `fundamentacaoLegal` para renderizar múltiplos links legislativos oficiais com `ExternalLink`.
- `apps/web/components/__tests__/radar-anomalia-card.spec.tsx` -- Testes do card; validar renderização de múltiplos links legais e atributos de acessibilidade.
- `apps/web/app/[portalSlug]/view-model.tsx` -- View model da home/radar; mapear título, metodologia, CTA, badges e hyperlinks da Resolução CMN nº 4.963/2021 e Lei nº 9.717/1998 para o alerta.
- `apps/web/app/[portalSlug]/view-model.spec.ts` -- Testes unitários do view model cobrindo o card de desidratação previdenciária.
- `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` -- Documentação pública para IA; documentar a anomalia `desidratacao_patrimonio_rpps` (Regra 12).
- `packages/db/tests/fixtures/schema.sql.gz` -- Fixture compactada de testes; regenerada via `make db/fixture/dump` (Regra 21).

## Tasks & Acceptance

**Execution:**
- `elt/transform/models/marts/metrics/fct_anomalias_fiscais_metricas.sql` -- Integrar detecção da anomalia `desidratacao_patrimonio_rpps` com severidade crítica e filtro de anos fechados -- Incorporar inteligência de desidratação previdenciária no dbt mart.
- `elt/transform/models/marts/metrics/_fct_anomalias_fiscais_metricas.yml` -- Atualizar schema YAML, accepted_values e adicionar teste unitário dbt -- Garantir contrato estrito de schema e validação automatizada.
- `packages/db/src/queries/radar-civico-alertas.ts` -- Adicionar `"desidratacao_patrimonio_rpps"` ao union `TipoAnomalia` -- Tipagem estrita na camada de dados Kysely.
- `packages/db/src/queries/__tests__/radar-civico-alertas.spec.ts` -- Adicionar teste unitário de query para `desidratacao_patrimonio_rpps` -- Garantir paridade na camada de banco de dados.
- `apps/web/lib/radar-url.ts` -- Mapear rota canônica com âncora `#patrimonio` -- Roteamento desacoplado do banco para a seção de patrimônio da CAPREM.
- `apps/web/lib/__tests__/radar-url.spec.ts` -- Testar geração de deep link para `/caprem?ano=[ano]#patrimonio` -- Prevenir regressões na navegação.
- `apps/web/lib/radar-civico-narrative.ts` -- Implementar narrativa factual neutra para desidratação de patrimônio e adicionar dimensão em `DIMENSAO_NOMES` -- Comunicação cidadã responsável e transparente.
- `apps/web/lib/__tests__/radar-civico-narrative.spec.ts` -- Adicionar teste da narrativa de desidratação previdenciária -- Garantir consistência textual.
- `apps/web/components/radar-anomalia-card.tsx` -- Suportar múltiplos links na fundamentação legal do card -- Atender à exigência de links duplos (CMN + Lei 9.717).
- `apps/web/components/__tests__/radar-anomalia-card.spec.tsx` -- Testar renderização de múltiplos links legais no card -- Validação de acessibilidade e Regra 20.
- `apps/web/app/[portalSlug]/view-model.tsx` -- Mapear DTO de `desidratacao_patrimonio_rpps` para o card do Radar Cívico com links CMN 4.963 e Lei 9.717 -- Apresentação clara do alerta cívico na interface pública.
- `apps/web/app/[portalSlug]/view-model.spec.ts` -- Criar teste unitário para o card de desidratação previdenciária -- Validar integração no view model.
- `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` -- Sincronizar guias públicos de IA com a nova anomalia do Radar Cívico -- Conformidade com a Regra 12.
- `packages/db/tests/fixtures/schema.sql.gz` -- Regerar fixtures compactadas de banco via `make db/fixture/dump` -- Conformidade com a Regra 21.

**Acceptance Criteria:**
- Given a série histórica anual do patrimônio financeiro em `fct_caprem_patrimonio_historico_metricas`, when o modelo `fct_anomalias_fiscais_metricas.sql` for executado, then é detectada a anomalia `desidratacao_patrimonio_rpps` com severidade `critico` quando a retração trienal for superior a 20% em exercícios fechados.
- Given o exercício corrente ou anos com `inconsistencia_declaracao_flag = true`, when o mart dbt for compilado, then não são gerados alertas espúrios para o ano corrente nem variações distorcidas por declarações incompletas.
- Given o tipo de anomalia `desidratacao_patrimonio_rpps`, when resolvida sua URL via `buildAlertaUrl`, then retorna `/[portalSlug]/caprem?ano=[ano]#patrimonio`.
- Given um alerta de desidratação previdenciária no Radar Cívico, when renderizado o card, then exibe a narrativa factual neutra, badges de severidade crítica e links obrigatórios para a Resolução CMN nº 4.963/2021 e a Lei nº 9.717/1998 com `target="_blank" rel="noopener noreferrer"` e ícone `ExternalLink`.
- Given a documentação de IA, when inspecionados `llms.txt` e `llms-full.txt`, then a nova anomalia e suas regras estão documentadas.
- Given as suítes de teste, when executados `make test` e `make test/ts`, then 100% dos testes passam com sucesso.

## Spec Change Log

## Review Triage Log

### 2026-09-24 — Review pass
- verdicts: 14 findings — high 0, medium 2, low 11, false 1, maybe-false 0
- findings:
  - `[low]` `[patch]` Incoerência de redação entre intervalo de 2 anos e menção a 3 exercícios — Redação alinhada para 'ao longo do triênio'.
  - `[low]` `[patch]` Pluralização de horizonte em anos comparava float não-arredondado gerando '1 anos' — Corrigido para `Number(anosEstimados.toFixed(1)) === 1 ? 'ano' : 'anos'`.
  - `[low]` `[patch]` Falta de guarda para patrimônio nulo/negativo ou queima zero na narrativa — Adicionada guarda `obsVal > 0 && queimaAnual > 0`.
  - `[low]` `[patch]` Cálculo de lag trienal sem limite de intervalo temporal de anos — Adicionado `lag(ano, 2) as ano_esperado` e filtro `ano - ano_esperado <= 3`.
  - `[medium]` `[patch]` Sinal de variação em postagens sociais para Facebook gerava prefixo positivo (+) — Adicionado `desidratacao_patrimonio_rpps` no mapeamento de `sinalDesvio` para prefixo negativo (`-`).
  - `[low]` `[patch]` Badge metodológico 'Variação Trienal' ausente na lista de metodologias do llms-full.txt — Documentado o badge 'Variação Trienal' em `llms-full.txt`.
  - `[low]` `[patch]` Ausência de separador semântico entre múltiplos links legais — Adicionado bullet visual (`•`) e delimitador acessível (`<span className="sr-only">; </span>`).
  - `[false]` `[reject]` Tipo de fundamentacaoLegal polimórfico (objeto ou array) — Refutação: o tipo union mantém compatibilidade regressiva estrita com os cards existentes sem quebras de contrato.
  - `[low]` `[reject]` Uso de helper numérico para formatação de anos estimados — Refutação: função de conveniência que formata até 1 casa decimal sem impacto funcional ou semântico.
  - `[low]` `[patch]` Descrição de dimensao_referencia no YAML sem exemplo de patrimonio_previdenciario — Adicionado `patrimonio_previdenciario` na lista de exemplos do contrato dbt.
  - `[low]` `[patch]` Pluralização de horizonte anosEstimados (Edge Case Hunter) — Mesma raiz do finding 2; corrigido com patch em `radar-civico-narrative.ts`.
  - `[low]` `[patch]` Horizonte de sustentabilidade com patrimônio observado negativo (Edge Case Hunter) — Mesma raiz do finding 3; guardas adicionadas.
  - `[low]` `[patch]` Lacunas plurianuais maiores avaliadas como trienais (Edge Case Hunter) — Mesma raiz do finding 4; filtro `ano - ano_esperado <= 3` adicionado ao dbt.
  - `[medium]` `[patch]` Sinal de variação para Facebook (Verification Gap Reviewer) — Mesma raiz do finding 5; corrigido com patch em `social-publisher.ts`.

## Auto Run Result

### Resumo da Implementação
A Story 14.4 implementou a detecção automatizada da anomalia de desidratação do patrimônio do RPPS (`desidratacao_patrimonio_rpps`) com severidade crítica no motor estatístico analítico dbt (`fct_anomalias_fiscais_metricas`), acionada quando a retração trienal da poupança previdenciária for superior a 20% em exercícios fiscais fechados. A anomalia foi integrada de ponta a ponta na camada de dados Kysely (`@transparencia/db`), no roteamento canônico (`/[portalSlug]/caprem?ano=[ano]#patrimonio`), no gerador de narrativas factuais neutras, nos posts sociais do Radar Cívico e nos cards de alerta com fundamentação jurídica oficial dupla (Resolução CMN nº 4.963/2021 e Lei nº 9.717/1998 com `target="_blank" rel="noopener noreferrer"` e ícone `ExternalLink`).

### Arquivos Modificados
- `elt/transform/models/marts/metrics/fct_anomalias_fiscais_metricas.sql`: Adicionada detecção da anomalia `desidratacao_patrimonio_rpps` com janela trienal, filtro de integridade temporal e anos fechados.
- `elt/transform/models/marts/metrics/_fct_anomalias_fiscais_metricas.yml`: Adicionado valor aceito, mocks nos testes unitários dbt existentes e teste unitário dedicado `test_fct_anomalias_fiscais_desidratacao_patrimonio_rpps`.
- `packages/db/src/queries/radar-civico-alertas.ts`: Adicionado `desidratacao_patrimonio_rpps` ao tipo `TipoAnomalia`.
- `packages/db/src/queries/__tests__/radar-civico-alertas.spec.ts`: Adicionado teste unitário de query para a nova anomalia crítica.
- `packages/db/tests/fixtures/schema.sql.gz`: Fixtures compactadas de banco sincronizadas via `make db/fixture/dump`.
- `apps/web/lib/radar-url.ts`: Adicionado mapeamento de rota para `/caprem` com âncora `#patrimonio`.
- `apps/web/lib/__tests__/radar-url.spec.ts`: Teste unitário para a URL canônica gerada.
- `apps/web/lib/radar-civico-narrative.ts`: Implementada narrativa factual neutra, cálculo de horizonte de risco e dimensões previdenciárias.
- `apps/web/lib/__tests__/radar-civico-narrative.spec.ts`: Testes unitários para narrativa e formatação de dimensões.
- `apps/web/lib/social-publisher.ts`: Mapeado sinal negativo para desidratação patrimonial nas publicações sociais.
- `apps/web/lib/social-publisher.spec.ts`: Teste unitário para postagem social de desidratação previdenciária.
- `apps/web/components/radar-anomalia-card.tsx`: Suporte a múltiplos links legislativos com acessibilidade para leitores de tela.
- `apps/web/components/__tests__/radar-anomalia-card.spec.tsx`: Teste unitário para múltiplos links com atributos de segurança.
- `apps/web/app/[portalSlug]/view-model.tsx`: Mapeamento DTO completo do alerta para o Radar Cívico com links CMN e Lei 9.717.
- `apps/web/app/[portalSlug]/view-model.spec.ts`: Teste unitário de montagem do card de desidratação previdenciária.
- `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`: Documentação pública sincronizada para assistentes de IA (Regra 12).

### Critérios de Aceitação Verificados
- **AC 1 (Detecção dbt da anomalia com severidade crítica em anos fechados):** Verificado via teste unitário dbt `test_fct_anomalias_fiscais_desidratacao_patrimonio_rpps` (PASS).
- **AC 2 (Expurgo de inconsistências contábeis e exclusão de anos em aberto):** Verificado no dbt com omissão de alerta para 2026 e cálculo correto de 2025 vs 2023 (PASS).
- **AC 3 (Deep link para `/[portalSlug]/caprem?ano=[ano]#patrimonio`):** Verificado via `apps/web/lib/__tests__/radar-url.spec.ts` (PASS).
- **AC 4 (Narrativa factual neutra com horizonte de sustentabilidade):** Verificado via `apps/web/lib/__tests__/radar-civico-narrative.spec.ts` (PASS).
- **AC 5 (TipoAnomalia atualizado em `@transparencia/db`):** Verificado via `packages/db/src/queries/__tests__/radar-civico-alertas.spec.ts` (PASS).
- **AC 6 (Fundamentação legal dupla oficial CMN 4.963/2021 e Lei 9.717/1998):** Verificado via `radar-anomalia-card.spec.tsx` e `view-model.spec.ts` (PASS).
- **AC 7 (Fixtures sincronizadas e 100% dos testes aprovados):** Verificado via `make test`, `make test/ts`, `make check` e `make lint/ts` (PASS).

### Resultados de Verificação
- `make dbt/test`: 554/554 testes aprovados (PASS).
- `pnpm --filter @transparencia/db test`: 24/24 arquivos, 142/142 testes aprovados (PASS).
- `pnpm --filter web test`: 76/76 arquivos, 568/568 testes aprovados (PASS).
- `make test`: 46/46 testes de integração e sincronização de fixtures aprovados (PASS).
- `make check && make lint/ts`: 0 violações de linter (Ruff, Mypy, Biome) (PASS).

### Recomendação de Follow-up
- Nenhuma rodada subsequente de revisão necessária (`followup_review_recommended: false`). A implementação atende 100% dos critérios de aceitação e diretrizes do repositório.

## Verification

**Commands:**
- `make dbt/test` -- expected: PASS (todos os testes dbt e unit tests do mart passam)
- `pnpm --filter @transparencia/db test` -- expected: PASS (testes de Kysely passam)
- `pnpm --filter web test` -- expected: PASS (testes de componentes, narrativa e view model passam)
- `make test` -- expected: PASS (testes de integração backend/DB passam)
- `make test/ts` -- expected: PASS (testes de integração frontend/Kysely passam)
- `make check && make lint/ts` -- expected: PASS (linters e checagens estáticas passam)

