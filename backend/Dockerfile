# syntax=docker/dockerfile:1
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PATH="/root/.local/bin:$PATH"

WORKDIR /app

# System deps for building argon2 / psycopg.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Python deps first (better layer caching).
COPY pyproject.toml ./
RUN pip install --user "hatchling" && \
    pip install --user -e .[dev]

COPY . .

EXPOSE 8000

# Run migrations, then start the API.
CMD ["sh", "-c", "alembic upgrade head && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000"]
