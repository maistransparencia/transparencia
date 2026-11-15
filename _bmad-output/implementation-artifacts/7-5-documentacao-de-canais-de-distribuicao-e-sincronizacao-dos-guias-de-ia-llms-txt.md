---
baseline_commit: dc388fd4b7d17d7b71e9d268b4347a1037da33d1
---

# Story 7.5: Documentação de Canais de Distribuição e Sincronização dos Guias de IA (`llms.txt`)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an external AI assistant, search engine, civic researcher, or municipal citizen,  
I want updated and accurate public guides `/llms.txt` and `/llms-full.txt` documenting the civic notification channels (Radar Porciúncula newsletter, automated extraction alerts), public social media presences (X.com `@mtransparenciax` and Facebook Page), subscription and unsubscription procedures (double opt-in and RFC 8058 1-click unsubscribe), and LGPD data governance policies,  
So that AI agents consuming the portal can accurately guide citizens on how to follow and receive municipal spending alerts, access open-source resources, and engage in social oversight while upholding strict data privacy and transparency standards in accordance with Rule 12 of `AGENTS.md`.

---

## Acceptance Criteria

### 1. Atualização e Sincronização do Arquivo Sintético `apps/web/public/llms.txt`
1. **Canais Cívicos de Notificação e Distribuição:**
   - Adicionar seção dedicada documentando os canais públicos de notificação e engajamento cidadão:
     - **Boletim Cívico por E-mail ("Radar Porciúncula"):** Resumo periódico automatizado com os principais deltas de despesas pagas, arrecadação, novos contratos de serviços, e alertas do Termômetro de Opacidade Fiscal (gastos em subitens residuais `.99`).
     - **Como se Inscrever:** Cidadãos podem registrar seu e-mail no modal interativo do portal (botão *"Receber Alertas"* / *"Acompanhe as Contas"* na barra lateral, cabeçalho e rodapé) ou por submissão web segura em `/api/newsletter/subscribe`.
     - **Confirmação Segura (*Double Opt-In*):** O envio de informes só é ativado após confirmação individual por link exclusivo enviado ao e-mail do cidadão, impedindo cadastros indevidos por terceiros.
     - **Cancelamento Imediato com 1 Clique (RFC 8058):** Todos os e-mails expedidos contêm link de cancelamento imediato no rodapé e suporte nativo ao cabeçalho normativo `List-Unsubscribe` de 1 clique, garantindo descadastramento sem fricção.
2. **Presença Oficial em Redes Sociais e Código Aberto:**
   - Documentar os canais oficiais de divulgação e monitoramento cívico:
     - **X.com (Twitter):** Perfil oficial `@mtransparenciax` (`https://x.com/mtransparenciax`), com postagens automáticas de fechamento de cargas fiscais, notas de atualização e destaques do orçamento.
     - **Facebook Pages:** Página oficial (`https://facebook.com/maistransparencia`), com publicações didáticas e estruturadas em tópicos para a comunidade local.
     - **GitHub (Open Source):** Repositório de código aberto (`https://github.com/transparencia-mg`), garantindo auditoria pública dos algoritmos fiscais e colaboração comunitária.
3. **Diretrizes de Governança, Privacidade e LGPD:**
   - Explicitar de forma clara as diretrizes de privacidade:
     - Coleta mínima: apenas o endereço de e-mail é solicitado para a finalidade exclusiva de envio de boletins fiscais públicos.
     - Não comercialização: contatos jamais são vendidos, compartilhados com terceiros ou utilizados para fins político-partidários.
     - Revogação a qualquer momento: o cidadão é o titular do dado e tem direito de cancelar o recebimento a qualquer momento.

---

### 2. Detalhamento Aprofundado no Dicionário Completo `apps/web/public/llms-full.txt`
4. **Nova Seção 1.9: Canais Cívicos de Notificação, Boletim Periódico e Redes Sociais:**
   - Documentar em detalhes o ecossistema de distribuição cívica:
     - **Boletim Cívico "Radar Porciúncula":** Conteúdo detalhado enviado aos assinantes (balanço orçamentário do ano, termômetro de opacidade com classificação de risco *Normal*, *Atenção* ou *Crítico*, novos contratos e principais credores sob vigilância).
     - **Fluxo de Subscrição e Ciclo de Vida:** Estágios da inscrição (Pendente de confirmação $\rightarrow$ Confirmado $\rightarrow$ Cancelado).
     - **Mecanismos de Segurança e Defesa Anti-Abuso:** Proteção contra disparos maliciosos por meio de limitação de taxa (rate limiting), verificação contra robôs (honeypot invisível) e temporizador de submissão para proteção da caixa postal do cidadão.
     - **Redes Sociais e Bot Fiscal Automatizado:** Descrição das publicações em redes sociais (X e Facebook), destacando o propósito de aproximar os números públicos dos munícipes sem necessidade de navegação técnica diária no portal.
