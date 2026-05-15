---
plan_id: 01-03
phase: 01
status: complete
completed: 2026-05-15
commit: 5455c1d
---

# Plan 01-03 Summary: Wave 1 Housekeeping

## What Was Built

**D-22: MIME extension mapping fix** (`backend/src/bfa/bfa.service.ts`)
- Added `mimeToExt(mimeType: string): string` helper at module scope covering 7 MIME types: webm, m4a, mp4, quicktime→mov, ogg, aac, wav (default)
- Replaced duplicated inline ternary (`webm|mp4|wav` only) in both `align()` and `transcribe()` with `const ext = mimeToExt(mimeType)`
- Fixes iOS Quicktime / m4a extension hint passed to BFA service ffmpeg

**D-24: Stale Prisma migration cleanup**
- Removed 5 migration folders committed in the `up` commit that are superseded by `20260510000001_add_speaking_mode`:
  - `20260507000003_add_speaking_part`
  - `20260507000004_add_image_part`
  - `20260507000005_add_phonics_results`
  - `20260508000001_redesign_homework`
  - `20260509000001_homework_parts_words`
- `20260510000001_add_speaking_mode` remains as the source-of-truth migration

**Note on T-03 (commit untracked Phase 1 files):** All Phase 1 files listed in the plan (`game.controller.ts`, `game.dto.ts`, `game.repository.ts`, `game.service.spec.ts`, `class.repository.ts`, `image.controller.ts`, `teacher/page.tsx`, teacher homework detail `page.tsx`) were already tracked and clean in git (committed in the `up` commit 4c76384). No additional commit needed.

## Commits

- `5455c1d`: feat(01-03): D-22 MIME map + D-24 remove stale Prisma migrations

## Verification

- `grep -c 'function mimeToExt' backend/src/bfa/bfa.service.ts` → 1 ✓
- `grep -c 'const ext = mimeToExt(mimeType)' backend/src/bfa/bfa.service.ts` → 2 ✓
- `grep -c "mimeType.includes('quicktime')" backend/src/bfa/bfa.service.ts` → 1 ✓
- Old ternary (`webm ? ... : mp4 ? ...`) → 0 ✓
- 5 stale migration folders deleted ✓
- `20260510000001_add_speaking_mode` preserved ✓
- All T-03 files already tracked/clean (committed in prior `up` commit) ✓

## Decisions Closed

- **D-22**: MIME extension mapping — mimeToExt covers 7 MIME types, both BFA methods use it
- **D-24**: Stale migration folders removed; Prisma history matches committed source

## Self-Check: PASSED
