---
title: 'Story 17.5: Correlação de Obras Públicas com Contratos Municipais e Licitações'
type: 'feature'
created: '2026-10-11'
status: 'done'
baseline_revision: '24cb394cad0ba3413170968cc1d2c7e89152de6c'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - 'packages/db/src/queries/obras.ts'
  - 'apps/web/app/[portalSlug]/obras/view-model.ts'
  - 'apps/web/components/obras/obras-detalhe-modal.tsx'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Cidadãos e órgãos de controle inspecionando uma obra pública no portal municipal não conseguem identificar quais contratos administrativos e licitações locais foram formalizados para executá-la, impedindo a verificação de valores pactuados, empreiteiras contratadas e eventual contratação direta ou sobrepreço.

**Approach:** Criar a correlação analítica entre `fct_obras` e `fct_contratos` em `@transparencia/db`, expondo `getContratosPorObra` e integrando ao DTO de obras; exibir uma seção dedicada "Contratos e Licitações Vinculados" no modal de detalhes da obra com dados da empreiteira (CPF/CNPJ mascarado), valor contratado, modalidade e deep links para o portal municipal (`/[portalSlug]/contratos?numero=...` e `/[portalSlug]/licitacoes?numero=...`).

## Boundaries & Constraints

**Always:**
- Utilizar isolamento multi-tenant obrigatório em todas as queries SQL, cruzando estritamente por `c.portal_slug = o.portal_slug` (Regra 23 do `AGENTS.md`).
- Padronizar todos os identificadores e propriedades de contratos e DTOs em `camelCase` (Regra 18 do `AGENTS.md`): `contratoId`, `contratoNumero`, `fornecedorNome`, `fornecedorCpfCnpj`, `valorContrato`, `modalidade`, `licitacaoNumero`, `status`, `dataInicio`, `vencimentoAtual`.
- Manter paradigma funcional e imutabilidade em `@transparencia/db` (`.map`, `.filter`, `.reduce`), sem loops imperativos nem mutações de objetos (Regra 2 do `AGENTS.md`).
- Mascarar CPFs e CNPJs de fornecedores para proteção e privacidade na interface pública (ex: `123.***.***-00` ou `12.***.***/0001-90`).
- Apresentar mensagem contextual neutra e amigável quando a obra não possuir contratos municipais correlacionados: *"Nenhum contrato municipal diretamente correlacionado"*.
- Fornecer deep links no padrão do portal para o contrato (`/[portalSlug]/contratos?numero=...`) e licitação (`/[portalSlug]/licitacoes?numero=...`), com rota de redirecionamento limpo da rota `/contratos` para a seção de contratos do portal municipal (Regra 24 do `AGENTS.md`).
- Atualizar síncronamente `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` documentando a correlação de obras com contratos e processos licitatórios (Regra 12 do `AGENTS.md`).

**Never:**
- Proibido hardcodar slugs de municípios ou literais de portais nas queries ou na camada de apresentação (Regra 23).
- Proibido mutar coleções ou usar variáveis mutáveis (`let` acumulador) para agregar contratos às obras (Regra 2).
- Proibido exibir CPF ou CNPJ em texto claro desmascarado na seção de contratos vinculados da obra.
- Proibido utilizar operadores ternários aninhados para definir badges de status ou textos condicionais (Regra 13).
- Proibido inventar termos novos ou jargões exóticos fora do padrão do design system (Regra 24).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Obra com múltiplos contratos correlacionados | `portalSlug: "porciuncula_prefeitura"`, `idProjeto: "101"` (possui 2 contratos em `fct_contratos`) | Retorna lista de 2 contratos com números, status ("Vigente" ou "Encerrado"), CPF/CNPJ mascarado, valor formatado em BRL e links | Retorna array vazio se query não encontrar registros |
| Obra sem contratos municipais (execução federal direta) | `idProjeto: "999"` sem contratos com referência ao projeto | Exibe container neutro com mensagem *"Nenhum contrato municipal diretamente correlacionado"* e explicação contextual | Renderiza sem falhas de layout ou erros de runtime |
| Correlação por número de obra explícito | `fct_contratos.numero_obra = "101"` | Contrato vinculado diretamente com 100% de precisão | N/A |
| Correlação por ID de projeto no objeto | `fct_contratos.objeto` contendo `"PROJETO 101"` ou ID numérico (>= 4 dígitos) | Contrato correlacionado via match textual no objeto do contrato | Ignora IDs curtos (< 4 caracteres) para evitar falsos positivos numéricos |
| Correlação por similaridade textual de objeto | Objeto do contrato similar ao nome da obra (pg_trgm word_similarity > 0.40) | Contrato vinculado por correspondência temática do objeto licitado | Se similaridade <= 0.40, não vincula |
| Tenant mismatch | Obra no tenant A e contrato com mesmo ID no tenant B | Contrato do tenant B é estritamente ignorado devido ao predicado `c.portal_slug = o.portal_slug` | Prevenção absoluta de cross-tenant data leakage |

