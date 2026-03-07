# LOCUS Architecture

## System Overview

LOCUS is an AI-powered real estate marketplace that combines:

- short-term rentals
- long-term rentals
- property sales
- AI recommendations and ranking
- market analytics and forecasting

The platform is implemented as a modular monorepo with clear separation between frontend, backend domain modules, AI logic, and infrastructure services.

## Architecture Layers

### Frontend Layer

- Location: `apps/web`
- Framework: Next.js App Router
- Responsibilities:
  - user-facing pages (`/`, `/search`, `/listings/[id]`, `/profile`, `/messages`)
  - admin UI (`/admin/*`)
  - host analytics UI (`/host/*`)
  - client API integration through `services/*`
  - local state with Zustand (`store/app.store.ts`)

### API Layer

- Location: `apps/api/src/server/server.ts`
- Framework: Fastify
- Responsibilities:
  - route registration for all modules
  - global middleware and infra hooks
  - transport-level concerns (multipart, raw-body, compression, rate-limits, error handling)

### Domain Modules Layer

- Location: `apps/api/src/modules/*`
- Pattern: module -> controller -> service -> repository -> types
- Responsibilities:
  - business use-cases per bounded context (listings, bookings, messaging, payments, admin, growth, etc.)
  - validation, authorization, orchestration of domain operations

### Data Layer

- Database: PostgreSQL
- ORM: Prisma (`prisma/schema.prisma`)
- Responsibilities:
  - persistence of users, listings, bookings, messaging, reviews, payments
  - relational consistency via Prisma relations and indexes

### AI Layer

- Modules: `ai` and `ai-advanced`
- Responsibilities:
  - recommendations
  - AI-assisted search
  - ranking
  - embeddings
  - dynamic pricing, valuation, market analytics, demand forecasting

### Infrastructure Layer

- Module: `infrastructure`
- Responsibilities:
  - async jobs and workers (BullMQ)
  - Redis cache/session support
  - monitoring and health checks
  - structured logging and error tracking
  - global rate limiting
  - CDN URL adaptation for media delivery

## Technology Stack

### Frontend

- Next.js
- TypeScript
- Tailwind CSS

### Backend

- Node.js
- Fastify

### Database

- PostgreSQL
- Prisma

### Search

- Meilisearch

### Cache

- Redis

### Storage

- Cloudflare R2

### AI

- OpenAI API

## Core Modules

### listings

- Manages listing lifecycle: create, read, update, archive, publish.
- Integrates with listing media/images and amenities.

### listing-media

- Handles listing image upload, ordering, and media lifecycle.
- Queues image optimization jobs and stores processed media URLs.

### search

- Backend module: `apps/api/src/modules/search`.
- Provides fast filtered listing search over Meilisearch index.
- Supports pagination, sorting, geo radius filtering, and Redis-cached responses.

### bookings

- Handles availability checks, booking creation/approval/cancellation, calendar and pricing calculations.

### reviews

- Handles user reviews for listings after completed stays.
- Updates listing rating aggregates on new review creation.

### messaging

- Manages conversations/messages and realtime delivery with WebSocket gateway.

### payments

- Stripe payment intents, webhook processing, refunds, payout release flow.

### ai

- User behavior tracking, recommendations, ranking, embeddings, AI-assisted search.

### recommendations

- Dedicated personalized feed endpoint (`GET /recommendations`) backed by persisted `UserActivity` signals.
- Consumes user actions from listing views, searches, and booking creation.
- Uses Redis cache with fallback to trending and top-rated listings for cold-start users.

### security

- Auth extraction and role validation (`utils/auth.ts`, `plugins/roleGuard.ts`).
- Complemented by infra rate limiting and centralized error handling.

### admin

- Moderation and operations: users, listings, bookings, reports, analytics, audit.

### growth

- Product analytics events, funnels, trending searches, referral flow, SEO metadata and sitemap generation.

### infrastructure

- Queue/workers, cache, monitoring, logging, health checks, rate limits, compression, horizontal scalability foundations.

## Scalability Notes

- API services are stateless; stateful concerns (cache, queues, sessions, analytics events) are Redis-backed.
- Worker processes run independently from API (`apps/api/src/workers.ts`).
- Frontend and backend deployment targets are decoupled (Vercel + Railway).
