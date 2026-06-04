---
phase: 11
slug: frontend-react-mui-refactor
status: planning
created: 2026-06-05
---

# Phase 11 — Frontend MUI Design System Refactor

## Goal

Bring all three portals (Student Game, Teacher, Admin) visually in line with the
Katie English Design System exported from Claude Design.

The design system lives at:
  `Katie English Design System/` (project root)

Key reference files:
| File | Purpose |
|------|---------|
| `Katie English Design System/README.md` | Product context, visual foundations, iconography rules |
| `Katie English Design System/colors_and_type.css` | Full token set — colors, gradients, radii, shadows, spacing |
| `Katie English Design System/ui_kits/student/ui.jsx` | Student primitives: Phone, GameHeader, KidButton, RecordButton |
| `Katie English Design System/ui_kits/student/screens.jsx` | Student screens: Login, HomeworkList, VocabSession, RecordSession, ListenSession, Results |
| `Katie English Design System/ui_kits/teacher/ui.jsx` | Teacher primitives: TeacherShell, Card, Chip, Btn, Field |
| `Katie English Design System/ui_kits/teacher/screens.jsx` | Teacher screens: Dashboard, Classes, Students, Homework, CreateHomework |
| `Katie English Design System/ui_kits/admin/ui.jsx` | Admin primitives: AdminShell, Table, MiniStat, Toolbar |
| `Katie English Design System/ui_kits/admin/screens.jsx` | Admin screens: Dashboard, Teachers, Students, Classes, HomeworkOverview |

## Stack

- Next.js 14 App Router
- MUI v9 (`@mui/material`) + Emotion
- lucide-react icons
- Inter font (Google Fonts)
- NO Tailwind (repo migrated to MUI)

## Three Portals

| Portal | Accent | Background | Shell |
|--------|--------|-----------|-------|
| Student Game | `#A78BFA` purple | `#2D0B2E` dark wine | No sidebar — mobile-first centered |
| Teacher | `#F0623A` orange-red | `#F7F9FC` light | 240px dark `#0C1220` sidebar |
| Admin | `#4F9DFF` blue | `#F7F9FC` light | 240px dark `#0C1220` sidebar |

## What Exists vs What Needs Work

All pages exist. The gap is visual fidelity — component styling, layout density,
color accuracy, and consistent use of design tokens.

The shells (TeacherShell.tsx, AdminShell.tsx) already have the right structure.
The MUI theme (lib/theme.ts, lib/student-theme.ts) already has the right base palette.

Phase 11 focuses on:
1. Tightening theme tokens (radii, shadows, typography weights/sizes)
2. Creating shared UI primitives (StatCard, TableShell, Chip patterns)
3. Updating each portal's pages to match the design kit layout and component usage

## Requirements

| ID | Description |
|----|-------------|
| DS-01 | MUI theme tokens match design system (colors, radii, shadows, typography) |
| DS-02 | Shared component library: StatCard, TableShell, PageHeader, HwTypeChip |
| DS-03 | Student portal: all screens match design kit (login, homework list, sessions, results) |
| DS-04 | Teacher portal: shell, dashboard, classes, students, homework, create homework |
| DS-05 | Admin portal: shell, dashboard, teachers, students, classes, homework overview |

## Plan Wave Structure

| Plan | Wave | Scope |
|------|------|-------|
| 11-01 | 1 | Theme token foundation — update theme.ts + student-theme.ts |
| 11-02 | 2 | Shared UI primitives — StatCard, TableShell, HwTypeChip, PageHeader |
| 11-03 | 3 | Student Game portal refactor (all screens) |
| 11-04 | 3 | Teacher portal refactor (shell + all pages) |
| 11-05 | 3 | Admin portal refactor (shell + all pages) |

Plans 11-03, 11-04, 11-05 run in parallel (wave 3) — no file conflicts.
