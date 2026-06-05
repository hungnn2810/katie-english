---
phase: 11-frontend-react-mui-refactor
plan: "02"
subsystem: frontend-ui-primitives
tags: [mui, components, ui-library, design-system]
dependency_graph:
  requires: [11-01]
  provides: [StatCard, HwTypeChip, PageHeader, TableShell]
  affects: [11-04, 11-05]
tech_stack:
  added: []
  patterns: [MUI-sx, lucide-react-icons, grid-layout]
key_files:
  created:
    - frontend/components/ui/StatCard.tsx
    - frontend/components/ui/HwTypeChip.tsx
    - frontend/components/ui/PageHeader.tsx
    - frontend/components/ui/TableShell.tsx
  modified: []
decisions:
  - "TableRow exported as named export from TableShell.tsx for colocation"
  - "HwTypeChip icon color forced via MuiChip-icon override to match chip text color"
  - "PageHeader breadcrumb uses inline separator for simplicity over MUI Breadcrumbs"
metrics:
  duration_minutes: 8
  completed: "2026-06-05T07:09:15Z"
  tasks_completed: 5
  files_created: 4
  files_modified: 0
---

# Phase 11 Plan 02: Shared UI Primitives Summary

Four MUI-based shared UI primitives created for reuse across Teacher (11-04) and Admin (11-05) portal refactors.

## What Was Built

**StatCard** — Stat display card with tinted icon well, hover lift animation, 30px/900 value typography, and 14px/500 label. Accepts `icon: LucideIcon`, `value`, `label`, `color`, `bgColor` props.

**HwTypeChip** — MUI Chip with per-homework-type color, background, and Lucide icon. Covers PHONICS (orange/hash), SPEAKING (pink/mic), VOCABULARY (violet/image), LISTEN (cyan/headphones), READING (green/book-open).

**PageHeader** — Page-level header with inline breadcrumb trail (12px, #64748B, separator), 26px/900 title, and optional 14px subtitle. Accepts `portal` as breadcrumb root.

**TableShell + TableRow** — Card-wrapped grid table. Header row at #F8FAFC with 11px/700/uppercase/#94A3B8 labels. `TableRow` helper provides 14px/22px padding data rows with bottom border (omitted on last row).

## Tasks Completed

| Task | Description | Status |
|------|-------------|--------|
| 1 | Create frontend/components/ui/ directory | Done |
| 2 | StatCard.tsx | Done |
| 3 | HwTypeChip.tsx | Done |
| 4 | PageHeader.tsx | Done |
| 5 | TableShell.tsx + TableRow | Done |
| 6 | Commit | Done — 719c3fa |

## Commits

| Hash | Message |
|------|---------|
| 719c3fa | feat(11-02): add shared UI primitives StatCard, HwTypeChip, PageHeader, TableShell |

## Deviations from Plan

None - plan executed exactly as written.

The only minor implementation note: `TableRow` is a named export from `TableShell.tsx` (not a separate file) for colocation — this matches the design reference pattern where `Row` lives alongside `TableShell` in the design kit.

## Known Stubs

None. All components are fully wired — they accept props and render design-spec-accurate output. No placeholder text or hardcoded empty values.

## Threat Flags

None. These are pure UI rendering components with no network endpoints, auth paths, or file access patterns.

## Self-Check: PASSED

Files exist:
- frontend/components/ui/StatCard.tsx: FOUND
- frontend/components/ui/HwTypeChip.tsx: FOUND
- frontend/components/ui/PageHeader.tsx: FOUND
- frontend/components/ui/TableShell.tsx: FOUND

Commit 719c3fa: FOUND
