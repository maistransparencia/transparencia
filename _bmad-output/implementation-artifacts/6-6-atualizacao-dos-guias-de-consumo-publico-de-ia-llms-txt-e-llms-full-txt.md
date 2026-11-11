---
baseline_commit: 756743f
---

# Story 6.6: Atualização dos Guias de Consumo Público de IA (`llms.txt` e `llms-full.txt`)

**Status:** done  
**Epic:** Epic 6: Reformulação Fiscal da Homepage e Redesenho da Página de Despesas Detalhadas  

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an AI agent / external LLM / municipal auditor,  
I want updated and accurate public guides `/llms.txt` and `/llms-full.txt` documenting the restructured municipal expenses routes, macro execution KPIs (Empenhado, Liquidado, Pago, Quitação), the 5 canonical sensitive spending categories (Radar de Gastos Sensíveis), and the Single Source of Truth (SSOT) Restos a Pagar metrics (Dívida Real / Liquidado pendente vs Não-Processada, antiguidade e credores da gestão atual),  
so that external AI assistants, civic auditors, and automated readers can accurately interpret municipal budget execution stages and public accounts without hallucinating obsolete data structures, in accordance with Rule 12 of `AGENTS.md`.

## Acceptance Criteria

### 1. Atualização e Sincronização do Arquivo Sintético `apps/web/public/llms.txt`
1. **Descrição Atualizada da Rota de Despesas (`/despesas`):** O resumo da rota `/despesas` deve descrever fielmente a estrutura em 3 atos:
   - Termômetro macro de desembolso real (Empenhado, Liquidado, Pago, Taxa de Liquidação e Taxa de Quitação) com variação interanual (YoY).
   - Radar de Gastos Sensíveis com 5 categorias canônicas (Combustíveis & Frotas, Locação de Máquinas/Veículos, Eventos/Shows/Festividades, Diárias & Viagens, Obras & Infraestrutura) e monitoramento de tendência, economia e Dívida Real acumulada.
   - Restos a Pagar & Dívidas Herdadas (SSOT) com Dívida Real (Liquidado pendente), dívida não processada, credores da gestão atual, antiguidade da dívida mais antiga e ranking dos Top 5 credores.
   - Despesas com diárias e viagens agregadas com proteção de privacidade cidadã (sem indexação de nomes individuais de servidores).
2. **Descrição Atualizada da Homepage (`/[portalSlug]`):** Documentar claramente que a visão geral contém os cards macrofiscais com fracionamento tripartido de despesas (Empenhado, Liquidado e Pago) e que o ranking de credores foi centralizado na página de `/despesas`.
3. **Descrição das Rotas de Orçamento e Licitações:**
   - `/orcamento`: Acompanhamento da Lei Orçamentária Anual (LOA) e distribuição por Funções de Governo STN (Saúde, Educação, Urbanismo, etc.).
   - `/licitacoes`: Monitoramento de contratos de serviços vigentes com status de execução (`em_execucao`, `concluido`, `inexecutado`), prazos de vigência e limites de dispensa de licitação.

### 2. Detalhamento Aprofundado no Dicionário Completo `apps/web/public/llms-full.txt`
4. **Seção 1.2: Execução das Despesas Públicas & Controle de Gastos:**
   - Documentar detalhadamente cada uma das 5 categorias canônicas do Radar de Gastos Sensíveis (`combustivel_frota`, `locacao_maquinas_veiculos`, `eventos_festas`, `diarias_viagens`, `obras_infraestrutura`).
   - Definir os conceitos de **Dívida Real Acumulada** (valor liquidado pendente de pagamento) vs **Dívida Não-Processada** (saldo empenhado aguardando liquidação/execução do serviço).
   - Documentar a apresentação de Restos a Pagar com série histórica por ano de origem e Top 5 fornecedores credores.
   - Registrar as métricas de Diárias & Viagens agregadas (total do ano, média por afastamento e variação frente ao ano anterior).
