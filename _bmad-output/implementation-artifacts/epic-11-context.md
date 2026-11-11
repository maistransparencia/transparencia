# Epic 11 Context: Automação da Ingestão de Dados, Notificações PWA e Fontes Consolidadas (TCE-RJ e SICONFI)

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Eliminar a dependência de extrações manuais em localhost através da automação do pipeline de ingestão na nuvem (Cloudflare Workers, Containers e Cron Triggers), integrar notificações nativas e Web Push no PWA (com infraestrutura VAPID, consentimento contextual/amigável e gatilhos automáticos para novas extrações e novas versões do app) e conduzir pesquisa aplicada de viabilidade de dados consolidados no estado do Rio de Janeiro (TCE-RJ / SIGFIS e SICONFI) para viabilizar expansão multi-cidade sem manutenção de scrapers ad-hoc municipais frágeis.

## Stories

- Story 11.1: Spike de R&D — Viabilidade de Dados Granulares no TCE-RJ (SIGFIS) & SICONFI
- Story 11.2: Infraestrutura de Automação de Ingestão de Dados (Cloudflare)
- Story 11.3: Backend & Infraestrutura de Web Push (VAPID, Subscriptions & Dispatcher)
- Story 11.4: Frontend & UX de Consentimento e Gestão de Notificações no PWA

## Requirements & Constraints

- **Avaliação de Fontes Estaduais e Nacionais (TCE-RJ e SICONFI)**: Auditar a viabilidade técnica e granularidade dos dados abertos do TCE-RJ (SIGFIS) e STN (SICONFI) para despesas detalhadas (empenhos, liquidações, pagamentos), receitas, folha de pagamento e contratações, produzindo matriz comparativa e diretriz técnica para suportar expansão multi-cidade sem scrapers municipais ad-hoc.
- **Automação do Pipeline de Ingestão em Nuvem**: O pipeline de extração e transformação em Python (`elt/`) deve executar de forma agendada e autônoma em ambiente de nuvem (Cloudflare Containers / Workers via Cron Triggers), sem dependência de intervenção em localhost, emitindo telemetria estruturada e alertas de falha.
- **Gatilhos Operacionais Pós-Ingestão (Webhooks)**: Ao concluir com sucesso um ciclo de extração e carga analítica, o pipeline em nuvem deve acionar um webhook interno autenticado para atualizar os metadados de extração do portal (`dim_portais`) e acionar o despachante de notificações.
- **Conformidade com Padrões Web Push (W3C & VAPID)**: A mensageria de notificações push deve aderir estritamente às especificações W3C Web Push, utilizando pares de chaves VAPID configurados e validados exclusivamente através de `@/env`.
- **Persistência de Assinaturas e Governança de Banco de Dados**: Os dados de subscrição (`endpoint`, `keys.p256dh`, `keys.auth`) devem ser armazenados em tabela dedicada no PostgreSQL (`push_subscriptions`) utilizando exclusivamente o tipo `TEXT` e DTOs tipados em `camelCase`.
- **Poda e Gestão de Subscrições Inválidas**: O serviço despachante de notificações deve tratar respostas `HTTP 410 Gone` e erros de inscrição revogada/expirada, expurgando automaticamente os registros inativos do banco de dados para evitar tentativas redundantes de envio.
- **Consentimento Transparente e Sem Spam**: O consentimento para notificações no PWA deve ser contextual e educativo, explicando o valor cívico antes de invocar a permissão nativa (`Notification.requestPermission()`), respeitando a recusa do usuário sem insistência agressiva.

## Technical Decisions

- **Spike Documental e Matriz Comparativa**: Mapear endpoints de dados abertos e APIs do TCE-RJ (SIGFIS) e SICONFI, avaliando defasagem temporal, integridade e esforço de integração em relatório técnico estruturado (`tce-rj-sigfis-viability-report.md`).
- **Arquitetura de Extração em Nuvem**: Encapsular scripts de ingestão existentes em `elt/` para execução programada via Cloudflare Containers / Workers acionados por Cron Triggers, integrando endpoints de webhook seguros.
- **Configuração Segura de Variáveis de Ambiente**: As credenciais VAPID (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) e tokens de webhooks internos devem ser definidos centralizadamente no schema Zod em `apps/web/env.ts` (`@/env`), sem acesso direto a `process.env`.
- **Camada de Dados de Subscrições (`@transparencia/db`)**: Criação da tabela `push_subscriptions` e métodos de consulta funcionais e imutáveis em `@transparencia/db/src/queries/push.ts` para persistência, recuperação e limpeza de inscrições.
- **Endpoints de Inscrição e Despacho de Push**: Endpoints de API (`/api/push/subscribe`, `/api/push/unsubscribe` e disparador interno de broadcast) gerenciando ciclo de vida das notificações via biblioteca especializada com dependências pinadas.
- **Integração com Service Worker do PWA**: O Service Worker (`sw.js`) deve ouvir o evento `'push'` para exibir a notificação nativa do sistema operacional (`self.registration.showNotification`) com payload estruturado e gerenciar o evento `'notificationclick'` para redirecionamento inteligente para a rota relevante do portal.

## UX & Interaction Patterns

- **Opt-in Contextual e Educativo**: O prompt nativo do navegador não deve ser solicitado no primeiro carregamento. A solicitação deve ser precedida de um componente contextual que explique o valor das atualizações fiscais e do monitoramento cívico.
- **Notificações Nativas e Deep Linking**: Notificações push nativas no sistema operacional com ícone institucional e texto conciso descrevendo novos dados ou novas versões do app; o clique direciona imediatamente para a tela de transparência correspondente.
- **Gestão de Preferências pelo Cidadão**: Fornecer controle visual acessível (toggle) nas configurações ou rodapé do aplicativo para gerenciar inscrições de notificação a qualquer momento.

## Cross-Story Dependencies

- **Story 11.1 → Arquitetura de Longo Prazo**: O spike do TCE-RJ/SICONFI define a viabilidade da transição de scrapers locais para fontes consolidadas, sem bloquear a automação imediata do pipeline existente na Story 11.2.
- **Story 11.2 → Story 11.3**: A automação da ingestão na nuvem provê o gatilho via webhook para o disparador de notificações push da Story 11.3.
- **Story 11.3 → Story 11.4**: A infraestrutura de backend, tabela de banco de dados e endpoints de VAPID/Push da Story 11.3 são dependências diretas para a integração do Service Worker e componentes de opt-in da Story 11.4.
- **Epic 10 → Epic 11**: O isolamento de schemas (`analytics`) e a paridade estrita de fixtures estabelecidos na Epic 10 garantem que a execução automatizada em nuvem opere sobre uma base de dados saneada.
- **Epic 11 → Epic 12**: O pipeline de ingestão autônoma e o canal de comunicação push do PWA fornecem a infraestrutura em tempo real necessária para o envio dos alertas de anomalias fiscais da Epic 12.
