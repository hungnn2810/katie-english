export interface ScheduleSlot {
  day: string;
  time: string;
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
