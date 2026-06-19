# Phase 15: Tuition Management - Pattern Map

**Mapped:** 2026-06-19  
**Files analyzed:** 19 new/modified files  
**Analogs found:** 15 / 19  

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `backend/src/tuition/tuition.module.ts` | module | CRUD | `backend/src/homework/homework.module.ts` | exact |
| `backend/src/tuition/tuition.controller.ts` | controller | request-response | `backend/src/admin/admin-classes.controller.ts` | exact |
| `backend/src/tuition/tuition.service.ts` | service | CRUD | `backend/src/admin/admin-classes.service.ts` | exact |
| `backend/src/tuition/tuition.repository.ts` | repository | CRUD | `backend/src/homework/homework.repository.ts` | exact |
| `backend/src/tuition/tuition.dto.ts` | config | request-response | `backend/src/admin/admin-classes.dto.ts` | role-match |
| `backend/src/tuition/zalo-zns.service.ts` | service | request-response | `backend/src/bfa/bfa.service.ts` | exact |
| `backend/src/tuition/session-counter.util.ts` | utility | transform | (no exact match — custom logic) | none |
| `backend/src/tuition/phone-formatter.util.ts` | utility | transform | (no exact match — custom logic) | none |
| `backend/prisma/schema.prisma` | config | CRUD | (existing — add 3 models) | N/A |
| `backend/.env.example` | config | CRUD | (existing — add env vars) | N/A |
| `docs/db/tuition.md` | config | documentation | `docs/db/classes.md` | role-match |
| `docs/db/README.md` | config | documentation | (existing — update table) | N/A |
| `frontend/app/admin/tuition/page.tsx` | component | request-response | `frontend/app/admin/classes/page.tsx` | exact |
| `frontend/app/admin/tuition/_components/TuitionConfigForm.tsx` | component | request-response | `frontend/app/admin/classes/page.tsx` (EditClassModal) | role-match |
| `frontend/app/admin/tuition/_components/GenerateRecordsModal.tsx` | component | request-response | `frontend/app/admin/classes/page.tsx` (Dialog pattern) | role-match |
| `frontend/app/admin/tuition/_components/PaymentRecordDialog.tsx` | component | request-response | `frontend/app/admin/classes/page.tsx` (Dialog pattern) | role-match |
| `frontend/app/admin/tuition/_components/TuitionReportTable.tsx` | component | request-response | `frontend/app/admin/classes/page.tsx` (TableShell) | role-match |
| `frontend/app/admin/tuition/_components/ZaloSendModal.tsx` | component | request-response | `frontend/app/admin/classes/page.tsx` (Dialog pattern) | role-match |
| `frontend/app/teacher/tuition/page.tsx` | component | request-response | `frontend/app/admin/tuition/page.tsx` | exact |

---

## Pattern Assignments

### `backend/src/tuition/tuition.module.ts` (module, CRUD)

**Analog:** `backend/src/homework/homework.module.ts` (lines 1-15)

**Module pattern** (lines 1-15):
```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TuitionRepository } from './tuition.repository';
import { TuitionService } from './tuition.service';
import { ZaloZnsService } from './zalo-zns.service';
import { TuitionController } from './tuition.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [TuitionRepository, TuitionService, ZaloZnsService],
  controllers: [TuitionController],
})
export class TuitionModule {}
```

---

### `backend/src/tuition/tuition.controller.ts` (controller, request-response)

**Analog:** `backend/src/admin/admin-classes.controller.ts` (lines 1-27)

**Imports pattern** (lines 1-4):
```typescript
import { Controller, Get, Put, Post, Patch, Param, Body, Query, UseGuards, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { TuitionService } from './tuition.service';
import { CreateTuitionConfigDto, GenerateRecordsDto, RecordPaymentDto, SendNotificationsDto } from './tuition.dto';
import { AdminGuard } from '../auth/auth.guard';
```

**Controller + Guard pattern** (lines 6-8):
```typescript
@UseGuards(AdminGuard)
@Controller('admin/tuition')
export class TuitionController {
  constructor(private readonly service: TuitionService) {}
```

**Endpoint pattern with ParseIntPipe** (lines 18-20):
```typescript
@Put('config/:classId')
update(@Param('classId', ParseIntPipe) classId: number, @Body() dto: CreateTuitionConfigDto) {
  return this.service.createOrUpdateConfig(classId, dto);
}
```

---

