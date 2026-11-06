---
status: done
---

# Story 25.3: Contratos em `@transparencia/db` e Bloco do Mínimo no Topo de `/saude`

Escopo: `planning-artifacts/epics.md`, Story 25.3 (Epic 25), ainda em esboço. **Esta story começa detalhando os critérios de aceite** a partir do que está aqui, antes de codar, e registra o detalhamento no `epics.md`. Contexto da fonte: `implementation-artifacts/25-2-minimo-constitucional-de-saude-no-dbt.md` e a spike `planning-artifacts/spike-saude-fontes-indicadores.md` (local, não versionada).

## Pergunta do cidadão (Regra 27)

"A Prefeitura aplica o mínimo exigido em saúde?" A régua (15%) vem junto do número.

## O que já existe (25.2, mesclada na `feature/epic25`)

Mart `analytics.fct_saude_minimo_constitucional`, grão `portal_slug`, `ano` e `periodo`. Colunas: `situacao`, `percentual_aplicado_saude`, `minimo_aplicacao_saude_percentual` (em pontos percentuais, **15.00**, não 0.15), `cumpre_minimo`, `despesa_saude_por_habitante`, `percentual_transferencias_saude`, `receita_impostos_transferencias_constitucionais`, `despesa_recursos_proprios`, `despesa_total_saude`, `divergencia_entre_vias`, `indicadores_divergentes`, `coletado_em`.

Mart `fct_saude_minimo_conferencia` (cálculo próprio) existe, mas **não é fonte da tela**.

## Regras de exibição já decididas (não reabrir)

- **Rótulo:** "calculado pelo SIOPS (Ministério da Saúde) com dados enviados pela Prefeitura", com a data em que o portal consultou o SIOPS (`coletado_em`; o SIOPS não informa a data de transmissão). Sem afirmar que a Prefeitura "cumpriu" ou "descumpriu" a lei: o texto diz o valor do SIOPS e a régua de 15%. O 3.2 é cálculo do sistema, o 15% é o limite legal (LC 141/2012 art. 7º, nova redação pela LC 227/2026, vigente desde 14/01/2026).
- **Ano em andamento:** valor `parcial`, **nunca comparado com o mínimo** (sem barra de cumprimento nem selo; só o valor parcial e o aviso). Há caso real de 121,91% em bimestre parcial.
- **`divergencia_entre_vias` verdadeiro:** citar só a via oficial; o `editor-cidadao` decide o texto. `cumpre_minimo` nulo significa que a tela não afirma nada sobre cumprimento.
- **Sem linha no mart** (ano corrente sem bimestre transmitido) e **"Não houve transmissão"**: estado "sem dado", nunca zero. A 25.2 não gera linha de `sem_dado`; a tela trata a ausência.
- **Cálculo próprio:** não aparece como fato medido. Se aparecer em "Ver detalhes", diz que é conferência feita pelo portal e como foi calculada (Regra 27). A diferença de despesa de Porciúncula 2024 está **registrada sem causa provada** (atribuição da fonte de recurso): a tela não sugere irregularidade.
- **Ver detalhes:** memória de cálculo (receita base, despesa com recursos próprios, despesa total, estágio da despesa que o SIOPS usa: empenhada menos restos sem disponibilidade; a LC 141 art. 24 fala em liquidada e restos até a disponibilidade), fonte e data.
- **Fonte e lei sempre visíveis** no bloco, no padrão do hero da educação.

## Referências de padrão

- Hero da educação, Story 24.12 (`epics.md`): `apps/web/components/educacao/educacao-hero-section.tsx`, `educacao-textos.tsx`, `educacao-destaques.tsx`, `apps/web/app/[portalSlug]/educacao/view-model.ts`. Barra do mínimo, lei e fonte em destaque.
- Página de saúde atual: `apps/web/app/[portalSlug]/saude/{loader,view-model,page}.ts(x)`. Contratos e queries novos vão em `packages/db/src/queries/` (modelo: `educacao-siope-metrics.ts`).
- Visual: `DESIGN.md` e `EXPERIENCE.md` na raiz, lidos **antes** de mexer em UI (Regra 25). Elemento nu primeiro, sem `slate-*`/`gray-*`, sem `font-mono` fora de `table` e `numeric`.

## Entregas esperadas

1. **`@transparencia/db`:** query tipada do mínimo de saúde por `portal_slug` e ano, com camelCase nos contratos, nomes explícitos (Regra 9, sem abreviações), nulo preservado (nunca zero) e testes de paridade (`make test/ts`, `pnpm typecheck`).
2. **Loader e view-model** em `apps/web/app/[portalSlug]/saude/`: só importam o dado tipado e montam o que a tela mostra. A camada de apresentação é burra (Regra 2); a lógica de comparação, o estado `parcial` e "sem dado" ficam no `@transparencia/db`, não em componente.
3. **Bloco no topo de `/saude`:** pergunta, número, barra com a régua de 15%, rótulo, data, lei e fonte visíveis, "Ver detalhes". Ano em andamento e sem dado tratados. Série de anos fechados com o intervalo calculado dos dados (`${anoMin}–${anoMax}`), sem ano fixo (Regra 23).
4. **Textos** revisados pelo `editor-cidadao`; base legal pelo `jurista-fiscal` com link oficial (Regra 20). Valores e percentual vêm do dado e do seed, nunca de texto fixo.
5. **Checklist multi-tenant:** a tela funciona para outro estado e para histórico de 2017 a 2027 sem exibir dado trocado.

## Fora do escopo

Origem do dinheiro (25.4, inclui o 3.1); emendas da saúde (25.5); produção da rede e fila de espera (25.6); mudanças de dbt, a menos que um campo que a tela precise falte no mart (nesse caso, parar e avisar o Julio).

## Regras que valem

- Regra 15: só Docker local (`localhost:5544`). **Nunca** exportar `DATABASE_URL` do 5544 junto de `db/test/build` ou `pnpm test` (apaga o banco local).
- Regras 2, 9, 10, 20, 23, 25 e 27. Skills de apoio: `editor-cidadao`, `jurista-fiscal`; `contador-publico` se o texto citar a base de cálculo.
- Após alterar: `make test/ts` (ou `pnpm test`) e `pnpm typecheck`. O build de produção fica com a Vercel.
- Commits convencionais em minúsculas, sem referência a story (Regra 19). Não commitar sem pedir ao Julio.
