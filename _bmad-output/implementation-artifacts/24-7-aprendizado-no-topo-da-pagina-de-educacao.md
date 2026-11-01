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
deferred: []
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

### 2026-11-01 — Pendências resolvidas (pedido do usuário)
- empates: `classificarRedes` dá a mesma posição a notas iguais; resolvido
- conjuntos de redes diferentes e ano do ranking ≠ ano da nota anterior: comparação só entre as redes presentes nos dois ciclos (decisão do usuário, substitui "não comparar quando o total difere") e variação descartada quando `anoCicloAnterior` não confere com o da nota; resolvido
- teste real no banco para `getEducacaoRankingEstadual` com UF fictícia; resolvido
- ajustes visuais: variação ao lado da nota e da posição (verde/vermelho, nada se igual), "Meta" depois da classificação

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

### Review Findings

Revisão do commit `f129dc51` (4 lentes: Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor).

- [x] [Review][Patch] Sem teste de que a variação some quando `anoCicloAnterior` difere do ano da nota anterior (ou é nulo) [apps/web/app/[portalSlug]/educacao/view-model.spec.ts]
- [x] [Review][Patch] Teste das setas não distingue nota de posição, aceita o "meta atingida" como seta verde e não cobre variação 0 [apps/web/app/[portalSlug]/educacao/page.spec.tsx]
- [x] [Review][Patch] "sem ciclo anterior para comparar" aparece mesmo havendo ciclo anterior não comparável (rede sem nota no ciclo ou anos que não conferem) [apps/web/components/educacao/educacao-aprendizado-section.tsx]
- [x] [Review][Patch] A base da comparação fica escondida quando só saíram redes do ciclo anterior (`redesComparadas` igual ao total atual, mas o anterior era maior); o view-model deixou de levar o total do ciclo anterior [apps/web/app/[portalSlug]/educacao/view-model.ts]
- [x] [Review][Patch] Teste de banco sem limpeza prévia da faixa 9900000–9900099 em `seed_inep_ideb`: sobra de execução interrompida quebra o insert [packages/db/src/queries/__tests__/educacao-metrics.spec.ts]
- [x] [Review][Defer] Ranking pode usar ano anterior ao da nota atual (fallback de `targetAno`); só o ano do ciclo anterior é conferido — deferred: maybe-false (se fosse real, medium). Confirmar se o loader passa o ano selecionado e se há município com nota atual em ano posterior ao do ranking.

#### Rejected

- `false` — linhas duplicadas de `cod_ibge` no mesmo ciclo: `seed_inep_ideb` é uma linha por município, ano, rede e etapa; sem caminho que gere duplicata.
- `low` — "0,0" com seta por arredondamento: notas do IDEB têm uma casa decimal, variação nunca fica abaixo de 0,1.
- `low` — setas com `aria-hidden` sem texto: sinal e palavra ("subiu"/"caiu") estão nas notas dos indicadores, como a spec exige.
- `low` — seta de posição ambígua (seta para cima com número menor): é a regra pedida pelo usuário (verde ao subir); explicada pelo subtítulo.
- `low` — `redesComparadas` opcional no DTO: cosmético, o view-model trata `undefined`; tornar obrigatório mexeria em fixtures da home.
- `low` — `text-base`/`ml-2` no span da variação e `h-4 w-4` no ícone: borderline, sem dano; o padrão já aparece no "meta atingida".
- `low` — sem mínimo de redes comparadas: caso não alcançável com ranking estadual de dezenas de redes.
- `low` — teste de banco usa `db` direto em vez de helper de fixture: não há helper para `seed_inep_ideb`; criar um é mais que correção direta.
- `false` — metrica de `fct_educacao_metricas` vazando do teste: `cleanupFixtures` apaga `fct_educacao_metricas` por `portal_slug`.
- Pedidos de editar a spec (texto desatualizado do contrato, Spec Change Log) e dúvidas de CHANGELOG/llms: rejeitados, a correção seria editar a spec; CHANGELOG e llms já foram atualizados no commit.
- `low` — nomes `r`/`rows` em lambdas: Regra 9 trata de métricas, não de parâmetros de lambda.
