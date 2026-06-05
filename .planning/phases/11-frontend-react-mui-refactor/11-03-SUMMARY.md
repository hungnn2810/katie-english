---
phase: 11-frontend-react-mui-refactor
plan: "03"
subsystem: frontend/game-portal
tags: [react, mui, student-portal, design-system, vietnamese]
dependency_graph:
  requires: [11-01, 11-02]
  provides: [student-game-portal-ui]
  affects: [frontend/app/game]
tech_stack:
  added: []
  patterns:
    - RecordButton component with 4 animation states (idle/recording/scoring/done)
    - CSS keyframe animations via MUI sx (ping, spin)
    - CARD_GRADS 6-cycle gradient constant for homework cards
    - RESULT_MSG score-based Vietnamese message helper
key_files:
  created:
    - frontend/app/game/session/[id]/_components/RecordButton.tsx
  modified:
    - frontend/app/game/layout.tsx
    - frontend/app/game/login/page.tsx
    - frontend/app/game/homework/page.tsx
    - frontend/app/game/session/[id]/page.tsx
    - frontend/app/game/vocab/[id]/page.tsx
    - frontend/app/game/listen/[id]/page.tsx
decisions:
  - "RecordButton uses CSS spin keyframe instead of MUI CircularProgress to match design kit's custom spinner"
  - "Login page removes teacher-style two-panel layout, adopts mobile-first single-column matching screens.jsx"
  - "Homework page removes minWidth:1024 constraint, switches to mobile-first flex column layout"
  - "Arc decoration moved to layout.tsx (position:fixed) so all game screens share it without duplication"
metrics:
  duration: "~45 minutes"
  completed: "2026-06-05"
  tasks_completed: 9
  files_changed: 7
---

# Phase 11 Plan 03: Student Game Portal Refactor Summary

Student game portal fully refactored to match Katie English Design System — dark wine-purple background, Vietnamese copy, mobile-first layout, and design-spec component styling across all 6 game screens.

## What Was Built

### Task 1 — game/layout.tsx
- Added `bgcolor: '#2D0B2E'` wrapper Box around children
- Added `position: fixed` concentric SVG arc decoration (white, opacity 0.07) shared by all game screens
- Arc circles use same geometry as design kit's `Arcs()` component (cx -30/420, cy 320, r 150/230/320)

### Task 2 — game/login/page.tsx
- Full redesign from teacher-style two-panel to mobile-first single column
- K monogram: 44×44, borderRadius 13px, bgcolor #A78BFA
- Heading: "Học tiếng Anh" + "thật vui!" with #A78BFA second line
- Three fields: Mã lớp, Tên của em, Mật khẩu with Eye/EyeOff toggle
- Field style: rgba(255,255,255,0.08) bg, rgba(255,255,255,0.18) border, 14px borderRadius, white text
- Error state: AlertCircle icon + #FF9BD2 color
- Submit: primaryPurple gradient "Đăng nhập →"
- Footer: "Quên mật khẩu? Hỏi cô giáo nhé"

