---
title: 'Hierarquia da página de saúde: "para entender" e "para fiscalizar"'
type: 'feature'
created: '2026-11-08'
status: 'done'
epic: 25
story: '25.10'
source: '_bmad-output/planning-artifacts/epics.md (### Story 25.10)'
---

## Intent

**Problem:** `/saude` mistura blocos para o cidadão (mínimo, de onde vem o dinheiro, rede e produção do SUS) com material de fiscalização (como o Fundo contrata, fornecedores, emendas), tudo aberto, em ordem de construção e não de pergunta. Os blocos de rede e produção também têm pontas soltas da 25.6c (rótulos, eyebrow, aviso do município do estabelecimento).

**Approach:** repetir a Story 24.13 em `/saude`: topo e blocos-pergunta abertos, depois o bloco **"Para fiscalizar"** com contratação, fornecedores e emendas, cada seção recolhida por padrão com resumo numérico visível. Nenhuma informação sai da página; muda posição, peso e alguns textos. Os ACs ficam abaixo; `epics.md` guarda só o esboço histórico.

## Decisões do Julio (valem acima de dúvida)

1. **Anos sem dado da fonte:** saem do seletor (não mostrar rótulo "sem dado da fonte" em ano vazio). A lista de anos disponíveis vem de `@transparencia/db`.
2. **População:** rede e produção usam o mesmo critério (população do ano ou, sem ela, a do último ano anterior, dita como estimativa). **Verificado em 2026-11-08: os dois marts já fazem isso** (`fct_saude_rede_por_mil_moradores_metricas.sql` e `fct_saude_producao_sus_metricas.sql`, `populacao_estimada`). O traço só aparece se não houver população em nenhum ano. Resta travar com teste e conferir os textos.
3. **Eyebrow:** ~~com um único ano mostra só "2026"; com intervalo, `anoMin–anoMax`~~ **revisto em 2026-11-08: as seções de rede e produção não têm eyebrow de ano** (ele só repetia o ano). Nenhum ano ou intervalo fixo em título (Regra 23).
4. **Município do estabelecimento:** o texto diz "atendimentos e internações **feitos na cidade**", nunca "de moradores". Aviso curto: quem mora numa cidade e se trata em outra não entra na conta da cidade onde mora, e cidades que atendem gente de fora aparecem com números maiores. Mantém a divisão por mil moradores. Texto passa pelo `editor-cidadao`.
5. **Procedimentos de diagnóstico ("exames") ficam fora.** Story própria, depois de medir mais UFs e meses. Não alterar extrator, raw nem mart do SIA aqui.
6. **"Para fiscalizar":** contratação ("Como o Fundo contrata"), fornecedores e emendas (federais e estaduais, no `EmendasSection` como hoje), recolhidos, com resumo numérico visível. As emendas federais continuam vindo do **cadastro de emendas do portal da Prefeitura** (`fct_emendas`); a conferência com a fonte federal (25.5) está `not-planned` e não entra. Não mudar o conteúdo de `EmendasSection`.

## Code Map (verificado em 2026-11-08)

- `apps/web/app/[portalSlug]/saude/page.tsx` -- ordem atual: hero + `SaudeMinimoDestaque` + painel de 4 indicadores (inclui "Emendas na saúde", "Contratos vinculados", "Fornecedores ativos"), alerta de subexecução, "O que entrou" (`SaudeOrigemRecursos`), "Como mudou ao longo dos anos" (inline), `SaudeRedePorMilMoradores`, `SaudeProducaoSus`, `SaudeContratacaoSection`, "Quem recebe o dinheiro da saúde" (inline), `EmendasSection`.
- Nova ordem: topo, alerta, o que entrou, como mudou, rede, produção; **Para fiscalizar**: contratação, fornecedores, emendas.
- `packages/ui/src/components/collapsible-section.tsx` -- `CollapsibleSection` já existe (`id`, `title`, `eyebrow`, `summary`, `defaultOpen`; abre por `#id` e na impressão). Reutilizar; não criar outro.
- `packages/db/src/queries/educacao-fiscalizacao-resumo.ts` -- `resumirFiscalizacaoEducacao`. Criar o equivalente para saúde (`saude-fiscalizacao-resumo.ts`) reaproveitando o que for genérico; resumos calculados aqui, nunca em `page.tsx` (Regra 2/23).
- `apps/web/components/saude/saude-rede-por-mil-moradores.tsx` e `saude-producao-sus.tsx` -- eyebrow `${anoMin}–${anoMax}`, rótulos "sem dado da fonte", aviso de população estimada, texto do município.
- `packages/db/src/queries/saude-rede-por-mil-moradores.ts` e `saude-producao-sus.ts` -- onde sai a lista de anos do seletor (decisão 1) e `anoMin`/`anoMax` (decisão 3).
- `apps/web/components/emendas-section.tsx` -- compartilhado com outras páginas; qualquer ajuste exige teste de regressão nelas.
- `SaudeContratacaoSection` recebe deep link de licitação; conferir que o link abre a seção recolhida (como o `contratoNumero` na educação).
- Ler `DESIGN.md` e `EXPERIENCE.md` antes de codar (Regra 25). O padrão de seção recolhida já está documentado pela 24.13.

## Tasks & Acceptance

