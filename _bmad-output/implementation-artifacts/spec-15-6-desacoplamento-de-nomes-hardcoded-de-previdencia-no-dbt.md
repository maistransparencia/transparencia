---
title: 'Story 15.6: Desacoplamento de Nomes Hardcoded de Previdência no dbt via dim_portais e Landing Page Cívica de Seleção Municipal'
type: 'refactor'
created: '2026-10-03'
status: 'done'
baseline_revision: 'd6cdb7cc39d97882ddc027b9f6fa441ac152a534'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Os modelos analíticos de previdência (`fct_previdencia_cadprev_metricas.sql` e `fct_previdencia_historia_metricas.sql`) contêm siglas hard-coded (`CAPREM`, `NATPREVI`, `IPAMN`, `FUNPREV`), violando a governança analítica multi-portal e misturando amortizações/obrigações federais (INSS) com a previdência própria municipal, enquanto a rota raiz (`/`) redireciona compulsoriamente para `/porciuncula_prefeitura` em vez de oferecer seleção cívica inteligente entre os municípios disponíveis.

**Approach:** Enriquecer `seed_portais.csv` e `dim_portais` com a coluna `previdencia_cnpj`, refatorar os marts analíticos do dbt para cruzar dinamicamente com `dim_portais` eliminando filtros hard-coded, e transformar a página raiz (`apps/web/app/page.tsx`) em uma landing page cívica com detecção de preferência em `localStorage` (redirecionamento de usuários recorrentes/legados e apresentação visual com brasões para novos visitantes).

## Boundaries & Constraints

**Always:**
- Manter 100% de paridade de valores nos cálculos fiscais de Porciúncula e Natividade nos marts dbt.
- Utilizar exclusivamente o tipo `TEXT` para campos de texto no PostgreSQL (Regra 16).
- Centralizar o CNPJ de previdência no `seed_portais.csv` e propagar através de `dim_portais.sql` e contratos `_dim_portais.yml`.
- Executar `make db/fixture/dump` e validar com `make db/fixture/check` após alterações em marts e seeds (Regra 21).
- Preservar a compatibilidade da aplicação web com `localStorage` em SSR (`typeof window !== "undefined"`).
- Seguir estritamente camelCase em TypeScript/DTOs (Regra 18).

**Never:**
- Nunca usar nomes hard-coded de municípios ou institutos de previdência dentro das queries dos marts analíticos de métricas.
- Nunca executar comandos contra bancos de produção remotos (Regra 15).
- Nunca quebrar os testes existentes de `dim_portais`, `previdencia` ou navegação.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Visita raiz com preferência salva | `localStorage.preferred_portal = 'natividade_prefeitura'` | Redireciona imediatamente para `/natividade_prefeitura` | Fallback para landing page se slug for inválido |
| Visita raiz de usuário legado | Marcador `last_seen_extraction` ou `pwa_installed` presente no `localStorage` sem `preferred_portal` | Grava `preferred_portal = 'porciuncula_prefeitura'` e redireciona para `/porciuncula_prefeitura` | Trata erros de acesso ao `localStorage` defensivamente |
| Visita raiz de novo visitante | Nenhum marcador em `localStorage` | Renderiza landing page cívica com apresentação e cards de Porciúncula e Natividade com brasões | Renderização limpa e acessível |
| Clique em card de município na landing page | Usuário clica no card de Natividade | Grava `preferred_portal = 'natividade_prefeitura'` e navega para `/natividade_prefeitura` | Navegação via `router.push` |
| Troca de portal no seletor da Sidebar/Header | Usuário troca de portal no `SidebarWrapper` | Atualiza `preferred_portal` no `localStorage` mantendo coerência para futuras visitas | Silencia falhas se `localStorage` estiver inacessível |
| Cálculo de CADPREV no dbt | Empenho do elemento '71' com fornecedor NATPREVI em Natividade | Empenho incluído via cruzamento dinâmico com `previdencia_sigla` / `previdencia_cnpj` de `dim_portais` | Amortizações federais do INSS excluídas |

</intent-contract>

## Code Map

