---
baseline_commit: a1fdf9eaf58b28412084bba9a30f157e5b812daf
---
# Story 7.1: Geração Dinâmica de Imagens OpenGraph (OG Cards) para Compartilhamento Social e WhatsApp

Status: done

## Story

As a citizen or journalist sharing a portal URL on WhatsApp, X (Twitter), or Telegram,  
I want each page route (`/`, `/despesas`, `/licitacoes`, `/saude`, `/receitas`, `/orcamento`, `/pessoal`, `/caprem`) to automatically generate an informative 1200x630 dynamic OpenGraph preview card with real-time fiscal figures (e.g. Total Paid, Opacity Rate, Sensitive Spend Highlights, LRF Personnel limit),  
So that recipients in community groups can immediately understand the municipal fiscal context and be encouraged to click and inspect municipal public data.

---

## Acceptance Criteria

### 1. Geração Dinâmica na Rota e Dimensões Canônicas (Next.js `ImageResponse` / Satori)
1. **Dimensões e Tipo de Conteúdo:** Cada rota pública multi-tenant em `apps/web/app/[portalSlug]/` deve dispor de seu respectivo arquivo `opengraph-image.tsx` exportando `size = { width: 1200, height: 630 }`, `contentType = "image/png"` e gerando uma resposta binária PNG válida via `ImageResponse` de `next/og`.
2. **Isolamento Multi-tenant (`portalSlug`):** O gerador de imagem deve resolver assincronamente os parâmetros da rota (`const { portalSlug } = await params;`) e carregar os metadados municipais oficiais (`getPortalConfig(portalSlug)`) para exibir o nome oficial da entidade (ex: *"Prefeitura Municipal de Porciúncula - RJ"*).

### 2. Conteúdo Fiscal Contextualizado por Domínio
3. **Card da Homepage / Visão Geral (`apps/web/app/[portalSlug]/opengraph-image.tsx`):**
   - Exibe o título *"Visão Geral & Posição Fiscal"*.
   - Exibe estritamente as métricas oficiais visíveis na página: Total Arrecadado, Total Empenhado, Despesas Pagas e Comprometimento da Folha (LRF).
   - Sem uso de valores estimados.
4. **Card de Despesas (`apps/web/app/[portalSlug]/despesas/opengraph-image.tsx`):**
   - Exibe o título *"Despesas & Controle de Gastos"*.
   - Exibe o Total Pago no exercício e taxa de execução/pagamento.
   - Exibe o Termômetro de Opacidade Contábil (`.99`): percentual residual e status em Outros Serviços.
   - Exibe o valor do principal item do Radar de Gastos Sensíveis (ex: *Combustíveis & Frotas*).
5. **Card de Licitações (`apps/web/app/[portalSlug]/licitacoes/opengraph-image.tsx`):**
   - Exibe o título *"Licitações & Contratos Públicos"*.
   - Exibe o Total Homologado/Contratado e número de processos.
   - Exibe o total de Contratos de Serviços Vigentes ativos.
6. **Card de Saúde (`apps/web/app/[portalSlug]/saude/opengraph-image.tsx`):**
   - Exibe o título *"Saúde Pública & SUS Municipal"*.
   - Exibe o Orçamento da Saúde vs. Total Pago em Saúde.
   - Exibe os repasses de Medicamentos & Insumos e Emendas da Saúde com o valor empenhado no subtexto/detalhe.
7. **Cards das Demais Rotas (`receitas`, `orcamento`, `pessoal`, `caprem`):**
   - Receitas: Total Arrecadado, Receitas Próprias vs. Transferências (União/Estado).
   - Orçamento: Dotação Atualizada, Empenhado, Liquidado e Pago (os 4 estágios da execução orçamentária).
   - Pessoal: Total da Folha, Limite LRF de Pessoal, Total Pago e Chefias Efetivas.
   - CAPREM: Despesas Previdenciárias, Aportes Quitados, Patronal Pago e Servidores Efetivos.

### 3. Template Base Reutilizável & Design System Satori (`apps/web/components/og/`)
8. **Componente de Layout Base (`og-card-template.tsx`):**
   - Componente de layout JSX estilizado para Satori seguindo o design system claro e oficial do portal:
     - Fundo claro com gradiente suave (`linear-gradient(180deg, #ffffff 0%, #f8fafc 60%, #f1f5f9 100%)`), cards brancos `#ffffff` com bordas sutis em slate (`#e2e8f0`), cantos arredondados (`16px`) e tipografia em ardósia escuro (`#0f172a`).
     - Header: Logomarca vetorial oficial do *MaisTransparencia* (fundo `#5a72a8` com os 4 pilares/barras em alta definição de `favicon.svg`), badge de município/UF e nome da marca configurável.
     - Body: Título da página, subtítulo com ano de exercício e grid de blocos de métricas com valores destacados, rótulos claros e variantes de cor semânticas (`default`, `warning`, `success`, `danger`).
     - Footer: Identificação institucional dinâmica (`Dados Abertos Extraídos da <Prefeitura de Porciúncula>`), data da última extração (`Extração em DD/MM/AAAA`) e domínio configurável.
     - Sem sobreposição de texto em ícones (remoção de tags `<title>` internas de SVGs que geravam glitch no motor Satori).
