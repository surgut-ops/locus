# Build context must be repository root: docker build -f apps/api/Dockerfile .
FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY . .

RUN pnpm install
RUN pnpm exec prisma generate
RUN pnpm --filter @locus/api build

EXPOSE 3000

CMD ["pnpm", "run", "start:railway"]
