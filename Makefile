SRC = elt

.PHONY: install-uv install type-check lint lint/ruff lint/fix format format/check check test verify pipeline pipeline/extract pipeline/load elt/extract elt/extract-csv elt/load elt/load-csv elt/siconfi elt/siope elt/siops elt/emendas-estaduais elt/saude-datasus elt/inep-censo elt/pncp r2/pull r2/push dbt/deps dbt/run dbt/seed dbt/test dbt/debug dbt/compile dbt/docs dev build lint/ts test/ts digest/send digest/dry-run bot/post bot/dry-run push/send push/dry-run db/init-roles db/test/build docker/elt/build docker/elt/run

# SETUP TASKS

install-uv:
	@command -v uv >/dev/null 2>&1 || { echo "Installing uv..."; curl -LsSf https://astral.sh/uv/install.sh | sh; }

install: install-uv
	cd elt && uv sync --group dev

# CODE QUALITY TASKS

type-check:
	uv run --project elt mypy $(SRC) --ignore-missing-imports

lint: lint/ruff

lint/ruff:
	uv run --project elt ruff check $(SRC)

lint/fix:
	uv run --project elt ruff check --fix $(SRC)

format:
	uv run --project elt ruff format $(SRC)

format/check:
	uv run --project elt ruff format --check $(SRC)

check: lint format/check type-check

# TESTS

test:
	uv run --project elt pytest -v

# PORTÃO DE QUALIDADE UNIFICADO (PARIDADE LOCAL ↔ CI)
verify: check test db/test/build lint/ts test/ts build

# PIPELINE

pipeline/extract:
	uv run --project elt python -c "from elt.core.pipeline import extract_only; extract_only(years=$(if $(YEARS),[$(YEARS)],None))"

pipeline/load:
	uv run --project elt python -c "from elt.core.pipeline import load_from_dir; load_from_dir('$(DIR)')"

# ELT — extract/load separados por portal

elt/extract:
ifndef PORTAL
	$(error PORTAL is required. Usage: make elt/extract PORTAL=porciuncula_prefeitura [YEARS="2024 2025"] [ONLY=DespesasGerais])
endif
	PYTHONPATH=. uv run --project elt python elt/extract/run.py --portal $(PORTAL) $(if $(YEARS),--years $(YEARS)) $(if $(ONLY),--only $(ONLY))

elt/load:
ifndef PORTAL
	$(error PORTAL is required. Usage: make elt/load PORTAL=porciuncula_prefeitura [DIR=data/raw_runs/20250101_120000])
endif
	PYTHONPATH=. uv run --project elt python elt/load/run.py --portal $(PORTAL) $(if $(DIR),--dir $(DIR))

elt/extract-csv:
ifndef PORTAL
	$(error PORTAL is required. Usage: make elt/extract-csv PORTAL=porciuncula_prefeitura)
endif
	PYTHONPATH=. uv run --project elt python elt/extract/fiorilli/$(PORTAL)/receitas_csv.py

elt/load-csv:
ifndef PORTAL
	$(error PORTAL is required. Usage: make elt/load-csv PORTAL=porciuncula_prefeitura)
endif
	PYTHONPATH=. uv run --project elt python elt/load/fiorilli/$(PORTAL)/load_receitas_csv.py

elt/siconfi:
ifndef PORTAL
	$(error PORTAL is required. Usage: make elt/siconfi PORTAL=porciuncula_prefeitura [YEARS="2024 2025"])
endif
	PYTHONPATH=. uv run --project elt python elt/extract/siconfi_msc.py --with-db --portal $(PORTAL) $(if $(YEARS),--years $(YEARS))

elt/siope:
ifndef PORTAL
	$(error PORTAL is required. Usage: make elt/siope PORTAL=porciuncula_prefeitura [YEARS="2024 2025"] [DRY_RUN=1])
endif
	PYTHONPATH=. uv run --project elt python elt/extract/siope.py --portal $(PORTAL) $(if $(YEARS),--years $(YEARS)) $(if $(DRY_RUN),--dry-run)

elt/siops:
	PYTHONPATH=. uv run --project elt python elt/extract/siops.py $(if $(PORTAL),--portal $(PORTAL)) $(if $(YEARS),--years $(YEARS)) $(if $(DRY_RUN),--dry-run)

elt/inep-censo:
ifndef PORTAL
	$(error PORTAL is required. Usage: make elt/inep-censo PORTAL=porciuncula_prefeitura [YEARS="2023 2024"] [DRY_RUN=1])
endif
	PYTHONPATH=. uv run --project elt python elt/extract/inep_censo.py --portal $(PORTAL) $(if $(YEARS),--years $(YEARS)) $(if $(DRY_RUN),--dry-run)

elt/emendas-estaduais:
	PYTHONPATH=. uv run --project elt python elt/extract/emendas_estaduais.py $(if $(FONTE),--fonte $(FONTE)) $(if $(DRY_RUN),--dry-run)

elt/pncp:
	PYTHONPATH=. uv run --project elt python elt/extract/pncp.py --with-db $(if $(CNPJ),--cnpj $(CNPJ)) $(if $(YEARS),--years $(YEARS))

elt/farmacia-sus:
	@for portal in $(if $(PORTAL),$(PORTAL),$$(ls elt/portals/*.yml | xargs -n1 basename | sed 's/\.yml$$//')); do \
		echo "=== Farmácia SUS: $$portal ==="; \
		PYTHONPATH=. uv run --project elt python elt/extract/run.py --portal $$portal --only farmacia_sus && \
		PYTHONPATH=. uv run --project elt python elt/load/run.py --portal $$portal || exit 1; \
	done
	uv run --project elt python elt/scripts/run_dbt.py seed --full-refresh --select seed_farmacia_medicamentos_sentinela
	uv run --project elt python elt/scripts/run_dbt.py run --select path:models/staging/farmacia_sus fct_farmacia_estoque fct_farmacia_estoque_historico fct_farmacia_coletas_historico fct_farmacia_sentinela_disponibilidade

# Rede e produção de saúde (CNES, SIA e SIH) dos arquivos mensais por UF do DATASUS; população pela API.
# Uso: make elt/saude-datasus [PORTAL=slug] [COMPETENCIAS="202601 202602"] [YEARS="2025"] [DRY_RUN=1]
# Sem COMPETENCIAS nem YEARS busca as 4 últimas fechadas. Backfill (ano_inicial_historico em diante) é manual,
# em partes e só no banco local (Regra 15): o SIA do mês ocupa ~3,4 GB de disco temporário.
# Toda execução sem DRY_RUN grava no DATABASE_URL do ambiente e roda o dbt nele: confira que é o banco local (5544)
# antes de rodar, e nunca exporte esse DATABASE_URL junto de db/test/build, pnpm test ou make test/ts.
elt/saude-datasus:
	PYTHONPATH=. uv run --project elt python elt/extract/saude_datasus.py $(if $(PORTAL),--portal $(PORTAL)) $(if $(COMPETENCIAS),--competencias $(COMPETENCIAS)) $(if $(YEARS),--years $(YEARS)) $(if $(DRY_RUN),--dry-run)
	$(if $(DRY_RUN),,uv run --project elt python elt/scripts/run_dbt.py run --select path:models/staging/saude_rede fct_saude_rede_por_mil_moradores_metricas fct_saude_producao_sus_metricas)

# CLOUDFLARE R2 DATA LAKE SYNC

r2/pull:
	PYTHONPATH=. uv run --project elt python elt/scripts/sync_r2.py pull $(if $(PORTAL),--portal $(PORTAL)) $(if $(DRY_RUN),--dry-run)

r2/push:
	PYTHONPATH=. uv run --project elt python elt/scripts/sync_r2.py push $(if $(PORTAL),--portal $(PORTAL)) $(if $(DRY_RUN),--dry-run)

# CACHE REVALIDATION

cache/revalidate:
ifndef PORTAL
	$(error PORTAL is required. Usage: make cache/revalidate PORTAL=porciuncula_prefeitura [WEBHOOK_URL=...])
endif
	@curl -s -f -X POST "$${WEBHOOK_URL:-http://localhost:3001/api/ingestion/webhook}" \
		-H "Authorization: Bearer $${INTERNAL_API_SECRET}" \
		-H "Content-Type: application/json" \
		-d '{"portalSlug":"$(PORTAL)","status":"success","skipNotification":true,"timestamp":"'$$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}' \
		&& echo "\nCache revalidado com sucesso para $(PORTAL)!" || (echo "\nFalha ao revalidar cache" && exit 1)

# DOCKER ELT

docker/elt/build:
	docker build -f elt/Dockerfile -t transparencia-elt:latest elt

docker/elt/run:
	docker run --rm --network host \
		-e DATABASE_URL="$${DATABASE_URL:-postgresql://postgres:postgres@localhost:5544/postgres}" \
		-e FLARESOLVERR_URL="$${FLARESOLVERR_URL:-http://localhost:8191/v1}" \
		-e WEBHOOK_URL="$${WEBHOOK_URL:-http://localhost:3001/api/ingestion/webhook}" \
		-e INTERNAL_API_SECRET="$${INTERNAL_API_SECRET:-}" \
		-e ALERT_WEBHOOK_URL="$${ALERT_WEBHOOK_URL:-}" \
		transparencia-elt:latest $(ARGS)

# MIGRATIONS

db/init-roles:
	psql "$${DATABASE_URL:-postgresql://postgres:postgres@localhost:5544/postgres}" -f docker/init/01-init-roles.sql

migrate/grant:
	psql "$${DATABASE_URL:-postgresql://postgres:postgres@localhost:5544/postgres}" -f elt/migrations/grant_readonly.sql

# DBT TRANSFORM

dbt/deps:
	uv run --project elt python elt/scripts/run_dbt.py deps

dbt/seed:
	uv run --project elt python elt/scripts/run_dbt.py seed $(if $(FULL_REFRESH),--full-refresh) $(if $(SELECT),--select $(SELECT))

dbt/run:
	uv run --project elt python elt/scripts/run_dbt.py run $(if $(FULL_REFRESH),--full-refresh) $(if $(SELECT),--select $(SELECT))

dbt/test:
	uv run --project elt python elt/scripts/run_dbt.py test $(if $(SELECT),--select $(SELECT))

dbt/debug:
	uv run --project elt python elt/scripts/run_dbt.py debug

dbt/compile:
	uv run --project elt python elt/scripts/run_dbt.py compile

dbt/docs:
	uv run --project elt python elt/scripts/run_dbt.py docs generate && uv run --project elt python elt/scripts/run_dbt.py docs serve

# WEB APP (NEXT.JS)

dev:
	pnpm dev

build:
	pnpm build

lint/ts:
	pnpm lint

test/ts:
	pnpm test

digest/send:
	pnpm --filter web digest:send --portal $(if $(PORTAL),$(PORTAL),porciuncula_prefeitura) $(if $(ANO),--ano $(ANO))

digest/dry-run:
	pnpm --filter web digest:dry-run --portal $(if $(PORTAL),$(PORTAL),porciuncula_prefeitura) $(if $(ANO),--ano $(ANO))

bot/post:
	pnpm --filter web social:publish --channels $(if $(CHANNELS),$(CHANNELS),all) --type $(if $(TYPE),$(TYPE),fiscal_digest) --portal $(if $(PORTAL),$(PORTAL),porciuncula_prefeitura) $(if $(ANO),--ano $(ANO)) $(if $(TEXT),--text "$(TEXT)") $(if $(VERSION),--version $(VERSION)) $(if $(SUMMARY),--summary "$(SUMMARY)") $(if $(DRY_RUN),--dry-run)

bot/dry-run:
	pnpm --filter web social:dry-run --channels $(if $(CHANNELS),$(CHANNELS),all) --type $(if $(TYPE),$(TYPE),fiscal_digest) --portal $(if $(PORTAL),$(PORTAL),porciuncula_prefeitura) $(if $(ANO),--ano $(ANO)) $(if $(TEXT),--text "$(TEXT)") $(if $(VERSION),--version $(VERSION)) $(if $(SUMMARY),--summary "$(SUMMARY)")

push/send:
	pnpm --filter web push:send --portal $(if $(PORTAL),$(PORTAL),porciuncula_prefeitura) $(if $(TITLE),--title "$(TITLE)") $(if $(BODY),--body "$(BODY)") $(if $(URL),--url "$(URL)") $(if $(TOPIC),--topic $(TOPIC))

push/dry-run:
	pnpm --filter web push:dry-run --portal $(if $(PORTAL),$(PORTAL),porciuncula_prefeitura) $(if $(TITLE),--title "$(TITLE)") $(if $(BODY),--body "$(BODY)") $(if $(URL),--url "$(URL)") $(if $(TOPIC),--topic $(TOPIC))



# Banco de testes de packages/db: construído pelo dbt (seeds + marts como tabelas vazias)
# a partir dos _sources.yml. Local e CI usam exatamente este mesmo alvo; não há fixture
# versionado para manter. Dados transacionais de teste são semeados via seed.ts.
# Uso local: docker compose up -d postgres_test && make db/test/build && make test/ts
db/test/build:
	DATABASE_URL="$${DATABASE_URL:-postgresql://postgres:postgres@localhost:5545/postgres}" \
		uv run --project elt python elt/scripts/build_test_db.py
