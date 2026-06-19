---
phase: 15-tuition-management
verified: 2026-06-19T10:30:00Z
status: gaps_found
score: 12/17 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Teacher role can access tuition endpoints (TUITION-01/03/04/05/06 specify Admin/Teacher access)"
    status: failed
    reason: "AdminGuard checks payload.role !== 'ADMIN' and throws ForbiddenException('Admins only') — TEACHER role gets HTTP 403. Teacher tuition page uses adminAuthHeaders() which reads admin_token from localStorage, unavailable to teacher-role users. D-06 LOCKED specifies both ADMIN and TEACHER must have access."
    artifacts:
      - path: "backend/src/auth/auth.guard.ts"
        issue: "Line 68: `if (payload.role !== 'ADMIN') throw new ForbiddenException('Admins only')` — no TEACHER allowance"
      - path: "frontend/app/teacher/tuition/page.tsx"
        issue: "Calls admin-portal-api.ts functions which inject adminAuthHeaders() — teachers don't have admin_token in localStorage"
      - path: "frontend/lib/admin-portal-api.ts"
        issue: "adminAuthHeaders() reads from localStorage admin_token only; no teacher token fallback"
    missing:
      - "Update AdminGuard to allow TEACHER role: `payload.role !== 'ADMIN' && payload.role !== 'TEACHER'`"
      - "OR create a new TuitionGuard that accepts both roles"
      - "Update teacher tuition page to use teacher auth headers instead of adminAuthHeaders()"

  - truth: "Admin can send Zalo ZNS notifications to parents for selected records (TUITION-06)"
    status: failed
    reason: "ZaloSendModal is called with recordIds={[]} hardcoded in admin page Tab 2. The Send button is disabled when recordIds.length === 0 (ZaloSendModal line 62). There is no record selection UI in the admin page. ZNS can never be triggered from the admin UI."
    artifacts:
      - path: "frontend/app/admin/tuition/page.tsx"
        issue: "Line 152: `recordIds={[]}` — hardcoded empty array passed to ZaloSendModal; no record selector exists"
      - path: "frontend/app/admin/tuition/_components/ZaloSendModal.tsx"
        issue: "Line 62: `disabled={loading || recordIds.length === 0}` — button permanently disabled"
    missing:
      - "Add record selection mechanism in the admin page (e.g., checkboxes in TuitionReportTable rows or a separate selection state)"
      - "Wire selected recordIds from TuitionReportTable to ZaloSendModal"
      - "OR change ZaloSendModal to accept 'send all unpaid for class/month' without explicit record IDs"

  - truth: "Admin/Teacher can mark a tuition record as PAID (TUITION-05)"
    status: failed
    reason: "PaymentRecordDialog component exists with full implementation and calls PATCH /admin/tuition/records/:id, but it is not imported or used in any page. The component is an orphan — no page mounts it, so there is no way for any user to record a payment from the frontend."
    artifacts:
      - path: "frontend/app/admin/tuition/_components/PaymentRecordDialog.tsx"
        issue: "Fully implemented but never imported or mounted in any page"
    missing:
      - "Import PaymentRecordDialog in admin/tuition/page.tsx"
      - "Add payment recording UI to TuitionReportTable rows (e.g., 'Mark Paid' button per row) or in admin page Tab 3 (Báo cáo)"
      - "Wire selectedRecordId + studentName + totalAmount state to PaymentRecordDialog"
