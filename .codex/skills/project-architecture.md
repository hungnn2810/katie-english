# Project Architecture Quick Guide

High-level map for fast onboarding before making changes.

## Services

- `frontend/`: Next.js app for login, teacher, admin, and game flows.
- `backend/`: NestJS API with Prisma persistence and domain modules.
- `bfa-service/`: Python service for pronunciation/BFA analysis used by game scoring.

## Core flows

1. Auth/login handled in frontend + backend auth modules.
2. Teacher/admin CRUD flows go through backend domain modules and Prisma.
3. Game/session and homework evaluation call scoring logic; scoring may depend on BFA service.

## Data layer

- Prisma schema and migrations are source of truth for DB structure.
- Repository classes encapsulate DB access from services.

## Change strategy

1. Detect impacted route/module.
2. Trace API contract (frontend lib -> backend controller/DTO/service).
3. Validate test coverage in edited domain.
4. Re-check dependent flow (`auth`, `homework`, `game`) after changes.
