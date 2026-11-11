---
status: done
baseline_revision: ac2430616aaccc039c058c141ef7572a4220dfff
followup_review_recommended: false
---

# Story 12.9: Componente Reutilizável de Truncamento Inteligente e Modal de Leitura para Células Extensas em Tabelas, Adaptação Mobile de Contratos/Licitações e Ajustes de Layout

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> [!NOTE]
> **Contexto de UX, Usabilidade Mobile & Design System (`@transparencia/ui`):**
> - Com o des-truncamento e enriquecimento de dados das Stories 12.5 e 12.8, objetos de contratos e licitações atingem facilmente 500 a 1.200 caracteres de texto denso.
> - Exibir textos integrais diretamente nas células quebra a cadência vertical e a densidade visual das tabelas.
> - Truncamentos secos com reticências (`truncate` ou `line-clamp`) impedem a leitura completa e bloqueiam a seleção/cópia de termos para conferência cidadã.
> - Além disso, em dispositivos móveis (<640px), tabelas largas com 6 a 8 colunas e rolagem horizontal (`overflow-x-auto`) tornam-se praticamente inutilizáveis para o cidadão.
> - Esta story introduz primitivas acessíveis no `@transparencia/ui` (`ModalDialog` e `TruncatedCellWithModal`), adapta as tabelas de licitações e contratos para layout híbrido (Cards responsivos no mobile e `DenseTable` no desktop), adiciona suporte a valor homologado vs. estimado e efetua refinações de layout acordadas.

## Story

As a citizen, civic researcher, or municipal fiscal auditor,  
I want table cells with extensive textual content to display a compact truncated preview with an intuitive modal dialog for full reading and copying, responsive card-based views on mobile devices for procurement/contracts tables, and visibility of both estimated and awarded/homologated values,  
So that I can comfortably read, audit, and inspect comprehensive procurement objects and contract details across desktop and smartphone screens with maximum usability and clarity.

---

## Acceptance Criteria

1. **Primitiva de Modal Acessível no Design System (`packages/ui/src/components/modal-dialog.tsx`):**
   - Criar componente `ModalDialog` (ou `Dialog`) reutilizável, leve e sem dependências externas pesadas:
     - Backdrop suave com desfoque de fundo (`bg-black/50 backdrop-blur-xs fixed inset-0 z-50 flex items-center justify-center p-4`).
     - Layout responsivo: Bottom Sheet em mobile (`< 640px`: `rounded-t-2xl max-h-[85vh] self-end w-full`) e janela centralizada em desktop (`sm:rounded-xl sm:max-w-2xl sm:self-center`).
     - Cabeçalho estruturado: título, subtítulo contextual e botão explícito de fechar (`X` com `aria-label="Fechar modal"`).
     - Fechamento com tecla `Escape`, clique no backdrop e retenção de foco acessível (*focus trap* básico).
     - Bloqueio de rolagem do `document.body` enquanto o modal estiver aberto.
   - Exportar o componente em `packages/ui/src/index.ts`.

2. **Componente de Célula Expansível (`packages/ui/src/components/truncated-cell-with-modal.tsx`):**
   - Props:
     - `text: string` (conteúdo integral).
     - `maxLines?: number` (padrão: `2`).
     - `characterThreshold?: number` (padrão: `100`).
     - `modalTitle?: string` (ex: "Objeto da Contratação").
     - `modalSubtitle?: string` (ex: "Pregão Eletrônico nº 015/2024").
     - `badge?: React.ReactNode` (opcional: badge de modalidade ou status).
     - `externalLink?: { href: string; label: string }` (opcional: link para a sala de lances/Licitanet).
     - `className?: string`.
   - Comportamento:
     - Se `text.length <= characterThreshold`, renderiza o texto puro sem affordances extras.
     - Se `text.length > characterThreshold`:
       - Renderiza o texto com `line-clamp-{maxLines}`.
       - Exibe um indicador/link inline sutil *"Ver mais"* ou botão discreto com ícone de expansão (`Maximize2` ou `Eye` de 12px).
       - Estiliza a célula com affordance interativa (`cursor-pointer group hover:text-blue-700 transition-colors`).
       - Garante acessibilidade com `tabIndex={0}`, `role="button"` e acionamento via `Enter` ou `Space`.