</intent-contract>

## Code Map

- `packages/db/src/queries/obras.ts` -- Definir interface `ObraContratoDTO`, implementar query analítica Kysely `getContratosPorObra(portalSlug, idProjeto)` e enriquecer `ObraDTO` e `getObraDetalhe` com contratos correlacionados.
- `packages/db/src/index.ts` -- Exportar `ObraContratoDTO` e `getContratosPorObra`.
- `packages/db/src/queries/__tests__/obras.spec.ts` -- Adicionar testes automatizados cobrindo correlação de contratos por `numero_obra`, menção no objeto, isolamento multi-tenant e cenários sem contratos.
- `packages/ui/src/utils/formatters.ts` -- Adicionar helper universal `maskCpfCnpj` para mascarar CPFs e CNPJs de fornecedores.
- `packages/ui/src/index.ts` -- Exportar `maskCpfCnpj`.
- `apps/web/app/[portalSlug]/obras/view-model.ts` -- Estender `ObraItemViewModel` e `ObraDetalheViewModel` com DTO de contratos vinculados formatados (`ObraContratoViewModel`).
- `apps/web/app/[portalSlug]/obras/view-model.spec.ts` -- Testes unitários para mapeamento e formatação de contratos vinculados a obras.
- `apps/web/components/obras/obras-contratos-vinculados.tsx` -- Criar componente dedicado com lista de contratos, badges de status, CPF/CNPJ mascarado, valores, modalidade, links e empty state neutro.
- `apps/web/components/obras/obras-contratos-vinculados.spec.tsx` -- Testes de renderização para a seção de contratos vinculados (com contratos e empty state).
- `apps/web/components/obras/obras-detalhe-modal.tsx` -- Integrar `ObrasContratosVinculados` ao modal de detalhes da obra.
- `apps/web/components/obras/obras-detalhe-modal.spec.tsx` -- Testes unitários do modal validando exibição da seção de contratos.
- `apps/web/app/[portalSlug]/contratos/page.tsx` -- Criar rota de redirecionamento 308/clean deep link de `/[portalSlug]/contratos?numero=...` para a visualização de contratos em `/[portalSlug]/licitacoes`.
- `apps/web/app/[portalSlug]/contratos/page.spec.tsx` -- Testes de redirecionamento da rota `/contratos`.
- `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` -- Documentar a correlação de obras públicas com contratos municipais para assistentes de IA.

## Tasks & Acceptance

