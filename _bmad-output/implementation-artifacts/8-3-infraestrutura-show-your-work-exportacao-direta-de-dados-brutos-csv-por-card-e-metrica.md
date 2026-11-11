---
baseline_commit: 2594f42009d6bc690ee79f7efc20105176bd38b4
---
# Story 8.3: Infraestrutura "Show Your Work" — Exportação Direta de Dados Brutos (CSV) por Card e Métrica

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a city councilor, investigative journalist, or public prosecutor,
I want to click a "Download Records for this Metric" button on any sensitive spending or opacity card to receive a raw CSV file,
So that I can verify line-by-line each commitment, creditor, invoice, and payment, confirming that the mathematical sum matches the displayed total cent-for-cent.

---

## Acceptance Criteria

1. **Gatilho de Auditoria e Botão de Exportação nos Cards Analíticos ("Show Your Work"):**
   - Nos cards analíticos do Radar de Gastos Sensíveis (`RadarGastosSensiveis`), no cabeçalho do Termômetro de Opacidade Contábil (`TermometroOpacidadeFiscal`) e nas seções de despesas municipais, deve ser disponibilizado o botão de auditoria `ShowYourWorkButton` ("Baixar CSV" / "Baixar Registros (CSV)").
   - O botão deve apresentar design sóbrio e profissional, ícone representativo (ex: `Download` ou `FileSpreadsheet` do Lucide), tooltip explicativa ("Baixar registros deste valor em planilha CSV para auditoria") e tamanho acessível (mínimo 44px de touch target em mobile).
   - Ao ser clicado, o botão dispara o download assíncrono do arquivo CSV sem recarregar a página e exibe estado de carregamento sutil (`Loader2` animado ou rótulo "Gerando CSV...") enquanto o stream é iniciado.
   - O nome do arquivo baixado deve seguir nomenclatura semântica explicativa:
     - Gastos sensíveis: `despesas_{portalSlug}_{categoria}_{ano}.csv` (ex: `despesas_porciuncula_combustivel_frota_2025.csv`).
     - Opacidade .99: `despesas_opacidade_residual_99_{portalSlug}_{ano}.csv`.
     - Funções orçamentárias: `despesas_funcao_{funcaoCodigo}_{portalSlug}_{ano}.csv`.

2. **Endpoint de API Seguro em Streaming (`/api/[portalSlug]/export`):**
   - Rota de API Next.js criada em `apps/web/app/api/[portalSlug]/export/route.ts` aceitando requisições `GET`.
   - Parâmetros validados via query string:
     - `tipo` (obrigatório): enum estrito `"gasto_sensivel" | "opacidade_99" | "funcao"`.
     - `ano` (obrigatório): número inteiro positivo (ex: 2015 a 2035).
     - `categoria` (obrigatório quando `tipo="gasto_sensivel"`): valor em lowercase snake_case (`combustivel_frota`, `locacao_maquinas_veiculos`, `locacao_imoveis`, `eventos_festas`, `diarias_viagens`, `obras_infraestrutura`).
     - `funcaoCodigo` (obrigatório quando `tipo="funcao"`): código de função orçamentária de 2 dígitos (ex: `"10"`, `"12"`).
     - `entidades` (opcional): lista separada por vírgulas de `empresa_id` (ex: `"1,2"`). Se omitido, considera todas as entidades ativas do portal.
     - `delimitador` (opcional): caractere delimitador `";"` (padrão) ou `","`.
   - Resposta com erro HTTP 400 (JSON `{ error: string }`) caso parâmetros obrigatórios ou valores de enum sejam inválidos.
   - Resposta com erro HTTP 404 caso o `portalSlug` não exista na configuração de portais.

3. **Proteção Contra Sobrecarga e Rate Limiting Anônimo:**
   - Integração com o utilitário canônico `apps/web/lib/rate-limit.ts` aplicando limite por IP (`checkRateLimit("export-ip:" + ip, limit=30, windowMs=5 * 60 * 1000)` — 30 downloads a cada 5 minutos).
   - Retorno de HTTP 429 Too Many Requests com cabeçalho `Retry-After` e mensagem amigável caso o limite de downloads seja excedido.

