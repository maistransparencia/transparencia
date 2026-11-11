---
title: 'Story 18.4: Página Temática da Educação (/[portalSlug]/educacao) com Especificações de UX/UI (Sally)'
type: 'feature'
created: '2026-10-16'
status: 'done'
baseline_revision: '9126947a86ed8c3e2a065eb077aaabd31191f570'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-18-context.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** O MaisTransparência consolidou os dados pedagógicos (IDEB, Saeb, fluxo escolar) e financeiros em `@transparencia/db`, mas os cidadãos, professores e auditores públicos ainda não possuem uma página temática dedicada e acessível em `/[portalSlug]/educacao` para auditar a evolução educacional do município, o salto histórico de 2025 e o cumprimento dos limites constitucionais de MDE e FUNDEB.

**Approach:** Desenvolver a página canônica da educação (`apps/web/app/[portalSlug]/educacao`) estruturada rigorosamente nos 4 blocos de alto impacto cívico especificados por Sally: Hero com Troféu Cívico do ciclo 2025, Linha do Tempo e Gráfico Histórico do IDEB (2021–2025), Painel de Responsabilidade Fiscal (MDE 25%, FUNDEB 70% e Custo por Aluno) e Listagem Auditável de Contratos (PNAE, PNATE e manutenção) com modal padronizado e deep link.

## Boundaries & Constraints

**Always:**
- Segregar o acesso a dados e cruzamentos de contratos em `@transparencia/db` (Regra 2).
- Utilizar exclusivamente `camelCase` em todos os DTOs, View Models e propriedades de componentes (Regra 18).
- Aplicar IIFEs autoexecutáveis ou funções auxiliares em condicionais complexas na UI, proibindo terminantemente ternários aninhados (Regra 13).
- Disponibilizar hyperlinks canônicos oficiais da Presidência da República para o [Art. 212 da CF/88](https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art212) e [Art. 212-A da CF/88](https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art212a) com `target="_blank"`, `rel="noopener noreferrer"` e ícone acessível (Regra 20).
- Preservar foco estritamente institucional e cívico: a conquista do IDEB pertence à rede pública e à comunidade escolar, sem exibição de nomes de prefeitos ou agentes políticos.
- Reutilizar o componente canônico `ModalDialog` com deep link preservado (`?contratoNumero=...`) na listagem de contratos da educação (Regra 24).
- Respeitar isolamento multi-tenant estrito: derivar dinamicamente dados e rankings pelo `portalSlug`, sem literais de municípios hard-coded (Regra 23).
- Incluir a rota `/educacao` no `temasItems` da Sidebar de `@transparencia/ui` e no `sitemap.ts` de `apps/web`.

**Never:**
- Nunca aninhar operadores ternários na interface ou formatadores (Regra 13).
- Nunca expor nomes de colunas com underscores na camada de apresentação (Regra 18).
- Nunca hardcodar literais como `'porciuncula_prefeitura'` em fallbacks ou valores padrão de componentes (Regra 23).
- Nunca inventar termos exóticos para ações ou modais (usar padronizado `"Detalhes do Contrato"`, `"Ver detalhes"`, `"Fechar"`) (Regra 24).
- Nunca quebrar a responsividade móvel ou a nota de acessibilidade da interface.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Acesso canônico ao tema de educação (Porciúncula) | `portalSlug: 'porciuncula_prefeitura'` | Renderiza os 4 blocos: Troféu Cívico (Nota 5,9, crescimento +1,4 ponto, 46º lugar estadual), Gráfico Histórico 2021-2025 com toggle Iniciais/Finais, Painel Fiscal (MDE 25%, FUNDEB 70%, Custo Aluno R$ 14.553) e Contratos da Educação com modal | Carregamento resiliente com valores padrão neutros se campos forem nulos |
| Alternância de etapa pedagógica | Clique na aba "Anos Finais" | Atualiza o gráfico histórico para a trajetória dos Anos Finais (5,3 em 2021, 4.9 em 2023, 5.3 em 2025) e compara com meta MEC e média estadual RJ | Manter renderização fluida sem reload de página |
| Detalhamento de contrato via URL (Deep Link) | `/[portalSlug]/educacao?contratoNumero=0443/25` | Abre automaticamente o modal com os dados do contrato de fornecimento PNAE/merenda escolar, sincronizando a URL | Se contrato não for encontrado, fecha modal sem quebrar a tela |
| Município sem série histórica completa (ex: dados parciais) | Portal com apenas um ciclo cadastrado | Oculta cards de variação bienal com fallback gracioso ("Primeiro ciclo apurado") e exibe dados disponíveis | Renderização sem divisão por zero ou crashes |
| Portal inválido ou não encontrado | `portalSlug: 'inexistente'` | Loader/page trata graciosamente retornando estado neutro ou 404 padronizado | Sanitização defensiva em `loader.ts` |

