FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm@10.0.0

COPY package.json pnpm-workspace.yaml ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install

EXPOSE 3000

CMD ["pnpm", "--filter", "@pro-monitor/web", "dev"]