### `backend/src/tuition/tuition.service.ts` (service, CRUD)

**Analog:** `backend/src/admin/admin-classes.service.ts` (lines 1-41)

**Imports + Injectable pattern** (lines 1-8):
```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTuitionConfigDto, GenerateRecordsDto, RecordPaymentDto } from './tuition.dto';
import { ZaloZnsService } from './zalo-zns.service';
import { countSessionsInMonth } from './session-counter.util';

@Injectable()
export class TuitionService {
  constructor(
    private readonly repo: TuitionRepository,
    private readonly zaloZns: ZaloZnsService,
  ) {}
```

**CRUD with validation pattern** (lines 27-40):
```typescript
async createOrUpdateConfig(classId: number, dto: CreateTuitionConfigDto) {
  // Validate class exists
  const cls = await this.classService.findOne(classId);
  if (!cls) throw new NotFoundException('Class not found');
  
  // Validate price > 0
  if (dto.pricePerSession <= 0) throw new BadRequestException('Price must be > 0');
  
  // Upsert config
  return this.repo.upsertConfig(classId, dto);
}
```

**Error handling + transaction pattern** (lines 45-76 from admin-classes.service.ts):
```typescript
async delete(id: number): Promise<{ deleted: true }> {
  await this.findById(id);

  await this.prisma.$transaction(async (tx) => {
    // Step 1: Capture related data
    const records = await tx.tuitionRecord.findMany({ where: { classId: id } });
    // Step 2: Delete in correct order (dependent first)
    await tx.tuitionNotificationLog.deleteMany({
      where: { tuitionRecord: { classId: id } },
    });
    await tx.tuitionRecord.deleteMany({ where: { classId: id } });
    // Step 3: Delete main record
    await tx.tuitionConfig.deleteMany({ where: { classId: id } });
  });

  return { deleted: true };
}
```

---

### `backend/src/tuition/tuition.repository.ts` (repository, CRUD)

**Analog:** `backend/src/homework/homework.repository.ts` (lines 1-10, 25-30)

