---
plan: 14-01
phase: 14-game-responsive
status: completed
completed: 2026-06-17
---

# Plan 14-01 Summary: Layout SVG + Homework Page Responsive

## What was done

**Task 1 — layout.tsx SVG fix (D-06):**
- Replaced the three right-side `<circle cx="420" ...>` elements with a `<g transform="translate(100%, 320)">` group
- Each circle now uses `cx="0" cy="0"` — anchored to the right viewport edge at any screen width
- Left-side arcs (`cx="-30" cy="320"`) unchanged

**Task 2 — homework/page.tsx responsive (D-01 through D-12):**
- Added `<Box sx={{ maxWidth: { sm: 600, md: 640 }, mx: 'auto', width: '100%' }}>` wrapper around header + main
- Header padding: `px: '18px', py: '14px'` → `px: { xs: 2, sm: 3, md: 4 }, py: { xs: 1.75, sm: 2 }`
- Username Typography: added `display: { xs: 'none', sm: 'block' }` — collapses to initials on mobile
- Lock button: `py: 0.75` → `py: { xs: 1.25, sm: 0.75 }`, added `minHeight: 44`
- Logout button: same touch target fix
- Main padding: `px: '18px', pb: '30px'` → `px: { xs: 2, sm: 3, md: 4 }, pb: { xs: 4, sm: 5 }`
- Greeting: `fontSize: 30` → `fontSize: { xs: 24, sm: 28, md: 30 }`
- Sub-heading: `fontSize: 15` → `fontSize: { xs: 14, sm: 15 }`
- Card list remains single-column (no change needed)
- No `minWidth` viewport constraints found

## Verification
- `npx tsc --noEmit` — zero errors
