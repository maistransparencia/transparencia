---
title: 'Story 13.9: Desacoplamento de Rotas de Navegação do Mart `fct_anomalias_fiscais_metricas`'
type: 'refactor'
created: '2026-09-23'
status: 'done'
baseline_revision: '43b1da027711abbbb38b60210a18b10140ba602e'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** O modelo analítico `fct_anomalias_fiscais_metricas` e a camada `@transparencia/db` geravam e propagavam URLs de navegação web hardcoded (`deep_link_rota`), acoplando regras analíticas/dbt a detalhes de roteamento da UI e exigindo reprocessamento do pipeline dbt a cada alteração de rota ou parâmetro.

**Approach:** Remover a coluna `deep_link_rota` do mart dbt e substituir pelo campo semântico `licitacao_numero TEXT` (preenchido exclusivamente nos CTEs de compras públicas), remover `deepLinkRota` e o helper `enrichDeepLink` de `@transparencia/db`, e centralizar a geração de URLs e deep-links em `apps/web` via função canônica `buildAlertaUrl(alerta, opts)`.

## Boundaries & Constraints

**Always:**
- Utilizar exclusivamente o tipo `TEXT` no PostgreSQL para `licitacao_numero` em migrações, dbt e fixtures conforme a Regra 16 do `AGENTS.md`.
- Manter convenção estrita de `camelCase` nas propriedades dos DTOs em TypeScript (`licitacaoNumero`, `tipoAnomalia`, etc.) conforme a Regra 18.
- Garantir programação funcional e imutabilidade em transformações TypeScript sem ternários aninhados conforme as Regras 2 e 13.
- Preservar a ordenação e os filtros semânticos em `getRadarCivicoAlertas`.
- Regerar fixtures compactadas de teste (`packages/db/tests/fixtures/schema.sql.gz`) via `make db/fixture/dump` e validar paridade com `make db/fixture/check` conforme a Regra 21.

**Never:**
- Proibido qualquer string de rota ou URL (`/despesas`, `/licitacoes`, `http...`) no SQL do mart analítico dbt.
- Proibido manter `enrichDeepLink` ou helpers de construção de URL no pacote `@transparencia/db`.
- Proibido que componentes em `apps/web` construam URLs de alerta fora da função canônica `buildAlertaUrl`.
- Proibido executar comandos ou queries contra bancos de dados de produção/remotos (Regra 15).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Alerta licitação com número | `tipoAnomalia="desconto_nulo_pregao"`, `ano=2026`, `licitacaoNumero="000517"`, `portalSlug="porciuncula"` | `"/porciuncula/licitacoes?ano=2026&numero=000517#itens"` | Se `licitacaoNumero` for nulo, omite `&numero=` |
| Alerta com entidade especificada | `tipoAnomalia="explosao_comissionados"`, `ano=2024`, `portalSlug="porciuncula"`, `opts={entidade:"camara"}` | `"/porciuncula/pessoal?ano=2024&entidade=camara#comissionados"` | Trata entidade vazia/espaços sem gerar query param inválido |
| Alerta sem âncora | `tipoAnomalia="pico_despesa_homologa"`, `ano=2024`, `portalSlug="porciuncula"` | `"/porciuncula/despesas?ano=2024"` | Sem fragmento `#` |
| Alerta financeiro receitas | `tipoAnomalia="rombo_caixa"`, `ano=2024`, `portalSlug="porciuncula"` | `"/porciuncula/receitas?ano=2024#saldo-caixa"` | Âncora canônica `#saldo-caixa` |
| Alerta previdenciário atuarial | `tipoAnomalia="inadimplencia_aporte_rpps"`, `ano=2024`, `portalSlug="porciuncula"` | `"/porciuncula/caprem?ano=2024#atuarial"` | Âncora canônica `#atuarial` |
| Alerta previdenciário patronal | `tipoAnomalia="retencao_patronal_rpps"`, `ano=2024`, `portalSlug="porciuncula"` | `"/porciuncula/caprem?ano=2024#patronal"` | Âncora canônica `#patronal` |
| Alerta quadro de pessoal | `tipoAnomalia="inconsistencia_vinculo_pessoal"`, `ano=2026`, `portalSlug="porciuncula"` | `"/porciuncula/pessoal?ano=2026#regime"` | Âncora canônica `#regime` |
| Alerta dependência fiscal | `tipoAnomalia="dependencia_transferencias"`, `ano=2024`, `portalSlug="porciuncula"` | `"/porciuncula/receitas?ano=2024"` | Sem âncora |
| Alerta com tipo desconhecido | `tipoAnomalia="desconhecido"`, `ano=2024`, `portalSlug="porciuncula"` | `"/porciuncula?ano=2024"` | Fallback seguro para raiz do portal |