5. **Seção 1.1: Posição Fiscal e Balanço Financeiro:**
   - Documentar o fracionamento do card de despesas (Empenhado, Liquidado e Pago) e os indicadores de Restos a Pagar com ano da dívida mais antiga e contagem de credores da gestão atual.
6. **Seção 2: Diretrizes de Interpretação Contábil e Regras para IAs:**
   - Explicar a regra de precedência dos 3 estágios da despesa pública (Empenhado $\ge$ Liquidado $\ge$ Pago).
   - Explicar a distinção contábil entre Restos a Pagar Processados (Dívida Real / Liquidado) e Não Processados (Empenhado a liquidar).
   - Orientar sobre a segregação por mandatos governamentais (`Gestão Atual` vs `Gestões Anteriores`).
   - Fornecer diretrizes sobre a resposta cidadã responsável: clareza em reais (R$), percentuais com 2 casas decimais e contextualização do exercício.

### 3. Foco no Domínio Cidadão e Conformidade com `AGENTS.md` (Regra 12)
7. **Abstração de Detalhes Internos:** O texto de ambos os arquivos deve focar exclusivamente no entendimento do cidadão/agente externo sobre os conceitos orçamentários, sem poluição com nomes de tabelas internas, queries Kysely, marts dbt ou código de infraestrutura.
8. **Preservação de Integridade:** Garantir que todos os links internos entre `llms.txt`, `llms-full.txt` e rotas do portal estejam válidos e funcionais.

---

## Tasks / Subtasks

- [x] [Task 1] Atualização do arquivo sintético `apps/web/public/llms.txt` (AC: 1, 2, 3, 7, 8)
  - [x] Atualizar descrição da rota `/despesas` com os 3 atos (Termômetro Macro, Radar de Gastos Sensíveis, Restos a Pagar SSOT / Dívida Real e Diárias).
  - [x] Atualizar descrição da rota `/` (Homepage) refletindo a centralização do ranking de credores na página de despesas.
  - [x] Revisar descrições de `/orcamento` e `/licitacoes` para sincronia total com os marts vigentes.
- [x] [Task 2] Atualização do dicionário expandido `apps/web/public/llms-full.txt` (AC: 4, 5, 6, 7, 8)
  - [x] Expandir Seção 1.2 detalhando as 5 categorias do Radar de Gastos Sensíveis, conceitos de Dívida Real vs Não-Processada, e diárias agregadas.
  - [x] Atualizar Seção 1.1 com as métricas do macrocard de despesas e antiguidade de restos a pagar.
  - [x] Atualizar Seção 2 (Diretrizes para IAs) reforçando estágios da despesa, dívida real e mandatos.
- [x] [Task 3] Validação de consistência e conformidade com `AGENTS.md` (AC: 7, 8)
  - [x] Auditar ausência de vazamento de jargão de infraestrutura/código (conforme Regra 12).
  - [x] Executar `pnpm build` e `pnpm test` para garantir integridade do build e sitemap.

---

## Dev Notes

### Diretrizes do Projeto e Guardrails (`AGENTS.md`)

- **Regra 12 (Manutenção dos Arquivos de Contexto `llms.txt` e `llms-full.txt`):**
  - Orientação ao Consumo Público por LLMs: os arquivos destinam-se a orientar agentes externos sobre como consultar e interpretar os dados públicos.
  - Foco estrito no domínio do usuário/cidadão e conceitos STN/MCASP, sem poluição com detalhes internos de código (ex: `fct_despesas`, Kysely, DuckDB, Cloudflare R2, etc.).
- **Regra 15 (Segurança de Produção):** Nenhuma alteração afeta banco de produção nem executa comandos remotos.

### Análise de Arquivos a Serem Modificados (UPDATE)