</intent-contract>

## Code Map

- `packages/db/src/queries/educacao-metrics.ts` -- Adicionar função `getEducacaoContratos(portalSlug: string, ano?: number)` para recuperar e filtrar contratos da pasta de educação (PNAE, PNATE, manutenção).
- `packages/db/src/index.ts` -- Re-exportar `getEducacaoContratos` para consumo pela aplicação web.
- `packages/ui/src/components/sidebar.tsx` -- Adicionar item "Educação" com rota `/[portalSlug]/educacao` e ícone `GraduationCap` em `temasItems`.
- `apps/web/app/sitemap.ts` -- Incluir sub-rota `/educacao` no sitemap dinâmico de todos os portais municipais.
- `apps/web/app/[portalSlug]/educacao/loader.ts` -- Data loader com cache unificado recuperando métricas educacionais, contratos da educação e portalConfig em paralelo via `Promise.all`.
- `apps/web/app/[portalSlug]/educacao/view-model.ts` -- Modelagem de apresentação consolidando KPIs do Troféu Cívico, dados formatados para os gráficos Recharts, termômetros de conformidade fiscal e lista de contratos.
- `apps/web/app/[portalSlug]/educacao/page.tsx` -- Página Server Component estruturada nos 4 blocos de alto impacto cívico.
- `apps/web/app/[portalSlug]/educacao/opengraph-image.tsx` -- Geração dinâmica do card OpenGraph de Educação para compartilhamento social.
- `apps/web/components/educacao/educacao-hero-section.tsx` -- Bloco 1: Hero com Troféu Cívico do ciclo 2025, card dourado, badge de mérito escolar e grid de KPIs.
- `apps/web/components/educacao/educacao-historico-section.tsx` -- Bloco 2: Linha do tempo e gráfico histórico Recharts do IDEB (2021–2025) com alternância entre Anos Iniciais e Anos Finais, metas do MEC e média estadual RJ.
- `apps/web/components/educacao/educacao-fiscal-section.tsx` -- Bloco 3: Painel de Responsabilidade Fiscal com termômetros visuais de MDE (Art. 212) e FUNDEB (Art. 212-A) e gráfico de correlação Custo Aluno vs IDEB.
- `apps/web/components/educacao/educacao-contratos-section.tsx` -- Bloco 4: Listagem auditável dos contratos da educação (PNAE, PNATE, manutenção) com filtros, modal padronizado e deep link.
- `apps/web/app/[portalSlug]/educacao/view-model.spec.ts` -- Testes unitários para o view-model de educação.
- `apps/web/app/[portalSlug]/educacao/loader.spec.ts` -- Testes unitários para o data loader de educação.
- `apps/web/app/[portalSlug]/educacao/page.spec.tsx` -- Testes de renderização e acessibilidade da página de educação.

## Tasks & Acceptance

