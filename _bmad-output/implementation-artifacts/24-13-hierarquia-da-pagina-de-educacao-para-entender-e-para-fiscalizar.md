---
title: 'Hierarquia da página de educação: "para entender" e "para fiscalizar"'
type: 'feature'
created: '2026-11-04'
status: 'done'
baseline_commit: '2cd14c7f92d276051d9179af3137a676ee32c749'
epic: 24
story: '24.13'
source: '_bmad-output/planning-artifacts/epics.md (### Story 24.13)'
---

## Intent

**Problem:** a página de educação mistura seções para o cidadão (aprendizado, de onde vem, como mudou) com material de fiscalização (emendas, contratos, fornecedores), todas abertas, e repete a ressalva do ano em andamento.

**Approach:** nova ordem topo → aprendizado → o que entrou → como mudou → bloco "Para fiscalizar" (emendas, Como o Fundo contrata, contratos, fornecedores), cada seção recolhida por padrão com resumo numérico visível, linha de âncoras no topo e ressalva de ano parcial dita uma vez. Os ACs completos estão no `epics.md`; esta story não os repete.

## Decisões do Julio (valem acima de dúvida)

- Nenhuma informação sai da página: muda só posição e peso.
- "Reservado", "liquidado" e "pago" não mudam; "entregue" não substitui "liquidado".
- Item 4 do deferred-work da 24.12 (estados de `EmendasSection`) fica como está.

## Code Map (verificado em 2026-11-04)

- `apps/web/app/[portalSlug]/educacao/page.tsx:83-177` -- ordem atual: hero, aprendizado, emendas (condicional a `emendas.lista.length > 0`), origem dos recursos, "Como mudou" (inline), contratos, fornecedores (inline). Reordenar aqui e extrair "Como mudou" e fornecedores só se necessário.
- `apps/web/components/educacao/educacao-aprendizado-section.tsx:179` -- `id="aprendizado"`.
- `apps/web/components/educacao/educacao-origem-recursos-section.tsx:107` -- `id="origem-recursos-educacao"`.
- `apps/web/components/educacao/educacao-contratos-section.tsx:160` -- `id="contratos-educacao"`; recebe `initialContratoNumero` (deep link `?contratoNumero=` deve abrir a seção recolhida).
- `apps/web/components/emendas-section.tsx` -- compartilhado com outras páginas; encurtar o aviso "O dinheiro das emendas chegou?" exige teste de regressão nas outras páginas.
- `apps/web/components/educacao/educacao-hero-section.tsx` e `educacao-tres-respostas-section.tsx` -- `eyebrow` do topo, onde a ressalva de ano parcial passa a viver.
- `apps/web/components/educacao/educacao-textos.tsx`, `educacao-destaques.tsx`, `fonte-recurso-modal.tsx`, `valor-por-aluno-modal.tsx` -- repetições de "parcial"/"ano em andamento" e siglas (PNAE, PNATE) a tratar.
- Resumos numéricos (contagem de contratos, total autorizado em emendas, total pago a fornecedores): calcular em `packages/db/src/queries/`, nunca no componente (Regra 2/23).
- Não existe componente de recolhimento em `packages/ui` hoje: criar um (`details`/`summary`) seguindo `DESIGN.md`/`EXPERIENCE.md`; ler ambos antes (Regra 25). Adicionar o padrão de "seção recolhida" e a linha de âncoras ao `EXPERIENCE.md`.

## Tasks & Acceptance

- [x] Ler `DESIGN.md` e `EXPERIENCE.md`; definir e documentar o padrão de seção recolhida e da linha de âncoras.
- [x] Componente de seção recolhida em `packages/ui`: `details`/`summary`, teclado e leitor de tela, abre na âncora (hash e `contratoNumero`), abre tudo na impressão.
- [x] Resumos numéricos por seção calculados em `@transparencia/db` (com teste), exibidos mesmo recolhida.
- [x] Reordenar `page.tsx` e criar o bloco "Para fiscalizar" (`h2` + frase de para quem serve); âncoras só das seções existentes.
- [x] Ressalva de ano em andamento dita uma vez perto do `eyebrow`; rótulo curto "parcial" nos demais; manter a frase onde muda o sentido (veredito suspenso do mínimo, IDEB do ano em curso).
- [x] Encurtar o aviso de `EmendasSection` sem perder autorizado/contemplado/empenhado e onde conferir; teste de regressão nas outras páginas.
- [x] Siglas: nome comum primeiro ("merenda escolar (PNAE)", "transporte escolar (PNATE)"); sigla e lei ficam em "Ver detalhes" e em "Leis:".
- [x] Teste de que nenhum bloco da 24.12 sumiu (mesmos títulos e números; muda só posição e estado inicial).
- [x] Atualizar specs de página, `llms.txt`, `llms-full.txt` e `CHANGELOG.md`.
- [ ] Revisão de texto pelo `editor-cidadao`; conferência de dados (Mary) e do `contador-publico` nos números dos resumos. *(pendente: fora desta sessão)*

## Guardrails

Regras 9, 13, 23 (sem tenant, UF ou ano fixos; anos a partir dos dados), 25 (tokens de cor nos dois temas; mono só em `table` e `numeric`). Checagem: `pnpm test`, `pnpm typecheck`. Sem execução em banco de produção (Regra 15). Commits em Conventional Commits minúsculos, sem referência a story ou task (Regra 19), e só quando o Julio pedir.

