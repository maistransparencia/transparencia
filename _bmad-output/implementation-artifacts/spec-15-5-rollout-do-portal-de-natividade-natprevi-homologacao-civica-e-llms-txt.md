---
title: 'Story 15.5: Rollout do Portal de Natividade (NATPREVI), Homologação Cívica e Atualização dos Guias de IA (llms.txt)'
type: 'feature'
created: '2026-10-02'
status: 'done'
baseline_revision: '201f16ba0bad2dcb82b6303de74799702c229b6d'
review_loop_iteration: 1
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** A plataforma de transparência fiscal atua publicamente apenas para o município de Porciúncula, impedindo que cidadãos e agentes autônomos de IA acessem as contas públicas dos municípios vizinhos do cluster Sigcorp/Fiorilli (Natividade, Bom Jesus do Itabapoana e São Fidélis), além de possuir documentação desatualizada em `llms.txt` / `llms-full.txt` e ausência de seletor unificado de municípios no cabeçalho/menu da aplicação.

**Approach:** Habilitar oficialmente os novos portais municipais na dimensão canônica (`seed_portais.csv`), criar a configuração declarativa e o módulo de São Fidélis (`sao_fidelis_prefeitura`), parametrizar os scripts de extração e carga de receitas históricas CSV (`receitas_csv.py` e `load_receitas_csv.py`) por `PORTAL_SLUG`, implementar o componente seletor de portais (`PortalSelect`) no cabeçalho e na Sidebar com navegação contextual transparente, configurar redirecionamentos 308 de slugs amigáveis em `next.config.js`, atualizar os guias públicos de IA (`llms.txt` e `llms-full.txt`) conforme a Regra 12, e homologar 100% dos testes e linters (`make test`, `make test/ts`, `make check`, `pnpm build`).

## Boundaries & Constraints

**Always:**
- Habilitar os 4 municípios na dimensão canônica (`seed_portais.csv`): Porciúncula (`porciuncula_prefeitura`), Natividade (`natividade_prefeitura`), Bom Jesus do Itabapoana (`bom_jesus_itabapoana_prefeitura`) e São Fidélis (`sao_fidelis_prefeitura`).
- Regerar e validar o fixture compactado de teste `packages/db/tests/fixtures/schema.sql.gz` via `make db/fixture/dump` e `make db/fixture/check` logo após alterar `seed_portais.csv` (Regra 21).
- Garantir isolamento estrito por `portal_slug` em todas as queries e telas, prevenindo contaminação cruzada de dados entre municípios.
- No pipeline de receitas municipais da Fiorilli, respeitar a estratégia dual: ano corrente via API JSON, série histórica 2021-2025 via relatórios CSV e carga SQL parametrizados por `PORTAL_SLUG`.
- Sincronizar obrigatoriamente `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` com todas as novas rotas municipais, a rota canônica `/previdencia` e as instruções para LLMs (Regra 12).
- Todas as propriedades TypeScript em DTOs e View Models devem seguir estritamente a convenção `camelCase` (Regra 18).
- Nenhuma requisição à internet pública é permitida durante a execução de testes automatizados (Regras 5 e 15).

**Never:**
- Nunca utilizar `process.env` diretamente no código de `apps/web` (Regra 17).
- Nunca criar colunas ou variáveis com nomes de métricas abreviados (Regra 9).
- Nunca quebrar o funcionamento ou os links do portal de Porciúncula.
- Nunca emitir 404 para requisições com slugs amigáveis (ex: `/natividade`, `/bom-jesus-do-itabapoana`, `/sao-fidelis`); responder com redirect HTTP 308 permanente.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Alternância de portal via UI | Usuário seleciona "Prefeitura de Natividade" estando em `/porciuncula_prefeitura/receitas?ano=2024` | Navega para `/natividade_prefeitura/receitas?ano=2024` mantendo exercício e sub-rota | Redireciona para `/[novoPortal]` caso a sub-rota não exista |
| Acesso com slug amigável | `GET /natividade` ou `GET /natividade/receitas` | Redirecionamento permanente HTTP 308 para `/natividade_prefeitura` ou `/natividade_prefeitura/receitas` | Handled via `next.config.js` |
| Listagem de portais | `getAllPortais()` invocado pela aplicação | Retorna lista tipada com os 4 municípios ordenados por nome | Fallback seguro com Porciúncula se banco inacessível |
| Extração CSV de receitas parametrizada | `PORTAL_SLUG=bom_jesus_itabapoana_prefeitura` ou `--portal bom_jesus_itabapoana_prefeitura` | Carrega `PortalConfig` do município alvo e baixa/carrega CSVs para a pasta e schema correspondentes | Lança erro legível se portal não existir |
| Consulta ao guia de IA | `GET /llms.txt` ou `GET /llms-full.txt` | Retorna documentação consolidada com os 4 municípios, rotas `/previdencia`, APIs de export e regras cívicas | Arquivo estático 200 OK |

