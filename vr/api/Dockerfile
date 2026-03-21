FROM python:3.10-slim

WORKDIR /app

# Install vrdev SDK first (local package) — include [llm] for SOFT-tier verifiers
COPY packages/vrdev /tmp/vrdev
RUN pip install --no-cache-dir "/tmp/vrdev[llm]" && rm -rf /tmp/vrdev

# Install vr-api
COPY packages/vr-api /tmp/vr-api
RUN pip install --no-cache-dir /tmp/vr-api && rm -rf /tmp/vr-api

# Production extras
RUN pip install --no-cache-dir asyncpg "redis[hiredis]>=5.0" uvicorn[standard]

# Run as non-root user
RUN addgroup --system vrapi && adduser --system --ingroup vrapi vrapi
USER vrapi

EXPOSE 8000

CMD ["sh", "-c", "uvicorn vr_api.app:app --host 0.0.0.0 --port ${PORT:-8000}"]
