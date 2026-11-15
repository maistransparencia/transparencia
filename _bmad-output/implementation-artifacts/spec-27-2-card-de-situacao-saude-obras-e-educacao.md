---
status: done
date: 2026-11-09
baseline_revision: aa26ee4c
followup_review_recommended: false
---

# Story 27.2: Card de situação (saúde, obras e educação)

## Intenção

A home abre, depois do hero, com a seção "Como está a cidade hoje": um card por área (Saúde, Obras, Educação, nesta ordem), cada um com a pergunta do cidadão, a resposta curta, a nota de origem, "Ver detalhes" e "Compartilhar". Usa só os dados da Story 27.1.

## Code Map

- `apps/web/lib/situacao-cidade.ts`: `buildSituacaoCidadeCards` (função pura) monta o modelo de cada card: manchete, complemento, linha de apoio do mínimo legal, motivo da etiqueta e texto de compartilhar (período e fonte). Área sem dado não gera card.
- `apps/web/components/situacao-cidade-section.tsx`: renderiza a seção e os cards (`panel panel-top`), busca de remédio, apagão com Lei 14.654/2023 e ações cívicas, barra e mini mapa de obras, linha do mínimo com link da lei.
- `apps/web/app/[portalSlug]/page.tsx`: troca a seção "Em destaque" por `SituacaoCidadeSection`; `view-model.tsx` ganha `saudeDetailUrl`.
- `apps/web/public/llms.txt` e `llms-full.txt`: descrição da nova seção (Regra 12).

## Decisões

- Farmácia `indisponivel` (ponto "a decidir com o Julio"): adotada a proposta da story. O mínimo de saúde vira a manchete única; sem mínimo, o card some. Rever se o Julio decidir outra coisa.
- Grade: 3 colunas no desktop com 3 cards, 2 com 2 cards, 1 abaixo do breakpoint; nunca 2+1.
- Os componentes antigos (`FarmaciaResumoCard`, `ObrasResumoCard`, `EducacaoResumoCard`, `DestaqueLinha`) ficam no repositório, sem uso na home; a remoção de blocos é da Story 27.3.

## Aceitação (resumo)

- Given a home, When carrega, Then a seção mostra os cards na ordem fixa, com etiqueta "Merece atenção" só quando `emAtencao` e sempre com o motivo escrito.
- Then os estados `parcial`, `abaixo`, `sem_dado`, apagão, farmácia `indisponivel`, cidade sem obras e sem Ideb seguem o canvas (testes em `situacao-cidade.spec.ts` e `page.spec.tsx`).

## Verificação

`pnpm typecheck` e `pnpm vitest run` em `apps/web` passam (174 arquivos, 1784 testes). `biome check` sem erros.

## Auto Run Result

Status: done

- Mudança: seção "Como está a cidade hoje" com três cards de situação, no lugar de "Em destaque".
- Revisão: feita em linha pelo agente principal sobre o diff, sem subagentes, por força do CLAUDE.md §3 (custo de tokens). Nenhum defeito real encontrado; o aviso de ordenação de classes do Biome é só estético (correção só com `--unsafe`), rejeitado.
- Follow-up recomendado: false.
- Risco residual: a decisão da farmácia `indisponivel` segue a proposta e não foi confirmada com o Julio; o texto dos cards não passou pelo `editor-cidadao` nem pelo `jurista-fiscal`; sem verificação visual no navegador (mobile e altura igual dos cards).
