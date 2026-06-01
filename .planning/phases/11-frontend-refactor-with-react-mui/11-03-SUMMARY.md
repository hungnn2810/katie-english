---
phase: 11-frontend-refactor-with-react-mui
plan: 03
status: complete
completed_at: 2026-06-01
commit: acf3154
---

# Plan 11-03 Summary: Game Pages + Login MUI Migration

## What Was Done

Migrated all remaining student-facing pages from Tailwind `className=` to MUI `sx=` props. Zero `className=` attributes remain across the 5 owned files.

### Files Modified

| File | Changes |
|---|---|
| `frontend/app/game/page.tsx` | Full MUI migration — Box/Typography/Button/Alert/CircularProgress; removed all className= |
| `frontend/app/game/homework/page.tsx` | Full MUI migration — change-password modal → MUI Dialog/TextField; badges → MUI Chip; kept due-date ascending sort, Overdue/best-score badge logic |
| `frontend/app/game/session/[id]/page.tsx` | Visual-only migration — Box/Typography/Button/CircularProgress; VAD recording flow, /analyze, state machine UNCHANGED |
| `frontend/app/game/reading/[id]/page.tsx` | Completed migration of ErrorState, ResultsState, PlayingShell, MatchingActivityRenderer, FillBlankActivityRenderer; Typography import added |
| `frontend/app/login/page.tsx` | Raw `<input>`/`<button>` → MUI TextField/Button/Select; teacher/student toggle preserved; DatePicker + LocalizationProvider already present |

## Constraints Preserved (all verified)

- **`minWidth: 1024`** — present in reading/[id], session/[id] (results + playing views), homework, and login pages
- **`gradients.gameBg` / `gradients.gameBgAlt`** — imported from `@/lib/colors` on all game pages
- **`shake` keyframe** — imported from `@/lib/theme`, applied via `animation: \`${shake} 0.4s ease-in-out\`` on match images, word chips, and fill-blank wrong choices
- **No ThemeProvider added** — student theme applied by `app/game/layout.tsx` from plan 11-01
- **No `@/components/ui` imports** — zero remaining across all 5 files
- **DatePicker contract** — `onChange` converts `Date | null` → `YYYY-MM-DD` string into `reg.dateOfBirth`
- **Due-date ordering** — `parseApiDateTime` sort ascending preserved in homework page
- **VAD / recording logic** — untouched in session page (visual-only diff)

## Key Patterns Used

- `animate-shake` → `animation: \`${shake} 0.4s ease-in-out\`` (MUI keyframe from `@/lib/theme`)
- Loading spinners → `<CircularProgress size={48} sx={{ color: 'rgba(255,255,255,0.7)' }} />`
- Badges → `<Chip label=... size="small" sx={{ bgcolor, color }} />`
- Change-password modal → `<Dialog open={showPwModal} onClose={closePwModal} PaperProps={{ sx: { borderRadius: 4 } }}>`
- Role-picker cards → `Box component="button"` with `onMouseEnter`/`onMouseLeave` for border-color hover (preserves exact ACCENT/purple hover behavior)
- `<select>` → `<FormControl><InputLabel/><Select><MenuItem/></Select></FormControl>`

## Verification

```
# No @/components/ui imports in any game or login file
grep -rq '@/components/ui' frontend/app/game frontend/app/login → no matches

# minWidth preserved
grep 'minWidth: 1024' frontend/app/game/reading/[id]/page.tsx → 5 hits
grep 'minWidth: 1024' frontend/app/login/page.tsx → 1 hit

# shake preserved, no animate-shake
grep 'shake' frontend/app/game/reading/[id]/page.tsx → import + 3 usages
grep 'animate-shake' frontend/app/game → no matches

# Zero className= in all 5 files
grep 'className=' in game/**/*.tsx → 0 matches
grep 'className=' in login/page.tsx → 0 matches
```