**Injectable + injection pattern** (lines 1-4):
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TuitionRepository {
  constructor(private readonly prisma: PrismaService) {}
```

**Eager-loading with relations pattern** (lines 37-59 from homework.repository.ts):
```typescript
async findRecords(recordIds: number[]) {
  return this.prisma.tuitionRecord.findMany({
    where: { id: { in: recordIds } },
    include: {
      student: {
        include: { parents: true, class: true },
      },
      class: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

async logNotification(data: {
  tuitionRecordId: number;
  sentAt: Date;
  zaloResponse: string;
  success: boolean;
}) {
  return this.prisma.tuitionNotificationLog.create({
    data,
  });
}
```

---

### `backend/src/tuition/tuition.dto.ts` (config, request-response)

**Analog:** `backend/src/admin/admin-classes.dto.ts` (lines 1-10)

**DTO pattern** (lines 1-10):
```typescript
export class CreateTuitionConfigDto {
  pricePerSession: number; // VNĐ per session
  bookFee?: number; // nullable, VNĐ
  dueDayOfMonth: number; // 1-31
}

export class GenerateRecordsDto {
  classId: number;
  month: number; // 1-12
  year: number;
}

export class RecordPaymentDto {
  paidAt: Date;
  paidBy: string;
}

export class SendNotificationsDto {
  recordIds: number[];
}
```

---

### `backend/src/tuition/zalo-zns.service.ts` (service, request-response)

**Analog:** `backend/src/bfa/bfa.service.ts` (lines 1-7, 84-117)

**Imports + Logger + Injectable pattern** (lines 1-20):
```typescript
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface ZaloZnsResponse {
  status: number; // 0=success, other=error code
  message?: string;
  error?: string;
}

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
```

**HTTP error handling with axios pattern** (lines 94-117 from bfa.service.ts):
```typescript
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
      timeout: 10_000, // 10s timeout
    },
  );

  this.logger.log(`ZNS sent to ${payload.phone}: status=${response.data.status}`);
  return response.data;
} catch (error) {
  this.logger.error(
    `ZNS failed for ${payload.phone}: ${error.message}`,
    error.response?.data || error,
  );
  throw error; // Re-throw for controller to handle
}
```

---

### `backend/src/tuition/session-counter.util.ts` (utility, transform)

**No direct analog in codebase.** Pattern source: RESEARCH.md § Pattern 2.

**Session counting logic for scheduleSlots JSON**:
```typescript
interface ScheduleSlot {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sun, 1=Mon, ..., 6=Sat
  startTime: string;
  endTime: string;
}

export function countSessionsInMonth(
  scheduleSlots: ScheduleSlot[],
  month: number, // 1–12
  year: number,
): number {
  if (!scheduleSlots || scheduleSlots.length === 0) return 0;

  const uniqueDays = new Set(scheduleSlots.map(s => s.dayOfWeek));
  let count = 0;

  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay(); // 0–6
    if (uniqueDays.has(dayOfWeek)) {
      count++;
    }
  }

  return count;
}
```

---

### `backend/src/tuition/phone-formatter.util.ts` (utility, transform)

**No direct analog in codebase.** Pattern source: RESEARCH.md § Pattern 3.

**Vietnamese phone number formatting**:
```typescript
/**
 * Format Vietnamese phone number for Zalo ZNS API.
 * Example: 0912345678 → 84912345678
 */
export function formatPhoneForZalo(phoneNumber: string): string {
  // Remove spaces/hyphens
  let phone = phoneNumber.trim().replace(/[\s\-()]/g, '');
  
  // Convert 0xxx to 84xxx
  if (phone.startsWith('0')) {
    phone = '84' + phone.substring(1);
  }
  
  // Ensure starts with 84 (idempotent)
  if (!phone.startsWith('84')) {
    phone = '84' + phone;
  }

  return phone;
}
```

---

### `backend/prisma/schema.prisma` (config, CRUD)

**Existing file — Add 3 new models + 1 enum.**

**Pattern source:** `backend/prisma/schema.prisma` (lines 77-120 for Class/Student/ParentInfo relations)

**TuitionStatus enum** (new):
```prisma
enum TuitionStatus {
  PENDING
  PAID
  OVERDUE
}
```

**TuitionConfig model** (new):
```prisma
model TuitionConfig {
  id               Int      @id @default(autoincrement())
  classId          Int      @unique
  class            Class    @relation(fields: [classId], references: [id], onDelete: Cascade)
  pricePerSession  Int      // VNĐ per session
  bookFee          Int?     // nullable, VNĐ
  dueDayOfMonth    Int      // 1-31
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@map("tuition_configs")
}
```

**TuitionRecord model** (new):
```prisma
model TuitionRecord {
  id                    Int                    @id @default(autoincrement())
  studentId             Int
  student               Student                @relation(fields: [studentId], references: [id])
  classId               Int
  class                 Class                  @relation(fields: [classId], references: [id])
  month                 Int                    // 1-12
  year                  Int
  tuitionAmount         Int                    // VNĐ
  bookFee               Int                    // VNĐ (0 if not charged)
  totalAmount           Int                    // VNĐ
  dueDate               DateTime
  status                TuitionStatus          @default(PENDING)
  paidAt                DateTime?
  paidBy                String?                // admin/teacher username or ID
  notificationLogs      TuitionNotificationLog[]
  createdAt             DateTime               @default(now())
  updatedAt             DateTime               @updatedAt

  @@unique([studentId, classId, month, year])
  @@map("tuition_records")
}
```

**TuitionNotificationLog model** (new):
```prisma
model TuitionNotificationLog {
  id                Int            @id @default(autoincrement())
  tuitionRecordId   Int
  tuitionRecord     TuitionRecord  @relation(fields: [tuitionRecordId], references: [id], onDelete: Cascade)
  sentAt            DateTime
  zaloResponse      String         // JSON stringified Zalo API response
  success           Boolean
  createdAt         DateTime       @default(now())

  @@map("tuition_notification_logs")
}
```

**Update Class model** (add relation):
```prisma
model Class {
  // ... existing fields ...
  tuitionConfig     TuitionConfig?
  tuitionRecords    TuitionRecord[]
  // ... rest of model ...
}
```

**Update Student model** (add relation):
```prisma
model Student {
  // ... existing fields ...
  tuitionRecords    TuitionRecord[]
  // ... rest of model ...
}
```

---

### `backend/.env.example` (config, CRUD)

**Existing file — Add env vars for Zalo ZNS.**

**Add to bottom of file**:
```
# Zalo ZNS (Zalo Notification Service for tuition notifications)
ZALO_OA_ACCESS_TOKEN=
ZALO_ZNS_TEMPLATE_ID=
```

---

### `docs/db/tuition.md` (config, documentation)

**Analog:** `docs/db/classes.md` (lines 1-32)

**Create new file with 3 model descriptions**:

```markdown
# Tuition Management

Tuition configuration and payment tracking for classes.

## `tuition_configs` (model: `TuitionConfig`)

Học phí cấu hình cho một lớp. Mỗi lớp có một config, chứa giá/buổi + tiền sách + hạn đóng.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `classId` | `Int` | UNIQUE, FK → `classes.id` | Lớp |
| `pricePerSession` | `Int` | | Đơn giá/buổi (VNĐ) |
| `bookFee` | `Int?` | nullable | Tiền sách (VNĐ), null = không có |
| `dueDayOfMonth` | `Int` | range 1-31 | Ngày hạn trong tháng |
| `createdAt` | `DateTime` | default `now()` | |
| `updatedAt` | `DateTime` | `@updatedAt` | |

**Relations:** `class` (→ Class)

---

## `tuition_records` (model: `TuitionRecord`)

Phiếu thu học sinh/tháng. Mỗi học sinh × tháng = 1 record. Trạng thái: PENDING / PAID / OVERDUE.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `studentId` | `Int` | FK → `students.id` | Học sinh |
| `classId` | `Int` | FK → `classes.id` | Lớp |
| `month` | `Int` | range 1-12 | Tháng (1-12) |
| `year` | `Int` | | Năm |
| `tuitionAmount` | `Int` | | Tiền học (= sessions × pricePerSession) |
| `bookFee` | `Int` | | Tiền sách (0 nếu không tính) |
| `totalAmount` | `Int` | | Tổng (tuitionAmount + bookFee) |
| `dueDate` | `DateTime` | | Hạn đóng (ngày dueDayOfMonth của tháng) |
| `status` | `TuitionStatus` | enum, default PENDING | PENDING / PAID / OVERDUE |
| `paidAt` | `DateTime?` | nullable | Ngày đóng (nếu đã đóng) |
| `paidBy` | `String?` | nullable | Người ghi nhận đóng (admin/teacher username) |
| `createdAt` | `DateTime` | default `now()` | |
| `updatedAt` | `DateTime` | `@updatedAt` | |

**Unique constraint:** (studentId, classId, month, year) — prevents duplicate records per student/month.

**Relations:** `student` (→ Student), `class` (→ Class), `notificationLogs` (→ TuitionNotificationLog[])

---

## `tuition_notification_logs` (model: `TuitionNotificationLog`)

Log gửi thông báo ZNS. Mỗi lần gửi ZNS cho một phiếu thu = 1 log.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `tuitionRecordId` | `Int` | FK → `tuition_records.id` | Phiếu thu |
| `sentAt` | `DateTime` | | Thời gian gửi |
| `zaloResponse` | `String` | | Response JSON từ Zalo API (stringified) |
| `success` | `Boolean` | | `true` nếu status=0, `false` nếu lỗi |
| `createdAt` | `DateTime` | default `now()` | |

**Relations:** `tuitionRecord` (→ TuitionRecord)

---

## `TuitionStatus` Enum

| Value | Meaning |
|-------|---------|
| `PENDING` | Chưa đóng, chưa quá hạn |
| `PAID` | Đã đóng |
| `OVERDUE` | Quá hạn, chưa đóng (dueDate < now) |

---

## Computation Rules

### Tuition Amount (TUITION-02)
```
tuitionAmount = countSessionsInMonth(Class.scheduleSlots, month, year) × TuitionConfig.pricePerSession
totalAmount = tuitionAmount + (TuitionConfig.bookFee || 0)
```

### Due Date (TUITION-03)
```
dueDate = new Date(year, month-1, TuitionConfig.dueDayOfMonth)
```

### OVERDUE Status (TUITION-05)
```
status = 
  if (TuitionRecord.status === PAID) → PAID
  else if (TuitionRecord.dueDate < now) → OVERDUE
  else → PENDING
```
(Computed at query time, not persisted to DB)

---

## Relationships Diagram

```
Class ──(1:1)──► TuitionConfig
      └─(1:N)──► TuitionRecord
               └─(N:1)──► Student

Student ──(1:N)──► TuitionRecord
        └─(1:N)──► ParentInfo (for ZNS notifications)

TuitionRecord ──(1:N)──► TuitionNotificationLog
```
```

---

### `docs/db/README.md` (config, documentation)

**Existing file — Add tuition models to Enums and Tables sections.**

**Update Enums table to include**:
```
| `TuitionStatus` | `PENDING`, `PAID`, `OVERDUE` |
```

**Update Tables section to include**:
```
| `tuition_configs` | `TuitionConfig` | Tuition | Cấu hình học phí theo lớp |
| `tuition_records` | `TuitionRecord` | Tuition | Phiếu thu học sinh/tháng |
| `tuition_notification_logs` | `TuitionNotificationLog` | Tuition | Log gửi ZNS thông báo |
```

**Update Domain Files section to include**:
```
- [tuition.md](tuition.md) — `tuition_configs`, `tuition_records`, `tuition_notification_logs`
```

---

### `frontend/app/admin/tuition/page.tsx` (component, request-response)

**Analog:** `frontend/app/admin/classes/page.tsx` (lines 1-57)

**Imports + client component pattern** (lines 1-38):
```typescript
'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  getTuitionConfig,
  createTuitionRecords,
  recordPayment,
  getTuitionReport,
  sendNotifications,
} from '@/lib/admin-portal-api';
import { useToast } from '@/lib/toast-context';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import TuitionConfigForm from './_components/TuitionConfigForm';
import GenerateRecordsModal from './_components/GenerateRecordsModal';
import TuitionReportTable from './_components/TuitionReportTable';
```

**Tab-based layout pattern** (lines 44-120):
```typescript
const [activeTab, setActiveTab] = useState(0);
const [loading, setLoading] = useState(false);