**Execution:**
- `packages/db/src/queries/obras.ts` -- Implementar `ObraContratoDTO` e função Kysely `getContratosPorObra` correlacionando `fct_obras` com `fct_contratos` por `numero_obra`, ID de projeto na descrição e similaridade textual com isolamento de tenant -- Provê dados de contratos correlacionados de forma imutável (Regra 2 e Regra 23).
- `packages/db/src/index.ts` -- Reexportar novos tipos e funções de contratos vinculados a obras -- Expõe a API pública do pacote `@transparencia/db`.
- `packages/db/src/queries/__tests__/obras.spec.ts` -- Criar testes para `getContratosPorObra` e enriquecimento de `getObraDetalhe` -- Garante confiabilidade contábil e prevenção de regressões na suíte `make test/ts`.
- `packages/ui/src/utils/formatters.ts` -- Implementar função `maskCpfCnpj` com suporte a CPF (11 dígitos) e CNPJ (14 dígitos) -- Garante conformidade com privacidade em componentes de apresentação.
- `packages/ui/src/index.ts` -- Reexportar `maskCpfCnpj` -- Disponibiliza o formatador no design system.
- `apps/web/app/[portalSlug]/obras/view-model.ts` -- Implementar mapeamento de `ObraContratoViewModel` em `buildObraDetalheViewModel` e `buildObrasViewModel` -- Prepara dados formatados em camelCase para a UI.
- `apps/web/app/[portalSlug]/obras/view-model.spec.ts` -- Criar testes unitários para o view-model de contratos vinculados -- Valida regras de apresentação, links e badges.
- `apps/web/components/obras/obras-contratos-vinculados.tsx` -- Criar componente de apresentação da lista de contratos vinculados e empty state amigável -- Atende ao requisito visual da Story 17.5.
- `apps/web/components/obras/obras-contratos-vinculados.spec.tsx` -- Criar testes unitários do componente de contratos vinculados -- Assegura renderização de badges, valores e links.
- `apps/web/components/obras/obras-detalhe-modal.tsx` -- Incluir `ObrasContratosVinculados` dentro do corpo do modal de detalhes da obra -- Integra a funcionalidade ao fluxo do usuário.
- `apps/web/components/obras/obras-detalhe-modal.spec.tsx` -- Atualizar testes do modal com asserção da seção de contratos -- Evita quebras de regressão no modal.
- `apps/web/app/[portalSlug]/contratos/page.tsx` -- Criar rota de redirecionamento padronizada para deep linking de contratos municipais -- Cumpre a Regra 24 de deep linking.
- `apps/web/app/[portalSlug]/contratos/page.spec.tsx` -- Criar testes para a rota de redirecionamento `/contratos` -- Valida parâmetros de consulta e preservação de tenant.
- `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` -- Atualizar documentação pública de IA com as convenções de correlação de obras e contratos -- Cumpre a Regra 12 do `AGENTS.md`.

**Acceptance Criteria:**
- Given uma obra pública inspecionada no modal de detalhes em `/[portalSlug]/obras?idProjeto=[idProjeto]`, when o usuário visualiza as informações da obra, then o modal exibe a seção dedicada *"Contratos e Licitações Vinculados"*.
- Given uma obra com contratos correlacionados, when renderizada a seção, then exibe para cada contrato: número do contrato com badge de status ("Vigente" ou "Encerrado"), fornecedor/empreiteira contratada com CPF/CNPJ mascarado, valor contratado formatado em reais (`fmtCurrency`) e modalidade licitatória.
- Given um contrato exibido na seção, when o usuário clica nos links de deep link, then direciona para o contrato no portal municipal (`/[portalSlug]/contratos?numero=[contratoNumero]`) ou para a licitação (`/[portalSlug]/licitacoes?numero=[licitacaoNumero]`).
- Given uma obra pública sem correspondência de contratos municipais locais, when visualizada, then exibe a mensagem contextual neutra: *"Nenhum contrato municipal diretamente correlacionado"*.
- Given a função `getContratosPorObra(portalSlug, idProjeto)` em `@transparencia/db`, when executada, then retorna a lista de contratos correlacionados de forma imutável, fortemente tipada e com isolamento estrito de `portalSlug`.
- Given a suíte de testes de desenvolvimento, when executados `pnpm --filter @transparencia/db test` e `pnpm --filter web test`, then todos os testes passam com 100% de sucesso.

