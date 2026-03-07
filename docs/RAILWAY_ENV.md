# Railway — переменные окружения

## Ошибка `ENOTFOUND host` или `[ioredis] Unhandled error event`

**Причина:** в `REDIS_URL` (или `DATABASE_URL`) указан placeholder вместо реального адреса.

### REDIS_URL — правильный формат

```
redis://default:PASSWORD@HOSTNAME:PORT
```

**Пример (Redis Cloud):**
```
redis://default:KCONFASUrqkGndMoy81yAsmZAZyGZSab@redis-17897.c52.us-east-1-4.ec2.cloud.redislabs.com:17897
```

❌ **Неправильно:**
- `redis://default:pass@host:17897` — "host" не заменить на реальный хост
- `redis-cli -u redis://...` — это команда, а не URL

✅ **Правильно:** скопировать полный URL из Redis Cloud → Configuration → Redis CLI.

### DATABASE_URL

Формат: `postgresql://user:password@HOST:5432/dbname`

Скопировать из Railway Postgres: Settings → Connect → Connection URL.

### MEILISEARCH_HOST

Формат: `https://xxx.fra.meilisearch.io` (без trailing slash)

Скопировать из Meilisearch Cloud → Project Settings → URL.
