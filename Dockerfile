# API service - build from repository root
FROM node:20-alpine

WORKDIR /app

COPY . .

RUN corepack enable
RUN pnpm install
RUN pnpm exec prisma generate
RUN pnpm build:api

EXPOSE 3000

CMD ["pnpm", "run", "start:railway"]
