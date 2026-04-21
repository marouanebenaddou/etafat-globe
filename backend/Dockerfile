# ETAFAT GNSS backend — FastAPI + RTKLIB compiled from source
#
# Multi-stage build:
#   1. rtklib-builder: clone & compile rnx2rtkp and convbin (Debian slim + gcc).
#   2. runtime:        slim Python image, vendor the two binaries + service.
#
# Deploy: `docker build -t etafat-gnss-api .` then run on any Docker host
# (Railway, Fly.io, bare VPS). Exposes :8000.

# ──────────────────────────── build stage ──────────────────────────────────
FROM debian:bookworm-slim AS rtklib-builder
RUN apt-get update && apt-get install -y --no-install-recommends \
        git build-essential ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
RUN git clone --depth 1 https://github.com/tomojitakasu/RTKLIB.git

# Patch the two Makefiles we care about for modern glibc (drop -ansi, keep _POSIX_C_SOURCE)
RUN sed -i 's|-Wall -O3 -ansi -pedantic|-Wall -O3 -Wno-implicit-function-declaration -Wno-int-conversion -Wno-format -Wno-unused-result -D_POSIX_C_SOURCE=200809L|' \
        RTKLIB/app/rnx2rtkp/gcc/makefile \
        RTKLIB/app/convbin/gcc/makefile

RUN cd RTKLIB/app/rnx2rtkp/gcc && make -j$(nproc) \
 && cd /build/RTKLIB/app/convbin/gcc && make -j$(nproc)


# ──────────────────────────── runtime stage ────────────────────────────────
FROM python:3.11-slim

# Runtime dependencies for numpy/scipy wheels (libgomp for OpenMP, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgomp1 ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Vendor the compiled RTKLIB binaries
COPY --from=rtklib-builder /build/RTKLIB/app/rnx2rtkp/gcc/rnx2rtkp /app/rtklib_bin/rnx2rtkp
COPY --from=rtklib-builder /build/RTKLIB/app/convbin/gcc/convbin   /app/rtklib_bin/convbin
RUN chmod +x /app/rtklib_bin/*

# Application source
COPY gnss/ /app/gnss/
COPY app.py /app/

ENV PORT=8000
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT}"]