</intent-contract>

## Code Map

- `elt/transform/models/marts/metrics/fct_anomalias_fiscais_metricas.sql` -- Substituir `deep_link_rota` por `licitacao_numero` em todos os CTEs (`desconto_nulo_anomalias` e `desagio_extremo_anomalias` projetam `licitacao_numero::text`, os demais projetam `null::text as licitacao_numero`), e atualizar a projeção final.
- `elt/transform/models/marts/metrics/_fct_anomalias_fiscais_metricas.yml` -- Atualizar documentação de colunas (remover `deep_link_rota`, adicionar `licitacao_numero` com `data_type: text`) e atualizar unit tests dbt substituindo `deep_link_rota` por `licitacao_numero`.
- `packages/db/src/queries/radar-civico-alertas.ts` -- Atualizar DTO `RadarCivicoAlertaDTO` (remover `deepLinkRota`, adicionar `licitacaoNumero: string | null`), remover `deep_link_rota` do `.select()` do Kysely e adicionar `licitacao_numero`, remover helper `enrichDeepLink`.
- `packages/db/src/queries/__tests__/radar-civico-alertas.spec.ts` -- Atualizar testes unitários de Kysely para verificar `licitacaoNumero` e remover testes de `enrichDeepLink`.
- `packages/db/tests/fixtures/seed.ts` -- Atualizar interface `AnomaliaFiscalRow` e helper `seedAnomaliaFiscal` substituindo `deepLinkRota` por `licitacaoNumero`.
- `apps/web/lib/radar-url.ts` -- Nova biblioteca em `apps/web` contendo a função canônica `buildAlertaUrl(alerta: RadarCivicoAlertaDTO, opts?: { entidade?: string }): string` com mapeamento estrito da tabela canônica.
- `apps/web/lib/__tests__/radar-url.spec.ts` -- Testes unitários para `buildAlertaUrl` cobrindo todas as anomalias, parâmetros de ano, número de licitação e entidade.
- `apps/web/app/[portalSlug]/view-model.tsx` -- Re-exportar `buildAlertaUrl`, atualizar `buildRadarCivicoCards` para usar `buildAlertaUrl` na definição de `ctaUrl`, e atualizar helper `getCardCtaUrl`.
- `apps/web/app/[portalSlug]/view-model.spec.ts` -- Atualizar mocks e asserções nos testes de view-model.
- `apps/web/app/api/ingestion/webhook/route.ts` -- Atualizar chamada de notificação push para usar `buildAlertaUrl(alertaCritico)`.
- `apps/web/app/api/ingestion/webhook/__tests__/route.test.ts` -- Atualizar mocks de teste do webhook.
- `apps/web/lib/social-publisher.ts` & `apps/web/lib/social-publisher.spec.ts` -- Atualizar `resolveAnomalyLink` e mocks associados para usar `buildAlertaUrl`.
- `packages/db/tests/fixtures/schema.sql.gz` -- Dump atualizado do schema PostgreSQL sem `deep_link_rota` e com `licitacao_numero`.

## Tasks & Acceptance

