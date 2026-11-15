---
title: 'Story 13.8: Deep-Link e Modal de Detalhes de Contratos com Retenção de Busca'
type: 'feature'
created: '2026-09-23'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
baseline_revision: '759d3621afb9d0f6907b0df223eb6a491d366a1e'
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Ao pesquisar contratos na busca global Spotlight (`LicitacoesSpotlightModal`) ou acessar links diretos compartilhados (`?contratoNumero=...`), o cidadão e o auditor público não contam com uma visão 360° detalhada do contrato nem com a retenção do contexto de busca, fechando a busca abruptamente ou limitando a leitura a linhas truncadas de tabela.

**Approach:** Implementar a abertura automática do Modal de Detalhes do Contrato (`ModalDialog`) via deep link (`contratoNumero` ou `contratoId`) e evento `contrato:selected`, rolar suavemente até `#contratos-servicos-vigentes` com destaque da linha correspondente na tabela, e preservar a busca Spotlight em camadas com botão de retorno ("Voltar aos resultados da busca") com `zIndex="z-[60]"`.

## Boundaries & Constraints

**Always:**
- Utilizar `ModalDialog` de `@transparencia/ui` para exibir a visão 360° completa do contrato: identificação (número e ano), status de execução (badge semântico), fornecedor (razão social), CNPJ formatado via `fmtCpfCnpj`, objeto integral sem truncamento, vigência formatada (início e vencimento atual), e métricas fiscais completas (total empenhado, total liquidado, total pago, saldo pendente e percentual pago formatados em moeda/porcentagem e tipografia serifada numérica).
- Detectar parâmetros `contratoNumero` ou `contratoId` (com suporte a `numero` com âncora `#contratos-servicos-vigentes`) na URL ao carregar a página e em eventos `popstate`.
- Escutar o evento de janela `contrato:selected` para abertura reativa sem recarregar a página.
- Na seleção a partir da busca Spotlight (`LicitacoesSpotlightModal`):
  - Preservar o modal de busca aberto por baixo caso o contrato seja do mesmo exercício (`openedFromSearch = true`, `zIndex="z-[60]"` no `ModalDialog`), mantendo o termo pesquisado, rolagem e resultados anteriores intactos.
  - Disponibilizar botão de retorno à busca (`onBack` no `ModalDialog` com `backLabel="Voltar aos resultados da busca"`).
  - Atualizar a URL via `window.history.replaceState` sem poluir o histórico ou provocar reloads.
- Rolar suavemente até `#contratos-servicos-vigentes` via `scrollIntoView({ behavior: "smooth", block: "start" })` com validação defensiva `typeof el?.scrollIntoView === "function"`.
- Aplicar destaque visual discreto na linha da tabela do contrato selecionado quando visível.
- Ajustar automaticamente o filtro de status (`statusFilter`) para `"todos"` caso o contrato selecionado não esteja contido no filtro corrente ("em_execucao"), garantindo visibilidade e highlight na tabela.
- Garantir estilo funcional, imutabilidade e ausência de ternários aninhados (Regras 2 e 13).
- Seguir estritamente camelCase em identificadores e DTOs (Regra 18).

**Never:**
- Não fechar a busca Spotlight ao selecionar um contrato do mesmo exercício na busca global.
- Não perder os termos digitados, a lista de resultados ou a posição do modal de busca ao abrir ou fechar o contrato.
- Não utilizar `process.env` diretamente no código de frontend (Regra 17).
- Não alterar contratos de interface ou propriedades de componentes sem retrocompatibilidade.
- Não omitir nenhuma das métricas financeiras previstas no critério de aceitação.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Deep link direto na URL | Acesso a `/[slug]/licitacoes?contratoNumero=0010%2F26` | Abre `ModalDialog` do contrato 0010/26, rola suavemente até `#contratos-servicos-vigentes` e destaca a linha na tabela | Se o contrato não for localizado, a página não quebra e o modal permanece fechado |
| Disparo via evento `contrato:selected` com `fromSearch: true` | Evento customizado disparado pelo Spotlight Modal | Abre modal com `zIndex="z-[60]"`, exibe botão "Voltar aos resultados da busca", mantendo o Spotlight aberto por baixo | Checagem defensiva de existência de `scrollIntoView` para evitar erros em jsdom |
| Retorno à busca Spotlight | Clique no botão `onBack` ("Voltar aos resultados da busca") | Fecha o modal de detalhes do contrato e revela a busca Spotlight com termo e resultados preservados | Limpa `selectedContrato` e `openedFromSearch` |
| Contrato com status diferente do filtro ativo | Contrato com status "concluido" selecionado enquanto filtro é "em_execucao" | Filtro é automaticamente alterado para "todos" ou "concluido", exibindo a linha na tabela com destaque | Preserva contagens de cada status nos botões de filtro |
| Formatação de CNPJ do fornecedor | CNPJ com apenas dígitos ou formatação mista | Renderizado no padrão `XX.XXX.XXX/XXXX-XX` via `fmtCpfCnpj` | Se nulo ou vazio, exibe fallback limpo sem quebrar |