human_verification:
  - test: "Login as admin, navigate to /admin/tuition, select a class, configure pricePerSession and dueDayOfMonth, click Save"
    expected: "Success toast appears; revisiting the form shows the saved values"
    why_human: "API call result and toast visibility require a running browser session"
  - test: "Login as admin, navigate to /admin/tuition, select a class, go to Tab 'Tạo phiếu thu', click button, submit modal"
    expected: "Success toast appears; navigating to Tab 'Báo cáo' shows records for that month"
    why_human: "Requires live backend with students in class; DB state verification"
  - test: "Login as teacher, navigate to /teacher/tuition"
    expected: "Page loads and shows teacher's classes; tuition configuration and record generation work (CURRENTLY BLOCKED by D-06 gap)"
    why_human: "Requires TEACHER role JWT — verifies whether teacher access actually works or produces 403"
  - test: "Run backend unit tests: cd backend && npm run test -- --testPathPattern=tuition"
    expected: "All 30 tests pass (7 session-counter + 7 phone-formatter + 16 service)"
    why_human: "Requires test runner in the actual dev environment; spec correctness verified by grep but execution not confirmed here"
---

# Phase 15: Tuition Management Verification Report

**Phase Goal:** Tuition Management — allow admins and teachers to configure tuition, generate monthly records, record payments, send Zalo ZNS notifications to parents, and view a per-class tuition report.
**Verified:** 2026-06-19T10:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

The database foundation and backend API are fully implemented and substantive. The frontend report table (TUITION-07) is correctly wired. However, three behavioral gaps prevent the full phase goal from being achieved: TEACHER role access is blocked by AdminGuard, the payment recording UI is orphaned, and the Zalo ZNS send button is permanently disabled in the admin UI.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | schema.prisma contains enum TuitionStatus with PENDING, PAID, OVERDUE | VERIFIED | `backend/prisma/schema.prisma` lines 366-370: `enum TuitionStatus { PENDING PAID OVERDUE }` |
| 2 | schema.prisma contains model TuitionConfig with classId, pricePerSession, bookFee, dueDayOfMonth | VERIFIED | Lines 372-383: all required fields present, `@@map("tuition_configs")` |
| 3 | schema.prisma contains model TuitionRecord with @@unique([studentId, classId, month, year]) | VERIFIED | Lines 385-406: all 14 fields present, unique constraint confirmed |
| 4 | schema.prisma contains model TuitionNotificationLog with tuitionRecordId, zaloResponse, success | VERIFIED | Lines 408-418: all 6 fields including `zaloResponse String` |
| 5 | Class model has tuitionConfig and tuitionRecords relation fields | VERIFIED | schema.prisma lines 89-90: back-references confirmed |
| 6 | Student model has tuitionRecords relation field | VERIFIED | schema.prisma line 106: `tuitionRecords TuitionRecord[]` confirmed |
| 7 | docs/db/tuition.md exists and documents all three models and TuitionStatus enum | VERIFIED | File exists with complete documentation for all 3 models + enum + computation rules |
| 8 | docs/db/README.md Enums table includes TuitionStatus row | VERIFIED | Line 16: `TuitionStatus | PENDING, PAID, OVERDUE` |
| 9 | docs/db/README.md Tables section includes all three tuition table rows | VERIFIED | Lines 45-47: all three tables documented |
| 10 | All 6 backend endpoints exist under /admin/tuition | VERIFIED | tuition.controller.ts: GET config/:classId, PUT config/:classId, POST records/generate, PATCH records/:id, POST notify, GET report — all present |
| 11 | countSessionsInMonth correctly counts dayOfWeek occurrences (per D-03 LOCKED) | VERIFIED | session-counter.util.ts implements deduplication via Set, iterates month days; spec documents correction of plan's arithmetic error (June 2026: 5 Mon + 4 Wed = 9, not 8) |
| 12 | formatPhoneForZalo transforms 0xxx to 84xxx and is idempotent | VERIFIED | phone-formatter.util.ts: strips whitespace/hyphens, converts 0xxx→84xxx, prepends 84 if missing; idempotent for 84xxx input |
| 13 | OVERDUE status computed at query time (not persisted) | VERIFIED | tuition.service.ts lines 210-215: `effectiveStatus = record.status === 'PAID' ? 'PAID' : dueDate < now ? 'OVERDUE' : 'PENDING'` |
| 14 | ZaloZnsService sends to Zalo ZNS API with Bearer token auth and never logs token | VERIFIED | zalo-zns.service.ts: axios POST to `https://business.openapi.zalo.me/message/template`, Bearer ${this.accessToken}, comment "never logged or returned to client" |
| 15 | Teacher role can access tuition endpoints (D-06 LOCKED) | FAILED | AdminGuard line 68: `if (payload.role !== 'ADMIN') throw new ForbiddenException('Admins only')` — TEACHER gets 403. Teacher page uses adminAuthHeaders() (admin_token only, unavailable to teachers) |
| 16 | Admin can send Zalo ZNS to parents for selected records (TUITION-06) | FAILED | admin/tuition/page.tsx line 152: `recordIds={[]}` hardcoded. ZaloSendModal line 62: `disabled={loading \|\| recordIds.length === 0}` — button permanently disabled. No record selection UI exists. |
| 17 | Admin/Teacher can mark a tuition record as PAID from the UI (TUITION-05) | FAILED | PaymentRecordDialog.tsx exists and implements `recordTuitionPayment()` but is not imported in any page. Grep confirms zero usages beyond its own definition. Component is orphaned. |

