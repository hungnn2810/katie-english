# Teacher Portal — UI Kit

High-fidelity recreation of the **Katie English** teacher web app (desktop-first,
≥1280px). Rebuilt from `frontend/components/TeacherShell.tsx` and
`frontend/app/teacher/*` in the source repo.

**Run:** open `index.html`.

## Components (`ui.jsx`)
- `TeacherShell` — fixed 240px dark navy sidebar (logo, grouped nav with active left-rail + accent tint), scrollable main with breadcrumb + 26px Black page title + avatar menu. Accepts `accent` / `portal` props (reused by the Admin kit).
- `Icon` — Lucide wrapper (2px stroke, per-instance sizing).
- `Btn` — contained (accent, opacity-0.9 hover) / outline / text.
- `Card` — white, 1px border, 16px radius, optional hover-lift.
- `Chip` — tinted pill (status / category).
- `Field` — MUI-style outlined input with floating label + accent focus.

## Screens (`screens.jsx`)
- **Dashboard** — pending-actions banner, 3 stat cards, upcoming classes, quick links.
- **Classes / Students / Homework** — table views (`TableShell` + `Row`), with student approval & homework-type chips.
- **Create Homework** — type picker (Phonics/Speaking/Vocabulary/Listen) + word-list builder (add/remove chips).
- **Sessions** — empty state.

Navigation is real click-through: sidebar items, quick links, and the Create-Homework
flow all change screens via React state.

## Accent
Teacher orange-red `#F0623A`. Category colors (mint/violet/pink/cyan) tag stat cards and
homework types. Copy is concise English, matching the codebase.
