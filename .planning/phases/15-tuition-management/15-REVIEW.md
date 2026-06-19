---
phase: 15-tuition-management
reviewed: 2026-06-19T00:00:00Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - backend/.env.example
  - backend/prisma/schema.prisma
  - backend/src/app.module.ts
  - backend/src/tuition/phone-formatter.util.spec.ts
  - backend/src/tuition/phone-formatter.util.ts
  - backend/src/tuition/session-counter.util.spec.ts
  - backend/src/tuition/session-counter.util.ts
  - backend/src/tuition/tuition.controller.ts
  - backend/src/tuition/tuition.dto.ts
  - backend/src/tuition/tuition.module.ts
  - backend/src/tuition/tuition.repository.ts
  - backend/src/tuition/tuition.service.spec.ts
  - backend/src/tuition/tuition.service.ts
  - backend/src/tuition/zalo-zns.service.ts
  - docs/db/README.md
  - docs/db/tuition.md
  - frontend/app/admin/tuition/_components/GenerateRecordsModal.tsx
  - frontend/app/admin/tuition/_components/PaymentRecordDialog.tsx
  - frontend/app/admin/tuition/_components/TuitionConfigForm.tsx
  - frontend/app/admin/tuition/_components/TuitionReportTable.tsx
  - frontend/app/admin/tuition/_components/ZaloSendModal.tsx
  - frontend/app/admin/tuition/page.tsx
  - frontend/app/teacher/tuition/page.tsx
  - frontend/lib/admin-portal-api.ts
findings:
  critical: 5
  warning: 7
  info: 4
  total: 16
status: issues_found
---

# Phase 15: Code Review Report

**Reviewed:** 2026-06-19T00:00:00Z
**Depth:** standard
**Files Reviewed:** 24
**Status:** issues_found

## Summary

This phase implements a tuition management system: per-class fee configuration, monthly record generation based on schedule slots, payment recording, and Zalo ZNS push notifications to parents. The core logic (session counting, phone formatting) is sound and well-tested. However, several blockers exist: the DTO layer has no validation decorators so the backend accepts arbitrary malicious input, a teacher-role authorization gap allows teachers to access admin-only tuition APIs, a date-boundary bug in due-date construction silently rolls over to the next month, and the ZNS notification flow can send real paid-for messages for records that were already paid. Quality issues include unsafe `as any` casts in the repository layer, an unvalidated status filter string that is injected directly into a filter, and a UI flow that wires up the ZNS modal with a hardcoded empty `recordIds` array making the feature permanently non-functional.

---

## Critical Issues

### CR-01: DTOs have no class-validator decorators — backend accepts any input without validation

**File:** `backend/src/tuition/tuition.dto.ts:1-20`

**Issue:** All four DTO classes (`CreateTuitionConfigDto`, `GenerateRecordsDto`, `RecordPaymentDto`, `SendNotificationsDto`) are plain classes with no `class-validator` decorators. The app bootstraps `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` globally (`main.ts:40`), but `ValidationPipe` only strips/rejects unknown properties when decorators are present — without decorators it passes every value through untouched. This means:

- `pricePerSession` and `bookFee` can be floats, negative numbers, or strings — the service only checks `pricePerSession > 0` after the fact, but `bookFee`, `dueDayOfMonth`, `month`, and `year` receive no server-side range enforcement.
- `dueDayOfMonth` can be sent as 0 or 99, producing a silently-wrong `dueDate` (JavaScript `new Date(2026, 5, 0)` → May 31, `new Date(2026, 5, 99)` → September 8).
- `recordIds` in `SendNotificationsDto` can be an empty array or a non-array, causing the ZNS loop to silently do nothing or crash.
- `paidAt` in `RecordPaymentDto` can be any string; `new Date(dto.paidAt)` returns `Invalid Date`, which is then written to the DB without rejection.

