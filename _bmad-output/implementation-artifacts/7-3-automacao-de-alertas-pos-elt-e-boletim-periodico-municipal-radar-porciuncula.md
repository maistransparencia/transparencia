---
baseline_commit: 18c0be8e4e115c387560a647a7113f3e5a5d25c7
---

# Story 7.3: Automação de Alertas Pós-ELT e Boletim Periódico Municipal ("Radar Porciúncula")

Status: done

## Story

As a subscribed citizen or municipal auditor,  
I want to receive an automated email notification whenever the data pipeline processes a new batch of municipal expenses, as well as a periodic civic digest ("Radar Porciúncula"),  
So that I am automatically alerted to relevant spending deltas, large new contracts, and changes in accounting opacity (.99 residual subitems) without having to manually check the portal daily.

---

## Acceptance Criteria

### 1. Consulta de Assinantes Ativos e Métricas Cívicas (`@transparencia/db`)
1. **Consulta de Assinantes Ativos (`packages/db/src/queries/newsletter.ts`):**
   - Implementar e exportar a função atômica:
     ```typescript
     export async function getConfirmedNewsletterSubscribers(
       portalSlug: string,
       dbInstance = db
     ): Promise<NewsletterSubscriber[]>
     ```
   - Filtrar estritamente por `portal_slug = ${portalSlug}` e `status = 'confirmado'` (Regra 10).
   - Retornar lista tipada com `id`, `email`, `portalSlug`, `tokenCancelamento`, etc.
2. **Leitor de Métricas do Radar Cívico (`packages/db/src/queries/radar-digest.ts`):**
   - Implementar e exportar a função leitora atômica e o DTO correspondente:
     ```typescript
     export interface RadarDigestMetricsDTO {
       portalSlug: string;
       ano: number;
       posicaoFiscal: {
         totalArrecadado: number;
         despesasPagas: number;
         restosPagosNoAno: number;
         saldoEstimado: number;
       } | null;
       opacidade: {
         taxaValorOpacidadePct: number;
         classificacaoRisco: "normal" | "atencao" | "critico";
         pagoResidual99: number;
         pagoDesvioSensivel99: number;
         totalPago: number;
       } | null;
       destaquesContratos: Array<{
         fornecedorNome: string;
         objetoDescricao: string;
         totalPago: number;
         statusExecucao: string;
       }>;
       destaquesCredoresOpacidade: Array<{
         credorNome: string;
         totalPago: number;
         categoriaPredominante: string;
       }>;
     }

     export async function getRadarDigestMetrics(
       portalSlug: string,
       ano?: number
     ): Promise<RadarDigestMetricsDTO | null>
     ```
   - Reutilizar ou compor internamente as queries Kysely existentes (`getPosicaoFiscalMetrics`, `getOpacidadeContabilMetrics`, `getContratosServicosVigentes`) sem duplicação de regras contábeis (Regra 2 e Regra 14).
   - Garantir isolamento multi-tenant por `portalSlug` (AD-5).