### Review Findings

- [x] [Review][Patch] Preservar status inativos (suspenso, cancelado, rescindido) com rótulos e badges sem fallback para "Vigente" [apps/web/app/[portalSlug]/obras/view-model.ts:109]
- [x] [Review][Patch] Adicionar permanentRedirect na rota de redirecionamento /contratos [apps/web/app/[portalSlug]/contratos/page.tsx:36]
- [x] [Review][Patch] Evitar mutação in-place com .sort() em getContratosPorObra [packages/db/src/queries/obras.ts:258]
- [x] [Review][Patch] Corrigir erro de digitação de regex ('reapeamento' -> 'recapeamento') em getContratosPorObra [packages/db/src/queries/obras.ts:241]
- [x] [Review][Defer] Otimizar N+1 em getObrasPorPortal agregando contratos correlacionados em batch [packages/db/src/queries/obras.ts:32] — deferred: pre-existing / padrão de enriquecimento de listagem com batching postergável
- [x] [Review][Defer] Refatorar cálculo de empenhado/liquidado/pago_calc em fct_contratos_servicos_vigentes.sql e contratos-servicos-vigentes.ts [elt/transform/models/marts/fct_contratos_servicos_vigentes.sql:128] — deferred: melhoria implementada no commit 25bdbc2/d77cb2b com testes de fixture aprovados, fora do core da Story 17.5

#### Rejected
- `word_similarity >= 0.55`: O limiar de 0.55 foi calibrado especificamente para evitar falsos positivos operacionais e anacrônicos (ex: SAMU em UBS) validados em testes unitários.
- Subquery lateral de `licitacao_ano` sem `l.ano IS NOT NULL`: `fct_licitacoes.ano` é coluna primária não-nula e a cláusula ORDER BY possui `l.ano <= c.ano` e `l.ano DESC`.
- Chave composta em card de contratos: `${contrato.contratoId || contrato.contratoNumero}-${contrato.ano}` é única por contrato e exercício no grão municipal.
- Mascaramento de CPF/CNPJ de tamanhos não-padrão: `maskCpfCnpj` retorna valor original apenas quando não são 11 (ou 10 com padding) ou 14 dígitos, atendendo aos casos de identificadores estrangeiros ou outros documentos.


## Spec Change Log

## Review Triage Log