</intent-contract>

## Code Map

- `elt/portals/sao_fidelis_prefeitura.yml` -- Manifesto declarativo de São Fidélis (IBGE 3304805, RPPS FASP, base_host riodejaneiro1.dcfiorilli.com.br:8079).
- `elt/portals/natividade_prefeitura.yml` & `bom_jesus_itabapoana_prefeitura.yml` -- Ajuste de `base_host` para alinhar com testes declarativos.
- `elt/transform/seeds/seed_portais.csv` -- Inclusão dos registros canônicos de Natividade, Bom Jesus do Itabapoana e São Fidélis com RPPS e highlights.
- `elt/transform/seeds/seed_sao_fidelis_prefeitura_orgaos.csv` & `seeds.yml` -- Órgão municipal padrão de São Fidélis para compilação dbt.
- `elt/transform/models/staging/sao_fidelis_prefeitura/_sources.yml` -- Fontes raw de São Fidélis (Regra 5).
- `elt/extract/sao_fidelis_prefeitura/__init__.py` & `api_endpoints.py` -- Módulo de endpoints de São Fidélis consumindo extrator genérico Fiorilli.
- `elt/extract/receitas_csv.py` (ou `elt/extract/porciuncula_prefeitura/receitas_csv.py`) -- Parametrização por `portal_slug` (CLI `--portal` e env `PORTAL_SLUG`).
- `elt/load/porciuncula_prefeitura/load_receitas_csv.py` (e runner genérico `elt/load/load_receitas_csv.py`) -- Carga de CSV parametrizada por `portal_slug` para `raw_{portal_slug}`.
- `packages/db/src/queries/metadata.ts` -- Função `getAllPortais()` e resolução resiliente de slugs com suporte a aliases amigáveis.
- `packages/ui/src/components/sidebar.tsx` -- Componente `PortalSelect` integrado no cabeçalho desktop e mobile, permitindo alternar municípios.
- `apps/web/app/components/sidebar-wrapper.tsx` -- Integração do `portais` e despacho de navegação reativa preservando sub-rotas e query params.
- `apps/web/app/layout.tsx` -- Fornecimento da lista consolidada de portais para `SidebarWrapper`.
- `apps/web/next.config.js` -- Redirecionamentos permanentes HTTP 308 de slugs amigáveis (`/natividade`, `/bom-jesus-do-itabapoana`, `/sao-fidelis`, `/porciuncula`) para os slugs canônicos.
- `apps/web/public/llms.txt` & `apps/web/public/llms-full.txt` -- Atualização completa com os 4 portais municipais, rotas e convenções de consumo por LLMs (Regra 12).
- `packages/db/tests/fixtures/schema.sql.gz` -- Fixture compactado sincronizado após inclusão de novos seeds (Regra 21).

## Tasks & Acceptance

**Execution:**
- `elt/portals/sao_fidelis_prefeitura.yml` -- Criar manifesto declarativo de São Fidélis (IBGE `3304805`, RPPS: `FASP`, base host Fiorilli `http://riodejaneiro1.dcfiorilli.com.br:8079`).
- `elt/portals/natividade_prefeitura.yml` e `bom_jesus_itabapoana_prefeitura.yml` -- Ajustar hosts para garantir 100% de paridade com `test_fiorilli.py`.
- `elt/transform/seeds/seed_sao_fidelis_prefeitura_orgaos.csv` -- Criar semente de entidades de São Fidélis (`empresa_id: "1"`).
- `elt/transform/seeds/seeds.yml` -- Declarar semente de São Fidélis.
- `elt/transform/models/staging/sao_fidelis_prefeitura/_sources.yml` -- Mapear catálogo raw de São Fidélis conforme Regra 5.
- `elt/extract/sao_fidelis_prefeitura/__init__.py` e `api_endpoints.py` -- Implementar módulo de endpoints de São Fidélis.
- `elt/transform/seeds/seed_portais.csv` -- Adicionar linhas de Natividade, Bom Jesus do Itabapoana e São Fidélis com metadados completos de RPPS e destaques.
- `elt/extract/porciuncula_prefeitura/receitas_csv.py` -- Parametrizar seleção de portal via flag `--portal` e variável de ambiente `PORTAL_SLUG`.
- `elt/load/porciuncula_prefeitura/load_receitas_csv.py` -- Parametrizar carga SQL para schema dinâmico `raw_{portal_slug}` e diretório específico.
- `packages/db/src/queries/metadata.ts` -- Adicionar `getAllPortais()` e mapeamento de aliases curtos em `getPortalConfig()`.
- `packages/ui/src/components/sidebar.tsx` -- Adicionar prop `portais?: PortalOption[]` e renderizar seletor de municípios na interface desktop e mobile.
- `apps/web/app/components/sidebar-wrapper.tsx` -- Integrar `portais`, detectar portal ativo e acionar transição de rota mantendo sub-rotas e query params.
- `apps/web/app/layout.tsx` -- Carregar lista de portais via `getAllPortais()` e repassar ao `SidebarWrapper`.
- `apps/web/next.config.js` -- Adicionar redirecionamentos 308 permanentes para rotas com slugs simplificados.
- `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt` -- Documentar novos municípios, rotas e parâmetros para agentes de IA (Regra 12).
- `packages/db/tests/fixtures/schema.sql.gz` -- Regerar fixture compactado via `make db/fixture/dump` e validar com `make db/fixture/check` (Regra 21).
- `apps/web/app/components/sidebar-wrapper.spec.tsx` e `packages/ui/src/components/__tests__/sidebar.spec.tsx` -- Cobrir seletor de portais com testes automatizados.

