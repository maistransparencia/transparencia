---
baseline_commit: 1483a0bc4d70d13a1f6ea4a34006853ed8b2d39c
---

# Story 8.6: Documentação Metodológica Cívica e Sincronização dos Guias de IA (`llms.txt`)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an external AI assistant, investigative researcher, or citizen,
I want updated documentation in `llms.txt` and `llms-full.txt` describing the calculation methodologies, the "Show Your Work" export endpoints, the decomposed debt popovers, and the institutional consolidation rules,
So that AI agents consuming the portal can explain to citizens exactly how calculations were derived, how to interpret municipal debt across entities, and provide direct download links to audit spreadsheets in accordance with Rule 12 of `AGENTS.md`.

---

## Acceptance Criteria

1. **Sincronização do Guia Compacto (`apps/web/public/llms.txt`):**
   - Atualizar a seção de navegação e rotas públicas e as diretrizes de interpretação contábil em `llms.txt` incorporando as inovações introduzidas na Epic 8:
     - **Exportação Direta de Dados Brutos ("Show Your Work"):** Documentar a rota `/api/[portalSlug]/export` com seus parâmetros de consulta (`tipo`, `ano`, `categoria`, `funcaoCodigo`, `entidades`, `delimitador`), especificação do streaming CSV com BOM UTF-8, delimitador `;` ou `,`, rate limit de 30 req / 5 min e garantia de paridade centavo a centavo com os cards.
     - **Decomposição da Dívida Real por Entidade Pública:** Documentar que no Radar de Gastos Sensíveis a dívida real é detalhada por órgão/entidade municipal (ex: Fundo de Saúde para ambulâncias vs Prefeitura para gabinete), com valores em Reais e percentuais relativos, prevenindo generalizações indevidas.
     - **Perímetro Institucional (`Consolidado` vs. `Filtrado por Entidade`):** Documentar o conceito do perímetro contábil municipal: por padrão o portal apresenta a visão consolidada de todas as entidades municipais (`Consolidado`), mas permite a filtragem individual ou múltipla via parâmetro `?entidades=1,2`, sincronizado em tempo real no desktop e no novo seletor compacto do cabeçalho móvel.
     - **Navegação Móvel Contínua (`MobileBottomNav`):** Documentar a sequência canônica de páginas cívicas do portal (Visão Geral → Despesas → Receitas → Orçamento → Licitações → Quadro de Pessoal → Saúde → Previdência) percorrida via controles de avanço/retrocesso (*stepper*) com seletor de ano integrado no rodapé móvel.
     - **Nova Diretriz de Atendimento para IA (Download Direto para Auditoria Social):** Instruir os modelos de linguagem a fornecer o link direto de exportação CSV (`https://maistransparencia.com/api/[portalSlug]/export?tipo=...&ano=...`) sempre que um cidadão ou pesquisador solicitar conferência, auditoria ou comprovação matemática dos números.

