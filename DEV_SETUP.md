# LOCUS — Запуск проекта для тестирования

## Требования

- **Node.js** 18+
- **pnpm** (установить: `npm i -g pnpm`)
- **Docker Desktop** (для Postgres, Redis, MeiliSearch)

## Быстрый старт

### 1. Установка зависимостей

```bash
pnpm install
```

### 2. Запуск инфраструктуры (Docker)

```bash
docker compose up -d
```

Поднимаются:
- PostgreSQL (порт 5432)
- Redis (порт 6379)
- MeiliSearch (порт 7700)

### 3. Миграции и сиды

```bash
pnpm exec prisma migrate deploy
pnpm seed
```

### 4. Запуск приложений

**Вариант A — всё сразу:**
```bash
pnpm dev
```
Запускает API и Web в параллели.

**Вариант B — по отдельности:**
```bash
# Терминал 1 — API
cd apps/api && pnpm dev

# Терминал 2 — Web
cd apps/web && pnpm dev

# Терминал 3 — Workers (очереди)
cd apps/api && pnpm workers
```

### 5. Доступ

- **Web:** http://localhost:3000
- **API:** http://localhost:3001

## Переменные окружения

Скопируйте `.env.example` в `.env` и настройте:

```bash
cp .env.example .env
```

Обязательно:
- `DATABASE_URL` — подключение к Postgres
- `REDIS_URL` — подключение к Redis
- `JWT_SECRET` — секрет для JWT
- `MEILISEARCH_HOST` — http://localhost:7700 (если MeiliSearch локально)
- `OPENAI_API_KEY` — для AI-функций (match, ai-search, moderation)

## Основные эндпоинты для проверки

| Эндпоинт | Описание |
|----------|----------|
| GET / | Главная |
| GET /search | Поиск объявлений |
| GET /recommendations | AI-рекомендации (без auth) |
| GET /match/recommendations | Match-рекомендации (требует auth) |
| POST /ai-search | AI-поиск |
| GET /listings | Список объявлений |
| POST /auth/register | Регистрация |
| POST /auth/login | Вход |
| GET /admin | Админ-панель (MODERATOR/ADMIN) |

## Админ-доступ

1. Зарегистрироваться через `/auth/register`
2. В БД изменить роль пользователя на `ADMIN` или `MODERATOR`:
   ```sql
   UPDATE "User" SET role = 'ADMIN' WHERE email = 'your@email.com';
   ```

## Скрипт для Windows (PowerShell)

```powershell
.\scripts\dev.ps1
```

Скрипт поднимает Docker, запускает миграции и выводит подсказки по запуску dev-серверов.
