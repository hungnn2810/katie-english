# Phase 3: Teacher Dashboard - Context

**Gathered:** 2026-05-19 (updated; originally 2026-05-14)
**Status:** Ready for planning

<domain>
## Phase Boundary

**Original scope (plans 01–07, executed):** Add READING homework type end-to-end on the teacher side: dedicated creation page with multi-activity editor, unified type-picker entry point, edit/try modes, and result review with expandable per-item breakdown. Submission counts on homework list and detail pages. Backend adds READING type with reading activity schema, scoring, and result storage.

**New scope (plans 08+):** Upgrade all teacher web screens to shadcn/ui + Tailwind design system. Covers: TeacherShell redesign, Home Dashboard, Students CRUD, Classes CRUD, Homework list, Sessions list, and all detail pages. Add Reports page (simple stats). Standardize CRUD interactions with Dialog/AlertDialog/Form components. Add DataTable (TanStack Table) for list screens.

</domain>

<decisions>
## Implementation Decisions

### Reading Creation Flow (D-01–D-05, executed)
- **D-01:** Reading homework is created on a **dedicated page** (`/teacher/homework/create/reading`), not inside the existing HomeworkModal. The modal is too small for multi-activity composition.
- **D-02:** Entry point: the existing `+ Create` button opens a **type-picker modal** (Phonics / Speaking / Reading). Phonics and Speaking stay as before (inline HomeworkModal). Reading navigates to the dedicated creation page.
- **D-03:** After saving, teacher is redirected to `/teacher/homework` (homework list). No auto-open of AssignModal.
- **D-04:** Edit mode uses the **same creation page** with prefilled data, routed as `/teacher/homework/[id]/edit`. The Edit button on the homework list/detail page navigates there.
- **D-05:** Reading homework creation page has a **Try/Preview button** — same purpose as the Try button on phonics/speaking detail pages. Teacher sees the student experience (scored, not saved to DB).

### Reading Activity Editor (D-06–D-11, executed)
- **D-06:** Image-word matching pairs are **added dynamically** — teacher clicks "+ Add pair", uploads an image, types the word label. No fixed count. Minimum 2 pairs to save.
- **D-07:** Fill-in-blank input: teacher **writes the full sentence, then clicks/highlights individual words to mark them as blanks**. Selected words become answer slots; teacher then types 2–3 distractor options for each blank manually.
- **D-08:** Each blank has teacher-defined distractors (free-text input per blank, e.g. "dog, bird"). System does NOT auto-generate distractors.
- **D-09:** Activities within a reading homework are **reordered via drag-and-drop**. Use `@dnd-kit/core` (lightweight, no external CSS). Up/down arrows not sufficient for UX.
- **D-10:** Reading homework requires a **required name** field (same as phonics). Auto-focus on save validation.
- **D-11:** Image uploads for matching pairs reuse `uploadSpeakingImage()` from `frontend/lib/admin-api.ts` — same MinIO endpoint (`POST /homework/image`). No new backend upload route needed.

