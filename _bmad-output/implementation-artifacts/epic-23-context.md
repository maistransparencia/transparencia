# Epic 23 Context: Confiança e Transparência do Portal (Frescor dos Dados, Reporte de Erro e Metodologia)

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Dar ao cidadão, ao jornalista e ao vereador provas de que os números do portal são confiáveis: de onde vêm, quando foram atualizados, quando estão atrasados e como apontar um erro. O padrão foi adaptado de um concorrente (politicometro.org), sem copiar conteúdo; o diferencial do portal é a profundidade fiscal municipal, e esta epic reforça a confiança nela. Não há PRD, arquitetura ou UX específicos desta epic; as regras vêm das restrições abaixo e do CLAUDE.md.

## Stories

- Story 23.1: Registro de coletas por fonte e frequência esperada
- Story 23.2: Query de frescor com estado "fora do prazo previsto"
- Story 23.3: Carga segura: parar e avisar em vez de gravar dado errado
- Story 23.4: Selo "Fonte · verificado em" nos blocos e página "Como atualizamos"
- Story 23.5: "Reportar erro" por indicador
- Story 23.6: Metodologia e fontes e "Sobre"
- Story 23.7: Origem das "Entradas fora do orçamento" em receitas
- Story 23.8a: Extratores do SIOPE e do SIOPS no padrão de coleta em JSON
- Story 23.8b: Grupos de cadência e workflows agendados por fonte
- Story 23.8c: Cadência dos seeds do IDEB e das fontes de saúde
- Story 23.9: Período mais recente publicado por fonte ("dados até")

## Requirements & Constraints

- Frescor é calculado, nunca declarado à mão. Fonte sem registro de coleta aparece como "não monitorado", nunca presumida em dia.
- Valores ajustáveis (frequência, tolerância, descrições) ficam no catálogo de fontes (seed), não no código.
- Dado ausente aparece como "ainda não disponível", nunca como zero.
- Tom não acusatório e linguagem cidadã (revisão `editor-cidadao`); texto jurídico revisado pelo `jurista-fiscal`.
- Nenhum literal de tenant, UF ou ano; tudo por `portal_slug` (isolamento em joins e agrupamentos).
- Nomes de métricas explícitos; códigos (`fonte`, `situacao`, `frequencia_esperada`) em snake_case, traduzidos só na UI.
- dbt e seeds rodam só no banco local do Docker; produção exige autorização explícita do Julio.

## Technical Decisions

- Toda lógica (cálculo de frescor, situação) vive em `@transparencia/db` (`packages/db/src/queries/`, Kysely); a UI só renderiza.
- Datas de referência entram como parâmetro nas queries (sem `now()` escondido) para testes determinísticos.
- Base de dados de frescor: mart de coletas por fonte e catálogo de fontes entregues na 23.1.
- Testes: paridade TypeScript contra banco local (`make test/ts`, `pnpm typecheck`); dbt/Python com `make test` e `make check`.

## UX & Interaction Patterns

- Telas seguem `DESIGN.md` e `EXPERIENCE.md`; detalhe técnico fica atrás de "Ver detalhes".
- O rótulo visível do reporte de erro é "Sugestão ou erro" (definido na Epic 27).

## Cross-Story Dependencies

- 23.2 depende da 23.1; 23.3, 23.4, 23.6 e 23.9 dependem da 23.2. A situação da 23.2 mede a nossa coleta, não a publicação da fonte; "o dado é recente?" é a 23.9, e até ela o selo diz "verificado em", nunca "atualizado em".
- 23.6 depende também da 23.5; 23.5 depende da Story 27.5.
- 23.8a depende das Stories 24.1 e 25.2; 23.8b depende da 23.8a; 23.8c depende da 23.8b e das Stories 25.6a–c.
- A cobertura do selo (23.4) cresce conforme as fontes ganham registro de coleta (23.1 e 23.8). Decisão de 2026-11-12: a 23.8 vem depois do selo.
