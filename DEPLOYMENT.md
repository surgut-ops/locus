# LOCUS — Деплой на Railway и Vercel

## Railway (API)

1. **Root Directory:** оставьте пустым (корень репозитория)
2. **Build:** `pnpm install && pnpm exec prisma generate && pnpm turbo run build --filter=@locus/api`
3. **Start:** `node apps/api/dist/index.js`
4. **Переменные:** `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, и др. из `.env.example`

## Vercel (Web)

1. **Root Directory:** `apps/web`
2. **Framework:** Next.js (авто)
3. **Build / Install:** см. `apps/web/vercel.json` — `installCommand` и `buildCommand` настроены для монорепо
