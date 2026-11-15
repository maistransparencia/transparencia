---
title: 'Reorganização da arquitetura da homepage (dobra de sentinela cívica) e navegação por temas'
type: 'feature'
created: '2026-10-22'
status: 'done'
baseline_revision: '4c74de44dd89ad0694c85473de9d9ae5bcfaad79'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - ../planning-artifacts/ux-designs/handoff-19-3-em-destaque-layout-compacto.md
warnings: []
deferred:
  - summary: >-
      Literais de tenant remanescentes na camada compartilhada e de dados.
    evidence: |-
      resolvePortalSlug/PORTAL_ALIASES retornam porciuncula_prefeitura e natividade_prefeitura; FALLBACK_PORCIUNCULA em metadata.ts carrega brasao-porciuncula.png, RJ e 2021.
    location: >-
      packages/ui/src/utils/nav.ts, packages/db/src/queries/metadata.ts:69
    severity: medium
---

<intent-contract>

## Intent

**Rodada 3 (volta dos cards de Educação e Obras):** em pesquisa com usuários, os cards da versão da branch `dev` — "Educação Básica e Desempenho Escolar" e "Obras Públicas e Investimentos Urbanos" — foram preferidos às linhas compactas da rodada 2. Educação e Obras voltam à apresentação da `dev` (título, ranking e meta do IDEB, mini mapa e demais elementos que esses cards tinham). Farmácia sai da linha compacta e adota o card "Respiro" (opção A do canvas de Sally), com mais espaço interno, assim como o Radar cívico, a reordenação da home, a sidebar, a bottom bar e a remoção de fallbacks de tenant. Esta rodada supera, para Educação e Obras, as decisões da rodada 2 abaixo.

