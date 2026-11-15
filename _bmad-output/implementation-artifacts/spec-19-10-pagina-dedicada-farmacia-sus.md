---
title: 'Página dedicada da Farmácia SUS com lotes a vencer e pedido por remédio'
type: 'feature'
created: '2026-10-24'
status: 'done'
followup_review_recommended: false
route: 'dispatch'
review_loop_iteration: 0
baseline_revision: 'e65297de124d221266a35fb9c555fa441909d863'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-19-context.md'
  - '{project-root}/.claude/rules/web.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** a Farmácia SUS ainda mora em `/[portalSlug]/saude/farmacia`, sem item próprio no sidebar. A página não mostra lotes próximos do vencimento e os remédios essenciais sem registro de estoque não oferecem ação ao cidadão.

**Approach:** mover a rota para `/[portalSlug]/farmacia` (sem redirect, a página nunca foi lançada) e atualizar todas as referências. Acrescentar o card de lotes a vencer, condicional à validade (19.8), e o botão "Pedir esclarecimento" nos essenciais `sem_registro`, com texto-base de base legal já verificada.

## Boundaries & Constraints

**Always:** reaproveitar o layout da 19.11 (cabeçalho com busca, indicadores, resultados, essenciais, fonte) e os estados `conforme`, `apagao` e `indisponivel`; estatísticas calculadas em `@transparencia/db` (UI burra, Regra 9, 10, 18, 23); card de lotes só aparece quando há `data_validade` informada na posição vigente; sidebar com item solto "Farmácia SUS" logo abaixo de "Radar Cívico", fora de qualquer grupo; links oficiais das leis no pedido (Regra 20); componentes do design system e `fmt*` (Regra 24); `editor-cidadao` revisa os textos.

**Pedido por remédio:** só para essencial `sem_registro` (não para `somente_combinacao`). Copiar e WhatsApp reutilizam `FarmaciaAcoesCivicas`, parametrizado por rótulos, sem duplicar clipboard nem link. Texto-base: "Com base nos arts. 10 e 11 da Lei nº 12.527/2011 (Lei de Acesso à Informação) e no art. 6º-A da Lei nº 8.080/1990, incluído pela Lei nº 14.654/2023, que obriga a divulgação quinzenal e acessível dos estoques de medicamentos das farmácias públicas do SUS, solicito esclarecimento sobre o medicamento [nome]. Na posição de estoque divulgada em [data], não consta registro de estoque informado para esse item. Peço informar se o medicamento está disponível e, caso não esteja, a previsão de reposição." Nunca "esgotado", "zerado" nem afirmação de descumprimento. O pedido é dirigido à Secretaria Municipal de Saúde do município.

**Decisões:** (1) lotes "próximos do vencimento" são os que vencem em até 60 dias, valor em constante nomeada (não texto fixo na UI); (2) o eyebrow do cabeçalho é removido (a página não faz parte de Temas e repetiria o H1; decisão do usuário, substitui "Temas · Farmácia SUS"); (3) o card também informa os lotes já vencidos que ainda constam com saldo na posição vigente, para que "0 a vencer" não seja lido como boa notícia; texto neutro, sem afirmar irregularidade (a posição pode estar desatualizada).

**Never:** redirect da rota antiga, mexer em dbt ou nos dados raw, reabrir o layout da 19.11, tocar a barra inferior mobile (o drawer usa o sidebar), citar prazo ou artigo fora dos verificados, `pnpm build` como critério.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Rota nova | `/portal_x/farmacia?q=losartana` | mesma página de hoje | rota antiga responde 404 |
| Sem validade | nenhum lote com `data_validade` | card de lotes omitido | N/A |
| Só vencidos | todos os lotes com validade já vencidos e com saldo | card aparece com 0 a vencer e nº de lotes já vencidos com saldo | N/A |
| Vencido sem saldo | lote vencido com quantidade 0 | não conta | N/A |
| Com validade | lotes vencendo na janela | card com nº de lotes, nº de remédios e vencimento mais próximo | falha da query omite o card, não derruba a página |
| Essencial `sem_registro` | status sem registro | botão "Pedir esclarecimento" com copiar e WhatsApp | texto sem "esgotado" |
| Essencial `no_estoque` ou `somente_combinacao` | demais status | sem botão | N/A |
| `apagao` ou `indisponivel` | sem estoque vigente | comportamento atual preservado | N/A |

</frozen-after-approval>

## Code Map