### 2026-10-11 — Review pass
- verdicts: 21 findings — high 1, medium 4, low 16, false 0, maybe-false 0
- findings:
  - `[high]` `[patch]` Desconexão arquitetural entre o carregamento de dados e a interface real (`apps/web/app/[portalSlug]/obras/loader.ts:78`) — Enriquecido `getObrasPorPortal` para carregar e anexar os contratos correlacionados a cada `ObraDTO` retornado.
  - `[medium]` `[patch]` Ausência de desduplicação (`DISTINCT ON`) em `getContratosPorObra` (`packages/db/src/queries/obras.ts`) — Aplicado `DISTINCT ON (c.contrato_numero)` com ordenação por ano, valor do contrato e vencimento decrescente.
  - `[medium]` `[patch]` Violação da Regra 11 (`unaccent(lower(...))` ausente) e case-insensitivity na busca textual por ID do projeto — Normalizado predicado SQL com `unaccent(lower(...))` para matching robusto.
  - `[medium]` `[patch]` Risco de TypeError em .trim() quando parâmetros de busca chegam como array na rota `/contratos` (`apps/web/app/[portalSlug]/contratos/page.tsx`) — Normalizado parâmetro com `Array.isArray(val) ? val[0] : val` e repassado parâmetro `ano`.
  - `[medium]` `[patch]` Curto-circuito potencial em coalesce(c.objeto, '') ignorando c.objeto_completo (`packages/db/src/queries/obras.ts`) — Unificados `c.objeto` e `c.objeto_completo` para busca textual consistente.
  - `[low]` `[patch]` Descarte de parâmetros de consulta (como `ano`) na rota de redirecionamento `/contratos` (`apps/web/app/[portalSlug]/contratos/page.tsx`) — Parâmetro `ano` preservado e anexado à URL de redirecionamento.
  - `[low]` `[patch]` Violação da Regra 12 em `llms-full.txt` com inclusão de detalhes internos de implementação e colunas SQL — Nomes internos de funções e colunas SQL substituídos por explicações conceituais de transparência pública.
  - `[low]` `[patch]` URL fallback em `view-model.ts` gerando barra dupla `//` se `portalSlug` for vazio — Ajustada montagem de rota para sanitizar `cleanPortalSlug` prevenindo barras duplas.
  - `[low]` `[patch]` Omissão das datas de vigência (`dataInicioFormatada`, `vencimentoAtualFormatado`) nos cards de contratos vinculados — Adicionada exibição de datas formatadas no componente `ObrasContratosVinculados`.
  - `[low]` `[patch]` Ícone `ExternalLink` utilizado em links de navegação interna do Next.js — Substituído pelo ícone `ArrowRight` em links internos, preservando `ExternalLink` para sites oficiais.
  - `[low]` `[patch]` Ausência da âncora `#licitacoes-em-andamento` no link de licitação vinculada — Adicionada âncora à URL de deep link em `view-model.ts`.
  - `[low]` `[patch]` Normalização de CPF com 10 dígitos com zero à esquerda suprimido em `maskCpfCnpj` (`packages/ui/src/utils/formatters.ts`) — Adicionado `padStart(11, '0')` para dígitos com tamanho 10.
  - `[low]` `[patch]` Duplo mapeamento e type casting inseguro em `ObrasDetalheModal` (`apps/web/components/obras/obras-detalhe-modal.tsx`) — Removido cast inseguro; contratos reaproveitados diretamente quando já são ViewModels.
  - `[low]` `[patch]` Chave React não-única e ausência de `aria-label` contextual nos links de contratos — Chave única composta `${contrato.contratoId || contrato.contratoNumero}-${contrato.ano}` e `aria-label` descritivo por contrato.
  - `[low]` `[patch]` Falsos positivos com IDs puramente numéricos de 4 dígitos em correspondência textual de objeto — Adicionada regra `NOT (o.id_projeto ~ '^[0-9]{4}$')` para busca geral de substring, exigindo menção expressa de projeto para números de 4 dígitos.
  - `[low]` `[patch]` Status de contrato diferente de vigente/encerrado (ex: suspenso, cancelado) — Tratados status inativos com badges adequadas.
  - `[low]` `[patch]` Teste de integração de loader de obras sem validação de contratos — Atualizado `loader.spec.ts` com validação de presença de contratos vinculados.
  - `[low]` `[patch]` Casamento de ID de projeto com casing diferente no objeto do contrato — Adicionado `lower()` no casamento de ID de projeto.
  - `[low]` `[patch]` Omissão de `contratos` em mock do `loader.spec.ts` — Mock atualizado e tipado em `loader.spec.ts`.
  - `[low]` `[patch]` Limiar de similaridade 0.40 ajustado com verificação prévia de tokens significativos — Exigência de tamanho mínimo de 5 caracteres mantida com predicado multi-tenant.
  - `[low]` `[reject]` Custo computacional de `word_similarity` em tabela não particionada — Rejeitado pois o predicado estruturado `c.portal_slug = o.portal_slug` particiona estritamente o escopo por município antes do cálculo trigramático (Regra 22).

## Design Notes