2. **Detalhamento Metodológico Abrangente no Dicionário Completo (`apps/web/public/llms-full.txt`):**
   - Atualizar e expandir as seções em `apps/web/public/llms-full.txt`:
     - **Ato 5: Infraestrutura "Show Your Work" (em 1.2):** Revisar e consolidar a especificação completa do endpoint `/api/[portalSlug]/export`: enum dos tipos suportados (`gasto_sensivel`, `opacidade_99`, `funcao`), regras de validação, as 13 colunas canônicas exportadas (`numero_empenho`, `data_empenho`, `orgao_nome`, `credor_nome`, `credor_cpf_cnpj`, `objeto_descricao`, `natureza_codigo`, `valor_empenhado`, `valor_liquidado`, `valor_pago`, `categoria_sensivel`, `categoria_sugerida`, `natureza_codigo_sugerido`), salvaguarda contra CSV Formula Injection (DDE) e paridade matemática absoluta.
     - **Nova Subseção 1.11: Perímetro Institucional, Consolidação Contábil e Decomposição da Dívida:**
       - *Perímetro Consolidado:* Conceito contábil do orçamento consolidado municipal, somando administração direta e indireta (Prefeitura Municipal, Fundos Municipais com CNPJ próprio e Autarquias) como visão padrão e abrangente das contas públicas.
       - *Perímetro Filtrado:* Funcionamento do filtro de entidades (`entidades`), isolando a execução financeira e orçamentária de órgãos específicos sem duplicidade.
       - *Metodologia da Dívida Real Decomposta:* Fórmula de cálculo da dívida por entidade (`valorDivida = dividaExercicio + dividaRestos`), cálculo das barras de proporção relativa (%) sobre o total acumulado da categoria e contexto cívico para esclarecer qual ente gerou a obrigação.
       - *Navegação Mobile Contínua:* Descrição da experiência mobile-first com a barra de rodapé persistente e o ciclo de navegação sequencial cívica.
     - **Expansão das Orientações para Atendimento de Consultas por Assistentes de IA (Seção 2):**
       - Diretriz explícita para formulação de URLs de download direto CSV em respostas a pedidos de auditoria de dados brutos.
       - Diretriz para explicação da decomposição da dívida em gastos sensíveis, orientando o cidadão sobre qual órgão municipal incorreu na despesa.
       - Diretriz para esclarecer a diferença entre visão municipal consolidada e dados de uma entidade individual filtrada.
       - Diretriz sobre a navegação sequencial no portal para cidadãos em dispositivos móveis.

3. **Conformidade Estrita com a Regra 12 de `AGENTS.md` (Leak Check e Foco Cívico):**
   - O conteúdo de `llms.txt` e `llms-full.txt` deve focar exclusivamente no entendimento das rotas, dicionário de campos públicos, conceitos contábeis (STN/MCASP) e orientações de consulta para assistentes de IA.
   - **Proibição Absoluta de Vazamento de Código ou Infraestrutura:** Nenhuma menção a nomes de tabelas de banco de dados internas (ex: prefixos `fct_`, `dim_`, `stg_`), bibliotecas de acesso a dados (`kysely`), secrets de ambiente (`CRON_SECRET`, `RESEND_API_KEY`), provedores de nuvem/banco (`Supabase`, `Cloudflare`, `Resend`) ou funções internas de query (`getRawDespesasExportRecords`, `dbWrite`).

4. **Expansão da Suíte de Testes Automatizados (`apps/web/lib/__tests__/llms-guides.spec.ts`):**
   - Atualizar a suíte de testes em Vitest para garantir que todas as novas seções e diretrizes da Epic 8 estejam presentes e válidas:
     - Teste de presença e documentação da infraestrutura "Show Your Work", endpoint `/api/[portalSlug]/export`, colunas canônicas e paridade matemática.
     - Teste de presença e documentação da Decomposição da Dívida Real por entidade pública e barras proporcionais.
     - Teste de presença e documentação do Perímetro Institucional (`Consolidado` vs. `Filtrado por Entidade`) e seletor mobile.
     - Teste de presença e documentação da navegação mobile contínua (`MobileBottomNav`) e sequência de páginas.
     - Teste de presença das diretrizes de atendimento para IA para geração de links diretos de auditoria CSV e explicação de escopo.
     - Manutenção e reforço do Leak Check com asserções estritas contra termos de infraestrutura interna.
     - Validação de integridade de todas as URLs referenciadas nos arquivos.

5. **Aprovação nos Gates de Qualidade:**
   - 100% de sucesso na execução de:
     - `pnpm --filter web test lib/__tests__/llms-guides.spec.ts`
     - `make test/ts` (ou `pnpm test`)
     - `pnpm build`
     - `make check`
     - `make test`

---

## Tasks / Subtasks

