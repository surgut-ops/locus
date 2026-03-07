# LOCUS Development Guide

## Purpose

This guide defines how contributors should implement changes in LOCUS while preserving architecture quality, scalability, and maintainability.

## Core Engineering Rules

- Always follow `docs/PROJECT_RULES.md`.
- Never break module boundaries.
- Never duplicate module responsibilities.
- Keep infrastructure and business logic separate.
- Prefer explicit composition over hidden coupling.

## Required Implementation Principles

### 1. Follow Existing Architecture

- Add features inside correct bounded module.
- Reuse current controller/service/repository/type pattern.
- Register new modules in server bootstrap only through module entry points.

### 2. Do Not Create Duplicate Modules

- Before adding a new module, verify capability does not already exist in:
  - `apps/api/src/modules/*`
  - `apps/web/services/*`
  - `packages/*`
- Extend existing modules when responsibility already matches.

### 3. Always Use Services

- Controllers should only parse input, enforce auth, and return responses.
- Business rules belong in service layer.
- Persistence access belongs in repository layer.

### 4. Always Validate Inputs

- Validate all route params, query, and body payloads.
- Return clear 4xx errors for invalid input.
- Never trust client-side values for pricing, role, or security-sensitive operations.

### 5. Always Follow Database Schema

- Use Prisma models and relationships as source of truth.
- Do not bypass relationship constraints in code.
- Keep index-aware query design (city, ownerId, booking/listing/user access paths).

## Backend Development Workflow

- Add/extend module files under `apps/api/src/modules/<module>`.
- Keep files focused:
  - `*.module.ts`: wiring
  - `*.controller.ts`: transport
  - `*.service.ts`: business
  - `*.repository.ts`: Prisma
  - `*.types.ts`: contracts/errors
- Use `utils/auth.ts` and `plugins/roleGuard.ts` for auth/RBAC.
- For async/non-blocking tasks, use infrastructure queues/workers.

## Frontend Development Workflow

- Pages belong in `apps/web/app/*`.
- API interaction belongs in `apps/web/services/*`.
- Shared state belongs in `apps/web/store/*`.
- Prefer reusable presentational pieces in `apps/web/components/*`.
- Promote reusable primitives to `packages/ui` when shared broadly.

## AI and Analytics Features

- Track new product events through growth analytics endpoints.
- For expensive AI workloads, use async queue and Redis caching.
- Keep AI logic in `ai` or `ai-advanced`, not inside unrelated modules.

## Security and Compliance Checklist

For every backend endpoint:

- authentication check (if needed)
- authorization check (ownership or role)
- payload validation
- predictable error mapping
- no secret leakage in logs

For critical operations:

- verify server-side amounts/prices/status transitions
- treat webhook and callback payloads as untrusted until validated

## Performance Checklist

- Use Redis cache for repeated heavy reads.
- Move non-blocking heavy jobs to workers.
- Keep endpoint responses small and explicit.
- Reuse existing indexes and avoid N+1 query patterns.

## Documentation Expectations

Any major feature change should be reflected in `docs/`:

- architecture updates
- schema impact
- module responsibilities
- operational behavior (queues, workers, monitoring)

This keeps LOCUS understandable for both developers and AI agents.