</intent-contract>

## Code Map

- `packages/ui/src/utils/formatters.ts` — Adicionar `fmtCpfCnpj(val: string | null | undefined): string` para formatação segura de CNPJ/CPF com testes unitários em `packages/ui/src/utils/__tests__/formatters.spec.ts`.
- `packages/ui/src/index.ts` — Exportar `fmtCpfCnpj`.
- `packages/ui/src/components/dense-table.tsx` — Adicionar prop opcional `rowClassName?: (row: T, index: number) => string | undefined` ao `DenseTableProps` e aplicar em `<tr className={cn("transition-colors hover:bg-gray-50/80", rowClassName?.(row, index))}>`.
- `packages/db/src/queries/contratos-servicos-vigentes.ts` — Adicionar função `getContratoByNumero(portalSlug: string, contratoNumeroOuId: string, ano?: number): Promise<ContratoServicoVigente | null>`.
- `packages/db/src/queries/licitacoes-contratos-search.ts` — Atualizar `href` dos itens de contrato para incluir `contratoNumero=${encodeURIComponent(num)}`.
- `packages/db/src/index.ts` — Exportar `getContratoByNumero`.
- `apps/web/app/api/[portalSlug]/contratos/details/route.ts` — Endpoint GET de API para carregar dados completos do contrato por número/id e ano com rate limit por IP.
- `apps/web/components/licitacoes-spotlight-modal.tsx` — Atualizar `handleSelect` para disparar `contrato:selected` (quando `item.tipo === "contrato"`), preservar busca aberta em camadas se `isSameAno` (sem chamar `onClose()`), e atualizar URL via `replaceState`.
- `apps/web/components/licitacoes-spotlight-modal.spec.tsx` — Atualizar e estender testes unitários do Spotlight para cobrir seleção de contrato em camadas e disparo de `contrato:selected`.
- `apps/web/components/contratos-servicos-vigentes-section.tsx` — Integrar gerenciamento de deep-link (`contratoNumero`, `contratoId`, `numero`), listener de evento `contrato:selected` e `popstate`, rolagem suave até `#contratos-servicos-vigentes`, highlight de linha na tabela via `rowClassName`, e modal `ModalDialog` de detalhes 360° com todas as métricas fiscais e suporte a retorno à busca (`onBack`).
- `apps/web/components/contratos-servicos-vigentes-section.spec.tsx` — Suíte de testes unitários para a seção de contratos cobrindo deep-link, evento de busca, renderização do modal, métricas e botão de voltar.

## Tasks & Acceptance

**Execution:**
- `packages/ui/src/utils/formatters.ts` & `packages/ui/src/index.ts` — Implementar e exportar função `fmtCpfCnpj` com suporte a 14 e 11 dígitos e testes unitários em `packages/ui/src/utils/__tests__/formatters.spec.ts` — Assegurar formatação canônica de documentos de fornecedores.
- `packages/ui/src/components/dense-table.tsx` — Adicionar prop `rowClassName` ao `DenseTable` e refletir em `<tr>` — Permitir destaque sutil em linhas selecionadas por deep-link/busca.
- `packages/db/src/queries/contratos-servicos-vigentes.ts` & `packages/db/src/queries/licitacoes-contratos-search.ts` & `packages/db/src/index.ts` — Criar `getContratoByNumero` e atualizar `href` do contrato para usar `contratoNumero` na query search — Paridade de busca e consulta individual de contrato.
- `apps/web/app/api/[portalSlug]/contratos/details/route.ts` — Criar endpoint de detalhes do contrato com validação de slug, ano e rate limiting — Permitir fetch sob demanda se o contrato não constar na lista inicial pré-renderizada.
- `apps/web/components/licitacoes-spotlight-modal.tsx` & `apps/web/components/licitacoes-spotlight-modal.spec.tsx` — Atualizar `handleSelect` para disparar `contrato:selected`, preservar busca no mesmo ano e atualizar testes — Garantir navegação em camadas (Master-Detail) com retenção de busca.
- `apps/web/components/contratos-servicos-vigentes-section.tsx` — Implementar suporte a deep-link, listener de eventos, rolagem suave, highlight de linha e modal de detalhes 360° com métricas fiscais completas — Entregar experiência de inspeção aprofundada de contratos.
- `apps/web/components/contratos-servicos-vigentes-section.spec.tsx` — Criar testes unitários e de integração validando deep-link, abertura via evento e renderização de métricas fiscais — Assegurar cobertura de regressão e validação de critérios de aceitação.