3. **Experiência de Leitura e Cópia no Modal (Delight & Produtividade Cívica):**
   - Corpo do modal formatado com tipografia confortável de leitura:
     - `text-slate-800 text-sm leading-relaxed whitespace-pre-wrap select-text`.
     - Área com rolagem interna suave (`max-h-[55vh] overflow-y-auto pr-2`).
   - Botão **"Copiar texto completo"**:
     - Cópia para a área de transferência com feedback visual dinâmico (ícone de check verde e texto *"Copiado!"* por 2 segundos).
   - Botão opcional de ação externa:
     - Quando `externalLink` for fornecido (ex: `linkSistemaOrigem` do PNCP apontando para a sala de lances), exibir botão *"Acessar no Portal de Origem"* com abertura em nova aba (`target="_blank"` e `rel="noopener noreferrer"`).

4. **Experiência Mobile Responsiva para Licitações e Contratos (Adaptive View: Cards no Mobile, DenseTable no Desktop):**
   - Em `apps/web/components/licitacoes-em-andamento-section.tsx`:
     - Mobile (`block sm:hidden`): renderizar lista em formato de Cards Verticais responsivos com:
       - Processo / Edital + Badges de Modalidade e Situação + Tag de origem (PNCP / Contrato Local).
       - Objeto usando `TruncatedCellWithModal`.
       - Metadados: Órgão de Lotação e Data de Abertura.
       - Valores: Valor Estimado e Valor Homologado claramente destacados.
       - Ações: Botão `[Itens]` (abre modal de itens licitados) e `[Sala de Disputa / Edital]` (se houver link externo).
     - Desktop (`hidden sm:block`): manter `DenseTable` com colunas, ordenação e exportação CSV.
   - Em `apps/web/components/licitacoes-table.tsx` (Contratos e Dispensas) e `contratos-servicos-vigentes-section.tsx`:
     - Aplicar o mesmo padrão responsivo híbrido:
       - No mobile (`block sm:hidden`): Cards estruturados para cada contrato com número, contratado/fornecedor, objeto expansível com `TruncatedCellWithModal`, modalidade, vigência e valores contratado/empenhado/pago.
       - No desktop (`hidden sm:block`): `DenseTable` mantida com `TruncatedCellWithModal` na coluna `OBJETO`.
   - Manter paginação e busca funcionando de forma sincronizada em ambas as visualizações.

5. **Exibição de Valor Homologado vs. Valor Estimado em Licitações:**
   - No dbt (`int_licitacoes_consolidadas.sql` e `fct_licitacoes.sql`):
     - Expor colunas `valor_estimado` e `valor_homologado` (além de manter `valor` para compatibilidade).
     - Para compras do PNCP, mapear `c.valor_total_estimado` como `valor_estimado` e `c.valor_total_homologado` como `valor_homologado`.
     - Para registros municipais locais, mapear `l.valor` como `valor_estimado` e, caso enriquecido com PNCP homologado, trazer `p.valor_total_homologado` como `valor_homologado`.
   - Em `@transparencia/db/src/queries/licitacoes-metrics.ts`:
     - Atualizar `LicitacaoEmAndamentoDTO` e a query `getLicitacoesEmAndamentoMetrics` com `valorEstimado` e `valorHomologado`.
   - Na UI (`licitacoes-em-andamento-section.tsx`):
     - Exibir na tabela desktop e nos cards mobile:
       - Valor Estimado: `R$ X` (ou "Não divulgado").
       - Valor Homologado: `R$ Y` (ou "Em disputa / Aguardando homologação" se nulo).
       - Indicador visual de economia/deságio quando homologado for menor que estimado.

6. **Remoção da Seção "Distribuição de contratos por modalidade":**
   - Remover a seção `<DistribucaoModalidadesChart />` de `apps/web/app/[portalSlug]/licitacoes/page.tsx` para eliminar redundância visual e focar nos blocos de auditoria cívica e fiscal.

7. **Ajustes de Navegação e Layout Geral:**
   - **Mover "x compras em andamento":**
     - Remover o pill de compras em andamento do título em `apps/web/components/radar-civico-feed.tsx`.
     - Adicionar o indicador/item "x compras em andamento" diretamente no card de visão geral "Licitações e Contratos" em `apps/web/app/[portalSlug]/view-model.tsx`.
   - **Mover ícones de "Redes" para o rodapé:**
     - Remover o bloco de redes do menu lateral `packages/ui/src/components/sidebar.tsx`.
     - Posicionar os links de redes sociais de forma limpa e acessível no rodapé global da aplicação (`apps/web/app/layout.tsx` ou componente de footer apropriado).
   - **WhatsApp:**
     - Manter o botão/fluxo de compartilhamento WhatsApp atual em `apps/web/components/radar-anomalia-card.tsx` inalterado.

