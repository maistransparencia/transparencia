---
title: 'Hierarquia da página de saúde: "para entender" e "para fiscalizar"'
type: 'feature'
created: '2026-11-08'
status: 'ready-for-dev'
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
3. **Eyebrow:** com um único ano mostra só "2026"; com intervalo, `anoMin–anoMax` calculado dos dados (Regra 23).
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
- [ ] Eyebrow de ano único mostra só o ano (rede e produção); teste dos dois casos.
- [ ] População: teste nos dois marts ou queries que trava "ano ou último anterior, marcado como estimada"; produção e rede mostram a mesma nota. Traço só sem população em qualquer ano.
- [ ] Texto do município do estabelecimento nos blocos de produção (e na rede, se aplicável): "feitos na cidade" + aviso curto. Rótulos novos em `docs/glossario-cidadao.md`.
- [ ] Teste de que nenhum bloco existente sumiu (títulos e números iguais; muda posição e estado inicial). Alerta de subexecução continua acima.
- [ ] Atualizar specs de página, `llms.txt`, `llms-full.txt` e `CHANGELOG.md`.
- [ ] Revisão de texto pelo `editor-cidadao`; números dos resumos conferidos pelo `contador-publico`. *(fora da sessão do loop: pessoa na página renderizada, nos dois temas)*

## Guardrails

Regras 9, 23 (sem município, UF ou ano fixos; anos a partir dos dados), 25 (tokens de cor nos dois temas; `font-mono` só em `table` e `numeric`) e 27 (pergunta primeiro; dado derivado diz que é derivado). Checagem: `pnpm test`, `pnpm typecheck`, **sempre contra um banco de teste efêmero ou o local de dev; nunca exportar o `DATABASE_URL` da 5544 junto de `db/test/build` ou `pnpm test`** (apaga o banco local). Sem execução em produção (Regra 15). Commits em Conventional Commits minúsculos, sem story ou task (Regra 19), só quando o Julio pedir.

## Fora do escopo

Procedimentos de diagnóstico (decisão 5); conferência das emendas com a fonte federal (25.5); mudar cálculos do mínimo, da origem dos recursos ou da rede; novos dados ou indicadores; reabrir o texto interno de `EmendasSection`.

## Dependências

25.3, 25.4, 25.6a, 25.6b e 25.6c (todas feitas); 25.9 (feita). Padrão: 24.12 e 24.13.

## Segurança para o bmad-loop

Pode rodar depois dos ajustes abaixo, e só até a revisão. A parte visual e de texto precisa de revisão humana na página renderizada.