1. **`apps/web/public/llms.txt` (UPDATE):**
   - *Estado Atual:* Contém descrições gerais das rotas, mas com referências simplificadas da rota de despesas e sem o detalhamento dos 3 atos de fiscalização implantados no Epic 6.
   - *Alterações:* Sincronizar com as métricas atuais da Homepage e da página `/despesas` (3 atos: Macro KPIs, Radar de Gastos Sensíveis e Restos a Pagar SSOT / Dívida Real).
   - *Preservar:* Estrutura de cabeçalho, rotas existentes, regras de diretrizes contábeis e link para `llms-full.txt`.

2. **`apps/web/public/llms-full.txt` (UPDATE):**
   - *Estado Atual:* Seção 1.2 descreve campos de despesas de forma genérica.
   - *Alterações:* Detalhar os 3 atos de despesas, as 5 categorias canônicas do Radar de Gastos Sensíveis, os conceitos de Dívida Real (Liquidado em Restos a Pagar) e a exibição de Top 5 credores.
   - *Preservar:* Seções de Pessoal, Receitas, Licitações, CAPREM e Saúde.

### Aprendizados das Histórias Anteriores do Epic 6

- **Story 6.1:** Macrocard de Despesas na Homepage exibe Empenhado, Liquidado e Pago, além do ano da dívida mais antiga e credores da gestão atual no card de Restos a Pagar.
- **Story 6.2:** A tabela de Maiores Credores foi removida da Homepage e centralizada na rota dedicada `/despesas`.
- **Story 6.4:** A página `/despesas` foi redesenhada em 3 atos: (1) Saúde Financeira & Comparativo Anual + Radar de Gastos Sensíveis; (2) Restos a Pagar & Dívida Real (SSOT); (3) Diárias & Viagens (agregadas sem nomes de servidores).
- **Story 6.5:** O loader `loadDespesasData` foi otimizado com no máximo 4 leitores atômicos paralelos e os componentes órfãos foram expurgados.

---

## References

- [AGENTS.md: Regra 12](file:///Volumes/Projects/transparencia/AGENTS.md#L85-L95)
- [apps/web/public/llms.txt](file:///Volumes/Projects/transparencia/apps/web/public/llms.txt)
- [apps/web/public/llms-full.txt](file:///Volumes/Projects/transparencia/apps/web/public/llms-full.txt)
- [Story 6.4 Artifact](file:///Volumes/Projects/transparencia/_bmad-output/implementation-artifacts/6-4-redesenho-da-interface-da-pagina-de-despesas-detalhadas-despesas.md)
- [Story 6.5 Artifact](file:///Volumes/Projects/transparencia/_bmad-output/implementation-artifacts/6-5-otimizacao-do-data-loader-loaddespesasdata-e-desativacao-do-bloco-de-gastos-locais.md)
- [apps/web/app/sitemap.ts](file:///Volumes/Projects/transparencia/apps/web/app/sitemap.ts)

---

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash / Antigravity Agent

### Debug Log References

- `pnpm build`: compilado com 100% de sucesso sem erros de tipagem.
- `pnpm test`: 18 suítes web e 14 suítes db aprovadas (59 testes web + 32 testes db).

### Completion Notes List

- Atualizado `apps/web/public/llms.txt` documentando a rota `/despesas` em 3 atos (Termômetro Macro, Radar de Gastos Sensíveis, Restos a Pagar SSOT / Dívida Real e Diárias), centralização de credores na página de despesas e rotas de orçamento e licitações.
- Atualizado `apps/web/public/llms-full.txt` com especificação completa das 5 contas do radar de gastos sensíveis, conceitos de Dívida Real vs Não-Processada, diretrizes contábeis e precedência dos estágios da despesa.
- Auditada conformidade com a Regra 12 do `AGENTS.md`, com foco estrito no domínio cidadão sem vazamento de detalhes internos de implementação.

### File List

- `apps/web/public/llms.txt` (UPDATE)
- `apps/web/public/llms-full.txt` (UPDATE)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (UPDATE)
- `_bmad-output/implementation-artifacts/6-6-atualizacao-dos-guias-de-consumo-publico-de-ia-llms-txt-e-llms-full-txt.md` (UPDATE)
