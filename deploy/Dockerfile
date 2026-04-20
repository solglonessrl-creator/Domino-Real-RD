# Domino Real RD — Docker para producción
FROM node:20-alpine

WORKDIR /app

# Instalar dependencias del backend
COPY backend/package*.json ./
RUN npm ci --only=production

# Copiar código
COPY backend/ .

# Puerto
EXPOSE 3001

# Variables de entorno requeridas:
# DATABASE_URL, JWT_SECRET, NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "server.js"]
