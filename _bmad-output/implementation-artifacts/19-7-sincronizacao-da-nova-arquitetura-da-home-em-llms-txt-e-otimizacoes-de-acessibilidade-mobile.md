---
title: 'Story 19.7: Sincronização da nova arquitetura da home em llms.txt e acessibilidade mobile'
type: 'chore'
created: '2026-10-25'
status: 'done'
baseline_revision: 'baa80e24550a485cf967ae05559ef9448a6a9fec'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/CLAUDE.md'
  - '{project-root}/.claude/rules/web.md'
  - '{project-root}/_bmad-output/planning-artifacts/handoff-remodelagem-home-utilidade.md'
warnings: []
deferred:
  - summary: >-
      Literais oklch(0.55 0.11 250) antigos ainda existem fora dos componentes alterados.
    evidence: |-
      sidebar.tsx, newsletter-modal.tsx, bar-chart-h.tsx, progress-provider.tsx, ribbon.tsx e view-models usam o azul antigo; o Lighthouse da home ficou em 100, mas há inconsistência visual de tom.
    location: >-
      packages/ui/src/components/sidebar.tsx
    severity: low
  - summary: >-
      Tokens duplicados entre tailwind.config.ts e packages/ui/src/tokens.ts sem teste de paridade.
    evidence: |-
      Pré-existente; a story alterou os dois arquivos manualmente.
    location: >-
      apps/web/tailwind.config.ts
    severity: low
  - summary: >-
      Aviso label-content-name-mismatch (peso 0) no link Visão Geral da navegação móvel.
    evidence: |-
      aria-label difere do texto visível Início; não altera a nota do Lighthouse.
    location: >-
      apps/web/components/mobile-bottom-nav.tsx
    severity: low
---

<intent-contract>

## Intent

**Problem:** `llms.txt` e `llms-full.txt` ainda descrevem a home com a "Seção Indicadores Sociais" (anterior às stories 19.3, 19.4 e 19.13) e não mencionam a seção "Em destaque" nem o card da Farmácia com a faixa da Lei 14.654/2023. Não há medição de Lighthouse mobile da home.

**Approach:** Atualizar os dois arquivos para refletir exatamente o que `apps/web/app/[portalSlug]/page.tsx` renderiza e medir Lighthouse mobile (build local, banco Docker local) em dois portais, corrigindo falhas de Acessibilidade e SEO até 100 e registrando as notas.

## Boundaries & Constraints

**Always:** A fonte da verdade é o código de `page.tsx`, não o handoff. Ordem real da home: resumo fiscal (hero) → "Em destaque" (Farmácia SUS → Obras → Educação; cada card só aparece se houver dados, a Farmácia some em `indisponivel`) → Radar Cívico → Pipeline de execução → Disponibilidade em caixa → cards secundários (despesas, licitações, pessoal). Rodar tudo contra o banco local (`localhost:5544`, Regra 15). Sem município, UF ou ano fixos (Regra 23). Textos ao cidadão seguem `editor-cidadao`; links de leis seguem a Regra 20. Commits em Conventional Commits minúsculos, sem referência a story ou task (Regra 19). Reusar os termos da seção 1.7.1.1 de `llms-full.txt` para a Farmácia.

**Never:** Não descrever "dobra de Sentinela Cívica" nem "Troféus da cidade" como seções da home (o código e `page.spec.tsx` não os têm; o troféu cívico vive na página de Educação). Não reescrever seções já corretas, não mudar DTOs/queries, não integrar Lighthouse ao CI, não rodar nada contra produção.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Seção "Em destaque" | Farmácia, Obras e Educação com dados | `aria-labelledby="em-destaque-heading"` válido; leitura na ordem Farmácia → Obras → Educação; selos de status com texto | Sem nenhum card a seção não renderiza |
| Farmácia `apagao` | Posição de estoque defasada | Card com faixa da Lei 14.654/2023 e botões de copiar/compartilhar | Sem acusação (indício, não descumprimento) |
| Farmácia `indisponivel` | Coleta ausente | Card não aparece na home | N/A |

</intent-contract>

## Code Map

