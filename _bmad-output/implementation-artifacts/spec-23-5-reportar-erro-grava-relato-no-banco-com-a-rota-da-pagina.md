---
title: 'Sugestão ou erro grava o relato no banco com a rota da página'
type: 'feature'
created: '2026-11-13'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-23-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** o modal "Sugestão ou erro" só envia o relato (com o e-mail opcional) ao PostHog, mas a tela diz "registrado". O portal não guarda nada e não sabe de qual página o cidadão falou.

**Approach:** o formulário global continua como está (sem botão por indicador). Ao enviar, uma rota de API valida no servidor e grava o relato numa tabela nova, junto com `portal_slug` e a rota atual (`pathname`). Mensagem e e-mail deixam de ir ao PostHog.

**Decisões do Julio (2026-11-13):** relato vai para o banco; form global mantido; registrar a rota atual no envio; rodapé também sai do PostHog; a role `read_only` recebe escrita na tabela nova pelo padrão de `elt/migrations/grant_readonly.sql`. O botão por indicador e o catálogo de indicadores da story original ficam fora desta entrega.

## Boundaries & Constraints

**Always:** tabela `public.feedback_reports` por migração Kysely (colunas `TEXT`; códigos em snake_case; `status` padrão `recebida`); escrita via `dbWrite`; validação com zod no servidor; limite de taxa por IP já existente, sem gravar IP; sem literais de tenant; texto cidadão e tom não acusatório; confirmação diz o que acontece depois e não promete prazo; nomes novos de código em inglês, domínio em português.

**Never:** gravar IP, user agent ou id de sessão; rodar migração ou o grant em banco de produção sem autorização explícita; painel de triagem, resposta automática ou botão por indicador; enviar mensagem ou e-mail ao PostHog (a abertura do modal continua como evento, sem conteúdo).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Envio válido | tipo, mensagem 10–2000, e-mail opcional, pathname, portal | grava com `recebida`; resposta de sucesso | N/A |
| Mensagem curta/longa | <10 ou >2000 caracteres | 400 com mensagem clara | modal mostra o erro e mantém o texto |
| E-mail inválido | formato errado | 400 | texto preservado |
| Portal inexistente | `portalSlug` fora de `getAllPortais()` | 400 | texto preservado |
| Página sem portal (raiz) | `portalSlug` ausente | grava com `portal_slug` nulo e a rota | N/A |
| Honeypot preenchido | campo `site_url` | sucesso silencioso, nada gravado | N/A |
| Excesso de envios | >5 por IP em 10 min | 429 com `Retry-After` | modal mostra "aguarde alguns minutos"; texto preservado |
| Falha ao gravar | erro no banco | 500 | modal mostra erro e mantém o texto |

</frozen-after-approval>

## Code Map

