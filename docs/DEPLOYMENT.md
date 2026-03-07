# LOCUS — Production Deployment Guide

Документация по развёртыванию проекта LOCUS в production.

---

## Архитектура

| Компонент | Платформа | URL |
|-----------|-----------|-----|
| Frontend (Next.js) | Vercel | https://locus.app |
| Backend (Fastify API) | Railway | https://api.locus.app |
| PostgreSQL | Railway / Neon / Supabase | — |
| Redis | Railway / Upstash | — |
| Object Storage (изображения) | Cloudflare R2 / AWS S3 | https://cdn.locus.app |
| Домен | locus.app | — |
| SSL | Автоматически (Vercel, Railway) | — |

---

## ШАГ 1 — Environment Variables

### 1.1 Создать `.env.production`

Скопируйте шаблон и заполните значения:

```bash
cp .env.production.example .env.production
```

### 1.2 Обязательные переменные

| Переменная | Описание | Пример |
|------------|----------|--------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/locus?sslmode=require` |
| `REDIS_URL` | Redis connection string | `redis://default:pass@host:6379` |
| `JWT_SECRET` | Секрет для JWT (min 32 символа) | `openssl rand -base64 32` |
| `OPENAI_API_KEY` | API ключ OpenAI | `sk-proj-...` |
| `SMTP_HOST` | SMTP сервер | `smtp.sendgrid.net` |
| `SMTP_USER` | SMTP логин | `apikey` |
| `SMTP_PASSWORD` | SMTP пароль | `SG.xxx` |

### 1.3 Дополнительные переменные

- **Storage (R2/S3):** `CLOUDFLARE_R2_*` или `S3_*`
- **Payments:** `STRIPE_*`, `YOOKASSA_*`
- **URLs:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, `APP_BASE_URL`
- **Logging:** `LOG_LEVEL` (debug | info | warn | error)

---

## ШАГ 2 — Frontend (Vercel)

### 2.1 Подключение репозитория

