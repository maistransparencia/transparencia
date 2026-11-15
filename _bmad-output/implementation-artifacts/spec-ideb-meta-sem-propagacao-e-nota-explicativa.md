---
title: 'IDEB: remover meta propagada após 2021 e explicar a meta ao cidadão'
type: 'bugfix'
created: '2026-10-17'
status: 'done'
baseline_commit: 'e3fc600b03c6e3faf0573dbe309411845ff0e5d2'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O portal exibe "Meta MEC" para o IDEB de 2023 e 2025, mas o INEP não definiu metas para essas edições. A Nota Informativa do Ideb 2025 diz que "as edições do Ideb 2023 e 2025 não possuem metas estipuladas" e que o ciclo de metas (2007–2021) foi encerrado. O `sync_inep_ideb_seed.py` copia a meta de 2021 para os anos seguintes, o que cria um dado que o MEC nunca publicou, e a tela mostra "Meta Atingida" com base nele. Além disso, o cidadão não entende por que a meta difere entre municípios e entre redes (ex.: Natividade e Porciúncula), e nada na tela explica isso.

**Approach:** (1) Parar de propagar a meta de 2021: `meta_ideb` fica nulo quando o INEP não publica projeção, e `atingiu_meta_flag` fica nulo por consequência. (2) A UI não desenha a linha "Meta MEC" nem o selo "Meta Atingida" quando não há meta, e passa a exibir uma nota explicativa "Como ler a meta do IDEB" com link para a fonte oficial.

**Fonte oficial:** https://download.inep.gov.br/ideb/resultados/nota_informativa_ideb_2025.pdf

## Boundaries & Constraints

**Always:**
- Seguir o AGENTS.md: lógica na camada `@transparencia/db` e dbt; UI apenas renderiza. Nomes sem abreviação, camelCase em TypeScript, sem ternários aninhados (seção 13).
- Os anos sem meta devem ser derivados dos dados (pontos com `metaMec == null`). Não escrever "2023", "2025" ou "2021" fixos em textos ou títulos (seção 23).
- Link externo com `target="_blank"`, `rel="noopener noreferrer"` e ícone `ExternalLink` (seção 20). Reusar helpers e componentes de `packages/ui`; vocabulário padrão do portal (seção 24).
- Atualizar `apps/web/public/llms.txt` e `llms-full.txt` (seção 12), em especial a linha sobre "metas projetadas pelo MEC".
- Regerar o fixture com `make db/fixture/dump` se o seed ou o mart mudarem (seção 21).
- Executar tudo contra o banco local (seção 15).

**Ask First:** Qualquer mudança no schema do mart `fct_educacao_metricas` (colunas novas ou removidas). A intenção é manter as colunas e apenas permitir nulo.

**Never:**
- Manter ou recriar a propagação da meta de 2021 em qualquer camada (Python, dbt, TypeScript ou UI).
- Hard-code de município, UF ou lista de anos.
- Aplicar a nota explicativa com texto específico de um município.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ano com meta do INEP | Município, rede e etapa com `VL_PROJECAO_<ano>` preenchido (ano ≤ 2021) | `meta_ideb` preenchido; `atingiu_meta_flag` calculado como hoje | n/a |
| Ano sem meta | Ano com `VL_PROJECAO_<ano>` ausente ou inexistente na planilha (hoje 2023 e 2025) | `meta_ideb = NULL`, `atingiu_meta_flag = NULL`; sem propagação | Não lançar erro |
| Nota ausente e meta presente | Nota suprimida pelo INEP e meta existente (ex.: Natividade, municipal, anos finais, 2021) | `nota_ideb = NULL`, `meta_ideb` preenchido, `atingiu_meta_flag = NULL` | Comportamento atual preservado |
| Série com pontos mistos | Alguns anos com meta e outros sem | Linha "Meta MEC" desenhada só nos anos com meta, sem interpolar nem estender o último valor | Sem meta em nenhum ponto: esconder a linha e a legenda |
| Selo "Meta Atingida" | `atingiuMeta` nulo ou falso | Selo não é exibido | n/a |
| Nota explicativa | Qualquer portal com dados de IDEB | Exibida sempre; trecho sobre "sem metas" aparece só se algum ano da série não tiver meta, listando esses anos a partir dos dados | n/a |
| Texto da legenda do gráfico | Linha 176: "Comparativo direto com a Meta do MEC..." | Reescrita para não prometer meta onde não existe | n/a |

</frozen-after-approval>

## Code Map