- `apps/web/app/[portalSlug]/saude/farmacia/{page,loader,view-model}.ts(x)` e specs -- mover com `git mv` para `apps/web/app/[portalSlug]/farmacia/`; ajustar `buildFarmaciaHref` (linha 18), `formAction` (261) e `path` do metadata.
- `apps/web/app/[portalSlug]/view-model.tsx:21,452` -- import do view-model e `path` do card da home; `page.spec.tsx` (238, 274) acompanha.
- `packages/ui/src/components/sidebar.tsx:556-596` -- bloco "Radar Cívico"; item solto vai logo após o `<Link>` do radar, mesma estrutura de `isRadarActive` (`/${portalSlug}/farmacia`) e ícone lucide `Pill`; testes em `packages/ui/src/components/__tests__/sidebar.spec.tsx`.
- `packages/db/src/queries/farmacia.ts` -- novo `getFarmaciaLotesAVencer` lendo `fct_farmacia_estoque_historico` (única fonte de `data_validade`, não está em `fct_farmacia_estoque`); posição vigente por unidade; filtrar por `portal_slug`.
- `apps/web/components/farmacia/farmacia-sentinelas.tsx` -- item é um `<Link>`; botão não pode ficar dentro dele (usar disclosure por item); `farmacia-acoes-civicas.tsx` -- rótulos fixos, parametrizar.
- `apps/web/components/farmacia/farmacia-cabecalho.tsx:25` -- eyebrow "Temas · Saúde · Farmácia SUS" removido.
- `apps/web/components/farmacia/farmacia-indicadores.tsx` -- reutilizar para o card de lotes; `view-model.ts` `buildIndicadores`/`buildRequerimentoFiscalizacao` -- modelo para o texto do pedido.
- `apps/web/public/llms.txt:44`, `llms-full.txt:345` -- rota, estatísticas, lotes e pedido (Regra 12); `CHANGELOG.md` -- ajustar entrada da página (skill `changelog-transparencia`).
- Specs com `/saude/farmacia` fixo: `farmacia-busca-*`, `farmacia-sentinelas`, `farmacia-resumo-card`, `farmacia-sus-sentinela-banner`, `loader`/`view-model`/`page`.

## Tasks & Acceptance

**Execution:**
- [ ] `apps/web/app/[portalSlug]/farmacia/` -- mover a rota, atualizar caminhos internos, metadata e specs -- sem redirect
- [ ] `apps/web/app/[portalSlug]/view-model.tsx` e `page.spec.tsx` -- apontar o card da home para `/farmacia`
- [ ] `packages/ui/src/components/sidebar.tsx` e spec -- item solto "Farmácia SUS" abaixo de "Radar Cívico", com estado ativo
- [ ] `packages/db/src/queries/farmacia.ts` e `__tests__/farmacia.spec.ts` -- `getFarmaciaLotesAVencer` com janela em constante nomeada e testes de paridade
- [x] `getFarmaciaLotesAVencer`, `view-model.ts` e testes -- `totalLotesVencidosComSaldo` (validade < hoje e saldo > 0) e nota neutra no card (renegociação pós-revisão)
- [ ] `loader.ts`, `view-model.ts` -- repassar lotes (falha isolada com `.catch`), montar card e texto do pedido por remédio com dados dinâmicos
- [ ] `farmacia-acoes-civicas.tsx`, `farmacia-sentinelas.tsx` e specs -- rótulos parametrizados e botão "Pedir esclarecimento" só em `sem_registro`
- [ ] `llms.txt`, `llms-full.txt`, `CHANGELOG.md` -- atualizar rota e conteúdo

**Acceptance Criteria:**
- Given a rota antiga `/saude/farmacia`, when acessada, then retorna 404 e nenhuma referência a ela resta em código, `llms*.txt` ou testes.
- Given qualquer portal e exercício, when a página renderiza, then nenhum município, UF, ano ou número de unidades é fixo (Regra 23).
- Given os links de lei do pedido, when exibidos, then apontam ao Planalto com `target="_blank"` e `rel="noopener noreferrer"`.
- Given o fim da implementação, when rodar `make test/ts` e `pnpm typecheck`, then ambos passam.

## Implementation Notes

## Spec Change Log

- 2026-10-24 — pedido por remédio: o botão vira link "Pedir esclarecimento →" abaixo do rótulo de disponibilidade e abre `ModalDialog` (texto editável, contador, base legal, copiar/WhatsApp, prazo da LAI) em vez de painel inline. Link para e-SIC da Prefeitura fica de fora: não há fonte de URL por portal (Regra 23).
- 2026-10-24 — eyebrow removido por decisão do usuário (a página não é de Temas e repetiria o H1).
- 2026-10-24 — renegociação pedida pelo usuário após a revisão: o card informa também lotes já vencidos com saldo (Decisões 3 e matriz de borda). KEEP: janela de 60 dias, omissão sem validade, texto neutro.