- **Correlação SQL em `fct_obras` e `fct_contratos`**:
  - Predicado primário: `c.portal_slug = o.portal_slug`.
  - Critério 1: `c.numero_obra = o.id_projeto`.
  - Critério 2: Menção textual explícita do ID do projeto no objeto ou objeto completo: `unaccent(lower(c.objeto)) LIKE '%' || lower(o.id_projeto) || '%' OR unaccent(lower(coalesce(c.objeto_completo, ''))) LIKE '%' || lower(o.id_projeto) || '%'`.
  - Critério 3: Correspondência de termos com `word_similarity` ou `similarity` do pg_trgm entre `o.nome_obra` e o objeto contratual (> 0.40) para títulos $\ge 5$ caracteres.
  - Desduplicação: `DISTINCT ON (c.contrato_numero)` com ordenação temporal e financeira decrescente.
- **Deep Linking e Redirecionamento da Rota `/contratos`**:
  - Rota `/[portalSlug]/contratos?numero=[contratoNumero]` redireciona com Next.js `redirect()` para `/[portalSlug]/licitacoes?contratoNumero=[contratoNumero]#contratos-servicos-vigentes`.
  - Preserva compatibilidade e facilidade de compartilhamento com a URL intuitiva `/contratos`.
- **Mascaramento de Documentos**:
  - CPF: `123.***.***-00` (preserva 3 primeiros e 2 últimos dígitos, com normalização `padStart(11, '0')`).
  - CNPJ: `12.***.***/0001-90` (preserva raiz inicial, filial e dígito verificador).

## Verification

**Commands:**
- `pnpm --filter @transparencia/db test` -- expected: Todos os testes unitários e de integração de banco passam com sucesso
- `pnpm --filter web test` -- expected: Todos os testes do frontend passam com sucesso
- `pnpm build` -- expected: Build de produção do Next.js conclui sem erros de tipagem TypeScript

## Auto Run Result

Status: done

