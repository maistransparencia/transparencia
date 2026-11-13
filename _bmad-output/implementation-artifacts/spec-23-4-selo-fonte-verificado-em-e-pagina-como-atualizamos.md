---
title: 'Selo "Fonte · verificado em" e página "Como atualizamos"'
type: 'feature'
created: '2026-11-13'
status: 'done'
baseline_commit: '164aaddfd223256c67146b69ff984fa9e8e35104'
route: 'dispatch'
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-23-context.md', '{project-root}/DESIGN.md', '{project-root}/EXPERIENCE.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A 23.2 calcula, para cada fonte do portal, quando foi a nossa última coleta e se ela está em dia, mas o cidadão não vê nada disso. Os blocos de `/receitas` e `/despesas` não dizem de onde vêm os números.

**Approach:** Criar uma página por município, "Como atualizamos", que lista todas as fontes a partir de `getFrescorFontes`. Os blocos de `/receitas` e `/despesas` ganham um selo de uma linha: "Fonte: {descrição} · verificado em {data}", com link para essa página. O selo e a página leem o mesmo DTO.

**Pergunta do cidadão (Regra 27):** "De onde vêm estes números e quando o portal foi buscá-los?" A pergunta "estão atualizados?" fica para a 23.9; até lá nada afirma que o dado é recente.

**Recorte (Julio, 2026-11-12):** só a página nova e o selo em `/receitas` e `/despesas`. As duas páginas vêm só da fonte `fiorilli` (conferido pelo lineage do dbt), então o mapeamento é "uma página, uma fonte". `/saude` e as outras páginas, que misturam várias fontes, ficam para depois.

**Rodapé global (Julio, 2026-11-13, opção a):** nesta story o rodapé só ganha o link "Como atualizamos" e perde o ponto verde ao lado de "Dados extraídos em", que sugere que está tudo em dia. A data continua vindo de `dataExtracao`. Unificar essa data com a 23.2 fica em `deferred-work.md`.

## Boundaries & Constraints

**Always:**
- **Situação → texto:**
  - `coleta_em_dia`: só o selo.
  - `coleta_atrasada`: "Não conseguimos verificar esta fonte desde {data}".
  - `nao_monitorado`: "Não acompanhamos a data de atualização desta fonte".
- **Aviso:** ícone + texto, legível em leitor de tela; tipo `info` do DESIGN.md (dado talvez desatualizado não é `warning`).
- **Datas:** formatadas em pt-BR.
- **Frequência em linguagem comum:**
  - `diaria`: "todo dia útil"
  - `semanal`: "toda semana"
  - `mensal`: "todo mês"
  - `anual`: "uma vez por ano"
  - `sob_demanda`: "quando há dado novo"
- **Dados:** mapeamento página → `fonte` no view-model. `dataReferencia` = data UTC atual, calculada no loader. Componentes só renderizam.
- **Tabela no celular:** sem rolagem horizontal da página.
- **Revisão:** textos revisados pelo `editor-cidadao`; glossário atualizado.

**Never:**
- escrever "atualizado em" ou dizer que o número é recente;
- alarmar com cor só ou com `warning`;
- tocar `/saude` e as demais páginas;
- literais de município, UF ou ano;
- lógica de situação na UI.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Em dia | `fiorilli` `coleta_em_dia` | selo "Fonte: … · verificado em 12/11/2026" + link "Como atualizamos" | N/A |
| Atrasada | `coleta_atrasada` | selo + aviso com a data da última coleta | N/A |
| Não monitorada | `nao_monitorado`, data nula | selo sem data + aviso de não acompanhamento | N/A |
| Fonte ausente no DTO | página sem linha para `fiorilli` | sem selo (nada inventado) | N/A |
| Página com alguma atrasada | ≥1 `coleta_atrasada` | aviso no topo da página nova | N/A |
| Portal sem fonte monitorada | todas `nao_monitorado` | página em estado neutro, sem município fixo | N/A |
| Falha da query | erro no banco | página e blocos renderizam sem selo | loader captura e devolve lista vazia |

</frozen-after-approval>

## Code Map

- `packages/db/src/queries/frescor-fontes.ts`: `getFrescorFontes(portalSlug, dataReferencia)` e `FrescorFonteDTO` (`fonte`, `descricaoDados`, `frequenciaEsperada`, `ultimaColetaEm`, `situacao`). Não alterar.
- `apps/web/components/lei-e-fonte.tsx`: `LinhaLeiEFonte` (`<p className="caption">` "Lei: … · Fonte: …", prop `extra`). Reaproveitar como base do selo.
- `apps/web/app/[portalSlug]/receitas/{loader,view-model,page}.tsx`: seções `receitas-destaque` (l.90) e "Previsto e arrecadado" (l.157).
- `apps/web/app/[portalSlug]/despesas/{loader,view-model,page}.tsx`: seções `despesas-resumo` (l.88), "Para quais áreas", "Quem mais recebeu", "Gastos que merecem acompanhamento", "Dívidas de anos anteriores".
- `apps/web/app/[portalSlug]/farmacia/`: padrão de rota com loader, view-model, page e specs.
- `apps/web/components/global-footer.tsx:175-195`: rodapé "Dados extraídos em" (ganha o link e perde o ponto verde).
- `docs/glossario-cidadao.md`: termos "verificado em" e "coleta".

## Tasks & Acceptance

**Execution:**
- [x] `apps/web/components/selo-fonte.tsx` (+ spec): selo a partir de um view-model (descrição, data formatada, aviso, href).
- [x] `apps/web/app/[portalSlug]/como-atualizamos/` loader, view-model, page (+ specs): lista de fontes (o que traz, frequência, última verificação, situação), aviso no topo e estado neutro.
- [x] `receitas` e `despesas`: loader chama `getFrescorFontes`; view-model monta o selo de `fiorilli`; a page põe o selo no rodapé de cada seção (+ specs).
- [x] `apps/web/components/global-footer.tsx` (+ spec): link "Como atualizamos" e sem o ponto verde.
- [x] `docs/glossario-cidadao.md`: entradas novas.

**Acceptance Criteria:**
- Given um portal com `fiorilli` em dia, when o cidadão abre `/receitas` ou `/despesas`, then cada seção mostra o selo e o link leva a `/{portalSlug}/como-atualizamos`.
- Given as mudanças, when `make test/ts` e `pnpm typecheck` rodam, then passam.

## Verification

**Commands:**
- `make db/test/build && make test/ts` -- expected: verde
- `pnpm typecheck && pnpm lint` -- expected: verde

**Manual checks:**
- `/receitas`, `/despesas` e `/como-atualizamos` no navegador, em 375px e no tema escuro: sem rolagem horizontal; aviso legível.

## Implementation Notes

## Spec Change Log

## Review Triage Log