- `elt/transform/seeds/seed_portais.csv` -- Semente canônica de portais municipais, adicionar coluna `previdencia_cnpj`.
- `elt/transform/seeds/seeds.yml` -- Definição de tipos de dados para sementes do dbt, declarar `previdencia_cnpj: text`.
- `elt/transform/models/marts/core/dim_portais.sql` -- Modelo dimensional de portais, projetar `previdencia_cnpj`.
- `elt/transform/models/marts/core/_dim_portais.yml` -- Contrato estrito de `dim_portais`, documentar coluna `previdencia_cnpj`.
- `elt/transform/models/marts/metrics/fct_previdencia_cadprev_metricas.sql` -- Modelo de amortização CADPREV, refatorar com join dinâmico em `dim_portais`.
- `elt/transform/models/marts/metrics/fct_previdencia_historia_metricas.sql` -- Modelo de métricas históricas de previdência, refatorar com join dinâmico em `dim_portais`.
- `packages/db/src/queries/metadata.ts` -- Tipagem `PrevidenciaConfig` e query de metadados, incluir `cnpj`.
- `apps/web/app/components/sidebar-wrapper.tsx` -- Componente client de sidebar e alternador de portal, sincronizar `preferred_portal` no `localStorage`.
- `apps/web/app/page.tsx` -- Página raiz da aplicação, implementar landing page cívica inteligente e seleção de municípios.
- `apps/web/app/page.spec.tsx` -- Testes unitários cobrindo fluxos de novo visitante, usuário legado e usuário recorrente.
- `packages/db/tests/fixtures/schema.sql.gz` -- Fixture compactado de banco para testes de paridade (Regra 21).

## Tasks & Acceptance

**Execution:**
- `elt/transform/seeds/seed_portais.csv` & `elt/transform/seeds/seeds.yml` -- Adicionar coluna `previdencia_cnpj` (`01180031000134` para Porciúncula e `01709035000167` para Natividade) e tipar no manifesto YAML.
- `elt/transform/models/marts/core/dim_portais.sql` & `elt/transform/models/marts/core/_dim_portais.yml` -- Projetar `p.previdencia_cnpj` e adicionar especificação ao contrato.
- `elt/transform/models/marts/metrics/fct_previdencia_cadprev_metricas.sql` -- Fazer join com `dim_portais` e filtrar por `p.previdencia_sigla` e `p.previdencia_cnpj`.
- `elt/transform/models/marts/metrics/fct_previdencia_historia_metricas.sql` -- Fazer join com `dim_portais`, eliminar literais repetitivos e filtrar patronal dinamicamente.
- `packages/db/src/queries/metadata.ts` -- Expandir `PrevidenciaConfig` com campo opcional `cnpj`.
- `apps/web/app/components/sidebar-wrapper.tsx` -- Atualizar `localStorage.setItem("preferred_portal", newPortalSlug)` ao alternar município.
- `apps/web/app/page.tsx` -- Criar landing page cívica interativa com checagem de `localStorage`, cartões das cidades com brasões e persistência de escolha.
- `apps/web/app/page.spec.tsx` -- Criar testes unitários para a página raiz cobrindo os 3 cenários de visitação.
- `packages/db/tests/fixtures/schema.sql.gz` -- Executar `make db/fixture/dump` e validar com `make db/fixture/check`.

**Acceptance Criteria:**
- Given a dimensão `dim_portais`, when consultada, then retorna a coluna `previdencia_cnpj` preenchida com os CNPJs oficiais dos institutos de Porciúncula e Natividade.
- Given os modelos `fct_previdencia_cadprev_metricas` e `fct_previdencia_historia_metricas`, when compilados e executados pelo dbt, then realizam cruzamento dinâmico sem referências hard-coded a nomes de institutos e preservam a integridade dos dados fiscais.
- Given a rota raiz `/`, when acessada por um novo visitante sem dados prévios no `localStorage`, then renderiza a landing page com apresentação cívica e cartões visuais para seleção de Porciúncula ou Natividade com seus brasões oficiais.
- Given a rota raiz `/`, when acessada por um usuário com `preferred_portal` salvo ou com marcadores históricos de navegação, then redireciona automaticamente para o portal correspondente.
- Given a suíte de testes e linters do projeto, when executados `make check`, `make test`, `make test/ts` e `pnpm build`, then todos passam com 100% de sucesso.

### Review Findings