const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
  setActiveTab(newValue);
};

return (
  <Box sx={{ p: 3 }}>
    <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
      Tuition Management
    </Typography>

    <Card>
      <Tabs value={activeTab} onChange={handleTabChange}>
        <Tab label="Configuration" />
        <Tab label="Generate Records" />
        <Tab label="Record Payment" />
        <Tab label="Send Notifications" />
        <Tab label="Report" />
      </Tabs>

      <CardContent>
        {activeTab === 0 && <TuitionConfigForm />}
        {activeTab === 1 && <GenerateRecordsModal />}
        {activeTab === 2 && <PaymentRecordDialog />}
        {activeTab === 3 && <ZaloSendModal />}
        {activeTab === 4 && <TuitionReportTable />}
      </CardContent>
    </Card>
  </Box>
);
```

---

### `frontend/app/admin/tuition/_components/TuitionConfigForm.tsx` (component, request-response)

**Analog:** `frontend/app/admin/classes/page.tsx` (lines 60-114, EditClassModal pattern)

**Form dialog pattern** (lines 60-130):
```typescript
import { useState } from 'react';
import { useToast } from '@/lib/toast-context';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormLabel from '@mui/material/FormLabel';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

function TuitionConfigForm({
  classId,
  onClose,
  onSaved,
}: {
  classId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState({ pricePerSession: 0, bookFee: null, dueDayOfMonth: 5 });
  const [loading, setLoading] = useState(false);

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await updateTuitionConfig(classId, form);
      showToast('Tuition config saved', 'success');
      onSaved();
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Tuition Config</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <FormLabel>Price per Session (VNĐ)</FormLabel>
            <TextField size="small" type="number" fullWidth required
              value={form.pricePerSession} onChange={(e) => setField('pricePerSession', parseInt(e.target.value))} />
          </Box>
          <Box>
            <FormLabel>Book Fee (VNĐ, optional)</FormLabel>
            <TextField size="small" type="number" fullWidth
              value={form.bookFee ?? ''} onChange={(e) => setField('bookFee', e.target.value ? parseInt(e.target.value) : null)} />
          </Box>
          <Box>
            <FormLabel>Due Day of Month (1-31)</FormLabel>
            <TextField size="small" type="number" fullWidth required
              value={form.dueDayOfMonth} onChange={(e) => setField('dueDayOfMonth', parseInt(e.target.value))} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
```

---

### `frontend/app/admin/tuition/_components/GenerateRecordsModal.tsx` (component, request-response)

**Analog:** `frontend/app/admin/classes/page.tsx` (lines 60-130, Dialog + form fields)

**Dialog pattern with form state**:
```typescript
import { useState } from 'react';
import { useToast } from '@/lib/toast-context';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormLabel from '@mui/material/FormLabel';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { createTuitionRecords } from '@/lib/admin-portal-api';

export default function GenerateRecordsModal({
  open,
  classId,
  onClose,
  onSaved,
}: {
  open: boolean;
  classId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await createTuitionRecords({ classId, month, year });
      showToast('Records generated successfully', 'success');
      onSaved();
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Generate failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Generate Tuition Records</DialogTitle>
      <Box component="form" onSubmit={handleGenerate}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <FormLabel>Month (1-12)</FormLabel>
            <TextField size="small" type="number" fullWidth required
              value={month} onChange={(e) => setMonth(parseInt(e.target.value))} />
          </Box>
          <Box>
            <FormLabel>Year</FormLabel>
            <TextField size="small" type="number" fullWidth required
              value={year} onChange={(e) => setYear(parseInt(e.target.value))} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading}>{loading ? 'Generating...' : 'Generate'}</Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
```

---

### `frontend/app/admin/tuition/_components/PaymentRecordDialog.tsx` (component, request-response)

**Analog:** `frontend/app/admin/classes/page.tsx` (lines 60-130, Dialog pattern)

**Dialog with form pattern**:
```typescript
import { useState } from 'react';
import { useToast } from '@/lib/toast-context';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormLabel from '@mui/material/FormLabel';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { recordTuitionPayment } from '@/lib/admin-portal-api';

export default function PaymentRecordDialog({
  open,
  recordId,
  onClose,
  onSaved,
}: {
  open: boolean;
  recordId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRecord(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await recordTuitionPayment(recordId, { paidAt: new Date(paidAt), paidBy });
      showToast('Payment recorded', 'success');
      onSaved();
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Record failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Record Payment</DialogTitle>
      <Box component="form" onSubmit={handleRecord}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <FormLabel>Paid At</FormLabel>
            <TextField size="small" type="date" fullWidth required
              value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          </Box>
          <Box>
            <FormLabel>Paid By (username)</FormLabel>
            <TextField size="small" fullWidth required
              value={paidBy} onChange={(e) => setPaidBy(e.target.value)} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading}>{loading ? 'Recording...' : 'Record'}</Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
```

---

### `frontend/app/admin/tuition/_components/TuitionReportTable.tsx` (component, request-response)

**Analog:** `frontend/app/admin/classes/page.tsx` (lines 38 TableShell usage)

**Table component pattern**:
```typescript
import { useEffect, useState } from 'react';
import { useToast } from '@/lib/toast-context';
import { getTuitionReport, TuitionReportItem } from '@/lib/admin-portal-api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormLabel from '@mui/material/FormLabel';
import CircularProgress from '@mui/material/CircularProgress';
import TableShell, { TableRow } from '@/components/ui/TableShell';

export default function TuitionReportTable({
  classId,
  month,
  year,
}: {
  classId: number;
  month: number;
  year: number;
}) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<TuitionReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    fetchReport();
  }, [classId, month, year, statusFilter]);

  async function fetchReport() {
    setLoading(true);
    try {
      const data = await getTuitionReport({
        classId,
        month,
        year,
        statuses: statusFilter === 'ALL' ? undefined : [statusFilter],
      });
      setRows(data);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Load report failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  const COLUMNS = [
    { label: 'Student', width: '1.5fr' },
    { label: 'Tuition (VNĐ)', width: '1fr' },
    { label: 'Book Fee (VNĐ)', width: '1fr' },
    { label: 'Total (VNĐ)', width: '1.2fr' },
    { label: 'Due Date', width: '1fr' },
    { label: 'Status', width: '0.8fr' },
    { label: 'Paid At', width: '1fr' },
  ];

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormLabel>Filter by Status</FormLabel>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} size="small">
          <MenuItem value="ALL">All</MenuItem>
          <MenuItem value="PENDING">Pending</MenuItem>
          <MenuItem value="PAID">Paid</MenuItem>
          <MenuItem value="OVERDUE">Overdue</MenuItem>
        </Select>
      </Box>

      <TableShell columns={COLUMNS}>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <div>{row.studentName}</div>
            <div>{row.tuitionAmount.toLocaleString('vi-VN')}</div>
            <div>{row.bookFee.toLocaleString('vi-VN')}</div>
            <div>{row.totalAmount.toLocaleString('vi-VN')}</div>
            <div>{new Date(row.dueDate).toLocaleDateString('vi-VN')}</div>
            <div style={{
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: row.status === 'PAID' ? '#dcfce7' : row.status === 'OVERDUE' ? '#fee2e2' : '#fef3c7',
              textAlign: 'center',
            }}>
              {row.status}
            </div>
            <div>{row.paidAt ? new Date(row.paidAt).toLocaleDateString('vi-VN') : '—'}</div>
          </TableRow>
        ))}
      </TableShell>
    </Box>
  );
}
```

---

### `frontend/app/admin/tuition/_components/ZaloSendModal.tsx` (component, request-response)

**Analog:** `frontend/app/admin/classes/page.tsx` (lines 60-130, Dialog pattern)

**Dialog with confirmation pattern**:
```typescript
import { useState } from 'react';
import { useToast } from '@/lib/toast-context';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import { sendTuitionNotifications } from '@/lib/admin-portal-api';