**Fix:**
```typescript
import { IsInt, IsNotEmpty, IsString, IsArray, IsDateString, IsOptional, Min, Max, ArrayNotEmpty } from 'class-validator';

export class CreateTuitionConfigDto {
  @IsInt() @Min(1)
  pricePerSession: number;

  @IsOptional() @IsInt() @Min(0)
  bookFee?: number | null;

  @IsInt() @Min(1) @Max(31)
  dueDayOfMonth: number;
}

export class GenerateRecordsDto {
  @IsInt() @Min(1)
  classId: number;

  @IsInt() @Min(1) @Max(12)
  month: number;

  @IsInt() @Min(2020)
  year: number;
}

export class RecordPaymentDto {
  @IsDateString()
  paidAt: string;

  @IsString() @IsNotEmpty()
  paidBy: string;
}

export class SendNotificationsDto {
  @IsArray() @ArrayNotEmpty() @IsInt({ each: true })
  recordIds: number[];
}
```

---

### CR-02: Teacher portal calls admin-only tuition endpoints — authorization gap

**File:** `frontend/app/teacher/tuition/page.tsx:1-182`

**Issue:** The teacher tuition page renders `TuitionConfigForm`, `GenerateRecordsModal`, and `TuitionReportTable` — all of which call `admin-portal-api.ts` endpoints under `/admin/tuition/*`. Those endpoints are protected by `AdminGuard`, which enforces `role === 'ADMIN'` only (checked against the JWT payload, not the DB role — see `auth.guard.ts:68`). A teacher JWT token will receive a 403. The teacher portal therefore exposes a broken UI that cannot function. More importantly, if an admin token were ever stored in the teacher portal's localStorage (e.g., a shared device), it would grant full admin-level tuition write access via the teacher-facing page with no additional guard.

The proper fix is either:
1. Create separate teacher-scoped tuition endpoints guarded by `TeacherGuard`, or
2. Remove the tuition features from the teacher portal entirely until teacher-specific endpoints exist.

**Fix:**
```typescript
// Option A: guard the teacher tuition page endpoints with TeacherGuard
// backend/src/tuition/tuition.controller.ts — add a parallel teacher controller:
@UseGuards(TeacherGuard)
@Controller('teacher/tuition')
export class TeacherTuitionController {
  // read-only: report + config read
}

// Option B (immediate): remove the write tabs from teacher portal
// frontend/app/teacher/tuition/page.tsx — keep only the Báo cáo tab
```

---

### CR-03: Due-date silently rolls over for months with fewer than `dueDayOfMonth` days

**File:** `backend/src/tuition/tuition.service.ts:94`

**Issue:** `new Date(year, month - 1, config.dueDayOfMonth)` uses JavaScript's date overflow behavior. If `dueDayOfMonth = 31` and the month is February (28 days), the result is `new Date(2026, 1, 31)` → March 3, 2026. The due date is stored in the DB with the wrong month/year, and the OVERDUE comparison (`dueDate < now`) will fire a month late for short months. This is a silent data-corruption bug that will produce incorrect billing.

**Fix:**
```typescript
// Clamp dueDayOfMonth to the actual last day of the target month
const lastDayOfMonth = new Date(year, month, 0).getDate(); // day 0 of next month = last day of this month
const clampedDay = Math.min(config.dueDayOfMonth, lastDayOfMonth);
const dueDate = new Date(year, month - 1, clampedDay);
```

---

### CR-04: ZNS notifications can be sent for already-PAID records — no guard against double-notification

**File:** `backend/src/tuition/tuition.service.ts:128-196`

**Issue:** `sendNotifications` calls `repo.findRecordsByIds(recordIds)` and sends a ZNS message for every record returned, regardless of its `status`. A user can pass the ID of a PAID record and the system will send a "please pay" notification to the parent. Since Zalo ZNS messages cost money per send and confuse parents, this is a correctness bug. The service has no filter or guard for `status !== 'PAID'` before sending.

