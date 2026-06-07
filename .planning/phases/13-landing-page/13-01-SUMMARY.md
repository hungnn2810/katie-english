---
phase: 13-landing-page
plan: "01"
subsystem: frontend/routing+seo
tags: [nextjs, middleware, seo, landing-page, routing, json-ld, sitemap, robots]
dependency_graph:
  requires: []
  provides: [marketing-route-at-katie-vn, seo-metadata, sitemap-robots, og-image]
  affects: [frontend/middleware.ts]
tech_stack:
  added: []
  patterns: [nextjs-route-groups, nextjs-metadata-api, json-ld-structured-data, nextjs-sitemap-robots]
key_files:
  created:
    - frontend/app/(marketing)/layout.tsx
    - frontend/app/(marketing)/page.tsx
    - frontend/app/sitemap.ts
    - frontend/app/robots.ts
    - frontend/public/og-image.jpg
  modified:
    - frontend/middleware.ts
decisions:
  - "Used NextResponse.rewrite to /marketing instead of redirect — allows transparent URL (katie.vn shows in browser, not /marketing)"
  - "Passthrough guards for /sitemap.xml and /robots.txt placed BEFORE rewrite so Next.js serves generated files directly"
  - "NEXT_PUBLIC_SUBDOMAIN=marketing returns 'root' so same root handler fires for local dev"
  - "Route group (marketing) with independent html/body root layout — required to set lang=vi without affecting other routes"
  - "og-image.jpg created with Node.js PNG encoder + macOS sips conversion (ImageMagick unavailable)"
metrics:
  duration: "~12 minutes"
  completed: "2026-06-07T16:35:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 5
  files_modified: 1
---

# Phase 13 Plan 01: Middleware Marketing Route + SEO Scaffold Summary

**One-liner:** Subdomain middleware rewrite to /marketing route group at katie.vn with full Next.js metadata API (OpenGraph, Twitter card, JSON-LD EducationalOrganization), sitemap.ts, robots.ts, and placeholder og-image.jpg.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend middleware to serve marketing route at katie.vn | 0a48dc1 | frontend/middleware.ts |
| 2 | Create marketing route group scaffold with SEO metadata and JSON-LD | d05e636 | frontend/app/(marketing)/layout.tsx, page.tsx, app/sitemap.ts, app/robots.ts, public/og-image.jpg |

## What Was Built

**Task 1 — middleware.ts:**
- Added `envSubdomain === 'marketing'` check (returns `'root'`) before existing env var checks, enabling `NEXT_PUBLIC_SUBDOMAIN=marketing` for local dev
- Replaced the `if (subdomain === 'root')` block's 301 redirect to app.katie.vn with a `NextResponse.rewrite` to `/marketing`
- Added passthrough guards: `pathname === '/sitemap.xml' || pathname === '/robots.txt'` returns `NextResponse.next()` before the rewrite, so Next.js serves generated sitemap/robots files directly
- All existing admin/app/student logic and SUBDOMAIN_CONFIG untouched

**Task 2 — Marketing route group:**
- `app/(marketing)/layout.tsx`: Independent root layout with `lang="vi"`, Inter font, MUI AppRouterCacheProvider + ThemeProvider(baseTheme) + CssBaseline. Exports `metadata` with title "Lớp Tiếng Anh Cô Katie | Dạy Tiếng Anh Trẻ Em", 156-char Vietnamese description, full OpenGraph (url, images, type: website), Twitter summary_large_image card, keywords array
- `app/(marketing)/page.tsx`: Server component with `<main>`, inline JSON-LD `<script type="application/ld+json">` containing EducationalOrganization schema (name, url, telephone placeholder, PostalAddress Hà Nội VN, description), placeholder MUI Box+Typography h1
- `app/sitemap.ts`: Next.js MetadataRoute.Sitemap returning single entry for https://katie.vn (monthly, priority 1)
- `app/robots.ts`: Next.js MetadataRoute.Robots disallowing /teacher, /admin, /game, /api; sitemap at https://katie.vn/sitemap.xml
- `public/og-image.jpg`: 1200x630 solid #4F9DFF JPEG (13 KB) created via Node.js PNG encoder + macOS `sips` JPEG conversion

## Verification Results

| Check | Result |
|-------|--------|
| `/sitemap.xml` and `/robots.txt` passthrough guards in middleware | PASS |
| `NextResponse.rewrite` to /marketing (not redirect) | PASS |
| `NEXT_PUBLIC_SUBDOMAIN=marketing` returns 'root' | PASS |
| layout.tsx exports metadata with correct title | PASS |
| layout.tsx renders `<html lang="vi">` | PASS |
| page.tsx contains `application/ld+json` script | PASS |
| page.tsx JSON-LD has `@type: EducationalOrganization` | PASS |
| sitemap.ts returns https://katie.vn entry | PASS |
| robots.ts disallows /teacher /admin /game /api | PASS |
| public/og-image.jpg exists, valid 1200x630 JPEG | PASS |
| admin/app/student SUBDOMAIN_CONFIG unchanged | PASS |
| TypeScript compiles clean (tsc --noEmit exits 0) | PASS |

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written with one process deviation:

**[Rule 3 - Tooling] og-image.jpg created via Node.js + sips instead of ImageMagick**
- **Found during:** Task 2
- **Issue:** ImageMagick (`convert`) not available; Python PIL not installed; ffmpeg not available
- **Fix:** Created PNG using Node.js zlib (raw IDAT encoding), converted to JPEG with macOS `sips` built-in
- **Result:** Valid 1200x630 JPEG at correct dimensions, identical color (#4F9DFF = RGB 79,157,255)
- **Files modified:** frontend/public/og-image.jpg

## Known Stubs

- `frontend/app/(marketing)/page.tsx`: Placeholder h1 "Lớp Tiếng Anh Cô Katie" only — full section content (Hero, Teacher Profile, Student Results, CTA) added in Plans 02 and 03
- `telephone: '+84-xxx-xxx-xxxx'` in JSON-LD: placeholder telephone number — real number to be filled in by cô Katie

## Threat Flags

None — no new trust boundaries introduced. The /marketing rewrite is fully public with no user input or auth-gated content (T-13-02 accepted per threat register).

## Self-Check: PASSED

All files exist on disk. Both task commits verified in git log.
