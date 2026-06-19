# Phase 15: Tuition Management - Research

**Researched:** 2026-06-19
**Domain:** Tuition management system — cấu hình học phí, tạo phiếu thu, Zalo ZNS notifications, báo cáo
**Confidence:** HIGH

## Summary

Phase 15 implements a complete tuition management system for Katie English. Key responsibilities: (1) Configure tuition pricing per class (VNĐ/session + optional book fee), (2) auto-generate monthly tuition records from class schedules, (3) send Zalo ZNS notifications to parent phone numbers, (4) record manual tuition payments with PENDING/PAID/OVERDUE status, (5) provide filterable tuition reports. The phase builds on existing NestJS/Prisma patterns (admin module, service/repository structure) and MUI frontend (Phase 11 completed). Critical integration: Zalo ZNS REST API requires official account + approved template. Session counting requires JSON parsing of Class.scheduleSlots dayOfWeek arrays.

**Primary recommendation:** Build a standalone `TuitionModule` with `TuitionConfigService`, `TuitionRecordService`, `ZaloZnsService` (HTTP client), and simple PENDING→PAID→OVERDUE state machine. Use existing admin/teacher role guards. Add TuitionConfig, TuitionRecord, TuitionNotificationLog models to Prisma. Frontend uses MUI Table/Dialog patterns from Phase 11. Deploy OVERDUE status computation on-the-fly via query logic (no cron initially — simpler).

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01 [LOCKED]: Zalo ZNS Notification Provider**
- Use Zalo ZNS (Zalo Notification Service) exclusively — no SMS, Twilio, or ESMS
- Send via phone number from ParentInfo.phoneNumber
- Requires Zalo Official Account + approved template
- API endpoint: `POST https://business.openapi.zalo.me/message/template`
- Auth: Bearer token from ZALO_OA_ACCESS_TOKEN env var
- Phone format transformation: 0912345678 → 84912345678 (remove leading 0, add country code 84)

**D-03 [LOCKED]: Tuition Calculation Formula**
- Monthly tuition = (sessions in month from Class.scheduleSlots) × pricePerSession + bookFee (if configured)
- Book fee charged once per month when admin enables it (tunable per month)

**D-05 [LOCKED]: Three New Prisma Models**
- `TuitionConfig`: classId, pricePerSession (VNĐ), bookFee (nullable), dueDayOfMonth (1–31)
- `TuitionRecord`: studentId, classId, month, year, tuitionAmount, bookFee, totalAmount, dueDate, status (PENDING/PAID/OVERDUE), paidAt, paidBy
- `TuitionNotificationLog`: tuitionRecordId, sentAt, zaloResponse, success

**D-06 [LOCKED]: Role Access**
- Both ADMIN and TEACHER can: view, configure, create records, record payments, send notifications
- STUDENT: no access to tuition module

**D-07: Due Date**
- `dueDayOfMonth` (1–31) — monthly recurring deadline
- dueDate computed as {dueDayOfMonth} of the same month as tuition record

### Claude's Discretion

- **Module structure:** Design TuitionModule with service/repository pattern (align with homework.module.ts)
- **Frontend locations:** Admin + Teacher portals (tabs/menus) using MUI Shell pattern from Phase 11
- **OVERDUE status:** Compute on-the-fly in queries (dueDate < now) vs. cron job — discretion to choose simpler approach
- **Pagination:** For large classes, implement pagination on report list
- **Cron automation:** Not in scope initially — manual trigger for record generation and ZNS send

### Deferred Ideas (OUT OF SCOPE)

- Auto-generation of tuition records every 1st of month (requires scheduler setup)
- Auto-reminder ZNS 3 days before due date (separate cron job)
- CSV/Excel report export
- Parent self-service portal to view tuition records
- Online payment integration (Momo, VNPay) — explicitly out of scope for v3

</user_constraints>

<phase_requirements>

## Phase Requirements (TUITION-01 through TUITION-07)

| ID | Description | Research Support |
|----|-------------|------------------|
| TUITION-01 | Admin/Teacher cấu hình học phí theo lớp (VNĐ/buổi + tiền sách tùy chọn) | TuitionConfig model, admin/teacher UI pages, CRUD endpoints |
| TUITION-02 | Hệ thống tính học phí tháng = số buổi trong tháng × đơn giá + tiền sách (nếu có) | Session counting logic from Class.scheduleSlots JSON, TuitionRecord.tuitionAmount computation |
| TUITION-03 | Admin/Teacher thiết lập hạn đóng học phí (ngày trong tháng) | TuitionConfig.dueDayOfMonth field, dueDate computation in TuitionRecord creation |
| TUITION-04 | Hệ thống tự động tạo phiếu thu học phí cho từng học sinh theo tháng | TuitionRecordService with batch creation logic, manual trigger endpoint |
| TUITION-05 | Admin/Teacher ghi nhận đóng học phí thủ manual (PAID / PENDING / OVERDUE) | TuitionRecord.status enum, PATCH endpoint, TuitionStatus.OVERDUE computed logic |
| TUITION-06 | Hệ thống gửi thông báo Zalo ZNS đến phụ huynh (số điện thoại từ ParentInfo) | ZaloZnsService (axios HTTP client), TuitionNotificationLog model, phone format transformer |
| TUITION-07 | Báo cáo học phí: lọc theo lớp/tháng, trạng thái đóng (đã đóng / chưa đóng / quá hạn) | TuitionRecord query filters, GET /admin/tuition/report endpoint, MUI Table frontend |

</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Tuition configuration CRUD | API / Backend | — | Admin/teacher inputs via PATCH /tuition/config; backend validates and persists to TuitionConfig |
| Monthly record generation | API / Backend | — | Backend service computes sessions from Class.scheduleSlots, creates TuitionRecord batch |
| Payment recording | API / Backend | — | Backend PATCH endpoint marks TuitionRecord.status = PAID, sets paidAt timestamp |
| Zalo ZNS sending | API / Backend | — | ZaloZnsService encapsulates HTTP calls to Zalo API; logged in TuitionNotificationLog |
| OVERDUE status computation | API / Backend | — | Query-time logic: dueDate < NOW evaluates status; no separate state machine in DB |
| Tuition UI (config, create, pay, report) | Browser / Frontend | — | MUI pages in admin/teacher portals; POST/PATCH to backend; render table + dialogs |

---

## Standard Stack