## Fora do escopo

Renomear estágios da despesa; novos dados ou indicadores; mudar cálculos das 24.4 a 24.10; estender o padrão a `/saude`; teste de usabilidade com cidadãos.

> Nota: a linha de âncoras do topo foi removida a pedido do Julio (2026-11-04); os ids das seções continuam servindo de âncora por URL.

> Reaberta em 2026-11-04 a pedido do Julio: o topo da página passa a ser uma sequência de blocos-pergunta (Fundeb, alunos e valor por aluno, para onde foi o dinheiro em três barras) e ganha um resumo de emendas (autorizado, confirmada na receita, empenhado no cadastro; sem "sem destino definido"). Supera a decisão anterior de manter o Fundeb só em texto, sem barra.

### Review Findings

Revisão de 2026-11-04 (diff 2cd14c7f..HEAD, 12 commits). Camadas: Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor.

- [x] [Review][Patch] Decidido pelo Julio: aceitar a remoção do subtítulo com o total da categoria (modal de contratos) e da frase de ano parcial (modal de valor por aluno); ajustar o texto do CHANGELOG, que diz "Nenhuma informação saiu da página". [CHANGELOG.md]
- [x] [Review][Patch] Decidido pelo Julio: criar o número do resumo recolhido de "Como o Fundo contrata" (por exemplo, categorias e total contratado) em `resumirFiscalizacaoEducacao`, e usá-lo em `page.tsx`. [packages/db/src/queries/educacao-fiscalizacao-resumo.ts]
- [x] [Review][Patch] Link "Ver emendas" não reabre a seção fechada de novo: o hash não muda, então não há `hashchange`. Tratar o clique em links `#id` ou reabrir no clique. [packages/ui/src/components/collapsible-section.tsx:38-47]
- [x] [Review][Patch] Teste vácuo "a ressalva … aparece no máximo uma vez": busca a frase "não devem ser comparados com anos", que não existe mais; o hero diz "não dá para compará-los com anos já fechados". Contar o texto real. [apps/web/app/[portalSlug]/educacao/page.spec.tsx:981]
- [x] [Review][Patch] Faltam testes: página com emendas (resumo no topo, `#emendas-educacao` fechado dentro de "Para fiscalizar"); `hashchange` no `CollapsibleSection`; `nota={null}` vs padrão em `DespesasFornecedoresSection`; a tarefa "nenhum bloco da 24.12 sumiu" só confere títulos.
- [x] [Review][Patch] Textos de `llms.txt`/`llms-full.txt` e do CHANGELOG ficaram contraditórios com a página nova: Fundeb "só texto", pergunta "Quanto a Prefeitura gastou em educação?", "Uma única linha Leis … Fonte" e "Leis e fontes numa linha só". [apps/web/public/llms-full.txt:343, CHANGELOG.md:12]
- [x] [Review][Patch] Resumos montados em `page.tsx` (`pluralizar`, `resumoEmendas`, `resumoContratos`, `resumoFornecedores`), contra `EXPERIENCE.md` ("calculado em `@transparencia/db`") e a Regra 2. [apps/web/app/[portalSlug]/educacao/page.tsx]
- [x] [Review][Patch] Barra de alunos usa `ok-fill` (verde, cor de status) para ensino fundamental, categoria neutra. [apps/web/components/educacao/educacao-indicadores-apoio.tsx]
- [x] [Review][Defer] `h2` dentro de `summary` (papel de botão): leitores de tela podem achatar o cabeçalho e quebrar a navegação por títulos — deferred: confirmar com VoiceOver/NVDA antes de decidir; jsdom não prova.
- [x] [Review][Defer] Aviso das emendas perdeu "pode estar desatualizado" (agora "sem registro, aparece zero") — deferred: depende da revisão pendente do editor-cidadao e do contador-publico.
- [x] [Review][Defer] Resumo de fornecedores usa `viewModel.topFornecedores`, enquanto o corpo usa `fornecedoresLinhas` — deferred: conferir se os dois arrays são os mesmos.
- [x] [Review][Defer] Fundeb em ano parcial mostra barra e marcador do mínimo, o que pode induzir veredito — deferred: conferir o retorno de `tomDoResultado` no ano em andamento.
- [x] [Review][Defer] `apps/storybook/scripts/dev.mjs` (porta livre) fora do escopo da story; sem tratamento de erro/sinal; story do Storybook copia o markup em vez de importar `CollapsibleSection` — deferred: baixa gravidade, sem relação com os ACs.

#### Rejected

- Mês de referência de "O que entrou" e período parcial: `false` para o hero (a legenda ainda mostra "PARCIAL, {período}"); o mês só no modal foi decisão do Julio.
- Linha de âncoras removida, nota "preço foi justo" removida, cards e categorias ordenados por valor, "entregue/liquidado": decisões do Julio.
- Atualizar Tasks e ACs da story/epics: corrigiria a própria spec em revisão.
- `beforeprint`/`afterprint` (flush e restauração): `low` ou sem efeito demonstrado, correção exigiria complexidade.
- `summary` sem `id` em `SectionWithHeader`, `ariaLabel` não repassado, `defaultOpen` lido uma vez: `low`, sem caso real hoje.
- Percentual de emendas acima de 100% e autorizado zero: caso decidido (sem limite) ou improvável.
- Estilo cru de utilitários e `partialPeriod` sem uso na interface: `low`, sem dano nomeado.