8. **Auto-filtro, Destaque Visual e Abertura Automática de Modal via Deep Link (`apps/web`):**
   - Quando `LicitacoesTable` e `LicitacoesPage` forem acessadas via deep link contendo parâmetros de pesquisa ou anomalia (ex: `?numero=[numero]` ou `?filtro=sem_licitacao` / `?modalidade=dispensa`):
     - Aplicar auto-filtro instantâneo na tabela/cards ou posicionar a visualização via scroll suave com destaque temporário (*highlight pulse*) na linha/card do processo em auditoria.
     - **Abertura Automática do Modal:** Se a URL contiver a âncora `#itens` (ex: `?numero=000290#itens`), disparar automaticamente a abertura do modal de itens licitados do respectivo certame, permitindo que o cidadão audite imediatamente os preços unitários, descontos e fornecedores vencedores com zero atrito de navegação.

9. **Modal de Auditoria Nominal para Inconsistência de Vínculos de Pessoal (`apps/web` & `@transparencia/db`):**
   - Disponibilizar no card do Radar Cívico ou no painel de regime de pessoal (`/pessoal?ano=[ano]#regime`) um gatilho de auditoria nominal (ex: *"Ver lista de profissionais auditados"*).
   - Abrir o `ModalDialog` exibindo a listagem completa, paginada e pesquisável dos servidores públicos identificados com divergência cadastral:
     - Nome do servidor (ou identificador conforme regras de LGPD do portal).
     - Cargo e função descritos.
     - Órgão de lotação.
     - Categoria funcional declarada no portal de origem vs. Regime canônico atribuído.
   - Fornecer busca rápida por nome/cargo e contagem total de registros (ex: 187 profissionais em 2026).

10. **Testes Unitários, Fixtures e Qualidade (Regras do AGENTS.md):**
    - Testes unitários para `ModalDialog` e `TruncatedCellWithModal` em `packages/ui`.
    - Testes de renderização mobile responsiva (cards) e desktop (tabela) nas seções de licitações e contratos.
    - Sincronização obrigatória de fixtures de banco se houver alteração nos marts dbt (`make db/fixture/dump` e `make db/fixture/check`).
    - Validação completa com `make test/ts`, `make check` e `make test`.

---

## Tasks / Subtasks

- [x] Task 1: Componentes `ModalDialog` e `TruncatedCellWithModal` no `@transparencia/ui` (AC: 1, 2, 3)
  - [x] Criar `packages/ui/src/components/modal-dialog.tsx` com responsividade mobile/desktop e acessibilidade.
  - [x] Criar `packages/ui/src/components/truncated-cell-with-modal.tsx` com suporte a `line-clamp`, gatilho de leitura e botão de cópia rápida.
  - [x] Exportar novos componentes em `packages/ui/src/index.ts`.
  - [x] Adicionar testes unitários com Vitest em `packages/ui`.
- [x] Task 2: Suporte a Valor Homologado vs. Estimado no dbt e Kysely (AC: 5)
  - [x] Adicionar colunas `valor_estimado` e `valor_homologado` em `int_licitacoes_consolidadas.sql` e `fct_licitacoes.sql`.
  - [x] Atualizar `LicitacaoEmAndamentoDTO` e query em `packages/db/src/queries/licitacoes-metrics.ts`.
  - [x] Executar `make db/fixture/dump` para manter sincronia de fixtures (Regra 21 do AGENTS.md).
- [x] Task 3: Adaptação Mobile Responsiva para Licitações e Contratos (AC: 4, 5)
  - [x] Implementar visualização adaptativa de Cards Verticais no mobile (`block sm:hidden`) e `DenseTable` no desktop (`hidden sm:block`) em `apps/web/components/licitacoes-em-andamento-section.tsx`.
  - [x] Exibir Valor Estimado e Valor Homologado com indicador de economia/deságio na tabela e nos cards.
  - [x] Implementar visualização adaptativa de Cards Verticais no mobile para `apps/web/components/licitacoes-table.tsx` e `contratos-servicos-vigentes-section.tsx`.
  - [x] Integrar `TruncatedCellWithModal` na coluna `OBJETO` e nos cards em todas as tabelas citadas e em `saude-contratacao-section.tsx`.
- [x] Task 4: Ajustes de Layout, Remoção de Modalidades e Realocação de Itens (AC: 6, 7)
  - [x] Remover a seção `DistribucaoModalidadesChart` em `apps/web/app/[portalSlug]/licitacoes/page.tsx`.
  - [x] Remover indicador de compras em andamento de `apps/web/components/radar-civico-feed.tsx`.
  - [x] Adicionar contagem de compras em andamento no card "Licitações e Contratos" em `apps/web/app/[portalSlug]/view-model.tsx`.
  - [x] Mover bloco de redes de `packages/ui/src/components/sidebar.tsx` para o rodapé global da página em `apps/web/app/layout.tsx`.
