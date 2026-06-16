# Phase 14: Game Responsive Layout - Context

**Gathered:** 2026-06-17
**Status:** Ready for planning
**Source:** User request — "trang http://localhost:3003/game/homework chưa responsive cho desktop, ipad, mobile"

<domain>
## Phase Boundary

Make every page under `/game/` route fully responsive across three breakpoints:
- **Mobile:** ≥320px (iPhone SE up through 767px)
- **Tablet/iPad:** 768px–1023px
- **Desktop:** ≥1024px

In scope: `layout.tsx`, `homework/page.tsx`, `login/page.tsx`, `session/[id]/page.tsx`, `reading/[id]/page.tsx`, `vocab/[id]/page.tsx`, `listen/[id]/page.tsx`.

Out of scope: teacher pages (`/teacher/`), admin pages (`/admin/`), landing page (`/marketing/`).

</domain>

<decisions>
## Implementation Decisions

### D-01: Breakpoint system — MUI theme breakpoints
Use MUI `sx` responsive object syntax (`{ xs: ..., sm: ..., md: ... }`) consistently. MUI theme defaults: xs=0px, sm=600px, md=900px, lg=1200px. Map to our targets: xs = mobile, sm = tablet, md = desktop.

### D-02: Desktop centering — maxWidth container on dark bg
On desktop (md+), all game page content sits in a centered `maxWidth: { sm: 600, md: 640 }` container with `mx: 'auto'`. The dark purple background fills 100vw. Do NOT wrap the layout background — only the content column gets maxWidth.

### D-03: Padding scale
- Mobile (xs): `px: 2` (16px)
- Tablet (sm): `px: 3` (24px)
- Desktop (md): `px: 4` (32px)

### D-04: Touch targets — 44px minimum
All buttons, chips, record buttons, and interactive elements must be `minHeight: 44, minWidth: 44` on mobile. MUI Button already meets this with `py: 1.5` or `size="large"`. Verify RecordButton size explicitly.

### D-05: Typography scale
- Page title (homework greeting "Chào, X!"): `fontSize: { xs: 24, sm: 28, md: 30 }`
- Card title / section heading: `fontSize: { xs: 15, sm: 16 }`
- Body text: `fontSize: { xs: 14, sm: 15 }`

### D-06: layout.tsx SVG background — viewport-relative coordinates
Replace hardcoded `cx="420"` with `cx="100%"` (or use a `<svg viewBox>` with `preserveAspectRatio`). The three concentric arcs on both sides should be drawn relative to viewport edges, not fixed pixel positions.

### D-07: Homework card list — single column, full width
Cards in the homework list remain single-column on all viewports. No grid. Desktop centering is handled by the maxWidth container in D-02.

### D-08: Reading game — match-pair grid
`MatchingActivity` currently uses a flex-wrap grid. On mobile (xs), image cards should be `width: { xs: '45%', sm: 120 }` to fit 2 columns. Word chips below fill available width with `flexWrap: 'wrap'`.

### D-09: Phonics/speaking session — camera/mic permission screen
The camera-check and mic-check screens should be centered with `maxWidth: 480, mx: 'auto'` and `px: 3`.

### D-10: Vocab game — image display
The vocabulary image should be `maxWidth: { xs: '90vw', sm: 320 }` and `maxHeight: { xs: '35vh', sm: 280 }` with `objectFit: 'contain'`.

### D-11: No minWidth constraints
Phase 4 had `minWidth: 1024` on the student page. That is NOW REMOVED. The layout should be fully fluid from 320px. Check and remove any `minWidth` hardcodes in game pages.

### D-12: Header — homework page
The GameHeader in `homework/page.tsx` should collapse the username label on xs (show only avatar initials) to prevent overflow. On sm+ show full name.

### Claude's Discretion
- Exact breakpoint cutoffs for individual components (can tune during execution)
- Whether to extract a shared `GamePageContainer` component or inline maxWidth/mx per page
- Phoneme chip wrap behavior on very narrow screens
- Timer SVG size on mobile (140×140 may be too large — can reduce to 110×110 on xs)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Game pages (all in scope)
- `frontend/app/game/layout.tsx` — shared background + ThemeProvider (SVG fix required)
- `frontend/app/game/homework/page.tsx` — homework list (primary responsive work)
- `frontend/app/game/login/page.tsx` — login (partially responsive, verify)
- `frontend/app/game/session/[id]/page.tsx` — phonics/speaking game
- `frontend/app/game/reading/[id]/page.tsx` — reading game (already has some xs/sm breakpoints)
- `frontend/app/game/vocab/[id]/page.tsx` — vocab image game
- `frontend/app/game/listen/[id]/page.tsx` — listen & answer game

### Shared components
- `frontend/app/game/session/[id]/_components/RecordButton.tsx` — check touch target size
- `frontend/app/game/session/[id]/_components/PhonemeChips.tsx` — check wrap on narrow screens

### Design system
- `frontend/lib/colors.ts` — gradients, color tokens
- `frontend/lib/student-theme.ts` — MUI student theme (breakpoints are MUI defaults)

</canonical_refs>

<specifics>
## Specific Ideas

- `layout.tsx` SVG: the right-side arcs use `cx="420"` which is fixed to ~420px wide viewport. Replace with a `<g>` translated via `translate(100%, 0)` or switch to `cx="100%"`. Left-side arcs use `cx="-30"` — keep as is.
- The homework `PageContent` outer `<Box>` has no container — add `<Box sx={{ maxWidth: { sm: 600, md: 640 }, mx: 'auto' }}>` around the header and main content.
- `login/page.tsx` already has `maxWidth: { sm: 440 }` and `alignItems: { sm: 'center' }` — likely just needs verification and minor touch-target fixes.
- RecordButton: check it renders as a large circular button (≥80px diameter on mobile).
- The purple `#2D0B2E` background in `layout.tsx` is fixed — keep it; it's already full-screen.

</specifics>

<deferred>
## Deferred Ideas

- Landscape mode optimization on phone (separate concern)
- PWA / add to home screen manifest
- Game-specific animations tuned per viewport
- Teacher pages responsive (separate phase if needed)

</deferred>

---

*Phase: 14-game-responsive*
*Context gathered: 2026-06-17 — direct analysis of game page source*
