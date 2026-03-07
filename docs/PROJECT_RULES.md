# LOCUS Project Rules

## 1) Architecture philosophy

The LOCUS platform must be:

- Modular
- Scalable
- Production-ready
- Clean code
- No duplicated logic
- No unnecessary files

Core principles:

- Keep boundaries explicit between domain modules.
- Prefer composition over tight coupling.
- Keep each module independently testable and replaceable.
- Avoid hidden side effects and implicit cross-module dependencies.

## 2) Tech stack

### Frontend

- Next.js
- TypeScript
- Tailwind CSS

### Backend

- Node.js
- Fastify

### Database

- PostgreSQL

### ORM

- Prisma

### Cache

- Redis

### Search engine

- Meilisearch

### Storage

- Cloudflare R2

### AI

- OpenAI API

## 3) Repository architecture

Monorepo structure:

```text
/apps
  /web
  /api

/packages
  /ui
  /types
  /config

/prisma

/docs
```

## 4) Development rules

Cursor must strictly follow these rules.

### DO NOT

- Create random files
- Duplicate services
- Mix backend and frontend logic
- Change the architecture

### ALWAYS

- Keep modules isolated
- Use clean architecture
- Keep reusable code in `/packages`

Additional engineering constraints:

- Reuse shared types and config from `/packages` before introducing new abstractions.
- Keep infra and business logic separated.
- Keep naming consistent and explicit across modules.

## 5) Project goal

LOCUS is an AI-powered real estate platform that supports:

- Short-term rentals (Airbnb style)
- Long-term rentals (Cian style)
- Property sales
- Booking system
- AI recommendations
- Real estate analytics
