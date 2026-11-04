# ==============================================================================
# Dockerfile — Lokayana AI Backend (Python FastAPI)
# ==============================================================================
# Base image: Python 3.11 Slim (ringan, aman, dan cepat di-build)
FROM python:3.11-slim AS base

# Hindari pembuatan file .pyc dan aktifkan log unbuffered
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Tentukan direktori kerja dalam container
WORKDIR /app

# Install curl untuk healthcheck container
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Buat non-root user demi keamanan (Best Practice Security)
RUN groupadd -r appgroup && useradd -r -g appgroup -d /app -s /sbin/nologin appuser

# Copy file dependensi terlebih dahulu agar memanfaatkan cache layer Docker
COPY requirements.txt .

# Install seluruh dependensi Python
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code backend ke dalam container
COPY . .

# Berikan kepemilikan file ke non-root user
RUN chown -R appuser:appgroup /app

# Jalankan sebagai non-root user
USER appuser

# Expose port FastAPI (8000)
EXPOSE 8000

# Healthcheck otomatis untuk memastikan container sehat
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Command default untuk menjalankan uvicorn server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