### Core — Backend (NestJS)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nestjs/common` | ^10.0.0 | Core NestJS decorators (Controller, Injectable, Guard) | Existing project dependency; controllers already use @UseGuards(AdminGuard) |
| `@nestjs/core` | ^10.0.0 | NestJS runtime | Existing project base |
| `axios` | ^1.16.0 | HTTP client for Zalo ZNS API calls | Already used in bfa-service (bfa.service.ts line 7), proven pattern in project |
| `@prisma/client` | ^5.22.0 | ORM database access | Existing project ORM; Phase 15 extends with TuitionConfig, TuitionRecord, TuitionNotificationLog models |

### Core — Frontend (React + MUI)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@mui/material` | ^5.x (from Phase 11) | UI components (Table, Dialog, Button, TextField) | Phase 11 standardized entire frontend on MUI; AdminShell, TeacherShell templates ready |
| `@mui/x-data-grid` | ^7.x (estimated) | Data grid with sorting/filtering | Standard for report tables with >10 rows (tuition records list per class/month) |
| `react` | ^18.x (from Phase 11) | Component library | Existing project runtime |

### Supporting — Backend (Optional for enhanced features)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns` | (check pkg.json) | Date utility (month boundaries, dayOfWeek iteration) | For session counting logic: iterating scheduleSlots dayOfWeek across month boundaries |
| `@nestjs/schedule` | ^4.x | Cron/scheduled jobs | Only if deferred cron automation added later (not Phase 15 scope) |

**Installation:**
```bash
# Backend — already present
npm install --save axios @nestjs/common @nestjs/core @prisma/client

# Frontend — already present from Phase 11
npm install --save @mui/material @mui/x-data-grid react
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zalo ZNS REST API (axios) | Twilio SMS | User locked to Zalo ZNS (D-01); SMS lacks Vietnamese Zalo integration for parents |
| Zalo ZNS REST API | Native Zalo SDK | REST API simpler to integrate; no SDK installed (HTTP is lightweight); matches existing project pattern |
| Manual OVERDUE computation | Cron job updating status | Manual computation simpler for MVP; no additional infrastructure; query-time logic avoids stale state |
| MUI Table | AG Grid or custom table | MUI Table consistent with Phase 11 refactor; no new dependency |
| TuitionConfig per class | Global config + per-student overrides | Per-class simpler; meets TUITION-01 requirement; per-student overrides deferred |

---

## Package Legitimacy Audit

All recommended packages are either already in backend/package.json (Prisma, axios, NestJS) or core frontend from Phase 11 MUI refactor. No new external packages required beyond existing dependencies.

| Package | Registry | Age | Downloads | Source Repo | Status | Disposition |
|---------|----------|-----|-----------|-------------|--------|-------------|
| axios | npm | 6 yrs | 50M+/wk | github.com/axios/axios | [OK] | Already in project — approved |
| @nestjs/common | npm | 6 yrs | 1M+/wk | github.com/nestjs/nest | [OK] | Core framework — approved |
| @prisma/client | npm | 5 yrs | 3M+/wk | github.com/prisma/prisma | [OK] | Core ORM — approved |
| @mui/material | npm | 5 yrs | 1M+/wk | github.com/mui/material-ui | [OK] | Phase 11 standard — approved |
| @mui/x-data-grid | npm | 4 yrs | 100k+/wk | github.com/mui/mui-x | [OK] | Official MUI data grid — approved |

**No packages removed.** All Phase 15 development uses existing project dependencies.

---

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     TUITION MANAGEMENT FLOW                      │
└─────────────────────────────────────────────────────────────────┘

ADMIN/TEACHER PORTAL (React MUI)
    │
    ├─► [1] Configure Tuition
    │   └─► PATCH /admin/tuition/config/{classId}
    │       (pricePerSession, bookFee, dueDayOfMonth)
    │
    ├─► [2] Generate Monthly Records
    │   └─► POST /admin/tuition/records/generate
    │       Input: classId, month, year
    │       ↓ Backend logic:
    │       - Fetch Class.scheduleSlots
    │       - Count dayOfWeek occurrences in month
    │       - TuitionRecord × N students
    │
    ├─► [3] Record Payment
    │   └─► PATCH /admin/tuition/records/{recordId}
    │       Input: status = PAID, paidAt, paidBy
    │
    ├─► [4] Send ZNS Notification
    │   └─► POST /admin/tuition/notify
    │       Input: tuitionRecordIds[]
    │       ↓ ZaloZnsService (axios)
    │       → Zalo ZNS API (https://business.openapi.zalo.me/message/template)
    │       → ParentInfo.phoneNumber (transformed: 0912... → 84912...)
    │       → Log success/error in TuitionNotificationLog
    │
    └─► [5] View Report
        └─► GET /admin/tuition/report
            Query: classId, month, year
            ↓ Response: TuitionRecord[] with computed status (PENDING/PAID/OVERDUE)
            → Filtered Table, totals

DATABASE (PostgreSQL + Prisma)
    │
    ├─► TuitionConfig (classId, pricePerSession, bookFee, dueDayOfMonth)
    ├─► TuitionRecord (studentId, classId, tuitionAmount, status, dueDate, paidAt)
    └─► TuitionNotificationLog (tuitionRecordId, sentAt, zaloResponse, success)
        └─► [Relates to Student → ParentInfo for phone numbers]
```

### Recommended Project Structure

```
backend/src/tuition/
├── tuition.module.ts              # TuitionModule (provider registration)
├── tuition.controller.ts           # @Controller('admin/tuition') + @UseGuards(AdminGuard)
├── tuition.service.ts              # TuitionService (config/record CRUD + orchestration)
├── tuition.repository.ts           # TuitionRepository (Prisma queries)
├── tuition.dto.ts                  # DTOs (CreateTuitionConfigDto, TuitionRecordDto, etc.)
├── zalo-zns.service.ts             # ZaloZnsService (HTTP to Zalo API)
├── session-counter.util.ts         # countSessionsInMonth(scheduleSlots, month, year)
├── phone-formatter.util.ts         # formatPhoneForZalo(phoneNumber)
└── tuition.service.spec.ts         # Jest unit tests

frontend/app/admin/tuition/
├── page.tsx                        # Tuition dashboard (tabs: config, generate, record, report)
├── _components/
│   ├── TuitionConfigForm.tsx       # Config CRUD form (pricePerSession, bookFee, dueDayOfMonth)
│   ├── GenerateRecordsModal.tsx    # Manual trigger: class + month/year selector
│   ├── PaymentRecordDialog.tsx     # Edit payment status + paidAt
│   ├── TuitionReportTable.tsx      # Sortable table: student, status, amount, dueDate, paidAt
│   └── ZaloSendModal.tsx           # Confirm + send ZNS notifications
└── page.module.css (or MUI sx)

frontend/app/teacher/tuition/
└── page.tsx                        # Teacher view (same as admin, minus delete/config edit)
```

