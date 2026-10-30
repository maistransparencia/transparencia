---
title: 'Story 12.6: Página de Histórico do Radar Cívico com Seções Anuais Cronológicas em Temas'
type: 'feature'
created: '2026-09-14'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/implementation-artifacts/epic-12-context.md'
  - '_bmad-output/planning-artifacts/epics.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** O feed do Radar Cívico na Homepage atende ao monitoramento pontual do exercício selecionado no filtro global, mas não oferece ao cidadão uma visão panorâmica e longitudinal de todas as anomalias, picos e variações detectadas ao longo de múltiplos exercícios municipais (2021 a 2026). Além disso, não há uma rota temática dedicada no menu de navegação lateral para auditar o histórico consolidado.

**Approach:** Criar uma página dedicada `/[portalSlug]/radar` acessível a partir do grupo **Temas** no Sidebar, agrupando cronologicamente os alertas e anomalias de todos os anos disponíveis em seções anuais (`md:grid-cols-2`), ocultando anos que não possuam anomalias apuradas e mantendo linguagem estritamente factual e neutra através do componente `RadarAnomaliaCard`.

## Boundaries & Constraints

**Always:**
- Rota canônica definida estritamente como `/[portalSlug]/radar`.
- Link no Sidebar posicionado dentro do grupo `Temas` (`packages/ui/src/components/sidebar.tsx`), com ícone semântico `ShieldAlert` e nome "Radar Cívico".
- Consulta multi-ano no `@transparencia/db`: invocar `getRadarCivicoAlertas(portalSlug)` sem restringir o parâmetro `ano`.
- Ordenação estrita das anomalias: por `ano DESC` como critério primário, seguido por prioridade de anomalia estrutural (`rombo_caixa`), severidade (`critico > alto > moderado`) e magnitude do desvio (`abs(desvio_percentual) DESC`).
- Ocultar anos sem alertas: renderizar seções exclusivamente para anos que possuam ao menos uma anomalia apurada.
- Preservar grade de 2 colunas (`md:grid md:grid-cols-2 gap-4`) reutilizando o componente canônico `RadarAnomaliaCard`.
- Disponibilizar barra de atalhos rápidos/âncoras para os anos disponíveis (`#ano-2026`, `#ano-2025`...) permitindo navegação fluida.
- Cumprir a Regra 12: sincronizar obrigatoriamente `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` com a nova rota pública e suas capacidades.
- Cumprir a Regra 18: tipagem e DTOs estritamente em `camelCase`.
- Cumprir a Regra 13: zero ternários aninhados em qualquer lógica condicional.
- Cumprir a Regra 17: importar variáveis de ambiente exclusivamente de `@/env`.

**Never:**
- Nunca exibir seções vazias para anos sem anomalias (decisão validada com o usuário).
- Nunca criar componentes de apresentação duplicados para o card de anomalia: reutilizar exclusivamente `RadarAnomaliaCard`.
- Nunca quebrar o layout caso nenhum alerta seja encontrado em nenhum ano: exibir empty-state global de conformidade histórica municipal.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Múltiplos anos com alertas | Alertas presentes em 2026, 2024 e 2023; nenhum em 2025 ou 2022 | Renderiza seções para 2026, 2024 e 2023 em ordem decrescente; 2025 e 2022 são omitidos | Suprime seções sem cards |
| Navegação rápida por ano | Cidadão clica na pílula "2024" na barra de âncoras | A página rola suavemente até o cabeçalho `#ano-2024` | Âncora canônica no elemento `<section id="ano-2024">` |
| Nenhum alerta em todo o histórico | `alertas = []` retornado pelo leitor Kysely | Renderiza empty-state global de conformidade histórica assegurando ausência de desvios atípicos | Componente de estado vazio amigável |
| Filtro de entidade ativo na URL | `?entidades=3` presente na URL | Repassa parâmetro para `enrichDeepLink`, preservando o perimetro institucional nos links dos cards | URL de destino herda searchParams |
| Compartilhamento no WhatsApp | Clique em botão WhatsApp no card | Gera mensagem factual com URL canônica apontando para o recurso auditado | `buildWhatsAppShareUrl` reutilizado |