4. **Formatação CSV e Compatibilidade Nativa com Microsoft Excel e Google Sheets:**
   - O stream CSV deve iniciar obrigatoriamente com o Byte Order Mark (BOM) UTF-8 (`\uFEFF`) para garantir que o Microsoft Excel abra o arquivo imediatamente sem corrupção de acentos ou caracteres especiais da língua portuguesa.
   - O delimitador padrão deve ser ponto-e-vírgula (`;`), o padrão do Excel no Brasil para evitar que valores numéricos com vírgula decimal sejam interpretados como quebras de coluna.
   - Escape rigoroso de campos textuais conforme RFC 4180: qualquer campo contendo o delimitador, aspas duplas ou quebras de linha (`\n`, `\r`) deve ser delimitado por aspas duplas, com aspas internas duplicadas (`""`).
   - Valores monetários formatados como decimais brasileiros (`1234,56`) quando o delimitador for `;`, ou com ponto (`1234.56`) quando o delimitador for `,`.
   - Cabeçalhos de resposta HTTP padronizados:
     - `Content-Type: text/csv; charset=utf-8`
     - `Content-Disposition: attachment; filename="<nome_do_arquivo>.csv"`
     - `Cache-Control: no-cache, no-store, must-revalidate`

5. **Colunas Canônicas de Auditoria Cívica:**
   - O CSV exportado deve conter exatamente as seguintes colunas de auditoria na primeira linha (header):
     1. `numero_empenho` — Identificador do empenho (`empenho_id`)
     2. `data_empenho` — Data do empenho formatada (YYYY-MM-DD)
     3. `orgao_nome` — Nome da entidade/órgão (`entidade_nome` coalescido)
     4. `credor_nome` — Razão social ou nome do fornecedor (`fornecedor_nome`)
     5. `credor_cpf_cnpj` — CPF ou CNPJ formatado/higienizado (`fornecedor_cpf_cnpj`)
     6. `objeto_descricao` — Descrição do empenho/objeto licitado (`descricao`)
     7. `natureza_codigo` — Código da natureza da despesa (`natureza_despesa_codigo`)
     8. `valor_empenhado` — Valor total empenhado
     9. `valor_liquidado` — Valor total liquidado
     10. `valor_pago` — Valor total pago no exercício
     11. `categoria_sensivel` — Categoria sensível classificada (quando aplicável)
     12. `categoria_sugerida` — Categoria inferida/reclassificada pelo motor de auditoria contábil (`categoria_objeto_sugerida`)
     13. `natureza_codigo_sugerido` — Código da natureza de despesa sugerido pelo plano STN/MCASP (`natureza_despesa_codigo_sugerido`)

6. **Paridade Matemática Exata Centavo a Centavo (Regra de Ouro "Show Your Work"):**
   - A soma de `valor_pago` de todas as linhas do CSV exportado deve corresponder rigorosamente (com precisão de centavos, tolerância `< 0.01`) ao total exibido no respectivo card na interface web.
   - Para `gasto_sensivel`, os filtros SQL na tabela `fct_despesas` devem espelhar fielmente a lógica de `getRadarGastosSensiveisMetrics` (`fonte = 'exercicio'`, `portal_slug = portalSlug`, `ano = year`, `categoria_gasto_sensivel = categoria`, `empresa_id in (empresaIds)`).
   - Para `opacidade_99`, os filtros devem espelhar fielmente `fct_opacidade_contabil_metricas` (`fonte = 'exercicio'`, `(natureza_despesa_codigo like '%.99' or elemento = '99')`, `portal_slug = portalSlug`, `ano = year`, `empresa_id in (empresaIds)`).
   - Para `funcao`, os filtros devem espelhar `getDespesasPorFuncaoMetrics` (`fonte = 'exercicio'`, `funcao = funcaoCodigo`, `portal_slug = portalSlug`, `ano = year`, `empresa_id in (empresaIds)`).