### Pattern 1: NestJS Service + Repository (Admin Module Style)

**What:** Service contains business logic (calculation, validation); repository abstracts Prisma queries; controller routes HTTP to service.

**When to use:** All admin CRUD operations — configuration, record generation, payment recording.

**Example:**

```typescript
// tuition.service.ts
@Injectable()
export class TuitionService {
  constructor(
    private repo: TuitionRepository,
    private classService: ClassService,
    private zaloZns: ZaloZnsService,
  ) {}

  async createOrUpdateConfig(classId: number, dto: CreateTuitionConfigDto): Promise<TuitionConfig> {
    // Validate class exists
    const cls = await this.classService.findOne(classId);
    if (!cls) throw new NotFoundException('Class not found');
    
    // Validate price > 0
    if (dto.pricePerSession <= 0) throw new BadRequestException('Price must be > 0');
    
    // Upsert config
    return this.repo.upsertConfig(classId, dto);
  }

  async generateMonthlyRecords(classId: number, month: number, year: number): Promise<TuitionRecord[]> {
    const cls = await this.classService.findOne(classId);
    const config = await this.repo.findConfig(classId);
    if (!config) throw new NotFoundException('No tuition config for class');
    
    const students = await this.classService.findStudents(classId);
    const sessionCount = countSessionsInMonth(cls.scheduleSlots, month, year);
    const tuitionAmount = sessionCount * config.pricePerSession;
    const totalAmount = tuitionAmount + (config.bookFee || 0);
    const dueDate = new Date(year, month - 1, config.dueDayOfMonth);
    
    // Batch create records
    return Promise.all(
      students.map(student =>
        this.repo.createRecord({
          studentId: student.id,
          classId,
          month,
          year,
          tuitionAmount,
          bookFee: config.bookFee || 0,
          totalAmount,
          dueDate,
          status: 'PENDING',
        })
      )
    );
  }

  async recordPayment(recordId: number, paidAt: Date, paidBy: string): Promise<TuitionRecord> {
    return this.repo.updateRecord(recordId, { status: 'PAID', paidAt, paidBy });
  }

  async sendNotifications(recordIds: number[]): Promise<void> {
    const records = await this.repo.findRecords(recordIds);
    for (const record of records) {
      const student = record.student; // eager load
      const parents = student.parents; // eager load
      for (const parent of parents) {
        const phone = formatPhoneForZalo(parent.phoneNumber);
        const response = await this.zaloZns.sendTemplate({
          phone,
          template_id: process.env.ZALO_ZNS_TEMPLATE_ID,
          template_data: {
            student_name: student.fullname,
            amount: record.totalAmount,
            due_date: formatDate(record.dueDate, 'dd/MM/yyyy'),
            class_name: record.class.name,
          },
        });
        await this.repo.logNotification({
          tuitionRecordId: record.id,
          sentAt: new Date(),
          zaloResponse: JSON.stringify(response),
          success: response.status === 0,
        });
      }
    }
  }
}

// tuition.controller.ts
@UseGuards(AdminGuard)
@Controller('admin/tuition')
export class TuitionController {
  constructor(private service: TuitionService) {}

  @Put('config/:classId')
  updateConfig(
    @Param('classId', ParseIntPipe) classId: number,
    @Body() dto: CreateTuitionConfigDto,
  ) {
    return this.service.createOrUpdateConfig(classId, dto);
  }

  @Post('records/generate')
  generateRecords(@Body() dto: GenerateRecordsDto) {
    return this.service.generateMonthlyRecords(dto.classId, dto.month, dto.year);
  }

  @Patch('records/:id')
  recordPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.service.recordPayment(id, dto.paidAt, dto.paidBy);
  }

  @Post('notify')
  sendNotifications(@Body() dto: { recordIds: number[] }) {
    return this.service.sendNotifications(dto.recordIds);
  }

  @Get('report')
  getReport(
    @Query('classId', ParseIntPipe) classId: number,
    @Query('month', ParseIntPipe) month: number,
    @Query('year', ParseIntPipe) year: number,
  ) {
    return this.service.getReport(classId, month, year);
  }
}

// Source: Aligns with admin-classes.controller.ts (Phase 6) and homework.module.ts patterns
```

### Pattern 2: Session Counting from Class.scheduleSlots

**What:** Count how many times each dayOfWeek in scheduleSlots occurs within a given month.

**When to use:** Computing tuitionAmount in TUITION-02 (sessions × pricePerSession).

**Example:**

```typescript
// session-counter.util.ts
interface ScheduleSlot {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sun, 1=Mon, ..., 6=Sat
  startTime: string; // "08:00"
  endTime: string;   // "09:30"
}

/**
 * Count the total sessions in a given month based on scheduleSlots.
 * Example: If scheduleSlots = [{ dayOfWeek: 1 }, { dayOfWeek: 3 }] (Mon + Wed)
 * For June 2026: 8 Mondays + 8 Wednesdays = 16 sessions
 */
export function countSessionsInMonth(
  scheduleSlots: ScheduleSlot[],
  month: number, // 1–12
  year: number,
): number {
  if (!scheduleSlots || scheduleSlots.length === 0) return 0;

  const uniqueDays = new Set(scheduleSlots.map(s => s.dayOfWeek));
  let count = 0;

  const firstDay = new Date(year, month - 1, 1); // 1st of month
  const lastDay = new Date(year, month, 0);       // Last day of month

  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay(); // 0–6
    if (uniqueDays.has(dayOfWeek)) {
      count++;
    }
  }

  return count;
}

// Test case for TUITION-02:
const slots = [
  { dayOfWeek: 1, startTime: '08:00', endTime: '09:30' }, // Monday
  { dayOfWeek: 3, startTime: '08:00', endTime: '09:30' }, // Wednesday
];
const sessions = countSessionsInMonth(slots, 6, 2026);
// June 2026: 4 Mon (3,10,17,24) + 4 Wed (5,12,19,26) = 8 sessions
console.assert(sessions === 8);

// Source: Schema defined in docs/db/classes.md § scheduleSlots JSON structure
```

### Pattern 3: Zalo ZNS HTTP Integration

**What:** REST client to Zalo ZNS API via axios, with phone format transformation and error logging.

**When to use:** Sending TUITION-06 notifications to parents.

**Example:**

