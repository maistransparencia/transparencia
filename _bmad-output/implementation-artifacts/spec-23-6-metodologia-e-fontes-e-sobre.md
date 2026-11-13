---
title: 'Metodologia e fontes e "Sobre"'
type: 'feature'
created: '2026-11-13'
status: 'in-review'
baseline_commit: '38b114dc4994ae2491ebba7bed0e3c06901b8d15'
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
- [x] `elt/transform/seeds/seed_lacunas_conhecidas.csv` + modelo/mart + teste dbt: catálogo (`fonte`, `tipo` lacuna|divergencia, `texto_cidadao`, vigência).
- [x] `packages/db/src/queries/lacunas-conhecidas.ts` (+ spec, export): `getLacunasConhecidas(portalSlug, dataReferencia)` vigentes, em `camelCase`, isolado por portal.
- [x] `apps/web/app/[portalSlug]/sobre/` e `metodologia/` (loader, view-model, page + specs): seções na ordem do cidadão (de onde vêm, como calculamos, o que não cobrimos, lacunas, promessas).
- [x] Termos, privacidade, rodapé e sitemap apontam para as páginas; correções apontam para "Sugestão ou erro".
- [x] Glossário, `llms*.txt` e Implementation Notes (promessa → código/teste).

**Acceptance Criteria:**
- Given um portal com fontes e lacunas vigentes, when o cidadão abre "Metodologia e fontes", then fontes, cobertura e lacunas aparecem geradas dos dados, sem lista em JSX e sem tenant, UF ou ano fixo.
- Given uma fonte que o portal não usa, when a página fala de cobertura, then ela não aparece como atraso.
- Given o jurista e o editor revisaram, when `make test/ts` e `pnpm typecheck` rodam, then passam.

## Verification

- `make db/test/build && make test/ts`; `pnpm typecheck && pnpm lint`; `make test` e `make check` (dbt).
- Manual: as duas páginas em 375px e no tema escuro, sem rolagem horizontal.

## Implementation Notes

**Promessas negativas (texto público → sustentação):**
- "O texto e o e-mail de Sugestão ou erro não vão para a ferramenta de análise de uso" → `apps/web/components/feedback-modal.spec.tsx` (`expect(posthog.capture).not.toHaveBeenCalledWith("feedback_submitted", …)`); envio vai só para `POST /api/feedback` (`feedback-modal.tsx`, `app/api/feedback/route.ts` → `registerFeedbackReport`).
- "Guarda a página em que você estava; não é processo formal de resposta" → `rotaPagina: window.location.pathname` no corpo do envio (mesmo spec); sem fluxo de resposta no código.

**Lacunas iniciais** (`seed_lacunas_conhecidas.csv`, vigentes desde 2026-11-13): recorte de anos (`{ano_inicial_historico}` vem da var dbt, sem ano fixo), Fundeb sem conferência (siope), "verificado em" mede a nossa coleta.

**Decisões de implementação:** termos/privacidade são `force-static`; o município do último contexto vem do cookie `preferred_portal` lido no cliente (`portal-pages-links.tsx`), sem contexto leva a `/?mudar=true`. Cobertura nunca menciona atraso (AC 2). Rodapé ganhou "Metodologia e fontes" e "Sobre".

**Revisão (jurista-fiscal e editor-cidadao, 2026-11-13):** o texto do Fundeb citava o CACS-Fundeb sem decisão do Julio; corrigido para o limite decidido: o cálculo do mínimo do Fundeb para pagar profissionais da educação não foi conferido por um contador (CRC), com valores do SIOPE informados pela Prefeitura (sigla CRC fica fora da tela). Sem lei citada no texto público, logo sem link da Regra 20; o percentual mínimo não aparece (vem de `seed_constantes_fiscais`). Base legal do mínimo para profissionais: NÃO VERIFICADO neste texto. Ajustes de tom: "valem" virou "continuam à mostra"; "todos os números" virou "os números"; "ferramenta de análise" virou "ferramenta que mede o uso do site". Pendente: o Julio confirmar o texto do Fundeb e a base de cálculo aberta (alíquota suplementar, encargos) segue com o contador, ver spec 24-5.

**Evidência do Fundeb (indicador 1.2 do SIOPE, 2026-11-13, banco local):** lei: encargos sociais entram na remuneração (Lei 14.113/2020, art. 26, texto do Planalto); base dos 70% = contribuições + VAAF + VAAT, sem VAAR (Comunicado 38/2023 do Transferegov/SIOPE). NÃO VERIFICADO: se a alíquota suplementar (3.1.91.13.20) entra (a "glosa do TCE-PR" citada por outra LLM não consta no documento indicado; o padrão contábil para suplementar é 3.1.91.13.30). Só Natividade 2025 tem 3.1.91.13.20 pago com Fundeb (R$ 1.214.407, cerca de 11% do pessoal Fundeb). Percentual por regra, base receita Fundeb sem VAAR (restritiva só 3.1.90 / sem suplementar / ampla), contra o SIOPE: Natividade 2021 65,1/96,8/96,8 vs 94,82; 2022 80,5/97,2/97,2 vs 94,29; 2023 82,4/96,9/96,9 vs 91,46; 2024 79,5/95,7/95,7 vs 83,70; 2025 77,4/90,0/101,3 vs 91,48; 2026 68,2/81,3/81,3 vs 79,47. Porciúncula 2021 71,1/80,6/80,6 vs 79,63; 2022 86,7/97,4/97,4 vs 94,62; 2023 89,7/102,1/102,1 vs 93,84; 2024 81,9/94,7/94,7 vs 91,21; 2025 88,7/103,1/103,1 vs 92,06; 2026 87,2/96,5/96,5 vs 97,69. Conclusão: com encargos contados, o veredito acima/abaixo do mínimo não depende da suplementar; o percentual exato não reproduz o SIOPE (pago x liquidado, elementos de pessoal e receita arrecadada x recebida não conferidos). Texto público não afirma que o portal refez a conta. Contradição resolvida em 2026-11-13: a spec 24-5 foi corrigida para "exibido sem conferência de CRC" (a frase "confirmada" não tinha parecer nem fonte). Gatilho de reabertura da alíquota suplementar: se algum município/ano ficar perto de 70% com ou sem 3.1.91.13.20, o assunto volta. Para a 24-11: reformular o selo "cumpriu/abaixo" do Fundeb, mantendo só o percentual do SIOPE (a nossa conta não o reproduz) e usando esta tabela como evidência.

**Verificação:** `make test` 438 ok, `make check` ok, `pnpm test` e `pnpm typecheck` ok, `make db/test/build` ok. Manual 375px/tema escuro não feito.

## Spec Change Log