7. **Arquitetura de Dados em `@transparencia/db` (Regra 2 de `AGENTS.md`):**
   - Nenhuma query Kysely deve ser executada dentro do handler Next.js.
   - Toda a lógica de extração de registros para exportação deve residir exclusivamente no módulo `@transparencia/db/src/queries/export-raw-data.ts`.
   - O handler da API route apenas orquestra a chamada, converte os DTOs em chunks CSV e devolve a `Response` com `ReadableStream`.

8. **Qualidade e Testes Automatizados:**
   - Suíte de testes unitários para a query de exportação em `packages/db/src/queries/__tests__/export-raw-data.spec.ts` validando:
     - Consulta por gasto sensível, opacidade residual e função orçamentária.
     - Paridade matemática centavo a centavo entre os itens do CSV e as agregações de `getRadarGastosSensiveisMetrics`.
     - Filtro correto por multi-entidades (`empresa_id`).
   - Suíte de testes da API Route em `apps/web/app/api/[portalSlug]/export/export-route.spec.ts` validando:
     - Retorno de status 200 com cabeçalhos corretos (`Content-Type`, `Content-Disposition`).
     - Presença do BOM UTF-8 `\uFEFF`.
     - Delimitação por `;` ou `,`.
     - Tratamento de parâmetros inválidos (status 400).
     - Acionamento do rate limiter (status 429).
   - Suíte de testes do componente `ShowYourWorkButton` em `apps/web/components/show-your-work-button.spec.tsx` e atualização dos testes de `RadarGastosSensiveis` e `TermometroOpacidadeFiscal`.
   - 100% de sucesso nos comandos: `make test/ts`, `pnpm --filter @transparencia/db test`, `pnpm --filter web test`, `pnpm build`, `make test` e `make check`.

---

## Tasks / Subtasks

- [x] Task 1: Implementar query atômica de exportação de dados brutos em `@transparencia/db` (AC: 5, 6, 7, 8)
  - [x] Subtask 1.1: Criar o arquivo `packages/db/src/queries/export-raw-data.ts` com interfaces `RawExportOptions`, `RawDespesaRecordDTO` e função `getRawDespesasExportRecords(options: RawExportOptions)`.
  - [x] Subtask 1.2: Implementar seleção em `fct_despesas` com as colunas canônicas (`empenho_id`, `data_empenho`, `entidade_nome`, `fornecedor_nome`, `fornecedor_cpf_cnpj`, `descricao`, `natureza_despesa_codigo`, `empenhado`, `liquidado`, `pago`, `categoria_gasto_sensivel`).
  - [x] Subtask 1.3: Aplicar filtros condicionais em Kysely de acordo com o `tipo`: `"gasto_sensivel"`, `"opacidade_99"` ou `"funcao"`, garantindo paridade centavo a centavo com as queries agregadas.
  - [x] Subtask 1.4: Exportar a nova função e tipos no ponto de entrada `packages/db/src/index.ts`.
  - [x] Subtask 1.5: Criar suíte de testes unitários em `packages/db/src/queries/__tests__/export-raw-data.spec.ts` cobrindo todos os tipos e verificando paridade da soma de `valor_pago`.

- [x] Task 2: Implementar a API Route de streaming CSV em `apps/web` (AC: 2, 3, 4, 5, 8)
  - [x] Subtask 2.1: Criar `apps/web/app/api/[portalSlug]/export/route.ts` suportando requisições `GET`.
  - [x] Subtask 2.2: Implementar validação estrita de query params (`tipo`, `ano`, `categoria`, `funcaoCodigo`, `entidades`, `delimitador`) e resolução do portal via `getPortalConfig`.
  - [x] Subtask 2.3: Integrar proteção de rate limit anônimo por IP via `checkRateLimit` com limite de 30 requisições / 5 min.
  - [x] Subtask 2.4: Construir gerador de streaming em `ReadableStream` com BOM UTF-8 (`\uFEFF`), cabeçalho de colunas, escape RFC 4180 de caracteres especiais/delimitadores e formatação numérica adequada.
  - [x] Subtask 2.5: Configurar cabeçalhos HTTP (`Content-Type`, `Content-Disposition`, `Cache-Control`).
  - [x] Subtask 2.6: Criar suíte de testes de integração em `apps/web/app/api/[portalSlug]/export/export-route.spec.ts`.

