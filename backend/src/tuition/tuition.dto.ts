export class CreateTuitionConfigDto {
  pricePerSession: number; // VNĐ per session
  bookFee?: number | null; // nullable, VNĐ
  dueDayOfMonth: number; // 1-31
}

export class GenerateRecordsDto {
  classId: number;
  month: number; // 1-12
  year: number;
}

export class RecordPaymentDto {
  paidAt: string; // ISO date string from frontend
  paidBy: string; // admin/teacher username or ID
}

export class SendNotificationsDto {
  recordIds: number[];
}