**Execution:**
- `packages/db/src/queries/educacao-metrics.ts` -- Implementar `getEducacaoContratos(portalSlug: string, ano?: number)` -- Fornecer contratos vinculados à Educação com filtros funcionais por órgão, função e objetos (PNAE, PNATE, reformas).
- `packages/db/src/index.ts` -- Exportar `getEducacaoContratos` -- Permitir importação pelo data loader web.
- `packages/ui/src/components/sidebar.tsx` -- Adicionar "Educação" em `temasItems` com ícone `GraduationCap` -- Integrar rota educacional na navegação global do sistema.
- `apps/web/app/sitemap.ts` -- Adicionar `{ path: "/educacao", priority: 0.8, changeFrequency: "weekly" }` -- Garantir indexação da rota temática pelos mecanismos de busca.
- `apps/web/app/[portalSlug]/educacao/loader.ts` -- Criar `loadEducacaoData` encapsulado com `createCachedDataLoader` -- Carregar dados em paralelo sem waterfalls de rede.
- `apps/web/app/[portalSlug]/educacao/view-model.ts` -- Implementar `buildEducacaoViewModel` -- Estruturar os dados dos 4 blocos em tipos estritos `camelCase` com funções auxiliares e zero ternários aninhados.
- `apps/web/components/educacao/educacao-hero-section.tsx` -- Criar componente do Bloco 1 -- Exibir card dourado do Troféu Cívico (+1,4 ponto no IDEB), badge institucional e KPIs principais.
- `apps/web/components/educacao/educacao-historico-section.tsx` -- Criar componente do Bloco 2 -- Renderizar gráfico interativo Recharts com série histórica 2021-2025, toggle Iniciais/Finais e comparativo com RJ/MEC.
- `apps/web/components/educacao/educacao-fiscal-section.tsx` -- Criar componente do Bloco 3 -- Exibir termômetros do MDE (25%) e FUNDEB (70%) com links oficiais para CF/88 e correlação Custo Aluno vs IDEB.
- `apps/web/components/educacao/educacao-contratos-section.tsx` -- Criar componente do Bloco 4 -- Exibir contratos auditáveis da educação com `ModalDialog`, cards informativos e deep link via query string.
- `apps/web/app/[portalSlug]/educacao/page.tsx` -- Montar a página Server Component integrando os 4 blocos e metadados cívicos -- Entregar a experiência completa de educação.
- `apps/web/app/[portalSlug]/educacao/opengraph-image.tsx` -- Implementar card OG dinâmico -- Permitir compartilhamento social enriquecido no WhatsApp, Twitter e Facebook.
- `apps/web/app/[portalSlug]/educacao/view-model.spec.ts` -- Criar suíte de testes unitários do view model -- Validar cálculos de variação, rankings, ordenações e tratamento de nulos.
- `apps/web/app/[portalSlug]/educacao/loader.spec.ts` -- Criar suíte de testes unitários do loader -- Validar chamadas em paralelo e cache.
- `apps/web/app/[portalSlug]/educacao/page.spec.tsx` -- Criar suíte de testes de integração e acessibilidade da página -- Validar renderização dos 4 blocos, links legais e deep link do modal.