- `packages/db/src/migrations/004_create_city_interest_requests.ts` e `packages/db/src/migrator.ts` -- molde da migração e registro; a nova é `005_create_feedback_reports`.
- `packages/db/src/queries/city-interest.ts` (+ `__tests__/city-interest.spec.ts`) -- molde de query de escrita com `dbWrite` e do teste; exportar em `packages/db/src/index.ts`.
- `apps/web/app/api/city-interest/route.ts` (+ spec) -- molde da rota: honeypot, zod, `checkIpRateLimit`, respostas 400/429/500. Não alterar.
- `apps/web/lib/rate-limit.ts` -- limitador em memória, não persiste IP. Reutilizar sem mudar.
- `apps/web/components/feedback-modal.tsx` (+ spec) -- troca `posthog.capture("feedback_submitted")` por `fetch` à rota; já tem honeypot e validações no cliente; manter `feedback_modal_opened`.
- `apps/web/components/global-footer.tsx:251` -- já passa `portalSlug` ao modal. Não alterar.
- `elt/migrations/grant_readonly.sql` -- novo bloco para `feedback_reports` no padrão de `city_interest_requests` (GRANT + política RLS).
- `apps/web/app/privacidade/` -- ajustar o texto sobre o que o relato guarda e onde.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/db/src/migrations/005_create_feedback_reports.ts` + `migrator.ts` -- cria a tabela (id uuid, `portal_slug` nulo, `tipo_relato`, `mensagem`, `email_retorno` nulo, `rota_pagina`, `status`, `created_at`) com checks de `status` e `tipo_relato` -- persistência
- [ ] `packages/db/src/queries/feedback-reports.ts` + export + spec -- `registerFeedbackReport` (normaliza e-mail e mensagem, devolve id) -- camada de dados
- [ ] `apps/web/app/api/feedback/route.ts` + spec -- valida, confere portal, limita taxa, grava -- servidor
- [ ] `apps/web/components/feedback-modal.tsx` + spec -- envia `pathname` e `portalSlug` à rota, preserva texto em erro, texto de sucesso diz o que acontece depois, nota de privacidade sem PostHog -- tela
- [ ] `elt/migrations/grant_readonly.sql` -- bloco de escrita e política RLS para `feedback_reports` -- permissão
- [ ] `apps/web/app/privacidade/page.tsx` -- descreve o que é guardado -- transparência

**Acceptance Criteria:**
- Given um relato válido enviado de `/{portalSlug}/receitas`, when o servidor responde sucesso, then existe uma linha com `status = recebida`, `portal_slug` e `rota_pagina = /{portalSlug}/receitas`, e nenhum evento do PostHog contém a mensagem ou o e-mail.
- Given o banco de testes, when `make test/ts` e `pnpm typecheck` rodam, then passam, com cobertura de validação, isolamento por portal e acessibilidade básica do modal.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

O limite de taxa é em memória por instância; em hospedagem com várias instâncias ele reduz abuso, mas não o impede. Aceito nesta entrega e o mesmo vale para `city-interest`. A pergunta de privacidade (o que o PostHog ainda recebe) fica no texto de `/privacidade`.

## Verification

**Commands:**
- `make db/test/build && make test/ts` -- expected: verde
- `pnpm typecheck && pnpm lint` -- expected: verde

**Manual checks (if no CLI):**
- Abrir o modal em `/{portalSlug}/receitas` no Docker local, enviar, e conferir a linha na tabela local; repetir com texto curto e com o banco fora para ver o texto preservado.

### Review Findings

Revisão do commit 81b8509b (baseline 13cb06e5), modo full.

- [x] [Review][Patch] Limite por IP compartilha o mesmo balde entre rotas (decidido: prefixo por rota em `lib/rate-limit.ts`, ajustando newsletter, city-interest, push e feedback) — `checkIpRateLimit` usa a chave `ip:<ip>` em newsletter, city-interest, push e feedback; um envio consome a cota das outras, e push usa limite 30 sobre a mesma chave. Opções: namespace por rota em `lib/rate-limit.ts` (afeta as outras rotas) ou aceitar. [apps/web/app/api/feedback/route.ts:55]
- [x] [Review][Patch] Texto de privacidade incompleto (decidido: redigir os três pontos, com revisão do editor-cidadão e do jurista-fiscal) — `/privacidade` e a nota do modal não dizem o que o PostHog ainda recebe (evento de abertura do modal), nem por quanto tempo o relato e o e-mail ficam guardados, nem avisam para não colocar CPF/dados pessoais no texto livre. Redação a decidir (jurista-fiscal/editor-cidadao). [apps/web/app/privacidade/page.tsx]
- [x] [Review][Patch] `rotaPagina` aceita `//host` e caracteres de controle — regex `/^\//` deixa passar `//evil.com` (confirmado com zod 4.6.7); usar `/^\/(?!\/)[^\x00-\x1f]*$/` e testar. [apps/web/app/api/feedback/route.ts:26]
- [x] [Review][Patch] Cobertura da AC2 incompleta — sem asserção de acessibilidade no modal (foco, `role`, rótulos) e sem caso de JSON inválido nem de `getAllPortais` lançando erro no spec da rota. [apps/web/components/feedback-modal.spec.tsx, apps/web/app/api/feedback/feedback-route.spec.ts]
- [x] [Review][Defer] Grant amplo e sem verificação para `read_only` — `SELECT, INSERT, UPDATE, DELETE` e política `FOR ALL USING (true)` numa tabela com e-mails; se o grant rodar antes da migração 005 o `to_regclass` pula em silêncio; nenhum teste roda o script. Mesmo padrão de `city_interest_requests`. — deferred: padrão pré-existente; antes de produção, conferir INSERT como `read_only` após `grant_readonly.sql` e avaliar papel só de INSERT. [elt/migrations/grant_readonly.sql:54]
- [x] [Review][Defer] Relatos não têm fila de triagem — só existe `registerFeedbackReport`; nada lê ou move `status`, nem notifica a equipe, mas o modal diz que a equipe lê os relatos. — deferred: fora do escopo da 23.5; precisa de story de triagem/notificação antes de prometer leitura.

#### Rejected

- E-mail inválido volta "Invalid input" (false): o teste com zod 4.6.7 devolve `invalid_format` com "E-mail inválido.".
- RLS não habilitado na migração (false): `grant_readonly.sql:21` habilita RLS em todas as tabelas de `public`/`analytics`.
- `down` não remove política/grants (false): derrubar a tabela remove política e grants.
- Lacuna na numeração das migrações (false): pré-existente e sem efeito.
- Limitador em memória, `x-forwarded-for` falsificável (low): aceito na spec (Design Notes), igual a `city-interest`.
- NUL no texto vira 500 (low): improvável no uso real; correção adiciona guarda.
- `portalSlug` e `rotaPagina` divergentes (low): só polui triagem; correção adiciona complexidade.
- `fetch` sem timeout/abort e `setStatus` após fechar (low): o navegador encerra a requisição; improvável no uso real.
- Pathname acima de 300 caracteres dá 400 (low): improvável.
- Balde `unknown-ip` e tamanho do corpo sem limite (low): pré-existente/limite da plataforma.
- Índices, FK de `portal_slug`, `getAllPortais` sem cache, limite só na rota (low): sem dano demonstrado.
- Teste do banco apaga por `LIKE` (low): roda no banco de teste (5545) com as travas existentes.
- Evento `feedback_submitted` removido (reject): remoção é requisito da spec.
- Checkboxes e status da spec (reject): a correção edita a spec em revisão.
- Limite de taxa após validação (reject): spec não impõe ordem; comportamento correto.