- [ ] Resumos de "Para fiscalizar" em `@transparencia/db`, com teste: emendas (quantidade, autorizado, confirmada na receita, empenhado), contratação (licitações e total), fornecedores (quantidade e total pago aos maiores). Mesmos números que as seções mostram hoje.
- [ ] Reordenar `page.tsx` e criar o bloco "Para fiscalizar" (`h2` + frase de para quem serve), cada seção em `CollapsibleSection` com `id` próprio e resumo visível. Deep links (`#id` e licitação) abrem a seção.
- [ ] Ano sem dado sai do seletor nos blocos de rede e produção; ano selecionado sem dado cai no ano mais recente com dado, sem erro. Testes de query e de página (outro estado, ano inicial 2017 e final 2027 inventados no teste).
- [x] ~~Eyebrow de ano único~~ Revisto: rede e produção sem eyebrow de ano; testes ajustados.
- [ ] População: teste nos dois marts ou queries que trava "ano ou último anterior, marcado como estimada"; produção e rede mostram a mesma nota. Traço só sem população em qualquer ano.
- [ ] Texto do município do estabelecimento nos blocos de produção (e na rede, se aplicável): "feitos na cidade" + aviso curto. Rótulos novos em `docs/glossario-cidadao.md`.
- [ ] Teste de que nenhum bloco existente sumiu (títulos e números iguais; muda posição e estado inicial). Alerta de subexecução continua acima.
- [ ] Atualizar specs de página, `llms.txt`, `llms-full.txt` e `CHANGELOG.md`.
- [ ] Revisão de texto pelo `editor-cidadao` **(movida para a 25.11)**; números dos resumos conferidos pelo `contador-publico`. *(fora da sessão do loop: pessoa na página renderizada, nos dois temas)*

## Decisões da revisão (2026-11-08)

1. **Pergunta visível:** cada bloco do topo mostra a pergunta do cidadão em `h2` (o eyebrow fica como rótulo do assunto). Feito, com teste em `page.spec.tsx`.
2. **Indicadores que saíram do painel:** "Contratos vinculados" e "Fornecedores ativos" voltaram como resumo de "Como o Fundo contrata" e de fornecedores. "Medicamentos e insumos" fica fora do topo (a Farmácia SUS responde "tem o remédio?"); a retirada entra no CHANGELOG.
3. **Resumo de emendas:** usa o mesmo total do "O que entrou" (`emendasTotal`, com o fallback do arrecadado), para as duas telas não divergirem. Sem fornecedores, o resumo diz que não há pagamento registrado.
4. **Escopo:** `primeira_competencia_ambulatorial` e `primeira_competencia_internacoes` são colunas aditivas no mart de métricas de produção (`fct_saude_producao_sus_metricas`), sem alterar o SIA, para a tela não deduzir o período. A 25.10 antecipou parte do topo da 25.11; a 25.11 não refaz.
5. **Seletor de ano e fallback para o ano mais recente:** /saude não tem seletor de ano hoje e o ano vem de `?ano=` (padrão: ano corrente). Fica para a 25.11 ("título sem ano e seletor por bloco"); não é regressão da 25.10.

### Ajustes após a revisão visual (2026-11-08)

- Hero: perguntas em `h3` (sem eyebrow), mais curtas: "A Prefeitura aplica o mínimo em saúde?", "De onde vem o dinheiro da saúde?", "Quantos leitos e profissionais o SUS tem?", "Tem o meu remédio na Farmácia SUS?".
- Produção do SUS: a média de internações por mês é sempre exibida, mesmo com poucos meses (o período aparece na nota e no subtítulo); média abaixo de 1 aparece como "menos de 1".
- Produção do SUS: o modal "Detalhes" não usa mais "por mil moradores" nem a nota de população; a tabela por ano ficou com atendimentos e internações. A rede do SUS ainda tem "por mil moradores" no seu "Ver detalhes" e o DTO/mart seguem calculando o por mil (a decidir).
- "Ver todas as licitações" passou para depois da lista de caminhos de contratação, em tamanho de apoio.
- Conferência visual (mobile e desktop, claro e escuro): ok, feita pelo Julio.

## Guardrails

Regras 9, 23 (sem município, UF ou ano fixos; anos a partir dos dados), 25 (tokens de cor nos dois temas; `font-mono` só em `table` e `numeric`) e 27 (pergunta primeiro; dado derivado diz que é derivado). Checagem: `pnpm test`, `pnpm typecheck`, **sempre contra um banco de teste efêmero ou o local de dev; nunca exportar o `DATABASE_URL` da 5544 junto de `db/test/build` ou `pnpm test`** (apaga o banco local). Sem execução em produção (Regra 15). Commits em Conventional Commits minúsculos, sem story ou task (Regra 19), só quando o Julio pedir.

## Fora do escopo

Procedimentos de diagnóstico (decisão 5); conferência das emendas com a fonte federal (25.5); mudar cálculos do mínimo, da origem dos recursos ou da rede; novos dados ou indicadores; reabrir o texto interno de `EmendasSection`. Régua externa (mediana das cidades da UF) para a produção do SUS: registrada em `deferred-work.md`.

## Dependências

25.3, 25.4, 25.6a, 25.6b e 25.6c (todas feitas); 25.9 (feita). Padrão: 24.12 e 24.13.

## Segurança para o bmad-loop

Pode rodar depois dos ajustes abaixo, e só até a revisão. A parte visual e de texto precisa de revisão humana na página renderizada.
