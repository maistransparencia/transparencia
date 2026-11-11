---
title: 'Três respostas no topo da página de educação'
type: 'feature'
created: '2026-11-02'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
warnings: []
deferred: []
---

## Intent

**Problem:** a página de educação abria pelo hero financeiro (reservado, liquidado e pago), não pelas perguntas do cidadão.

**Approach:** faixa de três respostas no topo (mínimo exigido, valor por aluno, aprendizado), detalhes na mesma ordem, hero financeiro vira memória de cálculo em "Ver detalhes" e as seções de especialista descem para o fim.

## Code Map

- `apps/web/app/[portalSlug]/educacao/page.tsx` -- nova ordem: hero, faixa, mínimo, valor por aluno, aprendizado, emendas e contratos, especialista.
- `apps/web/components/educacao/educacao-tres-respostas-section.tsx` -- faixa com número e régua de cada resposta.
- `apps/web/components/educacao/educacao-memoria-calculo.tsx` -- reservado, liquidado e pago em modal.
- `apps/web/components/educacao/educacao-hero-section.tsx` -- só título e texto de abertura.

## Tasks & Acceptance

- [x] Faixa, memória de cálculo, reordenação, âncoras `#minimo-exigido`, `#valor-por-aluno`, `#aprendizado`.
- [x] Textos do SIOPE reescritos: "enviou ao FNDE pelo SIOPE ... e que o FNDE publica; o portal mostra o número como foi publicado" (substitui "não conferido por este portal", a pedido do Julio).
- [x] `page.spec.tsx`, `llms.txt`, `llms-full.txt` e CHANGELOG atualizados.
- [x] Revisão multi-lente executada em 2026-11-02 (ver Review Triage Log). Revisão pelo `editor-cidadao` não executada.

## Review Triage Log

### 2026-11-02 — Review pass
- verdicts: 31 findings — high 0, medium 6, low 6, false 2, maybe-false 0 (agrupados por causa raiz; 17 linhas de achados repetidos entre camadas contadas uma vez)
- findings:
  - `[medium]` `[patch]` llms-full.txt com bullets da Saúde e segundo título 1.7.1 colados na Educação (Blind, Edge, Gap) — bloco duplicado removido.
  - `[medium]` `[patch]` llms-full.txt/llms.txt/CHANGELOG com texto defasado ("hero continua no topo", "logo abaixo do hero", Cabeçalho antigo, entrada "(substituído)") — textos atualizados ou removidos.
  - `[medium]` `[patch]` faixa de três respostas sem teste de valores, régua e âncoras (Gap) — criado `educacao-tres-respostas-section.spec.tsx`.
  - `[medium]` `[patch]` memória de cálculo sem teste (Gap) — criado `educacao-memoria-calculo.spec.tsx`.
  - `[low]` `[patch]` IDEB mostrava nota com nota "sem nota apurada" quando `anoApuracao` nulo (Edge) — valor agora mostra "—" nos dois casos.
  - `[low]` `[patch]` botão "Ver detalhes" sem nome acessível distinto (Blind, Edge) — `aria-label` e `aria-haspopup` adicionados.
  - `[medium]` `[reject]` estado sem despesas some do topo (Blind, Edge) — o modal mostra "—" e "sem despesas registradas"; o topo agora responde só às três perguntas, conforme a abordagem do spec.
  - `[low]` `[reject]` faixa usa só Anos Iniciais (Blind, Edge, Intent) — o rótulo "Anos iniciais" aparece na régua; decisão herdada da página, fora da intenção.
  - `[low]` `[reject]` âncoras podem não existir (Edge, Gap) — `page.tsx` renderiza as três seções incondicionalmente; ids existem nos componentes.
  - `[low]` `[reject]` "em 2025" em ano parcial sem período (Edge) — a régua já diz "ano em andamento"; caso inalcançável com período nulo.
  - `[low]` `[reject]` nominal vs. real no valor por aluno, SIOPE reescrito, descrição de metadata, "Ver o detalhe" repetido, emendas acima das seções de especialista, Fundeb fora da faixa — texto SIOPE foi pedido pelo usuário; os demais são preferência de copy sem dano demonstrado ou fora da intenção.
  - `[false]` `[reject]` modal só renderiza aberto e some do HTML do servidor — o conteúdo é detalhe de especialista, atrás de "Ver detalhes" por desenho.
  - `[false]` `[reject]` régua ausente no valor por aluno sem ano anterior — a nota diz "sem ano anterior fechado para comparar", o que é a régua possível.

## Auto Run Result

Status: done
Resumo: faixa de três respostas no topo, detalhes na mesma ordem, hero financeiro em memória de cálculo e seções de especialista no fim (commit 0fb19725); esta passada de revisão corrigiu documentação e cobertura.
Arquivos alterados nesta passada: `llms-full.txt` (bloco duplicado removido), `llms.txt`, `CHANGELOG.md`, `educacao-tres-respostas-section.tsx` (valor do IDEB), `educacao-memoria-calculo.tsx` (acessibilidade), dois specs novos.
Follow-up recomendado: false (nenhum patch `high`).
Verificação: `vitest` de `components/educacao` e `app/[portalSlug]/educacao` (92 testes) e `tsc --noEmit` passam.
Riscos residuais: `editor-cidadao` não revisou os textos; a faixa mostra só Anos Iniciais.