- `apps/web/app/[portalSlug]/page.tsx` -- ordem real da home e seção "Em destaque" (`aria-labelledby`).
- `apps/web/app/[portalSlug]/page.spec.tsx` -- testes da home (já afirma que "Sentinela cívica" não aparece).
- `apps/web/components/farmacia/farmacia-resumo-card.tsx` -- card-resumo e faixa da Lei 14.654/2023.
- `apps/web/components/obras-resumo-card.tsx`, `apps/web/components/educacao-resumo-card.tsx` -- cards em destaque.
- `apps/web/public/llms.txt` -- linha ~32 (home, cita "Indicadores Sociais") e linha ~44 (Farmácia).
- `apps/web/public/llms-full.txt` -- linha ~43 ("Seção Indicadores Sociais"), seção 1.7.1.1 (Farmácia, termos de referência).
- `_bmad-output/planning-artifacts/handoff-remodelagem-home-utilidade.md` -- contexto de produto (não é fonte da verdade).

## Tasks & Acceptance

**Execution:**
- `apps/web/public/llms.txt` -- reescrever o trecho da home: remover "Indicadores Sociais", descrever a ordem real e o card da Farmácia com a faixa da Lei 14.654 -- AC 1-4.
- `apps/web/public/llms-full.txt` -- substituir a "Seção Indicadores Sociais" por "Em destaque" (ordem, condições de exibição), card da Farmácia na home e faixa da Lei 14.654, com a ação cívica da 19.4 -- AC 1-4.
- `apps/web/app/[portalSlug]/page.tsx` e componentes -- só corrigir falhas de acessibilidade/SEO apontadas pelo Lighthouse e garantir `aria-labelledby`, ordem de leitura e selos com texto -- AC 5-6.
- Testes dos componentes alterados -- ajustar/adicionar -- AC 6-7.
- `## Registro de implementação` (este arquivo) -- notas de Lighthouse por portal (Acessibilidade e SEO, mobile), correções e itens adiados -- AC 5.

**Acceptance Criteria:**
- Given a home, when se lê `llms.txt` e `llms-full.txt`, then a ordem descrita bate com `page.tsx` e nenhuma frase menciona "Seção Indicadores Sociais", Sentinela Cívica ou Troféus como parte da home.
- Given os dois arquivos, when comparados com a seção 1.7.1.1, then o card da Farmácia, a faixa da Lei 14.654/2023 e a ação cívica usam os mesmos termos, sem município, UF ou ano fixo.
- Given build de produção local e perfil mobile, when o Lighthouse roda na home de dois portais distintos, then Acessibilidade e SEO são 100 ou o motivo e o plano ficam registrados.
- Given `make test/ts` e `pnpm typecheck`, when executados, then passam.

## Spec Change Log

## Review Triage Log

### 2026-10-25 — Review pass
- verdicts: 24 findings — high 0, medium 2, low 5, false 17, maybe-false 0
- findings:
  - `[medium]` `[patch]` aria-label do filtro de entidades sem teste que fixe o nome acessível — adicionado caso em entidade-select-compact.spec.tsx
  - `[low]` `[patch]` h4→h2 do hero sem teste — criado hero-fiscal-card.spec.tsx
  - `[medium]` `[patch]` llms.txt descrevia Obras e Educação duas vezes como se fossem seções distintas — texto ajustado para indicar que são os mesmos cards de Em destaque
  - `[low]` `[defer]` literais do azul antigo fora do escopo (sidebar, newsletter, gráficos, view-models) — registrado em deferred
  - `[low]` `[defer]` tokens duplicados sem teste de paridade, pré-existente — registrado em deferred
  - `[low]` `[reject]` mutedText e subtleText parecidos — escolha de design, sem dano nomeado
  - `[low]` `[reject]` qualificador "indício" ausente em llms.txt — sem afirmação acusatória no texto; ajuste adicionaria complexidade sem ganho
  - `[false]` `[reject]` triggerLabel vazio gera rótulo com vírgula — triggerLabel é sempre "Consolidado", nome da entidade, "N entidades" ou "Nenhuma entidade"
  - `[false]` `[reject]` nome do botão da Farmácia vira "Buscar no estoque Buscar" — o span `hidden` por CSS é excluído do nome acessível; Lighthouse sem falha
  - `[false]` `[reject]` aria-label do mapa de obras sem texto visível correspondente — Lighthouse label-in-name passou no link; sem falha
  - `[false]` `[reject]` demais achados de Blind Hunter, Edge Case Hunter, Verification Gap e Intent Alignment (changelog/divisão de commits/linha longa do llms.txt, ausência de Sentinela e Troféus, notas do Lighthouse fora do diff porque a spec fica no .gitignore) — fora do escopo da intenção, pré-existentes ou descritivos