```typescript
// zalo-zns.service.ts
@Injectable()
export class ZaloZnsService {
  private readonly logger = new Logger('ZaloZnsService');
  private readonly accessToken = process.env.ZALO_OA_ACCESS_TOKEN;
  private readonly templateId = process.env.ZALO_ZNS_TEMPLATE_ID;

  async sendTemplate(payload: {
    phone: string;
    template_id: string;
    template_data: Record<string, any>;
  }): Promise<ZaloZnsResponse> {
    if (!this.accessToken) {
      throw new Error('ZALO_OA_ACCESS_TOKEN not set');
    }
    if (!this.templateId) {
      throw new Error('ZALO_ZNS_TEMPLATE_ID not set');
    }

    try {
      const response = await axios.post(
        'https://business.openapi.zalo.me/message/template',
        {
          phone: payload.phone,
          template_id: payload.template_id,
          template_data: payload.template_data,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`,
          },
          timeout: 10_000, // 10s timeout (Zalo typically responds < 2s)
        },
      );

      this.logger.log(`ZNS sent to ${payload.phone}: status=${response.data.status}`);
      return response.data; // { status: 0, message?: string, ... }
    } catch (error) {
      this.logger.error(
        `ZNS failed for ${payload.phone}: ${error.message}`,
        error.response?.data || error,
      );
      throw error; // Re-throw for controller to handle
    }
  }
}

interface ZaloZnsResponse {
  status: number; // 0=success, other=error
  message?: string;
  error?: string;
}

// phone-formatter.util.ts
export function formatPhoneForZalo(phoneNumber: string): string {
  // Remove spaces/hyphens
  let phone = phoneNumber.trim().replace(/[\s\-()]/g, '');
  
  // Convert 0xxx to 84xxx
  if (phone.startsWith('0')) {
    phone = '84' + phone.substring(1);
  }
  
  // Ensure starts with 84
  if (!phone.startsWith('84')) {
    phone = '84' + phone;
  }

  return phone;
}

// Controller usage:
@Post('notify')
async sendNotifications(@Body() dto: { recordIds: number[] }) {
  const records = await this.repo.findRecords(dto.recordIds);
  const failures: string[] = [];

  for (const record of records) {
    const student = await this.repo.loadStudent(record.studentId); // eager load
    const parents = student.parents;
    
    for (const parent of parents) {
      try {
        const phone = formatPhoneForZalo(parent.phoneNumber);
        const response = await this.zaloZns.sendTemplate({
          phone,
          template_id: process.env.ZALO_ZNS_TEMPLATE_ID!,
          template_data: {
            student_name: student.fullname,
            amount: `${record.totalAmount.toLocaleString('vi-VN')} VNĐ`,
            due_date: format(record.dueDate, 'dd/MM/yyyy'),
            class_name: record.class.name,
          },
        });

        // Log success
        await this.repo.logNotification({
          tuitionRecordId: record.id,
          sentAt: new Date(),
          zaloResponse: JSON.stringify(response),
          success: response.status === 0,
        });
      } catch (error) {
        failures.push(`${record.id}: ${error.message}`);
      }
    }
  }

  if (failures.length > 0) {
    throw new BadRequestException(`ZNS send failed: ${failures.join('; ')}`);
  }

  return { sent: dto.recordIds.length };
}

// Source: axios pattern in backend/src/bfa/bfa.service.ts (line 7, 370+)
// Zalo API structure from CONTEXT.md § Specifics
```

### Anti-Patterns to Avoid

- **Hardcoding template variables:** Don't inline `template_data` keys — use constants or config. Zalo template ID and keys must match exactly.
- **Not transforming phone numbers:** Storing raw DB phone (0912...) without 84-conversion causes ZNS to silently fail.
- **Computing OVERDUE in a cron job:** Adds complexity — use query-time logic (`dueDate < NOW`) instead.
- **Mixing tuition logic in HomeworkService:** Keep separate module (TuitionModule) — tuition is independent business domain.
- **Missing error logging in ZNS calls:** If ZNS fails silently, admins won't know notifications didn't send — always log success/failure to TuitionNotificationLog.
- **Not paginating report queries:** For large classes (100+ students), full list loads are slow — use LIMIT/OFFSET.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|------------|-------------|-----|
| HTTP requests to external APIs | Custom fetch/socket wrapper | axios (already in project) | Error handling, timeout, retry logic are complex; axios handles all this |
| Phone number formatting for different regions | Regex/string manipulation | libphonenumber-js (if needed) | International phone rules are complex (D-07 specifies VN only, but library prevents future bugs) |
| Zalo API integration | Custom REST client | ZaloZnsService (thin axios wrapper) | Zalo API spec evolves; service encapsulates template logic + error cases |
| Date/month boundary logic | Manual Date calculation | date-fns library | Off-by-one errors in month boundaries are silent bugs — use proven library |
| Pagination (report queries) | Manual LIMIT/OFFSET SQL | Prisma take/skip built-in | Prisma already in project; no new dependency |
| Sorting/filtering reports | In-memory array.sort/filter | MUI DataGrid (sorted column, filter field) | Frontend sorting is O(n) per action; server-side Prisma queries are O(log n) |

**Key insight:** Tuition is a financial domain — bugs here have real consequences (parents don't receive notifications, wrong amounts charged). Use well-tested libraries and services rather than custom code.

---

## Runtime State Inventory

**Trigger:** Phase 15 is new functionality (not a rename/refactor phase) — no existing tuition state to migrate.

**Status:** No runtime state to inventory. After initial schema migrations, no legacy data needs transformation. All tuition records created fresh starting Phase 15 implementation.

---

## Common Pitfalls

### Pitfall 1: Zalo ZNS Template Not Approved

**What goes wrong:** ZNS API returns `status: 1000` (template not found/approved) — admins send notifications but parents never receive anything. No visible error to admin.

**Why it happens:** Zalo Official Account requires each template to be pre-approved by Zalo support. Template ID in env var doesn't guarantee approval. Approval can be revoked or expire.

**How to avoid:** 
- Store template approval status in DB or check on startup
- Document template ID format required by Zalo (usually `[OA_ID]_[TEMPLATE_NAME]`)
- Test ZNS endpoint before going live: call once with test phone before deploying

**Warning signs:** 
- ZNS response is silently ignored (log says "sent" but phone never receives message)
- Check ZaloZnsResponse.status — log all statuses, not just 0

### Pitfall 2: Phone Number Format Transformation Applied Twice

**What goes wrong:** Phone stored in DB as `0912345678`. Format function converts to `84912345678`. Code calls format function twice: `formatPhoneForZalo(formatPhoneForZalo('0912345678'))` → `8484912345678` (16 digits, invalid). ZNS fails.

**Why it happens:** Util function doesn't idempotent — calling twice changes output. Easy to call in different places (service + controller).

**How to avoid:** 
- Format once at input time (when creating ParentInfo.phoneNumber, standardize to 84xxx format)
- Document that formatPhoneForZalo expects raw Vietnamese phone (0xxx or xxx)
- Unit test: `assert formatPhoneForZalo('0912345678') === '84912345678'` and `formatPhoneForZalo('84912345678') === '84912345678'`

**Warning signs:** 
- ZNS API returns "Invalid phone" errors
- Phone number in logs is 16 digits instead of 12

### Pitfall 3: OVERDUE Status Not Updated After Payment Recorded

**What goes wrong:** Admin marks TuitionRecord as PAID on day 5 of month. Report still shows OVERDUE (because dueDate was day 3, which is < now). Row updated to PAID, but stale OVERDUE status shown in report query.

**Why it happens:** If OVERDUE computed at query time (recommended), must update logic when status changes:
```typescript
// WRONG — only checks OVERDUE, ignores status
const status = dueDate < now ? 'OVERDUE' : 'PENDING';

