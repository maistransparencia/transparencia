---
title: 'Story 13.8: Deep-Link e Modal de Detalhes de Contratos com Retenção de Busca'
type: 'feature'
created: '2026-09-21'
status: 'ready-for-dev'
baseline_revision: '3a6f748'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - apps/web/components/contratos-servicos-vigentes-section.tsx
  - apps/web/components/contrato-servico-vigente-card.tsx
  - apps/web/components/licitacoes-spotlight-modal.tsx
  - packages/db/src/queries/contratos-servicos-vigentes.ts
  - packages/db/src/queries/licitacoes-contratos-search.ts
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Quando o usuário localiza um contrato público através da busca global (Spotlight Modal) ou recebe um link compartilhado, ele é apenas redirecionado genericamente para a âncora `#contratos-servicos-vigentes`. O contrato específico não é aberto nem destacado, forçando o cidadão a caçar novamente o registro em meio a dezenas de linhas da tabela paginada, perdendo o contexto e quebrando a expectativa de navegação já consolidada nas licitações.

**Approach:** Implementar suporte nativo a deep-link de contratos na URL (`?contratoNumero=...` ou `?contratoId=...`), criar o componente modal de detalhes ricos do contrato (`ModalDialog` com visão 360° da execução físico-financeira: dados cadastrais, fornecedor, objeto integral, vigência, empenhado, liquidado, pago, saldo e barra de progresso) integrado à tabela `ContratosServicosVigentesSection`, e assegurar a experiência em camadas (Master-Detail) com retorno fluido ao Spotlight Modal ao fechar o contrato quando acionado pela busca.

## Boundaries & Constraints

**Always:**
- Seguir estritamente o padrão Master-Detail já existente e validado em Licitações (`licitacao:selected` e `contrato:selected` via eventos customizados ou URL search params `contratoNumero` / `contratoId`).
- Manter o modal de busca Spotlight ativo/reaberto em camadas quando o contrato for selecionado a partir da busca (paridade com `fromSearch: true`).
- No modal de detalhes do contrato, exibir todas as métricas fiscais com nomes explícitos e sem abreviações (Regra 9 do AGENTS.md): `totalEmpenhado`, `totalLiquidado`, `totalPago`, `saldoPendente`, `percentualPago`.
- Se o contrato buscado pertencer a um status de execução diferente do filtro ativo da tabela (`em_execucao`, `concluido`, `inexecutado`), o componente deve alternar automaticamente o filtro de status ou garantir que o modal abra independentemente do filtro visual da tabela.
- Garantir acessibilidade plena: `role="dialog"`, fechamento com tecla `Escape`, foco gerenciado e rótulos acessíveis.
- Respeitar todas as regras de `AGENTS.md` (Regra 13: zero ternários aninhados; Regra 18: camelCase obrigatório em DTOs; Regra 20: links oficiais para leis citadas se houver fundamentação).
- Cobrir com testes unitários em `contratos-servicos-vigentes-section.spec.tsx` e `licitacoes-spotlight-modal.spec.tsx`.

**Never:**
- Proibido quebrar a busca ou fechar abruptamente a aplicação sem permitir que o usuário retorne aos resultados anteriores da busca.
- Proibido usar campos abreviados ou opacos no DTO (`c_valor`, `pg`, etc.).
- Proibido ternários aninhados em condicionais de badge ou formatação de status.

## Acceptance Criteria

1. **Given** a seção de contratos de serviços vigentes (`ContratosServicosVigentesSection`) em `/[portalSlug]/licitacoes`
   - **When** a página é carregada com os parâmetros de URL `contratoNumero=...` ou `contratoId=...` (ou evento `contrato:selected`)
   - **Then** identifica o contrato correspondente e abre automaticamente o Modal de Detalhes do Contrato.
   - **And** rola a tela até a seção `#contratos-servicos-vigentes` e aplica destaque visual temporário (highlight/ring sutil) na linha da tabela caso visível.

2. **Given** o Spotlight Modal de busca global (`LicitacoesSpotlightModal`)
   - **When** o usuário clica em um resultado de Contrato (ou pressiona `Enter` selecionando um contrato)
   - **Then** atualiza a URL via `replaceState` ou navegação mantendo o contexto e dispara a abertura do Modal de Detalhes do Contrato.
   - **And** ao fechar o Modal do Contrato, o usuário retorna suavemente para o Spotlight Modal com os termos e resultados da busca preservados (experiência em camadas / Master-Detail).

3. **Given** o Modal de Detalhes do Contrato aberto
   - **When** renderizado na tela (desktop ou mobile fullscreen/bottom-sheet)
   - **Then** exibe de forma organizada e legível:
     - Cabeçalho: Número do contrato, ano, badge de status de execução (`Em Execução`, `Concluído`, `Não Executado`).
     - Fornecedor: Razão social completa e CNPJ/CPF formatado.
     - Objeto: Descrição integral do objeto contratado, sem corte ou truncamento.
     - Vigência: Data de início, vencimento atual e prazo total formatados.
     - Painel Financeiro: Cards com valor aditado/total, total empenhado, liquidado, pago e saldo a liquidar/pagar, acompanhados de barra de progresso visual de percentual pago.
     - Ações: Botão de fechar acessível e botão "Voltar à busca" visível quando originado de uma pesquisa.

4. **Given** a tabela densa de contratos em `ContratosServicosVigentesSection`
   - **When** o usuário navega diretamente pela tabela
   - **Then** cada linha possui ação de clique no número ou botão "Detalhes" que abre o mesmo modal rico, unificando a experiência para navegação via busca ou via tabela.

5. **Given** a suíte de testes automatizados
   - **When** executados `pnpm --filter web test`
   - **Then** valida a abertura via deep-link de URL, abertura via evento customizado, renderização de todos os campos fiscais no modal de contrato e retenção do contexto de busca.

## Code Map

- `apps/web/components/contrato-detalhes-modal.tsx` -- Novo componente client que encapsula o modal com informações completas, cards financeiros e barra de execução.
- `apps/web/components/contratos-servicos-vigentes-section.tsx` -- Suporte a deep-link (`contratoNumero`, `contratoId`), escuta de evento `contrato:selected`, estado `selectedContrato` e integração do modal.
- `apps/web/components/licitacoes-spotlight-modal.tsx` -- Atualização do `handleSelect` para contratos suportar camada de busca aberta (`fromSearch: true`) e emissão do evento `contrato:selected`.
- `packages/db/src/queries/licitacoes-contratos-search.ts` -- Ajuste do `href` gerado para contratos para incluir `contratoNumero` (ex: `/${slug}/licitacoes?ano=${ano}&contratoNumero=${encodeURIComponent(num)}#contratos-servicos-vigentes`).
- `apps/web/components/contratos-servicos-vigentes-section.spec.tsx` -- Testes unitários para deep-link, abertura de modal e renderização das métricas fiscais.

</intent-contract>
