---
phase: "15"
plan: "03"
subsystem: "frontend/tuition"
tags: [nextjs, react, mui, tuition, admin-portal, teacher-portal]
dependency_graph:
  requires:
    - "15-02"  # TuitionModule backend endpoints
  provides:
    - AdminTuitionPage at /admin/tuition (tabbed UI)
    - TuitionConfigForm component (pricePerSession, bookFee, dueDayOfMonth)
    - GenerateRecordsModal component (month + year fields)
    - PaymentRecordDialog component (paidAt + paidBy fields)
    - ZaloSendModal component (confirmation + record count)
    - TeacherTuitionPage at /teacher/tuition (class-scoped)
    - 6 tuition API functions in admin-portal-api.ts
    - 8 TypeScript interfaces for tuition domain
  affects:
    - frontend/lib/admin-portal-api.ts
tech_stack:
  added: []
  patterns:
    - MUI Dialog/Tabs/Select/TextField pattern (matching admin/classes/page.tsx)
    - useToast() for user feedback
    - try/catch with loading state on all async submit handlers
    - Relative imports from teacher portal to shared admin components
key_files:
  created:
    - frontend/app/admin/tuition/page.tsx
    - frontend/app/admin/tuition/_components/TuitionConfigForm.tsx
    - frontend/app/admin/tuition/_components/GenerateRecordsModal.tsx
    - frontend/app/admin/tuition/_components/PaymentRecordDialog.tsx
    - frontend/app/admin/tuition/_components/ZaloSendModal.tsx
    - frontend/app/teacher/tuition/page.tsx
  modified:
    - frontend/lib/admin-portal-api.ts
decisions:
  - "TuitionConfigForm rendered inline (not dialog) in admin page Tab 0 — plan specified onClose/onSaved props for reuse in teacher portal"
  - "Teacher page uses getClasses() from admin-api.ts (teacher JWT — backend filters to own classes) instead of a separate getTeacherClasses — no such function exists in codebase"
  - "Teacher page imports components via relative path ../../admin/tuition/_components/ — avoids @/ alias cross-module ambiguity"
  - "ZaloSendModal recordIds=[] on admin page Tab 2 — per plan spec, user selects records from Report tab (Plan 04 will wire this)"
  - "PaymentRecordDialog paidAt field accepts ISO date string (YYYY-MM-DD) matching backend RecordPaymentInput.paidAt: string type"
metrics:
  duration: "~5 minutes"
  completed: "2026-06-19"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 7
---

# Phase 15 Plan 03: Tuition Management UI Summary

Admin-portal and teacher-portal tuition UI built with 5 MUI components, 2 page files, and 6 API wrapper functions. Both `/admin/tuition` and `/teacher/tuition` routes compile and appear in the Next.js build output. TypeScript shows no errors.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add tuition API functions to admin-portal-api.ts | b9e4588 | frontend/lib/admin-portal-api.ts |
| 2 | Build tuition UI components and admin/teacher pages | c310eba | 6 new component/page files |

## What Was Built

### API Layer (admin-portal-api.ts)

8 TypeScript interfaces exported:
- `TuitionConfig`, `TuitionRecord`, `TuitionReportItem` — domain entity shapes
- `CreateTuitionConfigInput`, `GenerateRecordsInput`, `RecordPaymentInput`, `SendNotificationsInput`, `SendNotificationsResult` — request/response types

6 API functions exported:
- `getTuitionConfig(classId)` — GET /admin/tuition/config/:classId
- `updateTuitionConfig(classId, data)` — PUT /admin/tuition/config/:classId
- `createTuitionRecords(data)` — POST /admin/tuition/records/generate
- `recordTuitionPayment(recordId, data)` — PATCH /admin/tuition/records/:id
- `sendTuitionNotifications(data)` — POST /admin/tuition/notify
- `getTuitionReport(params)` — GET /admin/tuition/report (shared with Plan 04)