- [x] Task 3: Criar componente de UI `ShowYourWorkButton` e integrar aos cards do portal (AC: 1, 8)
  - [x] Subtask 3.1: Criar `apps/web/components/show-your-work-button.tsx` com estados normal/carregando, ícone `Download`/`FileSpreadsheet`, tooltip explicativa e tratamento de disparo de download via URL ou fetch blob.
  - [x] Subtask 3.2: Integrar `ShowYourWorkButton` nos cards do `RadarGastosSensiveis` (`apps/web/components/radar-gastos-sensiveis.tsx`) em cada categoria analítica.
  - [x] Subtask 3.3: Integrar `ShowYourWorkButton` no cabeçalho do `TermometroOpacidadeFiscal` (`apps/web/components/termometro-opacidade-fiscal.tsx`).
  - [x] Subtask 3.4: Criar suíte de testes em `apps/web/components/show-your-work-button.spec.tsx` e atualizar os testes existentes em `radar-gastos-sensiveis.spec.tsx` e `termometro-opacidade-fiscal.spec.tsx`.

- [x] Task 4: Validação de Qualidade, Paridade e Build (AC: 8)
  - [x] Subtask 4.1: Executar `pnpm --filter @transparencia/db test` e verificar passagem de 100% dos testes da camada de dados.
  - [x] Subtask 4.2: Executar `pnpm --filter web test` e verificar passagem de 100% dos testes do frontend e API routes.
  - [x] Subtask 4.3: Executar `pnpm build` e checagem de tipos (`tsc --noEmit`).
  - [x] Subtask 4.4: Executar `make check` e `make test`.
  - [x] Subtask 4.5: Atualizar `sprint-status.yaml` para registrar o status da história.

### Review Findings

- [x] [Review][Decision] Divergência entre Card Consolidado de Opacidade (.99) e Filtro de Entidades no CSV — Decidido: preservada paridade consolidada total [apps/web/components/termometro-opacidade-fiscal.tsx:150]
- [x] [Review][Decision] Padrão de Interação UI: Menu Suspenso de 3 Pontos vs Botão Direto de Download — Decidido: mantido menu de 3 pontos para densidade visual minimalista [apps/web/components/show-your-work-button.tsx:139]
- [x] [Review][Patch] Proteção contra CSV Formula Injection (DDE) na exportação [apps/web/app/api/[portalSlug]/export/route.ts:32]
- [x] [Review][Patch] Revogação prematura de URL.revokeObjectURL provocando cancelamento de download [apps/web/components/show-your-work-button.tsx:117]
- [x] [Review][Patch] Remoção de fallback fixo de tenant (porciuncula_prefeitura) e prop portalSlug obrigatória [apps/web/components/show-your-work-button.tsx:13]
- [x] [Review][Patch] Exceção de banco mascarada como HTTP 200 com CSV vazio [packages/db/src/queries/export-raw-data.ts:136]
- [x] [Review][Patch] Validação de segurança: Rate limiting antes da consulta do portal e higienização de IP [apps/web/app/api/[portalSlug]/export/route.ts:109]
- [x] [Review][Patch] Validação estrita de funcaoCodigo, ano e conformidade com Regra 14 do AGENTS.md [apps/web/app/api/[portalSlug]/export/route.ts:158]
- [x] [Review][Patch] Acessibilidade WAI-ARIA e touch target do botão de 3 pontos para dispositivos móveis [apps/web/components/show-your-work-button.tsx:139]
- [x] [Review][Patch] Atualização dos guias de consumo por IA (llms.txt e llms-full.txt) com a rota de exportação [apps/web/public/llms.txt:1]
- [x] [Review][Patch] Teste unitário de paridade matemática centavo a centavo para Opacidade Residual .99 [packages/db/src/queries/__tests__/export-raw-data.spec.ts:1300]

