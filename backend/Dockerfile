FROM python:3.13-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/Angeliz_Cakes/backend \
    PRISMA_BINARY_CACHE_DIR=/app/.prisma/binaries \
    PRISMA_NODEENV_CACHE_DIR=/app/.prisma/nodeenv \
    PATH=/opt/venv/bin:$PATH

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libatomic1 \
    && rm -rf /var/lib/apt/lists/*

COPY Angeliz_Cakes/backend/requirements.txt /app/requirements.txt
RUN python -m venv /opt/venv \
    && pip install --no-cache-dir --requirement /app/requirements.txt

COPY Angeliz_Cakes/backend /app/Angeliz_Cakes/backend
COPY Angeliz_Cakes/frontend /app/Angeliz_Cakes/frontend

WORKDIR /app/Angeliz_Cakes/backend
RUN python -m prisma py fetch \
    && python -m prisma generate --schema database_service/schema.prisma \
    && python -c "from prisma import models; assert {'branchInventories', 'productImages'} <= models.Product.__annotations__.keys(), 'Generated Prisma client is missing Product relations'; assert 'reportDate' in models.BranchDailyReport.__annotations__, 'Generated Prisma client is missing BranchDailyReport.reportDate'"

FROM python:3.13-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/Angeliz_Cakes/backend \
    PRISMA_BINARY_CACHE_DIR=/app/.prisma/binaries \
    PRISMA_NODEENV_CACHE_DIR=/app/.prisma/nodeenv \
    PATH=/opt/venv/bin:$PATH \
    PORT=8080

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libatomic1 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --uid 10001 --create-home appuser

COPY --from=builder /opt/venv /opt/venv
COPY --from=builder --chown=appuser:appuser /app/.prisma /app/.prisma
COPY --from=builder --chown=appuser:appuser /app/Angeliz_Cakes /app/Angeliz_Cakes

WORKDIR /app/Angeliz_Cakes/backend
USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD python -c "import os, urllib.request; port = os.getenv('PORT', '8080'); host = os.getenv('DOMAIN', 'localhost'); request = urllib.request.Request(f'http://127.0.0.1:{port}/healthz', headers={'Host': host}); urllib.request.urlopen(request, timeout=3)" || exit 1

CMD ["sh", "-c", "python -m prisma migrate deploy --schema database_service/schema.prisma && exec gunicorn --bind 0.0.0.0:${PORT:-8080} --workers 2 --threads 4 --timeout 60 --access-logfile - --error-logfile - binding_authentication.binding_authentication:app"]