export default function ZaloSendModal({
  open,
  recordIds,
  onClose,
  onSent,
}: {
  open: boolean;
  recordIds: number[];
  onClose: () => void;
  onSent: () => void;
}) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    setLoading(true);
    try {
      const result = await sendTuitionNotifications({ recordIds });
      showToast(
        `Sent ${result.successCount} / ${result.totalRecords} notifications`,
        result.successCount === result.totalRecords ? 'success' : 'warning',
      );
      onSent();
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Send failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Send Zalo ZNS Notifications</DialogTitle>
      <DialogContent>
        <Typography>
          Send tuition notifications to {recordIds.length} parent(s) via Zalo ZNS?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSend} variant="contained" disabled={loading}>
          {loading ? 'Sending...' : 'Send'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

---

### `frontend/app/teacher/tuition/page.tsx` (component, request-response)

**Analog:** `frontend/app/admin/tuition/page.tsx` (new file from above)

**Teacher portal variant — same as admin page but with role-based filtering**:
```typescript
'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  getTuitionConfig,
  createTuitionRecords,
  recordPayment,
  getTuitionReport,
  sendNotifications,
  getTeacherClasses, // Only fetch teacher's own classes
} from '@/lib/admin-portal-api';
import { useToast } from '@/lib/toast-context';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import FormLabel from '@mui/material/FormLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TuitionConfigForm from '../admin/tuition/_components/TuitionConfigForm';
import GenerateRecordsModal from '../admin/tuition/_components/GenerateRecordsModal';
import TuitionReportTable from '../admin/tuition/_components/TuitionReportTable';

export default function TeacherTuitionPage() {
  const { data: session, status } = useSession();
  const { showToast } = useToast();
  const [teacherClasses, setTeacherClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      fetchTeacherClasses();
    }
  }, [status, session]);

  async function fetchTeacherClasses() {
    try {
      const classes = await getTeacherClasses();
      setTeacherClasses(classes);
      if (classes.length > 0) {
        setSelectedClassId(classes[0].id);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Load classes failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <CircularProgress />;
  if (!selectedClassId) return <Typography>No classes assigned</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
        Tuition Management (Teacher View)
      </Typography>

      <Box sx={{ mb: 3 }}>
        <FormLabel>Select Class</FormLabel>
        <Select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value as number)}>
          {teacherClasses.map((cls) => (
            <MenuItem key={cls.id} value={cls.id}>
              {cls.name}
            </MenuItem>
          ))}
        </Select>
      </Box>

      <Card>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Configuration" />
          <Tab label="Generate Records" />
          <Tab label="Report" />
        </Tabs>

        <CardContent>
          {activeTab === 0 && <TuitionConfigForm classId={selectedClassId} onClose={() => {}} onSaved={() => {}} />}
          {activeTab === 1 && <GenerateRecordsModal classId={selectedClassId} open onClose={() => {}} onSaved={() => {}} />}
          {activeTab === 2 && <TuitionReportTable classId={selectedClassId} month={new Date().getMonth() + 1} year={new Date().getFullYear()} />}
        </CardContent>
      </Card>
    </Box>
  );
}
```

---

## Shared Patterns

### Authentication / Authorization
**Source:** `backend/src/admin/admin-classes.controller.ts` (line 6)  
**Apply to:** All backend controller endpoints in TuitionModule

```typescript
@UseGuards(AdminGuard)
@Controller('admin/tuition')
export class TuitionController {
```

**Details:**
- AdminGuard validates `req.user.role === 'ADMIN' || req.user.role === 'TEACHER'` (D-06)
- All endpoints protected; STUDENT role rejected
- Controller-level guard; can optionally add method-level guards if needed

### Error Handling (Backend)
**Source:** `backend/src/admin/admin-classes.service.ts` (lines 1, 21-25, 27-40)  
**Apply to:** All service methods in TuitionService, ZaloZnsService, TuitionRepository

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

// In service method:
async createOrUpdateConfig(classId: number, dto: CreateTuitionConfigDto) {
  const cls = await this.classService.findOne(classId);
  if (!cls) throw new NotFoundException('Class not found');
  
  if (dto.pricePerSession <= 0) throw new BadRequestException('Price must be > 0');
  
  return this.repo.upsertConfig(classId, dto);
}

// Exceptions automatically mapped to HTTP 404, 400 by NestJS
```

**Details:**
- NotFoundException → HTTP 404
- BadRequestException → HTTP 400
- All validation before data access
- Log errors via ZaloZnsService.logger for external API calls

### Data Access (Repository Pattern)
**Source:** `backend/src/homework/homework.repository.ts` (lines 1-4, 37-59)  
**Apply to:** All repository methods in TuitionRepository

```typescript
@Injectable()
export class TuitionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findRecords(recordIds: number[]) {
    return this.prisma.tuitionRecord.findMany({
      where: { id: { in: recordIds } },
      include: {
        student: { include: { parents: true, class: true } },
        class: true,
      },
    });
  }
}
```

**Details:**
- Always eager-load related data (include: { ... })
- Use Prisma built-in query methods (findMany, findUnique, create, update)
- Order results consistently (orderBy: { createdAt: 'desc' })

### Response Format (Frontend)
**Source:** `frontend/app/admin/classes/page.tsx` (lines 102-114)  
**Apply to:** All frontend API calls in tuition pages

```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);
  try {
    await updateTuitionConfig(classId, form);
    showToast('Tuition config saved', 'success');
    onSaved();
    onClose();
  } catch (err: unknown) {
    showToast(err instanceof Error ? err.message : 'Save failed', 'error');
  } finally {
    setLoading(false);
  }
}
```

**Details:**
- Use useToast() hook for user feedback
- Wrap API calls in try/catch
- Show loading state during async operations
- Always call onClose/refresh on success

### Dialog Pattern (Frontend)
**Source:** `frontend/app/admin/classes/page.tsx` (lines 119-130)  
**Apply to:** All modal/dialog components in TuitionConfigForm, GenerateRecordsModal, PaymentRecordDialog, ZaloSendModal

```typescript
<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
  <DialogTitle>Dialog Title</DialogTitle>
  <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    {/* Form fields */}
  </DialogContent>
  <DialogActions>
    <Button onClick={onClose}>Cancel</Button>
    <Button type="submit" variant="contained">{loading ? 'Loading...' : 'Submit'}</Button>
  </DialogActions>