**Fix:**
```typescript
// In sendNotifications, after fetching records:
const unpaidRecords = records.filter(r => r.status !== 'PAID');
if (unpaidRecords.length === 0) {
  return { totalRecords: 0, successCount: 0, results: [] };
}
// iterate unpaidRecords instead of records
```

---

### CR-05: `countRecords` check happens AFTER `findStudentsByClass` — TOCTOU allows duplicate records under concurrent requests

**File:** `backend/src/tuition/tuition.service.ts:70-110`

**Issue:** The duplicate-record check (`countRecords`) and the actual `createRecord` calls are not wrapped in a database transaction. Under concurrent requests (two admins clicking "generate" simultaneously for the same class/month), both requests can pass the `countRecords === 0` check before either creates any records, resulting in duplicate `TuitionRecord` rows per student for that month — violating the `@@unique([studentId, classId, month, year])` constraint and causing one of the requests to explode with a Prisma unique-constraint error mid-batch (after some records were already created, leaving partial data).

Additionally, note that the order of checks is: `findClassById` → `findConfig` → `findStudentsByClass` → `countRecords`. The `countRecords` check should happen before fetching students to fail fast, but the real fix is a transaction.

**Fix:**
```typescript
// Wrap in a Prisma transaction:
return this.prisma.$transaction(async (tx) => {
  const existing = await tx.tuitionRecord.count({ where: { classId, month, year } });
  if (existing > 0) throw new BadRequestException(...);
  // createRecord calls inside transaction
});
```

---

## Warnings

### WR-01: `status` query parameter injected into filter without allowlist validation

**File:** `backend/src/tuition/tuition.controller.ts:69`

**Issue:** The `status` query param is split on commas and passed as `statuses` directly to `getReport`. The service filters using `statuses.includes(item.status)`, where `item.status` is one of the three enum values. While this does not cause SQL injection (Prisma uses parameterized queries), it means arbitrary strings silently produce an empty result set rather than a 400 error, making debugging difficult. A caller sending `?status=paid` (lowercase) gets no results with no error message.

**Fix:**
```typescript
const VALID_STATUSES = ['PENDING', 'PAID', 'OVERDUE'];
const statuses = status
  ? status.split(',').map((s) => s.trim().toUpperCase()).filter(s => VALID_STATUSES.includes(s))
  : undefined;
// or throw BadRequestException for unknown values
```

---

### WR-02: `repo.createRecord` uses `data as any` to bypass Prisma type safety

**File:** `backend/src/tuition/tuition.repository.ts:49`

**Issue:** The `createRecord` method accepts `status: string` and passes `data as any` to `prisma.tuitionRecord.create`. This bypasses Prisma's generated type for `TuitionStatus` enum, meaning an invalid status string (e.g., `'INVALID'`) would reach the DB layer and cause a runtime error rather than a compile-time error. The service currently always passes `'PENDING'`, but the cast removes that guarantee for future callers.

**Fix:**
```typescript
import { TuitionStatus } from '@prisma/client';

createRecord(data: {
  ...
  status: TuitionStatus;
}) {
  return this.prisma.tuitionRecord.create({ data }); // no cast needed
}
```

---

### WR-03: `AdminGuard` does not re-verify DB role — token role claim is trusted without database check

**File:** `backend/src/auth/auth.guard.ts:68`

**Issue:** `AdminGuard.canActivate` checks `payload.role !== 'ADMIN'` directly from the JWT payload without querying the database. `AuthGuard` and `TeacherGuard` both query the DB to confirm the user still exists and is approved. `AdminGuard` skips both the existence check and the `approved` check. If an admin account is disabled or demoted in the DB, their existing JWT token continues to grant full admin access to all tuition endpoints until expiry. This is a security regression compared to the other guards.

