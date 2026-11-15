---
baseline_commit: 5d1ddebd4300c6a42f14490d9f3ff64a641dc254
---

# Story 5.3: Provisionar Infraestrutura Cloudflare R2 via Pulumi

Status: done

## Story

As a DevOps engineer,
I want to manage Cloudflare R2 storage infrastructure using Pulumi in `infra/`,
so that `.parquet` files are securely stored, versioned, and publicly readable via HTTP Range Requests.

## Acceptance Criteria

1. **Dado** o projeto de infraestrutura IaC no diretório `infra/`, **quando** o projeto Pulumi TypeScript for configurado com os manifestos de dependência e declaração (`infra/Pulumi.yaml`, `infra/Pulumi.dev.yaml`, `infra/package.json`, `infra/tsconfig.json`, `infra/index.ts`), **então** a dependência `@pulumi/cloudflare` é declarada com versão exata fixada (pinned: `@pulumi/cloudflare==6.19.0`), sem o uso de segredos ou chaves de API hardcoded no código.
2. **Dado** a execução do comando `pulumi up` no diretório `infra/`, **quando** o stack for implantado, **então** o bucket Cloudflare R2 (`transparencia-parquet-store`) é provisionado com suporte a versionamento e retenção de arquivos.
3. **Dado** as requisições HTTP de leitura originadas no navegador via DuckDB-WASM ou Vercel Serverless fetch, **quando** os clientes acessam os arquivos `.parquet` hospedados no R2, **então** o recurso `cloudflare.R2BucketCors` é configurado permitindo origens autorizadas (`*` para desenvolvimento local, domínios do portal em produção), métodos `GET` e `HEAD`, headers de controle de faixa (`Range`, `Content-Type`, `Authorization`), e expondo os headers de resposta `Content-Range`, `Accept-Ranges`, `ETag` e `Content-Length` (indispensáveis para a execução de HTTP Range Requests eficientes no DuckDB sem download total do arquivo Parquet).
4. **Dado** o pipeline de geração de dados em `elt/transform/target/` (ou diretório de saída do `dbt-duckdb`), **quando** a etapa pós-build for acionada ou o comando `make sync/parquet` for executado, **então** o script de sincronização `elt/scripts/sync_parquet.py` lê as credenciais R2 (S3-compatible endpoint, access key, secret key, bucket name) das variáveis de ambiente e envia/atualiza os arquivos `.parquet` no R2 utilizando a biblioteca `boto3`.
5. **Dado** ambientes de desenvolvimento local sem credenciais ativas do Cloudflare R2, **quando** o script `elt/scripts/sync_parquet.py` for executado localmente, **então** ele faz o fallback automático transparente para o serviço MinIO S3 local (`http://localhost:9000`) mantido via `docker-compose.yml`, permitindo a simulação completa do fluxo sem custos cloud.
6. **Dado** as suítes de validação e diretrizes do repositório (`AGENTS.md`), **quando** o script e a infraestrutura forem criados, **então** todas as dependências adicionadas usam versões exatas (pinned), valores fixos/slugs usam `lowercase_snake_case` (Regra 10), e o script Python aprova 100% das verificações estáticas (`ruff check` e `mypy`).

## Tasks / Subtasks

