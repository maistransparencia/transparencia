---
title: 'Hierarquia da página de educação: "para entender" e "para fiscalizar"'
type: 'feature'
created: '2026-11-04'
status: 'in-review'
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