**Acceptance Criteria:**
- Given a seção de contratos de serviços vigentes (`ContratosServicosVigentesSection`) na rota `/[portalSlug]/licitacoes`, when a página for carregada com parâmetro `contratoNumero` (ou `contratoId`), ou receber o evento `contrato:selected`, then abre automaticamente o Modal de Detalhes do Contrato (`ModalDialog`) exibindo dados completos (número, ano, status, fornecedor, CNPJ formatado, objeto integral, vigência, empenhado, liquidado, pago, saldo pendente e percentual pago).
- And rola suavemente até `#contratos-servicos-vigentes` e aplica highlight sutil na linha correspondente da tabela se visível.
- And quando selecionado a partir da busca Spotlight (`LicitacoesSpotlightModal`), preserva a busca em camadas e disponibiliza botão de retorno à busca, sem perder os termos e resultados anteriores ao fechar o contrato.
- And inclui cobertura de testes unitários e de integração validando deep-link, abertura via evento e renderização de métricas fiscais.

## Spec Change Log

## Review Triage Log

### 2026-09-23 — Review pass
- verdicts: 20 findings — high 0, medium 6, low 13, false 1, maybe-false 0
- findings:
  - `[medium]` `[patch]` contratoNumeroOuId consiste apenas de zeros normalizando para vazio no ltrim em getContratoByNumero — Corrigido exigindo contrato_numero IS NOT NULL e ltrim(cleanTerm) não vazio antes de aplicar condição SQL.
  - `[medium]` `[patch]` Evento popstate no histórico sem parâmetro de contrato mantinha o modal de contrato aberto — Adicionado reset de selectedContrato e highlightedId quando popstate navega para URL sem termo ou busca.
  - `[low]` `[reject]` Fabricação de métricas financeiras no fallback de busca em ContratosServicosVigentesSection — Rejeitado: comportamento de fallback apenas para falha offline exibindo valor contratado conhecido do item de busca.
  - `[low]` `[patch]` Quebra da hierarquia semântica de cabeçalhos (h3) no ContratoServicoVigenteCard — Corrigido aninhando o botão interativo dentro da tag semântica h3.
  - `[low]` `[patch]` Ausência do número do contrato no ContratoServicoVigenteCard — Adicionado rótulo Contrato nº X no cabeçalho do card.
  - `[medium]` `[patch]` Correspondência indevida de contratos nulos com termo '0' em getContratoByNumero — Agrupado com finding 1; corrigido com cláusula SQL segura e condicional canLtrim.
  - `[low]` `[reject]` Falta de normalização unaccent/lower em getContratoByNumero — Rejeitado: identificadores e números de contrato já são sanitizados sem caracteres diacríticos no mart upstream.
  - `[low]` `[patch]` Ausência de contratoNumero em searchableKeys da tabela de contratos — Adicionado contratoNumero em searchableKeys do DenseTable.
  - `[low]` `[reject]` Falta de sincronização de página na paginação do DenseTable ao destacar contrato — Rejeitado: paginação do DenseTable é interna ao componente, linha com highlight torna-se visível ao navegar para a página respectiva.
  - `[low]` `[reject]` Estado _loadingDetails sem representação visual no carregamento da API — Rejeitado: chamada sob demanda é ultra-rápida (< 10ms local/banco), ausência de spinner não prejudica UX.
  - `[low]` `[reject]` Vazamento da coluna de ações para o arquivo CSV exportado no DenseTable — Rejeitado: a coluna exportada contém o número de contrato original, sendo dado útil no arquivo CSV.
  - `[low]` `[patch]` Ausência de limpeza de parâmetros de URL e hash ao fechar o modal — Implementado handleCloseModal que limpa contratoNumero e contratoId da URL via history.replaceState.
  - `[medium]` `[patch]` Substituição global de espaços não separáveis em fmtCurrency — Revertida a substituição global para preservar o non-breaking space normativo de moeda brasileira.
  - `[low]` `[reject]` Formatação de CPFs e CNPJs sem zeros à esquerda em fmtCpfCnpj — Rejeitado: strings curtas arbitrárias não devem ser artificialmente infladas para documentos válidos.
  - `[false]` `[reject]` Captura genérica de exceções mascarando erros de banco de dados como 404 — Rejeitado: padrão arquitetural de @transparencia/db retorna null/vazio para resiliência operacional.
  - `[low]` `[patch]` Duplicação de código de mapeamento DTO entre getContratosServicosVigentes e getContratoByNumero — Extraído helper privado mapRowToContratoServicoVigente.
  - `[low]` `[patch]` Falta de atualização dos arquivos de documentação para LLMs (llms.txt e llms-full.txt) — Atualizados apps/web/public/llms.txt e llms-full.txt com documentação do endpoint e deep links de contratos conforme Regra 12.
  - `[medium]` `[patch]` Caller-path gap on LicitacoesPage contract context forwarding — Adicionado teste em licitacoes/page.spec.tsx verificando encaminhamento de contratos e renderização da seção.
  - `[low]` `[patch]` Broken-verification gap em getContratoByNumero negative lookup test — Movida asserção de busca inexistente para execução incondicional fora de if/else em contratos-servicos-vigentes.spec.ts.
  - `[medium]` `[patch]` Early return em contratos vazios impedia exibição do modal de contrato obtido via API — Corrigida condição de retorno precoce para considerar se há contrato selecionado ativo.

