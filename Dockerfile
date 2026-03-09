# API service - build from repository root
FROM node:20-alpine

WORKDIR /app

COPY . .

RUN corepack enable
RUN pnpm install --no-frozen-lockfile
RUN pnpm exec prisma generate
RUN pnpm build:api

ENV NODE_ENV=production
ENV HOST=0.0.0.0

EXPOSE 8080

CMD ["node", "apps/api/dist/index.js"]