## Design Notes

Divergência registrada em 2026-10-25: a mensagem de pedido e o texto original da spec citavam "dobra de Sentinela Cívica" e "Troféus" na home. O código atual não os renderiza (o teste de `page.spec.tsx` afirma a ausência de "Sentinela cívica"), então prevalece a decisão 1: documentar o que o código faz.

## Verification

**Commands:**
- `make test/ts` -- expected: todos os testes passam
- `pnpm typecheck` -- expected: sem erros
- `grep -n -i "indicadores sociais" apps/web/public/llms.txt apps/web/public/llms-full.txt` -- expected: sem resultados

**Manual checks (if no CLI):**
- Lighthouse mobile (build de produção local, banco local) na home de dois portais: Acessibilidade e SEO = 100, notas no Registro de implementação.

## Registro de implementação

**Lighthouse 12.6.1, mobile, build de producao local (`next start`), banco Docker local (5544):**

| Portal | Acessibilidade | SEO |
|---|---|---|
| porciuncula_prefeitura | 100 | 100 |
| natividade_prefeitura | 100 | 100 |

Medicao inicial: Acessibilidade 95 e SEO 92 nos dois portais.

**Correcoes:**
- Contraste (tokens `accent`, `subtleText`, `mutedText` em `tailwind.config.ts` e `packages/ui/src/tokens.ts`, e o azul da navegacao movel): escurecidos para atingir 4,5:1.
- Ordem de titulos: o subtitulo "De onde vem cada R$ 1,00" do hero passou de `h4` para `h2`.
- Nome acessivel contendo o texto visivel: botao de busca da Farmacia (removido `aria-label`), link do mini mapa de obras ("Ver no mapa interativo de obras publicas") e filtro de entidades (inclui o rotulo visivel). Testes ajustados.
- `llms.txt` e `llms-full.txt`: "Indicadores Sociais" substituido por "Em destaque" (Farmacia SUS, Obras, Educacao), com a faixa da Lei 14.654/2023 e a acao civica.

**Adiado / observacoes:**
- SEO 92 inicial (meta description) era artefato da medicao: o Next envia os metadados em streaming no corpo para agentes que nao sao bots; o Lighthouse CLI usa um user agent sem `Chrome-Lighthouse`. Medido com `--emulated-user-agent` contendo `Chrome-Lighthouse` (igual ao PageSpeed). Googlebot e demais bots ja recebem os metadados no `head`.
- Resta o aviso `label-content-name-mismatch` (peso 0 na nota) no link "Visao Geral" da navegacao movel (`aria-label` difere do texto visivel "Inicio"); nao altera a nota.


## Auto Run Result

Status: done

- Resumo: llms.txt e llms-full.txt descrevem a home real (resumo fiscal, Em destaque Farmácia → Obras → Educação, Radar Cívico, pipeline, caixa, cards secundários); "Indicadores Sociais" removido. Lighthouse mobile 100/100 (Acessibilidade e SEO) em dois portais, com correções de contraste, ordem de títulos e nomes acessíveis.
- Revisão: 3 patches aplicados, 3 itens adiados, demais rejeitados (ver Review Triage Log).
- Verificação: make test/ts (web 1077, db 302, ui 99) e pnpm typecheck passam; biome limpo nos arquivos alterados.
- Follow-up de revisão recomendado: não.
- Riscos: tokens de cor são globais e deslocam cinzas e azul de texto em todas as páginas; o SEO 100 depende de user agent com Chrome-Lighthouse (bots reais já recebem metadados no head).