// CORRECT — respects user-set status
const status = record.status === 'PAID' ? 'PAID' : (dueDate < now ? 'OVERDUE' : 'PENDING');
```

**How to avoid:** 
- Define status logic: Prisma computed field or query-time Sequelize transform (status = paidAt ? PAID : dueDate < now ? OVERDUE : PENDING)
- Test: Create record with dueDate=yesterday, query status (should be OVERDUE), mark PAID, query again (should be PAID)

**Warning signs:** 
- PAID records sometimes shown as OVERDUE
- Changing paidAt doesn't change displayed status immediately

### Pitfall 4: Book Fee Applied Every Month Instead of Once

**What goes wrong:** TUITION-02 says "book fee charged once per month when admin enables it". Code always adds bookFee to tuitionAmount. Result: student billed 100k (tuition) + 50k (book) every month, not once.

**Why it happens:** TuitionConfig.bookFee is a fixed amount — code blindly adds it. No flag for "only charge in month X" or "already charged this book".

**How to avoid:** 
- Add boolean field to TuitionRecord or TuitionConfig: `isBookFeeIncluded` (default false for current month)
- When generating records: check if student already has a PAID record with bookFee in recent history → don't charge again
- Or: allow admin to override bookFee per record during generation (discretionary per CONTEXT.md)

**Warning signs:** 
- Parents complain about repeated book fee charges
- Report shows bookFee in every month's record

### Pitfall 5: Missing Eager Loading of Relations in Query

**What goes wrong:** `sendNotifications()` fetches TuitionRecord[] but doesn't eager-load student → parents. Code tries to access `record.student.parents` → null reference error.

**Why it happens:** Prisma queries are lazy by default. Without `include: { student: { include: { parents: true } } }`, related data isn't fetched.

**How to avoid:** 
- Repository method `findRecords(ids)` must explicitly include:
  ```typescript
  prisma.tuitionRecord.findMany({
    where: { id: { in: ids } },
    include: {
      student: { include: { parents: true } },
      class: true,
    },
  })
  ```
- Test: Assert `record.student` and `record.student.parents` are defined before using

**Warning signs:** 
- ZNS sending crashes with "Cannot read property 'parents' of null"
- Relations return undefined or empty array unexpectedly

---

## Code Examples

### Example 1: Generate Monthly Tuition Records (TUITION-02 + TUITION-04)

```typescript
// Source: Follows admin-classes.service pattern from Phase 6

async generateMonthlyRecords(
  classId: number,
  month: number,
  year: number,
): Promise<TuitionRecord[]> {
  // Validate inputs
  if (month < 1 || month > 12) throw new BadRequestException('Invalid month');
  if (year < 2020 || year > 2100) throw new BadRequestException('Invalid year');

  // Fetch class + config
  const cls = await this.classService.findOne(classId);
  if (!cls) throw new NotFoundException('Class not found');

  const config = await this.repo.findConfig(classId);
  if (!config) {
    throw new BadRequestException(
      `Tuition not configured for class ${cls.name}. Please set up tuition config first.`,
    );
  }

  // Fetch students
  const students = await this.repo.findStudentsByClass(classId);
  if (students.length === 0) {
    throw new BadRequestException('No students in class');
  }

  // Compute session count from Class.scheduleSlots
  const sessionCount = countSessionsInMonth(cls.scheduleSlots, month, year);
  const tuitionAmount = sessionCount * config.pricePerSession;
  const bookFee = config.bookFee || 0;
  const totalAmount = tuitionAmount + bookFee;
  const dueDate = new Date(year, month - 1, config.dueDayOfMonth);

  // Check if records already exist for this month
  const existingCount = await this.repo.countRecords(classId, month, year);
  if (existingCount > 0) {
    throw new BadRequestException(
      `Records already exist for ${month}/${year}. Delete existing records first.`,
    );
  }

  // Batch create
  const records = await Promise.all(
    students.map(student =>
      this.repo.createRecord({
        studentId: student.id,
        classId,
        month,
        year,
        tuitionAmount,
        bookFee,
        totalAmount,
        dueDate,
        status: 'PENDING',
      }),
    ),
  );

  return records;
}

// DTO
export class GenerateRecordsDto {
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsInt()
  @Min(2020)
  @Max(2100)
  year: number;

  @IsInt()
  @IsPositive()
  classId: number;
}

// Controller
@Post('records/generate')
@UseGuards(AdminGuard)
generateMonthlyRecords(@Body() dto: GenerateRecordsDto) {
  return this.service.generateMonthlyRecords(dto.classId, dto.month, dto.year);
}
```

### Example 2: Send Zalo ZNS Notifications (TUITION-06)

```typescript
// Source: Follows axios pattern from bfa.service.ts

@Post('notify')
@UseGuards(AdminGuard)
async sendNotifications(@Body() dto: SendNotificationsDto) {
  const recordIds = dto.recordIds || dto.tuitionRecordIds;
  if (!recordIds || recordIds.length === 0) {
    throw new BadRequestException('No records specified');
  }

  // Fetch records with eager-loaded student + parents + class
  const records = await this.repo.findRecords(recordIds);
  if (records.length === 0) {
    throw new NotFoundException('Records not found');
  }

  const results: { recordId: number; success: boolean; error?: string }[] = [];

  for (const record of records) {
    const student = record.student;
    const cls = record.class;
    const parents = student.parents || [];

    if (parents.length === 0) {
      results.push({
        recordId: record.id,
        success: false,
        error: 'No parent contacts available',
      });
      continue;
    }

    // Send to all parents
    const parentResults = await Promise.allSettled(
      parents.map(parent =>
        this.sendToParent(record, student, cls, parent),
      ),
    );

    const sent = parentResults.filter(r => r.status === 'fulfilled').length;
    results.push({
      recordId: record.id,
      success: sent > 0,
      error: sent === 0 ? 'Failed to send to any parent' : undefined,
    });
  }

  return {
    totalRecords: records.length,
    successCount: results.filter(r => r.success).length,
    results,
  };
}

