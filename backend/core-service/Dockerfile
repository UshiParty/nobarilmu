# Image kecil berbasis Alpine, mendukung ARM64 (STB) dan x86 (laptop).
# Tidak ada library native, jadi build di STB cepat dan tidak butuh compiler.
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY openapi.yaml ./
COPY src ./src

# Folder data SQLite (di-mount sebagai volume oleh docker-compose).
RUN mkdir -p /app/data && chown -R node:node /app
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "--disable-warning=ExperimentalWarning", "src/server.js"]