### 2. Template de E-mail Responsivo com React Email (`apps/web/components/emails/`)
3. **Template `RadarDigestEmail` (`apps/web/components/emails/radar-digest.tsx`):**
   - Desenvolvido com `@react-email/components` (pinned `1.0.12`) com renderização 100% responsiva (clientes desktop e mobile: Gmail, Apple Mail, Outlook).
   - Identidade visual consistente com o portal (#5a72a8, tipografia limpa, tabelas sem quebra).
   - **Seções Obrigatórias do Boletim:**
     - **Header Institucional:** Logo do portal, nome do município (`municipioNome` / `portalSlug`) e badge de edição/data do Radar.
     - **Card de Balanço & Execução Orçamentária:** Total Pago no exercício, Receitas Arrecadadas e Saldo Estimado com badges de status.
     - **Card do Termômetro de Opacidade Fiscal:** Taxa de gastos em subitens residuais `.99`, classificação de risco (*Normal*, *Atenção*, *Crítico*) com cores semânticas e explicação didática para o cidadão.
     - **Card de Novos Contratos e Fornecedores Vigilados:** Tabela compacta com os principais contratos e fornecedores com gastos relevantes.
     - **Chamadas de Ação (CTAs):** Botões diretos para inspecionar no portal (`/[portalSlug]/despesas`, `/[portalSlug]/licitacoes`) com parâmetros UTM padronizados (`?utm_source=radar_digest&utm_medium=email&utm_campaign=radar_municipal`).
     - **Rodapé Normativo LGPD & RFC 8058:** Link individualizado de cancelamento com 1 clique (`unsubscribeUrl` contendo `token_cancelamento`) e texto informativo de proteção de dados.

### 3. Motor de Despacho e Resiliência Resend (`apps/web/lib/radar-digest.ts` & `apps/web/lib/resend.ts`)
4. **Função de Despacho em Lote (`apps/web/lib/radar-digest.ts`):**
   - Implementar utilitário de compilação e envio:
     ```typescript
     export interface DispatchRadarDigestOptions {
       portalSlug: string;
       ano?: number;
       dryRun?: boolean;
       baseUrl?: string;
     }

     export interface DispatchRadarDigestResult {
       success: boolean;
       portalSlug: string;
       ano: number;
       totalSubscribers: number;
       sentCount: number;
       failedCount: number;
       errors: Array<{ email: string; error: string }>;
       dryRun: boolean;
     }

     export async function dispatchRadarDigest(
       options: DispatchRadarDigestOptions
     ): Promise<DispatchRadarDigestResult>
     ```
   - Obter lista de assinantes confirmados (`getConfirmedNewsletterSubscribers`).
   - Se `totalSubscribers === 0`, retornar sucesso com `sentCount = 0` sem acionar a API externa.
   - Em modo `dryRun: true` (ou quando `RESEND_API_KEY` não estiver definida em dev), registrar logs estruturados no stdout sem enviar requisições reais.
   - Em modo de produção, disparar e-mails via Resend (`resend.emails.send` ou `resend.batch.send` em lotes de até 100 destinatários) garantindo que cada mensagem possua:
     - `to: [subscriber.email]`
     - `subject: `🚨 Radar Porciúncula: Novos dados fiscais e termômetro de opacidade (${ano})``
     - `headers`:
       - `List-Unsubscribe: <${baseUrl}/api/newsletter/unsubscribe?token=${subscriber.tokenCancelamento}>`
       - `List-Unsubscribe-Post: List-Unsubscribe=One-Click`
   - Tratamento individualizado de erros: a falha de entrega para um destinatário não deve interromper o despacho para os demais assinantes do lote.

### 4. Endpoint de Webhook / Automação Segura (`apps/web/app/api/newsletter/dispatch-digest/route.ts`)
5. **Autenticação e Proteção do Endpoint:**
   - Implementar rota HTTP `POST /api/newsletter/dispatch-digest`.
   - Exigir header `Authorization: Bearer <token>` comparado contra variável de ambiente (`CRON_SECRET` ou `DIGEST_SECRET` ou `INTERNAL_API_SECRET`).
   - Se o token for inválido ou ausente, retornar HTTP `401 Unauthorized`.
   - Aceitar JSON body:
     ```json
     {
       "portalSlug": "porciuncula_prefeitura",
       "ano": 2025,
       "dryRun": false
     }
     ```
   - Validar schema com fallbacks seguros (`portalSlug` obrigatório).
   - Executar `dispatchRadarDigest` e retornar HTTP 200 com `DispatchRadarDigestResult`.

### 5. CLI Executável e Integração de Automação (`apps/web/bin/` & `Makefile`)
6. **Script CLI Executável (`apps/web/bin/dispatch-digest.ts`):**
   - Suporte a argumentos de linha de comando:
     - `--portal <slug>` (obrigatório ou default `porciuncula_prefeitura`)
     - `--ano <number>` (opcional, default ano corrente)
     - `--dry-run` (flag booleana para simulação)
   - Executável diretamente via `tsx` (ex: `pnpm digest:send` / `pnpm digest:dry-run`).
7. **Atalhos no `Makefile` e `package.json`:**
   - Adicionar script em `apps/web/package.json`:
     - `"digest:send": "tsx bin/dispatch-digest.ts"`
     - `"digest:dry-run": "tsx bin/dispatch-digest.ts --dry-run"`
   - Adicionar targets no `Makefile`:
     - `digest/send`: dispara o boletim para o portal informado (`make digest/send PORTAL=porciuncula_prefeitura [ANO=2025]`)
     - `digest/dry-run`: simula o despacho e imprime o resumo de métricas compilado sem enviar e-mails

### 6. Validação de Qualidade e Cobertura de Testes
8. **Testes Automatizados Obrigatórios:**
   - Testes unitários para a query de busca de assinantes confirmados em `packages/db/src/queries/__tests__/newsletter.spec.ts`.
   - Testes unitários para o agregador de métricas em `packages/db/src/queries/__tests__/radar-digest.spec.ts`.
   - Testes unitários para o motor de compilação e despacho em `apps/web/lib/radar-digest.spec.ts` (testando `dryRun`, isolamento de erros, formatação de links e headers RFC 8058).
   - Testes de integração para o endpoint de API em `apps/web/app/api/newsletter/dispatch-digest-route.spec.ts` (testando autenticação Bearer, validação de payload e execução).
   - Testes de renderização do componente React Email em `apps/web/components/emails/radar-digest.spec.tsx`.
   - Aprovação de 100% em `pnpm test`, `pnpm build`, `make test` e `make check`.

---

## Tasks / Subtasks

- [x] **Task 1: Camada de Dados — Queries de Assinantes Ativos e Métricas do Radar em `@transparencia/db`** (AC: #1)
  - [x] Implementar `getConfirmedNewsletterSubscribers` em `packages/db/src/queries/newsletter.ts` filtrando por `portal_slug` e `status = 'confirmado'`.
  - [x] Implementar `getRadarDigestMetrics` em `packages/db/src/queries/radar-digest.ts` compondo posição fiscal, taxa de opacidade e maiores contratos/credores.
  - [x] Exportar novos tipos e funções em `packages/db/src/index.ts`.
  - [x] Escrever testes unitários em `packages/db/src/queries/__tests__/newsletter.spec.ts` e `packages/db/src/queries/__tests__/radar-digest.spec.ts`.

- [x] **Task 2: Template React Email do Radar Cívico Municipal** (AC: #2)
  - [x] Criar template `apps/web/components/emails/radar-digest.tsx` com `@react-email/components`.
  - [x] Implementar cards modulares: Balanço Fiscal, Termômetro de Opacidade (.99), Destaques de Contratos e Fornecedores Vigilados.
  - [x] Configurar botões CTA com UTM tracking e rodapé compatível com RFC 8058 e LGPD.
  - [x] Escrever testes de renderização em `apps/web/components/emails/radar-digest.spec.tsx`.

- [x] **Task 3: Motor de Despacho Resiliente e Utilitário de Envio** (AC: #3)
  - [x] Implementar `apps/web/lib/radar-digest.ts` com função `dispatchRadarDigest`.
  - [x] Integrar modo `--dry-run`, logs estruturados e envio via Resend com headers normativos (`List-Unsubscribe`, `List-Unsubscribe-Post`).
  - [x] Implementar tratamento de erro resiliente por destinatário e batch processing.
  - [x] Escrever testes unitários em `apps/web/lib/radar-digest.spec.ts`.

- [x] **Task 4: Endpoint Seguro de Automação / Webhook** (AC: #4)
  - [x] Criar rota `apps/web/app/api/newsletter/dispatch-digest/route.ts` com proteção via Bearer Token (`CRON_SECRET` / `DIGEST_SECRET`).
  - [x] Validar payload, disparar compilação e retornar JSON estruturado com métricas de despacho.
  - [x] Escrever testes de integração em `apps/web/app/api/newsletter/dispatch-digest-route.spec.ts`.

- [x] **Task 5: CLI Executável, Comandos do Makefile e Scripts de Automação** (AC: #5)
  - [x] Adicionar dependência `tsx: "4.21.0"` em `apps/web/package.json` (devDependencies).
  - [x] Criar CLI executável `apps/web/bin/dispatch-digest.ts` com suporte a `--portal`, `--ano` e `--dry-run`.
  - [x] Adicionar scripts `digest:send` e `digest:dry-run` em `apps/web/package.json`.
  - [x] Adicionar targets `digest/send` e `digest/dry-run` no `Makefile`.

- [x] **Task 6: Validação de Qualidade, Linting e Gates de Teste** (AC: #6)
  - [x] Executar `pnpm test` e verificar aprovação completa em todas as suítes (web + db).
  - [x] Executar `pnpm build` para validar compilação estrita e tipos do Next.js.
  - [x] Executar `make check` e `make test` para garantir paridade contábil e de pipeline.

### Review Findings

- [x] [Review][Patch] Adicionar logs estruturados, resumo de métricas e tratamento de erro no CLI [apps/web/bin/dispatch-digest.ts:37-59]
- [x] [Review][Patch] Utilizar comparação em tempo constante (timingSafeEqual) para validação de Bearer tokens [apps/web/app/api/newsletter/dispatch-digest/route.ts:15-28]
- [x] [Review][Patch] Normalizar URLs em resolveBaseUrl e converter logo/brasão municipal em URL absoluta no e-mail [apps/web/lib/radar-digest.ts:31-42,133]
- [x] [Review][Patch] Tratar coerção e parsing de argumentos (ano, portalSlug, baseUrl com múltiplos '=') [apps/web/bin/dispatch-digest.ts:18,28, apps/web/app/api/newsletter/dispatch-digest/route.ts:56, packages/db/src/queries/radar-digest.ts:95]
- [x] [Review][Patch] Executar renderização do componente RadarDigestEmail em modo dry-run para validar integridade do JSX [apps/web/lib/radar-digest.ts:99-110]
- [x] [Review][Patch] Expandir categorias em formatCategoriaCredor, adicionar chaves únicas e alerta visual para saldo deficitário [apps/web/components/emails/radar-digest.tsx:49-93,184-190,250,291]
- [x] [Review][Patch] Adicionar aviso em log quando nenhum secret de autorização estiver configurado no servidor [apps/web/app/api/newsletter/dispatch-digest/route.ts:23-26]

---

## Dev Notes

### Diretrizes Arquiteturais e Conformidade com `AGENTS.md`
- **Isolamento Multi-tenant (AD-5):** O disparo de newsletters e a compilação de métricas operam estritamente vinculados ao `portal_slug` do município.
- **Camada de Dados `@transparencia/db` (Regra 2):** Nenhuma agregação contábil bruta é feita na camada de e-mail/web. As métricas são consumidas de leitores atômicos Kysely que consultam os marts (`fct_posicao_fiscal_metricas`, `fct_opacidade_contabil_metricas`, `fct_contratos_servicos_vigentes`).
- **Valores Fixos em Lowercase Snake_case (Regra 10):** A coluna `status` usa estritamente `'confirmado'` e as classificações de risco usam `'normal'`, `'atencao'`, `'critico'`.
- **Zero Ternários Aninhados (Regra 13):** Para condicionais visuais de badge, classificação ou mensagens no template de e-mail, utilize funções auxiliares com retornos antecipados.
- **RFC 8058 & LGPD:** Todo e-mail despachado contém os cabeçalhos `List-Unsubscribe` e `List-Unsubscribe-Post: List-Unsubscribe=One-Click`, além do link individualizado com `token_cancelamento` no rodapé.
- **Segurança de Execução (Regra 15):** Todos os testes e scripts de CLI utilizam o banco de desenvolvimento local configurado via `.env` ou instâncias efêmeras.

### Matriz de Arquivos Modificados / Criados

| Arquivo | Status | Descrição |
|---|---|---|
| `packages/db/src/queries/newsletter.ts` | UPDATE | Adicionar função `getConfirmedNewsletterSubscribers` |
| `packages/db/src/queries/radar-digest.ts` | NEW | Leitor atômico de métricas agregadas do Radar Cívico Municipal |
| `packages/db/src/index.ts` | UPDATE | Exportar leitor e DTO de `radar-digest` |
| `packages/db/src/queries/__tests__/newsletter.spec.ts` | UPDATE | Testar busca de assinantes confirmados |
| `packages/db/src/queries/__tests__/radar-digest.spec.ts` | NEW | Testes unitários do agregador de métricas do Radar |
| `packages/db/tests/fixtures/seed.ts` | UPDATE | Adicionar seed para contratos e dim_orgao |
| `apps/web/package.json` | UPDATE | Adicionar dependência `tsx: "4.21.0"` e scripts `digest:*` |
| `apps/web/components/emails/radar-digest.tsx` | NEW | Template React Email para o Boletim Periódico / Alerta Pós-ELT |
| `apps/web/components/emails/radar-digest.spec.tsx` | NEW | Testes de renderização do template de e-mail |
| `apps/web/lib/radar-digest.ts` | NEW | Motor de compilação de dados, logs e despacho Resend |
| `apps/web/lib/radar-digest.spec.ts` | NEW | Testes unitários do motor de despacho e resiliência |
| `apps/web/app/api/newsletter/dispatch-digest/route.ts` | NEW | Endpoint Next.js protegido para automação e webhooks |
| `apps/web/app/api/newsletter/dispatch-digest-route.spec.ts` | NEW | Testes de integração da rota autenticada |
| `apps/web/bin/dispatch-digest.ts` | NEW | CLI executável para despacho manual ou acionamento pós-ELT |
| `Makefile` | UPDATE | Incluir targets `digest/send` e `digest/dry-run` |

---

## Dev Agent Record

### Agent Model Used
- Gemini 3.7 Flash

### Debug Log References
- Implementação completa com Red-Green-Refactor.
- Ajuste de tipagem estrita de narrowing no cliente Resend em TypeScript (`apps/web/lib/radar-digest.ts`).
- Validação e execução de dry-run via target `make digest/dry-run` contra banco local.

### Completion Notes List
- Implementada a query atômica `getConfirmedNewsletterSubscribers` em `@transparencia/db/src/queries/newsletter.ts`.
- Implementado o agregador de métricas cívicas `getRadarDigestMetrics` em `@transparencia/db/src/queries/radar-digest.ts`.
- Criado o componente de e-mail responsivo `RadarDigestEmail` com React Email (`apps/web/components/emails/radar-digest.tsx`).
- Criado motor de despacho resiliente `dispatchRadarDigest` (`apps/web/lib/radar-digest.ts`) com isolamento de falhas por destinatário e conformidade RFC 8058.
- Criada a rota de webhook autenticada `POST /api/newsletter/dispatch-digest` (`apps/web/app/api/newsletter/dispatch-digest/route.ts`).
- Criado CLI `apps/web/bin/dispatch-digest.ts` e targets `digest/send` e `digest/dry-run` no `Makefile`.
- Todos os testes TypeScript (122 testes no web + 46 testes no db) e Python (83 testes no ELT/analytics) aprovados com 100% de sucesso.
- Compilação estrita `pnpm build` e linters `make check` validados com sucesso.

### File List
- `packages/db/src/queries/newsletter.ts`
- `packages/db/src/queries/radar-digest.ts`
- `packages/db/src/index.ts`
- `packages/db/src/queries/__tests__/newsletter.spec.ts`
- `packages/db/src/queries/__tests__/radar-digest.spec.ts`
- `packages/db/tests/fixtures/seed.ts`
- `apps/web/package.json`
- `apps/web/components/emails/radar-digest.tsx`
- `apps/web/components/emails/radar-digest.spec.tsx`
- `apps/web/lib/radar-digest.ts`
- `apps/web/lib/radar-digest.spec.ts`
- `apps/web/app/api/newsletter/dispatch-digest/route.ts`
- `apps/web/app/api/newsletter/dispatch-digest-route.spec.ts`
- `apps/web/bin/dispatch-digest.ts`
- `Makefile`
