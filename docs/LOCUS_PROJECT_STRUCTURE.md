# LOCUS Project Structure

## Monorepo Layout

```text
/
  apps/
    api/
    web/
  packages/
    ui/
    types/
    config/
  prisma/
    schema.prisma
  docs/
    PROJECT_RULES.md
    LOCUS_*.md
```

## `apps`

### `apps/api`

Backend Fastify application.

Primary structure:

- `src/index.ts` - API bootstrap
- `src/server/server.ts` - server creation and module registration
- `src/modules/*` - domain and platform modules
- `src/plugins/*` - reusable Fastify guards/plugins
- `src/utils/*` - auth and shared backend helpers
- `src/workers.ts` - async worker bootstrap (BullMQ workers)

### `apps/web`

Frontend Next.js App Router application.

Primary structure:

- `app/*` - route-based pages (public, admin, host)
- `components/*` - reusable page-level components
- `services/*` - API client wrappers by feature
- `hooks/*` - React hooks (auth hydration, etc.)
- `store/*` - Zustand app store
- `lib/api.ts` - shared API transport and client caching
- `types/*` - frontend feature types

## Backend Structure Details

Backend module pattern is consistent:

- `*.module.ts` - composition root for module dependencies and route registration
- `*.controller.ts` - HTTP/websocket route layer
- `*.service.ts` - business orchestration logic
- `*.repository.ts` - Prisma persistence/query layer
- `*.types.ts` - module DTOs/errors/contracts

Current key backend modules:

- `listings`
- `search`
- `listing-media`
- `amenities`
- `reviews`
- `listing-images`
- `bookings`
- `messaging`
- `payments`
- `ai`
- `ai-advanced`
- `recommendations`
- `admin`
- `growth`
- `infrastructure`

Security components:

- `utils/auth.ts`
- `plugins/roleGuard.ts`

## Frontend Structure Details

### Pages

Main routes in `app/`:

- `/` home
- `/search`
- `/listings/[id]`
- `/profile`
- `/messages`
- `/host/dashboard`
- `/host/analytics`
- `/admin`, `/admin/users`, `/admin/listings`, `/admin/bookings`, `/admin/reports`, `/admin/growth`

### Components

Examples:

- listing/search UI: `ListingCard`, `SearchFilters`, `SearchResults`, `MapView`, `ImageGallery`
- booking/payment UI: `BookingWidget`, `PaymentForm`, `PaymentStatus`
- messaging UI: `ConversationList`, `ChatWindow`
- access and navigation: `Header`, `AdminGuard`

### Hooks

- `useHydrateAuth.ts` for client auth hydration from local storage.

### Services

Feature clients:

- `listings.service.ts`
- `bookings.service.ts`
- `messages.service.ts`
- `favorites.service.ts`
- `payments.service.ts`
- `ai.service.ts`
- `ai-advanced.service.ts`
- `admin.service.ts`
- `growth.service.ts`

### Store

- `store/app.store.ts` holds auth/profile/favorites state.

## Shared Packages

### `packages/ui`

- reusable UI primitives (`Button`, `Card`, `Input`, `Modal`) consumed by frontend app.

### `packages/types`

- shared type package reserved for cross-app contracts.

### `packages/config`

- shared tooling config:
  - `tsconfig.base.json`
  - `eslint.config.js`

## `prisma`

- Central schema definition in `prisma/schema.prisma`.
- Shared by all backend modules using `@prisma/client`.

## `docs`

- Project-level architecture, rules, schema, and development guidance.
- Intended as primary onboarding reference for engineers and AI agents.