---

## Dev Notes

### Padrões Arquiteturais e Guardrails Mandatórios

- **Arquitetura Baseada em Camadas (Regra 2 de `AGENTS.md`):**
  - **Camada `@transparencia/db`:** A query Kysely de extração de dados brutos (`getRawDespesasExportRecords`) deve residir exclusivamente em `packages/db/src/queries/export-raw-data.ts`. Nenhuma query SQL ou Kysely direta deve ser escrita dentro de `apps/web`.
  - **Camada Web (`apps/web`):** A rota em `apps/web/app/api/[portalSlug]/export/route.ts` apenas valida os parâmetros recebidos, invoca `@transparencia/db`, converte os registros em formato tabular CSV escapado e faz o stream da resposta HTTP.
- **Nenhum Acesso Direto a `process.env` (Regra 17 de `AGENTS.md`):**
  - Se variáveis de ambiente forem necessárias em `apps/web`, importar exclusivamente de `@/env`.
- **Nomeação Clara de Métricas e Variáveis (Regra 9 de `AGENTS.md`):**
  - Proibido usar identificadores encurtados ou opacos como `c_val`, `p_slug`, `cat`, `df`, `do`. Utilizar nomes explícitos: `portalSlug`, `categoriaGastoSensivel`, `valorPago`, `valorEmpenhado`, `numeroEmpenho`, `dataEmpenho`.
- **Valores Fixos em Lowercase Snake_case (Regra 10 de `AGENTS.md`):**
  - Todas as categorias e parâmetros de tipo devem utilizar lowercase snake_case: `"gasto_sensivel"`, `"opacidade_99"`, `"funcao"`, `"combustivel_frota"`, `"locacao_maquinas_veiculos"`, etc.
- **Estruturação de Condicionais sem Ternários Aninhados (Regra 13 de `AGENTS.md`):**
  - Zero ternários aninhados (`a ? b : c ? d : e`). Utilizar funções auxiliares com retornos antecipados (`return`) ou blocos `switch/case`.
- **Sem Duplicação de Sanitização (Regra 14 de `AGENTS.md`):**
  - Aproveitar as colunas limpas e padronizadas da mart `fct_despesas` (`entidade_nome`, `fornecedor_nome`, `fornecedor_cpf_cnpj`, `descricao`, `natureza_despesa_codigo`).
- **Segurança de Execução em Banco Local (Regra 15 de `AGENTS.md`):**
  - Todos os testes e validações devem rodar estritamente contra o PostgreSQL local (`localhost:5544`) ou mocks dos testes unitários.

### Especificação Técnica do Formato CSV e Streaming

1. **BOM UTF-8 (`\uFEFF`):**
   - O primeiro chunk emitido pelo `ReadableStream` deve conter o caractere `\uFEFF` (`new TextEncoder().encode("\uFEFF")`), forçando o Microsoft Excel a ler o encoding como UTF-8 sem exigir que o usuário importe dados manualmente pelo assistente de texto.
