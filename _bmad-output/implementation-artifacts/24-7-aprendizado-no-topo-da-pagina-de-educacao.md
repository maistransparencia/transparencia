---
title: 'Aprendizado no Topo da Página de Educação'
type: 'feature'
created: '2026-11-01'
status: 'done'
baseline_revision: 'b8e50b8c800aed870fa9a3488051374bd55d1eb2'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/DESIGN.md'
  - '{project-root}/EXPERIENCE.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-24-context.md'
warnings: []
deferred:
  - summary: >-
      Empates de nota_ideb no ranking estadual são desempatados só por cod_ibge, podendo gerar "subiu/caiu N posições" espúrio.
    evidence: |-
      Regra de ordenação pré-existente (nota_ideb desc, cod_ibge asc), mantida de propósito pela spec; notas têm uma casa decimal, então empates são comuns.
    location: >-
      packages/db/src/queries/educacao-metrics.ts
    severity: medium
  - summary: >-
      Totais iguais mas conjuntos de municípios diferentes entre ciclos, ou ano do ranking diferente do ano anterior da nota do município, comparam populações distintas.
    evidence: |-
      Não verificado com dados reais de seed_inep_ideb; checar se há ciclos com mesmo total e municípios trocados.
    location: >-
      packages/db/src/queries/educacao-metrics.ts, apps/web/app/[portalSlug]/educacao/view-model.ts
    severity: medium (unverified)
---

<intent-contract>

## Intent

**Problem:** `/educacao` abre pelo financeiro; o cidadão só vê se os alunos aprendem na 6ª seção, com "Nota do IDEB" e "Ciclo anterior" separados e sem a mudança de posição no ranking.

**Approach:** Subir `EducacaoAprendizadoSection` para o primeiro bloco da página, fundir nota atual e ciclo anterior em um indicador por etapa, e mostrar a variação de posição no ranking estadual calculada em `@transparencia/db`.

## Boundaries & Constraints

**Always:** Regra 14 (conta em `@transparencia/db`), Regra 23 (sem UF, "Média RJ" nem ano fixo), Regra 27 (pergunta "As crianças da rede municipal estão aprendendo?"), IDEB bienal: texto diz "ciclo anterior", nunca "ano anterior". Variação com sinal e palavra ("subiu"/"caiu"), não só cor. "Meta" continua visível com a causa quando não há meta. Sem ciclo anterior: "—" com a causa, sem esconder a etapa. Zero ternário aninhado (Regra 13); `DESIGN.md`/`EXPERIENCE.md`.

**Never:** Hero novo; matrículas, valor por aluno ou mínimos legais (24.4–24.6); reservar espaço vazio; comparar posições quando o total de redes difere.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Subiu | ciclo anterior 4,5 (2023), atual 5,9; posição 40→30, mesmo total | "5,9 apurada em 2025" + "ciclo anterior 4,5 em 2023, subiu 1,4 ponto"; "subiu 10 posições" | — |
| Caiu | posição piorou | "caiu N posições", variação negativa | — |
| Total diferente | total do ciclo anterior ≠ atual | texto diz que o número de redes mudou (de X para Y) em vez de comparar | `variacaoPosicoes = null` |
| Sem ciclo anterior | só uma nota apurada | "—" com "sem ciclo anterior para comparar" | etapa permanece visível |
| Sem meta | `metaIdeb` nulo | "—" com "o MEC não definiu meta para este ciclo" | — |

</intent-contract>

## Code Map

- `packages/db/src/queries/educacao-metrics.ts:107-112,307-461` -- `EducacaoRankingEstadualDTO` e `getEducacaoRankingEstadual`: hoje compara com `targetAno - 2` fixo e ignora total do ciclo anterior; mesma ordenação (`nota_ideb desc`, `cod_ibge asc`) deve valer nos dois ciclos. Também usado pela home (`variacaoPosicoes`, `app/[portalSlug]/view-model.tsx:87`): manter o campo.
- `packages/db/src/queries/__tests__/educacao-metrics.spec.ts:975` -- testes do ranking.
- `apps/web/app/[portalSlug]/educacao/view-model.ts:78-90,242-275,387-400` -- `AprendizadoEtapa` e `buildAprendizadoEtapa` (hoje descarta `variacaoPosicoes`).
- `apps/web/app/[portalSlug]/educacao/loader.ts:123-145` -- chama o ranking por etapa; não deve mudar.
- `apps/web/components/educacao/educacao-aprendizado-section.tsx` -- `EtapaPainel` (4 indicadores: nota, meta, ciclo anterior, classificação).
- `apps/web/app/[portalSlug]/educacao/page.tsx:93-200` -- ordem das seções; mover `EducacaoAprendizadoSection` para antes do hero.
- `apps/web/components/educacao/educacao-historico-section.tsx:361` e `components/saude-educacao-divisorias.spec.ts:25` -- citação "Nota Informativa do Ideb 2025" é o título oficial do documento do INEP, com ano próprio; fica, com o motivo registrado em comentário na regex de `CITACOES_OFICIAIS` (já existe a exceção).
- Specs: `educacao/view-model.spec.ts`, `educacao/page.spec.tsx`, `educacao/loader.spec.ts`; `apps/web/public/llms.txt`, `llms-full.txt`, `CHANGELOG.md`.

