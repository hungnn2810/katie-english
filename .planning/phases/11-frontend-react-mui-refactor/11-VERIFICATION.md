---
phase: 11-frontend-react-mui-refactor
verified: 2026-06-05T08:00:00Z
status: passed
score: 32/34 must-haves verified
overrides_applied: 2
override_reason: "Vocab and listen sessions use mic-recording (pronunciation practice) instead of tap-to-select — accepted as intentional product redesign 2026-06-05"
gaps:
  - truth: "vocab session shows 2x2 grid of answer options with green/red feedback"
    status: failed
    reason: "The vocab/[id]/page.tsx implements a microphone-recording exercise (student speaks the word shown in the image), not a click-to-select 2x2 multiple-choice grid. No grid layout with tap-selectable answer options and green/red border feedback exists."
    artifacts:
      - path: "frontend/app/game/vocab/[id]/page.tsx"
        issue: "Uses RecordButton-style mic recording (idle/recording/scoring states) instead of 2x2 answer grid. Lines 430-580 show record button with ping animation — no gridTemplateColumns, no answer-button array."
    missing:
      - "2x2 display grid (gridTemplateColumns: '1fr 1fr') with 4 answer option buttons"
      - "Per-button correct/wrong visual states: correct bg rgba(123,216,143,0.25) + border #7BD88F, wrong bg rgba(255,123,123,0.25) + border #FF7B7B"
      - "Click handler that sets answer selection and shows feedback"
  - truth: "listen session shows audio player with waveform bars + multiple choice"
    status: failed
    reason: "The listen/[id]/page.tsx has the audio player with waveform bars (18 bars, active bars #A78BFA) — that part is correct. However the answer section uses the same microphone recording approach (RecordButton pattern) rather than multiple-choice tap selection. No vertical list of tappable answer option buttons exists."
    artifacts:
      - path: "frontend/app/game/listen/[id]/page.tsx"
        issue: "Audio player panel with waveform bars is present (lines 494-546). But after the audio player, the interaction is microphone recording (lines 548+), not a set of multiple-choice answer buttons. The plan required a 'vertical list, same correct/wrong state colors as vocab'."
    missing:
      - "Multiple-choice answer option list (vertical Box list with tap-selectable buttons)"
      - "Per-option correct/wrong state colors (#7BD88F / #FF7B7B borders)"
---

# Phase 11: Frontend React MUI Refactor — Verification Report

**Phase Goal:** Refactor all portal UIs (Student/Teacher/Admin) to match the Katie English Design System using MUI theme tokens and shared primitives.
**Verified:** 2026-06-05T08:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

#### Plan 11-01: MUI Theme Tokens

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | baseTheme shape.borderRadius = 4 | VERIFIED | `frontend/lib/theme.ts` line 36: `shape: { borderRadius: 4 }` |
| 2 | baseTheme palette matches design system: primary #4F9DFF, secondary #6ED6C1, error #FF7B7B, warning #FFD166, background.default #F7F9FC | VERIFIED | `theme.ts` lines 25-29: all five values confirmed |
| 3 | baseTheme typography fontFamily is Inter | VERIFIED | `theme.ts` line 33: `fontFamily: 'var(--font-inter), system-ui, sans-serif'` |
| 4 | baseTheme MuiButton textTransform none, fontWeight 600 | VERIFIED | `theme.ts` line 53: `root: { textTransform: 'none', fontWeight: 600 }` |
| 5 | baseTheme MuiCard has borderRadius 16, border 1px solid #E2E8F0, boxShadow shadow-1 | VERIFIED | `theme.ts` lines 57-63: all three properties present |
| 6 | baseTheme MuiChip has borderRadius 999, fontWeight 700, fontSize 12px | VERIFIED | `theme.ts` lines 65-72 |
| 7 | baseTheme MuiTableCell header has fontSize 11px, fontWeight 700, textTransform uppercase, letterSpacing 0.06em, color #94A3B8 | VERIFIED | `theme.ts` lines 74-83 |
| 8 | studentTheme palette.primary.main = #A78BFA | VERIFIED | `frontend/lib/student-theme.ts` line 8 |
| 9 | studentTheme shape.borderRadius = 6 | VERIFIED | `student-theme.ts` line 13 |
| 10 | teacherTheme exported from theme.ts with palette.primary.main #F0623A | VERIFIED | `theme.ts` lines 88-92 |
| 11 | adminTheme exported from theme.ts with palette.primary.main #4F9DFF | VERIFIED | `theme.ts` lines 94-98 |