**Acceptance Criteria:**
- Given os novos portais cadastrados em `seed_portais.csv`, when a aplicação web inicializa, then o seletor de portais no cabeçalho exibe as 4 opções municipais: Porciúncula, Natividade, Bom Jesus do Itabapoana e São Fidélis.
- Given o seletor de portais, when o usuário seleciona um município diferente, then a rota é atualizada preservando a subpágina ativa e os query params de ano e entidade.
- Given requisições para URLs com slugs amigáveis (`/natividade`, `/bom-jesus-do-itabapoana`, `/sao-fidelis`), when recebidas pela aplicação web, then respondem com redirecionamento HTTP 308 para seus respectivos slugs canônicos.
- Given os scripts de receitas históricas `receitas_csv.py` e `load_receitas_csv.py`, when executados com `PORTAL_SLUG`, then direcionam as operações para a URL do portal e o schema raw correspondente.
- Given os arquivos `apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`, when consultados por agentes externos de IA, then descrevem todos os 4 municípios, a rota canônica `/previdencia` e as instruções de exportação de dados brutos (Regra 12).
- Given a suíte completa de testes e linters, when executados `make test`, `make test/ts`, `make check` e `pnpm build`, then todos passam com 100% de sucesso.

## Spec Change Log

## Review Triage Log

- [x] Blind Hunter: Unificação de órgãos municipais para São Fidélis no modelo `dim_orgao.sql` e criação de brasões SVGs municipais para prevenir 404 de imagens. Ordenação numérica consistente de `empresa_id`.
- [x] Edge Case Hunter: Isolamento de `entidades` na troca de portais no `sidebar-wrapper.tsx` (removendo entidades de um município ao alternar para outro para evitar filtros inconsistentes). Tratamento resiliente em `getAllPortais()` e acessibilidade com `<h1 className="sr-only">`.
- [x] Verification Gap: Cobertura de testes unitários para regras de redirecionamento 308 no `portal-redirects.spec.ts`, validação de `getAllPortais()` e interações do `PortalSelect` na Sidebar e SidebarWrapper.
- [x] Intent Alignment: Validação estrita do nome da entidade RPPS de Natividade como `NATPREVI`, garantia do pipeline dual Fiorilli (JSON para ano corrente e CSV Playwright/DevExpress para 2021-2025) parametrizado por `PORTAL_SLUG`, e atualização dos guias `llms.txt` e `llms-full.txt` (Regra 12).

## Design Notes

A alternância entre portais deve ser suave e preservar o contexto do usuário sempre que possível:
1. Se o usuário estiver visualizando `/porciuncula_prefeitura/licitacoes?ano=2024` e mudar para Natividade, a nova URL será `/natividade_prefeitura/licitacoes?ano=2024`.
2. O componente `PortalSelect` deve adotar o mesmo padrão visual e de acessibilidade do `YearSelect`, garantindo target touch de 44px em mobile e contraste WCAG AA.
3. A resolução de portal em `getPortalConfig` suporta aliases amigáveis como fallback, prevenindo quebras mesmo se um request contornar os redirects do Next.js.

## Verification

**Commands:**
- `make check` -- expected: Linters e checagem de tipos Python passam sem erros.
- `make test` -- expected: Suíte pytest e dbt staging passam com 100% de sucesso.
- `pnpm test` -- expected: Todos os testes vitest de UI e Web passam com 100% de sucesso.
- `pnpm build` -- expected: Build do Next.js compila todas as rotas estáticas e dinâmicas com sucesso.
- `make db/fixture/check` -- expected: Paridade total entre definições analíticas do dbt e o fixture Kysely.
