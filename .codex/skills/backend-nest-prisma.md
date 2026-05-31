# Backend NestJS + Prisma (Project Skill)

Use this when changing APIs, data models, auth, scoring logic, or admin/teacher/student features in `backend/`.

## Scope

- NestJS modules in `backend/src/*`
- Prisma schema and migrations in `backend/prisma/*`
- Domain areas: `auth`, `admin`, `game`, `homework`, `class`, `student`, `word`, `phoneme`, `quiz`

## Workflow

1. Locate touched module(s) and inspect DTO/controller/service/repository together.
2. For API changes, align request DTO, service logic, repository query, and controller response.
3. For schema changes, update `schema.prisma` then create migration under `backend/prisma/migrations`.
4. Check impact on auth guards and role boundaries (`auth/*`, `admin/*`).
5. Run backend tests relevant to edited modules.

## Conventions

- Keep controllers thin; business logic stays in services.
- Keep repositories focused on DB access only.
- Validate input via DTOs and explicit types.
- Preserve backward-compatible API shape unless change is intentional.

## Validation checklist

- Build: `cd backend && npm run build`
- Unit tests: `cd backend && npm test`
- Targeted specs for changed modules (for example `game`, `auth`, `admin`)
- If schema changed: verify migration SQL and seed compatibility