9. **Compatibilidade Estrita com Satori:**
   - **Proibição de CSS Grid:** Satori **não suporta** `display: 'grid'`. Toda a composição visual utiliza estritamente flexbox (`display: 'flex'`, `flexDirection: 'column'` ou `'row'`, `gap`, `justifyContent`, `alignItems`, `flex: 1`).
   - Todas as cores, espaçamentos e fontes utilizam inline styles tipados (`React.CSSProperties`).

### 4. Cache, Performance e Resiliência
10. **Desempenho & Cache:** A geração de dados para os cards utiliza consultas diretas do Kysely com cache e runtime Node.js garantindo tempo de resposta ágil.
11. **Tratamento de Fallback Seguro:** Caso o banco esteja indisponível ou ocorra falha de rede, o gerador renderiza um card de fallback elegante com os metadados do município sem estourar erro 500.

### 5. Alinhamento de Metadados e Guias Públicos de IA
12. **Ajuste em `apps/web/lib/metadata.ts`:**
    - `createPortalMetadata` gera dinamicamente as tags `openGraph.images` e `twitter.images` canônicas para cada rota (`${baseUrl}${pagePath}/opengraph-image`) com dimensões 1200x630 e siteName configurável.
13. **Sincronização dos Guias de IA (`apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`):**
    - Documentação pública atualizada registrando os endpoints de imagem OpenGraph e as métricas oficiais de cada rota.

### 6. Validação e Gates de Testes
14. **Testes Automatizados:**
    - Suíte de testes unitários cobrindo template, rotas e metadados com 100% de sucesso.
    - `pnpm test`, `pnpm build`, `make test` e `make check` aprovados sem advertências.

---

## Tasks / Subtasks