**Execution:**
- `elt/transform/models/marts/metrics/fct_anomalias_fiscais_metricas.sql` & `_fct_anomalias_fiscais_metricas.yml` -- Remover `deep_link_rota`, adicionar `licitacao_numero`, e alinhar testes unitários dbt -- Desacoplar mart SQL da camada de apresentação web.
- `packages/db/src/queries/radar-civico-alertas.ts` & `packages/db/src/queries/__tests__/radar-civico-alertas.spec.ts` -- Atualizar DTO e query Kysely para `licitacaoNumero`, remover `enrichDeepLink` e atualizar testes unitários -- Expor dados fiscais semânticos na camada de dados.
- `packages/db/tests/fixtures/seed.ts` -- Substituir `deepLinkRota` por `licitacaoNumero` no seed helper de testes -- Garantir sincronia com a tabela de teste.
- `apps/web/lib/radar-url.ts` & `apps/web/lib/__tests__/radar-url.spec.ts` -- Criar `buildAlertaUrl` e suíte de testes unitários para a matriz de rotas, parâmetros e âncoras -- Centralizar regras de roteamento na camada web.
- `apps/web/app/[portalSlug]/view-model.tsx` & `apps/web/app/[portalSlug]/view-model.spec.ts` -- Integrar `buildAlertaUrl` em `buildRadarCivicoCards` e atualizar testes do view-model -- Garantir que cards usem a nova geração canônica de URLs.
- `apps/web/app/api/ingestion/webhook/route.ts` & `apps/web/app/api/ingestion/webhook/__tests__/route.test.ts` -- Atualizar despacho de push notification para usar `buildAlertaUrl` -- Preservar notificações cívicas com links precisos.
- `apps/web/lib/social-publisher.ts` & `apps/web/lib/social-publisher.spec.ts` -- Atualizar geração de links sociais para delegar a `buildAlertaUrl` -- Unificar formatação de links de auditoria cívica.
- `make dbt/run` & `make db/fixture/dump` & `make db/fixture/check` -- Recompilar modelo dbt localmente, atualizar fixture compactada de teste e validar paridade -- Assegurar governança e paridade de banco conforme Regra 21.

**Acceptance Criteria:**
- Given o modelo `elt/transform/models/marts/metrics/fct_anomalias_fiscais_metricas.sql`, when o modelo for executado no dbt, then a coluna `deep_link_rota` não existe na tabela e a coluna `licitacao_numero` é do tipo `TEXT`, populada com o número da licitação nas anomalias de compras (`desconto_nulo_pregao`, `desagio_extremo_inexequibilidade`) e `NULL` nas demais.
- And no pacote `@transparencia/db`, o DTO `RadarCivicoAlertaDTO` possui o campo `licitacaoNumero: string | null`, não contém `deepLinkRota`, e a função `enrichDeepLink` foi excluída.
- And em `apps/web`, a função `buildAlertaUrl(alerta, opts)` mapeia cada `tipoAnomalia` com precisão para rota base, âncora, e query params (`ano`, `numero`, `entidade`) conforme a especificação canônica.
- And todos os componentes e serviços consumidores em `apps/web` (cards, webhook push, social publisher) utilizam `buildAlertaUrl`.
- And `make test` e `make test/ts` passam com 100% de sucesso.

## Spec Change Log

## Review Triage Log

### 2026-09-23 — Review pass
- verdicts: 14 findings — high 0, medium 3, low 9, false 2, maybe-false 0
- findings:
  - `[medium]` `[patch]` apps/web/lib/radar-url.ts:57-59 — Protocol-relative URL generation bug on empty cleanSlug in buildAlertaUrl — Corrigido com fallback limpo (cleanSlug ? ... : config.path || "/").
  - `[low]` `[patch]` apps/web/lib/radar-url.ts:54-56 — Nullish coalescing masking in buildAlertaUrl (opts?.portalSlug vs alerta.portalSlug) — Corrigido priorizando trimmed non-empty string.
  - `[medium]` `[patch]` packages/db/src/queries/radar-civico-alertas.ts:39 — Parâmetro morto entidade em GetRadarCivicoAlertasOptions — Removido campo não utilizado da interface TypeScript.
  - `[false]` `[reject]` apps/web/lib/radar-url.ts — Dangling #itens anchor when licitacaoNumero is absent — Rejeitado: comportamento explicitamente especificado na tabela canônica e coberto por testes unitários da matriz.
  - `[low]` `[patch]` apps/web/lib/radar-url.ts — Falta de validação estrita de ano fiscal (zero/negativo/decimal) — Corrigido com validação Number.isInteger(alerta.ano) && alerta.ano > 0.
  - `[false]` `[reject]` apps/web/app/[portalSlug]/view-model.tsx — Code duplication and bypass of getCardCtaUrl in buildRadarCivicoCards — Rejeitado: buildAlertaUrl é a função canônica mandatória pelo critério de aceitação da história.
  - `[low]` `[patch]` apps/web/app/[portalSlug]/view-model.tsx — Propriedade legada deepLinkRota em RadarCivicoCardItem — Removida propriedade morta da interface e do mapeador.
  - `[medium]` `[patch]` apps/web/app/[portalSlug]/view-model.tsx & radar/view-model.ts — Falta de repasse do parâmetro entidade para buildRadarCivicoCards — Adicionada prop entidade em BuildRadarCivicoCardsOptions e repassada do searchParams.
  - `[low]` `[patch]` apps/web/lib/social-publisher.ts — Potencial duplicação de barra em resolveAnomalyLink com trailing slash — Corrigido sanitizando baseUrl com replace(/\/+$/, "").
  - `[low]` `[patch]` apps/web/lib/__tests__/radar-url.spec.ts — Cobertura de testes unitários para casos de borda adicionais — Adicionados 3 novos testes cobrindo slug ausente, ano inválido e fallback.
  - `[low]` `[patch]` apps/web/app/api/ingestion/webhook/route.ts — Falta de repasse explícito de portalSlug na chamada de push — Adicionado { portalSlug: payload.portalSlug } na chamada a buildAlertaUrl.
  - `[low]` `[patch]` apps/web/app/[portalSlug]/radar/loader.ts — Chamada a getRadarCivicoAlertas repassava entidade — Corrigido chamando sem opções e retornando entidade no payload.
  - `[low]` `[patch]` apps/web/app/[portalSlug]/radar/page.spec.tsx & view-model.spec.ts — Tipagem de makeRaw com campo entidade — Corrigido incluindo entidade: undefined no mock padrão.
  - `[low]` `[patch]` apps/web/lib/radar-url.ts — Tipagem fraca do parâmetro tipoAnomalia como string pura — Corrigido importando TipoAnomalia de @transparencia/db.

