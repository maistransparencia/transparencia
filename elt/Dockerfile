# Multi-stage Dockerfile for automated ELT ingestion pipeline
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy uv binaries
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy dependency specifications
COPY pyproject.toml uv.lock ./

# Install pinned dependencies into virtual environment
RUN uv sync --frozen --no-dev --no-install-project

# Stage 2: Lightweight runtime image
FROM python:3.12-slim AS runner

WORKDIR /app

# Install runtime libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy uv binaries for tooling
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy virtualenv from builder
COPY --from=builder /app/.venv /app/.venv

# Configure execution environment
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH="/app"

# Copy source code
COPY . /app/elt

# Ponto de entrada padrão para o orquestrador do pipeline
ENTRYPOINT ["python", "-m", "elt.orchestrator"]
CMD ["--portal", "porciuncula_prefeitura"]