- [x] Task 1: Configuração do Projeto Pulumi IaC em `infra/` (AC: #1, #2)
  - [x] Criar o diretório `infra/` e os manifestos base: `infra/Pulumi.yaml`, `infra/Pulumi.dev.yaml`, `infra/package.json`, `infra/tsconfig.json`.
  - [x] Adicionar dependências NPM fixadas (pinned): `@pulumi/pulumi==3.150.0` e `@pulumi/cloudflare==6.19.0` no `infra/package.json`.
  - [x] Criar `infra/index.ts` declarando o recurso `cloudflare.R2Bucket` (nome `transparencia-parquet-store` obtido via config/stack).
  - [x] Configurar `.gitignore` no diretório `infra/` para ignorar `node_modules/`, `.pulumi/` e arquivos de estado locais efêmeros.
- [x] Task 2: Provisionamento de Regras CORS no Cloudflare R2 (AC: #3)
  - [x] No `infra/index.ts`, instanciar o recurso `cloudflare.R2BucketCors` associado ao bucket R2 criado.
  - [x] Definir a regra de CORS com:
    - `allowed.methods`: `["GET", "HEAD"]`
    - `allowed.origins`: `["*"]` (configurável via `pulumi config` para domínios de produção)
    - `allowed.headers`: `["Range", "Content-Type", "Authorization", "*"]`
    - `expose_headers`: `["Content-Range", "Accept-Ranges", "ETag", "Content-Length"]`
    - `max_age_seconds`: `3600`
  - [x] Exportar as variáveis de output no Pulumi: `bucketName`, `r2EndpointUrl`, `bucketDomain`.
- [x] Task 3: Implementação do Script Python `elt/scripts/sync_parquet.py` (AC: #4, #5)
  - [x] Adicionar a dependência `boto3==1.36.20` (versão exata pinned) ao grupo principal em `elt/pyproject.toml`.
  - [x] Sincronizar o ambiente Python e lockfile via `uv sync` dentro de `elt/`.
  - [x] Criar o script `elt/scripts/sync_parquet.py` utilizando `boto3.client('s3', ...)` com suporte ao endpoint S3-compatible da Cloudflare (`https://<account_id>.r2.cloudflarestorage.com`) e fallback para o MinIO local (`http://localhost:9000`).
  - [x] Implementar verificação de hashing/mtime para upload incremental de arquivos `.parquet` com o header `Content-Type: application/vnd.apache.parquet`.
- [x] Task 4: Integração com Makefile e Validação Estática (AC: #6)
  - [x] Adicionar o target `sync/parquet` no `Makefile` do projeto chamando `cd elt && uv run python scripts/sync_parquet.py`.
  - [x] Executar linters e verificações de tipagem (`ruff check`, `mypy`, `pnpm --filter infra build` ou `tsc --noEmit`).

## Dev Notes

### Diretrizes Obrigatórias (AGENTS.md)
- **Regra 1 (Economia Extrema de Contexto)**: Realizar buscas cirúrgicas com grep/glob e leituras janeladas.
- **Regra 7 (Versões Exatas / Pinned Versions)**: É estritamente obrigatório declarar versões fixas sem prefixos `^` ou `~` tanto no `infra/package.json` (`"@pulumi/cloudflare": "6.19.0"`, `"@pulumi/pulumi": "3.150.0"`) quanto no `elt/pyproject.toml` (`"boto3==1.36.20"`).
- **Regra 10 (Padrão Lowercase Snake Case)**: Nomes de buckets, slugs de configuração e valores fixos em SQL/Python/TS devem seguir `lowercase_snake_case` (ex: `transparencia_parquet_store`).

### Integração S3 Local (MinIO) vs. Cloudflare R2
O projeto já conta com o serviço MinIO no `docker-compose.yml` (portas 9000 e 9001) com a bucket `transparencia-marts` pré-criada pelo container `create_buckets`.
- O script `elt/scripts/sync_parquet.py` deve checar se as variáveis `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID` e `R2_SECRET_ACCESS_KEY` estão presentes.
- Se **ausentes**, deve utilizar `S3_ENDPOINT_URL` (default `http://localhost:9000`), `AWS_ACCESS_KEY_ID=minioadmin`, `AWS_SECRET_ACCESS_KEY=minioadmin` e bucket `transparencia-marts`.
- Se **presentes**, deve montar o endpoint `https://<account_id>.r2.cloudflarestorage.com` e sincronizar para a bucket R2 `transparencia-parquet-store`.

### Detalhes Técnicos de CORS para DuckDB HTTP Range Requests
DuckDB (no Vercel Serverless ou DuckDB-WASM) executa requisições por demanda enviando o header `Range: bytes=X-Y` para ler apenas partes necessárias dos metadados e footprints de colunas do Parquet.
Para que isso funcione sem CORS errors nos navegadores e na Vercel:
1. `Accept-Ranges` deve ser retornado pelo servidor e liberado no `expose_headers`.
2. `Content-Range` deve ser liberado no `expose_headers`.
3. `ETag` deve ser liberado para invalidação de cache local do DuckDB.

### Componentes e Arquivos Afetados
- [infra/Pulumi.yaml](file:///Volumes/Projects/transparencia/infra/Pulumi.yaml) — Manifesto do projeto Pulumi.
- [infra/Pulumi.dev.yaml](file:///Volumes/Projects/transparencia/infra/Pulumi.dev.yaml) — Configurações do stack dev.
- [infra/package.json](file:///Volumes/Projects/transparencia/infra/package.json) — Dependências NPM do Pulumi (pinned).
- [infra/tsconfig.json](file:///Volumes/Projects/transparencia/infra/tsconfig.json) — Configuração TS do Pulumi.
- [infra/index.ts](file:///Volumes/Projects/transparencia/infra/index.ts) — Definição dos recursos `R2Bucket` e `R2BucketCors`.
- [elt/scripts/sync_parquet.py](file:///Volumes/Projects/transparencia/elt/scripts/sync_parquet.py) — Script de upload incremental de arquivos Parquet via `boto3`.
- [elt/pyproject.toml](file:///Volumes/Projects/transparencia/elt/pyproject.toml) — Adição de `boto3==1.36.20`.
- [elt/uv.lock](file:///Volumes/Projects/transparencia/elt/uv.lock) — Atualização das travas de dependência.
- [Makefile](file:///Volumes/Projects/transparencia/Makefile) — Inclusão do target `sync/parquet`.
- [pnpm-workspace.yaml](file:///Volumes/Projects/transparencia/pnpm-workspace.yaml) — Inclusão do pacote `infra` no workspace pnpm.

### References
- [Epic 5 em epics.md](file:///_bmad-output/planning-artifacts/epics.md#epic-5-migração-para-arquitetura-analytics-serverless-duckdb--parquet--cloudflare-r2--assistente-llm)
- [Story 5.1 Artifact](file:///_bmad-output/implementation-artifacts/5-1-adaptar-pipeline-dbt-para-dbt-duckdb.md)
- [Story 5.2 Artifact](file:///_bmad-output/implementation-artifacts/5-2-refatorar-suite-de-testes-do-etl-conftest-py.md)
- [Architecture Spine](file:///_bmad-output/planning-artifacts/architecture/architecture-transparencia-2026-08-01/ARCHITECTURE-SPINE.md)
- [Diretrizes AGENTS.md](file:///AGENTS.md)

## Dev Agent Record

### Agent Model Used

Gemini 3.6 Flash (Medium)

### Debug Log References

- Execução de `pnpm --filter infra build` passou com sucesso (0 erros no compilador tsc).
- Execução do script `make sync/parquet` (`cd elt && uv run python scripts/sync_parquet.py`) executado com sucesso e fallback gracioso para MinIO local S3 (`http://localhost:9000`).
- Execução da suíte de testes `make test` aprovada com 100% de sucesso (10/10 testes em 25.6s).
- Execução das verificações estáticas `make check` aprovada com 100% no ruff e mypy (56 arquivos auditados).
- Execução da suíte TypeScript `make test/ts` aprovada com 100% de sucesso (82/82 testes passando).

### Completion Notes List

- ✅ Estruturado projeto IaC Pulumi TypeScript no diretório `infra/` (`Pulumi.yaml`, `Pulumi.dev.yaml`, `package.json`, `tsconfig.json`, `.gitignore`).
- ✅ Declaradas versões exatas (pinned) sem `^` ou `~`: `@pulumi/pulumi==3.150.0` e `@pulumi/cloudflare==6.19.0` (Regra 7 de `AGENTS.md`).
- ✅ Implementados recursos `cloudflare.R2Bucket` (`transparencia-parquet-store`) e `cloudflare.R2BucketCors` com suporte completo a HTTP Range Requests (`GET`, `HEAD`, headers `Range`, `Content-Type`, `Authorization` e expostos `Content-Range`, `Accept-Ranges`, `ETag`, `Content-Length`).
- ✅ Adicionada a dependência `boto3==1.36.20` (pinned) ao `elt/pyproject.toml` e sincronizado o ambiente via `uv sync`.
- ✅ Criado o script `elt/scripts/sync_parquet.py` para upload incremental de arquivos Parquet com o header `Content-Type: application/vnd.apache.parquet` e fallback automático para o MinIO local (`http://localhost:9000`).
- ✅ Adicionado o alvo `sync/parquet` no `Makefile`.
- ✅ Atualizado o `pnpm-workspace.yaml` e aprovadas todas as suítes de teste (`make test`, `make check`, `make test/ts`, `pnpm --filter infra build`).

### File List

- `infra/Pulumi.yaml`
- `infra/Pulumi.dev.yaml`
- `infra/package.json`
- `infra/tsconfig.json`
- `infra/index.ts`
- `infra/.gitignore`
- `elt/scripts/sync_parquet.py`
- `elt/pyproject.toml`
- `elt/uv.lock`
- `Makefile`
- `pnpm-workspace.yaml`
- `_bmad-output/implementation-artifacts/5-3-provisionar-infraestrutura-cloudflare-r2-via-pulumi.md`