## Auto Run Result

### Summary of implemented change
Desacoplamento completo das regras de apresentação e URLs de navegação web do mart analítico `fct_anomalias_fiscais_metricas` e da camada Kysely `@transparencia/db`. A coluna `deep_link_rota` e o helper `enrichDeepLink` foram excluídos, substituídos pelo campo semântico `licitacao_numero TEXT` (populado estritamente nas anomalias de licitação). Toda a lógica de roteamento foi centralizada na camada web via helper canônico `buildAlertaUrl(alerta, opts)` em `apps/web/lib/radar-url.ts` (re-exportado em `view-model.tsx`), com cobertura integral de testes unitários, paridade de fixtures de banco de dados (`schema.sql.gz`) e integração em todos os consumidores (cards de alertas, push notifications de webhook e publicador de redes sociais).

### Files changed with one-line descriptions
- `elt/transform/models/marts/metrics/fct_anomalias_fiscais_metricas.sql`: Substituída a coluna `deep_link_rota` por `licitacao_numero TEXT` em todas as CTEs e projeção final.
- `elt/transform/models/marts/metrics/_fct_anomalias_fiscais_metricas.yml`: Atualizado contrato de colunas e unit tests dbt validando `licitacao_numero`.
- `packages/db/src/queries/radar-civico-alertas.ts`: Atualizado DTO `RadarCivicoAlertaDTO` (`licitacaoNumero: string | null`), query Kysely e remoção de `enrichDeepLink` e `entidade` em options.
- `packages/db/tests/fixtures/seed.ts`: Atualizado seed helper com `licitacaoNumero` no lugar de `deepLinkRota`.
- `packages/db/tests/fixtures/schema.sql.gz`: Fixture binária compactada regerada com paridade 100% via `make db/fixture/dump`.
- `packages/db/src/queries/__tests__/radar-civico-alertas.spec.ts`: Atualizados testes unitários de banco de dados verificando `licitacaoNumero`.
- `apps/web/lib/radar-url.ts`: Módulo canônico com `buildAlertaUrl` mapeando rota base, âncora, parâmetros e sanitização de slug.
- `apps/web/lib/__tests__/radar-url.spec.ts`: 19 testes unitários validando matriz completa de anomalias fiscais e casos de borda.
- `apps/web/app/[portalSlug]/view-model.tsx`: Delegação para `buildAlertaUrl`, repasse de `entidade` e limpeza da propriedade legada `deepLinkRota`.
- `apps/web/app/[portalSlug]/view-model.spec.ts`: Atualizados mocks de testes para usar `licitacaoNumero`.
- `apps/web/app/[portalSlug]/radar/loader.ts` & `loader.spec.ts`: Remoção de `entidade` da chamada a `getRadarCivicoAlertas` e repasse no retorno.
- `apps/web/app/[portalSlug]/radar/view-model.ts` & `view-model.spec.ts`: Repasse da entidade para `buildRadarCivicoCards`.
- `apps/web/app/[portalSlug]/radar/page.spec.tsx`: Tipagem ajustada no mock padrão `makeRaw`.
- `apps/web/app/api/ingestion/webhook/route.ts` & `route.test.ts`: Uso de `buildAlertaUrl(alertaCritico, { portalSlug })` para Web Push.
- `apps/web/lib/social-publisher.ts` & `social-publisher.spec.ts`: Delegação para `buildAlertaUrl` e sanitização de `baseUrl`.
- `apps/web/app/[portalSlug]/page.spec.tsx`, `receitas/page.spec.tsx`, `receitas/view-model.spec.ts`: Mocks atualizados com `licitacaoNumero: null`.