- [x] Task 1: Atualizar o arquivo canônico compacto `apps/web/public/llms.txt` (AC: 1, 3)
  - [x] Subtask 1.1: Na seção "Navegação e Rotas Públicas", revisar a rota `/api/[portalSlug]/export` detalhando os parâmetros aceitos, delimitador e garantia de paridade centavo a centavo.
  - [x] Subtask 1.2: Na seção "Navegação e Rotas Públicas", adicionar a descrição da navegação contínua mobile (`MobileBottomNav`) e sequência canônica de páginas cívicas.
  - [x] Subtask 1.3: Na seção "Diretrizes de Interpretação Contábil para IAs", adicionar diretrizes para:
    - Decomposição da Dívida Real por entidade pública municipal nos gastos sensíveis.
    - Perímetro Institucional: visão Consolidada vs. Filtrada por Entidade (`?entidades=1,2`).
    - Geração de links diretos de download CSV para auditoria cidadã ("Show Your Work").
  - [x] Subtask 1.4: Realizar auditoria visual contra termos técnicos internos proibidos (Regra 12 de `AGENTS.md`).

- [x] Task 2: Atualizar o arquivo completo `apps/web/public/llms-full.txt` (AC: 2, 3)
  - [x] Subtask 2.1: Na seção 1.2 (Ato 5), atualizar o detalhamento do endpoint `/api/[portalSlug]/export`, conferindo as 13 colunas canônicas exportadas, formato com BOM UTF-8, sanitização contra injeção de fórmulas e paridade matemática exata.
  - [x] Subtask 2.2: Criar a seção 1.11 "Perímetro Institucional, Consolidação Contábil e Navegação Móvel Contínua", detalhando:
    - Critérios de consolidação de todas as entidades municipais (visão padrão do portal).
    - Mecânica e escopo do filtro por entidade municipal (prevenindo contagem dupla e isolando obrigações).
    - Metodologia de cálculo da decomposição da dívida real por entidade pública e barras proporcionais.
    - Arquitetura de navegação móvel contínua com barra fixa inferior e sequência das seções municipais.
  - [x] Subtask 2.3: Na Seção 2 "Orientações para Atendimento de Consultas por Assistentes de IA", adicionar itens numerados dedicados a:
    - Como formular links de exportação CSV para atendimento a pedidos de auditoria de dados brutos.
    - Como esclarecer a decomposição da dívida por entidade pública nos gastos sensíveis.
    - Como explicar o perímetro contábil municipal (`Consolidado` vs órgão individual) ao cidadão.
  - [x] Subtask 2.4: Realizar auditoria visual e textual contra termos de infraestrutura interna.

- [x] Task 3: Atualizar e expandir a suíte de testes `apps/web/lib/__tests__/llms-guides.spec.ts` (AC: 4)
  - [x] Subtask 3.1: Adicionar caso de teste validando a documentação da infraestrutura "Show Your Work" (`/api/[portalSlug]/export`, colunas de auditoria, delimitadores, paridade centavo a centavo) em ambos os arquivos.
  - [x] Subtask 3.2: Adicionar caso de teste validando a documentação da Decomposição da Dívida Real por entidade pública e notas metodológicas de prevenção de atribuição errônea.
  - [x] Subtask 3.3: Adicionar caso de teste validando a documentação do Perímetro Institucional (`Consolidado` vs. `Filtrado por Entidade`) e navegação contínua móvel.
  - [x] Subtask 3.4: Adicionar caso de teste validando as diretrizes de atendimento de IA (links de download direto CSV e orientação sobre escopo institucional).
  - [x] Subtask 3.5: Reforçar a lista do Leak Check garantindo que nenhum termo interno adicionado durante a Epic 8 tenha vazado.

- [x] Task 4: Validação Integrada, Tipos e Linters (AC: 5)
  - [x] Subtask 4.1: Executar `pnpm --filter web test lib/__tests__/llms-guides.spec.ts` e certificar 100% de aprovação.
  - [x] Subtask 4.2: Executar `pnpm build` e checagem estática de tipos (`tsc --noEmit`).
  - [x] Subtask 4.3: Executar `make test/ts`, `make check` e `make test`.