</intent-contract>

## Code Map

- `packages/ui/src/components/sidebar.tsx` -- Adicionar o item "Radar Cívico" (`/radar`) no grupo `Temas` com ícone `ShieldAlert`.
- `packages/db/src/queries/radar-civico-alertas.ts` -- Assegurar ordenação primária por `ano DESC` em `getRadarCivicoAlertas`.
- `apps/web/app/[portalSlug]/radar/loader.ts` -- Data loader para carregar dados multi-ano via `getRadarCivicoAlertas(portalSlug, { entidade })`.
- `apps/web/app/[portalSlug]/radar/view-model.ts` -- View model que transforma os alertas e agrupa em seções anuais cronológicas (`RadarAnoSection`), ocultando anos vazios.
- `apps/web/app/[portalSlug]/radar/page.tsx` -- Server Component que renderiza o cabeçalho, barra de âncoras de anos e seções com grade de 2 colunas.
- `apps/web/app/[portalSlug]/radar/opengraph-image.tsx` -- Geração de OpenGraph card dedicado ao histórico do Radar Cívico.
- `apps/web/app/[portalSlug]/radar/view-model.spec.ts` -- Testes unitários para agrupamento por ano, ordenação decrescente e omissão de anos sem anomalias.
- `apps/web/app/[portalSlug]/radar/page.spec.tsx` -- Testes de renderização da página e seus blocos anuais.
- `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` -- Sincronização obrigatória da nova rota e documentação cívica (Regra 12).
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- Registro da Story 12.6.

## Tasks & Acceptance

**Execution:**
1. `packages/ui/src/components/sidebar.tsx` -- Adicionar item "Radar Cívico" no grupo Temas -- Habilita acesso na navegação lateral.
2. `packages/db/src/queries/radar-civico-alertas.ts` -- Adicionar `.orderBy("ano", "desc")` no leitor Kysely -- Garante ordenação cronológica decrescente.
3. `apps/web/app/[portalSlug]/radar/loader.ts` -- Implementar `loadRadarData` -- Carrega dados multi-ano do portal.
4. `apps/web/app/[portalSlug]/radar/view-model.ts` -- Implementar agrupamento de seções anuais -- Formata DTOs e omite anos sem alertas.
5. `apps/web/app/[portalSlug]/radar/page.tsx` -- Criar página com barra de âncoras e seções anuais -- Apresenta histórico em 2 colunas.
6. `apps/web/app/[portalSlug]/radar/opengraph-image.tsx` -- Criar imagem OG para compartilhamento social -- Suporte a metadados e redes.
7. `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` -- Atualizar catálogos para consumo por LLMs -- Cumpre Regra 12.
8. `apps/web/app/[portalSlug]/radar/view-model.spec.ts` e `page.spec.tsx` -- Criar suítes de testes unitários e de integração -- Garante cobertura e qualidade.
9. `_bmad-output/implementation-artifacts/sprint-status.yaml` -- Registrar status da Story 12.6.

**Acceptance Criteria:**
- Given o menu de navegação lateral (Sidebar) em qualquer página do portal
- When o grupo `Temas` for renderizado
- Then exibe o link "Radar Cívico" direcionando para `/[portalSlug]/radar` com o ícone `ShieldAlert`.
- When o usuário acessa `/[portalSlug]/radar`
- Then exibe o histórico de anomalias agrupado por exercício em ordem cronológica decrescente (ex: 2026, 2024, 2021...).
- And anos que não possuem alertas detectados são omitidos da exibição.
- And cada seção anual exibe o título do exercício, contagem de alertas e a grade de cards em 2 colunas com `RadarAnomaliaCard`.
- And uma barra de navegação rápida por âncoras permite pular diretamente para qualquer exercício listado.
- And caso nenhum alerta exista em todo o histórico, exibe estado de conformidade global.
- And os guias `llms.txt` e `llms-full.txt` documentam a nova rota.