### Review findings breakdown
- Patches applied: 12 patches (findings 1, 2, 3, 5, 7, 8, 9, 10, 11, 12, 13, 14).
- Items deferred: 0.
- Rejected findings: 2 findings (finding 4: âncora `#itens` expressa na especificação da tabela canônica; finding 6: `buildAlertaUrl` é a função mandatória chamada diretamente).

### Follow-up review recommendation
- `followup_review_recommended: false` — Todos os 12 patches foram aplicados e verificados de ponta a ponta com 100% de sucesso na suíte completa (`make test`, `make test/ts`, `make check`, `make db/fixture/check`, `pnpm lint`, `pnpm build`). Nenhum risco residual não verificado.

### Verification performed
- `make check`: Ruff lint, format e Mypy type-check executados com sucesso em 33 arquivos.
- `make test`: 43 testes de integração dbt/pytest aprovados.
- `make db/fixture/check`: 4 testes de paridade estrutural (tabelas, colunas, tipos e seeds) aprovados.
- `pnpm lint`: Biome check aprovado em 316 arquivos com 0 erros.
- `pnpm test`: 74 arquivos de teste e 542 testes aprovados.
- `pnpm build`: Build de produção Turborepo / Next.js compilado com sucesso e zero erros de tipo.

### Residual risks
- Nenhum risco residual identificado. Todas as rotas geradas preservam retrocompatibilidade total com a navegação do portal.

## Design Notes

### Mapeamento Canônico de Rotas e Âncoras
A função `buildAlertaUrl` utiliza padrão funcional/switch para mapear tipos de anomalias:
- `/despesas`: `pico_despesa_homologa` (sem âncora), `opacidade_gastos_genericos` (`#gastos-genericos`).
- `/pessoal`: `explosao_comissionados` (`#comissionados`), `inconsistencia_vinculo_pessoal` (`#regime`).
- `/receitas`: `rombo_caixa` (`#saldo-caixa`), `dependencia_transferencias` (sem âncora).
- `/caprem`: `inadimplencia_aporte_rpps` (`#atuarial`), `retencao_patronal_rpps` (`#patronal`).
- `/licitacoes`: `concentracao_dispensa` (sem âncora), `desconto_nulo_pregao` (`#itens` + `&numero=licitacaoNumero`), `desagio_extremo_inexequibilidade` (`#itens` + `&numero=licitacaoNumero`).

### Parâmetros de Query
A ordem de concatenação dos parâmetros é padronizada:
1. `ano`: sempre incluído se presente.
2. `numero`: incluído para anomalias de licitação quando `licitacaoNumero` estiver preenchido.
3. `entidade`: incluído se fornecido via `opts.entidade`.
4. Âncora (`#`): posicionada sempre no final da URL.

## Verification

**Commands:**
- `make check` -- expected: Sucesso em linters e type-checking Python (ruff e mypy).
- `make test` -- expected: Sucesso em todos os testes dbt e pytest.
- `pnpm lint` -- expected: Biome aprovado em todos os arquivos TypeScript.
- `pnpm test` -- expected: Sucesso em todos os testes unitários e de integração TypeScript.
- `make db/fixture/check` -- expected: Paridade total confirmada entre dbt e schema.sql.gz.
- `pnpm build` -- expected: Compilação Turbo completa sem erros de tipo.