## Tasks & Acceptance

**Execution:**
- `packages/db/src/queries/educacao-metrics.ts` -- ciclo anterior = último ano < ano atual com notas da etapa/UF; DTO ganha `anoCicloAnterior` e `totalMunicipiosCicloAnterior`; `variacaoPosicoes` só quando os totais são iguais -- compara só o comparável
- `packages/db/src/queries/__tests__/educacao-metrics.spec.ts` -- casos: subiu, caiu, total diferente, sem ciclo anterior
- `apps/web/app/[portalSlug]/educacao/view-model.ts` -- `AprendizadoEtapa.classificacao` com `variacaoPosicoes`, `totalCicloAnterior`; textos derivados no componente
- `apps/web/components/educacao/educacao-aprendizado-section.tsx` -- fundir "Nota do IDEB"+"Ciclo anterior" em um `Indicator` (nota, ano, ciclo anterior com variação em pontos, sinal e palavra); classificação com variação de posições ou aviso de total diferente; pergunta do cidadão na descrição; helper para sinal/palavra sem ternário aninhado
- `apps/web/app/[portalSlug]/educacao/page.tsx` -- hero (h1 + painel) permanece no topo; aprendizado logo depois dele, antes das seções financeiras
- Specs de view-model, página (ordem) e componente; `llms.txt`, `llms-full.txt`, `CHANGELOG.md`

**Acceptance Criteria:**
- Given `/[portalSlug]/educacao`, when renderiza, then o hero continua no topo, "Aprendizado dos alunos" vem logo depois dele e antes das seções financeiras, e nenhuma seção some
- Given duas notas apuradas, when a etapa renderiza, then há um indicador com nota+ano e "ciclo anterior X em AAAA, subiu/caiu Y pontos"
- Given totais de redes iguais nos dois ciclos, when renderiza a classificação, then mostra "subiu/caiu N posições"; given totais diferentes, then avisa que o número de redes mudou e não compara
- Given qualquer texto novo, then não contém "ano anterior", UF, "Média RJ" nem ano fixo em título

## Spec Change Log

- 2026-11-01 — instrução do usuário durante a execução: o hero de `/educacao` deve continuar existindo e o aprendizado não é simplesmente a primeira seção da página. Posição final: hero e painel de indicadores primeiro, aprendizado logo depois, financeiro em seguida. Substitui "primeiro bloco" do `<intent-contract>` (somente leitura) e do AC original do `epics.md`.

## Review Triage Log

### 2026-11-01 — Review pass
- verdicts: 11 findings — high 0, medium 3, low 5, false 1, maybe-false 2
- findings (só a lente Edge Case Hunter, por custo; Regra 3 do CLAUDE.md):
  - `[low]` `reject` "subiu 0 pontos" por arredondamento — notas do IDEB já têm uma casa decimal, variação nunca fica abaixo de 0,1
  - `[low]` `reject` município ausente no ciclo anterior com totais iguais mostra "sem ciclo anterior" — caso raro, texto aceitável
  - `[medium]` `defer` totais iguais com conjuntos diferentes — ver `deferred`
  - `[medium]` `defer` empates de nota — ver `deferred`
  - `[low]` `reject` duas consultas extras quando posição é nula — custo desprezível
  - `[maybe-false]` `defer` ano do ranking vs ano anterior da nota — ver `deferred`
  - `[false]` `reject` seção vazia deveria sumir — spec manda manter a etapa com "—" e a causa
  - `[medium]` `patch` h2 antes do h1 — resolvido ao manter o hero no topo (instrução do usuário)
  - `[low]` `reject` teste escolhe o último "Ver detalhes" — frágil, mas cobre o caso; sem dano real
  - `[low]` `reject` frase repetida em llms-full.txt — cosmético
  - `[maybe-false]` `reject` alegação de ciclo anterior consistente — o próprio revisor não achou falha

## Verification

**Commands:**
- `pnpm test` -- expected: verde (inclui `saude-educacao-divisorias.spec.ts`)
- `pnpm typecheck` -- expected: sem erros

## Auto Run Result

Status: done

- Resumo: aprendizado logo abaixo do hero (hero permanece no topo, por instrução do usuário), nota e ciclo anterior fundidos por etapa, variação de posição no ranking calculada em `@transparencia/db` por ciclo real e só com total de redes igual.
- Arquivos: `educacao-metrics.ts` (ranking), `view-model.ts`, `educacao-aprendizado-section.tsx`, `page.tsx`, specs, `llms.txt`, `llms-full.txt`, `CHANGELOG.md`.
- Revisão: 1 patch (h2 antes do h1, resolvido pela posição final), 2 itens adiados, demais rejeitados com motivo acima. Follow-up recomendado: false.
- Verificação: `pnpm typecheck` e `pnpm test` verdes. `make test`/`make check` não rodados (sem mudança em dbt/Python).
- Riscos: texto não passou pelo `editor-cidadao`; query de ranking sem teste de banco; não vista no navegador.