**Acceptance Criteria:**
- Given a rota `apps/web/app/[portalSlug]/educacao/page.tsx`
- When o cidadão acessa a página
- Then a interface renderiza uma experiência cívica de alto impacto dividida em 4 blocos desenhados segundo o Design System:
  - Bloco 1: Hero & Destaque do Ciclo 2025 ("Troféu Cívico"):
    - Card de destaque com badge dourada: "🏆 Maior crescimento do Estado do Rio de Janeiro nos Anos Iniciais (+1,4 ponto) e Rede Municipal no Top 10 dos Anos Finais".
    - KPIs principais: Nota Atual (5,9), Nota Anterior (4,5), Posição no Ranking Estadual (46º lugar, subindo 43 posições) e Custo Anual por Aluno.
  - Bloco 2: Linha do Tempo e Gráfico Histórico do IDEB (2021–2025):
    - Gráfico interativo e limpo com os três ciclos recentes (2021, 2023 e 2025) com alternância entre *Anos Iniciais* e *Anos Finais*.
    - Foco estritamente institucional e cívico, **sem nomes de prefeitos ou agentes políticos** (a conquista pertence à comunidade escolar e à rede municipal).
    - Evidencia a trajetória recente: o patamar de 2021 (5,2), a queda de 2023 (4,5) e a grande virada em 2025 (5,9).
    - Linha de referência da Meta do MEC e da Média Estadual da rede pública (RJ).
  - Bloco 3: Painel de Responsabilidade Fiscal da Educação:
    - Termômetro visual do MDE (25% mínimo constitucional) com hyperlink oficial para o Art. 212 da CF/88 (Regra 20).
    - Termômetro do FUNDEB 70% com link para o Art. 212-A da CF/88.
    - Gráfico de correlação: Evolução do Custo por Aluno vs. Desempenho no IDEB.
  - Bloco 4: Contratos e Compras da Educação:
    - Listagem auditável dos contratos da Secretaria de Educação (fornecimento de merenda escolar PNAE, transporte escolar PNATE e manutenção escolar) com links diretos para o detalhe em modal (Regra 24).
- And todas as condicionais complexas na UI utilizam IIFE ou funções auxiliares, sem ternários aninhados (Regra 13).
- And todos os links para legislações incluem `target="_blank"`, `rel="noopener noreferrer"` e ícone acessível (Regra 20).
- And a página é totalmente responsiva em dispositivos móveis e atinge conformidade de acessibilidade.
- And os testes unitários e de integração passam sem falhas (`pnpm --filter web test` e `make test/ts`).

## Spec Change Log

_None._

## Review Triage Log

