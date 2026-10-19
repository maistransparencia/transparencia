---
paths:
  - "apps/web/**"
  - "packages/ui/**"
---

## 12. MANUTENÇÃO DOS ARQUIVOS DE CONTEXTO E GUIA DE LEITURA PARA IA (`llms.txt` E `llms-full.txt`)

- **Orientação ao Consumo Público por LLMs**: Os arquivos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` destinam-se a orientar agentes de IA externos e modelos de linguagem (LLMs) sobre como **consumir, consultar e interpretar o conteúdo público** de transparência fiscal do município.
- **Sincronização Obrigatória**: Sempre que houver inclusão, alteração ou remoção de rotas públicas (`apps/web/app/[portalSlug]/`), adição de novos indicadores/métricas públicas (Posição Fiscal, Despesas, Receitas, Licitações, Pessoal, CAPREM, Saúde) ou mudanças nas convenções contábeis exibidas aos usuários, é **obrigatório** atualizar os arquivos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`.
- **Foco no Domínio do Usuário/Cidadão**: O conteúdo destes arquivos deve focar exclusivamente no entendimento das rotas, dicionário de campos públicos, conceitos contábeis (STN/MCASP) e orientações de consulta para assistentes de IA, sem poluição com detalhes internos de código ou infraestrutura.

## 17. CENTRALIZAÇÃO DE VARIÁVEIS DE AMBIENTE (PROIBIDO `process.env` DIRETO)

- **Proibição de `process.env` Direto:** Em toda a aplicação web (`apps/web`), é **estritamente proibido** acessar `process.env` diretamente no código da aplicação (ex: `process.env.DATABASE_URL`, `process.env.NEXT_PUBLIC_*`).
- **Padrão Obrigatório (`@/env`):** Todas as variáveis de ambiente devem ser importadas exclusivamente a partir do módulo canônico `apps/web/env.ts` (`import { env } from "@/env"`).
- **Validação e Defaults Centralizados no Schema Zod:** Novos parâmetros, segredos ou valores padrão (defaults) devem ser definidos e documentados diretamente no schema Zod em `apps/web/env.ts` e refletidos em `.env.example`, garantindo tipagem estrita, fail-fast e segregação entre `server` e `client`.
- **Exceções Estritas:** Apenas arquivos de infraestrutura interna do Next.js onde a checagem estática direta for mandatória para o bundler (como verificação de runtime em `apps/web/instrumentation.ts`) podem utilizar `process.env`.

## 20. LINKS OBRIGATÓRIOS PARA LEIS E NORMAS CITADAS NA APLICAÇÃO

- **Fundamentação Legal Acessível:** Sempre que qualquer lei, decreto, dispositivo constitucional ou norma infralegal for citado na interface (`apps/web/`, componentes, alertas, tooltips ou relatórios cívicos) — como Art. 37 da CF/88, Lei 4.320/64, Lei Complementar 101/2000 (LRF), Lei 14.133/2021, etc. —, é **obrigatório** disponibilizar o hyperlink direto e oficial para o respectivo texto legal.
- **Fontes Oficiais:** Utilizar preferencialmente os links canônicos do portal da Presidência da República / Casa Civil (`https://www.planalto.gov.br/...`), direcionando para o artigo ou fragmento específico quando aplicável (ex: `#art37`).
- **Padrão de UI:** Links externos para legislações devem incluir os atributos de segurança `target="_blank"` e `rel="noopener noreferrer"`, além do ícone acessível de link externo (`ExternalLink`) ou estilo sublinhado com contraste adequado, permitindo que o cidadão valide a fundamentação jurídica com um único clique.

## 24. CONSISTÊNCIA DE DESIGN SYSTEM, COMPONENTES E VOCABULÁRIO CÍVICO (ZERO TERMOS EXÓTICOS)

- **Consistência de Vocabulário e Ações:** É estritamente proibido inventar termos novos, jargões exóticos ou rótulos descolados do padrão da aplicação (ex: proibido inventar termos como `"Dossiê"`, `"Prontuário"`, `"Ficha Técnica Extra"`, `"Super Relatório"` ao introduzir novas páginas ou seções). Mantenha estrita uniformidade com as convenções já estabelecidas no portal:
  - Detalhamento de registros em modal/página: **`"Detalhes"`**, **`"Ver detalhes"`** ou **`"Fechar detalhes"`** (idêntico ao padrão de Licitações, Contratos e Emendas).
  - Títulos de janelas e cabeçalhos de contexto: **`"Detalhes da Obra"`**, **`"Detalhes do Contrato"`**, **`"Detalhes da Licitação"`**.
  - Ações de navegação e filtros: nomes simples, diretos e padronizados (`"Limpar filtros"`, `"Filtrar por..."`, `"Compartilhar"`).
- **Reuso Mandatório de Componentes do Design System (`packages/ui`):** Ao conceber novas telas ou funcionalidades, reutilize sempre os componentes canônicos existentes:
  - Modais: `ModalDialog` (com suporte a share, badge, título, subtítulo e rodapé padronizado).
  - Formatação e valores: helpers universais `fmtCurrency`, `fmtPercent`, `fmtCompact`, `fmtDate`, `fmtNumber`.
  - Badges e pílulas de status: classes de utilitários e paleta padrão do Tailwind já definidas nos tokens globais.
- **Uniformidade Tipográfica e Estilos de Fonte:** Não introduza famílias tipográficas alternativas nem classes arbitrárias de font-family fora da configuração oficial (`font-sans` para interface e `font-serif` para títulos editoriais e nomes de entidades municipais). Títulos de modais e seções devem seguir a mesma hierarquia de peso, entrelinha e tamanho dos módulos já consolidados.
- **Padrão de Interação Idêntico (Deep Linking):** Seções com detalhamento analítico (licitações, contratos vigentes, obras) devem compartilhar rigorosamente a mesma UX: abertura em modal contextual sobreposto, sincronização bidirecional e reativa com query params da URL (`?idProjeto=...`, `?contratoNumero=...`), histórico de navegação navegável via `pushState`/`replaceState` e redirecionamento limpo da rota direta para a rota base com parâmetro de busca.
