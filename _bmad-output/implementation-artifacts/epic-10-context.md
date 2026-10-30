# Epic 10 Context: Fundação, Higiene de Dados e Isolamento de Schema

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Modernizar e blindar a infraestrutura de dados e analytics da plataforma, eliminando avisos e depreciações do compilador dbt, consolidando modelos redundantes, segregando todos os marts analíticos no schema dedicado `analytics` (com governança de privilégios de acesso, roles do PostgreSQL e pools de conexão Kysely no `@transparencia/db`) e estabelecendo validação automatizada sobre fixtures `.sql` de teste no CI/CD para assegurar paridade e prevenir degradação silenciosa entre ambientes.

## Stories

- Story 10.1: Auditoria, Enxugamento de Modelos Redundantes e Zero Warnings no dbt
- Story 10.2: Isolamento dos Marts Analíticos no Schema Dedicado `analytics`
- Story 10.3: Blindagem de CI/CD e Governança Estrita de Fixtures `.sql` de Teste

## Requirements & Constraints

- **Zero Warnings e Rigor de Compilação dbt**: O compilador dbt deve executar sem nenhum aviso ou depreciação em execuções estritas (`--no-partial-parse`), garantindo conformidade com dbt 1.8+/1.12+, aninhando argumentos de testes genéricos sob a propriedade `arguments:` e travando versões exatas de dependências em `packages.yml`.
- **Eliminação de Redundâncias e Dimensões Órfãs**: Modelos analíticos e dimensões sem consumidores upstream ou downstream na linhagem do pipeline dbt ou nas queries da aplicação web devem ser removidos para manter a DAG enxuta e acelerar o ciclo de compilação.
- **Isolamento de Namespace Analítico**: Todos os modelos finais da camada de marts (`fct_*` e `dim_*`) devem ser materializados estritamente dentro do schema `analytics`, segregando dados analíticos finais do schema `public` e de camadas raw/staging.
- **Segurança e Privilégios Mínimos (Least Privilege)**: O role de banco de dados para leitura pública (`read_only`) deve receber permissões explícitas (`GRANT USAGE`, `GRANT SELECT`, `ALTER DEFAULT PRIVILEGES`) sobre o schema `analytics`, além da aplicação contínua de políticas de Row-Level Security (RLS) para todas as tabelas analíticas.
- **Preservação de Consumo e Zero Regressão na Aplicação Web**: As queries Kysely em `@transparencia/db` e os data loaders em `apps/web` devem continuar operando sem quebras com a segregação de schema; a resolução concorrente de tabelas analíticas e utilitárias deve ser garantida via `search_path = analytics, public`.
- **Sincronização Obrigatória de Fixtures de Teste**: O pipeline de CI/CD e a validação local devem bloquear a mesclagem de código se modelos dbt forem modificados sem a correspondente regeneração e atualização das fixtures `.sql` de teste.

## Technical Decisions

- **Roteamento de Schema no dbt**: Configurar `+schema: analytics` para o diretório `marts/` em `elt/transform/dbt_project.yml` e atualizar a macro `generate_schema_name.sql` para respeitar schemas customizados sem concatenação arbitrária de prefixos, mantendo staging e intermediate em seus respectivos schemas padrão.
- **Criação Prévia de Schemas em Ciclos dbt**: Garantir a existência do schema `analytics` na inicialização do ciclo de compilação e execução através do hook `on-run-start` (`CREATE SCHEMA IF NOT EXISTS analytics;`).
- **Resolução de Schemas em Runtime no Kysely**: Configurar o evento `connect` nos pools de conexão do PostgreSQL (`pool` de leitura e `writePool` de escrita) em `packages/db/src/client.ts` executando `SET search_path = analytics, public`, permitindo a resolução transparente de tabelas de marts (`analytics.fct_*`) e tabelas utilitárias/seeds (`public.seed_*`, `public.newsletter_subscribers`).
- **Configuração de Search Path e Privilégios no PostgreSQL**: Atualizar scripts DDL e migrações (`elt/migrations/grant_readonly.sql` e `docker/init/01-init-roles.sql`) para incluir `analytics` nas concessões para `read_only` e fixar o `search_path` padrão dos roles do sistema (`postgres` e `read_only`) como `analytics, public`.
- **Paridade de Ambientes Efêmeros de Teste**: Atualizar `elt/conftest.py` para criar o schema `analytics` durante `_create_raw_schema(eng)` e parametrizar `SET search_path = raw_porciuncula_prefeitura, analytics, public` na fixture de conexão dos testes em Python.
- **Exportação e Governança de Fixtures de Teste**: Atualizar a rotina `db/fixture/dump` no `Makefile` para exportar o schema `analytics` e tabelas de seeds do `public` (`-n analytics -t 'public.seed_*'`), regerando deterministicamente a fixture compactada `packages/db/tests/fixtures/schema.sql.gz`.

## Cross-Story Dependencies

- **Story 10.1 → Story 10.2**: O expurgo de modelos órfãos e saneamento de testes/pre-hooks concluído na Story 10.1 garante que apenas modelos analíticos ativos e limpos sejam migrados para o novo schema `analytics` na Story 10.2.
- **Story 10.2 → Story 10.3**: O isolamento físico dos marts em `analytics` e a nova infraestrutura de dump de fixtures servem de base estrutural para a implementação do validador automatizado de governança de fixtures de teste em CI/CD na Story 10.3.
- **Epic 10 → Epic 11 & Epic 12**: A consolidação da infraestrutura de analytics, ausência de warnings e higiene de esquemas formam a fundação mandatória para a automação de ingestão contínua em containers/cron (Epic 11) e para o motor analítico de detecção de anomalias fiscais (Epic 12).