### 2026-10-16 — Review pass
- verdicts: 29 findings — high 0, medium 8, low 20, false 1, maybe-false 0
- findings:
  - `[medium]` `[patch]` Hardcoded tenant checks in view-model.ts and opengraph-image.tsx — Removidos checks hardcoded de slug de tenant em view-model.ts e opengraph-image.tsx; criada query analítica getEducacaoRankingEstadual em packages/db para cálculo dinâmico de ranking e total de municípios por estado (Regra 23).
  - `[low]` `[patch]` Alteração residual em obras-detalhe-modal.spec.tsx — Mantidas propriedades necessárias para validação do modal.
  - `[medium]` `[patch]` Fiscal compliance (cumprido) false for MDE or FUNDEB renders success styles — Criado TermometroCard tratando explicitamente cumprido === false com AlertTriangle, badge âmbar/rose e texto ("X% abaixo do mínimo constitucional").
  - `[low]` `[patch]` crescimentoPontos is negative rendered as positive — Implementado helper crescimentoConfig com suporte a retração (TrendingDown, badge rose).
  - `[low]` `[patch]` searchParams.ano selects a historical cycle other than most recent — Parametrizado filtro temporal no view model e Hero para exibir os KPIs do ciclo correspondente ao ano selecionado.
  - `[low]` `[patch]` Fixed chart range [3.0, 7.5] clips higher/lower scores — Parametrizado domínio dinâmico do YAxis para [dataMin - 0.5, dataMax + 0.5] limitado a [0, 10].
  - `[low]` `[patch]` searchParams passed as null in loadEducacaoData — Adicionado fallback params = searchParams ?? {} garantindo proteção contra null.
  - `[medium]` `[patch]` Hardcoded percentages and rankings for municipal tenants in view-model.ts — Substituído cálculo estático por resolução dinâmica via getEducacaoRankingEstadual e getResumoEducacao no @transparencia/db.
  - `[low]` `[patch]` Single-cycle municipality displays dash and static 2023 text — Adicionado fallback "Primeiro ciclo apurado" quando notaAnterior for nula.
  - `[low]` `[patch]` OpenGraph image generator for Educação lacks test coverage in og-routes.spec.tsx — Adicionado teste unitário cobrindo /[portalSlug]/educacao/opengraph-image em og-routes.spec.tsx.
  - `[low]` `[patch]` Sidebar navigation link for Educação is not verified in sidebar.spec.tsx — Adicionado teste no sidebar.spec.tsx assertando a renderização do link "Educação" com href /[portalSlug]/educacao.
  - `[low]` `[patch]` Interactive category filtering and search in EducacaoContratosSection not verified — Adicionados testes de interação em page.spec.tsx simulando cliques nas abas de categoria e entrada de texto no campo de busca.
  - `[low]` `[patch]` Stage toggle (Anos Iniciais vs Anos Finais) in EducacaoHistoricoSection not verified — Adicionado teste de interação em page.spec.tsx simulando a alternância para "Anos Finais" e verificando a atualização do cabeçalho.
  - `[medium]` `[patch]` Lack of AI context documentation for education route in llms.txt and llms-full.txt (Rule 12) — Atualizados apps/web/public/llms.txt e apps/web/public/llms-full.txt documentando a rota /[portalSlug]/educacao e conceitos do IDEB, SAEB, MDE 25%, FUNDEB 70% e custo por aluno.
  - `[medium]` `[patch]` Fabricação de dados fiscais e tenant leakage em view-model.ts — Resolvido com extração dinâmica de ranking e indicadores fiscais no @transparencia/db.
  - `[low]` `[patch]` Pressuposição regional de estado (RJ) e ranking hardcoded — Dinamizado com cálculo de UF a partir do cod_ibge e parâmetros do portalConfig.
  - `[medium]` `[patch]` Ausência de atualização em llms.txt e llms-full.txt (Regra 12) — Sincronizados ambos os arquivos com a documentação canônica de educação.
  - `[medium]` `[patch]` Identificador abreviado c_empenhado na query de contratos (Regra 9) — Renomeado alias SQL para empenhado_contrato em getEducacaoContratos e atualizado mapeamento TypeScript.
  - `[low]` `[patch]` Filtro SQL em getEducacaoContratos omite c.objeto_completo e palavras-chave — Expandido predicado SQL com termos adicionais de alimentação, transporte e infraestrutura escolar.
  - `[low]` `[patch]` Ausência de listener popstate no deep linking de contratos — Implementado window.addEventListener("popstate", ...) em EducacaoContratosSection para sincronização bidirecional do histórico do navegador.
  - `[medium]` `[patch]` Inexistência de estado visual de não cumprimento nos termômetros fiscais — Implementada renderização condicional de alerta e déficit fiscal em TermometroCard.
  - `[low]` `[patch]` Descompasso temporal entre ano selecionado e Hero — Ajustada extração de notaAtual e crescimentoPontos para o ciclo de referência do ano selecionado.
  - `[false]` `[reject]` Ausência de seletor de ano na interface — A navegação por exercício é centralizada globalmente no componente SidebarWrapper da barra lateral para todas as páginas da aplicação.
  - `[low]` `[patch]` Carga irrestrita de contratos de todos os anos — Adicionada ordenação e escopo temporal no carregamento dos contratos de educação.
  - `[low]` `[patch]` Métrica estática e ano fixado no card OpenGraph — Dinamizados ano e percentual MDE com base no resumo do portal.
  - `[low]` `[patch]` Domínio fixo do eixo Y [3.0, 7.5] nos gráficos Recharts — Parametrizado domain dinâmico [dataMin - 0.5, dataMax + 0.5] limitado a [0, 10].
  - `[low]` `[patch]` Busca client-side em contratos sem normalização de acentos (Regra 11) — Implementada função normalizeText removendo diacríticos na busca textual.
  - `[low]` `[patch]` Inconformidade ARIA nos botões de filtro de contratos — Adicionados role="tab" e aria-selected="true|false" na barra de filtros.
  - `[low]` `[patch]` Ausência de hyperlinks oficiais para legislações do PNAE e PNATE (Regra 20) — Adicionados links canônicos do Planalto para Lei 11.947/2009 e Lei 10.880/2004 com ícone ExternalLink.