### Review Findings

- [x] [Review][Patch] Alinhamento da Navegação Móvel com a Tab Bar de 5 Abas e Seletor de Ano no Cabeçalho [apps/web/public/llms.txt:32, apps/web/public/llms-full.txt:250-260, apps/web/lib/__tests__/llms-guides.spec.ts:81-95]
- [x] [Review][Patch] Correção do parâmetro canônico de gastos sensíveis no exemplo de exportação (categoria=combustivel_frota) [apps/web/public/llms.txt:106]
- [x] [Review][Patch] Remoção do identificador de componente React MobileBottomNav nos guias públicos e inclusão no Leak Check [apps/web/public/llms.txt:32, apps/web/public/llms-full.txt:247, apps/web/lib/__tests__/llms-guides.spec.ts:109]
- [x] [Review][Patch] Validação estrita de parâmetros e categorias nas URLs de exemplo documentadas [apps/web/lib/__tests__/llms-guides.spec.ts:123-157]

---

## Dev Notes

### Padrões Arquiteturais e Guardrails Mandatórios

- **Regra 12 de `AGENTS.md` (Manutenção dos Guias de IA `llms.txt` e `llms-full.txt`):**
  - Orientação ao Consumo Público por LLMs: os arquivos destinam-se a orientar agentes de IA externos e modelos de linguagem sobre como consumir, consultar e interpretar o conteúdo público de transparência fiscal do município.
  - Sincronização Obrigatória com a Epic 8: todas as rotas públicas, novos recursos analíticos (Show Your Work, Decomposição da Dívida Real, Seletor de Perímetro Institucional, Mobile Bottom Nav) devem estar documentados de forma clara e padronizada.
  - Foco Exclusivo no Domínio do Usuário/Cidadão: proibição estrita de termos de infraestrutura interna, tabelas do banco de dados (`fct_*`, `dim_*`), bibliotecas de código (`kysely`), secrets de ambiente (`CRON_SECRET`, `RESEND_API_KEY`) ou provedores (`Supabase`, `Cloudflare`, `Resend`).
- **Prevenção de Duplicação e Preservação de Contexto:**
  - As seções existentes sobre Posição Fiscal, Gastos Sensíveis, Subitens .99, Restos a Pagar, Receitas, Licitações, Pessoal, Previdência, Saúde, Newsletter Cívica (Radar Porciúncula), Redes Sociais (@mtransparenciax) e Governança LGPD devem ser rigorosamente preservadas sem regressões.

### Arquivos em Modificação (UPDATE)

1. `apps/web/public/llms.txt`:
   - **Estado Atual:** Guia compacto com rotas principais, canais cívicos e 9 diretrizes de interpretação contábil. Já possui menção sumária ao endpoint de exportação na linha 31.
   - **O que Esta História Altera:**
     - Expansão da rota de exportação e inclusão da rota mobile contínua (`MobileBottomNav`).
     - Inclusão das diretrizes contábeis e de atendimento para:
       - Decomposição da dívida por entidade pública (evitar atribuir ao gabinete despesas de saúde/ambulâncias).
       - Perímetro Institucional: escopo Consolidado vs. Filtrado por Entidade.
       - Geração de links diretos de auditoria CSV pelos modelos de linguagem (`https://maistransparencia.com/api/[portalSlug]/export?tipo=...`).
   - **O que Deve Ser Preservado:** Toda a formatação markdown, links para `llms-full.txt`, dados do município de Porciúncula, canais cívicos (@mtransparenciax, boletim Radar Porciúncula) e termos contábeis STN/MCASP.