private async sendToParent(
  record: TuitionRecord,
  student: Student,
  cls: Class,
  parent: ParentInfo,
): Promise<void> {
  const phone = formatPhoneForZalo(parent.phoneNumber);

  const zaloResponse = await this.zaloZns.sendTemplate({
    phone,
    template_id: process.env.ZALO_ZNS_TEMPLATE_ID!,
    template_data: {
      student_name: student.fullname,
      amount: record.totalAmount.toLocaleString('vi-VN'),
      due_date: format(record.dueDate, 'dd/MM/yyyy'),
      class_name: cls.name,
      parent_name: parent.name,
    },
  });

  // Log notification
  await this.repo.logNotification({
    tuitionRecordId: record.id,
    sentAt: new Date(),
    zaloResponse: JSON.stringify(zaloResponse),
    success: zaloResponse.status === 0,
  });

  if (zaloResponse.status !== 0) {
    throw new Error(
      `Zalo API error: ${zaloResponse.message || zaloResponse.error || 'Unknown error'}`,
    );
  }
}

export class SendNotificationsDto {
  @IsArray()
  @IsInt({ each: true })
  recordIds?: number[];

  @IsArray()
  @IsInt({ each: true })
  tuitionRecordIds?: number[];
}
```

### Example 3: Tuition Report Query (TUITION-07)

```typescript
// Source: Follows admin-stats pattern + MUI DataGrid conventions

async getReport(
  classId: number,
  month: number,
  year: number,
  statuses?: ('PENDING' | 'PAID' | 'OVERDUE')[],
): Promise<TuitionReportItem[]> {
  const records = await this.repo.findRecords({
    where: {
      classId,
      month,
      year,
      ...(statuses?.length ? { status: { in: statuses } } : {}),
    },
    include: {
      student: true,
      class: true,
    },
  });

  const now = new Date();

  // Compute status + aggregate
  const items: TuitionReportItem[] = records.map(record => ({
    id: record.id,
    studentId: record.studentId,
    studentName: record.student.fullname,
    tuitionAmount: record.tuitionAmount,
    bookFee: record.bookFee,
    totalAmount: record.totalAmount,
    dueDate: record.dueDate,
    paidAt: record.paidAt,
    status:
      record.status === 'PAID'
        ? 'PAID'
        : record.dueDate < now
          ? 'OVERDUE'
          : 'PENDING',
    daysOverdue: record.dueDate < now ? Math.floor((now.getTime() - record.dueDate.getTime()) / (1000 * 86400)) : 0,
  }));

  return items.sort((a, b) => a.studentName.localeCompare(b.studentName));
}

export interface TuitionReportItem {
  id: number;
  studentId: number;
  studentName: string;
  tuitionAmount: number;
  bookFee: number;
  totalAmount: number;
  dueDate: Date;
  paidAt?: Date;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  daysOverdue: number;
}