## Review Triage Log

### 2026-10-24 — Review pass
- verdicts: ver linhas abaixo; sem high
- findings:
  - `[low]` `[patch]` loader sem teste do gate `conforme` — teste de `apagao` agora afirma que a query não roda e `lotesAVencer` é null
  - `[medium]` `[patch]` botões "Pedir esclarecimento" com nome acessível idêntico — `aria-label` inclui o nome do medicamento; spec ajustada
  - `[low]` `[patch]` "Secretaria Municipal de Saúde de o município" — destinatário vira "do município" sem `portalName`; spec ajustada
  - `[false]` `[reject]` sem redirect da rota antiga — a spec proíbe redirect (Never)
  - `[false]` `[reject]` base legal não verificada — verificada pelo jurista-fiscal, registrada na spec
  - `[false]` `[reject]` WhatsApp compartilha `item.href` com `?q` — é intencional: o link leva à busca do remédio
  - `[false]` `[reject]` edições de spec do resumo-card e do exemplo da home — specs já falhavam antes e foram alinhadas ao componente
  - `[false]` `[reject]` cobertura ausente de botão/painel/leis — `farmacia-sentinelas.spec.tsx` cobre
  - `[false]` `[reject]` lotes ocultos em `apagao` — por desenho: sem estoque vigente não há lotes
  - `[low]` `[reject]` fuso de `current_date` e flake de `dataRelativa` — risco só perto da meia-noite, correção exigiria parâmetro novo
  - `[low]` `[reject]` `janelaDias` não inteiro/NaN — parâmetro interno com constante; sem chamador que passe valor inválido
  - `[low]` `[reject]` `.catch` sem log, chamadas sequenciais, duplicação do sidebar, rótulos curtos em testes — sem dano demonstrado
  - `[low]` `[reject]` `porciuncula_prefeitura` no sidebar.spec — slug já usado nesse arquivo antes da story
  - `[low]` `[reject]` painel fecha ao trocar filtro, borda condicional, nome vazio de medicamento — sem cenário alcançável nos dados
  - `[medium]` `[bad_spec]` lotes já vencidos com saldo não aparecem — resolvido por renegociação do usuário: card passa a informar vencidos com saldo (commit separado)
  - `[low]` `[defer]` posição vigente sem limite de idade — a spec define "posição vigente"; avaliar quando houver `data_validade` real
  - demais itens (CNES nulo agrupado, raw SQL, `lower(nome)`, Intent Alignment descritivo: card como indicador, não seção) — `[reject]` sem dano demonstrado; leitura "indicador" é compatível com a spec

## Design Notes

Os dados raw atuais não trazem `data_validade`, então o card nasce oculto até a coleta incluir validade. Nada da Epic 19 está em produção. Ressalva herdada da 19.11 (fora de escopo): unidade com estoque e sem coordenadas deve aparecer na lista e ficar só fora do mapa.

## Verification

**Commands:**
- `make test/ts` -- expected: sem falhas novas
- `pnpm typecheck` -- expected: limpo
- `grep -rn "saude/farmacia" apps packages` -- expected: sem resultados (exceto logs de build)

**Manual checks (if no CLI):**
- Sidebar mostra "Farmácia SUS" abaixo de "Radar Cívico" no desktop e no drawer mobile; botão de pedido copia o texto e abre o WhatsApp.

## Auto Run Result

Status: done

- **Resumo:** rota movida para `/[portalSlug]/farmacia` (sem redirect), item "Farmácia SUS" no sidebar, query `getFarmaciaLotesAVencer` (janela de 60 dias em constante), indicador de lotes a vencer, botão "Pedir esclarecimento" nos essenciais `sem_registro` com copiar/WhatsApp, cabeçalho sem eyebrow, llms*.txt e CHANGELOG atualizados.
- **Revisão:** 3 patches aplicados (gate do loader testado, `aria-label` por medicamento, "do município"); 1 item adiado (idade da posição vigente); lotes vencidos com saldo incorporados à spec por decisão do usuário; demais rejeitados com motivo no log.
- **Follow-up recomendado:** false (nenhum patch `high`; 1 `medium`).
- **Verificação:** `make test/ts` e `pnpm typecheck` passam; biome limpo (1 warning pré-existente); grep de `saude/farmacia` sem resultados. Checks manuais de sidebar/WhatsApp não executados.
- **Riscos residuais:** card de lotes nasce oculto até os dados raw trazerem `data_validade`.