- [x] Task 5: Auto-filtro, Destaque e Abertura de Modal via Deep Link em Licitações (AC: 8)
  - [x] Implementar leitura de query params e aplicação de filtro na tabela/cards de licitações.
  - [x] Implementar scroll suave e animação de destaque temporário na linha/card correspondente.
  - [x] Implementar detecção do fragmento `#itens` na URL e disparo automático do modal de itens licitados daquele processo.
- [x] Task 6: Modal de Auditoria de Vínculos de Pessoal com Inconsistência (AC: 9)
  - [x] Adicionar query Kysely em `@transparencia/db` para listar servidores com inconsistência cadastral por ano/portal.
  - [x] Integrar gatilho no card do Radar Cívico e na seção `#regime` de `/pessoal`.
  - [x] Renderizar `ModalDialog` com tabela pesquisável/paginada dos servidores divergentes.
- [x] Task 7: Testes Automatizados e Validação Geral (AC: 10)
  - [x] Atualizar e adicionar testes unitários de componentes e páginas.
  - [x] Executar `make test/ts`, `make check` e `make test`.

---

## Review Triage Log

### 2026-09-19 — Review pass
- verdicts: 18 findings — high 0, medium 12, low 2, false 4, maybe-false 0
- findings:
  - `[medium]` `[patch]` ModalDialog: onClose in useEffect deps triggers focus stealing — Applied fix: stored onClose in ref and excluded from effect dependencies.
  - `[medium]` `[patch]` ModalDialog: Text selection releasing mouse over backdrop closes modal — Applied fix: tracked mouseDownTarget and only closed when click originated on backdrop.
  - `[medium]` `[patch]` TruncatedCellWithModal: Timeout in handleCopy unmounted leak — Applied fix: added timeout ref and cleanup on unmount.
  - `[low]` `[patch]` TruncatedCellWithModal: Outer div with role="button" — Applied fix: made "Ver mais" an explicit button and removed button role from outer container.
  - `[medium]` `[patch]` Sidebar & sidebar-wrapper: Orphaned socialLinksSlot prop — Applied fix: removed dead prop from SidebarProps and wrapper.
  - `[low]` `[patch]` licitacoes/page.tsx: Unused modalidades destructuring — Applied fix: removed modalidades from destructuring.
  - `[medium]` `[patch]` RadarCivicoFeed: Orphaned countLicitacoes / licitacoesEmAndamentoCount — Applied fix: removed unused props and variable.
  - `[medium]` `[patch]` GlobalFooter: Footer overlapping MobileBottomNav — Applied fix: added responsive pb-20 md:pb-6 padding and normalized protocol.
  - `[medium]` `[patch]` AGENTS.md Rule 13: Nested ternaries in contrato-servico-vigente-card and licitacoes-em-andamento-section — Applied fix: converted to helper functions / IIFEs.
  - `[medium]` `[patch]` LicitacoesEmAndamentoSection: Missing homologado pending state in mobile card — Applied fix: rendered explicit "Em disputa / Aguardando homologação".
  - `[medium]` `[patch]` LicitacoesEmAndamentoSection: topDestaques lacks homologado and TruncatedCellWithModal — Applied fix: added TruncatedCellWithModal and homologado badge to topDestaques.
  - `[medium]` `[patch]` LicitacoesEmAndamentoSection: #itens deep link re-opening on every render — Applied fix: restricted deep link trigger to mount via hasCheckedDeepLinkRef.
  - `[medium]` `[patch]` Verification Gap: Missing unit test for valorHomologado, economy badge, and deep linking — Applied fix: added tests in licitacoes-em-andamento-section.spec.tsx.
  - `[medium]` `[patch]` Verification Gap: Missing test for servidoresDivergentes modal — Applied fix: added test in pessoal-regime-section.spec.tsx.
  - `[medium]` `[patch]` Verification Gap: Missing test for countComprasAndamento in view-model — Applied fix: added tests in view-model.spec.ts.
  - `[medium]` `[patch]` Verification Gap: Missing test for DenseTable renderMobileCard — Applied fix: added dense-table.spec.tsx in packages/ui.
  - `[false]` `[reject]` Loss of sorting controls on mobile — Mobile card view is intentionally streamlined without heavy header click targets; default sorting by relevance/value is preserved.
  - `[false]` `[reject]` Types override in ui tsconfig — Vitest jest-dom types are required for UI component tests and build passes cleanly with zero errors.