**Fix:**
```typescript
async canActivate(ctx: ExecutionContext): Promise<boolean> {
  const req = ctx.switchToHttp().getRequest<Request>();
  const auth = req.headers['authorization'];
  if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('No token');
  const payload = this.tokenService.verify(auth.slice(7));
  if (!payload) throw new UnauthorizedException('Invalid token');
  const user = await this.prisma.user.findUnique({
    where: { id: payload.sub },
    select: { approved: true, disabled: true, role: true },
  });
  if (!user || user.disabled) throw new UnauthorizedException('Invalid token');
  if (!user.approved) throw new ForbiddenException('Account pending approval');
  if (user.role !== 'ADMIN') throw new ForbiddenException('Admins only');
  (req as any).user = payload;
  return true;
}
```

---

### WR-04: ZaloSendModal always receives `recordIds={[]}` — ZNS send feature is permanently broken

**File:** `frontend/app/admin/tuition/page.tsx:151-155`

**Issue:** The `ZaloSendModal` on the admin tuition page is always instantiated with `recordIds={[]}`. The modal itself disables its send button when `recordIds.length === 0` (line 61 of `ZaloSendModal.tsx`), so clicking "Gửi thông báo ZNS" always opens a modal where the send button is permanently disabled. There is no mechanism on the admin page to populate `recordIds` from the report table. The feature is wired up but functionally dead.

**Fix:** The page needs to either:
1. Track selected rows in `TuitionReportTable` and pass them as `recordIds`, or
2. Pass all unpaid record IDs from the current report period.

```typescript
// Example: add selection state to admin page
const [selectedRecordIds, setSelectedRecordIds] = useState<number[]>([]);
// ...
<ZaloSendModal
  open={zaloOpen}
  recordIds={selectedRecordIds}
  onClose={() => setZaloOpen(false)}
  onSent={() => setSelectedRecordIds([])}
/>
```

---

### WR-05: `TuitionReportTable` has no payment action — `PaymentRecordDialog` component is imported nowhere

**File:** `frontend/app/admin/tuition/_components/PaymentRecordDialog.tsx:1`

**Issue:** `PaymentRecordDialog` is implemented but never imported or used in `TuitionReportTable.tsx` or `page.tsx`. The report table shows payment status but provides no way for admins to mark records as paid from the UI. The component exists as dead code, and the corresponding `recordTuitionPayment` API function in `admin-portal-api.ts` is similarly unreachable from any UI surface.

**Fix:** Add a "Mark Paid" action column to `TuitionReportTable` for PENDING/OVERDUE rows, rendering `PaymentRecordDialog` when clicked.

---

### WR-06: `formatPhoneForZalo` test at line 26 documents incorrect behavior as expected

**File:** `backend/src/tuition/phone-formatter.util.spec.ts:26`

**Issue:** The test for `(084)912345678` expects the result `'8484912345678'`. After stripping parentheses the input becomes `084912345678`, which starts with `0`, so the formatter converts it to `84912345678` (11 digits, valid). The test expectation `'8484912345678'` (12 digits, double country code) is wrong — it is asserting a bug. Any Vietnamese number stored with a redundant `0` before the country code (e.g., `(084)...`) will produce an invalid Zalo phone number that will fail at the API level.

**Fix:** Fix the formatter to also handle `084...` pattern:
```typescript
// After stripping non-numeric chars, strip any leading '0' before '84':
phone = phone.replace(/^0(84)/, '$1'); // 084xxx → 84xxx
```
And correct the test expectation to `'84912345678'`.

---

### WR-07: `ZaloZnsService.accessToken` is read at class instantiation time, not per-request

**File:** `backend/src/tuition/zalo-zns.service.ts:13`

**Issue:** `private readonly accessToken = process.env.ZALO_OA_ACCESS_TOKEN;` captures the env var at module initialization time. In production, Zalo OA access tokens expire (typically every 3 months) and may need to be rotated via a config reload or environment update without a full server restart. Because the value is captured once into a class field, a token rotation without restart would leave the service using the expired token.