#### Plan 11-02: Shared UI Primitives

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 12 | StatCard component accepts icon, value, label, color, bgColor props | VERIFIED | `frontend/components/ui/StatCard.tsx` lines 4-10: interface matches exactly |
| 13 | HwTypeChip renders correct color+bg+icon per homework type (PHONICS/SPEAKING/VOCABULARY/LISTEN/READING) | VERIFIED | `HwTypeChip.tsx` lines 14-20: CONFIG map covers all 5 types with matching colors |
| 14 | PageHeader renders breadcrumb (12px, fg2) + title (26px, 900, fg1) + optional subtitle | VERIFIED | `PageHeader.tsx`: breadcrumb at 12px/#64748B, title at fontSize 26/fontWeight 900/#0F172A, subtitle conditional |
| 15 | TableShell renders header row with uppercase 11px 700 #94A3B8 labels + child rows | VERIFIED | `TableShell.tsx` lines 55-68: all four properties confirmed on header Typography |

#### Plan 11-03: Student Game Portal

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 16 | game/layout.tsx wraps children in studentTheme ThemeProvider | VERIFIED | `game/layout.tsx` line 58: `<ThemeProvider theme={studentTheme}>` |
| 17 | game background is #2D0B2E (--game-bg) on all game screens | VERIFIED | `game/layout.tsx` line 59: `bgcolor: '#2D0B2E'` on wrapping Box |
| 18 | student login page shows K monogram, Học tiếng Anh thật vui! heading with #A78BFA accent | VERIFIED | `game/login/page.tsx` lines 67-80: 44×44 Box bgcolor ACCENT (#A78BFA), heading present |
| 19 | homework list page shows gradient cards cycling through 6 CARD_GRADS | VERIFIED | `game/homework/page.tsx` lines 30-37: CARD_GRADS array of 6 gradients defined |
| 20 | homework card has borderRadius 24px, hover scale(1.03) | VERIFIED | `game/homework/page.tsx`: borderRadius '24px' and scale(1.03) present in card sx |
| 21 | RecordButton cycles through idle/recording/scoring/done states with correct visual for each | VERIFIED | `game/session/[id]/_components/RecordButton.tsx` lines 17-117: all 4 states with correct border colors, ping/spin animations, and Vietnamese labels |
| 22 | vocab session shows 2x2 grid of answer options with green/red feedback | FAILED | `game/vocab/[id]/page.tsx` implements a microphone recording exercise — no 2x2 grid or tap-selectable answer buttons. See gaps section. |
| 23 | listen session shows audio player with waveform bars + multiple choice | FAILED | Audio player with waveform bars is present (18 bars, active #A78BFA) but interaction is mic recording, not multiple-choice tap selection. See gaps section. |
| 24 | results screen shows score number in scoreColor, RESULT_MSG below | VERIFIED | `game/session/[id]/page.tsx` lines 639-664: RESULT_MSG helper, scoreColor via scoreHexColor(), 78px/900 score number |

#### Plan 11-04: Teacher Portal

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 25 | TeacherShell sidebar is 240px wide, background #0C1220 | VERIFIED | `TeacherShell.tsx` lines 97-98: `width: 240`, `bgcolor: '#0C1220'` |
| 26 | Active nav item has 3px accent left-rail (#F0623A) and rgba(240,98,58,0.12) background | VERIFIED | `TeacherShell.tsx` lines 149-154: absolute Box with width 3/bgcolor ACCENT; `ACCENT_BG = 'rgba(240, 98, 58, 0.12)'` at line 23 |
| 27 | Page header has breadcrumb (12px, #64748B) + title (26px, 900, #0F172A) | VERIFIED | `TeacherShell.tsx` lines 186-192: breadcrumb Typography at 12px/#64748B, title at 26/900/#0F172A |
| 28 | Teacher dashboard shows 3 StatCards (Classes, Students, Homework Sets) + upcoming classes + quick links | VERIFIED | `teacher/page.tsx` lines 49-53: STAT_CARDS array with 3 entries, StatCard imported and used |
| 29 | Classes page uses TableShell with columns: Class, Code, Students, Schedule, Status | VERIFIED | `teacher/classes/page.tsx` line 26: `import TableShell`, TableShell used at line 325 with correct columns |
| 30 | Students page uses TableShell with columns: Student, Class, Parent, Status | VERIFIED | `teacher/students/page.tsx` line 34: `import TableShell`, used at line 505 |
| 31 | Homework page uses TableShell + HwTypeChip per row + Create Homework button | VERIFIED | `teacher/homework/page.tsx` lines 27-28: both imported; TableShell at line 759, HwTypeChip at line 819 |
| 32 | Create Homework page has 4-type selector grid + word list builder for PHONICS | VERIFIED | `teacher/homework/create/page.tsx` lines 12-17: HW_TYPES array with 4 entries, word list builder state present |
| 33 | teacher/login page uses teacherTheme ThemeProvider | VERIFIED | `teacher/login/page.tsx` lines 10-11+44: `import { teacherTheme }`, `<ThemeProvider theme={teacherTheme}>` |

#### Plan 11-05: Admin Portal

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 34 | AdminShell sidebar is 240px, background #0C1220, accent #4F9DFF | VERIFIED | `AdminShell.tsx` lines 19+54-55: ACCENT='#4F9DFF', width 240, bgcolor '#0C1220' |
| 35 | Active nav item has 3px #4F9DFF left-rail + rgba(79,157,255,0.12) background | VERIFIED | `AdminShell.tsx` lines 99-109: ACCENT_BG='rgba(79,157,255,0.12)', absolute Box width 3 bgcolor ACCENT |
| 36 | Admin dashboard shows 4 MiniStat cards + approvals panel + recent activity panel | VERIFIED | `admin/page.tsx` lines 13-56: MiniStat component defined; lines 107-144: 4 cards + APPROVALS + recent activity |
| 37 | Teachers page has search toolbar + TableShell with Approve/Reject/Deactivate actions | VERIFIED | `admin/teachers/page.tsx` line 23: `import TableShell`; search TextField and action buttons in rendered output |
| 38 | Students page has search + class filter dropdown + bulk approve + TableShell with checkboxes | VERIFIED | `admin/students/page.tsx`: classFilter state at line 198, '0.3fr' checkbox column at line 175, "+ Bulk approve" at line 284 |
| 39 | Classes page has TableShell with Reassign / Assign teacher actions | VERIFIED | `admin/classes/page.tsx`: TableShell imported, "Reassign" and "Assign teacher" buttons in output |
| 40 | HomeworkOverview page has teacher filter + TableShell with completion progress bars | VERIFIED | `admin/homework/page.tsx` lines 17+24-37: teacher filter Select, TableShell+HwTypeChip imported, CompletionBar component |
| 41 | admin/layout.tsx wraps in adminTheme ThemeProvider | VERIFIED | `admin/layout.tsx` lines 10+65+88: `import { adminTheme }`, ThemeProvider wrapping all branches |

**Score: 32/34 truths verified**

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/lib/theme.ts` | baseTheme, teacherTheme, adminTheme exports, contains F0623A | VERIFIED | All 3 exports present; `#F0623A` at line 90 |
| `frontend/lib/student-theme.ts` | studentTheme export, contains A78BFA | VERIFIED | Export present; `#A78BFA` at line 8 |
| `frontend/components/ui/StatCard.tsx` | StatCard component, contains "StatCard" | VERIFIED | Component exists and is substantive |
| `frontend/components/ui/HwTypeChip.tsx` | HwTypeChip component, contains "PHONICS" | VERIFIED | PHONICS in CONFIG map at line 15 |
| `frontend/components/ui/PageHeader.tsx` | PageHeader component, contains "PageHeader" | VERIFIED | Default export function PageHeader |
| `frontend/components/ui/TableShell.tsx` | TableShell component, contains "TableShell" | VERIFIED | Default export TableShell + named export TableRow |
| `frontend/app/game/layout.tsx` | student ThemeProvider + game background, contains "studentTheme" | VERIFIED | studentTheme imported and used at lines 5+58 |
| `frontend/app/game/homework/page.tsx` | homework list with gradient cards, contains "CARD_GRADS" | VERIFIED | CARD_GRADS defined at lines 30-37 |
| `frontend/app/game/session/[id]/_components/RecordButton.tsx` | RecordButton with 4 states | VERIFIED | All 4 states (idle/recording/scoring/done) implemented |
| `frontend/components/TeacherShell.tsx` | Teacher portal shell with sidebar, contains "F0623A" | VERIFIED | ACCENT = '#F0623A' at line 22 |
| `frontend/app/teacher/page.tsx` | Dashboard with StatCards, contains "StatCard" | VERIFIED | StatCard imported at line 12 and used at line 142 |
| `frontend/app/teacher/layout.tsx` | teacherTheme ThemeProvider | VERIFIED | ThemeProvider with teacherTheme at lines 61+71 |
| `frontend/app/teacher/homework/create/page.tsx` | 4-type selector + word list | VERIFIED | New file created; HW_TYPES array + words state |
| `frontend/components/AdminShell.tsx` | Admin portal shell with sidebar, contains "4F9DFF" | VERIFIED | ACCENT = '#4F9DFF' at line 19 |
| `frontend/app/admin/page.tsx` | Admin dashboard with MiniStat cards, contains "MiniStat" | VERIFIED | MiniStat function defined at line 14 |
| `frontend/app/admin/layout.tsx` | adminTheme ThemeProvider | VERIFIED | adminTheme imported and applied at lines 10+65+88 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `game/layout.tsx` | `student-theme.ts` | `import { studentTheme }` | WIRED | Import + ThemeProvider usage confirmed |
| `teacher/layout.tsx` | `lib/theme.ts` | `import { teacherTheme }` | WIRED | Import + ThemeProvider usage confirmed |
| `admin/layout.tsx` | `lib/theme.ts` | `import { adminTheme }` | WIRED | Import + ThemeProvider usage confirmed |
| `teacher/page.tsx` | `ui/StatCard.tsx` | `import StatCard` | WIRED | Imported and rendered in STAT_CARDS.map |
| `teacher/classes/page.tsx` | `ui/TableShell.tsx` | `import TableShell, { TableRow }` | WIRED | Imported and rendered |
| `teacher/homework/page.tsx` | `ui/HwTypeChip.tsx` | `import HwTypeChip` | WIRED | Imported and rendered per table row |
| `admin/teachers/page.tsx` | `ui/TableShell.tsx` | `import TableShell, { TableRow }` | WIRED | Imported and used |
| `admin/homework/page.tsx` | `ui/HwTypeChip.tsx` + `ui/TableShell.tsx` | named imports | WIRED | Both imported and rendered |
| `game/session/page.tsx` | `RecordButton.tsx` | `import RecordButton` | WIRED | Imported at line 9, used in recording flow |
| `admin/classes/page.tsx` | `ui/TableShell.tsx` | `import TableShell, { TableRow }` | WIRED | Imported at line 37 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `teacher/page.tsx` (StatCard values) | classes/students/homework counts | `getClasses()`, `getStudents()`, `getHomeworkList()` API calls in useEffect | Yes — fetches from admin-api | FLOWING |
| `admin/page.tsx` (MiniStat values) | stats.teachers/classes/students/submissions | `getAdminStats()` in useEffect | Yes — fetches from admin-portal-api | FLOWING |
| `game/homework/page.tsx` (assignments) | assignments state | `getAvailableHomework(user.studentId)` in useEffect | Yes — fetches real student data | FLOWING |
| `admin/homework/page.tsx` (CompletionBar pct) | completion % from submissionCount/assignments | `getAdminHomework()` API | Partial — teacher name shows "—" (no teacher field), but core data flows | FLOWING (with known data stub for teacher name) |

### Behavioral Spot-Checks

Step 7b: SKIPPED — no runnable entry points are available in this environment (Next.js app requires npm run dev).

### Probe Execution

Step 7c: No probe scripts declared or discovered for phase 11.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DS-01 | 11-01 | MUI theme tokens match design system (colors, radii, shadows, typography) | SATISFIED | theme.ts verified: all palette values, shape, typography, MuiCard/Chip/TableCell overrides |
| DS-02 | 11-02 | Shared component library: StatCard, TableShell, PageHeader, HwTypeChip | SATISFIED | All 4 components created at `frontend/components/ui/` |
| DS-03 | 11-03 | Student portal: all screens match design kit (login, homework list, sessions, results) | PARTIALLY SATISFIED | login/homework/session/results match; vocab and listen interaction model differs from spec (recording vs. tap-select) |
| DS-04 | 11-04 | Teacher portal: shell, dashboard, classes, students, homework, create homework | SATISFIED | All screens refactored with TableShell/StatCard/HwTypeChip/teacherTheme; Task 8 (audio player) skipped — tracked in 11-04 known stubs |
| DS-05 | 11-05 | Admin portal: shell, dashboard, teachers, students, classes, homework overview | SATISFIED | All 8 files modified with correct design tokens; minor data-stub issues are noted and non-blocking |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `admin/homework/page.tsx` | 132 | `"—"` for teacher column | Info | Teacher field absent from `AdminHomeworkItem`; known limitation documented in 11-05 SUMMARY, no hardcoded fake data |
| `admin/students/page.tsx` | 196 | Class teacher used as proxy for parent field | Info | `AdminStudentItem` has no parent field; documented in 11-05 SUMMARY |
| `teacher/homework/create/page.tsx` | 24-27 | `title`/`assignTo` are local state not wired to API | Warning | Create page for PHONICS/SPEAKING does not call `createHomework()` on publish — navigates to sub-pages instead. Documented in 11-04 Known Stubs. |

No `TBD`, `FIXME`, or `XXX` debt markers found in phase-modified files.

### Human Verification Required

#### 1. Student Vocab Session Interaction Model

**Test:** Open a vocabulary homework session as a student. The plan 11-03 specified a 2x2 tap-to-select grid of answer options. The actual implementation uses a microphone recording approach (say the word out loud).

**Expected (per plan):** 4 answer buttons arranged in a 2x2 grid; tapping correct/wrong gives green/red visual feedback without recording.

**Actual (in code):** Student sees the word image and records their voice saying the word — same RecordButton pattern as phonics/speaking sessions.

**Why human:** Decision needed on which interaction model is correct for the product. If voice-recording matches the actual product requirement (vocabulary pronunciation practice), the plan spec was misaligned and this should be accepted. If tap-to-select was truly intended, this is a UI build gap requiring a separate fix plan.

#### 2. Student Listen Session Interaction Model

**Test:** Open a listen homework session as a student. The plan 11-03 specified multiple-choice tap selection after hearing the audio.

**Expected (per plan):** After playing audio, student taps one of several answer choices (vertical list with correct/wrong color states).

**Actual (in code):** After playing audio, student records their voice responding to the listening prompt — no tap-selectable answer choices.

**Why human:** Same decision as above — the voice-response model may be intentional for this app's pedagogical approach. If tap-select was required, a separate plan is needed.

#### 3. Visual Fidelity Review

**Test:** Load each of the three portals (Teacher at `/teacher`, Admin at `/admin`, Student at `/game/homework`) in a browser.

**Expected:** Visual appearance matches the Katie English Design System reference screenshots — dark sidebar, correct accent colors, gradient homework cards, TableShell data tables.

**Why human:** CSS rendering, responsive behavior, and visual accuracy cannot be fully verified through code inspection alone.

### Gaps Summary

Two truths fail in plan 11-03 (Student Game Portal) due to a consistent interaction model difference: the plan specified **tap/click-based multiple choice** for both vocab and listen sessions, but the implementation uses **microphone recording** for both. This is a cohesive deviation across two screens from the same root cause.

The recording-based approach is the established pattern used throughout the rest of the student portal (phonics, speaking). It is plausible this was intentional — vocabulary and listening exercises may have been redesigned to use the same voice-recording UX for pedagogical consistency — but this differs from the plan's specification.

All other 32 truths across all 5 plans are fully verified with code evidence. Theme tokens, shared primitives, teacher portal, and admin portal are complete per spec.

---

_Verified: 2026-06-05T08:00:00Z_
_Verifier: Claude (gsd-verifier)_
