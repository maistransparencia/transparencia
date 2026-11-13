---
title: 'Metodologia e fontes e "Sobre"'
type: 'feature'
created: '2026-11-13'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-23-context.md'
  - '{project-root}/DESIGN.md'
  - '{project-root}/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** o cidadão não encontra em um só lugar de onde vêm os números, o que o portal não cobre e o que ele promete não fazer. Hoje as fontes só aparecem em termos e privacidade.

**Approach:** duas páginas por município, "Sobre" (curta) e "Metodologia e fontes" (detalhada). Fontes e cobertura vêm de `getFrescorFontes`; lacunas e divergências vêm de um catálogo novo na camada de dados; a lista de fontes com situação fica só em "Como atualizamos", e a metodologia linka para lá.

## Boundaries & Constraints

**Always:**
- Regra 23: nada de município, UF ou ano fixo; tudo por `portal_slug`. Regras 9 e 10 no catálogo (`fonte`, `vigencia_inicio`, `vigencia_fim`, `texto_cidadao`).
- Regra 27: pergunta do cidadão primeiro; valor derivado diz que é derivado e como foi calculado.
- A situação mede a nossa coleta. Nunca escrever "atualizado em" nem afirmar que o dado é recente ("dados até" é a 23.9).
- Ausente aparece como "—" ou "ainda não disponível", nunca zero.
- Cada promessa negativa entra no texto só com referência a código ou teste, registrada em Implementation Notes; sem sustentação, sai.
- Lei citada passa pelo `jurista-fiscal` e leva link oficial (Regra 20); o que não for verificado sai do texto público e fica "NÃO VERIFICADO" no registro. Texto cidadão passa pelo `editor-cidadao`.
- `llms.txt`/`llms-full.txt` atualizados (Regra 12). Sem produção (Regra 15).

**Never:**
- Página "Quem publica e quem não publica", "Direito de resposta", processos e sanções de pessoas.
- Duplicar a lista de fontes de "Como atualizamos"; prometer fluxo de resposta formal.
- Lista de lacunas escrita em JSX.

**Decisões do Julio (2026-11-13):**
- Rotas por município: `/{portalSlug}/sobre` e `/{portalSlug}/metodologia`. Termos e privacidade linkam pelo município do último contexto, ou pela lista de portais se não houver.
- Lacunas iniciais confirmadas: dados antes de 2021 não são importados; Fundeb exibido sem conferência do CRC; "verificado em" mede a nossa coleta, não a publicação da fonte.
- Fonte sem monitoramento aparece como "ainda sem acompanhamento" na metodologia. É estado transitório (todas serão monitoradas até o fim da epic): o texto vem do estado calculado, sem lista fixa, e some sozinho quando a fonte passa a ter registro.

</frozen-after-approval>

## Code Map

- `apps/web/app/[portalSlug]/como-atualizamos/{loader,view-model,page}.tsx`: padrão de rota a copiar; chamar `getFrescorFontes`.
- `packages/db/src/queries/frescor-fontes.ts`: `FrescorFonteDTO` (inclui `nao_monitorado`, `coleta_sem_registro`). Não alterar.
- `elt/transform/seeds/seed_fontes_coleta.csv`: catálogo de fontes; modelo para o novo seed de lacunas.
- `apps/web/app/termos/page.tsx`, `apps/web/app/privacidade/page.tsx`: globais, sem município; ganham links.
- `apps/web/components/global-footer.tsx:231-240`: links do rodapé.
- `apps/web/app/api/feedback/route.ts`, `feedback-modal.tsx`: fluxo "Sugestão ou erro" (23.5), ainda não integrado em `feature/epic23`.
- `apps/web/public/llms*.txt`, `apps/web/app/sitemap.ts`, `docs/glossario-cidadao.md`.

## Tasks & Acceptance

**Execution:**
- [ ] `elt/transform/seeds/seed_lacunas_conhecidas.csv` + modelo/mart + teste dbt: catálogo (`fonte`, `tipo` lacuna|divergencia, `texto_cidadao`, vigência).
- [ ] `packages/db/src/queries/lacunas-conhecidas.ts` (+ spec, export): `getLacunasConhecidas(portalSlug, dataReferencia)` vigentes, em `camelCase`, isolado por portal.
- [ ] `apps/web/app/[portalSlug]/sobre/` e `metodologia/` (loader, view-model, page + specs): seções na ordem do cidadão (de onde vêm, como calculamos, o que não cobrimos, lacunas, promessas).
- [ ] Termos, privacidade, rodapé e sitemap apontam para as páginas; correções apontam para "Sugestão ou erro".
- [ ] Glossário, `llms*.txt` e Implementation Notes (promessa → código/teste).

**Acceptance Criteria:**
- Given um portal com fontes e lacunas vigentes, when o cidadão abre "Metodologia e fontes", then fontes, cobertura e lacunas aparecem geradas dos dados, sem lista em JSX e sem tenant, UF ou ano fixo.
- Given uma fonte que o portal não usa, when a página fala de cobertura, then ela não aparece como atraso.
- Given o jurista e o editor revisaram, when `make test/ts` e `pnpm typecheck` rodam, then passam.

## Verification

- `make db/test/build && make test/ts`; `pnpm typecheck && pnpm lint`; `make test` e `make check` (dbt).
- Manual: as duas páginas em 375px e no tema escuro, sem rolagem horizontal.

## Implementation Notes

## Spec Change Log