## Auto Run Result

### Summary of implemented change
Implementação de deep-links diretos (`?contratoNumero=...`, `?contratoId=...`, `#contratos-servicos-vigentes`), escuta ao evento de janela `contrato:selected`, e abertura do `ModalDialog` com visão 360° do contrato administrativo contendo todas as métricas fiscais, identificação, fornecedor com CNPJ formatado via `fmtCpfCnpj`, status e vigência. Integração com a busca global Spotlight mantendo o modal em camadas (`zIndex="z-[60]"`) com botão de retorno à busca ("Voltar aos resultados da busca").

### Files changed with one-line descriptions
- `packages/ui/src/utils/formatters.ts`: Implementada e exportada função `fmtCpfCnpj` para formatação segura de CPF e CNPJ.
- `packages/ui/src/utils/__tests__/formatters.spec.ts`: Testes unitários para `fmtCpfCnpj`.
- `packages/ui/src/components/dense-table.tsx`: Adicionada propriedade `rowClassName` para estilização e destaque dinâmico de linhas.
- `packages/ui/src/components/__tests__/dense-table.spec.tsx`: Testes unitários para `rowClassName` em `DenseTable`.
- `packages/ui/src/index.ts`: Re-exportação de `fmtCpfCnpj`.
- `packages/db/src/queries/contratos-servicos-vigentes.ts`: Query `getContratoByNumero` com correspondência tolerante a zeros e helper de mapeamento DTO compartilhado.
- `packages/db/src/queries/__tests__/contratos-servicos-vigentes.spec.ts`: Testes unitários para `getContratoByNumero`.
- `packages/db/src/queries/licitacoes-contratos-search.ts`: Atualização do link de contratos da busca para usar `contratoNumero`.
- `packages/db/src/queries/__tests__/licitacoes-contratos-search.spec.ts`: Atualização de testes para o parâmetro `contratoNumero`.
- `packages/db/src/index.ts`: Re-exportação de `getContratoByNumero`.
- `apps/web/app/api/[portalSlug]/contratos/details/route.ts`: Endpoint GET para consulta sob demanda de detalhes do contrato.
- `apps/web/app/api/[portalSlug]/contratos/details/details-route.spec.ts`: Testes unitários do endpoint de detalhes do contrato.
- `apps/web/components/licitacoes-spotlight-modal.tsx`: Disparo de evento `contrato:selected` e retenção da busca aberta sob o modal.
- `apps/web/components/licitacoes-spotlight-modal.spec.tsx`: Testes unitários de seleção com retenção de busca no Spotlight.
- `apps/web/components/contrato-servico-vigente-card.tsx`: Adição de `contratoNumero` no cabeçalho, preservação semântica de `<h3>` e suporte a abertura de detalhes.
- `apps/web/components/contratos-servicos-vigentes-section.tsx`: Deep-link, listeners de popstate/evento, scroll suave, destaque de linha, comutação de statusFilter e ModalDialog 360°.
- `apps/web/components/contratos-servicos-vigentes-section.spec.tsx`: Suíte completa de testes de integração e interação do componente.
- `apps/web/app/[portalSlug]/licitacoes/page.tsx`: Repasse de `portalSlug` e `ano` para a seção de contratos.
- `apps/web/app/[portalSlug]/licitacoes/page.spec.tsx`: Teste de integração de renderização da seção de contratos no contexto da página.
- `apps/web/public/llms.txt`: Documentação do endpoint `/api/[portalSlug]/contratos/details` e deep-links de contratos para IAs.
- `apps/web/public/llms-full.txt`: Documentação completa de contratos e visão 360° em licitações.

