# Build context must be repository root: docker build -f apps/api/Dockerfile .
FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY . .

RUN pnpm install --no-frozen-lockfile
RUN pnpm exec prisma generate
RUN pnpm --filter @locus/api build

ENV NODE_ENV=production
ENV HOST=0.0.0.0

EXPOSE 8080

CMD ["node", "apps/api/dist/index.js"]