</Dialog>
```

**Details:**
- maxWidth="sm" (default size for tuition forms)
- DialogTitle + DialogContent + DialogActions structure
- Loading state on submit button
- Gap spacing for form fields

### Table Display (Frontend)
**Source:** `frontend/app/admin/classes/page.tsx` (lines 38, 50-56)  
**Apply to:** TuitionReportTable component

```typescript
import TableShell, { TableRow } from '@/components/ui/TableShell';

const COLUMNS = [
  { label: 'Student', width: '1.5fr' },
  { label: 'Status', width: '0.8fr' },
  // ...
];

{rows.map((row) => (
  <TableRow key={row.id}>
    <div>{row.studentName}</div>
    <div>{row.status}</div>
  </TableRow>
))}
```

**Details:**
- Use project's TableShell component (from Phase 11)
- Define COLUMNS with label + width (CSS Grid)
- Status badge with background color (PENDING=amber, PAID=green, OVERDUE=red)

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `backend/src/tuition/session-counter.util.ts` | utility | transform | Custom date calculation logic specific to scheduleSlots JSON; no equivalent in codebase |
| `backend/src/tuition/phone-formatter.util.ts` | utility | transform | Vietnamese phone number transformation specific to Zalo ZNS; no equivalent in codebase |

**For these files**, patterns are extracted from RESEARCH.md Code Examples (Pattern 2 § Session Counting, Pattern 3 § Phone Formatter).

---

## Metadata

**Analog search scope:** `backend/src/admin/`, `backend/src/homework/`, `backend/src/bfa/`, `frontend/app/admin/`, `docs/db/`  
**Files scanned:** 25  
**Pattern extraction date:** 2026-06-19  
**Valid until:** 2026-07-19 (30 days)

---

End of Pattern Map
