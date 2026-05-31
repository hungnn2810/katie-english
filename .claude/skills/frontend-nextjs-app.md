# Frontend Next.js App (Project Skill)

Use this when editing UI/UX, data fetching, routing, auth flow, and teacher/admin/game screens in `frontend/`.

## Scope

- App Router pages in `frontend/app/*`
- Shared components in `frontend/components/*`
- API/auth utilities in `frontend/lib/*`

## Workflow

1. Identify route segment and layout impact first (`app/*/layout.tsx`, page boundaries).
2. For data changes, update the matching `lib/*api*.ts` adapter and page usage together.
3. Keep role-based behavior consistent across `admin`, `teacher`, and `game` sections.
4. Reuse shared UI primitives from `components/ui/*` before creating new components.
5. Verify loading/error/empty states in each edited page.

## Conventions

- Keep page-level orchestration in route files; move reusable logic to components/lib.
- Avoid duplicating API contracts across pages.
- Preserve existing style system and utility usage.
- Keep client/server component boundaries explicit.

## Validation checklist

- Build: `cd frontend && npm run build`
- Lint (if configured): `cd frontend && npm run lint`
- Smoke test critical routes:
  - `/login`
  - `/admin/*`
  - `/teacher/*`
  - `/game/*`
