# Admin Portal — UI Kit

High-fidelity recreation of the **Katie English** school-admin web app (desktop-first,
data-dense). Rebuilt from `frontend/components/AdminShell.tsx` and `frontend/app/admin/*`.

**Run:** open `index.html`.

## Components (`ui.jsx`)
- `AdminShell` — same dark navy sidebar as the Teacher kit but with the **blue** accent (`#4F9DFF`) and the admin nav (Dashboard · Teachers · Classes · Students · Homework). Header uses a slightly lighter 24px/700 title to read as "tool, not app".
- `Icon`, `Btn` (contained / outline / text, plus a `danger` red variant), `Card`, `Chip`.

## Screens (`screens.jsx`)
- **Dashboard** — 4 compact `MiniStat` tiles + Approvals-pending list + Recent-activity feed.
- **Teachers** — list with **approve / reject / deactivate / reactivate** actions and status chips.
- **Students** — search + **class filter** + **bulk approve**, checkbox column.
- **Classes** — assign / reassign teacher.
- **Homework overview** — **cross-teacher** view with per-homework completion bars.

All screens share a `Toolbar` (search + filters/actions) and a single `Table` primitive,
keeping the admin surface deliberately denser and quieter than the teacher portal.

## Accent
Admin blue `#4F9DFF`. Data-dense layout, neutral chips, English copy — matching the codebase.