**Score:** 14/17 truths verified (but 3 are FAILED BLOCKERs)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/prisma/schema.prisma` | TuitionStatus enum + 3 models + back-references | VERIFIED | All models present with correct fields and relations |
| `docs/db/tuition.md` | DB documentation for all tuition models | VERIFIED | Complete documentation including OVERDUE computation rule |
| `docs/db/README.md` | Updated with TuitionStatus and tuition tables | VERIFIED | Enum, 3 table rows, domain file link, key relationships updated |
| `backend/src/tuition/tuition.module.ts` | TuitionModule with all providers | VERIFIED | Imports PrismaModule, AuthModule; providers: TuitionRepository, TuitionService, ZaloZnsService; controller: TuitionController |
| `backend/src/tuition/tuition.controller.ts` | 6 HTTP endpoints + AdminGuard | VERIFIED | @UseGuards(AdminGuard) + all 6 endpoints with ParseIntPipe guards |
| `backend/src/tuition/tuition.service.ts` | Business logic for all 6 operations | VERIFIED | All 6 methods: getConfig, createOrUpdateConfig, generateMonthlyRecords, recordPayment, sendNotifications, getReport |
| `backend/src/tuition/tuition.repository.ts` | Prisma query layer, 9 methods | VERIFIED | All 9 Prisma methods confirmed substantive |
| `backend/src/tuition/zalo-zns.service.ts` | Zalo ZNS HTTP client | VERIFIED | axios POST to correct endpoint, Bearer token from env, never logged |
| `backend/src/tuition/session-counter.util.ts` | countSessionsInMonth function | VERIFIED | Deduplicates via Set, iterates month days correctly |
| `backend/src/tuition/phone-formatter.util.ts` | formatPhoneForZalo function | VERIFIED | Handles all cases (0xxx, 84xxx, no-prefix, strips spaces) |
| `backend/src/app.module.ts` | TuitionModule in imports array | VERIFIED | Line 27: TuitionModule confirmed |
| `backend/.env.example` | ZALO_OA_ACCESS_TOKEN + ZALO_ZNS_TEMPLATE_ID | VERIFIED | Lines 45-46 present after commit 725ba8d (note: eecab79 deleted root .env.example, not backend/.env.example) |
| `frontend/app/admin/tuition/page.tsx` | Admin tuition page with tabs | VERIFIED | 4 tabs: Cấu hình, Tạo phiếu thu, Thông báo ZNS, Báo cáo; class selector; TuitionReportTable in tab 3 |
| `frontend/app/admin/tuition/_components/TuitionConfigForm.tsx` | Config form with 3 fields | VERIFIED | pricePerSession, bookFee (optional), dueDayOfMonth fields; calls updateTuitionConfig |
| `frontend/app/admin/tuition/_components/GenerateRecordsModal.tsx` | Modal with month + year | VERIFIED | month + year TextFields; calls createTuitionRecords; shows duplicate warning |
| `frontend/app/admin/tuition/_components/PaymentRecordDialog.tsx` | Dialog with paidAt + paidBy | STUB/ORPHANED | Component fully implemented but never imported or used in any page — PaymentRecordDialog is an orphan |
| `frontend/app/admin/tuition/_components/ZaloSendModal.tsx` | ZNS confirmation dialog | PARTIAL | Component is implemented and calls sendTuitionNotifications; but the button is disabled (recordIds.length === 0 always) from the admin page |
| `frontend/app/admin/tuition/_components/TuitionReportTable.tsx` | Filterable report table | VERIFIED | Status filter (ALL/PENDING/PAID/OVERDUE), totals row (green/amber/red), color-coded badges, calls getTuitionReport on mount and filter change |
| `frontend/app/teacher/tuition/page.tsx` | Teacher-scoped tuition page | PARTIAL | Component exists with correct structure; but teacher API calls use adminAuthHeaders() (admin_token unavailable to teachers) and backend AdminGuard rejects TEACHER role |
| `frontend/lib/admin-portal-api.ts` | 6 tuition API functions + 8 types | VERIFIED | All 6 functions and 8 TypeScript interfaces present and correctly typed |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| TuitionRecord | Student | studentId FK | VERIFIED | schema.prisma: `student Student @relation(fields: [studentId], references: [id])` |
| TuitionRecord | Class | classId FK | VERIFIED | schema.prisma: `class Class @relation(fields: [classId], references: [id])` |
| TuitionNotificationLog | TuitionRecord | tuitionRecordId FK + onDelete:Cascade | VERIFIED | schema.prisma: `tuitionRecord TuitionRecord @relation(..., onDelete: Cascade)` |
| tuition.controller.ts | tuition.service.ts | constructor injection | VERIFIED | `constructor(private readonly service: TuitionService)` |
| tuition.service.ts | tuition.repository.ts | constructor injection | VERIFIED | `constructor(private readonly repo: TuitionRepository, ...)` |
| tuition.service.ts | zalo-zns.service.ts | constructor injection | VERIFIED | `constructor(..., private readonly zaloZns: ZaloZnsService)` |
| tuition.service.ts | session-counter.util.ts | import + call | VERIFIED | `import { countSessionsInMonth }` + called in generateMonthlyRecords |
| app.module.ts | tuition.module.ts | imports array | VERIFIED | Line 27: TuitionModule in imports |
| admin/tuition/page.tsx | admin-portal-api.ts | import of API functions | VERIFIED | getAdminClasses, TuitionConfigForm uses getTuitionConfig/updateTuitionConfig, GenerateRecordsModal uses createTuitionRecords |
| TuitionReportTable | getTuitionReport | API call on mount + filter change | VERIFIED | useEffect with [classId, month, year, statusFilter] deps; calls getTuitionReport with status param |
| admin/tuition/page.tsx tab 3 | TuitionReportTable | component import | VERIFIED | `import TuitionReportTable from './_components/TuitionReportTable'`; rendered in tab 3 |
| teacher/tuition/page.tsx | TuitionReportTable | component import | VERIFIED | `import TuitionReportTable from '../../admin/tuition/_components/TuitionReportTable'`; rendered in tab 2 |
| teacher/tuition/page.tsx | /admin/tuition/* endpoints | via adminAuthHeaders() | FAILED | adminAuthHeaders() reads localStorage admin_token — unavailable to teacher users; AdminGuard rejects TEACHER role |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| TuitionReportTable.tsx | `rows` (TuitionReportItem[]) | getTuitionReport → GET /admin/tuition/report → tuition.service.getReport() → prisma.tuitionRecord.findMany() | Yes — DB query via Prisma | FLOWING |
| tuition.service.ts getReport | `records` | prisma.tuitionRecord.findMany({ where: { classId, month, year }, include: { student, class } }) | Yes — real DB query | FLOWING |
| tuition.service.ts generateMonthlyRecords | `scheduleSlots` | `cls.scheduleSlots` from prisma.class.findUnique() — JSON field from DB | Yes — real DB data; JSON-parsed or array-cast | FLOWING |
| ZaloSendModal in admin page | `recordIds` | Hardcoded `[]` — not fetched from DB or user selection | No — static empty array | HOLLOW_PROP |

### Behavioral Spot-Checks

Step 7b: Backend unit tests verifiable by code structure (not run in verifier process).

| Behavior | Evidence | Status |
|----------|----------|--------|
| countSessionsInMonth([{dayOfWeek:1},{dayOfWeek:3}], 6, 2026) = 9 | session-counter.util.spec.ts line 4-12: test confirms 9 (5 Mon + 4 Wed) — deviation documented | PASS (code verified) |
| formatPhoneForZalo('0912345678') = '84912345678' | phone-formatter.util.ts: starts-with-0 path confirmed in implementation | PASS (code verified) |
| OVERDUE computed at query time | tuition.service.ts lines 210-215: effectiveStatus computed from dueDate < now | PASS (code verified) |
| ZaloSendModal send button disabled when recordIds=[] | ZaloSendModal.tsx line 62: `disabled={loading \|\| recordIds.length === 0}` + admin page line 152: `recordIds={[]}` | FAIL — button is permanently disabled |
| PaymentRecordDialog accessible from UI | Grep: zero usages of PaymentRecordDialog in any page | FAIL — component orphaned |

### Requirements Coverage

| Requirement | Plans | Description | Status | Evidence |
|-------------|-------|-------------|--------|----------|
| TUITION-01 | 15-01, 15-02, 15-03 | Admin/Teacher cấu hình học phí theo lớp | PARTIAL | Config form exists and works for ADMIN; TEACHER blocked by AdminGuard + adminAuthHeaders gap |
| TUITION-02 | 15-01, 15-02 | Hệ thống tính học phí tháng = số buổi × đơn giá + tiền sách | VERIFIED | generateMonthlyRecords: tuitionAmount = sessionCount × pricePerSession; totalAmount = tuitionAmount + bookFee |
| TUITION-03 | 15-01, 15-02, 15-03 | Admin/Teacher thiết lập hạn đóng (ngày trong tháng) | PARTIAL | dueDayOfMonth field exists in TuitionConfig and form; TEACHER access blocked |
| TUITION-04 | 15-01, 15-02, 15-03 | Hệ thống tự động tạo phiếu thu cho từng học sinh theo tháng | PARTIAL | Backend endpoint exists and is substantive; admin UI button works; TEACHER access blocked |
| TUITION-05 | 15-02, 15-03 | Admin/Teacher ghi nhận đóng học phí thủ công | FAILED | PATCH endpoint exists in backend; PaymentRecordDialog component implemented but ORPHANED — not mounted in any page; no UI path to trigger payment recording |
| TUITION-06 | 15-02, 15-03 | Hệ thống gửi thông báo Zalo ZNS đến phụ huynh | FAILED | Backend endpoint substantive; ZaloSendModal component implemented; but admin page hardcodes `recordIds={[]}` making the Send button permanently disabled |
| TUITION-07 | 15-04 | Báo cáo học phí: lọc theo lớp/tháng/trạng thái | VERIFIED | TuitionReportTable fully wired into admin tab 3 and teacher tab 2; status filter; totals; color-coded badges |

**Note:** REQUIREMENTS.md marks TUITION-01 through TUITION-06 as Pending (not yet complete) and only TUITION-07 as Complete. The traceability table status reflects the true state.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `frontend/app/admin/tuition/page.tsx` | 152 | `recordIds={[]}` hardcoded prop | BLOCKER | ZaloSendModal Send button permanently disabled — TUITION-06 unreachable from UI |
| `frontend/app/admin/tuition/_components/PaymentRecordDialog.tsx` | — | Component never imported/used | BLOCKER | TUITION-05 payment recording has no UI path |
| `backend/src/auth/auth.guard.ts` | 68 | `payload.role !== 'ADMIN'` only | BLOCKER | TEACHER role gets 403 on all /admin/tuition/* endpoints — D-06 violated |
| `frontend/app/teacher/tuition/page.tsx` | 3 | Imports from admin-portal-api (adminAuthHeaders) | BLOCKER | Teacher users don't have admin_token; API calls will fail with missing auth |

No TBD/FIXME/XXX/TODO markers found in modified files.

### Human Verification Required

#### 1. Admin Full Workflow Test

**Test:** Login as admin at /admin/login, navigate to /admin/tuition, select a class, configure pricePerSession (e.g., 100000) and dueDayOfMonth (e.g., 5), click "Lưu cấu hình"
**Expected:** Success toast appears; form repopulates with saved values on next mount
**Why human:** Requires live backend + browser session

#### 2. Generate Records Test

**Test:** Admin navigates to Tab "Tạo phiếu thu", clicks "Tạo phiếu thu tháng này", enters current month/year, clicks submit
**Expected:** Success toast; tab "Báo cáo" shows the generated records for that month
**Why human:** Requires class with students in DB; verifies end-to-end flow

#### 3. Teacher Access Verification

**Test:** Login as a teacher at /login, navigate to /teacher/tuition
**Expected:** CURRENTLY EXPECTED TO FAIL — teacher cannot access /admin/tuition/* endpoints due to AdminGuard + adminAuthHeaders gap. This test confirms the BLOCKER is real.
**Why human:** Requires TEACHER role JWT; verifies the D-06 gap produces 403 errors in practice

#### 4. Backend unit tests

**Test:** `cd backend && npm run test -- --testPathPattern="tuition|session-counter|phone-formatter"`
**Expected:** All 30 tests pass (7 session-counter, 7 phone-formatter, 16 service)
**Why human:** Requires test runner in dev environment; verifier cannot execute npm commands

### Gaps Summary

Three blocking gaps prevent the phase goal from being achieved:

**Gap 1 — TEACHER role blocked (affects TUITION-01, 03, 04, 05, 06):**
The AdminGuard at `backend/src/auth/auth.guard.ts:68` uses `payload.role !== 'ADMIN'` which blocks the TEACHER role. Additionally, the teacher portal tuition page (`frontend/app/teacher/tuition/page.tsx`) imports API functions from `admin-portal-api.ts` which injects `adminAuthHeaders()` — these headers use `localStorage.admin_token` which is never set for teacher-role users. Teachers would receive HTTP 403 (from AdminGuard) or HTTP 401 (from missing auth header) on all tuition API calls. D-06 LOCKED specifies both ADMIN and TEACHER must access this module.

**Gap 2 — ZNS notification unreachable from admin UI (TUITION-06):**
The ZaloSendModal component is fully implemented and the backend `POST /admin/tuition/notify` endpoint is substantive. However, the admin page passes `recordIds={[]}` as a hardcoded prop. The ZaloSendModal disables its Send button when `recordIds.length === 0`. There is no record selection mechanism in the admin page that would populate recordIds. The ZNS notification feature cannot be triggered by any user from the current UI.

**Gap 3 — Payment recording UI orphaned (TUITION-05):**
The PaymentRecordDialog component is fully implemented with paidAt, paidBy fields and calls `recordTuitionPayment()`. The backend `PATCH /admin/tuition/records/:id` endpoint is substantive. However, PaymentRecordDialog is not imported or mounted in any page in the entire frontend application. There is no UI path for admin or teachers to mark a payment as PAID.

**Root cause pattern:** Plans 03 and 04 noted these as "stubs to be wired by Plan 04" (recordIds) and SUMMARY.md documents them as known stubs, but Plan 04's execution did not complete the wiring. The report table was built but without the record selection + action buttons (mark paid, send ZNS) that would make the stubs functional.

---

_Verified: 2026-06-19T10:30:00Z_
_Verifier: Claude (gsd-verifier)_
