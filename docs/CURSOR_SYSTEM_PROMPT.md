# CURSOR System Prompt for LOCUS

## Purpose

This document defines mandatory behavior for any AI coding agent working in the LOCUS codebase.
It is a control prompt that enforces architecture understanding, safe implementation, and consistent development workflow.

## 1) AI Initialization Rule (Mandatory)

Before writing or editing any code, the AI agent must read and analyze:

- `docs/PROJECT_RULES.md`
- `docs/LOCUS_ARCHITECTURE.md`
- `docs/LOCUS_DATABASE_SCHEMA.md`
- `docs/LOCUS_PROJECT_STRUCTURE.md`
- `docs/LOCUS_AI_ARCHITECTURE.md`
- `docs/LOCUS_DEVELOPMENT_GUIDE.md`

No implementation is allowed before this context is loaded.

## 2) Required Development Workflow

Every task must follow this order:

1. analyze architecture
2. analyze database schema
3. analyze existing modules
4. design solution
5. implement code
6. verify architecture compatibility
7. update documentation if needed

The AI must not skip steps.

## 3) Module Creation Rules

The AI must never:

- create random folders
- duplicate modules with overlapping responsibility
- place business logic in controllers
- create modules outside the defined architecture
- modify database structure without documentation update
- mix frontend and backend logic

All new modules must respect existing monorepo boundaries and module patterns.

## 4) Database Safety Rule

`prisma/schema.prisma` is the single source of truth.

The AI must:

- never delete models without migration
- never rename models without schema and usage updates
- never break foreign key relationships
- preserve index-aware query paths
- follow Prisma migration workflow for all schema changes

## 5) Service Architecture Rule

All business logic must be implemented in services.

Controllers may only:

- validate input
- call services
- return responses

Controllers must not contain domain calculations or direct persistence orchestration.

## 6) Repository Rule

All database queries must be isolated in repositories.

Repositories:

- interact with Prisma
- provide persistence methods for services
- avoid transport concerns (HTTP/WebSocket parsing)

No direct database queries may appear in controllers or services.

## 7) Frontend Rule

Frontend must:

- use API services for backend communication (`apps/web/services/*`)
- avoid business logic inside UI components/pages
- reuse shared components from `packages/ui` when possible

State and side-effects should remain in hooks/services/store, not in low-level presentational components.

## 8) AI Module Rule

AI services must:

- never block API requests with heavy computation
- run expensive tasks via background jobs/workers
- use caching when possible (Redis/in-memory fallback)

AI logic belongs to `ai` or `ai-advanced` modules unless architecture docs are explicitly updated.

## 9) Performance Rule

The AI must always evaluate performance impact and prefer:

- Redis caching
- asynchronous search indexing
- background queues/workers for heavy tasks

Avoid synchronous heavy operations in request-response paths.

## 10) Security Rule

All APIs must include:

- input validation
- role/ownership checks where applicable
- rate limiting enforcement

Security checks are required even for internal/admin endpoints.

Mandatory controls include:

- authentication
- authorization
- rate limiting
- input validation

## 11) Documentation Update Rule

If architecture or schema behavior changes, the AI must update documentation in the same task.

Minimum required updates:

- `docs/LOCUS_ARCHITECTURE.md`
- `docs/LOCUS_DATABASE_SCHEMA.md`

If needed, also update:

- `docs/LOCUS_PROJECT_STRUCTURE.md`
- `docs/LOCUS_AI_ARCHITECTURE.md`
- `docs/LOCUS_DEVELOPMENT_GUIDE.md`

## 12) Debugging Rule

When errors occur, the AI must debug in this order:

1. API layer
2. service layer
3. repository layer
4. database schema
5. infrastructure services

The AI must fix root causes, not only symptoms.

## 13) Compliance Requirement

If a task conflicts with these rules, the AI must:

- stop implementation
- surface the conflict clearly
- propose a compliant path

These rules are mandatory for all future LOCUS development tasks.
