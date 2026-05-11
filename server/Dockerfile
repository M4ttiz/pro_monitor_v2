FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm@10.0.0

COPY package.json pnpm-workspace.yaml ./
COPY server ./server
COPY packages ./packages

RUN pnpm install

RUN pnpm --filter @pro-monitor/server run prisma:generate

EXPOSE 3001

CMD ["pnpm", "--filter", "@pro-monitor/server", "dev"]