**Fix:** Read the env var per call:
```typescript
async sendTemplate(payload: ...) {
  const accessToken = process.env.ZALO_OA_ACCESS_TOKEN;
  if (!accessToken) throw new Error('ZALO_OA_ACCESS_TOKEN not set');
  // use accessToken in headers
}
```

---

## Info

### IN-01: `dueDayOfMonth` not validated in service layer (only in DTO — which lacks decorators)

**File:** `backend/src/tuition/tuition.service.ts:38-45`

**Issue:** The service validates `pricePerSession > 0` but not `dueDayOfMonth` range (1–31). Combined with CR-01 (no DTO decorators), no server-side range check exists. This is partially addressed once CR-01 is fixed, but a defense-in-depth check in the service is also worth adding.

**Fix:** Add `if (dto.dueDayOfMonth < 1 || dto.dueDayOfMonth > 31) throw new BadRequestException(...)` in `createOrUpdateConfig`.

---

### IN-02: `TuitionRecord.status` is stored as enum but OVERDUE is computed — docs inconsistency

**File:** `docs/db/tuition.md:38`, `backend/prisma/schema.prisma:366-370`

**Issue:** The schema defines `TuitionStatus` with values `PENDING`, `PAID`, `OVERDUE`. The docs correctly note that OVERDUE is computed at query time and not stored. However the schema enum still includes `OVERDUE` as a valid value, which means the DB column can accept `OVERDUE` even though the application logic never writes it. This creates a semantic inconsistency: a future developer might write `OVERDUE` to the DB directly and bypass the computed logic.

**Fix:** Consider either removing `OVERDUE` from the enum (schema migration required) and computing it purely in application code, or adding a DB-level check constraint that the column only stores `PENDING` or `PAID` when written. At minimum, document the invariant clearly in the schema.

---

### IN-03: `session-counter.util.ts` loop mutates the loop variable `d` via `d.setDate()`

**File:** `backend/src/tuition/session-counter.util.ts:35`

**Issue:** The `for` loop uses `d.setDate(d.getDate() + 1)` to advance the date. `setDate` mutates the `Date` object in place. This is correct but subtle — the loop condition `d <= lastDay` compares Date objects by reference which coerces to numeric (milliseconds). The pattern works but is fragile; a refactor that copies `d` would break the loop. A cleaner pattern uses a numeric day counter.

**Fix:**
```typescript
for (let day = 1; day <= lastDay.getDate(); day++) {
  const dayOfWeek = new Date(year, month - 1, day).getDay();
  if (uniqueDays.has(dayOfWeek as 0|1|2|3|4|5|6)) count++;
}
```

---

### IN-04: `TuitionReportTable` `fetchReport` function is defined inside component but not wrapped in `useCallback` — eslint suppression masks the dependency issue

**File:** `frontend/app/admin/tuition/_components/TuitionReportTable.tsx:56`

**Issue:** `fetchReport` is a plain `async function` inside the component body. The `useEffect` at line 51 references it, but the function is not in the dependency array (the `eslint-disable-next-line react-hooks/exhaustive-deps` comment suppresses the warning). This means if `showToast` identity changes (unlikely but possible), the stale closure will be used. The correct pattern is to either inline the fetch inside `useEffect` or wrap `fetchReport` in `useCallback` with proper deps.

**Fix:**
```typescript
const fetchReport = useCallback(async () => {
  setLoading(true);
  try {
    const data = await getTuitionReport({ classId, month, year, statuses: statusFilter === 'ALL' ? undefined : [statusFilter] });
    setRows(data);
  } catch (err: unknown) {
    showToast(err instanceof Error ? err.message : 'Tải báo cáo thất bại', 'error');
  } finally {
    setLoading(false);
  }
}, [classId, month, year, statusFilter, showToast]);

useEffect(() => { fetchReport(); }, [fetchReport]);
```

---

_Reviewed: 2026-06-19T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
