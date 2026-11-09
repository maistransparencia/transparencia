---
title: 'Título sem ano e escopo declarado em cada bloco (saúde, educação e previdência)'
type: 'feature'
created: '2026-11-08'
status: 'ready-for-dev'
epic: 25
story: '25.11'
source: '_bmad-output/planning-artifacts/epics.md (### Story 25.11)'
---

## Intent

**Problem:** o título de `/saude`, `/educacao` e `/previdencia` leva o ano selecionado, mas parte dos blocos não é daquele ano (série histórica, rede, produção, retrato atual). O cidadão lê "Saúde 2026" e entende que tudo é de 2026.

**Approach:** só apresentação. Título da página sem ano; cada bloco declara o escopo **no próprio título** (exercício, série histórica ou retrato atual). O seletor global continua como está. Sem mudança em `@transparencia/db`, em queries ou em `?ano=`. Os ACs completos e a tabela do levantamento estão em `epics.md` (Story 25.11); este arquivo guarda decisões, mapa de código e pendências herdadas.

## Decisões do Julio (valem acima de dúvida)

1. **Filtro global mantido.** Não criar seletor por bloco nem grupo "Por exercício".
2. **Escopo no título do bloco**, nunca em nota.
3. **Ano padrão continua o ano atual**, inclusive no mínimo constitucional.
4. **`/obras` fica de fora** (obra é estoque; `?ano=` ali é filtro de lista).
5. Rotas: `/saude`, `/educacao`, `/previdencia`.

## Code Map (verificado em 2026-11-08)

- **Seletor global:** `packages/ui/src/components/sidebar.tsx` (`YearSelect`, desktop na barra lateral e `compact` no cabeçalho mobile), rótulo "Exercício", anos do ano atual até `anoInicial`, sincroniza `?ano=` via `handleExerciceChange`. Fora de `page.tsx`, por isso o `/saude` "não tem seletor" na página (nota da 25.10).
- **Páginas:** `apps/web/app/[portalSlug]/{saude,educacao,previdencia}/page.tsx`; cada uma passa `ano={selectedYear}` aos blocos do exercício e **não passa** aos de série/retrato.
- **Do exercício** (recebem `ano`): hero (mínimo, orçamento), O que entrou, Contratação, Quem recebe, Emendas (`/saude`); hero, Origem dos recursos, Emendas, Contratos (vigentes no ano, `educacao-metrics.ts:954`), Fornecedores (`/educacao`); hero, Entidades, Saldo em caixa, Risco atuarial, Composição dos repasses (`/previdencia`).
- **Série ou retrato** (não recebem `ano`): Como mudou ao longo dos anos, `SaudeRedeSus`, `SaudeProducaoSus`, rede por mil e Farmácia no hero (`/saude`); Aprendizado dos alunos, Como mudou ao longo dos anos (`/educacao`); Patrimônio histórico (`/previdencia`). Tipos inferidos pelas props: confirmar ao codar.
- **Hero de `/saude`:** `apps/web/components/saude-hero-section.tsx` mistura exercício e retrato; separar visualmente.
- **Onde o ano entra no título (verificado em 2026-11-08):** em cada hero, que é **específico da rota** (não compartilhado com outras páginas). `apps/web/components/saude-hero-section.tsx:65,68` (eyebrow `SAÚDE · EXERCÍCIO {ano}` e `<h1>Saúde em {ano}</h1>`); `apps/web/components/educacao/educacao-hero-section.tsx:62,65` (mesmo padrão); `apps/web/components/previdencia-hero-section.tsx:97` (eyebrow `PREVIDÊNCIA MUNICIPAL ({sigla}) · EXERCÍCIO {ano}`) e o `h1` das linhas 107 a 120, que é uma frase de dados com `{ano}` (ler antes de editar: decidir o que é título e o que é resumo do exercício, que pode manter o ano). Os `generateMetadata` das três páginas **não levam o ano** (`createPortalMetadata`), então `<title>` não muda. `/obras` já tem `h1` como pergunta, sem ano (fora de escopo).
- **Imagem de compartilhamento:** `educacao/opengraph-image.tsx` já usa o exercício padrão sem `?ano`; conferir o texto das de `saude` e `educacao`.
- Ler `DESIGN.md` e `EXPERIENCE.md` antes de codar (Regra 25).

## Tasks & Acceptance

- [ ] Título da página sem ano nas três rotas (`<title>`, `h1`, eyebrow); ano só no seletor.
- [ ] Blocos do exercício com o ano no título, do parâmetro ativo; blocos de série com `${anoMin}–${anoMax}` dos dados (um único ano: só ele); blocos de retrato com "hoje" ou "atual" e a data da coleta. Nenhum ano ou intervalo fixo (Regra 23).
- [ ] Hero de `/saude`: separar exercício (mínimo, orçamento) de retrato (rede por mil, Farmácia).
- [ ] **Herdado da 25.10:** ano selecionado sem dado em rede ou produção do SUS não quebra a tela e cai num estado neutro ou no ano mais recente com dado, sem erro. Teste com outro estado e ano inicial 2017 e final 2027 inventados.
- [ ] **Herdado da 25.10:** revisão de texto de `/saude` pelo `editor-cidadao` (títulos, perguntas do hero, rótulos de rede e produção); rótulos novos em `docs/glossario-cidadao.md`.
- [ ] Teste por rota de que nenhum bloco sumiu (só mudou o escopo declarado) e de que todo bloco sem `ano` declara período ou "hoje" no título.
- [ ] Atualizar specs de página, `llms.txt` e `llms-full.txt` (Regra 12: descrever o escopo de cada bloco; ajustar "contra a verba prevista no ano"), `DESIGN.md`, `EXPERIENCE.md` e `CHANGELOG.md`.

## Guardrails

Regras 9, 23 (sem município, UF ou ano fixos), 25 (tokens de cor nos dois temas; `font-mono` só em `table` e `numeric`) e 27 (pergunta primeiro). Checagem: `pnpm test`, `pnpm typecheck`, **sempre contra banco de teste efêmero ou o local de dev; nunca exportar o `DATABASE_URL` da 5544 junto de `db/test/build` ou `pnpm test`** (apaga o banco local). Sem execução em produção (Regra 15). Commits em Conventional Commits minúsculos, sem story ou task (Regra 19), só quando o Julio pedir.

## Fora do escopo

`/obras`; seletor por bloco; mudar o ano padrão; mudar queries ou marts; renomear o rótulo "Exercício" do seletor global; novos dados ou indicadores.

## Dependências

25.10 (concluída). Padrão: 24.12 e 24.13.

## Segurança para o bmad-loop

Pode rodar até a revisão. A parte visual e de texto precisa de revisão humana na página renderizada, nos dois temas.