- `elt/scripts/sync_inep_ideb_seed.py:181-190` -- Remover `meta_2021` e o bloco `if meta_ideb is None and ano > 2021`. Remover também o comentário que cita "painel oficial do INEP (Power BI)", que não encontra apoio na nota oficial.
- `elt/tests/test_sync_inep_ideb.py` -- Ajustar/adicionar teste: ano sem `VL_PROJECAO_<ano>` gera `meta_ideb is None`.
- `elt/transform/seeds/seed_inep_ideb.csv` -- Regerar a partir do script. Confirmar que as linhas 2023 e 2025 ficam com `meta_ideb` vazio e que as metas ≤ 2021 não mudam (Porciúncula 3304102 e Natividade 3303104 devem manter os valores da planilha oficial).
- `elt/transform/models/staging/nacional/stg_inep__ideb.sql` e `elt/transform/models/marts/metrics/fct_educacao_metricas.sql:18-41` -- Verificar que o cast e o `case` de `atingiu_meta_flag` já tratam `meta_ideb is null` (tratam). Sem mudança esperada; ajustar `_fct_educacao_metricas.yml` se houver `not_null` sobre `meta_ideb`.
- `packages/db/src/queries/educacao-metrics.ts:78-141,299` -- Confirmar que `metaIdeb` e `atingiuMeta` seguem nulos, e que o merge `primary.metaIdeb ?? secondary?.metaIdeb` não preenche meta de uma rede com a de outra rede quando a principal está nula por falta de meta. Se preencher, corrigir.
- `apps/web/app/[portalSlug]/educacao/view-model.ts:32-38,134-140` -- Expor, a partir da série, a lista de anos sem meta (`anosSemMeta`) e um flag que indique se existe alguma meta na série. Nenhum ano fixo.
- `apps/web/components/educacao/educacao-historico-section.tsx:50-52,135,176-187,258-259` -- Esconder o selo, a linha e a legenda "Meta MEC" quando não há meta; ajustar `description` e texto do comparativo; inserir a nota "Como ler a meta do IDEB".
- `apps/web/public/llms.txt`, `apps/web/public/llms-full.txt` (linha ~323) -- Descrever que as metas existem até o fim do ciclo (2021) e que as edições posteriores não têm metas oficiais.
- Fixtures: `packages/db/tests/fixtures/seed.ts` e `packages/db/tests/fixtures/schema.sql.gz` -- Atualizar o seed de teste com pontos sem meta; rodar `make db/fixture/dump`.

## Texto da nota (aprovado pela análise; ajuste só de forma)

**Título:** Como ler a meta do IDEB

> O MEC/INEP define a meta do IDEB separadamente para cada rede de ensino de cada município, a partir do ponto de partida da rede. Por isso municípios diferentes, e redes diferentes dentro do mesmo município (municipal, estadual e pública, que reúne as duas), têm metas diferentes. Compare a nota sempre com a meta da mesma rede.
>
> O ciclo oficial de metas terminou em 2021. Os resultados de {anosSemMeta} não têm metas definidas pelo INEP e podem ser comparados com os anos anteriores. [Fonte: Nota Informativa do Ideb 2025 ↗]

`{anosSemMeta}` vem dos dados (por exemplo "2023 e 2025"), formatado por helper. Se a lista estiver vazia, omitir o segundo parágrafo.

## Tasks & Acceptance

**Execution:**
- [x] Remover a propagação de meta no script de sync e regerar o seed (`seed_inep_ideb.csv`).
- [x] Teste Python para "ano sem projeção gera meta nula".
- [x] Verificar mart, YAML e query Kysely quanto a nulos e ao `??` entre redes.
- [x] View model: `anosSemMeta` e indicador de existência de meta, com testes.
- [x] UI: esconder selo/linha/legenda sem meta; ajustar textos; adicionar nota com link externo.
- [x] Atualizar `llms.txt` e `llms-full.txt`.
- [x] Atualizar seed de teste TypeScript e regerar fixture.
- [x] Rodar `make test`, `make check`, `make db/fixture/check`, `make test/ts` e `pnpm build`.

**Acceptance Criteria:**
- Dado Porciúncula ou Natividade com IDEB de 2023 e 2025, quando abro a página da Educação, então não vejo "Meta MEC" nem "Meta Atingida" nesses anos, e vejo a nota explicativa com os anos listados a partir dos dados.
- Dado um ano ≤ 2021 com meta publicada, então a meta e o selo "Meta Atingida" continuam como hoje, com os mesmos valores da planilha oficial.
- Dado um portal em que o INEP publique metas novas no futuro, então nenhuma alteração de código é necessária: a meta aparece quando existir no dado.
- Dado qualquer município de qualquer UF, então nenhum texto, ano ou rede fixo aparece na nota.
- `make test`, `make check`, `make db/fixture/check`, `make test/ts` e o build passam.

## Verification

**Commands:**
- `make test` e `make check` -- esperado: passam, incluindo o novo teste do sync.
- `make db/fixture/check` -- esperado: paridade 100%.
- `make test/ts` e `pnpm build` -- esperado: passam.

**Manual checks:**
- No banco local, para `cod_ibge` 3304102 e 3303104: `select ano, rede, etapa_ensino, meta_ideb from fct_educacao_metricas order by 1, 2, 3` mostra meta nula em 2023 e 2025 e valores intactos em 2021 (Porciúncula municipal: 6,4 nos dois ciclos de etapa; Natividade municipal: 5,7 iniciais e 5,2 finais; Natividade pública: 7,0 e 6,5).
- Abrir `/[portalSlug]/educacao` dos dois portais e conferir gráfico, selo e nota.

## Notas para o implementador

- A rede exibida como padrão na tela parece ser a municipal (`view-model.ts:295-330`), mas não foi confirmado qual rede alimenta `metaMec`. Confirmar antes de ajustar o texto.
- Commit em Conventional Commits em minúsculas, sem referência a story/task (seção 19). Exemplo: `fix(elt): parar de propagar meta do ideb de 2021 para edicoes sem meta`.
