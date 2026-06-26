import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';
import { ImportError, ImportResult, ImportErrorResult } from './import.dto';

// ─── Internal row types ───────────────────────────────────────────────────────

interface ClassRow {
  name: string;
  code: string;
  startDate: Date | string;
  endDate: Date | string;
  scheduleSlots: string;
  pricePerSession?: number;
  bookFee?: number;
  dueDayOfMonth?: number;
}

interface StudentRow {
  fullname: string;
  sex: string;
  dateOfBirth: Date | string;
  className: string;
  parentName?: string;
  parentPhone?: string;
  parentType?: string;
}

interface HomeworkRow {
  homework_name: string;
  part_name: string;
  word_text: string;
  word_highlight?: string;
}

// ─── Day abbreviation map ─────────────────────────────────────────────────────

const DAY_MAP: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Private helpers ────────────────────────────────────────────────────────

  private parseSheet(workbook: XLSX.WorkBook, sheetName: string): Record<string, unknown>[] {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[];
  }

  private parseClassesSheet(rows: Record<string, unknown>[]): ClassRow[] {
    return rows.map(row => ({
      name: String(row['name'] ?? '').trim(),
      code: String(row['code'] ?? '').trim(),
      startDate: row['startDate'] instanceof Date ? row['startDate'] : String(row['startDate'] ?? '').trim(),
      endDate: row['endDate'] instanceof Date ? row['endDate'] : String(row['endDate'] ?? '').trim(),
      scheduleSlots: String(row['scheduleSlots'] ?? '').trim(),
      pricePerSession: row['pricePerSession'] !== '' && row['pricePerSession'] != null
        ? Number(row['pricePerSession']) : undefined,
      bookFee: row['bookFee'] !== '' && row['bookFee'] != null
        ? Number(row['bookFee']) : undefined,
      dueDayOfMonth: row['dueDayOfMonth'] !== '' && row['dueDayOfMonth'] != null
        ? Number(row['dueDayOfMonth']) : undefined,
    }));
  }

  private parseStudentsSheet(rows: Record<string, unknown>[]): StudentRow[] {
    return rows.map(row => ({
      fullname: String(row['fullname'] ?? '').trim(),
      sex: String(row['sex'] ?? '').trim().toUpperCase(),
      dateOfBirth: row['dateOfBirth'] instanceof Date ? row['dateOfBirth'] : String(row['dateOfBirth'] ?? '').trim(),
      className: String(row['className'] ?? '').trim(),
      parentName: row['parentName'] !== '' && row['parentName'] != null
        ? String(row['parentName']).trim() : undefined,
      parentPhone: row['parentPhone'] !== '' && row['parentPhone'] != null
        ? String(row['parentPhone']).trim() : undefined,
      parentType: row['parentType'] !== '' && row['parentType'] != null
        ? String(row['parentType']).trim().toUpperCase() : undefined,
    }));
  }

  private parseHomeworkSheet(rows: Record<string, unknown>[]): HomeworkRow[] {
    return rows.map(row => ({
      homework_name: String(row['homework_name'] ?? '').trim(),
      part_name: String(row['part_name'] ?? '').trim(),
      word_text: String(row['word_text'] ?? '').trim(),
      word_highlight: row['word_highlight'] !== '' && row['word_highlight'] != null
        ? String(row['word_highlight']).trim() : undefined,
    }));
  }

  groupHomeworkRows(rows: HomeworkRow[]): Map<string, Map<string, HomeworkRow[]>> {
    const result = new Map<string, Map<string, HomeworkRow[]>>();
    for (const row of rows) {
      if (!result.has(row.homework_name)) result.set(row.homework_name, new Map());
      const parts = result.get(row.homework_name)!;
      if (!parts.has(row.part_name)) parts.set(row.part_name, []);
      parts.get(row.part_name)!.push(row);
    }
    return result;
  }

  private parseScheduleSlots(slotsStr: string): { dayOfWeek: number; startTime: string; endTime: string }[] {
    if (!slotsStr) return [];
    return slotsStr.split(',').map(s => {
      const parts = s.trim().split(/\s+/);
      const day = parts[0].toLowerCase();
      const dayOfWeek = DAY_MAP[day] ?? -1;
      const timeRange = parts[1] ?? '';
      const [startTime = '', endTime = ''] = timeRange.includes('-') ? timeRange.split('-') : ['', ''];
      return { dayOfWeek, startTime, endTime };
    }).filter(slot => slot.dayOfWeek >= 0);
  }

  private isValidTime(t: string): boolean {
    return /^\d{2}:\d{2}$/.test(t);
  }

  private generateClassCode(): string {
    return 'CLS' + Date.now().toString(36).toUpperCase();
  }

  private toDate(val: Date | string): Date | null {
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }

  private validateAll(
    classRows: ClassRow[],
    studentRows: StudentRow[],
    homeworkRows: HomeworkRow[],
    existingClassNames: Set<string>,
    existingStudentKeys: Set<string>,
  ): ImportError[] {
    const errors: ImportError[] = [];

    // ── Classes validation ────────────────────────────────────────────────────
    const seenClassNames = new Set<string>();
    classRows.forEach((row, idx) => {
      const rowNum = idx + 1;

      if (!row.name) {
        errors.push({ sheet: 'Classes', row: rowNum, column: 'name', message: 'name is required' });
      } else {
        if (existingClassNames.has(row.name)) {
          errors.push({ sheet: 'Classes', row: rowNum, column: 'name', message: `Class "${row.name}" already exists in DB` });
        } else if (seenClassNames.has(row.name)) {
          errors.push({ sheet: 'Classes', row: rowNum, column: 'name', message: `Duplicate class name "${row.name}" in file` });
        }
        seenClassNames.add(row.name);
      }

      if (!row.startDate) {
        errors.push({ sheet: 'Classes', row: rowNum, column: 'startDate', message: 'startDate is required' });
      } else {
        const d = this.toDate(row.startDate);
        if (!d) errors.push({ sheet: 'Classes', row: rowNum, column: 'startDate', message: 'startDate is not a valid date' });
      }

      if (!row.endDate) {
        errors.push({ sheet: 'Classes', row: rowNum, column: 'endDate', message: 'endDate is required' });
      } else {
        const d = this.toDate(row.endDate);
        if (!d) errors.push({ sheet: 'Classes', row: rowNum, column: 'endDate', message: 'endDate is not a valid date' });
      }

      if (row.scheduleSlots) {
        const slots = this.parseScheduleSlots(row.scheduleSlots);
        const rawTokens = row.scheduleSlots.split(',');
        rawTokens.forEach((token, ti) => {
          const parts = token.trim().split(/\s+/);
          if (parts.length > 1) {
            const timeRange = parts[1];
            const [start, end] = timeRange.split('-');
            if (!this.isValidTime(start)) {
              errors.push({ sheet: 'Classes', row: rowNum, column: 'scheduleSlots', message: `scheduleSlots token ${ti + 1}: startTime "${start}" must be HH:MM` });
            }
            if (!this.isValidTime(end ?? '')) {
              errors.push({ sheet: 'Classes', row: rowNum, column: 'scheduleSlots', message: `scheduleSlots token ${ti + 1}: endTime "${end ?? ''}" must be HH:MM` });
            }
          }
        });
        if (slots.length === 0) {
          errors.push({ sheet: 'Classes', row: rowNum, column: 'scheduleSlots', message: 'scheduleSlots has no valid day names (use Mon,Tue,Wed,Thu,Fri,Sat,Sun)' });
        }
      }

      if (row.pricePerSession !== undefined) {
        if (isNaN(row.pricePerSession)) {
          errors.push({ sheet: 'Classes', row: rowNum, column: 'pricePerSession', message: 'pricePerSession must be a number' });
        }
        if (row.dueDayOfMonth === undefined) {
          errors.push({ sheet: 'Classes', row: rowNum, column: 'dueDayOfMonth', message: 'dueDayOfMonth is required when pricePerSession is set' });
        } else if (row.dueDayOfMonth < 1 || row.dueDayOfMonth > 31) {
          errors.push({ sheet: 'Classes', row: rowNum, column: 'dueDayOfMonth', message: 'dueDayOfMonth must be between 1 and 31' });
        }
      }
    });

    // ── Students validation ───────────────────────────────────────────────────
    const allClassNames = new Set([...existingClassNames, ...seenClassNames]);
    const seenStudentKeys = new Set<string>();

    studentRows.forEach((row, idx) => {
      const rowNum = idx + 1;

      if (!row.fullname) {
        errors.push({ sheet: 'Students', row: rowNum, column: 'fullname', message: 'fullname is required' });
      }

      if (!row.sex) {
        errors.push({ sheet: 'Students', row: rowNum, column: 'sex', message: 'sex is required' });
      } else if (row.sex !== 'M' && row.sex !== 'F') {
        errors.push({ sheet: 'Students', row: rowNum, column: 'sex', message: 'sex must be M or F' });
      }

      if (!row.dateOfBirth) {
        errors.push({ sheet: 'Students', row: rowNum, column: 'dateOfBirth', message: 'dateOfBirth is required' });
      } else {
        const d = this.toDate(row.dateOfBirth);
        if (!d) errors.push({ sheet: 'Students', row: rowNum, column: 'dateOfBirth', message: 'dateOfBirth is not a valid date' });
      }

      if (!row.className) {
        errors.push({ sheet: 'Students', row: rowNum, column: 'className', message: 'className is required' });
      } else if (!allClassNames.has(row.className)) {
        errors.push({ sheet: 'Students', row: rowNum, column: 'className', message: `Class "${row.className}" not found` });
      }

      if (row.fullname && row.className) {
        const key = `${row.fullname}|${row.className}`;
        if (existingStudentKeys.has(key)) {
          errors.push({ sheet: 'Students', row: rowNum, column: 'fullname', message: `Student "${row.fullname}" already exists in class "${row.className}"` });
        } else if (seenStudentKeys.has(key)) {
          errors.push({ sheet: 'Students', row: rowNum, column: 'fullname', message: `Duplicate student "${row.fullname}" in class "${row.className}" in file` });
        }
        seenStudentKeys.add(key);
      }

      if (row.parentPhone && !row.parentType) {
        errors.push({ sheet: 'Students', row: rowNum, column: 'parentType', message: 'parentType is required when parentPhone is provided' });
      }
    });

    // ── Homework validation ───────────────────────────────────────────────────
    homeworkRows.forEach((row, idx) => {
      const rowNum = idx + 1;
      if (!row.homework_name) {
        errors.push({ sheet: 'Homework', row: rowNum, column: 'homework_name', message: 'homework_name is required' });
      }
      if (!row.part_name) {
        errors.push({ sheet: 'Homework', row: rowNum, column: 'part_name', message: 'part_name is required' });
      }
      if (!row.word_text) {
        errors.push({ sheet: 'Homework', row: rowNum, column: 'word_text', message: 'word_text is required' });
      }
    });

    return errors;
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  async processUpload(
    buffer: Buffer,
    user: { id: number; role: string },
    filename?: string,
  ): Promise<ImportResult | ImportErrorResult> {
    // File extension guard (IMPORT-07)
    if (filename && !filename.endsWith('.xlsx')) {
      throw new BadRequestException('Only .xlsx files are accepted');
    }

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    } catch {
      throw new BadRequestException('Invalid .xlsx file');
    }

    // Parse sheets
    const rawClassRows = this.parseSheet(workbook, 'Classes');
    const rawStudentRows = this.parseSheet(workbook, 'Students');
    const rawHomeworkRows = this.parseSheet(workbook, 'Homework');

    const classRows = this.parseClassesSheet(rawClassRows);
    const studentRows = this.parseStudentsSheet(rawStudentRows);
    const homeworkRows = this.parseHomeworkSheet(rawHomeworkRows);

    // Fetch existing data for duplicate checks
    const existingClasses = await this.prisma.class.findMany({ select: { name: true } });
    const existingClassNames = new Set(existingClasses.map(c => c.name));

    const existingStudents = await this.prisma.student.findMany({
      select: { fullname: true, class: { select: { name: true } } },
    });
    const existingStudentKeys = new Set(
      existingStudents
        .filter(s => s.class)
        .map(s => `${s.fullname}|${s.class!.name}`),
    );

    // Validate all — collect-all-errors strategy (D-06)
    const errors = this.validateAll(classRows, studentRows, homeworkRows, existingClassNames, existingStudentKeys);
    if (errors.length > 0) {
      return { errors };
    }

    // Import atomically
    const homeworkGroups = this.groupHomeworkRows(homeworkRows);

    await this.prisma.$transaction(async (tx: any) => {
      // 1. Create classes
      const classMap = new Map<string, number>(); // name -> id
      for (const row of classRows) {
        const code = row.code || this.generateClassCode();
        const scheduleSlots = this.parseScheduleSlots(row.scheduleSlots);
        const cls = await tx.class.create({
          data: {
            name: row.name,
            code,
            startDate: this.toDate(row.startDate)!,
            endDate: this.toDate(row.endDate)!,
            scheduleSlots,
            teacherId: user.role === 'TEACHER' ? user.id : null,
            status: 'PENDING',
          },
        });
        if (row.pricePerSession !== undefined) {
          await tx.tuitionConfig.create({
            data: {
              classId: cls.id,
              pricePerSession: row.pricePerSession,
              bookFee: row.bookFee ?? null,
              dueDayOfMonth: row.dueDayOfMonth!,
            },
          });
        }
        classMap.set(row.name, cls.id);
      }

      // 2. Create students
      for (const row of studentRows) {
        const classId = classMap.get(row.className)
          ?? (await tx.class.findFirst({ where: { name: row.className }, select: { id: true } }))?.id;

        const student = await tx.student.create({
          data: {
            fullname: row.fullname,
            sex: row.sex === 'M' ? 'MALE' : 'FEMALE',
            dateOfBirth: this.toDate(row.dateOfBirth)!,
            classId: classId ?? null,
          },
        });

        if (row.parentName) {
          await tx.parentInfo.create({
            data: {
              studentId: student.id,
              name: row.parentName,
              phoneNumber: row.parentPhone ?? '',
              type: row.parentType === 'FATHER' ? 'FATHER' : 'MOTHER',
            },
          });
        }
      }

      // 3. Create homework
      for (const [hwName, partsMap] of homeworkGroups) {
        const hw = await tx.homework.create({
          data: { type: 'PHONICS', name: hwName },
        });
        let partOrder = 1;
        for (const [partName, words] of partsMap) {
          const part = await tx.homeworkPart.create({
            data: { homeworkId: hw.id, name: partName, order: partOrder++ },
          });
          let wordOrder = 1;
          for (const word of words) {
            await tx.homeworkWord.create({
              data: {
                partId: part.id,
                text: word.word_text,
                highlight: word.word_highlight || null,
                order: wordOrder++,
              },
            });
          }
        }
      }
    });

    return {
      imported: {
        classes: classRows.length,
        students: studentRows.length,
        homework: homeworkGroups.size,
      },
    };
  }

  generateTemplate(): Buffer {
    const wb = XLSX.utils.book_new();

    const classesData = [
      {
        name: 'Lớp A',
        code: 'LA01',
        startDate: '2026-01-01',
        endDate: '2026-06-30',
        scheduleSlots: 'Mon 08:00-09:30,Wed 08:00-09:30,Fri 08:00-09:30',
        pricePerSession: 100000,
        bookFee: 50000,
        dueDayOfMonth: 5,
      },
    ];

    const studentsData = [
      {
        fullname: 'Nguyễn Văn A',
        sex: 'M',
        dateOfBirth: '2018-05-10',
        className: 'Lớp A',
        parentName: 'Nguyễn Văn B',
        parentPhone: '0912345678',
        parentType: 'FATHER',
      },
    ];

    const homeworkData = [
      { homework_name: 'Bài âm er', part_name: 'Part 1: er', word_text: 'her', word_highlight: 'er' },
      { homework_name: 'Bài âm er', part_name: 'Part 1: er', word_text: 'bird', word_highlight: 'ir' },
    ];

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(classesData), 'Classes');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(studentsData), 'Students');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(homeworkData), 'Homework');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