2. **Delimitador Padrão e Sanitização de Células:**
   - Delimitador padrão: `;` (ponto-e-vírgula).
   - Suporte opcional a `,` (vírgula) se solicitado via `?delimitador=,`.
   - Função de escape de célula:
     ```typescript
     function escapeCsvCell(value: string | number | null | undefined, delimiter: string): string {
       if (value === null || value === undefined) return "";
       const stringValue = String(value);
       if (
         stringValue.includes(delimiter) ||
         stringValue.includes('"') ||
         stringValue.includes("\n") ||
         stringValue.includes("\r")
       ) {
         return `"${stringValue.replace(/"/g, '""')}"`;
       }
       return stringValue;
     }
     ```
3. **Formatação Monetária no CSV:**
   - Com delimitador `;`, formatar números com vírgula decimal brasileira (`valor.toFixed(2).replace(".", ",")`).
   - Com delimitador `,`, manter ponto decimal padrão (`valor.toFixed(2)`).
4. **Streaming com `ReadableStream`:**
   ```typescript
   const encoder = new TextEncoder();
   const stream = new ReadableStream({
     start(controller) {
       controller.enqueue(encoder.encode("\uFEFF" + csvHeader + "\n"));
       for (const row of rows) {
         controller.enqueue(encoder.encode(formatCsvRow(row, delimiter) + "\n"));
       }
       controller.close();
     },
   });
   return new Response(stream, {
     headers: {
       "Content-Type": "text/csv; charset=utf-8",
       "Content-Disposition": `attachment; filename="${filename}"`,
       "Cache-Control": "no-cache, no-store, must-revalidate",
     },
   });
   ```

### Mapeamento das Colunas da Mart `fct_despesas`

| Coluna CSV | Coluna SQL (`fct_despesas`) | Descrição / Formatação |
|---|---|---|
| `numero_empenho` | `empenho_id` | Identificador único do empenho municipal |
| `data_empenho` | `data_empenho` | Data da emissão do empenho (YYYY-MM-DD) |
| `orgao_nome` | `coalesce(entidade_nome, orgao_codigo)` | Nome da entidade administrativa pagadora |
| `credor_nome` | `fornecedor_nome` | Nome ou razão social do favorecido |
| `credor_cpf_cnpj` | `fornecedor_cpf_cnpj` | CPF ou CNPJ formatado do fornecedor |
| `objeto_descricao` | `descricao` | Histórico/objeto discriminado da despesa |
| `natureza_codigo` | `natureza_despesa_codigo` | Código da rubrica contábil (ex: 3.3.90.30.99) |
| `valor_empenhado` | `empenhado` | Valor empenhado líquido |
| `valor_liquidado` | `liquidado` | Valor liquidado |
| `valor_pago` | `pago` | Valor pago efetivo no exercício |
| `categoria_sensivel` | `categoria_gasto_sensivel` | Tag em snake_case de gasto sensível |

### Estado Atual dos Arquivos a Serem Modificados

#### 1. `packages/db/src/queries/export-raw-data.ts` (NEW)
- Novo arquivo contendo a query Kysely `getRawDespesasExportRecords` e as interfaces tipadas de retorno.

#### 2. `packages/db/src/index.ts` (UPDATE)
- **O que faz hoje:** Exporta todas as queries de métricas e tipos do `@transparencia/db`.
- **O que esta story altera:** Adiciona export de `getRawDespesasExportRecords`, `RawExportOptions` e `RawDespesaRecordDTO`.
- **O que deve ser preservado:** Todas as exportações existentes.

#### 3. `apps/web/app/api/[portalSlug]/export/route.ts` (NEW)
- Nova rota da API em Next.js App Router para geração e streaming de arquivos CSV.

#### 4. `apps/web/components/show-your-work-button.tsx` (NEW)
- Novo componente cliente para renderizar o botão acessível de download com tooltip e feedback de carregamento.

#### 5. `apps/web/components/radar-gastos-sensiveis.tsx` (UPDATE)
- **O que faz hoje:** Renderiza os 6 cards temáticos de gastos sensíveis (`itens.map(...)`).
- **O que esta story altera:** Insere o botão `ShowYourWorkButton` no rodapé de cada card temático com `tipo="gasto_sensivel"` e `categoria={item.categoria}`.
- **O que deve ser preservado:** Todo o layout visual, badges de tendência, cálculo de peso no orçamento e dívida real acumulada.

#### 6. `apps/web/components/termometro-opacidade-fiscal.tsx` (UPDATE)
- **O que faz hoje:** Renderiza o card analítico de subitens residuais `.99`.
- **O que esta story altera:** Insere o botão `ShowYourWorkButton` no cabeçalho do card ao lado dos badges informativos com `tipo="opacidade_99"`.
- **O que deve ser preservado:** Todo o cálculo de risco, badges, lista de top credores e evolução histórica.

### Testing Standards

- **Testes de Backend (`@transparencia/db`):**
  - Executados via `vitest run` com banco de dados local Postgres configurado via `packages/db/src/vitest-setup.ts`.
  - O teste deve verificar explicitamente a **paridade matemática centavo a centavo**:
    ```typescript
    const exportRows = await getRawDespesasExportRecords({
      portalSlug: "porciuncula_prefeitura",
      ano: 2025,
      empresaIds: ["1", "2"],
      tipo: "gasto_sensivel",
      categoria: "combustivel_frota",
    });
    const sumExport = exportRows.reduce((acc, r) => acc + r.valorPago, 0);
    const radar = await getRadarGastosSensiveisMetrics("porciuncula_prefeitura", 2025, ["1", "2"]);
    const fuelItem = radar.itens.find((i) => i.categoria === "combustivel_frota");
    expect(Math.abs(sumExport - (fuelItem?.valorPagoAnoAtual ?? 0))).toBeLessThan(0.01);
    ```
- **Testes de Frontend e API Routes (`apps/web`):**
  - Testes com Vitest simulando requisições `Request` nativas para o handler `GET` de `route.ts`.
  - Verificação de parsing do stream de resposta e presença do BOM UTF-8 `\uFEFF`.
  - Mock de `fetch` ou download nos testes do componente `ShowYourWorkButton`.

---

## Dev Agent Record

### Agent Model Used

Gemini 3.8 Flash (Medium)

### Debug Log References

- Análise de esquemas da mart `fct_despesas` confirmou presença direta das colunas `entidade_nome`, `fornecedor_nome`, `fornecedor_cpf_cnpj`, `descricao`, `natureza_despesa_codigo`, `categoria_gasto_sensivel`, `empenhado`, `liquidado` e `pago`.
- Verificação das queries agregadas `getRadarGastosSensiveisMetrics` e `fct_opacidade_contabil_metricas` confirmou que ambas filtram estritamente por `fonte = 'exercicio'` no cálculo das despesas pagas do ano corrente, garantindo a baseline para paridade exata centavo a centavo.
- Utilitário de rate limit existente em `apps/web/lib/rate-limit.ts` validado para reuso imediato.

### Completion Notes List
 
- Story 8.3 criada com todas as diretrizes de código, especificações de streaming CSV, regras de formatação compatíveis com Excel no Brasil (BOM UTF-8 e ponto-e-vírgula), guardrails de integridade e paridade matemática exata centavo a centavo.
- Task 1 concluída com sucesso:
  - Implementada a query atômica `getRawDespesasExportRecords` em `packages/db/src/queries/export-raw-data.ts`.
  - Mapeadas as colunas canônicas de auditoria (`numeroEmpenho`, `dataEmpenho`, `orgaoNome`, `credorNome`, `credorCpfCnpj`, `objetoDescricao`, `naturezaCodigo`, `valorEmpenhado`, `valorLiquidado`, `valorPago`, `categoriaSensivel`).
  - Suportados os filtros condicionais por `tipo` (`"gasto_sensivel"`, `"opacidade_99"`, `"funcao"`), `empresaIds`, `categoria` e `funcaoCodigo`.
  - Exportados tipos e função em `packages/db/src/index.ts`.
  - Criada suíte de testes unitários em `packages/db/src/queries/__tests__/export-raw-data.spec.ts` com 100% de sucesso e validação de paridade matemática centavo a centavo com o Radar de Gastos Sensíveis e Despesas por Função.

- Task 2 concluída com sucesso:
  - Implementada a API Route de streaming CSV em `apps/web/app/api/[portalSlug]/export/route.ts`.
  - Validação rigorosa dos query params (`tipo`, `ano`, `categoria`, `funcaoCodigo`, `entidades`, `delimitador`) e resolução do portal via `getPortalConfig`.
  - Integração de rate limiting anônimo por IP (30 req / 5 min) via `checkRateLimit` com resposta 429 e header `Retry-After`.
  - Streaming em `ReadableStream` com BOM UTF-8 (`\uFEFF`), escape RFC 4180 e formatação monetária padrão brasileiro (`1234,56` com delimitador `;` ou `1234.56` com delimitador `,`).
  - Criada suíte de testes de integração em `apps/web/app/api/[portalSlug]/export/export-route.spec.ts` com 100% de sucesso (9 testes cobrindo status 200, 400, 404, 429, BOM bytes e escape).

- Task 3 concluída com sucesso:
  - Criado o componente cliente `apps/web/components/show-your-work-button.tsx` utilizando padrão clean com botão sutil de 3 pontos (`MoreVertical`), acessibilidade completa (aria-label, title), menu dropdown suspenso com fechamento ao clicar fora e na tecla Escape.
  - O dropdown apresenta a opção "Baixar registros (CSV)" com ícone `FileSpreadsheet`, subtitle explicativo, animação de loading com `Loader2` durante o download e tratamento de erros (inclusive HTTP 429).
  - Integrado o botão nos 6 cards do `RadarGastosSensiveis` (`apps/web/components/radar-gastos-sensiveis.tsx`) ao lado do badge no cabeçalho do card, mantendo o design limpo e sem poluição visual.
  - Integrado o botão no cabeçalho do `TermometroOpacidadeFiscal` (`apps/web/components/termometro-opacidade-fiscal.tsx`) ao lado do link de referência legal.
  - Conectados `portalSlug` e `entidades` na página de despesas (`apps/web/app/[portalSlug]/despesas/page.tsx`).
  - Criada suíte de testes em `apps/web/components/show-your-work-button.spec.tsx` (4 testes) e atualizados os testes existentes de `radar-gastos-sensiveis.spec.tsx` e `termometro-opacidade-fiscal.spec.tsx` (100% de sucesso).

- Task 4 concluída com sucesso:
  - `pnpm --filter @transparencia/db test`: 18 test files passaram (52 testes).
  - `pnpm --filter web test`: 41 test files passaram (213 testes).
  - `pnpm build`: build de produção do Next.js e compilação TypeScript concluídos com sucesso total (3 packages).
  - `make check`: ruff check, ruff format check e mypy estáticos no pipeline Python passaram 100%.
  - `make test`: 83 testes pytest do pipeline ELT/dbt passaram 100%.
  - Status da história atualizado para `review` em `sprint-status.yaml`.

### File List

- `_bmad-output/implementation-artifacts/8-3-infraestrutura-show-your-work-exportacao-direta-de-dados-brutos-csv-por-card-e-metrica.md` (MODIFIED)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (MODIFIED)
- `packages/db/src/queries/export-raw-data.ts` (NEW)
- `packages/db/src/queries/__tests__/export-raw-data.spec.ts` (NEW)
- `packages/db/src/index.ts` (MODIFIED)
- `apps/web/app/api/[portalSlug]/export/route.ts` (NEW)
- `apps/web/app/api/[portalSlug]/export/export-route.spec.ts` (NEW)
- `apps/web/components/show-your-work-button.tsx` (NEW)
- `apps/web/components/show-your-work-button.spec.tsx` (NEW)
- `apps/web/components/radar-gastos-sensiveis.tsx` (MODIFIED)
- `apps/web/components/radar-gastos-sensiveis.spec.tsx` (MODIFIED)
- `apps/web/components/termometro-opacidade-fiscal.tsx` (MODIFIED)
- `apps/web/components/termometro-opacidade-fiscal.spec.tsx` (MODIFIED)
- `apps/web/app/[portalSlug]/despesas/page.tsx` (MODIFIED)