2. `apps/web/public/llms-full.txt`:
   - **Estado Atual:** Dicionário completo de dados públicos com seções 1.1 a 1.10 e seção 2 com 11 diretrizes para IA. O Ato 5 em 1.2 já traz descrição do Show Your Work.
   - **O que Esta História Altera:**
     - Refinamento do Ato 5 com as 13 colunas canônicas exportadas e regras de parametrização.
     - Nova subseção 1.11 dedicada ao Perímetro Institucional, Consolidação Contábil, Metodologia da Dívida Real Decomposta e Navegação Mobile Contínua.
     - Expansão da Seção 2 com novas orientações para assistentes de IA (geração de links de auditoria CSV, explicação didática do perímetro institucional e orientação da dívida por órgão).
   - **O que Deve Ser Preservado:** Todas as seções 1.1 a 1.10 existentes, formato markdown e estilo didático-cívico.

3. `apps/web/lib/__tests__/llms-guides.spec.ts`:
   - **Estado Atual:** 8 testes unitários verificando existência, tamanho dos arquivos, canais de notificação, redes sociais, LGPD, leak check (termos proibidos), URLs válidas e conceitos contábeis STN/MCASP.
   - **O que Esta História Altera:**
     - Novos testes unitários cobrindo explicitamente os requisitos da Epic 8:
       - Show Your Work / Exportação CSV e paridade matemática.
       - Decomposição da Dívida Real por Entidade.
       - Perímetro Institucional (`Consolidado` vs `Filtrado por Entidade`) e navegação mobile.
       - Novas diretrizes de atendimento de IA.
     - Manutenção do Leak Check com verificação ampliada.
   - **O que Deve Ser Preservado:** Todos os 8 testes existentes devem continuar passando sem alteração de seus critérios.

### Testing Standards Summary

- Executar testes dos guias com:
  ```bash
  pnpm --filter web test lib/__tests__/llms-guides.spec.ts
  ```
- Executar suíte completa de testes TypeScript:
  ```bash
  make test/ts
  ```
- Executar build e linters:
  ```bash
  pnpm build
  make check
  make test
  ```

### Project Structure Notes

- Arquivos públicos de documentação para IA: `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`.
- Suíte de testes automatizados de guias e leak check: `apps/web/lib/__tests__/llms-guides.spec.ts`.
- Nenhuma dependência externa nova necessária.

### References