5. **Nova Seção 1.10: Governança, Proteção de Dados (LGPD) e Boas Práticas de Transparência:**
   - Detalhar a conformidade com a Lei Geral de Proteção de Dados (Lei Federal nº 13.709/2018):
     - **Consentimento e Finalidade Específica:** O e-mail é utilizado estritamente para o envio de comunicações de transparência e controle social da administração pública municipal.
     - **Descadastramento de 1 Clique (RFC 8058):** Mecanismo de desinscrição instantânea sem necessidade de login ou formulários adicionais.
     - **Transparência Responsável com Servidores Públicos:** Política de divulgação agregada para gastos com diárias e viagens, preservando a intimidade e segurança dos servidores sem indexação nominal individual de pessoas em modelos de linguagem, ao mesmo tempo em que disponibiliza os totais consolidados e médias por afastamento para controle social.
6. **Atualização da Seção 2: Orientações para Atendimento de Consultas por Assistentes de IA:**
   - Instruir modelos de IA sobre como orientar cidadãos interessados em receber boletins ou seguir o portal nas redes sociais:
     - Como instruir o cidadão a assinar o boletim através do modal no portal ou link de inscrição.
     - Como esclarecer dúvidas sobre a privacidade dos dados cadastrados e revogação a qualquer tempo.
     - Como fornecer os links oficiais das redes sociais do projeto (X.com, Facebook e GitHub).

---

### 3. Foco Estrito no Domínio Cidadão e Conformidade com a Regra 12 de `AGENTS.md`
7. **Ausência Total de Vazamento de Detalhes Internos de Código:**
   - O texto dos arquivos `llms.txt` e `llms-full.txt` deve focar exclusivamente no entendimento do cidadão, pesquisador e agente de IA externo.
   - É expressamente proibida a menção a tabelas internas de banco (`newsletter_subscribers`), clientes de escrita (`dbWrite`), queries Kysely, modelos dbt (`fct_`), segredos de autenticação (`CRON_SECRET`, `RESEND_API_KEY`) ou fornecedores específicos de cloud (como Cloudflare, Resend, Supabase).
8. **Preservação Integral do Conteúdo Existente:**
   - Preservar rigorosamente todas as seções e conceitos contábeis previamente implementados:
     - 3 atos de despesas (Saúde Financeira YoY, Radar de Gastos Sensíveis, Monitoramento de Subitens .99, Restos a Pagar SSOT / Dívida Real, Diárias agregadas).
     - Posição fiscal, receitas orçamentárias e extra-orçamentárias, licitações com contratos vigentes, quadro de pessoal com limites LRF, previdência CAPREM e investimentos na saúde pública.
     - Especificação de cards dinâmicos OpenGraph (`/[portalSlug]/.../opengraph-image`).
     - Formato canônico e links consistentes entre `llms.txt` e `llms-full.txt`.

---