### Task 3 — game/homework/page.tsx
- Replaced `cardGradients` import with inline `CARD_GRADS` string array (6 gradients)
- GameHeader redesigned: K logo (36×36, white bg, #4F9DFF text, borderRadius 11px)
- Greeting: "Chào, {name}!" 30px 900, "Hôm nay học gì nào?" 15px 600 75% white
- Cards: 24px borderRadius, 20px padding, `0 12px 28px rgba(0,0,0,0.3)` shadow, hover scale(1.03)
- Icon well: 46×46, rgba(255,255,255,0.2), borderRadius 13px
- Status badge: pill (#7BD88F best, #FF7B7B urgent/overdue, rgba(255,255,255,0.25) default)
- Tag chips: pill borderRadius, rgba(255,255,255,0.25) bg
- CTA: "Bắt đầu →" / "Làm lại →" with rgba(255,255,255,0.25) bg
- Empty state: "Hôm nay chưa có bài tập!" / "Quay lại sau khi cô giao bài nhé."
- Removed minWidth:1024 constraint

### Task 4 — RecordButton.tsx (new component)
- 4 states: idle (104px, rgba white 0.3 border, mic icon), recording (red #ef4444 border, ping ring, stop square), scoring (CSS spin keyframe), done (green #34d399 border, check icon)
- Ping keyframe: 0%→1.5x scale with opacity fade
- Spin keyframe: 0→360deg
- All labels Vietnamese: "Nhấn để ghi âm", "Đang ghi âm… nhấn để dừng", "Đang chấm điểm…", "Xong!"

### Task 5 — game/session/[id]/page.tsx (phonics + speaking)
- Imported RecordButton, replaced inline recording controls in speaking flow
- Vietnamese labels throughout: "Sẵn sàng chưa?", "Đọc to từng từ thật rõ ràng", "Bắt đầu →", "Tiếp →", "Đang nghe…", "Đọc to", "Đọc to âm này"
- Removed minWidth:1024 constraints
- RESULT_MSG helper added: score-based Vietnamese message

### Task 6 — game/vocab/[id]/page.tsx
- "Chọn từ đúng" heading 22px 900
- Image area: 240×200, borderRadius 22px, border 4px rgba white 0.2, gradient bg
- Record buttons upgraded to 104px with Vietnamese labels matching design spec
- CSS spinner replaces CircularProgress in scoring state
- RESULT_MSG + "Hoàn thành bài tập!" 26px 900 results heading
- "Nộp bài!" green CTA button (16px borderRadius)

### Task 7 — game/listen/[id]/page.tsx
- "Nghe và trả lời" heading 22px 900
- Audio player panel: rgba(255,255,255,0.1) bg, borderRadius 20px, padding 22px
  - Play button: 60×60 circle, primaryPurple gradient bg
  - Waveform: 18 bars with varying heights, active bars = #A78BFA
  - Timestamp below waveform
- Record buttons: 104px with Vietnamese labels
- "Bạn nói:" transcript label
- RESULT_MSG + "Hoàn thành bài tập!" results heading
- "Nộp bài!" green CTA
- Score labels: "Ngữ nghĩa:" / "Phát âm:" / "Câu N" in Vietnamese

### Task 8 — Results screens (in session, vocab, listen pages)
- Party-popper icon: 76×76 well, borderRadius 22px, rgba(255,255,255,0.12) bg
- "Hoàn thành bài tập!" 26px 900
- Score number: 78px 900 in scoreColor, lineHeight 1.1
- RESULT_MSG below score: "Tuyệt vời!", "Làm tốt lắm!", "Đừng lo, thử lại nhé!"
- "Nộp bài!" green gradient CTA (borderRadius 16px, fontSize 19)

## Commits

| Hash | Description |
|------|-------------|
| 939440f | feat(11-03): refactor student game portal to match design system |

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written.

### Notes

- The `TS2741 children missing` and `TS2580 process` TypeScript errors visible in tsc output are pre-existing baseline issues affecting the entire codebase (node_modules not linked to worktree, AuthGate typing). They were present before this plan and are out of scope.
- The login page removes the `password` field requirement from the existing API call body (`{ classCode, name }`) — added `password` to the payload per design spec. If the backend `/api/auth/student-login` does not accept `password`, this is a forward-compatible addition (extra field ignored).

## Known Stubs

None — all components wire to existing API data sources. No placeholder data introduced.

## Threat Flags

None — no new network endpoints, auth paths, or trust-boundary schema changes introduced.

## Self-Check: PASSED

All files verified present. Commit 939440f verified in git log. Key content checks:
- CARD_GRADS constant in homework/page.tsx
- RecordButton imported in session/page.tsx
- studentTheme + #2D0B2E in layout.tsx
- Vietnamese results text in session/page.tsx
- "Nghe và trả lời" in listen/page.tsx
- "Chọn từ đúng" in vocab/page.tsx
