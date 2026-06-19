import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TuitionRepository } from './tuition.repository';
import { ZaloZnsService } from './zalo-zns.service';
import { CreateTuitionConfigDto, GenerateRecordsDto, RecordPaymentDto, SendNotificationsDto } from './tuition.dto';
import { countSessionsInMonth } from './session-counter.util';
import { formatPhoneForZalo } from './phone-formatter.util';

interface ScheduleSlot {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startTime: string;
  endTime: string;
}

export interface TuitionReportItem {
  id: number;
  studentId: number;
  studentName: string;
  tuitionAmount: number;
  bookFee: number;
  totalAmount: number;
  dueDate: Date;
  paidAt?: Date | null;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  daysOverdue: number;
}

@Injectable()
export class TuitionService {
  constructor(
    private readonly repo: TuitionRepository,
    private readonly zaloZns: ZaloZnsService,
  ) {}

  async getConfig(classId: number) {
    return this.repo.findConfig(classId);
  }

  async createOrUpdateConfig(classId: number, dto: CreateTuitionConfigDto) {
    if (classId <= 0) {
      throw new BadRequestException('classId must be > 0');
    }
    if (dto.pricePerSession <= 0) {
      throw new BadRequestException('pricePerSession must be > 0');
    }
    return this.repo.upsertConfig(classId, dto);
  }

  async generateMonthlyRecords(dto: GenerateRecordsDto) {
    const { classId, month, year } = dto;

    if (month < 1 || month > 12) {
      throw new BadRequestException('month must be between 1 and 12');
    }
    if (year < 2020) {
      throw new BadRequestException('year must be >= 2020');
    }

    const cls = await this.repo.findClassById(classId);
    if (!cls) {
      throw new NotFoundException(`Class ${classId} not found`);
    }

    const config = await this.repo.findConfig(classId);
    if (!config) {
      throw new NotFoundException(
        `No tuition config for class ${classId}. Please set up tuition config first.`,
      );
    }

    const students = await this.repo.findStudentsByClass(classId);
    if (students.length === 0) {
      throw new BadRequestException('No students in class');
    }

    const existingCount = await this.repo.countRecords(classId, month, year);
    if (existingCount > 0) {
      throw new BadRequestException(
        `Records already exist for ${month}/${year}. Delete existing records first.`,
      );
    }

    // Parse scheduleSlots from Json field — Prisma returns Prisma.JsonValue
    const rawSlots = cls.scheduleSlots;
    const scheduleSlots: ScheduleSlot[] = Array.isArray(rawSlots)
      ? (rawSlots as unknown as ScheduleSlot[])
      : typeof rawSlots === 'string'
        ? (JSON.parse(rawSlots) as ScheduleSlot[])
        : [];

    const sessionCount = countSessionsInMonth(scheduleSlots, month, year);
    const tuitionAmount = sessionCount * config.pricePerSession;
    const bookFee = config.bookFee ?? 0;
    const totalAmount = tuitionAmount + bookFee;
    const dueDate = new Date(year, month - 1, config.dueDayOfMonth);

    const records = await Promise.all(
      students.map((student) =>
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

  async recordPayment(recordId: number, dto: RecordPaymentDto) {
    return this.repo.updateRecord(recordId, {
      status: 'PAID',
      paidAt: new Date(dto.paidAt),
      paidBy: dto.paidBy,
    });
  }

  async sendNotifications(dto: SendNotificationsDto): Promise<{
    totalRecords: number;
    successCount: number;
    results: { recordId: number; success: boolean; error?: string }[];
  }> {
    const { recordIds } = dto;
    const records = await this.repo.findRecordsByIds(recordIds);

    const results: { recordId: number; success: boolean; error?: string }[] = [];

    for (const record of records) {
      const student = record.student as any;
      const cls = record.class as any;
      const parents: any[] = student?.parents ?? [];

      if (parents.length === 0) {
        results.push({
          recordId: record.id,
          success: false,
          error: 'No parent contacts available',
        });
        continue;
      }

      let atLeastOneSuccess = false;
      for (const parent of parents) {
        try {
          const phone = formatPhoneForZalo(parent.phoneNumber);
          const zaloResponse = await this.zaloZns.sendTemplate({
            phone,
            template_id: process.env.ZALO_ZNS_TEMPLATE_ID ?? '',
            template_data: {
              student_name: student.fullname,
              amount: (record.totalAmount as number).toLocaleString('vi-VN'),
              due_date: new Date(record.dueDate).toLocaleDateString('vi-VN'),
              class_name: cls.name,
              parent_name: parent.name,
            },
          });

          await this.repo.logNotification({
            tuitionRecordId: record.id,
            sentAt: new Date(),
            zaloResponse: JSON.stringify(zaloResponse),
            success: zaloResponse.status === 0,
          });

          if (zaloResponse.status === 0) {
            atLeastOneSuccess = true;
          }
        } catch (error) {
          // Partial send — log failure and continue to next parent
          await this.repo.logNotification({
            tuitionRecordId: record.id,
            sentAt: new Date(),
            zaloResponse: JSON.stringify({ error: error.message }),
            success: false,
          });
        }
      }

      results.push({
        recordId: record.id,
        success: atLeastOneSuccess,
        error: atLeastOneSuccess ? undefined : 'Failed to send to any parent',
      });
    }

    return {
      totalRecords: records.length,
      successCount: results.filter((r) => r.success).length,
      results,
    };
  }

  async getReport(
    classId: number,
    month: number,
    year: number,
    statuses?: string[],
  ): Promise<TuitionReportItem[]> {
    const records = await this.repo.findRecordsByReport(classId, month, year);
    const now = new Date();

    const items: TuitionReportItem[] = records.map((record) => {
      const student = record.student as any;
      const dueDate = new Date(record.dueDate);
      const effectiveStatus: 'PENDING' | 'PAID' | 'OVERDUE' =
        record.status === 'PAID'
          ? 'PAID'
          : dueDate < now
            ? 'OVERDUE'
            : 'PENDING';

      const daysOverdue =
        dueDate < now && record.status !== 'PAID'
          ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 86400))
          : 0;

      return {
        id: record.id,
        studentId: record.studentId,
        studentName: student?.fullname ?? '',
        tuitionAmount: record.tuitionAmount,
        bookFee: record.bookFee,
        totalAmount: record.totalAmount,
        dueDate,
        paidAt: record.paidAt,
        status: effectiveStatus,
        daysOverdue,
      };
    });

    // Filter by statuses if provided
    if (statuses && statuses.length > 0) {
      return items.filter((item) => statuses.includes(item.status));
    }

    return items;
  }
}
