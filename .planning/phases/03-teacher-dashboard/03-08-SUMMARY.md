# Phase 3 Plan 08 — UI Redesign (Qurtuba-Inspired)

**Status:** Complete  
**Date:** 2026-05-20

## Goal

Upgrade teacher portal + login UI to match Qurtuba school dashboard design language: dark navy sidebar, orange accent, no gradients, no emoji, lucide icons throughout.

## Files Changed

### Design Tokens
- `frontend/lib/colors.ts` — added `teacherAccent: '#F0623A'`; `gameBg` changed to solid `#2563EB`; `cardGradients` updated to kid-friendly solid pairs

### Shell / Layout
- `frontend/components/TeacherShell.tsx` — full rewrite:
  - Sidebar: solid `#0C1220`, orange active indicator + bg (`#F0623A`)
  - Nav groups: unlabeled Dashboard + **GENERAL** (Classes, Students, Homework, Sessions)
  - Removed top header bar — breadcrumb + large bold title now rendered at top of content
  - User avatar (solid orange) top-right → dropdown with change-password + sign out

### Teacher Pages
- `frontend/app/teacher/page.tsx` — dashboard rewrite:
  - 3 stat cards: white bg, colored lucide icon, solid colored number, no gradients
  - 2-col body: Upcoming Classes list (left) + Quick Links panel (right)
- `frontend/app/teacher/classes/page.tsx` — classes page rewrite:
  - Cards: white bg, status-colored initials avatar, status badge
  - Schedule chips: orange solid
  - All buttons: solid orange CTA, no gradients
- `frontend/app/teacher/students/page.tsx` — students page rewrite:
  - All gradient buttons → solid (`#F0623A`, `#10B981`)
  - Sex toggles: `User` icon + text (no emoji)
  - Table: `User` icon for sex + parent, `Clock`/`KeyRound`/`Users` for sections
  - Empty state: `Users` icon container

### Login / Auth
- `frontend/app/login/page.tsx` — rewrite:
  - Left panel: solid `#0C1220` navy, no decorative blobs
  - "the fun way": solid orange (no gradient clip-text)
  - Role cards: `GraduationCap` (teacher) / `User` (student) — no emoji
  - All submit buttons: solid `#F0623A`

### Emoji Elimination (all 7 files via agent)
- `frontend/app/teacher/homework/page.tsx`
- `frontend/app/teacher/homework/[id]/page.tsx`
- `frontend/app/teacher/homework/[id]/session/[sessionId]/page.tsx`
- `frontend/app/teacher/homework/[id]/try/page.tsx`
- `frontend/app/teacher/homework/_components/ReadingCreationPage.tsx`
- `frontend/app/game/homework/page.tsx`
- `frontend/app/game/session/[id]/page.tsx`
- `frontend/app/game/reading/[id]/page.tsx`

**Mapping used:**
| Emoji | Icon |
|-------|------|
| 🔤 Phonics | `Hash` |
| 🎤 Speaking | `Mic` |
| 📖 Reading | `BookOpen` |
| 📚 empty | `BookOpen` / `Library` |
| ✓ correct | `Check` |
| ✗ wrong | `X` |
| ⏳ loading | `Loader2` (animate-spin) |
| ✅ success | `CheckCircle2` |
| 🔄 retry | `RefreshCw` |
| 🚀 start | `Play` |
| 🖼️ image | `ImageIcon` |
| 📁 file | `FolderOpen` / `Upload` |
| 🎉 celebrate | `PartyPopper` |
| 👁️ try/preview | Eye SVG |
| 🔑 key | `KeyRound` |
| 🏫 school | `School` |

## Design Principles Applied

1. **No gradients** on teacher portal UI — solid colors only
2. **Orange `#F0623A`** as teacher accent replacing blue `#4F9DFF`
3. **No emoji** in any rendered UI — lucide-react icons exclusively
4. **Qurtuba nav pattern** — section group label above nav items
5. **Large page title** in content area, not small fixed header bar