- [Regra 12 de AGENTS.md](file:///Volumes/Projects/transparencia/AGENTS.md#L107-L113): Diretrizes para manutenção dos arquivos `llms.txt` e `llms-full.txt`.
- [Story 8.2](file:///Volumes/Projects/transparencia/_bmad-output/implementation-artifacts/8-2-barra-fixa-de-navegacao-mobile-continua-mobilebottomnav-com-stepper-civico-e-seletor-de-ano.md): Barra Fixa de Navegação Mobile Contínua (`MobileBottomNav`).
- [Story 8.3](file:///Volumes/Projects/transparencia/_bmad-output/implementation-artifacts/8-3-infraestrutura-show-your-work-exportacao-direta-de-dados-brutos-csv-por-card-e-metrica.md): Infraestrutura "Show Your Work" — Exportação Direta de Dados Brutos (CSV).
- [Story 8.4](file:///Volumes/Projects/transparencia/_bmad-output/implementation-artifacts/8-4-popover-decomposto-da-divida-real-por-entidade-no-radar-de-gastos-sensiveis.md): Popover Decomposto da Dívida Real por Entidade.
- [Story 8.5](file:///Volumes/Projects/transparencia/_bmad-output/implementation-artifacts/8-5-seletor-compacto-de-perimetro-institucional-no-header-movel.md): Seletor Compacto de Perímetro Institucional no Header Móvel.

---

## Dev Agent Record

### Agent Model Used

Gemini 3.8 Flash

### Debug Log References

### Completion Notes List

- ✅ **Task 1 Concluída:** Atualização do arquivo canônico compacto `apps/web/public/llms.txt`.
  - Documentação da rota `/api/[portalSlug]/export` refinada com parâmetros, delimitador e garantia de paridade centavo a centavo.
  - Documentação da navegação móvel contínua (`MobileBottomNav`) com stepper de percurso cívico e seletor de ano persistente.
  - Inclusão das diretrizes contábeis 10 (Decomposição da Dívida Real por Entidade), 11 (Perímetro Institucional Consolidado vs Filtrado) e 12 (Fornecimento de Links Diretos de Exportação CSV / Show Your Work).
  - Auditoria visual e textual aprovada sem vazamento de termos de infraestrutura interna (Regra 12 de `AGENTS.md`).
  - Suíte de testes `llms-guides.spec.ts` validada e aprovada com 100% de sucesso.

- ✅ **Task 2 Concluída:** Atualização do arquivo completo `apps/web/public/llms-full.txt`.
  - Revisão do Ato 5 (Show Your Work) detalhando as 13 colunas canônicas exportadas (incluindo `categoria_sugerida` e `natureza_codigo_sugerido`), formato com BOM UTF-8, sanitização RFC 4180 / DDE e paridade matemática exata.
  - Criação da subseção 1.11 "Perímetro Institucional, Consolidação Contábil e Navegação Móvel Contínua", documentando o escopo consolidado municipal, funcionamento do filtro `?entidades=1,2`, metodologia de cálculo da dívida decomposta com barras percentuais proporcionais e o stepper contínuo móvel.
  - Expansão da Seção 2 com as diretrizes 12 (fornecimento de links diretos de download CSV), 13 (esclarecimento da dívida por entidade), 14 (explicação do perímetro institucional) e 15 (orientação sobre a navegação móvel persistente).
  - Auditoria visual e textual aprovada sem vazamento de termos de infraestrutura interna (Regra 12 de `AGENTS.md`).

- ✅ **Task 3 Concluída:** Atualização e expansão da suíte de testes `apps/web/lib/__tests__/llms-guides.spec.ts`.
  - Adicionado caso de teste validando a documentação da infraestrutura Show Your Work, endpoint `/api/[portalSlug]/export`, 13 colunas canônicas, BOM, delimitador e proteção contra injeção de fórmulas CSV.
  - Adicionado caso de teste validando a documentação da Dívida Real decomposta por entidade pública, barras percentuais proporcionais e metodologia contábil.
  - Adicionado caso de teste validando o Perímetro Institucional (`Consolidado` vs `Filtrado`), seletor mobile e sequência canônica de 8 páginas cívicas da `MobileBottomNav`.
  - Adicionado caso de teste validando as novas diretrizes de atendimento para assistentes de IA (links diretos CSV, explicação da dívida e perímetro).
  - Reforço da lista do Leak Check com 6 novos identificadores de código interno (`dim_`, `stg_`, `getRawDespesasExportRecords`, `EntidadeSelectCompact`, `MobileBottomNavComponent`, `debtPopover`, `useMobileStepper`).
  - Total de 12/12 testes executados e aprovados com 100% de sucesso.

- ✅ **Task 4 Concluída:** Validação Integrada, Tipos e Linters.
  - `pnpm --filter web test lib/__tests__/llms-guides.spec.ts`: 12/12 testes passando.
  - `pnpm build`: compilação e validação de tipos TypeScript concluída com 100% de sucesso nos 3 pacotes (`@transparencia/db`, `@transparencia/ui`, `web`).
  - `pnpm test`: 43 suítes de testes e 243 testes unitários/integração frontend passando.
  - `make check`: `ruff check`, `ruff format` e `mypy` 100% verdes sem warnings.
  - `make test`: 83/83 testes do backend/ELT passando.

### File List

- `apps/web/public/llms.txt`
- `apps/web/public/llms-full.txt`
- `apps/web/lib/__tests__/llms-guides.spec.ts`