### 4. Suíte de Testes Automatizados e Gates de Qualidade
9. **Teste Automatizado de Integridade e Conformidade dos Guias (`apps/web/lib/__tests__/llms-guides.spec.ts`):**
   - Criar teste automatizado com Vitest validando:
     - Leitura e presença física dos arquivos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`.
     - Presença das seções essenciais de canais de notificação, redes sociais oficiais (X.com, Facebook, GitHub), boletim "Radar Porciúncula" e governança LGPD.
     - **Leak Check (Regra 12):** Garantir via asserções que termos internos proibidos (ex: `newsletter_subscribers`, `dbWrite`, `fct_`, `kysely`, `CRON_SECRET`, `RESEND_API_KEY`) não aparecem nos arquivos públicos.
     - Validação de formato das URLs públicas mencionadas.
10. **Baseline de Qualidade Mandatória:**
    - Todas as suítes de testes (`pnpm test`, `make test`, `make test/ts`) e compilação (`pnpm build`, `make check`) devem passar com 100% de aprovação.

---

## Tasks / Subtasks

- [x] Task 1: Atualização do arquivo sintético `apps/web/public/llms.txt` (AC: #1, #2, #3, #7, #8)
  - [x] 1.1: Adicionar seção de Canais de Notificação e Boletim Cívico ("Radar Porciúncula"), destacando inscrição, double opt-in e cancelamento RFC 8058.
  - [x] 1.2: Adicionar tópicos sobre redes sociais oficiais (X.com `@mtransparenciax`, Facebook Page e GitHub).
  - [x] 1.3: Adicionar diretrizes de governança e privacidade de dados em conformidade com a LGPD.
  - [x] 1.4: Revisar texto para garantir zero vazamento de jargão de infraestrutura ou código interno.

- [x] Task 2: Atualização do dicionário completo `apps/web/public/llms-full.txt` (AC: #4, #5, #6, #7, #8)
  - [x] 2.1: Criar Seção 1.9 (Canais Cívicos de Notificação, Boletim Periódico e Redes Sociais) detalhando métricas do boletim, ciclo de vida e bot social.
  - [x] 2.2: Criar Seção 1.10 (Governança, Proteção de Dados - LGPD e Boas Práticas Cívicas) com diretrizes de consentimento, revogação e agregação responsável de diárias.
  - [x] 2.3: Atualizar Seção 2 (Orientações para Atendimento de Consultas por Assistentes de IA) com respostas recomendadas para inscrições e redes sociais.
  - [x] 2.4: Auditar ausência de termos técnicos proibidos de backend/banco de dados.

- [x] Task 3: Criação da suíte de teste de integridade dos guias de IA (AC: #9)
  - [x] 3.1: Criar `apps/web/lib/__tests__/llms-guides.spec.ts` validando presença dos arquivos, cobertura dos novos canais e governança LGPD.
  - [x] 3.2: Implementar asserções de sanitização contra termos internos proibidos (Leak Check da Regra 12 de `AGENTS.md`).

- [x] Task 4: Validação de qualidade e encerramento do Epic 7 (AC: #10)
  - [x] 4.1: Executar `pnpm test` (testes frontend e banco) e `pnpm build` (compilação estrita e validação de sitemap).
  - [x] 4.2: Executar `make test` e `make check` (verificação completa do repositório).
  - [x] 4.3: Atualizar `sprint-status.yaml` refletindo o status da história.

### Review Findings

- [x] [Review][Patch] Corrigir URL do repositório GitHub para `https://github.com/maistransparencia/transparencia` [apps/web/public/llms.txt:37, apps/web/public/llms-full.txt:174, apps/web/lib/__tests__/llms-guides.spec.ts:65]
- [x] [Review][Patch] Ajustar regex de leak check para prefixos com underscore como `fct_` [apps/web/lib/__tests__/llms-guides.spec.ts:131]
- [x] [Review][Patch] Ajustar regex de extração de URL e autolinks markdown e testar arquivos separadamente [apps/web/lib/__tests__/llms-guides.spec.ts:145]
- [x] [Review][Patch] Otimizar leitura de disco em `llms-guides.spec.ts` com hook beforeAll [apps/web/lib/__tests__/llms-guides.spec.ts:22]
- [x] [Review][Patch] Remover linhas vazias extras ao final de `llms-full.txt` [apps/web/public/llms-full.txt:211]

---

## Dev Notes

### Diretrizes do Projeto e Guardrails (`AGENTS.md`)

- **Regra 12 (Manutenção dos Arquivos de Contexto `llms.txt` e `llms-full.txt`):**
  - Orientação ao Consumo Público por LLMs: os arquivos destinam-se a orientar agentes externos e leitores automatizados sobre como consumir e interpretar o conteúdo público.
  - Foco estrito no domínio do usuário/cidadão e conceitos STN/MCASP, sem poluição com detalhes internos de código (proibido mencionar `fct_`, Kysely, DuckDB, Cloudflare, Resend, Supabase, migrações, etc.).
- **Regra 15 (Segurança de Produção):**
  - Modificações em arquivos estáticos não realizam alterações em bancos remotos nem exigem credenciais de produção.
- **Regra 4 (Baseline de Qualidade Mandatória):**
  - Todas as suítes de testes (`pnpm test`, `make test/ts`, `make test`, `make check`) devem ser validadas.

### Análise de Arquivos a Serem Modificados (UPDATE) e Criados (NEW)

1. **`apps/web/public/llms.txt` (UPDATE):**
   - *Estado Atual:* 71 linhas. Apresenta visão geral do portal, rotas públicas contábeis e diretrizes de interpretação para IAs. Não menciona a newsletter, alertas fiscais por e-mail, redes sociais oficiais ou privacidade LGPD.
   - *Modificações:*
     - Adicionar seção de canais de notificação e engajamento cívico (Boletim "Radar Porciúncula", double opt-in, 1-click unsubscribe).
     - Documentar redes sociais oficiais (X.com `@mtransparenciax`, Facebook Page e GitHub).
     - Incorporar tópicos de governança e privacidade de dados em conformidade com a LGPD.
   - *Preservar:* Todas as rotas contábeis existentes, estrutura de 3 atos de despesas, restos a pagar SSOT, subitens residuais `.99`, cartões OpenGraph e links.