### Fill-in-Blank Storage Format (D-12, executed)
- **D-12 (Claude's discretion):** Store the sentence as a JSON segment array: `[{text: "The ", blank: false}, {text: "cat", blank: true, blankIndex: 0}, {text: " sits", blank: false}, ...]`. Each blank entry carries `correctWord` (the original word) and `distractors: string[]`. This is the canonical storage format — downstream agents must use it.

### Submission Count (D-13–D-14, executed)
- **D-13:** Y denominator = **total enrolled students across all classes in the assignment**. Backend change: update `assignmentInclude` in `backend/src/homework/homework.repository.ts` to include `class: { include: { _count: { select: { students: true } } } }` alongside the existing class include. Frontend sums `assignment.classes.reduce((sum, ac) => sum + (ac.class._count?.students ?? 0), 0)`.
- **D-14:** Submission count displayed in **two places**: (a) homework list page — per assignment card "N/M submitted"; (b) homework detail page — prominently + list of students who haven't submitted.

### Reading Session Results (D-15–D-18, executed)
- **D-15:** Session detail page shows reading results as **collapsible activity cards** — each activity shows its score (e.g. "Matching: 75%"), expandable to show per-item rows.
- **D-16:** Matching activity per-item row: image thumbnail + "student chose 'X'" + correct/wrong badge. Store `studentChosenWord` in `ReadingMatchingItemResult`.
- **D-17:** Fill-in-blank per-item row: sentence with blanks highlighted — student's chosen word shown inline (green if correct, red if wrong).
- **D-18:** Overall session score = **average of all activity scores** (unweighted). Consistent with how phonics/speaking store a single `score: Float` on `GameSession`.

### shadcn/ui Setup & Theme (new)
- **D-19:** Initialize shadcn/ui with **Zinc** base theme (`npx shadcn@latest init`).
- **D-20:** Brand colors from `frontend/lib/colors.ts` (blues `#4F9DFF`, purples, gradients) are **mapped to shadcn CSS variables** (`--primary`, `--accent`, etc.) in `frontend/app/globals.css`. All shadcn components use the brand palette automatically.
- **D-21:** **Light mode only** — no dark mode toggle. Dark sidebar is a deliberate design choice, not a theme state.
- **D-22:** **Pre-install core component set** in one step: `npx shadcn@latest add button input dialog alert-dialog sheet table card badge select label form tabs`. All components land in `frontend/components/ui/`.
- **D-23:** shadcn components path: **`frontend/components/ui/`** (standard convention). Hand-written components (`TeacherShell`, `PhonemeButton`, etc.) stay in `frontend/components/`.

### Sidebar & Shell Redesign (new)
- **D-24:** **Dark sidebar kept** — current dark gradient (`#0C1220 → #131E30`) in `TeacherShell.tsx` is preserved. Refactor internal markup to use shadcn structural primitives (e.g. `Button` for nav links, `Separator`) but keep visual style.
- **D-25:** **Fixed-width sidebar** (no collapsible). `w-64` stays. Desktop-only app (minWidth 1280px, Phase 04 D-01).
- **D-26:** **Page header bar kept** — white `<header>` with page title + subtitle above main content area. Refactor to use shadcn `Separator` and typography tokens.
- **D-27:** **Add Reports nav item** — new `/teacher/reports` page. Simple stats: total sessions completed, average score per class, homework completion rates. Read-only aggregation from existing DB data. Nav: `{ href: '/teacher/reports', label: 'Reports', icon: '📊' }`.

### CRUD Interaction Pattern (new)
- **D-28:** Create/Edit forms open in **shadcn `Dialog`** (replaces all custom modal components in Students, Classes, Homework pages).
- **D-29:** Delete confirmations use **shadcn `AlertDialog`** — blocking confirm with "Cancel" / "Delete" actions. Applied consistently across Students, Classes, Homework delete flows.
- **D-30:** Student creation form stays as **single scrollable `Dialog`** (no multi-step wizard). All fields (student details + parent info) in one dialog that scrolls vertically.
- **D-31:** Form validation uses **`react-hook-form` + `zod` + shadcn `Form`/`FormMessage`** — field-level error messages appear below invalid inputs. New deps: `react-hook-form`, `zod`, `@hookform/resolvers`.
- **D-32:** Student management consolidates in Students page using **shadcn `Tabs`** — three tabs: "Students" (CRUD list), "Pending Approvals", "Password Resets".

### Data Display Pattern (new)
- **D-33:** **Students list**: shadcn `DataTable` (TanStack Table via `@tanstack/react-table`). Columns: Name | Sex | DOB | Class | Actions. Sort by name/class. Filter by class (dropdown).
- **D-34:** **Classes list**: keep **shadcn `Card` grid**. Each class as a Card showing name, code, status `Badge`, schedule. Card layout suits small class counts.
- **D-35:** **Homework list**: shadcn `DataTable`. Columns: Name | Type | Status | Submitted | Due Date | Actions. Sort by date/type. Filter by type (Phonics/Speaking/Reading) and status (Open/Closed).
- **D-36:** **Sessions list**: shadcn `DataTable`. Columns: Student | Homework | Score | Type | Date. Sort by date/score. Filter by homework name or score range.
- **D-37:** All DataTables include **column sort + filter inputs** (not just sort). Filter UI: inputs/dropdowns above table columns, not a global search box.
- **D-38:** **Home Dashboard** layout: stat cards (Classes, Students, Homework counts using shadcn `Card`) + upcoming classes section (current) + recent 5 homework assignments with submission status.

### Reports Page (new)
- **D-39:** `/teacher/reports` page shows: (a) total sessions completed (all-time), (b) average score per class (grouped bar or simple table), (c) homework completion rates per assignment (N/M submitted). All data aggregated from existing `GameSession`, `HomeworkAssignment`, `Class` DB relations. No new backend endpoints needed — extend existing query helpers or add a dedicated `/reports/summary` GET endpoint.

### Claude's Discretion
- Drag-and-drop library: use `@dnd-kit/core` — already added (D-09/D-19 in Phase 2).
- Image thumbnail size in matching results: 40×40px, same as word images in phonics results.
- Empty-state display on DataTables: shadcn empty state pattern (centered message + icon).
- Reports page chart vs. table: use simple `shadcn Table` for score summaries (no charting library needed for MVP).
- TeacherShell internal refactor: replace inline `<button>` and `<a>` elements with shadcn `Button variant="ghost"` where appropriate, but keep the visual CSS the same.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Shell & Layout
- `frontend/components/TeacherShell.tsx` — shell to refactor with shadcn; preserve dark sidebar visual
- `frontend/app/teacher/page.tsx` — Home dashboard (stat cards + upcoming classes)

### CRUD Pages
- `frontend/app/teacher/students/page.tsx` — Student CRUD + pending approvals + password resets → migrate to Dialog/DataTable/Tabs
- `frontend/app/teacher/classes/page.tsx` — Class CRUD → migrate to Dialog/Card grid
- `frontend/app/teacher/homework/page.tsx` — Homework list + HomeworkModal + AssignModal → migrate to DataTable/Dialog
- `frontend/app/teacher/sessions/page.tsx` — Sessions list → migrate to DataTable

### Homework Detail Pages
- `frontend/app/teacher/homework/[id]/page.tsx` — Homework detail (submission count + non-submitted list)
- `frontend/app/teacher/homework/[id]/session/[sessionId]/page.tsx` — Session detail (reading results)
- `frontend/app/teacher/homework/create/reading/page.tsx` — Reading creation (already built, reskin only)
- `frontend/app/teacher/homework/[id]/edit/page.tsx` — Edit homework (already built, reskin only)

### Styling & API
- `frontend/lib/colors.ts` — brand color hex values to map into shadcn CSS vars (--primary, --accent)
- `frontend/lib/admin-api.ts` — API types and functions (unchanged — no backend changes for UI overhaul)
- `frontend/app/globals.css` — CSS variable definitions to update with brand colors

### Requirements
- `.planning/REQUIREMENTS.md` — READ-07, TEACH-01 through TEACH-05

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TeacherShell.tsx` — frame for all pages; preserve visual style, refactor internals
- `uploadSpeakingImage()` in `frontend/lib/admin-api.ts` — reuse for reading matching-pair image uploads
- `scoreColor()` / `scoreHex()` helpers in session detail page — reuse for DataTable score column rendering
- `frontend/lib/colors.ts` — hex values for `--primary` CSS var mapping (brand blue: `#4F9DFF`)

### Established Patterns
- All teacher pages wrap content in `<TeacherShell user={user} title="..." subtitle="...">` — this pattern stays
- Homework parts/words use Prisma nested create in `homework.repository.ts` — unchanged
- `HomeworkType` enum in schema + `admin-api.ts` — both already include `READING`
- `_count: { sessions: true }` on `AssignmentItem` already exists — `reports` page can reuse
- `gradients` / `colors` from `frontend/lib/colors.ts` currently used via inline `style={}` — will migrate to CSS vars

### Integration Points
- New page: `frontend/app/teacher/reports/page.tsx` — new Next.js route for Reports nav item
- shadcn init: `frontend/components/ui/` directory (created by `npx shadcn@latest init`)
- `frontend/app/globals.css` — add CSS variable overrides for brand colors after shadcn init
- New deps: `@tanstack/react-table`, `react-hook-form`, `zod`, `@hookform/resolvers`

</code_context>

<specifics>
## Specific Ideas

- Home dashboard stat cards: shadcn `Card` with icon (🏫 Classes, 👦 Students, 📚 Homework) + large number + label. Same 3-stat layout as current but restyled.
- Reports page: two sections — "Class Performance" (table: class name | avg score | sessions count) and "Homework Completion" (table: homework name | type | N/M submitted | %).
- DataTable filter UX: filter row sits inside the table header area, not as a separate toolbar above. Dropdown for categorical filters (Type, Class), text input for name search.
- Dialog forms: use shadcn `ScrollArea` inside Dialog for the student creation form so the dialog doesn't overflow the screen on short viewports.
- Status badges in Classes list: map `PENDING → yellow Badge`, `INPROGRESS → green Badge`, `ENDED → gray Badge` using shadcn `Badge variant="outline"` with custom color class.

</specifics>

<deferred>
## Deferred Ideas

- Student-side reading game UI — Phase 2 scope (READ-01 through READ-06)
- Auto-generated distractors for fill-in-blank — user chose manual input; revisit if teachers report it's too tedious
- Bulk assignment to all classes at once — not requested; TEACH-02 covers multi-select
- Reading analytics (score trends) — deferred; Reports page covers simple completion rates only
- Full analytics dashboard (charts, trends, export) — too large for this phase; future phase after UI overhaul

</deferred>

---

*Phase: 3-Teacher Dashboard*
*Context gathered: 2026-05-19 (updated from 2026-05-14)*