---

## Auto Run Result

### Summary of Implemented Changes
- Implementação dos componentes acessíveis `ModalDialog` (responsivo para bottom sheet em mobile e centralizado em desktop) e `TruncatedCellWithModal` (célula expansível com cópia rápida e suporte a links externos) no `@transparencia/ui`.
- Adaptação responsiva híbrida de tabelas em `DenseTable` via `renderMobileCard`: Cards verticais no mobile (`block sm:hidden`) e tabela densa tabular no desktop (`hidden sm:block`) para Licitações em Andamento, Contratos/Dispensas e Contratos de Serviços Vigentes.
- Suporte a `valor_estimado` e `valor_homologado` na modelagem dbt (`int_licitacoes_consolidadas.sql`, `fct_licitacoes.sql`), na camada Kysely (`@transparencia/db`) e na interface (tabela e cards com cálculo de deságio/economia).
- Remoção do gráfico `DistribucaoModalidadesChart` em `/licitacoes` para redução de redundância.
- Criação do `GlobalFooter` institucional com canais sociais e link oficial seguro; remoção do bloco de redes do `Sidebar`.
- Realocação do indicador de compras em andamento do Radar Cívico para o card de visão geral na Home.
- Auditoria nominal de servidores públicos com divergência cadastral em `/pessoal` via `ModalDialog`.
- Deep linking com destaque visual e abertura automática de itens licitados via `#itens`.

### Files Changed
- `packages/ui/src/components/modal-dialog.tsx`: Componente de modal acessível WAI-ARIA com focus trap e suporte responsivo.
- `packages/ui/src/components/truncated-cell-with-modal.tsx`: Componente de célula expansível com modal e cópia para clipboard.
- `packages/ui/src/components/dense-table.tsx`: Prop renderMobileCard para renderização adaptativa mobile/desktop.
- `packages/ui/src/components/sidebar.tsx`: Remoção do bloco de redes sociais.
- `packages/ui/src/components/__tests__/`: Suíte de testes unitários para modal-dialog, truncated-cell-with-modal e dense-table.
- `elt/transform/models/intermediate/int_licitacoes_consolidadas.sql`: Exposição de valor_estimado e valor_homologado.
- `elt/transform/models/marts/fct_licitacoes.sql`: Exposição de valor_estimado e valor_homologado.
- `packages/db/src/queries/licitacoes-metrics.ts`: DTO e query com suporte a valorHomologado.
- `packages/db/src/queries/pessoal-regime-metrics.ts`: Query getServidoresDivergenciasCadastraisPessoal.
- `packages/db/tests/fixtures/schema.sql.gz` & `seed.ts`: Fixture sincronizada com dbt.
- `apps/web/components/global-footer.tsx`: Rodapé com canais sociais e link oficial.
- `apps/web/app/layout.tsx`: Integração do GlobalFooter.
- `apps/web/app/[portalSlug]/licitacoes/page.tsx`: Remoção do gráfico de modalidades.
- `apps/web/components/licitacoes-em-andamento-section.tsx`: TruncatedCellWithModal, valores homologados, cards mobile e deep link.
- `apps/web/components/licitacoes-table.tsx`: TruncatedCellWithModal e cards mobile.
- `apps/web/components/contratos-servicos-vigentes-section.tsx` & `contrato-servico-vigente-card.tsx`: TruncatedCellWithModal e cards mobile.
- `apps/web/components/saude-contratacao-section.tsx`: TruncatedCellWithModal na coluna de objeto.
- `apps/web/components/pessoal-regime-section.tsx`: ModalDialog de auditoria nominal de divergências cadastrais.
- `apps/web/components/radar-civico-feed.tsx` & `apps/web/app/[portalSlug]/view-model.tsx`: Realocação de compras em andamento.

### Verification Performed
- `make test/ts`: 466/466 testes aprovados no workspace TypeScript (apps/web, @transparencia/ui, @transparencia/db).
- `make check`: `ruff check`, `ruff format --check` e `mypy` 100% aprovados sem alertas.
- `make test`: 43/43 testes em pytest aprovados com sucesso.
- `make db/fixture/check`: 4/4 testes de paridade de tabelas, colunas, tipos e seeds aprovados.

### Residual Risks
- Nenhum risco residual identificado. Todas as suítes e verificações estáticas e dinâmicas foram executadas com sucesso.