1. [Vercel Dashboard](https://vercel.com) → **Add New Project**
2. Импорт из GitHub/GitLab/Bitbucket
3. **Root Directory:** корень репозитория (пусто) — monorepo
4. **Framework Preset:** Next.js (автоопределение)

### 2.2 Build & Output

- **Install Command:** `pnpm install`
- **Build Command:** `pnpm turbo run build --filter=@locus/web`
- **Output Directory:** `.next` (по умолчанию) — для Root Directory `apps/web` укажите `apps/web`

### 2.3 Environment Variables (Vercel)

В настройках проекта добавьте:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://api.locus.app` (или `https://locusapi-production.up.railway.app` для Railway) |
| `NEXT_PUBLIC_WS_URL` | `wss://api.locus.app/ws/messages` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` |

**Критично:** `NEXT_PUBLIC_API_URL` **обязательно** должен начинаться с `https://`. Без протокола запросы уходят на Vercel как относительные → 404, HTML вместо JSON.

### 2.4 Домен locus.app

1. **Settings** → **Domains** → **Add** → `locus.app`
2. Добавьте `www.locus.app` (опционально)
3. Настройте DNS у регистратора:
   - **A** `@` → `76.76.21.21` (Vercel)
   - **CNAME** `www` → `cname.vercel-dns.com`

---

## ШАГ 3 — Backend (Railway)

### 3.1 Создание проекта

1. [Railway Dashboard](https://railway.app) → **New Project**
2. **Deploy from GitHub repo** → выберите репозиторий LOCUS

### 3.2 Настройка сервиса API

1. **New** → **GitHub Repo** → выберите репозиторий
2. **Settings** → **Root Directory:** корень репозитория (пусто) — обязательно для monorepo
3. Build и Start берутся из `railway.json` / `.nixpacks.toml`:
   - Build: `pnpm install && pnpm exec prisma generate && pnpm turbo run build --filter=@locus/api`
   - Start: `pnpm --filter @locus/api start`
4. **Критично:** В Vercel укажите `NEXT_PUBLIC_API_URL` и `NEXT_PUBLIC_WS_URL` = URL вашего Railway API (иначе frontend будет обращаться к localhost)

### 3.3 Переменные окружения (Railway)

**Минимум для запуска:**
- `DATABASE_URL` — из Railway Postgres или внешнего провайдера
- `REDIS_URL` — **ВАЖНО:** формат `redis://default:password@hostname:port`  
  - ❌ НЕ использовать `redis://...@host:port` (буквально "host")  
  - ✅ Redis Cloud: `redis://default:PASSWORD@xxx.ec2.cloud.redislabs.com:17897`
- `JWT_SECRET`, `OPENAI_API_KEY`
- `MEILISEARCH_HOST`, `MEILISEARCH_KEY`
- `QUEUE_PREFIX=locus`, `LOG_LEVEL=info`

**Ошибка `ENOTFOUND host`** — значит в REDIS_URL или DATABASE_URL указан placeholder "host" вместо реального хоста. Замените на полный URL из Redis Cloud / Meilisearch Cloud.

Добавьте также:
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`
- `CLOUDFLARE_R2_*` или `S3_*`
- `STRIPE_*`, `YOOKASSA_*`
- `NEXT_PUBLIC_API_URL` = `https://api.locus.app` (для CORS)
- `APP_BASE_URL` = `https://locus.app`
- `PORT` — Railway задаёт автоматически

### 3.4 Домен api.locus.app

1. **Settings** → **Networking** → **Generate Domain**
2. Или **Custom Domain:** `api.locus.app`
3. DNS: **CNAME** `api` → `xxx.railway.app`

---

## ШАГ 4 — PostgreSQL

### Варианты

| Провайдер | Рекомендация |
|-----------|--------------|
| **Railway** | Встроенный PostgreSQL, простой setup |
| **Neon** | Serverless, бесплатный tier |
| **Supabase** | PostgreSQL + дополнительные сервисы |

### Railway PostgreSQL

1. В проекте Railway: **New** → **Database** → **PostgreSQL**
2. Railway создаст `DATABASE_URL` автоматически
3. Добавьте переменную в сервис API (или используйте **Variables** → **Reference**)

### Миграции

После первого деплоя выполните миграции вручную (не в start command — иначе блокирует старт):

```bash
# Через Railway CLI
railway run pnpm exec prisma migrate deploy

# Или если нет миграций — db push для начальной схемы
railway run pnpm exec prisma db push
```

Сид (тестовые данные):

```bash
railway run pnpm run seed
```

---

## ШАГ 5 — Redis

### Варианты

| Провайдер | Рекомендация |
|-----------|--------------|
| **Railway** | Встроенный Redis |
| **Upstash** | Serverless Redis, бесплатный tier |

### Railway Redis

1. **New** → **Database** → **Redis**
2. Railway создаст `REDIS_URL`
3. Добавьте в сервис API

### Upstash

1. [Upstash Console](https://console.upstash.com) → **Create Database**
2. Скопируйте `REDIS_URL`
3. Добавьте в Railway Variables

---

## ШАГ 6 — Object Storage (S3 / R2)

### Cloudflare R2

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2** → **Create bucket**
2. Имя: `locus-listing-images`
3. **Settings** → **R2 API Tokens** → **Create API Token**
4. Скопируйте:
   - `Access Key ID` → `CLOUDFLARE_R2_KEY`
   - `Secret Access Key` → `CLOUDFLARE_R2_SECRET`
5. **Endpoint:** `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` → `CLOUDFLARE_R2_ENDPOINT`
6. **Public access:** настройте Custom Domain (например `cdn.locus.app`) → `CLOUDFLARE_R2_PUBLIC_BASE_URL`

### AWS S3 (альтернатива)

Используйте переменные:

- `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- `S3_REGION`, `S3_ENDPOINT`
- `STORAGE_PUBLIC_BASE_URL`

---

## ШАГ 7 — Домен locus.app

### Регистрация

1. Зарегистрируйте домен у любого регистратора (Namecheap, Cloudflare, etc.)
2. Или используйте существующий

### DNS записи

| Type | Name | Value |
|------|------|-------|
| A | @ | `76.76.21.21` (Vercel) |
| CNAME | www | `cname.vercel-dns.com` |
| CNAME | api | `xxx.railway.app` (ваш Railway URL) |
| CNAME | cdn | `xxx.r2.cloudflarestorage.com` (если R2) |

### Cloudflare (опционально)

- Используйте Cloudflare как DNS для DDoS защиты и кэширования
- Включите **Full (strict)** SSL

---

## ШАГ 8 — HTTPS / SSL

### Vercel

- SSL сертификаты выдаются автоматически для custom domains
- **Force HTTPS** включён по умолчанию

### Railway

- SSL включён по умолчанию для `*.railway.app`
- Для custom domain (`api.locus.app`) — автоматический Let's Encrypt

### Проверка

```bash
curl -I https://locus.app
curl -I https://api.locus.app/health
```

---

## ШАГ 9 — Logging

### Текущая реализация

- **LoggerService** — структурированное JSON-логирование
- Уровень: `LOG_LEVEL` (debug | info | warn | error)
- В production логируются все HTTP-запросы (кроме `/health`)

### Просмотр логов

- **Vercel:** Dashboard → Project → **Logs**
- **Railway:** Dashboard → Service → **Deployments** → **View Logs**

### Рекомендации

- Подключите **Vercel Log Drains** или **Railway Log Drains** к внешнему сервису (Datadog, Logtail, Axiom)
- Для ошибок: рассмотрите Sentry

---

## ШАГ 10 — Monitoring

### Встроенные эндпоинты

| Endpoint | Описание |
|----------|----------|
| `GET /health` | Статус БД, Redis, очередей |
| `GET /monitoring/metrics` | Метрики: response time, error rate, memory, active users |

### Пример ответа /health

```json
{
  "status": "ok",
  "database": "up",
  "redis": "up",
  "queues": { "email": 0, "image": 0 }
}
```

### Пример ответа /monitoring/metrics

```json
{
  "apiResponseTimeMs": 45.2,
  "errorRate": 0.01,
  "activeUsers": 12,
  "queueLength": { "email": 0 },
  "memoryUsageMb": { "rss": 128, "heapUsed": 64 }
}
```

### Рекомендации

- Настройте **Uptime Robot** или **Better Uptime** для проверки `/health` каждые 5 мин
- Защитите `/monitoring/metrics` через `MONITORING_SECRET` (опционально, добавить в код)
- Интегрируйте с **Grafana** / **Datadog** для дашбордов

---

## ШАГ 11 — Чеклист деплоя

- [ ] `.env.production` создан и заполнен
- [ ] PostgreSQL развёрнут, миграции применены
- [ ] Redis развёрнут
- [ ] R2/S3 настроен для изображений
- [ ] Vercel: frontend задеплоен, домен locus.app
- [ ] Railway: API задеплоен, домен api.locus.app
- [ ] Переменные `NEXT_PUBLIC_API_URL` и `NEXT_PUBLIC_WS_URL` указывают на production API
- [ ] SSL работает на locus.app и api.locus.app
- [ ] `/health` возвращает `status: ok`
- [ ] Логи и мониторинг настроены

---

## Быстрый старт (TL;DR)

```bash
# 1. Переменные
cp .env.production.example .env.production
# Заполните .env.production

# 2. Vercel
vercel link
vercel env pull .env.local
vercel --prod

# 3. Railway
railway login
railway link
railway variables set DATABASE_URL=... REDIS_URL=... JWT_SECRET=...
railway up

# 4. Миграции
railway run pnpm exec prisma db push
railway run pnpm run seed
```

---

## Поддержка

При проблемах проверьте:

1. **Unexpected Error: `<!DOCTYPE html>`** или **404 для /recommendations, /search, /auth/register** — `NEXT_PUBLIC_API_URL` в Vercel указан без `https://`. Должно быть `https://locusapi-production.up.railway.app` (с протоколом). Redeploy frontend после изменения переменных.
2. **Failed to fetch** — API недоступен, проверьте `NEXT_PUBLIC_API_URL` и CORS
2. **Database connection** — `DATABASE_URL` корректен, БД запущена
3. **Redis connection** — `REDIS_URL` корректен
4. **WebSocket** — `NEXT_PUBLIC_WS_URL` использует `wss://` в production