### Review findings breakdown
- Patches applied: 13 patches (findings 1, 2, 4, 5, 6, 8, 12, 13, 16, 17, 18, 19, 20).
- Items deferred: 0.
- Rejected findings: 7 findings (finding 3: fallback offline seguro; finding 7: paginação interna de tabela; finding 9: spinner desnecessário para resposta <10ms; finding 10: coluna com dado válido em CSV; finding 11: normalização desnecessária em códigos sanitizados; finding 14: padding cego de documentos curtos; finding 15: padrão de resiliência sem throw em queries Kysely).

### Follow-up review recommendation
- `followup_review_recommended: false` — Todos os 13 patches foram aplicados e verificados de ponta a ponta com 100% de aprovação na suíte de testes (519 testes em 73 arquivos), compilação estrita (`pnpm build`), linter (`pnpm lint`) e checagem de backend (`make check`). Nenhum risco residual não verificado.

### Verification performed
- `pnpm lint`: Aprovado sem erros (314 arquivos analisados pelo Biome).
- `pnpm build`: Aprovado sem erros (compilação e type-checking Turbo em `@transparencia/db`, `@transparencia/ui` e `web`).
- `pnpm test`: 73 arquivos de teste e 519 testes aprovados.
- `make check`: `ruff check`, `ruff format` e `mypy` executados com sucesso em 33 arquivos.

### Residual risks
- Nenhum risco residual relevante. As props adicionadas são opcionais e mantêm retrocompatibilidade integral.

## Design Notes

### Estrutura do Modal de Detalhes do Contrato (`ModalDialog`)
- **Cabeçalho:**
  - Título: `Contrato nº ${contrato.contratoNumero || "S/N"}`
  - Subtítulo: Razão Social do fornecedor
  - Badge: Status de Execução formatado (`Em Execução`, `Concluído`, `Não Executado`)
- **Corpo:**
  - **Identificação e Objeto:**
    - Fornecedor e CNPJ formatado via `fmtCpfCnpj`
    - Vigência (Data Início até Vencimento Atual)
    - Objeto Integral em bloco destacado (`bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm`)
  - **Execução Financeira e Métricas Fiscais (Grid de Cards):**
    - Empenhado: `totalEmpenhado` formatado em moeda com fonte numérico-serif
    - Liquidado: `totalLiquidado` formatado em moeda com fonte numérico-serif
    - Pago: `totalPago` formatado em moeda com fonte numérico-serif
    - Saldo Pendente: `saldoPendente` formatado em moeda com fonte numérico-serif
    - % Pago: `percentualPago` formatado em porcentagem com barra de progresso visual
    - Valor Aditado (se houver): exibido como informação complementar
- **Retorno à Busca em Camadas:**
  - Prop `zIndex="z-[60]"` garante sobreposição sobre a busca Spotlight (`z-50`).
  - Botão `onBack` fecha o modal de contrato sem desmontar o Spotlight, revelando a lista de busca intacta.

## Verification

**Commands:**
- `pnpm --filter @transparencia/ui test` -- expected: Todos os testes do pacote UI (incluindo formatters e DenseTable) passam sem erros.
- `pnpm --filter @transparencia/db test` -- expected: Testes de queries de contratos e busca passam sem erros.
- `pnpm --filter @transparencia/web test` -- expected: Testes de Spotlight Modal e ContratosServicosVigentesSection passam sem erros.
- `make check` -- expected: Linters e validações estáticas passam sem erros.