2. **`apps/web/public/llms-full.txt` (UPDATE):**
   - *Estado Atual:* 160 linhas. Seções 1.1 a 1.8 cobrem balanço, despesas (3 atos), receitas, licitações, pessoal, CAPREM, saúde e OG cards. Seção 2 cobre diretrizes para IAs.
   - *Modificações:*
     - Adicionar Seção 1.9 (Canais Cívicos de Notificação, Boletim Periódico e Redes Sociais).
     - Adicionar Seção 1.10 (Governança, Proteção de Dados - LGPD e Boas Práticas Cívicas).
     - Atualizar Seção 2 com orientações para a IA esclarecer dúvidas de cidadãos sobre assinaturas, redes sociais e privacidade.
   - *Preservar:* Seções 1.1 a 1.8 intactas, com detalhamento profundo de contas fiscais, fórmulas e métricas.

3. **`apps/web/lib/__tests__/llms-guides.spec.ts` (NEW):**
   - *Objetivo:* Teste unitário automatizado com Vitest para garantir a integridade contínua dos arquivos `llms.txt` e `llms-full.txt`.
   - *Comportamento:* Lê `node:fs/promises` em `apps/web/public/llms.txt` e `llms-full.txt`, valida tópicos obrigatórios (newsletter, redes, LGPD, double opt-in, unsubscribe) e asserta que palavras-chave de implementação interna não vazem para os documentos.

4. **`_bmad-output/implementation-artifacts/sprint-status.yaml` (UPDATE):**
   - Atualizar status de `7-5-documentacao-de-canais-de-distribuicao-e-sincronizacao-dos-guias-de-ia-llms-txt` para `ready-for-dev`.

### Aprendizados das Histórias Anteriores do Epic 7

- **Story 7.1:** Implementação dos cartões dinâmicos OpenGraph na edge em `/[portalSlug]/.../opengraph-image` para todas as rotas públicas, facilitando a prévia visual em WhatsApp e redes sociais.
- **Story 7.2:** Infraestrutura de newsletter cívica com tabela transacional de assinantes, conexão dual (`dbWrite`), rate limiting anti-abuso, modal interativo acessível, template de confirmação em React Email, cabeçalhos RFC 8058 `List-Unsubscribe` e endpoint `/api/newsletter/subscribe`.
- **Story 7.3:** Motor de compilação do boletim periódico "Radar Porciúncula", reunindo deltas de gastos pagos, receitas, classificação de risco do termômetro de opacidade `.99`, novos contratos vigiados e despacho seguro em lote via Resend.
- **Story 7.4:** Bot automatizado multi-canal para X.com (`@mtransparenciax`) e Facebook Pages com links sociais e compartilhamento público de dados municipais.
- **Story 6.6:** Padronização da escrita de `llms.txt` e `llms-full.txt` sob a ótica estrita de transparência pública e cidadania, sem jargões internos de engenharia de software.

---

## References

