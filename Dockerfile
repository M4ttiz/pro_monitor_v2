# Multi-stage build per development e production
FROM node:20-alpine

WORKDIR /app

# Installa pnpm
RUN npm install -g pnpm@10.0.0

# Copy workspace files
COPY package.json pnpm-workspace.yaml ./
COPY server ./server
COPY apps ./apps
COPY packages ./packages

# Installa tutte le dipendenze
RUN pnpm install

# Genera Prisma client
RUN pnpm --filter @pro-monitor/server run prisma:generate

EXPOSE 3000 3001

CMD ["pnpm", "dev"]