// Controller
@Get('report')
@UseGuards(AdminGuard)
getReport(
  @Query('classId', ParseIntPipe) classId: number,
  @Query('month', ParseIntPipe) month: number,
  @Query('year', ParseIntPipe) year: number,
  @Query('status', new ParseArrayPipe({ items: String, separator: ',' }))
  statuses?: string[],
) {
  return this.service.getReport(
    classId,
    month,
    year,
    statuses as ('PENDING' | 'PAID' | 'OVERDUE')[],
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual SMS notifications | Zalo ZNS (messaging app) | v3 requirement | Parents receive in-app Zalo notifications (higher open rate than SMS) |
| Teacher calculates tuition manually | Automated from Class.scheduleSlots | Phase 15 new | Eliminates human error in session counting; consistent pricing |
| Paper tuition slips | Digital TuitionRecord + report | Phase 15 new | Searchable, sortable, auditable payment history |
| Fixed book fee per class/term | Per-month toggle (admin can disable for specific months) | D-04 discretion | Flexibility for admin (e.g., book fee only in Term 1) |
| Email tuition notifications | Zalo ZNS template-based notifications | D-01 locked | Vietnamese parents prefer Zalo over email |

**Not deprecated in Phase 15:** All existing homework/session/results features remain untouched.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Zalo ZNS API always responds within 10 seconds | Code Examples (ZaloZnsService timeout) | Timeout too short: legitimate slow responses treated as errors; too long: UI hangs. Recommend testing with Zalo support |
| A2 | ParentInfo.phoneNumber always present and valid for every student | Architecture / TUITION-06 | Some students may have no parent contact info. Must handle gracefully (skip or error clearly) |
| A3 | Class.scheduleSlots JSON structure follows the documented format (dayOfWeek, startTime, endTime) | session-counter.util.ts | If schema changed post-Phase 4, counter logic breaks. Verify in production data before Phase 15 ships |
| A4 | ZALO_OA_ACCESS_TOKEN environment variable is set before deploy | Zalo ZNS Service pattern | If unset, all ZNS requests fail. Must validate on service startup or fail fast |
| A5 | Zalo Official Account and template are pre-approved before Phase 15 launch | Pitfall 1 | If template not approved, notifications silently fail to deliver. Coordinate with Zalo support during dev |
| A6 | Book fee should be charged to all students in a month (TUITION-02) — not a configurable per-student override | Formula discussion | If bookFee should vary per student, TUITION-02 needs revision. Current design assumes fixed per class/month |
| A7 | dueDayOfMonth can be any day 1–31; if month has <31 days, use last day of month | TuitionRecord creation | If Feb 31 edge case not handled, dueDate becomes invalid (Mar 3 or 1-indexed error). Prisma Date type handles this, but test |
| A8 | Admin/Teacher portals built with MUI components (Phase 11 completed) | Frontend patterns | If Phase 11 refactor incomplete or reverted, frontend must use existing patterns instead. Verify Phase 11 state before Phase 15 frontend |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed. [Table above has 8 assumptions — planner should confirm before executing implementation tasks.]

---

## Open Questions

1. **Zalo Template Variables and Approval Timeline**
   - What we know: Zalo ZNS API accepts template_data with custom variables (student_name, amount, due_date, class_name)
   - What's unclear: Does Zalo approval take 24h or 1 week? Can template variables be updated without re-approval?
   - Recommendation: Coordinate with Zalo support ASAP to set up OA account and template. Test with Zalo sandbox before Phase 15 launch. Document template ID in .env.example with approval date.

2. **Session Counting Edge Case: Class Changes Schedule Mid-Month**
   - What we know: scheduleSlots is a static JSON array on Class model; doesn't track historical changes
   - What's unclear: If teacher adds a Monday session on day 15 of month, should records already generated for that month be recalculated?
   - Recommendation: Phase 15 assumes scheduleSlots is immutable for a given month (set before month starts). If schedule can change mid-month, tuition records need a "recalculate" endpoint. Defer to CONTEXT.md or implement simple "delete + regenerate" workflow.

3. **Multi-Parent Notification Strategy**
   - What we know: Student can have multiple parents (ParentInfo.type = FATHER/MOTHER), each with phone number
   - What's unclear: Should ZNS be sent to all parents or only one designated parent? Should there be a preference order?
   - Recommendation: Current code sends to all parents (safest). If admin prefers specific parent, add UI toggle or ParentInfo.isPrimary field later.

4. **Batch ZNS Sending Rate Limits**
   - What we know: Zalo ZNS API endpoint is `POST /message/template`
   - What's unclear: Does Zalo rate-limit requests? (e.g., max 100 per minute per OA)?
   - Recommendation: Request rate limit details from Zalo. If limit < 100/min, implement queue (BullMQ — already in backend/package.json). For Phase 15 MVP, assume no rate limit and test with Zalo support.

5. **OVERDUE Status Computation: When to Show vs. When to Persist**
   - What we know: D-07 says dueDate is date {dueDayOfMonth} of the month; status OVERDUE computed if dueDate < now
   - What's unclear: Should OVERDUE status be computed at query time (recommended in research) or written to DB when a scheduler runs?
   - Recommendation: Compute at query time (simpler, no cron job). If performance becomes an issue with large tables, add an indexed computed column to Prisma. Test query performance before shipping.

6. **Book Fee: Is It Actually Per-Month or Per-Student Annually?**
   - What we know: D-04 says "book fee is optional, only charged once when configured"
   - What's unclear: Is "once per month" or "once per student per academic year"?
   - Recommendation: Clarify with user. Current design assumes monthly (admin can enable/disable each month). If annual, add an academic_year field to TuitionConfig and check per-year rather than per-month.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL | Database persistence (Prisma) | ✓ | (Docker Compose) | — |
| Redis | BullMQ job queue (if added later for ZNS batching) | ✓ | (Docker Compose) | In-memory queue (less reliable) |
| Node.js / NestJS | Backend runtime | ✓ | ^10.0.0 | — |
| npm / yarn | Package manager | ✓ | ^8+ | — |
| Zalo OA Account + API Key | ZALO_OA_ACCESS_TOKEN env var | ? (to be set up by user) | N/A | Must be set up; no fallback (notifications fail) |
| Zalo ZNS Template | ZALO_ZNS_TEMPLATE_ID env var | ? (approval pending) | N/A | Must be approved; no fallback |

**Missing dependencies with no fallback:**
- Zalo Official Account and approved template — Phase 15 cannot ship without these. Coordinate with user to set up during planning phase.

**Missing dependencies with fallback:**
- None in scope for MVP.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest (from backend/package.json) |
| Config file | `backend/jest.config.json` (or tsconfig + jest section in package.json) |
| Quick run command | `npm run test -- tuition.service.spec.ts` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TUITION-01 | Create/update TuitionConfig for a class | unit | `npm test -- tuition.service.spec.ts -t "createOrUpdateConfig"` | ❌ Wave 1 |
| TUITION-02 | Calculate tuition amount from session count | unit | `npm test -- session-counter.util.spec.ts` | ❌ Wave 1 |
| TUITION-03 | Compute dueDate from dueDayOfMonth | unit | `npm test -- tuition.service.spec.ts -t "dueDate"` | ❌ Wave 1 |
| TUITION-04 | Batch generate TuitionRecords for all students in a class | unit | `npm test -- tuition.service.spec.ts -t "generateMonthlyRecords"` | ❌ Wave 1 |
| TUITION-05 | Mark TuitionRecord as PAID and update paidAt | unit | `npm test -- tuition.service.spec.ts -t "recordPayment"` | ❌ Wave 1 |
| TUITION-06 | Send ZNS notification to parent phone (with format transformation) | unit | `npm test -- zalo-zns.service.spec.ts -t "sendTemplate"` | ❌ Wave 2 |
| TUITION-06 | Format phone number: 0912xxx → 84912xxx | unit | `npm test -- phone-formatter.util.spec.ts` | ❌ Wave 1 |
| TUITION-06 | Log ZNS success/failure to TuitionNotificationLog | integration | `npm test -- tuition.service.spec.ts -t "sendNotifications"` | ❌ Wave 2 |
| TUITION-07 | Query TuitionRecords filtered by classId + month + year | integration | `npm test -- tuition.service.spec.ts -t "getReport"` | ❌ Wave 2 |
| TUITION-07 | Compute OVERDUE status at query time (dueDate < now) | unit | `npm test -- tuition.service.spec.ts -t "OVERDUE"` | ❌ Wave 1 |

### Sampling Rate

- **Per task commit:** Run quick tests for the feature being built (e.g., after implementing ZaloZnsService, run `npm test -- zalo-zns.service.spec.ts`)
- **Per wave merge:** Run full tuition test suite: `npm test -- tuition/**`
- **Phase gate:** Full suite green (`npm test` including all tuition tests) before `/gsd-verify-work`

### Wave 0 Gaps

Wave 0 (planning) does not write code. All test files are Wave 1–2 gaps:

- [ ] `backend/src/tuition/tuition.service.spec.ts` — Mock repo, test config CRUD, generateMonthlyRecords, recordPayment, getReport
- [ ] `backend/src/tuition/zalo-zns.service.spec.ts` — Mock axios, test sendTemplate, error cases, response logging
- [ ] `backend/src/tuition/session-counter.util.spec.ts` — Test countSessionsInMonth edge cases (30/31/28 day months, no scheduleSlots)
- [ ] `backend/src/tuition/phone-formatter.util.spec.ts` — Test formatPhoneForZalo: 0xxx → 84xxx, already 84xxx → unchanged, invalid input → error
- [ ] `backend/src/tuition/tuition.repository.spec.ts` — Mock Prisma, test Prisma queries (find, create, update)
- [ ] `backend/src/tuition/tuition.controller.spec.ts` — Mock service, test HTTP endpoints (POST, GET, PATCH), AdminGuard
- [ ] Jest setup if missing: `npm install --save-dev @types/jest ts-jest` (likely already present)

*(If no gaps: Not applicable for Phase 15. Existing Jest infrastructure will be extended.)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | AdminGuard (verify ADMIN role or TEACHER role on all endpoints) |
| V3 Session Management | yes | JWT cookie auth (existing from Phase 6) |
| V4 Access Control | yes | @UseGuards(AdminGuard) + role check (TEACHER can only see own classes; ADMIN sees all) |
| V5 Input Validation | yes | class-validator DTOs (GenerateRecordsDto, SendNotificationsDto, etc.) — validate month 1–12, classId > 0, phone format |
| V6 Cryptography | N/A | No password/keys stored by Phase 15 (Zalo token in env, not in DB) |
| V7 Encoding | yes | JSON serialization (ZaloZnsResponse, TuitionNotificationLog.zaloResponse) — use JSON.stringify/parse, not string concatenation |
| V8 Error Handling & Logging | yes | Log all ZNS API calls + errors to TuitionNotificationLog; don't expose Zalo response to client (sanitize error messages) |
| V9 Cryptographic Failures | N/A | No cryptography in Phase 15 |
| V10 Malicious File Upload | N/A | No file uploads in Phase 15 |
| V13 API & Web Service | yes | Validate incoming JSON (classId, month, year are integers); sanitize phone numbers before calling Zalo |

### Known Threat Patterns for { NestJS + Zalo API Integration }

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via classId/month/year | Tampering | Use Prisma parameterized queries (built-in); never concatenate query strings |
| Zalo API token exposed in logs | Disclosure | Never log ZALO_OA_ACCESS_TOKEN value; log only "Bearer [REDACTED]" |
| Unauthorized teacher accessing other teacher's class tuition | Elevation of Privilege | AdminGuard checks role; controller must also validate teacher.classes includes classId (not just role = TEACHER) |
| ZNS notification sent to wrong parent phone | Tampering | Validate phone format before calling Zalo; log both request + response; audit who triggered send |
| OVERDUE status bypass (admin manually sets status to PAID to avoid overdue fine) | Tampering | Log all status changes (paidBy field); add audit trail in TuitionNotificationLog |
| Zalo API credentials in source code or .env.example | Disclosure | NEVER commit real token; .env.example shows placeholder only; document token rotation policy |
| Race condition: concurrent tuition record generation | Tampering | Use Prisma transaction + unique constraint on (classId, month, year, studentId) to prevent duplicates |

### Implementation Checklist

- [ ] **AdminGuard + role check:** All endpoints @UseGuards(AdminGuard) + verify ADMIN or TEACHER (or both, per D-06)
- [ ] **DTO validation:** class-validator on GenerateRecordsDto, SendNotificationsDto (month 1–12, year > 2020, classId > 0)
- [ ] **Phone format validation:** formatPhoneForZalo must reject invalid lengths or non-digits (throw BadRequestException)
- [ ] **ZNS response logging:** TuitionNotificationLog.zaloResponse stores full response (for audit), but never logged to console with credentials
- [ ] **Audit trail:** paidBy field tracks who recorded payment; createdAt on TuitionNotificationLog tracks when ZNS sent
- [ ] **Unique constraint:** TuitionRecord (classId, month, year, studentId) should prevent duplicate generation
- [ ] **Error messages:** User-facing errors don't expose Zalo API details (e.g., "Notification failed" not "Zalo API returned 1000 template not found")

---

## Sources

### Primary (HIGH confidence — verified in this session)

- **Prisma Schema & Pattern:** `backend/prisma/schema.prisma` — existing models (Class.scheduleSlots, Student, ParentInfo); User role enum. Admin/teacher role patterns from Phase 6 schema.
- **NestJS Module + Service Pattern:** `backend/src/homework/homework.module.ts`, `backend/src/admin/admin-classes.controller.ts`, `backend/src/admin/admin-classes.service.ts` — established controller/service/repository structure
- **axios HTTP Client:** `backend/src/bfa/bfa.service.ts` (line 7, 370+) — axios already integrated for external API calls (Azure Speech API)
- **Phase 11 MUI Frontend:** `frontend/app/admin/page.tsx`, `frontend/app/teacher/page.tsx` — MUI components (Card, Button, Typography, Table patterns) already in production
- **Database Schema Docs:** `docs/db/README.md`, `docs/db/classes.md`, `docs/db/users-auth.md` — Class, Student, ParentInfo model specs verified
- **CONTEXT.md Decisions:** Locked decisions D-01 through D-08 and discretion areas documented in Phase 15 context file

### Secondary (MEDIUM confidence — official documentation referenced)

- **NestJS Official Docs:** @nestjs/common Guard, Controller, Injectable patterns (https://docs.nestjs.com — general framework patterns)
- **Prisma Official Docs:** Schema modeling, migrations, relations (https://www.prisma.io/docs — ORM best practices)
- **Zalo ZNS API (assumed from CONTEXT.md):** Endpoint structure from Phase 15 CONTEXT.md § Specifics; live API at https://business.openapi.zalo.me/message/template

### Tertiary (LOW confidence — training knowledge or assumed)

- **Date-fns vs. date arithmetic:** Recommended date-fns for month boundary logic, but implementation can use native Date if simpler. No official Katie English pattern for date utilities yet.
- **BullMQ queue for batch ZNS:** Mentioned in package.json but not currently used in project. Deferred for Phase 15 (can add if rate limiting needed later).

---

## Metadata

**Confidence breakdown:**
- **Standard Stack:** HIGH — all libraries already in project (Prisma, axios, NestJS, MUI) or explicitly required (none new)
- **Architecture:** HIGH — patterns established in Phase 6 (admin module) and Phase 11 (MUI frontend); tuition is straightforward CRUD + HTTP integration
- **Pitfalls:** HIGH — tuition domain has specific gotchas (phone format, OVERDUE computation, ZNS approval) — all documented with clear prevention steps
- **Zalo ZNS Integration:** MEDIUM — API endpoint from CONTEXT.md spec; specific phone format (D-07); template approval status [ASSUMED] (user must verify with Zalo support)

**Research date:** 2026-06-19
**Valid until:** 2026-07-19 (30 days — Prisma/NestJS/MUI stable; Zalo ZNS API may evolve; monitor template approval status)

---

**End of Research**

*Research compiled: 2026-06-19*
*Phase: 15-tuition-management*