- [x] **Task 1: Criação do Componente Base de Layout OG (`apps/web/components/og/og-card-template.tsx`)** (AC: #8, #9)
  - [x] Criar diretório `apps/web/components/og/`.
  - [x] Implementar `OGCardTemplate` em tema claro consistente com o portal, com flexbox estrito, tipografia em `#0f172a`, cards `#ffffff` com bordas `#e2e8f0`.
  - [x] Embutir vetor SVG oficial do portal (`favicon.svg`) com fundo `#5a72a8` e as 4 colunas verticais.
  - [x] Exibir no rodapé a identificação dinâmica (`Dados Abertos Extraídos do/da <nome>`), data da última extração (`lastExtractionDate`) e domínio configurável.
  - [x] Adicionar testes unitários em `apps/web/components/og/og-card-template.spec.tsx`.

- [x] **Task 2: Implementação dos Geradores de Imagem nas Rotas Principais** (AC: #1, #2, #3, #4, #5, #6, #7)
  - [x] Criar `apps/web/app/[portalSlug]/opengraph-image.tsx` (Homepage / Visão Geral: Total Arrecadado, Total Empenhado, Despesas Pagas, Comprometimento Folha LRF).
  - [x] Criar `apps/web/app/[portalSlug]/despesas/opengraph-image.tsx` (Despesas: Total Pago, Termômetro de Opacidade `.99`, Radar de Combustíveis, Total Empenhado).
  - [x] Criar `apps/web/app/[portalSlug]/licitacoes/opengraph-image.tsx` (Licitações: Total Homologado, Processos Licitatórios, Contratos Vigentes).
  - [x] Criar `apps/web/app/[portalSlug]/saude/opengraph-image.tsx` (Saúde: Orçamento da Saúde, Total Pago em Saúde, Medicamentos & Insumos, Emendas da Saúde com valor empenhado no subtexto).
  - [x] Criar `apps/web/app/[portalSlug]/receitas/opengraph-image.tsx` (Receitas: Total Arrecadado, Receitas Próprias, Repasses da União, Repasses do Estado).
  - [x] Criar `apps/web/app/[portalSlug]/orcamento/opengraph-image.tsx` (Orçamento: Dotação Atualizada, Empenhado, Liquidado, Pago).
  - [x] Criar `apps/web/app/[portalSlug]/pessoal/opengraph-image.tsx` (Pessoal: Total da Folha, Limite LRF Pessoal, Total Pago, Chefias Efetivas).
  - [x] Criar `apps/web/app/[portalSlug]/caprem/opengraph-image.tsx` (CAPREM: Despesas Previdenciárias, Aportes Quitados, Patronal Pago, Servidores Efetivos).
  - [x] Passar `lastExtractionDate={portalConfig?.dataExtracao}` em todas as rotas.
  - [x] Configurar em cada arquivo: `export const runtime = "nodejs"`, `export const size = { width: 1200, height: 630 }`, `export const contentType = "image/png"`.

- [x] **Task 3: Refatoração e Alinhamento em `apps/web/lib/metadata.ts`** (AC: #12)
  - [x] Ajustar `createPortalMetadata` para apontar `openGraph.images` e `twitter.images` para as URLs dinâmicas canônicas das rotas (`${baseUrl}${pagePath}/opengraph-image`).
  - [x] Tornar `siteName` e URLs base configuráveis via `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_APP_URL` e `NEXT_PUBLIC_SITE_DOMAIN` com fallback open-source.

- [x] **Task 4: Atualização dos Guias de IA (`llms.txt` e `llms-full.txt`)** (AC: #13)
  - [x] Atualizar `apps/web/public/llms.txt` documentando a disponibilidade das imagens OpenGraph dinâmicas.
  - [x] Atualizar `apps/web/public/llms-full.txt` detalhando a estrutura exata das imagens de preview social de cada rota.

- [x] **Task 5: Validação de Qualidade, Paridade e Build** (AC: #14)
  - [x] Executar `pnpm test` e verificar 100% de aprovação na suíte de testes do frontend (87 testes web + 38 db).
  - [x] Executar `pnpm build` e confirmar a compilação de todas as rotas `opengraph-image`.
  - [x] Executar `make test` (Python/dbt) e `make test/ts` / `tsc --noEmit`.

### Review Findings

- [x] [Review][Patch] Eliminar operadores ternários aninhados em conformidade com a Regra 13 do AGENTS.md [`apps/web/app/[portalSlug]/despesas/opengraph-image.tsx:80`, `apps/web/app/[portalSlug]/opengraph-image.tsx:93`, `apps/web/app/[portalSlug]/pessoal/opengraph-image.tsx:78`, `apps/web/lib/metadata.ts:36`]
- [x] [Review][Patch] Corrigir nomenclatura de métricas abreviadas (empPct, liqPct, pagPct, chefiasPct) conforme Regra 9 do AGENTS.md [`apps/web/app/[portalSlug]/orcamento/opengraph-image.tsx:59`, `apps/web/app/[portalSlug]/pessoal/opengraph-image.tsx:34`]
- [x] [Review][Patch] Remover hardcoding de UF ('RJ') e município fixo em rotas OG e metadata para suporte multi-tenant pleno [`apps/web/app/[portalSlug]/**/opengraph-image.tsx`, `apps/web/lib/metadata.ts:31`]
- [x] [Review][Patch] Padronizar formatação percentual em Orçamento via helper fmtPercent [`apps/web/app/[portalSlug]/orcamento/opengraph-image.tsx:73-85`]
- [x] [Review][Patch] Capturar erros via PostHog e log estruturado em bloco catch das 8 rotas OpenGraph [`apps/web/app/[portalSlug]/**/opengraph-image.tsx`]
- [x] [Review][Patch] Sanitizar prefixo de protocolo em resolveBrandDomain e garantir null-safety em formatPortalSource [`apps/web/components/og/og-card-template.tsx:40-84`]
- [x] [Review][Patch] Implementar fallback resiliente no filtro de IDs de entidades de Saúde [`apps/web/app/[portalSlug]/saude/opengraph-image.tsx:32-38`]

---

## Dev Notes

### Arquitetura e Invariantes
- **Camada de Dados (@transparencia/db):** As imagens dinâmicas consomem estritamente as queries Kysely existentes (`getPortalConfig`, `getPosicaoFiscalMetrics`, `getExecucaoOrcamentariaMetrics`, `getAnaliseDespesasMetrics`, `getOpacidadeContabilMetrics`, `getRadarGastosSensiveisMetrics`, `getLicitacoesMetrics`, `getHistoriaSaudeMetrics`, `getSaudeEmendasMetrics`, etc.).
- **Fidelidade às Páginas Web:** Nenhuma informação ou métrica é exibida nas imagens OpenGraph que não esteja explicitamente presente nas respectivas páginas.
- **Runtime Node.js:** Todos os arquivos `opengraph-image.tsx` utilizam `export const runtime = "nodejs"` compatível com a conexão de `pg.Pool`.

### Restrições Críticas do Satori (Next.js `ImageResponse`)
> [!WARNING]
> 1. **Zero CSS Grid:** `display: grid` **não funciona** no Satori. Usar sempre `display: 'flex'`, `flexDirection: 'row' | 'column'`.
> 2. **Sem `<title>` em SVGs:** O Satori renderiza tags `<title>` internas de SVGs como texto visível por cima do ícone. Todos os SVGs foram limpos de `<title>`.
> 3. **Dimensões Fixas:** Contêiner padrão de `1200x630px`.

---

## Dev Agent Record

### Agent Model Used

Claude 3.7 Sonnet / Gemini 2.5 Pro (BMad Orchestrator)

### Debug Log References

- Vitest: `pnpm --filter web test components/og/og-card-template.spec.tsx` (4 testes aprovados)
- Vitest: `pnpm --filter web test components/og/og-routes.spec.tsx` (8 testes aprovados)
- Vitest: `pnpm --filter web test lib/metadata.spec.ts` (4 testes aprovados)
- Vitest Full Web Suite: `pnpm --filter web test` (24 arquivos de teste, 87 testes aprovados)
- TypeScript Typecheck: `tsc --noEmit` em todos os pacotes (0 erros)
- Python Integration Suite: `make test` (83 testes aprovados no pytest)
- Python Static Check: `make check` (Ruff e Mypy 100% aprovados)
- Next.js Build: `pnpm build` (Compilação bem-sucedida de todas as 8 rotas dinâmicas `opengraph-image`)

### Completion Notes List

- ✅ **Design & Identidade Visual:** Criado `OGCardTemplate` em tema claro nativo do portal com gradiente sutil `#ffffff` -> `#f8fafc`, logotipo vetorial oficial `#5a72a8` com os 4 pilares em alta definição, cards brancos `#ffffff` com bordas `#e2e8f0` e tipografia em ardósia escuro `#0f172a`.
- ✅ **Bugfix de Sobreposição SVG:** Eliminadas as tags `<title>` de dentro dos SVGs no JSX, resolvendo o defeito de renderização do Satori.
- ✅ **Rodapé Dinâmico & Cidadão:** O rodapé agora exibe `"Dados Abertos Extraídos da <Prefeitura de Porciúncula> • Extração em <DD/MM/AAAA>"`, removendo termos de auditoria e utilizando dados do `portalConfig`.
- ✅ **Alinhamento Estrito de Métricas:**
  - *Visão Geral:* Total Arrecadado, Total Empenhado, Despesas Pagas e Comprometimento Folha (sem saldo estimado).
  - *Orçamento:* Dotação Atualizada, Empenhado, Liquidado e Pago (os 4 estágios da LOA, sem saldo orçamentário).
  - *Saúde:* Emendas da Saúde exibe o valor empenhado no detalhe (`${fmtCompact(totalEmpenhado)} empenhados`).
- ✅ **Configurabilidade Open-Source:** Nomes de marca e domínio parametrizados via props e variáveis de ambiente (`NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_SITE_DOMAIN`, `NEXT_PUBLIC_APP_URL`) com fallback transparente.
- ✅ **Validação Completa:** 100% dos testes aprovados (125 testes no Vitest, 83 no pytest) e build de produção executado com sucesso.

### File List

- `apps/web/components/og/og-card-template.tsx` (NEW)
- `apps/web/components/og/og-card-template.spec.tsx` (NEW)
- `apps/web/components/og/og-routes.spec.tsx` (NEW)
- `apps/web/lib/metadata.spec.ts` (NEW)
- `apps/web/lib/metadata.ts` (UPDATE)
- `apps/web/public/llms.txt` (UPDATE)
- `apps/web/public/llms-full.txt` (UPDATE)
- `apps/web/app/[portalSlug]/opengraph-image.tsx` (NEW)
- `apps/web/app/[portalSlug]/despesas/opengraph-image.tsx` (NEW)
- `apps/web/app/[portalSlug]/licitacoes/opengraph-image.tsx` (NEW)
- `apps/web/app/[portalSlug]/saude/opengraph-image.tsx` (NEW)
- `apps/web/app/[portalSlug]/receitas/opengraph-image.tsx` (NEW)
- `apps/web/app/[portalSlug]/orcamento/opengraph-image.tsx` (NEW)
- `apps/web/app/[portalSlug]/pessoal/opengraph-image.tsx` (NEW)
- `apps/web/app/[portalSlug]/caprem/opengraph-image.tsx` (NEW)
- `_bmad-output/implementation-artifacts/7-1-geracao-dinamica-de-imagens-opengraph-og-cards-para-compartilhamento-social-e-whatsapp.md` (UPDATE)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (UPDATE)