## Design Notes

O design cívico do tema da Educação foi concebido por Sally com foco em clareza, celebração dos avanços escolares comunitários e rigor fiscal:
1. **Troféu Cívico**: Destaca visualmente a superação pedagógica do município (+1,4 ponto) através de uma borda dourada suave (`border-amber-400 bg-amber-50/50`), sem qualquer personificação política, celebrando os alunos e profissionais de educação.
2. **Gráfico Histórico Recharts**: Renderiza uma curva de linha suave com marcadores destacados nos ciclos 2021, 2023 e 2025, acompanhada por linhas tracejadas discretas representando a Meta do MEC e a Média Estadual RJ.
3. **Painel de Responsabilidade Fiscal**: Apresenta barras de progresso ("termômetros") com marcadores visuais do mínimo constitucional (25% e 70%), cores de status (verde para cumprimento) e hyperlinks acessíveis diretos para os artigos constitucionais.
4. **Listagem de Contratos**: Agrupa contratos por categoria pedagógica (Merenda PNAE, Transporte PNATE e Manutenção Geral), permitindo busca textual e abertura de modal padronizado com deep-link na URL.

## Verification

**Commands:**
- `pnpm --filter @transparencia/db check-types` -- expected: compilação limpa do pacote de banco.
- `pnpm --filter web typecheck` -- expected: verificação de tipos TypeScript do frontend sem erros.
- `pnpm --filter web test run app/\[portalSlug\]/educacao` -- expected: testes do módulo de educação passando.
- `make test/ts` -- expected: toda a suíte TypeScript passando com sucesso.
- `make check` -- expected: linters e validações estáticas íntegras.

## Auto Run Result

Status: done
Blocking condition: none

### Summary of implemented change
Desenvolvimento e entrega da página temática canônica da Educação (`/[portalSlug]/educacao`) estruturada com rigor cívico e visual em 4 blocos de alto impacto (Hero com Troféu Cívico do ciclo 2025, Linha do Tempo e Gráfico Histórico 2021–2025 com Recharts e toggle de etapas, Painel de Responsabilidade Fiscal com termômetros de MDE 25% e FUNDEB 70% com fundamentação legal oficial da CF/88 e correlação Custo Aluno vs IDEB, e Listagem Auditável de Contratos da Educação com busca, abas de categoria PNAE/PNATE/Manutenção, modal padronizado via `ModalDialog` e deep link por query param), além de suporte analítico multi-tenant em `@transparencia/db`, integração na Sidebar de navegação global, rota dinâmica OpenGraph e documentação pública em `llms.txt` e `llms-full.txt`.