- [AGENTS.md: Regra 12](file:///Volumes/Projects/transparencia/AGENTS.md#L85-L95)
- [apps/web/public/llms.txt](file:///Volumes/Projects/transparencia/apps/web/public/llms.txt)
- [apps/web/public/llms-full.txt](file:///Volumes/Projects/transparencia/apps/web/public/llms-full.txt)
- [apps/web/app/sitemap.ts](file:///Volumes/Projects/transparencia/apps/web/app/sitemap.ts)
- [Story 7.1 Artifact](file:///Volumes/Projects/transparencia/_bmad-output/implementation-artifacts/7-1-geracao-dinamica-de-imagens-opengraph-og-cards-para-compartilhamento-social-e-whatsapp.md)
- [Story 7.2 Artifact](file:///Volumes/Projects/transparencia/_bmad-output/implementation-artifacts/7-2-infraestrutura-de-newsletter-civica-com-resend-react-email-modal-interativo-e-links-sociais.md)
- [Story 7.3 Artifact](file:///Volumes/Projects/transparencia/_bmad-output/implementation-artifacts/7-3-automacao-de-alertas-pos-elt-e-boletim-periodico-municipal-radar-porciuncula.md)
- [Story 7.4 Artifact](file:///Volumes/Projects/transparencia/_bmad-output/implementation-artifacts/7-4-integracao-social-e-bot-automatizado-no-x-com-mtransparenciax.md)
- [Story 6.6 Artifact](file:///Volumes/Projects/transparencia/_bmad-output/implementation-artifacts/6-6-atualizacao-dos-guias-de-consumo-publico-de-ia-llms-txt-e-llms-full-txt.md)

---

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash

### Debug Log References

- Executado `pnpm --filter web test` com 37 arquivos e 176 testes passando 100%.
- Executado `pnpm test` (monorepo turbo) com 4 tasks bem sucedidas.
- Executado `pnpm build` com sucesso em todos os 3 pacotes (@transparencia/ui, @transparencia/db, web).
- Executado `make check` (ruff check, ruff format, mypy) com 0 erros.
- Executado `make test` com 83 testes pytest passando 100%.

### Completion Notes List

- Task 1 concluída:
  - Atualizado `apps/web/public/llms.txt` com a nova seção `Canais Cívicos de Notificação e Distribuição` documentando o Boletim Cívico por E-mail ("Radar Porciúncula"), canais de inscrição via modal e rota web, confirmação segura por double opt-in e cancelamento imediato em 1 clique (RFC 8058).
  - Incluídos canais oficiais de redes sociais e código aberto: X.com (`@mtransparenciax`), Facebook Page e GitHub (`transparencia-mg`).
  - Incluídas diretrizes de governança, privacidade e LGPD: coleta mínima exclusiva de e-mail, não comercialização e revogação a qualquer momento.
  - Adicionado item nas diretrizes para IAs sobre orientação de cidadãos para inscrição no boletim e acompanhamento nas redes oficiais.
  - Auditoria de vazamento realizada com zero termos técnicos internos (Regra 12 de `AGENTS.md`).
- Task 2 concluída:
  - Criada Seção 1.9 em `apps/web/public/llms-full.txt` detalhando o Boletim Cívico "Radar Porciúncula" (balanço anual, classificação de risco do Termômetro de Opacidade Normal/Atenção/Crítico, novos contratos e credores vigiados), ciclo de vida do assinante (Pendente -> Confirmado via Double Opt-In -> Cancelado RFC 8058), mecanismos de defesa anti-abuso (rate limiting, honeypot invisível, temporizador) e redes sociais oficiais (X.com, Facebook, GitHub).
  - Criada Seção 1.10 em `apps/web/public/llms-full.txt` detalhando governança e conformidade com a LGPD (Lei 13.709/2018), finalidade exclusiva, 1-click unsubscribe (RFC 8058) e política de transparência responsável com servidores públicos (diárias e viagens agregadas sem indexação nominal individual de pessoas físicas).
  - Atualizada a Seção 2 com orientações para modelos de IA sobre atendimento a munícipes relativo a subscrições de boletins, garantias de privacidade LGPD e links de redes sociais.
  - Realizada auditoria de conformidade com a Regra 12 de `AGENTS.md` (zero termos técnicos de banco ou infraestrutura).
- Task 3 concluída:
  - Criado teste automatizado [`apps/web/lib/__tests__/llms-guides.spec.ts`](file:///Volumes/Projects/transparencia/apps/web/lib/__tests__/llms-guides.spec.ts) com Vitest, cobrindo:
    1. Presença física e volume mínimo de conteúdo de `llms.txt` e `llms-full.txt`.
    2. Cobertura dos canais cívicos, boletim "Radar Porciúncula", double opt-in e cancelamento RFC 8058.
    3. Presença oficial de redes sociais e links (X.com, Facebook, GitHub).
    4. Conformidade com governança e proteção de dados LGPD (coleta mínima, finalidade exclusiva, responsabilidade com servidores sem indexação nominal).
    5. Diretrizes de orientação ao cidadão na seção de IA.
    6. Leak Check rigoroso contra 9 termos técnicos proibidos de backend/infraestrutura (Regra 12 de `AGENTS.md`).
    7. Validação de formato e integridade das URLs públicas.
    8. Preservação integral de conceitos STN/MCASP (estágios de despesa, dívida real, restos a pagar, subitens .99 e cards OG).
  - Formatado via Biome e aprovado 100% em conjunto com todos os testes da aplicação web (37 arquivos, 176 testes).
- Task 4 concluída:
  - Executados `pnpm test` e `pnpm build` (suíte frontend, banco, Next.js e TypeScript estrito).
  - Executados `make check` e `make test` (linters, checagens estáticas e testes de integração pytest).
  - Atualizado `sprint-status.yaml` para `review` na história 7.5.

### File List

- `apps/web/public/llms.txt`
- `apps/web/public/llms-full.txt`
- `apps/web/lib/__tests__/llms-guides.spec.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/7-5-documentacao-de-canais-de-distribuicao-e-sincronizacao-dos-guias-de-ia-llms-txt.md`