- [x] [Review][Patch] Corrigir violação da Regra 11 do AGENTS.md e defensiva de strings vazias com unaccent e trim em métricas de previdência [elt/transform/models/marts/metrics/fct_previdencia_historia_metricas.sql:23, elt/transform/models/marts/metrics/fct_previdencia_cadprev_metricas.sql:27]
- [x] [Review][Patch] Corrigir valor de empresa_padrao para Natividade (de 6/NATPREVI para 1/Prefeitura) em seed_portais.csv [elt/transform/seeds/seed_portais.csv:3]
- [x] [Review][Patch] Refatorar condicional de targetSlug com IIFE (Regra 13), defensiva de fallback e regex de cidade na landing page [apps/web/app/municipal-landing-client.tsx:33,168]
- [x] [Review][Patch] Remover useEffect de sobrescrita automática de preferred_portal ao montar SidebarWrapper [apps/web/app/components/sidebar-wrapper.tsx:97]
- [x] [Review][Patch] Melhorar semântica e acessibilidade dos cards municipais utilizando Link em vez de button [apps/web/app/municipal-landing-client.tsx:183]
- [x] [Review][Patch] Cobrir lacunas de testes unitários para MobileBottomNav, query param select=true e matching de CNPJ dbt [apps/web/components/mobile-bottom-nav.spec.tsx, apps/web/app/page.spec.tsx, elt/transform/models/marts/metrics/_fct_previdencia_cadprev_metricas.yml]
- [x] [Review][Defer] Identificadores legados específicos de Porciúncula (1061, CASP) em fct_previdencia_historia_metricas.sql [elt/transform/models/marts/metrics/fct_previdencia_historia_metricas.sql:51] — deferred: pre-existing legacy logic from original single-portal schema
- [x] [Review][Defer] Agrupamento mensal de servidores em pessoal_previdencia [elt/transform/models/marts/metrics/fct_previdencia_historia_metricas.sql:95] — deferred: pre-existing logic not modified in this story
- [x] [Review][Defer] Código IBGE de Natividade em documentação pública de IA [apps/web/public/llms-full.txt:16] — deferred: pre-existing file from story 15.5
- [x] [Review][Defer] Padding inferior pb-24 incondicional em layout.tsx [apps/web/app/layout.tsx:261] — deferred: pre-existing file not touched in story 15.6

#### Rejected
- Redução do touch target no seletor compacto de cabeçalho na sidebar (AA-6, BH-8): Rejeitado porque a alteração foi restrita ao seletor compacto móvel para nivelamento com seletor de ano adjacente, mantendo min-h-[44px] no seletor primário.
- Ausência de flag Secure em document.cookie no cliente (BH-11): Rejeitado como low; flag estática quebra desenvolvimento local em HTTP.
- Armadilha de histórico de navegação com botão Voltar (BH-1): Rejeitado; plataforma provê alternância persistente via seletores municipais da barra/cabeçalho e suporte a ?select=true.

## Spec Change Log

## Review Triage Log

## Design Notes

A landing page cívica na rota raiz (`/`) deve oferecer uma experiência acessível, moderna e acolhedora para o cidadão no primeiro contato:
1. Apresentação visual limpa explicando o propósito do Mais Transparência (monitoramento fiscal independente e aberto).
2. Cartões clicáveis em grid responsivo para Porciúncula e Natividade, exibindo seus brasões oficiais em SVG (`/brasao-porciuncula.svg` e `/brasao-natividade.svg`), nome da cidade, estado (RJ) e atalho para o portal.
3. Tratamento seguro do `localStorage` com verificação `typeof window !== "undefined"` e fallback gracioso caso cookies/storage estejam bloqueados pelo navegador.

## Verification

**Commands:**
- `make check` -- expected: Linters e checagem de tipos Python passam sem erros.
- `make test` -- expected: Suíte pytest e modelos dbt passam com 100% de sucesso.
- `pnpm test` -- expected: Todos os testes vitest do frontend passam com 100% de sucesso.
- `pnpm build` -- expected: Build do Next.js compila todas as rotas estáticas e dinâmicas com sucesso.
- `make db/fixture/check` -- expected: Paridade total entre definições analíticas do dbt e o fixture Kysely.
