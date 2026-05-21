export interface ScheduleSlot {
  day: string;
  time: string;
  duration?: number;
}

export class CreateClassDto {
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  status?: 'PENDING' | 'INPROGRESS' | 'ENDED';
  scheduleSlots?: ScheduleSlot[];
}

export class UpdateClassDto {
  name?: string;
  code?: string;
  startDate?: string;
  endDate?: string;
  status?: 'PENDING' | 'INPROGRESS' | 'ENDED';
  scheduleSlots?: ScheduleSlot[];
}
