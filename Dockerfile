# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS frontend-build
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/index.html frontend/vite.config.js ./
COPY frontend/src/ ./src/
RUN npm run build

FROM python:3.11-slim-bookworm AS model-download
WORKDIR /build
COPY scripts/download_models.py ./scripts/download_models.py
COPY research/ ./research/
ARG MODEL_VARIANT=all
RUN mkdir -p .models \
    && python scripts/download_models.py --model "${MODEL_VARIANT}" \
    && for variant in nano small medium large xlarge; do \
        if [ "${MODEL_VARIANT}" = all ] || [ "${MODEL_VARIANT}" = "${variant}" ]; then \
            if [ ! -f ".models/${variant}.pt" ]; then \
                cp "research/train-${variant}/weights/best.pt" ".models/${variant}.pt"; \
            fi; \
        fi; \
    done \
    && rm -rf research/train-*/weights

FROM python:3.11-slim-bookworm AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    OSTEO_INSTANCE_PATH=/app/instance

WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt ./
RUN python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    && python -m pip install -r requirements.txt

COPY backend/ ./backend/
COPY dataset/ ./dataset/
COPY --from=model-download /build/research/ ./research/
COPY LICENSE ./LICENSE
COPY --from=model-download /build/.models/ ./.models/
COPY --from=frontend-build /build/frontend/dist/ ./frontend/dist/

RUN useradd --create-home --user-group --uid 10001 app \
    && mkdir -p /app/instance \
    && chown app:app /app/instance
USER app

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:5000/api/health', timeout=5).read()"]
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "1", "--threads", "4", "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-", "backend.wsgi:application"]