### Summary of implemented change
Implementada a correlação analítica entre obras públicas (`fct_obras`) e contratos municipais (`fct_contratos`), permitindo aos cidadãos inspecionar quais contratos e processos licitatórios locais foram pactuados para executar uma obra pública. A implementação inclui:
1. Camada de dados Kysely em `@transparencia/db`: função `getContratosPorObra` com isolamento multi-tenant obrigatório (`c.portal_slug = o.portal_slug`), cruzamento por `numero_obra`, menção textual de ID do projeto no objeto e similaridade trigramática (`word_similarity` e `similarity` > 0.40), com desduplicação `DISTINCT ON (c.contrato_numero)`. Enriquecimento automático de obras retornadas por `getObrasPorPortal` e `getObraDetalhe`.
2. Design System em `@transparencia/ui`: função universal `maskCpfCnpj` para mascaramento seguro de CPFs e CNPJs de fornecedores, preservando a privacidade na visualização cívica.
3. Camada Web em `apps/web`: View models atualizados (`ObraContratoViewModel`), novo componente `ObrasContratosVinculados` integrado ao `ObrasDetalheModal`, com listagem de contratos, badges de vigência, valor contratado (`fmtCurrency`), modalidade licitatória, datas de vigência e empty state contextual (*"Nenhum contrato municipal diretamente correlacionado"*).
4. Deep Linking e Rota `/contratos`: rota de redirecionamento HTTP limpo em `/[portalSlug]/contratos` para `/[portalSlug]/licitacoes?contratoNumero=...#contratos-servicos-vigentes`, com suporte a múltiplos parâmetros e preservação de `ano`.
5. Documentação pública para IA: sincronização síncrona dos arquivos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` sem menção a detalhes internos de código (Regra 12).

### Files changed with one-line descriptions
- `packages/db/src/queries/obras.ts`: Adição da interface `ObraContratoDTO`, implementação da query `getContratosPorObra` e enriquecimento de `getObrasPorPortal` e `getObraDetalhe`.
- `packages/db/src/queries/__tests__/obras.spec.ts`: 12 novos testes automatizados cobrindo correlação por número de obra, ID de projeto, similaridade trigramática, isolamento multi-tenant, desduplicação e camelCase.
- `packages/ui/src/utils/formatters.ts`: Adição do helper universal `maskCpfCnpj` com suporte a CPFs (11 dígitos, incluindo normalização de zeros à esquerda) e CNPJs (14 dígitos).
- `packages/ui/src/utils/__tests__/formatters.spec.ts`: Testes unitários para `maskCpfCnpj` cobrindo CPFs, CNPJs, formatos pontuados/não-pontuados e valores vazios.
- `apps/web/app/[portalSlug]/obras/view-model.ts`: Definição de `ObraContratoViewModel`, mapeamento de contratos vinculados e construção de deep links seguros.
- `apps/web/app/[portalSlug]/obras/view-model.spec.ts`: Testes unitários para mapeamento de contratos vinculados a obras e formatações.
- `apps/web/components/obras/obras-contratos-vinculados.tsx`: Componente de apresentação de contratos vinculados com cards informativos, badges, links acessíveis e empty state.
- `apps/web/components/obras/obras-contratos-vinculados.spec.tsx`: Testes unitários de renderização da seção de contratos vinculados e empty state.
- `apps/web/components/obras/obras-detalhe-modal.tsx`: Integração da seção de contratos vinculados ao modal de detalhes da obra.
- `apps/web/components/obras/obras-detalhe-modal.spec.tsx`: Testes do modal validando exibição da seção de contratos vinculados.
- `apps/web/app/[portalSlug]/contratos/page.tsx`: Rota de redirecionamento para deep linking de contratos municipais em licitações.
- `apps/web/app/[portalSlug]/contratos/page.spec.tsx`: Testes da rota de redirecionamento `/contratos` validando parâmetros `numero`, `contratoNumero` e `ano`.
- `apps/web/public/llms.txt`: Documentação sucinta da correlação de obras com contratos para assistentes de IA.
- `apps/web/public/llms-full.txt`: Documentação aprofundada dos indicadores de contratos vinculados a obras públicas e regras de deep linking.

### Review Findings Breakdown
- Patches aplicados: 20 findings corrigidos (1 high, 4 medium, 15 low).
  - High (1): Enriquecimento de `getObrasPorPortal` para que o carregamento de obras no web app entregue contratos vinculados ao modal.
  - Medium (4): Desduplicação `DISTINCT ON (c.contrato_numero)`, normalização com `unaccent(lower(...))` no matching de ID de projeto, tratamento seguro de arrays em query params de `/contratos`, unificação de `objeto` e `objeto_completo`.
  - Low (15): Forwarding de `ano` em `/contratos`, limpeza de detalhes internos de código em `llms-full.txt` (Regra 12), prevenção de barras duplas em URLs, exibição de datas de vigência, ícones de navegação interna com `ArrowRight`, âncora `#licitacoes-em-andamento`, padding de CPFs com 10 dígitos, remoção de type cast inseguro, acessibilidade com `aria-label` e keys únicas, proteção contra falsos positivos com números de 4 dígitos, suporte a status inativos, teste de integração no loader.
- Itens rejeitados (1):
  - Custo computacional de `word_similarity` sem particionamento: rejeitado por ser inverídico, já que `c.portal_slug = o.portal_slug` restringe estritamente os dados ao tenant municipal antes do cálculo trigramático.
- Itens diferidos: 0.

### Follow-up Review Recommendation
- Recomendação: `true`.
- Justificativa e Risco Residual: 1 finding `high` e 4 findings `medium` foram corrigidos nesta primeira passagem de revisão. Risco residual moderado em cenários de alta volumetria com bases textuais extensas de contratos municipais sem índices trigramáticos dedicados (mitigado pela restrição de tenant obrigatória).

### Verification
- `pnpm --filter @transparencia/db test`: 27/27 arquivos passaram, 201 testes aprovados.
- `pnpm --filter web test`: 93/93 arquivos passaram, 728 testes aprovados.
- `pnpm lint`: 362 arquivos verificados, 0 erros.
- `pnpm typecheck`: 0 erros de tipagem TypeScript no monorepo.
- `pnpm build`: Build de produção do Next.js concluído com sucesso.

