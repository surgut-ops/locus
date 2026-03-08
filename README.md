# LOCUS

LOCUS is a production-ready, AI-powered real estate platform for short-term rentals, long-term rentals, and property sales.  
This repository is a scalable monorepo foundation for web, API, shared packages, and data infrastructure.

## Tech Stack

- Frontend: Next.js, TypeScript, Tailwind CSS
- Backend: Node.js, Fastify, TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Cache: Redis
- Search: Meilisearch
- Storage: Cloudflare R2
- AI: OpenAI API
- Monorepo tooling: pnpm workspaces, Turborepo

## Monorepo Structure

```text
.
├─ apps
│  ├─ web
│  └─ api
├─ packages
│  ├─ ui
│  ├─ types
│  └─ config
├─ prisma
└─ docs
```

## Workspace Commands

- `pnpm dev` - run all dev tasks via Turborepo
- `pnpm build` - build workspace targets
- `pnpm lint` - run lint tasks
- `pnpm typecheck` - run type checks
- `pnpm format` - run Prettier

## Documentation

- Deployment: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- Railway checklist: [docs/RAILWAY_CHECKLIST.md](docs/RAILWAY_CHECKLIST.md)

## Prisma Migration Preparation

Do not run migrations automatically in this stage.  
Use these commands later when migration execution is approved:

```bash
pnpm --filter @locus/api prisma generate
pnpm --filter @locus/api prisma migrate dev --name init
pnpm --filter @locus/api prisma migrate deploy
```
