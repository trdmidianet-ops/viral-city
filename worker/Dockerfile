# syntax=docker/dockerfile:1
FROM node:22-slim AS base

# yt-dlp + ffmpeg + python (yt-dlp depende)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    curl \
    ca-certificates \
  && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod +x /usr/local/bin/yt-dlp \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia toda a raiz do repo (worker + src/lib compartilhados)
COPY package.json package-lock.json* ./
COPY worker/package.json ./worker/
COPY tsconfig.json ./
COPY src/ ./src/
COPY worker/ ./worker/

# Instala deps da raiz (pg, @huggingface/transformers, ffmpeg-static já estão aqui)
RUN npm ci --omit=dev

# Instala deps do worker
WORKDIR /app/worker
RUN npm install --omit=dev

WORKDIR /app
ENV NODE_ENV=production
ENV WORKER_DATA_DIR=/data
# Cache do HuggingFace: modelo fica no layer do Docker, não há download em produção
ENV HF_HOME=/app/.hf-cache

# Pré-baixa o modelo Whisper durante o build (~80 MB, evita cold-start + timeout)
RUN node --input-type=module <<'EOF'
import { pipeline } from "@huggingface/transformers";
await pipeline("automatic-speech-recognition", "onnx-community/whisper-base_timestamped", { dtype: "q8" });
console.log("[build] Whisper model cached OK");
process.exit(0);
EOF

EXPOSE 3001

CMD ["./node_modules/.bin/tsx", "worker/server.ts"]
# redeploy trigger — whisper pre-cached in Docker layer
