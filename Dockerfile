# API service - build from repository root
FROM node:20-alpine

WORKDIR /app

COPY . .

RUN corepack enable
RUN pnpm install
RUN pnpm exec prisma generate
RUN pnpm turbo run build --filter=@locus/api

EXPOSE 3000

CMD ["node", "apps/api/dist/index.js"]
