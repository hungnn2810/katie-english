# Phase 16: Teacher/Admin UI Redesign - Context

**Gathered:** 2026-06-21
**Status:** Ready for planning
**Source:** User directive + HeyWordVocab reference design

<domain>
## Phase Boundary

Toàn bộ giao diện Teacher portal (TeacherShell + tất cả teacher pages) và Admin portal (AdminShell + tất cả admin pages) được redesign theo phong cách modern, lấy cảm hứng từ heywordvocab.com/library.

**Không bao gồm:**
- Game/student pages (/game/*)
- Backend API thay đổi
- Schema database
- Landing page (Phase 13)

</domain>

<decisions>
## Implementation Decisions

### D-01: Sidebar — Light không Dark
- TeacherShell sidebar đổi từ dark (#0C1220) sang **white (#FFFFFF) / surface (#F8FAFC)**
- Border phân cách dùng `1px solid #E2E8F0`
- Logo "K" bubble dùng blue accent, không còn orange

### D-02: Màu accent — Blue Modern thay Orange
- Primary: `#3B82F6` (blue-500)
- Dark: `#2563EB` (blue-600)
- Background tint: `#EFF6FF` (blue-50)
- Text accent: `#1D4ED8` (blue-700)
- Các chỗ hiện dùng `#F0623A` (ACCENT orange) đều đổi sang `#3B82F6`
- Biến `ACCENT` trong TeacherShell, AdminShell, teacher pages, admin pages đều cập nhật

### D-03: Homework Page — Card Grid thay Pure Table
- Layout: `display: grid`, 3 cột trên desktop (≥1280px), 2 cột tablet, 1 cột mobile
- Mỗi card:
  - Header: type chip màu (giữ nguyên màu per-type: Phonics purple, Speaking pink, etc.)
  - Title: tên homework, font weight 700
  - Meta row: class names, due date badge (overdue = red)
  - Footer: progress bar "submitted/total" + action icons (assign, edit, preview, delete)
  - Hover: subtle shadow elevation
- Vẫn giữ filter tabs phía trên + search

### D-04: Filter Tabs — Pill Style với Count Badge
- Thay `Button` outlined thành pill tabs: nền transparent khi inactive, blue-50 khi active
- Count badge: số tròn nhỏ bên phải label (ví dụ: "Phonics ·5")
- Tab "All" active mặc định, highlight blue

### D-05: Teacher Dashboard — 3-Zone Layout
- Zone 1 (top): 3 stat cards — classes, students, homework — mỗi card có icon gradient
- Zone 2 (mid): 2 cột — "Upcoming Classes" (2fr) + "Quick Actions" (1fr)
- Quick action tiles: dùng icon + label + mô tả ngắn, hover highlight blue-50
- Pending actions banner (nếu có) giữ nguyên logic, chỉ update màu sang blue

### D-06: AdminShell — Đồng bộ với TeacherShell
- Cùng light sidebar structure
- Accent màu xanh nhưng để phân biệt admin/teacher có thể dùng indigo (#6366F1) cho admin, blue (#3B82F6) cho teacher
- Cả hai đều light sidebar, không còn dark

### D-07: Colors File Update
- `frontend/lib/colors.ts` cập nhật:
  - `teacherAccent` → `#3B82F6`
  - `adminAccent` → `#6366F1` (indigo cho admin)
  - Thêm `teacherAccentBg` → `#EFF6FF`
  - Thêm `adminAccentBg` → `#EEF2FF`

### D-08: Không đổi Student/Game pages
- Tất cả `/game/*` pages giữ nguyên dark purple theme
- Chỉ teacher portal và admin portal thay đổi

### Claude's Discretion
- Spacing, border-radius cụ thể trong cards (giữ trend hiện tại: borderRadius 12-16px)
- Skeleton loading states trong card grid
- Animation/transition nhẹ khi hover card
- Exact shadow values cho card elevation

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Core files cần modify
- `frontend/components/TeacherShell.tsx` — sidebar + header teacher portal
- `frontend/components/AdminShell.tsx` — sidebar + header admin portal
- `frontend/lib/colors.ts` — color system (source of truth)
- `frontend/app/teacher/page.tsx` — teacher dashboard
- `frontend/app/teacher/homework/page.tsx` — homework list + create
- `frontend/app/admin/layout.tsx` — admin layout wrapper
- `frontend/app/teacher/layout.tsx` — teacher layout wrapper

### Pages cần đồng bộ màu accent
- `frontend/app/teacher/classes/page.tsx`
- `frontend/app/teacher/students/page.tsx`
- `frontend/app/teacher/sessions/page.tsx`
- `frontend/app/teacher/tuition/page.tsx`
- `frontend/app/admin/teachers/page.tsx`
- `frontend/app/admin/classes/page.tsx`
- `frontend/app/admin/students/page.tsx`
- `frontend/app/admin/homework/page.tsx`
- `frontend/app/admin/page.tsx`

### Shared components
- `frontend/components/ui/StatCard.tsx` — stat card component
- `frontend/components/ui/TableShell.tsx` — table wrapper
- `frontend/components/ui/HwTypeChip.tsx` — homework type chip

### Reference design
- Screenshot: heywordvocab.com/library — card grid, light sidebar, category tabs
- Key patterns: card with type badge + progress + meta info + hover elevation

</canonical_refs>

<specifics>
## Specific Ideas

### HeyWordVocab reference patterns
- Library cards: rounded corners (~16px), white background, subtle border or shadow
- Type/category badges: small colored chip in top-right corner of card
- Progress indicator: "914 từ đã học" style — text-based in header
- Filter tabs: horizontal scrollable row of pill tabs with count
- Sidebar: white background, clean nav items, active = blue-tinted background

### Card grid for homework
```
┌─────────────────────────────────────┐
│ [Phonics chip] [SPEAKING chip]      │
│                                     │
│ **Phonics: er, r, ou**              │
│ Class A · Class B                   │
│                                     │
│ ─────────────────────────────────── │
│ ████████░░ 8/12 submitted           │
│ Due: Dec 25 · [assign][edit][more]  │
└─────────────────────────────────────┘
```

### Sidebar light design
```
┌──────────────────┐
│ [K] Katie English│  ← blue K logo
│     Teacher      │
│──────────────────│
│ Dashboard        │  ← active = blue bg, blue text
│ Classes          │
│ Students         │
│ Homework         │
│ Sessions         │
│ Tuition          │
└──────────────────┘
```

</specifics>

<deferred>
## Deferred Ideas

- Responsive/mobile layout cho teacher portal (separate phase)
- Dark mode toggle
- Tùy chỉnh theme per-user
- Notification bell trong header
- Search global trong header

</deferred>

---

*Phase: 16-teacher-admin-ui-redesign*
*Context gathered: 2026-06-21 — UI redesign directive with HeyWordVocab reference*