### Components (frontend/app/admin/tuition/_components/)

**TuitionConfigForm.tsx** — Inline form (no dialog wrapper). Fetches existing config on mount (catches 404 and keeps defaults). Three fields: pricePerSession (required), bookFee (optional), dueDayOfMonth (required, 1–31). Submits PUT /admin/tuition/config/:classId.

**GenerateRecordsModal.tsx** — MUI Dialog. Month (1–12) and year fields with warning text about duplicate records. Submits POST /admin/tuition/records/generate.

**PaymentRecordDialog.tsx** — MUI Dialog. DialogTitle shows studentName + totalAmount formatted in vi-VN locale. Fields: paidAt (date input), paidBy (text). Submits PATCH /admin/tuition/records/:id.

**ZaloSendModal.tsx** — MUI Dialog confirmation. Shows record count, hides phone numbers (T-15-10 mitigation). Submits POST /admin/tuition/notify, shows `Đã gửi X/Y thông báo` with success/warning toast.

### Pages

**AdminTuitionPage** (`/admin/tuition`) — Loads all admin classes on mount. Class selector (Select). Tabs: Cấu hình (TuitionConfigForm inline), Tạo phiếu thu (button opens GenerateRecordsModal), Thông báo ZNS (button opens ZaloSendModal with empty recordIds), Báo cáo (placeholder for Plan 04 TuitionReportTable).

**TeacherTuitionPage** (`/teacher/tuition`) — Loads teacher's own classes via `getClasses()` (teacher JWT). Class selector. Tabs: Cấu hình, Tạo phiếu thu, Báo cáo (placeholder). Imports shared components from `../../admin/tuition/_components/`.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `recordIds={[]}` on ZaloSendModal in admin page | frontend/app/admin/tuition/page.tsx | Plan spec: user selects records from Report tab. Plan 04 (TuitionReportTable) will wire the actual selected record IDs. |
| Report tab placeholder text | frontend/app/admin/tuition/page.tsx, frontend/app/teacher/tuition/page.tsx | Plan 04 delivers TuitionReportTable component. Both pages have Tab 3/2 reserved with placeholder Typography. |

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| threat_flag: info-disclosure mitigated | ZaloSendModal.tsx | Shows only record count, not phone numbers. T-15-10 mitigated as required. |
| threat_flag: auth | TuitionConfigForm.tsx, GenerateRecordsModal.tsx, PaymentRecordDialog.tsx, ZaloSendModal.tsx | All components call admin-portal-api.ts req() which injects adminAuthHeaders() — JWT validated backend side. T-15-11 addressed (teacher page reuses components, backend AdminGuard enforces role). |

## Self-Check

- [x] `frontend/app/admin/tuition/page.tsx` — exists, contains 'use client' and Tabs
- [x] `frontend/app/admin/tuition/_components/TuitionConfigForm.tsx` — exists, contains pricePerSession TextField
- [x] `frontend/app/admin/tuition/_components/GenerateRecordsModal.tsx` — exists, contains month and year TextFields
- [x] `frontend/app/admin/tuition/_components/PaymentRecordDialog.tsx` — exists, contains paidAt and paidBy TextFields
- [x] `frontend/app/admin/tuition/_components/ZaloSendModal.tsx` — exists, calls sendTuitionNotifications
- [x] `frontend/app/teacher/tuition/page.tsx` — exists, imports from ../../admin/tuition/_components/
- [x] `frontend/lib/admin-portal-api.ts` — exports getTuitionConfig, updateTuitionConfig, createTuitionRecords, recordTuitionPayment, sendTuitionNotifications, getTuitionReport
- [x] Commit b9e4588 — API functions and interfaces
- [x] Commit c310eba — UI components and pages
- [x] `npx tsc --noEmit` shows no errors
- [x] `npx next build` exits 0 — /admin/tuition (2.02 kB) and /teacher/tuition (3.16 kB) in output

## Self-Check: PASSED
