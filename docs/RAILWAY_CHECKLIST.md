# Railway — чеклист переменных окружения

Если API не запускается или `/health` возвращает ошибку, проверь переменные в Railway.

## Pre-deploy зависает или падает

**Проблема:** Деплой застревает на «Running pre-deploy command...» (7+ минут).

**Решение:** Pre-deploy **удалён** — миграции запускаются в `start:railway` перед стартом сервера. В Railway Dashboard:
1. **Settings** → **Deploy** → **Pre-deploy Command** → удали команду (оставь пустым) или полностью убери настройку
2. Не указывай `prisma migrate deploy` в Pre-deploy — это вызывало зависание

`prisma` перенесён в `dependencies` (был в devDependencies), чтобы CLI был доступен при `pnpm install`.

## Обязательные (без них сервер падает)

| Переменная | Где взять | Пример |
|------------|-----------|--------|
| `DATABASE_URL` | Railway Postgres → Settings → Connect → DATABASE_URL (Reference) | `postgresql://postgres:xxx@postgres.railway.internal:5432/railway` |
| `REDIS_URL` | Redis Cloud → Configuration → Redis CLI (полный URL) | `redis://default:PASSWORD@redis-xxx.ec2.cloud.redislabs.com:17897` |
| `JWT_SECRET` | Сгенерировать: `openssl rand -base64 32` | минимум 32 символа |

## Важно: PORT

**НЕ добавляй PORT в Variables.** Railway задаёт его автоматически. Если добавлен вручную и возникает ошибка "PORT variable must be integer between 0 and 65535" — удали PORT из Variables. Возможная причина: trailing newline в значении (исправь через Raw editor или удали переменную).

## Опциональные (сервер запустится без них)

| Переменная | Назначение |
|------------|------------|
| `CORS_ORIGIN` | Origins для CORS. По умолчанию: `http://localhost:3000`, `https://locus-web-seven.vercel.app` |
| `MEILISEARCH_HOST` | Поиск. Meilisearch Cloud → URL |
| `MEILISEARCH_KEY` | Ключ Meilisearch |
| `OPENAI_API_KEY` | AI-функции |
| `YOOKASSA_SHOP_ID` | Оплата ЮKassa |
| `YOOKASSA_SECRET_KEY` | Оплата ЮKassa |
| `CLOUDFLARE_R2_*` или `STORAGE_*` | Загрузка изображений |

## Как добавить в Railway

1. **Railway** → проект **fantastic-solace** → сервис **@locus/api**
2. **Variables** → **+ New Variable**
3. Для Postgres: **Variable Reference** → выбрать `DATABASE_URL` из сервиса Postgres
4. Для Redis: вставить полный URL из Redis Cloud

## Redis: Eviction policy

Если в логах: **"Eviction policy is volatile-lru. It should be noeviction"** — BullMQ требует `maxmemory-policy: noeviction`.

**Redis Cloud:** Data Access Control → выбери базу → Edit database → Advanced → `maxmemory-policy` = `noeviction`.

**Или через redis-cli:**
```
CONFIG SET maxmemory-policy noeviction
```

Без этого очереди (email, уведомления, AI) могут терять задачи при нехватке памяти.

## Проверка после деплоя

1. https://locusapi-production.up.railway.app/health
2. Ожидаемый ответ: `{"status":"ok","service":"locus-api",...}`
3. Если `status: "degraded"` — в ответе будет поле `error` с причиной