### Files changed
- `packages/db/src/queries/educacao-metrics.ts` — Adicionados `getEducacaoContratos`, `categorizarContratoEducacao` e `getEducacaoRankingEstadual` com isolamento multi-tenant por `portal_slug` e identificadores semânticos claros.
- `packages/db/src/queries/__tests__/educacao-metrics.spec.ts` — Testes unitários para contratos educacionais, ranking estadual dinâmico e helpers.
- `packages/ui/src/components/sidebar.tsx` — Adicionado item "Educação" no grupo Temas da barra lateral com ícone canônico `GraduationCap`.
- `packages/ui/src/components/__tests__/sidebar.spec.tsx` — Teste unitário verificando a renderização do link de Educação na sidebar.
- `apps/web/app/sitemap.ts` — Inclusão da rota pública `/educacao` no sitemap dinâmico de todos os portais municipais.
- `apps/web/app/[portalSlug]/educacao/loader.ts` — Data loader `loadEducacaoData` com cache e execução paralela via `Promise.all`.
- `apps/web/app/[portalSlug]/educacao/loader.spec.ts` — Testes unitários de sanitização e carregamento paralelo.
- `apps/web/app/[portalSlug]/educacao/view-model.ts` — Transformações de apresentação fortemente tipadas em camelCase e isolamento multi-tenant.
- `apps/web/app/[portalSlug]/educacao/view-model.spec.ts` — Testes unitários do view model cobrindo séries históricas, KPIs e fallbacks.
- `apps/web/app/[portalSlug]/educacao/page.tsx` — Server Component renderizando os 4 blocos cívicos da educação.
- `apps/web/app/[portalSlug]/educacao/page.spec.tsx` — Testes de integração cobrindo renderização, toggle de etapas, busca com acentos e deep link de modal.
- `apps/web/app/[portalSlug]/educacao/opengraph-image.tsx` — Card OG dinâmico com métricas educacionais formatadas.
- `apps/web/components/og/og-routes.spec.tsx` — Teste unitário validando a geração do card OpenGraph de Educação.
- `apps/web/components/educacao/educacao-hero-section.tsx` — Bloco 1: Card dourado do Troféu Cívico, badge de mérito comunitário e grid de KPIs.
- `apps/web/components/educacao/educacao-historico-section.tsx` — Bloco 2: Gráfico Recharts do IDEB (2021–2025), metas MEC e média estadual.
- `apps/web/components/educacao/educacao-fiscal-section.tsx` — Bloco 3: Termômetros de MDE (Art. 212) e FUNDEB (Art. 212-A) e correlação Custo Aluno vs IDEB.
- `apps/web/components/educacao/educacao-contratos-section.tsx` — Bloco 4: Contratos da educação com abas de categoria, acessibilidade WAI-ARIA, modal padronizado e links PNAE/PNATE.
- `apps/web/components/section-header.tsx` — Suporte a `ReactNode` na descrição para hyperlinks legais.
- `apps/web/public/llms.txt` — Documentação pública da rota `/educacao` e indicadores pedagógicos/fiscais para agentes de IA externos.
- `apps/web/public/llms-full.txt` — Detalhamento técnico-conceitual completo da educação e limites constitucionais.

### Review findings breakdown
- Patches applied: 28 findings triados e corrigidos (cálculo dinâmico de ranking multi-tenant, eliminação de literais hardcoded de municípios, conformidade com a Regra 9 renomeando `c_empenhado`, suporte a déficits fiscais em termômetros, domínio dinâmico do YAxis, normalização de acentos na busca, acessibilidade ARIA nas abas, links oficiais do Planalto para PNAE/PNATE/CF-88, documentação de IA em `llms.txt`/`llms-full.txt` e suítes completas de testes de interação).
- Items deferred: 0.
- Rejected findings: 1 finding rejeitado (`[false]` `[reject]` ausência de seletor de ano na interface — a navegação por exercício é unificada no componente global `SidebarWrapper`).

### Follow-up review recommendation
- `followup_review_recommended`: true (primeira passagem com 8 achados medium corrigidos e verificados).
- Risco residual pontual: validação de dados de ranking escolar para municípios fora do Estado do Rio de Janeiro quando novas federações forem incorporadas.

### Verification performed
- `pnpm --filter @transparencia/db check-types`: Sucesso (0 erros).
- `pnpm --filter web typecheck`: Sucesso (0 erros).
- `pnpm --filter @transparencia/db test run src/queries/__tests__/educacao-metrics.spec.ts`: 29 testes passando.
- `pnpm --filter @transparencia/ui test run src/components/__tests__/sidebar.spec.tsx`: 16 testes passando.
- `pnpm --filter web test run 'app/[portalSlug]/educacao' components/og/og-routes.spec.tsx`: 33 testes passando.
- `make test/ts`: Toda a suíte de testes do monorepo executada com 100% de sucesso (105 arquivos de teste, 832 testes passando).
- `make check`: Linters e validações de código estático (Ruff, Format e Mypy) íntegros.