**Rodada 2 (layout compacto):** a dobra da home passa a se chamar "Em destaque" (subtítulo "O que afeta a sua vida agora") e Farmácia, Educação e Obras viram linhas compactas, na mesma família visual do Radar cívico. Referência visual e decisões em `../planning-artifacts/ux-designs/handoff-19-3-em-destaque-layout-compacto.md` (artboards "Compacto — desktop" e "Compacto — mobile" em https://claude.ai/artifact/XwTnH7FXD7k7JHd4KZg9f8). A reordenação da home, a sidebar, a bottom bar e a remoção de fallbacks de tenant da rodada 1 permanecem entregues e não mudam.

**Problema:** os três cards da dobra ocupam muito espaço vertical (cerca de 220px cada), empurram o Radar para baixo e o título "Sentinela cívica" é jargão que o cidadão não reconhece.

**Abordagem:** envolver `FarmaciaResumoCard`, `EducacaoResumoCard` e `ObrasResumoCard` numa seção "Em destaque" e dar a cada um uma apresentação compacta (linha com ícone, título + badge, uma frase de contexto, dado principal e ação), mantendo as props e a lógica de estados existentes. Alinhar a linha do Radar cívico à mesma família compacta. Dados continuam vindos de `loadVisaoGeralData`.

## Boundaries & Constraints

**Always:** Reutilizar os componentes existentes (apresentação compacta por `variant`/prop ou refatoração interna, sem duplicar lógica de estado). Badge "Estoque publicado" na Farmácia. Alvos de toque ≥ 44 px (campos mobile ≥ 48 px, `font-size` 16px). Sem cidade, UF ou ano fixos (Regra 23). Códigos de estado continuam em snake_case no dado; rótulos só na UI. Textos cidadãos sem jargão. A linha some quando não há dado; zero só aparece quando a fonte existe e vale zero. Estado neutro quando a lista ficar vazia. Mapa mini, ranking e meta do IDEB saem da linha compacta e permanecem nas páginas temáticas.

**Never:** Alterar `loader.ts`/camada de dados; mexer em 19.4 (saúde fiscal); renomear `farmacia-sus-sentinela-banner` ou a feature da Lei 14.654 (é outro conceito, só a seção da home muda de nome); literais de município/slug/UF/ano; mostrar "0" para fonte indisponível; borda lateral colorida ou emoji nos cards.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Farmácia conforme | `status: conforme` | Linha com badge "Estoque publicado" e busca inline | — |
| Farmácia apagão | `status: apagao` | Linha âmbar, badge "Sem informação de estoque", ação "Ver detalhes", sem campo de busca | — |
| Farmácia indisponível | `status: indisponivel` | Linha não renderiza | — |
| Educação com IDEB | `resumoEducacao` com nota | Linha com badge "IDEB {ano}", `{antes} → {depois}` quando houver evolução, ação "Ver Educação" | — |
| Sem IDEB | `resumoEducacao: null` | Linha não renderiza | — |
| Obras em alerta | N > 0 paralisadas | Badge "Alerta", `{n} obras · R$ {valor} parados`, ação "Ver mapa" | — |
| Obras em dia / sem obras | N = 0 com obras; total = 0 | Badge "Em dia" ou "Sem obras registradas", sem "0" enganoso | — |
| Obras indisponível | `resumoObras: null` | Linha não renderiza | — |
| Nada a destacar | as três linhas ausentes | Seção "Em destaque" não renderiza (sem título órfão) | — |

</intent-contract>

## Code Map

- `apps/web/app/[portalSlug]/page.tsx:62-85` -- três cards seguidos, sem seção; envolver numa `<section aria-labelledby>` "Em destaque" que só renderiza se ao menos uma linha existir
- `apps/web/components/farmacia/farmacia-resumo-card.tsx` -- estados conforme/apagao/indisponivel (indisponivel retorna null); reaproveitar `FarmaciaBuscaForm`
- `apps/web/components/educacao-resumo-card.tsx` -- `EducacaoResumoCardData` (notaIdebTexto, evolucaoTexto, notaAnteriorTexto, enfaseTom); 240 linhas, tem ranking/meta a remover da versão compacta
- `apps/web/components/obras-resumo-card.tsx` -- `ObrasResumoCardProps` com `markers`/`center` (mini mapa) a omitir no compacto; 436 linhas
- `apps/web/components/radar-civico-feed.tsx` -- alinhar a linha ao padrão compacto (badge de severidade, texto, "Entender →")
- specs correspondentes `*.spec.tsx` de cada componente e `page.spec.tsx`

## Tasks & Acceptance

**Execution:**
- `farmacia-resumo-card.tsx`, `educacao-resumo-card.tsx`, `obras-resumo-card.tsx` -- apresentação compacta conforme handoff, preservando lógica e estados
- `radar-civico-feed.tsx` -- linhas compactas na mesma família
- `page.tsx` -- seção "Em destaque" com subtítulo, ocultando-se quando vazia
- specs -- cobrir cada linha da matriz de borda

**Acceptance Criteria:**
- Given uma home com os três dados, when renderizada, then há a seção "Em destaque" com três linhas compactas (Farmácia, Educação, Obras) antes do Radar cívico, e a palavra "Sentinela cívica" não aparece.
- Given Farmácia em `apagao`, when renderizada, then a linha mostra o aviso e "Ver detalhes" e não mostra campo de busca.
- Given `resumoObras: null`, `resumoEducacao: null` e Farmácia `indisponivel`, when renderizada, then a seção "Em destaque" não existe.
- Given viewport mobile, when renderizada, then cada linha empilha em 2 ou 3 níveis sem rolagem horizontal e com alvos ≥ 44 px.
- Given `grep -rn "Sentinela cívica" apps/web packages/ui` em código não-teste, then não há ocorrências.

## Spec Change Log

- 2026-10-22: rodada 3 reabre a story `done` por decisão do usuário após pesquisa com usuários: `EducacaoResumoCard` e `ObrasResumoCard` voltam à versão da `dev` (títulos "Educação Básica e Desempenho Escolar" e "Obras Públicas e Investimentos Urbanos"); Farmácia e Radar permanecem compactos. Restrições "Mapa mini, ranking e meta do IDEB saem da linha compacta" e linhas de Educação/Obras da matriz I/O deixam de valer para esses dois cards.
- 2026-10-22: rodada 2 abre a story `done` para o layout compacto "Em destaque" (decisão do usuário, handoff UX de 2026-10-22).

## Review Triage Log

### 2026-10-22 — Review pass (rodada 2, layout compacto)
- verdicts: 46 achados agrupados por causa raiz (Blind 10, Edge 18, Verification Gap 3 + 5 outros, Intent 5 divergências descritivas) — medium 6, low 10, false 3, maybe-false 0
- findings:
  - `[medium]` `[patch]` título "Obras paralisadas" com badge "Em dia"/"Sem obras" — título agora depende do tom
  - `[medium]` `[patch]` título "Conquista da Educação" com IDEB em queda — título "Educação" no tom atenção; contexto cita INEP (fonte perdida)
  - `[medium]` `[patch]` Educação com nota "—" renderizava linha e abria a seção — predicado `temEducacaoDestaque` usado no card e na página
  - `[low]` `[patch]` seta sem texto para leitor de tela; `obrasMiniMapMarkers`/`obrasMapCenter` sem uso; classes fora da ordem do biome — corrigidos
  - `[medium]` `[patch]` lacunas de teste (campo `notaAnteriorValorTexto`, tons, "moderado", clique do Radar, linhas parciais, asserções fracas) — testes adicionados
  - `[false]` `[reject]` "Sem obras registradas" não deveria aparecer em destaque — a matriz do spec prevê a linha neutra
  - `[false]` `[reject]` badge "Em conformidade" afirma conclusão legal — decisão do usuário; citação da Lei 14.654/2023 vem da 19.1
  - `[false]` `[reject]` tom âmbar do IDEB invertido — segue o mockup aprovado
  - `[low]` `[reject]` perda de WhatsApp/carrossel no Radar da home, Radar sem `DestaqueLinha`, `from` da telemetria, id duplicado do input, status desconhecido, `section` aninhada, `5,9 → 5,9`, `moderado` como "Baixa" — decisão de desenho, pré-existente ou cosmético; "moderado" ganhou teste


### 2026-10-22 — Review pass
- verdicts: 33 findings — high 0, medium 2, low 6, false 5, maybe-false 0 (demais itens duplicados agrupados nas linhas abaixo; cada achado de cada camada mapeado a uma linha)
- findings:
  - `[medium]` `[patch]` teste da home sem assertiva / sem IDEB nulo / ordem do radar não fixada (Blind, Gap, Edge) — spec reescrita com asserções de estado neutro e ordem Farmácia→Educação→Obras→radar→pipeline
  - `[medium]` `[patch]` fallback neutro de brasão da landing e redirect legado multi-portal sem teste (Blind, Gap, Edge) — testes adicionados em `page.spec.tsx`
  - `[low]` `[patch]` `buildTemasNavItems` sem spec; teste "sem slug" ausente; fixture `porciuncula_prefeitura`; teste de sidebar sem checar ícone/img — testes adicionados
  - `[false]` `[reject]` `isTabActive` sem slug casa qualquer rota (Edge) — com prefixo vazio só casa o próprio caminho da aba; coberto por novo teste
  - `[false]` `[reject]` grupo "Administrativo"/"Temas" pode estar recolhido (Edge, Intent) — sidebar não tem estado de colapso; grupos sempre renderizados abertos
  - `[false]` `[reject]` Previdência escapar como aba / ids como `string[]` / allow-list dupla (Blind, Edge) — Previdência excluída por construção; tipagem de união é cosmética
  - `[false]` `[reject]` ordem Educação/Saúde alterada na sidebar (Edge) — ordem Saúde, Educação, Obras é a pretendida pela spec
  - `[false]` `[reject]` toque 44px vs 48px (Intent) — spec exige ≥ 44 px
  - `[low]` `[reject]` perda de landmark "Indicadores Sociais", onError de img na landing, prefixo `/obras-x`, `/undefined` na sidebar sem slug (Blind, Edge) — pré-existentes ou cosméticos, correção exigiria nova complexidade
  - `[medium]` `[defer]` `resolvePortalSlug`/`PORTAL_ALIASES` em `packages/ui/src/utils/nav.ts` e `FALLBACK_PORCIUNCULA` em `packages/db/src/queries/metadata.ts` ainda têm literais de tenant (Edge, Intent) — pré-existente, fora do diff
  - `[low]` `[defer]` "Mais" sem lista dos demais temas (Intent) — a spec define Mais como menu lateral existente

## Verification

**Commands:**
- `pnpm --filter @transparencia/web test` -- expected: verde
- `pnpm --filter @transparencia/ui test` -- expected: verde (se houver specs)
- `pnpm build` -- expected: tipagem ok

## Rodada 3 — Ajustes pendentes (a implementar)

**Referência:** restaurar de `dev` os arquivos `apps/web/components/educacao-resumo-card.tsx` e `obras-resumo-card.tsx` (e respectivos `.spec.tsx`), reaplicando só o que a rodada 1 e as regras vigentes exigem (Regra 23: sem cidade, UF ou ano fixos; links via constantes de `fontes-oficiais`/`legislacao` quando a `dev` tiver literais).

**Aceite:**
- Given uma home com Educação e Obras, when renderizada, then aparecem os cards com títulos "Educação Básica e Desempenho Escolar" e "Obras Públicas e Investimentos Urbanos", com o conteúdo da `dev` (ranking/meta do IDEB, mini mapa de obras).
- Given Educação ou Obras sem dado (`null`), when renderizada, then o card não renderiza e os estados neutros da rodada 2 continuam valendo; a ordem Farmácia → Educação → Obras → Radar → saúde fiscal é mantida.
- Given Farmácia, Radar cívico, sidebar e bottom bar, then permanecem como na rodada 2.
- `page.spec.tsx` e specs dos cards cobrem os títulos restaurados; `DestaqueLinha` continua usado por Farmácia e Radar (remover só o que ficar sem uso).

**Decisão (Julio):** os cards completos de Educação e Obras ficam dentro da seção "Em destaque", ao lado da linha da Farmácia.

**Decisão (Julio): Farmácia na opção A "Respiro"** (canvas https://claude.ai/artifact/PgBn1XCVNpF1Ua85d5PNYf). `FarmaciaResumoCard` estado `conforme`: tile de ícone, título + badge "Estoque publicado", frase curta sem link embutido ("Veja se o remédio que você precisa está no estoque da prefeitura."), campo de busca e botão lado a lado no desktop; empilhados no mobile com botão "Buscar no estoque". Alvos ≥ 44 px (campo e botão ≥ 52 px, fonte 16 px). Estado `apagao` e `indisponivel` não mudam.

**Fonte da Farmácia (decisão do Julio, 2026-10-22):** o selo do card `conforme` vira link para a fonte dos dados (`FONTES_OFICIAIS.bnafar`, "BNAFAR/Hórus") e "Estoque publicado" passa para o subtítulo. A URL `https://opendatasus.saude.gov.br/dataset/bnafar-posicao-de-estoque` NÃO FOI VERIFICADA: em teste com `curl`/fetch ela respondeu 302 para a home de `dadosabertos.saude.gov.br`, e os demais endereços não responderam. Mantida por decisão do usuário, que atribui a falha a instabilidade temporária. Pendência: reabrir no navegador e trocar em `apps/web/lib/constants/fontes-oficiais.ts` se continuar fora do ar.

**Fora desta rodada:** as sugestões "Muito procurados" (chips) dependem da story seguinte que formaliza os medicamentos mais procurados. Aqui o layout reserva o espaço, mas os chips não são renderizados; sem dado, a linha não aparece (zero/vazio nunca vira chip fixo, Regra 23: nada de remédio chumbado).

**Aceite adicional (Farmácia):**
- Given Farmácia `conforme`, when renderizada, then não há link "Busque no estoque" dentro da frase e a busca tem campo + botão com alvos ≥ 44 px.
- Given viewport mobile, when renderizada, then campo e botão empilham sem rolagem horizontal.

## Auto Run Result

### Rodada 3

Status: done

**Resumo:** cards de Educação e Obras restaurados da `dev` dentro de "Em destaque" (somem quando o dado é nulo); Farmácia `conforme` no layout Respiro, sem chips; mini mapa de Obras só renderiza com coordenadas (sem centro fixo).

**Arquivos:** `educacao-resumo-card.tsx`, `obras-resumo-card.tsx` (+ specs), `farmacia-resumo-card.tsx`, `farmacia-busca-form.tsx`, `lib/educacao-destaque.ts` (novo), `view-model.tsx`, `page.tsx` e specs.

**Verificação:** web 981 testes, `tsc --noEmit` limpo, `pnpm build` 3/3, biome limpo.

**Riscos residuais:** sem checagem visual em navegador; `DestaqueLinha` segue em Farmácia (apagão) e Radar.

### Rodada 2

Status: done

**Resumo (rodada 2):** seção "Em destaque" com linhas compactas de Farmácia, Educação e Obras (componente `DestaqueLinha`), Radar cívico em linhas e seção oculta quando vazia.

**Arquivos:** `destaque-linha.tsx` (novo), cards de Farmácia, Educação e Obras, `farmacia-busca-form.tsx`, `radar-civico-feed.tsx`, `page.tsx`, `view-model.tsx` e specs.

**Revisão:** patches aplicados (3 medium, 1 low agrupado, 1 de testes); nenhum item adiado; demais rejeitados no log. Follow-up recomendado: false.

**Verificação:** web 957 testes, UI 98 testes, `pnpm build` 3/3, biome limpo.

**Riscos residuais:** alvos de toque e empilhamento mobile verificados só por classes, sem navegador; texto de "Em dia" e "Ver obras" é redação do implementador; WhatsApp e links de base legal saem do Radar da home.

### Rodada 1


Status: done

**Resumo:** home reordenada (header, Farmácia, Educação, Obras, radar, saúde fiscal), sidebar com "Temas" antes de "Administrativo", bottom bar Início/Saúde/Educação/Obras/Mais a partir de `buildTemasNavItems` compartilhada, fallbacks `/brasao-porciuncula.png` e `porciuncula_prefeitura` removidos da sidebar, bottom bar e landing.

**Arquivos:** `page.tsx` (nova ordem), `sidebar.tsx` (grupos, brasão neutro), `nav.ts` (lista de temas), `mobile-bottom-nav.tsx` (abas), `municipal-landing-client.tsx` (ícone neutro; redirect legado só com um portal) e specs correspondentes.

**Revisão:** 3 grupos de patches aplicados (testes), 2 itens adiados, demais rejeitados com justificativa no log. Follow-up recomendado: false.

**Verificação:** web 962 testes, UI 98 testes, `tsc --noEmit` limpo, `pnpm build` 3/3.

**Riscos residuais:** usuários legados em instalações multi-portal deixam de ser redirecionados para um município fixo (agora veem a landing); literais de tenant remanescentes adiados.
